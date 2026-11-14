# Driftgate Beyond: the house-brand hulls and the Wraith, centuries on from Driftgate 1 (preview, not in the model pack yet). First pass.
# Driftgate 1's Gannet, Bombard and Vesper were conversions of a stock hull; in Beyond each is its own design in its faction's
# language, built around the weapon that made its name. The Wraith, a conqueror's trophy, belongs to no faction: a faceted stealth wing.
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,ring,LENS,HEX,lens_role,barrel,loft_top
from beyond_work import finish,abox,crystal,lights,sqdrive,hatch
from beyond_recon import SMH,smh_role,dish
from beyond_capitals import tube,giant_gun,stacks
PI=math.pi
OCT=lambda w,h,dx=0,dy=0:[(math.cos(a)*w+dx,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
def oct_role(i,j):return ([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[1,.97,1,.95,.9,.85,.85,.92][j])

def cells(M,x0,x1,z0,z1,y,nx,nz,dy=0.0,surf=None):
    # a bank of missile launch cells: dark square hatches with amber rims and a glow in each
    for i in range(nx):
        for k in range(nz):
            x=x0+(x1-x0)*(i+.5)/nx;z=z0+(z1-z0)*(k+.5)/nz;yy=surf(x,z) if surf else y+dy*abs(x)   # surf: the hull's height there (the cells stood off the wing where it curves away)
            w=(x1-x0)/nx*.38;l=(z1-z0)/nz*.38
            plate(M,[(x-w,yy,z-l),(x+w,yy,z-l),(x+w,yy,z+l),(x-w,yy,z+l)],.012,DARK,.8)
            M.blob((x,yy+.008,z),min(w,l)*.45,WIN,sub=1,squash=(1,.3,1),noise=0)

def gannet():
    # Halcyon house-brand hauler: the hauler line's thick lens flying wing (the Albatross's frame, centuries on), its wing bays split
    # between freight hatches and banks of missile launch cells (the barrage), a glass cockpit set straight into the hull, small tail plates, floodlights
    M=Mesh(701)
    sec=lambda w,h,dy=0:[(math.cos(a)*w,math.sin(a)*h*(1 if math.sin(a)>0 else .55)+dy) for a in np.linspace(0,2*PI,16,endpoint=False)]
    Hs=[(-1.0,sec(.75,.15)),(-.6,sec(1.3,.26)),(.2,sec(1.15,.28)),(.75,sec(.6,.22)),(1.1,sec(.2,.1))];top=lambda x,z:loft_top(Hs,z,x)+.004
    loft(M,Hs,lambda i,j:((LIGHT,1.0) if j<8 else (MID,.92)))
    for sx in (1,-1):
        cells(M,sx*.35,sx*1.0,-.55,.25,.27,3,4,-.02,top) if sx>0 else cells(M,sx*1.0,sx*.35,-.55,.25,.27,3,4,-.02,top)   # launch cells in the outer bays
        hatch(M,(sx*.22,.28,-.2),.22,.5)                                                                        # freight hatches on the spine
        plate(M,[(sx*.4,.22,-.7),(sx*.5,.42,-.92),(sx*.5,.42,-1.02),(sx*.4,.22,-.98)],.035,ACC,.95)
        M.blob((sx*1.28,.0,-.4),.06,WIN,sub=1,noise=0)
        for dx in (.3,.75):M.vent((sx*dx,0,-1.0),.09)
        barrel(M,(sx*.5,-.115,.4),.34,.017)                                                                         # a gun under each wing bay
    M.blob((0,.24,.62),.15,GLASS,sub=2,squash=(1,.55,1.6),noise=0)                                                 # cockpit set straight into the hull
    lights(M,[(.13,-.045,1.04),(-.13,-.045,1.04)],.035)
    M.xf(lambda Q:Q*np.array([.86,1,1]))                                                                            # a little narrower
    return finish(M,2.8,1.0)
def bombard():
    # Varkesh house-brand miner: one huge shell cannon running the whole length of the ship down its centre, carried between two
    # armoured side hulls joined by braces over it, disappearing astern into a broad armoured aft section; the port hull carries the
    # cockpit, the starboard hull the ore hopper and a docked Ward Drone; vents along each side hull's outer flank, stacks and drives
    M=Mesh(702)
    tube(M,[(0,0,-.7),(0,0,-.4),(0,0,1.5)],[.15,.12,.09],DARK,1.0,10,cap0=True,cap1=True)                          # the cannon, out of the aft section
    for z in (-.4,.3,.9):ring(M,(0,0,z),.12,.02,ACC,seg=14,sides=4)
    n0=len(M.T);tube(M,[(0,0,1.45),(0,0,1.8)],[.13,.13],MID,.95,8,cap1=False)
    C8=lambda q:[(math.cos(a)*q,math.sin(a)*q) for a in np.linspace(0,2*PI,8,endpoint=False)]
    M.rings((0,0,1.8),[(0,C8(.13)),(0,C8(.098)),(-.16,C8(.085))],DARK,.45,inward=True,cap=(2,DARK,.22));M.part(M.gun,(0,0,1.8),n0)   # the muzzle: a rim and a dark bore (it was an open pipe); the shell leaves from here
    for z in (1.56,1.68):ring(M,(0,0,z),.135,.015,DARK,seg=12,sides=4)
    loft(M,[(-1.6,SMH(.62,.3)),(-.65,SMH(.66,.32)),(-.45,SMH(.5,.24))],smh_role)                                    # aft section the gun runs into (to -1.6: at -1.55 the drives hung behind it)
    for sx in (1,-1):
        loft(M,[(-1.3,[(a+sx*.45,b) for a,b in SMH(.2,.22)]),(.6,[(a+sx*.45,b) for a,b in SMH(.22,.24)]),(1.0,[(a+sx*.45,b-.02) for a,b in SMH(.14,.15)]),(1.2,[(a+sx*.45,b-.04) for a,b in SMH(.05,.05)])],smh_role)   # side hull
        sqdrive(M,(sx*.45,0,-1.68),.26);stacks(M,(sx*.45,.3,-1.1),1,.2,.26)
        for k in range(4):                                                                                       # vents along the outer flank
            z=-.1+k*.22;plate(M,[(sx*.665,-.08,z-.07),(sx*.665,.08,z-.07),(sx*.665,.08,z+.07),(sx*.665,-.08,z+.07)],.012,DARK,.7)
            plate(M,[(sx*.672,-.05,z-.04),(sx*.672,.05,z-.04),(sx*.672,.05,z+.04),(sx*.672,-.05,z+.04)],.006,GLOW,1.0)
        lights(M,[(sx*.45,-.12,1.1)],.03)
        plate(M,[(sx*.62,-.02,-.2),(sx*.95,-.06,-.48),(sx*.95,-.06,-.6),(sx*.62,-.02,-.62)],.03,MID,.95)            # very small wing on the side hull
        M.blob((sx*.95,-.06,-.54),.025,WIN,sub=1,noise=0)
    for z in (-.3,.35):abox(M,(0,.16,z),(.7,.12,.2),MID,(1,1),.9)                                                    # braces over the cannon (the aft one was at -.55, wholly inside the aft section)
    M.blob((-.45,.25,.55),.13,GLASS,sub=2,squash=(1,.65,1.5),noise=0)                                                # cockpit, port hull
    abox(M,(.45,.3,-.3),(.3,.18,.55),MID,(.9,.9));box(M,(.655,-.02,.25),(.1,.14,.2),MID)                            # hopper and docked Ward Drone, starboard (its face clear of the flank vents under it)
    return finish(M,3.0,1.0)
def vesper():
    # Ostrova house-brand scout: a slender faceted spire that is itself a railgun, two long crystal rails reaching forward through three
    # accelerator halos with a glowing slug between them; two rings crossed in an X round the stern for wings, the drive pontoons set on
    # the rings' four tips; a scout radome low on the spine
    M=Mesh(703)
    loft(M,[(-1.25,OCT(.1,.1)),(-.8,OCT(.2,.19)),(.3,OCT(.19,.18)),(.6,OCT(.1,.1)),(.7,OCT(.03,.03))],oct_role)
    M.blob((0,.16,.25),.09,GLASS,sub=2,squash=(1,.7,1.8),noise=0)
    for sx in (1,-1):
        crystal(M,.0,2.0,.07,.07,sx*.17,0)
        tube(M,[(sx*.08,0,.1),(sx*.17,0,.1)],[.03,.03],LIGHT,.9,5)
    # (14 Nov 2026, floating parts) the halos' radius .26 -> .245 (and .25 -> .235): they stood .011 clear of the rails they run round
    for z in (.7,1.15,1.6):ring(M,(0,0,z),.245,.03,ACC,seg=24,sides=5);ring(M,(0,0,z),.235,.012,WIN,seg=24,sides=4)
    crystal(M,1.0,1.45,.05,.05,0,0);M.blob((0,0,1.22),.07,GLOW,sub=1,noise=0);M.part(M.gun,(0,0,2.0),len(M.T))      # the slug between the rails; its shots leave from between the rail tips
    dish(M,(0,.2,-.25),.16)
    zc=-.75;R=.55
    for th in (PI/4,-PI/4):                                                                                          # X-wing rings
        u=np.array([math.sin(th),math.cos(th),0.])
        pts=[np.array([0,0,zc])+u*math.cos(a)*R+np.array([0,0,math.sin(a)*R*.55]) for a in np.linspace(0,2*PI,37)]
        M.tube(pts,[.03]*len(pts),6,lambda i,j,n,p:(ACC,1.0),cap0=False,cap1=False)
        for sg in (1,-1):
            tip=np.array([0,0,zc])+u*sg*R
            loft(M,[(zc-.35,[(a+tip[0],b+tip[1]) for a,b in OCT(.05,.05)]),(zc+.1,[(a+tip[0],b+tip[1]) for a,b in OCT(.065,.065)]),(zc+.3,[(a+tip[0],b+tip[1]) for a,b in OCT(.02,.02)])],oct_role)   # pontoon on the ring
            M.vent((tip[0],tip[1],zc-.36),.035)
            tube(M,[u*sg*.18+[0,0,zc],u*sg*(R-.05)+[0,0,zc]],[.018,.018],LIGHT,.9,5,cap0=False,cap1=False)
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.06,math.sin(a)*.06,-1.26),.04)
    M=finish(M,2.7,1.0);M.keep_clear=[((0,0,.71),.2)]      # the slug floats between the rails by design (Mesh.seat_floaters leaves it)
    return M
def wraith():
    # the Wraith: a faceted stealth flying wing, clean and hard-angled, with some depth to it: a raised diamond body and spine, thick
    # wings blended into it with straight swept edges, drives buried in slit vents, two heavy guns hidden in the leading edge, a faceted
    # canopy, faint edge lights; a dark trophy finish
    M=Mesh(704)
    D=lambda w,h,dy=0:[(w,dy),(w*.4,h+dy),(-w*.4,h+dy),(-w,dy),(-w*.4,-h*.6+dy),(w*.4,-h*.6+dy)]
    # one faceted body with the spine ridge built into its section (no overlapping pieces to fight), evenly shaded planes
    B=lambda w,h,r:[(w,0),(w*.4,h),(0,h+r),(-w*.4,h),(-w,0),(-w*.4,-h*.6),(w*.4,-h*.6)]
    role=lambda i,j:([MID,LIGHT,LIGHT,MID,DARK,DARK,DARK][j],[.95,1,.96,.95,.8,.78,.8][j])
    loft(M,[(-.95,B(.42,.1,.04)),(-.35,B(.52,.2,.08)),(.45,B(.34,.17,.0)),(1.05,B(.04,.03,0))],role)
    for sx in (1,-1):
        W=[(sx*.345,0,.42),(sx*1.2,-.03,-.6),(sx*1.08,-.03,-.82),(sx*.43,0,-.9)]                                    # wing root on the body's side edge
        plate(M,W,.03,MID,.9)                                                                                          # thick swept wing
        r0=np.array(W[0]);t1=np.array(W[1]);tube(M,[r0+(t1-r0)*.26+[0,.02,0],t1+[0,.02,0]],[.012,.012],GLOW,1.0,4,cap0=False,cap1=False)   # edge light, along the leading edge
        barrel(M,(sx*.33,-.04,.38),.28,.019)                                                                           # the guns in the leading edge
        n0=len(M.T);plate(M,[(sx*.12,-.01,-.96),(sx*.34,-.01,-.94),(sx*.34,-.01,-.99),(sx*.12,-.01,-1.01)],.012,GLOW,1.0);M.eng.append([np.array((sx*.23,-.01,-1.0)),.07,n0,len(M.T)])   # slit vents: its drives (recorded, so the flares sit here and not on the edge lights)
    loft(M,[(.12,D(.12,.05,.205)),(.45,D(.1,.07,.18)),(.68,D(.03,.02,.15))],(GLASS,1.0))
    return finish(M,2.0,1.0)

# (11 Nov 2026) each power's builders make their nozzles and guns in that power's design language (brood.styled)
from brood import styled as _styled
for _names,_st in (('gannet','halcyon'),('bombard','varkesh'),('vesper','ostrova'),):
    for _n in _names.split():globals()[_n]=_styled(_st)(globals()[_n])
BRAND=[('halcyon','Halcyon Accord',[('Gannet','House-brand hauler: missile barrage',gannet)]),
       ('varkesh','Varkesh Dominion',[('Bombard','House-brand miner: shell cannon',bombard)]),
       ('ostrova','Ostrova Collective',[('Vesper','House-brand scout: railgun',vesper)]),
       ('wraith','The Wraith trophy',[('Wraith','Conqueror\'s trophy: stealth fighter',wraith)])]
