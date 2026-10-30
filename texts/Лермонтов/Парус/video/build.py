"""Собирает index.html ролика из template.tpl, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/.
"""

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 6.0      # где в ролике начинается голос
OUTRO = 8.0   # финал после голоса

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

TITLE, AUTHOR, YEAR = "Парус", "Михаил Юрьевич Лермонтов", "1832"
# Ключевые слова красно-коричневыми чернилами
RUBRIC = {1: "парус", 3: "ищет", 4: "кинул", 6: "мачта", 7: "счастия", 8: "бежит", 9: "лазури",
          10: "золотой", 11: "мятежный", 12: "покой"}


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if word in w["text"]:
            return round(w["start"] + V0, 3)
    raise KeyError(word)


FINAL = round(E(12) + 0.9, 3)
STANZAS = [
    {"id": "st1", "first": 1, "last": 4, "exit": round(S(5) - 0.7, 3)},
    {"id": "st2", "first": 5, "last": 8, "exit": round(S(9) - 0.7, 3)},
    {"id": "st3", "first": 9, "last": 12, "exit": round(FINAL, 3)},
]


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"


def chars_html(text, rubric=None):
    out = []
    for w in text.split(" "):
        cls = "w rub" if rubric and rubric in w else "w"
        out.append(f'<span class="{cls}">' + "".join(f'<span class="ch">{html.escape(c)}</span>' for c in w) + "</span>")
    return " ".join(out)


def clip(start, end, track):
    return f'class="clip" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="{track}"'


def card(cid, start, end, big):
    return (f'<div id="{cid}" {clip(start, end, 4)}><div class="card{" big" if big else ""}" id="{cid}-in">'
            f'<h1 class="card-title">{chars_html(TITLE)}</h1>'
            f'<p class="card-author">{chars_html(AUTHOR)}</p>'
            f'<p class="card-year">{chars_html(YEAR)}</p></div></div>')


def build_text():
    parts = [card("title-card", 0.0, 5.6, False)]
    parts.append(f'<div id="logbook" {clip(V0 - 0.8, FINAL + 0.7, 2)}><div class="paper" id="paper"></div></div>')
    for st in STANZAS:
        lines = "".join(f'<div class="line" id="l{n}">{chars_html(LINES[n - 1]["text"], RUBRIC.get(n))}</div>'
                        for n in range(st["first"], st["last"] + 1))
        parts.append(f'<div id="{st["id"]}" {clip(S(st["first"]) - 0.5, st["exit"] + 0.6, 3)}>'
                     f'<div class="stanza" id="{st["id"]}-in">{lines}</div></div>')
    parts.append(card("final-card", FINAL, TOTAL, True))
    return "\n      ".join(parts)


def config():
    return {
        "total": TOTAL, "voiceStart": V0, "final": FINAL,
        "lines": [{"n": l["n"], "s": S(l["n"]), "e": E(l["n"])} for l in LINES],
        "stanzas": STANZAS,
        "ev": {
            "beleet": word_at(1, "Белеет"), "tuman": word_at(2, "тумане"), "ishet": S(3), "kinul": S(4),
            "S2": S(5), "veter": word_at(5, "ветер"), "gnetsya": word_at(6, "гнётся"), "uvy": S(7), "L8": S(8), "E8": E(8),
            "S3": S(9), "struya": word_at(9, "струя"), "luch": word_at(10, "луч"), "buri": word_at(11, "бури"),
            "cloud": S(11), "L12": S(12), "END": E(12),
        },
    }


def main():
    check_text()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    shutil.copyfile(POEM / "music" / "music.wav", assets / "music.wav")
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps(config(), ensure_ascii=False)))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, final card at {FINAL:.2f} s")


if __name__ == "__main__":
    main()
