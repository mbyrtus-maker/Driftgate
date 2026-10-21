# Patch: the Brood rework, stages 1, 2 and 4 of the design (balance and boundaries, truce zones and the Containment
# Accord, fear) plus the six anti-Brood specialist variants. Growth levers are set separately after simulation.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# ---------------------------------------------------------------- stage 1: no snowball, a Brood win is a total loss, Brood and Unbound ignore each other
rep("const lg=loadLegacy(),f=lg.last;if(f&&S.econ.stock[f]){","const lg=loadLegacy(),f=lg.last;if(f&&f!=='brood'&&S.econ.stock[f]){")
rep("they start this one with ${lg.last==='brood'?'40% richer stores':'a finished capital shipyard and 40% richer stores'}",
    "${lg.last==='brood'?'nothing carries over from a Brood win':'they start this one with a finished capital shipyard and 40% richer stores'}")
rep("A new one waits; the Brood begins it hungrier.","No pilot earns a Legend point. A new galaxy waits.")
rep("the galaxy is consumed and the next one starts with a hungrier Brood.","the galaxy is consumed and no pilot earns a Legend point, not even the half point for a lost galaxy.")
rep("lost=!ok&&!!side&&!!sv&&sv!==side?sv:null","lost=!ok&&!!side&&side!=='brood'&&!!sv&&sv!==side?sv:null")
rep("function hostile(a,b){if(!a||!b||a===b)return false;",
    "function hostile(a,b){if(!a||!b||a===b)return false;if((a==='brood'&&b==='pirate')||(a==='pirate'&&b==='brood'))return false;if(!STRAT&&W&&W.truce&&isFacSide(a)&&isFacSide(b))return false;")
rep("else if(f==='brood')w=(o.owner?1.6*bstr(o.owner):2.2)*bw(o.sector);","else if(f==='brood'){if(o.owner==='pirate')continue;w=(o.owner?1.6*bstr(o.owner):2.2)*bw(o.sector)}")
rep("if(f==='pirate')w=id==='wrack'?6:","if(f==='pirate'&&o.owner==='brood')continue;if(f==='pirate')w=id==='wrack'?6:")

# ---------------------------------------------------------------- stage 2: truce zones (live combat only) and the Containment Accord
TRUCE_JS=r"""
// truce zones: every Brood-held system (The Bloom included) and 30 s after its last node burns. Faction ships can't target or hurt
// each other there; only the Brood is a target. STRAT marks the strategic layer, which keeps its own rules.
let STRAT=false;const ACCORD_ON=5,ACCORD_OFF=4;
function isFacSide(x){return x==='player'||FAC_IDS.includes(x)}
function broodHeld(sid){return sectorOwner(sid)==='brood'||(DEF[sid]&&DEF[sid].kind==='hive')}
function truceAt(sid){return broodHeld(sid)||(((S.truceT||{})[sid])||0)>S.T}
"""
rep("// ============================================================ state\nlet S=null,W=null,running=false;","// ============================================================ state\nlet S=null,W=null,running=false;"+TRUCE_JS)
rep("S.timers.tick-=dt;if(S.timers.tick<=0){S.timers.tick=10;strategicTick()}","S.timers.tick-=dt;if(S.timers.tick<=0){S.timers.tick=10;STRAT=true;try{strategicTick()}finally{STRAT=false}}")
rep("if(!NET.cl)updateEvents();","if(!NET.cl){STRAT=true;try{updateEvents()}finally{STRAT=false}}")
rep("W.t+=dt;W.fdt=dt;worksSync();","W.t+=dt;W.fdt=dt;worksSync();{const br=broodHeld(W.sid);if(W.wasBr&&!br){S.truceT=S.truceT||{};S.truceT[W.sid]=S.T+30;feed(`The Bloom is burned out of ${DEF[W.sid].name}. The truce holds 30 seconds more, then the race to claim it begins.`,'news')}W.wasBr=br;W.haze=br;W.truce=truceAt(W.sid)}")
# the Accord: at 5 Brood-held systems all three factions stop fighting each other everywhere, until the Bloom is back below 4
rep("const C=S.coal,pf=S.player.faction;",
    "const C=S.coal,pf=S.player.faction,nb=n.brood||0;\n  if(nb>=ACCORD_ON&&!(C&&C.lead==='brood')){S.coal={lead:'brood',mem:[...FAC_IDS],since:S.T,accord:1};feed(`⚠ The Containment Accord: the Brood holds ${nb} systems. Halcyon, Varkesh and Ostrova stop fighting each other everywhere and turn their fleets on the Bloom until it is pushed back below ${ACCORD_OFF}.`,'bad');return}")
rep("if(C){const m=n[C.lead]||0;if(m<=VIC_NEED-2){","if(C){const m=n[C.lead]||0;if(C.lead==='brood'?m<ACCORD_OFF:m<=VIC_NEED-2){")
rep("else if(!(lead&&lead!==C.lead&&best>=VIC_NEED&&best>m))return}","else if(C.lead==='brood'||!(lead&&lead!==C.lead&&best>=VIC_NEED&&best>m))return}")
# no building in a truce zone
rep("function requestBuild(){if(!W||!W.player)return;","function requestBuild(){if(!W||!W.player)return;if(truceAt(W.sid)){feed('Command: nothing can be built in a truce zone. Burn the Bloom out of this system first.','warn');return}")
# HUD banner
rep("drawDocking(c);blDraw(c);","drawDocking(c);blDraw(c);if(W.truce){c.save();c.textAlign='center';c.font='700 14px \"Saira Semi Condensed\",sans-serif';c.fillStyle='#9be35a';c.fillText('TRUCE ZONE: ONLY THE BROOD IS A TARGET',VW/2,92);c.restore()}")

# ---------------------------------------------------------------- stage 4: fear (haze, spores, blood scent), tuned small
rep(":.09*(e.st.shRegK||1))*dt);",":.09*(e.st.shRegK||1))*dt*(W.haze&&e.side!=='brood'&&!e.st.hazeImm?.85:1));")
rep("(S.sectors[W.sid].storm>S.T?1200:2800)*SPREAD","(S.sectors[W.sid].storm>S.T?1200:2800)*SPREAD*(W.haze?.75:1)")
rep("if(dmg>0){e.hull-=dmg*hf*(1-e.st.dr);",
    "if(dmg>0&&srcSide==='brood'&&e.side!=='brood'){const cap=e.st.sporeCap||3;e.spores=(e.spores||[]).filter(t=>t>W.t);if(e.spores.length<cap)e.spores.push(W.t+4);else{e.spores.sort((x,y)=>x-y);e.spores[0]=W.t+4}}\n  if(dmg>0){e.hull-=dmg*hf*(1-e.st.dr)*vsHullK(e,at,kind);")
rep("if(e.side==='brood'&&W.t-e.lastHit>3&&e.hull<e.st.hull)",
    "if(e.spores&&e.spores.length&&e.side!=='brood'){e.spores=e.spores.filter(t=>t>W.t);if(e.spores.length&&e.hull>1)e.hull=Math.max(1,e.hull-.5*e.spores.length*dt)}\n  if(e.side==='brood'&&W.t-e.lastHit>3&&e.hull<e.st.hull&&!(e.noRegen>W.t))")
rep("function openDock(){dockErr='';","function openDock(){dockErr='';if(W&&W.player)W.player.spores=null;")
rep("*(o.side==='brood'&&e.side!=='brood'?.6:1)","*(o.side==='brood'&&e.side!=='brood'?.6:1)*(e.side==='brood'?bloodScent(o):1)")

# ---------------------------------------------------------------- anti-Brood specialist variants: plate and wire only
rep("  shaped:{slot:'drill',","  shredder:{slot:'weapon',name:'Shredder rounds',spec:'brood',gain:'Kinetic +35% to Brood hulls; a hit stops their regrowth for 10 s',cost:'Kinetic −15% against faction shields',f:{broodK:1.35,regenStop:10,facShK:.85},recipe:{plate:3,wire:3}},\n"
    "  cautery:{slot:'weapon',name:'Cautery lance',spec:'brood',gain:'Lasers +40% to Bloom Nodes and Seeders',cost:'Lasers −20% against other ships',f:{cautery:1},recipe:{plate:3,wire:3}},\n"
    "  incendiary:{slot:'payload',name:'Incendiary warheads',spec:'brood',gain:'Missiles +50% to Bloom Nodes and Seeders',cost:'Missiles −25% against other ships',f:{incend:1},recipe:{plate:3,wire:3}},\n"
    "  sporeseal:{slot:'armor',name:'Spore-sealed plating',spec:'brood',gain:'Latching spores stack to 1, not 3',cost:'−8% hull',m:{hull:.92},f:{sporeCap:1},recipe:{plate:3,wire:3}},\n"
    "  hazetune:{slot:'shield',name:'Haze-tuned emitter',spec:'brood',gain:'Ignores the Bloom haze recharge penalty',cost:'−10% shields everywhere',m:{sCap:.9},f:{hazeImm:1},recipe:{plate:3,wire:3}},\n"
    "  scentbaf:{slot:'engine',name:'Scent baffles',spec:'brood',gain:'Blood scent ignores you above 25% hull',cost:'−8% top speed',m:{maxSpd:.92},f:{scentImm:1},recipe:{plate:3,wire:3}},\n"
    "  shaped:{slot:'drill',")
FEAR_JS=r"""
// Brood blood scent: its wings turn toward the most damaged ship (Scent baffles hide a ship above a quarter hull)
function bloodScent(o){if(!o.st||!o.st.hull)return 1;const f=clamp(o.hull/o.st.hull,0,1);if(o.st.scentImm&&f>.25)return 1;return .35+.65*f}
// anti-Brood rounds: kinetic slugs that bite Brood hulls harder and stop their regrowth, at a cost against faction shields
function atkSt(at){return at&&at.src&&at.src.st||null}
function vsShK(e,at,kind){const A=atkSt(at);return A&&A.broodK&&kind==='kinetic'&&e.side!=='brood'?A.facShK:1}
function vsHullK(e,at,kind){const A=atkSt(at);if(A&&A.broodK&&kind==='kinetic'&&e.side==='brood'){e.noRegen=W.t+A.regenStop;return A.broodK}return 1}
"""
rep("function tunedK(e,kind){",FEAR_JS+"function tunedK(e,kind){")
rep("const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind),","const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind)*vsShK(e,at,kind),")
rep("damageShip(R.hit.ref,dmg,e.side,R,'laser')","damageShip(R.hit.ref,dmg*(e.st.cautery?(R.hit.ref.side==='brood'&&R.hit.ref.role==='builder'?1.4:.8):1),e.side,R,'laser')")
rep("damageStation(R.hit.ref,dmg*1.1,e.side,'laser')","damageStation(R.hit.ref,dmg*1.1*(e.st.cautery&&R.hit.ref.fac==='brood'?1.4:1),e.side,'laser')")
rep("inv:e.isPlayer||e.rp||free?{}:{[kind]:1},","inv:e.isPlayer||e.rp||free?{}:{[kind]:1},incend:!!(e.st&&e.st.incend),")
rep("damageShip(e,m.dmg*mul*","damageShip(e,(m.incend?(e.side==='brood'&&e.role==='builder'?1.5:.75):1)*m.dmg*mul*")
rep("damageStation(m.tgt,m.dmg*(tp?TORP_STATION:1),m.side,m.kind)","damageStation(m.tgt,m.dmg*(tp?TORP_STATION:1)*(m.incend&&m.tgt.fac==='brood'?1.5:1),m.side,m.kind)")
open(P,'w',encoding='utf-8').write(s);print('brood patch applied')
