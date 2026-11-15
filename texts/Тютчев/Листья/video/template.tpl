<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "CapS"; font-weight: 700; src: local("Iowan Old Style Bold"), local("IowanOldStyle-Bold"); }
      @font-face { font-family: "CapI"; font-style: italic; font-weight: 400; src: local("Iowan Old Style Italic"), local("IowanOldStyle-Italic"); }
      @font-face { font-family: "Leafy"; font-weight: 900; src: local("Superclarendon Black"), local("Superclarendon-Black"); }
      :root { --ink: #3a2616; --key: #b5401c; --strip: #f4ead3; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #c9a97a; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "CapS", serif; color: var(--ink); background: #c9a97a; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "CapS"; }
      #preload i { font: italic 400 30px "CapI"; }
      #preload b { font: 900 30px "Leafy"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #strip { position: absolute; left: 250px; top: 838px; width: 1420px; height: 172px; background: var(--strip); opacity: 0;
               transform-origin: 50% 50%;
               clip-path: polygon(0.6% 9%, 6% 4%, 13% 7%, 21% 2%, 30% 6%, 38% 3%, 47% 7%, 55% 2%, 64% 5%, 72% 1%, 81% 6%, 89% 3%, 95% 7%, 99.4% 4%,
                                  98.6% 50%, 99.6% 93%, 93% 97%, 85% 94%, 77% 99%, 68% 95%, 59% 98%, 50% 94%, 41% 99%, 32% 95%, 23% 98%, 14% 94%, 7% 98%, 0.4% 95%, 1.2% 52%);
               box-shadow: none; }
      .cap { position: absolute; left: 0; width: 1920px; text-align: center; top: 0; height: 70px; line-height: 70px; font-size: 56px; font-weight: 700; white-space: nowrap; word-spacing: 0.12em; opacity: 0; }
      .w { display: inline-block; opacity: 0; transform-origin: 50% 85%; }
      .k { color: var(--key); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Листья Тютчев <i>Фёдор Иванович Тютчев · 1830</i> <b>Листья</b></div>
      %%TEXT%%
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
%%JS%%
    </script>
  </body>
</html>
