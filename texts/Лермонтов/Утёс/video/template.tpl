<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "SansB"; font-weight: 700; src: local("PT Sans Bold"), local("PTSans-Bold"); }
      @font-face { font-family: "SansBI"; font-weight: 700; font-style: italic; src: local("PT Sans Bold Italic"), local("PTSans-BoldItalic"); }
      :root { --gold: #ffd25a; --ink: #1a1f4d; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0b1238; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "SansB", sans-serif; color: #fff; background: #0b1238; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "SansB"; }
      #preload i { font: italic 700 30px "SansBI"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(822px 0 92px 0); }
      .cap { position: absolute; left: 200px; top: 0; height: 74px; line-height: 74px; font-size: 62px; font-weight: 700; white-space: nowrap; word-spacing: 0.04em; opacity: 0;
             text-shadow: 0 4px 0 rgba(10, 12, 40, 0.55); }
      .w { display: inline-block; opacity: 0; }
      .k { color: var(--gold); }
      .tt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; opacity: 0; }
      .tt h1 { position: absolute; text-align: center; white-space: nowrap; font-family: "SansB", sans-serif; font-weight: 700; color: var(--gold); letter-spacing: 0.02em;
               text-shadow: 0 8px 0 var(--ink), 0 -3px 0 var(--ink), 4px 0 0 var(--ink), -4px 0 0 var(--ink), 0 0 46px rgba(255, 210, 90, 0.55); }
      .tt p { position: absolute; text-align: center; white-space: nowrap; font-family: "SansBI", sans-serif; font-style: italic; font-weight: 700; color: #fff;
              text-shadow: 0 4px 0 var(--ink), 0 0 22px rgba(10, 12, 40, 0.8); }
      #tt1 h1 { left: 40px; width: 900px; top: 170px; font-size: 168px; line-height: 190px; }
      #tt1 p { left: 40px; width: 900px; top: 368px; font-size: 50px; line-height: 62px; }
      #tt2 h1 { left: 80px; width: 1060px; top: 250px; font-size: 230px; line-height: 250px; }
      #tt2 p { left: 80px; width: 1060px; top: 508px; font-size: 58px; line-height: 70px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Утёс Ночевала тучка <i>Михаил Юрьевич Лермонтов 1841</i></div>
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
