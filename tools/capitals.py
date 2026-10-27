# Faction capital ships built from Kenney space-kit parts, like the stations: the fleet carrier and the escort.
# The carrier follows space-carrier lines (inspired by Wing Commander's capital ships, not ocean carriers): a long armoured
# hull with enclosed flight decks that launch through bow bay doors, twin side launch pods, a command tower aft and a heavy
# drive block. The escort is a lean torpedo destroyer: twin forward torpedo tubes, point-defence turrets down its flanks,
# a small bridge and one ventral bay for its assault ship.
import sys,math;sys.path.insert(0,'.')
from station import Comp
import numpy as np
def _ring_tris(C,rings,col,win=None):
    # skin a list of 3D rings (same vertex count, same winding) into a closed solid; triangles face outward
    R=[np.array(r,dtype=float) for r in rings];cen=[r.mean(0) for r in R];m=len(R[0])
    def tri(a,b,c,out):
        n=np.cross(b-a,c-a)
        if np.dot(n,out)<0:b,c=c,b;n=-n
        l=np.linalg.norm(n)
        if l<1e-9:return
        if win is not None:win.append(len(C.P))
        C.P.append(np.array([a,b,c]));C.C.append(np.array(col,dtype=float));C.N.append(n/l)
    for k in range(len(R)-1):
        A,B=R[k],R[k+1];mc=(cen[k]+cen[k+1])/2
        for i in range(m):
            j=(i+1)%m;q=(A[i]+A[j]+B[i]+B[j])/4;o=q-mc
            tri(A[i],A[j],B[j],o);tri(A[i],B[j],B[i],o)
    for k,nb in ((0,1),(len(R)-1,len(R)-2)):
        r=R[k];o=cen[k]-cen[nb]
        for i in range(1,m-1):tri(r[0],r[i],r[i+1],o)
def chamf(hw,y0,y1,ct,cb=None):
    # a box cross-section with chamfered corners (ct on the top edges, cb on the bottom)
    cb=ct if cb is None else cb
    return [(-hw+ct,y1),(hw-ct,y1),(hw,y1-ct),(hw,y0+cb),(hw-cb,y0),(-hw+cb,y0),(-hw,y0+cb),(-hw,y1-ct)]
def oct_(r,cx=0,cy=0):return [(cx+r*math.cos(math.pi/8+k*math.pi/4),cy+r*math.sin(math.pi/8+k*math.pi/4)) for k in range(8)]
def loft_z(C,secs,col,x=0,win=None):
    # secs: [(z, profile)], profile points (x,y) in the cross-section; the solid runs along z
    _ring_tris(C,[[(px+x,py,z) for px,py in pr] for z,pr in secs],col,win)
def loft_y(C,secs,col,x=0,z=0,win=None):
    # secs: [(y, profile)], profile points (x,z); the solid runs along y
    _ring_tris(C,[[(px+x,y,pz+z) for px,pz in pr] for y,pr in secs],col,win)
def box(C,x0,x1,y0,y1,z0,z1,col,win=None):
    pr=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)];loft_z(C,[(z0,pr),(z1,pr)],col,0,win)
H=math.pi
def drive(C,x,y,z,sc):
    # a drive centred on (x,y), its front face at z: an open octagonal nozzle housing with a fuel-cell cap at the back
    # (its aft face lights as the engine)
    C.add('rocket_sidesA',(x,y,z),0,sc,False,-H/2);C.add('rocket_fuelA',(x,y,z-sc*.98),0,sc,False,-H/2)
def ramp(C,pos,rot,sc,col=(.6,.62,.66)):
    # a sloped armour wedge (Kenney's terrain ramp, recoloured to hull plating); rot 0 rises toward the bow, H toward the stern
    n=len(C.C);C.add('terrain_ramp',pos,rot,sc)
    for k in range(n,len(C.C)):C.C[k]=list(col)+list(C.C[k][3:])
def build_carrier_bengal():
    # Strike-carrier lines (inspired by Wing Commander's Bengal class): a narrow armoured prow, an open recovery deck amidships
    # where fighters land, a broad aft hull under a stepped superstructure and raised bridge, and swept winglets aft whose
    # leading edges carry the launch-tube mouths. The plan view is a wedge, broadest at the winglets and drives.
    import math as _m
    C=Comp()
    # drives first (only these triangles may light as engines): three big drives one-over-two, a small one at each wingtip
    for x,y in ((0,.66),(-.68,-.66),(.68,-.66)):drive(C,x,y,-8.9,1.28)
    for sd in (-1,1):drive(C,3.75*sd,-.2,-7.65,.6)
    gn=len(C.P)
    # forward hull and armoured prow
    C.add('hangar_largeA',(0,0,3.75),0,.9);C.add('hangar_largeA',(0,0,3.75),0,.9,True)
    C.add('rocket_fuelA',(0,0,5.1),0,1.45,False,H/2);C.add('rocket_topA',(0,0,5.8),0,1.45,False,H/2)
    # amidships: the open recovery deck, low walls either side, a deep hull beneath, a shuttle bay on each flank
    C.add('hangar_largeA',(0,0,0),0,1.3,True);C.add('hangar_smallA',(0,0,-1.8),0,1.3,True)
    for z in (1.6,0,-1.6):C.add('platform_large',(0,0,z),0,.8)
    for sd in (-1,1):
        for k in range(6):C.add('corridor',(1.25*sd,0,2.0-k*.8),0,.8)
        C.add('hangar_smallA',(2.1*sd,-.55,0),H/2,.5)
    # aft hull, taller and broad, under the stepped superstructure and the raised bridge
    C.add('hangar_largeA',(0,0,-4.35),0,1.3);C.add('hangar_largeA',(0,0,-4.35),0,1.3,True)
    C.add('hangar_smallA',(0,0,-7.6),0,1.3);C.add('hangar_smallA',(0,0,-7.6),0,1.3,True)
    T=1.3
    ramp(C,(0,T,-3.3),H,1.8)                                   # hull → tier
    for z in (-4.65,-5.55,-6.45):
        for x in (-.45,.45):C.add('corridor',(x,T,z),0,.9)
        C.add('corridor_roof',(0,T+.9,z),0,.9)
    ramp(C,(0,T,-7.8),0,1.8)                                   # tier → stern
    T2=T+.9+.21
    ramp(C,(0,T2,-4.8),H,1.2)                                  # tier → bridge
    for z in (-5.7,-6.3):
        for x in (-.3,.3):C.add('corridor_window',(x,T2,z),0,.6)
        C.add('corridor_roof',(0,T2+.6,z),0,.62)
    C.add('hangar_roundGlass',(0,T2+.74,-6.0),H,.27);C.add('machine_wireless',(0,T2+.74,-6.52),0,.45)
    C.add('satelliteDish',(.72,T2,-4.9),0,.45)
    # swept winglets aft: a spar of hull sweeping out and back, plated over, launch-tube mouths along the leading edge
    x0,z0,x1,z1=1.3,-3.4,3.75,-7.3;L=_m.hypot(x1-x0,z1-z0);n=int(L/.8)+1;a=_m.atan2(x1-x0,z1-z0)
    for sd in (-1,1):
        for k in range(n):
            t=(k+.5)/n;x=(x0+(x1-x0)*t)*sd;z=z0+(z1-z0)*t
            C.add('corridor',(x,-.55,z),a*sd,.85)
            if k<n-1:C.add('pipe_entrance',(x+.32*sd,-.5,z+.42),0,.5)
        for (px,pz) in ((2.1,-6.1),(2.75,-7.15),(1.8,-7.35)):C.add('platform_large',(px*sd,-.2,pz),0,.75)
        C.add('turret_single',(x1*sd,.3,z1+.2),0,.7)
    # point defence on the prow and aft on the tier
    C.add('turret_single',(.5,.9,4.4),0,.7);C.add('turret_single',(-.5,.9,4.4),0,.7);C.add('turret_single',(0,.9,3.0),0,.7);C.add('turret_single',(0,T2,-6.75),0,.7)
    # docking: ships set down on the open recovery deck (two spots fore, two aft) and lift off from it
    M=C.model();M['glow_n']=gn;M['pts']=[(0,.08,1.0),(0,.08,-1.0),(0,.08,0)];return M
def build_carrier_concordia():
    # Fleet-carrier lines inspired by Wing Commander's Concordia: a long, low flight-deck bow with the launch bay opening at
    # its nose, a narrow armoured waist under a dorsal spine, and a tall aft hull carrying the stepped command tower and
    # raised bridge. Engine nacelles on pylons make the stern the broadest part of the ship; three main drives, one over two.
    C=Comp()
    # drives first (only these triangles may light as engines): the main three one-over-two, one on each nacelle
    for x,y in ((0,.72),(-.7,-.6),(.7,-.6)):drive(C,x,y,-8.5,1.28)
    for sd in (-1,1):drive(C,2.7*sd,-.15,-7.3,.8)
    gn=len(C.P)
    # ---- the flight-deck bow: two hangar bays side by side, decked over on top, a deep keel below, launch mouth forward
    for x in (-1,1):
        for z in (5.5,2.5):C.add('hangar_largeA',(x,0,z),0,1.0);C.add('hangar_largeA',(x,0,z),0,1.0,True)
        for z in (6.0,4.0,2.0):C.add('platform_large',(x,1.0,z),0,1.0)
    ramp(C,(0,0,8.0),H,2.0)                                            # sloped armour prow over the launch bay
    for sd in (-1,1):C.add('corridor',(2.15*sd,-.4,6.2),0,.6);C.add('corridor',(2.15*sd,-.4,1.6),0,.6)
    # ---- the waist: narrower armoured hull under a dorsal spine running aft to the tower
    C.add('hangar_largeA',(0,0,-.2),0,1.0);C.add('hangar_largeA',(0,0,-.2),0,1.0,True)
    for k in range(4):C.add('corridor_detailed' if k%2 else 'corridor',(0,1.0,1.0-k*.8),0,.8);C.add('corridor_roof',(0,1.8,1.0-k*.8),0,.8)
    for sd in (-1,1):
        for z in (.8,-.4):C.add('structure_closed',(1.25*sd,-.45,z),0,.55)
    # ---- the aft hull: taller and broad
    C.add('hangar_largeA',(0,0,-3.6),0,1.4);C.add('hangar_largeA',(0,0,-3.6),0,1.4,True)
    C.add('hangar_smallA',(0,0,-7.1),0,1.4);C.add('hangar_smallA',(0,0,-7.1),0,1.4,True)
    # ---- engine nacelles on pylons: the stern's breadth
    for sd in (-1,1):
        x=2.7*sd
        for k in range(5):C.add('corridor',(x,-.55,-2.9-k*.88),0,.88)
        C.add('rocket_fuelA',(x,-.15,-2.3),0,.88,False,H/2);C.add('rocket_topA',(x,-.15,-1.86),0,.88,False,H/2)
        for z in (-4.0,-6.2):
            for j in range(2):C.add('corridor',((1.62+j*.62)*sd,-.4,z),H/2,.62)
        for z in (-3.4,-5.2):C.add('platform_large',((1.85)*sd,.08,z),0,.7)
        C.add('turret_single',(x,.33,-3.6),0,.7)
    # ---- stepped superstructure rising aft to a raised bridge
    T=1.4
    ramp(C,(0,T,-1.6),H,1.6)                                           # spine → first tier
    for z in (-2.85,-3.75,-4.65,-5.55):
        for x in (-.45,.45):C.add('corridor',(x,T,z),0,.9)
        C.add('corridor_roof',(0,T+.9,z),0,.9)
    ramp(C,(0,T,-6.9),0,1.8)                                           # tier → stern
    T2=T+.9+.21
    ramp(C,(0,T2,-3.3),H,1.1)                                          # first tier → bridge
    for z in (-4.15,-4.75):
        for x in (-.3,.3):C.add('corridor_window',(x,T2,z),0,.6)
        C.add('corridor_roof',(0,T2+.6,z),0,.62)
    C.add('hangar_roundGlass',(0,T2+.74,-4.45),H,.27);C.add('machine_wireless',(0,T2+.74,-4.97),0,.45)
    C.add('satelliteDish',(.75,T,-6.1),0,.5)
    # ---- point defence: deck edges forward, waist, tower
    for sd in (-1,1):C.add('turret_single',(1.75*sd,1.1,6.6),0,.62);C.add('turret_single',(1.2*sd,1.0,-1.1),0,.62)
    C.add('turret_single',(0,T2,-5.7),0,.7)
    # docking: ships set down on the bow flight deck (two spots fore, two aft) and lift off from it
    M=C.model();M['glow_n']=gn;M['pts']=[(0,1.1,5.2),(0,1.1,2.6),(0,1.1,3.9)];return M
def build_carrier():
    # Fleet carrier after Wing Commander's Concordia, in the escort's kit style: a broad flight-deck bow of twin hangar bays
    # whose open fronts are the launch mouths, a narrow waist under the escort's roofed spine with turret sponsons, a tall aft
    # hull with a tower stepping up in corridor tiers to a domed bridge, engine nacelles on pylons (the stern is the
    # broadest part), and three main drives one over two.
    C=Comp()
    for x,y in ((0,.72),(-.7,-.6),(.7,-.6)):drive(C,x,y,-8.5,1.28)
    for sd in (-1,1):drive(C,2.7*sd,-.15,-7.3,.8)
    gn=len(C.P)
    # ---- flight-deck bow: twin hangar bays decked over, a keel beneath; the bays' open fronts face forward as launch mouths
    for x in (-1,1):
        for z in (5.5,2.5):C.add('hangar_largeA',(x,0,z),0,1.0);C.add('hangar_largeA',(x,0,z),0,1.0,True)
        for z in (6.0,4.0,2.0):C.add('platform_large',(x,1.0,z),0,1.0)
    for sd in (-1,1):   # escort-style sponsons down the bow flanks, with point defence
        for z in (6.2,5.2,4.2,3.2,2.2):C.add('corridor',(2.3*sd,-.4,z),0,.6)
        for z in (5.7,2.7):C.add('turret_single',(2.3*sd,.2,z),0,.6)
    # ---- waist: the escort's roofed spine, and a sponson each side carrying point defence
    C.add('hangar_largeA',(0,0,-.2),0,1.0);C.add('hangar_largeA',(0,0,-.2),0,1.0,True)
    for k in range(4):
        z=1.0-k*.8;C.add('corridor_detailed' if k in (1,2) else 'corridor',(0,1.0,z),0,.8);C.add('corridor_roof',(0,1.8,z),0,.8)
    C.add('machine_generatorLarge',(0,1.99,.55),0,1.0);C.add('pipe_ring',(0,1.99,.55),0,1.25)   # shield generator in its emitter ring, on the spine roof ahead of the tower (a sub-target)
    for sd in (-1,1):
        for z in (.9,.1,-.7):C.add('corridor',(1.2*sd,-.4,z),0,.8)
        C.add('turret_single',(1.2*sd,.4,.1),0,.6)
    # ---- aft hull
    C.add('hangar_largeA',(0,0,-3.6),0,1.4);C.add('hangar_largeA',(0,0,-3.6),0,1.4,True)
    C.add('hangar_smallA',(0,0,-7.1),0,1.4);C.add('hangar_smallA',(0,0,-7.1),0,1.4,True)
    # ---- engine nacelles on pylons, nosed like the escort's prow
    for sd in (-1,1):
        x=2.7*sd
        for k in range(5):C.add('corridor',(x,-.55,-2.9-k*.88),0,.88)
        C.add('corridor_roof',(x,.33,-4.66),0,.88)
        C.add('rocket_fuelA',(x,-.15,-2.3),0,.88,False,H/2);C.add('rocket_topA',(x,-.15,-1.86),0,.88,False,H/2)
        for z in (-4.0,-6.2):
            for j in range(2):C.add('corridor',((1.62+j*.62)*sd,-.4,z),H/2,.62)
        C.add('turret_single',(x,.57,-3.4),0,.6)
    # ---- the tower: a low step, a broad corridor tier, a windowed upper tier, and the escort's bridge dome on top
    T=1.4
    for x in (-.3,.3):C.add('corridor',(x,T,-1.85),0,.55)
    C.add('corridor_roof',(0,T+.55,-1.85),0,.6)
    for z in (-2.55,-3.45,-4.35,-5.25,-6.15):
        for x in (-.45,.45):C.add('corridor_detailed' if z in (-3.45,-5.25) else 'corridor',(x,T,z),0,.9)
        C.add('corridor_roof',(0,T+.9,z),0,.9)
    T2=T+.9+.21
    for z in (-3.3,-3.9,-4.5,-5.1):
        for x in (-.3,.3):C.add('corridor_window',(x,T2,z),0,.6)
        C.add('corridor_roof',(0,T2+.6,z),0,.62)
    C.add('hangar_roundGlass',(0,T2+.74,-4.15),H,.48);C.add('satelliteDish',(0,T2+1.4,-4.9),0,.7)
    # ---- point defence: deck edges forward, behind the tower
    C.add('turret_single',(0,T+.9+.21,-6.15),0,.6)
    # docking: ships set down on the bow flight deck (two spots fore, two aft) and lift off from it
    M=C.model();M['glow_n']=gn
    M['eng']=[(0,.72,-10.3,.48),(-.7,-.6,-10.3,.48),(.7,-.6,-10.3,.48),(-2.7,-.15,-8.86,.31),(2.7,-.15,-8.86,.31)]
    M['pts']=[(0,1.1,5.2),(0,1.1,2.6),(0,1.1,3.9)];return M
def build_carrier_smooth():
    # Fleet carrier after Wing Commander's Concordia, built clean: a broad, low flight-deck bow with the launch bay at its
    # nose, a narrow waist under a dorsal spine, a tall aft hull carrying a stepped tower up to a raised bridge, engine
    # nacelles on pylons (the stern is the broadest part), and three main drives one over two.
    C=Comp();win=[]
    HU,DK,TR,WN=(.84,.86,.9),(.26,.27,.31),(.66,.69,.74),(.35,.65,.95)
    for x,y in ((0,.62),(-.68,-.6),(.68,-.6)):drive(C,x,y,-8.38,1.2)
    for sd in (-1,1):drive(C,2.75*sd,-.15,-7.3,.8)
    gn=len(C.P)
    # hull: flight-deck bow → narrow waist → tall aft hull → chamfered stern
    D=chamf(2.0,-.95,.95,.42);Wt=chamf(1.0,-.8,.9,.3);A=chamf(1.45,-1.4,1.4,.42)
    loft_z(C,[(8.1,chamf(1.55,-.6,.72,.32)),(7.5,D),(1.9,D),(1.0,Wt),(-.3,Wt),(-1.3,A),(-8.0,A),(-8.4,chamf(1.25,-1.2,1.2,.36))],HU)
    # the launch bay mouth in the nose, lit along its lip
    box(C,-1.05,1.05,-.34,.34,8.06,8.14,DK);box(C,-1.05,1.05,.36,.42,8.08,8.13,WN,win)
    # flight deck: landing pads, a dark centre stripe, edge lights
    box(C,-.1,.1,.95,.97,2.0,7.4,DK)
    for z in (5.6,3.0):C.add('platform_large',(0,.95,z),0,.55)
    for sd in (-1,1):
        for z in (7.0,5.9,4.8,3.7,2.6):box(C,1.5*sd-.06,1.5*sd+.06,.95,.98,z-.14,z+.14,WN,win)
        box(C,1.995*sd,2.02*sd,-.42,-.12,2.4,7.0,WN,win)                     # bow hangar gallery
        for z0,z1 in ((-1.7,-3.6),(-4.0,-5.9),(-6.3,-7.7)):box(C,1.445*sd,1.47*sd,-.55,-.25,z1,z0,WN,win)
    # dark frames where the bow meets the waist and around the aft hull
    loft_z(C,[(1.9,chamf(2.04,-.99,.99,.43)),(2.1,chamf(2.04,-.99,.99,.43))],DK)
    for z in (-1.45,-8.0):loft_z(C,[(z,chamf(1.49,-1.44,1.44,.43)),(z+.22,chamf(1.49,-1.44,1.44,.43))],DK)
    # dorsal spine running aft into the tower
    loft_z(C,[(1.7,chamf(.3,.85,1.05,.1)),(1.3,chamf(.36,.85,1.25,.12)),(-1.5,chamf(.36,.85,1.25,.12))],TR)
    # stepped tower up to the raised bridge
    T=1.4
    loft_z(C,[(-1.4,chamf(.55,T,T+.3,.12)),(-2.1,chamf(.82,T,T+.72,.2)),(-6.3,chamf(.82,T,T+.72,.2)),(-6.8,chamf(.55,T,T+.25,.12))],TR)
    loft_z(C,[(-2.6,chamf(.42,T+.7,T+.95,.1)),(-3.1,chamf(.58,T+.7,T+1.38,.14)),(-5.3,chamf(.58,T+.7,T+1.38,.14)),(-5.7,chamf(.42,T+.7,T+.98,.1))],TR)
    loft_z(C,[(-3.35,chamf(.38,T+1.36,T+1.6,.08)),(-3.6,chamf(.46,T+1.36,T+1.85,.1)),(-4.75,chamf(.46,T+1.36,T+1.85,.1)),(-4.95,chamf(.36,T+1.36,T+1.62,.08))],DK)
    box(C,-.38,.38,T+1.62,T+1.76,-3.57,-3.51,WN,win)
    for sd in (-1,1):box(C,.82*sd-.012*sd,.82*sd+.012*sd,T+.3,T+.5,-5.8,-2.5,WN,win);box(C,.58*sd-.012*sd,.58*sd+.012*sd,T+.95,T+1.12,-5.0,-3.4,WN,win)
    C.add('machine_wireless',(0,T+1.85,-4.3),0,.5);C.add('satelliteDish',(.62,T+1.38,-5.0),0,.38)
    # engine nacelles on pylons
    for sd in (-1,1):
        x=2.75*sd
        loft_z(C,[(-1.3,oct_(.18,0,-.15)),(-1.9,oct_(.44,0,-.15)),(-7.3,oct_(.44,0,-.15))],TR,x)
        for z0,z1 in ((-2.9,-3.7),(-5.6,-6.4)):
            loft_z(C,[(z0,[(1.35*sd,-.35),(2.45*sd,-.32),(2.45*sd,.02),(1.35*sd,.1)]),(z1,[(1.35*sd,-.35),(2.45*sd,-.32),(2.45*sd,.02),(1.35*sd,.1)])],DK)
        box(C,x-.04,x+.04,.27,.3,-6.6,-2.4,WN,win)
        C.add('turret_single',(x,.25,-4.6),0,.6)
    # point defence: deck edges forward, aft shoulders, the tower's tail
    for sd in (-1,1):C.add('turret_single',(1.65*sd,.95,6.4),0,.55);C.add('turret_single',(1.0*sd,1.4,-7.2),0,.55)
    C.add('turret_single',(0,T+.72,-6.0),0,.55)
    M=C.model();M['glow_n']=gn;M['win']=win
    M['eng']=[(0,.62,-10.15,.46),(-.68,-.6,-10.15,.46),(.68,-.6,-10.15,.46),(-2.75,-.15,-8.86,.31),(2.75,-.15,-8.86,.31)]
    M['pts']=[(0,1.0,5.6),(0,1.0,3.0),(0,1.0,4.3)];return M
def build_carrier_slab():
    # Light fleet carrier after the user's concept art: a long armoured hull with chamfered edges, a narrow forward hull lined
    # with lit hangar galleries and ringed by dark frames, a broader aft hull with flank sponsons, a slim dark stepped island
    # and funnel amidships-aft, the flight deck behind it, ventral drive pods, and three main drives one over two.
    C=Comp();win=[]
    HU,DK,TR,WN=(.84,.86,.9),(.26,.27,.31),(.62,.65,.7),(.35,.65,.95)
    # drives first (only these triangles may light as engines)
    for x,y in ((0,.6),(-.66,-.58),(.66,-.58)):drive(C,x,y,-8.38,1.18)
    for sd in (-1,1):drive(C,.85*sd,-1.75,-7.35,.58)
    gn=len(C.P)
    # the hull: blunt chamfered nose, narrow forward hull, a short taper out to the broad aft hull, a chamfered stern
    F=chamf(1.1,-1.1,1.1,.32);A=chamf(1.5,-1.4,1.4,.42)
    loft_z(C,[(8.75,chamf(.8,-.75,.8,.25)),(8.3,F),(1.5,F),(.7,A),(-8.0,A),(-8.4,chamf(1.32,-1.22,1.22,.36))],HU)
    # dark frames ringing the forward hull, and lit hangar galleries between them
    for z in (7.4,5.3,3.2):loft_z(C,[(z,chamf(1.15,-1.15,1.15,.34)),(z+.28,chamf(1.15,-1.15,1.15,.34))],DK)
    for sd in (-1,1):
        for z0,z1 in ((1.75,3.05),(3.62,5.15),(5.72,7.25)):box(C,1.09*sd,1.14*sd,-.55,-.12,z0,z1,WN,win)
        box(C,.98*sd,1.03*sd,.45,.62,7.75,8.25,WN,win)                  # forward running lights
    # flank sponsons down the aft hull, each with a lit gallery
    for sd in (-1,1):
        S=chamf(.42,-1.2,.1,.14);s0=chamf(.24,-.95,-.15,.08)
        loft_z(C,[(1.0,s0),(.45,S),(-7.3,S),(-7.75,s0)],TR,1.8*sd)
        for z0,z1 in ((-.2,-2.1),(-2.5,-4.4),(-4.8,-6.7)):box(C,2.21*sd,2.25*sd,-.72,-.4,z1,z0,WN,win)
    # ventral drive pods
    for sd in (-1,1):loft_z(C,[(-2.5,oct_(.18,0,-1.72)),(-3.0,oct_(.33,0,-1.75)),(-7.35,oct_(.33,0,-1.75))],DK,.85*sd)
    # decks: forward deck plating and the flight deck aft of the island
    for z in (6.3,4.2,2.4):C.add('platform_large',(0,1.1,z),0,.75)
    for z in (-4.6,-6.75):C.add('platform_large',(0,1.4,z),0,1.1)
    # the slim dark island, stepped, with a glazed bridge and a funnel stack beside it
    T=1.4
    loft_z(C,[(-.3,chamf(.45,T,T+.4,.12)),(-.7,chamf(.62,T,T+.62,.14)),(-3.0,chamf(.62,T,T+.62,.14))],DK)
    loft_z(C,[(-1.0,chamf(.42,T+.6,T+1.0,.1)),(-1.3,chamf(.48,T+.6,T+1.12,.1)),(-2.7,chamf(.48,T+.6,T+1.12,.1))],DK)
    loft_z(C,[(-1.45,chamf(.34,T+1.1,T+1.4,.08)),(-1.65,chamf(.38,T+1.1,T+1.5,.08)),(-2.4,chamf(.38,T+1.1,T+1.5,.08))],DK)
    box(C,-.3,.3,T+1.22,T+1.4,-1.62,-1.56,WN,win)                          # bridge windows
    C.add('machine_wireless',(0,T+1.5,-2.15),0,.45)
    loft_y(C,[(T,oct_(.28)),(T+1.55,oct_(.28)),(T+1.7,oct_(.22))],DK,.95,-3.35)
    # point defence: forward deck, sponsons, behind the island
    C.add('turret_single',(0,1.1,7.3),0,.55)
    for sd in (-1,1):C.add('turret_single',(1.8*sd,.1,-1.0),0,.6);C.add('turret_single',(1.8*sd,.1,-5.6),0,.6)
    C.add('turret_single',(0,1.1,3.3),0,.55)
    M=C.model();M['glow_n']=gn;M['win']=win;M['eng']=[(0,.6,-10.1,.45),(-.66,-.58,-10.1,.45),(.66,-.58,-10.1,.45),(-.85,-1.75,-8.2,.22),(.85,-1.75,-8.2,.22)];M['pts']=[(0,1.5,-4.9),(0,1.5,-6.9),(0,1.5,-5.9)];return M
def build_escort_clean():
    # Torpedo destroyer in the carrier's style: the same chamfered armoured hull, dark frames and lit galleries, a narrow bow
    # carrying twin torpedo tubes, flank sponsons with point defence, a slim dark island with a glazed bridge, one ventral bay
    # for its assault ship, a main drive and two auxiliaries.
    C=Comp();win=[]
    HU,DK,TR,WN=(.84,.86,.9),(.26,.27,.31),(.62,.65,.7),(.35,.65,.95)
    drive(C,0,0,-3.45,.95)
    for sd in (-1,1):drive(C,.98*sd,-.32,-3.0,.42)
    gn=len(C.P)
    F=chamf(.55,-.55,.55,.18);A=chamf(.72,-.66,.66,.22)
    loft_z(C,[(3.55,chamf(.36,-.32,.38,.12)),(3.15,F),(-.6,F),(-1.2,A),(-3.2,A),(-3.45,chamf(.6,-.55,.55,.18))],HU)
    for z in (2.15,.75):loft_z(C,[(z,chamf(.58,-.58,.58,.19)),(z+.18,chamf(.58,-.58,.58,.19))],DK)
    for sd in (-1,1):
        for z0,z1 in ((.98,2.07),(-.45,.67)):box(C,.545*sd,.575*sd,-.28,-.06,z0,z1,WN,win)
    # twin torpedo tubes along the bow flanks, dark muzzles forward
    for sd in (-1,1):
        loft_z(C,[(3.0,oct_(.14,0,-.25)),(2.85,oct_(.2,0,-.25)),(.1,oct_(.2,0,-.25)),(-.15,oct_(.13,0,-.25))],TR,.66*sd)
        loft_z(C,[(3.06,oct_(.11,0,-.25)),(2.9,oct_(.15,0,-.25))],DK,.66*sd)
    # flank sponsons aft with point defence and a lit gallery
    for sd in (-1,1):
        S=chamf(.24,-.6,.06,.08);s0=chamf(.14,-.45,-.08,.05)
        loft_z(C,[(-.1,s0),(-.4,S),(-2.95,S),(-3.1,s0)],TR,.98*sd)
        box(C,1.215*sd,1.24*sd,-.4,-.2,-2.55,-.75,WN,win)
        for z in (-.8,-1.9):C.add('turret_single',(.98*sd,.06,z),0,.5)
    C.add('turret_single',(0,.55,2.6),0,.5);C.add('turret_single',(0,.66,-2.85),0,.5)
    # forward deck plating
    for z in (1.45,.05):C.add('platform_large',(0,.55,z),0,.4)
    # the slim dark island and glazed bridge
    T=.66
    loft_z(C,[(-.95,chamf(.26,T,T+.24,.07)),(-1.15,chamf(.36,T,T+.36,.08)),(-2.45,chamf(.36,T,T+.36,.08))],DK)
    loft_z(C,[(-1.35,chamf(.22,T+.34,T+.56,.06)),(-1.5,chamf(.27,T+.34,T+.62,.06)),(-2.2,chamf(.27,T+.34,T+.62,.06))],DK)
    box(C,-.2,.2,T+.48,T+.58,-1.47,-1.43,WN,win)
    C.add('machine_wireless',(0,T+.62,-1.85),0,.3)
    loft_y(C,[(T,oct_(.13)),(T+.75,oct_(.13)),(T+.82,oct_(.1))],DK,.42,-2.45)
    # ventral bay for the assault ship: a dark keel with bay lights
    loft_z(C,[(.6,chamf(.3,-.86,-.6,.06,.1)),(.35,chamf(.42,-.95,-.6,.06,.12)),(-1.8,chamf(.42,-.95,-.6,.06,.12)),(-2.0,chamf(.3,-.86,-.6,.06,.1))],DK)
    box(C,-.3,.3,-.965,-.945,-1.6,.15,WN,win)
    M=C.model();M['glow_n']=gn;M['win']=win
    M['eng']=[(0,0,-4.85,.36),(-.98,-.32,-3.62,.16),(.98,-.32,-3.62,.16)];return M
def build_escort():
    C=Comp()
    # drives first (only these may light as engines): one main, two auxiliaries
    drive(C,0,0,-3.48,.95)
    for sd in (-1,1):drive(C,.9*sd,-.1,-2.78,.42)
    gn=len(C.P)
    # a lean spine of corridor, roofed, nose to tail
    for k in range(6):
        z=2.0-k*1.0
        C.add('corridor_detailed' if k in (1,4) else 'corridor',(0,-.5,z),0,1.0)
        C.add('corridor_roof',(0,.5,z),0,1.0)
    # armoured prow
    C.add('rocket_fuelA',(0,0,2.75),0,1.0,False,H/2);C.add('rocket_topA',(0,0,3.25),0,1.0,False,H/2)
    # twin torpedo tubes along the forward flanks, mouths forward
    for sd in (-1,1):
        x=.78*sd
        for z in (1.9,1.4,.9):C.add('rocket_fuelA',(x,-.3,z),0,.62,False,H/2)
        C.add('pipe_entrance',(x,-.55,2.35),0,.62)
    # flank sponsons with three point-defence turrets a side
    for sd in (-1,1):
        for z in (.4,-1.1,-2.5):
            C.add('corridor',(sd*.9,-.4,z),0,.6)
            C.add('turret_single',(sd*.9,.22,z),0,.66)
    # shield generator on the spine, forward of the bridge (a sub-target)
    C.add('machine_generatorLarge',(0,.74,.7),0,.8);C.add('pipe_ring',(0,.74,.7),0,1.0)
    # small bridge aft and a sensor dish
    C.add('hangar_roundGlass',(0,.75,-1.8),H,.38);C.add('satelliteDish',(0,1.2,-1.3),0,.7)
    # one ventral bay for its assault ship
    C.add('hangar_smallA',(0,-.5,-.6),H,.75,True)
    M=C.model();M['glow_n']=gn;return M
