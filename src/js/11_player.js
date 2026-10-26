//@src 11_player.js
// ============================================================ player
function steerInput(){
  let yaw=0,pitch=0;
  if(touch.on){const m=hyp(touch.dx,touch.dy);if(m>8){yaw=-clamp(touch.dx/80,-1,1);pitch=clamp(touch.dy/80,-1,1)}}
  else if(mouse.aim&&mouse.in&&!mouse.free&&$('map').hidden&&$('help').hidden){const sc=Math.min(VW,VH)*.42,dz=.07;let mx=(mouse.x-VW/2)/sc,my=(mouse.y-VH/2)/sc;const m=hyp(mx,my);
    if(m<dz){mx=my=0}else{const s=Math.min(1,(m-dz)/(1-dz)),k=Math.pow(s,1.35)/m;mx*=k;my*=k}yaw=-mx;pitch=my}
  if(keys.ArrowLeft)yaw+=1;if(keys.ArrowRight)yaw-=1;if(keys.ArrowUp)pitch-=1;if(keys.ArrowDown)pitch+=1;
  return{yaw:clamp(yaw,-1,1),pitch:clamp(pitch,-1,1)};
}
// ---- friendly operations: strikes you can join, friendly holdings under threat, and fights in this sector
function friendSide(sd){return sd==='player'||sd===S.player.faction}
function attackersOf(v){if(!W)return[];return W.ents.filter(e=>e.npc&&e.alive&&hostile(v.side||v.fac||(v.o&&v.o.owner),e.side)&&(e.ai.tgt===v||(v.type!=='ship'&&d3(e,v)<1300&&e.role==='strike')))}
function localTrouble(){const out=[];if(!W)return out;const pf=S.player.faction,p=W.player;
  const SE=W.stationEnt;if(SE&&friendSide(SE.fac)&&W.t-SE.lastHit<4)out.push({kind:'local',sector:W.sid,hops:0,eta:0,label:`${SE.name} under attack`,ref:SE});
  const OE=W.outpostEnt;if(OE&&friendSide(OE.o.owner)&&W.t-OE.lastHit<4)out.push({kind:'local',sector:W.sid,hops:0,eta:0,label:`${OE.o.name} under attack`,ref:OE});
  const seen=new Set();for(const e of W.ents){if(!e.npc||!e.alive||e.role==='drone'||e.side!==pf||W.t-e.lastHit>3||!hostile(pf,e.lastHitBy))continue;const g=e.grp;if(g&&seen.has(g))continue;if(g)seen.add(g);
    const n=g?grpAlive(g).length:1,what=e.role==='miner'?'miner':e.role==='builder'?'constructor':e.role==='hauler'?'freighter':e.role==='escort'?'escort wing':e.role==='strike'?'strike wing':e.role==='flee'?'retreating ships':'patrol wing';
    out.push({kind:'local',sector:W.sid,hops:0,eta:0,label:`${FAC(pf).short} ${what}${g&&n>1?` (${n})`:''} under fire · ${fmt(Math.round(d3(e,p)/10)*10)} m`,ref:e})}
  return out}
function friendlyOps(){const pf=S.player.faction,out=[];
  for(const ev of S.events){if(ev.stage==='done'||!(ev.type==='offensive'||ev.type==='build'))continue;if(ev.att!==pf&&!evKnown(ev))continue;const hops=HOP[ev.sector][S.player.sector],eta=ev.stage==='inbound'?Math.max(0,Math.round(ev.eta-S.T)):0;
    if(ev.type==='build'){if(ev.att===pf)out.push({kind:'assist',ev,sector:ev.sector,hops,eta,held:!!ev.hold,label:`${FAC(pf).short} constructor → ${DEF[ev.sector].name}`});else if(ev.att==='brood')out.push({kind:'defend',ev,sector:ev.sector,hops,eta,label:`Brood Seeder → ${DEF[ev.sector].name}`});continue}
    const ow=evOwner(ev),nm=evName(ev);
    if(ev.att===pf)out.push({kind:'assist',ev,sector:ev.sector,hops,eta,held:!!ev.hold,label:`${FAC(pf).short} strike (${ev.n}) → ${nm}`});
    else if(friendSide(ow))out.push({kind:'defend',ev,sector:ev.sector,hops,eta,label:`${sideName(ev.att)} ${ev.att==='brood'?'swarm':'strike'} (${ev.n}) → ${ow==='player'?'your ':''}${nm}`});
    else if(ev.att==='brood')out.push({kind:'defend',ev,sector:ev.sector,hops,eta,label:`Brood swarm (${ev.n}) → ${nm} (${sideName(ow)||'unclaimed'})`})}
  for(const t of S.frigates||[]){if(friendSide(t.side)||!covered(t.sector))continue;const sid=t.sector,Rs=S.stations[sid],oid=OUT_BY_SECTOR[sid];if(friendSide(sectorOwner(sid))||(Rs&&friendSide(Rs.owner))||(oid&&friendSide(S.outposts[oid].owner)))out.push({kind:'defend',ev:{type:'frigate',stage:'engaged',sector:sid},sector:sid,hops:HOP[sid][S.player.sector],eta:0,label:`${t.side==='brood'?'Brood '+broodCap(t):sideName(t.side)+' '+capName(t)} in ${DEF[sid].name}`})}
  for(const d of distressOps())if(!out.some(o=>o.sector===d.sector)&&!(d.sector===S.player.sector&&localTrouble().length))out.push(d);
  out.sort((a,b)=>a.hops-b.hops||a.eta-b.eta);return[...localTrouble(),...out]}
function opWhen(op){if(op.kind==='local')return'here';const j=op.hops?`${op.hops} jump${op.hops>1?'s':''}`:'this sector';if(op.ev.stage==='engaged')return j+' · fighting now';if(op.ev.stage==='building')return j+` · building ${Math.round((op.ev.prog||0)*100)}%`;return j+(op.held?' · holding for you':` · ${op.eta}s`)}
function joinOp(op){if(!op)return;
  if(op.kind==='local'){const at=attackersOf(op.ref).sort((a,b)=>d3(a,W.player)-d3(b,W.player))[0]||nearestHostileTo(op.ref);if(at){W.tgt={kind:'ship',ref:at};apOn=false;flash(`Targeted ${shipLabel(at)}: it is attacking ${op.ref.name||(op.ref.o&&op.ref.o.name)||'your wingmates'}.`)}else flash('No attacker in range.');return}
  if(op.hops===0){flash(op.kind==='assist'?'The strike is coming here. Hold position near the outpost.':'The attack is coming here. Get ready.');return}
  S.player.route=op.sector;
  if(op.kind==='assist'&&op.ev.stage==='inbound'){op.ev.hold=Math.max(op.ev.hold||0,S.T+Math.min(220,40*op.hops+40));if(NET.cl)netSend({t:'hold',id:op.ev.id,hold:op.ev.hold});feed(`${FAC(S.player.faction).short} ${op.ev.type==='build'?'constructor convoy':'strike group'} will hold at the gate to ${DEF[op.sector].name} for you (up to ${Math.round(op.ev.hold-S.T)}s).`,'good')}
  else feed(`Course set to ${DEF[op.sector].name}${op.ev.type==='build'?' to stop the Seeder':' to defend '+evName(op.ev)}. ${op.eta?`It lands in ${op.eta}s.`:''}`,'info');
  if(W&&!S.player.docked){apOn=true;const g=routeNext();if(g)W.tgt={kind:'gate',ref:g};flash('Autopilot engaged on course. Steer to take back control.')}else flash('Course set. Undock and press J to fly it.')}
function nearestHostileTo(v){let b=null,bd=2500;for(const e of W.ents)if(e.type==='ship'&&e.alive&&!e.isPlayer&&hostile(S.player.faction,e.side)){const d=d3(e,v);if(d<bd){bd=d;b=e}}return b}
function assistTarget(){const lt=localTrouble();if(lt.length){joinOp(lt[0]);return}
  let b=null,bd=1e9;for(const e of W.ents)if(e.npc&&e.alive&&hostile('player',e.side)&&e.ai.tgt&&!e.ai.tgt.isPlayer&&friendSide(e.ai.tgt.side||e.ai.tgt.fac)){const d=d3(e,W.player);if(d<bd){bd=d;b=e}}
  if(b){W.tgt={kind:'ship',ref:b};flash(`Targeted ${shipLabel(b)}: it is attacking a friendly.`)}else flash('No friendlies under attack here.')}
function friendlyAlerts(){if(!W||W.dead)return;const lt=localTrouble();if(!lt.length)return;if(W.t-(W.fAlert||-99)<25)return;W.fAlert=W.t;feed(`${lt[0].label}. Press Y to target the attacker.`,'warn');SFX.warn()}
// ---- navigation helpers: course from the map, next gate, autopilot
function routeNext(){const P=S.player;if(!P.route||!W)return null;if(P.route===W.sid)return null;let best=null,bs=1e9;for(const g of GATES[W.sid]){const h=(HOP[P.route][g.to]||0)*1e5+(S.gateDown[gateKey(W.sid,g.to)]?5e5:0);if(h<bs){bs=h;best=g}}return best?W.ents.find(e=>e.type==='gate'&&e.to===best.to):null}
let apOn=false,apSaid=false;
function say(text){try{if(!AU.on.sfx||!('speechSynthesis' in window))return;const ss=speechSynthesis;ss.cancel();const u=new SpeechSynthesisUtterance(text),vs=ss.getVoices();
  const v=vs.find(v=>/en[-_]GB/i.test(v.lang)&&/Daniel|Arthur|George|Oliver|Male/i.test(v.name))||vs.find(v=>/en[-_]GB/i.test(v.lang))||vs.find(v=>/UK English|British/i.test(v.name));
  if(v)u.voice=v;u.lang='en-GB';u.rate=.92;u.pitch=.72;u.volume=.9;ss.speak(u)}catch(e){}}
try{if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}}catch(e){}
function apTarget(){if(W.tgt&&validTgt(W.tgt)&&W.tgt.kind!=='ship')return W.tgt;if(W.tgt&&W.tgt.kind==='ship'&&!hostile('player',W.tgt.ref.side)&&validTgt(W.tgt))return W.tgt;const g=routeNext();return g?{kind:'gate',ref:g}:null}
function toggleAutopilot(){if(!W||S.player.docked)return;if(apOn){apOn=false;flash('Autopilot off.');return}const T=apTarget();if(!T){flash('Autopilot needs a destination: target a gate, station or rock (Tab cycles), or set a course on the map (M).',true);return}
  if(T.kind==='ship'&&hostile('player',T.ref.side)){flash('Autopilot will not fly at hostiles.',true);return}apOn=true;W.tgt=T;flash('Autopilot engaged. Steer or thrust to take back control.')}
function autopilot(p,dt){const T=apTarget();if(!T||!T.ref){apOn=false;if(T&&!T.ref)W.tgt=null;return false}W.tgt=T;const R=T.ref;let stand=0,arrive=true;
  if(T.kind==='gate'){const g=R,d=gateAxis(g),z=gateZone(g,p);if(W.gc||(z.inZone&&z.along>-420)){faceDir(p,d.x,d.y,d.z,dt);p.thrusting=false;if(!W.gc&&z.cos>.9)brake(p,dt*.6);return true}
    const ax=g.x-d.x*300,ay=g.y-d.y*300,az=g.z-d.z*300,ex=ax-p.x,ey=ay-p.y,ez=az-p.z,de=hyp(ex,ey,ez)||1,er=faceDir(p,ex,ey,ez,dt);if(er<.6)steer(p,ax,ay,az,dt,true,1);else brake(p,dt*.4);p.thrusting=er<.6;return true}else if(T.kind==='station'||T.kind==='outpost')stand=230;else if(T.kind==='ast')stand=astR(R)+140;else if(T.kind==='ship')stand=180;else if(T.kind==='beacon')stand=90;else stand=0;
  const dx=R.x-p.x,dy=R.y-p.y,dz=R.z-p.z,d=hyp(dx,dy,dz)||1,tx=R.x-dx/d*stand,ty=R.y-dy/d*stand,tz=R.z-dz/d*stand;
  const err=faceDir(p,dx,dy,dz,dt);if(err<.6)steer(p,tx,ty,tz,dt,arrive,1);else brake(p,dt*.4);p.thrusting=err<.6;
  if(arrive&&d-stand<40&&hyp(p.vx,p.vy,p.vz)<40){apOn=false;flash(T.kind==='station'||T.kind==='outpost'?'Arrived. Press E to dock.':'Arrived.');return true}return true}
// auto-level: when you are not rolling, ease the wings back level with the sector plane (skipped when pointing near straight up or down)
function levelRoll(p,dt){if(S.player.level===false)return;qRot(p.q,0,0,1,_f);if(Math.abs(_f.y)>.88)return;qRot(p.q,1,0,0,_r);qRot(p.q,0,1,0,_u);const err=Math.atan2(_r.y,_u.y);if(Math.abs(err)<.002)return;qMul(p.q,qAxis(0,0,1,-err*Math.min(1,2.4*dt),_qa),p.q);qNorm(p.q)}
function startPlayerBuild(){if(!W||S.player.docked||W.dead)return;if(NET.cl){netSend({t:'build'});return}const P=S.player,p=W.player;
  if(W.pbuild){flash('Construction already under way.');return}
  if(P.cls!=='constructor'){flash('Depots are built from a Constructor hull (Shipyard at a core station).',true);return}
  if(S.stations[W.sid]){flash('This sector already has a station.',true);return}
  if(!canBuildIn(W.sid,NET.on?S.player.faction:'player')){flash(DEF[W.sid].kind==='hive'?'Nothing can be built inside the Bloom.':'Another power holds this sector. You cannot build here.',true);return}
  if(!haveIn(DEPOT_COST,[P.cargo])){flash(`A depot takes ${DEPOT_COST.frame} Depot Frames in your hold. Fabricate them when docked.`,true);return}
  if(GATES[W.sid].some(g=>d3(g,p)<700)||(W.outpostEnt&&d3(W.outpostEnt,p)<600)){flash('Too close to a gate or outpost. Move at least 700 m away.',true);return}
  if(hyp(p.vx,p.vy,p.vz)>60){flash('Come to a stop (under 60 m/s) to start building.',true);return}
  W.pbuild={x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z),prog:0};feed(`Construction started in ${DEF[W.sid].name}. Stay within 350 m for 45 s.`,'info')}
function pbuildTick(dt){const B=W.pbuild;if(!B)return;if((B.pid||NET.me)!==(CTX||NET.me))return;const P=S.player,p=W.player;if(W.dead||P.cls!=='constructor'){W.pbuild=null;feed('Construction abandoned.','bad');return}
  if(d3(B,p)<350)B.prog+=dt/45;if(B.prog<1)return;W.pbuild=null;
  if(!haveIn(DEPOT_COST,[P.cargo])||S.stations[W.sid]){feed('Construction failed: the frames are gone.','bad');return}
  takeFrom(DEPOT_COST,[P.cargo]);const Rr=makeStation(W.sid,NET.on?S.player.faction:'player','depot',B,{...DEPOT_COST});addStationEnt(Rr);fxBoom(Rr,160,PLAYER_COL);SFX.clunk();
  feed(`${Rr.name} is online. Dock to use its store; it mines this sector for you and its turrets defend it.`,'good');save()}
function playerUpdate(dt){
  const p=W.player,P=S.player,st=p.st;pbuildTick(dt);if(P.docked&&P.docked!=='turret')P.limpetUsed=false;if(P.docked||W.dead)return;if(jamDark(p)){p.boosting=false;p.thrusting=false;return}
  if(p.landed){landedTick(dt);updateLock(dt);return}
  if(apOn){const man=keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowLeft||keys.ArrowRight||keys.ArrowUp||keys.ArrowDown||touch.on||(mouse.in&&mouse.aim&&!mouse.free&&hyp(mouse.x-VW/2,mouse.y-VH/2)>Math.min(VW,VH)*.42*.25);
    if(man){apOn=false;flash('Autopilot off.')}else{p.wx=p.wy=p.wz=0;autopilot(p,dt);levelRoll(p,dt);if(keys.Space||mouse.l||touch.fire){if(P.wpn==='laser'&&!p.jamMode)fireLaser(p);else fire(p)}updateLock(dt);pickupAndGates(p,P,st);return}}
  const trk=keys.KeyZ&&W.tgt&&validTgt(W.tgt);
  const si=trk?{yaw:0,pitch:0}:steerInput();let roll=0;if(keys.KeyA)roll-=1;if(keys.KeyD)roll+=1;
  if(trk){const T=W.tgt.ref,lp=W.tgt.kind==='ship'&&hostile('player',T.side)&&P.wpn!=='laser'?leadPoint(p,T,p.st.shotSpd||SHOT_SPD):T;faceDir(p,lp.x-p.x,lp.y-p.y,lp.z-p.z,dt)}
  // rotation with angular inertia: rates ease toward the stick instead of snapping
  const C=CLASSES[P.cls],H=handling(p),tr=st.turn*.9*H.turn,ag=7*(C.agile||1)*H.ag,ka=Math.min(1,ag*dt);
  p.wy=(p.wy||0)+(si.yaw*tr-(p.wy||0))*ka;p.wx=(p.wx||0)+(si.pitch*tr-(p.wx||0))*ka;p.wz=(p.wz||0)+(roll*st.turn*1.15*H.turn-(p.wz||0))*Math.min(1,ag*1.3*dt);
  if(!trk){if(Math.abs(p.wy)>1e-4)qMul(p.q,qAxis(0,1,0,p.wy*dt,_qa),p.q);if(Math.abs(p.wx)>1e-4)qMul(p.q,qAxis(1,0,0,p.wx*dt,_qa),p.q)}
  if(Math.abs(p.wz)>1e-4)qMul(p.q,qAxis(0,0,1,p.wz*dt,_qa),p.q);
  if(!roll)levelRoll(p,dt);
  qNorm(p.q);
  let fwd=0;if(keys.KeyW||touch.thrust)fwd+=1;if(keys.KeyS)fwd-=1;
  // afterburner: running dry locks it out until Shift is released and the reactor has at least 15 energy to light it again
  // (without the latch it re-lit every time a sliver of energy came back, firing the start-up kick over and over)
  const bHeld=(keys.ShiftLeft||keys.ShiftRight||touch.boost)&&fwd>0;if(!bHeld)p.bLock=false;
  const bm=C.boost||1,boost=bHeld&&!p.stealth&&!p.bLock&&jamFrac(p)<.5&&(p.boosting?p.energy>0:p.energy>=15);if(p.boosting&&bHeld&&!boost&&p.energy<=0){p.bLock=true;flash('Afterburner out of energy. Let go of Shift to let it recharge.')}
  if(boost&&!p.boosting){SFX.boost();const kick=70*bm*H.kick;qRot(p.q,0,0,1,_f);p.vx+=_f.x*kick;p.vy+=_f.y*kick;p.vz+=_f.z*kick;W.shake=Math.max(W.shake||0,.35);fxSpark({x:p.x-_f.x*20,y:p.y-_f.y*20,z:p.z-_f.z*20},FAC(P.faction).col,6)}
  p.boosting=boost;if(boost){p.energy=Math.max(0,p.energy-30*dt*(CLASSES[P.cls].bcost||1)*(st.boostK||1));p.lastFire=W.t;W.shake=Math.max(W.shake||0,.12)}
  qRot(p.q,0,0,1,_f);const thr=st.thrust*(boost?2.3*bm:1)*H.thr*jamThr(p);p.thrusting=fwd>0;
  const v=hyp(p.vx,p.vy,p.vz),vf=p.vx*_f.x+p.vy*_f.y+p.vz*_f.z;
  if(fwd>0){const capF=st.maxSpd*(boost?1.95*bm:1)*H.spd;if(vf<capF){const a=Math.min(thr*dt,capF-vf);p.vx+=_f.x*a;p.vy+=_f.y*a;p.vz+=_f.z*a}}
  // drift mode at the speed cap: thrust still pushes along the nose, then speed is held where it was, so holding W swings
  // your motion round to the nose (slower than with assist) instead of doing nothing until you burn past the cap
  if(fwd>0&&!P.fa){const capF=st.maxSpd*(boost?1.95*bm:1)*H.spd,v0=v;if(vf>=capF*.98&&v0>1){p.vx+=_f.x*thr*dt;p.vy+=_f.y*thr*dt;p.vz+=_f.z*thr*dt;const v1=hyp(p.vx,p.vy,p.vz),lim=Math.max(v0,capF);if(v1>lim){const k=lim/v1;p.vx*=k;p.vy*=k;p.vz*=k}}}
  if(P.fa){
    // assisted: S brakes against current motion; lateral dampers bleed sideways slip slowly so turns slide
    if(fwd<0&&v>1){const a=Math.min(v,st.thrust*1.1*H.thr*dt);p.vx-=p.vx/v*a;p.vy-=p.vy/v*a;p.vz-=p.vz/v*a}
    const lx=p.vx-_f.x*vf,ly=p.vy-_f.y*vf,lz=p.vz-_f.z*vf,lat=Math.min(1,(fwd>0?(boost?.55:1.15):.45)*H.lat*dt);
    p.vx-=lx*lat;p.vy-=ly*lat;p.vz-=lz*lat;
    if(!fwd){const dr=Math.min(1,.06*dt);p.vx*=1-dr;p.vy*=1-dr;p.vz*=1-dr}
  }else if(fwd<0){p.vx-=_f.x*thr*.7*dt;p.vy-=_f.y*thr*.7*dt;p.vz-=_f.z*thr*.7*dt}
  if(keys.Space||mouse.l||touch.fire){if(P.wpn==='laser'&&!p.jamMode)fireLaser(p);else fire(p)}
  updateLock(dt);
  const sec=S.sectors[W.sid];
  blPilotUpdate(p,P,st,sec,dt);
  pickupAndGates(p,P,st);
}
function pickupAndGates(p,P,st){const sec=S.sectors[W.sid];
  for(let i=sec.crates.length-1;i>=0;i--){const cr=sec.crates[i];if(!NET.cl&&d3(cr,p)<st.radius+30){let room=st.cargo-invMass(P.cargo),took=0;for(const k of Object.keys(cr.inv)){const m=mass(k);while(cr.inv[k]&&room>=m){inv.take(cr.inv,k,1);inv.add(P.cargo,k,1);room-=m;took+=m}}
    if(took)feed(`Recovered ${took} t of salvage.`,'good');if(!Object.keys(cr.inv).length){sec.crates.splice(i,1);if(W.tgt&&W.tgt.ref===cr)W.tgt=null}else if(W.t-(W.fullMsg||0)>3){flash('Hold is full; some salvage is still in the crate.');W.fullMsg=W.t}}}
  if(!W.jump)for(const g of GATES[W.sid]){if(d3(g,p)<95){
    if(S.gateDown[gateKey(W.sid,g.to)]){if(W.t-(W.gateMsg||0)>2){flash('This gate has collapsed. It will reopen shortly.',true);W.gateMsg=W.t}const dx=p.x-g.x,dy=p.y-g.y,dz=p.z-g.z,l=hyp(dx,dy,dz)||1;p.vx=dx/l*200;p.vy=dy/l*200;p.vz=dz/l*200;break}
    }}
  if(!W.jump)gateCountdown(p);
}
// gate transit: the field grabs the ship, lines it up on the gate axis and flings it down the tunnel (about 1.7 s),
// then it drops out of the far gate (about 1.2 s of arrival with controls locked for the first half second)
const JUMP_OUT=1.3,JIN={t:9,d:1.1},GATE_HOLD=5;
// line up on a gate and hold it: within ~500 m in front of the ring, near its axis, nose within 20° of straight through.
// The gate field then holds the ship on the axis and counts down 5 seconds; break alignment or leave and it resets.
function gateAxis(g){const l=hyp(g.x,g.y,g.z)||1;return{x:g.x/l,y:g.y/l,z:g.z/l}}
function gateZone(g,p){const d=gateAxis(g),rx=p.x-g.x,ry=p.y-g.y,rz=p.z-g.z,along=rx*d.x+ry*d.y+rz*d.z,lx=rx-d.x*along,ly=ry-d.y*along,lz=rz-d.z*along;qRot(p.q,0,0,1,_f);
  return{d,along,lat:hyp(lx,ly,lz),cos:_f.x*d.x+_f.y*d.y+_f.z*d.z,inZone:along>-560&&along<70&&hyp(lx,ly,lz)<170}}
function gateCountdown(p){const dt=W.fdt||1/60;let best=null;for(const g of GATES[W.sid]){const z=gateZone(g,p);if(z.inZone&&(!best||Math.abs(z.along)<Math.abs(best.z.along)))best={g,z}}
  if(!best){if(W.gc){W.gc=null;if(!W.gcDone)flash('Left the gate approach. Countdown cancelled.')}W.gate=null;return}
  const{g,z}=best;W.gate={g,z};
  if(S.gateDown[gateKey(W.sid,g.to)]){W.gc=null;if(W.t-(W.gateMsg||0)>3){flash('This gate has collapsed. It will reopen shortly.',true);W.gateMsg=W.t}return}
  if(z.cos<.94){if(W.gc){W.gc=null;SFX.beep(140);flash('Alignment lost. Line up with the gate again.',true)}return}
  if(gateLocked(p)){if(W.gc){W.gc=null}if(W.t-(W.gateLockMsg||0)>3){W.gateLockMsg=W.t;flash('Jammed or tethered: the gate field won\u2019t take you until the bar drains or the line breaks.',true)}return}
  if(!W.gc||W.gc.g!==g){W.gc={g,t:0,last:6}}
  const C=W.gc;C.t+=dt;const n=Math.ceil(unbGateHold()-C.t);if(n<C.last&&n>0){C.last=n;SFX.count(n===1)}
  // the field: ease the ship onto the axis and let it creep toward the ring
  const tx=g.x-z.d.x*60,ty=g.y-z.d.y*60,tz=g.z-z.d.z*60,ex=tx-p.x,ey=ty-p.y,ez=tz-p.z,el=hyp(ex,ey,ez)||1,sp=Math.min(55,el*.35),k=Math.min(1,1.6*dt);
  p.vx+=(ex/el*sp-p.vx)*k;p.vy+=(ey/el*sp-p.vy)*k;p.vz+=(ez/el*sp-p.vz)*k;
  if(C.t>=unbGateHold()){W.gc=null;W.gate=null;W.jump={to:g.to,t:0,g};p.inJump=true;W.tgt=null;SFX.jump();flash(`Jumping to ${DEF[g.to].name}.`)}}
function drawGateCountdown(c,t){if(W.jump||!W.gate||S.player.docked||W.dead)return;const cx=VW/2,cy=VH*.36,G=W.gate,C=W.gc,col=FAC(S.player.faction).col,to=DEF[G.g.to].name;
  c.save();c.textAlign='center';c.textBaseline='middle';
  if(S.gateDown[gateKey(W.sid,G.g.to)]){c.font='600 14px "Saira Semi Condensed",sans-serif';c.fillStyle='#ff5d4f';c.fillText(`GATE TO ${to.toUpperCase()} HAS COLLAPSED`,cx,cy);c.restore();return}
  if(!C){const err=Math.round(Math.acos(clamp(G.z.cos,-1,1))*180/Math.PI);c.font='700 15px "Saira Semi Condensed",sans-serif';c.fillStyle='#f0b24a';c.fillText(`LINE UP WITH THE GATE TO ${to.toUpperCase()}`,cx,cy-8);
    c.font='500 12px "JetBrains Mono",monospace';c.fillStyle='rgba(236,228,207,.8)';c.fillText(`point straight through the ring · off by ${err}° (need under 20°)`,cx,cy+14);
    const P=proj(G.g.x+G.z.d.x*2500,G.g.y+G.z.d.y*2500,G.g.z+G.z.d.z*2500);const off=P.behind||P.x<40||P.x>VW-40||P.y<40||P.y>VH-40;if(off){let ax=P.x-VW/2,ay=P.y-VH/2;const l=hyp(ax,ay)||1;ax/=l;ay/=l;const ex=VW/2+ax*Math.min(VW*.4,VH*.38),ey=VH/2+ay*Math.min(VW*.4,VH*.38);c.fillStyle='#f0b24a';c.beginPath();c.moveTo(ex+ax*16,ey+ay*16);c.lineTo(ex-ay*9-ax*4,ey+ax*9-ay*4);c.lineTo(ex+ay*9-ax*4,ey-ax*9-ay*4);c.closePath();c.fill()}if(!off){c.strokeStyle='#f0b24a';c.lineWidth=2;c.beginPath();c.arc(P.x,P.y,16+3*Math.sin(t*6),0,TAU);c.stroke();c.beginPath();c.moveTo(P.x-24,P.y);c.lineTo(P.x-10,P.y);c.moveTo(P.x+10,P.y);c.lineTo(P.x+24,P.y);c.moveTo(P.x,P.y-24);c.lineTo(P.x,P.y-10);c.moveTo(P.x,P.y+10);c.lineTo(P.x,P.y+24);c.stroke()}
    c.restore();return}
  const left=Math.max(0,unbGateHold()-C.t),n=Math.ceil(left),fr=left-Math.floor(left),pulse=1+.18*Math.pow(fr,3),big=Math.min(VW,VH)*.16*pulse;
  c.font=`800 ${Math.round(big)}px "Big Shoulders Display","Arial Narrow",sans-serif`;c.fillStyle=n<=1?'#ffd27a':'#ece4cf';c.shadowColor=col;c.shadowBlur=24;c.globalAlpha=.55+.45*fr;c.fillText(String(Math.max(1,n)),cx,cy);c.shadowBlur=0;c.globalAlpha=1;
  const R=Math.min(VW,VH)*.12;c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=4;c.beginPath();c.arc(cx,cy,R,0,TAU);c.stroke();c.strokeStyle=col;c.beginPath();c.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+TAU*(C.t/unbGateHold()));c.stroke();
  c.font='600 13px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.9)';c.fillText(`JUMP TO ${to.toUpperCase()} · HOLD ALIGNMENT`,cx,cy+R+20);c.restore()}
function gateTransit(J,dt){const p=W.player,g=J.g,l=hyp(g.x,g.y,g.z)||1,dx=g.x/l,dy=g.y/l,dz=g.z/l;
  qSlerp(p.q,qLook(dx,dy,dz,0,1,0,_tq),Math.min(1,3.2*dt));
  if(J.t<.55){const k=Math.min(1,3.5*dt);p.x+=(g.x-p.x)*k;p.y+=(g.y-p.y)*k;p.z+=(g.z-p.z)*k;p.vx=(g.x-p.x)*3;p.vy=(g.y-p.y)*3;p.vz=(g.z-p.z)*3}
  else{const sp=260+(J.t-.55)*(J.t-.55)*4200;p.vx=dx*sp;p.vy=dy*sp;p.vz=dz*sp;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt}
  p.thrusting=true;p.boosting=J.t>.55;W.shake=Math.max(W.shake||0,.1+J.t*.12);
  const f=$('fade');f.style.opacity=clamp((J.t-JUMP_OUT+.35)/.35,0,1)}
let FJFX=0;function frigWarpStart(){FJFX=performance.now();const B=W&&W.bridge;if(B){B.yaw=Math.round(B.yaw/TAU)*TAU;B.pitch=0}}
function warpStreaks3D(){const B=W.bridge;if(!B||!FJFX)return;const a=(performance.now()-FJFX)/1000;if(a>1.6)return;const F=B.f,O=bridgeOrigin(F),k=a<.75?Math.min(1,a/.15):Math.max(0,1-(a-.75)/.2);
  const at=(x,y,z)=>{qRot(F.q,x,y,z,_u);return[O.x+_u.x,O.y+_u.y,O.z+_u.z]};
  if(k>0)for(let i=0;i<170;i++){const h1=Math.sin(i*12.9898)*43758.5453,h2=Math.sin(i*78.233)*12345.678,h3=Math.sin(i*39.425)*24634.6345,fx=h1-Math.floor(h1),fy=h2-Math.floor(h2),sd=h3-Math.floor(h3);
    const side=i%3,u=(sd+a*2.4)%1,len=60+520*k;let x,y,z;if(side===0){x=(fx-.5)*1400;y=(fy-.5)*700;z=1800-u*1800+40}else{const sg=side===1?1:-1;x=sg*(60+fx*900);y=(fy-.5)*600;z=1500-u*2400}
    const h=at(x,y,z),tl=at(x,y,z+len),col=i%6===0?[.7,.82,1]:[.9,.94,1];streak(h[0],h[1],h[2],tl[0],tl[1],tl[2],2.2+3*k,col,.8*k)}
  const fl=a<.7?0:a<.78?(a-.7)/.08:Math.max(0,1-(a-.78)/.8);if(fl>0){const g=at(0,4,700);sprite(g[0],g[1],g[2],1600*fl,[1,1,1],.9*fl);sprite(g[0],g[1],g[2],600,[.75,.88,1],.8*fl)}}
function frigWarpFx(c){if(!FJFX)return;const a=(performance.now()-FJFX)/1000;if(a>1.6){FJFX=0;const el=$('fcon');if(el)el.style.visibility='';return}const cx=VW/2,cy=VH/2,R=Math.hypot(VW,VH)*.62;
  {const el=$('fcon');if(el)el.style.visibility='hidden'}
  const k=W.bridge?0:a<.75?Math.min(1,a/.15):Math.max(0,1-(a-.75)/.2);
  if(k>0){c.save();c.lineCap='round';for(let i=0;i<160;i++){const h1=Math.sin(i*12.9898)*43758.5453,h2=Math.sin(i*78.233)*12345.678,an=(h1-Math.floor(h1))*TAU,sd=h2-Math.floor(h2),u=((sd+a*2.6)%1),r0=R*u*u,len=R*(.08+.4*k)*u;c.strokeStyle=i%6===0?`rgba(170,205,255,${.7*k})`:`rgba(225,236,255,${.55*k})`;c.lineWidth=1+u*3*k;c.beginPath();c.moveTo(cx+Math.cos(an)*r0,cy+Math.sin(an)*r0);c.lineTo(cx+Math.cos(an)*(r0+len),cy+Math.sin(an)*(r0+len));c.stroke()}
    const g=c.createRadialGradient(cx,cy,0,cx,cy,R*.45);g.addColorStop(0,`rgba(200,225,255,${.3*k})`);g.addColorStop(1,'rgba(200,225,255,0)');c.fillStyle=g;c.fillRect(0,0,VW,VH);c.restore()}
  const fl=a<.7?0:a<.78?(a-.7)/.08:Math.max(0,1-(a-.78)/.8);if(fl>0){c.fillStyle=`rgba(240,246,255,${(W.bridge?.4:.9)*fl})`;c.fillRect(0,0,VW,VH)}}
function frigArriveFx(e){if(!W)return;W.fx.push({x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,life:.9,max:.9,c:[1,1,1],sz:e.st.radius*1.25*7,flash:true});W.fx.push({x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,life:1.4,max:1.4,c:[.7,.85,1],sz:e.st.radius*1.25*4,flash:true});const v=vAt(e);if(v>.03)SFX.arrive(Math.min(1,v*1.5))}
function jumpFx(c){const out=W.jump,k=out?clamp((out.t-.25)/1.1,0,1):JIN.t<JIN.d?1-JIN.t/JIN.d:0;if(k<=0)return;
  const cx=VW/2,cy=VH/2,R=Math.hypot(VW,VH)*.6,now=performance.now()/1000,col=FAC(S.player.faction).col;
  c.save();c.lineCap='round';for(let i=0;i<110;i++){const a=i*2.399963,sd=(i*0.6180339)%1,u=((sd+now*(.55+k*1.6))%1),r0=R*u*u,len=R*(.04+.22*k)*u;
    c.strokeStyle=i%5===0?hexA(col,.55*k):`rgba(210,228,255,${.45*k})`;c.lineWidth=1+u*2*k;c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len));c.stroke()}
  const g=c.createRadialGradient(cx,cy,0,cx,cy,R*.5);g.addColorStop(0,`rgba(200,225,255,${.18*k})`);g.addColorStop(1,'rgba(200,225,255,0)');c.fillStyle=g;c.fillRect(0,0,VW,VH);c.restore()}
function doJump(to){
  const from=W.sid,h=S.outposts.hollow;
  if((from==='ho'||to==='ho')&&h.owner&&h.owner!=='player'&&h.owner!==S.player.faction){const n=transfer('player',h.owner,40);if(n)feed(`Paid ${n} cr gate toll to ${sideName(h.owner)} at Hollow Relay.`,'news')}
  exitSector();S.player.sector=to;const g=GATES[to].find(g=>g.to===from);const l=hyp(g.x,g.y,g.z),ux=-g.x/l,uy=-g.y/l,uz=-g.z/l;
  const P=S.player;P.x=g.x+ux*230;P.y=g.y+uy*230;P.z=g.z+uz*230;P.vx=ux*180;P.vy=uy*180;P.vz=uz*180;const q=qLook(ux,uy,uz,0,1,0,q0());P.q=[q.x,q.y,q.z,q.w];
  enterSector(to);if(NET.cl){const q=W.player;netSend({t:'jump',to,x:q.x,y:q.y,z:q.z,vx:q.vx,vy:q.vy,vz:q.vz,q:[q.q.x,q.q.y,q.q.z,q.q.w]})}setTimeout(()=>{$('fade').style.opacity=0},120);save();
  feed(`Arrived in ${DEF[to].name}.`,'news');
}
function dockTarget(){const p=W.player;for(const e of W.ents){if((e.type==='station'||e.type==='outpost')&&d3(e,p)<(e.type==='outpost'?(e.r||95)+(e.r>95?260:195):290))return e}return null}
function canDock(E){if(S.unb){if(E.type==='station')return E.fac==='pirate'||(E.fac==='neutral'&&unbFreeportOK());return!!E.o&&!E.o.breached&&E.o.owner==='pirate'}if(E.type==='station')return E.fac===S.player.faction||E.fac==='player'||E.fac==='neutral';const o=E.o;return!o.breached&&(o.owner==='player'||o.owner===S.player.faction)}
// what E would dock with: the nearest of your frigate, a friendly heavy bomber's turret, or a station / outpost in range
function myFrigNear(){const p=W&&W.player;if(!p)return null;let b=null,bd=1e9;for(const e of W.ents)if(e.role==='frigate'&&e.tok&&fBoard(e.tok)&&e.alive){const d=d3(e,p);if(d<e.st.radius*1.25+320&&d<bd){bd=d;b=e}}return b}
function dockChoice(){if(!W||!W.player||W.dead||S.player.docked)return null;const p=W.player,c=[];
  const F=myFrigNear();if(F)c.push({k:'frigate',e:F,d:d3(F,p)-F.st.radius*1.25});
  const gb=seatCandidate();if(gb)c.push({k:'turret',e:gb,d:d3(gb,p)-gb.st.radius*1.25});
  const E=dockTarget();if(E)c.push({k:E.type,e:E,d:d3(E,p)-(E.r||100)});
  if(!c.length){const L=landCandidate();if(L)c.push({k:'land',e:L.a,d:L.d})}
  c.sort((a,b)=>a.d-b.d);{const tg=W.tgt&&W.tgt.ref,pf=tg&&c.find(x=>x.e===tg);if(pf)return pf}return c[0]||null}
function tryDock(){if(W&&W.docking){abortDocking('Docking aborted.');return false}
  const ch=dockChoice(),p=W.player;
  if(ch&&ch.k==='turret'){if(!seatOk(ch.e))return false;return startDocking(ch.e,'turret')}
  if(ch&&ch.k==='frigate'){const F=ch.e;if(hyp(p.vx-F.vx,p.vy-F.vy,p.vz-F.vz)>140){flash('Match speed with the capital ship to dock (under 140 m/s relative).');return false}return startDocking(F,'frigate')}
  if(ch&&ch.k==='land')return landOn(ch.e);
  const E=ch&&ch.e;if(!E){flash('Nothing to dock with nearby.');return false}
  if(!canDock(E)){flash(E.type==='station'?'Hostile station. Docking refused.':E.o.owner?'This outpost is not yours or your faction\'s.':'Unclaimed outpost. Hold its ring with a Claim Beacon to claim it.',true);return false}
  if(hyp(p.vx,p.vy,p.vz)>180){flash('Too fast to dock. Slow below 180 m/s.');return false}
  return startDocking(E,E.type);
}
function finishDock(E){const p=W.player;if(p.stealth){p.stealth=false;p.masked=false;p.maskR=0}SFX.clunk();recallPlayerDrones();{const C=S.player.convoy;if(C&&!NET.cl){convoyPack();const fr=E.type==='station'?E.fac:E.o&&E.o.owner;if(W.sid===C.dest&&(fr===S.player.faction||fr==='neutral'))convoyEnd(true)}}S.player.docked=E.type==='station'?'station':E.o.id;p.vx=p.vy=p.vz=0;p.x=E.x;p.y=E.y-E.r-40;p.z=E.z;W.tgt=null;ghostSync();if(NET.cl)netSend({t:'dock',d:S.player.docked});openDock();save();return true}
function seatOk(e){const p=W.player;if(hyp(p.vx-e.vx,p.vy-e.vy,p.vz-e.vz)>140){flash('Match speed with the heavy bomber to board its turret (under 140 m/s relative).');return false}
  if(e.tur&&e.tur.gunner&&e.tur.gunner!=='local'){flash('That turret is already manned.',true);return false}return true}
// ---- docking ports: the tips of a structure's arms, found from the model (farthest points around its vertical axis).
// Each port is centred on its arm's tip; ships dock nose-in at the nearest one and launch back out along the same arm.
const PORTS={},_dpq=q0(),_dpq2=q0(),_dpv={x:0,y:0,z:0};
function mdlPorts(name){if(name in PORTS)return PORTS[name];const M=MDL.ready&&MDL.i[name];if(!M)return null;if(M.pt&&M.pt.length)return PORTS[name]=M.pt.map(v=>v.map(x=>x*M.s));const n=M.n,P=new Int16Array(MDL.b,M.o,n*9),NB=72,best=new Array(NB).fill(null);let maxR=0;
  const ang=(a,b)=>Math.abs(((a-b+3*Math.PI)%TAU)-Math.PI);
  for(let i=0;i<n*3;i++){const x=P[i*3]/32767,z=P[i*3+2]/32767,r=Math.hypot(x,z);if(r<.05)continue;const b=((Math.round(Math.atan2(z,x)/TAU*NB)%NB)+NB)%NB;if(!best[b]||r>best[b][0])best[b]=[r,Math.atan2(z,x)];if(r>maxR)maxR=r}
  const pk=[];for(let b=0;b<NB;b++){const c=best[b];if(!c||c[0]<maxR*.72)continue;let top=true;for(let d=-4;d<=4;d++){if(!d)continue;const o=best[(b+d+NB)%NB];if(o&&(o[0]>c[0]||(o[0]===c[0]&&d<0))){top=false;break}}if(top)pk.push(c)}
  pk.sort((a,b)=>b[0]-a[0]);const out=[];
  for(const c of pk){let sx=0,sy=0,sz=0,sn=0;for(let i=0;i<n*3;i++){const x=P[i*3]/32767,z=P[i*3+2]/32767,r=Math.hypot(x,z);if(r<c[0]*.86||ang(Math.atan2(z,x),c[1])>.32)continue;sx+=x;sy+=P[i*3+1]/32767;sz+=z;sn++}
    if(!sn)continue;const a=Math.atan2(sz,sx),r=c[0];if(out.some(o=>ang(o.a,a)<.6))continue;out.push({a,v:[Math.cos(a)*r*M.s,sy/sn*M.s,Math.sin(a)*r*M.s]});if(out.length>=6)break}
  return PORTS[name]=out.length?out.map(o=>o.v):null}
function portName(E){if(!E)return null;return E.type==='station'?(E.fac==='brood'?null:E.kind==='depot'?'depot':'station'):E.o?opModel(E.o):null}
// ports in world space right now: position and outward direction (outposts turn slowly, so these move)
function portsW(E){const nm=portName(E),P=nm&&mdlPorts(nm);if(!P)return null;const isSt=E.type==='station',k=isSt?(E.sc||1):1;
  const q=isSt?(E.q||q0()):qMul(E.q||q0(),qAxis(0,1,0,W.t*.03,_dpq2),_dpq);
  return P.map(v=>{qRot(q,v[0]*k,v[1]*k,v[2]*k,_dpv);const x=E.x+_dpv.x,y=E.y+_dpv.y,z=E.z+_dpv.z;qRot(q,v[0],0,v[2],_dpv);const l=hyp(_dpv.x,_dpv.y,_dpv.z)||1;return{x,y,z,dx:_dpv.x/l,dy:_dpv.y/l,dz:_dpv.z/l}})}
function nearestPort(E,pos){const L=portsW(E);if(!L)return-1;let b=0,bd=1e18;L.forEach((p,i)=>{const d=(p.x-pos.x)**2+(p.y-pos.y)**2+(p.z-pos.z)**2;if(d<bd){bd=d;b=i}});return b}
// ---- frigate hull berths: a pilot's ship docks flush against an open stretch of the frigate's bow (right, left, belly or
// top), belly to the plating. While its pilot is on the bridge the ship is drawn as part of the frigate (no hit box, so it
// can't be harmed); leaving the bridge releases the clamps and the ship drifts clear before the pilot takes the stick.
const BERTHS=[[1,0,0],[-1,0,0],[0,-1,0],[0,1,0]],BERTH_Z=.6,BERTH_LIFT=[.05,.06,.07],_bv1={x:0,y:0,z:0},_bq1=q0(),_bp={x:0,y:0,z:0,q:q0()},_bp2={x:0,y:0,z:0,q:q0()};const BERTH_C={};
// berths come from each capital's own model; a faction carrier instead takes ships in through its bow bay doors (carBay)
function capMdlKey(F){const k=F&&(F.fac==='brood'?BROOD_MDL[F.cls]:F.cls);return MDL.ready&&k&&MDL.i[k]?k:(MDL.ready&&MDL.i.frigate?'frigate':null)}
function carBay(F){return!!(F&&F.tok&&isCar(F.tok)&&F.fac!=='brood'&&MDL.ready&&MDL.i.carrier&&MDL.i.carrier.pt&&MDL.i.carrier.pt.length>=3)}
function frigBerths(F){const key=capMdlKey(F);if(!key)return null;if(BERTH_C[key])return BERTH_C[key];const M=MDL.i[key];const P=new Int16Array(MDL.b,M.o,M.n*9);
  return BERTH_C[key]=BERTHS.map(n=>{let m=0;for(let i=0;i<M.n*3;i++){const x=P[i*3]/32767,y=P[i*3+1]/32767,z=P[i*3+2]/32767;if(Math.abs(z-BERTH_Z)>.16||(n[0]?Math.abs(y):Math.abs(x))>.07)continue;const d=x*n[0]+y*n[1];if(d>m)m=d}return{n,s:m}})}
// where berth i puts a ship of class cls on frigate F right now: position, orientation and the outward normal
function berthPose(F,i,cls,out){if(carBay(F)){   // a carrier's flight deck aft of the island: two spots fore, two aft; ships set down on it from above
    const pt=MDL.i.carrier.pt,k=F.st.radius*1.25,sc=(CLASSES[cls]||CLASSES.interceptor).radius*1.25,b=pt[(i&3)<2?0:1],xo=((i&1)?.045:-.045);
    qRot(F.q,(b[0]+xo)*k,b[1]*k+sc*.32,b[2]*k,_bv1);out.x=F.x+_bv1.x;out.y=F.y+_bv1.y;out.z=F.z+_bv1.z;qCopy(out.q,F.q);qRot(F.q,0,1,0,_bv1);out.nx=_bv1.x;out.ny=_bv1.y;out.nz=_bv1.z;
    out.bay=0;return out}
  out.bay=0;const B=frigBerths(F);if(!B)return null;const b=B[i&3],k=F.st.radius*1.25,sc=(CLASSES[cls]||CLASSES.interceptor).radius*1.25,g=b.s*k+sc*.34;
  qRot(F.q,b.n[0]*g,b.n[1]*g,BERTH_Z*k,_bv1);out.x=F.x+_bv1.x;out.y=F.y+_bv1.y;out.z=F.z+_bv1.z;
  qLook(0,0,1,b.n[0],b.n[1],b.n[2],_bq1);qMul(F.q,_bq1,out.q);qRot(F.q,b.n[0],b.n[1],b.n[2],_bv1);out.nx=_bv1.x;out.ny=_bv1.y;out.nz=_bv1.z;return out}
function nearestBerth(F,pos,cls){if(!carBay(F)&&!frigBerths(F))return null;let b=0,bd=1e18;for(let i=0;i<4;i++){const o=berthPose(F,i,cls,_bp2),d=(o.x-pos.x)**2+(o.y-pos.y)**2+(o.z-pos.z)**2;if(d<bd){bd=d;b=i}}return b}
// every ship berthed on a frigate in this sector: yours, other pilots' (synced from the host), and the host's own
function drawBerthed(){const fr=W.ents.filter(e=>e.role==='frigate'&&e.alive&&e.tok);if(!fr.length)return;const list=[];
  if(W.bridge&&W.bridge.f.alive)list.push([W.bridge.f,S.player.bslot|0,S.player.cls,S.player.faction]);
  if(NET.on){const me=NET.cl?MP.pid:NET.me;for(const pid in S.pilots||{}){if(pid===me)continue;const P=S.pilots[pid];if(P.docked!=='bridge'||P.bridgeId==null)continue;const F=fr.find(e=>e.tok.id===P.bridgeId);if(F)list.push([F,P.bslot|0,P.cls,P.faction])}
    const H=S.hostAtt;if(NET.cl&&H){const F=fr.find(e=>e.tok.id===H.id);if(F)list.push([F,H.slot|0,H.cls,H.fac])}}
  for(const[F,i,cls,fac]of list){const bp=berthPose(F,i,cls,_bp2);if(!bp||bp.bay||!inView(bp.x,bp.y,bp.z,80))continue;const sc=CLASSES[cls].radius*1.25,m=shipMesh(fac,cls);mModel(MM,bp.x,bp.y,bp.z,bp.q,sc,sc,sc);drawMesh(m.hull,MM,ONE3,BERTH_LIFT);drawMesh(m.rim,MM)}}
function detachUpdate(dt){const D=W.detach,p=W.player,F=D.F;D.t+=dt;if(!F.alive||!W.ents.includes(F)){W.detach=null;return}
  const bp=berthPose(F,D.slot,S.player.cls,_bp);if(!bp){W.detach=null;return}const sc=p.st.radius*1.25,T=1.8,k=Math.min(1,D.t/T),e=k*k*(3-2*k),dist=sc*2.4+40;
  p.x=bp.x+bp.nx*dist*e;p.y=bp.y+bp.ny*dist*e;p.z=bp.z+bp.nz*dist*e;p.vx=F.vx;p.vy=F.vy;p.vz=F.vz;p.thrusting=false;p.boosting=false;p.mining=null;
  if(D.t<.45)qCopy(p.q,bp.q);else qSlerp(p.q,F.q,Math.min(1,dt*2.4));
  if(!D.st&&D.t>.05){D.st=1;SFX.dockClamp()}
  if(k>=1){W.detach=null;p.vx=F.vx+bp.nx*70;p.vy=F.vy+bp.ny*70;p.vz=F.vz+bp.nz*70;flash('Clear of the capital ship. You have the stick.')}}
// docking takes DOCK_T seconds: the ship is drawn up over the hangar, then lowered into it. You stay in space, and shootable, until it seals.
const DOCK_T=window.__fastDock?.05:5,_dk={x:0,y:0,z:0},_dkq=q0();
function dockUp(E){if(E.q)qRot(E.q,0,1,0,_dk);else{_dk.x=0;_dk.y=1;_dk.z=0}return _dk}
function dockR(D){const E=D.E;return D.kind==='station'||D.kind==='outpost'?(E.r||95):E.st.radius*1.25}
function dockValid(D){const E=D.E;if(D.kind==='station')return W.stationEnt===E&&canDock(E);if(D.kind==='outpost')return W.outpostEnt===E&&canDock(E);
  if(!E.alive||!W.ents.includes(E))return false;if(D.kind==='turret')return!(E.tur&&E.tur.gunner&&E.tur.gunner!=='local');return true}
function startDocking(E,kind){const p=W.player;apOn=false;W.docking={E,kind,t:0,st:0,ox:p.x-E.x,oy:p.y-E.y,oz:p.z-E.z,port:null};if(kind==='station'||kind==='outpost'){const pi=nearestPort(E,p);if(pi>=0)W.docking.port=pi}if(kind==='frigate')W.docking.berth=nearestBerth(E,p,S.player.cls);SFX.dockGrab();
  flash(kind==='frigate'?(carBay(E)?`Landing on ${E.tok.name}'s flight deck in ${DOCK_T} s. E to abort.`:`Docking with ${E.tok.name}: hangar lift in ${DOCK_T} s. E to abort.`):kind==='turret'?`Boarding the heavy bomber turret in ${DOCK_T} s. E to abort.`:`Docking clamps engaged: ${DOCK_T} s to the hangar. E to abort.`);return true}
function abortDocking(msg){const D=W&&W.docking;if(!D)return;W.docking=null;dockHydStop();const p=W.player,E=D.E;p.vx=E.vx||0;p.vy=E.vy||0;p.vz=E.vz||0;SFX.dockAbort();if(msg)flash(msg,true)}
function dockingUpdate(dt){const D=W.docking,p=W.player,E=D.E;pbuildTick(dt);
  if(W.dead||!p.alive){W.docking=null;dockHydStop();return}
  if(!dockValid(D)){abortDocking(D.kind==='frigate'?'Docking aborted: the ship is gone.':D.kind==='turret'?'Boarding aborted.':'Docking aborted: clearance withdrawn.');return}
  D.t+=dt;const R=dockR(D),u=dockUp(E),pt=D.port!=null?(portsW(E)||[])[D.port]:null,sm=k=>k*k*(3-2*k);let ax,ay,az,bx,by,bz,tq=null,x,y,z;
  // stations and outposts: hold off the tip of the nearest arm, turn nose-in, then slide onto the tip and lock
  const bF=D.kind==='frigate'&&D.berth!=null?berthPose(E,D.berth,S.player.cls,_bp):null;
  // frigates: hold off an open stretch of the bow, roll belly-to-hull, then the clamps draw the ship flush against the plating
  if(bF){const fa=p.st.radius*1.25*2.6+50+(bF.bay?E.st.radius*1.25*.4:0);ax=bF.x+bF.nx*fa;ay=bF.y+bF.ny*fa;az=bF.z+bF.nz*fa;bx=bF.x;by=bF.y;bz=bF.z;tq=bF.bay?bF.qIn:bF.q}
  else if(pt){const sc=p.st.radius*1.25,fa=sc*2.4+40,fb=sc*1.05;ax=pt.x+pt.dx*fa;ay=pt.y+pt.dy*fa;az=pt.z+pt.dz*fa;bx=pt.x+pt.dx*fb;by=pt.y+pt.dy*fb;bz=pt.z+pt.dz*fb;tq=qLook(-pt.dx,-pt.dy,-pt.dz,u.x,u.y,u.z,_dkq)}
  else{const hA=R+(D.kind==='turret'?45:D.kind==='frigate'?90:130),hB=D.kind==='turret'?0:R*(D.kind==='frigate'?.12:.3);ax=E.x+u.x*hA;ay=E.y+u.y*hA;az=E.z+u.z*hA;bx=E.x+u.x*hB;by=E.y+u.y*hB;bz=E.z+u.z*hB}
  if(D.t<2){const k=sm(D.t/2);x=E.x+D.ox+(ax-E.x-D.ox)*k;y=E.y+D.oy+(ay-E.y-D.oy)*k;z=E.z+D.oz+(az-E.z-D.oz)*k}
  else{const k=sm(Math.min(1,(D.t-2)/(DOCK_T-2)));x=ax+(bx-ax)*k;y=ay+(by-ay)*k;z=az+(bz-az)*k}
  p.x=x;p.y=y;p.z=z;p.vx=E.vx||0;p.vy=E.vy||0;p.vz=E.vz||0;p.thrusting=false;p.boosting=false;p.mining=null;
  if(tq)qSlerp(p.q,tq,Math.min(1,dt*(D.t<2?1.8:4)));else if(E.q)qSlerp(p.q,E.q,Math.min(1,dt*(D.t<2?1.6:4)));else levelRoll(p,dt);
  if(D.st===0&&D.t>=2){D.st=1;SFX.dockClamp()}
  if(!D.sc&&D.t>=.6){D.sc=1;SFX.dockScan()}if(D.t>=1.1&&D.t<2.1&&D.t>=(D.rcsT||1.1)){D.rcsT=D.t+rnd(.25,.45);SFX.rcs()}if(!D.dd&&D.t>=DOCK_T-.6){D.dd=1;SFX.dockDoor()}
  if(D.st>=1&&D.st<5&&D.t>=2+.65*D.st){D.st++;SFX.dockClank(D.st)}
  if(D.t>=DOCK_T){W.docking=null;dockHydStop(true);SFX.dockSeal();
    if(D.port!=null)W.dockPort=D.port;if(D.berth!=null)S.player.bslot=D.berth;if(D.kind==='frigate')enterBridge(E);else if(D.kind==='turret'){if(!enterSeat(E))flash('Boarding failed.',true)}else finishDock(E)}}
function drawDocking(c){const D=W.docking;if(!D)return;const k=Math.min(1,D.t/DOCK_T),w=Math.min(320,VW*.6),x=VW/2-w/2,y=VH*.72;
  c.fillStyle='rgba(4,10,18,.65)';c.fillRect(x-10,y-26,w+20,46);c.fillStyle='rgba(111,183,255,.25)';c.fillRect(x,y,w,8);c.fillStyle='#6fb7ff';c.fillRect(x,y,w*k,8);
  c.font='700 13px "Big Shoulders Display",sans-serif';c.textAlign='center';c.fillStyle='#cfe6ff';
  c.fillText(`${D.kind==='turret'?'BOARDING TURRET':D.berth!=null&&carBay(D.E)?(D.t<2?'LANDING · LINING UP OVER THE FLIGHT DECK':'LANDING · SETTING DOWN ON THE DECK'):D.berth!=null?(D.t<2?'DOCKING · LINING UP ON THE HULL':'DOCKING · HULL CLAMPS DRAWING YOU IN'):D.port!=null?(D.t<2?'DOCKING · LINING UP ON THE ARM':'DOCKING · ARM CLAMPS DRAWING YOU IN'):D.t<2?'DOCKING · ALIGNING OVER HANGAR':'DOCKING · LOWERING INTO HANGAR'}  ${Math.max(0,DOCK_T-D.t).toFixed(1)} s  ·  E TO ABORT`,VW/2,y-9)}
function undock(){const P=S.player;if(!P.docked||!W)return;if(P.docked==='lair'){P.docked=null;$('dock').hidden=true;const p=W.player;p.alive=true;{const L=(S.lairs||[]).find(x=>x.id===P.lairId),o=rdir(.3),B=L||p,r=L?LAIR_R+p.st.radius*1.25+40:0;p.x=B.x+o.x*r;p.y=B.y+o.y*r;p.z=B.z+o.z*r;faceInstant(p,o.x,o.y,o.z);p.vx=o.x*60;p.vy=o.y*60;p.vz=o.z*60}setTimeout(launchPlayerDrones,0);cam.snap=true;if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]});save();return}if(NET.host)setTimeout(()=>crewLaunch(NET.me),400);setTimeout(launchPlayerDrones,0);setTimeout(convoyLaunch,0);SFX.clunk();const E=P.docked==='station'?W.stationEnt:W.outpostEnt;P.docked=null;const p=W.player;const L=portsW(E);
  if(L&&L.length){const pt=L[W.dockPort!=null&&L[W.dockPort]?W.dockPort:Math.floor(Math.random()*L.length)],sc=p.st.radius*1.25,f=sc*1.3+25,u=dockUp(E);p.x=pt.x+pt.dx*f;p.y=pt.y+pt.dy*f;p.z=pt.z+pt.dz*f;p.vx=pt.dx*110+(E.vx||0);p.vy=pt.dy*110;p.vz=pt.dz*110+(E.vz||0);qLook(pt.dx,pt.dy,pt.dz,u.x,u.y,u.z,p.q)}
  else{const o=rdir(.8),B0=E||p,rr=(E&&E.r||0)+90;p.x=B0.x+o.x*rr;p.y=B0.y+o.y*rr;p.z=B0.z+o.z*rr;p.vx=o.x*120;p.vy=o.y*120;p.vz=o.z*120;faceInstant(p,o.x,o.y,o.z)}W.dockPort=null;cam.snap=true;$('dock').hidden=true;p.alive=true;if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]});save()}
let flashMsg=null;
function flash(m,alert){if(CTX&&NET.host&&CTX!==NET.me){netMsg(CTX,'flash',m,alert);return}if(MUTE&&!CTX)return;if(alert&&!CTX&&(!flashMsg||flashMsg.m!==m||performance.now()-flashMsg.t>2000))SFX.uiErr();flashMsg={m,alert,t:performance.now()}}

// ============================================================ world update
function segHit(ax,ay,az,bx,by,bz,c,R){const dx=bx-ax,dy=by-ay,dz=bz-az,L2=dx*dx+dy*dy+dz*dz;let t=L2?((c.x-ax)*dx+(c.y-ay)*dy+(c.z-az)*dz)/L2:0;t=clamp(t,0,1);const px=ax+dx*t-c.x,py=ay+dy*t-c.y,pz=az+dz*t-c.z;return px*px+py*py+pz*pz<R*R}
function physics(e,dt){if(e.inJump)return;
  const pl=e.isPlayer||e.rp,bm=pl?(CLASSES[e.cls].boost||1):1,cap=e.st.maxSpd*(pl&&e.boosting?1.95*bm:e.npc&&(e.role==='flee'||(e.role==='scout'&&e.boosting))?1.4:1);
  const v=hyp(e.vx,e.vy,e.vz);if(v>cap){const k=Math.min(1,(pl?(e.boosting?2:.75):3)*dt),f=1-k+k*cap/v;e.vx*=f;e.vy*=f;e.vz*=f}
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  const r=hyp(e.x,e.y,e.z);if(r>3300*SPACE){e.vx-=e.x/r*400*dt;e.vy-=e.y/r*400*dt;e.vz-=e.z/r*400*dt}
  e.cool-=dt;if(!e.landed)e.energy=Math.min(e.st.eCap,e.energy+e.st.eRegen*dt*(e.boot&&W.t<e.boot?4:1)*(e.st.surge&&W.t-(e.lastFire||-9)<e.st.surge?(e.st.surgeK||0):1));
  if(!(S.sectors[W.sid].storm>S.T)&&W.t-e.lastHit>(e.st.shDelay||2.5)&&!e.landed&&!e.stealth&&!(e.boot&&W.t<e.boot))e.shield=Math.min(e.st.sCap,e.shield+e.st.sCap*(e.cls==='frigate'||e.cls==='carrier'?.012*pmul(e.tok,'shd'):e.cls==='escort'?.025*pmul(e.tok,'shd'):.09*(e.st.shRegK||1))*dt*(W.haze&&e.side!=='brood'&&!e.st.hazeImm?.85:1));
  if(e.shDown&&e.shield>e.st.sCap*.2){e.shDown=false;e.shUpT=W.t}
  jamDrain(e,dt);if(e.spores&&e.spores.length&&e.side!=='brood'){e.spores=e.spores.filter(t=>t>W.t);if(e.spores.length&&e.hull>1)e.hull=Math.max(1,e.hull-.5*e.spores.length*dt)}
  if(e.side==='brood'&&W.t-e.lastHit>3&&e.hull<e.st.hull&&!(e.noRegen>W.t))e.hull=Math.min(e.st.hull,e.hull+e.st.hull*.025*dt);
  const s=S.sectors[W.sid],R=e.st.radius;
  for(const a of s.ast){if((e.landed&&e.landed.aid===a.id)||(e.lurk&&e.lurk.aid===a.id))continue;   // a ship set down on this rock sits on its real surface (astLandPlace)
    const ar=astR(a),dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z,d=hyp(dx,dy,dz);if(d<ar+R&&d>0){const nx=dx/d,ny=dy/d,nz=dz/d,vn=e.vx*nx+e.vy*ny+e.vz*nz;e.x=a.x+nx*(ar+R);e.y=a.y+ny*(ar+R);e.z=a.z+nz*(ar+R);if(vn<0){e.vx-=1.5*vn*nx;e.vy-=1.5*vn*ny;e.vz-=1.5*vn*nz;if(-vn>160)damageShip(e,(-vn-160)*.06,null)}}}
  for(const E of[W.stationEnt,W.outpostEnt]){if(!E)continue;const dx=e.x-E.x,dy=e.y-E.y,dz=e.z-E.z,d=hyp(dx,dy,dz),rr=E.type==='station'?55:72;if(d<rr+R&&d>0){e.x=E.x+dx/d*(rr+R);e.y=E.y+dy/d*(rr+R);e.z=E.z+dz/d*(rr+R);const vn=(e.vx*dx+e.vy*dy+e.vz*dz)/d;if(vn<0){e.vx-=1.3*vn*dx/d;e.vy-=1.3*vn*dy/d;e.vz-=1.3*vn*dz/d}}}
  if(W.works&&W.works.length)wkCollide(e,R);
}
// station, outpost and capital turrets lead their target perfectly, then scatter on every axis by a spread that grows with
// range: A + B*d + C*d² metres (d = range), one curve for ships and one for torpedoes. Tuned against a Light Fighter
// strafing at 250 m/s for 80/60/40% hits at 600/900/1,200 m, and an inbound torpedo for 70/50/30%.
let TUR={ship:[19.8,-.0126,1.52e-5],torp:[6.5,.0215,0]};
function turretShot(from,t,spd,dmg,side,len,snd){if(!snd){const v=vAt(from);if(v>.08&&W.t-(W.turSnd||0)>.45){W.turSnd=W.t;SFX.turret(v*.8)}}const lp=leadPoint({x:from.x,y:from.y,z:from.z,vx:0,vy:0,vz:0},t,spd);const dd=d3(lp,from),TK=t&&t.kind==='torpedo'?TUR.torp:TUR.ship,jd=TK[0]+TK[1]*dd+TK[2]*dd*dd;let dx=lp.x-from.x+rnd(-jd,jd),dy=lp.y-from.y+rnd(-jd,jd),dz=lp.z-from.z+rnd(-jd,jd);const l=hyp(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  W.shots.push({x:from.x+dx*len,y:from.y+dy*len,z:from.z+dz*len,vx:dx*spd,vy:dy*spd,vz:dz*spd,dmg,side,src:null,ttl:1,col:sideCol(side),sty:'turret',snd});return{x:dx,y:dy,z:dz}}
function structUpdate(dt){
  const SE=W.stationEnt;hgLive(dt);
  if(SE&&SE.rec){SE.rec.shield=SE.shield;if(!SE.offline&&W.t-SE.lastHit>8)SE.rec.hull=Math.min(SE.rec.hMax,SE.rec.hull+SE.rec.hMax*.004*dt)}
  if(SE){const storm=S.sectors[W.sid].storm>S.T;
    if(SE.offline&&W.t>SE.offline){SE.offline=0;SE.shield=SE.sMax*.3;feed(`${SE.name} has restored its shield and turrets.`,'news')}
    if(!SE.offline&&W.t-SE.lastHit>6&&!storm)SE.shield=Math.min(SE.sMax,SE.shield+SE.sMax*.03*dt);
    if(!SE.offline)for(const[ti,tu]of SE.turrets.entries()){tu.cool-=dt;if(tu.cool>0)continue;if(tu.mod&&SE.rec&&starving(SE.rec)){tu.cool=1;continue}qRot(SE.q,tu.p[0],tu.p[1],tu.p[2],_u);const wp={x:SE.x+_u.x,y:SE.y+_u.y,z:SE.z+_u.z};let t=null,bd=SE.range;
      if(ti%2===0)for(const m of W.missiles)if(m.kind==='torpedo'&&(m.tgt===SE||(m.tgt&&m.tgt.type==='works'&&m.tgt.fac===SE.fac))&&hostile(SE.fac,m.side)){const d=d3(m,wp);if(d<Math.min(bd,700)){bd=d;t=m}}
      if(!t)for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.role==='limpet'||((e.isPlayer&&(S.player.docked||W.dead)||mHid(e,SE))))continue;if(!hostile(SE.fac,e.side))continue;const d=d3(e,wp);if(d<bd){bd=d;t=e}}
      if(t){tu.cool=SE.core?.45:.55;tu.aim=turretShot(wp,t,1300,STN[SE.kind||'core'].dmg*(1+.12*(SE.rec?devOf(SE.rec).def:0))*(t.role==='frigate'?3:1),SE.fac,22);if(t.role==='frigate')W.shots[W.shots.length-1].cap=true}else tu.cool=.3}}
  if(SE)stMissiles(SE,dt);
  const OE=W.outpostEnt;if(!OE)return;const o=OE.o,os=oStats(o);
  if(o.breached){if(S.T>o.breached+90){o.breached=0;o.hull=os.hMax*.25;feed(`${o.name} rebooted its defenses.`,'news')}if(Math.random()<.3)fxSpark({x:OE.x+rnd(-60,60),y:OE.y+rnd(-30,30),z:OE.z+rnd(-60,60)},'#ffb35a',1)}
  else{if(W.t-OE.lastHit>6&&!(S.sectors[W.sid].storm>S.T))o.shield=Math.min(os.sMax,o.shield+os.sMax*.04*dt);if(W.t-OE.lastHit>12)o.hull=Math.min(os.hMax,o.hull+os.hMax*.004*dt);
    if(o.owner){OE.cool-=dt;if(OE.cool<=0){let t=null,bd=os.range;for(const m of W.missiles)if(m.kind==='torpedo'&&m.tgt===OE&&hostile(o.owner,m.side)){const d=d3(m,OE);if(d<bd){bd=d;t=m}}if(!t)for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.role==='limpet'||((e.isPlayer&&(S.player.docked||W.dead)||mHid(e,OE))))continue;if(!hostile(o.owner,e.side))continue;const d=d3(e,OE);if(d<bd){bd=d;t=e}}
      if(t){OE.cool=1/os.rof;OE.aim=turretShot({x:OE.x,y:OE.y+40,z:OE.z},t,1250,os.dmg,o.owner,40)}else OE.cool=.25}}}
  const capturable=!o.owner||o.breached;
  if(capturable){
    const claim=new Set(),rpClaim={};let block=false,noBeacon=false;
    for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;if((e.isPlayer&&(S.player.docked||W.dead)||mHid(e)))continue;if(d3(e,OE)>450)continue;
      if(e.isPlayer){if(!S.unb&&(S.player.cargo.beacon||0)>0&&beaconCls(S.player.cls)&&o.owner!=='player'&&o.owner!==S.player.faction)claim.add('player');else if(o.owner==='player')block=true;else noBeacon=true}
      else if(e.rp){const R=S.pilots[e.rp];if(R&&(R.cargo.beacon||0)>0&&beaconCls(R.cls)&&o.owner!==e.side){claim.add(e.side);rpClaim[e.side]=e.rp}else if(o.owner===e.side)block=true;else if(W.t-(e.capMsgT||-9)>6){e.capMsgT=W.t;netMsg(e.rp,'flash',o.owner?'Defenses down. You need a Claim Beacon in your hold to take it.':'Unclaimed outpost. Carry a Claim Beacon into the ring to claim it.')}}
      else if(e.role==='strike'&&e.side!==o.owner)claim.add(e.side);
      if(o.owner&&e.side===o.owner&&!e.isPlayer)block=true;}
    if(claim.has('player'))claim.delete(S.player.faction);
    if(claim.size===1&&!block){const c=[...claim][0];if(o.cap.side!==c){o.cap.side=c;o.cap.p=0}o.cap.p+=dt/(c==='player'?12:16);
      if(o.cap.p>=1){if(c==='player'){inv.take(S.player.cargo,'beacon',1);const v=invVec({beacon:1});for(const e of RAWS)o.fort[e]+=v[e]}else if(rpClaim[c]){const RC=S.pilots[rpClaim[c]];inv.take(RC.cargo,'beacon',1);const v=invVec({beacon:1});for(const e of RAWS)o.fort[e]+=v[e];runAs(rpClaim[c],()=>feed(`You claimed ${o.name} for the ${FACTIONS[c].name}.`,'good'))}capture(o,c)}}
    else if(claim.size>1){if(W.t-W.capMsgT>4&&claim.has('player')){flash('Claim contested. Clear hostiles from the ring.',true);W.capMsgT=W.t}}
    else o.cap.p=Math.max(0,o.cap.p-dt*.15);
    if(noBeacon&&W.t-W.capMsgT>6){flash(o.owner?'Defenses down. You need a Claim Beacon in your hold to take it.':'Unclaimed outpost. Carry a Claim Beacon into the ring to claim it.');W.capMsgT=W.t}
  }else o.cap.p=Math.max(0,o.cap.p-dt*.3);
}
function shotsUpdate(dt){
  const s=S.sectors[W.sid],OE=W.outpostEnt,SE=W.stationEnt;
  for(let i=W.shots.length-1;i>=0;i--){const b=W.shots[i],ox=b.x,oy=b.y,oz=b.z;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.ttl-=dt;let hit=b.ttl<=0;
    if(!hit)for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===b.src)continue;if(e.role==='limpet'&&(b.sty==='turret'||b.cap))continue;if(e.isPlayer&&(S.player.docked||W.dead))continue;if(!hostile(b.side,e.side)&&!(S.unb&&((b.src&&b.src.rp&&e.side==='brood')||(e.rp&&b.side==='brood'))))continue;if(segHit(ox,oy,oz,b.x,b.y,b.z,e,e.st.radius*1.15+5)){if(b.jam){if(e.role==='frigate')capJamShot(e,b);else jamHit(e,b)}else damageShip(e,b.dmg,b.side,b,b.cap?'capital':'kinetic');if(b.cap)fxBoom(b,40,'#ffd9a0');hit=true;break}}
    if(!hit&&!(b.src&&b.src.cls!=='frigate'))for(const m of W.missiles){if(m.kind!=='torpedo'||!hostile(b.side,m.side))continue;if(segHit(ox,oy,oz,b.x,b.y,b.z,m,16)){m.hp-=b.dmg;fxSpark(m,'#ffe0b0',3);if(m.hp<=0)killTorp(m,b.side);hit=true;break}}
    if(!hit&&OE&&OE.o.owner&&!OE.o.breached&&hostile(b.side,OE.o.owner)&&segHit(ox,oy,oz,b.x,b.y,b.z,OE,OE.r)){damageOutpost(OE,b.dmg,b.side);hit=true}
    if(!hit&&SE&&hostile(b.side,SE.fac)){if(!SE.offline&&SE.shield>0&&segHit(ox,oy,oz,b.x,b.y,b.z,SE,165)){damageStation(SE,b.dmg,b.side,b.cap?'capital':'kinetic',b.src);fxSpark(b,'#9fd0ff',3);if(b.cap)fxBoom(b,50,'#9fd0ff');hit=true}else if(segHit(ox,oy,oz,b.x,b.y,b.z,SE,75)){if(SE.offline||SE.shield<=0)damageStation(SE,b.dmg,b.side,b.cap?'capital':'kinetic',b.src);if(b.cap)fxBoom(b,50,'#ffd9a0');fxSpark(b,'#ffd9a0',2);hit=true}}
    if(!hit&&W.works&&W.works.length&&wkShot(b,ox,oy,oz))hit=true;
    if(!hit)for(const a of s.ast){if(d3(a,b)<astR(a)){fxSpark(b,'#b9ab96',2);hit=true;break}}
    if(hit)W.shots.splice(i,1)}
}
// while docked (station, outpost, frigate bridge or heavy bomber turret) the player's fighter is taken out of space entirely:
// nothing can see, target, hit or render it, and every AI that had it locked drops the lock at once
function ghostSync(){const p=W&&W.player;if(!p)return;const i=W.ents.indexOf(p);
  if(S.player.docked){p.ghost=true;if(i>=0){W.ents.splice(i,1);unTargetPlayer(p)}}
  else{p.ghost=false;if(i<0&&p.alive&&!W.dead)W.ents.push(p)}}
function unTargetPlayer(p){for(const e of W.ents){if(e.ai&&e.ai.tgt===p){e.ai.tgt=null;e.ai.t=0;e.ai.lock=0}if(e.ai&&e.ai.hunt===p)e.ai.hunt=null;if(e.tur&&e.tur.ai&&e.tur.ai.tgt===p)e.tur.ai.tgt=null}
  for(const m of W.missiles)if(m.tgt===p)m.tgt=null;if(W.hitDirs)W.hitDirs.length=0}
function worldUpdate(dt){
  W.t+=dt;W.fdt=dt;worksSync();if(S.unb)unbTick(dt);{const br=broodHeld(W.sid);if(W.wasBr&&!br){S.truceT=S.truceT||{};S.truceT[W.sid]=S.T+30;feed(`The Bloom is burned out of ${DEF[W.sid].name}. The truce holds 30 seconds more, then the race to claim it begins.`,'news')}W.wasBr=br;W.haze=br;{const tr=truceAt(W.sid);if(tr&&!W.truce&&W===LW&&W.player)SFX.truce();W.truce=tr}}const loc=W===LW&&W.player;
  if(loc){
  ghostSync();
  if(W.dead){if(W.t-W.dead>3.2){respawn();return}}
  if(W.jump){const J=W.jump;J.t+=dt;gateTransit(J,dt);if(J.t>JUMP_OUT){const to=J.to;W.jump=null;$('fade').style.opacity=1;doJump(to);JIN.t=0;SFX.jump();return}}
  if(W.pendingFJump){const J=W.pendingFJump;W.pendingFJump=null;bridgeJump(J.tok,J.to);return}
  if(W.bridge)bridgeUpdate(dt);
  if(W.gunseat)gunseatUpdate(dt);
  if(JIN.t<JIN.d)JIN.t+=dt;if(W.docking&&!W.jump)dockingUpdate(dt);else if(W.lairIn&&!W.jump)lairInUpdate(dt);else if(W.detach&&!W.jump)detachUpdate(dt);else if(!W.jump&&JIN.t>=.45)playerUpdate(dt);else if(!W.jump)levelRoll(W.player,dt);if((W.faT=(W.faT||0)-dt)<=0){W.faT=1;friendlyAlerts()}if(NET.cl)beaconLocal(dt);if(!W.jump){spotTick(dt);fgScout()}}
  if(NET.cl){clientWorld(dt);return}
  if(NET.host)netWorld(dt);
  groupsUpdate();limpetSync(dt);
  for(const e of W.ents.slice()){if(e.npc&&e.alive)npcThink(e,dt)}
  beaconWorld(dt);wreckWorld(dt);blkHunt();if(W===LW||!LW)for(const Q of allPilots())if(Q&&Q.convoy&&S.T>Q.convoy.until){const k=Q===S.player?null:Object.keys(S.pilots||{}).find(id=>S.pilots[id]===Q);runAs(k,()=>convoyEnd(false,'it ran out of time'))}
  for(const e of gunboatsIn())tickTurret(e,dt);
  for(const e of W.ents.slice()){if(e.type==='ship'&&e.alive&&!(e.isPlayer&&(S.player.docked||W.dead||W.docking)))physics(e,dt)}
  structUpdate(dt);shotsUpdate(dt);missilesUpdate(dt);blWorld(dt);
  for(let i=W.fx.length-1;i>=0;i--){const f=W.fx[i];f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.vx*=.985;f.vy*=.985;f.vz*=.985;if(f.life<=0)W.fx.splice(i,1)}
  W.popT-=dt;if(W.popT<=0){W.popT=3.5;populate(false)}
  if(loc&&W.tgt&&!validTgt(W.tgt))W.tgt=null;
  if(W.hurt)W.hurt=Math.max(0,W.hurt-dt);
  if(W.shHit)W.shHit=Math.max(0,W.shHit-dt);
  if(W.shake)W.shake=Math.max(0,W.shake-dt*1.6);
}
function fxSpark(p,col,n){if(!W)return;const c=hexRGB(col);for(let i=0;i<n;i++){const d=rdir(),v=rnd(40,220);W.fx.push({x:p.x,y:p.y,z:p.z,vx:d.x*v,vy:d.y*v,vz:d.z*v,life:rnd(.15,.45),max:.45,c,sz:rnd(3,6)})}}
function fxBoom(p,r,col){if(!W)return;SFX.boom(r,vAt(p));const c=hexRGB(col),w=[1,.88,.7];for(let i=0;i<46;i++){const d=rdir(),v=rnd(30,r*2.6);W.fx.push({x:p.x,y:p.y,z:p.z,vx:d.x*v,vy:d.y*v,vz:d.z*v,life:rnd(.4,1.3),max:1.3,c:Math.random()<.5?c:w,sz:rnd(5,12)})}W.fx.push({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,life:.55,max:.55,c:w,sz:r*2.2,flash:true})}
function fxShieldBreak(e){if(!W)return;const c=[.55,.8,1],R=e.st.radius*1.8;for(let i=0;i<40;i++){const d=rdir(),v=rnd(80,280);W.fx.push({x:e.x+d.x*R,y:e.y+d.y*R,z:e.z+d.z*R,vx:e.vx+d.x*v,vy:e.vy+d.y*v,vz:e.vz+d.z*v,life:rnd(.3,.9),max:.9,c,sz:rnd(3,7)})}W.fx.push({x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,life:.5,max:.5,c:[.6,.85,1],sz:e.st.radius*4,flash:true})}
function vignette(c,rgb,a){const g=c.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.32,VW/2,VH/2,Math.max(VW,VH)*.75);g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(1,`rgba(${rgb},${clamp(a,0,1)})`);c.fillStyle=g;c.fillRect(0,0,VW,VH)}
function fxWarp(p,col){if(!W)return;W.fx.push({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,life:.6,max:.6,c:hexRGB(col),sz:140,flash:true})}
