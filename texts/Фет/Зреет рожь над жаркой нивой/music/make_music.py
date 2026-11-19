#!/usr/bin/env python3
"""Музыка и шумы к стиху А. А. Фета «Зреет рожь над жаркой нивой…», стиль «пастозная живопись маслом».

Своя тёплая летняя пастораль-вальс на 3/4 в ля мажоре. Мелодии и гармония свои, ни на какую известную пьесу не опираются.
Инструменты — синтез (numpy):
  гитара (Karplus-Strong, нейлон) — вальсовое «ум-па-па»: бас на первую долю (шина bs), аккорды на 2 и 3 (шина gtr);
  арфа (Karplus-Strong + мягкий основной тон) — подголосок строфы 1, переборы, арпеджио, глиссандо (шина hp);
  мягкие струнные педали (волновая таблица, три расстроенных голоса) — шина str;
  скрипичная линия в строфе 3 — торжественный подъём (шина vn);
  флейта (непрерывная фаза, вибрато, дыхание) — вступление и финал (шина fl);
  высокие колокольчики «месяца» — строфа 2 (шина bel).
План (секунды ролика берутся из events.json):
  0 … L1      вступление, 3 такта: арфа прокатывает аккорд, флейта поёт мотив, педаль струнных; под шорох колосьев;
  строфа 1    8 тактов (L1 … L5): гитара-вальс, арфа ведёт подголосок «волнами»; в паузе — сбегающий пассаж арфы;
              A A D A F#m D E E7, затем прерванный оборот в фа-диез минор;
  строфа 2    8 тактов (L5 … L9) прозрачнее: бас и один аккорд на такт, высокие колокольчики месяца, тихая педаль;
              на «раскинул» — широкий раскат арфы и подъём струнных; в паузе — восходящее арпеджио;
  строфа 3    7 тактов (L9 … «око») с лёгким расширением: полный вальс, арфа вверх, скрипки — торжественная линия;
              A E/G# F#m D Bm, на «смежает небо» — затишье (одна педаль), на «Огнедышащее» — нарастание и глиссандо
              арфы, на «око» — широкий ля-мажорный аккорд от A1 до A5, держится до fin;
  fin … конец флейта повторяет мотив вступления (2 такта), последний аккорд с колокольчиком, затухание.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке; цель LINE_DB — для музыки вместе с
шумами, при этом музыка одна держится в −18,2…−20 дБ), громче на заставке, в паузах между строфами и в финале;
под голосом у музыки ещё мягкий провал −3 дБ около 2,5 кГц (место для речи).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список и уровни — sfx.json):
шорох колосьев на пролёте титра, порыв ветра на «Гонит», золотые волны ржи (zolot…perel), «динь» месяца на «Робко»,
мягкий гул-вспышка на «око».

Запуск: python3 make_music.py [--intro 3.6] [--outro 6.0] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json)
Читает events.json (его пишет ../video/build.py; при другом вступлении все события сдвигаются), ../timings.json
(длина голоса) и ../voice.mp3 (через ffmpeg — уровни строк). Пишет music.wav (44,1 кГц, 16 бит, стерео,
длина = вступление + голос + финал) и рядом sfx.json (шумы, уровни, ключевые моменты музыки). Нужны python3 + numpy, ffmpeg.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import wave

import numpy as np

T_START = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
FRAME = 1 / 30

# ---------- уровни ----------
LINE_DB = {i: -19.0 for i in range(1, 13)}     # музыка + шумы, RMS, дБ к голосу той же строки
MUS_LIM = (-20.0, -18.2)                       # музыка одна на строке не выходит из этих пределов
SPLIT = {12: ["oko2"]}         # строка 12 меряется двумя частями: «Огнедышащее» и аккорд на «око» (с вспышкой)
INTRO_DB = -8.0      # заставка, к среднему голосу
GAP_DB = -12.0       # паузы между строфами, к среднему голосу (не тише соседних строк и не выше их на 9 дБ)
PAUSE_DB = -16.0     # долгая пауза внутри строфы (от 0,7 с), к среднему голосу (не выше строк на 6 дБ)
TAIL_DB = -8.0       # после голоса до fin (держится аккорд «око»), к среднему голосу
FIN_DB = -6.0        # финал
FADE_IN = 0.5        # нарастание в начале, с
FADE_OUT = 2.0       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {"rye_rustle": -14, "wind_gust": -17, "rye_waves": -24, "moon_ding": -19, "eye_flash": -22}
BED = {"rye_rustle", "rye_waves"}   # долгие шумы — для check_mix.py часть подложки

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Зреет рожь над жаркой нивой…» Фета")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW.get('OUTRO')})")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV")
args = ap.parse_args()
V0 = args.intro if args.intro is not None else float(RAW["V0"])
OUTRO = args.outro if args.outro is not None else float(RAW["OUTRO"])
if V0 < 2.0:
    sys.exit("вступление короче 2 с: заставке не хватит места")

r3 = lambda x: round(float(x), 3)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TJ = json.load(f)
VD = float(TJ["voiceDuration"])
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
SHIFT = V0 - float(RAW["V0"])
EV = {k: r3(float(v) + SHIFT) for k, v in RAW.items()
      if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total")}
EV["V0"] = V0
NL = len([k for k in EV if k[0] == "L" and k[1:].isdigit()])
if NL != 12:
    sys.exit(f"ожидалось 12 строк, в events.json {NL}")
for i in range(1, NL + 1):  # events.json должен быть собран по тем же таймингам
    ln = TJ["lines"][i - 1]
    if abs(ln["start"] + V0 - EV[f"L{i}"]) > 0.02 or abs(ln["end"] + V0 - EV[f"E{i}"]) > 0.02:
        print(f"внимание: строка {i} в events.json не совпадает с timings.json — перезапусти ../video/build.py")
        break
if abs(float(RAW["total"]) + SHIFT - TOTAL) > 0.002:
    print(f"внимание: длина {TOTAL} с, а в events.json total {RAW['total']} (+сдвиг {SHIFT:+.3f}) — другой финал?")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = EV["fin"]
if FIN > TOTAL - 3.0:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
STANZA_END = (4, 8)
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1859)
db = lambda x: 10.0 ** (x / 20.0)
hz = lambda m: 440.0 * 2.0 ** ((float(m) - 69.0) / 12.0)
tt = lambda n: np.arange(int(n)) / SR
dB = lambda v: 10 * np.log10(max(float(v), 1e-20))


def pan_gains(p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    gl, gr = pan_gains(pan)
    return np.stack([x * gl, x * gr])


def pan_curve(x, p):
    """моно → стерео, панорама — массив той же длины"""
    gl, gr = pan_gains(p)
    return np.stack([x * gl, x * gr])


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def fade_tail(x, sec=0.01):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


def damp(x, d, rel=0.08):
    """струну глушат через d с: гаснет за rel"""
    nd = int(max(0.0, d) * SR)
    if nd >= x.shape[-1]:
        return x
    m = min(x.shape[-1], nd + int(rel * 6 * SR))
    y = x[..., :m].copy()
    y[..., nd:] *= np.exp(-tt(m - nd) / rel)
    return fade_tail(y, 0.004)


# ---------- фильтры: амплитудная характеристика биквадов RBJ, применяется через FFT ----------
def biquad(kind, f0, q=0.707, gain_db=0.0):
    w0 = 2 * np.pi * min(f0, 0.49 * SR) / SR
    cw, al = np.cos(w0), np.sin(w0) / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == "lp":
        b, a = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == "hp":
        b, a = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == "peak":
        b, a = [1 + al * A, -2 * cw, 1 - al * A], [1 + al / A, -2 * cw, 1 - al / A]
    else:
        raise ValueError(kind)
    return np.array(b) / a[0], np.array(a) / a[0]


def mag(ba, fr):
    b, a = ba
    z = np.exp(-2j * np.pi * fr / SR)
    return np.abs((b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z))


def eq(x, *bqs, power=1):
    n = x.shape[-1]
    nf = p2(n + 4096)
    fr = np.fft.rfftfreq(nf, 1 / SR)
    H = np.ones_like(fr)
    for ba in bqs:
        H *= mag(ba, fr)
    return np.fft.irfft(np.fft.rfft(x, nf, axis=-1) * H ** power, nf, axis=-1)[..., :n]


def kweight(x):
    """K-фильтр BS.1770 (амплитудно — для энергии в окнах этого достаточно)"""
    K = np.tan(np.pi * 1681.974450955533 / SR)
    Q = 0.7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    s1 = (np.array([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]),
          np.array([1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]))
    K = np.tan(np.pi * 38.13547087602444 / SR)
    Q = 0.5003270373238773
    a0 = 1 + K / Q + K * K
    s2 = (np.array([1.0, -2.0, 1.0]), np.array([1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]))
    return eq(x, s1, s2)


def bandn(n, lo, hi, g=None):
    """шум в полосе lo…hi Гц, RMS 1"""
    g = g or rng
    n = int(n)
    y = eq(g.standard_normal(n), biquad("hp", lo, 0.7), biquad("lp", hi, 0.7), power=2)
    return y / np.sqrt(np.mean(y ** 2) + 1e-20)


def tvf(x, gain_fn, nf=1024, hop=256):
    """фильтр, меняющийся во времени: gain_fn(tc[кадры], fr[бины]) -> (кадры, бины)"""
    n = len(x)
    win = np.hanning(nf + 1)[:-1]
    pad = np.concatenate([np.zeros(nf), x, np.zeros(nf)])
    nfr = (len(pad) - nf) // hop + 1
    idx = np.arange(nf)[None, :] + hop * np.arange(nfr)[:, None]
    tc = (hop * np.arange(nfr) + nf / 2 - nf) / SR
    fr = np.fft.rfftfreq(nf, 1 / SR)
    Y = np.fft.irfft(np.fft.rfft(pad[idx] * win, axis=1) * gain_fn(tc, fr), nf, axis=1) * win
    out, ws = np.zeros(len(pad)), np.zeros(len(pad))
    w2 = win ** 2
    for i in range(nfr):
        out[i * hop:i * hop + nf] += Y[i]
        ws[i * hop:i * hop + nf] += w2
    return (out / np.maximum(ws, 1e-3))[nf:nf + n]


def band_sweep(fc_fn, bw_oct):
    """полоса-«гаусс» шириной bw_oct октав с центром fc_fn(t)"""
    def fn(tc, fr):
        f = np.maximum(fr, 1.0)[None, :]
        fc = np.asarray(fc_fn(tc), float).reshape(-1, 1)
        return np.exp(-0.5 * (np.log2(f / fc) / bw_oct) ** 2)
    return fn


def slow(n, rate, g=None):
    """медленная случайная кривая около 0 (размах ~±1), rate — изменений в секунду"""
    g = g or rng
    k = int(n / SR * rate) + 4
    return np.interp(np.linspace(0, k - 3, int(n)), np.arange(k), g.standard_normal(k))


def bump(t, t0, rise, fall):
    """мягкий горб: sin² подъём за rise до t0, потом экспонента fall"""
    up = np.sin(0.5 * np.pi * np.clip((t - (t0 - rise)) / rise, 0, 1)) ** 2
    return np.where(t <= t0, up, np.exp(-np.maximum(t - t0, 0) / fall))


# ---------- инструменты ----------
_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


def ks(f, dur, t60, w=0.5, pos=0.2, smooth=2, seed=0):
    """струна Karplus-Strong. Петля считается на своей частоте дискретизации, чтобы период был ровно целым
    (P + задержка фильтра w), потом пересчитывается в 44,1 кГц — строй точный и у высоких нот."""
    g = np.random.default_rng(seed)
    P = max(2, int(SR / f - w))
    sr2 = f * (P + w)
    n2 = int(dur * sr2) + 3
    exc = g.uniform(-1, 1, P)
    if smooth > 1:
        exc = np.convolve(np.concatenate([exc, exc]), np.ones(smooth) / smooth, "same")[P:2 * P]
    k = max(1, int(round(pos * P)))
    exc = exc - np.roll(exc, k)            # место щипка
    exc -= exc.mean()
    loss = 0.001 ** (1.0 / (f * t60))
    z = np.zeros(n2 + 1)
    z[1:P + 1] = exc
    for s in range(P, n2, P):
        e = min(s + P, n2)
        z[1 + s:1 + e] = loss * ((1 - w) * z[1 + s - P:1 + e - P] + w * z[s - P:e - P])
    n = int(dur * SR)
    x = np.interp(np.arange(n) * (sr2 / SR), np.arange(n2), z[1:])
    x /= max(1e-9, float(np.max(np.abs(x[:int(0.06 * SR)]))))
    a = int(0.0015 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return fade_tail(x, 0.05)


def guitar(m):
    """нейлоновая струна (звенит до 3 с, глушится в damp)"""
    def mk():
        f = hz(m)
        t60 = float(np.clip(3.4 - 0.035 * (m - 40), 1.6, 3.4))
        return ks(f, min(3.2, t60), t60, w=0.5, pos=0.16, smooth=3, seed=int(m) * 5 + 1)
    return cached(("gt", m), mk)


def bass(m):
    def mk():
        f = hz(m)
        x = ks(f, 3.0, 2.6, w=0.5, pos=0.22, smooth=4, seed=int(m) * 3 + 2)
        t = tt(len(x))
        x = x + 0.35 * np.sin(2 * np.pi * f * t) * np.exp(-t / 1.4) * np.minimum(1, t / 0.004)
        return fade_tail(x, 0.05)
    return cached(("bs", m), mk)


def harp(m):
    def mk():
        f = hz(m)
        t60 = float(np.clip(5.0 - 0.05 * (m - 45), 1.8, 5.0))
        d = min(3.6, t60 * 0.8)
        x = ks(f, d, t60, w=0.42, pos=0.3, smooth=2, seed=int(m) * 7 + 3)
        t = tt(len(x))
        x = x + 0.3 * np.sin(2 * np.pi * f * t) * np.exp(-t / (t60 * 0.18)) * np.minimum(1, t / 0.003)
        return fade_tail(x, 0.15)
    return cached(("hp", m), mk)


def bell(m):
    """высокий колокольчик месяца: мягкий молоточек, лёгкое биение"""
    def mk():
        f = hz(m)
        n = int(2.6 * SR)
        t = tt(n)
        g = np.random.default_rng(int(m) * 11 + 9)
        y = np.zeros(n)
        for r, a, tau in ((1, 1.0, 1.4), (1.0018, 0.35, 1.6), (2.76, 0.18, 0.35), (5.4, 0.06, 0.1)):
            if f * r < 15000:
                y += a * np.sin(2 * np.pi * f * r * t + g.uniform(0, 6.28)) * np.exp(-t / tau)
        k = int(0.004 * SR)
        y[:k] *= np.linspace(0, 1, k)
        return fade_tail(y / np.max(np.abs(y)), 0.1)
    return cached(("bl", m), mk)


TS = 4096
_TAB = {}


def saw_table(h, tilt):
    key = (h, tilt)
    if key not in _TAB:
        x = np.arange(TS) / TS
        y = sum(np.sin(2 * np.pi * k * x) / k * np.exp(-tilt * (k - 1)) for k in range(1, h + 1))
        y /= np.max(np.abs(y))
        _TAB[key] = np.concatenate([y, y[:1]])
    return _TAB[key]


def bowed(m, dur, att=0.35, rel=0.6, voices=(-7, 0, 6), bright=1.0, vib=0.0035, seed=0):
    """струнные: волновая таблица пилы, несколько чуть расстроенных голосов, вибрато"""
    g = np.random.default_rng(seed)
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    h = int(np.clip(6500 * bright / f, 3, 48))
    tab = saw_table(h, 0.09 / bright)
    y = np.zeros(n)
    for c in voices:
        fv = f * 2 ** ((c + g.uniform(-1.5, 1.5)) / 1200)
        v = 1 + vib * np.sin(2 * np.pi * g.uniform(4.6, 5.6) * t + g.uniform(0, 6.28)) * np.minimum(1, t / 0.5) \
            + 0.0012 * slow(n, 2.5, g)
        ph = (np.cumsum(fv * v) / SR + g.uniform(0, 1)) % 1.0
        y += np.interp(ph * TS, np.arange(TS + 1), tab)
    y /= len(voices)
    env = np.ones(n)
    na, nd = int(att * SR), int(dur * SR)
    env[:na] = np.sin(0.5 * np.pi * np.arange(na) / na) ** 2
    nr = n - nd
    if nr > 0:
        env[nd:] *= np.cos(0.5 * np.pi * np.arange(nr) / nr) ** 2
    return y * env


def flute(notes, rel=0.4, seed=0):
    """флейта: фраза legato. notes — [(начало, конец, midi, громкость)], возвращает (t0, сигнал)"""
    g = np.random.default_rng(seed)
    T0 = notes[0][0] - 0.02
    T1 = notes[-1][1] + rel
    n = int((T1 - T0) * SR)
    t = tt(n) + T0
    ons = np.array([a for a, _, _, _ in notes])
    lf = np.log(np.array([hz(m) for _, _, m, _ in notes]))
    vs = np.array([v for _, _, _, v in notes])
    # высота: ступенька с глиссандо 25 мс
    kx, ky = [T0], [lf[0]]
    for i in range(1, len(notes)):
        kx += [ons[i] - 0.012, ons[i] + 0.013]
        ky += [lf[i - 1], lf[i]]
    kx.append(T1)
    ky.append(lf[-1])
    f = np.exp(np.interp(t, kx, ky))
    idx = np.clip(np.searchsorted(ons, t, side="right") - 1, 0, len(notes) - 1)
    since = t - ons[idx]
    depth = 0.0055 * np.clip((since - 0.18) / 0.35, 0, 1)
    f = f * (1 + depth * np.sin(2 * np.pi * 5.2 * t) + 0.001 * slow(n, 3, g))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.24 * np.sin(2 * ph + 0.4) + 0.08 * np.sin(3 * ph + 1.1) + 0.03 * np.sin(4 * ph)
    amp = vs[idx] * (1 - 0.35 * np.exp(-((since - 0.012) / 0.03) ** 2))     # мягкая атака языком
    amp *= np.clip((t - T0) / 0.09, 0, 1)
    tail = np.clip((t - notes[-1][1]) / rel, 0, 1)
    amp *= np.cos(0.5 * np.pi * tail) ** 2
    amp *= 1 + 0.15 * np.clip(since / 0.6, 0, 1) * (1 - np.clip(since / 1.6, 0, 1))  # нота чуть «дышит»
    breath = 0.045 * bandn(n, 1200, 7000, g)
    chiff = np.zeros(n)
    for a in ons:
        i0 = int((a - T0) * SR)
        k = min(n - i0, int(0.05 * SR))
        if k > 0:
            chiff[i0:i0 + k] += np.exp(-tt(k) / 0.012)
    noise = bandn(n, 2500, 9000, g) * chiff * 0.08
    return T0, (sig + breath + noise) * amp


# ---------- шины ----------
BUSES = ["gtr", "bs", "hp", "str", "vn", "fl", "bel"]
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_G = {"gtr": 0.56, "bs": 0.55, "hp": 0.62, "str": 0.30, "vn": 0.50, "fl": 0.62, "bel": 0.17}
BUS_SEND = {"gtr": 0.18, "bs": 0.05, "hp": 0.30, "str": 0.35, "vn": 0.30, "fl": 0.28, "bel": 0.45}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += x[:, j0:j1] * g


class Grid:
    """сетка долей (четвертей): starts — начала долей (последний элемент — конец сетки)"""

    def __init__(self, starts):
        self.s = np.asarray(starts, float)

    def t(self, b):
        i = int(np.clip(np.floor(b), 0, len(self.s) - 2))
        return float(self.s[i] + (b - i) * (self.s[i + 1] - self.s[i]))

    def blen(self, b):
        i = int(np.clip(np.floor(b), 0, len(self.s) - 2))
        return float(self.s[i + 1] - self.s[i])


def seg(t0, t1, n, b0=None):
    """n долей от t0 до t1: ровно или с линейно меняющейся длиной доли (начиная с b0)"""
    D = t1 - t0
    b = np.full(n, D / n) if b0 is None else np.linspace(b0, 2 * D / n - b0, n)
    return Grid(np.concatenate([[t0], t0 + np.cumsum(b)]))


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(s):
    return 12 * (int(s[-1]) + 1) + NOTE[s[0]] + s.count("#") - s.count("b")


def parse(txt):
    """«C#5/1 E5/.5 r/.5 | …» → [(доля, midi, длина в долях)], всего долей"""
    out, b = [], 0.0
    for bar in txt.split("|"):
        for tok in bar.split():
            nm, d = tok.split("/")
            if nm != "r":
                out.append((b, midi(nm), float(d)))
            b += float(d)
    return out, b


def play_pluck(G, b0, txt, inst, bus, vel=1.0, pan=0.0, beats=None, swell=None):
    notes, total = parse(txt)
    if beats is not None and abs(total - beats) > 1e-6:
        sys.exit(f"партия: {total} долей вместо {beats}: {txt[:40]}…")
    for k, (b, m, d) in enumerate(notes):
        v = vel * (1.0 if (b % 3) < 1e-6 else 0.86) * (swell(k, len(notes)) if swell else 1.0)
        put(bus, G.t(b0 + b), inst(m) * v, pan + 0.04 * ((m - 72) / 12))


def play_bowed(G, b0, txt, bus, vel=1.0, pan=0.0, beats=None, **kw):
    notes, total = parse(txt)
    if beats is not None and abs(total - beats) > 1e-6:
        sys.exit(f"партия: {total} долей вместо {beats}: {txt[:40]}…")
    for b, m, d in notes:
        t0, t1 = G.t(b0 + b), G.t(b0 + b + d)
        put(bus, t0, bowed(m, t1 - t0 + 0.08, seed=int(m * 31 + b * 7), **kw) * vel, pan)


def flute_part(G, b0, txt, vel=1.0, last=None, pan=0.08, seed=0):
    notes, _ = parse(txt)
    seq = []
    for k, (b, m, d) in enumerate(notes):
        t0, t1 = G.t(b0 + b), G.t(b0 + b + d)
        if k == len(notes) - 1 and last is not None:
            t1 = t0 + last
        accent = 1.0 if (b % 3) < 1e-6 else 0.9
        seq.append((t0, t1 - 0.015, m, vel * accent * (1 + 0.04 * (m - 76) / 5)))
    T0, x = flute(seq, seed=seed)
    put("fl", T0, x, pan)


QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "sus4": (0, 5, 7)}


def chord(sym):
    """«F#m», «E/G#», «Bm7/E» → (корень, интервалы, класс баса)"""
    main, _, sl = sym.partition("/")
    r = main[:2] if len(main) > 1 and main[1] in "#b" else main[:1]
    rp = (NOTE[r[0]] + r.count("#") - r.count("b")) % 12
    iv = QUAL[main[len(r):]]
    bp = rp if not sl else (NOTE[sl[0]] + sl.count("#") - sl.count("b")) % 12
    return rp, iv, bp


def voicing(rp, iv, lo, size):
    pcs = {(rp + i) % 12 for i in iv}
    out, m = [], lo
    while len(out) < size:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def low(pc, lo=40):
    return lo + (pc - lo) % 12


def strum(t, notes, vel, inst=guitar, bus="gtr", hold=None, spread=0.012, pan=-0.28):
    for k, m in enumerate(notes):
        x = inst(m) * vel * (0.9 + 0.1 * k / max(1, len(notes) - 1))
        if hold is not None:
            x = damp(x, hold)
        put(bus, t + k * spread, x, pan + 0.08 * (k - len(notes) / 2) / len(notes))


def waltz(G, b0, chords, style="full", vel=1.0, lo=55):
    """гитарный вальс: бас на 1, аккорд на 2 и 3; thin — бас и один аккорд на 2"""
    prev = None
    for i, sym in enumerate(chords.split()):
        b = b0 + 3 * i
        rp, iv, bp = chord(sym)
        bm = low(bp)
        if sym == prev and bp == rp:                     # повтор аккорда — бас на квинту
            bm = low((rp + 7) % 12)
        prev = sym
        bl = G.blen(b)
        if style == "none":
            continue
        put("bs", G.t(b), damp(bass(bm), 2.85 * bl, 0.15) * vel * (0.85 if style == "thin" else 1.0), 0.0)
        vo = voicing(rp, iv, lo, 3)
        if style == "full":
            strum(G.t(b + 1), vo, vel * 0.62, hold=0.7 * bl)
            strum(G.t(b + 2), vo, vel * 0.5, hold=0.6 * bl)
        elif style == "thin":
            strum(G.t(b + 1), vo, vel * 0.42, hold=1.6 * bl, spread=0.02)


def pad(t0, t1, sym, vel, lo=57, size=4, att=0.45, rel=0.7, bright=0.9, seed=0):
    rp, iv, bp = chord(sym)
    for k, m in enumerate(voicing(rp, iv, lo, size)):
        put("str", t0, bowed(m, t1 - t0, att=att, rel=rel, bright=bright, seed=seed * 17 + m) * vel,
            -0.45 + 0.9 * k / max(1, size - 1))


def pads(G, b0, chords, vel, lo=57, size=4, bright=0.9, seed=0):
    for i, sym in enumerate(chords.split()):
        b = b0 + 3 * i
        v = vel[i] if isinstance(vel, (list, tuple)) else vel
        if v > 0:
            pad(G.t(b), G.t(b + 3) + 0.15, sym, v, lo, size, bright=bright, seed=seed + i)


def arp(G, b, sym, n=6, step=0.5, lo=57, vel=0.6, pan=0.3, cresc=0.0):
    rp, iv, _ = chord(sym)
    ns = voicing(rp, iv, lo, n)
    for k, m in enumerate(ns):
        put("hp", G.t(b + k * step), harp(m) * vel * (1 + cresc * k / max(1, n - 1)), pan + 0.03 * k)


def roll(t, notes, step=0.028, vel=0.7, pan=0.3):
    for k, m in enumerate(notes):
        put("hp", t + k * step, harp(m) * vel, pan - 0.5 + k / max(1, len(notes) - 1) * 0.9)


# ---------- сетки ----------
GI = seg(0.0, L(1), 9)                                     # вступление: 3 такта
G1 = seg(L(1), L(5), 24)                                   # строфа 1: 8 тактов
G2 = seg(L(5), L(9), 24)                                   # строфа 2: 8 тактов
D3 = W("oko2") - L(9)
G3 = seg(L(9), W("oko2"), 21, b0=0.97 * D3 / 21)           # строфа 3: 7 тактов с лёгким расширением
bF = min(0.44, (TOTAL - FIN - 2.4) / 6)                     # финал: 2 такта и аккорд
if bF < 0.3:
    sys.exit("финал слишком короткий для двух тактов флейты")
GF = seg(FIN, FIN + 6 * bF, 6)
bpm = lambda G, b: 60 / G.blen(b)

# ---------- партитура ----------
# вступление: арфа прокатывает аккорд, флейта показывает мотив, тихая педаль
roll(0.04, [45, 52, 57, 61, 64, 69, 73, 76], vel=0.65)
INTRO_FL = "C#5/1 E5/.5 A5/.5 G#5/.5 F#5/.5 | F#5/1.5 E5/.5 D5/.5 F#5/.5 | E5/1 B4/.5 C#5/.5 D5/.5 B4/.5"
flute_part(GI, 0, INTRO_FL + " | C#5/1", vel=0.9, last=0.9, seed=1)
pads(GI, 0, "A D/A E7", [0.55, 0.6, 0.65], lo=57, size=3, seed=10)
put("bs", GI.t(0), damp(bass(45), GI.t(6) - GI.t(0), 0.3) * 0.7)
waltz(GI, 6, "E7", "full", vel=0.7)
arp(GI, 3, "D/A", n=6, step=0.5, lo=62, vel=0.35, pan=0.35)
mark("intro_start", 0.0)

# строфа 1: вальс гитары, арфа «волнами»
S1_CH = "A A D A F#m D E E7"
S1_HP = ("A4/1 C#5/.5 E5/.5 A5/1 | G#5/.5 A5/.5 E5/1 C#5/1 | D5/.5 F#5/.5 A5/1 F#5/1 | E5/1.5 C#5/.5 A4/1 |"
         "F#5/.5 A5/.5 C#6/1 A5/1 | B5/.5 A5/.5 F#5/1 D5/1 | E5/.5 G#5/.5 B5/1 G#5/1 |"
         "D6/.5 B5/.5 G#5/.5 E5/.5 D5/.5 B4/.5")
waltz(G1, 0, S1_CH, "full", vel=1.0)
play_pluck(G1, 0, S1_HP, harp, "hp", vel=0.62, pan=0.32, beats=24)
pads(G1, 0, S1_CH, [0.32, 0.3, 0.32, 0.3, 0.34, 0.32, 0.36, 0.5], lo=57, size=3, seed=20)
mark("stanza1", G1.t(0))
mark("run_to_stanza2", G1.t(21))

# строфа 2: прозрачнее — бас и один аккорд, высокие колокольчики месяца, тихая педаль
S2_CH = "F#m D Bm E C#m F#m D E7"
S2_BL = ("r/1 C#7/1 A6/1 | r/1 F#6/1 A6/1 | r/1 D7/.5 C#7/.5 B6/1 | r/1 G#6/1 B6/1 | r/1 E7/1 C#7/1 |"
         "r/1 A6/1 C#7/1 | r/1 A6/1 D7/1 | B6/.5 D7/.5 E7/2")
waltz(G2, 0, S2_CH, "thin", vel=0.85)
play_pluck(G2, 0, S2_BL, bell, "bel", vel=0.8, pan=0.38, beats=24)
pads(G2, 0, S2_CH, [0.42, 0.42, 0.44, 0.44, 0.44, 0.46, 0.7, 0.55], lo=64, size=3, bright=0.75, seed=30)
t_r = W("raskin")
roll(t_r, [38, 45, 50, 54, 57, 62, 66, 69, 74, 78], step=0.034, vel=0.45)     # «раскинул» — широкий раскат арфы
pad(t_r - 0.1, G2.t(21) + 0.2, "D", 0.5, lo=50, size=3, att=0.5, bright=0.8, seed=35)
arp(G2, 21, "E7", n=6, step=0.5, lo=52, vel=0.5, pan=0.3, cresc=0.4)
mark("stanza2", G2.t(0))
mark("raskin_roll", t_r)
mark("rise_to_stanza3", G2.t(21))

# строфа 3: торжественный подъём, на «смежает небо» — затишье, на «око» — широкий аккорд
S3_CH = "A E/G# F#m D Bm Bm7/E E7"
waltz(G3, 0, "A E/G# F#m D Bm", "full", vel=1.0)
for i, sym in enumerate(["A", "E", "F#m", "D", "Bm"]):
    arp(G3, 3 * i, sym, n=6, step=0.5, lo=57 + (2 if i >= 2 else 0), vel=0.28 + 0.03 * i, pan=0.3)
S3_VN = "E5/2 C#5/1 | B4/2 E5/1 | A5/2 F#5/1 | F#5/2 A5/1 | B5/3 | B5/2 A5/1 | G#5/3"
play_bowed(G3, 0, S3_VN, "vn", vel=0.75, pan=0.18, beats=21, att=0.14, rel=0.35, voices=(-4, 0, 5), bright=1.3,
           vib=0.006)
pads(G3, 0, "A E/G# F#m D Bm", [0.42, 0.46, 0.5, 0.55, 0.5], lo=52, size=4, seed=40)
b6 = 15                                                    # такт 6 — «смежает небо»: одна педаль
pad(G3.t(b6), G3.t(b6 + 3) + 0.1, "Bm7/E", 0.36, lo=52, size=4, att=0.3, bright=0.7, seed=46)
put("bs", G3.t(b6), damp(bass(low(4)), 2.9 * G3.blen(b6), 0.2) * 0.55)
b7 = 18                                                    # такт 7 — «Огнедышащее»: нарастание
pad(G3.t(b7), G3.t(b7 + 3) + 0.05, "E7", 0.4, lo=52, size=4, att=0.25, bright=0.9, seed=47)
pad(G3.t(b7), G3.t(b7 + 3) + 0.05, "E7", 0.35, lo=64, size=3, att=0.9 * (G3.t(b7 + 3) - G3.t(b7)), bright=1.2,
    seed=48)
put("bs", G3.t(b7), damp(bass(40), 2.9 * G3.blen(b7), 0.15) * 0.8)
GL = [52, 56, 59, 62, 64, 68, 71, 74, 76, 80, 83, 86]       # глиссандо арфы вверх по E7
for k, m in enumerate(GL):
    put("hp", G3.t(b7 + 0.5 + k * 2.5 / len(GL)), harp(m) * (0.42 + 0.22 * k / len(GL)), 0.0 + 0.05 * k)
T_OKO = W("oko2")
roll(T_OKO, [33, 40, 45, 49, 52, 57, 61, 64, 69, 73, 76, 81], step=0.022, vel=0.55)
strum(T_OKO + 0.01, [45, 52, 57, 61, 64, 69], 0.55, spread=0.018)
put("bs", T_OKO, bass(33) * 0.9)
put("bel", T_OKO + 0.03, bell(93) * 0.55, 0.3)
put("bel", T_OKO + 0.09, bell(100) * 0.35, 0.45)
t_hold = FIN + 0.5                                         # аккорд «око» держится до финала
for k, m in enumerate([45, 52, 57, 61, 64, 69, 73]):
    put("str", T_OKO, bowed(m, t_hold - T_OKO, att=0.18, rel=0.8, bright=1.15, seed=500 + m) * 0.5,
        -0.5 + k / 6)
put("vn", T_OKO, bowed(81, t_hold - T_OKO, att=0.1, rel=0.8, voices=(-4, 0, 5), bright=1.3, vib=0.006, seed=7) * 0.75,
    0.18)
roll(T_OKO + 0.55 * (FIN - T_OKO), [57, 61, 64, 69, 73, 76], step=0.06, vel=0.32)   # отзвук арфы в паузе до финала
mark("stanza3", G3.t(0))
mark("hush_smezh", G3.t(b6))
mark("crescendo_ognedysh", G3.t(b7))
mark("oko_chord", T_OKO)

# финал: флейта повторяет мотив, последний аккорд
FIN_FL = "C#5/1 E5/.5 A5/.5 G#5/.5 F#5/.5 | E5/1 F#5/.5 D5/.5 B4/.5 G#5/.5 | A5/1"
t_last = GF.t(6)
flute_part(GF, 0, FIN_FL, vel=0.95, last=TOTAL - t_last - 0.5, seed=2)
waltz(GF, 0, "A E7", "full", vel=0.8)
arp(GF, 0, "A", n=6, step=0.5, lo=64, vel=0.32, pan=0.35)
arp(GF, 3, "E7", n=6, step=0.5, lo=62, vel=0.32, pan=0.35)
pads(GF, 0, "A E7", [0.5, 0.55], lo=57, size=3, seed=60)
roll(t_last, [33, 45, 52, 57, 61, 64, 69, 73, 76], step=0.03, vel=0.6)
put("bs", t_last, bass(33) * 0.8)
pad(t_last, TOTAL, "A", 0.55, lo=45, size=5, att=0.3, rel=0.4, seed=70)
put("bel", t_last + 0.25, bell(93) * 0.45, 0.35)
mark("fin_reprise", GF.t(0))
mark("fin_chord", t_last)


# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=7000, pre=0.018):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60) * np.minimum(1, t / 0.008)
    ir = eq(ir, biquad("lp", lp, 0.6), biquad("hp", 180, 0.6))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = p2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


BUS["gtr"] = eq(BUS["gtr"], biquad("peak", 115, 1.0, 3.0), biquad("peak", 240, 1.2, 2.0), biquad("lp", 5000, 0.6),
                biquad("hp", 80, 0.7))
BUS["bs"] = eq(BUS["bs"], biquad("lp", 1500, 0.6), biquad("hp", 34, 0.7))
BUS["hp"] = eq(BUS["hp"], biquad("lp", 8500, 0.6), biquad("hp", 50, 0.7))
BUS["str"] = eq(BUS["str"], biquad("lp", 4200, 0.6), biquad("hp", 140, 0.7))
BUS["vn"] = eq(BUS["vn"], biquad("lp", 6000, 0.6), biquad("peak", 3000, 1.0, -2.0), biquad("hp", 240, 0.7))
BUS["fl"] = eq(BUS["fl"], biquad("hp", 220, 0.7), biquad("lp", 9000, 0.7))
BUS["bel"] = eq(BUS["bel"], biquad("hp", 900, 0.7))
IR_M = [make_ir(2.2, 3.0, 21), make_ir(2.2, 3.0, 22)]
WET = 0.30
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0] + BUS[k][1]) for k in BUSES)
music = sum(BUS[k] * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
music = eq(music, biquad("hp", 32, 0.7))

# ---------- голос и активность речи ----------
rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, "voice.mp3"), "-f", "f32le", "-ac", "1",
                       "-ar", str(SR), "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
i_v0 = int(round(V0 * SR))
vfull = np.zeros(N)
nv = min(len(voice), N - i_v0)
vfull[i_v0:i_v0 + nv] = voice[:nv]
SPEECH = [(L(i), E(i)) for i in range(1, NL + 1)]
tN = np.arange(N) / SR
ACT = np.zeros(N)                         # 1 — идёт строка (с запасом и плавными краями)
for a_, b_ in SPEECH:
    ACT = np.maximum(ACT, np.clip(np.minimum((tN - (a_ - 0.18)) / 0.1, ((b_ + 0.15) - tN) / 0.1), 0, 1))


def ms(chs, wins):
    """средняя мощность (сумма каналов) в окнах"""
    s = c = 0
    for a_, b_ in wins:
        i0, i1 = max(0, int(a_ * SR)), min(N, int(b_ * SR))
        if i1 > i0:
            s += sum(float(np.sum(x[i0:i1] ** 2)) for x in chs)
            c += i1 - i0
    return s / max(1, c)


VCH = [vfull, vfull]                      # в ролике голос моно идёт в оба канала
vMS = ms(VCH, SPEECH)
kv = kweight(vfull)
vKMS = ms([kv, kv], SPEECH)

dip = eq(music, biquad("peak", 2500, 0.8, DIP_DB))   # провал около 2,5 кГц под голосом — речи просторнее
music = music + ACT * (dip - music)

# ---------- шумы ----------
SFX = np.zeros((2, N))
SFX_SEND = np.zeros(N)
SFX_LOG = []
KW = 0.1


def s_rustle(dur, seed=5):
    """камера несётся сквозь колосья: колосья хлещут то слева, то справа, под ними — поток воздуха"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    eL, eR = np.full(n, 0.18), np.full(n, 0.18)
    tk = 0.12
    while tk < dur - 0.25:
        p = g.uniform(-1, 1)
        gl, gr = pan_gains(p)
        a = g.uniform(0.5, 1.0)
        b = bump(t, tk, 0.035, g.uniform(0.07, 0.14)) * (t > tk - 0.04)
        eL += a * gl * b
        eR += a * gr * b
        tk += g.uniform(0.09, 0.2)
    whole = np.clip(t / 0.3, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - 0.6)) / 0.6, 0, 1)) ** 2
    rush = bandn(n, 250, 1400, g) * (0.35 + 0.15 * slow(n, 3, g))
    x = np.stack([(bandn(n, 2200, 9500, g) * eL + 0.6 * bandn(n, 900, 3000, g) * eL + rush) * whole,
                  (bandn(n, 2200, 9500, g) * eR + 0.6 * bandn(n, 900, 3000, g) * eR + rush) * whole])
    return x


def s_gust(seed=6):
    """порыв ветра: полоса едет вверх и вниз, свист верхних частот, слева направо"""
    g = np.random.default_rng(seed)
    dur, tp = 1.9, 0.32
    n = int(dur * SR)
    t = tt(n)
    sh = bump(t, tp, tp, 0.55)
    nz = g.standard_normal(n)
    body = tvf(nz, band_sweep(lambda tc: 280 + 900 * bump(tc, tp, tp, 0.5), 0.85))
    whis = tvf(g.standard_normal(n), band_sweep(lambda tc: 1100 + 1500 * bump(tc, tp + 0.05, tp, 0.45), 0.12))
    y = (body / np.std(body) + 0.18 * whis / np.std(whis)) * sh * (1 + 0.2 * slow(n, 9, g))
    return pan_curve(y, np.linspace(-0.55, 0.6, n))


def s_waves(dur, peaks, seed=7):
    """золотые волны ржи: волна шороха прокатывается по полю (слева направо), под ней мягкий ветер"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    env = np.full(n, 0.12)
    pan = np.zeros(n)
    for k, tp in enumerate(peaks):
        b = bump(t, tp, 0.32, 0.5)
        env += b
        pan += b * (-0.5 + 0.9 * np.clip((t - tp + 0.32) / 0.9, 0, 1))
    pan = np.clip(pan / np.maximum(env - 0.12, 1e-3), -0.7, 0.7)
    env *= np.clip(t / 0.15, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - 0.4)) / 0.4, 0, 1)) ** 2
    y = (bandn(n, 1800, 8500, g) + 0.5 * bandn(n, 250, 900, g) * (1 + 0.3 * slow(n, 4, g))) * env
    return pan_curve(y, pan)


def s_ding():
    """«динь» месяца: тонкий стеклянный тон с мерцанием"""
    n = int(2.4 * SR)
    t = tt(n)
    f = hz(93)
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.95) + 0.55 * np.sin(2 * np.pi * f * 1.0026 * t + 1.0)
         * np.exp(-t / 1.15) + 0.12 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / 0.3)
         + 0.04 * np.sin(2 * np.pi * 4.17 * f * t) * np.exp(-t / 0.07))
    k = int(0.003 * SR)
    y[:k] *= np.linspace(0, 1, k)
    return fade_tail(y, 0.2)


def s_flash(seed=8):
    """мягкий гул-вспышка: низкий ля-аккорд вздувается, шумовая вспышка раскрывается, сверху — искры"""
    g = np.random.default_rng(seed)
    dur, tp = 2.8, 0.3
    n = int(dur * SR)
    t = tt(n)
    env = bump(t, tp, tp, 0.85)
    low_ = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.41 * t + 0.5)
            + 0.45 * np.sin(2 * np.pi * 110 * t + 1.3)) * env
    wh = tvf(g.standard_normal(n), band_sweep(lambda tc: 160 + 1600 * bump(tc, tp, tp, 0.3), 1.1))
    wh = wh / np.std(wh) * bump(t, tp, tp, 0.4)
    spark = bump(t, tp + 0.08, tp, 0.6)
    x = np.stack([0.5 * low_ + 0.35 * wh + 0.12 * bandn(n, 5000, 11000, g) * spark,
                  0.5 * low_ + 0.35 * wh + 0.12 * bandn(n, 5000, 11000, g) * spark])
    return fade_tail(x, 0.3)


def k_loud(x):
    """самое громкое окно 100 мс (сумма каналов, K-взвешенно) и его кривая"""
    kx = np.stack([kweight(c) for c in x])
    p = (kx ** 2).sum(0)
    w = int(KW * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    return (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])


def audible(x, st):
    env = np.abs(stereo(x)).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    return st + act[0] / SR, st + act[-1] / SR


def place(name, what, t_ev, start, x, peaks=None, t_end=None, send=0.08):
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    mov = k_loud(x)
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(float(mov.max()), 1e-20))
    x *= g
    mov = mov * g * g
    j0, j1 = max(0, -i0), min(n_, N - i0)
    SFX[:, i0 + j0:i0 + j1] += x[:, j0:j1]
    SFX_SEND[i0 + j0:i0 + j1] += 0.5 * (x[0, j0:j1] + x[1, j0:j1]) * send
    a_, b_ = audible(x, start)
    w = int(KW * SR)
    cen = start + (np.arange(len(mov)) + w / 2) / SR
    inl = np.zeros(len(mov), bool)
    for la, lb in SPEECH:
        inl |= (cen >= la) & (cen <= lb)
    rec = {"name": name, "what": what, "t": r3(t_ev), "start": r3(max(0.0, a_)), "end": r3(min(TOTAL, b_))}
    if peaks is not None:
        if len(peaks) == 1:
            rec["peak"] = r3(peaks[0])
        else:
            rec["hits"] = len(peaks)
            rec["peaks"] = [r3(p) for p in peaks]
    if t_end is not None:
        rec["t_end"] = r3(t_end)
    rec["db"] = SFX_DB[name]
    if name in BED:
        rec["bed"] = True
    rec["db_lines"] = round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None
    rec["t_loudest"] = r3(cen[int(np.argmax(mov))])
    SFX_LOG.append(rec)


def hit(name, what, t_ev, x, send=0.08, peak_win=0.6):
    """разовый звук: его пик — на кадр позже события"""
    x = stereo(x)
    envp = np.convolve(np.abs(x).sum(0), np.ones(220) / 220, "same")
    pk = int(np.argmax(envp[:int(peak_win * SR)]))
    place(name, what, t_ev, t_ev + FRAME - pk / SR, x, peaks=[t_ev + FRAME], send=send)


# заставка: камера несётся сквозь колосья (время титра в ролике от начала, до начала голоса)
t_r1 = V0 - 0.05
place("rye_rustle", "камера несётся сквозь колосья на пролёте титра", 0.0, FRAME,
      s_rustle(t_r1 - FRAME), t_end=t_r1, send=0.05)
hit("wind_gust", "порыв ветра — светлый вихрь мазков обгоняет мальчика («Гонит ветер»)", W("gonit"), s_gust(),
    send=0.12)
t_w0 = W("zolot") + FRAME - 0.32
pk_w = [W("zolot") + FRAME, W("perel") + FRAME]
t_w1 = W("perel") + 1.2
place("rye_waves", "золотые волны катятся по ржи («Золотые переливы»)", W("zolot"), t_w0,
      s_waves(t_w1 - t_w0, [p - t_w0 for p in pk_w]), peaks=pk_w, t_end=W("perel") + 0.6, send=0.1)
hit("moon_ding", "месяц робко выглядывает из-за облака («Робко месяц»)", W("robko"), s_ding(), send=0.35,
    peak_win=0.1)
hit("eye_flash", "огнедышащее око открывается на востоке — вспышка («око»)", T_OKO, s_flash(), send=0.15)

IR_S = [make_ir(1.4, 2.0, 31, lp=6500), make_ir(1.4, 2.0, 32, lp=6500)]
for ch in (0, 1):
    SFX[ch] += 0.35 * convolve(SFX_SEND, IR_S[ch])

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
SCH = [SFX[0], SFX[1]]


def line_gain(i, w):
    pv, pm, ps = ms(VCH, [w]), ms(MCH, [w]), ms(SCH, [w])
    tgt = pv * db(LINE_DB[i]) ** 2                      # музыка + шумы
    lo, hi = pv * db(MUS_LIM[0]) ** 2, pv * db(MUS_LIM[1]) ** 2
    pm_t = float(np.clip(tgt - ps, lo, hi))
    return np.sqrt(pm_t / max(pm, 1e-20))


LINE_PARTS = []                 # [(начало, конец, усиление)] по строкам; строка делится на части по SPLIT
for i, (a_, b_) in enumerate(SPEECH, 1):
    cuts = [a_] + [W(k) for k in SPLIT.get(i, []) if a_ + 0.4 < W(k) < b_ - 0.25] + [b_]
    LINE_PARTS.append([(c0, c1, line_gain(i, (c0, c1))) for c0, c1 in zip(cuts, cuts[1:])])
lineG = [p[0][2] for p in LINE_PARTS]
lineGe = [p[-1][2] for p in LINE_PARTS]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(0.4, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.25, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 2.0, TOTAL - FADE_OUT))]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0.0)] + [(FADE_IN * u, gI * np.sin(u * np.pi / 2) ** 2) for u in np.linspace(0.1, 1, 8)]
shape += [(L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    for k, (c0, c1, g) in enumerate(LINE_PARTS[i - 1]):
        if k > 0:
            shape.append((c0 + 0.02, g))
        elif i > 1:
            shape.append((c0, g))
        shape.append((c1 - (0.06 if c1 < E(i) else 0), g))
    g = lineGe[i - 1]
    if i < NL:
        gap = L(i + 1) - E(i)
        tgt, cap = (GAP_DB, 9.0) if i in STANZA_END else ((PAUSE_DB, 6.0) if gap >= 0.7 else (None, 0))
        if tgt is not None and gap > 0.45:
            r = min(0.22, gap / 3)
            gn = max(g, lineG[i])
            gl = float(np.clip(gFor([(E(i) + r, L(i + 1) - r)], tgt), gn, gn * db(cap)))
            shape += [(E(i) + r, gl), (L(i + 1) - r, gl)]
            LIFTS.append((i, E(i) + r, L(i + 1) - r))
shape += [(E(NL) + 0.25, gT), (FIN - 0.05, gT), (FIN + 0.02, gF)]
for u in np.linspace(0, 1, 13):
    shape.append((TOTAL - FADE_OUT * (1 - u), gF * np.cos(u * np.pi / 2) ** 2))
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f} с")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve
SFX[:, N - int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))


# ---------- мягкий ограничитель пиков (только если нужно) ----------
def limiter(x, ceil=0.89, look=0.004, hold=0.08):
    pk = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    if g.min() >= 1.0:
        return x, 1.0
    a, h = int(look * SR), int(hold * SR)
    m = g.copy()
    span = 1
    while span < a + h:
        sh = min(span, a + h - span)
        m[:-sh] = np.minimum(m[:-sh], m[sh:])
        span += sh
    m = np.concatenate([np.ones(h), m])[:len(g)]
    c = np.cumsum(np.concatenate([[1.0] * a, m]))
    sm = np.minimum(((c[a:] - c[:-a]) / a)[:len(g)], 1.0)
    return x * sm, float(sm.min())


out = shaped + SFX
out, lim = limiter(out)
fi, fo = int(0.01 * SR), int(0.05 * SR)
out[:, :fi] *= np.linspace(0, 1, fi)
out[:, N - fo:] *= np.linspace(1, 0, fo)

# ---------- запись ----------
dith = (rng.random((2, N)) - rng.random((2, N)))
pcm = np.clip(np.round(out * 32767 + dith), -32768, 32767).astype("<i2")
pcm[out == 0] = 0
with wave.open(args.out, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.T.tobytes())

# ---------- отчёт и sfx.json ----------
f1 = lambda x: round(float(x), 1)
SH = [shaped[0] * lim, shaped[1] * lim]
ALL = [out[0], out[1]]
rel = lambda chs, w: f1(dB(ms(chs, w)) - dB(vMS))
lrel = lambda chs, i: f1(dB(ms(chs, [SPEECH[i - 1]])) - dB(ms(VCH, [SPEECH[i - 1]])))
per_line = {str(i): lrel(SH, i) for i in range(1, NL + 1)}
per_line_all = {str(i): lrel(ALL, i) for i in range(1, NL + 1)}
levels = {
    "note": "RMS, дБ к голосу; lines — музыка без шумов к голосу той же строки, lines_all — музыка с шумами, "
            "остальное — музыка к среднему голосу в местах речи",
    "lines": per_line,
    "lines_all": per_line_all,
    "under_voice": rel(SH, SPEECH),
    "under_voice_all": rel(ALL, SPEECH),
    "intro": rel(SH, W_INTRO),
    "gaps": {f"{i}|{i + 1}": rel(SH, [(a_, b_)]) for i, a_, b_ in LIFTS},
    "tail": rel(SH, W_TAIL),
    "final": rel(SH, W_FIN),
}
with open(os.path.join(os.path.dirname(os.path.abspath(args.out)), "sfx.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "секунды ролика. t — событие в кадре (t_end — конец долгого действия); peak/peaks — пик звука (на кадр "
                "позже события); start/end — где звук слышен; db — громкость шума к среднему голосу (самое громкое "
                "окно 100 мс, K-взвешенно, BS.1770), db_lines — то же, но самое громкое окно на строке (null — на "
                "строки не попадает); bed — долгий шум-подложка. music — ключевые моменты музыки, levels — уровни.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN,
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп ♩: вступление {bpm(GI, 0):.0f}, строфа 1 {bpm(G1, 0):.0f}, строфа 2 {bpm(G2, 0):.0f}, строфа 3 "
      f"{bpm(G3, 0):.0f}→{bpm(G3, 20):.0f}, финал {bpm(GF, 0):.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in per_line))
print(f"заставка {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступление": [(0.3, L(1))], "строфа 1": [(L(1), L(5))], "строфа 2": [(L(5), L(9))],
       "строфа 3": [(L(9), FIN)], "финал": W_FIN}
KB = {k: kweight(BUS[k]) for k in BUSES}
print("баланс шин (сухо, с BUS_G, K-взвешенно, дБ до формы громкости):")
for nm, wins in SEC.items():
    print(f"  {nm}: " + ", ".join(f"{k} {f1(dB(ms([KB[k][0], KB[k][1]], wins)) + 20 * np.log10(BUS_G[k]))}"
                                  for k in BUSES))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS, ограничитель {lim:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы (db — цель, db_lines — самое громкое окно на строке):")
for r in SFX_LOG:
    pk = r.get("peak", (r.get("peaks") or [r["start"]])[0])
    print(f"  {r['name']:11s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:4d}  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
