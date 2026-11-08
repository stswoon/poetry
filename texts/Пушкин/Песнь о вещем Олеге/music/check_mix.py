#!/usr/bin/env python3
"""Проверка баланса голоса и music.wav (музыка + шумы), независимо от make_music.py.

Смешивает ../voice.mp3 (моно в оба канала, со сдвигом V0 из events.json) и music.wav, как в ролике. K-взвешивание
(BS.1770) — настоящим IIR-фильтром ffmpeg (biquad с коэффициентами стандарта), уровни — по окнам строк
(events.json: L<n>…E<n>), по строфам (../timings.json), в паузах между строфами, на заставке и в финале; кратко-
временный замер 400 мс в местах речи (где музыка подходит к голосу ближе всего); громкость смеси — ffmpeg ebur128.

Запуск: python3 check_mix.py [путь к mix.wav]   (по умолчанию — во временной папке системы)
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
SR = 44100
EV = json.loads((HERE / 'events.json').read_text(encoding='utf-8'))
T = json.loads((POEM / 'timings.json').read_text(encoding='utf-8'))
V0 = EV['V0']
NL = len(T['lines'])
mix_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / 'oleg_v2_mix.wav'
voice, music = POEM / 'voice.mp3', HERE / 'music.wav'
dly = int(round(V0 * 1000))
VPAN = f'pan=stereo|c0=c0|c1=c0,adelay={dly}:all=1'


def kchain():
    K, Q = np.tan(np.pi * 1681.974450955533 / SR), .7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** .4996667741545416
    a0 = 1 + K / Q + K * K
    s1 = dict(b0=(Vh + Vb * K / Q + K * K) / a0, b1=2 * (K * K - Vh) / a0, b2=(Vh - Vb * K / Q + K * K) / a0, a0=1,
              a1=2 * (K * K - 1) / a0, a2=(1 - K / Q + K * K) / a0)
    K, Q = np.tan(np.pi * 38.13547087602444 / SR), .5003270373238773
    a0 = 1 + K / Q + K * K
    s2 = dict(b0=1, b1=-2, b2=1, a0=1, a1=2 * (K * K - 1) / a0, a2=(1 - K / Q + K * K) / a0)
    bq = lambda c: 'biquad=' + ':'.join(f'{k}={v:.15g}' for k, v in c.items())
    return f'{bq(s1)},{bq(s2)}'


def dec(path, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path)]
    if af:
        cmd += ['-af', af]
    cmd += ['-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    return x.reshape(-1, 2).T


subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(voice), '-i', str(music), '-filter_complex',
                f'[0:a]aresample={SR},{VPAN}[v];[v][1:a]amix=inputs=2:normalize=0:duration=longest[m]',
                '-map', '[m]', '-c:a', 'pcm_s16le', str(mix_path)], check=True)
K = kchain()
mus, vo = dec(music), dec(voice, VPAN)
kmus, kvo = dec(music, K), dec(voice, f'{VPAN},{K}')
n = mus.shape[1]


def cs(x):
    e = np.zeros(n + 1)
    acc = np.zeros(n)
    for c in x:
        m = min(n, len(c))
        acc[:m] += c[:m].astype(np.float64) ** 2
    np.cumsum(acc, out=e[1:])
    return e


CM, CV, RM, RV = cs(kmus), cs(kvo), cs(mus), cs(vo)


def ms(c, wins):
    s = k = 0
    for a, b in wins:
        ia, ib = max(0, int(a * SR)), min(n, int(b * SR))
        if ib > ia:
            s += c[ib] - c[ia]
            k += ib - ia
    return s / max(1, k)


dB = lambda p: 10 * np.log10(max(p, 1e-20))
f1 = lambda x: f'{x:+.1f}'
speech = [(EV[f'L{i}'], EV[f'E{i}']) for i in range(1, NL + 1)]
vK, vR = dB(ms(CV, speech)), dB(ms(RV, speech))
print(f'смесь: {mix_path} ({n / SR:.3f} с); music.wav {mus.shape[1] / SR:.3f} с, голос в местах речи K {vK - .691:.1f} LUFS')
print(f'music.wav (музыка + шумы) к голосу в местах речи ({NL} строк): K {f1(dB(ms(CM, speech)) - vK)} дБ, '
      f'RMS {f1(dB(ms(RM, speech)) - vR)} дБ')
per = np.array([dB(ms(CM, [w])) - dB(ms(CV, [w])) for w in speech])
st = {}
for i, l in enumerate(T['lines']):
    st.setdefault(l['stanza'], []).append(speech[i])
print('по строфам (K к голосу этой строфы):',
      '  '.join(f'{s}: {f1(dB(ms(CM, w)) - dB(ms(CV, w)))}' for s, w in st.items()))
print('по строкам (K к голосу строки):', ' '.join(f'{i + 1}:{per[i]:.1f}' for i in range(NL)))
out = [f'{i + 1} ({per[i]:.1f})' for i in range(NL) if not -21 <= per[i] <= -17]
print(f'строки: медиана {np.median(per):.1f}, от {per.min():.1f} до {per.max():.1f}; вне −21…−17: {", ".join(out) or "нет"}')
# кратковременно: 400 мс с шагом 100 мс внутри строк — музыка к голосу всей строки (всплески музыки и шумов)
fr, hop = int(.4 * SR), int(.1 * SR)
diffs, worst = [], []
for a, b in speech:
    v = dB(ms(CV, [(a, b)]))
    for i in range(int(a * SR), int(b * SR) - fr, hop):
        d = dB((CM[i + fr] - CM[i]) / fr) - v
        diffs.append(d)
        worst.append((d, i / SR))
diffs = np.array(diffs)
worst.sort(reverse=True)
print(f'400 мс в речи ({len(diffs)} окон): медиана {np.median(diffs):.1f}, 90 % {np.percentile(diffs, 90):.1f}, '
      f'95 % {np.percentile(diffs, 95):.1f} дБ; громче −12 дБ: {np.mean(diffs > -12) * 100:.1f} % окон; '
      f'самые громкие: {", ".join(f"{t:.1f} с {d:.1f}" for d, t in worst[:8])}')
ss = list(st.values())
gaps = [(ss[k][-1][1] + .15, ss[k + 1][0][0] - .15) for k in range(len(ss) - 1)]
print('паузы между строфами (K к среднему голосу):',
      ' '.join(f'{k + 1}/{k + 2}:{f1(dB(ms(CM, [g])) - vK)}' for k, g in enumerate(gaps) if g[1] > g[0]))
print(f'заставка 0…{V0} с: K {f1(dB(ms(CM, [(.2, V0 - .05)])) - vK)} дБ; финал {EV["fin"]}…{EV["total"]}: '
      f'K {f1(dB(ms(CM, [(EV["fin"], EV["total"])])) - vK)} дБ')
print(f'пик music.wav {20 * np.log10(np.abs(mus).max()):.1f} dBFS')
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(mix_path), '-af', 'ebur128=peak=true', '-f', 'null',
                    '-'], capture_output=True, text=True).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
print(f'смесь (до мастера ролика): {I[-1] if I else "?"} LUFS, true peak {P[-1] if P else "?"} dBFS')
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(music), '-af', 'ebur128=peak=true', '-f', 'null',
                    '-'], capture_output=True, text=True).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
print(f'music.wav отдельно: {I[-1] if I else "?"} LUFS, true peak {P[-1] if P else "?"} dBFS')
