#!/usr/bin/env python3
"""Считает ../timings.json: начало и конец каждой строки и слова в voice.mp3.

Основа — распознанные Whisper слова (tr/transcript.json), сопоставленные с текстом стиха.
Если распознавания ещё нет, время раскидывается внутри куска пропорционально длине строки.
Границы кусков берутся из parts.json, начало строки притягивается к концу тишины.
"""
import difflib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
SIL_SNAP = 0.35


def norm(w):
    return re.sub(r"[^а-я]", "", w.lower().replace("ё", "е"))


def read_lines():
    return json.loads((HERE / "lines.json").read_text(encoding="utf8"))


def silences():
    res = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(POEM / "voice.mp3"), "-af",
                          "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True)
    return [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)], [float(x) for x in re.findall(r"silence_start: ([\d.]+)", res.stderr)]


def load_words():
    for name in ("transcript.json", "voice.json"):
        p = HERE / "tr" / name
        if p.exists():
            d = json.loads(p.read_text(encoding="utf8"))
            words = d if isinstance(d, list) else d.get("words") or d.get("segments") or []
            flat = []
            for w in words:
                if "words" in w:
                    flat += w["words"]
                else:
                    flat.append(w)
            out = []
            for w in flat:
                txt = w.get("text") or w.get("word") or ""
                s, e = w.get("start"), w.get("end")
                if s is None:
                    continue
                if norm(txt):
                    out.append((norm(txt), float(s), float(e)))
            return out
    return None


def main():
    lines = read_lines()
    parts = json.loads((HERE / "parts.json").read_text(encoding="utf8"))
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(POEM / "voice.mp3")]))
    # слова стиха
    toks = []
    for l in lines:
        l["w"] = [{"w": w} for w in l["text"].split(" ")]
        for w in l["w"]:
            w["k"] = norm(w["w"])
            if w["k"]:
                toks.append(w)
    heard = load_words()
    matched = 0
    if heard:
        sm = difflib.SequenceMatcher(None, [t["k"] for t in toks], [h[0] for h in heard], autojunk=False)
        for b in sm.get_matching_blocks():
            for i in range(b.size):
                toks[b.a + i]["s"], toks[b.a + i]["e"] = heard[b.b + i][1], heard[b.b + i][2]
                matched += 1
    # время строк; кусок задаёт жёсткие границы
    for pi, part in enumerate(parts):
        ls = [l for l in lines if l["part"] == pi]
        p0, p1 = part["start"], part["start"] + part["duration"]
        # пропорциональная раскладка как запасной вариант
        total = sum(len(l["text"]) + 12 for l in ls)
        t = p0
        for l in ls:
            d = (p1 - p0) * (len(l["text"]) + 12) / total
            l["_a"], l["_b"] = t, t + d
            t += d
    ends, starts = silences()
    for l in lines:
        ws = [w for w in l["w"] if "s" in w]
        if len(ws) >= max(1, len(l["w"]) // 2):
            l["start"], l["end"] = ws[0]["s"], ws[-1]["e"]
        else:
            l["start"], l["end"] = l["_a"], l["_b"] - 0.12
    # Границы строк внутри куска: выбираем среди концов тишины и слов Whisper так,
    # чтобы темп чтения был ровным (Whisper местами сбивается на архаизмах).
    for pi, part in enumerate(parts):
        ls = [l for l in lines if l["part"] == pi]
        p0, p1 = part["start"], part["start"] + part["duration"]
        rate = (p1 - p0) / sum(len(l["text"]) + 4 for l in ls)
        cand = sorted(set(round(e, 3) for e in ends if p0 + 0.05 < e < p1 - 0.3))
        best = {}
        # состояние: (номер строки, начало); первая строка начинается у края куска
        first_opts = [e for e in cand if e < p0 + 1.2] + [ls[0]["start"], p0 + 0.05]
        layer = {round(max(p0, x), 3): (0.0, [round(max(p0, x), 3)]) for x in first_opts}
        for i, l in enumerate(ls[1:], 1):
            w = l["start"]
            prop = l["_a"]
            opts = set(cand) | {round(w, 3), round(prop, 3)}
            new = {}
            prev_len = len(ls[i - 1]["text"]) + 4
            for b_ in opts:
                pen = 0 if b_ in cand else 0.12
                pen += 0.25 * min(abs(b_ - w), 2.0)
                for a_, (cost, path) in layer.items():
                    if b_ <= a_ + 0.4:
                        continue
                    c = cost + ((b_ - a_) / (prev_len * rate) - 1) ** 2 + pen
                    if b_ not in new or c < new[b_][0]:
                        new[b_] = (c, path + [b_])
            layer = new
        last_len = len(ls[-1]["text"]) + 4
        finish = {a_: (cost + ((p1 - a_) / (last_len * rate) - 1) ** 2, path) for a_, (cost, path) in layer.items()}
        _, path = min(finish.values(), key=lambda v: v[0])
        for l, st in zip(ls, path):
            l["start"] = st
    # Если строка не попала на конец тишины, а рядом он есть и Whisper согласен, притягиваем
    n_snap = 0
    for i, l in enumerate(lines):
        ws = [w for w in l["w"] if "s" in w]
        if not ws or any(abs(e - l["start"]) < 0.1 for e in ends):
            continue
        near = [e for e in ends if abs(e - ws[0]["s"]) < 0.3 and abs(e - l["start"]) < 0.8]
        prev_ok = i == 0 or not near or min(near) > lines[i - 1]["start"] + 0.5
        next_ok = i + 1 == len(lines) or not near or max(near) < lines[i + 1]["start"] - 0.5
        if near and prev_ok and next_ok:
            l["start"] = min(near, key=lambda e: abs(e - ws[0]["s"]))
            n_snap += 1
    print("притянуто строк", n_snap)
    for i, l in enumerate(lines):
        nxt = lines[i + 1]["start"] if i + 1 < len(lines) else dur
        # конец строки: начало последней тишины перед следующей строкой
        sil = [x for x in starts if l["start"] + 0.5 < x < nxt - 0.02]
        l["end"] = sil[-1] if sil else nxt
        # слова: распознанные как есть, остальные по длине внутри строки
        n = sum(len(w["w"]) + 1 for w in l["w"])
        t = l["start"]
        span = l["end"] - l["start"]
        for w in l["w"]:
            d = span * (len(w["w"]) + 1) / n
            w["s"], w["e"] = t, t + d
            t += d
    out = {"voiceDuration": round(dur, 3), "matchedWords": matched, "totalWords": len(toks), "lines": [
        {"n": l["n"], "text": l["text"], "role": l["role"], "stanza": l["stanza"], "start": round(l["start"], 3), "end": round(l["end"], 3),
         "words": [{"w": w["w"], "s": round(w["s"], 3), "e": round(w["e"], 3)} for w in l["w"]]} for l in lines]}
    (POEM / "timings.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf8")
    print("строк", len(lines), "слов распознано", matched, "/", len(toks), "голос", round(dur, 1))


if __name__ == "__main__":
    main()
