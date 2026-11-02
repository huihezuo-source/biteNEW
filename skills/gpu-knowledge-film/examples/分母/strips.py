import sys,subprocess
from PIL import Image
import io
src=sys.argv[1]; times=[float(x) for x in sys.argv[2].split(",")]; out=sys.argv[3]
pre=float(sys.argv[4]) if len(sys.argv)>4 else .4; step=float(sys.argv[5]) if len(sys.argv)>5 else .1; n=int(sys.argv[6]) if len(sys.argv)>6 else 10
rows=[]
for t in times:
    fr=[]
    for k in range(n):
        tt=max(0,t-pre+k*step)
        b=subprocess.run(["ffmpeg","-v","error","-ss",f"{tt:.3f}","-i",src,"-frames:v","1","-vf","scale=180:-2","-f","image2pipe","-vcodec","mjpeg","-"],capture_output=True).stdout
        fr.append(Image.open(io.BytesIO(b)).convert("RGB"))
    rows.append(fr)
w,h=rows[0][0].size
S=Image.new("RGB",(n*(w+2),len(rows)*(h+2)),(50,50,50))
for j,r in enumerate(rows):
    for i,f in enumerate(r): S.paste(f,(i*(w+2),j*(h+2)))
S.save(out,quality=88); print(S.size)
