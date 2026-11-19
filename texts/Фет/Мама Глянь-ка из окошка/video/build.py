"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для музыки.
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 3.4      # где в ролике начинается голос (до него мел пишет заголовок)
OUTRO = 5.6   # финал после голоса
SRC = ("base.js", "chalk.js", "people.js", "world.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
# на доске по полстрофы: три строки
BLOCKS = [[i, i + 1, i + 2] for i in range(1, NL + 1, 3)]
KEYS = {"мама": "pink", "окошка": "yellow", "кошка": "ochre", "нос": "pink", "побелело": "white", "мороз": "blue",
        "иней": "blue", "светлосиний": "blue", "тороватый": "yellow", "ватой": "white", "кусты": "green",
        "салазки": "ochre", "гору": "yellow", "бежать": "pink", "гулять": "yellow"}


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md, с временем начала и конца."""
    toks = l["text"].split()
    ws = [w for w in l["words"] if norm(w["text"])]
    out, j = [], 0
    for tok in toks:
        if not norm(tok):
            out.append([tok, None, None])
            continue
        assert j < len(ws), f"строка {l['n']}: нет времени для «{tok}»"
        st, acc = ws[j]["start"], ""
        while j < len(ws) and len(acc) < len(norm(tok)):
            acc += norm(ws[j]["text"])
            en = ws[j]["end"]
            j += 1
        assert acc == norm(tok), f"строка {l['n']}: «{tok}» ≠ «{acc}»"
        out.append([tok, st, en])
    assert j == len(ws), f"строка {l['n']}: лишние слова в timings.json"
    for i in range(len(out) - 1, -1, -1):
        if out[i][1] is None:
            out[i][1] = out[i + 1][1] if i + 1 < len(out) else out[i - 1][1]
            out[i][2] = out[i][1]
    return out


def word_at(n, word, k=0):
    hits = [st for tok, st, _ in tokens(LINES[n - 1]) if norm(tok) == norm(word)]
    return round(hits[k] + V0, 3)


EV = {"V0": V0} | {f"L{i}": S(i) for i in range(1, NL + 1)} | {f"E{i}": E(i) for i in range(1, NL + 1)}
WORDS = {"w_mama": (1, "Мама"), "w_glyan": (1, "глянь-ка"), "w_okoshka": (1, "окошка"), "w_vchera": (2, "вчера"),
         "w_koshka": (2, "кошка"), "w_umyv": (3, "Умывала"), "w_nos": (3, "нос"), "w_gryazi": (4, "Грязи"),
         "w_dvor": (4, "двор"), "w_odelo": (4, "одело"), "w_posvet": (5, "Посветлело"), "w_pobel": (5, "побелело"),
         "w_vidno": (6, "Видно"), "w_moroz": (6, "мороз"), "w_kol": (7, "колючий"), "w_sin": (7, "светло-синий"),
         "w_vetv": (8, "ветвям"), "w_iney": (8, "иней"), "w_pogl": (9, "Погляди"), "w_ty": (9, "ты"),
         "w_slovno": (10, "Словно"), "w_torov": (10, "тороватый"), "w_svezh": (11, "Свежей"), "w_beloy": (11, "белой"),
         "w_puhl": (11, "пухлой"), "w_vatoy": (11, "ватой"), "w_vse": (12, "Все"), "w_kusty": (12, "кусты"),
         "w_uzh": (13, "Уж"), "w_sporu": (13, "спору"), "w_salaz": (14, "салазки"), "w_goru": (14, "гору"),
         "w_veselo": (15, "Весело"), "w_bezh": (15, "бежать"), "w_pravda": (16, "Правда"), "w_mama2": (16, "мама"),
         "w_otkazh": (16, "откажешь"), "w_sama": (17, "сама"), "w_skazh": (17, "скажешь"), "w_nu": (18, "«Ну"),
         "w_skorey": (18, "скорей"), "w_gulyat": (18, "гулять!»")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + 0.9, "total": TOTAL}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1].split("\n## ")[0]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, f"слова на экране расходятся с poem.md: {screen}"


def caption_data():
    out = []
    for l in LINES:
        ws = []
        for tok, st, en in tokens(l):
            ws.append({"t": tok, "s": round(st + V0, 3), "e": round(en + V0, 3), "k": KEYS.get(norm(tok), "")})
        out.append({"n": l["n"], "stanza": l.get("stanza", 0), "s": S(l["n"]), "e": E(l["n"]), "w": ws})
    return out


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
    cfg = {"total": TOTAL, "ev": EV, "blocks": BLOCKS, "lines": caption_data()}
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%CFG%%", json.dumps(cfg, ensure_ascii=False))
              .replace("%%JS%%", js))
    ids = re.findall(r'id="([^"]+)"', out)
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")
    print(json.dumps(EV, ensure_ascii=False))


if __name__ == "__main__":
    main()
