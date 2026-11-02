#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把《脑内擂台》在小节线上延长两次：39.0 秒处回跳 8 小节，101.8 秒处回跳 8 小节。接缝按波形互相关对齐。"""
import os, subprocess, numpy as np
SRC = os.path.expanduser('<配乐目录>/曲子.m4a')
SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
print('原长', len(x) / SR)
mono = x.mean(1)
def refine(a0, b0, win=.35, rng=.05):
    """a0≈b0 是同一音乐位置（a0 早、b0 晚）。在 b0 附近找和 a0 最像的采样点。"""
    a = int(a0 * SR); w = int(win * SR); r = int(rng * SR)
    ref = mono[a - w:a + w]; best = (-2, 0)
    for d in range(-r, r + 1, 4):
        b = int(b0 * SR) + d; seg = mono[b - w:b + w]
        c = float(np.dot(ref, seg) / (np.linalg.norm(ref) * np.linalg.norm(seg) + 1e-9))
        if c > best[0]: best = (c, d)
    b = int(b0 * SR) + best[1]
    return a, b, best[0]
P = [(22.77, 38.97), (85.55, 101.75)]
parts = []; pos = 0; fade = int(.03 * SR); seams = []
for a0, b0 in P:
    a, b, c = refine(a0, b0); print(f'接缝 {b/SR:.3f}→{a/SR:.3f}  相关 {c:.3f}  回跳 {(b-a)/SR:.3f}s')
    parts.append(x[pos:b]); pos = a; seams.append((sum(len(p) for p in parts) / SR, a / SR))
parts.append(x[pos:])
out = parts[0]
for p in parts[1:]:
    k = np.linspace(0, 1, fade)[:, None]
    # 等功率交叉淡化
    tail = p[:fade] * np.sin(k * np.pi / 2) ; head = out[-fade:] * np.cos(k * np.pi / 2)
    # 接缝前的音乐继续多读 fade 长度更自然，这里直接在接缝处重叠
    out = np.vstack([out[:-fade], head + tail, p[fade:]])
print('新长', len(out) / SR, '接缝(新时间线)', [round(s, 3) for s, _ in seams])
import wave
pk = np.abs(out).max(); print('峰值', pk)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2').tobytes()
with wave.open('audio/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
