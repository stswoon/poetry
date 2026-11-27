"""«Зима» (Суриков), «Осада избы»: настольная игра из расписных деревянных фишек.
Собирает index.html из src/*.js, ../poem.md (раздел «## Текст») и ../timings.json;
пишет ../music/events.json (время строк, слов и событий для музыки и шумов).

Запуск: python3 build.py                       (после правки таймингов, текста или исходников)
        PROBE=cast PROBE_PAGE=0 python3 build.py   (проба: фишки во всех позах через весь ролик)
Пока нет ../timings.json, время строк оценивается по слогам (черновик для проб).
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 4.0      # где начинается голос (до него — коробка, поле и титр)
OUTRO = 7.0   # финал после голоса: поле в сумерках и название (кадр для cover.png)
SRC = ("core.js", "wood.js", "pieces.js", "world.js", "hud.js", "text.js", "probe.js", "main.js")
PROBE = os.environ.get("PROBE", "")


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е").replace("́", ""))


def poem_lines():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("\n## Текст\n")[1].split("\n## ")[0]
    stanzas = [b.strip() for b in body.strip().split("\n\n") if b.strip() and not re.fullmatch(r"\d{4}", b.strip())]
    out = []
    for si, b in enumerate(stanzas, 1):
        for l in b.splitlines():
            out.append({"stanza": si, "text": l.strip()})
    return out


PL = poem_lines()
assert len(PL) == 32, len(PL)


def estimate():
    """Черновые тайминги по слогам, пока нет голоса (~1,5 с на строку)."""
    t, lines, prev = 0.1, [], 1
    for i, l in enumerate(PL, 1):
        if l["stanza"] != prev:
            t += 0.9
            prev = l["stanza"]
        words = [w for w in l["text"].split() if norm(w)]
        syl = [max(1, len(re.findall(r"[аеёиоуыэюя]", w.lower()))) for w in words]
        dur = 0.19 * sum(syl) + 0.15
        ws, wt = [], t
        for w, s in zip(words, syl):
            d = dur * s / sum(syl)
            ws.append({"text": w, "start": round(wt, 3), "end": round(wt + d, 3)})
            wt += d
        lines.append({"n": i, "stanza": l["stanza"], "text": l["text"], "start": round(t, 3), "end": round(t + dur, 3), "words": ws})
        t += dur + 0.25
    return {"voiceDuration": round(t + 0.3, 3), "lines": lines, "estimated": True}


TF = POEM / "timings.json"
T = json.loads(TF.read_text(encoding="utf-8")) if TF.exists() else estimate()
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в тексте ролика с временем; знак без букв берёт время соседнего слова."""
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
            src = out[i - 1] if i > 0 else out[i + 1]
            out[i][1], out[i][2] = src[1], src[2]
    return out


def word_at(n, word, occ=1, end=False):
    k = 0
    for tok, st, en in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            k += 1
            if k == occ:
                return round((en if end else st) + V0, 3)
    raise KeyError(f"{n}: {word}")


# ключевые слова: на них действие в кадре
WORDS = {
    "sneg": (1, "снег,"), "kruzhitsya": (2, "кружится"), "zemlyu": (3, "землю"), "padaet": (4, "Падает,"), "lozhitsya": (4, "ложится."),
    "utro": (5, "утро"), "pole": (6, "Поле"), "zabelelo": (6, "забелело,"), "pelenoyu": (7, "пеленою"), "odelo": (8, "одело."),
    "les": (9, "лес"), "shapkoy": (9, "шапкой"), "prinakrylsya": (10, "Принакрылся"), "zasnul": (11, "заснул"), "neprobudno": (12, "непробудно…"),
    "dni": (13, "дни"), "korotki": (13, "коротки,"), "solnce": (14, "Солнце"), "malo": (14, "мало,"),
    "prishli": (15, "пришли"), "morozcy": (15, "морозцы"), "zima": (16, "зима"), "nastala": (16, "настала."),
    "krestyanin": (17, "Труженик-крестьянин"), "vytashil": (18, "Вытащил"), "sanishki": (18, "санишки,"),
    "gory": (19, "горы"), "stroyat": (20, "Строят"), "rebyatishki": (20, "ребятишки."),
    "zhdal": (22, "Ждал"), "stuzhi": (22, "стужи,"), "izbu": (23, "избу"), "solomoy": (23, "соломой"), "ukryl": (24, "укрыл"), "snaruzhi": (24, "снаружи."),
    "veter": (25, "ветер"), "pronik": (26, "проник"), "shcheli": (26, "щели,"), "naduli": (27, "надули"), "snega": (27, "снега"),
    "vyugi": (28, "Вьюги"), "meteli": (28, "метели."),
    "pokoen": (29, "покоен"), "krugom": (30, "кругом"), "ukryto": (30, "укрыто,"), "strashen": (31, "страшен"),
    "zloy": (32, "Злой"), "moroz": (32, "мороз,"), "serdityy": (32, "сердитый."),
}


def build_ev():
    ev = {"V0": V0, "total": TOTAL}
    ev |= {f"L{i}": S(i) for i in range(1, NL + 1)}
    ev |= {f"E{i}": E(i) for i in range(1, NL + 1)}
    for k, v in WORDS.items():
        ev[k] = word_at(*v)
    ev["fin"] = round(E(NL) + 1.6, 3)
    assert ev["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"
    # производные события партии (их читают world.js и музыка)
    ev |= {
        "setup": 0.15, "titleDrop": 0.9, "authorIn": 1.5, "startIn": 2.2, "startPress": 3.05,
        "flakeLand0": ev["lozhitsya"] - 0.1, "sunRise": ev["utro"],
        "flip0": ev["pole"] - 0.25, "flip1": ev["odelo"] + 0.45,
        "hatLand": ev["prinakrylsya"] + 0.05, "sleep": ev["zasnul"], "sunset": ev["malo"] + 0.25,
        "bossLand": ev["morozcy"] + 0.12, "winter": ev["nastala"],
        "yourTurn": ev["L17"] - 0.15, "peasantOut": ev["krestyanin"], "sledOut": ev["vytashil"],
        "kidsOut": ev["vytashil"] + 0.35,
        "hillA": ev["gory"], "hillB": ev["stroyat"],
        "straw0": ev["izbu"], "straw1": ev["solomoy"], "straw2": ev["ukryl"], "straw3": ev["snaruzhi"],
        "attack": ev["L25"] - 0.25, "hit1": ev["veter"] + 0.55, "seal": ev["shcheli"] + 0.1,
        "ball1": ev["snega"] + 0.25, "ball2": ev["snega"] + 0.55,
        "hit2": ev["vyugi"] + 0.45, "hit3": ev["meteli"] + 0.35,
        "calm": ev["pokoen"], "stomp1": ev["strashen"], "stomp2": ev["strashen"] + 0.45, "stomp3": ev["zloy"],
        "leave": ev["serdityy"] + 0.25, "win": ev["E32"] + 0.4,
    }
    return {k: round(v, 3) for k, v in ev.items()}


def sfx_list(ev):
    """Шумы с причиной в кадре: время и вид (их синтезирует музыка)."""
    S = [(ev["setup"] + 0.12 * i, "clack") for i in range(6)]
    S += [(ev["titleDrop"] + 0.25, "thump"), (ev["startPress"], "click")]
    S += [(ev["flakeLand0"], "tick")] + [(ev["flakeLand0"] + 0.35 * i, "tick") for i in range(1, 5)]
    S += [(ev["flip0"] + (ev["flip1"] - ev["flip0"]) * i / 10, "flip") for i in range(11)]
    S += [(ev["hatLand"], "thump"), (ev["sunset"], "tick"), (ev["bossLand"], "boom")]
    S += [(ev["bossLand"] + 0.35 + 0.25 * i, "clack") for i in range(3)]
    S += [(ev["winter"], "slam"), (ev["yourTurn"], "click"), (ev["peasantOut"] + 0.25, "clack"), (ev["sledOut"], "slide")]
    S += [(ev["hillA"] + 0.45 * i, "pop") for i in range(3)] + [(ev["hillB"] + 0.45 * i, "pop") for i in range(3)]
    S += [(ev[f"straw{i}"], "straw") for i in range(4)]
    S += [(ev["attack"], "whoosh"), (ev["hit1"] - 0.45, "whoosh"), (ev["hit1"], "hit"), (ev["seal"], "hit"),
          (ev["ball1"], "hit"), (ev["ball2"], "hit"), (ev["hit2"] - 0.4, "whoosh"), (ev["hit2"], "hit"), (ev["hit3"], "hit")]
    S += [(ev["stomp1"], "boom"), (ev["stomp2"], "boom"), (ev["stomp3"], "boom"), (ev["leave"], "whoosh"), (ev["win"], "fanfare")]
    return [{"t": round(t, 3), "kind": k} for t, k in sorted(S)]


def check_text():
    want = [l["text"] for l in PL]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, "слова на экране расходятся с poem.md"


def main():
    check_text()
    ev = build_ev()
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    has_voice = (POEM / "voice.mp3").exists() and not T.get("estimated")
    if has_voice:
        shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    (POEM / "music").mkdir(exist_ok=True)
    music = POEM / "music" / "music.wav"
    has_music = music.exists() and has_voice
    if has_music:
        shutil.copyfile(music, assets / "music.wav")
    lines = [{"n": l["n"], "text": l["text"], "stanza": l["stanza"], "s": S(l["n"]), "e": E(l["n"]),
              "words": [{"w": t, "s": round(s + V0, 3), "e": round(e + V0, 3)} for t, s, e in tokens(l)]} for l in LINES]
    cfg = {"v0": V0, "total": TOTAL, "ev": ev, "lines": lines, "probe": PROBE, "probePage": int(os.environ.get("PROBE_PAGE", "0"))}
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    ids = re.findall(r'id="([^"]+)"', tpl)
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    music_tag = (f'<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL:.3f}" '
                 f'data-track-index="11" data-volume="1"></audio>') if has_music and not PROBE else ""
    voice_tag = (f'<audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0:.3f}" data-duration="{T["voiceDuration"]:.3f}" '
                 f'data-track-index="10" data-volume="1"></audio>') if has_voice and not PROBE else ""
    html = (tpl.replace("{{TOTAL}}", f"{TOTAL:.3f}").replace("{{VOICE}}", voice_tag).replace("{{MUSIC}}", music_tag)
            .replace("{{ALLTEXT}}", " ".join(l["text"] for l in LINES)).replace("{{CFG}}", json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))).replace("{{JS}}", js))
    (HERE / "index.html").write_text(html, encoding="utf-8")
    # события для музыки и шумов: SFX считает JS-мир (world.js) — здесь только время слов и строк
    (POEM / "music" / "events.json").write_text(json.dumps({"OUTRO": OUTRO, **ev, "sfx": sfx_list(ev)}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, голос: {'есть' if has_voice else 'ОЦЕНКА'}, музыка: {'есть' if has_music else 'нет'}{', ПРОБА ' + PROBE if PROBE else ''}")


if __name__ == "__main__":
    main()
