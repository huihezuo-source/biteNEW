#!/bin/bash
# 把四个技能链接到 ~/.claude/skills，下载两个中文字体，检查依赖。缺的依赖只提示，不替你装。
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$DEST"

# 网页上传的文件没有执行权限，这里补上
find "$ROOT/skills" -name '*.sh' -exec chmod +x {} +

for s in stock-film-copy bitxinyu-film-craft film-bgm gpu-knowledge-film; do
  if [ -e "$DEST/$s" ] && [ ! -L "$DEST/$s" ]; then
    echo "跳过 $s：$DEST/$s 已经存在，而且不是链接。先挪走再重跑。"
    continue
  fi
  ln -sfn "$ROOT/skills/$s" "$DEST/$s"
  echo "已链接 $s"
done

F="$ROOT/skills/gpu-knowledge-film/engine/fonts"
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl
fetch() {
  [ -s "$F/$1" ] && { echo "字体已有 $1"; return; }
  echo "下载 $1"
  curl -fL --retry 3 -o "$F/$1.part" "$2"
  mv "$F/$1.part" "$F/$1"
}
fetch NotoSerifSC-VF.ttf "$BASE/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
fetch NotoSansSC-VF.ttf "$BASE/notosanssc/NotoSansSC%5Bwght%5D.ttf"

missing=0
for c in ffmpeg ffprobe python3; do
  command -v "$c" >/dev/null || { echo "缺 $c"; missing=1; }
done
for m in playwright numpy scipy PIL librosa; do
  python3 -c "import $m" 2>/dev/null || { echo "缺 Python 包 $m"; missing=1; }
done
python3 - <<'PY' || { echo "缺 Playwright 的 Chromium"; missing=1; }
# 和 engine/render.py 找浏览器的办法一致
import asyncio, glob, os
from playwright.async_api import async_playwright
hits = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/*")))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, executable_path=(hits or [None])[-1])
        await b.close()
asyncio.run(main())
PY

if [ "$missing" = 1 ]; then
  echo
  echo "补齐依赖："
  echo "  ffmpeg：Mac 用 brew install ffmpeg，其它系统看 ffmpeg.org"
  echo "  pip3 install playwright numpy scipy pillow librosa"
  echo "  python3 -m playwright install chromium"
  exit 1
fi
echo "安装完成。"
