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

TITLE, AUTHOR, YEAR = "Туча", "Александр Сергеевич Пушкин", "1835"
# Ключевое слово каждой строки и его цвет
RUBRIC = {1: ("туча", "cl"), 2: ("лазури", "az"), 3: ("унылую", "cl"), 4: ("ликующий", "gr"),
          5: ("кругом", "cl"), 6: ("молния", "li"), 7: ("гром", "cl"), 8: ("дождём", "az"),
          9: ("сокройся", "li"), 10: ("освежилась", "gr"), 11: ("ветер", "az"), 12: ("успокоенных", "gr")}


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
    {"id": "st2", "first": 5, "last": 8, "exit": round(S(9) - 0.6, 3)},
    {"id": "st3", "first": 9, "last": 12, "exit": round(FINAL, 3)},
]


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"


def chars_html(text, rubric=None, n=None):
    out = []
    for w in text.split(" "):
        cls, attr = "w", ""
        if rubric and rubric[0] in w:
            cls = f"w {rubric[1]}"
            attr = f' id="k{n}"'
        out.append(f'<span class="{cls}"{attr}>' + "".join(f'<span class="ch">{html.escape(c)}</span>' for c in w) + "</span>")
    return " ".join(out)


def clip(start, end, track):
    return f'class="clip" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="{track}"'


def card(cid, start, end):
    return (f'<div id="{cid}" {clip(start, end, 4)}><div class="card" id="{cid}-in">'
            f'<h1 class="card-title">{chars_html(TITLE)}</h1>'
            f'<p class="card-author">{chars_html(AUTHOR)}</p>'
            f'<p class="card-year">{chars_html(YEAR)}</p></div></div>')


def build_text():
    parts = [card("title-card", 0.0, 5.6)]
    for st in STANZAS:
        lines = "".join(f'<div class="line" id="l{n}">{chars_html(LINES[n - 1]["text"], RUBRIC.get(n), n)}</div>'
                        for n in range(st["first"], st["last"] + 1))
        parts.append(f'<div id="{st["id"]}" {clip(S(st["first"]) - 0.5, st["exit"] + 0.6, 3)}>'
                     f'<div class="stanza" id="{st["id"]}-in">{lines}</div></div>')
    parts.append(card("final-card", FINAL, TOTAL))
    return "\n      ".join(parts)


def config():
    return {
        "total": TOTAL, "voiceStart": V0, "final": FINAL,
        "lines": [{"n": l["n"], "s": S(l["n"]), "e": E(l["n"])} for l in LINES],
        "stanzas": STANZAS,
        "keys": {str(n): word_at(n, RUBRIC[n][0]) for n in RUBRIC},
        "ev": {
            "S1": S(1), "rass": word_at(1, "рассеянной"), "E1": E(1), "L2": S(2), "L3": S(3), "ten": word_at(3, "тень"),
            "L4": S(4), "E4": E(4),
            "S2": S(5), "krug": word_at(5, "кругом"), "E5": E(5),
            "L6": S(6), "moln": word_at(6, "молния"), "obv": word_at(6, "обвивала"), "E6": E(6),
            "L7": S(7), "tain": word_at(7, "таинственный"), "grom": word_at(7, "гром"), "E7": E(7),
            "L8": S(8), "alch": word_at(8, "алчную"), "E8": E(8),
            "S3": S(9), "sokr": word_at(9, "сокройся"), "E9": E(9),
            "L10": S(10), "osv": word_at(10, "освежилась"), "bur": word_at(10, "буря"), "E10": E(10),
            "L11": S(11), "vet": word_at(11, "ветер"), "E11": E(11), "L12": S(12), "END": E(12),
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
