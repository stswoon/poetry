<!doctype html>
<!-- Собрано build.py из template.tpl и src/*.js — правьте их, не этот файл. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #3b2618; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #3b2618; }
      #scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #fontwarm { position: absolute; left: -9999px; top: 0; }
      @font-face { font-family: "ZTitle"; src: local("Rockwell-ExtraBold"), local("Rockwell Extra Bold"), local("Rockwell-Bold"), local("Rockwell Bold"); }
      @font-face { font-family: "ZLine"; src: local("AmericanTypewriter-Semibold"), local("American Typewriter Semibold"), local("AmericanTypewriter-Bold"); }
      @font-face { font-family: "ZHud"; src: local("Futura-CondensedExtraBold"), local("Futura Condensed ExtraBold"); }
      .f1 { font-family: "ZTitle"; }
      .f2 { font-family: "ZLine"; }
      .f3 { font-family: "ZHud"; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{TOTAL}}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="fontwarm" data-layout-allow-overflow><span class="f1">Зима Иван Суриков 1880 Осада избы</span><span class="f2">{{ALLTEXT}}</span><span class="f3">ВОЛНА ВАШ ХОД ЗИМА НАСТАЛА ИЗБА УСТОЯЛА ПОЛЕ ТЕПЛО СТАРТ 0123456789%</span></div>
      {{VOICE}}
      {{MUSIC}}
    </div>
    <script>const CFG = {{CFG}};</script>
    <script>
{{JS}}
    </script>
  </body>
</html>
