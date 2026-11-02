#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《满仓》声音：《脑内擂台》延长版 + 代码合成的钢珠声。输出 audio/mix.wav（-14 LUFS）。"""
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
    if n <= 0: return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dry[i:i + n, 0] += x[:n] * g * L * 1.41; dry[i:i + n, 1] += x[:n] * g * R * 1.41
    wetb[i:i + n, 0] += x[:n] * g * L * send; wetb[i:i + n, 1] += x[:n] * g * R * send
db = lambda v: 10 ** (v / 20); B = lambda b, q=0: .47 + 2.0243 * b + .50608 * q

# —— 钢珠声：钢撞钢，模态 + 一点点起音噪声 ——
def tink(f=3200., d=.32, k=1.):
    t = T(d); s = 0
    for r, a, dk in [(1, 1, 16), (2.71, .62, 26), (5.15, .34, 44), (7.9, .2, 70)]: s = s + a * np.sin(2 * np.pi * f * r * t + rs.rand() * 6) * np.exp(-t * dk)
    return fade(s * k * .6 + hp(noise(d), 4000) * np.exp(-t * 240) * .55 * k, .0002, .02)
BANK = [tink(2200 + rs.rand() * 3600, .2, 1.) for _ in range(48)]
def hail(t0, t1, rate, g, pan=.7, send=.25):
    """rate(t) 每秒几颗，随机泊松。"""
    t = t0
    while t < t1:
        r = max(rate(t), .5); add(t, BANK[rs.randint(48)], db(g + 5 + rs.rand() * 6 - 3), (rs.rand() - .5) * 2 * pan, send); t += rs.exponential(1 / r)
def shimmer(d, a=3800, b=9000, k=1.):
    n = noise(d); e = bp(n, a, b); fl = lp(np.abs(noise(d)), 26); fl = fl / (fl.max() + 1e-6); return fade(e * (.5 + fl), .15, .3) * k
def roll(d, f=90., k=1.):
    t = T(d); r = lp(noise(d), 240) * (.6 + .4 * np.sin(2 * np.pi * 7 * t)) + bp(noise(d), 1200, 3800) * .1; return fade(r * k, .05, .1)
def clunk(k=1.):
    d = .5; t = T(d); return fade((np.sin(2 * np.pi * 96 * t) + .6 * np.sin(2 * np.pi * 214 * t) * np.exp(-t * 22) + .4 * np.sin(2 * np.pi * 611 * t) * np.exp(-t * 50)) * np.exp(-t * 15) * k + bp(noise(d), 700, 3200) * np.exp(-t * 90) * .7 * k, .0003, .02)
def relay(k=1.):
    d = .08; t = T(d); return fade(bp(noise(d), 1400, 6000) * np.exp(-t * 160) * k, .0002, .006)
def ratchet(t0, n, gap, g, pan=.3):
    for i in range(n): add(t0 + i * gap, relay(1.), db(g), pan, .35); add(t0 + i * gap, thud(.14, 180, .2), db(g - 8), pan, .3)
def hum(d, f0, f1, k=1.):
    s = sweep(f0, f1, d, 1.) * .7 + sweep(f0 * 2, f1 * 2, d, 1.) * .3 + sweep(f0 * 3, f1 * 3, d, 1.) * .12; return fade(s * k, .2, .3)
def liquid(d=1.):
    t = T(d); return fade(sweep(260, 90, d, .6) * np.exp(-t * 2.4) * .8 + lp(noise(d), 700) * np.exp(-t * 3) * .5, .01, .08)

# —— 0 冷开场：先给结果 ——
add(.02, impact(2.2, 70, 28, 1., .5, .3), db(-11), 0, .7); add(.05, fade(lp(noise(2.), 130), .05, .3), db(-22), 0, .1)
add(2.05, tink(6200, .9, .8), db(-20), 0, 1.); add(2.05, thud(.6, 50, .3), db(-22), 0, .6)
# 硬切白棚
T0, HIT1, HIT2, M0, PULL = B(1, 3), B(3), B(5), 11.9, 13.4
add(T0, tink(2100, .5, .6), db(-17), 0, .8); add(T0, whoosh(.7, 3200, 500, True), db(-23), 0, .5); add(T0 + .05, roll(2.4, k=.45), db(-33), 0, .2)
for h, f, pan in [(HIT1, 3400, .15), (HIT2, 2900, -.15)]:
    add(h, tink(f, .9, 1.3), db(-9), pan, .9); add(h, thud(.5, 70, .6), db(-15), pan, .5); add(h, tink(f * 1.5, .3, .6), db(-22), pan, .8)
add(HIT1 + .02, sweep(420, 980, .34, .8) * np.exp(-T(.34) * 6), db(-26), .15, .6)
add(HIT2 + .02, sweep(800, 300, .34, .8) * np.exp(-T(.34) * 6), db(-26), -.15, .6)
for i in range(6): add(M0 - .35 + i * .253 + .29, tink(3000 + i * 180 * (-1) ** i, .4, 1.), db(-15), (-1) ** i * .35, .7)
add(PULL, whoosh(1.4, 2600, 260, True), db(-21), 0, .7); add(PULL, thud(.8, 54, .5), db(-17), 0, .5)
add(PULL + .3, hum(3., 58, 62, 1.), db(-40), 0, .2)
# 一颗球走完一百局：越走越快
WALK0, WALK1 = PULL + .5, B(8) - .22
for r_ in range(3, 101): add(WALK0 + (WALK1 - WALK0) * ((r_ - 2) / 98) ** .5, BANK[r_ % 48], db(-21), (r_ % 7 - 3) * .1, .4)
# —— 1 平均 ——
add(B(8), thud(.5, 66, .4), db(-20), 0, .5); add(B(8), roll(1.7, k=.6), db(-30), 0, .2)
add(B(8) + 1.65, liquid(1.2), db(-17), 0, .7); add(B(8) + 2.75, liquid(.8), db(-20), 0, .7)
add(B(8) + 3.5, tink(3900, .9, 1.), db(-20), 0, 1.)
# 灌仓
rr = lambda t: 8 + 200 * ((t - 22.9) / 10.) ** 2
hail(23., B(16) - .1, rr, -24, .9, .35)
add(23., fade(lp(noise(9.9), 900) * (T(9.9) / 9.9) ** 1.6, .6, .05), db(-22), 0, .3)
add(23., shimmer(9.8, k=.7) * (T(9.8) / 9.8) ** 1.4, db(-27), 0, .3)
add(29.4, riser(3.4), db(-22), 0, .4)
# —— 2 闸门 ——
add(B(16), impact(4.6, 96, 24, 1.3, 1.1, .8), db(-5), 0, .6); add(B(16), clunk(1.4), db(-7), 0, .8); add(B(16), tink(1900, 1.3, 1.), db(-14), 0, 1.)
add(B(16) + .05, whoosh(3.6, 4200, 300, True), db(-19), 0, .6)
hail(B(16) + .1, B(16) + 3.6, lambda t: 160, -25, .9, .3)
add(B(16) + .1, shimmer(3.6, k=1.), db(-24), 0, .3)
# —— 第一跑：钉阵 ——
RK = [(36.5, 5), (41, 12), (45, 22), (48.8, 26), (49.2, 3), (55.3, 3), (55.5, 8), (65, 12), (71, 16), (71.6, 4), (77.5, 4), (77.7, 90), (80, 200), (81.4, 200)]
rate = lambda t: float(np.interp(t, *zip(*RK)))
hail(36.6, 81.4, rate, -27, .85, .22)
add(36.6, shimmer(45., 3000, 8000, .5) * (.3 + .7 * np.clip((T(45.) - 39) / 6, 0, 1) ** 2), db(-31), 0, .2)
add(41.4, thud(.5, 64, .3), db(-25), 0, .5)
# 排队
add(B(24), impact(1.8, 76, 36, .8, .5, .3), db(-14), 0, .6); add(B(24), whoosh(1.3, 700, 4200, True), db(-20), 0, .6)
add(50.5, whoosh(4.2, 300, 2400, True), db(-24), 0, .5); hail(50.6, 54.3, lambda t: 40 * np.sin(np.pi * (t - 50.6) / 3.7) + 3, -30, .6, .3)
add(54.6, tink(3400, .9, 1.), db(-16), 0, 1.); add(54.6, thud(.5, 64, .4), db(-20), 0, .6)
# 跟拍：你每撞一次
for i, n_ in enumerate(np.arange(21, 38)): add(55.4 + (n_ - 20.3) / 1.8, tink(2500 + (i % 2) * 400, .5, 1.), db(-17), (-1) ** i * .2, .7)
# 灯灭：继电器一路跳，电流声往下掉
add(B(32), thud(.8, 52, .5), db(-16), 0, .6)
add(65.3, hum(13., 62, 38, 1.) * np.linspace(1, .12, int(13. * SR)), db(-29), 0, .3)
for k_ in range(11): tt = 68.15 + (71.9 - 68.15) * k_ / 10; add(tt, relay(1.3), db(-18), (k_ % 3 - 1) * .4, .9); add(tt, clunk(.5), db(-25), (k_ % 3 - 1) * .4, .8)
add(75.0, riser(6.), db(-20), 0, .4)
# —— 5 落地 ——
add(B(40), impact(5.2, 80, 20, 1.4, 1.2, .5), db(-4), 0, .7); add(B(40), glass()[:40000] * .6, db(-23), 0, .9)
hail(B(40), B(40) + 1.8, lambda t: 200 * np.exp(-(t - B(40)) * 2.2), -24, .9, .35)
add(B(40) + .6, fade(lp(noise(15.), 130), 2., 2.), db(-21), 0, .1)
add(B(40) + .4, fade(hp(noise(15.), 5500) * .4, 2., 2.), db(-42), 0, .3)
add(B(41), hum(14., 41, 44, 1.), db(-33), 0, .2)
for i in range(30): add(82 + rs.rand() * 4.5, tink(5000 + rs.rand() * 3000, .22, .4), db(-38), rs.rand() * 1.4 - .7, 1.)
add(86.75, tink(6200, .9, .7), db(-24), 0, 1.)
add(89.8, thud(.9, 48, .4), db(-20), 0, .7)
add(93.8, whoosh(3.8, 240, 3800, True), db(-22), 0, .6); add(93.8, shimmer(3.8, 2400, 7000, 1.) * (T(3.8) / 3.8) ** 1.2, db(-26), 0, .4)
# —— 6 碎回去 ——
add(B(48), impact(4.2, 88, 24, 1.3, 1.1, .8), db(-5), 0, .7); add(B(48), glass()[:44000] * .7, db(-20), 0, .9); add(B(48), whoosh(1.4, 4200, 240, True), db(-20), 0, .6)
add(100.4, thud(.7, 60, .4), db(-20), 0, .6); add(100.4, whoosh(1.5, 300, 2800, True), db(-27), 0, .7)
tt = 101.7
while tt < 103.6: add(tt, tink(4400 + rs.rand() * 1800, .16, .7), db(-27), (rs.rand() - .5) * .5, .7); tt += .05 + rs.rand() * .06
add(103.2, tink(3100, 1., 1.), db(-20), 0, 1.)
# A 股那一队：每个镜头一下
for tt in [104.2, 106., 107.9, 110.9, 113.]: add(tt, whoosh(.9, 2400, 400, True), db(-23), 0, .5); add(tt, thud(.5, 62, .4), db(-20), 0, .5)
hail(104.3, 110.8, lambda t: 16, -32, .8, .3)
add(108.65, ding(880.), db(-24), 0, 1.); add(108.65, tink(4400, .9, .9), db(-20), 0, 1.)
add(110.9, impact(2.2, 74, 32, .9, .5, .3), db(-13), 0, .7)
add(113.2, sweep(420, 120, 2., 1.) * np.sin(np.pi * np.linspace(0, .98, int(2. * SR))) ** 2, db(-30), 0, .6)
# —— 7 杠杆、融资、铭牌 ——
add(B(56), thud(.8, 56, .5), db(-17), 0, .6)
LA, LB, KA = 115.5, 119.2, 126.0
add(LA, clunk(1.), db(-14), .1, .8); ratchet(LA + 1, 18, .125, -24, -.1)
add(LB, clunk(1.1), db(-14), 0, .7)
ratchet(LB + .15, 38, .147, -23, .15)
hail(120.4, 125.6, lambda t: 90, -30, .9, .3)
add(122.1, impact(2.4, 70, 30, .9, .5, .3), db(-12), 0, .7)
add(122.2, hum(3.6, 70, 30, 1.) * np.linspace(.3, 1, int(3.6 * SR)), db(-26), 0, .3)
add(123.95, thud(.8, 46, .6), db(-16), 0, .6)
add(KA, whoosh(1.3, 300, 2200, True), db(-23), .2, .6); add(KA + 1.25, tink(1500, 1.2, .8), db(-19), .2, 1.); add(KA + 1.25, thud(.5, 90, .3), db(-22), .2, .6)
add(127.7, riser(2.3), db(-22), 0, .5); add(129.6, whoosh(.44, 500, 3000, True), db(-20), 0, .5)
# —— 8 慢慢拉回来 ——
SLAM, GA = B(64), 133.6
add(SLAM, impact(4.4, 92, 22, 1.3, 1., .7), db(-4.5), 0, .7); add(SLAM, clunk(1.6), db(-6), 0, .9); add(SLAM, tink(1700, 1.4, 1.), db(-14), 0, 1.)
for i in range(30): add(SLAM + .1 + (GA - SLAM - .2) * (i / 29) ** .9, relay(1.1), db(-22), .1, .4)
for k_ in range(11): tt = 130.9 + (132.7 - 130.9) * k_ / 10; add(tt, relay(1.2), db(-19), (k_ % 5 - 2) * .25, .8); add(tt, clunk(.3), db(-29), (k_ % 5 - 2) * .25, .7)
add(130.9, whoosh(2., 500, 3000, True), db(-25), 0, .6); add(131.3, hum(4.6, 54, 120, .8) * np.linspace(.2, 1, int(4.6 * SR)) * np.linspace(1, .4, int(4.6 * SR)), db(-34), 0, .3)
for i, f in enumerate([523.25, 659.25, 880.]): add(132.6 + i * .2, ding(f), db(-29), (-1) ** i * .3, 1.)
K2_ = [(132.4, 5), (136, 16), (140.8, 30), (142.4, 70), (143.4, 120)]
rate2 = lambda t: float(np.interp(t, *zip(*K2_)))
hail(132.4, 143.6, rate2, -28, .8, .3)
hail(143.3, 146.2, lambda t: 170 * np.exp(-(t - 143.3) * 1.1), -24, .9, .35)
add(143.3, roll(2.6, k=1.), db(-22), 0, .3); add(146.0, thud(.7, 60, .3), db(-22), 0, .6)
# —— 9 结果 ——
add(146.5, sweep(160, 620, 3., .8) * np.sin(np.pi * np.linspace(0, .98, int(3. * SR))) ** 2, db(-30), -.2, .8)
add(149.9, sweep(620, 220, 2.6, 1.) * np.sin(np.pi * np.linspace(0, .98, int(2.6 * SR))) ** 2, db(-30), .2, .8)
for i, f in enumerate([523.25, 783.99, 1046.5]): add(151.4 + i * .36, ding(f), db(-27), (-1) ** i * .25, 1.)
hail(152.8, 156.7, lambda t: 60 * np.sin(np.pi * (t - 152.8) / 3.9) + 4, -27, .8, .4)
add(156.75, tink(3400, 1.1, 1.1), db(-14), 0, 1.); add(156.75, thud(.4, 74, .3), db(-22), 0, .5)
for i, f in enumerate([523.25, 783.99]): add(158.05 + i * .9, ding(f), db(-29 - i * 2), 0, 1.)

bus = np.zeros_like(dry); bus[:N] = mus * db(-3.4)
sfx = reverb(dry + 0, 2.2, 0) + reverb(wetb, 2.4, 1.) * .55
mix = (bus + sfx)[:int(162.9 * SR)]
mix = mix / max(np.abs(mix).max(), 1e-6) * .96
wavfile.write(ROOT / 'audio/mix_raw.wav', SR, (mix * 32767).astype(np.int16))
def loud(f): return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
val = float([l for l in loud(ROOT / 'audio/mix_raw.wav').splitlines() if l.strip().startswith('I:')][-1].split()[1]); print('原始', val)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'audio/mix_raw.wav'), '-af', f'volume={-14 - val}dB,alimiter=limit=0.7:attack=4:release=80:level=disabled', '-t', '162.9', '-ar', '48000', str(ROOT / 'audio/mix.wav')])
print('\n'.join(l for l in loud(ROOT / 'audio/mix.wav').splitlines()[-14:] if any(k in l for k in ('I:', 'LRA:', 'Peak:'))))
