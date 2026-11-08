#!/usr/bin/env python3
"""Музыка v2 к «Песни о вещем Олеге» А. С. Пушкина, стиль «Пиксель-арт 8-бит» (ретро-RPG на 8-битной приставке).

Чиптюн как у 8-битной приставки: 2 пульс-канала (скважность 12,5 / 25 / 50 %, без алиасинга — PolyBLEP),
треугольник (бас, 32 ступени, как в приставке), шум (сдвиговый регистр 15 бит, длинный и «металлический» короткий
режим) для ударных и шумов. Мелодии свои. Разделы привязаны к строкам голоса (../timings.json) и к игровым
событиям (events.json, его пишет ../video/build.py):
  0 … start     титульный экран: бодрая заставка, на start (нажатие СТАРТ) обрывается — бип «старт»;
  start … V0    «УРОВЕНЬ 1»: арпеджио и дробь;
  ст. 1         поход: марш-приключение, ре минор / фа мажор (134 в минуту);
  ст. 2–3       лес и разговор: таинственно, тише — арпеджио 12,5 %, ветер-шум, мотив с фригийской ми-бемоль;
  ст. 4         пророчество: загадочная тема с глубоким вибрато, «магические» пассажи с эхом;
  ст. 5         героические фанфары (ре мажор, две «медные» партии);
  ст. 6         битва: шестнадцатые, бас восьмыми;
  ст. 7         конь: галоп и нарастание → стоп-удар перед строкой 42, джингл «НОВЫЙ КВЕСТ», строка 42 — почти тишина
                (низкий гул и редкое сердцебиение);
  ст. 8–10      прощание с конём: медленно, грустно и тепло; на leave — грустный джингл «КОНЬ ПОКИНУЛ ОТРЯД»;
  years, ст. 11 «ПРОШЛО МНОГО ЛЕТ» — перезвон; пир: джига «таверна» 6/8, на «поминают… битвы» — мотив похода;
  ст. 12–13     тревога (остинато, сердцебиение; на «бурный, игривый» — вспышка мотива похода; «почил» — гаснет),
                гнев (бас восьмыми, удары 3+3+2);
  ст. 14–15     холм и череп: пустота, ветер-шум, редкие капли; на «Спи, друг…» — мотив прощания;
  ст. 16        напряжение (сердцебиение, хроматический подъём) → с boss тема битвы с боссом → на «вскрикнул» удар и
                падение тона (потеря жизни), тишина → джингл «КОНЕЦ ИГРЫ»;
  ст. 17        чиптюн-реквием: треугольник и мягкий пульс, на «Бойцы поминают…» — мотив похода медленно;
  fin … total   титульная тема медленно, финальный аккорд, затухание.
Шумы (8-бит, только с причиной в кадре, пик на кадр позже события): мечи и сеча — звон, молния — шум, щит — удар,
«ПРОМАХ» — бипы, «+СЛАВА» — монетка, чаши — звон, лицо рассыпается — шум-взрыв, дождь и ветер — шум, сапог на
череп — хруст, змея — шипение.

Громкость — K-взвешенно (BS.1770) к голосу: под голосом музыка на 18,5–19,5 дБ тише голоса той же строки, громче на
титуле, в паузах между строфами (без наложения на голос в паузе), на джинглах и в финале. Под голосом пульс-каналы и
шум дополнительно приглушены на 3 дБ и проходят «карман» для речи: спад −6 дБ около 2,7 кГц и срез выше 5 кГц.

Запуск: python3 make_music.py --intro 4.5 --outro 7.5     (по умолчанию 4,5 и 7,5)
Нужны numpy и ffmpeg (читает ../voice.mp3). Пишет music.wav (44,1 кГц, 16 бит, стерео, длина intro + голос + outro)
и sfx.json (время шумов, джинглов и разделов музыки, секунды ролика). Проверка микса — check_mix.py.
"""

import argparse
import json
import re
import subprocess
import sys
import wave
from fractions import Fraction
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
SR = 44100
FRAME = 1 / 30

# ---------- уровни: K-взвешенно, дБ к голосу ----------
# под голосом по строфам 1…17 (к голосу той же строки)
UNDER = [-18.5, -19.5, -19.5, -19, -18.5, -18.5, -18.5, -19.5, -19.5, -19.5, -18.5, -19, -18.5, -19.5, -19.5, -18.5, -19.5]
LINE_ABS = {42: -30}       # строка 42 — почти тишина
FREE = {96}                # «вскрикнул»: музыка обрывается в начале строки — громкость как у предыдущей
SWELL = {1: -12, 2: -13, 3: -11, 4: -11, 5: -12, 6: -12, 7: -15, 8: -13, 11: -12, 12: -13, 13: -12, 14: -14, 15: -13}
INTRO_DB, FILL_DB, BUILD_DB, FIN_DB = -5, -9, -11, -5
DUCK_DB = -3               # пульсы и шум под голосом — ещё тише остальных
# шумы и джинглы: (цель дБ к голосу, окно замера, с)
FXL = {
    'start': (-6, .35), 'coin': (-15, .3), 'clang': (-14, .2), 'lightning': (-13, .35), 'shield': (-12, .15),
    'miss': (-16, .15), 'clink': (-15, .25), 'boom': (-13, .4), 'rain': (-20, 1.9), 'wind': (-20, 2.6),
    'crunch': (-13, .15), 'hiss': (-22, None), 'vskr': (-12, .25),
    'knock': (-19, .15), 'bite': (-13, .25), 'grow': (-15, .35),  # v3
    'quest': (-10, .3), 'leave': (-15, 1.0), 'years': (-9, .8), 'gameover': (-16, 1.3),
}

# ---------- аргументы и время ----------
ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--intro', type=float, default=4.5)
ap.add_argument('--outro', type=float, default=7.5)
ap.add_argument('--out', default=str(HERE / 'music.wav'))
args = ap.parse_args()
V0, OUTRO = args.intro, args.outro
if V0 < 3 or OUTRO < 5:
    sys.exit('нужно --intro >= 3 и --outro >= 5')

T = json.loads((POEM / 'timings.json').read_text(encoding='utf-8'))
LINES = T['lines']
NL = len(LINES)
VD = T['voiceDuration']
TOTAL = round(V0 + VD + OUTRO, 3)
N = int(round(TOTAL * SR))
r3 = lambda x: round(x, 3)


def norm(s):
    return re.sub(r'[^а-яa-z]', '', s.lower().replace('ё', 'е'))


WORDS = {  # как в ../video/build.py (нужные музыке)
    'w_mech': (4, 'мечам'), 'w_pozh': (4, 'пожарам'), 'w_perun': (9, 'Перуну'), 'w_slava': (26, 'слава'),
    'w_shchit': (28, 'щит'), 'w_prashch': (33, 'пращ'), 'w_strela': (33, 'стрела'), 'w_kinzhal': (33, 'кинжал'),
    'w_secha': (41, 'сеча'), 'w_otosh': (59, 'отошли'), 'w_zvon': (62, 'звоне'), 'w_burn': (70, 'бурный'),
    'w_prezr': (76, 'Презреть'), 'w_dozhd': (83, 'дожди'), 'w_veter': (84, 'ветер'), 'w_nastup': (85, 'наступил'),
    'w_zmiya': (93, 'змия'), 'w_ship': (94, 'Шипя'), 'w_obvil': (95, 'обвилась'), 'w_vskr': (96, 'вскрикнул'),
}


def events_from_timings():
    ev = {'V0': V0}
    for i, l in enumerate(LINES):
        ev[f'L{i + 1}'], ev[f'E{i + 1}'] = r3(l['start'] + V0), r3(l['end'] + V0)
    for k, (n, w) in WORDS.items():
        x = next((q for q in LINES[n - 1]['words'] if norm(q['text']) == norm(w)), None)
        if x is None:
            sys.exit(f'нет слова «{w}» в строке {n}')
        ev[k] = r3(x['start'] + V0)
    ev |= {'start': 3.6, 'fin': r3(ev[f'E{NL}'] + 2.2)}
    ev |= {'quest': ev['L42'] - .35, 'leave': ev['w_otosh'] + .3, 'years': ev['E60'] + .15,
           'boss': ev['w_zmiya'] - .1, 'gameover': ev['w_vskr'] + .9}
    return {k: r3(v) for k, v in ev.items()}


EV = events_from_timings()
ev_src = 'timings.json'
_p = HERE / 'events.json'
if _p.exists():
    raw = json.loads(_p.read_text(encoding='utf-8'))
    shift = V0 - raw.get('V0', V0)
    if abs(raw['L1'] + shift - EV['L1']) < .02 and abs(raw[f'E{NL}'] + shift - EV[f'E{NL}']) < .02:
        for k, v in raw.items():
            if isinstance(v, (int, float)) and k not in ('V0', 'OUTRO', 'total', 'start'):
                EV[k] = r3(v + shift)
            elif isinstance(v, list):  # v3: списки событий (удары, рост босса)
                EV[k] = [r3(x + shift) for x in v]
        EV['start'] = raw.get('start', EV['start'])
        ev_src = 'events.json' + (f' со сдвигом {shift:+.2f} с' if shift else '')
    else:
        print('events.json не совпадает с timings.json — события считаю по timings.json')
EV['start'] = min(EV['start'], V0 - .6)
EV['total'] = TOTAL
if EV['fin'] > TOTAL - 4:
    sys.exit(f'финал слишком короткий: fin {EV["fin"]}, длина {TOTAL}')
L = lambda n: EV[f'L{n}']
E = lambda n: EV[f'E{n}']
STZ = [l['stanza'] for l in LINES]  # строфа строки n — STZ[n - 1]

# ---------- ноты и сетка ----------
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(s):
    """'C#5', 'Bb4', 'A1' → MIDI (C4 = 60)."""
    v, i = PC[s[0]], 1
    while s[i] in '#b':
        v += 1 if s[i] == '#' else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + v


def parse(s):
    out = []
    for tok in s.split():
        name, ln = tok.split(':')
        out.append((None if name == 'r' else nm(name), float(sum(Fraction(p) for p in ln.split('+')))))
    return out


CHORD = {'Dm': ('D', (0, 3, 7)), 'D': ('D', (0, 4, 7)), 'C': ('C', (0, 4, 7)), 'Bb': ('Bb', (0, 4, 7)),
         'A': ('A', (0, 4, 7)), 'A7': ('A', (0, 4, 7, 10)), 'F': ('F', (0, 4, 7)), 'Gm': ('G', (0, 3, 7)),
         'G': ('G', (0, 4, 7)), 'Eb': ('Eb', (0, 4, 7)), 'Bm': ('B', (0, 3, 7)), 'Edim': ('E', (0, 3, 6))}


def ctones(c, lo, k=6):
    """k звуков аккорда по возрастанию начиная с MIDI lo."""
    r, iv = CHORD[c]
    pcs = {(nm(r + '4') + i) % 12 for i in iv}
    out, m = [], lo
    while len(out) < k:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


def croot(c, lo=31):
    """Основной тон аккорда в басу: G1 … F#2."""
    return lo + (nm(CHORD[c][0] + '4') - lo) % 12


def halves(spec, bpb=4):
    """'Bb|C' → [(0, 2, 'Bb'), (2, 2, 'C')]; 'Dm' → [(0, 4, 'Dm')]."""
    parts = spec.split('|')
    w = bpb / len(parts)
    return [(i * w, w, c) for i, c in enumerate(parts)]


def chord_at(spec, beat_in_bar, bpb=4):
    for o, w, c in halves(spec, bpb):
        if o <= beat_in_bar < o + w:
            return c
    return halves(spec, bpb)[-1][2]


class Grid:
    def __init__(self, t0, bpm):
        self.t0, self.b = t0, 60 / bpm

    def t(self, beat):
        return self.t0 + beat * self.b


def fit(t0, t1, bars, bpb=4):
    """Сетка, в которую ровно ложится bars тактов между t0 и t1 (темп подгоняется)."""
    return Grid(t0, bars * bpb * 60 / (t1 - t0))


# ---------- синтез: каналы приставки ----------
CHS = ('p1', 'p2', 'tri', 'noi')
AMP = {'p1': .5, 'p2': .5, 'tri': .62, 'noi': .38}
PANS = {'p1': -.3, 'p2': .3, 'tri': 0., 'noi': .12}
TRI_SEQ = np.concatenate([np.arange(15, -1, -1), np.arange(0, 16)]).astype(np.float64) / 7.5 - 1
NOISE_LOGRATE = np.log(1789773.0 / np.array([4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068.]))


def _lfsr(short, n):
    reg, tap, out = 1, (6 if short else 1), np.empty(n, np.float64)
    for i in range(n):
        fb = (reg ^ (reg >> tap)) & 1
        reg = (reg >> 1) | (fb << 14)
        out[i] = 1. if reg & 1 else -1.
    return out


NOISE_LONG = _lfsr(False, 32767)
_ns = _lfsr(True, 3000)
NOISE_SHORT = _ns[:next(p for p in range(2, 2000) if np.array_equal(_ns[p:p + 600], _ns[:600]))]


def panlr(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)


def _blep(t, dt):
    r = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    r[m] = x + x - x * x - 1
    m = t > 1 - dt
    x = (t[m] - 1) / dt[m]
    r[m] = x * x + x + x + 1
    return r


def fbdelay(x, D, fb):
    """Эхо: y[n] = x[n − D] + fb·y[n − D]."""
    y = np.zeros_like(x)
    for s in range(D, len(x), D):
        e = min(s + D, len(x))
        y[s:e] = x[s - D:e - D] + fb * y[s - D:e - D]
    return y


class Bus:
    """Четыре канала приставки + посыл на эхо (имитация эха вторым каналом, как в играх того времени)."""

    def __init__(self, n):
        self.n = n
        self.c = {k: np.zeros(n, np.float32) for k in CHS}
        self.send = np.zeros(n, np.float32)

    def note(self, ch, t, dur, m, vol=1., duty=.25, a=.004, d=0., s=1., r=.03, vib=0., vibd=.18, vibr=5.8,
             slide=0., stime=None, echo=0., short=False, trem=None):
        """m — MIDI (для шума — номер частоты 0…15, меньше — выше); m и vol-тремоло могут быть функциями времени."""
        i0 = int(round(t * SR))
        non = max(8, int(round(dur * SR)))
        n = non + int(round(4 * r * SR)) + 16
        if vol <= 0 or i0 >= self.n or i0 + n <= 0:
            return
        tt = np.arange(n) / SR
        env = s + (1 - s) * np.exp(-np.maximum(tt - a, 0) / d) if d > 0 else np.ones(n)
        if a > 0:
            env = env * np.minimum(1., tt / a)
        env[non:] = env[non - 1] * np.exp(-(tt[non:] - non / SR) / max(r, 1e-4))
        k = min(n, int(.003 * SR))
        env[-k:] *= np.linspace(1, 0, k)
        if trem is not None:
            env = env * trem(tt)
        if callable(m):
            semis = m(tt)
        else:
            semis = np.full(n, float(m))
            if slide:
                semis = semis + slide * np.clip(tt / (stime or dur), 0, 1)
        if vib:
            semis = semis + vib * np.sin(2 * np.pi * vibr * tt) * np.clip((tt - vibd) / .2, 0, 1)
        if ch == 'noi':
            rate = np.exp(np.interp(semis, np.arange(16), NOISE_LOGRATE))
            seq = NOISE_SHORT if short else NOISE_LONG
            y = seq[np.cumsum(rate / SR).astype(np.int64) % len(seq)]
        else:
            dt = 440. * 2 ** ((semis - 69) / 12) / SR
            ph = np.cumsum(dt) % 1.
            if ch == 'tri':
                y = TRI_SEQ[(ph * 32).astype(np.int64) % 32]
            else:
                y = np.where(ph < duty, 1., -1.) + _blep(ph, dt) - _blep((ph - duty) % 1., dt) - (2 * duty - 1)
        out = (y * env * (vol * AMP[ch])).astype(np.float32)
        a0, b0 = max(0, i0), min(self.n, i0 + n)
        self.c[ch][a0:b0] += out[a0 - i0:b0 - i0]
        if echo:
            self.send[a0:b0] += out[a0 - i0:b0 - i0] * echo

    # ударные на шуме и треугольнике
    def kick(self, t, v=1.):
        self.note('tri', t, .06, 52, v, slide=-26, stime=.06, r=.012, a=.001)
        self.note('noi', t, .012, 11, .45 * v, r=.012, a=.001)

    def snare(self, t, v=1.):
        self.note('noi', t, .02, 4.5, v, d=.07, s=0, r=.05, a=.001)
        self.note('tri', t, .025, 57, .35 * v, slide=-10, r=.01, a=.001)

    def hat(self, t, v=1., op=False):
        self.note('noi', t, .01, .5, v, d=(.07 if op else .018), s=0, r=(.05 if op else .015), a=.0005)

    def crash(self, t, v=1.):
        self.note('noi', t, .02, 1.5, v, d=.45, s=0, r=.35, a=.001)

    def tom(self, t, m=48, v=1.):
        self.note('tri', t, .1, m, v, slide=-12, r=.03, a=.001)
        self.note('noi', t, .02, 9, .3 * v, r=.03, a=.001)

    def tick(self, t, v=1.):
        self.note('noi', t, .006, 2, v, r=.008, short=True, a=.0005)

    def stereo(self, d1=.23, d2=.31, fb=.35):
        out = np.zeros((2, self.n), np.float32)
        for k, x in self.c.items():
            gl, gr = panlr(PANS[k])
            out[0] += x * gl
            out[1] += x * gr
        if self.send.any():
            out[0] += fbdelay(self.send, int(d1 * SR), fb)
            out[1] += fbdelay(self.send, int(d2 * SR), fb)
        return out


def mel(bus, ch, g, beat0, s, vol, gate=.9, expect=None, tr=0, **kw):
    b = beat0
    for m, ln in parse(s):
        if m is not None:
            bus.note(ch, g.t(b), ln * g.b * gate, m + tr, vol, **kw)
        b += ln
    if expect is not None and abs(b - beat0 - expect) > 1e-6:
        raise ValueError(f'{ch}: {b - beat0} долей вместо {expect}: {s[:40]}…')
    return b


MARCH_MOTIF = "D5:.75 D5:.25 A4:.5 D5:.5 F5:1 E5:.5 D5:.5"
MARK = {}


def compose():
    B = Bus(N)
    t_start = EV['start']

    # ===== 0. Титул: бодрая заставка, обрывается нажатием СТАРТ =====
    MARK['title'] = 0
    g = fit(0, t_start, 2)
    mel(B, 'p1', g, 0, "D5:.75 A4:.25 D5:.5 F5:.5 A5:1.5 G5:.25 F5:.25 "
                       "E5:.5 F5:.5 G5:.5 A5:.5 Bb5:.75 A5:.25 G5:.5 E5:.5", .85, gate=.88, vib=.12, r=.02, expect=8)
    mel(B, 'p2', g, 0, "F4:.75 F4:.25 A4:.5 A4:.5 C5:1.5 Bb4:.25 A4:.25 "
                       "C#5:.5 D5:.5 E5:.5 C#5:.5 D5:.75 C#5:.25 Bb4:.5 C#5:.5", .55, duty=.125, gate=.85, r=.02, expect=8)
    mel(B, 'tri', g, 0, "D2:.5 D3:.5 D2:.5 D3:.5 F2:.5 F3:.5 F2:.5 F3:.5 "
                        "A1:.5 A2:.5 A1:.5 A2:.5 G2:.5 G3:.5 A2:.5 A3:.5", .9, gate=.8, r=.01, expect=8)
    for b in range(8):
        B.hat(g.t(b + .5), .3)
        B.hat(g.t(b), .15)
        (B.kick if b % 2 == 0 else B.snare)(g.t(b), .85 if b % 2 == 0 else .65)
    B.crash(g.t(0), .5)
    # «УРОВЕНЬ 1»: арпеджио вверх и дробь к первому такту похода
    MARK['level1'] = r3(t_start + .22)
    t0, t1 = t_start + .22, V0 - .02
    for i, x in enumerate(['D4', 'F4', 'A4', 'D5', 'F5', 'A5']):
        B.note('p2', t0 + i * (t1 - t0) / 6, (t1 - t0) / 6 * .8, nm(x), .5, duty=.125, r=.02)
    for i in range(8):
        B.snare(t0 + i * (t1 - t0) / 8, .22 + .07 * i)
    B.note('tri', t0, t1 - t0 - .03, nm('A1'), .8, r=.01)

    # ===== 1. Поход: марш-приключение =====
    t0, t1 = V0, (E(6) + L(7)) / 2
    MARK['pohod'] = r3(t0)
    g = fit(t0, t1, 10)
    chords = 'Dm C Bb A Dm C Bb|C F Gm|A Dm'.split()
    mel(B, 'p1', g, 0, MARCH_MOTIF + " "
        "E5:.75 E5:.25 C5:.5 E5:.5 G5:1.5 r:.5 "
        "F5:.75 F5:.25 D5:.5 F5:.5 Bb5:1 A5:.5 G5:.5 "
        "A5:1.5 G5:.25 F5:.25 E5:1 C#5:1 "
        "D5:.75 D5:.25 A4:.5 D5:.5 F5:.5 G5:.5 A5:1 "
        "G5:.75 E5:.25 C5:.5 E5:.5 G5:.5 A5:.5 Bb5:.5 G5:.5 "
        "F5:.5 D5:.5 Bb4:.5 D5:.5 E5:.5 G5:.5 C6:.5 Bb5:.5 "
        "A5:2 C6:.5 A5:.5 F5:1 "
        "G5:.75 Bb5:.25 A5:.5 G5:.5 F5:.5 E5:.5 C#5:.5 E5:.5 "
        "D5:1.5 r:.5 A4:.25 C5:.25 D5:.25 E5:.25 F5:.25 E5:.25 D5:.25 C5:.25", .8, gate=.88, vib=.1, expect=40)
    for bar, spec in enumerate(chords):
        for beat in range(4):
            tb = bar * 4 + beat
            if bar == 9 and beat >= 2:
                continue
            c = chord_at(spec, beat)
            B.note('p2', g.t(tb + .5), g.b * .32, ctones(c, nm('E4'))[beat % 2], .45, duty=.125, r=.02)
            B.note('tri', g.t(tb), g.b * .42, croot(c), .9, r=.01)
            B.note('tri', g.t(tb + .5), g.b * .42, croot(c) + 12, .9, r=.01)
            (B.kick if beat % 2 == 0 else B.snare)(g.t(tb), .85 if beat % 2 == 0 else .62)
            B.hat(g.t(tb + .5), .26)
            B.hat(g.t(tb), .13)
        if bar in (3, 7):
            for k in range(4):
                B.snare(g.t(bar * 4 + 3 + k * .25), .3 + .08 * k)
    mel(B, 'tri', g, 38, "D3:.5 C3:.5 Bb2:.5 A2:.5", .9, gate=.8, r=.01)
    for m_, b_ in [(55, 38), (52, 38.5), (48, 39), (45, 39.5)]:
        B.tom(g.t(b_), m_, .6)
    B.crash(g.t(0), .45)
    B.crash(g.t(16), .4)
    B.crash(g.t(36), .35)

    # ===== 2. Лес и разговор (ст. 2–3): таинственно, тише =====
    t0, t1 = (E(6) + L(7)) / 2, E(18) + .4
    MARK['les'] = r3(t0)
    g = fit(t0, t1, 11)
    chords = 'Dm Eb Dm A Dm Eb Bb A Gm Eb A'.split()
    bass = 'D2 D2 D2 A1 D2 D2 Bb1 A1 G1 Eb2 A1'.split()
    for bar, (c, bs) in enumerate(zip(chords, bass)):
        tones = ctones(c, nm('D4'), 4)
        for e, ix in enumerate([0, 1, 2, 3, 2, 1, 2, 1]):
            B.note('p2', g.t(bar * 4 + e * .5), g.b * .45, tones[ix], .4, duty=.125, d=.25, s=.3, r=.08, echo=.35)
        B.note('tri', g.t(bar * 4), g.b * 3.9, nm(bs), .75, r=.03)
        B.tick(g.t(bar * 4 + 1), .25)
        B.tick(g.t(bar * 4 + 3), .25)
    B.note('noi', t0, t1 - t0, lambda tt: 8 + .9 * np.sin(2 * np.pi * tt / 7.3), .2, a=1.5, r=1.,
           trem=lambda tt: .55 + .45 * np.sin(2 * np.pi * tt / 5.1 - 1.2))
    mel(B, 'p1', g, 0, "r:4 "
        "r:2 D5:.5 Eb5:.5 D5:1 "
        "A4:3 r:1 "
        "r:2 E5:.5 F5:.5 E5:1 "
        "D5:3 r:1 "
        "r:2 G5:.5 F5:.5 Eb5:1 "
        "D5:2 Bb4:2 "
        "A4:2 C#5:1 E5:1 "
        "G5:2 F5:1 D5:1 "
        "Eb5:2 D5:1 Bb4:1 "
        "A4:3 r:1", .55, duty=.5, gate=.95, vib=.22, a=.03, r=.15, echo=.3, expect=44)

    # ===== 3. Пророчество (ст. 4): загадочная тема =====
    t0, t1 = E(18) + .4, E(24) + .8
    MARK['prorochestvo'] = r3(t0)
    g = fit(t0, t1, 6)
    chords = 'Dm Eb Gm A Dm A7'.split()
    mel(B, 'tri', g, 0, "D2:2 D2:2 Eb2:2 Eb2:2 G1:2 G1:2 A1:2 A1:2 F2:2 F2:2 A1:1 C#2:1 E2:1 G2:1", .8, gate=.95,
        r=.05, expect=24)
    for bar, c in enumerate(chords):
        tones = ctones(c, nm('A4'), 6)
        run = tones + tones[-2::-1]
        for i, x in enumerate(run):
            B.note('p2', g.t(bar * 4 + i * .25), g.b * .2, x, .3, duty=.125, d=.1, s=0, r=.05, echo=.5)
        B.note('noi', g.t(bar * 4), .05, 9, .2, d=.8, s=0, r=.6)
    mel(B, 'p1', g, 0, "D5:2 C#5:1 D5:1 Eb5:2 D5:1 C5:1 Bb4:1.5 A4:.5 G4:1 Bb4:1 A4:4 "
                       "F5:2 E5:1 D5:1 C#5:2 E5:1 A5:1", .6, gate=.97, vib=.35, vibr=4.5, a=.05, r=.1, echo=.25,
        expect=24)

    # ===== 4. Фанфары славы (ст. 5) =====
    t0, t1 = E(24) + .8, E(30) + .6
    MARK['fanfary'] = r3(t0)
    g = fit(t0, t1, 9)
    chords = 'D G A D Bm G A D A7'.split()
    mel(B, 'p1', g, 0, "A4:.5 D5:.5 F#5:1 F#5:.5 E5:.25 F#5:.25 A5:1 "
        "G5:1.5 F#5:.5 E5:1 D5:1 "
        "E5:.75 E5:.25 F#5:.5 G5:.5 A5:1 E5:1 "
        "F#5:3 A4:1/3 A4:1/3 A4:1/3 "
        "B4:.5 D5:.5 F#5:1 B5:1.5 A5:.5 "
        "G5:.75 F#5:.25 E5:.5 D5:.5 E5:1 G5:1 "
        "A5:1 G5:.5 F#5:.5 E5:.5 F#5:.5 G5:1 "
        "F#5:.5 D5:.5 A4:.5 D5:.5 F#5:2 "
        "E5:1 C#5:1 A4:.5 C#5:.5 E5:.5 G5:.5", .8, gate=.88, vib=.12, expect=36)
    mel(B, 'p2', g, 0, "F#4:.5 A4:.5 D5:1 D5:.5 C#5:.25 D5:.25 F#5:1 "
        "D5:1.5 D5:.5 B4:1 B4:1 "
        "C#5:.75 C#5:.25 D5:.5 E5:.5 E5:1 C#5:1 "
        "D5:3 F#4:1/3 F#4:1/3 F#4:1/3 "
        "F#4:.5 B4:.5 D5:1 F#5:1.5 F#5:.5 "
        "D5:.75 D5:.25 B4:.5 G4:.5 B4:1 D5:1 "
        "E5:1 E5:.5 D5:.5 C#5:.5 D5:.5 E5:1 "
        "D5:.5 A4:.5 F#4:.5 A4:.5 D5:2 "
        "C#5:1 A4:1 E4:.5 A4:.5 C#5:.5 E5:.5", .5, duty=.5, gate=.88, expect=36)
    for bar, c in enumerate(chords):
        for beat in range(4):
            tb = bar * 4 + beat
            B.note('tri', g.t(tb), g.b * .42, croot(c), .9, r=.01)
            B.note('tri', g.t(tb + .5), g.b * .42, croot(c) + 12, .9, r=.01)
            (B.kick if beat % 2 == 0 else B.snare)(g.t(tb), .85 if beat % 2 == 0 else .6)
            B.hat(g.t(tb + .5), .24)
            B.hat(g.t(tb), .12)
        B.snare(g.t(bar * 4 + 3.75), .25)
        if bar == 3:
            for k in range(3):
                B.snare(g.t(15 + k / 3), .35 + .1 * k)
    B.crash(g.t(0), .5)
    B.crash(g.t(16), .45)

    # ===== 5. Битва (ст. 6) =====
    t0, t1 = E(30) + .6, E(36) + .5
    MARK['bitva'] = r3(t0)
    g = fit(t0, t1, 10)
    chords = 'Dm Dm Bb C Dm Dm Gm A Bb A'.split()
    mel(B, 'p1', g, 0, "D5:.5 r:.25 D5:.25 F5:.5 D5:.5 A5:1 G5:.5 F5:.5 "
        "E5:.5 F5:.5 G5:.5 E5:.5 D5:2 "
        "F5:.5 r:.25 F5:.25 Bb5:.5 F5:.5 D6:1 C6:.5 Bb5:.5 "
        "C6:1.5 Bb5:.25 A5:.25 G5:1 E5:1 "
        "D5:.5 r:.25 D5:.25 F5:.5 D5:.5 A5:1 G5:.5 F5:.5 "
        "E5:.5 F5:.5 G5:.5 A5:.5 Bb5:1 A5:1 "
        "G5:.5 Bb5:.5 D6:1 C6:.5 Bb5:.5 A5:1 "
        "A5:1.5 G5:.25 F5:.25 E5:1 C#5:1 "
        "D5:.5 F5:.5 Bb5:1 A5:.5 G5:.5 F5:1 "
        "E5:.5 C#5:.5 A4:.5 C#5:.5 E5:1 A5:1", .72, gate=.85, vib=.1, expect=40)
    for bar, c in enumerate(chords):
        tones = ctones(c, nm('D4'), 4)
        rt = croot(c)
        for beat in range(4):
            tb = bar * 4 + beat
            for k, ix in enumerate([0, 2, 3, 2]):
                B.note('p2', g.t(tb + k * .25), g.b * .15, tones[ix], .3, duty=.125, d=.08, s=.3, r=.02)
            for k, o in enumerate([0, 12]):
                B.note('tri', g.t(tb + k * .5), g.b * .42, rt + (o if beat % 2 == 0 else 12 - o), .9, r=.01)
            if beat in (0, 2):
                B.kick(g.t(tb), .85)
            else:
                B.snare(g.t(tb), .6)
            if beat == 2:
                B.kick(g.t(tb + .5), .6)
            for k in range(4):
                B.hat(g.t(tb + k * .25), .12 if k % 2 else .2)
    for bar in (0, 4, 8):
        B.crash(g.t(bar * 4), .45)

    # ===== 6. Конь (ст. 7): галоп и нарастание, стоп перед строкой 42 =====
    t0, t1 = E(36) + .5, E(41) + .1
    MARK['kon'] = r3(t0)
    g = fit(t0, t1, 8)
    chords = 'Dm C Bb A Dm Eb Edim A'.split()
    mel(B, 'p1', g, 0, "A4:.5 D5:.5 E5:.5 F5:.5 G5:1 F5:.5 E5:.5 "
        "E5:1 C5:1 G5:1.5 r:.5 "
        "F5:.5 D5:.5 F5:.5 Bb5:.5 A5:1 G5:1 "
        "A5:2 E5:1 C#5:1 "
        "D5:.5 F5:.5 A5:.5 D6:.5 C6:.5 A5:.5 F5:.5 A5:.5 "
        "Eb5:.5 G5:.5 Bb5:.5 Eb6:.5 D6:.5 Bb5:.5 G5:.5 Bb5:.5 "
        "E5:.5 G5:.5 Bb5:.5 E6:.5 D6:.5 Bb5:.5 G5:.5 Bb5:.5 "
        "A5:2 C#6:1 E6:1", .72, gate=.86, vib=.1, expect=32)
    for bar, c in enumerate(chords):
        tones = ctones(c, nm('E4'), 4)
        rt = croot(c)
        for beat in range(4):
            tb = bar * 4 + beat
            for o, ln in [(0, .5), (.5, .25), (.75, .25)]:  # галоп «та-та-там»
                B.note('tri', g.t(tb + o), g.b * ln * .85, rt + (12 if o == .75 else 0), .9, r=.01)
            if bar < 4:
                B.note('p2', g.t(tb + .5), g.b * .3, tones[1 + beat % 2], .42, duty=.125, r=.02)
            else:
                for k in range(4):
                    B.note('p2', g.t(tb + k * .25), g.b * .2, tones[1 + k % 2] + 12, .25 + .04 * (bar - 4), duty=.125,
                           r=.01)
            (B.kick if beat % 2 == 0 else B.snare)(g.t(tb), .85 if beat % 2 == 0 else .6)
            B.hat(g.t(tb + .5), .22)
            if bar in (4, 5):
                B.snare(g.t(tb + .5), .25)
            if bar == 6:
                B.snare(g.t(tb + .5), .4)
    for k in range(16):  # дробь к стопу
        B.snare(g.t(28 + k * .25), .2 + .04 * k)
    B.crash(g.t(0), .4)
    B.crash(g.t(16), .45)
    # стоп-удар: экран краснеет
    MARK['stop'] = r3(t1)
    B.crash(t1, 1.)
    B.note('tri', t1, .32, nm('D2'), 1., r=.08, a=.001)
    B.note('noi', t1, .02, 9, .7, d=.2, s=0, r=.15, a=.001)
    B.note('p1', t1, .14, nm('D5'), .7, d=.1, s=.3, r=.05, a=.001)
    B.note('p2', t1, .14, nm('A4'), .55, duty=.5, d=.1, s=.3, r=.05, a=.001)
    # строка 42 — почти тишина: низкий гул и сердцебиение
    MARK['tishina42'] = r3(L(42))
    B.note('tri', L(42) + .05, E(42) - L(42) - .1, nm('D2'), .5, a=.3, r=.4)
    for k in (.5, 1.6, 2.7):
        if L(42) + k + .3 < E(42):
            B.note('tri', L(42) + k, .07, 45, .7, slide=-14, r=.02, a=.001)
            B.note('tri', L(42) + k + .22, .06, 43, .5, slide=-12, r=.02, a=.001)

    # ===== 7. Прощание с конём (ст. 8–10): медленно, грустно и тепло =====
    t0, t1 = E(42) + .2, EV['leave']
    MARK['proshchanie'] = r3(t0)
    g = fit(t0, t1, 14)
    chords = 'F C Dm Bb F C Bb|C F Dm Bb Gm A Bb|C F'.split()
    mel(B, 'p1', g, 0, "A4:1.5 G4:.5 F4:1 C5:1 "
        "G4:2 E4:1 G4:1 "
        "F4:1.5 E4:.5 D4:1 A4:1 "
        "Bb4:3 A4:.5 G4:.5 "
        "A4:1.5 C5:.5 F5:1 E5:.5 D5:.5 "
        "C5:1.5 Bb4:.5 A4:1 G4:1 "
        "F4:1 G4:1 A4:1 Bb4:.5 G4:.5 "
        "F4:4 "
        "D5:1.5 C5:.5 A4:1 D5:1 "
        "F5:2 E5:1 D5:1 "
        "D5:1.5 Bb4:.5 G4:1 Bb4:1 "
        "A4:2 C#5:1 E5:1 "
        "D5:1.5 C5:.5 Bb4:1 G4:1 "
        "A4:4", .6, duty=.5, gate=.95, vib=.25, a=.02, r=.12, echo=.3, expect=56)
    for bar, spec in enumerate(chords):
        for e, ix in enumerate([0, 2, 3, 4, 5, 4, 3, 2]):
            c = chord_at(spec, e * .5)
            B.note('p2', g.t(bar * 4 + e * .5), g.b * .45, ctones(c, nm('F3'))[ix], .22, duty=.25, d=.3, s=.4, r=.08,
                   echo=.3)
        hs = halves(spec)
        if bar in (7, 13):
            B.note('tri', g.t(bar * 4), g.b * 3.9, croot(spec) + (12 if croot(spec) < 36 else 0), .75, r=.15)
        else:
            for k, b in enumerate((0, 2)):
                c = chord_at(spec, b)
                B.note('tri', g.t(bar * 4 + b), g.b * 1.9, croot(c) + (12 if croot(c) < 36 else 0), .75, r=.05)
        if bar >= 8:
            for b in (1, 3):
                B.note('noi', g.t(bar * 4 + b), .01, 1, .12, d=.06, s=0, r=.04)
    # после «КОНЬ ПОКИНУЛ ОТРЯД» — тихий аккорд до «ПРОШЛО МНОГО ЛЕТ»
    a, b = EV['leave'] + .9, EV['years'] - .05
    if b - a > .4:
        B.note('tri', a, b - a, nm('D2'), .6, a=.1, r=.1)
        B.note('p2', a, b - a, nm('F4'), .22, duty=.25, a=.3, r=.15, vib=.15, echo=.3)
        B.note('p1', a + .1, b - a - .1, nm('A4'), .2, duty=.5, a=.3, r=.15, vib=.15)

    # ===== 8. Пир (ст. 11): джига «таверна», 6/8 (доля — восьмая) =====
    t0, t1 = L(61) - .17, E(66) + .35
    MARK['pir'] = r3(t0)
    g = fit(t0, t1, 14, bpb=6)
    chords = 'D G D A D G A D Dm C Bb A D A|D'.split()
    mel(B, 'p1', g, 0, "A4:1 D5:1 F#5:1 A5:2 F#5:1 "
        "G5:1 B5:1 G5:1 F#5:1 E5:1 D5:1 "
        "F#5:2 A5:1 D6:2 A5:1 "
        "E5:1 F#5:1 E5:1 C#5:2 A4:1 "
        "D5:1 F#5:1 A5:1 B5:2 A5:1 "
        "G5:1 F#5:1 E5:1 D5:1 E5:1 G5:1 "
        "F#5:1 E5:1 D5:1 C#5:1 E5:1 A4:1 "
        "D5:3 A4:1 D5:2 "
        "D5:2 D5:1 A4:1 D5:1 F5:1 "      # «поминают… битвы» — мотив похода в ритме джиги
        "E5:2 E5:1 C5:1 E5:1 G5:1 "
        "F5:2 D5:1 Bb5:2 A5:1 "
        "A5:2 G5:1 E5:1 C#5:1 A4:1 "
        "D5:1 F#5:1 A5:1 D6:2 A5:1 "
        "G5:1 E5:1 C#5:1 D5:3", .75, gate=.8, vib=.08, expect=84)
    for bar, spec in enumerate(chords):
        for e in range(6):
            tb = bar * 6 + e
            c = chord_at(spec, e, 6)
            if e in (1, 2, 4, 5):
                B.note('p2', g.t(tb), g.b * .5, ctones(c, nm('F#4'))[e % 2], .3, duty=.125, r=.015)
            if e in (0, 3):
                rt = croot(c)
                B.note('tri', g.t(tb), g.b * 1.7, rt if e == 0 else rt + 7 - (12 if rt + 7 > 42 else 0), .85, r=.01)
                B.kick(g.t(tb), .45)
            B.note('noi', g.t(tb), .006, 1, [.3, .12, .18, .28, .12, .18][e], short=True, d=.03, s=0, r=.02, a=.0005)

    # ===== 9. Тревога (ст. 12) =====
    t0, t1 = E(66) + .35, E(72) + .4
    MARK['trevoga'] = r3(t0)
    g = fit(t0, t1, 8)
    chords = 'Dm Dm Bb A Dm Gm Eb A'.split()
    OST = {'Dm': 'D5 A4 Eb5 A4 D5 A4 F5 A4', 'Bb': 'D5 Bb4 Eb5 Bb4 D5 Bb4 F5 Bb4', 'A': 'C#5 A4 E5 A4 C#5 A4 F5 A4',
           'Gm': 'D5 G4 Eb5 G4 D5 G4 Bb4 G4', 'Eb': 'Eb5 G4 Bb4 G4 Eb5 G4 D5 G4'}
    for bar, c in enumerate(chords):
        rt = croot(c)
        if bar < 7:
            for e, x in enumerate(OST[c].split()):
                B.note('p2', g.t(bar * 4 + e * .5), g.b * .25, nm(x), .28, duty=.125, d=.1, s=.4, r=.02)
                B.tick(g.t(bar * 4 + e * .5), .12 if e % 2 else .2)
            for b in (0, 2):  # сердцебиение
                B.note('tri', g.t(bar * 4 + b), g.b * .18, rt, .8, r=.01)
                B.note('tri', g.t(bar * 4 + b + .375), g.b * .18, rt, .65, r=.01)
        else:  # «почил» — гаснет
            B.note('tri', g.t(bar * 4), g.b * 3.9, rt, .7, r=.3)
    mel(B, 'p1', g, 0, "A4:2 Bb4:2 A4:3 r:1 D5:2 C5:1 Bb4:1 A4:3 r:1 F5:2 r:2 r:4 G4:2 Bb4:1 Eb5:1 C#5:4", .5,
        duty=.5, gate=.95, vib=.25, a=.04, r=.12, echo=.25, expect=32)
    MARK['vspyshka'] = EV['w_burn']  # «бурный, игривый» — вспышка-воспоминание: мотив похода
    mel(B, 'p1', Grid(EV['w_burn'], 134), 0, MARCH_MOTIF, .55, gate=.85, echo=.3)

    # ===== 10. Гнев (ст. 13) =====
    t0, t1 = E(72) + .4, E(78) + .3
    MARK['gnev'] = r3(t0)
    g = fit(t0, t1, 9)
    chords = 'Dm Dm Bb A Dm Dm Gm A Dm'.split()
    mel(B, 'p1', g, 0, "D5:.5 D5:.5 F5:.5 D5:.5 G#5:1 A5:1 "
        "F5:.5 E5:.5 D5:.5 C#5:.5 D5:2 "
        "F5:.5 F5:.5 Bb5:.5 F5:.5 D6:1 C6:.5 Bb5:.5 "
        "A5:1 G5:.5 F5:.5 E5:1 C#5:1 "
        "D6:.5 C6:.5 A5:.5 F5:.5 G#5:1 A5:1 "
        "r:1 D5:.5 F5:.5 A5:1 G#5:1 "
        "G5:.5 Bb5:.5 D6:1 C6:.5 Bb5:.5 A5:1 "
        "A5:1.5 G5:.25 F5:.25 E5:1 C#5:1 "
        "D5:4", .7, gate=.85, vib=.1, expect=36)
    for bar, c in enumerate(chords):
        rt = croot(c)
        r4, f4 = ctones(c, nm('C4'))[0], ctones(c, nm('C4'))[2]
        if bar < 8:
            for e in range(8):
                tb = bar * 4 + e * .5
                B.note('tri', g.t(tb), g.b * .42, rt + (12 if e % 2 else 0), .9, r=.01)
                acc = e in (0, 3, 6)  # 3+3+2
                B.note('p2', g.t(tb), g.b * .2, r4 if acc else f4, .4 if acc else .16, duty=.25, r=.015)
                B.hat(g.t(tb), .2 if e % 2 == 0 else .12)
            for b in (0, 1.5, 2):
                B.kick(g.t(bar * 4 + b), .9)
            for b in (1, 3):
                B.snare(g.t(bar * 4 + b), .65)
        else:
            B.note('tri', g.t(bar * 4), g.b * 3.9, rt, .8, r=.2)
            B.note('p2', g.t(bar * 4), g.b * 3.5, r4, .3, duty=.25, d=.8, s=.2, r=.2)
    bx = int(round((EV['w_prezr'] - t0) / (4 * g.b)))  # такт со «взрывом» лица
    for bar in sorted({0, 4, bx, 8}):
        B.crash(g.t(bar * 4), .5)

    # ===== 11. Холм и череп (ст. 14–15): пустота, ветер =====
    t0, t1 = E(78) + .3, E(90) + .25
    MARK['holm'] = r3(t0)
    g = fit(t0, t1, 8)
    for bar, x in enumerate('D2 C2 Bb1 A1 D2 Bb1 G1 A1'.split()):
        B.note('tri', g.t(bar * 4), g.b * 3.9, nm(x), .7, a=.05, r=.3)
    B.note('noi', t0, t1 - t0, lambda tt: 8.2 + .9 * np.sin(2 * np.pi * tt / 9.1) + .4 * np.sin(2 * np.pi * tt / 3.7),
           .26, a=2., r=1.5, trem=lambda tt: .5 + .3 * np.sin(2 * np.pi * tt / 6.3) + .2 * np.sin(2 * np.pi * tt / 2.9))
    for bar, pr in enumerate([('A4', 'F4'), ('G4', 'E4'), ('F4', 'D4'), ('E4', 'C#4')]):
        for b, x in zip((0, 2.5), pr):
            B.note('p2', g.t(bar * 4 + b), g.b * .4, nm(x), .28, duty=.125, d=.35, s=0, r=.1, echo=.45)
    mel(B, 'p1', g, 16, "D5:1.5 C5:.5 A4:1 D5:1 F5:2 E5:1 D5:1 D5:1.5 Bb4:.5 G4:1 Bb4:1 A4:2 C#5:1 E5:1", .42,
        duty=.5, gate=.95, vib=.25, a=.05, r=.15, echo=.35, expect=16)

    # ===== 12. Напряжение (ст. 16, начало) =====
    t0, t1 = E(90) + .25, EV['boss']
    MARK['napryazhenie'] = r3(t0)
    g = fit(t0, t1, 4)
    for beat in range(16):
        B.note('tri', g.t(beat), g.b * .12, nm('D2'), .8, r=.01)
        B.note('tri', g.t(beat + .3), g.b * .12, nm('D2'), .6, r=.01)
        B.tick(g.t(beat), .2)
        for k in range(4):
            B.note('p2', g.t(beat + k * .25), g.b * .2, nm('A5') + k % 2, .1 + .01 * beat, duty=.125, r=.01)
    mel(B, 'p1', g, 0, "D4:4 Eb4:4 E4:4 F4:2 F#4:2", .45, gate=.97, a=.1, vib=.1, r=.05, expect=16)
    for k in range(16):
        B.snare(g.t(12 + k * .25), .1 + .035 * k)

    # ===== 13. Босс: ЗМИЯ =====
    t0, t1 = EV['boss'], EV['w_vskr']
    MARK['boss'] = r3(t0)
    g = fit(t0, t1, 5)
    chords = 'Dm Eb Dm Bb A'.split()
    mel(B, 'p1', g, 0, "D5:1 C#5:.5 D5:.5 F5:1 E5:1 "
        "Eb5:1 D5:.5 Eb5:.5 G5:1 Bb5:1 "
        "A5:.5 G#5:.5 A5:.5 D6:.5 C6:1 A5:1 "
        "Bb5:.5 A5:.5 G5:.5 F5:.5 D5:1 F5:1 "
        "E5:.5 F5:.5 G5:.5 A5:.5 Bb5:.5 C#6:.5 E6:1", .8, gate=.85, expect=20)
    for bar, c in enumerate(chords):
        tones = ctones(c, nm('D5'), 4)
        rt = croot(c)
        for beat in range(4):
            tb = bar * 4 + beat
            for k, ix in enumerate([0, 1, 2, 3] if beat % 2 == 0 else [3, 2, 1, 0]):
                B.note('p2', g.t(tb + k * .25), g.b * .2, tones[ix], .3, duty=.125, r=.01)
            for k, o in enumerate([0, 0] if beat % 2 == 0 else [12, 0]):
                B.note('tri', g.t(tb + k * .5), g.b * .42, rt + o, .95, r=.01)
            B.kick(g.t(tb), .85)
            if beat % 2:
                B.snare(g.t(tb), .65)
            for k in range(4):
                B.hat(g.t(tb + k * .25), .12)
    B.crash(g.t(0), .55)

    # ===== 14. Реквием (ст. 17) =====
    t0, t1 = L(97) - .05, EV['fin']
    MARK['rekviem'] = r3(t0)
    g = fit(t0, t1, 5)
    mel(B, 'tri', g, 0, "D2:2 A1:2 Bb1:2 F2:2 G1:2 A1:2 D2:2 C2:2 Bb1:2 A1:2", .8, gate=.97, r=.1, expect=20)
    mel(B, 'p1', g, 0, "A4:2 G4:1 F4:1 F4:1.5 G4:.5 A4:1 Bb4:1 C5:2 Bb4:1 A4:1 " + MARCH_MOTIF +
        " C5:1 Bb4:1 A4:1 C#5:.5 E5:.5", .5, duty=.5, gate=.93, vib=.25, a=.04, r=.15, echo=.35, expect=20)
    for bar, spec in enumerate('Dm Bb Gm|A Dm Bb|A'.split()):
        for beat in range(4):
            c = chord_at(spec, beat)
            B.note('p2', g.t(bar * 4 + beat), g.b * .9, ctones(c, nm('D4'))[beat % 3], .18, duty=.125, d=.4, s=.2,
                   r=.1, echo=.3)
        B.note('noi', g.t(bar * 4), .02, 10, .25, d=.5, s=0, r=.4)

    # ===== 15. Финал: титульная тема медленно, финальный аккорд =====
    t0 = EV['fin']
    MARK['final'] = r3(t0)
    lf = TOTAL - t0
    ch_len = min(2.2, max(1.4, lf * .38))
    g = Grid(t0, 6 * 60 / (lf - ch_len))
    mel(B, 'p1', g, 0, "D5:.75 A4:.25 D5:.5 F5:.5 A5:1.5 G5:.25 F5:.25 E5:1 C#5:1", .75, gate=.9, vib=.15, expect=6)
    mel(B, 'p2', g, 0, "F4:.75 F4:.25 A4:.5 A4:.5 C5:1.5 Bb4:.25 A4:.25 A4:1 G4:1", .5, duty=.125, gate=.9, expect=6)
    mel(B, 'tri', g, 0, "D2:.5 D3:.5 D2:.5 D3:.5 F2:.5 F3:.5 F2:.5 F3:.5 A1:1 A1:1", .85, gate=.85, r=.01, expect=6)
    for b in range(6):
        B.hat(g.t(b + .5), .15)
        if b < 4:
            (B.kick if b % 2 == 0 else B.snare)(g.t(b), .7 if b % 2 == 0 else .4)
    tc = g.t(6)
    MARK['akkord'] = r3(tc)
    B.crash(tc, .35)
    B.note('tri', tc, ch_len - .45, nm('D2'), .85, r=.3)
    B.note('p1', tc, ch_len - .3, nm('D5'), .75, d=.9, s=.3, r=.35, vib=.2, echo=.4)
    for i, x in enumerate(['D4', 'F4', 'A4', 'D5']):
        B.note('p2', tc + i * .06, .05, nm(x), .45, duty=.125, r=.01, echo=.3)
    B.note('p2', tc + .24, ch_len - .55, nm('F5'), .4, duty=.125, d=.9, s=.25, r=.35, vib=.2, echo=.4)
    return B


# ---------- шумы и джинглы (каждый — свой короткий буфер) ----------
def fxbus(dur):
    return Bus(int(dur * SR) + 1)


def fx_start():  # «старт»
    b = fxbus(.7)
    for i, x in enumerate(['G5', 'C6', 'G6']):
        b.note('p1', i * .045, .04, nm(x), .9, duty=.5, r=.008)
    b.note('p1', .14, .25, nm('G6'), .8, duty=.25, d=.09, s=0, r=.05)
    b.note('p2', .14, .25, nm('C6'), .45, duty=.125, d=.09, s=0, r=.05, echo=.3)
    return b.stereo()


def fx_coin():  # «+СЛАВА»
    b = fxbus(.7)
    b.note('p1', 0, .055, nm('E6'), .8, duty=.25, r=.005)
    b.note('p1', .06, .4, nm('B6'), .8, duty=.25, d=.12, s=0, r=.06)
    return b.stereo()


def fx_clang():  # мечи, сеча
    b = fxbus(.7)
    b.note('noi', 0, .01, 0, .9, short=True, d=.18, s=0, r=.12, a=.0005)
    b.note('noi', 0, .01, 3, .6, d=.03, s=0, r=.02, a=.0005)
    b.note('p1', 0, .02, 95.3, .5, duty=.125, d=.2, s=0, r=.15, a=.0005, vib=.3, vibr=31, vibd=0)
    b.note('p2', 0, .02, 100.6, .45, duty=.125, d=.15, s=0, r=.12, a=.0005, vib=.3, vibr=37, vibd=0)
    return b.stereo()


def fx_lightning():  # молния Перуна
    b = fxbus(1.8)
    b.note('noi', 0, .01, .5, 1., d=.09, s=0, r=.06, a=.0005)
    b.note('noi', .035, .02, 2, .6, d=.06, s=0, r=.05, a=.0005)
    b.note('noi', .02, .9, lambda tt: 11 + 2.5 * np.clip(tt / 1.2, 0, 1), .8, d=.45, s=0, r=.35, a=.01)
    return b.stereo()


def fx_shield():  # щит на вратах
    b = fxbus(.7)
    b.note('tri', 0, .1, 62, 1., slide=-30, stime=.12, r=.04, a=.0005)
    b.note('noi', 0, .02, 8, .8, d=.08, s=0, r=.06, a=.0005)
    b.note('noi', 0, .01, 1, .5, short=True, d=.12, s=0, r=.08, a=.0005)
    b.note('p1', 0, .02, 84, .35, duty=.125, d=.1, s=0, r=.08, a=.0005)
    return b.stereo()


def fx_miss():  # «ПРОМАХ»
    b = fxbus(.35)
    b.note('p2', 0, .05, nm('E6'), .8, duty=.125, r=.01)
    b.note('p2', .065, .07, nm('A5'), .8, duty=.125, r=.02, slide=-1)
    return b.stereo()


def fx_clink():  # чаши
    b = fxbus(.6)
    for t, m in [(0, 100.2), (.11, 103.1)]:
        b.note('p1', t, .01, m, .6, duty=.125, d=.07, s=0, r=.05, a=.0005)
        b.note('noi', t, .005, 0, .4, short=True, d=.03, s=0, r=.02, a=.0005)
    return b.stereo()


def fx_boom():  # лицо кудесника рассыпается пикселями
    b = fxbus(1.5)
    b.note('noi', 0, .01, 1, .7, d=.05, s=0, r=.04, a=.0005)
    b.note('noi', 0, .05, lambda tt: 6 + 7 * np.clip(tt / .9, 0, 1), 1., d=.35, s=0, r=.3, a=.002)
    b.note('tri', 0, .2, 50, .8, slide=-24, stime=.25, r=.06, a=.001)
    rng = np.random.default_rng(76)
    m = 86
    for k in range(7):
        b.note('p2', .08 + k * .05, .035, m, .3, duty=.125, r=.01)
        m -= int(rng.integers(2, 5))
    return b.stereo()


def fx_rain(dur=1.9):
    b = fxbus(dur + .6)
    b.note('noi', 0, dur, 1.5, .5, a=.25, r=.35)
    rng = np.random.default_rng(83)
    for t in np.sort(rng.uniform(0, dur, 26)):
        b.note('noi', t, .004, 0, rng.uniform(.3, .7), short=True, d=.012, s=0, r=.01, a=.0005)
    return b.stereo()


def fx_wind(dur=2.6):
    b = fxbus(dur + .7)
    env = lambda tt: np.sin(np.pi * np.clip(tt / dur, 0, 1))
    b.note('noi', 0, dur, lambda tt: 7.5 - 1.5 * env(tt), .8, a=.5, r=.4, trem=lambda tt: .45 + .55 * env(tt))
    return b.stereo()


def fx_crunch():  # сапог на череп
    b = fxbus(.5)
    rng = np.random.default_rng(85)
    for k in range(6):
        b.note('noi', k * .022 + rng.uniform(0, .008), .006, float(rng.choice([4, 6, 8])), rng.uniform(.5, 1.),
               d=.015, s=0, r=.012, a=.0003, short=bool(k % 2))
    b.note('tri', 0, .05, 48, .5, slide=-10, r=.02, a=.0005)
    return b.stereo()


def fx_knock():  # v3: враг отлетает от удара
    b = fxbus(.45)
    b.note('noi', 0, .01, 5, .9, d=.06, s=0, r=.04, a=.0005)
    b.note('p1', 0, .12, nm('C5'), .7, duty=.25, slide=-12, stime=.12, r=.03, a=.0005)
    b.note('p2', .09, .1, nm('G5'), .4, duty=.125, slide=12, stime=.1, r=.03)
    return b.stereo()


def fx_bite():  # v3: укус босса — хруст, удар, «минус жизнь»
    b = fxbus(.7)
    b.note('noi', 0, .01, 2, 1., d=.08, s=0, r=.05, a=.0005)
    b.note('noi', .015, .01, .5, .7, short=True, d=.06, s=0, r=.04, a=.0005)
    b.note('tri', 0, .1, 50, 1., slide=-14, stime=.1, r=.03, a=.0005)
    b.note('p1', .07, .22, nm('E5'), .7, duty=.25, slide=-7, stime=.2, r=.05)
    b.note('p2', .07, .22, nm('E5') - .1, .35, duty=.125, slide=-7, stime=.2, r=.05)
    return b.stereo()


def fx_grow():  # v3: змея вырастает (как превращение босса)
    b = fxbus(.8)
    for i, x in enumerate(['C4', 'Eb4', 'G4', 'C5', 'Eb5']):
        b.note('p1', i * .05, .05, nm(x), .8, duty=.5, r=.01)
    b.note('noi', 0, .3, 6, .5, d=.25, s=0, r=.05)
    b.note('tri', 0, .3, 36, .9, slide=12, stime=.3, r=.05)
    return b.stereo()


def fx_hiss(dur):  # змея
    b = fxbus(dur + .5)
    b.note('noi', 0, dur, .2, .7, a=.15, r=.25, trem=lambda tt: .55 + .45 * np.abs(np.sin(2 * np.pi * 1.6 * tt)))
    return b.stereo()


def fx_vskr():  # удар и падение тона — потеря жизни
    b = fxbus(1.7)
    b.note('noi', 0, .02, 3, 1., d=.12, s=0, r=.1, a=.0005)
    b.note('noi', 0, .01, .5, .6, short=True, d=.08, s=0, r=.06, a=.0005)
    b.note('tri', 0, .12, 57, 1., slide=-28, stime=.15, r=.04, a=.0005)
    b.note('p1', .06, 1., nm('A5'), .7, duty=.25, slide=-36, stime=1., vib=.6, vibr=14, vibd=0, d=.8, s=.2, r=.15)
    b.note('p2', .06, 1., nm('A5') + .15, .35, duty=.125, slide=-36, stime=1., vib=.6, vibr=14, vibd=0, d=.8, s=.2,
           r=.15)
    return b.stereo()


def fx_quest():  # «НОВЫЙ КВЕСТ»
    b = fxbus(.8)
    for i, x in enumerate(['D5', 'F5', 'A5', 'C#6']):
        last = i == 3
        kw = dict(d=.12, s=.2, r=.05) if last else dict(r=.01)
        b.note('p1', i * .055, .13 if last else .047, nm(x), .9, duty=.25, **kw)
        b.note('p2', i * .055 + .025, .13 if last else .047, nm(x) - 12, .5, duty=.125, **kw)
    b.note('tri', 0, .26, nm('D3'), .8, r=.04)
    return b.stereo()


def fx_leave():  # «КОНЬ ПОКИНУЛ ОТРЯД»
    b = fxbus(1.8)
    t = 0
    seq = [('E5', .14), ('C5', .14), ('A4', .14), ('G#4', .2), ('A4', .5)]
    for i, (x, d_) in enumerate(seq):
        last = i == len(seq) - 1
        kw = dict(d=.35, s=.3, r=.12) if last else dict(r=.02)
        b.note('p1', t, d_ * .9, nm(x), .8, duty=.25, vib=.2 if last else 0, **kw)
        b.note('p2', t + .075, d_ * .9, nm(x), .35, duty=.125, **kw)
        t += d_
    for t_, d_, x in [(0, .42, 'A2'), (.42, .2, 'F2'), (.62, .2, 'E2'), (.82, .5, 'A1')]:
        b.note('tri', t_, d_ * .95, nm(x), .7, r=.04)
    return b.stereo()


def fx_years():  # «ПРОШЛО МНОГО ЛЕТ»
    b = fxbus(1.6)
    arp = ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6']
    for i, x in enumerate(arp):
        b.note('p2', i * .06, .1, nm(x), .6, duty=.125, d=.15, s=0, r=.06, echo=.45)
    t0 = len(arp) * .06
    for k in range(7):
        b.note('p1', t0 + k * .05, .045, nm('A5') if k % 2 == 0 else nm('D6'), .4 * (1 - k / 8), duty=.25, r=.01,
               echo=.4)
    b.note('tri', 0, .8, nm('D3'), .6, r=.1)
    return b.stereo()


def fx_gameover():  # «КОНЕЦ ИГРЫ»
    b = fxbus(2.8)
    for ch, vol, duty, seq in [
        ('p1', .8, .25, [(0, .18, 'A5'), (.2, .18, 'F5'), (.4, .18, 'D5'), (.7, .28, 'E5'), (1., .28, 'C#5'),
                         (1.35, .75, 'D5')]),
        ('p2', .5, .125, [(0, .18, 'F5'), (.2, .18, 'D5'), (.4, .18, 'A4'), (.7, .28, 'Bb4'), (1., .28, 'A4'),
                          (1.35, .75, 'F4')]),
        ('tri', .8, .5, [(0, .58, 'D3'), (.7, .28, 'G2'), (1., .28, 'A2'), (1.35, .75, 'D2')])]:
        for t, d_, x in seq:
            last = t > 1.3
            kw = dict(d=.5, s=.35, r=.2, vib=.25) if last and ch != 'tri' else dict(r=.2 if last else .03)
            b.note(ch, t, d_, nm(x), vol, duty=duty, **kw)
    return b.stereo()


# ---------- фильтры в частотной области (нулевая фаза) ----------
def kmag(f):
    """|H| K-фильтра BS.1770 для частот f (Гц) при SR."""
    w = 2 * np.pi * f / SR
    z1 = np.exp(-1j * w)
    z2 = z1 * z1
    K, Q = np.tan(np.pi * 1681.974450955533 / SR), .7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** .4996667741545416
    a0 = 1 + K / Q + K * K
    h1 = ((Vh + Vb * K / Q + K * K) + 2 * (K * K - Vh) * z1 + (Vh - Vb * K / Q + K * K) * z2) / a0 / \
         (1 + 2 * (K * K - 1) / a0 * z1 + (1 - K / Q + K * K) / a0 * z2)
    K, Q = np.tan(np.pi * 38.13547087602444 / SR), .5003270373238773
    a0 = 1 + K / Q + K * K
    h2 = (1 - 2 * z1 + z2) / (1 + 2 * (K * K - 1) / a0 * z1 + (1 - K / Q + K * K) / a0 * z2)
    return np.abs(h1 * h2)


def console(f):  # тракт приставки: срез ниже 30 Гц и мягкий спад выше 12 кГц
    x = (f / 30.) ** 2
    return x / np.sqrt(1 + x * x) / np.sqrt(1 + (f / 12000.) ** 2)


def pocket(f):  # «карман» для речи: спад около 2,7 кГц и срез выше 5 кГц
    fl = np.maximum(f, 1.)
    return 10 ** (-6 / 20 * np.exp(-(np.log2(fl / 2700.) / .8) ** 2)) / np.sqrt(1 + (f / 5000.) ** 4)


_HCACHE = {}


def H(name, nf):
    key = (name, nf)
    if key not in _HCACHE:
        fn = {'k': kmag, 'con': console, 'poc': lambda f: console(f) * pocket(f)}[name]
        nb = nf // 2 + 1
        out = np.empty(nb, np.float32)
        for a in range(0, nb, 1 << 20):
            f = np.arange(a, min(nb, a + (1 << 20))) * (SR / nf)
            out[a:a + len(f)] = fn(f)
        _HCACHE[key] = out
    return _HCACHE[key]


def nfft(n):
    return 1 << int(np.ceil(np.log2(n + 8192)))


def ffilt(x, name):
    """Фильтр по последней оси (моно или (2, n))."""
    n = x.shape[-1]
    nf = nfft(n)
    X = np.fft.rfft(x, nf)
    X *= H(name, nf)
    return np.fft.irfft(X, nf)[..., :n].astype(np.float32)


dB = lambda p: 10 * np.log10(max(float(p), 1e-20))
db = lambda x: 10 ** (x / 20)
f1 = lambda x: f'{x:.1f}'


def csum_energy(*chs):
    e = np.zeros(chs[0].shape[-1] + 1, np.float64)
    acc = np.zeros(chs[0].shape[-1], np.float64)
    for c in chs:
        acc += c.astype(np.float64) ** 2
    np.cumsum(acc, out=e[1:])
    return e


def msw(cs, wins):
    s = c = 0
    for a, b in wins:
        ia, ib = max(0, int(a * SR)), min(len(cs) - 1, int(b * SR))
        if ib > ia:
            s += cs[ib] - cs[ia]
            c += ib - ia
    return s / max(1, c)


# ---------- главное ----------
def main():
    import time
    tm = time.time()
    print(f'события: {ev_src}; intro {V0}, outro {OUTRO}, длина {TOTAL} с ({N} отсчётов), fin {EV["fin"]}')
    B = compose()
    print(f'ноты: {time.time() - tm:.1f} с')

    # голос в ролике: моно в оба канала с полным уровнем, с V0
    rawv = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(POEM / 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar',
                           str(SR), '-'], capture_output=True, check=True).stdout
    voice = np.frombuffer(rawv, np.float32)
    vt = np.zeros(N, np.float32)
    i0 = int(round(V0 * SR))
    vt[i0:i0 + len(voice)] = voice[:N - i0]
    kv = ffilt(vt, 'k')
    csv = csum_energy(kv, kv)  # два канала
    speech = [(L(n), E(n)) for n in range(1, NL + 1)]
    vK = dB(msw(csv, speech))
    vref = [None] + [float(np.clip(dB(msw(csv, [w])), vK - 6, vK + 3)) for w in speech]
    del kv

    # присутствие голоса: 1 в строках (короткие паузы < 0,5 с тоже), плавные края 0,12 с
    pres = np.zeros(N, np.float32)
    for n in range(1, NL + 1):
        pres[int((L(n) - .03) * SR):int((E(n) + .03) * SR)] = 1
        if n < NL and L(n + 1) - E(n) < .5:
            pres[int(E(n) * SR):int(L(n + 1) * SR)] = 1
    k = int(.12 * SR)
    c = np.concatenate([[0.], np.cumsum(pres, dtype=np.float64)])
    pres = np.empty(N, np.float32)
    idx = np.arange(N)
    pres[:] = (c[np.minimum(N, idx + k // 2)] - c[np.maximum(0, idx - k // 2)]) / k
    del c, idx

    # пульсы, шум, эхо: под голосом — «карман» и −3 дБ; треугольник — только тракт
    duck = db(DUCK_DB)
    music = np.zeros((2, N), np.float32)
    for name in ('p1', 'p2', 'noi', 'send'):
        x = B.send if name == 'send' else B.c[name]
        nf = nfft(N)
        X = np.fft.rfft(x, nf)
        full = np.fft.irfft(X * H('con', nf), nf)[:N].astype(np.float32)
        X *= H('poc', nf)
        y = np.fft.irfft(X, nf)[:N].astype(np.float32)
        del X
        y *= pres * duck
        y += full * (1 - pres)
        del full
        if name == 'send':
            music[0] += fbdelay(y, int(.23 * SR), .35)
            music[1] += fbdelay(y, int(.31 * SR), .35)
        else:
            gl, gr = panlr(PANS[name])
            music[0] += y * gl
            music[1] += y * gr
        del y
    music += ffilt(B.c['tri'], 'con')[None, :]
    del B
    print(f'синтез и фильтры: {time.time() - tm:.1f} с')

    # ---------- форма громкости: цель — K-уровень к голосу ----------
    km = ffilt(music, 'k')
    csm = csum_energy(km[0], km[1])
    del km
    lvl = lambda wins: dB(msw(csm, wins))
    SL = {}
    for n in range(1, NL + 1):
        SL.setdefault(STZ[n - 1], []).append(n)
    reg = lambda n: n not in FREE and n not in LINE_ABS
    gst = {s: db(np.mean([vref[n] for n in ns if reg(n)]) + UNDER[s - 1] - lvl([speech[n - 1] for n in ns if reg(n)]))
           for s, ns in SL.items()}
    gl_ = [None] * (NL + 1)
    for n in range(1, NL + 1):
        s = STZ[n - 1]
        if n in FREE:
            gl_[n] = gl_[n - 1] if n > 1 else gst[s]
        elif n in LINE_ABS:
            gl_[n] = float(np.clip(db(vref[n] + LINE_ABS[n] - lvl([speech[n - 1]])), gst[s] * db(-25), gst[s]))
        else:
            gl_[n] = float(np.clip(db(vref[n] + UNDER[s - 1] - lvl([speech[n - 1]])), gst[s] * db(-6), gst[s] * db(6)))
    gfor = lambda w, target, lo=0., hi=1e9: float(np.clip(db(vK + target - lvl([w])), lo, hi))

    # голос в паузах (смех, вдох): громкая пауза начинается после него
    def voice_tail(a, b):
        fr = int(.02 * SR)
        last = a
        for i in range(int(a * SR), int(b * SR) - fr, fr):
            if dB((csv[i + fr] - csv[i]) / fr) > vK - 30:
                last = (i + fr) / SR
        return last

    ts = EV['start']
    gi = gfor((.2, ts - .05), INTRO_DB)
    gfill = gfor((ts + .25, V0 - .05), FILL_DB, gl_[1], gi)
    keys = [(0, gi), (ts - .005, gi), (ts + .1, gfill), (L(1) - .25, gfill), (L(1) - .02, gl_[1])]
    loud = []  # громкие окна для отчёта
    for n in range(1, NL + 1):
        if keys[-1][0] < L(n):
            keys.append((L(n), gl_[n]))
        keys.append((E(n), gl_[n]))
        if n == NL:
            break
        s, g0, g1 = STZ[n - 1], gl_[n], gl_[n + 1]
        a = max(E(n) + .2, voice_tail(E(n) + .05, L(n + 1) - .3) + .12)
        w = (a, L(n + 1) - .2)
        if s != STZ[n] and s in SWELL and w[1] - w[0] > .35:
            g = gfor(w, SWELL[s], min(g0, g1) * db(-3), max(g0, g1) * db(12))
            keys += [(w[0] - .15, g0), (w[0], g), (w[1], g), (L(n + 1) - .03, g1)]
            loud.append((f'пауза {s}/{s + 1}', w))
        elif n == 41:  # стоп-удар перед строкой 42
            tsp = MARK['stop']
            keys += [(E(n) + .03, g0), (tsp - .02, g0), (tsp, g0 * db(3)), (L(n + 1) - .08, g0 * db(3)),
                     (L(n + 1) - .02, g1)]
        else:
            keys += [(E(n) + .03, g0), (L(n + 1) - .03, g1)]
    gb = gfor((E(NL) + .3, EV['fin'] - .1), BUILD_DB, gl_[NL], gl_[NL] * db(12))
    gf = gfor((EV['fin'], EV['fin'] + 3), FIN_DB)
    keys += [(E(NL) + .05, gl_[NL]), (E(NL) + .3, gb), (EV['fin'] - .1, gb), (EV['fin'], gf), (TOTAL - 2., gf),
             (TOTAL - .01, 0.), (TOTAL, 0.)]
    loud += [('финальная строфа → финал', (E(NL) + .3, EV['fin'] - .1))]
    kt = np.array([k_[0] for k_ in keys])
    kg = np.array([k_[1] for k_ in keys])
    order = np.argsort(kt, kind='stable')
    gain = np.interp(np.arange(N) / SR, kt[order], kg[order]).astype(np.float32)
    music *= gain[None, :]
    del gain

    # тишина: после «вскрикнул» до эпилога; после грустного джингла — до тихого аккорда
    def mute(a, b, fade=.005):
        ia, ib, nfd = int(a * SR), int(b * SR), int(fade * SR)
        music[:, ia:ib] = 0
        music[:, max(0, ia - nfd):ia] *= np.linspace(1, 0, min(nfd, ia))[None, :]
        music[:, ib:ib + nfd] *= np.linspace(0, 1, nfd)[None, :]

    mute(EV['w_vskr'], L(97) - .06, .004)
    mute(EV['leave'] - .03, EV['leave'] + .85, .06)

    # ---------- шумы и джинглы ----------
    fx = np.zeros((2, N), np.float32)
    lines_k = [(L(n), E(n), vref[n]) for n in range(1, NL + 1)]

    def ref_at(a, b):
        s = d = 0.
        for la, le, v in lines_k:
            o = min(b, le) - max(a, la)
            if o > 0:
                s += o * 10 ** (v / 10)
                d += o
        return dB(s / d) if d > .1 else vK

    SFX, FXW = {}, []

    def place(key, t, buf, peak=False):
        """peak: пик буфера — на t + кадр; иначе первая атака — на t + кадр."""
        target, win = FXL[key]
        if peak:
            seg = np.abs(buf[:, :SR // 2]).max(axis=0)
            pi = int(np.argmax(seg))
        else:
            pi = int(.004 * SR)
        tp = t + FRAME
        t0 = tp - pi / SR
        w0 = max(0, pi - int(.01 * SR))
        n = buf.shape[1]
        wn = n - w0 if win is None else min(n - w0, int(win * SR))
        kb = ffilt(buf, 'k')
        e = float((kb[:, w0:w0 + wn].astype(np.float64) ** 2).sum(axis=0).mean())
        a, b = t0 + w0 / SR, t0 + (w0 + wn) / SR
        g = np.sqrt(10 ** ((ref_at(a, b) + target) / 10) / max(e, 1e-20))
        i0 = int(round(t0 * SR))
        ia, ib = max(0, i0), min(N, i0 + n)
        fx[:, ia:ib] += buf[:, ia - i0:ib - i0] * g
        SFX.setdefault(key, []).append(r3(tp))
        FXW.append((key, (a, b)))

    place('start', EV['start'], fx_start())
    for w in ('w_pozh', 'w_slava'):
        place('coin', EV[w], fx_coin())
    for w in ('w_mech', 'w_secha'):
        place('clang', EV[w], fx_clang(), peak=True)
    place('lightning', EV['w_perun'], fx_lightning(), peak=True)
    place('shield', EV['w_shchit'], fx_shield(), peak=True)
    for w in ('w_prashch', 'w_strela', 'w_kinzhal'):
        place('miss', EV[w] + .35, fx_miss())
    place('quest', EV['quest'], fx_quest())
    place('leave', EV['leave'], fx_leave())
    place('years', EV['years'], fx_years())
    place('clink', EV['w_zvon'], fx_clink(), peak=True)
    place('boom', EV['w_prezr'], fx_boom(), peak=True)
    place('rain', EV['w_dozhd'], fx_rain())
    place('wind', EV['w_veter'], fx_wind())
    place('crunch', EV['w_nastup'], fx_crunch(), peak=True)
    place('hiss', EV['w_ship'], fx_hiss(EV['w_obvil'] + .35 - EV['w_ship']))
    for tk in EV.get('knock', []):
        place('knock', tk, fx_knock())
    for tg in EV.get('grow', []):
        place('grow', tg, fx_grow())
    for bk in ('bite1', 'bite2'):
        if bk in EV:
            place('bite', EV[bk], fx_bite(), peak=True)
    place('vskr', EV['w_vskr'], fx_vskr(), peak=True)
    place('gameover', EV['gameover'], fx_gameover())

    # ---------- сведение и запись ----------
    out = music + fx
    CEIL = db(-1.2)
    pk0 = float(np.abs(out).max())
    if pk0 > CEIL:  # ограничитель по блокам 5 мс с заглядыванием и плавным возвратом
        blk = int(.005 * SR)
        nb = -(-N // blk)
        pad = np.zeros((2, nb * blk), np.float32)
        pad[:, :N] = np.abs(out)
        bp = pad.reshape(2, nb, blk).max(axis=(0, 2))
        gb_ = np.minimum(1., CEIL / np.maximum(bp, 1e-9))
        gb_ = np.minimum(gb_, np.minimum(np.roll(gb_, 1), np.roll(gb_, -1)))
        for i in range(1, nb):
            gb_[i] = min(gb_[i], gb_[i - 1] + (1 - gb_[i - 1]) * .06)
        gcur = np.interp(np.arange(N), np.arange(nb) * blk + blk / 2, gb_).astype(np.float32)
        out *= gcur[None, :]
        music *= gcur[None, :]
        fx *= gcur[None, :]
        print(f'ограничитель: до {20 * np.log10(gb_.min()):.1f} дБ')
    out[:, -int(.03 * SR):] = 0
    if not np.isfinite(out).all():
        sys.exit('NaN/∞ в звуке')
    rng = np.random.default_rng(1822)
    q = np.round(out.T * 32767 + rng.random((N, 2)) - rng.random((N, 2)))
    q = np.clip(q, -32768, 32767).astype('<i2')
    with wave.open(args.out, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(q.tobytes())
    del q
    (HERE / 'sfx.json').write_text(json.dumps({
        'note': 'секунды ролика. Шумы и джинглы — время пика (шумы-удары) или первой атаки (джинглы, бипы, монетки, '
                'дождь, ветер, шипение), на кадр позже события. music — начала разделов музыки.',
        'V0': V0, 'OUTRO': OUTRO, 'total': TOTAL, **SFX, 'music': MARK}, ensure_ascii=False, indent=1),
        encoding='utf-8')

    # ---------- отчёт ----------
    km = ffilt(music, 'k')
    csm = csum_energy(km[0], km[1])
    del km
    kf = ffilt(fx, 'k')
    csf = csum_energy(kf[0], kf[1])
    del kf
    rel = lambda cs, wins: f1(dB(msw(cs, wins)) - vK)
    relmf = lambda wins: f1(dB(msw(csm, wins) + msw(csf, wins)) - vK)
    regl = [speech[n - 1] for n in range(1, NL + 1) if reg(n)]
    print(f'голос в местах речи: K {f1(vK - .691)} LUFS (моно в оба канала)')
    print(f'музыка под голосом (K, дБ к голосу): все строки {rel(csm, speech)}, без строк 42 и 96 {rel(csm, regl)}; '
          f'музыка + шумы {relmf(speech)}')
    stw = {s: [speech[n - 1] for n in ns] for s, ns in SL.items()}
    print('по строфам (K к голосу строфы):',
          '  '.join(f'{s}: {f1(dB(msw(csm, w)) - dB(msw(csv, w)))}' for s, w in stw.items()))
    per = [dB(msw(csm, [speech[n - 1]])) - dB(msw(csv, [speech[n - 1]])) for n in range(1, NL + 1)]
    perf = [dB(msw(csm, [speech[n - 1]]) + msw(csf, [speech[n - 1]])) - dB(msw(csv, [speech[n - 1]]))
            for n in range(1, NL + 1)]
    print('по строкам (K к голосу строки; музыка|+шумы):',
          ' '.join(f'{n}:{f1(per[n - 1])}|{f1(perf[n - 1])}' for n in range(1, NL + 1)))
    print(f'заставка K {rel(csm, [(.2, ts - .05)])}, «УРОВЕНЬ 1» {rel(csm, [(ts + .25, V0 - .05)])}, '
          f'финал K {rel(csm, [(EV["fin"], EV["fin"] + 3)])} (дБ к голосу)')
    print('громкие паузы (K):', ', '.join(f'{nm_} {rel(csm, [w])}' for nm_, w in loud))
    print('шумы и джинглы в своих окнах (K, дБ к голосу):', ', '.join(f'{k_} {rel(csf, [w])}' for k_, w in FXW))
    pm = float(np.abs(out).max())
    print(f'music.wav: пик {f1(20 * np.log10(pm))} dBFS (до ограничителя {f1(20 * np.log10(pk0))})')
    vpk = np.abs(vt[None, :] + out).max()
    print(f'голос + музыка: пик {f1(20 * np.log10(vpk))} dBFS')
    print('разделы:', json.dumps(MARK, ensure_ascii=False))
    print(f'готово за {time.time() - tm:.1f} с → {args.out}')


if __name__ == '__main__':
    main()
