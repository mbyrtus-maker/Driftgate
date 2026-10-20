# Faction capital ships built from Kenney space-kit parts, like the stations: the fleet carrier and the escort.
# The carrier follows space-carrier lines (inspired by Wing Commander's capital ships, not ocean carriers): a long armoured
# hull with enclosed flight decks that launch through bow bay doors, twin side launch pods, a command tower aft and a heavy
# drive block. The escort is a lean torpedo destroyer: twin forward torpedo tubes, point-defence turrets down its flanks,
# a small bridge and one ventral bay for its assault ship.
import sys,math;sys.path.insert(0,'.')
from station import Comp
H=math.pi
def drive(C,x,y,z,sc):
    # a drive: an open octagonal nozzle housing with a fuel-cell cap at the back (its aft face lights as the engine)
    C.add('rocket_sidesA',(x,y-.5*sc,z),0,sc,False,-H/2);C.add('rocket_fuelA',(x,y-.5*sc,z-sc*.98),0,sc,False,-H/2)
def build_carrier():
    C=Comp()
    # drive block first (only these triangles may light as engines): four heavy drives, two lighter ones on the pods
    for x,y in ((-.55,.35),(.55,.35),(-.55,-.7),(.55,-.7)):drive(C,x,y,-6.4,.95)
    for sd in (-1,1):drive(C,2.3*sd,0,-3.95,.6)
    gn=len(C.P)
    # forward flight deck: two decks (one flipped beneath the other), launching through the bow bay doors
    for z in (4.2,1.2):
        C.add('hangar_largeB',(0,0,z),0,1.15)
        C.add('hangar_largeB',(0,0,z),0,1.15,True)
    # main hull aft of the deck: a broad double spine, roofed, over a keel
    for k in range(6):
        z=-.6-k*1.0
        for x in (-.55,.55):
            C.add('corridor_detailed' if k%2 else 'corridor',(x,-.55,z),0,1.05)
            C.add('corridor_roof',(x,.5,z),0,1.05)
        C.add('corridor',(0,-1.55,z),0,1.05)
    # dorsal ridge from the deck back to the tower
    for z in (-.4,-1.1):C.add('machine_generatorLarge',(0,.72,z),0,.95)
    for z in (-3.4,-4.5):C.add('machine_generatorLarge',(0,.72,z),0,.95)
    # recovery bay aft under the drives: a hangar door facing astern
    C.add('hangar_smallA',(0,-1.55,-5.4),H,.95)
    # twin side launch pods on struts: a bay door at the front, windowed hull behind
    for sd in (-1,1):
        x=2.3*sd
        C.add('hangar_smallA',(x,-.5,2.3),0,1.0)
        for k in range(4):C.add('corridor_window' if k==1 else 'corridor',(x,-.5,.8-k*1.0),0,1.0)
        C.add('corridor_end',(x,-.5,-3.45),H,1.0)
        for z in (1.6,-.8,-2.6):C.add('pipe_straight',(1.4*sd,-.25,z),H/2,.85)
        for z in (1.0,-1.9):C.add('turret_single',(x,.55,z),0,.8)
    # point defence on the spine, fore and aft
    C.add('turret_single',(0,1.15,2.6),0,.8);C.add('turret_single',(0,1.25,-4.0),0,.8)
    # command tower: two decks, the bridge dome, sensor mast and dish
    C.add('structure_closed',(0,.74,-2.25),0,1.0);C.add('structure_detailed',(0,1.74,-2.25),0,.85)
    C.add('hangar_roundGlass',(0,2.47,-2.25),H,.42)
    C.add('machine_wireless',(0,3.05,-2.5),0,.7);C.add('satelliteDish_large',(0,3.0,-1.85),0,.8)
    M=C.model();M['glow_n']=gn;return M
def build_escort():
    C=Comp()
    # drives first (only these may light as engines): one main, two auxiliaries
    drive(C,0,.0,-3.4,.85);drive(C,.72,-.15,-3.2,.5);drive(C,-.72,-.15,-3.2,.5)
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
    # small bridge aft and a sensor dish
    C.add('hangar_roundGlass',(0,.75,-1.8),H,.38);C.add('satelliteDish',(0,1.2,-1.3),0,.7)
    # one ventral bay for its assault ship
    C.add('hangar_smallA',(0,-.5,-.6),H,.75,True)
    M=C.model();M['glow_n']=gn;return M
