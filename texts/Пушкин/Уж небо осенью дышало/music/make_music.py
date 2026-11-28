#!/usr/bin/env python3
"""Музыка и шумы к «Уж небо осенью дышало…» (А. С. Пушкин), стиль «Гусь-пилот: пике сквозь осень».

Своя музыка: ля минор, ♩≈118–120 (темп подгоняется так, чтобы сильная доля пришлась на первую строку), драйвово.
Инструменты — синтез (numpy): струнное пиццикато (аддитивный щипок: гармоники с точкой щипка, у верхних короче
затухание, «стук» корпуса), пиццикато-бас (виолончель/контрабас), флейта (основной тон + слабые гармоники, дыхание,
вибрато после атаки), низкий рамочный барабан для драйва, в финале — струнный пэд (смычок, медленная атака).
План (секунды из timings.json + вступление; такты — по сетке от L1):
  0 … L1          вступление: Am | F | E, пиццикато 16-ми, бас 8-ми, барабан на каждую долю, флейта-разбег — громче;
  L1 … L4         «полёт»: Am F C — пиццикато 16-ми, барабан на 1 и 3;
  L4 … гуси       «лес»: Dm Am Dm E — пиццикато 8-ми, без барабана, флейта ниже и длиннее;
  гуси … L10      «клин»: Am G F — снова 16-е, барабан на каждую долю, флейта вверху;
  L10 … финал     «ноябрь»: Dm | E — пульс повторяющимися нотами;
  финал           долгий аккорд Am(add9) (пэд + пиццикато + флейта ля) на долю около «fin», затухание до конца ролика.
Громкость: под голосом (по каждой строке, по настоящему голосу) музыка на ≈19 дБ тише голоса, флейта под голосом
ещё на 8 дБ тише; вступление ≈ −8 дБ, паузы между строками ≈ −14 дБ, финал ≈ −8 дБ к среднему голосу.
Шумы (синтез, пик на кадр позже события): шорох перьев — гусь проснулся (≈2,2 с); шлепки лап по воде (5 шт.,
L1+0,2 … dyshalo+0,5); порыв ветра на dyshalo; взмахи крыльев на взлёте dyshalo+0,6; мягкий «вжух» гаснущего солнца
на blistalo; ветер на koroche; шелест листьев на obnazh (≈1,5 с); тихое «шшш» тумана на tuman; гогот «га-га» на gusey
и karavan; хлопок деревянных ворот на noyabr+0,1; свист позёмки от noyabr до dvora+1.

Запуск: python3 make_music.py [--intro 3.0] [--outro 5.5] [--voice ../voice.mp3] [--out music.wav]
Читает ../timings.json (строки) и events.json (ключевые слова, со сдвигом V0). Пишет music.wav (44,1 кГц, 16 бит,
стерео, длина = вступление + голос + финал) и sfx.json (окна шумов и уровни — для check_mix.py).
"""
import argparse
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
FRAME = 1 / 30

LINE_DB = -19.0   # музыка (без шумов) на строке, дБ к голосу строки
INTRO_DB = -8.0
GAP_DB = -14.0
FIN_DB = -8.0
MEL_DUCK_DB = -8.0
SFX_DB = {  # 100 мс RMS к среднему голосу
    "rustle": -17.0, "splash": -20.0, "gust": -21.0, "wings": -19.0, "sunwhoosh": -23.0, "wind": -22.0,
    "leaves": -22.0, "fog": -27.0, "geese": -21.0, "gate": -21.0, "drift": -25.0,
}

# ---------- аргументы и время ----------
with open(os.path.join(HERE, "events.json"), encoding="utf-8") as f:
    RAW = json.load(f)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TM = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «Уж небо осенью дышало…»")
ap.add_argument("--intro", type=float, default=float(RAW["V0"]), help="вступление до голоса, с")
ap.add_argument("--outro", type=float, default=float(RAW["OUTRO"]), help="финал после голоса, с")
ap.add_argument("--voice", default=os.path.join(POEM, TM.get("voice", "voice.mp3")))
ap.add_argument("--out", default=os.path.join(HERE, "music.wav"))
args = ap.parse_args()
V0, OUTRO = args.intro, args.outro
if V0 < 1.5 or OUTRO < 3.0:
    sys.exit("вступление < 1,5 с или финал < 3 с: не хватит места")
TOTAL = round(V0 + float(TM["voiceDuration"]) + OUTRO, 3)
N = int(round(TOTAL * SR))
LINES = [(V0 + l["start"], V0 + l["end"]) for l in TM["lines"]]
NL = len(LINES)
SHIFT = V0 - float(RAW["V0"])
KW = {k: float(v) + SHIFT for k, v in RAW.items() if k not in ("V0", "OUTRO", "total") and not
      (k[0] in "LE" and k[1:].isdigit())}
for i, (s, e) in enumerate(LINES, 1):  # сверка с events.json
    if f"L{i}" in RAW and (abs(s - (RAW[f"L{i}"] + SHIFT)) > 0.02 or abs(e - (RAW[f"E{i}"] + SHIFT)) > 0.02):
        print(f"! строка {i}: timings.json и events.json расходятся", file=sys.stderr)
L = lambda n: LINES[n - 1][0]
E = lambda n: LINES[n - 1][1]
kw = lambda k, d: KW.get(k, d)
FIN = kw("fin", E(NL) + 0.8)
T_WAKE = 2.2 * V0 / float(RAW["V0"])  # шорох пробуждения — внутри вступления
T_DYSH = kw("dyshalo", L(1) + 1.2)
T_GUSEY = kw("gusey", L(min(7, NL)))
T_NOV = kw("noyabr", L(NL) + 0.4)

rng = np.random.default_rng(1826)
db = lambda x: 10 ** (x / 20)
t_ = lambda n: np.arange(n) / SR


def midi(s):
    if isinstance(s, (int, float)):
        return float(s)
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    pc = names[s[0]]
    rest = s[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


hz = lambda m: 440.0 * 2 ** ((midi(m) - 69) / 12)


# ---------- фильтры (через БПФ; scipy не нужен) ----------
def fftf(x, fn):
    n = len(x)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    fr[0] = 1e-3
    return np.fft.irfft(X * fn(fr), n)


def band(fc, bw_oct):
    return lambda f: np.exp(-0.5 * (np.log2(f / fc) / bw_oct) ** 2)


def hp(fc, k=2):
    return lambda f: 1 / np.sqrt(1 + (fc / f) ** (2 * k))


def lp(fc, k=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * k))


def stft_var(x, gain_fn, nf=2048, hop=512):
    """фильтр, меняющийся во времени: gain_fn(t_center, freqs) -> массив"""
    win = np.hanning(nf)
    pad = np.concatenate([np.zeros(nf), x, np.zeros(nf)])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    fr = np.fft.rfftfreq(nf, 1 / SR)
    fr[0] = 1e-3
    for s in range(0, len(pad) - nf, hop):
        seg = pad[s:s + nf] * win
        tc = (s + nf / 2 - nf) / SR
        out[s:s + nf] += np.fft.irfft(np.fft.rfft(seg) * gain_fn(tc, fr), nf) * win
        norm[s:s + nf] += win ** 2
    return (out / np.maximum(norm, 1e-6))[nf:nf + len(x)]


def convolve(x, ir):
    n = len(x) + len(ir) - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]


def make_ir(rt60, length, seed):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = t_(n)
    ir = r.standard_normal(n) * np.exp(-6.9 * t / rt60)
    ir = fftf(ir, lp(5500))
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


# ---------- шины ----------
BUS = {k: np.zeros((2, N)) for k in ("pizz", "bass", "drum", "fl", "pad")}


def put(bus, t, x, pan=0.0, g=1.0):
    i0 = int(round(t * SR))
    if x.ndim == 1:
        a = np.pi / 4 * (pan + 1)
        x = np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
    j0, j1 = max(i0, 0), min(i0 + x.shape[1], N)
    if j1 > j0:
        bus[:, j0:j1] += g * x[:, j0 - i0:j1 - i0]


# ---------- инструменты ----------
PZ_CACHE = {}


def pizz(m, ring=1.0):
    """щипок струны: гармоники k·f с амплитудой sin(kπβ)/k (β — точка щипка), верхние гаснут быстрее;
    короткий «стук» корпуса; лёгкая неровность строя на каждый щипок"""
    key = (round(midi(m), 2), round(ring, 2))
    if key not in PZ_CACHE:
        f = hz(m)
        dur = min(1.6, 0.25 + 0.9 * ring * (220 / f) ** 0.5)
        n = int(dur * SR)
        t = t_(n)
        beta = 0.18
        y = np.zeros(n)
        base = 0.55 * ring * (196 / f) ** 0.35
        for k in range(1, 13):
            fk = k * f * (1 + 0.0004 * k * k)
            if fk > 9000:
                break
            a = abs(np.sin(k * np.pi * beta)) / k ** 1.1
            y += a * np.sin(2 * np.pi * fk * t) * np.exp(-t / (base / (1 + 0.55 * (k - 1))))
        y *= np.minimum(1, t / 0.0015)
        y *= np.minimum(1, (dur - t) / 0.03)
        thump = fftf(np.random.default_rng(int(midi(m) * 7)).standard_normal(n) * np.exp(-t / 0.006),
                     band(min(4 * f, 2500), 0.8)) * 0.35
        PZ_CACHE[key] = (y + thump) * 0.32
    return PZ_CACHE[key]


def pizz_bass(m, ring=1.0):
    return np.tanh(1.4 * pizz(m, ring * 1.3) / 0.32) * 0.42


FL_CACHE = {}


def flute(m, dur, v=1.0):
    """флейта: основной тон + 2-я/3-я гармоники, дыхание (шум в полосе около тона), вибрато после 0,15 с"""
    key = (round(midi(m), 2), round(dur, 3))
    if key not in FL_CACHE:
        f = hz(m)
        rel = 0.12
        n = int((dur + rel) * SR)
        t = t_(n)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.25, 0, 1)
        ph = 2 * np.pi * f * np.cumsum(vib) / SR
        y = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.3) + 0.07 * np.sin(3 * ph + 1.1)
        att = min(0.045, dur * 0.3)
        env = np.minimum(1, t / att) ** 1.5
        env *= 0.88 + 0.12 * np.exp(-t / 0.08)
        off = int(dur * SR)
        env[off:] *= np.exp(-(t[off:] - dur) / 0.04)
        br = fftf(np.random.default_rng(int(f)).standard_normal(n), band(f * 1.5, 1.2)) * 0.1
        br *= np.exp(-t / 0.05) * 2 + 0.5
        FL_CACHE[key] = (y + br) * env * 0.2
    return FL_CACHE[key] * v


def drum(v=1.0):
    """низкий рамочный барабан: синус с падением тона + шорох кожи"""
    n = int(0.5 * SR)
    t = t_(n)
    f = 62 + 55 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    skin = fftf(rng.standard_normal(n) * np.exp(-t / 0.02), band(900, 1.0)) * 0.25
    return np.tanh(1.5 * (body + skin)) * 0.6 * v


def pad(notes, dur, v=1.0):
    """струнный пэд (смычок): пилообразные голоса через аддитивный синтез, расстройка ±6 центов, медленная атака,
    долгое затухание до конца; стерео"""
    n = int(dur * SR)
    t = t_(n)
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        f = hz(m)
        for ch, det in ((0, -6.0), (1, 6.0)):
            fd = f * 2 ** ((det + 2 * j) / 1200)
            vib = 1 + 0.003 * np.sin(2 * np.pi * (4.6 + 0.3 * j) * t + j)
            ph = 2 * np.pi * fd * np.cumsum(vib) / SR
            y = np.zeros(n)
            for k in range(1, 14):
                if k * fd > 7000:
                    break
                y += np.sin(k * ph) / k * (1 / (1 + (k * fd / 2200) ** 2))
            out[ch] += y
    env = np.minimum(1, t / 0.35) ** 2 * np.exp(-t / 2.6)
    return out * env * 0.07 * v


# ---------- сетка ----------
n_beats = max(4, int(round(L(1) / 0.5)))     # доли вступления
BEAT = L(1) / n_beats                         # ≈0,5 с → ♩≈120
BAR = 4 * BEAT
O = L(1)                                      # доля 0 = начало голоса
bt = lambda beat: O + beat * BEAT
bar_near = lambda t: int(round((t - O) / BAR))
forest_bar = bar_near(L(min(4, NL)))
geese_bar = max(forest_bar + 1, bar_near(T_GUSEY))
nov_bar = max(geese_bar + 1, bar_near(L(NL)))
fin_beat = int(round((FIN - O) / BEAT))
fin_beat = max(fin_beat, int(np.ceil((E(NL) + 0.15 - O) / BEAT)))
while bt(fin_beat) > TOTAL - 3.0:
    fin_beat -= 1

CH = {  # бас (пиццикато), голоса пиццикато
    "Am": ("A1", [57, 60, 64]), "F": ("F1", [57, 60, 65]), "C": ("C2", [55, 60, 64]), "G": ("G1", [55, 59, 62]),
    "Dm": ("D2", [57, 62, 65]), "E": ("E1", [56, 59, 64]),
}
SEC_CH = {"A": ["Am", "F", "C", "G"], "B": ["Dm", "Am", "Dm", "E"], "C": ["Am", "G", "F", "E"],
          "N": ["Dm", "E"]}
MOT = {  # мотивы флейты на такт: (доля, нота, длина в долях)
    ("A", "Am"): [(0, "A5", 1.5), (1.5, "C6", .5), (2, "B5", .5), (2.5, "A5", .5), (3, "E5", 1)],
    ("A", "F"): [(0, "F5", 1), (1, "A5", .5), (1.5, "C6", 1.5), (3, "A5", 1)],
    ("A", "C"): [(0, "G5", .5), (.5, "E5", .5), (1, "C5", 1), (2, "E5", .5), (2.5, "G5", .5), (3, "C6", 1)],
    ("A", "G"): [(0, "B5", 1.5), (1.5, "D6", .5), (2, "B5", .5), (2.5, "G5", .5), (3, "D5", 1)],
    ("B", "Dm"): [(0, "F5", 2), (2, "E5", 1), (3, "D5", 1)],
    ("B", "Am"): [(0, "C5", 2), (2, "B4", 1), (3, "A4", 1)],
    ("B", "E"): [(0, "G#4", 1.5), (1.5, "B4", .5), (2, "D5", 2)],
    ("C", "Am"): [(0, "E6", .5), (.5, "C6", .5), (1, "A5", .5), (1.5, "C6", .5), (2, "E6", 1), (3, "D6", .5),
                  (3.5, "C6", .5)],
    ("C", "G"): [(0, "D6", .5), (.5, "B5", .5), (1, "G5", .5), (1.5, "B5", .5), (2, "D6", 1), (3, "C6", .5),
                 (3.5, "B5", .5)],
    ("C", "F"): [(0, "C6", .5), (.5, "A5", .5), (1, "F5", .5), (1.5, "A5", .5), (2, "C6", 1), (3, "B5", .5),
                 (3.5, "A5", .5)],
    ("C", "E"): [(0, "B5", 1), (1, "G#5", .5), (1.5, "B5", .5), (2, "E6", 2)],
    ("N", "Dm"): [(0, "A5", 1), (1, "F5", 1), (2, "D5", 2)],
    ("N", "E"): [(0, "G#5", 2), (2, "B5", 2)],
}
INTRO_MEL = [(-6, "E5", .5), (-5.5, "A5", .5), (-5, "C6", 1), (-4, "B5", .5), (-3.5, "A5", .5),
             (-3, "F5", .5), (-2.5, "A5", .5), (-2, "G#5", 1), (-1, "B5", .5), (-.5, "E6", .5)]

# сегменты аккордов: (доля начала, доля конца, аккорд, секция)
SEG = []
for s in range(-n_beats, 0, 2):  # во вступлении аккорд на две доли: … Am F E → первая строка
    back = (0 - s) // 2  # 1 — последний сегмент
    SEG.append((s, s + 2, {1: "E", 2: "F"}.get(back, "Am"), "I"))
for bar in range(0, fin_beat // 4 + 1):
    sec = "A" if bar < forest_bar else "B" if bar < geese_bar else "C" if bar < nov_bar else "N"
    first = {"A": 0, "B": forest_bar, "C": geese_bar, "N": nov_bar}[sec]
    seq = SEC_CH[sec]
    idx = bar - first
    c = seq[idx % len(seq)]
    s, e = bar * 4, min(bar * 4 + 4, fin_beat)
    if e > s:
        SEG.append((s, e, c, sec))

PZ = {"I": 1.0, "A": 0.9, "B": 0.7, "C": 1.0, "N": 0.85}
for s, e, c, sec in SEG:
    bnote, voic = CH[c]
    hi = [voic[0] + 12, voic[1], voic[2], voic[1]]  # 16-е: верх — середина — верх аккорда — середина
    for beat in range(s, e):
        tb = bt(beat)
        if tb < -1e-3:
            continue
        pos = beat - 4 * (beat // 4)
        if sec in ("I", "A", "C"):
            for j in range(4):
                v = (1.0 if j == 0 else 0.6 if j == 2 else 0.45) * (1.1 if pos == 0 and j == 0 else 1.0)
                put(BUS["pizz"], tb + j * BEAT / 4, pizz(hi[j], 0.6) * v * PZ[sec], pan=-0.35 + 0.22 * j)
            for j in range(2):
                bn = midi(bnote) + (12 if j else 0)
                put(BUS["bass"], tb + j * BEAT / 2, pizz_bass(bn, 0.7) * (1.0 if j == 0 else 0.7), pan=0.05)
            if sec in ("I", "C") or pos in (0, 2):
                put(BUS["drum"], tb, drum(1.0 if pos == 0 else 0.7), pan=0.0)
            if sec == "C" and pos == 3:
                put(BUS["drum"], tb + BEAT / 2, drum(0.5), pan=0.0)
        elif sec == "B":
            for j in range(2):
                put(BUS["pizz"], tb + j * BEAT / 2, pizz(voic[(pos * 2 + j) % 3] + (12 if j else 0), 1.0) *
                    (0.8 if j == 0 else 0.55) * PZ[sec], pan=-0.3 + 0.6 * j)
            if pos in (0, 2):
                put(BUS["bass"], tb, pizz_bass(bnote, 1.2) * 0.85, pan=0.05)
        else:  # N — пульс повторяющимися нотами: корень/квинта 16-ми, бас 8-ми, барабан на 1 и 3
            for j in range(4):
                nn = voic[0] + 12 if j % 2 == 0 else voic[2]
                put(BUS["pizz"], tb + j * BEAT / 4, pizz(nn, 0.5) * (0.9 if j == 0 else 0.5) * PZ[sec],
                    pan=-0.2 + 0.13 * j)
            for j in range(2):
                put(BUS["bass"], tb + j * BEAT / 2, pizz_bass(bnote, 0.7) * (1.0 if j == 0 else 0.65), pan=0.05)
            if pos in (0, 2):
                put(BUS["drum"], tb, drum(0.8), pan=0.0)
    # флейта: мотив такта
    if sec != "I" and (sec, c) in MOT:
        for beat, m, d in MOT[(sec, c)]:
            if s + beat < e:
                d = min(d, e - (s + beat))
                put(BUS["fl"], bt(s + beat), flute(m, d * BEAT * 0.94, 0.9 if sec != "B" else 0.75),
                    pan=0.12 * np.sin(beat + s))
for beat, m, d in INTRO_MEL:
    if beat >= -n_beats:
        put(BUS["fl"], max(bt(beat), 0), flute(m, d * BEAT * 0.94, 1.0), pan=0.1)

# финал: долгий аккорд Am(add9) до конца ролика
TF = bt(fin_beat)
dur_f = TOTAL - TF
put(BUS["pad"], TF, pad([45, 52, 57, 60, 64, 71], dur_f, 1.0))
for m, pn in ((45, 0.0), (57, -0.3), (64, 0.0), (72, 0.3)):
    put(BUS["pizz"], TF, pizz(m, 1.6) * 0.9, pan=pn)
put(BUS["bass"], TF, pizz_bass("A1", 1.6))
put(BUS["drum"], TF, drum(1.0))
put(BUS["fl"], TF, flute("A5", min(dur_f - 0.6, 3.6), 0.9), pan=0.1)
put(BUS["fl"], TF + 0.02, flute("E6", min(dur_f - 0.8, 3.2), 0.45), pan=-0.15)

# реверберация: зал на струнах и флейте, короче на барабане
IR = make_ir(1.6, 1.9, 7)
IRs = make_ir(0.6, 0.7, 8)
for k_, send, ir in (("pizz", 0.35, IR), ("bass", 0.15, IRs), ("fl", 0.4, IR), ("pad", 0.5, IR),
                     ("drum", 0.2, IRs)):
    BUS[k_] = BUS[k_] + send * np.vstack([convolve(BUS[k_][0], ir), convolve(BUS[k_][1], np.roll(ir, 41))])
# финальное затухание: аккорд гаснет к концу ролика (последние 2,6 с — до нуля)
fade = np.ones(N)
nf = int(min(2.6, dur_f * 0.6) * SR)
fade[-nf:] = np.cos(np.linspace(0, np.pi / 2, nf)) ** 2
for k_ in BUS:
    BUS[k_] *= fade
fi = int(0.03 * SR)
for k_ in BUS:
    BUS[k_][:, :fi] *= np.linspace(0, 1, fi)


# ---------- голос ----------
def load_voice():
    if not os.path.exists(args.voice):
        sys.exit(f"нет голоса {args.voice}")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", args.voice, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    i0 = int(round(V0 * SR))
    out[i0:i0 + len(v)] = v[: N - i0]
    return out


VOICE = load_voice()
sl = lambda a, b: slice(int(a * SR), int(b * SR))
rms = lambda x: np.sqrt(np.mean(x ** 2) + 1e-20)
V_LINE = [rms(VOICE[sl(s, e)]) for s, e in LINES]
V_MEAN = rms(np.concatenate([VOICE[sl(s, e)] for s, e in LINES]))

# активность голоса → флейта под голосом тише
fr_ = int(0.02 * SR)
env = np.sqrt(np.convolve(VOICE ** 2, np.ones(fr_) / fr_, mode="same"))
act = (env > V_MEAN * db(-20)).astype(float)
blk = 44
vals = act[::blk].copy()
ca, cr = np.exp(-blk / (0.04 * SR)), np.exp(-blk / (0.25 * SR))
for order in (range(len(vals)), range(len(vals) - 1, -1, -1)):
    a = 0.0
    o = np.empty(len(vals))
    for i in order:
        c = ca if vals[i] > a else cr
        a = c * a + (1 - c) * vals[i]
        o[i] = a
    vals = o
sm = np.repeat(vals, blk)[:N]
sm = np.pad(sm, (0, N - len(sm)), mode="edge")
act_s = np.clip(sm, 0, 1)
BUS["fl"] *= 1 - act_s * (1 - db(MEL_DUCK_DB))

MUS = sum(BUS.values())
mono = lambda x: 0.5 * (x[0] + x[1])


# ---------- огибающая громкости ----------
def gain_curve(pts):
    ts = np.array([p[0] for p in pts])
    gs = np.array([20 * np.log10(p[1]) for p in pts])
    return db(np.interp(t_(N), ts, gs))


def build_points(gl, g_intro, g_gap, g_fin):
    R = 0.12
    pts = [(0, g_intro), (L(1) - 0.35, g_intro), (L(1) - 0.05, gl[0])]
    for i in range(NL):
        pts.append((L(i + 1) - (0.05 if i else 0), gl[i]))
        pts.append((E(i + 1), gl[i]))
        if i + 1 < NL:
            gap = L(i + 2) - E(i + 1)
            if gap > 0.4:
                gg = min(g_gap, max(gl[i], gl[i + 1]) * db(6))
                pts += [(E(i + 1) + R, gg), (L(i + 2) - R - 0.05, gg)]
    pts += [(E(NL) + 0.45, g_fin), (TOTAL, g_fin)]
    return sorted(pts)


mm = mono(MUS)
gl = [V_LINE[i] * db(LINE_DB) / rms(mm[sl(s, e)]) for i, (s, e) in enumerate(LINES)]
g_intro = V_MEAN * db(INTRO_DB) / rms(mm[sl(0.15, L(1) - 0.4)])
fin_win = (max(E(NL) + 0.5, TF), TOTAL - 2.4)
g_fin = V_MEAN * db(FIN_DB) / rms(mm[sl(*fin_win)])
gap_ref = np.concatenate([mm[sl(E(i) + 0.12, L(i + 1) - 0.12)] for i in range(1, NL) if L(i + 1) - E(i) > 0.4])
g_gap = V_MEAN * db(GAP_DB) / rms(gap_ref)
for it in range(4):  # подправляем строки с учётом скатов огибающей
    G = gain_curve(build_points(gl, g_intro, g_gap, g_fin))
    for i, (s, e) in enumerate(LINES):
        lvl = 20 * np.log10(rms((mm * G)[sl(s, e)]) / V_LINE[i])
        gl[i] *= db(LINE_DB - lvl)
G = gain_curve(build_points(gl, g_intro, g_gap, g_fin))
MUS = MUS * G

# ---------- шумы ----------
SFX = np.zeros((2, N))
SFX_LOG = []


def k100(x):
    n = int(0.1 * SR)
    p = np.convolve(x ** 2, np.ones(n) / n, mode="same")
    return np.sqrt(p.max()), int(np.argmax(p))


def place(name, what, t_event, x, pan=0.0, db_=None):
    """x моно; пик (самое громкое окно 100 мс) ставим на t_event + кадр"""
    target = SFX_DB[name] if db_ is None else db_
    lvl, ipk = k100(x)
    g = V_MEAN * db(target) / lvl
    start = t_event + FRAME - ipk / SR
    cut = max(0, int(-start * SR))
    put(SFX, max(start, 0.0), x[cut:] * g, pan=pan)
    SFX_LOG.append({"name": name, "what": what, "event": round(t_event, 3), "start": round(max(start, 0), 3),
                    "end": round(start + len(x) / SR, 3), "db_to_voice": target})


def env_ar(n, a, r, shape=1.5):
    t = t_(n)
    d = n / SR
    return np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1) ** shape


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def gust(dur, f0, f1, tpk, seed):
    """порыв ветра: шум в полосе, частота растёт к пику и опадает"""
    x = stft_var(noise(int(dur * SR), seed),
                 lambda tc, f: band(f0 + (f1 - f0) * np.exp(-((tc - tpk) / (0.35 * dur)) ** 2), 1.0)(f))
    t = t_(len(x))
    e = np.where(t < tpk, np.exp(-((t - tpk) / (0.45 * tpk + 1e-3)) ** 2), np.exp(-(t - tpk) / (0.4 * (dur - tpk))))
    return x * e * env_ar(len(x), 0.02, 0.1)


def flap(m_dur=0.12, seed=0):
    m = int(m_dur * SR)
    t = t_(m)
    b = fftf(noise(m, seed), lambda f: band(850, 1.2)(f) + 0.35 * band(2600, 0.7)(f))
    return b * np.sin(np.pi * t / m_dur) ** 2 * (1 + 0.6 * np.sin(np.pi * t / m_dur))


# 1. шорох перьев: гусь проснулся (≈2,2 с, вступление)
n = int(0.55 * SR)
r = fftf(noise(n, 11), band(3800, 0.9))
fl_ = 1 + 0.9 * np.abs(fftf(noise(n, 12), lp(28)))
r *= fl_ * env_ar(n, 0.04, 0.3)
r += 0.6 * np.concatenate([flap(0.1, 13), np.zeros(n - int(0.1 * SR))])
place("rustle", "гусь просыпается: шорох перьев", T_WAKE, r, pan=0.1)

# 2. шлепки лап по воде: 5 шт. от L1+0,2 до dyshalo+0,5
ts0, ts1 = L(1) + 0.2, T_DYSH + 0.5
for j, ts in enumerate(np.linspace(ts0, ts1, 5)):
    n = int(0.22 * SR)
    t = t_(n)
    sp = fftf(noise(n, 20 + j), band(1800 + 200 * j, 1.1)) * np.exp(-t / 0.035)
    f = 380 * (1 + 1.2 * np.exp(-t / 0.015)) * (1 + 0.05 * j)
    bl = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04) * 0.8
    drops = fftf(noise(n, 30 + j) * (np.random.default_rng(40 + j).random(n) > 0.9993), band(3500, 0.7)) * 3
    x = (sp + bl + drops * (t > 0.04)) * np.minimum(1, t / 0.002)
    place("splash", f"шлепок лапы по воде {j + 1}/5", float(ts), x, pan=-0.15 + 0.08 * (j % 2), )

# 3. порыв ветра на «дышало» (облако дует)
place("gust", "порыв ветра: небо дышит", T_DYSH, gust(1.8, 380, 950, 0.5, 41), pan=-0.4)

# 4. взмахи крыльев на взлёте: dyshalo+0,6
ttk = T_DYSH + 0.6
wn = int(0.62 * SR)
wings = np.zeros(wn)
for j, (dt, a) in enumerate(((0.0, 1.0), (0.15, 0.9), (0.30, 0.8), (0.45, 0.65))):
    fb = flap(0.13, 50 + j)
    i0 = int(dt * SR)
    wings[i0:i0 + len(fb)] += a * fb[: wn - i0]
place("wings", "взлёт гуся: взмахи крыльев", ttk, wings, pan=0.2)

# 5. мягкий «вжух»: солнце гаснет (blistalo)
d = 0.9
x = stft_var(noise(int(d * SR), 61), lambda tc, f: band(2400 * np.exp(-1.4 * tc) + 250, 0.9)(f))
x *= env_ar(len(x), 0.18, 0.5)
place("sunwhoosh", "солнце гаснет: мягкий вжух", kw("blistalo", L(2) + 0.6), x, pan=0.25)

# 6. ветер на «короче»
place("wind", "ветер над полем: день короче", kw("koroche", L(3)), gust(1.6, 300, 700, 0.55, 71), pan=0.4)

# 7. шелест листьев на «обнажалась» (≈1,5 с)
d = 1.5
n = int(d * SR)
lv = fftf(noise(n, 81), lambda f: band(4200, 1.0)(f) + 0.4 * band(1600, 0.8)(f))
crack = np.random.default_rng(82).random(n) > 0.997
lv += fftf(noise(n, 83) * crack, band(3000, 0.8)) * 6
lv *= (0.5 + np.abs(fftf(noise(n, 84), lp(9))) * 2.5) * env_ar(n, 0.12, 0.6)
place("leaves", "листья срываются вихрем", kw("obnazh", L(min(5, NL)) + 0.5), lv, pan=-0.2)

# 8. тихое «шшш» тумана
d = 1.6
x = fftf(noise(int(d * SR), 91), band(5200, 1.3)) * env_ar(int(d * SR), 0.5, 0.7, 2.0)
place("fog", "туман ложится на поля", kw("tuman", L(min(6, NL)) + 0.3), x, pan=0.0)


# 9. гогот гусей «га-га»
def honk(f0, seed, dur=0.13):
    """«га»: носовой пульсовый тон с падением высоты через форманты «а» (700/1150/2600 Гц) + щелчок «г»"""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = t_(n)
    f = f0 * (1.08 - 0.16 * t / dur) * (1 + 0.012 * r.standard_normal(n).cumsum() / np.sqrt(n))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = np.zeros(n)
    for k in range(1, 18):
        src += np.sin(k * ph) / k ** 0.8
    y = fftf(src, lambda fr: band(700, 0.45)(fr) + 0.8 * band(1150, 0.4)(fr) + 0.45 * band(2600, 0.35)(fr))
    y *= np.minimum(1, t / 0.008) * np.clip((dur - t) / 0.04, 0, 1)
    g = fftf(r.standard_normal(n) * np.exp(-t / 0.006), band(1500, 0.6)) * 0.6
    return y + g


def honks(spec, seed):
    """spec: [(dt, f0)] → один клип, лёгкий зал и срез верхов (клин вдали)"""
    n = int((max(s[0] for s in spec) + 0.6) * SR)
    x = np.zeros(n)
    for j, (dt, f0) in enumerate(spec):
        h = honk(f0, seed + j)
        i0 = int(dt * SR)
        x[i0:i0 + len(h)] += h * (1.0 if j == 0 else 0.72)
    x = fftf(x, lp(4500))
    x = x + 0.35 * convolve(x, make_ir(0.8, 0.6, seed))
    return x


place("geese", "клин гогочет: га-га", T_GUSEY, honks([(0, 420), (0.19, 400), (0.5, 470), (0.68, 445)], 100),
      pan=0.3)
place("geese", "гуси оборачиваются: га-га (караван)", kw("karavan", T_GUSEY + 1.3),
      honks([(0, 440), (0.17, 415), (0.42, 390), (0.6, 372)], 110), pan=-0.25)

# 10. хлопок деревянных ворот на noyabr+0,1
n = int(0.7 * SR)
t = t_(n)
gate = fftf(noise(n, 120) * np.exp(-t / 0.012), lp(1800)) * 1.2
for f, a, dd in ((95, 1.0, 0.12), (182, 0.7, 0.08), (410, 0.5, 0.05), (760, 0.3, 0.03)):
    gate += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dd)
reb = int(0.09 * SR)  # дребезг створки
gate[reb:] += 0.35 * gate[: n - reb] * np.exp(-t[: n - reb] / 0.05)
gate *= np.minimum(1, t / 0.001)
gate = np.tanh(1.2 * gate)
place("gate", "ворота хлопают", T_NOV + 0.1, gate, pan=0.15)

# 11. свист позёмки от noyabr до dvora+1
t_d0, t_d1 = T_NOV, kw("dvora", L(NL) + 1.4) + 1.0
d = t_d1 - t_d0
n = int(d * SR)
dr = stft_var(noise(n, 130), lambda tc, f: band(2600 + 900 * np.sin(2 * np.pi * tc / d * 1.3), 0.7)(f) +
              0.5 * hp(4000)(f))
tt = t_(n)
wh = np.sin(2 * np.pi * np.cumsum(1900 + 350 * np.sin(2 * np.pi * 0.7 * tt)) / SR) * 0.08
dr = (dr + wh * np.std(dr) / 0.06) * env_ar(n, 0.5, 0.8) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.1 * tt))
lvl, ipk = k100(dr)
gd = V_MEAN * db(SFX_DB["drift"]) / lvl
put(SFX, t_d0, dr * gd, pan=-0.3)
SFX_LOG.append({"name": "drift", "what": "свист позёмки у ворот", "event": round(t_d0, 3), "start": round(t_d0, 3),
                "end": round(t_d1, 3), "db_to_voice": SFX_DB["drift"]})

SFX *= fade
OUT = MUS + SFX
peak = np.max(np.abs(OUT))
if peak > db(-1.0):
    sys.exit(f"пик музыки {20 * np.log10(peak):.1f} dBFS — выше −1 dBFS, снизь уровни")

# ---------- запись ----------
pcm = (np.clip(OUT, -1, 1) * 32767).round().astype("<i2").T.copy()
with wave.open(args.out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

mmf = mono(MUS)
f1 = lambda x: round(float(x), 1)
info = {
    "intro": V0, "outro": OUTRO, "total": TOTAL, "bpm": round(60 / BEAT, 2), "fin": round(FIN, 3),
    "final_chord_t": round(TF, 3),
    "bars": {"forest": forest_bar, "geese": geese_bar, "november": nov_bar, "bar_s": round(BAR, 3)},
    "voice_mean_dbfs": f1(20 * np.log10(V_MEAN)),
    "music_line_db": [f1(20 * np.log10(rms(mmf[sl(s, e)]) / V_LINE[i])) for i, (s, e) in enumerate(LINES)],
    "music_intro_db": f1(20 * np.log10(rms(mmf[sl(0.15, L(1) - 0.4)]) / V_MEAN)),
    "music_fin_db": f1(20 * np.log10(rms(mmf[sl(*fin_win)]) / V_MEAN)),
    "peak_dbfs": f1(20 * np.log10(peak)),
    "sfx": SFX_LOG,
}
with open(os.path.join(HERE, "sfx.json"), "w", encoding="utf-8") as f:
    json.dump(info, f, ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in info.items() if k != "sfx"}, ensure_ascii=False))
print(f"записано {args.out}: {TOTAL} с, {len(SFX_LOG)} шумов")
