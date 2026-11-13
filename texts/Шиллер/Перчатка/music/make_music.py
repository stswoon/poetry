#!/usr/bin/env python3
"""Музыка и шумы к балладе Ф. Шиллера «Перчатка» (перевод В. А. Жуковского), стиль «файтинг-аркада».

Партия в аркадный файтинг «Королевский зверинец». Своя музыка в духе файтингов 90-х: драм-машина (бочка, малый,
хэт, томы), синт-бас пульсом, синт-медь стабами, квадратное арпеджио, пэд, ~138 BPM. Мелодии и аранжировка свои.
  0 … L1        заставка: (монетка и удар логотипа — шумы) оркестровый удар и фанфара аттракт-режима, ре минор,
                ~132 BPM, сбивка томами, на сильную долю перед голосом вступает грув двора;
  строки 1–9    двор: ровный «королевский» грув (Dm Bb Gm A Dm C Bb A), с 5-й строки плотнее (арпеджио, шейкер),
                в паузе 8|9 — лик меди, к «знак» — дробь;
  ROUND 1       («знак») — напряжение на педали ре: томы, бас, тёмный пэд, к «Выходит» — дробь и шумовой подъём,
                стоп на шестнадцатую перед FIGHT;
  FIGHT 1       («Выходит») — бой: бочка, малый на 2 и 4, хэт шестнадцатыми, бас октавами, медь на слабые доли,
                арпеджио; каждая четвёртая — сбивка;
  лень льва     («зевнул») — пульс разрежается: бас половинками, бочка на раз; после «лёг» — бас целыми и сонная
                челеста;
  ROUND 2       («махнул») — ми минор, напряжение; FIGHT 2 («прянул») — тигр, бас шестнадцатыми;
                «крадётся» — крадущийся грув без малого (короткий бас, римшот, щипок); «ложится» — стоп, пэд «ничьей»;
  ROUND 3       фа-диез минор; «2 VS 1» — самый плотный бой; на рык льва — обрыв на две доли (тарелка и низ),
                потом тяжёлый half-time; «смирились» — грув редеет до педали;
  «гости ждут»  тик-так (вуд-блок) и пульс на ля, крещендо; «Вдруг» — остановка ленты и тишина;
  «сорвалася»   звон замедления: колокола со спадом высоты, высокий пэд, низкий гул, обратная тарелка к приземлению;
  «упала»+0,3   тема красавицы: ре минор с хроматической линией (Dm DmM7 Dm7 Dm6 Bb Gm Em7b5 A7), челеста,
                щелчок, щипковый бас; «возвратишь» — пэд A7 и дробь;
  строки 47–52  бонусный раунд: сердцебиение баса, тремоло-пэд, тиканье хэта; «+1» — до мажор, FLAWLESS — ре мажор;
                «от страха» — ре минор, тремоло;
  строки 53–55  марш к балкону (Dm Bb C A), дробь и подъём к «Рукоплесканьем»;
  PERFECT       ре мажор, полный грув и медь, со строки 57 — «сладкие взгляды» (челеста, мягкий грув);
  «холодно»     всё стихает: ледяной звон, высокий пэд, редкие льдинки, обратная тарелка к броску;
  K.O.          музыка обрывается; после эха — тихая педаль ля (Asus4 → A на «награды»);
  ПОБЕДИТЕЛЬ    победный джингл (ре мажор), затем финальная тема — фанфара заставки в мажоре — громче, затухание.
Под голосом музыка на UNDER_DB к голосу (RMS по каждой строке, внутри строки громкость постоянна, переходы — в паузах);
на заставке, в паузах 8|9, 36|37, 46|47 и в финале громче. Зоны «замедление» (строки 38–40), «холод» (до K.O.) и
«после K.O.» — нарочно тише (STOP_DB, COLD_DB, POSTKO_DB).
Шумы — синтез, только с причиной в кадре, пик на кадр позже события, все ниже голоса (список — sfx.json).

Запуск: python3 make_music.py [V0] [OUTRO]        (по умолчанию из events.json: 4.0 и 7.5; можно --v0=4 --outro=7.5)
Читает events.json (пишет ../video/build.py), ../timings.json (длина голоса, проверка событий), ../voice.mp3 (через
ffmpeg — для уровней). При другом V0 сдвигает события; если events.json не совпадает с timings.json — берёт события
из ../video/build.py. Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json.
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
LINE_DB = {20: -0.8, 25: -0.4, 26: -0.4, 27: -0.4, 28: -0.4, **{n: 0.6 for n in range(47, 53)}}
INTRO_DB, VICT_DB, FIN_DB = -7.0, -8.0, -6.0          # заставка, победный джингл, финальная тема
GAP_DB = {8: -13.0, 14: -14.0, 28: -15.0, 36: -16.0, 46: -16.0}   # паузы между строками (номер строки перед паузой)
STOP_DB = -24.0     # звон замедления под строками 38–40
COLD_DB = -23.0     # холод Делоржа до K.O.
POSTKO_DB = -27.0   # после K.O. до джингла
# шумы: K-взвешенная (BS.1770) громкость в своём окне, дБ к голосу в местах речи
SFX_DB = {
    "coin_fall": -17, "coin_slot": -9, "logo_hit": -5, "round": -10, "gate_lion": -12, "fight": -10, "yawn": -13,
    "lie": -15, "snore": -22, "bolt": -10, "jump_whoosh": -15, "land": -13, "land_soft": -18, "roar_tiger": -11,
    "tail": -15, "draw": -13, "gate_bars": -13, "vs": -11, "bars_whoosh": -15, "hit": -9, "roar_lion": -10,
    "glove_fall": -18, "glove_land": -13, "quest": -11, "pickup": -11, "flawless": -10, "applause": -16, "perfect": -10,
    "throw": -15, "ko": -7, "blip": -18, "confirm": -12,
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
ap = argparse.ArgumentParser(description="музыка и шумы к «Перчатке»")
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
b0 = 60 / 138                                   # доля боя
LOGO = 0.62                                      # логотип врезается (пружина от 0,6 садится ≈0,06 с)
IA = LOGO + FRAME                                # удар заставки
bi = float(np.clip((L(1) - 0.15 - IA) / 8, 0.40, 0.48))   # доля заставки и двора: 8 долей до грува
C0 = IA + 8 * bi                                 # грув двора (сильная доля перед голосом)
R1, F1 = W("w_znak"), W("w_vyh")
Z1, LEG = W("w_zevn"), W("w_leg")
R2, F2 = W("w_mahn2"), W("w_pryan")
SN2, D1 = W("w_krad"), W("w_lozh")
R3, F3 = W("w_mahn3"), W("w_pryzh") - 0.1
HITP = W("w_lapoy") + 0.05
RYK = W("w_ryk")
CALM3, OTOSH, D2 = W("w_smir"), W("w_otosh"), W("w_legli")
WAIT0 = D2 + 0.3
STOP = W("w_vdrug")
TS_D, TS_SRC = 0.5, 0.25                         # остановка ленты: длина и сколько исходника «съедает»
SLOW0, SLOW1 = W("w_sorv"), W("w_upala") + 0.3
LAND = max(W("w_upala") + 0.05, W("w_sorv") + 1.15)          # перчатка в песке (GF1)
QUEST = W("w_vozvr") + 0.1
HB0, HB1 = L(47), E(50)
KP = max(W("w_beret") - 0.1, W("w_delorzh") - 0.05 + 2.45 + 1.6)   # Делорж берёт перчатку
FLAW = W("w_sobr") - 0.05
PERF = W("w_rukopl")
MARCH0 = PERF + FRAME - 16 * b0                  # марш к балкону: 4 такта до PERFECT
COLD = W("w_holod")
THROW = W("w_brosil") - 0.02
KO = W("w_brosil") + 0.30                        # перчатка долетела: K.O.
VIC = E(NL) + 0.5                                # «ПОБЕДИТЕЛЬ: ДЕЛОРЖ»
VIC_T = VIC + 0.05                               # надпись садится на пружине
FT0 = FIN + 0.31                                 # финальный титр садится (пружина от fin + 0,25)
TJ0, TJ1 = W("w_pryan") - 0.18, W("w_pryan") + 0.52   # прыжок тигра
BJ = [W("w_ochut") + 0.35, W("w_ochut") + 0.5]          # барсы приземляются
_order = [IA, C0, R1, F1, Z1, LEG, R2, F2, SN2, D1, R3, F3, HITP, RYK, CALM3, OTOSH, D2, WAIT0, STOP, SLOW0, LAND, SLOW1,
          QUEST, HB0, KP, FLAW, HB1, MARCH0, PERF, COLD, THROW, KO, VIC, FIN, FT0]
assert all(a < b for a, b in zip(_order, _order[1:])), "события не по порядку: " + str([r3(x) for x in _order])
assert C0 < L(1) and STOP + TS_D < SLOW0 and FT0 + 6 * b0 < TOTAL - 1.5, "не хватает места"
MARK = {}


def mark(k, v):
    MARK[k] = r3(v)


rng = np.random.default_rng(1797)
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


CH = {"Dm": (2, [0, 3, 7]), "Bb": (10, [0, 4, 7]), "Gm": (7, [0, 3, 7]), "A": (9, [0, 4, 7]), "A7": (9, [0, 4, 7, 10]),
      "C": (0, [0, 4, 7]), "Em": (4, [0, 3, 7]), "D": (2, [0, 4, 7]), "Am": (9, [0, 3, 7]), "B": (11, [0, 4, 7]),
      "G": (7, [0, 4, 7]), "F#m": (6, [0, 3, 7]), "E": (4, [0, 4, 7]), "Bm": (11, [0, 3, 7]),
      "DmM7": (2, [0, 3, 7, 11]), "Dm7": (2, [0, 3, 7, 10]), "Dm6": (2, [0, 3, 7, 9]), "Em7b5": (4, [0, 3, 6, 10]),
      "Dmadd9": (2, [0, 3, 7, 14]), "Bbadd9": (10, [0, 4, 7, 14]), "Emadd9": (4, [0, 3, 7, 14]), "Asus4": (9, [0, 5, 7]),
      "D69": (2, [0, 4, 7, 9, 14])}


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


def bar(tb, bt, name, P, t0, t1, mute=None):
    st = bt / 4
    vs = P.get("vs", 1.0)

    def ok(t):
        return t0 - 1e-4 <= t < t1 - 0.01 and not (mute is not None and mute(t))

    rt = root(name, P.get("bass_lo", 31))
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
            m = rt + {"R": 0, "r": 0, "O": 12, "o": 12, "F": 7, "f": 7, "L": 0}[ch]
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


PAD_DARK = dict(vel=0.32, lo=50, fc=800, att=0.4, rel=0.15, det=(-12, 0, 11))

# ---------- заставка: удар логотипа и фанфара ----------
INTRO_HOOK = [(0, .5, 74), (.5, .25, 74), (.75, .75, 77), (1.5, .5, 81), (2, .5, 82), (2.5, .5, 81), (3, .5, 79), (3.5, .5, 76),
              (4, .75, 77), (4.75, .75, 74), (5.5, .5, 69), (6, 1.4, 73), (7.5, .45, 69)]
INTRO_CH = [(0, "Dm", 2), (2, "Bb", 1), (3, "C", 1), (4, "Dm", 1), (5, "Gm", 1), (6, "A", 2)]
put2("main", IA, orch_hit(50, True, 1.3, 0.35), 0.25, 0.55)
d_crash(IA, 0.7, 1.2)
for b_, d, m in INTRO_HOOK:
    p_lead(IA + b_ * bi, m, d * bi * 0.92, 0.62)
    p_brass(IA + b_ * bi, m - 12, d * bi * 0.9, 0.38, 0.0)
for b_, name, d in INTRO_CH:
    t = IA + b_ * bi
    pad_chord(t, name, d * bi, 0.4, 55, 4, fc=2200, att=0.05, rel=0.3)
    stab(t, name, 57, 4, 0.12, 0.55)
    if b_ < 6:
        for k in range(int(round(d * 2))):
            p_bass(t + k * bi / 2, root(name) + 12 * (k % 2), bi / 2 * 0.85, 0.85 if k % 2 == 0 else 0.65)
put2("main", IA + 6 * bi, orch_hit(45, False, 1.2, 0.3), 0.25, 0.4)
p_bass(IA + 6 * bi, root("A"), 1.4 * bi, 0.9)
p_bass(IA + 7.5 * bi, root("A") + 12, 0.4 * bi, 0.7)
for b_ in (0, 1.5, 2, 3.5, 4, 5.5, 6):
    d_kick(IA + b_ * bi, 0.95)
for b_ in (1, 3, 5, 6):
    d_snare(IA + b_ * bi, 0.75)
for k in range(12):
    d_hat(IA + k * bi / 2, 0.55 if k % 2 else 0.35)
d_crash(IA + 6 * bi, 0.6, 1.0)
for k, m in enumerate((50, 47, 43, 40)):
    d_tom(IA + (7 + 0.25 * k) * bi, 0.6 + 0.08 * k, m)
mark("intro", IA)
mark("intro_hit_A", IA + 6 * bi)

# ---------- двор: строки 1–9 ----------
COURT_CH = ["Dm", "Bb", "Gm", "A", "Dm", "C", "Bb", "A"]
P_COURT_A = dict(kick="x.......x.......", snare="........o.......", hat="o.o.o.o.o.o.o.o.", bass="R.r.o.r.R.r.o.r.",
                 stab="s...............", stab_v=0.8, pad=dict(vel=0.3, lo=55, fc=1400))
P_COURT_B = dict(kick="x.....x.x.......", snare="....o.......o...", hat="o.x.o.x.o.x.o.x.", shk="..o...o...o...o.",
                 bass="R.r.o.r.R.r.o.rO", arp="a.a.a.a.a.a.a.a.", arp_seq="updown", arp_lo=62, arp_n=5, arp_v=0.8,
                 stab="s.......s.......", stab_v=0.7, pad=dict(vel=0.28, lo=55, fc=1500))
section(C0, R1 - 0.01, bi, lambda i, j, kk, tb: (COURT_CH[kk % 8], P_COURT_A if tb < L(5) - 0.5 else P_COURT_B))
snare_roll(grid_ceil(R1 - 2 * bi, C0, bi / 4), R1 - 0.02, bi / 4, 0.15, 0.55)
# лик меди в паузе 8|9
st_ = bi / 4
tl = grid_ceil(E(8) + 0.04, C0, st_)
name = COURT_CH[int(np.floor((tl - C0) / (4 * bi) + 1e-6)) % 8]
tones = chord(name, 67, 4)
for j, m in enumerate(tones):
    tj = tl + j * st_
    if tj > L(9) - 0.15:
        break
    d = st_ * 0.9 if j < len(tones) - 1 else max(st_, L(9) - 0.12 - tj)
    p_lead(tj, m, d, 0.55)
    p_brass(tj, m - 12, d, 0.35, 0.0)
mark("court", C0)
mark("court_lick", tl)


# ---------- раунды ----------
def pre(R, F, key, tom_m):
    """ROUND: напряжение до FIGHT, сетка с опорой на FIGHT; стоп на шестнадцатую перед ним"""
    fa = F + FRAME
    end = fa - b0 / 4

    def fn(i, j, kk, tb):
        if j >= 2:
            P = dict(tom="x.......x.......", tom_m=tom_m, bass="L---------------", bass_v=0.8, pad=PAD_DARK)
        elif j == 1:
            P = dict(kick="x.......x.......", tom="x...x...x...x...", tom_m=tom_m, hat="o.o.o.o.o.o.o.o.",
                     bass="r.r.r.r.r.r.r.r.", bass_short=True, pad=PAD_DARK)
        else:
            P = dict(kick="x...x...x...x...", hat="xoxoxoxoxoxoxoxo", bass="r.r.r.r.rrrrrrrr", bass_short=True, pad=PAD_DARK)
        return key, P

    section(R + 0.12, end, b0, fn, anchor=fa)
    snare_roll(max(fa - 4 * b0, grid_ceil(R + 0.3, fa, b0 / 4)), end, b0 / 4, 0.15, 0.75)
    riser(max(R + 0.3, fa - 8 * b0), end + 0.01, 0.12)


def fight_fn(chs, P, Pfill, crash_first=True):
    def fn(i, j, kk, tb):
        Q = dict(P if kk % 4 != 3 else Pfill)
        if kk == 0 and crash_first:
            Q["crash"] = 0.7
        return chs[kk % len(chs)], Q
    return fn


P_FIGHT1 = dict(kick="X.....x.X.....x.", snare="....X.......X...", hat="xoxoxoxoxoxoxoxo", ohat="..............o.",
                bass="R.O.r.O.R.O.r.O.", stab="......S.......s.", stab_v=0.85, arp="aaaaaaaaaaaaaaaa", arp_v=0.6, arp_lo=62,
                arp_n=7, arp_seq="updown", pad=dict(vel=0.2, lo=57, fc=1800, att=0.1, rel=0.3))
P_FIGHT1F = dict(P_FIGHT1, snare="....X.......XoXx", kick="X.....x.X.....xx")
# ROUND 1 → FIGHT 1 (лев), ре минор
pre(R1, F1, "Dm", 50)
section(F1 + FRAME, Z1, b0, fight_fn(["Dm", "Dm", "Bb", "C", "Dm", "Dm", "Gm", "A"], P_FIGHT1, P_FIGHT1F), anchor=F1 + FRAME)
mark("round1", R1)
mark("fight1", F1 + FRAME)
# лень льва: пульс разрежается
LAZY_CH = ["Dm", "Gm", "Dm", "A"]
P_LAZY1 = dict(kick="x.......o.......", hat="o.......o.......", bass="R-------r-------", pad=dict(vel=0.3, lo=55, fc=1200))
P_LAZY2 = dict(kick="o...............", bass="R---------------", bass_v=0.8, pad=dict(vel=0.3, lo=55, fc=1000),
               arp="a.......a.......", arp_v=0.8, arp_lo=69, arp_n=4, arp_inst="bell", bell_tau=1.0)
section(Z1, LEG + 0.2, b0, lambda i, j, kk, tb: (LAZY_CH[kk % 4], P_LAZY1), anchor=Z1)
section(LEG + 0.2, R2 - 0.01, b0, lambda i, j, kk, tb: (LAZY_CH[kk % 4], P_LAZY2), anchor=Z1)
mark("lazy", Z1)
mark("sleep", LEG + 0.2)

# ROUND 2 → FIGHT 2 (тигр), ми минор
P_FIGHT2 = dict(kick="X.....x.X..x..x.", snare="....X.......X..o", hat="xxoxxxoxxxoxxxox", bass="RrO.rRO.RrO.rRO.",
                stab="S.....S.....s...", stab_v=0.8, arp="aaaaaaaaaaaaaaaa", arp_v=0.6, arp_lo=64, arp_n=7,
                pad=dict(vel=0.2, lo=57, fc=1800, att=0.1, rel=0.3))
P_FIGHT2F = dict(P_FIGHT2, snare="....X.......XXXX")
pre(R2, F2, "Em", 52)
section(F2 + FRAME, SN2, b0, fight_fn(["Em", "Em", "C", "D"], P_FIGHT2, P_FIGHT2F), anchor=F2 + FRAME)
P_SNEAK = dict(kick="x.........x.....", rim="....o.......o...", hat="..o...o...o...o.", bass="r..r..r.r..r..r.", bass_short=True,
               arp="a...a...a...a...", arp_lo=52, arp_n=4, arp_v=1.0, pad=dict(vel=0.22, lo=52, fc=900))
section(SN2, D1, b0, lambda i, j, kk, tb: (["Em", "C", "Am", "B"][kk % 4], P_SNEAK), anchor=SN2)
P_DRAW = dict(bass="R---------------", bass_v=0.7, pad=dict(vel=0.32, lo=55, fc=1500, att=0.4),
              arp="a.......a.......", arp_inst="bell", arp_lo=71, arp_v=0.7)
section(D1 + FRAME, R3 - 0.01, b0, lambda i, j, kk, tb: ("Emadd9", P_DRAW))
mark("round2", R2)
mark("fight2", F2 + FRAME)
mark("sneak", SN2)
mark("draw1", D1)

# ROUND 3 → FIGHT 3 (барсы, «2 VS 1»), фа-диез минор; на рык льва — обрыв
CH3 = ["F#m", "F#m", "D", "E"]
P_FIGHT3 = dict(kick="X.x...x.X.x...x.", snare="....X.......X...", hat="XoxoXoxoXoxoXoxo", ohat="......o.......o.",
                bass="RrOrRrOrRrOrRrOr", stab="S..S..S...S..S..", stab_v=0.75, arp="aaaaaaaaaaaaaaaa", arp_v=0.6, arp_lo=61,
                arp_n=7, pad=dict(vel=0.2, lo=57, fc=1900, att=0.1, rel=0.3))
P_FIGHT3F = dict(P_FIGHT3, snare="....X.......XoXX")
P_HEAVY3 = dict(kick="X.......X.......", snare="........X.......", hat="x.x.x.x.x.x.x.x.", bass="L-------r-------",
                stab="S...............", pad=dict(vel=0.24, lo=57, fc=1500, att=0.1, rel=0.3))
pre(R3, F3, "F#m", 54)
section(F3 + FRAME, RYK - 0.03, b0, fight_fn(CH3, P_FIGHT3, P_FIGHT3F), anchor=F3 + FRAME)
d_crash(RYK + FRAME, 0.8, 1.5)
p_bass(RYK + FRAME, root("F#m"), 2 * b0, 1.0, 0.7)
section(RYK + 2 * b0, CALM3, b0, lambda i, j, kk, tb: (CH3[kk % 4], P_HEAVY3), anchor=F3 + FRAME)
CALM_CH = ["F#m", "D", "E", "A"]
P_MED3 = dict(kick="x.......x.......", hat="o.o.o.o.o.o.o.o.", bass="r.r.r.r.r.r.r.r.", bass_v=0.8, pad=dict(vel=0.28, lo=55, fc=1300))
P_SPARSE3 = dict(bass="R---------------", bass_v=0.7, hat="o...o...o...o...", pad=dict(vel=0.3, lo=55, fc=1100))
section(CALM3, OTOSH, b0, lambda i, j, kk, tb: (CALM_CH[kk % 4], P_MED3), anchor=CALM3)
section(OTOSH, D2, b0, lambda i, j, kk, tb: (CALM_CH[kk % 4], P_SPARSE3), anchor=CALM3)
mark("round3", R3)
mark("fight3", F3 + FRAME)
mark("roar_break", RYK + FRAME)
mark("calm3", CALM3)

# «И гости ждут…»: тик-так и пульс на ля, крещендо; на «Вдруг» — остановка ленты
P_WAIT = dict(wood="X...o...X...o...", kick="o.......o.......", bass="r.r.r.r.r.r.r.r.", bass_short=True,
              pad=dict(vel=0.3, lo=52, fc=1000, att=0.5, rel=0.2))


def wait_fn(i, j, kk, tb):
    P = dict(P_WAIT)
    P["vs"] = 0.6 + 0.4 * float(np.clip((tb - WAIT0) / (STOP - WAIT0), 0, 1))
    return ["Asus4", "A"][kk % 2], P


section(WAIT0, R_TS, b0, wait_fn, anchor=WAIT0)
mark("wait", WAIT0)
mark("tape_stop", STOP)

# звон замедления: перчатка падает
SL = SLOW1 - SLOW0
fade_sl = lambda x, d: x * np.clip((d - tt(len(x))) / 0.45, 0, 1)
for j, m in enumerate((86, 93, 100)):
    d = SL + 0.2
    put("main", SLOW0 + FRAME + 0.02 * j, fade_sl(slow_bell(m, d, 0.5, -1.0, 2.6), d), [-0.4, 0.4, 0.0][j], 0.6, 0.25)
pad_chord(SLOW0 + 0.1, "Dmadd9", SL - 0.45, 0.3, 74, 4, fc=3000, att=1.2, rel=0.15)
put("bass", SLOW0, drone(38, SL, 0.18, 1.0, 0.5), 0.0, 0.05, 0.4)
put("main", LAND + FRAME - 1.2, rev_swell(1.2, 0.9), 0.0, 0.3, 0.7)
mark("slowmo", SLOW0)

# тема красавицы: хроматическая линия
BEAU_CH = ["Dm", "DmM7", "Dm7", "Dm6", "Bb", "Gm", "Em7b5", "A7"]
P_BEAU = dict(kick="x.........x.....", clap="........o.......", hat="..o...o...o...o.", bass="R......f..r.....", bass_v=0.85,
              arp="a..a..a.a..a..a.", arp_inst="bell", arp_lo=69, arp_n=5, arp_v=0.75, bell_tau=0.8,
              pad=dict(vel=0.28, lo=57, fc=1600))
section(SLOW1, QUEST - 0.01, b0, lambda i, j, kk, tb: (BEAU_CH[kk % 8], P_BEAU), anchor=SLOW1)
mark("beauty", SLOW1)
# «возвратишь»: пэд A7 и дробь к бонус-раунду
pad_chord(QUEST, "A7", HB0 - QUEST + 0.05, 0.35, 52, 4, fc=1200, att=0.3, rel=0.2)
p_bass(QUEST, root("A"), HB0 - QUEST - 0.05, 0.6)
snare_roll(grid_ceil(QUEST + 0.4, HB0, b0 / 4), HB0 - 0.02, b0 / 4, 0.1, 0.45)
mark("quest_pad", QUEST)

# бонусный раунд: сердцебиение, тремоло-пэд, тиканье
HB_END = E(52) + 0.1
hb = HB0
while hb < HB_END:
    v = 0.9 if hb < HB1 else 0.9 - 0.45 * (hb - HB1) / (HB_END - HB1)
    put("bass", hb, heartbeat(v), 0.0, 0.03, 0.6)
    hb += 2 * b0
H_CH = [(HB0, "Dmadd9"), (HB0 + 8 * b0, "Bbadd9"), (KP + FRAME, "C"), (FLAW + FRAME, "D"), (HB1 + 0.05, "Dm"),
        ((HB1 + MARCH0) / 2, "Bb"), (MARCH0, None)]
for (t, name), (t2, _) in zip(H_CH, H_CH[1:]):
    pad_chord(t, name, t2 - t, 0.34, 62, 4, fc=2000, att=0.3, rel=0.2, trem=7.0)
    p_bass(t, root(name), (t2 - t) * 0.95, 0.45)
t = HB0
while t < HB1 - 0.02:
    d_hat(t, 0.3)
    t += b0 / 2
mark("heartbeat", HB0)
mark("pickup_C", KP + FRAME)
mark("flawless_D", FLAW + FRAME)
mark("fear", HB1 + 0.05)

# марш к балкону и подъём к PERFECT
M_CH = ["Dm", "Bb", "C", "A"]
P_MARCH = dict(kick="x.......x.......", snare="....x.......x...", hat="o.x.o.x.o.x.o.x.", bass="r.r.r.r.r.r.r.r.",
               stab="s.......s.......", stab_v=0.8, pad=dict(vel=0.26, lo=55, fc=1500))


def march_fn(i, j, kk, tb):
    P = dict(P_MARCH)
    if j <= 1:
        P.update(arp="aaaaaaaaaaaaaaaa", arp_v=0.55 + 0.25 * (1 - j), arp_lo=62 + 5 * (1 - j), arp_n=6)
    return M_CH[(3 - j) % 4], P


section(MARCH0, PERF + FRAME - 0.01, b0, march_fn, anchor=PERF + FRAME)
snare_roll(PERF + FRAME - 4 * b0, PERF + FRAME - 0.02, b0 / 4, 0.15, 0.7)
riser(PERF + FRAME - 4 * b0, PERF + FRAME, 0.1)
mark("march", MARCH0)

# PERFECT: ре мажор, затем «сладкие взгляды»
P_PERF0 = dict(P_FIGHT1, crash=0.8, stab="S.....S.....S...", arp_lo=62)
P_SWEET = dict(kick="x.......x.......", hat="..o...o...o...o.", bass="r...r...r...r...", bass_v=0.8,
               arp="a.a.a.a.a.a.a.a.", arp_inst="bell", arp_lo=74, arp_n=5, arp_v=0.7, arp_seq="updown",
               pad=dict(vel=0.28, lo=57, fc=1700))
section(PERF + FRAME, COLD - 0.1, b0, lambda i, j, kk, tb: (["D", "Bm", "G", "A"][kk % 4], P_PERF0 if kk == 0 else P_SWEET),
        anchor=PERF + FRAME)
mark("perfect", PERF + FRAME)
mark("sweet", PERF + FRAME + 4 * b0)

# «холодно»: ледяной звон, высокий пэд, льдинки, обратная тарелка к броску
pad_chord(COLD - 0.05, "Dmadd9", KO - COLD, 0.3, 74, 4, fc=2600, att=0.5, rel=0.1)
put("bass", COLD - 0.05, drone(38, KO - COLD + 0.05, 0.12, 0.6, 0.05), 0.0, 0.05, 0.4)
for j, m in enumerate((98, 105, 101)):
    p_bell(COLD + FRAME + 0.015 * j, m, 0.45, 1.8, [-0.3, 0.3, 0.0][j], 0.6, ICE)
tp = COLD + 1.0
ICY = [86, 88, 89, 93, 96, 98, 100]
while tp < THROW - 0.4:
    p_bell(tp, ICY[int(rng.integers(0, len(ICY)))], float(rng.uniform(0.18, 0.28)), 0.7, float(rng.uniform(-0.6, 0.6)), 0.6, ICE)
    tp += float(rng.uniform(0.9, 1.4))
put("main", KO - 0.9, rev_swell(0.9, 0.9), 0.0, 0.25, 0.6)
mark("cold", COLD)
mark("ko_cut", KO)

# после K.O.: тихая педаль ля
NAGR = W("w_nagr")
pad_chord(KO + 0.9, "Asus4", NAGR - KO - 0.9, 0.3, 57, 4, fc=1000, att=0.8, rel=0.15)
pad_chord(NAGR, "A", VIC_T - NAGR, 0.3, 57, 4, fc=1100, att=0.08, rel=0.1)
put("bass", KO + 0.9, drone(33, VIC_T - KO - 0.9, 0.3, 0.8, 0.1), 0.0, 0.05, 0.4)
mark("post_ko", KO + 0.9)

# ПОБЕДИТЕЛЬ: джингл
VICT = [(0, .25, 78), (.25, .25, 81), (.5, .5, 86), (1, .5, 83), (1.5, .5, 86), (2, .5, 85), (2.5, .5, 88), (3, 1.25, 90)]
put2("main", VIC_T, orch_hit(50, False, 1.4, 0.3), 0.25, 0.5)
for b_, d, m in VICT:
    p_lead(VIC_T + b_ * b0, m, d * b0 * 0.92, 0.65)
    p_brass(VIC_T + b_ * b0, m - 12, d * b0 * 0.9, 0.4, 0.0)
p_brass(VIC_T + 3 * b0, 86 - 12, 1.25 * b0 * 0.9, 0.4, 0.0)
for b_, name in ((0, "D"), (1, "G"), (2, "A"), (3, "D")):
    t = VIC_T + b_ * b0
    stab(t, name, 57, 4, 0.14 if b_ < 3 else 1.1 * b0, 0.6)
    pad_chord(t, name, (1 if b_ < 3 else 1.3) * b0, 0.4, 55, 4, fc=2200, att=0.03, rel=0.2)
    for k in range(2 if b_ < 3 else 1):
        p_bass(t + k * b0 / 2, root(name) + 12 * k, b0 / 2 * 0.85 if b_ < 3 else 1.2 * b0, 0.85)
    d_kick(t, 0.95)
snare_roll(VIC_T + 2 * b0, VIC_T + 3 * b0 - 0.01, b0 / 4, 0.25, 0.8)
for k in range(6):
    d_hat(VIC_T + k * b0 / 2, 0.5 if k % 2 else 0.35)
d_crash(VIC_T, 0.6, 0.8)
d_crash(VIC_T + 3 * b0, 0.7, 1.2)
put2("main", VIC_T + 3 * b0, orch_hit(50, False, 1.4, 0.35), 0.25, 0.45)
mark("victory", VIC_T)

# финальная тема: фанфара заставки в мажоре, громче, затухание
FIN_HOOK = [(0, .5, 74), (.5, .25, 74), (.75, .75, 78), (1.5, .5, 81), (2, .5, 83), (2.5, .5, 81), (3, .5, 79), (3.5, .5, 76),
            (4, .75, 78), (4.75, .75, 81), (5.5, .5, 85)]
FIN_CH = [(0, "D", 2), (2, "G", 1), (3, "A", 1), (4, "Bm", 1), (5, "G", .5), (5.5, "A", .5)]
FEND = FT0 + 6 * b0
RING = TOTAL - FEND
put2("main", FT0, orch_hit(50, False, 1.3, 0.35), 0.25, 0.5)
d_crash(FT0, 0.7, 1.2)
for b_, d, m in FIN_HOOK:
    p_lead(FT0 + b_ * b0, m, d * b0 * 0.92, 0.65)
    p_brass(FT0 + b_ * b0, m - 12, d * b0 * 0.9, 0.4, 0.0)
p_lead(FEND, 86, RING - 0.4, 0.6)
p_brass(FEND, 74, RING - 0.4, 0.4, 0.0)
for b_, name, d in FIN_CH:
    t = FT0 + b_ * b0
    pad_chord(t, name, d * b0, 0.42, 55, 4, fc=2200, att=0.05, rel=0.25)
    stab(t, name, 57, 4, 0.12, 0.55)
    for k in range(int(round(d * 2))):
        p_bass(t + k * b0 / 2, root(name) + 12 * (k % 2), b0 / 2 * 0.85, 0.85 if k % 2 == 0 else 0.65)
pad_chord(FEND, "D69", RING - 0.3, 0.45, 55, 5, fc=2400, att=0.03, rel=0.4)
stab(FEND, "D", 57, 4, RING - 0.5, 0.55)
put2("main", FEND, orch_hit(50, False, 1.4, 0.45), 0.3, 0.5)
p_bass(FEND, root("D"), RING - 0.3, 0.9)
for b_ in (0, 1.5, 2, 3.5, 4, 5.5, 6):
    d_kick(FT0 + b_ * b0, 0.95)
for b_ in (1, 3):
    d_snare(FT0 + b_ * b0, 0.75)
for k in range(10):
    d_hat(FT0 + k * b0 / 2, 0.55 if k % 2 else 0.35)
snare_roll(FT0 + 5 * b0, FEND - 0.01, b0 / 4, 0.25, 0.85)
d_crash(FEND, 0.8, 1.6)
for j, m in enumerate((86, 90, 93, 98)):
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
    gg = gong(hz(key + 12), 2.6) * 0.6
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


def sfx_vs(key):
    A, B = orch_hit(key + 12, True, 1.4, 0.18), orch_hit(key + 17, True, 1.5, 0.3)
    n = int(0.13 * SR) + B.shape[1]
    out = np.zeros((2, n))
    out[:, :A.shape[1]] += A
    out[:, int(0.13 * SR):] += B
    out += place_in(n, 0.13, crash(0.9, 0.7)) * 0.7
    return out, 0.13


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


def sfx_snore():
    dur = 0.9
    n = int(dur * SR)
    u = tt(n) / dur
    f = 950 + 650 * np.sin(np.pi * u) ** 1.5
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * ffilt(noise(n), rbj("bp", 1800, 1.2))
    return x * np.sin(np.pi * u) ** 1.2


def sfx_jump_whoosh(dur):
    return whoosh(dur, lambda tc: 350 + 2200 * np.sin(np.pi * min(1, tc / dur)) ** 1.3, 1.4, 0.45, 0.25)


def sfx_land(soft=False):
    n = int(0.5 * SR)
    t = tt(n)
    x = thump(160, 58, 0.06 if soft else 0.09, n, 0.012) * (0.7 if soft else 1.0) + 0.6 * bp_noise(n, 650, 0.8, 0.045)
    x += 0.35 * ffilt(noise(n), rbj("lp", 900, 0.7), power=2) * np.exp(-t / 0.18) * np.minimum(1, t / 0.01)   # пыль
    return x, 0.004


def sfx_roar(big=False):
    dur = 1.7 if big else 0.95
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    f0 = ((98 - 28 * u) if big else (150 - 40 * u)) * jitter(n, 18, 0.08)
    src = growl_src(f0, n, 0.55 if big else 0.4)
    am = 1 + 0.45 * np.sin(2 * np.pi * (27 if big else 33) * t)
    exc = src * am + (0.7 if big else 0.9) * noise(n) * (0.4 + 0.3 * am)
    if big:
        F = [(lambda tc: 720 - 120 * min(1, tc / dur), 3.5, 1.0), (lambda tc: 1200 - 250 * min(1, tc / dur), 4.5, 0.6), (2600, 5.0, 0.25)]
    else:
        F = [(lambda tc: 850 - 100 * min(1, tc / dur), 3.5, 1.0), (1450, 4.5, 0.6), (2900, 5.0, 0.3)]
    y = formants(exc, F) + 0.45 * ffilt(src * am, rbj("lp", 350, 0.7))
    y *= np.minimum(1, t / 0.06) * np.where(u < 0.55, 1.0, np.clip((1 - u) / 0.45, 0, 1) ** 1.4)
    if big:   # ударная волна
        y += 1.2 * thump(62, 28, 0.9, n, 0.06) + 0.5 * ffilt(noise(n), rbj("lp", 140, 0.7), power=2) * np.exp(-t / 0.6) * np.minimum(1, t / 0.02)
    return y


def sfx_tail():
    dur = 0.22
    n = int(dur * SR)
    t = tt(n)
    sw = stft_bp(noise(n), lambda tc: 1200 * 4 ** min(1, tc / 0.09), 1.6, nfft=512, hop=128) * np.exp(-((t - 0.07) / 0.035) ** 2)
    m = n - int(0.09 * SR)
    crack = place_in(n, 0.09, bp_noise(m, 2600, 0.9, 0.006) * 1.3 + 0.5 * thump(300, 180, 0.015, m, 0.005))
    return 0.6 * sw + crack, 0.091


def sfx_draw():
    n = int(0.75 * SR)
    x = np.zeros(n)
    for d, ms_, ln in ((0.0, (79,), 0.09), (0.11, (74,), 0.09), (0.22, (79, 74), 0.3)):
        for m in ms_:
            x += place_in(n, d, chip(m, ln, 0.5, 0.6))
    return x, 0.002


def sfx_bars_whoosh():
    n = int(0.85 * SR)
    out = np.zeros((2, n))
    for d, p in ((0.0, -0.4), (0.15, 0.4)):
        w = whoosh(0.65, lambda tc: 400 + 2400 * np.sin(np.pi * min(1, tc / 0.65)) ** 1.2, 1.5, 0.35, 0.22)
        gl, gr = pan_lr(p)
        out[0] += place_in(n, d, w) * gl
        out[1] += place_in(n, d, w) * gr
    return out


def sfx_hit():
    n = int(0.6 * SR)
    t = tt(n)
    x = 0.9 * thump(210, 75, 0.06, n, 0.008) + 0.9 * bp_noise(n, 1500, 0.7, 0.02)
    x += 0.5 * ffilt(noise(n), rbj("hp", 3500, 0.7)) * np.exp(-t / 0.02) * (1 - np.exp(-t / 0.0005))
    x = np.tanh(1.5 * x)
    for k in range(4):   # искры-звёздочки
        x += place_in(n, 0.05 + 0.055 * k, chip(96 - 2 * k, 0.03, 0.18, 0.2, rel=0.04))
    return x, 0.003


def sfx_glove_fall():
    dur = 0.7
    n = int(dur * SR)
    t = tt(n)
    x = stft_bp(noise(n), lambda tc: 2200 + 1400 * np.sin(2 * np.pi * 3 * tc), 1.2, nfft=512, hop=128)
    return x * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7 * t))) * np.minimum(1, t / 0.06) * np.exp(-t / 0.35)


def sfx_glove_land():
    n = int(1.0 * SR)
    t = tt(n)
    x = 0.7 * thump(120, 60, 0.06, n, 0.01) + 0.6 * ffilt(noise(n), rbj("lp", 1200, 0.7), power=2) * np.exp(-t / 0.07) * (1 - np.exp(-t / 0.003))
    x += 0.3 * place_in(n, 0.06, bell(96, 1.0, 0.45, ((1, 1, 1), (2.0, 0.35, 0.5), (3.0, 0.15, 0.3), (4.2, 0.1, 0.2))))   # «дзынь» предмета
    return x, 0.004


def sfx_quest():
    n = int(1.4 * SR)
    x = np.zeros(n)
    for d, m in ((0.0, 74), (0.06, 78), (0.12, 81), (0.18, 86), (0.24, 90)):
        x += place_in(n, d, chip(m, 0.055, 0.45, 0.4))
    for m in (86, 93):
        x += place_in(n, 0.32, chip(m, 0.45, 0.32, 0.4, rel=0.15))
    x += 0.35 * place_in(n, 0.32, bell(98, 1, 0.6))
    return x, 0.002


def sfx_pickup():
    n = int(0.9 * SR)
    x = place_in(n, 0, chip(79, 0.06, 0.45, 0.35, glide=12)) + place_in(n, 0.07, chip(88, 0.05, 0.45)) + place_in(n, 0.12, chip(95, 0.22, 0.4, rel=0.1))
    for k, m in enumerate((100, 103, 107)):
        x += 0.22 * place_in(n, 0.14 + 0.05 * k, bell(m, 1, 0.25))
    return x, 0.002


def sfx_bright(perfect=False):
    X = orch_hit(62, False, 1.5, 0.35)
    n = X.shape[1] + int(0.9 * SR)
    out = np.zeros((2, n))
    out[:, :X.shape[1]] += X
    for k, m in enumerate((86, 90, 93, 98)):   # блеск вверх
        gl, gr = pan_lr(-0.5 + k / 3)
        bb = 0.2 * place_in(n, 0.04 + 0.05 * k, bell(m, 1, 0.35, CEL))
        out[0] += bb * gl
        out[1] += bb * gr
    if perfect:
        out += place_in(n, 0, crash(0.9, 1.0)) * 0.6
    return out, 0.004


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
    H = orch_hit(50, True, 1.4, 0.4)
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


def sfx_confirm():
    n = int(0.7 * SR)
    x = place_in(n, 0, chip(84, 0.05, 0.5)) + place_in(n, 0.06, chip(91, 0.16, 0.5, rel=0.06))
    x += 0.3 * place_in(n, 0.06, bell(103, 1, 0.3))
    return x, 0.002


# имя: (генератор, режим) — peak: пик звука (или указанный генератором момент) на кадр позже события;
# onset: начало звука на кадр позже события; span: звук от события до конца отрезка
SFX_GEN = {"coin_fall": (sfx_coin_fall, "span"), "coin_slot": (sfx_coin_slot, "peak"), "logo_hit": (sfx_logo_hit, "peak"),
           "round": (sfx_round, "peak"), "gate_lion": (lambda: sfx_gate("lion"), "peak"), "fight": (sfx_fight, "peak"),
           "yawn": (sfx_yawn, "onset"), "lie": (sfx_lie, "peak"), "snore": (sfx_snore, "onset"), "bolt": (lambda: sfx_gate("bolt"), "peak"),
           "jump_whoosh": (sfx_jump_whoosh, "span"), "land": (sfx_land, "peak"), "land_soft": (lambda: sfx_land(True), "peak"),
           "roar_tiger": (lambda: sfx_roar(False), "onset"), "tail": (sfx_tail, "peak"), "draw": (sfx_draw, "peak"),
           "gate_bars": (lambda: sfx_gate("bars"), "peak"), "vs": (sfx_vs, "peak"), "bars_whoosh": (sfx_bars_whoosh, "onset"),
           "hit": (sfx_hit, "peak"), "roar_lion": (lambda: sfx_roar(True), "onset"), "glove_fall": (sfx_glove_fall, "onset"),
           "glove_land": (sfx_glove_land, "peak"), "quest": (sfx_quest, "peak"), "pickup": (sfx_pickup, "peak"),
           "flawless": (lambda: sfx_bright(False), "peak"), "applause": (sfx_applause, "span"), "perfect": (lambda: sfx_bright(True), "peak"),
           "throw": (sfx_throw, "onset"), "ko": (sfx_ko, "peak"), "blip": (sfx_blip, "peak"), "confirm": (sfx_confirm, "peak")}
SFX_PAN = {"gate_lion": -0.45, "bolt": 0.45, "gate_bars": 0.1, "yawn": -0.35, "lie": -0.35, "snore": -0.3, "jump_whoosh": 0.25,
           "land": 0.1, "roar_tiger": 0.05, "tail": 0.05, "land_soft": 0.2, "hit": 0.0, "glove_fall": 0.3, "glove_land": 0.3,
           "throw": 0.25, "pickup": 0.3, "coin_fall": 0.0, "coin_slot": 0.0, "blip": 0.45, "confirm": 0.45}
SFX_SEND = {"round": 0.3, "fight": 0.25, "vs": 0.25, "logo_hit": 0.25, "ko": 0.3, "perfect": 0.3, "flawless": 0.3,
            "roar_lion": 0.25, "roar_tiger": 0.2, "gate_lion": 0.3, "bolt": 0.3, "gate_bars": 0.3, "quest": 0.25,
            "pickup": 0.2, "glove_land": 0.25, "coin_slot": 0.2, "applause": 0.2}

# хвост тигра: крайние точки взмаха sin(16 t + 1,1) = 1 в окне «хлещет» (как в chars.js)
tw0 = W("w_hvost") - 0.1 + 0.08
kt = int(np.ceil((tw0 * 16 + 1.1 - np.pi / 2) / (2 * np.pi)))
TAIL = [(np.pi / 2 - 1.1 + 2 * np.pi * (kt + k)) / 16 for k in range(3)]
GT0 = THROW
SFX_LIST = [  # имя, что в кадре, время события, аргументы, конец (для span)
    ("coin_fall", "монетка падает к щели «INSERT COIN»", 0.05, (), 0.55),
    ("coin_slot", "«дзынь» монетки в щели + «кредит»", 0.55, (), None),
    ("logo_hit", "логотип «ПЕРЧАТКА» врезается сверху", LOGO, (), None),
    ("round", "гонг и стаб «ROUND 1» (король дал знак)", W("w_znak"), (38,), None),
    ("gate_lion", "лязг решётки: ворота льва со стуком распахнулись", W("w_stuk"), (), None),
    ("fight", "стаб «FIGHT!» (лев выходит)", W("w_vyh"), (38,), None),
    ("yawn", "зевок льва: низкий выдох-рык", W("w_zevn"), (), None),
    ("lie", "мягкий «бум»: лев лёг (пыль)", W("w_leg") + 0.2, (), None),
    ("snore", "свист «Zzz» над львом", W("w_leg") + 1.0, (), None),
    ("round", "гонг и стаб «ROUND 2» (король махнул)", W("w_mahn2"), (40,), None),
    ("bolt", "затвор грянул: удар ворот тигра", W("w_gryan"), (), None),
    ("fight", "стаб «FIGHT!» (тигр прянул)", W("w_pryan"), (40,), None),
    ("jump_whoosh", "вжух прыжка тигра", TJ0, (), TJ1),
    ("land", "тигр приземлился (шлепок, пыль)", TJ1, (), None),
    ("roar_tiger", "рёв тигра", W("w_rev"), (), None),
    *[("tail", f"хлёст хвоста {k + 1}/3", tx, (), None) for k, tx in enumerate(TAIL)],
    ("draw", "сигнал «НИЧЬЯ» (тигр лёг рядом)", W("w_lozh") + 0.25, (), None),
    ("round", "гонг и стаб «ROUND 3» (третий взмах)", W("w_mahn3"), (42,), None),
    ("gate_bars", "лязг ворот барсов", W("w_mahn3") + 0.05, (), None),
    ("vs", "стаб «2 VS 1»", W("w_pryzh") - 0.1, (42,), None),
    ("bars_whoosh", "двойной вжух прыжка барсов", W("w_pryzh") - 0.45, (), None),
    ("land_soft", "барс 1 приземлился (пыль)", BJ[0] - 0.05, (), None),
    ("land_soft", "барс 2 приземлился (пыль)", BJ[1] - 0.05, (), None),
    ("hit", "удар лапой «HIT!» + искры", W("w_lapoy") + 0.05, (), None),
    ("roar_lion", "рык льва + низкий удар (ударная волна)", W("w_ryk"), (), None),
    ("draw", "сигнал «НИЧЬЯ» (барсы легли)", W("w_legli") + 0.3, (), None),
    ("glove_fall", "шорох/вжух: перчатка сорвалась с балкона", W("w_sorv") - 0.05, (), None),
    ("glove_land", "перчатка шлёпнулась в песок + «дзынь» предмета", LAND, (), None),
    ("quest", "квест-джингл «БОНУСНЫЙ РАУНД»", QUEST, (), None),
    ("fight", "стаб «FIGHT!» (Делорж идёт к зверям)", W("w_zveryam") - 0.05, (38,), None),
    ("pickup", "«+1 ПЕРЧАТКА»: предмет подобран", KP + 0.1, (), None),
    ("flawless", "стаб «FLAWLESS!»", FLAW, (), None),
    ("applause", "аплодисменты двора", W("w_rukopl") - 0.1, (), L(57) + 0.3),
    ("perfect", "стаб «PERFECT!»", W("w_rukopl"), (), None),
    ("throw", "вжух брошенной перчатки", GT0, (), None),
    ("ko", "хлопок перчатки по лицу и «K.O.» с эхом", KO, (), None),
    *[("blip", f"курсор меню «НАГРАДА?» {k + 1}/3", W("w_ne") + 0.2 + k * (W("w_nagr") - 0.15 - W("w_ne") - 0.2) / 2, (), None) for k in range(3)],
    ("confirm", "выбор «НЕТ»", NAGR, (), None),
]


def place(name, what, t_ev, gargs, t_end):
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
    kx = [kweight(c) for c in chs]
    e = sum(float(np.sum(k_[a:a + w] ** 2)) for k_ in kx) / max(1, min(w, n_ - a))
    g = np.sqrt(vKMS * db(SFX_DB[name]) ** 2 / max(e, 1e-20))
    i0 = int(round(onset * SR))
    j0, j1 = max(0, -i0), min(n_, N - i0)
    snd = SFX_SEND.get(name, 0.12)
    if st:
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g
        sfx[1, i0 + j0:i0 + j1] += chs[1][j0:j1] * g
        sfx_send[i0 + j0:i0 + j1] += (chs[0][j0:j1] + chs[1][j0:j1]) * 0.5 * g * snd
    else:
        gl, gr = pan_lr(SFX_PAN.get(name, 0.0))
        sfx[0, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gl
        sfx[1, i0 + j0:i0 + j1] += chs[0][j0:j1] * g * gr
        sfx_send[i0 + j0:i0 + j1] += chs[0][j0:j1] * g * snd
    rec = {"name": name, "what": what, "t": r3(t_ev), "mode": mode}
    if mode == "peak":
        rec["peak"] = r3(t_ev + FRAME)
    else:
        rec["start"], rec["end"] = r3(onset), r3(onset + n_ / SR if mode == "onset" else t_end)
    rec["db"] = SFX_DB[name]
    SFX_LOG.append(rec)
    SFX_WIN.setdefault(name, []).append((onset + a / SR, onset + (a + min(w, n_ - a)) / SR))


for name, what, t_ev, gargs, t_end in SFX_LIST:
    place(name, what, t_ev, gargs, t_end)
sfx_wet = np.stack([convolve(sfx_send, IR_S[0]), convolve(sfx_send, IR_S[1])]) * 0.6
sfx_all = sfx + sfx_wet
# победный джингл — часть музыки, но в списке событий кадра
SFX_LOG.append({"name": "victory_jingle", "what": "победный джингл «ПОБЕДИТЕЛЬ: ДЕЛОРЖ» (в музыке)", "t": r3(VIC), "mode": "music",
                "peak": r3(VIC_T), "db": VICT_DB})
SFX_LOG.sort(key=lambda r: r.get("peak", r.get("start")))

# ---------- форма громкости музыки ----------
# зоны с нарочно другой громкостью: (имя, начало, конец, дБ, окна замера музыки, окна голоса или None — средний голос, рампа)
ZONES = [("stop", STOP + TS_D, SLOW1 - 0.08, STOP_DB, [(SLOW0, SLOW1 - 0.3)], [SPEECH[37], SPEECH[38], SPEECH[39]], 0.08),
         ("cold", COLD - 0.1, KO, COLD_DB, [(COLD, KO - 0.05)], [SPEECH[57], SPEECH[58], (L(60), KO)], 0.15),
         ("post_ko", KO, VIC_T - 0.05, POSTKO_DB, [(KO + 1.2, VIC_T - 0.05)], [SPEECH[59]], 0.02),
         ("victory", VIC_T - 0.05, FT0 - 0.05, VICT_DB, [(VIC_T, FT0 - 0.05)], None, 0.03),
         ("final", FT0 - 0.05, TOTAL + 1, FIN_DB, [(FT0, FEND + 0.6)], None, 0.03)]
ZCUT = [(z0 - r, z1 + r) for _, z0, z1, *_r, r in ZONES]
BIG = {"logo_hit", "coin_slot", "round", "fight", "vs", "roar_lion", "ko", "perfect", "flawless", "glove_land", "quest", "pickup",
       "gate_lion", "bolt", "gate_bars", "victory_jingle"}
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
        gs = float(np.clip(gFor([(E(i) + 0.03, L(i + 1) - 0.1)], GAP_DB[i]), g * db(-2), g * db(12)))
        gS[i] = gs
        keys += [(E(i) + 0.03, gs), (L(i + 1) - 0.1, gs)]
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
        "gaps": [{"after_line": i, "start": r3(E(i) + 0.03), "end": r3(L(i + 1) - 0.1), "db": GAP_DB[i]} for i in sorted(gS)],
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
print(f"голос в местах речи: RMS {f1(dB(vMS))} дБFS (оба канала), K {f1(dB(vKMS) - 0.691)} LUFS")
print(f"музыка под голосом: RMS {rel(SH, SPEECH)} дБ, K {relK(ksh, SPEECH)} дБ к голосу; с шумами RMS {rel(ALL, SPEECH)} дБ")
print("по строкам (музыка, RMS | K дБ к голосу строки):",
      " ".join(f"{i}:{f1(dB(ms(SH, [SPEECH[i - 1]])) - dB(ms(VCH, [SPEECH[i - 1]])))}|{f1(dB(ms(ksh, [SPEECH[i - 1]])) - dB(ms([kv, kv], [SPEECH[i - 1]])))}"
               for i in range(1, NL + 1)))
print(f"заставка RMS {rel(SH, [(IA, C0 - 0.1)])}, джингл {rel(SH, [(VIC_T, FT0 - 0.05)])}, финал {rel(SH, [(FT0, FEND + 0.6)])}, паузы "
      + " ".join(f"{i}|{i + 1}:{rel(SH, [(E(i) + 0.03, L(i + 1) - 0.1)])}" for i in sorted(gS)) + " (дБ к среднему голосу)")
print("зоны (RMS к голосу своих строк): " + ", ".join(
    f"{zn} {f1(dB(ms(SH, meas)) - dB(ms(VCH, vwin) if vwin else vMS))}" for zn, z0, z1, zdb, meas, vwin, r in ZONES))
print(f"остановка ленты {STOP:.2f}–{STOP + TS_D:.2f}, тишина до {SLOW0:.2f}: музыка {f1(dB(ms(SH, [(STOP + TS_D + 0.02, SLOW0)])))} дБFS")
print("шумы в своих окнах (K | RMS, дБ к голосу):",
      ", ".join(f"{k} " + " ".join(f"{relK(ksa, [w])}|{rel(SA, [w])}" for w in ws) for k, ws in SFX_WIN.items()))
mix_pk = float(np.max(np.abs(np.stack(ALL) + vfull)))
print(f"music.wav: пик {float(np.max(np.abs(out))):.3f} ({f1(20 * np.log10(float(np.max(np.abs(out)))))} dBFS); ограничитель: "
      f"до {lim_db:.1f} дБ, {lim_s:.2f} с; голос + музыка: пик {f1(20 * np.log10(mix_pk))} dBFS")
print("шумы:", "; ".join(f"{r['name']} {r.get('peak', r.get('start'))}" for r in SFX_LOG))
print("музыка:", json.dumps(MARK, ensure_ascii=False))
print(f"время синтеза: {T_SYN:.1f} с (музыка), всего {time.time() - T_START:.1f} с")
