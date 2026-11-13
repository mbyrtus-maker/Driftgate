//@src 16h_gfx.js
// ============================================================ Driftgate Beyond's look, in Driftgate 1 (12 Nov 2026)
// The user: "Take a look at what Driftgate Beyond did for visuals and copy that style into Driftgate to update all the
// graphics." Beyond replaced Driftgate 1's shared kit ships with each power's own designs, built its own stations, depots,
// freeports and Haven, and then made a graphics pass (shaped nozzles and guns, shots from the muzzles, turrets on seats,
// missile bodies, a new gate and crate). This file is that work, brought across as drawing only: every class keeps
// Driftgate 1's stats, slots and hit size, whichever design it draws as. Taken from Beyond's 16z_models.js, 16zzj_art.js,
// 16x_bases.js (bmPart) and 16zzzzf_gfx.js; the models come from Beyond's builders (tools/build_models.py, tools/previews).
// Left out on purpose: Beyond's design stats and yards, its destroyers, player bases, R&D stations, assault-ship flights,
// company colours and the Riftstone.
const hasOwnK=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
// ---- which design each side's class draws as. Each power has one design per class (Beyond's lines); the Unbound fly their
// six; the Brood keep their grown ships (12_render.js)
const FAC_MDL={halcyon:{interceptor:'dz_swift',striker:'dz_kite',heavy:'dz_osprey',picket:'dz_swift',skiff:'dz_wren',prospector:'dz_plover',dredger:'dz_heron',courier:'dz_tern',freighter:'dz_albatross',bulker:'dz_pelican',
    scout:'dz_lark',scout2:'dz_skylark',bomber:'dz_condor',gunboat:'dz_harrier',constructor:'dz_architect',drone:'dz_aegis',escort:'dz_shrike',carrier:'dz_sovereign'},
  varkesh:{interceptor:'dz_fang',striker:'dz_talon',heavy:'dz_halberd',picket:'dz_fang',skiff:'dz_pick',prospector:'dz_gouge',dredger:'dz_sledge',courier:'dz_runner',freighter:'dz_bulwark',bulker:'dz_rampart',
    scout:'dz_jackal',scout2:'dz_wolfhound',bomber:'dz_maul',gunboat:'dz_warhound',constructor:'dz_foundry',drone:'dz_ward',escort:'dz_vanguard',carrier:'dz_bastille'},
  ostrova:{interceptor:'dz_mote',striker:'dz_wisp',heavy:'dz_vigil',picket:'dz_mote',skiff:'dz_glim',prospector:'dz_lumen',dredger:'dz_delve',courier:'dz_drift',freighter:'dz_cairn',bulker:'dz_monolith',
    scout:'dz_seer',scout2:'dz_oracle',bomber:'dz_obelisk',gunboat:'dz_sentinel',constructor:'dz_loom',drone:'dz_halo',escort:'dz_lantern',carrier:'dz_cathedral'},
  pirate:{raider:'dz_raider',corsair:'dz_corsair',plunderer:'dz_plunderer',uskiff:'dz_skiff',interceptor:'dz_raider',picket:'dz_raider',striker:'dz_corsair',heavy:'dz_plunderer',scout:'dz_skiff',scout2:'dz_skiff',
    bomber:'dz_wrecker',gunboat:'dz_wrecker',constructor:'dz_wrecker',courier:'dz_skiff',skiff:'dz_skiff',prospector:'dz_skiff',dredger:'dz_plunderer',freighter:'dz_plunderer',bulker:'dz_plunderer',drone:'dz_raider'}};
const BRAND_MDL={gannet:'dz_gannet',bombard:'dz_bombard',vesper:'dz_vesper',wraith:'dz_wraith'};
// a player's own depot draws as a depot of the pilot's power, in the player's colours (Beyond's player bases are not here)
function bmOwned(R){return false}
// one packed model into a mesh builder, turned by yaw, scaled and moved (Beyond's 16x_bases.js)
function bmPart(g,name,fac,yaw,s,ox,oy,oz){const M=MDL.i[name];if(!M)return;const n=M.n,P=new Int16Array(MDL.b,M.o,n*9),R=new Uint8Array(MDL.b,M.o+n*18,n),SH=new Uint8Array(MDL.b,M.o+n*19,n),Q=mdlPal(fac),h=(M.h||1)/32767,c=M.c||[0,0,0],cs=Math.cos(yaw),sn=Math.sin(yaw),v=new Float32Array(9);
  for(let t=0;t<n;t++){const o=t*9;for(let j=0;j<3;j++){const x=P[o+j*3]*h+c[0],y=P[o+j*3+1]*h+c[1],z=P[o+j*3+2]*h+c[2];v[j*3]=(cs*x+sn*z)*s+ox;v[j*3+1]=y*s+oy;v[j*3+2]=(-sn*x+cs*z)*s+oz}
    const ux=v[3]-v[0],uy=v[4]-v[1],uz=v[5]-v[2],wx=v[6]-v[0],wy=v[7]-v[1],wz=v[8]-v[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const r=R[t],col=Q.c[r],sh=SH[t]/100,em=Q.e[r];for(let j=0;j<3;j++)g.d.push(v[j*3],v[j*3+1],v[j*3+2],nx,ny,nz,col[0]*sh,col[1]*sh,col[2]*sh,em)}}
function bmSpin(){if(MESH.bmSpin)return MESH.bmSpin;const e=new GB();e.seg([0,0,0],[0,0,0],[0,0,0]);return MESH.bmSpin=e.upload(true)}
// (Beyond 5 Nov 2026: a plain object lookup of 'constructor' finds the object's own constructor function, so own keys only)
function fmdl(fac,cls){if(hasOwnK(BRAND_MDL,cls))return BRAND_MDL[cls];const m=hasOwnK(FAC_MDL[fac],cls)?FAC_MDL[fac][cls]:null;return m&&mdlHas(m)?m:null}
// the player's own ships take their design line's look (P.faction); a 'player' side resolves the same way
function fmFac(fac){return fac==='player'&&S&&S.player?S.player.faction:fac}
{const o=shipMesh;shipMesh=function(fac,cls){const F=fmFac(fac),m=fmdl(F,cls);if(m&&mdlHas(m)){const key='fz'+F+cls;if(MESH[key])return MESH[key];const L=new GB();L.seg([0,0,0],[0,0,0],[0,0,0]);
  return MESH[key]={hull:mdlMesh(m,F==='wraith'?'wraith':F,1),rim:L.upload(true),eng:engFix(m).map(e=>e.slice()),mdl:true}}return o.apply(this,arguments)}}
// escorts and carriers: turrets on the model's mounts, sub-targets on its parts, berths and deck spots from its geometry
function capM(E){if(!E||E.side==='brood'||E.side==='pirate')return null;const t=E.tok;if(!t||!(isEsc(t)||isCar(t)))return null;const m=fmdl(fmFac(E.fac),E.cls);return m&&MDL.ready&&MDL.i[m]?m:null}
{const o=mdlFrigTurrets;mdlFrigTurrets=function(e){const m=e&&!e._mt&&e.turrets&&capM(e);if(m){const M=MDL.i[m];if(M.tp&&M.tp.length){e._mt=1;const k=1.25/1.1;e.turrets.forEach((tu,i)=>{const p=M.tp[i%M.tp.length];tu.p=[p[0]*k,p[1]*k,p[2]*k]});return}}return o.apply(this,arguments)}}
{const o=subLocal;subLocal=function(E){const m=E&&E.type==='ship'&&capM(E);if(!m)return o.apply(this,arguments);if(E._subL&&E._subL.ok===MDL.ready)return E._subL.a;const P=Object.create(E);P.cls=m;delete P._subL;const a=o.call(this,P);E._subL={ok:MDL.ready,a};return a}}
{const o=capMdlKey;capMdlKey=function(F){const m=capM(F);return m&&MDL.ready&&MDL.i[m]?m:o.apply(this,arguments)}}
// a carrier takes ships down onto its own deck spots
function capDeck(F){const m=capM(F);const M=m&&isCar(F.tok)&&MDL.i[m];return M&&M.pt&&M.pt.length>=4?M.pt:null}
{const o=carBay;carBay=function(F){return!!capDeck(F)||o.apply(this,arguments)}}
{const o=berthPose;berthPose=function(F,i,cls,out){const pt=capDeck(F);if(!pt)return o.apply(this,arguments);const k=F.st.radius*1.25,sc=(CLASSES[cls]||CLASSES.interceptor).radius*1.25,b=pt[i&3];
  qRot(F.q,b[0]*k,b[1]*k+sc*.32,b[2]*k,_bv1);out.x=F.x+_bv1.x;out.y=F.y+_bv1.y;out.z=F.z+_bv1.z;qCopy(out.q,F.q);qRot(F.q,0,1,0,_bv1);out.nx=_bv1.x;out.ny=_bv1.y;out.nz=_bv1.z;out.bay=0;return out}}
// ---- the powers' stations and depots, the freeport, Scrapheart Haven
const ST_MDL={size:{core:170,free:210,haven:240,depot:105,fdepot:80}};
// the three freeports share one design, each with its own touches (3 Nov 2026): Coldwater Drift and Ember Wake have their own models
const FP_MDL={cw:'by_freeport_cw',ew:'by_freeport_ew'};
function stMdlName(fac,kind,sid){if(kind==='haven')return'by_haven';if(kind==='free')return FP_MDL[sid]&&MDL.i&&MDL.i[FP_MDL[sid]]?FP_MDL[sid]:'by_freeport';if(FAC_IDS.includes(fac)){if(kind==='core')return'by_st_'+fac;if(kind==='depot'||kind==='fdepot')return'by_dp_'+fac}
  // (Driftgate 1) a pilot's own depot: their power's depot design, in the player's colours
  if(fac==='player'&&kind==='depot'){const f=fmFac('player');if(FAC_IDS.includes(f))return'by_dp_'+f}return null}
function stMesh(name,fac,size){const key='stz'+name+fac+size;if(MESH[key])return MESH[key];const M=MDL.i[name],s=size/(M.h||1),c=M.c||[0,0,0],g=new GB();bmPart(g,name,fac,0,s,-c[0]*s,-c[1]*s,-c[2]*s);return MESH[key]={core:g.upload(),spin:bmSpin(),s}}
{const o=stationMesh;stationMesh=function(fac,kind){const SE=W&&W.stationEnt,R=SE&&SE.rec,k=R&&R.fwd?'fdepot':kind,nm=MDL.ready&&stMdlName(fac,kind,R&&R.sid);if(nm&&MDL.i[nm])return stMesh(nm,fac==='pirate'?'pirate':fac,ST_MDL.size[k]||150);return o.apply(this,arguments)}}
// turrets set onto the model's own surface: for each, the outermost hull point in its direction (found once per model)
function stSurf(name,size,n){const key=name+':'+size+':'+n;stSurf.c=stSurf.c||{};if(stSurf.c[key])return stSurf.c[key];const M=MDL.i[name],P=new Int16Array(MDL.b,M.o,M.n*9),h=(M.h||1)/32767,s=size/(M.h||1),out=[];
  for(let i=0;i<n;i++){const a=i/n*TAU+.4,dx=Math.cos(a),dy=i%2?.55:-.25,dz=Math.sin(a),l=Math.hypot(dx,dy,dz);let best=null,bd=-1e9;
    for(let t=0;t<M.n;t++){const o=t*9;const x=(P[o]+P[o+3]+P[o+6])/3*h,y=(P[o+1]+P[o+4]+P[o+7])/3*h,z=(P[o+2]+P[o+5]+P[o+8])/3*h;const d=(x*dx+y*dy+z*dz)/l;if(d>bd){bd=d;best=[x,y,z]}}
    out.push(best.map(v=>v*s))}return stSurf.c[key]=out}
{const o=mdlStationTurrets;mdlStationTurrets=function(SE){const R=SE&&SE.rec,nm=SE&&!SE._mt&&MDL.ready&&!bmOwned(R)&&stMdlName(SE.fac,SE.kind,R&&R.sid);if(nm&&MDL.i[nm]){SE._mt=1;devEnt(SE);const k=R&&R.fwd?'fdepot':SE.kind,T=stSurf(nm,ST_MDL.size[k]||150,Math.max(1,SE.turrets.filter(t=>!t.mod).length));
  SE.turrets.filter(t=>!t.mod).forEach((tu,i)=>{tu.p=T[i%T.length].slice()});return}return o.apply(this,arguments)}}

// docking ports come from the station model's own docking arms
{const o=portName;portName=function(E){if(E&&E.type==='station'&&MDL.ready&&!bmOwned(E.rec)){const nm=stMdlName(E.fac,E.kind,E.rec&&E.rec.sid);if(nm&&MDL.i[nm]&&!(E.rec&&E.rec.fwd))return nm}return o.apply(this,arguments)}}
// ============================================================ the graphics pass (Beyond, 11 and 12 Nov 2026)
// ============================================================ the graphics pass (Beyond, 11 Nov 2026)
// The user's ask: thrusters and guns with shape; parts oriented right and mounted right. This file is the game's side of it;
// the models' side is in tools/ (brood.Mesh.vent, beyond_hulls.barrel, beyond_recon.seat, the pack's new points).
//   - Engine flares sit on the nozzles. A model whose builder recorded its nozzles carries them as its engine points (the
//     pack's 'ex'), one flare each; engFix no longer guesses for those.
//   - Shots leave from the guns. Each model carries its gun muzzles ('g'). A shot is still simulated from the point it always
//     was (so aim, hits and balance are untouched); only its drawing starts at the muzzle and eases onto the true path in
//     0.15 s, and its tail grows out of the muzzle instead of starting behind it. A short flash marks the muzzle.
//   - Mining beams leave from the hull's mining heads ('ml'), drawing only.
//   - The live turret on Bomber and Heavy Bomber hulls stands on the model's own seat ('ts'): its base ring on the hull, its
//     guns pitching on trunnions above it. It was drawn at one fixed point for every hull (floating over some, sunk into
//     others, a second turret on top of one already modelled), and the whole thing, base and all, pitched with the guns.
//     The mount point gameplay reads (where its shots start and the gunner sits) moves with it: see turMount below.
//   - Missiles and torpedoes have a body.
// ---- the model a mesh was built from, so a ship's entity can reach its model's points
{const o=mdlMesh;mdlMesh=function(name,fac,s){const m=o.apply(this,arguments);if(m)m.mdl=name;return m}}
function entMdl(e){try{const m=shipMesh(meshFac(e),e.role==='limpet'?'limpet':e.cls),n=m&&m.hull&&m.hull.mdl;return n&&MDL.i?MDL.i[n]||null:null}catch(err){return null}}
{const o=engFix;engFix=function(name){const M=MDL.i&&MDL.i[name];if(M&&M.ex)return M.e;return o.apply(this,arguments)}}
// ---- shots drawn from the muzzle
const GFX={ease:.15,flash:.07},_gfv={x:0,y:0,z:0};
function gfxShot(e,b){try{const M=entMdl(e),g=M&&M.g;if(!g||!g.length)return b;const sc=e.st.radius*1.25;e._gi=((e._gi||0)+1)%g.length;const p=g[e._gi];qRot(e.q,p[0]*sc,p[1]*sc,p[2]*sc,_gfv);
  b.ox=e.x+_gfv.x-b.x;b.oy=e.y+_gfv.y-b.y;b.oz=e.z+_gfv.z-b.z;b.ot=W.t;e._mf=W.t}catch(err){}return b}
// a turret's shot: from the tip of the barrel that fired (the turret's guns are shorter than the old box barrels)
function gfxTurShot(e,T,b){try{const sc=e.st.radius*1.25,q=turretQ(e,T,_gq3);qRot(q,(T.barrel>0?1:-1)*GT.bx*sc,0,GT.tip*sc,_gfv);const M=turretMount(e);b.ox=M.x+_gfv.x-b.x;b.oy=M.y+_gfv.y-b.y;b.oz=M.z+_gfv.z-b.z;b.ot=W.t}catch(err){}return b}
// where a shot is drawn: its head, and how long a tail it has grown
const _gsp={x:0,y:0,z:0,L:0};
function gfxShotPos(b,sp,L){let k=0,gl=L;if(b.ot!==undefined){const a=W.t-b.ot;k=a<GFX.ease?1-a/GFX.ease:0;k*=k;gl=Math.min(L,Math.max(1,sp*a))}_gsp.x=b.x+(k?b.ox*k:0);_gsp.y=b.y+(k?b.oy*k:0);_gsp.z=b.z+(k?b.oz*k:0);_gsp.L=gl;return _gsp}
// a ship's mining heads in the world: head i of n beams, or null when its model has none
function gfxMineHead(e,li,nl,out){const M=entMdl(e),ml=M&&M.ml;if(!ml||!ml.length)return null;const n=ml.length,i=nl<=1?(n>>1):Math.round(li*(n-1)/(nl-1)),p=ml[Math.min(n-1,i)],sc=e.st.radius*1.25;qRot(e.q,p[0]*sc,p[1]*sc,p[2]*sc,out);out.x+=e.x;out.y+=e.y;out.z+=e.z;return out}
// the muzzle flash of a ship that has just fired (drawn with the engine flares)
function gfxFlash(e,sc,c){if(e._mf===undefined)return;const a=W.t-e._mf;if(a<0||a>GFX.flash)return;const M=entMdl(e),g=M&&M.g;if(!g||!g.length)return;const p=g[(e._gi||0)%g.length],k=1-a/GFX.flash;qRot(e.q,p[0]*sc,p[1]*sc,p[2]*sc,_gfv);
  sprite(e.x+_gfv.x,e.y+_gfv.y,e.z+_gfv.z,sc*.16*(1.2-k*.4),c,.8*k);sprite(e.x+_gfv.x,e.y+_gfv.y,e.z+_gfv.z,sc*.07,[1,1,1],.9*k)}
// ---- the live turret: its seat on each hull
// GT: the turret in units of the hull's draw scale: the base ring's radius, the height of the trunnions above the seat, the
// guns' offset either side and their tips ahead of the trunnions
const GT={r:.075,piv:.052,bx:.016,tip:.3};
// (y, z) of the turret's pivot on the hull: the model's seat plus the pivot's height; hulls without a seat keep the old mount
{const o=turMount;turMount=function(e){const M=entMdl(e),s=M&&M.ts;if(s)return[s[1]+GT.piv,s[2]];return o.apply(this,arguments)}}
// the mesh: a base that only turns (turntable, yoke) and a head that pitches on it (trunnion block, twin guns), cached by
// palette; the Brood's is grown (a mound of flesh, two bone spitters)
gturretMesh=function(fac){const key='gt2'+fac;if(MESH[key])return MESH[key];const P=mdlPal(fac),LI=P.c[0],MI=P.c[1],DK=P.c[2],AC=P.c[3],GL=P.c[4],GW=P.c[5],b=new GB(),h=new GB(),L=new GB(),qz=qAxis(1,0,0,Math.PI/2,q0()),qx=qAxis(0,0,1,-Math.PI/2,q0()),r=GT.r,pv=GT.piv;
  L.seg([0,0,0],[0,0,0],[0,0,0]);
  if(fac==='brood'){
    // base: a puckered mound (drawn about the pivot, so its foot is pv below); head: a knuckle and two curved spitters
    b.set(0,-pv+.012,0).cyl(r*1.05,r*.8,.024,9,AC);b.set(0,-pv+.036,0).cyl(r*.8,r*.5,.026,9,scaleC(AC,.85));b.set(0,-pv+.03,0).torus(r*.9,.006,9,3,LI);
    h.set(0,0,0).sphere(.03,5,8,MI);for(const s of[-1,1]){h.set(GT.bx*s,.002,.1,qz).cyl(.012,.008,.16,5,LI);h.set(GT.bx*s,.006,.235,qz).cyl(.008,.0035,.13,5,LI);h.set(.024*s,.014,.012).sphere(.014,4,6,GW,.9)}
    return MESH[key]={base:b.upload(),hull:h.upload(),rim:L.upload(true)}}
  // base: a turntable ring with an accent band, a low faceted drum and two yoke cheeks up to the trunnions
  b.set(0,-pv+.008,0).cyl(r,r*.96,.016,10,DK);b.set(0,-pv+.019,0).cyl(r*.97,r*.97,.006,10,AC,.35,false);b.set(0,-pv+.03,0).cyl(r*.9,r*.66,.022,10,MI);
  for(const s of[-1,1]){b.set(s*.036,-pv*.42,0).box(.012,pv*1.05,.04,LI);b.set(s*.044,0,0,qx).cyl(.012,.012,.006,6,DK)}
  // head: a chamfered trunnion block with a glacis, a lit sight, twin guns (sleeve, barrel, muzzle collar)
  tuPrism(h,[[-.034,tuOct(.029,.019,.007,.004)],[-.02,tuOct(.03,.024,.009,.004)],[.022,tuOct(.03,.024,.009,.004)],[.046,tuOct(.022,.013,.006,0)]],LI);
  h.set(0,.029,-.006).box(.03,.004,.03,GL,.2);h.set(.012,.012,.0465).box(.012,.006,.003,GW,.9);h.set(0,.004,-.0345).box(.036,.016,.003,DK);
  for(const s of[-1,1]){const x=GT.bx*s;h.set(x,0,.07,qz).cyl(.0105,.0095,.07,6,MI);h.set(x,0,.18,qz).cyl(.0062,.0056,.2,6,DK,0,false);h.set(x,0,.092,qz).cyl(.0074,.0074,.008,6,AC,.35,false);h.set(x,0,GT.tip-.012,qz).cyl(.0092,.0086,.024,6,MI)}
  return MESH[key]={base:b.upload(),hull:h.upload(),rim:L.upload(true)}};
// drawn at the pivot: the base turned about the hull's up by the turret's yaw only, the head by yaw and pitch
const _gtq=q0(),_gtq2=q0();
function gfxDrawTurret(e,fac,sc){const T=e.tur||{yaw:Math.PI,pitch:.1},m=turMount(e);qRot(e.q,0,m[0]*sc,m[1]*sc,_u);const x=e.x+_u.x,y=e.y+_u.y,z=e.z+_u.z,tm=gturretMesh(fac);
  if(tm.base){qMul(e.q,qAxis(0,1,0,T.yaw,_gtq2),_gtq);mModel(MM,x,y,z,_gtq,sc,sc,sc);drawMesh(tm.base,MM,ONE3,ZERO3)}
  turretQ(e,T,_gq3);mModel(MM,x,y,z,_gq3,sc,sc,sc);drawMesh(tm.hull,MM,ONE3,ZERO3);drawMesh(tm.rim,MM)}
// ---- missiles and torpedoes with a body (they were a streak and two sprites): a finned body along its flight, in the pass
// the works draw in; the streak and the motor's glow stay as they were, behind it
function mslMesh(kind){const key='msl'+kind;if(MESH[key])return MESH[key];const g=new GB(),qz=qAxis(1,0,0,Math.PI/2,q0()),tp=kind==='torpedo',B=tp?[.42,.44,.48]:[.62,.64,.68],D=[.2,.21,.24],A=tp?[1,.62,.25]:kind==='swarm'?[1,.5,.72]:[.9,.3,.25];
  // model units: 1 = the missile's length, nose at +z; a nose cone, a banded body, a motor nozzle, four fins
  g.set(0,0,.36,qz).cyl(tp?.075:.055,.012,.28,8,A);g.set(0,0,-.02,qz).cyl(tp?.075:.055,tp?.075:.055,.48,8,B);g.set(0,0,.2,qz).cyl(tp?.078:.058,tp?.078:.058,.03,8,D,0,false);
  g.set(0,0,-.31,qz).cyl(tp?.05:.036,tp?.07:.052,.1,8,D);g.set(0,0,-.385,qz).cyl(tp?.04:.03,tp?.052:.04,.05,8,D,0,false);g.set(0,0,-.36,qz).cyl(tp?.034:.024,tp?.034:.024,.004,8,[1,.85,.6],1);
  for(let i=0;i<4;i++){const a=i/4*TAU+(tp?0:Math.PI/4),c=Math.cos(a),s=Math.sin(a),r0=tp?.07:.05,r1=tp?.17:.14;g.set(0,0,0);
    const p=(r,zz)=>[c*r,s*r,zz],w=.006,n=[-s*w,c*w,0],P=(q,k)=>[q[0]+n[0]*k,q[1]+n[1]*k,q[2]];const A1=p(r0,-.12),A2=p(r1,-.3),A3=p(r1,-.36),A4=p(r0,-.34),ce=[c*(r0+r1)/2,s*(r0+r1)/2,-.28];
    g.quad(P(A1,1),P(A2,1),P(A3,1),P(A4,1),D,0,ce);g.quad(P(A1,-1),P(A4,-1),P(A3,-1),P(A2,-1),D,0,ce);g.quad(P(A1,1),P(A1,-1),P(A2,-1),P(A2,1),A,0,ce);g.quad(P(A2,1),P(A2,-1),P(A3,-1),P(A3,1),D,0,ce)}
  return MESH[key]=g.upload()}
const _mq=q0();
{const o=drawWorks;drawWorks=function(t){const r=o.apply(this,arguments);try{if(W&&W.missiles&&W.missiles.length)for(const m of W.missiles){const sp=hyp(m.vx,m.vy,m.vz);if(sp<1)continue;const k=((typeof MK!=='undefined'&&MK)?(MK[m.kind]||MK.missile).k:1),L=11*k;if(!inView(m.x,m.y,m.z,L))continue;
  const up=Math.abs(m.vy)/sp>.95?1:0;qLook(m.vx,m.vy,m.vz,up,up?0:1,0,_mq);const ux=m.vx/sp,uy=m.vy/sp,uz=m.vz/sp;
  // the body's nose at the missile's point, its tail back along the flight (the streak's first two thirds)
  mModel(MM,m.x-ux*L*.5,m.y-uy*L*.5,m.z-uz*L*.5,_mq,L,L,L);drawMesh(mslMesh(m.kind==='torpedo'?'torpedo':m.kind==='swarm'?'swarm':'missile'),MM)}}catch(err){if(!gfxErr++)console.error(err)}return r}}
let gfxErr=0;
// ---- the Compact's ships fly the powers' designs, in sand (the user, 11 Nov 2026: "Sand colored same as the powers")
// Every ship that drew one of Driftgate 1's kit models (freeport security and traffic, independent pilots, anything on the
// neutral side) draws its class in one of the three powers' designs, painted in its own side's colours. Which design: the one
// (Driftgate 1, which has no freeport yard rolls) one power's line per freeport and class, picked from the freeport's
// id: the freeport of the system the ship is in, otherwise a freeport picked by the system's name. No dice: the same ship draws the same design every frame and after a save and load. Only the drawn
// model changes; a ship's class, stats and hit size are the class's own, as before (the powers' own Swift and Fang differ
// from the class's radius by 5% and 4%; a Compact ship drawn as one keeps the class's radius).
const CZ_CLS=new Set(['interceptor','striker','heavy','bomber','gunboat','scout','scout2','picket','skiff','prospector','dredger','courier','freighter','bulker','constructor','drone']);
function czModel(line,cls){const m=hasOwnK(FAC_MDL[line],cls)?FAC_MDL[line][cls]:null;return m&&mdlHas(m)?m:null}
function czHash(s){s=String(s);let h=7;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
// is this (side, class) one that has no design of its own
function czIs(fac,cls){if(!CZ_CLS.has(cls)||!fac||fac==='brood'||fac==='pirate'||fac==='wraith')return false;if(typeof fac==='string'&&fac.startsWith('cz:'))return false;return!FAC_IDS.includes(fmFac(fac))}
// the freeport whose yard a ship's design comes from: its home port if it has one, else by the system it is in
// Driftgate 1: the freeport is the system's own when it has one, otherwise one picked by the system's name
function czPorts(){return(typeof FREEPORTS!=='undefined'?FREEPORTS.map(f=>f.sid):[]).sort()}
function czPort(port,sid){const L=czPorts();if(port&&L.includes(port))return port;if(sid&&L.includes(sid))return sid;return L.length?L[czHash(sid||'')%L.length]:null}
function czPick(port,sid,cls,seed){const p=czPort(port,sid),c2=cls==='picket'?'interceptor':cls;let l=p?FAC_IDS[czHash(p+':'+c2)%FAC_IDS.length]:null;
  if(!l||!czModel(l,cls))l=FAC_IDS[czHash((p||sid||'')+':'+cls+':'+(seed==null?'':seed))%FAC_IDS.length];if(!czModel(l,cls))l=FAC_IDS.find(f=>czModel(f,cls))||null;return l}
// a ship's design line, found once and kept on it (and found again the same way after a load)
function czLine(e){if(e.dl&&e.dlc===e.cls)return e.dl;let port=null;try{if(e.indId!=null&&S.ind&&S.ind.list){const I=S.ind.list.find(x=>x.id===e.indId);port=I&&I.port}}catch(err){}
  e.dl=czPick(port,W&&W.sid,e.cls,e.indId);e.dlc=e.cls;return e.dl}
// the mesh side of a ship: the Unbound's, a Compact ship's design line and paint ('cz:<line>:<side>'), or its own
function meshFac(e){if(e.side==='pirate')return'pirate';if(czIs(e.fac,e.cls)){const l=czLine(e);if(l)return'cz:'+l+':'+e.fac}return e.fac}
{const o=shipMesh;shipMesh=function(fac,cls){let line=null,paint=fac;
  if(typeof fac==='string'&&fac.startsWith('cz:')){const a=fac.split(':');line=a[1];paint=a.slice(2).join(':')||'neutral'}
  else if(czIs(fac,cls))line=czPick(null,W&&W.sid,cls,null);
  const cz=line=>{const m=line&&MDL.ready?czModel(line,cls):null;if(!m)return null;const key='cz'+line+':'+paint+':'+cls;if(MESH[key])return MESH[key];const L=new GB();L.seg([0,0,0],[0,0,0],[0,0,0]);
    return MESH[key]={hull:mdlMesh(m,paint,1),rim:L.upload(true),eng:engFix(m).map(e=>e.slice()),mdl:true}};
  let r=line?cz(line):null;if(r)return r;r=o.call(this,paint,cls);
  // any other side that asks for one of these classes and has no model of its own (the kit ships are gone from the pack)
  if((!r||!r.mdl)&&MDL.ready&&CZ_CLS.has(cls)&&paint!=='brood'){const f=fmFac(paint),c=cz(FAC_IDS.includes(f)?f:czPick(null,W&&W.sid,cls,null));if(c)return c}
  return r}}
// ---- station turrets stand on seats (12 Nov 2026; the user, 11 Nov 2026: "Careful on the turrets, some of them are
// floating above their hulls"). The powers' stations and depots, the freeports and the Haven carry a barbette for each live
// turret (tools/stseats.py; 'sp' in the pack: the deck's point and the hull's normal there). The turret's turntable stands on
// the deck, upright to the hull. They used to sit at the middle of whichever face lay furthest out in a fixed direction, the
// turntable sunk 15 m into it and the turret leaning away from the station's centre whatever the face's slope. With fewer
// turrets than seats (a forward depot has two of a depot's four) they take seats spread evenly round the hull; a forward
// depot is a depot drawn at 80/105 of its size, and so are its turrets.
const GST={lift:13.2,ts:1.15,wkr:.6};
function stSeats(nm,size,n,k){const M=MDL.i[nm],K=M.sp.length,l=GST.lift*GST.ts*k,out=[];for(let i=0;i<n;i++){const s=M.sp[(n<K?Math.floor(i*K/n):i)%K];out.push({p:[s[0]*size+s[3]*l,s[1]*size+s[4]*l,s[2]*size+s[5]*l],n:[s[3],s[4],s[5]]})}return out}
{const o=mdlStationTurrets;mdlStationTurrets=function(SE){const R=SE&&SE.rec,nm=SE&&!SE._mt&&MDL.ready&&!bmOwned(R)&&stMdlName(SE.fac,SE.kind,R&&R.sid),M=nm&&MDL.i[nm];
  if(M&&M.sp&&M.sp.length){SE._mt=1;devEnt(SE);const fwd=R&&R.fwd,size=ST_MDL.size[fwd?'fdepot':SE.kind]||150,k=fwd?ST_MDL.size.fdepot/ST_MDL.size.depot:1,L=SE.turrets.filter(t=>!t.mod),T=stSeats(nm,size,L.length,k);
    SE._ts=GST.ts*k;L.forEach((tu,i)=>{tu.p=T[i].p;tu.n=T[i].n});return}
  return o.apply(this,arguments)}}
// The defence platform's turrets (a station's Defence works, under the station) stand on its gun deck, upright. They hung
// 8 m above the deck with their "up" pointing away from the station's centre, which is downward there: upside down in the
// air over the deck. Their place round the deck is unchanged; the pivot is the turntable's height above the deck's top ('dk'
// in the pack, tools/build_models.py), and the up is the platform's own. They also stand 8.7 m nearer the middle (.60 of the
// platform's size out, from .74): at .74 the turntables overhung the deck's raised kerb; .60 is the one radius where all of
// the two, four or six stand clear of both the kerb and the fire-control block (tools/stseats.py measures it).
{const o=devEnt;devEnt=function(SE){const r=o.apply(this,arguments);try{const R=SE&&SE.rec,M=MDL.ready&&MDL.i&&MDL.i.wk_def;
  if(M&&M.dk!=null&&R&&SE.turrets&&!bmOwned(R)&&SE.fac!=='brood'&&SE.kind!=='hive'){const d=devOf(R);if(d&&d.def){const c=wkLayout(SE.kind,'def',d.def).parts[0],u=WKU.def;
    const L=SE.turrets.filter(t=>t.mod&&!t.n),n=L.length;L.forEach((t,i)=>{const a=i/n*TAU+.4;t.p=[c[0]+Math.cos(a)*u*GST.wkr,c[1]+u*M.dk+GST.lift*GST.ts,c[2]+Math.sin(a)*u*GST.wkr];t.n=[0,1,0]})}}}catch(e){}return r}}
