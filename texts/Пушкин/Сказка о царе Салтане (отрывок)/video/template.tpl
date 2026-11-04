<!doctype html>
<html lang="ru" data-resolution="landscape" data-composition-variables='[{"id":"title","type":"string","label":"Название","default":"Сказка о царе Салтане"},{"id":"author","type":"string","label":"Автор","default":"Александр Сергеевич Пушкин"}]'>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <title>Сказка о царе Салтане — морской приключенческий комикс</title>
  <script src="assets/gsap.min.js"></script>
  <script src="assets/motion.js"></script>
  <script>window.__timelines = window.__timelines || {};</script>
  <script src="assets/scene-motion.js"></script>
  <style>
    * { box-sizing: border-box; }
    html,body { margin:0; width:1920px; height:1080px; overflow:hidden; background:#FFF5DD; }
    #root { position:relative; width:1920px; height:1080px; overflow:hidden; }
    .clip { position:absolute; inset:0; }
    .base { position:absolute; inset:0; background:#FFF5DD; }
  </style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="@@DURATION@@" data-width="1920" data-height="1080">
  <div class="base" data-layout-ignore></div>
  @@HOSTS@@
  <audio id="voice" class="clip" src="assets/voice.mp3" data-start="@@INTRO@@" data-duration="@@VOICE_DURATION@@" data-track-index="20" data-volume="1"></audio>
  <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="@@DURATION@@" data-track-index="21" data-volume="1"></audio>
</div>
<script>
  const rootTimeline = gsap.timeline({paused:true});
  rootTimeline.to({progress:0}, {progress:1, duration:@@DURATION@@, ease:'none'}, 0);
  window.__timelines.main = rootTimeline;
</script>
</body>
</html>
