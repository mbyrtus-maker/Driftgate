# Driftgate Beyond: player bases (preview, not in the model pack yet). First pass.
# The neutral company style, shared by player stations and the freeports: round drums, square lattice trusses, cargo containers,
# radiator panels, spherical tanks, amber trim and floodlights. Industrial and open, unlike any faction's language
# (Halcyon lens, Varkesh hex slabs, Ostrova facets and crystal). The asteroid look sets the same parts into rock.
# Up is +y. Units are free: the pack normalises each model.
#   Lair 1-2      hidden in a large asteroid: a hangar cut into the rock, little else showing
#   Depot 1-3     Driftgate 1's depot modules, in the company style: storage; + production, hangar; + defence, armour, life support
#   Station       a core with five hardpoints; each level adds one external building of the owner's choice
#   Buildings     shipyard, external storage, defence platform, hangar, forge, market wing
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,box,plate,ring,loft
from beyond_capitals import tube,mouth
from beyond_recon import dish
ROCK,ROCKD=7,8
PI=math.pi

# ------------------------------------------------------------------ transforms
def ry(a):c,s=math.cos(a),math.sin(a);return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def frame_y(d,hint=(0,0,1)):
    # a rotation taking local +y to direction d (local +z toward hint)
    y=np.array(d,float);y/=np.linalg.norm(y);h=np.array(hint,float)
    if abs(h@y)>.95:h=np.array([1.,0,0])
    x=np.cross(y,h);x/=np.linalg.norm(x);z=np.cross(x,y)
    return np.stack([x,y,z],1)
def put(M,B,pos=(0,0,0),R=None,s=1.0):
    # copy mesh B into M, scaled, rotated and moved
    R=np.eye(3) if R is None else R;p=np.array(pos,float)
    for t,r in zip(B.T,B.R):M.T.append((np.array(t)*s)@R.T+p);M.R.append(r)
def outward(a):return ry(PI/2-a)   # local +z points along (cos a,0,sin a)

# ------------------------------------------------------------------ the company style
def drum(M,a,b,r,role=MID,sides=14,caps=True,bands=()):
    # a cylinder from a to b with alternating panel shading and accent bands at fractions along it
    a=np.array(a,float);b=np.array(b,float);d=b-a;up=(0,0,1) if abs(d[1])>.9*np.linalg.norm(d) else (0,1,0)
    M.tube([a,b],[r,r],sides,lambda i,j,n,p:(role,.9+.1*(j%2)),cap0=caps,cap1=caps,up=up)
    for f in bands:
        c=a+d*f;n=d/np.linalg.norm(d)
        B=Mesh();ring(B,(0,0,0),r*1.02,r*.06,ACC,seg=sides*2,sides=4,axis='y');put(M,B,c,frame_y(n))
def truss(M,a,b,w=.16,r=.022,bays=None,role=DARK):
    # a square lattice beam: four longerons and zig-zag braces
    a=np.array(a,float);b=np.array(b,float);d=b-a;L=np.linalg.norm(d);n=d/L
    h=np.array([0,1.,0]) if abs(n[1])<.9 else np.array([1.,0,0]);u=np.cross(n,h);u/=np.linalg.norm(u);v=np.cross(n,u)
    C=[(u*sx+v*sy)*w/2 for sx,sy in ((1,1),(-1,1),(-1,-1),(1,-1))]
    for c in C:tube(M,[a+c,b+c],[r,r],role,.95,5,cap0=False,cap1=False)
    k=bays or max(2,int(round(L/(w*1.6))))
    for i in range(k):
        p0=a+d*i/k;p1=a+d*(i+1)/k
        for m in range(4):tube(M,[p0+C[m],p1+C[(m+1)%4]],[r*.7,r*.7],role,.9,4,cap0=False,cap1=False)
    for e in (a,b):
        for m in range(4):tube(M,[e+C[m],e+C[(m+1)%4]],[r*.8,r*.8],role,.9,4,cap0=False,cap1=False)
def tank(M,c,r,role=LIGHT):
    M.blob(tuple(c),r,role,sub=2,noise=0);ring(M,tuple(c),r*1.01,r*.05,ACC,seg=24,sides=4,axis='y')
def container(M,c,size=(.5,.36,.9),role=MID,yaw=0.0):
    # a cargo container with ribs and an amber stripe
    B=Mesh();w,h,l=size
    box(B,(0,0,0),size,role)
    for z in np.linspace(-l/2+.04,l/2-.04,4):box(B,(0,0,z),(w*1.04,h*1.04,.03),DARK)
    box(B,(0,h*.18,0),(w*1.05,h*.12,l*.9),ACC)
    put(M,B,c,ry(yaw))
def radiator(M,a,b,w=.5,n=3):
    # a radiator panel on a boom: thin dark fins with amber edges
    a=np.array(a,float);b=np.array(b,float);d=b-a
    tube(M,[a,b],[.03,.03],DARK,.9,5)
    up=np.array([0,1.,0]) if abs(d[1])<.9*np.linalg.norm(d) else np.array([1.,0,0])
    for i in range(n):
        c0=a+d*(i+.15)/n;c1=a+d*(i+.85)/n
        plate(M,[c0-up*w/2,c1-up*w/2,c1+up*w/2,c0+up*w/2],.012,DARK,.85)
        tube(M,[c0+up*w/2,c1+up*w/2],[.012,.012],ACC,1.0,4)
def floods(M,pts,r=.05):
    for p in pts:M.blob(tuple(p),r,WIN,sub=1,noise=0)
def mast(M,base,h,r=.03):
    b=np.array(base,float);tube(M,[b,b+[0,h,0]],[r,r*.5],LIGHT,.9,5);M.blob(tuple(b+[0,h,0]),r*1.6,WIN,sub=1,noise=0)
    ring(M,tuple(b+[0,h*.7,0]),r*3,r*.4,ACC,seg=12,sides=4,axis='y')
def collar(M,c,r,axis_dir):
    # a docking collar: a short drum with a lit ring at its mouth
    c=np.array(c,float);n=np.array(axis_dir,float);n/=np.linalg.norm(n)
    drum(M,c,c+n*r*.8,r,MID,12,caps=True)
    B=Mesh();ring(B,(0,0,0),r*1.05,r*.12,WIN,seg=20,sides=4,axis='y');put(M,B,c+n*r*.82,frame_y(n))
def _oct(w,h,ch,x=0.0,y=0.0):
    # a chamfered rectangle (half-width w, half-height h, corners cut by ch) centred on (x,y)
    return [(x-w,y-h+ch),(x-w+ch,y-h),(x+w-ch,y-h),(x+w,y-h+ch),(x+w,y+h-ch),(x+w-ch,y+h),(x-w+ch,y+h),(x-w,y+h-ch)]
def turret(M,c,s=1.0,up=True):
    # a station gun turret (9 Nov 2026, was a drum, a tapered box and two tubes): a base drum with an accent band, a yoke
    # holding a chamfered housing with a tapered glacis, a faceted sensor dome, a mantlet, twin barrels (+z) in recoil sleeves
    # with muzzle collars, accent strips on the roof and a lit sight. Same footprint and barrel reach as before.
    c=np.array(c,float);k=1 if up else -1;x0,y0,z0=c;yc=y0+k*.17*s
    drum(M,c,c+[0,k*.07*s,0],.2*s,DARK,10)
    ring(M,tuple(c+[0,k*.07*s,0]),.19*s,.012*s,ACC,seg=10,sides=3,axis='y')
    for sx in (1,-1):box(M,(x0+sx*.165*s,y0+k*.12*s,z0),(.035*s,.12*s,.17*s),MID)                              # yoke cheeks
    loft(M,[(z0-.17*s,_oct(.125*s,.065*s,.025*s,x0,yc)),(z0-.12*s,_oct(.15*s,.08*s,.03*s,x0,yc)),(z0+.07*s,_oct(.15*s,.08*s,.03*s,x0,yc)),
            (z0+.16*s,_oct(.115*s,.055*s,.022*s,x0,yc-k*.005*s))],(LIGHT,.92))                                   # housing
    loft(M,[(z0+.15*s,_oct(.1*s,.042*s,.015*s,x0,yc)),(z0+.21*s,_oct(.09*s,.036*s,.014*s,x0,yc))],(MID,1.0))    # mantlet
    M.blob((x0-.065*s,yc+k*.075*s,z0-.05*s),.045*s,GLASS,sub=0,squash=(1,.6,1),noise=0)                          # sensor dome
    for sx in (1,-1):
        bx=x0+sx*.07*s
        tube(M,[(bx,yc,z0+.19*s),(bx,yc,z0+.3*s)],[.034*s,.032*s],MID,1.0,6)                                     # recoil sleeve
        tube(M,[(bx,yc,z0+.29*s),(bx,yc,z0+.66*s)],[.022*s,.019*s],DARK,1.0,6,cap0=False)                                   # barrel
        tube(M,[(bx,yc,z0+.33*s),(bx,yc,z0+.35*s)],[.029*s,.029*s],ACC,1.0,6,cap0=False,cap1=False)                   # band
        tube(M,[(bx,yc,z0+.64*s),(bx,yc,z0+.7*s)],[.032*s,.03*s],MID,1.0,6,cap0=False)                                      # muzzle collar
        box(M,(x0+sx*.1*s,yc+k*.081*s,z0-.03*s),(.012*s,.006*s,.17*s),ACC)                                        # roof strip
    box(M,(x0+.105*s,yc+k*.066*s,z0+.115*s),(.03*s,.012*s,.03*s),GLOW)                                             # sight
def pad(M,c,r=.38):
    # an empty hardpoint: a hex pad with hazard ring and corner lights, where a building will go
    c=np.array(c,float)
    pts=[c+[math.cos(a)*r,0,math.sin(a)*r] for a in np.linspace(0,2*PI,6,endpoint=False)]
    plate(M,pts,.06,DARK,.9);ring(M,tuple(c+[0,.04,0]),r*.75,.025,ACC,seg=24,sides=4,axis='y')
    floods(M,[p+[0,.05,0] for p in pts[::2]],.035)

# ------------------------------------------------------------------ rock
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
class Rock:
    # a lumpy cratered asteroid; surf(d) gives the surface point in direction d so parts can be set into it
    def __init__(s,c,R,seed,squash=(1.15,.78,1.0),nb=30,nc=8):
        g=np.random.default_rng(seed);s.c=np.array(c,float);s.R=R;s.q=np.array(squash)
        s.B=[(v/np.linalg.norm(v),g.uniform(-.08,.13),g.uniform(.25,.7)) for v in g.normal(size=(nb,3))]
        s.C=[(v/np.linalg.norm(v),g.uniform(.16,.32)) for v in g.normal(size=(nc,3))]
    def rad(s,d):
        d=d/np.linalg.norm(d);r=1.0
        for c,a,w in s.B:r+=a*math.exp(-(math.acos(np.clip(d@c,-1,1))/w)**2)
        for c,w in s.C:
            t=math.acos(np.clip(d@c,-1,1))/w
            if t<1:r-=.07*(1-t*t)
            elif t<1.35:r+=.035*(1-(t-1)/.35)
        return r+.025*math.sin(7*d[0]+2)*math.sin(6*d[1]+1)*math.sin(5*d[2])
    def surf(s,d,inset=0.0):
        d=np.array(d,float);d/=np.linalg.norm(d);return s.c+d*(s.rad(d)-inset)*s.R*s.q
    def build(s,M,sub=3):
        V,F=icosphere(sub);P=[s.surf(v) for v in V];g=np.random.default_rng(3)
        for a,b,c in F:
            d=(V[a]+V[b]+V[c]);d/=np.linalg.norm(d);cr=any(math.acos(np.clip(d@cc,-1,1))<w*.85 for cc,w in s.C)
            M.tri(P[a],P[b],P[c],ROCKD if (cr or g.random()<.12) else ROCK,.9+.15*g.random(),ref=s.c)
def rock_mouth(M,rk,d,w=.9,h=.5,hint=(0,1,0)):
    # a hangar cut into the rock: a framed collar standing out of the surface, a dark bay, a lit lip, lights either side
    B=Mesh()
    box(B,(0,-.05,0),(w+.3,.5,h+.3),MID,sh=.9)
    box(B,(0,.12,0),(w,.2,h),DARK,sh=.6)
    for a,b in (((-w/2,-h/2),(w/2,-h/2)),((w/2,-h/2),(w/2,h/2)),((w/2,h/2),(-w/2,h/2)),((-w/2,h/2),(-w/2,-h/2))):
        tube(B,[(a[0],.21,a[1]),(b[0],.21,b[1])],[.025,.025],WIN,1.0,4,cap0=False,cap1=False)
    floods(B,[(w/2+.22,.2,0),(-w/2-.22,.2,0)],.05)
    put(M,B,rk.surf(d,.06),frame_y(d,hint))

# ------------------------------------------------------------------ LAIR
def lair(level=1):
    # a large asteroid with a base hidden in it: level 1 a single hangar, a hatch and a whip antenna;
    # level 2 a second berth, a forge vent glowing in a crack, a stash of containers clamped to the rock, a dish
    M=Mesh(201);rk=Rock((0,0,0),2.0,21);rk.build(M)
    d=np.array([1,-.05,.35]);rock_mouth(M,rk,d,1.0,.55)
    p=rk.surf((.2,1,.3),.05);B=Mesh();plate(B,[(-.18,0,-.18),(.18,0,-.18),(.18,0,.18),(-.18,0,.18)],.05,DARK,.8);ring(B,(0,.03,0),.13,.015,ACC,seg=14,sides=4,axis='y');put(M,B,p,frame_y((.2,1,.3)))
    p=rk.surf((-.3,1,-.2),.04);tube(M,[p,p+[0,.9,0]],[.025,.01],LIGHT,.9,4);M.blob(tuple(p+[0,.9,0]),.035,WIN,sub=1,noise=0)
    floods(M,[rk.surf((1,.25,.6),-.02),rk.surf((1,-.35,.05),-.02)],.04)
    if level>=2:
        rock_mouth(M,rk,np.array([.55,-.1,1]),.75,.42,(0,1,0))
        for k,(dx,dz) in enumerate(((-.6,-.4),(-.85,.1),(-.55,.45))):               # forge vent: a glowing crack
            p=rk.surf((dx,.55,dz),.02);M.blob(tuple(p),.16,GLOW,sub=1,squash=(1.3,.35,.6),noise=.1)
        dd=np.array([-.4,.2,-1.]);dd/=np.linalg.norm(dd);B=Mesh()                    # stash: three containers on a clamp frame
        for i,x in enumerate((-.32,.32)):container(B,(x,.35,0),(.5,.36,.9),MID)
        container(B,(0,.75,0),(.5,.36,.9),MID)
        truss(B,(-.7,.1,-.5),(.7,.1,-.5),.12,.018);truss(B,(-.7,.1,.5),(.7,.1,.5),.12,.018)
        put(M,B,rk.surf(dd,.12),frame_y(dd,(1,0,0)))
        p=rk.surf((.3,1,-.5),.04);tube(M,[p,p+[0,.35,0]],[.04,.03],LIGHT,.9,6);dish(M,p+[0,.42,0],.28)
        dd=np.array([-1,.1,.4]);p=rk.surf(dd,.05);radiator(M,p,p+np.array([-1.,.0,.35]),.4,2)
        floods(M,[rk.surf((.65,.3,1),-.02),rk.surf((-.7,.6,-.2),-.02),rk.surf((.2,-1,.3),-.02)],.045)
    return M

# ------------------------------------------------------------------ DEPOT
def depot(level=1,guns=True):
    # an open hub on a vertical drum, a docking arm with a collar, a market beacon. Level 1 storage; level 2 production and a hangar;
    # level 3 defence turrets, armour plates and a life-support ring. guns=False leaves the turrets off: the game's player bases
    # draw live turrets on seats instead (beyond_base_designs.depot_model, 10 Nov 2026)
    M=Mesh(210+level)
    drum(M,(0,-1.0,0),(0,1.0,0),.62,MID,16,bands=(.15,.85))                                                # hub drum
    M.blob((0,1.0,0),.62,LIGHT,sub=2,squash=(1,.45,1),noise=0)                                            # dome
    tube(M,[(0,-1.0,0),(0,-1.45,0),(0,-1.6,0)],[.6,.3,.12],DARK,.95,14)                                      # lower cone
    for y in (-.4,.4):                                                                                       # window bands
        B=Mesh();ring(B,(0,0,0),.63,.035,WIN,seg=32,sides=4,axis='y');put(M,B,(0,y,0))
    mast(M,(0,1.25,0),1.0,.035)
    truss(M,(.6,.1,0),(2.2,.1,0),.22,.025);collar(M,(2.2,.1,0),.22,(1,0,0))                                 # docking arm
    floods(M,[(1.4,.27,.14),(1.4,.27,-.14)],.04)
    for k,a in enumerate((PI*.75,PI*1.0,PI*1.25)):                                                           # storage: containers clipped round the hub
        c=np.array([math.cos(a)*.95,-.35+.0*k,math.sin(a)*.95]);container(M,c,(.4,.32,.75),MID,yaw=PI/2-a)
    tank(M,(-.2,-.2,-1.0),.32)
    if level>=2:
        truss(M,(0,.4,.6),(0,.4,1.6),.2,.022)                                                                   # production module
        box(M,(0,.4,2.05),(.9,.6,.9),MID);box(M,(0,.72,2.05),(.5,.08,.5),DARK)
        for sx in (1,-1):radiator(M,(sx*.45,.4,2.05),(sx*1.25,.4,2.05),.45,2)
        floods(M,[(0,.4,2.52)],.05)
        truss(M,(0,-.5,-.6),(0,-.5,-1.4),.2,.022)                                                               # hangar module
        B=Mesh();box(B,(0,0,0),(1.3,.7,1.0),MID);mouth(B,(0,-.02,.5),.9,.45,.22);put(M,B,(0,-.5,-1.95),ry(PI))
        floods(M,[(.5,-.12,-2.47),(-.5,-.12,-2.47)],.04)
    if level>=3:
        if guns:
            for a in (PI/4,-PI/4,PI*.6):turret(M,(math.cos(a)*.45,1.05,math.sin(a)*.45),.85)                     # defence turrets on the dome rim
        for k in range(6):                                                                                    # armour plates
            a=k*PI/3+PI/6;c=np.array([math.cos(a),0,math.sin(a)])
            plate(M,[c*.66+[0,-.85,0]+np.cross(c,[0,1,0])*.2,c*.66+[0,-.85,0]-np.cross(c,[0,1,0])*.2,c*.66+[0,-.15,0]-np.cross(c,[0,1,0])*.2,c*.66+[0,-.15,0]+np.cross(c,[0,1,0])*.2],.05,LIGHT,.9)
        B=Mesh();ring(B,(0,0,0),1.55,.12,MID,seg=40,sides=10,axis='y');ring(B,(0,0,0),1.55,.125,WIN,seg=40,sides=4,axis='y')   # life-support ring
        for a in (PI/4,3*PI/4,5*PI/4,7*PI/4):tube(B,[(math.cos(a)*.62,0,math.sin(a)*.62),(math.cos(a)*1.48,0,math.sin(a)*1.48)],[.04,.04],DARK,.9,5)
        put(M,B,(0,.75,0))
    return M

# ------------------------------------------------------------------ STATION: the core with five hardpoints
HP_R=4.6;HP_Y=-.9
HP_A=[PI/2+k*2*PI/5 for k in range(5)]
def station_core(look='standard',pads=True):
    M=Mesh(230)
    if look=='standard':
        drum(M,(0,-2.4,0),(0,2.2,0),.75,MID,16,bands=(.1,.5,.9))                                            # spine
        drum(M,(0,-.6,0),(0,.6,0),1.25,LIGHT,18,bands=(.2,.8))                                               # central hub
        for y in (-.25,.25):B=Mesh();ring(B,(0,0,0),1.27,.035,WIN,seg=40,sides=4,axis='y');put(M,B,(0,y,0))
        B=Mesh();ring(B,(0,0,0),3.1,.32,MID,seg=56,sides=10,axis='y');ring(B,(0,0,0),3.1,.33,WIN,seg=56,sides=4,axis='y');put(M,B,(0,.0,0))   # habitat ring
        for a in np.linspace(0,2*PI,4,endpoint=False)+PI/4:truss(M,(math.cos(a)*1.2,0,math.sin(a)*1.2),(math.cos(a)*2.85,0,math.sin(a)*2.85),.3,.03)
        drum(M,(0,2.2,0),(0,2.7,0),1.0,DARK,16)                                                              # docking ring on the crown
        for a in np.linspace(0,2*PI,4,endpoint=False):collar(M,(math.cos(a)*.95,2.45,math.sin(a)*.95),.2,(math.cos(a),0,math.sin(a)))
        mast(M,(0,2.7,0),1.6,.05)
        for a in np.linspace(0,2*PI,3,endpoint=False):tank(M,(math.cos(a)*1.0,-1.6,math.sin(a)*1.0),.42)
        tube(M,[(0,-2.4,0),(0,-3.0,0),(0,-3.3,0)],[.75,.35,.1],DARK,.95,16)
        for a in (0,PI):radiator(M,(math.cos(a)*.75,1.5,math.sin(a)*.75),(math.cos(a)*2.4,1.5,math.sin(a)*2.4),.7,3)
        floods(M,[(math.cos(a)*3.1,.38,math.sin(a)*3.1) for a in np.linspace(0,2*PI,8,endpoint=False)],.07)
    else:
        rk=Rock((0,0,0),3.3,41,squash=(1.1,.8,1.05));rk.build(M,3)
        top=rk.surf((0,1,0),.2);bot=rk.surf((0,-1,0),.2)
        drum(M,top,top+[0,1.0,0],.85,MID,16,bands=(.5,));drum(M,top+[0,1.0,0],top+[0,1.5,0],1.0,DARK,16)    # crown: spine out of the rock, docking ring
        for a in np.linspace(0,2*PI,4,endpoint=False):collar(M,top+[math.cos(a)*.95,1.25,math.sin(a)*.95],.2,(math.cos(a),0,math.sin(a)))
        mast(M,top+[0,1.5,0],1.6,.05)
        drum(M,bot,bot-[0,.8,0],.6,MID,14);tube(M,[bot-[0,.8,0],bot-[0,1.2,0]],[.6,.12],DARK,.95,14)
        for d in ((1,-.1,.2),(-.8,-.15,.7),(.1,-.1,-1)):rock_mouth(M,rk,np.array(d),1.3,.7)                  # hangars cut into the flanks
        for d in ((.5,.8,.4),(-.6,.75,-.3)):p=rk.surf(d,.15);M.blob(tuple(p),.5,GLASS,sub=2,squash=(1,.6,1),noise=0)   # glass domes
        for d in ((1,.5,-.5),(-1,.4,-.2),(.3,.3,1)):p=rk.surf(d,-.02);floods(M,[p],.08)
        p=rk.surf((-.2,1,.6),.05);radiator(M,p,p+[-1.6,.4,.6],.6,3)
    if pads:
        for a in HP_A:
            c=np.array([math.cos(a)*HP_R,HP_Y,math.sin(a)*HP_R])
            if look=='standard':truss(M,(math.cos(a)*.75,HP_Y,math.sin(a)*.75),c-[math.cos(a)*.38,0,math.sin(a)*.38],.26,.028)
            else:
                d=np.array([math.cos(a),HP_Y/HP_R*.6,math.sin(a)]);p=rk.surf(d,.3)
                truss(M,p,c-[math.cos(a)*.38,0,math.sin(a)*.38],.26,.028)
            pad(M,c,.4)
    return M

# ------------------------------------------------------------------ STATION BUILDINGS (each attaches at the origin and extends along +z)
def shipyard():
    # an open gantry cradle: four long truss rails, portal frames, two travelling cranes, a keel taking shape inside, floodlights
    M=Mesh(241);L=4.2;W=1.5;H=1.2
    truss(M,(0,0,0),(0,0,.8),.3,.03)
    for x in (-W/2,W/2):
        for y in (-H/2,H/2):truss(M,(x,y,.8),(x,y,.8+L),.18,.024)
    for z in np.linspace(.8,.8+L,5):
        truss(M,(-W/2,H/2,z),(W/2,H/2,z),.16,.02,3);truss(M,(-W/2,-H/2,z),(W/2,-H/2,z),.16,.02,3)
        truss(M,(-W/2,-H/2,z),(-W/2,H/2,z),.16,.02,3);truss(M,(W/2,-H/2,z),(W/2,H/2,z),.16,.02,3)
    for z in (2.0,3.6):box(M,(0,H/2+.12,z),(W+.2,.14,.3),ACC);box(M,(0,H/2-.05,z),(.25,.2,.25),DARK);tube(M,[(0,H/2-.12,z),(0,.15,z)],[.012,.012],LIGHT,.9,4)
    box(M,(0,-.25,2.8),(.3,.14,2.6),LIGHT);[box(M,(0,-.12,z),(.7-.1*abs(z-2.8),.08,.07),MID) for z in np.linspace(1.7,3.9,7)]   # keel and ribs
    floods(M,[(x,y,z) for x in (-W/2,W/2) for y in (-H/2,H/2) for z in (.8,.8+L)],.05)
    return M
def ext_storage():
    # a storage rack: a truss spine with containers stacked both sides and three big tanks at the end
    M=Mesh(242)
    truss(M,(0,0,0),(0,0,3.4),.3,.03)
    for z in (.8,1.75,2.7):
        for sx in (1,-1):
            for y in (-.22,.22):container(M,(sx*.45,y,z),(.5,.4,.85),MID)
    for k,a in enumerate((PI/2,PI/2+2*PI/3,PI/2+4*PI/3)):tank(M,(math.cos(a)*.42,math.sin(a)*.42,3.7),.36)
    floods(M,[(0,.4,.3),(0,-.4,.3)],.04)
    return M
def defence_platform():
    # a hex gun deck on a short truss: two heavy turrets, four point-defence turrets, a sensor mast and a shield emitter
    M=Mesh(243)
    truss(M,(0,0,0),(0,0,1.2),.28,.03)
    c=np.array([0,0,2.2]);pts=[c+[math.cos(a)*1.1,0,math.sin(a)*1.1] for a in np.linspace(0,2*PI,6,endpoint=False)+PI/6]
    for y,role in ((.12,MID),(-.12,DARK)):plate(M,[p+[0,y,0] for p in pts],.12,role,.95)
    drum(M,c+[0,-.18,0],c+[0,.18,0],1.0,DARK,6,caps=False)
    ring(M,tuple(c+[0,.2,0]),1.0,.03,ACC,seg=6,sides=4,axis='y')
    for x in (-.45,.45):turret(M,c+[x,.18,.15],1.6)
    for a in np.linspace(0,2*PI,4,endpoint=False)+PI/4:turret(M,c+[math.cos(a)*.8,.18,math.sin(a)*.8],.7)
    mast(M,c+[0,.18,-.5],1.0,.035);turret(M,c+[0,-.18,.3],1.2,up=False)
    M.blob(tuple(c+[0,-.3,-.45]),.22,GLASS,sub=2,squash=(1,.7,1),noise=0)
    return M
def hangar():
    # a broad hangar hall: a half-drum roof over a long box, a big lit mouth at the far end, landing lights along the apron
    M=Mesh(244)
    truss(M,(0,0,0),(0,0,.7),.35,.03)
    box(M,(0,-.1,2.0),(2.0,.9,2.6),MID)
    B=Mesh();B.tube([(0,0,0),(0,0,2.6)],[1.0,1.0],18,lambda i,j,n,p:(LIGHT,.92+.08*(j%2)),cap0=True,cap1=True)
    for t,r in zip(B.T,B.R):
        t=np.array(t);t[:,1]=np.maximum(t[:,1],0)*.55;M.T.append(t+[0,.35,.7]);M.R.append(r)
    mouth(M,(0,-.05,3.31),1.5,.7,.3)
    plate(M,[(-.9,-.55,3.3),(.9,-.55,3.3),(.9,-.55,4.2),(-.9,-.55,4.2)],.05,DARK,.9)                         # apron
    floods(M,[(x,-.5,z) for x in (-.8,.8) for z in (3.5,3.85,4.15)],.04)
    for z in (1.2,2.0,2.8):B=Mesh();plate(B,[(-.5,0,z-.08),(.5,0,z-.08),(.5,0,z+.08),(-.5,0,z+.08)],.01,WIN,.9);put(M,B,(0,.92,0))
    return M
def forge():
    # a squat furnace drum glowing at its mouth and seams, tall exhaust stacks, radiator wings, ore hoppers
    M=Mesh(245)
    truss(M,(0,0,0),(0,0,.7),.3,.03)
    drum(M,(0,0,.7),(0,0,2.5),.85,DARK,14,bands=(.25,.75))
    B=Mesh();ring(B,(0,0,0),.86,.05,GLOW,seg=28,sides=4,axis='z');put(M,B,(0,0,1.6))
    M.blob((0,0,2.5),.6,GLOW,sub=2,squash=(1,1,.25),noise=0);ring(M,(0,0,2.52),.7,.08,ACC,seg=24,sides=5)
    for x in (-.35,.35):tube(M,[(x,.7,1.2),(x,1.9,1.2)],[.13,.11],MID,.95,8);M.blob((x,1.92,1.2),.08,DARK,sub=1,squash=(1,.3,1),noise=0);ring(M,(x,1.6,1.2),.13,.02,ACC,seg=12,sides=4,axis='y')
    for sx in (1,-1):radiator(M,(sx*.85,0,1.6),(sx*2.2,0,1.6),.8,3)
    for sx in (1,-1):tube(M,[(sx*.55,-.55,.9),(sx*.75,-.95,1.3)],[.22,.12],MID,.95,8)                           # hoppers
    return M
def market_wing():
    # a long lit concourse: a drum with window bands, three trader docking collars down its side, an amber sign panel and beacon
    M=Mesh(246)
    truss(M,(0,0,0),(0,0,.6),.3,.03)
    drum(M,(0,0,.6),(0,0,3.6),.55,LIGHT,16,bands=(.05,.95))
    for y in (-.2,0,.2):
        for sx in (1,-1):plate(M,[(sx*.555,y-.04,.8),(sx*.555,y+.04,.8),(sx*.555,y+.04,3.4),(sx*.555,y-.04,3.4)],.01,WIN,1.0)
    for z in (1.2,2.1,3.0):collar(M,(.5,0,z),.17,(1,0,0))
    M.blob((0,0,3.6),.55,LIGHT,sub=2,squash=(1,1,.4),noise=0)
    plate(M,[(-.6,.65,1.4),(.6,.65,1.4),(.6,1.15,1.4),(-.6,1.15,1.4)],.05,ACC,1.0);tube(M,[(0,.55,1.4),(0,.65,1.4)],[.04,.04],DARK,.9,5)   # sign
    mast(M,(0,.55,2.8),.8,.03)
    return M
BUILDINGS=[('Shipyard',shipyard),('External storage',ext_storage),('Defence platform',defence_platform),('Hangar',hangar),('Forge',forge),('Market wing',market_wing)]

def station_full(look='standard',picks=None):
    # a station at level 5: the core with a building on each of its five hardpoints
    M=station_core(look,pads=True)
    picks=picks or ([shipyard,ext_storage,defence_platform,hangar,market_wing] if look=='standard' else [forge,shipyard,defence_platform,ext_storage,market_wing])
    for a,fn in zip(HP_A,picks):
        put(M,fn(),(math.cos(a)*HP_R,HP_Y,math.sin(a)*HP_R),outward(a),.8)
    return M
