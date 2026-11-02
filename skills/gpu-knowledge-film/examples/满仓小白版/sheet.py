import sys,glob
from PIL import Image
pat,out=sys.argv[1],sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 3; h=int(sys.argv[4]) if len(sys.argv)>4 else 640
fs=sorted(glob.glob(pat)); ims=[Image.open(f) for f in fs]
w=int(ims[0].width*h/ims[0].height); rows=(len(ims)+cols-1)//cols
S=Image.new("RGB",(cols*(w+4),rows*(h+4)),(30,30,30))
for i,im in enumerate(ims): S.paste(im.resize((w,h),Image.LANCZOS),((i%cols)*(w+4),(i//cols)*(h+4)))
S.save(out,quality=90); print(S.size,len(ims))
