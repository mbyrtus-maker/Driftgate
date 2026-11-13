# Driftgate Beyond: the Unbound's main station, Scrapheart Haven (preview, not in the model pack yet). First pass.
# A unique asteroid base, built the Unbound way: pieces of every other station jammed into or clamped onto one big rock.
#   Halcyon   a lens disc with its glass crown, spire, dish and one swept arm, rammed tilted into the crown of the rock
#   Varkesh   a triangular spire rammed into one flank, three talons clutching the rock round it, heavy turrets
#   Ostrova   crystal spires growing out of the other flank, a halo floating over them, energy bridges, a floating spire section
#   Freeport  a broken promenade ring round the base and one of its docking arms with berths and a docking head
#   Player    a shipyard gantry, a container stash, tanks and hangars cut into the rock as a Lair's are
#   Unbound   weld seams round every joint, festival lights strung between the pieces, a beacon mast, lit windows everywhere
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,box,plate,ring
from beyond_capitals import tube,main_turret
from beyond_recon import dish
from beyond_stations import Rock,rock_mouth,put,frame_y,ry,outward,truss,container,tank,floods,mast,collar,shipyard
from beyond_faction_stations import (lathe,band,zdir,crystal_at,bridge,hpd,swept_arm,talon,tri_spire,float_seg,
                                     lights_string,light_up,OFF8)
PI=math.pi
def unit(v):v=np.array(v,float);return v/np.linalg.norm(v)
def weld_ring(M,c,d,R):B=Mesh();ring(B,(0,0,0),R,.05,ACC,seg=28,sides=4,axis='y');put(M,B,c,frame_y(d))

def scrapheart():
    M=Mesh(501)
    rk=Rock((0,0,0),3.4,77,squash=(1.15,.85,1.05));rk.build(M,3)
    # ---- Halcyon: a lens disc rammed tilted into the crown
    d=unit((.3,1,.15));base=rk.surf(d,.1)
    B=Mesh()
    lathe(B,[(-.5,.1),(-.42,.6),(-.2,1.6),(-.05,2.05),(.05,2.05),(.22,1.6),(.45,.9),(.6,.35),(.65,.1)],32)
    band(B,0,2.07,32,.05);B.blob((0,.62,0),.6,GLASS,sub=2,squash=(1,.42,1),noise=0)
    tube(B,[(0,.7,0),(0,2.6,0)],[.16,.03],LIGHT,.95,8);dish(B,(0,1.6,0),.5)
    swept_arm(B,PI*.15,1.85,3.6,-.02,-.3,.35,.13,.8,7)
    put(M,B,base+d*.25,frame_y(d,(1,0,0)));weld_ring(M,base+d*.05,d,1.0)
    # ---- Varkesh: a triangular spire rammed into a flank, talons clutching the rock
    d=unit((1,-.05,-.35));base=rk.surf(d,.12)
    B=Mesh();tri_spire(B,0,2.6,1.25,1);band(B,.15,1.2,3,.1,ACC,PI/2);band(B,.9,.85,3,.07,WIN,PI/2)
    for k in range(3):
        a=PI/2+k*2*PI/3
        talon(B,a,[(1.0,.4),(2.0,.55),(2.8,.0),(3.1,-1.0),(2.9,-2.0),(2.4,-2.7)],.5,.2)
    for k in range(3):
        a=PI/2+PI/3+k*2*PI/3;u=np.array([math.cos(a),0,math.sin(a)]);T=Mesh();main_turret(T,(0,0,0),1.4);put(B,T,u*.55+[0,1.0,0],outward(a))
    put(M,B,base,frame_y(d,(0,1,0)));weld_ring(M,base+d*.1,d,1.15)
    # ---- Ostrova: crystal spires growing out of the other flank, a floating halo, energy bridges
    d=unit((-1,.35,.3));base=rk.surf(d,.05);fr=frame_y(d,(0,1,0))
    tips=[]
    for k,(ox,oz,L,w) in enumerate(((0,0,3.2,.42),(.55,.2,2.3,.3),(-.5,.35,2.6,.32),(.2,-.55,1.9,.26),(-.35,-.45,2.1,.28),(.7,-.4,1.4,.2))):
        b=base+fr@np.array([ox,-.3,oz]);dd=fr@unit((ox*.35,1,oz*.35));crystal_at(M,b,dd,L,w);tips.append(b+dd*L*.55)
    hc=base+d*2.2
    B=Mesh();ring(B,(0,0,0),1.7,.1,ACC,seg=48,sides=6,axis='y');put(M,B,hc,fr@ry(.3))
    for k in range(3):
        a=k*2*PI/3;p=hc+fr@np.array([math.cos(a)*1.6,0,math.sin(a)*1.6]);bridge(M,p,tips[k],.04)
    S=Mesh();float_seg(S,(0,0,0),-.5,.6,.32);put(M,S,base+d*3.9,fr)
    bridge(M,base+d*3.35,base+d*2.75,.05)
    # ---- Freeport: a broken promenade ring round the base and one docking arm
    y0=-1.7;R=4.9;arc=np.linspace(.5,4.3,40)
    pts=[(math.cos(a)*R,y0,math.sin(a)*R) for a in arc]
    tube(M,pts,[.32]*len(pts),LIGHT,1.0,12)
    tube(M,[(math.cos(a)*(R+.3),y0,math.sin(a)*(R+.3)) for a in arc[1:-1]],[.09]*(len(arc)-2),WIN,1.0,4,cap0=False,cap1=False)
    for a in (arc[0],arc[-1]):weld_ring(M,(math.cos(a)*R,y0,math.sin(a)*R),(-math.sin(a),0,math.cos(a)),.36)
    for a in (1.2,2.4,3.6):
        u=np.array([math.cos(a),0,math.sin(a)]);p=rk.surf(u*[1,0,1]+[0,-.45,0],.04);truss(M,p,u*(R-.3)+[0,y0,0],.3,.03)
    for k in range(16):a=arc[2]+k*(arc[-3]-arc[2])/15;M.blob((math.cos(a)*R,y0+.36,math.sin(a)*R),.08,WIN if k%2 else ACC,sub=1,noise=0)
    a=5.3;u=np.array([math.cos(a),0,math.sin(a)]);t=np.array([-math.sin(a),0,math.cos(a)])
    p0=rk.surf(u+[0,-.35,0],.06);e=u*7.4+[0,-1.2,0]
    tube(M,[p0,e],[.32,.28],LIGHT,.95,12)
    for f in (.45,.7):
        c=p0+(e-p0)*f
        for sy in (1,-1):
            B=Mesh();plate(B,[(math.cos(q)*.45,0,math.sin(q)*.45) for q in np.linspace(0,2*PI,8,endpoint=False)],.05,MID,1.0)
            ring(B,(0,.04,0),.34,.03,ACC,seg=16,sides=4,axis='y');put(M,B,c+[0,sy*.36,0],frame_y((0,sy,0)))
    lathe(M,[(-.5,.25),(-.38,.8),(.38,.8),(.5,.25)],16,c=e,alt=.05);band(M,0,.82,16,.1,WIN,c=e)
    for q in (-1,1):collar(M,e+t*q*.78,.2,t*q)
    collar(M,e+u*.78,.22,u)
    # ---- Player-base pieces: a shipyard gantry, a container stash, tanks, hangars cut into the rock
    d=unit((.35,-.6,.85));put(M,shipyard(),rk.surf(d,.04),zdir(d),.75)
    d=unit((.2,.25,1));B=Mesh()
    for x,y in ((-.32,.35),(.32,.35),(0,.75)):container(B,(x,y,0),(.5,.36,.9),MID)
    truss(B,(-.7,.1,-.5),(.7,.1,-.5),.12,.018);truss(B,(-.7,.1,.5),(.7,.1,.5),.12,.018)
    put(M,B,rk.surf(d,.03),frame_y(d,(1,0,0)))
    for d in ((-.3,-.8,-.55),(.6,-.75,-.3)):tank(M,rk.surf(d,-.1),.45)
    for d in ((.75,-.25,.75),(-.6,-.2,-.9),(.15,-.3,-1.0)):rock_mouth(M,rk,np.array(d),1.1,.55)
    # ---- Unbound marks: festival lights strung between the pieces, a beacon mast, floodlights
    top=rk.surf((.3,1,.15),.1)+unit((.3,1,.15))*2.7
    lights_string(M,top,rk.surf((1,.4,-.3),-.05),1.0,16);lights_string(M,top,rk.surf((-.8,.6,.3),-.05),1.0,16)
    lights_string(M,rk.surf((.9,-.4,.6),-.05),(math.cos(1.0)*4.9,-1.4,math.sin(1.0)*4.9),.6,12)
    p=rk.surf((-.2,1,-.6),.05);mast(M,p,2.2,.06);M.blob(tuple(p+[0,2.25,0]),.18,GLOW,sub=1,noise=0)
    floods(M,[rk.surf(d,-.05) for d in ((1,.3,.5),(-1,0,-.3),(0,-1,.3),(.4,.5,-1),(-.5,.7,.8),(.8,-.6,-.6))],.09)
    return light_up(M,300,11)
