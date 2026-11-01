<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Blyudo"; font-style: normal; font-weight: 400; src: local("Georgia"); }
      @font-face { font-family: "Blyudo"; font-style: normal; font-weight: 700; src: local("Georgia Bold"); }
      :root { --ink: #16307e; --bl: #1f63d6; --dk: #0a1f66; --go: #9a6a00; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #12307f; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Blyudo", serif; color: var(--ink); background: #12307f; }
      #scene, #top { position: absolute; inset: 0; width: 1920px; height: 1080px; }
      #scene { z-index: 0; pointer-events: none; } #top { z-index: 6; pointer-events: none; }
      .w { display: inline-block; white-space: nowrap; opacity: 0; will-change: transform; }
      .bl { color: var(--bl); } .dk { color: var(--dk); } .go { color: var(--go); }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 400 30px "Blyudo"; }
      #preload b { font: 700 30px "Blyudo"; }
      .txt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      .line { position: absolute; left: 1010px; width: 680px; text-align: center; font-size: 50px; font-weight: 700; line-height: 80px; height: 80px; white-space: nowrap; word-spacing: 0.02em; }
      .plate .line:nth-child(1) { top: 380px; } .plate .line:nth-child(2) { top: 460px; } .plate .line:nth-child(3) { top: 540px; } .plate .line:nth-child(4) { top: 620px; }
      .t1 { position: absolute; left: 260px; width: 1400px; text-align: center; top: 276px; font-size: 200px; font-weight: 700; line-height: 230px; color: var(--ink); white-space: nowrap; }
      .au { position: absolute; left: 260px; width: 1400px; text-align: center; top: 546px; font-size: 58px; font-weight: 700; line-height: 80px; white-space: nowrap; }
      .ye { position: absolute; left: 260px; width: 1400px; text-align: center; top: 636px; font-size: 52px; font-weight: 700; line-height: 72px; color: var(--bl); }
      .c1 { position: absolute; left: 1010px; width: 680px; text-align: center; top: 362px; font-size: 136px; font-weight: 700; line-height: 158px; white-space: nowrap; }
      .ca { position: absolute; left: 1010px; width: 680px; text-align: center; top: 536px; font-size: 38px; font-weight: 700; line-height: 58px; white-space: nowrap; }
      .cy { position: absolute; left: 1010px; width: 680px; text-align: center; top: 600px; font-size: 44px; font-weight: 700; line-height: 62px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Шрифт 0123456789 <b>СВЮЗ ?</b></div>
      %%TEXT%%
      <canvas id="top" width="1920" height="1080"></canvas>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
