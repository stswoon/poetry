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
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #efe4cc; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #efe4cc; }
      #scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #fontwarm { position: absolute; left: -9999px; top: 0; }
      @font-face { font-family: "GTitle"; src: local("Palatino-BoldItalic"), local("Palatino Bold Italic"); }
      @font-face { font-family: "GLine"; src: local("Palatino-Roman"), local("Palatino"); }
      @font-face { font-family: "GSub"; src: local("Palatino-Italic"), local("Palatino Italic"); }
      .f1 { font-family: "GTitle"; }
      .f2 { font-family: "GLine"; }
      .f3 { font-family: "GSub"; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{TOTAL}}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="fontwarm" data-layout-allow-overflow><span class="f1">Уж небо осенью дышало… А. С. Пушкин</span><span class="f2">{{ALLTEXT}}</span><span class="f3">А. С. Пушкин · из романа «Евгений Онегин» · юг</span></div>
      {{VOICE}}
      {{MUSIC}}
    </div>
    <script>const CFG = {{CFG}};</script>
    <script>
{{JS}}
    </script>
  </body>
</html>
