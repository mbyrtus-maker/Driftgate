# Driftgate Beyond: scouts and bombers (preview, not in the model pack yet). Combat and recon craft, so they keep close to the
# approved fighters' proportions and shape language, with a signature per class:
#   Scout / Advanced Scout: slim hulls, sensor masts, dishes and radomes, limpet racks and a beacon device (Advanced)
#   Bomber: heavier hulls with visible torpedoes (the siege weapon)
#   Heavy Bomber: two seats in tandem and a rear turret, torpedoes
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,barrel,ring,LENS,HEX,DIA,lens_role,hex_role,on_hull,cheek,loft_side,loft_top
from beyond_work import finish,tube,abox,crystal,lights,sqdrive,SP,STAR
PI=math.pi

def torpedo(M,base,length=.6,r=.05,role=MID):
    # a torpedo slung along +z: body, an accent warhead and small tail fins
    b=np.array(base,float)
    tube(M,[b,b+[0,0,length*.8]],[r*.85,r],role,.95,8,cap0=True,cap1=False)
    tube(M,[b+[0,0,length*.8],b+[0,0,length]],[r,r*.1],ACC,1.0,8,cap0=False,cap1=False)
    for a in (0,PI/2):plate(M,[b+[0,0,.02],b+[math.cos(a)*r*2.2,math.sin(a)*r*2.2,-.02],b+[math.cos(a)*r*2.2,math.sin(a)*r*2.2,.06],b+[0,0,.12]],.006,DARK)
def seat(M,c,r,role=MID,sink=.06,gx=1.0):
    # (11 Nov 2026) the seat of the hull's live turret: a low plinth whose flat top, at c, is where the game stands the turret
    # (its base ring's underside on the top, upright along the hull's up); the plinth's foot is sunk into the hull. The game
    # drew the turret at one fixed point for every hull, floating over some and sunk into others, and on three hulls on top
    # of a turret already modelled there. r: the plinth's radius; gx squeezes it across the hull (1/girth where finish()
    # widens the hull, so it comes out round).
    c=np.array(c,float);n0=len(M.T);n=10;P=lambda q:[(math.cos(j/n*2*PI)*q*gx,math.sin(j/n*2*PI)*q) for j in range(n)]
    S=[(-sink,P(r*1.16)),(-.016,P(r*1.1)),(0,P(r))]   # (height under the top, ring in x,z)
    R_=[[c+np.array([x,dy,z]) for x,z in ring_] for dy,ring_ in S]
    for i in range(len(R_)-1):
        for j in range(n):
            k=(j+1)%n;ref=c+np.array([0,S[i][0],0]);M.tri(R_[i][j],R_[i][k],R_[i+1][k],role,.95 if i else .8,ref=ref);M.tri(R_[i][j],R_[i+1][k],R_[i+1][j],role,.95 if i else .8,ref=ref)
    for j in range(n):M.tri(c,R_[-1][j],R_[-1][(j+1)%n],DARK,1.1,ref=c-np.array([0,1,0]))
    for j in range(n):   # an accent band round the plinth
        k=(j+1)%n;a,b=R_[1][j]+[0,-.004,0],R_[1][k]+[0,-.004,0];a2,b2=R_[1][j]*[1.03,1,1.03]+[-c[0]*.03,-.02,-c[2]*.03],R_[1][k]*[1.03,1,1.03]+[-c[0]*.03,-.02,-c[2]*.03]
        M.tri(a*[1.03,1,1.03]+[-c[0]*.03,0,-c[2]*.03],b*[1.03,1,1.03]+[-c[0]*.03,0,-c[2]*.03],b2,ACC,.9,ref=c+[0,-.012,0]);M.tri(a*[1.03,1,1.03]+[-c[0]*.03,0,-c[2]*.03],b2,a2,ACC,.9,ref=c+[0,-.012,0])
    M.part(M.seat,c,n0)
def turret(M,c,r=.1,role=MID,back=True):
    # a turret dome with twin barrels (pointing aft for a rear gunner)
    c=np.array(c,float);M.blob(tuple(c),r,GLASS,sub=2,squash=(1,.7,1),noise=0);ring(M,tuple(c-[0,r*.25,0]),r*1.05,r*.15,role,seg=14,sides=4,axis='y')
    d=-1 if back else 1
    for sx in (1,-1):tube(M,[c+[sx*r*.35,0,d*r*.6],c+[sx*r*.35,0,d*(r*.6+.32)]],[.018,.016],DARK,1.0,6)
def mast(M,base,h,r=.012,role=LIGHT,rings=2):
    b=np.array(base,float);tube(M,[b,b+[0,h,0]],[r,r*.6],role,.9,5)
    for k in range(rings):
        q=b+[0,h*(.55+.25*k),0];rr=.05-.012*k;ring(M,tuple(q),rr,.008,ACC,seg=10,sides=4,axis='y');plate(M,[q+[-rr,0,-.004],q+[rr,0,-.004],q+[rr,0,.004],q+[-rr,0,.004]],.005,ACC)   # each ring on a crossbar through the mast (11 Nov 2026: they floated round it)
def dish(M,c,r,role=MID,axis='y'):
    M.blob(tuple(c),r,role,sub=2,squash=(1,.28,1) if axis=='y' else (1,1,.28),noise=0);ring(M,tuple(c),r,.014,ACC,seg=20,sides=4,axis=axis)
def limpets(M,c,n=3):
    for k in range(n):M.blob((c[0],c[1],c[2]-k*.07),.03,ACC,sub=1,noise=0)

# ============================================================== HALCYON
def lark():      # scout: a slim needle with a long sensor boom forward, a small dorsal dish, swept wings with emitter nodes
    M=Mesh(81)
    H=[(-.8,LENS(.08,.07)),(-.4,LENS(.13,.11)),(.2,LENS(.12,.11)),(.6,LENS(.05,.05,-.01))]
    loft(M,H,lens_role);cheek(M,H,.02,.28,.011,-.035)                                                               # a slim gun low on each cheek
    M.blob((0,.1,.15),.07,GLASS,sub=2,squash=(.9,.75,2.2),noise=0)
    tube(M,[(0,0,.6),(0,0,1.15)],[.015,.01],LIGHT,.9,5);ring(M,(0,0,.95),.04,.008,ACC,seg=10,sides=4);plate(M,[(-.04,0,.95),(.04,0,.95),(0,.005,.954)],.005,ACC)   # sensor boom, its ring on a crossbar
    dish(M,(0,.15,-.3),.08)
    for sx in (1,-1):
        plate(M,[(sx*.1,0,.05),(sx*.6,.04,-.35),(sx*.56,.04,-.45),(sx*.1,0,-.35)],.02,LIGHT)
        M.blob((sx*.58,.04,-.4),.035,WIN,sub=1,noise=0)
        plate(M,[(sx*.05,.08,-.55),(sx*.16,.28,-.78),(sx*.16,.28,-.84),(sx*.05,.07,-.8)],.018,ACC,.95)
    limpets(M,(0,-.1,-.1))
    M.vent((0,0,-.82),.06)
    return finish(M,2.1,1.08)
def skylark():   # advanced scout: a larger lens body carrying a big radome on twin pylons, limpet pods under the wings, twin tails
    M=Mesh(82)
    H=[(-1.0,LENS(.12,.1)),(-.5,LENS(.2,.16)),(.3,LENS(.18,.15)),(.75,LENS(.07,.07,-.01))]
    loft(M,H,lens_role);cheek(M,H,.14,.3,.013,-.045)                                                                # a slim gun low on each cheek
    M.blob((0,.14,.3),.09,GLASS,sub=2,squash=(.9,.75,2.2),noise=0)
    for sx in (1,-1):plate(M,[(sx*.04,.14,-.1),(sx*.08,.38,-.2),(sx*.08,.38,-.35),(sx*.04,.14,-.4)],.02,LIGHT)      # radome pylons
    M.blob((0,.42,-.28),.34,MID,sub=2,squash=(1,.17,1),noise=0);ring(M,(0,.42,-.28),.34,.018,ACC,seg=26,sides=4,axis='y')   # the radome
    for sx in (1,-1):
        plate(M,[(sx*.15,0,.1),(sx*.75,.03,-.4),(sx*.7,.03,-.52),(sx*.15,0,-.45)],.025,LIGHT)
        tube(M,[(sx*.45,-.03,-.05),(sx*.45,-.03,-.4)],[.035,.035],DARK,.9,6);limpets(M,(sx*.45,-.07,-.1),3)         # limpet pods, against the wing's underside (they hung .03 below)
        M.blob((sx*.72,.03,-.46),.04,WIN,sub=1,noise=0)
        plate(M,[(sx*.08,.1,-.7),(sx*.2,.35,-.98),(sx*.2,.35,-1.04),(sx*.08,.09,-1.0)],.02,ACC,.95)
    box(M,(0,-.13,.0),(.1,.06,.2),ACC)                                                                               # beacon device
    M.vent((0,0,-1.02),.07)
    return finish(M,2.3,1.0)
def condor():    # bomber: a heavy lens fuselage, a great swept wing span with two torpedoes slung under each wing, twin tails
    M=Mesh(83)
    H=[(-1.1,LENS(.16,.13)),(-.6,LENS(.27,.21)),(.3,LENS(.25,.2)),(.85,LENS(.1,.09,-.01)),(1.05,LENS(.02,.02,-.02))]
    loft(M,H,lens_role);cheek(M,H,.4,.34,.017,-.05)                                                                 # a gun low on each cheek
    seat(M,(0,loft_top(H,-.3)+.02,-.3),.115)                                                                        # the turret's seat, on the spine
    M.blob((0,.19,.5),.11,GLASS,sub=2,squash=(.9,.75,2.2),noise=0)
    for sx in (1,-1):
        plate(M,[(sx*.22,.02,.35),(sx*1.25,.08,-.45),(sx*1.2,.08,-.62),(sx*.22,.02,-.5)],.04,LIGHT)                 # great swept wing
        M.blob((sx*1.22,.08,-.54),.05,WIN,sub=1,noise=0)
        for dx,pz in ((.5,0),(.85,-.3)):tube(M,[(sx*dx,.03+(dx-.5)*.12,pz),(sx*dx,-.085,pz)],[.02,.02],DARK,.9,4);torpedo(M,(sx*dx,-.12,-.45),.75,.055)   # (12 Nov 2026: the outer pylon stood ahead of the swept wing's leading edge, holding nothing)
           # slung torpedoes, their pylons up into the wing (they stopped short of it)
        plate(M,[(sx*.12,.15,-.65),(sx*.28,.48,-1.0),(sx*.28,.48,-1.08),(sx*.12,.14,-1.02)],.025,ACC,.95)
        M.vent((sx*.12,0,-1.1),.08)
    loft(M,[(-.55,LENS(.06,.03,-.14)),(-.3,LENS(.13,.09,-.147)),(.1,LENS(.13,.09,-.147)),(.35,LENS(.06,.03,-.14))],lambda i,j:(MID,.9) if j<6 else (DARK,1.25))   # the bomb bay: a shallow belly fairing with dark doors (11 Nov 2026: the doors were a flat plate hanging .05 under the belly; the fairing reaches as low, so the hull's packed size is unchanged)
    return finish(M,2.7,1.0)
def harrier():   # heavy bomber: a long clean lens hull, tandem canopies, a forward-swept wing with a torpedo pod under each side, a rear ball turret
    M=Mesh(84)
    H=[(-1.25,LENS(.15,.13)),(-.7,LENS(.27,.21)),(.4,LENS(.26,.21)),(.95,LENS(.1,.09,-.01)),(1.15,LENS(.02,.02,-.02))]
    loft(M,H,lens_role);cheek(M,H,.5,.36,.017,-.05)                                                                 # a gun low on each cheek
    for z in (.62,.3):M.blob((0,.19,z),.095,GLASS,sub=2,squash=(.9,.75,1.6),noise=0)                                # tandem canopies: two seats
    seat(M,(0,loft_top(H,-.82)+.03,-.82),.123)                                                                      # the rear turret's seat (11 Nov 2026: the game's live turret stands here; the ball turret modelled at the tail is gone, the two were drawn one over the other)
    for sx in (1,-1):
        plate(M,[(sx*.24,.0,.05),(sx*1.38,-.04,.55),(sx*1.32,-.04,.36),(sx*.24,.0,-.7)],.045,LIGHT)                  # forward-swept wing, larger
        M.blob((sx*1.35,-.04,.46),.05,WIN,sub=1,noise=0)
        loft(M,[(-.55,[(a+sx*.6,b-.14) for a,b in LENS(.04,.04)]),(-.35,[(a+sx*.6,b-.14) for a,b in LENS(.09,.08)]),(.25,[(a+sx*.6,b-.14) for a,b in LENS(.09,.08)]),(.45,[(a+sx*.6,b-.14) for a,b in LENS(.03,.03)])],(MID,.95))   # torpedo pod under the wing
        torpedo(M,(sx*.6,-.25,-.25),.65,.045)
        plate(M,[(sx*.13,.16,-.68),(sx*.24,.4,-.96),(sx*.24,.4,-1.03),(sx*.13,.15,-.99)],.025,ACC,.95)
        M.vent((sx*.12,0,-1.27),.08)
    tube(M,[(0,.06,-1.18),(0,.06,-1.3),(0,.06,-1.38)],[.035,.02,.006],LIGHT,.9,6);ring(M,(0,.06,-1.3),.03,.006,ACC,seg=10,sides=4)   # a tail-warning boom between the drives (it reaches where the old turret's barrels did, so the hull's packed size is unchanged)
    return finish(M,2.9,1.0)

# ============================================================== VARKESH
SMH=lambda w,h,dy=0:[(w,dy),(w*.82,h*.7+dy),(w*.4,h+dy),(-w*.4,h+dy),(-w*.82,h*.7+dy),(-w,dy),(-w*.82,-h*.6+dy),(-w*.4,-h*.85+dy),(w*.4,-h*.85+dy),(w*.82,-h*.6+dy)]   # a smoothed hex: Varkesh slab, streamlined
def smh_role(i,j):return ([MID,MID,MID,MID,MID,DARK,DARK,DARK,DARK,DARK][j],[1,1.03,1.06,1.06,1.03,.9,.85,.82,.85,.9][j])
def jackal():    # scout: a streamlined but bulky smoothed-hex wedge, the sensor faired into the nose, a raked mast
    M=Mesh(91)
    hull=[(-.8,SMH(.14,.1)),(-.45,SMH(.22,.15)),(.05,SMH(.22,.15)),(.45,SMH(.13,.09,-.01)),(.78,SMH(.04,.03,-.02))]
    loft(M,hull,smh_role);cheek(M,hull,.1,.28,.014,-.03)                                                            # a gun low on each cheek
    on_hull(M,hull,.08,.32,.05,.02,GLASS)                                                                          # slit canopy, laid on the hull
    M.blob((0,-.05,.6),.05,WIN,sub=1,squash=(1,.7,1.6),noise=0)                                                       # sensor faired into the nose
    tube(M,[(0,.13,-.3),(0,.34,-.6)],[.016,.008],LIGHT,.9,5);ring(M,(0,.26,-.48),.035,.007,ACC,seg=10,sides=4,axis='y')   # raked mast
    for sx in (1,-1):
        plate(M,[(sx*.2,-.02,.0),(sx*.5,-.03,-.35),(sx*.48,-.03,-.48),(sx*.18,-.02,-.48)],.035,MID)
        plate(M,[(sx*.12,.1,-.45),(sx*.18,.26,-.7),(sx*.18,.26,-.76),(sx*.12,.1,-.74)],.03,ACC,.9)
        M.vent((sx*.08,0,-.82),.06)
    limpets(M,(0,-.14,-.05))
    return finish(M,2.05,.78)
def wolfhound(): # advanced scout: a broad streamlined smoothed-hex hull with sensor blisters faired into its flanks, a dorsal dish, limpets, beacon
    M=Mesh(92)
    hull=[(-1.05,SMH(.17,.12)),(-.6,SMH(.3,.19)),(.15,SMH(.3,.19)),(.6,SMH(.17,.11,-.01)),(1.0,SMH(.04,.03,-.02))]
    loft(M,hull,smh_role)
    on_hull(M,hull,.25,.5,.06,.02,GLASS)                                                                           # slit canopy, laid on the hull
    for sx in (1,-1):
        loft(M,[(-.6,[(a+sx*.3,b) for a,b in SMH(.04,.04)]),(-.35,[(a+sx*.3,b) for a,b in SMH(.08,.07)]),(.15,[(a+sx*.3,b) for a,b in SMH(.08,.07)]),(.45,[(a+sx*.3,b) for a,b in SMH(.02,.02)])],smh_role)   # sensor blister
        M.blob((sx*.35,.02,.1),.04,WIN,sub=1,noise=0)
        limpets(M,(sx*.3,-.08,-.05),3)
        plate(M,[(sx*.14,.14,-.68),(sx*.2,.32,-.92),(sx*.2,.32,-.98),(sx*.14,.14,-.96)],.035,ACC,.9)
        M.vent((sx*.11,0,-1.07),.07)
    dish(M,(0,.34,-.3),.3);tube(M,[(0,.17,-.3),(0,.3,-.3)],[.03,.03],LIGHT,.9,5);M.blob((0,.43,-.3),.05,WIN,sub=1,noise=0)   # a big radar dish (its lit feed on the crest: at .38 it was inside the dish, a speck)
    abox(M,(0,-.15,.05),(.1,.05,.22),ACC,(1,1))                                                                     # beacon device
    for sx in (1,-1):barrel(M,(sx*.15,-.1455,.3),.3,.014)                                                            # a gun under each side of the chin
    return finish(M,2.45,.78)
def maul():      # bomber: a compact streamlined smoothed-hex hull with the torpedo magazine faired into its belly, two tubes forward
    M=Mesh(93)
    hull=[(-.85,SMH(.24,.2)),(-.45,SMH(.32,.26)),(.3,SMH(.3,.25)),(.62,SMH(.18,.15,-.01)),(.8,SMH(.07,.06,-.02))]
    loft(M,hull,smh_role);cheek(M,hull,.3,.3,.02,.02)                                                               # a gun on each cheek
    seat(M,(0,loft_top(hull,-.25)+.02,-.25),.094)                                                                   # the turret's seat, on the spine
    on_hull(M,hull,.2,.45,.07,.03,GLASS)                                                                           # slit canopy, laid on the hull
    loft(M,[(-.6,SMH(.12,.08,-.24)),(-.35,SMH(.2,.12,-.27)),(.35,SMH(.2,.12,-.27)),(.5,SMH(.12,.08,-.25))],smh_role)   # torpedo magazine faired into the belly
    for x in (-.08,.08):tube(M,[(x,-.27,.48),(x,-.27,.52)],[.045,.045],DARK,.8,8,cap0=False,cap1=False);M.blob((x,-.27,.5),.035,ACC,sub=1,noise=0)
    for sx in (1,-1):
        plate(M,[(sx*.28,-.02,.15),(sx*.62,-.04,-.15),(sx*.6,-.04,-.38),(sx*.26,-.02,-.5)],.06,MID)
        torpedo(M,(sx*.5,-.12,-.35),.55,.045)
        plate(M,[(sx*.2,.22,-.45),(sx*.26,.42,-.68),(sx*.26,.42,-.76),(sx*.2,.22,-.75)],.05,ACC,.9)
        M.vent((sx*.13,0,-.9),.09)
    return finish(M,2.2,1.0)
def warhound():  # heavy bomber: a streamlined smoothed-hex hull, two seats, a turret faired into the aft spine, torpedoes along the flanks
    M=Mesh(94)
    hull=[(-1.0,SMH(.22,.19)),(-.5,SMH(.3,.25)),(.45,SMH(.28,.24)),(.8,SMH(.16,.13,-.01)),(1.0,SMH(.06,.05,-.02))]
    loft(M,hull,smh_role)
    for z in (.6,.3):on_hull(M,hull,z-.1,z+.1,.07,.025,GLASS)                                                      # two seats, laid on the hull
    cheek(M,hull,.5,.32,.02,.03)                                                                                    # a gun on each cheek
    loft(M,[(-.95,SMH(.06,.05,.22)),(-.78,SMH(.14,.1,.24)),(-.42,SMH(.14,.1,.24)),(-.3,SMH(.06,.05,.22))],smh_role);seat(M,(0,.345,-.6),.102)   # the turret's seat on a fairing in the aft spine (11 Nov 2026: the live turret stands here; the one modelled into the fairing is gone)
    for sx in (1,-1):plate(M,[(sx*.18,.18,-.6),(sx*.3,.42,-.88),(sx*.3,.42,-.96),(sx*.18,.18,-.95)],.05,ACC,.9)     # tail fins
    for sx in (1,-1):
        loft(M,[(-.7,[(a+sx*.34,b-.04) for a,b in SMH(.05,.05)]),(-.5,[(a+sx*.34,b-.04) for a,b in SMH(.09,.09)]),(.3,[(a+sx*.34,b-.04) for a,b in SMH(.09,.09)]),(.45,[(a+sx*.34,b-.04) for a,b in SMH(.04,.04)])],smh_role)   # flank fairing
        torpedo(M,(sx*.46,-.12,-.35),.6,.045)
        plate(M,[(sx*.3,-.02,.25),(sx*.65,-.04,-.1),(sx*.62,-.04,-.32),(sx*.28,-.02,-.45)],.05,MID)
        M.vent((sx*.13,0,-1.04),.09)
    abox(M,(0,.13,-1.047),(.07,.06,.154),DARK,(1.6,1.6))                                                           # a tail sensor block over the drives (it reaches where the old turret's barrels did, so the hull's packed size is unchanged)
    return finish(M,2.4,1.0)

# ============================================================== OSTROVA
def seer():      # scout: a spire behind a forward sensor halo with a crystal eye, one pair of swept wings, a long mast
    M=Mesh(101)
    loft(M,[(-.85,DIA(.05,.05)),(-.45,DIA(.12,.11)),(.2,DIA(.13,.12)),(.52,DIA(.06,.06))],SP)
    ring(M,(0,0,.65),.18,.022,ACC,seg=20,sides=5);crystal(M,.52,.82,.07,.07)                                        # sensor halo and crystal eye
    for k in range(3):a=PI/2+k*2*PI/3;tube(M,[(math.cos(a)*.05,math.sin(a)*.05,.47),(math.cos(a)*.17,math.sin(a)*.17,.65)],[.01,.01],LIGHT,.9,4)
    M.blob((0,.1,.12),.065,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    mast(M,(0,.09,-.35),.35)
    for sx in (1,-1):barrel(M,(sx*.07,.05,.25),.24,.011,ACC)                                                         # a lance on each shoulder of the spire, ahead of the canopy
    for sx in (1,-1):
        plate(M,[(sx*.1,0,-.35),(sx*.6,-.02,-.65),(sx*.56,-.02,-.75),(sx*.08,0,-.65)],.02,MID)                      # aft wings
        M.blob((sx*.58,-.02,-.7),.035,GLASS,sub=1,noise=0)
    plate(M,[(0,.08,-.5),(0,.3,-.75),(0,.28,-.83),(0,.06,-.8)],.02,MID)
    limpets(M,(0,-.11,-.05))
    M.vent((0,0,-.87),.05)
    return finish(M,2.1,1.0)
def obelisk():   # bomber: the Sentinel's single-seat cousin: a spire with crystal fins, a halo carrying four torpedo lances, two tail fins at 45 degrees
    M=Mesh(103)
    loft(M,[(-1.0,DIA(.07,.07)),(-.6,DIA(.17,.16)),(.35,DIA(.18,.17)),(.8,DIA(.07,.07)),(.98,DIA(.01,.01))],SP)
    M.blob((0,.16,.45),.08,GLASS,sub=2,squash=(.9,.7,1.6),noise=0)                                                  # one seat
    ring(M,(0,0,-.2),.42,.035,ACC)
    for k in range(4):
        a=PI/4+k*PI/2;x,y=math.cos(a)*.42,math.sin(a)*.42
        torpedo(M,(x,y,-.6),.75,.05,LIGHT)                                                                           # torpedo lances on the halo
        tube(M,[(math.cos(a)*.13,math.sin(a)*.13,-.2),(x*.88,y*.88,-.2)],[.02,.02],LIGHT,.9,4)
    for sx in (1,-1):plate(M,[(sx*.13,-.03,.3),(sx*.42,-.08,.05),(sx*.4,-.08,-.12),(sx*.13,-.03,-.2)],.022,WIN,.85)  # crystal fins
    vee_tail(M,-.72,.42)
    for sx in (1,-1):barrel(M,(sx*.092,-.085,.35),.32,.013,ACC)                                                      # a lance under each side of the spire
    seat(M,(0,.185,-.05),.093,gx=1/1.18)                                                                            # the turret's seat, on the spine aft of the canopy
    M.vent((0,0,-1.02),.06)
    return finish(M,2.65,1.18)
def vee_tail(M,z0,span):
    # two tail fins set 45 degrees either side of the fuselage's top
    for a in (PI/4,3*PI/4):
        ca,sa=math.cos(a),math.sin(a)
        plate(M,[(ca*.1,sa*.1,z0),(ca*span,sa*span,z0-.32),(ca*span*.93,sa*span*.93,z0-.42),(ca*.08,sa*.08,z0-.32)],.025,MID)
def forked_tail(M,z0,span):
    # (retired) forked tail wings: each fin splits into two prongs
    for k in range(3):
        a=PI/2+k*2*PI/3;ca,sa=math.cos(a),math.sin(a);pa,pb=a+.32,a-.32
        plate(M,[(ca*.1,sa*.1,z0),(ca*span*.5,sa*span*.5,z0-.15),(ca*span*.45,sa*span*.45,z0-.25),(ca*.08,sa*.08,z0-.22)],.025,MID)
        for b in (pa,pb):plate(M,[(ca*span*.48,sa*span*.48,z0-.15),(math.cos(b)*span,math.sin(b)*span,z0-.42),(math.cos(b)*span*.94,math.sin(b)*span*.94,z0-.5),(ca*span*.45,sa*span*.45,z0-.25)],.022,MID,.95)
def sentinel():  # heavy bomber: a spire with tandem seats, a gun pod on the aft fuselage, torpedo lances under crystal fins, two tail fins at 45 degrees
    M=Mesh(104)
    loft(M,[(-1.2,DIA(.07,.07)),(-.7,DIA(.19,.18)),(.4,DIA(.2,.19)),(.95,DIA(.08,.08)),(1.15,DIA(.01,.01))],SP)
    for z in (.65,.3):M.blob((0,.17,z),.08,GLASS,sub=2,squash=(.9,.7,1.6),noise=0)                                 # two seats
    ring(M,(0,0,-.55),.4,.035,ACC)
    for k in range(3):a=PI/2+k*2*PI/3;tube(M,[(math.cos(a)*.15,math.sin(a)*.15,-.55),(math.cos(a)*.36,math.sin(a)*.36,-.55)],[.022,.022],LIGHT,.9,4)
    for sx in (1,-1):barrel(M,(sx*.098,-.092,.4),.32,.013,ACC)                                                       # a lance under each side of the spire
    loft(M,[(-.98,DIA(.05,.03,0,.16)),(-.84,DIA(.12,.06,0,.18)),(-.62,DIA(.12,.06,0,.18)),(-.48,DIA(.05,.03,0,.16))],SP);seat(M,(0,.25,-.73),.104,gx=1/1.15)   # the turret's seat on a pod on the aft fuselage (11 Nov 2026: the live turret stands here; the modelled gun pod's own turret is gone)
    for sx in (1,-1):
        plate(M,[(sx*.15,-.05,.35),(sx*.5,-.1,.0),(sx*.48,-.1,-.25),(sx*.15,-.05,-.35)],.025,WIN,.85)              # crystal fins
        torpedo(M,(sx*.36,-.14,-.4),.8,.05,LIGHT)                                                                      # torpedo lances, against the fins' undersides (they hung .04 below)
    vee_tail(M,-.82,.52)
    M.vent((0,0,-1.22),.06)
    return finish(M,2.95,1.15)
def oracle():    # advanced scout: a spire with a great sensor dish set between two rings crossed in an X, crystal nodes, limpet launchers, a beacon device
    M=Mesh(102)
    loft(M,[(-1.0,DIA(.05,.05)),(-.55,DIA(.13,.12)),(.35,DIA(.13,.12)),(.75,DIA(.04,.04))],SP)
    for sx in (1,-1):plate(M,[(sx*.03,.1,-.3),(sx*.06,.24,-.38),(sx*.06,.24,-.6),(sx*.03,.1,-.68)],.02,LIGHT)       # radome pylons
    M.blob((0,.26,-.5),.3,MID,sub=2,squash=(1,.17,1),noise=0);ring(M,(0,.26,-.5),.3,.016,ACC,seg=24,sides=4,axis='y')   # great flat radome, like the Skylark's, between the rings
    for th in (PI/4,-PI/4):
        u=np.array([math.sin(th),math.cos(th),0.])
        pts=[np.array([0,0,-.5])+u*math.cos(a)*.42+np.array([0,0,math.sin(a)*.42]) for a in np.linspace(0,2*PI,33)]
        M.tube(pts,[.025]*len(pts),5,lambda i,j,n,p:(ACC,1.0),cap0=False,cap1=False)
        for sg in (1,-1):M.blob(tuple(np.array([0,0,-.5])+u*sg*.42),.045,GLASS,sub=1,noise=0)
    for sx in (1,-1):tube(M,[(sx*.13,-.05,.2),(sx*.13,-.05,-.2)],[.03,.03],DARK,.9,6);limpets(M,(sx*.13,-.1,.1),3)
    box(M,(0,-.14,.35),(.08,.05,.16),ACC)                                                                              # beacon device
    M.blob((0,.12,.5),.06,GLASS,sub=2,squash=(.9,.7,1.8),noise=0)
    for sx in (1,-1):barrel(M,(sx*.07,.062,.3),.28,.011,ACC)                                                         # a lance on each shoulder of the spire
    M.vent((0,0,-1.02),.05)
    return finish(M,2.45,1.18)
# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('lark skylark condor harrier','halcyon'),('jackal wolfhound maul warhound','varkesh'),('seer oracle obelisk sentinel','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
RECON=[('halcyon','Halcyon Accord',[('Lark','Scout',lark),('Skylark','Advanced scout',skylark),('Condor','Bomber',condor),('Harrier','Heavy bomber',harrier)]),
       ('varkesh','Varkesh Dominion',[('Jackal','Scout',jackal),('Wolfhound','Advanced scout',wolfhound),('Maul','Bomber',maul),('Warhound','Heavy bomber',warhound)]),
       ('ostrova','Ostrova Collective',[('Seer','Scout',seer),('Oracle','Advanced scout',oracle),('Obelisk','Bomber',obelisk),('Sentinel','Heavy bomber',sentinel)])]
