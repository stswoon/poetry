#!/bin/bash
# snap.sh <times> [out-prefix] — снимок кадров, копирует PNG в probe/
cd "$(dirname "$0")"
npx hyperframes@0.8.204 snapshot --at "$1" >/dev/null 2>&1
d=$(ls -td .hyperframes/artifacts/snapshots/*/ | head -1)
p=${2:-snap}
i=0
for f in "$d"frame-*.png; do cp "$f" "probe/${p}_$i.png"; echo "probe/${p}_$i.png"; i=$((i+1)); done
