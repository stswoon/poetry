"""v2 (8-бит RPG). Собирает index.html из src/*.js, ../poem.md и ../timings.json; пишет ../music/events.json.

Запуск: python3 build.py   (после правки таймингов, текста или исходников)
Картинка рисуется на canvas 384×216 и увеличивается ×5 без сглаживания.
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 4.5      # где в ролике начинается голос
OUTRO = 7.5   # финал после голоса
SRC = ("font.js", "gfx.js", "sprites.js", "scenes1.js", "scenes2.js", "scenes3.js", "main.js")

T = json.loads(Path(os.environ.get("TIMINGS", POEM / "timings.json")).read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)
QUEST = 42  # строка в окне «НОВЫЙ КВЕСТ»
OLEG = set(range(13, 19)) | set(range(49, 59)) | set(range(67, 71)) | set(range(74, 78)) | set(range(86, 93))
KUD = set(range(19, 43))


def role(n):
    return "oleg" if n in OLEG else "kud" if n in KUD else "chron"


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


def word_at(n, word):
    for tok, st, _ in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            return round(st + V0, 3)
    raise KeyError(f"{n}: {word}")


EV = {"V0": V0} | {f"L{i}": S(i) for i in range(1, NL + 1)} | {f"E{i}": E(i) for i in range(1, NL + 1)}
WORDS = {
    "w_hoz": (2, "хозарам"), "w_sely": (3, "сёлы"), "w_mech": (4, "мечам"), "w_pozh": (4, "пожарам"), "w_bron": (5, "броне"), "w_kon1": (6, "коне"),
    "w_kud1": (8, "кудесник"), "w_perun": (9, "Перуну"), "w_vest": (10, "вестник"), "w_podieh": (12, "подъехал"),
    "w_vragov": (15, "соседей-врагов"), "w_zeml": (16, "землёю"), "w_konya3": (18, "коня"),
    "w_vlad": (19, "владык"), "w_mgle": (23, "мгле"), "w_chele": (24, "челе"),
    "w_slava": (26, "слава"), "w_imya": (27, "имя"), "w_shchit": (28, "щит"), "w_volny": (29, "волны"), "w_zavid": (30, "Завидует"),
    "w_val": (31, "вал"), "w_prashch": (33, "пращ"), "w_strela": (33, "стрела"), "w_kinzhal": (33, "кинжал"), "w_khran": (36, "хранитель"),
    "w_strel7": (39, "стрелами"), "w_mchit": (40, "мчится"), "w_holod": (41, "холод"), "w_secha": (41, "сеча"),
    "w_usm": (43, "усмехнулся"), "w_odnako": (43, "однако"), "w_slez": (46, "слезает"), "w_glad": (48, "гладит"),
    "w_strem": (52, "стремя"), "w_pomni": (53, "помни"), "w_otroki": (54, "отроки-други"),
    "w_popon": (55, "попоной"), "w_lug": (56, "луг"), "w_kup": (57, "Купайте"), "w_korm": (57, "кормите"), "w_voda": (58, "Водой"),
    "w_otosh": (59, "отошли"), "w_drug": (60, "другого"),
    "w_zvon": (62, "звоне"), "w_kudri": (63, "кудри"), "w_kurg": (64, "кургана"), "w_pomin": (65, "поминают"),
    "w_burn": (70, "бурный"), "w_holme": (71, "холме"), "w_pochil": (72, "почил"),
    "w_ponik": (73, "поник"), "w_lzhiv": (75, "лживый"), "w_prezr": (76, "Презреть"), "w_kosti13": (78, "кости"),
    "w_edet": (79, "едет"), "w_kosti": (82, "кости"), "w_dozhd": (83, "дожди"), "w_pyl": (83, "пыль"), "w_veter": (84, "ветер"),
    "w_nastup": (85, "наступил"), "w_trizne": (88, "тризне"), "w_sekir": (89, "секирой"),
    "w_kost": (92, "кость"), "w_zmiya": (93, "змия"), "w_ship": (94, "Шипя"), "w_obvil": (95, "обвилась"), "w_vskr": (96, "вскрикнул"),
    "w_kovshi": (97, "Ковши"), "w_olga": (99, "Ольга"), "w_druzh": (100, "Дружина"), "w_boytsy": (101, "Бойцы"),
}
EV |= {k: word_at(n, w) for k, (n, w) in WORDS.items()}
EV |= {"start": 3.6, "fin": E(NL) + 2.2, "total": TOTAL}
# игровые события (для музыки и шумов)
EV |= {"quest": EV["L42"] - 0.35, "leave": EV["w_otosh"] + 0.3, "years": EV["E60"] + 0.15, "boss": EV["w_zmiya"] - 0.1,
       "gameover": EV["E96"] + 0.02, "gameoverV": EV["w_vskr"] + 0.9}  # джингл — после «князь», надпись — раньше
EV = {k: round(v, 3) for k, v in EV.items()}
assert EV["fin"] < TOTAL - 4.2, "финальный кадр с названием слишком короткий"


def check_text():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, "слова на экране расходятся с poem.md"


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
    lines = [{"n": l["n"], "text": l["text"], "stanza": l["stanza"], "role": role(l["n"]), "s": S(l["n"]), "e": E(l["n"]),
              "words": [{"w": t, "s": round(s + V0, 3), "e": round(e + V0, 3)} for t, s, e in tokens(l)]} for l in LINES]
    cfg = {"v0": V0, "total": TOTAL, "ev": EV, "lines": lines, "quest": QUEST}
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
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
      #scene {{ position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; image-rendering: pixelated; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1920" data-height="1080">
      <canvas id="scene" width="384" height="216"></canvas>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0:.3f}" data-duration="{T['voiceDuration']:.3f}" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL:.3f}" data-track-index="11" data-volume="1"></audio>
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
    print(f"index.html: {TOTAL:.2f} s")


if __name__ == "__main__":
    main()
