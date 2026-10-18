# Station works as free-standing structures, built from the same Kenney space-kit parts as the stations.
# Each is one "unit"; the game clusters one unit per module level beside the station and joins them with girders.
import sys,math;sys.path.insert(0,'.')
from station import Comp
H=math.pi
def _both(S,name,pos,rot,sc):
    S.add(name,pos,rot,sc);S.add(name,(pos[0],-pos[1],pos[2]),rot,sc,True)
def wk_store():
    # storage vault: a closed core with tank farms above and below and cargo racks on the flanks
    S=Comp();S.add('structure_closed',(0,-.6,0),0,1.2)
    for i in range(4):
        a=i*H/2+H/4;x,z=math.sin(a)*.62,math.cos(a)*.62
        _both(S,'machine_barrelLarge',(x,.6,z),a,1.0)
    for sx in (-1,1):S.add('barrels_rail',(sx*.95,-.18,0),H/2,1.1);S.add('barrels_rail',(sx*.95,-.18,0),H/2,1.1,True)
    S.add('platform_large',(0,.58,0),0,.85);S.add('platform_large',(0,-.58,0),0,.85,True)
    return S.model()
def wk_prod():
    # production works: a long fabrication hall with smelter stacks, a generator block aft and feed pipes
    S=Comp();S.add('hangar_largeB',(0,0,0),0,1.0);S.add('hangar_largeB',(0,0,0),0,1.0,True)
    for z in (-.7,.5):S.add('chimney_detailed',(.55,1.0,z),0,.7);S.add('chimney',(-.55,1.0,z+.1),0,.6)
    S.add('machine_generatorLarge',(0,-.35,-2.1),0,1.0);S.add('machine_generatorLarge',(0,-.35,-2.1),0,1.0,True)
    for sx in (-1,1):S.add('pipe_straight',(sx*1.3,-.3,.2),0,.7);S.add('pipe_straight',(sx*1.3,-.3,-.8),0,.7)
    S.add('machine_wireless',(0,1.05,1.0),0,.8)
    return S.model()
def wk_life():
    # habitat & life support: a glass-domed hub with three windowed spokes out to round crew pods
    S=Comp();S.add('hangar_roundGlass',(0,.2,0),0,.9);S.add('hangar_roundGlass',(0,-.2,0),0,.9,True)
    for i in range(3):
        a=i*2*H/3;d=(math.sin(a),math.cos(a))
        S.add('corridor_window',(d[0]*1.75,-.5,d[1]*1.75),a,.9)
        S.add('hangar_roundA',(d[0]*2.75,-.15,d[1]*2.75),a,.42);S.add('hangar_roundA',(d[0]*2.75,-.15,d[1]*2.75),a,.42,True)
    S.add('pipe_ringHigh',(0,1.15,0),0,.8);S.add('satelliteDish',(0,2.15,0),0,.8)
    return S.model()
def wk_def():
    # defence platform: a braced gun deck (the game mounts live turrets on its corners) with a fire-control mast
    S=Comp();S.add('platform_large',(0,0,0),0,1.5)
    for i in range(4):
        a=i*H/2+H/4;S.add('supports_low',(math.sin(a)*1.0,-.5,math.cos(a)*1.0),a,.9,True)
    S.add('structure_detailed',(0,-.05,0),0,.9);S.add('structure_closed',(0,-.95,0),0,.8)
    S.add('machine_wireless',(0,.85,0),0,.8);S.add('satelliteDish_large',(0,1.3,0),0,.9)
    for i in range(4):
        a=i*H/2;S.add('barrels',(math.sin(a)*.9,.05,math.cos(a)*.9),a,.6)
    return S.model()
def wk_armor():
    # shield & hull works: a tall emitter pylon on a generator base, ringed by conduit
    S=Comp();S.add('rocket_baseA',(0,-1.6,0),0,.9)
    y=-1.6+1.6*.9
    for k in range(3):S.add('rocket_fuelA',(0,y,0),k*.6,.75);y+=.5*.75
    S.add('rocket_sidesA',(0,y,0),0,.75);y+=.75
    S.add('machine_wireless',(0,y,0),0,.7);S.add('satelliteDish_large',(0,y+.45,0),0,1.0)
    S.add('pipe_ringHigh',(0,-1.0,0),0,1.3)
    for i in range(3):
        a=i*2*H/3;S.add('machine_barrel',(math.sin(a)*1.05,-1.2,math.cos(a)*1.05),a,.8)
    return S.model()
import numpy as np,colorsys
LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN=0,1,2,3,4,5,6
def _krole(c):
    c=np.array(c[:3],dtype=float);h,s_,v=colorsys.rgb_to_hsv(*c)
    if s_>.35 and v>.3:return ACC,1.0
    if v>.8:return LIGHT,1.0
    if v>.55:return MID,1.0
    return DARK,1.0
class _B:
    """raw triangles with an explicit colour role each (so a structure can carry running lights and lit windows)"""
    def __init__(s):s.T=[];s.R=[]
    def box(s,c,size,role,sh=1.0):
        x,y,z=np.array(size,float)/2;c=np.array(c,float)
        v=[c+np.array(o) for o in [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]]
        s._hex(v,c,role,sh)
    def beam(s,p0,p1,w,h,role,hint=(0,0,1),sh=1.0):
        p0=np.array(p0,float);p1=np.array(p1,float);d=p1-p0;L=np.linalg.norm(d);d/=L
        sd=np.cross(d,hint);sd/=np.linalg.norm(sd)+1e-12;up=np.cross(sd,d)
        v=[]
        for e in (p0,p1):
            for a,b in ((-1,-1),(1,-1),(1,1),(-1,1)):v.append(e+sd*a*w/2+up*b*h/2)
        v=[v[0],v[1],v[2],v[3],v[4],v[5],v[6],v[7]];s._hex(v,(p0+p1)/2,role,sh)
    def _hex(s,v,c,role,sh):
        for f in [(0,1,2,3),(4,5,6,7),(0,1,5,4),(3,2,6,7),(0,3,7,4),(1,2,6,5)]:
            for t in ((f[0],f[1],f[2]),(f[0],f[2],f[3])):
                T=np.array([v[t[0]],v[t[1]],v[t[2]]]);n=np.cross(T[1]-T[0],T[2]-T[0])
                if n@(T.mean(0)-c)<0:T=T[[0,2,1]]
                s.T.append(T);s.R.append((role,sh))
    def comp(s,parts,k):
        S=Comp()
        for p in parts:S.add(*p)
        M=S.model()
        for t,c in zip(M['P'],M['cols']):s.T.append(np.array(t)*k);s.R.append(_krole(c))
def wk_yard():
    # orbital drydock sized round a frigate (hull ~66 m wide, 73 m tall, 220 m long, bow toward +z): a row of open-topped
    # U-frame ribs joined by longerons, docking clamps reaching in to the hull, two travelling gantries overhead, running
    # lights on every rib, a control block with lit windows at the head and an aft light gate at the stern of the slip
    B=_B();a=64;bot=-54;top=46;Z=[-140+i*35 for i in range(9)]
    sec=[(-a+10,top+4),(-a,top-6),(-a,bot+16),(-a+16,bot),(a-16,bot),(a,bot+16),(a,top-6),(a-10,top+4)]
    for i,z in enumerate(Z):
        heavy=i%2==0;w,h=(9,7) if heavy else (6,5)
        for j in range(len(sec)-1):
            (x0,y0),(x1,y1)=sec[j],sec[j+1];B.beam((x0,y0,z),(x1,y1,z),w,h,MID if heavy else LIGHT)
        if heavy:
            for sx in (-1,1):B.box((sx*(a+4.5),(bot+top)/2,z),(1.5,50,9.5),ACC)            # accent stripe down the rib
            B.box((0,bot-4.5,z),(70,2,9.5),ACC)
        for sx in (-1,1):                                                               # clamp arms reach in to the hull
            for y in ((-14,) if not heavy else (-28,8)):B.beam((sx*a,y,z),(sx*37,y,z),5,5,DARK);B.box((sx*36,y,z),(3,9,9),LIGHT)
            B.box((sx*(a-10),top+8,z),(4,4,4),GLOW)                                       # running lights on the rib tips
            B.box((sx*(a+5),bot+16,z),(3,3,3),GLOW)
        B.box((0,bot-2,z),(5,3,5),GLOW)
    z0,z1=Z[0]-6,Z[-1]+6
    for x,y,w,h,r in [(-a,top-6,7,7,LIGHT),(a,top-6,7,7,LIGHT),(-a,bot+16,8,8,MID),(a,bot+16,8,8,MID),(-a+16,bot,8,8,MID),(a-16,bot,8,8,MID),(0,bot-6,12,6,DARK)]:
        B.beam((x,y,z0),(x,y,z1),w,h,r,hint=(0,1,0))
    for z in (Z[0]+17,Z[-1]-17):                                                         # keel cradles under the hull
        B.box((0,bot+10,z),(40,10,14),DARK);B.box((0,bot+16,z),(28,3,10),LIGHT)
    for zg in (-52,58):                                                                  # gantries: bridge, trolley, hoist
        for sx in (-1,1):B.beam((sx*(a+2),top-6,zg),(sx*(a+2),top+22,zg),8,8,MID)
        B.beam((-a-6,top+26,zg),(a+6,top+26,zg),10,10,LIGHT);B.box((0,top+26,zg),(22,14,18),MID);B.box((0,top+26,zg+9.5),(18,6,1),WIN)
        B.beam((0,top+18,zg),(0,top+2,zg),3,3,DARK);B.box((0,top,zg),(12,3,12),ACC)
        for sx in (-1,1):B.box((sx*(a+6),top+32,zg),(4,4,4),GLOW)
    # aft light gate framing the slip mouth
    for sx in (-1,1):B.beam((sx*(a+8),bot-8,z1+14),(sx*(a+8),top+14,z1+14),10,10,LIGHT)
    B.beam((-a-8,top+14,z1+14),(a+8,top+14,z1+14),10,10,LIGHT);B.beam((-a-8,bot-8,z1+14),(a+8,bot-8,z1+14),10,10,LIGHT)
    for t in np.linspace(0,1,7):
        B.box((-a-8+t*(2*a+16),top+20,z1+14),(4,4,4),GLOW);B.box((-a-8+t*(2*a+16),bot-14,z1+14),(4,4,4),GLOW)
    # control block at the head: hangar pieces, a windowed bridge, comms
    k=26;zh=(z0-48)/k
    B.comp([('hangar_largeA',(0,-.4,zh),H,1.4),('hangar_largeA',(0,-.4,zh),H,1.4,True),('machine_wireless',(0,1.0,zh-.4),0,1.1),('satelliteDish_large',(0,1.55,zh-.8),0,1.3),
            ('machine_barrelLarge',(1.9,-.6,zh+.5),0,1.0),('machine_barrelLarge',(-1.9,-.6,zh+.5),0,1.0)],k)
    B.box((0,30,z0-22),(60,10,3),WIN);B.box((0,30,z0-30),(64,14,14),LIGHT)
    for sx in (-1,1):B.beam((sx*30,bot,z0),(sx*44,bot-8,z0-60),6,6,MID)
    P=np.array(B.T);return P,[None]*len(P),B.R
WORKS={'wk_store':(wk_store,55),'wk_prod':(wk_prod,72),'wk_life':(wk_life,64),'wk_def':(wk_def,62),'wk_armor':(wk_armor,60),'wk_yard':(wk_yard,207,True)}
