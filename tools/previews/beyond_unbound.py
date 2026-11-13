# Driftgate Beyond: the Unbound's hulls (preview, not in the model pack yet). First pass.
# The Unbound design nothing of their own: every hull is parts of all three factions' ships welded into one, often lopsided.
#   Halcyon parts  lens pods and fuselages, swept wings, emitter nodes, glass canopies, dishes   (light plating, shade up)
#   Varkesh parts  hex and smoothed-hex slabs, chisel prows, square drives, exposed guns         (dark plating, shade down)
#   Ostrova parts  octagonal faceted spires, crystals, halos                                     (mid plating with crystal)
#   Unbound marks  weld seams round every joint, scrap patches, ram spikes
# Nose is +z, up +y; finish() sets the length (fighters 2.0, medium 2.6, heavy 3.2, capitals 3.6-4.6).
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,loft,box,plate,barrel,ring,LENS,HEX,lens_role,hex_role,drivebox,loft_top
from beyond_work import finish,crystal,abox,lights,STAR
from beyond_recon import dish,SMH,smh_role,seat
from beyond_capitals import tube,pd,bridge_varkesh,giant_gun,bore
PI=math.pi
OCT=lambda w,h,dx=0,dy=0:[(math.cos(a)*w+dx,math.sin(a)*h+dy) for a in np.linspace(PI/8,2*PI+PI/8,8,endpoint=False)]
def oct_role(i,j):return ([LIGHT,LIGHT,LIGHT,MID,MID,DARK,DARK,MID][j],[.95,.92,.95,.9,.85,.8,.8,.88][j])
def at(sec,dx=0,dy=0):return [(a+dx,b+dy) for a,b in sec]
def dark_hex(i,j):r,sh=hex_role(i,j);return (r,sh*.78)
def dark_smh(i,j):r,sh=smh_role(i,j);return (r,sh*.78)
def light_lens(i,j):r,sh=lens_role(i,j);return (r,min(sh*1.08,1.1))

# ------------------------------------------------------------------ parts
def hal_pod(M,secs,dx=0,dy=0):loft(M,[(z,at(LENS(w,h),dx,dy)) for z,w,h in secs],light_lens)
def var_slab(M,secs,dx=0,dy=0,smooth=False):loft(M,[(z,at((SMH if smooth else HEX)(w,h),dx,dy)) for z,w,h in secs],dark_smh if smooth else dark_hex)
def ost_spire(M,secs,dx=0,dy=0):loft(M,[(z,OCT(w,h,dx,dy)) for z,w,h in secs],oct_role)
def weld(M,z,sec):
    # a weld seam: a thin bright band round a joint
    loft(M,[(z-.012,[(a*1.04,b*1.04) for a,b in sec]),(z+.012,[(a*1.04,b*1.04) for a,b in sec])],(ACC,.85),cap0=False,cap1=False)
def patch(M,c,w,l,n=(0,1,0)):
    # a scrap patch plate riveted over the hull
    c=np.array(c,float);n=np.array(n,float);n/=np.linalg.norm(n);u=np.cross(n,[0,0,1.]) if abs(n[2])<.9 else np.array([1.,0,0]);u/=np.linalg.norm(u);v=np.cross(n,u)
    plate(M,[c-u*w/2-v*l/2,c+u*w/2-v*l/2*.8,c+u*w/2+v*l/2,c-u*w/2*.7+v*l/2],.012,DARK,.75)
def spikes(M,pts,d=(0,0,1),L=.12,r=.025):
    d=np.array(d,float)
    for p in pts:p=np.array(p,float);tube(M,[p,p+d*L],[r,.002],DARK,.9,5,cap0=True,cap1=False)
def hal_wing(M,root,tip,chord=.4,node=True):
    # a swept Halcyon wing from root to tip with an emitter node
    r=np.array(root,float);t=np.array(tip,float)
    plate(M,[r+[0,0,chord*.5],t+[0,0,chord*.18],t-[0,0,chord*.12],r-[0,0,chord*.5]],.025,LIGHT,1.05)
    if node:M.blob(tuple(t),.05,WIN,sub=1,noise=0)
def var_stub(M,c,size):abox(M,c,size,DARK,(.8,.8),.8)
def var_gun(M,c,L=.35,r=.03,n=1,sp=.07):
    # a stolen Varkesh gun on its mount block (11 Nov 2026: the shared gun, with a breech and a muzzle brake; it was a plain stick)
    c=np.array(c,float);abox(M,tuple(c+[0,0,-.06]),(r*3.2+sp*(n-1),r*2.6,.16),DARK,(.8,.8),.75)
    for k in range(n):x=(k-(n-1)/2)*sp;barrel(M,tuple(c+[x,0,0]),L,r*.82,style='varkesh')
def sq_drive(M,c,s):drivebox(M,c,(s,s*.85,s*.8),c[2]-s*.42,s*.36,sh=.75)
def canopy(M,c,r,sq=(1,.75,1.6)):M.blob(tuple(c),r,GLASS,sub=2,squash=sq,noise=0)

# ------------------------------------------------------------------ hulls
def raider():
    # light: an asymmetric twin-body with an off-centre cockpit. A long Ostrova faceted boom to port carries the drive and the tail;
    # a short stolen Halcyon cockpit pod with its canopy and a Varkesh engine behind it sits out to starboard; one large swept
    # Varkesh wing runs through both, with guns slung under it; a Halcyon tailplane on the boom side only; an Ostrova crystal radar fin on the boom; ram spikes
    M=Mesh(401);bx=-.32;cx=.42
    ost_spire(M,[(-1.15,.07,.07),(-.95,.13,.12),(.5,.13,.12),(.95,.07,.07),(1.1,.015,.015)],dx=bx)                  # Ostrova boom
    for z in (-.55,.15):ring(M,(bx,0,z),.14,.012,ACC,seg=16,sides=4)
    M.vent((bx,0,-1.16),.075,style='ostrova')
    hal_pod(M,[(-.42,.06,.06),(-.25,.15,.14),(.45,.16,.14),(.78,.08,.07),(.92,.02,.02)],dx=cx,dy=.02)             # Halcyon cockpit pod, off centre
    canopy(M,(cx,.15,.25),.12,(1,.75,1.8))
    var_slab(M,[(-1.05,.1,.09),(-.75,.13,.12),(-.42,.12,.11)],dx=cx,dy=.02);ring(M,(cx,.02,-.43),.135,.012,ACC,seg=16,sides=4)   # engine behind the cockpit
    M.vent((cx,.02,-1.06),.08,style='varkesh')
    for sx in (1,-1):                                                                                             # one large swept Varkesh wing through both bodies
        P=[(0,0,.32),(sx*1.45,-.02,-.48),(sx*1.45,-.02,-.78),(0,0,-.45)]
        plate(M,P,.07,MID,.8)
        tube(M,[(0,.0,.32),(sx*1.45,-.02,-.48)],[.03,.025],ACC,1.0,5,cap0=False,cap1=False)
        M.blob((sx*1.45,-.02,-.63),.04,WIN,sub=1,noise=0)
    for x in (.0,.15):var_gun(M,(x,-.08,.2),.5,.028)                                                               # guns under the wing
    hal_wing(M,(bx+.08,0,-.95),(bx-.55,.02,-1.15),.22,node=False)                                                  # tailplane on the boom side only
    plate(M,[(bx,.1,-.8),(bx,.1,-1.1),(bx,.36,-1.12),(bx,.3,-.92)],.02,LIGHT,1.0)                                    # tail fin
    crystal(M,-.75,-.35,.04,.05,bx,.18)                                                                             # crystal radar fin on the boom
    patch(M,(-.5,.041,0),.18,.22);patch(M,(.7,.041,-.1),.14,.18)                                                     # scrap patches, down on the wing (they stood off it)
    spikes(M,[(bx,-.04,1.0),(cx,-.05,.82)],L=.12)
    return finish(M,2.0,1.0)
def skiff():
    # scout: a slender Ostrova faceted spire for a hull, a salvaged Halcyon radome dish set flush on the hull, two Varkesh square drives
    # strapped to its flanks, small forward-swept Halcyon wings,
    # a jammer array of rods aft
    M=Mesh(402)
    ost_spire(M,[(-1.1,.14,.13),(-.6,.2,.18),(.6,.18,.16),(1.15,.05,.05),(1.3,.01,.01)])
    weld(M,-.6,OCT(.2,.18));weld(M,.6,OCT(.18,.16))
    for sx in (1,-1):
        sq_drive(M,(sx*.27,-.02,-.75),.16)
        for z in (-.62,-.88):ring(M,(sx*.27,-.02,z),.1,.012,ACC,seg=10,sides=4)
        tube(M,[(sx*.17,-.02,-.75),(sx*.2,-.02,-.75)],[.03,.03],DARK,.8,4)
    dish(M,(0,.22,.05),.25)                                                                                          # radome set flush on the hull
    canopy(M,(0,.12,.62),.09,(1,.7,1.8))
    for sx in (1,-1):hal_wing(M,(sx*.16,-.02,-.25),(sx*.62,-.05,.12),.3)                                           # small forward-swept wings
    for k,x in enumerate((-.1,0,.1)):tube(M,[(x,.1,-.9),(x*1.6,.4+.06*(k%2),-1.15)],[.01,.006],LIGHT,.9,4);M.blob((x*1.6,.4+.06*(k%2),-1.15),.025,WIN,sub=1,noise=0)
    patch(M,(-.12,.14,.2),.08,.2,(-.5,1,0))
    for sx in (1,-1):barrel(M,(sx*.12,-.105,.45),.3,.013,ACC,style='ostrova')                                          # a stolen lance under each side of the spire
    return finish(M,2.2,1.0)
def corsair():
    # medium: a Varkesh hex body with a chisel prow and twin chin guns, welded to a Halcyon lens drive section, four Halcyon swept
    # wings in an X, a small Ostrova ring on the nose, an Ostrova halo round the tail as a jammer
    M=Mesh(403)
    var_slab(M,[(-.3,.3,.22),(.9,.3,.22),(1.35,.16,.12),(1.55,.04,.03)],smooth=True)
    hal_pod(M,[(-1.35,.22,.18),(-.85,.3,.22),(-.28,.3,.22)]);weld(M,-.29,SMH(.3,.22))
    for x in (-.11,.11):M.vent((x,0,-1.36),.1)
    canopy(M,(0,.2,.65),.14)
    for sx in (1,-1):
        for sy in (1,-1):hal_wing(M,(sx*.22,sy*.1,-.1),(sx*.9,sy*.62,-.7),.5)                                     # four wings in an X
    ring(M,(0,-.02,1.18),.3,.025,ACC,seg=24,sides=5)                                                                # small Ostrova ring on the nose
    for sx in (1,-1):tube(M,[(sx*.19,-.02,1.18),(sx*.28,-.02,1.18)],[.015,.015],LIGHT,.9,4)
    for x in (-.1,.1):var_gun(M,(x,-.2,.7),.55,.03)
    ring(M,(0,.02,-1.05),.48,.03,ACC,seg=28,sides=5);tube(M,[(0,.2,-1.05),(0,.47,-1.05)],[.02,.02],LIGHT,.9,4);tube(M,[(0,-.15,-1.05),(0,-.47,-1.05)],[.02,.02],LIGHT,.9,4)
    for a in (PI/4,3*PI/4,5*PI/4,7*PI/4):M.blob((math.cos(a)*.48,math.sin(a)*.48+.02,-1.05),.03,WIN,sub=1,noise=0)
    patch(M,(.12,.22,.3),.12,.25);patch(M,(-.2,.15,-.6),.1,.18,(-.6,1,0));spikes(M,[(.08,0,1.45),(-.08,0,1.45)],L=.14)
    return finish(M,2.6,1.0)
def plunderer():
    # heavy: a Halcyon lens cockpit pod on a Varkesh box spine; the holds don't match (a Varkesh hex container to port, a long Ostrova
    # crystal hold to starboard), a crystal-clad engine boom on a pylon on top, an Ostrova
    # crystal pontoon underneath, a Varkesh drive block on the right, a turret on top
    M=Mesh(404)
    hal_pod(M,[(.55,.24,.2),(1.1,.26,.21),(1.5,.14,.1),(1.68,.03,.03)]);canopy(M,(0,.2,1.05),.15)
    var_slab(M,[(-1.35,.22,.2),(.6,.24,.22)]);weld(M,.56,HEX(.24,.22))
    for z in (-.9,-.1):tube(M,[(-.18,0,z),(-.42,0,z)],[.04,.04],DARK,.8,5);tube(M,[(.18,0,z),(.5,0,z)],[.04,.04],DARK,.8,5)   # (the starboard struts reach into the crystal hold; they stopped at its faces' hollows)
    var_slab(M,[(-1.15,.16,.2),(.25,.16,.2)],dx=-.58,smooth=True);weld(M,-.45,SMH(.16,.2))                          # Varkesh container hold
    for z in (-.95,-.45,.05):loft(M,[(z-.02,at(SMH(.17,.21),-.58)),(z+.02,at(SMH(.17,.21),-.58))],(ACC,.85))
    crystal(M,-1.25,.4,.19,.2,.6,0)                                                                                 # Ostrova crystal hold
    tube(M,[(0,.46,-.45),(0,.46,-1.75)],[.12,.14],GLASS,1.0,10,cap1=False);M.vent((0,.46,-1.76),.11,style='ostrova')               # boom engine on a pylon on top, crystal-clad
    for z in (-.7,-1.1,-1.5):ring(M,(0,.46,z),.14,.014,WIN,seg=14,sides=4)
    for z in (-.8,-1.35):abox(M,(0,.33,z),(.08,.2,.16),DARK,(1,1),.75)
    crystal(M,-1.15,.35,.13,.13,0,-.47)                                                                            # crystal pontoon underneath
    for z in (-.75,-.1):tube(M,[(0,-.2,z),(0,-.38,z)],[.03,.03],DARK,.8,5)
    sq_drive(M,(.3,-.02,-1.45),.26);M.vent((-.0,0,-1.36),.11,style='varkesh');[var_gun(M,(sx*.11,-.145,1.05),.4,.026) for sx in (1,-1)]   # Varkesh drive block; a stolen gun under each side of the cockpit pod
   #                                                      # Varkesh drive block
    pd(M,(0,.22,.25),.09,MID)
    patch(M,(0,.24,.1),.16,.3);patch(M,(.1,.23,-.9),.12,.2);spikes(M,[(.1,-.06,1.55),(-.1,-.06,1.55),(0,-.12,1.5)],L=.15)
    lights(M,[(.16,-.06,1.5),(-.16,-.06,1.5)],.03)
    return finish(M,3.2,1.0)
def wrecker():
    # bomber: a heavy Varkesh smoothed-hex fuselage under a pair of big stolen Halcyon wings, Ostrova crystals slung under the wings as
    # torpedoes, an Ostrova faceted tail spire with a small halo, a Halcyon canopy set crooked on top
    M=Mesh(405)
    var_slab(M,[(-1.0,.24,.2),(.8,.3,.24),(1.25,.16,.12),(1.45,.04,.03)],smooth=True)
    ost_spire(M,[(-1.7,.05,.05),(-1.3,.16,.15),(-.95,.22,.19)]);weld(M,-.98,OCT(.22,.19))
    ring(M,(0,.0,-1.42),.26,.025,ACC,seg=24,sides=5)
    for a in (0,PI/2,PI,3*PI/2):tube(M,[(math.cos(a)*.1,math.sin(a)*.1,-1.42),(math.cos(a)*.25,math.sin(a)*.25,-1.42)],[.014,.014],LIGHT,.9,4)   # the halo's spokes (it floated round the tail spire)
    for x in (-.11,.11):M.vent((x,0,-1.72),.06,style='ostrova')
    canopy(M,(.04,.22,.55),.14)
    for sx in (1,-1):
        hal_wing(M,(sx*.24,.02,.2),(sx*1.25,-.05,-.55),.65)
        tube(M,[(sx*.62,.0,-.1),(sx*.62,-.15,-.1)],[.02,.02],DARK,.8,4)
        tube(M,[(sx*.95,-.03,-.2),(sx*.95,-.11,-.2)],[.018,.018],DARK,.8,4)                                         # (12 Nov 2026) the outer torpedo's pylon: it hung .05 under the wing with nothing holding it
        crystal(M,-.55,.35,.07,.07,sx*.62,-.18)                                                                     # crystal torpedoes
        crystal(M,-.45,.3,.055,.055,sx*.95,-.13)
    var_gun(M,(0,-.172,.95),.4,.03,2,.08)                                                                           # chin guns (11 Nov 2026: raised into the hull; their mount hung just under it)
    seat(M,(0,.235,-.35),.135)                                                                                       # the turret's seat, on the spine
    patch(M,(-.1,.2265,.0),.14,.3);patch(M,(.15,.22,-.5),.1,.2,(.6,1,0))                                             # (the top patch stood .02 above the hull)
    return finish(M,2.7,1.0)
def ravager():
    # capital (destroyer class): three faction hulls welded end to end, a Varkesh chisel prow with ram spikes, a Halcyon lens
    # midsection, an Ostrova faceted stern inside a halo carrying turrets; a salvaged Halcyon rail cannon along the spine with
    # glowing accelerator rings, a Varkesh giant gun on top, a stepped Varkesh bridge with a Halcyon dish; a Halcyon turret sponson
    # to port and a Varkesh turret pylon to starboard; mismatched drives
    M=Mesh(406)
    var_slab(M,[(.85,.42,.32),(1.7,.36,.26),(2.3,.14,.1),(2.45,.03,.03)],smooth=True)                                # Varkesh prow
    hal_pod(M,[(-.9,.5,.34),(.0,.56,.38),(.9,.46,.34)]);weld(M,.88,SMH(.42,.32))                                     # Halcyon midsection
    ost_spire(M,[(-2.5,.24,.22),(-2.2,.38,.32),(-.9,.44,.34)]);weld(M,-.9,OCT(.44,.34))                              # Ostrova stern
    tube(M,[(0,.42,-.4),(0,.42,2.6)],[.06,.05],DARK,.95,10,cap1=False);bore(M,(0,.42,2.6),.05)                     # rail cannon
    for z in (1.2,1.6,2.0,2.35):
        ring(M,(0,.42,z),.13,.02,WIN,seg=16,sides=5)
        for a in (PI/2,PI/2+2*PI/3,PI/2+4*PI/3):tube(M,[(math.cos(a)*.04,.42+math.sin(a)*.04,z),(math.cos(a)*.118,.42+math.sin(a)*.118,z)],[.012,.012],DARK,.85,4)   # (12 Nov 2026) three struts hold each accelerator ring to the rail: the forward two hung in space
    for z in (-.3,.5):tube(M,[(0,.3,z),(0,.4,z)],[.05,.05],DARK,.85,6)
    giant_gun(M,(.22,.36,-.3))
    bridge_varkesh(M,(-.2,.38,-1.15),.9);dish(M,(-.2,.86,-1.25),.12)
    ring(M,(0,0,-1.7),.72,.05,ACC,seg=36,sides=6)                                                                     # halo with turrets
    for a in (PI/2+.5,PI/2-.5,-PI/2):pd(M,(math.cos(a)*.72,math.sin(a)*.72+(.05 if math.sin(a)>0 else -.05),-1.7),.07,ACC,up=math.sin(a)>0)
    for a in (0,PI):tube(M,[(math.cos(a)*.4,0,-1.7),(math.cos(a)*.68,0,-1.7)],[.03,.03],LIGHT,.9,5)
    hal_pod(M,[(-.7,.06,.06),(-.4,.14,.13),(.6,.14,.13),(.85,.05,.05)],dx=-.62,dy=-.05)                              # Halcyon sponson to port
    for z in (-.3,.4):pd(M,(-.64,.1,z),.065,LIGHT)
    abox(M,(.95,-.05,.05),(.22,.2,1.3),DARK,(.8,.8),.75)                                                             # Varkesh pylon to starboard
    for z in (-.2,.6):abox(M,(.68,-.05,z),(.4,.08,.12),DARK,(1,1),.7);pd(M,(.95,.08,z),.065,MID)
    for x,y in ((-.12,-.1),(.12,-.1)):sq_drive(M,(x,y,-2.55),.16)
    for k in range(3):a=PI/2+k*2*PI/3;M.vent((math.cos(a)*.13,math.sin(a)*.12+.08,-2.52),.06,style='ostrova')
    M.vent((-.62,-.05,-.72),.07)
    spikes(M,[(.16,-.1,2.25),(-.16,-.1,2.25),(.25,.05,2.0),(-.25,.05,2.0)],(0,0,1),.25,.04)
    for c,n in (((.2,.36,.3),(0,1,0)),((-.3,.32,-.5),(-.4,1,0)),((.35,-.2,1.3),(.5,-1,0)),((-.35,.1,-2.0),(-1,.3,0))):patch(M,c,.22,.4,n)
    lights(M,[(.2,-.15,2.0),(-.2,-.15,2.0)],.04)
    # every capital role in one hull (2 Nov 2026): a ventral hangar for its small plundered wing, and two boarding pinnaces
    abox(M,(0,-.38,.15),(.56,.2,1.15),DARK,(.85,.9),.72)                                                              # Varkesh hangar keel
    weld(M,-.42,at(HEX(.29,.11),0,-.38));weld(M,.72,at(HEX(.25,.1),0,-.38))
    plate(M,[(-.17,-.487,-.3),(.17,-.487,-.3),(.17,-.487,.5),(-.17,-.487,.5)],.004,DARK,.22)                          # open bay doors
    for x in (-.19,.19):plate(M,[(x-.012,-.49,-.32),(x+.012,-.49,-.32),(x+.012,-.49,.52),(x-.012,-.49,.52)],.006,ACC,.95)
    for x in (-.19,.19):
        for z in (-.32,.52):M.blob((x,-.495,z),.022,WIN,sub=1,noise=0)
    for x in (-.24,.24):plate(M,[(x,-.47,-.28),(x*1.55,-.6,-.28),(x*1.55,-.6,.48),(x,-.47,.48)],.012,MID,.8)       # bay doors hinged open
    for x in (-.1,0,.1):M.blob((x,-.47,.1),.03,WIN,sub=1,noise=0)
    for side in (-1,1):pinnace(M,(side*.78,-.02,-1.2),side)
    return finish(M,4.0,1.0)
def pinnace(M,c,side,k=1.6):
    # a boarding pinnace clamped to the Ravager's stern: a small Varkesh wedge in sand plating, a Halcyon canopy,
    # grapple claws forward, held off the hull on two clamp arms
    x,y,z=c
    loft(M,[(z+k*a,at(SMH(k*w,k*h),x,y)) for a,w,h in ((-.3,.08,.06),(-.22,.1,.075),(-.02,.13,.09),(.16,.1,.07),(.3,.03,.03))],smh_role)
    M.blob((x,y+k*.07,z+k*.03),k*.045,GLASS,sub=1,squash=(1,.7,1.6),noise=0)
    for dx in (-.05,.05):tube(M,[(x+k*dx,y-k*.03,z+k*.17),(x+k*dx*1.8,y-k*.05,z+k*.4)],[k*.014,k*.005],ACC,.95,4,cap0=True,cap1=False)
    M.vent((x,y,z-k*.31),k*.045,style='varkesh')
    for dz in (-.12,.1):
        tube(M,[(x-side*k*.1,y,z+k*dz),(x-side*.36,y,z+k*dz)],[.025,.025],DARK,.85,5)
        abox(M,(x-side*.33,y,z+k*dz),(.08,.08,.08),ACC,(1,1),.9)
    weld(M,z-k*.02,at(SMH(k*.13,k*.09),x,y))
    lights(M,[(x+side*k*.11,y,z-k*.05)],.02)

UNBOUND=[('pirate','The Unbound',[('Raider','Light',raider),('Skiff','Scout',skiff),('Corsair','Medium',corsair)]),
         ('pirate','The Unbound',[('Plunderer','Heavy (hold)',plunderer),('Wrecker','Bomber',wrecker),('Ravager','Capital (every role)',ravager)])]
