Этот проект имеет цель заинтересовать и облегчить школьникам изучение стихов за счет визуализации.

Структура:

- .claude/skills - исходники скилов проекта для Claude и Codex
- .agents/skills - символическая ссылка на ../.claude/skills для обнаружения скилов в Codex
- texts\<Поэт>\<Стих> - информация по стихам
- programs - списки стихов: по классам школьной программы и other.md для остальных
- utils - утилитные вещи .
- channels - лежит информация для каналов.

Установленные утилиты (подробности и примеры — utils/README.md):

- HyperFrames CLI 0.8.204 (плагин Claude) — HTML → видео; Chrome для рендера в ~/.cache/hyperframes/chrome. Проверка:
  `npx hyperframes@0.8.204 doctor`.
- FFmpeg / FFprobe 9.0.2 — нужны HyperFrames для рендера; в Windows доступны через WinGet, в macOS — через Homebrew.
- Framer Motion — пакет motion 14.7.1 в utils/ (`cd utils && npm install`); бандл для роликов —
  utils/node_modules/motion/dist/motion.js.
- Whisper (Windows: whisper.cpp 1.9.4; macOS: 1.9.5, Homebrew) — таймкоды слов по озвучке:
  `npx hyperframes@0.8.204 transcribe <файл> --engine whisper --model medium --language ru`. Модель medium (
  многоязычная) в ~/.cache/hyperframes/whisper/models. В Windows HYPERFRAMES_WHISPER_PATH указывает на
  ~/.cache/hyperframes/whisper/win-bin-b5130/Release/whisper-cli.exe и сохранена в окружении пользователя и
  .claude/settings.local.json. В уже открытой сессии PowerShell подхватывай её через
  `$env:HYPERFRAMES_WHISPER_PATH = [Environment]::GetEnvironmentVariable('HYPERFRAMES_WHISPER_PATH', 'User')`.
  На macOS из-за падения Metal используется utils/whisper-cli-cpu.sh. Подробности — utils/README.md.

Правила:

- Ничего не устанавливай сам (программы, пакеты, модели, шрифты) без явного «поставь» или «установи». Если нужно
  установить спрашивай меня. Ответ «продолжи» после предложения установить согласием не считается.
- HyperFrames preview запускай только как `preview --background --no-open`, Studio открывай во встроенном браузере
  Claude, а если его нет в сессии — во внешнем браузере через chrome-devtools (MCP).
- Коммить сразу в `main`, новые ветки не создавай.
- Ролики (`*.mp4`) лежат в папке стиха рядом с обложкой, но в git не идут (`.gitignore`): GitHub не принимает файлы
  больше 100 МБ.
