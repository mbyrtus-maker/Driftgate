# Patch: blast mining replaces the pilots' mining laser. Magazine-paced: few charges and a long reload, so a perfect
# hold takes as long as the laser did, and placement sets the yield. Run once: python3 tools/p_blast.py index.html
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

BLAST_JS=r"""
// ============================================================ blast mining (pilots): scan a rock, fire charges at its fault points from up to 300 m, back off
// and detonate (3) or cancel (4), then hold F by the ore cloud to collect it. Each charge releases one fault-point section of the
// rock: 90% of it on point, 50% near, 25% off. Charges come from a magazine with a long reload, so placement, not time on the rock,
// sets a miner's pay. Wreck sections crack at their joint, and a reactor core needs every charge on point or it all blows.
// Nothing is made or lost: unreleased ore, and nuggets left when a cloud thins out, go to the system's debris pool.
const BL={spd:300,near:15,blastR:120,cloudLife:90,collectR:250,coreR:600,coreDmg:520,chgDmg:22,stationR:400,scanT:20,eyeR:100};
const BL_HULL={skiff:{n:2,reload:348,coll:6,cd:1},prospector:{n:3,reload:408,coll:9,cd:.5},dredger:{n:4,reload:552,coll:12,cd:.34}};
const BL_REL={on:.9,near:.5,off:.25};
function blHull(cls){return BL_HULL[cls]||null}
function blTier(P){return(P&&P.tiers&&P.tiers.drill)||1}
function blCap(P){const h=P&&blHull(P.cls);return h?Math.max(1,h.n+blTier(P)-1+(vF(P,'blChg')||0)):0}                       // a Blast Rig Mk level adds a charge
function blColl(P){const h=P&&blHull(P.cls);return h?h.coll*(1+.2*(blTier(P)-1)):0}
function blWin(P,a){const rare=a&&a.ore&&(a.ore.au||a.ore.nu),b=vF(P,'blWin')||5;return(rare?b-2:b)+((P&&(P.lvl||0)>=3)?2:0)}
function blRange(P){return Math.max(legMineR(P),vF(P,'blRange')||0)}
function blKey(P){return(P&&P.pid)||'me'}
function blRng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
// a rock's fault points: fixed by its seed (and a new set each time it is partly cracked), spread over its surface
function blPts(a){if(a.wpt){const w=wreckOf(S.sectors[W.sid],a),R=WPT_R*.9;let dx=0,dy=1,dz=0;if(w){dx=w.x-a.x;dy=w.y-a.y;dz=w.z-a.z;const l=hyp(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l}return[{x:a.x+dx*R,y:a.y+dy*R,z:a.z+dz*R}]}
  const tot=oreTotal(a),n=tot<=50?2:tot<=90?3:4,key=n+':'+(a.fpv||0)+':'+Math.round(a.x);if(a._fpk===key&&a._fp)return a._fp;
  const r=blRng((a.seed||a.id||1)+(a.fpv||0)*7919),R=astR(a),out=[],rot=r()*TAU,tilt=r()*2-1;
  for(let i=0;i<n;i++){const y=1-(i+.5)*2/n*(.8+.2*r()),rr=Math.sqrt(Math.max(0,1-y*y)),th=rot+i*2.39996;let x=Math.cos(th)*rr,z=Math.sin(th)*rr,yy=y*.9+tilt*.1;const l=hyp(x,yy,z)||1;out.push({x:a.x+x/l*R,y:a.y+yy/l*R,z:a.z+z/l*R})}
  a._fpk=key;a._fp=out;return out}
function blRate(q,P){const r=BL_REL[q]||0,cap=vF(P,'blRelCap');return cap?Math.min(cap,r):r}
function blTick(P,dt){const cap=blCap(P);if(!cap){P.blN=0;P.blT=0;return}if(P.blN==null)P.blN=cap;if(P.blN>cap)P.blN=cap;
  if(P.blN<cap){const h=blHull(P.cls);if(!(P.blT>0))P.blT=h.reload;P.blT-=dt;if(P.blT<=0){P.blN=cap;P.blT=0;if(P===S.player&&!MUTE&&running)feed('Blast charges reloaded.','info')}}else P.blT=0}
function blNearStation(e){if(W.stationEnt&&d3(W.stationEnt,e)<BL.stationR+(W.stationEnt.st?W.stationEnt.st.radius||0:0))return true;for(const g of GATES[W.sid]||[])if(d3(g,e)<BL.stationR)return true;return false}
function blSay(P,t,bad){if(P===S.player||!P.pid||isMe(P.pid))flash(t,!!bad);else netMsg(P.pid,'flash',t,!!bad)}
// fire one charge along the nose (host and single player)
function blFire(e,P){const h=blHull(P.cls);if(!h)return;if((e.blCd||0)>W.t)return;if(!(P.blN>0)){blSay(P,`No charges left: the magazine reloads in ${Math.ceil(P.blT||0)} s.`);return}
  if(blNearStation(e)){blSay(P,`Charges can't be fired within ${BL.stationR} m of a station or jumpgate.`,true);return}
  qRot(e.q,0,0,1,_f);const r=e.st.radius;W.blShots=W.blShots||[];W.blShots.push({x:e.x+_f.x*r,y:e.y+_f.y*r,z:e.z+_f.z*r,vx:e.vx+_f.x*BL.spd*(vF(P,'blSpdK')||1),vy:e.vy+_f.y*BL.spd*(vF(P,'blSpdK')||1),vz:e.vz+_f.z*BL.spd*(vF(P,'blSpdK')||1),ttl:blRange(P)/(BL.spd*(vF(P,'blSpdK')||1)),o:blKey(P),side:e.side,P});
  P.blN--;e.blCd=W.t+h.cd;if(!MUTE&&(e===W.player))SFX.missile&&SFX.missile(.5,false)}
// where a charge fired now would land on a target, and how close to its nearest fault point (for the HUD rings)
function blAim(e,a){qRot(e.q,0,0,1,_f);const R=astR(a),ox=e.x-a.x,oy=e.y-a.y,oz=e.z-a.z,b=ox*_f.x+oy*_f.y+oz*_f.z,c=ox*ox+oy*oy+oz*oz-R*R,D=b*b-c;if(D<0)return null;const t=-b-Math.sqrt(D);if(t<0)return null;
  return{x:e.x+_f.x*t,y:e.y+_f.y*t,z:e.z+_f.z*t,d:t}}
function blStick(sh,a,s){const R=astR(a);let dx=sh.x-a.x,dy=sh.y-a.y,dz=sh.z-a.z;const l=hyp(dx,dy,dz)||1;const at={x:a.x+dx/l*R,y:a.y+dy/l*R,z:a.z+dz/l*R};
  const pts=blPts(a);let pi=0,bd=1e9;pts.forEach((p,i)=>{const d=d3(p,at);if(d<bd){bd=d;pi=i}});const win=blWin(sh.P,a),q=bd<=win?'on':bd<=BL.near?'near':'off';
  s.charges=s.charges||[];s.charges.push({id:S.nextId++,o:sh.o,side:sh.side,a:a.id,wp:!!a.wpt,x:Math.round(at.x),y:Math.round(at.y),z:Math.round(at.z),pi,q});
  if(!MUTE)fxSpark(at,q==='on'?'#7ad9a7':q==='near'?'#f0b24a':'#ff5d4f',4);
  blSay(sh.P,q==='on'?'Charge set: on point.':q==='near'?`Charge set: near (${Math.round(bd)} m off the point).`:`Charge set: off point (${Math.round(bd)} m). It will release only a quarter of its section.`)}
// host and single player, every frame
function blWorld(dt){const s=S.sectors[W.sid];
  if(W.blShots&&W.blShots.length){for(let i=W.blShots.length-1;i>=0;i--){const sh=W.blShots[i];sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.z+=sh.vz*dt;sh.ttl-=dt;let hit=null;
      for(const a of s.ast)if(d3(sh,a)<astR(a)+2){hit=a;break}if(!hit)for(const a of wptsIn(s))if(d3(sh,a)<WPT_R+2){hit=a;break}
      if(hit){blStick(sh,hit,s);W.blShots.splice(i,1)}else if(sh.ttl<=0)W.blShots.splice(i,1)}}
  // charges whose pilot has left the system cancel themselves; charges on a target that has gone are lost
  if(s.charges&&s.charges.length){const here=new Set(allPilots().filter(P=>P&&P.sector===W.sid).map(blKey)),gone={};
    s.charges=s.charges.filter(c=>{if(here.has(c.o)&&blTgt(s,c))return true;gone[c.o]=(gone[c.o]||0)+(here.has(c.o)?0:1);return false});
    for(const o in gone)if(gone[o]){const P=blPilot(o);if(P)P.blN=Math.min(blCap(P),(P.blN||0)+gone[o])}}
  if(s.clouds&&s.clouds.length){for(const c of s.clouds){c.r=Math.min(c.r+4*dt,c.r0+160)}s.clouds=s.clouds.filter(c=>{if(S.T<c.until&&oreTotal(c)>0)return true;if(oreTotal(c)>0)toDebris(s,c.ore);return false})}}
function blTgt(s,c){return c.wp?wptsIn(s).find(p=>p.id===c.a):s.ast.find(a=>a.id===c.a)}
function blPilot(o){if(o==='me'||isMe(o))return S.player;return(S.pilots||{})[o]||null}
// detonate every charge this pilot has set in this system
function blDetonate(P,e){const s=S.sectors[W.sid],o=blKey(P),mine=(s.charges||[]).filter(c=>c.o===o);if(!mine.length){blSay(P,'No charges set. Fire them with F first.');return}
  s.charges=s.charges.filter(c=>c.o!==o);const by={};for(const c of mine)(by[c.a]=by[c.a]||[]).push(c);let got=0;
  for(const id in by){const cs=by[id],T=blTgt(s,cs[0]);if(!T)continue;const at={x:T.x,y:T.y,z:T.z},R0=astR(T);
    if(T.wpt){const w=wreckOf(s,T);if(T.k==='core'&&cs.some(c=>c.q!=='on')){blCoreBlow(s,w,T);continue}
      const best=Math.max(...cs.map(c=>blRate(c.q,P))),f=best*Math.max(0,1-.1*(cs.length-1)),rel={};for(const k in T.ore){const r=Math.round(T.ore[k]*f);if(r>0)rel[k]=r;const d=T.ore[k]-r;if(d>0)toDebris(s,{[k]:d})}
      T.ore={};T.last=0;got+=blCloud(s,at,rel,R0,cs.length-1,o)}
    else{const n=blPts(T).length,secQ={};let extra=0;for(const c of cs){const r=blRate(c.q,P);if(c.pi in secQ){extra++;secQ[c.pi]=Math.max(secQ[c.pi],r)}else secQ[c.pi]=r}
      const nc=Object.keys(secQ).length,f=Object.values(secQ).reduce((a,b)=>a+b,0)/nc*Math.max(0,1-.1*extra),rel={};
      for(const k of Object.keys(T.ore)){const cK=Math.min(T.ore[k],Math.round(T.ore[k]*nc/n)),r=Math.round(cK*f);T.ore[k]-=cK;if(T.ore[k]<=0)delete T.ore[k];if(r>0)rel[k]=r;if(cK-r>0)toDebris(s,{[k]:cK-r})}
      if(oreTotal(T)<=0)removeAst(s,T);else T.fpv=(T.fpv||0)+1;got+=blCloud(s,at,rel,R0,extra,o)}
    if(!MUTE){fxBoom(at,R0*1.6,'#ffd9a0');SFX.crack&&SFX.crack()}
    for(const x of W.ents.slice())if(x.type==='ship'&&x.alive){const d=d3(x,at);if(d<BL.blastR)damageShip(x,BL.chgDmg*cs.length*(1-d/BL.blastR)+5,e.side,at,'blast')}}
  blSay(P,got?`Blast! ${got} t of ore in the cloud. Hold F by it to collect.`:'Blast! Nothing came loose.')}
function blCloud(s,at,ore,R0,extra,o){const t=oreTotal({ore});if(!t)return 0;s.clouds=s.clouds||[];s.clouds.push({id:S.nextId++,x:Math.round(at.x),y:Math.round(at.y),z:Math.round(at.z),ore,r:R0+30,r0:R0+30,until:S.T+Math.max(30,BL.cloudLife-10*extra),o});return t}
// a core charged anything but perfectly: the whole wreck goes up, and everything in it becomes debris
function blCoreBlow(s,w,pt){const at={x:pt.x,y:pt.y,z:pt.z};if(!MUTE){fxBoom(at,BL.coreR*.6,'#ff9a4a');fxBoom(at,BL.coreR*.35,'#ffe2b0');W.shake=Math.max(W.shake||0,.9)}
  for(const e of W.ents.slice()){if(e.type!=='ship'||!e.alive)continue;const d=d3(e,at);if(d<BL.coreR)damageShip(e,BL.coreDmg*(1-d/BL.coreR)+40,null,at,'blast')}
  if(w)wreckGone(s,w,'blown');else{toDebris(s,pt.ore);pt.ore={}}feed(`✕ A badly placed charge set off the reactor core: the ${w?w.name:''} wreck is gone.`,'bad')}
// the detonate key: warns once when you are inside the blast, then a second press within 3 s goes ahead
function blDetReq(P,e){const s=S.sectors[W.sid],o=blKey(P),mine=(s.charges||[]).filter(c=>c.o===o);if(!mine.length){blSay(P,'No charges set. Fire them with F first.');return}
  let lim=BL.blastR,near=1e9;for(const c of mine){const T=blTgt(s,c);if(!T)continue;if(T.wpt&&T.k==='core')lim=BL.coreR;near=Math.min(near,d3(e,T))}
  if(near<lim&&!(P.blArm&&W.t-P.blArm<3)){P.blArm=W.t;blSay(P,`Inside blast radius: move ${lim} m clear (${Math.round(near)} m). Press 3 again to detonate anyway.`,true);return}
  P.blArm=0;blDetonate(P,e)}
function blCancel(P){const s=S.sectors[W.sid],o=blKey(P),n=(s.charges||[]).filter(c=>c.o===o).length;if(!n){blSay(P,'No charges set.');return}
  s.charges=s.charges.filter(c=>c.o!==o);P.blN=Math.min(blCap(P),(P.blN||0)+n);blSay(P,`${n} charge${n>1?'s':''} cancelled and back in the magazine.`)}
// a cloud within reach in front of this ship
function blCloudNear(e,s){let b=null,bd=1e9;qRot(e.q,0,0,1,_f);for(const c of s.clouds||[]){const dx=c.x-e.x,dy=c.y-e.y,dz=c.z-e.z,d=hyp(dx,dy,dz);if(d>BL.collectR+c.r)continue;if(d>c.r&&(dx*_f.x+dy*_f.y+dz*_f.z)/d<.5)continue;if(d<bd){bd=d;b=c}}return b}
function blCollect(e,P,c,dt,s){const room=e.st.cargo-invMass(P.cargo);if(room<1){if(W.t-(e.fullT||0)>3){e.fullT=W.t;blSay(P,'Hold is full. Dock to unload or fabricate.')}return}
  e.blAcc=(e.blAcc||0)+blColl(P)*dt;while(e.blAcc>=1){const k=mainOre(c);if(!k)break;if(mass(k)>e.st.cargo-invMass(P.cargo))break;e.blAcc-=1;inv.take(c.ore,k,1);inv.add(P.cargo,k,1)}
  if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);blSay(P,'Cloud collected.')}}
// ships and drones inside a cloud stay off radar and can't be locked from more than 300 m away
function blCov(o,from){if(!from||!W||!o||o.type==='station')return false;const s=S.sectors[W.sid];if(!s||!s.clouds||!s.clouds.length)return false;for(const c of s.clouds)if(d3(o,c)<c.r&&d3(o,from)>300)return true;return false}
// pilot controls (local pilot): F fires on press, holding F by a cloud collects it
function blPilotUpdate(p,P,st,sec,dt){const hold=!!(keys.KeyF||mouse.r||touch.mine),press=hold&&!p.blHeld;p.blHeld=hold;p.mining=null;
  if(!blHull(P.cls)){if(press&&W.t-(W.drillMsg||0)>3){flash('No blast rig on this hull: only mining ships (Light, Medium and Heavy Miner) can mine. Switch at a core station Shipyard.');W.drillMsg=W.t}return}
  const cl=hold?blCloudNear(p,sec):null;if(cl){p.mining=cl;if(!NET.cl)blCollect(p,P,cl,dt,sec);return}
  if(press){if(NET.cl)netSend({t:'blast',k:'fire'});else blFire(p,P)}}
function blKeyPress(k){if(!S||!running||S.player.docked||!W.player||W.dead)return;const P=S.player;if(NET.cl){netSend({t:'blast',k});return}if(k==='det')blDetReq(P,W.player);else blCancel(P)}
// HUD: fault-point rings on the targeted rock or salvage point, your charges, clouds, the magazine and the blast warning
function blDraw(c){const p=W.player,P=S.player,s=S.sectors[W.sid];if(!p||!blHull(P.cls))return;c.save();c.lineWidth=1.5;c.font='600 11px "Saira Semi Condensed",sans-serif';c.textAlign='center';
  const T=W.tgt&&(W.tgt.kind==='ast'||W.tgt.kind==='wpt')&&validTgt(W.tgt)?W.tgt.ref:null;
  if(T){if(W.blScanFor!==T.id){W.blScanFor=T.id;const sd=vF(P,'blScan')||BL.scanT,sr=vF(P,'blScanR');T.scanT=W.t+sd;if(sr)for(const a of s.ast)if(d3(a,p)<sr)a.scanT=W.t+sd}const dist=d3(T,p),scan=(T.scanT||0)>W.t;
    if(scan||dist<BL.eyeR+astR(T)){const aim=blAim(p,T),win=blWin(P,T);for(const q of blPts(T)){const L=proj(q.x,q.y,q.z);if(L.behind)continue;const rr=Math.max(5,projR(L.d,win));const ok=aim&&d3(aim,q)<=win;
        c.strokeStyle=ok?'#7ad9a7':scan?'rgba(240,178,74,.95)':'rgba(240,178,74,.45)';c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();if(T.wpt&&T.k==='core'){c.fillStyle='#ff5d4f';c.fillText('CORE · ON POINT ONLY',L.x,L.y-rr-6)}}}}
  if(vF(P,'blScan'))for(const a of s.ast){if(a===T||!((a.scanT||0)>W.t)||d3(a,p)>2200)continue;for(const q of blPts(a)){const L=proj(q.x,q.y,q.z);if(L.behind)continue;c.strokeStyle='rgba(240,178,74,.5)';c.beginPath();c.arc(L.x,L.y,Math.max(3,projR(L.d,blWin(P,a))),0,TAU);c.stroke()}}
  for(const ch of s.charges||[]){if(ch.o!==blKey(P))continue;const L=proj(ch.x,ch.y,ch.z);if(L.behind)continue;c.fillStyle=ch.q==='on'?'#7ad9a7':ch.q==='near'?'#f0b24a':'#ff5d4f';c.beginPath();c.arc(L.x,L.y,3.5,0,TAU);c.fill()}
  for(const cl of s.clouds||[]){const L=proj(cl.x,cl.y,cl.z);if(L.behind)continue;const rr=Math.max(10,projR(L.d,cl.r));c.strokeStyle='rgba(122,217,167,.7)';c.setLineDash([3,5]);c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();c.setLineDash([]);
    c.fillStyle='#7ad9a7';c.fillText(`ORE CLOUD ${oreTotal(cl)} T · ${Math.max(0,Math.ceil(cl.until-S.T))} S`,L.x,L.y-rr-6)}
  const mine=(s.charges||[]).filter(ch=>ch.o===blKey(P));let warn='';if(mine.length){let lim=BL.blastR,near=1e9;for(const ch of mine){const TT=blTgt(s,ch);if(!TT)continue;if(TT.wpt&&TT.k==='core')lim=BL.coreR;near=Math.min(near,d3(p,TT))}if(near<lim)warn=`INSIDE BLAST RADIUS: MOVE ${lim} M CLEAR · ${Math.round(near)} M`}
  c.textAlign='center';c.font='700 13px "Saira Semi Condensed",sans-serif';c.fillStyle='#f0b24a';
  c.fillText(`CHARGES ${P.blN||0}/${blCap(P)}${P.blT>0?` · RELOAD ${Math.ceil(P.blT)} S`:''}${mine.length?` · ${mine.length} SET (3 DETONATE · 4 CANCEL)`:''}`,VW/2,VH-118);
  if(warn){c.fillStyle='#ff5d4f';c.fillText(warn,VW/2,VH-136)}c.restore()}
"""
# the module goes right after the wreck helpers it relies on
rep("function wreckOf(sec,p){return((sec&&sec.wrecks)||[]).find(w=>w.pts.includes(p))||null}",
    "function wreckOf(sec,p){return((sec&&sec.wrecks)||[]).find(w=>w.pts.includes(p))||null}"+BLAST_JS)

# ---------------------------------------------------------------- the pilot's F key: blasting instead of the laser
i=s.index("if(keys.KeyF||mouse.r||touch.mine){");j=s.index("}else p.mining=null;",i)+len("}else p.mining=null;")
assert s.count("if(keys.KeyF||mouse.r||touch.mine){")==1
s=s[:i]+"blPilotUpdate(p,P,st,sec,dt);"+s[j:]
rep("if(c==='Digit3')fireSwarm();","if(c==='Digit3'){if(blHull(S.player.cls))blKeyPress('det');else fireSwarm()}\n  if(c==='Digit4'&&blHull(S.player.cls))blKeyPress('cancel');")
# host and single player: charges in flight, cancelled charges, clouds; the magazine reloads with the others
rep("structUpdate(dt);shotsUpdate(dt);missilesUpdate(dt);","structUpdate(dt);shotsUpdate(dt);missilesUpdate(dt);blWorld(dt);")
rep("function magTick(P,dt){if(!P||!P.tiers)return;","function magTick(P,dt){if(!P||!P.tiers)return;blTick(P,dt);")
# HUD
rep("  if(S.player.docked||W.dead)return;\n  drawDocking(c);","  if(S.player.docked||W.dead)return;\n  drawDocking(c);blDraw(c);")
# radar cover and missile locks
rep("function mHid(o,from){return!!o&&!!o.masked&&(!from||d3(o,from)>(o.maskR||MASK_NEAR))}","function mHid(o,from){return!!o&&((!!o.masked&&(!from||d3(o,from)>(o.maskR||MASK_NEAR)))||blCov(o,from))}")
rep("function seenShip(e){if(e.masked&&hostile('player',e.side)&&mHid(e,W.player))return false;","function seenShip(e){if(e.masked&&hostile('player',e.side)&&mHid(e,W.player))return false;if(hostile('player',e.side)&&blCov(e,W.player))return false;")
# the ledger counts ore floating in clouds
rep("for(const c of s.crates)invVec(c.inv,L['Salvage crates']);","for(const c of s.crates)invVec(c.inv,L['Salvage crates']);for(const c of s.clouds||[])invVec(c.ore,L['Salvage crates']);")

# ---------------------------------------------------------------- multiplayer: guests collect by cloud id, and send fire, detonate and cancel
i=s.index("    if(u&&u.m){const sec=S.sectors[W.sid],a=mineFind(sec,u.m);");j=s.index("netMsg(e.rp,'flash','Hold is full. Dock to unload or fabricate.')}}}",i)+len("netMsg(e.rp,'flash','Hold is full. Dock to unload or fabricate.')}}}")
s=s[:i]+"    if(u&&u.m){const sec=S.sectors[W.sid],cl=(sec.clouds||[]).find(c=>c.id===u.m);if(cl&&d3(cl,e)<BL.collectR+cl.r){e.mining=cl;blCollect(e,P,cl,dt,sec)}}"+s[j:]
rep("    case 'msl':hMissile(pid,m);break;","    case 'msl':hMissile(pid,m);break;\n    case 'blast':{const e=MP.rp[pid];if(e)inW(worldOf(e),()=>{if(m.k==='fire')blFire(e,P);else if(m.k==='det')blDetReq(P,e);else if(m.k==='cancel')blCancel(P)});break}")

# ---------------------------------------------------------------- names, numbers and words
rep("{id:'drill',name:'Mining Laser',base:{plate:1,wire:1}}","{id:'drill',name:'Blast Rig',base:{plate:1,wire:1}}")
rep("desc:'1 mining laser, 1 guard drone, small hold. Nimble enough to run.'","desc:'1 charge launcher, 1 guard drone, small hold. Nimble enough to run.'")
rep("desc:'2 mining lasers, 2 guard drones, mid hold.'","desc:'2 charge launchers, 2 guard drones, mid hold.'")
rep("desc:'3 mining lasers, 4 guard drones, deep hold. Slow and armoured.'","desc:'3 charge launchers, 4 guard drones, deep hold. Slow and armoured.'")
rep("no hold and no mining laser.","no hold and no blast rig.")
rep("Miner’s eye: mining hulls drill 10% faster and mine from 400 m instead of 300 m.","Miner’s eye: blast charges reach 400 m instead of 300 m, and the on-point window is 2 m wider.")
rep("drill:`${(st.drill*mineP(P.cls)).toFixed(2)} t/s`","drill:`${blCap(P)} charges · collector ${blColl(P).toFixed(1)} t/s`")
rep("<span>Mining · Hold</span><b>${(st.drill*mineP(S.player.cls)).toFixed(2)} t/s · ${st.cargo} t</b>","<span>Charges · Hold</span><b>${blCap(S.player)} · ${st.cargo} t</b>")
rep("<div class=\"ts\">Hold F or right-click within 300 m to mine.</div>","<div class=\"ts\">Fire charges at its fault points with F (rings turn green on point), back off 120 m and press 3. Hold F by the ore cloud to collect it.</div>")
rep("Every unit you cut heats the core. Mine in bursts: at 100% it blows.","Every charge on the core must be on point, or the whole wreck goes up.")
rep("'<div class=\"ts\">Mine it with the mining laser (F).</div>'","'<div class=\"ts\">Fire a charge onto its joint (F), back off and press 3, then collect the cloud.</div>'")
rep("Only mining ships carry a mining laser.','info')","Only mining ships carry a blast rig.','info')")
rep("{x:'Only mining ships carry a mining laser, so training has moved you into a <b>Light Miner</b>.","{x:'Only mining ships carry a blast rig, so training has moved you into a <b>Light Miner</b>.")
rep("{x:'Hold <kbd>F</kbd> (or right-click) to run the mining laser. Collect <b>3 ore</b>: lasers cut slowly, and a full hold takes several minutes.",
    "{x:'Mining is blasting. Fault-point rings show on the rock: aim at one until it turns green and press <kbd>F</kbd> to fire a charge. Back off 120 m and press <kbd>3</kbd> to detonate (<kbd>4</kbd> cancels). Then hold <kbd>F</kbd> by the ore cloud and collect <b>3 ore</b>. Charges on point release the most; your magazine reloads slowly, so placement sets your pay.")
rep("{x:'Hold <kbd>F</kbd> to cut it apart with the mining laser. Collect <b>6 units</b> of salvage.",
    "{x:'Wreck sections crack at their joint ring. Fire a charge onto it (<kbd>F</kbd>), back off and press <kbd>3</kbd>, then collect <b>6 units</b> from the cloud. A reactor core needs every charge on point, or the whole wreck goes up.")

# Blast Rig variants (from Ship Upgrade Choices)
rep("  smart:{slot:'payload',name:'Smart seekers',gain:'−40% lock time',cost:'−20% missile damage',f:{lockK:.6,mslK:.8}},",
    "  smart:{slot:'payload',name:'Smart seekers',gain:'−40% lock time',cost:'−20% missile damage',f:{lockK:.6,mslK:.8}},\n"
    "  shaped:{slot:'drill',name:'Shaped charges',gain:'On-point window 8 m instead of 5 m',cost:'An on-point charge releases at most 80%',f:{blWin:8,blRelCap:.8}},\n"
    "  longlaunch:{slot:'drill',name:'Long launcher',gain:'Charges reach 450 m instead of 300 m',cost:'Charges fly 25% slower',f:{blRange:450,blSpdK:.75}},\n"
    "  survey:{slot:'drill',name:'Survey rig',gain:'Scans last 60 s and mark every rock within 2 km',cost:'One charge fewer in the magazine',f:{blScan:60,blScanR:2000,blChg:-1}},")
rep("function vK(P,key){","function vF(P,key){const vr=vrOf(P&&P.tune);for(const sl in vr){const V=VARIANTS[vr[sl]];if(V&&V.f&&V.f[key]!=null)return V.f[key]}return null}\nfunction vK(P,key){")
open(P,'w',encoding='utf-8').write(s);print('blast mining patch applied')
