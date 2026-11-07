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
V0 = 3.6      # где в ролике начинается голос
OUTRO = 7.5   # финал после голоса
SRC = ("base.js", "chars.js", "world.js", "gfx.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
TITLE, AUTHOR = "Квартет", "Иван Андреевич Крылов · 1811"
FINAL_AUTHOR = "Иван Андреевич Крылов"
# смысловые блоки: на новом блоке строки сверху очищаются
BLOCKS = [[1, 5], [6, 9], [10, 15], [16, 17], [18, 20], [21, 22], [23, 25], [26, 27], [28, 31], [32, 36]]
KEYS = {"проказницамартышка", "осел", "козел", "мишка", "квартет", "толку", "нет", "нейдет", "секрет", "рядом",
        "соловью", "соловей", "уменье", "уши", "музыканты", "годитесь", "прима", "вторы", "басом", "альта"}


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


EV = {"V0": V0} | {f"L{i}": S(i) for i in range(1, NL + 1)} | {f"E{i}": E(i) for i in range(1, NL + 1)}
WORDS = {"w_mart": (1, "Проказница-Мартышка"), "w_mish": (4, "Мишка"), "w_kv1": (5, "Квартет"),
         "w_not": (6, "нот"), "w_basa": (6, "баса"), "w_alta": (6, "альта"), "w_skr": (6, "скрипки"),
         "w_seli": (7, "сели"), "w_lipki": (7, "липки"), "w_plen": (8, "Пленять"), "w_svet": (8, "свет"),
         "w_udar": (9, "Ударили"), "w_derut": (9, "дерут"), "w_tolku": (9, "толку"), "w_net": (9, "нет"),
         "w_stoy": (10, "Стой"), "w_zapl": (15, "запляшут"), "w_rass": (16, "Расселись"), "w_nach": (16, "начали"),
         "w_neid1": (17, "нейдёт"), "w_sekret": (18, "секрет"), "w_usel": (21, "уселись"), "w_neid2": (22, "нейдёт"),
         "w_razb": (23, "разборы"), "w_solov": (26, "Соловью"), "w_prilet": (26, "прилететь"),
         "w_noty": (30, "ноты"), "w_instr": (30, "инструменты"), "w_sest": (31, "сесть"),
         "w_ushi": (33, "уши"), "w_ponezh": (33, "понежней"), "w_sadit": (35, "садитесь"), "w_godit": (36, "годитесь")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + 2.6, "total": TOTAL}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["fin"] < TOTAL - 4.2, "финальный кадр с названием слишком короткий"
assert EV["L1"] - 0.05 > EV["V0"] - 0.7, "заставка короче смены плана"


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
