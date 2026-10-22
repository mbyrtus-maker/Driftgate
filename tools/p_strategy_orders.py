# Patch: campaign strikes that launch, and strategy orders beside the supply drive.
# 1. Strikes. A campaign strike had to field its ships from stores the faction's other attacks kept draining, and 3 in 4 never
#    launched ("the stores could not field it"). Now the faction holds its other attacks and constructor convoys while its campaign
#    strike forms, waits up to 4 minutes for the ships, and goes with fewer when pilots sign on (each one counts as a ship).
# 2. Strategy orders. With each campaign target command posts an intel order (recon, or a beacon push) and a combat order (interdiction,
#    sabotage or screening the gate) beside the supply drive; each one done sends the strike in with 2 more ships. It also answers
#    threats as they come: a counter-attack when its ground is hit, a hunt for an enemy capital ship near its space, a Brood purge.
#    Orders succeed on what pilots do, or (more slowly) on the faction's own ships, and pay the pilots who did them.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# ---------------- 1. strikes
rep("function campBusy(f){const P=S.plans&&S.plans[f],m=P&&P.mv;return!!m&&m.kind==='take'&&m.stage==='active'}",
    "// the faction holds its other attacks and constructor convoys while its campaign strike forms and flies, and for the last\n"
    "// CAMP_SAVE seconds of the supply drive before it, so the stores can field the strike\n"
    "let CAMP_SAVE=210,CAMP_MN=3,CAMP_RES_K=.35;\n"
    "function campBusy(f){const P=S.plans&&S.plans[f],m=P&&P.mv;if(!m)return false;if(m.kind==='take'||m.kind==='build')return m.stage==='active'||m.stage==='brief';return m.stage==='active'&&!!P.next&&S.T>m.until-CAMP_SAVE}")
rep("function planBuild(f){const terr=territory(f)","function planBuild(f){if(FACTIONS[f]&&campBusy(f))return;const terr=territory(f)")
rep("function campOffensive(f,m){","function campOffensive(f,m,mn){")
rep("bonus=m.boost?3:0,n=clamp(4+lvl+ri(0,1)+bonus,4,11)","bonus=Math.min(6,2*(m.boost||0)),n=clamp(4+lvl+ri(0,1)+bonus,4,11)")
rep("if(got<4){inv.addAll(S.econ.stock[f],force);return null}","if(got<(mn||4)){inv.addAll(S.econ.stock[f],force);return null}")
rep("function campBuild(f,m){","function campBuild(f,m,mn){")
rep("for(let i=0;i<3+(m.boost?2:0);i++){const cl=pickFighter('patrol')","for(let i=0;i<3+Math.min(3,m.boost||0);i++){const cl=pickFighter('patrol')")
rep("      const ev=m.kind==='take'?campOffensive(f,m):campBuild(f,m);",
    "      m.boost=Math.max(m.boost||0,P.boost||0);const mn=Math.max(2,CAMP_MN-m.acc.length),ev=m.kind==='take'?campOffensive(f,m,mn):campBuild(f,m,mn);   // each pilot signed on stands in for a ship")
rep("if(!ev){if(++m.tries>4){campEnd(f,P,false,'the stores could not field it');continue}m.brief=S.T+30;continue}",
    "if(!ev){if(++m.tries>8){campEnd(f,P,false,'the stores could not field it');continue}m.brief=S.T+30;continue}")
rep("if(m.kind==='mine'||m.kind==='haul')P.boost=ok?1:0;","if(m.kind==='mine'||m.kind==='haul')P.boost=(P.boost||0)+(ok?1:0);")

# ---------------- 2. strategy orders
rep("S.plans[f]={f,mv:null,next:null,crew:{},paid:{},wins:0,fails:0,goal:null,gap:S.T+rnd(20,60)}",
    "S.plans[f]={f,mv:null,next:null,crew:{},paid:{},wins:0,fails:0,goal:null,gap:S.T+rnd(20,60),side:[],purge:{}}")
rep("m=campPrep(f,pk,P);P.lastPrep=m.kind}","m=campPrep(f,pk,P);P.lastPrep=m.kind;sideChain(f,P,pk,m)}")
rep("Press P to sign on.`,'info');\n  if(!NET.on&&S.player.faction!==f&&covered(m.sector))",
    "Press P to sign on.`,'info');\n  {const ch=sideOf(P).filter(o=>o.chain&&o.stage==='active'&&o.T0===S.T);if(ch.length)facFeed(f,`Alongside it: ${ch.map(o=>o.title).join('; ')}. Each one done sends the strike in with 2 more ships. Shift+P picks an order.`,'info')}\n  if(!NET.on&&S.player.faction!==f&&covered(m.sector))")
rep("if(frigatesIn(d.id).some(t=>sideNorm(t.side)===f))s.w*=1.5;if(frigatesIn(d.id).some(t=>hostile(f,t.side)))s.w*=.5;",
    "if(frigatesIn(d.id).some(t=>sideNorm(t.side)===f))s.w*=1.5;if(frigatesIn(d.id).some(t=>hostile(f,t.side)))s.w*=.5;{const Pp=S.plans&&S.plans[f];if(Pp&&Pp.purge&&Pp.purge[d.id]>S.T)s.w*=3}")
rep("    campEnd(f,P,campDone(m),ev?'it ran out of time':m.kind==='take'?'the assault was broken':'the convoy was lost')}\n  campGoal()}",
    "    campEnd(f,P,campDone(m),ev?'it ran out of time':m.kind==='take'?'the assault was broken':'the convoy was lost')}\n  for(const f of FAC_IDS)sideTick(f,campOf(f));\n  campGoal()}")

SIDE_JS = r"""// ---- strategy orders: beside its supply drive, command posts an intel and a combat order for the same target, and answers threats
// as they come (a counter-attack when its ground is hit, a hunt for an enemy capital ship nearby, a Brood purge). Each order succeeds
// on what pilots do and, without them, more slowly on the faction's own ships. A prep order done sends the strike in with 2 more ships.
const SIDE={recon:{lane:'intel',pay:320,need:30,suit:'Scout'},beacon:{lane:'intel',pay:300,suit:'Scout'},interdict:{lane:'cmb',pay:520,need:2,suit:'Fighter'},sabotage:{lane:'cmb',pay:560,need:30,suit:'Bomber'},
  screen:{lane:'cmb',pay:420,need:90,suit:'Fighter'},counter:{lane:'cmb',pay:700,suit:'Any combat ship'},hunt:{lane:'cmb',pay:1200,suit:'Bomber wing'},purge:{lane:'cmb',pay:520,need:5,suit:'Fighter'}};
const SIDE_W={halcyon:{recon:1,beacon:2,interdict:1,sabotage:.5,screen:2},varkesh:{recon:2,beacon:1,interdict:2,sabotage:2,screen:1},ostrova:{recon:2,beacon:1.5,interdict:1.5,sabotage:1,screen:1}};
const SIDE_MAX=4;let SIDE_AI=1;
function sideOf(P){return P.side||(P.side=[])}
function sideTgt(o){return o.st?S.stations[o.st]:o.out?S.outposts[o.out]:null}
function sideTgtName(o){const T=sideTgt(o);return T?T.name:o.tgtName||DEF[o.sector].name}
function sideHp(T){if(!T)return 1;if(T.hMax)return clamp(T.hull/T.hMax,0,1);if(T.level!=null)return clamp(T.hull/oStats(T).hMax,0,1);return 1}
function sideTitle(o){const sn=DEF[o.sector]?DEF[o.sector].name:'?';
  switch(o.kind){case'recon':return o.st||o.out?`Recon: scout ${sideTgtName(o)} in ${sn}`:`Recon: survey the build site in ${sn}`;
    case'beacon':return`Beacon push: hold ${o.need===1?'the beacon':'both beacons'} at ${o.sids.map(x=>DEF[x].name).join(' and ')}`;
    case'interdict':return`Interdiction: destroy ${o.need} ${FACTIONS[o.vs].short} supply freighters`;
    case'sabotage':return`Sabotage: knock ${o.need}% off ${sideTgtName(o)}'s hull`;
    case'screen':return`Screen the gate: hold ${sn} for the strike on ${DEF[o.obj].name}`;
    case'counter':return`Counter-attack: break the ${sideAdj(o.att)} strike on ${o.tgtName}`;
    case'hunt':return`Capital hunt: destroy the ${sideAdj(o.vs)} ${o.capN} ${o.tokName}`;
    case'purge':return`Brood purge: destroy ${o.need} Brood ships in ${sn}`}return o.kind}
function sideHow(o){const sn=DEF[o.sector]?DEF[o.sector].name:'?',F=FACTIONS[o.f].short;
  switch(o.kind){case'recon':return o.st||o.out?`Fly to ${sn} and hold within 2 km of ${sideTgtName(o)}: 30 s on station between you all does it.`:`Fly to ${sn} and hold in the system: 30 s on station between you all does it.`;
    case'beacon':return`Flip and hold the beacons at ${o.sids.map(x=>DEF[x].name).join(' and ')} (a Scout, within ${BCN_R} m for ${BCN_T} s). Done when ${F} holds ${o.need===1?'it':'both'}.`;
    case'interdict':return`Destroy ${o.need} ${FACTIONS[o.vs].short} supply freighters, anywhere (Missions → Convoy raids lists them). Each pays its raid bounty too.`;
    case'sabotage':return`Fly to ${sn} and knock ${o.need}% off ${sideTgtName(o)}'s hull. Bombers and torpedoes do it fastest.`;
    case'screen':return`Fly to ${sn} and hold there: 90 s of pilot time in the system does it.`;
    case'counter':return`Fly to ${sn} and fight when the ${sideAdj(o.att)} strike lands. Done if ${o.tgtName} holds.`;
    case'hunt':return`Find the ${o.capN} ${o.tokName} (now in ${sn}) and help destroy it. Time in its system counts as your part.`;
    case'purge':return`Fly to ${sn} and destroy ${o.need} Brood ships there. Done, it opens the system to the campaign.`}return''}
function sideStat(o){const p=Math.floor(o.prog||0);
  switch(o.kind){case'recon':return`${Math.min(o.need,p)}/${o.need} s on station`;case'beacon':return`${p}/${o.need} beacon${o.need>1?'s':''} held`;case'interdict':return`${Math.min(o.need,p)}/${o.need} freighters`;
    case'sabotage':return`${Math.min(o.need,p)}/${o.need}% hull`;case'screen':return`${Math.min(o.need,p)}/${o.need} s held`;case'purge':return`${Math.min(o.need,p)}/${o.need} Brood`;
    case'counter':{const ev=S.events.find(e=>e.id===o.evId);return ev?(ev.stage==='inbound'?`lands in ${Math.max(0,Math.round(ev.eta-S.T))} s`:'fighting now'):'resolving'}
    case'hunt':return`in ${DEF[o.sector].name}`}return''}
function sideNew(f,P,kind,o,quiet){const D=SIDE[kind],x={id:S.nextId++,f,kind,lane:D.lane,stage:'active',T0:S.T,prog:0,need:D.need||1,acc:[],help:{},pay:D.pay,ai:rnd(.6,1.3),...o};x.title=sideTitle(x);sideOf(P).push(x);
  if(!quiet)facFeed(f,`📋 ${FACTIONS[f].short} command: ${x.title}. ${fmt(x.pay)} cr to the pilots who do it. Shift+P picks it, P signs on.`,'info');return x}
// a new campaign target: an intel order and a combat order beside the supply drive, closing when it does
function sideChain(f,P,pk,m){const L=sideOf(P);for(const o of L)if(o.chain&&o.stage==='active'){o.stage='lost';o.end=S.T}
  const until=m.brief+(m.dur||360),W0=SIDE_W[f]||{},T=pk.st?S.stations[pk.st]:pk.out?S.outposts[pk.out]:null,ow=T&&T.owner?sideNorm(T.owner):null,base={chain:1,obj:pk.sid,st:pk.st||null,out:pk.out||null,tgtName:T?T.name:null,until};
  const bs=[pk.sid,...NEIGH[pk.sid]].filter(x=>S.beacons&&S.beacons[x]&&DEF[x].kind!=='void').slice(0,2),ic=[['recon',W0.recon||1]];if(bs.length&&bs.some(x=>S.beacons[x].owner!==f))ic.push(['beacon',W0.beacon||1]);
  if(wpickArr(ic)==='beacon')sideNew(f,P,'beacon',{...base,sector:pk.sid,sids:bs,need:bs.length},1);else sideNew(f,P,'recon',{...base,sector:pk.sid},1);
  const terr=territory(f),home=FAC_HOME(f),gate=NEIGH[pk.sid].filter(n=>terr.has(n)).sort((a,b)=>HOP[a][home]-HOP[b][home])[0]||pk.sid,cc=[['screen',W0.screen||1]];
  if(ow&&FAC_IDS.includes(ow)&&hostile(f,ow))cc.push(['interdict',W0.interdict||1]);if(T&&ow&&hostile(f,ow)&&pk.kind==='take')cc.push(['sabotage',W0.sabotage||1]);
  const ck=wpickArr(cc);if(ck==='screen')sideNew(f,P,'screen',{...base,sector:gate},1);else if(ck==='interdict')sideNew(f,P,'interdict',{...base,sector:pk.sid,vs:ow},1);else sideNew(f,P,'sabotage',{...base,sector:pk.sid,hp0:sideHp(T)},1)}
// pilots of a side in flight: [key, sector, ship] (the ship only where its system is live)
function sidePilots(f){const out=[];if(!NET.cl&&!S.unb&&S.player.faction===f&&!S.player.docked&&W&&W.player&&W.player.alive&&W.sid===S.player.sector)out.push([pkey(),S.player.sector,W.player]);
  if(NET.host)for(const pid in S.pilots||{}){const R=S.pilots[pid];if(pid===NET.me||R.faction!==f||R.docked)continue;const e=MP.rp&&MP.rp[pid];out.push([pid,R.sector,e&&e.alive?e:null])}return out}
function sideHelp(o,k,n){if(!o.acc.includes(k))o.acc.push(k);o.help[k]=(o.help[k]||0)+n}
function sideAccept(k,o){if(o.acc.includes(k))return false;o.acc.push(k);o.help[k]=o.help[k]||0;keyFeed(k,`Signed on: ${o.title}. ${sideHow(o)}`,'good');return true}
function sideTick(f,P){const L=sideOf(P),T=S.T,pl=sidePilots(f);
  const act=()=>L.filter(o=>o.stage==='active');
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='counter')){const ev=S.events.find(e=>e.type==='offensive'&&e.stage==='inbound'&&e.att!==f&&hostile(f,e.att)&&sideNorm(evOwner(e))===f&&e.eta-T>15);
    if(ev)sideNew(f,P,'counter',{sector:ev.sector,evId:ev.id,att:ev.att,st:ev.st||null,out:ev.target||null,tgtName:evName(ev),until:ev.eta+420})}
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='hunt')&&Math.random()<.35){const th=capThreats(f)[0];if(th&&!L.some(o=>o.kind==='hunt'&&o.tok===th.t.id))sideNew(f,P,'hunt',{sector:th.t.sector,tok:th.t.id,tokName:th.t.name,vs:th.t.side,capN:th.t.side==='brood'?broodCap(th.t):capName(th.t),until:T+720})}
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='purge')&&Math.random()<.06){const terr=territory(f),c=[];for(const d of SECTOR_DEFS){if(terr.has(d.id)||!NEIGH[d.id].some(n=>terr.has(n)))continue;if(sideNorm(sectorOwner(d.id))==='brood')c.push(d.id)}if(c.length)sideNew(f,P,'purge',{sector:pick(c),until:T+600})}
  for(const o of L){if(o.stage!=='active')continue;const dur=Math.max(60,o.until-o.T0),abs=()=>{o.abs=(o.abs||0)+o.need/(dur/10)*o.ai*rnd(.6,1.4)*SIDE_AI},here=pl.filter(x=>x[1]===o.sector);
    if(o.kind==='recon'){abs();const w=WORLDS[o.sector],E=w&&(o.st?w.stationEnt:o.out?w.outpostEnt:null);for(const[k,,e]of here)if(e&&(!E||d3(e,E)<2000)){o.real=(o.real||0)+10;sideHelp(o,k,10)}o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='screen'){abs();for(const[k,,e]of here)if(e){o.real=(o.real||0)+10;sideHelp(o,k,10)}o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='interdict'||o.kind==='purge'){abs();o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='sabotage'){abs();const Tg=sideTgt(o);if(!Tg||sideNorm(Tg.owner)===f){sideEnd(f,P,o,false,'the target changed hands');continue}
      if(WORLDS[o.sector]){const d=Math.round(((o.hp0||1)-sideHp(Tg))*100);if(d>(o.dmg||0)){const g=d-(o.dmg||0);o.dmg=d;for(const[k,,e]of here)if(e)sideHelp(o,k,g)}}o.prog=Math.max(o.abs||0,o.dmg||0)}
    else if(o.kind==='beacon'){if(Math.random()<.05*o.ai*SIDE_AI){const nx=o.sids.find(x=>S.beacons[x]&&S.beacons[x].owner!==f);if(nx&&!WORLDS[nx])beaconFlip(nx,f,null)}o.prog=o.sids.filter(x=>S.beacons[x]&&S.beacons[x].owner===f).length}
    else if(o.kind==='counter'){const ev=S.events.find(e=>e.id===o.evId);if(ev&&T>=ev.eta-20)for(const[k,,e]of here)if(e)sideHelp(o,k,10);
      if(!ev||ev.stage==='done'){const ow=o.st?(S.stations[o.st]||{}).owner:o.out?S.outposts[o.out].owner:null;sideEnd(f,P,o,sideNorm(ow)===f,'the target fell');continue}}
    else if(o.kind==='hunt'){const t=(S.frigates||[]).find(x=>x.id===o.tok);if(!t||t.hull<=0){sideEnd(f,P,o,true);continue}o.sector=t.sector;for(const[k,,e]of pl.filter(x=>x[1]===t.sector))if(e)sideHelp(o,k,10)}
    if(o.kind!=='counter'&&o.kind!=='hunt'&&o.prog>=o.need){sideEnd(f,P,o,true);continue}
    if(T>=o.until)sideEnd(f,P,o,false,o.kind==='hunt'?'it got away':o.kind==='counter'?'it ran out of time':'time ran out')}
  P.side=L.filter(o=>o.stage==='active'||T-(o.end||0)<60)}
function sideEnd(f,P,o,ok,why){o.stage=ok?'won':'lost';o.end=S.T;
  const forTgt=o.chain&&((P.next&&P.next.sid===o.obj)||(P.mv&&P.mv.obj===o.obj&&(P.mv.stage==='brief'||P.mv.kind==='mine'||P.mv.kind==='haul')));
  if(ok&&forTgt)P.boost=(P.boost||0)+1;if(ok&&o.kind==='purge'){P.purge=P.purge||{};P.purge[o.sector]=S.T+900}
  facFeed(f,ok?`✓ ${FACTIONS[f].short} command: "${o.title}" done.${forTgt?` The strike on ${DEF[o.obj].name} goes in with 2 more ships.`:o.kind==='purge'?` ${DEF[o.sector].name} is open for the campaign.`:''}`:`✗ ${FACTIONS[f].short} command: "${o.title}" failed${why?': '+why:''}.`,ok?'good':'warn');
  if(!ok)return;const keys=Object.keys(o.help).filter(k=>o.help[k]>0),tot=keys.reduce((a,k)=>a+o.help[k],0);
  for(const k of keys){P.crew[k]=(P.crew[k]||0)+1;const n=Math.round(o.pay*Math.max(.4,o.help[k]/tot)),got=payKey(k,f,n);keyFeed(k,`★ Order bonus for "${o.title}": +${fmt(got)} cr from the ${FACTIONS[f].short} treasury.`,'good');if(isMe(k))SFX.count(true);weAdd(f,WE.camp*.5)}}
// kills that count: supply freighters for an interdiction, Brood ships for a purge, a share of a hunted capital ship
function sideKill(e,sh,killer){const ks=Object.keys(sh);if(!ks.length&&killer)ks.push(killer);
  for(const k of ks){const f=isMe(k)?S.player.faction:S.pilots&&S.pilots[k]&&S.pilots[k].faction;if(!FACTIONS[f]||!S.plans||!S.plans[f])continue;const x=sh[k]||1;
    for(const o of sideOf(S.plans[f])){if(o.stage!=='active')continue;
      if(o.kind==='interdict'&&e.role==='trader'&&e.tradeT&&e.tradeT.kind==='haul'&&sideNorm(e.side)===o.vs){o.real=(o.real||0)+x;sideHelp(o,k,10*x)}
      else if(o.kind==='purge'&&e.side==='brood'&&e.role!=='drone'&&W&&W.sid===o.sector){o.real=(o.real||0)+x;sideHelp(o,k,10*x)}
      else if(o.kind==='hunt'&&e.role==='frigate'&&e.tok&&e.tok.id===o.tok)sideHelp(o,k,40*x)}}}
function sideBcn(sid,side,by){if(!by||!S.plans||!S.plans[side])return;for(const o of sideOf(S.plans[side]))if(o.stage==='active'&&o.kind==='beacon'&&o.sids.includes(sid))sideHelp(o,by,10)}
// signing on from the orders card or the Missions tab
function sideTake(o){const k=pkey();if(!o.acc.includes(k)){if(NET.cl){netSend({t:'plan',id:o.id});o.acc.push(k);feed(`Signed on: ${o.title}. ${sideHow(o)}`,'good')}else sideAccept(k,o);SFX.count(true)}sideCourse(o)}
function sideCourse(o){const P=S.player;let to=o.sector;
  if(o.kind==='interdict'){const t=(S.traders||[]).filter(t=>t.kind==='haul'&&sideNorm(t.side)===o.vs).sort((a,b)=>HOP[P.sector][a.sector]-HOP[P.sector][b.sector])[0];if(t)to=t.sector}
  if(!to)return;if(to===P.sector){flash(o.kind==='interdict'?'An enemy supply freighter is in this system: find it (T or Q).':'You are in the system for this order.');return}
  P.route=to;if(W&&!P.docked){apOn=true;const g=routeNext();if(g)W.tgt={kind:'gate',ref:g};flash(`Course set to ${DEF[to].name}. Autopilot on: steer to take back control.`)}else flash(`Course set to ${DEF[to].name}. Undock and press J to fly it.`)}
"""
rep("function campAccept(k,m){", SIDE_JS+"function campAccept(k,m){")
# hooks
rep("if(killer&&!sh[killer])runAs(isMe(killer)?null:killer,()=>{S.player.kills++});\n  if(S.unb){",
    "if(killer&&!sh[killer])runAs(isMe(killer)?null:killer,()=>{S.player.kills++});\n  if(!NET.cl)sideKill(e,sh,killer);\n  if(S.unb){")
rep("B.owner=side;B.by=by||null;B.T=S.T;B.sec=S.T;B.pay=S.T;B.byT=S.T;S.bcnV=(S.bcnV||0)+1;bcnMissionPay(sid,side,by);",
    "B.owner=side;B.by=by||null;B.T=S.T;B.sec=S.T;B.pay=S.T;B.byT=S.T;S.bcnV=(S.bcnV||0)+1;bcnMissionPay(sid,side,by);sideBcn(sid,side,by);")
rep("function beaconSecure(sid,side,by){const B=S.beacons[sid];if(!B||B.owner!==side)return;const nm=DEF[sid].name,oldBy=B.by;B.sec=S.T;",
    "function beaconSecure(sid,side,by){const B=S.beacons[sid];if(!B||B.owner!==side)return;const nm=DEF[sid].name,oldBy=B.by;B.sec=S.T;sideBcn(sid,side,by);")
rep("case 'plan':{const C=S.plans&&S.plans[P.faction],mv=C&&C.mv;if(mv&&mv.id===+m.id)campAccept(pid,mv);break}",
    "case 'plan':{const C=S.plans&&S.plans[P.faction],mv=C&&C.mv;if(mv&&mv.id===+m.id)campAccept(pid,mv);else{const o=C&&sideOf(C).find(x=>x.id===+m.id&&x.stage==='active');if(o)sideAccept(pid,o)}break}")

# ---------------- the order list, P, the HUD card
rep("function ordKey(o){return o.t==='camp'?'c'+o.m.id:",
    "function ordKey(o){return o.t==='side'?'s'+o.o.id:o.t==='camp'?'c'+o.m.id:")
rep("const C=myCamp(),m=C&&C.mv,out=[];if(m)out.push({t:'camp',m,label:m.title});\n  for(const op of friendlyOps()){if(op.kind==='local')continue;if(m&&m.evId&&op.ev&&op.ev.id===m.evId)continue;out.push({t:'op',op,label:op.label})}\n  for(const o of out)o.key=ordKey(o);return out.slice(0,5)}",
    "const C=myCamp(),m=C&&C.mv,out=[],sd=C?sideOf(C).filter(o=>o.stage==='active'):[];if(m)out.push({t:'camp',m,label:m.title});\n  for(const o of sd)out.push({t:'side',o,label:o.title});\n  for(const op of friendlyOps()){if(op.kind==='local')continue;if(m&&m.evId&&op.ev&&op.ev.id===m.evId)continue;if(op.ev&&sd.some(o=>o.evId===op.ev.id))continue;out.push({t:'op',op,label:op.label})}\n  for(const o of out)o.key=ordKey(o);return out.slice(0,7)}")
rep("ordPick=L[i].key;if(L[i].t==='op'){joinOp(L[i].op);return}const m=L[i].m;",
    "ordPick=L[i].key;if(L[i].t==='op'){joinOp(L[i].op);return}if(L[i].t==='side'){sideTake(L[i].o);return}const m=L[i].m;")
rep('<div class="om">${esc(m.title)}</div>',
    '<div class="om"><i class="otg ${m.kind===\'mine\'||m.kind===\'haul\'?\'log\':\'cmb\'}">${m.kind===\'mine\'||m.kind===\'haul\'?\'Supply\':\'Strike\'}</i>${esc(m.title)}</div>')
rep("  for(const o of L){if(o.t!=='op')continue;const on=o===pick;",
    "  for(const o of L){if(o.t!=='side')continue;const on=o===pick,x=o.o,sg=x.acc.includes(k);h+=`<div class=\"oi sd${on?' sel':''}\" data-ord=\"${o.key}\"><div class=\"om\"><i class=\"otg ${x.lane}\">${x.lane==='intel'?'Intel':'Combat'}</i>${esc(x.title)}</div><div class=\"os\"><span>${esc(sideStat(x))} · ${fmtT(Math.max(0,x.until-S.T))} · ${fmt(x.pay)} cr · ${esc(SIDE[x.kind].suit)}</span><span class=\"${sg?'ok':'go'}\">${sg?(on?'✓ P course':'✓'):on?'P · sign on':''}</span></div></div>`}\n"
    "  for(const o of L){if(o.t!=='op')continue;const on=o===pick;")
rep(".ordc .onx{padding:6px 9px 0 12px;",
    ".ordc .otg{font-style:normal;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;padding:0 5px;margin-right:6px;vertical-align:1px}.ordc .otg.cmb{color:#ff9d93;background:rgba(255,93,79,.16)}.ordc .otg.intel{color:#8fc3ff;background:rgba(143,195,255,.14)}.ordc .otg.log{color:var(--amber);background:rgba(240,178,74,.14)}\n"
    ".ordc .oi.sd .om{font-size:12px;padding-left:10px}.ordc .oi.sd .os{padding-left:10px}\n.ordc .onx{padding:6px 9px 0 12px;")

# ---------------- the docked Missions tab: the same orders, under the campaign
rep("  const ops=friendlyOps();h+=`<div class=\"h3\" style=\"margin-top:16px\">Operations</div>`;",
    "  {const L=(C?sideOf(C):[]).filter(o=>o.stage==='active'),k=pkey();h+=`<div class=\"h3\" style=\"margin-top:16px\">Faction orders</div>`;\n"
    "    h+=L.length?L.map(o=>`<div class=\"opr ${o.lane==='cmb'?'defend':'assist'}\"><div><b>${esc(o.title)}</b><br><span>${esc(sideStat(o))} · ${fmtT(Math.max(0,o.until-S.T))} left · ${fmt(o.pay)} cr · suits ${esc(SIDE[o.kind].suit)}${o.acc.includes(k)?' · signed on':''}</span><br><span>${esc(sideHow(o))}</span></div><button class=\"btn\" data-act=\"sideon\" data-arg=\"${o.id}\">${o.acc.includes(k)?'Set course':'Sign on'}</button></div>`).join('')\n"
    "      :`<div class=\"empty\">No other orders right now. With each campaign target command posts recon or beacon work and an interdiction, sabotage or screening order, and it answers attacks, capital ships and Brood pressure as they come.</div>`}\n"
    "  const ops=friendlyOps();h+=`<div class=\"h3\" style=\"margin-top:16px\">Operations</div>`;")
rep("  if(act==='opjoin'){joinOp(friendlyOps()[+arg]);",
    "  if(act==='sideon'){const C=myCamp(),o=C&&sideOf(C).find(x=>String(x.id)===arg);if(o)sideTake(o);dockErr=S.player.route&&S.player.route!==S.player.sector?`✓ Signed on. Course set to ${DEF[S.player.route].name}. Launch and press J.`:'✓ Signed on.';renderDock();return}\n"
    "  if(act==='opjoin'){joinOp(friendlyOps()[+arg]);")
# words
rep("(your faction's campaign move, its strikes and convoys, calls to defend)",
    "(your faction's campaign move; its recon, beacon, interdiction, sabotage and screening orders; counter-attacks, capital hunts and Brood purges; its strikes and convoys)")

# a war chest: while the supply drive runs, command sets materials aside for the strike after it (a third of the stores' plate,
# wire and the rest each tick, up to four strikers' loadouts, or a depot kit and two escorts), and the strike fields from it first.
# What the strike doesn't use goes back to the stores. It sits in the ledger with the fleets in muster, so nothing is made or lost.
rep("  for(const f of FAC_IDS){const P=campOf(f);let m=P.mv;","  for(const f of FAC_IDS){const P=campOf(f);let m=P.mv;campRes(f,P);")
rep("tier=factionTier(f),force={},srcs=[S.econ.fleet[f],S.econ.stock[f]],cls=[]","tier=factionTier(f),force={},srcs=[campOf(f).res||(campOf(f).res={}),S.econ.fleet[f],S.econ.stock[f]],cls=[]")
rep("if(got<(mn||4)){inv.addAll(S.econ.stock[f],force);return null}","if(got<(mn||4)){inv.addAll(campOf(f).res,force);return null}")
rep("const st=S.econ.stock[f],srcs=[S.econ.fleet[f],st];if(!haveIn(FWD_COST,[st])||!haveIn(CONSTR_LD,srcs))return null;\n  const force={};takeFrom(FWD_COST,[st]);",
    "const st=S.econ.stock[f],R=campOf(f).res||(campOf(f).res={}),srcs=[R,S.econ.fleet[f],st];if(!haveIn(FWD_COST,[R,st])||!haveIn(CONSTR_LD,srcs))return null;\n  const force={};takeFrom(FWD_COST,[R,st]);")
rep("if(cls.length<CR_ESC_MIN){inv.addAll(st,force);return null}","if(cls.length<CR_ESC_MIN){inv.addAll(R,force);return null}")
rep("function campEnd(f,P,ok,why){const m=P.mv;P.mv=null;","function campEnd(f,P,ok,why){const m=P.mv;P.mv=null;if(m.kind==='take'||m.kind==='build')campResBack(f,P);")
rep("else{const tg=campTargets(f);if(!tg.length)return null;","else{campResBack(f,P);const tg=campTargets(f);if(!tg.length)return null;")
rep("for(const k in S.econ.fleet)invVec(S.econ.fleet[k],L['Fleets in muster']);","for(const k in S.econ.fleet)invVec(S.econ.fleet[k],L['Fleets in muster']);for(const k in S.plans||{})invVec(S.plans[k].res||{},L['Fleets in muster']);")
rep("function campAccept(k,m){", r"""function campRes(f,P){P.res=P.res||{};const pk=P.next,m=P.mv;if(!pk||!m||!(m.kind==='mine'||m.kind==='haul'))return;const st=S.econ.stock[f],ld=loadout('patrol',factionTier(f),'striker'),want={};
  for(const k in ld)want[k]=ld[k]*(pk.kind==='build'?2:4);if(pk.kind==='build'){for(const k in FWD_COST)want[k]=(want[k]||0)+FWD_COST[k];for(const k in CONSTR_LD)want[k]=(want[k]||0)+CONSTR_LD[k]}
  for(const k in want){const need=want[k]-(P.res[k]||0);if(need<=0)continue;const n=Math.min(need,Math.floor((st[k]||0)*CAMP_RES_K));if(n>0)inv.add(P.res,k,inv.take(st,k,n))}}
function campResBack(f,P){if(P.res&&Object.keys(P.res).length){inv.addAll(S.econ.stock[f],P.res);P.res={}}}
function campAccept(k,m){""")

open(P,'w',encoding='utf-8').write(s);print('strategy orders applied')
