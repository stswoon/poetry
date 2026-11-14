<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "CapB"; font-weight: 700; src: local("Avenir Next Bold"), local("AvenirNext-Bold"); }
      @font-face { font-family: "TitleR"; font-weight: 700; src: local("Comic Sans MS Bold"), local("ComicSansMS-Bold"); }
      :root { --ink: #2b2340; --key: #c8322a; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #dfe9f5; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "CapB", "Avenir Next", sans-serif; color: var(--ink); background: #dfe9f5; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "CapB"; }
      #preload i { font: normal 700 30px "TitleR"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(826px 0 84px 0); }
      .cap { position: absolute; left: 0; width: 1920px; text-align: center; top: 0; height: 72px; line-height: 72px; font-size: 58px; font-weight: 700; white-space: nowrap; word-spacing: 0.14em; opacity: 0;
             text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7); }
      .w { display: inline-block; opacity: 0; transform-origin: 50% 90%; }
      .k { color: var(--key); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Как на тоненький ледок <i>Как на тоненький ледок… Русская народная песня</i></div>
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
