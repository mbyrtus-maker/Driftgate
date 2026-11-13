# Mount checks for the ship models (11 Nov 2026, the graphics pass): is every attached part where it should be, and joined?
# Reads each model straight from its builder (no pack build), with the points the builder recorded, and measures, in the
# model's packed units (half-length = 1):
#   nozzles   the glow is seen from astern (nothing between it and the stern), and the nozzle touches the hull
#   guns      the muzzle is clear ahead, and the gun's root touches the hull
#   seat      the live turret's seat: the gap between the turret's base and the hull under it along the mount's normal
#             (+ floating, - sunk), and how far the seat's normal leans from the hull face's own normal there
# Usage: python3 tools/mountcheck.py [model ...]        (no names: every ship model)
#        python3 tools/mountcheck.py --seats-old        the turret seats as the game drew them before this pass
import sys,os,math,json,numpy as np
R=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,os.path.join(R,'previews'));sys.path.insert(0,R)
def ray(o,d,T,tmin=1e-5):
    # nearest hit of ray o+t*d on triangles T (n,3,3): (t, index) or (inf,-1)
    a,b,c=T[:,0],T[:,1],T[:,2];e1=b-a;e2=c-a;h=np.cross(d,e2);det=(e1*h).sum(1);ok=np.abs(det)>1e-12;f=1/np.where(ok,det,1)
    s=o-a;u=f*(s*h).sum(1);q=np.cross(s,e1);v=f*(q@d);t=f*(e2*q).sum(1);hit=ok&(u>=-1e-9)&(v>=-1e-9)&(u+v<=1+1e-9)&(t>tmin)
    if not hit.any():return math.inf,-1
    t=np.where(hit,t,math.inf);i=int(t.argmin());return float(t[i]),i
def dist(p,T):
    from mdlcheck import pt_tri
    return float(pt_tri(np.array([p],float),T)[0])
def inside(p,T):
    n=0
    for d in (np.array([.577,.577,.577]),np.array([-.3,.9,.31]),np.array([.2,-.6,.77])):
        a,b,c=T[:,0],T[:,1],T[:,2];e1=b-a;e2=c-a;h=np.cross(d,e2);det=(e1*h).sum(1);ok=np.abs(det)>1e-12;f=1/np.where(ok,det,1)
        s=p-a;u=f*(s*h).sum(1);q=np.cross(s,e1);v=f*(q@d);t=f*(e2*q).sum(1);n+=int((ok&(u>=0)&(v>=0)&(u+v<=1)&(t>1e-9)).sum()%2)
    return n>=2
def seat_gap(T,p,n,base_r=.11):
    # the turret's base (a ring of radius base_r round p, its underside at p) against the hull: the largest and smallest
    # distance from the ring's underside to the hull along -n (inf where there is no hull under it)
    n=np.array(n,float);n/=np.linalg.norm(n);u=np.cross(n,[1,0,0] if abs(n[0])<.9 else [0,0,1]);u/=np.linalg.norm(u);v=np.cross(n,u);g=[]
    for k in range(9):
        q=np.array(p,float)+(0 if k==8 else base_r*.8)*(u*math.cos(k*math.pi/4)+v*math.sin(k*math.pi/4))
        t,_=ray(q+n*.6,-n,T);g.append(t-.6 if t<math.inf else math.inf)
    t,i=ray(np.array(p,float)+n*.6,-n,T);lean=0.0
    if i>=0:
        fn=np.cross(T[i,1]-T[i,0],T[i,2]-T[i,0]);fn/=np.linalg.norm(fn)+1e-12;lean=math.degrees(math.acos(min(1,abs(float(fn@n)))))
    return g[8],min(g),max(g),lean
def load(name):
    import brood,d1kit
    brood.LAST=None;kind,fn=d1kit.NS['MODELS'][name];P,N,Rr=fn();P=np.array(P,float).reshape(-1,3,3);lo=P.reshape(-1,3).min(0);hi=P.reshape(-1,3).max(0);c=(lo+hi)/2;h=max(hi-lo)/2
    return (P-c)/h,brood.LAST or {},c,h,kind
def check(name,verbose=True):
    T,meta,c,h,kind=load(name);out=[];bad=0;NP=lambda p:(np.array(p,float)-c)/h
    pid=meta.get('pid');rest=lambda k:T[pid!=k]
    for q,r,rng in meta.get('eng',[]):
        p=NP(q);rn=r/h;H=rest(rng)
        # the glow sits .55 of the nozzle's depth inside the lip; look aft from just behind it, at four points off the axis
        hits=0
        for dx,dy in ((.25,0),(-.25,0),(0,.02),(0,-.02)):
            t,_=ray(p+np.array([dx*rn,dy*rn,.012]),np.array([0,0,-1.0]),H)
            if t<math.inf:hits+=1
        # joined: the nozzle's forward end (its mount) is inside the hull or touches it
        f=p+np.array([0,0,(rng and .06)/h]);d=0.0 if inside(f,H) else dist(f,H);j=d<rn*1.3+.01
        st=('ok' if hits==0 else 'GLOW HIDDEN from astern (%d of 4 rays blocked)'%hits)+('' if j else ', NOT JOINED (%.3f from the hull)'%d)
        if hits or not j:bad+=1
        out.append('  nozzle at (%.2f,%.2f,%.2f) r %.3f: %s'%(p[0],p[1],p[2],rn,st))
    for q,rng in meta.get('gun',[]):
        p=NP(q);H=rest(rng);t,_=ray(p+np.array([0,0,.012]),np.array([0,0,1.0]),H)
        # joined: the gun's root (the rearmost point of its own triangles) is inside the hull or touches it
        G=T[pid==rng].reshape(-1,3)
        if len(G):root=G[G[:,2]<=G[:,2].min()+1e-6].mean(0);d=0.0 if inside(root+np.array([0,0,-.004]),H) else dist(root,H)
        else:d=0.0   # a muzzle point with no gun of its own: a focus crystal's point, a maw, the gap between two rails
        j=d<.03
        st=('ok' if t==math.inf else 'MUZZLE BLOCKED %.3f ahead'%t)+('' if j else ', NOT JOINED (root %.3f from the hull)'%d)
        if t<math.inf or not j:bad+=1
        out.append('  gun muzzle at (%.2f,%.2f,%.2f): %s'%(p[0],p[1],p[2],st))
    for q,rng in meta.get('mine',[]):
        p=NP(q);out.append('  mining head at (%.2f,%.2f,%.2f)'%(p[0],p[1],p[2]))
    for q,nrm,rng in meta.get('pd',[]):
        # a point-defence turret modelled on the hull: its foot (the lowest point of its own triangles along its axis)
        # must reach the hull under its seat point, and the hull must not bury its housing
        p=NP(q);H=rest(rng);n=np.array(nrm,float);t,_=ray(p+n*.5,-n,H);g=(t-.5) if t<math.inf else math.inf
        G=T[pid==rng].reshape(-1,3);foot=float(((G-p)@n).min());rr=float(np.abs((G-p)[:,[0,2]]).max())/1.2
        gap=g+foot          # + : the foot ends above the hull (floating); - : set that far into it
        ok=gap<=.003 and g>=-1.0*rr
        if not ok:bad+=1
        out.append('  point-defence turret at (%.2f,%.2f,%.2f) facing %s: foot %+.3f from the hull under it: %s'%(p[0],p[1],p[2],'up' if n[1]>0 else 'down',gap,'ok' if ok else ('FLOATING' if gap>0 else 'BURIED')))
    for q,rng in meta.get('seat',[]):
        p=NP(q);g0,gmin,gmax,lean=seat_gap(T,p,(0,1,0))
        ok=abs(g0)<.012 and gmax<.03 and gmin>-.03 and lean<12
        if not ok:bad+=1
        out.append('  turret seat at (%.2f,%.2f,%.2f): gap under its centre %+.3f, round its base %+.3f to %+.3f, lean %.0f deg: %s'%(p[0],p[1],p[2],g0,gmin,gmax,lean,'ok' if ok else 'NOT SEATED'))
    if not verbose:out=[name+':'+x for x in out if not x.endswith(' ok') and 'mining head' not in x]
    if verbose or bad:print(name,'| %d nozzles, %d muzzles, %d mining heads, %d seat, %d point-defence%s'%(len(meta.get('eng',[])),len(meta.get('gun',[])),len(meta.get('mine',[])),len(meta.get('seat',[])),len(meta.get('pd',[])),' | %d to fix'%bad if bad else ''));print('\n'.join(out)) if out else None
    return bad
def seats_old():
    # the live turret before this pass: one mount for every Bomber (0, .2, -.38) and Heavy Bomber (0, .28, -.38) hull, its base
    # ring's underside .05 below the mount (gturretMesh), all in units of the hull's half-length
    import gzip,base64
    idx=json.load(open(os.path.join(R,'models_idx.json')));blob=gzip.decompress(base64.b64decode(open(os.path.join(R,'models_gz.b64')).read()))
    for name,m in (('dz_condor',.2),('dz_maul',.2),('dz_obelisk',.2),('dz_wrecker',.2),('b_sporemaw',.2),('bomber',.2),('dz_harrier',.28),('dz_warhound',.28),('dz_sentinel',.28),('b_thresher',.28),('gunboat',.28)):
        M=idx[name];T=np.frombuffer(blob,'<i2',M['n']*9,M['o']).reshape(-1,3,3).astype(float)/32767
        g0,gmin,gmax,lean=seat_gap(T,(0,m-.05,-.38),(0,1,0),.19)
        print('%-12s mount (0,%.2f,-.38): gap under the base centre %+.3f, round the base %+.3f to %+.3f, lean %.0f deg'%(name,m,g0,gmin,gmax,lean))
if __name__=='__main__':
    a=sys.argv[1:]
    if a and a[0]=='--seats-old':seats_old();sys.exit(0)
    import d1kit
    names=a or [k for k,(kind,fn) in d1kit.NS['MODELS'].items() if kind=='ship'];bad=0
    for k in names:bad+=check(k,verbose=bool(a))
    print(bad,'mounts to fix')
