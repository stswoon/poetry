<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Narrow"; font-weight: 700; src: local("PT Sans Narrow Bold"), local("PTSans-NarrowBold"); }
      @font-face { font-family: "SansB"; font-weight: 700; src: local("PT Sans Bold"), local("PTSans-Bold"); }
      @font-face { font-family: "SansBI"; font-weight: 700; font-style: italic; src: local("PT Sans Bold Italic"), local("PTSans-BoldItalic"); }
      :root { --ink: #1b2547; --yellow: #ffe14a; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #2b2c5a; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "SansB", sans-serif; color: #fff; background: #2b2c5a; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "SansB"; }
      #preload i { font: 700 30px "Narrow"; } #preload b { font: italic 700 30px "SansBI"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(800px 0 96px 0); }
      .cap { position: absolute; left: 0; top: 0; width: 1920px; text-align: center; height: 72px; line-height: 72px; font-size: 60px; font-weight: 700; white-space: nowrap; word-spacing: 0.08em; opacity: 0;
             text-shadow: 0 3px 0 rgba(10, 14, 40, 0.55), 0 0 18px rgba(10, 14, 40, 0.5); }
      .w { display: inline-block; opacity: 0; }
      .k { color: var(--yellow); }
      .tt { position: absolute; left: 0; width: 1920px; text-align: center; opacity: 0; transform-origin: 960px 50%; }
      .tt h1 { font-family: "Narrow", sans-serif; font-weight: 700; color: #fff; white-space: nowrap; letter-spacing: 0.01em;
               text-shadow: 0 0 2px var(--ink), 4px 4px 0 var(--ink), -4px 4px 0 var(--ink), 4px -4px 0 var(--ink), -4px -4px 0 var(--ink), 0 6px 0 var(--ink), 0 10px 26px rgba(10, 14, 40, 0.6); }
      .tt p { font-family: "SansBI", sans-serif; font-style: italic; font-weight: 700; color: var(--yellow); white-space: nowrap;
              text-shadow: 3px 3px 0 var(--ink), -3px 3px 0 var(--ink), 3px -3px 0 var(--ink), -3px -3px 0 var(--ink), 0 8px 20px rgba(10, 14, 40, 0.6); }
      #tt1 { top: 330px; } #tt1 h1 { font-size: 150px; line-height: 180px; } #tt1 p { font-size: 54px; line-height: 70px; margin-top: 10px; }
      #tt2 { top: 110px; } #tt2 h1 { font-size: 170px; line-height: 200px; } #tt2 p { font-size: 60px; line-height: 76px; margin-top: 6px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Весенняя гроза <i>Тютчев</i> <b>Фёдор Иванович</b></div>
      %%TEXT%%
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
