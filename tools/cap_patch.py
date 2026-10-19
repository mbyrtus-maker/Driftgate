# Capital rework test build: carriers + escorts, no frigates; assault loads capture depots; forward depots.
import sys
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
s=open(D+'driftgate.html').read()
def R(a,b,cnt=1):
  global s
  n=s.count(a)
  assert n==cnt,(n,a[:90])
  s=s.replace(a,b)

# ---------- constants and classes
R("ESC_HULL=2800,ESC_JUMP=1.7,ESC_TORP_CD=12,ESC_TORP_MUL=7;",
  "ESC_HULL=3100,ESC_JUMP=1.7,ESC_TORP_CD=12,ESC_TORP_MUL=5;\n"
  "// capital rework test build: fleet carriers (one per faction, the Brood's is the Hive Ship) and escorts; no frigates.\n"
  "// Depots are captured by assault loads (carrier 3, escort 1) once breached; constructors build cheap forward depots.\n"
  "const CAP_TEST=1,CARRIER_COST={keel:6,lattice:4,core:2,wire:12,frame:4,coil:10},CAR_HULL=5000,CAR_SHIELD=2400,CAR_WING=6,CAR_ASSAULT=3,ASSAULT_LD={plate:8,coil:3},FWD_COST={frame:1},CAR_NAMES=['Bastion','Harbinger','Citadel','Aegis','Ascendant','Bulwark','Meridian'];")
R("  frigate:{name:'Frigate',hull:3000,",
  "  carrier:{name:'Carrier',hull:2500,shield:14,speed:.36,turn:.26,weapon:0,cargo:0,drill:0,radius:120,rack:0,boost:1,agile:.25,acc:.3,desc:'Fleet carrier.'},\n  frigate:{name:'Frigate',hull:3000,")
R("frigate:'b_leviathan',escort:'b_carapace'};","frigate:'b_leviathan',escort:'b_carapace',carrier:'b_leviathan'};")
R("  if(cls==='escort'&&fac!=='brood')cls='frigate';if(cls==='wraith')cls='interceptor';",
  "  if((cls==='escort'||cls==='carrier')&&fac!=='brood')cls='frigate';if(cls==='wraith')cls='interceptor';")
R("function isEsc(t){return!!t&&t.cls==='escort'}","function isEsc(t){return!!t&&t.cls==='escort'}\nfunction isCar(t){return!!t&&t.cls==='carrier'}")
R("function capName(t){return isEsc(t)?'escort':'frigate'}","function capName(t){return isEsc(t)?'escort':isCar(t)?'carrier':'frigate'}")
R("function capHullMax(t){return isEsc(t)?ESC_HULL:FRIG_HULL*(t.side==='brood'?1.5:1)}",
  "function capHullMax(t){return isEsc(t)?ESC_HULL:isCar(t)?(t.side==='brood'?7000:CAR_HULL):FRIG_HULL*(t.side==='brood'?1.5:1)}")
R("function broodCap(t){return isEsc(t)?'Prowler':'Leviathan'}","function broodCap(t){return isEsc(t)?'Prowler':isCar(t)?'Hive Ship':'Leviathan'}")
R("function facFrigs(f){return S.frigates.filter(x=>x.side===f&&!isEsc(x)&&(!x.owner||x.cmd))}",
  "function facFrigs(f){return S.frigates.filter(x=>x.side===f&&!isEsc(x)&&!isCar(x)&&(!x.owner||x.cmd))}\nfunction facCar(f){return S.frigates.filter(x=>x.side===f&&isCar(x))}")

# ---------- carrier token, wing and assault refills
R("function makeEscort(side,sector,load,owner){",
  r"""function carName(side){return side==='brood'?'Hive Ship':`${pick(CAR_NAMES)} ${['I','II','III','IV','V'][Math.floor(Math.random()*5)]}`}
function makeCarrier(side,sector,load,owner){const t={id:S.nextId++,side,sector,dest:null,cls:'carrier',hull:side==='brood'?7000:CAR_HULL,shield:side==='brood'?0:CAR_SHIELD,load,name:carName(side),hold:0,wing:[],aload:0};if(owner)t.owner=owner;S.frigates.push(t);capRefill(t);if(WORLDS[sector])inW(WORLDS[sector],()=>spawnFrigate(t,true));return t}
// where a capital rearms: its faction's shipyard system (or home); the Brood's at The Bloom
function capBase(t){const f=t.side==='player'?S.player.faction:t.side;return f==='brood'?'bl':S.yards[f]?S.yards[f].sector:FAC_HOME(f)}
function wingPick(f){return wpick(f==='brood'?{interceptor:2,striker:2,bomber:2}:{interceptor:1,striker:2,heavy:1.2,bomber:1.8})}
// fill empty wing bays and assault bays from the faction's stores: the kits ride aboard, so the economy stays exact
function capRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].vault:S.econ.stock[f];if(!st)return;const srcs=t.owner?[st]:[S.econ.fleet[f],st].filter(Boolean);
  if(isCar(t)){t.wing=t.wing||[];let g=0;while(t.wing.length<CAR_WING&&g++<12){const c=wingPick(f),ld=loadout('patrol',1,c);if(!takeFrom(ld,srcs))break;inv.addAll(t.load,ld);t.wing.push(c)}}
  const cap=isCar(t)?(f==='brood'?0:CAR_ASSAULT):isEsc(t)?(f==='brood'?0:1):0;t.aload=t.aload||0;while(t.aload<cap&&takeFrom(ASSAULT_LD,srcs)){inv.addAll(t.load,ASSAULT_LD);t.aload++}}
function capCanRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=S.econ.stock[f];if(!st)return false;const sr=[S.econ.fleet[f],st].filter(Boolean);if((t.aload||0)<1&&haveIn(ASSAULT_LD,sr))return true;return isCar(t)&&(t.wing||[]).length<CAR_WING&&haveIn(loadout('patrol',1,'interceptor'),sr)}
// a wing craft lost in battle: its kit falls as debris
function wingLose(t,s){if(!t.wing||!t.wing.length)return;const c=t.wing.splice(Math.floor(Math.random()*t.wing.length),1)[0],ld=loadout('patrol',1,c),got={};for(const k in ld){const m=Math.min(ld[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}toDebris(s,got)}
function wingPower(t){let p=0;for(const c of t.wing||[])p+=isBmb(c)?1.6:c==='heavy'?1.2:1;return p}
// garrisons: assault loads needed to take a structure (never more than 3, so a full carrier or 3 ships in flight always suffice)
function garrison(R){if(!R||R.kind!=='depot')return 99;if(R.fwd)return 1;const d=devOf(R);return Math.min(3,1+((d.def||0)>=2?1:0)+((d.hangar||0)>=2?1:0))}
// assault loads a side can bring to a system: capitals in it, and carriers standing off next door with it as their target
function capLoads(sid,side){const sd=sideNorm(side);let n=0;for(const t of S.frigates||[]){if(sideNorm(t.side)!==sd||!(t.aload>0))continue;if(t.sector===sid||(isCar(t)&&t.dest===sid&&HOP[t.sector][sid]===1))n+=t.aload}return n}
function useLoads(sid,side,n,R){const sd=sideNorm(side);for(const t of S.frigates||[]){if(n<=0)break;if(sideNorm(t.side)!==sd||!(t.aload>0))continue;if(!(t.sector===sid||(isCar(t)&&t.dest===sid&&HOP[t.sector][sid]===1)))continue;while(n>0&&t.aload>0){t.aload--;n--;const got={};for(const k in ASSAULT_LD){const m=Math.min(ASSAULT_LD[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}inv.addAll(R.fort,got)}}}
function hostileStationAt(sid,side){const Rs=S.stations[sid];return!!(Rs&&(Rs.owner!=='neutral'||side==='brood')&&hostile(side,Rs.owner))}
function makeEscort(side,sector,load,owner){""")
R("const t={id:S.nextId++,side,sector,dest:null,cls:'escort',hull:ESC_HULL,shield:1800,load,name:escName(side),hold:0};if(owner)t.owner=owner;S.frigates.push(t);",
  "const t={id:S.nextId++,side,sector,dest:null,cls:'escort',hull:ESC_HULL,shield:1800,load,name:escName(side),hold:0,aload:0};if(owner)t.owner=owner;S.frigates.push(t);capRefill(t);")

# ---------- builds: carriers instead of frigates; escorts beside a carrier or while a carrier is out of reach
R("mkCap=ev.type==='escbuild'?makeEscort:makeFrigate,capW=ev.type==='escbuild'?'Escort':'Frigate';",
  "mkCap=ev.type==='escbuild'?makeEscort:makeCarrier,capW=ev.type==='escbuild'?'Escort':'Carrier';")
R("const both={...FRIGATE_COST};for(const k in ESCORT_COST)","const both={...CARRIER_COST};for(const k in ESCORT_COST)")
R("&&(facFrigs(f).length>=1||(facEsc(f).length<1&&!haveIn(FRIGATE_COST,[st])))&&(facFrigs(f).length>=cap||haveIn(both,[st])||!haveIn(FRIGATE_COST,[st]))&&haveIn(ESCORT_COST,[st])",
  "&&(facCar(f).length>=1||haveIn(both,[st])||!haveIn(CARRIER_COST,[st]))&&haveIn(ESCORT_COST,[st])")
R("if(S.yards[f]&&!busyF&&(f!=='brood'||T>BAL.brLevT)&&facFrigs(f).length<cap&&haveIn(FRIGATE_COST,[st])&&Math.random()<(war?1:.5)){const force={};takeFrom(FRIGATE_COST,[st]);inv.addAll(force,FRIGATE_COST);",
  "if(S.yards[f]&&!busyF&&(f!=='brood'||T>BAL.brLevT)&&facCar(f).length<1&&haveIn(CARRIER_COST,[st])&&Math.random()<(war?1:.5)){const force={};takeFrom(CARRIER_COST,[st]);inv.addAll(force,CARRIER_COST);")
R("function capNeed(f){if(!S.yards[f])return YARD_COST;if(facFrigs(f).length<(FRIG_CAP[f]||2))return FRIGATE_COST;return null}",
  "function capNeed(f){if(!S.yards[f])return YARD_COST;if(facCar(f).length<1)return CARRIER_COST;return null}")
R("if(S.T>150){craftAbstract(st,'keel',1,8);craftAbstract(st,'picket',1,4)}","if(S.T>150){craftAbstract(st,'keel',1,8)}")

# ---------- capitals no longer hold systems
R("function frigControl(sid){const sides=","function frigControl(sid){return null;const sides=")

# ---------- movement: carriers stand off one system back; go home to rearm when spent
R("  for(const t of S.frigates){if(!fOwn(t)&&(!t.dest||t.dest===t.sector)&&Math.random()<.35)t.dest=frigOrders(t);\n    if(t.live)continue;const nx=frigHop(t);",
  "  for(const t of S.frigates){if(!t.live&&t.sector===capBase(t))capRefill(t);\n    if(!fOwn(t)&&(isCar(t)||isEsc(t))&&t.side!=='brood'&&t.sector!==capBase(t)&&(isCar(t)?(t.wing||[]).length<=1||(t.aload||0)<1:(t.aload||0)<1)&&capCanRefill(t))t.dest=capBase(t);\n    else if(!fOwn(t)&&(!t.dest||t.dest===t.sector)&&Math.random()<.35)t.dest=frigOrders(t);\n    if(t.live)continue;if(isCar(t)&&t.dest&&t.dest!==t.sector&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side)){t.moveT=0;continue}const nx=frigHop(t);")

# ---------- abstract fighting: carriers strike from next door with their wing; breaches are captured by assault loads
R("""  for(const t of S.frigates.slice()){if(t.live||t.hull<=0)continue;const sid=t.sector;let hit=0;
    for(const o of frigatesIn(sid))if(o!==t&&!o.live&&hostile(t.side,o.side))hit+=isEsc(o)?rnd(150,260):rnd(250,420);
    const Rs=S.stations[sid];if(Rs&&(Rs.owner!=='neutral'||t.side==='brood')&&hostile(t.side,Rs.owner)){hit+=Rs.kind==='core'?150:Rs.kind==='hive'?200:90;distressCall(sid,Rs.name,Rs.owner,t.side);
      if(!WORLDS[sid]){const k=isEsc(t)?.7:1;if(Rs.shield>0)Rs.shield=Math.max(0,Rs.shield-700*k);else{Rs.hull-=rnd(320,420)*k;wkAbstractHit(sid,t.side,.3)}if(Rs.hull<=0){if(Rs.kind==='depot'){if(Rs.owner!=='brood'&&t.side!=='brood')captureDepot(sid,t.side);else razeStation(sid,t.side)}else if(Rs.kind==='free')razeStation(sid,'brood');else Rs.hull=1}}}
    if(hit){t.hull-=hit;if(t.hull<=0)killFrigateToken(t,'in battle')}else t.hull=Math.min(capHullMax(t),t.hull+capHullMax(t)*.03)}""",
"""  for(const t of S.frigates.slice()){if(t.live||t.hull<=0)continue;const own=t.sector;let hit=0;
    for(const o of frigatesIn(own))if(o!==t&&!o.live&&hostile(t.side,o.side))hit+=isEsc(o)?rnd(150,260):isCar(o)?wingPower(o)*rnd(40,70):rnd(250,420);
    if(isCar(t)&&hit>0&&Math.random()<.12)wingLose(t,S.sectors[own]);
    // a carrier strikes its target from next door (or where it sits); escorts strike where they are
    const sid=isCar(t)&&t.dest&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side)?t.dest:own;
    const Rs=S.stations[sid];if(Rs&&hostileStationAt(sid,t.side)){if(sid===own)hit+=Rs.kind==='core'?150:Rs.kind==='hive'?200:90;distressCall(sid,Rs.name,Rs.owner,t.side);
      if(!WORLDS[sid]){const k=isEsc(t)?.7:isCar(t)?wingPower(t)/5:1;if(isCar(t)&&Math.random()<.05)wingLose(t,S.sectors[sid]);
        if(Rs.shield>0)Rs.shield=Math.max(0,Rs.shield-700*k);else{Rs.hull-=rnd(320,420)*k;wkAbstractHit(sid,t.side,.3)}
        if(Rs.hull<=0){if(Rs.kind==='depot'){if(Rs.owner!=='brood'&&t.side!=='brood'){const g=garrison(Rs);if(capLoads(sid,t.side)>=g){useLoads(sid,t.side,g,Rs);captureDepot(sid,t.side)}else Rs.hull=1}else razeStation(sid,t.side)}else if(Rs.kind==='free')razeStation(sid,'brood');else Rs.hull=1}}}
    if(hit){t.hull-=hit;if(t.hull<=0)killFrigateToken(t,'in battle')}else t.hull=Math.min(capHullMax(t),t.hull+capHullMax(t)*.03)}""")

# ---------- outposts: a capital with an assault load takes an unguarded hostile outpost after a minute
R("""  for(const t of S.frigates){const own=t.side==='player'?'player':t.side;if(frigControl(t.sector)!==own){t.hold=0;continue}t.hold=(t.hold||0)+1;
    const sc=S.sectors[t.sector],into=own==='player'?S.player.vault:t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].vault:S.econ.stock[own];if(invMass(into)<(own==='player'||t.owner?600:2500))inv.addAll(into,extract(sc,3));
    const oid=OUT_BY_SECTOR[t.sector];if(oid&&t.hold>=6){const o=S.outposts[oid];if(o.owner!==own&&!(own==='player'&&o.owner===S.player.faction)&&!(o.owner==='player'&&own===S.player.faction))capture(o,own)}}}""",
"""  for(const t of S.frigates){const own=t.side==='player'?'player':t.side;if(!(t.aload>0)||frigatesIn(t.sector).some(o=>hostile(t.side,o.side))){t.hold=0;continue}
    const oid=OUT_BY_SECTOR[t.sector],o=oid&&S.outposts[oid];if(!o||!o.owner||!hostile(t.side,o.owner)||(own==='player'&&o.owner===S.player.faction)){t.hold=0;continue}t.hold=(t.hold||0)+1;
    if(t.hold>=6){t.aload--;const got={};for(const k in ASSAULT_LD){const m=Math.min(ASSAULT_LD[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}inv.addAll(o.stock,got);capture(o,own);t.hold=0}}}""")

# ---------- live: no lance on carriers; wing replaces pickets; a breached depot falls to assault loads
R("  const lm=pmul(t,'lance');if(e.lanceCd>0)e.lanceCd-=dt*lm;","  const lm=e.cls==='carrier'?0:pmul(t,'lance');if(e.lanceCd>0)e.lanceCd-=dt*lm;")
R("  e.turrets=(cl==='escort'?","  e.turrets=(cl==='carrier'?[[0,.55,.55],[0,.55,-.45],[.6,0,.2],[-.6,0,.2],[0,-.5,.1],[0,-.5,-.5]]:cl==='escort'?")
R("  faceInstant(e,-e.x,-e.y,-e.z);W.ents.push(e);e.pickets=[];\n",
  "  faceInstant(e,-e.x,-e.y,-e.z);W.ents.push(e);e.pickets=[];\n  if(cl==='carrier'){const wg=t.wing||[];t.wing=[];wg.forEach((c,i)=>{const ld=loadout('patrol',1,c),got={};for(const k in ld){const m=Math.min(ld[k],e.load[k]||0);if(m>0)got[k]=inv.take(e.load,k,m)}const p=makeNPC('picket',side,c,factionTier(fac),got,e.home);p.fac=fac;p.mom=e;p.ai.orb=i/Math.max(1,wg.length)*TAU;const o=rdir();p.x=e.x+o.x*200;p.y=e.y+o.y*200;p.z=e.z+o.z*200;qCopy(p.q,e.q);e.pickets.push(p);W.ents.push(p)})}\n")
R("function despawnFrigate(e){const t=e.tok;if(t){t.hull=e.hull;t.shield=e.shield}",
  "function despawnFrigate(e){const t=e.tok;if(t){t.hull=e.hull;t.shield=e.shield;if(isCar(t))t.wing=(e.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)).map(p=>p.cls)}")
R("if(R.hull<=0&&R.kind==='depot'&&R.owner!=='brood'&&E.lastHitBy&&E.lastHitBy!=='brood'&&frigateAt(R.sid,E.lastHitBy)){captureDepot(R.sid,E.lastHitBy);return}",
  "if(R.hull<=0&&R.kind==='depot'&&R.owner!=='brood'&&E.lastHitBy&&E.lastHitBy!=='brood'){const g=garrison(R);if(capLoads(R.sid,E.lastHitBy)>=g){useLoads(R.sid,E.lastHitBy,g,R);captureDepot(R.sid,E.lastHitBy);return}}")

# ---------- forward depots
R("STN={free:{sMax:3600,","STN={fdepot:{sMax:1200,hMax:2500,tur:2,dmg:11,range:1200},free:{sMax:3600,")
R("function applyDev(R){const d=devOf(R),b=STN[R.kind]||STN.depot,","function applyDev(R){const d=devOf(R),b=(R.fwd?STN.fdepot:STN[R.kind])||STN.depot,")
R("function addStationEnt(R){const k=STN[R.kind],","function addStationEnt(R){const k=R.fwd?STN.fdepot:STN[R.kind],")
R("function devCap(R){return 2+2*devOf(R).life}","function devCap(R){return R.fwd?2:2+2*devOf(R).life}")
R("if(k==='hangar'&&R.kind!=='depot')return null;","if(k==='hangar'&&(R.kind!=='depot'||R.fwd))return null;")
R("function completeBuild(ev,src){const f=ev.att;if(!haveIn(DEPOT_COST,[src])){finishBuild(ev);return}takeFrom(DEPOT_COST,[src]);const Rr=makeStation(ev.sector,f,'depot',ev.site,{...DEPOT_COST});",
  "function completeBuild(ev,src){const f=ev.att,DC=f==='brood'?DEPOT_COST:FWD_COST;if(!haveIn(DC,[src])){finishBuild(ev);return}takeFrom(DC,[src]);const Rr=makeStation(ev.sector,f,'depot',ev.site,{...DC});if(f!=='brood'){Rr.fwd=1;applyDev(Rr)}")
R("if(!haveIn(DEPOT_COST,[st])||!haveIn(CONSTR_LD,srcs))return null;\n  const force={};takeFrom(DEPOT_COST,[st]);inv.addAll(force,DEPOT_COST);",
  "if(!haveIn(FWD_COST,[st])||!haveIn(CONSTR_LD,srcs))return null;\n  const force={};takeFrom(FWD_COST,[st]);inv.addAll(force,FWD_COST);")
R("if(!haveIn(DEPOT_COST,[st])||!haveIn(CL,srcs))return;if(f!=='brood'&&!S.yards[f]&&(st.frame||0)-DEPOT_COST.frame<YARD_COST.frame)return;",
  "const DC=f==='brood'?DEPOT_COST:FWD_COST;if(!haveIn(DC,[st])||!haveIn(CL,srcs))return;if(f!=='brood'&&!S.yards[f]&&(st.frame||0)-DC.frame<YARD_COST.frame)return;")
R("  const sid=wpickArr(c),force={};takeFrom(DEPOT_COST,[st]);inv.addAll(force,DEPOT_COST);","  const sid=wpickArr(c),force={};takeFrom(DC,[st]);inv.addAll(force,DC);")
R("let def=(Rr.kind==='core'?2600:Rr.kind==='free'?2000:1300)","let def=(Rr.kind==='core'?2600:Rr.kind==='free'?2000:Rr.fwd?800:1300)")

# sieges bring assault loads; stations under capital attack stop regenerating
R("if(!here){R.shield=R.sMax;R.hull=Math.min(R.hMax,R.hull+R.hMax*.05)}","if(!here&&!underCapSiege(d.id,R.owner)){R.shield=R.sMax;R.hull=Math.min(R.hMax,R.hull+R.hMax*.05)}")
R("function hostileStationAt(sid,side){","function underCapSiege(sid,owner){return(S.frigates||[]).some(t=>hostile(t.side,owner)&&(t.sector===sid||(isCar(t)&&t.dest===sid&&HOP[t.sector][sid]===1)))}\n// an assault force for a depot siege: enough assault loads for its garrison, carried with the fighters\nfunction siegeLoads(ev,srcs){const R=ev.st&&S.stations[ev.st];if(!R||R.kind!=='depot'||ev.att==='brood'||ev.att==='pirate'||R.owner==='brood')return;const g=garrison(R);ev.aload=0;for(let i=0;i<g;i++){if(!takeFrom(ASSAULT_LD,srcs))break;inv.addAll(ev.force,ASSAULT_LD);ev.aload++}}\nfunction hostileStationAt(sid,side){")
R("const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:pk.out,st:isSt?pk.st:undefined,stName:name,sector,eta:S.T+(f===pf?75:60),force,n:got,tier,cls:clsList,stage:'inbound'};",
  "const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:pk.out,st:isSt?pk.st:undefined,stName:name,sector,eta:S.T+(f===pf?75:60),force,n:got,tier,cls:clsList,stage:'inbound'};if(isSt)siegeLoads(ev,srcs);")
R("const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:m.out,st:isSt?m.st:undefined,stName:isSt?Rr.name:o.name,sector:m.sector,eta:S.T+70,force,n:got,tier,cls,stage:'inbound',camp:m.id};",
  "const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:m.out,st:isSt?m.st:undefined,stName:isSt?Rr.name:o.name,sector:m.sector,eta:S.T+70,force,n:got,tier,cls,stage:'inbound',camp:m.id};if(isSt)siegeLoads(ev,srcs);")

R("if(f==='halcyon'&&BAL.halProsp&&","if(f==='halcyon'&&Math.random()<BAL.halProsp&&")
R("  for(const e of W.ents)if(e.role==='frigate'&&e.tok){e.tok.hull=e.hull;e.tok.shield=e.shield;e.tok.live=false}","  for(const e of W.ents)if(e.role==='frigate'&&e.tok){e.tok.hull=e.hull;e.tok.shield=e.shield;e.tok.live=false;if(isCar(e.tok))e.tok.wing=(e.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)).map(p=>p.cls)}")
# AI expands forward depots into full depots when it can spare a frame
R("    const opts=[];for(const id in S.stations){const R=S.stations[id];if(R.owner!==f)continue;",
  "    if(f!=='neutral'){const fw=Object.values(S.stations).find(R=>R.owner===f&&R.fwd);if(fw&&(st.frame||0)>=1&&Math.random()<.4){takeFrom({frame:1},[st]);inv.add(fw.fort,'frame',1);fw.fwd=0;applyDev(fw);if(friendSide(f)||covered(fw.sid))feed(`${fw.name} has been expanded into a full depot.`,friendSide(f)?'info':'news');continue}}\n    const opts=[];for(const id in S.stations){const R=S.stations[id];if(R.owner!==f)continue;")
# a siege that breaches a depot captures it when enough assault loads are on hand; otherwise it razes as before
R("if(win){if(Rr.kind==='depot'||Rr.kind==='free')razeStation(ev.st,ev.att);",
  "if(win){const g=garrison(Rr),need={};for(const k in ASSAULT_LD)need[k]=ASSAULT_LD[k]*g;if(Rr.kind==='depot'&&ev.att!=='brood'&&ev.att!=='pirate'&&Rr.owner!=='brood'&&haveIn(need,[ev.force])){takeFrom(need,[ev.force]);inv.addAll(Rr.fort,need);captureDepot(ev.st,ev.att)}else if(Rr.kind==='depot'&&ev.att!=='brood'&&Rr.owner!=='brood'&&capLoads(ev.st,ev.att)>=g){useLoads(ev.st,ev.att,g,Rr);captureDepot(ev.st,ev.att)}else if(Rr.kind==='depot'||Rr.kind==='free')razeStation(ev.st,ev.att);")
# ledger: wing kits ride in t.load already; nothing else to count
import re
s2=re.sub(r"brBuild:[0-9.]+,","brBuild:1.05,",s,count=1);s2=re.sub(r"antiBrood:[0-9.]+,","antiBrood:3,",s2,count=1);s2=re.sub(r"brGraze:[0-9.]+,","brGraze:2.6,",s2,count=1);s2=re.sub(r"halProsp:[0-9.]+,","halProsp:.75,",s2,count=1);s2=re.sub(r"halImp:[0-9.]+,","halImp:.08,",s2,count=1)
s2=re.sub(r"ext:\{halcyon:[0-9.]+,varkesh:[0-9.]+,","ext:{halcyon:.8,varkesh:1.18,",s2,count=1);s2=re.sub(r"ostrova:[0-9.]+\}\}","ostrova:1.11}}",s2,count=1);s=s2
open(D+'driftgate_cap.html','w').write(s)
print('ok')
