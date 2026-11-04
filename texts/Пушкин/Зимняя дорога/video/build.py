"""Собирает index.html ролика из template.tpl, src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/, пишет ../music/events.json для кода музыки.
"""

import json
import os
import shutil
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 6.0      # где в ролике начинается голос
OUTRO = 8.0   # финал после голоса

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)

# Слова, которые процарапаны ярче (с ореолом)
KEYS = {(2, "луна,"), (6, "Тройка"), (7, "Колокольчик"), (10, "ямщика:"), (12, "тоска…"), (15, "вёрсты"), (15, "полосаты"),
        (17, "Нина,"), (19, "камина,"), (21, "стрелка"), (24, "Полночь"), (25, "Нина:"), (28, "лунный"), (28, "лик.")}


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    for w in LINES[n - 1]["words"]:
        if w["text"].startswith(word):
            return round(w["start"] + V0, 3)
    raise KeyError((n, word))


EV = {f"L{i}": S(i) for i in range(1, 29)} | {f"E{i}": E(i) for i in range(1, 29)}
for k in range(1, 8):
    EV[f"st{k}"] = S(4 * k - 3)
    EV[f"en{k}"] = E(4 * k)
    EV[f"tx{k}"] = round(E(4 * k) + (0.2 if k < 7 else 0.5), 3)
# Смахивания: титр → 1 строфа, затем в паузах между строфами
EV["sw0a"], EV["sw0b"] = V0 - 1.25, V0 - 0.25
for k in range(1, 7):
    a, b = E(4 * k) + 0.3, S(4 * k + 1) - 0.12
    if b - a < 0.8:
        a = b - 0.8
    EV[f"sw{k}a"], EV[f"sw{k}b"] = round(a, 3), round(b, 3)
WORDS = {
    "w_poby": (2, "Пробирается"), "w_pol": (3, "поляны"), "w_lyet": (4, "Льёт"),
    "w_dor": (5, "дороге"), "w_troi": (6, "Тройка"), "w_kol": (7, "Колокольчик"), "w_grem": (8, "гремит"),
    "w_pes": (10, "песнях"), "w_raz": (11, "разгулье"), "w_tos": (12, "тоска"),
    "w_ogn": (13, "огня"), "w_hat": (13, "хаты"), "w_sneg": (14, "снег"), "w_vyo": (15, "вёрсты"),
    "w_zav": (17, "Завтра"), "w_nin": (17, "Нина"), "w_kam": (19, "камина"), "w_zag": (20, "Загляжусь"),
    "w_str": (21, "стрелка"), "w_kru": (22, "круг"), "w_dok": (23, "докучных"), "w_pol2": (24, "Полночь"),
    "w_gru": (25, "Грустно"), "w_dre": (26, "Дремля"), "w_kol2": (27, "Колокольчик"), "w_otu": (28, "Отуманен"),
}
EV |= {k: word_at(*v) for k, v in WORDS.items()}
EV["total"] = TOTAL


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {want} / {got}"
    screen = [" ".join(w["text"] for w in l["words"]) for l in LINES]
    assert want == screen, f"слова timings.json расходятся с poem.md: {screen}"
    for l in LINES:
        for w in l["words"]:
            assert l["start"] - 0.01 <= w["start"] <= w["end"] <= l["end"] + 0.01, (l["n"], w)
    for a, b in zip(LINES, LINES[1:]):
        assert a["end"] <= b["start"], (a["n"], b["n"])


def cfg_lines():
    out = []
    for l in LINES:
        ws = [{"text": w["text"], "at": round(w["start"] + V0 - 0.06, 3), "dur": round(w["end"] - w["start"], 3),
               "key": (l["n"], w["text"]) in KEYS} for w in l["words"]]
        out.append({"n": l["n"], "words": ws})
    return out


def main():
    check_text()
    for k, v in KEYS:
        assert any(w["text"] == v for w in LINES[k - 1]["words"]), (k, v)
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"V0": V0, "OUTRO": OUTRO, **EV}, indent=1), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copyfile(music, assets / "music.wav")
    elif not (assets / "music.wav").exists():
        # заглушка тишины, пока музыка не готова
        with wave.open(str(assets / "music.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b"\0\0" * int(8000 * TOTAL))
    # v2 — Палех (src/), v1 — песочная анимация (src/v1-sand/): STYLE=sand python3 build.py
    src = HERE / "src" / ("v1-sand" if os.environ.get("STYLE") == "sand" else "")
    js = "\n".join((src / f).read_text(encoding="utf-8") for f in ("core.js", "figures.js", "scenes.js"))
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%CFG%%", json.dumps({"total": TOTAL, "ev": EV, "lines": cfg_lines()}, ensure_ascii=False))
              .replace("%%JS%%", js))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
