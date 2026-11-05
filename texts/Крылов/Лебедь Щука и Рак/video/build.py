"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для музыки.
"""

import html
import json
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 4.5      # где в ролике начинается голос
OUTRO = 6.5   # финал после голоса
SRC = ("base.js", "chars.js", "world.js", "gfx.js", "main.js")

import os
T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
TITLE, AUTHOR = "Лебедь, Щука и Рак", "Иван Андреевич Крылов · 1814"
FINAL_AUTHOR = "Иван Андреевич Крылов"
BLOCKS = [[1, 3], [4, 12]]   # мораль, рассказ: на новом блоке строки сверху очищаются
KEYS = {"согласья", "мука", "лебедь", "рак", "щука", "воз", "ходу", "легка", "облака", "назад", "воду", "судить", "ныне", "там"}


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md, с временем начала; тире берёт время следующего слова."""
    toks = l["text"].split()
    ws = [w for w in l["words"] if norm(w["text"])]
    out, j = [], 0
    for tok in toks:
        if not norm(tok):
            out.append([tok, None])
            continue
        assert j < len(ws) and norm(ws[j]["text"]) == norm(tok), f"строка {l['n']}: «{tok}» ≠ {ws[j]['text'] if j < len(ws) else '—'}"
        out.append([tok, ws[j]["start"]])
        j += 1
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


EV = {"V0": V0} | {f"L{i}": S(i) for i in range(1, 13)} | {f"E{i}": E(i) for i in range(1, 13)}
WORDS = {"w_soglas": (1, "согласья"), "w_net": (1, "нет"), "w_lad": (2, "лад"), "w_poidet": (2, "пойдёт"), "w_muka": (3, "мука"),
         "w_leb": (4, "Лебедь"), "w_rak": (4, "Рак"), "w_shch": (4, "Щука"),
         "w_pokl": (5, "поклажей"), "w_voz": (5, "воз"), "w_vzial": (5, "взялись"),
         "w_troe": (6, "трое"), "w_vpr": (6, "впряглись"),
         "w_lezut": (7, "лезут"), "w_vozu": (7, "возу"), "w_hodu": (7, "ходу"),
         "w_legka": (8, "легка"), "w_obl": (9, "облака"),
         "w_nazad": (10, "назад"), "w_shch2": (10, "Щука"), "w_vodu": (10, "воду"),
         "w_vin": (11, "виноват"), "w_prav": (11, "прав"), "w_sud": (11, "судить"),
         "w_voz3": (12, "воз"), "w_nyne": (12, "ныне"), "w_tam": (12, "там")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {
    "wipe1": V0 - 0.65,            # заставка → доска
    "wipe2": S(4) - 0.6,           # доска → арена
    "wipe3": S(9) - 0.55,          # арена → повтор
    "green": S(7) - 0.12,          # зелёный огонь и свисток старта
    "fin": E(12) + 1.0,            # финальная плашка с названием
    "total": TOTAL,
}
EV["red1"] = min(EV["green"] - 0.3, max(EV["green"] - 0.7, EV["w_vpr"] + 0.15))   # огни — после «впряглись»
EV["red2"] = (EV["red1"] + EV["green"]) / 2
EV = {k: round(v, 3) for k, v in EV.items()}
if EV["wipe2"] < EV["E3"] - 0.1:
    print("ВНИМАНИЕ: шторка к арене наезжает на конец морали")
assert EV["fin"] < TOTAL - 4.5, "финальный кадр с названием слишком короткий"


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"
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
