#!/bin/bash
# 把一条片子的工程同步进技能：./sync-from-project.sh <片子工程目录> <示例名>
set -e
P="$1"; NAME="$2"; SK="$(cd "$(dirname "$0")" && pwd)"
cp "$P"/render.py "$P"/go.sh "$P"/sheet.py "$P"/pages.py "$P"/strips.py "$P"/index.html "$P"/assemble.py "$SK/engine/"
for f in core post text main; do cp "$P/src/$f.js" "$SK/engine/src/"; done
for f in lake flip figure boat tulip phone; do [ -f "$P/src/$f.js" ] && cp "$P/src/$f.js" "$SK/engine/props/"; done
mkdir -p "$SK/examples/$NAME"; rsync -a --delete --exclude out --exclude audio --exclude fonts --exclude vendor "$P/" "$SK/examples/$NAME/"
