<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Pero"; font-style: italic; font-weight: 700; src: local("PT Serif Bold Italic"), local("PTSerif-BoldItalic"), local("Georgia Bold Italic"); }
      @font-face { font-family: "Pero"; font-style: italic; font-weight: 400; src: local("PT Serif Italic"), local("PTSerif-Italic"), local("Georgia Italic"); }
      :root { --ink: #3b2414; --or: #b4481c; --ye: #8c6206; --gr: #3a7a1e; --bl: #2c55a6; --gy: #4a4f5e; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #6f4a2c; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Pero", serif; color: var(--ink); background: #6f4a2c; }
      #stage { position: absolute; inset: 0; width: 1920px; height: 1080px; transform-origin: 960px 540px; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; pointer-events: none; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: italic 700 30px "Pero"; }
      #preload i { font: italic 400 30px "Pero"; }
      .txt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      .sheet { position: absolute; inset: 0; transform-origin: 960px 540px; }
      .w { display: inline-block; white-space: nowrap; padding: 8px 14px; margin: -8px -14px; opacity: 0; }
      .or { color: var(--or); } .ye { color: var(--ye); } .gr { color: var(--gr); } .bl { color: var(--bl); } .gy { color: var(--gy); }
      .line { position: absolute; left: 1020px; width: 720px; height: 90px; line-height: 90px; text-align: center; font-size: 60px; font-weight: 700; font-style: italic; white-space: nowrap; word-spacing: 0.04em; }
      .c1, .c2 { position: absolute; left: 1070px; width: 640px; text-align: center; font-size: 94px; font-weight: 700; font-style: italic; line-height: 104px; white-space: nowrap; color: var(--or); }
      .c1 { top: 348px; } .c2 { top: 452px; }
      .ca { position: absolute; left: 1070px; width: 640px; text-align: center; top: 598px; font-size: 38px; font-weight: 400; font-style: italic; line-height: 52px; white-space: nowrap; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <div id="stage">
        <canvas id="scene" width="1920" height="1080"></canvas>
        <div id="preload" aria-hidden="true">Шрифт 0123456789 № <i>Плещеев</i></div>
        %%TEXT%%
      </div>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
