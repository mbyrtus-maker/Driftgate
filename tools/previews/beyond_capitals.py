# Driftgate Beyond: capital ships, an escort and a carrier per faction (preview, not in the model pack yet). Second pass.
# Capital ships, not resized fighters: long layered hulls, plating, sponsons and superstructure, a raised BRIDGE with a lit
# window band (no fighter canopies), no fighter fins.
# Driftgate 1's two capitals set the working parts every design keeps (see DESIGN_NOTES "Capital ship models"):
#   escort  - forward torpedo tubes, point-defence turrets on the flanks (3 a side), a bridge, a ventral assault bay, a shield
#             generator, a main drive and auxiliaries, hull berths for docking
#   carrier - a flight deck players land on from above (spots fore and aft), launch mouths at the bow, point-defence turrets,
#             a bridge, a shield generator, several drives
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,barrel,ring,LENS,HEX,DIA,lens_role,hex_role
from beyond_work import finish,abox,crystal,lights,SP,STAR
from beyond_recon import dish,torpedo,SMH,smh_role
PI=math.pi

def tube(M,pts,rad,role,sh=1.0,sides=8,cap0=True,cap1=True):
    # as beyond_work.tube, but picks a frame that also works for tubes standing straight up
    p=np.array(pts,float);d=p[-1]-p[0];up=(0,0,1) if abs(d[1])>.9*(np.linalg.norm(d)+1e-12) else (0,1,0)
    M.tube(pts,rad,sides,lambda i,j,n,q:(role,sh),cap0=cap0,cap1=cap1,up=up)
def stacks(M,base,n,sp=.16,h=.3):
    for k in range(n):
        b=np.array(base,float)+[k*sp-(n-1)*sp/2,0,0];box(M,tuple(b+[0,.03,0]),(.13,.06,.13),DARK);tube(M,[b,b+[0,h,0]],[.065,.06],MID,1.0,8);ring(M,tuple(b+[0,h*.75,0]),.07,.014,ACC,seg=12,sides=4,axis='y');M.blob(tuple(b+[0,h+.005,0]),.045,DARK,sub=1,squash=(1,.3,1),noise=0)

def pd(M,c,r=.07,role=MID,up=True):
    # a point-defence turret: a base, a dome and twin barrels pointing forward
    # (11 Nov 2026) shaped: a turntable set a little into what it stands on, a faceted two-tier housing, a mantlet and twin
    # barrels with muzzle collars (it was a drum, a squashed ball and two plain sticks). The same seat c and the same size;
    # recorded with its mount's direction so the mount check can measure its seating.
    c=np.array(c,float);s=1 if up else -1;n0=len(M.T)
    tube(M,[c-[0,s*r*.22,0],c+[0,s*r*.34,0]],[r*1.2,r*1.12],DARK,.9,8)
    tube(M,[c+[0,s*r*.34,0],c+[0,s*r*.95,0],c+[0,s*r*1.4,0]],[r*.98,r*.8,r*.3],role,1.0,6)
    box(M,(c[0],c[1]+s*r*.7,c[2]+r*.72),(r*1.15,r*.5,r*.5),DARK,sh=1.15)
    for sx in (1,-1):
        b=c+[sx*r*.33,s*r*.7,r*.9];tube(M,[b,b+[0,0,r*1.25]],[.011,.0095],DARK,1.0,5,cap0=False,cap1=False);tube(M,[b+[0,0,r*1.2],b+[0,0,r*1.5]],[.0155,.0155],MID,.8,5)
    M.part(M.pd,c,n0,(0,s,0),r)
def spots(M,pts,r=.12,y=0):
    # deck landing spots: an accent ring with a bar
    for x,z in pts:
        ring(M,(x,y+.01,z),r,.012,ACC,seg=16,sides=4,axis='y')
        plate(M,[(x-r*.7,y+.012,z-.012),(x+r*.7,y+.012,z-.012),(x+r*.7,y+.012,z+.012),(x-r*.7,y+.012,z+.012)],.004,ACC)
def mouth(M,c,w,h,d=.25,proud=0.0):
    # a hangar launch mouth: a dark recess with a lit lip. proud (7 Nov 2026): how far its face stands out from c; at 0 a mouth
    # set .01 in front of a bow face flickers against it at range
    abox(M,(c[0],c[1],c[2]-d/2+proud),(w,h,d),DARK,(1,1),.6)
    for a,b in (((-w/2,-h/2),(w/2,-h/2)),((w/2,-h/2),(w/2,h/2)),((w/2,h/2),(-w/2,h/2)),((-w/2,h/2),(-w/2,-h/2))):
        tube(M,[(c[0]+a[0],c[1]+a[1],c[2]+.01),(c[0]+b[0],c[1]+b[1],c[2]+.01)],[.012,.012],WIN,1.0,4,cap0=False,cap1=False)
def shieldgen(M,c,r=.14,up=True):
    c=np.array(c,float);s=1 if up else -1;tube(M,[c-[0,s*r*.6,0],c],[r*.7,r*.6],DARK,.9,10);M.blob(tuple(c+[0,s*r*.15,0]),r,GLASS,sub=2,squash=(1,.65,1),noise=0)
    ring(M,tuple(c),r*1.1,.016,WIN,seg=18,sides=4,axis='y')
def windows(M,c,w,y,z,n=None):
    # a lit window band facing forward
    plate(M,[(c-w/2,y-.018,z),(c+w/2,y-.018,z),(c+w/2,y+.018,z),(c-w/2,y+.018,z)],.012,WIN,1.0)
def sidewin(M,x,y,z0,z1):
    plate(M,[(x,y-.015,z0),(x,y-.015,z1),(x,y+.015,z1),(x,y+.015,z0)],.01,WIN,1.0)

def bridge_halcyon(M,c,s=1.0):
    # a streamlined lens bridge pod on a pedestal, a wrap-round window band, a dish
    x,y,z=c
    loft(M,[(z-.45*s,[(a+x,b+y) for a,b in LENS(.1*s,.08*s)]),(z-.3*s,[(a+x,b+y) for a,b in LENS(.16*s,.12*s)]),(z+.1*s,[(a+x,b+y) for a,b in LENS(.15*s,.12*s)]),(z+.2*s,[(a+x,b+y) for a,b in LENS(.08*s,.07*s)])],lens_role)   # pedestal
    yb=y+.16*s
    loft(M,[(z-.3*s,[(a+x,b+yb) for a,b in LENS(.18*s,.08*s)]),(z-.15*s,[(a+x,b+yb) for a,b in LENS(.26*s,.11*s)]),(z+.2*s,[(a+x,b+yb) for a,b in LENS(.24*s,.1*s)]),(z+.33*s,[(a+x,b+yb) for a,b in LENS(.12*s,.05*s)])],lens_role)   # bridge pod
    windows(M,x,.36*s,yb+.03*s,z+.27*s)
    for sx in (1,-1):sidewin(M,x+sx*.252*s,yb+.03*s,z-.1*s,z+.18*s)
    dish(M,(x,yb+.13*s,z-.18*s),.08*s);tube(M,[(x,yb+.08*s,z-.18*s),(x,yb+.12*s,z-.18*s)],[.015,.015],LIGHT,.9,5)
def bridge_varkesh(M,c,s=1.0):
    # stepped smoothed-hex tiers, a slit window band on the top tier, a mast
    x,y,z=c
    for k,(w,h,l,dy) in enumerate(((.42,.14,.7,0),(.32,.12,.52,.13),(.22,.1,.36,.24))):
        loft(M,[(z-l/2*s,[(a+x,b+y+dy*s) for a,b in SMH(w/2*s,h/2*s)]),(z+l/2*s,[(a+x,b+y+dy*s) for a,b in SMH(w/2*s*.92,h/2*s*.92)])],smh_role)
    windows(M,x,.18*s,y+.25*s,z+.18*s);[sidewin(M,x+sx*.105*s,y+.25*s,z-.12*s,z+.14*s) for sx in (1,-1)]
    tube(M,[(x,y+.3*s,z-.08*s),(x,y+.62*s,z-.1*s)],[.016,.01],LIGHT,.9,5);ring(M,(x,y+.5*s,z-.09*s),.04*s,.008,ACC,seg=10,sides=4,axis='y')
def bridge_ostrova(M,c,s=1.0):
    # a faceted spire tower, a crystal window band round its head, a slender mast
    x,y,z=c;b=np.array([x,y,z])
    tube(M,[b,b+[0,.12*s,0],b+[0,.2*s,0]],[.16*s,.13*s,.15*s],MID,1.0,6)
    tube(M,[b+[0,.2*s,0],b+[0,.28*s,0]],[.15*s,.13*s],WIN,1.0,6,cap0=False,cap1=False)
    tube(M,[b+[0,.28*s,0],b+[0,.34*s,0],b+[0,.38*s,0]],[.13*s,.08*s,.01],LIGHT,1.0,6)
    tube(M,[b+[0,.37*s,0],b+[0,.55*s,0]],[.012,.006],LIGHT,.9,5);ring(M,tuple(b+[0,.47*s,0]),.05*s,.008,ACC,seg=10,sides=4,axis='y')

# ============================================================== HALCYON
def shrike():    # escort: a long layered lens hull: a broad torpedo prow, a raised dorsal superstructure spine, turret sponsons
                 # faired along the flanks, a bridge pod aft of amidships, emitter nodes on short pylons, a three-drive engine block
    M=Mesh(111)
    loft(M,[(-2.3,LENS(.42,.3)),(-1.9,LENS(.5,.34)),(.9,LENS(.5,.34)),(1.6,LENS(.42,.28,-.02)),(2.05,LENS(.3,.18,-.04)),(2.25,LENS(.16,.1,-.05))],lens_role)   # main hull
    loft(M,[(-1.8,LENS(.12,.06,.3)),(-1.5,LENS(.22,.12,.34)),(.8,LENS(.2,.11,.33)),(1.4,LENS(.08,.04,.3))],lens_role)   # dorsal superstructure spine
    # three accent plates laid on the spine (7 Nov 2026: they used to float flat above it): each bends over the spine's top
    # facets, two panels a side, sitting on the surface
    def spine_pt(z,a,f=0.0):
        t=(z+1.5)/2.3;w,h,dy=.22-.02*t,.12-.01*t,.34-.01*t
        def v(deg):r=math.radians(deg);return (math.cos(r)*w,math.sin(r)*h+dy)
        p,q=v(a),v(a-30);return (p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f,z)
    for z in (-1.0,-.2,.6):
        for sx in (1,-1):
            for a,f in ((90,1.0),(60,.6)):
                P=[spine_pt(z-.18,a),spine_pt(z-.18,a,f),spine_pt(z+.18,a,f),spine_pt(z+.18,a)]
                c=np.mean(P,0);d=np.cross(np.subtract(P[1],P[0]),np.subtract(P[3],P[0]));d=d/np.linalg.norm(d)*(1 if d[1]>0 else -1)
                plate(M,[(sx*(p[0]+d[0]*.004),p[1]+d[1]*.004,p[2]) for p in P],.006,ACC,.9)
    for sx in (1,-1):
        for dy in (.04,-.1):tube(M,[(sx*.18,dy-.05,2.0),(sx*.18,dy-.05,2.3)],[.06,.06],DARK,.85,8,cap1=False);M.blob((sx*.18,dy-.05,2.27),.045,ACC,sub=1,noise=0)   # torpedo tubes
        loft(M,[(-1.5,[(a+sx*.5,b-.04) for a,b in LENS(.05,.05)]),(-1.2,[(a+sx*.5,b-.04) for a,b in LENS(.15,.14)]),(.9,[(a+sx*.5,b-.04) for a,b in LENS(.15,.14)]),(1.3,[(a+sx*.5,b-.04) for a,b in LENS(.05,.05)])],lens_role)   # turret sponson
        for z in (-.85,-.1,.65):pd(M,(sx*.56,.1,z),.07)
        tube(M,[(sx*.5,.05,-1.65),(sx*.78,.12,-1.75)],[.025,.02],LIGHT,.9,5);M.blob((sx*.8,.13,-1.76),.06,WIN,sub=1,noise=0)   # emitter nodes on pylons
        sidewin(M,sx*.505,.12,-.5,.5)
    bridge_halcyon(M,(0,.42,-1.0),1.0)
    shieldgen(M,(0,-.25,.75),.12,up=False)                                                                           # (7 Nov 2026) sunk into the hull's belly
    abox(M,(0,-.28,-.4),(.34,.12,.6),DARK,(.9,.9))                                                                   # ventral assault bay, its top inside the hull
    loft(M,[(-2.6,LENS(.36,.26)),(-2.3,LENS(.44,.31))],(MID,.95))                                                    # engine block
    M.vent((0,0,-2.62),.2)
    for sx in (1,-1):M.vent((sx*.28,.0,-2.6),.11)
    lights(M,[(.3,-.08,2.18),(-.3,-.08,2.18)],.04)
    return finish(M,3.6,1.0)
def sovereign(): # carrier: a broad blended lens hull with a flat flight deck, twin hangar mouths in the bow, four engine booms aft
                 # (no tail fins), a bridge pod beside the deck, turret sponsons and a shield generator
    M=Mesh(112)
    loft(M,[(-2.2,LENS(.7,.32)),(-1.5,LENS(1.1,.42)),(1.0,LENS(1.05,.42)),(1.9,LENS(.7,.32)),(2.3,LENS(.32,.18))],lens_role)
    plate(M,[(-.62,.44,2.05),(.62,.44,2.05),(.7,.44,-1.2),(-.7,.44,-1.2)],.03,MID,.95)                               # flight deck
    spots(M,[(-.3,1.35),(.3,1.35),(-.3,-.45),(.3,-.45)],.14,.46)
    for x in (-.32,.32):plate(M,[(x-.012,.465,1.9),(x+.012,.465,1.9),(x+.012,.465,-1.1),(x-.012,.465,-1.1)],.003,WIN,.9)
    for sx in (1,-1):mouth(M,(sx*.42,.05,2.28),.42,.26)
    for sx in (1,-1):
        loft(M,[(-1.6,[(a+sx*1.05,b) for a,b in LENS(.05,.05)]),(-1.3,[(a+sx*1.05,b) for a,b in LENS(.14,.14)]),(1.3,[(a+sx*1.05,b) for a,b in LENS(.14,.14)]),(1.6,[(a+sx*1.05,b) for a,b in LENS(.05,.05)])],lens_role)
        for z in (-.9,-.1,.7):pd(M,(sx*1.1,.12,z),.07)
        tube(M,[(sx*1.15,-.05,-1.0),(sx*1.15,-.05,-2.5),(sx*1.15,-.05,-2.65)],[.16,.2,.19],MID,.95,12,cap1=False);M.vent((sx*1.15,-.05,-2.65),.16)   # engine booms
        for z in (-1.5,-2.1):ring(M,(sx*1.15,-.05,z),.205,.014,ACC,seg=18,sides=4)
        M.blob((sx*1.2,.15,-1.5),.07,WIN,sub=1,noise=0)
        tube(M,[(sx*.62,-.3,-.9),(sx*.62,-.3,-2.45),(sx*.62,-.3,-2.6)],[.13,.17,.16],MID,.95,12,cap1=False);M.vent((sx*.62,-.3,-2.6),.14)   # inner engine booms under the hull
        for z in (-1.6,-2.15):ring(M,(sx*.62,-.3,z),.175,.012,ACC,seg=18,sides=4)
        sidewin(M,sx*1.07,.08,-1.2,1.2)
    bridge_halcyon(M,(.85,.42,-.6),1.1)                                                                             # bridge beside the deck
    shieldgen(M,(0,.48,-1.75),.18)
    loft(M,[(-2.36,LENS(.6,.29)),(-2.2,LENS(.7,.32))],(MID,.95))                                                    # engine block: five drives
    for x in (0,.34,-.34):M.vent((x,.07,-2.37),.14)
    for x in (.17,-.17):M.vent((x,-.12,-2.37),.11)
    return finish(M,4.6,1.0)

# ============================================================== VARKESH
def vanguard():  # escort: a clean armoured smoothed-hex hull, a chisel prow with four torpedo tubes, long turret pylons standing off the hull on two beams each, a stepped bridge,
                 # a four-drive engine block
    M=Mesh(121)
    loft(M,[(-2.2,SMH(.48,.36)),(1.0,SMH(.48,.36)),(1.7,SMH(.36,.26,-.02)),(2.15,SMH(.18,.1,-.05))],smh_role)
    # torpedo tubes, their mouths in the chisel prow's end face (7 Nov 2026: they ended inside the prow, which runs on to 2.15:
    # all four were hidden in game and the lower two's caps showed through its underside as specks)
    for x in (-.075,.075):
        for y in (-.002,-.088):tube(M,[(x,y,2.0),(x,y,2.17)],[.04,.04],DARK,.85,8,cap1=False);M.blob((x,y,2.145),.03,ACC,sub=1,noise=0)
    for sx in (1,-1):
        loft(M,[(-1.6,[(a+sx*.86,b-.02) for a,b in SMH(.06,.07)]),(-1.3,[(a+sx*.86,b-.02) for a,b in SMH(.14,.16)]),(.9,[(a+sx*.86,b-.02) for a,b in SMH(.14,.16)]),(1.2,[(a+sx*.86,b-.02) for a,b in SMH(.06,.07)])],smh_role)   # turret pylon, standing off the hull
        for z in (.7,-1.1):abox(M,(sx*.6,-.02,z),(.5,.11,.17),MID,(1,1),.95);abox(M,(sx*.6,-.02,z),(.46,.14,.05),ACC,(1,1),.95)    # beams to the hull, fore and aft (the amber collar a little prouder: .0075 above the beam it flickered at range)
        for z in (-1.0,-.25,.5):pd(M,(sx*.88,.14,z),.07,MID)
        sidewin(M,sx*.485,.06,-1.5,.8)
    for z in (-1.4,-.4,.6):loft(M,[(z-.05,SMH(.5,.38)),(z+.05,SMH(.5,.38))],(ACC,.95))                                # armour bands
    bridge_varkesh(M,(0,.32,-.9),1.0)
    shieldgen(M,(0,-.35,.6),.12,up=False)
    abox(M,(0,-.36,-.3),(.36,.1,.6),DARK,(.9,.9))
    loft(M,[(-2.55,SMH(.42,.32)),(-2.2,SMH(.5,.38))],smh_role)                                                       # engine block
    for x in (-.2,.2):
        for y in (-.12,.12):M.vent((x,y,-2.57),.11)
    stacks(M,(0,.36,-1.8),2,.22,.28)
    lights(M,[(.2,-.06,2.1),(-.2,-.06,2.1)],.04)
    return finish(M,3.6,1.0)
def bastille():  # carrier: a smooth slab fortress, a railed flight deck, hangar mouths in a blunt bow, turret pylons standing off the hull on two beams each,
                 # a stepped bridge aft, armour bands, an eight-drive engine block
    M=Mesh(122)
    loft(M,[(-2.3,SMH(1.0,.5)),(1.75,SMH(1.0,.5)),(2.25,SMH(.85,.4,-.04))],smh_role)                               # slab hull
    plate(M,[(-.78,.5,2.05),(.78,.5,2.05),(.78,.5,-1.25),(-.78,.5,-1.25)],.03,DARK,.95)                              # flight deck
    spots(M,[(-.35,1.4),(.35,1.4),(-.35,-.5),(.35,-.5)],.15,.51)
    for sx in (1,-1):
        loft(M,[(-1.3,[(a+sx*.82,b+.56) for a,b in SMH(.04,.04)]),(1.95,[(a+sx*.82,b+.56) for a,b in SMH(.04,.04)])],(ACC,.95))   # deck rail
        mouth(M,(sx*.45,.0,2.26),.48,.3,proud=.02)                                                                # (its face .03 clear of the bow, not .01)
        loft(M,[(-1.9,[(a+sx*1.5,b-.04) for a,b in SMH(.08,.1)]),(-1.6,[(a+sx*1.5,b-.04) for a,b in SMH(.18,.24)]),(1.4,[(a+sx*1.5,b-.04) for a,b in SMH(.18,.24)]),(1.7,[(a+sx*1.5,b-.04) for a,b in SMH(.08,.1)])],smh_role)   # turret pylon, standing off the hull
        for z in (1.05,-1.35):abox(M,(sx*1.17,-.04,z),(.62,.15,.24),MID,(1,1),.95);abox(M,(sx*1.17,-.04,z),(.58,.19,.07),ACC,(1,1),.95)   # beams to the hull, fore and aft (collar prouder, as the Vanguard's)
        for z in (-1.2,-.4,.4,1.1):pd(M,(sx*1.53,.2,z),.075,MID)
        sidewin(M,sx*1.0,.1,-1.8,1.6)
    # armour bands. (7 Nov 2026) Built as tall as the hull, their tops lay in its top face, .015 under the flight deck's surface,
    # and showed through the deck in amber flicker at range; their bellies lay flush on its belly. The tops now tuck under the
    # deck inside the hull (the bands look the same everywhere they show) and the bellies stand just proud of it.
    band=lambda w:[(w,0),(w*.82,.35),(.5,.47),(-.5,.47),(-w*.82,.35),(-w,0),(-w*.82,-.3),(-w*.4,-.44),(w*.4,-.44),(w*.82,-.3)]
    for z in (-1.8,-.9,0,.9):loft(M,[(z-.05,band(1.03)),(z+.05,band(1.03))],(ACC,.95))
    bridge_varkesh(M,(0,.5,-1.75),1.35)
    shieldgen(M,(0,.6,-.95),.16)
    loft(M,[(-2.65,SMH(.85,.42)),(-2.3,SMH(1.0,.5))],smh_role)                                                       # engine block
    for x in (-.6,-.2,.2,.6):
        for y in (-.15,.15):M.vent((x,y,-2.67),.12)
    lights(M,[(.6,.3,2.3),(-.6,.3,2.3)],.045)
    return finish(M,4.6,1.0)

# ============================================================== OSTROVA
def lantern():   # escort: a long faceted spire hull in three sections, two turret halos round it, crystal cores between them,
                 # four torpedo tubes in the prow, a spire bridge, a drive cluster
    M=Mesh(131)
    OCT=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
    oct_role=lambda i,j:([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[1,.97,1,.95,.9,.85,.85,.92][j])
    loft(M,[(-2.3,OCT(.3,.28)),(-1.9,OCT(.4,.36)),(1.0,OCT(.38,.34)),(1.75,OCT(.24,.22)),(2.2,OCT(.08,.07))],oct_role)   # long faceted hull
    for z in (-1.15,.15):                                                                                          # two turret halos round the hull
        ring(M,(0,0,z),.66,.045,ACC,seg=36,sides=6)
        for k in range(6):
            a=PI/6+k*PI/3;x,y=math.cos(a)*.66,math.sin(a)*.66
            if abs(math.cos(a))>.5:pd(M,(x,y,z),.06,ACC,up=y>0)
            else:tube(M,[(math.cos(a)*.38,math.sin(a)*.38,z),(x*.95,y*.95,z)],[.03,.03],LIGHT,.9,5,cap0=False,cap1=False)
        for k in (0,3):a=PI/6+k*PI/3;tube(M,[(math.cos(a)*.38,math.sin(a)*.38,z),(math.cos(a)*.62,math.sin(a)*.62,z)],[.03,.03],LIGHT,.9,5,cap0=False,cap1=False)
    for sx in (1,-1):crystal(M,-.95,-.05,.14,.16,sx*.4,0)                                                            # crystal cores between the halos
    for k in range(4):a=PI/4+k*PI/2;tube(M,[(math.cos(a)*.18,math.sin(a)*.16,1.7),(math.cos(a)*.18,math.sin(a)*.16,1.95)],[.045,.045],DARK,.85,8,cap1=False);M.blob((math.cos(a)*.18,math.sin(a)*.16,1.92),.035,ACC,sub=1,noise=0)
    bridge_ostrova(M,(0,.33,-.55),1.0)
    shieldgen(M,(0,-.33,.7),.12,up=False)
    abox(M,(0,-.36,-.5),(.3,.1,.55),DARK,(.9,.9))
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.16,math.sin(a)*.15,-2.32),.1)
    return finish(M,3.6,1.0)
def cathedral(): # carrier: a smooth, great crystal-veined hull with a flight deck along its back, hangar mouths in the bow, two horizontal
                 # rings round the hull fore and aft carrying turrets and crystal holds, a spire bridge, a drive cluster
    M=Mesh(132)
    OCT=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
    oct_role=lambda i,j:([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[1,.97,1,.95,.9,.85,.85,.92][j])
    loft(M,[(-2.4,OCT(.5,.36)),(-1.9,OCT(.85,.55)),(1.4,OCT(.82,.54)),(2.1,OCT(.5,.34)),(2.45,OCT(.18,.12))],oct_role)   # smooth great hull
    for sx in (1,-1):
        for k in range(2):plate(M,[(sx*.8,-.05+k*.14,1.6),(sx*.8,.05+k*.14,1.6),(sx*.79,.05+k*.14,-1.6),(sx*.79,-.05+k*.14,-1.6)],.01,WIN,.85)   # crystal veins
        mouth(M,(sx*.3,-.02,2.3),.3,.2)
    plate(M,[(-.46,.51,1.4),(.46,.51,1.4),(.46,.51,-.95),(-.46,.51,-.95)],.03,MID,.95)                          # flight deck along the back
    spots(M,[(-.22,1.0),(.22,1.0),(-.22,-.45),(.22,-.45)],.13,.53)
    for z0 in (1.2,-1.45):                                                                                         # two horizontal rings round the hull, fore and aft
        R=1.25;ring(M,(0,0,z0),R,.06,ACC,seg=48,sides=6,axis='y')
        for sx in (1,-1):
            tube(M,[(sx*.8,0,z0),(sx*R*.97,0,z0)],[.05,.05],LIGHT,.9,6,cap0=False,cap1=False)                         # spoke from the hull
            crystal(M,z0-.42,z0+.42,.17,.2,sx*R,0)                                                                   # crystal hold on the ring
            for a in (.55,-.55):pd(M,(sx*math.cos(a)*R,.05,z0+math.sin(a)*R),.08,ACC)                                 # turrets on the ring
    bridge_ostrova(M,(0,.5,-1.55),1.4)
    shieldgen(M,(0,.56,-1.12),.13)
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.3,math.sin(a)*.22,-2.42),.14)
    lights(M,[(.3,-.1,2.4),(-.3,-.1,2.4)],.045)
    return finish(M,4.6,1.0)

# ============================================================== DESTROYERS: line ships between the escort and the carrier, built around a main gun
def main_turret(M,c,s=1.0,aft=False,n=3):
    # a heavy gun turret: a barbette ring, an angled housing, n long barrels (pointing +z, or -z if aft)
    x,y,z=c;d=-1 if aft else 1
    tube(M,[(x,y-.04*s,z),(x,y+.05*s,z)],[.21*s,.2*s],DARK,.9,12)
    loft(M,[(z-d*.22*s,[(a+x,b+y+.1*s) for a,b in HEX(.2*s,.09*s)]),(z+d*.2*s,[(a+x,b+y+.1*s) for a,b in HEX(.17*s,.07*s)])],smh_role) if not aft else \
    loft(M,[(z-.2*s,[(a+x,b+y+.1*s) for a,b in HEX(.17*s,.07*s)]),(z+.22*s,[(a+x,b+y+.1*s) for a,b in HEX(.2*s,.09*s)])],smh_role)
    for k in range(n):
        bx=x+(k-(n-1)/2)*.09*s;bz=z+d*.18*s
        tube(M,[(bx,y+.1*s,bz),(bx,y+.1*s,bz+d*.7*s)],[.032*s,.026*s],DARK,1.0,6,cap0=False)
        ring(M,(bx,y+.1*s,bz+d*.08*s),.04*s,.01,ACC,seg=10,sides=4)

def peregrine(): # destroyer: a lens hull that splits into two prongs round a spinal rail cannon, accelerator rings glowing between them,
                 # a capacitor bank along its back, faired drive nacelles, a bridge pod aft
    M=Mesh(113)
    loft(M,[(-2.3,LENS(.38,.28)),(-1.8,LENS(.52,.34)),(.3,LENS(.5,.34)),(.9,LENS(.3,.22))],lens_role)                 # main hull
    for sx in (1,-1):
        loft(M,[(.2,[(a+sx*.26,b) for a,b in LENS(.17,.2)]),(1.4,[(a+sx*.26,b) for a,b in LENS(.14,.17)]),(2.15,[(a+sx*.24,b-.01) for a,b in LENS(.08,.09)]),(2.4,[(a+sx*.22,b-.02) for a,b in LENS(.03,.03)])],lens_role)   # prongs
        loft(M,[(-2.5,[(a+sx*.56,b-.04) for a,b in LENS(.14,.15)]),(-1.1,[(a+sx*.56,b-.04) for a,b in LENS(.14,.15)]),(-.7,[(a+sx*.52,b-.04) for a,b in LENS(.05,.06)])],lens_role)   # drive nacelle, faired into the flank
        M.vent((sx*.56,-.04,-2.52),.11)
        for z in (-1.2,-.4,.4):pd(M,(sx*.4,.2,z),.07)
        pd(M,(sx*.27,.2,1.3),.06)
        sidewin(M,sx*.505,.08,-1.6,.2)
    tube(M,[(0,0,.6),(0,0,2.55)],[.075,.06],DARK,.95,10,cap1=False);ring(M,(0,0,2.55),.075,.016,ACC,seg=14,sides=4);bore(M,(0,0,2.55),.06)   # spinal rail cannon
    for z in (1.0,1.4,1.8,2.15):ring(M,(0,0,z),.15-.012*(z-1),.022,WIN,seg=20,sides=5)                          # accelerator rings
    loft(M,[(-1.2,LENS(.1,.05,.3)),(-1.0,LENS(.2,.09,.32)),(.2,LENS(.18,.08,.31)),(.5,LENS(.06,.03,.3))],lens_role)   # capacitor bank
    for z in (-.8,-.4,0):plate(M,[(-.14,.405,z+.1),(.14,.405,z+.1),(.14,.405,z-.1),(-.14,.405,z-.1)],.006,WIN,.9)
    bridge_halcyon(M,(0,.4,-1.55),.95)
    shieldgen(M,(0,-.33,-.7),.12,up=False)
    loft(M,[(-2.55,LENS(.3,.22)),(-2.3,LENS(.38,.28))],(MID,.95));M.vent((0,0,-2.57),.17)
    lights(M,[(.26,-.1,2.2),(-.26,-.1,2.2)],.035)
    return finish(M,4.1,1.0)

def bore(M,c,r,depth=None,n=10):
    # (11 Nov 2026) the mouth of a big gun at c facing +z: a rim, and a dark bore going back into the barrel (the big guns
    # were open pipes); the muzzle is recorded, so the game's main-gun shot is drawn leaving from it
    c=np.array(c,float);d=depth or r*1.6;n0=len(M.T);C=lambda q:[(math.cos(a)*q,math.sin(a)*q) for a in np.linspace(0,2*PI,n,endpoint=False)]
    M.rings(c,[(0,C(r)),(0,C(r*.74)),(-d,C(r*.6))],DARK,.42,inward=True,cap=(2,DARK,.2));M.part(M.gun,c,n0)
def giant_gun(M,c):
    # one giant main gun: a broad barbette, a long angled housing, one huge barrel with a muzzle brake, pointing +z
    x,y,z=c
    tube(M,[(x,y-.06,z),(x,y+.06,z)],[.3,.28],DARK,.9,14)
    loft(M,[(z-.42,[(a+x,b+y+.15) for a,b in SMH(.2,.1)]),(z-.3,[(a+x,b+y+.15) for a,b in SMH(.27,.14)]),(z+.3,[(a+x,b+y+.15) for a,b in SMH(.25,.13)]),(z+.42,[(a+x,b+y+.15) for a,b in SMH(.18,.09)])],smh_role)
    tube(M,[(x,y+.15,z+.35),(x,y+.15,z+.6),(x,y+.15,z+1.55)],[.1,.075,.06],DARK,1.0,10,cap0=False,cap1=False)
    ring(M,(x,y+.15,z+.62),.085,.02,ACC,seg=14,sides=4)
    tube(M,[(x,y+.15,z+1.5),(x,y+.15,z+1.72)],[.09,.09],MID,.95,8,cap1=False);bore(M,(x,y+.15,z+1.72),.09,n=8)
    for zz in (1.56,1.64):ring(M,(x,y+.15,z+zz),.092,.012,DARK,seg=12,sides=4)
    plate(M,[(x-.12,y+.2885,z+.15),(x+.12,y+.2885,z+.15),(x+.12,y+.2935,z-.15),(x-.12,y+.2935,z-.15)],.012,ACC,.9)   # (7 Nov 2026) laid on the housing's slope: flat, it crossed the housing's top at 1 degree and flickered
def ironclad():  # destroyer: an armoured smoothed-hex hull on a flared armour belt, two giant main guns on the centreline (the second
                 # raised to fire over the first), a stepped bridge behind them, exhaust stacks, a four-drive block
    M=Mesh(123)
    loft(M,[(-2.3,SMH(.48,.34)),(1.2,SMH(.48,.34)),(1.9,SMH(.34,.24,-.03)),(2.35,SMH(.14,.08,-.06))],smh_role)     # hull
    loft(M,[(-2.2,SMH(.42,.1,-.2)),(-1.9,SMH(.62,.16,-.18)),(1.3,SMH(.62,.16,-.18)),(1.85,SMH(.4,.1,-.2))],smh_role)   # flared armour belt
    for sx in (1,-1):
        loft(M,[(-1.85,[(a+sx*.6,b-.03) for a,b in SMH(.03,.02)]),(1.3,[(a+sx*.6,b-.03) for a,b in SMH(.03,.02)])],(ACC,.95))   # belt trim
        for z in (-1.4,-.6,.25):pd(M,(sx*.56,-.02,z),.07,MID)
        sidewin(M,sx*.485,.12,-1.9,1.0)
    giant_gun(M,(0,.34,.75))                                                                                       # two giant main guns, the second raised to fire over the first
    abox(M,(0,.43,-.35),(.72,.2,.95),MID,(1,1),.95);giant_gun(M,(0,.54,-.35))
    bridge_varkesh(M,(0,.34,-1.35),1.0)
    stacks(M,(0,.34,-1.95),2,.24,.26)
    shieldgen(M,(0,-.36,-.4),.12,up=False)
    loft(M,[(-2.6,SMH(.4,.3)),(-2.3,SMH(.48,.34))],smh_role)
    for x in (-.19,.19):
        for y in (-.11,.11):M.vent((x,y,-2.62),.1)
    lights(M,[(.2,-.1,2.25),(-.2,-.1,2.25)],.04)
    return finish(M,4.1,1.0)

def prism():     # destroyer: a faceted hull carrying three long spars (two above, one below) that converge on a great crystal lens in the prow,
                 # the spinal lance; an energy conduit feeds it, turrets ride the spars, a low spire bridge, a small halo round the stern
    M=Mesh(133)
    OCT=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
    oct_role=lambda i,j:([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[1,.97,1,.95,.9,.85,.85,.92][j])
    loft(M,[(-2.3,OCT(.3,.28)),(-1.8,OCT(.44,.38)),(.2,OCT(.4,.34)),(.85,OCT(.2,.18))],oct_role)                     # faceted hull
    tube(M,[(0,0,.8),(0,0,1.55)],[.1,.08],WIN,1.0,6,cap0=False,cap1=False)                                          # energy conduit
    M.part(M.gun,(0,0,2.8),len(M.T));crystal(M,1.3,2.8,.3,.3,0,0)                                                                             # the lens: a great prow crystal
    for a in (PI/6,5*PI/6,3*PI/2):                                                                                   # three spars
        u=np.array([math.cos(a),math.sin(a)])
        pts=[(u[0]*r,u[1]*r,z) for r,z in ((.3,-1.6),(.62,-.5),(.62,.9),(.2,2.1))]
        tube(M,pts,[.1,.13,.13,.07],MID,1.0,6)
        for k in (1,2):M.blob(pts[k],.15,LIGHT,sub=1,squash=(1,1,1.4),noise=0)
        for (r,z) in ((.64,-.15),(.64,.6)):pd(M,(u[0]*r,u[1]*r+(.11 if u[1]>0 else -.11),z),.065,ACC,up=u[1]>0)
    for sx in (1,-1):
        for k in range(2):plate(M,[(sx*.405,-.04+k*.12,.0),(sx*.405,.04+k*.12,.0),(sx*.42,.04+k*.12,-1.6),(sx*.42,-.04+k*.12,-1.6)],.01,WIN,.85)   # crystal veins
    ring(M,(0,0,-1.95),.58,.035,ACC,seg=32,sides=6)                                                                 # a small halo round the stern
    for k in range(4):a=PI/4+k*PI/2;tube(M,[(math.cos(a)*.3,math.sin(a)*.27,-1.95),(math.cos(a)*.56,math.sin(a)*.56,-1.95)],[.025,.025],LIGHT,.9,5,cap0=False,cap1=False)
    bridge_ostrova(M,(0,.34,-1.2),.95)
    shieldgen(M,(0,-.36,-.3),.11,up=False)
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.15,math.sin(a)*.14,-2.32),.1)
    return finish(M,4.1,1.0)

# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('shrike peregrine sovereign','halcyon'),('vanguard ironclad bastille','varkesh'),('lantern prism cathedral','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
CAPITALS=[('halcyon','Halcyon Accord',[('Shrike','Escort',shrike),('Peregrine','Destroyer',peregrine),('Sovereign','Carrier',sovereign)]),
          ('varkesh','Varkesh Dominion',[('Vanguard','Escort',vanguard),('Ironclad','Destroyer',ironclad),('Bastille','Carrier',bastille)]),
          ('ostrova','Ostrova Collective',[('Lantern','Escort',lantern),('Prism','Destroyer',prism),('Cathedral','Carrier',cathedral)])]
