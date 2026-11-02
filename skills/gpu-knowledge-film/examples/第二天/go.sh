#!/bin/bash
# 带超时跑 render.py：./go.sh <秒> <render.py 参数...>
T=$1; shift
python3 render.py "$@" &
PID=$!
for ((i=0;i<T;i++)); do kill -0 $PID 2>/dev/null || break; sleep 1; done
kill $PID 2>/dev/null; wait $PID 2>/dev/null
