#!/usr/bin/env python3
"""Музыка и шумы к стиху А. А. Фета «Мама! глянь-ка из окошка…», стиль «мел на школьной доске».

Своя зимняя детская полька на 2/4: соль мажор в строфах 1–2, ля мажор в строфе 3 и в финале. Мелодии и гармония свои,
ни на какую известную (новогоднюю) песню не опираются.
Инструменты — синтез (numpy):
  музыкальная шкатулка — вступление, тема строфы 1, «вопрос» в начале второй половины строфы 3 (шина mel);
  челеста — тема строфы 2, разгон строфы 3, пробежки, искорки на «посветлело, побелело», финал (шина mel);
  колокольчики (глокеншпиль) — блёстки во вступлении, тихий отголосок темы октавой выше, финальный звон (шина gl);
  пиццикато струнных — альты и скрипки «па» на слабые доли (шина pz); контрабас пиццикато — бас «ум» (шина bs);
  бубенцы — восьмые в строфе 3 (салазки) и в финале (шина bel);
  тихие высокие струнные — светлое «облако» в строфе 2 (иней) и финальный аккорд (шина pad).
План (секунды ролика берутся из events.json):
  0 … L1      вступление, 4 такта: колокольчики рассыпаются за мелом, шкатулка показывает мотив, бас вступает в такте 3;
  строфа 1    16 тактов, ~137 ♩: шкатулка ведёт тему, полька «ум-па»; на «посветлело», «побелело» — искорки челесты;
              в паузе перед строфой 2 челеста взбегает вверх;
  строфа 2    16 тактов: тема у челесты, колокольчики отголоском, тихие струнные; бодрые «шлепки» в такт ваты;
              в паузе — E7, поворот в ля мажор;
  строфа 3    «Уж теперь…» — 6 тактов с ускорением (~140 → ~160 ♩), бас восьмыми, бубенцы, пробежка к «бежать!»,
              удар-аккорд в такте из одной доли; «Правда, мама?» — легче (шкатулка), затем снова разгон к финалу;
  fin … конец звонкий ля-мажорный аккорд (челеста, колокольчики, струнные, бубенцы) и тихий хвост шкатулки.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке; цель LINE_DB — для музыки вместе с
шумами, при этом музыка одна держится в −18,2…−20 дБ), громче на заставке, в паузах между строфами и в финале;
под голосом у музыки ещё мягкий провал −3 дБ около 2,5 кГц (место для речи).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список и уровни — sfx.json).

Запуск: python3 make_music.py [--intro 3.4] [--outro 5.6] [--out music.wav]
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
LINE_DB = {i: -19.0 for i in range(1, 19)}     # музыка + шумы, RMS, дБ к голосу той же строки
LINE_DB |= {14: -18.8, 15: -18.8}              # разгон к «бежать!» — чуть ярче
MUS_LIM = (-20.0, -18.2)                       # музыка одна на строке не выходит из этих пределов
INTRO_DB = -8.0      # заставка, к среднему голосу
GAP_DB = -12.0       # паузы между строфами, к среднему голосу (но не тише соседних строк и не выше их на 9 дБ)
PAUSE_DB = -16.0     # долгая пауза внутри строфы (от 0,7 с), к среднему голосу (не выше строк на 6 дБ)
TAIL_DB = -8.0       # после голоса до fin, к среднему голосу
FIN_DB = -6.0        # финальный аккорд
FADE_OUT = 2.0       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {
    "chalk_title": -17, "thought_pop": -19, "window_whoosh": -17, "white_wave": -23, "mercury_drop": -19,
    "frost_bells": -19, "cotton_puff": -20, "sled_ride": -21, "sponge_wipe": -19, "joy_chord": -18,
    "door": -14, "chalk_fin": -17,
}
BED = {"white_wave", "sled_ride", "sponge_wipe"}   # долгие шумы — для check_mix.py часть подложки

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Мама! глянь-ка из окошка…» Фета")
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
if NL != 18:
    sys.exit(f"ожидалось 18 строк, в events.json {NL}")
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
if FIN > TOTAL - 2.5:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
STANZA_END = (6, 12)
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1820)
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


def pan_curve(x, p0, p1):
    """моно → стерео, панорама едет от p0 к p1"""
    gl, gr = pan_gains(np.linspace(p0, p1, len(x)))
    return np.stack([x * gl, x * gr])


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def fade_tail(x, sec=0.01):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


def held(x, d, rel=0.06):
    """нота глушится через d с и гаснет за rel"""
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


_BANK = {}


def bandn(n, lo, hi):
    """шум в полосе lo…hi Гц, RMS 1 (короткие куски — из банка)"""
    n = int(n)
    if n < int(3.5 * SR):
        key = (int(lo), int(hi))
        if key not in _BANK:
            y = eq(rng.standard_normal(4 * SR), biquad("hp", lo, 0.7), biquad("lp", hi, 0.7), power=2)
            _BANK[key] = y / np.sqrt(np.mean(y ** 2))
        s = int(rng.integers(0, 4 * SR - n - 1))
        return _BANK[key][s:s + n].copy()
    y = eq(rng.standard_normal(n), biquad("hp", lo, 0.7), biquad("lp", hi, 0.7), power=2)
    return y / np.sqrt(np.mean(y ** 2))


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


# ---------- инструменты (ноты кэшируются: одинаковая высота звучит одинаково, как у живого инструмента) ----------
_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


def strike(f, spec, dur, click=0.0, cband=(2500, 9000), att=0.0015, seed=0):
    """ударный/щипковый тон: spec — (отношение частот, амплитуда, время затухания)"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    y = np.zeros(n)
    for r, a, tau in spec:
        fk = f * r
        if fk > 15000:
            continue
        y += a * np.sin(2 * np.pi * fk * t + g.uniform(0, 2 * np.pi)) * np.exp(-t / tau)
    if click:
        nc = int(0.015 * SR)
        y[:nc] += click * bandn(nc, *cband) * np.exp(-tt(nc) / 0.0025)
    k = max(2, int(att * SR))
    y[:k] *= np.linspace(0, 1, k)
    return fade_tail(y, 0.05)


def celesta(m):
    def mk():
        f = hz(m)
        tau = float(np.clip(1.25 * (523.25 / f) ** 0.6, 0.35, 2.4))
        spec = [(1, 1.0, tau), (1.0021, 0.16, tau * 0.9), (2.0, 0.14, tau * 0.32), (3.0, 0.045, tau * 0.16),
                (4.12, 0.07, tau * 0.07)]
        return strike(f, spec, min(3.0, tau * 4), click=0.05, seed=int(m) * 7 + 1)
    return cached(("ce", m), mk)


def musicbox(m):
    def mk():
        g = np.random.default_rng(int(m) * 13 + 5)
        f = hz(m) * 2 ** (g.uniform(-5, 5) / 1200)     # шкатулка чуть «наивно» настроена
        tau = float(np.clip(0.95 * (1046.5 / f) ** 0.5, 0.35, 1.6))
        spec = [(1, 1.0, tau), (2.0, 0.05, tau * 0.4), (6.27, 0.22, 0.07), (17.55, 0.06, 0.02)]
        return strike(f, spec, min(2.4, tau * 4), click=0.12, cband=(3000, 11000), seed=int(m) * 13 + 6)
    return cached(("mb", m), mk)


def glock(m):
    def mk():
        f = hz(m)
        spec = [(1, 1.0, 1.3), (2.76, 0.26, 0.3), (5.40, 0.10, 0.1), (8.93, 0.04, 0.05)]
        return strike(f, spec, 2.8, click=0.07, cband=(4000, 12000), seed=int(m) * 11 + 3)
    return cached(("gl", m), mk)


PZ = {"cb": (0.62, 0.22, 22), "vc": (0.45, 0.2, 22), "va": (0.30, 0.17, 18), "vn": (0.24, 0.15, 16)}


def pizz(m, kind):
    def mk():
        tau0, pos, K = PZ[kind]
        f = hz(m)
        n = int(min(1.8, tau0 * 5.5) * SR)
        t = tt(n)
        ph = 2 * np.pi * np.cumsum(f * (1 + 0.006 * np.exp(-t / 0.025))) / SR   # щипок чуть «подтягивает» тон
        y = np.zeros(n)
        for k in range(1, K + 1):
            if f * k > 7000:
                break
            y += abs(np.sin(np.pi * k * pos)) / k ** 0.9 * np.sin(k * ph) * np.exp(-t / (tau0 / (1 + 0.45 * (k - 1))))
        nt = int(0.02 * SR)
        y[:nt] += 0.12 * bandn(nt, 80, 700) * np.exp(-tt(nt) / 0.005)
        y[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
        return fade_tail(y / np.max(np.abs(y)), 0.03)
    return cached(("pz", kind, m), mk)


def jingle(g):
    """одна бубенцовая «звёздочка»"""
    n = int(0.22 * SR)
    t = tt(n)
    y = np.zeros(n)
    for lo, hi in ((3700, 4500), (5100, 6100), (6900, 8100), (9200, 10600)):
        y += g.uniform(0.4, 1) * np.sin(2 * np.pi * g.uniform(lo, hi) * t + g.uniform(0, 6.3)) \
            * np.exp(-t / g.uniform(0.035, 0.09))
    y += 0.35 * bandn(n, 5000, 12000) * np.exp(-t / 0.008)
    y[:40] *= np.linspace(0, 1, 40)
    return y


def shake_bank(k=10):
    g = np.random.default_rng(77)
    out = []
    for _ in range(k):
        n = int(0.3 * SR)
        y = np.zeros(n)
        for j in range(9):
            o = int(abs(g.normal(0.012, 0.012)) * SR) if j < 7 else int(g.uniform(0.05, 0.09) * SR)
            jj = jingle(g) * (1.0 if j < 7 else 0.4)
            y[o:o + len(jj)] += jj[:n - o]
        out.append(fade_tail(y / np.max(np.abs(y)), 0.04))
    return out


SHAKES = shake_bank()


def pad(notes, dur, att=0.25, rel=0.6, bright=1.3, seed=0):
    """тихие струнные: аддитивная «пила» из трёх слегка расстроенных голосов, стерео"""
    g = np.random.default_rng(seed)
    n = int((dur + rel * 2.5) * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for m in notes:
        for c, pn in ((-7, -0.6), (0, 0.0), (7, 0.6)):
            f = hz(m) * 2 ** (c / 1200)
            vib = 1 + 0.0028 * np.sin(2 * np.pi * g.uniform(4.8, 5.8) * t + g.uniform(0, 6.3))
            ph = 2 * np.pi * np.cumsum(f * vib) / SR + g.uniform(0, 6.3)
            y = np.zeros(n)
            for k in range(1, 40):
                if f * k > 4500:
                    break
                y += np.sin(k * ph) / k ** bright
            out += stereo(y, pn)
    env = np.minimum(1, t / att) * np.where(t > dur, np.exp(-(t - dur) / (rel / 2.3)), 1.0)
    out *= env
    return fade_tail(out / (len(notes) * 3), 0.05)


# ---------- шины ----------
BUSES = ["mel", "gl", "pz", "bs", "bel", "pad"]
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_G = {"mel": 1.0, "gl": 0.48, "pz": 0.85, "bs": 1.3, "bel": 1.2, "pad": 0.65}
BUS_SEND = {"mel": 0.30, "gl": 0.35, "pz": 0.15, "bs": 0.05, "bel": 0.25, "pad": 0.35}
INST = {"mb": musicbox, "ce": celesta, "gl": glock}
INST_BUS = {"mb": "mel", "ce": "mel", "gl": "gl"}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += x[:, j0:j1] * g


class Grid:
    """сетка долей: starts — начала долей (последний элемент — конец сетки)"""

    def __init__(self, starts):
        self.s = np.asarray(starts, float)

    def t(self, b):
        i = int(np.clip(np.floor(b), 0, len(self.s) - 2))
        return float(self.s[i] + (b - i) * (self.s[i + 1] - self.s[i]))

    def blen(self, b):
        i = int(np.clip(np.floor(b), 0, len(self.s) - 2))
        return float(self.s[i + 1] - self.s[i])

    @property
    def n(self):
        return len(self.s) - 1


def seg(t0, t1, n, b0=None):
    """n долей от t0 до t1: ровно или с линейно меняющейся длиной доли (начиная с b0)"""
    D = t1 - t0
    b = np.full(n, D / n) if b0 is None else np.linspace(b0, 2 * D / n - b0, n)
    return Grid(np.concatenate([[t0], t0 + np.cumsum(b)]))


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(s):
    acc = s.count("#") - s.count("b")
    return 12 * (int(s[-1]) + 1) + NOTE[s[0]] + acc


def parse(txt):
    """«D5/.5 G5/.25 r/.5 | A4+C#5/1 …» → [(доля, [midi], длина в долях)], всего долей"""
    out, b = [], 0.0
    for bar in txt.split("|"):
        for tok in bar.split():
            nm, d = tok.split("/")
            if nm != "r":
                out.append((b, [midi(x) for x in nm.split("+")], float(d)))
            b += float(d)
    return out, b


def play(G, b0, txt, inst, vel=1.0, pan=0.1, octave=0, damp=1.15, beats=None, accent=True):
    notes, total = parse(txt)
    if beats is not None and abs(total - beats) > 1e-6:
        sys.exit(f"мелодия: {total} долей вместо {beats}: {txt[:40]}…")
    for b, ms_, d in notes:
        t = G.t(b0 + b)
        dur = G.t(b0 + b + d) - t
        bb = b0 + b
        v = vel * ((1.0 if bb % 2 < 1e-6 else 0.86 if bb % 1 < 1e-6 else 0.76) if accent else 1.0)
        v *= 1 + rng.normal(0, 0.05)
        for m in ms_:
            x = INST[inst](m + octave)
            if inst == "ce" and damp:
                x = held(x, dur * damp + 0.05, 0.09)
            put(INST_BUS[inst], t + rng.normal(0, 0.003), x * v, pan)
    return total


QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10]}


def chord(sym):
    k = 2 if len(sym) > 1 and sym[1] in "#b" else 1
    root = NOTE[sym[0]] + (1 if sym[1:2] == "#" else -1 if sym[1:2] == "b" else 0)
    return root % 12, QUAL[sym[k:]]


def voicing(root, q, center=64, size=3):
    """близкое расположение аккорда вокруг center (у септаккорда — без квинты)"""
    pcs = [(root + i) % 12 for i in q]
    if len(pcs) == 4:
        pcs = [pcs[0], pcs[1], pcs[3]]
    best = None
    for base in range(center - 8, center + 5):
        notes = sorted(min((m for m in range(base, base + 12) if m % 12 == pc)) for pc in pcs)
        sc = abs(np.mean(notes) - center) + 0.3 * (notes[-1] - notes[0])
        if best is None or sc < best[0]:
            best = (sc, notes)
    return best[1][:size]


def bass_root(root, lo=38):
    return lo + (root - lo) % 12      # D2 … C#3


def p_bass(G, b, m, vel, hold=0.95):
    t = G.t(b)
    x = held(pizz(m, "cb"), G.blen(b) * hold, 0.06)
    put("bs", t + rng.normal(0, 0.003), x * vel * (1 + rng.normal(0, 0.05)), 0.0)


def p_chord(G, b, notes, vel, hold=0.45):
    t = G.t(b)
    for j, m in enumerate(notes):
        kind = "va" if j == 0 and m < 62 else "vn"
        x = held(pizz(m, kind), G.blen(b) * hold, 0.05)
        put("pz", t + 0.007 * j + rng.normal(0, 0.003), x * vel * (1 + rng.normal(0, 0.06)), -0.35 + 0.35 * j)


def p_bell(G, b, vel):
    x = SHAKES[int(rng.integers(0, len(SHAKES)))]
    put("bel", G.t(b) + rng.normal(0, 0.004), x * vel * (1 + rng.normal(0, 0.08)), 0.4)


def acc(G, b0, chords, style, vel=1.0, bells=0.0, center=64):
    """аккомпанемент по аккордам (по одному на такт 2/4, «Am,D» — по половине такта)"""
    for i, cs in enumerate(chords.split()):
        parts = cs.split(",")
        hl = 2 / len(parts)
        for j, sym in enumerate(parts):
            bb = b0 + 2 * i + j * hl
            root, q = chord(sym)
            br = bass_root(root)
            fifth = br + 7 if br + 7 <= 50 else br - 5
            vo = voicing(root, q, center)
            if style == "polka":
                p_bass(G, bb, br, vel)
                p_chord(G, bb + 0.5, vo, vel * 0.9)
                if hl == 2:
                    p_bass(G, bb + 1, fifth, vel * 0.8)
                    p_chord(G, bb + 1.5, vo, vel * 0.8)
            elif style == "light":
                p_bass(G, bb, br, vel, hold=1.6)
                if hl == 2:
                    p_chord(G, bb + 1, vo, vel * 0.8)
            elif style == "drive":
                pat = [br, br + 12, fifth, br + 12] if hl == 2 else [br, br + 12]
                for k, m in enumerate(pat):
                    p_bass(G, bb + 0.5 * k, m, vel * (1.0 if k == 0 else 0.72), hold=0.9)
                for k in range(int(hl)):
                    p_chord(G, bb + k + 0.5, vo, vel * 0.85, hold=0.4)
            if bells:
                for k in range(int(hl * 2)):
                    p_bell(G, bb + 0.5 * k, bells * (1.0 if k % 2 == 0 else 0.6))


def gliss(t0, notes, step, inst="ce", vel=0.5, pan=0.2):
    for k, m in enumerate(notes):
        put(INST_BUS[inst], t0 + k * step, INST[inst](m) * vel * (1 - 0.03 * k), pan)


# ---------- сетки ----------
L1 = L(1)
nb_i = max(2, int(L1 / 0.86 + 0.1))                      # тактов во вступлении (~0,43 с на долю)
GI = seg(max(0.0, L1 - 2 * nb_i * 0.43), L1, 2 * nb_i)
G1 = seg(L(1), L(7), 32)                                  # строфа 1: 16 тактов
G2 = seg(L(7), L(13), 32)                                 # строфа 2: 16 тактов
b3a = 0.43                                                # строфа 3a: 13 долей с ускорением
G3a = seg(L(13), L(16), 13, b0=b3a)
if G3a.blen(12) < 0.3:
    sys.exit("строфа 3: ускорение слишком сильное — проверь тайминги")
G3b = seg(L(16), FIN, 16)                                 # строфа 3b: 8 тактов до финального аккорда
bpm = lambda G, b: 60 / G.blen(b)

# ---------- партитура ----------
# вступление
INTRO_MEL = ["r/.5 D6/.5 G6/.5 F#6/.25 G6/.25", "A6/.5 B6/.5 G6/1", "E6/.5 G6/.5 C6/.5 E6/.5",
             "D6/.5 C6/.5 A5/.5 F#5/.5"]
INTRO_CH = ["G", "G", "C", "D7"]
im = INTRO_MEL[-nb_i:] if nb_i <= 4 else ["r/2"] * (nb_i - 4) + INTRO_MEL
ic = INTRO_CH[-nb_i:] if nb_i <= 4 else ["G"] * (nb_i - 4) + INTRO_CH
play(GI, 0, " | ".join(im), "mb", vel=0.95, pan=0.12, beats=2 * nb_i)
t_sp = max(0.06, GI.t(0) + 0.06)
gliss(t_sp, [79, 83, 86, 91, 95, 98], 0.055, "gl", vel=0.55, pan=-0.2)       # блёстки за мелом
gliss(GI.t(2 * nb_i - 4) + 0.02, [91, 95, 98], 0.06, "gl", vel=0.35, pan=0.25)
acc(GI, 2 * nb_i - 4, " ".join(ic[-2:]), "polka", vel=0.75)
mark("intro_start", GI.t(0))

# строфа 1 — шкатулка
S1_MEL = ("D5/.5 G5/.5 F#5/.25 G5/.25 A5/.5 | B5/.5 G5/.5 D5/1 | E5/.5 G5/.5 C6/.5 B5/.5 | A5/.5 F#5/.25 E5/.25 D5/1 |"
          "D5/.5 G5/.5 F#5/.25 G5/.25 A5/.5 | B5/.5 E6/.5 D6/.5 B5/.5 | C6/.5 A5/.5 F#5/.5 A5/.5 | G5/1 r/.5 D5/.5 |"
          "E5/.25 F#5/.25 G5/.5 E5/.5 C5/.5 | D5/.25 E5/.25 D5/.5 B4/.5 G4/.5 | A4/.5 C5/.5 E5/.5 A5/.5 |"
          "F#5/1 E5/.5 F#5/.5 | G5/.5 E5/.5 B5/.5 G5/.5 | C6/.5 G5/.5 E6/.5 C6/.5 | D6/1.5 r/.5 | r/2")
S1_CH = "G G C D G Em Am,D G C G Am D Em C D D7"
play(G1, 0, S1_MEL, "mb", vel=1.0, pan=0.12, beats=32)
play(G1, 30, "D5/.25 E5/.25 F#5/.25 G5/.25 A5/.25 B5/.25 C6/.25 D6/.25", "ce", vel=0.8, pan=0.15, beats=2)
acc(G1, 0, S1_CH, "polka")
for k in ("w_posvet", "w_pobel"):                                             # искорки на «посветлело, побелело»
    gliss(W(k) + 0.04, [79, 83, 86, 91], 0.05, "ce", vel=0.45, pan=-0.15)
mark("stanza1", G1.t(0))
mark("run_to_stanza2", G1.t(30))

# строфа 2 — челеста, колокольчики отголоском, «облако» струнных
S2_MEL = ("B5/1 A5/.5 G5/.5 | F#5/.5 D5/.5 F#5/.5 B5/.5 | C6/.5 G5/.5 E5/.5 G5/.5 | D5/1.5 r/.5 |"
          "C6/1 B5/.5 A5/.5 | F#5/.5 A5/.5 D6/.5 C6/.5 | B5/.5 G5/.5 D6/.5 B5/.5 | G5/.5 r/.5 D6/.25 B5/.25 G5/.25 D5/.25 |"
          "E5/.5 G5/.5 B5/.5 E6/.5 | D6/.5 C6/.5 G5/1 | E6/.5 r/.5 C6/.5 r/.5 | A5/.5 r/.5 F#5/.5 A5/.5 |"
          "B5/.5 r/.5 G5/.5 B5/.5 | C6/.5 E6/.5 D6/.5 C6/.5 | A5/.5 C6/.5 B5/.5 A5/.5 |"
          "E5/.25 G#5/.25 B5/.25 D6/.25 E6/.5 D6/.25 B5/.25")
S2_CH = "G Bm C G Am D G G Em C Am D G C Am,D E7"
play(G2, 0, S2_MEL, "ce", vel=1.0, pan=0.1, beats=32)
s2_bars = [b.strip() for b in S2_MEL.split("|")]
play(G2, 0, " | ".join(s2_bars[:8]), "gl", vel=0.55, pan=-0.3, octave=12, beats=16)
play(G2, 24, " | ".join(s2_bars[12:15]), "gl", vel=0.5, pan=-0.3, octave=12, beats=6)
acc(G2, 0, S2_CH, "polka", vel=0.95)
for i, cs in enumerate(S2_CH.split()):
    root, q = chord(cs.split(",")[0])
    put("pad", G2.t(2 * i), pad(voicing(root, q, 76), G2.blen(2 * i) * 2.05, att=0.3, rel=0.5, seed=200 + i), 0)
mark("stanza2", G2.t(0))

# строфа 3a — разгон к «бежать!»
S3A_MEL = ("C#6/.5 A5/.5 E5/.5 A5/.5 | C#6/.5 A5/.5 F#5/.5 A5/.5 | D6/.25 C#6/.25 B5/.25 A5/.25 F#5/.5 A5/.5 |"
           "B5/.5 G#5/.5 E5/.5 G#5/.5 | A5/.25 B5/.25 C#6/.25 D6/.25 E6/.25 D6/.25 C#6/.25 B5/.25 |"
           "G#5/.25 A5/.25 B5/.25 C#6/.25 D6/.25 E6/.25 F#6/.25 G#6/.25 | A6/.5 r/.5")
play(G3a, 0, S3A_MEL, "ce", vel=1.0, pan=0.1, beats=13)
s3a_bars = [b.strip() for b in S3A_MEL.split("|")]
play(G3a, 0, " | ".join(s3a_bars[:4]), "gl", vel=0.45, pan=-0.3, octave=12, beats=8)
acc(G3a, 0, "A F#m D E A E", "drive", vel=1.0, bells=0.8)
tb = G3a.t(12)                                         # удар «бежать!» — такт из одной доли
p_bass(G3a, 12, 45, 1.15, hold=1.2)
p_bass(G3a, 12, 33, 0.8, hold=1.2)
p_chord(G3a, 12, voicing(9, QUAL[""], 66), 1.1, hold=0.9)
put("gl", tb, glock(93) * 0.8, -0.2)
put("bel", tb, SHAKES[0] * 1.3, 0.4)
gliss(tb + 0.12, [93, 88, 85, 81, 76, 73, 69], 0.045, "ce", vel=0.45, pan=-0.2)   # стирается губкой — вниз
mark("stanza3_drive", G3a.t(0))
mark("bezh_hit", tb)

# строфа 3b — «Правда, мама?» легче, затем разгон к финалу
S3B_MEL = ("F#5/.5 A5/.5 D6/1 | E6/.5 D6/.25 C#6/.25 B5/1 | F#5/.5 A5/.5 D6/.5 F#6/.5 | E6/1 G#5/.5 B5/.5 |"
           "C#6/.5 A5/.5 F#5/.5 A5/.5 | D6/.5 F#6/.5 E6/.5 G#6/.5 | r/.5 E6/.5 C#6/.5 E6/.5 |"
           "E6/.25 D6/.25 C#6/.25 B5/.25 C#6/.25 D6/.25 E6/.25 G#6/.25")
s3b = [b.strip() for b in S3B_MEL.split("|")]
play(G3b, 0, " | ".join(s3b[:4]), "mb", vel=1.0, pan=0.12, beats=8)
play(G3b, 8, " | ".join(s3b[4:]), "ce", vel=1.0, pan=0.1, beats=8)
acc(G3b, 0, "D E D E", "light", vel=0.85)
acc(G3b, 8, "F#m D,E", "polka", vel=0.95, bells=0.45)
acc(G3b, 12, "A E7", "drive", vel=1.0, bells=0.8)
mark("stanza3_ask", G3b.t(0))
mark("run_to_fin", G3b.t(14))

# финал — звонкий аккорд и хвост
put("bs", FIN, held(pizz(33, "cb"), 1.6, 0.25) * 1.2, 0)
put("bs", FIN, held(pizz(45, "cb"), 1.6, 0.25) * 0.9, 0)
p_chord(Grid([FIN, FIN + 0.4]), 0, [57, 64, 69, 73], 1.1, hold=2.5)
gliss(FIN, [69, 73, 76, 81, 85, 88, 93], 0.035, "ce", vel=0.75, pan=0.1)
put("gl", FIN, glock(93) * 0.85, -0.25)
put("gl", FIN + 0.03, glock(88) * 0.6, 0.25)
put("bel", FIN, SHAKES[3] * 1.4, 0.4)
put("bel", FIN + 0.35, SHAKES[5] * 0.7, 0.4)
put("bel", FIN + 0.7, SHAKES[7] * 0.35, 0.4)
put("pad", FIN, pad([57, 64, 69, 73, 76], 1.9, att=0.06, rel=1.4, bright=1.2, seed=99), 0)
for k, (dt, m, v) in enumerate([(1.25, 88, 0.55), (1.55, 85, 0.5), (1.85, 81, 0.48), (2.5, 76, 0.4), (2.75, 81, 0.42)]):
    put("mel", FIN + dt, musicbox(m) * v, 0.15 - 0.08 * k)       # тихий хвост шкатулки
put("gl", FIN + 3.2, glock(93) * 0.3, 0.2)
mark("fin_chord", FIN)


# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=7000, pre=0.015):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60) * np.minimum(1, t / 0.006)
    ir = eq(ir, biquad("lp", lp, 0.6), biquad("hp", 200, 0.6))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = p2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


BUS["pz"] = eq(BUS["pz"], biquad("peak", 320, 0.9, 3.0), biquad("lp", 5200, 0.6), biquad("hp", 110, 0.7))
BUS["bs"] = eq(BUS["bs"], biquad("lp", 1800, 0.6), biquad("hp", 38, 0.7))
BUS["pad"] = eq(BUS["pad"], biquad("lp", 3800, 0.6), biquad("hp", 250, 0.7))
BUS["bel"] = eq(BUS["bel"], biquad("hp", 2500, 0.7))
IR_M = [make_ir(1.5, 2.2, 21), make_ir(1.5, 2.2, 22)]
WET = 0.30
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0] + BUS[k][1]) for k in BUSES)
music = sum(BUS[k] * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
music = eq(music, biquad("hp", 35, 0.7))

# ---------- голос и активность речи ----------
rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, "voice.mp3"), "-f", "f32le", "-ac", "1",
                       "-ar", str(SR), "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
i_v0 = int(round(V0 * SR))
vfull = np.zeros(N)
vfull[i_v0:i_v0 + len(voice)] = voice[:max(0, N - i_v0)]
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


def env_pts(n, pts):
    return np.interp(tt(n), [p[0] for p in pts], [p[1] for p in pts])


def ping(m, tau=0.5, seed=0):
    f = hz(m)
    return strike(f, [(1, 1.0, tau), (2.76, 0.3, tau * 0.25), (5.4, 0.1, tau * 0.08)], min(2.5, tau * 5),
                  click=0.05, cband=(5000, 12000), seed=seed)


def s_chalk(dur, p0=-0.45, p1=0.45, seed=0):
    """мелок пишет: штрихи с зерном и редким тонким писком, панорама за буквами"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    y = np.zeros(n)
    t = 0.0
    while t < dur - 0.06:
        Ls = min(g.uniform(0.07, 0.28), dur - t)
        m = int(Ls * SR)
        tl = tt(m)
        env = np.minimum(1, tl / 0.012) * np.clip((Ls - tl) / 0.025, 0, 1)
        env *= 0.65 + 0.35 * np.sin(2 * np.pi * g.uniform(5, 11) * tl + g.uniform(0, 6.3))
        imp = (g.random(m) < 1100 / SR) * g.uniform(0.2, 1.0, m)
        ker = np.exp(-tt(int(0.003 * SR)) / 0.0006)
        crack = eq(np.convolve(imp, ker)[:m], biquad("hp", 1800, 0.7))
        crack /= max(1e-9, np.sqrt(np.mean(crack ** 2)))
        sgm = 0.55 * bandn(m, 2000, 7000) + 0.6 * crack
        if g.random() < 0.3:                                   # мел чуть пищит
            f0 = g.uniform(2400, 3500)
            ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.012 * np.sin(2 * np.pi * 31 * tl))) / SR
            sgm += 0.35 * np.sin(ph) * np.minimum(1, tl / 0.03)
        i0 = int(t * SR)
        y[i0:i0 + m] += (sgm * env)[:n - i0]
        t += Ls + g.uniform(0.03, 0.11)
    return pan_curve(y, p0, p1)


def s_pop(tone=True):
    """«пуф» облачка и тихий колокольчик"""
    n = int(1.2 * SR)
    t = tt(n)
    y = bandn(n, 300, 2600) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.05) * 0.9
    y += 0.5 * np.sin(2 * np.pi * (260 + 180 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.03)
    if tone:
        b = ping(100, 0.35, seed=5) * 0.35
        k = int(0.02 * SR)
        y[k:k + len(b)] += b[:n - k]
    return y


def s_whoosh(dur):
    """«вжух»: полоса шума едет вверх и обратно, пик на конце пролёта, панорама слева направо"""
    tail = 0.35
    n = int((dur + tail) * SR)
    t = tt(n)
    tp = dur - 0.05
    x = bandn(n, 120, 10000)
    fc = lambda tc: 450 * 2 ** (2.3 * np.clip(tc / tp, 0, 1) ** 1.5) * np.where(tc > tp, 2 ** (-(tc - tp) / 0.25), 1)
    y = tvf(x, band_sweep(fc, 0.9))
    env = np.where(t < tp, (t / tp) ** 2.2, np.exp(-(t - tp) / 0.09))
    return pan_curve(fade_tail(y * env, 0.03), -0.7, 0.7)


def s_wave(dur):
    """мягкий шорох меловой волны: широкая полоса, медленный нажим, мелкое зерно"""
    n = int((dur + 0.3) * SR)
    t = tt(n)
    g = np.random.default_rng(31)
    out = []
    for ch in range(2):
        x = bandn(n, 250, 7000)
        fc = lambda tc: 1300 * 2 ** (0.7 * np.clip(tc / dur, 0, 1) + 0.25 * np.sin(2 * np.pi * 2.1 * tc + ch))
        y = tvf(x, band_sweep(fc, 1.4))
        imp = (g.random(n) < 500 / SR) * g.uniform(0.2, 1, n)
        crack = eq(np.convolve(imp, np.exp(-tt(120) / 0.0006))[:n], biquad("hp", 2200, 0.7))
        y += 0.5 * crack / max(1e-9, np.sqrt(np.mean(crack ** 2)))
        out.append(y)
    env = np.minimum(1, t / 0.35) * np.clip((dur + 0.3 - t) / 0.55, 0, 1) * (0.8 + 0.2 * slow(n, 3, g))
    y = np.stack(out) * env
    gl_, gr_ = pan_gains(np.linspace(-0.5, 0.5, n))
    return np.stack([y[0] * gl_ * 1.2, y[1] * gr_ * 1.2]) * 0.5 + 0.25 * stereo(0.5 * (y[0] + y[1]))


def s_mercury():
    """ртуть падает: нисходящий звон (пентатоника соль мажора) и скользящий тон"""
    n = int(1.8 * SR)
    t = tt(n)
    y = np.zeros(n)
    for k, m in enumerate([98, 95, 93, 91, 88, 86, 83, 79]):
        p = ping(m, 0.45, seed=40 + k) * (1.0 - 0.07 * k)
        i0 = int(k * 0.065 * SR)
        y[i0:i0 + len(p)] += p[:n - i0]
    f = 2300 * 2 ** (-1.8 * np.clip(t / 0.55, 0, 1))
    y += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.25) * np.minimum(1, t / 0.01)
    return pan_curve(y, 0.1, -0.1)


def s_frost():
    """искры инея: россыпь колокольчиков"""
    g = np.random.default_rng(61)
    n = int(2.6 * SR)
    out = np.zeros((2, n))
    ts = [0.0] + list(np.cumsum(g.uniform(0.05, 0.13, 12)))
    pent = [86, 88, 91, 93, 95, 98, 100, 103]
    for k, t0 in enumerate(ts):
        m = pent[int(g.integers(0, len(pent)))] if k else 98
        p = ping(m, g.uniform(0.3, 0.6), seed=600 + k) * (1.0 if k == 0 else 0.75 * (1 - k / 16))
        i0 = int(t0 * SR)
        out[:, i0:i0 + len(p)] += stereo(p, g.uniform(-0.7, 0.7))[:, :n - i0]
    return out


def s_cotton(seed):
    """мягкий «пуф» комка ваты"""
    g = np.random.default_rng(seed)
    n = int(0.4 * SR)
    t = tt(n)
    y = bandn(n, 120, 1300) * (1 - np.exp(-t / 0.004)) * np.exp(-t / g.uniform(0.06, 0.09))
    f0 = g.uniform(120, 170)
    y += 0.7 * np.sin(2 * np.pi * (f0 + 70 * np.exp(-t / 0.015)) * t) * np.exp(-t / 0.04) * np.minimum(1, t / 0.002)
    return y


def s_sled(dur):
    """спуск на салазках: свист ветра (узкая полоса едет вверх-вниз) и шорох полозьев"""
    tail = 0.3
    n = int((dur + tail) * SR)
    t = tt(n)
    g = np.random.default_rng(71)
    u = np.clip(t / dur, 0, 1)
    fc = lambda tc: 1000 * 2 ** (0.8 * np.sin(np.pi * np.clip(tc / dur, 0, 1)) + 0.1)
    whistle = tvf(bandn(n, 300, 6000), band_sweep(fc, 0.1))
    whistle /= max(1e-9, np.sqrt(np.mean(whistle ** 2)))
    hiss = bandn(n, 2500, 9500) * (0.7 + 0.3 * slow(n, 12, g))
    crunch = bandn(n, 300, 1600) * (0.6 + 0.4 * np.abs(slow(n, 25, g)))
    y = 0.8 * whistle + 0.5 * hiss + 0.35 * crunch
    env = np.minimum(1, t / 0.08) * (0.7 + 0.3 * u) * np.where(t > dur, np.exp(-(t - dur) / 0.09), 1.0)
    return pan_curve(fade_tail(y * env, 0.03), -0.65, 0.65)


def s_sponge(dur):
    """губка стирает доску: широкий шорох с качанием туда-сюда"""
    tail = 0.15
    n = int((dur + tail) * SR)
    t = tt(n)
    out = []
    for ch in range(2):
        x = bandn(n, 300, 8500)
        fc = lambda tc: 1600 * 2 ** (0.6 * np.sin(2 * np.pi * 5.5 * tc + 1.3 * ch))
        out.append(tvf(x, band_sweep(fc, 1.5)))
    rub = 0.55 + 0.45 * np.abs(np.sin(np.pi * 5.5 * t))
    env = np.minimum(1, t / 0.06) * np.where(t > dur, np.exp(-(t - dur) / 0.05), 1.0) * rub
    return fade_tail(np.stack(out) * env, 0.03)


def s_joy():
    """короткий радостный аккорд: ля мажор у колокольчиков и челесты, бубенцы"""
    n = int(2.0 * SR)
    out = np.zeros((2, n))
    for k, (m, inst, v, p) in enumerate([(81, "gl", 0.8, -0.3), (85, "gl", 0.7, 0.3), (88, "gl", 0.7, -0.1),
                                         (93, "gl", 0.6, 0.1), (69, "ce", 0.6, 0.0), (76, "ce", 0.5, 0.2)]):
        x = (glock(m) if inst == "gl" else celesta(m)) * v
        i0 = int(0.012 * k * SR)
        out[:, i0:i0 + len(x)] += stereo(x, p)[:, :n - i0]
    sh = SHAKES[2] * 0.25
    out[:, :len(sh)] += stereo(sh, 0.4)
    return out


def s_knock(strength, latch_first):
    """мягкий стук двери с щелчком защёлки"""
    n = int(0.5 * SR)
    t = tt(n)
    th = np.sin(2 * np.pi * (78 + 40 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.09) * np.minimum(1, t / 0.002)
    th += 0.6 * bandn(n, 60, 450) * np.exp(-t / 0.05)
    th += 0.25 * (np.sin(2 * np.pi * 230 * t) + 0.6 * np.sin(2 * np.pi * 470 * t)) * np.exp(-t / 0.04)
    nc = int(0.03 * SR)
    clk = bandn(nc, 1500, 6000) * np.exp(-tt(nc) / 0.003) * 0.5
    y = th * strength
    k = 0 if latch_first else int(0.035 * SR)
    y[k:k + nc] += clk
    if latch_first:                                   # защёлка раньше, удар позже — сдвигаем удар
        y = np.concatenate([np.zeros(int(0.03 * SR)), th * strength])[:n]
        y[:nc] += clk
    return y


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


def place(name, what, t_ev, start, x, peaks=None, parts=None, t_end=None, send=0.08):
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
    rec = {"name": name, "what": what, "t": r3(t_ev), "start": r3(a_), "end": r3(b_)}
    if peaks is not None:
        if len(peaks) == 1:
            rec["peak"] = r3(peaks[0])
        else:
            rec["hits"] = len(peaks)
            rec["peaks"] = [r3(p) for p in peaks]
    if t_end is not None:
        rec["t_end"] = r3(t_end)
    if parts:
        rec["parts"] = [[r3(p), r3(q)] for p, q in parts]
    rec["db"] = SFX_DB[name]
    if name in BED:
        rec["bed"] = True
    rec["db_lines"] = round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None
    rec["t_loudest"] = r3(cen[int(np.argmax(mov))])
    SFX_LOG.append(rec)


def hit(name, what, times, maker, pans=0.0, send=0.08, peak_win=0.3):
    """удары: пик каждого — на кадр позже события"""
    xs, peaks = [], []
    for i, te in enumerate(times):
        x = stereo(maker(i), pans(i) if callable(pans) else pans)
        envp = np.convolve(np.abs(x).sum(0), np.ones(110) / 110, "same")
        pk = int(np.argmax(envp[:int(peak_win * SR)]))
        xs.append((te + FRAME - pk / SR, x))
        peaks.append(te + FRAME)
    st = min(s for s, _ in xs)
    en = max(s + x.shape[1] / SR for s, x in xs)
    out = np.zeros((2, int((en - st) * SR) + 2))
    parts = []
    for s, x in xs:
        i0 = int(round((s - st) * SR))
        out[:, i0:i0 + x.shape[1]] += x
        parts.append(audible(x, s))
    place(name, what, times[0], st, out, peaks=peaks, parts=parts if len(times) > 1 else None, send=send)


def long(name, what, t0, t1, x, send=0.08, peaks=None):
    """долгий звук начинается на кадр позже события"""
    place(name, what, t0, t0 + FRAME, x, t_end=t1, peaks=peaks, send=send)


# заставка: мел пишет заголовок (время титра в ролике от начала не зависит от вступления)
long("chalk_title", "мел пишет заголовок", 0.35, 2.0, s_chalk(1.65, seed=1))
hit("thought_pop", "облачко мысли выскакивает", [W("w_vchera") - 0.25], lambda i: s_pop(), pans=0.25)
t_win = L(4) + 0.25
whoosh = s_whoosh(0.95)
long("window_whoosh", "камера пролетает сквозь окно (пик на конце пролёта)", t_win - 0.95, t_win, whoosh,
     peaks=[t_win - 0.05 + FRAME])
t_w0, t_w1 = W("w_odelo"), W("w_pobel") + 0.5
long("white_wave", "белая волна мела закрывает грязь", t_w0, t_w1, s_wave(t_w1 - t_w0))
hit("mercury_drop", "ртуть градусника падает", [W("w_moroz")], lambda i: s_mercury())
hit("frost_bells", "искры инея на ветках", [W("w_iney")], lambda i: s_frost(), send=0.2)
PUFFS = ["w_svezh", "w_beloy", "w_puhl", "w_vatoy", "w_vse"]
hit("cotton_puff", "рука шлёпает комки ваты на кусты", [W(k) for k in PUFFS], lambda i: s_cotton(90 + i),
    pans=lambda i: -0.5 + 0.25 * i)
t_s0, t_s1 = W("w_veselo") + 0.12, L(16) - 0.4
long("sled_ride", "спуск на салазках", t_s0, t_s1, s_sled(t_s1 - t_s0))
t_g0, t_g1 = L(16) - 0.55, L(16) + 0.2
long("sponge_wipe", "губка стирает доску", t_g0, t_g1, s_sponge(t_g1 - t_g0))
hit("joy_chord", "девочка подпрыгивает на «гулять»", [W("w_gulyat")], lambda i: s_joy(), send=0.15)
t_d0, t_d1 = FIN - 0.2 + 1.1, FIN - 0.2 + 2.4
hit("door", "дверь открывается и закрывается", [t_d0, t_d1],
    lambda i: s_knock(0.7, True) if i == 0 else s_knock(1.0, False), pans=lambda i: 0.35)
long("chalk_fin", "мел пишет название в финале", FIN + 0.2, FIN + 1.8, s_chalk(1.6, -0.4, 0.4, seed=2))

IR_S = [make_ir(0.9, 1.4, 31, lp=6000), make_ir(0.9, 1.4, 32, lp=6000)]
for ch in (0, 1):
    SFX[ch] += 0.35 * convolve(SFX_SEND, IR_S[ch])

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
SCH = [SFX[0], SFX[1]]
lineG = []
for i, w in enumerate(SPEECH):
    pv, pm, ps = ms(VCH, [w]), ms(MCH, [w]), ms(SCH, [w])
    tgt = pv * db(LINE_DB[i + 1]) ** 2                  # музыка + шумы
    lo, hi = pv * db(MUS_LIM[0]) ** 2, pv * db(MUS_LIM[1]) ** 2
    pm_t = float(np.clip(tgt - ps, lo, hi))
    lineG.append(np.sqrt(pm_t / max(pm, 1e-20)))
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
I0 = GI.t(0)
W_INTRO = [(I0 + 0.3, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.25, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 1.6, TOTAL - FADE_OUT))]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, gI * 0.3), (I0 + 0.3, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
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
                "позже события); start/end — где звук слышен, parts — где слышен каждый удар серии; db — громкость шума "
                "к среднему голосу (самое громкое окно 100 мс, K-взвешенно, BS.1770), db_lines — то же, но самое громкое "
                "окно на строке (null — на строки не попадает); bed — долгий шум-подложка. music — ключевые моменты "
                "музыки, levels — уровни музыки.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN,
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп ♩: вступление {bpm(GI, 0):.0f}, строфа 1 {bpm(G1, 0):.0f}, строфа 2 {bpm(G2, 0):.0f}, строфа 3 "
      f"{bpm(G3a, 0):.0f}→{bpm(G3a, 12):.0f}, затем {bpm(G3b, 0):.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in per_line))
print(f"заставка {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступление": [(I0, L(1))], "строфа 1": [(L(1), L(7))], "строфа 2": [(L(7), L(13))],
       "строфа 3": [(L(13), FIN)], "финал": W_FIN}
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
    print(f"  {r['name']:14s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:4d}  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
