# Approved preview models for the faction signature hulls (design, not built yet; see DESIGN_NOTES "Faction identities").
# Bombard and Vesper are model-pack builders: to use them, import these into tools/build_models.py, register
#   'bombard':('ship',lambda:aboutface(bombard())),'vesper':('ship',vesper),
# add 'bombard' to DARK_GLOW (it is turned about like the miners), and rebuild the pack.
# The Gannet is hand-built in code like the Heavy Bomber: see gannet_mesh.js (call it from shipMesh for cls 'gannet').
import math
import numpy as np
from station import Comp
from build_models import ql_model,kenney_role,comp_model,GLOW_N
def bombard():
    # Varkesh Bombard: the Heavy Miner (turned about like the miners) with twin shell cannons on its flanks
    S=Comp();S.add('craft_miner',(0,0,0),0,1)
    for x in (.75,-.75):S.add('pipe_straight',(x,.05,1.0),0,.6)
    for sx in (-1,1):
        S.add('machine_generator',(sx*1.0,.12,-.2),0,.55)              # breech on the flank, where the side barrels were
        for k in range(3):S.add('pipe_straight',(sx*1.0,.18,-.45-k*.3),0,.3)   # barrel, toward the new bow (-z before the about-face)
        S.add('pipe_ring',(sx*1.0,.16,-1.33),0,.3)                       # muzzle ring
    return comp_model(lambda:S.model())
def vesper():
    # Ostrova Vesper: the scout hull, no missile pods or swarm box, a long twin-rail gun slung under it past the nose
    P,N,R=ql_model(2);S=Comp()
    for x in (-.17,.17):
        for k in range(4):S.add('monorail_trackStraight',(x,-.42,-.6+k*1.15),0,1.15)
    for z in (.2,1.1,2.0,2.9):S.add('pipe_ring',(0,-.5,z),0,.42)
    S.add('machine_generator',(0,-.55,-.9),0,.8)                       # capacitor bank aft
    S.add('satelliteDish',(0,1.4,-1.05),math.pi,.95)
    M=S.model();GLOW_N['vesper']=len(P);return np.concatenate([np.array(P).reshape(-1,3,3),M['P']]),list(N)+list(M['N']),list(R)+[kenney_role(c) for c in M['cols']]
