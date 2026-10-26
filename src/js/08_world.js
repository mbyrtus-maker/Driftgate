//@src 08_world.js
// ============================================================ feed
function feed(msg,kind='info'){if(CTX&&NET.host&&CTX!==NET.me){netMsg(CTX,'feed',msg,kind);return}if(MUTE&&!CTX)return;FEED.push({t:S?S.T:0,rt:performance.now(),msg,kind});if(FEED.length>60)FEED.shift();renderFeed()}
function renderFeed(){const now=performance.now(),el=$('feed');const items=FEED.filter(f=>now-f.rt<16000).slice(innerWidth<760?-3:-5);el.innerHTML=items.map(f=>`<div class="fd ${f.kind}" style="opacity:${now-f.rt>12000?.35:1}">${esc(f.msg)}</div>`).join('')}

// ============================================================ world runtime
let RID=1;
function makeNPC(role,side,cls,tier,load,home){if(side==='pirate'&&UNB_CLS[cls])cls=UNB_CLS[cls];
  const st=shipStats(side==='pirate'?null:side,cls,tier);
  return{type:'ship',npc:true,id:'n'+(RID++),role,side,fac:side,cls,tier,st,x:0,y:0,z:0,vx:0,vy:0,vz:0,q:q0(),hull:st.hull,shield:st.sCap,energy:st.eCap,load,cargo:{},home,wpn:side==='brood'?'kinetic':Math.random()<(side==='pirate'?.2:.45)?'laser':'kinetic',ai:{t:0,ax:rdir()},cool:rnd(.3),lastHit:-99,mineAcc:0,life:0,alive:true};
}
function faceInstant(e,dx,dy,dz){qLook(dx,dy,dz,0,1,0,e.q)}
function openWorld(sid){const o=W;
  W={sid,groups:{},ents:[],shots:[],beams:[],fx:[],missiles:[],decoys:[],lock:{p:0,locked:false,ref:null},flareCd:0,mslCd:0,t:0,popT:.5,tgt:null,jump:null,dead:0,stationEnt:null,outpostEnt:null,capMsgT:0,player:null};WORLDS[sid]=W;
  for(const g of GATES[sid])W.ents.push({type:'gate',x:g.x,y:g.y,z:g.z,to:g.to,r:110});
  const TR=mulberry(hashStr(sid+'tilt')),tilt=()=>qNorm(qMul(qAxis(1,0,0,(TR()-.5)*.7,q0()),qAxis(0,0,1,(TR()-.5)*.7,q0()),q0()));
  const TUR=[[0,104,0],[0,-104,0],[0,0,50],[0,0,-50],[50,0,0],[-50,0,0]];
  W.tilt=tilt;if(S.stations[sid])addStationEnt(S.stations[sid]);
  const oid=OUT_BY_SECTOR[sid];if(oid){const e={type:'outpost',q:tilt(),o:S.outposts[oid],x:0,y:0,z:0,r:oid==='hollow'?185:95,cool:0,lastHit:-99,aim:{x:0,y:0,z:1}};W.ents.push(e);W.outpostEnt=e}
  if(!NET.cl){populateAll();W.popT=rnd(28,40);
    for(const ev of S.events)if(ev.type==='offensive'&&ev.stage==='inbound'&&ev.sector===sid&&ev.eta<=S.T+2)ev.eta=S.T+3;
    for(const t of S.scouts||[])if(t.sector===sid){t.live=false;spawnScout(t,false)}
    for(const t of S.traders||[])if(t.sector===sid){t.live=false;spawnTrader(t,false)}
    for(const t of S.frigates||[])if(t.sector===sid){t.live=false;spawnFrigate(t,false)}}
  const w=W;W=o;return w}
function enterSector(sid){
  W=WORLDS[sid]||openWorld(sid);LW=W;
  Object.assign(W,{lock:{p:0,locked:false,ref:null},flareCd:0,mslCd:0,tgt:null,jump:null,dead:0,capMsgT:0,hitDirs:[],bridge:null,docking:null,hurt:0,shHit:0,shake:0});
  const P=S.player,st=shipStats(P.faction,P.cls,P.tiers,P.tune),q=q0();if(P.q){q.x=P.q[0];q.y=P.q[1];q.z=P.q[2];q.w=P.q[3]}
  W.player={type:'ship',isPlayer:true,id:'player',side:'player',fac:P.faction,cls:P.cls,st,x:P.x,y:P.y,z:P.z||0,vx:P.vx,vy:P.vy,vz:P.vz||0,q,hull:Math.min(P.hull,st.hull),shield:Math.min(P.shield,st.sCap),energy:Math.min(P.energy,st.eCap),cool:0,lastHit:-99,mineAcc:0,alive:true};
  W.ents.push(W.player);
  buildSectorScene(sid);cam.snap=true;
  if(!S.player.docked&&!NET.cl){launchPlayerDrones();convoyLaunch()}covC=null;for(const ev of S.events)announce(ev);
  for(const ev of S.events)if((ev.type==='offensive'||ev.type==='build')&&ev.stage==='inbound'&&ev.sector===sid&&ev.hold&&ev.att===S.player.faction){ev.eta=S.T+8;ev.hold=0;feed(`${FACTIONS[ev.att].short} ${ev.type==='build'?'constructor convoy':'strike group'}: "Good to see you. Jumping in on your wing in 8 seconds."`,'good')}
  if(S.player.route===sid){feed(`Arrived at ${DEF[sid].name}. Course complete.`,'good');S.player.route=null;apOn=false}else if(S.player.route&&apOn){const g=routeNext();if(g)W.tgt={kind:'gate',ref:g}}
}
function addStationEnt(R){const k=R.fwd?STN.fdepot:STN[R.kind],TUR=[[0,104,0],[0,-104,0],[0,0,50],[0,0,-50],[50,0,0],[-50,0,0]],tr=W.tilt||(()=>q0());
  const e={type:'station',rec:R,q:tr(),sMax:R.sMax,shield:R.shield,offline:0,lastHit:-99,range:k.range,turrets:TUR.slice(0,k.tur).map(p=>({p,aim:{x:0,y:0,z:1},cool:rnd(.6)})),x:R.x,y:R.y,z:R.z,fac:R.owner,name:R.name,r:120,cool:0,core:R.kind!=='depot',kind:R.kind,sc:R.owner==='brood'&&R.kind==='depot'?.65:1};
  devEnt(e);W.ents.push(e);W.stationEnt=e;return e}
function exitSector(){if(S&&S.unb&&S.player&&!CTX)try{takeEnd()}catch(e){}if(W&&W.player&&W.player.stealth){W.player.stealth=false;W.player.masked=false;W.player.maskR=0;if(NET.cl)netSend({t:'stealth',on:0})}if(W&&W.player&&W.player.landed){W.player.landed=null;W.player.masked=false;if(NET.cl)netSend({t:'land',on:0})}if(W&&W.docking){W.docking=null;dockHydStop()}
  if(!W)return;if(LW)W=LW;syncPlayer();if(S.player.convoy&&W.player&&!NET.cl){convoyJump();convoyPack()}const w=W;
  if(w.player){for(const d of w.player.drones||[])if(d.alive&&w.ents.includes(d))despawn(d);const i=w.ents.indexOf(w.player);if(i>=0)w.ents.splice(i,1);w.player.alive=false;w.player=null}
  w.bridge=null;w.gunseat=null;w.tgt=null;LW=null;
  if(!worldBusy(w))closeWorld(w);
  W=null;
}
// someone besides this browser's pilot still needs the system simulated
function worldBusy(w){if(!NET.host)return false;return netPilotsIn(w.sid)>0}
function closeWorld(w){const o=W;W=w;
  for(const e of W.ents)if(e.role==='frigate'&&e.tok){e.tok.hull=e.hull;e.tok.shield=e.shield;e.tok.live=false;if(isCar(e.tok))e.tok.wing=carWingNow(e,W)}
  for(const e of W.ents)if(e.npc)returnHome(e);
  for(const m of W.missiles)toDebris(S.sectors[W.sid],m.inv);W.missiles=[];
  for(const ev of S.events)if((ev.type==='offensive'||ev.type==='response')&&ev.stage==='engaged'&&ev.sector===W.sid){ev.stage='inbound';ev.eta=S.T+1}
  for(const ev of S.events)if(ev.type==='build'&&ev.live&&ev.sector===W.sid){ev.live=false;ev.until=S.T+45*(1-ev.prog)}
  for(const t of S.scouts||[])if(t.sector===W.sid)t.live=false;for(const t of S.traders||[])if(t.sector===W.sid)t.live=false;
  delete WORLDS[w.sid];W=o===w?null:o;
}
function returnHome(e){if(typeof e.home==='string'&&e.home.startsWith('hg:')&&hgDock(e))return;const h=holder(e.home)||S.econ.stock[e.side]||S.econ.stock.pirate;inv.addAll(h,e.load);inv.addAll(h,e.cargo);e.load={};e.cargo={}}
function syncPlayer(){if(!W||!W.player)return;const p=W.player,P=S.player;P.x=p.x;P.y=p.y;P.z=p.z;P.vx=p.vx;P.vy=p.vy;P.vz=p.vz;P.q=[p.q.x,p.q.y,p.q.z,p.q.w];P.hull=p.hull;P.shield=p.shield;P.energy=p.energy}
function refreshPlayerStats(){if(!W)return;const p=W.player,P=S.player;const old=p.st;p.st=shipStats(P.faction,P.cls,P.tiers,P.tune);p.cls=P.cls;if(old)p.hull=Math.min(p.st.hull,p.hull*(p.st.hull/old.hull));p.shield=Math.min(p.st.sCap,p.shield);p.energy=Math.min(p.st.eCap,p.energy)}
function popCap(){return DEF[W.sid].kind==='void'?6:17}
function popWants(){const d=DEF[W.sid],oid=OUT_BY_SECTOR[W.sid],o=oid&&S.outposts[oid];
  const want=[]; // [role, side, how many (ships, or wings when a wing size is given), chance, wing size]
  if(d.home){want.push(['miner',d.home,2,1],['patrol',d.home,1,1,3],['hauler',d.home,1,d.kind==='core'?.4:.3]);
    if(d.kind==='frontier'){for(const f of FAC_IDS)if(f!==d.home)want.push(['raider',f,1,.12,3]);want.push(['pirate','pirate',1,.15,3])}}
  else if(d.kind==='contested'){if(FACTIONS[o.owner]){want.push(['miner',o.owner,2,1],['patrol',o.owner,1,1,3]);if(o.owner!=='brood')want.push(['hauler',o.owner,1,.5])}for(const f of FAC_IDS)if(f!==o.owner)want.push(['raider',f,1,.2,3]);want.push(['pirate','pirate',o.owner==='pirate'?2:1,o.owner==='pirate'?1:.3,3])}
  else if(d.kind==='hub'){for(const f of FAC_IDS)want.push(['hauler',f,1,.6]);want.push(['pirate','pirate',1,.6,3]);if(FACTIONS[o.owner])want.push(['patrol',o.owner,1,1,3])}
  else if(d.kind==='den'){want.push(['pirate','pirate',o.owner==='pirate'?2:1,1,4]);if(FACTIONS[o.owner])want.push(['patrol',o.owner,1,1,3])}
  else if(d.kind==='hive')want.push(['patrol','brood',2,1,4],['miner','brood',3,1]);
  else if(d.kind==='deep'){want.push(['pirate','pirate',1,.3,3]);for(const f of FAC_IDS)want.push(['raider',f,1,.07,3])}
  else if(d.kind==='void'){want.push(['pirate','pirate',1,.06,3]);for(const f of FAC_IDS)want.push(['raider',f,1,.025,3])}
  {const Rs=S.stations[W.sid];if(Rs&&FACTIONS[Rs.owner]&&Rs.owner!==d.home&&Rs.kind==='depot'){want.push(['miner',Rs.owner,2,1],['patrol',Rs.owner,1,1,3]);if(Rs.owner!=='brood')want.push(['hauler',Rs.owner,1,.35])}}
  if(d.kind!=='hive'&&broodNear(W.sid))want.push(['raider','brood',1,d.kind==='void'?.08:.22,3]);
  {const g=unbWork('grog');if(g)for(const w of want)if(w[1]==='pirate'&&w.length>4)w[4]+=g>=3?2:1}
  return want}
// arrival: the system is already going about its business. Every wish on the list gets its chance at once, and everything is
// placed at work (miners at rocks, haulers along their runs, wings out on patrol) while the jump fade is still dark.
function populateAll(){const want=popWants(),live=()=>W.ents.filter(e=>e.npc&&e.role!=='drone').length;
  for(const[r,s,n,ch,ws]of want)for(let i=0;i<n;i++){if(live()>=popCap())return;if(Math.random()>=Math.min(1,ch*.9))continue;if(ws)spawnWing(r,s,ws,true);else if(r==='hauler')spawnHauler(s,true);else spawnNPC(r,s,true)}}
function populate(initial){
  const npcs=W.ents.filter(e=>e.npc&&e.role!=='drone');if(npcs.length>=popCap())return;
  const cnt=(r,s)=>npcs.filter(e=>e.role===r&&e.side===s).length;
  const wings=(r,s)=>Object.values(W.groups).filter(g=>g.role===r&&g.side===s&&!g.fleeing).length;
  const want=popWants();
  for(const[r,s,n,ch,ws]of want){
    if(ws){if(wings(r,s)<n&&Math.random()<(initial?.75:.25)*ch){spawnWing(r,s,ws,initial);return}}
    else if(cnt(r,s)<n&&Math.random()<(initial?.6:.35)*ch){if(r==='hauler')spawnHauler(s,initial);else spawnNPC(r,s,initial);return}}
}
// wings: combat ships always arrive in groups of 3+, share targets, fly formation and run for home when cut down to 1-2
function spawnWing(role,side,size,initial){const g={id:'g'+(RID++),side,role,members:[],n0:0,fleeing:false};let lead=null;
  for(let i=0;i<size;i++){const e=spawnNPC(role,side,initial,lead);if(!e)break;e.grp=g;e.slot=i;g.members.push(e);if(!lead)lead=e}
  if(g.members.length<3){for(const e of g.members)despawn(e);return null}g.n0=g.members.length;W.groups[g.id]=g;return g}
function grpAlive(g){return g.members.filter(m=>m.alive&&W.ents.includes(m))}
function grpLead(g){return g.members.find(m=>m.alive&&W.ents.includes(m)&&m.role!=='flee')||null}
const HOP={};for(const a of SECTOR_DEFS){const d={[a.id]:0},q=[a.id];while(q.length){const x=q.shift();for(const n of NEIGH[x])if(d[n]===undefined){d[n]=d[x]+1;q.push(n)}}HOP[a.id]=d}
function homeOf(side){return side==='pirate'?'wr':side==='brood'?'bl':FAC_HOME(side)}
function fleeGate(e){const h=homeOf(e.side);let best=null,bs=1e9;for(const g of GATES[W.sid]){if(S.gateDown[gateKey(W.sid,g.to)])continue;const sc=(HOP[h][g.to]||0)*5000+d3(g,e);if(sc<bs){bs=sc;best=g}}return best||nearestGate(e)}
// friendly fighter wings in a frigate's sector form a screen around it: they hunt torpedoes and bombers first
function screenSide(F){return F.side==='player'?S.player.faction:F.side}
function screenUpdate(){const fr=W.ents.filter(e=>e.role==='frigate'&&e.alive);if(!fr.length)return;
  for(const id in W.groups){const g=W.groups[id];if(g.fleeing||g.escort)continue;if(g.screen&&g.screen.alive&&W.ents.includes(g.screen))continue;g.screen=null;
    if(!['patrol','raider','screen'].includes(g.role))continue;const L=grpLead(g);if(!L)continue;
    const F=fr.filter(f=>screenSide(f)===g.side||(f.side===g.side)).sort((a,b)=>d3(a,L)-d3(b,L))[0];if(!F||d3(F,L)>4500)continue;
    if(Object.values(W.groups).filter(o=>o.screen===F).length>=3)continue;
    g.screen=F;g.role='screen';g.slotBase=Object.values(W.groups).filter(o=>o.screen===F).length;for(const m of grpAlive(g))if(m.role!=='flee'){m.role='screen';m.ai.tgt=null}
    if(F.side==='player'&&W.t-(W.scrMsg||-99)>20){W.scrMsg=W.t;feed(`${FACTIONS[g.side].short} ${grpAlive(g).length}-ship wing is forming a screen on ${F.tok.name}.`,'good')}}
  for(const e of W.ents)if(e.role==='screen'&&!(e.grp&&e.grp.screen&&e.grp.screen.alive&&W.ents.includes(e.grp.screen))){e.role='patrol';if(e.grp)e.grp.role='patrol'}}
function screenTarget(e){const F=e.grp&&e.grp.screen;if(!F)return findHostile(e,1500);let best=null,bd=1e9;
  for(const o of W.ents){if(o.type!=='ship'||!o.alive||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const df=d3(o,F);if(df>(isBmb(o.cls)?3800:2900))continue;
    const sc=df*(isBmb(o.cls)?.35:o.role==='frigate'?3:1)+d3(o,e)*.25;if(sc<bd){bd=sc;best=o}}return best}
function groupsUpdate(){if((W.scrT=(W.scrT||0)-1/30)<=0){W.scrT=1;screenUpdate()}for(const id in W.groups){const g=W.groups[id],al=grpAlive(g);if(!al.length){delete W.groups[id];continue}
  if(!g.fleeing&&g.n0>=3&&al.length<=(g.side==='pirate'&&unbWork('grog')>=2?1:2)&&g.members.some(m=>m.killed)){g.fleeing=true;for(const m of al){m.role='flee';m.ai.tgt=null}
    const who=g.side==='pirate'?'Unbound':FACTIONS[g.side].short;feed(hostile('player',g.side)?`${who} wing is broken: the last ${al.length===1?'ship is':al.length+' ships are'} running for home.`:`${who} wing is cut down and falling back.`,hostile('player',g.side)?'good':'warn')}}}
function spawnNPC(role,side,initial,lead){
  let tier=role==='miner'||role==='hauler'?1:side==='pirate'?pirateTier():factionTier(side);
  let cls=role==='miner'?wpick({skiff:1,prospector:2,dredger:1}):role==='hauler'?wpick({courier:1,freighter:2,bulker:1}):pickFighter(role);
  const srcs=[S.econ.fleet[side],S.econ.stock[side]].filter(Boolean);
  const lr=role==='raider'||role==='patrol'||role==='escort'?'patrol':role;let ld=loadout(lr,tier,cls);
  if(ld.drone){const have=srcs.reduce((a,x)=>a+(x.drone||0),0);ld.drone=Math.min(ld.drone,have);if(!ld.drone)delete ld.drone}
  if(!haveIn(ld,srcs)&&role!=='miner'&&role!=='hauler'){cls='interceptor';ld=loadout(lr,tier,cls)}
  while(!haveIn(ld,srcs)&&tier>1){tier--;ld=loadout(lr,tier,cls)}
  if(!takeFrom(ld,srcs))return null;
  if((cls==='heavy'&&tier>=2||cls==='bomber'||cls==='gunboat')&&srcs.some(x=>(x.swarm||0)>0)&&Math.random()<.6){takeFrom({swarm:1},srcs);ld.swarm=1}
  let tuned=0;if(lr==='patrol'&&srcs.some(x=>(x.tune||0)>0)&&Math.random()<.55){takeFrom({tune:1},srcs);ld.tune=1;tuned=1}
  const e=makeNPC(role,side,cls,tier,ld,'stock:'+side);if(role==='miner'&&side==='brood'){const st=S.econ.stock.brood||{};let left={skiff:14,prospector:24,dredger:36}[cls]||20;for(const k of['fe','cu','ir','xc','nu','au']){if(left<=0)break;const m=inv.take(st,k,Math.min(left,ri(4,12)));if(m){inv.add(e.cargo,k,m);left-=m}}}if(tuned){e.tuned=1;e.st=shipStats(side==='pirate'?null:side,cls,tier,1);e.hull=e.st.hull;e.shield=e.st.sCap}docFit(e,tuned);
  const sEnt=W.stationEnt&&W.stationEnt.fac===side?W.stationEnt:null;
  if(role==='hauler'){const gs=GATES[W.sid],D=sEnt?sEnt:W.outpostEnt&&W.outpostEnt.o.owner===side?W.outpostEnt:null;const g=pick(gs);let dest=pick(gs.filter(x=>x!==g));e.x=g.x*.94;e.y=g.y*.94;e.z=g.z*.94;
    if(D&&(!dest||Math.random()<.35)){if(Math.random()<.5)dest=D;else{dest=g;const o=rdir(.4);e.x=D.x+o.x*190;e.y=D.y+o.y*190;e.z=D.z+o.z*190}}e.ai.dest=dest||g;
    if(initial){const t=rnd(.15,.8),G=e.ai.dest;e.x+=(G.x-e.x)*t;e.y+=(G.y-e.y)*t;e.z+=(G.z-e.z)*t}
    const st=S.econ.stock[side];for(const[k,n]of[['plate',ri(2,8)],['wire',ri(2,6)],['coil',ri(0,2)],['fe',ri(0,14)]]){const m=inv.take(st,k,n);if(m)inv.add(e.cargo,k,m)}}
  else if(initial&&role==='miner'&&S.sectors[W.sid].ast.some(x=>!x.comet)){const a=pick(S.sectors[W.sid].ast.filter(x=>!x.comet)),o=rdir(.6),k=astR(a)+rnd(70,140);e.x=a.x+o.x*k;e.y=a.y+o.y*k;e.z=a.z+o.z*k;e.ai.ast=a}
  else if(initial){Object.assign(e,randPos(600*SPACE,2300*SPACE))}
  else if(sEnt&&(role==='miner'||role==='patrol')){const o=rdir(1);e.x=o.x*200;e.y=o.y*200;e.z=o.z*200}
  else{const g=pick(GATES[W.sid]);e.x=g.x*.93+rnd(-80,80);e.y=g.y*.93+rnd(-80,80);e.z=g.z*.93+rnd(-80,80);fxWarp(e,sideCol(side))}
  if(lead){const o=rdir();e.x=lead.x+o.x*70;e.y=lead.y+o.y*70;e.z=lead.z+o.z*70;qCopy(e.q,lead.q);W.ents.push(e);return e}
  faceInstant(e,-e.x+rnd(-300,300),-e.y,-e.z+rnd(-300,300));if(role==='hauler'){const g=e.ai.dest;faceInstant(e,g.x-e.x,g.y-e.y,g.z-e.z)}if(e.ai.ast&&initial){const a=e.ai.ast;faceInstant(e,a.x-e.x,a.y-e.y,a.z-e.z)}W.ents.push(e);if(e.load.drone)deployDrones(e);return e;
}
// guard drones: carried in the hold as items, flown out as tiny escorts; whatever survives goes home with the ship
function spawnFrigate(t,arrive){if(!W||t.live)return null;const side=t.side,fac=side==='player'?S.player.faction:side,tier=1;
  const cl=t.cls||'frigate',e=makeNPC('frigate',side,cl,tier,t.load,`frig:${t.id}:${side}`);t.load={};t.live=true;e.fac=fac;e.st={...shipStats(fac,cl,tier),hull:capHullMax(t)};e.hull=Math.min(t.hull,e.st.hull);e.shield=Math.min(t.shield||e.st.sCap,e.st.sCap);e.tok=t;e.wpn='kinetic';
  e.turrets=(cl==='carrier'?[[0,.55,.55],[0,.55,-.45],[.6,0,.2],[-.6,0,.2],[0,-.5,.1],[0,-.5,-.5]]:cl==='escort'?[[0,.55,.55],[0,.55,-.45],[.6,0,.2],[-.6,0,.2],[0,-.5,.1],[0,-.5,-.5]]:[[0,.55,.55],[0,.55,-.45],[.6,0,0],[-.6,0,0],[0,-.5,.1]]).map(p=>({p,cool:rnd(.5)}));e.lanceCd=rnd(1,2);
  if(arrive){const g=pick(GATES[W.sid]);e.x=g.x*.9;e.y=g.y*.9;e.z=g.z*.9;fxWarp(e,sideCol(side));frigArriveFx(e)}else{const o=rdir(.3);e.x=o.x*1300;e.y=o.y*300;e.z=o.z*1300}
  faceInstant(e,-e.x,-e.y,-e.z);W.ents.push(e);e.pickets=[];
  if(cl==='carrier'){const wg=t.wing||[];t.wing=[];wg.forEach((c,i)=>{const ld=carKit(c),got={};for(const k in ld){const m=Math.min(ld[k],e.load[k]||0);if(m>0)got[k]=inv.take(e.load,k,m)}const p=makeNPC('picket',side,c,factionTier(fac),got,e.home);p.fac=fac;p.mom=e;p.wg=i%2?'B':'A';p.ai.orb=i/Math.max(1,wg.length)*TAU;const o=rdir();p.x=e.x+o.x*200;p.y=e.y+o.y*200;p.z=e.z+o.z*200;qCopy(p.q,e.q);e.pickets.push(p);W.ents.push(p)})}
  return e}
function despawnFrigate(e){const t=e.tok;if(t){t.hull=e.hull;t.shield=e.shield;if(isCar(t))t.wing=carWingNow(e,W)}for(const p of e.pickets||[])if(p.alive&&W.ents.includes(p))despawn(p);despawn(e);if(t)t.live=false}
function fireTorps(e,T){const tier=Math.max(1,e.tier||1);for(const o of[-1,1])launchMissile(e,T,tier,'torpedo',o*e.st.radius*.45,true)}   // escort launchers reload on a cooldown: no stores spent, none left as wreckage
function fireLance(e,T){if(e.cls==='escort'){if(T&&T.type&&(T.type==='ship'?T.alive:true))fireTorps(e,T);return}qRot(e.q,0,0,1,_f);const r=e.st.radius,sx=e.x+_f.x*r*.9,sy=e.y+_f.y*r*.9+r*.3,sz=e.z+_f.z*r*.9,spd=820,lp=T.type==='ship'?leadPoint({x:sx,y:sy,z:sz,vx:0,vy:0,vz:0},T,spd):T;
  let dx=lp.x-sx,dy=lp.y-sy,dz=lp.z-sz;const l=hyp(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  W.shots.push({x:sx,y:sy,z:sz,vx:dx*spd,vy:dy*spd,vz:dz*spd,dmg:220,side:e.side,src:e,ttl:3.4,col:sideCol(e.side),sty:'capital',cap:true});fxSpark({x:sx,y:sy,z:sz},'#ffe2b0',10);
  const v=vAt(e);if(v>.05)SFX.lance(Math.min(1,v*1.3))}
function frigTurrets(e,dt){mdlFrigTurrets(e);const R=e.st.radius*1.1,C=e.tok&&fOwn(e.tok)?fctl(e.tok):null,mode=C?C.pd:'torps',pm=pmul(e.tok,'pd');if(mode==='hold'||pm<=0)return;for(const tu of e.turrets){if((tu.jamOff||0)>W.t)continue;tu.cool-=dt*pm;if(tu.cool>0)continue;qRot(e.q,tu.p[0]*R,tu.p[1]*R,tu.p[2]*R,_u);const wp={x:e.x+_u.x,y:e.y+_u.y,z:e.z+_u.z};let t=null,bd=800;
    if(mode!=='fighters')for(const m of W.missiles)if(m.kind==='torpedo'&&m.tgt===e&&hostile(e.side,m.side)){const d=d3(m,wp);if(d<bd){bd=d;t=m}}
    if(!t){bd=e.cls==='escort'?1400:1150;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o.role==='frigate'||o.role==='limpet'||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const d=d3(o,wp);if(d<bd){bd=d;t=o}}}
    if(!t&&mode==='fighters'){bd=800;for(const m of W.missiles)if(m.kind==='torpedo'&&m.tgt===e&&hostile(e.side,m.side)){const d=d3(m,wp);if(d<bd){bd=d;t=m}}}
    if(t){const es=e.cls==='escort';tu.cool=es?.3:.42;turretShot(wp,t,1300,es?15:10,e.side,12,'pd');if(W.t-(e.pdSnd||0)>2.2&&W.t-(W.pdG||-9)>1.1){const v=vAt(e);if(v>.04){e.pdSnd=W.t;W.pdG=W.t;SFX.pd(Math.min(1,v*1.4))}}}else tu.cool=.3}}
function frigateThink(e,dt){const t=e.tok;if(!t||!S.frigates.includes(t)){e.role='leave';return}if(t.dummy){e.vx=e.vy=e.vz=0;e.thrusting=e.boosting=false;e.hull=e.st.hull;e.shield=e.st.sCap;return}t.hull=e.hull;t.shield=e.shield;if(jamDark(e)){e.charging=0;e.thrusting=false;return}const C=fOwn(t)?fctl(t):null;
  frigTurrets(e,dt);
  const nx=isCar(t)&&!fOwn(t)&&t.dest&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side)?null:frigHop(t);   // an AI carrier stands off next door from a hostile station, as off-screen, and strikes it with Bravo
  if(nx){if(!t.spin||t.spin.to!==nx)t.spin={to:nx,p:0};t.spin.p+=dt/JUMP_TIME*pmul(t,'eng')*(isEsc(t)?ESC_JUMP:1);e.charging=t.spin.p;drumTick(e,t.spin.p,dt);if(Math.random()<.3)fxSpark({x:e.x+rnd(-80,80),y:e.y+rnd(-40,40),z:e.z+rnd(-80,80)},'#bfe0ff',2);
    if(t.spin.p>=1){t.spin=null;t.jumpTo=null;e.charging=0;e.drumT=0;{const v=vAt(e);if(v>.03)SFX.fjump(Math.min(1,v*1.4))}fxWarp(e,sideCol(e.side));fxBoom(e,220,'#bfe0ff');
      if(W.bridge&&W.bridge.f===e){W.pendingFJump={tok:t,to:nx};return}
      t.sector=nx;t.hold=0;t.moveT=0;despawnFrigate(e);if(fOwn(t))feedTo(t.owner,`${t.name} jumped to ${DEF[nx].name}.`,'info');if(t.owner&&NET.host&&!WORLDS[nx]&&Object.values(S.pilots||{}).some(P=>P.docked==='bridge'&&P.bridgeId===t.id))openWorld(nx);else if(WORLDS[nx])inW(WORLDS[nx],()=>spawnFrigate(t,true));return}}
  else{t.spin=null;e.charging=0}
  let T=null;
  if(C&&C.lanceMode==='target'&&C.tgt){const g=C.tgt;if(g.type==='works'?W.works.includes(g):g.type==='station'?W.stationEnt===g:g.type==='outpost'?(W.outpostEnt===g&&!g.o.breached):(g.alive&&W.ents.includes(g)))T=g;else C.tgt=null}
  if(!T&&(!C||C.lanceMode==='auto')){const SE=W.stationEnt;if(SE&&hostile(e.side,SE.fac))T=SE;if(W.works&&W.works.length){const wt=wkPickFor(e,!!T,C?.35:.5);if(wt)T=wt}let bd=2600;for(const o of W.ents)if(o.role==='frigate'&&o.alive&&o!==e&&hostile(e.side,o.side)){const d=d3(o,e);if(d<bd){bd=d;T=o}}if(!T){const OE=W.outpostEnt;if(OE&&OE.o.owner&&hostile(e.side,OE.o.owner)&&!OE.o.breached&&d3(OE,e)<2600)T=OE}}
  if(!T&&e.cls==='escort'&&(!C||C.lanceMode==='auto')){let bd=TORP_RANGE*.8;for(const o of W.ents)if(o.type==='ship'&&o.alive&&hostile(e.side,o.side)&&(o.cls==='bomber'||o.cls==='gunboat'||o.cls==='heavy')&&!mHid(o,e)&&!(o.isPlayer&&(S.player.docked||W.dead))){const d=d3(o,e);if(d<bd){bd=d;T=o}}}
  e.lanceT=T;
  if(C&&C.helm==='manual'){const mi=C.man&&performance.now()-C.man.at<800?C.man:{y:0,p:0},m=C.throttle*Math.min(1.6,pmul(t,'eng'));qRot(e.q,0,0,1,_f);qRot(e.q,1,0,0,_r);qRot(e.q,0,1,0,_u);
    if(mi.y||mi.p)faceDir(e,_f.x+_r.x*mi.y*.9+_u.x*mi.p*.7,_f.y+_r.y*mi.y*.9+_u.y*mi.p*.7,_f.z+_r.z*mi.y*.9+_u.z*mi.p*.7,dt);
    if(m>0.01){steer(e,e.x+_f.x*3000,e.y+_f.y*3000,e.z+_f.z*3000,dt,true,m*.9);e.thrusting=true}else brake(e,dt*.6)}
  else if(C){const m=C.throttle*Math.min(1.6,pmul(t,'eng'));if(C.movePt&&m>0){const d=steer(e,C.movePt.x,C.movePt.y,C.movePt.z,dt,true,m*.9);faceTo(e,C.movePt,dt);e.thrusting=d>80;if(d<70)C.movePt=null}
    else if(T&&(T.type==='station'||T.type==='outpost'||T.type==='works')&&C.lanceMode!=='hold'&&m>0&&d3(T,e)>2200){const d=d3(T,e),dx=T.x-e.x,dy=T.y-e.y,dz=T.z-e.z;steer(e,T.x-dx/d*1600,T.y-dy/d*1600,T.z-dz/d*1600,dt,true,m*.9);faceTo(e,T,dt);e.thrusting=true}
    else{brake(e,dt*.6);if(T)faceTo(e,T,dt*.5)}}
  else if(T){const d=d3(T,e)||1,want=T.type==='station'?1500:1200;if(Math.abs(d-want)>150){const dx=T.x-e.x,dy=T.y-e.y,dz=T.z-e.z;steer(e,T.x-dx/d*want,T.y-dy/d*want,T.z-dz/d*want,dt,true,.8)}else brake(e,dt*.5);faceTo(e,T,dt)}
  else{const OE=W.outpostEnt,A=OE?{x:OE.x+520,y:OE.y+160,z:OE.z+520}:{x:650,y:120,z:650};steer(e,A.x,A.y,A.z,dt,true,.6);if(hyp(e.vx,e.vy,e.vz)>8)faceDir(e,e.vx,e.vy,e.vz,dt)}
  const lm=e.cls==='carrier'?0:pmul(t,'lance');if(e.lanceCd>0)e.lanceCd-=dt*lm;
  if(C&&C.fire){C.fire=0;if(e.lanceCd<=0&&lm>0){qRot(e.q,0,0,1,_f);const aim=T&&d3(T,e)<2600?T:{x:e.x+_f.x*2400,y:e.y+_f.y*2400,z:e.z+_f.z*2400,vx:0,vy:0,vz:0};e.lanceCd=e.cls==='escort'?ESC_TORP_CD:2.6;fireLance(e,aim)}}
  else if(T&&!(C&&C.lanceMode==='hold')&&e.lanceCd<=0&&d3(T,e)<(e.cls==='escort'?TORP_RANGE:2600)&&lm>0){e.lanceCd=e.cls==='escort'?ESC_TORP_CD:2.6;fireLance(e,T)}}
const BRIDGE={off:[0,.36,.05],cons:[{id:'strat',name:'Strategic map',x:0,z:2,col:'#6fb7ff'},{id:'nav',name:'Helm',x:10,z:11.6,face:[0,-1],col:'#7ad9a7'},{id:'wpn',name:'Weapons',x:-10,z:11.6,face:[0,-1],col:'#ff8a6a'},{id:'eng',name:'Engineering',x:-15,z:-8,col:'#f0b24a'},{id:'hatch',name:'Hatch · back to your fighter',x:15,z:-11,col:'#ece4cf'},{id:'cmd',name:'Command chair',x:0,z:-6.2,col:'#f0b24a'},{id:'comms',name:'Comms',x:16,z:-1,col:'#c99cff'}]};
// furniture you can't walk through (x, z, radius) and the reach for each console
const BR_SOLID=[[0,2,3.9],[16,-1,2.3],[10,11.6,2.3],[-10,11.6,2.3],[10,8.7,1],[-10,8.7,1],[0,-6.2,1.5],[2.9,-5.1,1],[-2.9,-5.1,1],[-15,-8,2.4],[-19.5,-12.5,1.9],[-17,-13.8,1.5]],BR_REACH={strat:6,cmd:3.4,hatch:5.5};
// Frigate bridge interior, in the same finish as the ship models: light grey panelling, dark metal trim and the
// faction's colour on the accent strips. Room is 44 x 30 x 11 (x across, z forward to the main viewport, y up).
// Console, seat and table positions match BRIDGE.cons / BR_SOLID, so walking, reach and the overlay labels are unchanged.
function bridgeMesh(fac){fac=fac||'halcyon';const key='bridge_'+fac;if(MESH[key])return MESH[key];
  const F=hexRGB(sideCol(fac)),P=bridgePal(F),g=new GB();
  bridgeShell(g,P);bridgeFloorCeil(g,P);bridgeTable(g,P);
  for(const c of BRIDGE.cons)if(c.id!=='cmd'&&c.id!=='strat'&&c.id!=='hatch')bridgeConsole(g,P,c);
  bridgeFurniture(g,P);bridgeLight(g.d);
  return MESH[key]=g.upload()}
const BR_SUN=[.62,.6,.56],BR_AMB=[.42,.43,.47];
function bridgePal(F){return{F,
  PN:mixC([.6,.61,.63],F,.05),  // light wall panel
  MD:[.33,.35,.39],              // mid grey
  DK:[.12,.13,.15],              // dark metal
  TR:[.23,.24,.28],              // trim and frames
  MT:[.47,.49,.53],              // bare metal
  FL:[.24,.25,.28],               // floor tile
  SC:[.025,.04,.055],            // screen glass
  LT:[1,.95,.86],                // ceiling light
  AC:scaleC(F,.75),              // faction accent
  HO:mixC([.45,.78,1],F,.3),     // hologram blue, tinted to the faction
  AM:[1,.72,.3],RD:[1,.4,.32],GR:[.45,.9,.6],GL:[.35,.7,.95],
  LE:[.21,.19,.18]}}             // seat upholstery
const _bq=(ax,ay,az,a)=>qAxis(ax,ay,az,a,q0()),_bv={x:0,y:0,z:0};
// walls, windows, frames and chamfers
function bridgeShell(g,P){const v=(c,a,b)=>scaleC(c,a+Math.random()*(b-a)),Q4=Math.PI/4;
  // back wall: lower band, panelled middle, dark top
  g.set(0,5.5,-15.2).box(44,11,.4,P.MD);
  for(let x=-20;x<20;x+=4){g.set(x+2,1.5,-14.97).box(3.9,2.9,.06,v(P.MD,.9,1.08));g.set(x+2,6.2,-14.97).box(3.9,6.2,.06,v(P.PN,.9,1.06));g.set(x+2,9.95,-14.97).box(3.9,1.2,.06,v(P.TR,.9,1.1))}
  g.set(0,3.05,-14.9).box(44,.1,.1,P.AC,.4);g.set(0,9.3,-14.9).box(44,.1,.1,P.TR);
  // side walls: solid lower and upper bands, solid fore and aft sections, window between z -6.5 and 12.5
  for(const s of[-1,1]){const X=22*s;
    g.set(X+.2*s,1.25,0).box(.4,2.5,30,P.MD);g.set(X+.2*s,10.25,0).box(.4,2,30,P.TR);
    g.set(X+.2*s,5.5,-10.75).box(.4,11,8.5,P.MD);g.set(X+.2*s,5.5,13.75).box(.4,11,2.5,P.MD);
    for(let z=-14;z<14;z+=4)g.set(X-.03*s,1.3,z+2).box(.06,2.4,3.9,v(P.MD,.9,1.08));
    for(let z=-14.5;z<-7;z+=4)g.set(X-.03*s,5.9,z+2).box(.06,6.6,3.9,v(P.PN,.9,1.06));
    // window frame: sill, header, posts and ribs between panes, accent line on the sill
    g.set(X-.35*s,2.45,3).box(.9,.3,19.4,P.TR);g.set(X-.35*s,9.3,3).box(.9,.3,19.4,P.TR);g.set(X-.75*s,2.62,3).box(.08,.05,19,P.AC,.4);
    for(const z of[-6.5,12.5])g.set(X-.35*s,5.875,z).box(.9,7.2,.7,P.TR);
    for(const z of[-1.75,3,7.75])g.set(X-.25*s,5.875,z).box(.5,6.8,.35,P.DK);
    // chamfers: floor to wall and wall to ceiling
    g.set(21.35*s,.62,0,_bq(0,0,1,-s*Q4)).box(.22,1.75,29.6,P.TR);g.set(21.3*s,.98,0,_bq(0,0,1,-s*Q4)).box(.06,.5,29.6,P.DK);
    g.set(21.35*s,10.4,0,_bq(0,0,1,s*Q4)).box(.22,1.75,29.6,P.TR);
    // conduits run along the lower wall
    g.set(21.55*s,1.95,0).box(.28,.28,29,P.MT);g.set(21.55*s,1.6,0).box(.18,.18,29,P.DK);
    // floor light strip along the wall
    g.set(20.4*s,.06,0).box(.08,.04,28.6,P.AC,.35)}
  // front wall: big viewport from 1.6 to 9.6 with two mullions and corner posts
  g.set(0,.8,15.2).box(44,1.6,.4,P.MD);g.set(0,10.4,15.2).box(44,1.6,.4,P.TR);
  for(const s of[-1,1]){g.set(20*s,5.5,15.2).box(4,11,.4,P.MD);g.set(18.1*s,5.6,14.8).box(.7,8.4,.9,P.TR);g.set(6*s,5.6,14.85).box(.6,8.2,.6,P.TR);g.set(12*s,5.6,14.9).box(.25,8,.3,P.DK)}
  g.set(0,1.6,14.75).box(36.6,.35,.9,P.TR);g.set(0,9.6,14.75).box(36.6,.35,.9,P.TR);
  // ceiling chamfers fore and aft, floor chamfer aft (clear of the hatch)
  g.set(0,10.4,14.35,_bq(1,0,0,-Q4)).box(43,1.75,.22,P.TR);g.set(0,10.4,-14.35,_bq(1,0,0,Q4)).box(43,1.75,.22,P.TR);
  for(const[a,b]of[[-21.6,11.8],[18.2,21.6]])g.set((a+b)/2,.62,-14.35,_bq(1,0,0,-Q4)).box(b-a,1.75,.22,P.TR)}
// floor tiles, walkways, ceiling beams and lights
function bridgeFloorCeil(g,P){const v=(c,a,b)=>scaleC(c,a+Math.random()*(b-a));
  g.set(0,-.2,0).box(44,.4,30,P.DK);g.set(0,11.2,0).box(44,.4,30,[.07,.075,.09]);
  for(let x=-22;x<22;x+=4)for(let z=-15;z<15;z+=4){const w=Math.min(4,22-x),d=Math.min(4,15-z);g.set(x+w/2,.012,z+d/2).box(w-.08,.024,d-.08,v(P.FL,.9,1.08))}
  // walkways: centre aisle to the viewport, crew row, dais approach, engineering and hatch bays
  for(const[x,z,w,d]of[[0,6,5,14],[0,9.6,31,4.4],[-15,-8.5,9,7],[15,-10,8,7],[15,-1,6,5]]){g.set(x,.03,z).box(w,.04,d,[.15,.16,.19]);for(let i=-w/2+.6;i<w/2;i+=1.2)g.set(x+i,.055,z).box(.06,.01,d-.4,[.11,.12,.14])}
  for(const s of[-1,1])g.set(2.55*s,.07,6).box(.07,.04,14,P.AC,.35);
  // contact shadows under furniture
  for(const[x,z,r]of BR_SOLID)g.set(x,.065,z).cyl(r+.45,r+.45,.005,18,[.075,.08,.095],0,true);
  // ceiling: dark panels, beams, two spines with light strips, ring light over the table
  for(let x=-22;x<22;x+=4)for(let z=-15;z<15;z+=6)g.set(x+2,10.97,z+3).box(3.88,.04,5.88,v([.14,.15,.18],.85,1.15));
  for(const z of[-12,-6,0,6,12]){g.set(0,10.62,z).box(43.6,.7,.8,P.TR);g.set(0,10.25,z).box(43.6,.06,.2,P.DK)}
  for(const s of[-1,1]){g.set(12*s,10.5,0).box(1.2,.8,29.6,P.TR);g.set(12*s,10.08,0).box(.45,.05,28.5,P.LT,.45);g.set(20*s,10.9,0).box(.35,.05,27,P.LT,.4)}
  for(let i=0;i<24;i++){const a=i/24*TAU;g.set(Math.sin(a)*4.4,10.6,2+Math.cos(a)*4.4,_bq(0,1,0,a)).box(1.2,.1,.3,mixC(P.LT,P.HO,.35),.6)}
  g.set(0,10.75,2).cyl(4.9,4.9,.25,24,P.TR,0,false);
  // pipes along the ceiling edges
  for(const s of[-1,1])for(const[o,c]of[[0,P.MT],[.45,[.35,.3,.22]]]){g.set(17*s+o*s,10.4,0,_bq(1,0,0,Math.PI/2)).cyl(.16,.16,29,8,c)}}
// holo table: dark glass top with range rings, lit rim, projector
function bridgeTable(g,P){const x=0,z=2,H=P.HO;
  g.set(x,.75,z).cyl(2.3,2.9,1.5,20,P.TR);g.set(x,1.55,z).cyl(3.6,3.9,.35,24,P.DK);g.set(x,1.85,z).cyl(3.8,3.6,.3,24,P.MT);
  g.set(x,2.02,z).cyl(3.25,3.25,.06,32,mixC(P.SC,H,.12),.3);
  g.set(x,2.06,z).torus(3.42,.07,40,4,H,.85);
  for(const R of[1.05,2.1])g.set(x,2.07,z).torus(R,.025,R>1.5?36:24,3,H,.75);
  for(let i=0;i<4;i++)g.set(x,2.07,z,_bq(0,1,0,i*Math.PI/4)).box(6.2,.012,.04,scaleC(H,.7),.6);
  g.set(x,2.12,z).cyl(.35,.45,.1,12,P.MT);g.set(x,2.18,z).cyl(.22,.22,.05,12,[.85,.95,1],.9);
  // grab rail around the base
  for(let i=0;i<8;i++){const a=i/8*TAU;g.set(x+Math.sin(a)*3.75,1.98,z+Math.cos(a)*3.75).box(.12,.08,.12,P.AC,.5)}}
// station console: plinth, body, angled desk with keys, tilted screen in a bezel with a lit header and bars
function bridgeConsole(g,P,c){const col=hexRGB(c.col),q=c.face?qLook(c.face[0],0,c.face[1],0,1,0,q0()):qLook(-c.x,0,-c.z+2,0,1,0,q0());
  const at=(lx,ly,lz,qq,sx)=>{qRot(q,lx,ly,lz,_u);return g.set(c.x+_u.x,ly,c.z+_u.z,qq||q,sx)};
  at(0,.15,0).box(3.4,.3,1.3,P.DK);at(0,1.15,-.15).box(4.2,1.7,1.3,P.MD);at(0,.55,.52).box(3.8,.5,.06,P.DK);
  for(const s of[-1,1])at(2.12*s,2.45,-.25).box(.16,2.4,1.25,P.TR);
  const qd=qMul(q,_bq(1,0,0,.3),q0()),dk=(lx,ly,lz)=>{qRot(qd,lx,ly,lz,_bv);qRot(q,0,2.05,.3,_u);return g.set(c.x+_u.x+_bv.x,2.05+_bv.y,c.z+_u.z+_bv.z,qd)};
  dk(0,0,0).box(4.3,.18,1.5,P.TR);dk(0,.1,-.05).box(3.9,.03,1.1,P.SC,.15);
  for(let r=0;r<3;r++)for(let k=0;k<8;k++)dk(-1.6+k*.46,.13,-.38+r*.32).box(.3,.03,.2,r===0&&k%3===0?col:k%5===2?P.AM:[.32,.36,.42],r===0&&k%3===0?.9:k%5===2?.7:.25);
  dk(0,.1,.7).box(4.3,.05,.06,col,.8);
  const qs=qMul(q,_bq(1,0,0,-.2),q0()),sv=(lx,ly,lz,sx)=>{qRot(qs,lx,ly,lz,_bv);qRot(q,0,3.35,-.5,_u);return g.set(c.x+_u.x+_bv.x,3.35+_bv.y,c.z+_u.z+_bv.z,qs,sx)};
  sv(0,0,0).box(4,2.05,.2,P.TR);sv(0,0,.11).box(3.7,1.78,.04,mixC(P.SC,col,.1),.4);
  sv(0,.8,.14).box(3.7,.1,.04,col,.95);
  for(let i=0;i<4;i++){const w=.4+((i*7+c.x*3)%5)/5*1.1;sv(-1.75+w/2,-.5-i*.1,.14).box(w,.05,.03,scaleC(col,.8),.85)}
  sv(1.45,-.6,.14).box(.5,.4,.03,scaleC(col,.5),.5);
  sv(0,-1.05,.05).box(4,.08,.3,P.DK)}
// command dais and chair, crew seats, back-wall screens and cabinets, engineering, hatch
function bridgeFurniture(g,P){const yq=a=>_bq(0,1,0,a);
  // crew seats behind helm and weapons
  for(const s of[-1,1]){const x=10*s;g.set(x,.45,8.7).cyl(.3,.55,.9,10,P.MT);g.set(x,1.05,8.7).box(1.9,.32,1.8,P.LE);g.set(x,1.25,8.7).box(1.6,.1,1.5,scaleC(P.LE,1.25));g.set(x,2.3,7.85).box(1.9,2.3,.32,P.LE);g.set(x,2.3,7.68).box(1.6,1.9,.06,P.DK);g.set(x,3.3,7.68).box(1.2,.08,.08,P.AC,.6);
    for(const a of[-1,1])g.set(x+a*1.05,1.55,8.6).box(.22,.18,1.4,P.MT)}
  // dais: two steps, accent nosing, chair, arm panels and side consoles
  g.set(0,.28,-6.5).box(11,.56,6.5,P.TR);g.set(0,.14,-2.9).box(6,.28,.9,P.TR);g.set(0,.58,-3.27).box(11,.04,.1,P.AC,.75);g.set(0,.3,-2.47).box(6,.04,.08,P.AC,.6);
  for(const s of[-1,1])g.set(5.5*s,.58,-6.5).box(.1,.04,6.5,P.AC,.5);
  g.set(0,1.05,-6.2).cyl(.45,.7,1,12,P.MT);g.set(0,1.75,-6.2).box(2.6,.45,2.4,P.LE);g.set(0,2.02,-6.1).box(2.2,.1,2,scaleC(P.LE,1.25));g.set(0,2.75,-7.35).box(2.6,2,.45,P.LE);g.set(0,3.85,-7.35).box(1.6,.35,.4,P.LE);g.set(0,2.75,-7.6).box(2.7,2.1,.08,P.TR);g.set(0,2.75,-7.66).box(2.3,1.7,.04,P.DK);for(const k of[-1,1])g.set(k*1.2,2.75,-7.67).box(.06,1.7,.04,P.AC,.45);g.set(0,3.8,-7.62).box(2.2,.06,.06,P.AC,.8);
  for(const a of[-1,1]){g.set(a*1.45,2.3,-6.1).box(.35,.25,2,P.MT);g.set(a*1.45,2.45,-5.4).box(.3,.04,.6,a<0?P.GL:P.AM,.8);
    g.set(a*2.9,1.5,-5.1,yq(-a*.5)).box(1.4,1.9,.9,P.MD);const qs=qMul(yq(-a*.5),_bq(1,0,0,-.6),q0());g.set(a*2.9,2.6,-5.1,qs).box(1.3,1.05,.12,P.TR);
    qRot(qs,0,0,.07,_u);g.set(a*2.9+_u.x,2.6+_u.y,-5.1+_u.z,qs).box(1.15,.9,.03,mixC(P.SC,a<0?P.GL:P.GR,.15),.4);qRot(qs,0,.38,.09,_u);g.set(a*2.9+_u.x,2.6+_u.y,-5.1+_u.z,qs).box(1.15,.07,.03,a<0?P.GL:P.GR,.9)}
  // back wall: three status screens in bezels
  for(const x of[-9,0,9]){g.set(x,6.6,-14.75).box(7.6,4.2,.25,P.TR);g.set(x,6.6,-14.6).box(7,3.6,.05,mixC(P.SC,x?P.GL:P.AM,.08),.35);g.set(x,8.3,-14.56).box(7,.12,.05,x?P.GL:P.AM,.9);
    for(let i=0;i<3;i++)g.set(x-2.6+i*.5,5,-14.56).box(.3,.3,.03,[P.GR,P.AM,P.GL][i],.8)}
  // equipment cabinets under the screens
  for(let x=-12.5;x<=9;x+=2.5){if(Math.abs(x)<5.6)continue;g.set(x,1.4,-14.55).box(2.35,2.8,.8,P.MD);g.set(x,1.4,-14.13).box(2.1,2.55,.04,scaleC(P.MD,1.12));g.set(x,1.4,-14.1).box(.04,2.5,.03,P.DK);g.set(x+.7,2.4,-14.1).box(.25,.08,.03,[P.GR,P.AM,P.GL][Math.round(x/2.5+6)%3],.85)}
  // engineering: reactor column with glowing core and clamp rings, control bank
  g.set(-19.5,5.5,-12.5).cyl(1.6,1.6,11,16,P.TR);g.set(-19.5,5.5,-12.5).cyl(.95,.95,11.1,16,P.AM,.8);for(const y of[1.2,3.6,6,8.4,10.2])g.set(-19.5,y,-12.5).cyl(1.85,1.85,.45,16,P.MT);
  for(let i=0;i<6;i++){const a=i/6*TAU;g.set(-19.5+Math.cos(a)*1.62,5.5,-12.5+Math.sin(a)*1.62,yq(-a)).box(.12,9.6,.4,P.DK)}
  g.set(-17,1.2,-14.2).box(4,2.4,1.2,P.MD);g.set(-17,2.45,-14.1).box(3.8,.1,1,P.TR);for(let i=0;i<5;i++)g.set(-18.4+i*.7,2.53,-13.8).box(.35,.06,.35,[P.AM,P.GR,P.AM,P.RD,P.GR][i],.9);
  // hatch: door in a heavy frame, hazard stripes, lit header
  g.set(15,4,-14.8).box(5.6,8.4,.5,P.TR);g.set(15,4,-14.52).box(4.2,7.2,.1,[.22,.235,.27]);g.set(15,4,-14.45).box(.06,7,.05,P.DK);for(const y of[2,6])g.set(15,y,-14.45).box(4,.06,.05,P.DK);
  g.set(15,8.2,-14.45).box(4,.3,.1,[.93,.89,.8],.85);
  for(let i=0;i<7;i++)g.set(12.6+i*.8,.5,-14.5,_bq(0,0,1,.7)).box(.35,1,.06,i%2?[.1,.1,.1]:P.AM,i%2?0:.55);
  for(const s of[-1,1])g.set(15+s*2.8,4,-14.5).box(.3,8,.08,P.AM,.45)}
// baked lighting: corners and floor edges fall into shadow, pools of light under the ceiling strips and the table ring
function bridgeLight(d){const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
  for(let i=0;i<d.length;i+=10){if(d[i+9]>.3)continue;const x=d[i],y=d[i+1],z=d[i+2];
    const dw=Math.min(22-Math.abs(x),15-Math.abs(z)),wall=1-.32*(1-sm(0,3.5,dw)),
      flo=1-.22*(1-sm(0,1.6,y))*(1-sm(0,6,dw)),cei=1-.3*sm(8.5,11,y),
      pool=y<4.5?1+.22*Math.exp(-((Math.abs(x)-12)**2)/18)+.28*Math.exp(-(x*x+(z-2)**2)/26)+.12*Math.exp(-(x*x+(z+6)**2)/20):1,
      f=wall*flo*cei*pool;
    d[i+6]*=f;d[i+7]*=f;d[i+8]*=f}}
function bridgeOrigin(F){const k=F.st.radius*1.25;qRot(F.q,BRIDGE.off[0]*k,BRIDGE.off[1]*k,BRIDGE.off[2]*k,_u);return{x:F.x+_u.x,y:F.y+_u.y,z:F.z+_u.z}}
function enterBridge(F){recallPlayerDrones();S.player.docked='bridge';if(F.tok&&isCar(F.tok)&&Object.keys(S.player.cargo||{}).length){if(NET.cl)netSend({t:'resup',id:F.tok.id});else carResupply(F.tok)}if(NET.cl)netSend({t:'bridge',id:F.tok&&F.tok.id,slot:S.player.bslot|0});if(NET.host)S.hostAtt={id:F.tok&&F.tok.id,slot:S.player.bslot|0,cls:S.player.cls,fac:S.player.faction};W.bridge={f:F,x:-5,z:-6,yaw:.25,pitch:0,panel:null};ghostSync();cam.snap=true;closeConsole();SFX.clunk();SFX.hatch();flash(fGuest(F.tok)?`Aboard ${F.tok.name}, a ${FAC(F.tok.side).short} ${capName(F.tok)}. Take command, or ride along as a guest.`:`Aboard ${F.tok.name}. WASD to walk, mouse to look, E at a console.`);fctl(F.tok);if(fGuest(F.tok))openConsole('strat')}
function exitBridge(){const B=W.bridge;if(!B)return;freeLook();if(B.seat)standChair();const F=B.f,p=W.player;W.bridge=null;closeConsole();S.player.docked=null;if(NET.host)S.hostAtt=null;const bp=F.alive?berthPose(F,S.player.bslot|0,S.player.cls,_bp):null;
  if(bp){p.x=bp.x;p.y=bp.y;p.z=bp.z;qCopy(p.q,bp.q);p.vx=F.vx;p.vy=F.vy;p.vz=F.vz;W.detach={F,slot:S.player.bslot|0,t:0};flash(carBay(F)?'Lifting off the flight deck…':'Releasing the hull clamps…')}
  else{qRot(F.q,0,-1,0,_u);const k=F.st.radius*1.25;p.x=F.x+_u.x*k*.9;p.y=F.y+_u.y*k*.9;p.z=F.z+_u.z*k*.9;p.vx=F.vx+_u.x*60;p.vy=F.vy+_u.y*60;p.vz=F.vz+_u.z*60;qCopy(p.q,F.q)}cam.snap=true;SFX.clunk();SFX.hatch();launchPlayerDrones();if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]})}
// leaving the bridge without walking out (frigate destroyed, lost contact): give the mouse back, stop any turn in progress
function ejectReset(){freeLook();mouse.aim=false;mouse.l=mouse.r=false;const p=W&&W.player;if(p){p.wx=p.wy=p.wz=0}cam.snap=true}
// the frigate died under you: thrown clear of the wreck, level, with a few seconds of grace from the blast
function bridgeEject(F){const B=W.bridge;if(B)B.seat=false;W.bridge=null;const el=$('fcon');if(el)el.hidden=true;S.player.docked=null;if(NET.host)S.hostAtt=null;ejectReset();
  const p=W.player;qRot(F.q,0,1,0,_u);const k=(F.st?F.st.radius:120)*1.5+60;p.x=F.x+_u.x*k;p.y=F.y+_u.y*k;p.z=F.z+_u.z*k;p.vx=(F.vx||0)+_u.x*90;p.vy=(F.vy||0)+_u.y*90;p.vz=(F.vz||0)+_u.z*90;qCopy(p.q,F.q);
  p.shield=p.st.sCap;W.ejectT=W.t+3;launchPlayerDrones();if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]});SFX.clunk();flash('The ship is gone. Emergency release: you are clear of the wreck.',true)}
function bridgeNear(){const B=W.bridge;if(!B||B.seat)return null;let best=null,bd=1e9;for(const c of BRIDGE.cons){const d=Math.hypot(c.x-B.x,(c.id==='hatch'?c.z-3:c.z)-B.z);if(d<(BR_REACH[c.id]||5.5)&&d<bd){bd=d;best=c}}return best}
function bridgeUpdate(dt){const B=W.bridge,F=B.f,p=W.player;if(!F.alive){bridgeEject(F);return}if(NET.cl&&!W.ents.includes(F)){freeLook();MP.fjB={id:F.tokId,keep:{x:B.x,z:B.z,yaw:B.yaw,pitch:B.pitch,seat:B.seat,fy:B.fy},at:performance.now()};closeConsole();W.bridge=null;return}
  if(!W.ents.includes(F)){bridgeEject(F);return}
  p.x=F.x;p.y=F.y-F.st.radius*.5;p.z=F.z;p.vx=F.vx;p.vy=F.vy;p.vz=F.vz;p.shield=p.st.sCap;
  bridgeAmb(dt,F);if(NET.cl){const T=F.tok;if(T&&T.spin){if(B.spinRef!==T.spin){B.spinRef=T.spin;B.spinP=T.spin.p}else B.spinP+=dt/JUMP_TIME*pmul(T,'eng');drumTick(F,B.spinP,dt)}}
  {const T=F.tok,sp=T&&T.spin?(NET.cl?(B.spinP||T.spin.p):T.spin.p):0;if(sp>.88||FJFX){const k=Math.min(1,dt*3);B.yaw+=(Math.round(B.yaw/TAU)*TAU-B.yaw)*k;B.pitch+=(0-B.pitch)*k}}
  if(B.panel){B.vx=B.vz=0;return}
  const lk=lookLocked(),si=lk?keyLook():steerInput();B.yaw+=si.yaw*1.8*dt;B.pitch=clamp(B.pitch-si.pitch*1.4*dt,-1.2,1.2);
  if(B.seat){B.vx=B.vz=0;B.fy=.56;return}
  const fx=Math.sin(B.yaw),fz=Math.cos(B.yaw);let mx=0,mz=0;if(keys.KeyW){mx+=fx;mz+=fz}if(keys.KeyS){mx-=fx;mz-=fz}if(keys.KeyA){mx+=fz;mz-=fx}if(keys.KeyD){mx-=fz;mz+=fx}
  const l=Math.hypot(mx,mz),run=keys.ShiftLeft||keys.ShiftRight?1.45:1,tv=l>0?7.5*run:0,tx=l>0?mx/l*tv:0,tz=l>0?mz/l*tv:0,k=Math.min(1,dt*(l>0?11:14));
  B.vx=(B.vx||0)+(tx-(B.vx||0))*k;B.vz=(B.vz||0)+(tz-(B.vz||0))*k;B.x=clamp(B.x+B.vx*dt,-20.4,20.4);B.z=clamp(B.z+B.vz*dt,-13.6,13.2);
  for(const[ox,oz,r]of BR_SOLID){const dx=B.x-ox,dz=B.z-oz,d=Math.hypot(dx,dz),R=r+.7;if(d<R){const n=d||1;B.x=ox+dx/n*R;B.z=oz+dz/n*R}}
  const fl=Math.abs(B.x)<5.5&&B.z>-9.75&&B.z<-3.25?.56:Math.abs(B.x)<3&&B.z>=-3.35&&B.z<-2.45?.28:0;B.fy=(B.fy||0)+(fl-(B.fy||0))*Math.min(1,dt*12);
  const sp=Math.hypot(B.vx,B.vz),ph=B.bob||0;B.bob=ph+sp*dt*1.15;B.bobA=(B.bobA||0)+((sp>1?1:0)-(B.bobA||0))*Math.min(1,dt*8);if(Math.floor(B.bob/Math.PI)!==Math.floor(ph/Math.PI)&&sp>1)SFX.step(run>1?1.2:1)}
// mouse look: click the view to capture the pointer (Esc releases); without capture the old edge-steering still works
function bridgeTargets(F){const out=[],SE=W.stationEnt,OE=W.outpostEnt;if(SE&&hostile('player',SE.fac))out.push(SE);for(const w of W.works||[])if(hostile('player',w.fac))out.push(w);if(OE&&OE.o.owner&&hostile('player',OE.o.owner)&&!OE.o.breached)out.push(OE);
  for(const e of W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)&&d3(e,F)<6000).sort((a,b)=>(b.role==='frigate')-(a.role==='frigate')||d3(a,F)-d3(b,F)))out.push(e);return out}
function bridgeSetTgt(e){const B=W.bridge;if(!B||!e)return;const t=B.f.tok;fconSend(t,'tgt',e);const d=Math.round(d3(e,B.f));if(isCar(t)){if(e.type==='ship')fconSend(t,'pk:attack',null);flash(`Wing ${e.type==='ship'?'striking':'target:'} ${fTgtName(e)} · ${fmt(d)} m.`);return}const rg=isEsc(t)?TORP_RANGE:2600;flash(`${isEsc(t)?'Torpedoes':'Battery'} targeting ${fTgtName(e)} · ${fmt(d)} m${d>rg?` (out of range: close to ${(rg/1000).toFixed(1)} km)`:''}.`)}
function bridgeTarget(next){const B=W.bridge;if(!B)return;const L=bridgeTargets(B.f);if(!L.length){flash('No hostile ships, stations or outposts here.',true);return}const C=fctl(B.f.tok);if(!next){bridgeSetTgt(L.slice().sort((a,b)=>d3(a,B.f)-d3(b,B.f))[0]);return}const i=L.indexOf(C.tgt);bridgeSetTgt(L[(i+1)%L.length])}
function bridgeClickTarget(){const B=W.bridge;if(!B)return;let best=null,bd=1e9;for(const e of bridgeTargets(B.f)){const P=proj(e.x,e.y,e.z);if(P.behind)continue;const r=Math.max(36,projR(P.d,e.type==='ship'?e.st.radius*1.3:e.type==='station'?130:100)+10),d=hyp(P.x-VW/2,P.y-VH/2);if(d<r&&d<bd){bd=d;best=e}}if(best)bridgeSetTgt(best);else flash('Aim the centre dot at a hostile ship, station or outpost, then click (or press T / Q).')}
function lookLocked(){return document.pointerLockElement===$('gl')}
function keyLook(){let yaw=0,pitch=0;if(keys.ArrowLeft)yaw+=1;if(keys.ArrowRight)yaw-=1;if(keys.ArrowUp)pitch-=1;if(keys.ArrowDown)pitch+=1;return{yaw,pitch}}
function freeLook(){if(lookLocked()){mouse.aim=false;mouse.l=false;try{document.exitPointerLock()}catch(e){}}}
// ---- the command chair: fly the frigate, fight it, and reach every console from one seat
function sitChair(){const B=W.bridge;if(!B)return;B.seat=true;B.x=0;B.z=-5.9;B.yaw=0;B.pitch=-.12;B.vx=B.vz=0;SFX.clunk();openConsole('strat');flash('In the command chair: every console is here. 1–5 switch tabs. E or Esc stands up.')}
function standChair(){const B=W.bridge;if(!B||!B.seat)return;B.seat=false;B.x=0;B.z=-3.3;B.yaw=0;B.pitch=0;B.vx=B.vz=0;B.fy=.28;if(fctl(B.f.tok).helm)fconSend(B.f.tok,'helm:auto',null);SFX.clunk()}
function bridgeJump(t,to){const B=W.bridge,keep={x:B.x,z:B.z,yaw:B.yaw,pitch:B.pitch,seat:B.seat,fy:B.fy};if(B.f&&B.f.alive&&W.ents.includes(B.f))despawnFrigate(B.f);t.sector=to;t.hold=0;t.moveT=0;exitSector();S.player.sector=to;S.player.docked='bridge';S.player.x=0;S.player.y=0;S.player.z=0;enterSector(to);
  const F=W.ents.find(e=>e.tok===t);if(F){W.bridge={f:F,...keep,panel:null};cam.snap=true;if(keep.seat)openConsole('strat')}else S.player.docked=null;frigWarpStart();feed(`${t.name} jumped to ${DEF[to].name}.`,'info')}
// ---- bridge consoles: strategic map, navigation, weapons, engineering
const FC_TABS=[['strat','Strategic'],['nav','Helm'],['wpn','Weapons'],['eng','Engineering'],['comms','Comms']];
function fcTabs(t){return t&&isCar(t)?FC_TABS.map(x=>x[0]==='wpn'?['wpn','Hangar']:x):FC_TABS}let fcT=0;
function openConsole(id){if(!W||!W.bridge)return;freeLook();W.bridge.panel=id;$('fcon').hidden=false;$('fcErr').textContent='';renderConsole(true)}
function closeConsole(){const B=W&&W.bridge;if(B&&NET.on){const t=B.f&&B.f.tok;if(t&&t.owner&&t.owner!==curPid()&&crewOf(t,curPid()).length)fconSend(t,'crewoff',null)}if(B)B.panel=null;const el=$('fcon');if(el)el.hidden=true;if(B&&B.seat)standChair()}
function fcPip(n){return`<span class="pips">${[1,2,3,4,5,6].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`}
const WING_MIS={escort:['Guard','Stay with the carrier and fight off anything that comes for it.'],attack:['Strike','Attack the strike target (pick one below), or the nearest hostile to the carrier.'],hunt:['Hunt','Range across the system and attack any hostile craft, bombers first.'],recall:['Land','Return to the carrier and land. Landed craft wait safely in the hangar until you launch them.']};
function sortieHtml(t,f,tot){let x='';const sd=f,SV=sortiesOf(t),opts=[],C=fctl(t),E=W.ents.find(e=>e.tok===t),busy=g=>SV.some(v=>v.wg===g||!v.wg),frW=g=>E?(E.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)&&p.mis!=='escort'&&p.mis!=='sortie'&&(!g||p.wg===g)).length:0,bayN=E?(E.bay||[]).length:0,sz=['A','B','all'].includes(C.sorSize)&&!(C.sorSize!=='all'&&busy(C.sorSize))?C.sorSize:(!busy('A')?'A':!busy('B')?'B':'all'),fr=frW(null)+bayN,nGo=sz==='all'?fr:Math.min(SORTIE.wing,frW(sz)+Math.min(bayN,Math.max(0,SORTIE.wing-(E?wgCount(E,sz):0))));for(const n of NEIGH[W.sid]){const Rn=S.stations[n];if(Rn&&hostileStationAt(n,sd))opts.push({n,tgt:'st',dep:Rn.kind==='depot'&&Rn.owner!=='brood'&&sd!=='brood',g:garrison(Rn),name:Rn.name,info:`${Rn.kind==='core'?'core station':Rn.kind==='hive'?'hive':Rn.kind==='free'?'freeport':'depot'} · shield ${Rn.shield>0?'up':'down'} · hull ${Math.round(Rn.hull/Rn.hMax*100)}%${Rn.kind==='depot'&&Rn.owner!=='brood'?' · garrison '+garrison(Rn):''}`});
      if(covered(n))for(const o of frigatesIn(n))if(hostile(sd,o.side))opts.push({n,tgt:'c'+o.id,name:o.name,info:`${o.side==='brood'?'Brood ':FACTIONS[o.side]?FACTIONS[o.side].short+' ':''}${capName(o)} · hull ${Math.round(o.hull/capHullMax(o)*100)}%`})}
    x+=`<div class="h3">Strike next door</div>`;if(sd!=='brood')x+=`<div class="kv" style="margin-bottom:6px"><span>Assault ships</span><b>${aAvail(t)} ready of ${t.aload||0} · ${CAR_ASSAULT} bays · they launch by themselves when a depot's hull breaks</b></div>`;
    for(const ev of SV)x+=`<div class="opr defend" style="display:block;${ev.wg?'border-left:3px solid '+WCOL[ev.wg]:''}"><b>${ev.wg?`<span style="color:${WCOL[ev.wg]}">${WNAME[ev.wg]}</span> · `:'Both wings · '}Strike on ${esc(sortieTgtName(ev))} · ${esc(DEF[ev.to].name)}</b><br><span>${ev.stage==='gather'?`${ev.pending} craft heading for the gate`:ev.stage==='out'?`${ev.craft.length} craft through the gate, arriving`:ev.stage==='strike'?`${ev.craft.length} craft attacking · ${Math.max(0,Math.ceil(ev.until-S.T))} s left${ev.lost?` · ${ev.lost} lost`:''}`:`${ev.craft.length} craft on their way back${ev.lost?` · ${ev.lost} lost`:''}`}</span>${ev.stage==='strike'||ev.stage==='out'?`<div class="fbtns" style="margin-top:6px"><button class="btn sm" data-fc="sor:${ev.to}:back:${ev.id}">Call the strike back</button></div>`:''}</div>`;
    if(SV.length<SORTIE.max)x+=`<div class="fbtns" style="margin-bottom:6px">${WINGS.map(g=>`<button class="btn sm" data-fc="sorsz:${g}" aria-pressed="${sz===g}" ${busy(g)?'disabled':''} style="border-color:${WCOL[g]}">Send ${WNAME[g]}${busy(g)?' (out)':''}</button>`).join('')}${SV.length?'':`<button class="btn sm" data-fc="sorsz:all" aria-pressed="${sz==='all'}">Send both (${fr})</button>`}<span class="note" style="margin:0">Next strike: ${sz==='all'?'both wings':WNAME[sz]}, ${nGo} craft.</span></div><p class="note" style="margin-top:0">Send craft through a gate to hit a target in the next system, the way a carrier fights from one system back. A strike takes one wing, ${WNAME.A} or ${WNAME.B} (hangar craft launch into it to make it up to ${SORTIE.wing}), or both; craft you've given their own Guard order stay to screen the carrier. Each wing can be out on its own strike: two targets, or both on one. The strike lasts up to ${Math.round(SORTIE.time/60)} minutes, until the target is down or half the craft are lost; you can call it back any time. Assault ships aboard land marines to capture a depot the strike breaks, then fly back.</p>`+(opts.length?opts.map(o=>`<div class="opr defend"><div><b>${esc(o.name)}</b><br><span>${esc(DEF[o.n].name)} · ${esc(o.info)}</span></div>${o.dep?`<div class="fbtns"><button class="btn" data-fc="sor:${o.n}:st:cap" ${nGo?'':'disabled'} title="Break it, then land marines from the assault ships to take it (needs ${o.g})">Strike to capture</button><button class="btn bad" data-fc="sor:${o.n}:st:raze" ${nGo?'':'disabled'} title="Break it and wreck it: nobody holds it afterwards">Strike to destroy</button></div>`:`<button class="btn" data-fc="sor:${o.n}:${o.tgt}" ${nGo?'':'disabled'}>Strike</button>`}</div>`).join(''):'<p class="note">Nothing hostile your sensors can see next door.</p>');return x}
function hangarHtml(F,t,C,B){const fly=(F.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)),bay=F.bay||[],tot=fly.length+bay.length,f=t.side==='player'?S.player.faction:t.side,brood=f==='brood';
  const kit=carKit('heavy'),st=t.store||{},kits=Math.min(...Object.keys(kit).map(k=>Math.floor((st[k]||0)/kit[k]))),fb=t.fab,Rs=S.stations[W.sid],dep=Rs&&Rs.kind==='depot'&&hostile('player',Rs.owner)&&Rs.owner!=='brood'?Rs:null;
  const T=C.tgt&&(C.tgt.type!=='ship'||(C.tgt.alive&&W.ents.includes(C.tgt)))?C.tgt:null;
  const list=W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)&&!mHid(e,F)).sort((a,b)=>(b.role==='frigate')-(a.role==='frigate')||isBmb(b.cls)-isBmb(a.cls)||d3(a,F)-d3(b,F)).slice(0,10);B.wlist=list;
  const misB=(cur,act)=>Object.keys(WING_MIS).map(m=>`<button class="btn sm" data-fc="${act}${m}" aria-pressed="${cur===m}" title="${WING_MIS[m][1]}">${WING_MIS[m][0]}</button>`).join('');
  let h=`<div class="grid2"><div><div class="h3">Flight deck</div><div class="kv"><span>Craft</span><b>${tot} of ${CAR_WING} bays · ${fly.length} flying, ${bay.length} in the hangar</b>`;
  h+=`<span>Fabricator</span><b>${fb?`building ${fb.assault?'an assault load':art(CLASSES[fb.cls].name).toLowerCase()+' '+CLASSES[fb.cls].name}, ${Math.max(0,Math.ceil(fb.until-S.T))} s`:tot>=CAR_WING?'idle: every bay is full':carOwned(t)?'restock your wing at a friendly station':kits>0?'starting the next craft shortly':'idle: waiting for materials'}</b>`;
  h+=`<span>Materials aboard</span><b>${carOwned(t)?'—':kits>0?`enough for ${kits} more craft`:'none spare'}${carShipping(t)?' · supply convoy on the way':''}</b>`;
  if(!brood)h+=`<span>Assault ships</span><b>${aAvail(t)} ready of ${t.aload||0}${(t.aload||0)-aAvail(t)?` (${(t.aload||0)-aAvail(t)} flying back)`:''} · ${CAR_ASSAULT} bays${dep?` · ${esc(dep.name)} needs ${garrison(dep)} once its hull breaks`:''}</b>`;
  const wm=g=>(C.wm&&C.wm[g])||C.pickets,wn=g=>fly.filter(p=>p.wg===g).length,wTag=g=>`<b style="color:${WCOL[g]}">${WNAME[g]}</b>`;
  h+=`</div><div class="h3" style="margin-top:12px">Wing orders</div><p class="note" style="margin-top:0">The craft fly as two wings, ${wTag('A')} and ${wTag('B')}: order them together or apart, and send either one on a strike.</p>`;
  for(const g of WINGS)h+=`<div class="opr" style="display:block;border-left:3px solid ${WCOL[g]}"><div style="display:flex;justify-content:space-between;gap:8px">${wTag(g)}<span>${wn(g)} flying${sortiesOf(t).some(v=>v.wg===g)?' · on a strike next door':''} · ${esc((WING_MIS[wm(g)]||[wm(g)])[0])}</span></div><div class="fbtns" style="margin-top:6px">${misB(wm(g),'pk:'+g+':')}${bay.length?`<button class="btn sm pri" data-fc="hl:all:${g}">Launch ${Math.min(bay.length,Math.max(0,SORTIE.wing-wgCount(F,g)))||bay.length} into ${WNAME[g]}</button>`:''}</div></div>`;
  h+=`<div class="fbtns" style="margin-top:6px"><span class="note" style="margin:0">Both wings:</span>${misB(C.pickets,'pk:')}${bay.length?`<button class="btn pri" data-fc="hl:all">Launch all (${bay.length})</button>`:''}</div>`;
  h+=`<div class="h3" style="margin-top:12px">Craft</div>`;
  if(!tot)h+=`<p class="note">No craft aboard. ${carOwned(t)?'Restock at a friendly station.':'The fabricator builds new ones from the materials aboard; the carrier asks its faction for more when it runs low.'}</p>`;
  for(const p of fly.slice().sort((a,b)=>String(a.wg).localeCompare(String(b.wg)))){const m=p.mis||wingMis(t,p),hp=Math.round(p.hull/p.st.hull*100);h+=`<div class="opr" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b><span style="color:${WCOL[p.wg]||'inherit'}">${p.wg?WNAME[p.wg]+' · ':''}</span>${esc(CLASSES[p.cls].name)}</b><span>${hp}% hull · ${fmt(Math.round(d3(p,F)))} m · ${m==='sortie'?'on the strike next door':WING_MIS[m]?WING_MIS[m][0]:m}${p.mis?'':' (wing)'}</span></div><div class="fbtns" style="margin-top:6px">${misB(p.mis,'pm:'+p.id+':')}${p.mis?`<button class="btn sm" data-fc="pm:${p.id}:def">Follow wing</button>`:''}${p.mis!=='sortie'?`<button class="btn sm" data-fc="wsw:${p.id}">Move to ${WNAME[p.wg==='A'?'B':'A']}</button>`:''}</div></div>`}
  bay.forEach(c=>{h+=`<div class="opr" style="display:flex;justify-content:space-between;align-items:center"><div><b>${esc(CLASSES[c].name)}</b><br><span>In the hangar · repaired and rearmed</span></div><button class="btn sm" data-fc="hl:${c}">Launch</button></div>`});
  h+=`</div><div>${sortieHtml(t,f,tot)}<div class="h3" style="margin-top:12px">Strike target here</div><p class="note" style="margin-top:0">Pick a target in this system and the wing goes after it (Strike). Fighter guns only chip capital ships; they're best against fighters and bombers.</p><div class="kv"><span>Target</span><b>${T?esc(fTgtName(T))+' · '+fmt(Math.round(d3(T,F)))+' m':'none: Strike takes the nearest hostile'}</b></div>`;
  h+=list.length?list.map((e,i)=>`<div class="opr ${e.role==='frigate'||isBmb(e.cls)?'defend':''}${T===e?' tsel':''}"><div><b>${esc(fTgtName(e))}</b><br><span>${CLASSES[e.cls].name} · ${fmt(Math.round(d3(e,F)))} m</span></div><button class="btn" data-fc="wtgt:${i}" ${T===e?'aria-pressed="true"':''}>${T===e?'Striking ✓':'Strike'}</button></div>`).join(''):'<p class="note">No hostile ships in sensor range.</p>';
  h+=`<div class="h3" style="margin-top:12px">Point defence</div><p class="note" style="margin-top:0">The carrier's own turrets. Torpedoes are what can really hurt it.</p><div class="fbtns"><button class="btn" data-fc="pd:torps" aria-pressed="${C.pd==='torps'}">Torpedoes first</button><button class="btn" data-fc="pd:fighters" aria-pressed="${C.pd==='fighters'}">Fighters first</button><button class="btn" data-fc="pd:hold" aria-pressed="${C.pd==='hold'}">Hold fire</button></div></div></div>`;
  return h}
function escWpnHtml(F,t,C,B,pw){const T=C.tgt,lc=Math.max(0,F.lanceCd||0),pm=Math.max(.01,pmul(t,'lance')),list=[];
  if(W.stationEnt&&hostile('player',W.stationEnt.fac))list.push(W.stationEnt);{const OE=W.outpostEnt;if(OE&&OE.o.owner&&hostile('player',OE.o.owner)&&!OE.o.breached)list.push(OE)}
  for(const e of W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)).sort((a,b)=>(b.role==='frigate')-(a.role==='frigate')||d3(a,F)-d3(b,F)).slice(0,9))list.push(e);B.wlist=list;
  let h=`<div class="grid2"><div><div class="h3">Torpedo bays</div><p class="note" style="margin-top:0">Two launchers fire a pair of homing torpedoes together: the weapon that really hurts capital ships, stations, depots and outposts. Range ${(TORP_RANGE/1000).toFixed(1)} km; the pair reloads every ${(ESC_TORP_CD/pm).toFixed(0)} s at this power (Engineering → Torpedo bays). The launchers reload by themselves: no stores used.</p>
    <div class="opr" style="display:block"><b>How to fire</b><br><span><b>Automatic</b> launches by itself at hostile stations, depots, outposts and capital ships in range. <b>Selected target</b>: press Target on anything below (or click a hostile on the Strategic or Helm map) and the bays fire at it whenever they're loaded and it's in range. <b>Launch now</b> fires the pair at once, at the selected target or straight ahead. <b>Hold fire</b> stops them.</span></div>
    <div class="fbtns"><button class="btn" data-fc="lmode:auto" aria-pressed="${C.lanceMode==='auto'}">Automatic</button><button class="btn" data-fc="lmode:target" aria-pressed="${C.lanceMode==='target'}">Selected target</button><button class="btn" data-fc="lmode:hold" aria-pressed="${C.lanceMode==='hold'}">Hold fire</button><button class="btn" data-fc="fire" ${lc>0?'disabled':''}>${lc>0?'Reloading…':'Launch now'}</button></div>
    <div class="kv"><span>Target</span><b>${T?esc(fTgtName(T))+' · '+fmt(Math.round(d3(T,F)))+' m':C.lanceMode==='auto'?'automatic (stations, depots, outposts, capital ships)':'none'}</b><span>Bays</span><b>${lc>0?'reloading '+(lc/pm).toFixed(1)+' s':'loaded'} · ${pw.lance}/6 power</b></div>
    <div class="h3" style="margin-top:12px">Targets</div>${list.length?list.map((e,i)=>`<div class="opr ${e.role==='frigate'||e.type==='station'||e.type==='outpost'||e.type==='works'?'defend':''}${T===e?' tsel':''}"><div><b>${esc(fTgtName(e))}</b><br><span>${e.type==='works'?'station works':e.type==='station'?(e.rec&&e.rec.kind==='depot'?'depot':'station'):e.type==='outpost'?'outpost':CLASSES[e.cls].name} · ${fmt(Math.round(d3(e,F)))} m${(e.type==='ship'&&e.role!=='frigate')?' · fighters dodge torpedoes':''}</span></div><button class="btn" data-fc="tgt:${i}" ${T===e?'aria-pressed="true"':''}>${T===e?'Targeted ✓':'Target'}</button></div>`).join(''):'<p class="note">No hostiles in sensor range.</p>'}</div>
    <div><div class="h3">Point defence</div><p class="note" style="margin-top:0">Six turrets. They shoot down incoming torpedoes and missiles, and fighters that close in. Torpedoes are what can really hurt an escort.</p>
    <div class="fbtns"><button class="btn" data-fc="pd:torps" aria-pressed="${C.pd==='torps'}">Torpedoes first</button><button class="btn" data-fc="pd:fighters" aria-pressed="${C.pd==='fighters'}">Fighters first</button><button class="btn" data-fc="pd:hold" aria-pressed="${C.pd==='hold'}">Hold fire</button></div>
    <div class="h3">Fighter screen</div><p class="note" style="margin-top:0">${(n=>n?`${n} friendly fighters are screening this ship: they go after bombers before they can launch.`:'No friendly wings in the sector to screen you. Faction patrols that enter the sector form up on you.')(W.ents.filter(e=>e.role==='screen'&&e.alive&&e.grp&&e.grp.screen===F).length)}</p></div></div>`;
  return h}
function renderConsole(full){const B=W&&W.bridge;if(!B||!B.panel)return;const F=B.f,t=F.tok,C=fctl(t),id=B.panel,pw=C.power;
  $('fcTitle').textContent=`${t.name} · ${fcTabs(t).find(x=>x[0]===id)[1]}`;$('fcSub').textContent=`${DEF[W.sid].name} · hull ${Math.round(F.hull/F.st.hull*100)}% · shield ${Math.round(F.shield/F.st.sCap*100)}% · ${isCar(t)?`wing: ${(WING_MIS[C.pickets]||[C.pickets])[0].toLowerCase()} · ${carWingNow(F,W).length}/${CAR_WING} craft`:`${isEsc(t)?'torpedoes':'battery'}: ${(bt=>bt?fTgtName(bt)+' '+fmt(Math.round(d3(bt,F)))+' m':C.lanceMode==='hold'?'holding':'no target')(batteryTgt(F))}`}${t.spin?` · jump drive ${Math.round(t.spin.p*100)}% → ${DEF[t.spin.to].name}`:''}${fGuest(t)?` · guest aboard: ${FAC(t.side).short} command has the helm`:''}`;
  {const el=$('fcCmd'),fs=FAC(t.side)?FAC(t.side).short:'Faction',ab=NET.on&&t.owner?crewAboard(t):[],mine=NET.on&&t.owner===curPid(),crewH=!NET.on||!t.owner?'':mine?(ab.length?`<div class="fccmd sm"><div><b>Crew aboard</b> · give a guest one station; you lose it until they step away</div><div style="display:flex;flex-direction:column;gap:4px">${ab.map(pid=>`<div class="fbtns" style="align-items:center"><span style="min-width:90px">${esc((S.pilots[pid]||{}).name||'pilot')}</span>${Object.keys(CREW_NAME).map(k=>{const on=(t.crew||{})[k]===pid;return`<button class="btn sm" data-fc="crew:${on?'-':pid}:${k}" aria-pressed="${on}">${CREW_NAME[k]}</button>`}).join('')}</div>`).join('')}</div></div>`:''):`<div class="fccmd sm"><div><b>Crew aboard ${esc(t.name)}</b> · ${crewOf(t,curPid()).length?'your station: '+crewOf(t,curPid()).map(k=>CREW_NAME[k]).join(', ')+'. Stepping away from the console hands it back.':'the commander has not given you a station yet. Everything else is view-only.'}</div></div>`;
   const h=crewH+(fGuest(t)?`<div class="fccmd"><div><b>${esc(t.name)} flies for ${esc(fs)} command.</b><br><span>Ride along as a guest, or take command: it stays a ${esc(fs)} ship, but you give the orders until you hand it back.</span></div><div class="fbtns"><button class="btn pri" data-fc="take">Take command</button><button class="btn" data-fc="close">Ride as guest</button></div></div>`:t.cmd&&fMine(t)?`<div class="fccmd sm"><div><b>Under your command</b> · on loan from ${esc(fs)} command</div><div class="fbtns"><button class="btn" data-fc="release">Hand back to ${esc(fs)}</button></div></div>`:'');if(el.innerHTML!==h)el.innerHTML=h}
  $('fcMeta').innerHTML=`<div>Power<b>${PWR.reduce((a,k)=>a+pw[k],0)}/12</b></div><div>${isCar(t)?`Craft<b>${carWingNow(F,W).length}/${CAR_WING}</b></div><div>Assault<b>${aAvail(t)}/${t.aload||0}</b>`:isEsc(t)?`Torpedoes<b>${(F.lanceCd||0)>0?'reloading':'loaded'}</b>`:`Pickets<b>${(F.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)).length}/2</b>`}</div>`;
  if(full)$('fcTabs').innerHTML=fcTabs(t).map(([k,n])=>`<button class="tab" type="button" data-fc="tab:${k}" aria-selected="${k===id}">${n}</button>`).join('');
  let h='';
  if(id==='strat'){if(full){$('fcBody').innerHTML=`<div class="fgrid"><canvas id="stratc"></canvas><div id="stratSide"></div></div>`}
    const hs=W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)),fr=W.ents.filter(e=>e.type==='ship'&&e.alive&&!hostile('player',e.side)&&!e.isPlayer);
    $('stratSide').innerHTML=`<p class="note" style="margin-top:0">Live picture of ${esc(DEF[W.sid].name)}. <b>Click empty space</b> to move the ship there. <b>Click a hostile</b> (ship, capital ship or station) to ${isCar(F.tok)?'make it the wing\'s strike target':isEsc(F.tok)?'give it to the torpedo bays':'give it to the capital battery'}.</p>
      <div class="kv"><span>Hostiles</span><b style="color:var(--danger)">${hs.length}${hs.some(e=>e.role==='frigate')?' · incl. FRIGATE':''}</b><span>Friendlies</span><b>${fr.length}</b><span>Torpedoes inbound</span><b>${W.missiles.filter(m=>m.kind==='torpedo'&&m.tgt===F).length}</b><span>Moving to</span><b>${C.movePt?fmt(Math.round(d3(C.movePt,F)))+' m':'holding'}</b>${isCar(F.tok)?`<span>Wing orders</span><b>${(WING_MIS[C.pickets]||[C.pickets])[0]}</b><span>Strike target</span><b>${C.tgt?esc(C.tgt.type==='station'?C.tgt.name:shipLabel(C.tgt)):'none'}</b>`:`<span>${isEsc(F.tok)?'Torpedo target':'Battery target'}</span><b>${C.lanceMode==='hold'?'holding fire':C.tgt?esc(C.tgt.type==='station'?C.tgt.name:shipLabel(C.tgt)):'automatic'}</b>`}</div>
      <div class="fbtns" style="margin-top:12px"><button class="btn" data-fc="stop">All stop</button>${isCar(F.tok)?`<button class="btn" data-fc="pk:escort" aria-pressed="${C.pickets==='escort'}">Wing: Guard</button><button class="btn" data-fc="pk:attack" aria-pressed="${C.pickets==='attack'}">Wing: Strike</button>`:`<button class="btn" data-fc="lmode:auto">${isEsc(F.tok)?'Torpedoes':'Battery'}: automatic</button><button class="btn" data-fc="lmode:hold">Hold fire</button>`}</div>`;return}
  if(id==='nav'){if(full||!$('navSide')){$('fcBody').innerHTML=`<div class="fgrid"><canvas id="stratc"></canvas><div id="navSide"></div></div>`}const v=hyp(F.vx,F.vy,F.vz);qRot(F.q,0,0,1,_f);const brg=(Math.atan2(_f.x,_f.z)*180/Math.PI+360)%360,em=pmul(t,'eng'),js=em>0?JUMP_TIME/em:Infinity;
    h+=`<div><div><div class="h3">Helm</div><div class="kv"><span>Speed</span><b>${Math.round(v)} m/s</b><span>Heading</span><b>${Math.round(brg)}° · pitch ${Math.round(Math.asin(clamp(_f.y,-1,1))*180/Math.PI)}°</b><span>Throttle</span><b>${Math.round(C.throttle*100)}%</b><span>Engines</span><b>${pw.eng}/6 power</b><span>Destination</span><b>${C.movePt?fmt(Math.round(d3(C.movePt,F)))+' m away':'holding position'}</b></div>
      <div class="fbtns" style="margin-top:10px"><button class="btn" data-fc="thr:-0.25">Throttle −</button><button class="btn" data-fc="thr:0.25">Throttle +</button><button class="btn" data-fc="stop">All stop</button></div><p class="note"><b>Click empty space</b> on the map to move there; click a hostile to target it.</p></div>
      <div><div class="h3" style="margin-top:12px">Jump drive</div><p class="note" style="margin-top:0">Capital ships need no gates: the drive spins up for ${isFinite(js)?Math.round(js)+' s':'— (no engine power)'} and jumps to a neighbouring system from anywhere. ${t.spin?`<b style="color:var(--amber)">Spinning up → ${esc(DEF[t.spin.to].name)} ${Math.round(t.spin.p*100)}%</b>`:''}</p>
      <div class="fbtns">${NEIGH[W.sid].map(n=>`<button class="btn" data-fc="jump:${n}" aria-pressed="${t.spin&&t.spin.to===n}">Jump → ${esc(DEF[n].name)}</button>`).join('')}${t.spin||t.dest?'<button class="btn bad" data-fc="abort">Abort jump</button>':''}</div>
      <div class="h3">Plot a course</div><div class="fbtns">${SECTOR_DEFS.filter(d=>d.id!==W.sid&&!NEIGH[W.sid].includes(d.id)).map(d=>`<button class="btn" data-fc="course:${d.id}" aria-pressed="${t.dest===d.id}">${esc(d.name)} · ${HOP[d.id][W.sid]} jumps</button>`).join('')}</div>
      ${t.dest&&t.dest!==W.sid?`<p class="note">Course to ${esc(DEF[t.dest].name)}: ${HOP[t.dest][W.sid]} jumps, about ${isFinite(js)?Math.round(HOP[t.dest][W.sid]*js):'∞'} s of spin-up.</p>`:''}</div></div>`;
    {const el=$('navSide');if(el&&el.innerHTML!==h)el.innerHTML=h}return}
  if(id==='wpn'&&isCar(t)){h+=hangarHtml(F,t,C,B);$('fcBody').innerHTML=h;return}
  if(id==='wpn'&&isEsc(t)){h+=escWpnHtml(F,t,C,B,pw);$('fcBody').innerHTML=h;return}
  if(id==='wpn'){const T=C.tgt,lc=Math.max(0,F.lanceCd||0);const list=[];if(W.stationEnt&&hostile('player',W.stationEnt.fac))list.push(W.stationEnt);{const OE=W.outpostEnt;if(OE&&OE.o.owner&&hostile('player',OE.o.owner)&&!OE.o.breached)list.push(OE)}
    for(const e of W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)).sort((a,b)=>(b.role==='frigate')-(a.role==='frigate')||d3(a,F)-d3(b,F)).slice(0,9))list.push(e);
    h+=`<div class="grid2"><div><div class="h3">Capital battery</div><p class="note" style="margin-top:0">Heavy shells that crack station, depot, outpost and capital-ship hulls (220 per hit). Slow: fighters can dodge them. Range 2.6 km, one salvo every ${(2.6/Math.max(.01,pmul(t,'lance'))).toFixed(1)} s at this power.</p><div class="opr" style="display:block"><b>How to fire</b><br><span><b>Automatic</b> fires by itself at hostile stations, depots, outposts and capital ships in range. <b>Selected target</b>: press Target on anything in the list below (or click a hostile on the Strategic map) and the battery fires at it whenever it is charged and in range. <b>Fire now</b> sends a salvo at once: at the selected target, or straight ahead if there is none. <b>Hold fire</b> stops it.</span></div>
      <div class="fbtns"><button class="btn" data-fc="lmode:auto" aria-pressed="${C.lanceMode==='auto'}">Automatic</button><button class="btn" data-fc="lmode:target" aria-pressed="${C.lanceMode==='target'}">Selected target</button><button class="btn" data-fc="lmode:hold" aria-pressed="${C.lanceMode==='hold'}">Hold fire</button><button class="btn" data-fc="fire" ${lc>0?'disabled':''}>${lc>0?'Charging…':'Fire now'}</button></div>
      <div class="kv"><span>Target</span><b>${T?esc(fTgtName(T))+' · '+fmt(Math.round(d3(T,F)))+' m':C.lanceMode==='auto'?'automatic (stations, depots, outposts, capital ships)':'none'}</b><span>Reload</span><b>${lc>0?(lc/Math.max(.01,pmul(t,'lance'))).toFixed(1)+' s':'ready'} · ${pw.lance}/6 power</b></div>
      <div class="h3" style="margin-top:12px">Targets</div>${list.length?list.map((e,i)=>`<div class="opr ${e.role==='frigate'||e.type==='station'||e.type==='outpost'||e.type==='works'?'defend':''}${T===e?' tsel':''}"><div><b>${esc(fTgtName(e))}</b><br><span>${e.type==='works'?'station works':e.type==='station'?(e.rec&&e.rec.kind==='depot'?'depot':'station'):e.type==='outpost'?'outpost':CLASSES[e.cls].name} · ${fmt(Math.round(d3(e,F)))} m</span></div><button class="btn" data-fc="tgt:${i}" ${T===e?'aria-pressed="true"':''}>${T===e?'Targeted ✓':'Target'}</button></div>`).join(''):'<p class="note">No hostiles in sensor range.</p>'}</div>
      <div><div class="h3">Point defence</div><p class="note" style="margin-top:0">Five turrets. Torpedoes are the only fighter weapon that can hurt your hull: fighters can't stop them once they're away, so PD has to.</p>
      <div class="fbtns"><button class="btn" data-fc="pd:torps" aria-pressed="${C.pd==='torps'}">Torpedoes first</button><button class="btn" data-fc="pd:fighters" aria-pressed="${C.pd==='fighters'}">Fighters first</button><button class="btn" data-fc="pd:hold" aria-pressed="${C.pd==='hold'}">Hold fire</button></div>
      <div class="h3">Fighter screen</div><p class="note" style="margin-top:0">${(n=>n?`${n} friendly fighters are screening this ship: they go after bombers before they can launch. Torpedoes already in flight are your point defence's job.`:'No friendly wings in the sector to screen you. Faction patrols that enter the sector will form up on you.')(W.ents.filter(e=>e.role==='screen'&&e.alive&&e.grp&&e.grp.screen===F).length)}</p>
      <div class="h3">Pickets</div><div class="fbtns"><button class="btn" data-fc="pk:escort" aria-pressed="${C.pickets==='escort'}">Escort the ship</button><button class="btn" data-fc="pk:attack" aria-pressed="${C.pickets==='attack'}">Attack the battery's target</button></div></div></div>`;
    B.wlist=list}
  if(id==='eng'){const free=12-PWR.reduce((a,k)=>a+pw[k],0),nm={eng:'Engines',shd:'Shields',lance:isEsc(t)?'Torpedo bays':isCar(t)?'Flight deck (build speed)':'Capital battery',pd:'Point defence'},fx={eng:`speed ×${(Math.min(1.6,pw.eng/3)).toFixed(2)} · jump ${pw.eng?Math.round(JUMP_TIME*3/pw.eng)+' s':'offline'}`,shd:`regen ×${(pw.shd/3).toFixed(2)}`,lance:`reload ${pw.lance?(2.6*3/pw.lance).toFixed(1)+' s':'offline'}`,pd:`fire rate ×${(pw.pd/3).toFixed(2)}`};
    h+=`<p class="note" style="margin-top:0">Twelve units of reactor output to share. ${free?`<b style="color:var(--amber)">${free} unassigned.</b>`:''}</p>${PWR.map(k=>`<div class="prow"><b>${nm[k]}</b>${fcPip(pw[k])}<span class="note" style="margin:0">${fx[k]}</span><span class="fbtns" style="margin:0"><button class="btn" data-fc="pw:${k}:-1" ${pw[k]?'':'disabled'}>−</button><button class="btn" data-fc="pw:${k}:1" ${pw[k]<6&&free>0?'':'disabled'}>+</button></span></div>`).join('')}
      <div class="h3" style="margin-top:14px">Presets</div><div class="fbtns"><button class="btn" data-fc="preset:3,3,3,3">Balanced</button><button class="btn" data-fc="preset:1,3,5,3">Assault</button><button class="btn" data-fc="preset:1,6,1,4">Brace</button><button class="btn" data-fc="preset:6,4,0,2">Run</button></div>
      <div class="kv" style="margin-top:10px"><span>Hull</span><b>${Math.round(F.hull)} / ${Math.round(F.st.hull)}</b><span>Shield</span><b>${Math.round(F.shield)} / ${Math.round(F.st.sCap)}</b></div>`}
  if(id==='comms'){const fr=commsFriends(F),home=W.sid===FAC_HOME(S.player.faction),busy=W.ents.filter(e=>e.type==='ship'&&e.alive&&(e.order||e.ord));B.clist=fr;
    h+=`<div class="grid2"><div><div class="h3">Guard or escort</div><p class="note" style="margin-top:0">Up to four nearby fighters of your faction take the order for ${ORDER_TIME/60} minutes, then go back to their own duties.</p>
      ${fr.length?fr.map((e,i)=>`<div class="opr"><div><b>${esc(e===F?t.name+' (this ship)':shipLabel(e))}</b><br><span>${e===F?'your ship':fmt(Math.round(d3(e,F)))+' m'}</span></div><div class="fbtns"><button class="btn" data-fc="cmo:guard:${i}">Guard</button><button class="btn" data-fc="cmo:escort:${i}">Escort</button></div></div>`).join(''):'<p class="note">No friendlies nearby.</p>'}</div>
      <div><div class="h3">Construction</div><p class="note" style="margin-top:0">${home?`Ask ${esc(FAC(S.player.faction).short)} command to build a capital shipyard here in your home system.`:'Ask your faction to send a constructor and build a depot here.'} It draws on the faction's stores; the reply says what is missing.</p>
      <div class="fbtns"><button class="btn" data-fc="cmb">${home?'Request a shipyard here':'Request a depot here'}</button></div>
      <div class="h3" style="margin-top:14px">Orders in force</div>${busy.length?busy.map(e=>`<div class="kv"><span>${esc(shipLabel(e))}</span><b>${e.order?(e.order.kind==='guard'?'guarding ':'escorting ')+esc(e.order.tgt===F?t.name:e.order.tgt&&e.order.tgt.isPlayer?'you':e.order.tgt?shipLabel(e.order.tgt):'—')+' · '+Math.max(0,Math.ceil(e.order.until-W.t))+' s':esc(e.ord)}</b></div>`).join(''):'<p class="note">None.</p>'}</div></div>`}
  $('fcBody').innerHTML=h}
function fTgtName(e){return e.type==='works'?e.name:e.type==='station'?e.name:e.type==='outpost'?e.o.name:shipLabel(e)}
function commsFriends(F){const out=[F];for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===F||e.isPlayer||e.role==='drone'||e.role==='picket')continue;if(hostile('player',e.side))continue;if(d3(e,F)>6000)continue;out.push(e)}return[F,...out.slice(1).sort((a,b)=>d3(a,F)-d3(b,F)).slice(0,9)]}
function drawStrat(){const B=W&&W.bridge;if(!B||(B.panel!=='strat'&&B.panel!=='nav'))return;const c=$('stratc');if(!c)return;const w=c.clientWidth,h=c.clientHeight;if(!w)return;if(c.width!==Math.round(w*DPR)){c.width=w*DPR;c.height=h*DPR}const g=c.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
  const F=B.f,C=fctl(F.tok),sc=Math.min(w,h)/2/(3400*SPACE),X=x=>w/2-x*sc,Y=z=>h/2-z*sc;B.sMap={sc,w,h};
  g.fillStyle='#05080f';g.fillRect(0,0,w,h);g.strokeStyle='rgba(54,67,95,.5)';g.lineWidth=1;for(const r of[1000,2000,3000]){g.beginPath();g.arc(w/2,h/2,r*sc,0,TAU);g.stroke()}
  g.font='600 10px "Saira Semi Condensed",sans-serif';g.textAlign='center';
  for(const a of S.sectors[W.sid].ast){g.fillStyle='rgba(140,145,165,.35)';g.fillRect(X(a.x)-1,Y(a.z)-1,2,2)}
  for(const gt of GATES[W.sid]){g.strokeStyle='#dfe8ff';g.beginPath();g.arc(X(gt.x),Y(gt.z),6,0,TAU);g.stroke();g.fillStyle='#8c91a5';g.fillText(DEF[gt.to].name,X(gt.x),Y(gt.z)+16)}
  const SE=W.stationEnt;if(SE){g.fillStyle=sideCol(SE.fac);g.fillRect(X(SE.x)-6,Y(SE.z)-6,12,12);g.fillText(SE.name,X(SE.x),Y(SE.z)+20)}
  const OE=W.outpostEnt;if(OE){g.strokeStyle=sideCol(OE.o.owner);g.lineWidth=2;g.strokeRect(X(OE.x)-6,Y(OE.z)-6,12,12);g.fillStyle='#8c91a5';g.fillText(OE.o.name,X(OE.x),Y(OE.z)+20)}
  for(const m of W.missiles){g.fillStyle=m.kind==='torpedo'?'#ffcf5a':'#ff8fc0';g.fillRect(X(m.x)-1.5,Y(m.z)-1.5,3,3)}
  for(const b of W.shots)if(b.cap){g.strokeStyle=hexA(b.col,.9);g.lineWidth=2;g.beginPath();g.moveTo(X(b.x),Y(b.z));g.lineTo(X(b.x-b.vx*.05),Y(b.z-b.vz*.05));g.stroke()}
  for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;if(e.isPlayer)continue;const col=e.side==='player'?PLAYER_COL:sideCol(e.side),x=X(e.x),y=Y(e.z);qRot(e.q,0,0,1,_f);const a=Math.atan2(-_f.x,_f.z);
    g.save();g.translate(x,y);g.rotate(a);g.fillStyle=col;g.beginPath();if(e.role==='frigate'){g.moveTo(0,-11);g.lineTo(6,0);g.lineTo(0,11);g.lineTo(-6,0)}else{const r=e.role==='drone'?2.5:4;g.moveTo(0,-r*1.5);g.lineTo(r,r);g.lineTo(-r,r)}g.closePath();g.fill();g.restore();
    if(e.role==='frigate'){g.fillStyle=col;g.fillText(e.tok?e.tok.name:'',x,y-16);if(e.tok&&capTracked(e.tok,S.player.faction)){g.strokeStyle=hexA('#ffcf5a',.6+.3*Math.sin(performance.now()/250));g.lineWidth=1.6;g.beginPath();g.arc(x,y,17,0,TAU);g.stroke()}}}
  {const L=(S.frigates||[]).filter(t=>capTracked(t,S.player.faction));if(L.length){g.textAlign='left';g.font='700 10px "Saira Semi Condensed",sans-serif';g.fillStyle='#ffcf5a';g.fillText('📡 TRACKED ENEMY CAPITALS',10,16);g.font='600 10px "Saira Semi Condensed",sans-serif';
    L.slice(0,6).forEach((t,i)=>{const j=HOP[W.sid][t.sector]||0;g.fillStyle=sideCol(t.side);g.fillText(`${t.name} · ${t.side==='brood'?'Brood':capName(t)} · ${DEF[t.sector].name}${j?` (${j} jump${j>1?'s':''})`:' (here)'} · ${capPinged(t,S.player.faction)?'🧲 ':''}${fmtT(capTrackUntil(t,S.player.faction)-S.T)}`,10,30+i*13)});g.textAlign='center'}}
  {const x=X(F.x),y=Y(F.z);g.strokeStyle=PLAYER_COL;g.lineWidth=2;g.beginPath();g.arc(x,y,16,0,TAU);g.stroke();if(C.movePt){g.setLineDash([4,4]);g.beginPath();g.moveTo(x,y);g.lineTo(X(C.movePt.x),Y(C.movePt.z));g.stroke();g.setLineDash([]);g.beginPath();g.arc(X(C.movePt.x),Y(C.movePt.z),5,0,TAU);g.stroke()}
    const T=C.tgt;if(T&&C.lanceMode==='target'){g.strokeStyle='#ff5d4f';g.beginPath();g.arc(X(T.x),Y(T.z),14,0,TAU);g.stroke();g.beginPath();g.moveTo(x,y);g.lineTo(X(T.x),Y(T.z));g.stroke()}
    const tk=F.tok,rng=isCar(tk)?0:isEsc(tk)?TORP_RANGE:2600;g.setLineDash([2,4]);if(rng){g.strokeStyle='rgba(255,93,79,.25)';g.beginPath();g.arc(x,y,rng*sc,0,TAU);g.stroke()}g.strokeStyle='rgba(111,183,255,.25)';g.beginPath();g.arc(x,y,1150*sc,0,TAU);g.stroke();g.setLineDash([])}
  g.textAlign='left';g.fillStyle='#5a647c';g.fillText(isCar(F.tok)?'blue ring: point defence':isEsc(F.tok)?'red ring: torpedo range · blue ring: point defence':'red ring: battery range · blue ring: point defence',10,h-10)}
function fconApply(t,a,ent){if(a==='take'){fTake(t);return}if(a==='release'){fRelease(t);return}
  if(String(a).startsWith('crewoff')){const me=curPid();t.crew=t.crew||{};for(const k in t.crew)if(t.crew[k]===me)delete t.crew[k];return}
  if(String(a).startsWith('crew:')){const[,who,st]=String(a).split(':');if(!CREW_NAME[st]||(curPid()!==t.owner))return;t.crew=t.crew||{};if(who==='-'){delete t.crew[st];return}if(!crewAboard(t).includes(who))return;t.crew[st]=who;feedTo(who,`${(S.pilots[t.owner]||{}).name||'The commander'} gave you the ${CREW_NAME[st]} station aboard ${t.name}. Stepping away from the console hands it back.`,'good');return}const C=fctl(t);const[k,v,w]=String(a).split(':');if((k==='jump'||k==='course')&&!DEF[v])return;
  if(k==='helm'){C.helm=v==='manual'?'manual':null;if(C.helm)C.movePt=null;return}if(k==='man'){C.man={y:clamp(+v||0,-1,1),p:clamp(+w||0,-1,1),at:performance.now()};return}if(k==='thrset'){C.throttle=clamp(+v||0,0,1);return}if(k==='fire'){C.fire=1;return}
  if(k==='move'){C.movePt={x:clamp(+v||0,-3000,3000),y:+(a.split(':')[3])||0,z:clamp(+w||0,-3000,3000)};return}
  if(k==='stop')C.movePt=null;if(k==='thr')C.throttle=clamp(C.throttle+ +v,0,1);
  if(k==='jump'){t.jumpTo=v;t.dest=null;feed(`${t.name}: jump drive spinning up for ${DEF[v].name}.`,'info')}if(k==='course'){t.dest=v;t.jumpTo=null;feed(`${t.name}: course plotted to ${DEF[v].name}.`,'info')}if(k==='abort'){t.jumpTo=null;t.dest=null;t.spin=null}
  if(k==='lmode'){C.lanceMode=v;if(v!=='target')C.tgt=null}if(k==='tgt'&&ent){C.tgt=ent;C.lanceMode='target'}
  if(k==='pd')C.pd=v;if(k==='pk'){const E=W&&W.ents.find(x=>x.tok===t);if(WINGS.includes(v)&&WING_MIS[w]){C.wm=C.wm||{};C.wm[v]=w;if(E)for(const p of E.pickets||[])if(p.wg===v&&p.mis!=='sortie')p.mis=null}else{C.pickets=v;C.wm={};if(E)for(const p of E.pickets||[])if(p.mis!=='sortie')p.mis=null}}
  if(k==='wsw'){const E=W&&W.ents.find(x=>x.tok===t),p=E&&(E.pickets||[]).find(x=>String(x.id)===v);if(p&&p.mis!=='sortie'){p.wg=p.wg==='A'?'B':'A';p.mis=null}}
  if(k==='pm'&&!NET.cl){const E=W&&W.ents.find(x=>x.tok===t),p=E&&(E.pickets||[]).find(x=>String(x.id)===v);if(p)p.mis=w==='def'?null:w}
  if(k==='sorsz'){C.sorSize=['A','B','all'].includes(v)?v:'A';return}
  if(k==='sor'&&!NET.cl){const E=W&&W.ents.find(x=>x.tok===t);if(w==='back'){const bid=+String(a).split(':')[3],ev=sortiesOf(t).find(x=>x.id===bid)||sortieOf(t);if(ev&&ev.stage==='strike')ev.until=S.T;else if(ev&&ev.stage==='out')ev.recall=1}else if(E&&DEF[v]){const n=sortieStart(t,E,v,w,['A','B'].includes(C.sorSize)&&!sortiesOf(t).some(x=>x.wg===C.sorSize)?C.sorSize:C.sorSize==='all'?null:(['A','B'].find(g=>!sortiesOf(t).some(x=>x.wg===g))||null)),md=String(a).split(':')[3],sv=n?sortiesOf(t).slice(-1)[0]:null;if(sv&&w==='st')sv.mode=md==='raze'?'raze':'cap';feed(n?`${t.name}: ${n} craft launching a strike on ${DEF[v].name}${sv&&sv.mode==='raze'?' to destroy it':sv&&sv.mode==='cap'&&S.stations[v]&&S.stations[v].kind==='depot'?' to capture it':''}.`:`${t.name}: no craft free for a strike (craft on their own Guard order stay home).`,n?'info':'warn')}}
  if(k==='hl'&&!NET.cl){const E=W&&W.ents.find(x=>x.tok===t);if(E&&(E.bay||[]).length){const g=WINGS.includes(w)?w:undefined,n=v==='all'?(g?Math.max(1,SORTIE.wing-wgCount(E,g)):E.bay.length):1;for(let i=0;i<n&&E.bay.length;i++){const ix=v==='all'?0:Math.max(0,E.bay.indexOf(v)),cls=E.bay.splice(ix,1)[0],p=carLaunch(E,cls,g);if(C.pickets==='recall')p.mis='escort'}}}
  if(k==='pw'){const used=PWR.reduce((a,x)=>a+C.power[x],0),d=+w;if(d<0&&C.power[v]>0)C.power[v]--;else if(d>0&&C.power[v]<6&&used<12)C.power[v]++}
  if(k==='preset'){const n=v.split(',').map(Number);if(n.length===4&&n.every(x=>x>=0&&x<=6)&&n.reduce((a,b)=>a+b,0)<=12)PWR.forEach((x,i)=>C.power[x]=n[i])}}
// a console press on the bridge: apply it here (instantly, for feedback) and, on a client, ask the host to apply it for real
function fconSend(t,a,ent){if(NET.on&&t.owner&&!String(a).startsWith('crew')&&a!=='release'&&!crewCan(t,curPid(),a)){const st=crewStn(a),C=t.crew||{},m=C[st]&&C[st]!==curPid()?`${CREW_NAME[st]} is assigned to ${(S.pilots[C[st]]||{}).name||'a crewmate'}.`:t.owner===curPid()?'':`You're crew aboard ${t.name}: ${crewOf(t,curPid()).length?'you can only use the '+crewOf(t,curPid()).map(k=>CREW_NAME[k]).join(' and ')+' station':'the commander has not assigned you a station'}.`;if(m){const el=$('fcErr');if(el&&W.bridge&&W.bridge.panel)el.textContent=m;else flash(m,true)}return}
  if(fGuest(t)&&a!=='take'){const m=`${FAC(t.side).short} command has the helm and the guns. You're aboard as a guest: ride along, use comms, launch any time.`;const el=$('fcErr');if(el&&W.bridge&&W.bridge.panel)el.textContent=m;else flash(m,true);return}if(NET.cl){const om=MUTE;MUTE=true;try{fconApply(t,a,ent)}finally{MUTE=om}netSend({t:'fcon',id:t.id,a,e:ent?(ent.type==='station'?'S':ent.id):0})}else fconApply(t,a,ent)}
function consoleAct(a){const B=W&&W.bridge;if(!B)return;const F=B.f,t=F.tok;const[k,v]=a.split(':');
  if(k==='close'){closeConsole();return}if(k==='tab'){B.panel=v;renderConsole(true);return}
  if(k==='cmo'){const T=(B.clist||[])[+a.split(':')[2]];if(T&&T.alive){if(NET.cl)netSend({t:'order',k:v==='guard'?'guard':'escort',id:T.id});else issueOrder(v==='guard'?'guard':'escort',T);$('fcErr').textContent='Order sent. Replies appear in the feed.'}renderConsole(false);return}
  if(k==='cmb'){if(NET.cl)netSend({t:'order',k:'build'});else requestBuild();$('fcErr').textContent='Request sent. The reply appears in the feed.';return}
  if(k==='tgt'){const e=(B.wlist||[])[+v];if(e)fconSend(t,'tgt',e)}else if(k==='wtgt'){const e=(B.wlist||[])[+v];if(e){fconSend(t,'tgt',e);fconSend(t,'pk:attack',null);$('fcErr').textContent=`Wing striking ${fTgtName(e)}.`}}else fconSend(t,a,null);
  renderConsole(false)}
function stratClick(ev){const B=W&&W.bridge;if(!B||!B.sMap)return;const c=$('stratc'),r=c.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top,{sc,w,h}=B.sMap,F=B.f,C=fctl(F.tok);
  const wx=-(mx-w/2)/sc,wz=-(my-h/2)/sc;let best=null,bd=16;const cand=W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side));if(W.stationEnt&&hostile('player',W.stationEnt.fac))cand.push(W.stationEnt);{const OE=W.outpostEnt;if(OE&&OE.o.owner&&hostile('player',OE.o.owner)&&!OE.o.breached)cand.push(OE)}
  for(const e of cand){const d=Math.hypot((w/2-e.x*sc)-mx,(h/2-e.z*sc)-my);if(d<bd){bd=d;best=e}}
  if(best){fconSend(F.tok,'tgt',best);if(isCar(F.tok)&&best.type==='ship')fconSend(F.tok,'pk:attack',null);$('fcErr').textContent=isCar(F.tok)?(best.type==='ship'?`Wing striking ${fTgtName(best)}.`:`Strike target: ${fTgtName(best)}. Use Strike next door (Hangar) for targets in other systems.`):`${isEsc(F.tok)?'Torpedoes':'Battery'} targeting ${fTgtName(best)}.`}else{fconSend(F.tok,`move:${Math.round(clamp(wx,-3000,3000))}:${Math.round(clamp(wz,-3000,3000))}:${Math.round(F.y)}`,null);$('fcErr').textContent='Moving to the marked point.'}renderConsole(false)}
function bridgeScreens(c,B,F,O,C,T){const at=(x,y,z)=>{qRot(F.q,x,y,z,_u);return proj(O.x+_u.x,O.y+_u.y,O.z+_u.z)};
  const v=Math.round(hyp(F.vx,F.vy,F.vz));qRot(F.q,0,0,1,_f);const brg=Math.round((Math.atan2(_f.x,_f.z)*180/Math.PI+360)%360),pw=C.power;
  const scr=[[10,3.05,11.2,['HELM',`${v} m/s · HDG ${brg}`,T.spin?`JUMP ${Math.round(T.spin.p*100)}%`:T.dest&&T.dest!==T.sector?'COURSE '+DEF[T.dest].name.toUpperCase():C.movePt?'MOVING':'HOLDING'],'#7ad9a7'],
    isEsc(T)?[-10,3.05,11.2,['WEAPONS',`TORPEDOES ${String(C.lanceMode).toUpperCase()}`,`PD ${String(C.pd).toUpperCase()}`],'#ff8a6a']:isCar(T)?[-10,3.05,11.2,['HANGAR',`CRAFT ${carWingNow(F,W).length}/${CAR_WING}`,`WING ${String((WING_MIS[C.pickets]||[C.pickets])[0]).toUpperCase()}`],'#ff8a6a']:[-10,3.05,11.2,['WEAPONS',`BATTERY ${String(C.lanceMode).toUpperCase()}`,`PD ${String(C.pd).toUpperCase()}`],'#ff8a6a'],
    [15.2,3.05,-.95,['COMMS',`${W.ents.filter(e=>e.type==='ship'&&e.alive&&(e.order||e.ord)).length} ORDERS ACTIVE`,`${W.ents.filter(e=>e.type==='ship'&&e.alive&&!e.isPlayer&&e.role!=='drone'&&e.role!=='picket'&&!hostile('player',e.side)).length} FRIENDLIES`],'#c99cff'],
    [-15,3.1,-7.3,['ENGINEERING',`ENG ${pw.eng} SHD ${pw.shd}`,`${isEsc(T)?"TRP":isCar(T)?"DECK":"BAT"} ${pw.lance} PD ${pw.pd}`],'#f0b24a'],
    [-9,7,-14.4,['HULL',`${Math.round(F.hull/F.st.hull*100)}%`,`SHIELD ${Math.round(F.shield/(F.st.sCap||1)*100)}%`],'#7ad9a7'],
    [0,7,-14.4,[DEF[W.sid].name.toUpperCase(),`${W.ents.filter(e=>e.type==='ship'&&e.alive&&hostile('player',e.side)).length} HOSTILE CONTACTS`,''],'#f0b24a'],
    [9,7,-14.4,['FLEET',`PICKETS ${(F.pickets||[]).filter(p=>p.alive).length}/2`,`THROTTLE ${Math.round(C.throttle*100)}%`],'#6fb7ff']];
  for(const[x,y,z,lines,col]of scr){const P=at(x,y,z);if(P.behind||P.d>40)continue;const a=clamp(1.4-P.d/30,0,1);if(a<=0)continue;const fs=Math.max(8,Math.min(15,260/P.d));c.globalAlpha=a;c.textAlign='center';
    lines.forEach((l,i)=>{if(!l)return;c.font=`${i?500:700} ${Math.round(fs*(i?.85:1))}px "JetBrains Mono",monospace`;c.fillStyle=i?'#cfe6f2':col;c.fillText(l,P.x,P.y+i*fs*1.15)})}
  // holo-tactical: nearby ships as points of light over the table (2.6 km to the table edge)
  const sc=3.2/2600;for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===F)continue;const dx=e.x-F.x,dy=e.y-F.y,dz=e.z-F.z;if(hyp(dx,dy,dz)>2600)continue;
    const lx=dx*_r0(F,0)+dy*_r0(F,1)+dz*_r0(F,2),ly=dx*_u0(F,0)+dy*_u0(F,1)+dz*_u0(F,2),lz=dx*_f0(F,0)+dy*_f0(F,1)+dz*_f0(F,2);
    const P=at(lx*sc,2.9+ly*sc*.6,2+lz*sc);if(P.behind)continue;c.globalAlpha=.9;c.fillStyle=e.isPlayer||e.rp?'#f0b24a':hostile('player',e.side)?'#ff5d4f':'#7ad9a7';c.beginPath();c.arc(P.x,P.y,Math.max(1.5,40/P.d),0,Math.PI*2);c.fill()}
  {c.lineWidth=1;for(const[R,al]of[[3.25,.32],[1.6,.2]]){c.beginPath();let pen=false;for(let i=0;i<=40;i++){const a=i/40*TAU,P=at(Math.sin(a)*R,2.9,2+Math.cos(a)*R);if(P.behind){pen=false;continue}pen?c.lineTo(P.x,P.y):c.moveTo(P.x,P.y);pen=true}c.globalAlpha=al;c.strokeStyle='#8fd0ff';c.stroke()}
   const A=at(0,2.15,2),Bp=at(0,3.3,2);if(!A.behind&&!Bp.behind){c.globalAlpha=.25;c.strokeStyle='#bfe0ff';c.lineWidth=Math.max(1,30/A.d);c.beginPath();c.moveTo(A.x,A.y);c.lineTo(Bp.x,Bp.y);c.stroke()}}
  {const P=at(0,2.9,2);if(!P.behind){c.globalAlpha=.9;c.fillStyle='#bfe0ff';c.beginPath();c.arc(P.x,P.y,Math.max(2,60/P.d),0,Math.PI*2);c.fill()}}
  c.globalAlpha=1}
const _bx={};function _axis(F,k){if(_bx.q!==F.q||_bx.t!==W.t){_bx.q=F.q;_bx.t=W.t;qRot(F.q,1,0,0,_u);_bx.r=[_u.x,_u.y,_u.z];qRot(F.q,0,1,0,_u);_bx.u=[_u.x,_u.y,_u.z];qRot(F.q,0,0,1,_u);_bx.f=[_u.x,_u.y,_u.z]}return _bx[k]}
function _r0(F,i){return _axis(F,'r')[i]}function _u0(F,i){return _axis(F,'u')[i]}function _f0(F,i){return _axis(F,'f')[i]}
// what the frigate's capital battery is on right now: the selected target, or what automatic mode picked
function tgtLive(g){if(!g)return false;if(g.type==='works')return!!(W.works&&W.works.includes(g));return g.type==='station'?W.stationEnt===g:g.type==='outpost'?W.outpostEnt===g&&!g.o.breached:g.alive&&W.ents.includes(g)}
function batteryTgt(F){const C=fctl(F.tok);if(C.lanceMode==='hold')return null;if(C.lanceMode==='target')return tgtLive(C.tgt)?C.tgt:null;if(F.lanceT!==undefined&&!NET.cl)return tgtLive(F.lanceT)?F.lanceT:null;
  let T=null;const SE=W.stationEnt;if(SE&&hostile(F.side,SE.fac))T=SE;let bd=2600;for(const o of W.ents)if(o.role==='frigate'&&o.alive&&o!==F&&hostile(F.side,o.side)){const d=d3(o,F);if(d<bd){bd=d;T=o}}if(!T){const OE=W.outpostEnt;if(OE&&OE.o.owner&&hostile(F.side,OE.o.owner)&&!OE.o.breached&&d3(OE,F)<2600)T=OE}return T}
function tgtKind(e){return e.type==='works'?'Station works':e.type==='station'?(e.rec&&e.rec.kind==='depot'?'Depot':'Station'):e.type==='outpost'?'Outpost':e.role==='frigate'?'Frigate':e.role==='limpet'?'Limpet':CLASSES[e.cls].name}
function tgtBars(e){if(e.type==='works')return[0,wkHp(e)/wkMax(e)];if(e.type==='station')return[e.shield/(e.sMax||1),e.rec?e.rec.hull/e.rec.hMax:1];if(e.type==='outpost'){const os=oStats(e.o);return[e.o.shield/os.sMax,e.o.hull/os.hMax]}return[e.shield/e.st.sCap,e.hull/e.st.hull]}
function wingTgt(F){const C=fctl(F.tok);return C.tgt&&tgtLive(C.tgt)?C.tgt:null}
function drawWingCard(c,F,C){const T=wingTgt(F),w=380,x=VW/2-w/2,y=100,h=T?58:44,m=(WING_MIS[C.pickets]||[C.pickets])[0];
  c.fillStyle='rgba(4,8,15,.78)';c.fillRect(x,y,w,h);c.strokeStyle=T?'rgba(255,93,79,.7)':'rgba(207,214,228,.25)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
  c.textAlign='left';c.font='700 11px "Big Shoulders Display",sans-serif';c.fillStyle='rgba(207,214,228,.75)';c.fillText('WING STRIKE TARGET',x+10,y+15);c.textAlign='right';c.fillStyle='#f0b24a';c.fillText('WING: '+String(m).toUpperCase(),x+w-10,y+15);c.textAlign='left';
  c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.8)';if(!T){c.fillText('No strike target. T nearest · Q next · click one in Contacts.',x+10,y+34);return}
  c.font='700 15px "Big Shoulders Display",sans-serif';c.fillStyle=T.type==='ship'?sideCol(T.side):'#ff8a7e';c.fillText(fTgtName(T).toUpperCase(),x+10,y+35);c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.8)';c.fillText(`${tgtKind(T)} · ${fmt(Math.round(d3(T,F)))} m`,x+10,y+51)}
function drawBattCard(c,F,C){if(isCar(F.tok)){drawWingCard(c,F,C);return}const T=batteryTgt(F),w=380,x=VW/2-w/2,y=100,h=T?74:44,mode=C.lanceMode;
  c.fillStyle='rgba(4,8,15,.78)';c.fillRect(x,y,w,h);c.strokeStyle=T?'rgba(255,93,79,.7)':'rgba(207,214,228,.25)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
  c.textAlign='left';c.font='700 11px "Big Shoulders Display",sans-serif';c.fillStyle='rgba(207,214,228,.75)';c.fillText(isEsc(F.tok)?'TORPEDO TARGET':'BATTERY TARGET',x+10,y+15);
  c.textAlign='right';c.fillStyle=mode==='hold'?'#ff8a7e':mode==='target'?'#f0b24a':'#7ad9a7';c.fillText(mode==='hold'?'HOLD FIRE':mode==='target'?'SELECTED':'AUTOMATIC',x+w-10,y+15);
  c.textAlign='left';
  if(!T){c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.8)';c.fillText(mode==='hold'?'Battery holding fire.':mode==='auto'?'Nothing in range: auto engages hostile stations, depots, outposts, capital ships.':'No target. T nearest · Q next · click one in Contacts.',x+10,y+34);return}
  const RG=isEsc(F.tok)?TORP_RANGE:2600,d=Math.round(d3(T,F)),inR=d<=RG,col=T.type==='ship'?sideCol(T.side):sideCol(T.type==='station'?T.fac:T.o.owner),lc=Math.max(0,F.lanceCd||0);
  c.font='700 16px "Big Shoulders Display",sans-serif';c.fillStyle=col;c.fillText(fTgtName(T).toUpperCase(),x+10,y+35);
  c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(236,228,207,.8)';c.fillText(`${tgtKind(T)} · ${fmt(d)} m`,x+10,y+52);
  c.textAlign='right';c.fillStyle=inR?'#7ad9a7':'#f0b24a';c.fillText(inR?(lc>0?`IN RANGE · reloading ${(lc/Math.max(.01,pmul(F.tok,'lance'))).toFixed(1)} s`:'IN RANGE · READY'):`OUT OF RANGE · close to ${(RG/1000).toFixed(1)} km`,x+w-10,y+35);
  const[bs,bh]=tgtBars(T),bw=(w-30)/2;c.fillStyle='rgba(111,183,255,.2)';c.fillRect(x+10,y+60,bw,5);c.fillStyle='#6fb7ff';c.fillRect(x+10,y+60,bw*clamp(bs,0,1),5);
  c.fillStyle='rgba(236,228,207,.2)';c.fillRect(x+20+bw,y+60,bw,5);c.fillStyle='#ece4cf';c.fillRect(x+20+bw,y+60,bw*clamp(bh,0,1),5)}
// bracket the battery target, or point to it from the screen edge when it's out of view
function drawBattMark(c,F,T){const P=proj(T.x,T.y,T.z),m=60,lbl=`${fTgtName(T)} · ${fmt(Math.round(d3(T,F)))} m`;
  if(!P.behind&&P.x>m&&P.y>m&&P.x<VW-m&&P.y<VH-m){const r=Math.max(14,projR(P.d,T.type==='ship'?T.st.radius*1.3:T.type==='station'?130:100))+8;c.strokeStyle='#ff5d4f';c.lineWidth=2;for(const[dx,dy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(P.x+dx*r,P.y+dy*r-dy*9);c.lineTo(P.x+dx*r,P.y+dy*r);c.lineTo(P.x+dx*r-dx*9,P.y+dy*r);c.stroke()}
    c.fillStyle='#ff5d4f';c.textAlign='left';c.font='600 12px "Saira Semi Condensed",sans-serif';c.fillText('TARGET · '+lbl,P.x+r+6,P.y-r+10);return}
  let dx=P.x-VW/2,dy=P.y-VH/2;if(P.behind){dx=-dx;dy=-dy}if(Math.abs(dx)<1&&Math.abs(dy)<1)dy=1;const a=Math.atan2(dy,dx),ex=Math.min(VW*.2,300),ey=Math.min(VH*.24,200),ax=VW/2+Math.cos(a)*ex,ay=VH/2+Math.sin(a)*ey;
  c.save();c.translate(ax,ay);c.rotate(a);c.fillStyle='#ff5d4f';c.beginPath();c.moveTo(16,0);c.lineTo(-8,-10);c.lineTo(-3,0);c.lineTo(-8,10);c.closePath();c.fill();c.restore();
  c.font='600 12px "Saira Semi Condensed",sans-serif';c.textAlign=Math.cos(a)>.3?'right':Math.cos(a)<-.3?'left':'center';c.fillStyle='#ff5d4f';c.fillText('TARGET · '+lbl,ax-Math.cos(a)*24,ay-Math.sin(a)*24+(Math.sin(a)>0?-6:14))}
function drawBridgeOverlay(c,t){const B=W.bridge,F=B.f,O=bridgeOrigin(F),near=bridgeNear(),T=F.tok,C=fctl(T);bridgeScreens(c,B,F,O,C,T);
  if(!B.panel){if(lookLocked()){c.fillStyle='rgba(240,178,74,.9)';c.beginPath();c.arc(VW/2,VH/2,2.5,0,TAU);c.fill()}{const tg=isCar(T)?wingTgt(F):batteryTgt(F);if(tg)drawBattMark(c,F,tg)}drawBattCard(c,F,C);
    c.textAlign='center';c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(207,214,228,.7)';c.fillText(`${isCar(T)?'Wing strike target':isEsc(T)?'Torpedo target':'Battery target'}: T nearest · Q next · aim the centre dot and click · or click it in Contacts`,VW/2,VH-112)}
  if(!B.panel&&!lookLocked()){c.textAlign='center';c.font='500 12px "Saira Semi Condensed",sans-serif';c.fillStyle='rgba(207,214,228,.75)';c.fillText('Click the view to look around with the mouse · Esc releases',VW/2,B.seat?VH-242:VH-130)}
  c.font='600 12px "Saira Semi Condensed",sans-serif';c.textAlign='center';
  for(const k of BRIDGE.cons){qRot(F.q,k.x,k.id==='hatch'?8.8:(k.id==='strat'?4.6:4.8),k.id==='hatch'?k.z-3.5:k.z,_u);const P=proj(O.x+_u.x,O.y+_u.y,O.z+_u.z);if(P.behind)continue;c.fillStyle=near===k?'#f0b24a':hexA(k.col,.85);c.fillText(k.name.toUpperCase(),P.x,P.y)}
  for(const e of W.ents){if(e.role!=='frigate'||e===F||!e.alive)continue;const P=proj(e.x,e.y,e.z);if(P.behind)continue;c.fillStyle=e.side==='player'?PLAYER_COL:sideCol(e.side);c.fillText((e.tok?e.tok.name:'FRIGATE')+' · '+fmt(Math.round(d3(e,F)))+' m',P.x,P.y-30)}
  c.fillStyle='rgba(236,228,207,.7)';c.beginPath();c.arc(VW/2,VH/2,2.5,0,TAU);c.fill();
  c.font='700 15px "Big Shoulders Display",sans-serif';c.fillStyle='#ece4cf';c.fillText(`${T.name} · HULL ${Math.round(F.hull/F.st.hull*100)}% · SHIELD ${Math.round(F.shield/F.st.sCap*100)}%${T.spin?` · JUMP ${Math.round(T.spin.p*100)}% → ${DEF[T.spin.to].name.toUpperCase()}`:''}`,VW/2,64);
  const inc=W.missiles.filter(m=>m.kind==='torpedo'&&m.tgt===F).length;if(inc){c.fillStyle=Math.floor(t*4)%2?'#ff5d4f':'#ffb3aa';c.fillText(`${inc} TORPEDO${inc>1?'ES':''} INBOUND`,VW/2,86)}
  c.font='600 14px "Saira Semi Condensed",sans-serif';c.fillStyle=near?'#f0b24a':'rgba(236,228,207,.6)';if(!B.seat)c.fillText(near?`E · ${near.name}`:'WASD walk · Shift to hurry · E at a console',VW/2,VH-150)}
function launchPlayerDrones(){if(!W||S.player.docked||W.dead||NET.cl)return;const P=S.player,p=W.player,n=(P.bay&&P.bay.drone)||0;p.drones=(p.drones||[]).filter(d=>d.alive&&W.ents.includes(d));
  for(let i=p.drones.length;i<n+p.drones.length&&P.bay.drone>0;i++){inv.take(P.bay,'drone',1);const d=makeNPC('drone','player','drone',1,{drone:1},'pbay');d.fac=P.faction;d.st=shipStats(P.faction,'drone',P.tiers.weapon);d.hull=d.st.hull;d.shield=d.st.sCap;d.wpn='kinetic';d.mom=p;d.ai.orb=i/Math.max(1,n)*TAU;
    const o=rdir();d.x=p.x+o.x*50;d.y=p.y+o.y*50;d.z=p.z+o.z*50;qCopy(d.q,p.q);d.vx=p.vx;d.vy=p.vy;d.vz=p.vz;p.drones.push(d);W.ents.push(d)}}
// ---- player convoys. A hauler pilot docked at a friendly station, with a course set and cargo aboard, can call a convoy:
// the faction assigns an escort wing (two fighters, three if the route leaves friendly space) from its stores. The wing flies
// escort on the hauler and jumps with it, like guard drones: it rides along as kits between systems and launches again on
// arrival. Docking at a friendly station in the destination ends the convoy: the escorts go home to faction stores. Other
// pilots of the faction who keep within 4 km of the hauler as it jumps are paid CVY_PAY a jump from the treasury, but only for
// jumps into or out of hostile or unclaimed space (no pay for safe runs between home systems).
const CVY_PAY=120,CVY_LIFE=1800;
function isHaulCls(c){return c==='courier'||c==='freighter'||c==='bulker'}
function convoyCall(){const P=S.player,f=P.faction;if(P.convoy)return'A convoy is already running.';if(P.docked!=='station')return'Call a convoy while docked at a friendly station.';if(!isHaulCls(P.cls))return'Convoys are for hauling ships: Light Hauler, Freighter or Heavy Hauler.';
  if(!P.route||P.route===P.sector)return'Set a course first (Map → a system → Set course).';if(invMass(P.cargo)<10)return'Load some cargo first: convoys escort a hold worth guarding.';
  const path=trPath(P.sector,P.route)||[P.route],T=territory(f),out=path.some(x=>!T.has(x)),n=out?3:2,tier=factionTier(f),srcs=[S.econ.fleet[f],S.econ.stock[f]].filter(Boolean),ships=[];
  for(let i=0;i<n;i++){let cl=pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(!haveIn(ld,srcs)){cl='interceptor';ld=loadout('patrol',tier,cl)}if(!takeFrom(ld,srcs))break;ships.push({cls:cl,tier,load:{...ld}})}
  if(ships.length<2){for(const t of ships)inv.addAll(S.econ.stock[f],t.load);return`${FACTIONS[f].short} command can't spare two escort fighters right now.`}
  P.convoy={id:S.nextId++,f,from:P.sector,dest:P.route,ships,live:false,T0:S.T,until:S.T+CVY_LIFE,jumps:0,esc:{}};
  facFeed(f,`📦 ${P.name||'A pilot'} is running a convoy from ${DEF[P.sector].name} to ${DEF[P.route].name}${out?' through hostile space':''}. Fly escort (keep within 4 km as it jumps) for ${CVY_PAY} cr a jump into or out of hostile or unclaimed space.`,'info');
  return`✓ Convoy called: ${ships.length} ${FACTIONS[f].short} fighters will form up on you when you launch. Dock at a friendly station in ${DEF[P.route].name} to finish.`}
function convoyLaunch(){const P=S.player,C=P.convoy;if(C&&W&&!NET.cl)convoySettle(W.sid);if(!C||C.live||!W||!W.player||!W.player.alive||P.docked||NET.cl)return;const p=W.player;C.live=true;
  C.ships.forEach((t,i)=>{const e=makeNPC('patrol',C.f,t.cls,t.tier,t.load,'stock:'+C.f);e.cvy=C.id;e.ai.retireAt=1e12;const o=rdir();e.x=p.x+o.x*160;e.y=p.y+o.y*60;e.z=p.z+o.z*160;qCopy(e.q,p.q);e.vx=p.vx;e.vy=p.vy;e.vz=p.vz;if(t.hp)e.hull=Math.max(1,e.st.hull*t.hp);
    e.order={kind:'escort',tgt:p,until:1e12,slot:i,by:true,pid:CTX||NET.me||null};W.ents.push(e)});C.ships=[]}
// pack the living escorts back into kits (between systems, or when docked); the dead are simply gone, their wrecks already spilled
function convoyPack(){const C=S.player.convoy;if(!C||!C.live||!W||NET.cl)return;for(const e of W.ents.slice())if(e.cvy===C.id){if(e.alive)C.ships.push({cls:e.cls,tier:e.tier,load:{...e.load},hp:e.hull/e.st.hull});e.load={};e.alive=false;const i=W.ents.indexOf(e);if(i>=0)W.ents.splice(i,1)}C.live=false}
// who's flying escort as the hauler leaves a system; paid when it arrives, and only if either end of the jump is outside friendly space
function convoyJump(){const P=S.player,C=P.convoy;if(!C||!W||!W.player||NET.cl)return;const p=W.player,esc=[];for(const e of W.ents){if(e===p||!e.alive||!(e.rp||e.isPlayer))continue;const k=e.rp||NET.me||'me',Q=e.rp?S.pilots&&S.pilots[e.rp]:(S.pilots&&S.pilots[NET.me])||null,fac=Q?Q.faction:e.fac;if(fac===C.f&&d3(e,p)<4000)esc.push(k)}C.pend={from:W.sid,esc};C.jumps++}
function convoySettle(sid){const C=S.player.convoy;if(!C||!C.pend)return;const T=territory(C.f);if(!T.has(C.pend.from)||!T.has(sid))for(const k of C.pend.esc)C.esc[k]=(C.esc[k]||0)+1;C.pend=null}
function convoyEnd(ok,why){const P=S.player,C=P.convoy;if(!C||NET.cl)return;if(W)convoySettle(W.sid);convoyPack();for(const t of C.ships)inv.addAll(S.econ.fleet[C.f]||S.econ.stock[C.f],t.load);
  let paid=0;if(ok)for(const k in C.esc){const got=payKey(k,C.f,CVY_PAY*C.esc[k]);if(got){paid+=got;keyFeed(k,`📦 Convoy escort for ${P.name||'a pilot'} complete: +${fmt(got)} cr.`,'good')}}
  feed(ok?`📦 Convoy arrived at ${DEF[C.dest].name} after ${C.jumps} jump${C.jumps===1?'':'s'}. The escorts head home${paid?`; escort pilots were paid ${fmt(paid)} cr`:''}.`:`📦 Convoy ended: ${why||'called off'}. The surviving escorts head home.`,ok?'good':'warn');P.convoy=null}
function convoyChip(){const C=S.player.convoy;if(!C)return null;if(NET.cl)return[`📦 Convoy to ${DEF[C.dest].name}${C.live?' · escorts with you':' · '+C.ships.length+' escorts aboard'}`,'good'];const n=C.live&&W?W.ents.filter(e=>e.cvy===C.id&&e.alive).length:C.ships.length;return[`📦 Convoy to ${DEF[C.dest].name} · ${n} escort${n===1?'':'s'}`,n?'good':'warn']}
function recallPlayerDrones(){if(!W||!W.player)return;for(const d of W.player.drones||[])if(d.alive&&W.ents.includes(d))despawn(d);W.player.drones=[]}
function deployDrones(e){e.drones=[];const n=e.load.drone||0;for(let i=0;i<n;i++){inv.take(e.load,'drone',1);const d=makeNPC('drone',e.side,'drone',1,{drone:1},e.home);d.wpn='kinetic';d.mom=e;d.ai.orb=i/n*TAU;
  const o=rdir();d.x=e.x+o.x*60;d.y=e.y+o.y*60;d.z=e.z+o.z*60;qCopy(d.q,e.q);d.vx=e.vx;d.vy=e.vy;d.vz=e.vz;e.drones.push(d);W.ents.push(d)}}
// a hauler run: the freighter crosses the sector gate to gate, most of the time with a fighter wing riding shotgun
function spawnHauler(side,initial){const h=spawnNPC('hauler',side,initial);if(!h)return null;
  if(side!=='pirate'&&Math.random()<.8){const g=spawnWing('escort',side,3,false);if(g){g.escort=h;h.escortG=g;let i=0;
    for(const m of g.members){const off=[[0,70,-170],[-120,40,-130],[120,40,-130],[0,-60,-220]][i++%4];qRot(h.q,off[0],off[1],off[2],_u);m.x=h.x+_u.x;m.y=h.y+_u.y;m.z=h.z+_u.z;qCopy(m.q,h.q);m.vx=h.vx;m.vy=h.vy;m.vz=h.vz}}}
  return h}
// match a moving anchor: desired velocity = anchor velocity + a spring toward the slot
function holdSlot(e,M,tx,ty,tz,dt,k){const dx=tx-e.x,dy=ty-e.y,dz=tz-e.z;let wx=M.vx+dx*k,wy=M.vy+dy*k,wz=M.vz+dz*k;const wl=hyp(wx,wy,wz),mx=e.st.maxSpd*1.15;if(wl>mx){wx*=mx/wl;wy*=mx/wl;wz*=mx/wl}
  const ux=wx-e.vx,uy=wy-e.vy,uz=wz-e.vz,u=hyp(ux,uy,uz)||1,acc=Math.min(e.st.thrust*1.3,u/dt);e.vx+=ux/u*acc*dt;e.vy+=uy/u*acc*dt;e.vz+=uz/u*acc*dt;e.thrusting=u>20}
function droneThink(e,dt){const ai=e.ai,M=e.mom;
  if(!M||!M.alive||!W.ents.includes(M)){e.role='leave';e.mom=null;return}
  const big=e.role==='picket',PM=big&&M.tok&&fOwn(M.tok)?(e.mis&&e.mis!=='sortie'?e.mis:wingMis(M.tok,e)):big&&M.tok&&e.wg==='B'?'hunt':null;   // an AI carrier: Alpha guards it, Bravo hunts
  if(e.mis==='sortie'&&big){if(NET.cl)return;const ev=S.events.find(v=>v.id===e.sortie),g=ev&&W.ents.find(x=>x.type==='gate'&&x.to===ev.to);if(!g||ev.stage!=='gather'){e.mis=null;e.sortie=null}else{const d=steer(e,g.x,g.y,g.z,dt,false,1.1);faceTo(e,g,dt);e.thrusting=true;e.boosting=d>900;if(d<260)sortieDepart(M,e);return}}
  if(PM==='recall'){if(NET.cl)return;const d=d3(e,M);if(d<M.st.radius+110){carStow(M,e);return}steer(e,M.x,M.y,M.z,dt,true);faceTo(e,M,dt);e.thrusting=true;return}
  if(PM==='hunt'){let T=ai.tgt&&ai.tgt.alive&&ai.tgt.type==='ship'&&W.ents.includes(ai.tgt)&&hostile(e.side,ai.tgt.side)?ai.tgt:null;
    if(!T||ai.t<=0){ai.t=.6+rnd(.3);T=null;let bd=1e9;for(const o of W.ents)if(o.type==='ship'&&o.alive&&o.role!=='frigate'&&hostile(e.side,o.side)&&!((o.isPlayer&&(S.player.docked||W.dead))||mHid(o,e))){const d=d3(o,e)*(isBmb(o.cls)?.6:1);if(d<bd){bd=d;T=o}}ai.tgt=T}
    if(T){fight(e,T,dt);return}}
  if(PM==='attack'){const C=fctl(M.tok);let T=C.tgt&&C.tgt.type==='ship'&&C.tgt.alive&&W.ents.includes(C.tgt)?C.tgt:null;if(!T){let bd=2500;for(const o of W.ents)if(o.type==='ship'&&o.alive&&o.role!=='frigate'&&hostile(e.side,o.side)&&!((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))){const d=d3(o,M);if(d<bd){bd=d;T=o}}}if(T){fight(e,T,dt);return}}
  if(ai.t<=0||!(ai.tgt&&ai.tgt.alive&&W.ents.includes(ai.tgt))||d3(ai.tgt,M)>(big?1700:1000)){ai.t=.4+rnd(.3);ai.tgt=null;let bd=1e9;const hurt=W.t-M.lastHit<5;
    for(const o of W.ents){if(o.type!=='ship'||!o.alive||!hostile(e.side,o.side)||o.role==='frigate')continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const dm=d3(o,M);if(dm>(big?1500:900))continue;
      const onM=(o.ai&&o.ai.tgt===M)||(hurt&&M.lastHitBy===o.side&&dm<(big?1200:700));if(!onM&&dm>(big?750:380))continue;const sc=dm-(onM?700:0);if(sc<bd){bd=sc;ai.tgt=o}}}
  if(ai.tgt){fight(e,ai.tgt,dt);return}
  ai.orb=(ai.orb||0)+dt*(big?.35:.8);const R=M.st.radius+(big?170:55),a=ai.orb;holdSlot(e,M,M.x+Math.cos(a)*R,M.y+Math.sin(a*1.3)*24,M.z+Math.sin(a)*R,dt,2);
  const rv=hyp(e.vx,e.vy,e.vz);if(rv>15)faceDir(e,e.vx,e.vy,e.vz,dt)}
function escortHauler(e){const g=e.grp;return g&&g.escort&&g.escort.alive&&W.ents.includes(g.escort)?g.escort:null}
function escortTarget(e){const H=escortHauler(e);if(!H){e.role='patrol';return findHostile(e,1500)}let best=null,bd=1e9;const hurt=W.t-H.lastHit<5;
  for(const o of W.ents){if(o.type!=='ship'||!o.alive||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;const dh=d3(o,H);if(dh>1300)continue;
    const onH=(o.ai&&(o.ai.tgt===H||(H.drones||[]).includes(o.ai.tgt)))||(hurt&&H.lastHitBy===o.side);if(!onH&&dh>950)continue;const sc=dh-(onH?800:0);if(sc<bd){bd=sc;best=o}}return best}
// patrols and escorts answer calls from civilians (miners, haulers and their drones) under fire nearby
function civHelp(e){let best=null,bd=2600;for(const c of W.ents){if(!c.npc||!c.alive||c.side!==e.side||!(c.role==='miner'||c.role==='hauler'||c.role==='drone'))continue;if(W.t-c.lastHit>3||!hostile(e.side,c.lastHitBy))continue;const d=d3(c,e);if(d<bd){bd=d;best=c}}
  if(!best)return null;let at=null,ad=1400;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o.side!==best.lastHitBy)continue;if(o.isPlayer&&(S.player.docked||W.dead))continue;const d=d3(o,best);if(d<ad){ad=d;at=o}}return at}
