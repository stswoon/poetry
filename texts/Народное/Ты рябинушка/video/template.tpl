<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Pero"; font-style: italic; font-weight: 700; src: local("PT Serif Bold Italic"), local("PTSerif-BoldItalic"), local("Georgia Bold Italic"); }
      @font-face { font-family: "Pero"; font-style: italic; font-weight: 400; src: local("PT Serif Italic"), local("PTSerif-Italic"), local("Georgia Italic"); }
      :root { --gold: #f3cd63; --red: #ef4a2e; --cream: #f6e7c1; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #24150c; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Pero", serif; color: var(--gold); background: #24150c; }
      #stage { position: absolute; inset: 0; width: 1920px; height: 1080px; transform-origin: 960px 540px; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; pointer-events: none; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: italic 700 30px "Pero"; }
      #preload i { font: italic 400 30px "Pero"; }
      .txt { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      .sheet { position: absolute; inset: 0; transform-origin: 1450px 540px; }
      .w { display: inline-block; white-space: nowrap; padding: 8px 14px; margin: -8px -14px; opacity: 0; }
      .k { color: var(--red); }
      .line { position: absolute; left: 1130px; width: 640px; height: 90px; line-height: 90px; text-align: center; font-size: 56px; font-weight: 700; font-style: italic; white-space: nowrap; word-spacing: 0.04em;
              text-shadow: 0 3px 0 rgba(60, 30, 4, 0.9), 0 0 22px rgba(0, 0, 0, 0.7); }
      .ct { position: absolute; left: 1110px; width: 680px; text-align: center; font-weight: 700; font-style: italic; white-space: nowrap; color: var(--red);
            text-shadow: 0 3px 0 rgba(70, 8, 2, 0.9), 0 0 24px rgba(0, 0, 0, 0.7); }
      .ca { position: absolute; left: 1110px; width: 680px; text-align: center; font-weight: 400; font-style: italic; white-space: nowrap; color: var(--gold);
            text-shadow: 0 2px 0 rgba(60, 30, 4, 0.9), 0 0 18px rgba(0, 0, 0, 0.7); }
      .intro .ct { top: 410px; font-size: 64px; line-height: 84px; }
      .intro .ca { top: 556px; font-size: 38px; line-height: 54px; }
      .final .ct { top: 396px; font-size: 72px; line-height: 92px; }
      .final .ca { top: 562px; font-size: 42px; line-height: 58px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <div id="stage">
        <canvas id="scene" width="1920" height="1080"></canvas>
        <div id="preload" aria-hidden="true">Шрифт рябинушка <i>Русская народная песня</i></div>
        %%TEXT%%
      </div>
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
