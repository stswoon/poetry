#!/usr/bin/env python3
"""Музыка и шумы к стиху А. А. Фета «Кот поёт, глаза прищуря…», стиль «аниме-чиби».

Своя колыбельная — музыкальная шкатулка в фа мажоре, 4/4, около 80 ударов в минуту. Мелодия и гармония свои,
ни на какую известную колыбельную не опираются. Инструменты — синтез (numpy):
  челеста — напев кота (шина cel);
  музыкальная шкатулка — «качающееся» сопровождение восьмыми (шина box), в бурю — редкие «снежинки» (шина sn);
  колокольчики — искры-♪ на «поёт», в паузах и в финале (шина gl);
  мягкий пэд (волновая таблица, три расстроенных голоса) — шина pad;
  тёплый низкий «мурлыкающий» бас: тон с пульсацией ~23 Гц и «вдохом-выдохом» (шина bs);
  посвист ветра в музыке — свисток со скольжением высоты на строках бури (шина wh).
План (секунды ролика берутся из events.json, доли — сетка G):
  0 … L1      вступление: пэд и мурлыканье с 0 с, затем такт шкатулки, челеста показывает мотив; F Bb/F C7;
  строфа 1    доли 0…12 (L1 … E4+0,1): F Dm Gm7 C, на доле 7 (≈ L3) — буря: подвешенный аккорд C9sus4 → C7sus4,
              шкатулка замолкает, падают «снежинки», свисток ветра; доля 12 — разрешение в F в паузе между строфами;
  строфа 2    доли 12…24 (… L9−0,15): F Bb Gm7 C7 Dm7 Gm7 C7 — слова мамы, в паузе — пробежка челесты к F;
  строфа 3    доли 24…38 (… fin): F Am7 Bb C («всё поёт» — искра колокольчиков), с L11 — снова буря до конца
              голоса, после голоса C7 и пробежка вверх, на fin — фа мажор вместе с финальным названием;
  fin … конец челеста повторяет мотив, последний аккорд F с колокольчиком, затухание.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке, LINE_DB), громче на заставке, в паузах
между строфами и в финале; под голосом у музыки ещё мягкий провал −3 дБ около 2,5 кГц (место для речи).
Шумы — синтез, мягкие и детские, только с причиной в кадре (таблица SFX_TABLE ниже), пик — на кадр позже события.
Громкость шума — самое громкое окно 100 мс (K-взвешенно, BS.1770) к самому громкому окну голоса той строки, на которую
шум попадает: под голосом на 6–10 дБ ниже.

Запуск: python3 make_music.py [--intro 3.4] [--outro 6.5] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json)
Читает events.json (его пишет ../video/build.py; при другом вступлении все события сдвигаются), ../timings.json
(длина голоса) и ../voice.mp3 (через ffmpeg — уровни строк). Пишет music.wav (44,1 кГц, 16 бит, стерео,
длина = вступление + голос + финал) и рядом sfx.json (шумы, уровни, ключевые моменты музыки). Нужны python3 + numpy, ffmpeg.
Проверка смеси с голосом — check_mix.py.
"""
import argparse
import json
import os
import re
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
LINE_DB = -19.0      # музыка (без шумов) к голосу той же строки, RMS
INTRO_DB = -9.0      # заставка, к среднему голосу
GAP_DB = -12.0       # паузы между строфами, к среднему голосу (не выше соседних строк на 9 дБ)
TAIL_DB = -11.0      # после голоса до fin
FIN_DB = -7.0        # финал
FADE_IN = 0.6        # нарастание в начале, с
FADE_OUT = 2.2       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
KW = 0.1             # окно 100 мс для пиков шумов и голоса
SP_MAX = -6.5        # пик отсчёта шума не выше пика отсчёта голоса тех же строк на столько дБ
DUCK_DB = 9.0        # долгие свисты под словами приседают на столько дБ (громче — между словами)

# ---------- шумы ----------
# t — время события в кадре: число (секунды от начала ролика) или «событие±сдвиг» из events.json (при другом
# вступлении сдвигается вместе с роликом); у долгих шумов — (начало, конец). В комментарии — время по умолчанию.
# Пик звука ставится на кадр позже события. db — самое громкое окно 100 мс шума к самому громкому окну голоса
# строки, на которую он попадает (вне строк — к типичному пику строки).
SFX_TABLE = [
    # имя            t                                db   что в кадре
    ("gust",        ("0", "1.6"),                     -9, "порыв ветра: дух бури пролетает мимо дома"),            # 0.00–1.60
    ("title_blink", "0.30",                          -10, "звонкая искра-«блинк»: выпрыгивает название"),         # 0.30
    ("whoosh_in",   "V0-0.10",                       -11, "мягкий «вжух» с искрой: камера влетает в окно"),        # 3.30
    ("whoosh_1",    "L2-0.117",                      -14, "лёгкий «вжух»: рывок камеры к мальчику"),               # 6.62
    ("whoosh_2",    "L3-0.115",                      -14, "лёгкий «вжух»: рывок камеры к окну"),                   # 8.87
    ("storm_whistle", ("svish4-0.045", "E4+0.084"),   -8, "дух бури свистит, рама дребезжит"),                     # 11.40–12.60
    ("door_creak",  "L5-0.513",                      -10, "дверь открывается — короткий мягкий скрип"),           # 13.15
    ("tail_swish",  "spryach+0.08",                  -11, "«фьють» — хвост кота метёт игрушки"),                  # 15.55
    ("toy_knock_1", "igrush+0.145",                  -11, "игрушка падает в короб — мягкий деревянный стук"),     # 16.00
    ("toy_knock_2", "igrush+0.265",                  -12, "вторая игрушка в коробе"),                             # 16.12
    ("toy_knock_3", "igrush+0.395",                  -11, "третья игрушка в коробе"),                             # 16.25
    ("bubble_pop",  "vstavai+0.05",                   -8, "«поп» — лопается пузырь сна («вставай!»)"),            # 16.645
    ("pop_puff",    "vstal+0.005",                    -8, "«поп-пуф» — мальчик вскакивает («встал»)"),            # 22.37
    ("door_close",  "poet2-0.175",                   -10, "дверь закрывается — мягкий хлопок"),                   # 25.95
    ("snow_1",      "sneg+0.03",                     -10, "клок снега шлёпается в стекло"),                       # 27.855
    ("snow_2",      "valit+0.03",                    -11, "второй клок снега"),                                   # 28.335
    ("snow_3",      "klok+0.03",                     -10, "третий клок снега"),                                   # 28.675
    ("gate_wind",   ("svish12-0.03", "E12-0.004"),   -10, "дух бури свистит у ворот"),                            # 30.10–31.20
    ("gate_creak_1", "svish12+0.22",                 -11, "калитка мотается — скрип"),                            # 30.35
    ("gate_creak_2", "vorot+0.17",                   -11, "калитка — второй скрип"),                              # 30.95
    ("fin_whoosh",  "fin-0.104",                     -10, "«вжух» — вылетает финальное название"),                # 32.10
    ("fin_sparkle", "fin-0.004",                      -7, "звонкий аккорд-искра на финальном названии"),          # 32.20
]

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Кот поёт, глаза прищуря…» Фета")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW.get('OUTRO')})")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV")
args = ap.parse_args()
V0 = args.intro if args.intro is not None else float(RAW["V0"])
OUTRO = args.outro if args.outro is not None else float(RAW["OUTRO"])
if V0 < 1.8:
    sys.exit("вступление короче 1,8 с: заставке не хватит места")

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
if FIN > TOTAL - 2.5:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
STANZA_END = (4, 8)
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


def at(expr):
    """«svish4-0.045», «V0-0.10», «0.30» → секунды ролика"""
    m = re.fullmatch(r"([A-Za-z]\w*)\s*([+-]\s*[\d.]+)?", expr.strip())
    if not m:
        return float(expr)
    if m.group(1) not in EV:
        sys.exit(f"шумы: нет события «{m.group(1)}» в events.json")
    return EV[m.group(1)] + (float(m.group(2).replace(" ", "")) if m.group(2) else 0.0)


rng = np.random.default_rng(1842)
f1 = lambda x: round(float(x), 1)
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


def damp(x, d, rel=0.12):
    """нота глушится через d с: гаснет за rel"""
    nd = int(max(0.0, d) * SR)
    if nd >= x.shape[-1]:
        return x
    m = min(x.shape[-1], nd + int(rel * 6 * SR))
    y = x[..., :m].copy()
    y[..., nd:] *= np.exp(-tt(m - nd) / rel)
    return fade_tail(y, 0.004)


def smooth(x, sec):
    """скользящее среднее (через накопленную сумму)"""
    k = max(1, int(sec * SR))
    c = np.cumsum(np.concatenate([np.full(k // 2, x[0]), x, np.full(k - k // 2, x[-1])]))
    return (c[k:] - c[:-k])[:len(x)] / k


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


def edge(t, dur, a, r):
    """огибающая: подъём a, спад r в конце"""
    return np.clip(t / max(a, 1e-4), 0, 1) * np.cos(0.5 * np.pi * np.clip((t - (dur - r)) / r, 0, 1)) ** 2


# ---------- инструменты ----------
_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


def tick(n, lo, hi, tau, g):
    """короткий шумовой щелчок в начале сигнала длины n"""
    k = min(int(n), int(0.03 * SR))
    y = np.zeros(int(n))
    y[:k] = bandn(k, lo, hi, g) * np.exp(-tt(k) / tau)
    return y


def celesta(m):
    """челеста: металлическая пластинка с резонатором — чистый основной тон, лёгкое биение, мягкий молоточек"""
    def mk():
        f = hz(m)
        tau = float(np.clip(1.5 * 2 ** (-(m - 84) / 18), 0.5, 2.4))
        n = int(min(4.0, 3.0 * tau + 0.3) * SR)
        t = tt(n)
        g = np.random.default_rng(int(m) * 13 + 5)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
        y += 0.45 * np.sin(2 * np.pi * f * 1.0011 * t + g.uniform(0, 6.28)) * np.exp(-t / (tau * 1.15))
        y += 0.16 * np.sin(2 * np.pi * 2 * f * t + 0.7) * np.exp(-t / (tau * 0.3))
        if 4.07 * f < 16000:
            y += 0.06 * np.sin(2 * np.pi * 4.07 * f * t) * np.exp(-t / 0.05)
        y += 0.05 * tick(n, 1500, 7000, 0.003, g)
        k = int(0.002 * SR)
        y[:k] *= np.linspace(0, 1, k)
        return fade_tail(y / np.max(np.abs(y)), 0.1)
    return cached(("cel", m), mk)


def mbox(m):
    """язычок музыкальной шкатулки: основной тон, звонкий обертон 5,93 f, щелчок штифта"""
    def mk():
        f = hz(m)
        tau = float(np.clip(1.0 * 2 ** (-(m - 79) / 20), 0.35, 1.6))
        n = int((3.0 * tau + 0.2) * SR)
        t = tt(n)
        g = np.random.default_rng(int(m) * 7 + 3)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
        y += 0.1 * np.sin(2 * np.pi * 2 * f * t + 0.3) * np.exp(-t / (0.3 * tau))
        if 5.93 * f < 17000:
            y += 0.16 * np.sin(2 * np.pi * 5.93 * f * t + 1.0) * np.exp(-t / 0.04)
        y += 0.1 * tick(n, 3000, 10000, 0.0015, g)
        k = int(0.0008 * SR)
        y[:k] *= np.linspace(0, 1, k)
        return fade_tail(y / np.max(np.abs(y)), 0.08)
    return cached(("box", m), mk)


def glock(m):
    """колокольчик: 1 : 2,76 : 5,4, лёгкое мерцание"""
    def mk():
        f = hz(m)
        tau = float(np.clip(1.1 * 2 ** (-(m - 91) / 24), 0.4, 1.6))
        n = int((3.2 * tau + 0.2) * SR)
        t = tt(n)
        g = np.random.default_rng(int(m) * 11 + 9)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
        y += 0.4 * np.sin(2 * np.pi * 1.0021 * f * t + g.uniform(0, 6.28)) * np.exp(-t / tau)
        if 2.76 * f < 18000:
            y += 0.3 * np.sin(2 * np.pi * 2.76 * f * t + 0.5) * np.exp(-t / (0.25 * tau))
        if 5.4 * f < 18000:
            y += 0.08 * np.sin(2 * np.pi * 5.4 * f * t + 1.2) * np.exp(-t / 0.06)
        k = int(0.001 * SR)
        y[:k] *= np.linspace(0, 1, k)
        return fade_tail(y / np.max(np.abs(y)), 0.1)
    return cached(("gl", m), mk)


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


def padnote(m, dur, att=0.35, rel=0.6, bright=0.8, wob=0.0, seed=0):
    """мягкий пэд: волновая таблица, три чуть расстроенных голоса; wob — «ветреное» колыхание громкости"""
    g = np.random.default_rng(seed)
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    h = int(np.clip(2600 * bright / f, 2, 30))
    tab = saw_table(h, round(0.2 / bright, 3))
    y = np.zeros(n)
    for c in (-6, 0, 5):
        fv = f * 2 ** ((c + g.uniform(-1.5, 1.5)) / 1200)
        v = 1 + 0.002 * np.sin(2 * np.pi * g.uniform(4.2, 5.2) * t + g.uniform(0, 6.28)) + 0.0008 * slow(n, 2, g)
        ph = (np.cumsum(fv * v) / SR + g.uniform(0, 1)) % 1.0
        y += np.interp(ph * TS, np.arange(TS + 1), tab)
    y /= 3
    env = np.ones(n)
    na, nd = int(att * SR), int(dur * SR)
    env[:na] = np.sin(0.5 * np.pi * np.arange(na) / na) ** 2
    nr = n - nd
    if nr > 0:
        env[nd:] *= np.cos(0.5 * np.pi * np.arange(nr) / nr) ** 2
    if wob:
        env *= np.clip(1 + wob * slow(n, 2.4, g), 0.3, 1.8)
    return y * env


def purr(m, dur, rel=0.3, depth=0.32, seed=0):
    """«мурлыкающий» бас: тёплый тон с пульсацией ~23 Гц, сила пульсации дышит (вдох-выдох)"""
    g = np.random.default_rng(seed)
    f = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.0015 * slow(n, 1.5, g))) / SR
    tone = np.sin(ph) + 0.4 * np.sin(2 * ph + 0.3) + 0.15 * np.sin(3 * ph + 1.1) + 0.05 * np.sin(4 * ph + 0.4)
    pp = 2 * np.pi * np.cumsum(23.0 * (1 + 0.05 * slow(n, 1.2, g))) / SR + g.uniform(0, 6.28)
    breath = 0.7 + 0.3 * np.sin(2 * np.pi * t / 1.7 + g.uniform(0, 6.28))
    am = 1 - depth * breath * (0.5 + 0.5 * np.cos(pp)) ** 2
    env = np.ones(n)
    na, nd = int(0.06 * SR), int(dur * SR)
    env[:na] = np.sin(0.5 * np.pi * np.arange(na) / na) ** 2
    nr = n - nd
    if nr > 0:
        env[nd:] *= np.cos(0.5 * np.pi * np.arange(nr) / nr) ** 2
    return tone * am * env


def whistle(keys, seed=0):
    """посвист ветра в музыке: keys — [(время, midi, громкость)], высота скользит; возвращает (t0, сигнал)"""
    g = np.random.default_rng(seed)
    T0, T1 = keys[0][0], keys[-1][0]
    n = int((T1 - T0) * SR)
    t = tt(n) + T0
    kt = [k[0] for k in keys]
    lf = smooth(np.interp(t, kt, [np.log(hz(k[1])) for k in keys]), 0.12)
    amp = smooth(np.interp(t, kt, [k[2] for k in keys]), 0.08)
    f = np.exp(lf) * (1 + 0.007 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - T0) / 0.4, 0, 1)
                      + 0.002 * slow(n, 4, g))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.06 * np.sin(2 * ph)
    breath = 0.18 * bandn(n, 1500, 6000, g)
    return T0, (sig + breath) * amp


# ---------- шины ----------
BUSES = ["cel", "box", "sn", "gl", "pad", "bs", "wh"]
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_G = {"cel": 0.42, "box": 0.32, "sn": 0.32, "gl": 0.16, "pad": 0.22, "bs": 0.21, "wh": 0.17}
BUS_SEND = {"cel": 0.35, "box": 0.28, "sn": 0.5, "gl": 0.45, "pad": 0.3, "bs": 0.04, "wh": 0.45}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += x[:, j0:j1] * g


class Grid:
    """сетка долей (четвертей): beats — номера долей подряд, times — их начала в секундах ролика"""

    def __init__(self, beats, times):
        self.b = np.asarray(beats, float)
        self.s = np.asarray(times, float)

    def t(self, b):
        return float(np.interp(b, self.b, self.s))

    def beat(self, t):
        return float(np.interp(t, self.s, self.b))

    def blen(self, b):
        return self.t(b + 1) - self.t(b)


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(s):
    return 12 * (int(s[-1]) + 1) + NOTE[s[0]] + s.count("#") - s.count("b")


def parse(txt):
    """«C6/1 A5/.5 r/.5 | …» → [(доля, midi, длина в долях)], всего долей"""
    out, b = [], 0.0
    for bar in txt.split("|"):
        for tok in bar.split():
            nm, d = tok.split("/")
            if nm != "r":
                out.append((b, midi(nm), float(d)))
            b += float(d)
    return out, b


QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "7sus4": (0, 5, 7, 10),
        "add9": (0, 2, 4, 7)}


def chord(sym):
    """«F», «Gm7», «Bb/F», «C7sus4» → (корень, интервалы, класс баса)"""
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


def low(pc, lo=36):
    return lo + (pc - lo) % 12


# ---------- сетка: доля 0 — «Кот» (L1), 12 — разрешение после бури (E4+0,1), 24 — L9−0,15, 38 — fin ----------
A12 = E(4) + 0.10
A24 = L(9) - 0.15
ANCH_B, ANCH_T = [0, 12, 24, 38], [L(1), A12, A24, FIN]
nbI = 4 * max(1, int((L(1) - 0.25) / 3.0))        # вступление: такт (или два, если вступление длинное)
bI = min(0.76, (L(1) - 0.25) / nbI)
bF = min(0.8, (TOTAL - FIN - 2.3) / 4)            # финал: такт мотива и последний аккорд
HAS_FIN_BAR = bF >= 0.68                       # иначе (короткий финал) — сразу последний аккорд на fin
gb, gt = [], []
for k in range(-nbI, 0):
    gb.append(k)
    gt.append(L(1) + k * bI)
for b in range(0, 39):
    gb.append(b)
    gt.append(float(np.interp(b, ANCH_B, ANCH_T)))
for k in range(1, 9):
    gb.append(38 + k)
    gt.append(FIN + k * (bF if HAS_FIN_BAR else 0.8))
G = Grid(gb, gt)
bpm = lambda b: 60 / G.blen(b)
for nm, (b0, b1) in {"строфа 1": (0, 12), "строфа 2": (12, 24), "строфа 3": (24, 38)}.items():
    tmp = 60 * (b1 - b0) / (G.t(b1) - G.t(b0))
    if not 70 <= tmp <= 92:
        print(f"внимание: {nm} — темп {tmp:.0f} ударов в минуту, партитура рассчитана на ~80")
for key, lo_, hi_ in (("L3", 6.5, 8.0), ("L5", 12.3, 14.5), ("L11", 30.5, 32.5), ("E12", 35.5, 37.6)):
    bb = G.beat(EV[key])
    if not lo_ <= bb <= hi_:
        print(f"внимание: {key} на доле {bb:.2f}, партитура ждёт {lo_}…{hi_} — проверь бурю и паузы")

# ---------- партитура ----------
B_S1 = 7.0                                       # буря 1: с доли 7 (≈ L3) до 12
B_S2 = round(2 * G.beat(L(11) - 0.05)) / 2        # буря 2: с L11 (по полдоли) до доли 37 (C7)
B_S2 = float(np.clip(B_S2, 31.0, 32.0))
B_C7 = 37.0
CALM = [(-nbI, -2, "F"), (-2, -1, "Bb/F"), (-1, 0, "C7"),
        (0, 2, "F"), (2, 4, "Dm"),
        (4, 6, "Gm7"), (6, B_S1, "C"),
        (12, 14, "F"), (14, 16, "Bb"),
        (16, 18, "Gm7"), (18, 20, "C7"),
        (20, 22, "Dm7"), (22, 23, "Gm7"), (23, 24, "C7"),
        (24, 26, "F"), (26, 28, "Am7"),
        (28, 30, "Bb"), (30, B_S2, "C"),
        (B_C7, 38, "C7")]
if HAS_FIN_BAR:
    CALM += [(38, 40, "F"), (40, 42, "C7")]
B_END = 42 if HAS_FIN_BAR else 38                 # последний аккорд
STORMS = [(B_S1, 12, [(B_S1, 10, [48, 55, 58, 62, 65]), (10, 12, [48, 53, 55, 58, 65])]),
          (B_S2, B_C7, [(B_S2, 34, [48, 55, 58, 62, 65]), (34, B_C7, [48, 53, 55, 58, 65])])]
MEL = [(-4, "A5/.5 C6/.5 F6/1 D6/.5 C6/.5 Bb5/1"),
       (0, "A5/1 C6/.5 F6/.5 F6/1 D6/.5 A5/.5"),
       (4, "Bb5/1 D6/.5 F6/.5 E6/1"),
       (12, "A5/.5 C6/.5 F6/1 D6/1 Bb5/.5 D6/.5"),
       (16, "D6/1 Bb5/.5 G5/.5 E5/1 G5/.5 Bb5/.5"),
       (20, "A5/1.5 F5/.5 G5/.5 Bb5/.5 C6/.25 E6/.25 G6/.25 Bb6/.25"),
       (24, "A6/1.5 F6/.5 E6/1 C6/1"),
       (28, "D6/1 F6/.5 D6/.5 E6/1 G6/1"),
       (B_C7, "G5/.25 Bb5/.25 C6/.25 E6/.25")]
if HAS_FIN_BAR:
    MEL.append((38, "F6/1 C6/.5 A5/.5 Bb5/.5 C6/.5 E6/.5 G6/.5"))


def melody(b0, txt, vel=1.0, pan=0.18):
    notes, _ = parse(txt)
    for b, m, d in notes:
        t0 = G.t(b0 + b)
        hold = G.t(b0 + b + d) - t0 + 0.35
        accent = 1.0 if abs((b0 + b) % 1) < 1e-6 else 0.82
        put("cel", t0, damp(celesta(m), hold, 0.25) * vel * accent, pan + 0.02 * (m - 84) / 6)


def rock(b0, b1, sym, vel=1.0, pan=-0.22):
    """шкатулка качает восьмыми: нижний — верхний — средний — верхний"""
    rp, iv, _ = chord(sym)
    v = voicing(rp, iv, 69, 4)
    pat = [v[0], v[2], v[1], v[2]]
    vel_pat = [0.95, 0.55, 0.75, 0.55]
    k = 0
    b = b0
    while b < b1 - 1e-6:
        m = pat[k % 4]
        if k % 8 == 7:
            m = v[3]
        put("box", G.t(b), mbox(m) * vel * vel_pat[k % 4], pan + 0.05 * ((m - 76) / 6))
        b += 0.5
        k += 1


def padchord(t0, t1, notes, vel, att=0.35, rel=0.7, bright=0.8, wob=0.0, seed=0):
    for k, m in enumerate(notes):
        put("pad", t0, padnote(m, t1 - t0, att=att, rel=rel, bright=bright, wob=wob, seed=seed * 17 + m) * vel,
            -0.45 + 0.9 * k / max(1, len(notes) - 1))


def bassnote(t0, t1, m, vel=1.0, depth=0.32, seed=0):
    put("bs", t0, purr(m, t1 - t0, rel=0.35, depth=depth, seed=seed) * vel)


# спокойные такты: пэд, мурлыкающий бас, шкатулка
for i, (b0, b1, sym) in enumerate(CALM):
    rp, iv, bp = chord(sym)
    t0 = 0.0 if i == 0 else G.t(b0)
    t1 = G.t(b1)
    padchord(t0, t1 + 0.12, voicing(rp, iv, 55, 4), 0.55 if b0 >= 0 else 0.6, att=0.6 if i == 0 else 0.3,
             seed=i)
    bassnote(t0, t1 + 0.05, low(bp), vel=0.95, seed=i)
    rock(max(b0, -4), b1, sym, vel=0.85 if b0 < 0 or b0 >= 38 else 0.75)
mark("intro_box", G.t(-4))
mark("stanza1", G.t(0))

# буря: подвешенный аккорд (пэд колышется), бас держит до, шкатулка молчит — падают «снежинки», свисток ветра
SNOW_HI = {0: [98, 94, 89, 96, 91], 1: [96, 91, 89, 94, 84]}
for si, (s0, s1, parts) in enumerate(STORMS):
    for k, (p0, p1, notes) in enumerate(parts):
        t0 = G.t(p0) - (0.12 if k == 0 else 0.0)
        padchord(t0, G.t(p1) + 0.15, notes, 0.62, att=0.45 if k == 0 else 0.25, bright=1.05, wob=0.28,
                 seed=100 + 10 * si + k)
    bassnote(G.t(s0) - 0.05, G.t(s1) + 0.05, 36, vel=0.9, depth=0.26, seed=50 + si)
    g = np.random.default_rng(300 + si)
    b = s0 + 0.25
    j = 0
    while b < s1 - 0.4:
        part = [p for p in parts if p[0] <= b < p[1]][0]
        pcs = {m % 12 for m in part[2]}
        hi = [m for m in SNOW_HI[j % 2] if m % 12 in pcs] or [96]
        m = int(hi[g.integers(0, len(hi))])
        put("sn", G.t(b), mbox(m) * g.uniform(0.45, 0.8), g.uniform(-0.6, 0.6))
        b += float(g.choice([0.5, 0.75, 1.0, 1.25]))
        j += 1
mark("storm1", G.t(B_S1))
mark("storm1_resolve", G.t(12))
mark("storm2", G.t(B_S2))
mark("storm2_C7", G.t(B_C7))

# посвист ветра в музыке (без наложения на свист-шумы 11,4–12,6 и 30,1–31,2)
WH = [[(7.3, "G5", 0), (7.8, "G5", 1), (8.7, "C6", 1), (9.5, "Bb5", 0.75), (10.0, "Bb5", 0)],
      [(B_S2 + 0.5, "G5", 0), (B_S2 + 1.0, "G5", 1), (B_S2 + 1.9, "C6", 1), (B_S2 + 2.7, "Bb5", 0.7),
       (B_S2 + 3.2, "Bb5", 0)]]
for k, keys in enumerate(WH):
    T0, x = whistle([(G.t(b), midi(n), a) for b, n, a in keys], seed=70 + k)
    put("wh", T0, pan_curve(x, np.linspace(-0.5, 0.5, len(x)) * (1 if k == 0 else -1)))
mark("whistle1", G.t(WH[0][0][0]))
mark("whistle2", G.t(WH[1][0][0]))

# напев кота — челеста
for b0, txt in MEL:
    if b0 < -nbI:
        continue
    melody(b0, txt, vel=1.0)

# колокольчики-искры: «поёт» (♪), разрешение после бури, пробежки в паузе, финал
for t_, ms_, v_ in ((W("poet1") + 0.02, [93, 96], 0.6), (G.t(12), [93], 0.45), (W("poet2") + 0.02, [96, 100], 0.6)):
    for k, m in enumerate(ms_):
        put("gl", t_ + 0.07 * k, glock(m) * v_, 0.35 - 0.1 * k)
for b in (23.0, B_C7):                            # пробежки челесты вверх — колокольчики эхом на октаву выше
    for k, m in enumerate([79, 82, 84, 88] if b == B_C7 else [84, 88, 91, 94]):
        put("gl", G.t(b + 0.25 * k) + 0.01, glock(m + 12) * 0.28, 0.4)
mark("gap2_run", G.t(23))
mark("poet2_sparkle", W("poet2"))

# финал: на fin — фа мажор, мотив челесты, последний аккорд F(add9) с колокольчиками
t_last = G.t(B_END)
mark("fin_chord", FIN)
mark("last_chord", t_last)
put("gl", FIN + 0.01, glock(89) * 0.45, 0.3)
put("gl", FIN + 0.06, glock(93) * 0.35, 0.4)
padchord(t_last, TOTAL, [53, 57, 60, 65, 67, 69], 0.5, att=0.25, rel=0.3, seed=200)
bassnote(t_last, TOTAL - 0.2, 41, vel=0.95, seed=201)
put("cel", t_last, celesta(89) * 0.95, 0.15)
put("cel", t_last + 0.03, celesta(81) * 0.5, 0.1)
for k, m in enumerate([77, 81, 84, 89, 93]):    # шкатулка прокатывает аккорд
    put("box", t_last + 0.09 * k, mbox(m) * (0.7 - 0.06 * k), -0.3 + 0.12 * k)
for k, m in enumerate([101, 96, 105]):
    put("gl", t_last + 0.25 + 0.12 * k, glock(m) * (0.4 - 0.08 * k), 0.35 - 0.2 * k)


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


BUS["cel"] = eq(BUS["cel"], biquad("hp", 300, 0.7), biquad("lp", 9000, 0.7))
BUS["box"] = eq(BUS["box"], biquad("hp", 380, 0.7), biquad("lp", 8000, 0.7))
BUS["sn"] = eq(BUS["sn"], biquad("hp", 700, 0.7), biquad("lp", 9000, 0.7))
BUS["gl"] = eq(BUS["gl"], biquad("hp", 1000, 0.7))
BUS["pad"] = eq(BUS["pad"], biquad("hp", 120, 0.7), biquad("lp", 2400, 0.6))
BUS["bs"] = eq(BUS["bs"], biquad("lp", 700, 0.6), biquad("hp", 36, 0.7))
BUS["wh"] = eq(BUS["wh"], biquad("hp", 400, 0.7), biquad("lp", 6000, 0.7))
IR_M = [make_ir(2.0, 3.0, 21), make_ir(2.0, 3.0, 22)]
WET = 0.32
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


def mov_power(p):
    """скользящая средняя мощность в окне KW; индекс — начало окна"""
    w = int(KW * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    return (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])


VCH = [vfull, vfull]                      # в ролике голос моно идёт в оба канала
vMS = ms(VCH, SPEECH)
kv = kweight(vfull)
V_MOV = mov_power(2 * kv ** 2)            # K-взвешенно, оба канала
V_CEN = (np.arange(len(V_MOV)) + KW * SR / 2) / SR
VPK = []                                  # самое громкое окно 100 мс голоса в каждой строке
VSP = []                                  # пик отсчёта голоса в строке
for a_, b_ in SPEECH:
    sel = (V_CEN >= a_) & (V_CEN <= b_)
    VPK.append(float(V_MOV[sel].max()))
    VSP.append(float(np.max(np.abs(vfull[int(a_ * SR):int(b_ * SR)]))))
VPK_MED = float(np.median(VPK))
VSP_MED = float(np.median(VSP))

dip = eq(music, biquad("peak", 2500, 0.8, DIP_DB))   # провал около 2,5 кГц под голосом — речи просторнее
music = music + ACT * (dip - music)

# ---------- шумы: синтез ----------
SFX = np.zeros((2, N))
SFX_SEND = np.zeros(N)
SFX_LOG = []


def s_gust(dur, seed=1):
    """порыв ветра: дух бури пролетает мимо — полоса шума вздымается и опадает, слева направо, с лёгким посвистом"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    tp = 0.42 * dur
    sh = bump(t, tp, tp * 0.9, (dur - tp) / 3.0) * edge(t, dur, 0.02, 0.35)
    body = tvf(g.standard_normal(n), band_sweep(lambda tc: 330 + 1000 * bump(tc, tp, tp, 0.45), 0.9))
    whis = tvf(g.standard_normal(n), band_sweep(lambda tc: 820 + 650 * bump(tc, tp + 0.05, tp, 0.5), 0.09))
    y = (body / np.std(body) + 0.3 * whis / np.std(whis)) * sh * (1 + 0.15 * slow(n, 7, g))
    return pan_curve(y, np.linspace(-0.7, 0.7, n))


def sparkles(n, notes, t0, step, vel, g):
    """россыпь колокольчиков и шуршание искр"""
    y = np.zeros(n)
    for k, m in enumerate(notes):
        i0 = int((t0 + k * step) * SR)
        x = glock(m)
        j = min(n - i0, len(x))
        if j > 0:
            y[i0:i0 + j] += x[:j] * vel * (1 - 0.15 * k)
    t = tt(n)
    y += 0.12 * vel * bandn(n, 5500, 12000, g) * bump(t, t0 + 0.03, 0.03, 0.18)
    return y


def s_blink(seed=2):
    """«блинк»: короткий взлёт тона, звонкая пара колокольчиков, искорки"""
    g = np.random.default_rng(seed)
    n = int(1.2 * SR)
    t = tt(n)
    f = 1400 * 2 ** np.minimum(t / 0.05, 1.0)
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    y = 0.6 * chirp + sparkles(n, [96, 101], 0.012, 0.05, 0.8, g)
    k = int(0.002 * SR)
    y[:k] *= np.linspace(0, 1, k)
    return pan_curve(y, 0.15 + 0.1 * np.sin(2 * np.pi * 3 * t))


def s_whoosh(dur, tp, lo, hi, bw, pan=(-0.5, 0.5), spark=None, seed=3):
    """«вжух»: полоса шума скользит вверх к пику и опадает; spark — искры-колокольчики после пика"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    body = tvf(g.standard_normal(n), band_sweep(lambda tc: lo + (hi - lo) * bump(tc, tp, tp, (dur - tp) / 3), bw))
    y = body / np.std(body) * bump(t, tp, tp, (dur - tp) / 3.5) * edge(t, dur, 0.01, 0.1)
    if spark:
        y = y + sparkles(n, spark, tp + 0.02, 0.06, 0.55, g)
    return pan_curve(y, np.linspace(pan[0], pan[1], n))


def rattle(n, spans, g, rate=21.0):
    """дребезг рамы: частые мягкие деревянно-стеклянные щелчки в отрезках spans [(начало, конец)]"""
    y = np.zeros(n)
    for a_, b_ in spans:
        tk = a_
        while tk < b_:
            i0 = int(tk * SR)
            k = min(n - i0, int(0.03 * SR))
            if k <= 0:
                break
            tl = tt(k)
            fr = g.uniform(1700, 2500)
            amp = np.sin(np.pi * (tk - a_) / (b_ - a_)) * g.uniform(0.5, 1.0)
            y[i0:i0 + k] += amp * (np.sin(2 * np.pi * fr * tl) * np.exp(-tl / 0.004)
                                   + 0.7 * np.sin(2 * np.pi * 620 * tl) * np.exp(-tl / 0.007))
            tk += (1 + g.uniform(-0.3, 0.3)) / rate
    return y


def s_whistle(dur, keys_f, rattle_spans=(), tone=0.55, seed=4):
    """свист ветра: тон «фью-ууу» с дрожанием, вокруг — дыхание ветра; при желании дребезжит рама"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    kx = np.linspace(0, dur, len(keys_f))
    lf = smooth(np.interp(t, kx, np.log(keys_f)), 0.1)
    f = np.exp(lf) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t) + 0.006 * slow(n, 6, g))
    env = edge(t, dur, 0.12, 0.3) * (0.85 + 0.15 * slow(n, 3, g))
    tn = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.08 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    fc_track = lambda tc: np.exp(np.interp(tc, t, lf))
    breath = tvf(g.standard_normal(n), band_sweep(fc_track, 0.22))
    wind = bandn(n, 350, 2200, g)
    y = (tone * tn + 0.5 * breath / np.std(breath) + 0.35 * wind) * env
    if rattle_spans:
        y = y + 0.22 * rattle(n, rattle_spans, g)
    y = eq(y, biquad("lp", 5000, 0.7))
    return pan_curve(y, 0.35 * np.sin(2 * np.pi * t / dur - 1.2))


def s_creak(dur=0.45, rates=(55, 120, 80), modes=((480, 0.012), (1150, 0.008), (2300, 0.005)), seed=5):
    """скрип дерева: «прилипание-срыв» — серия толчков с меняющейся частотой через резонансы доски"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    rate = np.interp(t, np.linspace(0, dur, len(rates)), rates) * (1 + 0.08 * slow(n, 30, g))
    ph = np.cumsum(rate) / SR
    exc = np.zeros(n)
    hits = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    exc[hits] = g.uniform(0.6, 1.0, len(hits))
    k = int(0.05 * SR)
    tl = tt(k)
    ir = sum(np.sin(2 * np.pi * fm * tl) * np.exp(-tl / tau) * (1.0 / (1 + i)) for i, (fm, tau) in enumerate(modes))
    y = convolve(exc, ir) + 0.05 * bandn(n, 800, 3000, g) * (exc.cumsum() > 0)
    y = eq(y * edge(t, dur, 0.05, 0.14), biquad("lp", 3500, 0.7))
    return y


def s_swish(dur=0.32, seed=6):
    """«фьють» хвоста: быстрый свисток вверх-вниз и шорох"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    tp = 0.09
    f = np.where(t < tp, 700 * (2000 / 700) ** (t / tp), 2000 * (1100 / 2000) ** ((t - tp) / (dur - tp)))
    tn = np.sin(2 * np.pi * np.cumsum(f) / SR)
    nz = tvf(g.standard_normal(n), band_sweep(lambda tc: 1500 + 2500 * bump(tc, tp, tp, 0.08), 0.6))
    env = bump(t, tp, 0.07, 0.07) * edge(t, dur, 0.005, 0.05)
    y = (0.45 * tn + nz / np.std(nz)) * env
    return pan_curve(y, np.linspace(0.5, -0.4, n))


def s_knock(f0, seed=7):
    """мягкий деревянный стук игрушки в коробе: моды бруска + гул короба + щелчок"""
    g = np.random.default_rng(seed)
    n = int(0.3 * SR)
    t = tt(n)
    y = (np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.035) + 0.45 * np.sin(2 * np.pi * 2.45 * f0 * t + 0.4)
         * np.exp(-t / 0.02) + 0.2 * np.sin(2 * np.pi * 3.9 * f0 * t + 1.0) * np.exp(-t / 0.01)
         + 0.55 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05))
    y += 0.3 * tick(n, 1500, 6000, 0.0015, g)
    k = int(0.0005 * SR)
    y[:k] *= np.linspace(0, 1, k)
    return fade_tail(eq(y, biquad("lp", 4500, 0.7)), 0.05)


def s_pop(f_lo, f_hi, ring=93, seed=8):
    """«поп»: «блуп» с быстрым взлётом тона, щелчок, звонкий хвостик колокольчика"""
    g = np.random.default_rng(seed)
    n = int(0.9 * SR)
    t = tt(n)
    f = f_lo + (f_hi - f_lo) * (1 - np.exp(-t / 0.012))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    y = body + 0.35 * tick(n, 1200, 6000, 0.002, g)
    if ring:
        i0 = int(0.012 * SR)
        x = glock(ring)
        j = min(n - i0, len(x))
        y[i0:i0 + j] += 0.3 * x[:j]
        y += 0.06 * bandn(n, 6000, 12000, g) * bump(t, 0.03, 0.02, 0.12)
    k = int(0.001 * SR)
    y[:k] *= np.linspace(0, 1, k)
    return fade_tail(y, 0.1)


def s_pop_puff(seed=9):
    """«поп-пуф»: поп и следом мягкий выдох-пуф"""
    g = np.random.default_rng(seed)
    n = int(0.9 * SR)
    t = tt(n)
    y = s_pop(300, 950, ring=88, seed=seed)
    puff = bandn(n, 150, 1500, g) * bump(t, 0.07, 0.025, 0.12)
    y = y + 0.55 * puff
    return pan_curve(y, np.linspace(-0.1, 0.25, n))


def s_thud(seed=10):
    """мягкий хлопок закрывшейся двери: низкий глухой удар, приглушённый шум и тихий щелчок защёлки"""
    g = np.random.default_rng(seed)
    n = int(0.7 * SR)
    t = tt(n)
    f = 95 * (1 - 0.2 * np.minimum(t / 0.1, 1))
    y = (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) + 0.5 * np.sin(2 * np.pi * 170 * t + 0.5)
         * np.exp(-t / 0.06) + 0.6 * bandn(n, 60, 900, g) * np.exp(-t / 0.035))
    i0 = int(0.045 * SR)
    k = int(0.03 * SR)
    tl = tt(k)
    y[i0:i0 + k] += 0.15 * np.sin(2 * np.pi * 1800 * tl) * np.exp(-tl / 0.006)
    a = int(0.005 * SR)
    y[:a] *= np.linspace(0, 1, a)
    return fade_tail(y, 0.1)


def s_splat(seed=11):
    """мягкий шлепок снега в стекло: шумовой «плюх», за ним «хлюп», глухой удар и тонкий стеклянный тик"""
    g = np.random.default_rng(seed)
    n = int(0.4 * SR)
    t = tt(n)
    y = bandn(n, 350, 3200, g) * np.exp(-t / 0.05)
    y += 0.5 * bandn(n, 600, 2500, g) * bump(t, 0.035, 0.012, 0.04) * (t > 0.02)
    y += 0.35 * np.sin(2 * np.pi * 130 * t) * np.exp(-t / 0.04)
    y += 0.08 * np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.015)
    a = int(0.006 * SR)
    y[:a] *= np.linspace(0, 1, a)
    y = eq(y, biquad("lp", 4000, 0.7))
    return fade_tail(y, 0.05)


def s_hinge(dur=0.38, fs=(650, 980, 820), seed=12):
    """скрип калитки: мягкий металлический писк с шероховатостью «прилипания»"""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    f = np.interp(t, np.linspace(0, dur, len(fs)), fs) * (1 + 0.01 * slow(n, 20, g))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tn = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    rough = (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(45 * (1 + 0.1 * slow(n, 15, g))) / SR)) ** 3
    y = tn * (0.35 + 0.65 * rough) * edge(t, dur, 0.05, 0.12)
    return eq(y, biquad("lp", 4000, 0.7))


def s_fin_sparkle(seed=13):
    """звонкий аккорд-искра: быстрое арпеджио колокольчиков фа мажора и шуршание искр"""
    g = np.random.default_rng(seed)
    n = int(2.2 * SR)
    t = tt(n)
    y = np.zeros(n)
    for k, m in enumerate([89, 93, 96, 101]):
        i0 = int(0.025 * k * SR)
        x = glock(m)
        j = min(n - i0, len(x))
        y[i0:i0 + j] += x[:j] * (1 - 0.1 * k)
    y += 0.2 * bandn(n, 5000, 11000, g) * bump(t, 0.05, 0.02, 0.35)
    return pan_curve(y, 0.25 * np.sin(2 * np.pi * 1.5 * t))


def soft(y, drive=2.5):
    """мягкое сглаживание пиков (tanh): у коротких ударов меньше пик-фактор, звук тот же по громкости"""
    pk = float(np.max(np.abs(y)))
    return np.tanh(drive * y / pk) / np.tanh(drive) * pk


def k_mov(x):
    """скользящая мощность 100 мс (оба канала, K-взвешенно)"""
    kx = np.stack([kweight(c) for c in x])
    return mov_power((kx ** 2).sum(0))


def audible(x, st):
    env = np.abs(stereo(x)).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    return st + act[0] / SR, st + act[-1] / SR


V_ENV = np.sqrt(smooth(vfull ** 2, 0.03))           # огибающая голоса для приседания долгих свистов
V_ENV_REF = float(np.percentile(V_ENV[ACT > 0.5], 90))


def place(name, dbt, what, t_ev, start, x, peaks=None, t_end=None, send=0.1, duck=False):
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    j0, j1 = max(0, -i0), min(n_, N - i0)
    if duck:                                       # под словами тише, между словами — громче
        dk = np.ones(n_)
        dk[j0:j1] = db(-DUCK_DB * np.clip(V_ENV[i0 + j0:i0 + j1] / (0.5 * V_ENV_REF), 0, 1))
        x *= smooth(dk, 0.06)
    a_, b_ = audible(x, start)
    over = [i for i, (la, lb) in enumerate(SPEECH) if a_ < lb and b_ > la]
    ref = max(VPK[i] for i in over) if over else VPK_MED
    vsp = max(VSP[i] for i in over) if over else VSP_MED
    mov = k_mov(x)
    g_win = np.sqrt(ref * db(dbt) ** 2 / max(float(mov.max()), 1e-20))
    g_smp = vsp * db(SP_MAX) / max(float(np.max(np.abs(x))), 1e-20)
    g = min(g_win, g_smp)
    x *= g
    mov = mov * g * g
    SFX[:, i0 + j0:i0 + j1] += x[:, j0:j1]
    SFX_SEND[i0 + j0:i0 + j1] += 0.5 * (x[0, j0:j1] + x[1, j0:j1]) * send
    rec = {"name": name, "what": what, "t": r3(t_ev), "start": r3(max(0.0, a_)), "end": r3(min(TOTAL, b_))}
    if peaks is not None:
        rec["peak"] = r3(peaks[0])
    if t_end is not None:
        rec["t_end"] = r3(t_end)
    rec["db"] = dbt
    rec["db_real"] = f1(dB(mov.max() / ref))
    rec["lines"] = [i + 1 for i in over]
    rec["sample_peak_db"] = f1(20 * np.log10(float(np.max(np.abs(x))) / vsp))
    if duck:
        rec["duck_db"] = DUCK_DB
    rec["t_loudest"] = r3(start + (int(np.argmax(mov)) + KW * SR / 2) / SR)
    SFX_LOG.append(rec)


def hit(name, dbt, what, t_ev, x, send=0.1, peak_win=0.6):
    """разовый звук: его пик — на кадр позже события"""
    x = stereo(x)
    envp = np.convolve(np.abs(x).sum(0), np.ones(220) / 220, "same")
    pk = int(np.argmax(envp[:int(peak_win * SR)]))
    place(name, dbt, what, t_ev, t_ev + FRAME - pk / SR, x, peaks=[t_ev + FRAME], send=send)


def span(name, dbt, what, t0, t1, mk, send=0.1):
    """долгий звук от начала до конца действия (с запаздыванием на кадр); под словами приседает"""
    x = mk(t1 - t0)
    place(name, dbt, what, t0, t0 + FRAME, x, t_end=t1, send=send, duck=True)


SYNTH = {
    "gust": ("span", lambda d: s_gust(d), 0.12),
    "title_blink": ("hit", s_blink, 0.35),
    "whoosh_in": ("hit", lambda: s_whoosh(0.75, 0.28, 300, 2200, 0.8, (-0.4, 0.3), [96, 100, 101]), 0.25),
    "whoosh_1": ("hit", lambda: s_whoosh(0.36, 0.12, 400, 2600, 0.7, (0.4, -0.3), seed=14), 0.08),
    "whoosh_2": ("hit", lambda: s_whoosh(0.36, 0.12, 400, 2400, 0.7, (-0.4, 0.4), seed=15), 0.08),
    "storm_whistle": ("span", lambda d: s_whistle(d, [800, 1250, 1050, 1300, 1000, 750],
                                                  [(0.18, 0.5), (0.68, 1.02)], tone=0.6, seed=16), 0.15),
    "door_creak": ("hit", lambda: s_creak(0.45, seed=17), 0.12),
    "tail_swish": ("hit", s_swish, 0.08),
    "toy_knock_1": ("hit", lambda: soft(s_knock(560, seed=18)), 0.1),
    "toy_knock_2": ("hit", lambda: soft(s_knock(470, seed=19)), 0.1),
    "toy_knock_3": ("hit", lambda: soft(s_knock(620, seed=20)), 0.1),
    "bubble_pop": ("hit", lambda: s_pop(420, 1250, ring=93, seed=21), 0.25),
    "pop_puff": ("hit", lambda: soft(s_pop_puff(), 2.0), 0.15),
    "door_close": ("hit", lambda: soft(s_thud(), 2.0), 0.15),
    "snow_1": ("hit", lambda: soft(s_splat(seed=22), 3.0), 0.1),
    "snow_2": ("hit", lambda: soft(s_splat(seed=23), 3.0), 0.1),
    "snow_3": ("hit", lambda: soft(s_splat(seed=24), 3.0), 0.1),
    "gate_wind": ("span", lambda d: s_whistle(d, [650, 950, 820, 1000, 700], (), tone=0.45, seed=25), 0.15),
    "gate_creak_1": ("hit", lambda: s_hinge(0.36, (650, 980, 820), seed=26), 0.12),
    "gate_creak_2": ("hit", lambda: s_hinge(0.34, (720, 1050, 760), seed=27), 0.12),
    "fin_whoosh": ("hit", lambda: s_whoosh(0.5, 0.1, 350, 2600, 0.75, (-0.5, 0.2), seed=28), 0.12),
    "fin_sparkle": ("hit", s_fin_sparkle, 0.4),
}
PEAK_WIN = {"fin_sparkle": 0.02}               # арпеджио: на кадр позже события — первая нота, а не самая громкая
for name, when, dbt, what in SFX_TABLE:
    kind, mk, snd = SYNTH[name]
    if kind == "span":
        t0, t1 = at(when[0]), at(when[1])
        span(name, dbt, what, t0, t1, mk, send=snd)
    else:
        hit(name, dbt, what, at(when), mk(), send=snd, peak_win=PEAK_WIN.get(name, 0.6))

IR_S = [make_ir(1.2, 2.0, 31, lp=6500), make_ir(1.2, 2.0, 32, lp=6500)]
for ch in (0, 1):
    SFX[ch] += 0.3 * convolve(SFX_SEND, IR_S[ch])

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]


def line_gain(w):
    return np.sqrt(ms(VCH, [w]) * db(LINE_DB) ** 2 / max(ms(MCH, [w]), 1e-20))


lineG = [line_gain(w) for w in SPEECH]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(0.4, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.25, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 2.0, TOTAL - FADE_OUT))]
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
            gl = float(np.clip(gFor([(E(i) + r, L(i + 1) - r)], GAP_DB), gn, gn * db(9.0)))
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
    span_ = 1
    while span_ < a + h:
        sh = min(span_, a + h - span_)
        m[:-sh] = np.minimum(m[:-sh], m[sh:])
        span_ += sh
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
        "note": "секунды ролика. t — событие в кадре (t_end — конец долгого действия); peak — пик звука (на кадр позже "
                "события); start/end — где звук слышен; db — самое громкое окно 100 мс шума (K-взвешенно, BS.1770) к "
                "самому громкому окну голоса строк lines (пусто — вне строк, к типичному пику строки); "
                "sample_peak_db — пик отсчёта шума к пику отсчёта голоса тех же строк. music — ключевые моменты "
                "музыки, levels — уровни.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN,
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп ♩: вступление {bpm(-nbI):.0f}, строфа 1 {bpm(0):.0f}, строфа 2 {bpm(12):.0f}, строфа 3 {bpm(24):.0f}, "
      f"финал {bpm(38):.0f}; буря 1 с доли {B_S1} ({G.t(B_S1):.3f} с), буря 2 с доли {B_S2} ({G.t(B_S2):.3f} с)")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала)")
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in per_line))
print(f"заставка {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступление": [(0.3, L(1))], "строфа 1 (тихо)": [(L(1), G.t(B_S1))], "буря 1": [(G.t(B_S1), G.t(12))],
       "строфа 2": [(L(5), L(9))], "строфа 3": [(L(9), G.t(B_S2))], "буря 2": [(G.t(B_S2), FIN)],
       "финал": W_FIN}
KB = {k: kweight(BUS[k]) for k in BUSES}
print("баланс шин (сухо, с BUS_G, дБ до формы громкости), K-взвешенно | RMS:")
for nm, wins in SEC.items():
    print(f"  {nm}: " + ", ".join(f"{k} {f1(dB(ms([KB[k][0], KB[k][1]], wins)) + 20 * np.log10(BUS_G[k]))}"
                                  f"|{f1(dB(ms([BUS[k][0], BUS[k][1]], wins)) + 20 * np.log10(BUS_G[k]))}"
                                  for k in BUSES))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS, ограничитель {lim:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы (db — окно 100 мс к пику голоса строки; пик отсчёта к пику отсчёта голоса):")
for r in SFX_LOG:
    pk = r.get("peak", r["start"])
    print(f"  {r['name']:13s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:4d}  "
          f"вышло {r['db_real']:+5.1f}  отсчёт {r['sample_peak_db']:+5.1f}  строки {r['lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
