"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для музыки.
"""

import html
import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 4.0      # где в ролике начинается голос
OUTRO = 7.6   # финал после голоса
HOLD = 3.2    # последняя строка держится после голоса (Ваня въезжает в ёлку), затем финальный титр
SRC = ("base.js", "world.js", "chars.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
TITLE, AUTHOR = "Как на тоненький ледок…", "Русская народная песня"
# смысловые блоки по две строки: на новом блоке строки сверху очищаются
BLOCKS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18]]
KEYS = {"ледок", "снежок", "ванюшкадружок", "поспешал", "упал", "лежит", "девушки", "подбежали", "коня",
        "путьдорогу", "иван", "зевай"}


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md, с временем начала. Слово через дефис может быть в timings.json одним или двумя."""
    toks = l["text"].split()
    ws = [w for w in l["words"] if norm(w["text"])]
    out, j = [], 0
    for tok in toks:
        if not norm(tok):
            out.append([tok, None])
            continue
        assert j < len(ws), f"строка {l['n']}: нет времени для «{tok}»"
        st, acc = ws[j]["start"], ""
        while j < len(ws) and len(acc) < len(norm(tok)):
            acc += norm(ws[j]["text"])
            j += 1
        assert acc == norm(tok), f"строка {l['n']}: «{tok}» ≠ «{acc}»"
        out.append([tok, st])
    assert j == len(ws), f"строка {l['n']}: лишние слова в timings.json"
    for i in range(len(out) - 1, -1, -1):
        if out[i][1] is None:
            out[i][1] = out[i + 1][1] if i + 1 < len(out) else out[i - 1][1]
    return out


def word_at(n, word):
    for tok, st in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            return round(st + V0, 3)
    raise KeyError(f"{n}: {word}")


EV = {"V0": V0} | {f"L{i}": S(i) for i in range(1, NL + 1)} | {f"E{i}": E(i) for i in range(1, NL + 1)}
WORDS = {"w_led": (1, "ледок"), "w_vyp2": (2, "Выпал"), "w_vyp3": (3, "Выпал"), "w_ehal": (4, "Ехал"),
         "w_van4": (4, "Ванюшка-дружок."), "w_posp": (5, "поспешал,"), "w_dobra": (6, "добра"), "w_upal6": (6, "упал."),
         "w_lezh": (7, "лежит"), "w_nikto": (8, "Никто"), "w_bezh": (8, "бежит."), "w_dve": (9, "Две"),
         "w_uvid": (9, "увидали,"), "w_podb10": (10, "подбежали,"), "w_podb11": (11, "подбежали,"), "w_kon12": (12, "коня"),
         "w_sazh12": (12, "сажали."), "w_kon13": (13, "коня"), "w_sazh13": (13, "сажали,"), "w_put14": (14, "Путь-дорогу"),
         "w_pok14": (14, "показали."), "w_put15": (15, "Путь-дорогу"), "w_nak": (16, "наказывали:"), "w_kak": (17, "«Как"),
         "w_ivan": (17, "Иван,"), "w_zev": (18, "зевай"), "w_stor": (18, "сторонам!»")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + HOLD, "total": TOTAL}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["fin"] < TOTAL - 4.2, "финальный кадр с названием слишком короткий"


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _ in tokens(l)) for l in LINES]
    assert want == screen, f"слова на экране расходятся с poem.md: {screen}"


def word(tok, at):
    cls = "w k" if norm(tok) in KEYS else "w"
    return f'<span class="{cls}" data-at="{at:.3f}">{html.escape(tok)}</span>'


def build_text():
    caps = []
    for l in LINES:
        ws = " ".join(word(t, s + V0) for t, s in tokens(l))
        caps.append(f'<div class="cap" id="c{l["n"]}" data-n="{l["n"]}">{ws}</div>')
    a = [f'<div id="caps" class="clip layer" data-start="{EV["L1"] - 0.6:.3f}" data-duration="{EV["fin"] - EV["L1"] + 0.6:.3f}" '
         f'data-track-index="3" data-track-kind="captions">' + "".join(caps) + "</div>"]
    return "\n      ".join(a)


def main():
    check_text()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"OUTRO": OUTRO, **EV}, indent=1), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copyfile(music, assets / "music.wav")
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV, "blocks": BLOCKS}, ensure_ascii=False))
              .replace("%%JS%%", js))
    ids = re.findall(r'id="([^"]+)"', out)
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")
    print(json.dumps(EV, ensure_ascii=False))


if __name__ == "__main__":
    main()
