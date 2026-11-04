<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Cormorant"; font-style: normal; font-weight: 300 700;
        src: url("assets/fonts/cormorant-cyr.woff2") format("woff2");
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: "Cormorant"; font-style: normal; font-weight: 300 700;
        src: url("assets/fonts/cormorant-lat.woff2") format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F; }
      /* PT Serif (ParaType, OFL) — системный шрифт macOS: привычные школьнику «л» и «д» */
      @font-face { font-family: "Doroga"; font-style: normal; font-weight: 700; src: local("PT Serif Bold"), local("PTSerif-Bold"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0b0908; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Cormorant", serif; background: #0b0908; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; pointer-events: none; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 40px "Doroga"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="preload" aria-hidden="true">Зимняя дорога · Сквозь волнистые туманы 1826 …</div>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
