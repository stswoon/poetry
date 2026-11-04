"""Original maritime adventure score, synthesized entirely with NumPy.

Run from any directory: python generate.py --intro 4 --outro 6
Inputs are the adjacent timings.json and voice.mp3. No samples or models.
The generated WAV is a quiet music/SFX stem; final voice mastering is separate.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import wave

import numpy as np


SR = 48000
ROOT = Path(__file__).resolve().parent


def rms(a: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(a, dtype=np.float64))))


def db(value: float) -> float:
    return 20.0 * math.log10(max(value, 1e-12))


def midi(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def envelope(t: np.ndarray, duration: float, attack: float, release: float) -> np.ndarray:
    return smoothstep(t / attack) * smoothstep((duration - t) / release)


def pluck(note: float, duration: float, brightness: float = 1.0) -> np.ndarray:
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = midi(note)
    # Slightly inharmonic, decaying string modes; the upper modes die first.
    result = np.zeros_like(t)
    for k in range(1, 8):
        phase = 2 * np.pi * f * k * (1 + 0.000045 * k * k) * t
        result += np.sin(phase + 0.11 * k) / k ** (1.8 / brightness) * np.exp(
            -(2.5 + 0.8 * k) * t / duration
        )
    result *= envelope(t, duration, 0.005, 0.075)
    return (result * 0.72).astype(np.float32)


def bass(note: float, duration: float) -> np.ndarray:
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    phase = 2 * np.pi * midi(note) * t
    tone = np.sin(phase) + 0.24 * np.sin(2 * phase) + 0.07 * np.sin(3 * phase)
    tone *= np.exp(-1.75 * t / duration) * envelope(t, duration, 0.009, 0.12)
    return tone.astype(np.float32)


def flute(note: float, duration: float, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = midi(note)
    vibrato = 0.0019 * smoothstep(t / 0.23)
    phase = 2 * np.pi * f * t - f * vibrato / 5.1 * np.cos(2 * np.pi * 5.1 * t)
    tone = np.sin(phase) + 0.12 * np.sin(2 * phase + 0.1) + 0.025 * np.sin(3 * phase)
    # Breath is synthesized and very quiet, with no sharp high-frequency noise.
    controls = rng.normal(0, 1, math.ceil(duration * 1100) + 2)
    breath = np.interp(t * 1100, np.arange(len(controls)), controls)
    tone += 0.025 * breath
    return (tone * envelope(t, duration, min(0.10, duration / 4), 0.16) * 0.58).astype(np.float32)


def wood(rng: np.random.Generator, low: bool = False) -> np.ndarray:
    duration = 0.17 if low else 0.11
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = 330 if low else 690
    tone = np.sin(2 * np.pi * f * t) + 0.29 * np.sin(2 * np.pi * f * 1.53 * t)
    tone += 0.045 * rng.normal(0, 1, len(t))
    return (tone * np.exp(-t / 0.026) * envelope(t, duration, 0.003, 0.025)).astype(np.float32)


def frame_drum() -> np.ndarray:
    duration = 0.34
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    phase = 2 * np.pi * (78 * t + 28 * 0.027 * (1 - np.exp(-t / 0.027)))
    tone = np.sin(phase) + 0.17 * np.sin(phase * 1.83)
    return (tone * np.exp(-t / 0.082) * envelope(t, duration, 0.006, 0.05)).astype(np.float32)


def place(target: np.ndarray, sound: np.ndarray, start: float, gain: float, pan: float = 0) -> None:
    first = round(start * SR)
    src = max(0, -first)
    first = max(first, 0)
    count = min(len(sound) - src, len(target) - first)
    if count <= 0:
        return
    angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    target[first : first + count, 0] += sound[src : src + count] * (gain * math.cos(angle))
    target[first : first + count, 1] += sound[src : src + count] * (gain * math.sin(angle))


def cannon_puff(rng: np.random.Generator) -> np.ndarray:
    duration = 0.68
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    controls = rng.normal(0, 1, math.ceil(duration * 1200) + 2)
    noise = np.interp(t * 1200, np.arange(len(controls)), controls)
    low = np.sin(2 * np.pi * (62 * t + 25 * 0.035 * (1 - np.exp(-t / 0.035))))
    result = (0.70 * low + 0.33 * noise) * np.exp(-t / 0.12)
    result *= envelope(t, duration, 0.020, 0.10)
    return (result / np.max(np.abs(result))).astype(np.float32)


def gangway_knock(rng: np.random.Generator) -> np.ndarray:
    duration = 0.26
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    result = (
        np.sin(2 * np.pi * 245 * t)
        + 0.45 * np.sin(2 * np.pi * 384 * t)
        + 0.17 * np.sin(2 * np.pi * 591 * t)
    ) * np.exp(-t / 0.043)
    result += 0.025 * rng.normal(0, 1, len(t)) * np.exp(-t / 0.021)
    result *= envelope(t, duration, 0.008, 0.045)
    return (result / np.max(np.abs(result))).astype(np.float32)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--intro", type=float, default=4.0)
    parser.add_argument("--outro", type=float, default=6.0)
    parser.add_argument("--bpm", type=float, default=112.0)
    parser.add_argument("--seed", type=int, default=1831223)
    args = parser.parse_args()
    if min(args.intro, args.outro) < 0 or args.bpm <= 0:
        parser.error("Durations must be nonnegative and BPM positive")
    timings = json.loads((ROOT.parent / "timings.json").read_text(encoding="utf-8-sig"))
    voice_duration = float(timings["voiceDuration"])
    duration = args.intro + voice_duration + args.outro
    count = round(duration * SR)
    rng = np.random.default_rng(args.seed)
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("An existing FFmpeg installation is required to measure voice.mp3")
    decoded = subprocess.run(
        [ffmpeg, "-v", "error", "-i", str(ROOT.parent / "voice.mp3"),
         "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    voice = np.frombuffer(decoded.stdout, dtype="<f4")
    if abs(len(voice) / SR - voice_duration) > 0.06:
        raise ValueError("timings.json voiceDuration does not match voice.mp3")
    voice_rms = rms(voice)
    line_starts = {int(line["index"]): args.intro + float(line["start"]) for line in timings["lines"]}
    dialogue_start = line_starts[17]
    departure = line_starts[23]
    city = line_starts[9]
    voice_end = args.intro + voice_duration
    music = np.zeros((count, 2), dtype=np.float32)
    beat = 60.0 / args.bpm
    bar = 4 * beat

    # D-major / Mixolydian colour. All notes and this motif are written here.
    # Each chord is (bass MIDI, close plucked-string voicing).
    chords = [
        (38, [62, 66, 69, 74]),  # D
        (43, [62, 67, 71, 74]),  # G
        (38, [62, 66, 69, 74]),  # D
        (45, [61, 64, 69, 73]),  # A
        (47, [62, 66, 71, 74]),  # B minor
        (43, [62, 67, 71, 74]),  # G
        (48, [60, 64, 67, 72]),  # C: brief sea-song modal colour
        (45, [61, 64, 69, 73]),  # A
    ]
    motifs = [
        [(0, 74, 0.75), (1.0, 78, 0.45), (1.75, 81, 0.55), (3.0, 78, 0.72)],
        [(0, 79, 0.75), (1.0, 78, 0.48), (2.0, 74, 1.35)],
        [(0.5, 78, 0.6), (1.5, 76, 0.45), (2.5, 74, 1.0)],
        [(0, 73, 0.72), (1.0, 76, 0.55), (2.0, 81, 1.4)],
        [(0, 78, 0.6), (1.0, 81, 0.8), (2.5, 78, 1.0)],
        [(0.25, 79, 0.6), (1.25, 78, 0.6), (2.25, 74, 1.2)],
        [(0, 76, 0.7), (1.25, 79, 0.55), (2.5, 76, 1.0)],
        [(0, 76, 0.55), (1.0, 73, 0.55), (2.0, 69, 1.4)],
    ]

    def arrangement(at: float) -> tuple[float, float, float]:
        if dialogue_start <= at < departure:
            return (0.62, 0.34, 0.0)  # fewer strings, very light percussion, no flute
        if departure <= at < voice_end:
            return (1.08, 0.95, 0.31)
        if at < args.intro or at >= voice_end:
            return (1.0, 0.80, 0.64)
        if city <= at < dialogue_start:
            return (0.91, 0.63, 0.20)
        return (0.88, 0.73, 0.24)

    # A short two-bar pickup introduces the motif, then bar 1 begins at narration.
    starts = [args.intro - 2 * bar, args.intro - bar]
    starts += list(np.arange(args.intro, voice_end, bar))
    # The coda begins exactly after the voice, so its G-A-D cadence is complete
    # instead of depending on where narration finishes in a musical measure.
    starts += list(np.arange(voice_end, duration, bar))
    for sequence, at in enumerate(starts):
        chord_index = (sequence - 2) % len(chords)
        if at >= voice_end:
            # Cadential G - A - D, held cleanly through the final fade.
            coda_index = int(round((at - voice_end) / bar))
            chord_index = [1, 3, 0][min(coda_index, 2)]
        low, notes = chords[chord_index]
        strings_level, drum_level, flute_level = arrangement(at)
        # Eighth-note rocking motion; omit alternate plucks during dialogue.
        order = [0, 2, 1, 3, 2, 1, 3, 2]
        for slot, note_index in enumerate(order):
            note_at = at + slot * beat / 2
            if at < voice_end <= note_at:
                continue
            level, _, _ = arrangement(note_at)
            if dialogue_start <= note_at < departure and slot % 2:
                continue
            gain = 0.105 * level * (1.12 if slot in (0, 4) else 0.86)
            place(music, pluck(notes[note_index], beat * 1.30), note_at, gain, -0.30)
        place(music, bass(low, beat * 1.85), at, 0.105 * strings_level, 0)
        if not at < voice_end <= at + 2 * beat:
            place(music, bass(low + 7, beat * 1.50), at + 2 * beat, 0.073 * strings_level, 0.06)
        for pulse in (0, 2):
            if at < voice_end <= at + pulse * beat:
                continue
            place(music, frame_drum(), at + pulse * beat, 0.061 * drum_level, -0.08)
        for pulse in (1, 3):
            if at < voice_end <= at + pulse * beat:
                continue
            place(music, wood(rng, low=True), at + pulse * beat, 0.073 * drum_level, 0.30)
        if not dialogue_start <= at < departure:
            for pulse in (1.5, 3.5):
                if at < voice_end <= at + pulse * beat:
                    continue
                place(music, wood(rng), at + pulse * beat, 0.025 * drum_level, 0.45)
        # Air between phrases keeps the narrator in front. No continuous lead.
        if flute_level and (at < args.intro or at >= voice_end or chord_index % 2 == 0):
            for offset, note, length in motifs[chord_index]:
                if at < voice_end <= at + offset * beat:
                    continue
                if at >= voice_end and duration - (at + offset * beat) < 0.8:
                    continue
                place(music, flute(note, length * beat, rng), at + offset * beat,
                      0.082 * flute_level, 0.22)

    # A gentle final D chord resolves the voyage; no extra percussive hit.
    resolve_at = min(voice_end + 2 * bar, duration - min(1.0, args.outro / 2))
    for k, note in enumerate((62, 66, 69, 74)):
        place(music, pluck(note, duration - resolve_at + 0.1, 0.88),
              resolve_at + 0.022 * k, 0.055, (k - 1.5) * 0.15)

    # Small-room reflections, generated from our own synthesis only.
    dry = music.copy()
    for delay, level in ((0.111, 0.095), (0.179, 0.060), (0.263, 0.035)):
        shift = round(delay * SR)
        music[shift:] += dry[:-shift, ::-1] * level
    del dry

    timeline = np.arange(count, dtype=np.float64) / SR
    under = slice(round(args.intro * SR), round(voice_end * SR))
    target_rms = voice_rms * 10 ** (-19.0 / 20)
    music *= target_rms / rms(music[under])

    # Quiet synthesized wind/water, confined to sailing shots and the coda.
    ambience = np.zeros((count, 2), dtype=np.float32)
    sailing = 1 - smoothstep((timeline - line_starts[13] + 0.5) / 1.1)
    sailing += smoothstep((timeline - departure) / 1.0)
    sailing = np.clip(sailing, 0, 1)
    for channel in range(2):
        controls = rng.normal(0, 1, math.ceil(duration * 420) + 2)
        water = np.interp(timeline * 420, np.arange(len(controls)), controls)
        controls_slow = rng.normal(0, 1, math.ceil(duration * 38) + 2)
        slow = np.interp(timeline * 38, np.arange(len(controls_slow)), controls_slow)
        swell = 0.55 + 0.2 * np.sin(2 * np.pi * 0.19 * timeline + channel * 0.9)
        ambience[:, channel] = (water * 0.78 + slow * 0.22) * sailing * swell
    ambience *= target_rms * 0.075 / max(rms(ambience[under]), 1e-9)
    music += ambience
    del ambience

    events = []
    for name, line, sound, relative_peak, pan in (
        ("soft_cannon_puff", 11, cannon_puff(rng), 0.24, -0.18),
        ("wooden_gangway_knock", 13, gangway_knock(rng), 0.18, 0.23),
    ):
        cue = line_starts[line] + 1 / 30
        peak_offset = int(np.argmax(np.abs(sound))) / SR
        onset = cue - peak_offset
        # Align the synthesized event's actual peak one frame after the action.
        level = voice_rms * relative_peak
        place(music, sound, onset, level, pan)
        events.append({
            "event": name, "line": line, "visual_time_seconds": line_starts[line],
            "peak_time_seconds": cue, "onset_seconds": onset,
            "delay_frames_at_30fps": 1,
            "unscaled_mono_peak_dbfs": db(level),
        })

    # Smooth title/coda lift. Narration remains 19 dB above the complete stem.
    edge = 0.25
    gain = 1 + (10 ** (6 / 20) - 1) * (
        1 - smoothstep((timeline - args.intro + edge) / edge)
        + smoothstep((timeline - voice_end) / edge)
    )
    music *= gain[:, None]
    music *= target_rms / rms(music[under])

    # Match the measured title and coda RMS to +6 dB while retaining continuous
    # boundary ramps. Fades are included in this measurement.
    fade = smoothstep(timeline / 0.70) * smoothstep((duration - timeline) / 1.25)
    music *= fade[:, None]
    title_weight = 1 - smoothstep((timeline - args.intro + 0.30) / 0.30)
    coda_weight = smoothstep((timeline - voice_end) / 0.35)
    wanted_outer_rms = rms(music[under]) * 10 ** (6 / 20)
    for section, weight in ((slice(0, round(args.intro * SR)), title_weight),
                            (slice(round(voice_end * SR), count), coda_weight)):
        if section.stop <= section.start:
            continue
        # Solve the weighted section's RMS gain; this keeps the voice boundary
        # at unity and introduces no sample discontinuities.
        for _ in range(4):
            correction = wanted_outer_rms / max(rms(music[section]), 1e-9)
            music *= (1 + (correction - 1) * weight)[:, None]

    peak = float(np.max(np.abs(music)))
    if peak >= 0.95:
        raise ValueError(f"Unexpected level {peak}; refusing clipped export")
    quantized = np.rint(np.clip(music, -1, 1) * 32767).astype("<i2")
    with wave.open(str(ROOT / "music.wav"), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(quantized.tobytes())

    # Report measured PCM levels, not the intended fader positions.
    exported = quantized.astype(np.float32) / 32768
    full_voice_rms = rms(voice)
    speech_mask = np.zeros(len(voice), dtype=bool)
    for line in timings["lines"]:
        speech_mask[round(float(line["start"]) * SR) : round(float(line["end"]) * SR)] = True
    report = {
        "source": "All tones, percussion, wind, water and SFX synthesized by this code; no external audio.",
        "seed": args.seed, "bpm": args.bpm, "sample_rate": SR, "channels": 2,
        "sample_width_bits": 16, "samples_per_channel": count,
        "duration_seconds": count / SR, "intro_seconds": args.intro,
        "voice_seconds": voice_duration, "outro_seconds": args.outro,
        "voice_rms": full_voice_rms, "voice_rms_dbfs": db(full_voice_rms),
        "voice_active_lines_rms_dbfs": db(rms(voice[speech_mask])),
        "music_under_voice_rms": rms(exported[under]),
        "music_under_voice_rms_dbfs": db(rms(exported[under])),
        "voice_above_music_db": db(full_voice_rms / rms(exported[under])),
        "intro_rms_dbfs": db(rms(exported[: round(args.intro * SR)])) if args.intro else None,
        "outro_rms_dbfs": db(rms(exported[round(voice_end * SR) :])) if args.outro else None,
        "music_peak_dbfs": db(float(np.max(np.abs(exported)))),
        "clipped_samples": int(np.count_nonzero(np.abs(exported) >= 1)),
        "dialogue_simple_texture_seconds": [dialogue_start, departure],
        "departure_lift_seconds": departure,
        "sfx_events": events,
    }
    (ROOT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
