# Утилиты для роликов

## Что установлено

- **HyperFrames** (CLI 0.8.204, из плагина Claude) — HTML → видео. Запускается через `npx hyperframes@0.8.204 <команда>`; Chrome для рендера лежит в `~/.cache/hyperframes/chrome`.
- **FFmpeg / FFprobe 9.0.2** — нужны HyperFrames для рендера. В Windows доступны через WinGet, в macOS — через Homebrew.
- **Framer Motion** — пакет `motion` (новое имя framer-motion, сам `framer-motion` ставится как его зависимость). Установка: `cd utils && npm install`.
- **NumPy 2.0.2** — синтез музыки к роликам: векторные операции над сэмплами считают трек в разы быстрее, чем чистый
  Node или Python. В macOS стоит в системном Python 3.9 (`python3 -m pip install --user numpy`), в Windows — `py -m pip
  install numpy`. Проверка: `python3 -c "import numpy; print(numpy.__version__)"`.
- **Whisper** — в Windows установлен whisper.cpp 1.9.4, в macOS использовался Homebrew 1.9.5. Модель `medium` лежит в `~/.cache/hyperframes/whisper/models`. Нужен, чтобы получить таймкоды слов из озвучки.

Проверка окружения: `npx hyperframes@0.8.204 doctor`.

## lan-share — посмотреть ролик по локальной сети

`utils/lan-share/serve.py` раздаёт ролик (старшую версию `vN` или `video.mp4`), `cover.png` и `voice.mp3` из папки стиха: страница
с плеером открывается с телефона или другого компьютера в той же сети. Остальные файлы проекта
недоступны, установка не нужна. Адрес печатается строкой `LAN_URL:`.

```bash
python3 utils/lan-share/serve.py "texts/Пушкин/Зимний вечер"
```

Если ссылка не открывается с другого устройства, проверь брандмауэр macOS: он должен пропускать
входящие подключения для Python.

## upload-helper — публикация роликов

`utils/upload-helper` — загрузка готового ролика на VK Видео и RUTUBE через настоящий Chrome
(Playwright). Логин хранится в отдельном профиле `.profile/` и переживает перезапуск.

```bash
cd utils/upload-helper
node run.js login      # один раз: залогиниться в оба кабинета
node run.js upload --job "D:\...\job.json"
```

Скрипт сам заполняет название, описание, обложку, категорию «Культура», доступ «по ссылке»,
плейлисты `класс-N` и нажимает «Опубликовать» — только если прочитал в поле «Доступ»
значение «по ссылке». Иначе ролик остаётся неопубликованным и запуск завершается с `ok: false`.
Подробности и формат job.json — в [upload-helper/README.md](upload-helper/README.md).

## upload-helper-disk — бекапы видео на Яндекс Диск

`utils/upload-helper-disk` — загрузка роликов в `/poetry` на Яндекс Диске через
REST API и OAuth-токен, без браузера и npm-зависимостей. Повторный запуск пропускает
файлы с совпадающим размером и md5.

```powershell
cd utils/upload-helper-disk
node run.js token                             # проверить YANDEX_DISK_TOKEN из .env
node run.js info                              # проверить токен и место
node run.js upload --poem "Пушкин/У лукоморья" --dry-run
node run.js upload --poem "Пушкин/У лукоморья"
node run.js upload --source "D:\mycode\poetry\texts"
```

Грузятся только видео (`mp4`). Структура папок строится автоматически:
`texts\Пушкин\У лукоморья\lukomorye_eleven.mp4` →
`/poetry/Пушкин/У лукоморья/lukomorye_eleven.mp4`.
Токен на весь Диск лежит в корневом `.env` (ключ `YANDEX_DISK_TOKEN`, в git не идёт);
вписывается вручную, через командную строку не передаётся. Подробности — в
[upload-helper-disk/README.md](upload-helper-disk/README.md).

## generate-elevenlabs-voice — голос для стиха

`utils/generate-elevenlabs-voice` — озвучка через ElevenLabs API (модель Eleven v4).
Читает `texts\<Поэт>\<Стих>\elevenlabs.txt`, берёт текст после разделителя
«ТЕКСТ ДЛЯ ОЗВУЧКИ» и кладёт `voice.mp3` рядом. Без npm-зависимостей; `ffmpeg` нужен
только для длинного текста, который режется на куски.

```powershell
cd utils/generate-elevenlabs-voice
node run.js key                                     # проверить ELEVENLABS_API_KEY из .env
node run.js generate --poem "Пушкин/Зимний вечер" --dry-run
node run.js generate --poem "Пушкин/Зимний вечер"
```

ID голоса берётся из `--voice-id`, `voice.json` или блока «Голос» в `elevenlabs.txt`.
Ключ хранится в корневом `.env` (ключ `ELEVENLABS_API_KEY`, в git не идёт); вписывается
вручную, через командную строку не передаётся. Подробности — в
[generate-elevenlabs-voice/README.md](generate-elevenlabs-voice/README.md).

## lib — общий код хелперов

`utils/lib/` — то, что раньше было скопировано в каждый хелпер. Хелперы импортируют
его относительным путём (`../lib/...` из `run.js`, `../../lib/...` из `<хелпер>/lib/`).
Зависимостей нет.

| Файл | Что внутри |
|---|---|
| `args.js` | `parseArgs` (флаги-переключатели не забирают следующее слово), строгий `bool`, `option`, `list`, `number`, `last`, `UsageError` |
| `env.js` | чтение корневого `.env`, `resolveSecret` (env → `.env`), `maskSecret` |
| `files.js` | `REPO_ROOT`, `helperRoot`, `resolvePath`, `readText` / `readJson` без BOM |
| `http.js` | `requestWithRetry` (повторы при 429/5xx и сетевых ошибках, `Retry-After`, списки в query), `ApiError` |
| `state.js` | `Run` — `logs/<run>/state.json`, шаги, предупреждения, скриншоты; `runDir`, `slug` |
| `format.js` | `formatBytes`, `sleep` |

Секреты (`.env`) никогда не передаются через аргументы командной строки.

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
- **Windows:** HyperFrames вызывает нативный `whisper-cli.exe` через переменную `HYPERFRAMES_WHISPER_PATH`. Путь сохранён в окружении пользователя Windows и в локальном `.claude/settings.local.json` (не коммитится). Бинарник находится в `~/.cache/hyperframes/whisper/win-bin-b5130/Release/whisper-cli.exe`; переустановка модели не нужна.
- После изменения окружения пользователя нужно заново открыть терминал или приложение, из которого запускается HyperFrames. В уже открытом PowerShell можно подхватить сохранённый путь без перезапуска:

  ```powershell
  $env:HYPERFRAMES_WHISPER_PATH = [Environment]::GetEnvironmentVariable('HYPERFRAMES_WHISPER_PATH', 'User')
  npx hyperframes@0.8.204 doctor
  ```

- **macOS:** на GPU (Metal) whisper.cpp 1.9.5 падает, поэтому используется [whisper-cli-cpu.sh](whisper-cli-cpu.sh) с флагом `-ng`. На Mac переменная `HYPERFRAMES_WHISPER_PATH` должна указывать на эту обёртку. На CPU модель medium обрабатывает минуту речи примерно за 35 секунд.
