#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-$ROOT/out/film.mp4}"
TITLE="《满仓》｜涨一半跌一半，为什么你亏了？"
DEST="<交付目录>"
mkdir -p "$DEST"
ffmpeg -v error -y -i "$SRC" -i "$ROOT/audio/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$DEST/$TITLE.mp4"
python3 - "$ROOT" "$DEST" "$TITLE" <<'PY'
import sys
from PIL import Image
root,dest,title=sys.argv[1:4]
Image.open(f"{root}/out/cover_a_1440x1920.png").convert("RGB").resize((1080,1440),Image.LANCZOS).save(f"{dest}/封面3x4｜{title}.png")
Image.open(f"{root}/out/cover_c_1440x1920.png").convert("RGB").resize((1080,1440),Image.LANCZOS).save(f"{dest}/封面3x4-备选｜{title}.png")
Image.open(f"{root}/out/cover_b_1920x1080.png").convert("RGB").save(f"{dest}/封面16x9｜{title}.png")
PY
cp "$ROOT/发布文案.md" "$DEST/发布文案｜满仓小白版.md"
ls -la "$DEST" | grep -E "满仓"
