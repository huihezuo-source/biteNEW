import sys,glob,subprocess,shutil,os
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
shutil.rmtree('out/rv',ignore_errors=True); os.makedirs('out/rv')
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-vf","fps=1,scale=360:-2","-q:v","3","out/rv/f_%03d.jpg"])
fs=sorted(glob.glob('out/rv/f_*.jpg')); pg=0
for i in range(0,len(fs),40):
    ims=[Image.open(f) for f in fs[i:i+40]]; w,h=ims[0].size
    S=Image.new('RGB',(8*(w+3),5*(h+3)),(40,40,40))
    for k,im in enumerate(ims): S.paste(im,((k%8)*(w+3),(k//8)*(h+3)))
    S=S.resize((S.width*2//3,S.height*2//3)); S.save(f'{dst}/rv{pg}.jpg',quality=88); shutil.copy(f'{dst}/rv{pg}.jpg',f'out/rv/page_{pg}.jpg'); pg+=1
print(pg,len(fs))
