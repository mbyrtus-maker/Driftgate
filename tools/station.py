import sys;sys.path.insert(0,'.')
from mdl import *
KD='/home/claude/kenney/sk/Models/GLTF format/'
_cache={}
def piece(name):
    if name not in _cache:
        M=load_glb(KD+name+'.glb');P=M['P'].reshape(-1,3);lo,hi=P.min(0),P.max(0)
        c=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]);_cache[name]=(M['P']-c,tri_colors(M),[np.array(n) if n is not None else None for n in M['N']],hi-lo)
    return _cache[name]
def ry(a):c,s=math.cos(a),math.sin(a);return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def rx(a):c,s=math.cos(a),math.sin(a);return np.array([[1,0,0],[0,c,-s],[0,s,c]])
class Comp:
    def __init__(s):s.P=[];s.C=[];s.N=[];s.mounts=[]
    def add(s,name,pos=(0,0,0),rot=0,sc=1,flip=False,tilt=0):
        P,C,N,_=piece(name);R=ry(rot)@rx(tilt)
        if name.startswith('turret'):s.mounts.append(np.array(pos,dtype=float)+np.array([0,(-.45 if flip else .45)*sc,0]))
        if flip:R=R@rx(math.pi)
        Pw=(P.reshape(-1,3)*sc)@R.T+np.array(pos);s.P+=list(Pw.reshape(-1,3,3));s.C+=list(C);s.N+=[(R@n if n is not None else None) for n in N]
    def model(s):return dict(P=np.array(s.P),N=s.N,C=[list(c)+['flat'] for c in s.C],cols=np.array(s.C),U=None,tex=None,mounts=s.mounts)
def build_station():
    S=Comp();T=1.7
    # central tower, mirrored above and below the ring
    for f in (False,True):
        sg=-1 if f else 1;y=0.5*sg
        S.add('rocket_baseA',(0,y,0),0,T,f);y+=1.6*T*sg
        for k in range(2):S.add('rocket_fuelA',(0,y,0),k*.5,T,f);y+=.5*T*sg
        S.add('rocket_sidesA',(0,y,0),0,T,f);y+=1*T*sg
        if not f:S.add('rocket_topA',(0,y,0),0,T,f);S.add('satelliteDish_large',(0,y+.8*T,0),0,1.6)
        else:S.add('machine_generatorLarge',(0,y,0),0,T,True)
    # four spokes of windowed corridor out to docking hangars
    for i in range(4):
        a=i*math.pi/2;d=np.array([math.sin(a),0,math.cos(a)])
        for k in range(3):
            r=1.9+k*1.0;S.add('corridor_window' if k%2==0 else 'corridor',tuple(d*r+np.array([0,-.5,0])),a,1)
        S.add('hangar_largeA',tuple(d*6.6+np.array([0,-.5,0])),a+math.pi,1.2)
        S.add('turret_double',tuple(d*6.6+np.array([0,.72,0])),a,1.1)
        S.add('pipe_ring',tuple(d*4.4+np.array([0,.55,0])),a,.9)
    # an outer frame of girders between the hangars
    for i in range(4):
        a=i*math.pi/2+math.pi/4;d=np.array([math.sin(a),0,math.cos(a)])
        S.add('machine_wireless',tuple(d*5.2+np.array([0,.5,0])),a,1)
    return S.model()
