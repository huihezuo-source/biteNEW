#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《第二天》声音：《千年之后》+ 代码合成的手机、翻牌、重击。输出 audio/mix.wav（-14 LUFS）。"""
import subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
ROOT = Path(__file__).parent
src = (ROOT / 'audio_synth.py').read_text(encoding='utf8'); head = src[:src.index("sr, mus = wavfile.read")]
exec(compile(head.replace("ROOT = Path(__file__).parent", ""), 'synth', 'exec'))
sr, mus = wavfile.read(ROOT / 'audio/music.wav'); mus = mus.astype(np.float32) / 32768.; N = len(mus)
dry = np.zeros((N + SR * 4, 2), np.float32); wetb = np.zeros_like(dry)
def add(t, x, g=1., pan=0., send=.5):
    i = int(t * SR); n = min(len(x), len(dry) - i)
    if n <= 0 or i < 0: return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dry[i:i + n, 0] += x[:n] * g * L * 1.41; dry[i:i + n, 1] += x[:n] * g * R * 1.41
    wetb[i:i + n, 0] += x[:n] * g * L * send; wetb[i:i + n, 1] += x[:n] * g * R * send
db = lambda v: 10 ** (v / 20)
def tink(f=3200., d=.32, k=1.):
    t = T(d); s = 0
    for r, a, dk in [(1, 1, 16), (2.71, .62, 26), (5.15, .34, 44), (7.9, .2, 70)]: s = s + a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dk)
    return fade(s * k * .6 + hp(noise(d), 4000) * np.exp(-t * 240) * .55 * k, .0002, .02)
def shimmer(d, a=3800, b=9000, k=1.):
    n = noise(d); e = bp(n, a, b); fl = lp(np.abs(noise(d)), 26); fl = fl / (fl.max() + 1e-6); return fade(e * (.5 + fl), .15, .3) * k
def roll(d, f=90., k=1.):
    t = T(d); r = lp(noise(d), 240) * (.6 + .4 * np.sin(2 * np.pi * 7 * t)) + bp(noise(d), 1200, 3800) * .1; return fade(r * k, .05, .1)
def clunk(k=1.):
    d = .5; t = T(d); return fade((np.sin(2 * np.pi * 96 * t) + .6 * np.sin(2 * np.pi * 214 * t) * np.exp(-t * 22)) * np.exp(-t * 11) * k + bp(noise(d), 700, 3400) * np.exp(-t * 90) * .5 * k, .0003, .05)
def hum(d, f0, f1, k=1.):
    s = sweep(f0, f1, d, 1.) * .7 + sweep(f0 * 2, f1 * 2, d, 1.) * .3 + sweep(f0 * 3, f1 * 3, d, 1.) * .12; return fade(s * k, .2, .3)
def desk(k=1.):   # 手机落在玻璃桌上
    d = .22; t = T(d); return fade((np.sin(2 * np.pi * 620 * t) * .5 + np.sin(2 * np.pi * 1490 * t) * .3) * np.exp(-t * 46) * k + bp(noise(d), 1200, 6500) * np.exp(-t * 150) * k + thud(d, 120, .3) * .6 * k, .0002, .02)
def flip(f=2400., k=1.):
    d = .11; t = T(d); return fade(bp(noise(d), f * .6, f * 1.7) * np.exp(-t * 120) * k + np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * .4 * k, .0002, .01)

# JS 里的随机数，手机落下的时间要和画面一致
def mulberry(seed):
    a = seed & 0xffffffff
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff
        im = lambda x, y: (x * y) & 0xffffffff
        t = im(a ^ (a >> 15), 1 | a)
        t = (t + im(t ^ (t >> 7), 61 | t)) & 0xffffffff ^ t
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return f
import json, re
data = json.loads(re.search(r'\{.*\}', (ROOT / 'src/data.js').read_text(encoding='utf8'), re.S).group(0))
big = data['big']; NN = len(big); r65 = mulberry(65); drop = [47.9 + r65() * 3.1 for _ in range(NN)]
tFlip = [59 + 4.45 * (1 - (1 - i / (NN - 1)) ** 1.9) for i in range(NN)]; tSold = [55.4 + 3.3 * ((NN - 1 - i) / (NN - 1)) ** 1.7 for i in range(NN)]
H1, H2 = 17.07, 93.87

# —— 开场 ——
add(.03, impact(2.4, 66, 28, 1., .5, .25), db(-13), 0, .6); add(.03, hum(5., 60, 60, 1.), db(-40), 0, .1)
add(4.9, whoosh(1.7, 300, 3600, True), db(-23), 0, .5); add(6.4, thud(.7, 58, .5), db(-17), 0, .6)
add(6.7, roll(3., k=.8), db(-23), 0, .3); add(6.8, whoosh(2.6, 240, 1400, True), db(-27), 0, .4)
add(10.3, tink(2400, .9, 1.), db(-18), 0, 1.); add(10.5, whoosh(1.1, 2800, 400, False), db(-23), 0, .4); add(11.45, thud(.5, 72, .4), db(-22), 0, .5)
for i, tt in enumerate(np.arange(12.1, 14.8, 1.)): add(tt, click(1., 3000), db(-20), .25, .7)
for i, tt in enumerate([14.9, 15.75, 16.45]): add(tt, thud(.32, 46, .1), db(-14 - (2 - i) * 2), 0, .2)
add(H1 - .03, click(1.4, 1500), db(-14), 0, .5); add(H1, impact(4.2, 92, 24, 1.3, 1., .7), db(-5), 0, .7); add(H1, tink(1500, 1.3, 1.), db(-15), 0, 1.); add(H1 + .03, whoosh(2.6, 3800, 300, False), db(-21), 0, .6)
# —— 涨了 ——
add(19.38, whoosh(.7, 260, 2600, True), db(-19), 0, .5); add(19.42, thud(.5, 64, .5), db(-17), 0, .5); add(20.88, whoosh(.7, 340, 3200, True), db(-19), .1, .5); add(20.92, thud(.5, 72, .5), db(-17), .1, .5)
for i in range(6): add(22.8 + i * .26, plink(392 * 2 ** (i * 2 / 12)), db(-22 + i * .4), (-1) ** i * .2, .7); add(22.8 + i * .26, thud(.3, 70 + i * 6, .3), db(-21), 0, .4)
add(24.5, whoosh(.6, 900, 3200, True), db(-23), 0, .5)
add(30.3, hum(2.1, 44, 40, 1.), db(-24), 0, .3); add(30.32, tink(900, 1.3, .5), db(-26), 0, 1.); add(32.15, whoosh(.34, 1600, 300, False), db(-26), 0, .4)
for tt, g in [(32.69, -17), (33.17, -20), (33.45, -24), (33.58, -28)]: add(tt, desk(.9), db(g), .25, .4)
add(34.3, whoosh(1., 2600, 300, False), db(-22), 0, .6); add(34.6, shimmer(2.8, 2600, 7000, .7) * (T(2.8) / 2.8) ** 1.2, db(-30), 0, .4)
# —— 三年 ——
add(37.2, whoosh(.6, 500, 2800, True), db(-21), 0, .5); add(37.4, roll(3.5, k=1.), db(-25), 0, .3); add(37.4, whoosh(3.4, 400, 1800, True), db(-27), 0, .4)
add(40.4, tink(3200, .6, .9), db(-18), 0, 1.); add(41.5, impact(3., 84, 30, 1., .8, .4), db(-9), 0, .6)
for i in range(5): add(44 + i * .36, thud(.5, 62 + i * 9, .6), db(-15), 0, .5); add(44 + i * .36, whoosh(.4, 500, 3000, True), db(-24), 0, .5)
add(46.8, shimmer(1.2, 2400, 7000, 1.), db(-26), 0, .5)
# —— 65 部手机 ——
for t0 in sorted(drop): add(t0 + .42, desk(.8), db(-25 + rs.rand() * 4), (rs.rand() - .5) * 1.1, .45)
for i, t0 in enumerate(tSold): add(t0, stamp(), db(-24), (i % 9 - 4) * .1, .4)
add(55.2, hum(3.8, 58, 46, 1.) * np.linspace(1, .1, int(3.8 * SR)), db(-33), 0, .3)
for i, t0 in enumerate(tFlip):
    up = big[i][2] > 0; add(t0 + .13, flip(3000 if up else 1700, 1.), db(-15), (i % 9 - 4) * .11, .4); add(t0 + .2, desk(.5), db(-26), (i % 9 - 4) * .11, .3)
add(63.65, thud(.8, 60, .5), db(-17), 0, .6); add(66.45, thud(.7, 50, .5), db(-18), 0, .6); add(68.5, whoosh(1.2, 400, 2800, True), db(-23), 0, .6)
for k in range(10): add(69.3 + (.3 + k * .46) * .05, desk(.9), db(-21), -.35, .4); add(72.5 + (.3 + k * .46) * .05, desk(.9), db(-21), .35, .4)
# —— 踩过头 ——
add(74.3, fade(bp(noise(2.1), 900, 5200) * (T(2.1) / 2.1) ** .7, .2, .1), db(-22), 0, .3); add(74.3, hum(2., 90, 42, 1.), db(-28), 0, .3)
add(76.35, sweep(90, 520, .42, .8) * np.exp(-T(.42) * 5), db(-17), 0, .6); add(76.35, thud(.4, 80, .5), db(-18), 0, .5)
add(77.1, hum(3.5, 180, 70, 1.), db(-33), 0, .3); add(83.3, stamp(), db(-13), 0, .6)
add(87.1, sweep(1500, 90, .4, .6) * np.exp(-T(.4) * 7), db(-22), 0, .4)
add(90.95, thud(.6, 48, .3), db(-19), 0, .9); add(91.1, riser(2.75), db(-23), 0, .4)
# —— 第二记重音 ——
add(H2, impact(4.6, 100, 22, 1.5, 1.2, .9), db(-3), 0, .7); add(H2, glass()[:44000] * .7, db(-20), 0, .9)
rr = rs
for i in range(90): add(H2 + .35 + rr.rand() * 1.55, thud(.26, 60 + rr.rand() * 50, .5), db(-25 + rr.rand() * 6), (rr.rand() - .5) * 1.4, .35)
H3 = H2 + 2.13; add(H3, impact(3.2, 80, 34, 1.1, .8, .5), db(-8), 0, .7); add(H3 + .02, whoosh(2.3, 300, 5200, True), db(-16), 0, .6); add(H3 + .1, riser(2.), db(-24), 0, .4)
# —— 2008 ——
add(99.1, shimmer(1.5, 900, 3600, 1.), db(-29), 0, .5)
for i, h in enumerate(data['y08']['hits']): add(105.2 + h * .006, tink(2600 + i * 40, .5, .7), db(-24), (i - 7) * .07, .9)
for i, n in enumerate(data['y08']['next']): add(107.7 + i * .012, tink(3400 if n > 0 else 1900, .4, .6), db(-27), (i - 7) * .07, .8)
add(109.5, whoosh(1.7, 300, 1500, True), db(-27), 0, .5)
add(113.6, thud(.6, 54, .3), db(-22), 0, .7)
add(116.4, desk(1.3), db(-13), -.3, .7); add(116.4, thud(.4, 70, .4), db(-20), -.3, .5); add(117.5, desk(1.3), db(-13), .3, .7); add(117.5, thud(.4, 62, .4), db(-20), .3, .5)
add(121.2, whoosh(.8, 500, 2800, True), db(-24), 0, .5); add(122.6, tink(2400, .9, .9), db(-21), 0, 1.)
# —— 回到开头 ——
add(124.4, whoosh(.8, 2000, 400, False), db(-28), 0, .6)
add(128.25, hum(3., 60, 60, 1.), db(-40), 0, .1); add(129.6, thud(.3, 46, .1), db(-20), 0, .2); add(130.5, thud(.3, 46, .1), db(-22), 0, .2)
add(132.2, whoosh(1.9, 280, 1900, True), db(-19), 0, .6); FL = 134.1; add(FL - .02, desk(1.6), db(-7), 0, .6); add(FL, thud(.5, 74, .6), db(-13), 0, .6)
add(135.7, shimmer(16., 2400, 7000, .5) * (T(16.) / 16.) ** 1.5, db(-34), 0, .5)
for i, f in enumerate([523.25, 783.99]): add(150. + i * .8, ding(f), db(-31 - i * 2), 0, 1.)

# 手机落桌那一下，音乐让出来，天亮时再回来
env = np.interp(np.arange(N) / SR, [0, 86.6, 87.5, 93.6, 93.8, 133.9, 134.08, 136.2, 146, 158.6, 161.2], [1, 1, .42, .42, 1, 1, .09, .16, 1, 1, 0])
bus = np.zeros_like(dry); bus[:N] = (mus.T * env).T * db(-3.4)
sfx = reverb(dry + 0, 2.2, 0) + reverb(wetb, 2.4, 1.) * .55
mix = (bus + sfx)[:int(161.2 * SR)]
mix = mix / max(np.abs(mix).max(), 1e-6) * .96
wavfile.write(ROOT / 'audio/mix_raw.wav', SR, (mix * 32767).astype(np.int16))
def loud(f): return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
val = float([l for l in loud(ROOT / 'audio/mix_raw.wav').splitlines() if l.strip().startswith('I:')][-1].split()[1]); print('原始', val)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'audio/mix_raw.wav'), '-af', f'volume={-14 - val}dB,alimiter=limit=0.7:attack=4:release=80:level=disabled', '-ar', '48000', str(ROOT / 'audio/mix.wav')], check=True)
print('\n'.join(l for l in loud(ROOT / 'audio/mix.wav').splitlines()[-14:] if any(k in l for k in ('I:', 'LRA:', 'Peak:'))))
