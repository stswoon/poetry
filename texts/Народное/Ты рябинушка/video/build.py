"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для музыки.
"""

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 5.0      # где в ролике начинается голос
OUTRO = 8.0   # финал после голоса
SRC = ("paint.js", "tree.js", "main.js")

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

TITLE, AUTHOR = "Ты, рябинушка…", "Русская народная песня"
LINE_TOPS = [335, 435, 535, 635]
# Слова киноварью
KEYS = {"рябинушка", "Раскудрявая,", "взошла,", "выросла?", "весной", "Летом", "зорям", "Солнцем"}


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if word in w["text"]:
            return round(w["start"] + V0, 3)
    raise KeyError(word)


EV = {f"L{i}": S(i) for i in range(1, 9)} | {f"E{i}": E(i) for i in range(1, 9)}
WORDS = {"rja": (1, "рябинушка"), "ras": (2, "Раскудрявая"), "vz1": (3, "взошла"), "vy1": (4, "выросла"),
         "ves": (5, "весной"), "vz2": (5, "взошла"), "let": (6, "Летом"), "vy2": (6, "выросла"),
         "zor": (7, "зорям"), "cve": (7, "цвела"), "sol": (8, "Солнцем"), "vyz": (8, "вызрела")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {
    "q_out": S(5) - 0.75, "q_oute": S(5) - 0.35,     # строки вопроса уходят перед ответом
    "a_in": S(5) - 0.35,                              # лист ответа
    "a_out": E(8) + 0.9, "a_oute": E(8) + 1.35,       # строки ответа уходят
    "fin": E(8) + 1.35,                               # финальный титр
    "glint": E(8) + 0.5,                              # блик лака по готовому блюду
    "total": TOTAL,
}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["q_out"] > EV["E4"] + 0.2, "пауза между вопросом и ответом слишком короткая"
assert EV["fin"] < TOTAL - 4.5, "финальный кадр с названием слишком короткий"


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"
    screen = [line_tokens(l) for l in LINES]
    screen = [" ".join(t for t, _, _ in toks) for toks in screen]
    assert want == screen, f"слова на экране расходятся с poem.md: {screen}"


def line_tokens(l):
    """Слова строки с временем; тире реплики пишется вместе с первым словом."""
    toks = []
    words = l["words"]
    if l["text"].startswith("— "):
        toks.append(("—", words[0]["start"], words[0]["end"]))
    toks += [(w["text"], w["start"], w["end"]) for w in words]
    return toks


def word(tok, at, dur, key=False):
    cls = "w k" if key else "w"
    return f'<span class="{cls}" data-at="{at:.3f}" data-d="{dur:.3f}">{html.escape(tok)}</span>'


def stanza(n, lines, start, end):
    rows = []
    for i, l in enumerate(lines):
        ws = " ".join(word(t, s + V0 - 0.04, min(max((e - s) * 0.9, 0.2), 0.6), t in KEYS) for t, s, e in line_tokens(l))
        rows.append(f'<div class="line" style="top:{LINE_TOPS[i]}px">{ws}</div>')
    return (f'<div id="st{n}" class="clip txt" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="3" data-track-kind="captions">'
            f'<div class="sheet" id="sh{n}">' + "".join(rows) + "</div></div>")


def card(cid, start, end, t0, cls):
    return (f'<div id="{cid}" class="clip txt" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="4" data-track-kind="graphics">'
            f'<div class="sheet {cls}" id="{cid}s"><h1 class="ct">{word(TITLE, t0, 1.1)}</h1>'
            f'<p class="ca">{word(AUTHOR, t0 + 0.9, 0.9)}</p></div></div>')


def build_text():
    a = [card("card1", 0, EV["L1"] - 0.25, 0.7, "intro")]
    a.append(stanza(1, LINES[0:4], EV["L1"] - 0.3, EV["q_oute"]))
    a.append(stanza(2, LINES[4:8], EV["a_in"], EV["a_oute"]))
    a.append(card("card2", EV["a_out"], TOTAL, EV["fin"], "final"))
    return "\n      ".join(a)


def main():
    check_text()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"V0": V0, "OUTRO": OUTRO, **EV}, indent=1), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copyfile(music, assets / "music.wav")
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV}, ensure_ascii=False))
              .replace("%%JS%%", js))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")
    print(json.dumps(EV, ensure_ascii=False))


if __name__ == "__main__":
    main()
