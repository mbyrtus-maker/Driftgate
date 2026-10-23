//@src 12_render.js
// ============================================================ WebGL renderer
const G=glc.getContext('webgl',{antialias:true,alpha:false})||glc.getContext('experimental-webgl');
const ovc=$('ov'),octx=ovc.getContext('2d');
let VW=0,VH=0,DPR=1;
function shader(type,src){const s=G.createShader(type);G.shaderSource(s,src);G.compileShader(s);if(!G.getShaderParameter(s,G.COMPILE_STATUS))throw new Error(G.getShaderInfoLog(s));return s}
function program(vs,fs,attrs){const p=G.createProgram();G.attachShader(p,shader(G.VERTEX_SHADER,vs));G.attachShader(p,shader(G.FRAGMENT_SHADER,fs));attrs.forEach((a,i)=>G.bindAttribLocation(p,i,a));G.linkProgram(p);if(!G.getProgramParameter(p,G.LINK_STATUS))throw new Error(G.getProgramInfoLog(p));const u={};const n=G.getProgramParameter(p,G.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=G.getActiveUniform(p,i);u[inf.name]=G.getUniformLocation(p,inf.name)}return{p,u}}
let PM,PB,PP,PS;
function initGL(){
  G.disable(G.DITHER);
  PM=program(`attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;uniform mat4 uM,uVP;varying vec3 vN;varying vec4 vC;void main(){vec4 w=uM*vec4(aP,1.);vN=(uM*vec4(aN,0.)).xyz;vC=aC;gl_Position=uVP*w;}`,
    `precision mediump float;uniform vec3 uL,uSun,uAmb,uEm,uTint;uniform float uA;varying vec3 vN;varying vec4 vC;void main(){vec3 n=vN/(length(vN)+1e-5);float d=max(dot(n,uL),0.);float b=max(dot(n,-uL),0.);vec3 c=vC.rgb*uTint;vec3 lit=c*(uAmb+uSun*d+uAmb*.6*b);vec3 col=mix(lit,c,vC.a)+uEm;gl_FragColor=vec4(col*uA,uA);}`,['aP','aN','aC']);
  PB=program(`attribute vec3 aP;attribute vec4 aC;attribute vec2 aU;uniform mat4 uVP;varying vec4 vC;varying vec2 vU;void main(){vC=aC;vU=aU;gl_Position=uVP*vec4(aP,1.);}`,
    `precision mediump float;varying vec4 vC;varying vec2 vU;void main(){float f=max(0.,1.-length(vU));f*=f;gl_FragColor=vec4(vC.rgb*f*vC.a,1.);}`,['aP','aC','aU']);
  PP=program(`attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uVP;uniform vec3 uOff;uniform float uPx;varying vec4 vC;void main(){vC=aC;gl_Position=uVP*vec4(aP+uOff,1.);gl_PointSize=aS*uPx;}`,
    `precision mediump float;varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float f=max(0.,1.-length(d)*2.);gl_FragColor=vec4(vC.rgb*f*vC.a,1.);}`,['aP','aC','aS']);
  PS=program(`attribute vec3 aP;attribute vec2 aU;uniform mat4 uVP;uniform vec3 uOff;varying vec2 vU;void main(){vU=aU;gl_Position=uVP*vec4(aP+uOff,1.);}`,
    `precision mediump float;uniform sampler2D uT;varying vec2 vU;void main(){gl_FragColor=texture2D(uT,vU);}`,['aP','aU']);
}
function attribs(layout,stride){for(let i=0;i<4;i++){if(i<layout.length)G.enableVertexAttribArray(i);else G.disableVertexAttribArray(i)}let off=0;layout.forEach((sz,i)=>{G.vertexAttribPointer(i,sz,G.FLOAT,false,stride*4,off*4);off+=sz})}

// ---- geometry builder: interleaved pos3 normal3 color3 emit1
const _gv={x:0,y:0,z:0};
function GB(){this.d=[];this.T=null}
GB.prototype.set=function(px,py,pz,q,sx,sy,sz){this.T={px:px||0,py:py||0,pz:pz||0,q:q||q0(),sx:sx||1,sy:sy===undefined?(sx||1):sy,sz:sz===undefined?(sx||1):sz};return this};
GB.prototype.P=function(p){const t=this.T;if(!t)return[p[0],p[1],p[2]];qRot(t.q,p[0]*t.sx,p[1]*t.sy,p[2]*t.sz,_gv);return[_gv.x+t.px,_gv.y+t.py,_gv.z+t.pz]};
GB.prototype.tri=function(a,b,c,col,em,ctr){const A=this.P(a),B=this.P(b),C=this.P(c);const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=hyp(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  if(ctr){const K=this.P(ctr);if(nx*((A[0]+B[0]+C[0])/3-K[0])+ny*((A[1]+B[1]+C[1])/3-K[1])+nz*((A[2]+B[2]+C[2])/3-K[2])<0){nx=-nx;ny=-ny;nz=-nz}}
  for(const V of[A,B,C])this.d.push(V[0],V[1],V[2],nx,ny,nz,col[0],col[1],col[2],em||0)};
GB.prototype.quad=function(a,b,c,d,col,em,ctr){this.tri(a,b,c,col,em,ctr);this.tri(a,c,d,col,em,ctr)};
GB.prototype.seg=function(a,b,col){const A=this.P(a),B=this.P(b);this.d.push(A[0],A[1],A[2],0,0,0,col[0],col[1],col[2],1,B[0],B[1],B[2],0,0,0,col[0],col[1],col[2],1)};
GB.prototype.box=function(w,h,d,col,em,vary){const x=w/2,y=h/2,z=d/2,v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],c=[0,0,0];
  for(const f of[[0,1,2,3],[4,5,6,7],[0,1,5,4],[3,2,6,7],[0,3,7,4],[1,2,6,5]])this.quad(v[f[0]],v[f[1]],v[f[2]],v[f[3]],vary?scaleC(col,rnd(.85,1.1)):col,em,c);return this};
GB.prototype.cyl=function(r1,r2,h,n,col,em,caps){for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU,p1=[Math.cos(a)*r1,-h/2,Math.sin(a)*r1],p2=[Math.cos(b)*r1,-h/2,Math.sin(b)*r1],p3=[Math.cos(b)*r2,h/2,Math.sin(b)*r2],p4=[Math.cos(a)*r2,h/2,Math.sin(a)*r2];
  this.quad(p1,p2,p3,p4,col,em,[0,0,0]);if(caps!==false){this.tri([0,-h/2,0],p1,p2,col,em,[0,0,0]);this.tri([0,h/2,0],p4,p3,col,em,[0,0,0])}}return this};
GB.prototype.torus=function(R,r,ns,nt,col,em,vary){for(let i=0;i<ns;i++){const a=i/ns*TAU,b=(i+1)/ns*TAU,cc=scaleC(col,vary?(i%2?1:.8):1);for(let j=0;j<nt;j++){const u=j/nt*TAU,v=(j+1)/nt*TAU;const P=(t,s)=>[Math.cos(t)*(R+r*Math.cos(s)),r*Math.sin(s),Math.sin(t)*(R+r*Math.cos(s))];
  this.quad(P(a,u),P(b,u),P(b,v),P(a,v),cc,em,[Math.cos((a+b)/2)*R,0,Math.sin((a+b)/2)*R])}}return this};
GB.prototype.sphere=function(r,nl,nm,col,em){for(let i=0;i<nl;i++){const t1=i/nl*Math.PI,t2=(i+1)/nl*Math.PI;for(let j=0;j<nm;j++){const p1=j/nm*TAU,p2=(j+1)/nm*TAU;const P=(t,p)=>[Math.sin(t)*Math.cos(p)*r,Math.cos(t)*r,Math.sin(t)*Math.sin(p)*r];this.quad(P(t1,p1),P(t1,p2),P(t2,p2),P(t2,p1),col,em,[0,0,0])}}return this};
GB.prototype.circleLines=function(r,n,col){for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;this.seg([Math.cos(a)*r,0,Math.sin(a)*r],[Math.cos(b)*r,0,Math.sin(b)*r],col)}return this};
GB.prototype.upload=function(lines){const arr=new Float32Array(this.d);const buf=G.createBuffer();G.bindBuffer(G.ARRAY_BUFFER,buf);G.bufferData(G.ARRAY_BUFFER,arr,G.STATIC_DRAW);return{buf,n:arr.length/10,mode:lines?G.LINES:G.TRIANGLES,data:arr}};

const MESH={};
// ============================================================ model pack
// Every model is stored as triangles plus a colour role per triangle (hull light / hull mid / dark metal / faction accent /
// canopy glass / engine glow / lit window). Roles are painted from one shared faction palette at load, so Quaternius
// fighters, Kenney work ships and Kenney-built stations all come out in the same colours, lighting and finish.
const MDL={i:null,b:null,ready:false};
(async()=>{try{const ie=document.getElementById('mdlidx'),be=document.getElementById('mdlbin');if(!ie||!be||typeof DecompressionStream==='undefined')return;
  const idx=JSON.parse(ie.textContent),bin=atob(be.textContent.trim()),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const buf=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  MDL.i=idx;MDL.b=buf;MDL.ready=true;for(const k in MESH)if(!k.startsWith('a'))delete MESH[k];try{if(!running&&typeof showStart==='function'&&!$('start').hidden)showStart()}catch(e){}}catch(e){console.warn('model pack unavailable',e)}})();
const MDL_HULL={neutral:[.64,.62,.57],halcyon:[.6,.61,.62],varkesh:[.43,.41,.4],ostrova:[.56,.54,.6],pirate:[.5,.45,.37]};
// the Brood palette: bone, chitin, deep chitin, flesh, glossy eyes, drive vents and glowing sacs in their own colour
function broodPal(F){return{c:[[.74,.69,.56],mixC([.19,.23,.16],F,.12),[.07,.08,.06],[.52,.27,.34],[.06,.08,.1],F,mixC(F,[1,1,.85],.18),[.4,.37,.33],[.25,.23,.21]],e:[0,0,0,.04,.25,.9,.7,0,0]}}
function mdlPal(fac){const F=hexRGB(sideCol(fac)),base=MDL_HULL[fac]||[.57,.58,.6];if(fac==='brood')return broodPal(F);
  return{c:[mixC(base,F,.1),mixC([.36,.38,.43],F,.04),[.15,.16,.19],scaleC(F,.92),[.16,.3,.4],F,mixC([.2,.33,.42],F,.25),[.43,.4,.36],[.25,.23,.21]],e:[0,0,0,0,.15,.85,.4,0,0]}}
function mdlHas(name){return MDL.ready&&!!MDL.i[name]}
function mdlTris(name,fac,s,g,pal){const M=MDL.i[name],n=M.n,P=new Int16Array(MDL.b,M.o,n*9),R=new Uint8Array(MDL.b,M.o+n*18,n),SH=new Uint8Array(MDL.b,M.o+n*19,n),Q=pal||mdlPal(fac),k=s/32767;
  for(let t=0;t<n;t++){const o=t*9,ax=P[o]*k,ay=P[o+1]*k,az=P[o+2]*k,bx=P[o+3]*k,by=P[o+4]*k,bz=P[o+5]*k,cx=P[o+6]*k,cy=P[o+7]*k,cz=P[o+8]*k;
    const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const r=R[t],c=Q.c[r],sh=SH[t]/100,em=Q.e[r];g.d.push(ax,ay,az,nx,ny,nz,c[0]*sh,c[1]*sh,c[2]*sh,em,bx,by,bz,nx,ny,nz,c[0]*sh,c[1]*sh,c[2]*sh,em,cx,cy,cz,nx,ny,nz,c[0]*sh,c[1]*sh,c[2]*sh,em)}
  return g}
// engine flares: the model pack kept only the 3 largest glowing clusters, which on many hulls put every flare on one side.
// If a hull's flares are lopsided, rebuild them from its glowing nozzle faces, keeping left/right pairs together (up to 6).
function engFix(name){const M=MDL.i[name];if(!M||M.k!=='ship')return M?M.e:[];if(M.ef)return M.ef;const e=M.e,mir=(a,L)=>L.some(b=>Math.abs(b[0]+a[0])<.06&&Math.abs(b[1]-a[1])<.06&&Math.abs(b[2]-a[2])<.08);
  if(e.every(a=>Math.abs(a[0])<=.04||mir(a,e)))return M.ef=e;
  const n=M.n,P=new Int16Array(MDL.b,M.o,n*9),R=new Uint8Array(MDL.b,M.o+n*18,n),cl=[];
  for(let i=0;i<n;i++){if(R[i]!==5)continue;const g=[0,0,0];let zmin=1;for(let v=0;v<3;v++){for(let j=0;j<3;j++)g[j]+=P[i*9+v*3+j]/32767/3;zmin=Math.min(zmin,P[i*9+v*3+2]/32767)}
    let C=cl.find(C=>Math.hypot(C.s[0]/C.n-g[0],C.s[1]/C.n-g[1],C.s[2]/C.n-g[2])<.14);if(!C)cl.push(C={s:[0,0,0],n:0,p:[],z:1});for(let j=0;j<3;j++)C.s[j]+=g[j];C.n++;C.p.push(g);C.z=Math.min(C.z,zmin)}
  const E=cl.map(C=>{const c=C.s.map(v=>v/C.n);let r=0;for(const q of C.p)r=Math.max(r,Math.hypot(q[0]-c[0],q[1]-c[1],q[2]-c[2]));return{c,n:C.n,r:Math.max(.04,Math.min(.16,r+.03)),z:C.z}}).sort((a,b)=>b.n-a.n),out=[];
  const add=x=>{if(out.length<6&&!out.some(o=>Math.hypot(o[0]-x.c[0],o[1]-x.c[1])<.07))out.push([+x.c[0].toFixed(3),+x.c[1].toFixed(3),+(x.z-.01).toFixed(3),+x.r.toFixed(3)])};
  for(const x of E){if(out.length>=6)break;if(x.n<2&&out.length>=2)continue;if(Math.abs(x.c[0])>.04&&out.length>4)continue;add(x);if(Math.abs(x.c[0])>.04)add({c:[-x.c[0],x.c[1],x.c[2]],n:x.n,r:x.r,z:x.z})}
  return M.ef=out.length?out:e}
function mdlMesh(name,fac,s){const g=mdlTris(name,fac,s,new GB());return g.upload()}
// guns fire from where the model's turrets actually sit
function mdlStationTurrets(SE){if(SE._mt||!MDL.ready||SE.fac==='brood')return;const M=MDL.i[SE.kind==='depot'?'depot':'station'];SE._mt=1;devEnt(SE);if(!M||!M.tp.length)return;SE.turrets.filter(t=>!t.mod).forEach((tu,i)=>{const m=M.tp[i%M.tp.length];tu.p=[m[0]*M.s,m[1]*M.s+3,m[2]*M.s]})}
function mdlFrigTurrets(e){if(e._mt||!MDL.ready||e.side==='brood'||!e.turrets)return;const M=(MDL.i[e.cls]&&MDL.i[e.cls].tp&&MDL.i[e.cls].tp.length?MDL.i[e.cls]:MDL.i.frigate);e._mt=1;if(!M||!M.tp.length)return;const k=1.25/1.1;e.turrets.forEach((tu,i)=>{const m=M.tp[i%M.tp.length];tu.p=[m[0]*k,m[1]*k,m[2]*k]})}
// ---- ship models: lofted hulls, wings, nacelles and canopies, one design per faction and hull class
let JR=Math.random;const jit=(c,a)=>a?scaleC(c,1-a+JR()*a*2):c;
const QX90=qAxis(1,0,0,Math.PI/2,q0()),QZ90=qAxis(0,0,1,Math.PI/2,q0()),QY180=qAxis(0,1,0,Math.PI,q0());
const lerpA=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// loft along +Z: secs=[[z,halfWidth,halfHeight,yOffset]], n sides, superellipse exponent p (1 diamond, 2 ellipse, big = box)
GB.prototype.loft=function(secs,n,col,em,p,o){o=o||{};p=p||2;const rot=o.rot||0,ex=2/p,jt=o.jit===undefined?.05:o.jit;
  const R=secs.map(s=>{const out=[];for(let i=0;i<n;i++){const a=i/n*TAU+rot,c=Math.cos(a),sn=Math.sin(a);out.push([s[1]*Math.sign(c)*Math.pow(Math.abs(c),ex),(s[3]||0)+s[2]*Math.sign(sn)*Math.pow(Math.abs(sn),ex),s[0]])}return out});
  for(let k=0;k<secs.length-1;k++){const A=R[k],B=R[k+1],cz=(secs[k][0]+secs[k+1][0])/2,cy=((secs[k][3]||0)+(secs[k+1][3]||0))/2;
    for(let i=0;i<n;i++){const j=(i+1)%n,cc=o.colFn?o.colFn(k,i,A[i]):col;this.quad(A[i],A[j],B[j],B[i],jit(cc,jt),o.emFn?o.emFn(k,i):em,[0,cy,cz])}}
  const s0=secs[0],s1=secs[secs.length-1];
  if(s0[1]>0&&o.capB!==false)for(let i=0;i<n;i++)this.tri([0,s0[3]||0,s0[0]],R[0][i],R[0][(i+1)%n],o.capCol||col,o.capEm===undefined?em:o.capEm,[0,s0[3]||0,s0[0]+1]);
  if(s1[1]>0&&o.capF!==false)for(let i=0;i<n;i++)this.tri([0,s1[3]||0,s1[0]],R[R.length-1][i],R[R.length-1][(i+1)%n],col,em,[0,s1[3]||0,s1[0]-1]);
  return this};
// wing panel from root to tip: [x,y,zLeading,zTrailing,thickness]; sharp leading edge, optional glowing edge line
GB.prototype.wing=function(r,t,col,em,L,lc){const RL=[r[0],r[1],r[2]],TL=[t[0],t[1],t[2]],RTt=[r[0],r[1]+r[4],r[3]],RTb=[r[0],r[1]-r[4],r[3]],TTt=[t[0],t[1]+t[4],t[3]],TTb=[t[0],t[1]-t[4],t[3]];
  const c=[(r[0]+t[0])/2,(r[1]+t[1])/2,(r[2]+r[3]+t[2]+t[3])/4];
  this.quad(RL,TL,TTt,RTt,jit(col,.04),em,c);this.quad(RL,RTb,TTb,TL,jit(scaleC(col,.78),.04),em,c);this.quad(RTt,TTt,TTb,RTb,scaleC(col,.6),em,c);this.tri(TL,TTt,TTb,col,em,c);this.tri(RL,RTt,RTb,col,em,c);
  if(L){const A=this.P(RL),B=this.P(TL);L.d.push(A[0],A[1],A[2],0,0,0,lc[0],lc[1],lc[2],1,B[0],B[1],B[2],0,0,0,lc[0],lc[1],lc[2],1)}return this};
function nacelle(g,x,y,z0,z1,r,col,glow,eng){g.set(x,y,0).loft([[z0,r*.8,r*.8],[z0+.05,r,r],[z1-.12,r*.95,r*.95],[z1,r*.45,r*.45]],8,col,0,2,{capCol:glow,capEm:1});g.set(x,y,z0+.07,QX90).torus(r*1.04,r*.12,12,3,glow,.85);eng.push([x,y,z0,r])}
function canopy(g,z0,z1,y,w,h,glass){g.set(0,y,0).loft([[z0,w*.5,h*.4],[z0+(z1-z0)*.4,w,h],[z1,w*.15,h*.2]],10,glass,.55,2.2,{jit:0})}
function barrel(g,x,y,z0,z1,r,col,tip){g.set(x,y,0).loft([[z0,r,r],[z1,r*.8,r*.8]],6,col,0,2);g.set(x,y,z1).box(r*2.4,r*2.4,.05,tip,1)}
function buildBrood(cls,g,L,eng,fc){
  const CH=[.2,.23,.16],FL=[.44,.28,.33],BN=[.66,.62,.5],S2=f=>{f(1);f(-1)},shell=(k,i,p)=>p[1]>.02?CH:FL;
  const sp=(x,y,z,dx,dy,dz,len,r,col)=>{const up=Math.abs(dy)>.9*hyp(dx,dy,dz)?[1,0,0]:[0,1,0];g.set(x,y,z,qLook(dx,dy,dz,up[0],up[1],up[2],q0())).loft([[0,r,r],[len*.45,r*.6,r*.6],[len,.006,.006]],5,col||BN,0,2,{capF:false,jit:.12})};
  const sac=(x,y,z,r)=>g.set(x,y,z).sphere(r,5,7,fc,1),vent=(x,y,z,r)=>{g.set(x,y,z).sphere(r*.9,4,6,fc,1);eng.push([x,y,z,r])};
  if(cls==='interceptor'){g.set().loft([[-1,.05,.05],[-.7,.16,.12],[-.2,.24,.17,.02],[.35,.2,.15,.02],[.8,.12,.09],[1.05,.03,.03]],9,FL,0,1.7,{colFn:shell,jit:.14});
    S2(s=>{sp(.08*s,0,.9,.18*s,-.02,1,.45,.04);for(let i=0;i<3;i++)sp(.16*s,-.02,.25-i*.3,s,-.25,-.35-i*.15,.75-i*.1,.04,CH)});sac(0,.12,-.2,.08);vent(0,0,-1,.09)}
  else if(cls==='striker'){g.set().loft([[-1.05,.06,.06],[-.75,.2,.16],[-.2,.3,.22,.03],[.4,.26,.2,.03],[.9,.14,.12],[1.2,.03,.03]],10,FL,0,1.8,{colFn:shell,jit:.14});
    S2(s=>{g.set().wing([.2*s,0,.3,-.4,.05],[1.05*s,-.05,-.55,-.85,.01],FL,0,L,fc);sp(.95*s,-.05,-.55,.3*s,0,1,.55,.03);sp(.12*s,0,1,.15*s,0,1,.35,.04)});
    for(let i=0;i<4;i++)sp(0,.2,.5-i*.35,0,1,-.4,.3,.035,CH);sac(0,-.15,.1,.1);vent(.1,0,-1.05,.08);vent(-.1,0,-1.05,.08)}
  else if(cls==='heavy'){g.set().loft([[-1,.1,.08],[-.7,.38,.3],[-.1,.48,.4,.05],[.45,.42,.34,.05],[.85,.26,.2],[1.1,.06,.05]],12,FL,0,1.9,{colFn:shell,jit:.14});
    g.set(0,.06,0).loft([[-.75,.3,.22,.05],[-.1,.52,.36,.12],[.5,.46,.3,.1],[.9,.26,.14,.04]],12,CH,0,2.6,{jit:.16,capB:false,capF:false});
    for(let i=0;i<5;i++){const z=.6-i*.3;S2(s=>sp(.3*s,.25,z,.7*s,.8,-.2,.42,.05))}S2(s=>{sp(.18*s,-.05,1.05,.25*s,-.1,1,.5,.06);sac(.32*s,-.2,-.3,.11);vent(.22*s,-.05,-1,.11)})}
  else if(cls==='bomber'){g.set().loft([[-1,.1,.1],[-.6,.42,.38],[0,.55,.5],[.5,.45,.4],[.95,.22,.2],[1.1,.08,.08]],12,FL,0,2,{colFn:shell,jit:.12});
    for(let i=0;i<3;i++)S2(s=>sac(.32*s,-.38,.35-i*.32,.13));g.set(0,-.1,1.08,QX90).torus(.12,.04,10,4,fc,.9);
    for(let i=0;i<4;i++){const a=i/4*TAU;sp(Math.cos(a)*.18,Math.sin(a)*.18,-.95,Math.cos(a)*.3,Math.sin(a)*.3,-1,.7,.045,FL)}S2(s=>sp(.45*s,.2,.2,s,.3,-.3,.55,.05,CH));vent(0,0,-1.05,.12)}
  else if(cls==='prospector'||cls==='freighter'){const b=cls==='freighter'?1.15:1;g.set().loft([[-1,.12,.1],[-.6,.45*b,.38*b],[0,.55*b,.48*b,.04],[.55,.48*b,.4*b],[.95,.32,.28]],12,FL,0,2,{colFn:shell,jit:.12,capF:false});
    g.set(0,0,.95,QX90).torus(.26,.07,12,4,BN,0);g.set(0,0,.9).sphere(.2,5,7,fc,.8);for(let i=0;i<6;i++){const a=i/6*TAU;sp(Math.cos(a)*.3,Math.sin(a)*.3,1,Math.cos(a)*.5,Math.sin(a)*.5,1,.4,.03,FL)}S2(s=>{sac(.4*s,.15,-.2,.1);vent(.2*s,0,-1,.1)})}
  else if(cls==='constructor'){g.set().loft([[-1,.1,.1],[-.5,.4,.36],[.2,.5,.44,.05],[.8,.32,.28],[1.05,.1,.1]],12,FL,0,2,{colFn:shell,jit:.12});
    for(let i=0;i<5;i++)sac(Math.cos(i*1.3)*.3,.36+Math.sin(i*1.3)*.08,.4-i*.25,.12);S2(s=>{sp(.3*s,0,.6,.6*s,-.1,.8,.6,.06,CH);vent(.2*s,0,-1,.1)})}
  else if(cls==='frigate'){g.set().loft([[-1,.12,.1],[-.7,.32,.28],[-.2,.42,.36,.04],[.35,.38,.32,.04],[.8,.24,.2],[1.08,.06,.06]],14,FL,0,2,{colFn:shell,jit:.14});
    for(let i=0;i<7;i++){const z=.75-i*.25;S2(s=>sp(.25*s,.22,z,.5*s,.9,-.2,.35,.04));sac(0,-.3,z,.07)}g.set(0,0,1,QX90).torus(.14,.05,12,4,fc,.9);
    for(let i=0;i<6;i++){const a=i/6*TAU;sp(Math.cos(a)*.2,Math.sin(a)*.2,-.95,Math.cos(a)*.4,Math.sin(a)*.4,-1,.9,.05,FL)}vent(0,0,-1.05,.12)}
  else if(cls==='scout'){g.set().loft([[-1,.04,.04],[-.5,.12,.1],[.3,.14,.12],[.9,.06,.05]],8,FL,0,1.8,{colFn:shell,jit:.14});g.set(0,.25,.7).sphere(.16,5,7,fc,1);sp(0,.05,.6,0,1,.2,.25,.03,CH);S2(s=>{sp(.06*s,0,-.4,s,-.1,-1,.8,.03,CH)});vent(0,0,-1,.08)}
  else{g.set().sphere(.5,5,7,FL,0);sac(0,0,.4,.16);for(let i=0;i<6;i++){const a=i/6*TAU;sp(Math.cos(a)*.4,Math.sin(a)*.4,0,Math.cos(a),Math.sin(a),-.3,.6,.07,CH)}vent(0,0,-.5,.12)}}
// frigate: a long armoured spine with a raised bridge, dorsal gun mounts, side armour bands and a heavy drive block
function buildFrigate(fk,g,L,eng,fc){const H=fk==='pirate'?[.55,.5,.42]:mixC([.6,.62,.66],fc,.1),D=scaleC(H,.5),S2=f=>{f(1);f(-1)};
  g.set().loft([[-1,.18,.16],[-.8,.26,.22],[-.2,.3,.24,.02],[.5,.24,.2,.02],[.9,.14,.12],[1.05,.05,.05]],10,H,0,2.6,{colFn:(k,i,p)=>p[1]<-.05?D:H,jit:.04});
  g.set(0,.28,-.35).box(.22,.16,.4,H);g.set(0,.38,-.38).box(.16,.06,.24,[.55,.85,1],.8);
  for(const z of[.55,.2,-.05]){g.set(0,.27,z).cyl(.07,.08,.06,8,D);g.set(0,.31,z+.12).box(.025,.025,.2,D)}
  S2(s=>{g.set(.28*s,0,-.1).box(.12,.18,1.2,D);g.set(.29*s,.02,-.1).box(.135,.03,1.1,fc,.6);nacelle(g,.22*s,-.05,-1.12,-.75,.1,D,fc,eng);g.set(.36*s,-.04,.35).box(.06,.06,.4,D);g.set(.2*s,-.12,.6).cyl(.04,.05,.05,6,D)});
  nacelle(g,0,.05,-1.15,-.8,.13,D,fc,eng);g.set(0,-.2,.2).box(.16,.08,.7,D)}
function buildConstructor(fk,g,L,eng,fc){const H=fk==='pirate'?[.55,.5,.42]:mixC([.62,.64,.68],fc,.12),D=scaleC(H,.45),S2=f=>{f(1);f(-1)};
  g.set().loft([[-1.05,.16,.16],[-.8,.22,.2],[.5,.22,.2],[.8,.18,.16],[1.05,.08,.08]],8,H,0,3,{jit:.04});g.set(0,.1,.72).box(.46,.26,.4,H);canopy(g,.72,.98,.22,.2,.08,[.55,.85,1]);
  S2(s=>{g.set(.48*s,0,-.1).box(.1,.46,1.3,D);g.set(.48*s,.25,-.1).box(.12,.05,1.32,fc,.5);nacelle(g,.48*s,-.2,-1.1,-.6,.12,D,fc,eng);for(const z of[-.5,0,.5])g.set(.26*s,0,z).box(.42,.06,.06,D)});
  g.set(0,.3,.05).box(.08,.32,.08,D);g.set(0,.48,.35).box(.06,.06,.8,D);g.set(0,.4,.75).box(.04,.2,.04,fc,.8);g.set(0,-.05,-.1).torus(.62,.035,24,4,fc,.6)}
function buildScout(fk,g,L,eng,fc){const H=fk==='pirate'?[.6,.56,.46]:mixC([.78,.8,.84],fc,.1),D=scaleC(H,.4),S2=f=>{f(1);f(-1)};
  g.set().loft([[-1,.05,.05],[-.7,.12,.1],[0,.15,.12,.02],[.7,.1,.08],[1.3,.015,.015]],8,H,0,2.2,{colFn:(k,i,p)=>p[1]<-.02?D:H});canopy(g,.2,.7,.1,.1,.08,[.55,.9,1]);
  g.set(0,.2,-.25).cyl(.02,.02,.3,5,D);g.set(0,.36,-.25).torus(.24,.03,18,3,fc,.8);g.set(0,.36,-.25).sphere(.05,3,5,fc,1);g.set(0,.08,.9).box(.02,.02,.7,D);
  S2(s=>{g.set().wing([.08*s,0,0,-.5,.03],[.62*s,-.04,-.48,-.68,.01],H,0,L,fc);nacelle(g,.13*s,-.04,-1.05,-.45,.07,D,fc,eng)})}
function buildShip(fk,cls,g,L,eng){
  const fc=hexRGB(fk==='pirate'?PIRATE.col:FACTIONS[fk].col),S2=f=>{f(1);f(-1)};
  if(fk==='brood'){buildBrood(cls,g,L,eng,fc);return}if(cls==='frigate'){buildFrigate(fk,g,L,eng,fc);return}if(cls==='gunboat'){buildGunboat(fk,g,L,eng,fc);return}if(cls==='constructor'){buildConstructor(fk,g,L,eng,fc);return}if(cls==='scout'){buildScout(fk,g,L,eng,fc);return}
  if(cls==='limpet'){const D=[.2,.21,.24],M=[.55,.57,.6];g.set(0,.06,0).cyl(.6,.66,.12,12,D,0,true);g.set(0,.13,0).cyl(.62,.62,.04,12,fc,.7);
    g.set(0,.14,0,null,1,.55,1).sphere(.46,4,10,M,0);for(let i=0;i<4;i++){const a=i/4*TAU+TAU/8;g.set(Math.cos(a)*.66,.04,Math.sin(a)*.66).box(.2,.1,.2,D)}
    g.set(0,.48,0).box(.03,.26,.03,D);g.set(0,.62,0).sphere(.09,3,6,fc,1);return}
  if(cls==='drone'){const D=[.26,.28,.32],M=[.62,.64,.68];g.set().sphere(.5,6,8,M,0);g.set().torus(.8,.07,18,4,fc,.75);g.set(0,0,.45).sphere(.15,4,6,fc,1);
    S2(s=>{g.set(.6*s,0,-.08).box(.3,.07,.46,D,0);L.seg([.8*s,0,0],[.8*s,0,-.35],fc)});nacelle(g,0,0,-.95,-.38,.16,D,fc,eng);return}
  if(fk==='halcyon'){const H=[.8,.84,.86],D=[.24,.3,.34],G=[.55,.9,1],under=(k,i,p)=>p[1]<-.03?D:H;
    if(cls==='striker'){ // Kite: needle fuselage, crescent wings, twin root nacelles, V-tail
      g.set().loft([[-.95,.1,.08],[-.8,.16,.12],[-.3,.2,.15,.02],[.3,.15,.13,.03],[.8,.08,.07,.01],[1.3,0,0]],10,H,0,2.4,{colFn:under});
      canopy(g,.2,.82,.11,.09,.09,G);
      S2(s=>{const r=[.12*s,0,.2,-.55,.05],t=[.98*s,-.1,-.44,-.76,.014],m=lerpA(r,t,.72);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);
        g.set().wing([.05*s,.08,-.5,-.86,.03],[.32*s,.36,-.82,-.98,.01],H,0,L,fc);nacelle(g,.24*s,-.02,-1.0,-.25,.075,D,fc,eng)});
    }else if(cls==='prospector'){ // Plover: pearl pod, laser prongs, stubby wings over big nacelles
      g.set().loft([[-.9,.2,.18],[-.6,.36,.28],[-.06,.42,.32,.02],[.06,.42,.32,.02],[.5,.34,.26,.02],[.85,.2,.16],[1.0,.08,.08]],12,H,0,2.2,{colFn:(k,i,p)=>k===2?fc:under(k,i,p),emFn:k=>k===2?.25:0});
      canopy(g,.45,.92,.22,.15,.1,G);g.set(0,-.1,.98).sphere(.06,4,6,G,1);
      S2(s=>{g.set(.15*s,-.1,0).loft([[.8,.045,.045],[1.32,.015,.015]],6,D,0,2);g.set(.15*s,-.1,1.32).box(.05,.05,.05,G,1);
        const r=[.36*s,-.04,.15,-.4,.05],t=[.84*s,-.12,-.18,-.5,.03],m=lerpA(r,t,.75);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);nacelle(g,.66*s,-.16,-.85,-.05,.11,D,fc,eng)});
    }else{ // Albatross: long spine, cargo pods, high wings, four engines
      g.set().loft([[-1.05,.18,.16],[-.9,.24,.22],[.6,.24,.22],[1.0,.16,.18,.04],[1.18,.05,.06,.02]],10,H,0,3,{colFn:under});
      canopy(g,.72,1.08,.17,.13,.08,G);
      for(let k=0;k<3;k++)S2(s=>{g.set(.36*s,-.02,-.55+k*.42).box(.22,.24,.36,k===1?fc:H,0,true);g.set(.475*s,-.02,-.55+k*.42).box(.01,.03,.3,fc,1)});
      S2(s=>{const r=[.22*s,.16,-.15,-.65,.04],t=[1.05*s,.26,-.55,-.78,.015],m=lerpA(r,t,.78);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);for(const y of[.12,-.13])nacelle(g,.18*s,y,-1.18,-.75,.085,D,fc,eng)});
    }
  }else if(fk==='varkesh'){const M=[.42,.42,.44],D=[.18,.17,.17],G=[1,.42,.18];
    if(cls==='striker'){ // Talon: dagger hull, forward-swept blades, canards, twin long guns, dorsal fin
      g.set().loft([[-.95,.15,.1],[-.5,.22,.14],[.2,.18,.12,.02],[.9,.07,.06],[1.38,0,0]],6,M,0,1.3,{colFn:(k,i,p)=>k===1&&p[1]>.05?fc:p[1]<-.02?D:M});
      canopy(g,.15,.55,.11,.07,.07,G);
      S2(s=>{const r=[.13*s,0,-.05,-.6,.05],t=[.92*s,.04,.14,-.12,.014],m=lerpA(r,t,.7);g.set().wing(r,m,M,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);
        g.set().wing([.07*s,.02,.84,.66,.02],[.28*s,.02,.66,.6,.008],M,0,L,fc);barrel(g,.2*s,-.07,-.15,1.14,.026,D,G);nacelle(g,.17*s,-.05,-1.0,-.7,.06,D,fc,eng)});
      g.set(0,0,0,QZ90).wing([.1,0,-.3,-.85,.025],[.44,0,-.72,-.95,.008],fc,.25,L,fc);nacelle(g,0,0,-1.1,-.6,.15,D,fc,eng);
    }else if(cls==='prospector'){ // Gouge: hammerhead with cutting jaws and armour slabs
      g.set().loft([[-.9,.26,.2],[-.45,.36,.26],[.35,.34,.24],[.62,.28,.2]],6,M,0,1.3,{colFn:(k,i,p)=>k===1&&p[1]>0?fc:p[1]<-.05?D:M});
      g.set(0,0,.72).box(1.02,.16,.24,M,0,true);g.set(0,.085,.72).box(1.0,.012,.06,fc,.6);canopy(g,.05,.42,.24,.1,.08,G);
      S2(s=>{g.set(.43*s,-.02,1.0,qAxis(0,1,0,-.28*s,q0())).box(.09,.11,.52,D,0,true);g.set(.36*s,-.02,1.25).box(.07,.07,.07,G,1);
        g.set(.36*s,.05,-.2,qAxis(0,0,1,-.35*s,q0())).box(.06,.24,.6,M,0,true);nacelle(g,.27*s,-.02,-1.05,-.6,.12,D,fc,eng)});
    }else{ // Bulwark: armoured brick, slab plates, bridge tower, triple thrusters
      g.set().loft([[-1.05,.36,.3],[-.9,.42,.36],[.7,.42,.36],[1.0,.3,.28,.02],[1.13,.12,.12]],8,M,0,5,{colFn:(k,i,p)=>p[1]<-.1?D:M});
      S2(s=>{for(let k=0;k<3;k++)g.set(.44*s,0,-.6+k*.55,qAxis(0,0,1,.12*s,q0())).box(.05,.5,.45,k===1?fc:M,0,true);g.set().wing([.42*s,-.1,.1,-.5,.05],[.68*s,-.14,-.15,-.5,.03],M,0,L,fc)});
      g.set(0,.44,.6).box(.26,.16,.28,M,0,true);g.set(0,.48,.745).box(.22,.05,.02,G,.8);for(const x of[-.22,0,.22])nacelle(g,x,0,-1.28,-1.0,.11,D,fc,eng);
    }
  }else if(fk==='ostrova'){const V=[.27,.24,.35],Lv=[.52,.47,.64],G=[.85,.65,1];
    if(cls==='striker'){ // Wisp: teardrop with a halo ring and three radial fins
      g.set().loft([[-.78,.08,.08],[-.55,.2,.2],[0,.25,.24],[.5,.16,.16],[1.18,0,0]],12,V,0,2,{colFn:(k,i)=>i%3===0?Lv:V});
      g.set(0,0,-.15,QX90).torus(.58,.035,32,4,fc,.85);for(const a of[Math.PI/2,Math.PI/2+TAU/3,Math.PI/2+2*TAU/3])g.set(Math.cos(a)*.4,Math.sin(a)*.4,-.15,qLook(Math.cos(a),Math.sin(a),0,0,0,1,q0())).box(.025,.025,.34,Lv);
      for(const a of[-Math.PI/2,Math.PI/6,5*Math.PI/6])g.set(0,0,0,qAxis(0,0,1,a,q0())).wing([.15,0,-.25,-.7,.025],[.52,0,-.62,-.84,.008],V,0,L,fc);
      canopy(g,.25,.62,.13,.09,.08,G);g.set(0,0,-.78).sphere(.09,4,8,fc,1);eng.push([0,0,-.82,.11]);
    }else if(cls==='prospector'){ // Lumen: orb inside a gyroscope of rings, mining crystal at the nose
      g.set().loft([[-.72,.1,.1],[-.5,.36,.35],[0,.48,.45],[.45,.36,.33],[.66,.12,.12]],12,V,0,2,{colFn:(k,i)=>k%2?Lv:V});
      g.set(0,0,0,QX90).torus(.62,.03,32,4,fc,.85);g.set(0,0,0,QZ90).torus(.58,.03,32,4,fc,.85);
      g.set().loft([[.6,0,0],[.82,.11,.11],[1.25,0,0]],4,G,.9,1,{jit:0});canopy(g,.15,.5,.42,.14,.08,G);
      S2(s=>nacelle(g,.32*s,-.24,-.8,-.35,.08,V,fc,eng));
    }else{ // Cairn: stacked hull segments joined by glowing rings, crystal lanterns
      g.set(0,0,0,QX90).cyl(.16,.16,2.2,8,V,0);
      for(let k=0;k<4;k++){const z0=-1.05+k*.47;g.set().loft([[z0,.2,.2],[z0+.08,.34,.32],[z0+.34,.34,.32],[z0+.42,.2,.2]],8,k%2?Lv:V,0,2.5);if(k)g.set(0,0,z0-.025,QX90).torus(.23,.03,16,3,fc,.9)}
      g.set().loft([[.83,.2,.2],[1.18,0,0]],8,V,0,2.5);canopy(g,.6,.95,.2,.12,.08,G);
      S2(s=>{g.set(.42*s,.1,0).box(.3,.03,.03,V);g.set(.6*s,.1,0).loft([[-.08,0,0],[0,.06,.06],[.08,0,0]],4,G,.9,1,{jit:0});nacelle(g,.28*s,-.1,-1.15,-.85,.06,V,fc,eng)});
      nacelle(g,0,0,-1.25,-1.05,.17,V,fc,eng);
    }
  }else{const R=[.5,.36,.26],B=[.72,.66,.5],D=[.22,.2,.18],G=[1,.7,.3],scrap=()=>JR()<.3?B:JR()<.5?D:R;
    if(cls==='striker'){ // Cutter: mismatched wings, top-mounted engine, nose spikes, strapped crate
      g.set().loft([[-.9,.15,.12],[-.4,.2,.15,.02],[.4,.15,.12],[1.1,.03,.03]],6,R,0,1.6,{colFn:scrap});
      g.set().wing([.12,0,.1,-.45,.04],[.98,-.05,-.4,-.6,.015],R,0,L,fc);g.set().wing([-.12,0,.05,-.35,.04],[-.5,.02,-.15,-.4,.02],B,0,L,fc);barrel(g,-.5,-.04,-.3,.62,.04,D,G);
      nacelle(g,.05,.2,-1.0,-.3,.1,D,G,eng);nacelle(g,-.12,-.13,-.95,-.5,.06,R,G,eng);
      S2(s=>g.set(.06*s,0,0).loft([[1.0,.02,.02],[1.36,0,0]],4,D,0,1));canopy(g,.2,.55,.12,.08,.07,G);g.set(-.2,.16,-.2,qAxis(0,1,0,.4,q0())).box(.18,.12,.22,B,0,true);
    }else if(cls==='prospector'){ // Gouger: scrap hull with a striped drill
      g.set().loft([[-.85,.26,.22],[-.3,.32,.26],[.45,.3,.24],[.62,.24,.22]],8,R,0,3,{colFn:scrap});
      g.set().loft([[.6,.22,.22],[.75,.2,.2],[1.32,0,0]],8,D,0,2,{colFn:(k,i)=>i%2?B:D});
      nacelle(g,.3,0,-1.0,-.4,.13,D,G,eng);nacelle(g,-.28,-.05,-.9,-.5,.08,R,G,eng);g.set(.1,.27,-.1,qAxis(0,0,1,.2,q0())).box(.4,.05,.5,B,0,true);canopy(g,.1,.42,.25,.1,.07,G);
    }else{ // Scow: flat barge piled with crates
      g.set().loft([[-1.05,.45,.2],[.75,.45,.2],[1.05,.3,.16],[1.18,.15,.08]],8,R,0,6,{colFn:scrap});
      for(let k=0;k<6;k++)g.set((JR()-.5)*.5,.27+JR()*.05,-.8+k*.3,qAxis(0,1,0,JR()*.6-.3,q0())).box(.24,.16+JR()*.1,.24,JR()<.5?B:R,0,true);
      nacelle(g,.25,0,-1.25,-.85,.14,D,G,eng);nacelle(g,-.28,.02,-1.15,-.9,.08,R,G,eng);canopy(g,.8,1.05,.22,.1,.06,G);
    }
  }
}
// light, heavy and bomber hulls for every side
function buildShipX(fk,cls,g,L,eng){
  if(fk==='brood'||!['interceptor','heavy','bomber'].includes(cls))return false;
  const fc=hexRGB(fk==='pirate'?PIRATE.col:FACTIONS[fk].col),S2=f=>{f(1);f(-1)};
  if(fk==='halcyon'){const H=[.8,.84,.86],D=[.24,.3,.34],G=[.55,.9,1],under=(k,i,p)=>p[1]<-.03?D:H;
    if(cls==='interceptor'){ // Swift: small dart, deep delta wings, canards, single engine
      g.set().loft([[-.9,.08,.07],[-.7,.13,.1],[-.1,.15,.11,.01],[.5,.1,.08,.01],[1.25,0,0]],10,H,0,2.4,{colFn:under});canopy(g,.05,.6,.09,.07,.07,G);
      S2(s=>{const r=[.1*s,0,.25,-.55,.04],t=[.66*s,-.06,-.62,-.84,.012],m=lerpA(r,t,.8);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);g.set().wing([.05*s,0,.78,.62,.015],[.22*s,0,.64,.58,.006],H,0,L,fc)});
      nacelle(g,0,-.03,-1.05,-.45,.1,D,fc,eng);g.set(0,0,0,QZ90).wing([.08,0,-.4,-.8,.02],[.3,0,-.72,-.9,.008],fc,.25,L,fc);
    }else if(cls==='heavy'){ // Osprey: twin-boom gunship, four cannons
      g.set().loft([[-1.0,.16,.14],[-.7,.24,.18],[.2,.26,.2,.03],[.75,.16,.13,.02],[1.15,.04,.04]],12,H,0,2.6,{colFn:under});canopy(g,.35,.9,.17,.11,.1,G);
      S2(s=>{g.set(.5*s,-.02,0).loft([[-1.05,.07,.07],[-.9,.1,.1],[.5,.09,.09],[.8,.03,.03]],8,H,0,2,{colFn:(k,i,p)=>p[1]<-.03?D:H});
        const r=[.2*s,0,.35,-.4,.05],t=[1.05*s,-.04,-.15,-.45,.02],m=lerpA(r,t,.82);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);
        nacelle(g,.5*s,-.02,-1.2,-.85,.1,D,fc,eng);barrel(g,.5*s,-.09,.4,1.05,.025,D,G);barrel(g,.22*s,-.13,.2,.95,.02,D,G);g.set().wing([.48*s,.08,-.55,-.95,.025],[.55*s,.36,-.82,-1.02,.01],H,0,L,fc)});
    }else{ // Condor: flying-wing bomber, torpedoes slung under the wings
      g.set().loft([[-1.0,.3,.14],[-.6,.5,.18],[.1,.42,.17,.02],[.7,.22,.12,.02],[1.05,.06,.05]],12,H,0,3,{colFn:under});canopy(g,.45,.92,.15,.12,.08,G);g.set(0,-.17,-.1).box(.36,.03,.9,fc,.5);
      S2(s=>{const r=[.35*s,0,.2,-.75,.06],t=[1.25*s,.08,-.45,-.8,.02],m=lerpA(r,t,.85);g.set().wing(r,m,H,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);
        for(const x of[.6,.9])g.set(x*s,-.1,0).loft([[-.35,.04,.04],[-.2,.055,.055],[.3,.055,.055],[.45,0,0]],8,D,0,2,{capCol:[1,.8,.4],capEm:1});
        nacelle(g,.32*s,.02,-1.15,-.55,.11,D,fc,eng);g.set().wing([1.2*s,.06,-.45,-.78,.02],[1.24*s,.32,-.68,-.85,.008],H,0,L,fc)});
    }
  }else if(fk==='varkesh'){const M=[.42,.42,.44],D=[.18,.17,.17],G=[1,.42,.18],pan=(k,i,p)=>k===1&&p[1]>.03?fc:p[1]<-.03?D:M;
    if(cls==='interceptor'){ // Fang: diamond arrowhead, short blades, one big engine
      g.set().loft([[-.85,.12,.08],[-.4,.17,.1],[.3,.12,.08,.01],[1.3,0,0]],4,M,0,1.1,{colFn:pan});canopy(g,.05,.45,.08,.06,.06,G);
      S2(s=>{g.set().wing([.12*s,0,0,-.55,.035],[.62*s,.06,-.3,-.62,.01],M,0,L,fc);barrel(g,.13*s,-.05,0,.9,.018,D,G)});
      nacelle(g,0,0,-1.0,-.5,.13,D,fc,eng);g.set(0,0,0,QZ90).wing([.08,0,-.25,-.75,.02],[.38,0,-.68,-.88,.008],fc,.25,L,fc);
    }else if(cls==='heavy'){ // Halberd: armoured gun deck with twin heavy barrels
      g.set().loft([[-1.0,.26,.18],[-.6,.32,.22],[.4,.3,.2,.02],[.85,.18,.14],[1.12,.06,.06]],8,M,0,1.4,{colFn:pan});canopy(g,.15,.55,.2,.1,.08,G);
      S2(s=>{barrel(g,.13*s,.22,-.3,1.3,.04,D,G);g.set(.13*s,.22,-.35).box(.14,.1,.3,M,0,true);
        const r=[.28*s,0,.2,-.6,.06],t=[.95*s,-.08,-.05,-.55,.025],m=lerpA(r,t,.75);g.set().wing(r,m,M,0,L,fc);g.set().wing(m,t,fc,.3,L,fc);g.set(.8*s,-.08,-.3).box(.08,.18,.4,D,0,true);nacelle(g,.2*s,-.04,-1.2,-.7,.13,D,fc,eng)});
    }else{ // Maul: heavy wedge with twin torpedo tubes and quad drives
      g.set().loft([[-1.1,.4,.2],[-.6,.48,.24],[.5,.38,.2,.02],[1.0,.18,.12],[1.15,.05,.05]],6,M,0,1.3,{colFn:pan});canopy(g,.45,.85,.2,.1,.07,G);g.set(0,.24,-.4).box(.08,.14,.6,fc,.3);
      S2(s=>{g.set(.24*s,-.25,0).loft([[-.8,.09,.09],[.75,.09,.09],[.9,.05,.05]],8,D,0,2,{capCol:G,capEm:1});g.set(.24*s,-.25,.9).box(.08,.08,.04,[1,.75,.3],1);
        g.set().wing([.4*s,0,-.1,-.8,.06],[1.0*s,-.1,-.45,-.85,.025],M,0,L,fc);for(const y of[.08,-.12])nacelle(g,.28*s,y,-1.35,-1.0,.1,D,fc,eng)});
    }
  }else if(fk==='ostrova'){const V=[.27,.24,.35],Lv=[.52,.47,.64],G=[.85,.65,1],band=(k,i)=>i%3===0?Lv:V;
    if(cls==='interceptor'){ // Mote: bright seed pod in a single ring
      g.set().loft([[-.6,.08,.08],[-.45,.24,.24],[0,.3,.3],[.35,.2,.2],[.7,.05,.05]],12,V,0,2,{colFn:band});g.set().loft([[.65,0,0],[.82,.07,.07],[1.15,0,0]],4,G,.9,1,{jit:0});
      g.set(0,0,-.05,QX90).torus(.46,.03,28,4,fc,.85);for(const a of[0,Math.PI])g.set(0,0,0,qAxis(0,0,1,a,q0())).wing([.25,0,-.15,-.55,.02],[.62,0,-.45,-.7,.008],V,0,L,fc);
      canopy(g,.1,.4,.25,.09,.07,G);g.set(0,0,-.62).sphere(.08,4,8,fc,1);eng.push([0,0,-.66,.1]);
    }else if(cls==='heavy'){ // Vigil: long teardrop, double halo, four fins, crystal lances
      g.set().loft([[-1.0,.1,.1],[-.75,.26,.26],[-.1,.32,.3],[.5,.22,.2],[1.2,0,0]],12,V,0,2,{colFn:band});for(const z of[-.45,.25])g.set(0,0,z,QX90).torus(z<0?.6:.48,.03,32,4,fc,.85);
      for(let a=0;a<4;a++)g.set(0,0,0,qAxis(0,0,1,Math.PI/4+a*Math.PI/2,q0())).wing([.25,0,-.4,-.9,.025],[.7,0,-.8,-1.05,.008],V,0,L,fc);
      S2(s=>{g.set(.36*s,-.05,0).loft([[.1,0,0],[.3,.05,.05],[.85,0,0]],4,G,.9,1,{jit:0});nacelle(g,.18*s,0,-1.1,-.75,.08,V,fc,eng)});canopy(g,.3,.75,.22,.1,.08,G);
    }else{ // Obelisk: crystal spire ringed with torpedo shards
      g.set().loft([[-1.1,.12,.12],[-.8,.32,.32],[.6,.26,.26],[1.25,0,0]],4,V,0,1,{rot:Math.PI/4,colFn:(k,i)=>i%2?Lv:V});for(const z of[-.6,0,.5])g.set(0,0,z,QX90).torus(.42,.03,28,4,fc,.85);
      for(let a=0;a<6;a++){const an=a/6*TAU;g.set(Math.cos(an)*.42,Math.sin(an)*.42,-.1).loft([[-.3,0,0],[-.15,.05,.05],[.25,.05,.05],[.4,0,0]],4,G,.8,1,{jit:0})}
      canopy(g,.35,.8,.22,.1,.08,G);nacelle(g,0,0,-1.35,-1.05,.18,V,fc,eng);S2(s=>nacelle(g,.3*s,0,-1.2,-.9,.07,V,fc,eng));
    }
  }else{const R=[.5,.36,.26],B=[.72,.66,.5],D=[.22,.2,.18],G=[1,.7,.3],scrap=()=>JR()<.3?B:JR()<.5?D:R;
    if(cls==='interceptor'){ // Dart: a spar with one wing and an engine strapped on top
      g.set().loft([[-.85,.1,.08],[-.3,.13,.1],[.5,.08,.07],[1.15,0,0]],6,R,0,1.6,{colFn:scrap});g.set().wing([.08,0,.1,-.4,.03],[.7,-.03,-.3,-.5,.01],R,0,L,fc);g.set().wing([-.08,0,0,-.3,.03],[-.35,.05,-.15,-.35,.01],B,0,L,fc);
      nacelle(g,0,.12,-.95,-.4,.09,D,G,eng);canopy(g,.05,.4,.1,.06,.06,G);barrel(g,-.12,-.06,-.1,.8,.02,D,G);
    }else if(cls==='heavy'){ // Brute: plated scrap hull, two big guns
      g.set().loft([[-1.0,.3,.24],[-.4,.36,.28],[.5,.32,.24],[.95,.16,.14]],8,R,0,2.5,{colFn:scrap});for(let k=0;k<4;k++)g.set((JR()-.5)*.6,.2+JR()*.12,-.6+k*.4,qAxis(0,1,0,JR()*.5-.25,q0())).box(.3,.06,.3,JR()<.5?B:D,0,true);
      S2(s=>{barrel(g,.3*s,-.05,-.2,1.2,.04,D,G);g.set().wing([.3*s,0,.1,-.5,.05],[.8*s,-.06+JR()*.1,-.15,-.5,.02],JR()<.5?R:B,0,L,fc)});
      nacelle(g,.18,0,-1.2,-.8,.13,D,G,eng);nacelle(g,-.2,.05,-1.1,-.85,.1,R,G,eng);canopy(g,.2,.6,.27,.1,.08,G);
    }else{ // Wrecker: barge with a ram-launcher tube on its back
      g.set().loft([[-1.1,.42,.22],[.6,.42,.22],[1.0,.25,.16]],8,R,0,4,{colFn:scrap});g.set(0,.32,0).loft([[-.7,.13,.13],[.9,.13,.13],[1.0,.08,.08]],10,D,0,2,{capCol:G,capEm:1});g.set(0,.32,1.0).box(.1,.1,.04,[1,.75,.3],1);
      for(let k=0;k<3;k++)g.set(.32*(k%2?1:-1),.28,-.7+k*.35).box(.18,.14,.22,JR()<.5?B:R,0,true);S2(s=>nacelle(g,.28*s,-.02,-1.3,-.95,.12,D,G,eng));canopy(g,.6,.95,.24,.1,.06,G);
    }
  }
  return true}
const MESH_BASE={scout2:'scout',picket:'interceptor',skiff:'prospector',dredger:'prospector',courier:'freighter',bulker:'freighter'};
// gunboat: stubby armoured hull, twin forward cannons, side armour pods, stub wings, twin engines and a dorsal turret ring at the back
function buildGunboat(fk,g,L,eng,fc){const H=mixC([.7,.72,.76],fc,.14),D=[.22,.24,.28],M=[.5,.52,.56],G=[.55,.85,1],under=(k,i,p)=>p[1]<-.04?D:H,S2=f=>{f(1);f(-1)};
  g.set().loft([[-1,.2,.15],[-.72,.3,.21],[-.1,.34,.24,.02],[.5,.27,.19,.02],[.95,.12,.09],[1.12,.02,.02]],10,H,0,2.3,{colFn:under});
  canopy(g,.2,.82,.2,.16,.12,G);
  S2(s=>{g.set(.36*s,-.02,-.15).box(.2,.24,1.05,D);g.set(.47*s,-.02,-.15).box(.03,.1,.9,fc,.55);
    g.set(.68*s,-.04,-.28).box(.55,.05,.5,H);g.set(.94*s,-.04,-.3).box(.05,.09,.45,fc,.6);
    g.set(.2*s,-.08,.86).box(.07,.07,.74,M);g.set(.2*s,-.08,1.24).box(.09,.09,.05,fc,1);L.seg([.2*s,-.08,.5],[.2*s,-.08,1.22],fc);
    nacelle(g,.25*s,0,-1.06,-.55,.13,D,fc,eng)});
  g.set(0,.31,-.38).cyl(.22,.26,.07,14,D);g.set(0,.35,-.38).torus(.23,.025,16,3,fc,.7)}
function gturretMesh(fac){const key='gt'+fac;if(MESH[key])return MESH[key];const fc=hexRGB(sideCol(fac)),H=mixC([.7,.72,.76],fc,.14),D=[.22,.24,.28],M=[.5,.52,.56],G=[.55,.85,1],g=new GB(),L=new GB();
  g.set(0,.05,0).sphere(.17,6,10,H,0);g.set(0,-.02,0).cyl(.19,.19,.06,12,D);g.set(0,.09,.12).box(.15,.06,.08,G,.6);
  for(const s of[-1,1]){g.set(.085*s,.03,.32).box(.045,.045,.48,M);g.set(.085*s,.03,.57).box(.06,.06,.04,fc,1);L.seg([.085*s,.03,.1],[.085*s,.03,.56],fc)}
  return MESH[key]={hull:g.upload(),rim:L.upload(true)}}
// Brood hulls are grown models of their own in the model pack
const BROOD_MDL={interceptor:'b_skitter',picket:'b_mite',drone:'b_mite',striker:'b_thresher',gunboat:'b_thresher',heavy:'b_carapace',bomber:'b_sporemaw',skiff:'b_grazer',prospector:'b_grazer',dredger:'b_grazer',courier:'b_gorger',freighter:'b_gorger',bulker:'b_gorger',constructor:'b_weaver',scout:'b_watcher',scout2:'b_watcher',frigate:'b_hive',escort:'b_prowler',carrier:'b_hive'};
// the fleet carrier: a long armoured flight deck over a heavy hull, a bow hangar mouth, side bays, an island bridge to
// starboard and four big drives. Built in model space (bow at +z, about 2 units long) in the faction's colours.
function carrierMesh(fac){const pal=mdlPal(fac),C=pal.c,LT=C[0],MD=C[1],DK=C[2],AC=C[3],GL=C[4],FG=C[5],WN=C[6],g=new GB(),L=new GB(),eng=[];
  g.set(0,-.06,-.04).box(.44,.2,1.72,MD);g.set(0,-.2,0).box(.3,.12,1.5,DK);
  g.set(0,.065,0).box(.64,.035,1.92,LT);g.set(0,.05,.99).box(.5,.06,.12,MD);
  for(let z=-.8;z<=.82;z+=.16)g.set(0,.085,z).box(.018,.006,.07,FG,.9);
  for(const x of[-.3,.3])for(let z=-.88;z<=.9;z+=.22)g.set(x,.085,z).box(.02,.008,.02,AC,.8);
  g.set(0,-.05,.925).box(.42,.13,.03,[.025,.03,.04]);g.set(0,.025,.93).box(.46,.02,.03,AC,.6);g.set(0,-.125,.93).box(.46,.02,.03,AC,.6);
  for(const x of[-1,1]){g.set(.226*x,-.06,.05).box(.02,.11,.56,[.03,.035,.045]);g.set(.235*x,-.06,.05).box(.012,.13,.6,AC,.35);
    for(const z of[-.55,-.2,.35,.7])g.set(.235*x,-.13,z).box(.02,.02,.12,WN,.5)}
  g.set(.24,.17,-.28).box(.09,.2,.32,MD);g.set(.24,.26,-.22).box(.095,.045,.22,GL,.35);g.set(.24,.32,-.3).cyl(.012,.008,.1,6,DK);g.set(.24,.385,-.3).sphere(.018,4,8,AC,.6);
  for(const z of[-.6,-.1,.45])g.set(-.27,.0,z).box(.05,.08,.14,DK);
  g.set(0,-.06,-.93).box(.5,.22,.12,DK);
  const qz=qAxis(1,0,0,Math.PI/2,q0());for(const x of[-.23,-.08,.08,.23]){g.set(x,-.06,-.99,qz).cyl(.065,.075,.06,12,DK);g.set(x,-.06,-1.025,qz).cyl(.05,.05,.01,12,FG,.9);eng.push([x,-.06,-1.03,.07])}
  L.seg([0,0,0],[0,0,0],[0,0,0]);return{hull:g.upload(),rim:L.upload(true),eng,mdl:true}}
function shipMesh(fac,cls){if(cls==='raider')cls='interceptor';else if(cls==='corsair')cls='striker';else if(cls==='plunderer')cls='heavy';
  if(cls==='carrier'&&fac!=='brood'&&!mdlHas('carrier')){const k=fac+'carrier';return MESH[k]||(MESH[k]=carrierMesh(fac))}
  if(cls==='escort'&&fac!=='brood'&&!mdlHas('escort'))cls='frigate';if(cls==='wraith')cls='interceptor';
  const key=fac+cls;if(MESH[key])return MESH[key];
  if(fac==='brood'){const bk=BROOD_MDL[cls];if(bk&&mdlHas(bk)){const L=new GB();L.seg([0,0,0],[0,0,0],[0,0,0]);return MESH[key]={hull:mdlMesh(bk,'brood',1),rim:L.upload(true),eng:engFix(bk).map(e=>e.slice()),mdl:true}}}
  if(fac!=='brood'&&mdlHas(cls)){const L=new GB();L.seg([0,0,0],[0,0,0],[0,0,0]);return MESH[key]={hull:mdlMesh(cls,fac,1),rim:L.upload(true),eng:engFix(cls).map(e=>e.slice()),mdl:true}}
  const fk=fac==='pirate'?'pirate':fac,bc=MESH_BASE[cls]||cls;JR=mulberry(hashStr(key));const g=new GB(),L=new GB(),eng=[];if(!buildShipX(fk,bc,g,L,eng))buildShip(fk,bc,g,L,eng);
  if(bc!==cls){const fc=hexRGB(sideCol(fk)),D=[.3,.32,.36],S2=f=>{f(1);f(-1)};
    if(cls==='dredger')S2(s=>{g.set(.42*s,-.12,.55).box(.08,.08,.7,D);g.set(.42*s,-.12,.92).box(.07,.07,.07,fc,1);g.set(.52*s,0,-.2).box(.22,.3,.8,D)});
    if(cls==='bulker')for(const z of[-.45,-.05,.35])S2(s=>g.set(.5*s,.05,z).box(.26,.3,.34,z>0?mixC(D,fc,.4):D));
    if(cls==='skiff')g.set(0,.24,-.3).box(.08,.18,.3,fc,.4);
    if(cls==='courier')g.set(0,.3,-.2).box(.32,.12,.9,mixC(D,fc,.3))}
  JR=Math.random;
  if(!L.d.length)L.seg([0,0,0],[0,0,0],[0,0,0]);
  return MESH[key]={hull:g.upload(),rim:L.upload(true),eng};
}
function astMesh(v,ore){const key='a'+v+ore;if(MESH[key])return MESH[key];
  const R=mulberry(v*977+13),t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const l=hyp(...p);return p.map(c=>c/l)});
  const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const mid=new Map(),M=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(mid.has(k))return mid.get(k);const p=V[a].map((c,i)=>(c+V[b][i])/2),l=hyp(...p);V.push(p.map(c=>c/l));mid.set(k,V.length-1);return V.length-1};
  const F2=[];for(const[a,b,c]of F){const ab=M(a,b),bc=M(b,c),ca=M(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}
  V=V.map(p=>{const s=.72+R()*.42;return[p[0]*s,p[1]*s*.85,p[2]*s]});
  const rock=ore==='comet'?[.32,.27,.42]:[.44,.43,.46],oc=hexRGB(ore==='comet'?ITEMS.xc.col:ITEMS[ore].col),g=new GB();
  for(const[a,b,c]of F2){const vein=R()<(ore==='comet'?.45:ore==='au'?.38:.22);g.tri(V[a],V[b],V[c],vein?mixC(rock,oc,.75):scaleC(mixC(rock,oc,.14),.8+R()*.35),vein?(ore==='comet'?.7:ore==='au'?.85:.35):0,[0,0,0])}
  return MESH[key]=g.upload();
}
function stationMesh(fac,kind){if(fac==='brood')return broodMesh();const mk=kind==='depot'?'depot':'station';if(mdlHas(mk)){const key='sm'+fac+mk;if(MESH[key])return MESH[key];const e=new GB();e.seg([0,0,0],[0,0,0],[0,0,0]);return MESH[key]={core:mdlMesh(mk,fac,MDL.i[mk].s),spin:e.upload(true)}}
  const key='st'+fac;if(MESH[key])return MESH[key];const fc=hexRGB(sideCol(fac)),hull=mixC([.48,.5,.55],fc,.15),dk=scaleC(hull,.7);
  const a=new GB();a.sphere(44,8,12,hull);a.set(0,0,0).cyl(7,10,190,8,dk);for(const y of[-98,98])a.set(0,y,0).sphere(7,4,6,fc,1);a.set(0,0,0).torus(56,4,24,4,fc,.9);
  for(let i=0;i<4;i++){const an=i/4*TAU+.4;a.set(Math.cos(an)*30,-30,Math.sin(an)*30,qLook(Math.cos(an),.5,Math.sin(an),0,1,0,q0())).box(14,14,40,dk,0,true)}
  const b=new GB();b.torus(120,10,36,6,hull,0,true);b.torus(120,2.4,36,4,fc,1);b.set(0,10.5,0).torus(120,1.8,36,3,fc,1);
  for(let i=0;i<6;i++){const an=i/6*TAU;b.set(Math.cos(an)*82,0,Math.sin(an)*82,qLook(Math.cos(an),0,Math.sin(an),0,1,0,q0())).box(7,7,76,dk);b.set(Math.cos(an)*120,-14,Math.sin(an)*120).box(10,8,10,fc,1)}
  return MESH[key]={core:a.upload(),spin:b.upload()}}
// the Bloom Heart (and, scaled down, a Bloom Node): a living mass of chitin, veins and spines, ringed by drifting spore pods
function broodMesh(){if(MESH.brood)return MESH.brood;const fc=hexRGB(FACTIONS.brood.col),FL=[.42,.27,.31],CH=[.2,.23,.16],BN=[.62,.58,.48];
  const a=new GB();a.sphere(56,9,13,FL);
  for(let i=0;i<10;i++){const d=rdir(),r=rnd(16,32);a.set(d.x*50,d.y*46,d.z*50).sphere(r,6,9,i%2?CH:FL)}
  for(let i=0;i<6;i++){const d=rdir();a.set(0,0,0,qLook(d.x,d.y,d.z,Math.abs(d.y)>.9?1:0,Math.abs(d.y)>.9?0:1,0,q0())).torus(rnd(56,66),1.6,26,3,fc,.9)}
  for(let i=0;i<16;i++){const d=rdir(),L0=rnd(55,115),r=rnd(5,9);a.set(d.x*48,d.y*48,d.z*48,qLook(d.x,d.y,d.z,Math.abs(d.y)>.9?1:0,Math.abs(d.y)>.9?0:1,0,q0())).loft([[0,r,r],[L0*.5,r*.55,r*.55],[L0,.3,.3]],6,BN,0,2,{capF:false,jit:.15})}
  for(let i=0;i<10;i++){const d=rdir();a.set(d.x*60,d.y*58,d.z*60).sphere(rnd(4,8),4,6,fc,1)}
  const b=new GB();b.torus(124,3,36,4,FL,0);for(let i=0;i<10;i++){const an=i/10*TAU;b.set(Math.cos(an)*124,Math.sin(i*1.7)*10,Math.sin(an)*124).sphere(rnd(7,11),5,7,fc,.95)}
  return MESH.brood={core:a.upload(),spin:b.upload()}}
// the Hollow Relay at the heart of the map is a large asteroid base; the other outposts use their own models
function opModel(o){return o&&o.id==='hollow'?'rockbase':o?o.type:null}
function outpostMesh(type,owner){if(type==='rockbase'&&!mdlHas(type))type='relay';const key='op'+type+owner;if(MESH[key])return MESH[key];if(mdlHas(type))return MESH[key]=mdlMesh(type,owner||'none',MDL.i[type].s);const fc=hexRGB(sideCol(owner)),hull=mixC([.48,.49,.53],fc,.16),dk=scaleC(hull,.7);
  const g=new GB();g.cyl(66,74,36,6,hull);g.set(0,24,0).cyl(40,62,14,6,dk);
  for(let i=0;i<6;i++){const an=i/6*TAU+Math.PI/6;g.set(Math.cos(an)*96,0,Math.sin(an)*96,qLook(Math.cos(an),0,Math.sin(an),0,1,0,q0())).box(12,10,46,dk,0,true);g.set(Math.cos(an)*122,0,Math.sin(an)*122).box(8,8,8,fc,1)}
  if(type==='forge'){g.set(0,-26,0).sphere(24,6,10,[1,.6,.25],.95);g.set(0,-10,0).torus(40,4,18,4,[1,.55,.2],.9)}
  else if(type==='relay'){g.set(0,58,0).cyl(3,3,60,6,dk);g.set(0,92,0).cyl(30,4,16,10,hull);g.set(0,100,0).sphere(5,4,6,fc,1)}
  else{for(let i=0;i<3;i++){const an=i/3*TAU;g.set(Math.cos(an)*40,-34,Math.sin(an)*40,qLook(Math.cos(an),-1.2,Math.sin(an),0,1,0,q0())).box(9,9,52,dk)}g.set(0,-20,0).box(26,14,26,fc,.8)}
  g.set(0,-18,0).torus(74,2,24,3,fc,1);
  return MESH[key]=g.upload()}
const GEN={},Q_ID={x:0,y:0,z:0,w:1};
function genMeshes(){
  GEN.turret=(()=>{const g=new GB();g.box(16,12,18,[.45,.47,.52]);g.set(0,0,28).box(4,4,40,[.35,.37,.4]);return g.upload()})();
  GEN.shield=new GB().sphere(1,12,18,[1,1,1],1).upload();
  GEN.ring=new GB().circleLines(1,96,[1,1,1]).upload(true);
  GEN.gate=(()=>{const g=new GB();g.set(0,0,0,qAxis(1,0,0,Math.PI/2,q0())).torus(110,8,40,6,[.55,.57,.63],0,true);for(let i=0;i<12;i++){const a=i/12*TAU;g.set(Math.cos(a)*110,Math.sin(a)*110,0).box(9,9,20,[1,1,1],1)}return g.upload()})();
  GEN.disc=(()=>{const g=new GB();for(let i=0;i<48;i++){const a=i/48*TAU,b=(i+1)/48*TAU;g.tri([0,0,0],[Math.cos(a)*104,Math.sin(a)*104,0],[Math.cos(b)*104,Math.sin(b)*104,0],[1,1,1],1)}return g.upload()})();
  GEN.crate=new GB().box(1,1,1,[.5,.48,.42],0,true).upload();
  // sector beacon: a spiked mast on a finned hub, a lamp at the top and a spinning halo, both lit in the holder's colour
  GEN.bcn=(()=>{const g=new GB(),M=[.5,.52,.57],D=[.22,.24,.28];g.set(0,-8,0).cyl(16,22,10,10,D);g.set(0,-26,0).cyl(1.5,14,26,10,M);g.set(0,22,0).cyl(3.6,2.4,50,8,M);g.set(0,-2,0).torus(25,3,24,6,M,0,true);
    for(let i=0;i<3;i++){const a=i/3*TAU;g.set(Math.cos(a)*22,-8,Math.sin(a)*22,qAxis(0,1,0,-a,q0())).box(18,7,3,D)}for(let i=0;i<2;i++)g.set(0,40,0,qAxis(0,1,0,i*Math.PI/2,q0())).box(26,2,2,D);return g.upload()})();
  GEN.bcnL=(()=>{const g=new GB(),W1=[1,1,1];g.set(0,50,0).sphere(6.5,8,10,W1,1);for(let i=0;i<6;i++){const a=i/6*TAU;g.set(Math.cos(a)*25,1.5,Math.sin(a)*25).box(4,3,4,W1,1)}for(const s of[-1,1])g.set(13*s,40,0).box(3,3,3,W1,1);return g.upload()})();
  GEN.bcnRing=(()=>{const g=new GB();g.set(0,0,0).torus(34,1.4,40,5,[1,1,1],1);return g.upload()})();
  GEN.bcnZone=new GB().circleLines(1,72,[1,1,1]).upload(true);
  GEN.crateL=(()=>{const g=new GB(),x=.52,c=[1,1,1];const v=[[-x,-x,-x],[x,-x,-x],[x,x,-x],[-x,x,-x],[-x,-x,x],[x,-x,x],[x,x,x],[-x,x,x]];for(const[a,b]of[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])g.seg(v[a],v[b],c);return g.upload(true)})();
  const d=[];const nl=24,nm=48,R=1000;for(let i=0;i<nl;i++)for(let j=0;j<nm;j++){const P=(a,b)=>{const t=a/nl*Math.PI,p=b/nm*TAU;return[Math.sin(t)*Math.cos(p)*R,Math.cos(t)*R,Math.sin(t)*Math.sin(p)*R,b/nm,a/nl]};const A=P(i,j),B=P(i,j+1),C=P(i+1,j+1),D=P(i+1,j);d.push(...A,...B,...C,...A,...C,...D)}
  GEN.sky={buf:G.createBuffer(),n:d.length/5};G.bindBuffer(G.ARRAY_BUFFER,GEN.sky.buf);G.bufferData(G.ARRAY_BUFFER,new Float32Array(d),G.STATIC_DRAW);
  const st=[],Rn=mulberry(99);for(let i=0;i<2600;i++){let x,y,z,l;do{x=Rn()*2-1;y=Rn()*2-1;z=Rn()*2-1;l=x*x+y*y+z*z}while(l>1||l<.01);l=Math.sqrt(l);const b=Rn(),big=Rn()<.08,warm=Rn();st.push(x/l*900,y/l*900,z/l*900,.8+warm*.2,.85,1-warm*.15,.35+b*.65,big?2.6:1.3+b*.6)}
  GEN.stars={buf:G.createBuffer(),n:st.length/8};G.bindBuffer(G.ARRAY_BUFFER,GEN.stars.buf);G.bufferData(G.ARRAY_BUFFER,new Float32Array(st),G.STATIC_DRAW);
  GEN.skyTex=G.createTexture();
  GEN.dust={buf:G.createBuffer(),arr:new Float32Array(450*8),base:Array.from({length:450},()=>[rnd(1000),rnd(1000),rnd(1000)])};
  GEN.bb={buf:G.createBuffer(),arr:new Float32Array(12000*6*9)};
}
function tintOf(sid){const d=DEF[sid];if(!d)return'#40507a';if(d.home)return FACTIONS[d.home].col;if(d.kind==='hive')return'#5f9a2c';if(d.kind==='deep')return'#4a5f86';return d.kind==='contested'?'#ff9a4a':d.kind==='hub'?'#6f8bd6':'#a8995d'}
const SCN={sun:{x:.5,y:.6,z:.6},sunCol:[1,.95,.85],amb:[.2,.22,.28],sid:null};
function buildSectorScene(sid){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),R=mulberry(hashStr((sid||'menu')+'sky')),col=tintOf(sid);
  g.fillStyle='#03050a';g.fillRect(0,0,1024,512);
  const blob=(x,y,r,cc,a)=>{for(const ox of[-1024,0,1024]){const gr=g.createRadialGradient(x+ox,y,0,x+ox,y,r);gr.addColorStop(0,hexA(cc,a));gr.addColorStop(1,hexA(cc,0));g.fillStyle=gr;g.fillRect(x+ox-r,y-r,r*2,r*2)}};
  const tilt=R()*80-40,ph=R()*TAU;for(let i=0;i<260;i++){const x=R()*1024,y=256+Math.sin(x/1024*TAU+ph)*tilt+(R()-.5)*R()*120;blob(x,y,14+R()*46,i%5?'#3b4b7c':'#7a6a55',.05)}
  for(let i=0;i<10;i++)blob(R()*1024,90+R()*332,90+R()*210,i%3?col:'#2b3a66',.1+R()*.12);
  const c2=document.createElement('canvas');c2.width=512;c2.height=256;const g2=c2.getContext('2d');try{g2.filter='blur(2px)'}catch(e){}g2.imageSmoothingQuality='high';g2.drawImage(c,0,0,512,256);g2.filter='none';
  G.bindTexture(G.TEXTURE_2D,GEN.skyTex);G.texImage2D(G.TEXTURE_2D,0,G.RGBA,G.RGBA,G.UNSIGNED_BYTE,c2);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_MIN_FILTER,G.LINEAR);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_MAG_FILTER,G.LINEAR);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_WRAP_S,G.REPEAT);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_WRAP_T,G.CLAMP_TO_EDGE);
  const sd=rdir(.6);SCN.sun={x:sd.x,y:Math.abs(sd.y)*.6+.25,z:sd.z};const l=hyp(SCN.sun.x,SCN.sun.y,SCN.sun.z);SCN.sun.x/=l;SCN.sun.y/=l;SCN.sun.z/=l;
  const tc=hexRGB(col);SCN.amb=mixC([.2,.22,.29],tc,.18);SCN.sunCol=mixC([1,.94,.84],tc,.08);SCN.sid=sid;
}

// ---- camera
const cam={x:0,y:0,z:0,q:q0(),fov:62,dist:1,mode:'chase',snap:true};
const V=new Float32Array(16),Pm=new Float32Array(16),VP=new Float32Array(16),MM=new Float32Array(16);
const cX={x:0,y:0,z:0},cY={x:0,y:0,z:0},cZ={x:0,y:0,z:0};
function toggleCam(){cam.mode=cam.mode==='chase'?'cockpit':'chase';cam.snap=true;flash(cam.mode==='chase'?'Chase camera':'Cockpit camera')}
$('bCam').addEventListener('click',()=>{if(running&&!S.player.docked)toggleCam()});
function updateCamera(dt){
  if(!W){const a=performance.now()/1000*.03;cam.x=cam.y=cam.z=0;qLook(Math.cos(a),.12,Math.sin(a),0,1,0,cam.q);return}
  const p=W.player,r=p.st.radius,spd=hyp(p.vx,p.vy,p.vz);
  cam.fov+=(((cam.fovBase||62)+(p.boosting&&!S.player.docked?9:0)+Math.min(6,spd/90))-cam.fov)*Math.min(1,dt*4);
  if(W.gunseat){const e=gsEnt();if(e){const G=W.gunseat,M=turretMount(e),sc=e.st.radius*1.25;turretQ(e,G,cam.q);qRot(cam.q,0,sc*.16,-sc*.05,_u);cam.x=M.x+_u.x;cam.y=M.y+_u.y;cam.z=M.z+_u.z;cam.fov=(cam.fovBase||62)+4;return}}
  if(W.bridge){const B=W.bridge,F=B.f,O=bridgeOrigin(F),bob=(B.bobA||0)*Math.sin((B.bob||0)*2)*.07;qRot(F.q,B.x+(B.bobA||0)*Math.cos(B.bob||0)*.04,(B.seat?3.75:4.2)+(B.fy||0)+bob,B.z,_u);const sh=(W.shake||0)*.4;cam.x=O.x+_u.x+rnd(-sh,sh);cam.y=O.y+_u.y+rnd(-sh,sh);cam.z=O.z+_u.z+rnd(-sh,sh);qMul(F.q,qAxis(0,1,0,B.yaw,_qa),_tq);qMul(_tq,qAxis(1,0,0,-B.pitch,_qa),cam.q);cam.fov=cam.fovBase||62;return}
  if(S.player.docked){const E=S.player.docked==='station'?W.stationEnt:W.outpostEnt;if(E){const a=W.t*.12;cam.x=E.x+Math.cos(a)*480;cam.y=E.y+170;cam.z=E.z+Math.sin(a)*480;qLook(E.x-cam.x,E.y-cam.y,E.z-cam.z,0,1,0,cam.q)}return}
  qRot(p.q,0,0,1,_f);qRot(p.q,0,1,0,_u);
  if(W.dead){qLook(p.x-cam.x,p.y-cam.y,p.z-cam.z,_u.x,_u.y,_u.z,_tq);qSlerp(cam.q,_tq,1-Math.exp(-dt*4));return}
  const sh=(W.shake||0)*(cam.mode==='cockpit'?1.6:3);
  if(cam.mode==='cockpit'){cam.x=p.x+_f.x*r*.55+_u.x*r*.32+rnd(-sh,sh);cam.y=p.y+_f.y*r*.55+_u.y*r*.32+rnd(-sh,sh);cam.z=p.z+_f.z*r*.55+_u.z*r*.32+rnd(-sh,sh);qCopy(cam.q,p.q);cam.snap=false;return}
  const k=r*1.25*cam.dist*(1+Math.min(.35,spd/1400)),tx=p.x-_f.x*k*6+_u.x*k*1.7,ty=p.y-_f.y*k*6+_u.y*k*1.7,tz=p.z-_f.z*k*6+_u.z*k*1.7;
  const a=cam.snap?1:1-Math.exp(-dt*12);cam.x+=(tx-cam.x)*a+rnd(-sh,sh);cam.y+=(ty-cam.y)*a+rnd(-sh,sh);cam.z+=(tz-cam.z)*a+rnd(-sh,sh);
  const lx=p.x+_f.x*k*5,ly=p.y+_f.y*k*5,lz=p.z+_f.z*k*5;qLook(lx-cam.x,ly-cam.y,lz-cam.z,_u.x,_u.y,_u.z,_tq);if(cam.snap)qCopy(cam.q,_tq);else qSlerp(cam.q,_tq,1-Math.exp(-dt*10));cam.snap=false;
}
function computeMatrices(){
  qRot(cam.q,1,0,0,cX);qRot(cam.q,0,1,0,cY);qRot(cam.q,0,0,1,cZ);
  const r0=[-cX.x,-cX.y,-cX.z],r1=[cY.x,cY.y,cY.z],r2=[-cZ.x,-cZ.y,-cZ.z],p=[cam.x,cam.y,cam.z],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  V[0]=r0[0];V[4]=r0[1];V[8]=r0[2];V[12]=-dot(r0,p);V[1]=r1[0];V[5]=r1[1];V[9]=r1[2];V[13]=-dot(r1,p);V[2]=r2[0];V[6]=r2[1];V[10]=r2[2];V[14]=-dot(r2,p);V[3]=V[7]=V[11]=0;V[15]=1;
  const f=1/Math.tan(cam.fov*Math.PI/360),n=2,fa=90000;Pm.fill(0);Pm[0]=f/(VW/VH);Pm[5]=f;Pm[10]=(fa+n)/(n-fa);Pm[11]=-1;Pm[14]=2*fa*n/(n-fa);mMul(VP,Pm,V);
}
const PJ={x:0,y:0,behind:false,d:0};
function proj(x,y,z){const cx=VP[0]*x+VP[4]*y+VP[8]*z+VP[12],cy=VP[1]*x+VP[5]*y+VP[9]*z+VP[13],cw=VP[3]*x+VP[7]*y+VP[11]*z+VP[15];
  const dx=x-cam.x,dy=y-cam.y,dz=z-cam.z;PJ.d=hyp(dx,dy,dz);PJ.behind=cw<=.5;const w=Math.abs(cw)<1e-4?1e-4:Math.abs(cw);let nx=cx/w,ny=cy/w;if(PJ.behind){nx=-nx;ny=-ny}PJ.x=(nx+1)/2*VW;PJ.y=(1-ny)/2*VH;return PJ}
function projR(d,r){return r/(Math.max(d,1)*Math.tan(cam.fov*Math.PI/360))*VH/2}
function inView(x,y,z,r){const dx=x-cam.x,dy=y-cam.y,dz=z-cam.z;return dx*cZ.x+dy*cZ.y+dz*cZ.z>-r}

// ---- draw helpers
let curMesh=null;
const ONE3=new Float32Array([1,1,1]),ZERO3=new Float32Array([0,0,0]);
function useMesh(){G.useProgram(PM.p);G.uniformMatrix4fv(PM.u.uVP,false,VP);G.uniform3f(PM.u.uL,SCN.sun.x,SCN.sun.y,SCN.sun.z);G.uniform3fv(PM.u.uSun,SCN.sunCol);G.uniform3fv(PM.u.uAmb,SCN.amb);curMesh=null}
function drawMesh(m,model,tint,em,alpha){G.uniformMatrix4fv(PM.u.uM,false,model);G.uniform3fv(PM.u.uTint,tint||ONE3);G.uniform3fv(PM.u.uEm,em||ZERO3);G.uniform1f(PM.u.uA,alpha===undefined?1:alpha);if(curMesh!==m){G.bindBuffer(G.ARRAY_BUFFER,m.buf);attribs([3,3,4],10);curMesh=m}G.drawArrays(m.mode,0,m.n)}
let BBn=0;const BBmax=12000;
function bbPush(ax,ay,az,r,g,b,a,u,v){const A=GEN.bb.arr,i=BBn*9;A[i]=ax;A[i+1]=ay;A[i+2]=az;A[i+3]=r;A[i+4]=g;A[i+5]=b;A[i+6]=a;A[i+7]=u;A[i+8]=v;BBn++}
function sprite(x,y,z,s,c,a){if(BBn>=BBmax*6-6)return;const rx=-cX.x*s,ry=-cX.y*s,rz=-cX.z*s,ux=cY.x*s,uy=cY.y*s,uz=cY.z*s;
  bbPush(x-rx-ux,y-ry-uy,z-rz-uz,c[0],c[1],c[2],a,-1,-1);bbPush(x+rx-ux,y+ry-uy,z+rz-uz,c[0],c[1],c[2],a,1,-1);bbPush(x+rx+ux,y+ry+uy,z+rz+uz,c[0],c[1],c[2],a,1,1);
  bbPush(x-rx-ux,y-ry-uy,z-rz-uz,c[0],c[1],c[2],a,-1,-1);bbPush(x+rx+ux,y+ry+uy,z+rz+uz,c[0],c[1],c[2],a,1,1);bbPush(x-rx+ux,y-ry+uy,z-rz+uz,c[0],c[1],c[2],a,-1,1)}
function streak(x1,y1,z1,x2,y2,z2,w,c,a){if(BBn>=BBmax*6-6)return;const dx=x2-x1,dy=y2-y1,dz=z2-z1,mx=(x1+x2)/2-cam.x,my=(y1+y2)/2-cam.y,mz=(z1+z2)/2-cam.z;let sx=dy*mz-dz*my,sy=dz*mx-dx*mz,sz=dx*my-dy*mx;const l=hyp(sx,sy,sz)||1;sx=sx/l*w;sy=sy/l*w;sz=sz/l*w;
  bbPush(x1-sx,y1-sy,z1-sz,c[0],c[1],c[2],a,0,-1);bbPush(x1+sx,y1+sy,z1+sz,c[0],c[1],c[2],a,0,1);bbPush(x2+sx,y2+sy,z2+sz,c[0],c[1],c[2],a,0,1);
  bbPush(x1-sx,y1-sy,z1-sz,c[0],c[1],c[2],a,0,-1);bbPush(x2+sx,y2+sy,z2+sz,c[0],c[1],c[2],a,0,1);bbPush(x2-sx,y2-sy,z2-sz,c[0],c[1],c[2],a,0,-1)}
function capsule(x1,y1,z1,x2,y2,z2,w,c,a){if(BBn>=BBmax*6-24)return;let dx=x2-x1,dy=y2-y1,dz=z2-z1;const L=hyp(dx,dy,dz)||1e-3,mx=(x1+x2)/2-cam.x,my=(y1+y2)/2-cam.y,mz=(z1+z2)/2-cam.z;
  let sx=dy*mz-dz*my,sy=dz*mx-dx*mz,sz=dx*my-dy*mx;const l=hyp(sx,sy,sz)||1;sx=sx/l*w;sy=sy/l*w;sz=sz/l*w;const ux=dx/L*w,uy=dy/L*w,uz=dz/L*w,r=c[0],g=c[1],b=c[2];
  // body
  bbPush(x1-sx,y1-sy,z1-sz,r,g,b,a,0,-1);bbPush(x1+sx,y1+sy,z1+sz,r,g,b,a,0,1);bbPush(x2+sx,y2+sy,z2+sz,r,g,b,a,0,1);
  bbPush(x1-sx,y1-sy,z1-sz,r,g,b,a,0,-1);bbPush(x2+sx,y2+sy,z2+sz,r,g,b,a,0,1);bbPush(x2-sx,y2-sy,z2-sz,r,g,b,a,0,-1);
  // caps
  for(const[ex,ey,ez,k]of[[x2,y2,z2,1],[x1,y1,z1,-1]]){const ox=ex+ux*k,oy=ey+uy*k,oz=ez+uz*k;
    bbPush(ex-sx,ey-sy,ez-sz,r,g,b,a,0,-1);bbPush(ex+sx,ey+sy,ez+sz,r,g,b,a,0,1);bbPush(ox+sx,oy+sy,oz+sz,r,g,b,a,1,1);
    bbPush(ex-sx,ey-sy,ez-sz,r,g,b,a,0,-1);bbPush(ox+sx,oy+sy,oz+sz,r,g,b,a,1,1);bbPush(ox-sx,oy-sy,oz-sz,r,g,b,a,1,-1)}}
// a round energy bolt: wide soft halo, coloured body and a white-hot core, each a capsule, plus a glowing head that stays round seen end-on
function bolt(x1,y1,z1,x2,y2,z2,w,c,a){capsule(x1,y1,z1,x2,y2,z2,w*2.4,c,.28*a);capsule(x1,y1,z1,x2,y2,z2,w,c,.85*a);capsule(x1,y1,z1,x2,y2,z2,w*.38,[1,.97,.92],.95*a);sprite(x2,y2,z2,w*2.2,c,.55*a);sprite(x2,y2,z2,w*.9,[1,1,1],.7*a)}
function flushBB(){if(!BBn)return;G.useProgram(PB.p);G.uniformMatrix4fv(PB.u.uVP,false,VP);G.bindBuffer(G.ARRAY_BUFFER,GEN.bb.buf);G.bufferData(G.ARRAY_BUFFER,GEN.bb.arr.subarray(0,BBn*9),G.DYNAMIC_DRAW);attribs([3,4,2],9);G.drawArrays(G.TRIANGLES,0,BBn);BBn=0;curMesh=null}

const _qs=q0(),_qs2=q0(),SHOT_STY={capital:[70,8],spore:[13,4.6],pulse:[16,2.6],slug:[24,3.6],lance:[40,1.9],scrap:[12,2.6],turret:[26,3.4]};
const colCache={};function rgb(h){return colCache[h]||(colCache[h]=hexRGB(h))}
function draw3D(){
  G.viewport(0,0,glc.width,glc.height);G.clearColor(.012,.016,.03,1);G.clear(G.COLOR_BUFFER_BIT|G.DEPTH_BUFFER_BIT);
  computeMatrices();
  G.disable(G.DEPTH_TEST);G.depthMask(false);G.disable(G.BLEND);
  G.useProgram(PS.p);G.uniformMatrix4fv(PS.u.uVP,false,VP);G.uniform3f(PS.u.uOff,cam.x,cam.y,cam.z);G.activeTexture(G.TEXTURE0);G.bindTexture(G.TEXTURE_2D,GEN.skyTex);G.uniform1i(PS.u.uT,0);G.bindBuffer(G.ARRAY_BUFFER,GEN.sky.buf);attribs([3,2],5);G.drawArrays(G.TRIANGLES,0,GEN.sky.n);
  G.enable(G.BLEND);G.blendFunc(G.ONE,G.ONE);
  G.useProgram(PP.p);G.uniformMatrix4fv(PP.u.uVP,false,VP);G.uniform3f(PP.u.uOff,cam.x,cam.y,cam.z);G.uniform1f(PP.u.uPx,DPR*1.4);G.bindBuffer(G.ARRAY_BUFFER,GEN.stars.buf);attribs([3,4,1],8);G.drawArrays(G.POINTS,0,GEN.stars.n);
  const s=SCN.sun;sprite(cam.x+s.x*800,cam.y+s.y*800,cam.z+s.z*800,70,SCN.sunCol,1);sprite(cam.x+s.x*800,cam.y+s.y*800,cam.z+s.z*800,240,mixC(SCN.sunCol,[.6,.5,.4],.5),.25);flushBB();
  G.disable(G.BLEND);G.enable(G.DEPTH_TEST);G.depthMask(true);G.depthFunc(G.LEQUAL);
  if(!W)return;
  const t=W.t,sec=S.sectors[W.sid];useMesh();
  for(const g of GATES[W.sid]){if(!inView(g.x,g.y,g.z,150))continue;qLook(-g.x,-g.y,-g.z,0,1,0,_qs);qMul(_qs,qAxis(0,0,1,t*.15,_qs2),_qs);mModel(MM,g.x,g.y,g.z,_qs,1,1,1);const down=S.gateDown[gateKey(W.sid,g.to)];drawMesh(GEN.gate,MM,down?[1,.4,.35]:ONE3)}
  if(W.stationEnt&&W.stationEnt.turrets){const SEt=W.stationEnt;mdlStationTurrets(SEt);for(const tu of SEt.turrets){qRot(SEt.q,tu.p[0],tu.p[1],tu.p[2],_u);qLook(tu.aim.x,tu.aim.y,tu.aim.z,0,1,0,_qs);{const ts=SEt._mt&&SEt.fac!=='brood'&&MDL.ready?1.15:1.6;mModel(MM,SEt.x+_u.x,SEt.y+_u.y,SEt.z+_u.z,_qs,ts,ts,ts)}drawMesh(GEN.turret,MM,SEt.offline?[.5,.45,.45]:ONE3)}}
  const SE=W.stationEnt;if(SE){const m=stationMesh(SE.fac,SE.kind),sq=SE.q||q0(),k=SE.sc||1;mModel(MM,SE.x,SE.y,SE.z,sq,k,k,k);drawMesh(m.core,MM);qMul(sq,qAxis(0,1,0,t*.08,_qs2),_qs);mModel(MM,SE.x,SE.y,SE.z,_qs,k,k,k);drawMesh(m.spin,MM)}
  drawWorks(t);
  {const B=W.scaffold||(W.pbuild?{x:W.pbuild.x,y:W.pbuild.y,z:W.pbuild.z,owner:'player',prog:W.pbuild.prog}:null);if(B){const m=stationMesh(B.owner,'depot'),k=.15+.6*B.prog;mModel(MM,B.x,B.y,B.z,q0(),k,k,k);drawMesh(m.core,MM);qMul(q0(),qAxis(0,1,0,t*.5,_qs2),_qs);mModel(MM,B.x,B.y,B.z,_qs,k*B.prog,1,k*B.prog);drawMesh(m.spin,MM)}}
  const OE=W.outpostEnt;if(OE){const o=OE.o;qMul(OE.q||q0(),qAxis(0,1,0,t*.03,_qs2),_qs);mModel(MM,OE.x,OE.y,OE.z,_qs,1,1,1);drawMesh(outpostMesh(opModel(o),o.owner),MM,o.breached?[.55,.5,.5]:ONE3);
    if(!(opModel(o)==='rockbase'&&mdlHas('rockbase'))){qLook(OE.aim.x,OE.aim.y,OE.aim.z,0,1,0,_qs);mModel(MM,OE.x,OE.y+40,OE.z,_qs,1,1,1);drawMesh(GEN.turret,MM)}}
  for(const a of sec.ast){const R=astR(a);if(!inView(a.x,a.y,a.z,R))continue;const sd=a.seed||a.id;astPose(a,t,_qs);mModel(MM,a.x,a.y,a.z,_qs,R,R*astScaleY(a),R);drawMesh(astMesh(sd%8,a.comet?'comet':mainOre(a)||'fe'),MM)}
  for(const c of W.npcCh||[]){if(!inView(c.x,c.y,c.z,c.cr))continue;qAxis(((c.id>>2)%5-2)/2,1,((c.id>>4)%3-1)/2,t*.6+c.id,_qs);qNorm(_qs);mModel(MM,c.x,c.y,c.z,_qs,c.cr,c.cr*.8,c.cr*.9);drawMesh(astMesh(c.id%8,c.k),MM)}
  for(const c of sec.clouds||[]){if(!c.chunk||!inView(c.x,c.y,c.z,c.cr))continue;qAxis(((c.id>>2)%5-2)/2,1,((c.id>>4)%3-1)/2,t*.6+c.id,_qs);qNorm(_qs);
    if(c.scrap){const k=c.cr*.75;mModel(MM,c.x,c.y,c.z,_qs,k*1.3,k*.55,k);drawMesh(GEN.crate,MM,[.36,.33,.31]);drawMesh(GEN.crateL,MM,[.5,.42,.32],[.22,.14,.06])}   // a torn-off hull section
    else{mModel(MM,c.x,c.y,c.z,_qs,c.cr,c.cr*.8,c.cr*.9);drawMesh(astMesh(c.id%8,mainOre(c)||'fe'),MM)}}
  {const B=S.beacons&&S.beacons[W.sid];if(B&&inView(B.x,B.y,B.z,90)){const F=W.bcnF,fl=F&&F.side&&F.t>0,col=B.owner?rgb(sideCol(B.owner)):[.78,.78,.72],k=fl?F.t/BCN_T:0,rc=fl?mixC(col,rgb(sideCol(F.side)),.5+.5*Math.sin(t*12)):col;
    mModel(MM,B.x,B.y,B.z,Q_ID,1.25,1.25,1.25);drawMesh(GEN.bcn,MM);drawMesh(GEN.bcnL,MM,col);qAxis(.12,1,.05,t*(.7+k*6),_qs);qNorm(_qs);mModel(MM,B.x,B.y+25,B.z,_qs,1.25,1.25,1.25);drawMesh(GEN.bcnRing,MM,rc)}}
  for(const w of sec.wrecks||[]){const life=Math.max(0,w.until-S.T),fade=Math.min(1,life/20);if(inView(w.x,w.y,w.z,w.R*1.2)){const m=shipMesh(w.mf,w.cls),k=w.R*(.96+.04*fade);mModel(MM,w.x,w.y,w.z-(1-fade)*40,w.q,k,k,k);drawMesh(m.hull,MM,[.3,.27,.26],ZERO3,fade);if(m.rim)drawMesh(m.rim,MM,[.22,.2,.2],ZERO3,fade)}
    for(const pt of w.pts){if(!inView(pt.x,pt.y,pt.z,20))continue;const core=pt.k==='core',hc=core?mixC([1,.62,.25],[1,.15,.08],Math.min(1,pt.heat)):[1,.78,.42],pul=.6+.4*Math.sin(t*(core?4+pt.heat*14:2.5)+pt.id);qAxis(.3,1,.2,t*.6+pt.id,_qs);qNorm(_qs);mModel(MM,pt.x,pt.y,pt.z,_qs,11,11,11);drawMesh(GEN.crate,MM,[.35,.32,.3]);drawMesh(GEN.crateL,MM,hc,[hc[0]*pul*.8,hc[1]*pul*.8,hc[2]*pul*.8])}}
  for(const c of sec.crates){if(!inView(c.x,c.y,c.z,20))continue;qAxis(.3,1,.2,t*1.1+c.id,_qs);qNorm(_qs);mModel(MM,c.x,c.y,c.z,_qs,16,16,16);drawMesh(GEN.crate,MM);drawMesh(GEN.crateL,MM,c.derelict?rgb(PLAYER_COL):[.9,.88,.8])}
  const hideP=cam.mode==='cockpit'||S.player.docked||W.dead;
  if(W.bridge){const F=W.bridge.f,O=bridgeOrigin(F);mModel(MM,O.x,O.y,O.z,F.q,1,1,1);qRot(F.q,.22,1,.3,_u);const l=hyp(_u.x,_u.y,_u.z);G.uniform3f(PM.u.uL,_u.x/l,_u.y/l,_u.z/l);G.uniform3fv(PM.u.uSun,BR_SUN);G.uniform3fv(PM.u.uAmb,BR_AMB);drawMesh(bridgeMesh(F.fac),MM);useMesh()}
  for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;if(e.isPlayer&&hideP)continue;if(W.bridge&&e===W.bridge.f&&!mdlHas(e.fac==='brood'?BROOD_MDL[e.cls]:e.cls))continue;const sc=e.st.radius*1.25;if(!inView(e.x,e.y,e.z,sc*2))continue;const fac=e.side==='pirate'?'pirate':e.fac,m=shipMesh(fac,e.role==='limpet'?'limpet':e.cls);
    mModel(MM,e.x,e.y,e.z,e.q,sc,sc,sc);const hurt=W.t-e.lastHit<.08;drawMesh(m.hull,MM,ONE3,hurt?[.35,.25,.15]:ZERO3);drawMesh(m.rim,MM);
    if(hasTur(e.cls)&&!(W.gunseat&&gsEnt()===e)){const T=e.tur||{yaw:Math.PI,pitch:.1};turretQ(e,T,_gq3);qRot(e.q,0,.4*sc,-.38*sc,_u);mModel(MM,e.x+_u.x,e.y+_u.y,e.z+_u.z,_gq3,sc,sc,sc);const tm=gturretMesh(fac);drawMesh(tm.hull,MM,ONE3,ZERO3);drawMesh(tm.rim,MM)}}
  drawBerthed();
  G.enable(G.BLEND);G.blendFunc(G.ONE,G.ONE);G.depthMask(false);useMesh();
  // ship shield bubbles: flash on hit, burst outward when they collapse, pulse when they come back
  for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;if(e.isPlayer&&(S.player.docked||W.dead||cam.mode==='cockpit'))continue;if(W.bridge&&e===W.bridge.f)continue;const R=e.st.radius*1.25*1.5;
    const ha=W.t-(e.shHitT===undefined?-9:e.shHitT),ba=W.t-(e.shBreakT===undefined?-9:e.shBreakT),ua=W.t-(e.shUpT===undefined?-9:e.shUpT);
    if(ha<.35&&e.shield>0){mModel(MM,e.x,e.y,e.z,e.q,R,R*.7,R*1.1);drawMesh(GEN.shield,MM,[.45,.75,1],ZERO3,.13*(e.shHitA||.5)*(1-ha/.35))}
    if(ba<.7){const k=ba/.7,s=R*(1+k*1.6);mModel(MM,e.x,e.y,e.z,e.q,s,s*.7,s*1.1);drawMesh(GEN.shield,MM,[.6,.85,1],ZERO3,.3*(1-k))}
    if(ua<.6){mModel(MM,e.x,e.y,e.z,e.q,R,R*.7,R*1.1);drawMesh(GEN.shield,MM,[.45,.75,1],ZERO3,.12*(1-ua/.6))}}
  for(const g of GATES[W.sid]){if(!inView(g.x,g.y,g.z,150))continue;qLook(-g.x,-g.y,-g.z,0,1,0,_qs);mModel(MM,g.x,g.y,g.z,_qs,1,1,1);const down=S.gateDown[gateKey(W.sid,g.to)];drawMesh(GEN.disc,MM,down?[1,.3,.25]:[.45,.7,1],ZERO3,down?.12:.2+.06*Math.sin(t*3))}
  {const B=S.beacons&&S.beacons[W.sid];if(B&&isScoutCls(S.player.cls)&&W.player&&d3(W.player,B)<BCN_R*5){mModel(MM,B.x,B.y,B.z,Q_ID,BCN_R,BCN_R,BCN_R);drawMesh(GEN.bcnZone,MM,B.owner?rgb(sideCol(B.owner)):[.85,.85,.8],ZERO3,.55)}}
  drawWorksFx(t);
  if(SE&&SE.sMax&&!SE.offline&&SE.shield>0){const fr=SE.shield/SE.sMax+(W.t-SE.lastHit<.15?.7:0);mModel(MM,SE.x,SE.y,SE.z,SE.q||q0(),165*(SE.sc||1),150*(SE.sc||1),165*(SE.sc||1));drawMesh(GEN.shield,MM,rgb(sideCol(SE.fac)),ZERO3,.018+.045*fr)}
  if(OE){const o=OE.o,os=oStats(o);if(o.shield>0){const fr=o.shield/os.sMax+(W.t-OE.lastHit<.15?.6:0);{const k=(OE.r||95)/95;mModel(MM,OE.x,OE.y,OE.z,q0(),132*k,110*k,132*k)}drawMesh(GEN.shield,MM,rgb(sideCol(o.owner)),ZERO3,.03+.07*fr)}
    if(!o.owner||o.breached||o.cap.p>0){mModel(MM,OE.x,OE.y,OE.z,OE.q||q0(),450,450,450);drawMesh(GEN.ring,MM,rgb(o.cap.side?sideCol(o.cap.side):'#ece4cf'),ZERO3,.35+.6*o.cap.p)}}
  {const D=GEN.dust,A=D.arr,sp=hyp(W.player.vx,W.player.vy,W.player.vz);const al=clamp(sp/250,.15,.8);for(let i=0;i<D.base.length;i++){const b=D.base[i],o=i*8;A[o]=((b[0]-cam.x)%1000+1000)%1000-500+cam.x;A[o+1]=((b[1]-cam.y)%1000+1000)%1000-500+cam.y;A[o+2]=((b[2]-cam.z)%1000+1000)%1000-500+cam.z;A[o+3]=.6;A[o+4]=.68;A[o+5]=.85;A[o+6]=al;A[o+7]=1.4}
    G.useProgram(PP.p);G.uniformMatrix4fv(PP.u.uVP,false,VP);G.uniform3f(PP.u.uOff,0,0,0);G.uniform1f(PP.u.uPx,DPR);G.bindBuffer(G.ARRAY_BUFFER,D.buf);G.bufferData(G.ARRAY_BUFFER,A,G.DYNAMIC_DRAW);attribs([3,4,1],8);G.drawArrays(G.POINTS,0,D.base.length);curMesh=null}
  for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;if(e.isPlayer&&(S.player.docked||W.dead||cam.mode==='cockpit'))continue;if(W.bridge&&e===W.bridge.f)continue;const sc=e.st.radius*1.25;if(e.role==='limpet'){if((t*2.2+e.x*.01)%1<.45){qRot(e.q,0,.66*sc,0,_u);sprite(e.x+_u.x,e.y+_u.y,e.z+_u.z,sc*1.1,rgb(sideCol(e.side)),.95)}continue}const m=shipMesh(e.side==='pirate'?'pirate':e.fac,e.cls),c=rgb((e.isPlayer?S.player.trail:e.trail)||(e.isPlayer?FAC(e.fac).col:sideCol(e.side)));
    const fl=e.thrusting?(e.boosting?1.9:1.25)+Math.sin(t*50+sc)*.15:.5;qRot(e.q,0,0,-1,_f);
    for(const en of m.eng){qRot(e.q,en[0]*sc,en[1]*sc,en[2]*sc,_u);const ex=e.x+_u.x,ey=e.y+_u.y,ez=e.z+_u.z,rr=en[3]*sc;sprite(ex,ey,ez,rr*3*fl,c,.85);sprite(ex,ey,ez,rr*1.3*fl,[1,1,1],.75);
      if(e.thrusting){const Lt=rr*(e.boosting?16:9);streak(ex,ey,ez,ex+_f.x*Lt,ey+_f.y*Lt,ez+_f.z*Lt,rr*.8,c,.32)}}
    if(e.isPlayer)sprite(e.x,e.y+sc*.3,e.z,sc*.18,rgb(PLAYER_COL),.6);
    {const gk=e.gj?e.gj.t/GATE_HOLD:e.gjc?((W.t*.6)%1):(e.isPlayer&&W.gc?W.gc.t/GATE_HOLD:-1);if(gk>=0){sprite(e.x,e.y,e.z,sc*(2.2+3*gk)+6*Math.sin(t*9),[.6,.8,1],.18+.35*gk);sprite(e.x,e.y,e.z,sc*(1+gk),c,.25+.3*gk)}}}
  for(const b of W.shots){const sp=hyp(b.vx,b.vy,b.vz)||1,st=SHOT_STY[b.sty]||SHOT_STY.pulse,L=st[0],w=st[1],c=rgb(b.col);const ux=b.vx/sp,uy=b.vy/sp,uz=b.vz/sp;
    bolt(b.x-ux*L,b.y-uy*L,b.z-uz*L,b.x,b.y,b.z,w*.95,c,1)}
  for(const e of W.ents){if(e.type!=='ship'||!e.mining||!e.alive)continue;const a=e.mining,sc=e.st.radius*1.25,nl=CLASSES[e.cls].lasers||1;qRot(e.q,0,0,1,_f);qRot(e.q,1,0,0,_r);const k=mainOre(a)||'fe',c=rgb(ITEMS[k].col);
    for(let li=0;li<nl;li++){const o=(li-(nl-1)/2)*sc*.55,j=rnd(-6,6),sx=e.x+_f.x*sc+_r.x*o,sy=e.y+_f.y*sc+_r.y*o,sz=e.z+_f.z*sc+_r.z*o;capsule(sx,sy,sz,a.x+j,a.y-j,a.z+j,7,c,.3);capsule(sx,sy,sz,a.x+j,a.y-j,a.z+j,3,c,.6);capsule(sx,sy,sz,a.x+j,a.y-j,a.z+j,1.1,[1,1,1],.85)}if(Math.random()<.4)fxSpark({x:a.x+rnd(-12,12),y:a.y+rnd(-12,12),z:a.z+rnd(-12,12)},ITEMS[k].col,1)}
  for(const e of W.ents){if(e.type!=='ship'||!e.alive||!e.hitPt)continue;const ha=W.t-e.shHitT;if(ha<.25)sprite(e.x+e.hitPt.x,e.y+e.hitPt.y,e.z+e.hitPt.z,e.st.radius*(1.2-ha*2),[.6,.85,1],1-ha/.25)}
  {const p=W.player,sp=hyp(p.vx,p.vy,p.vz);if(sp>150&&!S.player.docked&&!W.dead){const A=GEN.dust.arr,al=clamp((sp-150)/380,0,.5)*(p.boosting?1.6:1),k=.055*(p.boosting?1.8:1);
    for(let i=0;i<180;i++){const o=i*8,x=A[o],y=A[o+1],z=A[o+2];if(!inView(x,y,z,10))continue;streak(x,y,z,x-p.vx*k,y-p.vy*k,z-p.vz*k,.9,[.7,.8,1],al)}}}
  for(const b of W.beams){const e=b.src;if(!e.alive||(e.isPlayer&&(S.player.docked||W.dead)))continue;qRot(e.q,0,0,1,_f);const r=e.st.radius*1.25,sx=e.x+_f.x*r,sy=e.y+_f.y*r,sz=e.z+_f.z*r,c=rgb(b.col),fl=.8+Math.random()*.4;
    capsule(sx,sy,sz,b.x,b.y,b.z,7*fl,c,.22);capsule(sx,sy,sz,b.x,b.y,b.z,3*fl,c,.75);capsule(sx,sy,sz,b.x,b.y,b.z,1.1,[1,1,1],.95);sprite(sx,sy,sz,7*fl,c,.85);sprite(b.x,b.y,b.z,11*fl,c,.9);sprite(b.x,b.y,b.z,4*fl,[1,1,1],.8)}
  for(const m of W.missiles){const sp=hyp(m.vx,m.vy,m.vz)||1,ux=m.vx/sp,uy=m.vy/sp,uz=m.vz/sp,c=rgb(m.col),k=(MK[m.kind]||MK.missile).k,tx=m.x-ux*14*k,ty=m.y-uy*14*k,tz=m.z-uz*14*k;streak(tx,ty,tz,m.x,m.y,m.z,3*k,m.kind==='torpedo'?[1,.8,.4]:m.kind==='swarm'?[1,.55,.78]:[.85,.85,.9],.9);sprite(tx,ty,tz,(9+Math.random()*4)*k,c,1);sprite(tx,ty,tz,4*k,[1,1,1],1);if(k>1)sprite(m.x,m.y,m.z,26+8*Math.sin(W.t*12),[1,.75,.3],.5)}
  for(const d of W.decoys)sprite(d.x,d.y,d.z,16+Math.random()*8,[1,.85,.5],Math.min(1,d.life));
  for(const f of W.fx){const a=f.life/f.max;if(f.flash)sprite(f.x,f.y,f.z,f.sz*(1.3-a*.6),f.c,a*.8);else sprite(f.x,f.y,f.z,f.sz,f.c,a)}
  for(const a of sec.ast)if(a.comet&&inView(a.x,a.y,a.z,300))sprite(a.x,a.y,a.z,astR(a)*3.2,rgb(ITEMS.xc.col),.35+.08*Math.sin(t*2));
  for(const c of sec.crates)if(c.derelict)sprite(c.x,c.y,c.z,40,rgb(PLAYER_COL),.35+.25*Math.sin(t*4));
  for(const g of GATES[W.sid])if(!S.gateDown[gateKey(W.sid,g.to)])sprite(g.x,g.y,g.z,90,[.5,.7,1],.25);
  if(SE){const mk=SE.kind==='depot'?'depot':'station',top=SE.fac!=='brood'&&mdlHas(mk)?MDL.i[mk].top*MDL.i[mk].s+6:98;sprite(SE.x,SE.y+top,SE.z,22,rgb(sideCol(SE.fac)),.5+.5*Math.sin(t*3))}
  if(SE&&SE.offline&&Math.random()<.3)fxSpark({x:SE.x+rnd(-60,60),y:SE.y+rnd(-40,40),z:SE.z+rnd(-60,60)},'#8fc8ff',1);
  if(OE&&OE.o.type==='forge')sprite(OE.x,OE.y-26,OE.z,70,[1,.55,.2],.45);
  if(FJFX&&W.bridge)warpStreaks3D();
  flushBB();G.depthMask(true);G.disable(G.BLEND);
}

// ---- 2D overlay
function drawOverlay(){
  const c=octx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,VW,VH);
  if(!W)return;const p=W.player,t=W.t,sec=S.sectors[W.sid];if(p)jumpFx(c);
  if(sec.storm>S.T){c.fillStyle=`rgba(120,140,255,${.05+.03*Math.sin(t*7)})`;c.fillRect(0,0,VW,VH);if(Math.random()<.02){c.strokeStyle='rgba(200,220,255,.5)';c.beginPath();let x=rnd(VW),y=0;c.moveTo(x,y);while(y<VH){x+=rnd(-40,40);y+=rnd(20,60);c.lineTo(x,y)}c.stroke()}}
  if(W.hurt){c.fillStyle=`rgba(255,93,79,${W.hurt*.5})`;c.fillRect(0,0,VW,VH)}
  frigWarpFx(c);
  if(W.bridge){drawBridgeOverlay(c,t);return}
  if(W.gunseat){drawGunnerOverlay(c,t);return}
  if(S.player.docked||W.dead)return;
  drawDocking(c);jamFx(c);blDraw(c);unbHud(c);if(W.truce){c.save();c.textAlign='center';c.font='700 14px "Saira Semi Condensed",sans-serif';c.fillStyle='#9be35a';c.fillText('TRUCE ZONE: ONLY THE BROOD IS A TARGET',VW/2,92);c.restore()}
  if(W.shHit)vignette(c,'111,183,255',W.shHit*1.3);
  const crit=p.hull<p.st.hull*.35;
  if(p.shield<=.5||crit)vignette(c,'255,93,79',(crit?.55:.36)+(crit?.22:.16)*Math.sin(t*(crit?9:6)));
  if(crit&&W.t-(W.critT||-9)>1.2){W.critT=W.t;SFX.alarm()}
  if(cam.mode==='cockpit')drawCockpit(c,p,t);
  drawHorizon(c,p);drawStatusRing(c,p,t);drawGateCountdown(c,t);
  c.font='600 11px "Saira Semi Condensed",sans-serif';c.lineWidth=1.5;
  for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.isPlayer||!seenShip(e))continue;const P=proj(e.x,e.y,e.z);if(P.behind||P.d>4500*SPREAD||P.x<0||P.y<0||P.x>VW||P.y>VH)continue;const r=Math.max(7,projR(P.d,e.st.radius*1.4)),col=sideCol(e.side),h=hostile('player',e.side);
    if(!h){const uf=W.t-e.lastHit<2.5&&hostile(e.side,e.lastHitBy);const tg=e.ai&&e.ai.tgt;
      if(tg&&tg.alive&&hostile(e.side,tg.side)&&!tg.isPlayer&&d3(e,tg)<2500){const Q=proj(tg.x,tg.y,tg.z);if(!Q.behind){c.strokeStyle='rgba(122,217,167,.28)';c.setLineDash([4,6]);c.beginPath();c.moveTo(P.x,P.y);c.lineTo(Q.x,Q.y);c.stroke();c.setLineDash([])}}
      if(uf){const pr=r+6+3*Math.sin(t*10);c.strokeStyle='rgba(255,93,79,.85)';c.beginPath();c.arc(P.x,P.y,pr,0,TAU);c.stroke();c.textAlign='center';c.fillStyle='#ff8a7e';c.fillText('UNDER FIRE',P.x,P.y-pr-6)}
      else if(e.role==='flee'){c.textAlign='center';c.fillStyle='rgba(240,178,74,.85)';c.fillText('RETREATING',P.x,P.y-r-12)}}
    c.strokeStyle=hexA(col,h?.85:.45);c.beginPath();if(h){c.moveTo(P.x-r,P.y-r+4);c.lineTo(P.x-r,P.y-r);c.lineTo(P.x-r+4,P.y-r);c.moveTo(P.x+r-4,P.y-r);c.lineTo(P.x+r,P.y-r);c.lineTo(P.x+r,P.y-r+4);c.moveTo(P.x-r,P.y+r-4);c.lineTo(P.x-r,P.y+r);c.lineTo(P.x-r+4,P.y+r);c.moveTo(P.x+r-4,P.y+r);c.lineTo(P.x+r,P.y+r);c.lineTo(P.x+r,P.y+r-4)}else{c.moveTo(P.x,P.y-r-2);c.lineTo(P.x+4,P.y-r-7);c.lineTo(P.x-4,P.y-r-7);c.closePath()}c.stroke()}
  const marks=[],nxg=routeNext();for(const g of GATES[W.sid]){const nx=nxg&&nxg.to===g.to;marks.push({o:g,l:(nx?'NEXT JUMP ':'')+'→ '+DEF[g.to].name,c:S.gateDown[gateKey(W.sid,g.to)]?'#ff5d4f':nx?'#f0b24a':'#dfe8ff',r:120})}
  const SE=W.stationEnt,OE=W.outpostEnt,blk=Math.floor(t*4)%2===0;if(SE){const ua=friendSide(SE.fac)&&W.t-SE.lastHit<4;marks.push({o:SE,l:SE.name,c:ua&&blk?'#ff5d4f':sideCol(SE.fac),r:130,sub:ua?'UNDER ATTACK':''})}if(OE){const ua=friendSide(OE.o.owner)&&W.t-OE.lastHit<4;marks.push({o:OE,l:OE.o.name,c:ua&&blk?'#ff5d4f':sideCol(OE.o.owner),r:140,sub:(ua?'UNDER ATTACK · ':'')+(OE.o.breached?'BREACHED · ':'')+(OE.o.owner?sideName(OE.o.owner).toUpperCase():'UNCLAIMED')+' · LEVEL '+OE.o.level})}
  for(const e of W.ents)if(e.pname&&e.alive&&e!==p&&e.type==='ship'&&!(hostile('player',e.side)&&mHid(e,p)))marks.push({o:e,l:e.pname,c:/\(Legendary Ace\)/.test(e.pname)?'#ffd27a':sideCol(e.side),r:e.st.radius*1.25,sub:(e.aceId?(e.side==='pirate'?'UNBOUND CAPTAIN · ':'ACE · '):hostile('player',e.side)?'HOSTILE PILOT · ':'PILOT · ')+hullName(e.fac,e.cls).toUpperCase()});
  for(const a of sec.ast)if(a.comet)marks.push({o:a,l:'Comet',c:'#c99cff',r:astR(a)});
  for(const cr of sec.crates)if(cr.derelict)marks.push({o:cr,l:'Derelict cargo',c:'#f0b24a',r:16});
  for(const m of marks){const P=proj(m.o.x,m.o.y,m.o.z),d=Math.round(d3(m.o,p)/10)*10,on=!P.behind&&P.x>20&&P.y>20&&P.x<VW-20&&P.y<VH-20;
    if(on){const r=projR(P.d,m.r);c.textAlign='center';c.fillStyle=hexA(m.c,.9);c.fillText(m.l.toUpperCase(),P.x,P.y+r+16);c.fillStyle='rgba(140,145,165,.9)';c.fillText((m.sub?m.sub+' · ':'')+fmt(d)+' m',P.x,P.y+r+30)}
    else edgeMark(P,m.l+'  '+fmt(d)+' m',m.c)}
  if(W.ftgt&&(!W.ftgt.alive||!W.ents.includes(W.ftgt)&&W.ftgt!==W.player)){W.ftgt=null;closeComms()}
  if(commsOpen()&&(W.t-(W.commsT||0)>12||mouse.l||keys.Space))closeComms();
  {const bl=Math.sin(W.t*9)>0;for(const b of W.npcBl||[]){const k=b.t/b.T,L=proj(b.x+(b.tx-b.x)*k,b.y+(b.ty-b.y)*k,b.z+(b.tz-b.z)*k);if(L.behind||L.d>4000)continue;c.fillStyle='#ffd27a';c.beginPath();c.arc(L.x,L.y,2.2,0,TAU);c.fill()}
    if(bl)for(const m of W.ents){const B=m.ai&&m.ai.bl;if(!B||!(B.st==='set'||B.st==='clear'))continue;for(const q of B.pts){const L=proj(q.x,q.y,q.z);if(L.behind||L.d>4000)continue;c.fillStyle='#f0b24a';c.beginPath();c.arc(L.x,L.y,3,0,TAU);c.fill()}}}
  if(W.ftgt&&W.ftgt!==W.player){const T=W.ftgt,P=proj(T.x,T.y,T.z);if(!P.behind&&P.x>0&&P.y>0&&P.x<VW&&P.y<VH){const r=Math.max(12,projR(P.d,T.st.radius*1.25))+10;c.strokeStyle='#7ad9a7';c.lineWidth=1.5;c.setLineDash([4,4]);c.beginPath();c.arc(P.x,P.y,r,0,Math.PI*2);c.stroke();c.setLineDash([]);c.textAlign='center';c.fillStyle='#7ad9a7';c.fillText('FRIENDLY · '+ftgtName(T),P.x,P.y+r+14)}}
  // a mining hull aiming at a rock or wreck section sees only the charge reticle (blDraw): no gun sight, target brackets or
  // velocity marker to mistake for where the charge lands
  const blAim=blHull(S.player.cls)&&W.tgt&&(W.tgt.kind==='ast'||W.tgt.kind==='wpt')&&validTgt(W.tgt);
  if(W.tgt&&validTgt(W.tgt)){const T=W.tgt.ref,P=proj(T.x,T.y,T.z),col=W.tgt.kind==='ship'?(hostile('player',T.side)?'#ff5d4f':'#7ad9a7'):'#f0b24a';
    if(!blAim&&!P.behind&&P.x>0&&P.y>0&&P.x<VW&&P.y<VH){const r=Math.max(12,projR(P.d,tRad(W.tgt)))+6;c.strokeStyle=col;c.lineWidth=2;for(const[dx,dy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(P.x+dx*r,P.y+dy*r-dy*9);c.lineTo(P.x+dx*r,P.y+dy*r);c.lineTo(P.x+dx*r-dx*9,P.y+dy*r);c.stroke()}
      c.textAlign='left';c.fillStyle=col;c.fillText(fmt(Math.round(d3(T,p)))+' m',P.x+r+6,P.y-r+8)}
    if(W.tgt.kind==='ship'&&hostile('player',T.side)&&S.player.wpn!=='laser'){const lp=leadPoint(p,T,p.st.shotSpd||SHOT_SPD),L=proj(lp.x,lp.y,lp.z);if(!L.behind){c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.moveTo(L.x,L.y-8);c.lineTo(L.x+8,L.y);c.lineTo(L.x,L.y+8);c.lineTo(L.x-8,L.y);c.closePath();c.stroke()}}}
  {const las=S.player.wpn==='laser',LRy=las?laserRay(p,LASER_RANGE):null,onH=!!(LRy&&LRy.hit&&(LRy.hit.kind==='ship'||LRy.hit.kind==='outpost'));
    qRot(p.q,0,0,1,_f);const A=proj(p.x+_f.x*900,p.y+_f.y*900,p.z+_f.z*900);
    if(!A.behind&&!blAim){const col=las?(onH?'#ff5d4f':'rgba(165,222,255,.95)'):'rgba(240,178,74,.9)';c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();
      if(las){c.moveTo(A.x,A.y-10);c.lineTo(A.x+10,A.y);c.lineTo(A.x,A.y+10);c.lineTo(A.x-10,A.y);c.closePath()}else c.arc(A.x,A.y,9,0,TAU);c.stroke();
      c.beginPath();c.moveTo(A.x-17,A.y);c.lineTo(A.x-12,A.y);c.moveTo(A.x+12,A.y);c.lineTo(A.x+17,A.y);c.moveTo(A.x,A.y-17);c.lineTo(A.x,A.y-12);c.stroke();
      if(onH){c.fillStyle=col;c.beginPath();c.arc(A.x,A.y,3,0,TAU);c.fill()}
      if(las&&W.tgt&&lockable(W.tgt)&&d3(W.tgt.ref,p)>LASER_RANGE){c.textAlign='center';c.fillStyle='rgba(165,222,255,.85)';c.fillText(`LASER RANGE ${LASER_RANGE} M`,A.x,A.y+30)}}}
  const sp=hyp(p.vx,p.vy,p.vz);if(sp>30&&!blAim){const Vv=proj(p.x+p.vx/sp*900,p.y+p.vy/sp*900,p.z+p.vz/sp*900);if(!Vv.behind){c.strokeStyle='rgba(122,217,167,.75)';c.beginPath();c.arc(Vv.x,Vv.y,5,0,TAU);c.moveTo(Vv.x+5,Vv.y);c.lineTo(Vv.x+11,Vv.y);c.moveTo(Vv.x-5,Vv.y);c.lineTo(Vv.x-11,Vv.y);c.moveTo(Vv.x,Vv.y-5);c.lineTo(Vv.x,Vv.y-11);c.stroke()}}
  // missile lock ring and lock box
  {qRot(p.q,0,0,1,_f);const RA=proj(p.x+_f.x*900,p.y+_f.y*900,p.z+_f.z*900),ax=RA.x,ay=RA.y,ab=RA.behind,LR=W.lock,Rl=Math.tan(LOCK_CONE)/Math.tan(cam.fov*Math.PI/360)*VH/2;
    if(lockable(W.tgt)&&S.player.rack>0&&!ab){c.setLineDash([4,6]);c.strokeStyle=LR.locked?'rgba(255,93,79,.9)':'rgba(240,178,74,.55)';c.lineWidth=1.2;c.beginPath();c.arc(ax,ay,Rl,0,TAU);c.stroke();c.setLineDash([])}
    if(LR.ref&&LR.p>0){const T=LR.ref,P2=proj(T.x,T.y,T.z);if(!P2.behind){const base=Math.max(12,projR(P2.d,T.type==='outpost'?100:T.st?T.st.radius*1.3:(T.r||130)))+10,sz=base+(1-LR.p)*60;c.save();c.translate(P2.x,P2.y);c.rotate(Math.PI/4);c.strokeStyle=LR.locked?'#ff5d4f':'rgba(240,178,74,.9)';c.lineWidth=LR.locked?2.5:1.5;c.strokeRect(-sz*.7,-sz*.7,sz*1.4,sz*1.4);c.restore();c.textAlign='center';c.fillStyle=LR.locked?'#ff5d4f':'#f0b24a';c.fillText(LR.locked?'LOCKED':'LOCKING '+Math.round(LR.p*100)+'%',P2.x,P2.y+sz+18)}}}
  // threat ring: arrows toward off-screen hostiles, the target and incoming missiles
  {const ringR=Math.min(VW,VH)*.3,cx=VW/2,cy=VH/2;
    const ringMark=(P2,col,size,label)=>{let dx=P2.x-cx,dy=P2.y-cy;const l=hyp(dx,dy)||1;dx/=l;dy/=l;const x=cx+dx*ringR,y=cy+dy*ringR;c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle=col;c.beginPath();c.moveTo(size,0);c.lineTo(-size*.6,-size*.7);c.lineTo(-size*.6,size*.7);c.closePath();c.fill();c.restore();if(label){c.textAlign=dx<0?'right':'left';c.fillStyle=col;c.fillText(label,x+dx*18,y+dy*18+4)}};
    const off=P2=>P2.behind||P2.x<0||P2.y<0||P2.x>VW||P2.y>VH;
    for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.isPlayer||!hostile('player',e.side))continue;if(W.tgt&&W.tgt.ref===e)continue;const P2=proj(e.x,e.y,e.z);if(P2.d>3500||!off(P2))continue;ringMark(P2,'rgba(255,93,79,.75)',6)}
    if(W.tgt&&validTgt(W.tgt)){const T=W.tgt.ref,P2=proj(T.x,T.y,T.z);if(off(P2))ringMark(P2,'#f0b24a',11,'TARGET '+fmt(Math.round(d3(T,p)))+' M')}
    for(const m of W.missiles){if(m.kind!=='torpedo'||!hostile('player',m.side)||m.tgt===p)continue;const P2=proj(m.x,m.y,m.z);if(off(P2)||P2.d>3000)continue;c.strokeStyle='#ffcf5a';c.lineWidth=1.5;c.beginPath();c.arc(P2.x,P2.y,10,0,TAU);c.stroke();c.textAlign='left';c.fillStyle='#ffcf5a';c.fillText('TORPEDO',P2.x+14,P2.y+4)}
    if(W.missiles.some(m=>m.tgt===p)&&W.t-(W.warnT||0)>.65){W.warnT=W.t;SFX.warn()}
    let inc=null,incD=1e9;for(const m of W.missiles){if(m.tgt!==p)continue;const d=d3(m,p);if(d<incD){incD=d;inc=m}const P2=proj(m.x,m.y,m.z);if(!off(P2)){c.strokeStyle='#ff5d4f';c.lineWidth=2;c.beginPath();c.moveTo(P2.x,P2.y-9);c.lineTo(P2.x+9,P2.y);c.lineTo(P2.x,P2.y+9);c.lineTo(P2.x-9,P2.y);c.closePath();c.stroke()}else ringMark(P2,'#ff5d4f',12)}
    let lw=0;for(const e of W.ents)if(e.npc&&e.ai.tgt===p&&(e.ai.lock||0)>lw)lw=e.ai.lock;
    const blink=Math.floor(t*4)%2===0;c.font='700 16px "Big Shoulders Display",sans-serif';c.textAlign='center';
    if(inc){if(blink){c.fillStyle='#ff5d4f';c.fillText(`MISSILE INBOUND · ${fmt(incD)} M · B FOR FLARES`,cx,cy-ringR-28)}}
    else if(lw>.3&&blink){c.fillStyle='#f0b24a';c.fillText('ENEMY MISSILE LOCK WARNING',cx,cy-ringR-28)}
    if(p.hull<p.st.hull*.35){c.fillStyle='#ff5d4f';if(blink)c.fillText(`HULL CRITICAL ${Math.round(p.hull/p.st.hull*100)}% · BREAK OFF AND BOOST AWAY`,cx,cy+ringR+18);c.font='600 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.85)';c.fillText('Dock at any friendly station to repair',cx,cy+ringR+36);c.font='700 16px "Big Shoulders Display",sans-serif'}
    else if(p.shield<=.5){const storm=S.sectors[W.sid].storm>S.T,wait=Math.max(0,2.5-(W.t-p.lastHit));c.fillStyle='#ff5d4f';if(blink)c.fillText(p.energy>12?'SHIELDS DOWN · HOLD SHIFT TO BOOST AWAY':'SHIELDS DOWN · ENERGY LOW · BREAK LINE OF FIRE',cx,cy+ringR+18);
      c.font='600 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.85)';c.fillText(storm?'Ion storm: shields cannot recharge in this sector':wait>0?`Recharge starts ${wait.toFixed(1)} s after the last hit`:'Recharging…',cx,cy+ringR+36);c.font='700 16px "Big Shoulders Display",sans-serif'}
    else if(W.t-(p.shUpT===undefined?-9:p.shUpT)<1.5){c.fillStyle='#8fc8ff';c.fillText('SHIELDS ONLINE',cx,cy+ringR+18)}
    else if(p.shield<p.st.sCap*.3&&blink){c.fillStyle='#f0b24a';c.fillText('SHIELDS LOW',cx,cy+ringR+18)}
    c.font='600 11px "Saira Semi Condensed",sans-serif'}
  if(!touchUI()){const sc=Math.min(VW,VH)*.42;c.strokeStyle='rgba(236,228,207,.18)';c.lineWidth=1;c.beginPath();c.arc(VW/2,VH/2,sc*.07,0,TAU);c.stroke();c.beginPath();c.arc(VW/2,VH/2,sc,0,TAU);c.setLineDash([2,10]);c.stroke();c.setLineDash([]);
    if(mouse.in&&mouse.aim){c.strokeStyle='rgba(236,228,207,.4)';c.beginPath();c.moveTo(VW/2,VH/2);c.lineTo(mouse.x,mouse.y);c.stroke();c.beginPath();c.arc(mouse.x,mouse.y,4,0,TAU);c.stroke()}}
  if(touch.on){c.strokeStyle='rgba(236,228,207,.35)';c.lineWidth=1.5;c.beginPath();c.arc(touch.ox,touch.oy,70,0,TAU);c.stroke();c.fillStyle='rgba(240,178,74,.6)';const m=Math.min(70,hyp(touch.dx,touch.dy)),a=Math.atan2(touch.dy,touch.dx);c.beginPath();c.arc(touch.ox+Math.cos(a)*m,touch.oy+Math.sin(a)*m,16,0,TAU);c.fill()}
}
// a light cockpit frame: canopy struts, top bow and a slim dash with three small displays; it sways against turning
// Cockpits: the faction sets the materials and shape language, the hull sets the frame and the instruments.
// Halcyon: pale lacquered alloy, smooth curves, rounded glass. Varkesh: bare gunmetal, kinked angular struts, rivets and
// hazard paint. Ostrova: violet-black lacquer, ribbed struts with glowing seams, arched glass and glyph ticks.
const CK_FAC={
  halcyon:{m0:'rgba(38,52,62,.96)',m1:'rgba(9,15,21,.98)',shape:'curve',pip:'round',emb:'ring',panelBg:'rgba(4,12,16,.94)'},
  varkesh:{m0:'rgba(46,32,26,.97)',m1:'rgba(12,8,7,.99)',shape:'angle',pip:'square',emb:'fang',panelBg:'rgba(14,8,5,.95)'},
  ostrova:{m0:'rgba(36,27,56,.96)',m1:'rgba(9,7,18,.98)',shape:'rib',pip:'diamond',emb:'eye',panelBg:'rgba(9,6,18,.94)'}};
// w: strut weight · top: where the side struts meet the canopy rim (fraction of width) · brow: canopy-rim style
// inner: extra strut pairs · mull: centre mullion weight · dash: dashboard height · panels: instruments, left to right
const CK_CLS={
  interceptor:{w:.7,top:.31,brow:'bubble',inner:0,mull:0,dash:.8,panels:['vitals','speed','weapons']},
  striker:{w:1,top:.27,brow:'thin',inner:0,mull:0,dash:.95,panels:['vitals','speed','weapons']},
  gunboat:{w:1.3,top:.26,brow:'armored',inner:1,mull:0,dash:1.1,panels:['ordnance','vitals','speed','weapons']},
  heavy:{w:1.45,top:.25,brow:'armored',inner:1,mull:0,dash:1.15,panels:['ordnance','vitals','speed','weapons']},
  bomber:{w:1.7,top:.24,brow:'armored',inner:1,mull:0,dash:1.25,panels:['bay','vitals','speed','weapons'],sight:true},
  skiff:{w:.9,top:.27,brow:'console',inner:0,mull:0,dash:.95,panels:['vitals','speed','drill'],ops:'MINING'},
  prospector:{w:1.1,top:.26,brow:'console',inner:0,mull:0,dash:1.05,panels:['vitals','speed','drill','drones'],ops:'MINING'},
  dredger:{w:1.4,top:.25,brow:'console',inner:1,mull:0,dash:1.2,panels:['drones','vitals','speed','drill'],ops:'DEEP MINING',lamps:true},
  courier:{w:1,top:.2,brow:'visor',inner:0,mull:0,dash:.9,panels:['vitals','speed','cargo']},
  freighter:{w:1.25,top:.21,brow:'visor',inner:0,mull:.8,dash:1.1,panels:['vitals','speed','cargo','drones']},
  bulker:{w:1.6,top:.22,brow:'armored',inner:1,mull:1.3,dash:1.25,panels:['manifest','vitals','speed','cargo','drones']},
  scout:{w:.38,top:.36,brow:'bubble',inner:0,mull:0,dash:.95,panels:['intel','vitals','scope','speed','scan'],bubble:true,narrowKinds:['scope']},
  constructor:{w:1.5,top:.23,brow:'console',inner:1,mull:0,dash:1.25,panels:['vitals','speed','build','cargo'],ops:'CONSTRUCTION',lamps:true}};
function drawCockpit(c,p,t){const P=S.player,F=CK_FAC[P.faction]||CK_FAC.halcyon,K=CK_CLS[P.cls]||CK_CLS.striker,fc=FAC(P.faction).col,
    ox=-(p.wy||0)*16,oy=(p.wx||0)*13,w=Math.max(12,VW*.013)*K.w,dh=Math.min(108,VH*.12)*K.dash,narrow=VW<700,shp=F.shape;
  c.save();c.translate(ox,oy);
  {const g=c.createRadialGradient(VW/2,VH*.45,Math.min(VW,VH)*.3,VW/2,VH*.45,Math.max(VW,VH)*.75);g.addColorStop(0,hexA(fc,0));g.addColorStop(1,hexA(fc,.07));c.fillStyle=g;c.fillRect(-40,-40,VW+80,VH+80)}
  const metal=c.createLinearGradient(0,0,0,VH);metal.addColorStop(0,F.m0);metal.addColorStop(1,F.m1);
  const rivets=(pts)=>{for(const[x,y]of pts){c.fillStyle='rgba(10,6,4,.9)';c.beginPath();c.arc(x,y,2.4,0,TAU);c.fill();c.fillStyle='rgba(190,150,120,.35)';c.beginPath();c.arc(x-.6,y-.6,1.1,0,TAU);c.fill()}};
  // ---- side struts (outer pair, then any inner pairs)
  const strut=(sd,top,bx,ww,a)=>{const X=x=>sd<0?x:VW-x,tx=VW*top,mx=bx+(tx-bx)*.23;
    if(shp==='angle'){const k1=[bx+(mx-bx)*.55,VH*.74],k2=[mx+(tx-mx)*.32,VH*.3];
      c.beginPath();c.moveTo(X(bx),VH+30);c.lineTo(X(k1[0]),k1[1]);c.lineTo(X(k2[0]),k2[1]);c.lineTo(X(tx),-30);c.lineTo(X(tx+ww*1.25),-30);c.lineTo(X(k2[0]+ww*1.3),k2[1]);c.lineTo(X(k1[0]+ww*1.25),k1[1]);c.lineTo(X(bx+ww*2.2),VH+30);c.closePath();c.fillStyle=metal;c.globalAlpha=a;c.fill();
      c.beginPath();c.moveTo(X(bx+ww*2.2),VH+30);c.lineTo(X(k1[0]+ww*1.25),k1[1]);c.lineTo(X(k2[0]+ww*1.3),k2[1]);c.lineTo(X(tx+ww*1.25),-30);c.strokeStyle=hexA(fc,.42);c.lineWidth=1.6;c.stroke();c.globalAlpha=1;
      rivets([[X(k1[0]+ww*.6),k1[1]],[X(k2[0]+ww*.65),k2[1]],[X((k1[0]+k2[0])/2+ww*.62),(k1[1]+k2[1])/2]]);return}
    const ox2=ww*1.3,m2=ww*1.7,b2=ww*2.4;
    if(shp==='rib'){c.globalAlpha=a;for(let i=0;i<3;i++){const o=i/3;c.beginPath();c.moveTo(X(bx+b2*o),VH+30);c.quadraticCurveTo(X(mx+m2*o),VH*.46,X(tx+ox2*o),-30);c.strokeStyle=metal;c.lineWidth=ww*.85;c.stroke()}
      for(let i=0;i<2;i++){const o=(i+.5)/3;c.beginPath();c.moveTo(X(bx+b2*o),VH+30);c.quadraticCurveTo(X(mx+m2*o),VH*.46,X(tx+ox2*o),-30);c.strokeStyle=hexA(fc,.3+.14*Math.sin(t*1.7+i));c.lineWidth=1.3;c.stroke()}
      c.globalAlpha=1;return}
    c.beginPath();c.moveTo(X(bx),VH+30);c.quadraticCurveTo(X(mx),VH*.46,X(tx),-30);c.lineTo(X(tx+ox2),-30);c.quadraticCurveTo(X(mx+m2),VH*.46,X(bx+b2),VH+30);c.closePath();c.fillStyle=metal;c.globalAlpha=a;c.fill();
    c.beginPath();c.moveTo(X(bx+b2),VH+30);c.quadraticCurveTo(X(mx+m2),VH*.46,X(tx+ox2),-30);c.strokeStyle=hexA(fc,.38);c.lineWidth=1.5;c.stroke();
    c.beginPath();c.moveTo(X(bx+b2*.5),VH+30);c.quadraticCurveTo(X(mx+m2*.5),VH*.46,X(tx+ox2*.5),-30);c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=1;c.stroke();c.globalAlpha=1};
  if(K.bubble){c.save();const cx=VW/2,cyB=VH*.62,rx=VW*.66,ry=VH*.78;
    c.strokeStyle=hexA(fc,.22);c.lineWidth=2.2;c.beginPath();c.ellipse(cx,cyB,rx,ry,0,Math.PI*1.04,Math.PI*1.96);c.stroke();
    c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=7;c.beginPath();c.ellipse(cx,cyB,rx*.97,ry*.97,0,Math.PI*1.12,Math.PI*1.3);c.stroke();
    c.strokeStyle=hexA(fc,.3);c.lineWidth=3;c.beginPath();c.moveTo(cx,-10);c.lineTo(cx,VH*.055);c.stroke();c.fillStyle=hexA(fc,.5);c.beginPath();c.arc(cx,VH*.055+3,3,0,TAU);c.fill();
    for(const sd of[-1,1]){c.strokeStyle=hexA(fc,.14);c.lineWidth=1.4;c.beginPath();c.moveTo(cx+sd*VW*.47,VH+20);c.quadraticCurveTo(cx+sd*VW*.43,VH*.35,cx+sd*VW*.2,-10);c.stroke()}
    const g=c.createLinearGradient(VW*.62,0,VW*.8,VH*.3);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.035)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(VW*.66,0);c.lineTo(VW*.74,0);c.lineTo(VW*.86,VH*.34);c.lineTo(VW*.8,VH*.34);c.closePath();c.fill();
    c.restore()}
  for(const sd of[-1,1]){strut(sd,K.top,-30,w,1);for(let i=1;i<=K.inner;i++)strut(sd,K.top+.07*i,VW*.05*i,w*.55,.92)}
  // ---- canopy rim
  const x0=VW*(K.top-.01),x1=VW*(1-K.top+.01),bt=K.brow==='bubble'?0:K.brow==='thin'?w:K.brow==='visor'?w*1.8:K.brow==='console'?w*2.5:w*2.9;
  if(K.brow==='visor'){const g=c.createLinearGradient(0,0,0,VH*.16);g.addColorStop(0,'rgba(10,14,22,.42)');g.addColorStop(1,'rgba(10,14,22,0)');c.fillStyle=g;c.fillRect(x0,0,x1-x0,VH*.16)}
  if(bt>0){c.beginPath();
    if(shp==='angle'){c.moveTo(x0,-30);c.lineTo(x0+VW*.06,bt+VH*.02);c.lineTo(x1-VW*.06,bt+VH*.02);c.lineTo(x1,-30);c.closePath()}
    else if(K.brow==='armored'){c.moveTo(x0,-30);c.quadraticCurveTo(x0+VW*.03,bt+VH*.02,x0+VW*.09,bt+VH*.02);c.lineTo(x1-VW*.09,bt+VH*.02);c.quadraticCurveTo(x1-VW*.03,bt+VH*.02,x1,-30);c.closePath()}
    else{c.moveTo(x0,-30);c.quadraticCurveTo(VW/2,VH*.045+bt,x1,-30);c.closePath()}
    c.fillStyle=metal;c.fill();c.strokeStyle=hexA(fc,.32);c.lineWidth=1.3;c.stroke();
    const by=shp==='angle'||K.brow==='armored'?bt+VH*.02:VH*.045/2+bt*.55;
    if(K.brow==='armored'){c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=2;c.beginPath();c.moveTo(VW*.42,by-bt*.45);c.lineTo(VW*.58,by-bt*.45);c.stroke();c.strokeStyle=hexA(fc,.25);c.lineWidth=1;c.beginPath();c.moveTo(VW*.42,by-bt*.45+2);c.lineTo(VW*.58,by-bt*.45+2);c.stroke()}
    if(K.brow==='console'){c.font='600 9px "JetBrains Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=hexA(fc,.75);c.fillText(K.ops+' · '+(P.cls==='constructor'?'K BUILD':'F DRILL'),VW/2,by-bt*.5);
      for(let i=0;i<8;i++){const on=p.mining?(Math.floor(t*6)+i)%4===0:i===0;c.fillStyle=on?fc:'rgba(255,255,255,.08)';c.fillRect(VW/2-62+i*16,by-bt*.15,7,2.5)}
      if(K.lamps)for(const lx of[x0+VW*.07,x1-VW*.07]){const g=c.createRadialGradient(lx,by,0,lx,by,VW*.06);g.addColorStop(0,'rgba(255,240,210,.14)');g.addColorStop(1,'rgba(255,240,210,0)');c.fillStyle=g;c.fillRect(lx-VW*.06,by-VW*.06,VW*.12,VW*.12);c.fillStyle='rgba(255,236,200,.8)';c.beginPath();c.arc(lx,by-2,2.6,0,TAU);c.fill()}}
    if(shp==='angle')rivets([[x0+VW*.08,bt+VH*.02-4],[x1-VW*.08,bt+VH*.02-4],[VW*.35,bt+VH*.02-4],[VW*.65,bt+VH*.02-4]]);
    if(shp==='rib'){for(let i=0;i<9;i++){const gx=VW*.36+i*VW*.035;c.fillStyle=hexA(fc,(i+Math.floor(t*2))%3===0?.5:.16);c.fillRect(gx,by-bt*.35,2,4)}}}
  else{c.beginPath();c.moveTo(x0,-6);c.quadraticCurveTo(VW/2,VH*.03,x1,-6);c.strokeStyle=hexA(fc,.3);c.lineWidth=1;c.stroke();
    c.beginPath();c.moveTo(VW*.3,VH*.06);c.quadraticCurveTo(VW*.45,VH*.025,VW*.62,VH*.07);c.strokeStyle='rgba(255,255,255,.035)';c.lineWidth=6;c.stroke()}
  // ---- dash
  const sw=Math.min(150,VW*.1),gap=Math.min(14,VW*.008),kinds=narrow?(K.narrowKinds||['speed']):K.panels,kw=k=>k==='scope'?sw*1.55:k==='intel'||k==='scan'?sw*1.3:sw,rowW=kinds.reduce((a,k)=>a+kw(k),0)+(kinds.length-1)*gap,
    dx0=narrow?VW*.08:Math.min(VW*.2,VW/2-rowW/2-46),dx1=VW-dx0,top=VH-dh;
  if(K.mull){const mw=w*K.mull,y0=bt>0?VH*.045/2+bt*.6:0;c.fillStyle=metal;
    if(shp==='angle'){c.fillRect(VW/2-mw*.35,y0,mw*.7,top-y0);c.fillRect(VW/2-mw,y0,mw*2,4);c.fillRect(VW/2-mw,top-6,mw*2,6)}
    else if(shp==='rib'){c.fillRect(VW/2-mw*.7,y0,mw*.45,top-y0);c.fillRect(VW/2+mw*.25,y0,mw*.45,top-y0);c.fillStyle=hexA(fc,.2);c.fillRect(VW/2-.5,y0,1,top-y0)}
    else{c.beginPath();if(c.roundRect)c.roundRect(VW/2-mw*.5,y0,mw,top-y0+8,mw*.5);else c.rect(VW/2-mw*.5,y0,mw,top-y0+8);c.fill()}
    c.strokeStyle=hexA(fc,.25);c.lineWidth=1;c.strokeRect(VW/2-mw*.5,y0,mw,top-y0)}
  c.beginPath();
  if(shp==='angle'){c.moveTo(dx0-20,VH+30);c.lineTo(dx0+18,top);c.lineTo(dx1-18,top);c.lineTo(dx1+20,VH+30)}
  else{c.moveTo(dx0-20,VH+30);c.lineTo(dx0+30,top);c.quadraticCurveTo(VW/2,VH-dh*1.32,dx1-30,top);c.lineTo(dx1+20,VH+30)}
  c.closePath();const dg=c.createLinearGradient(0,VH-dh*1.3,0,VH);dg.addColorStop(0,F.m0.replace(/[\d.]+\)$/,'.98)'));dg.addColorStop(1,F.m1);c.fillStyle=dg;c.fill();
  c.beginPath();if(shp==='angle'){c.moveTo(dx0+18,top);c.lineTo(dx1-18,top)}else{c.moveTo(dx0+30,top);c.quadraticCurveTo(VW/2,VH-dh*1.32,dx1-30,top)}c.strokeStyle=hexA(fc,.55);c.lineWidth=1.5;c.stroke();
  if(shp==='angle'){c.save();c.beginPath();c.rect(dx0+18,top+2,dx1-dx0-36,5);c.clip();for(let x=dx0;x<dx1;x+=14){c.fillStyle='rgba(240,178,74,.55)';c.beginPath();c.moveTo(x,top+7);c.lineTo(x+7,top+2);c.lineTo(x+12,top+2);c.lineTo(x+5,top+7);c.fill()}c.restore();rivets([[dx0+30,top+14],[dx1-30,top+14],[dx0+30,VH-10],[dx1-30,VH-10]])}
  if(shp==='rib'){c.beginPath();c.moveTo(dx0+44,top+9);c.quadraticCurveTo(VW/2,VH-dh*1.32+9,dx1-44,top+9);c.strokeStyle=hexA(fc,.18);c.lineWidth=1;c.stroke();for(let i=0;i<24;i++){const u=i/23,x=dx0+60+(dx1-dx0-120)*u;c.fillStyle=hexA(fc,.12+.25*((Math.sin(t*1.3+i*.7)+1)/2));c.fillRect(x,VH-7,1.5,3+((i*7)%4))}}
  // emblem and hull plate
  {const ey=shp==='angle'?top+18:VH-dh*1.16+12,ex=VW/2;c.strokeStyle=fc;c.fillStyle=fc;c.lineWidth=1.4;c.globalAlpha=.8;
    if(F.emb==='ring'){c.beginPath();c.arc(ex,ey,5,0,TAU);c.stroke();c.beginPath();c.arc(ex,ey,1.6,0,TAU);c.fill()}
    else if(F.emb==='fang'){c.beginPath();c.moveTo(ex-7,ey-4);c.lineTo(ex,ey+5);c.lineTo(ex+7,ey-4);c.lineTo(ex,ey);c.closePath();c.fill()}
    else{c.beginPath();c.moveTo(ex,ey-6);c.lineTo(ex+8,ey);c.lineTo(ex,ey+6);c.lineTo(ex-8,ey);c.closePath();c.stroke();c.beginPath();c.arc(ex,ey,2,0,TAU);c.fill()}
    c.globalAlpha=1;if(!narrow){c.font='500 9px "JetBrains Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='rgba(140,145,165,.6)';c.textAlign='right';c.fillText(`${FAC(P.faction).short.toUpperCase()} ${FAC(P.faction).hulls[P.cls].toUpperCase()} · ${CLASSES[P.cls].name.toUpperCase()}`,VW/2+rowW/2,VH-8)}}
  // ---- instruments
  const shh=Math.max(52,Math.min(74,dh*.62)),sy=VH-shh-Math.max(16,dh*.16);
  const box=(x,y,ww,hh)=>{c.fillStyle=F.panelBg;c.strokeStyle=hexA(fc,.35);c.lineWidth=1;c.beginPath();
    if(shp==='angle'){const k=6;c.moveTo(x+k,y);c.lineTo(x+ww-k,y);c.lineTo(x+ww,y+k);c.lineTo(x+ww,y+hh-k);c.lineTo(x+ww-k,y+hh);c.lineTo(x+k,y+hh);c.lineTo(x,y+hh-k);c.lineTo(x,y+k);c.closePath()}
    else if(shp==='rib'){c.moveTo(x,y+hh);c.lineTo(x,y+4);c.quadraticCurveTo(x+ww/2,y-hh*.42,x+ww,y+4);c.lineTo(x+ww,y+hh);c.closePath()}
    else{if(c.roundRect)c.roundRect(x,y,ww,hh,7);else c.rect(x,y,ww,hh)}c.fill();c.stroke()};
  const pip=(x,y,on,col,r)=>{r=r||3.2;c.fillStyle=on?col:'rgba(255,255,255,.08)';c.beginPath();if(F.pip==='square')c.rect(x-r,y-r,r*2,r*2);else if(F.pip==='diamond'){c.moveTo(x,y-r*1.2);c.lineTo(x+r,y);c.lineTo(x,y+r*1.2);c.lineTo(x-r,y)}else c.arc(x,y,r,0,TAU);c.fill()};
  const bar=(x,y,ww,f,col)=>{c.fillStyle='rgba(255,255,255,.08)';c.fillRect(x,y,ww,4);c.fillStyle=col;c.fillRect(x,y,ww*clamp(f,0,1),4)};
  const lab=(s,x,y,col,al)=>{c.textAlign=al||'left';c.fillStyle=col||'rgba(140,145,165,.9)';c.fillText(s,x,y)};
  c.font='600 10px "JetBrains Mono",monospace';c.textBaseline='middle';
  const holdF=invMass(P.cargo)/(p.st.cargo||1),aliveDr=(p.drones||[]).filter(d=>d.alive).length,bay=(P.bay&&P.bay.drone)||0,cap=pRack(P);
  let px=VW/2-rowW/2;
  for(const kd of kinds){const x=px,ww=kw(kd),cx=x+ww/2,ty=sy;if(kd!=='scope')box(x,sy,ww,shh);px+=ww+gap;
    if(kd==='speed'){const sp=hyp(p.vx,p.vy,p.vz),capS=p.st.maxSpd*1.95*(CLASSES[P.cls].boost||1);c.font='600 15px "JetBrains Mono",monospace';lab(Math.round(sp),cx,ty+shh*.38,p.boosting?'#ffd27a':'#ece4cf','center');
      c.font='500 9px "JetBrains Mono",monospace';lab(p.boosting?'BOOST':P.fa?'M/S · ASSIST':'M/S · DRIFT',cx,ty+shh*.66,null,'center');bar(x+8,sy+shh-8,sw-16,sp/capS,p.boosting?'#ffd27a':fc);c.font='600 10px "JetBrains Mono",monospace'}
    else if(kd==='vitals'){const ccx=x+sw*.3,ccy=sy+shh/2,r=shh*.32;const ring=(rr,f,col)=>{c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=3;c.beginPath();c.arc(ccx,ccy,rr,0,TAU);c.stroke();c.strokeStyle=col;c.beginPath();c.arc(ccx,ccy,rr,-Math.PI/2,-Math.PI/2+TAU*clamp(f,0,1));c.stroke()};
      ring(r,p.shield/p.st.sCap,p.shield<=.5&&Math.floor(t*4)%2?'#ff5d4f':'#6fb7ff');ring(r*.6,p.hull/p.st.hull,'#ece4cf');lab('SHD '+Math.round(p.shield),x+sw*.56,ccy-7,'#6fb7ff');lab('HUL '+Math.round(p.hull),x+sw*.56,ccy+8,'#ece4cf')}
    else if(kd==='weapons'){lab(P.wpn==='laser'?'LASER':'KINETIC',x+9,ty+shh*.28,P.wpn==='laser'?'#a5deff':'#f0b24a');lab((CLASSES[P.cls].torp?'TRP ':'MSL ')+P.rack,x+sw-9,ty+shh*.28,'rgba(236,228,207,.85)','right');
      lab('ENERGY',x+9,ty+shh*.56);bar(x+9,sy+shh*.74,sw-18,p.energy/p.st.eCap,p.energy<p.st.eCap*.2?'#ff5d4f':'#f0b24a')}
    else if(kd==='ordnance'){lab('MISSILE RACK',x+9,ty+shh*.28);const n=Math.min(cap,12);for(let i=0;i<n;i++)pip(x+12+i*((sw-24)/Math.max(1,n-1)),sy+shh*.55,i<P.rack,'#f0b24a',3);
      lab('SWARM '+(P.cargo.swarm||0),x+9,sy+shh*.8,(P.cargo.swarm||0)>0?'#ff8fc0':null);lab(W.lock.locked?'LOCK':W.lock.p>0?Math.round(W.lock.p*100)+'%':'',x+sw-9,sy+shh*.8,W.lock.locked?'#7ad9a7':'#f0b24a','right')}
    else if(kd==='bay'){lab('TORPEDO BAY',x+9,ty+shh*.28);for(let i=0;i<cap;i++){const bx=x+12+i*((sw-24)/Math.max(1,cap-1));c.fillStyle=i<P.rack?'#f0b24a':'rgba(255,255,255,.08)';c.fillRect(bx-3,sy+shh*.45,6,shh*.22)}
      const lp=W.lock.locked?1:W.lock.p||0;bar(x+9,sy+shh*.8,sw-18,lp,lp>=1?'#7ad9a7':'#f0b24a');lab(lp>=1?'LOCKED':'LOCK',x+sw-9,sy+shh*.28,lp>=1?'#7ad9a7':null,'right')}
    else if(kd==='drill'){const nl=CLASSES[P.cls].lasers||1,a=p.mining;lab('DRILL',x+9,ty+shh*.26);for(let i=0;i<nl;i++)pip(x+sw-12-i*12,ty+shh*.26,!!a&&(Math.floor(t*8)+i)%3!==0,a?ITEMS[mainOre(a)||'fe'].col:fc);
      lab(a?(ITEMS[mainOre(a)||'fe'].name+' '+oreTotal(a)+' t'):(W.tgt&&W.tgt.kind==='ast'?'IN RANGE? 300 M':'NO TARGET'),x+9,ty+shh*.52,a?'#ece4cf':null);lab('HOLD',x+9,sy+shh*.8);bar(x+44,sy+shh*.78,sw-53,holdF,holdF>.9?'#ff5d4f':'#7ad9a7')}
    else if(kd==='cargo'){lab('HOLD',x+9,ty+shh*.28);lab(Math.round(invMass(P.cargo))+'/'+Math.round(p.st.cargo)+' t',x+sw-9,ty+shh*.28,'#ece4cf','right');bar(x+9,sy+shh*.5,sw-18,holdF,holdF>.9?'#ff5d4f':'#7ad9a7');
      const top2=Object.keys(P.cargo).sort((a,b)=>P.cargo[b]*mass(b)-P.cargo[a]*mass(a)).slice(0,1);lab(top2.length?(ITEMS[top2[0]].name+' ×'+P.cargo[top2[0]]).slice(0,20):'EMPTY',x+9,sy+shh*.78)}
    else if(kd==='manifest'){lab('MANIFEST',x+9,ty+shh*.24);const ks=Object.keys(P.cargo).sort((a,b)=>P.cargo[b]*mass(b)-P.cargo[a]*mass(a)).slice(0,3);c.font='500 9px "JetBrains Mono",monospace';
      ks.forEach((k,i)=>{lab(ITEMS[k].name.slice(0,13),x+9,ty+shh*(.46+i*.18),'rgba(236,228,207,.8)');lab(String(P.cargo[k]),x+sw-9,ty+shh*(.46+i*.18),'rgba(236,228,207,.8)','right')});if(!ks.length)lab('NO CARGO',x+9,ty+shh*.55);c.font='600 10px "JetBrains Mono",monospace'}
    else if(kd==='drones'){lab('GUARD DRONES',x+9,ty+shh*.28);const tot=Math.max(CLASSES[P.cls].drones||0,aliveDr+bay);for(let i=0;i<tot;i++)pip(x+14+i*18,sy+shh*.6,i<aliveDr,fc,4.2);lab(aliveDr+' OUT · '+bay+' BAY',x+9,sy+shh*.84)}
    else if(kd==='build'){const fr=P.cargo.frame||0,B=W.pbuild;lab('DEPOT FRAMES',x+9,ty+shh*.28);lab(fr+'/'+DEPOT_COST.frame,x+sw-9,ty+shh*.28,fr>=DEPOT_COST.frame?'#7ad9a7':'#ff8a4f','right');
      if(B){lab('BUILDING '+Math.round(B.prog*100)+'%',x+9,ty+shh*.55,'#ece4cf');bar(x+9,sy+shh*.78,sw-18,B.prog,fc)}else lab(S.stations[W.sid]?'SECTOR HAS A STATION':'K TO BUILD HERE',x+9,ty+shh*.6)}
    else if(kd==='scope'){// long-range scanner: the scout sees the whole sector. Forward is up; stems show height above or below you
      const R=Math.min(ww*.5,VH*.17),rcx=cx,rcy=VH-Math.max(10,dh*.1)-R*.62,RNG=3600*SPACE;
      c.save();c.beginPath();c.arc(rcx,rcy,R+7,0,TAU);c.fillStyle='rgba(4,9,16,.88)';c.fill();c.strokeStyle=hexA(fc,.55);c.lineWidth=2;c.stroke();c.beginPath();c.arc(rcx,rcy,R,0,TAU);c.clip();
      const bg=c.createRadialGradient(rcx,rcy,0,rcx,rcy,R);bg.addColorStop(0,hexA(fc,.1));bg.addColorStop(1,hexA(fc,.02));c.fillStyle=bg;c.fillRect(rcx-R,rcy-R,R*2,R*2);
      c.strokeStyle=hexA(fc,.2);c.lineWidth=1;for(const k of[1/3,2/3,1]){c.beginPath();c.arc(rcx,rcy,R*k,0,TAU);c.stroke()}c.beginPath();c.moveTo(rcx-R,rcy);c.lineTo(rcx+R,rcy);c.moveTo(rcx,rcy-R);c.lineTo(rcx,rcy+R);c.stroke();
      const sa=(t*1.4)%TAU;for(let i=0;i<18;i++){const a=sa-i*.045;c.strokeStyle=hexA(fc,.5*(1-i/18));c.lineWidth=2;c.beginPath();c.moveTo(rcx,rcy);c.lineTo(rcx+Math.cos(a-Math.PI/2)*R,rcy+Math.sin(a-Math.PI/2)*R);c.stroke()}
      qRot(p.q,1,0,0,_r);qRot(p.q,0,0,1,_f);qRot(p.q,0,1,0,_u);
      const plot=(o,draw)=>{const dx=o.x-p.x,dy=o.y-p.y,dz=o.z-p.z,lx=-(dx*_r.x+dy*_r.y+dz*_r.z),lz=dx*_f.x+dy*_f.y+dz*_f.z,ly=dx*_u.x+dy*_u.y+dz*_u.z;let k=hyp(lx,lz)/RNG;const kk=Math.min(1,k);
        const X=rcx+(k>0?lx/hyp(lx,lz):0)*kk*R*.98,Y=rcy-(k>0?lz/hyp(lx,lz):0)*kk*R*.98,a=(Math.atan2(lx,lz)+TAU)%TAU,age=((sa-a)%TAU+TAU)%TAU,fade=k>1?.45:.35+.65*(1-age/TAU);
        const st=clamp(-ly/RNG*R,-R*.35,R*.35);if(Math.abs(st)>2&&k<=1){c.strokeStyle=`rgba(200,210,230,${.25*fade})`;c.lineWidth=1;c.beginPath();c.moveTo(X,Y);c.lineTo(X,Y+st);c.stroke()}c.globalAlpha=fade;draw(X,Y+(k<=1?st:0),k>1);c.globalAlpha=1};
      for(const g of GATES[W.sid])plot(g,(X,Y)=>{c.fillStyle='rgba(236,228,207,.7)';c.beginPath();c.moveTo(X,Y-4);c.lineTo(X+3.5,Y+3);c.lineTo(X-3.5,Y+3);c.closePath();c.fill()});
      if(W.stationEnt)plot(W.stationEnt,(X,Y)=>{c.fillStyle=sideCol(W.stationEnt.fac);c.fillRect(X-4,Y-4,8,8)});
      if(W.outpostEnt)plot(W.outpostEnt,(X,Y)=>{const o=W.outpostEnt.o;c.fillStyle=o.owner?sideCol(o.owner):'#999';c.beginPath();c.moveTo(X,Y-5);c.lineTo(X+5,Y);c.lineTo(X,Y+5);c.lineTo(X-5,Y);c.closePath();c.fill()});
      for(const a of S.sectors[W.sid].ast)if(a.seam)plot(a,(X,Y)=>{c.fillStyle='#d9bbff';c.beginPath();c.arc(X,Y,2.2,0,TAU);c.fill()});
      for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===p||e.role==='drone')continue;const h=hostile('player',e.side),cap=e.role==='frigate';
        plot(e,(X,Y,edge)=>{c.fillStyle=h?'#ff5d4f':sideCol(e.side);if(cap){c.beginPath();c.moveTo(X,Y-6);c.lineTo(X+6,Y);c.lineTo(X,Y+6);c.lineTo(X-6,Y);c.closePath();c.fill();if(h){c.strokeStyle='#ff5d4f';c.lineWidth=1;c.beginPath();c.arc(X,Y,9+Math.sin(t*6)*1.5,0,TAU);c.stroke()}}else c.fillRect(X-2,Y-2,4,4);
          if(W.tgt&&W.tgt.ref===e){c.strokeStyle='#f0b24a';c.lineWidth=1.2;c.strokeRect(X-5,Y-5,10,10)}})}
      c.fillStyle='#ece4cf';c.beginPath();c.moveTo(rcx,rcy-6);c.lineTo(rcx+4,rcy+4);c.lineTo(rcx-4,rcy+4);c.closePath();c.fill();c.restore();
      c.font='600 9px "JetBrains Mono",monospace';lab('LONG-RANGE SCAN · '+(3.6*SPACE).toFixed(1)+' KM · FULL SECTOR',rcx,rcy-R-14,hexA(fc,.85),'center');c.font='600 10px "JetBrains Mono",monospace'}
    else if(kd==='intel'){lab('NEIGHBOUR REPORT',x+9,ty+11,hexA(fc,.85));c.font='500 9px "JetBrains Mono",monospace';
      const ns=NEIGH[W.sid].slice(0,4),rh=(shh-20)/Math.max(1,ns.length);
      ns.forEach((n,i)=>{const fr=(S.frigates||[]).filter(t=>t.sector===n&&hostile('player',t.side)),st=S.events.filter(e=>e.type==='offensive'&&e.sector===n&&e.stage!=='done'&&hostile('player',e.att)),br=fr.some(t=>t.side==='brood');
        const y=ty+22+rh*i+rh/2,txt=br?'⚠ LEVIATHAN':fr.length?`⚠ FRIGATE${fr.length>1?' ×'+fr.length:''}`:st.length?`STRIKE ×${st.reduce((a,e)=>a+e.n,0)}`:'CLEAR',col=fr.length?'#ff5d4f':st.length?'#f0b24a':'#7ad9a7';
        lab(DEF[n].name.toUpperCase().slice(0,Math.max(4,Math.floor((ww-18)/5.6)-txt.length-1)),x+9,y,'rgba(236,228,207,.8)');lab(txt,x+ww-9,y,col,'right')});c.font='600 10px "JetBrains Mono",monospace'}
    else if(kd==='scan'){lab('TARGET SCAN',x+9,ty+11,hexA(fc,.85));const T=W.tgt&&validTgt(W.tgt)?W.tgt:null;c.font='500 9px "JetBrains Mono",monospace';
      if(!T){lab('NO TARGET · T NEAREST',x+9,ty+shh*.55)}
      else{const r=T.ref,d=Math.round(d3(r,p));
        if(T.kind==='ship'){lab((r.tok?r.tok.name:shipLabel(r)).toUpperCase().slice(0,18),x+9,ty+24,hostile('player',r.side)?'#ffb3aa':'#ece4cf');lab(fmt(d)+' M',x+ww-9,ty+24,null,'right');
          bar(x+9,ty+33,ww-18,r.shield/r.st.sCap,'#6fb7ff');bar(x+9,ty+40,ww-18,r.hull/r.st.hull,'#ece4cf');
          const L=r.load||{},it=[['torpedo','TRP'],['missile','MSL'],['swarm','SWM'],['drone','DRN']].filter(([k])=>L[k]).map(([k,n])=>n+' '+L[k]);lab(it.length?it.join(' · '):(r.role||'').toUpperCase(),x+9,ty+shh-9,'rgba(236,228,207,.75)')}
        else if(T.kind==='ast'){lab((r.seam?'XENOCRYSTAL SEAM':r.comet?'COMET':'ASTEROID'),x+9,ty+24,'#ece4cf');lab(fmt(d)+' M',x+ww-9,ty+24,null,'right');lab(Object.keys(r.ore).map(k=>ITEMS[k].name.slice(0,9)+' '+r.ore[k]).join(' · ').slice(0,26),x+9,ty+shh*.62,'rgba(236,228,207,.8)')}
        else{lab((T.kind==='station'||T.kind==='works'?r.name:T.kind==='outpost'?r.o.name:T.kind).toUpperCase().slice(0,18),x+9,ty+24,'#ece4cf');lab(fmt(d)+' M',x+ww-9,ty+24,null,'right');if(T.kind==='works'){bar(x+9,ty+40,ww-18,wkHp(r)/wkMax(r),'#ece4cf')}else if(T.kind==='station'||T.kind==='outpost'){const[bs,bh]=tgtBars(r);bar(x+9,ty+36,ww-18,bs,'#6fb7ff');bar(x+9,ty+43,ww-18,bh,'#ece4cf')}}}
      c.font='600 10px "JetBrains Mono",monospace'}
    else if(kd==='radar'){const R=Math.min(sw*.36,shh*.4),rcx=cx,rcy=sy+shh*.52;c.strokeStyle=hexA(fc,.3);c.lineWidth=1;c.beginPath();c.arc(rcx,rcy,R,0,TAU);c.stroke();c.beginPath();c.arc(rcx,rcy,R*.5,0,TAU);c.stroke();
      const an=t*2.2;c.strokeStyle=hexA(fc,.7);c.beginPath();c.moveTo(rcx,rcy);c.lineTo(rcx+Math.cos(an)*R,rcy+Math.sin(an)*R);c.stroke();
      qRot(p.q,1,0,0,_r);qRot(p.q,0,0,1,_f);for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===p)continue;const dx=e.x-p.x,dy=e.y-p.y,dz=e.z-p.z,lx=-(dx*_r.x+dy*_r.y+dz*_r.z),lz=dx*_f.x+dy*_f.y+dz*_f.z,d=hyp(lx,lz);if(d>3200)continue;
        c.fillStyle=hostile('player',e.side)?'#ff5d4f':sideCol(e.side);c.fillRect(rcx+lx/3200*R-1.5,rcy-lz/3200*R-1.5,3,3)}
      lab('3.2 KM',x+9,sy+shh-8,null)}}
  // warning lamps
  if(!narrow){const ly=VH-8;pip(VW/2-24,ly,W.missiles.some(m=>m.tgt===p),'#ff5d4f',3.5);pip(VW/2-8,ly,p.shield<=.5,'#ff8a4f',3.5);pip(VW/2+8,ly,p.boosting,'#ffd27a',3.5);pip(VW/2+24,ly,W.lock.locked,'#7ad9a7',3.5)}
  c.restore();
  // bombsight: a ranging ladder around the gunsight for lining up torpedo runs
  if(K.sight){const cx=VW/2,cy=VH/2,R=Math.max(52,Math.min(VW,VH)*.075)*1.55;c.strokeStyle=hexA(fc,.35);c.lineWidth=1;
    for(const s of[-1,1]){c.beginPath();c.moveTo(cx+s*R,cy-R*.6);c.lineTo(cx+s*R,cy+R*.6);c.stroke();for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(cx+s*R,cy+i*R*.2);c.lineTo(cx+s*(R-(i%3===0?10:5)),cy+i*R*.2);c.stroke()}}
    const T=W.lock.ref;if(T){const d=d3(T,p);c.font='600 10px "JetBrains Mono",monospace';c.textAlign='left';c.fillStyle=d<TORP_RANGE?'#7ad9a7':'#f0b24a';c.fillText((d/1000).toFixed(1)+' KM',cx+R+8,cy+3)}}
  c.textBaseline='alphabetic';c.font='600 11px "Saira Semi Condensed",sans-serif'}

// centre ring: shield on the right arc, hull on the left, red wedges toward whoever just hit you, and how many are on you
function drawStatusRing(c,p,t){const cx=VW/2,cy=VH/2,R=Math.max(52,Math.min(VW,VH)*.075),sf=clamp(p.shield/p.st.sCap,0,1),hf=clamp(p.hull/p.st.hull,0,1),blink=Math.floor(t*5)%2===0;
  const arc=(a0,a1,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(cx,cy,R,a0,a1);c.stroke()};c.lineCap='round';
  arc(-1.05,1.05,'rgba(255,255,255,.08)',3);arc(Math.PI-1.05,Math.PI+1.05,'rgba(255,255,255,.08)',3);
  if(sf>0)arc(1.05-2.1*sf,1.05,sf<.3?'rgba(240,178,74,.85)':'rgba(111,183,255,.75)',3);else if(blink)arc(-1.05,1.05,'rgba(255,93,79,.7)',2);
  const hc=hf<.35?(blink?'#ff5d4f':'rgba(255,93,79,.5)'):hf<.6?'rgba(240,178,74,.85)':'rgba(236,228,207,.7)';arc(Math.PI-1.05,Math.PI-1.05+2.1*hf,hc,3);
  c.lineCap='butt';
  for(const h of(W.hitDirs||[])){const age=W.t-h.t;if(age>1.3)continue;const P2=proj(p.x+h.x*800,p.y+h.y*800,p.z+h.z*800),a=Math.atan2(P2.y-cy,P2.x-cx),al=1-age/1.3;
    c.strokeStyle=`rgba(255,70,55,${.85*al})`;c.lineWidth=7;c.beginPath();c.arc(cx,cy,R+14,a-.32,a+.32);c.stroke();c.lineWidth=2;c.beginPath();c.arc(cx,cy,R+24,a-.18,a+.18);c.stroke()}
  let n=0,lock=0;for(const e of W.ents)if(e.npc&&e.alive&&e.ai.tgt===p&&hostile('player',e.side)){n++;if((e.ai.lock||0)>.3)lock++}
  if(n){c.font='700 13px "Big Shoulders Display",sans-serif';c.textAlign='center';c.fillStyle=n>=3?'#ff5d4f':'#f0b24a';c.fillText(`${n} ${n===1?'ENEMY':'ENEMIES'} ON YOU${lock?` · ${lock} LOCKING`:''}`,cx,cy-R-14)}}
// a faint pitch ladder anchored to the sector's horizontal plane, so you always know which way is level
function drawHorizon(c,p){qRot(p.q,0,0,1,_f);let hx=_f.x,hz=_f.z;const hl=hyp(hx,hz);if(hl<.05)return;hx/=hl;hz/=hl;const rx=hz,rz=-hx;
  c.font='500 10px "JetBrains Mono",monospace';c.textAlign='left';
  for(const deg of[-60,-30,0,30,60]){const a=deg*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),D=3000,w=D*(deg?.09:.2);const bx=cam.x+(hx*ca)*D,by=cam.y+sa*D,bz=cam.z+(hz*ca)*D;
    const A=proj(bx+rx*w,by,bz+rz*w),Ax=A.x,Ay=A.y,ab=A.behind,B=proj(bx-rx*w,by,bz-rz*w);if(ab||B.behind)continue;
    const g=deg?.35:.4,mx=Ax+(B.x-Ax)*g,my=Ay+(B.y-Ay)*g,nx=Ax+(B.x-Ax)*(1-g),ny=Ay+(B.y-Ay)*(1-g);
    c.strokeStyle=deg?'rgba(160,190,230,.2)':'rgba(160,190,230,.32)';c.lineWidth=deg?1:1.4;c.setLineDash(deg<0?[5,5]:[]);c.beginPath();c.moveTo(Ax,Ay);c.lineTo(mx,my);c.moveTo(nx,ny);c.lineTo(B.x,B.y);c.stroke();c.setLineDash([]);
    if(deg){c.fillStyle='rgba(160,190,230,.35)';c.fillText((deg>0?'+':'')+deg,B.x+6,B.y+3)}}}
function edgeMark(P,label,col){const c=octx,cx=VW/2,cy=VH/2;let dx=P.x-cx,dy=P.y-cy;if(Math.abs(dx)<1&&Math.abs(dy)<1)dy=1;const mx=cx-70,my=cy-90,k=Math.min(mx/Math.abs(dx||1e-6),my/Math.abs(dy||1e-6));const ex=cx+dx*k,ey=cy+dy*k,a=Math.atan2(dy,dx);
  c.save();c.translate(ex,ey);c.rotate(a);c.fillStyle=col;c.beginPath();c.moveTo(9,0);c.lineTo(-4,-6);c.lineTo(-4,6);c.fill();c.restore();c.textAlign=ex<cx?'left':'right';c.fillStyle=hexA(col,.85);c.fillText(label.toUpperCase(),ex+(ex<cx?14:-14),ey+4)}
const rcv=$('radar'),rctx=rcv.getContext('2d');
function drawRadar(){
  const c=rctx,p=W.player,R=3600*SPACE,sc=150/R;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,340,300);if(p&&jamDark(p))return;c.save();c.translate(170,165);
  c.fillStyle='rgba(5,7,13,.72)';c.beginPath();c.ellipse(0,0,166,100,0,0,TAU);c.fill();c.strokeStyle='#36435f';c.lineWidth=2;c.stroke();
  c.strokeStyle='rgba(54,67,95,.7)';c.lineWidth=1;c.beginPath();c.ellipse(0,0,83,50,0,0,TAU);c.stroke();c.beginPath();c.moveTo(-166,0);c.lineTo(166,0);c.moveTo(0,-100);c.lineTo(0,100);c.stroke();
  if(S.sectors[W.sid].storm>S.T&&!CLASSES[S.player.cls].radar){c.fillStyle='#8c91a5';c.font='600 24px "Saira Semi Condensed",sans-serif';c.textAlign='center';c.fillText('ION STORM',0,8);for(let i=0;i<60;i++){c.fillStyle=`rgba(200,210,255,${Math.random()*.4})`;c.fillRect(rnd(-140,140),rnd(-80,80),2,2)}c.restore();return}
  const iq={x:-p.q.x,y:-p.q.y,z:-p.q.z,w:p.q.w},L={x:0,y:0,z:0};
  const blip=(o,col,size,shape)=>{qRot(iq,o.x-p.x,o.y-p.y,o.z-p.z,L);let sx=-L.x*sc,sz=L.z*sc,sy=L.y*sc;const d=hyp(sx,sz);if(d>150){sx*=150/d;sz*=150/d;sy=0}const bx=sx*1.1,by=-sz*.66;
    if(Math.abs(sy)>2){c.strokeStyle=hexA(col,.6);c.beginPath();c.moveTo(bx,by);c.lineTo(bx,by-sy*.66);c.stroke()}c.fillStyle=col;if(shape==='sq')c.fillRect(bx-size,by-sy*.66-size,size*2,size*2);else{c.beginPath();c.arc(bx,by-sy*.66,size,0,TAU);c.fill()}return[bx,by-sy*.66]};
  const s=S.sectors[W.sid];for(const a of s.ast){qRot(iq,a.x-p.x,a.y-p.y,a.z-p.z,L);if(hyp(L.x,L.z)<R){c.fillStyle='rgba(140,145,165,.45)';c.fillRect(-L.x*sc*1.1-1.5,-L.z*sc*.66-L.y*sc*.66-1.5,3,3)}}
  for(const g of GATES[W.sid])blip(g,'#dfe8ff',5,'sq');
  for(const w of W.works||[])blip(w,sideCol(w.fac),w.k==='yard'||w.k==='yardb'?5:3,'sq');
  if(W.stationEnt)blip(W.stationEnt,sideCol(W.stationEnt.fac),6,'sq');if(W.outpostEnt)blip(W.outpostEnt,sideCol(W.outpostEnt.o.owner),6,'sq');
  for(const cr of s.crates)blip(cr,'#f0b24a',2.5,'sq');
  for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.isPlayer||!seenShip(e))continue;const[x,y]=blip(e,sideCol(e.side),hostile('player',e.side)?4.5:3.5);if(W.tgt&&W.tgt.ref===e){c.strokeStyle='#f0b24a';c.lineWidth=2;c.beginPath();c.arc(x,y,8,0,TAU);c.stroke()}}
  c.fillStyle=PLAYER_COL;c.beginPath();c.moveTo(0,-9);c.lineTo(6,6);c.lineTo(0,3);c.lineTo(-6,6);c.fill();c.restore();
}
