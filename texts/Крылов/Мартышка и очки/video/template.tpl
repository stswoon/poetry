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
      @font-face { font-family: "SansB"; font-weight: 700; font-style: italic; src: local("PT Sans Bold Italic"), local("PTSans-BoldItalic"); }
      @font-face { font-family: "Num"; src: local("Impact"); }
      :root { --bg: #0e0b1f; --yellow: #ffd21f; --magenta: #ff2e88; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0e0b1f; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Narrow", sans-serif; color: #fff; background: #0e0b1f; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "Narrow"; }
      #preload i { font: italic 700 30px "SansB"; } #preload b { font: 30px "Num"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(814px 0 106px 0); }
      .cap { position: absolute; left: 130px; top: 0; height: 70px; line-height: 70px; font-size: 58px; font-weight: 700; white-space: nowrap; word-spacing: 0.06em; opacity: 0;
             text-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); }
      .w { display: inline-block; opacity: 0; }
      .k { color: var(--yellow); }
      .tt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; opacity: 0; }
      .tt h1 { position: absolute; left: 60px; width: 1320px; text-align: center; white-space: nowrap; font-family: "Num", sans-serif; font-weight: 400; color: #fff;
               text-shadow: 0 7px 0 rgba(255, 46, 136, 0.9); letter-spacing: 0.02em; }
      .tt p { position: absolute; left: 60px; width: 1320px; text-align: center; white-space: nowrap; font-family: "SansB", sans-serif; font-style: italic; font-weight: 700; color: var(--yellow); }
      #tt1 h1 { top: 196px; font-size: 128px; line-height: 150px; }
      #tt1 p { top: 362px; font-size: 50px; line-height: 62px; }
      #tt2 h1 { top: 262px; font-size: 146px; line-height: 172px; }
      #tt2 p { top: 446px; font-size: 56px; line-height: 68px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Мартышка и очки МАРТЫШКА <i>Иван Андреевич Крылов</i> <b>ПОПЫТКА ВРАКИ 1 024</b></div>
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
