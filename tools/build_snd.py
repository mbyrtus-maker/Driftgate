#!/usr/bin/env python3
"""Build Driftgate's sound pack: trim, fade, loudness-normalise and encode clips as small mono MP3s, base64 in one JSON.
Sources (all CC0 / free for commercial use, no credit required):
  Kenney Sci-Fi Sounds, Kenney Interface Sounds, Kenney Digital SFX Set, SpaceSFX1 by messersm."""
import subprocess,json,base64,os,sys,numpy as np
S='/home/claude/snd/src/'
SF=S+'sci-fi_sounds/Audio/';IF=S+'kenney_interfaceSounds/Audio/';DG=S+'Digital_SFX_Set/';SP=S+'SpaceSFX1/SpaceSFX1/'
def find(base,name):
  for r,_,fs in os.walk(base):
    if name in fs:return os.path.join(r,name)
  raise FileNotFoundError(base+name)
SR=22050
# name: (dir, file, start s, max dur s, fade-out s, target rms)
C={
 # guns
 'kin1':(SF,'laserSmall_000.ogg',0,.3,.08,.16),'kin2':(SF,'laserSmall_003.ogg',0,.3,.08,.16),'kin3':(SF,'laserSmall_004.ogg',0,.35,.1,.16),
 'npc1':(SF,'laserRetro_004.ogg',0,.28,.08,.14),'npc2':(SF,'laserRetro_001.ogg',0,.26,.08,.14),'npc3':(SP,'laser6.ogg',0,.32,.08,.14),
 'tur1':(SF,'laserLarge_001.ogg',0,.55,.2,.14),'tur2':(SF,'laserLarge_003.ogg',0,.55,.2,.14),
 'pd1':(SF,'laserSmall_001.ogg',0,.2,.06,.13),'pd2':(SF,'laserSmall_002.ogg',0,.22,.06,.13),
 'lance':(SF,'laserLarge_000.ogg',0,.7,.25,.16),
 'msl1':(SF,'thrusterFire_001.ogg',.1,1.1,.6,.14),'msl2':(SF,'thrusterFire_003.ogg',.6,1.1,.6,.14),
 # explosions and hits
 'ex1':(SF,'explosionCrunch_000.ogg',0,.78,.3,.2),'ex2':(SF,'explosionCrunch_001.ogg',0,1.3,.5,.2),'ex3':(SF,'explosionCrunch_002.ogg',0,1.2,.5,.2),
 'exB':(SF,'explosionCrunch_004.ogg',0,1.95,.8,.2),'sub1':(SF,'lowFrequency_explosion_000.ogg',0,2,.9,.22),'sub2':(SF,'lowFrequency_explosion_001.ogg',0,1,.5,.22),
 'exS1':(SP,'explosion2.ogg',0,.45,.2,.18),'exS2':(SP,'explosion3.ogg',0,.54,.25,.18),
 'shd1':(SF,'forceField_000.ogg',0,.5,.3,.15),'shd2':(SF,'forceField_002.ogg',0,.5,.3,.15),'shd3':(SF,'forceField_004.ogg',0,.5,.3,.15),
 'hul1':(SF,'impactMetal_002.ogg',0,.47,.2,.18),'hul2':(SF,'impactMetal_004.ogg',0,.39,.15,.18),'hul3':(SF,'impactMetal_000.ogg',0,.55,.2,.18),
 'shdDn':(SF,'forceField_001.ogg',0,.95,.4,.15),'lowDown':(DG,'lowDown.mp3',0,.73,.2,.15),
 # movement and jumps
 'boost':(SF,'thrusterFire_000.ogg',.2,1.1,.6,.14),'warp':(SP,'warpout.ogg',0,3,1.4,.1),'phase1':(DG,'phaseJump1.mp3',0,.41,.1,.12),'phase3':(DG,'phaseJump3.mp3',0,.37,.1,.12),
 # mechanical: docking, hatch, seats
 'clk1':(SF,'impactMetal_003.ogg',0,.6,.25,.16),'clk2':(SF,'impactMetal_001.ogg',0,.69,.3,.18),
 'door':(SF,'doorClose_001.ogg',0,.53,.15,.1),'doorO':(SF,'doorOpen_000.ogg',0,.53,.15,.1),
 # interface and bridge
 'tick':(IF,'select_003.ogg',0,.3,.1,.1),'go':(IF,'confirmation_004.ogg',0,.49,.15,.12),'ok':(IF,'confirmation_001.ogg',0,.29,.1,.12),
 'err':(IF,'error_006.ogg',0,.5,.15,.1),'warn':(IF,'error_008.ogg',0,.14,.05,.1),'alarm':(DG,'lowThreeTone.mp3',0,.96,.2,.12),
 'dist':(DG,'threeTone2.mp3',0,1.13,.3,.1),
 'cb1':(IF,'glass_002.ogg',0,.12,.04,.06),'cb2':(IF,'glass_003.ogg',0,.12,.04,.06),'cb3':(IF,'glass_006.ogg',0,.13,.04,.06),'cb4':(IF,'select_001.ogg',0,.04,.01,.06),'cb5':(IF,'tick_004.ogg',0,.06,.02,.06),'cb6':(IF,'pluck_002.ogg',0,.16,.05,.06),
 # docking: thruster puffs, tractor lock, magnetic settle, servo chirps
 'rcs1':(SF,'thrusterFire_002.ogg',.3,.24,.16,.12),'rcs2':(SF,'thrusterFire_004.ogg',.5,.22,.15,.12),'lockon':(DG,'zapThreeToneUp.mp3',0,.9,.3,.1),'settle':(DG,'phaserDown3.mp3',0,.43,.15,.12),'chirp':(DG,'pepSound3.mp3',0,.38,.12,.08),'chirp2':(DG,'pepSound1.mp3',0,.46,.12,.08),
 'click':(IF,'click_002.ogg',0,.05,.01,.08),'click2':(IF,'select_002.ogg',0,.04,.01,.08),
 'swOn':(IF,'switch_003.ogg',0,.3,.1,.1),'swOff':(IF,'switch_005.ogg',0,.3,.1,.1),
 'ore1':(IF,'drop_002.ogg',0,.19,.06,.1),'ore2':(IF,'drop_003.ogg',0,.19,.06,.1),'ore3':(IF,'drop_004.ogg',0,.28,.08,.1),
}
# seamless loops: (dir, file, start, loop length, crossfade, rms) -> stored with wrap padding so loopStart/End survive MP3 priming
LOOPS={'bridgeHum':(SF,'computerNoise_003.ogg',.2,4,.6,.08)}
PAD=.12
def load(f):
  r=subprocess.run(['ffmpeg','-v','quiet','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True);return np.frombuffer(r.stdout,np.float32).copy()
def norm(x,rms):
  r=np.sqrt((x**2).mean())+1e-9;x=x*(rms/r);pk=np.abs(x).max()
  if pk>.97:x*=.97/pk
  return x
def enc(x):
  p=subprocess.run(['ffmpeg','-v','quiet','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','48k','-f','mp3','-'],input=x.astype(np.float32).tobytes(),capture_output=True,check=True);return p.stdout
out={};meta={}
for k,(d,f,st,du,fo,rms) in C.items():
  x=load(find(d,f));a=int(st*SR);x=x[a:a+int(du*SR)]
  # trim leading silence
  nz=np.where(np.abs(x)>.01)[0];x=x[max(0,nz[0]-20):] if len(nz) else x
  n=min(len(x),int(fo*SR));x[-n:]*=np.linspace(1,0,n)**1.5;x[:30]*=np.linspace(0,1,30)
  x=norm(x,rms);b=enc(x);out[k]=base64.b64encode(b).decode();meta[k]=[round(len(x)/SR,3)]
for k,(d,f,st,L,X,rms) in LOOPS.items():
  x=load(find(d,f));a=int(st*SR);n=int(L*SR);m=int(X*SR);seg=x[a:a+n+m].copy()
  lp=seg[:n].copy();w=np.linspace(0,1,m);lp[:m]=lp[:m]*w+seg[n:n+m]*(1-w)  # tail fades into head
  p=int(PAD*SR);full=np.concatenate([lp[-p:],lp,lp[:p]]);full=norm(full,rms)
  b=enc(full);out[k]=base64.b64encode(b).decode();meta[k]=[round(len(full)/SR,3),PAD,PAD+L]
js=json.dumps({'m':meta,'d':out},separators=(',',':'))
open('/home/claude/snd/sndpack.json','w').write(js)
print(len(C)+len(LOOPS),'clips',round(len(js)/1024),'KB base64')
