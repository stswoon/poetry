#!/usr/bin/env python3
"""Музыка и шумы к балладе Ф. Шиллера «Перчатка» в переводе М. Ю. Лермонтова, стиль «файтинг-аркада».

Партия в аркадный файтинг. Своя музыка в духе файтингов 90-х: драм-машина, синт-бас, синт-медь стабами, квадратные
«8-битные» арпеджио и чип-сигналы, ~146 BPM в боях. Мелодии и гармония свои, не как в версии Жуковского (там ре минор,
здесь до минор → фа минор → соль минор → ля минор → до мажор):
  0 … L1        заставка: монетка и удар логотипа (шумы), джингл до минор (Cm Ab Bb G) с пунктирным басом и
                сбивкой томами, грув двора — с сильной доли перед голосом;
  строки 1–6    двор: андалузский ход и неаполитанский аккорд (Cm Bb Ab G Fm Cm Db G), бас 3-3-2, с 5-й строки —
                арпеджио; в паузе 6|7 — подъём меди по G7 к «ROUND 1»;
  ROUND 1       (L7) педаль до с фригийским ре-бемолем, томы-литавры, тиканье; ворота скрипят на «Скрыпучую дверь»,
                лязг на «отворяют»; к FIGHT — дробь и шумовой подъём;
  FIGHT 1       («выходит») тяжёлый грув льва на педали до (бас C–Eb–Db, хлопок, медь), шаги льва на долях до конца
                ст. 10; ст. 11–12 «молча… глядит» — грув редеет; «Зевая» — пульс разрежается до целых нот, сонная
                челеста; «Ложится» — пэд, в паузе 16|17 колыбельная челесты;
  ROUND 2       («махнул») фа минор; FIGHT 2 («прыжком») — бас шестнадцатыми на педали фа; «Завыл» — брейк на вой
                (барабаны молчат), к «хвостом» грув возвращается; «Тихо… обходит» — крадущийся остинато; «ворчит» —
                тяжёлый half-time; «невольно ложится» — сдувается; «НИЧЬЯ» — пэд Fsus2;
  «Сверху…»     остановка ленты, тишина, высокий пэд Dbmaj7, колокола по одному вниз вслед за перчаткой, гул; к
                приземлению — обратная тарелка; затем Gsus4 — ожидание;
  ст. 35–40     лукавая тема Кунигунды (соль минор: Gm Ebmaj7 Cm6 D7): дразнящий чип-мотив в паузе, под голосом —
                пиццикато-бас, щипки, щелчки, с её реплики — челеста; «БОНУСНЫЙ РАУНД» — сбивка томами на E;
  ст. 41–44     бег рыцаря: ля минор, бас и хэт шестнадцатыми, подъём (F G E); FIGHT 3 («вступает») — бой
                (Am Am F E); «подымает» — FLAWLESS: ля мажор;
  ст. 45–46     робкое ожидание: сердцебиение баса и тремоло-пэд, почти тишина;
  ст. 47        «приносит назад» — подъём (Am F G) к PERFECT;
  ст. 48–51     хвала: до мажор, полный грув (C Em7 Fmaj7 G), затем мягкий «нежный взгляд» с челестой;
  ст. 52–53     досада: тёмный аккорд (Db над до), пульс нарастает, обратная тарелка к броску; K.O. — обрыв;
  ст. 54–55     пауза: эхо K.O., курсор меню и «НЕТ»; тихая педаль до (Csus4 → C на «покинул»), уходящие шаги;
  ПОБЕДИТЕЛЬ    победный джингл (до мажор), на финальном титре — тема заставки в мажоре (C Ab Bb C), громче,
                финальный аккорд и затухание.
Под голосом музыка на UNDER_DB к голосу (RMS по каждой строке, внутри строки громкость постоянна, переходы — в паузах);
на заставке, в паузах между строфами и в финале громче. Зоны «замедление» (ст. 31–34), «робость» (ст. 45–46) и
«после K.O.» (ст. 54–55) — нарочно тише (SLOW_DB, FEAR_DB, POSTKO_DB).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все ниже голоса (список — sfx.json).

Запуск: python3 make_music.py [V0] [OUTRO]        (по умолчанию из events.json: 4.0 и 7.5; можно --v0=4 --outro=7.5)
Читает events.json (пишет ../video/build.py), ../timings.json (длина голоса, проверка событий), ../voice.mp3 (через
ffmpeg — для уровней). При другом V0 сдвигает события; если events.json не совпадает с timings.json — берёт события
из ../video/build.py. Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json.
Устройство (синтез на numpy, шины, ревербератор, уровни по строкам, ограничитель) — как в
../../Перчатка/music/make_music.py (версия Жуковского); ноты, гармония, форма и часть шумов — свои.
Нужны python3 + numpy и ffmpeg.
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

# ---------- уровни: RMS, дБ к RMS голоса (под голосом — по каждой строке, остальное — к среднему голосу) ----------
UNDER_DB = -19.0
LINE_DB = {}                                           # поправки отдельных строк, дБ
INTRO_DB, VICT_DB, FIN_DB = -7.0, -8.0, -6.0           # заставка, победный джингл, финальная тема
GAP_DB = {6: -13.0, 16: -15.0, 34: -14.0, 40: -14.0, 44: -14.0, 51: -15.0}   # паузы между строфами (строка перед паузой)
SLOW_DB = -23.0     # замедление: перчатка падает (строки 31–34)
FEAR_DB = -24.0     # робкое ожидание (строки 45–46)
POSTKO_DB = -26.0   # после K.O. до джингла (строки 54–55)
# шумы: K-взвешенная (BS.1770) громкость в своём окне, дБ к голосу в местах речи
SFX_DB = {
    "coin_fall": -17, "coin_slot": -9, "logo_hit": -5, "round": -10, "creak": -16, "gate": -12, "fight": -10, "paw": -17,
    "yawn": -15, "lie": -15, "gate_t": -13, "jump_whoosh": -15, "land": -13, "howl": -14, "tail": -15, "grumble": -16,
    "draw": -16, "glove_fall": -19, "glove_land": -14, "quest": -11, "boot": -17, "sand": -23, "pickup": -11,
    "flawless": -10, "applause": -16, "perfect": -10, "throw": -15, "ko": -8, "blip": -18, "deny": -12, "leave": -17,
}
PEAK_CEIL = 10 ** (-1.5 / 20)   # потолок music.wav (мастер ролика делает основной агент)
MIX_CEIL = 10 ** (-0.3 / 20)    # голос + музыка не выше (голос сам доходит до −0,5 dBFS)

# ---------- аргументы и события ----------
r3 = lambda x: round(float(x), 3)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TJ = json.load(f)
VD = TJ["voiceDuration"]
NL = len(TJ["lines"])
_p = os.path.join(HERE, "events.json")
RAW = None
if os.path.exists(_p):
    with open(_p, encoding="utf-8") as f:
        RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Перчатке» (перевод Лермонтова)")
ap.add_argument("pos", nargs="*", type=float, help="V0 OUTRO")
ap.add_argument("--v0", type=float)
ap.add_argument("--outro", type=float)
args = ap.parse_args()
V0 = args.v0 if args.v0 is not None else (args.pos[0] if len(args.pos) > 0 else (RAW or {}).get("V0", 4.0))
OUTRO = args.outro if args.outro is not None else (args.pos[1] if len(args.pos) > 1 else (RAW or {}).get("OUTRO", 7.5))
if V0 < 2.5 or OUTRO < 5.5:
    sys.exit("нужно V0 >= 2.5 и OUTRO >= 5.5")
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))

ok_raw = RAW is not None and all(f"{k}{NL}" in RAW for k in "LE") and \
    abs(RAW["L1"] - RAW["V0"] - TJ["lines"][0]["start"]) < 0.02 and abs(RAW[f"E{NL}"] - RAW["V0"] - TJ["lines"][-1]["end"]) < 0.02
if ok_raw:
    base, src_v0 = RAW, RAW["V0"]
    ev_src = "events.json"
else:  # события так же, как в ../video/build.py
    print("events.json нет или он не совпадает с timings.json — события беру из ../video/build.py")
    sys.path.insert(0, os.path.join(POEM, "video"))
    import build  # noqa: E402
    base, src_v0 = build.EV, build.V0
    ev_src = "video/build.py"
shift = V0 - src_v0
EV = {k: r3(v + shift) for k, v in base.items() if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total")}
EV["V0"], EV["total"] = V0, TOTAL
if shift:
    ev_src += f" со сдвигом {shift:+.2f} с"
if RAW is not None and ok_raw and abs(RAW.get("total", TOTAL) + shift - TOTAL) > 0.002:
    print(f"внимание: total в events.json {RAW.get('total')}, у музыки {TOTAL} (другой OUTRO?)")
W = lambda k: EV[k]
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
FIN = EV["fin"]
if FIN > TOTAL - 4.5:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")

# ---------- ключевые моменты (как в ../video/src/main.js) ----------
b0 = 60 / 146                                    # доля боя
LOGO = 0.62                                      # логотип врезается (вспышка в кадре 0,55–0,9)
IA = LOGO + FRAME                                # удар заставки
bi = float(np.clip((L(1) - 0.15 - IA) / 8, 0.40, 0.48))   # доля заставки и двора: 8 долей до грува
C0 = IA + 8 * bi                                 # грув двора (сильная доля перед голосом)
R1 = L(7) - 0.05                                 # баннер «ROUND 1»
DVER = W("w_dver") - 0.15                        # ворота льва поднимаются 1,1 с (GATE_OPEN)
OTVOR = W("w_otvor")                             # лязг: тряска кадра
F1 = W("w_vyh") - 0.05                           # «FIGHT!» (лев выходит)
F1a = F1 + FRAME
QUIET1 = L(11) - 0.1                             # «И молча вдруг глядит вокруг»
Z1, LIE1 = W("w_zev"), W("w_lozh1")
R2 = W("w_mahn") - 0.05                          # «ROUND 2»
F2 = W("w_pryzh") - 0.1                          # «FIGHT!» (тигр)
F2a = F2 + FRAME
GATE2 = W("w_pryzh") - 0.45 + 0.05               # ворота тигра распахиваются за 0,25 с
TJ0, TJ1 = W("w_pryzh") - 0.2, W("w_pryzh") + 0.65         # прыжок тигра и приземление
HOWL, HOWL_D = W("w_zavyl"), 1.15                # «Завыл ужасно» (пасть открыта до +1,1 с)
TAIL0 = W("w_hvost")
CIRC0 = W("w_tiho") - 0.1                        # тигр обходит льва
GRUM0 = max(E(26) + 0.1, CIRC0 + 3.0)            # круг закончен (CIRC1)
VORCH, NEVOL, LIE2 = W("w_vorch"), W("w_nevol"), W("w_lozh2")
DRAW = W("w_ryad") + 0.1                         # «НИЧЬЯ»
GF0 = W("w_sverhu") - 0.05                       # перчатка соскальзывает с руки
STOP = GF0                                       # остановка ленты
TS_D, TS_SRC = 0.45, 0.22                        # её длина и сколько исходника «съедает»
SLOW0 = STOP + TS_D
LAND = max(W("w_mezhdu") + 0.1, GF0 + 2.0)       # перчатка в песке (GF1)
SLY0 = max(E(34) + 0.08, LAND + 0.5)             # лукавая тема Кунигунды
BONUS = E(40) + 0.05                             # «БОНУСНЫЙ РАУНД»
KW0 = W("w_rycar3") - 0.1                        # рыцарь бежит по балкону
KW1 = KW0 + 0.5
KS0, KS1 = KW1, max(W("w_vstup") - 0.2, KW1 + 1.6)          # бегом вниз по лестнице
F3 = W("w_vstup") - 0.05                         # «FIGHT!» (рыцарь в круге)
F3a = F3 + FRAME
KP = max(W("w_podym2") - 0.1, KS1 + 2.4)         # рыцарь берёт перчатку
PICK = W("w_podym2")                             # «дзынь» +1 ПЕРЧАТКА
FLAW = KP + 0.3                                  # «FLAWLESS!»
FEAR0, FEAR1 = L(45), E(46)                      # робкое ожидание
BUILD0 = L(47) - 0.1                             # «приносит назад»
PERF = W("w_hvala") - 0.05                       # «PERFECT!»
PERFa = PERF + FRAME
DARK0 = E(51) + 0.1                              # тёмный гул в паузе 51|52
DOSAD = W("w_dosad") - 0.1                       # «досады… пылая» — красный жар, тёмный аккорд
THROW = W("w_kinul") - 0.02                      # бросок перчатки (GT0)
KO = THROW + 0.32                                # перчатка долетела: K.O. (GT1)
BLAG, NADOB = W("w_blag"), W("w_nadob")          # меню «НАГРАДА?» и выбор «НЕТ»
KL0 = W("w_pokin") - 0.25                        # «тотчас покинул»: уходит
KL1 = KL0 + 4.2
VIC = E(NL) + 0.5                                # «ПОБЕДИТЕЛЬ: РЫЦАРЬ»
VIC_T = VIC + 0.05                               # надпись садится на пружине
FT0 = FIN + 0.31                                 # финальный титр садится
_order = [IA, C0, R1, DVER, OTVOR, F1, QUIET1, Z1, LIE1, R2, GATE2, F2, TJ1, HOWL, TAIL0, CIRC0, GRUM0, VORCH, LIE2, DRAW,
          STOP, SLOW0, LAND, SLY0, BONUS, KW0, KS0, KS1, F3, KP, FLAW, FEAR0, FEAR1, BUILD0, PERF, DARK0, DOSAD, THROW, KO,
          NADOB, KL0, VIC, FIN, FT0]
assert all(a < b for a, b in zip(_order, _order[1:])), "события не по порядку: " + str([r3(x) for x in _order])
assert C0 < L(1) and FT0 + 6 * b0 < TOTAL - 1.5, "не хватает места"


# шаги рыцаря (как stepFoot в main.js): путь — координата q, ступня встаёт в узел при q = 1600 + 37·f;
# по балкону, лестнице и песку q идёт с trapEase (разгон 20 %, ровно, торможение 20 %)
def trap(u, a=0.2):
    u = min(1.0, max(0.0, u))
    v = 1 / (1 - a)
    if u < a:
        return v * u * u / (2 * a)
    if u > 1 - a:
        return 1 - v * (1 - u) * (1 - u) / (2 * a)
    return v * (u - a / 2)


def trap_inv(y):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if trap(mid) < y else (lo, mid)
    return (lo + hi) / 2


ST_X0, ST_RUN = 1600, 37                         # STAIR.x0, STAIR.run (world.js)
QB = ST_X0 + 7.5 * ST_RUN                        # подножие лестницы
KN_BALC, Q_TOP = 1470, ST_X0 - 6
_sp = [(QB, 700), (1826, 830), (805 + 80, 830)]  # путь по песку к перчатке (SANDP)
Q_PICK = QB + sum(np.hypot(_sp[i][0] - _sp[i - 1][0], _sp[i][1] - _sp[i - 1][1]) for i in (1, 2)) / 3
Q_EXIT = QB + (2160 - QB) / 3


def footfalls(t0, t1, q0, q1):
    out = []
    for fi in range(-10, 40):
        q = ST_X0 + ST_RUN * fi
        if q0 < q <= q1:
            out.append((t0 + trap_inv((q - q0) / (q1 - q0)) * (t1 - t0), q))
    return out


STEPS_BALC = footfalls(KW0, KW1, KN_BALC, Q_TOP)
STEPS_STAIR = footfalls(KS0, KS1, Q_TOP, QB)
STEPS_SAND = footfalls(KS1, KP, QB, Q_PICK)
STEPS_LEAVE = [s for s in footfalls(KL0, KL1, KN_BALC, Q_EXIT) if s[0] < FIN]
STEPS_LION = [float(t) for t in F1a + b0 * np.arange(0, 16) if W("w_vyh") + 0.1 <= t <= E(10) + 0.05]
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1829)
db = lambda x: 10.0 ** (x / 20.0)
hz = lambda m: 440.0 * 2.0 ** ((m - 69) / 12.0)
tt = lambda n: np.arange(n) / SR


def pan_lr(p):
    a = (float(np.clip(p, -1, 1)) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def fast_len(n):
    m = 1
    while m < n:
        m *= 2
    best = m
    for c in (m, m * 3 // 4, m * 5 // 8):
        if c >= n:
            best = c
    return best


# ---------- фильтры (через FFT, амплитудная характеристика RBJ-биквада) ----------
def rbj(kind, f0, q=0.707):
    w0 = 2 * np.pi * min(f0, SR * 0.49) / SR
    al, c = np.sin(w0) / (2 * q), np.cos(w0)
    if kind == "lp":
        bb, aa = [(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al]
    elif kind == "hp":
        bb, aa = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]
    else:  # bp, 0 дБ в пике
        bb, aa = [al, 0, -al], [1 + al, -2 * c, 1 - al]
    return np.array(bb) / aa[0], np.array(aa) / aa[0]


def resp(ba, freqs):
    bb, aa = ba
    z = np.exp(-2j * np.pi * freqs / SR)
    return np.abs((bb[0] + bb[1] * z + bb[2] * z * z) / (aa[0] + aa[1] * z + aa[2] * z * z))


def ffilt(x, *filts, power=1):
    n = len(x)
    nf = fast_len(n + 2048)
    X = np.fft.rfft(x, nf)
    fr = np.fft.rfftfreq(nf, 1 / SR)
    H = np.ones_like(fr)
    for ba in filts:
        H *= resp(ba, fr)
    return np.fft.irfft(X * H ** power, nf)[:n]


def stft_bp(x, fc_fn, q=1.0, power=1, nfft=1024, hop=256):
    """полосовой фильтр с меняющейся частотой fc_fn(t)"""
    n = len(x)
    win = np.hanning(nfft + 1)[:-1]
    pad = np.concatenate([np.zeros(nfft), x, np.zeros(nfft)])
    out, ws = np.zeros_like(pad), np.zeros_like(pad)
    fr = np.fft.rfftfreq(nfft, 1 / SR)
    for s in range(0, len(pad) - nfft, hop):
        tc = (s + nfft / 2 - nfft) / SR
        H = resp(rbj("bp", float(fc_fn(max(0.0, tc))), q), fr) ** power
        out[s:s + nfft] += np.fft.irfft(np.fft.rfft(pad[s:s + nfft] * win) * H, nfft) * win
        ws[s:s + nfft] += win ** 2
    return (out / np.maximum(ws, 1e-3))[nfft:nfft + n]


def kweight(x):  # K-фильтр BS.1770 (амплитудно; для энергии в окнах этого достаточно)
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
    return ffilt(x, s1, s2)


# ---------- генераторы ----------
TBL = 4096
_PH = np.arange(TBL) / TBL
_TC = {}


def htable(f, kind="saw", fcm=None, kmax=60, even=1.0, slope=1.0):
    """волновая таблица без алиасинга для частоты до f: пила/квадрат, fcm — срез (кратно f)"""
    K = max(1, int(min(kmax, SR * 0.45 / f)))
    key = (K, kind, None if fcm is None else round(fcm, 3), even, slope)
    if key not in _TC:
        k = np.arange(1, K + 1)
        a = 1.0 / k ** slope
        if kind == "square":
            a = np.where(k % 2 == 1, a, a * even)
        if fcm:
            a = a / np.sqrt(1 + (k / fcm) ** 4)
        w = (a[:, None] * np.sin(2 * np.pi * k[:, None] * _PH[None, :])).sum(0)
        _TC[key] = w / max(1e-9, np.max(np.abs(w)))
    return _TC[key]


def osc(tbl, freq, n, ph0=0.0):
    ph = ph0 + (freq * np.arange(n) / SR if np.isscalar(freq) else np.cumsum(freq) / SR)
    idx = (ph % 1.0) * TBL
    i0 = idx.astype(np.int64)
    fr = idx - i0
    return tbl[i0 % TBL] * (1 - fr) + tbl[(i0 + 1) % TBL] * fr


def noise(n):
    return rng.standard_normal(n)


def place_in(n, d, x):
    out = np.zeros(n)
    i = int(round(d * SR))
    j = min(n, i + len(x))
    if j > i:
        out[i:j] = x[:j - i]
    return out


# банки отфильтрованного шума для ударных
_NB = {}


def nb(name, n):
    if name not in _NB:
        x = noise(SR * 6)
        spec = {"hat": [rbj("hp", 7500, 0.7)], "ohat": [rbj("hp", 6000, 0.7)], "shk": [rbj("bp", 6500, 0.9)],
                "snr": [rbj("bp", 2800, 0.6)], "clp": [rbj("bp", 1300, 1.1)], "rim": [rbj("bp", 1900, 2.5)],
                "crs": [rbj("hp", 3500, 0.7)], "knk": [rbj("bp", 2600, 1.2)], "tom": [rbj("bp", 900, 0.8)]}[name]
        y = ffilt(x, *spec, power=2)
        _NB[name] = y / np.sqrt(np.mean(y ** 2))
    s = int(rng.integers(0, SR * 6 - n - 1))
    return _NB[name][s:s + n].copy()


def kick(vel=0.8):
    n = int(0.45 * SR)
    t = tt(n)
    f = 46 + 125 * np.exp(-t / 0.026) + 20 * np.exp(-t / 0.15)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.19)
    x[:400] += 0.35 * nb("knk", 400) * np.exp(-tt(400) / 0.002)
    return np.tanh(2.0 * x) / np.tanh(2.0) * vel * 0.75


def snare(vel=0.6):
    n = int(0.32 * SR)
    t = tt(n)
    body = 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) + 0.22 * np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03)
    return (body + nb("snr", n) * 0.42 * np.exp(-t / 0.085)) * (1 - np.exp(-t / 0.0006)) * vel


def clap(vel=0.6):
    n = int(0.32 * SR)
    t = tt(n)
    e = sum(np.where(t >= d, np.exp(-(t - d) / 0.006), 0) for d in (0, 0.009, 0.019)) * 0.6 + np.where(t >= 0.027, np.exp(-(t - 0.027) / 0.07), 0)
    return nb("clp", n) * 0.3 * e * vel


def rim(vel=0.5):
    n = int(0.08 * SR)
    t = tt(n)
    return (nb("rim", n) * 0.3 * np.exp(-t / 0.01) + 0.35 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.012)) * vel


def hat(vel=0.4, open_=False):
    n = int((0.4 if open_ else 0.09) * SR)
    t = tt(n)
    return nb("ohat" if open_ else "hat", n) * 0.22 * np.exp(-t / (0.17 if open_ else 0.025)) * (1 - np.exp(-t / 0.0004)) * vel


def shaker(vel=0.3):
    n = int(0.11 * SR)
    t = tt(n)
    return nb("shk", n) * 0.18 * np.minimum(1, t / 0.014) * np.exp(-t / 0.035) * vel


def tom(m, vel=0.6):
    f = hz(m)
    n = int(0.6 * SR)
    t = tt(n)
    fr = f * (1 + 0.5 * np.exp(-t / 0.05))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.26) + 0.18 * nb("tom", n) * np.exp(-t / 0.03)
    return np.tanh(1.4 * x) / np.tanh(1.4) * (1 - np.exp(-t / 0.001)) * vel


def woodblock(m, vel=0.4):
    f = hz(m)
    n = int(0.12 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.03) + 0.3 * np.sin(2 * np.pi * 2.31 * f * t) * np.exp(-t / 0.012)) * (1 - np.exp(-t / 0.0005)) * vel


def crash(vel=0.5, tau=0.9):
    n = int(min(4 * tau, 3.0) * SR)
    t = tt(n)
    x = nb("crs", n) * 0.2 * np.exp(-t / tau)
    for r in (3170, 4410, 5280, 6930, 8120):
        x += 0.03 * np.sin(2 * np.pi * r * t + rng.random() * 6) * np.exp(-t / (tau * 0.6))
    return x * (1 - np.exp(-t / 0.001)) * vel


def sbass(m, dur, vel=0.7, bright=1.0):
    """синт-бас: пила с фильтром по огибающей + синус снизу"""
    f = hz(m)
    n = int((dur + 0.08) * SR)
    t = tt(n)
    ph = rng.random()
    xb = osc(htable(f, "saw", 10 * bright), f, n, ph)
    xd = osc(htable(f, "saw", 1.8), f, n, ph)
    x = xd + (xb - xd) * np.exp(-t / (0.05 + 0.03 * bright))
    x = 0.75 * x + 0.45 * np.sin(2 * np.pi * (f * t + ph))
    amp = (1 - np.exp(-t / 0.002)) * (0.75 + 0.25 * np.exp(-t / 0.08)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.015))
    return np.tanh(1.5 * x * amp) / np.tanh(1.5) * vel


def brass(m, dur, vel=0.6, bright=1.0, att=0.015, rel=0.08, fatt=0.02, det=(-7, 0, 7)):
    """синт-медь: три расстроенные пилы, фильтр раскрывается и закрывается"""
    f = hz(m)
    n = int((dur + rel * 5 + 0.02) * SR)
    t = tt(n)
    tbb, tbd = htable(f, "saw", 7 * bright, 40), htable(f, "saw", 1.6, 40)
    fe = (1 - np.exp(-t / fatt)) * (0.35 + 0.65 * np.exp(-t / 0.18))
    x = np.zeros(n)
    for d in det:
        fd = f * 2 ** (d / 1200)
        ph = rng.random()
        xd = osc(tbd, fd, n, ph)
        x += xd + (osc(tbb, fd, n, ph) - xd) * fe
    amp = np.minimum(1, t / att) * (0.78 + 0.22 * np.exp(-t / 0.1)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    return x / len(det) * amp * vel


def lead(m, dur, vel=0.6):
    """ведущий голос: пила + квадрат октавой выше, вибрато"""
    f = hz(m)
    n = int((dur + 0.2) * SR)
    t = tt(n)
    fr = f * (1 + 0.005 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.15) / 0.2, 0, 1))
    ph = rng.random()
    x = 0.7 * osc(htable(f * 1.01, "saw", 6, 40), fr, n, ph) + 0.3 * osc(htable(2.02 * f, "square", 5, 30, 0.2), 2 * fr, n, ph)
    return x * np.minimum(1, t / 0.008) * (0.75 + 0.25 * np.exp(-t / 0.12)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.06)) * vel


def pluck(m, vel=0.5, tau=0.12):
    f = hz(m)
    n = int((tau * 5 + 0.02) * SR)
    t = tt(n)
    ph = rng.random()
    xb = osc(htable(f, "square", 8, 40, 0.25), f, n, ph)
    xd = osc(htable(f, "square", 2, 40, 0.25), f, n, ph)
    return (xd * np.exp(-t / tau) + (xb - xd) * np.exp(-t / (tau * 0.25))) * (1 - np.exp(-t / 0.001)) * vel


BELL = ((1, 1, 1), (2.76, 0.4, 0.4), (5.40, 0.2, 0.2), (8.93, 0.1, 0.1))
CEL = ((1, 1, 1), (2.0, 0.22, 0.4), (3.0, 0.08, 0.25), (4.0, 0.05, 0.15))      # челеста
ICE = ((1, 1, 1), (2.0, 0.3, 0.55), (3.0, 0.12, 0.35), (4.07, 0.07, 0.25))    # лёд


def bell(m, vel=0.5, tau=1.0, partials=BELL):
    f = hz(m)
    n = int(min(4.5 * tau, 4.5) * SR)
    t = tt(n)
    x = np.zeros(n)
    for r, a, tf in partials:
        if r * f < 17000:
            x += a * np.sin(2 * np.pi * r * f * t + rng.random() * 6.28) * np.exp(-t / (tau * tf))
    return x * (1 - np.exp(-t / 0.0008)) * vel


def slow_bell(m, dur, vel=0.5, bend=-1.0, tau=2.6):
    """колокол замедления: высота медленно уходит вниз"""
    f = hz(m)
    n = int(dur * SR)
    t = tt(n)
    k = 2 ** (bend / 12 * np.clip(t / dur, 0, 1) ** 0.7)
    x = np.zeros(n)
    for r, a, tf in ((1, 1, 1), (2.0, 0.35, 0.6), (2.76, 0.3, 0.45), (5.4, 0.12, 0.25)):
        if r * f < 16000:
            x += a * np.sin(2 * np.pi * np.cumsum(f * r * k) / SR + rng.random() * 6.28) * np.exp(-t / (tau * tf))
    return x * (1 - np.exp(-t / 0.002)) * vel


def heartbeat(vel=0.8):
    n = int(0.55 * SR)
    t = tt(n)
    out = np.zeros(n)
    for d, a, f0 in ((0.0, 1.0, 60), (0.17, 0.7, 54)):
        u = t - d
        m_ = u >= 0
        uu = u[m_]
        fr = f0 * (1 + 0.6 * np.exp(-uu / 0.025))
        out[m_] += a * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-uu / 0.11) * (1 - np.exp(-uu / 0.004))
    return np.tanh(1.5 * out) / np.tanh(1.5) * vel


def drone(m, dur, vel=0.5, att=0.5, rel=0.4):
    f = hz(m)
    n = int(dur * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t + 1) + 0.12 * np.sin(2 * np.pi * 3 * f * t + 2)
    return x * np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1) * vel


def rev_swell(dur, vel=1.0):
    n = int(dur * SR)
    return crash(vel, dur * 0.45)[:n][::-1].copy()


def thump(f0, f1, tau, n_s, dec=0.03):
    n = n_s if isinstance(n_s, (int, np.integer)) else int(round(n_s * SR))
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / dec)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0008))


def bp_noise(n, f0, q, tau, att=0.0005, power=2):
    t = tt(n)
    return ffilt(noise(n), rbj("bp", f0, q), power=power) * np.exp(-t / tau) * (1 - np.exp(-t / att))


def orch_hit(root_m, minor=True, bright=1.2, tail=0.3, spread=0.7, timp=True):
    """оркестровый удар (стерео): аккорд меди с мгновенной яркостью, шумовой «хлёст», литавра"""
    third = 3 if minor else 4
    notes = [root_m - 12, root_m, root_m + 7, root_m + 12, root_m + 12 + third, root_m + 19, root_m + 24]
    xs = [brass(m, 0.04, 1.0, bright, att=0.002, rel=tail, fatt=0.002) for m in notes]
    n = max(len(x) for x in xs) + int(0.05 * SR)
    Lc, Rc = np.zeros(n), np.zeros(n)
    for j, x in enumerate(xs):
        gl, gr = pan_lr((2 * j / (len(notes) - 1) - 1) * spread)
        Lc[:len(x)] += x * gl
        Rc[:len(x)] += x * gr
    nz = 0.9 * bp_noise(n, 1700, 0.7, 0.03)
    Lc += nz
    Rc += nz
    if timp:
        tp = 1.5 * thump(hz(root_m - 12) * 1.8, hz(root_m - 12), 0.3, n, 0.025)
        Lc += tp
        Rc += tp
    return np.stack([Lc, Rc]) * 0.5


def chip(m, dur, vel=1.0, even=0.35, glide=0.0, rel=0.03):
    """«чиптюн»: квадрат/пульс с глиссандо glide полутонов"""
    f = hz(m)
    n = int((dur + rel * 4) * SR)
    t = tt(n)
    fr = f * 2 ** (glide * np.clip(t / max(dur, 1e-3), 0, 1) / 12) if glide else f
    x = osc(htable(f * 2 ** (max(0.0, glide) / 12) * 1.01, "square", 12, 40, even), fr, n, rng.random())
    return x * np.minimum(1, t / 0.003) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel)) * vel


def metal(parts, n_s, att=0.0005):
    n = n_s if isinstance(n_s, (int, np.integer)) else int(round(n_s * SR))
    t = tt(n)
    x = np.zeros(n)
    for f, a, tau in parts:
        if f < 18000:
            x += a * np.sin(2 * np.pi * f * t + rng.random() * 6.28) * np.exp(-t / tau)
    return x * (1 - np.exp(-t / att))


def whoosh(dur, f_fn, q=1.5, peak=0.5, width=0.25):
    n = int(dur * SR)
    t = tt(n)
    x = stft_bp(noise(n), f_fn, q, nfft=512, hop=128)
    env = np.exp(-((t / dur - peak) / width) ** 2) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
    return x * env


def gong(f0, dur=2.6):
    n = int(dur * SR)
    t = tt(n)
    x = np.zeros(n)
    for r, a, tf in ((1, 1, 1), (1.47, .7, .85), (2.09, .6, .7), (2.56, .5, .6), (3.18, .4, .5), (3.92, .32, .42),
                     (4.73, .25, .35), (5.61, .2, .3), (6.8, .14, .25), (8.2, .1, .2)):
        for dd in (-0.6, 0.6):
            x += 0.5 * a * np.sin(2 * np.pi * (f0 * r + dd) * t + rng.random() * 6.28) * np.exp(-t / (1.3 * tf))
    x += ffilt(noise(n), rbj("bp", 3500, 0.6)) * 0.25 * (1 - np.exp(-t / 0.12)) * np.exp(-t / 0.7)
    x += 0.5 * thump(f0 * 1.5, f0, 0.08, n, 0.01)
    return x * (1 - np.exp(-t / 0.002))


# ---------- шины: три слоя (до остановки ленты, до K.O., после K.O.), у каждого свой ревербератор ----------
class Layer:
    def __init__(self, t0, t1):
        self.i0 = int(round(t0 * SR))
        self.n = int(round(t1 * SR)) - self.i0
        self.bus = {k: np.zeros((2, self.n)) for k in ("kick", "bass", "main")}
        self.send = np.zeros(self.n)


R_TS = STOP + TS_SRC
LAYERS = [Layer(0, R_TS + 0.03), Layer(R_TS - 0.03, KO + 0.03), Layer(KO - 0.03, TOTAL)]


def layer_of(t):
    return LAYERS[0] if t < R_TS - 1e-4 else LAYERS[1] if t < KO - 1e-4 else LAYERS[2]


def put(busname, t, x, pan=0.0, send=0.15, gain=1.0):
    lay = layer_of(t)
    i = int(round(t * SR)) - lay.i0
    j0, j1 = max(0, -i), min(len(x), lay.n - i)
    if j1 <= j0:
        return
    seg = x[j0:j1] * gain
    gl, gr = pan_lr(pan)
    B = lay.bus[busname]
    B[0, i + j0:i + j1] += seg * gl
    B[1, i + j0:i + j1] += seg * gr
    if send:
        lay.send[i + j0:i + j1] += seg * send


def put2(busname, t, X, send=0.15, gain=1.0):
    lay = layer_of(t)
    i = int(round(t * SR)) - lay.i0
    j0, j1 = max(0, -i), min(X.shape[1], lay.n - i)
    if j1 <= j0:
        return
    lay.bus[busname][:, i + j0:i + j1] += X[:, j0:j1] * gain
    if send:
        lay.send[i + j0:i + j1] += (X[0, j0:j1] + X[1, j0:j1]) * 0.5 * gain * send


# инструменты на шинах
def p_bass(t, m, dur, vel=0.7, bright=1.0):
    put("bass", t, sbass(m, dur, vel, bright), 0.0, 0.0, 0.42)


def p_brass(t, m, dur, vel=0.6, pan=0.0, bright=1.0, send=0.22):
    put("main", t, brass(m, dur, vel, bright), pan, send, 0.30)


def p_lead(t, m, dur, vel=0.6, pan=0.05):
    put("main", t, lead(m, dur, vel), pan, 0.25, 0.28)


def p_pluck(t, m, vel=0.5, pan=0.3, tau=0.12):
    put("main", t, pluck(m, vel, tau), pan, 0.25, 0.16)


def p_bell(t, m, vel=0.4, tau=1.0, pan=0.0, send=0.45, parts=BELL):
    put("main", t, bell(m, vel, tau, parts), pan, send, 0.25)


def d_kick(t, v):
    put("kick", t, kick(v), 0.0, 0.04)


def d_snare(t, v):
    put("main", t, snare(v), 0.05, 0.2)


def d_clap(t, v):
    put("main", t, clap(v), -0.05, 0.15)


def d_hat(t, v):
    put("main", t, hat(v), 0.3, 0.04)


def d_ohat(t, v):
    put("main", t, hat(v, True), 0.3, 0.06)


def d_rim(t, v):
    put("main", t, rim(v), -0.15, 0.1)


def d_shk(t, v):
    put("main", t, shaker(v), -0.4, 0.05)


def d_tom(t, v, m):
    put("main", t, tom(m, v), -0.2, 0.15)


def d_wood(t, v, hi):
    put("main", t, woodblock(81 if hi else 74, v), 0.35 if hi else -0.35, 0.12, 0.55)


def d_crash(t, v=0.6, tau=1.0):
    put("main", t, crash(v, tau), 0.25, 0.2)


def chord(name, lo, n):
    r, iv = CH[name]
    pcs = {(r + i) % 12 for i in iv}
    out, m = [], lo
    while len(out) < n:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def root(name, lo=31):
    r = CH[name][0]
    return lo + ((r - lo) % 12)


def pad_chord(t, name, dur, vel=0.4, lo=55, n=4, fc=1600, att=0.35, rel=0.5, det=(-9, 0, 8), trem=0.0):
    for j, m in enumerate(chord(name, lo, n)):
        f = hz(m)
        nn = int((dur + rel * 4) * SR)
        tv = tt(nn)
        env = np.minimum(1, tv / att) ** 1.5 * np.where(tv < dur, 1, np.exp(-(tv - dur) / rel))
        if trem:
            env = env * (1 - 0.45 * (0.5 + 0.5 * np.sin(2 * np.pi * trem * tv + j)))
        tb = htable(f * 1.01, "saw", fc / f, 40)
        for k, d in enumerate(det):
            fd = f * 2 ** (d / 1200) * (1 + 0.0015 * np.sin(2 * np.pi * (0.3 + 0.1 * k) * tv + j))
            x = osc(tb, fd, nn, rng.random()) * env
            put("main", t, x, [-0.55, 0.0, 0.55][k % 3] * (0.4 + 0.2 * j), 0.4, 0.085 * vel)


def stab(t, name, lo=57, n=4, dur=0.12, vel=0.6, bright=1.1):
    for j, m in enumerate(chord(name, lo, n)):
        p_brass(t + j * 0.003, m, dur, vel, -0.4 + 0.8 * j / max(1, n - 1), bright)


def grid_ceil(t, anchor, step):
    return anchor + np.ceil((t - anchor) / step - 1e-6) * step


def snare_roll(ta, tb_, step, v0=0.15, v1=0.7):
    t = ta
    while t < tb_ - 0.01:
        u = (t - ta) / max(1e-3, tb_ - ta)
        d_snare(t, v0 + (v1 - v0) * u ** 1.5)
        t += step


def riser(ta, tb_, vel=0.15):
    d = tb_ - ta
    n = int(d * SR)
    u = tt(n) / d
    rz = stft_bp(noise(n), lambda tc: 300 * 20 ** min(1.0, tc / d), 1.4) * u ** 2.2 * vel
    put("main", ta, rz, 0.0, 0.25)


# ---------- такт по шаблонам (16 шагов) ----------
DV = {"X": 1.0, "x": 0.75, "o": 0.5}
DRUMS = {"kick": d_kick, "snare": d_snare, "clap": d_clap, "hat": d_hat, "ohat": d_ohat, "rim": d_rim, "shk": d_shk}


def runs(pat):
    out = []
    for s, ch in enumerate(pat):
        if ch in ".-":
            continue
        ln = 1
        while s + ln < len(pat) and pat[s + ln] == "-":
            ln += 1
        out.append((s, ch, ln))
    return out


# бас в шаблоне: r/R — тоника, o/O — октава, f/F — квинта, t — малая терция, b — малая секунда (фригийская), d — квинта вниз
BASS_IV = {"R": 0, "r": 0, "L": 0, "O": 12, "o": 12, "F": 7, "f": 7, "t": 3, "T": 3, "b": 1, "B": 1, "d": -5}


def bar(tb, bt, name, P, t0, t1, mute=None):
    st = bt / 4
    vs = P.get("vs", 1.0)

    def ok(t):
        return t0 - 1e-4 <= t < t1 - 0.01 and not (mute is not None and mute(t))

    rt = P["bass_root"] if "bass_root" in P else root(name, P.get("bass_lo", 31))
    for inst in ("kick", "snare", "clap", "hat", "ohat", "rim", "shk", "tom", "wood"):
        pat = P.get(inst)
        if not pat:
            continue
        for s, ch, ln in runs(pat):
            ts = tb + s * st
            if not ok(ts):
                continue
            v = DV[ch] * vs * P.get(inst + "_v", 1.0)
            if inst == "tom":
                d_tom(ts, v, P.get("tom_m", rt + 12))
            elif inst == "wood":
                d_wood(ts, v, ch == "X")
            else:
                DRUMS[inst](ts, v)
    pat = P.get("bass")
    if pat:
        for s, ch, ln in runs(pat):
            ts = tb + s * st
            if not ok(ts):
                continue
            m = rt + BASS_IV[ch]
            d = min(ln * st * (0.45 if P.get("bass_short") else 0.92), t1 - ts)
            p_bass(ts, m, d, (0.9 if ch.isupper() else 0.65) * vs * P.get("bass_v", 1.0), P.get("bass_bright", 1.0))
    pat = P.get("arp")
    if pat:
        tones = chord(name, P.get("arp_lo", 62), P.get("arp_n", 6))
        seq = list(range(len(tones))) + (list(range(len(tones) - 2, 0, -1)) if P.get("arp_seq") == "updown" else [])
        for k, (s, ch, ln) in enumerate(runs(pat)):
            ts = tb + s * st
            if not ok(ts):
                continue
            m = tones[seq[k % len(seq)]]
            v = (0.55 if ch.isupper() else 0.4) * vs * P.get("arp_v", 1.0)
            if P.get("arp_inst") == "bell":
                p_bell(ts, m, v, P.get("bell_tau", 0.7), 0.35 if k % 2 else -0.35, 0.4, CEL)
            else:
                p_pluck(ts, m, v, 0.35 if k % 2 else -0.35)
    pat = P.get("stab")
    if pat:
        for s, ch, ln in runs(pat):
            ts = tb + s * st
            if ok(ts):
                stab(ts, name, P.get("stab_lo", 57), 4, ln * st * 0.85, (0.65 if ch.isupper() else 0.45) * vs * P.get("stab_v", 1.0))
    pd = P.get("pad")
    if pd:
        a, b_ = max(tb, t0), min(tb + 4 * bt, t1)
        if b_ - a > 0.05:
            q = dict(pd)
            q["vel"] = q.get("vel", 0.3) * vs
            pad_chord(a, name, b_ - a, **q)
    if P.get("crash") and ok(tb):
        d_crash(tb, P["crash"], 1.0)


def section(t0, t1, bt, fn, anchor=None, mute=None):
    """такты сетки с опорой anchor (сильная доля) в [t0, t1); fn(i, j, kk, tb) -> (аккорд, шаблон):
    i — номер такта с начала отрезка, j — с конца (0 — последний), kk — от опоры"""
    a = t0 if anchor is None else anchor
    bl = 4 * bt
    k0 = int(np.floor((t0 - a) / bl + 1e-6))
    kl = int(np.ceil((t1 - a) / bl - 1e-6)) - 1
    for kk in range(k0, kl + 1):
        tb = a + kk * bl
        name, P = fn(kk - k0, kl - kk, kk, tb)
        if P:
            bar(tb, bt, name, P, t0, t1, mute)




CH = {"Cm": (0, [0, 3, 7]), "Bb": (10, [0, 4, 7]), "Ab": (8, [0, 4, 7]), "G": (7, [0, 4, 7]), "G7": (7, [0, 4, 7, 10]),
      "Fm": (5, [0, 3, 7]), "Db": (1, [0, 4, 7]), "Abmaj7": (8, [0, 4, 7, 11]), "Gsus4": (7, [0, 5, 7]),
      "Eb": (3, [0, 4, 7]), "Bbm": (10, [0, 3, 7]), "C": (0, [0, 4, 7]), "C7b9": (0, [0, 4, 7, 10, 13]),
      "Dbmaj7": (1, [0, 4, 7, 11]), "Fsus2": (5, [0, 2, 7]), "Gm": (7, [0, 3, 7]), "Ebmaj7": (3, [0, 4, 7, 11]),
      "Cm6": (0, [0, 3, 7, 9]), "D7": (2, [0, 4, 7, 10]), "Am": (9, [0, 3, 7]), "F": (5, [0, 4, 7]), "E": (4, [0, 4, 7]),
      "A": (9, [0, 4, 7]), "Amadd9": (9, [0, 3, 7, 14]), "Em7": (4, [0, 3, 7, 10]), "Fmaj7": (5, [0, 4, 7, 11]),
      "Csus4": (0, [0, 5, 7]), "Cdark": (0, [0, 1, 7]), "C69": (0, [0, 4, 7, 9, 14])}
PAD_DARK = dict(vel=0.32, lo=48, fc=800, att=0.4, rel=0.15, det=(-12, 0, 11))


def p_chip(t, m, dur, vel=0.5, pan=0.0, send=0.2, even=0.35):
    put("main", t, chip(m, dur, vel, even), pan, send, 0.16)


# ---------- заставка: удар логотипа и джингл до минор ----------
INTRO_HOOK = [(0, .75, 79), (.75, .75, 84), (1.5, .5, 82), (2, .5, 80), (2.5, .5, 79), (3, 1, 75),
              (4, .5, 77), (4.5, .5, 79), (5, .5, 80), (5.5, .5, 82), (6, 1, 83), (7, .25, 79), (7.25, .25, 77), (7.5, .5, 74)]
INTRO_CH = [(0, "Cm", 2), (2, "Ab", 2), (4, "Bb", 2), (6, "G", 2)]
put2("main", IA, orch_hit(48, True, 1.3, 0.35), 0.25, 0.55)
d_crash(IA, 0.7, 1.2)
for b_, d, m in INTRO_HOOK:
    p_lead(IA + b_ * bi, m, d * bi * 0.92, 0.6)
    p_chip(IA + b_ * bi, m - 12, d * bi * 0.85, 0.45, -0.2)
for b_, name, d in INTRO_CH:
    t = IA + b_ * bi
    pad_chord(t, name, d * bi, 0.38, 55, 4, fc=2200, att=0.05, rel=0.3)
    stab(t, name, 55, 4, 0.12, 0.55)
    stab(t + 1.5 * bi, name, 55, 4, 0.1, 0.4)              # пунктирный отыгрыш меди
    for bb, iv, v in ((0, 0, 0.9), (0.75, 0, 0.6), (1.5, 12, 0.75)):
        p_bass(t + bb * bi, root(name) + iv, (0.6 if bb < 1.5 else 0.45) * bi, v)
put2("main", IA + 6 * bi, orch_hit(43, False, 1.2, 0.3), 0.25, 0.4)
for b_ in (0, 0.75, 2, 2.75, 4, 4.75, 6, 6.75):
    d_kick(IA + b_ * bi, 0.95)
for b_ in (1, 3, 5):
    d_snare(IA + b_ * bi, 0.75)
for k in range(14):
    d_hat(IA + k * bi / 2, 0.55 if k % 2 else 0.35)
d_crash(IA + 6 * bi, 0.6, 1.0)
for k, m in enumerate((55, 52, 48, 45)):
    d_tom(IA + (7 + 0.25 * k) * bi, 0.55 + 0.08 * k, m)
mark("intro", IA)
mark("intro_G", IA + 6 * bi)

# ---------- двор: строки 1–6 ----------
COURT_CH = ["Cm", "Bb", "Ab", "G", "Fm", "Cm", "Db", "G"]
P_COURT_A = dict(kick="x.......x.......", snare="........o.......", hat="..o...o...o...o.", bass="R..r..o.R..r..f.", bass_v=0.9,
                 stab="s...............", stab_v=0.7, stab_lo=55, pad=dict(vel=0.3, lo=55, fc=1300))
P_COURT_B = dict(kick="x..x....x.x.....", snare="....o.......o...", hat="x.o.x.o.x.o.x.o.", bass="R..r..o.R..r..fo",
                 arp="a..a..a.a..a..a.", arp_lo=60, arp_n=5, arp_v=0.75, stab="s.......s.......", stab_v=0.6, stab_lo=55,
                 pad=dict(vel=0.27, lo=55, fc=1400))
section(C0, R1 - 0.01, bi, lambda i, j, kk, tb: (COURT_CH[kk % 8], P_COURT_A if tb < L(5) - 0.5 else P_COURT_B))
snare_roll(grid_ceil(R1 - 2 * bi, C0, bi / 4), R1 - 0.02, bi / 4, 0.12, 0.5)
# подъём меди по G7 в паузе 6|7
st_ = bi / 4
tl = grid_ceil(E(6) + 0.04, C0, st_)
LICK = [67, 71, 74, 77, 79, 83]
for j, m in enumerate(LICK):
    tj = tl + j * 2 * st_
    if tj > R1 - 0.12:
        break
    last = j == len(LICK) - 1 or tl + (j + 1) * 2 * st_ > R1 - 0.12
    d = max(2 * st_, R1 - 0.04 - tj) if last else 2 * st_ * 0.9
    p_lead(tj, m, d, 0.5)
    p_brass(tj, m - 12, d, 0.32, 0.0)
mark("court", C0)
mark("court_lick", tl)


# ---------- раунды ----------
def pre(R, Fa, key, tom_m):
    """ROUND: педаль тоники с фригийской второй ступенью, томы, тиканье; сетка с опорой на FIGHT, стоп на 1/16 до него"""
    end = Fa - b0 / 4

    def fn(i, j, kk, tb):
        if j >= 3:
            P = dict(tom="x.......x.......", tom_m=tom_m, hat="....o.......o...", bass="L---------------", bass_v=0.75, pad=PAD_DARK)
        elif j == 2:
            P = dict(tom="x.......x..x....", tom_m=tom_m, hat="o...o...o...o...", bass="r-------b-------", bass_v=0.8, pad=PAD_DARK)
        elif j == 1:
            P = dict(kick="x...x...x...x...", tom="..x...x...x...x.", tom_m=tom_m, hat="o.o.o.o.o.o.o.o.",
                     bass="r.r.r.r.b.b.b.b.", bass_short=True, pad=PAD_DARK)
        else:
            P = dict(kick="x.x.x.x.x.x.x.x.", hat="xoxoxoxoxoxoxoxo", bass="r.r.b.b.r.r.bbbb", bass_short=True, pad=PAD_DARK)
        return key, P

    section(R + 0.12, end, b0, fn, anchor=Fa)
    snare_roll(max(Fa - 4 * b0, grid_ceil(R + 0.3, Fa, b0 / 4)), end, b0 / 4, 0.15, 0.75)
    riser(max(R + 0.3, Fa - 6 * b0), end + 0.01, 0.12)


# ROUND 1 → FIGHT 1 (лев), до минор
pre(R1, F1a, "Cm", 43)
P_LION = dict(kick="X.....X...X.....", snare="........X.......", clap="........o.......", hat="x.x.x.x.x.x.x.x.",
              ohat="......o.........", bass="R..r..t.R..r..b.", bass_root=36, stab="....S.......s...", stab_v=0.8, stab_lo=55,
              pad=dict(vel=0.2, lo=55, fc=1600, att=0.1, rel=0.3))
LION_CH = ["Cm", "Cm", "Db", "Cm"]
section(F1a, QUIET1, b0, lambda i, j, kk, tb: (LION_CH[kk % 4], dict(P_LION, crash=0.7) if kk == 0 else P_LION), anchor=F1a)
P_GLANCE = dict(kick="x.......x.......", hat="....o.......o...", rim="..o...........o.", bass="R-------b-------", bass_v=0.8,
                pad=dict(vel=0.3, lo=50, fc=900, att=0.3, rel=0.2))
section(QUIET1, Z1, b0, lambda i, j, kk, tb: ("Cm", P_GLANCE), anchor=F1a)
# лень льва: пульс разрежается
LAZY_CH = ["Cm", "Abmaj7", "Fm", "Gsus4"]
P_LAZY1 = dict(kick="x.......x.......", hat="o.......o.......", bass="R-------r-------", pad=dict(vel=0.3, lo=55, fc=1200))
P_LAZY2 = dict(kick="x...............", bass="R---------------", bass_v=0.8, pad=dict(vel=0.3, lo=55, fc=1000),
               arp="a.......a.......", arp_inst="bell", arp_lo=67, arp_n=4, arp_v=0.8, bell_tau=1.0)
section(Z1, LIE1 + 0.2, b0, lambda i, j, kk, tb: (LAZY_CH[kk % 4], P_LAZY1 if i == 0 else P_LAZY2), anchor=Z1)
P_SLEEP = dict(bass="R---------------", bass_v=0.6, pad=dict(vel=0.3, lo=55, fc=900, att=0.6))
section(LIE1 + 0.2, R2 - 0.01, b0, lambda i, j, kk, tb: (["Abmaj7", "Cm"][kk % 2], P_SLEEP), anchor=Z1)
_sb = grid_ceil(LIE1 + 0.2, Z1, 4 * b0)                  # бас недостроенного такта, с которого начинается сон
p_bass(LIE1 + 0.2, root(["Abmaj7", "Cm"][int(round((_sb - Z1) / (4 * b0))) % 2 - 1]), _sb - LIE1 - 0.25, 0.6)
for k, m in enumerate((84, 79, 75, 79, 72)):             # колыбельная челесты над спящим львом («Zzz»)
    tk = E(16) + 0.08 + k * b0 / 2 + (b0 / 4 if k == 4 else 0)
    if tk < L(17) - 0.1:
        p_bell(tk, m, 0.6, 1.0, 0.3 - 0.15 * k, 0.45, CEL)
mark("round1", R1)
mark("fight1", F1a)
mark("glance", QUIET1)
mark("lazy", Z1)
mark("sleep", LIE1 + 0.2)

# ROUND 2 → FIGHT 2 (тигр), фа минор на педали фа
pre(R2, F2a, "Fm", 48)
P_TIG = dict(kick="X..x..X...X..x..", snare="....X.......X...", hat="xxoxxxoxxxoxxxox", bass="RrorRrtrRrorRrfr", bass_root=41,
             bass_short=True, stab="S.....S.....S...", stab_v=0.75, stab_lo=57, arp="aaaaaaaaaaaaaaaa", arp_v=0.55, arp_lo=65,
             arp_n=6, pad=dict(vel=0.2, lo=57, fc=1800, att=0.1, rel=0.3))
P_TIGF = dict(P_TIG, snare="....X.......XoXX", kick="X..x..X...X..xxx")
TIG_CH = ["Fm", "Fm", "Db", "Eb"]
section(F2a, HOWL - 0.02, b0, lambda i, j, kk, tb: (TIG_CH[kk % 4], dict(P_TIG if kk % 4 != 3 else P_TIGF, crash=0.75 if kk == 0 else 0)),
        anchor=F2a)
# «Завыл»: брейк — барабаны молчат, низ фа и тарелка; грув снова с ближайшей доли после воя
RES2 = grid_ceil(max(E(22), HOWL + HOWL_D) - 0.05, F2a, b0)
d_crash(HOWL + FRAME, 0.8, 1.6)
p_bass(HOWL + FRAME, 41, RES2 - HOWL - 0.12, 0.9, 0.6)
pad_chord(HOWL, "Bbm", RES2 - HOWL, 0.3, 50, 4, fc=900, att=0.05, rel=0.2)
d_crash(RES2, 0.55, 1.0)
section(RES2, CIRC0, b0, lambda i, j, kk, tb: (["Fm", "Db", "Bbm", "Fm"][kk % 4], P_TIG), anchor=F2a)
# «Тихо владельца обходит»: крадущийся остинато на педали фа
OST_CH = ["Fm", "Dbmaj7", "Bbm", "C7b9"]
P_OST = dict(kick="x.......x.......", rim="....o.......o...", hat="..o...o...o...o.", bass="r.f.t.f.r.f.b.f.", bass_root=41,
             bass_short=True, arp="a...a...a...a...", arp_lo=60, arp_n=4, arp_v=0.9, pad=dict(vel=0.24, lo=53, fc=900, att=0.2, rel=0.2))
section(CIRC0, GRUM0, b0, lambda i, j, kk, tb: (OST_CH[kk % 4], P_OST), anchor=CIRC0)
# «раб пред владыкой… ворчит и злится»: тяжёлый half-time; «невольно ложится» — сдувается
P_GRUM = dict(kick="X.......X.......", clap="........X.......", snare="........o.......", tom="......x.......x.", tom_m=41,
              bass="L-------b-------", bass_root=41, stab="S...............", stab_v=0.7, stab_lo=53, pad=PAD_DARK)
section(GRUM0, NEVOL, b0, lambda i, j, kk, tb: (["Fm", "Db"][kk % 2], P_GRUM), anchor=GRUM0)
P_DEFL = dict(kick="x...............", bass="R-------d-------", bass_root=41, bass_v=0.7, pad=dict(vel=0.28, lo=53, fc=800, att=0.3, rel=0.3))
section(NEVOL, LIE2 + 0.3, b0, lambda i, j, kk, tb: ("Fm", P_DEFL), anchor=NEVOL)
P_DRAW = dict(bass="R---------------", bass_v=0.6, pad=dict(vel=0.32, lo=55, fc=1400, att=0.4),
              arp="a.......a.......", arp_inst="bell", arp_lo=72, arp_v=0.6)
section(LIE2 + 0.3, STOP + TS_SRC + 0.02, b0, lambda i, j, kk, tb: ("Fsus2", P_DRAW), anchor=DRAW + FRAME)
mark("round2", R2)
mark("fight2", F2a)
mark("howl_break", HOWL + FRAME)
mark("groove_back", RES2)
mark("ostinato", CIRC0)
mark("grumble", GRUM0)
mark("draw", LIE2 + 0.3)
mark("tape_stop", STOP)

# «Сверху тогда упади…»: тишина после остановки ленты, высокий пэд, колокола по одному вниз вслед за перчаткой
SL = LAND - SLOW0
FALL_B = [96, 91, 89, 84, 80, 77, 72]
for k, m in enumerate(FALL_B):
    tk = SLOW0 + 0.1 + k * (SL - 0.9) / (len(FALL_B) - 1)
    d = min(2.0, LAND - tk + 0.3)
    put("main", tk, slow_bell(m, d, 0.42, -0.6, 1.6) * np.clip((d - tt(int(d * SR))) / 0.3, 0, 1), 0.45 * (-1) ** k, 0.6, 0.22)
pad_chord(SLOW0 + 0.05, "Dbmaj7", SL - 0.35, 0.3, 72, 4, fc=3000, att=1.0, rel=0.2)
put("bass", SLOW0, drone(41, SL, 0.18, 1.0, 0.5), 0.0, 0.05, 0.4)
put("main", LAND + FRAME - 1.2, rev_swell(1.2, 0.9), 0.0, 0.3, 0.7)
# перчатка в песке: ожидание на Gsus4
pad_chord(LAND + 0.05, "Gsus4", SLY0 - LAND, 0.3, 55, 4, fc=1200, att=0.3, rel=0.2)
p_bass(LAND + 0.05, 43, SLY0 - LAND - 0.1, 0.5)
mark("slowmo", SLOW0)
mark("glove_wait", LAND + 0.05)

# лукавая тема Кунигунды: соль минор
SLY_CH = ["Gm", "Ebmaj7", "Cm6", "D7"]
SLY_HOOK = [(0, .25, 74), (.25, .25, 75), (.5, .25, 74), (.75, .25, 73), (1, .5, 74), (1.5, .5, 70), (2, .5, 67), (2.5, .5, 66)]
for b_, d, m in SLY_HOOK:
    tj = SLY0 + b_ * b0
    if tj > L(35) - 0.1:
        break
    p_chip(tj, m, d * b0 * 0.8, 0.55, 0.15)
    p_pluck(tj, m - 12, 0.4, -0.2)
P_SLY = dict(kick="x.........x.....", clap="....o.......o...", clap_v=0.6, hat="..o...o...o...o.", bass="R...f...r..t.f..",
             bass_short=True, bass_v=0.9, arp="a..a....a..a....", arp_lo=67, arp_n=4, arp_v=0.8, pad=dict(vel=0.22, lo=57, fc=1300))
P_SLY2 = dict(P_SLY, arp="a..a..a.a.......", arp_inst="bell", arp_lo=74, arp_v=0.7, bell_tau=0.7)
section(SLY0, BONUS - 0.01, b0, lambda i, j, kk, tb: (SLY_CH[kk % 4], P_SLY if tb < L(37) - 0.3 else P_SLY2), anchor=SLY0)
# «БОНУСНЫЙ РАУНД»: пэд E и сбивка томами к бегу рыцаря
pad_chord(BONUS + 0.05, "E", KW0 - BONUS, 0.3, 52, 4, fc=1200, att=0.2, rel=0.15)
p_bass(BONUS + 0.05, 40, KW0 - BONUS - 0.1, 0.6)
tf, k = BONUS + 0.5, 0
while tf < KW0 - 0.02:
    d_tom(tf, 0.35 + 0.05 * k, 45 + 2 * (k // 2))
    tf += b0 / 4
    k += 1
mark("sly", SLY0)
mark("bonus", BONUS)

# бег рыцаря: ля минор, бас и хэт шестнадцатыми; FIGHT 3 — бой
P_RUN = dict(kick="x...x...x...x...", hat="xxxxxxxxxxxxxxxx", hat_v=0.8, bass="RrRrOrRrRrRrOrRr", bass_short=True, bass_v=0.85,
             pad=dict(vel=0.2, lo=57, fc=1500, att=0.05, rel=0.2))
section(KW0, F3a - b0 / 4, b0, lambda i, j, kk, tb: (["Am", "F", "G", "E"][kk % 4], P_RUN), anchor=F3a)
riser(KW0, F3a - b0 / 4 + 0.01, 0.12)
snare_roll(F3a - 2 * b0, F3a - b0 / 4, b0 / 4, 0.2, 0.75)
P_KN = dict(kick="X.....x.X..x....", snare="....X.......X...", hat="x.xxx.xxx.xxx.xx", ohat="..............o.", bass="R.R.O.R.f.R.O.R.",
            stab="..S.....S.....S.", stab_v=0.75, stab_lo=57, arp="aaaaaaaaaaaaaaaa", arp_v=0.55, arp_lo=64, arp_n=6, arp_seq="updown",
            pad=dict(vel=0.2, lo=57, fc=1800, att=0.1, rel=0.3))
P_KNF = dict(P_KN, snare="....X.......XXoX")
KN_CH = ["Am", "Am", "F", "E"]
section(F3a, FLAW + FRAME - 0.01, b0, lambda i, j, kk, tb: (KN_CH[kk % 4], dict(P_KN if kk % 4 != 3 else P_KNF, crash=0.7 if kk == 0 else 0)),
        anchor=F3a)
# FLAWLESS: ля мажор держится до робкой тишины
FA = FLAW + FRAME
pad_chord(FA, "A", FEAR0 - FA, 0.36, 57, 4, fc=2200, att=0.03, rel=0.4)
stab(FA, "A", 57, 4, 0.5, 0.6)
p_bass(FA, 45, FEAR0 - FA - 0.1, 0.8)
d_crash(FA, 0.6, 1.4)
mark("run", KW0)
mark("fight3", F3a)
mark("flawless_A", FA)

# робкое ожидание: сердцебиение и тремоло-пэд
hb = FEAR0
while hb < FEAR1 + 0.3:
    put("bass", hb, heartbeat(0.85), 0.0, 0.03, 0.6)
    hb += 2 * b0
pad_chord(FEAR0, "Amadd9", FEAR1 - FEAR0 + 0.3, 0.3, 57, 4, fc=1400, att=0.6, rel=0.3, trem=6.0)
mark("fear", FEAR0)


# «приносит назад»: подъём к PERFECT
def build_fn(i, j, kk, tb):
    P = dict(kick="x...x...x...x...", snare="....o.......o...", hat="o.o.o.o.o.o.o.o.", bass="r.r.r.r.r.r.r.r.",
             stab="s.......s.......", stab_v=0.6, pad=dict(vel=0.24, lo=55, fc=1400))
    if j == 0:
        P.update(arp="aaaaaaaaaaaaaaaa", arp_v=0.6, arp_lo=64, arp_n=6, hat="xoxoxoxoxoxoxoxo")
    return {-1: "G", -2: "F"}.get(kk, "Am"), P


section(BUILD0, PERFa - 0.01, b0, build_fn, anchor=PERFa)
snare_roll(PERFa - 4 * b0, PERFa - 0.02, b0 / 4, 0.15, 0.7)
riser(PERFa - 4 * b0, PERFa, 0.1)
mark("build", BUILD0)

# хвала: до мажор, затем «нежный, пылающий взгляд»
HV_CH = ["C", "Em7", "Fmaj7", "G"]
P_HV0 = dict(kick="X.....x.X.....x.", snare="....X.......X...", hat="xoxoxoxoxoxoxoxo", bass="R.O.R.O.R.O.f.O.", stab="S.....S.....S...",
             stab_v=0.85, arp="aaaaaaaaaaaaaaaa", arp_v=0.55, arp_lo=67, arp_n=6, arp_seq="updown",
             pad=dict(vel=0.22, lo=57, fc=2000, att=0.05, rel=0.3), crash=0.8)
P_SWEET = dict(kick="x.......x.......", hat="..o...o...o...o.", bass="r...r...f...r...", bass_v=0.8, arp="a.a.a.a.a.a.a.a.",
               arp_inst="bell", arp_lo=72, arp_n=5, arp_v=0.65, arp_seq="updown", pad=dict(vel=0.28, lo=57, fc=1700))
HV1 = min(PERFa + 4 * b0, L(49) - 0.08)                  # полный грув — до «И нежный, пылающий взгляд»
section(PERFa, HV1, b0, lambda i, j, kk, tb: (HV_CH[kk % 4], P_HV0), anchor=PERFa)
section(HV1, E(51) + 0.02, b0, lambda i, j, kk, tb: (HV_CH[kk % 4], P_SWEET), anchor=PERFa)
mark("perfect", PERFa)
mark("sweet", HV1)

# досада: тёмный гул в паузе, на «досады» — медь Db над до, пульс нарастает до броска
pad_chord(DARK0, "Cdark", KO - DARK0, 0.32, 48, 3, fc=700, att=0.6, rel=0.05)
put("bass", DARK0, drone(36, KO - DARK0 + 0.05, 0.25, 1.0, 0.05), 0.0, 0.05, 0.4)
DA = DOSAD + FRAME
put("main", DA - 1.4, rev_swell(1.4, 0.7), 0.0, 0.3, 0.5)    # нарастающий гул к тёмному аккорду
for j, m in enumerate(chord("Db", 49, 4)):
    p_brass(DA + 0.004 * j, m, 1.6, 0.6, -0.4 + 0.27 * j, 0.8, 0.3)
p_bass(DA, 36, 1.5, 0.9, 0.6)
d_crash(DA, 0.5, 1.5)


def dark_fn(i, j, kk, tb):
    if j >= 2:
        P = dict(kick="x.......x.......", bass="r.......b.......", hat="....o.......o...")
    elif j == 1:
        P = dict(kick="x...x...x...x...", bass="r.r.r.r.b.b.b.b.", hat="o.o.o.o.o.o.o.o.", tom="......x.......x.", tom_m=43)
    else:
        P = dict(kick="x.x.x.x.x.x.x.x.", bass="rrrrbbbbrrrrbbbb", hat="xoxoxoxoxoxoxoxo")
    P.update(bass_root=36, bass_short=True)
    return "Cdark", P


section(DA + 2 * b0, THROW, b0, dark_fn, anchor=KO)
put("main", KO - 0.9, rev_swell(0.9, 0.9), 0.0, 0.25, 0.6)
mark("dark", DARK0)
mark("dosada_chord", DA)
mark("ko_cut", KO)

# после K.O.: пауза, затем тихая педаль до (Csus4 → C на «покинул»)
PK = W("w_pokin")
pad_chord(NADOB + 0.35, "Csus4", PK - NADOB - 0.35, 0.28, 55, 4, fc=1000, att=0.8, rel=0.15)
pad_chord(PK, "C", VIC_T - PK, 0.3, 55, 4, fc=1200, att=0.3, rel=0.1)
put("bass", NADOB + 0.35, drone(36, VIC_T - NADOB - 0.35, 0.3, 0.8, 0.1), 0.0, 0.05, 0.4)
mark("post_ko_pedal", NADOB + 0.35)

# ПОБЕДИТЕЛЬ: джингл до мажор
VICT = [(0, .25, 67), (.25, .25, 72), (.5, .25, 76), (.75, .25, 79), (1, .5, 84), (1.5, .5, 79), (2, .5, 81), (2.5, .5, 83), (3, 1.25, 84)]
VICT_CH = [(0, "C", 2), (2, "F", .5), (2.5, "G", .5), (3, "C", 1.25)]
put2("main", VIC_T, orch_hit(48, False, 1.4, 0.3), 0.25, 0.5)
for b_, d, m in VICT:
    p_lead(VIC_T + b_ * b0, m, d * b0 * 0.92, 0.65)
    p_chip(VIC_T + b_ * b0, m - 12, d * b0 * 0.85, 0.45, -0.2)
for b_, name, d in VICT_CH:
    t = VIC_T + b_ * b0
    stab(t, name, 55, 4, 0.14 if b_ < 3 else 1.1 * b0, 0.6)
    pad_chord(t, name, d * b0, 0.4, 55, 4, fc=2200, att=0.03, rel=0.2)
    p_bass(t, root(name), d * b0 * 0.85, 0.85)
    d_kick(t, 0.95)
for b_ in (0.75, 1.5):
    d_kick(VIC_T + b_ * b0, 0.85)
d_snare(VIC_T + b0, 0.7)
snare_roll(VIC_T + 2 * b0, VIC_T + 3 * b0 - 0.01, b0 / 4, 0.25, 0.8)
for k in range(6):
    d_hat(VIC_T + k * b0 / 2, 0.5 if k % 2 else 0.35)
d_crash(VIC_T, 0.6, 0.8)
d_crash(VIC_T + 3 * b0, 0.7, 1.2)
put2("main", VIC_T + 3 * b0, orch_hit(48, False, 1.4, 0.35), 0.25, 0.45)
mark("victory", VIC_T)

# финальная тема: джингл заставки в мажоре (C Ab Bb → C), громче, затухание
FIN_HOOK = [(0, .75, 79), (.75, .75, 84), (1.5, .5, 88), (2, .5, 87), (2.5, .5, 84), (3, 1, 80), (4, .5, 82), (4.5, .5, 86),
            (5, .5, 89), (5.5, .5, 86)]
FIN_CH = [(0, "C", 2), (2, "Ab", 2), (4, "Bb", 2)]
FEND = FT0 + 6 * b0
RING = TOTAL - FEND
put2("main", FT0, orch_hit(48, False, 1.3, 0.35), 0.25, 0.5)
d_crash(FT0, 0.7, 1.2)
for b_, d, m in FIN_HOOK:
    p_lead(FT0 + b_ * b0, m, d * b0 * 0.92, 0.62)
    p_chip(FT0 + b_ * b0, m - 12, d * b0 * 0.85, 0.45, -0.2)
p_lead(FEND, 88, RING - 0.4, 0.58)
p_chip(FEND, 76, RING - 0.5, 0.4, -0.2)
for b_, name, d in FIN_CH:
    t = FT0 + b_ * b0
    pad_chord(t, name, d * b0, 0.42, 55, 4, fc=2200, att=0.05, rel=0.25)
    stab(t, name, 55, 4, 0.12, 0.55)
    stab(t + 1.5 * b0, name, 55, 4, 0.1, 0.4)
    for bb, iv, v in ((0, 0, 0.9), (0.75, 0, 0.6), (1.5, 12, 0.75)):
        p_bass(t + bb * b0, root(name) + iv, (0.6 if bb < 1.5 else 0.45) * b0, v)
pad_chord(FEND, "C69", RING - 0.3, 0.45, 55, 5, fc=2400, att=0.03, rel=0.4)
stab(FEND, "C", 55, 4, RING - 0.5, 0.55)
put2("main", FEND, orch_hit(48, False, 1.4, 0.45), 0.3, 0.5)
p_bass(FEND, 36, RING - 0.3, 0.9)
for b_ in (0, 0.75, 2, 2.75, 4, 4.75):
    d_kick(FT0 + b_ * b0, 0.95)
for b_ in (1, 3):
    d_snare(FT0 + b_ * b0, 0.75)
for k in range(10):
    d_hat(FT0 + k * b0 / 2, 0.55 if k % 2 else 0.35)
snare_roll(FT0 + 5 * b0, FEND - 0.01, b0 / 4, 0.25, 0.85)
d_crash(FEND, 0.8, 1.6)
for j, m in enumerate((84, 88, 91, 96)):
    p_bell(FEND + 0.25 + j * 0.09, m, 0.3, 0.9, -0.4 + 0.27 * j, 0.5)
mark("final_theme", FT0)
mark("final_chord", FEND)


# ---------- ревербератор и сведение слоёв ----------
def make_ir(rt60, length, seed, lp=6500, pre_=0.018):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60)
    ir = ffilt(ir, rbj("lp", lp, 0.6), rbj("hp", 180, 0.6))
    ir *= np.minimum(1, t / 0.006)
    ir = np.concatenate([np.zeros(int(pre_ * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = fast_len(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


IR_M = [make_ir(1.4, 2.0, 11), make_ir(1.4, 2.0, 12)]
IR_S = [make_ir(0.6, 0.9, 21, 7000, 0.008), make_ir(0.6, 0.9, 22, 7000, 0.008)]
WET = 0.45
# под голосом бочку и бас чуть тише (на заставке, в джингле и финале — как есть)
trim_keys = [(0, 0), (C0 - 0.3, 0), (C0, 1), (VIC_T - 0.1, 1), (VIC_T, 0), (TOTAL, 0)]
TRIM = {"kick": 0.7, "bass": 0.8}
music = np.zeros((2, N))
for li, lay in enumerate(LAYERS):
    tl_ = (lay.i0 + np.arange(lay.n)) / SR
    tu = np.interp(tl_, [k[0] for k in trim_keys], [k[1] for k in trim_keys])
    out = np.zeros((2, lay.n))
    for nm, B in lay.bus.items():
        out += B * (1 - tu * (1 - TRIM.get(nm, 1.0)))
    for ch in (0, 1):
        out[ch] += WET * convolve(lay.send, IR_M[ch])
    if li == 0:  # остановка ленты: скорость 1 → 0 за TS_D, звук «съезжает» вниз и гаснет
        i_s = int(round(STOP * SR)) - lay.i0
        nD = int(TS_D * SR)
        tau = np.arange(nD) / SR
        pos = (STOP + tau - tau ** 2 / (2 * TS_D)) * SR - lay.i0
        amp = np.clip(1 - tau / TS_D, 0, 1) ** 0.7
        idx = np.arange(lay.n)
        music[:, lay.i0:lay.i0 + i_s] += out[:, :i_s]
        for ch in (0, 1):
            music[ch, lay.i0 + i_s:lay.i0 + i_s + nD] += np.interp(pos, idx, out[ch]) * amp
        continue
    if li == 1:  # обрыв на K.O.
        out *= np.interp(tl_, [0, KO - 0.01, KO, 1e9], [1, 1, 0, 0])
    j1 = min(N, lay.i0 + lay.n)
    music[:, lay.i0:j1] += out[:, :j1 - lay.i0]
for ch in (0, 1):
    music[ch] = ffilt(music[ch], rbj("hp", 32, 0.7))
T_SYN = time.time() - T_START

# ---------- голос ----------
rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, "voice.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                      capture_output=True, check=True).stdout
voice = np.frombuffer(rawv, dtype="<f4").astype(np.float64)
i_v0 = int(round(V0 * SR))
vfull = np.zeros(N)
vfull[i_v0:i_v0 + len(voice)] = voice[:max(0, N - i_v0)]
SPEECH = [(L(i), E(i)) for i in range(1, NL + 1)]


def ms(chs, wins):  # средний квадрат суммы каналов в окнах
    s = c = 0
    for a, b_ in wins:
        i0, i1 = max(0, int(a * SR)), min(N, int(b_ * SR))
        if i1 > i0:
            s += sum(float(np.sum(x[i0:i1] ** 2)) for x in chs)
            c += i1 - i0
    return s / max(1, c)


def minus(a, b_, cuts):
    segs = [(a, b_)]
    for c0, c1 in cuts:
        nxt = []
        for s0, s1 in segs:
            if c1 <= s0 or c0 >= s1:
                nxt.append((s0, s1))
                continue
            if s0 < c0:
                nxt.append((s0, c0))
            if c1 < s1:
                nxt.append((c1, s1))
        segs = nxt
    return segs


dB = lambda v: 10 * np.log10(max(v, 1e-20))
VCH = [vfull, vfull]                       # в ролике голос моно идёт в оба канала
vMS = ms(VCH, SPEECH)
kv = kweight(vfull)
vKMS = ms([kv, kv], SPEECH)
MCH = [music[0], music[1]]

# ---------- шумы ----------
sfx = np.zeros((2, N))
sfx_send = np.zeros(N)
SFX_LOG, SFX_WIN = [], {}


def sfx_coin_fall(dur):
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    spin = np.abs(np.cos(u * 9)) ** 3                     # как в кадре: монетка переворачивается
    sh = ffilt(noise(n), rbj("bp", 6500, 1.2), power=2) * (0.3 + 0.7 * spin)
    f = 2200 * 2 ** (-u)
    wh = osc(htable(2250, "square", 4, 20, 0.3), f, n) * 0.25
    return (sh * 0.6 + wh) * np.minimum(1, t / 0.05) * np.clip((dur - t) / 0.03, 0, 1) * (0.4 + 0.6 * u)


def sfx_coin_slot():
    n = int(0.9 * SR)
    x = 0.8 * metal([(2350, 1.0, 0.09), (3720, 0.7, 0.06), (5180, 0.5, 0.05), (7400, 0.35, 0.03), (9100, 0.2, 0.02)], n)
    x += 0.5 * bp_noise(n, 4000, 1.0, 0.004)
    for d, m, ln in ((0.05, 84, 0.04), (0.09, 88, 0.04), (0.13, 91, 0.22)):   # «кредит»
        x += 0.3 * place_in(n, d, chip(m, ln, 1.0, 0.4, rel=0.05))
    return x, 0.002


def sfx_logo_hit():
    tail = 1.6
    n = int(tail * SR)
    t = tt(n)
    x = 1.2 * thump(150, 36, 0.45, n, 0.03) + 0.8 * bp_noise(n, 900, 0.7, 0.05)
    x += 0.5 * ffilt(noise(n), rbj("hp", 3000, 0.7)) * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.001))
    return x, 0.004


def sfx_round(key):
    X = orch_hit(key + 12, True, 1.2, 0.3)
    gg = gong(hz(key + 12), 2.0) * 0.6 * np.exp(-tt(int(2.0 * SR)) / 0.8)   # хвост короче: не ложится под строку
    n = max(X.shape[1], len(gg))
    out = np.zeros((2, n))
    out[:, :X.shape[1]] += X
    out[:, :len(gg)] += gg
    return out, 0.004


def sfx_fight(key):
    X = orch_hit(key + 24, True, 1.6, 0.22)
    n = X.shape[1]
    t = tt(n)
    zap = osc(htable(1650, "saw", 6, 30), 1600 * 2 ** (-3 * np.clip(t / 0.18, 0, 1)), n) * np.exp(-t / 0.08) * 0.25
    sn = place_in(n, 0, snare(1.0)) * 0.8
    return X + (zap + sn), 0.004


def sfx_gate(kind):
    heavy, light = kind == "bolt", kind == "bars"
    dur = 1.8
    n = int(dur * SR)
    x = thump(120 if heavy else 150, 42 if heavy else 55, 0.2 if heavy else 0.1, n, 0.015) * (0.9 if heavy else 0.6)
    x += bp_noise(n, 700 if heavy else 900, 0.8, 0.05 if heavy else 0.03) * (0.9 if heavy else 0.7)
    base = 260 if light else 170
    parts = [(base * r * float(rng.uniform(0.98, 1.02)), a, tau) for r, a, tau in
             ((1, 0.5, 0.9), (1.71, 0.45, 0.7), (2.43, 0.4, 0.55), (3.62, 0.35, 0.45), (4.97, 0.3, 0.35), (6.83, 0.22, 0.25),
              (9.1, 0.15, 0.18), (12.3, 0.1, 0.12))]
    x += metal(parts, n) * (0.7 if heavy else 0.55)
    d = 0.07
    for k in range(2 if heavy else 4 if light else 5):   # дребезг решётки
        m = int(0.15 * SR)
        rat = metal([(float(rng.uniform(900, 2600)), 1, 0.03), (float(rng.uniform(2800, 5000)), 0.6, 0.02)], m) + 0.5 * bp_noise(m, 3000, 1.5, 0.006)
        x += 0.35 * 0.75 ** k * place_in(n, d, rat)
        d += float(rng.uniform(0.045, 0.08))
    return x, 0.003


def jitter(n, rate=12, depth=0.06):
    k = int(n / SR * rate) + 3
    return 1 + depth * np.interp(np.arange(n), np.linspace(0, n, k), rng.standard_normal(k))


def growl_src(f0, n, rough=0.4):
    src = osc(htable(float(np.max(f0)), "saw", 30, 80), f0, n, rng.random())
    return src * (1 + rough * np.sin(2 * np.pi * np.cumsum(f0 / 2) / SR))


def formants(x, specs):
    y = np.zeros_like(x)
    for fc, q, g in specs:
        y += g * (stft_bp(x, fc, q) if callable(fc) else ffilt(x, rbj("bp", fc, q)))
    return y


def sfx_yawn():
    dur = 1.5
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    f0 = (92 - 30 * u) * jitter(n, 10, 0.04)
    src = growl_src(f0, n, 0.3)
    exc = src + 0.5 * noise(n)
    y = formants(exc, [(lambda tc: 700 - 250 * min(1, tc / dur), 4.0, 1.0), (lambda tc: 1150 - 380 * min(1, tc / dur), 5.0, 0.55), (2500, 6.0, 0.2)])
    y += 0.5 * ffilt(src, rbj("lp", 280, 0.7))
    return y * np.minimum(1, t / 0.3) ** 1.5 * np.clip((dur - t) / 0.6, 0, 1) ** 1.3


def sfx_lie():
    n = int(0.6 * SR)
    t = tt(n)
    return 0.9 * thump(85, 42, 0.16, n, 0.04) + 0.5 * ffilt(noise(n), rbj("lp", 500, 0.7), power=2) * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.01)), 0.01


def sfx_jump_whoosh(dur):
    return whoosh(dur, lambda tc: 350 + 2200 * np.sin(np.pi * min(1, tc / dur)) ** 1.3, 1.4, 0.45, 0.25)


def sfx_land(soft=False):
    n = int(0.5 * SR)
    t = tt(n)
    x = thump(160, 58, 0.06 if soft else 0.09, n, 0.012) * (0.7 if soft else 1.0) + 0.6 * bp_noise(n, 650, 0.8, 0.045)
    x += 0.35 * ffilt(noise(n), rbj("lp", 900, 0.7), power=2) * np.exp(-t / 0.18) * np.minimum(1, t / 0.01)   # пыль
    return x, 0.004


def sfx_tail():
    dur = 0.22
    n = int(dur * SR)
    t = tt(n)
    sw = stft_bp(noise(n), lambda tc: 1200 * 4 ** min(1, tc / 0.09), 1.6, nfft=512, hop=128) * np.exp(-((t - 0.07) / 0.035) ** 2)
    m = n - int(0.09 * SR)
    crack = place_in(n, 0.09, bp_noise(m, 2600, 0.9, 0.006) * 1.3 + 0.5 * thump(300, 180, 0.015, m, 0.005))
    return 0.6 * sw + crack, 0.091


def sfx_applause(dur):
    n = int((dur + 0.3) * SR)
    out = np.zeros((2, n))
    tpl = []
    for fc in (900, 1200, 1500, 1900, 2300, 2800):
        m = int(0.06 * SR)
        tm = tt(m)
        tpl.append(ffilt(noise(m), rbj("bp", fc, 1.1), power=2) * np.exp(-tm / float(rng.uniform(0.007, 0.012))) * (1 - np.exp(-tm / 0.0005)))
    rate = lambda tc: 42 * min(1, tc / 0.25) * (1 if tc < dur - 0.45 else max(0.0, (dur - tc) / 0.45))
    tc = 0.0
    while True:
        tc += float(rng.exponential(1 / max(rate(tc), 3)))
        if tc >= dur:
            break
        x = tpl[int(rng.integers(0, len(tpl)))] * float(rng.uniform(0.3, 1)) * min(1.0, rate(tc) / 42 + 0.15)
        gl, gr = pan_lr(float(rng.uniform(-0.85, 0.85)))
        i = int(tc * SR)
        j = min(n, i + len(x))
        out[0, i:j] += x[:j - i] * gl
        out[1, i:j] += x[:j - i] * gr
    t = tt(n)
    wash = ffilt(noise(n), rbj("bp", 1600, 0.5)) * 0.06 * np.array([rate(v) / 42 for v in t[::441]]).repeat(441)[:n]
    return out + wash


def sfx_throw():
    return whoosh(0.36, lambda tc: 700 * 5 ** min(1, tc / 0.32), 1.5, 0.8, 0.3)


def sfx_ko():
    tail = 2.4
    n = int(tail * SR)
    t = tt(n)
    slap = 0.6 * bp_noise(n, 1300, 0.8, 0.014) + 0.35 * thump(240, 160, 0.03, n, 0.006)   # мягкий хлопок перчатки
    H = orch_hit(48, True, 1.4, 0.4)
    hit = np.zeros((2, n))
    hit[:, :min(n, H.shape[1])] += H[:, :n]
    crack = 0.8 * ffilt(noise(n), rbj("hp", 2500, 0.7)) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.0005))
    boom = 1.3 * thump(78, 30, 0.7, n, 0.05)
    out = hit + (slap + crack + boom + 0.6 * place_in(n, 0, crash(0.8, 1.1)))
    ech = (hit[0] + hit[1]) * 0.5 + crack
    for k, (d, g, p) in enumerate(((0.3, 0.42, -0.6), (0.6, 0.24, 0.6), (0.9, 0.13, -0.4))):   # эхо «K.O.»
        e = place_in(n, d, ffilt(ech, rbj("lp", 2600 - 600 * k, 0.7))) * g
        gl, gr = pan_lr(p)
        out[0] += e * gl * 1.4
        out[1] += e * gr * 1.4
    return out, 0.004


def sfx_blip():
    return chip(91, 0.025, 1.0, 0.3, rel=0.015), 0.001


def sfx_creak(dur):
    """скрип ворот: трение металла (пила с дрожащей высотой через форманты), прерывистое «зацепление», звяк цепи"""
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    f0 = (300 + 240 * u ** 0.7 + 45 * np.sin(2 * np.pi * 1.7 * t)) * jitter(n, 30, 0.035)
    src = osc(htable(float(np.max(f0)) * 1.02, "saw", 24, 60), f0, n, rng.random())
    k = int(dur * 34) + 3
    grab = np.interp(np.arange(n), np.linspace(0, n, k), rng.uniform(0.15, 1.0, k)) ** 1.5
    y = formants(src * grab, [(1050, 5.0, 1.0), (2250, 6.0, 0.55), (3600, 7.0, 0.3)])
    y += 0.25 * ffilt(noise(n), rbj("bp", 2600, 1.5)) * grab
    chain = np.zeros(n)
    d = 0.03
    while d < dur - 0.1:
        m = int(0.08 * SR)
        chain += 0.25 * place_in(n, d, metal([(float(rng.uniform(1800, 3200)), 1, 0.025), (float(rng.uniform(4200, 6500)), 0.5, 0.015)], m))
        d += float(rng.uniform(0.07, 0.16))
    return (y + chain) * np.minimum(1, t / 0.08) * np.clip((dur - t) / 0.15, 0, 1)


def sfx_paw():
    """тяжёлый шаг льва: низкий удар и песок"""
    n = int(0.55 * SR)
    t = tt(n)
    x = 1.1 * thump(92, 36, 0.14, n, 0.03) + 0.5 * ffilt(noise(n), rbj("lp", 650, 0.7), power=2) * np.exp(-t / 0.08) * (1 - np.exp(-t / 0.005))
    return x, 0.012


def sfx_boot():
    """шаг рыцаря по камню: каблук и звяк доспеха"""
    n = int(0.3 * SR)
    x = 0.8 * thump(230, 120, 0.03, n, 0.005) + 0.6 * bp_noise(n, 1900, 1.0, 0.01)
    x += 0.22 * metal([(float(rng.uniform(3100, 3500)), 1, 0.035), (float(rng.uniform(5200, 5900)), 0.6, 0.025)], n)
    return x, 0.003


def sfx_sand():
    """шаг по песку: мягкий хруст"""
    n = int(0.3 * SR)
    t = tt(n)
    grit = ffilt(noise(n), rbj("bp", 2300, 0.7), power=2) * (0.5 + 0.5 * (rng.random(n) > 0.6))
    return 0.5 * thump(120, 70, 0.04, n, 0.01) + 0.6 * grit * np.minimum(1, t / 0.008) * np.exp(-t / 0.06), 0.012


def sfx_howl():
    """вой тигра: нарастающий воющий синт (три расстроенные пилы, высота вверх, вибрато, «у» → «а») с рыком под ним"""
    dur = HOWL_D
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    rise = np.clip(u / 0.72, 0, 1)
    f0 = 140 * 2 ** (1.3 * rise ** 0.8) * (1 + (0.006 + 0.03 * u) * np.sin(2 * np.pi * 6.2 * t)) * jitter(n, 12, 0.015)
    tb = htable(float(np.max(f0)) * 1.03, "saw", 28, 60)
    syn = sum(osc(tb, f0 * 2 ** (d / 1200), n, rng.random()) for d in (-14, 0, 12)) / 3
    td = 0.72 * dur
    vow = formants(syn, [(lambda tc: 420 + 650 * min(1.0, tc / td), 4.0, 1.0), (lambda tc: 950 + 800 * min(1.0, tc / td), 5.0, 0.55),
                         (2700, 6.0, 0.2)])
    gr = growl_src(f0 * 0.5, n, 0.5) * (1 + 0.4 * np.sin(2 * np.pi * 29 * t)) + 0.6 * noise(n)
    gr = formants(gr, [(780, 3.5, 1.0), (1500, 4.5, 0.4)])
    env = np.minimum(1, t / 0.45) ** 1.7 * np.clip((dur - t) / 0.2, 0, 1)
    return (vow + 0.45 * gr) * env + 0.6 * thump(70, 40, 0.5, n, 0.05)    # низкий удар — тряска кадра


def sfx_grumble():
    """ворчание тигра: низкий рык с колыханием (пасть 0,6 + 0,4·sin 18t)"""
    dur = 1.05
    n = int(dur * SR)
    t = tt(n)
    f0 = (78 + 9 * np.sin(2 * np.pi * 2.9 * t)) * jitter(n, 14, 0.07)
    src = growl_src(f0, n, 0.6)
    am23 = np.sin(2 * np.pi * 23 * t)
    exc = src * (1 + 0.5 * am23) + 0.7 * noise(n) * (0.6 + 0.4 * am23)
    y = formants(exc, [(480, 3.5, 1.0), (980, 4.5, 0.5), (2300, 5.0, 0.15)]) + 0.5 * ffilt(src, rbj("lp", 240, 0.7))
    return y * (0.55 + 0.45 * np.sin(2 * np.pi * 2.9 * t) ** 2) * np.minimum(1, t / 0.08) * np.clip((dur - t) / 0.3, 0, 1)


def sfx_glove_fall(dur):
    """перчатка падает в замедлении: «вжух» при срыве, потом шорох-кувырки (поворот u·11, как gloveState)"""
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    ang = u * 11 + np.sin(u * 6) * 0.5
    flap = 0.3 + 0.7 * np.abs(np.sin(ang)) ** 2
    x = stft_bp(noise(n), lambda tc: 1500 + 1300 * abs(np.cos(11 * min(1.0, tc / dur))), 1.3, nfft=512, hop=128) * flap
    slip = whoosh(0.6, lambda tc: 600 + 2600 * np.sin(np.pi * min(1, tc / 0.6)) ** 1.2, 1.4, 0.4, 0.22)
    env = (0.45 + 0.55 * np.exp(-t / 1.2)) * np.minimum(1, t / 0.03) * np.clip((dur - t) / 0.25, 0, 1)
    return 0.7 * x * env + place_in(n, 0, slip)


def sfx_glove_land():
    """мягкий шлепок перчатки в песок и осыпающийся песок"""
    n = int(0.8 * SR)
    t = tt(n)
    x = 0.8 * thump(115, 55, 0.07, n, 0.012) + 0.7 * ffilt(noise(n), rbj("lp", 900, 0.7), power=2) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.004))
    x += 0.2 * ffilt(noise(n), rbj("bp", 3200, 0.8)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.03)
    return x, 0.006


def sfx_quest():
    """«БОНУСНЫЙ РАУНД»: чип-взлёт, трель и звон"""
    n = int(1.5 * SR)
    x = np.zeros(n)
    for d, m in ((0.0, 79), (0.055, 76), (0.11, 79), (0.165, 84), (0.22, 88)):
        x += place_in(n, d, chip(m, 0.05, 0.45, 0.4))
    for k in range(6):
        x += place_in(n, 0.3 + 0.045 * k, chip(91 if k % 2 == 0 else 93, 0.04, 0.3, 0.4))
    x += place_in(n, 0.58, chip(96, 0.45, 0.32, 0.4, rel=0.15)) + 0.3 * place_in(n, 0.58, bell(100, 1, 0.6))
    return x, 0.002


def sfx_pickup():
    """«дзынь» предмета и «+1»: звон, чип вверх, искры"""
    n = int(1.0 * SR)
    x = 0.45 * place_in(n, 0, bell(100, 1, 0.5))
    x += place_in(n, 0, chip(76, 0.05, 0.42, 0.3, glide=5)) + place_in(n, 0.055, chip(81, 0.05, 0.42)) + \
        place_in(n, 0.11, chip(88, 0.24, 0.4, rel=0.12))
    for k, m in enumerate((96, 100, 103)):
        x += 0.2 * place_in(n, 0.13 + 0.045 * k, bell(m, 1, 0.25))
    return x, 0.002


def sfx_draw():
    """«НИЧЬЯ»: две одинаковые ноты и пустая квинта"""
    n = int(0.9 * SR)
    x = place_in(n, 0, chip(77, 0.08, 0.5, 0.5)) + place_in(n, 0.12, chip(77, 0.08, 0.5, 0.5))
    x += place_in(n, 0.24, chip(72, 0.4, 0.45, 0.5, rel=0.1)) + place_in(n, 0.24, chip(79, 0.4, 0.4, 0.5, rel=0.1))
    return x, 0.002


def sfx_deny():
    """выбор «НЕТ»: щелчок, низкий удар и два тона вниз (тритон)"""
    n = int(0.8 * SR)
    x = 0.6 * bp_noise(n, 3200, 2.0, 0.003) + 0.7 * thump(95, 48, 0.12, n, 0.012)
    x += place_in(n, 0.0, chip(79, 0.07, 0.5, 0.3)) + place_in(n, 0.08, chip(73, 0.22, 0.5, 0.3, rel=0.06))
    return x, 0.002


def sfx_flash(root_m, perfect=False):
    """FLAWLESS / PERFECT: мажорный оркестровый удар и блеск вверх по аккорду"""
    X = orch_hit(root_m, False, 1.5, 0.35)
    n = X.shape[1] + int(0.9 * SR)
    out = np.zeros((2, n))
    out[:, :X.shape[1]] += X
    for k, iv in enumerate((24, 28, 31, 36)):
        gl, gr = pan_lr(-0.5 + k / 3)
        bb = 0.2 * place_in(n, 0.04 + 0.05 * k, bell(root_m + iv, 1, 0.35, CEL))
        out[0] += bb * gl
        out[1] += bb * gr
    if perfect:
        out += place_in(n, 0, crash(0.9, 1.0)) * 0.6
    return out, 0.004


# имя: (генератор, режим) — peak: пик звука (или указанный генератором момент) на кадр позже события;
# onset: начало звука на кадр позже события; span: звук от события до конца отрезка
SFX_GEN = {"coin_fall": (sfx_coin_fall, "span"), "coin_slot": (sfx_coin_slot, "peak"), "logo_hit": (sfx_logo_hit, "peak"),
           "round": (sfx_round, "peak"), "creak": (sfx_creak, "span"), "gate": (lambda: sfx_gate("lion"), "peak"),
           "fight": (sfx_fight, "peak"), "paw": (sfx_paw, "peak"), "yawn": (sfx_yawn, "onset"), "lie": (sfx_lie, "peak"),
           "gate_t": (lambda: sfx_gate("bars"), "peak"), "jump_whoosh": (sfx_jump_whoosh, "span"), "land": (sfx_land, "peak"),
           "howl": (sfx_howl, "onset"), "tail": (sfx_tail, "peak"), "grumble": (sfx_grumble, "onset"), "draw": (sfx_draw, "peak"),
           "glove_fall": (sfx_glove_fall, "span"), "glove_land": (sfx_glove_land, "peak"), "quest": (sfx_quest, "peak"),
           "boot": (sfx_boot, "peak"), "sand": (sfx_sand, "peak"), "pickup": (sfx_pickup, "peak"), "flawless": (sfx_flash, "peak"),
           "applause": (sfx_applause, "span"), "perfect": (lambda r: sfx_flash(r, True), "peak"), "throw": (sfx_throw, "onset"),
           "ko": (sfx_ko, "peak"), "blip": (sfx_blip, "peak"), "deny": (sfx_deny, "peak"), "leave": (sfx_boot, "peak")}
SFX_PAN = {"creak": -0.55, "gate": -0.55, "yawn": -0.33, "gate_t": 0.25, "jump_whoosh": 0.2, "land": 0.12, "howl": 0.0,
           "tail": 0.05, "grumble": 0.05, "glove_fall": 0.1, "glove_land": -0.13, "pickup": -0.06, "throw": 0.25,
           "blip": 0.3, "deny": 0.3, "coin_fall": 0.0, "coin_slot": 0.0}
SFX_SEND = {"round": 0.3, "fight": 0.25, "logo_hit": 0.25, "ko": 0.3, "perfect": 0.3, "flawless": 0.3, "howl": 0.25, "gate": 0.3,
            "gate_t": 0.3, "creak": 0.2, "quest": 0.25, "pickup": 0.2, "glove_land": 0.2, "coin_slot": 0.2, "applause": 0.2,
            "boot": 0.18, "leave": 0.18, "paw": 0.15}
xpan = lambda x: float(np.clip((x - 960) / 960 * 0.85, -0.9, 0.9))      # пан по x в кадре
# хвост тигра: крайние точки взмаха sin(16 t + 1,1) = 1 в окне «бьёт хвостом» (lash в main.js)
kt = int(np.ceil(((TAIL0 - 0.02) * 16 + 1.1 - np.pi / 2) / (2 * np.pi)))
TAIL = [(np.pi / 2 - 1.1 + 2 * np.pi * (kt + k)) / 16 for k in range(3)]


def S(name, what, t, *gargs, end=None, dbv=None, pan=None):
    return dict(name=name, what=what, t_ev=t, gargs=gargs, t_end=end, dbv=dbv, pan=pan)


nLv = max(1, len(STEPS_LEAVE) - 1)
SFX_LIST = [
    S("coin_fall", "монетка падает к щели «INSERT COIN»", 0.05, end=0.55),
    S("coin_slot", "«дзынь» монетки в щели + «кредит»", 0.55),
    S("logo_hit", "логотип «ПЕРЧАТКА» врезается сверху", LOGO),
    S("round", "гонг и удар «ROUND 1» (царский знак)", R1, 36),
    S("creak", "скрип ворот льва: «Скрыпучую дверь» (поднимаются 1,1 с)", DVER, end=DVER + 1.1),
    S("gate", "лязг решётки на «отворяют» (тряска кадра)", OTVOR),
    S("fight", "стаб «FIGHT!» (лев выходит)", F1, 36),
    *[S("paw", f"тяжёлый шаг льва {k + 1}/{len(STEPS_LION)} («тяжёлой стопой»)", t, pan=-0.55 + 0.25 * k / max(1, len(STEPS_LION) - 1))
      for k, t in enumerate(STEPS_LION)],
    S("yawn", "зевок-рык льва «Зевая лениво»", Z1),
    S("lie", "мягкий «бум»: лев лёг (пыль)", LIE1 + 0.2, pan=-0.33),
    S("round", "гонг и удар «ROUND 2» (царь махнул снова)", R2, 41),
    S("gate_t", "лязг ворот тигра", GATE2),
    S("fight", "стаб «FIGHT!» (тигр прыгает)", F2, 41),
    S("jump_whoosh", "вжух прыжка тигра", TJ0, end=TJ1),
    S("land", "тигр приземлился (шлепок, пыль, тряска)", TJ1),
    S("howl", "вой тигра «Завыл ужасно» — нарастающий воющий синт", HOWL),
    *[S("tail", f"удар хвоста {k + 1}/3 («бьёт хвостом»)", tx, dbv=SFX_DB["tail"] - 3 * k) for k, tx in enumerate(TAIL)],
    S("grumble", "ворчание тигра «ворчит и злится»", VORCH - 0.05),
    S("lie", "тигр нехотя лёг рядом (пыль)", LIE2 + 0.3, pan=0.04),
    S("draw", "сигнал «НИЧЬЯ»", DRAW),
    S("glove_fall", "вжух и шорох: перчатка падает (замедление)", GF0, end=LAND - 0.02),
    S("glove_land", "перчатка мягко шлёпнулась в песок между зверями", LAND),
    S("quest", "чип-джингл «БОНУСНЫЙ РАУНД»", BONUS),
    *[S("boot", f"рыцарь бежит по балкону, шаг {k + 1}", t, dbv=-19, pan=xpan(q)) for k, (t, q) in enumerate(STEPS_BALC)],
    *[S("boot", f"бег вниз по ступеням, шаг {k + 1}/{len(STEPS_STAIR)}", t, pan=xpan(q + 18)) for k, (t, q) in enumerate(STEPS_STAIR)],
    S("fight", "стаб «FIGHT!» (рыцарь дерзко вступает в круг)", F3, 45),
    *[S("sand", f"шаг по песку к перчатке {k + 1}", t, pan=xpan(1877 - (q - QB) * 3 * 0.9)) for k, (t, q) in enumerate(STEPS_SAND)],
    S("pickup", "«дзынь»: «+1 ПЕРЧАТКА» (подымает)", PICK),
    S("flawless", "стаб «FLAWLESS!»", FLAW, 57),
    S("applause", "аплодисменты двора («хвала»)", W("w_hvala") - 0.15, end=L(49) + 0.3),
    S("perfect", "стаб «PERFECT!»", PERF, 60),
    S("throw", "вжух брошенной перчатки", THROW),
    S("ko", "хлопок перчатки по лицу и «K.O.» с эхом", KO),
    S("blip", "меню «НАГРАДА?»: курсор на «ДА»", BLAG + 0.2),
    S("blip", "курсор доехал до «НЕТ»", NADOB - 0.15),
    S("deny", "выбор «НЕТ» — щелчок-удар («не надобно мне!»)", NADOB),
    *[S("leave", f"уходящие шаги {k + 1}/{len(STEPS_LEAVE)} («покинул»)", t, dbv=-17 - 11 * k / nLv,
        pan=xpan(q if q <= QB else QB + (q - QB) * 3)) for k, (t, q) in enumerate(STEPS_LEAVE)],
]


def place(name, what, t_ev, gargs=(), t_end=None, dbv=None, pan=None):
    gen, mode = SFX_GEN[name]
    r = gen(t_end - t_ev - FRAME, *gargs) if mode == "span" else gen(*gargs)
    pk_s = None
    if isinstance(r, tuple):
        r, pk_s = r
    x = r
    st = x.ndim == 2
    chs = [x[0], x[1]] if st else [x]
    n_ = len(chs[0])
    if mode == "peak":
        if pk_s is None:
            mono = np.sum(np.abs(np.stack(chs)), axis=0)
            envs = np.convolve(mono, np.ones(220) / 220, mode="same")
            pk = int(np.argmax(envs[:int(0.5 * SR)]))
        else:
            pk = int(pk_s * SR)
        onset = t_ev + FRAME - pk / SR
        a, w = max(0, pk - int(0.02 * SR)), int(0.25 * SR)
    else:
        onset = t_ev + FRAME
        a, w = 0, n_
    dbv = SFX_DB[name] if dbv is None else dbv
    kx = [kweight(c) for c in chs]
    e = sum(float(np.sum(k_[a:a + w] ** 2)) for k_ in kx) / max(1, min(w, n_ - a))
    w0, w1 = onset + a / SR, onset + (a + min(w, n_ - a)) / SR
    ov = [SPEECH[i] for i in range(NL) if SPEECH[i][0] < w1 and SPEECH[i][1] > w0]
    vref = min(vKMS, max(ms([kv, kv], ov), vKMS * db(-10) ** 2)) if ov else vKMS   # над тихой строкой — тише
    dbv = dbv + dB(vref) - dB(vKMS)
    g = np.sqrt(vKMS * db(dbv) ** 2 / max(e, 1e-20))
    i0 = int(round(onset * SR))
    j0, j1 = max(0, -i0), min(n_, N - i0)
    snd = SFX_SEND.get(name, 0.12)
    if st:
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g
        sfx[1, i0 + j0:i0 + j1] += chs[1][j0:j1] * g
        sfx_send[i0 + j0:i0 + j1] += (chs[0][j0:j1] + chs[1][j0:j1]) * 0.5 * g * snd
    else:
        gl, gr = pan_lr(SFX_PAN.get(name, 0.0) if pan is None else pan)
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gl
        sfx[1, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gr
        sfx_send[i0 + j0:i0 + j1] += chs[0][j0:j1] * g * snd
    rec = {"name": name, "what": what, "t": r3(t_ev), "mode": mode}
    if mode == "peak":
        rec["peak"] = r3(t_ev + FRAME)
    else:
        rec["start"], rec["end"] = r3(onset), r3(onset + n_ / SR if mode == "onset" else t_end)
    rec["db"] = round(float(dbv), 1)
    SFX_LOG.append(rec)
    SFX_WIN.setdefault(name, []).append((onset + a / SR, onset + (a + min(w, n_ - a)) / SR))


for it in SFX_LIST:
    place(**it)
sfx_wet = np.stack([convolve(sfx_send, IR_S[0]), convolve(sfx_send, IR_S[1])]) * 0.6
sfx_all = sfx + sfx_wet
# победный джингл — часть музыки, но в списке событий кадра
SFX_LOG.append({"name": "victory_jingle", "what": "победный джингл «ПОБЕДИТЕЛЬ: РЫЦАРЬ» (в музыке)", "t": r3(VIC), "mode": "music",
                "peak": r3(VIC_T), "db": VICT_DB})
SFX_LOG.sort(key=lambda r: r.get("peak", r.get("start")))


# ---------- форма громкости музыки ----------
# зоны с нарочно другой громкостью: (имя, начало, конец, дБ, окна замера музыки, окна голоса или None — средний голос, рампа)
ZONES = [("slow", SLOW0, LAND + 0.05, SLOW_DB, [(SLOW0 + 0.3, LAND - 0.3)], SPEECH[30:34], 0.08),
         ("fear", FEAR0 - 0.05, FEAR1 + 0.3, FEAR_DB, [(FEAR0, FEAR1)], SPEECH[44:46], 0.3),
         ("post_ko", KO, VIC_T - 0.05, POSTKO_DB, [(KO + 1.6, VIC_T - 0.05)], SPEECH[53:55], 0.02),
         ("victory", VIC_T - 0.05, FT0 - 0.05, VICT_DB, [(VIC_T, FT0 - 0.05)], None, 0.03),
         ("final", FT0 - 0.05, TOTAL + 1, FIN_DB, [(FT0, FEND + 0.6)], None, 0.03)]
ZCUT = [(z0 - r, z1 + r) for _, z0, z1, *_r, r in ZONES]
BIG = {"logo_hit", "coin_slot", "round", "fight", "ko", "perfect", "flawless", "glove_land", "quest", "pickup", "gate", "gate_t",
       "land", "deny", "victory_jingle"}
SFXW = [(r["peak"] - 0.05, r["peak"] + (1.2 if r["name"] in BIG else 0.5)) if "peak" in r else (r["start"] - 0.03, r["end"] + 0.15)
        for r in SFX_LOG]   # окна шумов, как в check_mix.py: подложку строки меряю вне них
g_line = {}
for i in range(1, NL + 1):
    parts = [p for p in minus(L(i), E(i), ZCUT) if p[1] - p[0] > 0.05]
    p_ns = [p for p in minus(L(i), E(i), ZCUT + SFXW) if p[1] - p[0] > 0.05]
    if sum(b_ - a for a, b_ in p_ns) >= 0.6:
        parts = p_ns
    in_zone = any(c0 < E(i) and c1 > L(i) for c0, c1 in ZCUT)
    if parts and (not in_zone or sum(b_ - a for a, b_ in parts) >= 0.8):
        g_line[i] = np.sqrt(ms(VCH, [(L(i), E(i))]) * db(UNDER_DB + LINE_DB.get(i, 0.0)) ** 2 / max(ms(MCH, parts), 1e-20))
    else:
        g_line[i] = None
for i in range(1, NL + 1):  # строки почти целиком в зонах: громкость соседа (до зоны — предыдущей, после — следующей)
    if g_line[i] is None:
        parts = minus(L(i), E(i), ZCUT)
        ov = max((min(E(i), z1 + r) - max(L(i), z0 - r), z1) for _, z0, z1, *_x, r in ZONES)
        after = bool(parts) and float(np.mean([(a + b_) / 2 for a, b_ in parts])) > ov[1]
        order = list(range(i + 1, NL + 1)) + list(range(i - 1, 0, -1)) if after else list(range(i - 1, 0, -1)) + list(range(i + 1, NL + 1))
        g_line[i] = next(g_line[k] for k in order if g_line[k] is not None)
GRAMP = lambda i: min(0.3, (L(i + 1) - E(i)) / 3)     # подъём громкости в паузе — плавно
gFor = lambda wins, target, vref=None: np.sqrt((vMS if vref is None else vref) * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
gI = gFor([(IA, C0 - 0.1)], INTRO_DB)
keys = [(0.0, gI), (C0 - 0.45, gI), (C0 - 0.02, g_line[1])]
gS = {}
for i in range(1, NL + 1):
    g = g_line[i]
    if i > 1:
        keys.append((L(i), g))
    keys.append((E(i), g))
    if i in GAP_DB and i < NL:
        gs = float(np.clip(gFor([(E(i) + GRAMP(i), L(i + 1) - 0.1)], GAP_DB[i]), g * db(-2), g * db(15)))
        gS[i] = gs
        keys += [(E(i) + GRAMP(i), gs), (L(i + 1) - 0.1, gs)]
keys.append((TOTAL, g_line[NL]))
for a_, b_ in zip(keys, keys[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f}")
tN = np.arange(N) / SR
gcurve = np.interp(tN, [k[0] for k in keys], [k[1] for k in keys])
gZ = {}
for zn, z0, z1, zdb, meas, vwin, r in ZONES:
    gz = gFor(meas, zdb, None if vwin is None else ms(VCH, vwin))
    gZ[zn] = gz
    w = np.interp(tN, [z0 - r, z0, z1, z1 + r], [0, 1, 1, 0])
    gcurve = gcurve * (1 - w) + gz * w
# сглаживание 15 мс: строки без паузы между ними (18|19, 19|20, 21|22, 33|34) не дают скачка громкости
_h = int(0.0075 * SR)
_c = np.concatenate([[0.0], np.cumsum(gcurve)])
_i = np.arange(N)
_a, _b = np.clip(_i - _h, 0, N), np.clip(_i + _h + 1, 0, N)
gcurve = (_c[_b] - _c[_a]) / (_b - _a)
gcurve *= np.interp(tN, [0, TOTAL - 1.6, TOTAL - 0.03, TOTAL + 1], [1, 1, 0, 0])
shaped = music * gcurve


# ---------- сумма и ограничитель пиков (только где пик выше потолка) ----------
# потолок для music.wav и для суммы с голосом: там, где сумма с голосом выше MIX_CEIL, музыка на миллисекунды уступает
out = shaped + sfx_all
BLK = 256
nb_ = int(np.ceil(N / BLK))
blk = lambda x, f=np.max: f(np.pad(x, (0, nb_ * BLK - N), constant_values=1.0 if f is np.min else 0.0).reshape(nb_, BLK), axis=1)
pk_blk = blk(np.max(np.abs(out), axis=0))
need = np.minimum(1.0, PEAK_CEIL / np.maximum(pk_blk, 1e-9))
req = np.ones(N)
for ch in (0, 1):
    over = np.nonzero(np.abs(vfull + out[ch]) > MIX_CEIL)[0]
    if len(over):
        va, mo = vfull[over], out[ch, over]
        same = va * mo > 0
        g_ = np.where(same, (MIX_CEIL - np.abs(va)) / np.abs(mo), (MIX_CEIL + np.abs(va)) / np.abs(mo))
        req[over] = np.minimum(req[over], np.clip(g_, 0.02, 1.0))
need = np.minimum(need, blk(req, np.min))
need = np.minimum(need, np.minimum(np.roll(need, 1), np.roll(need, -1)))
gb = need.copy()
rel_k = 1 - np.exp(-BLK / SR / 0.04)
for k in range(1, nb_):
    gb[k] = min(need[k], gb[k - 1] + (1 - gb[k - 1]) * rel_k)
lim = np.interp(np.arange(N), np.arange(nb_) * BLK + BLK / 2, gb)
lim_db = 20 * np.log10(float(np.min(gb)))
lim_s = float(np.sum(gb < 0.999)) * BLK / SR
out *= lim
fo = int(0.03 * SR)
out[:, N - fo:] *= np.linspace(1, 0, fo)

# ---------- запись ----------
dith = (rng.random((2, N)) - rng.random((2, N)))
pcm = np.clip(np.round(out * 32767 + dith), -32768, 32767).astype("<i2")
pcm[out == 0] = 0
with wave.open(os.path.join(HERE, "music.wav"), "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.T.tobytes())
with open(os.path.join(HERE, "sfx.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "секунды ролика. t — событие в кадре; peak — пик звука (на кадр позже события); у onset/span — start/end; "
                "db — громкость шума в своём окне к голосу (K-взвешенно, BS.1770). music — ключевые моменты музыки; "
                "zones — участки, где музыка нарочно тише или громче обычных −18…−20 дБ под голосом.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "under_db": UNDER_DB,
        "zones": [{"name": zn, "start": r3(z0), "end": r3(min(z1, TOTAL)), "db": zdb} for zn, z0, z1, zdb, *_ in ZONES],
        "gaps": [{"after_line": i, "start": r3(E(i) + GRAMP(i)), "end": r3(L(i + 1) - 0.1), "db": GAP_DB[i]} for i in sorted(gS)],
        "intro": [r3(IA), r3(C0 - 0.1)], "sfx": SFX_LOG, "music": MARK,
    }, f, ensure_ascii=False, indent=1)

# ---------- отчёт ----------
f1 = lambda x: f"{x:.1f}"
SH = [shaped[0] * lim, shaped[1] * lim]
ALL = [out[0], out[1]]
SA = [sfx_all[0] * lim, sfx_all[1] * lim]
ksh = [kweight(c) for c in SH]
ksa = [kweight(c) for c in SA]
rel = lambda chs, w: f1(dB(ms(chs, w)) - dB(vMS))
relK = lambda chs, w: f1(dB(ms(chs, w)) - dB(vKMS))
print(f"события: {ev_src}; V0 {V0}, OUTRO {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп: заставка и двор {60 / bi:.1f} BPM (удар {IA:.2f}, грув {C0:.2f}), бой {60 / b0:.1f} BPM")
print(f"шаги: лев {[r3(t) for t in STEPS_LION]}; рыцарь по балкону {[r3(t) for t, _ in STEPS_BALC]}, "
      f"по ступеням {[r3(t) for t, _ in STEPS_STAIR]}, по песку {len(STEPS_SAND)}, уходит {len(STEPS_LEAVE)}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: RMS {rel(SH, SPEECH)} дБ, K {relK(ksh, SPEECH)} дБ к голосу; с шумами RMS {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка, RMS | K дБ к голосу строки):",
      " ".join(f"{i}:{f1(dB(ms(SH, [SPEECH[i - 1]])) - dB(ms(VCH, [SPEECH[i - 1]])))}|{f1(dB(ms(ksh, [SPEECH[i - 1]])) - dB(ms([kv, kv], [SPEECH[i - 1]])))}"
               for i in range(1, NL + 1)))
print(f"заставка RMS {rel(SH, [(IA, C0 - 0.1)])}, джингл {rel(SH, [(VIC_T, FT0 - 0.05)])}, финал {rel(SH, [(FT0, FEND + 0.6)])}, паузы "
      + " ".join(f"{i}|{i + 1}:{rel(SH, [(E(i) + GRAMP(i), L(i + 1) - 0.1)])}" for i in sorted(gS)) + " (дБ к среднему голосу)")
print("зоны (RMS к голосу своих строк): " + ", ".join(
    f"{zn} {f1(dB(ms(SH, meas)) - dB(ms(VCH, vwin) if vwin else vMS))}" for zn, z0, z1, zdb, meas, vwin, r in ZONES))
print(f"остановка ленты {STOP:.2f}–{STOP + TS_D:.2f}; падение перчатки до {LAND:.2f}")
print("шумы в своих окнах (K | RMS, дБ к голосу):",
      ", ".join(f"{k} " + " ".join(f"{relK(ksa, [w])}|{rel(SA, [w])}" for w in ws[:3]) + (" …" if len(ws) > 3 else "")
                for k, ws in SFX_WIN.items()))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {float(np.max(np.abs(out))):.3f} ({f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS); ограничитель: "
      f"до {lim_db:.1f} дБ, {lim_s:.2f} с; голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы:", "; ".join(f"{r['name']} {r.get('peak', r.get('start'))}" for r in SFX_LOG))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {T_SYN:.1f} с (музыка), всего {time.time() - T_START:.1f} с")
