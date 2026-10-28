# «Гой ты, Русь, моя родная…» — Сергей Есенин

## Статус (28.10.2026): ГОТОВО

| Шаг | Статус | Файлы |
|---|---|---|
| 1. Текст | ✅ готово | `01_tekst.md` (Викитека + ФЭБ, ПСС 1995; 5 строф, 20 строк, ≈1:15 ролика) |
| 2. Права | ✅ можно | `02_prava.md` (Есенин †1925, перевода нет) |
| 3. ElevenLabs и голос | ✅ готово | `03_elevenlabs/ves_tekst.txt`, `ves_tekst_bez_udareniy.txt`, `po_strofam/s00–s05.txt`, `04_golos.md` (⭐ Stanislav) |
| 4. Стили | ✅ выбран №5 «Вышивка на рушнике», через HyperFrames + vizavi-motion | `05_stili.md` |
| 5. Сценарий | ✅ ОК | `06_scenariy.md` |
| 6. Голос | ✅ принят | исходник `ElevenLabs_…Stanislav…_sp81_s100_sb100_v4.mp3` (в этой папке) → `video/assets/voice/voice.mp3`; 47,2 с; все 20 строк; `video/timing.json` (`python -I tools/align.py`) |
| 7. Сборка | ✅ v2 после ревью | **`goy-ty-rus_1080p60_v2.mp4`** — 62,7 с, 1080p60, −13,5 LUFS; v1 (`goy-ty-rus_1080p60.mp4`), проба и черновые рендеры остались в `D:\mycode\ролики\goy-ty-rus`; замечания и правки в `video/REVIEW.md` |
| 8. Сдача | ✅ готово | `07_publikaciya.md`, `oblozhka.png` (1280×720) |

## Ждём от пользователя

1. Тариф ElevenLabs (нужен платный для монетизации).
2. Оценка на слух: гусли, шумы, ударения в озвучке.

## Ответы пользователя (чтобы не спрашивать снова)

- Стиль: №5 «Вышивка на рушнике» (сначала выбрал №4, потом передумал). HyperFrames: да.
- Тариф ElevenLabs: ?
- Голос: Stanislav, фактические настройки sp81 s100 sb100 (Eleven v4).
- Музыка: синтезирую кодом («гусли кодом», Karplus–Strong), шумы тоже кодом.

## Как устроен проект (`video/`)

- `tools/poem.txt` — текст стиха для экрана (с «ё»).
- `tools/align.py` — голос → `timing.json` (слова whisper + паузы по энергии; между строфами добавлена тишина, голос режется по паузам).
- `tools/music.py` — «гусли кодом» (Karplus–Strong, своя мелодия, ре миксолидийский) и шумы → `assets/music.wav`, `assets/sfx/`.
- `src/engine.js` — движок вышивки на Canvas (крестики-спрайты, лён, камера, игла, смаз, крен рушника).
- `src/scenes.js` — ядро сцен: кайма, заглавие, строфа 1, «персонажи», нить-тропинка.
- `src/hero.js`, `src/s2.js` … `src/s5.js` — странник, строфы 2–5 и финал.
- `tools/build.py` — собирает `compositions/rushnik.html` и `index.html` (`--probe` — только титр и строфа 1).

Пересборка под новый голос:
```bash
cd video
python -I tools/align.py && python -I tools/music.py && python -I tools/build.py
npx hyperframes check
npx hyperframes render --quality delivery --fps 60 --output renders/goy-ty-rus_1080p60.mp4
```
(`npx hyperframes` в этой установке = `node "C:/Users/stswoon/.claude/plugins/cache/hyperframes/hyperframes/0.8.204/skills/hyperframes/scripts/plugin-cli.mjs"`.)
