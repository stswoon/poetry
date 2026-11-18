#!/bin/bash
# shot.sh <page.html> <out.png> [w] [h] — скриншот страницы пробы headless Chrome
CH="$HOME/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell"
"$CH" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=${3:-1920},${4:-1080} --virtual-time-budget=3000 --screenshot="$2" "file://$1" 2>/dev/null
