#!/bin/bash
# sheet.sh <prefix> <cols> — склеивает probe/<prefix>_N.png в probe/<prefix>_sheet.png (кадры 960×540)
cd "$(dirname "$0")/probe"
n=$(ls ${1}_[0-9]*.png | wc -l | tr -d ' ')
c=${2:-2}; r=$(( (n + c - 1) / c ))
ffmpeg -nostdin -loglevel error -y -start_number 0 -i "${1}_%d.png" -vf "scale=960:540,tile=${c}x${r}" -frames:v 1 "${1}_sheet.png" && echo "probe/${1}_sheet.png"
