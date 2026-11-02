# -*- coding: utf-8 -*-
"""配乐结构分析：逐秒能量、频谱亮度、低频、调式倾向、段落切点。"""
import sys,subprocess,glob,os
import numpy as np
from scipy.signal import stft
SR=22050
def load(f):
    raw=subprocess.run(["ffmpeg","-v","error","-i",f,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.float32)
def ana(f):
    x=load(f); dur=len(x)/SR
    F,T,Z=stft(x,SR,nperseg=4096,noverlap=4096-1024); M=np.abs(Z)
    fps=SR/1024
    e=np.sqrt((M**2).sum(0)); 
    cent=(F[None,:]@M).ravel()/(M.sum(0)+1e-9)
    low=M[(F<160)].sum(0); hi=M[F>3000].sum(0)
    # 新奇度：对数谱差
    L=np.log1p(M[:400]); flux=np.maximum(0,np.diff(L,axis=1)).sum(0)
    # 每秒
    n=int(dur); sec=lambda a:np.array([a[int(i*fps):int((i+1)*fps)].mean() for i in range(n)])
    E,C,LO,HI,FL=sec(e),sec(cent),sec(low),sec(hi),sec(flux)
    # 调式：chroma 取大小调模板
    from numpy import roll
    fre=F[(F>80)&(F<2000)]; idx=np.where((F>80)&(F<2000))[0]
    pc=(np.round(12*np.log2(fre/261.63))%12).astype(int)
    chroma=np.zeros(12)
    for i,p in zip(idx,pc): chroma[p]+=M[i].sum()
    maj=np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]); mnr=np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
    best=max([(np.corrcoef(chroma,roll(maj,k))[0,1],"C C# D D# E F F# G G# A A# B".split()[k]+" major") for k in range(12)]+[(np.corrcoef(chroma,roll(mnr,k))[0,1],"C C# D D# E F F# G G# A A# B".split()[k]+" minor") for k in range(12)])
    # 段落切点：能量+亮度 8 秒窗对比
    Es=(E-E.mean())/E.std(); w=6
    nov=np.array([abs(Es[max(0,i-w):i].mean()-Es[i:i+w].mean()) if w<=i<n-w else 0 for i in range(n)])
    pk=[i for i in range(2,n-2) if nov[i]==nov[max(0,i-5):i+6].max() and nov[i]>.6]
    return dur,E,C,LO,HI,pk,best
files=sys.argv[1:]
for f in files:
    d,E,C,LO,HI,pk,best=ana(f)
    m=E.max()
    bars="".join("▁▂▃▄▅▆▇█"[min(7,int(v/m*7.99))] for v in E[::2])
    print(os.path.basename(f)[:32],"dur=%.1f"%d,"key≈",best[1],"(%.2f)"%best[0])
    print(" E2s:",bars)
    print(" lowshare:", "".join("▁▂▃▄▅▆▇█"[min(7,int(v/(LO.max())*7.99))] for v in LO[::2]))
    print(" hi     :", "".join("▁▂▃▄▅▆▇█"[min(7,int(v/(HI.max())*7.99))] for v in HI[::2]))
    print(" 切点s:",pk)
