#!/usr/bin/env python3
"""Музыка и шумы к «За весной, красой природы…» (А. С. Пушкин), стиль «граффити баллончиком на кирпичной стене».

Своя музыка: лёгкий бум-бэп ♩≈97 (темп подгоняется так, чтобы сильная доля пришлась на первую строку), ре мажор.
Инструменты — синтез (numpy): мягкая бочка (синус с падением тона), щелчок малого (шум 2–6 кГц + тело 190 Гц),
хэт (шум > 7 кГц, свинг 16-х), электропиано (FM, «тайн»-призвук, лёгкий хорус L/R) — аккорды и напев, круглый бас.
План (секунды из timings.json + вступление; такты — по сетке от L1):
  0 … L1       вступление: затакт A7sus, полный бит, хэт 16-ми, разбег напева — бодро и громче;
  L1 … L3      Dmaj9 F#m7 | Gmaj7 A9 — светло, полный бит;
  L3 … L6      минор: Bm9 | Em9 | Gmaj7 F#7b9 — бит разреженный (бочка на 1, малый на 3, хэт четвертями);
  L6 … E8      светлеет и поднимается: Gmaj7 A6 | Bm7 A/C# | Dmaj9 Em7 (бас идёт вверх G-A-B-C#-D-E), хэт гуще,
               перед финалом сбивка малого 16-ми;
  финал        Gmaj7 A9 — громче, открытый хэт; затем удар Dmaj9 с бочкой и затухание до конца.
Громкость: под голосом (по каждой строке, по настоящему голосу) музыка на ≈19 дБ тише голоса; напев под голосом ещё
на 8 дБ тише; вступление ≈ −8 дБ, длинные паузы между строками ≈ −14 дБ, финал ≈ −7 дБ к среднему голосу.
Шумы (синтез, пик на кадр позже события): стук шарика в баллончике (0,0–0,5 с; L1−0,3; L2−0,3; L7−0,6; fin−0,3)
и после каждого стука короткий пшик распыла 0,6–1,2 с; широкий серый баллон на L3 (≈1,5 с); лёгкий порыв ветра
на L4; три быстрых взмаха крыльев на ptichka+0,5.

Запуск: python3 make_music.py [--intro 3.6] [--outro 6.0] [--voice ../voice.mp3] [--out music.wav]
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
FIN_DB = -7.0
MEL_DUCK_DB = -8.0
SFX_DB = {"rattle": -14.0, "spray": -20.0, "gray": -21.5, "wind": -21.0, "wings": -17.0}  # 100 мс RMS к ср. голосу

# ---------- аргументы и время ----------
with open(os.path.join(HERE, "events.json"), encoding="utf-8") as f:
    RAW = json.load(f)
with open(os.path.join(POEM, "timings.json"), encoding="utf-8") as f:
    TM = json.load(f)
ap = argparse.ArgumentParser(description="музыка и шумы к «За весной, красой природы…»")
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
    if abs(s - (RAW[f"L{i}"] + SHIFT)) > 0.02 or abs(e - (RAW[f"E{i}"] + SHIFT)) > 0.02:
        print(f"! строка {i}: timings.json и events.json расходятся", file=sys.stderr)
L = lambda n: LINES[n - 1][0]
E = lambda n: LINES[n - 1][1]
FIN = KW.get("fin", E(NL) + 0.9)

rng = np.random.default_rng(1824)
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
    ir = fftf(ir, lp(5000))
    ir[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


# ---------- шины ----------
BUS = {k: np.zeros((2, N)) for k in ("drm", "ep", "mel", "bass")}


def put(bus, t, x, pan=0.0, g=1.0):
    i0 = int(round(t * SR))
    if x.ndim == 1:
        a = np.pi / 4 * (pan + 1)
        x = np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
    j0, j1 = max(i0, 0), min(i0 + x.shape[1], N)
    if j1 > j0:
        bus[:, j0:j1] += g * x[:, j0 - i0:j1 - i0]


# ---------- инструменты ----------
def kick(v=1.0):
    n = int(0.45 * SR)
    t = t_(n)
    f = 48 + 72 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22)
    click = fftf(rng.standard_normal(n) * np.exp(-t / 0.004), lp(2500)) * 0.25
    return np.tanh(1.6 * (body + click)) * 0.8 * v


def snare(v=1.0):
    n = int(0.3 * SR)
    t = t_(n)
    nz = fftf(rng.standard_normal(n), band(3400, 0.9)) * np.exp(-t / 0.045)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    rim = fftf(rng.standard_normal(n) * np.exp(-t / 0.0025), band(5000, 0.6)) * 1.5
    x = nz + body + rim
    return x / np.max(np.abs(x)) * 0.55 * v


def hat(v=1.0, open_=False):
    n = int((0.35 if open_ else 0.08) * SR)
    t = t_(n)
    x = fftf(rng.standard_normal(n), hp(7000, 3)) * np.exp(-t / (0.12 if open_ else 0.018))
    return x / np.max(np.abs(x)) * 0.22 * v


EP_CACHE = {}


def epiano(m, dur, v=1.0, bright=1.0):
    """FM-электропиано: несущая f, модулятор f (индекс спадает), «тайн» 14f; хорус L/R"""
    key = (round(midi(m), 2), round(dur, 3), round(bright, 2))
    if key not in EP_CACHE:
        f = hz(m)
        rel = 0.25
        n = int((dur + rel) * SR)
        t = t_(n)
        env = np.exp(-t / (1.1 + 0.6 * (60 / max(midi(m), 30))))
        env *= np.minimum(1, t / 0.003)
        off = int(dur * SR)
        env[off:] *= np.exp(-(t[off:] - dur) / 0.08)
        idx = bright * (1.6 * np.exp(-t / 0.25) + 0.35)
        out = []
        for det in (-3.0, 3.0):
            fc = f * 2 ** (det / 1200)
            y = np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fc * t))
            y += 0.12 * bright * np.sin(2 * np.pi * 14 * fc * t) * np.exp(-t / 0.018)
            out.append(y * env)
        x = np.vstack(out)
        trem = 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t + np.array([[0], [np.pi]]))
        EP_CACHE[key] = x * trem * 0.18
    return EP_CACHE[key] * v


def bassnote(m, dur, v=1.0):
    f = hz(m)
    n = int((dur + 0.08) * SR)
    t = t_(n)
    env = np.minimum(1, t / 0.006) * (0.75 + 0.25 * np.exp(-t / 0.15))
    off = int(dur * SR)
    env[off:] *= np.exp(-(t[off:] - dur) / 0.03)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.3 * y * env) * 0.55 * v


# ---------- сетка ----------
n_beats = max(4, 2 * int(round(L(1) / 0.62 / 2)))   # чётное число долей вступления
BEAT = L(1) / n_beats                               # ≈0,62 с → ♩≈97
BAR = 4 * BEAT
O = L(1)                                            # сильная доля такта 0 = начало голоса
bt = lambda bar, beat=0.0: O + bar * BAR + beat * BEAT
bar_near = lambda t: int(round((t - O) / BAR))
first_bar = -int(np.ceil(L(1) / BAR))
dark_bar = bar_near(L(3))
rise_bar = bar_near(L(6))
fin_bar = int(np.ceil((E(NL) + 0.25 - O) / BAR))
end_bar = fin_bar + 1
while bt(end_bar) > TOTAL - 2.2:
    end_bar -= 1
while bt(end_bar + 1) < TOTAL - 4.5:
    end_bar += 1

CH = {  # бас, голоса электропиано
    "A7sus": ("A1", [55, 59, 62, 64]), "Dmaj9": ("D2", [54, 57, 61, 64]), "F#m7": ("F#2", [52, 57, 61, 64]),
    "Gmaj7": ("G2", [54, 59, 62, 66]), "A9": ("A2", [55, 59, 61, 64]), "Bm9": ("B1", [50, 54, 57, 61]),
    "Em9": ("E2", [50, 54, 55, 59]), "F#7b9": ("F#2", [52, 55, 58, 61]), "A6": ("A2", [54, 57, 61, 64]),
    "Bm7": ("B1", [54, 57, 59, 62]), "A/C#": ("C#2", [52, 57, 61, 64]), "Em7": ("E2", [50, 55, 59, 62]),
}
MEL = {
    "A1": [(0, "F#5", 1), (1.5, "A5", .5), (2, "C#6", 1), (3, "B5", .5), (3.5, "A5", .5)],
    "A2": [(0, "B5", 1), (1, "A5", .5), (1.5, "F#5", .5), (2, "E5", 1.5), (3.5, "C#5", .5)],
    "D1": [(.5, "F#5", 1), (2, "D5", .5), (2.5, "C#5", 1.5)],
    "D2": [(.5, "G5", 1), (2, "F#5", .5), (2.5, "D5", 1.5)],
    "D3": [(0, "B4", 1), (2, "A#4", 1), (3, "C#5", 1)],
    "R1": [(0, "D5", .5), (.5, "F#5", .5), (1, "B5", 1), (2, "C#5", .5), (2.5, "E5", .5), (3, "A5", 1)],
    "R2": [(0, "F#5", .5), (.5, "B5", .5), (1, "D6", 1), (2, "E5", .5), (2.5, "A5", .5), (3, "C#6", 1)],
    "R3": [(0, "F#5", .5), (.5, "A5", .5), (1, "E6", 1), (2, "G5", .5), (2.5, "B5", .5), (3, "D6", 1)],
    "F": [(0, "D6", .5), (.5, "B5", .5), (1, "A5", .5), (1.5, "F#5", .5), (2, "E5", .5), (2.5, "G5", .5),
          (3, "A5", .5), (3.5, "C#6", .5)],
    "Z": [(0, "D6", 3), (0, "A5", 3)],
}
INTRO_MEL = [(-6, "A4", .5), (-5.5, "D5", .5), (-5, "F#5", .5), (-4.5, "A5", 1), (-3, "B5", .5),
             (-2.5, "A5", .5), (-2, "F#5", .5), (-1.5, "E5", .5), (-1, "F#5", .5), (-.5, "A5", .5)]

PLAN = []  # (bar, section, (chord1, chord2), melody)
A_CYC = [(("Dmaj9", "F#m7"), "A1"), (("Gmaj7", "A9"), "A2")]
D_CYC = [(("Bm9", "Bm9"), "D1"), (("Em9", "Em9"), "D2"), (("Gmaj7", "F#7b9"), "D3")]
R_SEQ = [(("Gmaj7", "A6"), "R1"), (("Bm7", "A/C#"), "R2"), (("Dmaj9", "Em7"), "R3")]
for b in range(first_bar, dark_bar):
    ch, me = A_CYC[(b - first_bar) % 2]
    PLAN.append((b, "intro" if b < 0 else "A", ch, me))
nd = rise_bar - dark_bar
for k in range(nd):
    ch, me = D_CYC[2 if k == nd - 1 else k % 2]
    PLAN.append((dark_bar + k, "D", ch, me))
nr = fin_bar - rise_bar
for k in range(nr):
    ch, me = R_SEQ[max(0, 3 - nr + k) % 3]
    PLAN.append((rise_bar + k, "R", ch, me))
for b in range(fin_bar, end_bar):
    PLAN.append((b, "F", ("Gmaj7", "A9") if (end_bar - b) % 2 == 1 else ("Dmaj9", "Bm7"), "F"))
PLAN.append((end_bar, "Z", ("Dmaj9", None), "Z"))

SWING = 0.16  # доля 16-й, на которую опаздывают слабые 16-е
step_t = lambda bar, s: bt(bar, s / 4 + (SWING / 4 if s % 2 else 0))

# ---------- раскладка ----------
for b, sec, (c1, c2), me in PLAN:
    t0 = bt(b)
    # барабаны
    if sec in ("intro", "A", "F"):
        kicks, snares = [0, 7, 10], [4, 12]
        hats = list(range(16)) if sec in ("intro", "F") else list(range(0, 16, 2)) + [11, 15]
    elif sec == "D":
        kicks, snares, hats = [0, 10], [8], [0, 4, 8, 12]
    elif sec == "R":
        k = b - rise_bar
        kicks, snares = ([0, 10], [4, 12]) if k == 0 else ([0, 7, 10], [4, 12])
        hats = list(range(0, 16, 2)) if k == 0 else list(range(0, 16, 2)) + [3, 7, 11, 15]
        if b == fin_bar - 1:
            snares = [4, 12, 13, 14, 15]
            hats = [h for h in hats if h < 12]
    else:  # Z — удар и тишина
        kicks, snares, hats = [0], [], []
    for s in kicks:
        if step_t(b, s) >= -0.01:
            put(BUS["drm"], max(step_t(b, s), 0), kick(1.0 if s == 0 else 0.8 if sec != "D" else 0.6))
    for s in snares:
        if step_t(b, s) >= 0:
            v = 1.0 if s in (4, 8, 12) else 0.45 + 0.12 * (s - 12)
            put(BUS["drm"], step_t(b, s), snare(v * (0.8 if sec == "D" else 1.0)), pan=0.05)
    for s in hats:
        if step_t(b, s) >= 0:
            v = (1.0 if s % 4 == 2 else 0.75 if s % 2 == 0 else 0.5) * (0.6 if sec == "D" else 1.0)
            put(BUS["drm"], step_t(b, s), hat(v, open_=(sec == "F" and s == 14)), pan=0.3)
    if sec == "Z":
        put(BUS["drm"], t0, hat(0.7, open_=True), pan=0.3)
    # аккорды и бас
    for h, c in enumerate((c1, c2)):
        if c is None:
            continue
        th = t0 + 2 * h * BEAT
        if th < -1e-3:
            continue
        bnote, voic = CH[c]
        if sec == "Z":
            for m in voic + [69]:
                put(BUS["ep"], th, epiano(m, 2.6, 1.0), pan=(m - 60) / 40)
            put(BUS["bass"], th, bassnote(bnote, 2.2, 1.0))
            put(BUS["bass"], th, bassnote(midi(bnote) - 12, 2.2, 0.5))
            continue
        long_ = 1.4 * BEAT if sec != "D" else 1.9 * BEAT
        vv = 0.8 if sec == "D" else 1.0
        bright = 0.7 if sec == "D" else 1.0
        if c1 == c2 and h == 1 and sec == "D":
            pass  # минорный аккорд держится весь такт — второй удар не нужен
        else:
            for m in voic:
                put(BUS["ep"], th, epiano(m, long_ if not (sec == "D" and c1 == c2) else 3.8 * BEAT, vv, bright),
                    pan=(m - 60) / 40)
        if sec != "D":
            for m in voic[1:]:
                put(BUS["ep"], th + 1.5 * BEAT + SWING * BEAT / 4, epiano(m, 0.35 * BEAT, 0.55), pan=(m - 60) / 40)
        # бас: корень на 1, повтор на «и» второй доли, подход к следующему аккорду
        put(BUS["bass"], th, bassnote(bnote, 0.9 * BEAT, 1.0))
        if sec != "D":
            put(BUS["bass"], th + 1.5 * BEAT + SWING * BEAT / 4, bassnote(bnote, 0.4 * BEAT, 0.7))
        else:
            put(BUS["bass"], th + 1.0 * BEAT, bassnote(bnote, 2.6 * BEAT if c1 == c2 else 0.8 * BEAT, 0.7))
    # напев
    for beat, m, d in MEL[me]:
        tn = bt(b, beat)
        if tn >= 0:
            put(BUS["mel"], tn, epiano(midi(m), d * BEAT * 0.95, 0.9 if sec != "D" else 0.7, 1.3),
                pan=0.15 * np.sin(beat))
# вступление: затакт A7sus и разбег напева
for beat, m, d in INTRO_MEL:
    tn = bt(0, beat)
    if tn >= 0:
        put(BUS["mel"], tn, epiano(midi(m), d * BEAT * 0.95, 0.9, 1.3), pan=0.1)
pk_bar_t = bt(first_bar)
if pk_bar_t < 0:  # первый такт неполный — его первую половину занимает A7sus, если влезает
    th = bt(first_bar, 2)
    if th >= -0.01:
        th = max(th, 0)
        for m in CH["A7sus"][1]:
            put(BUS["ep"], th, epiano(m, 1.6 * BEAT), pan=(m - 60) / 40)
        put(BUS["bass"], th, bassnote("A1", 1.6 * BEAT))

# реверберация на электропиано и напеве, «комната» на барабанах
IR = make_ir(1.4, 1.6, 7)
IRs = make_ir(0.5, 0.6, 8)
for k, send, ir in (("ep", 0.35, IR), ("mel", 0.45, IR), ("drm", 0.18, IRs)):
    BUS[k] = BUS[k] + send * np.vstack([convolve(BUS[k][0], ir), convolve(BUS[k][1], np.roll(ir, 37))])
# конец: мягкое затухание последних 2,2 с
fade = np.ones(N)
nf = int(2.2 * SR)
fade[-nf:] = np.cos(np.linspace(0, np.pi / 2, nf)) ** 2
for k in BUS:
    BUS[k] *= fade
fi = int(0.03 * SR)
for k in BUS:
    BUS[k][:, :fi] *= np.linspace(0, 1, fi)

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

# активность голоса → напев под голосом тише
fr_ = int(0.02 * SR)
env = np.sqrt(np.convolve(VOICE ** 2, np.ones(fr_) / fr_, mode="same"))
act = (env > V_MEAN * db(-20)).astype(float)
blk = 44  # сглаживание блоками по 1 мс: вперёд (атака 40 мс, спад 250 мс) и назад (напев притихает до слова)
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
BUS["mel"] *= 1 - act_s * (1 - db(MEL_DUCK_DB))

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
fin_win = (E(NL) + 0.5, TOTAL - 2.4)
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
ATT = 0.03  # атака пшика


def k100(x):
    n = int(0.1 * SR)
    p = np.convolve(x ** 2, np.ones(n) / n, mode="same")
    return np.sqrt(p.max()), int(np.argmax(p))


def place(name, what, t_event, x, pan=0.0, target=None, onset=False):
    """x моно; пик (самое громкое окно 100 мс) ставим на t_event + кадр; onset=True — на кадр позже события
    кончается атака (для длинных пшиков, у которых нет одного пика)"""
    lvl, ipk = k100(x)
    g = V_MEAN * db(SFX_DB[name] if target is None else target) / lvl
    start = t_event + FRAME - (ATT if onset else ipk / SR)
    put(SFX, max(start, 0.0), x[max(0, int(-start * SR)):] * g, pan=pan)
    SFX_LOG.append({"name": name, "what": what, "event": round(t_event, 3), "start": round(max(start, 0), 3),
                    "end": round(start + len(x) / SR, 3), "db_to_voice": SFX_DB[name] if target is None else target})


def rattle(k=2, gap=0.05):
    """стук шарика: k металлических щелчков (резонансы банки), всего ≈0,1 с"""
    n = int((gap * (k - 1) + 0.06) * SR)
    x = np.zeros(n)
    for j in range(k):
        i0 = int(j * gap * SR + rng.uniform(-0.004, 0.004) * SR)
        m = int(0.05 * SR)
        t = t_(m)
        cl = rng.standard_normal(m) * np.exp(-t / 0.003)
        for f, a, d in ((2600, 1.0, 0.012), (4150, 0.7, 0.009), (6300, 0.5, 0.006), (900, 0.6, 0.02)):
            cl += a * np.sin(2 * np.pi * f * (1 + rng.uniform(-0.03, 0.03)) * t) * np.exp(-t / d)
        x[max(i0, 0):max(i0, 0) + m] += cl[: n - max(i0, 0)] * (1 if j % 2 == 0 else 0.75)
    return fftf(x, hp(500))


def spray(dur, fc=5500, bw=0.9, flutter=0.12, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = t_(n)
    x = fftf(r.standard_normal(n), band(fc, bw))
    e = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.12) ** 1.5
    fl = fftf(r.standard_normal(n), lp(14))
    e *= 1 + flutter * fl / (np.std(fl) + 1e-9)
    return x * np.clip(e, 0, None)


knocks = [("стук-тряска на заставке", 0.05), ("", 0.20), ("", 0.35),
          ("баллончик перед строкой 1", L(1) - 0.3), ("баллончик перед строкой 2", L(2) - 0.3),
          ("баллончики перед строкой 7 (закат)", L(7) - 0.5), ("баллончики: море", KW["more"] - 0.95),
          ("баллончик к финальному названию", FIN - 0.3)]
for i, (what, tk) in enumerate(knocks):
    place("rattle", what or "стук-тряска на заставке", tk, rattle(2, 0.045), pan=0.25 - 0.1 * i)
# пшик после каждого стука (на заставке — 0,6–1,2 с)
sprays = [("пшик: буквы названия", 0.6, 0.6), ("пшик: веточка", L(1) - 0.3 + 0.12, 0.8),
          ("пшик: солнце", L(2) - 0.3 + 0.12, 0.9), ("пшик: закат (два баллончика)", L(7) - 0.1, 0.9),
          ("пшик: солнце над морем", L(7) + 0.65, 0.45), ("пшик: море (два баллончика)", KW["more"] - 0.8, 0.95),
          ("пшик: гребни волн", KW["more"] + 0.05, 0.45), ("пшик: остров и пальма", L(8) - 0.85, 0.55),
          ("пшик: название", FIN - 0.3 + 0.12, 1.2)]
for i, (what, ts, d) in enumerate(sprays):
    x = spray(d, fc=5200 + 300 * i, seed=10 + i)
    place("spray", what, ts, x, pan=-0.2 + 0.1 * i, onset=True)
# широкий серый баллон на L3 ≈1,5 с: ниже и шире, полоса «едет» поперёк стены
gray = stft_var(np.random.default_rng(31).standard_normal(int(1.5 * SR)),
                lambda tc, f: band(3200 + 900 * np.sin(np.pi * tc / 1.5), 1.4)(f))
tg = t_(len(gray))
gray *= np.minimum(1, tg / 0.08) * np.minimum(1, (1.5 - tg) / 0.25)
place("gray", "широкий серый баллон: туман", L(3), gray, pan=-0.3, onset=True)
# лёгкий порыв ветра на L4 (туча дует)
dw = 1.8
wind = stft_var(np.random.default_rng(41).standard_normal(int(dw * SR)),
                lambda tc, f: band(380 + 520 * np.exp(-((tc - 0.45) / 0.35) ** 2), 1.0)(f))
tw = t_(len(wind))
wind *= np.exp(-((tw - 0.45) / 0.3) ** 2) * (tw < 0.45) + np.exp(-(tw - 0.45) / 0.45) * (tw >= 0.45)
place("wind", "порыв ветра: туча дует", L(4), wind, pan=0.4)
# три быстрых взмаха крыльев на ptichka + 0,5
ttk = KW["ptichka"] + 0.5
wn = int(0.42 * SR)
wings = np.zeros(wn)
for j, (dt, a) in enumerate(((0.0, 1.0), (0.13, 0.85), (0.26, 0.75))):
    m = int(0.11 * SR)
    t = t_(m)
    burst = fftf(rng.standard_normal(m), lambda f: band(900, 1.2)(f) + 0.3 * band(2600, 0.7)(f))
    burst *= np.sin(np.pi * t / 0.11) ** 2 * (1 + 0.6 * np.sin(np.pi * t / 0.11))
    i0 = int(dt * SR)
    wings[i0:i0 + m] += a * burst[: wn - i0]
gw = V_MEAN * db(SFX_DB["wings"]) / k100(wings)[0]
st = ttk + FRAME - int(0.055 * SR) / SR
put(SFX, st, wings * gw, pan=0.2)
SFX_LOG.append({"name": "wings", "what": "взлёт птички: три взмаха", "event": round(ttk, 3), "start": round(st, 3),
                "end": round(st + wn / SR, 3), "db_to_voice": SFX_DB["wings"]})
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
    "bars": {"first": first_bar, "dark": dark_bar, "rise": rise_bar, "finale": fin_bar, "end_hit": end_bar,
             "end_hit_t": round(bt(end_bar), 3)},
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
