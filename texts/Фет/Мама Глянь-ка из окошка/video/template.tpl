<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Amatic SC"; font-weight: 700; src: url("assets/fonts/amaticsc-700-cyrillic.woff2") format("woff2"); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: "Amatic SC"; font-weight: 700; src: url("assets/fonts/amaticsc-700-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
      @font-face { font-family: "Caveat"; font-weight: 700; src: url("assets/fonts/caveat-700-cyrillic.woff2") format("woff2"); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: "Caveat"; font-weight: 700; src: url("assets/fonts/caveat-700-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #2b4a3d; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #2b4a3d; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; }
      #preload b { font: 700 40px "Amatic SC"; }
      #preload i { font: 700 40px "Caveat"; font-style: normal; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true"><b>Мама! глянь-ка из окошка Фет AZ</b> <i>Мама! глянь-ка Ну, скорей гулять! «»</i></div>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
