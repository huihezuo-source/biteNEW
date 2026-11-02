#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《倒影》声音：《千年之后》原声 + 代码合成音效。"""
import re, subprocess, importlib.util, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
ROOT = Path(__file__).parent
# 复用《分母》的合成函数（只取到 reverb 定义为止）
src = (ROOT.parent / '分母' / 'audio' / 'mix.py').read_text(encoding='utf8'); head = src[:src.index("sr, mus = wavfile.read")]
exec(compile(head.replace("ROOT = Path(__file__).parent", ""), 'synth', 'exec'))
TRACK = Path('audio/配乐.m4a')  # 换成你的配乐
tmp = ROOT / 'audio' / 'track48.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(TRACK), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(tmp)])
sr, mus = wavfile.read(tmp); mus = mus.astype(np.float32) / 32768.; N = len(mus)
dry = np.zeros((N + SR * 4, 2), np.float32); wetb = np.zeros_like(dry)
def add(t, x, g=1., pan=0., send=.5):
    i = int(t * SR); n = min(len(x), len(dry) - i)
    if n <= 0: return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dry[i:i + n, 0] += x[:n] * g * L * 1.41; dry[i:i + n, 1] += x[:n] * g * R * 1.41
    wetb[i:i + n, 0] += x[:n] * g * L * send; wetb[i:i + n, 1] += x[:n] * g * R * send
db = lambda v: 10 ** (v / 20); B = lambda b, q=0: .488 + 2.12576 * b + .53144 * q
def flap(k=1.):
    d = .07; t = T(d); return fade(bp(noise(d), 1200, 5200) * np.exp(-t * 170) * k + thud(d, 150, .25) * .5 * k, .0002, .006)
def chatter(t0, t1, gap, g, pan=0.):
    t = t0
    while t < t1: add(t + (rs.rand() - .5) * gap * .3, flap(.6 + .6 * rs.rand()), db(g), pan + (rs.rand() - .5) * .5, .2); t += gap
def wind(d=4., a=200, b=1500, k=1.):
    n = noise(d); t = T(d); e = np.sin(np.pi * t / d) ** 1.2; o = whoosh(d, a, b, True) * .5 + bp(n, 300, 1800) * (.3 + .3 * np.sin(2 * np.pi * .9 * t + 1)) * e; return fade(o * k, .3, .5)
def splash(k=1.):
    d = .9; t = T(d); return fade(lp(noise(d), 2600) * np.exp(-t * 6) * .7 * k + hp(noise(d), 2400) * np.exp(-t * 10) * .4 * k, .002, .06)
def gavel():
    d = .5; t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, a, dk in [(320, 1, 30), (760, .7, 46), (1320, .4, 70)]) + bp(noise(d), 500, 3000) * np.exp(-t * 120) * 1.2, .0002, .01)
def coins(t0, d, g, pan=0.):
    tt = t0; i = 0
    while tt < t0 + d: add(tt, clink(1700 + rs.rand() * 1900, .16, .7), db(g), pan + (rs.rand() - .5) * .9, .34); tt += max(.012, .03 + rs.rand() * .05); i += 1
def drop(k=1.):
    d = .6; t = T(d); return fade((sweep(600, 1400, .6, .5)[:int(.6 * SR)] * np.exp(-t * 18) + np.sin(2 * np.pi * 340 * t) * np.exp(-t * 9) * .5) * k, .001, .02)
# —— 开场：湖面 ——
wa = lp(noise(50.), 620) * (.6 + .4 * np.sin(2 * np.pi * .09 * T(50.))); add(0, fade(wa, 2, 5) * .5, db(-38), 0, .1)
add(.05, drop(), db(-23), 0, .8)
add(.8, whoosh(2.6, 420, 3400), db(-24), .2, .8); add(.8, drop(.9), db(-24), .2, .8)
add(B(.8), riser(1.1), db(-34), 0, .5)
rn_ = hp(noise(2.6), 1500) * .5 + bp(noise(2.6), 500, 1700) * .3; add(B(3), fade(rn_, .15, .5), db(-27), 0, .3)
for i in range(70): add(B(3) + rs.rand() * 2., plink(420 + rs.rand() * 900), db(-36 + rs.rand() * 5), (rs.rand() - .5) * 1.6, .5)
add(B(4.25), drop(1.2), db(-20), 0, .9); add(B(4.25) + .3, drop(.8), db(-28), 0, .9); add(B(4.25), thud(.5, 60, .4), db(-24), 0, .4)
add(B(5.25), whoosh(4.4, 300, 2000), db(-24), 0, .8); add(B(5.25), drop(1.), db(-23), 0, .8)
add(B(6.5), riser(3.4), db(-24), 0, .5)
add(B(8), impact(4.2, 86, 26, 1.2, 1., .6), db(-6), 0, .6); add(B(8), splash(1.), db(-20), 0, .7); add(B(8.75), drop(.8), db(-30), 0, .9); add(B(9), wind(1.3, 260, 1500, .8), db(-26), 0, .5)
# —— 翻牌 ——
chatter(B(9.5), B(13.2), .09, -25, -.2); add(B(9.5), thud(.5, 66, .6), db(-18), 0, .4); add(B(11), thud(.5, 66, .6), db(-20), 0, .4)
for b_, n_ in [(14, 8), (15, 14), (15.5, 18)]:
    for i in range(n_): add(B(b_) + i * .03, flap(), db(-20), -.4 + i * .05, .25)
add(B(16), thud(.8, 56, .6), db(-15), 0, .5); chatter(B(16.25), B(16.4), .016, -27, 0); add(B(18.5), wind(3.3, 500, 3400, 1.), db(-20), 0, .4); chatter(B(18.5), B(19.9), .012, -30, 0)
add(B(20.75), flap(1.5), db(-13), .1, .4); add(B(20.75), thud(.5, 80, .5), db(-20), 0, .5)
for i in range(16): add(B(21.75) + i * .05, flap(1.1), db(-19), -.4 + i * .05, .25)
add(B(21.75), impact(2., 72, 32, .9, .7, .4), db(-11), 0, .6)
# —— 没有人 ——
add(B(24), impact(3.4, 60, 24, 1., .4, .1), db(-10), 0, .7); add(B(24), drop(1.2), db(-16), 0, .9); add(B(25), drop(.8), db(-26), 0, .9); add(B(26), drop(.7), db(-26), 0, .9)
add(B(26), whoosh(9., 300, 1100), db(-33), .3, .5)
add(B(30.5), riser(3.4), db(-19), 0, .6)
add(B(32), impact(5., 92, 24, 1.3, 1.1, .7), db(-4), 0, .6); add(B(32), glass()[:40000] * .5, db(-26), 0, .9)
for i in range(30): add(B(32) + .3 + rs.rand() * 2.2, clink(2400 + rs.rand() * 3200, .4, .6), db(-33), (rs.rand() - .5) * 1.4, .9)
add(B(33), wind(5.4, 260, 1900, 1.1), db(-16), -.1, .4)
add(B(35), impact(2.4, 74, 32, .9, .6, .4), db(-11), 0, .7)
# —— 1637 ——
add(B(36), ding(523.25), db(-27), 0, 1.); add(B(36.5), ding(783.99), db(-31), .2, 1.); add(B(37), drop(1.25), db(-18), 0, .9); add(B(37) + .3, drop(.8), db(-27), 0, .9); add(B(37), thud(.8, 60, .3), db(-24), 0, .5)
add(B(38), thud(.5, 62, .4), db(-23), 0, .4)
for i in range(5): add(B(39) + i * .53144, thud(.4, 74 + i * 4, 1.1), db(-11), 0, .5); add(B(39) + i * .53144, bp(noise(.09), 700, 2600) * np.exp(-T(.09) * 60), db(-16), 0, .5)
add(B(40.25), wind(5.2, 340, 3000, 1.2), db(-15), .1, .5); add(B(40.25), impact(1.8, 80, 36, .7, .5, .3), db(-15), 0, .6)
tt = B(40.3)
while tt < B(42.4): add(tt, flap(.34 + rs.rand() * .4), db(-29), (rs.rand() - .5) * 1.6, .4); tt += .018 + rs.rand() * .05
add(B(42.25), gavel(), db(-5), 0, 1.); add(B(42.25), thud(.6, 70, .7), db(-13), 0, .8)
add(B(43), wind(3., 180, 700, .7), db(-24), 0, .5); add(B(44), impact(2., 60, 28, .7, .4, .2), db(-15), 0, .7); add(B(44), drop(1.), db(-20), 0, .9)
# —— 真付过 ——
add(B(45.25), clink(3150, .9, 1.), db(-11), 0, .9); add(B(45.25), clink(4720, .5, .6), db(-17), 0, .9); add(B(45.25), thud(.6, 70, .5), db(-16), 0, .5)
tt, gp = B(45.25) + .34, .17
for i in range(26): add(tt, clink(3000 + rs.rand() * 500, .22, .6), db(-19 - i * .55), 0, .7); tt += gp; gp = max(.03, gp * .93)
for i in range(5): add(B(46) + i * .53144, impact(1.5, 90 - i * 6, 34, .9, .9, .5), db(-12 - i * .3), -.5 + i * .25, .6); add(B(46) + i * .53144, splash(1.2), db(-14), -.5 + i * .25, .7)
add(B(47), ding(659.25), db(-27), -.3, 1.)
for b_ in [48, 49, 50, 51]: coins(B(b_) + .05, 1.4, -26, .1); add(B(b_), thud(.5, 72, .5), db(-17), 0, .5); add(B(b_) + 1.3, wind(2.2, 180, 760, .7), db(-27), -.5, .5)
add(B(52), impact(4.2, 70, 22, 1.2, 1., .8), db(-6), 0, .6); add(B(52), splash(1.3), db(-15), .4, .7); add(B(52), glass()[:30000] * .4, db(-26), .4, .9); add(B(52.3), drop(.9), db(-24), .4, .9)
add(B(54.25), ding(392.), db(-29), -.3, 1.); add(B(54.25) + .55, ding(587.33), db(-33), -.5, 1.)
# —— 真实曲线 ——
add(B(56), impact(2.4, 80, 34, .8, .5, .4), db(-13), 0, .7); add(B(56), sweep(180, 720, 3.6, 1.2) * np.sin(np.pi * np.linspace(0, .98, int(3.6 * SR))) ** 2, db(-28), 0, .9)
add(B(58), impact(2., 76, 34, .9, .6, .5), db(-12), 0, .7); add(B(59), sweep(620, 150, 1.9, .8) * np.sin(np.pi * np.linspace(0, .98, int(1.9 * SR))) ** 2, db(-27), 0, .8)
coins(B(60), 1.9, -28, 0)
# —— 巨人 ——
add(B(61), thud(.8, 50, .4), db(-20), 0, .6)
for i, b_ in enumerate([62, 62.5, 63, 63.5]): add(B(b_), impact(1.6, 60 + i * 6, 30, 1., .4, .2), db(-11 + i), 0, .7); add(B(b_), ding(261.63 * [1, 1.25, 1.5, 2][i]), db(-29), 0, 1.)
add(B(64), wind(4.8, 300, 2600, 1.2), db(-15), .3, .4); s_ = hp(noise(3.2), 3000) * np.exp(-T(3.2) * 1.3); add(B(64), fade(s_, .05, .3), db(-25), .4, .4)
# —— 黎明 ——
add(B(66), impact(3.2, 66, 28, .8, .3, .1), db(-13), 0, .9)
for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]): add(B(66) + i * .27, ding(f), db(-27), (-1) ** i * .3, 1.)
rain = hp(noise(9.), 1400) * .5 + bp(noise(9.), 500, 1800) * .3; add(B(67), fade(rain, 1.2, 1.6), db(-34), 0, .2)
for i in range(120): add(B(67) + rs.rand() * 9., plink(420 + rs.rand() * 900), db(-40 + rs.rand() * 5), (rs.rand() - .5) * 1.6, .5)
for row, t0 in [(0, B(69.75) + .05), (1, B(69.75) + .35)]:
    for i in range(8): add(t0 + i * .05, flap(1.), db(-20), -.3 + i * .08, .3)
add(B(71), ding(659.25), db(-27), 0, 1.)
add(B(72.2), whoosh(2.4, 420, 3000), db(-25), .1, .8); add(B(72.2), drop(.9), db(-25), 0, .9)
add(B(73), thud(.7, 56, .3), db(-23), 0, .6)
for i, f in enumerate([523.25, 783.99, 1046.5]): add(B(74) + i * .8, ding(f), db(-29 - i), (-1) ** i * .2, 1.)
bus = np.zeros_like(dry); bus[:N] = mus * db(-2.4)
sfx = reverb(dry + 0, 2.4, 0) + reverb(wetb, 2.6, 1.) * .6
mix = (bus + sfx)[:int(162.3 * SR)]
mix = mix / max(np.abs(mix).max(), 1e-6) * .96
wavfile.write(ROOT / 'audio/mix_raw.wav', SR, (mix * 32767).astype(np.int16))
def loud(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return o
val = float([l for l in loud(ROOT / 'audio/mix_raw.wav').splitlines() if l.strip().startswith('I:')][-1].split()[1]); print('原始', val)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'audio/mix_raw.wav'), '-af', f'volume={-14 - val}dB,alimiter=limit=0.7:attack=4:release=80:level=disabled', '-t', '162.2', '-ar', '48000', str(ROOT / 'audio/mix.wav')])
print('\n'.join(l for l in loud(ROOT / 'audio/mix.wav').splitlines()[-14:] if any(k in l for k in ('I:', 'LRA:', 'Peak:'))))
