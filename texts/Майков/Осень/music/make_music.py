#!/usr/bin/env python3
"""Музыка и шумы к стиху А. Н. Майкова «Осень», стиль «пиксельный платформер 8-бит».

Своя чиптюн-мелодия на 3/4 (стих — трёхстопный дактиль), соль мажор. Мелодии и гармония свои, ни на какую
игровую или известную мелодию не опираются. Инструменты — синтез (numpy), как у 8-битных приставок:
  лид — пульс-квадрат (скважность 25 %, в холодной части 50 % и 12,5 %), с эхом (шина lead);
  гармония — второй пульс: «па-па» на 2-ю и 3-ю доли, тихая подложка в холодной части, в самой яркой части дублирует
  лид октавой ниже (шина harm);
  бас — треугольник с 16 ступенями, как у NES (шина bass);
  ударные — шум: «бочка» из треугольника с падением тона, малый, хэты, тарелка, металлический «тик» (шина drum);
  шкатулка — воспоминание: арпеджио и напев (шина box);
  колокольчики — зимняя ночь и финальный аккорд (шина bell);
  высокие арпеджио — ледяное в строфе 5, искры в самой яркой части, взлёт на «Только» и в финале (шина hi);
  гул — провал на «Смерть стелет жатву свою» (шина drone).
План (секунды ролика берутся из events.json, ничего не захардкожено):
  0 … V0              фанфара-титр, 3 такта (громче);
  V0 … L9−0,3         прыгучая тема (строфы 1–2);
  L9−0,3 … L17−0,3    соль минор, реже и холоднее: лид один (50 %), тихая подложка; со строки 13 — лид тоньше (12,5 %),
                      гармония перебирает аккорд четвертями;
  L17−0,3 … L21−0,3   иней: ледяное высокое арпеджио 16-ми, подложка; в двух последних тактах лид поднимается к ре-доминанте;
  L21−0,3 … L25−0,3   полная тема; smert … tolko — провал: глухой низкий гул без ударных; на tolko — взлёт и тарелка,
                      снова полная тема;
  L25−0,3 … L31−0,25  воспоминание — музыкальная шкатулка (арпеджио + напев);
  L31−0,25 … L33−0,3  зимняя ночь — колокольчики, тихо;
  L33−0,3 … fin       полная тема, провал smert2 … tolko2, после tolko2 — самая яркая часть (лид в октаву, искры);
  fin … total         каденция C — D7 и финальный аккорд G, громче; затухание в последние 0,8 с.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке, LINE_DB), громче на титре, в паузах
между строфами и в финале; под голосом у музыки мягкий провал −3 дБ около 2,5 кГц (место для речи). Баланс шин
выставляется автоматически (BAL, K-взвешенно). Шумы — синтез в духе 8-бит, только с причиной в кадре, пик на кадр
позже события, все тише голоса (список, уровни и ключевые моменты музыки — sfx.json).

Запуск: python3 make_music.py [--intro 3.6] [--outro 6.5] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json; длина = total из events.json)
Читает events.json (его пишет ../video/build.py; при другом вступлении все события сдвигаются), ../voice.mp3
(через ffmpeg — уровни строк) и, если есть, ../timings.json (только сверка). Пишет music.wav (44,1 кГц, 16 бит,
стерео, длина = вступление + голос + финал) и рядом sfx.json. Нужны python3 + numpy и ffmpeg.
"""
import argparse
import json
import math
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
NLINES = 36
STANZA_END = tuple(range(4, NLINES, 4))

# ---------- уровни ----------
# музыка: RMS, дБ к RMS голоса той же строки
LINE_DB = {i: -19.0 for i in range(1, NLINES + 1)}            # строфы 1–2, 6, 9 — тема
LINE_DB |= {i: -19.5 for i in range(9, 17)}                    # строфы 3–4 — реже и холоднее
LINE_DB |= {i: -19.7 for i in range(17, 21)}                   # строфа 5 — иней
LINE_DB |= {22: -20.0, 34: -20.0}                              # провал — гул
LINE_DB |= {i: -19.4 for i in range(25, 31)}                   # шкатулка
LINE_DB |= {31: -19.8, 32: -19.8}                              # зимняя ночь
LINE_DB |= {35: -18.6, 36: -18.5}                              # самая яркая часть
INTRO_DB = -7.0      # фанфара-титр, к среднему голосу
GAP_DB = 5.0         # паузы между строфами: выше соседних строк
PAUSE_DB = 3.0       # долгая пауза внутри строфы (от 0,7 с)
GAP_MAX_DB = -12.0   # но в паузе не громче этого (к среднему голосу): подъём не должен «выпрыгивать»
TAIL_DB = -9.0       # после голоса до fin, к среднему голосу
FIN_DB = -6.0        # каденция и финальный аккорд
FADE_OUT = 0.8       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
# баланс шин: K-взвешенный уровень там, где шина звучит, дБ к лиду
BAL = {"lead": 0.0, "harm": -7.0, "bass": -4.0, "drum": -8.0, "box": -1.0, "bell": -2.0, "hi": -8.0, "drone": -2.0}
SEND = {"lead": 0.18, "harm": 0.2, "bass": 0.04, "drum": 0.08, "box": 0.4, "bell": 0.5, "hi": 0.35, "drone": 0.1}
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {
    "blips": -13, "fin_blips": -12, "steps1": -28, "steps2": -28, "steps3": -28, "steps4": -28,
    "stomp": -18, "crunch": -19, "kick_leaves": -18, "whirls": -21, "magic": -21, "whirl_fin": -15,
    "net": -19, "gust": -22, "boing": -20, "bush": -24, "empty": -18, "stamp": -20, "wilt": -21,
    "cloud": -22, "cross": -21, "frost": -27, "slip": -19, "brr": -20, "gust_smert": -20,
    "splash": -19, "jump": -21, "notes1": -22, "notes2": -21, "ding_mhov": -20, "pluck": -21, "collect": -20,
    "hearts": -24, "save": -17, "daynight": -24,
}
BED = ("steps1", "steps2", "steps3", "steps4", "frost")   # долгие тихие подложки (для check_mix.py — часть подложки)

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Осени» Майкова")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW.get('OUTRO')})")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV")
args = ap.parse_args()
V0 = args.intro if args.intro is not None else float(RAW["V0"])
OUTRO = args.outro if args.outro is not None else float(RAW["OUTRO"])
if V0 < 2.0:
    sys.exit("вступление короче 2 с: фанфаре не хватит места")

r3 = lambda x: round(float(x), 3)
VD = float(RAW["total"]) - float(RAW["V0"]) - float(RAW["OUTRO"])       # длина голоса
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
SHIFT = V0 - float(RAW["V0"])
EV = {k: r3(float(v) + SHIFT) for k, v in RAW.items()
      if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total")}
EV["V0"] = V0
NL = len([k for k in EV if k[0] == "L" and k[1:].isdigit()])
if NL != NLINES:
    sys.exit(f"ожидалось {NLINES} строк, в events.json {NL}")
NEED = ("topchu", "suchya", "treshch", "zagreb", "net", "tainu", "sorvan", "oreh", "svyanul", "cvetok", "gruzd",
        "kistey", "moroz", "smert", "tolko", "mhov", "rval", "vplot", "vspomnyu", "dni", "smert2", "tolko2", "fin")
miss = [k for k in NEED if k not in EV]
if miss:
    sys.exit("в events.json нет ключей: " + ", ".join(miss))
TJP = os.path.join(POEM, "timings.json")
if os.path.exists(TJP):  # только сверка: events.json должен быть собран по тем же таймингам
    with open(TJP, encoding="utf-8") as f:
        TJ = json.load(f)
    if abs(float(TJ.get("voiceDuration", VD)) - VD) > 0.02:
        print(f"внимание: голос в timings.json {TJ['voiceDuration']} с, а по events.json {VD:.3f} с — перезапусти build.py")
    for i in (1, NL // 2, NL):
        ln = TJ["lines"][i - 1]
        if abs(ln["start"] + V0 - EV[f"L{i}"]) > 0.02 or abs(ln["end"] + V0 - EV[f"E{i}"]) > 0.02:
            print(f"внимание: строка {i} в events.json не совпадает с timings.json — перезапусти ../video/build.py")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = W("fin")
if FIN > TOTAL - 2.0:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
for a_, b_ in (("smert", "tolko"), ("smert2", "tolko2")):
    if W(b_) - W(a_) < 0.4:
        sys.exit(f"{a_} … {b_} короче 0,4 с — провалу не хватит места")
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1856)
db = lambda x: 10.0 ** (x / 20.0)
hz = lambda m: 440.0 * 2.0 ** ((np.asarray(m, float) - 69.0) / 12.0)
tt = lambda n: np.arange(int(n)) / SR
prog = lambda t, a, b: np.clip((np.asarray(t, float) - a) / max(1e-9, b - a), 0.0, 1.0)
sstep = lambda u: u * u * (3 - 2 * u)
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
    gl, gr = pan_gains(np.linspace(p0, p1, len(x)))
    return np.stack([x * gl, x * gr])


def at(dst, t, src, g=1.0):
    """прибавить src к dst с момента t (с)"""
    i0 = int(round(t * SR))
    if i0 >= dst.shape[-1]:
        return dst
    if dst.ndim == 2 and src.ndim == 1:
        src = stereo(src)
    j0 = max(0, -i0)
    m = min(src.shape[-1], dst.shape[-1] - i0)
    if m > j0:
        dst[..., i0 + j0:i0 + m] += g * src[..., j0:m]
    return dst


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def fade_tail(x, sec=0.01):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


# ---------- фильтры: амплитудная характеристика биквадов RBJ, применяется через FFT ----------
def biquad(kind, f0, q=0.707, gain_db=0.0):
    w0 = 2 * np.pi * min(f0, 0.49 * SR) / SR
    cw, al = np.cos(w0), np.sin(w0) / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == "lp":
        b, a = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == "hp":
        b, a = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == "bp":
        b, a = [al, 0, -al], [1 + al, -2 * cw, 1 - al]
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


def noise_sh(n, rate):
    """шум «приставки»: случайные значения, удержанные с частотой rate"""
    n = int(n)
    vals = rng.uniform(-1, 1, int(n * rate / SR) + 2)
    return vals[(np.arange(n) * rate / SR).astype(np.int64)]


def crush(x, rate):
    """понижение частоты дискретизации (8-битная «зернистость»)"""
    idx = (np.floor(np.arange(len(x)) * rate / SR) * SR / rate).astype(np.int64)
    return x[np.minimum(idx, len(x) - 1)]


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


def logband(fc_fn, bw_fn):
    """полоса-«гаусс» в октавах: центр fc_fn(t), ширина bw_fn(t)"""
    def fn(tc, fr):
        f = np.maximum(fr, 1.0)[None, :]
        fc = np.asarray(fc_fn(tc), float).reshape(-1, 1) * np.ones((len(tc), 1))
        bw = np.asarray(bw_fn(tc), float).reshape(-1, 1) * np.ones((len(tc), 1))
        return np.exp(-0.5 * (np.log2(f / fc) / bw) ** 2)
    return fn


def slow(n, rate):
    """медленная случайная кривая около 0 (размах ~±1), rate — сколько изменений в секунду"""
    k = int(n / SR * rate) + 4
    pts = rng.standard_normal(k)
    x = np.interp(np.linspace(0, k - 3, int(n)), np.arange(k), pts)
    m = max(1, int(SR / rate / 2))
    c = np.cumsum(np.concatenate([np.zeros(m), x, np.full(m, x[-1])]))
    return ((c[2 * m:] - c[:-2 * m]) / (2 * m))[:int(n)] * 1.4


def crinkle(n, dens, lo=1800, hi=7500, tau=0.0035):
    """шорох листьев: россыпь коротких хрустов; dens — хрустов в секунду (число или кривая)"""
    n = int(n)
    d = np.broadcast_to(np.asarray(dens, float), (n,))
    imp = (rng.random(n) < d / SR) * rng.uniform(0.25, 1.0, n)
    ker = np.exp(-tt(int(tau * 6 * SR)) / tau)
    envc = np.convolve(imp, ker)[:n]
    return bandn(n, lo, hi) * envc


# ---------- генераторы 8-бит ----------
TBL = 2048
_PH = np.arange(TBL) / TBL
KB = (1, 2, 3, 4, 6, 8, 11, 16, 23, 32, 45, 64, 90, 128, 181)
_TB = {}


def kfor(fmax):
    """сколько гармоник можно взять без наложения спектров"""
    K = int(15000 / max(float(fmax), 20.0))
    return max([k for k in KB if k <= K] or [1])


def pulse_tbl(duty, K):
    """пульс со скважностью duty, K гармоник (сигма-сглаживание против звона)"""
    key = ("p", duty, K)
    if key not in _TB:
        k = np.arange(1, K + 1)
        a = np.sin(np.pi * k * duty) / k * np.sinc(k / (K + 1))
        w = (a[:, None] * np.cos(2 * np.pi * k[:, None] * (_PH[None, :] - duty / 2))).sum(0)
        w -= w.mean()
        _TB[key] = w / np.max(np.abs(w))
    return _TB[key]


def tri_tbl(K):
    """треугольник из 16 ступеней (как у NES), ограниченный K гармониками"""
    key = ("t", K)
    if key not in _TB:
        tri = 1 - 4 * np.abs(_PH - 0.5)
        q = np.round((tri + 1) / 2 * 15) / 15 * 2 - 1
        S = np.fft.rfft(q)
        S[0] = 0
        S[K + 1:] = 0
        w = np.fft.irfft(S, TBL)
        _TB[key] = w / np.max(np.abs(w))
    return _TB[key]


def osc(tbl, f, n, ph0=0.0):
    n = int(n)
    ph = ph0 + (f * np.arange(n) / SR if np.isscalar(f) else np.cumsum(f) / SR)
    x = (ph % 1.0) * TBL
    i = x.astype(np.int64)
    fr = x - i
    return tbl[i % TBL] * (1 - fr) + tbl[(i + 1) % TBL] * fr


def sq_note(m, dur, duty=0.25, att=0.003, dec=0.15, sus=0.65, rel=0.04, vib=0.0, vdel=0.14, vrate=5.8, slide=None):
    """нота пульса: вибрато после vdel, slide=(полутоны, t0, t1) — съезд тона"""
    f = float(hz(m))
    n = int((dur + 6 * rel) * SR) + 2
    t = tt(n)
    fr = np.full(n, f)
    if vib:
        fr *= 1 + vib * np.sin(2 * np.pi * vrate * t + rng.uniform(0, 6.3)) * np.clip((t - vdel) / 0.12, 0, 1)
    if slide:
        fr *= 2 ** (slide[0] / 12 * sstep(prog(t, slide[1], slide[2])))
    x = osc(pulse_tbl(duty, kfor(fr.max())), fr, n, rng.random())
    env = np.clip(t / att, 0, 1) * (sus + (1 - sus) * np.exp(-np.maximum(t - att, 0) / dec))
    env *= np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    return fade_tail(x * env, 0.004)


def tri_note(m, dur, rel=0.012):
    f = float(hz(m))
    n = int((dur + 6 * rel) * SR) + 2
    t = tt(n)
    x = osc(tri_tbl(kfor(f)), f, n, rng.random())
    env = np.clip(t / 0.002, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    return fade_tail(x * env, 0.004)


_MB = {}


def mbox(m):
    """язычок музыкальной шкатулки"""
    m = int(m)
    if m in _MB:
        return _MB[m]
    f = float(hz(m))
    tau = float(np.clip(1.0 * (880 / f) ** 0.35, 0.35, 1.5))
    n = int((min(4 * tau, 3.0) + 0.02) * SR)
    t = tt(n)
    ph = 2 * np.pi * f * t
    x = np.sin(ph) * np.exp(-t / tau)
    x += 0.22 * np.sin(2 * ph + 0.4) * np.exp(-t / (tau * 0.45))
    x += 0.1 * np.sin(3 * ph + 1.0) * np.exp(-t / 0.15)
    if 5.95 * f < 17000:
        x += 0.12 * np.sin(5.95 * ph) * np.exp(-t / 0.03)
    x *= 1 - np.exp(-t / 0.0008)
    x += 0.06 * bandn(n, 3000, 9000) * np.exp(-t / 0.0015)
    x = fade_tail(x / np.max(np.abs(x)), 0.02)
    _MB[m] = x
    return x


_BL = {}


def bell(m):
    """колокольчик: неровные обертоны + короткий 8-битный «блеск» пульса"""
    m = int(m)
    if m in _BL:
        return _BL[m]
    f = float(hz(m))
    tau = float(np.clip(2.0 * (1000 / f) ** 0.3, 0.8, 2.4))
    n = int((min(4 * tau, 4.0) + 0.02) * SR)
    t = tt(n)
    x = np.zeros(n)
    for k, a, tk in ((1.0, 1.0, tau), (2.0, 0.42, tau * 0.45), (3.01, 0.28, tau * 0.3), (4.17, 0.2, tau * 0.18),
                     (5.43, 0.13, tau * 0.1)):
        if k * f < 17000:
            x += a * np.sin(2 * np.pi * k * f * t + rng.uniform(0, 6.3)) * np.exp(-t / tk)
    x += 0.15 * osc(pulse_tbl(0.125, kfor(f)), f, n) * np.exp(-t / 0.08)
    x *= 1 - np.exp(-t / 0.001)
    x = fade_tail(x / np.max(np.abs(x)), 0.02)
    _BL[m] = x
    return x


# ---------- ударные ----------
def mk_kick():
    n = int(0.22 * SR)
    t = tt(n)
    f = 48 + 150 * np.exp(-t / 0.022)
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * np.cumsum(f) / SR))
    x = tri * np.exp(-t / 0.085) + 0.25 * bandn(n, 1500, 8000) * np.exp(-t / 0.003)
    return fade_tail(x / np.max(np.abs(x)), 0.01)


def mk_snare():
    n = int(0.25 * SR)
    t = tt(n)
    nz = eq(noise_sh(n, 12000), biquad("hp", 900, 0.7), biquad("lp", 9000, 0.7))
    tone = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * np.cumsum(170 + 80 * np.exp(-t / 0.02)) / SR))
    x = 0.8 * nz / np.max(np.abs(nz)) * np.exp(-t / 0.075) + 0.6 * tone * np.exp(-t / 0.035)
    return fade_tail(x / np.max(np.abs(x)), 0.01)


def mk_hat(open_=False):
    n = int((0.4 if open_ else 0.08) * SR)
    t = tt(n)
    x = eq(rng.standard_normal(n), biquad("hp", 6500, 0.7)) * np.exp(-t / (0.11 if open_ else 0.022))
    return fade_tail(x / np.max(np.abs(x)), 0.005)


def mk_crash():
    n = int(1.8 * SR)
    t = tt(n)
    x = np.stack([eq(noise_sh(n, 28000), biquad("hp", 3000, 0.7)) for _ in range(2)])
    x *= np.exp(-t / 0.55) * (1 - np.exp(-t / 0.002))
    return fade_tail(x / np.max(np.abs(x)), 0.05)


def mk_tick():
    n = int(0.08 * SR)
    t = tt(n)
    seq = rng.uniform(-1, 1, 93)                      # короткий период шума — металлический звук
    x = seq[((np.arange(n) * 25000 / SR).astype(np.int64)) % 93]
    x = eq(x, biquad("hp", 3000, 0.7)) * np.exp(-t / 0.02)
    return fade_tail(x / np.max(np.abs(x)), 0.005)


DR = {"kick": [mk_kick() for _ in range(2)], "snare": [mk_snare() for _ in range(3)], "hat": [mk_hat() for _ in range(3)],
      "ohat": [mk_hat(True)], "crash": [mk_crash()], "tick": [mk_tick() for _ in range(2)]}
DR_PAN = {"kick": 0.0, "snare": 0.05, "hat": 0.3, "ohat": 0.3, "crash": -0.1, "tick": 0.25}

# ---------- шины ----------
BUSES = ("lead", "harm", "bass", "drum", "box", "bell", "hi", "drone")
BUS = {k: np.zeros((2, N)) for k in BUSES}


def put(bus, t, x, pan=0.0, g=1.0):
    at(BUS[bus], t, stereo(x, pan), g)


def p_sq(bus, t, m, dur, vel, duty, pan=0.0, **kw):
    put(bus, t, sq_note(m, dur, duty, **kw), pan, vel)


def p_tri(t, m, dur, vel):
    put("bass", t, tri_note(m, dur), 0.0, vel)


def p_dr(t, kind, vel):
    v = DR[kind]
    put("drum", t, v[int(rng.integers(len(v)))], DR_PAN[kind], vel)


# ---------- ноты, аккорды, сетка ----------
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nm(s):
    """'F#5' → 78"""
    pc, i = PC[s[0]], 1
    while s[i] in "#b":
        pc += 1 if s[i] == "#" else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + pc


def mel(s):
    """'D5:1 G5:1 r:2 …' (длительности в восьмых, в такте 6) → [(доля в восьмых, длительность, midi)]"""
    out, pos = [], 0.0
    for tok in s.split():
        name, d = tok.split(":")
        if name != "r":
            out.append((pos, float(d), nm(name)))
        pos += float(d)
    if abs(pos - 6) > 1e-6:
        raise ValueError(f"в такте не 6 восьмых: {s}")
    return out


QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10)}


def chord_pcs(name):
    root, i = PC[name[0]], 1
    while i < len(name) and name[i] in "#b":
        root += 1 if name[i] == "#" else -1
        i += 1
    return [(root + x) % 12 for x in QUAL[name[i:]]]


def chords_of(spec):
    """'C' или 'C:4 D:2' → [(доля, длительность, аккорд)]"""
    if ":" not in spec:
        return [(0.0, 6.0, spec)]
    out, pos = [], 0.0
    for tok in spec.split():
        c, d = tok.split(":")
        out.append((pos, float(d), c))
        pos += float(d)
    return out


def chord_at(chs, pos):
    return [c for p, d, c in chs if p <= pos + 1e-9][-1]


def bass_note(c):
    return 40 + (chord_pcs(c)[0] - 4) % 12              # E2 … D#3


def tones(c, lo, hi):
    pcs = chord_pcs(c)
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def stab(c):
    """двузвучие гармонии: терция (D4…C#5) и квинта (у септаккорда — септима)"""
    pcs = chord_pcs(c)
    m3 = 62 + (pcs[1] - 62) % 12
    top = pcs[3] if len(pcs) > 3 else pcs[2]
    return m3, m3 + (top - pcs[1]) % 12


def arp_from(c, lo, k):
    """k звуков аккорда вверх от его основного тона не ниже lo"""
    pcs = chord_pcs(c)
    r = lo + (pcs[0] - lo) % 12
    return [m for m in range(r, r + 40) if m % 12 in pcs[:3]][:k]


class Grid:
    def __init__(self, t0, bar, n):
        self.t0, self.bar, self.n = float(t0), float(bar), int(n)

    def t(self, b, pos=0.0):
        return self.t0 + (b + pos / 6.0) * self.bar

    def d(self, e):
        return e * self.bar / 6.0


BAR = 3 * 60 / 168          # целевая длина такта, с (♩ = 168)


def fit(t0, t1, bar=BAR, even=True, tol=0.1):
    """целое число тактов между t0 и t1 (лучше чётное, если темп меняется не больше чем на tol)"""
    x = (t1 - t0) / bar
    n = max(1, int(round(x)))
    if even and n % 2:
        cands = [c for c in (n - 1, n + 1) if c >= 2 and abs((t1 - t0) / c / bar - 1) <= tol]
        if cands:
            n = min(cands, key=lambda c: abs((t1 - t0) / c - bar))
    return Grid(t0, (t1 - t0) / n, n)


def bars_seq(src, n, start=0, cad=None):
    out = [src[(start + i) % len(src)] for i in range(n)]
    if cad:
        k = min(len(cad), n)
        out[n - k:] = cad[len(cad) - k:]
    return out


# ---------- партитура ----------
# фанфара: аккорд, лид, гармония, бас
FAN = [
    ("G", "G4:0.5 B4:0.5 D5:0.5 G5:0.5 B5:2 A5:1 B5:1", "r:2 D5:2 C5:1 D5:1", "G2:2 D3:2 G3:2"),
    ("C:4 D:2", "C6:2 B5:1 A5:1 F#5:1 A5:1", "E5:2 D5:1 C5:1 D5:1 F#5:1", "C3:2 C3:1 C3:1 D3:2"),
    ("G", "B5:1 D6:1 G6:4", "G5:1 B5:1 D6:4", "G2:6"),
]
# основная тема, 16 тактов
THEME = [
    ("G", "D5:1 G5:1 B5:2 A5:1 G5:1"), ("D", "F#5:2 A5:1 F#5:1 D5:2"),
    ("Em", "E5:1 G5:1 B5:2 C6:1 B5:1"), ("C", "A5:2 G5:1 E5:1 C5:2"),
    ("Am", "E5:1 A5:1 C6:2 B5:1 A5:1"), ("G", "B5:2 G5:1 D5:1 G5:2"),
    ("D7", "A5:1 B5:1 C6:1 B5:1 A5:1 F#5:1"), ("G", "G5:3 D5:1 G4:2"),
    ("G", "D5:1 G5:1 B5:2 A5:1 G5:1"), ("D", "A5:2 D6:1 C6:1 A5:2"),
    ("C", "E5:1 G5:1 C6:2 B5:1 C6:1"), ("G", "D6:2 B5:1 G5:1 D5:2"),
    ("Em", "B5:2 A5:1 G5:1 E5:2"), ("Am", "C6:2 B5:1 A5:1 E5:2"),
    ("D7", "F#5:1 A5:1 D6:2 C6:1 A5:1"), ("G", "G5:2 B5:1 D6:1 G5:2"),
]
CAD_MAJ = [("D7", "A5:1 B5:1 C6:1 B5:1 A5:1 F#5:1"), ("G", "G5:3 D5:1 G4:2")]
# холодная часть, соль минор
COLD = [
    ("Gm", "D5:4 Bb4:2"), ("Eb", "G5:4 Eb5:2"), ("Cm", "C5:2 Eb5:2 G5:2"), ("D", "F#5:4 A5:2"),
    ("Gm", "G5:4 D5:2"), ("Eb", "Bb5:4 G5:2"), ("Cm", "Eb5:2 G5:2 C6:2"), ("D", "A5:3 G5:1 F#5:2"),
]
CAD_MIN = [("D", "A5:3 G5:1 F#5:2"), ("Gm", "G5:6")]
ICE = ["Gm", "Eb", "Cm", "D"]
ICE_END = [("D", "D5:2 F#5:2 A5:2"), ("D7", "D6:4 C6:2")]         # подъём к ре-доминанте → соль мажор
# шкатулка: напев
MB = [
    ("G", "D6:4 B5:2"), ("Em", "E6:3 D6:1 B5:2"), ("C", "C6:4 E6:2"), ("D", "D6:4 A5:2"),
    ("G", "B5:2 D6:2 G6:2"), ("Bm", "F#6:4 D6:2"), ("C", "E6:3 D6:1 C6:2"), ("D", "A5:2 C6:2 F#6:2"),
]
MB_CAD = [("D", "A5:2 C6:2 F#6:2"), ("G", "G6:4 D6:2")]
# зимняя ночь: колокольчики
NIGHT = [("Em", "B6:3 G6:3"), ("C", "E6:3 G6:3"), ("Am", "A6:3 E6:3"), ("D", "F#6:2 A6:2 D7:2")]
BRIGHT_END = [("G", "G5:2 B5:1 D6:1 G6:2")]
CAD_FIN = [("C", "E5:1 G5:1 C6:2 E6:1 C6:1"), ("D7", "F#5:1 A5:1 D6:2 C6:1 A5:1")]

LEAD = {  # стиль лида
    "full": dict(duty=0.25, vel=1.0, leg=0.88, vib=0.0045, dec=0.18, sus=0.62, rel=0.04),
    "bright": dict(duty=0.25, vel=1.0, leg=0.9, vib=0.005, dec=0.2, sus=0.68, rel=0.05),
    "cold": dict(duty=0.5, vel=0.85, leg=0.97, vib=0.006, dec=0.5, sus=0.45, rel=0.14),
    "cold2": dict(duty=0.125, vel=0.95, leg=0.97, vib=0.006, dec=0.5, sus=0.45, rel=0.14),
    "fan": dict(duty=0.25, vel=1.0, leg=0.94, vib=0.005, dec=0.25, sus=0.7, rel=0.05),
}
DRUMS = {
    "full": {"kick": [(0, 1.0)], "snare": [(4, 0.8)], "hat": [(1, .35), (2, .6), (3, .35), (5, .45)]},
    "fullfill": {"kick": [(0, 1.0)], "snare": [(4, .8), (5, .5), (5.5, .65)], "hat": [(1, .35), (2, .6), (3, .35)]},
    "bright": {"kick": [(0, 1.0), (3, .7)], "snare": [(2, .55), (4, .9)],
               "hat": [(1, .45), (1.5, .25), (2, .5), (3, .45), (3.5, .25), (5, .5)]},
    "brightB": {"kick": [(0, 1.0), (3, .7)], "snare": [(2, .55), (4, .9)],
                "hat": [(1, .45), (1.5, .25), (2, .5), (3, .45), (3.5, .25)], "ohat": [(5, .45)]},
    "fill": {"kick": [(0, 1.0)], "snare": [(3, .5), (4, .6), (4.5, .7), (5, .8), (5.5, .95)], "hat": [(1, .4), (2, .5)]},
    "cold": {"kick": [(0, .45)], "tick": [(2, .35), (4, .3)]},
    "cold2": {"kick": [(0, .5)], "tick": [(2, .35), (3, .2), (4, .3)]},
}


def render(G, bars, lead="full", harm="full", bass="full", drums="full", hi=None, t_cut=None):
    live = lambda x: t_cut is None or x < t_cut - 0.03
    for b, (cs, ml) in enumerate(bars):
        chs = chords_of(cs)
        last = b == len(bars) - 1
        # лид
        if lead and ml:
            st = LEAD[lead]
            for pos, d, m in mel(ml):
                t0 = G.t(b, pos)
                if not live(t0):
                    continue
                dur = G.d(d) * st["leg"]
                acc = 1.0 if pos == 0 else (0.9 if pos in (2, 4) else 0.82)
                vib = st["vib"] if dur > 0.28 else 0.0
                p_sq("lead", t0, m, dur, st["vel"] * acc, st["duty"], 0.1, vib=vib, dec=st["dec"], sus=st["sus"],
                     rel=st["rel"])
                if lead == "bright":   # гармония дублирует лид октавой ниже
                    p_sq("harm", t0, m - 12, dur, 0.75 * acc, 0.5, -0.25, vib=vib, dec=0.25, sus=0.6, rel=0.05)
        # гармония
        if harm == "full":
            for pos in (2, 4):
                if live(G.t(b, pos)):
                    for m in stab(chord_at(chs, pos)):
                        p_sq("harm", G.t(b, pos), m, G.d(0.9), 0.55, 0.25, -0.3, dec=0.07, sus=0.35, rel=0.03)
        elif harm in ("cold", "ice"):
            m3, m5 = stab(chs[0][2])
            p_sq("harm", G.t(b, 0), m3 if harm == "cold" else m5, G.d(5.7), 0.4 if harm == "cold" else 0.32, 0.5, -0.3,
                 att=0.12, dec=0.8, sus=0.6, rel=0.2, vib=0.004, vdel=0.3, vrate=4.5)
        elif harm == "cold2":
            ar = arp_from(chs[0][2], 55, 3)
            for j, pos in enumerate((0, 2, 4)):
                p_sq("harm", G.t(b, pos), ar[j], G.d(1.7), 0.5, 0.125, -0.3, dec=0.15, sus=0.35, rel=0.06)
        # бас
        if bass:
            pat = {"full": [(0, 0, 1.7, 1.0), (3, 7, 0.8, 0.8), (4, 12, 0.9, 0.85)],
                   "bright": [(0, 0, 1.4, 1.0), (2, 12, 0.8, 0.8), (3, 7, 0.8, 0.8), (4, 12, 0.8, 0.85), (5, 7, 0.8, 0.75)],
                   "cold": [(0, 0, 5.5, 0.8)], "ice": [(0, 0, 5.6, 0.7)]}[bass]
            for pos, iv, d, v in pat:
                if live(G.t(b, pos)):
                    p_tri(G.t(b, pos), bass_note(chord_at(chs, pos)) + iv, G.d(d), v)
        # ударные
        if drums:
            stl = drums
            if drums == "full" and (b % 4 == 3 or last):
                stl = "fullfill"
            elif drums == "bright":
                stl = "fill" if last else ("brightB" if b % 2 else "bright")
            for kind, hits in DRUMS[stl].items():
                for pos, v in hits:
                    if live(G.t(b, pos)):
                        p_dr(G.t(b, pos), kind, v)
        # высокие арпеджио
        if hi == "ice":
            tn = tones(chs[0][2], 91, 106)
            pat = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]
            for j, k in enumerate(pat):
                p_sq("hi", G.t(b, j / 2), tn[k % len(tn)], G.d(0.45), 0.5 if j % 6 else 0.65, 0.125,
                     0.5 if j % 2 else -0.5, dec=0.08, sus=0.25, rel=0.05)
        elif hi == "spark":
            tn = tones(chs[0][2], 84, 100)
            for j in range(12):
                if live(G.t(b, j / 2)):
                    p_sq("hi", G.t(b, j / 2), tn[j % len(tn)], G.d(0.4), 0.45, 0.125, 0.45 if j % 2 else -0.45,
                         dec=0.06, sus=0.2, rel=0.04)


def splash(t):
    """радостный взлёт: пробежка вверх, «бочка» и тарелка"""
    for i, m in enumerate((67, 71, 74, 79, 83, 86, 91, 95, 98)):
        p_sq("hi", t + i * 0.03, m, 0.05, 0.75, 0.25, -0.5 + 0.12 * i, dec=0.08, sus=0.4, rel=0.06)
    p_dr(t, "crash", 0.8)


def drone(t0, t1):
    """глухой низкий гул: соль большой октавы, контроктава и си-бемоль, шум-гул; тон медленно оседает"""
    dur = t1 - t0 + 0.06
    n = int(dur * SR)
    t = tt(n)
    sink = 2 ** (-1.0 / 12 * sstep(prog(t, 0, dur)))
    out = np.zeros((2, n))
    for ch, det in ((0, 0.997), (1, 1.003)):
        x = osc(tri_tbl(kfor(200)), float(hz(43)) * sink * det, n, 0.1 * ch)
        x += 0.55 * np.sin(2 * np.pi * np.cumsum(float(hz(31)) * sink) / SR)
        x += 0.3 * osc(tri_tbl(kfor(200)), float(hz(46)) * sink * det * 1.002, n, 0.3)
        out[ch] = x * (1 + 0.2 * np.sin(2 * np.pi * 0.8 * t + ch))
    out += 0.35 * stereo(bandn(n, 40, 320) * (1 + 0.4 * slow(n, 3)))
    env = sstep(np.clip(t / 0.22, 0, 1)) * np.clip((dur - t) / 0.07, 0, 1)
    put("drone", t0, out * env)


# --- 0 … V0: фанфара-титр
nf_ = 3 if V0 - 0.08 >= 2.6 else 2
GF = Grid(0.08, (V0 - 0.08) / nf_, nf_)
FB = FAN if nf_ == 3 else [FAN[0], FAN[2]]
for b, (cs, ml, hl, bl) in enumerate(FB):
    st = LEAD["fan"]
    for pos, d, m in mel(ml):
        p_sq("lead", GF.t(b, pos), m, GF.d(d) * st["leg"], 1.0 if pos == 0 else 0.88, 0.25, 0.1,
             vib=st["vib"] if GF.d(d) > 0.3 else 0.0, dec=st["dec"], sus=st["sus"], rel=st["rel"])
    for pos, d, m in mel(hl):
        p_sq("harm", GF.t(b, pos), m, GF.d(d) * 0.92, 0.85, 0.25, -0.3, dec=0.25, sus=0.6, rel=0.05)
    for pos, d, m in mel(bl):
        p_tri(GF.t(b, pos), m, GF.d(d) * 0.9, 1.0)
    last = b == len(FB) - 1
    p_dr(GF.t(b, 0), "kick", 1.0)
    if last:
        p_dr(GF.t(b, 0), "crash", 0.9)
    elif b == len(FB) - 2:
        for pos, v in ((1, .4), (2, .5), (3, .4), (4, .55), (4.5, .65), (5, .8), (5.5, .95)):
            p_dr(GF.t(b, pos), "hat" if pos < 4 else "snare", v)
    else:
        for pos in range(1, 6):
            p_dr(GF.t(b, pos), "hat", 0.6 if pos % 2 == 0 else 0.4)
mark("fanfare_final_chord", GF.t(nf_ - 1))

# --- V0 … L9−0,3: прыгучая тема
G1 = fit(V0, L(9) - 0.3)
render(G1, bars_seq(THEME, G1.n, cad=CAD_MAJ))
mark("theme_start", G1.t0)

# --- L9−0,3 … L17−0,3: соль минор, холодно и редко
G2a = fit(L(9) - 0.3, L(13) - 0.3)
render(G2a, bars_seq(COLD, G2a.n, cad=CAD_MIN), "cold", "cold", "cold", "cold")
G2b = fit(L(13) - 0.3, L(17) - 0.3)
render(G2b, bars_seq(COLD, G2b.n, cad=CAD_MIN), "cold2", "cold2", "cold", "cold2")
mark("minor_start", G2a.t0)

# --- L17−0,3 … L21−0,3: иней, ледяное арпеджио
G2c = fit(L(17) - 0.3, L(21) - 0.3)
ice_bars = [(ICE[i % 4], None) for i in range(G2c.n)]
k_ = min(2, G2c.n)
ice_bars[G2c.n - k_:] = ICE_END[2 - k_:]
render(G2c, ice_bars, "cold", "ice", "ice", None, hi="ice")
mark("ice_start", G2c.t0)


def theme_cut(t0, t_cut):
    """тема с начала до провала (обрывается на t_cut)"""
    if t_cut - t0 < 0.3:
        return
    n = int(math.ceil((t_cut - t0) / BAR)) + 1
    render(Grid(t0, BAR, n), bars_seq(THEME, n), t_cut=t_cut)


# --- L21−0,3 … L25−0,3: тема, провал smert … tolko, всплеск
theme_cut(L(21) - 0.3, W("smert"))
drone(W("smert"), W("tolko"))
splash(W("tolko"))
G3c = fit(W("tolko"), L(25) - 0.3, even=False)
render(G3c, bars_seq(THEME, G3c.n, cad=CAD_MAJ))
mark("theme2_start", L(21) - 0.3)
mark("drop1", W("smert"))
mark("splash1", W("tolko"))

# --- L25−0,3 … L31−0,25: воспоминание, шкатулка
G4 = fit(L(25) - 0.3, L(31) - 0.25, bar=1.40)
for b, (c, ml) in enumerate(bars_seq(MB, G4.n, cad=MB_CAD)):
    for pos, d, m in mel(ml):
        put("box", G4.t(b, pos), mbox(m), 0.15, 1.0)
    ar = arp_from(c, 62, 5)
    for j, k in enumerate((0, 2, 1, 3, 2, 4)):
        put("box", G4.t(b, j), mbox(ar[k]), -0.35 + 0.14 * j, 0.42)
    p_tri(G4.t(b, 0), bass_note(c), G4.d(3.6), 0.45)
    p_tri(G4.t(b, 4), bass_note(c) + 7, G4.d(1.7), 0.32)
mark("musicbox_start", G4.t0)

# --- L31−0,25 … L33−0,3: зимняя ночь, колокольчики
G5 = fit(L(31) - 0.25, L(33) - 0.3, bar=1.55, even=False)
for b, (c, ml) in enumerate(bars_seq(NIGHT, G5.n, cad=[NIGHT[-1]])):
    for pos, d, m in mel(ml):
        put("bell", G5.t(b, pos), bell(m), 0.3 if pos < 3 else -0.3, 1.0)
    m3, m5 = stab(c)
    p_sq("harm", G5.t(b, 0), m3, G5.d(5.7), 0.28, 0.5, -0.2, att=0.25, dec=0.8, sus=0.6, rel=0.3, vib=0.004)
    p_tri(G5.t(b, 0), bass_note(c), G5.d(5.8), 0.35)
mark("night_start", G5.t0)

# --- L33−0,3 … fin: тема, провал smert2 … tolko2, самая яркая часть
theme_cut(L(33) - 0.3, W("smert2"))
drone(W("smert2"), W("tolko2"))
splash(W("tolko2"))
G6c = fit(W("tolko2"), FIN, bar=1.1, even=False)
render(G6c, bars_seq(THEME, G6c.n, start=8, cad=BRIGHT_END), "bright", None, "bright", "bright", hi="spark")
mark("theme3_start", L(33) - 0.3)
mark("drop2", W("smert2"))
mark("splash2", W("tolko2"))

# --- fin … total: каденция и финальный аккорд
bar_f = float(np.clip(G6c.bar, 0.9, 1.3))
room = TOTAL - FIN
n_cad = 2 if room >= 2 * bar_f + 1.2 else (1 if room >= bar_f + 1.0 else 0)
G7 = Grid(FIN, bar_f, n_cad)
if n_cad:
    render(G7, CAD_FIN[2 - n_cad:], "bright", None, "bright", "bright", hi="spark")
T_FC = G7.t(n_cad)
dfc = TOTAL - T_FC + 0.1
p_sq("lead", T_FC, 79, dfc, 0.95, 0.25, 0.1, vib=0.006, vdel=0.3, dec=1.2, sus=0.55, rel=0.3)          # G5
for m, v, p in ((71, 0.6, -0.3), (74, 0.55, -0.15)):                                                    # B4, D5
    p_sq("harm", T_FC, m, dfc, v, 0.5, p, vib=0.005, vdel=0.3, dec=1.2, sus=0.55, rel=0.3)
p_sq("hi", T_FC + 0.27, 91, dfc - 0.27, 0.35, 0.125, 0.3, vib=0.006, vdel=0.2, dec=1.0, sus=0.5, rel=0.3)  # G6
p_tri(T_FC, 43, dfc, 1.0)
p_tri(T_FC, 31, dfc, 0.6)
p_dr(T_FC, "kick", 1.0)
splash(T_FC)
put("bell", T_FC + 0.05, bell(98), 0.3, 0.6)
put("bell", T_FC + 0.14, bell(103), -0.3, 0.45)
mark("final_cadence", FIN)
mark("final_chord", T_FC)

# ---------- провалы: всё, кроме гула, глохнет ----------
tN = np.arange(N) / SR
MUTE = np.ones(N)
for a_, b_ in ((W("smert"), W("tolko")), (W("smert2"), W("tolko2"))):
    MUTE = np.minimum(MUTE, np.clip(np.maximum((a_ + 0.06 - tN) / 0.06, (tN - (b_ - 0.008)) / 0.006), 0, 1))
for k in BUSES:
    if k != "drone":
        BUS[k] *= MUTE


# ---------- эхо, фильтры, баланс, ревербератор ----------
def echo(x, dt, mix, fb, taps=3):
    y = x.copy()
    d = int(dt * SR)
    for k in range(1, taps + 1):
        g = mix * fb ** (k - 1)
        src = x[::-1] if k % 2 else x           # отражения гуляют между каналами
        y[:, k * d:] += g * src[:, :N - k * d]
    return y


BUS["lead"] = echo(BUS["lead"], 0.36, 0.2, 0.45)
BUS["hi"] = echo(BUS["hi"], 0.27, 0.35, 0.5)
BUS["bell"] = echo(BUS["bell"], 0.41, 0.3, 0.5)
BUS["lead"] = eq(BUS["lead"], biquad("lp", 7500, 0.6), biquad("hp", 150, 0.7))
BUS["harm"] = eq(BUS["harm"], biquad("lp", 6000, 0.6), biquad("hp", 150, 0.7))
BUS["bass"] = eq(BUS["bass"], biquad("lp", 4000, 0.6), biquad("hp", 30, 0.7))
BUS["hi"] = eq(BUS["hi"], biquad("lp", 10000, 0.6), biquad("hp", 600, 0.7))
BUS["drone"] = eq(BUS["drone"], biquad("lp", 700, 0.6), biquad("hp", 28, 0.7))
BUS["box"] = eq(BUS["box"], biquad("hp", 250, 0.7))
BUS["bell"] = eq(BUS["bell"], biquad("hp", 250, 0.7))


def act_level(x):
    """K-взвешенная мощность там, где шина звучит (окна 0,4 с не тише −30 дБ от самого громкого)"""
    k = kweight(0.5 * (x[0] + x[1]))
    w = int(0.4 * SR)
    m = len(k) // w
    p = (k[:m * w] ** 2).reshape(m, w).mean(1)
    if p.max() <= 0:
        return None
    return float(p[p > p.max() * 1e-3].mean())


LEV = {k: act_level(BUS[k]) for k in BUSES}
BUS_G = {k: (math.sqrt(LEV["lead"] * db(BAL[k]) ** 2 / LEV[k]) if LEV[k] else 0.0) for k in BUSES}


def make_ir(rt60, length, seed, lp=6500, pre=0.018):
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


IR_M = [make_ir(0.9, 1.4, 11), make_ir(0.9, 1.4, 12)]
WET = 0.3
send = sum(SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0] + BUS[k][1]) for k in BUSES)
music = sum(BUS[k] * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
del send
music = eq(music, biquad("hp", 35, 0.7))

# ---------- голос и активность речи ----------
rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, "voice.mp3"), "-f", "f32le", "-ac", "1",
                       "-ar", str(SR), "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
i_v0 = int(round(V0 * SR))
vfull = np.zeros(N)
vfull[i_v0:i_v0 + len(voice)] = voice[:max(0, N - i_v0)]
SPEECH = []                               # окна строк (если строки налезают друг на друга — до начала следующей)
for i in range(1, NL + 1):
    a_ = L(i)
    b_ = E(i) if i == NL else min(E(i), L(i + 1))
    SPEECH.append((a_, max(b_, a_ + 0.05)))
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

# провал около 2,5 кГц под голосом — речи просторнее
dip = eq(music, biquad("peak", 2500, 0.8, DIP_DB))
music = music + ACT * (dip - music)
del dip

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
lineG = [np.sqrt(ms(VCH, [w]) * db(LINE_DB[i + 1]) ** 2 / max(ms(MCH, [w]), 1e-20)) for i, w in enumerate(SPEECH)]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(0.45, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.3, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 1.6, TOTAL - FADE_OUT))]
gI, gF = gFor(W_INTRO, INTRO_DB), gFor(W_FIN, FIN_DB)
has_tail = W_TAIL[0][1] - W_TAIL[0][0] > 0.2
gT = gFor(W_TAIL, TAIL_DB) if has_tail else gF
shape = [(0, 0), (0.07, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    a_, b_ = SPEECH[i - 1]
    if i > 1:
        shape.append((a_, g))
    shape.append((b_, g))
    if i < NL:
        gap = L(i + 1) - b_
        lift = GAP_DB if i in STANZA_END else (PAUSE_DB if gap >= 0.7 else 0)
        if lift and gap > 0.45:
            gl = max(g, lineG[i]) * db(lift)
            gl = max(max(g, lineG[i]), min(gl, gFor([(b_ + 0.1, L(i + 1) - 0.1)], GAP_MAX_DB)))
            r = min(0.22, gap / 3)
            shape += [(b_ + r, gl), (L(i + 1) - r, gl)]
            LIFTS.append((i, b_ + r, L(i + 1) - r))
if has_tail:
    shape += [(E(NL) + 0.3, gT), (FIN - 0.05, gT)]
shape += [(FIN + 0.1, gF)]
for u in np.linspace(0, 1, 13):
    shape.append((TOTAL - FADE_OUT * (1 - u), gF * np.cos(u * np.pi / 2) ** 2))
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0] - 1e-9:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f} с")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve
del music, MCH


# ---------- шумы (синтез в духе 8-бит) ----------
def env_dec(n, tau, att=0.002):
    t = tt(n)
    return (1 - np.exp(-t / att)) * np.exp(-t / tau)


def sweep(f0, f1, dur, duty=0.25, extra=0.0):
    """пульс со съездом тона f0 → f1 за dur (экспоненциально)"""
    n = int((dur + extra) * SR)
    t = tt(n)
    f = f0 * (f1 / f0) ** np.clip(t / dur, 0, 1)
    return osc(pulse_tbl(duty, kfor(max(f0, f1))), f, n, rng.random()), t


def chirp(f0, f1, dur, n):
    t = tt(n)
    f = f0 * (f1 / f0) ** np.clip(t / dur, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def s_blip(i):
    m = (79, 81, 83, 86, 91)[i % 5]
    out = np.zeros(int(0.16 * SR))
    at(out, 0, sq_note(m, 0.035, 0.25, dec=0.05, sus=0.6, rel=0.01))
    at(out, 0.035, sq_note(m + 12, 0.05, 0.125, dec=0.04, sus=0.5, rel=0.02), 0.8)
    return out


def s_step():
    n = int(0.16 * SR)
    t = tt(n)
    x = crinkle(n, 900 * np.exp(-t / 0.035), 1400, 6500, 0.003)
    x += 0.15 * np.sin(2 * np.pi * 95 * t) * env_dec(n, 0.02)
    return crush(x, 16000)


def s_thud(f0=150.0, f1=45.0, tau=0.11, dur=0.3):
    n = int(dur * SR)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_dec(n, tau, 0.0015)
    return x + 0.35 * bandn(n, 60, 450) * np.exp(-t / 0.04)


def s_stomp():
    n = int(0.5 * SR)
    t = tt(n)
    x = np.zeros(n)
    at(x, 0, s_thud())
    return x + 0.5 * crinkle(n, 700 * np.exp(-t / 0.12), 1200, 6000)


def s_crunch():
    n = int(0.3 * SR)
    t = tt(n)
    x = np.zeros(n)
    for d, a in ((0, 1.0), (0.011, 0.7), (0.027, 0.85), (0.05, 0.5), (0.075, 0.35)):
        i = int(max(0.0, d + rng.uniform(-0.003, 0.003)) * SR)
        tk = tt(n - i)
        x[i:] += a * (bandn(n - i, 1500, 7000) * np.exp(-tk / 0.0035) + 0.6 * bandn(n - i, 500, 1300) * np.exp(-tk / 0.012))
    x += 0.25 * crinkle(n, 500 * np.exp(-t / 0.08), 1500, 6000)
    return crush(x, 18000)


def s_kick_leaves():
    n = int(1.1 * SR)
    t = tt(n)
    x = np.zeros(n)
    at(x, 0, s_thud(190, 60, 0.07, 0.25), 1.2)
    w = tvf(bandn(n, 300, 9000), logband(lambda tc: 700 * 4 ** np.clip(tc / 0.35, 0, 1), lambda tc: 0.7 + 0 * tc))
    x += 0.45 * w * np.exp(-0.5 * ((t - 0.22) / 0.12) ** 2)
    return x + 0.6 * crinkle(n, 900 * np.exp(-0.5 * ((t - 0.45) / 0.25) ** 2), 1300, 6500)


def s_whirl(dur=0.42, f0=500, f1=2800, p0=-0.7, p1=0.7):
    n = int(dur * SR)
    t = tt(n)
    env = np.sin(np.pi * t / dur) ** 2
    x = tvf(bandn(n, 200, 10000), logband(lambda tc: f0 * (f1 / f0) ** np.sin(np.pi * np.clip(tc / dur, 0, 1)),
                                          lambda tc: 0.55 + 0 * tc))
    x = x * env + 0.25 * crinkle(n, 400 * env, 1500, 6500)
    return pan_curve(x, p0, p1)


def s_magic():
    dur = 1.3
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for i, m in enumerate((98, 95, 93, 91, 88, 86, 83, 81, 79)):     # вниз по пентатонике
        at(out, 0.06 * i, stereo(mbox(m), -0.5 + 0.12 * i), 0.8)
    sh = bandn(n, 5000, 12000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t))
    return out + 0.15 * stereo(sh)


def s_net():
    out = np.zeros(int(0.8 * SR))
    at(out, 0, sq_note(76, 0.12, 0.5, dec=0.2, sus=0.8, rel=0.03))
    at(out, 0.15, sq_note(72, 0.42, 0.5, dec=0.5, sus=0.7, rel=0.08, vib=0.012, vdel=0.12, vrate=6.5, slide=(-3, 0.12, 0.42)))
    return eq(out, biquad("lp", 3500, 0.7))


def s_gust(dur, f0=400, f1=1300, peak=0.4, p0=-0.5, p1=0.5):
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    fc = lambda tc: f0 * (f1 / f0) ** np.exp(-0.5 * ((np.clip(tc / dur, 0, 1) - peak) / 0.25) ** 2)
    x = tvf(bandn(n, 80, 6000), logband(fc, lambda tc: 0.9 + 0 * tc))
    env = np.where(u < peak, sstep(np.clip(u / peak, 0, 1)), sstep(np.clip((1 - u) / (1 - peak), 0, 1)))
    return pan_curve(x * env * (1 + 0.25 * slow(n, 5)), p0, p1)


def s_boing(f0=260.0, f1=780.0, up=0.13, dur=0.32):
    n = int(dur * SR)
    t = tt(n)
    f = f0 * (f1 / f0) ** np.clip(t / up, 0, 1) * (1 + 0.04 * np.sin(2 * np.pi * 17 * t) * np.exp(-t / 0.12) * (t > up))
    x = osc(pulse_tbl(0.125, kfor(f1 * 1.05)), f, n, rng.random())
    return x * (1 - np.exp(-t / 0.002)) * np.exp(-np.maximum(t - up, 0) / 0.08)


def s_bush(dur):
    n = int(dur * SR)
    t = tt(n)
    d = 650 * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t)) ** 2 * sstep(np.clip(t / 0.04, 0, 1)) * sstep(np.clip((dur - t) / 0.15, 0, 1))
    return crinkle(n, d, 900, 5500, 0.004)


def s_empty():
    n = int(0.6 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * 205 * t) * np.exp(-t / 0.05) + 0.3 * np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.02)
    x += 0.3 * bandn(n, 800, 4000) * np.exp(-t / 0.003)
    fall, tf = sweep(700, 170, 0.4, 0.5)
    at(x, 0.07, 0.45 * fall * sstep(np.clip(tf / 0.01, 0, 1)) * np.exp(-tf / 0.25))
    return x


def s_stamp():
    n = int(0.24 * SR)
    t = tt(n)
    tb = pulse_tbl(0.5, kfor(120))
    bz = osc(tb, 110.0, n) + 0.8 * osc(tb, 116.5, n, 0.3)
    env = (1 - np.exp(-t / 0.003)) * np.where(t < 0.17, 1.0, np.exp(-(t - 0.17) / 0.015))
    return eq(0.6 * bandn(n, 1000, 6000) * np.exp(-t / 0.002) + 0.5 * bz * env, biquad("lp", 2800, 0.7))


def s_wilt():
    dur = 0.8
    n = int((dur + 0.1) * SR)
    t = tt(n)
    f = 900 * (330 / 900) ** np.clip(t / dur, 0, 1) * (1 + 0.015 * np.sin(2 * np.pi * 5 * t))
    x = osc(tri_tbl(kfor(1000)), f, n) + 0.25 * osc(pulse_tbl(0.25, kfor(1000)), f, n)
    return x * (1 - np.exp(-t / 0.005)) * np.where(t < dur * 0.7, 1.0, np.exp(-(t - dur * 0.7) / 0.1))


def s_pop_up():
    n = int(0.22 * SR)
    t = tt(n)
    return chirp(350, 1300, 0.07, n) * env_dec(n, 0.06) + 0.3 * bandn(n, 300, 2500) * np.exp(-t / 0.03)


def s_cross():
    dur = 0.2
    n = int(0.32 * SR)
    t = tt(n)
    x = tvf(bandn(n, 200, 9000), logband(lambda tc: 1300 * 3.5 ** np.clip(tc / dur, 0, 1), lambda tc: 0.4 + 0 * tc))
    k = int(SR / 70)
    am = np.repeat(rng.uniform(0.4, 1.0, n // k + 2), k)[:n]           # неровный «чирк»
    x = x * am * np.where(t < dur, sstep(np.clip(t / 0.02, 0, 1)), np.exp(-(t - dur) / 0.02))
    at(x, dur - 0.01, sq_note(57, 0.06, 0.5, dec=0.05, sus=0.6, rel=0.02), 1.2)
    return x


def s_frost(dur):
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    ms_ = (98, 100, 103, 105, 107, 110, 112)
    for _ in range(int(dur * 7)):
        f = float(hz(ms_[int(rng.integers(len(ms_)))]))
        nn = int(0.35 * SR)
        x = np.sin(2 * np.pi * f * tt(nn)) * env_dec(nn, rng.uniform(0.06, 0.15), 0.001) * rng.uniform(0.4, 1.0)
        at(out, rng.uniform(0, max(0.01, dur - 0.2)), stereo(x, rng.uniform(-0.7, 0.7)))
    hiss = bandn(n, 6000, 12000) * 0.04 * sstep(np.clip(t / 0.5, 0, 1)) * sstep(np.clip((dur - t) / 0.5, 0, 1))
    return out + stereo(hiss)


def s_slip():
    n = int(0.55 * SR)
    t = tt(n)
    x = np.zeros(n)
    a, _ = sweep(350, 1400, 0.1)
    b, tb = sweep(1400, 240, 0.3)
    at(x, 0, 0.8 * a)
    at(x, 0.1, 0.8 * b * np.exp(-tb / 0.2))
    return x + 0.5 * bandn(n, 2000, 6500) * np.exp(-0.5 * ((t - 0.12) / 0.07) ** 2)


def s_brr():
    dur = 0.6
    n = int(dur * SR)
    t = tt(n)
    car = osc(pulse_tbl(0.5, kfor(110)), 92 * (1 + 0.08 * np.sin(2 * np.pi * 7 * t)), n)
    am = 0.25 + 0.75 * (0.5 + 0.5 * np.sin(2 * np.pi * 27 * t)) ** 3
    env = sstep(np.clip(t / 0.03, 0, 1)) * sstep(np.clip((dur - t) / 0.2, 0, 1))
    return eq((car + 0.5 * bandn(n, 300, 1800)) * am * env, biquad("lp", 2500, 0.7))


def s_splash():
    n = int(0.9 * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for i, m in enumerate((91, 93, 95, 98, 100, 103, 105, 107)):
        nn = int(0.4 * SR)
        x = np.sin(2 * np.pi * float(hz(m)) * tt(nn)) * env_dec(nn, 0.18, 0.001)
        at(out, 0.032 * i, stereo(x, -0.6 + 0.17 * i))
    return out + stereo(0.12 * bandn(n, 6000, 13000) * np.exp(-t / 0.3) * (1 - np.exp(-t / 0.01)))


NOTES_UP = (79, 83, 86, 88, 91, 88, 86, 91, 95, 93, 91, 95, 98, 103)


def s_note(i):
    return sq_note(NOTES_UP[i % len(NOTES_UP)], 0.07, 0.25, dec=0.05, sus=0.5, rel=0.03)


def s_ding(m, tau=0.35):
    f = float(hz(m))
    n = int(tau * 5 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / (tau * 0.4))
    x += 0.2 * osc(pulse_tbl(0.125, kfor(f)), f, n) * np.exp(-t / 0.05)
    return x * (1 - np.exp(-t / 0.001))


def s_collect():
    out = np.zeros(int(1.0 * SR))
    at(out, 0, s_ding(91, 0.12), 0.8)
    at(out, 0.06, s_ding(98, 0.3))
    return out


def s_pluck():
    n = int(0.25 * SR)
    t = tt(n)
    x = chirp(900, 380, 0.035, n) * np.exp(-t / 0.04) + 0.4 * bandn(n, 1500, 6000) * np.exp(-t / 0.004)
    return x + 0.25 * crinkle(n, 300 * np.exp(-t / 0.06), 1500, 6000)


def s_heart():
    n = int(0.2 * SR)
    return chirp(450, 950, 0.05, n) * env_dec(n, 0.05, 0.003)


def s_save():
    out = np.zeros((2, int(1.2 * SR)))
    for i, m in enumerate((79, 83, 86, 91)):
        at(out, 0.055 * i, stereo(sq_note(m, 0.05, 0.25, dec=0.06, sus=0.6, rel=0.02), -0.2 + 0.13 * i))
    for k in range(4):                     # аккорд и его «эхо»
        for m, p in ((95, -0.3), (98, 0.3)):
            at(out, 0.22 + 0.11 * k, stereo(sq_note(m, 0.09, 0.125, dec=0.1, sus=0.5, rel=0.04), p if k % 2 == 0 else -p), 0.6 ** k)
    return out


def s_daynight(dur=1.6):
    n = int((dur + 0.3) * SR)
    t = tt(n)
    u = np.clip(t / dur, 0, 1)
    env = np.sin(np.pi * u) ** 1.5
    out = np.zeros(n)
    for m in (79, 83, 86):                 # аккорд взлетает на октаву и возвращается
        f = float(hz(m)) * 2 ** np.sin(np.pi * u)
        out += np.sin(2 * np.pi * np.cumsum(f) / SR + rng.uniform(0, 6)) * env
    out += 0.4 * bandn(n, 2500, 9000) * env * (1 + 0.3 * slow(n, 8))
    return pan_curve(out, -0.4, 0.4)


SFX = np.zeros((2, N))
SFX_SEND = np.zeros(N)
SFX_LOG = []
KW = 0.1  # окно для уровня шума, с


def k_loud(x):
    """громкость в окнах 100 мс (сумма каналов, K-взвешенно)"""
    kx = np.stack([kweight(c) for c in x])
    p = (kx ** 2).sum(0)
    w = int(KW * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    return (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])


def audible(x, st):
    env = np.abs(stereo(x)).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    return st + act[0] / SR, st + act[-1] / SR


def place(name, what, t_ev, start, x, peaks=None, parts=None, t_end=None, send=0.06):
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    mov = k_loud(x)
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(float(mov.max()), 1e-20))
    x *= g
    mov = mov * g * g
    j0, j1 = max(0, -i0), min(n_, N - i0)
    if j1 <= j0:
        print(f"внимание: шум {name} вне ролика ({start:.2f} с) — пропущен")
        return
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
    if inl.any():
        rec["t_loudest_line"] = r3(cen[inl][int(np.argmax(mov[inl]))])
    SFX_LOG.append(rec)


def hit(name, what, times, maker, pans=0.0, vels=None, send=0.06, peak_win=0.3):
    """удары: пик каждого — на кадр позже события"""
    times = [float(x) for x in times if 0 <= x < TOTAL]
    if not times:
        return
    xs, peaks = [], []
    for i, te in enumerate(times):
        x = stereo(maker(i), pans(i) if callable(pans) else pans) * (vels[i] if vels else 1.0)
        envp = np.convolve(np.abs(x).sum(0), np.ones(110) / 110, "same")
        pk = int(np.argmax(envp[:max(1, int(peak_win * SR))]))
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


def long(name, what, t0, t1, x, send=0.06, peaks=None):
    """долгий звук начинается на кадр позже события"""
    place(name, what, t0, t0 + FRAME, x, t_end=t1, peaks=peaks, send=send)


# титр
hit("blips", "буквы «ОСЕНЬ» выскакивают — 5 «блипов»", [0.25 + i * 0.12 for i in range(5)], s_blip,
    lambda i: -0.4 + 0.2 * i, send=0.12)
# шорох шагов по листьям на беге
RUNS = [(2.0, L(1) + 0.9), (L(6) - 0.1, W("zagreb") - 0.35), (L(21) - 0.3, W("tolko")), (L(33) - 0.3, W("tolko2"))]
for k, (a_, b_) in enumerate(RUNS, 1):
    ts = [x + rng.uniform(-0.015, 0.015) for x in np.arange(a_, b_ - 0.05, 0.18)]
    if ts:
        hit(f"steps{k}", f"бег по листьям — шорох шагов ({len(ts)} шт.)", ts, lambda i: s_step(),
            lambda i: 0.15 if i % 2 else -0.15, vels=[rng.uniform(0.7, 1.0) for _ in ts], peak_win=0.05)
# строфа 1–2
hit("stomp", "герой топает по листьям — глухой удар и шорох (2 шт.)", [W("topchu") + 0.22, W("topchu") + 0.84],
    lambda i: s_stomp(), lambda i: -0.1 + 0.2 * i, peak_win=0.05)
hit("crunch", "сучья трещат — «ХРУСЬ» (3 шт.)", [W("suchya") + 0.05, W("treshch") + 0.05, W("treshch") + 0.4],
    lambda i: s_crunch(), lambda i: (-0.3, 0.25, 0.4)[i], peak_win=0.05)
hit("kick_leaves", "пинок — фонтан листьев", [W("zagreb") + 0.15], lambda i: s_kick_leaves(), 0.1, peak_win=0.06)
TW = [L(5) - 0.15, L(9) - 0.3, L(13) - 0.3, L(17) - 0.3, L(21) - 0.3, L(33) - 0.3]
hit("whirls", f"переходы — вихри листьев ({len(TW)} шт., пик в середине)", TW, lambda i: s_whirl(p0=-0.7, p1=0.7),
    peak_win=0.42)
hit("magic", "переход в воспоминание — «волшебное» растворение", [L(25) - 0.3], lambda i: s_magic(), send=0.3,
    peak_win=0.1)
# строфа 3
hit("net", "«Нет…» — грустный спад тона", [W("net")], lambda i: s_net(), 0.0, peak_win=0.1)
hit("gust", "порыв ветра срывает тайну леса", [W("tainu")], lambda i: s_gust(1.1, peak=0.35), peak_win=0.6)
hit("boing", "прыжок к лещине — «боинг»", [W("sorvan") + 0.1], lambda i: s_boing(), 0.1, peak_win=0.15)
long("bush", "куст лещины трясётся", W("sorvan") + 0.35, W("sorvan") + 0.9, s_bush(0.55))
hit("empty", "блок пустой — глухой стук и спад тона", [W("oreh") + 0.05], lambda i: s_empty(), 0.1, peak_win=0.05)
hit("stamp", "крестик в слоте секрета (4 шт.)",
    [W("oreh") + 0.35, W("cvetok") + 0.15, W("gruzd") + 0.45, W("kistey") + 0.3], lambda i: s_stamp(), 0.35,
    peak_win=0.05)
long("wilt", "цветок вянет — нисходящий глиссандо", W("svyanul"), W("svyanul") + 0.8, s_wilt())
# строфа 4
hit("cloud", "облачко-мечта появляется — поп вверх (2 шт.)", [L(14) - 0.35, L(16) - 0.3], lambda i: s_pop_up(), 0.25,
    peak_win=0.1)
hit("cross", "мечта перечёркивается (2 шт.)", [W("gruzd") + 0.15, W("kistey") + 0.1], lambda i: s_cross(), 0.25,
    peak_win=0.2)
# строфа 5
long("frost", "иней ползёт по листьям — тихие звонкие искры", L(17), E(18), s_frost(max(0.5, E(18) - L(17))), send=0.2)
hit("slip", "поскользнулся на инее", [W("moroz") + 0.1], lambda i: s_slip(), -0.1, peak_win=0.2)
hit("brr", "«брр» — герой ёжится", [W("moroz") + 1.05], lambda i: s_brr(), 0.0, peak_win=0.3)
# строфы 6 и 9
hit("gust_smert", "«Смерть стелет жатву» — тёмный порыв ветра (2 шт.)", [W("smert"), W("smert2")],
    lambda i: s_gust(1.5, 250, 700, 0.3, 0.5, -0.5), peak_win=0.7)
hit("splash", "«Только я весел» — искристый всплеск (2 шт.)", [W("tolko"), W("tolko2")], lambda i: s_splash(),
    send=0.25, peak_win=0.05)
hit("jump", "прыжок героя (2 шт.)", [W("tolko") + 0.05, W("tolko2") + 0.05], lambda i: s_boing(300, 900, 0.12, 0.3),
    0.05, peak_win=0.15)
hit("notes1", "«пою!» — летят весёлые ноты (9 шт.)", [W("tolko") + 0.45 + i * 0.22 for i in range(9)], s_note,
    lambda i: -0.4 + 0.1 * i, send=0.15, peak_win=0.05)
hit("notes2", "«пою!» — летят весёлые ноты (14 шт.)", [W("tolko2") + 0.45 + i * 0.22 for i in range(14)], s_note,
    lambda i: -0.5 + 0.075 * i, send=0.15, peak_win=0.05)
# строфа 7
hit("ding_mhov", "росток подснежника — «динь»", [W("mhov")], lambda i: s_ding(98), 0.2, send=0.2, peak_win=0.05)
hit("pluck", "сорвал подснежник", [W("rval") - 0.35], lambda i: s_pluck(), 0.1, peak_win=0.05)
T0c = W("vplot") - 0.2
stp = ((E(28) - 0.2) - T0c - 0.6) / 5
TC = [W("rval") - 0.35] + [T0c + 0.45 + i * stp for i in range(5)]
hit("collect", f"«плюс в коллекцию» ({len(TC)} шт.)", TC, lambda i: s_collect(), lambda i: -0.3 + 0.12 * i, send=0.2,
    peak_win=0.12)
# строфа 8
TH = [L(29) + i * 0.25 for i in range(5)] + [L(30) + i * 0.25 for i in range(5)]
hit("hearts", "пузыри-сердечки (10 шт.)", TH, lambda i: s_heart(), lambda i: -0.4 + 0.2 * (i % 5), send=0.15,
    peak_win=0.06)
hit("save", "«СОХРАНЕНО» — джингл сохранения", [W("vspomnyu")], lambda i: s_save(), send=0.2, peak_win=0.05)
hit("daynight", "смена ночь → день → ночь — мягкий перелив", [W("dni")], lambda i: s_daynight(), send=0.25,
    peak_win=1.7)
# финал
hit("whirl_fin", "финал — вихрь листьев", [FIN], lambda i: s_whirl(0.5, p0=0.7, p1=-0.7), peak_win=0.5)
hit("fin_blips", "буквы «ОСЕНЬ» в финале — 5 «блипов»", [FIN + 0.1 + i * 0.12 for i in range(5)], s_blip,
    lambda i: -0.4 + 0.2 * i, send=0.12)
SFX_LOG.sort(key=lambda r: r["start"])

IR_S = [make_ir(0.7, 1.0, 21, 7000, 0.01), make_ir(0.7, 1.0, 22, 7000, 0.01)]
sfx_all = SFX + np.stack([convolve(SFX_SEND, IR_S[0]), convolve(SFX_SEND, IR_S[1])]) * 0.6
sfx_all[:, N - int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))


# ---------- мягкий ограничитель пиков (только если нужно) ----------
def limiter(x, ceil=0.89, look=0.004, hold=0.08):
    pk = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    if g.min() >= 1.0:
        return x, 1.0
    a, h = int(look * SR), int(hold * SR)
    m = g.copy()                      # минимум по окну [i − a, i + h]
    span = 1
    while span < a + h:
        sh = min(span, a + h - span)
        m[:-sh] = np.minimum(m[:-sh], m[sh:])
        span += sh
    m = np.concatenate([np.ones(h), m])[:len(g)]
    c = np.cumsum(np.concatenate([[1.0] * a, m]))
    sm = (c[a:] - c[:-a]) / a
    sm = np.minimum(sm[:len(g)], 1.0)
    return x * sm, float(sm.min())


out = shaped + sfx_all
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
per_line = {str(i): f1(dB(ms(SH, [SPEECH[i - 1]])) - dB(ms(VCH, [SPEECH[i - 1]]))) for i in range(1, NL + 1)}
levels = {
    "note": "музыка без шумов (из make_music.py): RMS, дБ к голосу; lines — к голосу той же строки, остальное — к "
            "среднему голосу в местах речи",
    "lines": per_line,
    "under_voice": rel(SH, SPEECH),
    "intro": rel(SH, W_INTRO),
    "gaps": {f"{i}|{i + 1}": rel(SH, [(a_, b_)]) for i, a_, b_ in LIFTS},
    "tail": rel(SH, W_TAIL) if has_tail else None,
    "final": rel(SH, W_FIN),
}
with open(os.path.join(os.path.dirname(os.path.abspath(args.out)), "sfx.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "секунды ролика. t — событие в кадре (t_end — конец долгого действия); peak/peaks — пик звука (на кадр "
                "позже события); start/end — где звук слышен, parts — где слышен каждый удар серии; db — громкость шума "
                "к среднему голосу (самое громкое окно 100 мс, K-взвешенно, BS.1770), db_lines — то же, но самое громкое "
                "окно на строке (null — на строки не попадает); bed — тихая долгая подложка. music — ключевые моменты "
                "музыки, levels — уровни музыки.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN,
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

bpm = lambda G: 180 / G.bar
print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"такты и темп ♩: фанфара {GF.n}×{bpm(GF):.0f}, тема {G1.n}×{bpm(G1):.0f}, минор {G2a.n}×{bpm(G2a):.0f} + "
      f"{G2b.n}×{bpm(G2b):.0f}, иней {G2c.n}×{bpm(G2c):.0f}, после «Только» {G3c.n}×{bpm(G3c):.0f}, шкатулка "
      f"{G4.n}×{bpm(G4):.0f}, ночь {G5.n}×{bpm(G5):.0f}, яркая часть {G6c.n}×{bpm(G6c):.0f}, каденция {n_cad}×{180 / bar_f:.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом (без шумов): RMS {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка без шумов, дБ к голосу строки):", " ".join(f"{k}:{v}" for k, v in per_line.items()))
print(f"фанфара {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
print("баланс шин (усиление, дБ): " + ", ".join(f"{k} {f1(20 * np.log10(max(BUS_G[k], 1e-9)))}" for k in BUSES))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS, ограничитель {lim:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы (db — цель, db_lines — самое громкое окно на строке):")
for r in SFX_LOG:
    pk = r.get("peak", (r.get("peaks") or [r["start"]])[0])
    print(f"  {r['name']:12s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:4d}  "
          f"на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
