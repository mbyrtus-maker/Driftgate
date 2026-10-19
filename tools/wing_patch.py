# Carrier replacements: request -> ready fighters answer (live patrols land, hangar fighters fly over, muster pilots)
# -> nearest builder builds and sends -> Orders for missing materials. Applied to the live driftgate.html.
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
s=open(D+'driftgate.html').read()
def R(a,b,cnt=1):
  global s
  n=s.count(a);assert n==cnt,(n,a[:90]);s=s.replace(a,b)

# wings are only filled at launch (pilot carriers still refill from their vault at the yard); assault bays refill at base
R("  if(isCar(t)){t.wing=t.wing||[];let g=0;while(t.wing.length<CAR_WING&&g++<12){",
  "  if(isCar(t)&&(t.owner||!t.wingInit)){t.wingInit=1;t.wing=t.wing||[];let g=0;while(t.wing.length<CAR_WING&&g++<12){")
R("function capCanRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=S.econ.stock[f];if(!st)return false;const sr=[S.econ.fleet[f],st].filter(Boolean);if((t.aload||0)<1&&haveIn(ASSAULT_LD,sr))return true;return isCar(t)&&(t.wing||[]).length<CAR_WING&&haveIn(loadout('patrol',1,'interceptor'),sr)}",
  "function capCanRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=S.econ.stock[f];if(!st)return false;const sr=[S.econ.fleet[f],st].filter(Boolean);return(t.aload||0)<1&&haveIn(ASSAULT_LD,sr)}")
R("&&(isCar(t)?(t.wing||[]).length<=1||(t.aload||0)<1:(t.aload||0)<1)&&capCanRefill(t))t.dest=capBase(t);",
  "&&(t.aload||0)<1&&capCanRefill(t))t.dest=capBase(t);")

# the request system
R("// a wing craft lost in battle",r"""// ---- carrier replacements. A carrier with empty bays requests craft. Ready fighters answer first: patrol fighters in its
// system acknowledge and land, a fighter waiting in the nearest friendly depot hangar flies over, or a pilot from the
// faction's muster pool does. Failing that, the closest station or depot that can build fighters builds one and sends it;
// if that station's stores are short, it posts an Order for the materials. The Brood's Hive Ship regrows its own.
const CAR_REQ_T=20,CAR_BUILD_T=45,CAR_HOP_T=40;
function carEnt(t){const w=WORLDS[t.sector];return w&&w.ents.find(e=>e.tok===t&&e.alive)}
function carHave(t){if(t.live){const e=carEnt(t);if(e){const w=WORLDS[t.sector];return(e.pickets||[]).filter(p=>p.alive&&w.ents.includes(p)).length+w.ents.filter(x=>x.role==='carland'&&x.carE===e&&x.alive).length}}return(t.wing||[]).length}
function carInflight(t){return S.events.filter(e=>e.type==='wingfly'&&e.car===t.id&&e.stage!=='done').length}
function carBuilders(f){return Object.values(S.stations).filter(R=>R.owner===f&&(R.kind==='core'||(R.kind==='depot'&&!R.fwd&&((devOf(R).hangar||0)>0||(devOf(R).prod||0)>=2))))}
function carNear(L,t){return L.slice().sort((a,b)=>(HOP[a.sid][t.sector]||0)-(HOP[b.sid][t.sector]||0))[0]}
function carSay(t,msg){if(!(friendSide(t.side)||covered(t.sector)))return;if(S.T-(t.sayT||-99)<40)return;t.sayT=S.T;feed(msg,friendSide(t.side)?'info':'news')}
function carSend(t,kit,cls,from,delay,how){const hops=from?(HOP[from][t.sector]||0):0;S.events.push({id:S.nextId++,type:'wingfly',car:t.id,side:t.side,cls,force:kit,from,sector:from||t.sector,until:S.T+delay+hops*CAR_HOP_T,stage:'flying',how})}
function carOrder(t,f,ld,st,B){if(S.contracts.some(c=>c.car===t.id))return;let item=null,n=0;for(const k in ld){const short=ld[k]-(st[k]||0);if(short>0){item=k;n=short+ld[k];break}}if(!item)return;
  const reward=Math.ceil(baseValue(item)*n*1.8/10)*10;S.contracts.push({id:S.nextId++,fac:f,item,n,reward,until:S.T+600,car:t.id,carName:t.name});
  if(f===S.player.faction)feed(`${B.name} needs ${n} ${ITEMS[item].name} to build replacement fighters for the carrier ${t.name}. Order posted: ${fmt(reward)} cr.`,'info')}
function carRequests(){for(const t of S.frigates){if(!isCar(t)||t.owner||t.hull<=0)continue;const f=t.side==='player'?S.player.faction:t.side;t.wing=t.wing||[];
  if(CAR_WING-carHave(t)-carInflight(t)<=0||S.T<(t.reqT||0))continue;t.reqT=S.T+CAR_REQ_T;
  const c=wingPick(f),ld=loadout('patrol',1,c),st=S.econ.stock[f],fl=S.econ.fleet[f];if(!st)continue;
  if(f==='brood'){if(takeFrom(ld,[st]))carSend(t,ld,c,null,90,'grown');continue}
  const hgR=carNear(Object.values(S.stations).filter(R=>R.owner===f&&R.hg&&R.hg.length&&(HOP[R.sid][t.sector]||0)<=4),t);
  if(hgR){const h=hgR.hg.shift();carSend(t,h.load,h.cls,hgR.sid,5,'hangar');carSay(t,`A ${HGR_NAME[h.cls]||CLASSES[h.cls].name} from ${hgR.name}'s hangar acknowledges ${t.name}'s call and is flying to join its wing.`);continue}
  const near=carNear(Object.values(S.stations).filter(R=>R.owner===f),t);
  if(fl&&haveIn(ld,[fl])){takeFrom(ld,[fl]);carSend(t,ld,c,near?near.sid:null,10,'muster');carSay(t,`A ${CLASSES[c].name} pilot acknowledges ${t.name}'s call for replacements and is on the way.`);continue}
  const B=carNear(carBuilders(f),t);if(!B)continue;
  if(haveIn(ld,[st])){takeFrom(ld,[st]);carSend(t,ld,c,B.sid,CAR_BUILD_T,'built');carSay(t,`${B.name} is building a replacement ${CLASSES[c].name} for ${t.name}.`);continue}
  carOrder(t,f,ld,st,B)}}
// a replacement arrives: it lands in an empty bay, or joins the wing in flight if the carrier is in a live system
function wingArrive(ev){if(ev.stage!=='flying'||S.T<ev.until)return;ev.stage='done';const t=S.frigates.find(x=>x.id===ev.car&&isCar(x));
  if(!t){const f=sideNorm(ev.side);inv.addAll(S.econ.stock[f]||S.econ.stock.pirate,ev.force);ev.force={};return}
  const e=t.live&&carEnt(t);if(e){const kit=ev.force,cls=ev.cls;ev.force={};inW(WORLDS[t.sector],()=>{const fac=e.fac,p=makeNPC('picket',t.side,cls,1,kit,e.home);p.fac=fac;p.mom=e;p.ai.orb=Math.random()*TAU;const g=pick(GATES[W.sid]);p.x=g.x*.9;p.y=g.y*.9;p.z=g.z*.9;fxWarp(p,sideCol(t.side));(e.pickets=e.pickets||[]).push(p);W.ents.push(p)});return}
  t.wing.push(ev.cls);inv.addAll(t.load,ev.force);ev.force={}}
// live: patrol fighters in a carrier's system answer its call and land to fill empty bays
function carLive(){if(NET.cl)return;for(const e of W.ents){if(e.role!=='frigate'||!e.alive||!e.tok||!isCar(e.tok)||e.tok.owner)continue;if(W.t<(e.landT||0))continue;e.landT=W.t+4;
    const t=e.tok,free=CAR_WING-carHave(t)-carInflight(t);if(free<=0)continue;let best=null,bd=5000;
    for(const o of W.ents){if(o.type!=='ship'||!o.alive||o.role!=='patrol'||o.side!==e.side||!o.npc||isBmb(o.cls)&&false)continue;if(!['interceptor','striker','heavy','bomber','gunboat'].includes(o.cls)||(o.ai.tgt&&o.ai.tgt.alive)||!(typeof o.home==='string'&&o.home.startsWith('stock:')))continue;const d=d3(o,e);if(d<bd){bd=d;best=o}}
    if(best){best.role='carland';best.carE=e;best.ai.tgt=null;if(friendSide(e.side)&&W.t-(W.carMsg||-99)>20){W.carMsg=W.t;feed(`${shipLabel?shipLabel(best):CLASSES[best.cls].name} acknowledges ${t.name}'s call and is landing to join its wing.`,'info')}}}}
function carLand(e,dt){const C=e.carE;if(!C||!C.alive||!W.ents.includes(C)){e.role='patrol';e.carE=null;return}
  const h=findHostile(e,1200);if(h){e.role='patrol';e.carE=null;e.ai.tgt=h;return}
  const d=steer(e,C.x,C.y,C.z,dt,true,1);faceDir(e,C.x-e.x,C.y-e.y,C.z-e.z,dt);e.thrusting=d>80;
  if(d<C.st.radius+90){e.role='picket';e.mom=C;e.home=C.home;e.carE=null;e.ai.orb=Math.random()*TAU;(C.pickets=C.pickets||[]).push(e)}}
// a wing craft lost in battle""")
# hook them in
R("lifeTick();devTick();hgTick();weTick();","lifeTick();devTick();hgTick();weTick();carRequests();")
R("    if(ev.type==='build'){buildTick(ev,T);continue}","    if(ev.type==='build'){buildTick(ev,T);continue}\n    if(ev.type==='wingfly'){wingArrive(ev);continue}")
R("function structUpdate(dt){\n  const SE=W.stationEnt;hgLive(dt);","function structUpdate(dt){\n  const SE=W.stationEnt;hgLive(dt);carLive();")
R("  if(e.role==='hgret'){hgReturn(e,dt);return}","  if(e.role==='hgret'){hgReturn(e,dt);return}\n  if(e.role==='carland'){carLand(e,dt);return}")
# Orders tab: say which carrier an order is for
R("<tr><td>${chip(k.item,k.n,have)}${bo?","<tr><td>${chip(k.item,k.n,have)}${k.car?`<span class=\"mass\">for the carrier ${esc(k.carName||'')}'s replacement fighters</span>`:''}${bo?")
open(D+'driftgate.html','w').write(s)
print('ok')
