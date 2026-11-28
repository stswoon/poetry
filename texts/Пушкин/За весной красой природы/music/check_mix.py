#!/usr/bin/env python3
"""Проверка микса «За весной, красой природы…», независимо от make_music.py.

Смешивает ../voice.mp3 (со сдвигом на вступление, моно в оба канала) и music.wav как ролик (оба с громкостью 1) и
меряет: формат и длину music.wav (= вступление + голос + финал), подложку под каждой строкой (RMS, дБ к голосу строки)
— целиком (музыка + шумы) и вне окон шумов из sfx.json; окна 0,4 с внутри строк; вступление, паузы между строками и
финал к среднему голосу; пики; громкость смеси (ffmpeg ebur128) и пробный мастер −14 LUFS.
Запуск: python3 check_mix.py [--intro 3.6] [--mix путь.wav]
"""
import argparse
import json
import os
import re
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
TM = json.load(open(os.path.join(POEM, "timings.json"), encoding="utf-8"))
SX = json.load(open(os.path.join(HERE, "sfx.json"), encoding="utf-8"))
ap = argparse.ArgumentParser()
ap.add_argument("--intro", type=float, default=SX["intro"])
ap.add_argument("--mix", default=os.path.join(tempfile.gettempdir(), "pushkin_zavesnoy_mix.wav"))
a = ap.parse_args()
V0 = a.intro

with wave.open(os.path.join(HERE, "music.wav")) as w:
    assert w.getframerate() == SR and w.getnchannels() == 2 and w.getsampwidth() == 2, "формат не 44.1k/16/стерео"
    M = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, 2).T / 32768.0
N = M.shape[1]
total = N / SR
want = V0 + TM["voiceDuration"] + SX["outro"]
print(f"music.wav: {total:.3f} с (ожидается {want:.3f}) {'OK' if abs(total - want) < 0.005 else 'НЕ СОВПАДАЕТ'}")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, TM["voice"]), "-f", "f32le", "-ac", "1",
                      "-ar", str(SR), "-"], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.float32).astype(float)
V = np.zeros(N)
i0 = int(round(V0 * SR))
V[i0:i0 + len(v)] = v[: N - i0]
m = 0.5 * (M[0] + M[1])
sl = lambda s, e: slice(int(s * SR), int(e * SR))
rms = lambda x: np.sqrt(np.mean(x ** 2) + 1e-20)
dB = lambda x: 20 * np.log10(x)
lines = [(V0 + l["start"], V0 + l["end"]) for l in TM["lines"]]
vmean = rms(np.concatenate([V[sl(s, e)] for s, e in lines]))
mask = np.ones(N, bool)
for s in SX["sfx"]:
    mask[sl(s["start"], s["end"])] = False

print("строка  музыка+шумы  без_шумов  окна0.4с(мин..макс)")
for i, (s, e) in enumerate(lines, 1):
    seg, vs = m[sl(s, e)], V[sl(s, e)]
    vl = rms(vs)
    mk = mask[sl(s, e)]
    clean = dB(rms(seg[mk]) / vl) if mk.sum() > 0.3 * SR else float("nan")
    wins = []
    for t in np.arange(s, e - 0.4, 0.2):
        vw = rms(V[sl(t, t + 0.4)])
        if vw > vl * 0.3:
            wins.append(dB(rms(m[sl(t, t + 0.4)]) / vw))
    print(f"  L{i}    {dB(rms(seg) / vl):6.1f}      {clean:6.1f}     {min(wins):6.1f} .. {max(wins):5.1f}")
print(f"вступление 0.15–{lines[0][0] - 0.4:.2f}: {dB(rms(m[sl(0.15, lines[0][0] - 0.4)]) / vmean):.1f} дБ к ср. голосу")
for i in range(len(lines) - 1):
    g0, g1 = lines[i][1] + 0.1, lines[i + 1][0] - 0.1
    if g1 - g0 > 0.2:
        print(f"пауза L{i + 1}/L{i + 2} ({g1 - g0 + 0.2:.2f} с): {dB(rms(m[sl(g0, g1)]) / vmean):.1f} дБ")
print(f"финал {lines[-1][1] + 0.5:.2f}–{total - 2.4:.2f}: {dB(rms(m[sl(lines[-1][1] + 0.5, total - 2.4)]) / vmean):.1f} дБ;"
      f" последние 0,3 с: {dB(rms(m[-int(0.3 * SR):]) / vmean):.1f} дБ")
mix = M + V
print(f"пики: музыка {dB(np.abs(M).max()):.1f} dBFS, голос {dB(np.abs(V).max()):.1f}, смесь {dB(np.abs(mix).max()):.1f};"
      f" клиппинг: {'есть' if np.abs(mix).max() >= 1 else 'нет'}")
with wave.open(a.mix, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).round().astype("<i2").T.copy().tobytes())


def loud(path, extra=""):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", extra + "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    return I, tp


I, tp = loud(a.mix)
I2, tp2 = loud(a.mix, f"volume={-14 - I:.2f}dB,alimiter=limit=0.89:level=false,")
print(f"смесь: {I:.1f} LUFS, TP {tp:.1f} dBTP; пробный мастер: {I2:.1f} LUFS, TP {tp2:.1f} dBTP")
print(f"(смесь записана в {a.mix})")
