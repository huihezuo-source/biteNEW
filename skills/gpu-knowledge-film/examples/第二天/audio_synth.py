#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《分母》声音：配乐 + 代码合成音效。全部对齐画面事件。输出 audio/mix.wav（-14 LUFS）。"""
import sys, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000; ROOT = Path(__file__).parent
rs = np.random.RandomState(20261031)
def lp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'low', output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x, axis=0)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a / (SR / 2), b / (SR / 2)], 'band', output='sos'), x, axis=0)
def T(d): return np.arange(int(d * SR)) / SR
def noise(d): return rs.randn(int(d * SR))
def fade(x, a=.002, b=.01):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] = np.linspace(1, 0, nb)
    return x * e
def sweep(f0, f1, d, curve=1.):
    t = T(d); f = f0 * (f1 / f0) ** ((t / d) ** curve); return np.sin(2 * np.pi * np.cumsum(f) / SR)

def impact(d=3.2, f0=74, f1=30, sub=1., body=1., crack=.6):
    t = T(d); s = sweep(f0, f1, d, .35) * np.exp(-t * 1.5) * sub
    b = lp(noise(d), 420) * np.exp(-t * 7) * .9 * body
    c = bp(noise(d), 900, 7000) * np.exp(-t * 26) * crack
    return fade(s + b + c, .0005, .05)
def thud(d=.5, f=62, k=.8):
    t = T(d); return fade(sweep(f * 1.8, f, d, .25) * np.exp(-t * 11) + lp(noise(d), 260) * np.exp(-t * 26) * k, .0006, .02)
def buzz(d=.16):
    t = T(d); s = np.sign(np.sin(2 * np.pi * 172 * t)) * .5 + np.sin(2 * np.pi * 86 * t) * .7; s = lp(s, 620); e = np.minimum(1, t * 70) * np.exp(-np.maximum(0, t - .09) * 40); return fade(s * e)
def ding(f=1046.5):
    d = 1.2; t = T(d); return fade((np.sin(2 * np.pi * f * t) + .55 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 3) + .25 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 6)) * np.exp(-t * 3.4), .001, .05)
def clink(f=2300, d=.5, k=1.):
    t = T(d); s = 0
    for r, a, dk in [(1, 1, 7), (2.76, .7, 12), (5.40, .45, 20), (8.93, .3, 34)]: s = s + a * np.sin(2 * np.pi * f * r * t + rs.rand() * 6) * np.exp(-t * dk)
    return fade(s * k + hp(noise(d), 3000) * np.exp(-t * 90) * .4, .0003, .02)
def ping():
    d = .32; t = T(d); return fade(clink(1400 + rs.rand() * 900, d, .55) + bp(noise(d), 500, 3000) * np.exp(-t * 60) * .9 + thud(d, 110, .6) * .4)
def plink(f):
    d = .34; t = T(d); s = sweep(f * .72, f * 1.5, d, .4) * np.exp(-t * 15); return fade(s + np.sin(2 * np.pi * f * 2.2 * t) * np.exp(-t * 34) * .3, .0008, .02)
def click(k=1., f=1800):
    d = .05; t = T(d); return fade(hp(noise(d), f) * np.exp(-t * 180) * k, .0002, .004)
def slap():
    d = .2; t = T(d); return fade(bp(noise(d), 280, 3800) * np.exp(-t * 40) + thud(d, 90, .9) * .7, .0003, .01)
def stamp():
    d = .28; t = T(d); return fade(thud(d, 74, 1.1) + bp(noise(d), 900, 4000) * np.exp(-t * 70) * .5, .0003, .01)
def whoosh(d=1.2, a=300, b=3000, up=True):
    n = noise(d); t = T(d); k = (t / d); out = np.zeros_like(n); CH = 24
    for i in range(CH):
        i0, i1 = int(len(n) * i / CH), int(len(n) * (i + 1.2) / CH); f = a * (b / a) ** ((i + .5) / CH if up else 1 - (i + .5) / CH); seg_ = bp(n[i0:i1], max(30, f * .55), min(22000, f * 1.6)); w = np.hanning(len(seg_)); out[i0:i0 + len(seg_)] += seg_ * w
    return fade(out * np.sin(np.pi * k) ** 1.4, .01, .05)
def riser(d=3.):
    t = T(d); k = t / d; n = noise(d); out = np.zeros_like(n); CH = 40
    for i in range(CH):
        i0, i1 = int(len(n) * i / CH), int(len(n) * (i + 1.3) / CH); f = 200 * (9000 / 200) ** ((i + .5) / CH); seg_ = bp(n[i0:i1], f * .6, min(22000, f * 1.5)); w = np.hanning(len(seg_)); out[i0:i0 + len(seg_)] += seg_ * w
    tone = sweep(110, 880, d, 2.) * .22
    return fade((out + tone) * k ** 2.6, .05, .002)
def glass():
    d = .9; out = np.zeros(int(d * SR))
    for i in range(46):
        p = int(rs.rand() ** 2 * (d - .12) * SR); g = clink(2600 + rs.rand() * 6200, .1, .28 + rs.rand() * .5); out[p:p + len(g)] += g * (1 - p / len(out)) 
    return fade(out, .0002, .05)
def drain(d=1.1):
    t = T(d); return fade(whoosh(d, 2400, 180, True) * 1.4 + lp(noise(d), 300) * np.exp(-t * 2.2) * .5, .002, .06)
def reverb(x, dur=2.2, wet=.3):
    n = int(dur * SR); t = np.arange(n) / SR
    irL = rs.randn(n) * np.exp(-t * 4.2); irR = rs.randn(n) * np.exp(-t * 4.0)
    irL = lp(irL, 5200); irR = lp(irR, 5200)
    L = fftconvolve(x[:, 0], irL)[:len(x)]; R = fftconvolve(x[:, 1], irR)[:len(x)]
    y = np.stack([L, R], 1); y *= np.sqrt((x ** 2).mean() / max((y ** 2).mean(), 1e-12))
    return x + y * wet

sr, mus = wavfile.read(ROOT / 'track.wav'); mus = mus.astype(np.float32) / 32768.; N = len(mus)
dry = np.zeros((N + SR * 4, 2), np.float32); wetb = np.zeros_like(dry)
def add(t, x, g=1., pan=0., send=.5):
    i = int(t * SR); n = min(len(x), len(dry) - i)
    if n <= 0: return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dry[i:i + n, 0] += x[:n] * g * L * 1.41; dry[i:i + n, 1] += x[:n] * g * R * 1.41
    wetb[i:i + n, 0] += x[:n] * g * L * send; wetb[i:i + n, 1] += x[:n] * g * R * send
db = lambda v: 10 ** (v / 20)

# —— 开场：十次震动（第 1 条在 0 秒）——
add(.02, buzz(), db(-16), 0, .15)
for k in range(9): add(.46 + .5 * k, buzz(), db(-13), 0, .15); add(.46 + .5 * k + .1, clink(2800 + 60 * k, .2, .5), db(-30), .2, .4)
add(8.46, thud(.7, 58, .9), db(-12), 0, .5); add(8.46, ding(987.8), db(-21), 0, .6)
add(14.46, whoosh(5.5, 220, 1100, True), db(-30), 0, .6); add(17.0, thud(.8, 50, .6), db(-22), 0, .5)
add(20.0, whoosh(7.5, 140, 700, True), db(-31), -.1, .7)
# —— 点亮 ——
add(27.96, riser(6.), db(-29), 0, .8)
add(27.96, thud(1.2, 44, .5), db(-16), 0, .6)
add(33.96, whoosh(1.5, 500, 2600), db(-27), -.5, .7); add(36.96, whoosh(1.5, 500, 2600), db(-27), .5, .7)
add(37.5, riser(2.96), db(-20), 0, .5)
# —— 第一次爆发 ——
add(40.46, impact(4.4, 88, 26, 1.2, 1., .7), db(-5), 0, .6)
add(40.46, whoosh(2.2, 5000, 300, True), db(-22), 0, .8)
for k, tt in enumerate([41.4, 41.7, 42.0, 42.3]): add(tt, thud(.4, 80, .5), db(-26), 0, .5)
add(44.96, thud(.8, 52, .5), db(-20), 0, .5)
# —— 金沙 ——
sand = hp(noise(8.6), 2600) * (0.55 + .45 * np.sin(2 * np.pi * .25 * T(8.6) - 1.5)) ; add(47.6, fade(sand, .4, .6), db(-37), 0, .3)
for i, tt in enumerate([47.96, 49.96, 51.96, 53.96]):
    add(tt, impact(1.8, 96, 42, .9, .8, .55), db(-12), 0, .55); add(tt, clink(1100 + 130 * i, .9, 1.), db(-24), (-1) ** i * .2, .8); add(tt - .36, whoosh(.8, 900, 300, False), db(-24), 0, .5)
# —— 星空 ——
for i, tt in enumerate([55.96, 57.96, 59.96, 61.96, 63.96]): add(tt, thud(1.1, 46, .7), db(-11 - (4 - i) * .6), 0, .7); add(tt, whoosh(.8, 3400, 500, True), db(-24), 0, .6)
add(63.96, impact(3., 70, 30, 1., .6, .3), db(-10), 0, .7)
# —— 金币 ——
for i in range(12): add(66.98 + i * .11, clink(2600 + rs.rand() * 700, .34, 1.), db(-20), -.1, .4)
ts = np.cumsum(np.maximum(.012, .09 * np.exp(-np.arange(90) * .05))) + 69.46
for i, tt in enumerate(ts):
    if tt < 72.05: add(tt, clink(1800 + rs.rand() * 1800, .16, .7), db(-25 + i * .05), rs.rand() - .5, .3)
add(69.46, thud(1., 58, .7), db(-11), 0, .5); add(69.5, riser(2.5), db(-27), 0, .6); add(72.1, impact(2.2, 64, 30, .8, .5, .4), db(-14), 0, .7); add(72.1, clink(2200, .9, 1.), db(-17), 0, .9)
# —— 1943 ——
add(76.96, impact(2.6, 70, 34, 1., .7, .5), db(-10), 0, .7)
t_ = T(13.8); prop = lp(np.sign(np.sin(2 * np.pi * 37 * t_)) * .5 + np.sin(2 * np.pi * 74.3 * t_) * .5, 240) * (.7 + .3 * np.sin(2 * np.pi * 21 * t_)); add(76.6, fade(prop, 1.5, 1.), db(-35), 0, .2)
beat = [0, 1, 1.5, 2, 2.5, 2.75]; 
for b_ in beat:
    for j in range(6): add(79.46 + b_ + rs.rand() * .34, ping(), db(-24), (rs.rand() - .5) * 1.2, .4)
add(82.46, whoosh(.7, 400, 2200), db(-26), 0, .5)
add(85.46, impact(2.6, 84, 34, 1., .9, .9), db(-8), 0, .7); add(85.46, glass()[:30000] * .5, db(-22), 0, .7)
add(87.46, ding(659.3), db(-22), 0, .9); add(87.46, ding(987.8), db(-27), 0, .9)
# —— 入水 ——
add(90.46, impact(2.6, 60, 24, 1., 1.1, .1), db(-9), 0, .4)
rum = lp(np.cumsum(noise(9.)) * .004, 170); add(90.4, fade(rum / (np.abs(rum).max() + 1e-6), .3, 1.5), db(-20), 0, .1)
for i in range(70): add(90.6 + rs.rand() * 6.8, plink(240 + rs.rand() * 420), db(-38 + rs.rand() * 5), rs.rand() - .5, .4)
add(95.46, riser(.5), db(-26), 0, .4); add(95.96, impact(2.8, 66, 30, .9, .6, .35), db(-11), 0, .8)
# —— 手机里的筛子 ——
add(98.46, thud(.6, 56, .5), db(-22), 0, .4)
add(100.96, whoosh(1.2, 300, 1300), db(-27), 0, .7)
for i in range(38): add(103.6 + rs.rand() * 1.6, thud(.22, 96 + rs.rand() * 40, .4), db(-28), rs.rand() - .5, .4)
add(103.46, thud(.8, 50, .6), db(-15), 0, .5)
# —— 29 部手机 ——
add(109.0, whoosh(1.6, 240, 1000), db(-29), 0, .6)
for i in range(29): add(110.0 + (i * .618 % 1) * 1.5, stamp(), db(-21), (rs.rand() - .5) * 1.1, .35)
# —— 卡片 ——
for tt in [112.46, 113.21, 113.96, 114.71]: add(tt, slap(), db(-15), rs.rand() * .3 - .15, .4)
for i in range(44): add(116.1 + rs.rand() ** .7 * 1.5, click(.7, 1400 + rs.rand() * 2000), db(-27), rs.rand() - .5, .35)
add(118.2, sweep(220, 660, 2.26, 1.6) * np.sin(np.pi * np.linspace(0, .98, int(2.26 * SR))) ** 2, db(-30), 0, .6)
add(117.46, riser(3.), db(-13), 0, .5)
# —— 第二次爆发 ——
add(120.46, impact(5., 96, 24, 1.3, 1.1, .8), db(-4), 0, .6); add(120.46, whoosh(3., 6000, 240, True), db(-20), 0, .8)
add(123.96, impact(3.2, 78, 30, 1.1, .9, .6), db(-7), 0, .7)
add(127.6, whoosh(1.9, 240, 1600), db(-24), 0, .7)
g = hp(noise(5.6), 1800) * .6; add(128.8, fade(g, .4, .6), db(-33), 0, .4)
add(131.96, thud(.9, 50, .5), db(-16), 0, .6)
# —— 玻璃管 ——
fs = 523.25 * 2 ** (np.array([0, 2, 4, 7, 9, 12, 14, 16, 19, 21]) / 12)
for i, f in enumerate(fs): add(134.96 + i * .5 + .27, plink(f), db(-22), .1, .7)
add(141.46, glass(), db(-12), 0, .7); add(141.46, impact(2.2, 70, 30, .9, .8, .5), db(-10), 0, .6); add(141.5, drain(.95), db(-17), 0, .5)
# —— 回到手机 ——
add(142.46, thud(.6, 54, .4), db(-23), 0, .4)
for i in range(6): add(145.3 + i * .26, click(1., 1200), db(-21), .1, .2); add(145.3 + i * .26, thud(.06, 180, .2), db(-30), .1, .1)
add(147.46, whoosh(.5, 700, 3400), db(-22), .3, .5); add(147.46, thud(.7, 60, .5), db(-15), 0, .5); add(147.62, ding(880.), db(-27), .3, .8)
add(151.96, click(1.5, 700), db(-15), 0, .7)
add(152.46, clink(1500, .9, 1.), db(-15), 0, .9); add(152.46, thud(.5, 70, .6), db(-13), 0, .7)
ts_c = [152.72, 152.92, 153.08, 153.2, 153.3]
for tt in ts_c: add(tt, clink(1700 + rs.rand() * 400, .3, .6), db(-23), .2, .7)
add(153.38, whoosh(.6, 1200, 240, True), db(-24), .3, .8)
add(154.05, whoosh(3.2, 260, 1500, True), db(-30), 0, .9)
for i in range(4): add(154.05 + i * .75, ding(523.25 * [1, 1.5, 2, 3][i]), db(-35 + i), (-1) ** i * .3, 1.)

# —— 配乐：入水段闷下去；爆发前留白 ——
m = mus.copy(); mL = lp(m, 900, 2)
k = np.zeros(N, np.float32); ts_ = np.arange(N) / SR
k = np.clip((ts_ - 90.3) / .25, 0, 1) * (1 - np.clip((ts_ - 97.2) / 1.2, 0, 1)) * .85
m = m * (1 - k[:, None]) + mL * k[:, None]
bus = np.zeros_like(dry); bus[:N] = m * db(-2.2)
sfx = (reverb(dry + 0, 2.4, 0) + reverb(wetb, 2.6, 1.) * .62) * db(0)
mix = bus + sfx
L = int(159 * SR); mix = mix[:L + SR]
mix = mix / max(np.abs(mix).max(), 1e-6) * .96
wavfile.write(ROOT / 'mix_raw.wav', SR, (mix * 32767).astype(np.int16))
out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(ROOT / 'mix_raw.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = [l for l in out.splitlines() if l.strip().startswith('I:')][-1]; val = float(I.split()[1]); print('原始响度', val)
gain = -14 - val
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'mix_raw.wav'), '-af', f'volume={gain}dB,alimiter=limit=0.70:attack=4:release=80:level=disabled', '-t', '159.1', '-ar', '48000', str(ROOT / 'mix.wav')])
out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(ROOT / 'mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('\n'.join(l for l in out.splitlines()[-14:] if any(k_ in l for k_ in ('I:', 'LRA:', 'Peak:'))))
