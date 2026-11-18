"""«Осень» (Майков), пиксельный платформер. Собирает index.html из src/*.js, ../poem.md и ../timings.json;
пишет ../music/events.json (время строк, слов и игровых событий для музыки и шумов).

Запуск: python3 build.py   (после правки таймингов, текста или исходников)
Мир рисуется в буфер 320×150 и растягивается ×6 без сглаживания; строки и HUD — поверх в полном разрешении.
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 3.6      # где в ролике начинается голос (до него — титр с действием)
OUTRO = 6.5   # финал после голоса: название крупно (обложка)
SRC = ("font.js", "gfx.js", "hero.js", "poses.js", "world.js", "hud.js", "scenes.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е"))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md, с временем начала и конца; тире берёт время следующего слова."""
    toks = l["text"].split()
    ws = [w for w in l["words"] if norm(w["text"])]
    out, j = [], 0
    for tok in toks:
        if not norm(tok):
            out.append([tok, None, None])
            continue
        assert j < len(ws) and norm(ws[j]["text"]) == norm(tok), f"строка {l['n']}: «{tok}» ≠ {ws[j]['text'] if j < len(ws) else '—'}"
        out.append([tok, ws[j]["start"], ws[j]["end"]])
        j += 1
    assert j == len(ws), f"строка {l['n']}: лишние слова в timings.json"
    for i in range(len(out) - 1, -1, -1):
        if out[i][1] is None:
            src = out[i + 1] if i + 1 < len(out) else out[i - 1]
            out[i][1], out[i][2] = src[1], src[2]
    return out


def word_at(n, word, end=False):
    for tok, st, en in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            return round((en if end else st) + V0, 3)
    raise KeyError(f"{n}: {word}")


WORDS = {
    "kroet": (1, "Кроет"), "zemlyu": (2, "землю"), "topchu": (3, "топчу"), "nogoy1": (3, "ногой"), "veshn": (4, "Вешнюю"), "krasu": (4, "красу"),
    "shcheki": (5, "щёки"), "goryat": (5, "горят"), "bezhat": (6, "бежать"), "suchya": (7, "сучья"), "treshch": (7, "трещат"), "nogoy2": (8, "ногой"), "zagreb": (8, "загребать"),
    "net": (9, "Нет"), "uteh": (9, "утех"), "tainu": (10, "тайну"), "sovlek": (10, "совлёк"), "sorvan": (11, "Сорван"), "oreh": (11, "орех"),
    "svyanul": (12, "Свянул"), "cvetok": (12, "цветок"),
    "moh": (13, "Мох"), "vzryt": (13, "взрыт"), "gruzd": (14, "груздей"), "pnya": (15, "пня"), "visit": (15, "висит"), "purpur": (16, "Пурпур"), "kistey": (16, "кистей"),
    "dolgo": (17, "Долго"), "moroz": (18, "мороз"), "skvoz": (18, "сквозь"), "holodno": (19, "Холодно"), "glyadit": (19, "глядит"), "yasn": (20, "Ясность"), "nebes": (20, "небес"),
    "shumyat": (21, "шумят"), "smert": (22, "Смерть"), "zhatvu": (22, "жатву"), "tolko": (23, "Только"), "vesel": (23, "весел"), "bezumn": (24, "безумный"), "poyu": (24, "пою"),
    "znayu": (25, "Знаю"), "mhov": (25, "мхов"), "podsn": (26, "подснежник"), "rval": (26, "рвал"), "vplot": (27, "Вплоть"), "osen": (27, "осенних"), "cvetov": (27, "цветов"),
    "kazhd": (28, "Каждый"), "vstrech": (28, "встречал"),
    "dusha": (29, "душа"), "chto2": (30, "Что"), "oni": (30, "они"), "vspomnyu": (31, "Вспомню"), "dysha": (31, "дыша"), "zimnie": (32, "зимние"), "dni": (32, "дни"),
    "shumyat2": (33, "шумят"), "smert2": (34, "Смерть"), "tolko2": (35, "Только"), "vesel2": (35, "весел"), "bezumn2": (36, "безумный"), "poyu2": (36, "пою"),
}


def build_ev():
    ev = {"V0": V0, "total": TOTAL}
    ev |= {f"L{i}": S(i) for i in range(1, NL + 1)}
    ev |= {f"E{i}": E(i) for i in range(1, NL + 1)}
    ev |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
    ev["fin"] = round(E(NL) + 1.2, 3)
    assert ev["fin"] < TOTAL - 4.5, "финальный кадр с названием слишком короткий"
    return {k: round(v, 3) for k, v in ev.items()}


def check_text():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1].split("\n## ")[0]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, "слова на экране расходятся с poem.md"
    # каждый символ строки есть в пиксельном шрифте
    font = (HERE / "src" / "font.js").read_text(encoding="utf-8")
    glyphs = set(re.findall(r'^\s+"?(.)"?: "', font, re.M))
    miss = sorted({ch for l in want for ch in l if ch != " " and ch not in glyphs})
    assert not miss, f"нет глифов: {miss}"


def main():
    check_text()
    ev = build_ev()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    (POEM / "music" / "events.json").write_text(json.dumps({"OUTRO": OUTRO, **ev}, indent=1, ensure_ascii=False), encoding="utf-8")
    music = POEM / "music" / "music.wav"
    has_music = music.exists()
    if has_music:
        shutil.copyfile(music, assets / "music.wav")
    lines = [{"n": l["n"], "text": l["text"], "stanza": l["stanza"], "s": S(l["n"]), "e": E(l["n"]),
              "words": [{"w": t, "s": round(s + V0, 3), "e": round(e + V0, 3)} for t, s, e in tokens(l)]} for l in LINES]
    cfg = {"v0": V0, "total": TOTAL, "ev": ev, "lines": lines}
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    music_tag = (f'<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL:.3f}" '
                 f'data-track-index="11" data-volume="1"></audio>') if has_music else ""
    html = f"""<!doctype html>
<!-- Собрано build.py из src/*.js — правьте исходники, не этот файл. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #000; }}
      #scene {{ position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0:.3f}" data-duration="{T['voiceDuration']:.3f}" data-track-index="10" data-volume="1"></audio>
      {music_tag}
    </div>
    <script>const CFG = {json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))};</script>
    <script>
{js}
      const tl = gsap.timeline({{ paused: true }});
      tl.set({{}}, {{}}, CFG.total);
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
    (HERE / "index.html").write_text(html, encoding="utf-8")
    (HERE / "probe").mkdir(exist_ok=True)
    (HERE / "probe" / "cfg.js").write_text("const CFG = " + json.dumps(cfg, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, музыка: {'есть' if has_music else 'нет'}")


if __name__ == "__main__":
    main()
