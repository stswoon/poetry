#!/usr/bin/env python3
"""Музыка и шумы к басне И. А. Крылова «Мартышка и очки», стиль «Стрим блогера-обзорщика».

Своя подложка стрима, соль мажор, ~119 BPM: мягкая бочка, хлопок/римшот, хай-хэт и шейкер, пиццикато-бас,
маримба, синт-пэд, квадратный «плак»-лид, колокольчики. Мелодия и аранжировка свои.
  0 … V0       заставка эфира: «дзынь» включения (шум), джингл в семь долей (лид + маримба, бит, бас, пэд),
               удар на шестой доле, на седьмой вступает голос;
  строки 1–4   лёгкий грув под голосом: G Em C D, маримба через восьмую, римшот;
               на «Очки» — блеск колокольчика, в паузе после строки 4 — маримба вверх «та-да»;
  строки 5–9   распаковка и четыре попытки: грув плотнее (хлопок, шейкер, пиццикато на слабые доли, коробочка);
               после «никак» грув замолкает и «сдувается» (лид скользит вниз на октаву);
  строки 10–13 ворчание: ми минор, ~130 BPM, нервный пульс шестнадцатыми (глухой бас, хэт, пиццикато),
               тёмный пэд, Em Em C Am B7 Em;
  строки 14–15 разгон перед ударом: Am B7, арпеджио маримбы вверх, дробь малого, шумовой подъём;
               за 0,25 с до удара о камень — стоп-тишина;
  удар         звон: кластер колокольчиков и низкий «бум», потом мерцающий Emaj9 и падающие «осколки»
               колокольчиков на «брызги засверкали»;
  пауза 16|17  эфир рвётся: заикание мотива, остановка ленты, обратный подъём в «повтор эфира»;
  мораль       мягче и медленнее (~81 BPM): Am F C G F–G Dm7–D7, мягкая маримба, пэд, шейкер, в паузах
               между строками — ответы колокольчиков; после последней строки — подъём к финалу;
  финал (fin)  тот же джингл громче, с другим окончанием, аккорд G6/9 и затухание до конца ролика.
Под голосом музыка на UNDER_DB к голосу (RMS по каждой строке), внутри строки громкость постоянна, переходы — в паузах;
на заставке, в паузах между частями и в финале громче.
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все ниже голоса (список — sfx.json).

Запуск: python3 make_music.py [V0] [OUTRO]        (по умолчанию 3.6 и 7.5; можно --v0=3.6 --outro=7.5)
Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (пишет ../video/build.py), если он совпадает
с таймингами (при другом V0 сдвигает его); иначе события считает по timings.json так же, как build.py.
Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json (шумы и ключевые моменты музыки).
Нужны python3 + numpy и ffmpeg.
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
LINE_DB = {**{n: 0.0 for n in range(1, 5)}, **{n: 0.4 for n in range(5, 10)}, **{n: 0.5 for n in range(10, 14)},
           14: 0.8, 15: 0.8, 16: 0.0, **{n: -0.8 for n in range(17, 22)}}
INTRO_DB, FIN_DB = -7.0, -6.5      # заставка и финал
STING_DB = -11.0                   # «та-да» и «сдувание» в паузах между частями
GLITCH_DB = -10.0                  # пауза рассказ | мораль (эфир рвётся)
BRIDGE_DB = -12.0                  # подъём после последней строки к финалу
# шумы: K-взвешенная (BS.1770) громкость в своём окне, дБ к голосу в местах речи
SFX_DB = {
    "live_ding": -9, "parcel": -14, "tape": -16, "fly": -15, "donation": -14, "slap": -14, "swish": -15,
    "sniff": -17, "lick": -16, "buzzer": -16, "stamp_vraki": -12, "rock": -17, "smash": -6, "sparkles": -18,
    "static": -15, "rewind": -16, "price": -14, "crown": -12, "kick_out": -15, "stamp_block": -12,
}

# ---------- аргументы и время ----------
ap = argparse.ArgumentParser(description="музыка и шумы к «Мартышке и очкам»")
ap.add_argument("pos", nargs="*", type=float, help="V0 OUTRO")
ap.add_argument("--v0", type=float)
ap.add_argument("--outro", type=float)
args = ap.parse_args()
V0 = args.v0 if args.v0 is not None else (args.pos[0] if len(args.pos) > 0 else 3.6)
OUTRO = args.outro if args.outro is not None else (args.pos[1] if len(args.pos) > 1 else 7.5)
if V0 < 2.6 or OUTRO < 5:
    sys.exit("нужно V0 >= 2.6 и OUTRO >= 5")

r3 = lambda x: round(float(x), 3)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TJ = json.load(f)
VD = TJ["voiceDuration"]
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
LINES = TJ["lines"]
NL = len(LINES)
if NL != 21:
    sys.exit(f"ожидалась 21 строка, в timings.json {NL}")

# события — так же, как в ../video/build.py
norm = lambda s: re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))
WORDS = {"w_glaz": (1, "глазами"), "w_slyh": (2, "слыхала"), "w_zlo": (3, "зло"), "w_och1": (4, "Очки"),
         "w_poldz": (5, "полдюжины"), "w_dost": (5, "достала"), "w_vert": (6, "Вертит"), "w_tak": (6, "так"), "w_syak": (6, "сяк"),
         "w_temyu": (7, "темю"), "w_hvost": (7, "хвост"), "w_naniz": (7, "нанижет"), "w_nyuh": (8, "понюхает"), "w_liz": (8, "полижет"),
         "w_nikak": (9, "никак"), "w_tfu": (10, "Тьфу"), "w_durak": (10, "дурак"), "w_vrak": (11, "врак"), "w_nalg": (12, "налгали"),
         "w_proku": (13, "проку"), "w_volos": (13, "волос"), "w_dosad": (14, "досады"), "w_kamen": (15, "камень"), "w_hvat": (15, "хватила"),
         "w_bryz": (16, "брызги"), "w_sverk": (16, "засверкали"), "w_neschast": (17, "несчастью"), "w_polez": (18, "полезна"),
         "w_ceny": (18, "цены"), "w_nevezh": (19, "Невежда"), "w_hudu": (19, "худу"), "w_klon": (19, "клонит"),
         "w_poznat": (20, "познатней"), "w_gonit": (21, "гонит")}


def events_from_timings():
    ev = {"V0": V0}
    for i, l in enumerate(LINES, 1):
        ev[f"L{i}"], ev[f"E{i}"] = r3(l["start"] + V0), r3(l["end"] + V0)
    for k, (n, w) in WORDS.items():
        x = next((q for q in LINES[n - 1]["words"] if norm(q["text"]) == norm(w)), None)
        if x is None:
            sys.exit(f"нет слова «{w}» в строке {n}")
        ev[k] = r3(x["start"] + V0)
    ev["fin"] = r3(ev[f"E{NL}"] + 2.6)
    return ev


EV = events_from_timings()
ev_src = "timings.json"
_p = os.path.join(HERE, "events.json")
if os.path.exists(_p):
    with open(_p, encoding="utf-8") as f:
        raw = json.load(f)
    shift = V0 - raw.get("V0", V0)
    if abs(raw["L1"] + shift - EV["L1"]) < 0.02 and abs(raw[f"E{NL}"] + shift - EV[f"E{NL}"]) < 0.02:
        for k, v in raw.items():
            if isinstance(v, (int, float)) and k not in ("V0", "OUTRO", "total"):
                EV[k] = r3(v + shift)
        ev_src = "events.json" + (f" со сдвигом {shift:+.2f} с" if shift else "")
        if abs(raw.get("total", TOTAL) + shift - TOTAL) > 0.002:
            print(f"внимание: total в events.json {raw.get('total')}, у музыки {TOTAL} (другой OUTRO?)")
    else:
        print("events.json не совпадает с timings.json — события считаю по timings.json")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
FIN = EV["fin"]
if FIN > TOTAL - 4:
    sys.exit(f"финал слишком короткий: fin {FIN}, длина {TOTAL}")

# ключевые моменты (как в ../video/src/main.js)
TI = EV["w_hvat"] + 0.28           # удар о камень
S0 = TI - 0.25                     # стоп-тишина
G0 = L(10) - 0.12                  # ворчание («Тьфу пропасть!»)
M0 = L(17) - 0.12                  # «повтор эфира», мораль
b = float(np.clip((L(1) - 0.25) / 7, 0.42, 0.56))   # доля джингла и грува рассказа
A0 = L(1) - 7 * b                                    # начало джингла: 7 долей до голоса
nG = max(8, int(round((S0 - G0) / 0.465)))
bg = (S0 - G0) / nG                                  # доля ворчания: целое число долей до стопа
nM = max(8, 4 * int(round((FIN - M0) / 0.74 / 4)))
bm = (FIN - M0) / nM                                 # доля морали: целые такты до финала
bo = float(np.clip((TOTAL - FIN - 2.0) / 6, 0.42, 0.56))  # доля финального джингла
assert A0 > 0.15 and E(9) + 0.2 < G0 < L(10) and S0 > L(15) and M0 > E(16) + 0.6, "события не по порядку"
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1815)
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
    for c in (m, m * 3 // 4, m * 5 // 8):  # 2^k, 3·2^k, 5·2^k
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


def harm(f, kind="saw", fc=None, kmax=60, even=1.0, slope=1.0):
    K = max(1, int(min(kmax, SR * 0.45 / f)))
    k = np.arange(1, K + 1)
    a = 1.0 / k ** slope
    if kind == "square":
        a = np.where(k % 2 == 1, a, a * even)
    if fc:
        a = a / np.sqrt(1 + (k * f / fc) ** 4)
    return a


def osc(tbl, freq, n, ph0=0.0):
    ph = ph0 + (freq * np.arange(n) / SR if np.isscalar(freq) else np.cumsum(freq) / SR)
    idx = (ph % 1.0) * TBL
    i0 = idx.astype(np.int64)
    fr = idx - i0
    return tbl[i0 % TBL] * (1 - fr) + tbl[(i0 + 1) % TBL] * fr


def noise(n):
    return rng.standard_normal(n)


# банки отфильтрованного шума для ударных
_NB = {}


def nb(name, n):
    if name not in _NB:
        x = noise(SR * 6)
        spec = {"hat": [rbj("hp", 7000, 0.7)], "shk": [rbj("bp", 6500, 0.9)], "snr": [rbj("bp", 2600, 0.6)],
                "clp": [rbj("bp", 1300, 1.1)], "rim": [rbj("bp", 1900, 2.5)], "crs": [rbj("hp", 3500, 0.7)],
                "knk": [rbj("bp", 2600, 1.2)]}[name]
        y = ffilt(x, *spec, power=2)
        _NB[name] = y / np.sqrt(np.mean(y ** 2))
    s = int(rng.integers(0, SR * 6 - n - 1))
    return _NB[name][s:s + n].copy()


def env_ar(n, att, dur, rel):
    t = tt(n)
    e = np.minimum(1.0, t / max(att, 1e-4))
    return e * np.where(t < dur, 1.0, np.exp(-(t - dur) / max(rel, 1e-4)))


def marimba(m, vel=0.6, soft=0.0):
    f = hz(m)
    tau = float(np.clip(0.5 * (262 / f) ** 0.55, 0.11, 0.85))
    n = int(min(5 * tau, 2.6) * SR)
    t = tt(n)
    ph = rng.random() * 0.2
    x = np.sin(2 * np.pi * f * t + ph) * np.exp(-t / tau)
    if 3.99 * f < 16000:
        x += 0.36 * (1 - 0.75 * soft) * np.sin(2 * np.pi * 3.99 * f * t + 0.4) * np.exp(-t / (tau * 0.2))
    if 9.8 * f < 16000:
        x += 0.12 * (1 - 0.9 * soft) * np.sin(2 * np.pi * 9.8 * f * t + 1.1) * np.exp(-t / (tau * 0.06))
    nk = int(0.01 * SR)
    x[:nk] += 0.07 * (1 - 0.8 * soft) * nb("knk", nk) * np.exp(-tt(nk) / 0.0015)
    x *= 1 - np.exp(-t / (0.0012 + 0.003 * soft))
    return x * vel


def pizz(m, vel=0.5, bright=1.0, dur=None):
    f = hz(m)
    tau = float(np.clip(0.42 * (196 / f) ** 0.5, 0.09, 0.6))
    if dur:
        tau = min(tau, dur * 0.7)
    n = int(min(4.5 * tau + 0.03, 3.0) * SR)
    t = tt(n)
    ph = rng.random()
    xb = osc(table(harm(f, "saw", fc=f * 6 * bright, slope=1.15)), f, n, ph)
    xd = osc(table(harm(f, "saw", fc=f * 2.2, slope=1.4)), f, n, ph)
    x = xd * np.exp(-t / tau) + (xb - xd) * np.exp(-t / (tau * 0.16))
    x *= 1 - np.exp(-t / 0.0025)
    return x * vel


def bass(m, dur, vel=0.7, muted=False):
    f = hz(m)
    n = int((dur + 0.1) * SR)
    t = tt(n)
    tau = 0.07 if muted else float(np.clip(0.55 * (98 / f) ** 0.4, 0.22, 0.8))
    ph = rng.random()
    body = osc(table([1, 0.45, 0.2, 0.1, 0.05]), f, n, ph)
    pl = osc(table(harm(f, "saw", fc=f * 5)), f, n, ph)
    x = body * np.exp(-t / tau) * (0.55 if not muted else 1) + body * (0.45 if not muted else 0) * np.exp(-t / (tau * 3))
    x += 0.4 * pl * np.exp(-t / 0.045)
    x *= (1 - np.exp(-t / 0.003)) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.04))
    return np.tanh(1.3 * x) / np.tanh(1.3) * vel


def lead(m, dur, vel=0.6, freq=None):
    f = hz(m)
    n = int((dur + 0.15) * SR)
    t = tt(n)
    if freq is None:
        freq = f * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1))
    ph = rng.random()
    xb = osc(table(harm(f, "square", even=0.3, fc=f * 9)), freq, n, ph)
    xd = osc(table(harm(f, "square", even=0.3, fc=f * 2.4)), freq, n, ph)
    x = xd + (xb - xd) * np.exp(-t / 0.08)
    x *= (1 - np.exp(-t / 0.004)) * (0.6 + 0.4 * np.exp(-t / 0.12)) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.05))
    return x * vel


def bell(m, vel=0.5, tau=1.0, partials=((1, 1, 1), (2.76, 0.4, 0.4), (5.40, 0.2, 0.2), (8.93, 0.1, 0.1))):
    f = hz(m)
    n = int(min(4.5 * tau, 4.0) * SR)
    t = tt(n)
    x = np.zeros(n)
    for r, a, tf in partials:
        if r * f < 17000:
            x += a * np.sin(2 * np.pi * r * f * t + rng.random() * 6.28) * np.exp(-t / (tau * tf))
    x *= 1 - np.exp(-t / 0.0008)
    return x * vel


def kick(vel=0.8):
    n = int(0.42 * SR)
    t = tt(n)
    f = 47 + 90 * np.exp(-t / 0.032)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
    x[:300] += 0.25 * nb("knk", 300) * np.exp(-tt(300) / 0.0015)
    return np.tanh(1.6 * x) / np.tanh(1.6) * vel * 0.7


def snare(vel=0.6):
    n = int(0.3 * SR)
    t = tt(n)
    return (0.45 * np.sin(2 * np.pi * 186 * t) * np.exp(-t / 0.045) + nb("snr", n) * 0.32 * np.exp(-t / 0.075)) * (1 - np.exp(-t / 0.0006)) * vel


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
    n = int((0.35 if open_ else 0.09) * SR)
    t = tt(n)
    return nb("hat", n) * 0.22 * np.exp(-t / (0.16 if open_ else 0.025)) * (1 - np.exp(-t / 0.0004)) * vel


def shaker(vel=0.3):
    n = int(0.11 * SR)
    t = tt(n)
    return nb("shk", n) * 0.18 * np.minimum(1, t / 0.014) * np.exp(-t / 0.035) * vel


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


# ---------- шины: «до стопа» и «после удара» (у каждой свой ревербератор) ----------
class Layer:
    def __init__(self, t0, t1):
        self.i0 = int(round(t0 * SR))
        self.n = int(round(t1 * SR)) - self.i0
        self.bus = {k: np.zeros((2, self.n)) for k in ("kick", "bass", "main")}
        self.send = np.zeros(self.n)


PRE = Layer(0, S0 + 0.02)
POST = Layer(TI - 0.02, TOTAL)


def put(busname, t, x, pan=0.0, send=0.15, gain=1.0):
    lay = PRE if t < S0 - 1e-4 else POST
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


# инструменты на шинах (общие уровни подобраны по балансу шин, см. отчёт)
def p_marimba(t, m, vel=0.5, pan=-0.22, soft=0.0, send=0.22):
    put("main", t, marimba(m, vel, soft), pan, send, 0.55)


def p_pizz(t, m, vel=0.5, pan=0.3, dur=None, bright=1.0):
    put("main", t, pizz(m, vel, bright, dur), pan, 0.2, 0.32)


def p_bass(t, m, dur, vel=0.7, muted=False):
    put("bass", t, bass(m, dur, vel, muted), 0.0, 0.0, 0.4)


def p_lead(t, m, dur, vel=0.6, pan=0.08):
    put("main", t, lead(m, dur, vel), pan, 0.22, 0.26)


def p_bell(t, m, vel=0.4, tau=1.0, pan=0.0, send=0.45):
    put("main", t, bell(m, vel, tau), pan, send, 0.3)


def p_drum(t, x, pan=0.0, send=0.08, bus="main"):
    put(bus, t, x, pan, send)


CH = {"G": (7, [0, 4, 7]), "Em": (4, [0, 3, 7]), "C": (0, [0, 4, 7]), "D": (2, [0, 4, 7]), "D7": (2, [0, 4, 7, 10]),
      "Am": (9, [0, 3, 7]), "Bm": (11, [0, 3, 7]), "B7": (11, [0, 4, 7, 10]), "F": (5, [0, 4, 7]),
      "Dm7": (2, [0, 3, 7, 10]), "G69": (7, [0, 4, 7, 9, 14]), "Emaj9": (4, [0, 4, 7, 11, 14]), "Am7": (9, [0, 3, 7, 10])}


def chord(name, lo, n):
    root, iv = CH[name]
    pcs = {(root + i) % 12 for i in iv}
    out, m = [], lo
    while len(out) < n:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def root(name, lo=36):
    r = CH[name][0]
    return lo + ((r - lo) % 12)


def pad_chord(t, name, dur, vel=0.4, lo=55, n=4, fc=1600, att=0.35, rel=0.6, det=(-9, 0, 8)):
    for j, m in enumerate(chord(name, lo, n)):
        f = hz(m)
        nn = int((dur + rel * 4) * SR)
        tv = tt(nn)
        env = np.minimum(1, tv / att) ** 1.5 * np.where(tv < dur, 1, np.exp(-(tv - dur) / rel))
        amps = harm(f, "saw", fc=fc, kmax=40)
        tb = table(amps)
        for k, d in enumerate(det):
            fd = f * 2 ** (d / 1200) * (1 + 0.0015 * np.sin(2 * np.pi * (0.3 + 0.1 * k) * tv + j))
            x = osc(tb, fd, nn, rng.random()) * env
            put("main", t, x, [-0.55, 0.0, 0.55][k] * (0.4 + 0.2 * j), 0.4, 0.085 * vel)


def stab(t, name, lo=52, n=4, vel=0.6):
    for j, m in enumerate(chord(name, lo, n)):
        p_pizz(t + j * 0.004, m, vel, -0.3 + 0.2 * j, bright=1.3)


# ---------- джингл эфира (заставка и финал) ----------
HOOK = [(0.0, .25, 71), (0.5, .25, 74), (0.75, .5, 76), (1.5, .25, 74), (2.0, .5, 79), (2.75, .25, 78), (3.0, .25, 76),
        (3.5, .5, 74)]
HOOK_A = [(4.0, .25, 72), (4.5, .25, 69), (4.75, .25, 71), (5.0, .25, 72), (5.5, .25, 73), (6.0, .6, 74), (6.0, .6, 79)]
HOOK_B = [(4.0, .25, 76), (4.5, .25, 72), (5.0, .25, 69), (5.25, .25, 71), (5.5, .5, 74), (6.0, 2.6, 79), (6.0, 2.6, 74)]


def jingle(t0, bb, ending, final=False):
    for bt, d, m in HOOK + ending:
        t = t0 + bt * bb
        p_lead(t, m, d * bb, 0.62 if bt < 6 else 0.7)
        p_marimba(t, m, 0.55 if bt < 6 else 0.6, -0.15)
    for bt, name, d in [(0, "G", 2), (2, "C", 2), (4, "D7", 2), (6, "G69" if final else "G", 2.4 if final else 1)]:
        pad_chord(t0 + bt * bb, name, d * bb, 0.5, 55, 4 if name != "G69" else 5)
    for bt, m, d in [(0, 43, 1.2), (1.5, 43, 0.4), (2, 48, 1.2), (3.5, 47, 0.4), (4, 50, 0.9), (5, 45, 0.4), (5.5, 42, 0.4),
                     (6, 43, 2.6 if final else 0.9)]:
        p_bass(t0 + bt * bb, m, d * bb, 0.75)
    for bt in (0, 2, 3.5, 4, 6):
        p_drum(t0 + bt * bb, kick(0.85), bus="kick")
    for bt in (1, 3, 5):
        p_drum(t0 + bt * bb, clap(0.7), 0.05, 0.12)
    for k in range(12):
        p_drum(t0 + k * 0.5 * bb, hat(0.35 if k % 2 == 0 else 0.6), 0.35)
    for k, v in enumerate((0.25, 0.35, 0.45, 0.6)):
        p_drum(t0 + (5 + 0.25 * k) * bb, snare(v), -0.05, 0.1)
    p_drum(t0 + 6 * bb, crash(0.6, 1.4 if final else 0.8), 0.25, 0.2)
    for j, m in enumerate((86, 91) if not final else (86, 91, 95)):
        p_bell(t0 + 6 * bb + j * 0.03, m, 0.45, 1.2 if final else 0.7, [-0.3, 0.3, 0][j])
    if final:
        for j, m in enumerate((79, 83, 86, 88, 91)):  # блеск поверх аккорда
            p_bell(t0 + 6.5 * bb + j * 0.11, m, 0.25, 0.8, -0.4 + 0.2 * j)


jingle(A0, b, HOOK_A)
mark("intro", A0)
mark("intro_hit", A0 + 6 * b)

# ---------- рассказ: строки 1–9 ----------
A_CH = ["G", "Em", "C", "D", "G", "C", "D", "G", "Em", "C", "D", "Am"]
A_END = E(9) + 0.02          # после «никак» грув замолкает
A2 = L(5) - 0.6              # распаковка: грув плотнее
mark("groove", L(1))
m = 0
while True:
    t = L(1) + 4 * m * b
    if t >= A_END - 0.05:
        break
    name = A_CH[m % len(A_CH)]
    dense = t >= A2
    pad_chord(t, name, min(4 * b, A_END - t), 0.32, 55, 4, fc=1500)
    tones = chord(name, 62, 4)
    for k in range(8):
        tb = t + k * 0.5 * b
        if tb >= A_END - 0.03:
            break
        beat = k / 2
        if beat in (0, 2):
            p_drum(tb, kick(0.7), bus="kick")
        if dense and beat == 2.5 and m % 2 == 1:
            p_drum(tb, kick(0.45), bus="kick")
        if beat in (1, 3):
            p_drum(tb, clap(0.5) if dense else rim(0.55), 0.05, 0.1)
        p_drum(tb, hat(0.28 if k % 2 == 0 else 0.5), 0.35)
        if dense:
            p_drum(tb + 0.25 * b, shaker(0.35), -0.4, 0.05)
            if k % 2 == 1:
                p_pizz(tb, chord(name, 67, 2)[k // 2 % 2], 0.32, 0.35, dur=0.12)
        # маримба: в начале через долю на слабые, с распаковки — восьмыми
        if dense or k % 2 == 1:
            p_marimba(tb, tones[[0, 2, 1, 2, 3, 2, 1, 2][k]], (0.4 if k % 2 == 0 else 0.32) * (1 if dense else 1.25))
    for bt, dm, d in [(0, 0, 0.9), (1.5, 0, 0.4), (2, 7, 0.9), (3, 12, 0.4), (3.5, None, 0.4)]:
        tb = t + bt * b
        if tb >= A_END - 0.03:
            break
        if dm is None:  # подход к следующему аккорду
            nxt = root(A_CH[(m + 1) % len(A_CH)], 43 if CH[A_CH[(m + 1) % len(A_CH)]][0] >= 7 else 43)
            mm = nxt - 1 if (m + 1) % 2 else nxt + 2
        else:
            mm = root(name, 43) + dm if root(name, 43) + dm < 62 else root(name, 43) + dm - 12
        p_bass(tb, mm, d * b, 0.7)
    if 8 <= m <= 10:  # попытки: коробочка тик-так
        for bt, mm in ((0.5, 84), (2.5, 79)):
            if t + bt * b < A_END - 0.03:
                put("main", t + bt * b, woodblock(mm, 0.4), 0.45, 0.1, 0.5)
    m += 1

# «Очки»: блеск колокольчика; пауза после строки 4 — маримба вверх «та-да»
p_bell(EV["w_och1"] + FRAME, 91, 0.35, 0.8, 0.2)
p_bell(EV["w_och1"] + FRAME + 0.06, 98, 0.25, 0.7, -0.2)
gap = L(5) - E(4)
for j, mm in enumerate((67, 71, 74, 79, 83)):
    p_marimba(E(4) + 0.02 + j * min(0.09, gap / 6), mm, 0.5 + 0.06 * j, -0.3 + 0.15 * j)
p_bell(E(4) + 0.02 + 4 * min(0.09, gap / 6), 91, 0.3, 0.6, 0.3)
mark("sting_och", E(4))
# «никак»: грув замолкает, лид «сдувается» на октаву вниз
td = E(9) + 0.03
dd = G0 - td - 0.02
nn = int((dd + 0.15) * SR)
tv = tt(nn)
fr = hz(76) * 2 ** (-np.clip(tv / dd, 0, 1) ** 1.6 * 1.0)
put("main", td, lead(76, dd, 0.7, freq=fr), 0.0, 0.25, 0.45)
p_bass(td, 40, dd * 0.8, 0.45)
mark("deflate", td)

# ---------- ворчание: строки 10–13, разгон: 14–15 ----------
B_FE = ["B7", "Am", "Em", "B7", "Am", "C", "Em", "Em"]  # такты с конца: 0 — последний перед стопом
mark("grumble", G0)
mark("build", S0 - 8 * bg)
stab(G0, "Em", 52, 4, 0.75)
p_drum(G0, crash(0.35, 0.5), 0.3, 0.15)
riser_t0 = S0 - 8 * bg
for j in range(nG):
    tb = G0 + j * bg
    r = nG - 1 - j
    fe, beat = r // 4, 3 - r % 4
    name = B_FE[min(fe, len(B_FE) - 1)]
    build = fe <= 1
    if beat == 0 or j == 0:
        pad_chord(tb, name, (4 - beat) * bg, 0.38, 50, 4, fc=900, att=0.2, rel=0.3, det=(-12, 0, 11))
    rt = root(name, 40)
    if beat in (0, 2) or (build and fe == 0) or (not build and beat == 1 and j % 8 == 5):
        p_drum(tb if beat in (0, 2) or build else tb + 0.75 * bg, kick(0.75), bus="kick")
    if beat in (1, 3):
        p_drum(tb, snare(0.55), 0.0, 0.1)
    for s in range(4):
        ts = tb + s * bg / 4
        p_drum(ts, hat((0.5, 0.22, 0.35, 0.22)[s]), 0.35)
        # нервный глухой бас шестнадцатыми
        mm = rt + (12 if s == 2 else 0)
        if build:
            mm = rt + (0, 0, 7, 12)[s]
        p_bass(ts, mm, bg / 4 * 0.7, (0.75, 0.45, 0.6, 0.45)[s], muted=True)
    # пиццикато: тремоло по звукам аккорда восьмыми
    tones = chord(name, 64, 4)
    for s in range(2):
        p_pizz(tb + s * bg / 2, tones[(2 * j + s) % 4], 0.3 if s else 0.38, 0.35 if s else -0.3, dur=0.1, bright=0.8)
    if build:  # дробь: восьмые → шестнадцатые, громче к стопу
        u = (tb - riser_t0) / (S0 - riser_t0)
        for s in range(2 if fe == 1 else 4):
            p_drum(tb + s * bg / (2 if fe == 1 else 4), snare(0.2 + 0.45 * u), 0.05, 0.08)
# арпеджио маримбы вверх на разгоне
arp = [m_ for nm in ("Am", "B7") for m_ in chord(nm, 57, 8)]
steps = int(round((S0 - riser_t0) / (bg / 4)))
for k in range(steps):
    nm = "Am" if k < steps // 2 else "B7"
    seq = chord(nm, 57 + (k * 7) // steps * 3, 10)
    p_marimba(riser_t0 + k * bg / 4, seq[k % 4 + (k * 6) // steps], 0.3 + 0.35 * k / steps, -0.35 + 0.7 * k / steps)
# шумовой подъём
nr = int((S0 - riser_t0) * SR)
ur = tt(nr) / (S0 - riser_t0)
rz = stft_bp(noise(nr), lambda tc: 400 * 15 ** min(1.0, tc / (S0 - riser_t0)), 1.4) * ur ** 2.2 * 0.18
put("main", riser_t0, rz, 0.0, 0.2, 1.0)
mark("stop", S0)

# ---------- удар о камень: звон, «брызги засверкали» ----------
mark("hit", TI)
for j, mm in enumerate((88, 95, 92, 100, 99)):
    p_bell(TI + FRAME + j * 0.012, mm, 0.42, 1.6, [-0.5, 0.5, -0.2, 0.25, 0][j], 0.55)
nn = int(1.6 * SR)
tv = tt(nn)
put("bass", TI + FRAME, np.sin(2 * np.pi * 41.2 * tv) * np.exp(-tv / 0.5) * (1 - np.exp(-tv / 0.004)) * 0.5, 0.0, 0.0, 1.0)
pad_chord(TI + 0.15, "Emaj9", E(16) - TI - 0.1, 0.33, 64, 5, fc=2600, att=0.7, rel=0.5)
tk = L(16) - 0.05
k = 0
SHARD = [100, 99, 97, 95, 92, 90, 88, 87, 85, 83, 80, 78, 76]
while tk < E(16) - 0.05:  # падающие «осколки» колокольчиков
    p_bell(tk, SHARD[k % len(SHARD)], 0.26 * (0.85 ** (k // 4)), 0.6, float(rng.uniform(-0.6, 0.6)), 0.5)
    tk += 0.13 + 0.03 * k
    k += 1

# ---------- пауза рассказ | мораль: эфир рвётся, «повтор эфира» ----------
tg = E(16) + 0.03
t_static = E(16) + 0.253
mark("glitch", tg)
for j, (dt, mm) in enumerate(((0.0, 74), (0.06, 74), (0.115, 73), (0.16, 71), (0.2, 67))):
    if tg + dt < t_static - 0.02:
        x = lead(mm, 0.045, 0.75)
        put("main", tg + dt, x[:int(0.05 * SR)] * np.hanning(int(0.05 * SR)) ** 0.3, [-0.4, 0.4, -0.2, 0.2, 0][j], 0.2, 0.3)
# остановка ленты: аккорд G съезжает вниз
nn = int(0.4 * SR)
tv = tt(nn)
slow = np.clip(1 - tv / 0.4, 0.05, 1) ** 1.3
for j, mm in enumerate(chord("G", 55, 4)):
    x = osc(table(harm(hz(mm), "saw", fc=1500, kmax=30)), hz(mm) * slow, nn, rng.random()) * slow ** 0.6
    put("main", t_static - 0.02, x * 0.05, -0.4 + 0.27 * j, 0.25, 1.0)
# обратный подъём в мораль
rs = 0.75
nn = int(rs * SR)
tv = tt(nn)
for j, mm in enumerate(chord("Am", 57, 4)):
    x = osc(table(harm(hz(mm), "saw", fc=1800, kmax=30)), hz(mm), nn, rng.random()) * (tv / rs) ** 3
    put("main", M0 - rs, x * 0.045, -0.45 + 0.3 * j, 0.5, 1.0)
nn = int(rs * SR)
xr = bell(81, 0.5, 0.5)[:nn][::-1] * np.minimum(1, tt(nn)[::-1] / 0.004 + 0)  # «реверс» колокольчика
put("main", M0 - rs, xr, 0.0, 0.4, 0.3)
mark("replay", M0)

# ---------- мораль: строки 17–21, подъём к финалу ----------
M_CH = [["Am"], ["F"], ["C"], ["G"], ["F", "G"], ["Dm7", "D7"]]
nbar = nM // 4
for kb in range(nbar):
    tb0 = M0 + 4 * kb * bm
    names = M_CH[min(kb, len(M_CH) - 1)] if kb < nbar - 1 else ["Dm7", "D7"]
    if kb == nbar - 2 and nbar > 6:
        names = ["F", "G"]
    halves = len(names)
    for h, name in enumerate(names):
        th = tb0 + h * 4 * bm / halves
        dur = 4 * bm / halves
        pad_chord(th, name, dur, 0.36, 55, 4, fc=1300, att=0.45, rel=0.6)
        p_bass(th, root(name, 38), dur * 0.8, 0.55)
        if halves == 1:
            p_bass(th + 2.5 * bm, root(name, 38) + 7 if root(name, 38) + 7 < 52 else root(name, 38) - 5, 1.2 * bm, 0.4)
        tones = chord(name, 57, 5)
        for k in range(int(8 / halves)):
            tk_ = th + k * bm / 2
            if kb == nbar - 1 and tk_ >= E(21) + 0.15:
                break
            p_marimba(tk_, tones[[0, 2, 3, 2, 4, 2, 3, 1][k]], 0.34 if k % 2 == 0 else 0.26, -0.25, soft=0.6, send=0.3)
    for k in range(8):
        tk_ = tb0 + k * bm / 2
        if kb == nbar - 1 and tk_ >= E(21) + 0.15:
            break
        p_drum(tk_, shaker(0.3 if k % 2 == 0 else 0.42), -0.35, 0.06)
        if k == 4:
            p_drum(tk_, rim(0.35), 0.1, 0.15)
        if k == 0 and kb > 0:
            p_drum(tk_, kick(0.4), bus="kick")
# ответы колокольчиков в паузах между строками морали
for n_ in range(17, 21):
    g0, g1 = E(n_), L(n_ + 1)
    if g1 - g0 < 0.3:
        continue
    tc = (g0 - M0) / bm
    name = M_CH[min(int(tc // 4), len(M_CH) - 1)]
    name = name[0] if len(name) == 1 or (tc % 4) < 2 else name[1]
    tones = chord(name, 76, 3)
    for j, mm in enumerate(tones[::-1] if n_ % 2 else tones):
        tq = g0 + 0.04 + j * min(0.15, (g1 - g0 - 0.1) / 3)
        p_bell(tq, mm, 0.28, 0.6, -0.3 + 0.3 * j, 0.45)
# подъём к финалу: маримба вверх по D7, мягкая дробь
tb0 = E(21) + 0.15
steps = int((FIN - tb0) / (bm / 4))
seq = chord("D7", 62, 16)
for k in range(steps):
    tk_ = FIN - (steps - k) * bm / 4
    p_marimba(tk_, seq[min(len(seq) - 1, k * 12 // max(1, steps))], 0.3 + 0.3 * k / steps, -0.3 + 0.6 * k / steps)
    if k % 2 == 0 or k > steps / 2:
        p_drum(tk_, snare(0.12 + 0.35 * k / steps), 0.05, 0.08)
mark("bridge", tb0)

# ---------- финал ----------
jingle(FIN, bo, HOOK_B, final=True)
mark("fin", FIN)
mark("fin_hit", FIN + 6 * bo)

# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=6500, pre=0.018):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60)
    ir = ffilt(ir, rbj("lp", lp, 0.6), rbj("hp", 180, 0.6))
    ir *= np.minimum(1, t / 0.006)
    ip = int(pre * SR)
    ir = np.concatenate([np.zeros(ip), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = fast_len(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


IR_M = [make_ir(1.5, 2.2, 11), make_ir(1.5, 2.2, 12)]
IR_S = [make_ir(0.7, 1.0, 21, 7000, 0.008), make_ir(0.7, 1.0, 22, 7000, 0.008)]
WET = 0.5
# под голосом бочку и бас тише (на заставке и в финале — как есть)
trim_keys = [(0, 1), (L(1) - 0.3, 1), (L(1) + 0.1, 0), (FIN - 0.3, 0), (FIN + 0.02, 1), (TOTAL, 1)]
TRIM = {"kick": 0.55, "bass": 0.7}
music = np.zeros((2, N))
for lay, gate_end in ((PRE, S0), (POST, None)):
    tl = (lay.i0 + np.arange(lay.n)) / SR
    tu = np.interp(tl, [k[0] for k in trim_keys], [k[1] for k in trim_keys])
    out = np.zeros((2, lay.n))
    for nm, B in lay.bus.items():
        k = TRIM.get(nm, 1.0)
        out += B * (1 - tu * (1 - k))
    for ch in (0, 1):
        out[ch] += WET * convolve(lay.send, IR_M[ch])
    if gate_end is not None:
        out *= np.interp(tl, [0, gate_end - 0.012, gate_end, 1e9], [1, 1, 0, 0])
    j1 = min(N, lay.i0 + lay.n)
    music[:, lay.i0:j1] += out[:, :j1 - lay.i0]
for ch in (0, 1):
    music[ch] = ffilt(music[ch], rbj("hp", 35, 0.7))

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
    lineG.append(np.sqrt(ms(VCH, w) * db(UNDER_DB + LINE_DB[i]) ** 2 / max(ms(MCH, w), 1e-20)))
gFor = lambda wins, target: np.sqrt(vMS * db(target) ** 2 / max(ms(MCH, wins), 1e-20))
gI = gFor([(A0, A0 + 6.5 * b)], INTRO_DB)
gF = gFor([(FIN, FIN + 7 * bo)], FIN_DB)
gB = gFor([(E(21) + 0.3, FIN - 0.1)], BRIDGE_DB)
STINGS = {4: STING_DB, 9: STING_DB, 13: STING_DB - 1, 16: GLITCH_DB}
gS = {n_: gFor([(E(n_) + 0.03, L(n_ + 1) - 0.1)], d) for n_, d in STINGS.items()}
shape = [(0, 0), (0.02, gI), (A0 + 6 * b + 0.12, gI), (L(1) - 0.02, lineG[0])]
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i in gS:
        gs = float(np.clip(gS[i], g * db(-2), g * db(10)))
        shape += [(E(i) + 0.03, gs), (L(i + 1) - 0.1, gs), (L(i + 1) - 0.01, lineG[i])]
shape += [(E(NL) + 0.08, lineG[-1]), (E(NL) + 0.6, gB), (FIN - 0.5, gB), (FIN - 0.05, gF), (TOTAL - 1.6, gF), (TOTAL - 0.03, 0), (TOTAL, 0)]
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f}")
tN = np.arange(N) / SR
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve

# ---------- шумы ----------
sfx = np.zeros((2, N))
sfx_send = np.zeros(N)
SFX_LOG, SFX_WIN = [], {}
SFX_LIST = [  # имя, что в кадре, ключ события, сдвиг, ключ конца, сдвиг конца (секунды ролика)
    ("live_ding", "«дзынь» включения эфира", None, 0.05, None, 0),
    ("parcel", "посылка шлёпается на стол", "L5", -0.033, None, 0),
    ("tape", "треск скотча", "w_poldz", -0.30, None, 0),
    ("fly", "«вжух» вылета шести пар", "w_poldz", 0.05, None, 0),
    ("donation", "«пинг» доната", "w_dost", -0.10, None, 0),
    ("slap", "шлепок очков на темя", "w_temyu", 0.0, None, 0),
    ("buzzer", "зуммер «✕» (попытка 1)", "w_temyu", 0.45, None, 0),
    ("swish", "«вжик» хвоста", "w_hvost", 0.005, None, 0),
    ("buzzer", "зуммер «✕» (попытка 2)", "w_hvost", 0.455, None, 0),
    ("sniff", "сопение", "w_nyuh", 0.0, None, 0),
    ("buzzer", "зуммер «✕» (попытка 3)", "w_nyuh", 0.45, None, 0),
    ("lick", "«лизь»", "w_liz", 0.0, None, 0),
    ("buzzer", "зуммер «✕» (попытка 4)", "w_liz", 0.45, None, 0),
    ("stamp_vraki", "штамп «ВРАКИ!»", "w_nalg", 0.14, None, 0),
    ("rock", "камень въезжает (шорох)", "L15", -0.25, "L15", 0.45),
    ("smash", "удар о камень и звон разбитого стекла", "w_hvat", 0.28, None, 0),
    ("sparkles", "мерцающие «блёстки»", "w_bryz", 0.0, "w_bryz", 1.0),
    ("static", "помехи «связь потеряна»", "E16", 0.253, "L17", -0.119),
    ("rewind", "обратная перемотка (свип вверх)", "w_polez", -0.05, "w_polez", 0.55),
    ("price", "«дзинь» ценника", "w_ceny", 0.003, None, 0),
    ("crown", "«бом» короны", "w_poznat", 0.35, None, 0),
    ("kick_out", "шлепок-пинок", "w_gonit", 0.0, None, 0),
    ("stamp_block", "удар штампа «ЗАБЛОКИРОВАНО»", "w_gonit", 0.30, None, 0),
]


def thump(f0, f1, tau, n_s, dec=0.03):
    n = int(n_s * SR)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / dec)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0008))


def bp_noise(n, f0, q, tau, att=0.0005, power=2):
    t = tt(n)
    return ffilt(noise(n), rbj("bp", f0, q), power=power) * np.exp(-t / tau) * (1 - np.exp(-t / att))


def sfx_live_ding():
    x = bell(88, 1.0, 0.45, ((1, 1, 1), (2.0, 0.25, 0.5), (3.0, 0.15, 0.3), (4.2, 0.08, 0.2)))
    y = bell(95, 0.9, 0.6, ((1, 1, 1), (2.0, 0.25, 0.5), (3.0, 0.12, 0.3)))
    o = int(0.09 * SR)
    out = np.zeros(max(len(x), o + len(y)))
    out[:len(x)] += x
    out[o:o + len(y)] += y
    return out


def sfx_parcel():
    n = int(0.45 * SR)
    x = 0.7 * thump(110, 52, 0.12, 0.45)
    x += 0.5 * bp_noise(n, 700, 0.8, 0.035)
    for d, a in ((0.05, 0.25), (0.085, 0.15)):
        i = int(d * SR)
        x[i:] += a * bp_noise(n - i, 1800, 1.5, 0.012)
    return x


def sfx_tape():
    dur = 0.34
    n = int(dur * SR)
    t = tt(n)
    base = stft_bp(noise(n), lambda tc: 1600 + 3500 * tc / dur, 0.9)
    gate = np.zeros(n)
    tc = 0.0
    while tc < dur:
        i = int(tc * SR)
        gate[i:] += np.exp(-(t[i:] - tc) / 0.0025) * rng.uniform(0.5, 1)
        tc += 1 / (60 + 140 * tc / dur) * rng.uniform(0.6, 1.4)
    return base * gate * np.minimum(1, t / 0.02) * np.where(t > dur - 0.05, np.clip((dur - t) / 0.05, 0, 1), 1)


def sfx_fly():
    dur = 0.6
    n = int(dur * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 500 + 2600 * np.sin(np.pi * min(1, tc / dur)) ** 0.7, 1.6)
    env = np.minimum(1, t / 0.025) * np.exp(-t / 0.22)
    flut = 1 + 0.5 * sum(np.exp(-((t - 0.07 * i - 0.02) / 0.02) ** 2) for i in range(6))
    xl = x * env * flut
    return np.stack([xl * np.linspace(0.9, 0.4, n), xl * np.linspace(0.6, 1.0, n)])


def sfx_donation():
    x = bell(83, 0.8, 0.12, ((1, 1, 1), (2.0, 0.3, 0.6), (3.0, 0.1, 0.4)))
    y = bell(88, 1.0, 0.45, ((1, 1, 1), (2.0, 0.3, 0.6), (3.0, 0.12, 0.4), (5.0, 0.05, 0.2)))
    o = int(0.075 * SR)
    out = np.zeros(o + len(y))
    out[:len(x)] += x[:len(out)]
    out[o:] += y
    return out


def sfx_slap():
    n = int(0.18 * SR)
    return 0.9 * bp_noise(n, 1500, 0.7, 0.016) + 0.7 * thump(240, 150, 0.03, 0.18, 0.01)


def sfx_swish():
    dur = 0.22
    n = int(dur * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 900 * 7 ** min(1, tc / 0.16), 1.8, nfft=512, hop=128)
    return x * np.exp(-((t - 0.07) / 0.05) ** 2)


def sfx_sniff():
    n = int(0.3 * SR)
    t = tt(n)
    x = np.zeros(n)
    for d, f0, a in ((0.0, 2600, 1.0), (0.13, 3100, 0.75)):
        u = t - d
        e = np.where(u >= 0, np.minimum(1, u / 0.02) * np.exp(-np.maximum(u, 0) / 0.035), 0)
        x += a * ffilt(noise(n), rbj("bp", f0, 1.4), power=2) * e
    return x


def sfx_lick():
    dur = 0.2
    n = int(dur * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 3800 - 2600 * min(1, tc / 0.15), 2.2, nfft=512, hop=128)
    x *= np.minimum(1, t / 0.01) * np.exp(-t / 0.06)
    f = 900 - 450 * np.minimum(1, t / 0.08)
    x += 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03) * np.minimum(1, t / 0.003)
    return x


def sfx_buzzer():
    dur = 0.2
    n = int((dur + 0.06) * SR)
    t = tt(n)
    tb = table(harm(196, "square", even=0.5, fc=1100))
    x = osc(tb, 196.0, n) + 0.8 * osc(tb, 199.5, n, 0.3)
    return x * np.minimum(1, t / 0.008) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.02))


def sfx_stamp(big=False):
    n = int((0.45 if big else 0.25) * SR)
    x = 0.6 * thump(120 if big else 150, 55 if big else 70, 0.09 if big else 0.05, n / SR, 0.012)
    x += (0.8 if big else 0.6) * bp_noise(n, 900, 0.6, 0.03 if big else 0.02)
    x += 0.3 * bp_noise(n, 420, 2.0, 0.025)
    return x


def sfx_rock(dur):
    n = int(dur * SR)
    t = tt(n)
    x = ffilt(noise(n), rbj("lp", 700, 0.7), power=2)
    gr = np.abs(ffilt(noise(n), rbj("lp", 45, 0.7), power=2))
    x *= 0.5 + gr / np.max(gr)
    cr = np.zeros(n)
    for _ in range(int(dur * 40)):
        i = int(rng.integers(0, n - 800))
        cr[i:i + 800] += rng.uniform(0.2, 1) * bp_noise(800, float(rng.uniform(1500, 3500)), 2.0, 0.003)
    x = x / np.sqrt(np.mean(x ** 2)) + 0.6 * cr / max(1e-9, np.sqrt(np.mean(cr ** 2)))
    return x * np.minimum(1, t / (dur * 0.6)) ** 1.5 * np.where(t > dur - 0.12, np.clip((dur - t) / 0.12, 0, 1), 1)


def sfx_smash():
    dur = 1.6
    n = int(dur * SR)
    t = tt(n)
    xl, xr = np.zeros(n), np.zeros(n)
    hitm = 0.75 * thump(85, 42, 0.22, dur, 0.02) + 0.9 * bp_noise(n, 1400, 0.6, 0.02) + 0.6 * ffilt(noise(n), rbj("hp", 3000, 0.7)) * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.001))
    xl += hitm * 0.75
    xr += hitm * 0.75
    tc = 0.004
    while tc < dur - 0.1:  # осколки: короткие звонкие призвуки, всё реже
        f0 = float(rng.uniform(2500, 9000))
        nn = int(0.12 * SR)
        u = tt(nn)
        ping = (np.sin(2 * np.pi * f0 * u) + 0.4 * np.sin(2 * np.pi * f0 * 2.43 * u)) * np.exp(-u / float(rng.uniform(0.015, 0.06))) * (1 - np.exp(-u / 0.0004))
        a = float(rng.uniform(0.08, 0.3)) * np.exp(-tc / 0.5)
        gl, gr = pan_lr(float(rng.uniform(-0.8, 0.8)))
        i = int(tc * SR)
        j = min(n, i + nn)
        xl[i:j] += ping[:j - i] * a * gl
        xr[i:j] += ping[:j - i] * a * gr
        tc += float(rng.exponential(0.012 + 0.08 * tc))
    return np.stack([xl, xr])


def sfx_sparkles(dur):
    n = int((dur + 0.3) * SR)
    xl, xr = np.zeros(n), np.zeros(n)
    t = tt(n)
    air = ffilt(noise(n), rbj("hp", 8000, 0.7)) * 0.08 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    xl += air
    xr += air
    tc = 0.0
    pent = [100, 102, 104, 107, 109, 112]
    while tc < dur:
        f0 = hz(pent[int(rng.integers(0, len(pent)))]) * float(rng.uniform(0.995, 1.005))
        nn = int(0.3 * SR)
        u = tt(nn)
        ping = np.sin(2 * np.pi * f0 * u) * np.minimum(1, u / 0.006) * np.exp(-u / 0.09)
        gl, gr = pan_lr(float(rng.uniform(-0.7, 0.7)))
        a = float(rng.uniform(0.3, 1))
        i = int(tc * SR)
        j = min(n, i + nn)
        xl[i:j] += ping[:j - i] * a * gl
        xr[i:j] += ping[:j - i] * a * gr
        tc += float(rng.uniform(0.04, 0.09))
    return np.stack([xl, xr])


def sfx_static(dur):
    n = int(dur * SR)
    t = tt(n)
    x = ffilt(noise(n), rbj("bp", 3000, 0.45)) + 0.4 * (rng.random(n) < 0.004) * noise(n) * 3
    gate = np.zeros(n)
    tc = 0.0
    on = True
    while tc < dur:
        d = float(rng.uniform(0.06, 0.18)) if on else float(rng.uniform(0.025, 0.08))
        i, j = int(tc * SR), min(n, int((tc + d) * SR))
        if on:
            gate[i:j] = rng.uniform(0.6, 1.0)
        tc += d
        on = not on
    gate = np.convolve(gate, np.ones(80) / 80, mode="same")
    for d in rng.uniform(0.1, dur - 0.1, 3):  # цифровые «бипы»
        i = int(d * SR)
        nn = min(n - i, int(0.03 * SR))
        x[i:i + nn] += 0.6 * np.sign(np.sin(2 * np.pi * float(rng.choice([900, 1300, 1700])) * tt(nn)))
    return x * gate * np.minimum(1, t / 0.02) * np.clip((dur - t) / 0.03, 0, 1)


def sfx_rewind(dur):
    n = int(dur * SR)
    t = tt(n)
    f = 180 * (1600 / 180) ** (t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 17 * t))
    x = osc(table(harm(400, "saw", fc=1800, kmax=20)), f, n) * 0.5
    x += 0.7 * stft_bp(noise(n), lambda tc: 500 * (6000 / 500) ** min(1, tc / dur), 2.0)
    return x * np.minimum(1, t / 0.04) * np.clip((dur - t) / 0.06, 0, 1) * (0.5 + 0.5 * t / dur)


def sfx_price():
    return bell(93, 1.0, 0.35, ((1, 1, 1), (2.0, 0.3, 0.5), (3.0, 0.2, 0.3), (4.1, 0.1, 0.2)))


def sfx_crown():
    return bell(60, 1.0, 0.75, ((0.5, 0.4, 1.0), (1.0, 1.0, 1.0), (1.003, 0.6, 1.0), (1.19, 0.45, 0.5), (1.5, 0.3, 0.45),
                               (2.0, 0.5, 0.35), (2.52, 0.2, 0.25), (3.0, 0.15, 0.2), (4.2, 0.08, 0.12)))


def sfx_kick_out():
    n = int(0.55 * SR)
    x = 0.6 * np.pad(thump(170, 80, 0.06, 0.2, 0.01), (0, n - int(0.2 * SR)))
    x += 0.7 * bp_noise(n, 1300, 0.7, 0.02)
    t = tt(n)
    wh = stft_bp(noise(n), lambda tc: 700 + 3000 * min(1, tc / 0.4), 1.5) * np.exp(-((t - 0.2) / 0.1) ** 2) * 0.5
    return np.stack([x * 0.75 + wh * 0.15, x * 0.75 + wh * 0.6])  # очки улетают вправо


SFX_GEN = {"live_ding": sfx_live_ding, "parcel": sfx_parcel, "tape": sfx_tape, "fly": sfx_fly, "donation": sfx_donation,
           "slap": sfx_slap, "buzzer": sfx_buzzer, "swish": sfx_swish, "sniff": sfx_sniff, "lick": sfx_lick,
           "stamp_vraki": lambda: sfx_stamp(False), "smash": sfx_smash, "price": sfx_price, "crown": sfx_crown,
           "kick_out": sfx_kick_out, "stamp_block": lambda: sfx_stamp(True)}
SFX_LONG = {"rock": sfx_rock, "sparkles": sfx_sparkles, "static": sfx_static, "rewind": sfx_rewind}
SFX_PAN = {"donation": 0.35, "fly": 0.0, "swish": 0.35, "rock": 0.45, "price": 0.2, "crown": -0.05, "stamp_vraki": -0.1,
           "stamp_block": 0.3, "slap": -0.05, "lick": -0.1, "sniff": 0.05, "buzzer": 0.0, "parcel": 0.0, "tape": -0.1}
SFX_SEND = {"smash": 0.35, "crown": 0.4, "price": 0.3, "donation": 0.25, "live_ding": 0.3, "sparkles": 0.4}


def place(name, what, t_ev, t_end):
    long_ = name in SFX_LONG
    if long_:
        dur = t_end - (t_ev + FRAME)
        x = SFX_LONG[name](dur)
    else:
        x = SFX_GEN[name]()
    st = x.ndim == 2
    chs = [x[0], x[1]] if st else [x]
    mono = np.sum(np.abs(np.stack(chs)), axis=0)
    if long_:
        onset = t_ev + FRAME
        a, w = 0, len(chs[0])
        peak_t = None
    else:
        envs = np.convolve(mono, np.ones(220) / 220, mode="same")
        pk = int(np.argmax(envs[:int(0.5 * SR)]))
        onset = t_ev + FRAME - pk / SR
        a, w = max(0, pk - int(0.02 * SR)), int(0.25 * SR)
        peak_t = t_ev + FRAME
    kx = [kweight(c) for c in chs]
    e = sum(float(np.sum(k_[a:a + w] ** 2)) for k_ in kx) / max(1, min(w, len(chs[0]) - a))
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(e, 1e-20))
    i0 = int(round(onset * SR))
    n_ = len(chs[0])
    j0, j1 = max(0, -i0), min(n_, N - i0)
    if st:
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g
        sfx[1, i0 + j0:i0 + j1] += chs[1][j0:j1] * g
        sfx_send[i0 + j0:i0 + j1] += (chs[0][j0:j1] + chs[1][j0:j1]) * 0.5 * g * SFX_SEND.get(name, 0.12)
    else:
        gl, gr = pan_lr(SFX_PAN.get(name, 0.0))
        # моно → два канала с равной мощностью; поправка, чтобы энергия суммы каналов совпала с целью
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gl
        sfx[1, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gr
        sfx_send[i0 + j0:i0 + j1] += chs[0][j0:j1] * g * SFX_SEND.get(name, 0.12)
    rec = {"name": name, "what": what, "t": r3(t_ev)}
    if peak_t is not None:
        rec["peak"] = r3(peak_t)
    else:
        rec["start"], rec["end"] = r3(onset), r3(onset + n_ / SR if name not in ("static", "rewind", "rock") else t_end)
    rec["db"] = SFX_DB[name]
    SFX_LOG.append(rec)
    SFX_WIN.setdefault(name, []).append((onset + a / SR, onset + (a + min(w, n_ - a)) / SR))


for name, what, key, off, kend, offe in SFX_LIST:
    t_ev = (EV[key] if key else 0.0) + off
    t_end = (EV[kend] + offe) if kend else None
    place(name, what, t_ev, t_end)
sfx_wet = np.stack([convolve(sfx_send, IR_S[0]), convolve(sfx_send, IR_S[1])]) * 0.6
sfx_all = sfx + sfx_wet

out = shaped + sfx_all
peak = float(np.max(np.abs(out)))
limit = 0.70 / peak if peak > 0.70 else 1.0       # не выше −3 dBFS
if limit < 1:
    print(f"внимание: пик {peak:.3f} — всё ослаблено в {limit:.3f} раза")
out *= limit
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
        "note": "секунды ролика. t — событие в кадре; peak — пик звука (на кадр позже события); у длинных шумов — start/end; "
                "db — громкость шума в своём окне к голосу (K-взвешенно, BS.1770). music — ключевые моменты музыки.",
        "V0": V0, "OUTRO": OUTRO, "total": TOTAL, "sfx": SFX_LOG, "music": MARK,
    }, f, ensure_ascii=False, indent=1)

# ---------- отчёт ----------
f1 = lambda x: f"{x:.1f}"
SH = [shaped[0] * limit, shaped[1] * limit]
ALL = [out[0], out[1]]
SA = [sfx_all[0] * limit, sfx_all[1] * limit]
ksh = [kweight(c) for c in SH]
ksa = [kweight(c) for c in SA]
rel = lambda chs, w: f1(dB(ms(chs, w)) - dB(vMS))
relK = lambda chs, w: f1(dB(ms(chs, w)) - dB(vKMS))
print(f"события: {ev_src}; V0 {V0}, OUTRO {OUTRO}, длина {TOTAL} с ({N} отсчётов)")
print(f"темп: джингл и рассказ {60 / b:.1f} BPM (с {A0:.2f}), ворчание {60 / bg:.1f} ({G0:.2f}–{S0:.2f}, {nG} долей), "
      f"мораль {60 / bm:.1f} ({M0:.2f}–{FIN:.2f}, {nM} долей), финал {60 / bo:.1f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: RMS {rel(SH, SPEECH)} дБ, K {relK(ksh, SPEECH)} дБ к голосу; с шумами RMS {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка, RMS дБ к голосу строки):",
      " ".join(f"{i}:{f1(dB(ms(SH, [(L(i), E(i))])) - dB(ms(VCH, [(L(i), E(i))])))}" for i in range(1, NL + 1)))
print(f"заставка RMS {rel(SH, [(A0, A0 + 6.5 * b)])}, финал {rel(SH, [(FIN, FIN + 7 * bo)])}, подъём к финалу {rel(SH, [(E(21) + 0.3, FIN - 0.1)])}, "
      "паузы " + " ".join(f"{n_}|{n_ + 1}:{rel(SH, [(E(n_) + 0.03, L(n_ + 1) - 0.1)])}" for n_ in STINGS) + " (дБ к голосу)")
print(f"стоп-тишина {S0:.2f}–{TI:.2f}: музыка {f1(dB(ms(SH, [(S0 + 0.005, TI)])))} дБFS, всё вместе {f1(dB(ms(ALL, [(S0 + 0.005, TI + FRAME - 0.01)])))} дБFS")
print("шумы в своих окнах (K | RMS, дБ к голосу):",
      ", ".join(f"{k} " + " ".join(f"{relK(ksa, [w])}|{rel(SA, [w])}" for w in ws) for k, ws in SFX_WIN.items()))
lay_bal = lambda wins: ", ".join(f"{nm} {f1(dB(ms([lay.bus[nm][0], lay.bus[nm][1]], [(a - lay.i0 / SR, b_ - lay.i0 / SR) for a, b_ in wins])))}"
                                 for lay in (PRE if wins[0][0] < S0 else POST,) for nm in lay.bus)
print(f"баланс шин (сухо, RMS дБFS до общего уровня):\n  заставка — {lay_bal([(A0, A0 + 6 * b)])}\n  строки 1–4 — {lay_bal(SPEECH[:4])}"
      f"\n  строки 5–9 — {lay_bal(SPEECH[4:9])}\n  строки 10–13 — {lay_bal(SPEECH[9:13])}\n  мораль — {lay_bal(SPEECH[16:])}\n  финал — {lay_bal([(FIN, FIN + 6 * bo)])}")
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {float(np.max(np.abs(out))):.3f} ({f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS), множитель {limit:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы:", "; ".join(f"{r['name']} {r.get('peak', r.get('start'))}" for r in SFX_LOG))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
