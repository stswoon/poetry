#!/usr/bin/env python3
"""Проверка микса «Встречи зимы» (Никитин), независимо от make_music.py.

Если есть ../voice.mp3 — смешивает его (со сдвигом на вступление V0, моно в оба канала) и music.wav так же, как ролик
(оба с громкостью 1), и меряет:
  - music.wav: частоту, каналы, длину (должна быть total из events.json / sfx.json), собран ли по текущему events.json;
  - голос: совпадает ли его длина с events.json (V0 + голос + OUTRO = total);
  - подложку под голосом по строфам и по строкам (RMS, дБ к голосу): всё вместе (музыка + шумы) и вне окон разовых
    шумов (по sfx.json); цель — на 18–20 дБ тише голоса;
  - окна 0,4 с внутри строк (RMS и K-взвешенно, BS.1770);
  - вступление, паузы между строфами, «после голоса» и финал (без голоса) к среднему голосу;
  - пики и клиппинг; громкость смеси (ffmpeg ebur128) и пробный мастер −14 LUFS + alimiter.
Если голоса ещё нет — честно пишет, что проверка с голосом НЕ сделана, и меряет music.wav по окнам строк (L…E) к оценке
голоса из sfx.json (vref_db), плюс длину, пики, клиппинг и громкость самой музыки.
Запуск: python3 check_mix.py [путь к mix.wav] [--music music.wav] [--voice ../voice.mp3] [--sfx sfx.json]
        (по умолчанию смесь — во временной папке системы)
"""
import argparse
import json
import os
import re
import subprocess
import tempfile
import wave
import zlib

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
ap = argparse.ArgumentParser(description="проверка микса голоса и music.wav")
ap.add_argument("mix", nargs="?", default=os.path.join(tempfile.gettempdir(), "nikitin_vstrecha_mix.wav"))
ap.add_argument("--music", default=os.path.join(HERE, "music.wav"))
ap.add_argument("--voice", default=os.path.join(POEM, "voice.mp3"))
ap.add_argument("--sfx", default=os.path.join(HERE, "sfx.json"))
ap.add_argument("--events", default=os.path.join(HERE, "events.json"))
a = ap.parse_args()
with open(a.events, "rb") as f:
    EVB = f.read()
EV = json.loads(EVB.decode("utf-8"))
SFXJ = None
if os.path.exists(a.sfx):
    with open(a.sfx, encoding="utf-8") as f:
        SFXJ = json.load(f)
V0 = float((SFXJ or EV)["V0"])
shift = V0 - float(EV["V0"])
NL = len([k for k in EV if k[0] == "L" and k[1:].isdigit()])
SPEECH = [(EV[f"L{i}"] + shift, EV[f"E{i}"] + shift) for i in range(1, NL + 1)]
HAS_VOICE = os.path.exists(a.voice)
with wave.open(a.music) as wf:
    w_sr, w_ch, w_bits, w_n = wf.getframerate(), wf.getnchannels(), 8 * wf.getsampwidth(), wf.getnframes()


def dec(path, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path] + (["-af", af] if af else []) + ["-f", "f32le", "-ac", "2", "-ar",
                                                                                str(SR), "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype="<f4").astype(np.float64)
    return x.reshape(-1, 2).T


mus = dec(a.music)
n = mus.shape[1]
delay = int(round(V0 * 1000))
if HAS_VOICE:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.music, "-i", a.voice, "-filter_complex",
                    f"[1:a]aresample={SR},pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1[v];"
                    "[0:a][v]amix=inputs=2:duration=first:normalize=0[m]", "-map", "[m]", "-c:a", "pcm_f32le", a.mix],
                   check=True)
    vo_raw = dec(a.voice, "pan=stereo|c0=c0|c1=c0")
    VD = vo_raw.shape[1] / SR
    vo = dec(a.voice, f"pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1")
    vo = np.pad(vo, ((0, 0), (0, max(0, n - vo.shape[1]))))[:, :n]
    mix = dec(a.mix)


def resp(bb, aa, fr):
    z = np.exp(-2j * np.pi * fr / SR)
    return np.abs((bb[0] + bb[1] * z + bb[2] * z * z) / (aa[0] + aa[1] * z + aa[2] * z * z))


def kweight(x):  # K-фильтр BS.1770 (амплитудная характеристика, через FFT)
    nf = 1 << int(np.ceil(np.log2(len(x) + 4096)))
    fr = np.fft.rfftfreq(nf, 1 / SR)
    K = np.tan(np.pi * 1681.974450955533 / SR)
    Q = 0.7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    H = resp([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
             [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], fr)
    K = np.tan(np.pi * 38.13547087602444 / SR)
    Q = 0.5003270373238773
    a0 = 1 + K / Q + K * K
    H *= resp([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], fr)
    return np.fft.irfft(np.fft.rfft(x, nf) * H, nf)[:len(x)]


def ms(x, wins):
    """средняя мощность на канал в окнах"""
    s = c = 0
    for t0, t1 in wins:
        i0, i1 = max(0, int(t0 * SR)), min(n, int(t1 * SR))
        if i1 > i0:
            s += float(np.sum(x[:, i0:i1] ** 2)) / x.shape[0]
            c += i1 - i0
    return s / max(1, c)


dB = lambda v: 10 * np.log10(max(v, 1e-20))
f1 = lambda v: f"{v:+.1f}"
ok = lambda c: "да" if c else "НЕТ"
kM = np.stack([kweight(c) for c in mus])

RING = ("bom", "dzin", "ray", "gleam", "blesk")      # звонкие — хвост длиннее
SFXW = []
if SFXJ:
    for r in SFXJ["sfx"]:
        tail = 0.4 if r["name"].rstrip("0123456789") in RING else 0.15
        SFXW.append((r["start"] - 0.03, r["end"] + tail))
in_sfx = lambda t0, t1: any(t0 < b and t1 > a_ for a_, b in SFXW)

total_ev = float((SFXJ or EV)["total"]) + (0 if SFXJ else shift)
fin = float((SFXJ or EV)["fin"]) + (0 if SFXJ else shift)
print(f"music.wav: {w_sr} Гц, {w_ch} канала, {w_bits} бит, {w_n / w_sr:.3f} с; total {total_ev:.3f} с, "
      f"разница {1000 * (w_n / w_sr - total_ev):+.1f} мс")
crc = f"{zlib.crc32(EVB):08x}"
fresh = SFXJ is not None and SFXJ.get("events_crc") == crc
if SFXJ is None:
    print("ВНИМАНИЕ: нет sfx.json — запусти make_music.py")
elif not fresh:
    print("ВНИМАНИЕ: music.wav собран по другому events.json — пересчитай: python3 make_music.py")
if HAS_VOICE:
    vrel = os.path.relpath(a.voice, HERE)
    print(f"голос: {vrel if not vrel.startswith('../..') else a.voice}, {VD:.3f} с; V0 + голос + OUTRO = {V0 + VD + float(EV['OUTRO']):.3f} с "
          f"(total {total_ev:.3f})")
    if SFXJ is not None and not SFXJ.get("voice"):
        print("ВНИМАНИЕ: голос есть, а music.wav выровнен по оценке голоса — пересчитай: python3 make_music.py")
    ref = vo
    kR = np.stack([kweight(c) for c in vo])
    who = "голосу"
else:
    vdb = float((SFXJ or {}).get("vref_db", -22.0))
    print("=" * 100)
    print(f"ГОЛОСА НЕТ (../voice.mp3): проверка с голосом НЕ сделана. Уровни — к ОЦЕНКЕ голоса из sfx.json: RMS {vdb} dBFS "
          "в строках (K на 0,5 дБ выше).")
    print("После озвучки: python3 make_music.py && python3 check_mix.py")
    print("=" * 100)
    ref = np.zeros((2, n))
    lvl = 10 ** (vdb / 20)
    for t0, t1 in SPEECH:     # «голос»-заглушка: ровный уровень в окнах строк, только для расчёта отношений
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        ref[:, i0:i1] = lvl
    kR = ref * 10 ** (0.5 / 20)
    who = "оценке голоса"

vref = dB(ms(ref, SPEECH))
print(f"в местах речи ({NL} строк), музыка + шумы к {who}: RMS {f1(dB(ms(mus, SPEECH)) - vref)} дБ, "
      f"K {f1(dB(ms(kM, SPEECH)) - dB(ms(kR, SPEECH)))} дБ")
rows = []
for i, (t0, t1) in enumerate(SPEECH, 1):
    vl = ms(ref, [(t0, t1)])
    r = dB(ms(mus, [(t0, t1)])) - dB(vl)
    cuts = [(x, x + 0.1) for x in np.arange(t0, t1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
    rc = dB(ms(mus, cuts)) - dB(vl) if cuts else float("nan")
    rows.append((i, r, rc, 0.1 * len(cuts) >= 0.6))
st_rows = []
print(f"по строфам, RMS дБ к {who} строфы (всё | вне разовых шумов) и K-взвешенно (всё):")
for s in range(NL // 4):
    w = SPEECH[4 * s:4 * s + 4]
    cuts = [(x, x + 0.1) for t0, t1 in w for x in np.arange(t0, t1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
    r = dB(ms(mus, w)) - dB(ms(ref, w))
    rc = dB(ms(mus, cuts)) - dB(ms(ref, cuts))
    rk = dB(ms(kM, w)) - dB(ms(kR, w))
    st_rows.append((s + 1, r, rc, rk))
print("  " + "  ".join(f"{s}: {r:.1f}|{rc:.1f} K {rk:.1f}" for s, r, rc, rk in st_rows))
print(f"по строкам, RMS дБ к {who} строки (всё | вне разовых шумов; в скобках — вне шумов меньше 0,6 с):")
for k in range(0, NL, 10):
    print("  " + " ".join(f"{i}:{r:.1f}|{rc:.1f}" if ok_ else f"{i}:{r:.1f}|({rc:.1f})" for i, r, rc, ok_ in rows[k:k + 10]))
LV = (SFXJ or {}).get("levels")
if LV:
    print("музыка без шумов по строфам (из make_music.py, отдельная дорожка), дБ к голосу: "
          + " ".join(f"{i}:{v:.1f}" for i, v in LV["stanzas"].items()))

if HAS_VOICE:
    Wn, Hp = 0.4, 0.2
    vals, vals_k = [], []
    for t0 in [t0 for l0, l1 in SPEECH for t0 in np.arange(l0, l1 - Wn + 1e-6, Hp)]:
        w = [(t0, t0 + Wn)]
        vv = ms(vo, w)
        if dB(vv) < vref - 12:
            continue
        vals.append(dB(ms(mus, w)) - dB(vv))
        vals_k.append(dB(ms(kM, w)) - dB(ms(kR, w)))
    q = lambda v, p: float(np.percentile(v, p))
    print(f"окна 0,4 с внутри строк ({len(vals)} шт.), подложка к голосу: медиана {q(vals, 50):.1f}, 10–90 % "
          f"{q(vals, 10):.1f}…{q(vals, 90):.1f} дБ; K медиана {q(vals_k, 50):.1f}, 10–90 % "
          f"{q(vals_k, 10):.1f}…{q(vals_k, 90):.1f}")
    # голос вне строк (вступление и финал должны быть без голоса)
    out_v = dB(ms(vo, [(0, SPEECH[0][0] - 0.3), (SPEECH[-1][1] + 0.5, n / SR)]))
    print(f"голос вне строк (вступление и после последней строки): {f1(out_v - vref)} дБ к голосу в строках")

W_INTRO = [(0.15, SPEECH[0][0] - 0.3)]
W_TAIL = [(SPEECH[-1][1] + 0.1, fin - 0.05)]
W_FIN = [(fin, n / SR - 2.3)]
gaps = [(f"{i}|{i + 1}", SPEECH[i - 1][1] + 0.15, SPEECH[i][0] - 0.15) for i in range(4, NL, 4)]
print(f"без голоса, к среднему {who}: вступление {f1(dB(ms(mus, W_INTRO)) - vref)} дБ, паузы между строфами "
      + " ".join(f"{g}:{f1(dB(ms(mus, [(t0, t1)])) - vref)}" for g, t0, t1 in gaps)
      + f", после голоса до fin {f1(dB(ms(mus, W_TAIL)) - vref)}, финал {f1(dB(ms(mus, W_FIN)) - vref)} дБ")
gap_up = [dB(ms(mus, [(t0, t1)])) - max(dB(ms(mus, [SPEECH[int(g.split('|')[0]) - 1]])),
                                         dB(ms(mus, [SPEECH[int(g.split('|')[1]) - 1]]))) for g, t0, t1 in gaps]
print("паузы громче соседних строк на: " + " ".join(f"{g}:{f1(v)}" for (g, _, _), v in zip(gaps, gap_up)) + " дБ")
last = [(n / SR - 0.6, n / SR - 0.05)]
first = [(0.0, 0.05)]
print(f"первые 50 мс {f1(dB(ms(mus, first)) - vref)} дБ, последние 0,6 с {f1(dB(ms(mus, last)) - vref)} дБ к {who} "
      "(нарастание и затухание)")
pk_m = float(np.max(np.abs(mus)))
clip_m = int(np.sum(np.abs(mus) >= 0.999))
dc = float(np.max(np.abs(mus.mean(axis=1))))
print(f"пик music.wav {20 * np.log10(pk_m):.1f} dBFS (отсчётов у 0 dBFS: {clip_m}), постоянная составляющая {dc:.1e}")
if HAS_VOICE:
    pk_x = float(np.max(np.abs(mix)))
    clip = int(np.sum(np.abs(mix) >= 1.0))
    print(f"пик смеси {20 * np.log10(pk_x):.1f} dBFS, клиппинг смеси: {clip}")
else:
    clip = 0


def ebur(path, af=None):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                        (af + "," if af else "") + "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return (float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1]))


Im, Pm = ebur(a.music)
print(f"music.wav сама: {Im:.1f} LUFS, true peak {Pm:.1f} dBTP")
lufs_ok = None
if HAS_VOICE:
    I, P = ebur(a.mix)
    X = -14.0 - I
    I2, P2 = ebur(a.mix, f"volume={X:.2f}dB,alimiter=limit=0.82:attack=4:release=60:level=false")
    print(f"смесь до мастера: {I:.1f} LUFS, true peak {P:.1f} dBTP; пробный мастер (volume {X:+.2f} dB + alimiter 0,82): "
          f"{I2:.1f} LUFS, true peak {P2:.1f} dBTP")
    lufs_ok = abs(I2 + 14) <= 1 and P2 <= -1
all_ok = all(-20.05 <= r <= -17.95 for _, r, _, _ in rows)
st_ok = all(-20.05 <= r <= -17.95 for _, r, _, _ in st_rows)
bed_ok = all(-20.6 <= rc <= -17.4 for _, _, rc, ok_ in rows if ok_)
gap_ok = all(v >= 2.0 for v in gap_up)
loud_ok = all(dB(ms(mus, w)) - vref > -12 for w in (W_INTRO, W_FIN))
bad = [f"{i} ({r:+.1f})" for i, r, _, _ in rows if not -20.05 <= r <= -17.95]
bad_c = [f"{i} ({rc:+.1f}{', тише цели' if rc < -20.6 else ', ГРОМЧЕ цели'})" for i, _, rc, ok_ in rows
         if ok_ and not -20.6 <= rc <= -17.4]
if bad or bad_c:
    print("строки вне цели: всё вместе — " + (", ".join(bad) or "нет") + "; вне разовых шумов — " + (", ".join(bad_c) or "нет"))
print(("итог (С ГОЛОСОМ): " if HAS_VOICE else "итог (БЕЗ ГОЛОСА, к оценке): ")
      + f"длина = total: {ok(abs(w_n / w_sr - total_ev) < 0.001)}; по текущему events.json: {ok(fresh)}; под голосом "
      f"по строфам в −18…−20 дБ: {ok(st_ok)}; по строкам: {ok(all_ok)}; вне разовых шумов в −18…−20 (±0,6): "
      f"{ok(bed_ok)}; паузы и финал громче строк: {ok(gap_ok and loud_ok)}; клиппинга нет: {ok(clip == 0 and clip_m == 0)}"
      + (f"; −14 LUFS ±1 и TP ≤ −1 после мастера: {ok(lufs_ok)}" if HAS_VOICE else
         "; громкость смеси и мастер — НЕ проверены (нет голоса)"))
