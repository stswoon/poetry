#!/usr/bin/env python3
"""Проверка микса «Перчатки» (перевод Лермонтова): смешивает ../voice.mp3 (со сдвигом V0) и music.wav так же, как ролик
(оба с громкостью 1, голос моно в оба канала), и меряет:
  - длину music.wav (должна быть V0 + голос + OUTRO = total из events.json);
  - музыку к голосу в местах речи: по строкам и окнами 0,4 с (RMS и K-взвешенно, BS.1770) — всё вместе и без окон
    шумов (по sfx.json), цель — музыка на 18–20 дБ тише голоса. Строки в зонах из sfx.json («замедление», «робость»,
    «после K.O.») нарочно тише — их показываю отдельно и в итог не беру;
  - громкость на заставке, в паузах и в финале (должна быть выше, чем под голосом);
  - пики music.wav (ниже −1 dBFS), пик смеси и клиппинг;
  - громкость смеси (ffmpeg ebur128) и пробный мастер, как в sborka.md п. 5: volume до −14 LUFS + alimiter 0,82,
    после него снова ebur128 (цель −14 LUFS ±1, true peak ≤ −1 dBTP).
Запуск: python3 check_mix.py [путь к mix.wav] [--v0 4.0]   (по умолчанию смесь — во временной папке системы)
"""
import argparse
import json
import os
import re
import subprocess
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POEM = os.path.dirname(HERE)
SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument("mix", nargs="?", default=os.path.join(tempfile.gettempdir(), "perchatka_lermontov_mix.wav"))
ap.add_argument("--v0", type=float)
a = ap.parse_args()
with open(os.path.join(HERE, "events.json"), encoding="utf-8") as f:
    EV = json.load(f)
with open(os.path.join(HERE, "sfx.json"), encoding="utf-8") as f:
    SFXJ = json.load(f)
V0 = a.v0 if a.v0 is not None else SFXJ["V0"]
shift = V0 - EV["V0"]
NL = len([k for k in EV if re.fullmatch(r"L\d+", k)])
SPEECH = [(EV[f"L{i}"] + shift, EV[f"E{i}"] + shift) for i in range(1, NL + 1)]
voice_p, music_p = os.path.join(POEM, "voice.mp3"), os.path.join(HERE, "music.wav")
delay = int(round(V0 * 1000))

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice_p, "-i", music_p, "-filter_complex",
                f"[0:a]aresample={SR},pan=stereo|c0=c0|c1=c0,adelay={delay}:all=1[v];[v][1:a]amix=inputs=2:normalize=0:duration=longest[m]",
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

# окна шумов (по sfx.json): короткие — от пика −0,05 до +0,5 с (большие удары и звонкие — до +1,2 с), длинные — start…end
BIG = {"logo_hit", "coin_slot", "round", "fight", "ko", "perfect", "flawless", "glove_land", "quest", "pickup", "gate", "gate_t",
       "land", "deny", "victory_jingle"}
SFXW = []
for r in SFXJ["sfx"]:
    if "peak" in r:
        SFXW.append((r["peak"] - 0.05, r["peak"] + (1.2 if r["name"] in BIG else 0.5)))
    else:
        SFXW.append((r["start"] - 0.03, r["end"] + 0.15))
in_sfx = lambda t0, t1: any(t0 < b and t1 > a_ for a_, b in SFXW)
ZONES = [(z["start"], z["end"], z["name"], z["db"]) for z in SFXJ.get("zones", [])]
zone_of = lambda t0, t1: next((nm for z0, z1, nm, _ in ZONES if min(t1, z1) - max(t0, z0) > 0.5 * (t1 - t0)), None)
in_zone = lambda t0, t1: any(t0 < z1 and t1 > z0 for z0, z1, _, _ in ZONES)

total_ev = EV["total"] + shift
print(f"music.wav: {n / SR:.3f} с, total в events.json {total_ev:.3f} с, разница {1000 * (n / SR - total_ev):+.1f} мс")
print(f"смесь: {a.mix} ({mix.shape[1] / SR:.3f} с); голос со сдвигом {V0} с, моно в оба канала с полным уровнем — как в ролике")
norm_lines = [w for w in SPEECH if not zone_of(*w)]
r_all = dB(ms(mus, norm_lines)) - dB(ms(vo, norm_lines))
k_all = dB(ms(kM, norm_lines)) - dB(ms(kV, norm_lines))
print(f"в местах речи ({len(norm_lines)} строк вне зон), музыка + шумы к голосу: RMS {f1(r_all)} дБ, K {f1(k_all)} дБ")
rows = []
for i, (t0, t1) in enumerate(SPEECH, 1):
    r = dB(ms(mus, [(t0, t1)])) - dB(ms(vo, [(t0, t1)]))
    # подложка без окон шумов (куски строки по 0,1 с вне шумов) к голосу всей строки
    cuts = [(x, x + 0.1) for x in np.arange(t0, t1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
    rc = dB(ms(mus, cuts)) - dB(ms(vo, [(t0, t1)])) if cuts else float("nan")
    rows.append((i, r, rc, 0.1 * len(cuts) >= 1.0, zone_of(t0, t1)))
print("по строкам, RMS дБ к голосу строки (всё | подложка вне окон шумов; в скобках — вне шумов меньше 1 с, "
      "z — строка в зоне, в итог не идут):")
print("  " + " ".join(f"{i}:{r:.1f}|" + (f"{rc:.1f}" if enough else f"({rc:.1f})") + ("z" if zn else "") for i, r, rc, enough, zn in rows))
for z0, z1, nm, zdb in ZONES:
    if z0 < SPEECH[-1][1]:
        ls = [i for i, *_x, zn in rows if zn == nm]
        w = [SPEECH[i - 1] for i in ls] or [(z0, z1)]
        zc = [(x, x + 0.1) for x in np.arange(z0, z1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
        print(f"  зона «{nm}» {z0:.2f}–{z1:.2f} (цель {zdb} дБ): строки {ls}, музыка вне окон шумов "
              f"{f1(dB(ms(mus, zc)) - dB(ms(vo, w))) if zc else '—'} дБ к их голосу")

# окна 0,4 с (шаг 0,2 с), где голос звучит (не тише средней речи на 12 дБ)
vref = dB(ms(vo, SPEECH))
Wd, Hd = 0.4, 0.2
vals, vals_k, vals_ns, vals_z = [], [], [], []
WINS = [t0 for l0, l1 in SPEECH for t0 in np.arange(l0, l1 - Wd + 1e-6, Hd)]  # окна целиком внутри строк
for t0 in WINS:
    w = [(t0, t0 + Wd)]
    vv = ms(vo, w)
    if dB(vv) < vref - 12:
        continue
    d = dB(ms(mus, w)) - dB(vv)
    if in_zone(t0, t0 + Wd):
        vals_z.append(d)
        continue
    vals.append(d)
    vals_k.append(dB(ms(kM, w)) - dB(ms(kV, w)))
    if not in_sfx(t0, t0 + Wd):
        vals_ns.append(d)
q = lambda v, p: float(np.percentile(v, p))
share = lambda v: 100 * np.mean([(-21.5 <= x <= -16.5) for x in v])
print(f"окна 0,4 с внутри строк вне зон, где голос звучит ({len(vals)} шт.), RMS музыки к голосу: медиана {q(vals, 50):.1f}, "
      f"10–90 % {q(vals, 10):.1f}…{q(vals, 90):.1f} дБ, K медиана {q(vals_k, 50):.1f}; без шумов ({len(vals_ns)} шт.): "
      f"медиана {q(vals_ns, 50):.1f}, 10–90 % {q(vals_ns, 10):.1f}…{q(vals_ns, 90):.1f}, в полосе −21,5…−16,5 дБ {share(vals_ns):.0f} %")
if vals_z:
    print(f"окна 0,4 с в зонах ({len(vals_z)} шт.): медиана {q(vals_z, 50):.1f} дБ (нарочно тише)")
# громче ли музыка там, где голоса нет
vavg = ms(vo, SPEECH)
loud = [("заставка", [tuple(SFXJ["intro"])])]
loud += [(f"пауза {g['after_line']}|{g['after_line'] + 1}", [(g["start"], g["end"])]) for g in SFXJ.get("gaps", [])]
fz = {z[2]: z for z in ZONES}
if "victory" in fz:
    loud.append(("джингл", [(fz["victory"][0] + 0.05, fz["victory"][1])]))
if "final" in fz:
    loud.append(("финал", [(fz["final"][0] + 0.05, min(n / SR, fz["final"][0] + 3.5))]))
bg = [(x, x + 0.1) for l0, l1 in norm_lines for x in np.arange(l0, l1 - 0.05, 0.1) if not in_sfx(x, x + 0.1)]
under = dB(ms(mus, bg)) - dB(vavg)
print(f"без голоса, музыка + шумы к среднему голосу (подложка под голосом {under:+.1f}): " + ", ".join(f"{nm} {f1(dB(ms(mus, w)) - dB(vavg))}" for nm, w in loud))
pk_m, pk_x = float(np.max(np.abs(mus))), float(np.max(np.abs(mix)))
clip_m = int(np.sum(np.abs(mus) >= 32767 / 32768))
clip = int(np.sum(np.abs(mix) >= 1.0))
print(f"пик music.wav {20 * np.log10(pk_m):.1f} dBFS (отсчётов в потолке: {clip_m}), пик смеси {20 * np.log10(pk_x):.1f} dBFS, "
      f"клиппинг смеси: {clip} отсчётов; голос один: пик {20 * np.log10(float(np.max(np.abs(vo)))):.1f} dBFS")


def ebur(path, af=None):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", (af + "," if af else "") + "ebur128=peak=true:framelog=quiet",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
    P = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    LRA = float(re.findall(r"LRA:\s+(-?[\d.]+) LU", r)[-1])
    return I, P, LRA


I, P, LRA = ebur(a.mix)
X = -14.0 - I
I2, P2, _ = ebur(a.mix, f"volume={X:.2f}dB,alimiter=limit=0.82:attack=4:release=60:level=false")
print(f"смесь до мастера: {I:.1f} LUFS, true peak {P:.1f} dBTP, LRA {LRA:.1f} LU")
print(f"пробный мастер (volume {X:+.2f} dB + alimiter 0,82, как sborka.md п. 5): {I2:.1f} LUFS, true peak {P2:.1f} dBTP; "
      f"лимитеру срезать пики до {max(0.0, P + X + 1.7):.1f} дБ")
ok = lambda c: "да" if c else "НЕТ"
good = [rc for _, _, rc, enough, zn in rows if enough and not zn]
loud_ok = all(dB(ms(mus, w)) - dB(vavg) > under + 2 for nm, w in loud)
print(f"итог: музыка под голосом в −18…−20 дБ (подложка по строкам вне зон, допуск ±0,6): "
      f"{ok(all(-20.6 <= rc <= -17.4 for rc in good))} ({min(good):.1f}…{max(good):.1f}); "
      f"без голоса громче: {ok(loud_ok)}; пик music.wav ниже −1 dBFS: {ok(pk_m < 10 ** (-1 / 20))}; "
      f"клиппинга нет: {ok(clip == 0 and clip_m == 0)}; −14 LUFS ±1 и TP ≤ −1 после мастера: {ok(abs(I2 + 14) <= 1 and P2 <= -1)}")
