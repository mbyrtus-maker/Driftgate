# Driftgate Beyond: support craft, a constructor and a drone per faction (preview, not in the model pack yet). First pass.
# Constructors are the AI's builders (they put up depots and stations); drones are the small guard and work craft that mining
# hulls carry. Each in its faction's language. Nose is +z, up +y.
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,ring,LENS,HEX,lens_role,hex_role,barrel
from beyond_work import finish,abox,crystal,lights,sqdrive,lens_head
from beyond_recon import SMH,smh_role,dish,mast
from beyond_capitals import tube,stacks
PI=math.pi
OCT=lambda w,h,dx=0,dy=0:[(math.cos(a)*w+dx,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
def oct_role(i,j):return ([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[1,.97,1,.95,.9,.85,.85,.92][j])
def at(sec,dx=0,dy=0):return [(a+dx,b+dy) for a,b in sec]
def beam(M,a,b,r=.012):tube(M,[a,b],[r,r],GLOW,1.0,4,cap0=False,cap1=False)

# ============================================================== CONSTRUCTORS
def architect():
    # Halcyon constructor: a broad lens hull with a glass canopy, two swept fabricator arms reaching forward to hold a great printing
    # lens between them (a glowing beam lays down the frame), a folded depot module slung in a cradle beneath, the Osprey's twin booms
    M=Mesh(601)
    loft(M,[(-1.2,LENS(.32,.2)),(-.8,LENS(.5,.3)),(.4,LENS(.52,.3)),(.85,LENS(.34,.2)),(1.05,LENS(.12,.08))],lens_role)
    M.blob((0,.26,.55),.2,GLASS,sub=2,squash=(1,.7,1.5),noise=0)
    for sx in (1,-1):
        tube(M,[(sx*.45,.05,.1),(sx*.62,.06,.7),(sx*.48,.02,1.35)],[.08,.06,.05],LIGHT,1.0,8)                         # swept fabricator arm
        M.blob((sx*.48,.02,1.38),.07,WIN,sub=1,noise=0)
        tube(M,[(sx*.5,-.05,-.4),(sx*.5,-.05,-1.5)],[.1,.12],LIGHT,1.0,10,cap1=False);M.vent((sx*.5,-.05,-1.51),.09)  # twin booms
        for z in (-.8,-1.2):ring(M,(sx*.5,-.05,z),.125,.012,ACC,seg=14,sides=4)
    ring(M,(0,.02,1.4),.4,.04,ACC,seg=28,sides=5);M.blob((0,.02,1.4),.3,GLASS,sub=2,squash=(1,1,.18),noise=0)         # printing lens
    for k in range(5):a=k*2*PI/5;beam(M,(math.cos(a)*.2,.02+math.sin(a)*.2,1.42),(math.cos(a)*.5,.02+math.sin(a)*.5,1.95))
    box(M,(0,-.42,-.1),(.6,.32,1.0),MID,sh=.9);box(M,(0,-.42,-.1),(.64,.06,1.04),ACC)                               # folded depot module
    for z in (-.5,.3):tube(M,[(-.32,-.1,z),(-.32,-.42,z)],[.02,.02],LIGHT,.9,4);tube(M,[(.32,-.1,z),(.32,-.42,z)],[.02,.02],LIGHT,.9,4)   # (14 Nov 2026, floating parts) they start at -.1 (-.2): inside the hull, whose belly is higher out at x .32
    for sx in (1,-1):barrel(M,(sx*.53,-.1,-.42),.3,.016)                                                              # a small gun under the front of each boom (clear of the printing lens ahead of the nose)
    M.vent((0,0,-1.21),.12);lights(M,[(.07,-.03,1.03),(-.07,-.03,1.03)],.03)
    return finish(M,3.0,1.0)
def foundry():
    # Varkesh constructor: an armoured hex hull with two great crane arms forward ending in pincer manipulators, a bundle of girders
    # clamped along its back, exhaust stacks and a square drive block
    M=Mesh(602)
    loft(M,[(-1.2,SMH(.42,.32)),(.5,SMH(.46,.34)),(.95,SMH(.3,.22,-.02)),(1.15,SMH(.12,.08,-.04))],smh_role)
    M.blob((0,.3,.6),.16,GLASS,sub=2,squash=(1,.6,1.4),noise=0)
    for sx in (1,-1):
        abox(M,(sx*.5,0,.2),(.24,.26,.9),MID,(.9,.9));barrel(M,(sx*.5,-.06,.6),.26,.02)                              # crane shoulder, a stub gun in its front
        tube(M,[(sx*.5,.05,.6),(sx*.62,.25,1.1),(sx*.42,.1,1.55)],[.07,.06,.05],DARK,.95,6)                          # crane arm
        for q in (1,-1):abox(M,(sx*.42+q*.07,.1,1.72),(.05,.08,.3),MID,(.5,.5))                                      # pincer
        M.blob((sx*.42,.1,1.58),.04,WIN,sub=1,noise=0)
    for x in (-.15,0,.15):tube(M,[(x,.42,-.9),(x,.42,.45)],[.045,.045],LIGHT,.95,4)                                   # girder bundle
    for z in (-.6,.15):box(M,(0,.42,z),(.5,.14,.08),ACC)
    stacks(M,(0,.32,-.95),2,.3,.32)
    box(M,(0,0,-1.32),(.7,.5,.28),DARK,sh=.8)
    for x in (-.17,.17):
        for y in (-.11,.11):M.vent((x,y,-1.47),.08)
    lights(M,[(.2,-.12,1.05),(-.2,-.12,1.05)],.03)
    return finish(M,3.0,1.0)
def loom():
    # Ostrova constructor: a faceted spire with a cockpit, inside a halo, three long prongs reaching forward from the halo, glowing threads strung
    # between their tips weaving a crystal frame, crystal girders carried along the spire, spire drives
    M=Mesh(603)
    loft(M,[(-1.2,OCT(.18,.17)),(-.7,OCT(.3,.28)),(.5,OCT(.28,.26)),(.95,OCT(.12,.11)),(1.1,OCT(.02,.02))],oct_role)
    ring(M,(0,0,-.1),.62,.05,ACC,seg=36,sides=6)
    M.blob((0,.24,.45),.13,GLASS,sub=2,squash=(1,.7,1.7),noise=0)                                                   # cockpit
    tips=[]
    for k in range(3):
        a=PI/2+k*2*PI/3;b=(math.cos(a)*.62,math.sin(a)*.62,-.1);t=(math.cos(a)*.42,math.sin(a)*.42,1.6)
        tube(M,[(math.cos(a)*.27,math.sin(a)*.25,-.1),b],[.03,.03],LIGHT,.9,5)
        tube(M,[b,t],[.05,.025],LIGHT,.95,6);M.blob(t,.05,WIN,sub=1,noise=0);tips.append(np.array(t))
    for i in range(3):beam(M,tips[i],tips[(i+1)%3],.014)                                                             # the weave
    for i in range(3):beam(M,tips[i],(0,0,2.05),.01)
    crystal(M,1.55,2.15,.12,.12,0,0)                                                                                  # the frame taking shape
    for k in range(2):a=PI/6+k*PI;crystal(M,-.9,.35,.07,.07,math.cos(a)*.34,math.sin(a)*.3)                          # crystal girders
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.1,math.sin(a)*.1,-1.21),.07)
    for sx in (1,-1):barrel(M,(sx*.183,-.17,.45),.3,.014,ACC)                                                        # a lance under each side of the spire
    return finish(M,3.0,1.0)

# ============================================================== DRONES
def aegis():
    # Halcyon drone: a slim lens body with a sensor slit (no cockpit), two emitter nodes on short swept vanes, a chin gun
    M=Mesh(611)
    loft(M,[(-.34,LENS(.07,.05)),(-.18,LENS(.16,.09)),(.18,LENS(.15,.09)),(.34,LENS(.05,.04))],lens_role)            # slim lens body, no cockpit
    plate(M,[(-.06,.07,.2),(.06,.07,.2),(.06,.07,.24),(-.06,.07,.24)],.008,WIN,1.0)                                   # sensor slit
    for sx in (1,-1):plate(M,[(sx*.14,0,.0),(sx*.36,.02,-.2),(sx*.36,.02,-.27),(sx*.14,0,-.16)],.016,LIGHT,1.0);M.blob((sx*.36,.02,-.235),.03,WIN,sub=1,noise=0)
    barrel(M,(0,-.0594,.0),.36,.014);M.vent((0,0,-.34),.04)
    return finish(M,.9,1.0)
def ward():
    # Varkesh drone: a squat armoured hex box with amber armour bands and spine plate, twin guns forward, a sensor slit, one square drive
    M=Mesh(612)
    loft(M,[(-.28,HEX(.2,.16)),(.2,HEX(.22,.17)),(.3,HEX(.14,.11))],hex_role)
    plate(M,[(-.12,.12,.27),(.12,.12,.27),(.12,.15,.27),(-.12,.15,.27)],.01,WIN,1.0)
    for sx in (1,-1):abox(M,(sx*.24,-.03,.05),(.08,.08,.3),DARK,(.8,.8),.8);barrel(M,(sx*.24,-.03,.2),.27,.016)
    sqdrive(M,(0,0,-.34),.2)
    for z in (-.12,.1):loft(M,[(z-.025,[(a*1.12,b*1.12) for a,b in HEX(.21,.165)]),(z+.025,[(a*1.12,b*1.12) for a,b in HEX(.21,.165)])],(ACC,1.0),cap0=False,cap1=False)   # amber armour bands
    plate(M,[(-.09,.195,-.2),(.09,.195,-.2),(.09,.195,.12),(-.09,.195,.12)],.02,ACC,1.0)                              # amber spine plate, resting on the bands (it floated above them)
    return finish(M,.9,1.0)                                                                                        # (11 Nov 2026: the glowing balls on its gun tips are gone: the game took them for engines and drew thrust on them)
def halo_drone():
    # Ostrova drone: a faceted crystal core floating inside a ring, held by energy bridges; a small turret rides the ring
    M=Mesh(613)
    crystal(M,-.25,.3,.1,.1,0,0)
    ring(M,(0,0,0),.32,.03,ACC,seg=28,sides=6)
    for k in range(3):a=PI/2+k*2*PI/3;beam(M,(math.cos(a)*.07,math.sin(a)*.07,0),(math.cos(a)*.3,math.sin(a)*.3,0),.008)
    M.blob((0,.33,0),.04,MID,sub=1,squash=(1,.7,1),noise=0);barrel(M,(0,.3518,.0),.14,.008,ACC)                        # the small turret riding the ring, its lance forward
    M.vent((0,0,-.298),.03,.06)                                                                                      # a small drive in the core's tail (11 Nov 2026: it had none, and its flares were drawn on its energy bridges)
    return finish(M,.7,1.0)

# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('architect aegis','halcyon'),('foundry ward','varkesh'),('loom halo_drone','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
SUPPORT=[('halcyon','Halcyon Accord',[('Architect','Constructor',architect),('Aegis Drone','Drone',aegis)]),
         ('varkesh','Varkesh Dominion',[('Foundry','Constructor',foundry),('Ward Drone','Drone',ward)]),
         ('ostrova','Ostrova Collective',[('Loom','Constructor',loom),('Halo Drone','Drone',halo_drone)])]
