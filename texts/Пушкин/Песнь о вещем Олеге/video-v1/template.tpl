<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl и src/*.js командой `python3 build.py`. Правьте эти файлы, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "TitleSerif"; font-weight: 700; src: local("PT Serif Bold"), local("PTSerif-Bold"); }
      @font-face { font-family: "CapSerif"; font-weight: 400; src: local("PT Serif"), local("PTSerif-Regular"); }
      @font-face { font-family: "CapSerif"; font-weight: 400; font-style: italic; src: local("PT Serif Italic"), local("PTSerif-Italic"); }
      @font-face { font-family: "CapSerif"; font-weight: 700; src: local("PT Serif Bold"), local("PTSerif-Bold"); }
      :root { --ink: #06080c; --gold: #f6c35b; --cap: #f3ead8; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "CapSerif", serif; color: var(--cap); background: #000; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: 700 30px "TitleSerif"; }
      #preload i { font: italic 400 30px "CapSerif"; } #preload b { font: 400 30px "CapSerif"; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 3; }
      #caps { clip-path: inset(790px 0 92px 0); }
      .cap { position: absolute; left: 0; top: 0; width: 1920px; text-align: center; height: 70px; line-height: 70px; font-size: 52px; white-space: nowrap; word-spacing: 0.04em; opacity: 0;
             text-shadow: 0 3px 8px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.9); }
      .cap.big { top: 470px; height: 120px; line-height: 120px; font-size: 76px; font-weight: 700; color: #fff4dc; letter-spacing: 0.01em;
             text-shadow: 0 0 30px rgba(255, 170, 90, 0.45), 0 4px 10px rgba(0, 0, 0, 0.95); }
      .w { display: inline-block; opacity: 0; }
      .k { color: var(--gold); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ <i>Александр Сергеевич Пушкин</i> <b>Как ныне сбирается вещий Олег</b></div>
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
