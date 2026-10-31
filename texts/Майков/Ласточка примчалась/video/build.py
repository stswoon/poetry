"""Собирает index.html ролика из template.tpl, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для make_music.mjs.
"""

import html
import json
import random
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 5.0      # где в ролике начинается голос
OUTRO = 7.5   # финал после голоса

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

TITLE1, TITLE2, AUTHOR, YEAR = "Ласточка", "примчалась…", "Аполлон Николаевич Майков", "1858"
# Цветные слова и их цвета
KEYS = {"Ласточка": "sw", "примчалась": "sw", "бела": "se", "моря,": "se", "запела:": "no", "февраль": "fe", "злися,": "fe",
        "март,": "ma", "хмурься,": "ma", "снег,": "sn", "дождик": "ra", "весною": "gr", "пахнет!": "pi"}
rng = random.Random(1858)


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if word in w["text"]:
            return round(w["start"] + V0, 3)
    raise KeyError(word)


EV = {
    "L1": S(1), "E1": E(1), "L2": S(2), "E2": E(2), "L3": S(3), "E3": E(3), "L4": S(4), "E4": E(4),
    "L5": S(5), "E5": E(5), "L6": S(6), "E6": E(6), "L7": S(7), "E7": E(7),
    "sela": word_at(3, "Села"), "zap": word_at(3, "запела"), "fev": word_at(4, "февраль"), "zli": word_at(4, "злися"),
    "mar": word_at(5, "март"), "hmu": word_at(5, "хмурься"), "sneg": word_at(6, "снег"), "dozh": word_at(6, "дождик"),
    "ves": word_at(7, "весною"), "pah": word_at(7, "пахнет"),
    "wipe1": 4.2, "wipe2": E(7) + 1.6, "final": E(7) + 2.25, "total": TOTAL,
}


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"


def ch(c, at, jit=1.0):
    """Буква от руки: чуть повёрнута и сдвинута. Время появления в data-at."""
    r, dy = rng.uniform(-2.2, 2.2) * jit, rng.uniform(-1.6, 1.6) * jit
    return f'<span class="ch" data-at="{at:.3f}" style="rotate:{r:.2f}deg;translate:0 {dy:.2f}px">{html.escape(c)}</span>'


def line_html(l):
    n, out, t_prev = l["n"], [], S(l["n"])
    words = iter(l["words"])
    for tok in l["text"].split(" "):
        if tok.strip("—-") == "":
            out.append(f'<span class="w">{ch(tok, t_prev)}</span>')
            continue
        w = next(words)
        a, b = w["start"] + V0 - 0.08, w["end"] + V0
        d = max(0.14, (b - a) * 0.92)
        chars = "".join(ch(c, a + i * d / len(tok)) for i, c in enumerate(tok))
        t_prev = a + d
        key = KEYS.get(tok)
        cls = f"w {key} pop" if key else "w"
        out.append(f'<span class="{cls}" data-word="{w["start"] + V0:.3f}">{chars}</span>')
    return f'<div class="line" id="l{n}">{" ".join(out)}</div>'


def written(text, t0, t1, jit=1.0):
    d = (t1 - t0) / max(1, len(text))
    words, i = [], 0
    for tok in text.split(" "):
        words.append('<span class="w">' + "".join(ch(c, t0 + (i + k) * d, jit) for k, c in enumerate(tok)) + "</span>")
        i += len(tok) + 1
    return " ".join(words)


def card(cid, start, end, t0):
    return (f'<div id="{cid}" class="clip txt" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="4" data-job="{t0:.3f}">'
            f'<h1 class="t1 sw">{written(TITLE1, t0, t0 + 0.8, 0.8)}</h1>'
            f'<h1 class="t2 no">{written(TITLE2, t0 + 0.8, t0 + 1.8, 0.8)}</h1>'
            f'<p class="au">{written(AUTHOR, t0 + 1.9, t0 + 3.0, 0.8)}</p>'
            f'<p class="ye">{written(YEAR, t0 + 3.05, t0 + 3.35)}</p></div>')


def build_text():
    poem = "".join(line_html(l) for l in LINES)
    host = f'<div id="poem" class="clip txt" data-start="{EV["L1"] - 0.3:.3f}" data-duration="{EV["wipe2"] + 0.65 - EV["L1"] + 0.3:.3f}" data-track-index="3">{poem}</div>'
    return "\n      ".join([card("card1", 0.0, EV["wipe1"] + 0.7, 0.2), host, card("card2", EV["final"] - 0.1, TOTAL, EV["final"])])


def main():
    check_text()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music" / "events.json").write_text(json.dumps({"V0": V0, "OUTRO": OUTRO, **EV}, indent=1), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copyfile(music, assets / "music.wav")
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV}, ensure_ascii=False)))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
