"""Original 128 BPM adventure-anime music and restrained sea/SFX stem.

No samples, models, downloads or commercial compositions are used. Requires an
existing NumPy and FFmpeg. The voice is decoded only to measure its RMS.
Run: python generate.py --intro 2.5 --outro 4 --bpm 128
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import wave

import numpy as np


SR = 48000
ROOT = Path(__file__).resolve().parent
POEM = ROOT.parent.parent


def rms(signal):
    return float(np.sqrt(np.mean(np.square(signal, dtype=np.float64))))


def db(value):
    return 20 * math.log10(max(float(value), 1e-12))


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def envelope(t, duration, attack=0.004, release=0.07):
    return smoothstep(t / attack) * smoothstep((duration - t) / release)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def pluck(note, duration, bright=1.0):
    """Short harmonic string modes, softened pick attack, no sampled material."""
    t = np.arange(round(SR * duration)) / SR
    tone = np.zeros_like(t)
    for partial in range(1, 9):
        phase = 2 * np.pi * frequency(note) * partial * (1 + 0.00003 * partial**2) * t
        decay = np.exp(-(2.4 + 0.85 * partial) * t / duration)
        tone += np.sin(phase + 0.09 * partial) * decay / partial ** (1.65 / bright)
    return (tone * envelope(t, duration) * 0.7).astype(np.float32)


def melody(note, duration):
    """A bright plucked dulcimer-like lead, rounded enough for quiet narration."""
    t = np.arange(round(SR * duration)) / SR
    f = frequency(note)
    tone = np.sin(2 * np.pi * f * t) * np.exp(-2.8 * t / duration)
    tone += 0.27 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-5.0 * t / duration)
    tone += 0.10 * np.sin(2 * np.pi * 3.002 * f * t) * np.exp(-8 * t / duration)
    tone *= envelope(t, duration, 0.008, 0.10)
    return tone.astype(np.float32)


def bass(note, duration):
    t = np.arange(round(SR * duration)) / SR
    phase = 2 * np.pi * frequency(note) * t
    tone = np.sin(phase) + 0.17 * np.sin(2 * phase) + 0.05 * np.sin(3 * phase)
    return (tone * np.exp(-2 * t / duration) * envelope(t, duration, 0.007, 0.09)).astype(np.float32)


def drum(rng, kind):
    duration = {"kick": 0.29, "rim": 0.11, "shaker": 0.065, "tom": 0.23}[kind]
    t = np.arange(round(duration * SR)) / SR
    noise = rng.normal(0, 1, len(t))
    if kind == "kick":
        phase = 2 * np.pi * (73 * t + 47 * 0.019 * (1 - np.exp(-t / 0.019)))
        tone = np.sin(phase) * np.exp(-t / 0.060)
    elif kind == "rim":
        tone = (np.sin(2 * np.pi * 390 * t) + 0.24 * np.sin(2 * np.pi * 615 * t))
        tone = (tone + 0.09 * noise) * np.exp(-t / 0.022)
    elif kind == "tom":
        phase = 2 * np.pi * (135 * t + 42 * 0.028 * (1 - np.exp(-t / 0.028)))
        tone = (np.sin(phase) + 0.13 * noise) * np.exp(-t / 0.045)
    else:
        # Smooth noise difference makes a light, short shaker without hiss tails.
        softened = np.convolve(noise, np.ones(5) / 5, mode="same")
        tone = (noise - softened) * np.exp(-t / 0.017) * 0.40
    return (tone * envelope(t, duration, 0.003, 0.025)).astype(np.float32)


def cannon(rng):
    duration = 0.68
    t = np.arange(round(duration * SR)) / SR
    control = rng.normal(0, 1, math.ceil(duration * 1050) + 2)
    noise = np.interp(t * 1050, np.arange(len(control)), control)
    phase = 2 * np.pi * (56 * t + 43 * 0.026 * (1 - np.exp(-t / 0.026)))
    sound = (np.sin(phase) * 0.75 + noise * 0.38) * np.exp(-t / 0.115)
    sound *= envelope(t, duration, 0.012, 0.08)
    return (sound / np.max(np.abs(sound))).astype(np.float32)


def place(target, sound, when, gain, pan=0.0):
    start = round(when * SR)
    source = max(0, -start)
    start = max(start, 0)
    length = min(len(sound) - source, len(target) - start)
    if length <= 0:
        return
    angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    target[start:start + length, 0] += sound[source:source + length] * gain * math.cos(angle)
    target[start:start + length, 1] += sound[source:source + length] * gain * math.sin(angle)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--intro", type=float, default=2.5)
    parser.add_argument("--outro", type=float, default=4.0)
    parser.add_argument("--bpm", type=float, default=128.0)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--seed", type=int, default=1831224)
    args = parser.parse_args()
    if min(args.intro, args.outro) < 0 or min(args.bpm, args.fps) <= 0:
        parser.error("Durations must be nonnegative; BPM and FPS must be positive")

    timing = json.loads((POEM / "timings.json").read_text(encoding="utf-8-sig"))
    voice_duration = float(timing["voiceDuration"])
    voice_end = args.intro + voice_duration
    duration = voice_end + args.outro
    count = round(duration * SR)
    line = {int(item["index"]): args.intro + float(item["start"]) for item in timing["lines"]}
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("Existing FFmpeg is required; no software is installed by this script")
    decoded = subprocess.run([
        ffmpeg, "-v", "error", "-i", str(POEM / "voice.mp3"), "-f", "f32le",
        "-ac", "1", "-ar", str(SR), "pipe:1",
    ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    voice = np.frombuffer(decoded.stdout, dtype="<f4")
    if abs(len(voice) / SR - voice_duration) > 0.06:
        raise ValueError("voice.mp3 duration differs from timings.json")
    voice_rms = rms(voice)
    rng = np.random.default_rng(args.seed)
    music = np.zeros((count, 2), dtype=np.float32)
    beat = 60 / args.bpm
    bar = beat * 4
    dialogue_start, departure = line[17], line[23]

    # D major, with a newly written eight-bar motif and buoyant eighth notes.
    # Chords: D - Bm - G - A - D/F# - G - Em - A.
    harmony = [
        (38, (62, 66, 69, 74)), (35, (62, 66, 71, 74)),
        (43, (62, 67, 71, 74)), (45, (61, 64, 69, 73)),
        (42, (62, 66, 69, 74)), (43, (62, 67, 71, 74)),
        (40, (64, 67, 71, 76)), (45, (61, 64, 69, 73)),
    ]
    theme = [
        [(0, 74, .7), (.75, 78, .45), (1.5, 81, .75), (2.5, 78, .45), (3, 76, .75)],
        [(0, 78, .9), (1.25, 74, .45), (2, 71, .65), (3, 74, .75)],
        [(0, 79, .65), (.75, 78, .45), (1.5, 74, .9), (3, 71, .75)],
        [(0, 73, .7), (1, 76, .45), (1.75, 81, .6), (3, 76, .75)],
        [(0, 78, .7), (.75, 81, .4), (1.5, 86, .7), (2.5, 81, .4), (3, 78, .75)],
        [(0, 79, .65), (1, 78, .45), (1.75, 74, .7), (3, 71, .75)],
        [(0, 76, .7), (.75, 79, .45), (1.5, 83, .7), (2.5, 79, .45), (3, 76, .75)],
        [(0, 73, .65), (1, 76, .65), (2, 81, 1.6)],
    ]

    def arrangement(at):
        # strings, percussion, melody, eighth-note density
        if dialogue_start <= at < departure:
            return .60, .22, 0.0, False
        if at < args.intro or at >= voice_end:
            return 1.10, .88, .92, True
        if departure <= at:
            return .98, .82, .24, True
        if line[13] <= at:
            return .85, .54, .16, True
        if line[11] <= at:
            return 1.00, .82, .18, True
        if line[7] <= at:
            return .96, .70, .31, True
        return .98, .82, .24, True

    # Start immediately; the score's main downbeat lands at the start of voice.
    bars = list(np.arange(args.intro - 2 * bar, voice_end, bar))
    for bar_number, at in enumerate(bars):
        chord_index = (bar_number - 2) % 8
        low, chord = harmony[chord_index]
        for slot, tone_index in enumerate((0, 2, 1, 3, 0, 2, 3, 1)):
            onset = at + slot * beat / 2
            strings, _, _, full = arrangement(onset)
            if onset >= voice_end or (not full and slot % 2):
                continue
            place(music, pluck(chord[tone_index], beat * 1.35, 1.06), onset,
                  .112 * strings * (1.13 if slot in (0, 4) else .86), -.34)
            # Occasional right-hand answering octave expands the travelling shots.
            if full and slot in (3, 7):
                place(music, pluck(chord[(tone_index + 1) % 4] + 12, beat * .8, .88),
                      onset, .024 * strings, .46)
        for pulse, bass_interval, amount in ((0, 0, .11), (1.5, 7, .047), (2, 0, .085), (3.5, 7, .043)):
            onset = at + pulse * beat
            strings, _, _, full = arrangement(onset)
            if onset >= voice_end or (not full and pulse in (1.5, 3.5)):
                continue
            place(music, bass(low + bass_interval, beat * 1.1), onset, amount * strings)
        for pulse, kind, gain, pan in ((0, "kick", .090, -.08), (1, "rim", .052, .24),
                                       (2, "kick", .072, -.08), (3, "rim", .058, .24)):
            onset = at + pulse * beat
            if onset < voice_end:
                place(music, drum(rng, kind), onset, gain * arrangement(onset)[1], pan)
        for eighth in range(8):
            onset = at + eighth * beat / 2
            _, drums, _, full = arrangement(onset)
            if onset < voice_end and full:
                place(music, drum(rng, "shaker"), onset, .028 * drums * (1 if eighth % 2 else .65), .48)
        # Lead plays only in alternate bars under voice, giving words space.
        for offset, pitch, note_length in theme[chord_index]:
            onset = at + offset * beat
            _, _, lead, _ = arrangement(onset)
            if onset >= voice_end or (args.intro <= onset and chord_index % 2 == 1):
                continue
            place(music, melody(pitch, note_length * beat + .09), onset, .092 * lead, .20)

    # A short, deliberate G-A-D ending begins exactly when narration ends.
    if args.outro:
        cadence = [(0, 2, 1.0), (beat * 2, 3, 1.0), (beat * 4, 0, 1.1)]
        for offset, chord_index, strength in cadence:
            at = voice_end + offset
            if at >= duration - .2:
                continue
            low, chord = harmony[chord_index]
            hold = min(2.2, duration - at)
            for i, pitch in enumerate(chord):
                place(music, pluck(pitch, hold, .94), at + i * .018,
                      .086 * strength, (i - 1.5) * .22)
            place(music, bass(low, hold), at, .12)
            place(music, drum(rng, "kick"), at, .055)
        coda_melody = [(0, 79), (.75, 78), (1.5, 74), (2, 73), (2.75, 76), (3.5, 81), (4, 86)]
        for offset, pitch in coda_melody:
            at = voice_end + offset * beat
            length = min(1.5 if offset == 4 else beat * .9, duration - at)
            if length > .10:
                place(music, melody(pitch, length), at, .082, .14)

    # Stereo early reflections; no long wash under speech.
    dry = music.copy()
    for delay, amount in ((.087, .075), (.143, .045), (.221, .026)):
        shift = round(delay * SR)
        music[shift:] += dry[:-shift, ::-1] * amount
    del dry
    timeline = np.arange(count) / SR
    under = slice(round(args.intro * SR), round(voice_end * SR))
    target_rms = voice_rms * 10 ** (-19.2 / 20)
    music *= target_rms / rms(music[under])

    # Sea and wind stay very quiet, disappear at the welcome, and return at departure.
    sailing = 1 - smoothstep((timeline - line[13] + .25) / .75)
    sailing += smoothstep((timeline - departure) / .8)
    sailing = np.clip(sailing, 0, 1)
    ambience = np.zeros_like(music)
    for channel in range(2):
        water_controls = rng.normal(0, 1, math.ceil(duration * 460) + 2)
        wind_controls = rng.normal(0, 1, math.ceil(duration * 43) + 2)
        water = np.interp(timeline * 460, np.arange(len(water_controls)), water_controls)
        wind = np.interp(timeline * 43, np.arange(len(wind_controls)), wind_controls)
        swell = .6 + .18 * np.sin(2 * np.pi * .26 * timeline + .8 * channel)
        ambience[:, channel] = (water * .74 + wind * .26) * sailing * swell
    ambience *= target_rms * .06 / rms(ambience[under])
    music += ambience
    del ambience

    # The actual cannon pulse peak lands exactly one video frame after line 11.
    sound = cannon(rng)
    cue = line[11] + 1 / args.fps
    peak_sample = int(np.argmax(np.abs(sound)))
    onset = (round(cue * SR) - peak_sample) / SR
    place(music, sound, onset, voice_rms * .28, -.18)
    music *= target_rms / rms(music[under])

    # Title and coda lift with continuous ramps and a clean, resolved fade.
    title_weight = 1 - smoothstep((timeline - args.intro + .22) / .22)
    coda_weight = smoothstep((timeline - voice_end) / .25)
    music *= (1 + (10 ** (6 / 20) - 1) * (title_weight + coda_weight))[:, None]
    music *= (smoothstep(timeline / .12) * smoothstep((duration - timeline) / .90))[:, None]
    # Keep measured narration difference exact after all effects and fades.
    music *= target_rms / rms(music[under])
    for region, weight in ((slice(0, round(args.intro * SR)), title_weight),
                           (slice(round(voice_end * SR), count), coda_weight)):
        if region.stop <= region.start:
            continue
        for _ in range(5):
            correction = target_rms * 10 ** (6 / 20) / max(rms(music[region]), 1e-12)
            music *= (1 + (correction - 1) * weight)[:, None]
    if float(np.max(np.abs(music))) >= .95:
        raise ValueError("Unexpected peak; refusing clipped export")
    pcm = np.rint(music * 32767).astype("<i2")
    with wave.open(str(ROOT / "music.wav"), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SR)
        output.writeframes(pcm.tobytes())
    exported = pcm.astype(np.float32) / 32768
    sections = []
    scene_names = [(1, 4, "ship"), (5, 6, "sailors"), (7, 10, "golden_city"),
                   (11, 12, "salute"), (13, 16, "welcome"), (17, 18, "gvidon"),
                   (19, 22, "answer"), (23, 26, "departure")]
    for first, last, name in scene_names:
        start = line[first]
        end = line[last + 1] if last < 26 else voice_end
        level = rms(exported[round(start * SR):round(end * SR)])
        sections.append({"scene": name, "lines": [first, last], "start": start, "end": end,
                         "music_rms_dbfs": db(level), "voice_over_music_db": db(voice_rms / level)})
    report = {
        "source": "Original synthesized composition, instruments, ambience and cannon; no external audio.",
        "interpreter": sys.executable, "numpy_version": np.__version__,
        "seed": args.seed, "bpm": args.bpm, "sample_rate": SR, "channels": 2,
        "sample_width_bits": 16, "samples_per_channel": count,
        "duration_seconds": count / SR, "intro_seconds": args.intro,
        "voice_seconds": voice_duration, "outro_seconds": args.outro,
        "voice_rms_dbfs": db(voice_rms), "music_under_voice_rms_dbfs": db(rms(exported[under])),
        "voice_above_music_db": db(voice_rms / rms(exported[under])),
        "intro_rms_dbfs": db(rms(exported[:round(args.intro * SR)])) if args.intro else None,
        "outro_rms_dbfs": db(rms(exported[round(voice_end * SR):])) if args.outro else None,
        "music_peak_dbfs": db(np.max(np.abs(exported))),
        "clipped_samples": int(np.count_nonzero(np.abs(exported) >= 1)),
        "dialogue_simple_texture_seconds": [dialogue_start, departure],
        "sfx_events": [{"event": "cannon", "line": 11, "visual_time_seconds": line[11],
                        "peak_time_seconds": (round(onset * SR) + peak_sample) / SR,
                        "onset_seconds": onset, "delay_frames": 1, "fps": args.fps}],
        "sections": sections,
    }
    (ROOT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
