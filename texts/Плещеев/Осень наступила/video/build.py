"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для музыки.
"""

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 5.0      # где в ролике начинается голос
OUTRO = 8.0   # финал после голоса
SRC = ("paint.js", "spread1.js", "spread2.js", "spread3.js", "spread4.js", "album.js")

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

TITLE1, TITLE2, AUTHOR = "Осень", "наступила…", "Алексей Николаевич Плещеев"
LINE_TOPS = [318, 428, 538, 648]
# Цветные слова: ор — ржавый, ye — охра, gr — зелёный, bl — синий, gy — серый
KEYS = {"Осень": "or", "Высохли": "ye", "уныло": "gy", "Голые": "gy", "Вянет": "ye", "желтеет": "ye", "зеленеет": "gr", "Озимь": "gr",
        "Туча": "gy", "Солнце": "ye", "Ветер": "bl", "Дождик": "bl", "воды": "bl", "ручья,": "bl", "Птички": "or", "тёплые": "or", "края.": "or"}


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if word in w["text"]:
            return round(w["start"] + V0, 3)
    raise KeyError(word)


def flip(after, before):
    """Переворот страницы в паузе между строфами: от конца строки after до начала строки before."""
    a = E(after) + 0.1
    b = min(a + 1.05, S(before) - 0.08)
    assert b - a >= 0.6, f"пауза после строки {after} короче 0,7 с"
    return round(a, 3), round(b, 3)


EV = {f"L{i}": S(i) for i in range(1, 17)} | {f"E{i}": E(i) for i in range(1, 17)}
WORDS = {"nas": (1, "наступила"), "vys": (2, "Высохли"), "cve": (2, "цветы"), "uny": (3, "уныло"), "gol": (4, "Голые"), "kus": (4, "кусты"),
         "vya": (5, "Вянет"), "zhe": (5, "желтеет"), "lug": (6, "лугах"), "tol": (7, "Только"), "zel": (7, "зеленеет"), "ozi": (8, "Озимь"), "pol": (8, "полях"),
         "tuc": (9, "Туча"), "kro": (9, "кроет"), "sol": (10, "Солнце"), "ble": (10, "блестит"), "vet": (11, "Ветер"), "voe": (11, "воет"),
         "dzh": (12, "Дождик"), "mor": (12, "моросит"), "zas": (13, "Зашумели"), "vod": (13, "воды"), "bys": (14, "Быстрого"), "ruc": (14, "ручья"),
         "pti": (15, "Птички"), "ule": (15, "улетели"), "tep": (16, "тёплые"), "kra": (16, "края")}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
for i, (a, b) in enumerate([flip(4, 5), flip(8, 9), flip(12, 13)], start=1):
    EV[f"f{i}"], EV[f"f{i}e"] = a, b
EV |= {
    "open": V0 - 1.75, "opene": V0 - 0.5,          # обложка откидывается, альбом съезжает в центр
    "close": E(16) + 2.3, "closee": E(16) + 3.5,   # альбом закрывается
    "slide": E(16) + 3.35, "slidee": E(16) + 4.15, # и съезжает обратно в центр
    "total": TOTAL,
}
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["slidee"] < TOTAL - 2.5, "финальный кадр с названием слишком короткий"


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"
    screen = [" ".join(w["text"] for w in l["words"]) for l in LINES]
    assert want == screen, f"слова timings.json расходятся с poem.md: {screen}"


def word(tok, at, dur, key=None):
    cls = f"w {key}" if key else "w"
    return f'<span class="{cls}" data-at="{at:.3f}" data-d="{dur:.3f}">{html.escape(tok)}</span>'


def stanza(n, lines, start, end):
    rows = []
    for i, l in enumerate(lines):
        ws = " ".join(word(w["text"], w["start"] + V0 - 0.04, min(max((w["end"] - w["start"]) * 0.9, 0.2), 0.6), KEYS.get(w["text"])) for w in l["words"])
        rows.append(f'<div class="line" style="top:{LINE_TOPS[i]}px">{ws}</div>')
    return (f'<div id="st{n}" class="clip txt" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="3" data-track-kind="captions">'
            f'<div class="sheet" id="sh{n}">' + "".join(rows) + "</div></div>")


def card(cid, start, end, t0):
    return (f'<div id="{cid}" class="clip txt" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="4" data-track-kind="graphics">'
            f'<div class="sheet cover" id="{cid}s"><h1 class="c1">{word(TITLE1, t0, 0.5)}</h1><h1 class="c2">{word(TITLE2, t0 + 0.35, 0.7)}</h1>'
            f'<p class="ca">{word(AUTHOR, t0 + 0.95, 0.9)}</p></div></div>')


def build_text():
    a = [card("card1", 0, EV["opene"], 0.08)]
    ins = [EV["L1"] - 0.3, EV["f1e"], EV["f2e"], EV["f3e"]]
    outs = [EV["f1e"], EV["f2e"], EV["f3e"], EV["closee"]]
    for k in range(4):
        a.append(stanza(k + 1, LINES[k * 4:k * 4 + 4], ins[k], outs[k]))
    mid = (EV["close"] + EV["closee"]) / 2
    a.append(card("card2", mid, TOTAL, -10))  # в финале название уже написано на обложке
    return "\n      ".join(a)


def main():
    check_text()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"V0": V0, "OUTRO": OUTRO, **EV}, indent=1), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copyfile(music, assets / "music.wav")
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV}, ensure_ascii=False))
              .replace("%%JS%%", js))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
