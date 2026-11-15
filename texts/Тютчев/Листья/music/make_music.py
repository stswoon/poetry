#!/usr/bin/env python3
"""Музыка и шумы к стиху Ф. И. Тютчева «Листья», стиль «перекладка из осенних листьев на крафт-бумаге».

Свой лёгкий вальс на 3/4, ре мажор. Мелодии и гармония свои, ни на какой известный вальс не опираются.
Инструменты — синтез (numpy):
  пиццикато струнных — контрабас и виолончель на первую долю, альты «па-па» на вторую и третью, скрипки ведут тему
  в строфе 1 (шина pz — аккомпанемент, шина mel — мелодия);
  челеста — тема строфы 2, отголоски в строфе 3, вихрь-арпеджио в строфе 4, вступление и финал (шина cel);
  флейта — мотив во вступлении, «смешки» и зевок в строфе 1, подголосок в строфе 2, тема строф 3 и 4 (шина fl);
  струнные смычком — тихая подложка в строфе 3, тремоло с «порывами» в строфе 4, финальный аккорд (шина str).
План (секунды ролика берутся из events.json):
  0 … L1      вступление, 3 такта: челеста взлетает за буквами, флейта показывает мотив, буквы сдувает — челеста вниз;
  строфа 1    насмешливый вальс-пиццикато: форшлаги, «ха-ха» флейты, на «свежа» флейта зевает (тон съезжает вниз),
              в паузе пробежка вверх — лист-шутник прыгает к клёну;
  строфа 2    ярко и звонко: тема у челесты, «па-па» со скрипками октавой выше, флейта тянет подголосок;
              в паузе челеста спускается по фа-диез-мажорному аккорду в си минор;
  строфа 3    си минор, медленнее (2 фразы по 4 такта, вторая начинается в паузе перед строкой 21) и тише:
              флейта одна, тихие струнные, челеста роняет ноты; на «улететь» — подъём к ля-доминанте, тремоло;
  строфа 4    ре мажор, ускорение и нарастание: тремоло струнных с «порывами», флейта с пробежками-порывами,
              с «сорвите» — вихрь челесты; после голоса всё взлетает к финалу;
  fin … конец светлый ре-мажорный аккорд (струнные, челеста, флейта), «кнопка» и затихание.
Громкость: под голосом музыка на 18–20 дБ тише голоса (RMS по каждой строке, LINE_DB), громче на заставке,
в паузах между строфами и в финале; под голосом у музыки ещё мягкий провал −3 дБ около 2,5 кГц (место для речи).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список — sfx.json).

Запуск: python3 make_music.py [--intro 3.6] [--outro 5.6] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json)
Читает events.json (его пишет ../video/build.py; при другом вступлении все события сдвигаются), ../timings.json
(длина голоса) и ../voice.mp3 (через ffmpeg — уровни строк). Пишет music.wav (44,1 кГц, 16 бит, стерео,
длина = вступление + голос + финал) и рядом с ним sfx.json (шумы, уровни, ключевые моменты музыки). Нужны python3 + numpy и ffmpeg.
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
# музыка: RMS, дБ к RMS голоса той же строки
LINE_DB = {i: -19.0 for i in range(1, 9)} | {3: -19.3, 4: -19.3}  # строфа 1 (на строках 3–4 ещё метель)
LINE_DB |= {i: -18.6 for i in range(9, 17)}                     # строфа 2 — ярче
LINE_DB |= {17: -19.8, 18: -19.8, 19: -19.8, 20: -19.8, 21: -19.6, 22: -19.6, 23: -19.4, 24: -19.0}  # строфа 3 — тише
LINE_DB |= {25 + k: -19.4 + 0.1 * k for k in range(8)}          # строфа 4 — нарастание (−19,4 → −18,7; ещё ветер)
INTRO_DB = -8.0      # заставка, к среднему голосу
GAP_DB = 6.0         # паузы между строфами: выше соседних строк
PAUSE_DB = 3.0       # долгая пауза внутри строфы (от 0,7 с)
TAIL_DB = -9.0       # после голоса до fin (листья кружат), к среднему голосу
FIN_DB = -7.0        # финальный аккорд
FADE_OUT = 2.4       # затихание в конце, с
DIP_DB = -3.0        # провал музыки около 2,5 кГц под голосом
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {
    "intro_gust": -11, "intro_letters": -19, "intro_blow": -12,
    "trees_pop": -19, "blizzard": -28, "hog_roll": -24, "hog_pip": -19,
    "smear_slap": -18, "fir_shake": -23, "fir_yawn": -21, "leaf_flight": -22, "leaf_cling": -21,
    "sparkle_blest": -21, "sparkle_krase": -21, "hourglass_ding": -19, "hourglass_tick": -29,
    "sunrise": -23, "bird_song": -23, "bird_song_gap": -16, "bird_flaps": -21, "bird_arrive": -22, "sun_plinks": -21,
    "dew_fall": -26, "dew_plop": -18, "zephyrs": -23,
    "wind": -13, "leaf_tear": -18, "camera_leaves": -19, "fin_pops": -14, "fin_sub": -17,
}
# у долгих шумов под строками дополнительное приглушение, дБ (в паузах звучат в полную силу)
SFX_DUCK = {"blizzard": 4.0, "zephyrs": 8.0, "wind": 9.0}   # они же — часть подложки (bed) для check_mix.py

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, encoding="utf-8") as f:
    RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Листьям» Тютчева")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW.get('OUTRO')})")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV")
args = ap.parse_args()
V0 = args.intro if args.intro is not None else float(RAW["V0"])
OUTRO = args.outro if args.outro is not None else float(RAW["OUTRO"])
if V0 < 2.4:
    sys.exit("вступление короче 2,4 с: заставке не хватит места")

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
if NL != 32:
    sys.exit(f"ожидалось 32 строки, в events.json {NL}")
for i in (1, NL // 2, NL):  # events.json должен быть собран по тем же таймингам
    ln = TJ["lines"][i - 1]
    if abs(ln["start"] + V0 - EV[f"L{i}"]) > 0.02 or abs(ln["end"] + V0 - EV[f"E{i}"]) > 0.02:
        print(f"внимание: строка {i} в events.json не совпадает с timings.json — перезапусти ../video/build.py")
if abs(float(RAW["total"]) + SHIFT - TOTAL) > 0.002:
    print(f"внимание: длина {TOTAL} с, а в events.json total {RAW['total']} (+сдвиг {SHIFT:+.3f}) — другой финал?")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = EV["fin"]
if FIN > TOTAL - 2.5:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
STANZA_END = (8, 16, 24)
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1830)
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


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def fade_tail(x, sec=0.01):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


def held(x, d, rel=0.05):
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
    """бумажный шорох: россыпь коротких хрустов; dens — хрустов в секунду (число или кривая)"""
    n = int(n)
    d = np.broadcast_to(np.asarray(dens, float), (n,))
    imp = (rng.random(n) < d / SR) * rng.uniform(0.25, 1.0, n)
    ker = np.exp(-tt(int(tau * 6 * SR)) / tau)
    envc = np.convolve(imp, ker)[:n]
    return bandn(n, lo, hi) * envc


# ---------- генераторы ----------
TBL = 4096
_PH = np.arange(TBL) / TBL


def mktable(amps):
    w = np.zeros(TBL)
    for k, a in enumerate(amps, 1):
        if a:
            w += a * np.sin(2 * np.pi * k * _PH)
    return w / np.max(np.abs(w))


def osc(tbl, f, n, ph0=0.0):
    n = int(n)
    ph = ph0 + (f * np.arange(n) / SR if np.isscalar(f) else np.cumsum(f) / SR)
    x = (ph % 1.0) * TBL
    i = x.astype(np.int64)
    fr = x - i
    return tbl[i % TBL] * (1 - fr) + tbl[(i + 1) % TBL] * fr


# пиццикато: tau (с) на 330 Гц, точка щипка, резонансы корпуса (Гц, дБ, ширина в октавах)
PZ = {
    "vn": (0.30, 0.19, [(470, 6, .5), (1050, 4, .6), (2700, 3, .7)]),
    "va": (0.36, 0.20, [(380, 6, .5), (900, 4, .6), (2300, 3, .7)]),
    "vc": (0.42, 0.21, [(210, 6, .5), (520, 4, .6), (1400, 3, .7)]),
    "cb": (0.50, 0.22, [(110, 5, .5), (300, 4, .6), (900, 2, .7)]),
}
_PZC = {}


def pizz(m, kind="vn", bright=0.6):
    key = (int(m), kind, round(float(bright), 1))
    if key in _PZC:
        return _PZC[key]
    tau0, p, body = PZ[kind]
    bright = key[2]
    f = float(hz(m))
    tau1 = float(np.clip(tau0 * (330 / f) ** 0.4, 0.09, 1.3))
    n = int((min(5 * tau1, 3.0) + 0.02) * SR)
    t = tt(n)
    K = max(1, min(30, int(9500 / f)))
    k = np.arange(1, K + 1)
    fk = k * f * np.sqrt(1 + 0.00012 * k * k)
    a = np.abs(np.sin(np.pi * k * p)) / k ** (1.3 - 0.5 * bright)
    for fb, g, w in body:
        a = a * (1 + (db(g) - 1) * np.exp(-0.5 * (np.log2(fk / fb) / w) ** 2))
    a[fk > 12000] = 0
    tauk = tau1 / (1 + (0.42 - 0.18 * bright) * (k - 1))
    ph0 = rng.uniform(0, 2 * np.pi, K)
    drift = 2 * np.pi * np.cumsum(1 + 0.004 * np.exp(-t / 0.02)) / SR   # в первый миг щипка тон чуть выше
    x = (a[:, None] * np.exp(-t[None, :] / tauk[:, None]) * np.sin(fk[:, None] * drift[None, :] + ph0[:, None])).sum(0)
    x *= 1 - np.exp(-t / 0.0012)
    x += 0.18 * (0.5 + bright) * np.max(np.abs(x)) * bandn(n, 700, 4500) * np.exp(-t / 0.004)   # палец по струне
    x = fade_tail(x / np.max(np.abs(x)), 0.01)
    _PZC[key] = x
    return x


_CEL = {}


def celesta(m):
    m = int(m)
    if m in _CEL:
        return _CEL[m]
    f = float(hz(m))
    tau = float(np.clip(1.5 * (523 / f) ** 0.55, 0.35, 2.6))
    n = int((min(tau * 4.5, 4.0) + 0.02) * SR)
    t = tt(n)
    ph = 2 * np.pi * f * t
    x = np.sin(ph) * np.exp(-t / tau)
    x += 0.3 * np.sin(ph * 1.0016 + 1.1) * np.exp(-t / (tau * 0.8))      # лёгкое биение — «стеклянный» звон
    x += 0.2 * np.sin(2 * ph + 0.3) * np.exp(-t / (tau * 0.22))
    if 2.76 * f < 16000:
        x += 0.16 * np.sin(2.76 * ph) * np.exp(-t / 0.07)                   # металл пластинки
    if 5.4 * f < 16000:
        x += 0.06 * np.sin(5.4 * ph) * np.exp(-t / 0.025)
    x *= 1 - np.exp(-t / 0.0015)
    x += 0.05 * bandn(n, 2000, 8000) * np.exp(-t / 0.003)                   # молоточек в войлоке
    x = fade_tail(x / np.max(np.abs(x)), 0.02)
    _CEL[m] = x
    return x


_FLT = {}


def flute_tbl(m):
    k = 0 if m < 74 else (1 if m < 83 else 2)
    if k not in _FLT:
        _FLT[k] = mktable([[1, .55, .26, .12, .06, .03], [1, .38, .14, .06, .025], [1, .22, .07, .025]][k])
    return _FLT[k]


def flute(m, dur, att=0.06, rel=0.1, bend=0.0, vib=1.0):
    f = float(hz(m))
    n = int((dur + 5 * rel + 0.02) * SR)
    t = tt(n)
    vd = 0.0042 * vib * np.clip((t - 0.2) / 0.4, 0, 1)
    fr = f * (1 + vd * np.sin(2 * np.pi * rng.uniform(4.9, 5.4) * t + rng.uniform(0, 6.3)))
    fr *= 1 - 0.006 * np.exp(-t / 0.03)                                    # тон «подъезжает» снизу
    if bend:
        fr *= 2 ** (bend / 12 * sstep(prog(t, dur * 0.5, dur)))
    tone = osc(flute_tbl(m), fr, n, rng.random())
    env = (1 - np.exp(-t / (att / 3))) * (1 + 0.05 * sstep(prog(t, att, max(att + 0.01, dur))))
    env *= np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    lo = 2 ** (round(np.log2(f * 0.8) * 2) / 2)
    breath = bandn(n, lo, lo * 4) * (1 + 0.4 * slow(n, 6) if n > SR // 4 else 1)
    chiff = bandn(n, 2000, 9000) * np.exp(-t / 0.018) * (1 - np.exp(-t / 0.002))
    x = env * (tone + 0.045 * breath) + 0.1 * chiff * min(1.0, att / 0.03)
    return fade_tail(x, 0.01)


_SAW = {}


def sawtbl(K):
    if K not in _SAW:
        _SAW[K] = mktable([1 / k ** 1.15 for k in range(1, K + 1)])
    return _SAW[K]


def strings(notes, dur, att=0.25, rel=0.45, trem=0.0, rate=13.0, cresc=(1.0, 1.0), pan=0.0, width=0.7):
    """струнные смычком: по 3 голоса на ноту с расстройкой; trem — доля тремоло (0…1)"""
    n = int((dur + 5 * rel) * SR)
    t = tt(n)
    env = sstep(np.clip(t / att, 0, 1)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    env *= np.interp(t, [0, dur], cresc)
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        f = float(hz(m))
        tbl = sawtbl(int(min(40, 6500 / f)))
        for v, cents in enumerate((-6, 0, 7)):
            vib = 1 + 0.0035 * np.sin(2 * np.pi * rng.uniform(5.0, 6.0) * t + rng.uniform(0, 6.3))
            x = osc(tbl, f * 2 ** (cents / 1200) * vib, n, rng.random())
            if trem > 0:
                pulse = (0.5 + 0.5 * np.cos(2 * np.pi * rate * rng.uniform(0.93, 1.07) * t + rng.uniform(0, 6.3))) ** 2
                x = x * ((1 - trem) + trem * 2.2 * pulse) + trem * 0.12 * bandn(n, 1500, 6000) * pulse
            p = pan + width * ((j / max(1, len(notes) - 1)) - 0.5) + 0.2 * (v - 1)
            gl, gr = pan_gains(p)
            out[0] += x * gl
            out[1] += x * gr
    return out * env / (1.7 * len(notes))


# ---------- шины ----------
BUSES = ("pz", "mel", "cel", "fl", "str")
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_G = {"pz": 0.8, "mel": 1.6, "cel": 1.0, "fl": 1.0, "str": 1.4}      # баланс (подобран по отчёту, K-взвешенно)
BUS_SEND = {"pz": 0.22, "mel": 0.25, "cel": 0.35, "fl": 0.3, "str": 0.3}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += g * x[:, j0:j1]


def p_pizz(t, m, vel, kind="vn", hold=None, bus="pz", pan=0.0):
    x = pizz(m, kind, 0.3 + 0.5 * min(1.0, vel))
    if hold is not None:
        x = held(x, hold, 0.03)
    put(bus, t, x, pan, vel)


def p_cel(t, m, vel, dur=0.5, pan=0.3):
    put("cel", t, held(celesta(m), max(dur, 0.45), 0.3), pan, vel)


def p_fl(t, m, dur, vel, pan=0.12, **kw):
    put("fl", t, flute(m, dur, **kw), pan, vel)


def p_str(t, notes, dur, vel, **kw):
    put("str", t, strings(notes, dur, **kw), 0.0, vel)


class Grid:
    """такты: начала тактов s[0..n]; доля 0…3, вторая доля чуть раньше (венская «раскачка»)"""

    def __init__(self, starts, lilt=0.96):
        self.s = np.asarray(starts, float)
        self.lilt = lilt
        self.n = len(self.s) - 1

    def t(self, b, beat):
        q = int(np.floor(beat / 3 + 1e-9))
        b, beat = b + q, beat - 3 * q
        if b >= self.n:
            ln = self.s[-1] - self.s[-2]
            base = self.s[-1] + (b - self.n) * ln
        else:
            base, ln = self.s[b], self.s[b + 1] - self.s[b]
        return base + ln * float(np.interp(beat, [0, 1, 2, 3], [0, self.lilt, 2, 3])) / 3

    def blen(self, b):
        return self.s[b + 1] - self.s[b]


def grid(t0, t1, nbars, weights=None):
    w = np.ones(nbars) if weights is None else np.asarray(weights, float)
    return t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(w)]) / w.sum()


# ---------- партитура ----------
CH = {  # бас (основной тон), «па-па» альтов
    "D": (38, (57, 62, 66)), "G": (43, (59, 62, 67)), "A7": (45, (55, 61, 64)), "Bm": (47, (54, 59, 62)),
    "Em": (40, (55, 59, 64)), "E7": (40, (56, 62, 64)), "F#7": (42, (58, 61, 64)),
}
STR = {  # аккорды струнных смычком
    "D": (50, 57, 62, 66, 69), "G": (43, 55, 59, 62, 67), "A7": (45, 57, 61, 64, 67), "Bm": (47, 54, 59, 62, 66),
    "Em": (40, 55, 59, 64, 67), "E7": (40, 56, 59, 62, 64), "F#7": (42, 54, 58, 61, 64),
}
ARP = {  # вихрь челесты: восьмые вверх-вниз
    "D": (74, 78, 81, 86, 81, 78), "G": (74, 79, 83, 86, 83, 79), "A7": (73, 76, 79, 85, 79, 76),
    "Bm": (74, 78, 83, 86, 83, 78), "E7": (74, 76, 80, 83, 80, 76),
}
RUN = lambda notes, beat0=2.0: [(beat0 + i / 6, 1 / 6, m, "r") for i, m in enumerate(notes)]   # пробежка за долю

# строфа 1: насмешливая тема у скрипок пиццикато (такты 1–8), флейта «смеётся»; такты 9–12 — флейта, зевок
S1 = [
    ("D", [(0, 1, 78, "g"), (1, .5, 77), (1.5, .5, 78), (2, 1, 81)]),
    ("A7", [(0, 1, 79), (1, 1, 76), (2, 1, 73)]),
    ("A7", [(0, 1, 76, "g"), (1, .5, 75), (1.5, .5, 76), (2, 1, 79)]),
    ("D", [(0, 1.5, 78), (1.5, .5, 76), (2, .5, 74), (2.5, .5, 74)]),
    ("D", [(0, 1, 78, "g"), (1, .5, 77), (1.5, .5, 78), (2, 1, 83)]),
    ("G", [(0, 1, 83), (1, 1, 81), (2, 1, 79)]),
    ("A7", [(0, .5, 76), (.5, .5, 78), (1, .5, 79), (1.5, .5, 81), (2, 1, 73)]),
    ("D", [(0, 1, 74), (1, 1, 69), (2, 1, 62)]),
]
S1_LAUGH = {3: [(2, 1 / 3, 86, "s"), (7 / 3, 1 / 3, 86, "s"), (8 / 3, 1 / 3, 83, "s")],
            7: [(1, 1 / 3, 81, "s"), (4 / 3, 1 / 3, 78, "s"), (5 / 3, 1 / 3, 74, "s")]}
S1F = [
    ("Bm", [(0, 1, 74), (1, 1, 73), (2, 1, 71)]),
    ("E7", [(0, 1, 68), (1, 1, 71), (2, 1, 74)]),
    ("A7", [(0, 3, 73, "yawn")]),
    ("A7", [(0, 1, 69)] + [(1 + i / 3, 1 / 3, m, "r") for i, m in enumerate((71, 73, 74, 76, 78, 79))]),
]
# строфа 2: звонкая тема у челесты, подголосок флейты
S2 = [
    ("D", [(0, 1, 81), (1, 1, 86), (2, 1, 85)]),
    ("G", [(0, 1.5, 83), (1.5, .5, 81), (2, 1, 79)]),
    ("A7", [(0, 1, 76), (1, 1, 79), (2, 1, 85)]),
    ("D", [(0, 2, 86), (2, .5, 81), (2.5, .5, 78)]),
    ("Bm", [(0, 1, 78), (1, 1, 83), (2, 1, 86)]),
    ("G", [(0, 1.5, 88), (1.5, .5, 86), (2, 1, 83)]),
    ("E7", [(0, 1, 80), (1, 1, 83), (2, 1, 86)]),
    ("A7", [(0, 2, 85), (2, 1, 88)]),
    ("D", [(0, 1, 90), (1, .5, 88), (1.5, .5, 86), (2, 1, 81)]),
    ("G", [(0, 1, 83), (1, 1, 86), (2, 1, 91)]),
    ("A7", [(0, 1, 88), (1, .5, 86), (1.5, .5, 85), (2, 1, 83)]),
    ("F#7", [(0, 1, 82)] + [(1 + i / 3, 1 / 3, m) for i, m in enumerate((85, 82, 78, 76, 73, 70))]),
]
S2_FL = [78, 79, 79, 78, 74, 74, 74, 76, 78, 79, 76]
# строфа 3: си минор, флейта одна; вторая фраза — вопрос («желтеть?») и решимость («улететь!»)
S3 = [
    ("Bm", [(0, 1, 78), (1, 1, 74), (2, 1, 71)]),
    ("Em", [(0, 2, 79), (2, 1, 78)]),
    ("F#7", [(0, 1, 76), (1, 1, 73), (2, 1, 70)]),
    ("Bm", [(0, 3, 71)]),
    ("Em", [(0, 1, 71), (1, 1, 76), (2, 1, 79)]),
    ("F#7", [(0, 1.5, 78), (1.5, .5, 76), (2, 1, 73)]),
    ("G", [(0, 1, 74), (1, 1, 79), (2, 1, 83)]),
    ("A7", [(0, 1, 81), (1, .5, 83), (1.5, .5, 85), (2, 1, 88)]),
]
S3_CEL = {0: [(2, .5, 90), (2.5, .5, 86)], 3: [(1, .5, 90), (1.5, .5, 86), (2, .5, 83), (2.5, .5, 78)],
          5: [(2.5, .5, 85)], 7: RUN((81, 83, 85, 86, 88, 90))}
# строфа 4: ре мажор, ускорение; флейта с пробежками-порывами
S4 = [
    ("D", [(0, 2, 81), (2, 1, 78)]),
    ("G", [(0, 2, 83)] + RUN((74, 76, 78, 79, 81, 83))),
    ("A7", [(0, 1, 85), (1, 1, 88), (2, 1, 85)]),
    ("D", [(0, 2, 86)] + RUN((76, 78, 79, 81, 83, 85))),
    ("Bm", [(0, 2, 86), (2, 1, 83)]),
    ("G", [(0, 1, 79), (1, 1, 83)] + RUN((78, 79, 81, 83, 85, 86))),
    ("E7", [(0, 2, 88), (2, 1, 86)]),
    ("A7", [(0, 1, 85), (1, 1, 83)] + RUN((79, 81, 83, 85, 86, 88))),
    ("D", [(0, 1, 90), (1, 1, 88), (2, 1, 86)]),
    ("G", [(0, 1, 83), (1, 1, 86)] + RUN((78, 79, 81, 83, 85, 86))),
    ("A7", [(0, 2, 88), (2, 1, 91)]),
    ("A7", [(0, 1, 85), (1, .25, 88), (1.25, .25, 85), (1.5, .25, 81), (1.75, .25, 85)] + RUN((81, 83, 85, 86, 88, 90))),
]


def play(G, b0, bars, inst, vel=1.0, legato=0.95, pan=None, vel_fn=None):
    for i, (_, notes) in enumerate(bars):
        v = vel * (vel_fn(i) if vel_fn else 1.0)
        for nt in notes:
            beat, d, m = nt[0], nt[1], nt[2]
            opt = nt[3] if len(nt) > 3 else ""
            t0, t1 = G.t(b0 + i, beat), G.t(b0 + i, beat + d)
            dur = t1 - t0
            if inst == "pizz":
                if "g" in opt:
                    p_pizz(t0 - 0.05, m - 1, v * 0.5, "vn", hold=0.05, bus="mel", pan=0.3)
                p_pizz(t0, m, v, "vn", bus="mel", pan=0.3 if pan is None else pan)
            elif inst == "flute":
                if "g" in opt:
                    p_fl(t0 - 0.06, m - 1, 0.05, v * 0.6, att=0.012)
                if "s" in opt:
                    p_fl(t0, m, dur * 0.5, v * 0.9, att=0.02, rel=0.05)
                elif "r" in opt:
                    p_fl(t0, m, dur * 1.05, v * 0.8, att=0.012, rel=0.04, vib=0.0)
                else:
                    p_fl(t0, m, dur * legato, v, att=0.05 if dur > 0.3 else 0.025, bend=-1.0 if opt == "yawn" else 0.0)
            elif inst == "cel":
                p_cel(t0, m, v * (0.8 if "r" in opt else 1.0), dur, pan=0.3 if pan is None else pan)


def acc(G, b0, chords, style, vel=1.0, vel_fn=None):
    """вальсовый аккомпанемент: бас на первую долю, «па-па» на вторую и третью"""
    prev = None
    pah = {"pizz": 0.5, "bright": 0.55, "soft": 0.26, "trem": 0.3, "intro": 0.45}[style]
    for i, ch in enumerate(chords):
        b = b0 + i
        root, up = CH[ch]
        bass = root if ch != prev else (root + 7 if root + 7 <= 47 else root - 5)
        prev = ch
        v = vel * (vel_fn(i) if vel_fn else 1.0)
        tb = G.t(b, 0)
        p_pizz(tb, bass, 0.9 * v * (0.75 if style == "soft" else 1.0), "cb", pan=-0.05)
        p_pizz(tb + 0.004, bass + 12, 0.5 * v, "vc", pan=-0.2)
        for beat in (1, 2):
            tp = G.t(b, beat)
            for j, m in enumerate(up):
                p_pizz(tp + 0.006 * j, m, pah * v * (0.88 if beat == 2 else 1.0), "va", hold=0.16, pan=-0.38 + 0.1 * j)
                if style == "bright":
                    p_pizz(tp + 0.008 * j, m + 12, 0.3 * v, "vn", hold=0.12, pan=0.3 + 0.08 * j)


chords = lambda bars: [c for c, _ in bars]

# сетки тактов: начала разделов — чуть раньше первой строки строфы
I0 = 0.1
B1, B2, B3, B4 = L(1) - 0.06, L(9) - 0.06, L(17) - 0.06, L(25) - 0.06
M3 = (E(20) + L(21)) / 2 - 0.05                        # вторая фраза строфы 3 — в паузе перед строкой 21
assert B2 - B1 > 9 and B3 - B2 > 9 and M3 - B3 > 4 and B4 - M3 > 4 and FIN - B4 > 8, "строфы короче, чем ждёт музыка"
GI = Grid(grid(I0, B1, 3))
G1 = Grid(grid(B1, B2, 12))
G2 = Grid(grid(B2, B3, 12))
G3 = Grid(np.concatenate([grid(B3, M3, 4, [1, 1.03, 1.07, 1.13]), grid(M3, B4, 4, [1.12, 1.06, 1.0, 0.94])[1:]]))
G4 = Grid(grid(B4, FIN, 12, np.linspace(1.22, 0.92, 12)))
for k_, v_ in (("intro", I0), ("stanza1", B1), ("stanza2", B2), ("stanza3", B3), ("stanza3_phrase2", M3),
               ("stanza4", B4), ("final_chord", FIN)):
    mark(k_, v_)

# вступление: буквы влетают — челеста взлетает; заголовок собрался — вальс и мотив флейты; буквы сдувает — вниз
T_BLOW = V0 - 0.75
sweep = (74, 76, 78, 81, 83, 86, 88, 90, 93)
for i, m in enumerate(sweep):
    u = i / (len(sweep) - 1)
    p_cel(0.18 + 0.8 * u ** 0.9 + rng.uniform(-0.012, 0.012), m, 0.45 + 0.4 * u, 0.5, pan=-0.6 + 0.8 * u)
p_str(I0, STR["D"], GI.t(1, 0) - I0, 0.45, att=0.6, rel=0.5)
acc(GI, 1, ["D", "A7"], "intro", 0.85)
play(GI, 1, [("D", [(0, 1, 78, "g"), (1, .5, 77), (1.5, .5, 78), (2, 1, 81)])], "flute", 0.9, legato=0.7)
play(GI, 2, [("A7", [(0, 1, 79, "s")])], "flute", 0.8)
for i, m in enumerate((93, 90, 88, 86, 83, 81, 78, 76)):
    p_cel(T_BLOW + FRAME + 0.065 * i, m, 0.8 - 0.05 * i, 0.4, pan=0.3 - 0.13 * i)
mark("intro_flute_motif", GI.t(1, 0))
mark("intro_blow_run", T_BLOW + FRAME)

# строфа 1
acc(G1, 0, chords(S1) + chords(S1F), "pizz", 0.9)
play(G1, 0, S1, "pizz", 0.95)
for b_, notes in S1_LAUGH.items():
    play(G1, b_, [("", notes)], "flute", 0.7)
play(G1, 8, S1F, "flute", 0.75, legato=0.92)
mark("stanza1_yawn", G1.t(10, 0))
mark("stanza1_run", G1.t(11, 1))

# строфа 2
acc(G2, 0, chords(S2), "bright", 0.85)
play(G2, 0, S2, "cel", 1.0)
for i, m in enumerate(S2_FL):
    p_fl(G2.t(i, 0), m, G2.blen(i) * 0.9, 0.32, att=0.12)

# строфа 3
acc(G3, 0, chords(S3), "soft", 0.8, vel_fn=lambda i: [0.9, 0.85, 0.8, 0.75, 0.8, 0.85, 0.95, 1.1][i])
play(G3, 0, S3, "flute", 0.85, legato=0.97)
for b_, notes in S3_CEL.items():
    play(G3, b_, [("", notes)], "cel", 0.55, pan=0.45)
for i, (ch, _) in enumerate(S3):
    if i < 7:
        p_str(G3.t(i, 0), STR[ch], G3.blen(i) + 0.1, [0.4, 0.38, 0.38, 0.36, 0.38, 0.4, 0.48][i], att=0.35, rel=0.6)
    else:  # «И нам улететь!» — тремоло, нарастание
        p_str(G3.t(i, 0), STR[ch], G3.blen(i) + 0.05, 0.6, att=0.12, rel=0.25, trem=0.8, rate=12, cresc=(0.8, 1.6))
mark("stanza3_resolve", G3.t(7, 0))

# строфа 4: тремоло с «порывами» по два такта, вихрь челесты с такта 5
acc(G4, 0, chords(S4), "trem", 0.9, vel_fn=lambda i: 0.85 + 0.25 * i / 11)
play(G4, 0, S4, "flute", 0.95, legato=0.95, vel_fn=lambda i: 0.85 + 0.2 * i / 11)
for i, (ch, _) in enumerate(S4):
    v = 0.5 + 0.45 * i / 11
    cr = (0.75, 1.15) if i % 2 == 0 else (1.15, 0.9)
    if i == 11:
        cr = (0.9, 1.5)
    p_str(G4.t(i, 0), STR[ch], G4.blen(i) + 0.03, v, att=0.06, rel=0.2, trem=0.85, rate=12 + 4 * i / 11, cresc=cr)
    if i >= 4:
        for j, m in enumerate(ARP[ch]):
            p_cel(G4.t(i, j / 2), m, 0.45 + 0.03 * (i - 4) + (0.08 if j == 3 else 0), 0.2, pan=0.6 * np.sin(j * 1.05 + i))
mark("stanza4_swirl", G4.t(4, 0))

# финал: светлый ре-мажорный аккорд и «кнопка»
p_str(FIN, (38, 50, 57, 62, 66, 69, 74), TOTAL - FIN - 0.6, 0.85, att=0.08, rel=1.0, cresc=(1.0, 0.4), width=1.0)
p_pizz(FIN, 38, 1.0, "cb")
p_pizz(FIN + 0.004, 50, 0.6, "vc", pan=-0.2)
for j, m in enumerate((57, 62, 66, 69)):
    p_pizz(FIN + 0.01 + 0.008 * j, m, 0.55, "va", pan=-0.3 + 0.2 * j)
for j, m in enumerate((74, 78, 81, 86, 90, 93, 98)):
    p_cel(FIN + 0.075 * j, m, 0.9 - 0.04 * j, 1.2, pan=-0.5 + 0.17 * j)
p_fl(FIN, 86, min(2.6, TOTAL - FIN - 1.0), 0.65, att=0.08, rel=0.4)
T_BUTTON = min(FIN + 2.3, TOTAL - 1.6)
p_cel(T_BUTTON, 86, 0.5, 1.0)
p_cel(T_BUTTON + 0.004, 93, 0.35, 1.0)
p_pizz(T_BUTTON, 50, 0.5, "vc", pan=-0.1)
mark("final_button", T_BUTTON)


# ---------- ревербератор и сведение шин ----------
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


BUS["str"] = eq(BUS["str"], biquad("lp", 5500, 0.6), biquad("hp", 55, 0.7), biquad("peak", 450, 0.8, 2.0))
BUS["fl"] = eq(BUS["fl"], biquad("hp", 200, 0.7))
IR_M = [make_ir(1.6, 2.2, 11), make_ir(1.6, 2.2, 12)]
WET = 0.32
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0] + BUS[k][1]) for k in BUSES)
music = sum(BUS[k] * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
music = eq(music, biquad("hp", 40, 0.7))

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

# провал около 2,5 кГц под голосом — речи просторнее
dip = eq(music, biquad("peak", 2500, 0.8, DIP_DB))
music = music + ACT * (dip - music)

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
lineG = [np.sqrt(ms(VCH, [w]) * db(LINE_DB[i + 1]) ** 2 / max(ms(MCH, [w]), 1e-20)) for i, w in enumerate(SPEECH)]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(I0 + 0.45, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.3, FIN - 0.05)]
W_FIN = [(FIN, min(FIN + 1.6, TOTAL - FADE_OUT))]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0), (I0 + 0.35, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i < NL:
        gap = L(i + 1) - E(i)
        lift = GAP_DB if i in STANZA_END else (PAUSE_DB if gap >= 0.7 else 0)
        if lift and gap > 0.45:
            gl = max(g, lineG[i]) * db(lift)
            r = min(0.22, gap / 3)
            shape += [(E(i) + r, gl), (L(i + 1) - r, gl)]
            LIFTS.append((i, E(i) + r, L(i + 1) - r))
shape += [(E(NL) + 0.3, gT), (FIN - 0.05, gT), (FIN + 0.1, gF)]
for u in np.linspace(0, 1, 13):
    shape.append((TOTAL - FADE_OUT * (1 - u), gF * np.cos(u * np.pi / 2) ** 2))
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f} с")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve


# ---------- шумы ----------
def env_pts(n, pts):
    return np.interp(tt(n), [p[0] for p in pts], [p[1] for p in pts])


def pan_curve(x, p0, p1):
    a = (np.clip(np.linspace(p0, p1, len(x)), -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def s_gust(dur, peak, p0, p1, f0=500, f1=1400, whistle=0.35):
    """порыв ветра: шум с плывущей полосой, свист и гул"""
    n = int(dur * SR)
    t = tt(n)
    e = np.where(t < peak, (t / peak) ** 1.6, np.exp(-(t - peak) / (0.28 * (dur - peak))))
    efn = lambda tc: np.interp(tc, t[::64], e[::64])
    rush = tvf(rng.standard_normal(n), logband(lambda tc: f0 + (f1 - f0) * efn(tc), lambda tc: 1.0 + 0.0 * tc))
    wh = tvf(rng.standard_normal(n), logband(lambda tc: 2.2 * (f0 + (f1 - f0) * efn(tc)), lambda tc: 0.07 + 0.0 * tc))
    lo = bandn(n, 60, 350)
    x = e * (rush / np.std(rush) + whistle * wh / np.std(wh) + 0.4 * lo)
    out = pan_curve(x, p0, p1)
    out[1] = 0.85 * out[1] + 0.15 * e * bandn(n, 400, 3000) * 0.5   # немного ширины
    return fade_tail(out, 0.05)


def s_flap(v=1.0):
    """бумажный лист шлёпается и пружинит"""
    n = int(0.22 * SR)
    t = tt(n)
    x = bandn(n, 300, 2500) * np.exp(-t / 0.012) + 0.5 * crinkle(n, 900 * np.exp(-t / 0.03), 2000, 8000)
    x += 0.4 * np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.025)
    return fade_tail(x * (1 - np.exp(-t / 0.0008)) * v)


def s_spring():
    """ёлки выскакивают: бумажный шорох и «пружинка»"""
    n = int(0.6 * SR)
    t = tt(n)
    dens = 1400 * np.exp(-t / 0.05) + 80 * np.exp(-t / 0.3)
    cr = 0.7 * crinkle(n, dens, 1800, 7500)
    f = 240 * (1 + 0.22 * np.exp(-t / 0.13) * np.sin(2 * np.pi * 13 * t))
    boing = 0.45 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17) * (1 - np.exp(-t / 0.004))
    thump = 0.5 * bandn(n, 80, 450) * np.exp(-t / 0.02)
    return fade_tail(cr + boing + thump)


def s_blizzard(dur):
    """метель: свист и шипение, порывами"""
    n = int(dur * SR)
    t = tt(n)
    env = sstep(prog(t, 0, 0.7)) * (1 - sstep(prog(t, dur - 0.8, dur)))
    out = np.zeros((2, n))
    for ch in (0, 1):
        g = np.clip(0.65 + 0.45 * slow(n, 1.2), 0.2, 1.3)
        fc = 1150 * (1 + 0.18 * slow(n, 0.8))
        fcf = lambda tc, fc=fc: np.interp(tc, t[::64], fc[::64])
        wh = tvf(rng.standard_normal(n), logband(fcf, lambda tc: 0.06 + 0.0 * tc))
        wh2 = tvf(rng.standard_normal(n), logband(lambda tc, f=fcf: 1.55 * f(tc), lambda tc: 0.09 + 0.0 * tc))
        hiss = bandn(n, 3000, 9500)
        out[ch] = env * (g * 0.5 * hiss + g ** 2 * wh / np.std(wh) + 0.45 * g * wh2 / np.std(wh2))
    return out


def s_roll(dur):
    """ёж-клубок катится по хвое и снегу"""
    n = int(dur * SR)
    t = tt(n)
    rot = 0.5 + 0.5 * np.cos(2 * np.pi * 5.5 * t)
    x = crinkle(n, 280 * (0.35 + 0.65 * rot), 2200, 8000, 0.003)
    x += 0.6 * crinkle(n, 110 * (0.3 + 0.7 * rot), 500, 2600, 0.006)
    x += 0.35 * bandn(n, 60, 300) * rot ** 3
    env = sstep(prog(t, 0, 0.12)) * (1 - sstep(prog(t, dur - 0.18, dur)))
    return pan_curve(x * env, 0.4, -0.1)


def s_pip():
    """ёж высовывает нос — «пып»"""
    n = int(0.14 * SR)
    t = tt(n)
    f = 700 + 550 * prog(t, 0, 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.15 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return fade_tail(x * np.sin(np.pi * prog(t, 0, 0.075)) ** 1.5)


def s_slap():
    """лист шлёпает по ели — бумажный шлепок"""
    n = int(0.3 * SR)
    t = tt(n)
    x = bandn(n, 150, 1800) * np.exp(-t / 0.012) + 0.6 * np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.03)
    x += 0.4 * crinkle(n, 700 * np.exp(-t / 0.06), 2500, 8000)
    return fade_tail(x * (1 - np.exp(-t / 0.0008)))


def s_needles(dur=0.9):
    """ель трясётся — шорох хвои"""
    n = int(dur * SR)
    t = tt(n)
    shake = np.abs(np.sin(2 * np.pi * 7 * t)) * np.exp(-t / 0.35)
    x = crinkle(n, 900 * shake + 30, 3000, 9000, 0.0025) + 0.3 * bandn(n, 3500, 8000) * shake
    return fade_tail(x * (1 - np.exp(-t / 0.01)))


def s_puff():
    """зевок ели: мягкий выдох-«пуф» и серая пыль"""
    n = int(0.8 * SR)
    t = tt(n)
    e = (1 - np.exp(-t / 0.03)) * np.exp(-t / 0.22)
    x = bandn(n, 120, 1100) * e + 0.25 * bandn(n, 3000, 9000) * (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.4)
    return fade_tail(x)


def s_whistle(dur, f0, f1, flutter=9.0, bw=0.12):
    """лёгкий свист полёта"""
    n = int(dur * SR)
    t = tt(n)
    fcf = lambda tc: f0 * (f1 / f0) ** np.clip(tc / dur, 0, 1) * (1 + 0.15 * np.sin(np.pi * np.clip(tc / dur, 0, 1)))
    x = tvf(rng.standard_normal(n), logband(fcf, lambda tc: bw + 0.0 * tc))
    x = x / np.std(x) * (1 + 0.35 * np.sin(2 * np.pi * flutter * t)) + 0.2 * bandn(n, 2000, 8000)
    env = sstep(prog(t, 0, 0.15)) * (1 - sstep(prog(t, dur * 0.6, dur)))
    return x * env


def s_tuk():
    """лист цепляется за ветку — тихий «тук»"""
    n = int(0.12 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * 640 * t) * np.exp(-t / 0.016) + 0.4 * bandn(n, 1500, 5000) * np.exp(-t / 0.002)
    return fade_tail(x * (1 - np.exp(-t / 0.0006)))


def s_ping(f, tau=0.3):
    n = int(min(1.2, tau * 5) * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau) + 0.25 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.03)
    return fade_tail(x * (1 - np.exp(-t / 0.001)))


SPARK_F = (2349, 2637, 2960, 3520, 3951, 4699)


def s_sparkle():
    """искорки: звонкие точки челесты по листьям слева направо"""
    fs = list(rng.permutation(SPARK_F))
    out = np.zeros((2, int(1.6 * SR)))
    for i, f in enumerate(fs):
        x = stereo(s_ping(f, 0.22) * rng.uniform(0.6, 1.0), -0.35 + 0.15 * i)
        i0 = int((i * 0.07) * SR)
        out[:, i0:i0 + x.shape[1]] += x[:, :out.shape[1] - i0]
    return out


def s_ding():
    """песочные часы — «дзинь»"""
    n = int(1.6 * SR)
    t = tt(n)
    f = 1760.0
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for a, r, d in
            ((1, 1, 0.9), (0.4, 2.32, 0.35), (0.2, 4.25, 0.15), (0.08, 6.8, 0.06)))
    return fade_tail(x * (1 - np.exp(-t / 0.0008)))


def s_tick(hi=True):
    n = int(0.05 * SR)
    t = tt(n)
    f = 2600 if hi else 1900
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * 1100 * t) * np.exp(-t / 0.008)
    return fade_tail(x * (1 - np.exp(-t / 0.0004)))


def s_sunrise(dur=2.2):
    """восход: мягкое нарастание — мерцание и тёплый шелест"""
    n = int(dur * SR)
    t = tt(n)
    e = sstep(prog(t, 0, 1.3)) * (1 - sstep(prog(t, 1.4, dur)))
    sh = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.3)) for a, f in ((1, 1174.7), (0.7, 1760), (0.5, 2349.3), (0.3, 2960)))
    sh *= 1 + 0.3 * np.sin(2 * np.pi * 7 * t)
    air = tvf(rng.standard_normal(n), logband(lambda tc: 500 * 6 ** np.clip(tc / 1.4, 0, 1), lambda tc: 0.9 + 0.0 * tc))
    return stereo(e * (0.25 * sh + air / np.std(air)), 0.45)


def syll(kind, scale=1.0):
    """слог птичьей песенки"""
    d = {"up": 0.05, "down": 0.065, "trill": 0.14, "tsee": 0.08}[kind] * scale
    n = int(d * SR)
    t = tt(n)
    if kind == "up":
        f = 3000 + 1700 * (t / d) ** 0.7
    elif kind == "down":
        f = 5000 - 1900 * (t / d)
    elif kind == "trill":
        f = 3900 + 650 * np.sin(2 * np.pi * 34 * t)
    else:
        f = 6100 - 500 * (t / d)
    f = f * rng.uniform(0.94, 1.06)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.15 * np.sin(2 * ph)) * np.sin(np.pi * t / d) ** 1.2


def s_phrase(maxdur, final=False):
    """фраза птички: 3–5 слогов; последняя — вниз («отпели»)"""
    kinds = ["tsee", "down", "down"] if final else list(rng.choice(["up", "down", "trill", "tsee"], int(rng.integers(3, 6))))
    parts, total = [], 0.0
    for i, k in enumerate(kinds):
        s = syll(k, 1.0 + (0.25 * i if final else 0))
        if final:
            s = s * (1 - 0.18 * i)
        gap = np.zeros(int(rng.uniform(0.03, 0.06) * SR))
        if total + (len(s) + len(gap)) / SR > maxdur and parts:
            break
        parts += [s, gap]
        total += (len(s) + len(gap)) / SR
    return fade_tail(np.concatenate(parts), 0.005)


def s_wings(n_flaps=8):
    """птичка улетает — хлопанье крыльев, тише и правее"""
    out, tcur = [], 0.0
    span = int(1.2 * SR)
    x = np.zeros((2, span))
    for i in range(n_flaps):
        m = int(0.035 * SR)
        u = tt(m)
        fl = (bandn(m, 900, 3500) + 0.6 * bandn(m, 250, 900)) * np.sin(np.pi * u / 0.035) ** 2 * (1 - 0.09 * i)
        st = stereo(fl, 0.2 + 0.08 * i)
        i0 = int(tcur * SR)
        x[:, i0:i0 + m] += st[:, :max(0, min(m, span - i0))]
        tcur += 0.07 + 0.006 * i
    return x


def s_plink(f):
    """солнечный зайчик ударил лист — «плинк»"""
    n = int(0.4 * SR)
    t = tt(n)
    fr = f * (1 + 0.02 * np.exp(-t / 0.01))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = (np.sin(ph) + 0.25 * np.sin(3 * ph) * np.exp(-t / 0.02)) * np.exp(-t / 0.12)
    return fade_tail(x * (1 - np.exp(-t / 0.0007)))


def s_fall(dur):
    """капля сорвалась и падает — тихое «тиу» вниз"""
    n = int(dur * SR)
    t = tt(n)
    f = 2000 * (1100 / 2000) ** (t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * sstep(prog(t, 0, 0.08)) * (1 - sstep(prog(t, dur * 0.7, dur)))
    return x


def s_plop():
    """капля росы — «бульк»"""
    n = int(0.35 * SR)
    t = tt(n)
    f = 620 + 1000 * (1 - np.exp(-t / 0.018))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045) * (1 - np.exp(-t / 0.002))
    x += 0.25 * bandn(n, 2000, 8000) * np.exp(-t / 0.03) + 0.3 * np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.04)
    return fade_tail(x)


def s_zephyrs(t_starts, t_ends):
    """три облачка-ветерка дуют и улетают: мягкий свист уходит вправо"""
    t0 = min(t_starts)
    dur = max(t_ends) - t0 + 0.3
    n = int(dur * SR)
    out = np.zeros((2, n))
    for i, (a_, b_) in enumerate(zip(t_starts, t_ends)):
        m = int((b_ - a_ + 0.3) * SR)
        t = tt(m)
        d = b_ - a_
        u = np.clip(t / d, 0, 1)
        fcf = lambda tc, d=d, i=i: (1000 + 220 * i) * (1 - 0.12 * np.clip(tc / d, 0, 1) ** 2) * (1 + 0.02 * np.sin(2 * np.pi * 4.5 * tc))
        wh = tvf(rng.standard_normal(m), logband(fcf, lambda tc: 0.1 + 0.0 * tc))
        e = sstep(prog(t, 0, 0.35)) * (1 - sstep(prog(t, d * 0.55, d + 0.25)))
        x = e * (wh / np.std(wh) + 0.35 * bandn(m, 600, 4000))
        a = (np.clip(0.1 + 0.7 * u ** 2, -1, 1) + 1) * np.pi / 4
        i0 = int((a_ - t0) * SR)
        out[0, i0:i0 + m] += x * np.cos(a)
        out[1, i0:i0 + m] += x * np.sin(a)
    return out


def s_wind(t0, t1, ts0, ts1, t_quiet0):
    """большой ветер: порыв, вой до fin, сильнее на «ветры»…«хотим», после голоса раздувается к fin"""
    dur = t1 - t0 + 0.7
    n = int(dur * SR)
    t = tt(n)
    gust = np.where(t < 0.05, (t / 0.05) ** 1.5, np.exp(-(t - 0.05) / 0.22))   # порыв гаснет до первой строки
    strong = sstep(prog(t, ts0 - t0 - 0.2, ts0 - t0 + 0.4)) * (1 - sstep(prog(t, ts1 - t0 - 0.2, ts1 - t0 + 0.5)))
    tail = sstep(prog(t, t_quiet0 - t0, t1 - t0 - 0.2))
    out = np.zeros((2, n))
    for ch in (0, 1):
        g = np.clip(0.75 + 0.3 * slow(n, 0.7), 0.35, 1.25)
        inten = np.maximum(gust, (0.3 + 0.25 * strong + 0.6 * tail) * g)
        inten *= sstep(prog(t, 0, 0.06)) * (1 - sstep(prog(t, t1 - t0, dur)))
        ifn = lambda tc, inten=inten: np.interp(tc, t[::64], inten[::64])
        howl1 = tvf(rng.standard_normal(n), logband(lambda tc: 340 * (1 + 0.8 * ifn(tc)), lambda tc: 0.13 + 0.0 * tc))
        howl2 = tvf(rng.standard_normal(n), logband(lambda tc: 690 * (1 + 0.6 * ifn(tc)), lambda tc: 0.1 + 0.0 * tc))
        rush = tvf(rng.standard_normal(n), logband(lambda tc: 700 * (1 + ifn(tc)), lambda tc: 1.2 + 0.0 * tc))
        lo = bandn(n, 40, 260)
        out[ch] = inten * (rush / np.std(rush) + 0.7 * howl1 / np.std(howl1) + 0.45 * howl2 / np.std(howl2) + 0.5 * lo)
    return out


def s_snap(f):
    """черешок лопается — щелчок с хрустом бумаги"""
    n = int(0.16 * SR)
    t = tt(n)
    x = bandn(n, 2500, 9500) * np.exp(-t / 0.0025) + 0.45 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012)
    x += 0.3 * crinkle(n, 1500 * np.exp(-t / 0.03), 1800, 7000)
    return fade_tail(x * (1 - np.exp(-t / 0.0004)))


def s_whoosh(t_pass=0.65, dur=1.3):
    """лист пролетает у камеры справа налево — «вжух» с эффектом Доплера"""
    n = int(dur * SR)
    t = tt(n)
    e = np.where(t < t_pass, np.exp(-(t_pass - t) / 0.11), np.exp(-(t - t_pass) / 0.16))
    fcf = lambda tc: 1350 * 1.7 ** (-np.tanh((tc - t_pass) / 0.08))
    x = tvf(rng.standard_normal(n), logband(fcf, lambda tc: 0.8 + 0.0 * tc))
    x = e * (x / np.std(x) + 0.35 * bandn(n, 120, 500))
    p = np.clip(1 - 2 * (t / dur), -0.85, 0.85)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def s_pop(f):
    """лист становится буквой — мягкий «поп»"""
    n = int(0.25 * SR)
    t = tt(n)
    fr = f * (0.45 + 0.55 * np.exp(-t / 0.02)) + 160
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.002))
    x += 0.2 * bandn(n, 1500, 6000) * np.exp(-t / 0.008)
    return fade_tail(x)


def s_sub():
    """выезжает полоска с подписью: шорох бумаги и мягкий «пум»"""
    n = int(0.5 * SR)
    t = tt(n)
    sw = bandn(n, 800, 5000) * np.exp(-0.5 * ((t - 0.06) / 0.05) ** 2)
    pum = np.sin(2 * np.pi * np.cumsum(170 * (1 + 0.7 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.003))
    return fade_tail(0.6 * sw + pum)


SFX = np.zeros((2, N))
SFX_SEND = np.zeros(N)
SFX_LOG = []
KW = 0.1  # окно для уровня шума, с


def k_loud(x):
    """самое громкое окно 100 мс (сумма каналов, K-взвешенно) и его кривая"""
    kx = np.stack([kweight(c) for c in x])
    p = (kx ** 2).sum(0)
    w = int(KW * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    mov = (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])
    return mov


def place(name, what, t_ev, start, x, peaks=None, parts=None, t_end=None, send=0.06):
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    if name in SFX_DUCK:     # под строками тише
        a = np.zeros(n_)
        j0, j1 = max(0, -i0), min(n_, N - i0)
        a[j0:j1] = ACT[i0 + j0:i0 + j1]
        x *= 1 - (1 - db(-SFX_DUCK[name])) * a
    mov = k_loud(x)
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(float(mov.max()), 1e-20))
    x *= g
    mov = mov * g * g
    j0, j1 = max(0, -i0), min(n_, N - i0)
    SFX[:, i0 + j0:i0 + j1] += x[:, j0:j1]
    SFX_SEND[i0 + j0:i0 + j1] += 0.5 * (x[0, j0:j1] + x[1, j0:j1]) * send
    env = np.abs(x).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    a_, b_ = start + act[0] / SR, start + act[-1] / SR
    # самое громкое окно, которое приходится на строку (центр окна внутри строки)
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
    if name in SFX_DUCK:
        rec["bed"] = True
    rec["db_lines"] = round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None
    rec["t_loudest"] = r3(cen[int(np.argmax(mov))])
    if inl.any():
        rec["t_loudest_line"] = r3(cen[inl][int(np.argmax(mov[inl]))])
    SFX_LOG.append(rec)


def audible(x, st):
    env = np.abs(stereo(x)).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    return st + act[0] / SR, st + act[-1] / SR


def hit(name, what, times, maker, pans=0.0, vels=None, send=0.06, peak_win=0.3):
    """удары: пик каждого — на кадр позже события"""
    xs, peaks = [], []
    for i, te in enumerate(times):
        x = stereo(maker(i), pans(i) if callable(pans) else pans) * (vels[i] if vels else 1.0)
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


def long(name, what, t0, t1, x, send=0.06, peaks=None):
    """долгий звук начинается на кадр позже события"""
    place(name, what, t0, t0 + FRAME, x, t_end=t1, peaks=peaks, send=send)


# заставка
T_IN0, T_IN1 = 0.15, 1.0
long("intro_gust", "порыв ветра заносит буквы-листья слева", T_IN0, T_IN1, s_gust(1.7, 0.5, -0.8, 0.05))
hit("intro_letters", "буквы-листья ложатся на место (6 шт.)", [0.15 + i * 0.1 + 0.75 for i in range(6)],
    lambda i: s_flap(rng.uniform(0.7, 1.0)), lambda i: -0.4 + 0.16 * i)
long("intro_blow", "ветер сдувает буквы влево, к бору", T_BLOW, T_BLOW + 0.75,
     s_gust(max(0.6, L(1) - T_BLOW - FRAME + 0.05), 0.22, 0.1, -0.9, 600, 1700), peaks=[T_BLOW + FRAME + 0.22])
# строфа 1
hit("trees_pop", "ёлки и сосны выскакивают из снега — шорох-«пружинка»", [W("w_torch") - 0.05], lambda i: s_spring(), -0.2)
T_BZ0, T_BZ1 = W("w_snega") - 0.3, E(4) + 0.4
long("blizzard", "метель: свист и шипение", T_BZ0, T_BZ1, s_blizzard(T_BZ1 - T_BZ0 - FRAME))
T_HOG0, T_HOG1 = W("w_igly") - 0.55, W("w_ezha") - 0.05
long("hog_roll", "ёж-клубок катится по хвое", T_HOG0, T_HOG1, s_roll(T_HOG1 - T_HOG0))
hit("hog_pip", "ёж разворачивается из клубка — «пып»", [W("w_ezha") + 0.2], lambda i: s_pip(), -0.1)
hit("smear_slap", "лист трётся о бок ели, ель желтеет — два бумажных шлепка", [W("w_zhelt") - 0.3, W("w_zhelt") - 0.02], lambda i: s_slap(), -0.15)
hit("fir_shake", "ель стряхивает желтизну — шорох хвои", [max(W("w_zhelt") + 0.45, E(7) - 0.1)], lambda i: s_needles(), -0.2)
hit("fir_yawn", "ель зевает — выдох-«пуф» и пыль", [W("w_svezha") - 0.05], lambda i: s_puff(), -0.2)
T_JK0 = E(8) - 0.05
T_JK1 = max(W("w_my") - 0.08, E(8) + 0.95)
long("leaf_flight", "лист-шутник летит к клёну — лёгкий свист", T_JK0, T_JK1,
     pan_curve(s_whistle(T_JK1 - T_JK0, 1500, 2400), -0.15, 0.35))
hit("leaf_cling", "лист цепляется за ветку — «тук»", [T_JK1], lambda i: s_tuk(), 0.3)
# строфа 2
hit("sparkle_blest", "блёстки по листьям («блестим»)", [W("w_blest") - 0.1], lambda i: s_sparkle(), send=0.25)
hit("hourglass_ding", "появляются песочные часы — «дзинь»", [W("w_vremya") - 0.2], lambda i: s_ding(), 0.15, send=0.2)
tk = list(np.arange(W("w_vremya") - 0.2 + 0.55, L(13) - 0.1, 0.5))
if tk:
    hit("hourglass_tick", f"часы тихо тикают до строки 13 ({len(tk)} шт.)", tk, lambda i: s_tick(i % 2 == 0), 0.15)
hit("sunrise", "встаёт бумажное солнце — мягкое нарастание", [W("w_leto") - 0.2], lambda i: s_sunrise(), peak_win=0.03)
hit("sparkle_krase", "блёстки по листьям («в красе»)", [W("w_krase") - 0.1], lambda i: s_sparkle(), send=0.25)
# птичка поёт редкими фразами: в паузах между строками; в паузе между строфами — громче
B0_, B1_ = W("w_leto") + 0.3, W("w_otpeli") + 0.1
phr_lines, phr_gap = [(B0_ + 0.12, 0.38)], []
for i in range(1, NL):
    a_, b_ = E(i), L(i + 1)
    if a_ > B0_ + 0.4 and b_ < B1_ and b_ - a_ >= 0.2:
        if b_ - a_ >= 0.8:
            phr_gap += [(a_ + 0.08, 0.4), (a_ + 0.55, min(0.4, b_ - a_ - 0.6))]
        else:
            phr_lines.append((a_ + 0.03, 0.38))
fin_phr = s_phrase(0.6, final=True)
phr_lines.append((B1_ - len(fin_phr) / SR, None))
mk_ph = lambda lst: (lambda i: fin_phr if lst[i][1] is None else s_phrase(lst[i][1]))
hit("bird_song", f"птичка поёт ({len(phr_lines)} фраз; последняя вниз — «отпели»)", [p for p, _ in phr_lines],
    mk_ph(phr_lines), lambda i: 0.45 + 0.05 * (i % 2), send=0.15, peak_win=0.02)
if phr_gap:
    hit("bird_song_gap", f"птичка поёт в паузе между строфами ({len(phr_gap)} фразы)", [p for p, _ in phr_gap],
        mk_ph(phr_gap), 0.45, send=0.15, peak_win=0.02)
hit("bird_arrive", "птичка прилетает справа — хлопанье крыльев", [W("w_leto") - 0.65], lambda i: s_wings(), 0.4, peak_win=0.05)
T_BIRDGO = max(W("w_otpeli") + 0.35, E(17) - 0.3)
hit("bird_flaps", "птичка улетает — хлопанье крыльев", [T_BIRDGO], lambda i: s_wings(), peak_win=0.05)
tl = [W("w_luch") - 0.1 + i * ((E(15) - W("w_luch") + 0.2) / 6) for i in range(6)]
hit("sun_plinks", "солнечный зайчик бьёт листья (6 «плинков»)", tl, lambda i: s_plink((1174.7, 1318.5, 1480, 1760, 1975.5, 2349.3)[i]),
    lambda i: -0.35 + 0.15 * i, send=0.15)
T_DROP, T_SPLASH = W("w_rose") - 0.55, W("w_rose") - 0.05
long("dew_fall", "капля росы срывается и падает", T_DROP, T_SPLASH, s_fall(T_SPLASH - T_DROP))
hit("dew_plop", "капля падает на лист — «бульк»", [T_SPLASH], lambda i: s_plop(), 0.1, send=0.12)
# строфа 3
zs = [W("w_zef") - 0.1 + i * 0.15 for i in range(3)]
ze = [W("w_ushli") + 1.4 + i * 0.15 for i in range(3)]
long("zephyrs", "облачка-зефиры дуют и улетают вправо — тихий свист", W("w_zef"), W("w_ushli") + 1.4,
     s_zephyrs([max(z, W("w_zef") + FRAME) for z in zs], ze))
# строфа 4
T_WIND = L(25) - 0.2
long("wind", "большой ветер: порыв, вой до fin, сильнее на «ветры»…«хотим», после голоса раздувается",
     T_WIND, FIN, s_wind(T_WIND + FRAME, FIN, W("w_vetry"), E(30), E(NL)), peaks=[T_WIND + FRAME + 0.05], send=0.03)
tt_ = [W("w_sorv1") - 0.05, W("w_sorv1") + 0.22, W("w_vetv") - 0.15, W("w_vetv") + 0.05, W("w_vetv") + 0.22, W("w_vetv") + 0.4]
hit("leaf_tear", "листья отрываются — щелчки черешков (6 шт.)", tt_, lambda i: s_snap(rng.uniform(1700, 2600)),
    lambda i: -0.35 + 0.14 * i, vels=[rng.uniform(0.75, 1.0) for _ in tt_])
tw = [L(30) - 0.2 + i * 0.32 for i in range(5)]
place_w = []
outw = np.zeros((2, int((tw[-1] - tw[0] + 1.4) * SR)))
for i, te in enumerate(tw):
    x = s_whoosh() * rng.uniform(0.8, 1.0)
    i0 = int(round((te - tw[0]) * SR))
    outw[:, i0:i0 + x.shape[1]] += x
    place_w.append(audible(x, te + FRAME))
place("camera_leaves", "листья пролетают у камеры справа налево — 5 «вжух» (старт пролёта; пик — у центра кадра, +0,65 с)",
      tw[0], tw[0] + FRAME, outw, peaks=[te + 0.65 + FRAME for te in tw], parts=place_w)
# финал
tp = [FIN + 0.65 + i * 0.09 for i in range(6)]
hit("fin_pops", "листья превращаются в буквы — 6 мягких «поп»", tp, lambda i: s_pop(560 * 2 ** (i * 2 / 12)),
    lambda i: -0.4 + 0.16 * i, send=0.12)
hit("fin_sub", "выезжает полоска с подписью", [FIN + 1.05], lambda i: s_sub(), 0.0, send=0.1)
SFX_LOG.sort(key=lambda r: r["start"])

IR_S = [make_ir(0.7, 1.0, 21, 7000, 0.01), make_ir(0.7, 1.0, 22, 7000, 0.01)]
sfx_all = SFX + np.stack([convolve(SFX_SEND, IR_S[0]), convolve(SFX_SEND, IR_S[1])]) * 0.6


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
per_line = {str(i): f1(dB(ms(SH, [(L(i), E(i))])) - dB(ms(VCH, [(L(i), E(i))]))) for i in range(1, NL + 1)}
levels = {
    "note": "музыка без шумов (из make_music.py): RMS, дБ к голосу; lines — к голосу той же строки, остальное — к "
            "среднему голосу в местах речи",
    "lines": per_line,
    "under_voice": rel(SH, SPEECH),
    "intro": rel(SH, W_INTRO),
    "gaps": {f"{i}|{i + 1}": rel(SH, [(a_, b_)]) for i, a_, b_ in LIFTS},
    "tail": rel(SH, W_TAIL),
    "final": rel(SH, W_FIN),
}
with open(os.path.join(os.path.dirname(os.path.abspath(args.out)), "sfx.json"), "w", encoding="utf-8") as f:  # рядом с WAV
    json.dump({
        "note": "секунды ролика. t — событие в кадре (t_end — конец долгого действия); peak/peaks — пик звука (на кадр "
                "позже события); start/end — где звук слышен, parts — где слышен каждый удар серии; db — громкость шума "
                "к среднему голосу (самое громкое окно 100 мс, K-взвешенно, BS.1770), db_lines — то же, но самое громкое "
                "окно на строке (null — на строки не попадает). music — ключевые моменты музыки, levels — уровни музыки.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN,
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

bpm = lambda G, b: 180 / G.blen(b)
print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп ♩: вступление {bpm(GI, 0):.0f}, строфа 1 {bpm(G1, 0):.0f}, строфа 2 {bpm(G2, 0):.0f}, строфа 3 "
      f"{bpm(G3, 0):.0f}→{bpm(G3, 3):.0f} | {bpm(G3, 4):.0f}→{bpm(G3, 7):.0f}, строфа 4 {bpm(G4, 0):.0f}→{bpm(G4, 11):.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом (без шумов): RMS {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка без шумов, дБ к голосу строки):", " ".join(f"{k}:{v}" for k, v in per_line.items()))
print(f"заставка {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступление": [(I0, B1)], "строфа 1, такты 1–8": [(B1, G1.t(8, 0))], "строфа 1, такты 9–12": [(G1.t(8, 0), B2)],
       "строфа 2": [(B2, B3)], "строфа 3": [(B3, B4)], "строфа 4": [(B4, FIN)], "финал": W_FIN}
KB = {k: kweight(BUS[k]) for k in BUSES}
print("баланс шин (сухо, с BUS_G, K-взвешенно, дБ до формы громкости):")
for nm, wins in SEC.items():
    print(f"  {nm}: " + ", ".join(f"{k} {f1(dB(ms([KB[k][0], KB[k][1]], wins)) + 20 * np.log10(BUS_G[k]))}" for k in BUSES))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS, ограничитель {lim:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы (db — цель, db_lines — самое громкое окно на строке):")
for r in SFX_LOG:
    pk = r.get("peak", (r.get("peaks") or [r["start"]])[0])
    print(f"  {r['name']:15s} {r['start']:7.3f}…{r['end']:7.3f}  пик {pk:7.3f}  db {r['db']:4d} (в {r['t_loudest']:.2f})  "
          f"на строках {r['db_lines']}" + (f" (в {r['t_loudest_line']:.2f})" if r["db_lines"] is not None else ""))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
