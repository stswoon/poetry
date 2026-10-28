Этот проект имеет цель заинтересовать и облегчить школьникам изучение стихов за счет визуализации.
  
Структура:
- .claude - скилы для claude
- texts\<Поэт>\<Стих> - информация по стихам
- programs - списки стихов: по классам школьной программы и other.md для остальных
- utils - утилитные вещи .
- channels - лежит информация для каналов.

Установленные утилиты (подробности и примеры — utils/README.md):
- HyperFrames CLI 0.8.204 (плагин Claude) — HTML → видео; Chrome для рендера в ~/.cache/hyperframes/chrome. Проверка: `npx hyperframes@0.8.204 doctor`.
- FFmpeg / FFprobe 9.0.2 (Homebrew) — нужны HyperFrames для рендера.
- Framer Motion — пакет motion 14.7.1 в utils/ (`cd utils && npm install`); бандл для роликов — utils/node_modules/motion/dist/motion.js.
- Whisper (whisper.cpp 1.9.5, Homebrew) — таймкоды слов по озвучке: `npx hyperframes@0.8.204 transcribe <файл> --engine whisper --model medium --language ru`. Модель medium (многоязычная) в ~/.cache/hyperframes/whisper/models. На GPU (Metal) падает, поэтому HyperFrames вызывает его через utils/whisper-cli-cpu.sh (переменная HYPERFRAMES_WHISPER_PATH в .claude/settings.local.json).