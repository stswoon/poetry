#!/usr/bin/env python3
"""Музыка и шумы к стиху И. С. Никитина «Встреча зимы», стиль «поп-арт комикс»: выпуск комикса, в котором осенний
дождь за ночь сменяется зимой, а Зима прилетает супергероиней.

Своя бодрая «комиксовая» полька-марш в 2/4, соль минор → соль мажор (строфа 9 — ля мажор). Мелодия и гармония свои.
Тема — прыгучий напев «си-ре-СОЛЬ фа#-соль-СИ»: во вступлении (в миноре), в коротких проигрышах между строфами,
в строфе 8 (Зима «поёт песни севера» — челеста под голосом) и в финале (громко).
Инструменты — синтез (numpy):
  пиццикато струнных (аддитивный щипок: место щипка, резонанс корпуса, верхние гармоники гаснут быстрее) —
    бас «ум» (шина bass), аккорды «па» (шина pizz), капли-пиццикато и «на цыпочках» (шина drop);
  челеста (почти чистый тон с октавой и металлическим призвуком) — шина cel;
  колокольчики-глокеншпиль (обертоны свободной пластины 1 : 2,76 : 5,40 : 8,93) — шина glk;
  бубенцы саней (кучка маленьких неровных колокольчиков с дребезгом) — шина jng;
  барабан щёточками: «ш-ш» щётки, удар по малому, мягкая бочка, тарелочка-«шипелка», дробь — шина drm;
  тихие струнные (волновая таблица пилы, три расстроенных голоса, вибрато) — шина pad.
План (секунды ролика из events.json; каждая строфа — своя ровная сетка 2/4 от «L(первой строки) − 0,25 с» до начала
следующей, число тактов подбирается под темп ≈118, поэтому сетка сама подстраивается под любые тайминги):
  0 … L1−0,25  вступление (4 такта при V0 4,2 с; при другом V0 — 1…5 тактов): удар-аккорд соль минор на появление
               названия (0,15…0,6 с) и пиццикато-разгон
               вверх, тема в миноре на челесте, бас-«ум-па»; с 1,6 с (по обложке начинает лить дождь) — капли-пиццикато;
  строфы 1–3   минор, тише: «ум-па» пиццикато, щётки, капли-пиццикато; вздохи челесты; строфа 2 — холодные струнные;
               на «полдень» — бой часов, на «перестал» капли стихают, со «снежок» — снежинки челесты;
  строфа 4     «Ночь прошла» — тихий аккорд Ebmaj7 и снежинки; на «рассвело» — взлёт колокольчиков, мерцание челесты,
               соль мажор; со следующего такта — полька: «ум-па», щётки, арпеджио челесты, колокольчики;
  строфы 5–7   мажор: колокольчики на каждый такт, «ум-па-ум-па», подголоски челесты; строфа 7 мягче (тёплые струнные);
               проигрыш перед строфой 8 — пробег колокольчиков вверх и дробь (Зима влетает);
  строфы 8–9   полный состав: «ум-па-ум-па», бочка и щётки, бубенцы саней восьмыми, струнные; в строфе 8 челеста ведёт тему
               под голосом; строфа 9 — подъём в ля мажор, на «ковры» — каскад челесты вниз (ковёр раскатывается);
  строфа 10    игриво, «на цыпочках»: короткое пиццикато, лёгкие щётки; на «пахнул» — «дрожь» уменьшённого аккорда;
               на «Ничего!» — лёгкий аккорд, а сразу после голоса — весёлый аккорд-удар всем составом;
  финал        тема громко (челеста, колокольчики, «ум-па-ум-па», бубенцы), последний аккорд, затухание к концу.
Громкость: под голосом музыка вместе с шумами на 18–20 дБ тише голоса (строфы 1–3 — тише всего, 8–9 — громче всего),
громче во вступлении, в паузах между строфами (проигрыши) и в финале; под голосом у музыки провал −3 дБ около 2,5 кГц.
Если ../voice.mp3 есть — уровни считаются по настоящему голосу каждой строки; если нет — по оценке голоса
(VREF_DB, медиана прошлых голосов ElevenLabs проекта), и после озвучки музыку нужно пересчитать той же командой.
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса (список и уровни — sfx.json):
«ТУК!» капель по стеклу, «ФЬЮ-У-У» ветра, «БОМ!» часов, «ДЗИНЬ!» солнца, «ПУФ!» облачка, «ХРУСТЬ!» льда, искорки снега и
алмазов, свист полёта Зимы, «ВЖУХ!» петли, «ВЖУХ!» ледяного луча, «ФУ-У-УХ!» порыва холода.

Запуск: python3 make_music.py [--intro 4.2] [--outro 7.0] [--no-voice] [--voice ../voice.mp3] [--out music.wav]
        (по умолчанию V0 и OUTRO из events.json; при другом вступлении все события сдвигаются)
Читает events.json (его пишет ../video/build.py), ../voice.mp3 (если есть, через ffmpeg) и ../timings.json (если есть —
для сверки). Пишет music.wav (44,1 кГц, 16 бит, стерео, длина = total из events.json) и рядом sfx.json (шумы, уровни,
ключевые моменты музыки). Нужны python3 + numpy (и ffmpeg, когда есть голос).
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
ST_DB = {1: -19.9, 2: -19.9, 3: -19.9, 4: -19.2, 5: -19.2, 6: -19.2, 7: -19.3, 8: -18.7, 9: -18.7, 10: -19.0}
MUS_LIM = (-20.4, -18.3)   # музыка одна на строке не выходит из этих пределов (дБ к голосу строки)
INTRO_DB = -8.5            # вступление, к среднему голосу
GAP_DB = {4: -12.0, 8: -12.5, 12: -13.5, 16: -10.5, 20: -10.5, 24: -11.0, 28: -9.0, 32: -9.5, 36: -10.5}
GAP_CAP = 9.0              # пауза не громче соседних строк больше чем на 9 дБ
TAIL_DB = -6.5             # после голоса до fin (аккорд-удар), к среднему голосу
FIN_DB = -5.0              # финал: тема громко
FADE_IN = 0.12             # нарастание в самом начале, с
FADE_OUT = 2.2             # затухание в конце, с
DIP_DB = -3.0              # провал музыки около 2,5 кГц под голосом
VREF_DB = -22.0            # оценка голоса без voice.mp3: RMS моно в строках, dBFS (медиана 27 прошлых голосов: −22)
K_OFS = 0.5                # K-взвешенная мощность речи примерно на 0,5 дБ выше RMS
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {"tuk": -15, "wind": -18, "bom": -16, "dzin": -16, "puff": -21, "crunch": -14, "spark": -20, "gleam": -21,
          "blesk": -17, "fly": -15, "loop": -16, "ray": -15, "gust": -14}

# ---------- аргументы и события ----------
EV_PATH = os.path.join(HERE, "events.json")
for i_, a_ in enumerate(sys.argv[:-1]):          # --events — другой файл событий (для проб)
    if a_ == "--events":
        EV_PATH = sys.argv[i_ + 1]
if not os.path.exists(EV_PATH):
    sys.exit("нет events.json — сначала запусти ../video/build.py")
with open(EV_PATH, "rb") as f:
    EV_BYTES = f.read()
RAW = json.loads(EV_BYTES.decode("utf-8"))
EV_CRC = f"{zlib.crc32(EV_BYTES):08x}"
ap = argparse.ArgumentParser(description="музыка и шумы к «Встрече зимы» Никитина")
ap.add_argument("--intro", type=float, help=f"вступление до голоса, с (V0); по умолчанию из events.json ({RAW['V0']})")
ap.add_argument("--outro", type=float, help=f"финал после голоса, с; по умолчанию из events.json ({RAW['OUTRO']})")
ap.add_argument("--no-voice", action="store_true", help="не читать ../voice.mp3: уровни по оценке голоса")
ap.add_argument("--voice", default=os.path.join(POEM, "voice.mp3"), help="голос (по умолчанию ../voice.mp3)")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV (sfx.json — рядом)")
ap.add_argument("--events", default=EV_PATH, help="файл событий (по умолчанию events.json рядом)")
args = ap.parse_args()
V0 = float(args.intro if args.intro is not None else RAW["V0"])
OUTRO = float(args.outro if args.outro is not None else RAW["OUTRO"])
if V0 < 2.0:
    sys.exit("вступление короче 2 с: обложке не хватит места")

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
FIN = EV.get("fin", E(NL) + 1.6)
if FIN > TOTAL - 3.0:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
WARN = []


def W(key, fallback):
    """время слова-события; если ключа нет — запасное время и предупреждение"""
    if key in EV:
        return EV[key]
    WARN.append(f"нет события {key} в events.json — беру {fallback:.2f} с")
    return r3(fallback)


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
                    "голосу? Перезапусти ../video/build.py")
    TJP = os.path.join(POEM, "timings.json")
    if os.path.exists(TJP):
        with open(TJP, encoding="utf-8") as f:
            TJ = json.load(f)
        bad = [i for i in range(1, NL + 1)
               if abs(TJ["lines"][i - 1]["start"] + V0 - L(i)) > 0.03 or abs(TJ["lines"][i - 1]["end"] + V0 - E(i)) > 0.03]
        if bad:
            WARN.append(f"строки {bad[:5]}… в events.json не совпадают с timings.json — перезапусти ../video/build.py")
    else:
        WARN.append("voice.mp3 есть, а timings.json нет: events.json по оценке, уровни по голосу будут неточны")
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
rng = np.random.default_rng(1854)


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
    """шум через полосу-«гаусс» шириной bw_oct октав с центром fc_fn(t) — свист, «вжух», порыв"""
    def fn(tc, fr):
        f = np.maximum(fr, 1.0)[None, :]
        fc = np.maximum(np.asarray(fc_fn(np.maximum(tc, 0)), float).reshape(-1, 1), lo)
        return np.exp(-0.5 * (np.log2(f / fc) / bw_oct) ** 2)
    y = stft_filter(g.standard_normal(int(n)), fn)
    return y / (np.std(y) + 1e-12)


def glide(f_fn, n):
    """синус с плавно меняющейся частотой f_fn(t)"""
    t = tt(n)
    return np.sin(2 * np.pi * np.cumsum(f_fn(t)) / SR)


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


# ---------- инструменты ----------
# пиццикато: tau — затухание основного тона на 392 Гц (ниже дольше), pos — место щипка, tilt — спад гармоник,
# damp — насколько быстрее гаснут верхние, body — резонанс корпуса, snap — щелчок пальца
PZ = {
    "mid": dict(tau=0.19, pos=0.15, tilt=1.05, damp=0.6, body=0.9, snap=0.12, kmax=40, dmax=1.4),
    "bass": dict(tau=0.22, pos=0.17, tilt=0.95, damp=0.4, body=1.2, snap=0.05, kmax=48, dmax=2.0),
    "drop": dict(tau=0.11, pos=0.12, tilt=1.1, damp=0.9, body=0.4, snap=0.2, kmax=24, dmax=0.8),
    "tip": dict(tau=0.08, pos=0.14, tilt=1.1, damp=1.0, body=0.7, snap=0.15, kmax=30, dmax=0.5),
}


def _pizz(m, kind):
    P = PZ[kind]
    f0 = hz(m)
    tau1 = P["tau"] * (392.0 / f0) ** 0.6
    n = int(min(P["dmax"], 6.5 * tau1 + 0.06) * SR)
    K = max(1, min(P["kmax"], int(16000 / f0)))
    k = np.arange(1, K + 1)
    fk = f0 * k * np.sqrt(1 + 1.2e-4 * k * k)
    a = np.abs(np.sin(np.pi * k * P["pos"])) / k ** P["tilt"]
    a *= 1 + P["body"] * (np.exp(-0.5 * (np.log2(fk / 290) / 0.5) ** 2) + 0.5 * np.exp(-0.5 * (np.log2(fk / 2600) / 0.6) ** 2))
    tau = tau1 / (1 + P["damp"] * (k - 1) * f0 / 1000)
    y = partials(n, zip(fk, a, tau), att=0.0012, phase_key=("pz", m, kind))
    g = rgen("snap", m, kind)
    ns = int(0.012 * SR)
    y[:ns] += P["snap"] * np.max(np.abs(y)) * bandn(ns, 1200, 6000, g) * np.exp(-tt(ns) / 0.0025)
    return fade_tail(y / np.max(np.abs(y)), 0.03)


def pizz(m, kind="mid"):
    return cached(("pz", int(m), kind), lambda: _pizz(int(m), kind))


def _celesta(m):
    f0 = hz(m)
    s = (523.25 / f0) ** 0.35
    n = int(min(3.2, 6.5 * s) * SR)
    sp = [(f0, 1.0, 1.3 * s), (f0 * 1.00104, 0.22, 1.1 * s), (2 * f0, 0.2, 0.4 * s), (3 * f0, 0.045, 0.16 * s),
          (4.07 * f0, 0.09, 0.1 * s), (6.9 * f0, 0.03, 0.035 * s)]
    y = partials(n, sp, att=0.0015, phase_key=("cel", m))
    ns = int(0.006 * SR)
    y[:ns] += 0.05 * bandn(ns, 500, 4000, rgen("celh", m)) * np.exp(-tt(ns) / 0.0015)
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def celesta(m):
    return cached(("cel", int(m)), lambda: _celesta(int(m)))


def _glock(m):
    f0 = hz(m)
    s = (1568.0 / f0) ** 0.25
    sp = [(f0, 1.0, 1.5 * s), (2.76 * f0, 0.3, 0.45 * s), (5.40 * f0, 0.12, 0.16 * s), (8.93 * f0, 0.05, 0.07 * s)]
    y = partials(int(3.0 * SR), sp, att=0.0006, phase_key=("glk", m))
    ns = int(0.004 * SR)
    y[:ns] += 0.08 * bandn(ns, 3000, 12000, rgen("glkh", m)) * np.exp(-tt(ns) / 0.001)
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def glock(m):
    return cached(("glk", int(m)), lambda: _glock(int(m)))


def _jingle(v):
    """встряска бубенцов: 9 маленьких неровных колокольчиков с разбросом по времени и дребезг"""
    g = rgen("jng", v)
    n = int(0.42 * SR)
    t = tt(n)
    y = np.zeros(n)
    for _ in range(9):
        i0 = int(abs(g.normal(0, 0.007)) * SR)
        f = g.uniform(3200, 7600)
        tau = g.uniform(0.035, 0.11)
        part = partials(n - i0, [(f, 1.0, tau), (f * g.uniform(1.42, 1.52), 0.5, tau * 0.7),
                                 (f * g.uniform(2.05, 2.2), 0.3, tau * 0.5)], att=0.0004, phase_key=("jb", v, i0, f))
        y[i0:] += part * g.uniform(0.5, 1.0)
    y += 0.35 * bandn(n, 5000, 12000, g) * np.exp(-t / 0.025)
    return fade_tail(y / np.max(np.abs(y)), 0.03)


def jingle(v):
    return cached(("jng", v % 8), lambda: _jingle(v % 8))


def _swish(kind):
    g = rgen("sw", kind)
    if kind == "beat":
        n, rise, fall = int(0.24 * SR), 0.02, 0.07
    else:   # «long»: протяжное «ш-ш-ш»
        n, rise, fall = int(0.6 * SR), 0.3, 0.12
    t = tt(n)
    env = swell(t, rise, rise, fall)
    y = bandn(n, 1800, 9000, g) * env
    return fade_tail(y / np.max(np.abs(y)), 0.02)


def swish(kind="beat"):
    return cached(("sw", kind), lambda: _swish(kind))


def _tap(v):
    g = rgen("tap", v)
    n = int(0.25 * SR)
    t = tt(n)
    y = bandn(n, 900, 7000, g) * np.exp(-t / 0.045) * 0.8 + np.sin(2 * np.pi * 188 * t) * np.exp(-t / 0.03) * 0.5
    y *= np.minimum(1, t / 0.0008)
    return fade_tail(y / np.max(np.abs(y)), 0.02)


def tap(v=0):
    return cached(("tap", v % 3), lambda: _tap(v % 3))


def _boom():
    n = int(0.8 * SR)
    t = tt(n)
    y = glide(lambda t: 48 + 42 * np.exp(-t / 0.04), n) * np.exp(-t / 0.22)
    ns = int(0.004 * SR)
    y[:ns] += 0.3 * bandn(ns, 100, 2500, rgen("boom")) * np.exp(-tt(ns) / 0.001)
    y *= np.minimum(1, t / 0.0015)
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def boom():
    return cached("boom", _boom)


def _sizzle():
    """тарелочка-«шипелка» для ударов-аккордов"""
    g = rgen("siz")
    n = int(1.6 * SR)
    t = tt(n)
    y = bandn(n, 5000, 14000, g) * np.exp(-t / 0.45)
    y += 0.6 * partials(n, [(g.uniform(3000, 9000), g.uniform(0.3, 1), g.uniform(0.2, 0.5)) for _ in range(7)],
                        att=0.0005, phase_key="siz")
    y *= np.minimum(1, t / 0.001)
    return fade_tail(y / np.max(np.abs(y)), 0.1)


def sizzle():
    return cached("siz", _sizzle)


def roll(dur, seed=0):
    """дробь щётками с нарастанием (AM ~22 Гц), dur — длина, громче к концу"""
    g = rgen("roll", seed)
    n = int(dur * SR)
    t = tt(n)
    am = 0.55 + 0.45 * np.abs(np.sin(np.pi * 22 * t + 0.3 * slow(n, 6, g)))
    y = bandn(n, 1500, 8000, g) * am * (t / dur) ** 1.6
    return fade_tail(y / np.max(np.abs(y)), 0.01)


TS = 4096
_TAB = {}


def saw_table(h):
    if h not in _TAB:
        x = np.arange(TS) / TS
        k = np.arange(1, h + 1)
        tab = (np.sin(2 * np.pi * np.outer(k, x)) * (1 / k ** 1.15)[:, None]).sum(0)
        _TAB[h] = tab / np.max(np.abs(tab))
    return _TAB[h]


def pad_note(m, dur, att=0.35, rel=0.5, bright=0.6, seed=0):
    """тихие струнные: три расстроенных голоса пилы с вибрато"""
    f0 = hz(m)
    n = int((dur + rel) * SR)
    t = tt(n)
    g = rgen("pad", m, seed)
    h = max(2, int(min(24, 7000 / f0) * bright))
    tab = saw_table(h)
    vib = 1 + 0.0032 * np.sin(2 * np.pi * 5.1 * t + g.uniform(0, 6)) * np.clip((t - 0.25) / 0.6, 0, 1)
    y = np.zeros(n)
    for det in (-0.0034, 0.0, 0.0041):
        ph = g.uniform() + np.cumsum(f0 * (1 + det) * vib) / SR
        y += tab[((ph % 1.0) * TS).astype(np.int64) % TS]
    env = np.sin(0.5 * np.pi * np.clip(t / att, 0, 1)) ** 2
    env *= np.cos(0.5 * np.pi * np.clip((t - dur) / rel, 0, 1)) ** 2
    return y * env / 3


# ---------- шины ----------
BUSES = ["bass", "pizz", "drop", "cel", "glk", "jng", "drm", "pad"]
BUS = {k: np.zeros((2, N), np.float32) for k in BUSES}
BUS_G = {"bass": 0.45, "pizz": 0.6, "drop": 0.56, "cel": 0.21, "glk": 0.22, "jng": 0.32, "drm": 0.53, "pad": 0.08}
BUS_SEND = {"bass": 0.0, "pizz": 0.15, "drop": 0.35, "cel": 0.35, "glk": 0.4, "jng": 0.15, "drm": 0.08, "pad": 0.3}


def put(bus, t, x, pan=0.0, g=1.0):
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    j0, j1 = max(0, -i0), min(x.shape[1], N - i0)
    if j1 > j0:
        BUS[bus][:, i0 + j0:i0 + j1] += (x[:, j0:j1] * g).astype(np.float32)


class Grid:
    """сетка долей (четвертей): от t0, длины долей lens; за краями продолжается крайней длиной (отрицательные доли —
    затакт/вступление)"""

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
        """доля (дробная), на которую приходится время t"""
        if t <= self.s[0]:
            return (t - self.s[0]) / self.l[0]
        if t >= self.s[-1]:
            return self.n + (t - self.s[-1]) / self.l[-1]
        i = int(np.searchsorted(self.s, t, side="right") - 1)
        return i + (t - self.s[i]) / self.l[i]


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(s):
    return 12 * (int(s[-1]) + 1) + NOTE[s[0]] + s[:-1].count("#") - s[:-1].count("b")


def parse(txt):
    """«B4/.25 D5/.25 r/.5 …» → [(доля, midi, длина)], всего долей"""
    out, b = [], 0.0
    for tok in txt.replace("|", " ").split():
        nm, d = tok.split("/")
        if nm != "r":
            out.append((b, midi(nm), float(d)))
        b += float(d)
    return out, b


QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "maj7": (0, 4, 7, 11),
        "6": (0, 4, 7, 9), "m6": (0, 3, 7, 9), "dim7": (0, 3, 6, 9), "m7b5": (0, 3, 6, 10), "sus4": (0, 5, 7)}


def chord(sym):
    """«F#m», «Bbmaj7», «D7/F#» → (корень, интервалы, класс баса)"""
    main, _, sl = sym.partition("/")
    r = main[:2] if len(main) > 1 and main[1] in "#b" else main[:1]
    rp = (NOTE[r[0]] + r.count("#") - r.count("b")) % 12
    iv = QUAL[main[len(r):]]
    bp = rp if not sl else (NOTE[sl[0]] + sl.count("#") - sl.count("b")) % 12
    return rp, iv, bp


def tones(sym, lo, size):
    """size звуков аккорда подряд вверх от lo"""
    rp, iv, _ = chord(sym)
    pcs = {(rp + i) % 12 for i in iv}
    out, m = [], lo
    while len(out) < size:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def low(pc, lo):
    return lo + (pc - lo) % 12


def transpose(txt, k):
    """сдвиг мелодии на k полутонов (для строфы 9 в ля мажоре)"""
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    out = []
    for tok in txt.split():
        nm, d = tok.split("/")
        if nm == "r":
            out.append(tok)
            continue
        m = midi(nm) + k
        out.append(f"{names[m % 12]}{m // 12 - 1}/{d}")
    return " ".join(out)


def fit(prog, nb):
    """гармония строфы на nb тактов: начало как написано, последние два такта (каденция и проигрыш) сохраняются,
    середина при нехватке обрезается, при избытке повторяется"""
    p = prog.split() if isinstance(prog, str) else list(prog)
    if nb <= 2:
        return p[-nb:]
    if nb <= len(p):
        return p[:nb - 2] + p[-2:]
    mid = p[-6:-2] if len(p) >= 6 else p[:-2]
    ext = [mid[i % len(mid)] for i in range(nb - len(p))]
    return p[:-2] + ext + p[-2:]


# ---------- сетки ----------
BPM0 = 118.0
BEAT0 = 60.0 / BPM0
PRE = 0.25                                   # сильная доля строфы — чуть раньше первого слова
SB = []
for k in range(10):
    s = L(4 * k + 1) - PRE
    if k:
        s = max(s, 0.5 * (E(4 * k) + L(4 * k + 1)))
    SB.append(s)
B_END = E(NL) + 0.12                         # аккорд-удар сразу после «Ничего!»
GS, NB = [], []
for k in range(10):
    t0, t1 = SB[k], (SB[k + 1] if k < 9 else B_END)
    nb = max(3, int(round((t1 - t0) / (2 * BEAT0))))
    G = Grid.even(t0, t1, 2 * nb)
    if not 0.40 < G.blen() < 0.66:
        sys.exit(f"строфа {k + 1}: доля {G.blen():.3f} с — темп вне 91…150, проверь events.json")
    GS.append(G)
    NB.append(nb)
bpm = lambda G: 60.0 / G.blen()
FILL_T = [E(4 * k) + 0.07 for k in range(1, 11)]   # проигрыш строфы k — не раньше конца её последней строки


def in_fill(k, t):
    return k < 9 and t >= FILL_T[k] - 0.02


# ---------- партии ----------
def strum(bus, t, ms, kind, vel, pan0=-0.25, dpan=0.2, gap=0.007):
    for i, m in enumerate(ms):
        put(bus, t + gap * i, pizz(m, kind) * vel / np.sqrt(len(ms)), pan0 + dpan * i)


def oompah(G, b, sym, style, vel, alt=False):
    """аккомпанемент польки на такт: «ум» — бас, «па» — короткий аккорд пиццикато"""
    rp, iv, bp = chord(sym)
    root = low(bp, 40)
    fifth = low((rp + 7) % 12, 40)
    pah = tones(sym, 55, 3)
    if style == "light":
        put("bass", G.t(b), pizz(fifth if alt else root, "bass") * vel * 0.9)
        strum("pizz", G.t(b + 1), pah, "mid", vel * 0.75)
    elif style in ("polka", "full"):
        put("bass", G.t(b), pizz(fifth if alt else root, "bass") * vel)
        strum("pizz", G.t(b + 0.5), pah, "mid", vel * 0.7)
        put("bass", G.t(b + 1), pizz(root if alt else fifth, "bass") * vel * 0.82)
        strum("pizz", G.t(b + 1.5), pah, "mid", vel * 0.62)
    elif style == "tiptoe":
        put("bass", G.t(b), pizz(root, "tip" if root > 47 else "bass") * vel * 0.6)
        strum("drop", G.t(b + 1), tones(sym, 60, 3), "tip", vel * 1.0, gap=0.004)


def brushes(G, b, style, vel=1.0, k=0):
    if style == "soft":
        put("drm", G.t(b), swish() * 0.45 * vel, -0.2)
        put("drm", G.t(b + 1), swish() * 0.38 * vel, 0.2)
        put("drm", G.t(b + 1) + 0.01, tap(k) * 0.28 * vel, 0.1)
    elif style == "light":
        put("drm", G.t(b), swish() * 0.55 * vel, -0.2)
        put("drm", G.t(b + 1), swish() * 0.5 * vel, 0.2)
        put("drm", G.t(b + 1) + 0.01, tap(k) * 0.45 * vel, 0.1)
        put("drm", G.t(b + 1.75), tap(k + 1) * 0.12 * vel, 0.15)
    elif style in ("polka", "full"):
        f = 1.0 if style == "full" else 0.75
        put("drm", G.t(b), boom() * 0.7 * f * vel)
        put("drm", G.t(b + 1), boom() * 0.4 * f * vel)
        for j, x in enumerate((0.0, 0.5, 1.0, 1.5)):
            put("drm", G.t(b + x), swish() * (0.42 if j % 2 == 0 else 0.3) * vel, -0.25 + 0.15 * j)
        put("drm", G.t(b + 0.5) + 0.008, tap(k) * 0.55 * f * vel, 0.12)
        put("drm", G.t(b + 1.5) + 0.008, tap(k + 1) * 0.6 * f * vel, 0.12)
    elif style == "tiptoe":
        put("drm", G.t(b), swish() * 0.3 * vel, -0.2)
        put("drm", G.t(b + 1) + 0.01, tap(k) * 0.3 * vel, 0.15)
        put("drm", G.t(b + 1.5) + 0.01, tap(k + 2) * 0.16 * vel, 0.2)


def sleigh(G, b, vel=1.0, k=0):
    """бубенцы саней восьмыми, ударные доли сильнее, на «и» второй доли — шестнадцатая-подскок"""
    for j, (x, v) in enumerate(((0.0, 0.9), (0.5, 0.5), (1.0, 0.75), (1.5, 0.5), (1.75, 0.28))):
        put("jng", G.t(b + x) + rng.normal(0, 0.003), jingle(k * 5 + j) * v * vel, 0.35 if j % 2 else 0.2)


def cel_arp(G, b, sym, vel, lo=72, pat=(0, 2, 1, 2), until=None):
    ts = tones(sym, lo, 3)
    for j, x in enumerate((0.0, 0.5, 1.0, 1.5)):
        t = G.t(b + x)
        if until is not None and t >= until:
            break
        put("cel", t, celesta(ts[pat[j]]) * vel * (1.0 if j == 0 else 0.8), 0.25 - 0.15 * (j % 2))


def glock_bell(G, b, sym, vel, lo=84):
    put("glk", G.t(b), glock(tones(sym, lo, 1)[0]) * vel, 0.3)


MINOR_SC = {7, 9, 10, 0, 2, 3, 5, 6}   # соль минор (с фа-диезом)


def sigh(G, b, sym, vel):
    """вздох челесты: верхний сосед → звук аккорда"""
    m = tones(sym, 74, 2)[1]
    up = m + 2 if (m + 2) % 12 in MINOR_SC else m + 1
    put("cel", G.t(b + 1), celesta(up) * vel * 0.8, 0.3)
    put("cel", G.t(b + 1.5), celesta(m) * vel, 0.3)


def motif(G, b, sym, vel, lo=67, shape=(0, 1, 2, "n", 2, 3), until=None):
    """подголосок ритмом темы на звуках текущего аккорда; «n» — хроматический нижний сосед"""
    ts = tones(sym, lo, 4)
    for (x, _), s in zip(((0, .25), (.25, .25), (.5, .5), (1.0, .25), (1.25, .25), (1.5, .5)), shape):
        m = ts[2] - 1 if s == "n" else ts[s]
        t = G.t(b + x)
        if until is not None and t >= until:
            break
        put("cel", t, celesta(m) * vel * (1.0 if x in (0.5, 1.5) else 0.78), -0.15)


def play(G, b0, txt, inst, bus, vel=1.0, pan=0.0, t_min=None, t_max=None):
    notes, total = parse(txt)
    for b, m, d in notes:
        t = G.t(b0 + b)
        if (t_min is not None and t < t_min) or (t_max is not None and t >= t_max):
            continue
        put(bus, t, inst(m) * vel * (1.0 if abs(b - round(b)) < 1e-6 else 0.86), pan)
    return total


def pad_span(t0, t1, sym, vel, lo=55, size=4, att=0.5, rel=0.6, bright=0.55, seed=0):
    for i, m in enumerate(tones(sym, lo, size)):
        put("pad", t0, pad_note(m, max(0.2, t1 - t0), att=att, rel=rel, bright=bright, seed=seed * 7 + i) * vel,
            -0.35 + 0.7 * i / max(1, size - 1))


def pad_line(G, pr, j0, j1, vel, lo=55, size=4, att=0.5, rel=0.6, bright=0.55, seed=0):
    """тихие струнные по аккордам тактов j0…j1−1, одинаковые аккорды подряд — одной нотой"""
    j = j0
    while j < j1:
        k = j
        while k + 1 < j1 and pr[k + 1] == pr[j]:
            k += 1
        pad_span(G.t(2 * j), G.t(2 * k + 2) + 0.08, pr[j], vel, lo, size, att, rel, bright, seed * 31 + j)
        j = k + 1


def stab(t, sym, big=1.0, bass_lo=40):
    """аккорд-удар всем составом (обложка, финал)"""
    rp, iv, bp = chord(sym)
    put("bass", t, pizz(low(bp, bass_lo), "bass") * 0.95 * big)
    strum("pizz", t, tones(sym, 50, 4), "mid", 1.1 * big, gap=0.006)
    for i, m in enumerate(tones(sym, 79, 2)):
        put("glk", t + 0.004 * i, glock(m) * 0.6 * big, 0.25 - 0.4 * i)
    for i, m in enumerate(tones(sym, 67, 3)):
        put("cel", t + 0.003 * i, celesta(m) * 0.4 * big, -0.2 + 0.2 * i)
    put("drm", t, boom() * 0.85 * big)
    put("drm", t + 0.002, sizzle() * 0.28 * big, 0.25)


# ---------- материал ----------
# тема (соль мажор, 8 тактов 2/4), гармония G Em Am D7 G C D7 G
TH = ["B4/.25 D5/.25 G5/.5 F#5/.25 G5/.25 B5/.5",
      "G5/.5 E5/.5 B4/1",
      "C5/.25 E5/.25 A5/.5 G#5/.25 A5/.25 B5/.5",
      "C6/.5 A5/.5 F#5/.5 D5/.5",
      "B4/.25 D5/.25 G5/.5 F#5/.25 G5/.25 B5/.5",
      "E6/.5 C6/.5 G5/.25 A5/.25 G5/.25 E5/.25",
      "D5/.25 F#5/.25 A5/.5 C6/.5 F#5/.5",
      "G5/.5 B5/.25 D6/.25 G6/.5 r/.5"]
TH_CH = ["G", "Em", "Am", "D7", "G", "C", "D7", "G"]
# тема в миноре для вступления: Gm | Cm | (Eb) | D7
TM = {"m1": ("Bb4/.25 D5/.25 G5/.5 F#5/.25 G5/.25 Bb5/.5", "Gm"),
      "m2": ("C6/.5 G5/.5 Eb5/1", "Cm"),
      "m3": ("Bb5/.25 G5/.25 Eb5/.5 D5/.25 Eb5/.25 G5/.5", "Eb"),
      "m4": ("A5/.5 F#5/.5 D5/.5 r/.5", "D7")}
# гармония строф (12 тактов «по плану»; fit() подгоняет под настоящее число тактов)
PROG = {
    1: "Gm Gm Cm D7 Gm Gm Eb D Gm Cm D7 D7",
    2: "Cm Cm Gm Gm Eb Cm D D7 Gm Eb Am7b5 D7",
    3: "Gm Gm Eb Eb Bb Bb Eb Bb Cm Cm D7 D7",
    4: "G G C G D D7 G Em C D7 G",           # после ночного такта (Ebmaj7)
    5: "G Em C D G Em Am D7 G C D7 G7",
    6: "C C G G Am D7 G G C D G D7",
    7: "Em Em C G Am D G Em C Am D7 D7",
    8: " ".join(TH_CH) + " C D7 G E7",
    9: "A F#m Bm E7 A D E7 A D E7 A D7",
}
# проигрыши между строфами (затакт к следующей строфе, доли до её сильной доли)
FILLS = {
    1: "D5/.25 F#5/.25 A5/.5 C6/.5 A5/.25 F#5/.25",
    2: "C6/.5 A5/.5 F#5/.5 D5/.5",
    3: "A5/.75 F#5/.25 D5/1",
    4: TH[0],
    5: "G5/.25 B5/.25 D6/.25 F6/.25 E6/.5 D6/.5",
    6: TH[6],
    7: "D5/.125 E5/.125 F#5/.125 G5/.125 A5/.125 B5/.125 C6/.125 D6/.125 E6/.125 F#6/.125 G6/.125 A6/.125 "
       "B6/.125 C7/.125 D7/.25 r/.25",
    8: "E5/.25 G#5/.25 B5/.25 D6/.25 E6/.5 D6/.25 B5/.25",
    9: "D6/.25 C6/.25 A5/.25 F#5/.25 D5/.5 r/.5",
}


def fill(k, cel=0.9, glk=0.0, pz=0.0):
    """проигрыш в конце строфы k (1…9): звучат только ноты после конца её последней строки"""
    G, nb = GS[k - 1], NB[k - 1]
    _, F = parse(FILLS[k])
    b0 = 2 * nb - F
    play(G, b0, FILLS[k], celesta, "cel", cel, -0.1, t_min=FILL_T[k - 1])
    if glk:
        play(G, b0, FILLS[k], lambda m: glock(m + 12 if m < 84 else m), "glk", glk, 0.3, t_min=FILL_T[k - 1])
    if pz:
        play(G, b0, FILLS[k], lambda m: pizz(m, "drop"), "drop", pz, 0.25, t_min=FILL_T[k - 1])
    mark(f"fill_{k}", max(G.t(b0), FILL_T[k - 1]))


def drops(t0, t1, density, G_of, ch_of, g, ramp=None, stop=None):
    """капли-пиццикато: на шестнадцатых с вероятностью density, звуки текущего аккорда в 5–6 октавах"""
    t = t0
    while t < t1:
        G = G_of(t)
        step = 0.25 * G.blen(G.beat_at(t))
        p = density
        if ramp:
            p *= np.clip((t - ramp[0]) / (ramp[1] - ramp[0]), 0, 1)
        if stop:
            p *= 1 - np.clip((t - stop[0]) / (stop[1] - stop[0]), 0, 1)
        if g.random() < p:
            ts = tones(ch_of(t), 74, 6)
            m = ts[g.integers(len(ts))]
            put("drop", t + g.normal(0, 0.006), pizz(m, "drop") * g.uniform(0.35, 1.0), g.uniform(-0.65, 0.65))
        t += step


def flakes(t0, t1, ch_of, g, vel=0.45, lo=86):
    """снежинки челесты: редкие высокие звуки аккорда"""
    t = t0 + g.uniform(0, 0.2)
    while t < t1:
        ts = tones(ch_of(t), lo, 4)
        put("cel", t, celesta(ts[g.integers(len(ts))]) * vel * g.uniform(0.6, 1.0), g.uniform(-0.6, 0.6))
        t += g.uniform(0.3, 0.6)


# ---------- партитура ----------
PR = {}                                         # гармония по тактам каждой строфы
# удар-аккорд — когда влетают буквы названия (titleBlock с 0,15 с), не позже 0,6 с; число тактов вступления — чтобы
# темп был ближе к ♩118
best = None
for n_ in (10, 8, 6, 4, 2):
    t0_ = float(np.clip(SB[0] - n_ * BEAT0, 0.15, 0.6))
    dev = abs((SB[0] - t0_) / n_ - BEAT0) / BEAT0
    if best is None or dev < best[0] - 0.02:
        best = (dev, n_, t0_)
_, nI, T_I0 = best
GI = Grid.even(T_I0, SB[0], nI)                # своя сетка вступления: от удара до первой доли строфы 1
if not 0.40 < GI.blen() < 0.75:
    sys.exit(f"вступление: доля {GI.blen():.3f} с — проверь V0")
INTRO_PLAN = {10: ["stab", "m1", "m2", "m3", "m4"], 8: ["stab", "m1", "m2", "m4"], 6: ["stab", "m1", "m4"],
              4: ["stab", "m4"], 2: ["stab"]}[nI]
RAIN0, RAIN1 = 1.6, 3.0                       # дождь на обложке: ../video/src/scenes3.js, sceneCover (1,6…3,0 с)
intro_ch = {}
for j, kind in enumerate(INTRO_PLAN):
    b = 2 * j
    if kind == "stab":
        stab(GI.t(b), "Gm", 0.9)
        intro_ch[b] = "Gm"
        for i, nm in enumerate(("D4", "G4", "Bb4", "D5", "G5", "Bb5")):     # пиццикато-разгон вверх
            put("pizz", GI.t(b + 0.5 + 0.25 * i), pizz(midi(nm), "mid") * (0.45 + 0.08 * i), -0.4 + 0.16 * i)
        mark("intro_stab", GI.t(b))
    else:
        txt, ch = TM[kind]
        intro_ch[b] = ch
        play(GI, b, txt, celesta, "cel", 0.95, -0.1)
        play(GI, b, txt, lambda m: glock(m + 12), "glk", 0.3, 0.3)
        oompah(GI, b, ch, "light", 0.85)
        brushes(GI, b, "light", 0.9, j)
        if kind == "m4":
            put("drm", GI.t(b), roll(GI.t(b + 2) - GI.t(b) - 0.02, 1) * 0.35, 0.1)
        if kind == "m1":
            mark("intro_theme", GI.t(b))


def G_of(t):
    for k in range(9, -1, -1):
        if t >= GS[k].s[0]:
            return GS[k]
    return GI


def ch_of(t):
    for k in range(9, -1, -1):
        if t >= GS[k].s[0] and k + 1 in PR:
            G = GS[k]
            j = int(np.clip(G.beat_at(t) // 2, 0, NB[k] - 1))
            return PR[k + 1][j]
    b = GI.beat_at(t)
    keys = sorted(intro_ch)
    cur = intro_ch[keys[0]]
    for kb in keys:
        if b >= kb:
            cur = intro_ch[kb]
    return cur


# строфа 1: дождь — минор, «ум-па», щётки, вздохи челесты
PR[1] = fit(PROG[1], NB[0])
G = GS[0]
for j, ch in enumerate(PR[1]):
    b = 2 * j
    oompah(G, b, ch, "light", 0.8, alt=(j > 0 and PR[1][j - 1] == ch))
    brushes(G, b, "soft", 1.0, j)
    if j % 2 == 1 and not in_fill(0, G.t(b + 1)):
        sigh(G, b, ch, 0.5)
fill(1, cel=0.85, pz=0.5)

# строфа 2: холод от угрюмых небес, плачет лес — струнные, капли реже
PR[2] = fit(PROG[2], NB[1])
G = GS[1]
for j, ch in enumerate(PR[2]):
    b = 2 * j
    oompah(G, b, ch, "light", 0.75, alt=(j > 0 and PR[2][j - 1] == ch))
    brushes(G, b, "soft", 0.85, j)
    if j % 4 == 3 and not in_fill(1, G.t(b + 1)):
        sigh(G, b, ch, 0.45)
pad_line(G, PR[2], 0, NB[1], 0.9, lo=53, size=3, att=0.9, rel=0.8, bright=0.45, seed=2)
fill(2, cel=0.8, glk=0.35)

# строфа 3: полдень — бьют часы, дождь перестал, пошёл снежок
PR[3] = fit(PROG[3], NB[2])
G = GS[2]
T_STOP = W("perestal", L(9) + 1.5)
T_SNOW = W("pushok", L(11))
for j, ch in enumerate(PR[3]):
    b = 2 * j
    oompah(G, b, ch, "light", 0.72 if G.t(b) > T_STOP else 0.78, alt=(j > 0 and PR[3][j - 1] == ch))
    if G.t(b) < T_STOP + 0.3:
        brushes(G, b, "soft", 0.85, j)
    elif j % 2 == 0:
        put("drm", G.t(b), swish() * 0.3, -0.2)
j_snow = int(np.clip(G.beat_at(T_SNOW) // 2, 0, NB[2] - 1))
pad_line(G, PR[3], j_snow, NB[2], 0.7, lo=58, size=3, att=1.2, rel=0.8, bright=0.4, seed=3)
fill(3, cel=0.7)
mark("rain_stop", T_STOP)
mark("snow", T_SNOW)

# строфа 4: «Ночь прошла» — Ebmaj7; «Рассвело» — колокольчики, соль мажор; потом полька
G = GS[3]
T_SUN = W("rassvelo", L(13) + 1.1)
j_r = int(np.clip(G.beat_at(T_SUN) // 2, 0, NB[3] - 2))
j_p = j_r + 1
while j_p < NB[3] - 1 and G.t(2 * j_p) < T_SUN + 0.3:
    j_p += 1
PR[4] = ["Ebmaj7"] * j_r + fit(PROG[4], NB[3] - j_r)
pad_span(G.t(0) - 0.05, T_SUN + 0.05, "Ebmaj7", 1.5, lo=58, size=4, att=0.5, rel=0.25, bright=0.45, seed=40)
if j_r > 0:
    put("bass", G.t(0), pizz(39, "bass") * 0.6)               # ночь: мягкий бас ми-бемоль
for i, nm in enumerate(("G6", "D6")):                      # ночь: две звёздочки челесты
    tn = G.t(1 + 1.5 * i)
    if tn < T_SUN - 0.15:
        put("cel", tn, celesta(midi(nm)) * 0.6, 0.4 - 0.8 * i)
for i, nm in enumerate(("G5", "B5", "D6", "G6", "B6", "D7", "G7")):   # «рассвело»: взлёт колокольчиков
    put("glk", T_SUN - 0.12 + 0.03 * i, glock(midi(nm)) * (0.45 + 0.07 * i), -0.5 + 0.17 * i)
t = T_SUN + 0.05
k = 0
while t < G.t(2 * j_p) - 0.05:                             # мерцание челесты до начала польки
    put("cel", t, celesta((79, 83, 86, 91)[k % 4]) * 0.42, 0.3 if k % 2 else -0.3)
    t += 0.25 * G.blen()
    k += 1
strum("pizz", T_SUN + 0.02, tones("G", 55, 4), "mid", 0.8, gap=0.02)
put("bass", T_SUN + 0.02, pizz(43, "bass") * 0.8)
put("drm", T_SUN, sizzle() * 0.18, 0.2)
pad_span(T_SUN, G.t(2 * j_p) + 0.3, "G", 0.6, lo=59, size=3, att=0.3, rel=0.6, bright=0.5, seed=41)
for j in range(j_p, NB[3]):
    ch = PR[4][j]
    b = 2 * j
    oompah(G, b, ch, "light", 0.82, alt=(PR[4][j - 1] == ch))
    brushes(G, b, "light", 0.8, j)
    if not in_fill(3, G.t(b)):
        cel_arp(G, b, ch, 0.42, until=FILL_T[3])
        if j % 2 == 0:
            glock_bell(G, b, ch, 0.4)
fill(4, cel=0.9, glk=0.45)
mark("night", G.t(0))
mark("sunrise_major", T_SUN)
mark("polka_major", G.t(2 * j_p))

# строфа 5: снег полотном, блестит — колокольчики на каждый такт
PR[5] = fit(PROG[5], NB[4])
G = GS[4]
for j, ch in enumerate(PR[5]):
    b = 2 * j
    oompah(G, b, ch, "light", 0.85, alt=(j > 0 and PR[5][j - 1] == ch))
    brushes(G, b, "light", 0.85, j)
    if not in_fill(4, G.t(b)):
        glock_bell(G, b, ch, 0.5)
        cel_arp(G, b, ch, 0.38, lo=74, pat=(0, 1, 2, 1), until=FILL_T[4])
fill(5, cel=0.85, glk=0.5)

# строфа 6: лес смотрит весело — «ум-па-ум-па», подголоски челесты
PR[6] = fit(PROG[6], NB[5])
G = GS[5]
for j, ch in enumerate(PR[6]):
    b = 2 * j
    oompah(G, b, ch, "polka", 0.82, alt=(j > 0 and PR[6][j - 1] == ch))
    brushes(G, b, "polka", 0.8, j)
    if not in_fill(5, G.t(b)):
        if j % 2 == 0:
            motif(G, b, ch, 0.5, until=FILL_T[5])
            glock_bell(G, b, ch, 0.35)
fill(6, cel=0.9, glk=0.4)

# строфа 7: берёзы, капли-алмазы — мягче, тёплые струнные; проигрыш — пробег вверх и дробь (Зима летит)
PR[7] = fit(PROG[7], NB[6])
G = GS[6]
for j, ch in enumerate(PR[7]):
    b = 2 * j
    oompah(G, b, ch, "light", 0.78, alt=(j > 0 and PR[7][j - 1] == ch))
    brushes(G, b, "soft", 0.9, j)
    if not in_fill(6, G.t(b)):
        cel_arp(G, b, ch, 0.36, lo=76, pat=(2, 1, 0, 1), until=FILL_T[6])
pad_line(G, PR[7], 0, NB[6], 0.75, lo=55, size=4, att=0.8, rel=0.6, bright=0.5, seed=7)
fill(7, cel=0.85, glk=0.6)
t_r0 = max(FILL_T[6], G.t(2 * NB[6] - 2.25))
put("drm", t_r0, roll(GS[7].s[0] - t_r0, 7) * 0.55, 0.1)
mark("winter_run", t_r0)

# строфа 8: «Здравствуй, гостья-зима!» — полный состав, бубенцы саней, челеста ведёт тему под голосом
PR[8] = fit(PROG[8], NB[7])
G = GS[7]
stab(G.t(0), "G", 0.55)
for j, ch in enumerate(PR[8]):
    b = 2 * j
    oompah(G, b, ch, "full", 0.9, alt=(j > 0 and PR[8][j - 1] == ch))
    brushes(G, b, "full", 0.9, j)
    sleigh(G, b, 0.9, j)
    if in_fill(7, G.t(b)):
        continue
    if j < min(8, NB[7] - 2):
        play(G, b, TH[j], celesta, "cel", 0.62, -0.1, t_max=FILL_T[7])
        play(G, b, TH[j], lambda m: glock(m + 12), "glk", 0.2, 0.3, t_max=FILL_T[7])
    else:
        motif(G, b, ch, 0.5, until=FILL_T[7])
pad_line(G, PR[8], 0, NB[7], 0.8, lo=55, size=4, att=0.4, rel=0.5, bright=0.6, seed=8)
fill(8, cel=0.9, glk=0.55)
mark("full_sleigh", G.t(0))

# строфа 9: раздолье — ля мажор, подголоски челесты; на «ковры» — каскад вниз
PR[9] = fit(PROG[9], NB[8])
G = GS[8]
for j, ch in enumerate(PR[9]):
    b = 2 * j
    oompah(G, b, ch, "full", 0.92, alt=(j > 0 and PR[9][j - 1] == ch))
    brushes(G, b, "full", 0.92, j)
    sleigh(G, b, 0.95, j + 3)
    if in_fill(8, G.t(b)):
        continue
    if j % 2 == 0:
        glock_bell(G, b, ch, 0.35)
    motif(G, b, ch, 0.48, lo=69, shape=((0, 1, 2, "n", 2, 3), (3, 2, 1, 0, 1, 2))[j % 2], until=FILL_T[8])
pad_line(G, PR[9], 0, NB[8], 0.8, lo=57, size=4, att=0.4, rel=0.5, bright=0.6, seed=9)
T_KOV = W("kovry", L(36) + 0.4)
for i, nm in enumerate(("A6", "G#6", "F#6", "E6", "D6", "C#6", "B5", "A5")):   # ковёр раскатывается
    put("cel", T_KOV - 0.35 + 0.1 * i, celesta(midi(nm)) * (0.62 - 0.03 * i), 0.5 - 0.12 * i)
fill(9, cel=0.85)
mark("lift_A", G.t(0))
mark("carpet_run", T_KOV - 0.35)

# строфа 10: игриво, «на цыпочках»; на «пахнул» — дрожь уменьшённого аккорда; «Ничего!» — аккорд
G = GS[9]
T_GUST = W("pahnul", L(37) + 1.5)
T_NO = W("nichego", L(40) + 1.1)
bg = G.beat_at(T_GUST)
j_g = int(bg // 2) + (1 if (bg % 2) > 1.2 else 0)
j_g = int(np.clip(j_g, 1, NB[9] - 3))
PR[10] = ["G"] * j_g + ["C#dim7", "D7"] + fit("G Em Am D7 G C D7 D7", NB[9] - j_g - 2)
for j, ch in enumerate(PR[10]):
    b = 2 * j
    if ch == "C#dim7":
        put("bass", G.t(b), pizz(low(1, 40), "bass") * 0.7)
        continue
    oompah(G, b, ch, "tiptoe", 0.85)
    brushes(G, b, "tiptoe", 1.0, j)
    if j % 2 == 1 and ch != "D7":
        play(G, b, "r/1 " + " ".join(f"{nm}/.25" for nm in
                                     (("B5", "C6", "C#6", "D6") if ch == "G" else ("G5", "A5", "A#5", "B5"))),
             lambda m: pizz(m, "tip"), "drop", 0.9, 0.35)
t_sh0 = max(T_GUST - 0.1, G.t(2 * j_g) - 0.4)
t_sh1 = G.t(2 * j_g + 2)
pad_span(t_sh0, t_sh1 + 0.1, "C#dim7", 0.85, lo=61, size=4, att=0.35, rel=0.5, bright=0.5, seed=100)
t, k = t_sh0, 0
while t < t_sh1:                                           # дрожь: тремоло челесты
    put("cel", t, celesta((73, 76)[k % 2] + 12) * 0.32 * (1 - 0.4 * (t - t_sh0) / (t_sh1 - t_sh0)), 0.2 * (-1) ** k)
    t += 0.125 * G.blen()
    k += 1
ch_no = PR[10][int(np.clip(G.beat_at(T_NO) // 2, 0, NB[9] - 1))]
strum("pizz", T_NO + FRAME, tones(ch_no, 55, 3), "mid", 0.6, gap=0.012)
put("glk", T_NO + FRAME, glock(tones(ch_no, 86, 1)[0]) * 0.35, 0.3)
mark("shiver", t_sh0)
mark("nichego_chord", T_NO + FRAME)

# финал: аккорд-удар после голоса, тема громко, последний аккорд и затухание
T_STAB = B_END
beat_prev = G.blen()
RING_MIN = 2.2
OPTS = [("full", [0, 1, 2, 3, 4, 5, 6]), ("short", [0, 5, 6]), ("tiny", [6])]
avail = TOTAL - RING_MIN - T_STAB
choice = None
for nm, bars in OPTS:
    cb = 2 + 2 * len(bars) + 1                              # такт удара + такты темы + первая доля 8-го такта
    bl = avail / cb
    if bl >= 0.9 * beat_prev:
        choice = (nm, bars, cb, min(bl, 1.04 * beat_prev))
        break
if choice is None:
    choice = ("tiny", [6], 5, max(0.38, avail / 5))
fin_kind, fin_bars, CB, bl = choice
lens = np.full(CB, bl)
lens[-3:] *= (1.05, 1.1, 1.18)                              # замедление к последнему аккорду
GF = Grid(T_STAB, lens)
T_CHORD = GF.t(CB)
stab(T_STAB, "G", 1.0)
sleigh(GF, 0, 1.0, 40)
put("jng", T_STAB, jingle(3) * 1.1, 0.2)
play(GF, 1.5, "A4/.25 A#4/.25", celesta, "cel", 0.8, -0.1)
for i, bi in enumerate(fin_bars):
    b = 2 + 2 * i
    ch = TH_CH[bi]
    play(GF, b, TH[bi], celesta, "cel", 1.0, -0.1)
    play(GF, b, TH[bi], lambda m: glock(m + 12), "glk", 0.45, 0.3)
    oompah(GF, b, ch, "full", 0.95, alt=(i % 2 == 1))
    brushes(GF, b, "full", 0.9, i)
    sleigh(GF, b, 0.9, 41 + i)
    pad_span(GF.t(b), GF.t(b + 2) + 0.05, ch, 0.8, lo=55, size=4, att=0.15, rel=0.3, bright=0.6, seed=200 + i)
b8 = 2 + 2 * len(fin_bars)
play(GF, b8, "G5/.5 B5/.25 D6/.25", celesta, "cel", 1.0, -0.1)
play(GF, b8, "G5/.5 B5/.25 D6/.25", lambda m: glock(m + 12), "glk", 0.45, 0.3)
put("bass", GF.t(b8), pizz(43, "bass") * 0.8)
strum("pizz", GF.t(b8 + 0.5), tones("G", 55, 3), "mid", 0.6)
put("drm", GF.t(b8), roll(T_CHORD - GF.t(b8), 9) * 0.5, 0.1)
stab(T_CHORD, "G", 1.05)
put("cel", T_CHORD, celesta(91) * 1.0, -0.1)
put("glk", T_CHORD, glock(103) * 0.5, 0.3)
put("jng", T_CHORD, jingle(5) * 1.2, 0.2)
pad_span(T_CHORD, TOTAL, "G", 0.9, lo=55, size=5, att=0.08, rel=FADE_OUT, bright=0.6, seed=300)
for i, nm in enumerate(("G6", "B6", "D7", "G7")):          # искорки на последнем аккорде
    put("glk", T_CHORD + 0.35 + 0.09 * i, glock(midi(nm)) * 0.3, -0.4 + 0.25 * i)
mark("final_stab", T_STAB)
mark("fin_theme", GF.t(2))
mark("last_chord", T_CHORD)

# капли-пиццикато: с дождём на обложке и до «перестал»; снежинки — с «пушок» до рассвета
g_dr = rgen("drops")
dens = lambda t: 0.3 if t < SB[1] else (0.24 if t < SB[2] else 0.26)
for (a_, b_) in ((RAIN0, SB[1]), (SB[1], SB[2]), (SB[2], T_STOP + 0.45)):
    drops(a_, b_, dens(a_), G_of, ch_of, g_dr, ramp=(RAIN0, RAIN1), stop=(T_STOP - 0.2, T_STOP + 0.4))
mark("rain_drops", RAIN0)
flakes(T_SNOW - 0.1, T_SUN - 0.25, ch_of, rgen("flakes"), vel=0.42)


# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=6500, pre=0.015):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60) * np.minimum(1, t / 0.008)
    ir = eq(ir, bq("lp", lp, 0.6), bq("hp", 220, 0.6))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = p2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


BUS["bass"] = eq(BUS["bass"], bq("lp", 1400, 0.6), bq("hp", 36, 0.7))
BUS["pizz"] = eq(BUS["pizz"], bq("hp", 150, 0.7), bq("lp", 9000, 0.6))
BUS["drop"] = eq(BUS["drop"], bq("hp", 380, 0.7), bq("lp", 11000, 0.7))
BUS["cel"] = eq(BUS["cel"], bq("hp", 240, 0.7), bq("lp", 12000, 0.7))
BUS["glk"] = eq(BUS["glk"], bq("hp", 650, 0.7))
BUS["jng"] = eq(BUS["jng"], bq("hp", 2600, 0.7))
BUS["drm"] = eq(BUS["drm"], bq("hp", 36, 0.7), bq("lp", 12500, 0.7))
BUS["pad"] = eq(BUS["pad"], bq("lp", 3200, 0.6), bq("hp", 110, 0.7))
IR_M = [make_ir(1.7, 2.6, 21), make_ir(1.7, 2.6, 22)]
WET = 0.28
send = sum(BUS_SEND[k] * BUS_G[k] * 0.5 * (BUS[k][0].astype(np.float64) + BUS[k][1]) for k in BUSES)
music = sum(BUS[k].astype(np.float64) * BUS_G[k] for k in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
del send
music = eq(music, bq("hp", 32, 0.7))

# ---------- голос: уровни строк ----------
SPEECH = [(L(i), E(i)) for i in range(1, NL + 1)]
tN = np.arange(N) / SR
ACT = np.zeros(N)                          # 1 — идёт строка (с запасом и плавными краями)
for a_, b_ in SPEECH:
    i0, i1 = max(0, int((a_ - 0.35) * SR)), min(N, int((b_ + 0.3) * SR))
    seg = tN[i0:i1]
    ACT[i0:i1] = np.maximum(ACT[i0:i1], np.clip(np.minimum((seg - (a_ - 0.18)) / 0.1, ((b_ + 0.15) - seg) / 0.1), 0, 1))


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


def s_tuk(seed):
    """капля стучит по стеклу: «тук» (моды стекла, глухой щелчок, брызги) и тихий второй «тук»"""
    g = rgen("tuk", seed)
    n = int(0.45 * SR)
    t = tt(n)

    def one(sc):
        sp = [(1850 * sc, 1.0, 0.045), (2950 * sc, 0.6, 0.03), (4400 * sc, 0.4, 0.02), (6100 * sc, 0.2, 0.012),
              (520 * sc, 0.8, 0.018)]
        y = partials(n, sp, att=0.0004, phase_key=("tuk", seed, sc))
        return y + 0.5 * bandn(n, 2500, 9000, g) * np.exp(-t / 0.012)

    y = one(g.uniform(0.95, 1.06))
    d = int(0.17 * SR)
    y[d:] += 0.5 * one(g.uniform(1.04, 1.12))[:n - d]
    return y / np.max(np.abs(y))


def s_wind(dur, t_pk, seed):
    """«ФЬЮ-У-У»: холодный ветер с посвистом, нарастает к пику и стихает, уходит слева направо"""
    g = rgen("wind", seed)
    n = int(dur * SR)
    t = tt(n)
    env = swell(t, t_pk, t_pk, 0.55)
    base = bandn(n, 160, 1500, g) * (1 + 0.35 * slow(n, 3, g))
    fc = lambda tc: np.where(tc < t_pk, 600 + 900 * (tc / t_pk) ** 1.5, 1500 - 800 * np.clip((tc - t_pk) / 1.0, 0, 1))
    whistle = sweep_noise(n, fc, 0.16, g)
    y = (0.6 * base + 0.8 * whistle) * env
    return fade_tail(np.stack(pan_gains(np.linspace(-0.45, 0.45, n))) * y, 0.2)


def s_bom():
    """бой часов: колокол соль (гул, прима, малая терция, квинта, октава…), удар молотка"""
    f0 = 196.0
    sp = [(0.5 * f0, 0.5, 1.6), (f0, 1.0, 1.2), (f0 * 1.003, 0.35, 1.2), (1.19 * f0, 0.45, 0.9), (1.5 * f0, 0.25, 0.7),
          (2.0 * f0, 0.5, 0.6), (2.0 * f0 * 1.002, 0.2, 0.6), (2.52 * f0, 0.2, 0.35), (3.0 * f0, 0.15, 0.25),
          (4.1 * f0, 0.1, 0.15), (5.4 * f0, 0.06, 0.1)]
    n = int(2.6 * SR)
    y = partials(n, sp, att=0.001, phase_key="bom")
    ns = int(0.02 * SR)
    y[:ns] += 0.5 * bandn(ns, 300, 4000, rgen("bomh")) * np.exp(-tt(ns) / 0.004)
    return fade_tail(y / np.max(np.abs(y)), 0.2)


def s_dzin():
    """«ДЗИНЬ!» солнца: короткий взлёт-«дз», яркий звон соль-си-ре с переливом и искристый шорох"""
    g = rgen("dzin")
    n = int(2.2 * SR)
    t = tt(n)
    pre = int(0.06 * SR)
    y = np.zeros(n)
    y[:pre] += 0.25 * bandn(pre, 3000, 9000, g) * np.linspace(0, 1, pre) ** 2
    ring = np.zeros(n - pre)
    for f, a in ((1568.0, 1.0), (1975.5, 0.55), (2349.3, 0.5)):
        ring += partials(n - pre, [(f, a, 0.9), (2.76 * f, 0.3 * a, 0.25), (5.4 * f, 0.1 * a, 0.08)], att=0.0005,
                         phase_key=("dz", f))
    ring *= 1 + 0.25 * np.sin(2 * np.pi * 9 * tt(n - pre))
    ring += 0.18 * bandn(n - pre, 7000, 14000, g) * np.exp(-tt(n - pre) / 0.25)
    y[pre:] += ring
    return fade_tail(np.stack(pan_gains(np.full(n, 0.05))) * (y / np.max(np.abs(y))), 0.1)


def s_puff():
    """«ПУФ!» — облачко сдувает: мягкий шумовой выдох, полоса уходит вниз"""
    g = rgen("puff")
    n = int(0.6 * SR)
    t = tt(n)
    y = sweep_noise(n, lambda tc: 1100 - 700 * np.clip(tc / 0.35, 0, 1), 0.9, g) * swell(t, 0.03, 0.03, 0.12)
    y += 0.3 * np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.06) * np.minimum(1, t / 0.005)
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def s_crunch(spread):
    """«ХРУСТЬ!» — река замерзает: треск, хруст, скрип льда, «пиу» ледяного поля и треск, бегущий по льду"""
    g = rgen("crunch")
    n = int((spread + 0.9) * SR)
    t = tt(n)
    y = np.zeros((2, n))
    for i, dt in enumerate((0.0, 0.012, 0.031)):             # главный треск — три щелчка
        i0 = int(dt * SR)
        m = int(0.03 * SR)
        c = bandn(m, 1500, 10000, g) * np.exp(-tt(m) / 0.004) * (1.0, 0.7, 0.55)[i]
        y[:, i0:i0 + m] += stereo(c, g.uniform(-0.3, 0.3))
    m = int(0.28 * SR)                                       # хруст — частые мелкие зёрна
    for _ in range(70):
        i0 = int(g.uniform(0, 0.25) ** 1.6 * SR)
        k = int(g.uniform(0.001, 0.005) * SR)
        if i0 + k < m:
            gr = bandn(k, 2000, 12000, g) * np.hanning(k) * g.uniform(0.15, 0.5) * (1 - i0 / m)
            y[:, i0:i0 + k] += stereo(gr, g.uniform(-0.6, 0.6))
    m = int(0.8 * SR)                                        # скрип: низкий тон 115 → 80 Гц с шероховатостью
    cr = glide(lambda t: 115 - 35 * np.clip(t / 0.5, 0, 1), m) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt(m)))
    y[:, :m] += stereo(0.45 * cr * np.exp(-tt(m) / 0.22) * np.minimum(1, tt(m) / 0.01), -0.1)
    m = int(0.6 * SR)                                        # «пиу» ледяного поля
    pew = glide(lambda t: 900 + 1700 * np.exp(-t / 0.12), m) * np.exp(-tt(m) / 0.18) * np.minimum(1, tt(m) / 0.003)
    y[:, int(0.02 * SR):int(0.02 * SR) + m] += stereo(0.22 * pew, 0.2)
    t_c = 0.25                                               # треск бежит по льду до конца «реки»
    while t_c < spread:
        k = int(g.uniform(0.001, 0.004) * SR)
        i0 = int(t_c * SR)
        a = 0.35 * (1 - 0.7 * t_c / spread) * g.uniform(0.4, 1.0)
        y[:, i0:i0 + k] += stereo(bandn(k, 1800, 11000, g) * np.hanning(k) * a, g.uniform(-0.7, 0.7))
        t_c += g.exponential(1 / 22)
    return fade_tail(y / np.max(np.abs(y)), 0.1)


def s_spark(count, spread, seed, bright=1.0):
    """искорки снега: мелкие высокие неровные «тинь», первая — самая громкая"""
    g = rgen("spark", seed)
    n = int((spread + 0.8) * SR)
    y = np.zeros((2, n))
    for i in range(count):
        t0 = 0.0 if i == 0 else g.uniform(0.04, spread)
        f = g.uniform(4200, 9000) * bright ** 0.3
        tau = g.uniform(0.08, 0.2)
        m = int(min(n - int(t0 * SR), 6 * tau * SR))
        p = partials(m, [(f, 1.0, tau), (f * g.uniform(2.2, 2.5), 0.3, tau * 0.5)], att=0.0005, phase_key=("sp", seed, i))
        y[:, int(t0 * SR):int(t0 * SR) + m] += stereo(p * (1.0 if i == 0 else g.uniform(0.3, 0.75)), g.uniform(-0.7, 0.7))
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def s_gleam():
    """капли загораются алмазами: мягкое нарастающее мерцание к пику"""
    g = rgen("gleam")
    n = int(1.2 * SR)
    t = tt(n)
    sh = np.zeros(n)
    for f in (3520.0, 4186.0, 4699.0, 5274.0):
        sh += np.sin(2 * np.pi * f * t + g.uniform(0, 6)) * (1 + 0.6 * np.sin(2 * np.pi * g.uniform(7, 13) * t))
    y = sh * swell(t, 0.4, 0.4, 0.3) + 0.3 * bandn(n, 7000, 14000, g) * swell(t, 0.4, 0.4, 0.15)
    return fade_tail(np.stack(pan_gains(np.linspace(-0.3, 0.3, n))) * (y / np.max(np.abs(y))), 0.05)


def s_blesk():
    """«БЛЕСК!» — быстрый звонкий взлёт четырёх «тинь» и искристый шорох"""
    g = rgen("blesk")
    n = int(1.3 * SR)
    y = np.zeros((2, n))
    for i, f in enumerate((3136.0, 3951.1, 4698.6, 6271.9)):
        i0 = int(0.028 * i * SR)
        p = partials(n - i0, [(f, 1.0, 0.35), (2.76 * f, 0.2, 0.08)], att=0.0004, phase_key=("bl", i))
        y[:, i0:] += stereo(p * (0.6 + 0.13 * i), -0.3 + 0.2 * i)
    y += stereo(0.25 * bandn(n, 8000, 15000, g) * np.exp(-tt(n) / 0.18) * np.minimum(1, tt(n) / 0.08), 0.1)
    return fade_tail(y / np.max(np.abs(y)), 0.05)


def s_fly(dur, t_pk):
    """свист полёта Зимы: шум и свист растут вверх к пику (прилёт), потом быстро стихают; летит сверху к центру"""
    g = rgen("fly")
    n = int(dur * SR)
    t = tt(n)
    env = swell(t, t_pk, t_pk, 0.22)
    fc = lambda tc: np.where(tc < t_pk, 380 + 1900 * (tc / t_pk) ** 2, 2280 - 1500 * np.clip((tc - t_pk) / 0.5, 0, 1))
    y = sweep_noise(n, fc, 0.8, g) * env * (1 + 0.2 * np.sin(2 * np.pi * 14 * t))   # плащ хлопает
    wf = lambda tt_: np.where(tt_ < t_pk, 700 + 950 * (tt_ / t_pk) ** 2, 1650 - 700 * np.clip((tt_ - t_pk) / 0.5, 0, 1))
    y += 0.3 * glide(wf, n) * env ** 1.5
    return fade_tail(np.stack(pan_gains(0.25 * np.cos(np.pi * np.clip(t / t_pk, 0, 1)) - 0.05)) * y, 0.15)


def s_loop():
    """«ВЖУХ» петли: быстрый свист вверх-вниз, по кругу слева направо и обратно"""
    g = rgen("loop")
    n = int(1.2 * SR)
    t = tt(n)
    t_pk = 0.5
    env = swell(t, t_pk, 0.42, 0.18)
    fc = lambda tc: 500 + 2200 * np.exp(-0.5 * ((tc - t_pk) / 0.17) ** 2)
    y = sweep_noise(n, fc, 0.7, g) * env
    y += 0.22 * glide(lambda tt_: 800 + 900 * np.exp(-0.5 * ((tt_ - t_pk) / 0.17) ** 2), n) * env ** 1.5
    return fade_tail(np.stack(pan_gains(0.63 * np.sin(2 * np.pi * (t - t_pk) / 1.2 + np.pi / 2))) * y, 0.15)


def s_ray(tail):
    """«ВЖУХ!» ледяного луча: резкий взлёт шума и стеклянного свиста, потом звенящий хрустальный хвост (мост растёт)"""
    g = rgen("ray")
    n = int((0.5 + tail + 0.6) * SR)
    t = tt(n)
    t_pk = 0.18
    zap = sweep_noise(n, lambda tc: 1400 + 6000 * np.clip(tc / t_pk, 0, 1) ** 1.2, 0.55, g) * swell(t, t_pk, t_pk, 0.12)
    gl = glide(lambda tt_: 900 * 4 ** np.clip(tt_ / 0.25, 0, 1), n) * swell(t, t_pk, t_pk, 0.2) * 0.35
    cry = np.zeros(n)
    for f in (2637.0, 3136.0, 3951.1, 4698.6):
        cry += np.sin(2 * np.pi * f * t + g.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * g.uniform(9, 13) * t))
    ce = np.clip((t - 0.12) / 0.1, 0, 1) * np.exp(-np.maximum(t - 0.2, 0) / max(0.3, 0.45 * tail))
    y = zap + gl + 0.12 * cry * ce
    t_c = 0.3                                               # звенят ледяные искры, пока растёт мост
    while t_c < 0.3 + tail:
        m = int(0.25 * SR)
        i0 = int(t_c * SR)
        if i0 + m < n:
            y[i0:i0 + m] += 0.2 * partials(m, [(g.uniform(3500, 8000), 1.0, 0.06)], att=0.0004, phase_key=("ry", t_c))
        t_c += g.uniform(0.07, 0.16)
    return fade_tail(np.stack(pan_gains(np.clip(-0.6 + 1.2 * t / (0.3 + tail), -0.6, 0.6))) * y, 0.2)


def s_gust(dur, t_pk, tail_end):
    """«ФУ-У-УХ!» — порыв жгучего холода: мощный нарастающий шум, полоса вверх к пику, потом долгий гул метели"""
    g = rgen("gust")
    n = int(dur * SR)
    t = tt(n)
    fc = lambda tc: np.where(tc < t_pk, 300 + 900 * (tc / t_pk) ** 1.5, 1200 - 750 * np.clip((tc - t_pk) / 1.2, 0, 1))
    y = sweep_noise(n, fc, 1.3, g)
    env = swell(t, t_pk, t_pk, 0.5)
    tail = 0.3 * np.clip((t - t_pk) / 0.4, 0, 1) * np.cos(0.5 * np.pi * np.clip((t - t_pk) / (tail_end - t_pk), 0, 1)) ** 2
    y *= np.maximum(env, tail) * (1 + 0.3 * slow(n, 2.5, g))
    y += 0.4 * bandn(n, 50, 220, g) * swell(t, t_pk, t_pk, 0.6)
    return fade_tail(np.stack(pan_gains(np.clip(-0.5 + 0.8 * t / (t_pk + 0.6), -0.5, 0.3))) * y, 0.3)


# капли по стеклу (../video/src/scenes1.js: «ТУК!» на stekla и stuchal)
for i, key in enumerate(("stekla", "stuchal"), 1):
    te = W(key, L(2) + (0.3 if i == 1 else 1.6))
    hit(f"tuk{i}", "капля стучит в стекло («ТУК!»), второй тихий «тук» следом", te, s_tuk(i), send=0.12)
# холодный ветер (вейал — тучи дуют, «ФЬЮ-У-У!» на холод)
T_VE = W("veyal", L(5))
T_HO = W("holod", T_VE + 0.75)
w0 = T_VE - 0.25
pk = T_HO + FRAME - w0
place("wind", "тучи дуют холодом в лицо («ФЬЮ-У-У!»)", T_HO, w0, s_wind(pk + 1.6, pk, 1), peak=T_HO + FRAME,
      t_end=T_HO + 1.4, send=0.15)
# часы бьют полдень
hit("bom", "часы на стене бьют полдень («БОМ!»), стрелки дрожат", W("polden", L(9) + 0.35), s_bom(), send=0.25)
# солнце и облачко
hit("dzin", "солнце взрывается лучами («ДЗИНЬ!»)", T_SUN, s_dzin(), send=0.25)
hit("puff", "последнее облачко сдувает («ПУФ!»)", W("oblachka", L(14) + 1.1), s_puff(), send=0.1)
# лёд
T_ICE = W("zamerzla", L(16) + 0.4)
T_REKA = W("reka", T_ICE + 1.1)
hit("crunch", "река замерзает («ХРУСТЬ!»), трещинки бегут по льду", T_ICE, s_crunch(T_REKA + 0.4 - T_ICE),
    send=0.15, t_end=T_REKA + 0.4)
# искры снега и алмазы на берёзе
hit("spark1", "снег на крышах вспыхивает искрами", W("blestit", L(19)), s_spark(5, 0.6, 1), send=0.3)
hit("spark2", "искры разноцветные — ярче и чаще", W("raznocv", L(20)), s_spark(8, 0.9, 2, 1.2), send=0.3)
T_ALM = W("almazy", L(27) + 0.4)
hit("gleam", "капли на берёзе загораются алмазами", T_ALM, s_gleam(), send=0.3, pk=0.4)
hit("blesk", "алмазы вспыхивают («БЛЕСК!»)", W("goryat", T_ALM + 1.1), s_blesk(), send=0.3)
# Зима прилетает (влетает сверху с L29 − 0,7 с), петля, ледяной луч, порыв холода
T_ZD = W("zdrav", L(29))
f0_ = min(T_ZD, L(29)) - 0.75
pk = T_ZD + FRAME - f0_
place("fly", "Зима влетает сверху супергероиней (свист полёта)", T_ZD, f0_, s_fly(pk + 0.9, pk), peak=T_ZD + FRAME,
      send=0.2)
hit("loop", "Зима делает петлю над полем («ВЖУХ!»)", W("gulyai", L(34) + 0.5), s_loop(), send=0.2, pk=0.5)
T_MO = W("mosty", L(35) + 0.3)
T_RK = W("rekam", T_MO + 1.1)
hit("ray", "ледяной луч строит мост через реку («ВЖУХ!»), мост растёт со звоном", T_MO, s_ray(T_RK + 0.5 - T_MO),
    send=0.25, pk=0.18, t_end=T_RK + 0.5)
t_g0 = T_GUST - 0.45
tail_end = max(W("vse", L(38)) + 0.8, T_GUST + 1.6) - t_g0
place("gust", "Зима дует жгучим холодом («ФУ-У-УХ!»), деда заносит снегом", T_GUST, t_g0,
      s_gust(tail_end + 0.2, 0.45 + FRAME, tail_end), peak=T_GUST + FRAME, t_end=t_g0 + tail_end, send=0.12)

IR_S = [make_ir(1.4, 2.0, 31, lp=6000), make_ir(1.4, 2.0, 32, lp=6000)]
for ch in (0, 1):
    SFX[ch] += 0.35 * convolve(SFX_SEND, IR_S[ch])
del SFX_SEND

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
SCH = [SFX[0], SFX[1]]
STANZA_OF = lambda i: (i - 1) // 4 + 1


def line_gain(i, w):
    pv, pm, ps = VPOW[i - 1], pw(MCH, [w]), pw(SCH, [w])
    tgt = pv * db(ST_DB[STANZA_OF(i)]) ** 2             # музыка + шумы
    lo, hi = pv * db(MUS_LIM[0]) ** 2, pv * db(MUS_LIM[1]) ** 2
    pm_t = float(np.clip(tgt - ps, lo, hi))
    return np.sqrt(pm_t / max(pm, 1e-20))


lineG = [line_gain(i, SPEECH[i - 1]) for i in range(1, NL + 1)]
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(pw(MCH, wins), 1e-20))
W_INTRO = [(0.15, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.1, FIN - 0.05)]
W_FIN = [(FIN, TOTAL - FADE_OUT)]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0.0), (FADE_IN, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
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
                "попадает). music — ключевые моменты музыки, levels — уровни. Без voice.mp3 уровни считаются к оценке "
                "голоса (levels.voice) — после озвучки пересчитай: python3 make_music.py",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN, "voice": HAS_VOICE, "vref_db": f1(VREF_ACT),
        "events_crc": EV_CRC, "shift": r3(SHIFT),
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"события: events.json (сдвиг {SHIFT:+.3f} с); вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print("голос: " + ("voice.mp3 — уровни по настоящему голосу" if HAS_VOICE else
                   f"НЕТ voice.mp3 — уровни по оценке голоса {VREF_DB} dBFS; после озвучки пересчитай этой же командой"))
print("темп ♩ по строфам: " + " ".join(f"{k + 1}:{bpm(GS[k]):.0f}({NB[k]}т)" for k in range(10))
      + f"; вступление {nI} долей ♩{60 / GI.blen():.0f}; финал «{fin_kind}» ♩{60 / bl:.0f}, последний аккорд {T_CHORD:.2f} с")
print("гармония: " + " | ".join(f"{k}: " + " ".join(PR[k]) for k in range(1, 11)))
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строфам, музыка без шумов | с шумами (дБ к голосу строф): "
      + " ".join(f"{s}:{per_st[s]}|{per_st_all[s]}" for s in per_st))
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
for k0 in range(0, NL, 10):
    print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in list(per_line)[k0:k0 + 10]))
print(f"вступление {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступл.": [(0.15, L(1))], "с1": [(SB[0], SB[1])], "с2": [(SB[1], SB[2])], "с3": [(SB[2], SB[3])],
       "с4": [(SB[3], SB[4])], "с5": [(SB[4], SB[5])], "с6": [(SB[5], SB[6])], "с7": [(SB[6], SB[7])],
       "с8": [(SB[7], SB[8])], "с9": [(SB[8], SB[9])], "с10": [(SB[9], B_END)], "финал": [(B_END, TOTAL)]}
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
    print(f"  {r['name']:7s} {r['start']:7.3f}…{r['end']:7.3f}  пик {r.get('peak', 0):7.3f}  громче всего {r['t_loudest']:7.3f}"
          f"  db {r['db']:4d}  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
for w_ in WARN:
    print("ВНИМАНИЕ:", w_)
print(f"время синтеза: {time.time() - T_START:.1f} с")
