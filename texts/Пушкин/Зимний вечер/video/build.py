"""Собирает index.html ролика из template.tpl, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов, текста или шаблона)
Копирует голос и музыку в assets/ (там они не коммитятся — см. .gitignore).
"""

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 6.0      # где в ролике начинается голос
OUTRO = 7.0   # финал после голоса

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def word_at(n, word):
    """Время слова в строке n: доля символов от начала строки."""
    text = LINES[n - 1]["text"]
    i = text.find(word)
    return round(S(n) + (E(n) - S(n)) * (i + len(word) * 0.4) / len(text), 3)


# --- Четверостишия ---
GROUPS = []
for g in range(8):
    first, last = 4 * g + 1, 4 * g + 4
    nxt = S(last + 1) if last < 32 else None
    exit_t = min(E(last) + 0.15, nxt - 0.55) if nxt else E(last) + 0.6
    GROUPS.append({"id": f"g{g + 1}", "first": first, "last": last, "start": round(S(first) - 0.4, 3),
                   "exit": round(exit_t, 3), "warm": g in (4, 5, 7)})

FINAL = round(E(32) + 1.1, 3)
TITLE = {"start": 0.9, "in": 1.3, "author": 2.4, "exit": 5.0}

# --- Виньетки (рисунки одной линией, вьюбокс 500×520) ---
SWIRL = [
    "M 70 300 C 60 150, 330 110, 370 250 C 395 350, 260 405, 205 340 C 165 290, 225 225, 275 268",
    "M 300 470 C 210 480, 140 430, 160 370 C 175 330, 230 335, 232 370",
    "M 20 420 C 120 380, 200 465, 300 420 S 450 375, 490 405",
    "M 60 170 C 150 130, 250 195, 335 155 S 455 110, 490 140",
    "M 30 90 C 90 70, 140 100, 200 82",
    "M 340 60 C 390 40, 430 75, 480 55",
]
HEART = [
    "M 250 430 C 120 340, 75 240, 145 175 C 195 132, 240 160, 250 205 C 260 160, 305 132, 355 175 C 425 240, 380 340, 250 430 Z",
    "M 250 120 L 250 70", "M 160 125 L 132 88", "M 340 125 L 368 88", "M 95 185 L 55 165", "M 405 185 L 445 165",
]
VIGNETTES = {
    "v1": {"paths": SWIRL, "warm": False},
    "v2": {"paths": [  # путник с посохом
        "M 10 465 C 120 445, 260 475, 490 452",
        "M 252 168 A 24 24 0 1 1 204 168 A 24 24 0 1 1 252 168",
        "M 212 190 C 188 235, 180 310, 192 370 L 172 445 C 210 436, 252 450, 286 443 L 262 372 C 268 300, 262 232, 246 190",
        "M 244 232 C 268 246, 288 250, 306 244",
        "M 306 210 L 336 460",
        "M 198 400 L 180 452", "M 246 404 L 268 455",
        "M 40 130 C 90 108, 135 140, 180 118", "M 330 120 C 380 100, 420 130, 470 108",
    ], "warm": False},
    "v3": {"paths": [  # лачужка
        "M 85 235 L 250 108 L 415 235",
        "M 75 240 C 150 218, 340 218, 425 240",
        "M 120 236 L 120 420 L 380 420 L 380 236",
        "M 120 285 L 210 285", "M 290 285 L 380 285", "M 120 375 L 210 375", "M 290 375 L 380 375",
        "M 212 292 L 288 292 L 288 356 L 212 356 Z", "M 250 292 L 250 356 M 212 324 L 288 324",
        "M 318 170 L 318 118 L 350 118 L 350 194",
        "M 30 432 C 140 402, 300 445, 475 420",
    ], "warm": False},
    "v4": {"paths": [  # веретено с нитью
        "M 250 70 L 250 470",
        "M 250 150 C 302 200, 302 330, 250 392 C 198 330, 198 200, 250 150",
        "M 228 212 L 272 232", "M 222 262 L 278 282", "M 225 312 L 275 332",
        "M 203 425 A 47 12 0 1 0 297 425 A 47 12 0 1 0 203 425",
        "M 250 70 C 200 45, 165 85, 125 55 S 60 22, 25 45",
    ], "warm": False},
    "v5": {"paths": HEART, "warm": True},
    "v6a": {"paths": [  # синица над морем
        "M 20 400 C 70 370, 120 430, 170 400 S 270 370, 320 400 S 420 430, 480 400",
        "M 45 455 C 105 430, 165 475, 225 455 S 345 430, 405 455",
        "M 168 222 C 200 180, 282 180, 310 214 C 290 252, 222 262, 168 222 Z",
        "M 340 200 A 22 22 0 1 1 296 200 A 22 22 0 1 1 340 200",
        "M 340 196 L 358 201 L 340 207",
        "M 222 206 C 232 140, 272 108, 304 118 C 284 158, 268 188, 252 210",
        "M 170 222 L 116 204 L 128 238 Z",
        "M 302 192 C 312 186, 326 186, 336 192",
    ], "warm": True},
    "v6b": {"paths": [  # девица с коромыслом на заре
        "M 20 352 L 480 352",
        "M 330 352 A 82 82 0 0 1 494 352",
        "M 412 250 L 412 222", "M 352 274 L 334 254", "M 472 274 L 488 254",
        "M 240 150 A 20 20 0 1 1 200 150 A 20 20 0 1 1 240 150",
        "M 208 160 C 196 190, 202 212, 190 236",
        "M 220 172 L 168 336 L 272 336 Z",
        "M 104 192 C 160 164, 280 164, 336 192",
        "M 110 194 L 110 240", "M 330 194 L 330 240",
        "M 90 240 L 130 240 L 123 286 L 97 286 Z", "M 310 240 L 350 240 L 343 286 L 317 286 Z",
        "M 204 336 L 198 352", "M 236 336 L 242 352",
    ], "warm": True},
    "v7": {"paths": SWIRL, "warm": False},
    "v8": {"paths": HEART, "warm": True},
}
VIG_TIMES = {
    "v1": (GROUPS[0]["start"] + 0.3, GROUPS[0]["exit"]),
    "v2": (S(7) - 0.3, GROUPS[1]["exit"]),
    "v3": (GROUPS[2]["start"] + 0.3, GROUPS[2]["exit"]),
    "v4": (S(15) - 0.3, GROUPS[3]["exit"]),
    "v5": (S(20) - 0.4, GROUPS[4]["exit"]),
    "v6a": (S(21), S(23) - 0.2),
    "v6b": (S(23), GROUPS[5]["exit"]),
    "v7": (GROUPS[6]["start"] + 0.3, GROUPS[6]["exit"]),
    "v8": (S(32) - 0.4, GROUPS[7]["exit"]),
}


def chars_html(text, cls="ch"):
    out = []
    for w in text.split(" "):
        out.append('<span class="w">' + "".join(f'<span class="{cls}">{html.escape(c)}</span>' for c in w) + "</span>")
    return " ".join(out)


def clip_attrs(start, end, track):
    return f'class="clip" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="{track}"'


def build_text():
    parts = []
    t_end = TITLE["exit"] + 0.6
    parts.append(f'<div id="title-card" {clip_attrs(TITLE["start"], t_end, 2)}><div class="card-in" id="title-in">'
                 f'<h1 class="card-title">{chars_html("Зимний вечер")}</h1>'
                 f'<p class="card-author">{chars_html("Александр Сергеевич Пушкин")}</p></div></div>')
    for g in GROUPS:
        end = g["exit"] + 0.5
        lines = "".join(f'<div class="line" id="l{n}">{chars_html(LINES[n - 1]["text"])}</div>'
                        for n in range(g["first"], g["last"] + 1))
        parts.append(f'<div id="{g["id"]}" {clip_attrs(g["start"], end, 3)}>'
                     f'<div class="quatrain {"warm" if g["warm"] else "cold"}"><div class="qin" id="{g["id"]}-in">{lines}</div></div></div>')
    for vid, v in VIGNETTES.items():
        a, b = VIG_TIMES[vid]
        paths = "".join(f'<path class="vp" d="{d}"/>' for d in v["paths"])
        parts.append(f'<div id="{vid}" {clip_attrs(a, b + 0.5, 4)}><div class="vig {"warm" if v["warm"] else "cold"}">'
                     f'<div class="vin" id="{vid}-in"><svg viewBox="0 0 500 520" width="500" height="520">{paths}</svg></div></div></div>')
    parts.append(f'<div id="final-card" {clip_attrs(FINAL, TOTAL, 2)}><div class="card-in" id="final-in">'
                 f'<h1 class="card-title big">{chars_html("Зимний вечер")}</h1>'
                 f'<p class="card-author">{chars_html("Александр Сергеевич Пушкин")}</p></div></div>')
    mug_t = word_at(19, "кружка")
    parts.append(f'<div id="mug" {clip_attrs(mug_t - 0.2, TOTAL, 5)}><div class="mug-in" id="mug-in">'
                 '<svg viewBox="0 0 170 200" width="170" height="200">'
                 '<defs><linearGradient id="clay" x1="0" x2="1"><stop offset="0" stop-color="#7a3a1c"/>'
                 '<stop offset="0.45" stop-color="#b8653a"/><stop offset="1" stop-color="#5a2810"/></linearGradient></defs>'
                 '<path class="steam" id="steam1" d="M 48 88 C 36 62, 62 46, 48 18"/>'
                 '<path class="steam" id="steam2" d="M 70 84 C 84 58, 58 40, 72 8"/>'
                 '<path class="steam" id="steam3" d="M 92 88 C 80 64, 104 46, 92 22"/>'
                 '<path d="M 116 112 C 160 112, 160 166, 112 166" fill="none" stroke="#8a4524" stroke-width="13"/>'
                 '<path d="M 18 96 L 122 96 L 116 186 Q 114 196 104 196 L 36 196 Q 26 196 24 186 Z" fill="url(#clay)"/>'
                 '<path d="M 18 96 L 122 96 L 121 110 L 19 110 Z" fill="#d9b27a" opacity="0.85"/>'
                 '<ellipse cx="70" cy="96" rx="52" ry="7" fill="#3a1a0a"/>'
                 '</svg></div></div>')
    return "\n      ".join(parts)


def keys():
    return {
        "storm": [[0, 0.5], [S(1) - 0.6, 0.8], [S(1) + 1, 0.92], [S(4), 0.6], [S(5), 0.9], [E(8), 0.9],
                  [S(9), 0.5], [S(10) + 1, 0.32], [S(13), 0.5], [E(16), 0.38], [S(17), 0.25], [E(24), 0.2],
                  [S(25) - 0.6, 0.6], [S(25) + 0.8, 1.0], [S(28), 0.65], [S(29), 0.72], [E(32), 0.6], [TOTAL, 0.45]],
        "candle": [[0, 0], [0.5, 0], [1.4, 1.0], [S(9), 1.0], [S(10) + 0.4, 0.55], [S(13), 0.6], [E(16), 0.62],
                   [S(17), 0.9], [S(19), 1.2], [S(20), 1.35], [E(24), 1.3], [S(25), 1.05], [S(29), 1.25], [TOTAL, 1.3]],
        "frost": [[0, 0.0], [5.6, 0.45], [E(8), 0.75], [E(16), 0.9], [S(17) + 1, 0.82], [S(20), 0.55],
                  [E(24), 0.5], [S(25), 0.62], [S(28), 0.95], [TOTAL, 1.0]],
        "warmth": [[0, 0.15], [S(17), 0.15], [S(19), 0.8], [E(24), 0.85], [S(25), 0.35], [S(29), 0.8], [TOTAL, 0.7]],
        "scrimX": [[0, 960], [5.6, 960], [V0 - 0.2, 700], [E(32) + 0.4, 700], [FINAL + 0.3, 960], [TOTAL, 960]],
    }


def config():
    return {
        "total": TOTAL, "voiceStart": V0, "final": FINAL, "title": TITLE,
        "lines": [{"n": l["n"], "s": S(l["n"]), "e": E(l["n"])} for l in LINES],
        "groups": GROUPS, "vignettes": {k: v for k, v in VIG_TIMES.items()},
        "keys": keys(),
        "gusts": [word_at(3, "завоет"), word_at(27, "завоет"), S(1) + 0.2, S(25) + 0.2, word_at(13, "завываньем")],
        "straw": word_at(6, "соломой"), "knock": word_at(8, "застучит"), "mug": word_at(19, "кружка"),
        "melt": S(9) + 2.0,
    }


def main():
    assets = HERE / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copyfile(POEM / "voice.mp3", assets / "voice.mp3")
    shutil.copyfile(POEM / "music" / "music.wav", assets / "music.wav")
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    out = (tpl.replace("%%TOTAL%%", f"{TOTAL:.3f}")
              .replace("%%VOICE_START%%", f"{V0:.3f}")
              .replace("%%VOICE_DUR%%", f'{T["voiceDuration"]:.3f}')
              .replace("%%TEXT%%", build_text())
              .replace("%%CFG%%", json.dumps(config(), ensure_ascii=False)))
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, final card at {FINAL:.2f} s")


if __name__ == "__main__":
    main()
