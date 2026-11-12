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
OUTRO = 7.0   # финал после голоса
HOLD = 2.0    # последняя строка держится после голоса, затем финальный титр
SRC = ("base.js", "chars.js", "world.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
TITLE, AUTHOR = "Утёс", "Михаил Юрьевич Лермонтов · 1841"
FINAL_AUTHOR = "Михаил Юрьевич Лермонтов"
# смысловые блоки по две строки: на новом блоке строки сверху очищаются
BLOCKS = [[1, 2], [3, 4], [5, 6], [7, 8]]
KEYS = {"тучка", "золотая", "утесавеликана", "умчалась", "лазури", "играя", "след", "морщине", "одиноко",
        "задумался", "плачет", "пустыне"}


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
WORDS = {"w_noch": (1, "Ночевала"), "w_tuch": (1, "тучка"), "w_zol": (1, "золотая"), "w_grud": (2, "груди"),
         "w_vel": (2, "утёса-великана;"), "w_utrom": (3, "Утром"), "w_umch": (3, "умчалась"), "w_rano": (3, "рано,"),
         "w_laz": (4, "лазури"), "w_ves": (4, "весело"), "w_igr": (4, "играя;"), "w_ost": (5, "остался"),
         "w_vlag": (5, "влажный"), "w_sled": (5, "след"), "w_morsh": (5, "морщине"), "w_star": (6, "Старого"),
         "w_odin": (6, "Одиноко"), "w_stoit": (7, "стоит,"), "w_zad": (7, "задумался"), "w_glub": (7, "глубоко"),
         "w_tih": (8, "тихонько"), "w_plach": (8, "плачет"), "w_pust": (8, "пустыне.")}
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
    a.append(f'<div id="title1" class="clip layer" data-start="0" data-duration="{EV["V0"]:.3f}" data-track-index="4" data-track-kind="graphics">'
             f'<div class="tt" id="tt1"><h1>{html.escape(TITLE)}</h1><p>{html.escape(AUTHOR)}</p></div></div>')
    a.append(f'<div id="title2" class="clip layer" data-start="{EV["fin"]:.3f}" data-duration="{TOTAL - EV["fin"]:.3f}" data-track-index="4" data-track-kind="graphics">'
             f'<div class="tt" id="tt2"><h1>{html.escape(TITLE)}</h1><p>{html.escape(FINAL_AUTHOR)}</p></div></div>')
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
