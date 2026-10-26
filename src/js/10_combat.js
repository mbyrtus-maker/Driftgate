//@src 10_combat.js
// ============================================================ combat helpers
function leadPoint(e,t,spd){const dx=t.x-e.x,dy=t.y-e.y,dz=t.z-e.z,rvx=(t.vx||0)-e.vx,rvy=(t.vy||0)-e.vy,rvz=(t.vz||0)-e.vz;let tt=hyp(dx,dy,dz)/spd;for(let i=0;i<3;i++)tt=hyp(dx+rvx*tt,dy+rvy*tt,dz+rvz*tt)/spd;return{x:e.x+dx+rvx*tt,y:e.y+dy+rvy*tt,z:e.z+dz+rvz*tt}}
const _f={x:0,y:0,z:0},_r={x:0,y:0,z:0},_u={x:0,y:0,z:0},_tq=q0(),_qa=q0();
// ============================================================ gunboat turret
const _gq1=q0(),_gq2=q0(),_gq3=q0(),GT_MAXP=1.35,GT_MINP=-.15;
function turretOf(e){if(!e.tur)e.tur={yaw:Math.PI,pitch:.12,cool:0,mcd:0,gunner:null,ai:{t:0,tgt:null},barrel:1};if(!e.tur.ai)e.tur.ai={t:0,tgt:null};return e.tur}
// where the turret sits on each hull (model units, the ship is drawn at radius*1.25): on the spine, its base ring on the plating
const TUR_MOUNT={bomber:[.2,-.38],gunboat:[.28,-.38]};function turMount(e){return TUR_MOUNT[e.cls]||[.3,-.38]}
function turretMount(e){const sc=e.st.radius*1.25,m=turMount(e);qRot(e.q,0,m[0]*sc,m[1]*sc,_u);return{x:e.x+_u.x,y:e.y+_u.y,z:e.z+_u.z,vx:e.vx,vy:e.vy,vz:e.vz}}
function turretQ(e,T,out){qMul(e.q,qAxis(0,1,0,T.yaw,_gq1),_gq2);return qMul(_gq2,qAxis(1,0,0,-T.pitch,_gq1),out)}
function wrapA(a){if(!isFinite(a))return 0;a%=TAU;while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a}
function turretBlocked(T){return T.pitch<.2&&Math.abs(wrapA(T.yaw))<.55}
function localAim(e,dx,dy,dz){qRot(e.q,1,0,0,_r);qRot(e.q,0,1,0,_u);qRot(e.q,0,0,1,_f);const lx=dx*_r.x+dy*_r.y+dz*_r.z,ly=dx*_u.x+dy*_u.y+dz*_u.z,lz=dx*_f.x+dy*_f.y+dz*_f.z;return{yaw:Math.atan2(lx,lz),pitch:Math.atan2(ly,Math.hypot(lx,lz))}}
function turretRack(e){if(e.isPlayer)return{get:()=>S.player.rack||0,take:()=>{S.player.rack--}};if(e.rp&&S.pilots&&S.pilots[e.rp]){const P=S.pilots[e.rp];return{get:()=>P.rack||0,take:()=>{P.rack--}}}const ld=e.load||(e.load={});return{get:()=>ld.missile||0,take:()=>{ld.missile--}}}
function turretPick(e,T,cone){const M=turretMount(e);turretQ(e,T,_gq3);qRot(_gq3,0,0,1,_f);let best=null,bs=1e9;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const dx=o.x-M.x,dy=o.y-M.y,dz=o.z-M.z,d=hyp(dx,dy,dz);if(d>2200)continue;const c=(dx*_f.x+dy*_f.y+dz*_f.z)/d;if(c<Math.cos(cone))continue;const sc=d*(2-c);if(sc<bs){bs=sc;best=o}}return best}
function turretShoot(e,T){const st=e.st,TC=CLASSES[e.cls]||{};if(T.cool>0||(!TC.turOwnE&&e.energy<st.shotCost*.6)||turretBlocked(T))return;T.cool=1/(st.rof*.85);if(!TC.turOwnE)e.energy-=st.shotCost*.6;const M=turretMount(e);turretQ(e,T,_gq3);qRot(_gq3,0,0,1,_f);qRot(_gq3,1,0,0,_r);
  T.barrel=-(T.barrel||1);const r=st.radius*1.25,off=T.barrel*r*.085,sty=e.side==='pirate'?'scrap':FAC(e.fac).shot;
  W.shots.push({x:M.x+_f.x*r*.5+_r.x*off,y:M.y+_f.y*r*.5+_r.y*off,z:M.z+_f.z*r*.5+_r.z*off,vx:e.vx+_f.x*SHOT_SPD,vy:e.vy+_f.y*SHOT_SPD,vz:e.vz+_f.z*SHOT_SPD,dmg:st.dmg*.85*(TC.turK||1),side:e.side,src:e,ttl:SHOT_TTL,col:e.isPlayer||e.rp?FAC(e.fac).col:sideCol(e.side),sty,tur:1});
  const mine=e===W.player||(W.gunseat&&gsEnt()===e);if(mine)SFX.kinetic(.8);else if(W.t-(T.sndT||0)>.3){T.sndT=W.t;SFX.kinetic(vAt(e)*.6)}}
function turretMissile(e,T,tgt){const rk=turretRack(e);if(T.mcd>0||rk.get()<=0||!tgt)return false;T.mcd=1.2;rk.take();const tier=e.isPlayer?S.player.tiers.weapon:e.rp&&S.pilots[e.rp]?S.pilots[e.rp].tiers.weapon:e.tier||1;launchMissile(e,tgt,tier,'missile');return true}
function turretAI(e,T,dt){const A=T.ai;A.t-=dt;const M=turretMount(e);
  if(A.t<=0||!(A.tgt&&A.tgt.alive&&W.ents.includes(A.tgt))||d3(A.tgt,M)>1500){A.t=.4;A.tgt=null;let bd=1300;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const d=d3(o,M)*(o.ai&&o.ai.tgt===e?.6:1)*(isBmb(o.cls)?.7:1);if(d<bd){bd=d;A.tgt=o}}}
  let want={yaw:Math.PI,pitch:.12};if(A.tgt){const lp=leadPoint(M,A.tgt,SHOT_SPD);want=localAim(e,lp.x-M.x,lp.y-M.y,lp.z-M.z)}
  const rate=2.4*dt,dy=wrapA(want.yaw-T.yaw);T.yaw=wrapA(T.yaw+clamp(dy,-rate,rate));T.pitch=clamp(T.pitch+clamp(want.pitch-T.pitch,-rate,rate),GT_MINP,GT_MAXP);
  if(A.tgt&&Math.abs(wrapA(want.yaw-T.yaw))<.07&&Math.abs(want.pitch-T.pitch)<.07&&d3(A.tgt,M)<1200)turretShoot(e,T);
  if(A.tgt&&(isBmb(A.tgt.cls)||A.tgt.cls==='heavy'||(A.tgt.ai&&A.tgt.ai.tgt===e))&&d3(A.tgt,M)<1500&&W.t-(T.aiM||-99)>15){if(turretMissile(e,T,A.tgt))T.aiM=W.t}}
function tickTurret(e,dt){const T=turretOf(e);T.cool-=dt;T.mcd-=dt;if(jamDark(e)||e.landed||(e.boot&&W.t<e.boot))return;
  if(T.gunner==='local'&&W.gunseat&&gsEnt()===e){const G=W.gunseat;T.yaw=G.yaw;T.pitch=G.pitch;if(keys.Space||mouse.l||touch.fire)turretShoot(e,T);if(G.msl){G.msl=0;const tg=turretPick(e,T,.25);if(!turretMissile(e,T,tg))flash(tg?(turretRack(e).get()<=0?'Missile rack empty.':'Missiles cycling.'):'No hostile near the turret sight.',true)}return}
  if(T.gunner&&T.gunner!=='local'&&typeof MP!=='undefined'&&MP.ginp){const u=MP.ginp[T.gunner];if(u&&performance.now()-u.at<3000){T.yaw=wrapA(+u.yaw||0);T.pitch=clamp(+u.pitch||0,GT_MINP,GT_MAXP);if(u.f&&performance.now()-u.at<600)turretShoot(e,T);if(u.msl){u.msl=0;turretMissile(e,T,turretPick(e,T,.25))}return}turretAI(e,T,dt);return}
  T.gunner=null;turretAI(e,T,dt)}
const TUR_CLS=new Set(['gunboat','bomber']);function hasTur(c){return TUR_CLS.has(c)}
function gunboatsIn(){const out=W.ents.filter(e=>e.type==='ship'&&e.alive&&hasTur(e.cls)&&!e.pup&&!(e.isPlayer&&(S.player.docked||W.dead)));if(W.player&&hasTur(W.player.cls)&&!W.player.pup&&!out.includes(W.player)&&!S.player.docked&&!W.dead&&W===LW)out.push(W.player);return out}
// ---- the gunner's seat (this browser's player in someone else's turret)
function gsEnt(){const G=W&&W.gunseat;if(!G)return null;if(G.ent&&G.ent.alive&&(W.ents.includes(G.ent)||G.ent===W.player))return G.ent;if(G.id){const e=NET.cl?(W.pup||{})[G.id]:entInWorld(W,G.id);if(e&&hasTur(e.cls)){G.ent=e;return e}}return null}
function seatCandidate(){if(!W||!W.player)return null;const p=W.player;let best=null,bd=1e9;for(const e of W.ents){if(e.type!=='ship'||!e.alive||!hasTur(e.cls)||e===p||e.isPlayer)continue;if(hostile('player',e.side))continue;const d=d3(e,p);if(d<e.st.radius*1.25+260&&d<bd){bd=d;best=e}}return best}
function enterSeat(e){const p=W.player;if(hyp(p.vx-e.vx,p.vy-e.vy,p.vz-e.vz)>140){flash('Match speed with the heavy bomber to board its turret (under 140 m/s relative).');return false}
  if(e.tur&&e.tur.gunner&&e.tur.gunner!=='local'){flash('That turret is already manned.',true);return false}
  const T=turretOf(e);W.gunseat={ent:e,id:e.id,yaw:T.yaw,pitch:T.pitch,msl:0};S.player.docked='turret';ghostSync();recallPlayerDrones();cam.snap=true;SFX.clunk();
  if(NET.cl)netSend({t:'gseat',id:e.id});else{T.gunner='local';if(e.npc&&e.order&&e.order.tgt===W.player){e.order=null;e.ai.tgt=null}}
  flash(`In the turret of ${e.pname?e.pname+'\'s heavy bomber':shipLabel(e)}. Mouse aims, click or Space fires, C launches a missile, E climbs out.`);return true}
function leaveSeat(quiet){const G=W.gunseat;if(!G)return;freeLook();const e=gsEnt(),p=W.player;W.gunseat=null;S.player.docked=null;
  if(e){if(e.tur&&e.tur.gunner==='local')e.tur.gunner=null;qRot(e.q,0,1,0,_u);qRot(e.q,1,0,0,_r);const k=e.st.radius*1.25+40;p.x=e.x+_u.x*k*.6+_r.x*k;p.y=e.y+_u.y*k*.6+_r.y*k;p.z=e.z+_u.z*k*.6+_r.z*k;p.vx=e.vx+_r.x*40;p.vy=e.vy+_r.y*40;p.vz=e.vz+_r.z*40;qCopy(p.q,e.q)}
  p.alive=true;cam.snap=true;if(!quiet)SFX.clunk();launchPlayerDrones();if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]})}
function gunseatUpdate(dt){const G=W.gunseat,e=gsEnt(),p=W.player;
  if(!e&&NET.host&&G.id&&String(G.id).startsWith('p_')){const P2=S.pilots[String(G.id).slice(2)];if(P2&&!P2.docked&&P2.sector!==W.sid){const keep={id:G.id,yaw:G.yaw,pitch:G.pitch,msl:0};exitSector();S.player.sector=P2.sector;enterSector(P2.sector);S.player.docked='turret';W.gunseat={...keep,ent:null,lost:performance.now()};SFX.jump();return}
    if(P2&&!P2.docked){if(!G.lost)G.lost=performance.now();if(performance.now()-G.lost<3000)return}}
  if(!e){if(NET.cl){if(!G.lost)G.lost=performance.now();if(performance.now()-G.lost>8000){leaveSeat(true);flash('Lost the heavy bomber. Your fighter is adrift.',true)}return}leaveSeat(true);flash('The heavy bomber is gone. Your fighter is adrift.',true);return}
  G.lost=0;p.x=e.x;p.y=e.y-e.st.radius*.6;p.z=e.z;p.vx=e.vx;p.vy=e.vy;p.vz=e.vz;p.shield=p.st.sCap;
  const si=lookLocked()?keyLook():steerInput();G.yaw=wrapA(G.yaw+si.yaw*1.9*dt);G.pitch=clamp(G.pitch-si.pitch*1.5*dt,GT_MINP,GT_MAXP);
  if(NET.cl&&e.tur){e.tur.yaw=G.yaw;e.tur.pitch=G.pitch}}
function drawGunnerOverlay(c,t){const G=W.gunseat,e=gsEnt();if(!e)return;const cx=VW/2,cy=VH/2,T=e.tur||{},bl=turretBlocked(G);
  c.strokeStyle=bl?'rgba(255,93,79,.8)':'rgba(240,178,74,.95)';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,22,0,TAU);c.stroke();for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){c.beginPath();c.moveTo(cx+a*30,cy+b*30);c.lineTo(cx+a*44,cy+b*44);c.stroke()}
  c.fillStyle='rgba(240,178,74,.95)';c.fillRect(cx-1.5,cy-1.5,3,3);
  const tg=turretPick(e,{yaw:G.yaw,pitch:G.pitch},.25);if(tg){const P=proj(tg.x,tg.y,tg.z);if(!P.behind){const r=Math.max(12,projR(P.d,tg.st.radius*1.25))+6;c.strokeStyle='#ff5d4f';c.strokeRect(P.x-r,P.y-r,r*2,r*2);c.fillStyle='#ff5d4f';c.textAlign='left';c.fillText(`${shipLabel(tg)} · ${fmt(Math.round(d3(tg,e)))} m`,P.x+r+6,P.y-r+8);
      const M=turretMount(e),lp=leadPoint(M,tg,SHOT_SPD),L=proj(lp.x,lp.y,lp.z);if(!L.behind){c.beginPath();c.moveTo(L.x,L.y-7);c.lineTo(L.x+7,L.y);c.lineTo(L.x,L.y+7);c.lineTo(L.x-7,L.y);c.closePath();c.stroke()}}}
  c.textAlign='center';c.font='700 13px "Saira Semi Condensed",sans-serif';c.fillStyle='#f0b24a';c.fillText(`GUNNER · ${e.pname?e.pname.toUpperCase()+"'S ":''}${String(hullName(e.fac,e.cls)).toUpperCase()}`,cx,cy+72);
  c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='#cfd6e4';c.fillText(`${bl?'Blocked by the hull · ':''}Hull ${Math.round(e.hull/e.st.hull*100)}% · Shield ${Math.round(e.shield/(e.st.sCap||1)*100)}% · Missiles ${e.isPlayer||!e.rp?turretRack(e).get():'—'} · Click/Space fire · C missile · E climb out`,cx,cy+90)}
function fire(e){if(e.train)return;if(jamDark(e))return;if(e.isPlayer&&(e.landed||e.stealth||(e.boot&&W.t<e.boot)))return;if(e.isPlayer&&S.unb&&e.cool<=0&&e.energy>0)unbShot();
  if(e.isPlayer&&jamFrac(e)>=.25&&Math.random()<(jamFrac(e)>=.5?.33:.1))return;
  if(e.landed||e.stealth||(e.boot&&W.t<e.boot))return;if(e.cool>0||e.energy<e.st.shotCost)return;e.cool=1/e.st.rof;e.energy-=e.st.shotCost;e.lastFire=W.t;
  if(e.isPlayer)SFX.kinetic(1);else if(W.t-(e.sndT||0)>.3){e.sndT=W.t;SFX.kinetic(vAt(e)*.7)}
  qRot(e.q,0,0,1,_f);qRot(e.q,1,0,0,_r);const r=e.st.radius;e.barrel=(e.barrel||1)*-1;const off=e.barrel*r*.42;
  const sty=e.side==='pirate'?'scrap':FAC(e.fac).shot;
  W.shots.push({x:e.x+_f.x*r+_r.x*off,y:e.y+_f.y*r+_r.y*off,z:e.z+_f.z*r+_r.z*off,vx:e.vx+_f.x*(e.st.shotSpd||SHOT_SPD),vy:e.vy+_f.y*(e.st.shotSpd||SHOT_SPD),vz:e.vz+_f.z*(e.st.shotSpd||SHOT_SPD),dmg:e.st.dmg,side:e.side,src:e,ttl:SHOT_TTL*(e.st.shotTtl||1),jam:!!e.jamMode,col:e.isPlayer?FAC(S.player.faction).col:sideCol(e.side),sty});
}
// lasers bite harder into shields, kinetic slugs into hull; missiles hit both evenly
function setWeapon(w){if(!S||!running)return;if(S.player.wpn===w)return;S.player.wpn=w;flash(w==='laser'?'Lasers: instant hit, no lead, heavy energy draw. Strong against shields.':'Kinetic cannons: lead the target, light energy draw. Strong against hull.')}
function laserRay(e,range){qRot(e.q,0,0,1,_f);const fx=_f.x,fy=_f.y,fz=_f.z,r=e.st.radius,ox=e.x+fx*r,oy=e.y+fy*r,oz=e.z+fz*r;let best=range,hit=null;
  const test=(c,R)=>{const lx=c.x-ox,ly=c.y-oy,lz=c.z-oz,t=lx*fx+ly*fy+lz*fz;if(t<-R||t-R>best)return false;const d2=lx*lx+ly*ly+lz*lz-t*t;if(d2>R*R)return false;const th=Math.max(0,t-Math.sqrt(R*R-d2));if(th<best){best=th;return true}return false};
  for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e)continue;if(o.isPlayer&&(S.player.docked||W.dead))continue;if(!hostAt(e.side,e,o))continue;if(test(o,o.st.radius*1.4+8))hit={kind:'ship',ref:o}}
  const OE=W.outpostEnt;if(OE&&test(OE,80))hit=OE.o.owner&&!OE.o.breached&&hostile(e.side,OE.o.owner)?{kind:'outpost',ref:OE}:{kind:'block'};
  const SE=W.stationEnt;if(SE){if(hostile(e.side,SE.fac)&&!SE.offline&&SE.shield>0){if(test(SE,165))hit={kind:'station',ref:SE}}else if(hostile(e.side,SE.fac)&&test(SE,75))hit={kind:'station',ref:SE};else if(test(SE,60))hit={kind:'block'}}
  for(const a of S.sectors[W.sid].ast)if(test(a,astR(a)))hit={kind:'block'};
  return{hit,x:ox+fx*best,y:oy+fy*best,z:oz+fz*best,d:best}}
function fireLaser(e){if(jamDark(e))return;if(e.cool>0||e.landed||e.stealth||(e.boot&&W.t<e.boot))return;const cost=e.st.shotCost*1.6;
  if(e.energy<cost){if(e.isPlayer&&W.t-(W.lowEMsg||0)>2.5){flash('Lasers need energy. Let the reactor recharge or switch to kinetic (1).');W.lowEMsg=W.t}return}
  e.cool=1/LASER_ROF;e.energy-=cost;e.lastFire=W.t;const R=laserRay(e,LASER_RANGE),dmg=e.st.dmg*.5;
  if(e.isPlayer){AU.lasT=W.t;AU.lasW=W}else if(W.t-(e.sndT||0)>.45){e.sndT=W.t;SFX.laserNpc(vAt(e))}
  if(R.hit){if(R.hit.kind==='ship')(R.src=e,damageShip(R.hit.ref,dmg*(e.st.cautery?(R.hit.ref.side==='brood'&&R.hit.ref.role==='builder'?1.4:.88):1),e.side,R,'laser'));else if(R.hit.kind==='torp'){R.hit.ref.hp-=dmg;if(R.hit.ref.hp<=0)killTorp(R.hit.ref,e.side)}else if(R.hit.kind==='station'){damageStation(R.hit.ref,dmg*1.1*(e.st.cautery&&R.hit.ref.fac==='brood'?1.4:1),e.side,'laser',e);if(Math.random()<.5)fxSpark(R,'#9fd0ff',1)}else{if(R.hit.kind==='outpost')damageOutpost(R.hit.ref,dmg*.9);if(Math.random()<.5)fxSpark(R,'#ffe0b0',1)}}
  W.beams.push({src:e,x:R.x,y:R.y,z:R.z,ttl:.11,col:e.isPlayer?FAC(S.player.faction).col:sideCol(e.side)})}
function damageShip(e,dmg,srcSide,at,kind){
  {const me=W.player;if(me&&e.alive&&!e.ghost){if(e===me){if(srcSide&&srcSide!==me.side)musHit(e.shield>0)}else if(at&&(at.src===me||at===me))musHit(e.shield>0)}}
  if(!e.alive||e.inJump||e.ghost||(e.isPlayer&&(W.detach||W.t<(W.ejectT||0))))return;if(NET.cl){if(e.isPlayer)return;e.lastHit=W.t;if(e.shield>0){e.shHitT=W.t;e.shHitA=.4;fxSpark(at||e,'#8fc8ff',3)}else fxSpark(at||e,'#ffd9a0',3);return}e.lastHit=W.t;e.lastHitBy=srcSide;if(e.role==='frigate'&&e.tok&&e.tok.pings)dmg*=limpetK(e.tok,srcSide);const h0=e.hull,s0=e.shield,rec=()=>dmgRec(e,srcSide,at,(s0-Math.max(0,e.shield))+(h0-Math.max(0,e.hull)));
  // escorts are light capitals: a torpedo that connects guts one (about 4 hits at Mk I, 2 at Mk V)
  if(e.stealth){if(e.isPlayer)stealthOff(true);else{e.stealth=false;e.masked=false;e.maskR=0;e.boot=W.t+BOOT_T}}
  if(e.cls==='escort'&&(kind||(at&&at.kind))==='torpedo'){dmg*=ESC_TORP_MUL;stat('torpHit')}
  if(e.cls==='frigate'||e.cls==='carrier'){if(e.tok)e.tok.fightT=S.T;const k=kind||(at&&at.kind);if(k==='torpedo'){dmg*=4;stat('torpHit');stat('torpDmg',dmg)}else if(k!=='capital'){if(e.shield>0){e.shield=Math.max(0,e.shield-dmg*.6);e.shHitT=W.t;e.shHitA=.5;fxSpark(at||e,'#8fc8ff',3)}else{fxSpark(at||e,'#ffd9a0',2);e.hull-=dmg*capChip(k);if(srcSide==='player'&&W.t-(W.capT||-99)>8){W.capT=W.t;flash('Fighter weapons only chip capital-ship armour. It takes a lot of hits; torpedoes do the real damage.',true)}}rec();if(e.hull<=0)killShip(e,srcSide,at);return}}
  if(e.isPlayer&&at&&srcSide){let dx,dy,dz;if(at.src&&at.src.x!==undefined&&at.vx===undefined){dx=at.src.x-e.x;dy=at.src.y-e.y;dz=at.src.z-e.z}else if(at.vx!==undefined){dx=-at.vx;dy=-at.vy;dz=-at.vz}else{dx=at.x-e.x;dy=at.y-e.y;dz=at.z-e.z}
    const l=hyp(dx,dy,dz)||1;W.hitDirs=(W.hitDirs||[]).filter(h=>W.t-h.t<1.3);W.hitDirs.push({x:dx/l,y:dy/l,z:dz/l,t:W.t})}
  const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind)*vsShK(e,at,kind)*(S.unb&&at&&MK[at.kind]&&(at.src===W.player||(at.src&&at.src.rp))&&!at.harp?1.25:1),hf=kind==='laser'?.75:kind==='kinetic'?1.15:1;
  if(e.shield>0){const eff=dmg*sf,a=Math.min(e.shield,eff);e.shield-=a;dmg=(eff-a)/sf;
    if(a>0){e.shHitT=W.t;e.shHitA=Math.min(1,a/(e.st.sCap*.25)+.35);e.hitPt=at?{x:at.x-e.x,y:at.y-e.y,z:at.z-e.z}:null;fxSpark(at||e,'#8fc8ff',4);if(e.isPlayer){W.shHit=.35;SFX.shield()}}
    if(e.shield<=0){e.shield=0;e.shBreakT=W.t;e.shDown=true;fxShieldBreak(e);if(e.isPlayer){flash('Shields down! Hold Shift to boost away.',true);SFX.shieldDown()}}}
  if(dmg>0&&srcSide==='brood'&&e.side!=='brood'){const cap=e.st.sporeCap||3;e.spores=(e.spores||[]).filter(t=>t>W.t);if(e.isPlayer)SFX.spore();if(e.spores.length<cap)e.spores.push(W.t+4);else{e.spores.sort((x,y)=>x-y);e.spores[0]=W.t+4}}
  if(dmg>0){e.hull-=dmg*hf*(1-e.st.dr)*vsHullK(e,at,kind);fxSpark(at||e,'#ffd9a0',4);if(e.isPlayer){W.hurt=.25;W.shake=Math.max(W.shake||0,.45);SFX.hull()}}
  rec();if(e.hull<=0)killShip(e,srcSide,at);
}
// ============================================================ capital wrecks: a dead carrier or escort (and the Brood's Hive
// Ship and Prowler) leaves a hulk holding everything that would have gone to debris. A third of it (by raw-material mass)
// comes out as intact components, the rest as raw ore. Miners cut it apart at salvage points with the mining laser; the
// reactor core is the prize, but every unit cut from it builds heat, and it blows when the heat tops out. The Brood are drawn
// to wrecks and digest them twice as fast. After WRECK_LIFE s whatever is left breaks up into the system's debris, as before.
const WRECK_LIFE=300,WRECK_COMP=1/3,CORE_HEAT=.045,CORE_COOL=.12,CORE_BLAST=380,CORE_DMG=320,WPT_R=20;
const WPT_NAME={core:'Reactor core',drive:'Drive block',bulk:'Torn bulkhead',cargo:'Cargo bay'};
function wptsIn(sec){const o=[];for(const w of(sec&&sec.wrecks)||[])for(const p of w.pts)if(oreTotal(p)>0)o.push(p);return o}
function mineFind(sec,id){return sec.ast.find(a=>a.id===id)||wptsIn(sec).find(p=>p.id===id)||null}
function wreckOf(sec,p){return((sec&&sec.wrecks)||[]).find(w=>w.pts.includes(p))||null}
// ============================================================ blast mining (pilots): scan a rock, fire charges at its fault points from up to 300 m, back off
// and detonate (5) or cancel (6), then fly into the chunks that come loose to scoop them (or hold F by one). Each charge blows off one chunk of its fault-point
// section (up to the launcher's size: 7, 9 or 14 units) and releases 90% of it on point, 50% near, 25% off, so a full hold takes
// several charges and placement, not time on the rock, sets a miner's pay. Wreck sections crack at their joint, and a reactor core needs every charge on point or it all blows.
// Nothing is made or lost: unreleased ore, and nuggets left when a cloud thins out, go to the system's debris pool.
const BL={spd:300,near:15,blastR:120,cloudLife:90,collectR:250,coreR:600,coreDmg:520,chgDmg:22,stationR:400,scanT:20,eyeR:100};
const BL_HULL={skiff:{n:5,reload:90,coll:6,cd:1,k:2.5},prospector:{n:6,reload:100,coll:9,cd:.5,k:2.6},dredger:{n:7,reload:110,coll:12,cd:.34,k:3}};
const BL_REL={on:.9,near:.5,off:.25};
function blHull(cls){return BL_HULL[cls]||null}
function blTier(P){return(P&&P.tiers&&P.tiers.drill)||1}
function blCap(P){const h=P&&blHull(P.cls);return h?Math.max(1,h.n+blTier(P)-1+(vF(P,'blChg')||0)):0}                       // a Blast Rig Mk level adds a charge
function blColl(P){const h=P&&blHull(P.cls);return h?h.coll*(1+.2*(blTier(P)-1)):0}
function blWin(P,a){const rare=a&&!a.wpt&&a.ore&&(a.ore.au||a.ore.nu),b=(vF(P,'blWin')||5)+(a&&a.wpt?2:0);return(rare?b-2:b)+((P&&(P.lvl||0)>=3)?2:0)}
function blRange(P){return Math.max(legMineR(P),vF(P,'blRange')||0)}
function blKey(P){return(P&&P.pid)||'me'}
function blRng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
// a rock's fault points: fixed by its seed (and a new set each time it is partly cracked), spread over its surface
function blPts(a){if(a.wpt){const w=wreckOf(S.sectors[W.sid],a),R=WPT_R*.9;let dx=0,dy=1,dz=0;if(w){dx=a.x-w.x;dy=a.y-w.y;dz=a.z-w.z;const l=hyp(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l}return[{x:a.x+dx*R,y:a.y+dy*R,z:a.z+dz*R}]}
  const tot=oreTotal(a),n=tot<=50?2:tot<=90?3:4,key=n+':'+(a.fpv||0)+':'+Math.round(a.x);if(a._fpk===key&&a._fp)return a._fp;
  const r=blRng((a.seed||a.id||1)+(a.fpv||0)*7919),R=astR(a),out=[],rot=r()*TAU,tilt=r()*2-1;
  for(let i=0;i<n;i++){const y=1-(i+.5)*2/n*(.8+.2*r()),rr=Math.sqrt(Math.max(0,1-y*y)),th=rot+i*2.39996;let x=Math.cos(th)*rr,z=Math.sin(th)*rr,yy=y*.9+tilt*.1;const l=hyp(x,yy,z)||1;out.push({x:a.x+x/l*R,y:a.y+yy/l*R,z:a.z+z/l*R})}
  a._fpk=key;a._fp=out;return out}
function blRate(q,P){const r=BL_REL[q]||0,cap=vF(P,'blRelCap');return cap?Math.min(cap,r):r}
function blTick(P,dt){const cap=blCap(P);if(!cap){P.blN=0;P.blT=0;return}if(P.blN==null)P.blN=cap;if(P.blN>cap)P.blN=cap;
  if(P.docked&&P.docked!=='bridge'&&P.docked!=='turret'){P.blN=cap;P.blT=0;return}   // the dock reloads the magazine: launch with every charge
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
function blWorld(dt){const s=S.sectors[W.sid];npcBlWorld(dt);
  if(W.blShots&&W.blShots.length){for(let i=W.blShots.length-1;i>=0;i--){const sh=W.blShots[i];sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.z+=sh.vz*dt;sh.ttl-=dt;let hit=null;
      for(const a of s.ast)if(d3(sh,a)<astR(a)+2){hit=a;break}if(!hit)for(const a of wptsIn(s))if(d3(sh,a)<WPT_R+2){hit=a;break}
      if(hit){blStick(sh,hit,s);W.blShots.splice(i,1)}else if(sh.ttl<=0)W.blShots.splice(i,1)}}
  // charges whose pilot has left the system cancel themselves; charges on a target that has gone are lost
  if(s.charges&&s.charges.length){const here=new Set(allPilots().filter(P=>P&&P.sector===W.sid).map(blKey)),gone={};
    s.charges=s.charges.filter(c=>{if(here.has(c.o)&&blTgt(s,c))return true;gone[c.o]=(gone[c.o]||0)+(here.has(c.o)?0:1);return false});
    for(const o in gone)if(gone[o]){const P=blPilot(o);if(P)P.blN=Math.min(blCap(P),(P.blN||0)+gone[o])}}
  if(s.clouds&&s.clouds.length){const dmp=Math.pow(.86,dt);for(const c of s.clouds){if(c.chunk){c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vx*=dmp;c.vy*=dmp;c.vz*=dmp}else c.r=Math.min(c.r+4*dt,c.r0+160)}s.clouds=s.clouds.filter(c=>{if(S.T<c.until&&oreTotal(c)>0)return true;if(oreTotal(c)>0)toDebris(s,c.ore);return false})}}
function blTgt(s,c){return c.wp?wptsIn(s).find(p=>p.id===c.a):s.ast.find(a=>a.id===c.a)}
function blPilot(o){if(o==='me'||isMe(o))return S.player;return(S.pilots||{})[o]||null}
// detonate every charge this pilot has set in this system
function blDetonate(P,e){const s=S.sectors[W.sid],o=blKey(P),mine=(s.charges||[]).filter(c=>c.o===o);if(!mine.length){blSay(P,'No charges set. Fire them with F first.');return}
  s.charges=s.charges.filter(c=>c.o!==o);const by={};for(const c of mine)(by[c.a]=by[c.a]||[]).push(c);let got=0,perf=0;
  for(const id in by){const cs=by[id],T=blTgt(s,cs[0]);if(!T)continue;const at={x:T.x,y:T.y,z:T.z},R0=astR(T);
    if(T.wpt){const w=wreckOf(s,T);if(T.k==='core'&&cs.some(c=>c.q!=='on')){blCoreBlow(s,w,T);continue}
      const best=Math.max(...cs.map(c=>blRate(c.q,P))),f=best*Math.max(0,1-.1*(cs.length-1)),rel={};for(const k in T.ore){const r=Math.round(T.ore[k]*f);if(r>0)rel[k]=r;const d=T.ore[k]-r;if(d>0)toDebris(s,{[k]:d})}
      T.ore={};T.last=0;{const w=wreckOf(s,T);let nx=w?T.x-w.x:rnd(-1,1),ny=w?T.y-w.y:rnd(-1,1),nz=w?T.z-w.z:rnd(-1,1);const nl=hyp(nx,ny,nz)||1,sp=rnd(5,8);got+=blCloud(s,at,rel,R0,cs.length-1,o,{x:nx/nl*sp,y:ny/nl*sp,z:nz/nl*sp},1)}}
    else{const n=blPts(T).length,secQ={};let extra=0;for(const c of cs){const r=blRate(c.q,P);if(c.pi in secQ){extra++;secQ[c.pi]=Math.max(secQ[c.pi],r)}else secQ[c.pi]=r}
      // a perfect blast (a charge on point on every fault point of the rock) cracks the whole rock: all of its ore comes loose
      const nc=Object.keys(secQ).length,perfect=nc===n&&cs.every(c=>c.q==='on'),f=perfect?1:Object.values(secQ).reduce((a,b)=>a+b,0)/nc*Math.max(0,1-.1*extra),rel={},hk=blHull(P.cls),tot0=oreTotal(T),fr=perfect?1:Math.min(nc/n,hk&&hk.k?hk.k*nc/Math.max(1,tot0):1);if(perfect)perf++;
      for(const k of Object.keys(T.ore)){const cK=Math.min(T.ore[k],Math.round(T.ore[k]*fr)),r=Math.round(cK*f);T.ore[k]-=cK;if(T.ore[k]<=0)delete T.ore[k];if(r>0)rel[k]=r;if(cK-r>0)toDebris(s,{[k]:cK-r})}
      if(oreTotal(T)<=0)removeAst(s,T);else T.fpv=(T.fpv||0)+1;
      {const ks=Object.keys(secQ),parts=oreSplit(rel,ks.map(k=>secQ[k]));ks.forEach((pi,i)=>{const mine=cs.filter(c=>String(c.pi)===pi);let x=0,y=0,z=0;for(const c of mine){x+=c.x;y+=c.y;z+=c.z}x/=mine.length;y/=mine.length;z/=mine.length;
        let nx=x-at.x,ny=y-at.y,nz=z-at.z;const nl=hyp(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;const t=oreTotal({ore:parts[i]}),cr=chunkR(t),sp=rnd(6,10);
        got+=blCloud(s,{x:x+nx*(cr+4),y:y+ny*(cr+4),z:z+nz*(cr+4)},parts[i],R0,extra,o,{x:nx*sp+rnd(-1,1),y:ny*sp+rnd(-1,1),z:nz*sp+rnd(-1,1)})})}}
    if(!MUTE){fxBoom(at,R0*1.6,'#ffd9a0');SFX.crack&&SFX.crack(vPil(at))}
    for(const x of W.ents.slice())if(x.type==='ship'&&x.alive){const d=d3(x,at);if(d<BL.blastR)damageShip(x,BL.chgDmg*cs.length*(1-d/BL.blastR)+5,e.side,at,'blast')}}
  blSay(P,got&&perf?`Perfect blast! The whole rock cracked open: ${got} t of ore. Fly into the chunks to scoop it all.`:got?`Blast! ${got} t ${Object.keys(by).some(id=>(mine.find(c=>String(c.a)===id)||{}).wp)?'of salvage':'of ore'} knocked loose. Fly into the chunks to scoop them.`:'Blast! Nothing came loose.')}
function blCloud(s,at,ore,R0,extra,o,v,scrap){const t=oreTotal({ore});if(!t)return 0;s.clouds=s.clouds||[];const cr=chunkR(t);s.clouds.push({id:S.nextId++,chunk:1,scrap:scrap?1:undefined,cr,x:Math.round(at.x),y:Math.round(at.y),z:Math.round(at.z),vx:v?v.x:0,vy:v?v.y:0,vz:v?v.z:0,ore,r:cr+25,r0:cr+25,until:S.T+Math.max(30,BL.cloudLife-10*extra),o});return t}
function chunkR(t){return Math.round((4+Math.sqrt(Math.max(1,t))*2.4)*10)/10}
// share a released lot between sections by their release rates, to the unit
function oreSplit(ore,w){const W=w.reduce((a,b)=>a+b,0)||1,out=w.map(()=>({}));for(const k in ore){const n=ore[k],sh=w.map(x=>n*x/W),fl=sh.map(Math.floor);let left=n-fl.reduce((a,b)=>a+b,0);const ord=sh.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]);for(const[,i]of ord){if(left<=0)break;fl[i]++;left--}fl.forEach((m,i)=>{if(m>0)out[i][k]=m})}return out}
// a core charged anything but perfectly: the whole wreck goes up, and everything in it becomes debris
function blCoreBlow(s,w,pt){const at={x:pt.x,y:pt.y,z:pt.z};if(!MUTE){fxBoom(at,BL.coreR*.6,'#ff9a4a');fxBoom(at,BL.coreR*.35,'#ffe2b0');W.shake=Math.max(W.shake||0,.9)}
  for(const e of W.ents.slice()){if(e.type!=='ship'||!e.alive)continue;const d=d3(e,at);if(d<BL.coreR)damageShip(e,BL.coreDmg*(1-d/BL.coreR)+40,null,at,'blast')}
  if(w)wreckGone(s,w,'blown');else{toDebris(s,pt.ore);pt.ore={}}feed(`✕ A badly placed charge set off the reactor core: the ${w?w.name:''} wreck is gone.`,'bad')}
// the detonate key: warns once when you are inside the blast, then a second press within 3 s goes ahead
function blDetReq(P,e){const s=S.sectors[W.sid],o=blKey(P),mine=(s.charges||[]).filter(c=>c.o===o);if(!mine.length){blSay(P,'No charges set. Fire them with F first.');return}
  let lim=BL.blastR,near=1e9;for(const c of mine){const T=blTgt(s,c);if(!T)continue;if(T.wpt&&T.k==='core')lim=BL.coreR;near=Math.min(near,d3(e,T))}
  if(near<lim&&!(P.blArm&&S.T-P.blArm<3&&S.T>=P.blArm)){P.blArm=S.T;blSay(P,`Inside blast radius: move ${lim} m clear (${Math.round(near)} m). Press ${kb('det')} again to detonate anyway.`,true);return}
  P.blArm=0;blDetonate(P,e)}
function blCancel(P){const s=S.sectors[W.sid],o=blKey(P),n=(s.charges||[]).filter(c=>c.o===o).length;if(!n){blSay(P,'No charges set.');return}
  s.charges=s.charges.filter(c=>c.o!==o);P.blN=Math.min(blCap(P),(P.blN||0)+n);blSay(P,`${n} charge${n>1?'s':''} cancelled and back in the magazine.`)}
// a cloud within reach in front of this ship
function blCloudNear(e,s){let b=null,bd=1e9;qRot(e.q,0,0,1,_f);for(const c of s.clouds||[]){const dx=c.x-e.x,dy=c.y-e.y,dz=c.z-e.z,d=hyp(dx,dy,dz);if(d>BL.collectR+c.r)continue;if(d>c.r&&(dx*_f.x+dy*_f.y+dz*_f.z)/d<.5)continue;if(d<bd){bd=d;b=c}}return b}
function blCollect(e,P,c,dt,s){const room=e.st.cargo-invMass(P.cargo);if(room<1){if(W.t-(e.fullT||0)>3){e.fullT=W.t;blSay(P,'Hold is full. Dock to unload or fabricate.')}return}
  e.blAcc=(e.blAcc||0)+blColl(P)*dt;while(e.blAcc>=1){const k=mainOre(c);if(!k)break;if(mass(k)>e.st.cargo-invMass(P.cargo))break;e.blAcc-=1;inv.take(c.ore,k,1);inv.add(P.cargo,k,1)}
  if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);blSay(P,c.chunk?'Chunk scooped.':'Cloud collected.');if(!MUTE&&e===W.player)SFX.clunk&&SFX.clunk()}}
// flying into a chunk scoops it: within its body plus the ship's
function chunkAt(e,s){for(const c of s.clouds||[])if(c.chunk&&d3(c,e)<c.cr+e.st.radius+30)return c;return null}
// ships and drones inside a cloud stay off radar and can't be locked from more than 300 m away
function blCov(o,from){if(!from||!W||!o||o.type==='station')return false;const s=S.sectors[W.sid];if(!s||!s.clouds||!s.clouds.length)return false;for(const c of s.clouds)if(d3(o,c)<c.r&&d3(o,from)>300)return true;return false}
// pilot controls (local pilot): F fires on press, holding F by a cloud collects it
function blPilotUpdate(p,P,st,sec,dt){const hold=!!(keys.KeyF||mouse.r||touch.mine),press=hold&&!p.blHeld;p.blHeld=hold;p.mining=null;
  if(!blHull(P.cls)){if(isScoutCls(P.cls)){limpetHold(hold,dt);return}if(press&&W.t-(W.drillMsg||0)>3){flash('No blast rig on this hull: only mining ships (Light, Medium and Heavy Miner) can mine. Switch at a core station Shipyard.');W.drillMsg=W.t}return}
  {const ch=!NET.cl&&chunkAt(p,sec);if(ch){p.mining=ch;blCollect(p,P,ch,dt,sec)}}
  const cl=hold?blCloudNear(p,sec):null;if(cl){p.mining=cl;if(!NET.cl)blCollect(p,P,cl,dt,sec);return}
  if(press){if(NET.cl)netSend({t:'blast',k:'fire'});else blFire(p,P)}}
function blKeyPress(k){if(!S||!running||S.player.docked||!W.player||W.dead)return;const P=S.player;if(NET.cl){netSend({t:'blast',k});return}if(k==='det')blDetReq(P,W.player);else blCancel(P)}
// HUD: fault-point rings on the targeted rock or salvage point, your charges, clouds, the magazine and the blast warning
function blPredict(p,P,T){qRot(p.q,0,0,1,_f);const sp=BL.spd*(vF(P,'blSpdK')||1),r=p.st.radius,ox=p.x+_f.x*r,oy=p.y+_f.y*r,oz=p.z+_f.z*r,vx=p.vx+_f.x*sp,vy=p.vy+_f.y*sp,vz=p.vz+_f.z*sp,vl=hyp(vx,vy,vz)||1,dx=vx/vl,dy=vy/vl,dz=vz/vl;
  const Rh=(T.wpt?WPT_R:astR(T))+2,cx=ox-T.x,cy=oy-T.y,cz=oz-T.z,b=cx*dx+cy*dy+cz*dz,cc=cx*cx+cy*cy+cz*cz-Rh*Rh,D=b*b-cc;if(D<0)return null;const t=-b-Math.sqrt(D);if(t<0)return null;
  const hx=ox+dx*t-T.x,hy=oy+dy*t-T.y,hz=oz+dz*t-T.z,hl=hyp(hx,hy,hz)||1,R0=astR(T);return{at:{x:T.x+hx/hl*R0,y:T.y+hy/hl*R0,z:T.z+hz/hl*R0},d:t,ok:t/vl<=blRange(P)/sp}}
function blDraw(c){const p=W.player,P=S.player,s=S.sectors[W.sid];if(!p||!blHull(P.cls))return;c.save();c.lineWidth=1.5;c.font='600 11px "Saira Semi Condensed",sans-serif';c.textAlign='center';
  const T=W.tgt&&(W.tgt.kind==='ast'||W.tgt.kind==='wpt')&&validTgt(W.tgt)?W.tgt.ref:null;
  // a scan pulses when you target a rock, and again whenever you re-target it (R or Tab), so the fault points can be brought back
  if(T){if(W.blScanFor!==T.id||W.blScanObj!==W.tgt){W.blScanFor=T.id;W.blScanObj=W.tgt;const sd=vF(P,'blScan')||BL.scanT,sr=vF(P,'blScanR');T.scanT=W.t+sd;if(sr)for(const a of s.ast)if(d3(a,p)<sr)a.scanT=W.t+sd}const dist=d3(T,p),scan=(T.scanT||0)>W.t;
    if(scan||dist<BL.eyeR+astR(T)){const pr=blPredict(p,P,T),aim=pr&&pr.ok?pr.at:null,win=blWin(P,T),pts=blPts(T);let bi=-1,bd=1e9;if(pr)pts.forEach((q,i)=>{const d=d3(pr.at,q);if(d<bd){bd=d;bi=i}});
      pts.forEach((q,i)=>{const L=proj(q.x,q.y,q.z);if(L.behind)return;const rr=Math.max(5,projR(L.d,win)),rn=Math.max(rr+3,projR(L.d,BL.near)),done=(s.charges||[]).some(ch=>ch.o===blKey(P)&&ch.a===T.id&&ch.pi===i),ok=aim&&d3(aim,q)<=win;
        c.strokeStyle=ok?'#7ad9a7':done?'rgba(122,217,167,.55)':scan?'rgba(240,178,74,.95)':'rgba(240,178,74,.45)';c.lineWidth=ok?2.5:1.5;c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();
        c.lineWidth=1;c.setLineDash([2,4]);c.strokeStyle='rgba(240,178,74,.35)';c.beginPath();c.arc(L.x,L.y,rn,0,TAU);c.stroke();c.setLineDash([]);c.lineWidth=1.5;
        if(done){c.fillStyle='rgba(122,217,167,.85)';c.fillText('SET',L.x,L.y+rn+11)}
        if(T.wpt&&T.k==='core'){c.fillStyle='#ff5d4f';c.fillText('CORE · ON POINT ONLY',L.x,L.y-rr-6)}});
      if(pr){const A=proj(pr.at.x,pr.at.y,pr.at.z);if(!A.behind){const q=bi>=0?pts[bi]:null,qd=q?d3(pr.at,q):1e9,cl=!pr.ok?'range':qd<=win?'on':qd<=BL.near?'near':'off',col={on:'#7ad9a7',near:'#f0b24a',off:'#ff5d4f',range:'rgba(205,205,215,.75)'}[cl];
        if(q&&cl!=='on'&&pr.ok){const Q=proj(q.x,q.y,q.z);if(!Q.behind){c.strokeStyle=col;c.globalAlpha=.6;c.setLineDash([3,3]);c.beginPath();c.moveTo(A.x,A.y);c.lineTo(Q.x,Q.y);c.stroke();c.setLineDash([]);c.globalAlpha=1}}
        const k=9;c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(A.x-k,A.y);c.lineTo(A.x-3,A.y);c.moveTo(A.x+3,A.y);c.lineTo(A.x+k,A.y);c.moveTo(A.x,A.y-k);c.lineTo(A.x,A.y-3);c.moveTo(A.x,A.y+3);c.lineTo(A.x,A.y+k);c.stroke();c.lineWidth=1.5;
        c.fillStyle=col;c.fillText(cl==='range'?`OUT OF RANGE · ${Math.round(pr.d)} / ${Math.round(blRange(P))} M`:cl==='on'?'ON POINT':`${cl==='near'?'NEAR':'OFF'} · ${Math.round(qd)} M`,A.x,A.y+k+13)}}
      else if(dist<blRange(P)+astR(T)+300){c.fillStyle='rgba(205,205,215,.75)';c.fillText('CHARGE WOULD MISS THE ROCK',VW/2,VH/2+34)}}
    else if(dist<blRange(P)+astR(T)+600){const L=proj(T.x,T.y,T.z);if(!L.behind){c.fillStyle='rgba(240,178,74,.9)';c.fillText('SCAN FADED · PRESS R TO RESCAN',L.x,L.y-Math.max(14,projR(L.d,astR(T)))-10)}}}
  if(vF(P,'blScan'))for(const a of s.ast){if(a===T||!((a.scanT||0)>W.t)||d3(a,p)>2200)continue;for(const q of blPts(a)){const L=proj(q.x,q.y,q.z);if(L.behind)continue;c.strokeStyle='rgba(240,178,74,.5)';c.beginPath();c.arc(L.x,L.y,Math.max(3,projR(L.d,blWin(P,a))),0,TAU);c.stroke()}}
  for(const ch of s.charges||[]){if(ch.o!==blKey(P))continue;const L=proj(ch.x,ch.y,ch.z);if(L.behind)continue;c.fillStyle=ch.q==='on'?'#7ad9a7':ch.q==='near'?'#f0b24a':'#ff5d4f';c.beginPath();c.arc(L.x,L.y,3.5,0,TAU);c.fill()}
  for(const cl of s.clouds||[]){const L=proj(cl.x,cl.y,cl.z);if(L.behind)continue;const rr=Math.max(8,projR(L.d,cl.chunk?cl.cr+6:cl.r));c.strokeStyle='rgba(122,217,167,.85)';
    if(cl.chunk){const k=Math.max(4,rr*.35);c.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.moveTo(L.x+sx*rr,L.y+sy*(rr-k));c.lineTo(L.x+sx*rr,L.y+sy*rr);c.lineTo(L.x+sx*(rr-k),L.y+sy*rr)}c.stroke()}
    else{c.setLineDash([3,5]);c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();c.setLineDash([])}
    c.fillStyle='#7ad9a7';c.fillText(`${cl.scrap?'SALVAGE':cl.chunk?'ORE CHUNK':'ORE CLOUD'} ${oreTotal(cl)} T · ${Math.max(0,Math.ceil(cl.until-S.T))} S`,L.x,L.y-rr-6)}
  const mine=(s.charges||[]).filter(ch=>ch.o===blKey(P));let warn='';if(mine.length){let lim=BL.blastR,near=1e9;for(const ch of mine){const TT=blTgt(s,ch);if(!TT)continue;if(TT.wpt&&TT.k==='core')lim=BL.coreR;near=Math.min(near,d3(p,TT))}if(near<lim)warn=`INSIDE BLAST RADIUS: MOVE ${lim} M CLEAR · ${Math.round(near)} M`}
  c.textAlign='center';c.font='700 13px "Saira Semi Condensed",sans-serif';c.fillStyle='#f0b24a';
  c.fillText(`CHARGES ${P.blN||0}/${blCap(P)}${P.blT>0?` · RELOAD ${Math.ceil(P.blT)} S`:''}${mine.length?` · ${mine.length} SET (3 DETONATE · 4 CANCEL)`:''}`,VW/2,VH-232);
  if(warn){c.fillStyle='#ff5d4f';c.fillText(warn,VW/2,VH-250)}c.restore()}

function vecMass(o){const v=invVec(o);let m=0;for(const e of RAWS)m+=v[e];return m}   // raw-material equivalent of anything, components included
// a third intact as components, the rest raw: components are broken down or built up by their own recipes, so the ledger stays exact
function wreckMix(o){const T=vecMass(o);if(!T)return o;const isC=k=>!RAWS.includes(k),cm=()=>{let m=0;for(const k in o)if(isC(k))m+=vecMass({[k]:o[k]});return m};
  let g=0;while(cm()>T*WRECK_COMP+4&&g++<4000){const k=Object.keys(o).find(k=>isC(k)&&o[k]>0&&ITEMS[k]&&ITEMS[k].recipe);if(!k)break;inv.take(o,k,1);inv.addAll(o,ITEMS[k].recipe)}
  const ord=['wire','plate','coil'];let i=0;g=0;
  while(cm()<T*WRECK_COMP&&g++<6000){let ok=false;for(let j=0;j<3&&!ok;j++){const k=ord[(i+j)%3],r=ITEMS[k].recipe;if(haveIn(r,[o])){takeFrom(r,[o]);inv.add(o,k,1);ok=true;i=(i+j+1)%3}}if(!ok)break}
  return o}
// carve the contents into salvage points: the core takes the conduit, rare ores and forge parts (and some xenocrystal from a
// Brood hulk); the drive block the coil and copper; the bulkheads plate and iron; the cargo bays everything else
function wreckPts(o,brood){const P=['core','drive','bulk','bulk','cargo','cargo'].map(k=>({k,ore:{}}));
  const home=k=>k==='wire'||k==='au'||k==='nu'||k==='core'||k==='lattice'?[0]:k==='coil'||k==='cu'?[1]:k==='plate'||k==='fe'?[2,3]:[4,5];
  for(const k in o){let n=o[k];if(brood&&k==='xc'){const c=Math.round(n*.3);if(c){inv.add(P[0].ore,k,c);n-=c}}const h=home(k);
    for(let i=0;i<h.length&&n>0;i++){const m=i===h.length-1?n:Math.ceil(n/(h.length-i));inv.add(P[h[i]].ore,k,m);n-=m}}
  const tot=P.reduce((a,p)=>a+oreTotal(p),0);
  if(oreTotal(P[0])<tot*.12)for(const p of P.slice(1))for(const k in p.ore){if(RAWS.includes(k)&&oreTotal(P[0])>0)continue;const m=Math.floor(p.ore[k]*.25);if(m>0){inv.take(p.ore,k,m);inv.add(P[0].ore,k,m)}}
  return P.filter(p=>oreTotal(p)>0)}
const WPT_OFF={core:[0,.06,-.42],drive:[0,0,-.78],bulk:[[0,.22,.34],[0,-.2,-.05]],cargo:[[.3,0,.16],[-.3,0,-.2]]};
function makeWreck(e){const s=S.sectors[W.sid],o={};inv.addAll(o,e.load);inv.addAll(o,e.cargo);e.load={};e.cargo={};if(!vecMass(o))return null;wreckMix(o);
  const R=e.st.radius*1.25,brood=e.side==='brood',pts=wreckPts(o,brood),q=qCopy(q0(),e.q),seen={};
  for(const p of pts){const L=WPT_OFF[p.k],n=seen[p.k]=(seen[p.k]||0)+1,off=Array.isArray(L[0])?L[n-1]||L[0]:L;qRot(q,off[0]*R,off[1]*R,off[2]*R,_bv1);
    Object.assign(p,{id:S.nextId++,wpt:1,x:Math.round(e.x+_bv1.x),y:Math.round(e.y+_bv1.y),z:Math.round(e.z+_bv1.z),heat:0,last:oreTotal(p),h0:oreTotal(p)})}
  const w={id:S.nextId++,cls:e.cls,mf:e.fac||e.side,side:e.side,name:(e.tok&&e.tok.name)||'capital ship',x:Math.round(e.x),y:Math.round(e.y),z:Math.round(e.z),q,R,born:S.T,until:S.T+WRECK_LIFE,pts};
  // the Brood smell it: scavengers come from the nearest Brood space, sooner and in greater numbers the closer it is
  const bh=broodHops(W.sid);if(bh<=3&&!brood)w.broodAt=S.T+[20,35,55,80][bh]+rnd(10);w.broodN=bh<=1?3:2;
  s.wrecks=s.wrecks||[];s.wrecks.push(w);
  const t=Math.round(vecMass(o));feed(`✕ Wreck of ${e.side==='brood'?'the Brood '+(e.cls==='carrier'?'Hive Ship':'Prowler'):w.name} in ${DEF[W.sid].name}: about ${fmt(t)} t of salvage, a third of it intact components. It breaks up in ${WRECK_LIFE/60} minutes.${w.broodAt?' The Brood will come for it.':''}`,'info');return w}
function broodHops(sid){let b=9;for(const d of SECTOR_DEFS){let o=sectorOwner(d.id);if(o==='brood'||d.kind==='hive'){const h=HOP[sid][d.id];if(h<b)b=h}}return b}
function wreckGone(s,w,why){for(const p of w.pts)if(oreTotal(p)){toDebris(s,p.ore);p.ore={};p.last=0}w.pts=[];s.wrecks=(s.wrecks||[]).filter(x=>x!==w);
  if(W&&S.sectors[W.sid]===s){if(W.tgt&&W.tgt.kind==='wpt'&&!wptsIn(s).includes(W.tgt.ref))W.tgt=null;if(!MUTE&&why!=='empty')fxBoom(w,w.R*.8,'#8a7f74')}}
// a reactor core that overheats: it blows, hurting everything close, and its contents scatter as debris
function coreBlow(s,w,p){const at={x:p.x,y:p.y,z:p.z};fxBoom(at,CORE_BLAST*.7,'#ff9a4a');fxBoom(at,CORE_BLAST*.4,'#ffe2b0');W.shake=Math.max(W.shake||0,.7);
  for(const e of W.ents.slice()){if(e.type!=='ship'||!e.alive)continue;const d=d3(e,at);if(d<CORE_BLAST)damageShip(e,CORE_DMG*(1-d/CORE_BLAST)+20,null,at,'blast')}
  toDebris(s,p.ore);p.ore={};p.last=0;feed(`✕ The reactor core of the ${w.name} wreck blew.`,'warn')}
// host / single player, every frame: core heat (from however much was just cut out of it, by anyone), Brood scavengers, emptied points
function wreckWorld(dt){const s=S.sectors[W.sid];if(!s.wrecks||!s.wrecks.length)return;const p=W.player;
  for(const w of s.wrecks.slice()){
    for(const pt of w.pts){const tot=oreTotal(pt);if(pt.k==='core'){const d=(pt.last||0)-tot;if(d>0)pt.heat+=d*Math.max(CORE_HEAT,1.5/(pt.h0||1));   // a small core heats faster: cutting it all out in one go always blows it
        pt.heat=Math.max(0,pt.heat-CORE_COOL*dt);
        if(pt.heat>=.6&&!pt.warn&&p&&d3(p,pt)<1200){pt.warn=1;flash('Reactor core heat critical: ease off the laser or it blows.',true);SFX.count&&SFX.count(false)}if(pt.heat<.4)pt.warn=0;
        if(pt.heat>=1&&tot>0)coreBlow(s,w,pt)}pt.last=oreTotal(pt)}
    w.pts=w.pts.filter(pt=>oreTotal(pt)>0);if(!w.pts.length){wreckGone(s,w,'empty');continue}
    if(w.broodAt&&S.T>=w.broodAt){w.broodAt=0;let n=0;for(let i=0;i<(w.broodN||2);i++){const e=spawnNPC('miner','brood');if(e){const g=pick(GATES[W.sid]);e.x=g.x*.92;e.y=g.y*.92;e.z=g.z*.92;e.ai.ast=pick(w.pts);e.scav=1;n++}}
      if(n&&p&&!S.player.docked)feed(`✕ Brood scavengers (${n}) have come through the gate for the ${w.name} wreck.`,'warn')}
    if(Math.random()<dt*.8&&!MUTE){const pt=pick(w.pts);fxSpark(pt,'#ffb066',2)}}}
function killShip(e,src,at){if(e.role==='limpet'){limpetShot(e,src,at);return}
  e.alive=false;e.killed=true;if(e.sortie||e.sortieEv){const ev=S.events.find(v=>v.id===(e.sortie||e.sortieEv));if(ev){if(e.sortie&&ev.stage==='gather')ev.pending=Math.max(0,ev.pending-1);if(e.sortieEv){const i=ev.craft.indexOf(e.cls);if(i>=0)ev.craft.splice(i,1);ev.lost++}}}if((e.role==='trader'||e.role==='hauler')&&src==='pirate'&&FAC_IDS.includes(e.side)){S.raidT=S.raidT||{};S.raidT[e.side]=S.T}if(e.role==='trader'&&e.home.startsWith('trader:'))traderLost(e);if(e.role==='scout'&&e.home.startsWith('scout:')){const id=e.home.split(':')[1];S.scouts=S.scouts.filter(t=>String(t.id)!==id);if(e.side===S.player.faction)feed(`Our scout was shot down in ${DEF[W.sid].name}.`,'bad')}fxBoom(e,e.st.radius*2.6,e.isPlayer?PLAYER_COL:sideCol(e.side));
  if(e.drones)for(const d of e.drones)if(d.alive){d.role='leave';d.mom=null}
  if(e.side==='player'&&e.role==='drone')feed('One of your guard drones was destroyed.','bad');
  if(e.pickets)for(const p of e.pickets)if(p.alive){p.mom=null;p.role='leave'}
  if(e.role==='frigate'&&e.tok){if(S.unb&&e.tok.call&&e.tok.call.until>S.T){const f=sideNorm(src),by=e.tok.call.by;if(FAC_IDS.includes(f)){const go=()=>heatAdd(f,10,`your called ${capName(e.tok)} ${e.tok.name} was lost`);if(NET.on&&by&&by!=='me')runAs(by,go);else go()}}capPingPay(e.tok);S.frigates=S.frigates.filter(x=>x!==e.tok);{const T=e.tok;if(T.load&&Object.keys(T.load).length){inv.addAll(e.load,T.load);T.load={}}if(T.store){inv.addAll(e.load,T.store);T.store={}}if(T.fab){inv.addAll(e.load,T.fab.kit||{});T.fab=null}}   // its store and the craft half-built aboard spill with the rest of its hold
    fxBoom(e,320,'#ffe2b0');fxBoom(e,200,sideCol(e.side));W.shake=Math.max(W.shake||0,.6);feed(`${e.side==='player'?'Your '+capName(e.tok):e.side==='brood'?'The Brood '+broodCap(e.tok):sideName(e.side)+' '+capName(e.tok)} ${e.tok.name} has been destroyed!`,friendSide(e.side)?'bad':'good')}
  if(e.escortG){e.escortG.escort=null;for(const m of grpAlive(e.escortG))if(m.role==='escort'){m.role='patrol';m.ai.retireAt=W.t+40}if(friendSide(e.side))feed(`${FACTIONS[e.side].short} freighter lost in ${DEF[W.sid].name}${e.escortG?' despite its escort':''}.`,'bad')}
  else if(e.role==='hauler'&&friendSide(e.side))feed(`An unescorted ${FACTIONS[e.side].short} freighter was destroyed in ${DEF[W.sid].name}.`,'bad');
  const s=S.sectors[W.sid];
  if(e.isPlayer){playerDeath();return}
  if(e.rp){rpDeath(e);return}
  if(e.role==='frigate'&&e.tok&&makeWreck(e)){{const _i=W.ents.indexOf(e);if(_i>=0)W.ents.splice(_i,1)}if(W.tgt&&W.tgt.ref===e)W.tgt=null;payKill(e,src,at);return}
  const crate={};for(const k in e.load){const m=Math.min(e.load[k],Math.floor(e.load[k]*.5+Math.random()*.6));if(m)crate[k]=m;const rest=e.load[k]-m;if(rest>0)toDebris(s,{[k]:rest})}
  inv.addAll(crate,e.cargo);e.load={};e.cargo={};
  if(Object.keys(crate).length)s.crates.push({id:S.nextId++,x:Math.round(e.x),y:Math.round(e.y),z:Math.round(e.z),inv:crate,until:S.T+300});
  {const _i=W.ents.indexOf(e);if(_i>=0)W.ents.splice(_i,1)}if(W.tgt&&W.tgt.ref===e)W.tgt=null;
  payKill(e,src,at)
}
function playerDeath(p0){apOn=false;if(S.unb)try{takeEnd()}catch(e){}
  if(S.player.convoy&&!NET.cl)convoyEnd(false,'your ship was destroyed');
  const p=p0||W.player,P=S.player,s=S.sectors[W.sid],crate={};
  inv.addAll(crate,P.cargo);P.cargo={};P.rack=0;P.mslT=0;
  vrLose(P,crate,s);if(!shipBare(P)){shipStrip(P,crate);feed('Your ship\'s fitted upgrades were blown out into the wreck. Fly back and scoop the salvage before it drifts off (7 minutes).','bad')}
  if(!START_HULLS.includes(P.cls)&&!(S.unb&&UNB_START.includes(P.cls))&&CLASSES[P.cls]){const lost=P.cls,to=starterFor(lost),nm=FAC(P.faction).hulls[lost];inv.addAll(crate,P.hullInv||{});P.hullInv={};
    const nc=CLASSES[to].drones||0;P.bay=P.bay||{};if((P.bay.drone||0)>nc){inv.add(crate,'drone',P.bay.drone-nc);P.bay.drone=nc}
    P.cls=to;P.rack=0;P.mslT=0;P.swarm=0;P.swT=0;if(p0)p0.cls=to;
    feed(`Your ${nm} was destroyed. You relaunch in a ${FAC(P.faction).hulls[to]} ${CLASSES[to].name}; another ${nm} costs ${fmt(hullPrice(lost))} cr at a core station Shipyard.`,'bad')}
  if(Object.keys(crate).length)s.crates.push({id:S.nextId++,x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z),inv:crate,until:S.T+420});
  if(!p0){W.dead=W.t;$('deathMsg').hidden=false;W.tgt=null}
}
function respawn(){if(W&&W.player){W.player.landed=null;W.player.stealth=false;W.player.maskR=0;W.player.masked=false;W.player.boot=0}if(NET.cl){clientRespawn();return}
  $('deathMsg').hidden=true;const P=S.player;exitSector();
  const st=shipStats(P.faction,P.cls,P.tiers,P.tune);P.hull=st.hull;P.shield=st.sCap;P.energy=st.eCap;P.sector=FAC_HOME(P.faction);P.x=P.y=P.z=0;P.vx=P.vy=P.vz=0;P.docked='station';droneTopUp(P,P.vault,P.faction);
  enterSector(P.sector);openDock();save();
}
function damageStation(E,dmg,by,kind,src){if(E&&E.fac==='brood'&&E.rec){const k=src&&src.rp?src.rp:by==='player'?'me':null;if(k){(E.rec.pHits=E.rec.pHits||{})[k]=S.T;E.rec.pHit=W.t}}if(by==='player'&&W.player&&d3(E,W.player)<3000)musHit(((E.shield||0)>0)||((E.rec&&E.rec.shield)||0)>0);if(NET.cl||(E.fac==='neutral'&&by!=='brood'))return;if(by&&E.fac&&hostile(by==='player'?S.player.faction:by,E.fac))distressCall(W.sid,E.name,E.fac,by==='player'?S.player.faction:by);if(kind!=='torpedo'&&kind!=='capital'){dmg*=capChip(kind);if(by==='player'&&W.t-(W.immT||-99)>8){W.immT=W.t;flash('Guns and missiles only chip station armour. It takes a lot of them; torpedoes do the real damage.',true)}}
  dmg*=limpetK(E.rec,by);E.lastHit=W.t;if(by)E.lastHitBy=by;const R=E.rec;
  if(!E.offline){E.shield-=dmg;if(E.shield>0)return;dmg=-E.shield;E.shield=0;E.offline=W.t+20;fxBoom(E,150,'#8fc8ff');const mine=friendSide(E.fac);feed(mine?`${E.name}'s shield is down! Its turrets are offline and the hull is exposed.`:`${E.name}'s shield collapsed. Its turrets are offline and the hull is exposed.`,mine?'bad':'warn')}
  if(!R||dmg<=0)return;R.hull-=dmg;if(Math.random()<.3)fxSpark({x:E.x+rnd(-60,60),y:E.y+rnd(-60,60),z:E.z+rnd(-60,60)},'#ffcf8a',3);
  if(R.hull<=0&&R.kind==='depot'&&R.owner!=='brood'&&E.lastHitBy&&E.lastHitBy!=='brood'&&FACTIONS[sideNorm(E.lastHitBy)]){const sd=sideNorm(E.lastHitBy),g=garrison(R),md=sortieMode(R.sid,sd),n=capLoads(R.sid,sd);if(md==='cap'&&n<g&&!siegeAssault(R.sid,sd,g)){R.hull=1;return}if(md!=='raze'&&n>=g){useLoads(R.sid,sd,g,R);captureDepot(R.sid,sd);return}if(md!=='raze'&&siegeAssault(R.sid,sd,g,true)){captureDepot(R.sid,sd);return}if(md!=='raze'&&n>0){R.hull=1;return}}
  if(R.hull<=0&&R.kind==='free'){razeStation(R.sid,'brood');return}
  if(R.hull<=0){if(R.kind!=='depot'){R.hull=1;if(W.t+40>E.offline){if(R.sid==='wr'&&S.unb)havenBattered();E.offline=W.t+40;feed(`${E.name} is crippled: dark for 40 s.`,friendSide(E.fac)?'bad':'warn')}}else{if(R.owner==='brood'&&R.kind==='depot'){const young=S.T-(R.built==null?-1e9:R.built)<CONTAIN.youngT;for(const k in R.pHits||{}){if(S.T-R.pHits[k]>=60||S.T<R.pHits[k])continue;const P=isMe(k)?S.player:S.pilots&&S.pilots[k];if(!P||!FAC_IDS.includes(P.faction))continue;const c=payKey(k,P.faction,young?CONTAIN.young:CONTAIN.node);if(c)keyFeed(k,`Containment order: Bloom Node burned${young?' before it rooted':''}. +${fmt(c)} cr.`,'good')}}razeStation(R.sid,E.lastHitBy)}}}
// a razed depot leaves its frames as drifting debris; anything stored in it spills out as salvage
// a frigate that breaks a faction depot takes it over: new flag, a third of its hull back, half its store to the captor
function captureDepot(sid,side){const R=S.stations[sid];if(!R||R.owner==='neutral')return;if(side==='player')side=S.player.faction;const prev=R.owner;if(!FACTIONS[side]||prev===side)return;
  R.owner=side;R.name=stationName(side,R.kind,sid);R.hull=Math.round(R.hMax*.33);R.shield=0;const take={};for(const k in R.stock){const m=Math.floor(R.stock[k]/2);if(m)take[k]=inv.take(R.stock,k,m)}inv.addAll(S.econ.stock[side],take);if(storeOf(R)===R.stock){inv.addAll(R.stock,R.store||{});R.store={}}else{inv.addAll(dStore(R),R.stock);R.stock={}}
  if(S.distress)S.distress=S.distress.filter(d=>d.sid!==sid);
  const pf=S.player.faction;if(side===pf||prev===pf||covered(sid))feed(side===pf?`Our assault ships have taken the depot in ${DEF[sid].name}. It flies the ${FACTIONS[side].short} flag now.`:prev===pf?`The depot in ${DEF[sid].name} has been captured by ${sideName(side)} assault ships.`:`${sideName(side)} assault ships captured the depot in ${DEF[sid].name}.`,side===pf?'good':prev===pf?'bad':'news');
  const w=WORLDS[sid];if(w)inW(w,()=>{const E=W.stationEnt;if(E&&E.rec===R){if(W===LW&&S.player.docked==='station')undock();if(NET.host)netKickDocked(sid,'station',side);fxBoom(E,200,sideCol(side));const i=W.ents.indexOf(E);if(i>=0)W.ents.splice(i,1);W.stationEnt=null;const N=addStationEnt(R);N.shield=0;N.offline=W.t+20;if(W.tgt&&W.tgt.ref===E)W.tgt={kind:'station',ref:N}}})}
function razeStation(sid,by){const R=S.stations[sid];if(!R||(R.owner==='neutral'&&by!=='brood'))return;const s=S.sectors[sid];if(R.owner==='neutral'){S.fpDown=S.fpDown||{};S.fpDown[sid]=S.T;S.contracts=S.contracts.filter(c=>c.st!==sid)}{const ft=R.owner==='brood'&&R.gut?brFeast(s,R):0;if(ft&&W&&W.sid===sid)SFX.feast();if(ft&&(covered(sid)||W&&W.sid===sid))feed(`The ${R.name}'s gut spills: ${fmt(ft)} t of ore in dense, rich rock where it stood.`,'good')}toDebris(s,R.fort);R.fort={};if(R.store){toDebris(s,R.store);R.store={}}wkRaze(sid);for(const P of allPilots()){if(P.vaults&&P.vaults[sid]){toDebris(s,P.vaults[sid]);delete P.vaults[sid]}if(P.vaultAt===sid){toDebris(s,P.vault);P.vault={};P.vaultAt=undefined}}
  if(Object.keys(R.stock).length){s.crates.push({id:S.nextId++,x:Math.round(R.x),y:Math.round(R.y),z:Math.round(R.z),inv:R.stock,until:S.T+400});R.stock={}}
  delete S.stations[sid];
  const who=by?sideName(by):'attackers',mine=friendSide(R.owner);if(R.owner==='neutral')allFeed(`⚠ ${R.name} has been devoured by the Brood. Its market, requests and refits are gone until the Compact can rebuild.`,'bad');else if(mine||covered(sid))feed(by==='brood'?`${R.name} has been devoured by the Brood.`:`${R.name} was destroyed by ${who}.`,mine?'bad':R.owner==='brood'?'good':'news');
  if(WORLDS[sid]&&WORLDS[sid]!==W)return inW(WORLDS[sid],()=>razeStationFx(sid,R));razeStationFx(sid,R)}
function razeStationFx(sid,R){if(W&&W.sid===sid&&W.stationEnt&&W.stationEnt.rec===R){const E=W.stationEnt;if(W===LW&&S.player.docked==='station')undock();if(NET.host)netKickDocked(sid,'station');fxBoom(E,260,sideCol(R.owner));fxBoom(E,160,'#ffe2b0');const i=W.ents.indexOf(E);if(i>=0)W.ents.splice(i,1);W.stationEnt=null;if(W.tgt&&W.tgt.ref===E)W.tgt=null;
    for(const e of W.ents)if(e.npc&&e.role==='strike'&&e.ai.siege)e.role='leave'}}
function damageOutpost(E,dmg,by){if(NET.cl)return;dmg*=limpetK(E.o,by);
  const o=E.o;if(o.owner)distressCall(W.sid,o.name,o.owner,null);E.lastHit=W.t;if(o.shield>0){const a=Math.min(o.shield,dmg);o.shield-=a;dmg-=a}
  if(dmg>0){o.hull-=dmg;fxSpark({x:E.x+rnd(-50,50),y:E.y+rnd(-30,30),z:E.z+rnd(-50,50)},'#ffcf8a',3)}
  if(o.hull<=0&&!o.breached){o.hull=0;o.breached=S.T;o.shield=0;fxBoom(E,160,sideCol(o.owner));
    feed(o.owner==='player'?`Your ${o.name} has been breached! Hold the ring or lose it.`:`${o.name}'s defenses are down. Its ring is open for a claim.`,o.owner==='player'?'bad':'warn')}
}

// ============================================================ NPC AI
// ---- laden handling: a hold full of ore or freight makes a ship heavy. Haulers, miners and constructors feel it most:
// at a full hold they turn and answer the stick at about half rate, accelerate and brake slower, and slide wide through turns.
const HEAVY_CLS=new Set(['skiff','prospector','dredger','courier','freighter','bulker','constructor']);
function ladenOf(e){const cg=e.isPlayer?(S.player&&S.player.cargo):e.cargo;if(!cg||!e.st||!e.st.cargo)return 0;let m=0;for(const k in cg)m+=mass(k)*cg[k];return clamp(m/e.st.cargo,0,1)}
const H_ONE={L:0,turn:1,ag:1,thr:1,spd:1,lat:1,kick:1};
function handling(e){const L=Math.max(ladenOf(e),(e.st&&e.st.ladenMin)||0)*((e.st&&e.st.ladenK)||1);if(!L)return H_ONE;return HEAVY_CLS.has(e.cls)?{L,turn:1-.55*L,ag:1-.5*L,thr:1-.45*L,spd:1-.15*L,lat:1-.55*L,kick:1-.5*L}:{L,turn:1-.18*L,ag:1-.15*L,thr:1-.18*L,spd:1-.05*L,lat:1-.2*L,kick:1-.2*L}}
function steer(e,tx,ty,tz,dt,arrive,mul){const dx=tx-e.x,dy=ty-e.y,dz=tz-e.z,d=hyp(dx,dy,dz)||1,H=handling(e);let sp=e.st.maxSpd*(mul||1)*H.spd;if(arrive&&d<420)sp*=d/420;const dvx=dx/d*sp-e.vx,dvy=dy/d*sp-e.vy,dvz=dz/d*sp-e.vz,dv=hyp(dvx,dvy,dvz)||1;const acc=Math.min(e.st.thrust*H.thr,dv/dt);e.vx+=dvx/dv*acc*dt;e.vy+=dvy/dv*acc*dt;e.vz+=dvz/dv*acc*dt;e.thrusting=dv>25;return d}
function brake(e,dt){const v=hyp(e.vx,e.vy,e.vz);if(v<1)return;const acc=Math.min(e.st.thrust,v/dt);e.vx-=e.vx/v*acc*dt;e.vy-=e.vy/v*acc*dt;e.vz-=e.vz/v*acc*dt}
function faceDir(e,dx,dy,dz,dt){const L=hyp(dx,dy,dz);if(L<1e-6)return 0;dx/=L;dy/=L;dz/=L;qRot(e.q,0,0,1,_f);const ang=Math.acos(clamp(_f.x*dx+_f.y*dy+_f.z*dz,-1,1));qRot(e.q,0,1,0,_u);qLook(dx,dy,dz,_u.x,_u.y,_u.z,_tq);qTowards(e.q,_tq,e.st.turn*handling(e).turn*dt);return ang}
const faceTo=(e,p,dt)=>faceDir(e,p.x-e.x,p.y-e.y,p.z-e.z,dt);
function findHostile(e,range){let best=null,bd=range;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e)continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;if(!hostile(e.side,o.side)&&!(S.unb&&o.rp&&e.side==='brood'))continue;if(S.unb&&o.rp&&FAC_IDS.includes(e.side)&&unbCoverP(S.pilots[o.rp],e.side))continue;const d=d3(o,e)*((o.role==='hauler'||o.tradeT&&o.tradeT.kind==='haul')&&(e.role==='raider'||e.role==='pirate')?.5:1)*(o.side==='brood'&&e.side!=='brood'?.6:1)*(e.side==='brood'?bloodScent(o):1)*(o.role==='frigate'?(isBmb(e.cls)?.35:1.6)*(o.tok&&capPinged(o.tok,sideNorm(e.side))?.4:1):1)*(o.role==='limpet'?.5:1);if(d<bd){bd=d;best=o}}return best}
function bomberRun(e,OE,dt){const ai=e.ai,dx=OE.x-e.x,dy=OE.y-e.y,dz=OE.z-e.z,d=hyp(dx,dy,dz)||1;
  if(!ai.stand){const r=rdir(.8);ai.stand={x:OE.x+r.x*1500,y:OE.y+r.y*1500,z:OE.z+r.z*1500}}
  if(d>1700||d<1100)steer(e,ai.stand.x,ai.stand.y,ai.stand.z,dt,true,.8);else brake(e,dt*.5);
  const err=faceTo(e,OE,dt);
  if(err<.22&&d<TORP_RANGE)ai.lock=Math.min(1,(ai.lock||0)+dt/2.6);else ai.lock=Math.max(0,(ai.lock||0)-dt*.5);
  if(ai.lock>=1&&(ai.tcd||0)<=W.t&&(e.load.torpedo||0)>0){inv.take(e.load,'torpedo',1);launchMissile(e,OE,e.tier,'torpedo');ai.lock=.4;ai.tcd=W.t+rnd(4,6)}
  if(err<.09&&d<SHOT_RANGE)fire(e)}
function fight(e,t,dt){
  const ai=e.ai;if(ai.lt!==t){ai.lt=t;ai.lead=rnd(.6,1.25)}
  if(e.side==='pirate'&&e.npc&&t.type==='ship'){if(jamDark(t)){e.jamMode=false;jamTake(e,t,dt);return}e.jamMode=t.role!=='frigate'&&!t.drone&&t.role!=='drone'&&t.shield<=t.st.sCap*.02&&!((t.jamHard||0)>W.t);if(e.jamMode)e.wpn='kinetic'}
  // a pilot-grade AI (e.flares: duel tests) flares incoming missiles the way a player would: 30 energy, 5 s apart, and it
  // saves them for missiles and torpedoes rather than wasting them on a swarm
  if(e.flares&&(ai.flareAt||0)<=W.t&&e.energy>=30&&W.missiles.some(m=>m.tgt===e&&m.kind!=='swarm'&&d3(m,e)<700)){e.energy-=30;deployFlares(e);ai.flareAt=W.t+5}const dx=t.x-e.x,dy=t.y-e.y,dz=t.z-e.z,d=hyp(dx,dy,dz)||1,lp0=e.wpn==='laser'?t:leadPoint(e,t,e.st.shotSpd||SHOT_SPD),lp={x:t.x+(lp0.x-t.x)*ai.lead,y:t.y+(lp0.y-t.y)*ai.lead,z:t.z+(lp0.z-t.z)*ai.lead};
  const amp=.03-.006*((e.aimT||e.tier||1)-1);ai.jx=(ai.jx||0)*.97+rnd(-amp,amp);ai.jy=(ai.jy||0)*.97+rnd(-amp,amp);if(!ai.bT||W.t>ai.bT){ai.bOn=!ai.bOn;ai.bT=W.t+(ai.bOn?rnd(.7,1.4):rnd(.8,1.6))}
  const err=faceDir(e,lp.x-e.x+ai.jx*d,lp.y-e.y+ai.jy*d,lp.z-e.z,dt);
  const want=t.type==='outpost'||t.type==='station'?560:400;
  const ax=ai.ax;let px=dy/d*ax.z-dz/d*ax.y,py=dz/d*ax.x-dx/d*ax.z,pz=dx/d*ax.y-dy/d*ax.x;const pl=hyp(px,py,pz)||1;px/=pl;py/=pl;pz/=pl;
  steer(e,t.x-dx/d*want+px*260,t.y-dy/d*want+py*260,t.z-dz/d*want+pz*260,dt,false,.85);
  if(ai.bOn||e.jamMode||t.type==='outpost'||t.type==='station'||t.kind==='torpedo'){if(e.wpn==='laser'){if(err<.07&&d<LASER_RANGE&&e.energy>e.st.eCap*.2)fireLaser(e)}else if(err<.09&&d<SHOT_RANGE)fire(e)}
  if(t.type==='ship'&&t.role==='frigate'&&(e.load.torpedo||0)>0&&isBmb(e.cls)&&d<1200&&(ai.tcd||0)<=W.t&&err<.15){inv.take(e.load,'torpedo',1);launchMissile(e,t,e.tier,'torpedo');ai.tcd=W.t+12}
  if((e.load.swarm||0)>0&&t.type==='ship'&&d<1700&&err<.35&&(ai.scd||0)<=W.t){inv.take(e.load,'swarm',1);launchSwarm(e,t,e.tier);ai.scd=W.t+18}
  if((e.load.missile||0)>0&&t.type==='ship'){if(ai.mcd===undefined)ai.mcd=rnd(2,5);ai.mcd-=dt*(t.shield<=t.st.sCap*.05?3:1);
    if(err<.24&&d<2200)ai.lock=Math.min(1,(ai.lock||0)+dt/1.8);else ai.lock=Math.max(0,(ai.lock||0)-dt);
    if(ai.lock>=1&&ai.mcd<=0){inv.take(e.load,'missile',1);launchMissile(e,t,e.tier);if(e.side==='pirate'&&e.jamMode){const mm=W.missiles[W.missiles.length-1];if(mm&&mm.src===e){mm.harp=1;mm.col='#b7c6ff'}}ai.lock=0;ai.mcd=rnd(8,14);if(t.isPlayer)flash('Missile launch detected! Press B for flares.',true)}}
}

// ============================================================ missiles & countermeasures
function lockable(t){if(!t||!validTgt(t))return null;const r=t.ref;if(t.kind==='ship'&&hostile('player',r.side))return r;if(t.kind==='outpost'&&r.o.owner&&hostile('player',r.o.owner)&&!r.o.breached)return r;if(t.kind==='station'&&hostile('player',r.fac)&&W.stationEnt===r&&CLASSES[S.player.cls].torp)return r;if(t.kind==='works'&&hostile('player',r.fac)&&CLASSES[S.player.cls].torp)return r;return null}
function updateLock(dt){const L=W.lock,P=S.player,p=W.player,T=lockable(W.tgt);if(p&&p.stealth){L.p=0;L.locked=false;return}
  if(L.ref!==T){L.ref=T;L.p=0;L.locked=false}
  if(!T||P.rack<=0){L.p=0;L.locked=false;return}
  qRot(p.q,0,0,1,_f);const dx=T.x-p.x,dy=T.y-p.y,dz=T.z-p.z,d=hyp(dx,dy,dz)||1;let ang=Math.acos(clamp((_f.x*dx+_f.y*dy+_f.z*dz)/d,-1,1));
  if(T.type==='ship'){const lp=leadPoint(p,T,p.st.shotSpd||SHOT_SPD),lx=lp.x-p.x,ly=lp.y-p.y,lz=lp.z-p.z,ll=hyp(lx,ly,lz)||1;ang=Math.min(ang,Math.acos(clamp((_f.x*lx+_f.y*ly+_f.z*lz)/ll,-1,1)))}
  const RNG=CLASSES[P.cls].torp?TORP_RANGE:MISSILE_RANGE,ok=L.locked?(ang<.5&&d<RNG*1.25):(ang<LOCK_CONE&&d<RNG);
  if(ok&&!L.locked&&W.t-(L.bT||0)>.5-.35*L.p){L.bT=W.t;SFX.beep(150+L.p*60)}
  if(ok){if(!L.locked){L.p+=dt/(lockTime(P.tiers.weapon,CLASSES[P.cls].torp)*vK(P,'lockK'));if(L.p>=1){L.p=1;L.locked=true;SFX.beep(220,1.4);setTimeout(()=>SFX.beep(220,1.4),140);flash(CLASSES[P.cls].torp?'Torpedo lock. Press C to launch.':'Missile lock. Press C or middle-click to launch.')}}}
  else{L.locked=false;L.p=Math.max(0,L.p-dt*.5)}
  L.d=d}
function fireMissile(){if(!W||!running||S.player.docked||W.dead||W.docking)return;if(W.player&&jamDark(W.player)){flash('Jammed: launchers dark.',true);return}if(S.unb&&W.player&&W.player.jamMode&&S.player.cls==='plunderer'){if(fireJamTorp())return}if(W.player&&W.player.stealth)return;if(W.player&&(W.player.landed||(W.player.boot&&W.t<W.player.boot))){flash(W.player.landed?'Systems are powered down. Lift off first (E).':'Systems rebooting…',true);return}const P=S.player,L=W.lock;
  if(P.rack<=0){flash(`${CLASSES[P.cls].torp?'Torpedoes':'Missiles'} reloading: ready in ${Math.ceil(P.mslT||0)} s.`,true);return}
  if(!L.locked||!L.ref){flash(lockable(W.tgt)?'No lock yet. Keep the target inside the lock ring.':'Target a hostile first (T, Q or G).',true);return}
  if(W.mslCd>0)return;W.mslCd=CLASSES[P.cls].torp?1.2:.5;const n=CLASSES[P.cls].twin?Math.min(2,P.rack):1;P.rack-=n;if(NET.cl){netSend({t:'msl',tg:netTid(L.ref),k:'m',n});SFX.missile(1,!!CLASSES[P.cls].torp)}else{for(let i=0;i<n;i++)launchMissile(W.player,L.ref,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0);if(S.unb&&W.player.jamMode){SFX.harpoon();for(let i=1;i<=n;i++){const mm=W.missiles[W.missiles.length-i];if(mm&&mm.src===W.player){mm.harp=1;mm.col='#b7c6ff'}}}}unbShot()}
function launchMissile(e,tgt,tier,kind,ox,free){kind=kind||'missile';const tp=kind==='torpedo';qRot(e.q,0,0,1,_f);qRot(e.q,0,1,0,_u);qRot(e.q,1,0,0,_r);const r=e.st.radius,o=(ox||0)*r*.85,fx=_f.x,fy=_f.y,fz=_f.z,ux=_u.x+_r.x*o/(r*.6||1),uy=_u.y+_r.y*o/(r*.6||1),uz=_u.z+_r.z*o/(r*.6||1),kick=tp?90:170;
  if(tp&&tgt&&tgt.role==='frigate')stat('torpFired');
  W.missiles.push({kind,x:e.x+fx*r*.4-ux*r*.6,y:e.y+fy*r*.4-uy*r*.6,z:e.z+fz*r*.4-uz*r*.6,vx:e.vx+fx*kick-ux*40,vy:e.vy+fy*kick-uy*40,vz:e.vz+fz*kick-uz*40,side:e.side,src:e,tgt,ttl:MK[kind].ttl,dmg:tp?torpDmg(tier):missileDmg(tier)*((e.st&&e.st.mslK)||1),hp:tp?110:0,inv:e.isPlayer||e.rp||free?{}:{[kind]:1},incend:!!(e.st&&e.st.incend),col:e.isPlayer?PLAYER_COL:sideCol(e.side),smoke:0,checked:false});
  fxSpark(e,'#ffd9a0',tp?8:4);SFX.missile(e.isPlayer?1:vAt(e)*.8,tp);
  if(tp&&tgt&&tgt.type==='outpost'&&(tgt.o.owner==='player'||tgt.o.owner===S.player.faction)&&!e.isPlayer&&W.t-(W.torpWarn||-9)>6){W.torpWarn=W.t;feed(`Torpedoes inbound on ${tgt.o.name}! Shoot them down.`,'bad')}}
// a swarm pod splits into eight darting micro-missiles: most chase the target, the rest whoever flies near it
function launchSwarm(e,tgt,tier){qRot(e.q,0,0,1,_f);qRot(e.q,0,1,0,_u);qRot(e.q,1,0,0,_r);const r=e.st.radius,near=W.ents.filter(o=>o.type==='ship'&&o.alive&&o!==tgt&&hostile(e.side,o.side)&&d3(o,tgt)<700);
  for(let i=0;i<SWARM_N;i++){const a=i/SWARM_N*TAU,sx=Math.cos(a),sy=Math.sin(a),T=i<5||!near.length?tgt:near[i%near.length];
    W.missiles.push({kind:'swarm',x:e.x+_f.x*r*.3+_r.x*sx*r*.6+_u.x*sy*r*.6,y:e.y+_f.y*r*.3+_r.y*sx*r*.6+_u.y*sy*r*.6,z:e.z+_f.z*r*.3+_r.z*sx*r*.6+_u.z*sy*r*.6,
      vx:e.vx+_f.x*120+(_r.x*sx+_u.x*sy)*190,vy:e.vy+_f.y*120+(_r.y*sx+_u.y*sy)*190,vz:e.vz+_f.z*120+(_r.z*sx+_u.z*sy)*190,side:e.side,src:e,tgt:T,ttl:MK.swarm.ttl+rnd(-.4,.4),dmg:swarmDmg(tier),hp:0,inv:i||e.isPlayer||e.rp?{}:{swarm:1},col:e.isPlayer?'#ff8fc0':sideCol(e.side),smoke:0,checked:false,wob:rnd(TAU)})}
  fxSpark(e,'#ffc0de',10);SFX.missile(e.isPlayer?1:vAt(e)*.8,false);setTimeout(()=>SFX.missile(e.isPlayer?.7:vAt(e)*.5,false),90);
  if(tgt.isPlayer)flash('SWARM LAUNCH! Eight micro-missiles inbound: flares (B) and boost.',true)}
function fireSwarm(){if(!W||!running||S.player.docked||W.dead)return;if(W.player&&jamDark(W.player))return;if(W.player&&(W.player.landed||W.player.stealth||(W.player.boot&&W.t<W.player.boot)))return;const P=S.player,p=W.player;
  if(!CLASSES[P.cls].swarm){flash('Only Heavy Fighters, Bombers, Heavy Bombers and Advanced Scouts have swarm launchers.',true);return}
  if(!(P.swarm>0)){flash(`Swarm launcher reloading: ready in ${Math.ceil(P.swT||0)} s.`,true);return}
  const T=W.tgt&&W.tgt.kind==='ship'&&validTgt(W.tgt)&&hostile('player',W.tgt.ref.side)?W.tgt.ref:null;if(!T){flash('Target a hostile ship first (T, Q or G).',true);return}
  qRot(p.q,0,0,1,_f);const dx=T.x-p.x,dy=T.y-p.y,dz=T.z-p.z,d=hyp(dx,dy,dz)||1;if(d>2600){flash('Out of swarm range (2.6 km).',true);return}
  if(Math.acos(clamp((_f.x*dx+_f.y*dy+_f.z*dz)/d,-1,1))>.7){flash('Point roughly at the target to launch a swarm.',true);return}
  if((W.swCd||0)>W.t)return;W.swCd=W.t+2.5;P.swarm--;if(NET.cl)netSend({t:'msl',tg:netTid(T),k:'s'});else launchSwarm(p,T,P.tiers.weapon);flash('Swarm away.')}
function stat(k,n){if(W){W.stats=W.stats||{};W.stats[k]=(W.stats[k]||0)+(n===undefined?1:n)}}
function killTorp(m,bySide){if(NET.cl)return;const i=W.missiles.indexOf(m);if(i<0)return;if(m.tgt&&m.tgt.role==='frigate')stat('torpShotDown');W.missiles.splice(i,1);toDebris(S.sectors[W.sid],m.inv);fxBoom(m,30,'#ffcf5a');if(bySide==='player')feed('Torpedo intercepted.','good')}
function missileTgtValid(T){if(!T)return false;if(T.decoy)return T.life>0;if(T.masked&&!T.maskR)return false;   // stealth and lurkers keep a missile that's already inside their hidden radius
if(T.type==='station')return W.stationEnt===T;if(T.type==='ship')return T.alive&&W.ents.includes(T)&&!(T.isPlayer&&(S.player.docked||W.dead));if(T.type==='outpost')return!!T.o.owner&&!T.o.breached;if(T.type==='works')return!!(W.works&&W.works.includes(T));return false}
// torpedoes are siege weapons: their blast is built to crack hulls the size of a capital ship or a station, and a small ship
// takes only TORP_SMALL of it, so a bomber can't torpedo its way through a dogfight
const TORP_SMALL=.3;
function detonate(m,i){if(m.harp||m.jt){W.missiles.splice(i,1);toDebris(S.sectors[W.sid],m.inv||{});if(m.harp)harpHit(m);else jtHit(m);return}const s=S.sectors[W.sid],tp=m.kind==='torpedo',sw=m.kind==='swarm',BR=tp?110:sw?26:70;W.missiles.splice(i,1);fxBoom(m,tp?130:sw?28:55,m.col);if(tp)fxBoom(m,80,'#ffe2b0');
  for(const e of W.ents.slice()){if(e.type!=='ship'||!e.alive)continue;if(e.isPlayer&&(S.player.docked||W.dead))continue;if(!hostAt(m.side,m.src,e))continue;const d=d3(e,m);if(d<BR+e.st.radius){
    const bare=!tp&&e.shield<=e.st.sCap*.05,mul=bare?BARE_MUL:1;if(bare){fxSpark(e,'#ff9a6a',sw?3:8);if(m.side==='player'&&W.t-(W.bareT||-9)>1.5){W.bareT=W.t;flash('Shields down: missiles hit for ×1.8!')}}
    damageShip(e,(m.incend?(e.side==='brood'&&e.role==='builder'?1.5:.85):1)*m.dmg*mul*(d<e.st.radius+28?1:.45)*(tp&&e.role!=='frigate'?TORP_SMALL:1),m.side,m)}}
  if(m.tgt&&m.tgt.type==='station'&&W.stationEnt===m.tgt&&hostile(m.side,m.tgt.fac)&&d3(m.tgt,m)<240)damageStation(m.tgt,m.dmg*(tp?TORP_STATION:1)*(m.incend&&m.tgt.fac==='brood'?1.5:1),m.side,m.kind,m.src);
  if(W.works&&W.works.length)wkBlast(m,tp,BR);
  const T=m.tgt;if(T&&T.type==='outpost'&&!T.o.breached&&T.o.owner&&hostile(m.side,T.o.owner)&&d3(T,m)<(tp?230:170))damageOutpost(T,m.dmg*(tp?3:1.5),m.side);
  toDebris(s,m.inv)}
function deployFlares(e){const fl=[];for(let i=0;i<3;i++){const d=rdir(),f={decoy:true,x:e.x,y:e.y,z:e.z,vx:e.vx*.4+d.x*120,vy:e.vy*.4+d.y*120,vz:e.vz*.4+d.z*120,life:3.2};W.decoys.push(f);fl.push(f)}
  const chance=Math.min(.95,(e.isPlayer||e.flares?.8:.6)*(1+.3*((CLASSES[e.cls].agile||1)-1)));for(const m of W.missiles)if(m.tgt===e&&d3(m,e)<1700&&Math.random()<chance*(m.kind==='torpedo'?.5:m.kind==='swarm'?.55:1))m.tgt=pick(fl);fxSpark(e,'#fff1c0',10)}
function playerFlares(){if(!W||!running||S.player.docked||W.dead)return;const p=W.player;if(jamDark(p)){flash('Jammed: flares dark.',true);return}if(p.landed){flash('Systems are powered down while landed.');return}if(W.flareCd>0){flash(`Flares recharging (${Math.ceil(W.flareCd)} s).`);return}if(p.energy<30){flash('Not enough energy for flares.');return}p.energy-=30;W.flareCd=5;deployFlares(p);if(p.teth&&p.st.tetherCut){p.teth=null;feed('Tether cutter: the harpoon line is cut.','good')}if(NET.cl)netSend({t:'flare'});flash('Flares away.')}
function missilesUpdate(dt){
  W.flareCd=Math.max(0,W.flareCd-dt);W.mslCd=Math.max(0,W.mslCd-dt);
  for(let i=W.beams.length-1;i>=0;i--){W.beams[i].ttl-=dt;if(W.beams[i].ttl<=0)W.beams.splice(i,1)}
  for(let i=W.decoys.length-1;i>=0;i--){const d=W.decoys[i];d.life-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;if(d.life<=0)W.decoys.splice(i,1)}
  const s=S.sectors[W.sid];
  for(let i=W.missiles.length-1;i>=0;i--){const m=W.missiles[i];if(!m)continue;m.ttl-=dt;if(!missileTgtValid(m.tgt)||(m.tgt&&m.tgt.maskR&&m.tgt.masked&&d3(m,m.tgt)>m.tgt.maskR))m.tgt=null;const T=m.tgt;
    const tp=m.kind==='torpedo',K=MK[m.kind]||MK.missile;let sp=hyp(m.vx,m.vy,m.vz)||1,dx=m.vx/sp,dy=m.vy/sp,dz=m.vz/sp;sp=Math.min(K.spd,sp+K.acc*dt);
    if(T){let rx=T.x-m.x,ry=T.y-m.y,rz=T.z-m.z;const tt=hyp(rx,ry,rz)/sp;rx+=(T.vx||0)*tt;ry+=(T.vy||0)*tt;rz+=(T.vz||0)*tt;const l=hyp(rx,ry,rz)||1;rx/=l;ry/=l;rz/=l;
      const ang=Math.acos(clamp(dx*rx+dy*ry+dz*rz,-1,1)),k=ang>1e-4?Math.min(1,K.turn*dt/ang):1;dx+=(rx-dx)*k;dy+=(ry-dy)*k;dz+=(rz-dz)*k;const n=hyp(dx,dy,dz)||1;dx/=n;dy/=n;dz/=n;
      if(T.type==='ship'&&T.npc&&!m.checked&&m.kind!=='swarm'&&d3(m,T)<750){m.checked=true;   // AI pilots don't waste their flares on a swarm's micro-missiles
      if((T.ai.flareAt||0)<=W.t&&Math.random()<.35){deployFlares(T);T.ai.flareAt=W.t+10}}}
    m.vx=dx*sp;m.vy=dy*sp;m.vz=dz*sp;const ox=m.x,oy=m.y,oz=m.z;m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
    m.smoke-=dt;if(m.smoke<=0){m.smoke=tp?.025:.035;W.fx.push({x:ox,y:oy,z:oz,vx:rnd(-8,8),vy:rnd(-8,8),vz:rnd(-8,8),life:tp?1.6:.9,max:tp?1.6:.9,c:tp?[.5,.42,.3]:[.4,.4,.44],sz:rnd(4,7)*(tp?1.8:1)})}
    let boom=m.ttl<=0;
    if(!boom&&m.tgt&&m.tgt.type==='works'){if(wkSegHit(m.tgt,ox,oy,oz,m.x,m.y,m.z,tp?30:18))boom=true}
    else if(!boom&&m.tgt){const R=m.tgt.decoy?18:m.tgt.type==='station'?170:m.tgt.type==='outpost'?(tp?140:110):m.tgt.st.radius+(m.kind==='swarm'?14:22);if(segHit(ox,oy,oz,m.x,m.y,m.z,m.tgt,R))boom=true}
    if(!boom)for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===m.src||!hostile(m.side,e.side))continue;if(e.isPlayer&&(S.player.docked||W.dead))continue;if(segHit(ox,oy,oz,m.x,m.y,m.z,e,e.st.radius+10)){boom=true;break}}
    if(!boom)for(const a of s.ast)if(d3(a,m)<astR(a)){boom=true;break}
    if(boom){detonate(m,i);if(!W)return}}
}
// AI gate jump: fly to a point on the gate's axis, hold there while the gate charges for 5 s, then warp out
function npcGateJump(e,g,dt,urgency){const d=gateAxis(g);
  if(!e.gj||e.gj.g!==g){const ax=g.x-d.x*200,ay=g.y-d.y*200,az=g.z-d.z*200,dist=steer(e,ax,ay,az,dt,true,urgency||1);faceTo(e,{x:ax,y:ay,z:az},dt);if(dist<110)e.gj={g,t:0};return false}
  const J=e.gj;if(gateLocked(e))J.t=0;else J.t+=dt;const tx=g.x-d.x*60,ty=g.y-d.y*60,tz=g.z-d.z*60,ex=tx-e.x,ey=ty-e.y,ez=tz-e.z,el=hyp(ex,ey,ez)||1,sp=Math.min(50,el*.35),k=Math.min(1,1.6*dt);
  e.vx+=(ex/el*sp-e.vx)*k;e.vy+=(ey/el*sp-e.vy)*k;e.vz+=(ez/el*sp-e.vz)*k;faceDir(e,d.x,d.y,d.z,dt);e.thrusting=false;
  if(Math.random()<dt*(2+J.t*3))fxSpark({x:e.x+rnd(-20,20),y:e.y+rnd(-20,20),z:e.z+rnd(-20,20)},sideCol(e.side),1);
  if(J.t>=GATE_HOLD){fxWarp(e,sideCol(e.side));despawn(e);return true}return false}
function nearestGate(e){let b=null,bd=1e9;for(const g of GATES[W.sid]){const d=d3(g,e);if(d<bd){bd=d;b=g}}return b}
function despawn(e){if(e.drones)for(const d of e.drones)if(d.alive&&W.ents.includes(d)){fxWarp(d,sideCol(d.side));d.mom=null;despawn(d)}
  if(e.escortG){e.escortG.escort=null;for(const m of grpAlive(e.escortG))if(m.role==='escort'){m.role='patrol';m.ai.retireAt=W.t+25}}
  returnHome(e);e.alive=false;{const _i=W.ents.indexOf(e);if(_i>=0)W.ents.splice(_i,1)}if(W.tgt&&W.tgt.ref===e)W.tgt=null}
function npcThink(e,dt){
  const ai=e.ai,s=S.sectors[W.sid];ai.t-=dt;e.life+=dt;e.mining=null;e.thrusting=false;if(jamDark(e)){e.boosting=false;return}
  if(e.role==='limpet'){limpetThink(e);return}
  if(e.role==='drone'){if(e.mom&&jamDark(e.mom)){e.boosting=false;e.thrusting=false;return}droneThink(e,dt);return}
  if(e.role==='frigate'){frigateThink(e,dt);return}
  if(e.role==='picket'){if(e.order&&e.order.kind==='attack'&&orderThink(e,dt))return;droneThink(e,dt);return}
  if(e.role==='scout'){scoutThink(e,dt);return}
  if(e.role==='trader'){traderThink(e,dt);return}
  if(e.role==='builder'){if(W.t-e.lastHit<3)e.boosting=false;builderThink(e,dt);return}
  if(e.role==='hgret'){hgReturn(e,dt);return}
  if(ai.tgt&&ai.tgt.type==='ship'&&!hostile(e.side,ai.tgt.side))ai.tgt=null;
  if(e.order&&orderThink(e,dt))return;
  const combat=e.role==='patrol'||e.role==='raider'||e.role==='pirate'||e.role==='strike'||e.role==='escort'||e.role==='screen';
  if(e.role==='screen'&&ai.tgt){const F=e.grp&&e.grp.screen;if(F&&(ai.tgt.type!=='ship'||d3(ai.tgt,F)>(isBmb(ai.tgt.cls)?4200:3200)))ai.tgt=null}
  if(e.role==='escort'&&ai.tgt){const H=escortHauler(e);if(H&&d3(ai.tgt,H)>1700)ai.tgt=null}
  if(ai.tgt&&ai.tgt.type==='ship'&&mHid(ai.tgt,e))ai.tgt=null;
  if(combat&&(ai.t<=0||!(ai.tgt&&ai.tgt.alive&&W.ents.includes(ai.tgt)))){ai.t=.5+rnd(.4);ai.tgt=e.role==='screen'?screenTarget(e):e.role==='escort'?escortTarget(e):e.role==='strike'&&ai.siege&&isBmb(e.cls)?null:findHostile(e,e.role==='strike'?(ai.siege?1300:950):1500);
    if(!ai.tgt&&(e.role==='patrol'||e.role==='escort'))ai.tgt=civHelp(e);
    if(ai.hunt&&W.t<ai.huntUntil&&ai.hunt.alive&&(W.ents.includes(ai.hunt)||ai.hunt===W.player)&&!((ai.hunt.isPlayer&&(S.player.docked||W.dead)||mHid(ai.hunt,e)))&&d3(ai.hunt,e)<5000&&!(ai.tgt&&d3(ai.tgt,e)<400))ai.tgt=ai.hunt;
    if(e.grp){const L=grpLead(e.grp);if(!ai.tgt){for(const m of e.grp.members)if(m!==e&&m.alive&&m.ai.tgt&&m.ai.tgt.alive&&W.ents.includes(m.ai.tgt)&&d3(m.ai.tgt,e)<2200){ai.tgt=m.ai.tgt;break}}
      if(!ai.tgt&&L&&L!==e&&L.lastHitBy&&W.t-L.lastHit<3){const att=W.ents.find(x=>x.type==='ship'&&x.alive&&x.side===L.lastHitBy&&d3(x,e)<2200&&!(x.isPlayer&&(S.player.docked||W.dead))&&!mHid(x,e));if(att)ai.tgt=att}}}
  if(e.role==='raider'&&e.life>150&&!ai.tgt&&!e.sortieEv&&!e.raidR)e.role='leave';
  if(ai.retireAt&&W.t>ai.retireAt&&!ai.tgt&&e.role==='patrol')e.role='leave';
  if(e.role==='pirate'&&e.life>220&&!ai.tgt&&DEF[W.sid].kind!=='den')e.role='leave';
  {const OEb=W.outpostEnt;
    if(isBmb(e.cls)&&e.role==='strike'&&e.ai.siege){const SEb=W.stationEnt;if(SEb&&hostile(e.side,SEb.fac)&&(e.load.torpedo||0)>0){const bt=(W.works&&W.works.length&&wkPickFor(e,true,.45))||SEb;if(e.ai.btT!==bt){e.ai.btT=bt;e.ai.stand=null}bomberRun(e,bt,dt);return}}
    if(isBmb(e.cls)&&e.role==='strike'&&!e.ai.siege&&!e.ai.hunter&&OEb&&OEb.o.owner&&hostile(e.side,OEb.o.owner)&&!OEb.o.breached&&(e.load.torpedo||0)>0){bomberRun(e,OEb,dt);return}
    if(combat&&OEb&&OEb.o.owner===e.side&&!(ai.tgt&&isBmb(ai.tgt.cls))){let bb=null,bd=2600;for(const o of W.ents)if(o.type==='ship'&&o.alive&&isBmb(o.cls)&&hostile(e.side,o.side)&&((o.load&&o.load.torpedo)||0)>0&&!(o.isPlayer&&(S.player.docked||W.dead))){const d=d3(o,OEb);if(d<bd){bd=d;bb=o}}if(bb)ai.tgt=bb}}
  if(isBmb(e.cls)&&ai.tgt&&ai.tgt.role==='frigate'&&ai.tgt.alive&&W.ents.includes(ai.tgt)&&(e.load.torpedo||0)>0){if(ai.stand&&d3(ai.stand,ai.tgt)>2300)ai.stand=null;bomberRun(e,ai.tgt,dt);return}
  if(e.role==='strike'&&ai.siege&&ai.tgt){const T=W.stationEnt;if(isBmb(e.cls)||(T&&d3(ai.tgt,T)>2600))ai.tgt=null}
  if(combat&&ai.tgt){fight(e,ai.tgt,dt);return}
  if((e.role==='pirate'||(e.role==='miner'&&e.side==='brood'))&&!ai.tgt&&cloudSeek(e,dt))return;
  const OE=W.outpostEnt,SE=W.stationEnt;
  switch(e.role){
    case 'flee':{e.boosting=true;
      if(e.side!=='pirate'&&SE&&SE.fac===e.side){const d=steer(e,SE.x,SE.y,SE.z,dt,true,1.35);faceTo(e,SE,dt);if(d<170)despawn(e);break}
      if(OE&&OE.o.owner===e.side&&!OE.o.breached){const d=steer(e,OE.x,OE.y,OE.z,dt,true,1.35);faceTo(e,OE,dt);if(d<150)despawn(e);break}
      const g=fleeGate(e);e.thrusting=true;
      if(W.missiles.some(m=>m.tgt===e&&d3(m,e)<700)&&(ai.flareAt||0)<=W.t){deployFlares(e);ai.flareAt=W.t+6}
      npcGateJump(e,g,dt,1.35);break}
    case 'screen':{const F=e.grp&&e.grp.screen;if(!F){e.role='patrol';break}const n=(e.grp.slotBase||0)*3+(e.slot||0),a=n*2.1+W.t*.05,R=F.st.radius*1.25+520+(n%2)*160;holdSlot(e,F,F.x+Math.cos(a)*R,F.y+Math.sin(n*1.7)*140,F.z+Math.sin(a)*R,dt,1.2);const v=hyp(e.vx,e.vy,e.vz);if(v>15)faceDir(e,e.vx,e.vy,e.vz,dt);break}
    case 'escort':case 'patrol':case 'raider':case 'pirate':{
      if(e.role==='escort'&&e.grp&&!e.grp.fleeing&&grpLead(e.grp)===e){const H=escortHauler(e);if(!H){e.role='patrol';break}qRot(H.q,0,55,-135,_u);holdSlot(e,H,H.x+_u.x,H.y+_u.y,H.z+_u.z,dt,1.4);const hv=hyp(H.vx,H.vy,H.vz);if(hv>15)faceDir(e,H.vx,H.vy,H.vz,dt);else faceTo(e,H,dt);break}
      if(e.grp&&!e.grp.fleeing){const L=grpLead(e.grp);if(L&&L!==e){const sl=[[-80,10,-70],[80,10,-70],[0,45,-130],[0,-45,-130],[-150,0,-140],[150,0,-140]][(e.slot-1+6)%6];qRot(L.q,sl[0],sl[1],sl[2],_u);
        holdSlot(e,L,L.x+_u.x,L.y+_u.y,L.z+_u.z,dt,1.2);const lv=hyp(L.vx,L.vy,L.vz);if(lv>20)faceDir(e,L.vx,L.vy,L.vz,dt);else faceTo(e,{x:L.x+_u.x*3,y:L.y+_u.y*3,z:L.z+_u.z*3},dt);if(L.role==='leave')e.role='leave';break}}
      if(e.role==='pirate'&&invMass(e.cargo)<40){let bc=null,bd=1600;for(const c of s.crates){const d=d3(c,e);if(d<bd){bd=d;bc=c}}if(bc){steer(e,bc.x,bc.y,bc.z,dt,true);faceTo(e,bc,dt);if(bd<45){inv.addAll(e.cargo,bc.inv);s.crates.splice(s.crates.indexOf(bc),1);if(W.tgt&&W.tgt.ref===bc)W.tgt=null}return}}
      const anchor=e.role==='patrol'?(SE&&SE.fac===e.side?SE:OE&&OE.o.owner===e.side?OE:{x:0,y:0,z:0}):{x:0,y:0,z:0};
      if(!ai.wp||d3(ai.wp,e)<140){const o=rdir(1),r=e.role==='patrol'?rnd(300,1400)*1.2*SPREAD:rnd(400,2300)*SPACE;ai.wp={x:anchor.x+o.x*r,y:anchor.y+o.y*r,z:anchor.z+o.z*r}}
      steer(e,ai.wp.x,ai.wp.y,ai.wp.z,dt,false,.55);faceDir(e,e.vx,e.vy,e.vz,dt);break}
    case 'strike':{
      if(e.ai.siege){const T=W.stationEnt;if(!T||!hostile(e.side,T.fac)){e.role='leave';break}
        if(isBmb(e.cls)){if((e.load.torpedo||0)>0)bomberRun(e,T,dt);else e.role='leave';break}
        if(!ai.picket){const r=rdir(.6);ai.picket={x:T.x+r.x*1700,y:T.y+r.y*1700,z:T.z+r.z*1700}}steer(e,ai.picket.x,ai.picket.y,ai.picket.z,dt,true,.8);faceTo(e,T,dt);break}
      if(!OE){e.role='leave';break}const o=OE.o;
      if(o.owner===e.side){e.role='patrol';delete e.evId;e.home='stock:'+e.side;break}
      if(o.owner&&hostile(e.side,o.owner)&&!o.breached){fight(e,OE,dt);break}
      if(!ai.ring){const r=rdir(1);ai.ring={x:OE.x+r.x*260,y:OE.y+r.y*260,z:OE.z+r.z*260}}
      steer(e,ai.ring.x,ai.ring.y,ai.ring.z,dt,true);faceTo(e,OE,dt);break}
    case 'miner':{
      const cm=invMass(e.cargo);
      if(W.t-e.lastHit<4&&e.hull<e.st.hull*.75)ai.state='return';
      if(cm>=e.st.cargo)ai.state='return';
      if(ai.state==='return'){
        const D=SE&&SE.fac===e.side?SE:OE&&OE.o.owner===e.side?OE:null;
        if(!D){e.role='leave';break}
        const d=steer(e,D.x,D.y,D.z,dt,true);faceTo(e,D,dt);
        if(d<110){if(D.type==='outpost')inv.addAll(D.o.stock,e.cargo);else{inv.addAll((D.rec&&D.rec.owner===e.side&&storeOf(D.rec))||S.econ.stock[e.side]||S.econ.stock.pirate,e.cargo);if(D.rec){mkOf(D.rec);for(const k in e.cargo)D.rec.mk[k]=(D.rec.mk[k]||0)+e.cargo[k]*.5}}e.cargo={};despawn(e)}
        break}
      let a=ai.ast;if(a&&a.wpt&&oreTotal(a)<=0)a=null;if(!a||!(a.wpt||s.ast.includes(a))){let bd=1e9;a=null;const wp=wptsIn(s).filter(x=>!x.train);if(wp.length&&(e.side==='brood'||Math.random()<.5)){for(const x of wp){const d=d3(x,e);if(d<bd){bd=d;a=x}}}else for(const x of s.ast){if(x.comet)continue;const d=d3(x,e)+rnd(400);if(d<bd){bd=d;a=x}}ai.ast=a;if(!a){ai.state='return';break}}
      const d=d3(a,e),r=astR(a);
      if(e.side!=='brood'&&blHull(e.cls)){npcBlast(e,a,dt,s);break}
      if(d>r+150){steer(e,a.x,a.y,a.z,dt,true);faceTo(e,a,dt)}
      else{brake(e,dt);if(faceTo(e,a,dt)<.3){e.mining=a;e.mineAcc+=e.st.drill*dt*(e.side==='brood'?(a.wpt?2:1):BAL.aiEff);while(e.mineAcc>=1){e.mineAcc-=1;const k=mainOre(a);if(!k)break;a.ore[k]--;if(!a.ore[k])delete a.ore[k];inv.add(e.cargo,k,1);if(oreTotal(a)<=0){removeAst(s,a);ai.ast=null;break}}}}
      break}
    case 'hauler':{const g=ai.dest,hit=W.t-e.lastHit<4,dock=g.type==='station'||g.type==='outpost';e.boosting=hit;if(!dock&&g.to!==undefined&&d3(e,g)<900){npcGateJump(e,g,dt,1);break}const d=steer(e,g.x,g.y,g.z,dt,dock,hit?1.15:.75);faceTo(e,g,dt);if(dock&&d<200){despawn(e);break}break}
    case 'leave':{const g=e.gj?e.gj.g:nearestGate(e);npcGateJump(e,g,dt,1);break}
  }
}

// AI miners blast: stand off a fault point, set 2-3 charges, back off, detonate, scoop the chunk. The rock gives at the miner's
// drilling rate the whole time (the ore builds up and leaves with the chunk), so their output is what it was with the laser.
function npcBlast(e,a,dt,s){const ai=e.ai,r=astR(a);let B=ai.bl;if(!B||B.a!==a.id){B=ai.bl={a:a.id,st:'set',t:0,n:a.wpt?1:ri(2,3),fired:0,pts:[]}}B.t+=dt;
  if(B.st!=='set'||B.fired>0||d3(e,a)<r+400)e.mineAcc+=e.st.drill*dt*BAL.aiEff;
  if(B.st==='set'){const pts=blPts(a),left=pts.filter(p=>!B.pts.some(x=>d3(x,p)<1)),q=(left.length?left:pts).slice().sort((u,v)=>d3(u,e)-d3(v,e))[0],sx=q.x-a.x,sy=q.y-a.y,sz=q.z-a.z,sl=hyp(sx,sy,sz)||1,o={x:q.x+sx/sl*170,y:q.y+sy/sl*170,z:q.z+sz/sl*170};
    steer(e,o.x,o.y,o.z,dt,true,.7);if(d3(e,q)<320||B.t>7){brake(e,dt);if(faceTo(e,q,dt)<.15&&(B.cd||0)<=W.t){B.cd=W.t+.8;B.fired++;(W.npcBl=W.npcBl||[]).push({x:e.x,y:e.y,z:e.z,tx:q.x,ty:q.y,tz:q.z,t:0,T:Math.max(.2,d3(e,q)/BL.spd)});B.pts.push({x:q.x,y:q.y,z:q.z});if(B.fired>=B.n){B.st='clear';B.t=0}}}else faceTo(e,o,dt);return}
  if(B.st==='clear'){const dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z,l=hyp(dx,dy,dz)||1;steer(e,a.x+dx/l*(r+330),a.y+dy/l*(r+330),a.z+dz/l*(r+330),dt,true,.8);faceTo(e,a,dt);if(l>r+280||B.t>6){B.st='det';B.t=0}return}
  if(B.st==='det'){const got={},room=e.st.cargo-invMass(e.cargo);let m=0;while(e.mineAcc>=1){const k=mainOre(a);if(!k||m+mass(k)>room)break;e.mineAcc-=1;a.ore[k]--;if(!a.ore[k])delete a.ore[k];got[k]=(got[k]||0)+1;m+=mass(k)}
    inv.addAll(e.cargo,got);const gone=oreTotal(a)<=0;for(const q of B.pts)fxBoom(q,Math.min(90,r*.9),'#ffd9a0');if(!MUTE&&W.player&&d3(e,W.player)<3000)SFX.crack(vPil(e));
    const t=oreTotal({ore:got});if(t>0){const q=B.pts[0]||a,nx=q.x-a.x,ny=q.y-a.y,nz=q.z-a.z,nl=hyp(nx,ny,nz)||1,sp=rnd(6,10);(W.npcCh=W.npcCh||[]).push({id:S.nextId++,e,k:mainOre({ore:got})||'fe',cr:chunkR(t),x:q.x+nx/nl*8,y:q.y+ny/nl*8,z:q.z+nz/nl*8,vx:nx/nl*sp,vy:ny/nl*sp,vz:nz/nl*sp,until:W.t+14})}
    if(gone){removeAst(s,a);ai.ast=null}B.st='scoop';B.t=0;return}
  if(B.st==='scoop'){const c=(W.npcCh||[]).find(x=>x.e===e);if(!c||B.t>14){if(c)W.npcCh=W.npcCh.filter(x=>x!==c);ai.bl=null;return}const d=steer(e,c.x,c.y,c.z,dt,true,.6);faceTo(e,c,dt);
    if(d<e.st.radius+c.cr+20){W.npcCh=W.npcCh.filter(x=>x!==c);ai.bl=null}}}
// the charges' flight, and chunks drifting to their miner
function npcBlWorld(dt){if(W.npcBl&&W.npcBl.length){for(const b of W.npcBl)b.t+=dt;W.npcBl=W.npcBl.filter(b=>{if(b.t<b.T)return true;if(!MUTE)fxSpark({x:b.tx,y:b.ty,z:b.tz},'#f0b24a',3);return false})}
  if(W.npcCh&&W.npcCh.length){const dmp=Math.pow(.86,dt);W.npcCh=W.npcCh.filter(c=>c.e.alive&&W.ents.includes(c.e)&&W.t<c.until);for(const c of W.npcCh){c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vx*=dmp;c.vy*=dmp;c.vz*=dmp}}}