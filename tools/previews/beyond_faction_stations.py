# Driftgate Beyond: the factions' stations and depots, each in its faction's design language, and the freeport
# (preview, not in the model pack yet). Up is +y.
#   Halcyon  a great lens disc with a glass crown, a spire and dish, three swept arms ending in emitter nodes, hangars in the rim
#   Varkesh  the Talon Citadel: a triangular spire up and a same-sized one down, three talons curling up and three curling down
#   Ostrova  nothing touches: a spire in floating sections, floating crystal spires, a helix of shards, three free-floating halos,
#            docking pods floating outside the halos, energy bridges linking the key pieces
#   Freeport a welcoming trade spire, upright: a lit glass atrium, promenade rings, welcome gates above and below, four docking arms from the centre,
#            two corporate towers, hanging lanterns and strings of lights
import math
import numpy as np
from beyond_hulls import Mesh,LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN,box,plate,ring
from beyond_work import crystal
from beyond_capitals import tube,mouth,bridge_varkesh,main_turret
from beyond_recon import dish
from beyond_stations import ry,frame_y,put,outward,drum,truss,tank,radiator,floods,mast,collar,market_wing,container
PI=math.pi
ZY=np.array([[1.,0,0],[0,0,1],[0,-1,0]])    # local +z to world +y

def lathe(M,prof,n=24,top=(LIGHT,1.0),side=(LIGHT,.93),bot=(MID,.88),c=(0,0,0),off=0.0,alt=0.0,caps=True,pick=None):
    # a solid of revolution with n sides from a profile [(y,r)]; faces shaded by which way they face (up, out, down)
    c=np.array(c,float);A=[off+2*PI*j/n for j in range(n)]
    R=[[c+[math.cos(a)*r,y,math.sin(a)*r] for a in A] for y,r in prof]
    for i in range(len(prof)-1):
        ax=c+[0,(prof[i][0]+prof[i+1][0])/2,0]
        for j in range(n):
            p,q,r_,s=R[i][j],R[i][(j+1)%n],R[i+1][(j+1)%n],R[i+1][j]
            nn=np.cross(r_-p,q-p);ln=np.linalg.norm(nn)
            if ln<1e-9:nn=np.cross(s-p,q-p);ln=np.linalg.norm(nn)
            if ln<1e-9:continue
            nn/=ln;cen=(p+q+r_+s)/4
            if nn@(cen-ax)<0:nn=-nn
            role,sh=pick(i,j) if pick else top if nn[1]>.45 else bot if nn[1]<-.45 else side
            sh*=1-alt*(j%2)
            M.tri(p,q,r_,role,sh,ref=ax);M.tri(p,r_,s,role,sh,ref=ax)
    if caps:
        for k,dy in ((0,-1),(-1,1)):
            y,r=prof[k]
            if r<1e-3:continue
            cc=c+[0,y,0];role,sh=top if dy>0 else bot
            for j in range(n):M.tri(cc,R[k][j],R[k][(j+1)%n],role,sh*.95,ref=cc-[0,dy,0])
def band(M,y,r,n=24,h=.06,role=WIN,off=0.0,c=(0,0,0)):
    lathe(M,[(y-h/2,r),(y+h/2,r)],n,(role,1.0),(role,1.0),(role,1.0),c,off,caps=False)
def zdir(d):
    # a rotation taking local +z to direction d
    return frame_y(d)@ZY
def crystal_at(M,base,d,length,w):
    B=Mesh();crystal(B,0,length,w,w);put(M,B,base,zdir(d))
def node(M,c,r,role=WIN):M.blob(tuple(c),r,role,sub=1,noise=0)
def bridge(M,a,b,r=.045):
    # an Ostrova energy bridge: a thin glowing beam between two floating pieces, with a bright node at each end
    a=np.array(a,float);b=np.array(b,float);tube(M,[a,b],[r,r],GLOW,1.0,5,cap0=False,cap1=False);node(M,a,r*2.2);node(M,b,r*2.2)
def hpd(M,c,s=1.0,role=MID,up=True):
    # a point-defence turret at station scale: a base, a dome, twin barrels (+z)
    c=np.array(c,float);k=1 if up else -1
    drum(M,c,c+[0,k*.08*s,0],.22*s,DARK,10);M.blob(tuple(c+[0,k*.14*s,0]),.18*s,role,sub=1,squash=(1,.7,1),noise=0)
    for sx in (1,-1):tube(M,[c+[sx*.06*s,k*.16*s,.08*s],c+[sx*.06*s,k*.16*s,.55*s]],[.025*s,.02*s],DARK,1.0,5)
def turned(M,fn,pos,a,*args):
    # build something that faces +z, then turn it to face outward along angle a
    B=Mesh();fn(B,*args);put(M,B,pos,outward(a))

# ============================================================== HALCYON
def swept_arm(M,a0,r0,r1,y0,y1,w0,h0,sweep=.9,n=9):
    pts=[];rad=[]
    for k in range(n):
        t=k/(n-1);a=a0+t*sweep;r=r0+(r1-r0)*t
        pts.append((math.cos(a)*r,y0+(y1-y0)*t*t,math.sin(a)*r));rad.append((w0*(1-t)+.1,h0*(1-t)+.05))
    M.tube(pts,rad,10,lambda i,j,n_,p:(LIGHT,.95 if j<5 else .85),cap0=False,cap1=True)
    e=np.array(pts[-1]);node(M,e,.24);ring(M,tuple(e),.27,.04,ACC,seg=16,sides=4,axis='y')
    return pts
def halcyon_station():
    M=Mesh(301)
    lathe(M,[(-1.3,.2),(-1.1,1.0),(-.55,2.7),(-.12,3.5),(.12,3.5),(.55,2.7),(.95,1.5),(1.2,.6),(1.3,.2)],36)   # the great lens
    for y in (-.05,.05):band(M,y,3.52,36,.04)
    M.blob((0,1.15,0),1.05,GLASS,sub=2,squash=(1,.42,1),noise=0)                                                # glass crown
    band(M,1.12,1.06,24,.05)
    tube(M,[(0,1.3,0),(0,3.0,0),(0,4.6,0)],[.28,.14,.04],LIGHT,.95,10)                                          # spire, dish, emitter
    dish(M,(0,2.5,0),.8);node(M,(0,3.6,0),.12);ring(M,(0,3.6,0),.32,.03,ACC,seg=16,sides=4,axis='y')
    for k in range(3):
        a0=PI/2+k*2*PI/3
        swept_arm(M,a0,3.1,6.2,-.05,-.55,.55,.2)                                                                  # three swept arms
        a=a0+PI/3;turned(M,lambda B:mouth(B,(0,0,0),1.2,.42,.45),(math.cos(a)*3.42,0,math.sin(a)*3.42),a)          # hangar in the rim
        floods(M,[(math.cos(a+s)*3.5,-.1,math.sin(a+s)*3.5) for s in (-.22,.22)],.06)
    for k in range(6):a=k*PI/3+PI/6;hpd(M,(math.cos(a)*2.05,.76,math.sin(a)*2.05),1.1)
    tube(M,[(0,-1.3,0),(0,-2.3,0)],[.32,.26],DARK,.9,10)                                                       # stem and lower pod
    lathe(M,[(-3.1,.1),(-2.85,.7),(-2.55,.95),(-2.3,.6),(-2.2,.2)],20,(LIGHT,1),(LIGHT,.92),(MID,.85))
    band(M,-2.6,.97,20,.05);node(M,(0,-3.15,0),.18,GLOW)
    return M
def halcyon_depot():
    M=Mesh(302)
    lathe(M,[(-.55,.1),(-.4,.7),(-.1,1.35),(.1,1.35),(.35,1.0),(.55,.5),(.62,.15)],28)
    for y in (-.03,.03):band(M,y,1.36,28,.03)
    M.blob((0,.55,0),.5,GLASS,sub=2,squash=(1,.45,1),noise=0)
    for a0 in (PI/2,PI/2+PI):swept_arm(M,a0,1.2,2.8,-.02,-.3,.32,.12,.8,7)
    a=0.0;turned(M,lambda B:mouth(B,(0,0,0),.75,.28,.3),(1.33,0,0),a)
    tube(M,[(0,.6,0),(0,1.6,0)],[.08,.03],LIGHT,.95,8);dish(M,(0,1.2,0),.32)
    tube(M,[(0,-.55,0),(0,-1.2,0)],[.14,.1],DARK,.9,8);lathe(M,[(-1.55,.05),(-1.4,.35),(-1.2,.4),(-1.1,.15)],16);node(M,(0,-1.58,0),.09,GLOW)
    for a in (PI/4,-3*PI/4):hpd(M,(math.cos(a)*.9,.42,math.sin(a)*.9),.7)
    return M

# ============================================================== VARKESH
def pincer_clamp(B,L=1.4,w=.7):
    # a Varkesh docking clamp: an armoured arm ending in two pincer prongs with lit tips
    from beyond_work import abox
    abox(B,(0,0,L/2),(w,w*.6,L),MID,(.9,.9))
    for sx in (1,-1):
        abox(B,(sx*w*.42,0,L+.35),(w*.28,w*.45,.7),MID,(.6,.6));node(B,(sx*w*.42,0,L+.72),.06)
    box(B,(0,0,L+.02),(w*1.05,w*.35,.12),ACC)
def talon(M,a,path,w0,t0,edge=True):
    # a great curved claw in the radial plane at angle a: path is (radius,y) from root to tip; a hex section, deep in the plane of
    # the curve and thin across it, tapering to a point; a lit amber edge along its inner curve
    u=np.array([math.cos(a),0,math.sin(a)]);side=np.array([-math.sin(a),0,math.cos(a)])
    P=[u*r+[0,y,0] for r,y in path];n=len(P);S=[]
    for k in range(n):
        T=P[min(k+1,n-1)]-P[max(k-1,0)];T/=np.linalg.norm(T);N=np.cross(side,T);N/=np.linalg.norm(N)
        f=(1-k/(n-1))**.8;w=w0*f+.02;t=t0*f+.015
        S.append([P[k]+N*w,P[k]+N*w*.45+side*t,P[k]-N*w*.45+side*t,P[k]-N*w,P[k]-N*w*.45-side*t,P[k]+N*w*.45-side*t])
    for k in range(n-1):
        for j in range(6):
            role,sh=(LIGHT,1.0) if j in (1,2) else (MID,.95) if j in (0,3) else (LIGHT,.9)
            M.tri(S[k][j],S[k][(j+1)%6],S[k+1][(j+1)%6],role,sh,ref=P[k]);M.tri(S[k][j],S[k+1][(j+1)%6],S[k+1][j],role,sh,ref=P[k])
    if edge:tube(M,[s_[3] for s_ in S[1:-1]],[.05]*(n-2),ACC,1.0,4,cap0=False,cap1=False)
    return P
def tri_spire(M,y0,h,r,sg=1):
    # one triangular Varkesh spire: a chamfered three-sided pyramid standing up (sg=1) or hanging down (sg=-1) from y0
    P=[(0,r),(.12*h,r*.94),(.45*h,r*.56),(.85*h,r*.16),(h,.03)]
    lathe(M,[(y0+sg*y,rr) for y,rr in (P if sg>0 else P)],3,(MID,1.0),(LIGHT,.97),(LIGHT,1.6),off=PI/2,alt=.0) if sg>0 else \
    lathe(M,[(y0-y,rr) for y,rr in P[::-1]],3,(MID,1.0),(LIGHT,.97),(LIGHT,1.6),off=PI/2)
UP_CLAW=[(2.7,.35),(3.9,1.0),(4.6,2.5),(4.4,4.1),(3.6,5.5),(2.4,6.5),(1.1,7.0)]
def varkesh_station():
    # the Talon Citadel: a triangular spire standing up from an armoured waist with a same-sized one hanging down, three great curved
    # talons rising from the waist corners and curling in over the top apex, three more stretching down and curling under the
    # bottom one; heavy turrets on the faces and riding the talons, hangar slots in the waist faces, pincer clamps on the lower
    # faces, lit slits, a war beacon on the top apex and a lit tip below
    M=Mesh(311);H=5.4;Rw=3.2
    tri_spire(M,0,H,Rw,1);tri_spire(M,0,H,Rw,-1)
    lathe(M,[(-.35,Rw*1.02),(-.15,Rw*1.08),(.15,Rw*1.08),(.35,Rw*1.02)],3,(MID,1.0),(LIGHT,1.0),(LIGHT,1.4),off=PI/2,caps=False)   # armoured waist
    band(M,0,Rw*1.09,3,.1,ACC,PI/2)
    for y,r in ((1.6,Rw*.78),(3.0,Rw*.47),(-1.6,Rw*.78),(-3.0,Rw*.47)):band(M,y,r+.02,3,.08,WIN,PI/2)
    for k in range(3):
        a=PI/2+k*2*PI/3
        talon(M,a,UP_CLAW,.8,.3);talon(M,a,[(r,-y) for r,y in UP_CLAW],.8,.3)                                        # talons up and down
        u=np.array([math.cos(a),0,math.sin(a)])
        for (r,y) in ((4.65,1.6),(4.65,-1.6)):B=Mesh();main_turret(B,(0,0,0),1.5);put(M,B,u*(r+.25)+[0,y+(.2 if y>0 else -.2),0],outward(a))
        a2=a+PI/3;u2=np.array([math.cos(a2),0,math.sin(a2)]);ap=Rw*.5
        turned(M,lambda B:mouth(B,(0,0,0),1.4,.5,.7),u2*(ap+.12)+[0,.0,0],a2)                                          # hangar slot in each waist face
        floods(M,[u2*(ap+.2)+np.array([-math.sin(a2),0,math.cos(a2)])*s_*.95 for s_ in (-1,1)],.07)
        B=Mesh();main_turret(B,(0,0,0),1.5);put(M,B,u2*(Rw*.5*.6)+[0,1.95,0],outward(a2))                            # turret on each upper face
        turned(M,lambda B:pincer_clamp(B,1.0,.55),u2*(Rw*.5*.62)+[0,-1.9,0],a2)                                        # clamp on each lower face
    tube(M,[(0,H-.2,0),(0,H+1.4,0)],[.06,.02],LIGHT,.9,5);node(M,(0,H+1.45,0),.12,GLOW);ring(M,(0,H+.7,0),.3,.04,ACC,seg=12,sides=4,axis='y')
    node(M,(0,-H-.05,0),.14)
    return M
def varkesh_depot():
    # the citadel in small: the two triangular spires on an armoured waist, three short talons up and three down, one hangar,
    # one clamp, a heavy turret
    M=Mesh(312);H=1.7;Rw=1.0
    tri_spire(M,0,H,Rw,1);tri_spire(M,0,H,Rw,-1)
    lathe(M,[(-.12,Rw*1.02),(-.05,Rw*1.08),(.05,Rw*1.08),(.12,Rw*1.02)],3,(MID,1.0),(LIGHT,1.0),(LIGHT,1.4),off=PI/2,caps=False)
    band(M,0,Rw*1.09,3,.05,ACC,PI/2);band(M,.6,Rw*.72,3,.04,WIN,PI/2);band(M,-.6,Rw*.72,3,.04,WIN,PI/2)
    C=[(r*.33,y*.33) for r,y in UP_CLAW]
    for k in range(3):a=PI/2+k*2*PI/3;talon(M,a,C,.3,.11);talon(M,a,[(r,-y) for r,y in C],.3,.11)
    a2=PI/2+PI/3;u2=np.array([math.cos(a2),0,math.sin(a2)]);turned(M,lambda B:mouth(B,(0,0,0),.5,.2,.25),u2*.55,a2)
    a3=a2+2*PI/3;u3=np.array([math.cos(a3),0,math.sin(a3)]);turned(M,lambda B:pincer_clamp(B,.4,.22),u3*.32+[0,-.6,0],a3)
    a4=a3+2*PI/3;u4=np.array([math.cos(a4),0,math.sin(a4)]);B=Mesh();main_turret(B,(0,0,0),.75);put(M,B,u4*.3+[0,.62,0],outward(a4))
    return M

# ============================================================== OSTROVA
OFF8=PI/8
def float_seg(M,c,y0,y1,r,glow=True):
    # one floating section of a faceted spire: an octagonal bipyramid-ended prism, with a glowing lens hovering under it
    h=y1-y0;lathe(M,[(y0,.02),(y0+h*.3,r),(y1-h*.42,r*.78),(y1,.02)],8,(LIGHT,1.0),(LIGHT,.95),(MID,.9),c=c,off=OFF8,alt=.08)
    band(M,y0+h*.45,r*.95+.01,8,h*.08,WIN,OFF8,c)
    if glow:M.blob(tuple(np.array(c,float)+[0,y0-.18,0]),r*.45,WIN,sub=1,squash=(1,.25,1),noise=0)
def tilted_ring(M,c,R,r,tilt,yaw,role=ACC,seg=64):
    B=Mesh();ring(B,(0,0,0),R,r,role,seg=seg,sides=8,axis='y')
    c_,s_=math.cos(tilt),math.sin(tilt);Rx=np.array([[1,0,0],[0,c_,-s_],[0,s_,c_]])
    put(M,B,c,ry(yaw)@Rx)
    return ry(yaw)@Rx
def ostrova_station():
    # nothing touches: a main spire in four floating faceted sections with glowing lenses in the gaps and a crown shard, six great
    # crystal spires floating in a ring round it, a helix of crystal shards, three halos floating free (one thrown well off kilter),
    # an inverted crystal cluster below, docking pods floating outside the halos as separate faceted boxes, and energy bridges
    # linking the key pieces: the spire sections, the spires to the core, the halos to the core, the pods to the halos
    M=Mesh(321);O=(0,0,0)
    SEG=((-1.6,.2,1.15),(.55,2.5,1.0),(2.85,4.5,.72),(4.85,6.2,.45))
    for y0,y1,r in SEG:float_seg(M,O,y0,y1,r)
    for (a0,b0,_),(a1,b1,_) in zip(SEG,SEG[1:]):bridge(M,(0,b0+.02,0),(0,a1-.02,0),.06)
    crystal_at(M,(0,6.3,0),(0,1,0),1.6,.22)
    for k in range(6):
        a=k*PI/3+PI/6;L=(3.4,5.0,2.8,4.6,3.1,5.4)[k];yb=(-1.2,-.4,-.9,-.2,-1.0,-.6)[k];lean=.14+.06*(k%2)
        d=np.array([math.cos(a)*lean,1,math.sin(a)*lean]);b=np.array([math.cos(a)*2.5,yb,math.sin(a)*2.5]);crystal_at(M,b,d,L,.42+.05*(k%3))
        bridge(M,b+d/np.linalg.norm(d)*L*.3,(math.cos(a)*1.05,b[1]+L*.3,math.sin(a)*1.05))                          # spire to core
    for k in range(16):
        t=k/15;a=t*3.2*PI;r=3.9-2.1*t;y=-1.4+7.0*t
        d=np.array([-math.sin(a),.9,math.cos(a)]);crystal_at(M,(math.cos(a)*r,y,math.sin(a)*r),d,.65-.25*t,.13-.04*t)
    RINGS=((4.8,.2,0.0,.9,4,.2),(5.6,-.14,PI/3,1.6,6,.12),(6.3,.62,2*PI/3+.3,.3,5,.14))
    rm=[]
    for (R,tilt,yaw,y,n,th) in RINGS:
        Rm=tilted_ring(M,(0,y,0),R,th,tilt,yaw);rm.append((R,Rm,y))
        for k in range(n):
            a=k*2*PI/n;p=Rm@np.array([math.cos(a)*R,0,math.sin(a)*R])+[0,y,0]
            if n==4:hpd(M,p+Rm@np.array([0,.2,0]),1.2,ACC)
            a2=a+PI/n;q=Rm@np.array([math.cos(a2)*R,0,math.sin(a2)*R])+[0,y,0];t_=Rm@np.array([-math.sin(a2),0,math.cos(a2)])
            crystal_at(M,q-t_*.6,t_,1.2,.28 if n==4 else .2)
        for k in range(3):                                                                                        # halo to core
            a=k*2*PI/3+yaw*.5;p=Rm@np.array([math.cos(a)*(R-.15),0,math.sin(a)*(R-.15)])+[0,y,0]
            q=np.array([p[0],0,p[2]]);q=q/np.linalg.norm(q)*1.15+[0,p[1],0];bridge(M,p,q,.035)
    for k in range(6):
        a=k*PI/3;d=np.array([math.cos(a)*.35,-1,math.sin(a)*.35]);crystal_at(M,(math.cos(a)*.45,-2.5,math.sin(a)*.45),d,1.2+.6*(k%2),.24)
    crystal_at(M,(0,-2.4,0),(0,-1,0),2.6,.32);bridge(M,(0,-1.62,0),(0,-2.35,0),.06)
    for k in range(4):                                                                                            # docking pods outside the halos
        a=k*PI/2+PI/4;u=np.array([math.cos(a),0,math.sin(a)]);e=u*7.6+[0,-.3+.5*(k%2),0]
        B=Mesh();box(B,(0,0,0),(1.0,.62,1.3),LIGHT,(.8,.8));box(B,(0,0,.0),(1.04,.1,1.2),WIN);box(B,(0,0,.68),(.55,.32,.08),GLOW)
        put(M,B,e,outward(a+PI))
        R,Rm,y=rm[0];p=None;best=1e9
        for kk in range(48):
            aa=kk*2*PI/48;q=Rm@np.array([math.cos(aa)*R,0,math.sin(aa)*R])+[0,y,0];dd=np.linalg.norm(q-e)
            if dd<best:best=dd;p=q
        bridge(M,e-u*.75,p+(e-p)/np.linalg.norm(e-p)*.25,.04)
    return M
def ostrova_depot():
    # floating parts in small: a two-section faceted pylon with an energy bridge across the gap, three crystal pillars floating
    # round it, a ring floating round its middle, a docking pod floating outside the ring, energy bridges to each piece
    M=Mesh(322);O=(0,0,0)
    float_seg(M,O,-1.2,.3,.62,False);float_seg(M,O,.6,1.5,.42);bridge(M,(0,.32,0),(0,.58,0),.05)
    for k in range(3):
        a=PI/2+k*2*PI/3;crystal_at(M,(math.cos(a)*1.3,-.9,math.sin(a)*1.3),(0,1,0),2.4,.26)
        bridge(M,(math.cos(a)*1.15,0,math.sin(a)*1.15),(math.cos(a)*.66,0,math.sin(a)*.66),.035)
    tilted_ring(M,(0,-.05,0),1.75,.08,.1,PI/5)
    crystal_at(M,(0,1.6,0),(0,1,0),.9,.13)
    for k in range(3):a=k*2*PI/3+PI/3;crystal_at(M,(math.cos(a)*.2,-1.45,math.sin(a)*.2),(math.cos(a)*.4,-1,math.sin(a)*.4),.6,.12)
    a=-PI/6;u=np.array([math.cos(a),0,math.sin(a)]);e=u*2.7+[0,-.35,0]
    B=Mesh();box(B,(0,0,0),(.5,.32,.65),LIGHT,(.8,.8));box(B,(0,0,0),(.52,.05,.6),WIN);box(B,(0,0,.34),(.28,.16,.05),GLOW);put(M,B,e,outward(a+PI))
    bridge(M,e-u*.37,u*1.82+[0,-.1,0],.03)
    return M

# ============================================================== FREEPORT
YZ=ZY.T    # local +y to world +z
def lights_string(M,a,b,sag=.6,n=12):
    # a string of festival lights hanging between two points, alternating warm white and amber
    a=np.array(a,float);b=np.array(b,float)
    pts=[a+(b-a)*t-np.array([0,sag*4*t*(1-t),0]) for t in np.linspace(0,1,n)]
    tube(M,pts,[.015]*n,DARK,.9,4,cap0=False,cap1=False)
    for k,p in enumerate(pts[1:-1]):M.blob(tuple(p),.07,WIN if k%2 else ACC,sub=1,noise=0)
FREEPORT_V={'mw':dict(arms=4,phase=PI/4,tilt=0.0,ring=False,mast=False),          # Mirrorwater: the approved design
            'cw':dict(arms=3,phase=PI/6,tilt=0.0,ring=True,mast=False),           # Coldwater Drift: three longer arms, a lit ring round its waist
            'ew':dict(arms=4,phase=0.0,tilt=-.26,ring=False,mast=True)}           # Ember Wake: arms swept down like a crown, a beacon mast on top
def freeport(v='mw'):
    # variants (3 Nov 2026): the three freeports share the design, each with one or two touches of its own (FREEPORT_V)
    V=FREEPORT_V[v]
    # a welcoming trade spire, standing upright: a smooth capsule spine with a lit glass atrium (the bazaar) at its heart, two
    # promenade rings round it with lit window stripes, lantern lights and billboards, welcome gates above and below ringed with lights,
    # four long docking arms reaching out from the centre lined with berths and ending in docking heads, two corporate towers standing on the upper promenade (one per corporation, unlike
    # each other), lanterns hanging under the atrium, strings of festival lights from the towers to the spine
    M=Mesh(331)
    lathe(M,[(-6.6,.05),(-6.4,.6),(-6.0,.85),(6.0,.85),(6.4,.6),(6.6,.05)],18,(LIGHT,1.0),(LIGHT,.95),(MID,.9))      # capsule spine
    for y in (-5.2,-1.9,1.9,5.2):band(M,y,.87,18,.12,ACC)
    prof=[(math.sin(t)*2.4,max(math.cos(t)*2.4,.03)) for t in np.linspace(-PI/2,PI/2,15)]                          # glass atrium
    lathe(M,prof,24,pick=lambda i,j:(WIN,1.0) if i in (3,5,7,9,11) else (GLASS,1.0))
    for k in range(6):B=Mesh();ring(B,(0,0,0),2.42,.05,LIGHT,seg=40,sides=4,axis='z');put(M,B,(0,0,0),ry(k*PI/6))   # ribs
    ring(M,(0,0,0),2.45,.09,ACC,seg=48,sides=5,axis='y')
    for y in (-3.7,3.7):                                                                                          # promenade rings
        ring(M,(0,y,0),3.6,.42,LIGHT,seg=64,sides=12,axis='y');ring(M,(0,y,0),4.02,.13,WIN,seg=64,sides=4,axis='y')
        for a in np.linspace(0,2*PI,4,endpoint=False)+PI/4:
            tube(M,[(math.cos(a)*.85,y,math.sin(a)*.85),(math.cos(a)*3.2,y,math.sin(a)*3.2)],[.1,.1],LIGHT,.95,8);node(M,(math.cos(a)*2.0,y,math.sin(a)*2.0),.13)
        for k in range(24):a=k*PI/12;M.blob((math.cos(a)*3.6,y+.46,math.sin(a)*3.6),.07,WIN if k%2 else ACC,sub=1,noise=0)
        for a in (PI/2,PI/2+PI):                                                                                   # billboards on the rim
            u=np.array([math.cos(a),0,math.sin(a)]);t=np.array([-math.sin(a),0,math.cos(a)]);c=u*4.15+[0,y,0]
            plate(M,[c-t*1.0-[0,.4,0],c+t*1.0-[0,.4,0],c+t*1.0+[0,.4,0],c-t*1.0+[0,.4,0]],.08,ACC,1.0)
            c2=c+u*.06;plate(M,[c2-t*.85-[0,.3,0],c2+t*.85-[0,.3,0],c2+t*.85+[0,.3,0],c2-t*.85+[0,.3,0]],.01,WIN,1.0)
    for y,sg in ((-6.6,-1),(6.6,1)):                                                                               # welcome gates above and below
        yg=y+sg*1.6;ring(M,(0,yg,0),2.8,.16,ACC,seg=48,sides=6,axis='y')
        for k in range(16):a=k*PI/8;M.blob((math.cos(a)*2.8,yg+sg*.18,math.sin(a)*2.8),.09,WIN if k%2 else GLOW,sub=1,noise=0)
        for a in (PI/2,PI/2+2*PI/3,PI/2+4*PI/3):tube(M,[(math.cos(a)*.5,y,math.sin(a)*.5),(math.cos(a)*2.7,yg,math.sin(a)*2.7)],[.06,.06],LIGHT,.9,5)
        node(M,(0,yg,0),.22,GLOW)
    na=V['arms'];L8=8.0 if na==4 else 8.8
    for k in range(na):                                                                                           # docking arms from the centre
        a=k*2*PI/na+V['phase'];tl=V['tilt'];u=np.array([math.cos(a)*math.cos(tl),math.sin(tl),math.sin(a)*math.cos(tl)]);t=np.array([-math.sin(a),0,math.cos(a)])
        tube(M,[u*2.2,u*L8],[.38,.32],LIGHT,.95,12);B=Mesh();ring(B,(0,0,0),.39,.06,ACC,seg=16,sides=4,axis='z')
        for d in (3.2,5.4,7.6):put(M,B,u*d,zdir(u))
        tube(M,[u*2.3+[0,.36,0],u*(L8-.1)+[0,.36,0]],[.035,.035],WIN,1.0,4,cap0=False,cap1=False)                       # lit stripe along the top
        for d in ((3.9,5.6,7.3) if na==4 else (3.9,5.5,7.1,8.3)):                                                 # berths along each arm, above and below
            for sy in (1,-1):
                c=u*d+[0,sy*.42,0];B=Mesh();plate(B,[(math.cos(q)*.5,0,math.sin(q)*.5) for q in np.linspace(0,2*PI,8,endpoint=False)],.05,MID,1.0)
                ring(B,(0,.04,0),.38,.03,ACC,seg=16,sides=4,axis='y');node(B,(0,.06,0),.06);put(M,B,c,frame_y((0,sy,0)))
        e=u*L8;lathe(M,[(-.6,.3),(-.45,.95),(.45,.95),(.6,.3)],16,c=e,alt=.05)                                   # docking head with four collars
        band(M,0,.97,16,.12,WIN,c=e)
        for q in (-1,1):collar(M,e+t*q*.9,.24,t*q)
        collar(M,e+u*.9,.26,u);floods(M,[e+[0,.65,0],e-[0,.65,0]],.07)
    if V['ring']:                                                                                                 # Coldwater: a lit ring round the waist on three spokes
        ring(M,(0,0,0),5.6,.16,LIGHT,seg=72,sides=8,axis='y');ring(M,(0,0,0),5.6,.06,WIN,seg=72,sides=4,axis='y')
        for k in range(3):a=k*2*PI/3+PI/2;tube(M,[(math.cos(a)*2.45,0,math.sin(a)*2.45),(math.cos(a)*5.5,0,math.sin(a)*5.5)],[.07,.07],LIGHT,.95,6)
    if V['mast']:                                                                                                 # Ember Wake: a beacon mast above the upper gate
        tube(M,[(0,8.2,0),(0,8.95,0)],[.12,.06],LIGHT,.95,8);node(M,(0,9.04,0),.15,GLOW)
        for y in (8.45,8.75):ring(M,(0,y,0),.26,.04,ACC,seg=16,sides=4,axis='y')
    for a,lit in ((0.0,True),(PI,False)):                                                                          # two corporate towers on the upper promenade
        b=np.array([math.cos(a)*3.6,3.95,math.sin(a)*3.6])
        if lit:
            lathe(M,[(0,.55),(1.6,.48),(3.4,.36),(4.4,.2),(5.0,.02)],12,c=b,alt=.04)
            for y in (1.0,2.0,3.0):band(M,y,.5-.05*y+.02,12,.12,WIN,c=b)
            ring(M,tuple(b+[0,3.9,0]),.75,.06,ACC,seg=24,sides=4,axis='y');node(M,b+[0,5.05,0],.1)
            plate(M,[b+[.55,2.2,-.7],b+[.55,2.2,.7],b+[.55,2.9,.7],b+[.55,2.9,-.7]],.06,ACC,1.0)
            top=b+[0,5.0,0]
        else:
            lathe(M,[(0,.6),(1.4,.6),(1.4,.48),(2.6,.48),(2.6,.36),(3.6,.36),(3.6,.02)],4,c=b,off=PI/4,alt=.06)
            for y in (.7,2.0,3.1):band(M,y,{.7:.61,2.0:.49,3.1:.37}[y],4,.1,WIN,PI/4,b)
            plate(M,[b+[-.1,3.7,-.9],b+[-.1,3.7,.9],b+[-.1,4.5,.9],b+[-.1,4.5,-.9]],.08,ACC,1.0);mast(M,b+[0,4.5,0],.7,.03)
            top=b+[0,4.5,0]
        lights_string(M,top,(0,6.5,0),.9,14)                                                                         # strings of lights to the spine
        lights_string(M,top,(math.cos(a+PI/2)*3.6,4.4,math.sin(a+PI/2)*3.6),.8,12)
    for (x,z) in ((-1.2,-.6),(0,.9),(1.1,-.3),(.4,-1.2),(-.7,1.1),(1.3,.9)):                                         # lanterns under the atrium
        y0=-math.sqrt(max(2.4**2-x*x-z*z,0))+.05;L=.8+.5*((x+z)%1)
        tube(M,[(x,y0,z),(x,y0-L,z)],[.012,.012],DARK,.9,4);M.blob((x,y0-L-.15,z),.16,WIN,sub=1,squash=(1,1.3,1),noise=0)
    return M

FACTION_STATIONS=[('halcyon','Halcyon Accord',halcyon_station,halcyon_depot),('varkesh','Varkesh Dominion',varkesh_station,varkesh_depot),
                  ('ostrova','Ostrova Collective',ostrova_station,ostrova_depot)]

# ============================================================== LIGHTING (applied to every station, depot and the freeport)
def light_up(M,windows=200,seed=7):
    # lit windows scattered over the hull plating (on LIGHT and MID faces big enough to carry them), sized to the model, and
    # navigation beacons in the faction colour at its outermost points
    T=np.array(M.T);V=T.reshape(-1,3);cen=(V.max(0)+V.min(0))/2;L=np.linalg.norm(V.max(0)-V.min(0));sz=L*.0065
    g=np.random.default_rng(seed);cand=[];area=[]
    for t,(role,sh) in zip(T,M.R):
        if role not in (LIGHT,MID):continue
        a=np.linalg.norm(np.cross(t[1]-t[0],t[2]-t[0]))/2
        if a>(sz*4)**2:cand.append(t);area.append(a)
    if cand:
        area=np.array(area);pick=g.choice(len(cand),size=windows,p=area/area.sum())
        for k in pick:
            t=cand[k];r1,r2=g.random(),g.random()
            if r1+r2>1:r1,r2=1-r1,1-r2
            p=t[0]+(t[1]-t[0])*r1+(t[2]-t[0])*r2;n=np.cross(t[1]-t[0],t[2]-t[0]);n/=np.linalg.norm(n)
            if n@(p-cen)<0:n=-n
            u=np.cross([0,1.,0],n)
            if np.linalg.norm(u)<.3:u=t[1]-t[0]
            u/=np.linalg.norm(u);v=np.cross(n,u);q=p+n*sz*.25;w=sz*(1.8 if g.random()<.35 else 1.0)
            A,B,C,D=q+u*w+v*sz*.5,q-u*w+v*sz*.5,q-u*w-v*sz*.5,q+u*w-v*sz*.5;role=GLOW if g.random()<.25 else WIN
            M.tri(A,B,C,role,1.0,ref=q-n);M.tri(A,C,D,role,1.0,ref=q-n)
    navs=[]
    for d in [(1,0,0),(-1,0,0),(0,0,1),(0,0,-1),(0,1,0),(0,-1,0),(1,0,1),(-1,0,1),(1,0,-1),(-1,0,-1)]:
        d=np.array(d,float);d/=np.linalg.norm(d);p=V[np.argmax((V-cen)@d)]+d*sz
        if any(np.linalg.norm(p-q)<sz*10 for q in navs):continue
        navs.append(p);M.blob(tuple(p),sz*1.3,GLOW,sub=1,noise=0)
    return M
def _lit(fn,n):
    def f(*a):return light_up(fn(*a),n)
    f.__name__=fn.__name__;return f
halcyon_station=_lit(halcyon_station,220);halcyon_depot=_lit(halcyon_depot,70)
varkesh_station=_lit(varkesh_station,220);varkesh_depot=_lit(varkesh_depot,70)
ostrova_station=_lit(ostrova_station,180);ostrova_depot=_lit(ostrova_depot,60)
freeport=_lit(freeport,320)
FACTION_STATIONS=[('halcyon','Halcyon Accord',halcyon_station,halcyon_depot),('varkesh','Varkesh Dominion',varkesh_station,varkesh_depot),
                  ('ostrova','Ostrova Collective',ostrova_station,ostrova_depot)]
