#!/usr/bin/env python3
"""Вклейка переозвученных кусков в voice.mp3 и пересчёт timings.json.

12.mp3 — строфа 12 целиком (в первом дубле «лего́к» прочитано как «лёгок»; здесь в тексте «лиго́к» — так модель ставит ударение на второй слог).
16.mp3 — смех и строки 91–92 (в первом дубле «смертию» сжато до «смертью»).
Запуск один раз: python3 splice.py  (исходный голос сохраняется в voice/voice-take1.mp3, тайминги — в voice/timings-take1.json)
"""
import json, re, shutil, subprocess, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parents[1]
ORIG = HERE.parent / "voice-take1.mp3"
TORIG = HERE.parent / "timings-take1.json"
if not ORIG.exists():
    shutil.copyfile(POEM / "voice.mp3", ORIG)
    shutil.copyfile(POEM / "timings.json", TORIG)
T = json.loads(TORIG.read_text(encoding="utf-8"))
LN = {l["n"]: l for l in T["lines"]}

# речь во фрагментах (по silencedetect −38 дБ, 0,12 с): строка → отрезки и слова в них
F12 = {67: [(0.19, 1.25, 4), (1.57, 2.34, 2)], 68: [(2.90, 3.50, 1), (3.67, 4.93, 4)], 69: [(5.47, 6.12, 2), (6.57, 8.07, 7)],
       70: [(8.67, 10.69, 7)], 71: [(11.36, 12.50, 3), (12.97, 14.07, 3)], 72: [(14.56, 15.63, 3), (15.80, 17.01, 3)]}
F16 = {91: [(0.955, 3.27, 6)], 92: [(4.10, 5.39, 3), (5.51, 6.60, 1)]}


def lufs(path, a=None, b=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"] + (["-ss", str(a), "-to", str(b)] if a is not None else []) + ["-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"]
    return float(re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', subprocess.run(cmd, capture_output=True, text=True).stderr).group(1))


def wav(src, out, a, b, gain=0.0):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(src), "-af", f"volume={gain:.2f}dB",
                    "-ar", "44100", "-ac", "1", str(out)], check=True)


def sil(out, d):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{d:.3f}", str(out)], check=True)


def words_in(line, segs, off):
    toks = [t for t in line["text"].split() if re.sub(r"[^а-яёa-z]", "", t.lower())]
    out, i = [], 0
    for a, b, n in segs:
        part = toks[i:i + n]; i += n
        w = [len(re.sub(r"[^а-яё]", "", t.lower())) + 1 for t in part]; s = sum(w); x = a
        for t, k in zip(part, w):
            d = (b - a) * k / s; out.append({"text": t, "start": round(x + off, 3), "end": round(x + d + off, 3)}); x += d
    assert i == len(toks), (line["n"], i, len(toks))
    return out


cutA1 = (LN[66]["end"] + LN[67]["start"]) / 2
cutA2 = (LN[72]["end"] + LN[73]["start"]) / 2
cutB1 = (LN[90]["end"] + 259.61) / 2           # 259,61 — начало смеха перед ст. 91
cutB2 = (LN[92]["end"] + LN[93]["start"]) / 2
gA = lufs(ORIG, cutA1, cutA2) - lufs(HERE / "12.mp3")
gB = lufs(ORIG, cutB1, cutB2) - lufs(HERE / "16.mp3")
preA, postA = LN[67]["start"] - cutA1 - 0.05, cutA2 - LN[72]["end"] - 0.05
preB, postB = 259.61 - cutB1, cutB2 - LN[92]["end"] - 0.05
a12, b12 = 0.14, 17.06
a16, b16 = 0.0, 6.65

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp); parts = []
    def add(p): parts.append(p)
    wav(ORIG, tmp / "o1.wav", 0, cutA1); add(tmp / "o1.wav")
    sil(tmp / "s1.wav", preA); add(tmp / "s1.wav")
    wav(HERE / "12.mp3", tmp / "f12.wav", a12, b12, gA); add(tmp / "f12.wav")
    sil(tmp / "s2.wav", postA); add(tmp / "s2.wav")
    wav(ORIG, tmp / "o2.wav", cutA2, cutB1); add(tmp / "o2.wav")
    sil(tmp / "s3.wav", preB); add(tmp / "s3.wav")
    wav(HERE / "16.mp3", tmp / "f16.wav", a16, b16, gB); add(tmp / "f16.wav")
    sil(tmp / "s4.wav", postB); add(tmp / "s4.wav")
    wav(ORIG, tmp / "o3.wav", cutB2, T["voiceDuration"]); add(tmp / "o3.wav")
    (tmp / "list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c:a", "libmp3lame", "-b:a", "160k", str(POEM / "voice.mp3")], check=True)

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(POEM / "voice.mp3")]))
off12 = cutA1 + preA - a12                      # время фрагмента 12 → время голоса
newA2 = cutA1 + preA + (b12 - a12) + postA
d1 = newA2 - cutA2
off16 = cutB1 + d1 + preB - a16
newB2 = cutB1 + d1 + preB + (b16 - a16) + postB
d2 = newB2 - (cutB2 + d1)
lines = []
for l in T["lines"]:
    n = l["n"]; l = dict(l)
    if 67 <= n <= 72 or n in (91, 92):
        segs, off = (F12[n], off12) if n <= 72 else (F16[n], off16)
        l["words"] = words_in(l, segs, off); l["start"] = l["words"][0]["start"]; l["end"] = l["words"][-1]["end"]
    else:
        sh = 0 if n < 67 else d1 if n < 91 else d1 + d2
        l["start"] = round(l["start"] + sh, 3); l["end"] = round(l["end"] + sh, 3)
        l["words"] = [{**w, "start": round(w["start"] + sh, 3), "end": round(w["end"] + sh, 3)} for w in l["words"]]
    lines.append(l)
T2 = dict(T); T2["voiceDuration"] = round(dur, 3); T2["lines"] = lines
T2["note"] = T["note"] + (f" | Правка (7.11.2026): строфа 12 переозвучена отдельно (voice/fix/12.mp3, «лиго́к» вместо «лего́к» в тексте озвучки: в первом дубле было «лёгок»), "
                          f"строки 91–92 со смехом — voice/fix/16.mp3 (в первом дубле «смертию» звучало как «смертью»). Куски вклеены по серединам пауз (voice/fix/splice.py), "
                          f"громкость подогнана по LUFS ({gA:+.1f} и {gB:+.1f} дБ). Границы строк новых кусков — по silencedetect, слова распределены по длине внутри отрезков речи (±0,15 с). "
                          f"Строки 73–90 сдвинуты на {d1:+.3f} с, 93–102 — на {d1 + d2:+.3f} с. Исходный голос — voice/voice-take1.mp3, тайминги — voice/timings-take1.json.")
(POEM / "timings.json").write_text(json.dumps(T2, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"voice.mp3 {dur:.2f} s; d1 {d1:+.3f}, d2 {d2:+.3f}; gain {gA:+.1f} / {gB:+.1f} dB")
