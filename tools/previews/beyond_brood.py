# Driftgate Beyond: the Brood's destroyer (preview, not in the model pack yet). First pass. Grown, not built: tools/brood.py's
# language (segmented chitin, carapace plates, bone spines, flesh, glowing sacs, membranes), nose +z, about 2 long.
# The Brood destroyer carries a MAW CANNON: no shields at all; it charges, then fires a beam out of its open maw that does
# incredible damage along its whole firing path. Everything about the model points at that maw.
import math,sys,os
import numpy as np
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from brood import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,body,plates,_arch,carapace_role,fin

def gullet():
    # a long armoured serpent whose front third is a great flared maw: a bell of chitin opening forward, ringed with teeth and four
    # huge jaw-mandibles, a throat glowing deep inside; three pairs of charging bladders swell along the neck, wired to the maw by
    # glowing veins; heavy overlapping carapace and bone arches instead of shields; fins below, tail tendrils and vents aft
    M=Mesh(41)
    zs=np.linspace(-1.0,.42,16);rx=np.array([.05,.1,.14,.17,.2,.23,.26,.28,.3,.31,.32,.32,.31,.3,.29,.29])
    body(M,list(zs),list(rx),list(rx*.8),sides=18,segs=2,noise=.02)
    plates(M,list(zs[2:15]),list(rx[2:15]),list(rx[2:15]*.8),n=12,lift=1.1)
    for z in (-.55,-.3,-.05,.2):r=float(np.interp(z,zs,rx));_arch(M,z,r,r*.8,r=.03,lift=1.22)
    # the maw: a bell of chitin flaring forward, open at the front
    mz=[.4,.55,.7,.84,.96,1.04];mr=[.29,.33,.39,.45,.5,.52]
    M.tube([[0,0,z] for z in mz],[(r,r*.86) for r in mr],20,carapace_role(1),cap0=False,cap1=False,noise=.015)
    M.tube([[0,0,z] for z in mz[::-1]],[(r*.9,r*.86*.9) for r in mr[::-1]],20,lambda i,j,n,p:(DARK,.7),cap0=False,cap1=False)   # throat lining
    M.tube([[0,0,1.04],[0,0,1.07]],[(.55,.48),(.53,.46)],20,lambda i,j,n,p:(ACC,.9),cap0=False,cap1=False)                  # fleshy lip
    for k,(z,r) in enumerate(((.5,.2),(.66,.16),(.8,.1))):M.blob([0,0,z],r,WIN if k<2 else GLOW,sub=2,squash=(1,.86,.5),noise=.04)   # the charge, deep in the throat
    for k in range(16):                                                                                       # a ring of teeth round the lip
        a=k/16*2*math.pi;c=[math.cos(a)*.5,math.sin(a)*.43,1.05]
        M.spine(c,[-math.cos(a)*.6,-math.sin(a)*.6,1],[-math.cos(a),-math.sin(a),.4],.11+.04*(k%2),.022,LIGHT,sides=5,segs=4)
    for k in range(4):                                                                                        # four great jaw-mandibles
        a=k*math.pi/2+math.pi/4;c=[math.cos(a)*.48,math.sin(a)*.41,.98]
        M.spine(c,[math.cos(a)*.5,math.sin(a)*.5,1],[-math.cos(a)*.3,-math.sin(a)*.3,1],.42,.05,LIGHT,sides=6,segs=9,joint=.5)
    # charging bladders along the neck, veined into the maw
    for z in (.22,0.0,-.22):
        r=float(np.interp(z,zs,rx))
        for s in (1,-1):
            c=np.array([s*r*.95,.05,z]);M.blob(c,.11,WIN,sub=2,squash=(1,1.05,1.3),noise=.05)
            M.tube([c+[0,0,.08],[s*.3,.04,.42],[s*.32,.02,.62]],[.016,.014,.012],5,lambda i,j,n,p:(GLOW,1.0),cap0=False,cap1=False)
    M.eyes([0,.3,.62],6,.1,.03)
    # dorsal spines down the back, fins below
    for i in range(9):M.spine([0,float(np.interp(-.75+i*.14,zs,rx))*.8+.05,-.75+i*.14],[0,1,-.4],[0,.5,-1],.18+.04*(i%2),.022,LIGHT)
    for z in (.05,-.5):M.mirror(lambda s,z=z:fin(M,[.2*s,-.18,z],s,.42,.28))
    # tail tendrils and drive vents
    for k in range(6):
        a=k/6*2*math.pi+.3;M.spine([math.cos(a)*.06,math.sin(a)*.05,-.97],[math.cos(a)*.5,math.sin(a)*.4,-1],[math.cos(a)*.7,math.sin(a)*.5,-.4],.45,.018,ACC,segs=7)
    M.vent([0,0,-1.0],.05);M.mirror(lambda s:M.vent([.08*s,-.01,-.96],.03))
    return M
