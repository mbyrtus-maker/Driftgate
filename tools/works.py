# Station works as free-standing structures, built from the same Kenney space-kit parts as the stations.
# Each is one "unit"; the game clusters one unit per module level beside the station and joins them with girders.
import sys,math;sys.path.insert(0,'.')
from station import Comp
H=math.pi
def _both(S,name,pos,rot,sc):
    S.add(name,pos,rot,sc);S.add(name,(pos[0],-pos[1],pos[2]),rot,sc,True)
def wk_store():
    # storage vault: a closed core with tank farms above and below and cargo racks on the flanks
    S=Comp();S.add('structure_closed',(0,-.6,0),0,1.2)
    for i in range(4):
        a=i*H/2+H/4;x,z=math.sin(a)*.62,math.cos(a)*.62
        _both(S,'machine_barrelLarge',(x,.6,z),a,1.0)
    for sx in (-1,1):S.add('barrels_rail',(sx*.95,-.18,0),H/2,1.1);S.add('barrels_rail',(sx*.95,-.18,0),H/2,1.1,True)
    S.add('platform_large',(0,.58,0),0,.85);S.add('platform_large',(0,-.58,0),0,.85,True)
    return S.model()
def wk_prod():
    # production works: a long fabrication hall with smelter stacks, a generator block aft and feed pipes
    S=Comp();S.add('hangar_largeB',(0,0,0),0,1.0);S.add('hangar_largeB',(0,0,0),0,1.0,True)
    for z in (-.7,.5):S.add('chimney_detailed',(.55,1.0,z),0,.7);S.add('chimney',(-.55,1.0,z+.1),0,.6)
    S.add('machine_generatorLarge',(0,-.35,-2.1),0,1.0);S.add('machine_generatorLarge',(0,-.35,-2.1),0,1.0,True)
    for sx in (-1,1):S.add('pipe_straight',(sx*1.3,-.3,.2),0,.7);S.add('pipe_straight',(sx*1.3,-.3,-.8),0,.7)
    S.add('machine_wireless',(0,1.05,1.0),0,.8)
    return S.model()
def wk_life():
    # habitat & life support: a glass-domed hub with three windowed spokes out to round crew pods
    S=Comp();S.add('hangar_roundGlass',(0,.2,0),0,.9);S.add('hangar_roundGlass',(0,-.2,0),0,.9,True)
    for i in range(3):
        a=i*2*H/3;d=(math.sin(a),math.cos(a))
        S.add('corridor_window',(d[0]*1.75,-.5,d[1]*1.75),a,.9)
        S.add('hangar_roundA',(d[0]*2.75,-.15,d[1]*2.75),a,.42);S.add('hangar_roundA',(d[0]*2.75,-.15,d[1]*2.75),a,.42,True)
    S.add('pipe_ringHigh',(0,1.15,0),0,.8);S.add('satelliteDish',(0,2.15,0),0,.8)
    return S.model()
def wk_def():
    # defence platform: a braced gun deck (the game mounts live turrets on its corners) with a fire-control mast
    S=Comp();S.add('platform_large',(0,0,0),0,1.5)
    for i in range(4):
        a=i*H/2+H/4;S.add('supports_low',(math.sin(a)*1.0,-.5,math.cos(a)*1.0),a,.9,True)
    S.add('structure_detailed',(0,-.05,0),0,.9);S.add('structure_closed',(0,-.95,0),0,.8)
    S.add('machine_wireless',(0,.85,0),0,.8);S.add('satelliteDish_large',(0,1.3,0),0,.9)
    for i in range(4):
        a=i*H/2;S.add('barrels',(math.sin(a)*.9,.05,math.cos(a)*.9),a,.6)
    return S.model()
def wk_armor():
    # shield & hull works: a tall emitter pylon on a generator base, ringed by conduit
    S=Comp();S.add('rocket_baseA',(0,-1.6,0),0,.9)
    y=-1.6+1.6*.9
    for k in range(3):S.add('rocket_fuelA',(0,y,0),k*.6,.75);y+=.5*.75
    S.add('rocket_sidesA',(0,y,0),0,.75);y+=.75
    S.add('machine_wireless',(0,y,0),0,.7);S.add('satelliteDish_large',(0,y+.45,0),0,1.0)
    S.add('pipe_ringHigh',(0,-1.0,0),0,1.3)
    for i in range(3):
        a=i*2*H/3;S.add('machine_barrel',(math.sin(a)*1.05,-1.2,math.cos(a)*1.05),a,.8)
    return S.model()
def wk_yard():
    # orbital shipyard: an open-topped slipway between two girder walls, keel cradles along its floor, two travelling gantries
    # overhead, a control block at the head and cargo racks on the flanks
    S=Comp();g=1.6;L=7
    for k in range(L):
        z=(-L/2+k+.5)*g
        for sx in (-1,1):
            S.add('structure',(sx*2.4,-1.6,z),0,g);S.add('structure',(sx*2.4,1.6,z),0,g)
            if k%2==0:S.add('structure_diagonal',(sx*2.4,0,z),0,g)
        if k%2==1:S.add('supports_low',(0,-1.6,z),0,1.3);S.add('platform_small',(0,-1.65,z),0,1.4)
    for k in (2,5):
        z=(-L/2+k+.5)*g
        for x in (-1.5,-.5,.5,1.5):S.add('structure',(x,3.2,z),0,1.0)
        S.add('machine_generator',(0,2.8,z),0,1.2,True)
    S.add('hangar_largeA',(0,-.3,-L/2*g-1.8),H,1.6);S.add('hangar_largeA',(0,-.3,-L/2*g-1.8),H,1.6,True)
    S.add('machine_wireless',(0,1.3,-L/2*g-1.8),0,1.1);S.add('satelliteDish_large',(0,2.0,-L/2*g-2.0),0,1.4)
    for sx in (-1,1):
        for z in (-3.6,0,3.6):S.add('barrels_rail',(sx*3.45,-1.2,z),H/2,1.1)
        S.add('machine_barrelLarge',(sx*3.4,.9,-L/2*g+.8),0,1.1)
    return S.model()
WORKS={'wk_store':(wk_store,55),'wk_prod':(wk_prod,72),'wk_life':(wk_life,64),'wk_def':(wk_def,62),'wk_armor':(wk_armor,60),'wk_yard':(wk_yard,240)}
