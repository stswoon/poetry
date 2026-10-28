# Утилиты для роликов

## Что установлено

- **HyperFrames** (CLI 0.8.204, из плагина Claude) — HTML → видео. Запускается через `npx hyperframes@0.8.204 <команда>`; Chrome для рендера лежит в `~/.cache/hyperframes/chrome`.
- **FFmpeg / FFprobe** — `brew install ffmpeg`, нужны HyperFrames для рендера.
- **Framer Motion** — пакет `motion` (новое имя framer-motion, сам `framer-motion` ставится как его зависимость). Установка: `cd utils && npm install`.
- **Whisper** — `brew install whisper-cpp` (1.9.5), модель `medium` в `~/.cache/hyperframes/whisper/models`. Нужен, чтобы получить таймкоды слов из озвучки.

Проверка окружения: `npx hyperframes@0.8.204 doctor`.

## Framer Motion внутри HyperFrames

HyperFrames сам выставляет время каждого кадра, поэтому анимация Motion ставится на паузу, а её время задаётся из события `hf-seek`.

1. Скопировать браузерный бандл в проект ролика (рендер должен работать без сети):

   ```bash
   mkdir -p lib && cp ../../../utils/node_modules/motion/dist/motion.js lib/
   ```

2. Подключить и управлять временем:

   ```html
   <script src="lib/motion.js"></script>
   <script>
     const controls = Motion.animate(
       "#title",
       { x: [-700, 0], opacity: [0, 1] },
       { type: "spring", bounce: 0.4, duration: 2, delay: 1.5 }
     );
     controls.pause();
     const seekMotion = (t) => { controls.time = t; };
     window.addEventListener("hf-seek", (e) => seekMotion(e.detail.time));
     seekMotion(0);
   </script>
   ```

- `controls.time` — секунды от начала ролика, поэтому старт сцены задаётся через `delay`.
- Анимируемый `<span>` должен быть `display: inline-block`.
- Нельзя анимировать одно и то же свойство элемента одновременно через Motion и GSAP.

## Whisper: таймкоды слов по озвучке

```bash
npx hyperframes@0.8.204 transcribe voice.mp3 --engine whisper --model medium --language ru
```

Пишет `transcript.json` со словами и их `start`/`end` в секундах.

- Для русского всегда указывать `--model medium --language ru`: модель по умолчанию `small.en` переводит речь на английский.
- Whisper иногда пишет слово иначе («златая» → «золотая»), поэтому слова сопоставляются с текстом стиха по порядку, а не по написанию.
- На GPU (Metal) whisper.cpp 1.9.5 падает, поэтому HyperFrames вызывает его через [whisper-cli-cpu.sh](whisper-cli-cpu.sh) с флагом `-ng`. Обёртку подключает переменная `HYPERFRAMES_WHISPER_PATH` в `.claude/settings.local.json`; в обычном терминале её нужно задать вручную. На CPU модель medium обрабатывает минуту речи примерно за 35 секунд.
