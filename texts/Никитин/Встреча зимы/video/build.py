"""«Встреча зимы» (Никитин), поп-арт комикс.
Собирает index.html из src/*.js, ../poem.md («Текст в ролике») и ../timings.json; пишет ../music/events.json
(время строк, слов и событий для музыки и шумов).

Запуск: python3 build.py              (после правки таймингов, текста или исходников)
        PROBE=cast python3 build.py   (страница-проба: герои во всех позах через весь ролик; PROBE_PAGE=0,1,2)
Пока нет ../timings.json, время строк оценивается по слогам (черновик для проб).
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 4.2      # где в ролике начинается голос (до него — обложка выпуска и титр)
OUTRO = 7.0   # финал после голоса: задняя обложка с названием (кадр для cover.png)
SRC = ("core.js", "ink.js", "chars.js", "scenes1.js", "scenes2.js", "scenes3.js", "layout.js", "text.js", "main.js")
PROBE = os.environ.get("PROBE", "")


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е").replace("́", ""))


def poem_lines():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст в ролике")[1].split("\n## ")[0]
    blocks = [b.strip() for b in body.strip().split("\n\n") if b.strip()]
    stanzas = [b for b in blocks if not b.startswith("В ролике")]
    out = []
    for si, b in enumerate(stanzas, 1):
        for l in b.splitlines():
            out.append({"stanza": si, "text": l.strip()})
    return out


PL = poem_lines()
assert len(PL) == 40, len(PL)


def estimate():
    """Черновые тайминги по слогам, пока нет голоса."""
    t, lines, prev = 0.3, [], 1
    for i, l in enumerate(PL, 1):
        if l["stanza"] != prev:
            t += 1.2
            prev = l["stanza"]
        words = [w for w in l["text"].split() if norm(w)]
        syl = [max(1, len(re.findall(r"[аеёиоуыэюя]", w.lower()))) for w in words]
        dur = 0.34 * sum(syl) + 0.25
        ws, wt = [], t
        for w, s in zip(words, syl):
            d = dur * s / sum(syl)
            ws.append({"text": w, "start": round(wt, 3), "end": round(wt + d, 3)})
            wt += d
        lines.append({"n": i, "stanza": l["stanza"], "text": l["text"], "start": round(t, 3), "end": round(t + dur, 3), "words": ws})
        t += dur + 0.45
    return {"voiceDuration": round(t + 0.4, 3), "lines": lines, "estimated": True}


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


WORDS = {
    "dozhd": (1, "дождь"), "stekla": (2, "стёкла"), "stuchal": (2, "стучал"), "tuman": (3, "туман"), "oblakami": (4, "Облаками"),
    "veyal": (5, "Веял"), "holod": (5, "холод"), "ugryum": (6, "угрюмых"), "bog": (7, "Бог"), "plakal": (8, "Плакал"),
    "polden": (9, "полдень"), "perestal": (9, "перестал"), "pushok": (10, "пушок"), "gryaz": (11, "грязь"), "snezhok": (12, "снежок"),
    "noch": (13, "Ночь"), "rassvelo": (13, "Рассвело"), "oblachka": (14, "облачка"), "vozduh": (15, "Воздух"), "chist": (15, "чист"),
    "zamerzla": (16, "замёрзла"), "reka": (16, "река"),
    "dvorah": (17, "дворах"), "polotnom": (18, "полотном"), "blestit": (19, "блестит"), "raznocv": (20, "Разноцветным"),
    "prostor": (21, "простор"), "polei": (22, "полей"), "veselo": (23, "весело"), "kudrei": (24, "кудрей"),
    "rad": (25, "рад"), "berez": (26, "берёз"), "almazy": (27, "алмазы"), "goryat": (27, "горят"), "slez": (28, "слёз"),
    "zdrav": (29, "Здравствуй"), "zima": (29, "гостья-зима"), "prosim": (30, "Просим"), "pesni": (31, "Песни"), "severa": (31, "севера"),
    "lesam": (32, "лесам"), "stepyam": (32, "степям"),
    "razdolie": (33, "раздолье"), "gulyai": (34, "гуляй"), "mosty": (35, "мосты"), "rekam": (35, "рекам"),
    "kovry": (36, "ковры"), "rasstil": (36, "расстилай"),
    "zhguchiy": (37, "Жгучий"), "pahnul": (37, "пахнул"), "vse": (38, "Всё"), "kolen": (39, "колени"), "snegu": (39, "снегу"),
    "govorit": (40, "Говорит"), "nichego": (40, "«Ничего!»…"),
}


def build_ev():
    ev = {"V0": V0, "total": TOTAL}
    ev |= {f"L{i}": S(i) for i in range(1, NL + 1)}
    ev |= {f"E{i}": E(i) for i in range(1, NL + 1)}
    for k, v in WORDS.items():
        ev[k] = word_at(*v)
    ev["fin"] = round(E(NL) + 1.6, 3)
    assert ev["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"
    return {k: round(v, 3) for k, v in ev.items()}


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
    (POEM / "music" / "events.json").write_text(json.dumps({"OUTRO": OUTRO, **ev}, indent=1, ensure_ascii=False), encoding="utf-8")
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
    print(f"index.html: {TOTAL:.2f} s, голос: {'есть' if has_voice else 'ОЦЕНКА'}, музыка: {'есть' if has_music else 'нет'}{', ПРОБА ' + PROBE if PROBE else ''}")


if __name__ == "__main__":
    main()
