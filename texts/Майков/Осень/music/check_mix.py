#!/usr/bin/env python3
"""Проверка микса «Осени» (Майков): смешивает ../voice.mp3 (со сдвигом на вступление V0) и music.wav так же, как ролик
(оба с громкостью 1, голос моно в оба канала), и меряет:
  - music.wav: частоту, каналы, длину (должна быть total из events.json = вступление + голос + финал);
  - подложку под голосом по строкам: всё вместе (музыка + шумы) и подложку вне окон разовых шумов (по sfx.json;
    долгие тихие шумы с пометкой bed — шорох шагов и иней — считаются частью подложки); цель — на 18–20 дБ
    тише голоса строки (допуск ±0,6 дБ);
  - окна 0,4 с внутри строк (RMS и K-взвешенно, BS.1770);
  - уровни музыки без шумов по строкам из make_music.py (sfx.json → levels) — у него есть отдельные дорожки;
  - шумы на строках (sfx.json → db_lines): не громче −16 дБ к голосу;
  - фанфару-титр, паузы между строфами, хвост и финал (без голоса) к среднему голосу;
  - пики music.wav и смеси, клиппинг;
  - громкость смеси (ffmpeg ebur128) и пробный мастер, как в sborka.md п. 5: volume до −14 LUFS + alimiter 0,82,
    затем снова ebur128 (цель −14 LUFS ±1, true peak ≤ −1 dBTP).
Запуск: python3 check_mix.py [путь к mix.wav] [--intro 3.6]   (по умолчанию смесь — во временной папке системы)
"""
import argparse
import json
import os
import re
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
ap = argparse.ArgumentParser(description="проверка микса голоса и music.wav")
ap.add_argument("mix", nargs="?", default=os.path.join(tempfile.gettempdir(), "osen_mix.wav"), help="куда писать смесь")
ap.add_argument("--intro", type=float, help="вступление до голоса, с (V0); по умолчанию из sfx.json / events.json")
a = ap.parse_args()
with open(os.path.join(HERE, "events.json"), encoding="utf-8") as f:
    EV = json.load(f)
SFXJ = None
if os.path.exists(os.path.join(HERE, "sfx.json")):
    with open(os.path.join(HERE, "sfx.json"), encoding="utf-8") as f:
        SFXJ = json.load(f)
V0 = a.intro if a.intro is not None else float((SFXJ or EV)["V0"])
shift = V0 - float(EV["V0"])
NL = len([k for k in EV if re.fullmatch(r"L\d+", k)])
SPEECH = []  # окна строк, как в make_music.py: если строка налезает на следующую — до начала следующей
for i in range(1, NL + 1):
    a0 = EV[f"L{i}"] + shift
    b0 = EV[f"E{i}"] + shift if i == NL else min(EV[f"E{i}"], EV[f"L{i + 1}"]) + shift
    SPEECH.append((a0, max(b0, a0 + 0.05)))
sj_shift = V0 - float(SFXJ["V0"]) if SFXJ else 0.0
if SFXJ and abs(sj_shift) > 1e-6:
    print(f"внимание: sfx.json сделан при вступлении {SFXJ['V0']} — music.wav, видимо, не пересчитан под {V0}")
voice_p, music_p = os.path.join(POEM, "voice.mp3"), os.path.join(HERE, "music.wav")
delay = int(round(V0 * 1000))
with wave.open(music_p) as wf:
    w_sr, w_ch, w_bits, w_n = wf.getframerate(), wf.getnchannels(), 8 * wf.getsampwidth(), wf.getnframes()

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice_p, "-i", music_p, "-filter_complex",
                f"[0:a]aresample={SR},pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1[v];"
                "[v][1:a]amix=inputs=2:normalize=0:duration=longest[m]",
                "-map", "[m]", "-c:a", "pcm_f32le", a.mix], check=True)


def dec(p, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", p] + (["-af", af] if af else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype="<f4").astype(np.float64)
    return x.reshape(-1, 2).T


mus = dec(music_p)
vo = dec(voice_p, f"pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1")
mix = dec(a.mix)
n = mus.shape[1]
vo = np.pad(vo, ((0, 0), (0, max(0, n - vo.shape[1]))))[:, :n]


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
    s = c = 0
    for t0, t1 in wins:
        i0, i1 = max(0, int(t0 * SR)), min(n, int(t1 * SR))
        if i1 > i0:
            s += float(np.sum(x[:, i0:i1] ** 2))
            c += i1 - i0
    return s / max(1, c)


dB = lambda v: 10 * np.log10(max(v, 1e-20))
f1 = lambda v: f"{v:+.1f}"
kM = np.stack([kweight(c) for c in mus])
kV = np.stack([kweight(c) for c in vo])

# окна разовых шумов: где слышен каждый удар (parts) или весь звук, плюс хвост 0,15 с (звонкие — 0,5 с)
RING = ("blips", "fin_blips", "splash", "notes1", "notes2", "ding_mhov", "collect", "save", "magic", "daynight", "wilt")
SFXW = []
if SFXJ:
    for r in SFXJ["sfx"]:
        if r.get("bed"):
            continue
        tail = 0.5 if r["name"] in RING else 0.15
        for s0, s1 in (r.get("parts") or [[r["start"], r["end"]]]):
            SFXW.append((s0 + sj_shift - 0.03, s1 + sj_shift + tail))
in_sfx = lambda t0, t1: any(t0 < b and t1 > a_ for a_, b in SFXW)

total_ev = float(EV["total"]) + shift
print(f"music.wav: {w_sr} Гц, {w_ch} канала, {w_bits} бит, {w_n / w_sr:.3f} с; total в events.json {total_ev:.3f} с, "
      f"разница {1000 * (w_n / w_sr - total_ev):+.1f} мс")
print(f"смесь: {a.mix} ({mix.shape[1] / SR:.3f} с); голос со сдвигом {V0} с, моно в оба канала с полным уровнем — как в ролике")
vref = dB(ms(vo, SPEECH))
print(f"в местах речи ({NL} строк), музыка + шумы к голосу: RMS {f1(dB(ms(mus, SPEECH)) - vref)} дБ, "
      f"K {f1(dB(ms(kM, SPEECH)) - dB(ms(kV, SPEECH)))} дБ")
rows = []
for i, (t0, t1) in enumerate(SPEECH, 1):
    vl = ms(vo, [(t0, t1)])
    r = dB(ms(mus, [(t0, t1)])) - dB(vl)
    cuts = [(x, x + 0.1) for x in np.arange(t0, t1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
    rc = dB(ms(mus, cuts)) - dB(vl) if cuts else float("nan")
    rows.append((i, r, rc, 0.1 * len(cuts) >= 0.8))
print("по строкам, RMS дБ к голосу строки (всё | подложка вне разовых шумов; в скобках — вне шумов меньше 0,8 с, в итог не идёт):")
for k in range(0, NL, 8):
    print("  " + " ".join(f"{i}:{r:.1f}|{rc:.1f}" if ok_ else f"{i}:{r:.1f}|({rc:.1f})" for i, r, rc, ok_ in rows[k:k + 8]))
LV = (SFXJ or {}).get("levels")
if LV:
    print("музыка без шумов по строкам (make_music.py, отдельная дорожка), дБ к голосу строки:")
    vals = list(LV["lines"].items())
    for k in range(0, len(vals), 8):
        print("  " + " ".join(f"{i}:{v:.1f}" for i, v in vals[k:k + 8]))

# окна 0,4 с (шаг 0,2 с) целиком внутри строк, где голос звучит (не тише средней речи на 12 дБ)
Wn, Hp = 0.4, 0.2
vals, vals_k, vals_ns = [], [], []
for t0 in [t0 for l0, l1 in SPEECH for t0 in np.arange(l0, l1 - Wn + 1e-6, Hp)]:
    w = [(t0, t0 + Wn)]
    vv = ms(vo, w)
    if dB(vv) < vref - 12:
        continue
    d = dB(ms(mus, w)) - dB(vv)
    vals.append(d)
    vals_k.append(dB(ms(kM, w)) - dB(ms(kV, w)))
    if not in_sfx(t0, t0 + Wn):
        vals_ns.append(d)
q = lambda v, p: float(np.percentile(v, p)) if v else float("nan")
share = lambda v: 100 * np.mean([(-21.5 <= x <= -16.5) for x in v]) if v else float("nan")
print(f"окна 0,4 с внутри строк ({len(vals)} шт.), подложка к голосу: медиана {q(vals, 50):.1f}, 10–90 % "
      f"{q(vals, 10):.1f}…{q(vals, 90):.1f} дБ, K медиана {q(vals_k, 50):.1f}; вне разовых шумов ({len(vals_ns)} шт.): "
      f"медиана {q(vals_ns, 50):.1f}, 10–90 % {q(vals_ns, 10):.1f}…{q(vals_ns, 90):.1f}, в полосе −21,5…−16,5 дБ {share(vals_ns):.0f} %")

sfx_bad = []
if SFXJ:
    loud = sorted((r for r in SFXJ["sfx"] if r.get("db_lines") is not None), key=lambda r: -r["db_lines"])
    sfx_bad = [r for r in loud if r["db_lines"] > -16.0]
    print("шумы на строках (самое громкое окно 100 мс, K, дБ к среднему голосу), громче всех: "
          + ", ".join(f"{r['name']} {r['db_lines']}" for r in loud[:6]))
fin = float((SFXJ or EV).get("fin", EV["fin"])) + (sj_shift if SFXJ else shift)
W_INTRO = [(0.5, SPEECH[0][0] - 0.3)]
W_TAIL = [(SPEECH[-1][1] + 0.3, fin - 0.05)]
W_FIN = [(fin, min(fin + 1.6, n / SR - 0.8))]
gaps = [(f"{i}|{i + 1}", SPEECH[i - 1][1] + 0.15, SPEECH[i][0] - 0.15) for i in range(4, NL, 4)
        if SPEECH[i][0] - SPEECH[i - 1][1] > 0.5]
print(f"без голоса, к среднему голосу: фанфара {f1(dB(ms(mus, W_INTRO)) - vref)} дБ, паузы между строфами "
      + " ".join(f"{g}:{f1(dB(ms(mus, [(t0, t1)])) - vref)}" for g, t0, t1 in gaps)
      + f", после голоса до fin {f1(dB(ms(mus, W_TAIL)) - vref)}, финал {f1(dB(ms(mus, W_FIN)) - vref)} дБ; "
      f"под голосом в среднем {f1(dB(ms(mus, SPEECH)) - vref)} дБ")
pk_m, pk_x = float(np.max(np.abs(mus))), float(np.max(np.abs(mix)))
clip = int(np.sum(np.abs(mix) >= 1.0))
clip_m = int(np.sum(np.abs(mus) >= 32767 / 32768))
print(f"пик music.wav {20 * np.log10(pk_m):.1f} dBFS (клиппинг {clip_m} отсчётов), пик смеси {20 * np.log10(pk_x):.1f} dBFS, "
      f"клиппинг смеси: {clip} отсчётов; голос один: пик {20 * np.log10(float(np.max(np.abs(vo)))):.1f} dBFS")


def ebur(path, af=None):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                        (af + "," if af else "") + "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
    P = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    LRA = float(re.findall(r"LRA:\s+(-?[\d.]+) LU", r)[-1])
    return I, P, LRA


I, P, LRA = ebur(a.mix)
X = -14.0 - I
I2, P2, _ = ebur(a.mix, f"volume={X:.2f}dB,alimiter=limit=0.82:attack=4:release=60:level=false")
print(f"смесь до мастера: {I:.1f} LUFS, true peak {P:.1f} dBTP, LRA {LRA:.1f} LU")
print(f"пробный мастер (volume {X:+.2f} dB + alimiter 0,82, как sborka.md п. 5): {I2:.1f} LUFS, true peak {P2:.1f} dBTP")
ok = lambda c: "да" if c else "НЕТ"
bed_ok = all(-20.6 <= rc <= -17.4 for _, _, rc, ok_ in rows if ok_)
mus_ok = all(-20.05 <= v <= -17.95 for v in LV["lines"].values()) if LV else None
print(f"итог: длина = total: {ok(abs(w_n / w_sr - total_ev) < 0.001)}; музыка без шумов под голосом в −18…−20 дБ "
      f"(make_music): {ok(mus_ok) if mus_ok is not None else 'нет данных'}; подложка по строкам в −18…−20 дБ (±0,6): "
      f"{ok(bed_ok)}; шумы на строках тише −16 дБ: {ok(not sfx_bad)}; клиппинга нет: {ok(clip == 0 and clip_m == 0)}; "
      f"−14 LUFS ±1 и TP ≤ −1 после мастера: {ok(abs(I2 + 14) <= 1 and P2 <= -1)}")
