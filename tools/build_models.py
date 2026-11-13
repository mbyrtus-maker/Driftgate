# Builds Driftgate's model pack: every model becomes triangles + a colour ROLE per triangle, recoloured per faction at runtime.
import sys,json,struct,math,base64,colorsys;sys.path.insert(0,'.')
import numpy as np
from mdl import load_glb,load_obj,tri_colors
from station import Comp,piece,build_station
from frigate import build_frigate
from capitals import build_carrier,build_escort
from rockbase import build_rockbase
from brood import BROOD_MODELS
import brood as _BRD
from works import WORKS
from mdlcheck import zlift
import os as _os;_K=_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),'kits');KD=_os.path.join(_K,'kenney-space-kit','GLTF')+'/';QD=_os.path.join(_K,'quaternius-lowpoly-spaceships','OBJ')+'/'
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
# the Brood capitals' organs (model space, from brood.py): spore sacs on the Hive Ship's back and spitter polyps on the Prowler's
# flanks (point defence), drive vents, the Hive Ship's birthing pores (launch bay) and the Prowler's spore launchers (torpedo bays)
SUBS['b_hive']={'pd': [(-0.22, 0.472, -0.36), (0.22, 0.472, -0.36), (-0.227, 0.488, -0.16), (0.227, 0.488, -0.16), (-0.22, 0.472, 0.04), (0.22, 0.472, 0.04)], 'eng': [(-0.06, 0, -1.0), (0.06, 0, -1.0)], 'bay': [(-0.521, -0.06, -0.6), (-0.591, -0.06, -0.4), (-0.618, -0.06, -0.2), (-0.606, -0.06, 0.0), (-0.55, -0.06, 0.2), (0.521, -0.06, -0.6), (0.591, -0.06, -0.4), (0.618, -0.06, -0.2), (0.606, -0.06, 0.0), (0.55, -0.06, 0.2)]}
SUBS['b_prowler']={'pd': [(-0.252, 0.106, 0.395), (-0.252, 0.106, 0.035), (-0.219, 0.106, -0.325), (0.252, 0.106, 0.395), (0.252, 0.106, 0.035), (0.219, 0.106, -0.325)], 'eng': [(-0.05, 0, -0.98), (0.05, 0, -0.98)], 'torp': [(-0.27, -0.065, 0.84), (0.27, -0.065, 0.84)]}
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
# the faction signature hulls (Nov 2026; approved previews in tools/previews): the Varkesh Bombard, a Heavy Miner with twin shell
# cannons on its flanks (turned about like the miners), and the Ostrova Vesper, the scout hull with a twin-rail gun slung under it
def bombard():
    S=Comp();S.add('craft_miner',(0,0,0),0,1)
    for x in (.75,-.75):S.add('pipe_straight',(x,.05,1.0),0,.6)
    for sx in (-1,1):
        S.add('machine_generator',(sx*1.0,.12,-.2),0,.55)
        for k in range(3):S.add('pipe_straight',(sx*1.0,.18,-.45-k*.3),0,.3)
        S.add('pipe_ring',(sx*1.0,.16,-1.33),0,.3)
    return comp_model(lambda:S.model())
def vesper():
    P,N,R=ql_model(2);S=Comp()
    for x in (-.17,.17):
        for k in range(4):S.add('monorail_trackStraight',(x,-.42,-.6+k*1.15),0,1.15)
    for z in (.2,1.1,2.0,2.9):S.add('pipe_ring',(0,-.5,z),0,.42)
    S.add('machine_generator',(0,-.55,-.9),0,.8)
    S.add('satelliteDish',(0,1.4,-1.05),math.pi,.95)
    M=S.model();GLOW_N['vesper']=len(P);return np.concatenate([np.array(P).reshape(-1,3,3),M['P']]),list(N)+list(M['N']),list(R)+[kenney_role(c) for c in M['cols']]
# (4 Nov 2026, a model check) parts that hung in space are pulled in to touch: the Medium and Heavy Miners' side barrels and the
# Heavy Miner's generator; the forge outpost's feet and stacks; the relay outpost's corridors and transmitters
DARK_GLOW={'skiff','prospector','dredger','bombard'}
H=math.pi
MODELS={
 'interceptor':('ship',lambda:ql_model(4)),'striker':('ship',lambda:ql_model('')),'heavy':('ship',lambda:ql_model(5)),'bomber':('ship',lambda:ql_model(3)),'scout':('ship',lambda:ql_model(2)),'scout2':('ship',scout2),
 'picket':('ship',lambda:glb_model('craft_speederB')),'gunboat':('ship',lambda:glb_model('craft_speederD')),
 'skiff':('ship',lambda:aboutface(glb_model('craft_miner'))),
 'prospector':('ship',lambda:aboutface(comp([('craft_miner',(0,0,0),0,1),('machine_barrel',(.85,.15,-.2),0,.55),('machine_barrel',(-.85,.15,-.2),0,.55)]))),
 'dredger':('ship',lambda:aboutface(comp([('craft_miner',(0,0,0),0,1),('pipe_straight',(.75,.05,1.0),0,.6),('pipe_straight',(-.75,.05,1.0),0,.6),('machine_generator',(0,.45,-.5),0,.7),('machine_barrel',(.85,.1,-.5),0,.6),('machine_barrel',(-.85,.1,-.5),0,.6)]))),
 'bombard':('ship',lambda:aboutface(bombard())),'vesper':('ship',vesper),
 'courier':('ship',lambda:glb_model('craft_cargoA')),'freighter':('ship',lambda:glb_model('craft_cargoB')),
 'bulker':('ship',lambda:comp([('craft_cargoB',(0,0,0),0,1),('barrels_rail',(.95,.1,-.1),0,.8),('barrels_rail',(-.95,.1,-.1),0,.8),('barrels',(0,.85,-.4),0,.7)])),
 'constructor':('ship',lambda:comp([('craft_cargoA',(0,0,0),0,1.1),('structure',(0,.85,-.35),0,.8),('machine_wireless',(0,1.65,-.35),0,.7),('pipe_supportLow',(.9,.1,.4),0,.5),('pipe_supportLow',(-.9,.1,.4),0,.5)])),
 'carrier':('ship',lambda:cap_model(build_carrier,'carrier')),'escort':('ship',lambda:cap_model(build_escort,'escort')),   # the frigate (retired) is no longer packed
 'station':('struct',lambda:comp_model(build_station,'station')),
 'depot':('struct',lambda:comp([('hangar_roundGlass',(0,0,0),0,1.3),('hangar_roundGlass',(0,0,0),H,1.3,True),('machine_generatorLarge',(0,-1.8,0),0,1.6,True),('pipe_ring',(0,-1.8,0),0,1.9,True)]+[x for i in range(3) for x in [('corridor_window',(math.sin(i*2.094)*2.4,-.5,math.cos(i*2.094)*2.4),i*2.094,1),('hangar_smallA',(math.sin(i*2.094)*4.0,-.5,math.cos(i*2.094)*4.0),i*2.094+H,1),('turret_single',(math.sin(i*2.094)*4.0,.55,math.cos(i*2.094)*4.0),i*2.094,1)]]+[('satelliteDish',(0,1.8,0),0,1.2)],'depot')),
 'forge':('struct',lambda:comp([('machine_generatorLarge',(0,0,0),0,2.2),('machine_generatorLarge',(0,0,0),H,2.2,True),('rocket_fuelA',(0,1.5,0),0,1.6)]+[x for i in range(4) for x in [('pipe_straight',(math.sin(i*1.571)*2.0,-.3,math.cos(i*1.571)*2.0),i*1.571,1.1),('machine_barrelLarge',(math.sin(i*1.571)*2.9,-.6,math.cos(i*1.571)*2.9),i*1.571,1.1),('chimney_detailed',(math.sin(i*1.571+.785)*1.3,.6,math.cos(i*1.571+.785)*1.3),0,.9)]])),
 'relay':('struct',lambda:comp([('structure_closed',(0,-.5,0),0,1.6),('rocket_sidesA',(0,1.1,0),0,1.2),('rocket_fuelA',(0,2.3,0),0,1.2),('satelliteDish_large',(0,2.9,0),0,2.4),('satelliteDish_large',(0,-.5,0),H,1.8,True)]+[x for i in range(3) for x in [('corridor',(math.sin(i*2.094)*1.4,-.5,math.cos(i*2.094)*1.4),i*2.094,1),('machine_wireless',(math.sin(i*2.094)*2.3,-.5,math.cos(i*2.094)*2.3),i*2.094,1.2)]])),
 'rockbase':('struct',rockbase),
 'yard':('struct',lambda:comp([('hangar_largeA',(0,0,0),0,1.6),('hangar_largeA',(0,0,0),H,1.6,True),('platform_large',(2.6,-.2,0),H/2,1.3),('platform_large',(-2.6,-.2,0),H/2,1.3),('supports_high',(2.6,-.135,1.1),0,1),('supports_high',(-2.6,-.135,-1.1),0,1),('barrels_rail',(2.6,-.135,-.6),0,.9),('craft_cargoA',(-2.6,-.135,.5),H/2,.7),('machine_generator',(0,1.59,1.2),0,1)])),   # (7 Nov 2026) the deck gear stands on the platforms' recessed decks (-.135) and the roof generator on the solid roof (1.6) beside its open hatch
}
# (12 Nov 2026) Driftgate 1's fifteen kit ships are no longer packed: the Compact's ships, the last to draw them, fly the powers'
# designs in sand (the user, 11 Nov 2026: "Sand colored same as the powers"; src/js/16zzzzf_gfx.js). The kit carrier and escort
# stay as the fallback for a capital with no design line, and the old kit Bombard and Vesper as they were.
for _k in ('interceptor','striker','heavy','bomber','scout','scout2','picket','gunboat','skiff','prospector','dredger','courier','freighter','bulker','constructor'):MODELS.pop(_k)
for _k,_f in BROOD_MODELS.items():
    if _k=='b_leviathan':continue   # the old frigate-class Leviathan isn't packed: the Hive Ship replaced it
    MODELS[_k]=('ship',_f);GLOW_N[_k]=0   # Brood: glow comes from their sacs and vents, not the stern rule
# Beyond: the factions' own fighter designs, generated in code (tools/previews/beyond_hulls.py), first wave
sys.path.insert(0,_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),'previews'))
import beyond_hulls as _BH
DESIGN_MODELS={'dz_swift':_BH.swift,'dz_kite':_BH.kite,'dz_osprey':_BH.osprey,'dz_fang':_BH.fang,'dz_talon':_BH.talon,'dz_halberd':_BH.halberd,'dz_mote':_BH.mote,'dz_wisp':_BH.wisp,'dz_vigil':_BH.vigil}
# Beyond: the faction work ships (miners and haulers, tools/previews/beyond_work.py), approved 2 Nov 2026
import beyond_work as _BW
WORK_MODELS={'dz_'+_n.lower():_f for _fac,_ln,_L in _BW.WORK for _n,_r,_f in _L}
DESIGN_MODELS.update(WORK_MODELS)
for _k,_f in DESIGN_MODELS.items():MODELS[_k]=('ship',(lambda f:lambda:f().out())(_f));GLOW_N[_k]=0
# Beyond: the destroyers (Peregrine, Ironclad, Prism from beyond_capitals.py; the Brood Gullet from beyond_brood.py) and the
# Unbound Ravager (beyond_unbound.py). Their point-defence turrets are recorded as they're built (pd() calls), carried through
# finish()'s rescale, and packed as the models' turret mounts.
import beyond_capitals as _BC, beyond_unbound as _BU, beyond_brood as _BB
import beyond_hulls as _BHm
def _mounted(mod_list,build,want_torp=False):
    # build a model while recording where its working parts go: point defence (pd), shield generators (shd), hangar mouths
    # (bay), deck spots (pt), drive vents (eng) and, on escorts, the torpedo tube caps (torp); all carried through finish()
    rec={'pd':[],'shd':[],'bay':[],'pt':[],'eng':[],'torp':[]};xf=[None];base=mod_list[0]
    o={m:{k:getattr(m,k) for k in ('pd','shieldgen','mouth','spots','finish') if hasattr(m,k)} for m in mod_list}
    O=o[base];Mc=_BHm.Mesh;ov,ob=Mc.vent,Mc.blob
    def pd(M,c,*a,**k):rec['pd'].append(np.array(c,float));return O['pd'](M,c,*a,**k)
    def sg(M,c,*a,**k):rec['shd'].append(np.array(c,float));return O['shieldgen'](M,c,*a,**k)
    def mo(M,c,*a,**k):rec['bay'].append(np.array(c,float));return O['mouth'](M,c,*a,**k)
    def sp(M,pts,r=.12,y=0):
        for x,z in pts:rec['pt'].append(np.array((x,y,z),float))
        return O['spots'](M,pts,r,y)
    def fin(M,length,girth=1.12):
        P=np.array(M.T,float);lo=P.reshape(-1,3).min(0);hi=P.reshape(-1,3).max(0);c=(lo+hi)/2;k=length/(hi[2]-lo[2]);xf[0]=(c,k*np.array([girth,girth,1.0]))
        return O['finish'](M,length,girth)
    def vent(self,c,r,*a,**k):rec['eng'].append(np.array(c,float));return ov(self,c,r,*a,**k)
    def blob(self,c,r,role,*a,**k):
        if want_torp and role==ACC and r<=.05 and c[2]>1.5:rec['torp'].append(np.array(c,float))
        return ob(self,c,r,role,*a,**k)
    rep={'pd':pd,'shieldgen':sg,'mouth':mo,'spots':sp,'finish':fin}
    for m in mod_list:
        for k in o[m]:setattr(m,k,rep[k])
    Mc.vent=vent;Mc.blob=blob
    try:M=build()
    finally:
        for m in mod_list:
            for k,v in o[m].items():setattr(m,k,v)
        Mc.vent=ov;Mc.blob=ob
    X=lambda L:[tuple(float(v) for v in ((p-xf[0][0])*xf[0][1] if xf[0] else p)) for p in L]
    out={k:X(v) for k,v in rec.items()}
    if out['eng']:
        zl=min(p[2] for p in out['eng']);out['eng']=[p for p in out['eng'] if p[2]<zl+.6]
    return M,out
def _cap(mods,build,name,torp=False,bay_aft=False):
    def f():
        M,R=_mounted(mods,build,torp);MOUNTS[name]=R['pd']
        sub={k:R[k] for k in ('eng','shd','bay','torp') if R[k]}
        if bay_aft and R['shd']:sub['bay']=[(p[0],p[1],p[2]-1.0) for p in R['shd']]   # an escort's ventral assault bay, aft of its shield generator
        if sub:SUBS[name]=sub
        if R['pt']:PTS[name]=R['pt']
        return M.out()
    return f
# Driftgate 1 has no destroyers: the Peregrine, Ironclad, Prism, Ravager and the Brood Gullet are Beyond's and not packed
for _k,_b in (('dz_shrike',_BC.shrike),('dz_vanguard',_BC.vanguard),('dz_lantern',_BC.lantern)):
    MODELS[_k]=('ship',_cap([_BC],_b,_k,torp=True,bay_aft=True));GLOW_N[_k]=0
for _k,_b in (('dz_sovereign',_BC.sovereign),('dz_bastille',_BC.bastille),('dz_cathedral',_BC.cathedral)):
    MODELS[_k]=('ship',_cap([_BC],_b,_k));GLOW_N[_k]=0
AFT_GLOW=set()
# Beyond: every other approved design (2 Nov 2026): scouts and bombers (beyond_recon.py), constructors and drones
# (beyond_support.py), the house-brand hulls and the Wraith (beyond_brand.py), the Unbound hulls (beyond_unbound.py), the
# powers' stations and depots and the freeport (beyond_faction_stations.py), Scrapheart Haven (beyond_unbound_base.py) and the
# Riftstone rock (beyond_riftstone.py)
import beyond_recon as _BR, beyond_support as _BSu, beyond_brand as _BBr, beyond_faction_stations as _BFS, beyond_unbound_base as _BUB
for _L in (_BR.RECON,_BSu.SUPPORT,_BBr.BRAND,_BU.UNBOUND):
    for _fac,_ln,_ships in _L:
        for _n,_r,_f in _ships:
            _k='dz_'+_n.lower().replace(' drone','').replace(' ','_')
            if _k in MODELS:continue
            MODELS[_k]=('ship',(lambda f:lambda:f().out())(_f));GLOW_N[_k]=0
for _fac,_ln,_st,_dp in _BFS.FACTION_STATIONS:
    MODELS['by_st_'+_fac]=('base',(lambda f:lambda:f().out())(_st));MODELS['by_dp_'+_fac]=('base',(lambda f:lambda:f().out())(_dp))
MODELS['by_freeport']=('base',lambda:_BFS.freeport('mw').out())
MODELS['by_freeport_cw']=('base',lambda:_BFS.freeport('cw').out())
MODELS['by_freeport_ew']=('base',lambda:_BFS.freeport('ew').out())
# the freeports' docking ports: the head at the end of each docking arm (3 Nov 2026: three variants with different arms)
def _fp_ports(v):
    import math;V=_BFS.FREEPORT_V[v];na=V['arms'];L=(8.0 if na==4 else 8.8)+.9;out=[]
    for k in range(na):
        a=k*2*math.pi/na+V['phase'];tl=V['tilt'];out.append(np.array((math.cos(a)*math.cos(tl)*L,math.sin(tl)*L,math.sin(a)*math.cos(tl)*L),float))
    return out
for _v,_n in (('mw','by_freeport'),('cw','by_freeport_cw'),('ew','by_freeport_ew')):PTS[_n]=_fp_ports(_v)
MODELS['by_haven']=('base',lambda:_BUB.scrapheart().out())
MODELS.pop('dz_ravager',None)   # Driftgate 1: the Unbound have no capital hull
# (12 Nov 2026) turret seats on the powers' stations and depots, the freeports and the Haven (tools/stseats.py): each of these
# models gets a barbette for every live turret the game stands on it, built into the hull where it is solid under the whole
# turntable; the pack keeps each seat's deck point and normal ('sp'). They had none: the game perched each turret on the middle
# of whichever face lay furthest out, sunk to its trunnions and leaning.
import stseats as _SS
for _n in _SS.SIZE:
    def _mk(name,build):
        def g():
            M=build();log=[];_SS.seats(M,_SS.COUNT[name],_SS.SIZE[name],avoid=PTS.get(name,()),want=getattr(M,'want',()),log=log,ports=_SS.PORTS.get(name,()))
            for l in log:print(name,l,flush=True)
            r=M.out();_BRD.LAST=dict(_BRD.LAST or {},stn=M.stn);return r
        return g
    _SEATB={'by_freeport':lambda:_BFS.freeport('mw'),'by_freeport_cw':lambda:_BFS.freeport('cw'),'by_freeport_ew':lambda:_BFS.freeport('ew'),'by_haven':lambda:_BUB.scrapheart()}
    for _fac,_ln,_st,_dp in _BFS.FACTION_STATIONS:_SEATB['by_st_'+_fac]=_st;_SEATB['by_dp_'+_fac]=_dp
    MODELS[_n]=('base',_mk(_n,_SEATB[_n]))
# Driftgate 1 (12 Nov 2026): Beyond's assault ship, player bases, base designs and the makers' R&D stations are not packed
EXTRA={};TNORM={};WB={};LG={}
for _k,_v in WORKS.items():MODELS[_k]=('struct',_v[0] if len(_v)>2 else (lambda f:lambda:comp_model(f))(_v[0]))
FIT={'rockbase':230,'station':150,'depot':105,'forge':120,'relay':120,'yard':120,**{k:v[1] for k,v in WORKS.items()}}
FIT.update({'by_st_halcyon':170,'by_st_varkesh':170,'by_st_ostrova':170,'by_dp_halcyon':105,'by_dp_varkesh':105,'by_dp_ostrova':105,'by_freeport':210,'by_freeport_cw':210,'by_freeport_ew':210,'by_haven':240})   # world half-size: docking ports scale by it
# (11 Nov 2026) two helpers for working on single models (the full build takes about nine minutes, most of it the z-fight lift
# on the big stations):
#   DG_ONLY=name,name python3 build_models.py   rebuilds only those models and keeps every other one's bytes and index
#                                               entry from the pack on disk (finish with a full build before committing)
#   DG_BBOX=out.json python3 build_models.py    writes each model's box before it is normalised ([lo,hi], model units) and
#                                               packs nothing: compare two of these to see that a change kept a model's
#                                               packed size and centre (tools/bboxcheck.py)
ONLY=set(x for x in _os.environ.get('DG_ONLY','').split(',') if x);BBOX=_os.environ.get('DG_BBOX')
def pack():
    idx={};blob=bytearray();bb={}
    if ONLY:
        import gzip as _gz
        old_idx=json.load(open('models_idx.json'));old_blob=_gz.decompress(base64.b64decode(open('models_gz.b64').read()))
    for name,(kind,fn) in MODELS.items():
        if ONLY and name not in ONLY and name in old_idx:
            m=dict(old_idx[name])
            while len(blob)%4:blob+=b'\0'
            o=m['o'];m['o']=len(blob);blob+=old_blob[o:o+m['n']*20];idx[name]=m;continue
        _BRD.LAST=None;P,N,R=fn();P=np.array(P,dtype=float).reshape(-1,3,3);meta=_BRD.LAST or {}
        allp=P.reshape(-1,3);lo,hi=allp.min(0),allp.max(0);c=(lo+hi)/2
        if BBOX:bb[name]=[[round(float(v),5) for v in lo],[round(float(v),5) for v in hi],len(P)];continue
        if kind=='struct':c[1]=(lo[1]+hi[1])/2
        if meta.get('stn'):EXTRA.setdefault(name,{})['sp']=[[round(float(x),4) for x in (np.array(p)-c)/(max(hi-lo)/2)]+[round(float(x),4) for x in n] for p,n in meta['stn']]
        P=P-c;half=max(hi-lo)/2;P=P/half          # longest half-extent = 1 (ships draw at radius x1.25, like the hand-built ones)
        if name=='wk_def':
            # (12 Nov 2026) the gun deck's top, where the game stands the defence platform's turrets (16zzzzf_gfx.js): found under the first turret's place
            _t,_=_SS.rays(P,[np.array([math.cos(.4)*.74,2.0,math.sin(.4)*.74])],np.array([0,-1.,0]));EXTRA.setdefault(name,{})['dk']=round(float(2.0-_t[0]),4)
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
        T=np.array(tris);T,zl=zlift(T,roles,shades);T,zl2=zlift(T,roles,shades);zl+=zl2   # (4 Nov 2026) coplanar faces of different colours: lift the smaller part's off the plane (no flicker)
        q=np.clip(np.round(T*32767),-32767,32767).astype('<i2')
        eng=[]
        if kind=='ship':
            G=[T[k].mean(0) for k in range(len(T)) if roles[k]==GLOW and (name not in AFT_GLOW or T[k].mean(0)[2]<zlo+.3*L)];cl=[]
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
        # (11 Nov 2026) a builder that recorded its nozzles gets one flare on each, exactly there ('ex': the game takes them as
        # they are); the flare's size follows the nozzle's, by the rule the glow clusters gave a single nozzle before
        ex=0
        if kind=='ship' and meta.get('eng'):
            eng=[[round(float(v),3) for v in (np.array(q,float)-c)/half]+[round(float(max(.04,min(.2,.507*r/half+.03))),3)] for q,r,_ in meta['eng']];ex=1
        NORM=lambda L:[[round(float(v),3) for v in (np.array(q[0],float)-c)/half] for q in L]
        if name in ENGX:eng=[[round(float(v),3) for v in list((np.array(m[:3])-c)/half)+[m[3]/half]] for m in ENGX[name]]
        tp=[[round(float(x),3) for x in (np.array(m)-c)/half] for m in MOUNTS.get(name,[])]
        pt=[[round(float(x),3) for x in (np.array(m)-c)/half] for m in PTS.get(name,[])]
        sb={k:[[round(float(x),3) for x in (np.array(m)-c)/half] for m in v] for k,v in SUBS.get(name,{}).items()}
        idx[name]={**({'c':[round(float(x),4) for x in c],'h':round(float(half),4)} if kind=='base' else {}),'o':off,'n':len(T),'k':kind,'s':FIT.get(name,1),'e':eng,**({'ex':1} if ex else {}),**({'g':NORM(meta['gun'])} if kind=='ship' and meta.get('gun') else {}),**({'ml':NORM(meta['mine'])} if kind=='ship' and meta.get('mine') else {}),**({'ts':NORM(meta['seat'])[0]} if kind=='ship' and meta.get('seat') else {}),'tp':tp,'top':round(float(T[:,:,1].max()),3),**({'pt':pt} if pt else {}),**({'tn':TNORM[name]} if name in TNORM else {}),**({'lg':[[[round(float(x),3) for x in (np.array(p)-c)/half],[round(float(x),3) for x in d],round(float(hs)/half,4)] for p,d,hs in LG[name]]} if LG.get(name) else {}),**({'wb':{k:[[round(float(x),3) for x in (np.array(m)-c)/half] for m in v] for k,v in WB[name].items()}} if name in WB else {}),**({'sub':sb} if sb else {}),**EXTRA.get(name,{})}
        print(name.ljust(12),kind,len(T),'tris',('eng %d'%len(eng)) if eng else '',('lifted %d'%zl) if zl else '')
    if BBOX:json.dump(bb,open(BBOX,'w'));print('wrote',BBOX,len(bb),'boxes');sys.exit(0)
    return idx,bytes(blob)
idx,blob=pack()
for r in ENGZ:
    if r[2]-r[1]>=.06:print('engine moved forward to its vent:',r)
import gzip
gz=gzip.compress(blob,9)
open('models_idx.json','w').write(json.dumps(idx,separators=(',',':')))
open('models_gz.b64','w').write(base64.b64encode(gz).decode())
print('total',len(blob)//1024,'KB raw',len(gz)//1024,'KB gz',len(base64.b64encode(gz))//1024,'KB b64')
