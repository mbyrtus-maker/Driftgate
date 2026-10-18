# Brood hulls for the model pack: grown, not built. Segmented chitin bodies with overlapping carapace plates, bone spines,
# mandibles and scythes, flesh undersides and membranes, eye clusters, glowing sacs and drive vents.
# Every model is nose +z, up +y, roughly 2 long; the pack normalises size. Roles map onto the Brood palette at runtime:
#   LIGHT bone · MID chitin · DARK deep chitin / seams · ACC flesh · GLASS eyes · GLOW drive vents · WIN glowing sacs
import math,numpy as np
LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN=0,1,2,3,4,5,6
class Mesh:
    def __init__(s,seed=1):s.T=[];s.R=[];s.rng=np.random.default_rng(seed)
    def tri(s,a,b,c,role,sh=1.0,ref=None,inward=False):
        t=np.array([a,b,c],dtype=float)
        if ref is not None:
            n=np.cross(t[1]-t[0],t[2]-t[0]);d=t.mean(0)-np.array(ref,float)
            if (n@d<0)!=inward:t=t[[0,2,1]]
        s.T.append(t);s.R.append((role,sh))
    def quad(s,a,b,c,d,role,sh=1.0):s.tri(a,b,c,role,sh);s.tri(a,c,d,role,sh)
    def mirror(s,fn):fn(1);fn(-1)
    # a tube along a path with (rx,ry) sections; role(i,j,n,p)->(role,shade); frames by parallel transport, 'up' seeded +y
    def tube(s,pts,rad,sides,role,cap0=True,cap1=True,noise=0.0,up=(0,1,0),twist=0.0):
        pts=np.array(pts,float);m=len(pts);rad=np.array([(r,r) if np.isscalar(r) else r for r in rad],float)
        T=np.gradient(pts,axis=0);T/=np.linalg.norm(T,axis=1,keepdims=True)+1e-12
        u=np.array(up,float);u=u-T[0]*(u@T[0]);u/=np.linalg.norm(u)+1e-12;U=[u]
        for i in range(1,m):
            v=U[-1]-T[i]*(U[-1]@T[i]);n=np.linalg.norm(v);U.append(v/n if n>1e-9 else U[-1])
        rings=[]
        for i in range(m):
            Ui=U[i];Vi=np.cross(T[i],Ui);ring=[]
            for j in range(sides):
                a=j/sides*2*math.pi+twist*i;k=1+noise*(s.rng.random()-.5)*2
                ring.append(pts[i]+(Ui*math.cos(a)*rad[i][1]+Vi*math.sin(a)*rad[i][0])*k)
            rings.append(ring)
        for i in range(m-1):
            for j in range(sides):
                a,b,c,d=rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]
                ce=(a+b+c+d)/4;n=np.cross(c-a,b-a);n/=np.linalg.norm(n)+1e-12
                r,sh=role(i,j,n,ce);ax=(pts[i]+pts[i+1])/2;s.tri(a,c,b,r,sh,ax);s.tri(a,d,c,r,sh,ax)
        if cap0 and rad[0].max()>1e-4:
            for j in range(sides):s.tri(pts[0],rings[0][j],rings[0][(j+1)%sides],*role(0,j,-T[0],pts[0]),ref=pts[0]+T[0]*.05)
        if cap1 and rad[-1].max()>1e-4:
            for j in range(sides):s.tri(pts[-1],rings[-1][(j+1)%sides],rings[-1][j],*role(m-1,j,T[-1],pts[-1]),ref=pts[-1]-T[-1]*.05)
    def blob(s,c,r,role,sub=1,squash=(1,1,1),noise=.08):
        t=(1+5**.5)/2;V=[(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),(t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
        F=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
        V=[np.array(v,float)/np.linalg.norm(v) for v in V]
        for _ in range(sub):
            cache={};NF=[]
            def mid(a,b):
                k=(min(a,b),max(a,b))
                if k not in cache:mm=V[a]+V[b];V.append(mm/np.linalg.norm(mm));cache[k]=len(V)-1
                return cache[k]
            for a,b,cc in F:ab,bc,ca=mid(a,b),mid(b,cc),mid(cc,a);NF+=[(a,ab,ca),(b,bc,ab),(cc,ca,bc),(ab,bc,ca)]
            F=NF
        P=[np.array(c)+v*r*np.array(squash)*(1+noise*(s.rng.random()-.5)) for v in V]
        for a,b,cc in F:s.tri(P[a],P[b],P[cc],role,1.0,ref=c)
    # a curved tapering spine / leg / tentacle from base along a bend; joints add knuckles
    def spine(s,base,d1,d2,length,r0,role=LIGHT,sides=5,segs=7,r1=0.0,joint=None):
        base=np.array(base,float);d1=np.array(d1,float);d1/=np.linalg.norm(d1);d2=np.array(d2,float);d2/=np.linalg.norm(d2)
        P0=base;P2=base+d2*length;P1=base+d1*length*.55;pts=[];rad=[]
        for k in range(segs+1):
            t=k/segs;pts.append((1-t)**2*P0+2*(1-t)*t*P1+t*t*P2);rr=r0*(1-t)+r1*t
            if joint and abs(t-joint)<.08:rr*=1.45
            rad.append(max(rr,1e-4))
        s.tube(pts,rad,sides,lambda i,j,n,p:(role,.92+.1*((i+j)%2)),cap0=False,cap1=r1>0)
        return P2
    def membrane(s,pts,role=ACC,sh=.9):
        # a thin fan of skin across points (both faces)
        P=[np.array(p,float) for p in pts];n=np.cross(P[1]-P[0],P[2]-P[0]);n/=np.linalg.norm(n)+1e-12;o=n*.006
        for i in range(1,len(P)-1):s.tri(P[0]+o,P[i]+o,P[i+1]+o,role,sh,ref=P[0]-n);s.tri(P[0]-o,P[i+1]-o,P[i]-o,role,sh*.85,ref=P[0]+n)
    def eyes(s,c,n,spread,r):
        c=np.array(c,float)
        for k in range(n):
            a=k/n*2*math.pi;s.blob(c+np.array([math.cos(a)*spread,math.sin(a)*spread*.6,0]),r,GLASS,sub=1,noise=0)
    def vent(s,c,r,depth=.08):
        c=np.array(c,float)
        s.tube([c+[0,0,depth],c],[r*1.15,r*.8],10,lambda i,j,n,p:(DARK,.9),cap0=False,cap1=False)
        for j in range(10):
            a=j/10*2*math.pi;b=(j+1)/10*2*math.pi;s.tri(c+[0,0,-.002],c+[math.cos(b)*r*.8,math.sin(b)*r*.8,-.002],c+[math.cos(a)*r*.8,math.sin(a)*r*.8,-.002],GLOW,1.0)
    def out(s):return np.array(s.T),[None]*len(s.T),list(s.R)

def carapace_role(segs,top=.25,bot=-.35):
    def f(i,j,n,p):
        band=(i%segs==0)
        if n[1]<bot:return(ACC,.85+.1*((i+j)%2))
        if band:return(DARK,.9)
        if n[1]>top:return(MID,1.02 if (i//segs)%2 else .94)
        return(MID,.86)
    return f
def body(M,zs,rx,ry,sides=14,segs=2,noise=.03,yoff=None,role=None):
    pts=[[0,(yoff[k] if yoff else 0),z] for k,z in enumerate(zs)]
    M.tube(pts,list(zip(rx,ry)),sides,role or carapace_role(segs),noise=noise)
def plates(M,zs,rx,ry,y0=0,n=4,lift=1.08,role=MID):
    # overlapping dorsal carapace plates: each a half-shell slightly larger than the body, staggered rearward
    for k in range(n):
        z0,z1=zs[k],zs[k+1];zm=(z0+z1)/2;RX=rx[k]*lift;RY=ry[k]*lift
        arc=[];N=9
        for j in range(N+1):
            a=math.pi*(.08+.84*j/N);arc.append((math.cos(a)*RX,math.sin(a)*RY+y0))
        for j in range(N):
            (x0,y0a),(x1,y1a)=arc[j],arc[j+1]
            A=[x0,y0a,z1];B=[x1,y1a,z1];C=[x1*.9,y1a*.9+y0*.1,z0-(z1-z0)*.25];D=[x0*.9,y0a*.9+y0*.1,z0-(z1-z0)*.25]
            sh=.98+.05*(k%2);ax=[0,y0,zm];M.tri(A,C,B,role,sh,ax);M.tri(A,D,C,role,sh,ax)
            sc=lambda p:[p[0]*.96,(p[1]-y0)*.96+y0,p[2]];M.tri(sc(A),sc(B),sc(C),DARK,.8,ax,True);M.tri(sc(A),sc(C),sc(D),DARK,.8,ax,True)

def skitter():   # interceptor: a wasp-like darter
    M=Mesh(11);zs=np.linspace(-1,1.05,13);prof=np.array([.05,.12,.17,.18,.15,.1,.11,.14,.15,.13,.1,.06,.02])
    body(M,zs,prof,prof*.85,sides=12,segs=2);plates(M,zs[5:11][::-1][::-1],prof[5:11],prof[5:11]*.85,n=5,lift=1.12)
    M.eyes([0,.06,.98],5,.05,.028)
    M.mirror(lambda s:(M.spine([.04*s,-.02,1.0],[.4*s,-.1,1],[.1*s,-.05,1],.32,.03,LIGHT,r1=.002),
                       [M.spine([.1*s,-.06,.3-i*.22],[s,-.6,.2],[s*.6,-.9,-.5],.5,.022,LIGHT,joint=.45) for i in range(3)],
                       M.membrane([np.array([.1*s,.1,.45]),np.array([.95*s,.18,-.05]),np.array([.85*s,.14,-.55]),np.array([.45*s,.1,-.4]),np.array([.12*s,.1,-.05])])))
    M.blob([0,.12,.12],.07,WIN,sub=1);M.vent([0,0,-1.0],.05)
    return M.out()
def thresher():  # striker: twin scythes and a dorsal spine row
    M=Mesh(12);zs=np.linspace(-1.05,1.15,14);prof=np.array([.06,.16,.22,.26,.28,.27,.24,.2,.22,.24,.2,.14,.08,.02])
    body(M,zs,prof,prof*.8,sides=14,segs=2);plates(M,zs[3:12],prof[3:12],prof[3:12]*.8,n=7,lift=1.1)
    M.eyes([0,.08,1.08],6,.06,.03)
    for i in range(5):M.spine([0,.2,.55-i*.3],[0,1,-.3],[0,.6,-1],.28-i*.02,.035,LIGHT)
    M.mirror(lambda s:(M.spine([.18*s,-.04,.7],[s,.2,.6],[.2*s,-.15,1],.95,.05,LIGHT,sides=6,segs=10,joint=.35),
                       M.membrane([np.array([.2*s,0,.2]),np.array([1.05*s,-.05,-.4]),np.array([.95*s,-.04,-.8]),np.array([.25*s,0,-.7])]),
                       M.spine([.2*s,0,.2],[s,0,-.4],[s,-.05,-.6],.95,.03,DARK),
                       M.blob([.2*s,-.12,.05],.07,WIN),M.vent([.1*s,0,-1.04],.05)))
    return M.out()
def carapace():  # heavy: a beetle with split elytra, crushing mandibles and sacs under the shell rim
    M=Mesh(13);zs=np.linspace(-1,1.1,14);prof=np.array([.1,.3,.42,.5,.54,.55,.54,.5,.46,.42,.36,.27,.15,.04])
    body(M,zs,prof,prof*.62,sides=16,segs=2,yoff=list(np.zeros(14)))
    def elytron(s):
        N=12;arcs=[]
        for k in range(10):
            t=k/9;z=.8-t*1.7;env=max(.25,math.sin(math.pi*(.12+.8*t))**.6);w=.6*env;h=.42*env
            arc=[]
            for j in range(N+1):
                a=math.pi/2-(math.pi/2+.25)*j/N;arc.append([s*(.02+math.cos(a)*w),math.sin(a)*h+.08,z])
            arcs.append(arc)
        for k in range(9):
            for j in range(N):
                A,B,C,D=arcs[k][j],arcs[k][j+1],arcs[k+1][j+1],arcs[k+1][j]
                sh=.95+.06*((k+j)%2);role=LIGHT if j<2 else MID;ax=[0,0,A[2]]
                M.tri(A,B,C,role,sh,ax);M.tri(A,C,D,role,sh,ax)
                sc=lambda p:[p[0]*.95,p[1]*.95,p[2]];M.tri(sc(A),sc(B),sc(C),DARK,.75,ax,True);M.tri(sc(A),sc(C),sc(D),DARK,.75,ax,True)
    M.mirror(elytron)
    M.eyes([0,.1,1.02],6,.09,.035)
    M.mirror(lambda s:(M.spine([.16*s,-.05,1.0],[.8*s,0,1],[-.3*s,-.05,1],.5,.07,LIGHT,sides=6,segs=9),
                       [M.spine([.4*s,-.12,.5-i*.38],[s,-.3,0],[s*.6,-1,-.2],.42,.04,DARK,joint=.4) for i in range(3)],
                       [M.blob([.5*s,-.08,.45-i*.35],.085,WIN) for i in range(4)],M.vent([.22*s,-.02,-.99],.09)))
    return M.out()
def sporemaw():  # bomber: a bulbous spore-carrier with a toothed maw and flank sacs
    M=Mesh(14);zs=np.linspace(-1,1.05,14);prof=np.array([.08,.3,.45,.55,.6,.62,.6,.56,.5,.45,.42,.4,.38,.36])
    body(M,zs,prof,prof*.85,sides=16,segs=2,role=carapace_role(2,top=.35,bot=-.2));plates(M,zs[2:11],prof[2:11],prof[2:11]*.85,n=8,lift=1.06)
    # maw: an inward ring of teeth and a glowing throat
    for k in range(12):
        a=k/12*2*math.pi;b=np.array([math.cos(a)*.34,math.sin(a)*.3,1.04]);M.spine(b,[-math.cos(a),-math.sin(a),.6],[-math.cos(a)*.6,-math.sin(a)*.6,.15],.22,.03,LIGHT)
    M.blob([0,0,.98],.2,WIN,sub=1,squash=(1,1,.4))
    M.mirror(lambda s:[M.blob([.52*s,-.18,.5-i*.3],.12,WIN,sub=1) for i in range(4)])
    for k in range(5):
        a=k/5*2*math.pi+.3;M.spine([math.cos(a)*.12,math.sin(a)*.12,-.95],[math.cos(a)*.4,math.sin(a)*.4,-1],[math.cos(a)*.7,math.sin(a)*.7,-.4],.75,.04,ACC,segs=9)
    M.vent([0,0,-1.0],.07)
    return M.out()
def grazer():    # miner: a rounded grazer with feeding tentacles and a grinding mouth
    M=Mesh(15);zs=np.linspace(-1,.95,13);prof=np.array([.1,.32,.45,.52,.55,.55,.53,.5,.46,.42,.38,.34,.3])
    body(M,zs,prof,prof*.78,sides=16,segs=2);plates(M,zs[2:11],prof[2:11],prof[2:11]*.78,n=8,lift=1.07)
    M.blob([0,0,.96],.24,DARK,sub=1,squash=(1,1,.35));M.blob([0,0,1.0],.14,WIN,sub=1,squash=(1,1,.4))
    for k in range(8):
        a=k/8*2*math.pi;M.spine([math.cos(a)*.26,math.sin(a)*.22,.95],[math.cos(a),math.sin(a),1.2],[math.cos(a)*.2,math.sin(a)*.2,1],.55,.035,ACC,segs=9,joint=.5)
    M.eyes([0,.32,.8],4,.08,.03)
    M.mirror(lambda s:([M.blob([.42*s,.25,.3-i*.35],.09,WIN) for i in range(3)],[M.spine([.4*s,-.2,.4-i*.4],[s,-.5,0],[s*.5,-1,-.1],.38,.035,DARK,joint=.4) for i in range(3)],M.vent([.2*s,0,-.99],.08)))
    return M.out()
def gorger():    # hauler: a long fat grub with storage sacs along its back
    M=Mesh(16);zs=np.linspace(-1.05,1.0,16);prof=np.array([.08,.28,.4,.47,.5,.52,.52,.52,.52,.51,.5,.48,.44,.38,.28,.12])
    body(M,zs,prof,prof*.82,sides=16,segs=2,role=carapace_role(2,top=.45,bot=-.25));plates(M,zs[3:13],prof[3:13],prof[3:13]*.82,n=9,lift=1.06,role=LIGHT)
    for i in range(5):
        z=.55-i*.33;M.mirror(lambda s:M.blob([.24*s,.4,z],.12,WIN,sub=1,squash=(1,.9,1.1)))
    M.mirror(lambda s:[M.spine([.4*s,-.25,.7-i*.3],[s,-.6,0],[s*.4,-1,-.2],.3,.03,DARK,joint=.45) for i in range(6)])
    M.eyes([0,.12,1.0],4,.08,.032);M.mirror(lambda s:M.spine([.12*s,-.05,1.0],[.6*s,-.2,1],[.1*s,-.2,1],.3,.04,LIGHT))
    M.mirror(lambda s:M.vent([.16*s,0,-1.04],.08))
    return M.out()
def weaver():    # constructor: a grub with a spinneret and big egg sacs (the seeds of Bloom Nodes)
    M=Mesh(17);zs=np.linspace(-1,1.05,14);prof=np.array([.1,.32,.44,.5,.53,.54,.54,.53,.5,.46,.4,.32,.2,.06])
    body(M,zs,prof,prof*.8,sides=16,segs=2);plates(M,zs[2:10],prof[2:10],prof[2:10]*.8,n=7,lift=1.07)
    for i,(x,z) in enumerate([(0,.35),(.22,.05),(-.22,.05),(0,-.25),(.18,-.5),(-.18,-.5)]):M.blob([x,.47,z],.135,WIN,sub=2,squash=(1,1.1,1))
    M.spine([0,-.1,1.0],[0,-.3,1],[0,-.2,1],.4,.06,LIGHT,sides=7);M.eyes([0,.15,.98],5,.09,.032)
    M.mirror(lambda s:([M.spine([.42*s,-.25,.6-i*.35],[s,-.5,0],[s*.5,-1,-.1],.42,.04,DARK,joint=.4) for i in range(4)],M.spine([.3*s,0,.6],[.6*s,-.1,.8],[.3*s,-.2,1],.6,.06,LIGHT,sides=6),M.vent([.2*s,0,-.99],.08)))
    return M.out()
def watcher():   # scout: a slim stalker with a great glowing eye on a stalk and long antennae
    M=Mesh(18);zs=np.linspace(-1,.9,12);prof=np.array([.03,.08,.12,.14,.14,.13,.12,.12,.12,.1,.07,.03])
    body(M,zs,prof,prof*.85,sides=10,segs=2);plates(M,zs[2:10],prof[2:10],prof[2:10]*.85,n=7,lift=1.12)
    M.spine([0,.08,.6],[0,1,.3],[0,.6,.8],.3,.03,MID,sides=6);M.blob([0,.32,.82],.13,WIN,sub=2);M.blob([0,.33,.92],.07,GLASS,sub=1,noise=0)
    M.mirror(lambda s:(M.spine([.04*s,.05,.88],[.5*s,.4,1],[.4*s,.2,1],.75,.012,LIGHT,segs=10),
                       M.spine([.08*s,0,-.3],[s,-.1,-1],[.7*s,0,-1],.85,.02,DARK,segs=8),
                       M.membrane([np.array([.08*s,.02,.2]),np.array([.75*s,.05,-.2]),np.array([.65*s,.04,-.7]),np.array([.1*s,.02,-.5])])))
    M.vent([0,0,-.99],.05)
    return M.out()
def mite():      # drone / picket: a small round mite
    M=Mesh(19);zs=np.linspace(-.8,.8,10);prof=np.array([.05,.35,.5,.56,.58,.56,.5,.4,.25,.05])
    body(M,zs,prof,prof*.7,sides=12,segs=2);plates(M,zs[1:8],prof[1:8],prof[1:8]*.7,n=6,lift=1.08)
    M.eyes([0,.15,.75],4,.1,.05)
    M.mirror(lambda s:([M.spine([.45*s,-.1,.4-i*.35],[s,-.3,.2],[s*.7,-1,0],.6,.05,DARK,joint=.45) for i in range(4)],M.spine([.15*s,-.05,.75],[.4*s,-.1,1],[0,-.1,1],.35,.05,LIGHT)))
    M.blob([0,.32,0],.12,WIN);M.vent([0,0,-.8],.08)
    return M.out()
def leviathan(): # frigate: a vast segmented leviathan with a ridge of spines, rows of sacs, a tentacled maw and tail fins
    M=Mesh(20);zs=np.linspace(-1,1.08,26);prof=np.array([.06,.14,.2,.25,.28,.3,.32,.33,.34,.35,.35,.36,.36,.36,.36,.35,.35,.34,.33,.32,.3,.28,.25,.21,.15,.07])
    body(M,zs,prof,prof*.82,sides=18,segs=2);plates(M,zs[3:23],prof[3:23],prof[3:23]*.82,n=19,lift=1.08)
    for i in range(14):M.spine([0,.28,.85-i*.12],[0,1,-.4],[0,.5,-1],.22-abs(i-6)*.01,.025,LIGHT)
    for i in range(9):
        z=.7-i*.17;M.mirror(lambda s:(M.blob([.33*s,-.05,z],.06,WIN,sub=1),M.spine([.3*s,-.2,z],[s,-.5,.1],[s*.5,-1,-.2],.28,.02,DARK,joint=.45)))
    for k in range(8):
        a=k/8*2*math.pi;M.spine([math.cos(a)*.1,math.sin(a)*.09,1.05],[math.cos(a),math.sin(a),1.3],[math.cos(a)*.3,math.sin(a)*.3,1],.35,.022,ACC,segs=9,joint=.5)
    M.blob([0,0,1.04],.08,WIN,sub=1,squash=(1,1,.5));M.eyes([0,.14,.98],6,.08,.025)
    M.mirror(lambda s:(M.membrane([np.array([.05*s,0,-.75]),np.array([.55*s,.02,-1.1]),np.array([.4*s,0,-.6]),np.array([.15*s,0,-.45])]),M.spine([.05*s,0,-.75],[s,0,-.6],[s,0,-.9],.55,.02,LIGHT)))
    M.vent([0,0,-1.0],.05);M.mirror(lambda s:M.vent([.12*s,-.02,-.95],.035))
    return M.out()
BROOD_MODELS={'b_skitter':skitter,'b_thresher':thresher,'b_carapace':carapace,'b_sporemaw':sporemaw,'b_grazer':grazer,'b_gorger':gorger,'b_weaver':weaver,'b_watcher':watcher,'b_mite':mite,'b_leviathan':leviathan}
