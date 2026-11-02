#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""配乐工具。
  python3 music_tools.py brief 参考曲.wav [--out brief.md]   量参考曲：速度、调、能量曲线、重音、段落，写成新曲简报
  python3 music_tools.py check 参考曲.wav 新曲.wav [--hits 17.07,93.87]   查旋律撞没撞，查重音对不对
只量可以学的东西，不提取旋律。"""
import sys, argparse
import warnings
import numpy as np
import librosa

warnings.filterwarnings("ignore")

SR = 22050
NOTES = "C C# D D# E F F# G G# A A# B".split()
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def load(p):
    y, _ = librosa.load(p, sr=SR, mono=True)
    return y


def key_of(y):
    c = librosa.feature.chroma_cqt(y=y, sr=SR).mean(axis=1)
    best = max(((np.corrcoef(np.roll(MAJ, i), c)[0, 1], NOTES[i] + " 大调") for i in range(12)))
    bm = max(((np.corrcoef(np.roll(MIN, i), c)[0, 1], NOTES[i] + " 小调") for i in range(12)))
    return max(best, bm)[1]


def energy(y, hop=512):
    return librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0], hop / SR


def hits_of(y, top=8):
    e, dt = energy(y)
    db = librosa.amplitude_to_db(e + 1e-6)
    w = int(.1 / dt)
    sm = np.convolve(db, np.ones(w) / w, "same")
    pre = int(.6 / dt)
    rise = np.array([sm[i + w] - sm[max(0, i - pre):i].mean() if i > pre else 0 for i in range(len(sm) - w)])
    out, used = [], np.zeros(len(rise), bool)
    for i in np.argsort(-rise):
        if rise[i] < 3 or len(out) >= top:
            break
        if used[max(0, i - int(4 / dt)):i + int(4 / dt)].any():
            continue
        used[i] = True
        out.append((round(i * dt, 2), round(float(rise[i]), 1)))
    return sorted(out)


def sections(y, k=7):
    mf = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=13, hop_length=2048)
    ch = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=2048)
    n = min(mf.shape[1], ch.shape[1])
    b = librosa.segment.agglomerative(np.vstack([librosa.util.normalize(mf[:, :n], axis=1), ch[:, :n]]), k)
    return librosa.frames_to_time(b, sr=SR, hop_length=2048)


def brief(a):
    y = load(a.ref)
    dur = len(y) / SR
    tempo = float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=SR)[0])[0])
    key = key_of(y)
    e, dt = energy(y)
    db = librosa.amplitude_to_db(e + 1e-6, ref=np.max)
    bins = np.array_split(db, 16)
    bar = "▁▂▃▄▅▆▇█"
    v = np.array([b.mean() for b in bins])
    v = (v - v.min()) / (v.max() - v.min() + 1e-6)
    curve = "".join(bar[int(x * 7)] for x in v)
    hits = hits_of(y)
    sec = sections(y)
    cent = librosa.feature.spectral_centroid(y=y, sr=SR)[0].mean()
    L = [f"# 新曲简报：{a.ref.split('/')[-1]}", "",
         f"- 时长 {dur:.1f} 秒，约 {tempo:.1f} BPM（三连音可能被算成别的值，以耳朵为准），{key}",
         f"- 能量曲线（16 段）：{curve}", f"- 频谱重心 {cent:.0f} Hz（越低越暗）",
         "- 重音（能量突然上冲，秒 / 上冲 dB）：" + "，".join(f"{t} / +{d}" for t, d in hits), "", "## 段落", ""]
    for i in range(len(sec)):
        s = sec[i]
        t = sec[i + 1] if i + 1 < len(sec) else dur
        seg = db[int(s / dt):int(t / dt)]
        L.append(f"- {s:6.1f}–{t:6.1f} 秒，平均 {seg.mean():.1f} dB")
    L += ["", "以上都是可以学的东西。不要把参考曲上传给 AI，不要写曲名和作者。旋律、和声走向的具体写法由新曲重新来。", ""]
    txt = "\n".join(L)
    if a.out:
        open(a.out, "w", encoding="utf8").write(txt)
    print(txt)


def cover_score(x, y):
    """翻奏检测（Serrà 的 QMax 思路）：换乐器、改速度都能认出旋律与和声。1 = 完全相同。"""
    hop = 4096
    cx = librosa.feature.chroma_cens(y=x, sr=SR, hop_length=hop)
    cy = librosa.feature.chroma_cens(y=y, sr=SR, hop_length=hop)
    best = 0.0
    for sh in range(12):  # 换调也要查
        c = np.roll(cy, sh, axis=0)
        X = librosa.feature.stack_memory(cx, n_steps=6, delay=2)
        Y = librosa.feature.stack_memory(c, n_steps=6, delay=2)
        xs = librosa.segment.cross_similarity(Y, X, mode="affinity", metric="cosine", k=max(4, int(.08 * X.shape[1])))
        L = librosa.sequence.rqa(xs, backtrack=False, knight_moves=True)
        best = max(best, float(L.max()))
    return best / min(cx.shape[1], cy.shape[1])


def check(a):
    x, y = load(a.ref), load(a.new)
    s = cover_score(x, y)
    base = cover_score(y, y)
    print(f"旋律与和声相似度 {s:.3f}（自身 {base:.3f}）")
    print("低于 0.20：没撞。0.20–0.35：人耳细听。高于 0.35：基本是同一首，换一版。")
    print("这个分数看整首，查不出四小节以内的撞车，生成后还要人耳听。")
    if a.hits:
        want = [float(t) for t in a.hits.split(",")]
        got = [t for t, _ in hits_of(y, 12)]
        for t in want:
            d = min(got, key=lambda g: abs(g - t)) if got else None
            print(f"要 {t:.2f} 秒有重音 → 最近的在 {d} 秒，差 {abs(d - t):.2f} 秒" if d is not None else "没测到重音")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    b = sp.add_parser("brief"); b.add_argument("ref"); b.add_argument("--out")
    c = sp.add_parser("check"); c.add_argument("ref"); c.add_argument("new"); c.add_argument("--hits")
    a = ap.parse_args()
    {"brief": brief, "check": check}[a.cmd](a)
