# -*- coding: utf-8 -*-
"""同一把尺子量片子：每条抽 8 fps 的 192x108 RGB 帧，算运动、切镜、亮度、细节。"""
import sys, json, subprocess
from pathlib import Path
import numpy as np
W,H,FPS = 192,108,8
def frames(f, w=W, h=H):
    # 保持比例居中裁 16:9 外的部分，不拉伸
    vf = f"fps={FPS},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    p = subprocess.run(["ffmpeg","-v","error","-i",str(f),"-vf",vf,"-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True)
    a = np.frombuffer(p.stdout,np.uint8)
    n = len(a)//(w*h*3)
    return a[:n*w*h*3].reshape(n,h,w,3).astype(np.float32)/255
def lum(x): return .2126*x[...,0]+.7152*x[...,1]+.0722*x[...,2]
def measure(f):
    x = frames(f); L = lum(x); n=len(L)
    d = np.abs(np.diff(L,axis=0)).mean((1,2))           # 帧差
    # 切镜：帧差 > 局部中位 + 强阈值
    med = np.median(d)
    cuts = np.where(d > max(.035, med*6))[0]
    # 合并 0.4s 内
    c=[]; 
    for i in cuts:
        if not c or i-c[-1] > FPS*.4: c.append(int(i))
    # 运动占比：每帧变化超过 2/255 的像素比例
    pix = (np.abs(np.diff(L,axis=0))>.03).mean((1,2))
    # 块匹配估全局运动（镜头在动）: 用相位相关
    # 空间细节：拉普拉斯能量
    lap = np.abs(L[:,1:-1,1:-1]*4-L[:,:-2,1:-1]-L[:,2:,1:-1]-L[:,1:-1,:-2]-L[:,1:-1,2:]).mean((1,2))
    # 亮度分布
    sat = x.max(-1)-x.min(-1)
    res = dict(
      dur=n/FPS,
      motion_mean=float(d.mean()*100), motion_p90=float(np.percentile(d,90)*100),
      moving_pix=float(pix.mean()*100),
      still_ratio=float((d<.002).mean()*100),
      cuts=len(c), cuts_per_min=len(c)/(n/FPS)*60,
      luma_mean=float(L.mean()*100),
      lit_pix=float((L>.12).mean()*100),      # 非黑面积
      bright_pix=float((L>.6).mean()*100),    # 高亮面积
      peak=float(np.percentile(L,99.9)*100),
      color=float(sat.mean()*100),
      vivid_pix=float((sat>.35).mean()*100),
      detail=float(lap.mean()*100),
      frame_var=float(L.mean((1,2)).std()*100),   # 全片明暗起伏
    )
    return res, c
if __name__=="__main__":
    out={}
    for spec in sys.argv[2:]:
        name,f = spec.split("=",1)
        r,c = measure(f); r["cut_times"]=[round(i/FPS,1) for i in c]; out[name]=r
        print(name, {k:round(v,2) for k,v in r.items() if k not in("cut_times",)},flush=True)
    json.dump(out,open(sys.argv[1],"w"),ensure_ascii=False,indent=0)
