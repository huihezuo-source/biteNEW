#!/usr/bin/env python3
import subprocess, sys
PAT = [(120,358),(1236,1518),(2238,2445),(3177,3240),(3936,3972),(4737,4887)]
for n, (a, b) in enumerate(PAT, 1):
    if n not in (1, 4): continue
    print('片段', n, a, b, flush=True)
    r = subprocess.run(['python3', 'render.py', 'clip', '--from', str(a / 30), '--to', str(b / 30), '--w', '1440', '--h', '1920', '--q', 'final', '--crf', '12', '--out', f'out/patch/p{n}.mp4'], capture_output=True, text=True)
    print(r.stdout[-80:].replace('\r', ' '), r.stderr[-200:], flush=True)
    c = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'out/patch/p{n}.mp4'], capture_output=True, text=True).stdout.strip()
    print('帧数', c, '应为', b - a, flush=True)
print('补渲完成')
