# Brood hulls for the model pack: grown, not built. Segmented chitin bodies with overlapping carapace plates, bone spines,
# mandibles and scythes, flesh undersides and membranes, eye clusters, glowing sacs and drive vents.
# Every model is nose +z, up +y, roughly 2 long; the pack normalises size. Roles map onto the Brood palette at runtime:
#   LIGHT bone · MID chitin · DARK deep chitin / seams · ACC flesh · GLASS eyes · GLOW drive vents · WIN glowing sacs
import math,numpy as np
LIGHT,MID,DARK,ACC,GLASS,GLOW,WIN=0,1,2,3,4,5,6
# (11 Nov 2026, the graphics pass) what a builder records as it builds, for the pack: every drive nozzle (eng: centre of
# its lip, radius), every gun muzzle (gun), every mining head (mine) and the seat of the hull's live turret (seat: the point
# on the hull the turret stands on). out() leaves them in LAST for build_models.py; xf() moves them with the triangles.
LAST=None
def styled(style):
    # a builder whose meshes are made in one power's design language: 'halcyon' (bell nozzles, slim guns), 'varkesh'
    # (chamfered square drives, heavy guns), 'ostrova' (ring nozzles with a crystal core, lances), 'brood' (grown pores)
    def deco(fn):
        def g(*a,**k):
            old=Mesh.style;Mesh.style=style
            try:return fn(*a,**k)
            finally:Mesh.style=old
        g.__name__=getattr(fn,'__name__','builder');g.__doc__=fn.__doc__;return g
    return deco
def _circ(n,r,rot=0.0):return [(math.cos(rot+j/n*2*math.pi)*r,math.sin(rot+j/n*2*math.pi)*r) for j in range(n)]
def _csq(a,ch=.3,b=None):
    # a chamfered square (half-width a, half-height b, the corners cut by ch of a)
    b=a if b is None else b;c=ch*a
    return [(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c),(-a+c,-b),(a-c,-b)]
class Mesh:
    style='halcyon'
    def __init__(s,seed=1):s.T=[];s.R=[];s.rng=np.random.default_rng(seed);s.eng=[];s.gun=[];s.mine=[];s.seat=[];s.pd=[];s.cut=[];s.style=Mesh.style
    def xf(s,f):
        # move every triangle and every recorded point through f (an array of points -> an array of points); radii scale by k
        s.T=list(f(np.array(s.T,float).reshape(-1,3)).reshape(-1,3,3))
        for L in (s.eng,s.gun,s.mine,s.seat,s.pd):
            for e in L:e[0]=f(np.array([e[0]],float))[0]
        for e in s.cut:e[0]=f(e[0]);e[1]=f(e[1])
    def rings(s,c,secs,role,sh=1.0,inward=False,cap=None):
        # a skin through closed sections along z: secs = [(dz, [(x,y),...])], every section the same point count; faces
        # turned away from the axis (or toward it: the inside of a nozzle). cap: (index, role, shade) closes one end.
        c=np.array(c,float);S=[[c+np.array([x,y,dz]) for x,y in pts] for dz,pts in secs];n=len(S[0])
        for i in range(len(S)-1):
            a,b=S[i],S[i+1];ref=(sum(a)+sum(b))/(2*n)
            for j in range(n):
                k=(j+1)%n;s.tri(a[j],a[k],b[k],role,sh,ref=ref,inward=inward);s.tri(a[j],b[k],b[j],role,sh,ref=ref,inward=inward)
        if cap:
            i,cr,csh=cap[:3];P=S[i];m=sum(P)/n;d=np.array([0,0,1.0 if len(cap)<4 else cap[3]])
            for j in range(n):s.tri(m,P[j],P[(j+1)%n],cr,csh,ref=m-d)
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
        u=np.array(up,float);u=u-T[0]*(u@T[0])
        if np.linalg.norm(u)<1e-6:
            # a tube along the up axis: take another reference, or its rings collapse to nothing (Beyond, 3 Nov 2026)
            import os
            if os.environ.get('TUBECOUNT'):print('TUBE-COLLAPSE',tuple(np.round(pts[0],3)))
            u=np.array((1.0,0,0))-T[0]*T[0][0]
        u/=np.linalg.norm(u)+1e-12;U=[u]
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
    def vent(s,c,r,depth=.08,style=None,rec=True,frame=None):
        # (11 Nov 2026) a drive nozzle, its lip at c facing aft (-z), reaching depth forward into the hull: a shaped outer
        # shell, a lip, a dark throat that narrows forward and the glow recessed inside it. It was a flat glowing disc flush
        # in a short collar. Kept inside the old one's envelope (z from c to c+depth, radius under 1.15 r), so no model's box
        # moves. One shape per design language; the nozzle is recorded for the pack, which puts one flare on each.
        c=np.array(c,float);st=style or s.style;n0=len(s.T)
        if rec:s.eng.append([c.copy(),float(r),n0])
        c=c-np.array([0,0,.002]);d=depth+.002   # the old glow disc stood .002 behind c: the lip takes its place, so the stern's extreme is where it was
        if st=='varkesh':
            # a chamfered square drive: a frame, a deep square throat, two louvres across it
            # frame=(half-width, half-height): the nozzle's outer shell carries on a drive housing of that section
            sq=lambda k:_csq(r*k,.32);F=_csq(frame[0],.22,frame[1]) if frame else None
            if F:s.rings(c,[(d,F),(0,F)],DARK,1.15);s.rings(c,[(0,F),(0,sq(.9))],MID,.62)
            else:s.rings(c,[(d,sq(1.0)),(d*.25,sq(1.06)),(0,sq(1.12))],DARK,1.25);s.rings(c,[(0,sq(1.12)),(0,sq(.9))],MID,.62)
            s.rings(c,[(0,sq(.9)),(d*.3,sq(.74))],DARK,.5,inward=True)
            s.rings(c,[(d*.3,sq(.74)),(d*.55,sq(.62))],GLOW,.6,inward=True,cap=(1,GLOW,1.0,-1.0))
            for y in (-.3,.3):
                p=c+np.array([0,y*r,d*.16]);w=r*.82;h=r*.055;t=d*.14
                V=[p+np.array([sx*w,sy*h,sz*t]) for sx in (-1,1) for sy in (-1,1) for sz in (-1,1)]
                for q in ((0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)):
                    s.tri(V[q[0]],V[q[1]],V[q[2]],DARK,.8,ref=p);s.tri(V[q[0]],V[q[2]],V[q[3]],DARK,.8,ref=p)
        elif st=='ostrova':
            # a slender ring round a faceted crystal core that glows
            n=8
            s.rings(c,[(d,_circ(n,r*.8)),(d*.5,_circ(n,r*.98)),(0,_circ(n,r*1.1))],MID,1.0)
            s.rings(c,[(d*.34,_circ(n,r*1.13)),(d*.06,_circ(n,r*1.15))],ACC,.95)
            s.rings(c,[(0,_circ(n,r*1.1)),(0,_circ(n,r*.9))],LIGHT,.8)
            s.rings(c,[(0,_circ(n,r*.9)),(d*.55,_circ(n,r*.56))],DARK,.5,inward=True,cap=(1,GLOW,.6,-1.0))
            core=_circ(6,r*.46,.26);apex=c+np.array([0,0,d*.06]);base=[c+np.array([x,y,d*.5]) for x,y in core]
            for j in range(6):s.tri(apex,base[j],base[(j+1)%6],GLOW,1.0 if j%2 else .82,ref=c+np.array([0,0,d*.4]))
        elif st=='brood':
            # a grown pore: a puckered lip of flesh round a dark gullet
            n=9;k=[1+.16*(s.rng.random()-.5) for _ in range(n)];ring=lambda q,z=0:[(x*k[j],y*k[j]) for j,(x,y) in enumerate(_circ(n,r*q))]
            s.rings(c,[(d,ring(.85)),(d*.35,ring(1.08)),(0,ring(1.0))],ACC,.85)
            s.rings(c,[(0,ring(1.0)),(d*.2,ring(.8))],ACC,.6,inward=True)
            s.rings(c,[(d*.2,ring(.8)),(d*.55,ring(.58))],DARK,.7,inward=True,cap=(1,GLOW,1.0,-1.0))
        else:
            # a bell: a flared skirt, a rolled lip, a dark throat and a glowing chamber
            n=10
            s.rings(c,[(d,_circ(n,r*.8)),(d*.5,_circ(n,r*.9)),(d*.12,_circ(n,r*1.1)),(0,_circ(n,r*1.13))],DARK,1.3)
            s.rings(c,[(0,_circ(n,r*1.13)),(0,_circ(n,r*.93))],MID,.7)
            s.rings(c,[(0,_circ(n,r*.93)),(d*.3,_circ(n,r*.76))],DARK,.5,inward=True)
            s.rings(c,[(d*.3,_circ(n,r*.76)),(d*.55,_circ(n,r*.6))],GLOW,.6,inward=True,cap=(1,GLOW,1.0,-1.0))
        if rec:s.eng[-1].append(len(s.T))
        # the throat's opening at the lip (a little inside it) and at the glow: whatever hull face lies across it between the
        # two is opened in out(), so the throat and glow are seen through a housing's back plate or a hull's stern cap
        op={'varkesh':lambda:_csq(r*.88,.32),'ostrova':lambda:_circ(8,r*.88),'brood':lambda:_circ(9,r*.8)}.get(st,lambda:_circ(10,r*.91))()
        s.cut.append([np.array([c+np.array([x,y,-.004]) for x,y in op]),np.array([c+np.array([x,y,d*.55+.004]) for x,y in op]),(n0,len(s.T))])
    def part(s,L,p,n0,*extra):
        # record a part at p made of the triangles added since n0 (so a check can tell the part from the hull it stands on)
        L.append([np.array(p,float),*extra,(n0,len(s.T))])
    def open_nozzles(s,pid):
        # cut out of every triangle that is not part of a nozzle the piece lying across a nozzle's throat (inside its opening,
        # between its lip and its glow): a housing's back plate, a hull's stern cap or skin. Each triangle is clipped against
        # the opening's convex prism; what lies outside any face of the prism is kept, the rest dropped. pid: each
        # triangle's part number (0: hull), carried through the cut. Returns the triangles, their roles and part numbers.
        T=[np.array(t,float) for t in s.T];R=list(s.R);pid=list(pid);own=np.zeros(len(T),bool)
        for _,_,(a,b) in s.cut:own[a:b]=True
        def split(P,n,d):
            # a convex polygon P split by the plane n.x=d: (the part with n.x>d, the part with n.x<=d)
            out=[];ins=[];m=len(P);D=[float(n@q)-d for q in P]
            for i in range(m):
                a,b=P[i],P[(i+1)%m];da,db=D[i],D[(i+1)%m]
                (out if da>0 else ins).append(a)
                if (da>0)!=(db>0):q=a+(b-a)*(da/(da-db));out.append(q);ins.append(q)
            return out,ins
        for lo,hi,_ in s.cut:
            ce=lo.mean(0);n=len(lo);planes=[]
            for i in range(n):
                a,b=lo[i],lo[(i+1)%n];nn=np.cross(b-a,hi[i]-a);nn/=np.linalg.norm(nn)+1e-12
                if nn@(a-ce)<0:nn=-nn
                planes.append((nn,float(nn@a)))
            az=hi.mean(0)-ce;az/=np.linalg.norm(az)+1e-12;planes+=[(-az,float(-az@ce)),(az,float(az@hi.mean(0)))]
            blo=np.minimum(lo.min(0),hi.min(0))-1e-6;bhi=np.maximum(lo.max(0),hi.max(0))+1e-6;NT=[];NR=[];NP=[];NO=[]
            for k,t in enumerate(T):
                if own[k] or (t.max(0)<blo).any() or (t.min(0)>bhi).any():NT.append(t);NR.append(R[k]);NP.append(pid[k]);NO.append(own[k]);continue
                tn=np.cross(t[1]-t[0],t[2]-t[0]);cur=[t[0],t[1],t[2]];keep=[]
                for nn,d in planes:
                    o,cur=split(cur,nn,d)
                    if len(o)>=3:keep.append(o)
                    if len(cur)<3:break
                if len(cur)<3:NT.append(t);NR.append(R[k]);NP.append(pid[k]);NO.append(False);continue   # none of it lies across the throat
                for poly in keep:
                    for i in range(1,len(poly)-1):
                        q=np.array([poly[0],poly[i],poly[i+1]])
                        if np.linalg.norm(np.cross(q[1]-q[0],q[2]-q[0]))<1e-10:continue
                        if np.cross(q[1]-q[0],q[2]-q[0])@tn<0:q=q[[0,2,1]]
                        NT.append(q);NR.append(R[k]);NP.append(pid[k]);NO.append(False)
            T,R,pid,own=NT,NR,NP,np.array(NO,bool)
        return T,R,np.array(pid,int)
    def mound(s,c,r,sink=.07):
        # (11 Nov 2026) the seat of a Brood hull's live turret (its spitter): a low mound of flesh with a bone rim, grown out
        # of the carapace, its flat top at c where the game stands the spitter
        c=np.array(c,float);n0=len(s.T);n=9;k=[1+.14*(s.rng.random()-.5) for _ in range(n)]
        P=lambda q,dy,kk=1:[c+np.array([math.cos(j/n*2*math.pi)*q*(1+(k[j]-1)*kk),dy,math.sin(j/n*2*math.pi)*q*(1+(k[j]-1)*kk)]) for j in range(n)]
        R_=[P(r*1.35,-sink),P(r*1.12,-.02),P(r,0,0)]
        for i in range(2):
            for j in range(n):
                q=(j+1)%n;ref=c+np.array([0,-sink,0]);s.tri(R_[i][j],R_[i][q],R_[i+1][q],ACC if i==0 else LIGHT,.9,ref=ref);s.tri(R_[i][j],R_[i+1][q],R_[i+1][j],ACC if i==0 else LIGHT,.9,ref=ref)
        for j in range(n):s.tri(c,R_[2][j],R_[2][(j+1)%n],DARK,1.3,ref=c-np.array([0,1,0]))
        s.part(s.seat,c,n0)
    def seat_parts(s):
        # (11 Nov 2026) stand every point-defence turret on the hull: where the hull under a turret lies below its
        # turntable's foot (it would float), a pedestal is built from the foot down to the hull, a little into it. Measured
        # down the turret's own axis against everything that is not a turret.
        if not s.pd:return
        T=np.array(s.T,float);m=np.ones(len(T),bool)
        for e in s.pd:m[e[-1][0]:e[-1][1]]=False
        H=T[m];a,b,c3=H[:,0],H[:,1],H[:,2];e1=b-a;e2=c3-a
        for e in s.pd:
            c=np.array(e[0],float);n=np.array(e[1],float);r=float(e[2]);o=c+n*r;d=-n
            h=np.cross(d,e2);det=(e1*h).sum(1);ok=np.abs(det)>1e-12;f=1/np.where(ok,det,1);sv=o-a;u=f*(sv*h).sum(1);q=np.cross(sv,e1);v=f*(q@d);t=f*(e2*q).sum(1)
            hit=ok&(u>=-1e-9)&(v>=-1e-9)&(u+v<=1+1e-9)&(t>1e-6)
            if not hit.any():continue
            g=float(np.where(hit,t,np.inf).min())-r          # how far below the seat point the hull is
            if g<=.2*r or g>3.0*r:continue                    # the foot (.22 r deep) already reaches it, or there is no hull near
            n0=len(s.T);top=c-n*(.2*r);bot=c-n*(g+.1*r);ux=np.array([1.0,0,0]);uz=np.cross(n,ux)
            R0=[top+(ux*math.cos(j/8*2*math.pi)+uz*math.sin(j/8*2*math.pi))*r*1.14 for j in range(8)];R1=[bot+(ux*math.cos(j/8*2*math.pi)+uz*math.sin(j/8*2*math.pi))*r*1.2 for j in range(8)]
            for j in range(8):
                k=(j+1)%8;s.tri(R0[j],R0[k],R1[k],DARK,.8,ref=(top+bot)/2);s.tri(R0[j],R1[k],R1[j],DARK,.8,ref=(top+bot)/2)
            e.append((n0,len(s.T)))                           # the pedestal's triangles belong to the turret
    # (14 Nov 2026, floating parts) Mesh.AUTOSEAT: build_models.py turns this on for ships. out() then seats every part that hangs
    # clear of its hull by a hair (nacelles, pods, guns, fins, spines, eyes, plates: gap between SEAT_MIN and SEAT_MAX of the
    # model's half-size): the part moves straight toward the nearest point of the rest of the model, by the gap plus a little
    # sink, so it stands in what it joins instead of beside it. A part a builder means to keep clear (a crystal held in a ring, a
    # slug between rails) is listed in the builder's `M.keep_clear=[(point,radius)]`; gaps wider than SEAT_MAX are left for a
    # builder to fix by hand. Nothing that would grow the model's box is moved (its drawn and hit sizes depend on the box).
    AUTOSEAT=False;SEAT_MIN=.003;SEAT_MAX=.05;SEAT_SINK=.008;SEATLOG=None
    def seat_floaters(s):
        import os,sys;D=os.path.dirname(os.path.abspath(__file__))
        if D not in sys.path:sys.path.insert(0,D)
        import mdlcheck as MC
        keep_clear=getattr(s,'keep_clear',[])
        for _pass in range(3):
            T=np.array(s.T,float).reshape(-1,3,3)
            if len(T)<20:return
            lo=T.reshape(-1,3).min(0);hi=T.reshape(-1,3).max(0);c=(lo+hi)/2;half=float(max(hi-lo)/2);Tn=(T-c)/half
            L=MC.comps(Tn);ar0=np.linalg.norm(np.cross(Tn[:,1]-Tn[:,0],Tn[:,2]-Tn[:,0]),axis=1);kp=np.nonzero(ar0>1e-9)[0];_,Lk=np.unique(L[kp],return_inverse=True)
            moved=0;shifts=[]
            isl=MC.islands(Tn,L,eps=Mesh.SEAT_MIN);allp=set(p for x in isl for p in x['parts']);main=kp[~np.isin(Lk,list(allp))]
            for x in isl:
                gap=x['gap']
                if gap<=Mesh.SEAT_MIN or gap>Mesh.SEAT_MAX:continue
                ti=kp[np.isin(Lk,x['parts'])];ctr=np.array(x['at'])*half+c
                if any(np.linalg.norm(ctr-np.array(kc[0],float))<kc[1] for kc in keep_clear):continue
                if len(x['parts'])>1 and x['size']>.6:
                    # an assembly (rings with their spokes and crystals, a gun deck): moving it as one would throw it off its own axis
                    if Mesh.SEATLOG is not None:Mesh.SEATLOG.append('not seated (an assembly of %d parts, by hand): gap %.3f at %s size %.2f'%(len(x['parts']),gap,np.round(ctr,3).tolist(),x['size']))
                    continue
                R_=Tn[main]      # the hull proper: a part seats on that, not on its neighbours that hang loose beside it
                Vg=np.unique(np.round(Tn[ti].reshape(-1,3),6),axis=0);m=np.all((R_.min(1)<=Vg.max(0)+.3)&(R_.max(1)>=Vg.min(0)-.3),axis=1);R_=R_[m] if m.any() else R_
                dist=lambda P:np.min([MC.pt_tri(P,R_[k:k+2500]) for k in range(0,len(R_),2500)],axis=0)
                d=np.concatenate([dist(Vg[i:i+150]) for i in range(0,len(Vg),150)]);p=Vg[int(np.argmin(d))];gap=float(d.min())
                if gap<=Mesh.SEAT_MIN or gap>Mesh.SEAT_MAX:continue      # (measured against the hull proper: a part that hangs from another loose part is left for the next pass)
                h=1e-3;g=np.zeros(3)
                for k in range(3):
                    e=np.zeros(3);e[k]=h;g[k]=(dist((p+e)[None])[0]-dist((p-e)[None])[0])/(2*h)
                if np.linalg.norm(g)<1e-6:continue
                u=-g/np.linalg.norm(g);sh=u*(gap+Mesh.SEAT_SINK)*half;nt=T[ti]+sh;Ro=T[np.setdiff1d(np.arange(len(T)),ti)].reshape(-1,3)
                boxok=lambda q:not((np.abs(np.minimum(Ro.min(0),q.reshape(-1,3).min(0))-lo)>2e-5).any() or (np.abs(np.maximum(Ro.max(0),q.reshape(-1,3).max(0))-hi)>2e-5).any())
                how='moved'
                if not boxok(nt):
                    # the part is one of the model's extremes: stretch it toward the hull instead, near end full, far end fixed
                    sv=(T[ti]@u);s0,s1=sv.min(),sv.max();w=(sv-s0)/max(s1-s0,1e-9);nt=T[ti]+sh*w[...,None]*1.0;how='stretched'
                    if not boxok(nt):
                        if Mesh.SEATLOG is not None:Mesh.SEATLOG.append('not seated (would change the box): gap %.3f at %s'%(gap,np.round(ctr,3).tolist()))
                        continue
                ts=set(int(i) for i in ti);ok=True;upd=[]
                for Lr in (s.eng,s.gun,s.mine,s.seat,s.pd):
                    for e in Lr:
                        for rg in ([(e[2],e[3])] if Lr is s.eng else [e[3]]+([e[4]] if len(e)>4 else []) if Lr is s.pd else [e[-1]]):
                            a,b=rg;n_in=sum(1 for i in range(a,b) if i in ts)
                            if n_in==b-a and n_in:upd.append((e,False))
                for e in s.cut:
                    a,b=e[2];n_in=sum(1 for i in range(a,b) if i in ts)
                    if n_in and n_in<b-a:ok=False
                    elif n_in:upd.append((e,True))
                if not ok:
                    if Mesh.SEATLOG is not None:Mesh.SEATLOG.append('not seated (shares a recorded part with the hull): gap %.3f at %s'%(gap,np.round(ctr,3).tolist()))
                    continue
                shifts.append((ti,nt,upd,gap,ctr,how,sh));moved+=1;T[ti]=nt      # at once, so the next part's box check sees it
            if not moved:break
            for ti,nt,upd,gap,ctr,how,sh in shifts:
                for k,i in enumerate(ti):s.T[i]=nt[k]
                for e,iscut in upd:
                    e[0]=np.array(e[0],float)+sh
                    if iscut:e[1]=np.array(e[1],float)+sh
                if Mesh.SEATLOG is not None:Mesh.SEATLOG.append('seated: gap %.3f at %s (%d tris) %s %.3f'%(gap,np.round(ctr,3).tolist(),len(ti),how,float(np.linalg.norm(sh))))
    def out(s):
        # the mesh for the pack (triangles, no normals, roles), the nozzles' throats opened; LAST keeps what was recorded:
        # each part's point, and 'pid', the part number of every triangle (0: hull) so a check can tell a part from the hull
        global LAST
        if s.style=='brood' and not s.gun and len(s.T):
            # a Brood hull spits from its mouth: the point between its foremost parts (mandibles, maw), on the centreline
            V=np.array(s.T,float).reshape(-1,3);f=V[V[:,2]>V[:,2].max()-.06].mean(0);s.gun.append([np.array([0.0,f[1],V[:,2].max()]),(len(s.T),len(s.T))])
        if Mesh.AUTOSEAT and not getattr(s,'noseat',False):s.seat_floaters()
        s.seat_parts();pid=np.zeros(len(s.T),int);k=0;LAST={'eng':[],'gun':[],'mine':[],'seat':[],'pd':[]}
        for key,L in (('eng',s.eng),('gun',s.gun),('mine',s.mine),('seat',s.seat),('pd',s.pd)):
            for e in L:
                k+=1;a,b=(e[2],e[3]) if key=='eng' else (e[3] if key=='pd' else e[-1]);pid[a:b]=k
                if key=='pd' and len(e)>4:pid[e[4][0]:e[4][1]]=k
                LAST[key].append((np.array(e[0],float),e[1],k) if key in ('eng','pd') else (np.array(e[0],float),k))
        T,R=s.T,s.R
        if s.cut:T,R,pid=s.open_nozzles(pid)
        LAST['pid']=pid
        return np.array(T),[None]*len(T),list(R)

def fin(M,base,s,span,chord,drop=.55,sweep=.55):
    # a Brood fin (in place of legs): a flesh membrane swept back and down from the flank, a bone rib along its leading edge
    # and a thinner one through its middle; s is the side (+1/-1)
    A=np.array(base,float);T=A+np.array([s*span,-drop*span,-sweep*span]);B=A-np.array([0,0,chord]);C=T-np.array([0,0,chord*.35])
    M.membrane([A,T,C,B],ACC,.85)
    L=np.linalg.norm(T-A);M.spine(A,[s,-drop*.6,.1],(T-A)/L,L,.022,LIGHT,sides=5,segs=6)
    m0=(A+B)/2;m1=(T+C)/2;L2=np.linalg.norm(m1-m0);M.spine(m0,[s,-drop*.5,0],(m1-m0)/L2,L2,.012,LIGHT,sides=4,segs=5)
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
                       [fin(M,[.1*s,-.06,.3-i*.34],s,.42,.22) for i in range(2)],
                       M.membrane([np.array([.1*s,.1,.45]),np.array([.95*s,.18,-.05]),np.array([.85*s,.14,-.55]),np.array([.45*s,.1,-.4]),np.array([.12*s,.1,-.05])])))
    M.blob([0,.12,.12],.07,WIN,sub=1);M.vent([0,0,-1.0],.05)
    return M.out()
def thresher():  # striker: twin scythes and a dorsal spine row
    M=Mesh(12);zs=np.linspace(-1.05,1.15,14);prof=np.array([.06,.16,.22,.26,.28,.27,.24,.2,.22,.24,.2,.14,.08,.02])
    body(M,zs,prof,prof*.8,sides=14,segs=2);plates(M,zs[3:12],prof[3:12],prof[3:12]*.8,n=7,lift=1.1)
    M.eyes([0,.08,1.08],6,.06,.03)
    for i,z in enumerate((.55,.25,-.05,-.72)):M.spine([0,.2,z],[0,1,-.3],[0,.6,-1],.28-i*.02,.035,LIGHT)   # (11 Nov 2026) four dorsal spines, a gap left in the row for the spitter's seat
    M.mirror(lambda s:(M.spine([.18*s,-.04,.7],[s,.2,.6],[.2*s,-.15,1],.95,.05,LIGHT,sides=6,segs=10,joint=.35),
                       M.membrane([np.array([.2*s,0,.2]),np.array([1.05*s,-.05,-.4]),np.array([.95*s,-.04,-.8]),np.array([.25*s,0,-.7])]),
                       M.spine([.2*s,0,.2],[s,0,-.4],[s,-.05,-.6],.95,.03,DARK),
                       M.blob([.2*s,-.12,.05],.07,WIN),M.vent([.1*s,0,-1.04],.05)))
    M.mound([0,.262,-.42],.125)                                                   # the spitter's seat, in the gap in the dorsal spines
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
                       [fin(M,[.4*s,-.12,.45-i*.6],s,.42,.3,.45) for i in range(2)],
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
    M.mound([0,.6,-.2],.1,.09)                                                      # the spitter's seat, on the back
    return M.out()
def grazer():    # miner: a rounded grazer with feeding tentacles and a grinding mouth
    M=Mesh(15);zs=np.linspace(-1,.95,13);prof=np.array([.1,.32,.45,.52,.55,.55,.53,.5,.46,.42,.38,.34,.3])
    body(M,zs,prof,prof*.78,sides=16,segs=2);plates(M,zs[2:11],prof[2:11],prof[2:11]*.78,n=8,lift=1.07)
    M.blob([0,0,.96],.24,DARK,sub=1,squash=(1,1,.35));M.blob([0,0,1.0],.14,WIN,sub=1,squash=(1,1,.4))
    for k in range(8):
        a=k/8*2*math.pi;M.spine([math.cos(a)*.26,math.sin(a)*.22,.95],[math.cos(a),math.sin(a),1.2],[math.cos(a)*.2,math.sin(a)*.2,1],.55,.035,ACC,segs=9,joint=.5)
    M.eyes([0,.32,.8],4,.08,.03)
    M.mirror(lambda s:([M.blob([.42*s,.25,.3-i*.35],.09,WIN) for i in range(3)],[fin(M,[.4*s,-.2,.35-i*.6],s,.4,.3) for i in range(2)],M.vent([.2*s,0,-.99],.08)))
    return M.out()
def gorger():    # hauler: a long fat grub with storage sacs along its back
    M=Mesh(16);zs=np.linspace(-1.05,1.0,16);prof=np.array([.08,.28,.4,.47,.5,.52,.52,.52,.52,.51,.5,.48,.44,.38,.28,.12])
    body(M,zs,prof,prof*.82,sides=16,segs=2,role=carapace_role(2,top=.45,bot=-.25));plates(M,zs[3:13],prof[3:13],prof[3:13]*.82,n=9,lift=1.06,role=LIGHT)
    for i in range(5):
        z=.55-i*.33;M.mirror(lambda s:M.blob([.24*s,.4,z],.12,WIN,sub=1,squash=(1,.9,1.1)))
    M.mirror(lambda s:[fin(M,[.4*s,-.25,.65-i*.55],s,.36,.26) for i in range(3)])
    M.eyes([0,.12,1.0],4,.08,.032);M.mirror(lambda s:M.spine([.12*s,-.05,1.0],[.6*s,-.2,1],[.1*s,-.2,1],.3,.04,LIGHT))
    M.mirror(lambda s:M.vent([.16*s,0,-1.04],.08))
    return M.out()
def weaver():    # constructor: a grub with a spinneret and big egg sacs (the seeds of Bloom Nodes)
    M=Mesh(17);zs=np.linspace(-1,1.05,14);prof=np.array([.1,.32,.44,.5,.53,.54,.54,.53,.5,.46,.4,.32,.2,.06])
    body(M,zs,prof,prof*.8,sides=16,segs=2);plates(M,zs[2:10],prof[2:10],prof[2:10]*.8,n=7,lift=1.07)
    for i,(x,z) in enumerate([(0,.35),(.22,.05),(-.22,.05),(0,-.25),(.18,-.5),(-.18,-.5)]):M.blob([x,.47,z],.135,WIN,sub=2,squash=(1,1.1,1))
    M.spine([0,-.1,1.0],[0,-.3,1],[0,-.2,1],.4,.06,LIGHT,sides=7);M.eyes([0,.15,.98],5,.09,.032)
    M.mirror(lambda s:([fin(M,[.42*s,-.25,.55-i*.65],s,.44,.32) for i in range(2)],M.spine([.3*s,0,.6],[.6*s,-.1,.8],[.3*s,-.2,1],.6,.06,LIGHT,sides=6),M.vent([.2*s,0,-.99],.08)))
    return M.out()
def watcher():   # scout: a slim stalker with a great glowing eye on a stalk and long antennae
    M=Mesh(18);zs=np.linspace(-1,.9,12);prof=np.array([.03,.08,.12,.14,.14,.13,.12,.12,.12,.1,.07,.03])
    body(M,zs,prof,prof*.85,sides=10,segs=2);plates(M,zs[2:10],prof[2:10],prof[2:10]*.85,n=7,lift=1.12)
    M.spine([0,.08,.6],[0,1,.3],[0,.6,.8],.3,.03,MID,sides=6);M.blob([0,.32,.82],.13,WIN,sub=2);M.blob([0,.33,.92],.07,GLASS,sub=1,noise=0)
    M.mirror(lambda s:(M.spine([.04*s,.05,.88],[.5*s,.4,1],[.4*s,.2,1],.75,.012,LIGHT,segs=10),
                       M.spine([.08*s,0,-.3],[s,-.1,-1],[.7*s,0,-1],.85,.02,DARK,segs=8),
                       M.membrane([np.array([.08*s,.02,.2]),np.array([.75*s,.05,-.2]),np.array([.65*s,.04,-.7]),np.array([.1*s,.02,-.5])])))
    M.vent([0,0,-.96],.05)      # (14 Nov 2026, floating parts) z -.99 -> -.96: the lip stood .012 clear of the stern's narrow tip once its throat was cut
    return M.out()
def mite():      # drone / picket: a small round mite
    M=Mesh(19);zs=np.linspace(-.8,.8,10);prof=np.array([.05,.35,.5,.56,.58,.56,.5,.4,.25,.05])
    body(M,zs,prof,prof*.7,sides=12,segs=2);plates(M,zs[1:8],prof[1:8],prof[1:8]*.7,n=6,lift=1.08)
    M.eyes([0,.15,.75],4,.1,.05)
    M.mirror(lambda s:([fin(M,[.45*s,-.1,.35-i*.6],s,.55,.35,.45) for i in range(2)],M.spine([.15*s,-.05,.75],[.4*s,-.1,1],[0,-.1,1],.35,.05,LIGHT)))
    M.blob([0,.32,0],.12,WIN);M.vent([0,0,-.8],.08)
    return M.out()
def leviathan(): # frigate: a vast segmented leviathan with a ridge of spines, rows of sacs, a tentacled maw and tail fins
    M=Mesh(20);zs=np.linspace(-1,1.08,26);prof=np.array([.06,.14,.2,.25,.28,.3,.32,.33,.34,.35,.35,.36,.36,.36,.36,.35,.35,.34,.33,.32,.3,.28,.25,.21,.15,.07])
    body(M,zs,prof,prof*.82,sides=18,segs=2);plates(M,zs[3:23],prof[3:23],prof[3:23]*.82,n=19,lift=1.08)
    for i in range(14):M.spine([0,.28,.85-i*.12],[0,1,-.4],[0,.5,-1],.22-abs(i-6)*.01,.025,LIGHT)
    for i in range(9):
        z=.7-i*.17;M.mirror(lambda s:(M.blob([.33*s,-.05,z],.06,WIN,sub=1),fin(M,[.3*s,-.2,z],s,.3,.13) if i%2==0 else None))
    for k in range(8):
        a=k/8*2*math.pi;M.spine([math.cos(a)*.1,math.sin(a)*.09,1.05],[math.cos(a),math.sin(a),1.3],[math.cos(a)*.3,math.sin(a)*.3,1],.35,.022,ACC,segs=9,joint=.5)
    M.blob([0,0,1.04],.08,WIN,sub=1,squash=(1,1,.5));M.eyes([0,.14,.98],6,.08,.025)
    M.mirror(lambda s:(M.membrane([np.array([.05*s,0,-.75]),np.array([.55*s,.02,-1.1]),np.array([.4*s,0,-.6]),np.array([.15*s,0,-.45])]),M.spine([.05*s,0,-.75],[s,0,-.6],[s,0,-.9],.55,.02,LIGHT)))
    M.vent([0,0,-1.0],.05);M.mirror(lambda s:M.vent([.12*s,-.02,-.95],.035))
    return M.out()
def _arch(M,z,rx,ry,y0=0,r=.025,lift=1.12,role=LIGHT):
    # a bone rib arching over the back from flank to flank
    pts=[[math.cos(a)*rx*lift,math.sin(a)*ry*lift+y0,z] for a in np.linspace(-.25,math.pi+.25,11)]
    M.tube(pts,[r*(1.25 if k in(0,10) else 1) for k in range(11)],6,lambda i,j,n,p:(role,.9+.1*((i+j)%2)),cap0=True,cap1=True)
def _pore(M,c,n,r):
    # a birthing pore: a fleshy rim around a glowing throat, opening along n
    c=np.array(c,float);n=np.array(n,float);n/=np.linalg.norm(n)
    M.tube([c-n*.01,c+n*.045],[r*1.25,r*.95],10,lambda i,j,nn,p:(DARK,.85),cap0=False,cap1=False)
    M.blob(c+n*.005,r*.8,WIN,sub=1,squash=(1,1,1),noise=.05)
def hive():      # Hive Ship (the Brood carrier): a swollen brood-queen that grows its own wing
    M=Mesh(31)
    # body profile: armoured head, a ribbed waist, then the vast abdomen tapering to the tail
    zs=np.array([-1.0,-.94,-.84,-.7,-.54,-.36,-.16,.04,.22,.36,.44,.5,.56,.62,.7,.8,.9,.97,1.02])
    rx=np.array([.06,.18,.34,.46,.55,.6,.62,.6,.54,.42,.26,.15,.14,.2,.26,.27,.24,.17,.06])
    ry=rx*np.array([.7,.72,.74,.76,.78,.78,.78,.78,.76,.74,.72,.8,.85,.8,.75,.72,.7,.7,.7])
    body(M,list(zs),list(rx),list(ry),sides=20,segs=2,noise=.025)
    plates(M,list(zs[2:10]),list(rx[2:10]),list(ry[2:10]),n=7,lift=1.06)
    plates(M,list(zs[12:17]),list(rx[12:17]),list(ry[12:17]),n=4,lift=1.1,role=LIGHT)
    # the brood cage: bone arches over the abdomen, glowing brood sacs swelling between them
    for z in (-.66,-.46,-.26,-.06,.14,.32):
        k=np.interp(z,zs,rx);h=np.interp(z,zs,ry);_arch(M,z,k,h,r=.028,lift=1.16)
    for z in (-.56,-.36,-.16,.04,.23):
        k=np.interp(z,zs,rx);h=np.interp(z,zs,ry)
        for x in (-.22,0,.22):M.blob([x*k/.6,h*1.04-abs(x)*.25,z],.075+.02*(x==0),WIN,sub=1,squash=(1,.8,1.15))
    # birthing pores down both flanks, a nymph craft half-out of some of them
    def flank(s):
        for i,z in enumerate((-.6,-.4,-.2,0.,.2)):
            k=np.interp(z,zs,rx);c=[s*k*.97,-.06,z];_pore(M,c,[s,-.15,.1],.055)
            if i in (1,3):
                M.blob([s*(k+.08),-.08,z+.05],.05,MID,sub=1,squash=(.7,.5,1.6))
                M.spine([s*(k+.08),-.08,z+.12],[s*.3,0,1],[s*.2,-.1,1],.08,.012,LIGHT,sides=4,segs=4)
        # fins beneath
        for z in (-.4,.15):fin(M,[s*.3,-.28,z],s,.45,.3)
        # a membrane fin aft, framed by bone
        a=np.array([s*.48,.02,-.55]);b=np.array([s*1.0,.06,-.95]);c2=np.array([s*.9,.04,-.55]);d=np.array([s*.55,.02,-.25])
        M.membrane([a,b,c2,d]);M.spine(a,[s,.05,-.6],[s,.05,-.8],.62,.02,LIGHT,segs=6)
    M.mirror(flank)
    # head: a crown of horns, mandibles, eyes and a glowing maw
    for k,(x,h) in enumerate(((0,.34),(.12,.28),(-.12,.28))):M.spine([x,.17,.82],[x*2,1,-.3],[x*2,.4,-1],h,.035,LIGHT,sides=6)
    M.mirror(lambda s:(M.spine([.13*s,-.05,.98],[.7*s,-.1,1],[-.25*s,-.1,1],.36,.045,LIGHT,sides=6,segs=9),
                       M.spine([.2*s,-.12,.86],[s,-.5,.5],[.4*s,-.9,.6],.32,.03,DARK,joint=.5)))
    M.eyes([0,.1,.99],7,.09,.026);M.blob([0,-.03,1.0],.08,WIN,sub=1,squash=(1,.8,.5))
    # the tail: trailing tendrils around twin drive vents
    for k in range(7):
        a=k/7*2*math.pi+.2;M.spine([math.cos(a)*.1,math.sin(a)*.07,-.96],[math.cos(a)*.5,math.sin(a)*.4,-1],[math.cos(a)*.7,math.sin(a)*.5,-.5],.5,.022,ACC,segs=8)
    M.mirror(lambda s:M.vent([.06*s,0,-1.0],.045))
    return M.out()
def prowler():   # Brood escort: a lean hunter with a hammer head, twin spore-torpedo launchers, a spined sail and spitter polyps
    M=Mesh(32)
    zs=np.linspace(-1.0,.78,18);rx=np.array([.03,.07,.1,.12,.13,.14,.15,.16,.17,.18,.19,.2,.2,.19,.18,.16,.14,.12])
    body(M,list(zs),list(rx),list(rx*.82),sides=14,segs=2,noise=.02)
    plates(M,list(zs[4:17]),list(rx[4:17]),list(rx[4:17]*.82),n=12,lift=1.1)
    # hammer head: a broad flattened shield with eyes at its tips
    hz=np.array([.74,.82,.92,1.0,1.06]);hx=np.array([.16,.38,.46,.4,.12]);body(M,list(hz),list(hx),list(np.array([.1,.1,.1,.09,.05])),sides=14,segs=1)
    M.mirror(lambda s:(M.blob([.45*s,.0,.92],.05,GLASS,sub=1,noise=0),M.blob([.36*s,.03,.98],.032,GLASS,sub=1,noise=0)))
    # twin spore-torpedo launchers: bone barrels along the forward flanks, glowing mouths forward
    def launcher(s):
        x=.27*s;M.tube([[x,-.07,.18],[x,-.07,.5],[x,-.065,.82]],[.06,.075,.07],10,lambda i,j,n,p:(LIGHT if n[1]>-.3 else MID,.95),cap0=True,cap1=False)
        M.tube([[x,-.065,.82],[x,-.065,.86]],[.085,.08],10,lambda i,j,n,p:(DARK,.85),cap0=False,cap1=False);M.blob([x,-.065,.83],.052,WIN,sub=1,squash=(1,1,.5))
        M.spine([x*.6,-.02,.3],[s,0,.4],[s*.4,0,1],.3,.02,DARK,sides=4,segs=5)
    M.mirror(launcher)
    # dorsal sail: a row of spines with membrane strung between their tips
    tips=[];base=[]
    for k,(z,h) in enumerate(((.5,.22),(.36,.34),(.2,.44),(.04,.48),(-.12,.42),(-.28,.32),(-.44,.2))):
        y0=float(np.interp(z,zs,rx))*.8;b=np.array([0,y0,z]);tips.append(M.spine(b,[0,1,-.25],[0,1,-.55],h,.022,LIGHT,sides=5,segs=6));base.append(b)
    for k in range(len(tips)-1):M.membrane([base[k],tips[k],tips[k+1],base[k+1]],ACC,.85)
    # spitter polyps (point defence): three a side, each a knob with a glowing tip
    def spit(s):
        for z in (.38,.02,-.34):
            k=float(np.interp(z,zs,rx));c=np.array([s*k*.95,.04,z]);M.blob(c,.04,DARK,sub=1,squash=(1,.9,1))
            t=M.spine(c,[s,.6,0],[s,.9,.2],.12,.022,MID,sides=5,segs=4);M.blob(t,.026,WIN,sub=1)
    M.mirror(spit)
    # folded mantis forelimbs under the head, and fins beneath
    M.mirror(lambda s:(M.spine([.12*s,-.13,.62],[s*.5,-1,.6],[s*.2,-.4,1],.36,.03,LIGHT,sides=6,segs=8,joint=.45),
                       [fin(M,[.14*s,-.13,.15-i*.5],s,.32,.22) for i in range(2)]))
    # tail fins and drive vents
    M.mirror(lambda s:(M.membrane([np.array([.03*s,0,-.7]),np.array([.42*s,.08,-1.08]),np.array([.3*s,.04,-.62]),np.array([.08*s,0,-.5])]),
                       M.spine([.03*s,0,-.7],[s,.15,-.7],[s,.2,-.95],.5,.018,LIGHT,segs=6),M.vent([.05*s,0,-.98],.03)))
    M.membrane([np.array([0,.02,-.66]),np.array([0,.32,-1.02]),np.array([0,.18,-.6]),np.array([0,.06,-.48])])
    return M.out()
BROOD_MODELS={'b_skitter':skitter,'b_thresher':thresher,'b_carapace':carapace,'b_sporemaw':sporemaw,'b_grazer':grazer,'b_gorger':gorger,'b_weaver':weaver,'b_watcher':watcher,'b_mite':mite,'b_leviathan':leviathan,'b_hive':hive,'b_prowler':prowler}
BROOD_MODELS={k:styled('brood')(f) for k,f in BROOD_MODELS.items()}   # grown pores for drive vents
