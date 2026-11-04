# Приключенческое аниме — v2

Самостоятельный проект HyperFrames 0.8.204 для второй версии ролика. Исходники первой версии находятся уровнем выше. Готовые версии MP4 лежат в папке стиха, старая версия не перезаписывается.

- `build.py` читает `../../poem.md`, `../../timings.json`, готовую озвучку и `../../music/anime-v2/music.wav`.
- `assets/art/` — оригинальные изображения из встроенного image_gen; полный набор промптов и происхождение в `prompts.json`.
- `assets/anime-motion.js` — детерминированные таймлайны GSAP с пружиной Framer Motion.
- `assets/style.css` — оформление и безопасная область титров.
- `compositions/` и `index.html` — результат сборки, ручные правки будут заменены следующей сборкой.
- `SPEC.md` — сценарий. `REVIEW.md` — результаты проверки.

Из этой папки, используя уже установленный Python:

```powershell
python build.py
npx hyperframes@0.8.204 check --json
npx hyperframes@0.8.204 preview --background --no-open
npx hyperframes@0.8.204 render --quality delivery --fps 30 --workers 2 --output renders/final-raw.mp4
python master.py --input renders/final-raw.mp4 --output '../../Сказка о царе Салтане (отрывок) - Пушкин - v2.mp4'
npx hyperframes@0.8.204 preview --stop
```

Ничего устанавливать для повторного рендера не требуется. В этой сессии использован Python из `C:/Users/stswoon/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. Из-за отдельного npm-кеша песочницы CLI запускался напрямую из уже установленного npm-кеша версии 0.8.204, без загрузки пакетов.
