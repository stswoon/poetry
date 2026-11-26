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
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #f3ead2; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #f3ead2; }
      #scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #fontwarm { position: absolute; left: -9999px; top: 0; }
      @font-face { font-family: "ComicTitle"; src: local("Phosphate Solid"), local("Phosphate-Solid"), local("Impact"); }
      @font-face { font-family: "ComicLine"; src: local("Marker Felt Wide"), local("MarkerFelt-Wide"), local("Comic Sans MS Bold"); }
      @font-face { font-family: "ComicSfx"; src: local("Impact"); }
      @font-face { font-family: "ComicAuth"; src: local("Impact"); }
      .f1 { font-family: "ComicTitle"; }
      .f2 { font-family: "ComicLine"; }
      .f3 { font-family: "ComicSfx"; }
      .f4 { font-family: "ComicAuth"; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{TOTAL}}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="fontwarm" data-layout-allow-overflow><span class="f1">ВСТРЕЧА ЗИМЫ</span><span class="f2">{{ALLTEXT}}</span><span class="f3">ТУК-ТУК ХРУСТЬ ВЖУХ НИЧЕГО</span><span class="f4">ИВАН САВВИЧ НИКИТИН · 1854</span></div>
      {{VOICE}}
      {{MUSIC}}
    </div>
    <script>const CFG = {{CFG}};</script>
    <script>
{{JS}}
    </script>
  </body>
</html>
