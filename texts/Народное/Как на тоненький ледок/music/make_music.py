#!/usr/bin/env python3
"""Музыка и шумы к русской народной песне «Как на тоненький ледок…», стиль «пластилиновый мультфильм».

Своя весёлая плясовая в духе народного наигрыша: 2/4, ре мажор. Мелодия и гармония свои: это не «Ах вы, сени»,
не «Камаринская», не «Барыня» и не напев песни «Как на тоненький ледок» с припевом «Эх, зимушка-зима» (его обработка
охраняется). Инструменты — синтез:
  балалайка-прима — щипок, тремоло на долгих нотах, бряцание «секундой» на слабые доли (шина bal);
  балалайка-контрабас — бас на доли: основной тон и квинта (шина bass);
  гармошка-хромка — аккорды на сильные доли, два голоса с лёгкой расстройкой (шина garm);
  бубенцы — на скачке; деревянные ложки — на галопе («поспешал»), на беге девушек и в финале (шина perc);
  особые места (глиссандо падения, пауза, «сдувшаяся» гармошка) — шина free, её не глушит стоп пляса.
План:
  0 … L1       вступление: подхват тремоло, 4 такта темы А в полный голос (гармошка дублирует мелодию);
  строки 1–3   лёд и беленький снежок: та же тема А тише и легче — тремоло, гармошка только на сильную долю;
  строки 4–5   Ваня едет: тема Б, бубенцы с появлением коня; на галопе (строка 5) — ложки, перед «поспешал» дробь;
  строка 6     копыто на льду — пляс обрывается; Ваня летит — нисходящее глиссандо балалайки (тремоло) со свистулькой,
               в сугроб — «бом» (контрабас и пустая квинта гармошки);
  строки 7–8   пауза в плясе: «плинь» на «упал, упал», низкое тремоло на «лежит», вздох гармошки (соль минор),
               на «не бежит» — грустная гармошка «уа-уа-уа-уааа» (ми — ре-диез — ре — до-диез с качанием);
  строка 9     «Две девушки увидали» — пляс оживает: тремоло вверх по ля-септаккорду, бас стучит, гармошка крещендо;
  строки 10–11 девушки бегут — тема А с ускорением (около ♩ = 124 → 159), ложки; торможение — аккорд «пам!»;
  строки 12–15 пляс (тема А): Ваню перелепили, подсадили, показали дорогу;
  строки 16–18 «Да наказывали…» — строго: си минор, отрывисто, гармошка на обе доли;
  финал        конь уезжает — тема Б в полный голос, бубенцы и ложки; в ёлку — пляс обрывается, гармошка «сдувается»;
               на финальный титр — концовка плясовой, последний аккорд «пам-пам» с тремоло, затухание.
Под голосом музыка на UNDER_DB к голосу (RMS по каждой строке, внутри строки громкость постоянна), в паузах между
строками от 0,45 с — чуть громче, во вступлении и финале — громче. Fade-in в начале, fade-out в конце.
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все ниже голоса (список — sfx.json).
Время шумов взято из ../video/src/main.js (формулы ниже повторяют его).

Запуск: python3 make_music.py [--intro 4.0] [--outro 7.6]
        (по умолчанию V0 и OUTRO из events.json, иначе 4.0 и 7.6)
Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (его пишет ../video/build.py), если он совпадает
с таймингами (при другом вступлении сдвигает его); иначе события считает по timings.json так же, как build.py.
Пишет music.wav (44,1 кГц, 16 бит, стерео, длина вступление + голос + финал) и sfx.json (шумы и ключевые моменты
музыки). Нужны python3 + numpy и ffmpeg.
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

# уровни музыки: RMS, дБ к RMS голоса (под голосом — по каждой строке, остальное — к среднему голосу)
UNDER_DB = -19.0
LINE_DB = {7: -1.0, 8: -1.0}  # пауза в плясе: редкие ноты чуть тише
GAP_LIFT_DB = 2.0             # паузы между строками от 0,45 с
INTRO_DB = -9.0               # вступление
FIN_DB = -8.0                 # конь уезжает и финальный титр
# шумы: самое громкое окно 100 мс, K-взвешенно (BS.1770), дБ к среднему голосу в местах речи
SFX_DB = {
    "title_plops": -14, "finch_flutter": -25, "sub_pop": -16, "ice_crackle": -24, "ice_glint": -19,
    "snow_plops": -22, "hooves_trot": -21, "hooves_gallop": -19, "finch_chirp": -23, "hoof_skid": -17,
    "snow_thud": -12, "stars": -26, "hare_hops": -24, "crow": -24, "girls_steps": -23, "girls_brake": -19,
    "horse_walk": -27, "boing": -15, "jump_whoosh": -21, "saddle_plop": -17, "sign_pop": -17, "road_roll": -26,
    "hooves_away": -19, "tree_bump": -12, "snow_hat": -15, "title_plops_fin": -15, "sub_pop_fin": -16,
}

# ---------- аргументы и время ----------
_ev_path = os.path.join(HERE, "events.json")
RAW = None
if os.path.exists(_ev_path):
    with open(_ev_path, encoding="utf-8") as f:
        RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Как на тоненький ледок…»")
ap.add_argument("--intro", type=float, help="вступление до голоса, с (V0); по умолчанию из events.json или 4.0")
ap.add_argument("--outro", type=float, help="финал после голоса, с; по умолчанию из events.json или 7.6")
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"), help="куда писать WAV")
args = ap.parse_args()
V0 = args.intro if args.intro is not None else float((RAW or {}).get("V0", 4.0))
OUTRO = args.outro if args.outro is not None else float((RAW or {}).get("OUTRO", 7.6))
if V0 < 2.5 or OUTRO < 6.5:
    sys.exit("нужно вступление >= 2.5 с и финал >= 6.5 с")

r3 = lambda x: round(float(x), 3)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TJ = json.load(f)
VD = TJ["voiceDuration"]
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
LINES = TJ["lines"]
NL = len(LINES)
if NL != 18:
    sys.exit(f"ожидалось 18 строк, в timings.json {NL}")

# события — так же, как в ../video/build.py
HOLD = 3.2
norm = lambda s: re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))
WORDS = {"w_led": (1, "ледок"), "w_vyp2": (2, "Выпал"), "w_vyp3": (3, "Выпал"), "w_ehal": (4, "Ехал"),
         "w_van4": (4, "Ванюшка-дружок."), "w_posp": (5, "поспешал,"), "w_dobra": (6, "добра"), "w_upal6": (6, "упал."),
         "w_lezh": (7, "лежит"), "w_nikto": (8, "Никто"), "w_bezh": (8, "бежит."), "w_dve": (9, "Две"),
         "w_uvid": (9, "увидали,"), "w_podb10": (10, "подбежали,"), "w_podb11": (11, "подбежали,"), "w_kon12": (12, "коня"),
         "w_sazh12": (12, "сажали."), "w_kon13": (13, "коня"), "w_sazh13": (13, "сажали,"), "w_put14": (14, "Путь-дорогу"),
         "w_pok14": (14, "показали."), "w_put15": (15, "Путь-дорогу"), "w_nak": (16, "наказывали:"), "w_kak": (17, "«Как"),
         "w_ivan": (17, "Иван,"), "w_zev": (18, "зевай"), "w_stor": (18, "сторонам!»")}
EXTRA = {"w_upal7a": (7, "упал,", 1), "w_upal7b": (7, "упал,", 2)}   # только для музыки: «Он упал, упал…»


def word_at(n, w, occ=1):
    """начало слова строки n (occ — какое по счёту); слово через дефис может быть в timings.json одним или двумя"""
    ws = [q for q in LINES[n - 1]["words"] if norm(q["text"])]
    target, seen = norm(w), 0
    for i, q in enumerate(ws):
        acc, j = "", i
        while j < len(ws) and len(acc) < len(target):
            acc += norm(ws[j]["text"])
            j += 1
        if acc == target:
            seen += 1
            if seen == occ:
                return q["start"]
    sys.exit(f"нет слова «{w}» ({occ}) в строке {n}")


def events_from_timings():
    ev = {"V0": V0}
    for i, l in enumerate(LINES, 1):
        ev[f"L{i}"], ev[f"E{i}"] = r3(l["start"] + V0), r3(l["end"] + V0)
    for k, (n, w) in WORDS.items():
        ev[k] = r3(word_at(n, w) + V0)
    ev["fin"] = r3(ev[f"E{NL}"] + HOLD)
    return ev


EV = events_from_timings()
ev_src = "timings.json"
if RAW:
    shift = V0 - RAW.get("V0", V0)
    if abs(RAW["L1"] + shift - EV["L1"]) < 0.02 and abs(RAW[f"E{NL}"] + shift - EV[f"E{NL}"]) < 0.02:
        for k, v in RAW.items():
            if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total"):
                EV[k] = r3(v + shift)
        ev_src = "events.json" + (f" со сдвигом {shift:+.2f} с" if shift else "")
        if abs(RAW.get("total", TOTAL) + shift - TOTAL) > 0.002:
            print(f"внимание: total в events.json {RAW.get('total')}, у музыки {TOTAL} (другой финал?)")
    else:
        print("events.json не совпадает с timings.json — события считаю по timings.json")
for k, (n, w, occ) in EXTRA.items():
    EV[k] = r3(word_at(n, w, occ) + V0)
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = EV["fin"]

# ключевые моменты кадра (как в ../video/src/main.js)
T_SLIP = W("w_dobra") - 0.08                       # копыто на скрытом льду
T_FLY0 = T_SLIP + 0.14                             # Ваня вылетает из седла
T_LAND = max(E(6) - 0.05, T_FLY0 + 0.8)            # шлёпается в сугроб
T_HSIT = T_SLIP + 0.55                             # конь садится на лёд
T_RISE = L(10) - 0.2                               # конь встаёт
T_HWALK0, T_HWALK1 = T_RISE + 0.6, E(11) - 0.3     # конь идёт шагом
T_UP = W("w_kon12") - 0.15                         # Ваня «перелепляется» обратно
T_JUMP = W("w_kon13") - 0.25                       # прыжок в седло
T_JUMPE = T_JUMP + 0.75                            # «плюх» в седло
T_RUN0, T_RUN1 = L(10) - 0.15, E(11) - 0.25        # девушки бегут; тормозят
T_GO, T_BUMP = E(NL) + 0.3, E(NL) + 2.3            # конь уезжает; въезжает в ёлку
HORSE_IN = L(4) - 0.6                              # конь появляется (рысь)
HX_START, HX_TROT, HX_SLIP, HX_ICE, HX_STAND, HX_BUMP = 520, 1150, 1720, 1960, 2160, 3078
GIRLS = [(3530, 2770, 0.0), (3630, 2895, 0.25)]    # x0, x1, сдвиг фазы шага
TITLE_L1, TITLE_L2 = "Как на тоненький", "ледок…"
N_L1 = len(TITLE_L1.replace(" ", ""))
N_LET = N_L1 + len(TITLE_L2.replace(" ", ""))
T_TITLE0, T_SUB0 = 0.25, 1.4                       # титр вступления: буквы, плашка подзаголовка
T_TITLE1, T_SUB1 = FIN + 0.2, FIN + 1.3            # финальный титр
LET_GAP, LET_FALL = 0.045, 0.32                    # буквы стартуют через 0,045 с, приземляются через 0,32 с
assert T_RUN1 - T_RUN0 > 2.0 and T_BUMP - T_RUN1 > 8.0, "сцены короче, чем ждёт музыка"
assert T_BUMP < FIN - 0.4, "финальный титр раньше ёлки"
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1915)
db = lambda x: 10.0 ** (x / 20.0)
hz = lambda m: 440.0 * 2.0 ** ((np.asarray(m, float) - 69) / 12.0)
tt = lambda n: np.arange(n) / SR
clamp = lambda x, a, b: max(a, min(b, x))
prog = lambda t, a, b: np.clip((np.asarray(t, float) - a) / max(1e-6, b - a), 0, 1)
sstep = lambda u: u * u * (3 - 2 * u)


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
            best = min(best, c)
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
        H = resp(rbj("bp", fc_fn(max(0.0, tc)), q), fr) ** power
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


def table(amps):
    amps = np.asarray(amps, float)
    k = np.arange(1, len(amps) + 1)
    w = (amps[:, None] * np.sin(2 * np.pi * k[:, None] * _PH[None, :])).sum(0)
    return w / max(1e-9, np.max(np.abs(w)))


def osc(tbl, freq, n, ph0=0.0):
    ph = ph0 + (freq * np.arange(n) / SR if np.isscalar(freq) else np.cumsum(freq) / SR)
    idx = (ph % 1.0) * TBL
    i0 = idx.astype(np.int64)
    fr = idx - i0
    return tbl[i0 % TBL] * (1 - fr) + tbl[(i0 + 1) % TBL] * fr


def noise(n):
    return rng.standard_normal(n)


def tail_fade(x, sec=0.012):
    k = min(x.shape[-1], int(sec * SR))
    if k > 1:
        x[..., -k:] *= np.linspace(1, 0, k)
    return x


def held(x, d, rel=0.05):
    """звук глушится через d секунд: дальше гаснет за rel"""
    nd = int(max(0.0, d) * SR)
    if nd >= len(x):
        return x.copy()
    m = min(len(x), nd + int(rel * 5 * SR))
    y = x[:m].copy()
    y[nd:] *= np.exp(-tt(m - nd) / rel)
    return tail_fade(y, 0.004)


_NB = {}
NB_SPEC = {"lp400": [rbj("lp", 400, 0.7)], "lp1200": [rbj("lp", 1200, 0.7)], "bp900": [rbj("bp", 900, 0.8)],
           "bp1800": [rbj("bp", 1800, 1.0)], "bp2500": [rbj("bp", 2500, 0.8)], "bp3500": [rbj("bp", 3500, 1.2)],
           "hp5k": [rbj("hp", 5000, 0.7)], "hp7k": [rbj("hp", 7000, 0.7)]}


def nbank(name, n):
    """банки отфильтрованного шума (RMS 1), берётся случайный кусок"""
    if name not in _NB:
        y = ffilt(noise(SR * 3), *NB_SPEC[name], power=2)
        _NB[name] = y / np.sqrt(np.mean(y ** 2))
    s = int(rng.integers(0, SR * 3 - n - 1))
    return _NB[name][s:s + n].copy()


def grains(n, count, span, tau=0.0012, start=0.0):
    """хруст: случайные щелчки в промежутке span (снег, ветки)"""
    imp = np.zeros(n)
    for _ in range(int(count)):
        i = int((start + rng.random() * span) * SR)
        if i < n:
            imp[i] += rng.uniform(0.3, 1.0)
    ker = np.exp(-tt(int(tau * 6 * SR)) / tau)
    return np.convolve(imp, ker)[:n]


# ---------- балалайка ----------
_BAL = {}


def bal_pluck(m, bright=1.0, kind="prima"):
    """щипок балалайки (пик 1): гармоники с местом щипка у подставки, верхние гаснут быстрее, корпус-треугольник
    (форманты), лёгкая негармоничность, струна в первый миг чуть выше; prima — мелодия, bass — контрабас"""
    key = (int(m), round(bright, 1), kind)
    if key in _BAL:
        return _BAL[key]
    f = float(hz(m))
    if kind == "prima":
        tau1 = float(np.clip(0.75 * (440 / f) ** 0.6, 0.22, 1.5))
        p, Bi, fc, Ls = 0.17, 6e-5, 2700 * bright, min(4.0 * tau1, 2.2)
        body = ((2700, 1100, 0.8), (520, 260, 0.6))
        pick, pick_a = "bp3500", 0.10
    else:
        tau1 = float(np.clip(0.9 * (110 / f) ** 0.3, 0.5, 1.4))
        p, Bi, fc, Ls = 0.21, 2e-4, 1000 * bright, min(3.5 * tau1, 2.0)
        body = ((150, 60, 0.8), (900, 400, 0.3))
        pick, pick_a = "bp900", 0.06
    n = int(Ls * SR)
    t = tt(n)
    phi = 2 * np.pi * f * np.cumsum(1 + 0.004 * np.exp(-t / 0.035)) / SR
    x = np.zeros(n)
    for k in range(1, 29):
        rk = k * np.sqrt(1 + Bi * k * k)
        fk = rk * f
        if fk > 14000:
            break
        a = abs(np.sin(np.pi * k * p)) / k ** 0.9 / np.sqrt(1 + (fk / fc) ** 3)
        for c0, w, g in body:
            a *= 1 + g * np.exp(-((fk - c0) / w) ** 2)
        tk = tau1 / (1 + 0.18 * (k - 1) ** 1.15)
        x += a * np.exp(-t / tk) * np.sin(rk * phi + rng.random() * 6.283)
    x *= 1 - np.exp(-t / 0.0007)
    x /= np.max(np.abs(x))
    nk = int(0.006 * SR)
    x[:nk] += pick_a * bright * nbank(pick, nk) * np.exp(-tt(nk) / 0.0012)
    x = tail_fade(x / np.max(np.abs(x)))
    _BAL[key] = x
    return x


def bright_of(vel):
    return 0.7 if vel < 0.5 else (1.0 if vel < 0.8 else 1.3)


# ---------- гармошка ----------
_RT = {}


def reed_tbl(m):
    m = int(round(m))
    if m not in _RT:
        f = float(hz(m))
        K = int(min(80, SR * 0.45 / f))
        k = np.arange(1, K + 1)
        fk = k * f
        a = 1.0 / k ** 0.75 / np.sqrt(1 + (fk / 3200) ** 4)
        a = a * (1 + 0.8 * np.exp(-((fk - 1250) / 550) ** 2) + 0.35 * np.exp(-((fk - 2700) / 800) ** 2))
        a[1::2] *= 0.7
        _RT[m] = table(a)
    return _RT[m]


# ---------- бубенцы и ложки ----------
def make_shake():
    """встряска бубенцов: 4–7 бубенчиков вразнобой, негармоничные металлические призвуки"""
    n = int(0.4 * SR)
    out = np.zeros((2, n))
    for _ in range(int(rng.integers(4, 8))):
        o = int(rng.uniform(0, 0.03) * SR)
        u = tt(n - o)
        base = rng.uniform(2400, 4300)
        y = np.zeros(n - o)
        for r, a, tau in ((1, 1, 0.09), (1.53, 0.6, 0.06), (2.11, 0.45, 0.045), (2.74, 0.3, 0.03), (3.6, 0.2, 0.02)):
            if base * r < 17000:
                y += a * np.sin(2 * np.pi * base * r * u + rng.random() * 6.28) * np.exp(-u / (tau * rng.uniform(0.7, 1.3)))
        y += 0.3 * nbank("hp7k", n - o) * np.exp(-u / 0.002)
        y *= (1 - np.exp(-u / 0.0004)) * rng.uniform(0.5, 1.0)
        gl, gr = pan_lr(rng.uniform(-0.6, 0.6))
        out[0, o:] += y * gl
        out[1, o:] += y * gr
    return tail_fade(out / np.max(np.abs(out)))


def make_spoon():
    """деревянные ложки: сухой щелчок с деревянными резонансами"""
    n = int(0.09 * SR)
    t = tt(n)
    y = np.zeros(n)
    for f, a, tau in ((780, 0.8, 0.016), (1650, 1.0, 0.010), (2950, 0.7, 0.006), (4400, 0.4, 0.004)):
        y += a * np.sin(2 * np.pi * f * rng.uniform(0.95, 1.05) * t + rng.random() * 6.28) * np.exp(-t / tau)
    y += 0.9 * nbank("bp2500", n) * np.exp(-t / 0.0018)
    y *= 1 - np.exp(-t / 0.0003)
    return tail_fade(y / np.max(np.abs(y)))


SHAKES = [make_shake() for _ in range(8)]
SPOONS = [make_spoon() for _ in range(6)]

# ---------- шины ----------
BUSES = ("bal", "garm", "bass", "perc", "free")
BUS = {k: np.zeros((2, N)) for k in BUSES}
BUS_SEND = {"bal": 0.30, "garm": 0.22, "bass": 0.06, "perc": 0.18, "free": 0.32}
BUS_G = {"bal": 1.0, "garm": 2.0, "bass": 0.85, "perc": 0.75, "free": 1.0}   # баланс шин (подобран по отчёту)


def put(bus, t, x, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    n = x.shape[-1]
    j0, j1 = max(0, -i), min(n, N - i)
    if j1 <= j0:
        return
    B = BUS[bus]
    if x.ndim == 2:
        B[:, i + j0:i + j1] += x[:, j0:j1] * gain
    else:
        gl, gr = pan_lr(pan)
        seg = x[j0:j1] * gain
        B[0, i + j0:i + j1] += seg * gl
        B[1, i + j0:i + j1] += seg * gr


def p_bal(t, m, vel, hold, bus="bal", pan=0.2):
    put(bus, t, held(bal_pluck(m, bright_of(vel)), hold, 0.05), pan, 0.5 * vel)


def p_trem(t0, D, m, vel, cresc=(1.0, 1.0), rate=13.5, bus="bal", pan=0.2, ring=0.1):
    """тремоло балалайки: удары вниз-вверх (вниз ярче), каждый следующий глушит предыдущий"""
    ns = max(2, int(round(D * rate)))
    step = D / ns
    st = np.array([i * step + (rng.uniform(-0.004, 0.004) if i else 0.0) for i in range(ns)])
    n = int((D + ring * 6) * SR) + 1
    buf = np.zeros(n)
    xf = int(0.004 * SR)
    for i in range(ns):
        c = cresc[0] + (cresc[1] - cresc[0]) * (i / max(1, ns - 1))
        down = i % 2 == 0
        v = vel * c * (1.0 if down else 0.8) * rng.uniform(0.92, 1.04)
        x = bal_pluck(m, bright_of(v) if down else 0.7)
        i0 = int(st[i] * SR)
        if i < ns - 1:
            seg = x[:int(st[i + 1] * SR) + xf - i0].copy()
            seg[-xf:] *= np.linspace(1, 0, xf)
        else:
            seg = held(x, D - st[i], ring)
        j = min(n, i0 + len(seg))
        buf[i0:j] += seg[:j - i0] * v
    put(bus, t0, buf, pan, 0.5)


def p_strum(t, notes, vel, hold, up=False, bus="bal", pan=0.32):
    """бряцание по трём струнам («секунда»): вниз — от низкой струны, вверх — обратно и мягче"""
    order = list(notes)[::-1] if up else list(notes)
    for j, m in enumerate(order):
        v = vel * (1.0, 0.85, 0.75)[min(j, 2)] * (0.8 if up else 1.0)
        put(bus, t + j * 0.008, held(bal_pluck(m, 0.7 if up else bright_of(vel)), hold, 0.03), pan, 0.3 * v)


def p_bass(t, m, vel, hold, bus="bass"):
    put(bus, t, held(bal_pluck(m, 1.0 if vel > 0.6 else 0.7, "bass"), hold, 0.06), 0.0, 0.6 * vel)


def p_garm(t, notes, dur, vel, pan=-0.25, att=0.014, rel=0.06, bend=None, bus="garm", tremc=8.0):
    """гармошка: язычковый тон, два голоса с расстройкой tremc центов, мех чуть «дышит»; bend(tv) — сдвиг в полутонах"""
    for j, m in enumerate(notes):
        f = float(hz(m))
        nn = int((dur + rel * 6) * SR)
        tv = tt(nn)
        env = np.minimum(1, tv / att) ** 1.3 * np.where(tv < dur, 0.88 + 0.12 * np.exp(-tv / 0.08),
                                                         0.88 * np.exp(-(tv - dur) / rel))
        env *= 1 + 0.03 * np.sin(2 * np.pi * 4.7 * tv + j)
        fr = f if bend is None else f * 2 ** (bend(tv) / 12)
        tb = reed_tbl(m)
        c = 2 ** (tremc / 2 / 1200)
        x = osc(tb, fr / c, nn, rng.random()) + 0.8 * osc(tb, fr * c, nn, rng.random())
        put(bus, t, tail_fade(x * env, 0.01), pan + 0.06 * (j - len(notes) / 2), vel * 0.32 / np.sqrt(len(notes)))


def p_bell(t, vel):
    put("perc", t, SHAKES[int(rng.integers(0, len(SHAKES)))], gain=0.5 * vel * rng.uniform(0.85, 1.05))


def p_spoon(t, vel):
    put("perc", t, SPOONS[int(rng.integers(0, len(SPOONS)))], 0.35, 0.6 * vel * rng.uniform(0.9, 1.05))


def bal_gliss(t0, t1, m0, m1, vel, rate=15.0, curve=1.6, ring=0.25):
    """глиссандо балалайки вниз по грифу с тремоло: тон падает всё быстрее (как падает Ваня)"""
    D = t1 - t0
    n = int((D + ring * 5) * SR)
    t = tt(n)
    u = np.clip(t / D, 0, 1) ** curve
    f = hz(m0 + (m1 - m0) * u)
    phi = 2 * np.pi * np.cumsum(f) / SR
    st = np.arange(0, D, 1 / rate)
    idx = np.searchsorted(st, t, side="right") - 1
    since = t - st[idx]
    sv = np.where(idx % 2 == 0, 1.0, 0.78)
    fm = float(hz((m0 + m1) / 2))
    x = np.zeros(n)
    for k in range(1, 16):
        a = abs(np.sin(np.pi * k * 0.17)) / k ** 0.9 / np.sqrt(1 + (k * fm / 2600) ** 3)
        x += a * np.exp(-since / (0.6 / (1 + 0.18 * (k - 1) ** 1.15))) * np.sin(k * phi + rng.random() * 6.28)
    x *= sv * (1 - np.exp(-since / 0.0007))
    return tail_fade(x / np.max(np.abs(x)) * vel, 0.05)


def whistle(t0, t1, m0, m1, vel, curve=1.6):
    """свистулька-«падение»: чистый тон скользит вниз, лёгкое дыхание"""
    D = t1 - t0
    n = int((D + 0.12) * SR)
    t = tt(n)
    u = np.clip(t / D, 0, 1) ** curve
    f = hz(m0 + (m1 - m0) * u) * (1 + 0.004 * np.sin(2 * np.pi * 6 * t))
    phi = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.04) * np.where(t < D, 1 - 0.3 * u, np.exp(-(t - D) / 0.03))
    x = (np.sin(phi) + 0.12 * np.sin(2 * phi) + 0.03 * np.sin(3 * phi) + 0.04 * nbank("hp5k", n)) * env
    return tail_fade(x * vel)


# ---------- темы: (доля от начала такта, длительность в долях, нота MIDI[, пометки]) ----------
# пометки: acc — акцент, trem — тремоло, st — отрывисто; аккорд — на такт или по долям ["D", "A7"]
A = [  # тема А: пляс
    ("D", [(0, .5, 78), (.5, .25, 76), (.75, .25, 74), (1, .5, 69), (1.5, .5, 74)]),
    ("A7", [(0, .25, 73), (.25, .25, 76), (.5, .25, 79), (.75, .25, 76), (1, .5, 73), (1.5, .5, 69)]),
    ("D", [(0, .5, 78), (.5, .5, 81), (1, .25, 79), (1.25, .25, 78), (1.5, .25, 76), (1.75, .25, 74)]),
    ("A", [(0, .75, 76), (.75, .25, 73), (1, 1, 69, "trem")]),
    ("G", [(0, .25, 71), (.25, .25, 74), (.5, .5, 79), (1, .25, 79), (1.25, .25, 78), (1.5, .5, 76)]),
    ("D", [(0, .25, 69), (.25, .25, 74), (.5, .5, 78), (1, .25, 78), (1.25, .25, 76), (1.5, .5, 74)]),
    ("A7", [(0, .5, 76), (.5, .5, 79), (1, .25, 78), (1.25, .25, 76), (1.5, .5, 73)]),
    ("D", [(0, .5, 74, "acc"), (.5, .5, 69), (1, .5, 74, "acc")]),
]
B = [  # тема Б: скачка, бегущие шестнадцатые
    ("D", [(0, .25, 74), (.25, .25, 78), (.5, .25, 81), (.75, .25, 78), (1, .25, 74), (1.25, .25, 78), (1.5, .5, 81)]),
    ("G", [(0, .25, 79), (.25, .25, 83), (.5, .25, 79), (.75, .25, 74), (1, .5, 71), (1.5, .5, 79)]),
    ("A7", [(0, .25, 76), (.25, .25, 79), (.5, .25, 76), (.75, .25, 73), (1, .25, 69), (1.25, .25, 73), (1.5, .5, 76)]),
    ("D", [(0, .25, 78), (.25, .25, 76), (.5, .25, 74), (.75, .25, 76), (1, .5, 78), (1.5, .5, 74)]),
    ("Bm", [(0, .25, 78), (.25, .25, 81), (.5, .25, 83), (.75, .25, 81), (1, .5, 78), (1.5, .5, 74)]),
    ("Em", [(0, .25, 79), (.25, .25, 76), (.5, .25, 71), (.75, .25, 76), (1, .5, 79), (1.5, .5, 83)]),
    ("A7", [(0, .5, 81), (.5, .25, 79), (.75, .25, 76), (1, .5, 73), (1.5, .5, 76)]),
    ("D", [(0, .5, 74, "acc"), (.5, .25, 78), (.75, .25, 76), (1, .5, 74)]),
]
S = [  # «наказывали»: си минор, строго и отрывисто
    ("Bm", [(0, .5, 71, "st"), (.5, .5, 71, "st"), (1, .5, 74, "st"), (1.5, .5, 71, "st")]),
    ("F#7", [(0, .5, 73, "st"), (.5, .5, 70, "st"), (1, 1, 66, "st")]),
    ("Bm", [(0, .5, 71, "st"), (.5, .5, 74, "st"), (1, .5, 78, "st"), (1.5, .5, 74, "st")]),
    ("F#7", [(0, .5, 76, "st"), (.5, .5, 73, "st"), (1, .5, 70, "st"), (1.5, .5, 66, "st")]),
]
S_END = (["Bm", "A7"], [(0, 1, 71, "st"), (1, .5, 69, "st"), (1.5, .5, 73, "st")])   # назад к ре мажору
R4 = ("A7", [(0, .25, 81), (.25, .25, 79), (.5, .25, 76), (.75, .25, 73), (1, .25, 69), (1.25, .25, 73),
             (1.5, .25, 76), (1.75, .25, 79)])                                       # конец бега — к «пам!»
F3 = (["D", "A7"], [(0, .25, 78), (.25, .25, 76), (.5, .25, 74), (.75, .25, 76), (1, .25, 78), (1.25, .25, 79),
                    (1.5, .25, 81), (1.75, .25, 83)])                                # финал: разбег к концовке
CH = {  # бас (основной, квинта), гармошка, бряцание балалайки
    "D": ((38, 45), (62, 66, 69), (69, 74, 78)),
    "G": ((43, 38), (62, 67, 71), (67, 71, 74)),
    "A": ((45, 40), (61, 64, 69), (69, 73, 76)),
    "A7": ((45, 40), (61, 64, 67), (67, 73, 76)),
    "Bm": ((47, 42), (62, 66, 71), (66, 71, 74)),
    "Em": ((40, 47), (59, 64, 67), (67, 71, 76)),
    "F#7": ((42, 37), (58, 61, 64, 66), (66, 70, 73)),
}
ROLE = {
    "intro": dict(mel=.85, trem=True, garm=(.55, .38), garm_mel=.30, bass=(.9, .7), strum=.5),
    "ice": dict(mel=.55, trem=True, garm=(.34, 0), garm_len=.95, bass=(.6, .35), strum=.28),
    "ride": dict(mel=.7, garm=(.45, .3), bass=(.85, .65), strum=.42, bells=1, bells_v=.8),
    "gallop": dict(mel=.75, garm=(.5, .35), bass=(.9, .7), strum=.45, bells=2, bells_v=.9, spoons=.8),
    "run": dict(mel=.8, garm=(.5, .4), bass=(.9, .7), strum=.5, spoons=.85),
    "dance": dict(mel=.68, trem=True, garm=(.45, .3), bass=(.85, .6), strum=.42),
    "strict": dict(mel=.62, stacc=True, garm=(.55, .5), garm_len=.28, bass=(.85, .75), bass_len=.35, strum=0),
    "ride2": dict(mel=.85, garm=(.55, .42), garm_mel=.28, bass=(.95, .75), strum=.55, bells=2, bells_v=1.0, spoons=.9),
    "final": dict(mel=.9, garm=(.6, .45), garm_mel=.32, bass=(1.0, .8), strum=.55, spoons=.9),
}


class Grid:
    """сетка долей: T[i] — время доли k0 + i; дробные доли — линейно внутри доли"""

    def __init__(self, times, k0=0):
        self.T, self.k0 = np.asarray(times, float), k0

    def __call__(self, pos):
        i = min(max(int(np.floor(pos + 1e-9)) - self.k0, 0), len(self.T) - 2)
        return float(self.T[i] + (pos - self.k0 - i) * (self.T[i + 1] - self.T[i]))


def play_bar(G, k, bar, role):
    """такт 2/4 с доли k: бас на доли, гармошка на сильные, бряцание на «и», мелодия, бубенцы и ложки"""
    R = ROLE[role]
    chs, mel = bar
    chs = chs if isinstance(chs, list) else [chs, chs]
    for b in (0, 1):
        ch = CH[chs[b]]
        tb = G(k + b)
        beat = G(k + b + 1) - tb
        if R["bass"][b] > 0:
            p_bass(tb, ch[0][b], R["bass"][b], beat * R.get("bass_len", 0.55))
        if R["garm"][b] > 0:
            notes = ch[1] + ((ch[0][0] + 12,) if b == 0 else ())
            p_garm(tb, notes, beat * R.get("garm_len", 0.45), R["garm"][b])
        if R["strum"] > 0:
            p_strum(G(k + b + 0.5), ch[2], R["strum"], 0.35 * beat, up=(b == 1))
        if R.get("bells"):
            sub = 4 if R["bells"] == 2 else 2
            for s in range(sub):
                p_bell(G(k + b + s / sub), R["bells_v"] * ((1, .45, .75, .45)[s] if sub == 4 else (1, .6)[s]))
        if R.get("spoons"):
            for off, v in ((0, 1.0), (0.5, 0.7), (0.75, 0.5)):
                p_spoon(G(k + b + off), R["spoons"] * v)
    for nt in mel:
        off, dur, m = nt[:3]
        fl = nt[3] if len(nt) > 3 else ""
        t0 = G(k + off)
        D = G(k + off + dur) - t0
        v = R["mel"] * (1.15 if "acc" in fl else 1.0) * rng.uniform(0.93, 1.05)
        if "st" in fl or R.get("stacc"):
            p_bal(t0, m, v, D * 0.45)
        elif "trem" in fl or (R.get("trem") and dur >= 0.75):
            p_trem(t0, D, m, v * 0.85)
        else:
            p_bal(t0, m, v, D * 0.92 + 0.03)
        if R.get("garm_mel", 0) > 0:
            p_garm(t0, (m - 12,), D * 0.85, R["garm_mel"], pan=-0.3)


# ---------- сетки ----------
nA = max(20, 2 * int(round((T_LAND - L(1)) / 0.47 / 2)))      # от первой строки до сугроба — целые такты
bA = (T_LAND - L(1)) / nA
nIntro = min(4, int((L(1) - 0.3) / (2 * bA)))                # тактов вступления
GA = Grid(L(1) + bA * np.arange(-2 * nIntro, nA + 3), -2 * nIntro)
GV = Grid(np.linspace(L(9), T_RUN0, 5))                       # «увидали»: 4 доли до бега
nR, R_RATIO = 8, 0.78                                         # бег: 8 долей с ускорением
q_ = R_RATIO ** (1 / (nR - 1))
d_ = q_ ** np.arange(nR)
d_ *= (T_RUN1 - T_RUN0) / d_.sum()
GR = Grid(T_RUN0 + np.concatenate([[0], np.cumsum(d_)]))
nC = max(16, 2 * int(round((T_BUMP - T_RUN1) / 0.46 / 2)))    # от торможения до ёлки — целые такты
bC = (T_BUMP - T_RUN1) / nC
GC = Grid(T_RUN1 + bC * np.arange(0, nC + 3))
bF = min(0.42, (TOTAL - 1.45 - FIN) / 7)                      # финал: 4 такта, последний аккорд на доле 7
GF = Grid(FIN + bF * np.arange(0, 12))
assert 0.40 < bA < 0.54 and 0.40 < bC < 0.52 and bF > 0.33, f"темп вне пределов: {bA:.3f} / {bC:.3f} / {bF:.3f}"
assert GA(-2 * nIntro) > 0.15, "вступление короче такта"

# ---------- вступление и строки 1–6 (сетка A) ----------
mark("intro", GA(-2 * nIntro))
p_trem(0.06, GA(-2 * nIntro) - 0.06, 69, 0.6, cresc=(0.3, 1.0), rate=15)       # подхват тремоло
j_ride = None
for j in range(-nIntro, nA // 2):
    tb = GA(2 * j)
    if tb >= T_SLIP:
        break
    if j < 0:
        role, bar = "intro", A[4 - nIntro + (j + nIntro)]
    elif tb < HORSE_IN - 0.25:
        role, bar = "ice", A[j % 8]
        if j == 0:
            mark("ice", tb)
    else:
        if j_ride is None:
            j_ride = j
            mark("ride", tb)
        role = "ride" if tb < L(5) - 0.3 else "gallop"
        if role == "gallop" and "gallop" not in MARK:
            mark("gallop", tb)
        bar = B[(j - j_ride) % 8]
    play_bar(GA, 2 * j, bar, role)
# дробь ложек перед «поспешал»: на ближайшую долю после слова
kp = int(np.ceil((W("w_posp") - L(1)) / bA - 0.05))
if GA(kp) < T_SLIP and GA(kp) >= MARK.get("gallop", 1e9):
    for off, v in ((-0.375, 0.45), (-0.25, 0.55), (-0.125, 0.65), (0, 1.15)):
        p_spoon(GA(kp + off), v)
    mark("spoons_roll", GA(kp))

# ---------- падение: глиссандо и «бом» (шина free) ----------
mark("stop", T_SLIP)
mark("fall_gliss", T_FLY0)
put("free", T_FLY0, bal_gliss(T_FLY0, T_LAND, 86, 62, 0.8), 0.15, 0.5)
put("free", T_FLY0, whistle(T_FLY0, T_LAND, 93, 74, 1.0), -0.1, 0.12)
mark("bom", T_LAND + FRAME)
p_bass(T_LAND + FRAME, 38, 0.6, 0.6, bus="free")
p_garm(T_LAND + FRAME, (50, 57), 0.32, 0.3, bus="free")

# ---------- пауза в плясе: строки 7–8 ----------
mark("pause", L(7))
p_bal(W("w_upal7a") + 0.02, 69, 0.55, 0.5, bus="free")                         # «упал» — плинь
p_bal(W("w_upal7b") + 0.02, 65, 0.5, 0.5, bus="free")                          # «упал» — ниже
p_trem(W("w_lezh"), 0.55, 62, 0.42, cresc=(1.0, 0.5), bus="free")             # «лежит» — низкое тремоло
p_bass(W("w_lezh"), 38, 0.45, 0.6, bus="free")
p_garm(E(7) + 0.05, (58, 62, 67), 0.85, 0.32, bus="free", att=0.08, rel=0.15,   # вздох (соль минор)
       bend=lambda tv: -0.6 * np.clip((tv - 0.5) / 0.35, 0, 1))
t_tb = W("w_bezh")                                                             # «не бежит» — уа-уа-уа-уааа
st_tb = min(0.22, (L(9) - 0.12 - t_tb) / 3.6)
mark("sad_garm", t_tb)
for i, m in enumerate((64, 63, 62)):
    p_garm(t_tb + i * st_tb, (m, m - 12), st_tb * 0.8, 0.42, bus="free", att=0.035, rel=0.05,
           bend=lambda tv: -0.3 * np.exp(-tv / 0.04))
t_last = t_tb + 3 * st_tb
d_last = max(0.3, L(9) - 0.08 - t_last)
p_garm(t_last, (61, 49), d_last, 0.42, bus="free", att=0.04, rel=0.12,
       bend=lambda tv: 0.35 * np.sin(2 * np.pi * 5.5 * tv) * np.clip(tv / 0.12, 0, 1) - 0.25 * np.clip(tv / d_last, 0, 1))

# ---------- «Две девушки увидали»: пляс оживает (сетка V) ----------
mark("revival", L(9))
for i, m in enumerate((69, 71, 73, 74, 76, 78, 79, 76)):
    t0 = GV(i * 0.5)
    p_trem(t0, GV(i * 0.5 + 0.5) - t0, m, 0.35 + 0.5 * i / 7, rate=15)
for b in range(4):
    p_bass(GV(b), 45, 0.45 + 0.12 * b, 0.5 * (GV(b + 1) - GV(b)))
    p_strum(GV(b + 0.5), CH["A7"][2], 0.25 + 0.08 * b, 0.15, up=bool(b % 2))
p_garm(GV(2), (61, 64, 67, 57), GV(4) - GV(2) - 0.02, 0.5, att=0.5, rel=0.05)

# ---------- бег девушек (сетка R, ускорение) ----------
mark("run", T_RUN0)
for j, bar in enumerate([A[0], A[1], A[2], R4]):
    play_bar(GR, 2 * j, bar, "run")

# ---------- торможение «пам!», пляс, «наказывали», конь уезжает (сетка C) ----------
mark("brake", T_RUN1)
p_bass(T_RUN1, 38, 1.0, 0.45)
p_garm(T_RUN1, CH["D"][1] + (50, 74), 0.3, 0.7)
p_strum(T_RUN1, CH["D"][2], 0.8, 0.25)
p_bal(T_RUN1, 86, 0.9, 0.35)
p_bal(GC(1.5), 74, 0.55, 0.2)
p_bal(GC(1.75), 76, 0.6, 0.2)
rolesC = []
for j in range(1, nC // 2):
    tb = GC(2 * j)
    rolesC.append((j, "dance" if tb < L(16) - 0.3 else ("strict" if tb < T_GO - 0.3 else "ride2")))
n_strict = sum(1 for _, r in rolesC if r == "strict")
cnt = {"dance": 0, "strict": 0, "ride2": 0}
for j, role in rolesC:
    i = cnt[role]
    cnt[role] += 1
    if role not in MARK:
        mark(role, GC(2 * j))
    if role == "dance":
        bar = A[i % 8]
    elif role == "strict":
        bar = S_END if (i == n_strict - 1 and n_strict > 1) else S[i % 4]
    else:
        bar = B[i % 8]
    play_bar(GC, 2 * j, bar, role)

# ---------- ёлка: пляс обрывается, гармошка «сдувается» ----------
mark("bump", T_BUMP + FRAME)
p_garm(T_BUMP + FRAME + 0.05, (62, 66, 69), 0.6, 0.45, bus="free", att=0.02, rel=0.12,
       bend=lambda tv: -3.0 * np.clip(tv / 0.6, 0, 1) ** 1.3)

# ---------- финальный титр: концовка плясовой (сетка F) ----------
mark("final", FIN)
for j, bar in enumerate([B[0], B[2], F3]):
    play_bar(GF, 2 * j, bar, "final")
kF = 6
p_bass(GF(kF), 45, 1.0, 0.5 * bF)                                              # «пам» — ля-септаккорд
p_garm(GF(kF), (61, 64, 67, 69, 57), 0.3 * bF, 0.75)
p_strum(GF(kF), CH["A7"][2], 0.55, 0.3 * bF)
p_bal(GF(kF), 85, 1.0, 0.4 * bF)
for off, v in ((0, 1.0), (0.5, 0.7), (0.75, 0.6)):
    p_spoon(GF(kF + off), 0.9 * v)
tD = GF(kF + 1)                                                                # «пам» — ре мажор, звенит до конца
mark("final_chord", tD)
p_bass(tD, 38, 1.05, 1.5)
p_garm(tD, (50, 62, 66, 69, 74), max(0.4, TOTAL - tD - 0.5), 0.75, rel=0.35)
p_strum(tD, CH["D"][2], 0.9, 1.0)
p_trem(tD, min(1.0, TOTAL - tD - 0.4), 86, 0.8, cresc=(1.0, 0.45), rate=14)
p_spoon(tD, 1.1)

# ---------- стоп пляса и ревербератор ----------
gate_keys = [(0, 1), (T_SLIP + 0.02, 1), (T_SLIP + 0.045, 0), (L(9) - 0.06, 0), (L(9) - 0.02, 1),
             (T_BUMP + FRAME, 1), (T_BUMP + FRAME + 0.03, 0), (FIN - 0.06, 0), (FIN - 0.02, 1), (TOTAL, 1)]
tN = np.arange(N) / SR
GATE = np.interp(tN, [k_[0] for k_ in gate_keys], [k_[1] for k_ in gate_keys])
for nm in ("bal", "garm", "bass", "perc"):
    BUS[nm] *= GATE


def make_ir(rt60, length, seed, lp=6000, pre=0.02):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60)
    ir = ffilt(ir, rbj("lp", lp, 0.6), rbj("hp", 200, 0.6))
    ir *= np.minimum(1, t / 0.006)
    ir = np.concatenate([np.zeros(int(pre * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = fast_len(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


IR_M = [make_ir(1.1, 1.5, 31), make_ir(1.1, 1.5, 32)]          # деревянная изба
IR_S = [make_ir(0.8, 1.1, 41, 7000, 0.01), make_ir(0.8, 1.1, 42, 7000, 0.01)]
WET = 0.32
send = sum(BUS_SEND[nm] * BUS_G[nm] * 0.5 * (BUS[nm][0] + BUS[nm][1]) for nm in BUSES)
music = sum(BUS[nm] * BUS_G[nm] for nm in BUSES)
for ch in (0, 1):
    music[ch] += WET * convolve(send, IR_M[ch])
    music[ch] = ffilt(music[ch], rbj("hp", 40, 0.7))

# ---------- голос ----------
rawv = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(POEM, "voice.mp3"), "-f", "f32le", "-ac", "1",
                       "-ar", str(SR), "-"], capture_output=True, check=True).stdout
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


dB = lambda v: 10 * np.log10(max(v, 1e-20))
VCH = [vfull, vfull]                       # в ролике голос моно идёт в оба канала
vMS = ms(VCH, SPEECH)
kv = kweight(vfull)
vKMS = ms([kv, kv], SPEECH)

# ---------- форма громкости музыки ----------
MCH = [music[0], music[1]]
lineG = []
for i in range(1, NL + 1):
    w = [(L(i), E(i))]
    lineG.append(np.sqrt(ms(VCH, w) * db(UNDER_DB + LINE_DB.get(i, 0)) ** 2 / max(ms(MCH, w), 1e-20)))
cap = max(lineG[:6]) * db(4.0)                       # редкие ноты паузы не раздуваем
for i in (6, 7):
    if lineG[i] > cap:
        print(f"строка {i + 1}: усиление ограничено ({20 * np.log10(lineG[i] / cap):+.1f} дБ сверх предела)")
        lineG[i] = cap
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
W_INTRO = [(GA(-2 * nIntro), L(1) - 0.15)]
W_RIDE = [(T_GO + 0.15, T_BUMP)]
W_FIN = [(FIN, GF(kF + 1))]
gI, gR, gZ = gFor(W_INTRO, INTRO_DB), gFor(W_RIDE, FIN_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0), (0.1, gI), (L(1) - 0.3, gI), (L(1) - 0.02, lineG[0])]
GAPS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i < NL and L(i + 1) - E(i) >= 0.45:
        gl = max(g, lineG[i]) * db(GAP_LIFT_DB)
        shape += [(E(i) + 0.1, gl), (L(i + 1) - 0.12, gl)]
        GAPS.append(i)
shape += [(E(NL) + 0.06, lineG[-1]), (T_GO + 0.15, gR), (T_BUMP + 0.05, gR), (FIN - 0.1, gZ),
          (TOTAL - 1.3, gZ), (TOTAL - 0.6, gZ * 0.35), (TOTAL, 0)]
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f}")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve


# ---------- шумы ----------
def sfx_plop(size=1.0, pitch=1.0, wet=1.0):
    """мягкий пластилиновый «плюх»: глухой удар с падением тона и влажный шлепок"""
    n = int(0.3 * SR)
    t = tt(n)
    f = (85 + 170 * np.exp(-t / 0.022)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.055 * size))
    slap = nbank("bp900", n) * np.exp(-t / 0.010) * 0.35 * wet
    squish = nbank("bp1800", n) * np.exp(-0.5 * ((t - 0.028 * size) / 0.012) ** 2) * 0.18 * wet
    return tail_fade((body + slap + squish) * (1 - np.exp(-t / 0.0015)))


def sfx_thud(f0=62, size=1.0, puff=1.0):
    """глухой «бум» в снег: низкий удар и «пуф» снега"""
    n = int(0.9 * SR)
    t = tt(n)
    f = f0 + 90 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.16 * size))
    pf = nbank("lp1200", n) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.004)) * 0.5 * puff
    cr = nbank("bp2500", n) * grains(n, 25, 0.12) * 0.25 * puff
    return tail_fade((body + pf + cr) * (1 - np.exp(-t / 0.002)))


def sfx_pum(f0=150, knock=0.0, puff=0.0):
    """«пум»: мягкий круглый поп (плашка, указатель)"""
    n = int(0.4 * SR)
    t = tt(n)
    f = f0 * (1 + 0.8 * np.exp(-t / 0.018))
    phi = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(phi) + 0.25 * np.sin(2 * phi)) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.003))
    x += 0.08 * nbank("bp1800", n) * np.exp(-t / 0.004)
    x += knock * (0.3 * np.sin(2 * np.pi * 520 * t) * np.exp(-t / 0.025) + 0.15 * np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.012))
    x += puff * 0.3 * nbank("lp1200", n) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.004))
    return tail_fade(x)


def sfx_hoof(v=1.0, crunch=1.0):
    """копыто по снегу: глухой удар и хруст"""
    n = int(0.16 * SR)
    t = tt(n)
    thump = np.sin(2 * np.pi * np.cumsum(120 + 70 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.028)
    cr = nbank("bp1800", n) * np.exp(-t / 0.018) * 0.4 * crunch + nbank("bp2500", n) * grains(n, 10, 0.04) * 0.3 * crunch
    return tail_fade((thump + cr) * (1 - np.exp(-t / 0.001)) * v)


def sfx_step():
    """шаг по снегу: хрусткие щелчки и мягкий низ"""
    n = int(0.14 * SR)
    t = tt(n)
    cr = nbank("bp2500", n) * grains(n, rng.integers(10, 18), 0.06) * 0.9
    lo = nbank("lp400", n) * np.exp(-t / 0.025) * 0.5
    return tail_fade((cr + lo) * (1 - np.exp(-t / 0.002)))


def sfx_pat():
    """заячий прыжок: мягкое «пат» лапами"""
    n = int(0.15 * SR)
    t = tt(n)
    x = nbank("lp1200", n) * np.exp(-t / 0.02) * 0.6 + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03)
    x += nbank("bp2500", n) * grains(n, 6, 0.03) * 0.25
    return tail_fade(x * (1 - np.exp(-t / 0.002)))


def sfx_flutter(dur, p0=-0.7, p1=0.4):
    """снегирь перелетает: пачки взмахов и планирование"""
    n = int((dur + 0.3) * SR)
    out = np.zeros((2, n))
    tc = 0.0
    while tc < dur:
        for _ in range(int(rng.integers(4, 7))):
            if tc >= dur:
                break
            m = int(0.03 * SR)
            u = tt(m)
            flap = nbank("bp2500" if rng.random() < 0.5 else "bp1800", m) * np.sin(np.pi * u / 0.03) ** 2
            gl, gr = pan_lr(p0 + (p1 - p0) * tc / dur)
            i = int(tc * SR)
            out[0, i:i + m] += flap * gl * rng.uniform(0.6, 1.0)
            out[1, i:i + m] += flap * gr * rng.uniform(0.6, 1.0)
            tc += 1 / 17
        tc += rng.uniform(0.12, 0.25)
    return out


def sfx_chirp():
    """снегирь: «чик-чирик»"""
    parts = []
    for f0, f1, d in ((3600, 5200, 0.045), (5000, 3800, 0.07)):
        m = int(d * SR)
        u = tt(m)
        f = f0 + (f1 - f0) * u / d
        phi = 2 * np.pi * np.cumsum(f) / SR
        parts.append((np.sin(phi) + 0.2 * np.sin(2 * phi)) * np.sin(np.pi * u / d) * (1 + 0.3 * np.sin(2 * np.pi * 90 * u)))
    gap = np.zeros(int(0.03 * SR))
    return tail_fade(np.concatenate([parts[0], gap, parts[1], np.zeros(int(0.05 * SR))]))


def sfx_ice(dur):
    """лёд нарастает: тихий хрустально-звенящий треск, всё гуще"""
    n = int((dur + 0.4) * SR)
    out = np.zeros((2, n))
    tc = 0.02
    while tc < dur:
        u = tc / dur
        a = 0.3 + 0.7 * u
        if rng.random() < 0.55:
            m = int(0.004 * SR)
            y = nbank("hp7k", m) * np.exp(-tt(m) / 0.0008)
        else:
            m = int(0.12 * SR)
            v = tt(m)
            f = rng.uniform(3000, 7500)
            y = 0.5 * np.sin(2 * np.pi * f * v) * np.exp(-v / rng.uniform(0.015, 0.05)) * (1 - np.exp(-v / 0.0005))
        gl, gr = pan_lr(rng.uniform(-0.6, 0.6))
        i = int(tc * SR)
        j = min(n, i + len(y))
        out[0, i:j] += y[:j - i] * a * gl
        out[1, i:j] += y[:j - i] * a * gr
        tc += 1 / (6 + 16 * u) * rng.uniform(0.5, 1.5)
    return out


def sfx_glint():
    """блик на льду: «дзынь» (ля и ми — в тон музыке)"""
    n = int(1.4 * SR)
    t = tt(n)
    x = np.zeros(n)
    for m, a in ((93, 1.0), (100, 0.45)):
        f = float(hz(m))
        for r, ar, tau in ((1, 1, 0.6), (2.76, 0.3, 0.2), (5.4, 0.12, 0.08)):
            if r * f < 17000:
                x += a * ar * np.sin(2 * np.pi * r * f * t + rng.random() * 6.28) * np.exp(-t / tau)
    return tail_fade(x * (1 - np.exp(-t / 0.0008)))


def sfx_skid(dur):
    """копыта скользят по льду: скрежет с уходящей вниз полосой и писк"""
    n = int((dur + 0.2) * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 2600 - 1700 * min(1.0, tc / dur), q=2.0, power=2)
    rough = 1 + 0.6 * ffilt(noise(n), rbj("lp", 60, 0.7)) / 0.1
    env = np.minimum(1, t / 0.03) * np.where(t < dur, 1 - 0.4 * t / dur, 0.6 * np.exp(-(t - dur) / 0.05))
    x = x / np.sqrt(np.mean(x ** 2)) * np.clip(rough, 0.2, 2.5) * env
    f = 2100 - 500 * np.clip(t / dur, 0, 1) + 40 * np.sin(2 * np.pi * 25 * t)
    sq = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * 0.5
    return tail_fade(0.6 * x + sq)


def sfx_stars(dur):
    """звёздочки над головой: тихие высокие «динь», кружат"""
    n = int((dur + 0.5) * SR)
    out = np.zeros((2, n))
    tc = 0.0
    while tc < dur:
        f = float(hz([93, 98, 100, 105][int(rng.integers(0, 4))]))
        m = int(0.5 * SR)
        u = tt(m)
        y = np.sin(2 * np.pi * f * u) * np.exp(-u / 0.18) * (1 - np.exp(-u / 0.001)) * rng.uniform(0.5, 1.0)
        gl, gr = pan_lr(0.5 * np.sin(2 * np.pi * 0.7 * tc))
        i = int(tc * SR)
        j = min(n, i + m)
        out[0, i:j] += y[:j - i] * gl
        out[1, i:j] += y[:j - i] * gr
        tc += rng.uniform(0.13, 0.28)
    return out


def sfx_crow():
    """ворона фыркает: короткое тихое «кр»"""
    n = int(0.3 * SR)
    t = tt(n)
    tb = table(1.0 / np.arange(1, 30))
    x = osc(tb, 480 - 250 * t, n) * (1 + 0.6 * np.sin(2 * np.pi * 38 * t))
    x = ffilt(x, rbj("bp", 1400, 1.0))
    env = (1 - np.exp(-t / 0.015)) * np.exp(-t / 0.08)
    x = x * env + 0.15 * nbank("bp1800", n) * np.exp(-t / 0.03)
    return tail_fade(x)


def sfx_whoosh(dur, f0, f1, crunch=0.0):
    """«вжух»: шум с полосой, скользящей от f0 к f1"""
    n = int((dur + 0.15) * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: f0 * (f1 / f0) ** min(1.0, tc / dur), q=1.0)
    x /= np.sqrt(np.mean(x ** 2))
    u = np.clip(t / dur, 0, 1)
    x *= np.sin(np.pi * u) ** 1.2 * (t < dur)
    if crunch:
        x += crunch * nbank("bp2500", n) * grains(n, 40, dur * 0.8)
    return tail_fade(x)


def sfx_brake():
    """тормозят с волной снега: резкий «вжух» вниз и хруст"""
    n = int(0.6 * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 3500 * (700 / 3500) ** min(1.0, tc / 0.45), q=0.8)
    x /= np.sqrt(np.mean(x ** 2))
    x *= np.minimum(1, t / 0.03) * np.exp(-t / 0.18)
    x += 0.8 * nbank("bp2500", n) * grains(n, 35, 0.35) + 0.4 * nbank("lp1200", n) * np.exp(-t / 0.12)
    return tail_fade(x)


def sfx_boing():
    """пружинный «боинг»: тон качается и затухает"""
    n = int(0.75 * SR)
    t = tt(n)
    f = 190 * (1 + 0.35 * np.exp(-t / 0.18) * np.sin(2 * np.pi * 11 * t)) * (1 + 0.25 * (1 - np.exp(-t / 0.1)))
    phi = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(phi) + 0.5 * np.sin(2 * phi) + 0.25 * np.sin(3 * phi) + 0.12 * np.sin(4 * phi))
    return tail_fade(x * np.exp(-t / 0.25) * (1 - np.exp(-t / 0.002)))


def sfx_roll(dur):
    """дорожка-колбаска раскатывается: мягкий шорох, перекат всё реже и дальше"""
    n = int((dur + 0.2) * SR)
    t = tt(n)
    x = nbank("lp400", n) + 0.5 * nbank("bp900", n)
    fr = 7 - 4 * np.clip(t / dur, 0, 1)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(fr) / SR)
    env = np.minimum(1, t / 0.1) * np.where(t < dur, 1 - 0.6 * t / dur, 0.4 * np.exp(-(t - dur) / 0.06))
    y = x * am * env
    out = np.zeros((2, n))
    pn = np.clip(t / dur, 0, 1)
    out[0] = y * np.cos((pn * 0.6 + 1) * np.pi / 4)
    out[1] = y * np.sin((pn * 0.6 + 1) * np.pi / 4)
    return tail_fade(out)


def sfx_tree():
    """въезжает в ёлку: «бум» и шорох веток"""
    n = int(0.9 * SR)
    t = tt(n)
    x = sfx_thud(75, 0.9, 0.5)[:n]
    x = np.pad(x, (0, n - len(x)))
    x += 0.5 * nbank("bp3500", n) * grains(n, 70, 0.55, tau=0.003) * np.exp(-t / 0.35)
    x += 0.3 * np.sin(2 * np.pi * 300 * t) * np.exp(-t / 0.04)
    return tail_fade(x)


# --- время шумов из кадра ---
def touchdowns(t0, t1, s_of_t, stride, offs, merge=0.012):
    """моменты, когда копыто/нога встаёт на землю (stepFoot в main.js: s/stride + off переходит через целое)"""
    ts = np.arange(t0, t1, 0.001)
    s = s_of_t(ts)
    hits = []
    for off in offs:
        u = np.floor(s / stride + off)
        hits += [float(ts[i + 1]) for i in np.nonzero(np.diff(u) > 0)[0]]
    hits.sort()
    out = []
    for h in hits:  # одновременные (диагональная пара на рыси) — один удар погромче
        if out and h - out[-1][0] < merge:
            out[-1][1] = 1.0
        else:
            out.append([h, 0.72])
    return out


lerp = lambda a, b, u: a + (b - a) * u
TROT = (190, (0.0, 0.5, 0.5, 0.0))
GALLOP = (300, (0.45, 0.57, 0.0, 0.12))
WALK = (130, (0.25, 0.75, 0.0, 0.5))
trot_hits = touchdowns(HORSE_IN, L(5), lambda t: lerp(HX_START - 300, HX_TROT, prog(t, HORSE_IN, L(5))), *TROT)
gallop_hits = touchdowns(L(5), T_SLIP, lambda t: lerp(HX_TROT, HX_SLIP, prog(t, L(5), T_SLIP)), *GALLOP)
walk_hits = touchdowns(T_HWALK0, T_HWALK1, lambda t: lerp(HX_ICE, HX_STAND, sstep(prog(t, T_HWALK0, T_HWALK1))) - HX_ICE, *WALK)


def _away(t):
    u = prog(t, T_GO, T_BUMP)
    return lerp(HX_STAND, HX_BUMP, u * u * 0.25 + u * 0.75) - HX_STAND


away_hits = touchdowns(T_GO, T_BUMP, _away, *TROT)
girl_hits = []
for gi, (x0, x1, ph) in enumerate(GIRLS):
    def _gs(t, x0=x0, x1=x1):
        u = prog(t, T_RUN0, T_RUN1)
        return np.abs(lerp(x0, x1, sstep(u) * 0.3 + u * 0.7) - x0)
    for h, _ in touchdowns(T_RUN0, T_RUN1, _gs, 110, (ph, 0.5 + ph), merge=0.0):
        girl_hits.append((h, gi))
girl_hits.sort()
H0, H1 = L(8) - 0.4, E(8) + 0.8
hare_hits = [H0 + (k_ / 5.5) * (H1 - H0) for k_ in range(0, 6)]
snow_hits = [L(2) - 0.1 + (i / 26) * (E(2) + 0.3 - (L(2) - 0.1)) for i in range(26)]
let_hits = lambda t0: [t0 + i * LET_GAP + LET_FALL for i in range(N_LET)]
let_pan = lambda i: (-0.55 + 1.1 * i / max(1, N_L1 - 1)) if i < N_L1 else (-0.25 + 0.5 * (i - N_L1) / max(1, N_LET - N_L1 - 1))

sfx = np.zeros((2, N))
sfx_send = np.zeros(N)
SFX_LOG, SFX_WIN = [], {}


def to_st(x, pan=0.0):
    if x.ndim == 2:
        return x
    gl, gr = pan_lr(pan)
    return np.stack([x * gl, x * gr])


def hits_track(times, maker, pans, vels=None):
    """удары так, что пик каждого — на кадр позже события; возвращает (начало, стерео, пики)"""
    xs, peaks = [], []
    for i, te in enumerate(times):
        x = to_st(maker(i), pans(i) if callable(pans) else pans)
        env = np.convolve(np.abs(x).sum(0), np.ones(110) / 110, "same")
        pk = int(np.argmax(env[:int(0.3 * SR)]))
        xs.append((te + FRAME - pk / SR, x * (vels[i] if vels else 1.0)))
        peaks.append(te + FRAME)
    st = min(s for s, _ in xs)
    en = max(s + x.shape[1] / SR for s, x in xs)
    out = np.zeros((2, int((en - st) * SR) + 2))
    for s, x in xs:
        i0 = int(round((s - st) * SR))
        out[:, i0:i0 + x.shape[1]] += x
    return st, out, peaks


def place(name, what, t_ev, st, x, peaks=None, t_end=None, send=0.1):
    """громкость: самое громкое окно 100 мс (K-взвешенно) на SFX_DB к среднему голосу"""
    x = to_st(x)
    kx = np.stack([kweight(c) for c in x])
    p = (kx ** 2).sum(0)
    w = int(0.1 * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    mov = (cs[w:] - cs[:-w]) / w if len(p) > w else np.array([p.mean()])
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(float(mov.max()), 1e-20))
    i0 = int(round(st * SR))
    n_ = x.shape[1]
    j0, j1 = max(0, -i0), min(n_, N - i0)
    sfx[:, i0 + j0:i0 + j1] += x[:, j0:j1] * g
    sfx_send[i0 + j0:i0 + j1] += 0.5 * (x[0, j0:j1] + x[1, j0:j1]) * g * send
    env = np.abs(x).sum(0)
    act = np.nonzero(env > env.max() * 0.01)[0]
    a_, b_ = st + act[0] / SR, st + act[-1] / SR
    rec = {"name": name, "what": what, "t": r3(t_ev), "start": r3(a_), "end": r3(b_)}
    if peaks is not None:
        if len(peaks) == 1:
            rec["peak"] = r3(peaks[0])
        else:
            rec["hits"] = len(peaks)
            rec["first_peak"], rec["last_peak"] = r3(peaks[0]), r3(peaks[-1])
    if t_end is not None:
        rec["t_end"] = r3(t_end)
    rec["db"] = SFX_DB[name]
    SFX_LOG.append(rec)
    SFX_WIN.setdefault(name, []).append((a_, b_))


def hit(name, what, times, maker, pans=0.0, vels=None, send=0.1):
    st, x, pk = hits_track(times, maker, pans, vels)
    place(name, what, times[0], st, x, peaks=pk, send=send)


def long(name, what, t0, t1, x, send=0.1):
    place(name, what, t0, t0 + FRAME, x, t_end=t1, send=send)


# вступление
hit("title_plops", f"буквы заголовка шлёпаются ({N_LET} шт.)", let_hits(T_TITLE0),
    lambda i: sfx_plop(rng.uniform(0.85, 1.15), rng.uniform(0.85, 1.25)), let_pan)
long("finch_flutter", "снегирь перелетает к ёлке", 0.4, 3.0, sfx_flutter(3.0 - 0.4 - FRAME))
hit("sub_pop", "плашка подзаголовка — «пум»", [T_SUB0 + 0.1], lambda i: sfx_pum(150))
# строки 1–3: лёд и снег
long("ice_crackle", "лёд нарастает: хрустальный треск", L(1) - 0.05, E(1) + 0.15, sfx_ice(E(1) + 0.15 - L(1) + 0.05 - FRAME))
hit("ice_glint", "блик по льду — «дзынь»", [E(1) + 0.05], lambda i: sfx_glint(), 0.2, send=0.3)
hit("snow_plops", "снежные комочки шлёпаются на лёд (26 шт.)", snow_hits,
    lambda i: sfx_plop(0.6, rng.uniform(1.3, 1.7), 0.6), lambda i: rng.uniform(-0.4, 0.4),
    vels=[rng.uniform(0.5, 1.0) for _ in snow_hits])
# строки 4–6: Ваня едет, падает
hit("hooves_trot", "рысь: копыта по снегу", [h for h, _ in trot_hits], lambda i: sfx_hoof(1.0, 1.0),
    lambda i: -0.3 + 0.3 * i / max(1, len(trot_hits) - 1), vels=[v for _, v in trot_hits])
hit("hooves_gallop", "галоп: копыта по снегу", [h for h, _ in gallop_hits], lambda i: sfx_hoof(1.0, 1.2),
    lambda i: 0.0 + 0.15 * i / max(1, len(gallop_hits) - 1), vels=[v * rng.uniform(0.85, 1.0) for _, v in gallop_hits])
hit("finch_chirp", "снегирь чирикает (подпрыгивает на ветке)", [W("w_posp") - 0.25, W("w_posp") + 0.15],
    lambda i: sfx_chirp(), -0.35)
long("hoof_skid", "копыта скользят по скрытому льду", T_SLIP, T_SLIP + 0.8, sfx_skid(0.8 - FRAME))
hit("snow_thud", "Ваня шлёпается в сугроб — «бум»", [T_LAND], lambda i: sfx_thud(60, 1.0, 1.0), 0.1)
long("stars", "звёздочки над головой Вани", T_LAND + 0.15, W("w_nikto") + 0.5,
     sfx_stars(W("w_nikto") + 0.5 - T_LAND - 0.15 - FRAME), send=0.25)
# строки 7–9
hit("hare_hops", "заяц пробегает мимо (6 прыжков)", hare_hits, lambda i: sfx_pat(),
    lambda i: 0.5 - 0.8 * i / 5, vels=[0.55] + [1.0] * 5)
hit("crow", "ворона отворачивается и фыркает", [W("w_nikto") + 0.25], lambda i: sfx_crow(), -0.4)
# строки 10–13
hit("girls_steps", "девушки бегут по снегу", [h for h, _ in girl_hits], lambda i: sfx_step(),
    lambda i: (0.4 if girl_hits[i][1] else 0.25) - 0.35 * (girl_hits[i][0] - T_RUN0) / (T_RUN1 - T_RUN0),
    vels=[rng.uniform(0.7, 1.0) for _ in girl_hits])
hit("horse_walk", "конь встаёт и идёт шагом", [h for h, _ in walk_hits], lambda i: sfx_hoof(0.8, 0.7), -0.15,
    vels=[v for _, v in walk_hits])
hit("girls_brake", "девушки тормозят с волной снега", [T_RUN1], lambda i: sfx_brake(), 0.1)
hit("boing", "Ваня «перелепляется» обратно — «боинг»", [T_UP], lambda i: sfx_boing(), 0.05, send=0.2)
long("jump_whoosh", "прыжок в седло — «вжух» вверх", T_JUMP, T_JUMPE, sfx_whoosh(T_JUMPE - T_JUMP - FRAME, 500, 2600))
hit("saddle_plop", "«плюх» в седло", [T_JUMPE], lambda i: sfx_plop(1.3, 0.8, 1.0), -0.05)
# строки 14–15
hit("sign_pop", "указатель выскакивает из снега — «пум»", [W("w_put14") + 0.12], lambda i: sfx_pum(170, 1.0, 1.0), 0.25)
long("road_roll", "дорожка раскатывается до деревни", W("w_put15") - 0.1, E(15) + 0.4,
     sfx_roll(E(15) + 0.4 - W("w_put15") + 0.1 - FRAME))
# финал
hit("hooves_away", "конь рысью уезжает", [h for h, _ in away_hits], lambda i: sfx_hoof(1.0, 1.0),
    lambda i: 0.5 * i / max(1, len(away_hits) - 1), vels=[v for _, v in away_hits])
hit("tree_bump", "въезжает в ёлку — «бум» и шорох веток", [T_BUMP], lambda i: sfx_tree(), 0.35)
hit("snow_hat", "ком снега шлёпается Ване на шапку", [T_BUMP + 0.45], lambda i: sfx_plop(1.3, 0.9, 1.2), 0.35)
hit("title_plops_fin", f"буквы финального заголовка шлёпаются ({N_LET} шт.)", let_hits(T_TITLE1),
    lambda i: sfx_plop(rng.uniform(0.85, 1.15), rng.uniform(0.85, 1.25)), let_pan)
hit("sub_pop_fin", "плашка подзаголовка — «пум»", [T_SUB1 + 0.1], lambda i: sfx_pum(150))
SFX_LOG.sort(key=lambda r: r["start"])
sfx_wet = np.stack([convolve(sfx_send, IR_S[0]), convolve(sfx_send, IR_S[1])]) * 0.6
sfx_all = sfx + sfx_wet

out = shaped + sfx_all
peak = float(np.max(np.abs(out)))
limit = 0.70 / peak if peak > 0.70 else 1.0       # не выше −3 dBFS
if limit < 1:
    print(f"внимание: пик {peak:.3f} — всё ослаблено в {limit:.3f} раза")
out *= limit
fi, fo = int(0.01 * SR), int(0.03 * SR)
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
with open(os.path.join(HERE, "sfx.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "секунды ролика. t — событие в кадре (t_end — конец длинного действия); peak — пик звука (на кадр "
                "позже события), у серий — первый и последний пик; start/end — где звук слышен; db — громкость шума "
                "к голосу (самое громкое окно 100 мс, K-взвешенно, BS.1770). music — ключевые моменты музыки.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "sfx": SFX_LOG, "music": MARK,
    }, f, ensure_ascii=False, indent=1)

# ---------- отчёт ----------
f1 = lambda x: f"{x:.1f}"
SH = [shaped[0] * limit, shaped[1] * limit]
ALL = [out[0], out[1]]
SA = [sfx_all[0] * limit, sfx_all[1] * limit]
rel = lambda chs, w: f1(dB(ms(chs, w)) - dB(vMS))
bpm = lambda b: 60 / b
print(f"события: {ev_src}; вступление {V0}, финал {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп 2/4: вступление и строки 1–6 ♩ = {bpm(bA):.0f} ({nIntro} такта вступления, {nA // 2} тактов до сугроба), "
      f"бег ♩ = {bpm(d_[0]):.0f} → {bpm(d_[-1]):.0f}, строки 12–18 ♩ = {bpm(bC):.0f}, финал ♩ = {bpm(bF):.0f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом (без шумов): RMS {rel(SH, SPEECH)} дБ к голосу; с шумами {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка без шумов, RMS дБ к голосу строки):",
      " ".join(f"{i}:{f1(dB(ms(SH, [(L(i), E(i))])) - dB(ms(VCH, [(L(i), E(i))])))}" for i in range(1, NL + 1)))
print(f"вступление RMS {rel(SH, W_INTRO)}, конь уезжает {rel(SH, W_RIDE)}, финальный титр {rel(SH, W_FIN)}, паузы "
      + " ".join(f"{n_}|{n_ + 1}:{rel(SH, [(E(n_) + 0.1, L(n_ + 1) - 0.12)])}" for n_ in GAPS) + " (дБ к голосу)")
bal = lambda wins: ", ".join(f"{nm} {f1(dB(ms([BUS[nm][0], BUS[nm][1]], wins)) + 20 * np.log10(BUS_G[nm]))}" for nm in BUSES)
print(f"баланс шин (сухо, с BUS_G, RMS дБFS до общего уровня):\n  вступление — {bal(W_INTRO)}\n  строки 1–3 — "
      f"{bal(SPEECH[:3])}\n  строки 4–6 — {bal(SPEECH[3:6])}\n  строки 7–8 — {bal(SPEECH[6:8])}\n  строки 10–11 — "
      f"{bal(SPEECH[9:11])}\n  строки 16–18 — {bal(SPEECH[15:])}\n  финал — {bal(W_FIN)}")
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {float(np.max(np.abs(out))):.3f} ({f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS), "
      f"множитель {limit:.3f}; голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы:", "; ".join(f"{r['name']} {r.get('peak', r.get('first_peak', r['start']))}" for r in SFX_LOG))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
