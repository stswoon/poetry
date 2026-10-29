"""Музыка к «Зимнему вечеру»: медленный вальс в ре миноре + вьюга.

Пэд (струнные), челеста с мелодией, мягкий бас и шум ветра. Гармония и сила
ветра следуют за строфами из ../timings.json; громкость под голосом подбирается
так, чтобы музыка была на ~19 дБ тише голоса.

Запуск: python make_music.py [--offset 6.0] [--outro 7.0]
Пишет music.wav (44.1 кГц, стерео) рядом со скриптом.
"""

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
HERE = Path(__file__).resolve().parent
POEM = HERE.parent
BPM = 72
BEAT = 60 / BPM
BAR = 3 * BEAT  # вальс, 3/4

rng = np.random.default_rng(1825)


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# --- Гармония (MIDI-ноты аккордов) и мелодии: (нота, доли) на такт ---
DM, GM, C, F, BB, A, A7 = (
    [50, 57, 62, 65], [43, 55, 62, 67], [48, 55, 64, 67], [41, 57, 60, 65],
    [46, 53, 62, 65], [45, 57, 61, 64], [45, 55, 61, 64],
)
MINOR_PROG = [DM, GM, C, F, BB, GM, A, A7]
MINOR_MEL = [
    [(69, 2), (65, 1)], [(70, 1), (69, 1), (67, 1)], [(64, 2), (67, 1)], [(65, 3)],
    [(74, 2), (70, 1)], [(67, 1), (70, 1), (74, 1)], [(73, 2), (69, 1)], [(69, 3)],
]
MAJOR_PROG = [F, C, DM, BB, F, C, BB, C]
MAJOR_MEL = [
    [(72, 2), (69, 1)], [(67, 1), (64, 1), (67, 1)], [(65, 2), (69, 1)], [(74, 3)],
    [(72, 1), (69, 1), (65, 1)], [(64, 2), (67, 1)], [(65, 2), (74, 1)], [(72, 3)],
]
END_PROG = [DM, BB, GM, A7, DM, DM]
END_MEL = [[(69, 2), (74, 1)], [(74, 2), (70, 1)], [(67, 2), (70, 1)], [(69, 3)], [(74, 3)], [(None, 3)]]


def load_layout(offset, outro):
    tpath = POEM / "timings.json"
    if tpath.exists():
        t = json.loads(tpath.read_text(encoding="utf-8"))
        lines = t["lines"]
        voice_dur = t["voiceDuration"]
    else:  # оценка до прихода голоса
        lines, cur = [], 0.3
        for i in range(32):
            lines.append({"stanza": i // 8 + 1, "start": cur, "end": cur + 2.3})
            cur += 2.3 + (1.8 if i % 8 == 7 else 0.45)
        voice_dur = cur
    stanza_start = {}
    for ln in lines:
        stanza_start.setdefault(ln["stanza"], ln["start"] + offset)
    voice_end = lines[-1]["end"] + offset
    total = offset + voice_dur + outro
    return stanza_start, offset, voice_end, total


def adsr(n, a, r, sustain_curve=None):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na, nr = min(na, n), min(nr, n)
    if na:
        env[:na] = np.linspace(0, 1, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


def pad_voice(freq, dur):
    """Тёплый пэд: три расстроенные пилы через фильтр низких частот."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for det in (-0.12, 0.0, 0.13):
        f = freq * 2 ** (det / 12)
        ph = rng.random()
        out += signal.sawtooth(2 * np.pi * (f * t + ph))
    b, a = signal.butter(2, min(1800, freq * 5) / (SR / 2))
    out = signal.lfilter(b, a, out) / 3
    return out * adsr(n, 0.6, 0.9)


def celesta(freq, dur):
    """Челеста/музыкальная шкатулка: синус + негармонические обертоны, быстрый спад."""
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.6)
           + 0.35 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t * 5)
           + 0.12 * np.sin(2 * np.pi * freq * 6.27 * t) * np.exp(-t * 9))
    out[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return out


def bass(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t)
    return out * np.exp(-t * 1.2) * adsr(n, 0.02, 0.3)


def add(buf, x, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


def wind(total, intensity):
    """Вьюга: розовый шум через полосовой фильтр с плавающей частотой и порывами."""
    n = int(total * SR)
    white = rng.standard_normal(n)
    # розовый шум (фильтр Пола Келлета, упрощённый)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    pink = signal.lfilter(b, a, white)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # несколько полос с разными «завываниями»
    for k, (lo, hi, rate) in enumerate([(250, 700, 0.11), (500, 1400, 0.07), (900, 2600, 0.17)]):
        sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        band = signal.sosfilt(sos, pink)
        lfo = 0.55 + 0.45 * np.sin(2 * np.pi * rate * t + k * 1.7) * np.sin(2 * np.pi * rate * 0.37 * t + k)
        out += band * lfo
    gust = 0.6 + 0.4 * np.clip(np.sin(2 * np.pi * 0.09 * t) + 0.6 * np.sin(2 * np.pi * 0.23 * t + 1), -1, 1)
    out *= gust * intensity
    return out / (np.abs(out).max() + 1e-9)


def section_of(time, stanza_start, voice_start, voice_end):
    if time < voice_start:
        return 0
    if time >= voice_end:
        return 5
    s = 1
    for k, st in sorted(stanza_start.items()):
        if time >= st - BAR * 0.5:
            s = k
    return s


def smooth_curve(points, total):
    """Кусочно-линейная кривая по [(время, значение)], сглаженная."""
    n = int(total * SR)
    xs, ys = zip(*points)
    t = np.arange(n) / SR
    return np.interp(t, xs, ys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offset", type=float, default=6.0, help="где в ролике начинается голос, с")
    ap.add_argument("--outro", type=float, default=7.0, help="финал после голоса, с")
    args = ap.parse_args()

    stanza_start, vstart, vend, total = load_layout(args.offset, args.outro)
    n = int(total * SR)
    pad = np.zeros(n)
    cel = np.zeros(n)
    bas = np.zeros(n)

    # Такты идут от 0; финальная каденция начинается после конца голоса
    bars = int(np.ceil(total / BAR)) + 1
    end_bar0 = int(np.ceil((vend + 0.3) / BAR))
    prev_sec, sec_bar0 = None, 0
    for b in range(bars):
        t0 = b * BAR
        if t0 >= total:
            break
        if b >= end_bar0:
            k = b - end_bar0
            if k >= len(END_PROG):
                break
            chord, mel = END_PROG[k], END_MEL[k]
            hold = BAR * (3 if k == len(END_PROG) - 2 else 1)
        else:
            sec = section_of(t0, stanza_start, vstart, vend)
            if sec != prev_sec:  # каждая строфа начинает фразу с первого такта
                prev_sec, sec_bar0 = sec, b
            i = (b - sec_bar0) % 8
            if sec == 3:
                chord, mel = MAJOR_PROG[i], MAJOR_MEL[i]
            else:
                chord, mel = MINOR_PROG[i], MINOR_MEL[i]
            hold = BAR
        for m in chord[1:]:
            add(pad, pad_voice(midi_hz(m), hold + 0.6) * 0.22, t0)
        add(bas, bass(midi_hz(chord[0]), hold), t0)
        add(bas, bass(midi_hz(chord[0] + 12), BEAT) * 0.35, t0 + BEAT)
        add(bas, bass(midi_hz(chord[0] + 7), BEAT) * 0.35, t0 + 2 * BEAT)
        beat = 0
        for note, beats in mel:
            if note is not None:
                add(cel, celesta(midi_hz(note + 12), beats * BEAT) * 0.5, t0 + beat * BEAT)
            beat += beats

    # Сила ветра по разделам
    ss = stanza_start
    wind_pts = [(0, 0.55), (vstart - 0.5, 0.7), (ss[1], 1.0), (ss[2] - 0.5, 0.9), (ss[2] + 1.5, 0.45),
                (ss[3] - 0.5, 0.4), (ss[3] + 1.5, 0.18), (ss[4] - 1.0, 0.25), (ss[4] + 1.0, 0.95),
                (vend, 0.6), (total, 0.0)]
    w = wind(total, smooth_curve(wind_pts, total))

    # Пэд и челеста тише в бурных строфах, теплее в третьей
    cel_pts = [(0, 1.0), (vstart, 0.7), (ss[3] - 0.5, 0.75), (ss[3] + 1, 1.0), (ss[4] - 0.5, 1.0),
               (ss[4] + 1, 0.7), (vend, 0.8), (vend + 1.5, 1.0), (total, 1.0)]
    music = 0.9 * pad + 0.55 * cel * smooth_curve(cel_pts, total) + 0.5 * bas + 0.32 * w

    # Простая «реверберация»: несколько затухающих задержек
    rev = np.zeros_like(music)
    for d, g in [(0.031, 0.35), (0.047, 0.3), (0.071, 0.25), (0.113, 0.2), (0.173, 0.15), (0.29, 0.1)]:
        k = int(d * SR)
        rev[k:] += music[:-k] * g
    sos = signal.butter(1, 3500, fs=SR, output="sos")
    music = music + signal.sosfilt(sos, rev) * 0.6

    # Стерео: ветер и челеста немного разведены
    left = music + 0.05 * np.roll(w, 220)
    right = music + 0.05 * np.roll(w, -220)
    st = np.stack([left, right], axis=1)
    st /= np.abs(st).max() + 1e-9

    # Громкость: под голосом музыка на ~19 дБ тише голоса, в заставке и финале громче
    voice_rms_db = -20.0
    vpath = POEM / "voice.mp3"
    if vpath.exists():
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(vpath), "-ac", "1", "-ar", str(SR),
                              "-f", "f32le", "-"], capture_output=True, check=True).stdout
        v = np.frombuffer(raw, dtype=np.float32)
        frames = v[: len(v) // 2205 * 2205].reshape(-1, 2205)
        rms = np.sqrt((frames ** 2).mean(axis=1))
        active = rms[rms > rms.max() * 0.1]
        voice_rms_db = 20 * np.log10(np.sqrt((active ** 2).mean()))
    seg = st[int(vstart * SR): int(vend * SR)]
    music_rms_db = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12)
    under_gain_db = voice_rms_db - 19.0 - music_rms_db
    loud_gain_db = min(under_gain_db + 11.0, -1.0 - 20 * np.log10(np.abs(st).max()))
    g_pts = [(0, loud_gain_db), (vstart - 1.0, loud_gain_db), (vstart - 0.1, under_gain_db),
             (vend + 0.3, under_gain_db), (vend + 1.8, loud_gain_db), (total, loud_gain_db)]
    gain = 10 ** (smooth_curve(g_pts, total) / 20)
    st *= gain[:, None]

    # Вход и выход
    fi, fo = int(1.2 * SR), int(3.0 * SR)
    st[:fi] *= np.linspace(0, 1, fi)[:, None]
    st[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    peak = np.abs(st).max()
    if peak > 0.89:  # не выше −1 dBFS
        st *= 0.89 / peak

    wavfile.write(HERE / "music.wav", SR, (st * 32767).astype(np.int16))
    print(json.dumps({"total": round(total, 2), "voiceStart": vstart, "voiceEnd": round(vend, 2),
                      "voiceRmsDb": round(float(voice_rms_db), 1), "underGainDb": round(float(under_gain_db), 1),
                      "musicUnderVoiceDb": round(float(music_rms_db + under_gain_db), 1)}))


if __name__ == "__main__":
    main()
