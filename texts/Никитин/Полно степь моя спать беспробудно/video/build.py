"""«Полно, степь моя, спать беспробудно…» (Никитин), FPV-полёт над степью, low-poly 3D.
Собирает index.html из src/*.js, ../poem.md и ../timings.json; пишет ../music/events.json
(время строк, слов и событий для музыки и шумов).

Запуск: python3 build.py              (после правки таймингов, текста или исходников)
        PROBE=cast python3 build.py   (страница-проба: косцы, журавли и птицы во всех позах; PROBE_PAGE=0,1,2)
"""

import json
import os
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 5.0      # где в ролике начинается голос (до него — взлёт квадрокоптера со стороны и титр)
OUTRO = 6.8   # финал после голоса: название крупно над туманом (обложка)
SRC = ("core.js", "terrain.js", "props.js", "birds.js", "mower.js", "drone.js", "details.js", "sky.js", "camera.js", "world.js", "text.js", "main.js")
PROBE = os.environ.get("PROBE", "")

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
NL = len(LINES)
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def norm(s):
    return re.sub(r"[^а-яa-z]", "", s.lower().replace("ё", "е").replace("́", ""))


def S(n):
    return round(LINES[n - 1]["start"] + V0, 3)


def E(n):
    return round(LINES[n - 1]["end"] + V0, 3)


def tokens(l):
    """Слова строки как в poem.md с временем; знак без букв берёт время соседнего слова."""
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


def word_at(n, word, occ=1):
    k = 0
    for tok, st, en in tokens(LINES[n - 1]):
        if norm(tok) == norm(word):
            k += 1
            if k == occ:
                return round(st + V0, 3)
    raise KeyError(f"{n}: {word}")


WORDS = {
    "polno": (1, "Полно"), "spat": (1, "спать"), "carstvo": (2, "царство"), "proshlo": (2, "прошло"),
    "sohnet": (3, "Сохнет"), "skatert": (3, "скатерть"), "dorozhki": (3, "дорожки"),
    "sneg": (4, "Снег"), "propal": (4, "пропал"), "teplo": (4, "тепло"), "svetlo": (4, "светло"),
    "probud": (5, "Пробудись"), "umoisya": (5, "умойся"), "rosoyu": (5, "росою"),
    "nenagl": (6, "ненаглядной"), "pokazh": (6, "покажись"), "prinakr": (7, "Принакрой"), "muravoyu": (7, "муравою"),
    "nevesta": (8, "невеста"), "cvety": (8, "цветы"), "naryad": (8, "нарядись"),
    "polyub": (9, "Полюбуйся"), "vesna": (9, "весна"), "zhuravli": (10, "Журавли"), "karavan": (10, "караваном"),
    "letyat": (10, "летят"), "zolote": (11, "золоте"), "utopaet": (11, "утопает"),
    "ruchyi": (12, "ручьи"), "ovragam": (12, "оврагам"), "shumyat": (12, "шумят"),
    "belosn": (13, "Белоснежные"), "tuchki": (13, "тучки"), "sineve": (14, "синеве"), "plyvut": (14, "плывут"),
    "grudi": (15, "груди"), "polosami": (15, "полосами"), "teni": (16, "тени"), "begut": (16, "бегут"),
    "skoro": (17, "Скоро"), "gosti": (17, "гости"), "soberut": (17, "соберутся"),
    "gnezd": (18, "гнёзд"), "ponavyut": (18, "понавьют"), "posmotri": (18, "посмотри"),
    "zvuki": (19, "звуки"), "pesni": (19, "песни"), "polyutsya": (19, "польются"),
    "den": (20, "День-деньской"), "zari1": (20, "зари", 1), "zari2": (20, "зари", 2),
    "leto": (21, "лето"), "lozhis": (21, "ложись"), "kosoyu": (21, "косою"),
    "kovyl": (22, "Ковыль"), "ugodu": (22, "угоду"), "kostsam": (22, "косцам"),
    "podym": (23, "Подымайся"), "kopna": (23, "копна"), "kopnoyu": (23, "копною"),
    "raspev": (24, "Распевайте"), "kostsy": (24, "косцы"), "nocham": (24, "ночам"),
    "merc": (25, "мерцанье"), "rumyan": (25, "румяном"), "zorek": (26, "зорек"), "prohl": (26, "прохладные"),
    "otdohni": (27, "Отдохни"), "tumanom": (27, "туманом"), "bezzab": (28, "Беззаботно"), "krepko": (28, "крепко"),
    "usni": (28, "усни"),
}


def build_ev():
    ev = {"V0": V0, "total": TOTAL}
    ev |= {f"L{i}": S(i) for i in range(1, NL + 1)}
    ev |= {f"E{i}": E(i) for i in range(1, NL + 1)}
    for k, v in WORDS.items():
        ev[k] = word_at(*v)
    ev["fin"] = round(E(NL) + 1.2, 3)
    assert ev["fin"] < TOTAL - 4.0, "финальный кадр с названием слишком короткий"
    return {k: round(v, 3) for k, v in ev.items()}


def check_text():
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1].split("\n## ")[0]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, f"timings.json расходится с poem.md: {[(a, b) for a, b in zip(want, got) if a != b]}"
    screen = [" ".join(t for t, _, _ in tokens(l)) for l in LINES]
    assert want == screen, "слова на экране расходятся с poem.md"


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
    cfg = {"v0": V0, "total": TOTAL, "ev": ev, "lines": lines, "probe": PROBE, "probePage": int(os.environ.get("PROBE_PAGE", "0"))}
    js = "\n".join((HERE / "src" / f).read_text(encoding="utf-8") for f in SRC)
    ids = re.findall(r'id="([^"]+)"', (HERE / "template.tpl").read_text(encoding="utf-8"))
    assert len(ids) == len(set(ids)), "повторяющиеся id"
    music_tag = (f'<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL:.3f}" '
                 f'data-track-index="11" data-volume="1"></audio>') if has_music and not PROBE else ""
    voice_tag = (f'<audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0:.3f}" data-duration="{T["voiceDuration"]:.3f}" '
                 f'data-track-index="10" data-volume="1"></audio>') if not PROBE else ""
    tpl = (HERE / "template.tpl").read_text(encoding="utf-8")
    html = (tpl.replace("{{TOTAL}}", f"{TOTAL:.3f}").replace("{{VOICE}}", voice_tag).replace("{{MUSIC}}", music_tag)
            .replace("{{ALLTEXT}}", " ".join(l["text"] for l in LINES)).replace("{{CFG}}", json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))).replace("{{JS}}", js))
    (HERE / "index.html").write_text(html, encoding="utf-8")
    print(f"index.html: {TOTAL:.2f} s, музыка: {'есть' if has_music else 'нет'}{', ПРОБА ' + PROBE if PROBE else ''}")


if __name__ == "__main__":
    main()
