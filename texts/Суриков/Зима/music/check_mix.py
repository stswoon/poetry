#!/usr/bin/env python3
"""Проверка микса «Зимы» (Суриков), независимо от make_music.py.

Смешивает ../voice.mp3 (со сдвигом на вступление V0, моно в оба канала) и music.wav так же, как ролик (оба с громкостью
1), и меряет:
  - music.wav: частоту, каналы, длину (должна быть V0 + голос + финал = total), собран ли по текущему events.json;
  - голос: длина против ../timings.json, строки timings.json против events.json;
  - подложку под голосом по строфам и по строкам (RMS, дБ к голосу): всё вместе (музыка + шумы) и вне окон разовых
    шумов (по sfx.json); цель — на 18–20 дБ тише голоса;
  - окна 0,4 с внутри строк (RMS и K-взвешенно, BS.1770);
  - вступление, паузы между строфами, «после голоса» и финал (без голоса) к среднему голосу;
  - шумы: пик на кадр позже события (по sfx.json и по огибающей music.wav), самое громкое окно 100 мс (K) к среднему
    голосу и к голосу рядом — шум не должен быть громче голоса;
  - пики и клиппинг; громкость смеси (ffmpeg ebur128) и пробный мастер −14 LUFS + alimiter.
Если голоса нет — честно пишет, что проверка с голосом НЕ сделана, и меряет music.wav к оценке голоса из sfx.json.
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
FRAME = 1 / 30
ap = argparse.ArgumentParser(description="проверка микса голоса и music.wav")
ap.add_argument("mix", nargs="?", default=os.path.join(tempfile.gettempdir(), "surikov_zima_mix.wav"))
ap.add_argument("--music", default=os.path.join(HERE, "music.wav"))
ap.add_argument("--voice", default=os.path.join(POEM, "voice.mp3"))
ap.add_argument("--timings", default=os.path.join(POEM, "timings.json"))
ap.add_argument("--sfx", default=os.path.join(HERE, "sfx.json"))
ap.add_argument("--events", default=os.path.join(HERE, "events.json"))
a = ap.parse_args()
with open(a.events, "rb") as f:
    EVB = f.read()
EV = json.loads(EVB.decode("utf-8"))
with open(a.timings, encoding="utf-8") as f:
    TJ = json.load(f)
SFXJ = None
if os.path.exists(a.sfx):
    with open(a.sfx, encoding="utf-8") as f:
        SFXJ = json.load(f)
V0 = float((SFXJ or EV)["V0"])
OUTRO = float((SFXJ or EV)["OUTRO"])
NL = len(TJ["lines"])
SPEECH = [(l["start"] + V0, l["end"] + V0) for l in TJ["lines"]]
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


def loud100(p, t0, t1):
    """самое громкое окно 100 мс мощности p (по отсчётам) внутри t0…t1"""
    i0, i1 = max(0, int(t0 * SR)), min(len(p), int(t1 * SR))
    w = int(0.1 * SR)
    if i1 - i0 <= w:
        return float(np.mean(p[i0:i1])) if i1 > i0 else 0.0
    cs = np.concatenate([[0], np.cumsum(p[i0:i1])])
    return float(np.max((cs[w:] - cs[:-w]) / w))


dB = lambda v: 10 * np.log10(max(v, 1e-20))
f1 = lambda v: f"{v:+.1f}"
ok = lambda c: "да" if c else "НЕТ"
kM = np.stack([kweight(c) for c in mus])

LONG = ("boom", "whoosh", "slide", "fanfare", "hit", "straw", "slam", "thump")      # долгие — хвост длиннее
SFXW = []
if SFXJ:
    for r in SFXJ["sfx"]:
        tail = 0.25 if r["kind"] in LONG else 0.12
        SFXW.append((r["start"] - 0.03, r["end"] + tail))
in_sfx = lambda t0, t1: any(t0 < b and t1 > a_ for a_, b in SFXW)

total = V0 + float(TJ["voiceDuration"]) + OUTRO
fin = float((SFXJ or {}).get("fin", EV.get("fin", SPEECH[-1][1] + 1.6)))
print(f"music.wav: {w_sr} Гц, {w_ch} канала, {w_bits} бит, {w_n / w_sr:.3f} с; вступление {V0} + голос "
      f"{float(TJ['voiceDuration']):.3f} + финал {OUTRO} = {total:.3f} с, разница {1000 * (w_n / w_sr - total):+.1f} мс")
crc = f"{zlib.crc32(EVB):08x}"
fresh = SFXJ is not None and SFXJ.get("events_crc") == crc
if SFXJ is None:
    print("ВНИМАНИЕ: нет sfx.json — запусти make_music.py")
elif not fresh:
    print("ВНИМАНИЕ: music.wav собран по другому events.json — пересчитай: python3 make_music.py")
bad_ev = [i for i in range(1, NL + 1) if f"L{i}" in EV and abs(EV[f"L{i}"] - (V0 - float(EV["V0"])) - SPEECH[i - 1][0])
          > 0.03]
if bad_ev:
    print(f"ВНИМАНИЕ: строки {bad_ev[:6]} в events.json не совпадают с timings.json")
if HAS_VOICE:
    vrel = os.path.relpath(a.voice, HERE)
    print(f"голос: {vrel if not vrel.startswith('../..') else a.voice}, {VD:.3f} с (timings.json: "
          f"{float(TJ['voiceDuration']):.3f} с, разница {1000 * (VD - float(TJ['voiceDuration'])):+.0f} мс)")
    if SFXJ is not None and not SFXJ.get("voice"):
        print("ВНИМАНИЕ: голос есть, а music.wav выровнен по оценке голоса — пересчитай: python3 make_music.py")
    ref = vo
    kR = np.stack([kweight(c) for c in vo])
    who = "голосу"
else:
    vdb = float((SFXJ or {}).get("vref_db", -22.0))
    print("=" * 100)
    print(f"ГОЛОСА НЕТ (../voice.mp3): проверка с голосом НЕ сделана. Уровни — к ОЦЕНКЕ голоса: RMS {vdb} dBFS в строках.")
    print("=" * 100)
    ref = np.zeros((2, n))
    lvl = 10 ** (vdb / 20)
    for t0, t1 in SPEECH:
        ref[:, int(t0 * SR):min(n, int(t1 * SR))] = lvl
    kR = ref * 10 ** (0.5 / 20)
    who = "оценке голоса"

vref = dB(ms(ref, SPEECH))
vkref = dB(ms(kR, SPEECH))
print(f"в местах речи ({NL} строк), музыка + шумы к {who}: RMS {f1(dB(ms(mus, SPEECH)) - vref)} дБ, "
      f"K {f1(dB(ms(kM, SPEECH)) - vkref)} дБ")
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
for k in range(0, NL, 8):
    print("  " + " ".join(f"{i}:{r:.1f}|{rc:.1f}" if ok_ else f"{i}:{r:.1f}|({rc:.1f})" for i, r, rc, ok_ in rows[k:k + 8]))
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
          f"{q(vals, 10):.1f}…{q(vals, 90):.1f}, самое громкое {max(vals):.1f} дБ; K медиана {q(vals_k, 50):.1f}, "
          f"10–90 % {q(vals_k, 10):.1f}…{q(vals_k, 90):.1f}")
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

# шумы: пик на кадр позже события и «не громче голоса»
sfx_ok = True
if SFXJ:
    pK = (kM ** 2).mean(0)
    pV = (kR ** 2).mean(0)
    env = np.convolve(np.abs(mus).sum(0), np.ones(330) / 330, "same")
    vk_avg = 10 ** (vkref / 10)
    print("шумы: пик − событие (sfx.json | по огибающей music.wav), мс; шум один (sfx.json) | music.wav в окне шума "
          "(K, самое громкое окно 100 мс) к среднему голосу / к голосу рядом (±0,5 с, если голос там есть), дБ:")
    worst = worst_mix = worst_loc = -99.0
    offs = []
    rows_s = []
    for r in SFXJ["sfx"]:
        t = r["t"]
        off_j = 1000 * (r["peak"] - t)
        i0, i1 = int((t - 0.05) * SR), int((t + 0.15) * SR)
        off_m = 1000 * ((i0 + int(np.argmax(env[i0:i1]))) / SR - t)
        lm = loud100(pK, r["start"], min(r["end"], r["start"] + 0.6))
        rel_avg = dB(lm / vk_avg)
        lv = loud100(pV, t - 0.5, t + 0.5) if HAS_VOICE else 0.0
        has_v = lv > vk_avg * 0.1                         # голос рядом не тише −10 дБ от среднего
        rel_loc = dB(lm / lv) if has_v else float("nan")
        worst = max(worst, float(r["db"]))
        worst_mix = max(worst_mix, rel_avg)
        if has_v:
            worst_loc = max(worst_loc, rel_loc)
        offs.append(off_j)
        rows_s.append(f"{r['name']} {t:.2f}: {off_j:+.0f}|{off_m:+.0f}, {r['db']:+.1f}|{rel_avg:+.1f}"
                      + (f"/{rel_loc:+.1f}" if has_v else ""))
    for k in range(0, len(rows_s), 4):
        print("  " + ";  ".join(rows_s[k:k + 4]))
    peak_ok = all(20 <= o <= 50 for o in offs)
    sfx_ok = worst < 0 and worst_mix < 0 and worst_loc < 0
    print(f"шумы: пик на кадр позже (20…50 мс) — {ok(peak_ok)}; самый громкий шум один {worst:+.1f} дБ к среднему "
          f"голосу; вместе с музыкой {worst_mix:+.1f} дБ к среднему голосу, {worst_loc:+.1f} дБ к голосу рядом — "
          f"тише голоса: {ok(sfx_ok)}")
else:
    peak_ok = False
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
      + f"длина = total: {ok(abs(w_n / w_sr - total) < 0.001)}; по текущему events.json: {ok(fresh)}; под голосом "
      f"по строфам в −18…−20 дБ: {ok(st_ok)}; по строкам: {ok(all_ok)}; вне разовых шумов в −18…−20 (±0,6): "
      f"{ok(bed_ok)}; паузы и финал громче строк: {ok(gap_ok and loud_ok)}; шумы на кадр позже и тише голоса: "
      f"{ok(peak_ok and sfx_ok)}; клиппинга нет: {ok(clip == 0 and clip_m == 0)}"
      + (f"; −14 LUFS ±1 и TP ≤ −1 после мастера: {ok(lufs_ok)}" if HAS_VOICE else
         "; громкость смеси и мастер — НЕ проверены (нет голоса)"))
