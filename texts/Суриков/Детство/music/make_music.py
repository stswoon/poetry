#!/usr/bin/env python3
"""Музыка и шумы к стиху И. З. Сурикова «Детство», стиль «Экшн-камера на санках» (гуашь): мальчишка снимает свой
зимний день — катится с горы, кувырком летит в сугроб, ребята хохочут; закат, вьюга, бредёт домой; тёплый вечер в
избе у печи, бабушка, дед с лаптями, матушка за прялкой, огонёк лучины.

Своя музыка, мелодия и гармония свои (ни на какую известную плясовую не опираются).
Инструменты — синтез (numpy):
  балалайка (Karplus-Strong, яркий щипок у подставки, резонанс корпуса; длинные ноты — тремоло) — напев (шина bal),
    «кувырок», «хохот» и «закатный» перебор (шина run), тремоло аккордов и одинокий напев строф 5–6 (шина trm);
  балалайка-секунда — аккорды на слабую долю (шина sec); балалайка-контрабас — бас «ум-па» (шина bass);
  ложки (деревянный двойной щелчок) и мягкая бочка — шина drm; бубенцы саней — шина jng;
  гармонь (язычковый тембр: волновая таблица узкого импульса, два язычка с биением, мех) — аккорды и басы (шина acc),
    подголоски в паузах (шина acm); «прялка» — тихий приглушённый щипок восьмыми по аккорду (шина osc);
  ветер — шум через подвижную полосу (уличный — шина wnd, за стенами избы глухой — шина wni).
План (секунды ролика берутся из events.json; при другом вступлении всё сдвигается):
  0 … L1      вступление (до 4 тактов 2/4 в темпе строфы 1): удар-тремоло ля мажора, бубенцы, разбег напева;
  строфы 1–4  плясовая ля мажор ♩≈132: «ум-па» контрабаса, секунда на слабую долю, ложки, бочка, бубенцы, напев
              балалайки (темы А и Б по 8 тактов, такты 7–8 приходятся на паузы между строфами). Сетка — ровная
              в каждой строфе, её сильные доли стоят за 0,08…0,40 с до начала строф (подбирается под ♩132);
              строфа 1 — бубенцы на каждую долю, с «качусь» — восьмыми (санки поехали);
              строфа 2 — на «хлоп!» музыка обрывается (тишина и «хлоп»), с «Кубарем» — кувыркающийся пробег балалайки
              вниз с качанием по панораме, после «бух» в сугроб — снова пляска;
              строфа 3 — на «хохочут» балалайка «хохочет» (быстрые повторы вверху), смех ребят голосом не делаем;
              строфа 4 — на «горе» ре минор и вздох напева, на «смех» — снова ля мажор и «хохот» до конца строфы;
  строфа 5    «Но меж тем…» — фа-диез минор, пляска за 4 доли замедляется и стихает (ritardando ♩132 → ≈70),
              остаётся тремоло аккордов балалайки и ветер; на «село» — перебор вниз (солнце садится), с «вьюга»
              ветер сильнее (C#7), на «темно» — низкий бас;
  строфа 6    ♩≈70, одинокий напев-тремоло балалайки, басы, ветер в полную силу; F#m Bm G A7 — к дому;
  строфы 7–10 ре мажор, ♩≈67: дверь захлопнулась — уличный ветер обрывается, тёплые тягучие аккорды гармони
              (басы и правая рука, плавное ведение голосов), тихий остинато «прялки» восьмыми; подголоски гармони
              в паузах; за стенами — глухой ветер;
  финал       E40 … fin — A7 гармони и затакт балалайки; с fin — тема в ре мажоре тремоло (память о горке),
              каденция A7 → D, последний аккорд балалайки с бубенцом, затухание к концу.
Громкость: под голосом музыка вместе с шумами на 18–20 дБ тише голоса (по каждой строке — по настоящему голосу),
громче во вступлении, в паузах между строфами и в финале; под голосом у музыки провал −3 дБ около 2,5 кГц, а напевные
шины (bal, run, trm, acm) ещё на 2,5 дБ тише. Строка 6 нарочно тише цели: на «хлоп!» музыка обрывается до «Кубарем»
(в уровне строки эта тишина не учитывается). Отладка уровней строк: MUSIC_DEBUG=1 python3 make_music.py.
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список и уровни — sfx.json):
шорох полозьев с L1 до «хлоп» (нарастает, кочки, скрип), занос санок на «свернулись», мягкий «хлоп» в снег, «бух» в
сугроб, редкий хруст шагов (строфа 6), скрип и стук двери перед L25, вой ветра на «воет», жужжание веретена
(«матушка» … E36), потрескивание лучины с L37 (на «огонёк» — вспышка).

Запуск: python3 make_music.py [--intro 4.0] [--outro 7.0] [--no-voice] [--voice ../voice.mp3] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json; при другом вступлении или финале все события сдвигаются)
Читает events.json, ../voice.mp3 (через ffmpeg — уровни строк) и ../timings.json (сверка). Пишет music.wav
(44,1 кГц, 16 бит, стерео, длина = total) и рядом sfx.json (шумы, уровни, ключевые моменты). Нужны python3 + numpy,
ffmpeg.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import wave
import zlib

import numpy as np

T_START = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
FRAME = 1 / 30
NL_EXPECT = 40

# ---------- уровни ----------
ST_DB = {1: -18.9, 2: -18.9, 3: -18.9, 4: -18.9, 5: -19.3, 6: -19.2, 7: -19.4, 8: -19.4, 9: -19.3, 10: -19.4}
MUS_LIM = (-20.6, -18.3)   # музыка одна на строке не выходит из этих пределов (дБ к голосу строки)
INTRO_DB = -8.5            # вступление, к среднему голосу
GAP_DB = {4: -11.0, 8: -11.5, 12: -11.0, 16: -10.0, 20: -12.0, 24: -14.0, 28: -12.0, 32: -12.5, 36: -12.0}
GAP_CAP = 9.0              # пауза не громче соседних строк больше чем на 9 дБ
TAIL_DB = -10.0            # после голоса до fin, к среднему голосу
FIN_DB = -7.5              # финал
FADE_IN = 0.1
FADE_OUT = 2.2
DIP_DB = -3.0              # провал музыки около 2,5 кГц под голосом
MEL_DUCK_DB = -2.5         # напевные шины под голосом ещё тише
VREF_DB = -22.0            # оценка голоса без voice.mp3: RMS моно в строках, dBFS
K_OFS = 0.5
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {"runners": -24, "skid": -20, "hlop": -15, "buh": -13, "step": -21, "door": -13, "howl": -22,
          "spindle": -27, "crackle": -22}

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
for i_, a_ in enumerate(sys.argv[:-1]):
    if a_ == "--events":
        EV_PATH = sys.argv[i_ + 1]
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти сборку ролика (../video)")
with open(EV_PATH, "rb") as f:
    EV_BYTES = f.read()
RAW = json.loads(EV_BYTES.decode("utf-8"))
EV_CRC = f"{zlib.crc32(EV_BYTES):08x}"
ap = argparse.ArgumentParser(description="музыка и шумы к «Детству» Сурикова")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW['OUTRO']})")
ap.add_argument("--no-voice", action="store_true", help="не читать ../voice.mp3: уровни по оценке голоса")
ap.add_argument("--voice", default=os.path.join(POEM, "voice.mp3"), help="голос (по умолчанию ../voice.mp3)")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV (sfx.json — рядом)")
ap.add_argument("--events", default=EV_PATH, help="файл событий (по умолчанию events.json рядом)")
args = ap.parse_args()
V0 = float(args.intro if args.intro is not None else RAW["V0"])
OUTRO = float(args.outro if args.outro is not None else RAW["OUTRO"])
if V0 < 1.5:
    sys.exit("вступление короче 1,5 с: разбегу не хватит места")

r3 = lambda x: round(float(x), 3)
SHIFT = V0 - float(RAW["V0"])
TOTAL = r3(float(RAW["total"]) + SHIFT + OUTRO - float(RAW["OUTRO"]))
N = int(round(TOTAL * SR))
EV = {k: r3(float(v) + SHIFT) for k, v in RAW.items()
      if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total")}
NL = len([k for k in EV if k[0] == "L" and k[1:].isdigit()])
if NL != NL_EXPECT:
    sys.exit(f"ожидалось {NL_EXPECT} строк, в events.json {NL}")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
for i in range(1, NL + 1):
    if not (L(i) < E(i) and (i == NL or E(i) <= L(i + 1) + 0.05)):
        sys.exit(f"events.json: строка {i} — начало/конец не по порядку")
WARN = []


def W(key, fallback):
    """время слова-события; если ключа нет — запасное время и предупреждение"""
    if key in EV:
        return EV[key]
    WARN.append(f"нет события {key} в events.json — беру {fallback:.2f} с")
    return r3(fallback)


FIN = W("fin", E(NL) + 1.4)
if FIN > TOTAL - 3.0:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


# ---------- голос ----------
VOICE_P = args.voice
HAS_VOICE = os.path.exists(VOICE_P) and not args.no_voice
vfull = None
if HAS_VOICE:
    rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", VOICE_P, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                          capture_output=True, check=True).stdout
    voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
    VD = len(voice) / SR
    if abs(V0 + VD + OUTRO - TOTAL) > 0.08:
        WARN.append(f"V0 + голос + OUTRO = {V0 + VD + OUTRO:.3f} с, а total {TOTAL} — events.json собран не по этому "
                    "голосу?")
    TJP = os.path.join(POEM, "timings.json")
    if os.path.exists(TJP):
        with open(TJP, encoding="utf-8") as f:
            TJ = json.load(f)
        bad = [i for i in range(1, NL + 1)
               if abs(TJ["lines"][i - 1]["start"] + V0 - L(i)) > 0.03 or abs(TJ["lines"][i - 1]["end"] + V0 - E(i)) > 0.03]
        if bad:
            WARN.append(f"строки {bad[:5]}… в events.json не совпадают с timings.json — пересобери events.json")
    else:
        WARN.append("voice.mp3 есть, а timings.json нет: уровни по голосу могут быть неточны")
    i_v0 = int(round(V0 * SR))
    vfull = np.zeros(N)
    nv = max(0, min(len(voice), N - i_v0))
    vfull[i_v0:i_v0 + nv] = voice[:nv]
    del voice

# ---------- служебное ----------
db = lambda x: 10.0 ** (x / 20.0)
dB = lambda p: 10 * np.log10(max(float(p), 1e-20))   # из мощности
hz = lambda m: 440.0 * 2.0 ** ((float(m) - 69.0) / 12.0)
tt = lambda n: np.arange(int(n)) / SR
rng = np.random.default_rng(1866)


def rgen(*key):
    """свой генератор для каждого звука — результат не зависит от порядка вызовов"""
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def bq(kind, f0, q=0.707, gain_db=0.0):
    """биквад RBJ (коэффициенты); применяется амплитудной характеристикой через FFT"""
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


def resp(ba, fr):
    b, a = ba
    z = np.exp(-2j * np.pi * fr / SR)
    return np.abs((b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z))


def eq(x, *bqs, power=1):
    n = x.shape[-1]
    nf = p2(n + 4096)
    fr = np.fft.rfftfreq(nf, 1 / SR)
    H = np.ones_like(fr)
    for ba in bqs:
        H *= resp(ba, fr)
    y = np.fft.irfft(np.fft.rfft(x, nf, axis=-1) * H ** power, nf, axis=-1)[..., :n]
    return y.astype(x.dtype, copy=False)


def kweight(x):
    """K-фильтр BS.1770 (амплитудная характеристика — для энергии в окнах этого достаточно)"""
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
    return eq(np.asarray(x, np.float64), s1, s2)


def bandn(n, lo, hi, g):
    """шум в полосе lo…hi Гц, RMS 1"""
    n = int(n)
    y = eq(g.standard_normal(n), bq("hp", lo, 0.7), bq("lp", hi, 0.7), power=2)
    return y / np.sqrt(np.mean(y ** 2) + 1e-20)


def stft_filter(x, gain_fn, nf=1024, hop=256):
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
    for i in range(nfr):
        out[i * hop:i * hop + nf] += Y[i]
        ws[i * hop:i * hop + nf] += win ** 2
    return (out / np.maximum(ws, 1e-3))[nf:nf + n]


def sweep_noise(n, fc_fn, bw_oct, g, lo=40.0):
    """шум через полосу-«гаусс» шириной bw_oct октав с центром fc_fn(t) — вой, свист, занос"""
    def fn(tc, fr):
        f = np.maximum(fr, 1.0)[None, :]
        fc = np.maximum(np.asarray(fc_fn(np.maximum(tc, 0)), float).reshape(-1, 1), lo)
        return np.exp(-0.5 * (np.log2(f / fc) / bw_oct) ** 2)
    y = stft_filter(g.standard_normal(int(n)), fn)
    return y / (np.std(y) + 1e-12)


def slow(n, rate, g):
    """медленная случайная кривая около 0 (размах ~±1), rate — изменений в секунду"""
    k = int(n / SR * rate) + 4
    return np.interp(np.linspace(0, k - 3, int(n)), np.arange(k), g.standard_normal(k))


def swell(t, t_pk, rise, fall):
    """подъём sin² за rise до t_pk, потом экспонента fall"""
    up = np.sin(0.5 * np.pi * np.clip((t - (t_pk - rise)) / rise, 0, 1)) ** 2
    return np.where(t <= t_pk, up, np.exp(-np.maximum(t - t_pk, 0) / fall))


def fade_tail(x, sec=0.02):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


def pan_gains(p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    gl, gr = pan_gains(pan)
    return np.stack([x * gl, x * gr])


_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


def partials(n, specs, att=0.0012, phase_key=None):
    """сумма затухающих синусов: specs — [(частота, амплитуда, tau)]; выше 18 кГц отбрасываются"""
    t = tt(n)
    g = rgen("ph", phase_key)
    y = np.zeros(n)
    for f, a, tau in specs:
        if f >= 18000 or a <= 0:
            continue
        m = min(n, int(8 * tau * SR) + 1)
        y[:m] += a * np.exp(-t[:m] / tau) * np.sin(2 * np.pi * f * t[:m] + g.uniform(0, 2 * np.pi))
    return y * np.minimum(1.0, t / att)


def cut(x, dur, fade=0.03):
    """нота длиной dur (струну глушат пальцем — короткое затухание fade)"""
    n = min(x.shape[-1], int((dur + fade) * SR))
    y = x[..., :n].copy()
    return fade_tail(y, fade)


# ---------- инструменты ----------
def ks(f, dur, t60, w=0.5, pos=0.2, smooth=1, seed=0):
    """струна Karplus-Strong. Петля считается на своей частоте дискретизации, чтобы период был ровно целым
    (P + задержка фильтра w), потом пересчитывается в 44,1 кГц — строй точный и у высоких нот.
    w — доля «старого» отсчёта в фильтре петли (меньше — ярче и звонче), pos — место щипка (доля струны)."""
    g = np.random.default_rng(seed)
    P = max(2, int(SR / f - w))
    sr2 = f * (P + w)
    n2 = int(dur * sr2) + 3
    exc = g.uniform(-1, 1, P)
    if smooth > 1:
        exc = np.convolve(np.concatenate([exc, exc, exc]), np.ones(smooth) / smooth, "same")[P:2 * P]
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
    x = np.interp(np.arange(n) * (sr2 / SR), np.arange(n2), z[1:n2 + 1])
    x /= max(1e-9, float(np.max(np.abs(x[:int(0.06 * SR)]))))
    a = int(0.0012 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return fade_tail(x, 0.04)


def bala(m, var=0):
    """балалайка-прима: яркий щипок ногтем, звенит недолго (выше — короче)"""
    def mk():
        f = hz(m)
        t60 = float(np.clip(1.45 - 0.025 * (m - 64), 0.55, 1.6))
        x = ks(f, t60 + 0.15, t60, w=0.28, pos=0.12, smooth=1, seed=int(m) * 11 + var * 101 + 3)
        t = tt(len(x))
        # «щелчок» ногтя по струне
        g = rgen("nail", m, var)
        x[:int(0.004 * SR)] += 0.25 * g.standard_normal(int(0.004 * SR)) * np.exp(-t[:int(0.004 * SR)] / 0.0012)
        return x
    return cached(("bal", m, var), mk)


def secunda(m, var=0):
    """балалайка-секунда: темнее примы, аккорды на слабую долю"""
    def mk():
        f = hz(m)
        return ks(f, 0.9, 0.85, w=0.42, pos=0.17, smooth=2, seed=int(m) * 13 + var * 97 + 5)
    return cached(("sec", m, var), mk)


def contrabass(m, var=0):
    """балалайка-контрабас: толстая струна, основной тон подкреплён синусом"""
    def mk():
        f = hz(m)
        x = ks(f, 2.2, 1.9, w=0.5, pos=0.27, smooth=4, seed=int(m) * 7 + var * 31 + 2)
        t = tt(len(x))
        x = x + 0.55 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.7) * np.minimum(1, t / 0.004)
        return fade_tail(x / np.max(np.abs(x)), 0.05)
    return cached(("cb", m, var), mk)


def muted(m, var=0):
    """приглушённый щипок «прялки» (ребро ладони на струнах)"""
    def mk():
        f = hz(m)
        x = ks(f, 0.6, 0.42, w=0.5, pos=0.22, smooth=3, seed=int(m) * 17 + var * 41 + 9)
        return x
    return cached(("mut", m, var), mk)


def tremolo(notes, dur, rate=12.0, vel=1.0, seed=0, ring=0.4, swell_in=0.0):
    """тремоло балалайки: частые удары вниз-вверх по одной ноте или по аккорду; каждый новый удар гасит прошлый"""
    notes = [notes] if np.isscalar(notes) else list(notes)
    g = rgen("trem", tuple(notes), round(dur, 3), seed)
    n = int((dur + ring + 0.05) * SR)
    y = np.zeros(n)
    t, k = 0.0, 0
    per = 1.0 / rate
    while t < dur - 0.02:
        nxt = t + per * (1 + 0.08 * (g.random() - 0.5))
        last = nxt >= dur - 0.02
        seg = (ring if last else (nxt - t) + 0.02)
        v = (1.0 if k % 2 == 0 else 0.72) * (0.88 + 0.24 * g.random())
        order = notes if k % 2 == 0 else notes[::-1]
        for j, mm in enumerate(order):
            x = bala(mm, (k + j) % 3)
            i0 = int(round((t + j * 0.0035) * SR))
            piece = cut(x, seg, 0.015) * v
            i1 = min(n, i0 + len(piece))
            y[i0:i1] += piece[:i1 - i0]
        t, k = nxt, k + 1
    if swell_in > 0:
        tv = tt(n)
        y *= 0.35 + 0.65 * np.clip(tv / swell_in, 0, 1)
    return y * vel / np.sqrt(len(notes))


def kick():
    def mk():
        n = int(0.4 * SR)
        t = tt(n)
        f = 48 + 75 * np.exp(-t / 0.028)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
        g = rgen("kick")
        y[:int(0.006 * SR)] += 0.3 * eq(g.standard_normal(int(0.006 * SR)), bq("lp", 2500))
        return fade_tail(y * np.minimum(1, t / 0.0015), 0.05)
    return cached("kick", mk)


def spoons(v=0):
    """ложки: двойной деревянный щелчок (две ложки ударяются друг о друга и о колено)"""
    def mk():
        g = rgen("spoons", v)
        n = int(0.09 * SR)
        t = tt(n)
        y = np.zeros(n)
        for k, (d, a) in enumerate([(0.0, 1.0), (g.uniform(0.009, 0.014), 0.6)]):
            i0 = int(d * SR)
            m = n - i0
            tk = t[:m]
            body = partials(m, [(g.uniform(1650, 1850), 0.8, 0.011), (g.uniform(2500, 2800), 0.55, 0.008),
                                (g.uniform(3700, 4100), 0.35, 0.005), (g.uniform(950, 1100), 0.3, 0.014)],
                            att=0.0003, phase_key=("sp", v, k))
            nz = eq(g.standard_normal(m), bq("hp", 1500), bq("lp", 7000)) * np.exp(-tk / 0.0025)
            y[i0:] += a * (body + 0.6 * nz)
        return fade_tail(y / np.max(np.abs(y)), 0.02)
    return cached(("spoons", v), mk)


def shake(v=0):
    """бубенцы саней: горсть маленьких неровных колокольчиков, звякнувших почти разом, и дребезг"""
    def mk():
        g = rgen("shake", v)
        n = int(0.4 * SR)
        y = np.zeros(n)
        for b in range(int(g.integers(5, 9))):
            i0 = int(g.uniform(0, 0.03) * SR)
            f = g.uniform(2600, 4600)
            tau = g.uniform(0.06, 0.16)
            y[i0:] += g.uniform(0.5, 1.0) * partials(n - i0, [(f, 1.0, tau), (f * 2.37, 0.45, tau * 0.6),
                                                               (f * 3.91, 0.25, tau * 0.4)],
                                                      att=0.0004, phase_key=("sh", v, b))
        t = tt(n)
        y += 0.25 * eq(g.standard_normal(n), bq("hp", 6000)) * np.exp(-t / 0.025)
        return fade_tail(y / np.max(np.abs(y)), 0.05)
    return cached(("shake", v), mk)


RT = 2048


def reed_table(m, bright):
    """один период язычка: узкий импульс (скважность 0,3), верхние гармоники мягко убраны"""
    def mk():
        f = hz(m)
        K = int(max(3, min(40, 8000 / f)))
        k = np.arange(1, K + 1)
        a = np.abs(np.sin(np.pi * k * 0.3)) / k * np.exp(-k * f / (2200 + 2600 * bright))
        ph = np.arange(RT) / RT
        tab = (a[:, None] * np.sin(2 * np.pi * k[:, None] * ph[None, :])).sum(0)
        tab /= np.max(np.abs(tab))
        return np.concatenate([tab, tab[:1]])
    return cached(("rt", m, bright), mk)


def reed(m, dur, att=0.18, rel=0.45, bright=0.5, seed=0, det=5.0, vel=1.0):
    """нота гармони: два язычка с лёгким биением (det центов), мех — плавная атака и затухание, чуть воздуха"""
    n = int((dur + rel) * SR)
    t = tt(n)
    f = hz(m)
    g = rgen("reed", m, seed, round(dur, 2))
    drift = 1 + 0.0007 * slow(n, 1.2, g)
    tab = reed_table(m, bright)
    y = np.zeros(n)
    for c in (0.0, det):
        ph = np.cumsum(f * 2 ** (c / 1200) * drift) / SR + g.random()
        y += np.interp((ph % 1.0) * RT, np.arange(RT + 1), tab)
    y *= 0.5
    y += 0.012 * bandn(n, 700, 3000, g)
    env = np.sin(0.5 * np.pi * np.clip(t / att, 0, 1)) ** 2
    env *= np.where(t < dur, 1.0, np.cos(0.5 * np.pi * np.clip((t - dur) / rel, 0, 1)) ** 2)
    bel = 1 + 0.06 * np.sin(2 * np.pi * t / max(dur, 0.5) * 0.5)          # мех чуть дышит
    return y * env * bel * vel


# ---------- шины ----------
BUSES = ["bal", "run", "sec", "bass", "drm", "jng", "trm", "acc", "acm", "osc", "wnd", "wni"]
BUS = {k: np.zeros((2, N), np.float32) for k in BUSES}
BUS_G = {"bal": 0.50, "run": 0.40, "sec": 0.30, "bass": 0.32, "drm": 0.30, "jng": 0.18, "trm": 0.45,
         "acc": 0.12, "acm": 0.35, "osc": 0.70, "wnd": 0.035, "wni": 0.07}
BUS_SEND = {"bal": 0.14, "run": 0.18, "sec": 0.08, "bass": 0.0, "drm": 0.05, "jng": 0.18, "trm": 0.30,
            "acc": 0.24, "acm": 0.30, "osc": 0.28, "wnd": 0.0, "wni": 0.0}
MELODIC = ("bal", "run", "trm", "acm")
COUNT = {k: 0 for k in BUSES}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += (x[:, j0:j1] * g).astype(np.float32)
        COUNT[bus] += 1


class Grid:
    """сетка долей: от t0, длины долей lens; за краями продолжается крайней длиной"""

    def __init__(self, t0, lens):
        self.l = np.asarray(lens, float)
        self.s = np.concatenate([[t0], t0 + np.cumsum(self.l)])
        self.n = len(self.l)

    @classmethod
    def even(cls, t0, t1, n):
        return cls(t0, np.full(n, (t1 - t0) / n))

    def t(self, b):
        if b < 0:
            return float(self.s[0] + b * self.l[0])
        if b >= self.n:
            return float(self.s[-1] + (b - self.n) * self.l[-1])
        i = int(np.floor(b))
        return float(self.s[i] + (b - i) * self.l[i])

    def blen(self, b=0):
        return float(self.l[int(np.clip(np.floor(b), 0, self.n - 1))])

    def beat_at(self, t):
        if t <= self.s[0]:
            return (t - self.s[0]) / self.l[0]
        if t >= self.s[-1]:
            return self.n + (t - self.s[-1]) / self.l[-1]
        i = int(np.searchsorted(self.s, t, side="right") - 1)
        return i + (t - self.s[i]) / self.l[i]


# ---------- ноты и аккорды ----------
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "sus4": (0, 5, 7),
        "7sus4": (0, 5, 7, 10), "dim": (0, 3, 6)}


def pcl(s):
    p = NOTE[s[0]]
    for c in s[1:]:
        p += 1 if c == "#" else -1 if c == "b" else 0
    return p % 12


def midi(s):
    i = 1
    while i < len(s) and s[i] in "#b":
        i += 1
    return 12 * (int(s[i:]) + 1) + (NOTE[s[0]] + s[1:i].count("#") - s[1:i].count("b"))


def chord(sym):
    """(тоны трезвучия/септаккорда как классы высот, бас): для 3 голосов у септаккорда выпадает квинта"""
    base, _, sl = sym.partition("/")
    i = 1
    while i < len(base) and base[i] in "#b":
        i += 1
    r = pcl(base[:i])
    ints = QUAL[base[i:]]
    return r, ints, (pcl(sl) if sl else r)


def chord_pcs(sym, size):
    r, ints, _ = chord(sym)
    if len(ints) == 4 and size <= 3:
        ints = (ints[0], ints[1], ints[3])
    return [(r + iv) % 12 for iv in ints]


def tones(sym, lo, size=3):
    pcs = chord_pcs(sym, size)
    out, m = [], int(lo)
    while len(out) < size:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def low(pc, lo):
    m = int(lo)
    while m % 12 != pc % 12:
        m += 1
    return m


def lead(sym, prev, lo=60, hi=76, size=3):
    """голоса аккорда с плавным ведением от прошлого аккорда"""
    cands = [tones(sym, b, size) for b in range(lo, hi)]
    cands = [v for v in cands if v[-1] <= hi]
    if prev is None:
        mid = 0.5 * (lo + hi)
        return min(cands, key=lambda v: abs(np.mean(v) - mid))
    return min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev)) + 0.1 * abs(np.mean(v) - np.mean(prev)))


def parse(txt):
    """«C#5:2 E5:2~ -:2 | …» → [(позиция в шестнадцатых, midi | None, длина в шестнадцатых, тремоло)]"""
    out, pos = [], 0
    for tok in txt.split():
        if tok == "|":
            continue
        tr = tok.endswith("~")
        tok = tok.rstrip("~")
        nm, _, d = tok.partition(":")
        d = int(d)
        out.append((pos, None if nm == "-" else midi(nm), d, tr))
        pos += d
    return out, pos


# ---------- материал (ля мажор, 2/4; такт = 8 шестнадцатых) ----------
THEME_A = ["C#5:2 E5:2 D5:2 C#5:2", "B4:2 G#4:2 E4:4~", "F#4:2 A4:2 B4:2 D5:2", "C#5:4~ A4:4",
           "C#5:2 E5:2 F#5:2 E5:2", "D5:2 B4:2 G#4:2 B4:2", "A4:2 C#5:2 B4:1 A4:1 G#4:2", "A4:4~ -:2 E4:2"]
PROG_A = ["A", "E", "D", "A", "A", "E7", "A,E", "A"]
THEME_B = ["E5:1 F#5:1 E5:2 C#5:2 A4:2", "D5:1 E5:1 D5:2 B4:2 G#4:2", "A4:2 C#5:2 E5:2 A5:2", "G#5:2 F#5:2 E5:4~",
           "F#5:2 D5:2 A4:2 F#5:2", "E5:2 C#5:2 A4:2 E5:2", "D5:2 B4:2 G#4:2 E4:2", "A4:4 -:2 E4:2"]
PROG_B = ["A", "E", "A", "E", "D", "A", "E7", "A"]
INTRO_M = ["A4:4~ C#5:2 E5:2", "D5:2 C#5:2 B4:2 A4:2", "G#4:2 B4:2 E5:2 G#5:2", "A5:2 G#5:2 F#5:1 E5:1 D5:1 B4:1"]
PROG_I = ["A", "E7", "E", "E7"]
FILL_M, FILL_P = "E5:2 C#5:2 A4:2 E4:2", "A"
LAUGH1 = "E6:1 E6:1 E6:1 C#6:1 B5:1 B5:1 A5:2"
LAUGH2 = "A5:1 A5:1 A5:1 F#5:1 E5:1 E5:1 C#5:2"
SIGH = "F5:4~ E5:2 D5:2 C#5:4~ -:4"
for bars in (THEME_A, THEME_B, INTRO_M):
    for b_ in bars:
        if parse(b_)[1] != 8:
            sys.exit(f"такт «{b_}» не 8 шестнадцатых")


def fit(bars, prog, nb):
    """подогнать 8-тактовую фразу под nb тактов: лишние такты убираются из середины, недостающие — проигрыш в конце"""
    bars, prog = list(bars), list(prog)
    while len(bars) > nb and len(bars) > 1:
        j = 5 if len(bars) > 6 else len(bars) // 2
        del bars[j], prog[j]
    while len(bars) < nb:
        bars.append(FILL_M)
        prog.append(FILL_P)
    return bars, prog


# ---------- сетки ----------
BPM_A = 132.0
ST1 = [L(4 * k + 1) for k in range(10)]          # первые строки строф


def plan_dance(starts, target):
    """сильные доли строф — за 0,08…0,40 с до первых строк; чётное число долей в строфе; темп ближе к target"""
    offs = np.round(np.arange(0.08, 0.4001, 0.01), 3)

    def seg(o1, o2, k):
        D = (starts[k + 1] - o2) - (starts[k] - o1)
        best = None
        for nb in (2 * int(np.floor(D / (60 / target) / 2)), 2 * int(np.ceil(D / (60 / target) / 2))):
            if nb < 8:
                continue
            c = (60 * nb / D - target) ** 2
            if best is None or c < best[0]:
                best = (c, nb)
        return best

    cost = {o: (30 * (o - 0.22) ** 2, [o], []) for o in offs}
    for k in range(len(starts) - 1):
        new = {}
        for o2 in offs:
            cands = []
            for o1, (c, path, nbs) in cost.items():
                r = seg(o1, o2, k)
                if r:
                    cands.append((c + r[0] + 30 * (o2 - 0.22) ** 2, path + [o2], nbs + [r[1]]))
            if cands:
                new[o2] = min(cands, key=lambda z: z[0])
        cost = new
    c, path, nbs = min(cost.values(), key=lambda z: z[0])
    return [r3(starts[k] - path[k]) for k in range(len(starts))], nbs


ANC, NB_A = plan_dance(ST1[:5], BPM_A)          # ANC[0..3] — строфы 1–4, ANC[4] — строфа 5
b1 = (ANC[1] - ANC[0]) / NB_A[0]
T_I0 = min(0.1, 0.5 * ANC[0])                    # вступление — с первых долей секунды, свой ровный темп
nI = min((n for n in (2, 4, 6, 8) if (ANC[0] - T_I0) / n > 0.36), key=lambda n: abs((ANC[0] - T_I0) / n - b1))
lensA = [(ANC[0] - T_I0) / nI] * nI
for k in range(4):
    lensA += [(ANC[k + 1] - ANC[k]) / NB_A[k]] * NB_A[k]
GA = Grid(T_I0, lensA)
SBA = [nI + sum(NB_A[:k]) for k in range(5)]     # доля начала строф 1..5 в GA
bpmA = [60 * NB_A[k] / (ANC[k + 1] - ANC[k]) for k in range(4)]
mark("intro_first_beat", GA.t(0))
for k in range(5):
    mark(f"stanza{k + 1}_downbeat", ANC[k])

A6, A7, A8, A9, A10 = (r3(L(4 * k + 1) - 0.2) for k in range(5, 10))
# строфа 5: ritardando — доли удлиняются от темпа пляски до ≈70
D5 = A6 - ANC[4]
bs = GA.blen(GA.n - 1)
cands = [(abs((2 * D5 / n - bs) - 0.85), n) for n in range(5, 24) if 2 * D5 / n - bs > bs * 1.2]
n5 = min(cands)[1]
GB5 = Grid(ANC[4], np.linspace(bs, 2 * D5 / n5 - bs, n5))
n6 = max(4, int(round((A7 - A6) / 0.85)))
GB6 = Grid.even(A6, A7, n6)
GCs = []
for t0, t1 in ((A7, A8), (A8, A9), (A9, A10), (A10, FIN)):
    GCs.append(Grid.even(t0, t1, max(3, int(round((t1 - t0) / 0.9)))))
BF = 0.65                                         # финал: доля 0,65 с (♩≈92)
GF = Grid.even(FIN, FIN + 6 * BF, 6)
GRIDS_BC = [GB5, GB6] + GCs + [GF]
for nm_, G_ in zip(("s5", "s6", "s7", "s8", "s9", "s10"), GRIDS_BC[:-1]):
    mark(f"{nm_}_downbeat", G_.t(0))


def grid_of(t):
    for G_ in GRIDS_BC:
        if t < G_.s[-1] - 1e-6:
            return G_
    return GF


def snapB(t):
    """время t → ближайшая доля своей сетки (строфы 5–10, финал)"""
    G_ = grid_of(t - 0.06)
    return G_.t(int(round(G_.beat_at(t - 0.06))))


def snap16(t):
    """время t → ближайшая шестнадцатая сетки пляски"""
    return round(GA.beat_at(t) * 4) / 4


# ---------- слова-события ----------
T_KACH = W("kachus", L(3) + 0.4)
T_SVER = W("svernulis", L(5) + 0.4)
T_HLOP = W("hlop", L(6) + 0.8)
T_KUB = W("kubarem", L(7))
T_SUG = W("sugrob", L(8) + 0.7)
T_HOH = W("hohochut", L(11) + 0.5)
T_GORE = W("gore", L(15) + 0.75)
T_SMEH = W("smeh", L(16) + 0.6)
T_SELO = W("selo", L(17) + 0.75)
T_VYU = W("vyuga", L(19) + 0.55)
T_TEM = W("temno", L(20) + 0.45)
T_BRED = W("bredesh", L(24) + 0.5)
T_DOOR = r3(L(25) - 0.42)                         # дверь: скрип и стук в паузе перед «Ветхую шубёнку»
T_VOET = W("voet", L(31) + 1.0)
T_OKNO = W("oknom", L(32) + 0.6)
T_MAT = W("matushka", L(35))
T_OGON = W("ogonek", L(38))
mark("door", T_DOOR)

# ---------- партитура: строфы 1–4 (плясовая) ----------
PH = [(0, *fit(INTRO_M[-(nI // 2):], PROG_I[-(nI // 2):], nI // 2))]
for k, (th, pr) in enumerate(((THEME_A, PROG_A), (THEME_B, PROG_B), (THEME_A, PROG_A), (THEME_B, PROG_B))):
    PH.append((SBA[k], *fit(th, pr, NB_A[k] // 2)))
OVR = []                                          # (t0, t1, аккорд) поверх фразы
MEL = []                                          # напев: dict(t, d, m, tr, v, bus)


def chord_A(t):
    for t0, t1, s in OVR:
        if t0 - 1e-4 <= t < t1 - 1e-4:
            return s
    b = GA.beat_at(t + 1e-4)
    for b0, bars, prog in reversed(PH):
        if b >= b0 - 1e-6:
            j = int(np.clip((b - b0) // 2, 0, len(prog) - 1))
            ent = prog[j].split(",")
            return ent[min(int(((b - b0) % 2) >= 1), len(ent) - 1)]
    return PH[0][2][0]


def add_phrase(G, b0, txt, vel=1.0, bus="bal", t_max=None):
    notes, _ = parse(txt)
    for pos, m, d, tr in notes:
        if m is None:
            continue
        t0, t1 = G.t(b0 + pos / 4), G.t(b0 + (pos + d) / 4)
        if t_max is not None:
            if t0 >= t_max - 0.02:
                continue
            t1 = min(t1, t_max)
        acc = 1.0 if pos % 4 == 0 else 0.86
        MEL.append(dict(t=t0, d=t1 - t0, m=m, tr=tr, v=vel * acc, bus=bus))


def carve(t0, t1, bus="bal"):
    keep = []
    for e in MEL:
        if e["bus"] == bus and t0 - 1e-4 <= e["t"] < t1 - 1e-4:
            continue
        if e["bus"] == bus and e["t"] < t0 < e["t"] + e["d"]:
            e = dict(e, d=t0 - e["t"])
        keep.append(e)
    MEL[:] = keep


for b0, bars, prog in PH:
    for j, txt in enumerate(bars):
        add_phrase(GA, b0 + 2 * j, txt, vel=0.9 if b0 == 0 else 1.0)

# «хлоп!» — музыка обрывается; «Кубарем» — пробег вниз; после «бух» — снова пляска со следующей доли
STOP0 = T_HLOP - 0.03
RESUME = GA.t(int(np.ceil(GA.beat_at(T_SUG + 0.12))))
carve(STOP0, RESUME)
mark("stop", STOP0)
mark("resume", RESUME)
RUN = ["A5", "E5", "F#5", "C#5", "D5", "A4", "B4", "F#4", "G#4", "E4", "F#4", "C#4", "D4", "A3", "B3", "G#3"]
t_r0, t_r1 = T_KUB + FRAME, T_SUG - 0.06
for k, nm in enumerate(RUN):
    tk = t_r0 + (t_r1 - t_r0) * k / len(RUN)
    MEL.append(dict(t=tk, d=0.16, m=midi(nm), tr=False, v=0.95 - 0.02 * k, bus="run",
                    pan=0.55 * np.sin(2 * np.pi * k / 4)))
mark("tumble_run", t_r0)
# «хохочут» — балалайка хохочет
b_h = snap16(T_HOH)
add_phrase(GA, b_h, LAUGH1, vel=0.9, bus="run")
carve(GA.t(b_h), GA.t(b_h + 2))
mark("laugh1", GA.t(b_h))
# «горе» — ре минор и вздох; «смех» — ля мажор и хохот до конца строфы
b_g, b_s = snap16(T_GORE - 0.12), snap16(T_SMEH)
OVR.append((GA.t(np.floor(b_g * 2) / 2), GA.t(np.floor(b_s * 2) / 2), "Dm"))
OVR.append((GA.t(np.floor(b_s * 2) / 2), ANC[4], "A"))
carve(GA.t(b_g), ANC[4])
add_phrase(GA, b_g, SIGH, vel=0.85, t_max=GA.t(b_s))
add_phrase(GA, b_s, LAUGH1, vel=1.0, bus="run", t_max=ANC[4])
add_phrase(GA, b_s + 2, LAUGH2, vel=1.0, bus="run", t_max=ANC[4])
add_phrase(GA, b_s + 4, LAUGH1, vel=1.0, bus="run", t_max=ANC[4])
mark("gore_Dm", GA.t(b_g))
mark("smeh_laugh", GA.t(b_s))

# аккомпанемент пляски
for b in range(SBA[4]):
    tb, ta = GA.t(b), GA.t(b + 0.5)
    if b < SBA[0]:
        reg = "intro"
    else:
        reg = f"s{max(k for k in range(4) if b >= SBA[k]) + 1}"
    ch, ch2 = chord_A(tb), chord_A(ta)
    r, ints, bass_pc = chord(ch)
    on = lambda t_: not (STOP0 <= t_ < RESUME - 1e-3)
    bar1 = (b % 2 == 0)
    g = rgen("groove", b)
    hum = lambda: 0.004 * (g.random() - 0.5)
    intro_soft = reg == "intro" and b < SBA[0] - 4
    in_dm = chord_A(tb) == "Dm"
    # бас «ум-па»
    if on(tb):
        pc = bass_pc if bar1 else (r + (ints[2] if len(ints) > 2 else 7)) % 12
        m_b = low(pc, 40)
        put("bass", tb + hum(), cut(contrabass(m_b, b % 2), 0.28 if not in_dm else 0.5, 0.05),
            0.0, 1.0 if bar1 else 0.8)
    # секунда на «и»; вверх лёгкий удар на последнюю шестнадцатую (в строфах 2–4 и в конце вступления)
    if on(ta):
        notes = tones(ch2, 57, 3)
        for j, m_ in enumerate(notes):
            put("sec", ta + j * 0.007 + hum(), cut(secunda(m_, j), 0.17, 0.04), -0.25 + 0.06 * j, 0.95)
        if (reg in ("s2", "s3", "s4") or (reg == "intro" and not intro_soft)) and not bar1 and not in_dm:
            t_up = GA.t(b + 0.75)
            if on(t_up):
                for j, m_ in enumerate(notes[::-1][:2]):
                    put("sec", t_up + j * 0.006, cut(secunda(m_, 2), 0.09, 0.03), -0.15, 0.45)
    # ложки и бочка
    if not intro_soft and not in_dm:
        if on(ta):
            put("drm", ta + hum(), spoons(b % 4), -0.12, 0.85)
        if not bar1 and on(GA.t(b + 0.75)):
            put("drm", GA.t(b + 0.75) + hum(), spoons(4 + b % 3), -0.12, 0.45)
        if on(tb):
            soft4 = reg == "s4" and tb < T_GORE
            put("drm", tb, kick(), 0.0, (0.55 if bar1 else 0.3) * (0.7 if soft4 else 1.0))
    # бубенцы: до «качусь» — на долю, потом восьмыми; на «горе» молчат
    if not in_dm:
        if on(tb):
            put("jng", tb + hum(), shake(b % 6), 0.35, 0.75)
        eighth = not (reg == "intro" or (reg == "s1" and ta < T_KACH))
        if eighth and on(ta):
            put("jng", ta + hum(), shake(6 + b % 5), 0.4, 1.0)
# вступление: удар-тремоло ля мажора на первую долю; после «бух» — удар всем составом
put("trm", GA.t(0), tremolo(tones("A", 64, 3), GA.t(2) - GA.t(0), vel=0.8, seed=1, ring=0.5), 0.1, 1.0)
for j, m_ in enumerate(tones("A", 57, 4)):
    put("sec", RESUME + 0.008 * j, cut(secunda(m_, j), 0.45, 0.08), -0.2, 1.1)
put("jng", RESUME, shake(11), 0.35, 1.3)
put("drm", RESUME, kick(), 0.0, 1.0)
# конец пляски: аккорд в последнюю долю перед строфой 5
t_end_A = GA.t(SBA[4] - 1)
for j, m_ in enumerate(tones("A", 57, 4)):
    put("sec", t_end_A + 0.008 * j, cut(secunda(m_, j), 0.3, 0.06), -0.2, 1.0)

# ---------- строфы 5–10 и финал: аккорды по строкам ----------
CHT_RAW = [(ANC[4], "F#m"), (L(18), "D"), (L(19), "Bm"), (T_VYU, "C#7"), (L(20), "F#m"),
           (A6, "F#m"), (L(22), "Bm"), (L(23), "G"), (L(24), "A7sus4"), (E(24) + 0.25, "A7"),
           (A7, "D"), (L(26), "G"), (L(27), "Bm"), (L(28), "A7"), (E(28) + 0.15, "D"),
           (A8, "Bm"), (L(30), "G"), (L(31), "Em"), (L(32), "F#m"), (E(32) + 0.15, "A7"),
           (A9, "D"), (L(34), "A/C#"), (L(35), "Bm"), (L(36), "G"), (E(36) + 0.15, "A7sus4"),
           (A10, "D"), (L(38), "Bm"), (L(39), "Em7"), (L(40), "A7sus4"), (E(40) + 0.1, "A7"),
           (FIN, "D"), (FIN + 2 * BF, "A7"), (FIN + 3 * BF, "D")]
ANCHORS = {ANC[4], A6, A7, A8, A9, A10, FIN}
CHT = []
for t_, s_ in CHT_RAW:
    ts = t_ if t_ in ANCHORS or t_ >= FIN else snapB(t_)
    if CHT and abs(ts - CHT[-1][0]) < 1e-3:
        CHT[-1] = (ts, s_)
    elif not CHT or CHT[-1][1] != s_ or ts in ANCHORS:      # на начале строфы аккорд берётся заново
        CHT.append((ts, s_))
SEGS = [(CHT[i][0], CHT[i + 1][0] if i + 1 < len(CHT) else TOTAL, CHT[i][1]) for i in range(len(CHT))]


def chord_at(t):
    if t < ANC[4]:
        return chord_A(t)
    s_ = CHT[0][1]
    for t0, sym in CHT:
        if t + 1e-4 >= t0:
            s_ = sym
    return s_


# строфа 5: пляска стихает за 4 доли; тремоло аккордов, перебор на «село», бас на «темно»
for b in range(min(4, GB5.n)):
    tb, ta = GB5.t(b), GB5.t(b + 0.5)
    fade = [1.0, 0.7, 0.48, 0.3][b]
    ch = chord_at(tb)
    r, ints, bass_pc = chord(ch)
    pc = bass_pc if b % 2 == 0 else (r + 7) % 12
    put("bass", tb, cut(contrabass(low(pc, 40), b % 2), 0.35, 0.06), 0.0, fade)
    for j, m_ in enumerate(tones(ch, 57, 3)):
        put("sec", ta + 0.008 * j, cut(secunda(m_, j), 0.2, 0.05), -0.25, 0.9 * fade)
    put("jng", tb, shake(b), 0.35, 0.7 * fade)
    if b < 2:
        put("jng", ta, shake(7 + b), 0.4, 0.6 * fade)
    if b == 0:
        put("drm", tb, kick(), 0.0, 0.7)
        put("drm", ta, spoons(1), -0.12, 0.5)
mark("dance_fades", GB5.t(4))
for t0, t1, sym in SEGS:
    if t0 >= A7 - 1e-3:
        break
    if t0 < A6 - 1e-3:              # строфа 5: тремоло аккорда
        sw = 1.6 if t0 < ANC[4] + 0.01 else 0.3
        put("trm", t0, tremolo(tones(sym, 61, 3), t1 - t0 - 0.03, rate=11.0, vel=0.62, seed=int(t0 * 10),
                                ring=0.5, swell_in=sw), 0.05, 1.0)
    r, ints, bass_pc = chord(sym)
    put("bass", t0, cut(contrabass(low(bass_pc, 40), 1), min(1.6, t1 - t0), 0.12), 0.0, 0.75)
for k, nm in enumerate(["F#5", "C#5", "A4", "F#4", "C#4"]):
    MEL.append(dict(t=T_SELO + FRAME + 0.16 * k, d=0.5, m=midi(nm), tr=False, v=0.62 - 0.05 * k, bus="run", pan=0.2))
put("bass", T_TEM + FRAME, cut(contrabass(low(pcl("F#"), 28), 3), 1.8, 0.2), 0.0, 0.9)
# строфа 6: одинокий напев-тремоло (тон аккорда, потом два шага вниз/вверх)
S6_LINE = {"F#m": ("C#5", "B4", "A4"), "Bm": ("D5", "C#5", "B4"), "G": ("B4", "A4", "G4"),
           "A7sus4": ("A4", "B4", "D5"), "A7": ("C#5", "E5", "G5")}
for t0, t1, sym in SEGS:
    if not (A6 - 1e-3 <= t0 < A7 - 1e-3) or sym not in S6_LINE:
        continue
    a_, b_, c_ = S6_LINE[sym]
    d_ = t1 - t0
    put("trm", t0, tremolo(midi(a_), 0.62 * d_, rate=10.5, vel=0.75, seed=int(t0 * 10), ring=0.3), 0.15, 1.0)
    for j, nm in enumerate((b_, c_)):
        MEL.append(dict(t=t0 + d_ * (0.66 + 0.17 * j), d=0.17 * d_, m=midi(nm), tr=False, v=0.6, bus="trm", pan=0.15))

# строфы 7–10 и финал: гармонь; басы — корень с октавой
prev = None
acc_log = []
for t0, t1, sym in SEGS:
    if t0 < A7 - 1e-3:
        continue
    last = t1 >= TOTAL - 1e-3
    d_ = (TOTAL - t0 - 0.05) if last else (t1 - t0 + 0.12)
    v = lead(sym, prev, 60, 75, 3)
    prev = v
    r, ints, bass_pc = chord(sym)
    mb = low(bass_pc, 38)
    att = 0.32 if abs(t0 - A7) < 1e-3 else 0.2
    for j, m_ in enumerate(v):
        put("acc", t0 + 0.012 * j, reed(m_, d_, att=att, rel=0.5, bright=0.45, seed=j, vel=0.85),
            -0.15 + 0.15 * j, 1.0)
    put("acc", t0, reed(mb, d_, att=att, rel=0.5, bright=0.3, seed=7, vel=0.75), 0.0, 1.0)
    put("acc", t0, reed(mb + 12, d_, att=att, rel=0.5, bright=0.3, seed=8, vel=0.4), 0.0, 1.0)
    acc_log.append(f"{t0:.2f}:{sym}")
mark("warm_accordion", A7)
# подголоски гармони в паузах (доли сетки после конца строки)
FILLS = {28: [("F#5", 1.0), ("E5", 0.5), ("D5", 1.5)], 32: [("C#5", 0.5), ("D5", 0.5), ("E5", 1.0), ("G5", 1.0)],
         36: [("B4", 0.5), ("C#5", 0.5), ("D5", 1.0), ("E5", 1.0)], 40: [("E5", 0.5), ("F#5", 0.5), ("G5", 1.0)]}
for i_l, notes in FILLS.items():
    G_ = grid_of(E(i_l) + 0.05)
    b0 = np.ceil(G_.beat_at(E(i_l) + 0.05) * 2) / 2
    lim = FIN - 0.05 if i_l == 40 else L(i_l + 1) + 0.25
    for nm, d in notes:
        t0 = G_.t(b0)
        if t0 >= lim:
            break
        d_s = G_.t(b0 + d) - t0
        put("acm", t0, reed(midi(nm), d_s * 0.92, att=0.06, rel=0.25, bright=0.6, seed=3, vel=0.9), 0.2, 1.0)
        b0 += d
# остинато «прялки»: приглушённые щипки восьмыми по тонам аккорда (0-2-1-2), с L25 до fin
OST_V = {0: 0.75, 1: 0.8, 2: 1.0, 3: 0.75}
for kG, G_ in enumerate(GCs):
    for b in range(G_.n):
        for h in (0, 1):
            t_ = G_.t(b + 0.5 * h)
            if t_ < A7 + 0.3 or t_ >= FIN - 0.05:
                continue
            tn = tones(chord_at(t_), 69, 3)
            m_ = tn[[0, 2, 1, 2][(2 * b + h) % 4]]
            v = OST_V[kG] * (0.7 if h == 0 else 0.55) * min(1.0, (t_ - A7) / 2.0 + 0.2)
            put("osc", t_, cut(muted(m_, (2 * b + h) % 3), 0.32, 0.05), 0.3 - 0.15 * h, v)
# финал: затакт, тема в ре мажоре тремоло, каденция, последний аккорд с бубенцом
add_phrase(GF, -1, "A4:1 B4:1 C#5:1 E5:1", vel=1.1)
add_phrase(GF, 0, "F#5:2 A5:2 G5:2 F#5:2 E5:2 C#5:2 D5:8~", vel=1.35)
T_LAST = GF.t(4)
for j, m_ in enumerate([50, 57, 62, 66, 69]):
    put("sec", T_LAST + 0.012 * j, secunda(m_, j), -0.2 + 0.1 * j, 1.0)
put("bass", T_LAST, contrabass(low(pcl("D"), 38), 2), 0.0, 0.9)
put("bass", FIN, cut(contrabass(low(pcl("D"), 38), 1), 1.2, 0.2), 0.0, 0.8)
put("bass", FIN + 2 * BF, cut(contrabass(low(pcl("A"), 40), 1), 0.6, 0.15), 0.0, 0.7)
put("jng", T_LAST + 0.02, shake(3), 0.35, 0.8)
mark("final_chord", T_LAST)

# напев на шины
for e in MEL:
    if e["tr"]:
        x = tremolo(e["m"], e["d"], rate=12.0, vel=e["v"], seed=int(e["t"] * 100), ring=0.3)
    else:
        x = cut(bala(e["m"], int(e["t"] * 37) % 3), e["d"] + 0.12, 0.05) * e["v"]
    put(e["bus"], e["t"], x, e.get("pan", 0.15), 1.0)

# ---------- ветер ----------
tN = np.arange(N) / SR


def env_pts(pts):
    pts = sorted(pts)
    return np.interp(tN, [p[0] for p in pts], [p[1] for p in pts], left=pts[0][1], right=pts[-1][1])


def moving_noise(n, fc, bw, g):
    """шум с подвижной полосой: набор полос через 1/3 октавы, веса — «гаусс» около fc(t) (массив на каждый отсчёт)"""
    cs = 2.0 ** np.arange(np.log2(160), np.log2(4200), 1 / 3)
    y = np.zeros(n)
    lfc = np.log2(np.maximum(fc, 40))
    for c in cs:
        w = np.exp(-0.5 * ((np.log2(c) - lfc) / bw) ** 2)
        if w.max() < 0.01:
            continue
        y += w * np.sqrt(c / 1000) * bandn(n, c / 2 ** (1 / 6), c * 2 ** (1 / 6), g)
    return y / (np.std(y) + 1e-12)


W_OUT = env_pts([(0, 0), (ANC[4] - 0.8, 0), (L(17) + 0.4, 0.28), (T_SELO, 0.38), (T_VYU - 0.7, 0.45),
                 (T_VYU + 0.4, 1.0), (T_TEM, 0.85), (E(20) + 0.4, 1.0), (L(21), 0.85), (T_BRED, 0.95),
                 (T_DOOR - 0.03, 0.9), (T_DOOR + 0.09, 0.0), (E(40) + 0.3, 0.0), (FIN, 0.32), (TOTAL, 0.18)])
W_IN = env_pts([(0, 0), (T_DOOR, 0), (T_DOOR + 0.25, 0.5), (L(26), 0.3), (L(29), 0.3), (T_VOET - 0.5, 0.45),
                (T_OKNO + 0.8, 0.55), (L(33), 0.3), (L(37), 0.22), (E(40) + 0.2, 0.2), (FIN, 0.0)])
i_w0 = int(max(0, ANC[4] - 1.0) * SR)
nw = N - i_w0
for ch in (0, 1):
    g = rgen("wind", ch)
    I_ = W_OUT[i_w0:]
    s1 = slow(nw, 0.45, g)
    fc = (330 + 520 * I_) * 2 ** (0.5 * s1)
    y = moving_noise(nw, fc, 0.55, g)
    wh = moving_noise(nw, 2.3 * fc * 2 ** (0.25 * slow(nw, 0.3, g)), 0.16, g)       # посвист
    gust = 0.72 + 0.28 * np.clip(slow(nw, 0.6, g), -1.5, 1.5) / 1.5
    BUS["wnd"][ch, i_w0:] = ((y + 0.35 * wh) * gust * I_).astype(np.float32)
    J_ = W_IN[i_w0:]
    yi = bandn(nw, 70, 420, g) * (0.75 + 0.25 * np.clip(slow(nw, 0.5, g), -1.5, 1.5) / 1.5)
    BUS["wni"][ch, i_w0:] = (yi * J_).astype(np.float32)
mark("wind_strong", T_VYU + 0.4)
mark("wind_cut_by_door", T_DOOR + 0.09)

# ---------- голос: окна строк ----------
SPEECH = [(L(i), E(i)) for i in range(1, NL + 1)]
ACT = np.zeros(N)                          # 1 — идёт строка (с запасом и плавными краями)
for a_, b_ in SPEECH:
    i0, i1 = max(0, int((a_ - 0.35) * SR)), min(N, int((b_ + 0.3) * SR))
    seg = tN[i0:i1]
    ACT[i0:i1] = np.maximum(ACT[i0:i1], np.clip(np.minimum((seg - (a_ - 0.18)) / 0.1, ((b_ + 0.15) - seg) / 0.1), 0, 1))

# ---------- шины: обрыв на «хлоп», тише напев под голосом, EQ, ревербератор ----------
STOPE = env_pts([(0, 1), (STOP0 - 0.005, 1), (STOP0 + 0.03, 0.0), (RESUME - 0.03, 0.0), (RESUME - 0.005, 1),
                 (TOTAL, 1)])
for k in ("bal", "sec", "bass", "drm", "jng", "trm"):
    BUS[k] *= STOPE.astype(np.float32)
duck = (1 - ACT * (1 - db(MEL_DUCK_DB))).astype(np.float32)
for k in MELODIC:
    BUS[k] *= duck
BUS["acc"] *= env_pts([(0, 1), (FIN - 0.05, 1), (FIN + 0.3, 0.6), (TOTAL, 0.6)]).astype(np.float32)   # финал — напев
BUS["bal"] = eq(BUS["bal"], bq("hp", 170, 0.7), bq("peak", 320, 1.0, 2.5), bq("peak", 2900, 1.2, 1.5),
                bq("lp", 9500, 0.7))
BUS["run"] = eq(BUS["run"], bq("hp", 170, 0.7), bq("peak", 320, 1.0, 2.5), bq("lp", 9500, 0.7))
BUS["trm"] = eq(BUS["trm"], bq("hp", 150, 0.7), bq("peak", 320, 1.0, 2.0), bq("lp", 7500, 0.7))
BUS["sec"] = eq(BUS["sec"], bq("hp", 140, 0.7), bq("peak", 300, 1.0, 2.0), bq("lp", 7000, 0.7))
BUS["bass"] = eq(BUS["bass"], bq("hp", 34, 0.7), bq("lp", 1600, 0.6))
BUS["drm"] = eq(BUS["drm"], bq("hp", 38, 0.7), bq("lp", 11000, 0.7))
BUS["jng"] = eq(BUS["jng"], bq("hp", 2400, 0.7), bq("lp", 12000, 0.7))
BUS["acc"] = eq(BUS["acc"], bq("hp", 55, 0.7), bq("peak", 850, 0.9, 1.0), bq("lp", 3000, 0.6))
BUS["acm"] = eq(BUS["acm"], bq("hp", 200, 0.7), bq("lp", 3600, 0.6))
BUS["osc"] = eq(BUS["osc"], bq("hp", 260, 0.7), bq("lp", 5000, 0.7))
BUS["wnd"] = eq(BUS["wnd"], bq("hp", 120, 0.6))
BUS["wni"] = eq(BUS["wni"], bq("hp", 45, 0.7), bq("lp", 380, 0.6))


def make_ir(rt60, length, seed, lp=6000, pre=0.012):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60) * np.minimum(1, t / 0.006)
    ir = eq(ir, bq("lp", lp, 0.6), bq("hp", 200, 0.6))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = p2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


IR_M = [make_ir(1.2, 2.0, 41), make_ir(1.2, 2.0, 42)]
WET = 0.3
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0].astype(np.float64) + BUS[k][1]) for k in BUSES)
music = sum(BUS[k].astype(np.float64) * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
del send
music = eq(music, bq("hp", 30, 0.7))


def pw(chs, wins):
    """средняя мощность на канал в окнах"""
    s = c = 0
    for a_, b_ in wins:
        i0, i1 = max(0, int(a_ * SR)), min(N, int(b_ * SR))
        if i1 > i0:
            s += sum(float(np.sum(np.square(x[i0:i1], dtype=np.float64))) for x in chs) / len(chs)
            c += i1 - i0
    return s / max(1, c)


if HAS_VOICE:
    VPOW = [pw([vfull], [w]) for w in SPEECH]
    vMS = pw([vfull], SPEECH)
    kv = kweight(vfull)
    vKMS = pw([kv], SPEECH)
    del kv
else:
    VPOW = [db(VREF_DB) ** 2] * NL
    vMS = db(VREF_DB) ** 2
    vKMS = vMS * db(K_OFS) ** 2

dip = eq(music, bq("peak", 2500, 0.8, DIP_DB))
music += ACT * (dip - music)
del dip

# ---------- шумы ----------
SFX = np.zeros((2, N))
SFX_SEND = np.zeros(N)
SFX_LOG = []
KW = 0.1


def k_loud(x):
    """K-взвешенная мощность в скользящем окне 100 мс (среднее по каналам)"""
    kx = np.stack([kweight(c) for c in x])
    p = (kx ** 2).mean(0)
    w = int(KW * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    return (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])


def audible(x, st):
    env = np.abs(x).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    return st + act[0] / SR, st + act[-1] / SR


def family(name):
    return name.rstrip("0123456789")


def place(name, what, t_ev, start, x, peak=None, t_end=None, send=0.08):
    """шум в ролик: громкость по SFX_DB (самое громкое окно 100 мс), запись в журнал sfx.json"""
    x = stereo(x).copy()
    n_ = x.shape[1]
    i0 = int(round(start * SR))
    mov = k_loud(x)
    lvl = SFX_DB[family(name)]
    g = np.sqrt(vKMS * db(lvl) ** 2 / max(float(mov.max()), 1e-20))
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
    if peak is not None:
        rec["peak"] = r3(peak)
    if t_end is not None:
        rec["t_end"] = r3(t_end)
    rec["db"] = lvl
    rec["db_lines"] = round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None
    rec["t_loudest"] = r3(cen[int(np.argmax(mov))])
    SFX_LOG.append(rec)


def peak_at(x):
    env = np.convolve(np.abs(stereo(x)).sum(0), np.ones(330) / 330, "same")
    return int(np.argmax(env)) / SR


def hit(name, what, t_ev, x, send=0.08, pk=None, t_end=None):
    """разовый звук: его пик (pk — заданный, иначе по огибающей) — на кадр позже события"""
    pk = peak_at(x) if pk is None else pk
    place(name, what, t_ev, t_ev + FRAME - pk, x, peak=t_ev + FRAME, t_end=t_end, send=send)


def thump(n, f0, f1, tau_f, tau, g):
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / tau_f)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + g.uniform(0, 6.28)) * np.exp(-t / tau) * np.minimum(1, t / 0.002)


def s_runners(dur, t_kach, t_sver, seed=1):
    """полозья по снегу: «ш-ш» с хрустом снега, кочки, редкий скрип; громче с разгоном; обрывается на «хлоп»"""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    gk = rgen("runners-bumps", seed)
    for ch in (0, 1):
        g = rgen("runners", seed, ch)
        hi = bandn(n, 1800, 7500, g)
        lo = bandn(n, 220, 900, g)
        grain = 1 + 0.45 * np.clip(slow(n, 22, g), -2, 2) / 2
        out[ch] = (0.6 * hi + 0.45 * lo) * grain
    speed = np.clip((t + 0.2) / max(t_kach + 1.0, 0.5), 0, 1) ** 1.2
    speed = 0.3 + 0.55 * speed + 0.15 * np.clip((t - t_kach) / max(t_sver - t_kach, 0.5), 0, 1)
    out *= speed
    tb = 0.35 + gk.uniform(0, 0.3)
    while tb < dur - 0.25:                                   # кочки: глухой толчок и всплеск шороха
        i0 = int(tb * SR)
        m = min(n - i0, int(0.3 * SR))
        tk = tt(m)
        bump = 0.9 * thump(m, 120, 60, 0.02, 0.05, gk) + 0.6 * eq(gk.standard_normal(m), bq("lp", 1500)) * np.exp(-tk / 0.03)
        lift = 1 + 0.5 * np.exp(-tk / 0.08)
        for ch in (0, 1):
            out[ch, i0:i0 + m] = out[ch, i0:i0 + m] * lift + bump * speed[i0]
        tb += gk.uniform(0.55, 1.05)
    for k in range(3):                                       # скрип снега под полозом
        tc = gk.uniform(0.6, max(0.7, dur - 0.6))
        i0 = int(tc * SR)
        m = min(n - i0, int(0.2 * SR))
        tk = tt(m)
        sq = bandn(m, 1250, 1900, gk) * (0.5 + 0.5 * np.sin(2 * np.pi * 34 * tk)) * np.sin(np.pi * tk / tk[-1]) ** 2
        out[:, i0:i0 + m] += 0.7 * sq * speed[i0]
    return fade_tail(out * np.minimum(1, t / 0.25), 0.03)


def s_skid():
    """занос санок: «ш-ш-ших» вверх по частоте"""
    g = rgen("skid")
    n = int(0.9 * SR)
    t = tt(n)
    y = sweep_noise(n, lambda tc: 1400 + 2600 * np.clip(tc / 0.35, 0, 1), 0.9, g)
    y = y * swell(t, 0.3, 0.25, 0.22) + 0.4 * bandn(n, 200, 800, g) * swell(t, 0.3, 0.25, 0.15)
    return stereo(fade_tail(y, 0.05), -0.1)


def s_hlop():
    """мягкий «хлоп» на бок в снег"""
    g = rgen("hlop")
    n = int(0.55 * SR)
    t = tt(n)
    y = 1.0 * thump(n, 110, 46, 0.03, 0.09, g)
    y += 0.7 * eq(g.standard_normal(n), bq("hp", 120), bq("lp", 1400)) * np.exp(-t / 0.045)
    y += 0.18 * bandn(n, 1500, 6000, g) * np.exp(-t / 0.12) * (1 + 0.5 * slow(n, 40, g))
    return stereo(fade_tail(y * np.minimum(1, t / 0.002), 0.05), 0.0)


def s_buh():
    """«бух» в сугроб: глубокий удар, снежный выдох и осыпающийся снег"""
    g = rgen("buh")
    n = int(1.2 * SR)
    t = tt(n)
    y = 1.0 * thump(n, 95, 36, 0.04, 0.2, g)
    y += 0.8 * eq(g.standard_normal(n), bq("hp", 80), bq("lp", 900)) * np.exp(-t / 0.12)
    spray = bandn(n, 900, 5500, g) * np.exp(-t / 0.4) * (1 + 0.6 * np.clip(slow(n, 30, g), -1.5, 1.5))
    y += 0.3 * spray
    i2 = int(0.38 * SR)
    y[i2:] += 0.12 * bandn(n - i2, 1500, 6000, g) * np.exp(-t[:n - i2] / 0.2)
    out = np.stack([y, y.copy()])
    out[1] += 0.08 * bandn(n, 1200, 6000, g) * np.exp(-t / 0.4)
    return fade_tail(out * np.minimum(1, t / 0.002), 0.08)


def s_step(seed):
    """шаг по снегу: хруст (каблук, потом носок) и глухой толчок"""
    g = rgen("step", seed)
    n = int(0.32 * SR)
    t = tt(n)
    imp = np.zeros(n)
    for a_, b_, k in ((0.0, 0.055, 10), (0.07, 0.15, 8)):
        for _ in range(k):
            imp[int(g.uniform(a_, b_) * SR)] += g.uniform(0.3, 1.0) * (1 if g.random() < 0.5 else -1)
    ker = g.standard_normal(int(0.006 * SR)) * np.exp(-tt(int(0.006 * SR)) / 0.0015)
    y = np.convolve(imp, ker)[:n]
    y = eq(y, bq("hp", 700), bq("lp", 6500))
    y = y / (np.max(np.abs(y)) + 1e-9) + 0.5 * thump(n, 130, 70, 0.02, 0.04, g)
    return stereo(fade_tail(y, 0.04), 0.1 * (1 if seed % 2 else -1))


def s_door(creak_len=0.34):
    """дверь избы: короткий скрип петли и стук (деревянные моды), щелчок щеколды"""
    g = rgen("door")
    n = int((creak_len + 0.7) * SR)
    t = tt(n)
    y = np.zeros(n)
    nc = int(creak_len * SR)
    tc = tt(nc)
    rate = 55 - 22 * tc / creak_len                               # скрип: частые «прилипания» петли
    ph = np.cumsum(rate) / SR
    pulses = np.diff(np.floor(ph), prepend=0) > 0
    imp = pulses * (0.6 + 0.4 * g.random(nc))
    m = int(0.012 * SR)
    km = tt(m)
    ker = (np.sin(2 * np.pi * 640 * km) + 0.5 * np.sin(2 * np.pi * 1310 * km) + 0.25 * np.sin(2 * np.pi * 2050 * km)) \
        * np.exp(-km / 0.004)
    cr = np.convolve(imp, ker)[:nc] * np.sin(np.pi * tc / creak_len) ** 0.7
    y[:nc] += 0.55 * cr / (np.max(np.abs(cr)) + 1e-9)
    i0 = nc
    md = n - i0
    tk = tt(md)
    th = partials(md, [(92, 1.0, 0.16), (158, 0.8, 0.11), (243, 0.6, 0.09), (371, 0.45, 0.07), (530, 0.3, 0.05),
                       (820, 0.2, 0.03)], att=0.0008, phase_key="door")
    th += 0.6 * eq(g.standard_normal(md), bq("lp", 1600)) * np.exp(-tk / 0.018)
    y[i0:] += th
    il = i0 + int(0.075 * SR)
    y[il:] += 0.18 * partials(n - il, [(2350, 1.0, 0.02), (3720, 0.7, 0.015), (5150, 0.4, 0.01)], att=0.0003,
                              phase_key="latch")
    return stereo(fade_tail(y, 0.06), -0.2)


def s_howl(dur, t_pk, t2):
    """вой ветра за окном: узкая полоса «у-у-у» вверх и вниз, второй вздох на «Вьюга за окном»"""
    g = rgen("howl")
    n = int(dur * SR)
    t = tt(n)

    def fc(tc):
        up = 380 + 260 * np.sin(0.5 * np.pi * np.clip(tc / t_pk, 0, 1))
        return np.where(tc <= t_pk, up, 640 - 170 * np.clip((tc - t_pk) / (dur - t_pk), 0, 1)) \
            * (1 + 0.03 * np.sin(2 * np.pi * 0.9 * tc))
    a = sweep_noise(n, fc, 0.07, g)
    b = sweep_noise(n, lambda tc: 2 * fc(tc), 0.1, g)
    c = sweep_noise(n, fc, 0.6, g)
    y = a + 0.3 * b + 0.35 * c
    env = 0.75 * swell(t, t_pk, t_pk, 0.9) + 0.45 * swell(t, t2, 0.5, 0.7)
    env *= np.minimum(1, (dur - t) / 0.4)
    y = y * env
    out = np.stack([y, np.roll(y, int(0.004 * SR))])
    return fade_tail(out, 0.1)


def s_spindle(dur):
    """веретено жужжит: тон ~120 Гц с гармониками, «качается» с оборотами, шорох нити"""
    g = rgen("spindle")
    n = int(dur * SR)
    t = tt(n)
    f0 = 121 * (1 + 0.015 * slow(n, 0.8, g))
    ph = np.cumsum(f0) / SR
    y = sum((1 / k) * np.sin(2 * np.pi * k * ph + g.uniform(0, 6.28)) for k in range(1, 13))
    rot = 0.62 + 0.38 * (0.5 + 0.5 * np.sin(2 * np.pi * 7.3 * t)) ** 2
    y = y * rot + 0.35 * bandn(n, 1000, 3600, g) * (0.5 + 0.5 * np.sin(2 * np.pi * 7.3 * t + 1.1))
    env = np.minimum(1, t / 0.45) * np.minimum(1, (dur - t) / 0.5)
    return stereo(fade_tail(y * env, 0.05), 0.35)


def s_crackle(dur, t_flare, t_fade0, seed=5):
    """лучина: редкие щелчки и треск (на «огонёк» — чаще), тихое шипение пламени, затухает к fin"""
    g = rgen("crackle", seed)
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    tc = 0.05
    while tc < dur - 0.05:
        i0 = int(tc * SR)
        big = g.random() < 0.12
        m = int((0.03 if big else 0.008) * SR)
        m = min(m, n - i0)
        tk = tt(m)
        p = g.standard_normal(m) * np.exp(-tk / (0.004 if big else g.uniform(0.0006, 0.0018)))
        if big:
            p += 0.6 * np.sin(2 * np.pi * g.uniform(380, 520) * tk) * np.exp(-tk / 0.008)
        a = np.exp(g.normal(0, 0.45)) * (1.4 if big else 1.0)
        pan = g.uniform(-0.3, 0.3)
        gl, gr = pan_gains(pan)
        out[0, i0:i0 + m] += a * gl * p
        out[1, i0:i0 + m] += a * gr * p
        rate = 2.6 + 7.0 * np.exp(-((tc - t_flare) / 0.4) ** 2)
        tc += g.exponential(1 / rate)
    out = eq(out, bq("hp", 1300, 0.7), bq("lp", 9000, 0.7))
    hiss = bandn(n, 2500, 8000, g) * 0.04
    out += np.stack([hiss, np.roll(hiss, 300)])
    env = np.minimum(1, t / 0.3) * np.where(t < t_fade0, 1.0, np.clip(1 - (t - t_fade0) / max(dur - t_fade0, 0.1), 0, 1))
    return out * env


# полозья с L1 до «хлоп»
t0r = L(1) - 0.05
place("runners", "санки едут: шорох полозьев с хрустом снега, кочки, скрип (громче с разгоном)", L(1), t0r,
      s_runners(T_HLOP + FRAME - t0r, T_KACH - t0r, T_SVER - t0r), t_end=T_HLOP, send=0.04)
hit("skid", "санки заносит («Вот свернулись санки»)", T_SVER, s_skid(), send=0.05)
hit("hlop", "мальчик падает на бок в снег («хлоп!»)", T_HLOP, s_hlop(), send=0.06)
hit("buh", "кувырком в сугроб («бух»), снег осыпается", T_SUG, s_buh(), send=0.08)
# шаги сквозь вьюгу — редко, между L23 и дверью
STEPS = [r3(t_) for t_ in T_BRED + 0.82 * np.arange(-4, 4) if L(23) + 0.1 <= t_ <= T_DOOR - 0.4]
for k, t_ in enumerate(STEPS):
    hit(f"step{k + 1}", "шаг по снегу (мальчик бредёт домой)", t_, s_step(k), send=0.05)
mark("steps", STEPS[0] if STEPS else 0)
hit("door", "мальчик толкает дверь избы: скрип петли и стук", T_DOOR, s_door(), pk=0.34 + 0.01, send=0.15)
h0 = T_VOET - 0.4
h_pk = T_VOET + FRAME - h0
h_t2 = (L(32) + 0.4) - h0
h_dur = max(h_t2 + 1.4, E(32) + 1.0 - h0)
place("howl", "за окном воет вьюга, ставня дрожит («воет»)", T_VOET, h0, s_howl(h_dur, h_pk, h_t2),
      peak=T_VOET + FRAME, t_end=h0 + h_dur, send=0.2)
s0 = T_MAT
place("spindle", "матушка за прялкой: жужжит веретено", T_MAT, s0, s_spindle(E(36) + 0.35 - s0), t_end=E(36),
      send=0.15)
c0 = L(37)
place("crackle", "лучина в светце потрескивает (на «огонёк» — вспышка)", L(37), c0,
      s_crackle(FIN + 0.6 - c0, T_OGON + FRAME - c0, E(40) - c0), t_end=FIN, send=0.12)

IR_S = [make_ir(0.9, 1.6, 51, lp=5500), make_ir(0.9, 1.6, 52, lp=5500)]
for ch in (0, 1):
    SFX[ch] += 0.35 * convolve(SFX_SEND, IR_S[ch])
del SFX_SEND

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
SCH = [SFX[0], SFX[1]]
STANZA_OF = lambda i: (i - 1) // 4 + 1


def line_wins(i):
    """окно строки без «тишины» на «хлоп» (её не надо подтягивать); в строке, где пляска возвращается после «бух»,
    уровень считается по пляске, а пробег «кубарем» до неё идёт с уровнем прошлой строки"""
    a_, b_ = SPEECH[i - 1]
    if T_KUB <= a_ < RESUME < b_ - 0.2:
        return [(RESUME, b_)]
    if b_ <= STOP0 or a_ >= T_KUB:
        return [(a_, b_)]
    w = []
    if a_ < STOP0:
        w.append((a_, STOP0))
    if b_ > T_KUB:
        w.append((T_KUB, b_))
    return w or [(a_, b_)]


def line_gain(i, w=None):
    w = w or line_wins(i)
    pv = pw([vfull], w) if HAS_VOICE else VPOW[i - 1]
    pm, ps = pw(MCH, w), pw(SCH, w)
    tgt = pv * db(ST_DB[STANZA_OF(i)]) ** 2             # музыка + шумы
    lo, hi = pv * db(MUS_LIM[0]) ** 2, pv * db(MUS_LIM[1]) ** 2
    pm_t = float(np.clip(tgt - ps, lo, hi))
    return np.sqrt(pm_t / max(pm, 1e-20))


lineG = [line_gain(i) for i in range(1, NL + 1)]
if os.environ.get("MUSIC_DEBUG"):
    print("lineG dB:", " ".join(f"{i + 1}:{20 * np.log10(g_):.1f}" for i, g_ in enumerate(lineG)))
    print("wins 6..9:", [line_wins(i) for i in range(6, 10)])
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(pw(MCH, wins), 1e-20))
W_INTRO = [(0.15, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.1, FIN - 0.05)]
W_FIN = [(FIN, TOTAL - FADE_OUT)]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0.0), (FADE_IN, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1 and T_KUB <= L(i) < RESUME < E(i) - 0.2:
        g_a = line_gain(i, [(L(i), RESUME)])          # пробег «кубарем» и «бух» — до возврата пляски
        shape += [(L(i), g_a), (RESUME - 0.03, g_a), (RESUME - 0.004, g)]
    elif i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i < NL and i % 4 == 0:
        gap = L(i + 1) - E(i)
        if gap > 0.45:
            r = min(0.2, gap / 4)
            gn = max(g, lineG[i])
            gl = float(np.clip(gFor([(E(i) + r, L(i + 1) - r)], GAP_DB[i]), gn, gn * db(GAP_CAP)))
            shape += [(E(i) + r, gl), (L(i + 1) - r, gl)]
            LIFTS.append((i, E(i) + r, L(i + 1) - r))
shape += [(E(NL) + 0.1, gT), (FIN - 0.05, gT), (FIN + 0.15, gF), (TOTAL - FADE_OUT, gF)]
for u in np.linspace(0, 1, 13)[1:]:
    shape.append((TOTAL - FADE_OUT * (1 - u), gF * np.cos(u * np.pi / 2) ** 2))
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f} с — проверь events.json")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve
del music
SFX[:, N - int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))


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
fo = int(0.05 * SR)
out[:, N - fo:] *= np.linspace(1, 0, fo)
if not np.all(np.isfinite(out)):
    sys.exit("в звуке NaN/inf — ошибка синтеза")

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
VREF_ACT = dB(vMS)
lrel = lambda chs, i: f1(dB(pw(chs, [SPEECH[i - 1]])) - dB(VPOW[i - 1]))
srel = lambda chs, s: f1(dB(pw(chs, SPEECH[4 * s - 4:4 * s])) - dB(np.mean(VPOW[4 * s - 4:4 * s])))
rel = lambda chs, w: f1(dB(pw(chs, w)) - VREF_ACT)
per_line = {str(i): lrel(SH, i) for i in range(1, NL + 1)}
per_line_all = {str(i): lrel(ALL, i) for i in range(1, NL + 1)}
per_st = {str(s): srel(SH, s) for s in range(1, 11)}
per_st_all = {str(s): srel(ALL, s) for s in range(1, 11)}
levels = {
    "note": "RMS, дБ к голосу; lines/stanzas — музыка без шумов к голосу тех же строк, *_all — музыка с шумами, "
            "остальное — музыка к среднему голосу в местах речи",
    "voice": "voice.mp3" if HAS_VOICE else f"оценка: голоса нет, RMS {VREF_DB} dBFS в строках",
    "vref_db": f1(VREF_ACT),
    "lines": per_line, "lines_all": per_line_all, "stanzas": per_st, "stanzas_all": per_st_all,
    "under_voice": rel(SH, SPEECH), "under_voice_all": rel(ALL, SPEECH),
    "intro": rel(SH, W_INTRO), "gaps": {f"{i}|{i + 1}": rel(SH, [(a_, b_)]) for i, a_, b_ in LIFTS},
    "tail": rel(SH, W_TAIL), "final": rel(SH, W_FIN),
}
with open(os.path.join(os.path.dirname(os.path.abspath(args.out)), "sfx.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "секунды ролика. t — событие в кадре (t_end — конец долгого действия); peak — пик звука (на кадр позже "
                "события); start/end — где звук слышен; db — громкость шума к среднему голосу (самое громкое окно "
                "100 мс, K-взвешенно, BS.1770), db_lines — то же, но самое громкое окно на строке (null — на строки не "
                "попадает). step* — шаги мальчика (можно ставить ступни на эти моменты), door — скрип и стук двери. "
                "music — ключевые моменты музыки, levels — уровни.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN, "voice": HAS_VOICE, "vref_db": f1(VREF_ACT),
        "events_crc": EV_CRC, "shift": r3(SHIFT),
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print("голос: " + ("voice.mp3 — уровни по настоящему голосу" if HAS_VOICE else
                   f"НЕТ voice.mp3 — уровни по оценке голоса {VREF_DB} dBFS; после озвучки пересчитай этой же командой"))
print(f"пляска: вступление {nI} долей с {GA.t(0):.3f} с; строфы 1–4 — " +
      " ".join(f"{k + 1}:♩{bpmA[k]:.1f} ({NB_A[k]} долей, доля за {L(4 * k + 1) - ANC[k]:.2f} с до строки)" for k in range(4)))
print(f"строфа 5: ritardando {GB5.n} долей ♩{60 / GB5.l[0]:.0f} → ♩{60 / GB5.l[-1]:.0f}; строфа 6: ♩{60 / GB6.blen():.0f} "
      f"({GB6.n}); строфы 7–10: " + " ".join(f"♩{60 / G_.blen():.0f}({G_.n})" for G_ in GCs) + f"; финал ♩{60 / BF:.0f}")
print("аккорды 5–10: " + " ".join(f"{t0:.2f}:{s}" for t0, _, s in SEGS))
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строфам, музыка без шумов | с шумами (дБ к голосу строф): "
      + " ".join(f"{s}:{per_st[s]}|{per_st_all[s]}" for s in per_st))
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
for k0 in range(0, NL, 10):
    print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in list(per_line)[k0:k0 + 10]))
print(f"вступление {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SB = [ANC[0], ANC[1], ANC[2], ANC[3], ANC[4], A6, A7, A8, A9, A10, FIN]
SEC = {"вступл.": [(0.15, ANC[0])]}
for s in range(10):
    SEC[f"с{s + 1}"] = [(SB[s], SB[s + 1])]
SEC["финал"] = [(FIN, TOTAL)]
print("баланс шин (сухо, с BUS_G, K-взвешенно, дБ до формы громкости; тише −45 не показаны):")
for k in BUSES:
    BUS[k] = kweight(BUS[k]).astype(np.float32)
for nm, wins in SEC.items():
    vals = [(k, dB(pw([BUS[k][0], BUS[k][1]], wins)) + 20 * np.log10(BUS_G[k])) for k in BUSES]
    print(f"  {nm}: " + ", ".join(f"{k} {f1(v)}" for k, v in vals if v > -45))
pk_out = float(np.max(np.abs(out)))
print(f"music.wav: пик {f1(20 * np.log10(pk_out))} dBFS, ограничитель {lim:.3f}"
      + (f"; голос + музыка: пик {f1(20 * np.log10(float(np.max(np.abs(np.stack(ALL) + vfull)))))} dBFS" if HAS_VOICE else ""))
print("шумы (db — цель, db_lines — самое громкое окно на строке):")
for r in SFX_LOG:
    print(f"  {r['name']:8s} {r['start']:7.3f}…{r['end']:7.3f}  пик {r.get('peak', 0):7.3f}  громче всего {r['t_loudest']:7.3f}"
          f"  db {r['db']:4d}  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
for w_ in WARN:
    print("ВНИМАНИЕ:", w_)
print(f"время синтеза: {time.time() - T_START:.1f} с")
