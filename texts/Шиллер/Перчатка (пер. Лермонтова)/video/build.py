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
OUTRO = 7.5   # финал после голоса
SRC = ("base.js", "chars.js", "world.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
TITLE, AUTHOR = "Перчатка", "Фридрих Шиллер · 1797"
SUB = "перевод Михаила Лермонтова · 1829"
FINAL_AUTHOR = "Фридрих Шиллер · перевод М. Ю. Лермонтова"
# смысловые блоки: на новом блоке строки сверху очищаются
# блоки = строфы: плашка очищается только между строфами, внутри строки прокручиваются (каждая видна, пока звучит следующая)
BLOCKS = [[1, 6], [7, 16], [17, 30], [31, 34], [35, 40], [41, 44], [45, 51], [52, 55]]
KEYS = {"король", "лев", "тигр", "перчатка", "перчатку", "рыцарю", "рыцарь", "кунигунда", "зевая", "гривой", "прыжком", "завыл",
        "ложится", "упади", "бежит", "подымает", "хвала", "кинул", "покинул"}


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
WORDS = {"w_velm": (1, "Вельможи"), "w_molcha1": (2, "молча"), "w_zrel": (2, "зрелища"), "w_mezh": (3, "Меж"), "w_korol": (4, "Король"),
         "w_tron": (4, "троне"), "w_balk": (5, "балконе"), "w_hor": (6, "Хор"), "w_dam": (6, "дам"), "w_blest": (6, "блестел"),
         "w_znak": (7, "знаку"), "w_dver": (8, "дверь"), "w_otvor": (8, "отворяют"), "w_lev": (9, "лев"), "w_vyh": (9, "выходит"),
         "w_stop": (10, "стопой"), "w_molcha2": (11, "молча"), "w_glyad": (12, "Глядит"), "w_zev": (13, "Зевая"), "w_tryas": (14, "Трясёт"),
         "w_griv": (14, "гривой"), "w_obozr": (15, "обозрев"), "w_lozh1": (16, "Ложится"), "w_mahn": (17, "махнул"), "w_tigr": (18, "тигр"),
         "w_pryzh": (19, "прыжком"), "w_vzlet": (20, "Взлетел"), "w_vstr": (21, "встретясь"), "w_zavyl": (22, "Завыл"),
         "w_hvost": (23, "хвостом"), "w_potom": (24, "Потом"), "w_tiho": (25, "Тихо"), "w_obh": (25, "обходит"), "w_glaz": (26, "Глаз"),
         "w_rab": (27, "раб"), "w_vlad": (27, "владыкой"), "w_vorch": (28, "ворчит"), "w_zlit": (28, "злится"), "w_nevol": (29, "невольно"),
         "w_lozh2": (29, "ложится"), "w_ryad": (30, "рядом"), "w_sverhu": (31, "Сверху"), "w_upadi": (31, "упади"),
         "w_perch1": (32, "Перчатка"), "w_ruki": (32, "руки"), "w_sudby": (33, "Судьбы"), "w_mezhdu": (34, "Между"), "w_chet": (34, "четою"),
         "w_rycar1": (35, "рыцарю"), "w_obrat": (35, "обратясь"), "w_kunig": (36, "Кунигунда"), "w_smeyas": (36, "смеясь"),
         "w_rycar2": (37, "Рыцарь"), "w_pytat": (37, "пытать"), "w_lyub": (38, "любовь"), "w_tverd": (39, "твердите"),
         "w_podym": (40, "подымите"), "w_perch2": (40, "перчатку"), "w_rycar3": (41, "рыцарь"), "w_balk2": (41, "балкона"),
         "w_bezh": (41, "бежит"), "w_dersk": (42, "дерзко"), "w_krug": (42, "круг"), "w_vstup": (42, "вступает"), "w_perch3": (43, "перчатку"),
         "w_zver": (43, "зверей"), "w_glyadit": (43, "глядит"), "w_smel": (44, "смелой"), "w_podym2": (44, "подымает"),
         "w_zrit": (45, "зрители"), "w_robk": (45, "робком"), "w_trep": (46, "Трепеща"), "w_yunosh": (46, "юношу"), "w_vot": (47, "вот"),
         "w_prinos": (47, "приносит"), "w_nazad": (47, "назад"), "w_otvs": (48, "Отвсюду"), "w_hvala": (48, "хвала"), "w_nezh": (49, "нежный"),
         "w_vzglyad": (49, "взгляд"), "w_schast": (50, "счастья"), "w_ruk": (51, "рукой"), "w_geroya": (51, "героя"), "w_dosad": (52, "досады"),
         "w_ogne": (52, "огне"), "w_licu": (53, "лицо"), "w_kinul": (53, "кинул"), "w_blag": (54, "Благодарности"), "w_nadob": (54, "надобно"),
         "w_mne": (54, "мне"), "w_gord": (55, "гордую"), "w_totch": (55, "тотчас"), "w_pokin": (55, "покинул")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"fin": E(NL) + 2.4, "total": TOTAL}
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
             f'<div class="tt" id="tt1"><h1>{html.escape(TITLE)}</h1><p>{html.escape(AUTHOR)}</p><h2>{html.escape(SUB)}</h2></div></div>')
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
