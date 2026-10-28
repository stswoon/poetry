# «Бородино»: аниме-чиби ролик

> **Перенесено из `D:\mycode\ролики\бородино` (28.10.2026).** Здесь лежат тексты, озвучка `ElevenLabs_…Nester Surovy…_sp97_s30_sb76_v4.mp3` и финал **`borodino_anime_v2.mp4`** (4:02, 1920×1080, 30 fps). Проекта `video/`, папки `02_po_strofam/` и файла без ударений в исходной папке уже не было, поэтому ниже они описаны, но отсутствуют. Ролики `borodino_anime.mp4` и `borodino_anime_bez_golosa.mp4` остались в старой папке.
>
> **Права:** ✅ Лермонтов умер в 1841 году, текст в общественном достоянии (проверка 28.10.2026). **Стиль:** №9 «Аниме-чиби» в [possible-styles.md](../../../possible-styles.md).

| Файл | Что внутри |
|---|---|
| `01_tekst_stiha.md` | Текст стиха (Викитека, ПСС 1989, с «ё») |
| `02_elevenlabs_v4_ves_tekst.txt` | Весь текст с аудиотегами v4 и ударениями, можно вставлять в ElevenLabs |
| `02_elevenlabs_v4_ves_tekst_bez_udareniy.txt` | То же без знаков ударения |
| `02_po_strofam/s01…s14.txt` | По строфе на генерацию (рекомендуемый способ) |
| `03_ozvuchka_i_golos.md` | Голос, настройки v4, как сдать звук |
| `04_scenariy.md` | Сценарий по сценам |
| `05_stili.md` | 5 вариантов стиля (выбран аниме-чиби) |
| `borodino_anime_bez_golosa.mp4` | Готовый ролик 1920×1080, 30 fps, пока без звука |
| `video/` | Проект HyperFrames: исходники ролика |

## Как вставить голос

1. Сгенерируйте озвучку в ElevenLabs v4 и положите файлы в `video/assets/voice/`:
   - `s01.mp3 … s14.mp3` (по строфе), **или**
   - `full.mp3` (всё одним файлом, между строфами `[long pause]`).
2. Выполните:
   ```bash
   cd video
   npm run voice      # найдёт паузы между строками, подгонит сцены и субтитры под голос
   npx hyperframes render -o ../borodino_anime.mp4
   ```
   Музыку можно добавить файлом `video/assets/music.mp3`: она встанет фоном на громкости 0.14 с fade-in и fade-out.

Если пауз в записи мало и строки делятся неточно, порог тишины можно поменять: `NOISE=-30dB npm run voice`.

## Как устроен проект

- `video/src/scenes/s00…s15.mjs`: сцены (SVG и хореография GSAP). s00 — титр, s01–s14 — строфы, s15 — финал.
- `video/src/lib/rig.mjs`: чиби-персонажи (ветеран, юноша, полковник, солдаты, французы, конница, пушка). Каждая часть тела — отдельная группа со своей точкой вращения.
- `video/src/lib/scenery.mjs`: фоны и аниме-эффекты (speed lines, облачка, искры, «облако драки»).
- `video/assets/lib/bh.js`: риг на рантайме. Выражения лица, «take» при смене эмоции, разговор, моргание, дыхание. Пружины берутся из **Motion** (движок Framer Motion): `Motion.spring` превращён в функцию easing для GSAP, поэтому каждый кадр детерминирован и рендерится сам по себе.
- `video/src/build.mjs`: собирает `index.html` и `compositions/*.html` из сцен и таймингов.
- `video/src/align.mjs`: измеряет паузы в озвучке (ffmpeg silencedetect) и пишет `src/timing.json`.
- Рендер: **HyperFrames** (headless Chrome + FFmpeg), `npx hyperframes render`.
