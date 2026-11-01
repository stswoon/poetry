"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для make_music.mjs.
"""

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 5.0      # где в ролике начинается голос
OUTRO = 8.0   # финал после голоса

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

TITLE1, TITLE2, AUTHOR, YEAR = "Травка", "зеленеет…", "Алексей Николаевич Плещеев", "1858"
# Цветные слова
KEYS = {"Травка": "gr", "зеленеет,": "gr", "Солнышко": "or", "блестит;": "or", "Ласточка": "bl", "весною": "gr", "сени": "re",
        "солнце": "or", "краше": "or", "весна": "pi", "милей…": "pi", "Прощебечь": "bl", "привет": "re",
        "зёрен,": "or", "песню": "bl", "спой,": "bl", "стран": "te", "далёких": "te", "Принесла": "bl"}


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if word in w["text"]:
            return round(w["start"] + V0, 3)
    raise KeyError(word)


EV = {f"L{i}": S(i) for i in range(1, 13)} | {f"E{i}": E(i) for i in range(1, 13)}
EV |= {
    "zel": word_at(1, "зеленеет"), "sol": word_at(2, "Солнышко"), "ble": word_at(2, "блестит"), "las": word_at(3, "Ласточка"),
    "sen": word_at(4, "сени"), "let": word_at(4, "летит"), "sol2": word_at(5, "солнце"), "kra": word_at(5, "краше"),
    "ves": word_at(6, "весна"), "pro": word_at(7, "Прощебечь"), "dor": word_at(7, "дороги"), "pri": word_at(8, "привет"),
    "dam": word_at(9, "Дам"), "zer": word_at(9, "зёрен"), "pes": word_at(10, "песню"), "spo": word_at(10, "спой"),
    "str": word_at(11, "стран"), "dal": word_at(11, "далёких"), "pri2": word_at(12, "Принесла"), "sob": word_at(12, "собой"),
    "wipe0": V0 - 1.05, "wipe0e": V0 - 0.42,
    "wipe1": E(4) + 0.14, "wipe1e": E(4) + 0.72,
    "wipe2": E(8) + 0.14, "wipe2e": E(8) + 0.72,
    "wipe3": E(12) + 0.95, "wipe3e": E(12) + 1.55,
    "total": TOTAL,
}


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"
    screen = [" ".join(w["text"] for w in l["words"]) for l in LINES]
    assert want == screen, f"слова timings.json расходятся с poem.md: {screen}"


def word(tok, at, key=None, extra=""):
    cls = f"w {key}" if key else "w"
    return f'<span class="{cls}{extra}" data-at="{at:.3f}">{html.escape(tok)}</span>'


def stanza(n, lines, start, end):
    rows = []
    for l in lines:
        ws = " ".join(word(w["text"], w["start"] + V0 - 0.05, KEYS.get(w["text"])) for w in l["words"])
        rows.append(f'<div class="line">{ws}</div>')
    return (f'<div id="st{n}" class="clip txt plate" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="3" data-track-kind="captions">'
            + "".join(rows) + "</div>")


def card1():
    t = -0.3
    return (f'<div id="card1" class="clip txt" data-start="0" data-duration="{EV["wipe0e"]:.3f}" data-track-index="4" data-track-kind="graphics">'
            f'<h1 class="t1">{word(TITLE1, t)}</h1><h1 class="t2">{word(TITLE2, t + 0.3)}</h1>'
            f'<p class="au">{word(AUTHOR, t + 0.85)}</p><p class="ye">{word(YEAR, t + 1.25)}</p></div>')


def card2():
    t = EV["wipe3e"] + 0.02
    return (f'<div id="card2" class="clip txt plate" data-start="{EV["wipe3e"]:.3f}" data-duration="{TOTAL - EV["wipe3e"]:.3f}" data-track-index="4" data-track-kind="graphics">'
            f'<h1 class="c1">{word(TITLE1, t, "gr")}</h1><h1 class="c2">{word(TITLE2, t + 0.25, "gr")}</h1>'
            f'<p class="ca">{word(AUTHOR, t + 0.65)}</p><p class="cy">{word(YEAR, t + 0.95, "re")}</p></div>')


def build_text():
    a = [card1()]
    a.append(stanza(1, LINES[0:4], EV["L1"] - 0.3, EV["wipe1e"]))
    a.append(stanza(2, LINES[4:8], EV["wipe1e"], EV["wipe2e"]))
    a.append(stanza(3, LINES[8:12], EV["wipe2e"], EV["wipe3e"]))
    a.append(card2())
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
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in ("paint.js", "figures.js", "scene.js"))
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV}, ensure_ascii=False))
              .replace("%%JS%%", js))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
