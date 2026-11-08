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
V0 = 4.5      # где в ролике начинается голос
OUTRO = 7.5   # финал после голоса
SRC = ("base.js", "gfx.js", "chars.js", "scenes1.js", "scenes2.js", "scenes3.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
BIG = [42, 91]  # строки-карточки крупно по центру
# пары строк внутри строфы; крупные строки и их соседи — отдельными блоками
BLOCKS = []
for s in range(17):
    a = s * 6 + 1
    for b in (a, a + 2, a + 4):
        pair = [b, b + 1]
        if any(x in BIG for x in pair):
            BLOCKS += [[b, b], [b + 1, b + 1]]
        else:
            BLOCKS.append(pair)
KEYS = {"олег", "олега", "кудесник", "конь", "коня", "коне", "конем", "смерть", "змия", "череп", "щит", "погибель", "кости", "тризне"}


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
WORDS = {
    "w_hoz": (2, "хозарам"), "w_sely": (3, "сёлы"), "w_mech": (4, "мечам"), "w_pozh": (4, "пожарам"), "w_bron": (5, "броне"),
    "w_kud1": (8, "кудесник"), "w_perun": (9, "Перуну"), "w_vest": (10, "вестник"), "w_podieh": (12, "подъехал"),
    "w_zeml": (16, "землёю"), "w_konya3": (18, "коня"),
    "w_vlad": (19, "владык"), "w_yazyk": (21, "язык"), "w_chele": (24, "челе"),
    "w_slava": (26, "слава"), "w_imya": (27, "имя"), "w_shchit": (28, "щит"), "w_zavid": (30, "Завидует"),
    "w_val": (31, "вал"), "w_prashch": (33, "пращ"), "w_strela": (33, "стрела"), "w_kinzhal": (33, "кинжал"), "w_khran": (36, "хранитель"),
    "w_secha": (41, "сеча"),
    "w_usm": (43, "усмехнулся"), "w_odnako": (43, "однако"), "w_slez": (46, "слезает"),
    "w_strem": (52, "стремя"), "w_pomni": (53, "помни"),
    "w_popon": (55, "попоной"), "w_korm": (57, "кормите"), "w_drug": (60, "другого"),
    "w_zvon": (62, "звоне"), "w_kudri": (63, "кудри"),
    "w_burn": (70, "бурный"), "w_pochil": (72, "почил"),
    "w_ponik": (73, "поник"), "w_prezr": (76, "Презреть"),
    "w_dozhd": (83, "дожди"), "w_pyl": (83, "пыль"), "w_veter": (84, "ветер"),
    "w_nastup": (85, "наступил"), "w_sekir": (89, "секирой"),
    "w_zmiya": (93, "змия"), "w_obvil": (95, "обвилась"), "w_vskr": (96, "вскрикнул"),
}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + 2.2, "total": TOTAL}
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
    assert sorted(sum(([x for x in range(b[0], b[1] + 1)] for b in BLOCKS), [])) == list(range(1, NL + 1)), "блоки строк"


def word(tok, at):
    cls = "w k" if norm(tok) in KEYS else "w"
    return f'<span class="{cls}" data-at="{at:.3f}">{html.escape(tok)}</span>'


def build_text():
    caps, big = [], []
    for l in LINES:
        ws = " ".join(word(t, s + V0) for t, s in tokens(l))
        if l["n"] in BIG:
            big.append(f'<div class="cap big" id="c{l["n"]}" data-n="{l["n"]}">{ws}</div>')
        else:
            caps.append(f'<div class="cap" id="c{l["n"]}" data-n="{l["n"]}">{ws}</div>')
    a = [f'<div id="caps" class="clip layer" data-start="{EV["L1"] - 0.6:.3f}" data-duration="{EV["fin"] - EV["L1"] + 0.6:.3f}" '
         f'data-track-index="3" data-track-kind="captions">' + "".join(caps) + "</div>",
         f'<div id="bigcaps" class="clip layer" data-start="{EV["L42"] - 0.6:.3f}" data-duration="{EV["E91"] - EV["L42"] + 1.6:.3f}" '
         f'data-track-index="4" data-track-kind="graphics" data-layout-allow-overlap>' + "".join(big) + "</div>"]
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
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV, "blocks": BLOCKS, "big": BIG, "nl": NL}, ensure_ascii=False))
              .replace("%%JS%%", js))
    ids = re.findall(r'id="([^"]+)"', out)
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
