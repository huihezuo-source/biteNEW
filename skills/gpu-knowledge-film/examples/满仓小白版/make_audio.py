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

# —— 一颗球 ——
T1, T2, GATE = B(1, 3), B(5), B(16)
add(.1, tink(3000, .7, .6), db(-22), 0, .9)
for h, f, up in [(T1, 3400, 1), (T2, 2600, 0)]:
    add(h, tink(f, .9, 1.2), db(-11), 0, .9); add(h, thud(.5, 70, .6), db(-15), 0, .5)
    add(h + .02, (sweep(420, 980, .4, .8) if up else sweep(800, 300, .4, .8)) * np.exp(-T(.4) * 5), db(-24), 0, .6)
add(14.8, thud(.7, 52, .6), db(-16), 0, .6)
add(18.6, liquid(1.1), db(-17), 0, .7); add(20.4, liquid(1.), db(-18), 0, .7)
# —— 灌仓 ——
hail(23.2, GATE - .1, lambda t: 8 + 160 * ((t - 23.1) / 9.8) ** 2, -24, .9, .35)
add(23.1, fade(lp(noise(9.7), 900) * (T(9.7) / 9.7) ** 1.6, .6, .05), db(-23), 0, .3)
add(29.4, riser(3.4), db(-23), 0, .4)
add(GATE, impact(4.6, 96, 24, 1.3, 1.1, .8), db(-5), 0, .6); add(GATE, clunk(1.4), db(-7), 0, .8)
hail(GATE + .1, GATE + 3.6, lambda t: 140, -25, .9, .3)
# —— 一万颗球 ——
for i, tt in enumerate(np.arange(37.2, 44.6, .5)): add(tt, tink(2600 + (i % 3) * 300, .4, 1.), db(-20), (-1) ** i * .3, .6)
hail(44.8, 65., lambda t: float(np.interp(t, [44.8, 55, 60, 65], [20, 40, 120, 30])), -27, .85, .25)
add(60.5, riser(4.7), db(-23), 0, .4)
# —— 一百次之后 ——
add(B(32), impact(5., 80, 20, 1.3, 1.1, .4), db(-5), 0, .7)
add(B(32) + .4, fade(lp(noise(15.), 130), 2., 2.), db(-22), 0, .1)
add(68.6, thud(.8, 50, .4), db(-18), 0, .6); add(75.8, tink(6200, .9, .6), db(-22), 0, 1.); add(78.6, thud(.6, 46, .4), db(-20), 0, .6)
# —— 回不来 ——
add(B(40), impact(2.6, 70, 28, 1., .5, .3), db(-11), 0, .7)
for tt, up in [(85.2, 0), (88.3, 1), (90.9, 0), (94.2, 1)]: add(tt, (sweep(240, 620, 1.3, 1.) if up else sweep(620, 180, 1., 1.)) * np.sin(np.pi * np.linspace(0, .98, int((1.3 if up else 1.) * SR))) ** 2, db(-27), 0, .7); add(tt, tink(3000, .5, .8), db(-22), 0, .8)
# —— 留一半 ——
add(B(48), impact(2.6, 76, 30, .9, .5, .3), db(-12), 0, .7)
add(100.4, thud(.6, 60, .5), db(-16), 0, .6); add(103.1, liquid(1.2), db(-17), 0, .7); add(106.3, tink(2600, .6, .9), db(-19), .3, .8)
for i, f in enumerate([523.25, 659.25, 783.99]): add(110 + i * .3, ding(f), db(-29), (-1) ** i * .25, 1.)
# —— 钢仓 ——
hail(B(56) + .4, 123, lambda t: 44, -28, .8, .4)
add(123.1, tink(3400, 1.1, 1.1), db(-14), 0, 1.)
for i, f in enumerate([523.25, 783.99]): add(124.5 + i * .9, ding(f), db(-29 - i * 2), 0, 1.)

bus = np.zeros_like(dry); bus[:N] = mus * db(-3.4)
sfx = reverb(dry + 0, 2.2, 0) + reverb(wetb, 2.4, 1.) * .55
mix = (bus + sfx)[:int(130.6 * SR)]
mix = mix / max(np.abs(mix).max(), 1e-6) * .96
wavfile.write(ROOT / 'audio/mix_raw.wav', SR, (mix * 32767).astype(np.int16))
def loud(f): return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
val = float([l for l in loud(ROOT / 'audio/mix_raw.wav').splitlines() if l.strip().startswith('I:')][-1].split()[1]); print('原始', val)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'audio/mix_raw.wav'), '-af', f'volume={-14 - val}dB,alimiter=limit=0.7:attack=4:release=80:level=disabled', '-t', '130.6', '-ar', '48000', str(ROOT / 'audio/mix.wav')])
print('\n'.join(l for l in loud(ROOT / 'audio/mix.wav').splitlines()[-14:] if any(k in l for k in ('I:', 'LRA:', 'Peak:'))))
