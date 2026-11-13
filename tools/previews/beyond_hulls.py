# Driftgate Beyond: faction hull designs generated in code, one design language per faction (preview, not in the model pack yet).
# Same conventions as tools/brood.py: nose +z, up +y, about 2 long, a colour ROLE per triangle painted from the faction palette.
#   Halcyon Accord   - long, swept and bird-like: lens-section fuselage, needle nose, glass canopy, gull wings, shield nodes
#   Varkesh Dominion - blocky armoured slabs: hexagonal hull, bolted plates, exposed gun barrels, slit canopy, square drives
#   Ostrova Collective - slender spires: diamond-section mast, a glowing reactor halo, three fins, sensor mast and crystal panels
import math,sys,os
import numpy as np
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from brood import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN

def loft(M,secs,role,cap0=True,cap1=True,sh0=1.0):
    # secs: [(z,[(x,y),...])] with the same point count; quads between sections, oriented outward from each section's centre
    if isinstance(role,tuple):role,sh0=role
    S=[(z,[np.array([x,y,z],float) for x,y in pts]) for z,pts in secs];n=len(S[0][1])
    for i in range(len(S)-1):
        a,b=S[i][1],S[i+1][1];ref=(sum(a)/n+sum(b)/n)/2
        for j in range(n):
            r,sh=role(i,j) if callable(role) else (role,sh0)
            M.tri(a[j],a[(j+1)%n],b[(j+1)%n],r,sh,ref=ref);M.tri(a[j],b[(j+1)%n],b[j],r,sh,ref=ref)
    for k,cap,dz in ((0,cap0,.01),(-1,cap1,-.01)):
        if not cap:continue
        P=S[k][1];c=sum(P)/n
        r,sh=role(-1,0) if callable(role) else (role,sh0)
        for j in range(n):M.tri(c,P[j],P[(j+1)%n],r,sh*.9,ref=c+np.array([0,0,dz]))
def box(M,c,size,role,taper=(1,1),sh=1.0):
    # a box centred on c, size (w,h,l) along x,y,z; taper scales the front (+z) face
    cx,cy,cz=c;w,h,l=size;tw,th=taper
    rect=lambda sw,sh_:[(cx-sw/2,cy-sh_/2),(cx+sw/2,cy-sh_/2),(cx+sw/2,cy+sh_/2),(cx-sw/2,cy+sh_/2)]
    loft(M,[(cz-l/2,rect(w,h)),(cz+l/2,rect(w*tw,h*th))],role,sh0=sh)
def loft_top(secs,z,x=0.0):
    # the height of a loft's upper surface at (x,z): the sections interpolated to z (as the loft's quads join them), then the
    # highest point where the section's outline crosses x
    S=sorted(secs,key=lambda s:s[0]);z=min(max(z,S[0][0]),S[-1][0])
    for i in range(len(S)-1):
        if S[i][0]<=z<=S[i+1][0]:break
    t=(z-S[i][0])/((S[i+1][0]-S[i][0]) or 1);P=[((1-t)*a[0]+t*b[0],(1-t)*a[1]+t*b[1]) for a,b in zip(S[i][1],S[i+1][1])];ys=[]
    for j in range(len(P)):
        p,q=P[j],P[(j+1)%len(P)]
        if (p[0]-x)*(q[0]-x)<=0 and p[0]!=q[0]:ys.append(p[1]+(x-p[0])/(q[0]-p[0])*(q[1]-p[1]))
    return max(ys)
def on_hull(M,secs,z0,z1,hw,t,role,sh=1.0,sink=.008,dx=0.0):
    # (7 Nov 2026) a slab laid along a loft's upper surface from z0 to z1, half-width hw, standing t proud of it: slit canopies,
    # armour bands and spine plates. They used to be flat plates and boxes at a fixed height, which floated above a hull that
    # tapers under them, or cut into each other (a band through a canopy). This one follows the hull's slope and sits into it.
    zs=sorted({z0,z1,*[s[0] for s in secs if z0<s[0]<z1]});S=[]
    for z in zs:
        lo=min(loft_top(secs,z,dx+x) for x in (-hw,0,hw))-sink;hi=loft_top(secs,z,dx)+t
        S.append((z,[(dx-hw,lo),(dx+hw,lo),(dx+hw,hi),(dx-hw,hi)]))
    loft(M,S,(role,sh))
def loft_side(secs,z,y=0.0):
    # the half-width of a loft at (y,z): its sections interpolated to z, the outermost point where the outline crosses y
    S=sorted(secs,key=lambda s:s[0]);z=min(max(z,S[0][0]),S[-1][0])
    for i in range(len(S)-1):
        if S[i][0]<=z<=S[i+1][0]:break
    t=(z-S[i][0])/((S[i+1][0]-S[i][0]) or 1);P=[((1-t)*a[0]+t*b[0],(1-t)*a[1]+t*b[1]) for a,b in zip(S[i][1],S[i+1][1])];xs=[]
    for j in range(len(P)):
        p,q=P[j],P[(j+1)%len(P)]
        if (p[1]-y)*(q[1]-y)<=0 and p[1]!=q[1]:xs.append(p[0]+(y-p[1])/(q[1]-p[1])*(q[0]-p[0]))
    return max(xs)
def cheek(M,secs,z,length,r,y=0.0,role=DARK,out=.25):
    # (11 Nov 2026) a gun on each cheek of a lofted hull at (y,z): its axis just outside the skin, so its mount is set into it
    for sx in (1,-1):barrel(M,(sx*(loft_side(secs,z,y)+out*r),y,z),length,r,role)
def plate(M,pts,thick,role,sh=1.0):
    # a thin convex plate through planar points (a wing, fin or armour panel), both faces and edges
    P=[np.array(p,float) for p in pts];n=np.cross(P[1]-P[0],P[2]-P[0]);n/=np.linalg.norm(n)+1e-12;o=n*thick/2;c=sum(P)/len(P)
    top=[p+o for p in P];bot=[p-o for p in P]
    for i in range(1,len(P)-1):M.tri(top[0],top[i],top[i+1],role,sh,ref=c);M.tri(bot[0],bot[i+1],bot[i],role,sh*.8,ref=c)
    for i in range(len(P)):j=(i+1)%len(P);M.tri(top[i],bot[i],bot[j],role,sh*.9,ref=c);M.tri(top[i],bot[j],top[j],role,sh*.9,ref=c)
def barrel(M,base,length,r,role=DARK,style=None,rec=True):
    # (11 Nov 2026) a gun along +z from base: a mount where it leaves the hull, a barrel and a muzzle, in the builder's design
    # language; its muzzle is recorded for the pack, so the game's shots leave from it. It was one tapered stick.
    # The same length and the same place as before; the mount and muzzle are a little thicker than the old stick's root.
    b=np.array(base,float);L=length;st=style or M.style;Z=lambda t:b+[0,0,L*t];n0=len(M.T)
    if role==ACC or st=='ostrova':
        # an emitter lance: a faceted needle from a collar, a small focusing ring and a crystal point
        M.tube([Z(0),Z(.1),Z(.16)],[r*1.9,r*1.9,r*1.2],6,lambda i,j,n,p:(MID,.9),cap0=True,cap1=False)
        M.tube([Z(.12),Z(.5),Z(.82)],[r*1.15,r*.95,r*.7],6,lambda i,j,n,p:(role,.95),cap0=False,cap1=False)
        ring(M,tuple(Z(.62)),r*1.7,r*.32,MID,seg=8,sides=4)
        tip=[Z(.8),Z(.87),Z(1.0)];M.tube(tip,[r*.75,r*1.25,r*.05],6,lambda i,j,n,p:(WIN,1.0),cap0=True,cap1=False)
    elif st=='varkesh':
        # a heavy exposed gun: a hex breech block, a thick barrel in a sleeve, a two-baffle muzzle brake with a dark bore
        M.tube([Z(0),Z(.2),Z(.26)],[r*2.1,r*2.1,r*1.5],6,lambda i,j,n,p:(MID,.92 if j%2 else .82),cap0=True,cap1=True)
        M.tube([Z(.2),Z(.42)],[r*1.35,r*1.3],6,lambda i,j,n,p:(DARK,1.25),cap0=False,cap1=True)
        M.tube([Z(.4),Z(.84)],[r*1.0,r*.95],6,lambda i,j,n,p:(role,.95),cap0=False,cap1=False)
        H6=lambda q:[(math.cos(a)*r*q,math.sin(a)*r*q) for a in np.linspace(0,2*math.pi,6,endpoint=False)]
        M.tube([Z(.8),Z(.87)],[r*1.65,r*1.65],6,lambda i,j,n,p:(MID,.78),cap0=True,cap1=True);M.tube([Z(.92),Z(1.0)],[r*1.65,r*1.65],6,lambda i,j,n,p:(MID,.78),cap0=True,cap1=False)
        M.tube([Z(.86),Z(.93)],[r*1.0,r*1.0],6,lambda i,j,n,p:(DARK,.6),cap0=False,cap1=False)
        M.rings(Z(1.0),[(0,H6(1.65)),(0,H6(.9)),(-L*.05,H6(.55))],DARK,.4,inward=True,cap=(2,DARK,.25))
    else:
        # a slim faired gun: a tapered fairing, a slender barrel, a muzzle ring with a dark bore
        M.tube([Z(0),Z(.14),Z(.3)],[r*1.9,r*1.7,r*1.0],8,lambda i,j,n,p:(MID,.95),cap0=True,cap1=False)
        M.tube([Z(.28),Z(.9)],[r*.92,r*.82],7,lambda i,j,n,p:(role,.95),cap0=False,cap1=False)
        M.tube([Z(.88),Z(.93),Z(1.0)],[r*.9,r*1.4,r*1.3],7,lambda i,j,n,p:(MID,.8),cap0=True,cap1=False)
        M.rings(Z(1.0),[(0,[(math.cos(a)*r*1.3,math.sin(a)*r*1.3) for a in np.linspace(0,2*math.pi,7,endpoint=False)]),(0,[(math.cos(a)*r*.8,math.sin(a)*r*.8) for a in np.linspace(0,2*math.pi,7,endpoint=False)]),(-L*.05,[(math.cos(a)*r*.6,math.sin(a)*r*.6) for a in np.linspace(0,2*math.pi,7,endpoint=False)])],DARK,.4,inward=True,cap=(2,DARK,.25))
    if rec:M.part(M.gun,Z(1.0),n0)
def cbox(M,c,size,role,taper=(1,1),sh=1.0,ch=.22):
    # (11 Nov 2026) a box with its four long edges chamfered (ch of the half-width), centred on c, size (w,h,l), the front
    # (+z) face scaled by taper: the Varkesh pods, housings and blocks, which were plain boxes. Same extents as box().
    cx,cy,cz=c;w,h,l=size;tw,th=taper
    def sec(sw,sh_):
        a,b=sw/2,sh_/2;k=ch*min(a,b);return [(cx+a,cy-b+k),(cx+a,cy+b-k),(cx+a-k,cy+b),(cx-a+k,cy+b),(cx-a,cy+b-k),(cx-a,cy-b+k),(cx-a+k,cy-b),(cx+a-k,cy-b)]
    loft(M,[(cz-l/2,sec(w,h)),(cz+l/2,sec(w*tw,h*th))],lambda i,j:(role,sh*[.92,1,1.06,1,.92,.84,.8,.84][j] if i>=0 else sh*.9))
def drivebox(M,c,size,zl,r,role=DARK,sh=1.0,taper=(1,1)):
    # (11 Nov 2026) a Varkesh square drive: a housing box centred on c (size w,h,l) whose aft end is the nozzle itself, the
    # nozzle's lip at zl. The housing stops where the nozzle starts, so the throat and its glow show; a plain box with a
    # glowing disc on its back face hid them. taper scales the housing's front face.
    w,h,l=size;d=min(.08,l*.62);z0=zl+d;z1=c[2]+l/2
    cbox(M,(c[0],c[1],(z0+z1)/2),(w,h,z1-z0),role,taper=taper,sh=sh)
    M.vent((c[0],c[1],zl),r,d,style='varkesh',frame=(w/2,h/2))
def ring(M,c,R,r,role,seg=28,sides=6,axis='z'):
    pts=[];c=np.array(c,float)
    for k in range(seg+1):
        a=k/seg*2*math.pi;v=[math.cos(a)*R,math.sin(a)*R,0] if axis=='z' else [math.cos(a)*R,0,math.sin(a)*R]
        pts.append(c+v)
    M.tube(pts,[r]*len(pts),sides,lambda i,j,n,p:(role,1.0),cap0=False,cap1=False)

# ------------------------------------------------------------------ Halcyon Swift: light fighter
def swift():
    M=Mesh(11)
    lens=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h*(1 if math.sin(a)>0 else .7)+dy) for a in np.linspace(0,2*math.pi,12,endpoint=False)]
    fus=[(-1.0,lens(.13,.11)),(-.75,lens(.17,.14)),(-.2,lens(.18,.16)),(.35,lens(.14,.14)),(.75,lens(.07,.07,-.01)),(1.05,lens(.012,.012,-.02))]
    loft(M,fus,lambda i,j:(LIGHT if j<6 else MID,1.0 if j<6 else .92))
    M.blob((0,.14,.38),.11,GLASS,sub=2,squash=(.85,.75,2.4),noise=0)
    for sx in (1,-1):
        # gull wings: root rises, then sweeps back and down to a long tip
        plate(M,[(sx*.12,.02,.05),(sx*.55,.12,-.25),(sx*.5,.12,-.48),(sx*.12,.02,-.42)],.035,LIGHT)
        plate(M,[(sx*.55,.12,-.25),(sx*1.02,.0,-.62),(sx*.98,.0,-.72),(sx*.5,.12,-.48)],.025,LIGHT,.95)
        plate(M,[(sx*.98,.0,-.62),(sx*1.02,.0,-.62),(sx*.98,.0,-.72)],.03,ACC)
        M.blob((sx*1.0,.0,-.66),.045,WIN,sub=1,squash=(1,1,1.6),noise=0)          # shield emitter node
        plate(M,[(sx*.1,.1,-.6),(sx*.24,.38,-.92),(sx*.24,.38,-1.02),(sx*.1,.1,-.98)],.025,ACC,.95)   # canted twin tail
        plate(M,[(sx*.18,.0,.12),(sx*.3,-.02,-.05),(sx*.28,-.02,-.12),(sx*.16,0,-.04)],.02,MID)       # canards
        barrel(M,(sx*.2,-.03,.0),.32,.018)
    M.tube([(0,0,-.98),(0,0,-1.08)],[.12,.1],12,lambda i,j,n,p:(DARK,.9),cap0=False,cap1=False);M.vent((0,0,-1.08),.1)
    for k in range(4):on_hull(M,fus,-.16-k*.18,-.1-k*.18,.075,.008,ACC,.9)                                         # spine stripes, laid on the hull (11 Nov 2026: flat plates at one height, they stood off it where it slopes away aft)
    return M

# ------------------------------------------------------------------ Varkesh Fang: light fighter
def fang():
    M=Mesh(23)
    hexs=lambda w,h,dy=0:[(w,dy),(w*.55,h+dy),(-w*.55,h+dy),(-w,dy),(-w*.55,-h+dy),(w*.55,-h+dy)]
    body=[(-.85,hexs(.3,.2)),(-.3,hexs(.34,.24)),(.3,hexs(.3,.22)),(.62,hexs(.2,.14,-.02)),(.8,hexs(.1,.08,-.03))]
    loft(M,body,lambda i,j:([MID,MID,MID,DARK,DARK,DARK][j],[1,1.05,1,.9,.85,.9][j]))
    on_hull(M,body,.12,.42,.07,.035,GLASS)                                                                         # slit canopy, laid on the nose
    for sx in (1,-1):
        for k,z in enumerate((.18,-.15,-.48)):box(M,(sx*.3,.13,z),(.08,.16,.3),MID,taper=(.9,.85),sh=.96+.04*k)   # bolted side armour
        plate(M,[(sx*.3,-.04,.15),(sx*.72,-.06,-.12),(sx*.72,-.06,-.4),(sx*.3,-.04,-.55)],.07,DARK)               # stubby slab wing
        cbox(M,(sx*.72,-.06,-.12),(.13,.13,.42),MID,(.82,.82))                                                     # gun pod, chamfered and tapered
        barrel(M,(sx*.72,-.03,.09),.38,.028)
        barrel(M,(sx*.72,-.09,.09),.34,.028)
        plate(M,[(sx*.18,.05,.78),(sx*.12,-.06,.78),(sx*.09,-.07,1.02),(sx*.11,.0,1.06)],.05,ACC)                  # the fangs
        drivebox(M,(sx*.16,0,-.9),(.2,.2,.14),-.98,.08)                                          # square drives (vents set just behind the drive face: flush, their glow flickered at range)
        plate(M,[(sx*.25,.2,-.45),(sx*.33,.42,-.7),(sx*.33,.42,-.8),(sx*.25,.2,-.8)],.05,ACC,.9)                    # stub fins, footed on the side armour
    barrel(M,(0,-.176,.25),.5,.035)                                                                                # chin gun: the extra slot (11 Nov 2026: a touch higher, so its breech block stays inside the hull's old box)
    cbox(M,(0,-.2,.18),(.14,.1,.22),DARK,(.8,.8))
    for z in (-.55,-.25,.05):on_hull(M,body,z-.06,z+.06,.11,.025,ACC,.9)                                         # armour bands, aft of the canopy (one used to cut through it)
    return M

# ------------------------------------------------------------------ Ostrova Mote: light fighter
def mote():
    M=Mesh(37)
    dia=lambda w,h:[(w,0),(0,h),(-w,0),(0,-h)]
    spire=[(-.95,dia(.05,.05)),(-.6,dia(.13,.11)),(-.1,dia(.16,.15)),(.4,dia(.1,.1)),(.85,dia(.035,.035)),(1.0,dia(.004,.004))]
    loft(M,spire,lambda i,j:((LIGHT,1.0) if j in (0,1) else (MID,.92)))
    ring(M,(0,0,-.32),.42,.035,ACC)                                          # the reactor halo
    ring(M,(0,0,-.32),.36,.012,WIN,sides=5)
    for k in range(3):
        a=math.pi/2+k*2*math.pi/3;ca,sa=math.cos(a),math.sin(a)
        plate(M,[(ca*.12,sa*.12,-.05),(ca*.42,sa*.42,-.28),(ca*.42,sa*.42,-.38),(ca*.12,sa*.12,-.75)],.025,LIGHT,.95)   # three spokes to the halo
        plate(M,[(ca*.1,sa*.1,-.55),(ca*.55,sa*.55,-.9),(ca*.5,sa*.5,-1.0),(ca*.08,sa*.08,-.9)],.02,MID)                 # tri fins
        M.blob((ca*.42,sa*.42,-.32),.05,GLASS,sub=1,squash=(1,1,1.5),noise=0)                                           # crystal nodes on the halo

    M.blob((0,.11,.28),.07,GLASS,sub=2,squash=(.9,.7,2.0),noise=0)
    for k in range(3):a=-math.pi/2+k*2*math.pi/3;barrel(M,(math.cos(a)*.105,math.sin(a)*.105,.1),.3,.016,ACC)       # emitter lances, between the spokes: one under the nose, one on each shoulder (11 Nov 2026: the top one ran through the canopy, and all three stood off the spire)
    M.tube([(0,0,.9),(0,0,1.32)],[.02,.012],6,lambda i,j,n,p:(LIGHT,.9))                                          # sensor mast
    for z,r in ((1.1,.06),(1.23,.042)):ring(M,(0,0,z),r,.011,ACC,seg=14,sides=5)
    for z in (1.1,1.23):plate(M,[(-.06,0,z),(.06,0,z),(0,.006,z+.004)],.006,ACC)
    plate(M,[(0,.1,-.2),(0,.3,-.45),(0,.3,-.55),(0,.1,-.6)],.015,WIN,.9)                                             # crystal panel
    M.vent((0,0,-.97),.05)
    return M

# ------------------------------------------------------------------ shared section shapes for the bigger hulls
def LENS(w,h,dy=0,n=12):return [(math.cos(a)*w,math.sin(a)*h*(1 if math.sin(a)>0 else .7)+dy) for a in np.linspace(0,2*math.pi,n,endpoint=False)]
def HEX(w,h,dy=0,dx=0):return [(w+dx,dy),(w*.55+dx,h+dy),(-w*.55+dx,h+dy),(-w+dx,dy),(-w*.55+dx,-h+dy),(w*.55+dx,-h+dy)]
def DIA(w,h,dx=0,dy=0):return [(w+dx,dy),(dx,h+dy),(-w+dx,dy),(dx,-h+dy)]
def lens_role(i,j):return (LIGHT,1.0) if j<6 else (MID,.92)
def hex_role(i,j):return ([MID,MID,MID,DARK,DARK,DARK][j],[1,1.05,1,.9,.85,.9][j])

# ------------------------------------------------------------------ Halcyon Kite: medium fighter (double delta, twin engines)
def kite():
    M=Mesh(12)
    fus=[(-1.15,LENS(.16,.12)),(-.85,LENS(.22,.16)),(-.2,LENS(.23,.19)),(.45,LENS(.17,.16)),(.95,LENS(.08,.08,-.01)),(1.28,LENS(.012,.012,-.02))]
    loft(M,fus,lens_role)
    M.blob((0,.17,.45),.13,GLASS,sub=2,squash=(.85,.75,2.6),noise=0)
    for sx in (1,-1):
        plate(M,[(sx*.15,.02,.7),(sx*.42,.04,-.05),(sx*.2,.03,-.1)],.03,LIGHT)                                     # forward strake
        plate(M,[(sx*.2,.03,.25),(sx*1.0,-.02,-.86),(sx*.96,-.02,-.98),(sx*.2,.03,-.95)],.04,LIGHT)                 # one broad delta wing
        plate(M,[(sx*.45,.06,-.3),(sx*.8,.03,-.75),(sx*.45,.06,-.75)],.012,ACC,.9)                                    # wing panel
        M.blob((sx*.98,-.02,-.92),.055,WIN,sub=1,squash=(1,1,1.7),noise=0)
        M.tube([(sx*.2,-.02,-.3),(sx*.2,-.02,-1.12),(sx*.2,-.02,-1.22)],[.1,.11,.1],10,lambda i,j,n,p:(MID,.95),cap0=True,cap1=False)
        M.vent((sx*.2,-.02,-1.22),.085)
        plate(M,[(sx*.22,.12,-.62),(sx*.4,.58,-1.02),(sx*.4,.58,-1.14),(sx*.22,.12,-1.15)],.025,ACC,.95)        # tall canted twin tail
        M.blob((sx*.215,.09,-.88),.05,MID,sub=1,squash=(.55,.8,5.2),noise=0)                                       # a root fairing joining it to the engine nacelle (it stood .03 above it)
        barrel(M,(sx*.26,-.014,.1),.38,.02)                                                                         # under the strake, its fairing set into it (11 Nov 2026: it hung .05 below)
        M.tube([(sx*.6,-.045,-.25),(sx*.6,-.045,-.7)],[.035,.035],8,lambda i,j,n,p:(DARK,.9))                   # missile launcher pod, against the wing's underside
    for k in range(5):on_hull(M,fus,-.11-k*.17,-.05-k*.17,.085,.008,ACC,.9)                                       # spine stripes, laid on the hull
    return M

# ------------------------------------------------------------------ Halcyon Osprey: heavy fighter (blended wing, twin booms, three drives)
def osprey():
    M=Mesh(13)
    fus=[(-1.1,LENS(.2,.15)),(-.8,LENS(.3,.2)),(-.1,LENS(.32,.24)),(.55,LENS(.22,.19)),(1.1,LENS(.1,.09,-.01)),(1.42,LENS(.015,.015,-.02))]
    loft(M,fus,lens_role)   # (11 Nov 2026) the stern stops short of the centre drive, whose nozzle now stands out of it
    M.blob((0,.22,.55),.15,GLASS,sub=2,squash=(.9,.75,2.5),noise=0)
    for sx in (1,-1):
        plate(M,[(sx*.28,.02,.45),(sx*.7,.05,-.1),(sx*.66,.05,-.55),(sx*.28,.02,-.75)],.06,LIGHT)                    # blended inner wing
        plate(M,[(sx*.7,.05,-.1),(sx*1.42,-.04,-.6),(sx*1.36,-.04,-.75),(sx*.66,.05,-.55)],.04,LIGHT,.95)
        M.blob((sx*1.4,-.04,-.68),.065,WIN,sub=1,squash=(1,1,1.7),noise=0)
        M.tube([(sx*.68,.04,.15),(sx*.68,.04,-1.25),(sx*.68,.04,-1.38)],[.07,.09,.085],10,lambda i,j,n,p:(MID,.95),cap0=True,cap1=False)   # booms
        M.vent((sx*.68,.04,-1.38),.07)
        plate(M,[(sx*.68,.1,-.85),(sx*.68,.5,-1.22),(sx*.68,.5,-1.34),(sx*.68,.1,-1.32)],.03,ACC,.95)              # boom tails
        for dx in (.44,.56):barrel(M,(sx*dx,-.022,.12),.42,.022)                                                     # twin guns side by side under the inner wing (11 Nov 2026: they were one behind the other on one line, the rear one firing into the front one)
        M.tube([(sx*1.0,-.052,-.3),(sx*1.0,-.052,-.75)],[.04,.04],8,lambda i,j,n,p:(DARK,.9))                   # launcher pod, against the wing's underside (it hung .03 below)
    plate(M,[(-.68,.42,-1.22),(.68,.42,-1.22),(.68,.42,-1.32),(-.68,.42,-1.32)],.025,ACC)                          # stabiliser between the booms
    M.tube([(0,0,-1.04),(0,0,-1.12)],[.15,.135],10,lambda i,j,n,p:(MID,.9),cap0=False,cap1=False);M.vent((0,0,-1.2),.13,.09)
    M.blob((0,.27,-.35),.13,MID,sub=2,squash=(1,.4,1),noise=0);ring(M,(0,.33,-.35),.13,.018,WIN,seg=18,sides=5,axis='y')   # dorsal emitter dish
    for k in range(6):
        if not -.52<.22-k*.17<-.18:on_hull(M,fus,.19-k*.17,.25-k*.17,.09,.008,ACC,.9)                               # spine stripes, laid on the hull (none under the emitter dish)
    return M

# ------------------------------------------------------------------ Varkesh Talon: medium fighter (a pincer: two claw sponsons reach past a short cockpit pod)
def talon():
    M=Mesh(24)
    pod=[(-.75,HEX(.24,.2)),(-.2,HEX(.28,.23)),(.3,HEX(.24,.2)),(.55,HEX(.14,.12,-.02))]
    loft(M,pod,hex_role)                                                                                         # short cockpit pod
    on_hull(M,pod,.08,.42,.08,.035,GLASS)                                                                          # slit canopy, laid on the pod
    cbox(M,(0,0,-.92),(1.3,.3,.34),DARK,(.92,.9),ch=.3)                                                           # wide drive block, its edges chamfered
    for sx in (1,-1):
        loft(M,[(-.85,HEX(.15,.17,0,sx*.62)),(-.1,HEX(.17,.19,0,sx*.64)),(.75,HEX(.13,.15,-.01,sx*.6)),(1.15,HEX(.07,.08,-.02,sx*.5))],hex_role)  # claw sponson
        plate(M,[(sx*.47,.1,1.05),(sx*.53,-.1,1.05),(sx*.3,-.06,1.32),(sx*.27,.05,1.3)],.06,ACC)                      # claw tip curling inward
        plate(M,[(sx*.22,-.02,.25),(sx*.5,-.03,.45),(sx*.5,-.03,-.6),(sx*.22,-.02,-.6)],.06,DARK)                   # slab joining pod and sponson
        for dy in (.07,-.07):barrel(M,(sx*.72,dy,.55),.5,.03)
        for k,z in enumerate((.45,.05,-.35)):box(M,(sx*.79,.06,z),(.05,.2,.3),MID,taper=(.9,.85),sh=.96+.03*k)
        for dx in (.22,.48):drivebox(M,(sx*dx,0,-1.12),(.2,.18,.12),-1.19,.065)
        plate(M,[(sx*.62,.18,-.45),(sx*.66,.48,-.75),(sx*.66,.48,-.86),(sx*.62,.18,-.86)],.06,ACC,.9)
    for z in (-.45,-.03):on_hull(M,pod,z-.06,z+.06,.1,.025,ACC,.9)                                                 # armour bands, clear of the canopy
    return M

# ------------------------------------------------------------------ Varkesh Halberd: heavy fighter (a brawler: an armoured core with four gun-and-drive pods on an X of slab arms)
def halberd():
    M=Mesh(25)
    chis=lambda w,h,dy=0:[(w,dy),(w*.8,h+dy),(-w*.8,h+dy),(-w,dy),(-w*.7,-h*.7+dy),(w*.7,-h*.7+dy)]
    core=[(-1.0,HEX(.32,.3)),(-.4,HEX(.38,.36)),(.35,HEX(.34,.32)),(.75,chis(.3,.24,-.02)),(1.1,chis(.24,.12,-.06)),(1.28,chis(.18,.03,-.09))]
    loft(M,core,hex_role)                                                                                        # armoured core into a chisel prow
    on_hull(M,core,.2,.55,.1,.035,GLASS)                                                                           # slit canopy, laid on the core
    for sx in (1,-1):plate(M,[(sx*.05,.24,.8),(sx*.26,.2,.8),(sx*.2,.07,1.18),(sx*.05,.08,1.18)],.03,ACC)                # chevron armour on the prow
    cbox(M,(0,.0,1.15),(.3,.1,.16),DARK,(.8,.7))
    for z in (-.6,-.3,0):on_hull(M,core,z-.07,z+.07,.15,.025,ACC,.9)                                               # armour bands, aft of the canopy (one used to cut through it)
    for sx in (1,-1):
        for sy in (1,-1):
            px,py=sx*.78,sy*.5
            plate(M,[(sx*.25,sy*.15,.25),(px*.95,py*.95,.05),(px*.95,py*.95,-.55),(sx*.25,sy*.15,-.75)],.07,DARK if sy<0 else MID)   # slab arm
            cbox(M,(px,py,-.15),(.22,.22,1.1),MID,(.72,.72),ch=.28)                                               # pod, chamfered and tapered
            cbox(M,(px,py,.38),(.16,.16,.12),ACC,(.9,.9),.95,.28)
            barrel(M,(px,py,.42),.45,.034)                                                                         # gun out of each pod
            drivebox(M,(px,py,-.75),(.2,.2,.14),-.83,.07)                                         # drive at the back of each pod
            for k in range(3):box(M,(px+sx*(.098,.105,.12)[k],py,.1-k*.25),(.03,.18,.18),DARK,sh=.95)                    # armour ribs on the pod's flank, following its taper
    cbox(M,(0,-.38,.0),(.22,.12,.4),DARK,(.75,.8));barrel(M,(0,-.4,.2),.5,.03)                                                # ventral gun
    return M

# ------------------------------------------------------------------ Ostrova Wisp: medium fighter (a crescent on rods)
def arc(M,c,R,r,role,a0,a1,seg=16,sides=6):
    c=np.array(c,float);pts=[]
    for k in range(seg+1):
        a=a0+(a1-a0)*k/seg;pts.append(c+[math.cos(a)*R,0,math.sin(a)*R])
    M.tube(pts,[r*(.6+.4*math.sin(math.pi*k/seg)) for k in range(seg+1)],sides,lambda i,j,n,p:(role,1.0),cap0=True,cap1=True)
    return pts
def wisp():
    M=Mesh(38)
    loft(M,[(-.9,DIA(.06,.06)),(-.55,DIA(.15,.12)),(-.05,DIA(.17,.16)),(.45,DIA(.1,.1)),(.95,DIA(.035,.035)),(1.1,DIA(.004,.004))],lambda i,j:((LIGHT,1.0) if j in (0,1) else (MID,.92)))
    for sx in (1,-1):
        a0,a1=(-1.25,1.05) if sx>0 else (math.pi-1.05,math.pi+1.25)
        pts=arc(M,(0,0,-.25),.78,.045,ACC,a0,a1)
        m=pts[8];w0=pts[5];w1=pts[11]
        plate(M,[(sx*.14,0,.2),(w1[0],w1[1],w1[2]),(w0[0],w0[1],w0[2]),(sx*.14,0,-.6)],.03,LIGHT)                   # one wing, spire to crescent
        plate(M,[(sx*.3,.018,.0),(m[0]*.85,.018,m[2]+.12),(m[0]*.85,.018,m[2]-.12),(sx*.3,.018,-.35)],.008,ACC,.9)      # wing trim
        for p in (pts[0],pts[-1]):M.blob(tuple(p),.06,GLASS,sub=1,squash=(1,1,1.4),noise=0)
        barrel(M,tuple((pts[-1] if sx>0 else pts[0])+[0,0,.02]),.3,.016,ACC)                                          # a lance on each crescent's forward tip (11 Nov 2026: the port one stood on the aft tip, pointing into the crescent)
    for sy in (1,-1):plate(M,[(0,sy*.1,-.5),(0,sy*.42,-.85),(0,sy*.38,-.95),(0,sy*.08,-.9)],.02,MID)
    M.blob((0,.12,.32),.075,GLASS,sub=2,squash=(.9,.7,2.0),noise=0)
    M.tube([(0,0,1.0),(0,0,1.42)],[.02,.012],6,lambda i,j,n,p:(LIGHT,.9))
    for z,r in ((1.2,.065),(1.34,.045)):ring(M,(0,0,z),r,.011,ACC,seg=14,sides=5);plate(M,[(-r,0,z),(r,0,z),(0,.006,z+.004)],.006,ACC)   # sensor rings, each on a crossbar through the mast (they floated round it)
    M.vent((0,0,-.92),.055)
    return M

# ------------------------------------------------------------------ Ostrova Vigil: heavy fighter (a tuning fork: a broad crystal-veined body, twin forward prongs
# holding a focus crystal, and two halos crossed in an X round the hull)
def vigil():
    M=Mesh(39)
    loft(M,[(-1.15,DIA(.08,.06)),(-.75,DIA(.3,.18)),(-.1,DIA(.36,.22)),(.4,DIA(.3,.18)),(.62,DIA(.2,.12))],lambda i,j:((LIGHT,1.0) if j in (0,1) else (MID,.92)))   # broad faceted body
    for sx in (1,-1):
        for z0,z1 in ((-.6,-.2),(-.05,.35)):plate(M,[(sx*.05,.2,z1),(sx*.27,.06,z1-.06),(sx*.27,.06,z0+.06),(sx*.05,.2,z0)],.01,WIN,.85)   # crystal veins on the back
        loft(M,[(.45,DIA(.07,.09,sx*.22)),(.9,DIA(.06,.08,sx*.2)),(1.3,DIA(.04,.05,sx*.15)),(1.55,DIA(.005,.005,sx*.11))],lambda i,j:((LIGHT,1.0) if j in (0,1) else (MID,.92)))   # forward prongs
        plate(M,[(sx*.3,0,-.55),(sx*.78,0,-.95),(sx*.74,0,-1.08),(sx*.26,0,-1.0)],.025,MID)                            # swept aft fins
        M.vent((sx*.14,0,-1.08),.045)
    plate(M,[(0,.15,-.6),(0,.48,-.95),(0,.45,-1.06),(0,.12,-1.0)],.025,MID)
    star=lambda w,h:[(math.cos(a)*(w if k%2==0 else w*.6),math.sin(a)*(h if k%2==0 else h*.6)) for k,a in enumerate(np.linspace(0,2*math.pi,10,endpoint=False))]
    loft(M,[(1.05,star(.01,.01)),(1.22,star(.1,.1)),(1.4,star(.01,.01))],lambda i,j:((WIN,1.0) if j%2 else (GLASS,1.0)))   # the focus crystal between the prongs
    M.part(M.gun,(0,0,1.4),len(M.T))                                                                              # its shots leave from the focus crystal's point
    for sx in (1,-1):M.tube([(sx*.17,0,1.22),(sx*.09,0,1.22)],[.012,.012],5,lambda i,j,n,p:(ACC,1.0),cap0=False,cap1=False)
    def xring(c,R,r,role,th,sides=6,seg=32):
        # a halo that contains the hull axis, tilted th about it; two at +-45 deg make an X seen from the nose
        u=np.array([math.sin(th),math.cos(th),0.0])
        pts=[np.array(c,float)+u*math.cos(a)*R+np.array([0,0,math.sin(a)*R]) for a in np.linspace(0,2*math.pi,seg+1)]
        M.tube(pts,[r]*len(pts),sides,lambda i,j,n,p:(role,1.0),cap0=False,cap1=False)
        return u
    for th in (math.pi/4,-math.pi/4):                                                                             # two halos crossed in an X
        u=xring((0,0,-.25),.62,.035,ACC,th);xring((0,0,-.25),.55,.012,WIN,th,sides=4)
        for sg in (1,-1):
            M.blob(tuple(np.array([0,0,-.25])+u*sg*.62),.06,GLASS,sub=1,noise=0)                                  # crystal node at each tip of the X
            M.tube([u*sg*.2+[0,0,-.25],u*sg*.6+[0,0,-.25]],[.022,.022],6,lambda i,j,n,p:(LIGHT,.9),cap0=False,cap1=False)   # spoke from the body
    M.blob((0,.24,.25),.1,GLASS,sub=2,squash=(.9,.6,2.0),noise=0)                                                       # canopy
    M.blob((0,.225,-.45),.09,MID,sub=2,squash=(1,.35,1),noise=0);ring(M,(0,.255,-.45),.09,.013,ACC,seg=18,sides=5,axis='y')  # sensor dish on the back
    return M

# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('swift kite osprey','halcyon'),('fang talon halberd','varkesh'),('mote wisp vigil','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
FAMILY=[('halcyon','Halcyon Accord',[('Swift','Light',swift),('Kite','Medium',kite),('Osprey','Heavy',osprey)]),
        ('varkesh','Varkesh Dominion',[('Fang','Light',fang),('Talon','Medium',talon),('Halberd','Heavy',halberd)]),
        ('ostrova','Ostrova Collective',[('Mote','Light',mote),('Wisp','Medium',wisp),('Vigil','Heavy',vigil)])]

DESIGNS=[('halcyon','Swift','Halcyon Accord',swift,['Fast and light, thin hull','Strong shields; emitter nodes on the wingtips','3 weapon slots: twin guns under the canards, one more']),
         ('varkesh','Fang','Varkesh Dominion',fang,['Slow, heavily armoured, wide','Hungry reactor; square twin drives','4 weapon slots: two wing pods and a chin gun']),
         ('ostrova','Mote','Ostrova Collective',mote,['Deep reactor in a glowing halo','Best sensors and lock range; weak shields','3 weapon slots: emitter lances round the spire'])]
