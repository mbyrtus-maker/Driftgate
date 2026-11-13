# Driftgate Beyond: turret seats on the powers' stations and depots, the freeports and Scrapheart Haven (12 Nov 2026).
# The user, 11 Nov 2026: "Careful on the turrets, some of them are floating above their hulls." These ten models had no seats:
# the game put each live turret at the middle of whichever face lay furthest out in a fixed direction (stSurf, 16z_models.js),
# with its "up" pointing away from the station's centre. That lands on halo rims, arm tips and mast ends, sinks the turntable a
# full 15 m into whatever it found, and leans the turret by whatever the face's slope happens to be.
# Now each model carries real seats: a barbette (a low drum with a chamfered rim, its foot let into the hull) on a spot where the
# hull is solid under the whole turntable, standing along the hull's own normal there. The pack keeps each seat's deck point and
# normal ('sp' in the index); the game stands the turret's turntable on the deck (16zzzzf_gfx.js).
#   seats(M,K,size,...)   find K seats on a finished mesh (builder units), build their barbettes into it, record them
#   measure(T,p,n,...)    the seat check: how a turret drawn with its pivot at p and its up along n meets the triangles T
# The check itself, before and after, for every model: python3 tools/stseats.py [--old] [MODEL ...]
import math,sys,os,json,base64,gzip
import numpy as np
TS=1.15                       # the drawn turret's scale on a station (12_render.js)
LIFT=13.2*TS                  # the turntable's underside below the turret's pivot (turretMesh: base ring down to y -13.2)
RAD=11.0*TS                   # the turntable's radius (10.6) with a little room
TOP=LIFT+7.0*TS               # the head's roof above the turntable's underside
SIZE={'by_st_halcyon':170,'by_st_varkesh':170,'by_st_ostrova':170,'by_dp_halcyon':105,'by_dp_varkesh':105,'by_dp_ostrova':105,
      'by_freeport':210,'by_freeport_cw':210,'by_freeport_ew':210,'by_haven':240}
# the docking ports of each model as the game finds them (mdlPorts, 11_player.js; metres from the model's centre at its drawn size).
# Most are worked out in the game from the model's outline, so they are kept here as read from the built game; a seat's barbette
# does not move them (checked: the ports before and after the seats went in are the same to 0.1 m).
PORTS=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'stseats_ports.json')))
COUNT={k:(4 if k.startswith('by_dp_') else 12 if k.startswith('by_freeport') else 6) for k in SIZE}   # live turrets on each (STN, 02_state.js; a freeport's twelve: 16zzh_fpdark.js)
def rays(T,O,d):
    # nearest hit of each ray O[i] + t d (t>0) on triangles T: distances (inf: none) and the hit faces' normals, turned to face the ray
    e1=T[:,1]-T[:,0];e2=T[:,2]-T[:,0];p=np.cross(d,e2);det=(e1*p).sum(1);ok=np.abs(det)>1e-12;inv=np.where(ok,1/np.where(ok,det,1),0)
    out=[];nn=[]
    for o in O:
        s=o-T[:,0];u=(s*p).sum(1)*inv;q=np.cross(s,e1);v=(q@d)*inv;t=(e2*q).sum(1)*inv;m=ok&(u>=-1e-9)&(v>=-1e-9)&(u+v<=1+1e-9)&(t>1e-6)
        if not m.any():out.append(np.inf);nn.append(np.zeros(3));continue
        i=int(np.argmin(np.where(m,t,np.inf)));n=np.cross(e1[i],e2[i]);n/=np.linalg.norm(n)+1e-12;out.append(float(t[i]));nn.append(n if n@d<0 else -n)
    return np.array(out),np.array(nn)
def frame(n):
    n=np.array(n,float);n/=np.linalg.norm(n);u=np.cross(n,[0,1.,0]) if abs(n[1])<.9 else np.cross(n,[1.,0,0]);u/=np.linalg.norm(u);return n,u,np.cross(n,u)
def rim(c,n,r,k=12):
    n,u,v=frame(n);return np.array([c+(u*math.cos(a)+v*math.sin(a))*r for a in np.linspace(0,2*math.pi,k,endpoint=False)])
def measure(T,p,n,lift=LIFT,rad=RAD):
    # a turret with its pivot at p and its up along n, against the hull's triangles T (all in metres in game):
    #   gap   the turntable's underside above the hull under its centre (+ floats, - sunk in)
    #   rim   the same under twelve points of the turntable's rim: lowest and highest, and how many find hull within a radius
    #   tilt  the angle between the turret's up and the hull's own normal under its centre (degrees)
    n,u,v=frame(n);p=np.array(p,float);O=np.concatenate([[p+n*1e-3],rim(p+n*1e-3,n,rad)]);t,nn=rays(T,O,-n);g=t-lift
    ok=np.isfinite(g[1:])&(np.abs(g[1:])<rad);tilt=math.degrees(math.acos(max(-1,min(1,float(nn[0]@n))))) if np.isfinite(t[0]) else 180.0
    gr=g[1:][np.isfinite(g[1:])]
    return {'gap':float(g[0]),'rim_lo':float(gr.min()) if len(gr) else float('inf'),'rim_hi':float(gr.max()) if len(gr) else float('inf'),'rim_n':int(ok.sum()),'tilt':tilt}
def passes(m):return abs(m['gap'])<=.6 and m['rim_n']==12 and abs(m['rim_lo'])<=1.0 and abs(m['rim_hi'])<=1.0 and m['tilt']<=5
def nominal(K):
    # the directions the game spread a station's turrets in (stSurf): kept, so the turrets stay spread round the station as before
    out=[]
    for i in range(K):
        a=i/K*2*math.pi+.4;d=np.array([math.cos(a),.55 if i%2 else -.25,math.sin(a)]);out.append(d/np.linalg.norm(d))
    return out
def old_seats(T,K):
    # the game's old rule, on the same triangles (centred, in metres): pivot at the middle of the outermost face, up from the centre
    C=T.mean(1);out=[]
    for d in nominal(K):p=C[int(np.argmax(C@d))];out.append((p,p/np.linalg.norm(p)))
    return out
def seats(M,K,size,avoid=(),want=(),log=None,ports=()):
    # Find K seats on the finished mesh M and build their barbettes into it. size: the model's half-extent in metres in game.
    # want: seats the builder asks for itself, as (point on the hull, normal) in builder units; avoid: points to keep clear of
    # (docking ports). ports: the model's docking ports as the game has them (metres, from the model's centre; PORTS below): a
    # turret's pivot keeps 38% of the station's size, and never under 55 m, from each (the game's rule since 16zw_ports.js).
    # Returns [(deck point, normal)] in builder units, and records them in M.stn.
    # How: rays are sent at the hull from all round (toward its axis, and straight down and up onto its decks); wherever one lands,
    # a barbette is tried there, standing along the hull's own normal. It is kept if the hull is solid under the whole turntable
    # (every rim ray finds hull, within a turntable's radius of level), nothing stands in the turret's own space or close round
    # it, and the guns have open sky (most of 24 rays out to 75 degrees off its up run 70 m clear). Each of the K directions the
    # game used to spread the turrets in then takes the best seat near it: close to its direction, a low barbette, open sky.
    from beyond_capitals import tube
    P=np.array(M.T,float).reshape(-1,3,3);lo=P.reshape(-1,3).min(0);hi=P.reshape(-1,3).max(0);c=(lo+hi)/2;half=float((hi-lo).max()/2);w=size/half
    T=(P-c)*w;TC=T.mean(1);V=np.concatenate([T.reshape(-1,3),TC]);R=RAD;out=[];noms=nominal(K);ext=np.abs(T.reshape(-1,3)).max(0)
    def near(q,r):return T[np.linalg.norm(TC-q,axis=1)<r+np.linalg.norm(T-TC[:,None,:],axis=2).max(1)]
    def trial(h0,n,lv=0):
        # lv 1: a second pass for a direction with no seat yet: a taller barbette and less open sky are allowed
        Tn=near(h0,90.0)
        t,_=rays(Tn,np.concatenate([[h0+n*40],rim(h0+n*40,n,R),rim(h0+n*40,n,R*.55,6)]),-n);d=t-40
        if not np.isfinite(d).all():return None
        deck=max(0.0,float(-d.min()))+2.2;skirt=float(d.max())+1.2
        if d.max()-d.min()>R*(.95,1.7)[lv] or deck>R*(.7,1.0)[lv]:return None
        q=V-(h0+n*deck);a=q@n;r=np.linalg.norm(q-np.outer(a,n),axis=1)
        if ((a>.3)&(a<TOP+2)&(r<R*1.08)).any() or ((a>2.5)&(a<TOP)&(r<R*1.55)).any():return None
        # open sky for the guns, from the pivot
        pv=h0+n*(deck+LIFT);_,u,v=frame(n);blocked=0;inner=0
        for th in (20,50,75):
            for k in range(8):
                az=k*math.pi/4+th;dd=n*math.cos(math.radians(th))+(u*math.cos(az)+v*math.sin(az))*math.sin(math.radians(th));tt,_=rays(Tn,[pv],dd)
                if tt[0]<70:blocked+=1;inner+=th==20
        if inner>(0,2)[lv] or blocked>(7,12)[lv]:return None
        return deck,skirt,blocked
    pclr=max(size*.38,55.0)+LIFT+2
    def far(p,minsep):return all(np.linalg.norm(p-q)>minsep for q,_ in out) and all(np.linalg.norm(p-(np.array(a,float)-c)*w)>R*3.2 for a in avoid) and all(np.linalg.norm(p-np.array(a,float))>pclr for a in ports)
    left=list(range(K))
    for h0,n in want:
        h0=(np.array(h0,float)-c)*w;n=frame(n)[0];t,nn=rays(T,[h0+n*30],-n)
        if np.isfinite(t[0]):h0=h0+n*(30-t[0])
        tr=trial(h0,n)
        if tr is None or not far(h0,R*2.5):
            if log is not None:log.append('asked-for seat refused at %s'%np.round(h0,1).tolist())
            continue
        i=max(left,key=lambda i:float(noms[i]@(h0/np.linalg.norm(h0))));left.remove(i);out.append((h0+n*tr[0],n));_plinth(M,tube,c,w,h0,n,tr,R)
    # the pool of landing points
    cand=[]
    for az in np.linspace(0,2*math.pi,72,endpoint=False):
        for el in np.linspace(-1.2,1.2,13):
            d=np.array([math.cos(az)*math.cos(el),math.sin(el),math.sin(az)*math.cos(el)])
            for back in (0,.25,-.25,.5,-.5):cand.append((d*size*3+np.array([0,back*ext[1],0]),-d))
        for r in (.12,.22,.32,.42,.52,.62,.72,.82,.92):
            for sg in (1,-1):cand.append((np.array([math.cos(az)*r*max(ext[0],ext[2]),sg*size*3,math.sin(az)*r*max(ext[0],ext[2])]),np.array([0,-sg,0.])))
    hits=[]
    for o,d in cand:
        t,nn=rays(T,[o],d)
        if np.isfinite(t[0]) and nn[0]@(-d)>.5:hits.append((o+d*t[0],nn[0]))
    # one landing point per patch of hull (a third of a turntable apart)
    seen={};pool=[]
    for h0,n in hits:
        k=tuple(np.round(h0/(R*.35)).astype(int))
        if k in seen:continue
        seen[k]=1;pool.append((h0,n))
    def pre(i,h0,n):
        d0=noms[i];q=h0/(np.linalg.norm(h0)+1e-9);daz=abs((math.atan2(q[2],q[0])-math.atan2(d0[2],d0[0])+math.pi)%(2*math.pi)-math.pi);dl=abs(math.asin(max(-1,min(1,q[1])))-math.asin(d0[1]))
        # near its direction round the axis (most), near its height (less), and well out from the middle (turrets guard the outside)
        return daz+.3*dl+.25*(1-min(1,np.linalg.norm(h0)/size))
    tried={}
    for lv in (0,1):
        for i in list(left):
            order=sorted(range(len(pool)),key=lambda j:pre(i,*pool[j]));best=None
            for j in order:
                h0,n=pool[j];ps=pre(i,h0,n)
                if best is not None and ps>=best[0]:break
                if not far(h0,R*(2.6,2.3)[lv]):continue
                if (j,lv) not in tried:tried[(j,lv)]=trial(h0,n,lv)
                tr=tried[(j,lv)]
                if tr is None:continue
                sc=ps+.25*(tr[0]+tr[1])/R+.04*tr[2]
                if best is None or sc<best[0]:best=(sc,h0,n,tr)
            if best is None:
                if log is not None and lv:log.append('NO SEAT FOUND for direction %d'%i)
                continue
            _,h0,n,tr=best;left.remove(i);out.append((h0+n*tr[0],n));_plinth(M,tube,c,w,h0,n,tr,R)
            if log is not None and lv:log.append('direction %d seated on the second pass (barbette %.1f m tall, %d of 24 sky rays blocked)'%(i,tr[0]+tr[1],tr[2]))
    M.stn=[((p/w+c),n) for p,n in out];return M.stn
def _plinth(M,tube,c,w,h0,n,tr,R):
    # the barbette: a drum from under the hull's lowest point beneath its rim up to a deck, a chamfer round the deck, an accent band under it
    from brood import Mesh
    deck,skirt=tr[0],tr[1];B=lambda q:(q/w+c);b0=h0-n*skirt;b1=h0+n*(deck-2.0);b2=h0+n*deck
    MID,DARK,ACC=1,2,3
    tube(M,[B(b0),B(b1),B(b2)],[R*1.13/w,R*1.13/w,R*1.0/w],MID,.9,12,cap0=False,cap1=True)
    tube(M,[B(b1-n*1.1),B(b1-n*.5)],[R*1.15/w,R*1.15/w],ACC,.9,12,cap0=False,cap1=False)
# ---------------------------------------------------------------------------------------------------------------- the check
def pack_model(name):
    R_=os.path.dirname(os.path.abspath(__file__));idx=json.load(open(R_+'/models_idx.json'));blob=gzip.decompress(base64.b64decode(open(R_+'/models_gz.b64').read()))
    m=idx[name];T=np.frombuffer(blob,'<i2',m['n']*9,m['o']).reshape(-1,3,3).astype(float)/32767;return T,m
def game_seats(m,size,n,k=1.0):
    # the game's rule (16zzzzf_gfx.js): turret i of n takes seat floor(i*K/n); its pivot stands the turntable's height above the deck
    sp=m.get('sp') or [];K=len(sp);out=[]
    for i in range(n):
        s=sp[(i*K//n if n<K else i)%K];p=np.array(s[:3],float)*size;nn=np.array(s[3:6],float);out.append((p+nn*LIFT*k,nn))
    return out
if __name__=='__main__':
    old='--old' in sys.argv;names=[a for a in sys.argv[1:] if not a.startswith('--')];names,only=(names or list(SIZE)),names;names=[a for a in names if a in SIZE];bad=0
    print('seat check (%s): gap = turntable underside above the hull under its centre, rim = the same under 12 rim points (lowest..highest, how many of 12 find hull), tilt = lean off the hull\'s normal; metres in game'%('the old rule' if old else 'the seats in the pack'))
    for name in names:
        T,m=pack_model(name)
        for size,n,k,tag in ([(SIZE[name],COUNT[name],1.0,'')]+([(80,2,80/105,' as a forward depot')] if name.startswith('by_dp_') else [])):
            S=old_seats(T*size,n) if old or not m.get('sp') else game_seats(m,size,n,k)
            if not old and len(m.get('sp') or [])<n:bad+=1;print('%-16s%s FAIL: %d seats in the pack for %d turrets (turrets would share a seat)'%(name,tag,len(m.get('sp') or []),n))
            for i,(p,nn) in enumerate(S):
                r=measure(T*size,p,nn,LIFT*k,RAD*k);ok=passes(r);bad+=not ok
                print('%-16s%s turret %d  gap %+6.1f  rim %+6.1f..%+6.1f %2d/12  tilt %5.1f  %s'%(name,tag,i+1,r['gap'],r['rim_lo'],r['rim_hi'],r['rim_n'],r['tilt'],'ok' if ok else 'FAIL'))
    if not only or 'wk_def' in only:
        # the defence platform's turrets: two per level of the Defence works, round the gun deck (05_freeports_campaigns.js devEnt)
        T,m=pack_model('wk_def');u=62.0
        for n in (2,4,6):
            for i in range(n):
                a=i/n*2*math.pi+.4
                if old or m.get('dk') is None:p=np.array([math.cos(a)*u*.74,-u*.18,math.sin(a)*u*.74]);nn=p+np.array([0,-(150+u*1.5),0.]);nn/=np.linalg.norm(nn)
                else:p=np.array([math.cos(a)*u*.6,u*m['dk']+LIFT,math.sin(a)*u*.6]);nn=np.array([0,1.,0])   # .6: GST.wkr, 16zzzzf_gfx.js
                r=measure(T*u,p,nn);ok=passes(r);bad+=not ok
                print('wk_def (%d turrets) turret %d  gap %+6.1f  rim %+6.1f..%+6.1f %2d/12  tilt %5.1f  %s'%(n,i+1,r['gap'],r['rim_lo'],r['rim_hi'],r['rim_n'],r['tilt'],'ok' if ok else 'FAIL'))
    print(bad,'seats fail')
