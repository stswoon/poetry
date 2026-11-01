<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Doska"; font-style: normal; font-weight: 400; src: local("Georgia"); }
      @font-face { font-family: "Doska"; font-style: normal; font-weight: 700; src: local("Georgia Bold"); }
      :root { --ink: #2a1810; --gr: #2c7a34; --or: #c9570c; --bl: #1c4a9a; --re: #bb2318; --pi: #c42a63; --te: #0d6f6c; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #e8b13f; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Doska", serif; color: var(--ink); background: #e8b13f; }
      #scene, #top { position: absolute; inset: 0; width: 1920px; height: 1080px; }
      #scene { z-index: 0; pointer-events: none; } #top { z-index: 6; pointer-events: none; }
      .w { display: inline-block; white-space: nowrap; opacity: 0; will-change: transform; }
      .gr { color: var(--gr); } .or { color: var(--or); } .bl { color: var(--bl); } .re { color: var(--re); } .pi { color: var(--pi); } .te { color: var(--te); }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 400 30px "Doska"; }
      #preload b { font: 700 30px "Doska"; }
      .txt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      .line { position: absolute; left: 1064px; width: 612px; text-align: center; font-size: 52px; font-weight: 700; line-height: 76px; height: 76px; white-space: nowrap; word-spacing: 0.02em; }
      .plate .line:nth-child(1) { top: 332px; } .plate .line:nth-child(2) { top: 444px; } .plate .line:nth-child(3) { top: 556px; } .plate .line:nth-child(4) { top: 668px; }
      .t1, .t2 { position: absolute; left: 260px; width: 1400px; text-align: center; font-size: 158px; font-weight: 700; line-height: 180px; color: #a31a14; white-space: nowrap; }
      .t1 { top: 228px; } .t2 { top: 402px; color: #1f6b2c; }
      .au { position: absolute; left: 260px; width: 1400px; text-align: center; top: 626px; font-size: 56px; font-weight: 700; line-height: 76px; white-space: nowrap; }
      .ye { position: absolute; left: 260px; width: 1400px; text-align: center; top: 706px; font-size: 50px; font-weight: 700; line-height: 70px; color: #a31a14; }
      .c1, .c2 { position: absolute; left: 1050px; width: 640px; text-align: center; font-size: 100px; font-weight: 700; line-height: 118px; white-space: nowrap; }
      .c1 { top: 340px; } .c2 { top: 458px; }
      .ca { position: absolute; left: 1050px; width: 640px; text-align: center; top: 600px; font-size: 35px; font-weight: 700; line-height: 56px; white-space: nowrap; }
      .cy { position: absolute; left: 1050px; width: 640px; text-align: center; top: 660px; font-size: 42px; font-weight: 700; line-height: 60px; }
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
