# The Hollow Relay: a large asteroid base. A cratered, lumpy rock with three docking hangars cut into its flanks,
# the relay mast and dish on its crown, glass domes and gun turrets on its slopes and crystal outcrops.
import sys,math;sys.path.insert(0,'/home/claude/driftgate/tools')
import numpy as np
from station import Comp,piece
ROCK,ROCKD=7,8
R0=6.0;FLAT=.72
rng=np.random.default_rng(7)
BUMPS=[(v/np.linalg.norm(v),rng.uniform(-.09,.13),rng.uniform(.25,.7)) for v in rng.normal(size=(34,3))]
CRATERS=[(v/np.linalg.norm(v),rng.uniform(.18,.34)) for v in rng.normal(size=(9,3))]
def rad(d):
    d=d/np.linalg.norm(d);r=1.0
    for c,a,w in BUMPS:r+=a*math.exp(-(math.acos(np.clip(d@c,-1,1))/w)**2)
    for c,w in CRATERS:
        t=math.acos(np.clip(d@c,-1,1))/w
        if t<1:r-=.07*(1-t*t)
        elif t<1.35:r+=.035*(1-(t-1)/.35)
    r+=.03*math.sin(7*d[0]+2)*math.sin(6*d[1]+1)*math.sin(5*d[2])
    return r
def surf(d):
    d=np.array(d,dtype=float);d/=np.linalg.norm(d);r=rad(d);return np.array([d[0]*r*R0,d[1]*r*R0*FLAT,d[2]*r*R0])
def icosphere(n):
    t=(1+5**.5)/2;V=[(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),(t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
    F=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
    V=[np.array(v,float)/np.linalg.norm(v) for v in V]
    for _ in range(n):
        cache={};NF=[]
        def mid(a,b):
            k=(min(a,b),max(a,b))
            if k not in cache:m=V[a]+V[b];V.append(m/np.linalg.norm(m));cache[k]=len(V)-1
            return cache[k]
        for a,b,c in F:ab,bc,ca=mid(a,b),mid(b,c),mid(c,a);NF+=[(a,ab,ca),(b,bc,ab),(c,ca,bc),(ab,bc,ca)]
        F=NF
    return V,F
def build_rockbase():
    V,F=icosphere(4);Pv=[surf(v) for v in V];P=[];N=[];R=[];cols=[]
    for a,b,c in F:
        t=np.array([Pv[a],Pv[b],Pv[c]]);n=np.cross(t[1]-t[0],t[2]-t[0]);n/=np.linalg.norm(n)+1e-12
        ce=t.mean(0);d=ce/np.linalg.norm(ce);depth=rad(d);up=n@d
        dark=depth<.97 or up<.72 or rng.random()<.08
        P.append(t);N.append(n);R.append((ROCKD if dark else ROCK,float(np.clip(.86+.2*rng.random()+.25*(depth-1),.7,1.12))))
    S=Comp();ports=[]
    for i in range(3):   # docking hangars, mouths facing out
        a=i*2*math.pi/3+.35;d=np.array([math.sin(a),0,math.cos(a)]);rs=np.linalg.norm(surf(d)[[0,2]]);y=-.95
        S.add('hangar_largeA',tuple(d*(rs+.9)+np.array([0,y,0])),a+math.pi,1.5)
        S.add('turret_double',tuple(d*(rs+.9)+np.array([0,y+1.5*1.0+.05,0])),a,1.0)
        ports.append(list(d*(rs+.9+2.4)+np.array([0,y+.75,0])))
    top=surf((0,1,0))[1]   # the relay on the crown
    y=top-.5;S.add('rocket_baseA',(0,y,0),0,1.3);y+=1.6*1.3
    for k in range(2):S.add('rocket_fuelA',(0,y,0),k*.5,1.3);y+=.5*1.3
    S.add('rocket_sidesA',(0,y,0),0,1.3);y+=1.3;S.add('rocket_topA',(0,y,0),0,1.3);S.add('satelliteDish_large',(0,y+1.0,0),0,2.4)
    for i in range(3):   # glass domes on platforms half-sunk into the slopes
        a=i*2*math.pi/3+1.4;p=surf((math.sin(a)*.62,.62,math.cos(a)*.62))
        S.add('platform_large',tuple(p+np.array([0,-.25,0])),a,1.2);S.add('hangar_roundGlass',tuple(p+np.array([0,-.2,0])),a,.85)
    for i,(az,el) in enumerate([(.9,.25),(2.9,.1),(4.6,.3),(5.6,-.2),(3.7,-.35)]):   # crystal outcrops
        p=surf((math.cos(el)*math.sin(az),math.sin(el),math.cos(el)*math.cos(az)))*.97;S.add('rock_crystalsLargeA',tuple(p),az,1.5)
    for az in (2.0,4.1):p=surf((math.sin(az)*.8,.45,math.cos(az)*.8));S.add('satelliteDish',tuple(p-np.array([0,.1,0])),az,1.6)
    bot=surf((0,-1,0))[1];S.add('machine_generatorLarge',(0,bot+.4,0),0,1.6,True)
    M=S.model()
    return dict(P=np.concatenate([np.array(P),M['P']]),N=list(N)+list(M['N']),rock=R,cols=M['cols'],mounts=M['mounts'],ports=ports)
