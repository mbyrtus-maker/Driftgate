# Driftgate Beyond: miners and haulers (preview, not in the model pack yet). Third pass.
# Wholly new craft built in code, mixing two sources:
#  - Driftgate 1's work ships for proportion and purpose: stubby, wide industrial bodies; miners with forward drill arms and
#    mining lenses, ore hoppers and charge launchers; haulers with big holds, containers and intakes.
#  - Each faction's approved fighters for shape language:
#      Halcyon  lens hulls, glass canopies, swept and twin tails, emitter nodes, the Osprey's twin booms
#      Varkesh  hex slabs, chisel prows, the Talon's pincer sponsons, the Halberd's X of pods, square drives, armour bands
#      Ostrova  diamond spires, halos, the Wisp's crescent, the Vigil's prongs and crossed rings, crystal bodies
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,barrel,ring,LENS,HEX,DIA,lens_role,hex_role,loft_top,on_hull,drivebox,cheek,loft_side
PI=math.pi

def finish(M,length,girth=1.12):
    # work ships: about 12% more girth than the fighters' proportions
    P=np.array(M.T,float);lo=P.reshape(-1,3).min(0);hi=P.reshape(-1,3).max(0);c=(lo+hi)/2;k=length/(hi[2]-lo[2])
    sc=k*np.array([girth,girth,1.0]);M.xf(lambda Q:(Q-c)*sc)   # the recorded nozzles, muzzles and seats move with the hull
    for e in M.eng:e[1]*=k*girth
    for e in M.pd:e[2]*=k*girth
    return M
def tube(M,pts,rad,role,sh=1.0,sides=8,cap0=True,cap1=True):M.tube(pts,rad,sides,lambda i,j,n,p:(role,sh),cap0=cap0,cap1=cap1)
def drill(M,base,length,r,role=DARK):
    # a drill bit: a cone with collar bands, pointing +z
    b=np.array(base,float);tube(M,[b,b+[0,0,length*.35],b+[0,0,length]],[r,r*.8,r*.04],role,.95,8,cap0=True,cap1=False)
    for t in (.12,.42):ring(M,tuple(b+[0,0,length*t]),r*(1-.25*t)+.005,r*.12,ACC,seg=12,sides=4)
def lens_head(M,base,r,glow=WIN):
    # a mining-laser lens on a collar, facing +z
    # (11 Nov 2026) recorded as a mining head: the game's mining beams leave from these
    b=np.array(base,float);n0=len(M.T);ring(M,tuple(b),r*1.1,r*.18,ACC,seg=14,sides=5);M.blob(tuple(b+[0,0,r*.25]),r*.8,glow,sub=1,squash=(1,1,.55),noise=0);M.part(M.mine,b+[0,0,r*.69],n0)
def launcher(M,base,n,role=DARK,sp=.08,pylon=0):
    # pylon: (14 Nov 2026, floating parts) a block from the tubes' axis up by that much, into the hull above (the rack hung clear of the belly)
    if pylon:box(M,(base[0],base[1]+pylon/2,base[2]+.1),((n-1)*sp+.07,pylon,.12),MID,sh=.9)
    for k in range(n):tube(M,[np.array(base)+[k*sp-(n-1)*sp/2,0,0],np.array(base)+[k*sp-(n-1)*sp/2,0,.2]],[.032,.032],role,.9,6)
def vents(M,pts,r):[M.vent(p,r) for p in pts]
def sqdrive(M,c,s):drivebox(M,c,(s,s*.9,s*.7),c[2]-s*.38,s*.38)
def hatch(M,c,w,l,y=None):plate(M,[(c[0]-w/2,c[1],c[2]+l/2),(c[0]+w/2,c[1],c[2]+l/2),(c[0]+w/2,c[1],c[2]-l/2),(c[0]-w/2,c[1],c[2]-l/2)],.012,DARK,.95)
def stacks(M,base,n,sp=.16,h=.3,foot=None):
    # exhaust stacks standing up off the back: square Varkesh columns on a footing, an amber band near the top and a dark
    # mouth (built from boxes: a vertical tube collapsed to nothing in the exporter, which left the bands floating).
    # foot: (7 Nov 2026) the hull's height under them, when that is below base: the footing goes down onto the hull and the
    # column runs up from it to the same top (on three hulls the stacks hung in the air above a hull that falls away there)
    h=h*.55
    for k in range(n):
        b=np.array(base,float)+[k*sp-(n-1)*sp/2,0,0];f=b.copy()
        if foot is not None:f[1]=foot
        box(M,tuple(f+[0,.03,0]),(.14,.06,.14),DARK)
        box(M,(b[0],(f[1]+b[1]+.03+h)/2+.015,b[2]),(.09,b[1]+h-f[1],.09),MID)
        box(M,tuple(b+[0,.03+h*.78,0]),(.118,.03,.118),ACC)
        box(M,tuple(b+[0,.03+h+.006,0]),(.08,.014,.08),DARK)
def lights(M,pts,r=.035):
    # floodlights
    for p in pts:M.blob(p,r,WIN,sub=1,noise=0)
def ribs(M,zs,R,dy=0,r=.016):
    for z in zs:ring(M,(0,dy,z),R,r,ACC,seg=22,sides=4)
SP=lambda i,j:((LIGHT,1.0) if j in (0,1) else (MID,.92))
STAR=lambda w,h,n=10:[(math.cos(a)*(w if k%2==0 else w*.62),math.sin(a)*(h if k%2==0 else h*.62)) for k,a in enumerate(np.linspace(0,2*PI,n,endpoint=False))]
def crystal(M,z0,z1,w,h,dx=0,dy=0):
    loft(M,[(z0,[(x+dx,y+dy) for x,y in STAR(.02,.02)]),(z0+(z1-z0)*.25,[(x+dx,y+dy) for x,y in STAR(w,h)]),(z0+(z1-z0)*.7,[(x+dx,y+dy) for x,y in STAR(w*.85,h*.85)]),(z1,[(x+dx,y+dy) for x,y in STAR(.02,.02)])],
         lambda i,j:((WIN,1.0) if j%2 else (GLASS,1.0)))

# ============================================================== HALCYON
def wren():      # light miner: a chubby lens pod with a bubble canopy, two drill arms hugging the nose, stub wings, twin tails
    M=Mesh(51)
    loft(M,[(-.75,LENS(.2,.17)),(-.45,LENS(.34,.28)),(.1,LENS(.36,.3)),(.45,LENS(.3,.26)),(.62,LENS(.24,.2,.02)),(.72,LENS(.15,.12,.02))],lens_role)
    M.blob((0,.27,.32),.17,GLASS,sub=2,squash=(1,.8,1.4),noise=0)
    loft(M,[(-.5,LENS(.24,.12,-.24)),(-.1,LENS(.3,.16,-.28)),(.3,LENS(.2,.1,-.22))],(MID,.9))                     # ore hopper belly
    for sx in (1,-1):
        tube(M,[(sx*.36,-.06,-.25),(sx*.4,-.08,.35),(sx*.3,-.1,.72)],[.09,.085,.07],LIGHT,.95,10,cap1=False)        # drill arm
        drill(M,(sx*.3,-.1,.7),.35,.075)
        plate(M,[(sx*.34,.05,-.1),(sx*.72,.1,-.35),(sx*.68,.1,-.48),(sx*.34,.05,-.45)],.035,LIGHT)                    # stub wing
        M.blob((sx*.7,.1,-.41),.045,WIN,sub=1,noise=0)
        plate(M,[(sx*.14,.22,-.5),(sx*.22,.38,-.68),(sx*.22,.38,-.76),(sx*.14,.2,-.76)],.025,ACC,.95)                   # twin canted tails
        launcher(M,(sx*.2,-.3,-.05),2)
        barrel(M,(sx*.5,.042,-.2),.34,.016)                                                                        # a gun under each stub wing
    lens_head(M,(0,-.12,.72),.07)                                                                                  # mining lens under the nose
    vents(M,[(.12,0,-.78),(-.12,0,-.78)],.08)
    ribs(M,(-.3,.05),.37);lights(M,[(.2,-.02,.72),(-.2,-.02,.72)])
    return finish(M,2.0)
def plover():    # medium miner: the Osprey's twin booms become fat ore hoppers with drills; a cockpit pod between
    M=Mesh(52)
    pod=[(-.6,LENS(.18,.15)),(-.2,LENS(.24,.2)),(.45,LENS(.2,.17)),(.8,LENS(.15,.13,-.01))]
    loft(M,pod,lens_role);cheek(M,pod,.4,.32,.015,-.05)                                                            # cockpit pod, a gun on each cheek
    M.blob((0,.2,.42),.13,GLASS,sub=2,squash=(.9,.75,2.0),noise=0)
    for sx in (1,-1):
        loft(M,[(-1.15,[(x+sx*.72,y) for x,y in LENS(.12,.12)]),(-.85,[(x+sx*.72,y) for x,y in LENS(.3,.27)]),(.15,[(x+sx*.72,y) for x,y in LENS(.32,.28)]),
                (.7,[(x+sx*.72,y) for x,y in LENS(.22,.2)]),(.95,[(x+sx*.72,y) for x,y in LENS(.1,.1)])],lens_role)        # hopper boom
        for z in (-.6,-.25,.1):hatch(M,(sx*.72,.278,z),.2,.22)                                                       # hatches on the boom's crown (wider, their edges stood off its curve)
        drill(M,(sx*.72,0,.95),.45,.1)
        lens_head(M,(sx*.72,-.105,.84),.06)                                                                          # mining lens under the boom's nose (11 Nov 2026: it hung in the gap between pod and boom)
        plate(M,[(sx*.2,.0,.2),(sx*.45,.0,.2),(sx*.45,.0,-.5),(sx*.2,.0,-.5)],.06,MID)                               # struts to the pod
        plate(M,[(sx*.72,.25,-.9),(sx*.72,.45,-1.1),(sx*.72,.45,-1.2),(sx*.72,.24,-1.2)],.03,ACC,.95)
        M.blob((sx*1.04,0,-.3),.05,WIN,sub=1,noise=0)
        M.vent((sx*.72,0,-1.16),.1)
        launcher(M,(sx*.72,-.19,.3),3)
    for sx in (1,-1):[ring(M,(sx*.72,0,z),.33,.016,ACC,seg=22,sides=4) for z in (-.75,.5)]
    for sx in (1,-1):[tube(M,[(sx*.72+math.cos(a)*.2,math.sin(a)*.2,.5),(sx*.72+math.cos(a)*.325,math.sin(a)*.325,.5)],[.014,.014],LIGHT,.9,4) for a in (PI/4,3*PI/4,5*PI/4,7*PI/4)]   # (12 Nov 2026) the forward hoop stood off the boom where it tapers: four struts hold it
    lights(M,[(.15,-.04,.82),(-.15,-.04,.82)])
    return finish(M,2.6)
def heron():     # heavy miner: a broad flattened lens hull with two stacked hoppers, drills, four drives
    M=Mesh(53)
    hull=[(-1.2,LENS(.4,.22)),(-.7,LENS(.75,.32)),(.2,LENS(.8,.34)),(.75,LENS(.5,.26)),(1.0,LENS(.22,.14,.04))]
    loft(M,hull,lens_role);cheek(M,hull,.6,.34,.02,.02)                                                            # broad hull, a gun on each bow shoulder
    for x in (-.12,0,.12):lens_head(M,(x,.05,1.0),.045)                                                             # three mining lenses across the bow (11 Nov 2026: it had drills, but no lens for its three beams)
    for x in (-.35,.35):loft(M,[(-.9,[(a+x,b+.28) for a,b in LENS(.12,.08)]),(-.6,[(a+x,b+.3) for a,b in LENS(.26,.2)]),(.3,[(a+x,b+.3) for a,b in LENS(.26,.2)]),(.55,[(a+x,b+.28) for a,b in LENS(.1,.07)])],lens_role)   # stacked hoppers
    for x in (-.35,.35):
        for z in (-.4,-.05,.25):ring(M,(x,.3,z),.265,.015,ACC,seg=18,sides=4)
    M.blob((0,.36,.72),.16,GLASS,sub=2,squash=(1.2,.7,1.5),noise=0)
    for sx in (1,-1):
        drill(M,(sx*.4,-.08,.82),.55,.12)                                                                            # (4 Nov 2026: set into the bow; they hung in space beside it)
        plate(M,[(sx*.75,.0,-.1),(sx*1.25,.02,-.55),(sx*1.2,.02,-.75),(sx*.7,.0,-.7)],.06,LIGHT)
        box(M,(sx*1.15,-.04,-.6),(.18,.14,.3),MID);M.blob((sx*1.15,.08,-.6),.05,WIN,sub=1,noise=0)                # drone bays
        plate(M,[(sx*.45,.18,-.85),(sx*.65,.48,-1.12),(sx*.65,.48,-1.22),(sx*.45,.09,-1.05)],.035,ACC,.95)          # tails, their roots on the hull (they stood off its falling stern)
        launcher(M,(sx*.6,-.3,.4),3,pylon=.14)
        for dx in (.2,.5):M.vent((sx*dx,0,-1.22),.11)
    lights(M,[(.4,.0,1.0),(-.4,.0,1.0),(0,.18,1.02)])
    return finish(M,3.2)
def tern():      # light hauler: a short lens cockpit hull with its cargo hold joined on behind it, a forked tail and a glass canopy
    M=Mesh(54)
    nose=[(-.05,LENS(.2,.17)),(.25,LENS(.22,.19)),(.55,LENS(.18,.16)),(.72,LENS(.12,.1,-.01))]
    loft(M,nose,lens_role);cheek(M,nose,.36,.26,.013,-.07)                                                          # cockpit hull, a small gun low on each cheek
    M.blob((0,.17,.45),.11,GLASS,sub=2,squash=(.9,.75,1.8),noise=0)
    loft(M,[(-.9,LENS(.2,.17,.02)),(-.75,LENS(.3,.26,.02)),(-.25,LENS(.31,.27,.02)),(-.02,LENS(.21,.18))],lens_role)  # cargo hold, joined on behind
    for z in (-.65,-.45,-.25):ring(M,(0,.02,z),.31,.016,ACC,seg=20,sides=4)
    for k,z in enumerate((-.6,-.35)):hatch(M,(0,.285,z),.26,.18)
    for sx in (1,-1):
        plate(M,[(sx*.12,.18,-.75),(sx*.42,.24,-1.05),(sx*.34,.24,-1.05),(sx*.1,.18,-.88)],.03,ACC)                  # forked tail
        plate(M,[(sx*.2,.0,.35),(sx*.42,.02,.15),(sx*.4,.02,.05),(sx*.2,.0,.08)],.03,LIGHT)
        M.blob((sx*.41,.02,.1),.04,WIN,sub=1,noise=0)
        M.vent((sx*.12,.02,-.92),.08)
    lights(M,[(.09,-.04,.72),(-.09,-.04,.72)])
    return finish(M,2.0)
def albatross(): # medium hauler: a broad, thick flying-wing whose wings are cargo bays, twin tails, a raised glass bridge
    M=Mesh(55)
    sec=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h*(1 if math.sin(a)>0 else .55)+dy) for a in np.linspace(0,2*PI,16,endpoint=False)]
    loft(M,[(-1.0,sec(.7,.14)),(-.6,sec(1.25,.24)),(.2,sec(1.1,.26)),(.75,sec(.55,.2)),(1.05,sec(.15,.08))],lambda i,j:((LIGHT,1.0) if j<8 else (MID,.92)))   # the flying-wing hull
    for sx in (1,-1):
        for k,z in enumerate((-.45,-.1,.25)):hatch(M,(sx*(.55+.0*k),.24 if z>-.3 else .22,z),.35,.25)
        plate(M,[(sx*.45,.2,-.7),(sx*.55,.45,-.95),(sx*.55,.45,-1.05),(sx*.45,.2,-1.0)],.035,ACC,.95)
        M.blob((sx*1.2,.0,-.4),.06,WIN,sub=1,noise=0)
        for dx in (.3,.75):M.vent((sx*dx,0,-1.0),.09)
        barrel(M,(sx*.5,-.1,.42),.34,.017)                                                                          # a gun under each wing bay
    loft(M,[(.2,LENS(.14,.1,.22)),(.45,LENS(.16,.13,.26)),(.75,LENS(.08,.06,.22))],lens_role);M.blob((0,.38,.5),.11,GLASS,sub=2,squash=(1,.7,1.6),noise=0)
    lights(M,[(.1,-.045,1.0),(-.1,-.045,1.0)])                                                                     # under the nose's lip (they hung beside it)
    return finish(M,2.6)
def pelican():   # heavy hauler: a huge bulbous cargo pouch hull between two big engine pylons
    M=Mesh(56)
    hull=[(-1.25,LENS(.3,.24)),(-.8,LENS(.6,.5,-.05)),(.2,LENS(.7,.62,-.12)),(.85,LENS(.5,.45,-.12)),(1.25,LENS(.15,.12,.05))]
    loft(M,hull,lens_role);cheek(M,hull,.8,.38,.02,-.02)                                                            # the pouch hull, a gun on each cheek under the bridge
    for z in (-.4,.0,.4):ring(M,(0,-.12,z),.7 if z<.3 else .62,.02,ACC,seg=28,sides=4)
    M.blob((0,.45,.85),.16,GLASS,sub=2,squash=(1,.7,1.6),noise=0)
    for sx in (1,-1):
        tube(M,[(sx*1.0,.15,.6),(sx*1.0,.15,.35),(sx*1.0,.15,-1.35),(sx*1.0,.15,-1.5)],[.12,.24,.27,.25],MID,.95,12,cap1=False);M.vent((sx*1.0,.15,-1.5),.22)   # big engine pylons
        for z in (-.9,-.3,.2):ring(M,(sx*1.0,.15,z),.275,.016,ACC,seg=20,sides=4)
        plate(M,[(sx*.6,.2,.2),(sx*.8,.2,.15),(sx*.8,.2,-.55),(sx*.6,.2,-.6)],.08,LIGHT)
        plate(M,[(sx*1.0,.38,-1.05),(sx*1.0,.68,-1.3),(sx*1.0,.68,-1.42),(sx*1.0,.38,-1.4)],.035,ACC,.95)
        M.blob((sx*1.0,.42,.3),.06,WIN,sub=1,noise=0)
        hatch(M,(sx*.3,.5,-.1),.3,.6)
    M.vent((0,0,-1.27),.18)
    lights(M,[(.1,.02,1.24),(-.1,.02,1.24)])                                                                       # on the nose (they hung beside it)
    return finish(M,3.3)

# ============================================================== VARKESH
def pick():      # light miner: a stubby hex body with two short claw sponsons, each ending in a drill: the pick
    M=Mesh(61)
    body=[(-.8,HEX(.26,.22)),(-.2,HEX(.32,.26)),(.35,HEX(.28,.23)),(.6,HEX(.24,.2,-.02))]                         # (7 Nov 2026) its stern reaches the drives (it stopped short and they hung behind it)
    loft(M,body,hex_role)
    on_hull(M,body,.18,.45,.08,.035,GLASS)                                                                         # slit canopy, laid on the body
    for sx in (1,-1):
        loft(M,[(-.55,HEX(.11,.13,0,sx*.45)),(.1,HEX(.13,.15,0,sx*.47)),(.55,HEX(.1,.12,-.01,sx*.42))],hex_role)        # claw sponson
        drill(M,(sx*.42,-.01,.55),.42,.1)
        barrel(M,(sx*.45,-.165,.05),.26,.02)                                                                        # a stub gun under each sponson
        launcher(M,(sx*.45,.16,-.1),2)
        sqdrive(M,(sx*.15,0,-.85),.18)
        plate(M,[(sx*.25,-.03,.3),(sx*.4,-.03,.3),(sx*.4,-.03,-.45),(sx*.25,-.03,-.45)],.06,DARK)                    # slab joining body and sponson (they hung apart)
    box(M,(0,-.27,-.15),(.42,.12,.6),DARK);box(M,(0,-.2,-.15),(.46,.03,.62),ACC,sh=.9)                          # ore bin
    for z in (-.32,.05):on_hull(M,body,z-.06,z+.06,.12,.025,ACC,.9)                                                 # armour bands (the aft one clear of the stacks' footings)
    lens_head(M,(0,-.02,.6),.06)                                                                                   # the mining lens in the prow, between the drills (11 Nov 2026: its beam had no head)
    stacks(M,(0,.24,-.5),2);lights(M,[(.12,-.05,.62),(-.12,-.05,.62)])
    return finish(M,2.0)
def abox(M,c,size,role,taper=(1,1),sh=1.0):
    # an angled box: chamfered hex section along z, optional taper toward the front
    x,y,z=c;w,h,l=size;tw,th=taper
    loft(M,[(z-l/2,[(a+x,b+y) for a,b in HEX(w/2,h/2)]),(z+l/2,[(a+x,b+y) for a,b in HEX(w/2*tw,h/2*th)])],(role,sh))
def laser(M,base,length=.35,r=.07):
    # a mining laser: a barrel on an angled mount, a collar and a glowing lens at the muzzle, facing +z
    b=np.array(base,float);abox(M,tuple(b+[0,0,-.05]),(r*2.8,r*2.4,.2),DARK,(.8,.8))
    tube(M,[b,b+[0,0,length]],[r,r*.85],MID,1.0,8,cap0=False,cap1=False);ring(M,tuple(b+[0,0,length*.5]),r*1.05,r*.16,ACC,seg=12,sides=4)
    lens_head(M,tuple(b+[0,0,length]),r*.95)
def gouge():     # medium miner: a broad hex hull with three mining lasers across its prow, angled ore bins on the flanks
    M=Mesh(62)
    body=[(-1.0,HEX(.42,.3)),(-.4,HEX(.48,.34)),(.25,HEX(.46,.32)),(.55,HEX(.4,.28,-.02)),(.7,HEX(.34,.22,-.03))]
    loft(M,body,hex_role)
    on_hull(M,body,.05,.35,.1,.035,GLASS)                                                                          # slit canopy, laid on the body
    abox(M,(0,-.02,.72),(.95,.22,.16),DARK,(.9,.8));abox(M,(0,.1,.72),(.85,.05,.14),ACC,(.9,1),.9)                # angled laser mount
    for x in (-.32,0,.32):laser(M,(x,-.02,.82))                                                                     # three mining lasers
    for sx in (1,-1):
        abox(M,(sx*.62,-.02,-.35),(.3,.44,.95),DARK,(.7,.75));abox(M,(sx*.62,.19,-.38),(.22,.05,.85),ACC,(.75,1),.9)  # angled ore bins
        abox(M,(sx*.48,-.02,-.4),(.16,.22,.7),DARK,(1,1),.9)                                                          # a mount between bin and hull (the bins hung beside it)
        for dy in (.12,-.12):abox(M,(sx*.24,dy,-1.08),(.2,.18,.14),DARK,(1.1,1.1));M.vent((sx*.24,dy,-1.16),.07)   # angled drives
        for bx in (sx*.26,sx*.34):tube(M,[(bx,loft_top(body,z,bx)+.022,z) for z in (.3,.5)],[.032,.032],DARK,.9,6)   # charge launchers laid along the hull's shoulder (straight, they floated over it)
    for z in (-.55,-.1):on_hull(M,body,z-.065,z+.065,.15,.03,ACC,.9)
    for sx in (1,-1):barrel(M,(sx*.3,-.25,.3),.26,.022)                                                              # a stub gun under each side of the chin
    stacks(M,(0,.32,-.75),3);lights(M,[(.25,.3,.48),(-.25,.3,.48)])
    return finish(M,2.6)
def sledge():    # heavy miner: the Heron's layout in Varkesh form: a broad, bulky hex hull, two stacked hex hoppers, four mining lasers
    M=Mesh(63)
    hull=[(-1.25,HEX(.55,.3)),(-.7,HEX(.9,.42)),(.3,HEX(.92,.44)),(.8,HEX(.62,.32,-.02)),(1.02,HEX(.4,.2,-.04))]
    loft(M,hull,hex_role);cheek(M,hull,.58,.3,.026,.03)                                                            # broad bulky hull, a stub gun on each bow shoulder
    for x in (-.4,.4):
        loft(M,[(-.95,HEX(.14,.1,.36,x)),(-.7,HEX(.28,.24,.4,x)),(.3,HEX(.28,.24,.4,x)),(.52,HEX(.12,.1,.36,x))],hex_role)   # stacked hoppers
        # armour bands round each hopper (7 Nov 2026: they were flat bars at .55, inside the hoppers, whose top is at .64: hidden
        # in game, with only their corners showing through the hoppers' chamfers as flickering specks)
        for z in (-.45,-.1,.2):loft(M,[(z-.06,HEX(.3,.26,.4,x)),(z+.06,HEX(.3,.26,.4,x))],(ACC,.9),cap0=False,cap1=False)
    on_hull(M,hull,.45,.8,.14,.035,GLASS)                                                                          # slit canopy, laid on the hull
    abox(M,(0,-.08,1.0),(1.4,.24,.18),DARK,(.9,.8))
    for x in (-.54,-.18,.18,.54):laser(M,(x,-.08,1.1),.4,.085)                                                      # four mining lasers
    for sx in (1,-1):
        plate(M,[(sx*.9,.0,-.1),(sx*1.3,.02,-.5),(sx*1.25,.02,-.72),(sx*.85,.0,-.7)],.08,MID)
        abox(M,(sx*1.2,-.04,-.6),(.22,.18,.36),DARK,(.85,.85));M.blob((sx*1.2,.1,-.6),.05,WIN,sub=1,noise=0)       # drone bays
        launcher(M,(sx*.7,-.38,.4),3,pylon=.2)
        for dx in (.25,.6):
            for dy in (.12,-.12):abox(M,(sx*dx,dy,-1.3),(.24,.2,.16),DARK,(1.1,1.1));M.vent((sx*dx,dy,-1.39),.08)
        abox(M,(sx*.72,.28,-.6),(.08,.3,.45),ACC,(.7,.7),.9)
    stacks(M,(0,.5,-1.05),3,.22,.32,foot=loft_top(hull,-1.05)-.01)
    lights(M,[(.6,.06,1.0),(-.6,.06,1.0)])                                                                        # on the laser mount
    return finish(M,3.2)
def runner():    # light hauler: an armoured courier wedge: a chisel prow widening into a boxy cargo body, cargo doors on top, side skirts
    M=Mesh(64)
    chis=lambda w,h,dy=0:[(w,dy),(w*.8,h+dy),(-w*.8,h+dy),(-w,dy),(-w*.7,-h*.7+dy),(w*.7,-h*.7+dy)]
    wedge=[(-.9,HEX(.42,.32)),(-.2,HEX(.44,.34)),(.3,chis(.36,.27,-.02)),(.65,chis(.26,.16,-.05)),(.8,chis(.2,.08,-.07))]
    loft(M,wedge,hex_role);cheek(M,wedge,.3,.24,.02,-.04)                                                          # the wedge, a stub gun low on each cheek
    on_hull(M,wedge,.15,.4,.09,.035,GLASS)                                                                         # slit canopy, laid on the wedge
    for z in (-.6,-.25):plate(M,[(-.34,.336,z+.14),(.34,.336,z+.14),(.34,.336,z-.14),(-.34,.336,z-.14)],.012,ACC,.9)   # cargo doors on top
    plate(M,[(0,.338,-.78),(0,.338,-.08),(0,.352,-.08),(0,.352,-.78)],.02,DARK)
    for sx in (1,-1):
        box(M,(sx*.45,-.08,-.35),(.06,.3,1.0),DARK)                                                                  # side skirts
        for z in (-.7,-.35,0):box(M,(sx*.47,.08,z),(.03,.12,.2),ACC,sh=.9)
        sqdrive(M,(sx*.2,.0,-.95),.22)
        plate(M,[(sx*.3,.342,-.48),(sx*.38,.5,-.7),(sx*.38,.5,-.8),(sx*.3,.342,-.74)],.05,ACC,.9)                   # fins standing on the aft cargo door (they used to pass through it)
    stacks(M,(0,.35,.05),2,.16,.22,foot=loft_top(wedge,.05)-.01);lights(M,[(.15,-.06,.78),(-.15,-.06,.78)])
    return finish(M,2.0)
def bulwark():   # medium hauler: the Talon's pincer sponsons become two armoured holds; two smoothed cargo pods on the spine
    M=Mesh(65)
    body=[(-.95,HEX(.24,.22)),(-.2,HEX(.28,.26)),(.55,HEX(.24,.22)),(.82,HEX(.22,.19,-.02))]
    loft(M,body,hex_role)
    on_hull(M,body,.4,.7,.08,.035,GLASS)                                                                           # slit canopy, laid on the body
    for sx in (1,-1):
        hold=[(-1.0,HEX(.24,.3,0,sx*.62)),(-.2,HEX(.27,.33,0,sx*.65)),(.6,HEX(.24,.3,-.01,sx*.62)),(.85,HEX(.14,.18,-.02,sx*.55))]
        loft(M,hold,hex_role)                                                                                    # armoured hold
        for z in (-.6,-.2,.2):box(M,(sx*.65,min(loft_top(hold,z+d,sx*.65) for d in (-.14,.14))+.011,z),(.4,.03,.28),ACC,sh=.9)   # plates resting on the hold
        plate(M,[(sx*.25,.0,.4),(sx*.42,.0,.4),(sx*.42,.0,-.6),(sx*.25,.0,-.6)],.08,DARK)
        for dy in (.12,-.12):sqdrive(M,(sx*.62,dy,-1.08),.2)
        barrel(M,(sx*.805,0,.62),.22,.022)                                                                          # a stub gun on each hold's nose
    oct=lambda w,h,dy:[(math.cos(a)*w,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
    for z in (-.55,-.05):                                                                                            # smoothed spine pods
        loft(M,[(z-.22,oct(.14,.1,.4)),(z-.16,oct(.22,.17,.4)),(z+.16,oct(.22,.17,.4)),(z+.22,oct(.14,.1,.4))],lambda i,j:((MID,1.0) if j in (1,2,3) else (MID,.9)))
        # its amber band, an ellipse hugging the pod (7 Nov 2026: a circle, it stood off the pod's top and cut into its sides)
        M.tube([(math.cos(a)*.232,math.sin(a)*.182+.4,z) for a in np.linspace(0,2*PI,25)],[.012]*25,4,lambda i,j,n,p:(ACC,1.0),cap0=False,cap1=False)
    stacks(M,(0,.27,-.85),2,foot=loft_top(body,-.85)-.01);lights(M,[(.1,-.04,.84),(-.1,-.04,.84)])
    return finish(M,2.6)
def rampart():   # heavy hauler: a six-shooter: six ribbed armoured cargo pylons in a cylinder round a central axle, a tapered nose and cockpit ahead, a four-engine block astern
    M=Mesh(66)
    chis=lambda w,h,dy=0:[(w,dy),(w*.8,h+dy),(-w*.8,h+dy),(-w,dy),(-w*.7,-h*.7+dy),(w*.7,-h*.7+dy)]
    hull_role=lambda i,j:([MID,LIGHT,LIGHT,MID,DARK,DARK][j],[1,.95,1,1,.85,.9][j])
    R=.62
    loft(M,[(-1.3,DIA(.12,.12)),(1.1,DIA(.12,.12))],SP)                                                            # central axle
    for k in range(6):
        a=PI/2+k*PI/3;x,y=math.cos(a)*R,math.sin(a)*R
        loft(M,[(-1.2,HEX(.2,.24,y,x)),(1.0,HEX(.2,.24,y,x))],hull_role)                                          # cargo pylon
        for z in (-.85,-.4,.05,.5):loft(M,[(z-.05,HEX(.22,.26,y,x)),(z+.05,HEX(.22,.26,y,x))],(ACC,.95))         # armour ribs
        tube(M,[(x*.2,y*.2,-.2),(x*.75,y*.75,-.2)],[.04,.04],DARK,.9,6,cap0=False,cap1=False)
    nose=lambda r,dy=0:[(math.cos(a)*r,math.sin(a)*r*.82+dy) for a in np.linspace(PI/6,2*PI+PI/6,6,endpoint=False)]
    loft(M,[(1.0,nose(R+.32)),(1.25,nose(R+.3)),(1.65,nose(.62,.03)),(2.0,nose(.36,.02)),(2.2,nose(.14,0))],lambda i,j:([LIGHT,LIGHT,MID,DARK,DARK,MID][j],[1,.95,.95,.85,.85,.95][j]))   # tapered nose
    for z in (1.1,1.5):loft(M,[(z-.03,nose(R+.33 if z<1.3 else .78)),(z+.03,nose(R+.33 if z<1.3 else .78))],(ACC,.95))
    M.blob((0,.52,1.55),.22,GLASS,sub=2,squash=(1.1,.55,1.6),noise=0)                                            # cockpit canopy on the nose
    # (7 Nov 2026) the canopy's pedestal is gone: it sat inside the nose and the canopy, and only its corners showed, as specks
    loft(M,[(-1.3,[(math.cos(a)*(R+.3),math.sin(a)*(R+.3)) for a in np.linspace(PI/6,2*PI+PI/6,6,endpoint=False)]),
            (-1.18,[(math.cos(a)*(R+.3),math.sin(a)*(R+.3)) for a in np.linspace(PI/6,2*PI+PI/6,6,endpoint=False)])],(ACC,.95))  # aft collar
    for sx in (1,-1):barrel(M,(sx*.62,.0,1.55),.45,.032)
    loft(M,[(-1.75,HEX(.78,.62)),(-1.5,HEX(.9,.72)),(-1.32,HEX(.85,.68))],hex_role)                                # four-engine block astern (built aft to fore: built the other way its end faces were wound inward and lit from the wrong side)
    for x in (-.38,.38):
        for y in (-.27,.27):abox(M,(x,y,-1.9),(.42,.38,.3),DARK,(1.1,1.1));M.vent((x,y,-2.06),.16)
    loft(M,[(-1.55,HEX(.92,.74)),(-1.45,HEX(.92,.74))],(ACC,.95))
    stacks(M,(0,.72,-1.55),3,.24,.3);lights(M,[(.2,-.05,2.15),(-.2,-.05,2.15)])
    return finish(M,3.8)

# ============================================================== OSTROVA
def glim():      # light miner: a spire cockpit inside a halo, a crystal cargo hold set in the halo either side; prongs holding a mining lens
    M=Mesh(71)
    loft(M,[(-.8,DIA(.07,.07)),(-.45,DIA(.18,.16)),(.2,DIA(.2,.18)),(.55,DIA(.12,.11)),(.68,DIA(.07,.06))],SP)      # spire cockpit
    M.blob((0,.17,.22),.09,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    for sx in (1,-1):
        crystal(M,-.65,.35,.2,.24,sx*.62,0)                                                                         # crystal cargo hold, set in the halo either side
        tube(M,[(sx*.14,0,-.15),(sx*.5,0,-.15)],[.03,.03],LIGHT,.9,5)
        loft(M,[(.3,DIA(.05,.06,sx*.18)),(.68,DIA(.04,.05,sx*.13)),(.82,DIA(.004,.004,sx*.1))],SP)                 # prongs
    ring(M,(0,0,-.15),.62,.045,ACC)
    M.blob((0,.62,-.15),.06,GLASS,sub=1,noise=0);M.blob((0,-.62,-.15),.06,GLASS,sub=1,noise=0)
    lens_head(M,(0,-.02,.7),.09)
    for sx in (1,-1):barrel(M,(sx*.135,-.058,.12),.26,.013,ACC)                                                      # a lance low on each side of the cockpit
    for k in range(3):a=PI/2+k*2*PI/3;plate(M,[(math.cos(a)*.12,math.sin(a)*.12,-.55),(math.cos(a)*.5,math.sin(a)*.5,-.82),(math.cos(a)*.45,math.sin(a)*.45,-.9),(math.cos(a)*.1,math.sin(a)*.1,-.85)],.025,MID)
    launcher(M,(0,-.2,.0),2,ACC)
    M.vent((0,0,-.82),.06)
    lights(M,[(.2,0,.5),(-.2,0,.5)])                                                                               # on the prongs' outer sides (they hung below the spire)
    return finish(M,2.0)
def lumen():     # medium miner: a central spire cockpit forward with mining lenses at its nose; crystal holds set in two rings crossed in an X
    M=Mesh(72)
    loft(M,[(-1.0,DIA(.07,.07)),(-.6,DIA(.18,.17)),(.45,DIA(.2,.18)),(.95,DIA(.12,.11)),(1.08,DIA(.07,.06))],SP)     # central spire cockpit
    M.blob((0,.18,.6),.09,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    for sx in (1,-1):lens_head(M,(sx*.09,-.06,1.05),.07);barrel(M,(sx*.105,.085,.5),.3,.013,ACC)                    # mining lenses at the nose; a lance on each shoulder
    for th in (PI/4,-PI/4):
        u=np.array([math.sin(th),math.cos(th),0.])
        pts=[np.array([0,0,-.5])+u*math.cos(a)*.78+np.array([0,0,math.sin(a)*.78]) for a in np.linspace(0,2*PI,37)]
        M.tube(pts,[.045]*len(pts),6,lambda i,j,n,p:(ACC,1.0),cap0=False,cap1=False)                                # crossed rings
        for sg in (1,-1):
            tip=np.array([0,0,-.5])+u*sg*.78
            crystal(M,-1.25,.25,.17,.17,tip[0],tip[1])                                                                # crystal hold set in the ring, stretched from its front to its back
            tube(M,[u*sg*.09+[0,0,-.5],u*sg*.64+[0,0,-.5]],[.025,.025],LIGHT,.9,5,cap0=False,cap1=False)             # spokes from inside the spire to the holds (11 Nov 2026: they started .08 clear of it)
    for k in range(3):a=PI/2+k*2*PI/3;plate(M,[(math.cos(a)*.07,math.sin(a)*.07,-.8),(math.cos(a)*.42,math.sin(a)*.42,-1.05),(math.cos(a)*.38,math.sin(a)*.38,-1.13),(math.cos(a)*.03,math.sin(a)*.03,-1.02)],.025,MID)   # fins rooted in the spire (they stood off it)
    M.vent((0,0,-1.02),.06)
    lights(M,[(.05,-.04,1.02),(-.05,-.04,1.02)])
    return finish(M,2.6)
def delve():     # heavy miner: a great drill spire with a lens ring at its prow; four crystal ore holds held by two halos, one at their fronts, one at their backs
    M=Mesh(73)
    loft(M,[(-1.25,DIA(.1,.1)),(-.8,DIA(.22,.22)),(.6,DIA(.2,.2)),(.95,DIA(.12,.12))],SP)                          # core spire
    tube(M,[(0,0,.95),(0,0,1.15)],[.14,.12],LIGHT,1.0,8);drill(M,(0,0,1.15),.75,.14,MID)
    ring(M,(0,0,1.0),.42,.035,ACC,seg=24,sides=5)
    for sx in (1,-1):barrel(M,(sx*.192,0,.35),.3,.014,ACC)                                                           # a lance on each side edge of the spire
    for k in range(6):a=k*PI/3;lens_head(M,(math.cos(a)*.42,math.sin(a)*.42,1.05),.06)
    for k in range(3):a=PI/6+k*2*PI/3;tube(M,[(math.cos(a)*.1,math.sin(a)*.1,1.0),(math.cos(a)*.4,math.sin(a)*.4,1.0)],[.025,.025],LIGHT,.9,5)   # (4 Nov 2026) spokes: the lens ring was floating
    R=.95
    for z in (-.8,.3):ring(M,(0,0,z),R,.05,ACC,seg=40,sides=6)                                               # front and back halos
    for k in range(4):
        a=PI/4+k*PI/2;dx,dy=math.cos(a)*R,math.sin(a)*R
        crystal(M,-1.0,.55,.26,.26,dx,dy)                                                                            # crystal ore hold set in the halo
        # (4 Nov 2026) the halo spokes and fins start inside the spire: on the diagonals its diamond section is narrower, and they floated
        for z in (-.8,.3):tube(M,[(math.cos(a)*.1,math.sin(a)*.1,z),(math.cos(a)*.93,math.sin(a)*.93,z)],[.035,.035],LIGHT,.9,5)   # (12 Nov 2026: out to the halo; they stopped .13 short of it, and the spire hung loose inside the holds)
        plate(M,[(math.cos(a)*.09,math.sin(a)*.09,-.8),(math.cos(a)*.5,math.sin(a)*.5,-1.1),(math.cos(a)*.46,math.sin(a)*.46,-1.2),(math.cos(a)*.06,math.sin(a)*.06,-1.15)],.03,MID)
    M.blob((0,.24,.45),.1,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    M.vent((0,0,-1.27),.09)
    lights(M,[(.22,.15,.95),(-.22,.15,.95)])
    return finish(M,3.2)
def drift():     # light hauler: a slim spire with two long crystal cargo containers, one either side, held by a front and a back ring
    M=Mesh(74)
    loft(M,[(-.85,DIA(.06,.06)),(-.45,DIA(.14,.13)),(.4,DIA(.14,.13)),(.75,DIA(.1,.09))],SP)
    R=.36
    for z in (-.5,.35):ring(M,(0,0,z),R,.03,ACC)                                                                    # front and back rings
    for sx in (1,-1):
        crystal(M,-.8,.7,.17,.2,sx*R,0)                                                                              # long crystal container, almost the ship's length
        for z in (-.5,.35):tube(M,[(sx*.12,0,z),(sx*(R-.12),0,z)],[.022,.022],LIGHT,.9,5,cap0=False,cap1=False)
    M.blob((0,.15,.5),.07,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    for sx in (1,-1):barrel(M,(sx*.072,.06,.3),.28,.012,ACC)                                                         # a lance on each shoulder of the spire
    for k in range(3):a=PI/2+k*2*PI/3;plate(M,[(math.cos(a)*.1,math.sin(a)*.1,-.55),(math.cos(a)*.3,math.sin(a)*.3,-.78),(math.cos(a)*.27,math.sin(a)*.27,-.86),(math.cos(a)*.08,math.sin(a)*.08,-.82)],.02,MID)
    M.vent((0,0,-.87),.06)
    lights(M,[(.08,-.05,.75),(-.08,-.05,.75)])
    return finish(M,2.0)
def cairn():     # medium hauler: a spire, two rings, and three crystal cargo containers set in the rings. That's it.
    M=Mesh(75)
    loft(M,[(-1.1,DIA(.06,.06)),(-.85,DIA(.14,.14)),(.6,DIA(.13,.13)),(1.0,DIA(.05,.05)),(1.3,DIA(.004,.004))],SP)   # spire, drawn to a point
    R=.46
    for z in (-.5,.3):ring(M,(0,0,z),R,.035,ACC,seg=30,sides=6)
    for k in range(3):
        a=PI/2+k*2*PI/3;cx,cy=math.cos(a)*R,math.sin(a)*R
        crystal(M,-.85,.65,.2,.2,cx,cy)                                                                              # crystal cargo container
        for z in (-.5,.3):tube(M,[(math.cos(a)*.06,math.sin(a)*.06,z),(math.cos(a)*(R-.15),math.sin(a)*(R-.15),z)],[.025,.025],LIGHT,.9,5,cap0=False,cap1=False)   # (14 Nov 2026) from .06 (.12): the diamond spire is only .095 out on the two lower spokes' lines, so they hung clear of it
    # (14 Nov 2026, the user: "the cockpit on the cairn is off the hull") the canopy sat at y .14 over the nose's taper, where the
    # spire's ridge is only .08 high, so it floated .02 clear and further at its tip. It is now further aft, where the spire is
    # thicker, and sunk into the ridge
    M.blob((0,.098,.72),.06,GLASS,sub=2,squash=(.9,.7,1.5),noise=0)
    for sx in (1,-1):barrel(M,(sx*.066,-.062,.55),.3,.012,ACC)                                                       # a lance under each side of the spire
    M.vent((0,0,-1.12),.06)
    return finish(M,2.6)
def monolith():  # heavy hauler: a solid spire fuselage with a bridge, two halos round it, four large crystal holds set in the halos
    M=Mesh(76)
    loft(M,[(-1.5,DIA(.12,.12)),(-1.1,DIA(.34,.32)),(.6,DIA(.36,.34)),(1.2,DIA(.18,.17)),(1.55,DIA(.02,.02))],SP)    # the fuselage
    for sx in (1,-1):plate(M,[(sx*.18,.17,-.9),(sx*.3,.05,-.9),(sx*.3,.05,.5),(sx*.18,.17,.5)],.01,WIN,.85)         # crystal seams
    M.blob((0,.33,.75),.11,GLASS,sub=2,squash=(.9,.6,1.8),noise=0)                                                   # bridge
    for sx in (1,-1):barrel(M,(sx*.175,-.165,.65),.36,.018,ACC)                                                      # a lance under each side of the fuselage
    R=.95
    for z in (-.75,.3):ring(M,(0,0,z),R,.05,ACC,seg=40,sides=6)
    for k in range(4):
        a=PI/4+k*PI/2;cx,cy=math.cos(a)*R,math.sin(a)*R
        crystal(M,-1.2,.75,.3,.3,cx,cy)                                                                              # large crystal hold set in the halos
        for z in (-.75,.3):tube(M,[(math.cos(a)*.25,math.sin(a)*.25,z),(math.cos(a)*(R-.2),math.sin(a)*(R-.2),z)],[.035,.035],LIGHT,.9,5,cap0=False,cap1=False)
    for k in range(3):
        a=PI/2+k*2*PI/3;dx,dy=math.cos(a)*.16,math.sin(a)*.16                                                           # (11 Nov 2026) the spire drives set into the stern (at .24 they hung .04 clear of it)
        loft(M,[(-1.95,DIA(.03,.03,dx,dy)),(-1.75,DIA(.09,.09,dx,dy)),(-1.45,DIA(.09,.09,dx,dy))],SP);M.vent((dx,dy,-1.97),.05)   # spire drives astern
    lights(M,[(.05,-.05,1.38),(-.05,-.05,1.38)])                                                                   # on the nose (they hung beside it)
    return finish(M,3.3)
# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('wren plover heron tern albatross pelican','halcyon'),('pick gouge sledge runner bulwark rampart','varkesh'),('glim lumen delve drift cairn monolith','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
WORK=[('halcyon','Halcyon Accord',[('Wren','Light miner',wren),('Plover','Medium miner',plover),('Heron','Heavy miner',heron),('Tern','Light hauler',tern),('Albatross','Medium hauler',albatross),('Pelican','Heavy hauler',pelican)]),
      ('varkesh','Varkesh Dominion',[('Pick','Light miner',pick),('Gouge','Medium miner',gouge),('Sledge','Heavy miner',sledge),('Runner','Light hauler',runner),('Bulwark','Medium hauler',bulwark),('Rampart','Heavy hauler',rampart)]),
      ('ostrova','Ostrova Collective',[('Glim','Light miner',glim),('Lumen','Medium miner',lumen),('Delve','Heavy miner',delve),('Drift','Light hauler',drift),('Cairn','Medium hauler',cairn),('Monolith','Heavy hauler',monolith)])]
