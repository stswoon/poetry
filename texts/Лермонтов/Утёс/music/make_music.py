#!/usr/bin/env python3
"""Музыка и шумы к стихотворению М. Ю. Лермонтова «Утёс», стиль «аниме-чиби».

Своя аниме-колыбельная в размере 6/8: челеста (музыкальная шкатулка), мягкое фортепиано, пэд струнных.
Мелодия и гармония свои, из романсов на этот текст ничего не взято.
  0 … V0       вступление (фа мажор): пэд проявляется из тишины, челеста играет тему колыбельной
               (затакт A–C–F, потом D–C–B♭–G), фортепиано качает аккорды F, B♭add9, C7sus4;
               «дзынь» звезды попадает в паузу темы (ноты F6 и C7 — из аккорда C7sus4);
  строфа 1     под голосом: фортепиано качает восьмыми (F | B♭maj7 | Gm7 C | F/A B♭), пэд струнных,
               челеста отвечает в паузах между строками (на рассвет — вверх по Gm7);
               с «умчалась» — оживление: челеста арпеджио шестнадцатыми, пэд ярче;
  переход      в паузе E4 → L5 — поворот в минор: B♭m6 → A7 → Dm, челеста падает вниз вместе с камерой;
  строфа 2     ре минор, медленнее (восьмая на ~18 % длиннее) и тише: только фортепиано и пэд,
               Dm | B♭maj7 | Gm7 F/A | B♭maj7 A7; в паузах — «вздохи» фортепиано;
  финал        после голоса — Dm (слеза падает в песок), затакт челесты F–A–D, на титр — тема
               в миноре (B♭–A–G–E → D), последний аккорд Dm(add9), эхо челесты и затухание.
Под голосом музыка на UNDER_DB к голосу (RMS по каждой строке, внутри строки громкость постоянна),
во вступлении, в переходе между строфами и в финале — громче. Fade-in в начале, fade-out в конце.
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все ниже голоса (список — sfx.json).

Запуск: python3 make_music.py [V0] [OUTRO]     (по умолчанию из events.json, иначе 4.0 и 7.0;
        можно --v0=4.0 --outro=7.0)
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
LINE_DB = {1: 0.6, 2: 0.6, 3: 0.6, 4: 0.6, 5: -0.8, 6: -0.8, 7: -0.8, 8: -0.8}  # строфа 2 тише
GAP_LIFT_DB = 1.5     # паузы между строками внутри строфы (от 0,45 с) — чуть громче, там ответы челесты
INTRO_DB = -9.0       # вступление
TURN_DB = -12.0       # переход между строфами (E4 → L5)
TAIL_DB = -13.0       # после голоса до финального титра
FIN_DB = -10.0        # финал
# шумы: K-взвешенная (BS.1770) громкость в своём окне, дБ к голосу в местах речи
SFX_DB = {
    "star_whoosh": -18, "title_pop": -16, "star_ding": -12, "zol_shimmer": -21, "vel_ding": -22, "wake_pop": -21,
    "whoosh_up": -19, "tumble_gliss": -21, "heart_pop": -20, "wind_fall": -16, "drop_glint": -26,
    "desert_wind": -25, "thought_puff": -22, "tear_drop": -14, "title_chime": -13,
}

# ---------- аргументы и время ----------
_ev_path = os.path.join(HERE, "events.json")
RAW = None
if os.path.exists(_ev_path):
    with open(_ev_path, encoding="utf-8") as f:
        RAW = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Утёсу»")
ap.add_argument("pos", nargs="*", type=float, help="V0 OUTRO")
ap.add_argument("--v0", type=float)
ap.add_argument("--outro", type=float)
args = ap.parse_args()
V0 = args.v0 if args.v0 is not None else (args.pos[0] if len(args.pos) > 0 else float((RAW or {}).get("V0", 4.0)))
OUTRO = args.outro if args.outro is not None else (args.pos[1] if len(args.pos) > 1 else float((RAW or {}).get("OUTRO", 7.0)))
if V0 < 2.5 or OUTRO < 5.5:
    sys.exit("нужно V0 >= 2.5 и OUTRO >= 5.5")

r3 = lambda x: round(float(x), 3)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TJ = json.load(f)
VD = TJ["voiceDuration"]
TOTAL = r3(V0 + VD + OUTRO)
N = int(round(TOTAL * SR))
LINES = TJ["lines"]
NL = len(LINES)
if NL != 8:
    sys.exit(f"ожидалось 8 строк, в timings.json {NL}")

# события — так же, как в ../video/build.py
HOLD = 2.0
norm = lambda s: re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))
WORDS = {"w_noch": (1, "Ночевала"), "w_tuch": (1, "тучка"), "w_zol": (1, "золотая"), "w_grud": (2, "груди"),
         "w_vel": (2, "утёса-великана;"), "w_utrom": (3, "Утром"), "w_umch": (3, "умчалась"), "w_rano": (3, "рано,"),
         "w_laz": (4, "лазури"), "w_ves": (4, "весело"), "w_igr": (4, "играя;"), "w_ost": (5, "остался"),
         "w_vlag": (5, "влажный"), "w_sled": (5, "след"), "w_morsh": (5, "морщине"), "w_star": (6, "Старого"),
         "w_odin": (6, "Одиноко"), "w_stoit": (7, "стоит,"), "w_zad": (7, "задумался"), "w_glub": (7, "глубоко"),
         "w_tih": (8, "тихонько"), "w_plach": (8, "плачет"), "w_pust": (8, "пустыне.")}


def word_start(n, w):
    """начало слова строки n; слово через дефис может быть в timings.json одним или двумя"""
    ws = [q for q in LINES[n - 1]["words"] if norm(q["text"])]
    target = norm(w)
    for i, q in enumerate(ws):
        acc, j = "", i
        while j < len(ws) and len(acc) < len(target):
            acc += norm(ws[j]["text"])
            j += 1
        if acc == target:
            return q["start"]
    sys.exit(f"нет слова «{w}» в строке {n}")


def events_from_timings():
    ev = {"V0": V0}
    for i, l in enumerate(LINES, 1):
        ev[f"L{i}"], ev[f"E{i}"] = r3(l["start"] + V0), r3(l["end"] + V0)
    for k, (n, w) in WORDS.items():
        ev[k] = r3(word_start(n, w) + V0)
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
            print(f"внимание: total в events.json {RAW.get('total')}, у музыки {TOTAL} (другой OUTRO?)")
    else:
        print("events.json не совпадает с timings.json — события считаю по timings.json")
L = lambda n: EV[f"L{n}"]
E = lambda n: EV[f"E{n}"]
W = lambda k: EV[k]
FIN = EV["fin"]

# ключевые моменты кадра (как в ../video/src/main.js)
STAR0, STAR1 = 0.25, V0 - 0.7          # падающая звезда летит, долетает до Тучки
T_TITLE = 0.45                         # титр выпрыгивает
T_WAKE = W("w_utrom") + 0.25           # Тучка просыпается, «!»
T_LAUNCH = W("w_umch") - 0.05          # срывается вверх
T_TUMBLE = W("w_ves") - 0.1            # кувырок
T_FALL = E(4) - 0.08                   # камера падает к утёсу
T_LAND = max(L(5) + 0.15, T_FALL + 0.5)
T_THINK = W("w_zad") - 0.1             # облако-мысль
T_HIT = W("w_plach") + 1.65            # слеза падает в песок
T_TITLE2 = FIN + 0.3                   # финальный титр

# сетка 6/8: восьмая строфы 1 — 4 такта от L1 до E4, строфы 2 — 4 такта от L5 до E8 (медленнее)
e1 = (E(4) - L(1)) / 24
e2 = (E(8) - L(5)) / 24
eF = min(e2, (TOTAL - 2.0 - FIN) / 6)                  # финал: темп строфы 2, если хватает места
B1 = lambda k, pos=0: L(1) + (6 * k + pos) * e1     # k = −2, −1 — вступление, 0…3 — строки 1–4
B2 = lambda k, pos=0: L(5) + (6 * k + pos) * e2     # k = 0…3 — строки 5–8
TH0 = B1(-2, 3)                                      # затакт темы во вступлении
T_A = E(4) + 0.5 * (L(5) - E(4))                     # A7 в переходе
FP = FIN - 3 * eF                                    # затакт финальной темы
FZ = FIN + 6 * eF                                    # последний аккорд
assert 0.3 < e1 < 0.56 and 0.33 < e2 < 0.66, f"темп вне пределов: восьмая {e1:.3f} / {e2:.3f} с"
assert L(5) - E(4) > 0.5, "пауза между строфами короче 0,5 с"
assert eF > 0.3 and FP > T_HIT + 0.25, "финальная тема не помещается (мало OUTRO?)"
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1841)
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
    for c in (m, m * 3 // 4, m * 5 // 8):  # 2^k, 3·2^k, 5·2^k
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


rms = lambda x: float(np.sqrt(np.mean(np.asarray(x) ** 2))) + 1e-12

# ---------- генераторы ----------
TBL = 4096
_PH = np.arange(TBL) / TBL


def table(amps):
    amps = np.asarray(amps, float)
    k = np.arange(1, len(amps) + 1)
    w = (amps[:, None] * np.sin(2 * np.pi * k[:, None] * _PH[None, :])).sum(0)
    return w / max(1e-9, np.max(np.abs(w)))


def harm(f, fc=None, kmax=40, slope=1.0):
    K = max(1, int(min(kmax, SR * 0.45 / f)))
    k = np.arange(1, K + 1)
    a = 1.0 / k ** slope
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


def tail_fade(x, sec=0.012):
    k = min(len(x), int(sec * SR))
    if k > 1:
        x[-k:] *= np.linspace(1, 0, k)
    return x


_NB = {}


def nb(name, n):
    """банки отфильтрованного шума: стук молоточков"""
    if name not in _NB:
        x = noise(SR * 3)
        spec = {"knk": [rbj("bp", 2600, 1.2)], "thk": [rbj("lp", 1100, 0.7)], "air": [rbj("hp", 7500, 0.7)]}[name]
        y = ffilt(x, *spec, power=2)
        _NB[name] = y / np.sqrt(np.mean(y ** 2))
    s = int(rng.integers(0, SR * 3 - n - 1))
    return _NB[name][s:s + n].copy()


_CC, _PC = {}, {}


def celesta(m, vel=0.5):
    """челеста / музыкальная шкатулка: основной тон, лёгкие биения резонатора, металлические призвуки"""
    key = (m, round(vel, 2))
    if key in _CC:
        return _CC[key]
    f = hz(m)
    tau = float(np.clip(1.5 * (523.25 / f) ** 0.55, 0.45, 2.4))
    n = int(min(4.5 * tau, 5.0) * SR)
    t = tt(n)
    br = 0.45 + 0.55 * vel
    x = np.sin(2 * np.pi * f * t + rng.random() * 6.28) * np.exp(-t / tau)
    x += 0.2 * np.sin(2 * np.pi * f * 1.0009 * t + rng.random() * 6.28) * np.exp(-t / (tau * 0.8))
    for r, a, tf in ((2.0, 0.16, 0.4), (3.98, 0.09, 0.12), (8.1, 0.035, 0.04)):
        if r * f < 16000:
            x += a * br * np.sin(2 * np.pi * r * f * t + rng.random() * 6.28) * np.exp(-t / (tau * tf))
    nk = int(0.008 * SR)
    x[:nk] += 0.05 * br * nb("knk", nk) * np.exp(-tt(nk) / 0.0012)
    x *= (1 - np.exp(-t / 0.0018)) * vel
    _CC[key] = tail_fade(x)
    return x


def piano(m, vel=0.5):
    """мягкое фортепиано: негармоничные обертоны струны, двойное затухание, биения унисона, глухой молоточек"""
    key = (m, round(vel, 2))
    if key in _PC:
        return _PC[key]
    f = hz(m)
    Ls = float(np.clip(1.8 + 2.6 * (130.8 / f) ** 0.5, 1.6, 5.0))
    n = int(Ls * SR)
    t = tt(n)
    Bi = 0.0001 * (f / 130.8) ** 1.1
    kc = 2.5 + 6.0 * vel
    K = int(min(26, 9000 / f))
    x = np.zeros(n)
    for k in range(1, K + 1):
        fk = k * f * np.sqrt(1 + Bi * k * k)
        if fk > 12000:
            break
        a = (1.0 / k ** 0.9) / (1 + (k / kc) ** 2.5)
        if k == 1 and f < 90:
            a *= 0.7
        tf = 0.30 * (261.6 / f) ** 0.35 / k ** 0.35
        ts = min(7.0, 2.6 * (261.6 / f) ** 0.5 / k ** 0.55)
        env = 0.5 * np.exp(-t / tf) + 0.5 * np.exp(-t / ts)
        ph = rng.random() * 6.28
        if k <= 4:
            dt = 0.0003 * (1 + 0.5 * k)
            s = 0.55 * np.sin(2 * np.pi * fk * t + ph) + 0.45 * np.sin(2 * np.pi * fk * (1 + dt) * t + ph + 1.0)
        else:
            s = np.sin(2 * np.pi * fk * t + ph)
        x += a * env * s
    nk = int(0.015 * SR)
    x[:nk] += 0.04 * vel * nb("thk", nk) * np.exp(-tt(nk) / 0.003)
    x *= (1 - np.exp(-t / 0.002)) * vel
    _PC[key] = tail_fade(x)
    return x


def held(x, d, rel=0.22):
    """педаль снята через d секунд: дальше звук гаснет за rel"""
    nd = int(max(0.0, d) * SR)
    if nd >= len(x):
        return x
    m = min(len(x), nd + int(rel * 5 * SR))
    y = x[:m].copy()
    y[nd:] *= np.exp(-tt(m - nd) / rel)
    return tail_fade(y)


def bell(m, vel=0.5, tau=1.0, partials=((1, 1, 1), (2.76, 0.4, 0.4), (5.40, 0.2, 0.2), (8.93, 0.1, 0.1))):
    f = hz(m)
    n = int(min(4.5 * tau, 4.0) * SR)
    t = tt(n)
    x = np.zeros(n)
    for r, a, tf in partials:
        if r * f < 17000:
            x += a * np.sin(2 * np.pi * r * f * t + rng.random() * 6.28) * np.exp(-t / (tau * tf))
    x *= 1 - np.exp(-t / 0.0008)
    return tail_fade(x * vel)


SOFTB = ((1, 1, 1), (2.0, 0.18, 0.5), (3.0, 0.08, 0.3), (4.2, 0.04, 0.15))  # мягкий колокольчик

# ---------- шины ----------
BUSES = ("cel", "pno", "low", "pad")
BUS = {k: np.zeros((2, N)) for k in BUSES}
SEND = np.zeros(N)


def put(bus, t, x, pan=0.0, send=0.2, gain=1.0):
    i = int(round(t * SR))
    j0, j1 = max(0, -i), min(len(x), N - i)
    if j1 <= j0:
        return
    seg = x[j0:j1] * gain
    gl, gr = pan_lr(pan)
    B = BUS[bus]
    B[0, i + j0:i + j1] += seg * gl
    B[1, i + j0:i + j1] += seg * gr
    if send:
        SEND[i + j0:i + j1] += seg * send


def p_cel(t, m, vel=0.5, pan=0.18, send=0.5):
    if t >= 0.25:
        put("cel", t, celesta(m, vel), pan, send, 0.5)


def p_pno(t, m, vel=0.4, until=None, pan=-0.12, bus="pno", send=0.3):
    x = piano(m, vel)
    if until is not None:
        x = held(x, until - t)
    put(bus, t, x, pan, send, 0.32)


def rocking(t0, e, tones, until, v0=0.42, v=0.3):
    """полтакта 6/8 левой рукой: три восьмые, первая — бас (на шину low), педаль до until"""
    for j, m in enumerate(tones):
        tj = t0 + j * e
        if tj < 0.25:
            continue
        p_pno(tj, m, v0 if j == 0 else v, until, bus="low" if j == 0 and m < 48 else "pno",
              pan=-0.22 + 0.12 * j)


def roll(t0, notes, vel=0.4, until=None, gap=0.03):
    for j, m in enumerate(notes):
        p_pno(t0 + j * gap, m, vel * (1 - 0.06 * j), until, bus="low" if m < 48 else "pno", pan=-0.25 + 0.12 * j)


def pad(t, notes, dur, vel=0.4, fc=1500, att=0.5, rel=0.9):
    """пэд струнных: пила с мягким срезом, три расстроенных голоса, вибрато после атаки"""
    for j, m in enumerate(notes):
        f = hz(m)
        nn = int((dur + rel * 4.5) * SR)
        tv = tt(nn)
        env = tail_fade(np.minimum(1, tv / att) ** 1.6 * np.where(tv < dur, 1, np.exp(-(tv - dur) / rel)), 0.05)
        tb = table(harm(f, fc=fc, kmax=40))
        vib = 1 + 0.0022 * np.sin(2 * np.pi * 5.1 * tv + j) * np.clip((tv - 0.3) / 0.6, 0, 1)
        for k, d in enumerate((-7, 0, 6)):
            fd = f * 2 ** (d / 1200) * vib * (1 + 0.0012 * np.sin(2 * np.pi * (0.27 + 0.11 * k) * tv + j * 1.3))
            x = osc(tb, fd, nn, rng.random()) * env
            put("pad", t, x, [-0.6, 0.0, 0.6][k] * (0.5 + 0.15 * j), 0.35, 0.06 * vel)


# ---------- пэд струнных: аккорды по всему ролику ----------
# (время, ноты, стиль); стиль: (громкость, срез, атака, затухание)
PST = {"intro": (0.42, 1500, 0.8, 0.9), "s1": (0.40, 1600, 0.35, 0.8), "s1b": (0.42, 2300, 0.3, 0.7),
       "turn": (0.50, 1300, 0.2, 0.7), "s2": (0.34, 1100, 0.5, 1.0), "tail": (0.38, 1100, 0.6, 1.0),
       "fin": (0.40, 1300, 0.5, 1.0), "end": (0.42, 1200, 0.6, 1.6)}
PADS = [
    (0.05, [53, 57, 60, 67], "intro"),             # Fadd9
    (B1(-1), [53, 58, 62, 72], "intro"),           # B♭add9
    (B1(-1, 3), [55, 58, 60, 65], "intro"),        # C7sus4
    (L(1), [53, 57, 60, 67], "s1"),                # Fadd9
    (B1(1), [58, 62, 65, 69], "s1"),               # B♭maj7
    (B1(2), [55, 58, 62, 65], "s1"),               # Gm7 (рассвет)
    (B1(2, 3), [55, 60, 64, 67], "s1"),            # C
    (B1(3), [57, 60, 65, 69], "s1b"),              # F/A (лазурь)
    (B1(3, 3), [58, 62, 65, 70], "s1b"),           # B♭
    (E(4), [55, 58, 61, 65], "turn"),              # B♭m6 — поворот в минор
    (T_A, [57, 61, 64, 67], "turn"),               # A7
    (L(5), [53, 57, 62, 64], "s2"),                # Dm(add9)
    (B2(1), [53, 58, 62, 69], "s2"),               # B♭maj7
    (B2(2), [53, 58, 62, 67], "s2"),               # Gm7
    (B2(2, 3), [53, 57, 60, 65], "s2"),            # F
    (B2(3), [53, 58, 62, 69], "s2"),               # B♭maj7
    (B2(3, 3), [55, 61, 64, 69], "s2"),            # A7
    (E(8), [53, 57, 62, 64], "tail"),              # Dm(add9) — слеза в песок
    (FIN, [53, 58, 62, 69], "fin"),                # B♭maj7 — титр
    (FIN + 3 * eF, [55, 61, 64, 69], "fin"),       # A7
    (FZ, [50, 57, 62, 65, 76], "end"),             # Dm(add9) — последний аккорд
]
for i, (t, notes, st) in enumerate(PADS):
    t1 = PADS[i + 1][0] if i + 1 < len(PADS) else TOTAL
    vel, fc, att, rel = PST[st]
    if i == 0:
        att = 1.4                                   # проявляется из тишины
    pad(t, notes, t1 - t + 0.05, vel, fc, att, rel)

# ---------- вступление: тема колыбельной на челесте ----------
mark("intro", TH0)
THEME = [(B1(-2, 3), 81, .55), (B1(-2, 4), 84, .6), (B1(-2, 5), 89, .7),   # A5 C6 F6 (затакт)
         (B1(-1, 0), 86, .75), (B1(-1, 2), 84, .6),                        # D6 – C6
         (B1(-1, 3), 82, .65), (B1(-1, 5), 79, .55),                       # B♭5 – G5
         (L(1), 81, .45)]                                                  # A5 — разрешение под голос
for t, m, v in THEME:
    p_cel(t, m, v)
p_pno(TH0, 41, 0.38, B1(-1) + 0.05, bus="low")
for j, m in enumerate([48, 57]):
    p_pno(TH0 + (j + 1) * e1, m, 0.28, B1(-1) + 0.03)
rocking(B1(-1), e1, [46, 53, 62], B1(-1, 3) + 0.03, 0.4, 0.3)       # B♭
rocking(B1(-1, 3), e1, [48, 55, 58], L(1) + 0.03, 0.38, 0.3)        # C7sus4

# ---------- строфа 1: фа мажор ----------
mark("stanza1", L(1))
S1 = [(B1(0), [41, 48, 57], B1(1)), (B1(0, 3), [53, 48, 55], B1(1)),        # F
      (B1(1), [46, 53, 62], B1(2)), (B1(1, 3), [58, 53, 57], B1(2)),        # B♭maj7
      (B1(2), [43, 50, 58], B1(2, 3)), (B1(2, 3), [48, 55, 64], B1(3)),     # Gm7, C
      (B1(3), [45, 53, 60], B1(3, 3)), (B1(3, 3), [46, 53, 62], E(4))]      # F/A, B♭
for k, (t0, tones, until) in enumerate(S1):
    rocking(t0, e1, tones, until + 0.03, 0.42 if k % 2 == 0 else 0.36, 0.29)

# ответы челесты в паузах между строками (до «умчалась»)
ANS = {1: [84, 86], 2: [82, 86, 91]}   # C6 → D6 (на B♭maj7); рассвет: B♭5 D6 G6 (вверх по Gm7)
for n_, notes in ANS.items():
    g0, g1 = E(n_) + 0.06, L(n_ + 1) - 0.08
    if g1 - g0 < 0.2:
        continue
    st = min(0.2, (g1 - g0) / len(notes))
    for j, m in enumerate(notes):
        p_cel(g0 + j * st, m, 0.3 + 0.04 * j, 0.1 + 0.15 * j)

# оживление: с «умчалась» — арпеджио челесты шестнадцатыми до конца строки 4
s16 = e1 / 2
k0 = int(np.ceil((T_LAUNCH + 0.04 - L(1)) / s16))
ARP = [(B1(2, 3), [72, 76, 79, 84, 88, 91, 96]),      # C
       (B1(3), [77, 81, 84, 89, 93, 96, 101]),        # F
       (B1(3, 3), [74, 77, 82, 86, 89, 94, 98])]      # B♭
mark("lively", L(1) + k0 * s16)
k = k0
while True:
    t = L(1) + k * s16
    if t > E(4) - 0.06:
        break
    tones = [tn for t_, tn in ARP if t_ <= t + 1e-6][-1]
    h = int(np.floor((t - L(1)) / (3 * e1) + 1e-6))        # номер полутакта
    p = k % 6
    if t < B1(3):                                           # взлёт: прямо вверх
        idx = p
    else:                                                   # «весело играя»: зигзаг вверх
        idx = [0, 2, 1, 3, 2, 4][p] + (h % 2)
    p_cel(t, tones[min(idx, len(tones) - 1)], (0.36 if p == 0 else 0.26 + 0.02 * p), -0.3 + 0.12 * p, 0.45)
    k += 1

# ---------- переход: поворот в минор, челеста падает вместе с камерой ----------
mark("minor_turn", E(4))
roll(E(4) + 0.01, [46, 53, 61, 67], 0.42, T_A + 0.05)       # B♭m6
roll(T_A, [45, 52, 61, 67], 0.4, L(5) + 0.05)               # A7
FALL = [85, 82, 77, 76, 73]                                 # D♭6 B♭5 F5 | E5 C♯5
st = (L(5) - E(4) - 0.12) / len(FALL)
for j, m in enumerate(FALL):
    p_cel(E(4) + 0.03 + j * st, m, 0.52 - 0.04 * j, 0.35 - 0.15 * j)

# ---------- строфа 2: ре минор, медленнее, только фортепиано и пэд ----------
mark("stanza2", L(5))
S2 = [(B2(0), [38, 45, 53], B2(1)), (B2(0, 3), [50, 45, 53], B2(1)),         # Dm
      (B2(1), [34, 41, 50], B2(2)), (B2(1, 3), [46, 41, 50], B2(2)),         # B♭(maj7)
      (B2(2), [43, 50, 53], B2(2, 3)), (B2(2, 3), [45, 48, 53], B2(3)),      # Gm7, F/A
      (B2(3), [46, 53, 57], B2(3, 3)), (B2(3, 3), [45, 52, 55], E(8))]       # B♭maj7, A7
for k, (t0, tones, until) in enumerate(S2):
    rocking(t0, e2, tones, until + 0.04, 0.36 if k % 2 == 0 else 0.3, 0.24)
# «вздохи» правой руки в паузах между строками
SIGH = {5: [76, 74], 6: [72, 70], 7: [81, 79, 77]}     # E5→D5 (Dm), C5→B♭4 (B♭maj7), A5 G5 F5
for n_, notes in SIGH.items():
    g0, g1 = E(n_) + 0.04, L(n_ + 1) - 0.06
    if g1 - g0 < 0.2:
        continue
    st = min(0.24, (g1 - g0) / len(notes))
    for j, m in enumerate(notes):
        p_pno(g0 + j * st, m, 0.34 - 0.04 * j, g0 + j * st + 0.9, pan=0.15, send=0.4)

# ---------- финал: Dm (слеза), затакт, тема в миноре, последний аккорд и эхо ----------
mark("tail", E(8))
roll(E(8), [38, 50], 0.36, FP + 0.05, gap=0.04)                # D2 D3
rocking(FP, eF, [45, 50, 53], FIN + 0.04, 0.3, 0.24)            # Dm под затактом
rocking(FIN, eF, [34, 41, 50], FIN + 3 * eF + 0.04, 0.34, 0.25)  # B♭maj7
rocking(FIN + 3 * eF, eF, [33, 40, 49], FZ + 0.04, 0.32, 0.24)   # A7
roll(FZ, [38, 45, 53, 57, 64], 0.36, TOTAL, gap=0.045)         # Dm(add9)
mark("fin_theme", FP)
FTH = [(FP, 77, .45), (FP + eF, 81, .5), (FP + 2 * eF, 86, .55),        # F5 A5 D6 (затакт)
       (FIN, 82, .6), (FIN + 2 * eF, 81, .5),                            # B♭5 – A5
       (FIN + 3 * eF, 79, .55), (FIN + 5 * eF, 76, .45),                 # G5 – E5
       (FZ, 74, .5), (FZ + 0.012, 86, .22),                              # D5 (+ D6)
       (FZ + 2 * eF, 81, .3), (FZ + 4 * eF, 88, .22)]                    # эхо: A5, E6
for t, m, v in FTH:
    if t < TOTAL - 0.6:
        p_cel(t, m, v, 0.12)
mark("fin_chord", FZ)


# ---------- ревербератор и сведение шин ----------
def make_ir(rt60, length, seed, lp=6000, pre=0.025):
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = tt(n)
    ir = g.standard_normal(n) * np.exp(-6.91 * t / rt60)
    ir = ffilt(ir, rbj("lp", lp, 0.6), rbj("hp", 200, 0.6))
    ir *= np.minimum(1, t / 0.008)
    ip = int(pre * SR)
    ir = np.concatenate([np.zeros(ip), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    nf = fast_len(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


IR_M = [make_ir(2.6, 3.2, 11), make_ir(2.6, 3.2, 12)]
IR_S = [make_ir(1.2, 1.6, 21, 7000, 0.012), make_ir(1.2, 1.6, 22, 7000, 0.012)]
WET = 0.5
BUS_G = {"cel": 1.0, "pno": 2.0, "low": 1.8, "pad": 1.8}   # баланс шин (подобран по отчёту)
# под голосом низ фортепиано тише (во вступлении и финале — как есть)
trim_keys = [(0, 0), (L(1) - 0.3, 0), (L(1) + 0.05, 1), (E(8) - 0.05, 1), (E(8) + 0.4, 0), (TOTAL, 0)]
TRIM_LOW = 0.75
tN = np.arange(N) / SR
tu = np.interp(tN, [k_[0] for k_ in trim_keys], [k_[1] for k_ in trim_keys])
music = np.zeros((2, N))
for nm in BUSES:
    g = BUS_G[nm] * ((1 - tu * (1 - TRIM_LOW)) if nm == "low" else 1.0)
    music += BUS[nm] * g
for ch in (0, 1):
    music[ch] += WET * convolve(SEND, IR_M[ch])
    music[ch] = ffilt(music[ch], rbj("hp", 40, 0.7))

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
W_INTRO = [(max(0.3, TH0), L(1) - 0.15)]
W_TURN = [(E(4) + 0.05, L(5) - 0.1)]
W_TAIL = [(E(8) + 0.5, FIN - 0.05)]
W_FIN = [(FIN, FZ + 1.0)]
gI, gTurn, gT, gF = gFor(W_INTRO, INTRO_DB), gFor(W_TURN, TURN_DB), gFor(W_TAIL, TAIL_DB), gFor(W_FIN, FIN_DB)
shape = [(0, 0), (0.9, gI), (L(1) - 0.32, gI), (L(1) - 0.02, lineG[0])]
GAPS = []
for i in range(1, NL + 1):
    g = lineG[i - 1]
    if i > 1:
        shape.append((L(i), g))
    shape.append((E(i), g))
    if i == 4:
        shape += [(E(4) + 0.05, gTurn), (L(5) - 0.1, gTurn), (L(5) - 0.01, lineG[4])]
    elif i < NL and L(i + 1) - E(i) >= 0.45:
        gl = max(g, lineG[i]) * db(GAP_LIFT_DB)
        shape += [(E(i) + 0.06, gl), (L(i + 1) - 0.08, gl)]
        GAPS.append(i)
shape += [(E(NL) + 0.06, lineG[-1]), (E(NL) + 0.7, gT), (FIN - 0.15, gT), (FIN + 0.1, gF), (TOTAL - 2.3, gF),
          (TOTAL - 0.02, 0), (TOTAL, 0)]
for a_, b_ in zip(shape, shape[1:]):
    if b_[0] < a_[0]:
        sys.exit(f"форма громкости: ключи не по порядку на {b_[0]:.3f}")
gcurve = np.interp(tN, [s[0] for s in shape], [s[1] for s in shape])
shaped = music * gcurve

# ---------- шумы ----------
sfx = np.zeros((2, N))
sfx_send = np.zeros(N)
SFX_LOG, SFX_WIN = [], {}


def pop(f0=330, f1=880, tau=0.04, rise=0.014, dur=0.16, click=0.12):
    """аниме-«поп»: короткий тон, быстро взлетающий вверх"""
    n = int(dur * SR)
    t = tt(n)
    f = f1 - (f1 - f0) * np.exp(-t / rise)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0012))
    x += click * ffilt(noise(n), rbj("bp", 1800, 0.9), power=2) * np.exp(-t / 0.005)
    return x


def mixin(dst, x, at, pan=0.0):
    """добавить моно/стерео x в стерео dst с позиции at (секунды)"""
    i = int(round(at * SR))
    if x.ndim == 1:
        gl, gr = pan_lr(pan)
        x = np.stack([x * gl, x * gr])
    j = min(dst.shape[1], i + x.shape[1])
    if j > i:
        dst[:, i:j] += x[:, :j - i]


def sparkles(n, t0, t1, notes, amp=(0.25, 0.6), gap=(0.07, 0.17), tau=0.07, pan=(-0.6, 0.6), grow=False):
    out = np.zeros((2, n))
    tc = t0
    while tc < t1:
        f0 = hz(notes[int(rng.integers(0, len(notes)))]) * float(rng.uniform(0.997, 1.003))
        nn = int(0.3 * SR)
        u = tt(nn)
        ping = np.sin(2 * np.pi * f0 * u) * np.minimum(1, u / 0.003) * np.exp(-u / tau)
        a = float(rng.uniform(*amp)) * ((0.3 + 0.7 * (tc - t0) / max(1e-3, t1 - t0)) if grow else 1.0)
        mixin(out, ping * a, tc, float(rng.uniform(*pan)))
        tc += float(rng.uniform(*gap))
    return out


def sfx_star_whoosh(dur):
    """падающая звезда: нарастающий свист-шорох с мерцанием, справа к центру"""
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    fc = lambda tc: 1300 * (5200 / 1300) ** min(1.0, tc / dur)
    a = stft_bp(noise(n), fc, 2.2)
    b = stft_bp(noise(n), fc, 2.2)
    a, b = a / rms(a), b / rms(b)
    wf = 2300 + 1100 * u ** 1.4
    wh = 0.16 * np.sin(2 * np.pi * np.cumsum(wf) / SR) * (1 + 0.35 * np.sin(2 * np.pi * 11 * t))
    env = (0.12 + 0.88 * u ** 1.8) * np.minimum(1, t / 0.35) * np.clip((dur - t) / 0.07, 0, 1)
    p = 0.55 * (1 - u)
    ang = (p + 1) * np.pi / 4
    xl = (0.8 * a + 0.2 * b + wh) * env * np.cos(ang)
    xr = (0.8 * b + 0.2 * a + wh) * env * np.sin(ang)
    sp = sparkles(n, 0.2, dur - 0.08, [96, 98, 101, 103, 105, 108], (0.4, 1.0), (0.07, 0.16), 0.07, (-0.1, 0.6), grow=True)
    return np.stack([xl, xr]) + sp * 0.5


def sfx_star_ding():
    """звезда долетает до Тучки: мягкий «дзынь» (F6 + C7) с блёстками"""
    n = int(2.2 * SR)
    out = np.zeros((2, n))
    mixin(out, bell(89, 1.0, 0.9, SOFTB), 0.0, -0.1)
    mixin(out, bell(96, 0.6, 0.75, SOFTB), 0.025, 0.15)
    out += sparkles(n, 0.06, 0.7, [101, 103, 105, 108], (0.12, 0.3), (0.06, 0.12), 0.08, (-0.6, 0.6))
    return out


def sfx_title_pop():
    return pop(300, 820, 0.045, 0.014, 0.18, 0.15)


def sfx_zol_shimmer():
    """блики по Тучке: короткий нежный перезвон F6 A6 C7 F7"""
    n = int(1.6 * SR)
    out = np.zeros((2, n))
    for j, (dt, m, v) in enumerate(((0.0, 89, 1.0), (0.075, 93, 0.8), (0.15, 96, 0.68), (0.225, 101, 0.58))):
        mixin(out, bell(m, v, 0.45, SOFTB), dt, -0.3 + 0.2 * j)
    air = nb("air", int(0.35 * SR)) * 0.03 * np.sin(np.pi * tt(int(0.35 * SR)) / 0.35)
    mixin(out, air, 0.0)
    return out


def sfx_vel_ding():
    return bell(98, 1.0, 0.55, ((1, 1, 1), (2.0, 0.15, 0.4), (3.0, 0.06, 0.25)))


def sfx_wake_pop():
    return pop(600, 1500, 0.03, 0.01, 0.12, 0.1)


def sfx_whoosh_up():
    """Тучка срывается вверх: восходящий «вжух» и лёгкий звон (C7, E7)"""
    dur = 0.6
    n = int(dur * SR)
    t = tt(n)
    fc = lambda tc: 350 * (6000 / 350) ** min(1.0, tc / 0.45)
    a = stft_bp(noise(n), fc, 1.4)
    b = stft_bp(noise(n), fc, 1.4)
    a, b = a / rms(a), b / rms(b)
    env = np.where(t < 0.17, (t / 0.17) ** 2, np.exp(-(t - 0.17) / 0.13))
    out = np.stack([(0.85 * a + 0.15 * b) * env, (0.85 * b + 0.15 * a) * env])
    mixin(out, bell(96, 0.12, 0.4, SOFTB), 0.15, -0.15)
    mixin(out, bell(100, 0.09, 0.35, SOFTB), 0.19, 0.2)
    return out


def sfx_tumble_gliss():
    """кувырок: короткое восходящее глиссандо колокольчиков (пентатоника B♭)"""
    notes = [82, 84, 86, 89, 91, 94, 96, 98]
    n = int(1.6 * SR)
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        mixin(out, bell(m, 0.45 + 0.06 * j, 0.28, SOFTB), 0.04 * j, -0.45 + 0.13 * j)
    return out


def sfx_heart_pop():
    """превращение в сердечко: «поп» с блеском (D7, F7)"""
    n = int(1.3 * SR)
    out = np.zeros((2, n))
    mixin(out, pop(420, 1050, 0.045, 0.012, 0.18, 0.12), 0.0)
    mixin(out, bell(98, 0.35, 0.35, SOFTB), 0.045, 0.25)
    mixin(out, bell(101, 0.25, 0.3, SOFTB), 0.09, -0.2)
    return out


def sfx_wind_fall(dur):
    """камера падает к утёсу: порыв ветра, шум скользит вниз, мягкий конец"""
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    fc = lambda tc: 3200 * (280 / 3200) ** min(1.0, tc / dur)
    a = stft_bp(noise(n), fc, 0.9)
    b = stft_bp(noise(n), fc, 0.9)
    a, b = a / rms(a), b / rms(b)
    low = ffilt(noise(n), rbj("lp", 300, 0.7), power=2)
    low /= rms(low)
    tail = np.cos(0.5 * np.pi * np.clip((t - (dur - 0.45)) / 0.45, 0, 1)) ** 2
    env = np.minimum(1, t / 0.12) ** 1.5 * (0.55 + 0.45 * np.sin(np.pi * np.clip(u * 1.2, 0, 1))) * tail
    return np.stack([(0.8 * a + 0.2 * b + 0.3 * low) * env, (0.8 * b + 0.2 * a + 0.3 * low) * env])


def sfx_drop_glint():
    n = int(1.4 * SR)
    out = np.zeros((2, n))
    mixin(out, bell(105, 1.0, 0.3, ((1, 1, 1), (2.0, 0.1, 0.4))), 0.0, -0.2)
    mixin(out, bell(100, 0.4, 0.25, ((1, 1, 1), (2.0, 0.1, 0.4))), 0.03, 0.2)
    return out


def make_desert_wind(bounces):
    def gen(dur):
        """ветер пустыни, перекати-поле слева направо, шорох на подскоках"""
        n = int(dur * SR)
        t = tt(n)
        fc = lambda tc: 650 + 250 * np.sin(2 * np.pi * 0.7 * tc) + 150 * np.sin(2 * np.pi * 1.9 * tc + 1)
        a = stft_bp(noise(n), fc, 0.8)
        b = stft_bp(noise(n), fc, 0.8)
        a, b = a / rms(a), b / rms(b)
        gust = 0.65 + 0.35 * np.sin(2 * np.pi * 0.55 * t + 0.8)
        env = gust * np.minimum(1, t / 0.5) * np.clip((dur - t) / 0.6, 0, 1)
        out = np.stack([(0.8 * a + 0.2 * b) * env, (0.8 * b + 0.2 * a) * env])
        for tb in bounces:
            if 0 <= tb < dur - 0.05:
                nn = int(0.09 * SR)
                ru = ffilt(noise(nn), rbj("bp", 2400, 0.8), power=2) * np.minimum(1, tt(nn) / 0.004) * np.exp(-tt(nn) / 0.03)
                mixin(out, ru / rms(ru) * 0.45, tb, -0.7 + 1.4 * tb / dur)
        return out
    return gen


def sfx_thought_puff():
    n = int(0.45 * SR)
    t = tt(n)
    x = ffilt(noise(n), rbj("lp", 1100, 0.6), rbj("hp", 150, 0.7), power=2)
    x = x / rms(x) * np.minimum(1, t / 0.025) * np.exp(-t / 0.11)
    f = 120 + 60 * np.exp(-t / 0.05)
    x += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) * np.minimum(1, t / 0.01)
    return x


def sfx_tear_drop():
    """слеза в песок: «кап», колокольчик D6 и кольцо-отзвук (A6, D7 с биениями)"""
    dur = 2.6
    n = int(dur * SR)
    t = tt(n)
    f = 650 * (1900 / 650) ** np.minimum(1, t / 0.022)
    plip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.028) * (1 - np.exp(-t / 0.0006))
    out = np.stack([plip, plip]) * 0.7
    mixin(out, bell(86, 0.45, 1.1, SOFTB), 0.012)
    nr = n - int(0.06 * SR)
    tr = tt(nr)
    renv = (1 - np.exp(-tr / 0.04)) * np.exp(-tr / 0.9) * 0.16
    for ch, s in ((0, -1), (1, 1)):
        ring = sum(np.sin(2 * np.pi * (hz(m) + s * 0.7) * tr + ph) + np.sin(2 * np.pi * (hz(m) - s * 0.7) * tr)
                   for m, ph in ((93, 0.3), (98, 1.1))) * renv
        out[ch, int(0.06 * SR):] += ring
    return out


def sfx_title_chime():
    """финальный титр: мягкий аккорд-перезвон B♭maj7 (B♭5 D6 F6 A6 D7)"""
    n = int(4.0 * SR)
    out = np.zeros((2, n))
    for j, (dt, m, v) in enumerate(((0.0, 82, 0.85), (0.035, 86, 0.8), (0.07, 89, 0.75), (0.105, 93, 0.7), (0.14, 98, 0.6))):
        mixin(out, bell(m, v, 1.4, ((1, 1, 1), (2.0, 0.2, 0.5), (3.0, 0.08, 0.3), (4.1, 0.04, 0.15))), dt, -0.4 + 0.2 * j)
    return out


# подскоки перекати-поля (main.js: tw = prog(t, w_odin − 0,1, w_zad + 0,2), касание земли при sin(18·tw) = 0)
_tw0, _tw1 = W("w_odin") - 0.1, W("w_zad") + 0.2
BOUNCES = [_tw0 + (_tw1 - _tw0) * k_ * np.pi / 18 - (W("w_odin") + FRAME) + FRAME for k_ in range(1, 6)]

# имя, что в кадре, время события, конец (для длинных), выравнивание: "peak" — пик на кадр позже события,
# "start" — начало на кадр позже события, "long" — от события + кадр до конца
SFX_LIST = [
    ("star_whoosh", "падающая звезда летит: свист-шорох с мерцанием", STAR0, STAR1 + FRAME, "long"),
    ("title_pop", "титр выпрыгивает", T_TITLE, None, "peak"),
    ("star_ding", "звезда долетает до Тучки: «дзынь» с блёстками", STAR1, None, "peak"),
    ("zol_shimmer", "блики пробегают по Тучке («золотая»)", W("w_zol"), None, "peak"),
    ("vel_ding", "Утёс открывает глаз, блик («великана»)", W("w_vel"), None, "peak"),
    ("wake_pop", "Тучка просыпается, «!»", T_WAKE, None, "peak"),
    ("whoosh_up", "Тучка срывается вверх («умчалась»)", T_LAUNCH, None, "peak"),
    ("tumble_gliss", "кувырок («весело»)", T_TUMBLE, None, "start"),
    ("heart_pop", "превращение в сердечко («играя»)", W("w_igr"), None, "peak"),
    ("wind_fall", "камера падает вниз к утёсу: порыв ветра", T_FALL, T_LAND, "long"),
    ("drop_glint", "капля во влажном следе блеснула («след»)", W("w_sled"), None, "peak"),
    ("desert_wind", "перекати-поле, ветер пустыни («Одиноко»)", W("w_odin"), W("w_zad"), "long"),
    ("thought_puff", "облако-мысль («задумался»)", T_THINK, None, "peak"),
    ("tear_drop", "слеза падает в песок: «кап» и кольцо", T_HIT, None, "peak"),
    ("title_chime", "финальный титр: аккорд-перезвон", T_TITLE2, None, "peak"),
]
SFX_GEN = {"title_pop": sfx_title_pop, "star_ding": sfx_star_ding, "zol_shimmer": sfx_zol_shimmer, "vel_ding": sfx_vel_ding,
           "wake_pop": sfx_wake_pop, "whoosh_up": sfx_whoosh_up, "tumble_gliss": sfx_tumble_gliss, "heart_pop": sfx_heart_pop,
           "drop_glint": sfx_drop_glint, "thought_puff": sfx_thought_puff, "tear_drop": sfx_tear_drop, "title_chime": sfx_title_chime}
SFX_LONG = {"star_whoosh": sfx_star_whoosh, "wind_fall": sfx_wind_fall, "desert_wind": make_desert_wind(BOUNCES)}
SFX_PAN = {"title_pop": 0.0, "vel_ding": 0.25, "wake_pop": -0.1, "drop_glint": -0.15, "thought_puff": 0.2}
SFX_SEND = {"star_ding": 0.35, "title_chime": 0.4, "tear_drop": 0.45, "zol_shimmer": 0.3, "vel_ding": 0.3,
            "tumble_gliss": 0.3, "heart_pop": 0.25, "drop_glint": 0.4, "star_whoosh": 0.25, "whoosh_up": 0.2}


def place(name, what, t_ev, t_end, align):
    if align == "long":
        dur = t_end - (t_ev + FRAME)
        x = SFX_LONG[name](dur)
    else:
        x = SFX_GEN[name]()
    st = x.ndim == 2
    chs = [x[0], x[1]] if st else [x]
    mono = np.sum(np.abs(np.stack(chs)), axis=0)
    peak_t = None
    if align == "long":
        onset = t_ev + FRAME
        a, w = 0, len(chs[0])
    elif align == "start":
        onset = t_ev + FRAME
        a, w = 0, int(0.35 * SR)
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
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gl
        sfx[1, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gr
        sfx_send[i0 + j0:i0 + j1] += chs[0][j0:j1] * g * SFX_SEND.get(name, 0.12)
    rec = {"name": name, "what": what, "t": r3(t_ev)}
    if peak_t is not None:
        rec["peak"] = r3(peak_t)
    else:
        rec["start"] = r3(onset)
        rec["end"] = r3(t_end if align == "long" else onset + 0.35)
    rec["db"] = SFX_DB[name]
    SFX_LOG.append(rec)
    SFX_WIN.setdefault(name, []).append((onset + a / SR, onset + (a + min(w, n_ - a)) / SR))


for name, what, t_ev, t_end, align in SFX_LIST:
    place(name, what, t_ev, t_end, align)
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
        "note": "секунды ролика. t — событие в кадре; peak — пик звука (на кадр позже события); у длинных шумов "
                "и глиссандо — start/end; db — громкость шума в своём окне к голосу (K-взвешенно, BS.1770). "
                "music — ключевые моменты музыки.",
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
print(f"темп 6/8: строфа 1 восьмая {e1:.3f} с (♩. = {60 / (3 * e1):.1f}), строфа 2 и финал {e2:.3f} с (♩. = {60 / (3 * e2):.1f}); "
      f"тема вступления с {TH0:.2f}, оживление с {MARK['lively']:.2f}, финальная тема {FP:.2f}–{FZ:.2f}")
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: RMS {rel(SH, SPEECH)} дБ, K {relK(ksh, SPEECH)} дБ к голосу; с шумами RMS {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка, RMS дБ к голосу строки):",
      " ".join(f"{i}:{f1(dB(ms(SH, [(L(i), E(i))])) - dB(ms(VCH, [(L(i), E(i))])))}" for i in range(1, NL + 1)))
print(f"вступление RMS {rel(SH, W_INTRO)}, переход {rel(SH, W_TURN)}, после голоса {rel(SH, W_TAIL)}, финал {rel(SH, W_FIN)}, "
      "паузы " + " ".join(f"{n_}|{n_ + 1}:{rel(SH, [(E(n_) + 0.06, L(n_ + 1) - 0.08)])}" for n_ in GAPS) + " (дБ к голосу)")
print("шумы в своих окнах (K | RMS, дБ к голосу):",
      ", ".join(f"{k_} " + " ".join(f"{relK(ksa, [w])}|{rel(SA, [w])}" for w in ws) for k_, ws in SFX_WIN.items()))
bal = lambda wins: ", ".join(f"{nm} {f1(dB(ms([BUS[nm][0], BUS[nm][1]], wins)) + 20 * np.log10(BUS_G[nm]))}" for nm in BUSES)
print(f"баланс шин (сухо, с BUS_G, RMS дБFS до общего уровня):\n  вступление — {bal(W_INTRO)}\n  строки 1–2 — {bal(SPEECH[:2])}"
      f"\n  строки 3–4 — {bal(SPEECH[2:4])}\n  строфа 2 — {bal(SPEECH[4:])}\n  финал — {bal(W_FIN)}")
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {float(np.max(np.abs(out))):.3f} ({f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS), множитель {limit:.3f}; "
      f"голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы:", "; ".join(f"{r['name']} {r.get('peak', r.get('start'))}" for r in SFX_LOG))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {time.time() - T_START:.1f} с")
