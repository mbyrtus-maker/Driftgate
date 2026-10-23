# Patch: a proper aiming reticle for blast charges. The old HUD only ringed the fault points and turned one green when the nose
# ray crossed it, ignoring the ship's own drift (a charge flies at 300 m/s plus the ship's velocity) and range. Now:
# - a crosshair where the charge will actually land (ship velocity included), coloured by the placement it would get:
#   green on point, amber near, red off, grey out of range; under it ON POINT / NEAR 9 M / OFF 24 M / OUT OF RANGE 420 / 300 M
# - a dashed line from the crosshair to the nearest fault point when it isn't on point
# - each fault point shows its on-point ring (solid) and its near ring (dashed); points already charged are marked SET
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
# where a charge fired now lands: the same flight and sticking rules as blFire / blWorld / blStick
rep("function blDraw(c){",
"""function blPredict(p,P,T){qRot(p.q,0,0,1,_f);const sp=BL.spd*(vF(P,'blSpdK')||1),r=p.st.radius,ox=p.x+_f.x*r,oy=p.y+_f.y*r,oz=p.z+_f.z*r,vx=p.vx+_f.x*sp,vy=p.vy+_f.y*sp,vz=p.vz+_f.z*sp,vl=hyp(vx,vy,vz)||1,dx=vx/vl,dy=vy/vl,dz=vz/vl;
  const Rh=(T.wpt?WPT_R:astR(T))+2,cx=ox-T.x,cy=oy-T.y,cz=oz-T.z,b=cx*dx+cy*dy+cz*dz,cc=cx*cx+cy*cy+cz*cz-Rh*Rh,D=b*b-cc;if(D<0)return null;const t=-b-Math.sqrt(D);if(t<0)return null;
  const hx=ox+dx*t-T.x,hy=oy+dy*t-T.y,hz=oz+dz*t-T.z,hl=hyp(hx,hy,hz)||1,R0=astR(T);return{at:{x:T.x+hx/hl*R0,y:T.y+hy/hl*R0,z:T.z+hz/hl*R0},d:t,ok:t/vl<=blRange(P)/sp}}
function blDraw(c){""")
old="""if(scan||dist<BL.eyeR+astR(T)){const aim=blAim(p,T),win=blWin(P,T);for(const q of blPts(T)){const L=proj(q.x,q.y,q.z);if(L.behind)continue;const rr=Math.max(5,projR(L.d,win));const ok=aim&&d3(aim,q)<=win;
        c.strokeStyle=ok?'#7ad9a7':scan?'rgba(240,178,74,.95)':'rgba(240,178,74,.45)';c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();if(T.wpt&&T.k==='core'){c.fillStyle='#ff5d4f';c.fillText('CORE · ON POINT ONLY',L.x,L.y-rr-6)}}}"""
new="""if(scan||dist<BL.eyeR+astR(T)){const pr=blPredict(p,P,T),aim=pr&&pr.ok?pr.at:null,win=blWin(P,T),pts=blPts(T);let bi=-1,bd=1e9;if(pr)pts.forEach((q,i)=>{const d=d3(pr.at,q);if(d<bd){bd=d;bi=i}});
      pts.forEach((q,i)=>{const L=proj(q.x,q.y,q.z);if(L.behind)return;const rr=Math.max(5,projR(L.d,win)),rn=Math.max(rr+3,projR(L.d,BL.near)),done=(s.charges||[]).some(ch=>ch.o===blKey(P)&&ch.a===T.id&&ch.pi===i),ok=aim&&d3(aim,q)<=win;
        c.strokeStyle=ok?'#7ad9a7':done?'rgba(122,217,167,.55)':scan?'rgba(240,178,74,.95)':'rgba(240,178,74,.45)';c.lineWidth=ok?2.5:1.5;c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();
        c.lineWidth=1;c.setLineDash([2,4]);c.strokeStyle='rgba(240,178,74,.35)';c.beginPath();c.arc(L.x,L.y,rn,0,TAU);c.stroke();c.setLineDash([]);c.lineWidth=1.5;
        if(done){c.fillStyle='rgba(122,217,167,.85)';c.fillText('SET',L.x,L.y+rn+11)}
        if(T.wpt&&T.k==='core'){c.fillStyle='#ff5d4f';c.fillText('CORE · ON POINT ONLY',L.x,L.y-rr-6)}});
      if(pr){const A=proj(pr.at.x,pr.at.y,pr.at.z);if(!A.behind){const q=bi>=0?pts[bi]:null,qd=q?d3(pr.at,q):1e9,cl=!pr.ok?'range':qd<=win?'on':qd<=BL.near?'near':'off',col={on:'#7ad9a7',near:'#f0b24a',off:'#ff5d4f',range:'rgba(205,205,215,.75)'}[cl];
        if(q&&cl!=='on'&&pr.ok){const Q=proj(q.x,q.y,q.z);if(!Q.behind){c.strokeStyle=col;c.globalAlpha=.6;c.setLineDash([3,3]);c.beginPath();c.moveTo(A.x,A.y);c.lineTo(Q.x,Q.y);c.stroke();c.setLineDash([]);c.globalAlpha=1}}
        const k=9;c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(A.x-k,A.y);c.lineTo(A.x-3,A.y);c.moveTo(A.x+3,A.y);c.lineTo(A.x+k,A.y);c.moveTo(A.x,A.y-k);c.lineTo(A.x,A.y-3);c.moveTo(A.x,A.y+3);c.lineTo(A.x,A.y+k);c.stroke();c.lineWidth=1.5;
        c.fillStyle=col;c.fillText(cl==='range'?`OUT OF RANGE · ${Math.round(pr.d)} / ${Math.round(blRange(P))} M`:cl==='on'?'ON POINT':`${cl==='near'?'NEAR':'OFF'} · ${Math.round(qd)} M`,A.x,A.y+k+13)}}
      else if(dist<blRange(P)+astR(T)+300){c.fillStyle='rgba(205,205,215,.75)';c.fillText('CHARGE WOULD MISS THE ROCK',VW/2,VH/2+34)}}"""
rep(old,new)
open(P,'w',encoding='utf-8').write(s);print('blast reticle applied')
