# upload-helper-disk — инструкция для агентов

Инструмент загружает бекапы видео на Яндекс Диск в `/poetry`.
Полное описание — [README.md](README.md). Здесь только то, что нужно агенту.

## Команды

```powershell
cd D:\mycode\poetry\utils\upload-helper-disk
node run.js token                         # проверить токен
node run.js info                          # место на Диске и папка
node run.js list --remote "/poetry" --recursive

# один стих: texts/<Поэт>/<Стих>/*.mp4 → /poetry/<Поэт>/<Стих>/*.mp4
node run.js upload --poem "<Поэт>/<Стих>" --dry-run
node run.js upload --poem "<Поэт>/<Стих>"

# все стихи
node run.js upload --source "D:\mycode\poetry\texts" --dry-run
node run.js upload --source "D:\mycode\poetry\texts"
```

Токен: `YANDEX_DISK_TOKEN` в корневом `.env` (вписывает пользователь, образец —
`.env.example`) или в переменной окружения. Флагов `--token` и `token --set` нет.

Для `/poetry` нужен токен на весь Диск (`cloud_api:disk.read`,
`cloud_api:disk.write`, `cloud_api:disk.info`). Токен только на папку приложения
(`app:/...`) этот путь не видит и даёт 403.

## Путь на Диске

Внутри `texts` структура всегда `<Поэт>/<Стих>/<файл>`:

```
/poetry + /<Поэт>/<Стих>/<файл>.mp4

texts\Пушкин\У лукоморья\lukomorye_eleven.mp4
  → /poetry/Пушкин/У лукоморья/lukomorye_eleven.mp4
```

Папки поэта и стиха создаются автоматически. Работает и для всего `texts`,
и для отдельной папки стиха, и для отдельного файла: утилита находит в пути
папку `texts` и берёт всё после неё.

По умолчанию грузятся только `*.mp4`. Остальные файлы (`voice.mp3`, `cover.png`,
проект HyperFrames) пропускаются.

## Как понять результат

- stdout заканчивается строкой `RESULT_JSON: {...}` — машинный итог.
- Подробности: `logs/<run>/state.json` (`totals`, `results[]`, `warnings`, `error`).
- `results[].status`: `uploaded`, `overwritten`, `skipped`, `conflict`, `failed`
  (в `--dry-run` — `would-upload`, `would-overwrite`, `would-skip`).
- `ok: false` при конфликте или ошибке; код выхода `1`.
- `results[].md5Verified: false` — сверен только размер (`--no-verify` или Диск ещё не посчитал md5).

## Правила

- Сначала `--dry-run`, потом реальная загрузка.
- Не просить токен в чат, не подставлять его в команды и не печатать.
- Флаги-переключатели не забирают следующее слово; значение — только через `=`.
- При обрыве соединения утилита сама повторяет загрузку; загрузки кусками нет.
- Конфликт (`conflict`) решает пользователь: `--overwrite` или другое имя/папка.
- Не запускать два upload одновременно в одну папку.
- Не удалять и не перезаписывать чужие файлы на Диске без явного согласия.
