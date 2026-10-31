"""Собирает index.html ролика из src/*.js, ../poem.md и ../timings.json.

Запуск: python3 build.py   (после правки таймингов или текста)
Копирует голос и музыку в assets/.
"""
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
V0 = 7.0      # где в ролике начинается голос
OUTRO = 9.0   # финал после голоса

T = json.loads((POEM / "timings.json").read_text(encoding="utf-8"))
LINES = T["lines"]
TOTAL = round(V0 + T["voiceDuration"] + OUTRO, 3)


def check_text():
    """Экранный текст обязан совпадать с poem.md буква в букву."""
    body = (POEM / "poem.md").read_text(encoding="utf-8").split("## Текст")[1]
    want = [l.strip() for l in body.splitlines() if l.strip()]
    got = [l["text"] for l in LINES]
    assert want == got, "timings.json расходится с poem.md"
    for l in LINES:
        assert " ".join(w["w"] for w in l["words"]) == l["text"], l["text"]


def main():
    check_text()
    lines = [{
        "n": l["n"], "text": l["text"], "role": l["role"], "stanza": l["stanza"],
        "start": round(l["start"] + V0, 3), "end": round(l["end"] + V0, 3),
        "words": [{"w": w["w"], "s": round(w["s"] + V0, 3), "e": round(w["e"] + V0, 3)} for w in l["words"]],
    } for l in LINES]
    cfg = {"v0": V0, "total": TOTAL, "lines": lines}
    (HERE / "assets").mkdir(exist_ok=True)
    shutil.copy(POEM / "voice.mp3", HERE / "assets" / "voice.mp3")
    music = POEM / "music" / "music.wav"
    if music.exists():
        shutil.copy(music, HERE / "assets" / "music.wav")
    music_tag = (f'<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="{TOTAL}" '
                 'data-track-index="11" data-volume="1"></audio>') if music.exists() else ""
    html = f"""<!doctype html>
<!-- Собирается командой python3 build.py. Правьте src/*.js и build.py, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #0b0710; }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; }}
      #scene {{ position: absolute; inset: 0; width: 1920px; height: 1080px; image-rendering: pixelated; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
      <canvas id="scene" width="480" height="270"></canvas>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="{V0}" data-duration="{T['voiceDuration']}" data-track-index="10" data-volume="1"></audio>
      {music_tag}
    </div>
    <script>const CFG = {json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))};</script>
    <script src="src/font.js"></script>
    <script src="src/gfx.js"></script>
    <script src="src/sprites.js"></script>
    <script src="src/scenes1.js"></script>
    <script src="src/scenes2.js"></script>
    <script src="src/main.js"></script>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      tl.set({{}}, {{}}, CFG.total);
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
    (HERE / "index.html").write_text(html, encoding="utf-8")
    print("index.html готов,", TOTAL, "с,", len(lines), "строк")


if __name__ == "__main__":
    main()
