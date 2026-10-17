import sys;sys.path.insert(0,'.')
from station import Comp,piece
import math,numpy as np
def build_frigate():
    F=Comp();S=1.6
    # main hull: a long run of corridor sections, nose to tail along +z
    for k in range(9):
        z=-4.8+k*S*.75
        F.add('corridor_detailed' if k%3==1 else 'corridor',(0,-.8,z),0,S)
        F.add('corridor_roof',(0,.8,z),0,S)
    # armoured prow and a sensor spike
    F.add('rocket_topA',(0,0,5.55),0,S,False,math.pi/2);F.add('rocket_fuelA',(0,0,4.9),0,S,False,math.pi/2)
    # engines: three rocket bases facing aft
    for x,y,s in [(0,0,1.25),(1.35,-.35,.85),(-1.35,-.35,.85)]:
        F.add('rocket_baseA',(x,y,-5.3),0,s,False,-math.pi/2)
    # side sponsons with point-defence turrets
    for sd in (-1,1):
        for z in (-2.6,-.6,1.4):
            F.add('corridor_windowClosed',(sd*1.45,-.55,z),0,1.05)
            F.add('turret_single',(sd*1.45,.5,z),0,.9)
    # capital battery on the dorsal spine
    for z in (.6,-1.4):F.add('turret_double',(0,.98,z),0,1.25)
    # bridge tower aft, with the dish
    F.add('hangar_roundGlass',(0,.98,-3.4),math.pi,.7)
    F.add('satelliteDish_large',(0,1.95,-3.4),0,.9)
    # ventral hangar for the pickets
    F.add('hangar_smallA',(0,-.8,-1.2),math.pi,1.2,True)
    return F.model()
