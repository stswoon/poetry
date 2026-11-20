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
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #1c2a44; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #1c2a44; }
      #scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #fontwarm { position: absolute; left: -9999px; top: 0; }
      @font-face { font-family: "StepTitle"; src: local("Avenir Next Bold"), local("AvenirNext-Bold"), local("PT Sans Bold"), local("PTSans-Bold"); }
      @font-face { font-family: "StepLine"; src: local("Avenir Next Demi Bold"), local("AvenirNext-DemiBold"), local("PT Sans Bold"), local("PTSans-Bold"); }
      @font-face { font-family: "StepAuth"; src: local("Avenir Next Medium"), local("AvenirNext-Medium"), local("PT Sans"), local("PTSans-Regular"); }
      .fw6 { font-family: "StepAuth"; }
      .fw7 { font-family: "StepLine"; }
      .fw9 { font-family: "StepTitle"; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{TOTAL}}" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080" data-layout-allow-overflow></canvas>
      <div id="fontwarm" data-layout-allow-overflow><span class="fw6">Иван Саввич Никитин · 1854</span><span class="fw7">{{ALLTEXT}}</span><span class="fw9">ПОЛНО, СТЕПЬ МОЯ, СПАТЬ БЕСПРОБУДНО…</span></div>
      {{VOICE}}
      {{MUSIC}}
    </div>
    <script>const CFG = {{CFG}};</script>
    <script>
{{JS}}
    </script>
  </body>
</html>
