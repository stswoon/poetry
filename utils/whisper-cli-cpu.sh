#!/bin/sh
# Homebrew whisper.cpp 1.9.5 падает на Metal (GPU) на этом Mac:
#   "pre-allocated tensor (leaf_0) in a buffer (MTL0) that cannot run the operation"
# поэтому HyperFrames запускает whisper через эту обёртку на CPU (-ng).
# Подключается переменной HYPERFRAMES_WHISPER_PATH (см. .claude/settings.local.json).
exec /opt/homebrew/bin/whisper-cli -ng "$@"
