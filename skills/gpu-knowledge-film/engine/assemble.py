#!/usr/bin/env python3
# 把补渲片段按帧换回整片，压缩成交付版
import subprocess
SRC, PAT = 'out/film.mp4', [(1125,1416),(1545,1902),(2055,2235),(2607,2631),(2937,3426),(4140,4830)]
TOTAL, OUT = 4830, 'out/film_final.mp4'
inp = ['-i', SRC]; seq = []; pos = 0
for n, (a, b) in enumerate(PAT, 1):
    inp += ['-i', f'out/patch/p{n}.mp4']
    if a > pos: seq.append(('f', pos, a))
    seq.append(('p', n)); pos = b
if pos < TOTAL: seq.append(('f', pos, TOTAL))
gaps = [s for s in seq if s[0] == 'f']
fc = [f"[0:v]split={len(gaps)}" + ''.join(f'[s{i}]' for i in range(len(gaps)))]
labels = []; g = 0
for i, s in enumerate(seq):
    if s[0] == 'f': fc.append(f"[s{g}]trim=start_frame={s[1]}:end_frame={s[2]},setpts=PTS-STARTPTS[v{i}]"); g += 1
    else: fc.append(f"[{s[1]}:v]setpts=PTS-STARTPTS[v{i}]")
    labels.append(f'[v{i}]')
fc.append(''.join(labels) + f"concat=n={len(seq)}:v=1:a=0[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', OUT], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames,width,height', '-of', 'csv=p=0', OUT], capture_output=True, text=True).stdout.strip(), 'want', TOTAL)
