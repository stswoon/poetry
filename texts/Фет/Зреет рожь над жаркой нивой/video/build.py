"""«Зреет рожь над жаркой нивой…» (Фет), пастозная живопись маслом. Собирает index.html из src/*.js, ../poem.md
и ../timings.json; пишет ../music/events.json (время строк, слов и событий для музыки и шумов).

Запуск: python3 build.py            (после правки таймингов, текста или исходников)
        PROBE=boy python3 build.py  (страница-проба: позы мальчика во всех сценах; затем снова без PROBE)
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 3.6      # где в ролике начинается голос (до него — титр с действием)
OUTRO = 6.0   # финал после голоса: название крупно (обложка)
SRC = ("gfx.js", "world.js", "boy.js", "text.js", "scenes.js", "main.js")
PROBE = os.environ.get("PROBE", "")

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е").replace("́", ""))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md с временем; знак без букв берёт время соседнего слова."""
    toks = l["text"].split()
    ws = [w for w in l["words"] if norm(w["text"])]
    out, j = [], 0
    for tok in toks:
        if not norm(tok):
            out.append([tok, None, None])
            continue
        assert j < len(ws) and norm(ws[j]["text"]) == norm(tok), f"строка {l['n']}: «{tok}» ≠ {ws[j]['text'] if j < len(ws) else '—'}"
        out.append([tok, ws[j]["start"], ws[j]["end"]])
        j += 1
    assert j == len(ws), f"строка {l['n']}: лишние слова в timings.json"
    for i in range(len(out) - 1, -1, -1):
        if out[i][1] is None:
            src = out[i + 1] if i + 1 < len(out) else out[i - 1]
            out[i][1], out[i][2] = src[1], src[2]
    return out


def word_at(n, word, end=False):
    for tok, st, en in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            return round((en if end else st) + V0, 3)
    raise KeyError(f"{n}: {word}")


WORDS = {
    "zreet": (1, "Зреет"), "rozh": (1, "рожь"), "zharkoy": (1, "жаркой"), "niva2": (2, "нивы"), "do": (2, "до"),
    "gonit": (3, "Гонит"), "veter": (3, "ветер"), "prih": (3, "прихотливый"), "zolot": (4, "Золотые"), "perel": (4, "переливы"),
    "robko": (5, "Робко"), "mesyac": (5, "месяц"), "ochi": (5, "очи"), "izum": (6, "Изумлён"), "den1": (6, "день"), "minul": (6, "минул"),
    "shiroko": (7, "широко"), "noch": (7, "ночи"), "den2": (8, "День"), "obyat": (8, "объятия"), "raskin": (8, "раскинул"),
    "bezbr": (9, "безбрежной"), "zhatv": (9, "жатвой"), "zakat": (10, "заката"), "vostok": (10, "востока"),
    "mig": (11, "миг"), "smezh": (11, "смежает"), "nebo": (11, "небо"), "oko": (12, "Огнедышащее"), "oko2": (12, "око"),
}


def build_ev():
    ev = {"V0": V0, "total": TOTAL}
    ev |= {f"L{i}": S(i) for i in range(1, NL + 1)}
    ev |= {f"E{i}": E(i) for i in range(1, NL + 1)}
    ev |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
    ev["fin"] = round(E(NL) + 1.0, 3)
    assert ev["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"
    return {k: round(v, 3) for k, v in ev.items()}


def check_text():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1].split("\n## ")[0]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, "слова на экране расходятся с poem.md"


def main():
    check_text()
    ev = build_ev()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"OUTRO": OUTRO, **ev}, indent=1, ensure_ascii=False), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    has_music = music.exists()
    if has_music:
        shutil.copyfile(music, assets / "music.wav")
    lines = [{"n": l["n"], "text": l["text"], "stanza": l["stanza"], "s": S(l["n"]), "e": E(l["n"]),
              "words": [{"w": t, "s": round(s + V0, 3), "e": round(e + V0, 3)} for t, s, e in tokens(l)]} for l in LINES]
    cfg = {"v0": V0, "total": TOTAL, "ev": ev, "lines": lines, "probe": PROBE}
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    ids = re.findall(r'id="([^"]+)"', (HERE / "template.tpl").read_text(encoding="utf-8"))
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    music_tag = (f'<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL:.3f}" '
                 f'data-track-index="11" data-volume="1"></audio>') if has_music and not PROBE else ""
    voice_tag = (f'<audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0:.3f}" data-duration="{T["voiceDuration"]:.3f}" '
                 f'data-track-index="10" data-volume="1"></audio>') if not PROBE else ""
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    html = (tpl.replace("{{TOTAL}}", f"{TOTAL:.3f}").replace("{{VOICE}}", voice_tag).replace("{{MUSIC}}", music_tag)
            .replace("{{CFG}}", json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))).replace("{{JS}}", js))
    (HERE / "index.html").write_text(html, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, музыка: {'есть' if has_music else 'нет'}{', ПРОБА ' + PROBE if PROBE else ''}")


if __name__ == "__main__":
    main()
