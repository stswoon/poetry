<!doctype html>
<!-- Собрано build.py из template.tpl и src/*.js — правьте их, не этот файл. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "M PLUS Rounded 1c"; font-weight: 700; src: url("assets/fonts/mplusr-700.woff2") format("woff2"); }
      @font-face { font-family: "M PLUS Rounded 1c"; font-weight: 800; src: url("assets/fonts/mplusr-800.woff2") format("woff2"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #2a1e4a; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #2a1e4a; }
      #scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #fontwarm { position: absolute; left: -9999px; top: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{TOTAL}}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="fontwarm"><span style="font-family:'M PLUS Rounded 1c';font-weight:700">Кот поёт Фет</span><span style="font-family:'M PLUS Rounded 1c';font-weight:800">Кот поёт, глаза прищуря…</span></div>
      {{VOICE}}
      {{MUSIC}}
    </div>
    <script>const CFG = {{CFG}};</script>
    <script>
{{JS}}
    </script>
  </body>
</html>
