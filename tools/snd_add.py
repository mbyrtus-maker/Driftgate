#!/usr/bin/env python3
"""Add or replace clips in the sound pack (src/data/sndpack.html) without the original kits.

build_snd.py rebuilds the whole pack from the CC0 kits, which are not kept in the repository. This adds clips cut from
other files to the pack that is already there, encoded the same way (mono, 22.05 kHz, 48 kbit MP3, base64).

  python3 tools/snd_add.py DIR      DIR holds the source files named in EXTRA

Sources (supplied by the user on 14 Nov 2026; the file names follow Pixabay's pattern, whose licence allows use in a
game without credit but not passing the files on by themselves, so the files are not kept in the repository):
  freesound_community-short-beep-countdown-81121.mp3   three 420 Hz beeps a second apart, then a 720 Hz beep
  benvibrant-hyper-jump-sfx-562716.mp3                 a 4.8 s charge, the jump's blast at 4.80 s, a tail to about 9.5 s
"""
import subprocess,json,base64,os,sys,re,numpy as np
SR=22050
HERE=os.path.dirname(os.path.abspath(__file__));PACK=os.path.join(HERE,'..','src','data','sndpack.html')
# name: (file ending, start s, length s, fade-in s, fade-out s, level)
#   level ('rms',x): scale the whole clip to that rms; ('win',a,b,x): scale so the stretch from a to b s (of the clip) has rms x
EXTRA={
 'cdBeep':('short-beep-countdown-81121.mp3',0.0,0.56,.005,.012,('rms',.12)),
 'cdGo':('short-beep-countdown-81121.mp3',3.0,0.53,.005,.05,('rms',.12)),
 'hjump':('hyper-jump-sfx-562716.mp3',0.0,9.6,.02,1.5,('win',4.8,6.5,.2)),
}
# clips whose timing matters keep their leading quiet; the beeps lose theirs
KEEP_LEAD={'hjump'}
def find(d,end):
  for f in sorted(os.listdir(d)):
    if f.endswith(end):return os.path.join(d,f)
  raise FileNotFoundError(end+' in '+d)
def load(f):
  r=subprocess.run(['ffmpeg','-v','quiet','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True);return np.frombuffer(r.stdout,np.float32).copy()
def enc(x):
  p=subprocess.run(['ffmpeg','-v','quiet','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','48k','-f','mp3','-'],input=x.astype(np.float32).tobytes(),capture_output=True,check=True);return p.stdout
def main(d):
  h=open(PACK).read();m=re.match(r'(<script[^>]*>)(.*)(</script>)\s*$',h,re.S);pack=json.loads(m.group(2))
  for k,(end,st,du,fi,fo,lv) in EXTRA.items():
    x=load(find(d,end));a=int(st*SR);x=x[a:a+int(du*SR)].copy()
    if k not in KEEP_LEAD:
      nz=np.where(np.abs(x)>.01)[0];x=x[max(0,nz[0]-20):] if len(nz) else x
    n=max(1,int(fi*SR));x[:n]*=np.linspace(0,1,n);n=max(1,min(len(x),int(fo*SR)));x[-n:]*=np.linspace(1,0,n)**1.5
    seg=x if lv[0]=='rms' else x[int(lv[1]*SR):int(lv[2]*SR)]
    x=x*(lv[-1]/(np.sqrt((seg**2).mean())+1e-9));pk=np.abs(x).max()
    if pk>.97:x*=.97/pk
    b=enc(x);pack['d'][k]=base64.b64encode(b).decode();pack['m'][k]=[round(len(x)/SR,3)]
    print(k,'%.2f s'%(len(x)/SR),'%d KB'%(len(b)/1024),'peak %.2f'%np.abs(x).max())
  js=json.dumps(pack,separators=(',',':'));open(PACK,'w').write(m.group(1)+js+m.group(3)+('\n' if h.endswith('\n') else ''))
  print(len(pack['d']),'clips',round(len(js)/1024),'KB')
if __name__=='__main__':main(sys.argv[1])
