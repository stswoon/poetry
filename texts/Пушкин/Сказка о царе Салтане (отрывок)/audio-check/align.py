from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
poem = (root / "poem.md").read_text(encoding="utf-8-sig")
lines = re.search(r"```text\s*\n(.*?)\n```", poem, re.S).group(1).splitlines()
# Manual line alignment: full-medium word recognition, then speech edges
# checked against -35 / -45 dB silencedetect. Times refer to voice.mp3.
bounds = [
    (0.020, 1.785), (2.058, 3.483), (3.797, 5.550),
    (5.676, 7.187), (7.626, 9.050), (9.151, 10.788),
    (11.059, 12.358), (12.627, 14.126), (14.421, 16.320),
    (16.609, 18.456), (18.802, 20.229), (20.500, 22.027),
    (22.422, 24.051), (24.537, 26.537), (26.775, 28.377),
    (28.674, 29.960), (30.352, 32.192), (32.502, 33.780),
    (34.201, 35.466), (35.848, 37.705), (37.940, 39.270),
    (39.344, 40.616), (41.008, 42.693), (42.881, 44.548),
    (44.649, 46.145), (46.372, 48.469),
]
assert len(lines) == len(bounds) == 26
result = {"voiceDuration": 48.64, "introDuration": 4, "outroDuration": 6,
          "lines": [{"index": i + 1, "text": text, "start": start, "end": end}
                    for i, (text, (start, end)) in enumerate(zip(lines, bounds))]}
for i, line in enumerate(result["lines"]):
    assert 0 <= line["start"] < line["end"] <= result["voiceDuration"]
    if i:
        assert result["lines"][i - 1]["end"] <= line["start"]
(root / "timings.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
for name in ("line05", "line09", "line11"):
    source = root / "audio-check" / name / "transcript.json"
    if source.exists():
        source.rename(source.with_name("transcribe-check.json"))
print(f"Validated {len(lines)} lines; total {result['voiceDuration']:.2f}s")
transcript = json.loads((root / "transcript.json").read_text(encoding="utf-8-sig"))
expected = re.findall(r"[а-яё]+", " ".join(lines).lower().replace("ё", "е"))
actual = re.findall(r"[а-яё]+", " ".join(w["text"] for w in transcript).lower().replace("ё", "е"))
variants = {"девятся": "дивятся", "злотоглавый": "златоглавый", "полят": "палят"}
assert [variants.get(word, word) for word in actual] == expected
print(f"Lexical order: {len(expected)} words; 3 ASR spelling variants, no omissions/additions")
