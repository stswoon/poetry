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
      @font-face { font-family: "Arcade"; src: local("Impact"); }
      :root { --gold: #ffcc3d; --pink: #ff6fae; --ink: #1b1026; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #1b1026; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Narrow", sans-serif; color: #fff; background: #1b1026; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "Narrow"; }
      #preload i { font: italic 700 30px "SansB"; } #preload b { font: 30px "Arcade"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(830px 0 90px 0); }
      .cap { position: absolute; left: 170px; top: 0; height: 70px; line-height: 70px; font-size: 58px; font-weight: 700; white-space: nowrap; word-spacing: 0.06em; opacity: 0;
             text-shadow: 0 3px 0 rgba(0, 0, 0, 0.5); }
      .w { display: inline-block; opacity: 0; }
      .k { color: #ffe14a; }
      .tt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; opacity: 0; }
      .tt h1 { position: absolute; left: 0; width: 1920px; text-align: center; white-space: nowrap; font-family: "Arcade", sans-serif; font-weight: 400; color: var(--gold);
               -webkit-text-stroke: 10px var(--ink); paint-order: stroke fill; text-shadow: 0 12px 0 #c23a7a, 0 18px 24px rgba(0, 0, 0, 0.5); letter-spacing: 0.04em; }
      .tt p { position: absolute; left: 0; width: 1920px; text-align: center; white-space: nowrap; font-family: "SansB", sans-serif; font-style: italic; font-weight: 700; color: #fff;
              -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill; }
      .tt h2 { position: absolute; left: 0; width: 1920px; text-align: center; white-space: nowrap; font-family: "Narrow", sans-serif; font-weight: 700; color: #ffe14a;
               -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill; }
      #tt1 h1 { top: 150px; font-size: 190px; line-height: 220px; }
      #tt1 p { top: 384px; font-size: 56px; line-height: 70px; }
      #tt1 h2 { top: 456px; font-size: 48px; line-height: 60px; }
      #tt2 h1 { top: 170px; font-size: 230px; line-height: 260px; }
      #tt2 p { top: 448px; font-size: 60px; line-height: 76px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Перчатка КУНИГУНДА РЫЦАРЬ <i>Фридрих Шиллер</i> <b>ROUND FIGHT K.O. ЛЕВ ТИГР 0123456789</b></div>
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
