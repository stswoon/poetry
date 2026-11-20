#!/usr/bin/env python3
"""Проверка микса «Кот поёт, глаза прищуря…»: смешивает ../voice.mp3 (со сдвигом на вступление V0) и music.wav так же,
как ролик (оба с громкостью 1, голос моно в оба канала), и меряет независимо от make_music.py по файлам:
  - music.wav: частоту, каналы, разрядность, длину (должна быть total);
  - подложку под голосом по строкам (RMS, дБ к голосу строки): всё вместе (музыка + шумы) и вне окон шумов
    (по sfx.json); цель для музыки — на 18–20 дБ тише голоса;
  - шумы: самое громкое окно 100 мс (K-взвешенно) и пик отсчёта в окне шума к пику голоса строки;
  - заставку, паузы между строфами, хвост и финал (без голоса) к среднему голосу;
  - пики и клиппинг; громкость смеси (ffmpeg ebur128) и пробный мастер −14 LUFS + alimiter.
Запуск: python3 check_mix.py [путь к mix.wav]   (по умолчанию смесь — во временной папке системы)
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
ap = argparse.ArgumentParser(description="проверка микса голоса и music.wav")
ap.add_argument("mix", nargs="?", default=os.path.join(tempfile.gettempdir(), "fet_kot_mix.wav"))
a = ap.parse_args()
with open(os.path.join(HERE, "sfx.json"), encoding="utf-8") as f:
    SFXJ = json.load(f)
with open(os.path.join(HERE, "events.json"), encoding="utf-8") as f:
    EV = json.load(f)
V0 = float(SFXJ["V0"])
shift = V0 - float(EV["V0"])
NL = len([k for k in EV if k[0] == "L" and k[1:].isdigit()])
SPEECH = [(EV[f"L{i}"] + shift, EV[f"E{i}"] + shift) for i in range(1, NL + 1)]
music_p, voice_p = os.path.join(HERE, "music.wav"), os.path.join(POEM, "voice.mp3")
with wave.open(music_p) as wf:
    w_sr, w_ch, w_bits, w_n = wf.getframerate(), wf.getnchannels(), 8 * wf.getsampwidth(), wf.getnframes()
delay = int(round(V0 * 1000))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", music_p, "-i", voice_p, "-filter_complex",
                f"[1:a]aresample={SR},pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1[v];"
                "[0:a][v]amix=inputs=2:duration=first:normalize=0[m]", "-map", "[m]", "-c:a", "pcm_f32le", a.mix],
               check=True)


def dec(path, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path] + (["-af", af] if af else []) + ["-f", "f32le", "-ac", "2", "-ar",
                                                                                str(SR), "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype="<f4").astype(np.float64)
    return x.reshape(-1, 2).T


mus = dec(music_p)
vo = dec(voice_p, f"pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1")
mix = dec(a.mix)
n = mus.shape[1]
vo = np.pad(vo, ((0, 0), (0, max(0, n - vo.shape[1]))))[:, :n]


def resp(bb, aa, fr):
    z = np.exp(-2j * np.pi * fr / SR)
    return np.abs((bb[0] + bb[1] * z + bb[2] * z * z) / (aa[0] + aa[1] * z + aa[2] * z * z))


def kweight(x):  # K-фильтр BS.1770 (амплитудная характеристика, через FFT)
    nf = 1 << int(np.ceil(np.log2(len(x) + 4096)))
    fr = np.fft.rfftfreq(nf, 1 / SR)
    K = np.tan(np.pi * 1681.974450955533 / SR)
    Q = 0.7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    H = resp([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
             [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], fr)
    K = np.tan(np.pi * 38.13547087602444 / SR)
    Q = 0.5003270373238773
    a0 = 1 + K / Q + K * K
    H *= resp([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], fr)
    return np.fft.irfft(np.fft.rfft(x, nf) * H, nf)[:len(x)]


def ms(x, wins):
    s = c = 0
    for t0, t1 in wins:
        i0, i1 = max(0, int(t0 * SR)), min(n, int(t1 * SR))
        if i1 > i0:
            s += float(np.sum(x[:, i0:i1] ** 2))
            c += i1 - i0
    return s / max(1, c)


def mov(p, w=int(0.1 * SR)):
    cs = np.concatenate([[0], np.cumsum(p)])
    return (cs[w:] - cs[:-w]) / w


dB = lambda v: 10 * np.log10(max(v, 1e-20))
f1 = lambda v: f"{v:+.1f}"
kM = np.stack([kweight(c) for c in mus])
kV = np.stack([kweight(c) for c in vo])
mM, mV = mov((kM ** 2).sum(0)), mov((kV ** 2).sum(0))
cen = (np.arange(len(mM)) + 0.05 * SR) / SR

SFXW = [(r["start"] - 0.03, r["end"] + (0.4 if "sparkle" in r["name"] or "pop" in r["name"] else 0.15))
        for r in SFXJ["sfx"]]
in_sfx = lambda t0, t1: any(t0 < b and t1 > a_ for a_, b in SFXW)

total = float(SFXJ["total"])
print(f"music.wav: {w_sr} Гц, {w_ch} канала, {w_bits} бит, {w_n / w_sr:.3f} с; total {total:.3f} с, "
      f"разница {1000 * (w_n / w_sr - total):+.1f} мс")
vref = dB(ms(vo, SPEECH))
rows = []
for i, (t0, t1) in enumerate(SPEECH, 1):
    vl = ms(vo, [(t0, t1)])
    r = dB(ms(mus, [(t0, t1)])) - dB(vl)
    cuts = [(x, x + 0.1) for x in np.arange(t0, t1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
    rc = dB(ms(mus, cuts)) - dB(vl) if cuts else float("nan")
    rows.append((i, r, rc, 0.1 * len(cuts) >= 0.6))
print("по строкам, RMS дБ к голосу строки (всё с шумами | вне окон шумов; в скобках — вне шумов меньше 0,6 с):")
for k in range(0, NL, 6):
    print("  " + " ".join(f"{i}:{r:.1f}|{rc:.1f}" if ok_ else f"{i}:{r:.1f}|({rc:.1f})" for i, r, rc, ok_ in rows[k:k + 6]))
LV = SFXJ["levels"]
print("музыка без шумов по строкам (make_music.py, отдельная дорожка), дБ к голосу строки:")
print("  " + " ".join(f"{i}:{v:.1f}" for i, v in LV["lines"].items()))

vpk = [float(mV[(cen >= t0) & (cen <= t1)].max()) for t0, t1 in SPEECH]
vsp = [float(np.abs(vo[0, int(t0 * SR):int(t1 * SR)]).max()) for t0, t1 in SPEECH]
print("шумы по файлу (music.wav в окне шума, вместе с музыкой): окно 100 мс K | пик отсчёта, дБ к пику голоса строки:")
worst = []
for r in SFXJ["sfx"]:
    s0, s1 = r["start"], r["end"]
    sel = (cen >= s0) & (cen <= s1)
    over = [i for i, (t0, t1) in enumerate(SPEECH) if s0 < t1 and s1 > t0]
    ref = max(vpk[i] for i in over) if over else float(np.median(vpk))
    rsp = max(vsp[i] for i in over) if over else float(np.median(vsp))
    wdb = dB(float(mM[sel].max()) / ref)
    sdb = 20 * np.log10(float(np.abs(mus[:, int(s0 * SR):int(s1 * SR)]).max()) / rsp)
    if over:
        worst.append(max(wdb, sdb))
    print(f"  {r['name']:13s} {s0:7.3f}…{s1:7.3f}  {wdb:+5.1f} | {sdb:+5.1f}  строки {[i + 1 for i in over]}")

fin = float(SFXJ["fin"])
W_INTRO = [(0.5, SPEECH[0][0] - 0.3)]
W_TAIL = [(SPEECH[-1][1] + 0.3, fin - 0.05)]
W_FIN = [(fin, min(fin + 2.0, n / SR - 2.2))]
gaps = [(f"{i}|{i + 1}", SPEECH[i - 1][1] + 0.2, SPEECH[i][0] - 0.2) for i in (4, 8)]
print(f"без голоса, к среднему голосу (с шумами): заставка {f1(dB(ms(mus, W_INTRO)) - vref)} дБ, паузы между "
      "строфами " + " ".join(f"{g}:{f1(dB(ms(mus, [(t0, t1)])) - vref)}" for g, t0, t1 in gaps)
      + f", после голоса до fin {f1(dB(ms(mus, W_TAIL)) - vref)}, финал {f1(dB(ms(mus, W_FIN)) - vref)} дБ")
print(f"музыка без шумов (make_music.py): заставка {LV['intro']}, паузы {LV['gaps']}, после голоса {LV['tail']}, "
      f"финал {LV['final']} дБ")
fo = [dB(ms(mus, [(n / SR - 2.2 + 0.4 * k, n / SR - 2.2 + 0.4 * (k + 1))])) for k in range(5)]
print("затихание в конце (окна по 0,4 с), дБFS: " + " ".join(f"{v:.1f}" for v in fo)
      + f"; первые 0,1 с {dB(ms(mus, [(0, 0.1)])):.1f}, 0,5–0,6 с {dB(ms(mus, [(0.5, 0.6)])):.1f}")
pk_m, pk_x = float(np.max(np.abs(mus))), float(np.max(np.abs(mix)))
clip = int(np.sum(np.abs(mix) >= 1.0))
print(f"пик music.wav {20 * np.log10(pk_m):.1f} dBFS, пик смеси {20 * np.log10(pk_x):.1f} dBFS, клиппинг смеси: {clip}")


def ebur(path, af=None):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                        (af + "," if af else "") + "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return (float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1]))


I, P = ebur(a.mix)
X = -14.0 - I
I2, P2 = ebur(a.mix, f"volume={X:.2f}dB,alimiter=limit=0.82:attack=4:release=60:level=false")
print(f"смесь до мастера: {I:.1f} LUFS, true peak {P:.1f} dBTP; пробный мастер (volume {X:+.2f} dB + alimiter 0,82): "
      f"{I2:.1f} LUFS, true peak {P2:.1f} dBTP")
ok = lambda c: "да" if c else "НЕТ"
mus_ok = all(-20.05 <= v <= -17.95 for v in LV["lines"].values())
bed_ok = all(-20.6 <= rc <= -17.4 for _, _, rc, ok_ in rows if ok_)
print(f"итог: длина = total: {ok(abs(w_n / w_sr - total) < 0.001)}; 44,1 кГц стерео 16 бит: "
      f"{ok(w_sr == 44100 and w_ch == 2 and w_bits == 16)}; музыка без шумов по строкам в −18…−20: {ok(mus_ok)}; "
      f"по файлу вне шумов в −18…−20 (±0,6): {ok(bed_ok)}; шумы под голосом не выше −6 дБ к пику голоса: "
      f"{ok(max(worst) <= -5.9)}; пик music.wav ≤ −1 dBFS: {ok(pk_m <= 10 ** (-1 / 20))}; клиппинга нет: {ok(clip == 0)}; "
      f"−14 LUFS ±1 и TP ≤ −1 после мастера: {ok(abs(I2 + 14) <= 1 and P2 <= -1)}")
