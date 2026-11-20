#!/usr/bin/env python3
"""Музыка и шумы к стиху И. С. Никитина «Полно, степь моя, спать беспробудно…», стиль «FPV-полёт дрона над степью,
low-poly 3D»: один непрерывный полёт через весь год (зима → весна → лето → ночь у костра → осенний туман).

Своя светлая «летящая» музыка в ре мажоре. Мелодия и гармония свои, ни на какую известную пьесу не опираются.
Тема — нисходящий напев «ля — фа-диез ми — ре — си ля»: во вступлении (плак-лид и колокольчики), ночью (свирель),
в колыбельной (музыкальная шкатулка) и в финале (свирель и шкатулка, громко).
Инструменты — синтез (numpy):
  плак-синт (аддитивный «пилообразный» щипок, у верхних гармоник затухание быстрее — как фильтр-огибающая) —
    пульсирующее арпеджио шестнадцатыми, цикл из трёх нот против четырёх долей (шина arp); лид-плак (шина lead);
  мягкий пэд (волновая таблица пилы, четыре расстроенных голоса, медленное «дыхание») — шина pad;
  бас: короткие пульсы восьмыми в «разгонных» строфах, долгие ноты в тихих (шина bass);
  лёгкий бит: бочка, хлопок, шейкер, мягкая тарелка и обратный «вдох» тарелки (шины drum, shk);
  колокольчики (металлофон: обертоны 1 : 2,76 : 5,40 : 8,93) — тихие строфы и искры (шина bell);
  гармошка (два язычка с биением ~4 Гц, «меха») и балалайка (яркий щипок) — пляска косцов и ночь (шины acc, bal);
  свирель (непрерывная фаза, вибрато, дыхание, форшлаги) — ночь и финал (шина svl);
  тёплый бурдон ре — ля — ре — ночь у костра (шина drn);
  музыкальная шкатулка и мягкая «арфа»-переборы — колыбельная (шины mbx, soft).
План (секунды ролика берутся из events.json, смена гармонии и инструментов — в середине паузы между строфами):
  0 … L1−0,25  вступление (темп строфы 1, 6,5 доли): пэд Dadd9 нарастает, арпеджио раскручивается (восьмые →
               шестнадцатые), лид и колокольчики показывают тему; Asus4 → A;
  строфа 1     6 тактов 4/4, разгон: бит, бас восьмыми, арпеджио, пэд. D Bm G A D/F#-G Asus4-A; на «светло» —
               искры колокольчиков и мягкая тарелка, бит уходит, взлёт лида в паузу;
  строфа 2     5 тактов, без бита: пэд, колокольчики, долгий бас. G D/F# Em7 Bm7 A7sus4-A; на «цветы» — каскад
               колокольчиков; в паузе — раскрутка арпеджио к строфе 3;
  строфа 3     5 тактов, разгон (бочка на каждую долю): D A/C# Bm G Em7-A; на «золоте» — искры; бит уходит,
               обратная тарелка в паузу;
  строфа 4     5 тактов, без бита, «облака»: Gmaj7 F#m7 Em7 Bm7 Asus4-A, колокольчики падают терциями;
  строфа 5     5 тактов, разгон: D Em7 G D/F# Em7-A; в паузе гармошка раздувает A7 — к пляске;
  строфа 6     4 такта до «Распевайте» — пляска косцов: бас-щипок на каждую долю (тоника — квинта), гармошка и
               балалайка на слабые восьмые, бочка, хлопки, бубен. D G D A;
               с «Распевайте» — ночь: тёплый бурдон, тихая гармошка, свирель поёт мотив;
  строфа 7     колыбельная 6/8 (6 тактов, медленнее и тише): шкатулка ведёт тему, мягкие переборы, бас на
               доли, пэд. D Bm G A G-A D;
  fin … конец  тема громче: свирель и шкатулка, D → G-D с замедлением, последний аккорд с колокольчиком, затухание.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке; цель LINE_DB — для музыки вместе с
шумами, при этом музыка одна держится в MUS_LIM), громче на заставке, в паузах между строфами и в финале; под
голосом у музыки мягкий провал −3 дБ около 2,5 кГц (место для речи).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список и уровни — sfx.json):
взлёт дрона (свист воздуха), порыв ветра на «царство», журавли на «Журавли», ручей от «ручьи», шорох ветра на нырке
в овраг («оврагам»), жаворонок на «песни», свист косы (по взмахам косцов из ../video/src/mower.js) на «косою» и
«косцам», треск костра от «Распевайте» до L25, «вдох» тумана на «туманом».

Запуск: python3 make_music.py [--intro 3.5] [--outro 6.8] [--out music.wav]
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
LINE_DB = {i: (-19.6 if i >= 25 else -19.0) for i in range(1, 29)}   # музыка + шумы, RMS, дБ к голосу строки
MUS_LIM = (-20.0, -18.2)                       # музыка одна на строке не выходит из этих пределов
INTRO_DB = -8.0      # заставка, к среднему голосу
GAP_DB = {4: -11.0, 8: -11.5, 12: -11.0, 16: -11.5, 20: -11.0, 24: -14.0}   # паузы между строфами
GAP_CAP = 9.0        # пауза не громче соседних строк больше чем на 9 дБ
TAIL_DB = -10.0      # после голоса до fin (колыбельная договаривает), к среднему голосу
FIN_DB = -6.0        # финал: тема громче
FADE_IN = 0.6        # нарастание в начале, с
FADE_OUT = 2.6       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {"motor": -19, "takeoff": -13, "gust": -18, "cranes": -18, "brook": -23, "dive": -19, "lark": -19, "scythe": -18,
          "fire": -21, "fog": -20}
BED = {"brook", "fire"}   # долгие шумы — для check_mix.py часть подложки

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Полно, степь моя, спать беспробудно…» Никитина")
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
if NL != 28:
    sys.exit(f"ожидалось 28 строк, в events.json {NL}")
for i in range(1, NL + 1):  # events.json должен быть собран по тем же таймингам
    ln = TJ["lines"][i - 1]
    if abs(ln["start"] + V0 - EV[f"L{i}"]) > 0.02 or abs(ln["end"] + V0 - EV[f"E{i}"]) > 0.02:
        print(f"ВНИМАНИЕ: строка {i} в events.json не совпадает с timings.json — перезапусти ../video/build.py")
        break
if abs(float(RAW["total"]) + SHIFT - TOTAL) > 0.002:
    print(f"внимание: длина {TOTAL} с, а в events.json total {RAW['total']} (+сдвиг {SHIFT:+.3f}) — другой финал?")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = EV["fin"]
if FIN > TOTAL - 3.5:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
STANZA_END = (4, 8, 12, 16, 20, 24)
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1854)
db = lambda x: 10.0 ** (x / 20.0)
hz = lambda m: 440.0 * 2.0 ** ((float(m) - 69.0) / 12.0)
tt = lambda n: np.arange(int(n)) / SR
dB = lambda v: 10 * np.log10(max(float(v), 1e-20))


def pan_gains(p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def stereo(x, pan=0.0):
    if x.ndim == 2:
        if pan == 0.0:
            return x
        gl, gr = pan_gains(pan)
        return np.stack([x[0] * gl * 1.4142, x[1] * gr * 1.4142])
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


def cut(x, sec, fade=0.03):
    """заглушить звук через sec с (короткое затухание fade)"""
    k = int(sec * SR)
    if k >= x.shape[-1]:
        return x
    y = x[..., :k + int(fade * SR)].copy()
    y[..., k:] *= np.cos(0.5 * np.pi * np.arange(y.shape[-1] - k) / (y.shape[-1] - k)) ** 2
    return y


def env_ar(n, att, dur, rel):
    """огибающая: sin² подъём att, держится до dur, cos² спад rel (n — полная длина)"""
    t = tt(n)
    e = np.sin(0.5 * np.pi * np.clip(t / max(att, 1e-4), 0, 1)) ** 2
    return e * np.cos(0.5 * np.pi * np.clip((t - dur) / max(rel, 1e-4), 0, 1)) ** 2


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


def norm_std(x):
    return x / (np.std(x) + 1e-12)


# ---------- инструменты ----------
_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


# щипки: аддитивно, у k-й гармоники затухание a0 + a1·k (1/с) — звучит как щипок с закрывающимся фильтром
PLK = {
    "arp": dict(dur=0.8, det=(-7, 7), a0=3.6, a1=0.9, shape="saw", kmax=36, seed=1),     # плак-синт арпеджио
    "lead": dict(dur=1.5, det=(-5, 5), a0=1.8, a1=0.42, shape="saw", kmax=30, seed=2),   # лид-плак
    "soft": dict(dur=2.6, det=(-3, 3), a0=1.0, a1=0.5, shape="tri", kmax=14, seed=3),    # мягкие переборы
    "bal": dict(dur=0.75, det=(-6, 5), a0=4.2, a1=0.65, shape="pos", pos=0.12, inh=0.00035, kmax=30, seed=4),
    "bassp": dict(dur=0.75, det=(0,), a0=2.8, a1=1.3, shape="saw", kmax=9, seed=5),     # бас-щипок пляски
}


def pluck(m, kind="arp"):
    def mk():
        P = PLK[kind]
        f = hz(m)
        n = int(P["dur"] * SR)
        t = tt(n)
        g = np.random.default_rng(P["seed"] * 1000 + int(m))
        out = np.zeros((2, n))
        nd = len(P["det"])
        for j, c in enumerate(P["det"]):
            fd = f * 2 ** (c / 1200)
            y = np.zeros(n)
            for k in range(1, int(P["kmax"]) + 1):
                fk = fd * k * np.sqrt(1 + P.get("inh", 0.0) * k * k)
                if fk > 12500:
                    break
                if P["shape"] == "saw":
                    a = 1.0 / k
                elif P["shape"] == "tri":
                    a = 1.0 / k ** 2 if k % 2 else 0.2 / k ** 2
                else:
                    a = abs(np.sin(np.pi * k * P["pos"])) / k
                y += a * np.sin(2 * np.pi * fk * t + g.uniform(0, 2 * np.pi)) * np.exp(-t * (P["a0"] + P["a1"] * k))
            p = 0.0 if nd == 1 else 0.55 * (-1 + 2 * j / (nd - 1))
            gl, gr = pan_gains(p)
            out[0] += y * gl
            out[1] += y * gr
        a = int(0.0018 * SR)
        out[:, :a] *= np.linspace(0, 1, a)
        if kind == "bal":   # медиатор: короткий щелчок
            k = int(0.004 * SR)
            out[:, :k] += 0.25 * np.random.default_rng(int(m)).standard_normal(k) * np.exp(-tt(k) / 0.0012)
        out /= np.max(np.abs(out)) + 1e-9
        return fade_tail(out, 0.06)
    return cached(("pl", kind, int(m)), mk)


def struck(m, partials, dur, seed, tick=0.0):
    """ударный тон: partials — (отношение частот, громкость, τ затухания)"""
    f = hz(m)
    n = int(dur * SR)
    t = tt(n)
    g = np.random.default_rng(seed)
    y = np.zeros(n)
    for r, a, tau in partials:
        if f * r < 16000:
            y += a * np.sin(2 * np.pi * f * r * t + g.uniform(0, 6.28)) * np.exp(-t / tau)
    k = int(0.0015 * SR)
    y[:k] *= np.linspace(0, 1, k)
    if tick:
        kk = int(0.006 * SR)
        y[:kk] += tick * g.standard_normal(kk) * np.exp(-tt(kk) / 0.0015)
    return fade_tail(y / np.max(np.abs(y)), 0.1)


def glock(m):
    """колокольчики-металлофон: обертоны свободного бруска"""
    return cached(("gl", int(m)), lambda: struck(m, ((1.0, 1.0, 1.7), (1.0017, 0.2, 2.1), (2.756, 0.3, 0.5),
                                                     (5.404, 0.11, 0.17), (8.933, 0.04, 0.07)), 2.8, int(m) * 7 + 1))


def mbox(m):
    """музыкальная шкатулка: язычок гребёнки, щелчок штифта"""
    return cached(("mb", int(m)), lambda: struck(m, ((1.0, 1.0, 1.3), (1.0023, 0.16, 1.5), (2.0, 0.12, 0.45),
                                                     (3.0, 0.05, 0.2), (6.27, 0.08, 0.045)), 2.4, int(m) * 5 + 2,
                                                 tick=0.12))


TS = 4096
_TAB = {}


def saw_table(h, tilt):
    key = ("saw", h, round(tilt, 4))
    if key not in _TAB:
        x = np.arange(TS) / TS
        y = sum(np.sin(2 * np.pi * k * x) / k * np.exp(-tilt * (k - 1)) for k in range(1, h + 1))
        y /= np.max(np.abs(y))
        _TAB[key] = np.concatenate([y, y[:1]])
    return _TAB[key]


def reed_table(h, duty=0.28):
    key = ("reed", h, duty)
    if key not in _TAB:
        x = np.arange(TS) / TS
        y = sum(np.sin(np.pi * k * duty) / k * np.cos(2 * np.pi * k * x) for k in range(1, h + 1))
        y -= y.mean()
        y /= np.max(np.abs(y))
        _TAB[key] = np.concatenate([y, y[:1]])
    return _TAB[key]


def wt(tab, f, t, phase0=0.0):
    ph = (f * t + phase0) % 1.0
    return np.interp(ph * TS, np.arange(TS + 1), tab)


def pad_note(m, dur, att=0.6, rel=0.9, bright=0.6, seed=0):
    """мягкий пэд: четыре чуть расстроенных голоса пилы, медленное дыхание, стерео"""
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    g = np.random.default_rng(seed)
    h = int(np.clip(4200 * bright / f, 3, 40))
    tab = saw_table(h, 0.14 / bright)
    out = np.zeros((2, n))
    for j, (c, p) in enumerate(((-9, -0.7), (-3, 0.35), (4, -0.35), (10, 0.7))):
        fv = f * 2 ** ((c + g.uniform(-1.5, 1.5)) / 1200)
        y = wt(tab, fv, t, g.uniform(0, 1))
        y *= 1 + 0.16 * np.sin(2 * np.pi * g.uniform(0.12, 0.3) * t + g.uniform(0, 6.28))
        gl, gr = pan_gains(p)
        out[0] += y * gl
        out[1] += y * gr
    return out * env_ar(n, att, dur, rel) / 4


def bass_note(m, dur, tau=0.22, rel=0.06):
    """мягкий синт-бас: синус с 2–4 гармониками"""
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    y = (np.sin(2 * np.pi * f * t) + 0.34 * np.sin(4 * np.pi * f * t + 0.3) + 0.12 * np.sin(6 * np.pi * f * t + 1.1)
         + 0.05 * np.sin(8 * np.pi * f * t + 0.6))
    e = np.minimum(1, t / 0.004) * np.exp(-t / tau)
    e *= np.cos(0.5 * np.pi * np.clip((t - dur) / rel, 0, 1)) ** 2
    return y * e


def acc_note(m, dur, att=0.03, rel=0.08, seed=0, beat=4.2):
    """гармошка: два язычка (второй выше на beat Гц — «тремоло»), меха"""
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    g = np.random.default_rng(seed)
    tab = reed_table(int(np.clip(7500 / f, 3, 40)))
    y0 = wt(tab, f, t, g.uniform(0, 1))
    y1 = wt(tab, f + beat, t, g.uniform(0, 1))
    bel = 1 + 0.06 * slow(n, 3, g)
    e = env_ar(n, att, dur, rel) * bel
    return np.stack([(0.62 * y0 + 0.38 * y1) * e, (0.38 * y0 + 0.62 * y1) * e]) * 0.7


def kick():
    def mk():
        n = int(0.45 * SR)
        t = tt(n)
        f = 47 + 95 * np.exp(-t / 0.028)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * np.minimum(1, t / 0.0015)
        y += 0.12 * bandn(n, 1500, 6000, np.random.default_rng(3)) * np.exp(-t / 0.003)
        return fade_tail(y / np.max(np.abs(y)), 0.05)
    return cached("kick", mk)


def clap(v):
    def mk():
        g = np.random.default_rng(40 + v)
        n = int(0.4 * SR)
        t = tt(n)
        e = np.zeros(n)
        for ti in (0.0, 0.010, 0.021):
            e += (t >= ti) * np.exp(-np.maximum(t - ti, 0) / 0.0045)
        e += 0.55 * (t >= 0.03) * np.exp(-np.maximum(t - 0.03, 0) / 0.085)
        y = bandn(n, 850, 4800, g) * e
        return fade_tail(y / np.max(np.abs(y)), 0.05)
    return cached(("clap", v), mk)


def shaker(v, jingle=False):
    def mk():
        g = np.random.default_rng(60 + v + (20 if jingle else 0))
        n = int((0.22 if jingle else 0.12) * SR)
        t = tt(n)
        e = np.sin(0.5 * np.pi * np.clip(t / 0.007, 0, 1)) ** 2 * np.exp(-np.maximum(t - 0.007, 0) / 0.035)
        y = bandn(n, 4800, 13000, g) * e
        if jingle:   # бубен: звон тарелочек
            for fr_, a in ((6900, 0.5), (8650, 0.4), (10300, 0.35), (12100, 0.25)):
                y += a * np.sin(2 * np.pi * fr_ * g.uniform(0.98, 1.02) * t + g.uniform(0, 6)) * np.exp(-t / 0.07) \
                    * np.minimum(1, t / 0.002)
        return fade_tail(y / np.max(np.abs(y)), 0.02)
    return cached(("shk", v, jingle), mk)


def cymbal(dur=2.2, rev=False, seed=0):
    """мягкая тарелка или её обратный «вдох» (rev)"""
    g = np.random.default_rng(80 + seed)
    n = int(dur * SR)
    t = tt(n)
    y = np.stack([bandn(n, 3200, 14000, g), bandn(n, 3200, 14000, g)])
    y += 0.25 * np.stack([bandn(n, 900, 3000, g), bandn(n, 900, 3000, g)])
    if rev:
        e = (t / dur) ** 2.6
        e[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))
    else:
        e = np.minimum(1, t / 0.004) * np.exp(-t / 0.55)
        e = fade_tail(e, 0.2)
    return y * e


def svirel(notes, seed=0, rel=0.35):
    """свирель: notes — [(начало, конец, midi, громкость, форшлаг)], legato; возвращает (t0, стерео)"""
    g = np.random.default_rng(seed)
    T0 = notes[0][0] - 0.06
    T1 = notes[-1][1] + rel
    n = int((T1 - T0) * SR)
    t = tt(n) + T0
    ons = np.array([a for a, _, _, _, _ in notes])
    kx, ky = [T0], [np.log(hz(notes[0][2]))]
    for i, (a, b, m, v, gr) in enumerate(notes):
        lf = np.log(hz(m))
        if gr:   # форшлаг: верхняя соседняя нота на 45 мс
            lg = np.log(hz(m + gr))
            kx += [a - 0.05, a - 0.04, a - 0.006, a + 0.004]
            ky += [ky[-1], lg, lg, lf]
        else:
            kx += [a - 0.014, a + 0.012]
            ky += [ky[-1], lf]
    kx.append(T1)
    ky.append(ky[-1])
    f = np.exp(np.interp(t, kx, ky))
    idx = np.clip(np.searchsorted(ons, t, side="right") - 1, 0, len(notes) - 1)
    since = t - ons[idx]
    depth = 0.0065 * np.clip((since - 0.22) / 0.4, 0, 1)
    f = f * (1 + depth * np.sin(2 * np.pi * 5.6 * t) + 0.0012 * slow(n, 3, g))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = (np.sin(ph) + 0.05 * np.sin(2 * ph + 0.3) + 0.16 * np.sin(3 * ph + 0.7) + 0.03 * np.sin(4 * ph)
           + 0.05 * np.sin(5 * ph + 1.9))
    vs = np.array([v for _, _, _, v, _ in notes])
    amp = vs[idx] * (1 - 0.4 * np.exp(-((since - 0.01) / 0.025) ** 2))
    amp *= np.clip((t - notes[0][0] + 0.05) / 0.07, 0, 1)
    amp *= np.cos(0.5 * np.pi * np.clip((t - notes[-1][1]) / rel, 0, 1)) ** 2
    amp *= 1 + 0.12 * np.clip(since / 0.5, 0, 1) * (1 - np.clip(since / 1.5, 0, 1))
    breath = 0.085 * bandn(n, 1500, 6500, g) * (0.6 + 0.4 * amp / (np.max(amp) + 1e-9))
    chiff = np.zeros(n)
    for a in ons:
        i0 = int((a - T0) * SR)
        k = min(n - i0, int(0.04 * SR))
        if k > 0:
            chiff[i0:i0 + k] += np.exp(-tt(k) / 0.01)
    y = (sig + breath) * amp + 0.07 * bandn(n, 2500, 9000, g) * chiff * amp
    return T0, np.stack([y, y])


def drone_note(m, dur, att=0.7, rel=1.4, seed=0):
    """тёплый бурдон: две тёмные пилы с биением"""
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    g = np.random.default_rng(seed)
    tab = saw_table(int(np.clip(1400 / f, 3, 30)), 0.25)
    y0 = wt(tab, f * 2 ** (-4 / 1200), t, g.uniform(0, 1))
    y1 = wt(tab, f * 2 ** (4 / 1200), t, g.uniform(0, 1))
    sw = 1 + 0.2 * slow(n, 0.8, g)
    e = env_ar(n, att, dur, rel) * sw
    return np.stack([(0.7 * y0 + 0.3 * y1) * e, (0.3 * y0 + 0.7 * y1) * e])


# ---------- шины ----------
BUSES = ["arp", "lead", "pad", "bass", "drum", "shk", "bell", "acc", "bal", "svl", "drn", "mbx", "soft"]
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_G = {"arp": 0.36, "lead": 0.3, "pad": 0.42, "bass": 0.3, "drum": 0.6, "shk": 0.24, "bell": 0.26, "acc": 0.2,
         "bal": 0.16, "svl": 0.34, "drn": 0.12, "mbx": 0.28, "soft": 0.2}
BUS_SEND = {"arp": 0.22, "lead": 0.3, "pad": 0.3, "bass": 0.0, "drum": 0.06, "shk": 0.12, "bell": 0.45, "acc": 0.22,
            "bal": 0.18, "svl": 0.4, "drn": 0.15, "mbx": 0.42, "soft": 0.3}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += x[:, j0:j1] * g


class Grid:
    """сетка долей: n долей от t0 до t1, ровно или с линейно меняющейся длиной (начиная с b0);
    за краями сетка продолжается крайней длиной доли (отрицательные доли — затакт)"""

    def __init__(self, t0, t1, n, b0=None):
        D = t1 - t0
        self.l = np.full(n, D / n) if b0 is None else np.linspace(b0, 2 * D / n - b0, n)
        self.s = np.concatenate([[t0], t0 + np.cumsum(self.l)])
        self.n = n

    def t(self, b):
        if b < 0:
            return float(self.s[0] + b * self.l[0])
        if b >= self.n:
            return float(self.s[-1] + (b - self.n) * self.l[-1])
        i = int(np.floor(b))
        return float(self.s[i] + (b - i) * self.l[i])

    def blen(self, b):
        return float(self.l[int(np.clip(np.floor(b), 0, self.n - 1))])


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(s):
    return 12 * (int(s[-1]) + 1) + NOTE[s[0]] + s.count("#") - s.count("b")


def parse(txt):
    """«A4/1 F#5/.75 r/.5 | …» → [(доля, midi, длина в долях)], всего долей"""
    out, b = [], 0.0
    for bar in txt.split("|"):
        for tok in bar.split():
            nm, d = tok.split("/")
            if nm != "r":
                out.append((b, midi(nm), float(d)))
            b += float(d)
    return out, b


def play(G, b0, txt, inst, bus, vel=1.0, pan=0.0, beats=None, accent=4):
    notes, total = parse(txt)
    if beats is not None and abs(total - beats) > 1e-6:
        sys.exit(f"партия: {total} долей вместо {beats}: {txt[:40]}…")
    for b, m, d in notes:
        v = vel * (1.0 if (b % accent) < 1e-6 else 0.88)
        put(bus, G.t(b0 + b), inst(m) * v, pan)


QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "maj7": (0, 4, 7, 11),
        "sus4": (0, 5, 7), "7sus4": (0, 5, 7, 10), "add9": (0, 4, 7, 14), "sus2": (0, 2, 7)}


def chord(sym):
    """«F#m7», «D/F#», «A7sus4» → (корень, интервалы, класс баса)"""
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


def low(pc, lo=38):
    return lo + (pc - lo) % 12


def third(iv):
    return next((i for i in iv if i in (2, 3, 4, 5)), 4)


def chord_line(txt, bar=4):
    """«D | Bm | D/F# G» → [(доля начала, доля конца, аккорд)]; несколько аккордов в такте делят его поровну"""
    out = []
    for k, cell in enumerate(txt.split("|")):
        syms = cell.split()
        for j, s in enumerate(syms):
            out.append((k * bar + j * bar / len(syms), k * bar + (j + 1) * bar / len(syms), s))
    return out


def chord_at(cl, b):
    for b0, b1, s in cl:
        if b0 - 1e-6 <= b < b1 - 1e-6:
            return s
    return cl[-1][2] if b >= cl[-1][1] else cl[0][2]


# ---------- партии ----------
def arp_run(G, cl, b0, b1, vel, step=0.25, lo=55, kind="arp", bus="arp", spread=0.38, k0=0):
    """пульсирующее арпеджио: цикл из трёх нот (корень, квинта, терция через октаву) против долей — «пропеллер»;
    vel — число или функция доли"""
    k, b = k0, b0
    while b < b1 - 1e-6:
        rp, iv, _ = chord(chord_at(cl, b))
        r = low(rp, lo)
        ns = (r, r + 7, r + 12 + third(iv))
        m = ns[k % 3]
        acc = 1.0 if abs(b - round(b)) < 1e-6 else (0.8 if abs(2 * b - round(2 * b)) < 1e-6 else 0.66)
        v = vel(b) if callable(vel) else vel
        put(bus, G.t(b), pluck(m, kind) * v * acc, spread * ((k % 3) - 1))
        k += 1
        b += step
    return k


def bass_run(G, cl, b0, b1, vel=1.0, step=0.5, pat=(0, 0, 0, 12, 0, 0, 0, 12)):
    k, b = 0, b0
    while b < b1 - 1e-6:
        _, _, bp = chord(chord_at(cl, b))
        m = low(bp, 38) + pat[k % len(pat)]
        acc = 1.0 if abs(b - round(b)) < 1e-6 else 0.78
        put("bass", G.t(b), bass_note(m, 0.82 * step * G.blen(b), tau=0.2) * vel * acc)
        k += 1
        b += step


def bass_long(G, cl, b0, b1, vel=0.8, tau=2.5):
    for c0, c1, s in cl:
        a, z = max(c0, b0), min(c1, b1)
        if z > a:
            _, _, bp = chord(s)
            put("bass", G.t(a), bass_note(low(bp, 38), G.t(z) - G.t(a) - 0.02, tau=tau, rel=0.25) * vel)


def pad_line(G, cl, b0, b1, vel, lo=57, size=4, bright=0.6, att=0.5, rel=0.8, seed=0, ext=0.12):
    for i, (c0, c1, s) in enumerate(cl):
        a, z = max(c0, b0), min(c1, b1)
        if z > a:
            rp, iv, _ = chord(s)
            for k, m in enumerate(voicing(rp, iv, lo, size)):
                put("pad", G.t(a), pad_note(m, G.t(z) - G.t(a) + ext, att=att, rel=rel, bright=bright,
                                            seed=seed * 31 + i * 7 + k) * vel)


def drums(G, b0, b1, kicks=(0, 2), claps=(1, 3), vel=1.0, shk=True, shk_vel=1.0, jingle=False, step=0.25,
          kick_extra=()):
    """лёгкий бит по тактам 4/4: kicks/claps — доли в такте; шейкер шестнадцатыми (или step)"""
    b = b0
    while b < b1 - 1e-6:
        pos = b % 4
        if any(abs(pos - k) < 1e-6 for k in kicks) or any(abs(b - k) < 1e-6 for k in kick_extra):
            put("drum", G.t(b), kick() * 0.62 * vel)
        if any(abs(pos - c) < 1e-6 for c in claps):
            put("drum", G.t(b) + 0.004, clap(int(b * 4) % 3) * 0.2 * vel, 0.05)
        if shk:
            q = round((b % 1) / step) % int(round(1 / step))
            sv = (0.5, 0.32, 0.85, 0.32)[q] if step == 0.25 else (0.45, 0.9)[q]
            put("shk", G.t(b) + rng.normal(0, 0.003), shaker(int(b * 8) % 4, jingle) * sv * shk_vel, 0.3)
        b += step


def sparkle(t, notes, step=0.055, vel=0.6, pan=0.25):
    for k, m in enumerate(notes):
        put("bell", t + k * step, glock(m) * vel * (1 - 0.25 * k / max(1, len(notes) - 1)),
            pan + 0.4 * (k / max(1, len(notes) - 1) - 0.5))


# ---------- сетки ----------
gm = lambda i: 0.5 * (E(i) + L(i + 1))       # середина паузы после строки i
T1 = L(1) - 0.25                             # первая доля строфы 1 — перед первым словом
B1, B2, B3, B4, B5, B6 = gm(4), gm(8), gm(12), gm(16), gm(20), gm(24)
RASP = W("raspev")
G1 = Grid(T1, B1, 24)                        # строфа 1: 6 тактов 4/4 (вступление — затакт этой же сетки)
G2 = Grid(B1, B2, 20)                        # строфа 2: 5 тактов
G3 = Grid(B2, B3, 20)                        # строфа 3: 5 тактов
G4 = Grid(B3, B4, 20)                        # строфа 4: 5 тактов
G5 = Grid(B4, B5, 20)                        # строфа 5: 5 тактов
G6 = Grid(B5, RASP - 0.02, 16)               # строфа 6, пляска: 4 такта до «Распевайте»
G7 = Grid(B6, FIN, 36)                       # строфа 7, колыбельная: 6 тактов 6/8 (доля — восьмая); ночь — затакт
e7 = G7.blen(0)
DF = min(12 * e7 * 1.1, TOTAL - FIN - 1.4)   # финал: 2 такта 6/8 с замедлением и последний аккорд
if DF < 12 * 0.27:
    sys.exit("финал слишком короткий для двух тактов темы")
GF = Grid(FIN, FIN + DF, 12, b0=min(e7, DF / 12) * 0.97)
for nm_, G_ in (("1", G1), ("2", G2), ("3", G3), ("4", G4), ("5", G5), ("6", G6)):
    if not 0.4 < G_.blen(0) < 0.65:
        sys.exit(f"строфа {nm_}: доля {G_.blen(0):.3f} с — темп вне 92…150, проверь events.json")
bpm = lambda G, b=0: 60 / G.blen(b)

# ---------- партитура ----------
CLI = [(-8.0, -2.0, "Dadd9"), (-2.0, -1.0, "Asus4"), (-1.0, 0.0, "A")]
CL1 = chord_line("D | Bm | G | A | D/F# G | Asus4 A")
CL2 = chord_line("G | D/F# | Em7 | Bm7 | A7sus4 A")
CL3 = chord_line("D | A/C# | Bm | G | Em7 A")
CL4 = chord_line("Gmaj7 | F#m7 | Em7 | Bm7 | Asus4 A")
CL5 = chord_line("D | Em7 | G | D/F# | Em7 A")
CL6 = chord_line("D | G | D | A")
CL7 = chord_line("D | Bm | G | A | G A | D", bar=6)
CLF = chord_line("D | G D", bar=6)

# вступление: взлёт — пэд Dadd9 нарастает, арпеджио раскручивается, лид и колокольчики показывают тему
bI = max(-6.5, -T1 / G1.blen(0))
pad_line(G1, CLI, bI, 0, 0.55, lo=57, size=4, bright=0.5, att=1.4, rel=0.6, seed=1)
put("bass", 0.25, bass_note(38, G1.t(-2) - 0.25, tau=4.0, rel=0.3) * 0.55)
arp_run(G1, CLI, -6, -4, lambda b: 0.35 + 0.1 * (b + 6), step=0.5, lo=57)
arp_run(G1, CLI, -4, 0, lambda b: 0.55 + 0.11 * (b + 4), step=0.25, lo=57, k0=4)
bass_run(G1, CLI, -2, 0, vel=0.7)
INTRO_LEAD = "A4/1 F#5/.75 E5/.25 D5/1 B4/.75 A4/.25 | B4/.5 D5/.5 E5/1"
play(G1, -6, INTRO_LEAD, lambda m: pluck(m, "lead"), "lead", vel=0.85, pan=-0.1, beats=6)
play(G1, -6, INTRO_LEAD, lambda m: glock(m + 12), "bell", vel=0.42, pan=0.25, beats=6)
put("drum", G1.t(-1), cymbal(G1.t(0) - G1.t(-1), rev=True, seed=1) * 0.16)
mark("intro_theme", G1.t(-6))

# строфа 1: разгон
drums(G1, 0, 22.01, kicks=(0, 2), claps=(1, 3), kick_extra=(3.5, 11.5, 19.5))
drums(G1, 22.25, 23.0, kicks=(), claps=(), shk_vel=0.7)
bass_run(G1, CL1, 0, 22)
put("bass", G1.t(22), bass_note(low(9), G1.t(24) - G1.t(22), tau=1.4, rel=0.3) * 0.9)
k1 = arp_run(G1, CL1, 0, 24, lambda b: 0.85 if b < 22 else 0.85 - 0.25 * (b - 22) / 2)
pad_line(G1, CL1, 0, 24, 0.34, lo=57, size=4, bright=0.6, seed=10)
play(G1, 0, "F#5/2", lambda m: pluck(m, "lead"), "lead", vel=0.6, pan=-0.1)
play(G1, 0, "F#6/2", glock, "bell", vel=0.3, pan=0.25)
put("drum", G1.t(0), cymbal(1.8, seed=2) * 0.13)
t_sv = W("svetlo")
sparkle(t_sv + FRAME, [76, 81, 85, 88, 93], vel=0.55)          # «светло» — солнце бьёт в камеру
put("drum", t_sv + FRAME, cymbal(2.2, seed=3) * 0.15)
play(G1, 23, "A5/.25 C#6/.25 E6/.25 A6/.25", lambda m: pluck(m, "lead"), "lead", vel=0.55, pan=0.1)
mark("stanza1", G1.t(0))
mark("svetlo_sparkle", t_sv + FRAME)

# строфа 2: без бита — пэд, колокольчики, долгий бас
pad_line(G2, CL2, 0, 20, 0.5, lo=55, size=4, bright=0.5, att=0.7, rel=1.0, seed=20)
bass_long(G2, CL2, 0, 20, vel=0.5)
S2_BL = ("r/1 B5/.5 D6/.5 G6/1 F#6/1 | r/1 A5/.5 D6/.5 F#6/2 | r/1 G5/.5 B5/.5 E6/1 D6/1 | "
         "r/1 F#5/.5 A5/.5 D6/2 | r/4")
play(G2, 0, S2_BL, glock, "bell", vel=0.62, pan=0.3, beats=20)
t_cv = W("cvety")
sparkle(t_cv + FRAME, [81, 83, 86, 88, 90, 93], step=0.06, vel=0.5, pan=-0.1)   # «цветы» — цветы выскакивают
play(G2, 18, "C#6/.5 E6/.5 A6/1", glock, "bell", vel=0.55, pan=0.3)
arp_run(G2, CL2, 18, 20, lambda b: 0.25 + 0.6 * (b - 18) / 2, step=0.25, lo=57)          # раскрутка к строфе 3
drums(G2, 19, 20, kicks=(), claps=(), shk_vel=0.6)
put("drum", G2.t(19), cymbal(G2.t(20) - G2.t(19), rev=True, seed=4) * 0.16)
mark("stanza2", G2.t(0))
mark("cvety_sparkle", t_cv + FRAME)

# строфа 3: разгон, бочка на каждую долю
drums(G3, 0, 18.01, kicks=(0, 1, 2, 3), claps=(1, 3), vel=0.95)
bass_run(G3, CL3, 0, 18)
put("bass", G3.t(18), bass_note(low(9), G3.t(20) - G3.t(18), tau=1.2, rel=0.3) * 0.85)
arp_run(G3, CL3, 0, 20, lambda b: 0.88 if b < 18 else 0.88 - 0.35 * (b - 18) / 2)
pad_line(G3, CL3, 0, 20, 0.33, lo=57, size=4, bright=0.65, seed=30)
put("drum", G3.t(0), cymbal(1.8, seed=5) * 0.13)
t_zl = W("zolote")
sparkle(t_zl + FRAME, [78, 81, 86, 90], step=0.07, vel=0.4)                               # «в ярком золоте»
put("drum", G3.t(18), cymbal(G3.t(20) - G3.t(18), rev=True, seed=6) * 0.2)
play(G3, 19, "A5/.25 C#6/.25 E6/.25 A6/.25", lambda m: pluck(m, "lead"), "lead", vel=0.5, pan=0.1)
mark("stanza3", G3.t(0))

# строфа 4: «облака» — без бита, колокольчики падают терциями
pad_line(G4, CL4, 0, 20, 0.5, lo=62, size=4, bright=0.45, att=0.9, rel=1.1, seed=40)
bass_long(G4, CL4, 0, 20, vel=0.45)
S4_BL = ("r/1 F#6/1 D6/1 B5/1 | r/1 E6/1 C#6/1 A5/1 | r/1 D6/1 B5/1 G5/1 | r/1 D6/1 B5/1 F#5/1 | "
         "A5/.5 D6/.5 E6/.5 A6/.5 C#7/1 E7/1")
play(G4, 0, S4_BL, glock, "bell", vel=0.6, pan=-0.25, beats=20)
arp_run(G4, CL4, 18, 20, lambda b: 0.25 + 0.6 * (b - 18) / 2, step=0.25, lo=57)          # раскрутка к строфе 5
drums(G4, 19, 20, kicks=(), claps=(), shk_vel=0.6)
put("drum", G4.t(19), cymbal(G4.t(20) - G4.t(19), rev=True, seed=7) * 0.16)
mark("stanza4", G4.t(0))

# строфа 5: разгон
drums(G5, 0, 19.01, kicks=(0, 2), claps=(1, 3), kick_extra=(3.5, 11.5))
for b in (19.5,):
    put("drum", G5.t(b), clap(1) * 0.17, 0.05)
bass_run(G5, CL5, 0, 20)
arp_run(G5, CL5, 0, 20, 0.85)
pad_line(G5, CL5, 0, 20, 0.33, lo=57, size=4, bright=0.6, seed=50)
put("drum", G5.t(0), cymbal(1.8, seed=8) * 0.13)
for k, m in enumerate(voicing(9, (0, 4, 7, 10), 57, 4)):                                 # гармошка раздувает A7
    put("acc", G5.t(18), acc_note(m, G5.t(20) - G5.t(18) - 0.03, att=0.6 * (G5.t(20) - G5.t(18)), rel=0.05,
                                  seed=500 + m) * 0.75, -0.3 + 0.2 * k)
mark("stanza5", G5.t(0))

# строфа 6: пляска косцов до «Распевайте»
for b in range(16):
    rp, iv, bp = chord(chord_at(CL6, b))
    m = low(bp, 38) if b % 2 == 0 else low((bp + 7) % 12, 33)
    put("bass", G6.t(b), cut(pluck(m, "bassp"), 0.92 * G6.blen(b)) * (0.95 if b % 2 == 0 else 0.8))
    for k, n_ in enumerate(voicing(rp, iv, 62, 3)):
        put("acc", G6.t(b + 0.5), acc_note(n_, 0.5 * G6.blen(b), att=0.012, rel=0.05, seed=600 + b * 3 + k)
            * (0.7 if b % 2 else 0.6), -0.25 + 0.25 * k)
        put("bal", G6.t(b + 0.5) + 0.009 * k, pluck(n_ + 12, "bal") * 0.5, 0.3)
drums(G6, 0, 16, kicks=(0, 2), claps=(1, 3), step=0.5, jingle=True, shk_vel=0.9)
put("drum", G6.t(0), cymbal(1.6, seed=9) * 0.12)
mark("dance", G6.t(0))

# ночь: с «Распевайте» — тёплый бурдон, тихая гармошка, свирель поёт мотив
t_n0 = RASP - 0.03
t_n1 = G7.t(9)                                          # бурдон гаснет к концу 2-го такта колыбельной
for k, m in enumerate((38, 45, 50)):
    put("drn", t_n0, drone_note(m, t_n1 - t_n0, att=0.5, rel=1.6, seed=700 + m) * (1.0, 0.7, 0.5)[k], (0, -0.3, 0.3)[k])
for k, m in enumerate((62, 66, 69)):
    put("acc", t_n0 + 0.05, acc_note(m, G7.t(2) - t_n0, att=0.7, rel=1.2, seed=710 + m, beat=3.2) * 0.55,
        -0.3 + 0.3 * k)
NIGHT = "A5/2 B5/.5 A5/.5 F#5/1 E5/1 D5/2"
ns_, _ = parse(NIGHT)
GR = {1: 2}    # форшлаг на второй ноте
seq = [(G7.t(-7 + b), G7.t(-7 + b + d) - 0.012, m, 0.6 * (1 if k == 0 else 0.92), GR.get(k, 0))
       for k, (b, m, d) in enumerate(ns_)]
T0s, xs = svirel(seq, seed=11, rel=0.5)
put("svl", T0s, xs, 0.12)
mark("night", t_n0)
mark("night_svirel", seq[0][0])

# строфа 7: колыбельная 6/8 — шкатулка ведёт тему, мягкие переборы, бас на доли
S7_MB = "A5/3 F#6/2 E6/1 | D6/3 B5/2 A5/1 | B5/2 D6/1 G6/2 F#6/1 | E6/6 | B5/2 D6/1 E6/2 C#6/1 | D6/6"
play(G7, 0, S7_MB, mbox, "mbx", vel=0.8, pan=0.15, beats=36, accent=3)
for b in range(36):
    if b >= 33:
        break
    rp, iv, _ = chord(chord_at(CL7, b))
    r = low(rp, 47)
    m = (r, r + 7, r + 12, r + 12 + third(iv), r + 12, r + 7)[b % 6]
    put("soft", G7.t(b), pluck(m, "soft") * (0.8 if b % 3 == 0 else 0.6), -0.3 + 0.12 * (b % 6))
for c0, c1, s in CL7:
    _, _, bp = chord(s)
    for b in np.arange(c0, c1 - 1e-6, 3):
        put("bass", G7.t(b), bass_note(low(bp, 38), 2.6 * e7, tau=0.9, rel=0.3) * (0.62 if b % 6 == 0 else 0.45))
pad_line(G7, CL7, 0, 36, 0.36, lo=57, size=3, bright=0.45, att=0.8, rel=1.2, seed=70)
mark("lullaby", G7.t(0))

# финал: тема громче — свирель и шкатулка, D → G-D с замедлением, последний аккорд
FIN_SV = "A5/3 F#6/2 E6/1 | D6/6"
fs_, _ = parse(FIN_SV)
t_last = GF.t(12)
seqF = [(GF.t(b), GF.t(b + d) - 0.012, m, (0.68, 0.64, 0.61, 0.64)[k], (0, 2, 0, 0)[k]) for k, (b, m, d) in enumerate(fs_)]
seqF[-1] = (seqF[-1][0], min(TOTAL - 0.6, t_last + 0.9), seqF[-1][2], seqF[-1][3], 0)
T0f, xf = svirel(seqF, seed=12, rel=0.6)
put("svl", T0f, xf, 0.08)
play(GF, 0, "A4/3 F#5/2 E5/1 | D5/6", mbox, "mbx", vel=0.75, pan=-0.15, beats=12, accent=3)
for b in range(12):
    rp, iv, _ = chord(chord_at(CLF, b))
    r = low(rp, 47)
    m = (r, r + 7, r + 12, r + 12 + third(iv), r + 12, r + 7)[b % 6]
    put("soft", GF.t(b), pluck(m, "soft") * (0.75 if b % 3 == 0 else 0.55), -0.3 + 0.12 * (b % 6))
for c0, c1, s in CLF:
    _, _, bp = chord(s)
    put("bass", GF.t(c0), bass_note(low(bp, 38), GF.t(c1) - GF.t(c0), tau=1.4, rel=0.3) * 0.6)
pad_line(GF, CLF, 0, 12, 0.42, lo=57, size=4, bright=0.5, att=0.6, rel=0.8, seed=80)
rp, iv, _ = chord("D")
for k, m in enumerate(voicing(rp, iv, 50, 6)):
    put("soft", t_last + 0.03 * k, pluck(m, "soft") * 0.6, -0.4 + 0.16 * k)
put("bass", t_last, bass_note(38, TOTAL - t_last, tau=2.0, rel=0.2) * 0.65)
pad_line(Grid(t_last, TOTAL, 1), [(0, 1, "D")], 0, 1, 0.45, lo=50, size=5, bright=0.45, att=0.3, rel=0.2, seed=90,
         ext=0.0)
put("bell", t_last + 0.12, glock(86) * 0.45, 0.3)
put("bell", t_last + 0.3, glock(93) * 0.3, 0.45)
mark("fin_theme", GF.t(0))
mark("fin_chord", t_last)


# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=7000, pre=0.02):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60) * np.minimum(1, t / 0.01)
    ir = eq(ir, biquad("lp", lp, 0.6), biquad("hp", 200, 0.6))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = p2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


BUS["arp"] = eq(BUS["arp"], biquad("hp", 170, 0.7), biquad("lp", 8500, 0.6), biquad("peak", 3000, 1.0, -2.0))
BUS["lead"] = eq(BUS["lead"], biquad("hp", 220, 0.7), biquad("lp", 9000, 0.6))
BUS["pad"] = eq(BUS["pad"], biquad("lp", 2600, 0.6), biquad("hp", 120, 0.7))
BUS["bass"] = eq(BUS["bass"], biquad("lp", 900, 0.6), biquad("hp", 34, 0.7))
BUS["drum"] = eq(BUS["drum"], biquad("hp", 32, 0.7), biquad("lp", 11000, 0.7))
BUS["shk"] = eq(BUS["shk"], biquad("hp", 3000, 0.7))
BUS["bell"] = eq(BUS["bell"], biquad("hp", 700, 0.7))
BUS["acc"] = eq(BUS["acc"], biquad("lp", 3600, 0.6), biquad("peak", 1100, 1.0, 2.0), biquad("hp", 150, 0.7))
BUS["bal"] = eq(BUS["bal"], biquad("hp", 250, 0.7), biquad("lp", 9000, 0.7))
BUS["svl"] = eq(BUS["svl"], biquad("hp", 300, 0.7), biquad("lp", 10000, 0.7))
BUS["drn"] = eq(BUS["drn"], biquad("lp", 650, 0.6), biquad("hp", 34, 0.7))
BUS["mbx"] = eq(BUS["mbx"], biquad("hp", 300, 0.7))
BUS["soft"] = eq(BUS["soft"], biquad("hp", 110, 0.7), biquad("lp", 6000, 0.6))
IR_M = [make_ir(2.3, 3.2, 21), make_ir(2.3, 3.2, 22)]
WET = 0.32
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0] + BUS[k][1]) for k in BUSES)
music = sum(BUS[k] * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
music = eq(music, biquad("hp", 30, 0.7))

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


def s_takeoff(dur, tp, seed=101):
    """взлёт дрона: поток воздуха разгоняется — полоса шума и тонкий свист едут вверх, под ними низкий гул"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    sp = bump(t, tp, tp - 0.05, 0.55)
    fc = lambda tc: 260 + 1900 * bump(np.asarray(tc), tp, tp - 0.05, 0.6)
    out = []
    for ch in range(2):
        air = norm_std(tvf(g.standard_normal(n), band_sweep(fc, 0.75)))
        whis = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 1.7 * fc(tc) + 350, 0.06)))
        out.append(air + 0.22 * whis)
    rum = bandn(n, 60, 320, g) * (0.25 + 0.75 * sp)
    e = sp ** 1.3 * np.clip(t / 0.15, 0, 1)
    return fade_tail(np.stack([(out[0] + 0.4 * rum) * e, (out[1] + 0.4 * rum) * e]), 0.3)


def s_gust(seed=102):
    """порыв ветра: полоса едет вверх и вниз, свист верхних частот, уходит к горизонту (из центра вправо)"""
    g = np.random.default_rng(seed)
    dur, tp = 2.3, 0.45
    n = int(dur * SR)
    t = tt(n)
    sh = bump(t, tp, tp, 0.6)
    body = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 230 + 850 * bump(tc, tp, tp, 0.55), 0.9)))
    whis = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 950 + 1100 * bump(tc, tp + 0.05, tp, 0.5), 0.1)))
    y = (body + 0.2 * whis) * sh * (1 + 0.25 * slow(n, 8, g))
    return fade_tail(pan_curve(y, np.linspace(-0.1, 0.55, n)), 0.15)


def crane_call(f0, g):
    """«кур-лы»: раскатистый трубный слог (раскат ~26 Гц) и протяжный, повыше"""
    dur = 0.56
    n = int(dur * SR)
    t = tt(n)
    syl = ((0.0, 0.21, f0 * 0.93, f0 * 1.04, True), (0.25, 0.53, f0 * 1.24, f0 * 1.08, False))
    lf = np.full(n, np.log(f0))
    amp = np.zeros(n)
    for a, b, fa, fb, rr in syl:
        m = (t >= a) & (t < b)
        u = (t[m] - a) / (b - a)
        lf[m] = np.log(fa) + (np.log(fb) - np.log(fa)) * np.sin(0.5 * np.pi * u)
        e = np.sin(0.5 * np.pi * np.clip((t[m] - a) / 0.018, 0, 1)) ** 2 * np.cos(0.5 * np.pi * np.clip((t[m] - b + 0.05) / 0.05, 0, 1)) ** 2
        if rr:
            e = e * (1 - 0.75 * (0.5 + 0.5 * np.cos(2 * np.pi * 26 * (t[m] - a))))
        amp[m] = e * (1.0 if rr else 0.9)
    gap = (t >= 0.21) & (t < 0.25)
    lf[gap] = np.interp(t[gap], [0.21, 0.25], [np.log(syl[0][3]), np.log(syl[1][2])])
    f = np.exp(lf) * (1 + 0.004 * slow(n, 30, g))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.zeros(n)
    for k in range(1, 13):
        fk = np.exp(lf) * k
        a_k = 0.45 / k + 0.9 * np.exp(-((fk - 1500) / 850) ** 2)
        y += a_k * np.sin(k * ph + g.uniform(0, 6.28))
    y = y * amp + 0.03 * g.standard_normal(n) * amp
    return y


def s_cranes(offs, f0s, pans, vols, seed=103):
    g = np.random.default_rng(seed)
    dur = offs[-1] + 0.9
    n = int(dur * SR)
    out = np.zeros((2, n))
    for o, f0, p, v in zip(offs, f0s, pans, vols):
        y = crane_call(f0, g) * v
        i0 = int(o * SR)
        gl, gr = pan_gains(p)
        out[0, i0:i0 + len(y)] += y * gl
        out[1, i0:i0 + len(y)] += y * gr
    return eq(out, biquad("lp", 5200, 0.7), biquad("hp", 300, 0.7))


def s_brook(dur, seed=104):
    """ручей: россыпь пузырьков (короткие тона с подъёмом частоты) поверх шелеста воды"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for ch in range(2):
        tb = 0.0
        while True:
            tb += g.exponential(1 / 75)
            if tb > dur - 0.05:
                break
            f0 = np.exp(g.uniform(np.log(450), np.log(2600)))
            tau = g.uniform(0.005, 0.02)
            ln = int(6 * tau * SR)
            tl = tt(ln)
            f = f0 * (1 + g.uniform(0.3, 1.1) * tl / (6 * tau))
            b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tl / tau) * np.minimum(1, tl / 0.0008)
            i0 = int(tb * SR)
            k = min(ln, n - i0)
            out[ch, i0:i0 + k] += g.uniform(0.2, 1.0) ** 2 * b[:k]
    bed = np.stack([bandn(n, 350, 4500, g), bandn(n, 350, 4500, g)]) * 0.16 * (1 + 0.35 * slow(n, 6, g))
    e = np.clip(t / 0.12, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - 0.55)) / 0.55, 0, 1)) ** 2
    return (out + bed) * e


def s_dive(seed=105):
    """нырок в овраг: поток воздуха свистит вниз, по бокам шуршит трава, справа налево"""
    g = np.random.default_rng(seed)
    dur, tp = 1.7, 0.38
    n = int(dur * SR)
    t = tt(n)
    sh = bump(t, tp, tp, 0.45)
    body = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 420 + 1300 * np.exp(-np.maximum(tc, 0) / 0.5)
                                                         * np.clip(tc / tp, 0, 1) ** 0.5, 0.8)))
    rus = bandn(n, 2200, 9000, g)
    fl = np.abs(slow(n, 45, g))
    y = (body + 0.55 * rus * fl) * sh
    return fade_tail(pan_curve(y, np.linspace(0.5, -0.5, n)), 0.15)


def s_lark(dur, seed=106):
    """жаворонок: трели, взлёты и переливы 2,6–5,6 кГц, сыплются без остановки"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    f = np.full(n, 4000.0)
    a = np.zeros(n)
    i = 0

    def seg(ln, fc, amp):
        nonlocal i
        k = min(int(ln * SR), n - i)
        if k <= 0:
            return
        u = np.arange(k) / max(1, k - 1)
        f[i:i + k] = fc(u)
        a[i:i + k] = amp(u)
        i += k

    while i < n - int(0.05 * SR):
        kind = g.choice(["trill", "sweep", "warble", "note"], p=[0.4, 0.25, 0.2, 0.15])
        if kind == "trill":
            fA, fB = g.uniform(3200, 4200), g.uniform(4300, 5400)
            for j in range(int(g.integers(5, 11))):
                fx = fA if j % 2 else fB
                seg(0.022, lambda u, fx=fx: fx * (1 + 0.05 * u), lambda u: np.sin(np.pi * u) ** 0.7)
                seg(0.012, lambda u, fx=fx: np.full_like(u, fx), lambda u: 0 * u)
        elif kind == "sweep":
            f1, f2 = g.uniform(2600, 3200), g.uniform(4800, 5600)
            if g.random() < 0.4:
                f1, f2 = f2, f1
            seg(g.uniform(0.05, 0.09), lambda u: f1 + (f2 - f1) * u, lambda u: np.sin(np.pi * u) ** 0.5)
        elif kind == "warble":
            fc0 = g.uniform(3800, 4600)
            seg(g.uniform(0.1, 0.16), lambda u: fc0 + 550 * np.sin(2 * np.pi * 5 * u), lambda u: np.sin(np.pi * u) ** 0.4)
        else:
            fn_ = g.uniform(3600, 4800)
            seg(g.uniform(0.04, 0.07), lambda u: fn_ * (1 + 0.01 * np.sin(2 * np.pi * 3 * u)), lambda u: np.sin(np.pi * u) ** 0.6)
        seg(g.uniform(0.012, 0.035), lambda u: np.full_like(u, f[i - 1] if i else 4000.0), lambda u: 0 * u)
    sm = int(0.002 * SR)
    a = np.convolve(a, np.ones(sm) / sm, "same")
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.12 * np.sin(2 * ph)) * a
    t = tt(n)
    y *= np.clip(t / 0.06, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - 0.3)) / 0.3, 0, 1)) ** 2
    y = eq(y, biquad("lp", 7000, 0.7))
    return pan_curve(y, 0.1 + 0.15 * np.sin(2 * np.pi * 0.4 * t))


def s_scythe(seed):
    """взмах косы: свист лезвия (полоса вверх-вниз), хруст срезанной травы, лёгкий звон металла"""
    g = np.random.default_rng(seed)
    dur, tp = 0.75, 0.24
    n = int(dur * SR)
    t = tt(n)
    sh = bump(t, tp, 0.17, 0.09)
    sw = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 1300 + 4000 * bump(tc, tp, 0.17, 0.1), 0.45)))
    wh = norm_std(tvf(g.standard_normal(n), band_sweep(lambda tc: 2500 + 2200 * bump(tc, tp, 0.17, 0.1), 0.05)))
    cut = np.zeros(n)
    tc_ = tp - 0.05
    while tc_ < tp + 0.13:
        i0 = int(tc_ * SR)
        k = int(0.0015 * SR)
        cut[i0:i0 + k] += g.uniform(0.3, 1.0) * g.standard_normal(k) * np.exp(-tt(k) / 0.0005)
        tc_ += g.exponential(1 / 140)
    cut = eq(cut, biquad("hp", 2500, 0.7))
    ring = sum(a * np.sin(2 * np.pi * fr_ * t + g.uniform(0, 6)) for fr_, a in ((2350, 1), (3710, 0.6), (5230, 0.35)))
    ring = ring * (t > tp) * np.exp(-np.maximum(t - tp, 0) / 0.12) * 0.05
    y = (sw + 0.25 * wh) * sh + 1.6 * norm_std(cut) * 0.25 * sh + ring
    return fade_tail(y, 0.08)


def s_fire(dur, seed=107):
    """костёр: щелчки и треск поленьев поверх тёплого гула пламени"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    tc_ = 0.05
    while tc_ < dur - 0.05:
        big = g.random() < 0.15
        for _ in range(int(g.integers(2, 6)) if big else 1):
            ln = int(g.uniform(0.002, 0.009) * SR)
            tl = tt(ln)
            fa, fb = g.uniform(900, 5200), g.uniform(1800, 7500)
            pop = (np.sin(2 * np.pi * fa * tl) + 0.6 * np.sin(2 * np.pi * fb * tl) + 0.8 * g.standard_normal(ln)) \
                * np.exp(-tl / g.uniform(0.0006, 0.0025))
            amp = (g.pareto(2.2) + 0.3) * (1.6 if big else 1.0)
            p = g.uniform(-0.5, 0.5)
            gl, gr = pan_gains(p)
            i0 = int((tc_ + (g.uniform(0, 0.03) if big else 0)) * SR)
            k = min(ln, n - i0)
            out[0, i0:i0 + k] += pop[:k] * amp * gl
            out[1, i0:i0 + k] += pop[:k] * amp * gr
        tc_ += g.exponential(1 / 13)
    out = out / (np.max(np.abs(out)) + 1e-9)
    roar = bandn(n, 70, 480, g) * 0.22 * (1 + 0.5 * slow(n, 7, g))
    hiss = bandn(n, 2000, 7000, g) * 0.025 * (1 + 0.5 * slow(n, 11, g))
    e = np.clip(t / 0.35, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - 0.45)) / 0.45, 0, 1)) ** 2
    return (out + roar + hiss) * e


def s_fog(seed=108):
    """«вдох» тумана: мягкий воздушный шум раздувается и поднимается, потом выдыхает"""
    g = np.random.default_rng(seed)
    dur, tp = 2.2, 0.95
    n = int(dur * SR)
    t = tt(n)
    sh = bump(t, tp, 0.85, 0.5)
    fc = lambda tc: 260 + 1000 * bump(tc, tp, 0.85, 0.6)
    y = np.stack([norm_std(tvf(g.standard_normal(n), band_sweep(fc, 1.0))),
                  norm_std(tvf(g.standard_normal(n), band_sweep(fc, 1.0)))]) * sh
    return fade_tail(y, 0.2)


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


def place(name, what, t_ev, start, x, peaks=None, t_end=None, send=0.08, gain_db=0.0):
    """шум в ролик: громкость по SFX_DB (самое громкое окно), запись в журнал sfx.json"""
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    mov = k_loud(x)
    g = np.sqrt(vKMS * db(SFX_DB[name] + gain_db) ** 2 / max(float(mov.max()), 1e-20))
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
    rec["db"] = SFX_DB[name] + gain_db
    if name in BED:
        rec["bed"] = True
    rec["db_lines"] = round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None
    rec["t_loudest"] = r3(cen[int(np.argmax(mov))])
    SFX_LOG.append(rec)


def peak_at(x, win=None):
    x = stereo(x)
    envp = np.convolve(np.abs(x).sum(0), np.ones(330) / 330, "same")
    lim = len(envp) if win is None else int(win * SR)
    return int(np.argmax(envp[:lim])) / SR


def hit(name, what, t_ev, x, send=0.08, peak_win=None, gain_db=0.0):
    """разовый звук: его пик — на кадр позже события"""
    pk = peak_at(x, peak_win)
    place(name, what, t_ev, t_ev + FRAME - pk, x, peaks=[t_ev + FRAME], send=send, gain_db=gain_db)


# взлёт (../video/src/drone.js, TO): винты раскручиваются 0,25–1,0 с, отрыв 1,05 с, разгон с 1,95 с,
# дрон проносится мимо камеры ≈2,65 с, камера влетает в него к 3,85 с
TO_SPIN0, TO_SPIN1, TO_GO, TO_MERGE = 0.25, 1.0, 1.95, 3.85
T_TO = 2.65


def s_motor(dur, seed=111):
    """гул четырёх моторов: раскрутка 90 → 310 Гц, на пролёте мимо камеры тон чуть выше (доплер), потом ровный"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n) + TO_SPIN0
    spin = np.clip((t - TO_SPIN0) / (TO_SPIN1 - TO_SPIN0), 0, 1)
    spin = spin * spin * (3 - 2 * spin)
    f0 = 90 + 220 * spin + 45 * np.clip((t - TO_GO) / 0.7, 0, 1) + 40 * np.exp(-((t - T_TO) / 0.25) ** 2)
    out = np.zeros((2, n))
    for m, det in enumerate([1.0, 1.013, 0.987, 1.021]):
        ph = 2 * np.pi * np.cumsum(f0 * det) / SR + g.uniform(0, 6.28)
        v = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 7))
        pan = [0.6, 0.4, 0.55, 0.45][m]
        out[0] += v * pan
        out[1] += v * (1 - pan)
    hiss = bandn(n, 1800, 6000, g) * 0.25
    env = spin * (0.55 + 0.45 * np.exp(-((t - T_TO) / 0.45) ** 2)) * np.clip((TO_MERGE + 0.9 - t) / 0.9, 0, 1)
    return np.stack([(out[0] + hiss) * env, (out[1] + hiss) * env])


place("motor", "моторы квадрокоптера раскручиваются на снегу, он взлетает и проносится мимо камеры", TO_SPIN0, TO_SPIN0,
      s_motor(TO_MERGE + 0.9 - TO_SPIN0), peaks=[T_TO + FRAME], t_end=TO_MERGE + 0.9, send=0.06)
place("takeoff", "дрон проносится мимо камеры и разгоняется над снегом (свист воздуха)", T_TO, 1.6,
      s_takeoff(TO_MERGE + 0.4 - 1.6 + 0.6, T_TO + FRAME - 1.6), peaks=[T_TO + FRAME], t_end=TO_MERGE + 0.4,
      send=0.08)
hit("gust", "порыв ветра — волна таяния катится от дрона к горизонту («царство прошло»)", W("carstvo"), s_gust(),
    send=0.12)
CR_OFF, CR_F = [0.0, 0.58, 1.27], [560, 615, 525]
x_cr = s_cranes(CR_OFF, CR_F, [0.35, 0.55, 0.2], [1.0, 0.85, 0.7])
pk_cr = peak_at(x_cr, 0.5)
t_cr = W("zhuravli") + FRAME
place("cranes", "клин журавлей кричит «курлы» («Журавли караваном летят»)", W("zhuravli"), t_cr - pk_cr, x_cr,
      peaks=[t_cr + o for o in CR_OFF], send=0.3)
t_b0, t_b1 = W("ruchyi") + FRAME - 0.12, E(12) + 0.5
place("brook", "дрон над оврагом — внизу бежит блестящий ручей («ручьи по оврагам шумят»)", W("ruchyi"), t_b0,
      s_brook(t_b1 - t_b0), t_end=t_b1, send=0.1)
hit("dive", "дрон ныряет в овраг — шорох ветра и травы («по оврагам»)", W("ovragam"), s_dive(), send=0.1)
hit("lark", "жаворонок трепещет в небе, от него расходятся кольца звука («песни польются»)", W("pesni"),
    s_lark(2.6), send=0.3, peak_win=0.25)


# косцы: взмахи по ../video/src/mower.js — mowPose(…, t − L21 + 2, k): период 1,55 + 0,07k с, сдвиг фазы 0,31k;
# рез (коса идёт 50° → −50°) — u ∈ [0; 0,55), быстрее всего в середине, u = 0,275
def swings():
    out = []
    for k in range(3):
        per = 1.55 + 0.07 * k
        for c in range(-2, 12):
            t_ = L(21) - 2 + per * (c + 0.275 - 0.31 * k)
            if E(20) + 0.2 < t_ < RASP:
                out.append((t_, k))
    return sorted(out)


SW = swings()
pick = []
for wkey in ("kosoyu", "kostsam"):
    tw = W(wkey)
    best = min((s for s in SW if s not in pick), key=lambda s: abs(s[0] - tw))
    pick.append(best)
after = [s for s in SW if s[0] > pick[0][0] + 0.3 and s not in pick and s[0] < pick[1][0] - 0.5]
if after:
    pick.insert(1, after[0])
pick = sorted(pick)
for j, (ts, k) in enumerate(pick):
    word = "косою" if abs(ts - W("kosoyu")) <= abs(ts - W("kostsam")) else "косцам"
    hit("scythe", f"взмах косы, косец {k + 1} («{word}»)", ts, s_scythe(200 + j), send=0.08,
        gain_db=(0, -1.5, 0)[j % 3])
    SFX_LOG[-1]["name"] = f"scythe{j + 1}"
t_f0, t_f1 = RASP - 0.05, L(25) + 0.35
place("fire", "ночь: костёр, косцы поют у огня («Распевайте, косцы, по ночам»)", RASP, t_f0, s_fire(t_f1 - t_f0),
      t_end=L(25), send=0.06)
hit("fog", "туман заливает степь молочным покрывалом («под туманом»)", W("tumanom"), s_fog(), send=0.2)

IR_S = [make_ir(1.5, 2.2, 31, lp=6500), make_ir(1.5, 2.2, 32, lp=6500)]
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


lineG = [line_gain(i, SPEECH[i - 1]) for i in range(1, NL + 1)]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(0.4, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.25, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 2.5, TOTAL - FADE_OUT))]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0.0)] + [(FADE_IN * u, gI * np.sin(u * np.pi / 2) ** 2) for u in np.linspace(0.1, 1, 8)]
shape += [(L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i < NL and i in STANZA_END:
        gap = L(i + 1) - E(i)
        if gap > 0.45:
            r = min(0.22, gap / 3)
            gn = max(g, lineG[i])
            gl = float(np.clip(gFor([(E(i) + r, L(i + 1) - r)], GAP_DB[i]), gn, gn * db(GAP_CAP)))
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
srel = lambda chs, s: f1(dB(ms(chs, SPEECH[4 * s - 4:4 * s])) - dB(ms(VCH, SPEECH[4 * s - 4:4 * s])))
per_line = {str(i): lrel(SH, i) for i in range(1, NL + 1)}
per_line_all = {str(i): lrel(ALL, i) for i in range(1, NL + 1)}
per_st = {str(s): srel(SH, s) for s in range(1, 8)}
per_st_all = {str(s): srel(ALL, s) for s in range(1, 8)}
levels = {
    "note": "RMS, дБ к голосу; lines/stanzas — музыка без шумов к голосу тех же строк, *_all — музыка с шумами, "
            "остальное — музыка к среднему голосу в местах речи",
    "lines": per_line,
    "lines_all": per_line_all,
    "stanzas": per_st,
    "stanzas_all": per_st_all,
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
print(f"темп ♩: строфа 1 (и вступление) {bpm(G1):.0f}, 2 — {bpm(G2):.0f}, 3 — {bpm(G3):.0f}, 4 — {bpm(G4):.0f}, "
      f"5 — {bpm(G5):.0f}, 6 (пляска) — {bpm(G6):.0f}; колыбельная ♩. {60 / (3 * e7):.0f}, финал ♩. "
      f"{60 / (3 * GF.blen(0)):.0f}→{60 / (3 * GF.blen(11)):.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строфам, музыка без шумов | с шумами (дБ к голосу строф): "
      + " ".join(f"{s}:{per_st[s]}|{per_st_all[s]}" for s in per_st))
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
for k0 in range(0, NL, 8):
    print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in list(per_line)[k0:k0 + 8]))
print(f"заставка {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступл.": [(0.3, L(1))], "с1": [(L(1), B1)], "с2": [(B1, B2)], "с3": [(B2, B3)], "с4": [(B3, B4)],
       "с5": [(B4, B5)], "пляска": [(B5, RASP)], "ночь": [(RASP, B6)], "с7": [(B6, FIN)], "финал": W_FIN}
KB = {k: kweight(BUS[k]) for k in BUSES}
print("баланс шин (сухо, с BUS_G, K-взвешенно, дБ до формы громкости; тише −40 не показаны):")
for nm, wins in SEC.items():
    vals = [(k, dB(ms([KB[k][0], KB[k][1]], wins)) + 20 * np.log10(BUS_G[k])) for k in BUSES]
    print(f"  {nm}: " + ", ".join(f"{k} {f1(v)}" for k, v in vals if v > -40))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS, ограничитель {lim:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы (db — цель, db_lines — самое громкое окно на строке):")
for r in SFX_LOG:
    pk = r.get("peak", (r.get("peaks") or [r["start"]])[0])
    print(f"  {r['name']:8s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:6.1f}  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
