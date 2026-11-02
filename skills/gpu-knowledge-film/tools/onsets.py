import sys,subprocess
import numpy as np
from scipy.signal import stft,find_peaks
SR=22050
f=sys.argv[1]
raw=subprocess.run(["ffmpeg","-v","error","-i",f,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,np.float32)
F,T,Z=stft(x,SR,nperseg=2048,noverlap=2048-256); M=np.abs(Z); fps=SR/256
L=np.log1p(M*50); fl=np.maximum(0,np.diff(L,axis=1)).sum(0); fl=(fl-np.median(fl))/ (fl.std()+1e-9)
pk,pr=find_peaks(fl,height=3.0,distance=int(.18*fps))
ts=pk/fps
print("强起音数",len(ts))
print("最强 40 个:",sorted([(round(float(ts[i]),2),round(float(pr['peak_heights'][i]),1)) for i in np.argsort(-pr['peak_heights'])[:40]]))
# 速度：自相关
d=fl-fl.mean(); ac=np.correlate(d,d,'full')[len(d)-1:]
lo,hi=int(fps*60/200),int(fps*60/50); seg=ac[lo:hi]
peaks,_=find_peaks(seg,distance=8); top=sorted(peaks,key=lambda k:-seg[k])[:6]
print("候选 BPM:",[round(60*fps/(k+lo),1) for k in top])
# 能量逐 0.5 秒
e=np.sqrt((M**2).sum(0)); step=int(.5*fps); E=np.array([e[i:i+step].mean() for i in range(0,len(e),step)]); m=E.max()
line="".join("▁▂▃▄▅▆▇█"[min(7,int(v/m*7.99))] for v in E)
for i in range(0,len(line),40): print("%5.1f %s"%(i*.5,line[i:i+40]))
