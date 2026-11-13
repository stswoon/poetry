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
SUB = "перевод Василия Жуковского · 1831"
FINAL_AUTHOR = "Фридрих Шиллер · перевод В. А. Жуковского"
# смысловые блоки: на новом блоке строки сверху очищаются
BLOCKS = [[1, 3], [4, 5], [6, 8], [9, 10], [11, 14], [15, 16], [17, 19], [20, 22], [23, 24], [25, 26], [27, 28], [29, 31],
          [32, 33], [34, 36], [37, 40], [41, 43], [44, 46], [47, 50], [51, 52], [53, 56], [57, 58], [59, 60]]
KEYS = {"франциск", "зверь", "лев", "льва", "тигр", "тигром", "барса", "перчатка", "перчатку", "делоржа", "делорж", "витязь",
        "зевнул", "лёг", "прянул", "прыжок", "рыканьем", "смирились", "сорвалася", "награды", "бросил"}


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
WORDS = {"w_zverin": (1, "зверинцем"), "w_baron": (2, "баронами"), "w_prinz": (2, "принцем"), "w_franc": (3, "Франциск"),
         "w_balk1": (4, "балкона"), "w_glyadel": (4, "глядел"), "w_popr": (5, "поприще"), "w_srazh": (5, "сраженья"),
         "w_korol": (6, "королём"), "w_obvor": (6, "обворожая"), "w_dam": (8, "дам"), "w_ryad": (8, "ряд"),
         "w_znak": (9, "знак"), "w_stuk": (10, "стуком"), "w_dver": (10, "дверь"), "w_grozn": (11, "грозный"), "w_golov": (12, "головою"),
         "w_lev": (13, "лев"), "w_vyh": (14, "Выходит"), "w_glaza": (15, "глаза"), "w_ogl": (16, "оглядев"), "w_morsh": (17, "Наморщил"),
         "w_osank": (17, "осанкой"), "w_shevel": (18, "Пошевелил"), "w_potyan": (19, "потянулся"), "w_zevn": (19, "зевнул"),
         "w_leg": (20, "лёг"), "w_mahn2": (20, "махнул"), "w_zatv": (21, "Затвор"), "w_gryan": (21, "грянул"), "w_tigr": (22, "тигр"),
         "w_pryan": (22, "прянул"), "w_vidit": (23, "видит"), "w_rob": (23, "робеет"), "w_rev": (23, "ревёт"), "w_hvost": (24, "хвостом"),
         "w_krad": (25, "кра́дется"), "w_kos": (25, "косяся"), "w_lizh": (26, "лижет"), "w_obosh": (27, "обошедши"), "w_rych": (28, "Рычит"),
         "w_lozh": (28, "ложится"), "w_tret": (29, "третий"), "w_mahn3": (29, "махнул"), "w_bars": (30, "барса"), "w_pryzh": (31, "прыжок"),
         "w_ochut": (31, "очутились"), "w_udar": (32, "удар"), "w_lapoy": (32, "лапой"), "w_lev2": (33, "лев"), "w_ryk": (33, "рыканьем"),
         "w_vstal": (33, "встал"), "w_smir": (34, "смирились"), "w_oskal": (35, "Оскалив"), "w_otosh": (35, "отошли"), "w_zaryc": (36, "зарычали"),
         "w_legli": (36, "легли"), "w_gosti": (37, "гости"), "w_bitva": (37, "битва"), "w_vdrug": (38, "Вдруг"), "w_sorv": (38, "сорвалася"),
         "w_perch1": (39, "Перчатка"), "w_glyad": (39, "глядят"), "w_upala": (40, "упала"), "w_zver2": (40, "зверей"),
         "w_rycar": (41, "рыцаря"), "w_licem": (41, "лицемерной"), "w_ulyb": (42, "улыбкою"), "w_krasav": (43, "красавица"),
         "w_kogda": (44, "Когда"), "w_lyub": (45, "любишь"), "w_perch2": (46, "перчатку"), "w_vozvr": (46, "возвратишь"),
         "w_delorzh": (47, "Делорж"), "w_slova": (47, "слова"), "w_zveryam": (48, "зверям"), "w_idet": (48, "идёт"), "w_smelo": (49, "смело"),
         "w_beret": (49, "берёт"), "w_vozvr2": (50, "возвращается"), "w_sobr": (50, "собранью"), "w_dersk": (51, "дерзости"),
         "w_strah": (52, "страха"), "w_serdce": (52, "сердце"), "w_vityaz": (53, "витязь"), "w_nichego": (54, "ничего"),
         "w_spok": (55, "Спокойно"), "w_vshod": (55, "всходит"), "w_balkon": (55, "балкон"), "w_rukopl": (56, "Рукоплесканьем"),
         "w_privet": (57, "приветствуют"), "w_vzglyad": (57, "взгляды…"), "w_holod": (58, "холодно"), "w_ochey": (58, "очей,"),
         "w_lico": (59, "лицо"), "w_brosil": (60, "бросил"), "w_skazal": (60, "сказал:"), "w_ne": (60, "«Не"), "w_nagr": (60, "награды».")}
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
