# Model checks for the pack (tools/models_idx.json + models_gz.b64), 4 Nov 2026:
#  - z-fighting: faces of different parts (or different colours) lying in the same plane, facing the same way and overlapping.
#    The game draws with a depth buffer, so these flicker; build_models.py now lifts the smaller part's face off the plane
#    (zlift below), and this check should then find none that differ in colour.
#  - islands: parts that touch nothing else (they hang in space), with their gap to the rest (model half-size = 1).
# Usage: python3 tools/mdlcheck.py [model ...]     (no names: every model in the pack)
import sys,json,base64,gzip,collections,os,numpy as np
def comps(T):
    # connected components by shared (quantised) vertices
    key=np.round(T.reshape(-1,3)*4096).astype(np.int64);_,inv=np.unique(key,axis=0,return_inverse=True);inv=inv.reshape(-1,3)
    par=list(range(inv.max()+1))
    def f(a):
        while par[a]!=a:par[a]=par[par[a]];a=par[a]
        return a
    for a,b,c in inv:
        ra,rb,rc=f(a),f(b),f(c)
        if ra!=rb:par[rb]=ra
        rc=f(c);ra=f(a)
        if ra!=rc:par[rc]=ra
    lab=np.array([f(t[0]) for t in inv]);_,lab=np.unique(lab,return_inverse=True);return lab

def clip(poly,a,b):
    # keep the part of poly left of edge a->b
    out=[];n=len(poly)
    for i in range(n):
        p,q=poly[i],poly[(i+1)%n];cp=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);cq=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0])
        if cp>=0:out.append(p)
        if (cp>=0)!=(cq>=0):t=cp/(cp-cq);out.append((p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t))
    return out
def area(P):return .5*abs(sum(P[i][0]*P[(i+1)%len(P)][1]-P[(i+1)%len(P)][0]*P[i][1] for i in range(len(P)))) if len(P)>2 else 0
def ccw(P):
    a=sum(P[i][0]*P[(i+1)%3][1]-P[(i+1)%3][0]*P[i][1] for i in range(3));return P if a>0 else P[::-1]
def overlap(t1,t2,n):
    u=np.cross(n,[1,0,0] if abs(n[0])<.9 else [0,1,0]);u/=np.linalg.norm(u);v=np.cross(n,u)
    A=ccw([(float(p@u),float(p@v)) for p in t1]);B=ccw([(float(p@u),float(p@v)) for p in t2]);P=A
    for i in range(3):
        P=clip(P,B[i],B[(i+1)%3])
        if not P:return 0
    return area(P)
def zpairs(T,L,tol=2e-3):
    n=np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]);ar=np.linalg.norm(n,axis=1)/2;n=n/(np.linalg.norm(n,axis=1)[:,None]+1e-12);d=(n*T[:,0]).sum(1)
    B=collections.defaultdict(list)
    for i in range(len(T)):
        if ar[i]<1e-6:continue
        kn=tuple(np.round(n[i]*50).astype(int))
        for kd in {int(np.floor(d[i]*200)),int(np.ceil(d[i]*200))}:B[(kn,kd)].append(i)
    hits=collections.defaultdict(float);seen=set()
    for idxs in B.values():
        if len(idxs)<2:continue
        for a in range(len(idxs)):
            i=idxs[a]
            for b in range(a+1,len(idxs)):
                j=idxs[b]
                if (i,j) in seen:continue
                seen.add((i,j))
                if n[i]@n[j]<.9995 or abs(d[i]-d[j])>tol:continue
                # same plane, same facing: z-fighting where they overlap (within one part only if exact duplicates)
                ov=overlap(T[i],T[j],n[i])
                if ov>1e-5:hits[(i,j)]+=ov
    return hits
def zlift(T,roles,shades,eps=.003):
    # lift one face of each overlapping coplanar pair (different colour) off the plane, along its own normal: the face of the
    # smaller part (by area), so a window or a glowing disc sits just proud of the wall it's painted on
    T=np.array(T,float);L=comps(T);ar=np.linalg.norm(np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]),axis=1)/2
    pa=np.bincount(L,weights=ar);moved=set()
    for (i,j),a in zpairs(T,L).items():
        if roles[i]==roles[j] and abs(shades[i]-shades[j])<.02:continue
        k=i if (pa[L[i]],i)<(pa[L[j]],j) else j
        if k in moved:continue
        n=np.cross(T[k,1]-T[k,0],T[k,2]-T[k,0]);n/=np.linalg.norm(n)+1e-12;T[k]+=n*eps;moved.add(k)
    return T,len(moved)
def seg_d(P,A,B):
    # P (m,1,3), A,B (1,k,3): distance from points to segments
    AB=B-A;t=np.clip(((P-A)*AB).sum(-1)/((AB*AB).sum(-1)+1e-18),0,1);return np.linalg.norm(P-(A+t[...,None]*AB),axis=-1)
def pt_tri(P,T):
    # exact distance from each point (m,3) to the nearest of triangles (k,3,3)
    P=P[:,None,:];a,b,c=T[None,:,0],T[None,:,1],T[None,:,2];n=np.cross(b-a,c-a);ln=np.linalg.norm(n,axis=-1,keepdims=True)+1e-18;n=n/ln
    dpl=((P-a)*n).sum(-1);Q=P-dpl[...,None]*n
    def side(u,v):return (np.cross(v-u,Q-u)*n).sum(-1)
    inside=(side(a,b)>=0)&(side(b,c)>=0)&(side(c,a)>=0)
    de=np.minimum(np.minimum(seg_d(P,a,b),seg_d(P,b,c)),seg_d(P,c,a))
    return np.where(inside,np.abs(dpl),de).min(1)
def inside_mesh(P,T):
    # parity of +x ray crossings (for closed parts)
    o=P[:,None,:];a,b,c=T[None,:,0],T[None,:,1],T[None,:,2];d=np.array([1.0,0.00013,0.00031])
    e1=b-a;e2=c-a;h=np.cross(np.broadcast_to(d,e2.shape),e2);det=(e1*h).sum(-1);ok=np.abs(det)>1e-12;f=1/np.where(ok,det,1)
    s=o-a;u=f*(s*h).sum(-1);q=np.cross(s,e1);v=f*(q*d).sum(-1);t=f*(e2*q).sum(-1)
    hit=ok&(u>=0)&(v>=0)&(u+v<=1)&(t>1e-9);return hit.sum(1)%2==1
def seg_hits(T1,T2):
    # does any edge of T1's triangles cross any triangle of T2
    E=np.concatenate([T1[:,[0,1]],T1[:,[1,2]],T1[:,[2,0]]]);E=np.unique(np.round(E,5),axis=0)
    if len(E)>1500:E=E[::len(E)//1500+1]
    o=E[:,None,0];d=(E[:,1]-E[:,0])[:,None];a,b,c=T2[None,:,0],T2[None,:,1],T2[None,:,2]
    e1=b-a;e2=c-a;h=np.cross(np.broadcast_to(d,(len(E),len(T2),3)),e2);det=(e1*h).sum(-1);ok=np.abs(det)>1e-12;f=1/np.where(ok,det,1)
    s=o-a;u=f*(s*h).sum(-1);q=np.cross(s,e1);v=f*(q*d).sum(-1);t=f*(e2*q).sum(-1)
    return bool((ok&(u>=0)&(v>=0)&(u+v<=1)&(t>=0)&(t<=1)).any())
def islands(T,L,eps=.012):
    ar0=np.linalg.norm(np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]),axis=1);T=T[ar0>1e-9];L=L[ar0>1e-9];_,L=np.unique(L,return_inverse=True)
    nc=L.max()+1;C=[T[L==c] for c in range(nc)];V=[np.unique(np.round(x.reshape(-1,3),5),axis=0) for x in C]
    ar=np.array([np.linalg.norm(np.cross(x[:,1]-x[:,0],x[:,2]-x[:,0]),axis=1).sum()/2 for x in C])
    lo=np.array([x.reshape(-1,3).min(0) for x in C]);hi=np.array([x.reshape(-1,3).max(0) for x in C])
    par=list(range(nc))
    def f(a):
        while par[a]!=a:par[a]=par[par[a]];a=par[a]
        return a
    for i in range(nc):
        cand=np.nonzero(np.all((lo[i]-eps<=hi)&(lo-eps<=hi[i]),axis=1))[0]
        for j in cand:
            if j<=i or f(i)==f(j):continue
            Vi=V[i] if len(V[i])<=600 else V[i][::len(V[i])//600+1]
            Vj=V[j] if len(V[j])<=600 else V[j][::len(V[j])//600+1]
            if pt_tri(Vi,C[j]).min()<eps or pt_tri(Vj,C[i]).min()<eps or inside_mesh(Vi[:60],C[j]).any() or inside_mesh(Vj[:60],C[i]).any() or seg_hits(C[i],C[j]) or seg_hits(C[j],C[i]):par[f(j)]=f(i)
    G={}
    for c in range(nc):G.setdefault(f(c),[]).append(c)
    groups=sorted(G.values(),key=lambda g:-ar[g].sum());tot=ar.sum();out=[]
    rest=lambda g:np.concatenate([C[c] for c in range(nc) if c not in g])
    for g in groups[1:]:
        gl=lo[g].min(0);gh=hi[g].max(0);Vg=np.concatenate([V[c] for c in g]);Vg=Vg[::max(1,len(Vg)//400)]
        R_=rest(g);Rl=R_.reshape(-1,3);m=np.all((Rl>=gl-.3)&(Rl<=gh+.3),axis=1).reshape(-1,3).any(1);R_=R_[m] if m.any() else R_
        gap=float(pt_tri(Vg,R_[:4000]).min()) if len(R_) else 9
        out.append({'gap':round(gap,3),'parts':g,'area%':round(100*ar[g].sum()/tot,2),'at':[round(float(x),2) for x in (gl+gh)/2],'size':round(float(np.linalg.norm(gh-gl)),3)})
    return out
R=os.path.dirname(os.path.abspath(__file__))
def pack_model(name,idx,blob):
    m=idx[name];o,n=m['o'],m['n'];q=np.frombuffer(blob,'<i2',n*9,o).reshape(n,3,3).astype(float)/32767
    return q,np.frombuffer(blob,np.uint8,n,o+n*18),np.frombuffer(blob,np.uint8,n,o+n*19)/100
if __name__=='__main__':
    idx=json.load(open(R+'/models_idx.json'));blob=gzip.decompress(base64.b64decode(open(R+'/models_gz.b64').read()))
    bad=0
    for k in sys.argv[1:] or list(idx):
        T,r,sh=pack_model(k,idx,blob);L=comps(T);z=zpairs(T,L,1e-3);zc=sum(a for (i,j),a in z.items() if r[i]!=r[j] or abs(sh[i]-sh[j])>=.02)
        I=[x for x in islands(T,L) if x['gap']>.02]
        if zc>1e-4 or I:
            bad+=1;print(k,'| coplanar overlap of different colours: %.4f'%zc if zc>1e-4 else '','| islands:' if I else '',' ; '.join('%d part%s at %s, gap %.3f'%(len(x['parts']),'s'[:len(x['parts'])>1],x['at'],x['gap']) for x in sorted(I,key=lambda x:-x['gap'])[:4]),flush=True)
    print(bad,'models to look at')
