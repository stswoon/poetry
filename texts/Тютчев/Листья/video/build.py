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
OUTRO = 5.6   # финал после голоса
HOLD = 1.1    # последняя строка держится после голоса, затем листья складываются в название
SRC = ("base.js", "paper.js", "leaf.js", "world.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
# по две строки на бумажной полоске
BLOCKS = [[i, i + 1] for i in range(1, NL + 1, 2)]
KEYS = {"торчат", "метели", "спят", "ежа", "желтеет", "свежа", "племя", "блестим", "гостим", "лето", "лучами",
        "росе", "отпели", "отцвели", "побледнели", "зефиры", "желтеть", "улететь", "ветры", "сорвите", "умчите",
        "летите", "летим"}


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md, с временем начала."""
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
WORDS = {"w_torch": (2, "торчат"), "w_snega": (3, "снега"), "w_metel": (3, "метели"), "w_spyat": (4, "спят"),
         "w_zelen": (5, "зелень"), "w_igly": (6, "иглы"), "w_ezha": (6, "ежа"), "w_zhelt": (7, "желтеет"),
         "w_svezha": (8, "свежа"), "w_my": (9, "Мы"), "w_plemya": (9, "племя"), "w_blest": (10, "блестим"),
         "w_vremya": (11, "время"), "w_gostim": (12, "гостим"), "w_leto": (13, "лето"), "w_krase": (14, "красе"),
         "w_luch": (15, "лучами"), "w_rose": (16, "росе"), "w_ptichki": (17, "птички"), "w_otpeli": (17, "отпели"),
         "w_otcv": (18, "отцвели"), "w_pobl": (19, "побледнели"), "w_zef": (20, "Зефиры"), "w_ushli": (20, "ушли"),
         "w_darom": (21, "даром"), "w_viset": (22, "Висеть"), "w_zhelt2": (22, "желтеть"), "w_nimi": (23, "ними"),
         "w_ulet": (24, "улететь"), "w_vetry": (25, "ветры"), "w_skoree": (26, "Скорее"), "w_skorey": (26, "скорей"),
         "w_sorv1": (27, "сорвите"), "w_vetv": (28, "ветвей"), "w_sorv2": (29, "Сорвите"), "w_umch": (29, "умчите"),
         "w_zhdat": (30, "ждать"), "w_let1": (31, "Летите"), "w_letim": (32, "летим")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + HOLD, "total": TOTAL}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"


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
         f'data-track-index="3" data-track-kind="captions"><div id="strip"></div>' + "".join(caps) + "</div>"]
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
