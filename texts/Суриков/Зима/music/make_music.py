#!/usr/bin/env python3
"""Музыка и шумы к стиху И. З. Сурикова «Зима», стиль «Осада избы: tower defense» — настольная игра из расписных
деревянных фишек: Зима волнами захватывает поле, крестьянин и ребятишки защищают избу, Вьюга и Метель штурмуют её и
отскакивают, Мороз уходит, игра пишет «Изба устояла!».

Своя музыка: мелодии и гармония свои, ни на какую известную песню или плясовую не опираются.
Инструменты — синтез (numpy):
  балалайка/домра — щипок (аддитивная струна: позиция щипка у подставки, затухание верхних обертонов, призвук медиатора,
    резонанс корпуса) и тремоло (частые щипки по длинной ноте) — напев (шина mel);
  балалайка-секунда — короткое бряцание аккордов (шина sec); тремоло аккордов — подклад (шина pad);
  балалайка-контрабас — бас «ум-па» и тревожные восьмые (шина bass);
  ксилофон — напев, бегущие пассажи, искорки (шина xyl); деревянные коробочки (wood block) — «тик-так» (шина wood);
  бубен — встряхивания и удары (шина tamb); барабаны (рамочный, большой, том) — тревога и атака (шина drum).
План (секунды ролика из events.json; строки — из ../timings.json со сдвигом на вступление):
  0 … L1      вступление: на каждый стук фишки при раскладке поля — нота ксилофона вверх по ре мажору; табличка
              упала (thump) — аккорд ре мажора с бубном и тремоло; «СТАРТ» — разбег балалайки на сильную долю строфы 1;
  строфы 1–3  ре мажор, ♩≈113, 4/4: лёгкая «любопытная» тема ксилофона (падающие «снежинки», лидийская соль-диез),
              контрабас на 1 и 3, секунда на 2 и 4, коробочки; в паузе 1|2 — пассаж ксилофона вверх к восходу солнца;
              строфа 2 — напев переходит к балалайке, коробочки молчат (щёлкают клетки поля), бубен; строфа 3 — си минор,
              тёмный лес, балалайка на октаву ниже ксилофона; с «заснул» — колыбельная: только тремоло, бас и ксилофон,
              в конце — сонный спуск по F#7;
  строфа 4    тревога, си минор, ♩≈110: восьмые контрабаса с полутоном (си–до), часы «тик-так» на коробочках,
              «сердце» рамочного барабана, тремоло нарастает; дробь — УДАР на выход босса Мороза (bossLand: большой
              барабан, аккорд, бас), шаги миньонов — хроматический бас вверх, второй УДАР на «зима настала» (winter, D7),
              в паузе тремоло D7 нарастает и разбег балалайки на «ВАШ ХОД»;
  строфы 5–6  «ваш ход», соль мажор, ♩≈128, 2/4: деловитая полька — «ум-па», коробочки восьмыми, бубен на 2,
              щипковый напев стаккато, ксилофон вторит в паузе и в конце; в последних тактах дробь, B7 — к атаке;
  строфа 7    атака, ми минор, ♩≈152: бряцание восьмыми, бас восьмыми, большой барабан и том, бубен восьмыми,
              напористый напев домры, удары ксилофона на сильные доли, в конце дробь на B7;
  строфа 8    победная тема, соль мажор, ♩≈110: спокойно, тремоло балалайки; на топот Мороза — стоп-тайм (только
              тихое тремоло), Мороз уходит — ксилофон «уезжает» вниз, разбег к победе;
  финал       win — удар соль мажора (фанфары — шум win), победная тема громко (тремоло + ксилофон октавой выше, полька),
              каденция на соль, затем спокойно: тремоло соль мажора, тихие ноты ксилофона, затухание.
Громкость: под голосом музыка вместе с шумами на 18–20 дБ тише голоса (по каждой строке — по настоящему голосу),
громче во вступлении, в паузах между строфами и в финале; под голосом у музыки провал −3 дБ около 2,5 кГц, напевные
шины (mel, xyl) ещё на 2 дБ тише. Отладка уровней строк: MUSIC_DEBUG=1 python3 make_music.py.
Шумы (список sfx в events.json) — синтез, только с причиной в кадре, пик на кадр позже события, все тише голоса;
громкость — своя для шумов вне строк и под голосом (SFX_DB). Список и уровни — sfx.json.

Запуск: python3 make_music.py [--intro 4.0] [--outro 7.0] [--no-voice] [--voice ../voice.mp3] [--out music.wav]
        (при другом вступлении заставка растягивается, остальные события сдвигаются; короткий финал сокращает тему)
Проверка: --no-sfx / --only-sfx — без шумов / только шумы (уровни те же); MUSIC_MUTE=wood,tamb — без этих шин.
Читает ../timings.json (строки и длина голоса), events.json (события и шумы; время в шкале ролика) и ../voice.mp3
(через ffmpeg — уровни строк). Пишет music.wav (44,1 кГц, 16 бит, стерео, длина = вступление + голос + финал) и рядом
sfx.json (шумы, уровни, ключевые моменты). Нужны python3 + numpy, ffmpeg.
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
NL_EXPECT = 32

# ---------- уровни ----------
ST_DB = {1: -19.0, 2: -19.0, 3: -19.0, 4: -18.8, 5: -19.0, 6: -19.0, 7: -18.8, 8: -19.0}   # музыка + шумы
MUS_LIM = (-21.5, -18.3)   # музыка одна на строке не выходит из этих пределов (дБ к голосу строки)
ACCENT_DB = 1.5            # строка с ударом (босс, «зима настала») делится: от удара до конца строки на 1,5 дБ громче
INTRO_DB = -8.0            # вступление, к среднему голосу
GAP_DB = {4: -11.0, 8: -11.0, 12: -11.5, 16: -10.0, 20: -11.5, 24: -11.0, 28: -10.5}
GAP_CAP = 9.0              # пауза не громче соседних строк больше чем на 9 дБ
TAIL_DB = -8.5             # после голоса до fin, к среднему голосу
FIN_DB = -6.5              # финал
FADE_IN = 0.06
FADE_OUT = 1.8
DIP_DB = -3.0              # провал музыки около 2,5 кГц под голосом
MEL_DUCK_DB = -2.0         # напевные шины под голосом ещё тише
VREF_DB = -22.0            # оценка голоса без voice.mp3: RMS моно в строках, dBFS
K_OFS = 0.5
# шумы: самое громкое окно 100 мс (K-взвешенно, BS.1770), дБ к среднему голосу в местах речи:
# (вне строк, под голосом)
SFX_DB = {"clack": (-14, -19), "tick": (-17, -21), "flip": (-18, -23.5), "thump": (-12, -16), "boom": (-10, -15.5),
          "slam": (-11, -14), "click": (-13, -16), "slide": (-16, -18.5), "pop": (-16, -22), "straw": (-15, -18.5),
          "whoosh": (-14, -19), "hit": (-12, -18.5), "fanfare": (-8, -12)}
SFX_WHAT = {"clack": "деревянная фишка стукнула о доску", "tick": "лёгкий стук жетона", "flip": "щелчок переворота "
            "клетки", "thump": "глухой мягкий удар большой фишки", "boom": "тяжёлый удар, топот великана",
            "slam": "табличка хлопнула", "click": "кнопка", "slide": "санки проехали по снегу",
            "pop": "снежный ком лёг", "straw": "шорох-удар снопа соломы", "whoosh": "порыв ветра",
            "hit": "вихрь ударил в соломенную стену, снег рассыпался", "fanfare": "короткие победные фанфары"}
SFX_SEND = {"clack": 0.06, "tick": 0.06, "flip": 0.04, "thump": 0.08, "boom": 0.12, "slam": 0.1, "click": 0.04,
            "slide": 0.06, "pop": 0.05, "straw": 0.06, "whoosh": 0.15, "hit": 0.1, "fanfare": 0.3}

# ---------- аргументы, строки и события ----------
ap = argparse.ArgumentParser(description="музыка и шумы к «Зиме» Сурикова")
ap.add_argument("--intro", type=float, default=4.0, help="вступление до голоса, с (V0), по умолчанию 4.0")
ap.add_argument("--outro", type=float, default=7.0, help="финал после голоса, с, по умолчанию 7.0")
ap.add_argument("--no-voice", action="store_true", help="не читать ../voice.mp3: уровни по оценке голоса")
ap.add_argument("--voice", default=os.path.join(POEM, "voice.mp3"), help="голос (по умолчанию ../voice.mp3)")
ap.add_argument("--timings", default=os.path.join(POEM, "timings.json"), help="строки (по умолчанию ../timings.json)")
ap.add_argument("--events", default=os.path.join(HERE, "events.json"), help="события (по умолчанию events.json рядом)")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV (sfx.json — рядом)")
ap.add_argument("--no-sfx", action="store_true", help="для проверки: без шумов (уровни музыки считаются как с ними)")
ap.add_argument("--only-sfx", action="store_true", help="для проверки: только шумы")
args = ap.parse_args()
for p_ in (args.timings, args.events):
    if not os.path.exists(p_):
        sys.exit(f"нет {p_} — сначала озвучка (timings.json) и сборка ролика (../video/build.py → events.json)")
with open(args.events, "rb") as f:
    EV_BYTES = f.read()
RAW = json.loads(EV_BYTES.decode("utf-8"))
EV_CRC = f"{zlib.crc32(EV_BYTES):08x}"
with open(args.timings, encoding="utf-8") as f:
    TJ = json.load(f)

r3 = lambda x: round(float(x), 3)
V0 = float(args.intro)
OUTRO = float(args.outro)
if V0 < 1.5:
    sys.exit("вступление короче 1,5 с: разбегу не хватит места")
if OUTRO < 4.0:
    sys.exit("финал короче 4 с: победная тема не поместится")
V0R = float(RAW.get("V0", V0))
SHIFT = V0 - V0R
VD = float(TJ["voiceDuration"])
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
WARN = []


def mapt(t):
    """время из events.json → в ролик с этим вступлением: заставка растягивается, остальное сдвигается"""
    t = float(t)
    return r3(t * V0 / V0R) if t < V0R else r3(t + SHIFT)


EV = {k: mapt(v) for k, v in RAW.items() if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total")}
LINES = TJ["lines"]
NL = len(LINES)
if NL != NL_EXPECT:
    sys.exit(f"ожидалось {NL_EXPECT} строк, в timings.json {NL}")
LT = [r3(l["start"] + V0) for l in LINES]
ET = [r3(l["end"] + V0) for l in LINES]
L = lambda n: LT[n - 1]
E = lambda n: ET[n - 1]
for i in range(1, NL + 1):
    if not (L(i) < E(i) and (i == NL or E(i) <= L(i + 1) + 0.05)):
        sys.exit(f"timings.json: строка {i} — начало/конец не по порядку")
bad = [i for i in range(1, NL + 1) if f"L{i}" in EV and (abs(EV[f"L{i}"] - L(i)) > 0.03 or abs(EV[f"E{i}"] - E(i)) > 0.03)]
if bad:
    WARN.append(f"строки {bad[:5]} в events.json не совпадают с timings.json — пересобери ролик (build.py)")
if abs(float(RAW.get("total", TOTAL)) + SHIFT + OUTRO - float(RAW.get("OUTRO", OUTRO)) - TOTAL) > 0.02:
    WARN.append(f"total в events.json ({RAW.get('total')}) не равен вступлению + голосу + финалу ({TOTAL})")
SFX_EV = sorted((mapt(s["t"]), s["kind"]) for s in RAW.get("sfx", []))
if not SFX_EV:
    WARN.append("в events.json нет списка sfx — шумов не будет")


def W(key, fallback):
    """время события; если ключа нет — запасное время и предупреждение"""
    if key in EV:
        return EV[key]
    WARN.append(f"нет события {key} в events.json — беру {fallback:.2f} с")
    return r3(fallback)


FIN = W("fin", E(NL) + 1.6)
if FIN > TOTAL - 3.0:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


# ---------- голос ----------
HAS_VOICE = os.path.exists(args.voice) and not args.no_voice
vfull = None
if HAS_VOICE:
    rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", args.voice, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                          capture_output=True, check=True).stdout
    voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
    if abs(len(voice) / SR - VD) > 0.05:
        WARN.append(f"voice.mp3 {len(voice) / SR:.3f} с, а в timings.json {VD:.3f} с — пересчитай timings.json")
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
rng = np.random.default_rng(1880)
tN = np.arange(N) / SR


def rgen(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode("utf-8")))


def p2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def bq(kind, f0, q=0.707, gain_db=0.0):
    """биквад (RBJ): lp, hp, bp, peak"""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    c, s = np.cos(w), np.sin(w)
    al = s / (2 * q)
    if kind == "lp":
        b, a = [(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al]
    elif kind == "hp":
        b, a = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]
    elif kind == "bp":
        b, a = [al, 0.0, -al], [1 + al, -2 * c, 1 - al]
    elif kind == "peak":
        b, a = [1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]
    else:
        raise ValueError(kind)
    return np.array(b) / a[0], np.array(a) / a[0]


def eq(x, *fs):
    """каскад биквадов через FFT (комплексная характеристика — фаза как у настоящего фильтра)"""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[-1]
    nf = p2(n + 8192)
    z = np.exp(-2j * np.pi * np.fft.rfftfreq(nf))
    H = np.ones(len(z), complex)
    for b, a in fs:
        H *= (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    return np.fft.irfft(np.fft.rfft(x, nf, axis=-1) * H, nf, axis=-1)[..., :n]


def kweight(x):
    """K-фильтр BS.1770 (амплитудная характеристика, через FFT)"""
    nf = p2(len(x) + 4096)
    fr = np.fft.rfftfreq(nf, 1 / SR)
    z = np.exp(-2j * np.pi * fr / SR)
    resp = lambda b, a: np.abs((b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z))
    K = np.tan(np.pi * 1681.974450955533 / SR)
    Q = 0.7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    H = resp([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
             [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0])
    K = np.tan(np.pi * 38.13547087602444 / SR)
    Q = 0.5003270373238773
    a0 = 1 + K / Q + K * K
    H *= resp([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0])
    return np.fft.irfft(np.fft.rfft(x, nf) * H, nf)[:len(x)]


def bandn(n, lo, hi, g):
    """шум в полосе lo…hi (мягкие края), RMS 1"""
    nf = p2(n)
    X = np.fft.rfft(g.standard_normal(nf))
    f = np.maximum(np.fft.rfftfreq(nf, 1 / SR), 1.0)
    X *= 1 / (1 + (lo / f) ** 4) / (1 + (f / hi) ** 4)
    y = np.fft.irfft(X, nf)[:n]
    return y / (np.std(y) + 1e-12)


def sweep_noise(n, fc_fn, bw_oct, g):
    """шум через подвижную полосу (центр fc_fn(t), ширина bw_oct октав), STFT; RMS 1"""
    nf, hop = 1024, 256
    x = g.standard_normal(n + 2 * nf)
    win = np.hanning(nf)
    nfr = (n + nf) // hop
    idx = np.arange(nf)[None, :] + hop * np.arange(nfr)[:, None]
    fr = np.fft.rfft(x[idx] * win, axis=1)
    f = np.maximum(np.fft.rfftfreq(nf, 1 / SR), 20.0)
    tc = (np.arange(nfr) * hop + nf / 2) / SR - nf / 2 / SR
    fc = np.maximum(np.asarray(fc_fn(tc), dtype=float), 30.0)[:, None]
    gain = np.exp(-0.5 * (np.log2(f[None, :] / fc) / bw_oct) ** 2)
    y_fr = np.fft.irfft(fr * gain, nf, axis=1) * win
    out = np.zeros(nfr * hop + nf)
    for k in range(nfr):
        out[k * hop:k * hop + nf] += y_fr[k]
    out = out[nf // 2:nf // 2 + n]
    return out / (np.std(out) + 1e-12)


def fade_tail(x, sec=0.02):
    x = np.array(x, dtype=np.float64)
    m = min(x.shape[-1], int(sec * SR))
    if m > 1:
        x[..., -m:] *= np.linspace(1, 0, m)
    return x


def pan_gains(p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)


def stereo(x, pan=0.0):
    if np.ndim(x) == 2:
        return np.asarray(x, dtype=np.float64)
    gl, gr = pan_gains(pan)
    return np.stack([gl * x, gr * x])


_CACHE = {}


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


# ---------- инструменты ----------
def string_tone(m, n, bright, tau1, pos, inh, g, decay=True):
    """аддитивная струна: амплитуды по месту щипка, верхние обертоны гаснут быстрее; пик ≈ 1"""
    f0 = hz(m)
    K = int(max(1, min(40, 10500 / f0)))
    k = np.arange(1, K + 1)
    fk = k * f0 * np.sqrt(1 + inh * k * k)
    keep = fk < 15000
    k, fk = k[keep], fk[keep]
    amp = (np.abs(np.sin(np.pi * k * pos)) + 0.03) / k ** (1.3 - 0.7 * bright)
    amp = amp * np.exp(0.12 * g.standard_normal(len(k)))
    t = tt(n)
    y = np.zeros(n)
    tau_s = tau1 * (330.0 / f0) ** 0.3
    for f, a in zip(fk, amp):
        ph = g.uniform(0, 2 * np.pi)
        if decay:
            tau = tau_s / (1 + (f / (1300 + 2600 * bright)) ** 1.7)
            m_ = min(n, int(tau * 8 * SR) + 1)
            y[:m_] += a * np.sin(2 * np.pi * f * t[:m_] + ph) * np.exp(-t[:m_] / tau)
        else:
            y += a * np.sin(2 * np.pi * f * t + ph)
    return y / (np.sum(amp) + 1e-9)


def pluck(m, dur, vel=1.0, bright=0.6, tau1=0.9, pos=0.13, damp=0.035, seed=0):
    """щипок балалайки/домры: dur — сколько держится нота (потом глушится ладонью за damp)"""
    key = ("pl", int(m), r3(dur), r3(bright), r3(tau1), r3(pos), r3(damp), seed % 3)

    def make():
        g = rgen(*key)
        f0 = hz(m)
        nat = tau1 * (330.0 / f0) ** 0.3 * 5
        n = int((min(dur + 6 * damp, nat) + 0.01) * SR)
        y = string_tone(m, n, bright, tau1, pos, 1.2e-4, g)
        t = tt(n)
        y *= np.minimum(1, t / 0.0008) * np.where(t < dur, 1.0, np.exp(-(t - dur) / damp))
        npk = int(0.004 * SR)
        pn = np.diff(g.standard_normal(npk) * np.exp(-tt(npk) / 0.0007), prepend=0.0)
        y[:npk] += 0.22 * bright * pn
        return fade_tail(y, 0.01)
    return cached(key, make) * vel


def tremolo(ms_, dur, vel=1.0, rate=12.5, bright=0.5, cresc=1.0, rel=0.1, seed=0):
    """тремоло домры/балалайки по ноте или аккорду: частые щипки вверх-вниз; cresc < 1 — нарастание от cresc до 1"""
    ms_ = tuple(int(m) for m in ms_)
    key = ("tr", ms_, r3(dur), r3(rate), r3(bright), r3(cresc), r3(rel), seed)

    def make():
        g = rgen(*key)
        n = int((dur + 5 * rel + 0.02) * SR)
        t = tt(n)
        soft = sum(string_tone(m, n, 0.2 + 0.3 * bright, 1.0, 0.22, 1e-4, g, decay=False) for m in ms_)
        brt = sum(string_tone(m, n, 0.6 + 0.4 * bright, 1.0, 0.11, 1e-4, g, decay=False) for m in ms_)
        times = [0.0]
        while times[-1] < dur - 0.6 / rate:
            times.append(times[-1] + (1 / rate) * (1 + 0.07 * g.standard_normal()))
        es, eb = np.zeros(n), np.zeros(n)
        bounds = times[1:] + [n / SR]
        for j, (a_, b_) in enumerate(zip(times, bounds)):
            i0, i1 = int(a_ * SR), min(n, int(b_ * SR))
            if i1 <= i0:
                continue
            s = t[i0:i1] - a_
            amp = (1.0 if j % 2 == 0 else 0.86) * np.exp(0.06 * g.standard_normal())
            es[i0:i1] = amp * (0.55 + 0.45 * np.exp(-s / 0.06))
            eb[i0:i1] = amp * np.exp(-s / 0.028)
        sm = np.ones(66) / 66                            # щипок нарастает за 1,5 мс, без щелчка
        es, eb = np.convolve(es, sm, "same"), np.convolve(eb, sm, "same")
        env = np.minimum(1, t / 0.002) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
        if cresc < 1.0:
            env *= cresc + (1 - cresc) * np.clip(t / max(dur, 0.05), 0, 1) ** 1.5
        y = (0.75 * soft * es + 0.45 * brt * eb) * env
        for a_ in times:                                 # призвук медиатора
            i0 = int(a_ * SR)
            m_ = min(n - i0, int(0.002 * SR))
            y[i0:i0 + m_] += 0.03 * bright * g.standard_normal(m_) * np.exp(-tt(m_) / 0.0005)
        return fade_tail(y / np.sqrt(len(ms_)), 0.02)
    return cached(key, make) * vel


def xylo(m, vel=1.0, seed=0):
    """ксилофон: основной тон, дуодецима (3:1), верхние моды, стук палочки"""
    key = ("xy", int(m), seed % 4)

    def make():
        g = rgen(*key)
        f0 = hz(m)
        tau1 = float(np.clip(0.42 * (700 / f0) ** 0.7, 0.08, 0.9))
        n = int(min(tau1 * 6, 3.0) * SR)
        t = tt(n)
        y = np.zeros(n)
        for r, a, k in ((1.0, 1.0, 1.0), (3.0, 0.3, 0.22), (5.95, 0.1, 0.09), (9.6, 0.04, 0.05)):
            f = f0 * r * (1 + 0.002 * g.standard_normal())
            if f > 16000:
                continue
            tau = tau1 * k
            m_ = min(n, int(tau * 8 * SR) + 1)
            y[:m_] += a * np.sin(2 * np.pi * f * t[:m_]) * np.exp(-t[:m_] / tau)
        npk = int(0.003 * SR)
        y[:npk] += 0.35 * np.diff(g.standard_normal(npk) * np.exp(-tt(npk) / 0.0006), prepend=0.0)
        y *= np.minimum(1, t / 0.0003)
        return fade_tail(y / 1.3, 0.01)
    return cached(key, make) * vel


def wood(f, vel=1.0, seed=0):
    """деревянная коробочка (wood block): полый тон с быстрым затуханием и стук"""
    key = ("wd", r3(f), seed % 4)

    def make():
        g = rgen(*key)
        n = int(0.13 * SR)
        t = tt(n)
        fr = f * (1 + 0.025 * np.exp(-t / 0.004))
        ph = 2 * np.pi * np.cumsum(fr) / SR
        y = np.sin(ph) * np.exp(-t / 0.03) + 0.45 * np.sin(1.62 * ph) * np.exp(-t / 0.018) \
            + 0.22 * np.sin(2.41 * ph) * np.exp(-t / 0.011)
        npk = int(0.003 * SR)
        y[:npk] += 0.5 * np.diff(g.standard_normal(npk) * np.exp(-tt(npk) / 0.0005), prepend=0.0)
        return fade_tail(y * np.minimum(1, t / 0.0003) / 1.4, 0.01)
    return cached(key, make) * vel


def tamb(kind="shake", vel=1.0, seed=0):
    """бубен: hit — удар по коже с бубенцами, shake — встряхивание"""
    key = ("tb", kind, seed % 5)

    def make():
        g = rgen(*key)
        hit = kind == "hit"
        n = int((0.38 if hit else 0.2) * SR)
        t = tt(n)
        y = np.zeros(n)
        for _ in range(16):
            f = g.uniform(4200, 11500)
            tau = g.uniform(0.04, 0.12) if hit else g.uniform(0.02, 0.06)
            d = int(g.uniform(0, 0.012 if hit else 0.03) * SR)
            m_ = min(n - d, int(tau * 7 * SR))
            y[d:d + m_] += g.uniform(0.3, 1.0) * np.sin(2 * np.pi * f * tt(m_) + g.uniform(0, 6.28)) \
                * np.exp(-tt(m_) / tau)
        y /= 6.0
        rise = 0.0008 if hit else 0.008
        y += 0.6 * bandn(n, 5000, 13000, g) * np.exp(-t / (0.07 if hit else 0.035)) * np.minimum(1, t / rise)
        if hit:
            y += 0.45 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * np.minimum(1, t / 0.001)
        return fade_tail(y * np.minimum(1, t / rise), 0.02)
    return cached(key, make) * vel


def thump(n, f0, f1, tau_f, tau, g=None):
    """глухой удар: синус с падающей частотой"""
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / tau_f)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.minimum(1, t / 0.0015)


def drum(kind, vel=1.0, seed=0):
    """барабаны: big — большой (удары), low — рамочный («сердце», атака), tom — том"""
    key = ("dr", kind, seed % 3)

    def make():
        g = rgen(*key)
        if kind == "big":
            n = int(0.9 * SR)
            t = tt(n)
            y = thump(n, 72, 42, 0.04, 0.42) + 0.5 * eq(g.standard_normal(n), bq("lp", 260)) * np.exp(-t / 0.06)
            y += 0.25 * eq(g.standard_normal(n), bq("lp", 2200)) * np.exp(-t / 0.003)
        elif kind == "low":
            n = int(0.5 * SR)
            t = tt(n)
            y = thump(n, 125, 80, 0.02, 0.2) + 0.45 * eq(g.standard_normal(n), bq("lp", 900)) * np.exp(-t / 0.025)
            y += 0.25 * bandn(n, 600, 2500, g) * np.exp(-t / 0.006)
        else:
            n = int(0.35 * SR)
            t = tt(n)
            y = thump(n, 175, 128, 0.015, 0.13) + 0.35 * eq(g.standard_normal(n), bq("lp", 1500)) * np.exp(-t / 0.02)
            y += 0.2 * bandn(n, 800, 4000, g) * np.exp(-t / 0.005)
        return fade_tail(np.tanh(1.2 * y) / np.tanh(1.2), 0.03)
    return cached(key, make) * vel


def brass(m, dur, vel=1.0, seed=0):
    """медь для фанфар: спектр светлеет на атаке, лёгкое вибрато, подъезд к ноте"""
    g = rgen("brass", int(m), r3(dur), seed)
    f0 = hz(m)
    n = int((dur + 0.2) * SR)
    t = tt(n)
    att = 0.025
    env = np.minimum(1, t / att) ** 1.5 * (0.8 + 0.2 * np.exp(-np.maximum(t - att, 0) / 0.08))
    env *= np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.06))
    brt = (0.35 + 0.65 * np.exp(-np.maximum(t - att, 0) / 0.12)) * np.minimum(1, t / att)
    vib = 1 + 0.0028 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.18) / 0.15, 0, 1)
    scoop = 1 - 0.012 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f0 * vib * scoop) / SR
    K = int(min(16, 9000 / f0))
    y = np.zeros(n)
    for k in range(1, K + 1):
        y += np.exp(-(k - 1) / (0.8 + 4.0 * brt)) * np.sin(k * ph + g.uniform(0, 0.4))
    y = y * env + 0.03 * bandn(n, 800, 3000, g) * env
    return fade_tail(y / np.sqrt(K) * vel, 0.03)


# ---------- ноты, аккорды ----------
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
QUAL = {"": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "dim": (0, 3, 6), "sus4": (0, 5, 7)}


def midi(s):
    i, acc = 1, 0
    while i < len(s) and s[i] in "#b":
        acc += 1 if s[i] == "#" else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + NOTE[s[0]] + acc


def chord(sym):
    i = 1
    acc = 0
    while i < len(sym) and sym[i] in "#b":
        acc += 1 if sym[i] == "#" else -1
        i += 1
    root = (NOTE[sym[0]] + acc) % 12
    return root, [(root + iv) % 12 for iv in QUAL[sym[i:]]]


def voicing(sym, lo, count=3):
    """тесное расположение аккорда от ноты lo вверх"""
    _, pcs = chord(sym)
    out, m = [], lo
    while len(out) < count:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def bass_of(sym, which="root"):
    root, _ = chord(sym)
    m = 36 + (root - 0) % 12
    if m > 47:
        m -= 12
    if which == "fifth":
        m5 = m + 7
        return m5 if m5 <= 50 else m5 - 12
    return m


def parse(txt):
    """«A5:.5 F#5:.5 -:1» → [(доля от начала, длина в долях, midi)], общая длина"""
    out, b = [], 0.0
    for tok in txt.split():
        p, d = tok.split(":")
        d = float(d)
        if p != "-":
            out.append((b, d, midi(p)))
        b += d
    return out, b


# ---------- шины ----------
BUSES = ["mel", "xyl", "sec", "pad", "bass", "wood", "tamb", "drum"]
BUS = {k: np.zeros((2, N), np.float32) for k in BUSES}
BUS_G = {"mel": 0.55, "xyl": 0.42, "sec": 0.50, "pad": 0.30, "bass": 0.55, "wood": 0.45, "tamb": 0.35, "drum": 0.38}
BUS_SEND = {"mel": 0.15, "xyl": 0.22, "sec": 0.08, "pad": 0.30, "bass": 0.0, "wood": 0.10, "tamb": 0.15, "drum": 0.07}
MELODIC = ("mel", "xyl")
COUNT = {k: 0 for k in BUSES}
PAN = {"mel": 0.18, "xyl": -0.28, "sec": 0.35, "pad": -0.1, "bass": 0.0, "wood": -0.4, "tamb": 0.38, "drum": 0.0}


def put(bus, t, x, pan=None, g=1.0):
    pan = PAN[bus] if pan is None else pan
    x = stereo(x, pan)
    i0 = int(round(t * SR))
    n = x.shape[1]
    j0, j1 = max(0, -i0), min(n, N - i0)
    if j1 <= j0:
        return
    BUS[bus][:, i0 + j0:i0 + j1] += (g * x[:, j0:j1]).astype(np.float32)
    COUNT[bus] += 1


def strum(sym, t, vel, dur, lo=62, count=3, up=False, bus="sec", spread=0.009, bright=0.55, pan=None):
    ns = voicing(sym, lo, count)
    order = ns[::-1] if up else ns
    for j, m in enumerate(order):
        put(bus, t + j * spread, pluck(m, dur, vel * (1 - 0.07 * j), bright=bright, tau1=0.8, seed=j), pan)


def bassn(m, t, vel, dur, octave=False):
    put("bass", t, pluck(m, dur, vel, bright=0.35, tau1=1.1, pos=0.2, damp=0.05))
    if octave:
        put("bass", t, pluck(m + 12, dur, 0.45 * vel, bright=0.4, tau1=0.9, pos=0.2, damp=0.05))


def wb(t, hi, vel):
    put("wood", t, wood(1250 if hi else 830, vel, seed=int(t * 100)), pan=-0.42 if hi else -0.3)


class Grid:
    def __init__(self, t0, b, n):
        self.t0, self.b, self.n = float(t0), float(b), int(n)

    def t(self, beat):
        return self.t0 + beat * self.b

    @property
    def end(self):
        return self.t(self.n)


def grid(t0, t1, n, ideal, name):
    b = (t1 - t0) / n
    if not 0.7 * ideal <= b <= 1.3 * ideal:
        WARN.append(f"{name}: доля {b:.3f} с (♩{60 / b:.0f}) далеко от задуманной {ideal:.3f} — проверь события")
    return Grid(t0, b, n)


def play_mel(G, b0, txt, ins="x", vel=1.0, oct_=0):
    """напев в сетке G с доли b0: x — ксилофон, b — щипок балалайки, t — тремоло, b8 — щипок октавой ниже"""
    notes, tot = parse(txt)
    for ob, d, m in notes:
        t = G.t(b0 + ob)
        v = vel * (1.0 if abs(ob - round(ob)) < 1e-6 else 0.85)
        m += oct_
        for k in ins.split("+"):
            if k == "x":
                put("xyl", t, xylo(m, v, seed=int(ob * 4)))
            elif k == "x8":
                put("xyl", t, xylo(m + 12, 0.7 * v, seed=int(ob * 4) + 1))
            elif k == "b":
                put("mel", t, pluck(m, min(d * G.b * 0.85, 0.9), v, bright=0.65, tau1=0.9, seed=int(ob * 2)))
            elif k == "b8":
                put("mel", t, pluck(m - 12, min(d * G.b * 0.9, 1.0), 0.7 * v, bright=0.5, tau1=1.0, seed=1))
            elif k == "bs":                         # стаккато
                put("mel", t, pluck(m, min(d * G.b * 0.55, 0.25), v, bright=0.7, tau1=0.7, damp=0.025,
                                    seed=int(ob * 2)))
            elif k == "t":
                put("mel", t, tremolo([m], d * G.b * 0.97, 0.8 * v, rate=13.0, bright=0.55, rel=0.07,
                                      seed=int(ob * 2) % 3))
    return tot


def chords_in_bar(chs, beats):
    chl = chs.split()
    seg = beats / len(chl)
    return [(i * seg, c) for i, c in enumerate(chl)], seg


def ch_at(chs, beats, ob):
    lst, seg = chords_in_bar(chs, beats)
    return lst[min(len(lst) - 1, int(ob // seg + 1e-9))][1]


# ---------- сетки разделов ----------
T_SP = W("startPress", V0 * 0.76)
A4 = L(13) - 0.1                                   # тревога (строфа 4) — с сильной доли за 0,1 с до строки 13
NB_A = 48
TA = (T_SP + FRAME + 2 * A4 / NB_A) / (1 + 2 / NB_A)  # разбег на «СТАРТ»: 2 доли до строфы 1
if not L(1) - 0.3 <= TA <= L(1) - 0.02:
    TA = L(1) - 0.06
GA = grid(TA, A4, NB_A, 0.53, "строфы 1–3")
T_BOSS = W("bossLand", L(15) + 0.75)
T_WINT = W("winter", L(16) + 0.45)
T_TURN = W("yourTurn", L(17) - 0.15)
GB = grid(A4, T_BOSS, 8, 0.546, "строфа 4")
T_ATT = W("attack", L(25) - 0.25)
GC = grid(T_TURN, T_ATT, 26, 0.468, "строфы 5–6")
A8 = L(29) - 0.1
GD = grid(T_ATT, A8, 16, 0.395, "строфа 7")
T_WIN = W("win", E(NL) + 0.4)
GE = grid(A8, T_WIN, 12, 0.544, "строфа 8")
GF = Grid(T_WIN, GE.b, int((TOTAL - T_WIN) / GE.b))
for k_, G_ in (("A", GA), ("B", GB), ("C", GC), ("D", GD), ("E", GE), ("F", GF)):
    mark(f"sec{k_}", G_.t0)

# ---------- вступление ----------
CL_INTRO = [t for t, k in SFX_EV if k == "clack" and t < V0 * 0.4]
T_TITLE = next((t for t, k in SFX_EV if k == "thump" and t < V0), W("titleDrop", V0 * 0.22) + 0.25)
up_notes = [69, 74, 78, 81, 86, 90, 93, 98]
for j, t in enumerate(CL_INTRO):                   # каждая фишка — нота ксилофона
    put("xyl", t + FRAME, xylo(up_notes[j % len(up_notes)], 0.45 + 0.08 * j, seed=j))
th = T_TITLE + FRAME                               # табличка упала: аккорд ре мажора
strum("D", th, 0.9, 0.6, lo=62, count=4, bright=0.65)
bassn(38, th, 0.9, 1.2)
put("tamb", th, tamb("hit", 0.7))
t_pad1 = T_SP - 0.05
put("pad", th + 0.02, tremolo([62, 66, 69], max(0.4, t_pad1 - th), 0.55, rate=12.0, bright=0.4, cresc=0.5, rel=0.12))
T_AUTH = W("authorIn", T_TITLE + 0.35)
T_STIN = W("startIn", T_TITLE + 1.05)
for j, m in enumerate((90, 88, 86)):              # подпись автора — рябь ксилофона
    put("xyl", T_AUTH + 0.05 + 0.13 * j, xylo(m, 0.4, seed=j))
for j, m in enumerate((81, 81)):                  # кнопка «СТАРТ» мигает
    put("xyl", T_STIN + 0.05 + 0.25 * j, xylo(m, 0.35, seed=j + 2))
play_mel(GA, -2, "A4:.5 B4:.5 C#5:.5 E5:.5", "b", vel=0.9)   # разбег от «СТАРТ»
wb(GA.t(-1), True, 0.5)
wb(GA.t(-0.5), False, 0.5)
mark("intro_run", GA.t(-2))

# ---------- строфы 1–3: ре мажор ----------
A_SCORE = [
    dict(ch="D", mel="A5:.5 F#5:.5 A5:.5 F#5:.5 E5:1 D5:1", ins="x"),
    dict(ch="D", mel="E5:.5 F#5:.5 G#5:.5 A5:.5 B5:1.5 -:.5", ins="x"),
    dict(ch="Em", mel="G5:.5 E5:.5 G5:.5 E5:.5 D5:1 B4:1", ins="x"),
    dict(ch="A7", mel="C#5:.5 E5:.5 A5:.5 G5:.5 F#5:1 E5:1", ins="x"),
    dict(ch="D", mel="D5:.5 E5:.5 F#5:.5 A5:.5 B5:.5 D6:.5 E6:.5 F#6:.5", ins="x", accent=True),   # к восходу
    dict(ch="G", mel="B5:.5 G5:.5 D5:.5 G5:.5 A5:1 B5:1", ins="b", nowood=True, tamb=True),
    dict(ch="Em A7", mel="G5:.5 E5:.5 B4:.5 E5:.5 C#5:.5 E5:.5 G5:1", ins="b", nowood=True, tamb=True),
    dict(ch="D", mel="F#5:.5 E5:.5 D5:1", mel2="D5:.5 E5:.5 F#5:.5 A5:.5", ins="b", nowood=True, tamb=True),
    dict(ch="Bm", mel="B5:1 F#5:.5 D5:.5 B4:1 D5:1", ins="x+b8", tamb=True),
    dict(ch="G", mel="G5:1 -:.5 B5:.5 D6:1 B5:1", ins="x+b8", tamb=True),
    dict(ch="Em", mel="B5:2 G5:2", ins="x", sleep=True),
    dict(ch="F#7", mel="F#5:2", mel2="C#6:.5 A#5:.5 F#5:.5 C#5:.5", ins="x", sleep=True),
]
for bi, bar in enumerate(A_SCORE):
    b0 = 4 * bi
    chs = bar["ch"]
    if bar.get("sleep"):
        play_mel(GA, b0, bar["mel"], bar["ins"], vel=0.6)
        if "mel2" in bar:
            play_mel(GA, b0 + 2, bar["mel2"], "x", vel=0.5)
        bassn(bass_of(chs), GA.t(b0), 0.7, 3.6 * GA.b if bi == 10 else 1.9 * GA.b)
        if bi == 11:
            bassn(bass_of(chs, "fifth") - 12 if bass_of(chs, "fifth") > 45 else bass_of(chs, "fifth"),
                  GA.t(b0 + 2), 0.55, 1.8 * GA.b)
        put("pad", GA.t(b0), tremolo(voicing(chs, 59 if bi == 10 else 58, 3), 3.95 * GA.b, 0.5, rate=11.0,
                                     bright=0.35, cresc=0.7 if bi == 10 else 1.0, rel=0.15, seed=bi))
        continue
    play_mel(GA, b0, bar["mel"], bar["ins"], vel=1.0)
    if "mel2" in bar:
        play_mel(GA, b0 + 2, bar["mel2"], "x+b", vel=0.95)
    lst, seg = chords_in_bar(chs, 4)
    bassn(bass_of(lst[0][1]), GA.t(b0), 0.9, 0.8 * GA.b)
    c2 = lst[1][1] if len(lst) > 1 else None
    bassn(bass_of(c2) if c2 else bass_of(chs, "fifth"), GA.t(b0 + 2), 0.75, 0.8 * GA.b)
    for ob in (1, 3):
        strum(ch_at(chs, 4, ob), GA.t(b0 + ob), 0.55, 0.13, up=(ob == 3))
    if bar.get("accent"):
        strum(chs, GA.t(b0), 0.8, 0.5, count=4, bright=0.65)
        put("tamb", GA.t(b0), tamb("hit", 0.6, seed=bi))
    if not bar.get("nowood"):
        wb(GA.t(b0 + 1.5), True, 0.35)
        wb(GA.t(b0 + 3.5), False, 0.45)
    if bar.get("tamb") or bi >= 4:
        for ob in (1, 3):
            put("tamb", GA.t(b0 + ob), tamb("shake", 0.35, seed=bi + ob))
mark("sunrise_run_top", GA.t(19.5))
mark("sleep_lullaby", GA.t(40))

# ---------- строфа 4: тревога, си минор ----------
bass8 = [35] * 4 + [36] * 2 + [35] * 2 + [31] * 4 + [30] * 4
for j, m in enumerate(bass8):
    v = 0.65 + 0.35 * j / 15
    bassn(m, GB.t(0.5 * j), v, 0.2, octave=True)
for j in range(16):                                # часы дня: тик-так
    wb(GB.t(0.5 * j), j % 2 == 0, 0.38 + 0.12 * j / 15)
for bt, v in ((0, 0.6), (2, 0.5), (2.5, 0.4), (4, 0.7), (6, 0.6), (6.5, 0.5), (7, 0.6), (7.25, 0.65), (7.5, 0.75),
              (7.75, 0.9)):
    put("drum", GB.t(bt), drum("low", v, seed=int(bt * 4)))
put("pad", GB.t(0), tremolo([59, 62, 66], 3.95 * GB.b, 0.5, rate=12.5, bright=0.45, cresc=0.7, rel=0.06))
put("pad", GB.t(4), tremolo([59, 62, 67], 1.95 * GB.b, 0.6, rate=13.0, bright=0.5, rel=0.05))
put("pad", GB.t(6), tremolo([58, 61, 64, 66], 1.98 * GB.b, 0.7, rate=14.0, bright=0.55, cresc=0.75, rel=0.04))
play_mel(GB, 0, "F#5:.5 G5:.5 F#5:.5 F5:.5 F#5:1 B4:1", "b", vel=0.85)
play_mel(GB, 4, "G5:.5 F#5:.5 E5:.5 D5:.5 C#5:.5 D5:.5 E5:.5 A#4:.5", "b", vel=0.9)
tb = T_BOSS + FRAME                                # УДАР: выход босса
put("drum", tb, drum("big", 1.0))
put("drum", tb, drum("low", 0.6, seed=2))
strum("Bm", tb, 1.0, 1.0, lo=59, count=4, bright=0.7)
bassn(35, tb, 1.0, 1.1, octave=True)
put("tamb", tb, tamb("hit", 0.8, seed=3))
put("xyl", tb, xylo(83, 0.7))
put("xyl", tb, xylo(78, 0.6, seed=1))
tw = T_WINT + FRAME
put("pad", tb + 0.05, tremolo([54, 59, 62], max(0.3, tw - tb - 0.1), 0.6, rate=13.0, bright=0.4, rel=0.05))
steps = [t for t, k in SFX_EV if k == "clack" and T_BOSS + 0.1 < t < T_WINT - 0.1]
for j, t in enumerate(steps):                      # миньоны: хроматический бас вверх
    bassn(36 + min(j, 2), t + FRAME, 0.85, 0.22, octave=True)
    put("drum", t + FRAME, drum("tom", 0.45 + 0.1 * j, seed=j))
put("drum", tw, drum("big", 1.0, seed=1))          # УДАР: зима настала
strum("D7", tw, 1.0, 1.2, lo=62, count=4, bright=0.7)
bassn(38, tw, 1.0, 1.3, octave=True)
put("tamb", tw, tamb("hit", 0.85, seed=4))
put("xyl", tw, xylo(86, 0.8))
put("xyl", tw, xylo(90, 0.7, seed=1))
put("pad", tw + 0.08, tremolo([60, 62, 66, 69], max(0.4, T_TURN - tw - 0.12), 0.75, rate=14.0, bright=0.5,
                              cresc=0.55, rel=0.05))
run = [69, 71, 72, 74, 76, 78]                      # разбег на «ВАШ ХОД»
for j, m in enumerate(run):
    put("mel", T_TURN - (len(run) - j) * 0.075, pluck(m, 0.07, 0.6 + 0.06 * j, bright=0.7, tau1=0.6, seed=j))
for j in range(4):
    put("drum", T_TURN - (4 - j) * 0.11, drum("tom", 0.35 + 0.1 * j, seed=j))
mark("boss_hit", tb)
mark("winter_hit", tw)

# ---------- строфы 5–6: «ваш ход», соль мажор, полька 2/4 ----------
C_SCORE = [("G", "G5:.5 D5:.5 G5:.5 A5:.5"), ("G", "B5:.5 A5:.25 G5:.25 D5:1"), ("C", "E5:.5 G5:.5 C6:.5 B5:.5"),
           ("D7", "A5:.5 F#5:.5 D5:1"), ("G", "B4:.5 D5:.5 G5:.5 B5:.5"), ("D7", "A5:.5 C6:.5 B5:.25 A5:.25 F#5:.5"),
           ("G", "G5:1 D5:.5 G5:.5"), ("G", "B5:.5 D6:.5 B5:.5 G5:.5"), ("C", "C6:.5 E6:.5 D6:.25 C6:.25 B5:.5"),
           ("G", "B5:.5 G5:.5 D5:1"), ("Am", "C5:.5 E5:.5 A5:.5 C6:.5"), ("D7", "D6:.5 C6:.5 A5:.5 F#5:.5"),
           ("B7", "D#5:.5 F#5:.5 A5:.5 B5:.5")]
for bi, (chs, mel) in enumerate(C_SCORE):
    b0 = 2 * bi
    ins = "bs+x" if bi in (5, 6, 11, 12) else "bs"
    play_mel(GC, b0, mel, ins, vel=0.95)
    bassn(bass_of(chs), GC.t(b0), 0.9, 0.55 * GC.b)
    bassn(bass_of(chs, "fifth"), GC.t(b0 + 1), 0.7, 0.55 * GC.b)
    for ob in (0.5, 1.5):
        strum(chs, GC.t(b0 + ob), 0.5, 0.1, up=(ob == 1.5))
        put("tamb", GC.t(b0 + ob), tamb("shake", 0.28, seed=bi))
    put("tamb", GC.t(b0 + 1), tamb("hit", 0.4, seed=bi))
    for k in range(4):
        wb(GC.t(b0 + 0.5 * k), k % 2 == 1, 0.3 if k % 2 == 0 else 0.25)
    if bi >= 11:                                    # дробь к атаке
        for k in range(4):
            put("drum", GC.t(b0 + 0.5 * k), drum("low", 0.35 + 0.12 * (k + 4 * (bi - 11)) / 2, seed=k))
mark("polka", GC.t0)

# ---------- строфа 7: атака, ми минор ----------
D_SCORE = [("Em Em", "E5:.5 F#5:.5 G5:.5 F#5:.5 E5:.5 D#5:.5 E5:1"),
           ("C D", "G5:.5 A5:.5 G5:.5 E5:.5 F#5:.5 G5:.5 A5:1"),
           ("Em C", "B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 G5:.5 C6:1"),
           ("Am B7", "C6:.5 B5:.5 A5:.5 F#5:.5 D#5:.5 F#5:.5 B5:1")]
for bi, (chs, mel) in enumerate(D_SCORE):
    b0 = 4 * bi
    notes, _ = parse(mel)
    for ob, d, m in notes:
        put("mel", GD.t(b0 + ob), pluck(m, min(d * GD.b * 0.8, 0.35), 0.95 if ob % 1 == 0 else 0.8, bright=0.8,
                                       tau1=0.7, pos=0.1, seed=int(ob * 2)))
    put("xyl", GD.t(b0), xylo(voicing(ch_at(chs, 4, 0), 83, 1)[0], 0.7, seed=bi))
    for k in range(8):
        ob = 0.5 * k
        c = ch_at(chs, 4, ob)
        strum(c, GD.t(b0 + ob), 0.6 if k % 2 == 0 else 0.42, 0.07, lo=59, up=k % 2 == 1, spread=0.006)
        r = bass_of(c)
        bassn(r if k % 2 == 0 else r + 12, GD.t(b0 + ob), 0.85 if k % 2 == 0 else 0.6, 0.15)
        put("tamb", GD.t(b0 + ob), tamb("hit" if k in (2, 6) else "shake", 0.45 if k in (2, 6) else 0.3, seed=k))
    for ob in (0, 2):
        put("drum", GD.t(b0 + ob), drum("big", 0.6, seed=bi))
    for ob in (1, 3):
        put("drum", GD.t(b0 + ob), drum("tom", 0.55, seed=bi))
    if bi == 3:
        for k in range(8):                           # дробь в паузе перед победой
            put("drum", GD.t(14 + 0.25 * k), drum("low", 0.4 + 0.06 * k, seed=k))
put("pad", GD.t(14), tremolo([63, 66, 69, 71], 2 * GD.b + 0.05, 0.75, rate=15.0, bright=0.6, cresc=0.6, rel=0.05))
mark("attack", GD.t0)

# ---------- строфа 8: победная тема спокойно, стоп-тайм на топот ----------
T_LEAVE = W("leave", L(32) + 1.2)
play_mel(GE, 0, "D5:.5 G5:.5 B5:1.5 A5:.5 G5:1", "t", vel=0.85)
play_mel(GE, 4, "E5:.5 G5:.5 C6:1 B5:.5 A5:.5", "t", vel=0.85)
for bt, c, v in ((0, "G", 0.85), (2, "G", 0.7), (4, "C", 0.85), (6, "D", 0.75)):
    bassn(bass_of(c) if bt % 4 == 0 else bass_of(c, "fifth") if c == "G" else bass_of(c), GE.t(bt), v, 0.8 * GE.b)
for bt, c in ((1, "G"), (3, "G"), (5, "C"), (6.5, "D")):
    strum(c, GE.t(bt), 0.45, 0.14, up=bt == 3)
    put("tamb", GE.t(bt), tamb("shake", 0.25, seed=int(bt)))
put("pad", GE.t(7), tremolo([62, 66, 69], 2 * GE.b, 0.4, rate=11.0, bright=0.3, rel=0.1))   # стоп-тайм
bassn(38, GE.t(9), 0.8, 0.9 * GE.b)
bassn(45, GE.t(10.5), 0.6, 0.45 * GE.b)
for bt in (9.5, 10, 10.5):
    strum("D7", GE.t(bt), 0.45, 0.12, up=bt == 10)
play_mel(GE, 9, "A5:.5 F#5:.5 D5:.5", "t", vel=0.8)
for j, m in enumerate((86, 83, 81, 78, 74)):       # Мороз уезжает
    put("xyl", T_LEAVE + FRAME + 0.07 * j, xylo(m, 0.6 - 0.07 * j, seed=j))
play_mel(GE, 11, "C5:.25 D5:.25 E5:.25 F#5:.25", "b", vel=0.85)
for k in range(4):
    put("drum", GE.t(11 + 0.25 * k), drum("tom", 0.35 + 0.1 * k, seed=k))
mark("stop_time", GE.t(7))

# ---------- финал: победа, затем спокойно ----------
tf = T_WIN + FRAME
put("drum", tf, drum("big", 1.0, seed=2))
strum("G", tf, 1.0, 1.0, lo=55, count=5, bright=0.7, spread=0.011)
bassn(43, tf, 1.0, 1.0, octave=True)
put("tamb", tf, tamb("hit", 0.9, seed=1))
put("pad", tf + 0.03, tremolo([55, 59, 62, 67], 2 * GF.b - 0.05, 0.6, rate=13.0, bright=0.45, rel=0.06))
F_THEME = [("G", "D5:.5 G5:.5 B5:1"), ("C", "E5:.5 G5:.5 C6:1"), ("D7", "B5:.5 G5:.5 A5:.5 F#5:.5"), ("G", "G5:2")]
nbF = GF.n
theme = F_THEME                                     # короткий финал — без такта C, ещё короче — сразу каденция
if nbF < 10:
    theme = [F_THEME[0], F_THEME[2], F_THEME[3]] if nbF >= 8 else [F_THEME[0], F_THEME[3]]
    WARN.append(f"финал короткий ({nbF} долей): победная тема сокращена до {len(theme)} тактов")
b_cad = 2 + 2 * (len(theme) - 1)
for bi, (chs, mel) in enumerate(theme):
    b0 = 2 + 2 * bi
    last = bi == len(theme) - 1
    play_mel(GF, b0, mel, "t+x8" if not last else "t", vel=1.0)
    if last:
        put("xyl", GF.t(b0), xylo(79, 0.8))
        strum("G", GF.t(b0), 0.9, 1.6, lo=55, count=5, bright=0.6, spread=0.012)
        bassn(43, GF.t(b0), 0.9, 2.2, octave=True)
        put("tamb", GF.t(b0), tamb("hit", 0.6, seed=2))
        put("drum", GF.t(b0), drum("big", 0.55, seed=1))
        continue
    bassn(bass_of(chs), GF.t(b0), 0.95, 0.6 * GF.b)
    bassn(bass_of(chs, "fifth"), GF.t(b0 + 1), 0.8, 0.6 * GF.b)
    for ob in (0.5, 1.5):
        strum(chs, GF.t(b0 + ob), 0.6, 0.12, up=ob == 1.5)
        put("tamb", GF.t(b0 + ob), tamb("shake", 0.35, seed=bi))
    put("tamb", GF.t(b0 + 1), tamb("hit", 0.5, seed=bi))
    for k in range(4):
        wb(GF.t(b0 + 0.5 * k), k % 2 == 1, 0.35)
    put("drum", GF.t(b0), drum("low", 0.5, seed=bi))
T_CALM = GF.t(b_cad + 0.5)
if T_CALM < TOTAL - 1.0:                            # спокойно: тремоло соль мажора и тихий ксилофон вверх
    put("pad", T_CALM, tremolo([55, 59, 62, 67], TOTAL - T_CALM, 0.5, rate=10.0, bright=0.3, rel=0.3))
    for j, m in enumerate((79, 83, 86, 91)):
        tj = GF.t(b_cad + 1 + 0.5 * j)
        if tj < TOTAL - 0.6:
            put("xyl", tj, xylo(m, 0.5 - 0.05 * j, seed=j))
mark("final_cadence", GF.t(b_cad))
mark("calm", T_CALM)

# ---------- голос: окна строк ----------
SPEECH = [(L(i), E(i)) for i in range(1, NL + 1)]
ACT = np.zeros(N)                                 # 1 — идёт строка (с запасом и плавными краями)
for a_, b_ in SPEECH:
    i0, i1 = max(0, int((a_ - 0.35) * SR)), min(N, int((b_ + 0.3) * SR))
    seg = tN[i0:i1]
    ACT[i0:i1] = np.maximum(ACT[i0:i1], np.clip(np.minimum((seg - (a_ - 0.18)) / 0.1, ((b_ + 0.15) - seg) / 0.1), 0, 1))

# ---------- шины: тише напев под голосом, EQ, ревербератор ----------
for k in filter(None, os.environ.get("MUSIC_MUTE", "").split(",")):   # отладка: MUSIC_MUTE=wood,tamb — без шин
    BUS[k][:] = 0
duck = (1 - ACT * (1 - db(MEL_DUCK_DB))).astype(np.float32)
for k in MELODIC:
    BUS[k] *= duck
BODY = (bq("hp", 150, 0.7), bq("peak", 290, 1.1, 2.5), bq("peak", 2900, 1.2, 1.5), bq("lp", 9500, 0.7))
BUS["mel"] = eq(BUS["mel"], *BODY)
BUS["sec"] = eq(BUS["sec"], bq("hp", 150, 0.7), bq("peak", 300, 1.0, 2.0), bq("lp", 7000, 0.7))
BUS["pad"] = eq(BUS["pad"], bq("hp", 140, 0.7), bq("peak", 320, 1.0, 2.0), bq("lp", 6500, 0.7))
BUS["bass"] = eq(BUS["bass"], bq("hp", 55, 0.7), bq("peak", 120, 1.0, 2.5), bq("lp", 1800, 0.6))
BUS["xyl"] = eq(BUS["xyl"], bq("hp", 280, 0.7), bq("lp", 10000, 0.7))
BUS["wood"] = eq(BUS["wood"], bq("hp", 300, 0.7), bq("lp", 9000, 0.7))
BUS["tamb"] = eq(BUS["tamb"], bq("hp", 2800, 0.7), bq("lp", 13000, 0.7))
BUS["drum"] = eq(BUS["drum"], bq("hp", 40, 0.7), bq("lp", 6000, 0.7))


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


IR_M = [make_ir(1.0, 1.8, 41), make_ir(1.0, 1.8, 42)]
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
SFX_SND = np.zeros(N)
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


def peak_at(x):
    """где у звука пик (огибающая, окно 7,5 мс), с от начала"""
    env = np.convolve(np.abs(stereo(x)).sum(0), np.ones(330) / 330, "same")
    return int(np.argmax(env)) / SR


def in_line(t, pad=0.08):
    return any(a_ - pad <= t <= b_ + pad for a_, b_ in SPEECH)


def place(name, kind, t_ev, x, pk=None):
    """шум: пик (pk — заданный, иначе по огибающей) на кадр позже события; громкость по SFX_DB (окно 100 мс)"""
    x = stereo(x).copy()
    pk = peak_at(x) if pk is None else pk
    start = t_ev + FRAME - pk
    under = in_line(t_ev + FRAME)
    lvl = SFX_DB[kind][1 if under else 0]
    mov = k_loud(x)
    g = np.sqrt(vKMS * db(lvl) ** 2 / max(float(mov.max()), 1e-20))
    x *= g
    mov = mov * g * g
    i0 = int(round(start * SR))
    n_ = x.shape[1]
    j0, j1 = max(0, -i0), min(n_, N - i0)
    if j1 <= j0:
        WARN.append(f"шум {name} ({t_ev:.2f} с) вне ролика")
        return
    SFX[:, i0 + j0:i0 + j1] += x[:, j0:j1]
    SFX_SND[i0 + j0:i0 + j1] += 0.5 * (x[0, j0:j1] + x[1, j0:j1]) * SFX_SEND[kind]
    a_, b_ = audible(x, start)
    w = int(KW * SR)
    cen = start + (np.arange(len(mov)) + w / 2) / SR
    inl = np.zeros(len(mov), bool)
    for la, lb in SPEECH:
        inl |= (cen >= la) & (cen <= lb)
    SFX_LOG.append({"name": name, "kind": kind, "what": SFX_WHAT[kind], "t": r3(t_ev), "peak": r3(start + pk),
                    "start": r3(max(0.0, a_)), "end": r3(min(TOTAL, b_)), "under_voice": under, "db": lvl,
                    "db_lines": round(dB(mov[inl].max() / vKMS), 1) if inl.any() else None,
                    "t_loudest": r3(cen[int(np.argmax(mov))])})


def modes(n, specs, g, att=0.0003):
    """сумма затухающих мод (f, амплитуда, tau)"""
    t = tt(n)
    y = np.zeros(n)
    for f, a, tau in specs:
        m_ = min(n, int(tau * 8 * SR) + 1)
        y[:m_] += a * np.sin(2 * np.pi * f * t[:m_] + g.uniform(0, 6.283)) * np.exp(-t[:m_] / tau)
    return y * np.minimum(1, t / att)


def click_noise(n, tau, g, hp=1500.0):
    return eq(g.standard_normal(n) * np.exp(-tt(n) / tau), bq("hp", hp, 0.7))


def s_clack(seed):
    """деревянная фишка о фанерную доску: стук дерева и глухой отзвук доски"""
    g = rgen("clack", seed)
    n = int(0.18 * SR)
    y = modes(n, [(g.uniform(1450, 1800), 1.0, 0.010), (g.uniform(2300, 2800), 0.7, 0.007),
                  (g.uniform(3500, 4200), 0.4, 0.005), (g.uniform(650, 820), 0.55, 0.018)], g)
    y += 0.7 * thump(n, 260, 170, 0.01, 0.022) + 0.6 * click_noise(n, 0.0006, g, 2000)
    return stereo(fade_tail(y, 0.02), g.uniform(-0.25, 0.25))


def s_tick(seed):
    """лёгкий жетон: маленький высокий стук"""
    g = rgen("tick", seed)
    n = int(0.09 * SR)
    y = modes(n, [(g.uniform(2700, 3300), 1.0, 0.006), (g.uniform(4400, 5400), 0.6, 0.004),
                  (g.uniform(900, 1100), 0.3, 0.008)], g)
    y += 0.5 * click_noise(n, 0.0004, g, 3000)
    return stereo(fade_tail(y, 0.01), g.uniform(-0.35, 0.35))


def s_flip(seed):
    """переворот клетки: «тк-так» — край приподнялся, клетка легла; шорох воздуха между"""
    g = rgen("flip", seed)
    n = int(0.16 * SR)
    t = tt(n)
    y = 0.45 * modes(n, [(g.uniform(1900, 2300), 1.0, 0.004), (g.uniform(3100, 3500), 0.5, 0.003)], g)
    y += 0.25 * bandn(n, 2000, 6000, g) * np.exp(-((t - 0.02) / 0.01) ** 2)
    d = int(0.035 * SR)
    y2 = modes(n - d, [(g.uniform(1150, 1400), 1.0, 0.009), (g.uniform(2100, 2500), 0.6, 0.006),
                       (g.uniform(280, 340), 0.5, 0.015)], g) + 0.5 * click_noise(n - d, 0.0005, g, 1800)
    y[d:] += y2
    return stereo(fade_tail(y, 0.01), g.uniform(-0.4, 0.4))


def s_thump(seed):
    """глухой мягкий удар большой фишки (табличка, шапка)"""
    g = rgen("thump", seed)
    n = int(0.45 * SR)
    t = tt(n)
    y = thump(n, 95, 55, 0.03, 0.09) + 0.6 * eq(g.standard_normal(n), bq("lp", 700)) * np.exp(-t / 0.03)
    y += 0.4 * modes(n, [(g.uniform(170, 200), 1.0, 0.05), (g.uniform(410, 470), 0.5, 0.03)], g)
    return stereo(fade_tail(y, 0.04), 0.0)


def s_boom(seed):
    """тяжёлый удар/топот великана: низкий удар, дребезг доски"""
    g = rgen("boom", seed)
    n = int(1.0 * SR)
    t = tt(n)
    y = thump(n, 92, 50, 0.05, 0.17) + 0.55 * eq(g.standard_normal(n), bq("lp", 380)) * np.exp(-t / 0.05)
    y += 0.45 * modes(n, [(138, 1.0, 0.1), (233, 0.8, 0.07), (371, 0.5, 0.05), (612, 0.3, 0.03)], g)
    y += 0.25 * eq(g.standard_normal(n), bq("lp", 2500)) * np.exp(-t / 0.004)
    y = eq(np.tanh(1.4 * y) / np.tanh(1.4), bq("hp", 45, 0.7))
    out = stereo(fade_tail(y, 0.08), 0.0)
    out[1] = np.roll(out[1], int(0.0007 * SR))
    return out


def s_slam(seed):
    """табличка хлопнула о доску: шлепок дерева, отзвук и дребезг"""
    g = rgen("slam", seed)
    n = int(0.45 * SR)
    t = tt(n)
    y = 0.9 * eq(g.standard_normal(n), bq("hp", 200)) * np.exp(-t / 0.006)
    y += modes(n, [(212, 1.0, 0.06), (487, 0.8, 0.04), (763, 0.55, 0.03), (1310, 0.4, 0.02), (2150, 0.25, 0.012)], g)
    y += 0.7 * thump(n, 120, 70, 0.02, 0.06)
    for d_, a_ in ((0.05, 0.35), (0.09, 0.18)):
        d = int(d_ * SR)
        y[d:] += a_ * (modes(n - d, [(g.uniform(1500, 1900), 1.0, 0.008), (g.uniform(700, 900), 0.6, 0.012)], g)
                       + 0.4 * click_noise(n - d, 0.0005, g))
    return stereo(fade_tail(y, 0.04), 0.0)


def s_click(seed):
    """кнопка: нажатие и отпускание"""
    g = rgen("click", seed)
    n = int(0.12 * SR)
    y = click_noise(n, 0.0006, g, 2500) + modes(n, [(3500, 0.8, 0.004), (5200, 0.4, 0.002), (1200, 0.3, 0.006)], g)
    d = int(0.06 * SR)
    y[d:] += 0.45 * (click_noise(n - d, 0.0005, g, 3000) + modes(n - d, [(4100, 0.6, 0.003)], g))
    return stereo(fade_tail(y, 0.01), 0.1)


def s_slide(seed):
    """санки едут по снегу: «ш-ш-ш» с хрустом, пик на рывке и плавное затухание"""
    g = rgen("slide", seed)
    n = int(0.95 * SR)
    t = tt(n)
    y = 0.65 * bandn(n, 1600, 7000, g) + 0.45 * bandn(n, 250, 900, g)
    y *= 1 + 0.45 * np.clip(eq(g.standard_normal(n), bq("lp", 25)) * 8, -1, 1)
    env = np.minimum(1, t / 0.07) * np.exp(-np.maximum(t - 0.07, 0) / 0.32)
    out = np.stack([y * env, np.roll(y, 200) * env])
    return fade_tail(out, 0.05)


def s_pop(seed):
    """снежный ком лёг: мягкий «пуф» и хруст"""
    g = rgen("pop", seed)
    n = int(0.28 * SR)
    t = tt(n)
    y = 0.8 * eq(g.standard_normal(n), bq("hp", 200), bq("lp", 1500)) * np.exp(-t / 0.03) * np.minimum(1, t / 0.002)
    y += 0.4 * thump(n, 170, 90, 0.015, 0.035)
    y += 0.25 * bandn(n, 2000, 7000, g) * np.exp(-t / 0.02) * (1 + 0.6 * g.standard_normal(n).clip(-1.5, 1.5))
    return stereo(fade_tail(y, 0.03), g.uniform(-0.3, 0.3))


def s_straw(seed):
    """сноп соломы лёг на стену: хрусткий шорох и мягкий удар"""
    g = rgen("straw", seed)
    n = int(0.5 * SR)
    t = tt(n)
    imp = np.zeros(n)
    k = int(0.35 * 500)
    pos = (np.abs(g.exponential(0.07, k)) * SR).astype(int)
    pos = pos[pos < n]
    np.add.at(imp, pos, g.uniform(-1, 1, len(pos)))
    ker = g.standard_normal(int(0.003 * SR)) * np.exp(-tt(int(0.003 * SR)) / 0.0008)
    y = eq(np.convolve(imp, ker)[:n], bq("hp", 1800), bq("lp", 9000))
    y = y / (np.max(np.abs(y)) + 1e-9)
    y += 0.5 * bandn(n, 700, 2500, g) * np.exp(-t / 0.06) * np.minimum(1, t / 0.004)
    y += 0.6 * thump(n, 140, 85, 0.02, 0.05)
    return stereo(fade_tail(y, 0.05), g.uniform(-0.2, 0.2))


def s_whoosh(seed):
    """порыв ветра: полоса шума взмывает и опадает, проходит по панораме"""
    g = rgen("whoosh", seed)
    n = int(1.1 * SR)
    t = tt(n)
    t_pk = 0.2
    fc = lambda tc: 380 + 1100 * np.exp(-((tc - t_pk) / 0.18) ** 2) + 250 * np.clip(tc / t_pk, 0, 1)
    y = sweep_noise(n, fc, 0.55, g) + 0.35 * bandn(n, 150, 500, g)
    env = np.where(t < t_pk, (t / t_pk) ** 2, np.exp(-(t - t_pk) / 0.28))
    y *= env
    p = np.clip(-0.6 + 1.2 * t / 0.8, -0.6, 0.6)
    gl, gr = pan_gains(p)
    return fade_tail(np.stack([gl * y, gr * y]), 0.08)


def s_hit(seed):
    """вихрь ударил в соломенную стену: глухой шлепок, хруст соломы и рассыпающийся снег"""
    g = rgen("hit", seed)
    n = int(0.85 * SR)
    t = tt(n)
    y = thump(n, 110, 60, 0.02, 0.07) + 0.7 * eq(g.standard_normal(n), bq("lp", 1200)) * np.exp(-t / 0.02)
    y += 0.3 * bandn(n, 1500, 7000, g) * np.exp(-t / 0.16) * np.minimum(1, t / 0.01) \
        * (1 + 0.5 * np.clip(eq(g.standard_normal(n), bq("lp", 60)) * 5, -1, 1))
    y += 0.25 * bandn(n, 600, 2200, g) * np.exp(-t / 0.05)
    out = stereo(y * np.minimum(1, t / 0.001), 0.0)
    out[1] += 0.08 * bandn(n, 2000, 8000, g) * np.exp(-t / 0.2)
    return fade_tail(out, 0.08)


def s_fanfare():
    """короткие победные фанфары (соль мажор): соль–си–ре и аккорд соль"""
    parts = [(0.0, 0.1, [67]), (0.13, 0.1, [71]), (0.26, 0.1, [74]), (0.39, 0.6, [79, 74, 71])]
    n = int(1.25 * SR)
    out = np.zeros((2, n))
    for j, (t0, d, ms_) in enumerate(parts):
        for k, m in enumerate(ms_):
            x = brass(m, d, 1.0 if k == 0 else 0.6, seed=j * 3 + k)
            i0 = int(t0 * SR)
            m_ = min(n - i0, len(x))
            gl, gr = pan_gains((-0.25, 0.25, 0.0)[k] if len(ms_) > 1 else 0.0)
            out[0, i0:i0 + m_] += gl * x[:m_]
            out[1, i0:i0 + m_] += gr * x[:m_]
    return fade_tail(out, 0.05)


SYN = {"clack": s_clack, "tick": s_tick, "flip": s_flip, "thump": s_thump, "boom": s_boom, "slam": s_slam,
       "click": s_click, "slide": s_slide, "pop": s_pop, "straw": s_straw, "whoosh": s_whoosh, "hit": s_hit}
cnt = {}
for t_ev, kind in SFX_EV:
    if kind not in SFX_DB:
        WARN.append(f"неизвестный шум «{kind}» на {t_ev:.2f} с — пропущен")
        continue
    cnt[kind] = cnt.get(kind, 0) + 1
    name = f"{kind}{cnt[kind]}"
    if kind == "fanfare":
        place(name, kind, t_ev, s_fanfare(), pk=0.02)          # пик — атака первой ноты
    else:
        place(name, kind, t_ev, SYN[kind](cnt[kind]))

IR_S = [make_ir(0.7, 1.2, 51, lp=5500), make_ir(0.7, 1.2, 52, lp=5500)]
for ch in (0, 1):
    SFX[ch] += 0.35 * convolve(SFX_SND, IR_S[ch])
del SFX_SND

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
SCH = [SFX[0], SFX[1]]
STANZA_OF = lambda i: (i - 1) // 4 + 1


def line_gain(i, w=None, up=0.0):
    w = w or [SPEECH[i - 1]]
    pv = pw([vfull], w) if HAS_VOICE else VPOW[i - 1]
    pm, ps = pw(MCH, w), pw(SCH, w)
    tgt = pv * db(ST_DB[STANZA_OF(i)] + up) ** 2        # музыка + шумы
    lo, hi = pv * db(MUS_LIM[0] + up) ** 2, pv * db(MUS_LIM[1] + up) ** 2
    pm_t = float(np.clip(tgt - ps, lo, hi))
    return np.sqrt(pm_t / max(pm, 1e-20))


lineG = [line_gain(i) for i in range(1, NL + 1)]
ACCENTS = [tb, tw]                                  # удары музыки: выход босса, «зима настала»
SPLIT = {}                                          # строка → (время удара, усиление до, усиление после)
for ta in ACCENTS:
    for i in range(1, NL + 1):
        a_, b_ = SPEECH[i - 1]
        if a_ + 0.25 < ta < b_ - 0.25:
            SPLIT[i] = (ta, line_gain(i, [(a_, ta - 0.02)]), line_gain(i, [(ta - 0.02, b_)], ACCENT_DB))
if os.environ.get("MUSIC_DEBUG"):
    print("lineG dB:", " ".join(f"{i + 1}:{20 * np.log10(g_):.1f}" for i, g_ in enumerate(lineG)))
    print("удары:", {i: (r3(ta), round(20 * np.log10(a_), 1), round(20 * np.log10(b_), 1)) for i, (ta, a_, b_) in SPLIT.items()})
    print("шумы одни на строках, дБ к голосу строки:",
          " ".join(f"{i}:{dB(pw(SCH, [SPEECH[i - 1]]) / VPOW[i - 1]):.1f}" for i in range(1, NL + 1)))
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(pw(MCH, wins), 1e-20))
W_INTRO = [(0.15, L(1) - 0.3)]
W_TAIL = [(E(NL) + 0.1, FIN - 0.05)]
W_FIN = [(FIN, TOTAL - FADE_OUT)]
gI, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0.0), (FADE_IN, gI), (L(1) - 0.3, gI), (L(1) - 0.04, lineG[0])]
LIFTS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i in SPLIT:
        ta, g_a, g_b = SPLIT[i]
        if i > 1:
            shape.append((L(i), g_a))
        shape += [(ta - 0.05, g_a), (ta - 0.02, g_b), (E(i), g_b)]
        g = g_b
    else:
        if i > 1:
            shape.append((L(i), g))
        shape.append((E(i), g))
    if i < NL and i % 4 == 0:
        gap = L(i + 1) - E(i)
        if gap > 0.45:
            r = min(0.2, gap / 4)
            gn = max(g, lineG[i])
            gl = float(np.clip(gFor([(E(i) + r, L(i + 1) - r)], GAP_DB[i]), min(g, lineG[i]), gn * db(GAP_CAP)))
            shape += [(E(i) + r, gl), (L(i + 1) - r, gl)]
            LIFTS.append((i, E(i) + r, L(i + 1) - r))
shape += [(E(NL) + 0.1, gT), (FIN - 0.05, gT), (FIN + 0.15, gF), (TOTAL - FADE_OUT, gF)]
for u in np.linspace(0, 1, 13)[1:]:
    shape.append((TOTAL - FADE_OUT * (1 - u), gF * np.cos(u * np.pi / 2) ** 2))
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f} с — проверь события")
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


out = (0 if args.only_sfx else shaped) + (0 if args.no_sfx else SFX)
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
NST = NL // 4
lrel = lambda chs, i: f1(dB(pw(chs, [SPEECH[i - 1]])) - dB(VPOW[i - 1]))
srel = lambda chs, s: f1(dB(pw(chs, SPEECH[4 * s - 4:4 * s])) - dB(np.mean(VPOW[4 * s - 4:4 * s])))
rel = lambda chs, w: f1(dB(pw(chs, w)) - VREF_ACT)
per_line = {str(i): lrel(SH, i) for i in range(1, NL + 1)}
per_line_all = {str(i): lrel(ALL, i) for i in range(1, NL + 1)}
per_st = {str(s): srel(SH, s) for s in range(1, NST + 1)}
per_st_all = {str(s): srel(ALL, s) for s in range(1, NST + 1)}
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
        "note": "секунды ролика. t — событие в кадре; peak — пик звука (на кадр позже события); start/end — где звук "
                "слышен; db — громкость шума к среднему голосу (самое громкое окно 100 мс, K-взвешенно, BS.1770), "
                "db_lines — то же, но самое громкое окно на строке (null — на строки не попадает); under_voice — пик "
                "внутри строки. music — ключевые моменты музыки, levels — уровни.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "fin": FIN, "voice": HAS_VOICE, "vref_db": f1(VREF_ACT),
        "events_crc": EV_CRC, "shift": r3(SHIFT),
        "sfx": SFX_LOG, "music": MARK, "levels": levels,
    }, f, ensure_ascii=False, indent=1)

print(f"вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов); сдвиг событий {SHIFT:+.3f} с")
print("голос: " + ("voice.mp3 — уровни по настоящему голосу" if HAS_VOICE else
                   f"НЕТ voice.mp3 — уровни по оценке голоса {VREF_DB} dBFS; после озвучки пересчитай этой же командой"))
print("темп: " + " ".join(f"{k}:{G_.t0:.2f}с ♩{60 / G_.b:.1f}" for k, G_ in (("1–3", GA), ("4", GB), ("5–6", GC),
                                                                          ("7", GD), ("8", GE), ("фин", GF))))
print(f"музыка под голосом: без шумов {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строфам, музыка без шумов | с шумами (дБ к голосу строф): "
      + " ".join(f"{s}:{per_st[s]}|{per_st_all[s]}" for s in per_st))
print("по строкам, музыка без шумов | с шумами (дБ к голосу строки):")
for k0 in range(0, NL, 8):
    print("  " + " ".join(f"{k}:{per_line[k]}|{per_line_all[k]}" for k in list(per_line)[k0:k0 + 8]))
print(f"вступление {levels['intro']}, паузы {levels['gaps']}, после голоса {levels['tail']}, финал {levels['final']} "
      "(дБ к среднему голосу)")
SEC = {"вступл.": [(0.15, GA.t0)], "с1–3": [(GA.t0, GA.end)], "с4": [(GB.t0, T_TURN)], "с5–6": [(GC.t0, GC.end)],
       "с7": [(GD.t0, GD.end)], "с8": [(GE.t0, GE.end)], "финал": [(GF.t0, TOTAL)]}
print("баланс шин (сухо, с BUS_G, K-взвешенно, дБ до формы громкости; тише −45 не показаны):")
for k in BUSES:
    BUS[k] = kweight(BUS[k][0].astype(np.float64) + BUS[k][1]).astype(np.float32)
for nm, wins in SEC.items():
    vals = [(k, dB(pw([BUS[k] / 2], wins)) + 20 * np.log10(BUS_G[k])) for k in BUSES]
    print(f"  {nm}: " + ", ".join(f"{k} {f1(v)}" for k, v in vals if v > -45))
pk_out = float(np.max(np.abs(out)))
print(f"music.wav: пик {f1(20 * np.log10(pk_out))} dBFS, ограничитель {lim:.3f}"
      + (f"; голос + музыка: пик {f1(20 * np.log10(float(np.max(np.abs(np.stack(ALL) + vfull)))))} dBFS"
         if HAS_VOICE else ""))
print("шумы (db — цель, db_lines — самое громкое окно на строке, пик − событие в мс):")
for r in SFX_LOG:
    print(f"  {r['name']:9s} {r['t']:7.3f}  пик {r['peak']:7.3f} (+{1000 * (r['peak'] - r['t']):.0f})  "
          f"{r['start']:7.3f}…{r['end']:7.3f}  db {r['db']:6.1f}{' под голосом' if r['under_voice'] else ''}"
          f"  на строках {r['db_lines']}")
print("музыка:", json.dumps(MARK, ensure_ascii=False))
for w_ in WARN:
    print("ВНИМАНИЕ:", w_)
print(f"время синтеза: {time.time() - T_START:.1f} с")
