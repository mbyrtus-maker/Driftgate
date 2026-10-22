//@src 06_events.js
// ============================================================ events
function randPos(rmin,rmax){const d=rdir(1),r=rnd(rmin,rmax);return{x:Math.round(d.x*r),y:Math.round(d.y*r),z:Math.round(d.z*r)}}
function scheduleEvent(){
  const t=wpick({comet:2,storm:1.4,gate:1,derelict:1.6,requisition:1.4});
  const nonCore=SECTOR_DEFS.filter(d=>d.kind!=='core').map(d=>d.id);
  if(t==='comet'){
    const sid=pick(['ke','sh','ci','ho','wr']),s=S.sectors[sid],ore={};let tot=0;
    const ids=Object.keys(S.sectors).sort(()=>Math.random()-.5);
    for(const id of ids){const d=S.sectors[id].debris;const m=Math.min(d.xc,70-(ore.xc||0));if(m>0){d.xc-=m;inv.add(ore,'xc',m);tot+=m}}
    for(const id of ids){const d=S.sectors[id].debris;for(const e of['ir','fe','cu']){const m=Math.min(d[e],Math.max(0,110-tot),25);if(m>0){d[e]-=m;inv.add(ore,e,m);tot+=m}}}
    if(tot<25){for(const k in ore)inv.add(s.debris,k,ore[k]);return}
    s.ast.push({id:S.nextId++,...randPos(600*SPACE,1700*SPACE),ore,seed:ri(1,1e9),comet:true,until:S.T+260});
    S.events.push({id:S.nextId++,type:'comet',sector:sid,until:S.T+260});
    feed(`Drift debris has coalesced into a comet in ${DEF[sid].name}: ${tot} t, rich in Xenocrystal.`,'warn');
  }else if(t==='storm'){
    const sid=pick(nonCore);S.sectors[sid].storm=S.T+150;S.events.push({id:S.nextId++,type:'storm',sector:sid,until:S.T+150});
    feed(`Ion storm over ${DEF[sid].name}. Shields will not recharge there and radar is blind.`,'warn');
  }else if(t==='gate'){
    const[a,b]=pick(LINKS);S.gateDown[gateKey(a,b)]=S.T+120;S.events.push({id:S.nextId++,type:'gate',sector:a,sector2:b,until:S.T+120});
    feed(`The gate between ${DEF[a].name} and ${DEF[b].name} has collapsed for two minutes.`,'warn');
  }else if(t==='derelict'){
    const f=pick(FAC_IDS),st=S.econ.stock[f],c={};
    for(const[k,n]of[['plate',ri(5,10)],['wire',ri(4,8)],['coil',ri(1,4)],['lattice',ri(0,2)],['ir',ri(0,12)]]){const m=inv.take(st,k,n);if(m)c[k]=m}
    if(!Object.keys(c).length)return;
    const sid=pick(nonCore),s=S.sectors[sid];
    s.crates.push({id:S.nextId++,...randPos(700*SPACE,2100*SPACE),inv:c,until:S.T+320,derelict:true});
    S.events.push({id:S.nextId++,type:'derelict',sector:sid,until:S.T+320});
    feed(`Distress beacon: ${art(FACTIONS[f].short).toLowerCase()} ${FACTIONS[f].short} freighter broke up in ${DEF[sid].name}. Its cargo is drifting free (${invMass(c)} t).`,'warn');
  }else{
    const f=pick(FAC_IDS),item=pick(['ir','coil','plate','wire','cu','fe']),st=S.econ.stock[f],m=Math.floor((st[item]||0)*.6);
    if(m<4)return;inv.add(S.econ.fleet[f],item,inv.take(st,item,m));
    feed(`${FACTIONS[f].short} requisitions ${m} ${ITEMS[item].name} for the war effort. Prices will climb at their stations.`,f===S.player.faction?'warn':'news');
  }
}
// ---- job sizes. Delivery contracts, freeport requests and blockade runs come in three bands so a bigger hold has bigger
// work: about half are small (the old sizes, which fit a Light Hauler), a third medium (60-100 t), the rest large
// (100-180 t). Only common goods come in the big bands (ores and plate), so one large job can't drain a scarce part. The
// rate per unit never changes: a big job pays more only because it moves more. Bigger jobs get more time to fill.
const JOB_BIG=['fe','cu','ir','plate'],JOB_BAND={s:.5,m:.33,l:.17};
function jobSize(item,n0){const b=wpick(JOB_BAND);if(b==='s'||!JOB_BIG.includes(item))return{n:n0,t:1};const r=b==='m'?[60,100]:[100,180];return{n:Math.max(n0,Math.round(rnd(r[0],r[1])/Math.max(1,mass(item)))),t:b==='m'?1.5:2}}
const JOB_PART=10;   // partial deliveries: at least a quarter of the job, or 10 units, whichever is less
function jobMin(k){return Math.min(k.n,JOB_PART,Math.ceil((k.n0||k.n)/4))}
function scheduleContract(){
  const f=S.player.faction;if(S.unb||!FACTIONS[f])return;if(S.contracts.filter(c=>c.fac===f).length>=3)return;
  const item=wpick({plate:3,wire:3,coil:2,ir:2,xc:1.5,lattice:.8}),js=jobSize(item,item==='plate'||item==='wire'?ri(6,14):item==='coil'?ri(3,6):item==='ir'?ri(10,24):item==='xc'?ri(8,18):ri(2,3)),n=js.n;
  const reward=Math.ceil(baseValue(item)*n*1.7/10)*10;
  S.contracts.push({id:S.nextId++,fac:f,item,n,n0:n,reward,until:S.T+480*js.t});
  feed(`New ${FACTIONS[f].short} supply contract: ${n} ${ITEMS[item].name} for ${fmt(reward)} cr.`,'info');
}
// ---- distress calls: friendly stations, depots and outposts radio every pilot of their faction when attacked, wherever they are
function distressCall(sid,name,owner,by){if(NET.cl||!owner||!S)return;S.distress=S.distress||[];const key=sid+':'+name,now=S.T;let d=S.distress.find(x=>x.key===key);
  if(d){d.T2=now;if(by)d.by=by;if(now-d.T<60)return;d.T=now}else{d={key,sid,name,fac:owner,by:by||null,T:now,T2:now};S.distress.push(d)}
  if(owner==='neutral'&&(!d.respT||now-d.respT>150)){d.respT=now;const sent=FAC_IDS.map(f=>[f,dispatchResponse(f,sid,'distress',{far:1})]).filter(x=>x[1]);if(sent.length)allFeed(`${name}: ${sent.map(([f,r])=>`${FACTIONS[f].short} wing of ${r.n}`).join(', ')} answering the call.`,'info')}
  if(FACTIONS[owner]&&(!d.respT||now-d.respT>150)){const rv=dispatchResponse(owner,sid,'distress');if(rv){d.respT=now;if(friendSide(owner))feed(`${FACTIONS[owner].short} command: response wing of ${rv.n} launching from ${S.stations[rv.from].name} to ${name}, about ${Math.round(rv.eta-now)} s out.`,'info')}}
  const send=(pid,P)=>{const fac=P?P.faction:S.player.faction,mine=owner===fac||owner==='neutral'||(owner==='player'&&!NET.on);if(!mine)return;const here=P?P.sector:S.player.sector,h=HOP[sid][here];
    const msg=`📡 Distress call from ${name} in ${DEF[sid].name}: under attack${d.by&&d.by!==owner?' by '+(d.by==='player'?'a pilot':sideName(d.by)):''}. ${h?h+' jump'+(h>1?'s':'')+' away':'You are in that system'}. Press O to respond.`;
    if(!pid||pid===NET.me){feed(msg,'bad');SFX.distress()}else netMsg(pid,'distress',msg)};
  if(NET.host){for(const pid in S.pilots)send(pid,S.pilots[pid])}else send(null,null)}
function distressOps(){const pf=S.player.faction,out=[];for(const d of S.distress||[]){if(S.T-d.T2>90)continue;if(d.pilot&&d.key.endsWith(':pilot:'+(NET.cl?NET.me:'me')))continue;if(!(d.fac===pf||d.fac==='player'))continue;out.push({kind:'defend',ev:{type:'distress',stage:'engaged',sector:d.sid},sector:d.sid,hops:HOP[d.sid][S.player.sector],eta:0,label:`Distress: ${d.name} (${DEF[d.sid].name})`})}return out}
function updateEvents(){
  const T=S.T;
  if(S.distress)S.distress=S.distress.filter(d=>T-d.T2<120);
  for(const ev of S.events){
    if(ev.type==='offensive'&&!ev.dist&&ev.stage!=='done'&&T>=ev.eta){ev.dist=1;const ow=evOwner(ev);if(ow&&ow!==ev.att)distressCall(ev.sector,evName(ev),ow,ev.att)}
    if(ev.type==='build'){buildTick(ev,T);continue}
    if(ev.type==='yardbuild'||ev.type==='frigbuild'||ev.type==='escbuild'||ev.type==='sortie')continue;   // capitalTick / sortieTick finish these
    if(ev.type==='response'){responseTick(ev);continue}
    if(ev.type!=='offensive'){if(T>ev.until)ev.stage='done';continue}
    if(ev.stage==='inbound'&&T>=ev.eta){if(ev.hold&&T<ev.hold&&!WORLDS[ev.sector])continue;const lw=liveIn(ev.sector);if(lw)inW(lw,()=>engageOffensive(ev));else resolveAbstract(ev)}
    else if(ev.stage==='engaged'){
      const alive=WORLDS[ev.sector]?WORLDS[ev.sector].ents.filter(e=>e.npc&&e.evId===ev.id):[];
      if(!alive.length){finishOffensive(ev);if(ev.st){if(S.stations[ev.st])feed(`The ${sideAdj(ev.att)} assault on ${evName(ev)} is broken.`,friendSide(evOwner(ev))?'good':'news');continue}const o=S.outposts[ev.target];if(o.owner!==ev.att){if(o.owner==='player')feed(`The ${sideName(ev.att)} assault on your ${o.name} is broken.`,'good');else feed(`The ${sideName(ev.att)} assault on ${o.name} failed.`,'news')}}
      else if(T>ev.until)for(const e of alive)e.role='leave';
    }
  }
  S.events=S.events.filter(e=>e.stage!=='done');
  for(const k in S.gateDown)if(T>S.gateDown[k])delete S.gateDown[k];
  for(let i=S.contracts.length-1;i>=0;i--)if(T>S.contracts[i].until)S.contracts.splice(i,1);
}
const CONSTR_LD={plate:6,wire:4,coil:2},BROOD_SEED={plate:2},   // Bloom nodes are grown from a frame, not assembled by a constructor
 SCOUT_LD={plate:1,wire:2},SCOUT2_LD={plate:2,wire:3,coil:1};
function scoutsTick(){S.scouts=S.scouts||[];const pf=S.player.faction;
  for(const f of FAC_IDS){const mine=S.scouts.filter(x=>x.side===f).length,want=1;
    const srcs=[S.econ.fleet[f],S.econ.stock[f]],adv=facVet(f)&&haveIn(SCOUT2_LD,srcs),LD=adv?SCOUT2_LD:SCOUT_LD;if(mine<want&&haveIn(LD,srcs)){const load={};takeFrom(LD,srcs);inv.addAll(load,LD);if(adv&&srcs.some(x=>(x.swarm||0)>0)){takeFrom({swarm:1},srcs);inv.add(load,'swarm',1)}const home=SECTOR_DEFS.find(d=>d.home===f&&d.kind==='frontier').id;
      const t={id:S.nextId++,side:f,sector:home,load};if(adv)t.cls='scout2';S.scouts.push(t);if(WORLDS[home])inW(WORLDS[home],()=>spawnScout(t,true))}}
  for(const t of S.scouts)if(t.live){const w=WORLDS[t.sector];if(!w||!w.ents.some(e=>e.alive&&e.home===`scout:${t.id}:${t.side}`))t.live=false}
  for(let i=S.scouts.length-1;i>=0;i--){const t=S.scouts[i];if(t.live)continue;const d=DEF[t.sector];
    let risk=d.kind==='hive'?.3:0;const rk=t.cls==='scout2'?.6:1;const oid=OUT_BY_SECTOR[t.sector];if(oid&&S.outposts[oid].owner&&hostile(t.side,S.outposts[oid].owner))risk+=.05;const Rs=S.stations[t.sector];if(Rs&&hostile(t.side,Rs.owner))risk+=.08;if(d.kind==='den')risk+=.04;
    if(Math.random()<risk*rk){toDebris(S.sectors[t.sector],t.load);S.scouts.splice(i,1);if(t.side===pf)feed(`Contact lost with our scout in ${d.name}.`,'warn');continue}
    if(Math.random()<.25){const terr=territory(t.side),opts=NEIGH[t.sector].map(n=>{const dn=DEF[n];let w=1;if(!covOf(t.side,true).has(n))w+=2;if(broodNear(n))w+=1.5;if(dn.kind==='hive')w*=.25;if(dn.kind==='den')w*=.4;if(dn.home===t.side&&dn.kind==='core')w*=.2;if(S.scouts.some(o=>o!==t&&o.side===t.side&&o.sector===n))w*=.3;if(S.beacons&&S.beacons[n]&&bcnCan(S.beacons[n],t.side))w+=1.5;return[n,w]});
      const to=wpickArr(opts);t.sector=to;if(WORLDS[to])inW(WORLDS[to],()=>spawnScout(t,true))}}}
function spawnScout(t,arrive){const e=makeNPC('scout',t.side,t.cls||'scout',factionTier(t.side),t.load,`scout:${t.id}:${t.side}`);t.load={};t.live=true;
  if(arrive){const g=pick(GATES[W.sid]);e.x=g.x*.93;e.y=g.y*.93;e.z=g.z*.93;fxWarp(e,sideCol(t.side))}else Object.assign(e,randPos(800*SPACE,2600*SPACE));faceInstant(e,-e.x,-e.y*.2,-e.z);W.ents.push(e);return e}
function scoutThink(e,dt){const ai=e.ai;let th=null,bd=1400;for(const o of W.ents){if(o.type!=='ship'||!o.alive||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const d=d3(o,e);if(d<bd){bd=d;th=o}}
  if(th){e.boosting=bd<900;const ax=e.x-th.x,ay=e.y-th.y,az=e.z-th.z,l=hyp(ax,ay,az)||1;let tx=e.x+ax/l*900,ty=e.y+ay/l*250,tz=e.z+az/l*900;const r=hyp(tx,ty,tz);if(r>2900){tx*=2900/r;ty*=2900/r;tz*=2900/r}
    steer(e,tx,ty,tz,dt,false,1);faceDir(e,e.vx,e.vy,e.vz,dt);if(bd<300&&faceTo(e,th,0)<.15)fire(e);if(e.cls==='scout2'&&(e.load.swarm||0)>0&&bd<1100&&(ai.scd||0)<=W.t){inv.take(e.load,'swarm',1);launchSwarm(e,th,e.tier);ai.scd=W.t+14}return}
  e.boosting=false;{const Bg=scoutBeaconGoal(e);if(Bg){const d=d3(e,Bg);if(d>BCN_R*.5){steer(e,Bg.x,Bg.y,Bg.z,dt,true,.9);faceDir(e,Bg.x-e.x,Bg.y-e.y,Bg.z-e.z,dt)}else{brake(e,dt);faceDir(e,e.vx||1,e.vy,e.vz,dt)}return}}
  if(!ai.wp||d3(ai.wp,e)<220){const o=rdir(.6),r=rnd(1100,2800)*SPACE;ai.wp={x:o.x*r,y:o.y*r,z:o.z*r}}steer(e,ai.wp.x,ai.wp.y,ai.wp.z,dt,false,.8);faceDir(e,e.vx,e.vy,e.vz,dt)}
// ---- sector beacons: one per system, set well off the centre. A scout (Scout or Advanced Scout, yours or an AI's) that holds
// station within BCN_R of it for BCN_T seconds flips it to its faction. The holder's side scans that system continuously,
// and the pilot who flipped it is paid a one-off bonus plus a small residual every minute until another team's scout flips it.
// Every credit comes out of the flipping faction's treasury, so the economy stays zero-sum.
const BCN_R=250,BCN_T=10,BCN_FLIP=60,BCN_RES=4,BCN_EVERY=60,BCN_RES_T=600,BCN_LOCK=180,BCN_FADE=120;
// A held beacon is secured for BCN_LOCK s after it is flipped or re-secured: nobody can flip it. Then it fades for BCN_FADE s:
// an enemy scout can flip it, and a friendly scout can re-secure it (the same hold) for another BCN_LOCK s. If nobody does,
// it lapses back to neutral, and its scan and residual stop.
function bcnSec(B){return B.sec!=null?B.sec:(B.T||0)}
function bcnState(B){if(!B||!B.owner)return'open';const a=S.T-bcnSec(B);return a<BCN_LOCK?'locked':a<BCN_LOCK+BCN_FADE?'fading':'lapsed'}
function bcnLeft(B){const a=S.T-bcnSec(B);return Math.max(0,a<BCN_LOCK?BCN_LOCK-a:BCN_LOCK+BCN_FADE-a)}
function bcnCan(B,side){const st=bcnState(B);return side===B.owner?st==='fading':st!=='locked'}   // can this side make progress on it right now?
function isScoutCls(cls){return cls==='scout'||cls==='scout2'}
function beaconPos(sid){const gs=GATES[sid]||[];let p,k=0;do{p=randPos(1500*SPACE,2350*SPACE);p.y=Math.round(p.y*.5)}while(k++<40&&gs.some(g=>d3(g,p)<800*SPREAD));return p}
// every system has a beacon: it scans the system for its holder and feeds them that system's market prices
function bcnAllowed(d){return true}
function beaconInit(){S.beacons=S.beacons||{};for(const id in S.beacons)if(!bcnAllowed(DEF[id]))delete S.beacons[id];for(const d of SECTOR_DEFS){if(!bcnAllowed(d)||S.beacons[d.id])continue;const p=beaconPos(d.id);S.beacons[d.id]={x:p.x,y:p.y,z:p.z,owner:null,by:null,T:0,pay:0}}for(const id in S.beacons){const B=S.beacons[id];if(B.owner&&B.sec==null)B.sec=S.T}S.bcnV=(S.bcnV||0)+1}
// who may flip: the side a ship flies for, if it is a scout hull and free to act
function bcnFlipper(e){if(e.type!=='ship'||!e.alive||e.inJump||e.ghost)return null;
  if(e.isPlayer){if(W!==LW||S.player.docked||W.dead||W.docking||W.detach||!isScoutCls(S.player.cls))return null;return{side:S.player.faction,by:pkey()}}
  if(e.rp){const P=S.pilots&&S.pilots[e.rp];if(!P||P.docked||!isScoutCls(P.cls))return null;return{side:P.faction,by:e.rp}}
  if(e.npc&&e.role==='scout'&&FAC_IDS.includes(e.side))return{side:e.side,by:null};return null}
// host / single player: run in every open system each frame
function beaconWorld(dt){const B=S.beacons&&S.beacons[W.sid];if(!B)return;const F=W.bcnF||(W.bcnF={side:null,t:0,by:null,cont:false});
  let side=null,by=null,many=false;for(const e of W.ents){if(e.type!=='ship'||d3(e,B)>BCN_R)continue;const f=bcnFlipper(e);if(!f)continue;if(side&&side!==f.side){many=true;continue}if(!side||(!by&&f.by)){side=f.side;by=f.by}}
  F.cont=many;if(many)return;                                   // two teams' scouts on it: nobody makes progress
  if(!side||!bcnCan(B,side)){F.t=Math.max(0,F.t-dt*2);if(F.t<=0)F.side=null;return}
  if(F.side!==side){F.side=side;F.t=0;F.by=null}F.by=by||F.by;F.t+=dt*(F.by&&lvlOf(F.by)>=1?BCN_T/7:1);
  if(F.t>=BCN_T){const who=F.by;F.t=0;F.side=null;F.by=null;if(side===B.owner)beaconSecure(W.sid,side,who);else beaconFlip(W.sid,side,who)}}
function beaconFlip(sid,side,by){const B=S.beacons[sid];if(!B||B.owner===side)return;const old=B.owner,oldBy=B.by,nm=DEF[sid].name;
  B.owner=side;B.by=by||null;B.T=S.T;B.sec=S.T;B.pay=S.T;B.byT=S.T;S.bcnV=(S.bcnV||0)+1;bcnMissionPay(sid,side,by);sideBcn(sid,side,by);
  if(oldBy&&oldBy!==by)keyFeed(oldBy,`Your beacon in ${nm} was flipped by ${by?(S.pilots&&S.pilots[by]?S.pilots[by].name:'a '+FACTIONS[side].short+' pilot'):'a '+FACTIONS[side].short+' scout'}. Its scan and your residual have stopped.`,'warn');
  if(by){weAdd(side,WE.beacon);const got=payKey(by,side,Math.round(BCN_FLIP*(lvlOf(by)>=1?1.2:1)));keyFeed(by,`◆ Beacon in ${nm} flipped for ${FACTIONS[side].short}: +${fmt(got)} cr. It's secured for ${BCN_LOCK/60} minutes; then it fades, and a friendly scout must re-secure it within ${BCN_FADE/60} minutes or it drops to neutral. It scans ${nm} for your side and pays you ${BCN_RES} cr a minute while your side holds it, for ${BCN_RES_T/60} minutes after you last flip or re-secure it.`,'good');if(isMe(by)){SFX.count(true);flash(`Beacon flipped for ${FACTIONS[side].short}. +${fmt(got)} cr`)}}
  else if(old&&!oldBy&&friendSide(old)&&S.player.sector===sid)facFeed(old,`◆ ${FACTIONS[side].short} scout flipped our beacon in ${nm}.`,'warn');
  if(W&&W.sid===sid&&!MUTE)fxSpark(B,sideCol(side),14);
  if(NET.host)for(const c of readyCl())send(c.L,{t:'bcn',sid,b:B,v:S.bcnV})}
function bcnSend(sid){if(NET.host)for(const c of readyCl())send(c.L,{t:'bcn',sid,b:S.beacons[sid],v:S.bcnV})}
// a friendly scout holds a fading beacon: secured again for BCN_LOCK s; a pilot who re-secures it takes over its residual
function beaconSecure(sid,side,by){const B=S.beacons[sid];if(!B||B.owner!==side)return;const nm=DEF[sid].name,oldBy=B.by;B.sec=S.T;sideBcn(sid,side,by);
  if(by)B.byT=S.T;if(by&&oldBy!==by){B.by=by;B.pay=S.T;if(oldBy)keyFeed(oldBy,`◆ Your beacon in ${nm} was re-secured by ${S.pilots&&S.pilots[by]?S.pilots[by].name:'another pilot'}: its residual now pays them.`,'info')}
  S.bcnV=(S.bcnV||0)+1;if(by){keyFeed(by,`◆ Beacon in ${nm} re-secured for ${FACTIONS[side].short}: locked for another ${BCN_LOCK/60} minutes${B.by===by?`, paying you ${BCN_RES} cr a minute`:''}.`,'good');if(isMe(by)){SFX.count(true);flash(`Beacon re-secured: ${BCN_LOCK/60} minutes`)}}
  if(W&&W.sid===sid&&!MUTE)fxSpark(B,sideCol(side),8);bcnSend(sid)}
// in a system its side holds (home space, or its station or outpost there) the local crew keeps the beacon secured; out in
// contested and open space only a scout can
function bcnCrew(sid,f){let o=sectorOwner(sid);if(o==='player')o=S.player.faction;return!!f&&o===f}
// nobody re-secured it before the fade ran out: back to neutral
function beaconLapse(sid){const B=S.beacons[sid];if(!B||!B.owner)return;const old=B.owner,oldBy=B.by,nm=DEF[sid].name;B.owner=null;B.by=null;B.T=S.T;B.sec=null;S.bcnV=(S.bcnV||0)+1;
  if(oldBy)keyFeed(oldBy,`◆ Your beacon in ${nm} lapsed to neutral: no scout re-secured it in time. Its scan and your residual have stopped.`,'warn');
  else if(friendSide(old)&&S.player.sector===sid)facFeed(old,`◆ Our beacon in ${nm} has lapsed to neutral.`,'warn');
  if(W&&W.sid===sid&&!MUTE)fxSpark(B,[.7,.7,.7],8);bcnSend(sid)}
// strategic tick: residual pay, lapses, and AI scouts out of sight flip or re-secure beacons where they wander
function beaconTick(){if(NET.cl||!S.beacons)return;
  for(const sid in S.beacons){const B=S.beacons[sid];if(!B.owner)continue;const end=bcnSec(B)+BCN_LOCK+BCN_FADE;
    if(B.by)while(S.T-B.pay>=BCN_EVERY&&B.pay+BCN_EVERY<=Math.min(end,(B.byT||B.T||0)+BCN_RES_T)){B.pay+=BCN_EVERY;const k=B.by;if(!isMe(k)&&NET.on&&!(S.pilots&&S.pilots[k]))break;const got=payKey(k,B.owner,BCN_RES);if(got&&isMe(k)&&Math.floor((S.T-B.T)/BCN_EVERY)%5===1)feed(`◆ Beacon residuals: ${DEF[sid].name} keeps paying ${BCN_RES} cr a minute.`,'info')}
    const st=bcnState(B);if(st!=='locked'&&bcnCrew(sid,B.owner))beaconSecure(sid,B.owner,null);else if(st==='lapsed')beaconLapse(sid)}
  for(const t of S.scouts||[]){if(t.live)continue;const B=S.beacons[t.sector];if(!B)continue;if(B.owner===t.side){if(bcnState(B)==='fading'&&Math.random()<.35)beaconSecure(t.sector,t.side,null);continue}if(bcnState(B)==='locked')continue;const Rs=S.stations[t.sector],guarded=Rs&&Rs.owner&&hostile(t.side,Rs.owner);
    if(Math.random()<(guarded?.08:.22))beaconFlip(t.sector,t.side,null)}}
// ---- scout limpets: a Scout or Advanced Scout carries one limpet, rearmed whenever it docks. With an enemy carrier, escort,
// station or depot targeted, hold the mining key (F) within LIMPET_R of its hull for LIMPET_T seconds in total (progress
// keeps while you fly through range, so a fast pass works) to plant it. For LIMPET_LIFE the planter's side does LIMPET_DMG
// damage to the target, sees a marked capital on the galaxy and Strategic maps, and its AI fighters and bombers in the
// system go for it. The limpet is a small object on the hull (an NPC ship, role 'limpet'): enemy fighters and pilots can
// shoot it off; turrets, point defence and capital guns can't. The target's side is warned. A capital ship destroyed with
// a limpet on it pays the scout who planted it. The tag lives on the record (capital token, station record or outpost),
// so the limpet comes back with the system when it reloads (limpetSync).
const LIMPET_R=600,LIMPET_T=2,LIMPET_LIFE=180,LIMPET_DMG=1.25,LIMPET_HP=45,PING_PAY={carrier:500,escort:300};
function capPinged(t,f){const P=t&&t.pings&&t.pings[f];return!!P&&P.until>S.T}
// tracked on the maps: a limpet, or a lead from elsewhere (an anomaly's log) that only shows where it is
function capTrackUntil(t,f){return Math.max(capPinged(t,f)?t.pings[f].until:0,(t&&t.seen&&t.seen[f])||0)}
const capTracked=(t,f)=>capTrackUntil(t,f)>S.T;
function capTrack(t,f,dur){if(!t||!FAC_IDS.includes(f))return;t.seen=t.seen||{};t.seen[f]=Math.max(t.seen[f]||0,S.T+(dur||300))}
function lpRec(E){return!E?null:E.type==='station'?E.rec:E.type==='outpost'?E.o:E.role==='frigate'?E.tok:null}
function lpSide(E){return!E?null:E.type==='station'?E.fac:E.type==='outpost'?E.o.owner:E.side}
function lpRad(E){return E.st?E.st.radius:E.r||100}
function lpName(E){const R=lpRec(E);if(!R)return'the target';if(E.role==='frigate')return`${R.side==='brood'?'Brood '+broodCap(R):sideName(sideNorm(R.side))+' '+capName(R)} ${R.name}`;return E.type==='station'?E.name:R.name}
function limpetK(R,src){if(!R||!R.pings||!src)return 1;const P=R.pings[sideNorm(src)];return P&&P.until>S.T?LIMPET_DMG:1}
// the target's side hears about it; the capital's commander and crew get an alert
function lpWarn(E,msg,alert){const sd=sideNorm(lpSide(E));if(FAC_IDS.includes(sd))facFeed(sd,msg,alert?'bad':'news');const t=E.role==='frigate'?E.tok:null;if(!t)return;
  if(t.side==='player'||(t.owner&&isMe(t.owner))||(W.bridge&&W.bridge.f&&W.bridge.f.tok===t))flash(msg,alert);
  if(NET.host){if(t.owner&&!isMe(t.owner))netMsg(t.owner,'flash',msg,alert);for(const pid of crewAboard(t))if(!isMe(pid))netMsg(pid,'flash',msg,alert)}}
function limpetStick(e){const E=e.lh,q=E.q||q0();qRot(q,e.loc.x,e.loc.y,e.loc.z,_lpV);e.x=E.x+_lpV.x;e.y=E.y+_lpV.y;e.z=E.z+_lpV.z;e.vx=E.vx||0;e.vy=E.vy||0;e.vz=E.vz||0;qCopy(e.q,q)}
const _lpV={x:0,y:0,z:0};
// on the hull, on the side the scout came from (a random side when the system reloads)
function limpetSpawn(E,f,at){const q=E.q||q0(),r=lpRad(E)*.92;let dx,dy,dz;if(at){dx=at.x-E.x;dy=at.y-E.y;dz=at.z-E.z}else{const o=rdir();dx=o.x;dy=o.y;dz=o.z}const l0=hyp(dx,dy,dz)||1,v={x:0,y:0,z:0};
  qRot({x:-q.x,y:-q.y,z:-q.z,w:q.w},dx/l0*r,dy/l0*r,dz/l0*r,v);
  const e=makeNPC('limpet',f,'drone',1,{},'limpet');e.fac=f;e.st={...e.st,hull:LIMPET_HP,sCap:0,radius:8};e.hull=LIMPET_HP;e.shield=0;e.lh=E;e.lf=f;e.loc=v;limpetStick(e);W.ents.push(e);return e}
function limpetDrop(e){e.alive=false;const i=W.ents.indexOf(e);if(i>=0)W.ents.splice(i,1);if(W.tgt&&W.tgt.ref===e)W.tgt=null}
function limpetPlant(E,f,by,at){const R=lpRec(E),sd=lpSide(E);if(!R||!FAC_IDS.includes(f)||!sd||sd==='neutral'||!hostile(f,sideNorm(sd)))return false;
  R.pings=R.pings||{};R.pings[f]={by:by||null,until:S.T+LIMPET_LIFE};for(const l of W.ents.slice())if(l.role==='limpet'&&l.lh===E&&l.lf===f)limpetDrop(l);limpetSpawn(E,f,at);
  const nm=lpName(E),cap=E.role==='frigate',pct=Math.round((LIMPET_DMG-1)*100);
  if(by)keyFeed(by,`🧲 Limpet on ${nm}: your side hits it ${pct}% harder for ${LIMPET_LIFE/60} minutes${cap?` and tracks it on the maps. If it's destroyed with the limpet on, you're paid ${fmt(PING_PAY[R.cls]||300)} cr`:''}. Enemy fighters can shoot it off.`,'good');
  facFeed(f,`🧲 Limpet planted on ${nm} in ${DEF[W.sid].name}: +${pct}% damage against it for ${LIMPET_LIFE/60} minutes.`,'info');
  lpWarn(E,`⚠ ${sideName(f)} limpet on ${nm}! Enemy weapons hit it ${pct}% harder until fighters shoot the limpet off.`,true);SFX.count(true);return true}
// shot off: the tag goes with it
function limpetShot(e,src,at){const E=e.lh,R=lpRec(E),P=R&&R.pings&&R.pings[e.lf];if(P){delete R.pings[e.lf];if(P.by)keyFeed(P.by,`🧲 Your limpet on ${lpName(E)} was shot off.`,'bad');lpWarn(E,`Limpet shot off ${lpName(E)}.`,false)}
  fxBoom(e,30,'#ffcf5a');fxSpark(e,'#ffcf5a',8);limpetDrop(e);payKill(e,src,at)}
function limpetThink(e){const E=e.lh,R=lpRec(E),P=R&&R.pings&&R.pings[e.lf],sd=E&&lpSide(E);e.boosting=e.thrusting=false;
  if(P&&P.until<=S.T&&W.ents.includes(E)){delete R.pings[e.lf];lpWarn(E,`The limpet on ${lpName(E)} has burned out.`,false);limpetDrop(e);return}
  if(!E||!P||!W.ents.includes(E)||(E.type==='ship'&&!E.alive)||(E.type==='station'&&W.stationEnt!==E)||!sd||!hostile(e.lf,sideNorm(sd))){limpetDrop(e);return}
  limpetStick(e)}
// the host keeps one limpet object per live tag in the loaded system
function limpetSync(dt){if(NET.cl||!W)return;W.lpT=(W.lpT||0)-dt;if(W.lpT>0)return;W.lpT=1;
  for(const E of W.ents.slice()){const R=(E.type==='ship'&&E.alive&&E.role==='frigate')||E.type==='station'||E.type==='outpost'?lpRec(E):null;if(!R||!R.pings)continue;
    for(const f in R.pings){if(!capPinged(R,f)||!hostile(f,sideNorm(lpSide(E)||'neutral')))continue;if(!W.ents.some(l=>l.role==='limpet'&&l.lh===E&&l.lf===f))limpetSpawn(E,f,null)}}}
function capPingPay(t){if(!t||!t.pings)return;for(const f in t.pings){const P=t.pings[f];if(!P||P.until<=S.T||!P.by||!hostile(f,t.side))continue;const got=payKey(P.by,f,PING_PAY[t.cls]||300);if(got)keyFeed(P.by,`🧲 The ${capName(t)} ${t.name} you put a limpet on has been destroyed: +${fmt(got)} cr scouting bonus.`,'good')}t.pings={}}
function limpetTarget(){const p=W.player,t=W.tgt;if(!p||!t||!validTgt(t)||!FAC_IDS.includes(S.player.faction))return null;const E=t.ref;if(t.kind==='ship'){if(!E.alive||E.role!=='frigate'||!E.tok)return null}else if(t.kind==='outpost'){if(E.o.breached)return null}else if(t.kind!=='station')return null;
  const sd=lpSide(E);if(!sd||sd==='neutral'||!hostile('player',sd))return null;return E}
const lpSurf=(E,p)=>d3(E,p)-lpRad(E);
// the player's hold on F in a scout, from blPilotUpdate (host, single player and client alike: a client asks the host)
function limpetHold(hold,dt){const F=W.lpF||(W.lpF={E:null,t:0,h:false}),P=S.player,p=W.player,E=limpetTarget(),press=hold&&!F.h;F.h=hold;
  if(press&&P.limpetUsed){flash('No limpet aboard: dock at a friendly station or outpost to rearm.');return}
  if(press&&!E&&W.t-(W.drillMsg||0)>3){W.drillMsg=W.t;flash('Target an enemy carrier, escort, station or depot to plant a limpet. Scouts carry no mining laser.')}
  if(F.E!==E){F.E=E;F.t=0}
  if(!(E&&hold&&!P.limpetUsed&&lpSurf(E,p)<=LIMPET_R&&!capPinged(lpRec(E),P.faction))){F.t=Math.max(0,F.t-dt*.5);return}
  F.t+=dt;if(F.t<LIMPET_T)return;F.t=0;P.limpetUsed=true;
  if(NET.cl)netSend({t:'limpet',k:E.type==='ship'?'cap':E.type,id:E.type==='ship'?E.tok.id:null,at:{x:p.x,y:p.y,z:p.z}});else limpetPlant(E,P.faction,pkey(),p);
  flash(`🧲 Limpet planted on ${lpName(E)}.`)}
function limpetChip(){const P=S.player;if(!isScoutCls(P.cls)||P.docked||!W.player)return null;const E=limpetTarget();if(!E)return null;const R=lpRec(E),nm=lpName(E),F=W.lpF||{};
  if(capPinged(R,P.faction))return[`🧲 Limpet on ${nm} · ${fmtT(R.pings[P.faction].until-S.T)} · +${Math.round((LIMPET_DMG-1)*100)}% damage`,'good'];
  if(P.limpetUsed)return['🧲 Limpet spent · dock to rearm','warn'];
  if(F.E===E&&F.t>0)return[`🧲 Planting ${Math.round(clamp(F.t/LIMPET_T,0,1)*100)}% · hold ${kb('mine')} within ${LIMPET_R} m`,'warn'];
  const d=lpSurf(E,W.player);return[d>LIMPET_R?`🧲 Limpet ready · close to ${LIMPET_R} m of ${nm} (${fmt(Math.round(Math.max(0,d)))} m), hold ${kb('mine')}`:`🧲 Hold ${kb('mine')} to plant a limpet on ${nm}`,'warn']}
// a live AI scout makes for an enemy or empty beacon in its system when nothing is chasing it
function scoutBeaconGoal(e){const B=S.beacons&&S.beacons[W.sid];if(!B||!bcnCan(B,e.side))return null;return B}
// client: show your own progress while the host decides
function beaconLocal(dt){const B=S.beacons&&S.beacons[W.sid],p=W.player;const F=W.bcnF||(W.bcnF={side:null,t:0,cont:false});
  if(!B||!p||S.player.docked||!isScoutCls(S.player.cls)||!bcnCan(B,S.player.faction)||d3(p,B)>BCN_R){F.t=Math.max(0,F.t-dt*2);if(!F.t)F.side=null;return}
  F.side=S.player.faction;F.t=Math.min(BCN_T,F.t+dt*((S.player.lvl||0)>=1?BCN_T/7:1))}
function beaconChip(){const B=S.beacons&&S.beacons[W.sid],p=W.player;if(!B||!p||S.player.docked)return null;const d=d3(p,B);if(d>BCN_R*3)return null;const F=W.bcnF||{};
  const st=bcnState(B),left=fmtT(bcnLeft(B));
  if(B.owner===S.player.faction&&d<=BCN_R){if(st==='fading'&&isScoutCls(S.player.cls))return[`Beacon fading: re-securing ${Math.round(clamp((F.t||0)/BCN_T,0,1)*100)}% · hold within ${BCN_R} m · ${left} to neutral`,'warn'];
    return[`Beacon held by ${FACTIONS[B.owner].short} · ${st==='locked'?'secured '+left:'fading: a scout must re-secure it within '+left}${B.by&&isMe(B.by)?' · yours, paying '+BCN_RES+' cr/min':''}`,st==='locked'?'good':'warn']}
  if(!isScoutCls(S.player.cls))return d<=BCN_R?['Beacon: only a Scout or Advanced Scout can flip it','warn']:null;
  if(F.cont)return['Beacon contested: another team\'s scout is on it','bad'];
  if(B.owner&&st==='locked'&&d<=BCN_R*3)return[`Beacon secured by ${FACTIONS[B.owner].short}: it can be flipped in ${left}`,'bad'];
  if(d>BCN_R)return[`Beacon ${fmt(Math.round(d-BCN_R))} m out of flip range (${BCN_R} m)`,'warn'];
  return[`Flipping beacon ${Math.round(clamp((F.t||0)/BCN_T,0,1)*100)}% · hold within ${BCN_R} m`,'warn']}
function planBuild(f){if(FACTIONS[f]&&campBusy(f))return;const terr=territory(f),busy=new Set(S.events.filter(e=>e.type==='build').map(e=>e.sector)),c=[],pf=S.player.faction;
  for(const d of SECTOR_DEFS){if(busy.has(d.id)||!canBuildIn(d.id,f)||d.kind==='den')continue;if(!(terr.has(d.id)||NEIGH[d.id].some(n=>terr.has(n))))continue;
    const w=f==='brood'?(d.kind==='deep'?3:d.kind==='contested'?2:d.kind==='core'?0:1):d.home===f?12:d.kind==='deep'?3:d.kind==='contested'?1.4:d.kind==='hub'?1:.4;if(w>0)c.push([d.id,w])}
  if(!c.length)return;const st=S.econ.stock[f],fl=S.econ.fleet[f],srcs=[fl,st],CL=f==='brood'?BROOD_SEED:CONSTR_LD;const DC=f==='brood'?DEPOT_COST:FWD_COST;if(!haveIn(DC,[st])||!haveIn(CL,srcs))return;if(f!=='brood'&&!S.yards[f]&&(st.frame||0)-DC.frame<YARD_COST.frame)return;
  const sid=wpickArr(c),force={};takeFrom(DC,[st]);inv.addAll(force,DC);takeFrom(CL,srcs);inv.addAll(force,CL);
  const tier=factionTier(f),cls=[];for(let i=0;i<3;i++){const cl=pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(takeFrom(ld,srcs)){inv.addAll(force,ld);cls.push(cl)}}
  const ev={id:S.nextId++,type:'build',att:f,sector:sid,eta:S.T+80,stage:'inbound',force,n:cls.length,tier,cls,site:stationSite(sid),prog:0};S.events.push(ev);
  announce(ev)}
function buildRisk(sid,f){let r=.08;const oid=OUT_BY_SECTOR[sid];if(oid){const ow=S.outposts[oid].owner;if(ow&&hostile(f,ow))r+=.35}if(f!=='brood'&&broodNear(sid))r+=.15;if(DEF[sid].kind==='deep')r+=.07;return r}
function buildTick(ev,T){const lw=liveIn(ev.sector),live=!!lw;if(lw&&W!==lw)return inW(lw,()=>buildTick(ev,T));
  if(ev.stage==='inbound'){if(T<ev.eta)return;if(ev.hold&&T<ev.hold&&!live)return;if(!canBuildIn(ev.sector,ev.att)){finishBuild(ev);return}ev.stage='building';ev.until=T+45;ev.prog=0;if(live)engageBuild(ev);return}
  if(ev.stage!=='building')return;
  if(ev.live){if(!live){ev.live=false;ev.until=T+45*(1-ev.prog);return}
    if(!W.ents.some(e=>e.npc&&e.alive&&e.evId===ev.id&&e.role==='builder')){const pf=S.player.faction;if(ev.att===pf)feed(`The ${FAC(pf).short} constructor was destroyed. The depot in ${DEF[ev.sector].name} will not be built.`,'bad');else feed(`${ev.att==='brood'?'The Brood Seeder':sideAdj(ev.att)+' constructor'} was destroyed in ${DEF[ev.sector].name}. Construction failed.`,ev.att==='brood'?'good':'news');W.scaffold=null;finishBuild(ev)}
    return}
  if(live){engageBuild(ev);return}
  ev.prog=clamp(1-(ev.until-T)/45,0,1);if(T<ev.until)return;
  if(!canBuildIn(ev.sector,ev.att)){finishBuild(ev);return}
  if(Math.random()<buildRisk(ev.sector,ev.att)){const s=S.sectors[ev.sector];toDebris(s,{frame:inv.take(ev.force,'frame',ev.force.frame||0)});loseInv(ev.force,.3,s);
    if(ev.att===S.player.faction||covered(ev.sector))feed(`${ev.att==='brood'?'A Brood Seeder':sideAdj(ev.att)+' constructors'} were driven off in ${DEF[ev.sector].name}.`,ev.att==='brood'?'good':'news');finishBuild(ev);return}
  completeBuild(ev,ev.force)}
function completeBuild(ev,src){const f=ev.att,DC=f==='brood'?DEPOT_COST:FWD_COST;if(!haveIn(DC,[src])){finishBuild(ev);return}takeFrom(DC,[src]);const Rr=makeStation(ev.sector,f,'depot',ev.site,{...DC});if(f!=='brood'){Rr.fwd=1;applyDev(Rr)}
  if(f===S.player.faction||covered(ev.sector))feed(f==='brood'?`⚠ A Bloom Node has taken root in ${DEF[ev.sector].name}.`:`${Rr.name} is online.`,f==='brood'?'bad':f===S.player.faction?'good':'news');
  if(WORLDS[ev.sector])inW(WORLDS[ev.sector],()=>{W.scaffold=null;addStationEnt(Rr);fxBoom(Rr,180,sideCol(f))});finishBuild(ev)}
function finishBuild(ev){ev.stage='done';inv.addAll(S.econ.stock[ev.att],ev.force);ev.force={}}
// the convoy in person: a constructor plus its escort wing, flying to the site and building while you watch
function engageBuild(ev){ev.live=true;const home=`ev:${ev.id}:${ev.att}`,mid=ev.prog>0;let C=null;
  const CL=ev.att==='brood'?BROOD_SEED:CONSTR_LD;if(takeFrom(CL,[ev.force])){const ld={...CL};const fr=inv.take(ev.force,'frame',ev.force.frame||0);if(fr)ld.frame=fr;C=makeNPC('builder',ev.att,'constructor',1,ld,home);C.evId=ev.id;C.ai.site=ev.site}
  if(!C){finishBuild(ev);return}
  const g0=GATES[ev.sector].slice().sort((a,b)=>d3(a,ev.site)-d3(b,ev.site))[0];
  if(mid){const o=rdir();C.x=ev.site.x+o.x*60;C.y=ev.site.y+o.y*60;C.z=ev.site.z+o.z*60}else{C.x=g0.x*.93;C.y=g0.y*.93;C.z=g0.z*.93;fxWarp(C,sideCol(ev.att))}
  faceInstant(C,ev.site.x-C.x,ev.site.y-C.y,ev.site.z-C.z);W.ents.push(C);
  const grp={id:'g'+(RID++),side:ev.att,role:'escort',members:[],n0:0,fleeing:false,escort:C};C.escortG=grp;
  (ev.cls||[]).forEach((cl,i)=>{const ld=loadout('patrol',ev.tier,cl);if(!takeFrom(ld,[ev.force]))return;const e=makeNPC('escort',ev.att,cl,ev.tier,ld,home);e.evId=ev.id;e.grp=grp;e.slot=i;const o=rdir();e.x=C.x+o.x*140;e.y=C.y+o.y*140;e.z=C.z+o.z*140;qCopy(e.q,C.q);grp.members.push(e);W.ents.push(e)});
  grp.n0=grp.members.length;if(grp.n0)W.groups[grp.id]=grp;
  const pf=S.player.faction;if(ev.att==='brood')feed(`⚠ A Brood Seeder has arrived${grp.n0?` with ${grp.n0} guards`:''}. Kill it before the Bloom Node takes root.`,'bad');else if(ev.att===pf)feed(`${FAC(pf).short} constructor on site. Keep it alive for ${Math.round(45*(1-ev.prog))} s.`,'info')}
function builderThink(e,dt){const ev=S.events.find(v=>v.id===e.evId);if(!ev||ev.stage!=='building'){e.role='leave';return}const st=e.ai.site,d=d3(e,st);
  if(d>90){steer(e,st.x,st.y,st.z,dt,true,.9);faceTo(e,st,dt);return}
  brake(e,dt);ev.prog=Math.min(1,ev.prog+dt/45);W.scaffold={x:st.x,y:st.y,z:st.z,owner:e.side,prog:ev.prog};
  if(ev.prog>=1){completeBuild(ev,e.load);e.role='leave'}}
function engageOffensive(ev){
  ev.stage='engaged';ev.until=S.T+200;
  const g=pick(GATES[ev.sector]);let n=0;
  const grp={id:'g'+(RID++),side:ev.att,role:'strike',members:[],n0:0,fleeing:false};
  for(let i=0;i<ev.n;i++){const cl=(ev.cls&&ev.cls[i])||'striker',ld=loadout(ev.att==='pirate'?'pirate':'patrol',ev.tier,cl);if(!takeFrom(ld,[ev.force]))break;
    const e=makeNPC('strike',ev.att,cl,ev.tier,ld,`ev:${ev.id}:${ev.att}`);e.evId=ev.id;e.ai.siege=!!ev.st;
    const o=rdir();e.x=g.x*.92+o.x*rnd(40,200);e.y=g.y*.92+o.y*rnd(40,200);e.z=g.z*.92+o.z*rnd(40,200);faceInstant(e,-e.x,-e.y,-e.z);const sp=200/2500;e.vx=-g.x*sp;e.vy=-g.y*sp;e.vz=-g.z*sp;e.grp=grp;e.slot=i;grp.members.push(e);W.ents.push(e);n++;fxWarp(e,sideCol(ev.att))}
  grp.n0=grp.members.length;if(grp.n0)W.groups[grp.id]=grp;
  feed(`${ev.att==='pirate'?'Unbound raiders':ev.att==='brood'?'A Brood swarm':FACTIONS[ev.att].short+' strike group'} jumped in: ${n} ships assaulting ${evName(ev)}.`,friendSide(evOwner(ev))||ev.att==='brood'?'bad':'warn');
}
function gateKey(a,b){return[a,b].sort().join('-')}
