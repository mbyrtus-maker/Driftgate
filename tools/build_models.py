# Builds Driftgate's model pack: every model becomes triangles + a colour ROLE per triangle, recoloured per faction at runtime.
import sys,json,struct,math,base64,colorsys;sys.path.insert(0,'.')
import numpy as np
from mdl import load_glb,load_obj,tri_colors
from station import Comp,piece,build_station
from frigate import build_frigate
from capitals import build_carrier,build_escort
from rockbase import build_rockbase
from brood import BROOD_MODELS
from works import WORKS
KD='/home/claude/kenney/sk/Models/GLTF format/';QD='/home/claude/qlp/OBJ/'
LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN=0,1,2,3,4,5,6
def kenney_role(c):
    c=np.array(c[:3],dtype=float);h,s,v=colorsys.rgb_to_hsv(*c)
    if s>.35 and v>.3:return ACC,1.0
    if v>.95:return LIGHT,1.06
    if v>.8:return LIGHT,1.0
    if v>.55:return MID,1.0
    return DARK,1.0
MOUNTS={}
def comp_model(build,name=None):
    M=build()
    if name:MOUNTS[name]=M.get('mounts',[])
    if name and M.get('subs'):SUBS[name]=M['subs']
    return M['P'],M['N'],[kenney_role(c) for c in M['cols']]
def glb_model(name):
    M=load_glb(KD+name+'.glb');return M['P'],M['N'],[kenney_role(c) for c in tri_colors(M)]
def ql_model(i):
    M=load_obj(QD+f'Spaceship{i}.obj');P=M['P'];mx=np.abs(P.reshape(-1,3)[:,0]).max();R=[]
    for t,c in zip(P,M['C']):
        n=np.cross(t[1]-t[0],t[2]-t[0]);n/=np.linalg.norm(n)+1e-12;ce=t.mean(0)
        if c[4]!='White':R.append((GLASS,1));continue
        if abs(n[1])>.55 and abs(ce[0])>.62*mx:R.append((ACC,1));continue
        if n[1]>.55 and abs(ce[0])<.09*mx:R.append((ACC,.95));continue
        R.append((LIGHT,.94+.06*np.sign(n[1])))
    return P,M['N'],R
def cap_model(build,name):
    M=build();MOUNTS[name]=M.get('mounts',[]);GLOW_N[name]=M['glow_n']
    if M.get('pts'):PTS[name]=M['pts']
    if M.get('eng'):ENGX[name]=M['eng']
    if M.get('subs'):SUBS[name]=M['subs']
    R=[kenney_role(c) for c in M['cols']]
    for k in M.get('win',[]):R[k]=(WIN,1.0)   # lit gallery panels
    return M['P'],M['N'],R
def comp(parts,name=None):
    def b():
        S=Comp()
        for p in parts:S.add(*p)
        return S.model()
    return comp_model(b,name)
SUBS={}  # sub-target points (model space) by system: 'eng','shd','torp','bay','ring'
# the depot's sub-targets: the ringed generator under the lower dome, its three small hangars and the corridors to them
SUBS['depot']={'shd':[(0,-2.4,0)],'bay':[(math.sin(i*2.094)*4.0,0,math.cos(i*2.094)*4.0) for i in range(3)],'ring':[(math.sin(i*2.094)*2.4,0,math.cos(i*2.094)*2.4) for i in range(3)]}
PTS={}  # explicit docking ports (model space) for models whose arm tips can't be found from the silhouette
def rockbase():
    M=build_rockbase();MOUNTS['rockbase']=M['mounts'];PTS['rockbase']=M['ports']
    return M['P'],M['N'],list(M['rock'])+[kenney_role(c) for c in M['cols']]
GLOW_N={}
ENGX={}   # explicit engine flares (model space x,y,z,r) for builders that place their drives exactly
ENGZ=[]  # models where only the first N triangles may become engine glow (bolted-on parts stay unlit)
def scout2():
    # the Advanced Scout: the scout hull with a missile pod slung under each wing, a swarm box on the spine and a sensor dish aft
    P,N,R=ql_model(2);S=Comp();sc=.62
    for sx in (-1,1):
        for k in range(4):S.add('rocket_fuelA',(1.85*sx,-.32,-.55+k*.5*sc),0,sc,False,math.pi/2)
        S.add('rocket_topA',(1.85*sx,-.32,-.55+4*.5*sc),0,sc,False,math.pi/2)
    S.add('machine_barrel',(0,1.05,-.45),math.pi/2,1.15);S.add('satelliteDish',(0,1.4,-1.05),math.pi,.95)
    M=S.model();GLOW_N['scout2']=len(P);return np.concatenate([np.array(P).reshape(-1,3,3),M['P']]),list(N)+list(M['N']),list(R)+[kenney_role(c) for c in M['cols']]
# the kit's miner flies blunt end first with its two long arms trailing; turned about so the arms lead into the rock and
# the drives sit in the dark openings at the blunt end (only those dark recesses glow, not the whole back plate)
def aboutface(m):
    P,N,R=m;P=np.array(P,dtype=float).reshape(-1,3,3)*np.array([-1,1,-1])
    return P,[(None if n is None else np.array(n,dtype=float)*np.array([-1,1,-1])) for n in N],R
DARK_GLOW={'skiff','prospector','dredger'}
H=math.pi
MODELS={
 'interceptor':('ship',lambda:ql_model(4)),'striker':('ship',lambda:ql_model('')),'heavy':('ship',lambda:ql_model(5)),'bomber':('ship',lambda:ql_model(3)),'scout':('ship',lambda:ql_model(2)),'scout2':('ship',scout2),
 'picket':('ship',lambda:glb_model('craft_speederB')),'gunboat':('ship',lambda:glb_model('craft_speederD')),
 'skiff':('ship',lambda:aboutface(glb_model('craft_miner'))),
 'prospector':('ship',lambda:aboutface(comp([('craft_miner',(0,0,0),0,1),('machine_barrel',(.95,.15,-.2),0,.55),('machine_barrel',(-.95,.15,-.2),0,.55)]))),
 'dredger':('ship',lambda:aboutface(comp([('craft_miner',(0,0,0),0,1),('pipe_straight',(.75,.05,1.0),0,.6),('pipe_straight',(-.75,.05,1.0),0,.6),('machine_generator',(0,.62,-.5),0,.7),('machine_barrel',(1.05,.1,-.5),0,.6),('machine_barrel',(-1.05,.1,-.5),0,.6)]))),
 'courier':('ship',lambda:glb_model('craft_cargoA')),'freighter':('ship',lambda:glb_model('craft_cargoB')),
 'bulker':('ship',lambda:comp([('craft_cargoB',(0,0,0),0,1),('barrels_rail',(.95,.1,-.1),0,.8),('barrels_rail',(-.95,.1,-.1),0,.8),('barrels',(0,.85,-.4),0,.7)])),
 'constructor':('ship',lambda:comp([('craft_cargoA',(0,0,0),0,1.1),('structure',(0,.85,-.35),0,.8),('machine_wireless',(0,1.65,-.35),0,.7),('pipe_supportLow',(.9,.1,.4),0,.5),('pipe_supportLow',(-.9,.1,.4),0,.5)])),
 'carrier':('ship',lambda:cap_model(build_carrier,'carrier')),'escort':('ship',lambda:cap_model(build_escort,'escort')),   # the frigate (retired) is no longer packed
 'station':('struct',lambda:comp_model(build_station,'station')),
 'depot':('struct',lambda:comp([('hangar_roundGlass',(0,0,0),0,1.3),('hangar_roundGlass',(0,0,0),H,1.3,True),('machine_generatorLarge',(0,-1.8,0),0,1.6,True),('pipe_ring',(0,-1.8,0),0,1.9,True)]+[x for i in range(3) for x in [('corridor_window',(math.sin(i*2.094)*2.4,-.5,math.cos(i*2.094)*2.4),i*2.094,1),('hangar_smallA',(math.sin(i*2.094)*4.0,-.5,math.cos(i*2.094)*4.0),i*2.094+H,1),('turret_single',(math.sin(i*2.094)*4.0,.55,math.cos(i*2.094)*4.0),i*2.094,1)]]+[('satelliteDish',(0,1.8,0),0,1.2)],'depot')),
 'forge':('struct',lambda:comp([('machine_generatorLarge',(0,0,0),0,2.2),('machine_generatorLarge',(0,0,0),H,2.2,True),('rocket_fuelA',(0,1.5,0),0,1.6)]+[x for i in range(4) for x in [('pipe_straight',(math.sin(i*1.571)*2.0,-.3,math.cos(i*1.571)*2.0),i*1.571,1.1),('machine_barrelLarge',(math.sin(i*1.571)*3.2,-.6,math.cos(i*1.571)*3.2),i*1.571,1.1),('chimney_detailed',(math.sin(i*1.571+.785)*1.6,.9,math.cos(i*1.571+.785)*1.6),0,.9)]])),
 'relay':('struct',lambda:comp([('structure_closed',(0,-.5,0),0,1.6),('rocket_sidesA',(0,1.1,0),0,1.2),('rocket_fuelA',(0,2.3,0),0,1.2),('satelliteDish_large',(0,2.9,0),0,2.4),('satelliteDish_large',(0,-.5,0),H,1.8,True)]+[x for i in range(3) for x in [('corridor',(math.sin(i*2.094)*1.8,-.5,math.cos(i*2.094)*1.8),i*2.094,1),('machine_wireless',(math.sin(i*2.094)*2.9,-.5,math.cos(i*2.094)*2.9),i*2.094,1.2)]])),
 'rockbase':('struct',rockbase),
 'yard':('struct',lambda:comp([('hangar_largeA',(0,0,0),0,1.6),('hangar_largeA',(0,0,0),H,1.6,True),('platform_large',(2.6,-.2,0),H/2,1.3),('platform_large',(-2.6,-.2,0),H/2,1.3),('supports_high',(2.6,.0,1.1),0,1),('supports_high',(-2.6,.0,-1.1),0,1),('barrels_rail',(2.6,0,-.6),0,.9),('craft_cargoA',(-2.6,0,.5),H/2,.7),('machine_generator',(0,1.7,0),0,1)])),
}
for _k,_f in BROOD_MODELS.items():
    if _k=='b_leviathan':continue   # the old frigate-class Leviathan isn't packed: the Hive Ship replaced it
    MODELS[_k]=('ship',_f);GLOW_N[_k]=0   # Brood: glow comes from their sacs and vents, not the stern rule
for _k,_v in WORKS.items():MODELS[_k]=('struct',_v[0] if len(_v)>2 else (lambda f:lambda:comp_model(f))(_v[0]))
FIT={'rockbase':230,'station':150,'depot':105,'forge':120,'relay':120,'yard':120,**{k:v[1] for k,v in WORKS.items()}}
def pack():
    idx={};blob=bytearray()
    for name,(kind,fn) in MODELS.items():
        P,N,R=fn();P=np.array(P,dtype=float).reshape(-1,3,3)
        allp=P.reshape(-1,3);lo,hi=allp.min(0),allp.max(0);c=(lo+hi)/2
        if kind=='struct':c[1]=(lo[1]+hi[1])/2
        P=P-c;half=max(hi-lo)/2;P=P/half          # longest half-extent = 1 (ships draw at radius x1.25, like the hand-built ones)
        tris=[];roles=[];shades=[]
        zlo=P[:,:,2].min();L=P[:,:,2].max()-zlo
        for k,t in enumerate(P):
            n=np.cross(t[1]-t[0],t[2]-t[0]);l=np.linalg.norm(n)
            if l<1e-9:continue
            n/=l;vn=N[k] if k<len(N) else None
            if vn is not None and np.dot(n,np.array(vn,dtype=float))<0:t=t[[0,2,1]];n=-n
            r,sh=R[k]
            if kind=='ship' and k<GLOW_N.get(name,1<<30) and n[2]<-.8 and t[:,2].mean()<zlo+.3*L and r!=GLASS and (name not in DARK_GLOW or r==DARK):r=GLOW   # aft-facing faces at the stern glow as engines
            if kind=='struct' and r==DARK:r=WIN                                             # dark recesses on structures read as lit windows
            tris.append(t);roles.append(r);shades.append(sh)
        T=np.array(tris);q=np.clip(np.round(T*32767),-32767,32767).astype('<i2')
        eng=[]
        if kind=='ship':
            G=[T[k].mean(0) for k in range(len(T)) if roles[k]==GLOW];cl=[]
            for g in G:
                for C in cl:
                    if np.linalg.norm(C['c']/C['n']-g)<.18:C['c']+=g;C['n']+=1;C['p'].append(g);break
                else:cl.append({'c':g.copy(),'n':1,'p':[g]})
            cl.sort(key=lambda C:-C['n'])
            for C in cl[:3]:
                ce=C['c']/C['n'];rad=max(.04,min(.08 if name in('frigate','carrier','escort') else .2,max(np.linalg.norm(p-ce) for p in C['p'])+.03));cz=min(float(p[2]) for p in C['p']);ez=zlo if cz-zlo<.06 else cz-.01;ENGZ.append((name,round(float(zlo),3),round(cz,3)));eng.append([round(float(ce[0]),3),round(float(ce[1]),3),round(float(ez),3),round(float(rad),3)])
            if not eng:eng=[[0,0,round(float(zlo),3),.1]]
        while len(blob)%4:blob+=b'\0'
        off=len(blob);blob+=q.tobytes();blob+=bytes(roles);blob+=bytes(int(np.clip(s*100,0,255)) for s in shades)
        if name in ENGX:eng=[[round(float(v),3) for v in list((np.array(m[:3])-c)/half)+[m[3]/half]] for m in ENGX[name]]
        tp=[[round(float(x),3) for x in (np.array(m)-c)/half] for m in MOUNTS.get(name,[])]
        pt=[[round(float(x),3) for x in (np.array(m)-c)/half] for m in PTS.get(name,[])]
        sb={k:[[round(float(x),3) for x in (np.array(m)-c)/half] for m in v] for k,v in SUBS.get(name,{}).items()}
        idx[name]={'o':off,'n':len(T),'k':kind,'s':FIT.get(name,1),'e':eng,'tp':tp,'top':round(float(T[:,:,1].max()),3),**({'pt':pt} if pt else {}),**({'sub':sb} if sb else {})}
        print(name.ljust(12),kind,len(T),'tris',('eng %d'%len(eng)) if eng else '')
    return idx,bytes(blob)
idx,blob=pack()
for r in ENGZ:
    if r[2]-r[1]>=.06:print('engine moved forward to its vent:',r)
import gzip
gz=gzip.compress(blob,9)
open('models_idx.json','w').write(json.dumps(idx,separators=(',',':')))
open('models_gz.b64','w').write(base64.b64encode(gz).decode())
print('total',len(blob)//1024,'KB raw',len(gz)//1024,'KB gz',len(base64.b64encode(gz))//1024,'KB b64')
