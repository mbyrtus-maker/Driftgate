//@src 02_state.js
// ============================================================ galaxy
const SECTOR_DEFS=[
  {id:'hp',name:'Halcyon Prime',x:.14,y:.12,home:'halcyon',kind:'core',ores:{fe:5,cu:5}},
  {id:'hr',name:'Tessellate Reach',x:.29,y:.3,home:'halcyon',kind:'frontier',ores:{fe:4,cu:3,ir:3}},
  {id:'vb',name:'Varkesh Hold',x:.86,y:.12,home:'varkesh',kind:'core',ores:{fe:5,cu:5}},
  {id:'vm',name:'Sundered Marches',x:.71,y:.3,home:'varkesh',kind:'frontier',ores:{fe:4,cu:3,ir:3}},
  {id:'os',name:'Ostrova Spire',x:.5,y:.94,home:'ostrova',kind:'core',ores:{fe:5,cu:5}},
  {id:'of',name:'Veil Fringe',x:.5,y:.77,home:'ostrova',kind:'frontier',ores:{fe:4,cu:3,ir:3}},
  {id:'ke',name:'Kestrel Drift',x:.5,y:.19,kind:'contested',ores:{ir:4,xc:3,fe:2,nu:2}},
  {id:'sh',name:'The Shoal',x:.27,y:.6,kind:'contested',ores:{cu:4,xc:3,ir:2,nu:2}},
  {id:'ci',name:'Cinder Reach',x:.73,y:.6,kind:'contested',ores:{fe:4,xc:3,ir:2,nu:2}},
  {id:'ho',name:'Hollow Verge',x:.5,y:.42,kind:'hub',ores:{fe:3,cu:3,ir:3,nu:3}},
  {id:'wr',name:'The Wrack',x:.5,y:.6,kind:'den',ores:{xc:4,ir:3,fe:2}},
  {id:'ae',name:'Ashen Expanse',x:.06,y:.45,kind:'deep',ores:{fe:4,ir:3,xc:2,au:2}},
  {id:'gs',name:'Glass Shallows',x:.94,y:.45,kind:'deep',ores:{cu:4,ir:3,xc:2,au:2}},
  {id:'ld',name:'Lantern Deep',x:.24,y:.87,kind:'deep',ores:{fe:3,cu:3,xc:3,au:2}},
  {id:'bl',name:'The Bloom',x:.5,y:.03,kind:'hive',ores:{fe:3,cu:3,ir:3,xc:2}},
  // quiet space: thin fields, no outposts, little traffic. Longer, emptier routes between the busy systems
  {id:'nv',name:'Northgap Void',x:.32,y:.07,kind:'void',ores:{fe:3,ir:2}},
  {id:'av',name:'Ashwind Void',x:.68,y:.07,kind:'void',ores:{cu:3,ir:2}},
  {id:'pr',name:'Pale Reach',x:.04,y:.25,kind:'void',ores:{fe:3,cu:2}},
  {id:'ih',name:'Iron Hush',x:.96,y:.25,kind:'void',ores:{fe:2,ir:3}},
  {id:'mw',name:'Mirrorwater',x:.37,y:.47,kind:'void',ores:{cu:3,fe:2}},
  {id:'dl',name:'Dusk Lanes',x:.63,y:.47,kind:'void',ores:{fe:3,cu:2}},
  {id:'cw',name:'Coldwater Drift',x:.07,y:.72,kind:'void',ores:{ir:3,cu:2}},
  {id:'ew',name:'Ember Wake',x:.93,y:.72,kind:'void',ores:{fe:3,ir:2}},
  {id:'sv',name:'Silent Verge',x:.69,y:.85,kind:'void',ores:{cu:3,ir:2}},
];
const DEF={};SECTOR_DEFS.forEach(d=>DEF[d.id]=d);
const LINKS=[['hp','hr'],['vb','vm'],['os','of'],['hr','ke'],['vm','ke'],['hr','sh'],['of','sh'],['vm','ci'],['of','ci'],['ke','ho'],['sh','ho'],['ci','ho'],['ho','wr'],['hr','ae'],['sh','ae'],['vm','gs'],['ci','gs'],['of','ld'],['sh','ld'],['ke','bl'],['hp','nv'],['nv','ke'],['vb','av'],['av','ke'],['hp','pr'],['pr','ae'],['vb','ih'],['ih','gs'],['hr','mw'],['mw','ho'],['vm','dl'],['dl','ho'],['ae','cw'],['cw','ld'],['gs','ew'],['ew','sv'],['of','sv'],['ci','sv']];
const NEIGH={};SECTOR_DEFS.forEach(d=>NEIGH[d.id]=[]);LINKS.forEach(([a,b])=>{NEIGH[a].push(b);NEIGH[b].push(a)});
const SPACE=1.8;// systems are wide: gates, fields, beacons, spawn points, the edge and the radars all scale with this
const SPREAD=1.2; // spacing rules that don't scale with SPACE (belt gaps, rock spacing, station works rings) are 20% wider too
const GATES={};SECTOR_DEFS.forEach(d=>{GATES[d.id]=NEIGH[d.id].map(n=>{const e=DEF[n],a=Math.atan2(e.y-d.y,e.x-d.x),h=Math.round(((hashStr(d.id+n)%2400)-1200)*1.25);return{to:n,x:Math.round(Math.cos(a)*2500*SPACE),y:h,z:Math.round(Math.sin(a)*2500*SPACE)}})});
const OUTPOST_DEFS={kestrel:{sector:'ke',name:'Kestrel Forge',type:'forge'},shoal:{sector:'sh',name:'Shoal Forge',type:'forge'},cinder:{sector:'ci',name:'Cinder Forge',type:'forge'},hollow:{sector:'ho',name:'Hollow Relay',type:'relay'},wrack:{sector:'wr',name:'Wrack Salvage Yard',type:'yard'}};
const OUT_BY_SECTOR={};for(const k in OUTPOST_DEFS)OUT_BY_SECTOR[OUTPOST_DEFS[k].sector]=k;
const TYPE_TEXT={forge:'Forge · Lattice and Cores',relay:'Relay · gate tolls and strike-group intel',yard:'Salvage Yard · harvests sector debris'};
function oStats(o){const L=o.level;return{sMax:400+350*L,hMax:900+450*L,dmg:7+3*L,rof:1.6+.3*L,range:950}}
function sideCol(s){return s==='player'?PLAYER_COL:s==='neutral'?NEUTRAL.col:s==='pirate'?PIRATE.col:FACTIONS[s]?FACTIONS[s].col:'#7f8aa3'}
function sideName(s){return s==='player'?'You':s==='neutral'?NEUTRAL.short:s==='pirate'?'The Unbound':FACTIONS[s]?FACTIONS[s].short:'Unclaimed'}

// ============================================================ jamming (the AI Unbound, in every galaxy): a jammer does nothing to a ship with shields up. On an
// unshielded ship it fills the Jam bar (the ship's full hull, at the rate guns would deal damage); stop jamming for 1.5 s and the bar
// drains 10% a second. A full bar disables the ship for a window, then it is hardened against jamming for 60 s. While it is dark,
// pirates within 150 m hook its hold, most valuable cargo first. Jammers never kill.
const JAM={drainD:1.5,drainR:.1,harden:60,hookR:150,hookRate:8};
function jamCap(e){return e.st.hull*(e.st.jamBarK||1)}
function jamFrac(e){return e&&e.jam>0?clamp(e.jam/jamCap(e),0,1):0}
function jamDark(e){return!!e&&(e.jamOff||0)>W.t}
// a Jam bar or a harpoon tether keeps a ship out of the gate field
function gateLocked(e){return!!e&&(e.jam>0||jamDark(e)||!!(e.teth&&e.teth.until>W.t))}
function jamWin(e){const c=e.cls;return c==='freighter'||c==='bulker'?12:c==='courier'||c==='skiff'||c==='prospector'||c==='dredger'?10:5}
function jamHit(e,b){e.lastHit=W.t;e.lastHitBy=b.side;if(e.shield>0){fxSpark(b,'#8fc8ff',3);return}if(jamDark(e)||(e.jamHard||0)>W.t){fxSpark(b,'#b7c6ff',2);return}
  if(!(e.jam>0)){ // the bar appears: a Snap-back emitter answers once a minute, freighters call for help, a pilot is warned
    if(e.st.snapBack&&!((e.snapT||0)>W.t)){e.shield=e.st.sCap*.3;e.snapT=W.t+60;fxSpark(e,'#8fc8ff',8);if(e.isPlayer)flash('Snap-back emitter: shields back to 30%. The jam is broken.',true);return}
    if(e.isPlayer)flash('Jammer on your hull! Get your shields back up or break away.',true);else if(e.npc&&(e.role==='hauler'||e.role==='miner')&&FACTIONS[e.side])distressCall(W.sid,`a ${FACTIONS[e.side].short} ${CLASSES[e.cls].name}`,e.side,b.side)}
  if(b.src&&b.src.isPlayer||e.isPlayer)SFX.jammer();e.jam=(e.jam||0)+b.dmg*((b.src&&b.src.st&&b.src.st.jamK)||1)*(b.src&&b.src.isPlayer&&unbWork('powder')>=1?1.1:1);e.jamT=W.t;fxSpark(b,'#b7c6ff',3);
  if(e.jam>=jamCap(e)){e.jam=0;e.jamOff=W.t+jamWin(e);e.jamHard=e.jamOff+JAM.harden;e.boosting=false;e.thrusting=false;fxSpark(e,'#b7c6ff',12);
    if(e.isPlayer){flash(`Jammed: every system offline for ${jamWin(e)} s. Pirates will hook your hold.`,true);SFX.shieldDown&&SFX.shieldDown()}}}
function jamDrain(e,dt){if(!(e.jam>0)||jamDark(e))return;const d=e.st.jamDelay||JAM.drainD,r=e.st.jamRate||JAM.drainR;if(W.t-(e.jamT||0)>d)e.jam=Math.max(0,e.jam-jamCap(e)*r*dt)}
// a pirate beside a disabled ship hooks its hold (a Sealed hold gives up half)
function jamTake(e,t,dt){const d=d3(e,t);if(d>(t.teth&&t.teth.until>W.t&&t.teth.by===e?400:JAM.hookR)*.8){steer(e,t.x,t.y,t.z,dt,true,1);faceTo(e,t,dt);return}brake(e,dt);faceTo(e,t,dt);
  const cg=t.isPlayer?S.player.cargo:t.rp?((S.pilots||{})[t.rp]||{}).cargo:t.cargo;if(!cg)return;if(t.takeCap==null){t.takeCap=t.st.sealed?Math.floor(invMass(cg)/2):1e9;t.taken=0}
  e.hookAcc=(e.hookAcc||0)+JAM.hookRate*dt;let moved=0;
  while(e.hookAcc>=1&&t.taken<t.takeCap){const ks=Object.keys(cg).filter(k=>cg[k]>0&&mass(k)>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a));const k=ks[0];if(!k)break;const m=mass(k);
    if(invMass(e.cargo)+m>e.st.cargo)break;if(e.hookAcc<m)break;e.hookAcc-=m;inv.take(cg,k,1);inv.add(e.cargo,k,1);t.taken+=m;moved+=m}
  if(moved&&t.isPlayer&&W.t-(W.hookMsg||0)>2){W.hookMsg=W.t;flash('Pirates are hooking your hold!',true)}
  if(invMass(e.cargo)>=e.st.cargo*.9||!Object.keys(cg).some(k=>cg[k]>0)){e.role='leave';e.ai.tgt=null}}
// a pilot being jammed: thrust stutters, guns misfire, then a total blackout
function jamThr(p){const f=jamFrac(p);if(jamDark(p))return 0;if(f>=.75)return Math.random()<.85?0:1;if(f>=.5)return Math.random()<.6?0:1;if(f>=.25)return Math.random()<.2?0:1;return 1}
function jamFx(c){const p=W.player;if(!p)return;const f=jamFrac(p),dark=jamDark(p);if(!f&&!dark)return;c.save();
  const a=dark?.88:f>=.75?(Math.random()<.5?.6:.15):f>=.5?(Math.random()<.15?.7:.08):f>=.25?(Math.random()<.04?.5:.03):.02;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,VW,VH);
  if(f>0&&!dark){c.strokeStyle=`rgba(183,198,255,${.15+.35*f})`;for(let i=0;i<6*f;i++){const y=Math.random()*VH;c.beginPath();c.moveTo(0,y);c.lineTo(VW,y+rnd(-4,4));c.stroke()}}
  c.textAlign='center';c.font='700 15px "Saira Semi Condensed",sans-serif';c.fillStyle='#b7c6ff';
  if(dark)c.fillText(`SYSTEMS OFFLINE · ${Math.max(0,Math.ceil(p.jamOff-W.t))} S`,VW/2,VH/2-40);else{c.fillText(`JAM ${Math.round(f*100)}%`,VW/2,VH-154);c.fillStyle='rgba(183,198,255,.25)';c.fillRect(VW/2-90,VH-148,180,6);c.fillStyle='#b7c6ff';c.fillRect(VW/2-90,VH-148,180*f,6)}
  c.restore()}
function hostile(a,b){if(!a||!b||a===b)return false;if(S&&S.unb&&(a==='player'||b==='player')){const o=a==='player'?b:a;if(o==='pirate'||o==='neutral')return false;if(o==='brood')return true;if(FAC_IDS.includes(o))return!unbCover(o)}if((a==='brood'&&b==='pirate')||(a==='pirate'&&b==='brood'))return false;if(!STRAT&&W&&W.truce&&isFacSide(a)&&isFacSide(b))return false;if(a==='neutral'||b==='neutral'){const o=a==='neutral'?b:a;return o==='pirate'||o==='brood'}const pf=S.player.faction;if((a==='player'&&b===pf)||(b==='player'&&a===pf))return false;
  const C=S.coal;if(C){const A=a==='player'?pf:a,B=b==='player'?pf:b;if(A!==B&&C.mem.includes(A)&&C.mem.includes(B))return false}return true}

// ============================================================ state
let S=null,W=null,running=false;
// truce zones: every Brood-held system (The Bloom included) and 30 s after its last node burns. Faction ships can't target or hurt
// each other there; only the Brood is a target. STRAT marks the strategic layer, which keeps its own rules.
let STRAT=false;const ACCORD_ON=5,ACCORD_OFF=4;
function isFacSide(x){return x==='player'?!(S&&S.unb):FAC_IDS.includes(x)}
function broodHeld(sid){return sectorOwner(sid)==='brood'||(DEF[sid]&&DEF[sid].kind==='hive')}
function truceAt(sid){return broodHeld(sid)||(((S.truceT||{})[sid])||0)>S.T}

// every system with a pilot in it is simulated: WORLDS[sid] -> world. LW is the world this browser's own pilot is in (the one drawn).
let WORLDS={},LW=null,MUTE=false,CTX=null;
const NET={on:false,host:false,cl:false,me:null};
function inW(w,fn){if(!w)return;const o=W;W=w;try{return fn()}finally{W=o}}
function liveIn(sid){const w=WORLDS[sid];return w&&!(w===LW&&w.dead)?w:null}
const SAVE_KEY='driftgate.save.v2';
const FEED=[];
function oreTotal(a){let t=0;for(const k in a.ore)t+=a.ore[k];return t}
function mainOre(a){let b=null,m=0;for(const k in a.ore)if(a.ore[k]>m){m=a.ore[k];b=k}return b}
// pilots' mining lasers: a hold takes minutes to fill, so a miner's hours go into the rock (and the risk around it), not the
// commute. Salvage points on wrecks cut faster: a wreck lasts only five minutes. AI miners are unaffected.
// per hull, tuned so a Light Miner on a good field makes about 12k an hour, a Medium 15.5k and a Heavy 20k (a Heavy Hauler
// on trade runs makes about 21.6k): the bigger the miner, the slower its lasers fill its hold.
const MINE_RATE={skiff:.036,prospector:.0324,dredger:.0257},SALVAGE_RATE=.5;const mineP=cls=>MINE_RATE[cls]||.025,mineRate=(a,cls)=>a&&a.wpt?SALVAGE_RATE:mineP(cls);
function astR(a){return a.wpt?WPT_R:14+Math.sqrt(oreTotal(a))*3.3}
function newAstPos(s){const b=pick(s.belts),d=rdir(1),r=Math.cbrt(Math.random())*(b.r||440);return{x:Math.round(b.x+d.x*r),y:Math.round(b.y+d.y*r),z:Math.round(b.z+d.z*r)}}
// Vantium lies in the three contested forge systems and the hub. Every power is one jump from two fields (each shared with one
// rival) and two jumps from the hub, so no faction's geography gives it the better supply. Tuned by simulation.
const NU_FIELD={ke:650,sh:650,ci:650,ho:900};
function genSector(d){
  const s={id:d.id,debris:{fe:0,cu:0,ir:0,xc:0,au:0,nu:0},ast:[],crates:[],belts:[],storm:0};
  const gates=GATES[d.id];let tries=0;
  const vd=d.kind==='void',nb=vd?ri(1,2):ri(2,4);while(s.belts.length<nb&&tries++<400){const dd=rdir(1),r=rnd(700,2300)*SPACE,x=dd.x*r,y=dd.y*r,z=dd.z*r;
    if(gates.some(g=>hyp(g.x-x,g.y-y,g.z-z)<800*SPREAD))continue;if(s.belts.some(b=>hyp(b.x-x,b.y-y,b.z-z)<1400*SPREAD))continue;s.belts.push({x:Math.round(x),y:Math.round(y),z:Math.round(z),r:Math.round(ri(380,560)*SPREAD)})}
  const mult=d.kind==='core'?1.25:d.kind==='den'?1.1:1;
  for(const b of s.belts){const n=vd?ri(6,10):ri(12,18);for(let i=0;i<n;i++){let p,k=0;do{p=newAstPos({belts:[b]})}while(k++<8&&s.ast.some(a=>d3(a,p)<90*SPREAD));
    const raw=wpick(oresNoNu(d));s.ast.push({id:S.nextId++,...p,ore:{[raw]:Math.round(ri(35,110)*mult)},seed:ri(1,1e9)})}}
  for(let i=0;i<(vd?4:8);i++){let p,k=0;do{p=randPos(450*SPACE,2900*SPACE)}while(k++<10&&(gates.some(g=>d3(g,p)<350*SPREAD)||s.ast.some(a=>d3(a,p)<120*SPREAD)));s.ast.push({id:S.nextId++,...p,ore:{[wpick(oresNoNu(d))]:ri(20,60)},seed:ri(1,1e9)})}
  // Vantium fields are laid down to an exact size so no faction's pocket is richer than another's
  {let left=NU_FIELD[d.id]||0;while(left>0){const m=Math.min(left,ri(55,85));left-=m;s.ast.push({id:S.nextId++,...newAstPos(s),ore:{nu:m},seed:ri(1,1e9)})}}
  return s;
}
function oresNoNu(d){if(!d.ores.nu)return d.ores;const o={...d.ores};delete o.nu;return o}
const STN={fdepot:{sMax:1200,hMax:2500,tur:2,dmg:11,range:1200},free:{sMax:3600,hMax:10000,tur:6,dmg:16,range:1500},core:{sMax:3200,hMax:9000,tur:6,dmg:15,range:1500},depot:{sMax:2000,hMax:4000,tur:4,dmg:12,range:1300},hive:{sMax:4200,hMax:14000,tur:6,dmg:18,range:1600}};
// balance levers, tuned by simulation so each of the four powers (the Brood included) wins about a quarter of galaxies
// (tuned for the 2-hour deadline and the 20-minute hold over 18 rounds of simulated galaxies)
const BAL={carFab:14,carAsk:30,hiveRegrow:240,aiEff:.7,brBuild:1.15,brOff:1.1,brLevT:3300,brN:1,brHive:4,antiBrood:2.8,halProsp:.5,halImp:.08,brGraze:1,coal:.35,devGap:1,ext:{halcyon:.69,varkesh:1.22,ostrova:1.12}};   // ext: each faction's station mining rate
const CAP_SEAL={yard:2,carrier:3,escort:1},sealed=f=>f!=='brood'&&f!=='pirate',withSeal=(C,f,n)=>sealed(f)?{...C,seal:n}:C;
const yardCost=f=>withSeal(YARD_COST,f,CAP_SEAL.yard),escCost=f=>withSeal(ESCORT_COST,f,CAP_SEAL.escort);
const DEPOT_COST={frame:2},YARD_COST={frame:4,keel:4,lattice:4,plate:40},YARD_FEE=5000,YARD_TIME=180,FRIGATE_TIME=150;   // FRIGATE_TIME: a carrier's time in the slip (the 'frigbuild' event name is kept for old saves)
// the Escort: a light capital ship. Smaller and cheaper than a frigate, hurt by ordinary guns and missiles but heavily built; no
// main cannon, instead six anti-fighter batteries and twin torpedo launchers. Holds a system like a frigate, jumps faster.
const ESCORT_COST={keel:1,lattice:2,core:1,wire:10,plate:24,coil:8,missile:2},ESCORT_TIME=90,ESC_CAP={player:2,halcyon:2,varkesh:2,ostrova:3,brood:2},ESC_HULL=3100,ESC_JUMP=1.7,ESC_TORP_CD=12,ESC_TORP_MUL=5;
// capital rework test build: fleet carriers (one per faction, the Brood's is the Hive Ship) and escorts; no frigates.
// Depots are captured by assault ships (carrier 3, escort 1) once breached; they land marines and fly back (some are shot down); constructors build cheap forward depots.
const CAP_TEST=1,CARRIER_COST={keel:6,lattice:4,core:2,wire:12,frame:4,coil:10},CAR_HULL=5000,CAR_SHIELD=2400,CAR_WING=6,CAR_ASSAULT=3,ASSAULT_LD={plate:8,coil:3},FWD_COST={frame:1},CAR_NAMES=['Bastion','Harbinger','Citadel','Aegis','Ascendant','Bulwark','Meridian'];
function isEsc(t){return!!t&&t.cls==='escort'}
function isCar(t){return!!t&&t.cls==='carrier'}
function capName(t){if(t&&t.side==='pirate')return isEsc(t)?'sloop':isCar(t)?'destroyer':'frigate';return isEsc(t)?'escort':isCar(t)?'carrier':'frigate'}
const SLOOP_NAMES=['Saucy Gull','Rum Runner','Widow\'s Grin','Bilge Rat','Cutlass Kate','Black Penny','Scurvy Dog','Gallows Bird'],DEST_NAMES=['The Drowned Crown','Queen of Scrap','Mother of Knives','Old Grog','Salt Saint'];
function capHullMax(t){return isEsc(t)?ESC_HULL:t.side==='brood'?7000:CAR_HULL}
function facEsc(f){return S.frigates.filter(x=>x.side===f&&isEsc(x)&&(!x.owner||x.cmd))}
const ESC_NAMES=['Warden','Aegis','Bulwark','Vigil','Sentinel','Lancer','Ward','Rampart'];
function broodCap(t){return isEsc(t)?'Prowler':isCar(t)?'Hive Ship':'Leviathan'}
function escName(side){S.escSeq=(S.escSeq||0)+1;if(side==='pirate')return SLOOP_NAMES[(S.escSeq-1)%SLOOP_NAMES.length];if(side==='brood')return`Prowler ${['I','II','III','IV','V','VI','VII','VIII','IX'][(S.escSeq-1)%9]}`;return`${ESC_NAMES[S.escSeq%ESC_NAMES.length]} ${['I','II','III','IV','V','VI','VII','VIII','IX'][Math.floor(S.escSeq/ESC_NAMES.length)%9]}`}
function carName(side){if(side==='pirate')return pick(DEST_NAMES);return side==='brood'?'Hive Ship':`${pick(CAR_NAMES)} ${['I','II','III','IV','V'][Math.floor(Math.random()*5)]}`}
function makeCarrier(side,sector,load,owner,full){const t={id:S.nextId++,side,sector,dest:null,cls:'carrier',hull:side==='brood'?7000:CAR_HULL,shield:side==='brood'?0:CAR_SHIELD,load,name:carName(side),hold:0,wing:[],aload:0};if(owner)t.owner=owner;else if(S.legFrig&&(S.legFrig[side]||[]).length){const nm=S.legFrig[side].shift();t.name=`Carrier “${nm}”`;facFeed(side,`${t.name} is named in honour of ${nm}.`,'good')}S.frigates.push(t);if(full)carFullLoad(t);else capRefill(t);if(WORLDS[sector])inW(WORLDS[sector],()=>spawnFrigate(t,true));return t}
// a carrier delivered fully loaded (the developer spawn): three fighters, three bombers and every assault bay filled, kits aboard
function carFullLoad(t){const f=t.side==='player'?S.player.faction:t.side;t.wingInit=1;t.wing=[];const fi=f==='brood'?['interceptor','striker']:['interceptor','striker','heavy'];
  for(let k=0;k<3;k++){const c=fi[k%fi.length];t.wing.push(c);inv.addAll(t.load,carKit(c))}for(let k=0;k<3;k++){t.wing.push('bomber');inv.addAll(t.load,carKit('bomber'))}
  const cap=f==='brood'?0:CAR_ASSAULT;t.aload=0;while(t.aload<cap){inv.addAll(t.load,ASSAULT_LD);t.aload++}}
// where a capital rearms: its faction's shipyard system (or home); the Brood's at The Bloom
function capBase(t){const f=t.side==='player'?S.player.faction:t.side;return f==='brood'?'bl':S.yards[f]?S.yards[f].sector:FAC_HOME(f)}
// a carrier's wing craft are built to a simple deck pattern: plate and coil, no wire (wire is the scarcest component)
function carKit(c){return c==='heavy'||isBmb(c)?{plate:6,coil:2}:c==='striker'?{plate:5,coil:1}:{plate:4,coil:1}}
function wingPick(f){return wpick(f==='brood'?{interceptor:2,striker:2,bomber:2}:{interceptor:1,striker:2,heavy:1.2,bomber:1.8})}
// fill empty wing bays and assault bays from the faction's stores: the kits ride aboard, so the economy stays exact
function capRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].vault:S.econ.stock[f];if(!st)return;const srcs=t.owner?[st]:[S.econ.fleet[f],st].filter(Boolean);
  if(isCar(t)&&(t.owner||!t.wingInit)){t.wingInit=1;t.wing=t.wing||[];let g=0;while(t.wing.length<CAR_WING&&g++<12){const c=wingPick(f),ld=carKit(c);if(!takeFrom(ld,srcs))break;inv.addAll(t.load,ld);t.wing.push(c)}}
  const cap=isCar(t)?(f==='brood'?0:CAR_ASSAULT):isEsc(t)?(f==='brood'?0:1):0;t.aload=t.aload||0;while(t.aload<cap&&takeFrom(ASSAULT_LD,srcs)){inv.addAll(t.load,ASSAULT_LD);t.aload++}}
function capCanRefill(t){const f=t.side==='player'?S.player.faction:t.side,st=S.econ.stock[f];if(!st)return false;const sr=[S.econ.fleet[f],st].filter(Boolean);return(t.aload||0)<1&&haveIn(ASSAULT_LD,sr)}
// ---- carrier fabrication. A carrier builds its own craft: it keeps a store of materials aboard and its deck fabricator
// turns one kit at a time into a fighter or bomber for an empty bay (or an assault ship for an empty assault bay). When the
// store runs low it asks its faction for materials, which are shipped out of the faction's stores and arrive after a trip
// (longer the further the carrier is from the nearest friendly station). If the faction is short too, it posts an Order for
// the materials, so pilots can fill it. The Brood's Hive Ship grows its craft the same way from Brood stores.
function carEnt(t){const w=WORLDS[t.sector];return w&&w.ents.find(e=>e.tok===t&&e.alive)}
function carHave(t){const ev=sortieOf(t),away=ev?ev.craft.length:0;if(t.live){const e=carEnt(t);if(e)return carWingNow(e,WORLDS[t.sector]).length+away}return(t.wing||[]).length+away}
function carWingNow(e,w){return(e.pickets||[]).filter(p=>p.alive&&w&&w.ents.includes(p)).map(p=>p.cls).concat(e.bay||[])}
// a craft lands and waits in the hangar (its kit goes back aboard); launching takes the kit back out
function carStow(M,p){inv.addAll(M.load,p.load||{});p.load={};const i=W.ents.indexOf(p);if(i>=0)W.ents.splice(i,1);p.alive=false;M.pickets=(M.pickets||[]).filter(x=>x!==p);(M.bay=M.bay||[]).push(p.cls);if(W.tgt&&W.tgt.ref===p)W.tgt=null}
function carLaunch(M,cls){const ld=carKit(cls),got={};for(const k in ld){const m=Math.min(ld[k],M.load[k]||0);if(m>0)got[k]=inv.take(M.load,k,m)}
  const p=makeNPC('picket',M.side,cls,factionTier(M.fac),got,M.home);p.fac=M.fac;p.mom=M;p.ai.orb=Math.random()*TAU;p.x=M.x;p.y=M.y-M.st.radius*.3;p.z=M.z;qCopy(p.q,M.q);(M.pickets=M.pickets||[]).push(p);W.ents.push(p);return p}
function carShipping(t){return haulBusy('car:'+t.id)}
function carSay(t,msg){if(!(friendSide(t.side)||covered(t.sector)))return;if(S.T-(t.sayT||-99)<60)return;t.sayT=S.T;feed(msg,friendSide(t.side)?'info':'news')}
function carOrder(t,f,need){if(S.contracts.some(c=>c.car===t.id))return;let item=null,n=0;for(const k in need){if(need[k]>0){item=k;n=need[k];break}}if(!item)return;
  const reward=Math.ceil(baseValue(item)*n*1.8/10)*10;S.contracts.push({id:S.nextId++,fac:f,item,n,reward,until:S.T+600,car:t.id,carName:t.name});
  if(f===S.player.faction)feed(`The carrier ${t.name} needs ${n} ${ITEMS[item].name} to build fighters. Order posted: ${fmt(reward)} cr for delivery to any ${FACTIONS[f].short} dock.`,'info')}
// what the carrier wants on hand: kits for its empty bays plus a little spare
// the carrier always works to fill its store completely: kits for a full wing and a full set of assault ships
function carWant(t){const f=t.side==='player'?S.player.faction:t.side,w={};for(let i=0;i<CAR_WING;i++)inv.addAll(w,carKit('heavy'));if(f!=='brood')for(let i=0;i<CAR_ASSAULT;i++)inv.addAll(w,ASSAULT_LD);return w}
// a faction carrier keeps building while a pilot has it on loan (t.cmd); only a pilot's own carrier is restocked by hand
function carOwned(t){return!!t.owner&&!t.cmd}
function carTick(){for(const t of S.frigates){if(!isCar(t)||carOwned(t)||t.hull<=0)continue;const f=t.side==='player'?S.player.faction:t.side;t.wing=t.wing||[];t.store=t.store||{};
  // the fabricator: finish the craft in hand, then start the next one if there's a free bay and a kit aboard
  if(t.fab&&S.T>=t.fab.until){const fb=t.fab;t.fab=null;if(fb.assault){t.aload=(t.aload||0)+1;inv.addAll(t.load,fb.kit)}else{const e=t.live&&carEnt(t);
      if(e){inW(WORLDS[t.sector],()=>{const p=makeNPC('picket',t.side,fb.cls,1,fb.kit,e.home);p.fac=e.fac;p.mom=e;p.ai.orb=Math.random()*TAU;p.x=e.x;p.y=e.y-e.st.radius*.3;p.z=e.z;qCopy(p.q,e.q);(e.pickets=e.pickets||[]).push(p);W.ents.push(p)});carSay(t,`${t.name} has launched a new ${CLASSES[fb.cls].name} from its deck.`)}
      else{t.wing.push(fb.cls);inv.addAll(t.load,fb.kit)}}}
  if(!t.fab){const free=CAR_WING-carHave(t),freeA=f==='brood'?0:CAR_ASSAULT-(t.aload||0);
    if(free>0){const c=wingPick(f),kit=carKit(c);if(haveIn(kit,[t.store])){takeFrom(kit,[t.store]);t.fab={cls:c,kit,until:S.T+(f==='brood'?BAL.hiveRegrow:BAL.carFab/(fOwn(t)?Math.max(.34,pmul(t,'lance')):1))}}}
    if(!t.fab&&freeA>0&&haveIn(ASSAULT_LD,[t.store])){takeFrom(ASSAULT_LD,[t.store]);t.fab={assault:1,kit:{...ASSAULT_LD},until:S.T+BAL.carFab}}}
  // supply: ask the faction for what the store lacks; it ships what it can spare, and posts an Order for the rest
  if(carShipping(t)||S.T<(t.askT||0))continue;const want=carWant(t),need={};let any=false;for(const k in want){const n=want[k]-(t.store[k]||0);if(n>0){need[k]=n;any=true}}if(!any)continue;t.askT=S.T+BAL.carAsk;
  const depots=Object.values(S.stations).filter(x=>x.owner===f&&isDepotF(x)),home=S.stations[f==='brood'?'bl':FAC_HOME(f)],cands=[...depots.map(x=>({R:x,srcs:[dStore(x)]})),...(home?[{R:home,srcs:[S.econ.fleet[f],S.econ.stock[f]].filter(Boolean)}]:[])].filter(c=>Object.keys(need).some(k=>c.srcs.reduce((a,x)=>a+(x[k]||0),0)>0)).sort((a,b)=>(HOP[a.R.sid][t.sector]||0)-(HOP[b.R.sid][t.sector]||0));
  const src=cands[0],sent={};if(src)for(const k in need){const n=Math.min(need[k],src.srcs.reduce((a,x)=>a+(x[k]||0),0));if(n>0){takeFrom({[k]:n},src.srcs);sent[k]=n;need[k]-=n}}
  if(Object.keys(sent).length){haulSend(f==='brood'?'brood':t.side==='player'?S.player.faction:f,src.R.sid,t.sector,sent,'car:'+t.id,'carrier',t.id);
    carSay(t,`${t.name} has asked for materials to build fighters; ${FACTIONS[f]?FACTIONS[f].short:'its'} supply ships are on the way.`)}
  if(f!=='brood'&&Object.values(need).some(n=>n>0))carOrder(t,f,need)}}
// ---- front-line resupply. A pilot who lands on a friendly carrier's flight deck with materials its store lacks (kits for its
// wing and assault ships) unloads them straight into the store: the carrier can build at once instead of waiting on a slow
// faction shipment. Pay comes from the faction treasury at the faction's market rate, times a front-line bonus: more when the
// carrier is outside friendly space, with hostiles close, or under fire recently, so it only pays out where it's dangerous.
// An open Order for that carrier pays its own rate (for goods you mined or made, never bought ones) if that's higher.
const RESUP_MAX=2.2;
function carNeed(t){const want=carWant(t),need={};t.store=t.store||{};for(const k in want){const n=want[k]-(t.store[k]||0);if(n>0)need[k]=n}return need}
function frontMul(t){const f=t.side==='player'?S.player.faction:t.side;let m=1;if(!territory(f).has(t.sector))m+=.3;const e=t.live&&carEnt(t),w=WORLDS[t.sector];
  if(e&&w){if(w.ents.some(o=>o.type==='ship'&&o.alive&&hostile(f,o.side)&&o.role!=='drone'&&d3(o,e)<5000))m+=.6;if(w.t-(e.lastHit||-99)<90)m+=.4}
  else if(frigatesIn(t.sector).some(o=>hostile(f,o.side)))m+=.6;return Math.min(RESUP_MAX,m)}
function carResupply(t,P,k){P=P||S.player;k=k||pkey();if(!t||!isCar(t)||t.side==='brood')return null;const f=t.side==='player'?S.player.faction:t.side;if(P.faction!==f&&!fMine(t))return null;
  const need=carNeed(t),got={},own={};for(const i in need){const n=Math.min(need[i],P.cargo[i]||0);if(n>0){own[i]=Math.min(n,deliverable(P,i,[P.cargo]));inv.take(P.cargo,i,n);inv.add(t.store,i,n);got[i]=n}}if(!Object.keys(got).length)return null;
  // the base rate is what the goods would sell for here: a friendly station in the carrier's system pays its own local price
  const fm=frontMul(t),mk=S.econ.stock[f]||{},Rs=S.stations[t.sector],rate=i=>price(mk,i)*.94*(Rs&&Rs.owner===f?locF(Rs,i):1);let pay=0;for(const i in got){let v=rate(i)*got[i]*fm;const c=S.contracts.find(c=>c.car===t.id&&c.item===i&&c.n>0);if(c&&own[i]>0){const share=c.reward*Math.min(1,own[i]/c.n);v=Math.max(v,share+rate(i)*(got[i]-own[i])*fm);c.reward=Math.max(0,Math.round(c.reward-share));c.n-=own[i];if(c.n<=0)S.contracts=S.contracts.filter(x=>x!==c)}pay+=v}
  pay=Math.round(pay/10)*10;const paid=payKey(k,f,pay);t.askT=Math.min(t.askT||0,S.T+20);
  const what=Object.keys(got).map(i=>`${got[i]} ${ITEMS[i].name}`).join(', ');keyFeed(k,`📦 Front-line resupply: unloaded ${what} into ${t.name}'s store in ${DEF[t.sector].name}: +${fmt(paid)} cr${fm>1.01?` (front-line ×${fm.toFixed(1)})`:''}. Its deck fabricator can build straight away.`,'good');return{got,paid,fm}}
// a supply run reaches the carrier: the materials go into its store (or back to stores if the carrier is gone)
// a wing craft lost in battle: its kit falls as debris
function wingLose(t,s){if(!t.wing||!t.wing.length)return;const c=t.wing.splice(Math.floor(Math.random()*t.wing.length),1)[0],ld=carKit(c),got={};for(const k in ld){const m=Math.min(ld[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}toDebris(s,got)}
// ---- strike sorties: a pilot-commanded carrier sends craft through a gate to hit a target in the next system. The craft
// fly to the gate and leave; the strike plays out like an AI carrier's stand-off strike (or for real if someone is there),
// then the survivors come back through the gate and rejoin the wing. Their kits ride with the sortie (ev.force).
const SORTIE={transit:15,time:180,back:15};
function sortieOf(t){return(S.events||[]).find(v=>v.type==='sortie'&&v.car===t.id&&v.stage!=='done')}
function crPow(c){return isBmb(c)?1.6:c==='heavy'?1.2:1}
function sortieSide(ev){return sideNorm(ev.side)}
function sortieTgtName(ev){if(ev.tgt==='st'){const Rs=S.stations[ev.to];return Rs?Rs.name:'the station'}const o=(S.frigates||[]).find(x=>'c'+x.id===ev.tgt);return o?o.name:'the target'}
function sortieTgtLive(ev){const sd=sortieSide(ev);if(ev.tgt==='st')return hostileStationAt(ev.to,sd);const o=(S.frigates||[]).find(x=>'c'+x.id===ev.tgt);return!!o&&o.sector===ev.to&&hostile(sd,o.side)}
// order: every flying craft without its own Guard order (and everything in the hangar) heads for the gate
function sortieStart(t,E,to,tgt){if(sortieOf(t)||!NEIGH[t.sector].includes(to))return 0;const gate=W.ents.find(x=>x.type==='gate'&&x.to===to);if(!gate)return 0;
  while((E.bay||[]).length)carLaunch(E,E.bay.shift());
  const go=(E.pickets||[]).filter(p=>p.alive&&W.ents.includes(p)&&p.mis!=='escort');if(!go.length)return 0;
  const ev={id:S.nextId++,type:'sortie',car:t.id,side:t.side,from:t.sector,to,sector:to,tgt,craft:[],force:{},pending:go.length,stage:'gather',until:S.T+120,start:S.T,lost:0,dmg:0};S.events.push(ev);
  for(const p of go){p.mis='sortie';p.sortie=ev.id}return go.length}
// a craft reaches the gate and goes through
function sortieDepart(M,p){const ev=S.events.find(v=>v.id===p.sortie);fxWarp(p,sideCol(p.side));if(!ev||ev.stage!=='gather'){p.mis=null;p.sortie=null;return}
  inv.addAll(ev.force,p.load||{});p.load={};ev.craft.push(p.cls);ev.pending=Math.max(0,ev.pending-1);const i=W.ents.indexOf(p);if(i>=0)W.ents.splice(i,1);p.alive=false;M.pickets=(M.pickets||[]).filter(x=>x!==p);if(W.tgt&&W.tgt.ref===p)W.tgt=null}
function sortieFeed(ev,msg,kind){const t=(S.frigates||[]).find(x=>x.id===ev.car);if(t&&t.owner)feedTo(t.owner,msg,kind);else if(friendSide(ev.side))feed(msg,kind)}
// survivors come home: into the carrier's live world through the gate, into its wing, or (carrier gone) into faction stores
function sortieHome(ev){const t=(S.frigates||[]).find(x=>x.id===ev.car&&isCar(x));ev.stage='done';const n=ev.craft.length;
  if(!t){const f=sortieSide(ev);inv.addAll(S.econ.stock[f]||S.econ.stock.pirate,ev.force);ev.force={};ev.craft=[];return}
  const w=t.live&&WORLDS[t.sector],E=w&&w.ents.find(x=>x.tok===t&&x.alive);
  if(E){inW(w,()=>{const g=t.sector===ev.from?W.ents.find(x=>x.type==='gate'&&x.to===ev.to):null;for(const c of ev.craft){const ld=carKit(c),got={};for(const k in ld){const m=Math.min(ld[k],ev.force[k]||0);if(m>0)got[k]=inv.take(ev.force,k,m)}
      const p=makeNPC('picket',E.side,c,factionTier(E.fac),got,E.home);p.fac=E.fac;p.mom=E;p.ai.orb=Math.random()*TAU;const at=g||E;p.x=at.x*(g?.93:1)+rnd(-60,60);p.y=at.y*(g?.93:1)+rnd(-40,40);p.z=at.z*(g?.93:1)+rnd(-60,60);qCopy(p.q,E.q);if(g)fxWarp(p,sideCol(p.side));(E.pickets=E.pickets||[]).push(p);W.ents.push(p)}
    inv.addAll(E.load,ev.force)})}
  else{for(const c of ev.craft)t.wing.push(c);inv.addAll(t.load,ev.force)}
  ev.force={};ev.craft=[];sortieFeed(ev,`${t.name}'s strike is back: ${n} craft returned${ev.lost?`, ${ev.lost} lost`:''}.`,ev.lost?'warn':'good')}
function sortieTick(){for(const ev of S.events){if(ev.type!=='sortie'||ev.stage==='done')continue;const t=(S.frigates||[]).find(x=>x.id===ev.car);
    if(ev.stage==='gather'){if(!t||!t.live||S.T>ev.until)ev.pending=0;if(ev.pending>0)continue;if(!ev.craft.length){ev.stage='done';continue}ev.stage='out';ev.until=S.T+SORTIE.transit;
      sortieFeed(ev,`${ev.craft.length} craft from ${t?t.name:'the carrier'} are through the gate, striking ${sortieTgtName(ev)} in ${DEF[ev.to].name}.`,'info');continue}
    if(ev.stage==='out'){if(S.T>=ev.until){ev.stage='strike';ev.until=S.T+SORTIE.time;ev.n0=ev.craft.length}continue}
    if(ev.stage==='back'){if(S.T>=ev.until)sortieHome(ev);continue}
    // strike
    const sd=sortieSide(ev),w=WORLDS[ev.to];if(!ev.craft.length){ev.stage='done';sortieFeed(ev,`The strike on ${DEF[ev.to].name} was wiped out.`,'bad');continue}
    if(w){if(!ev.spawned){ev.spawned=1;inW(w,()=>{const g=GATES[ev.to].find(x=>x.to===ev.from)||pick(GATES[ev.to]);const TE=ev.tgt==='st'?W.stationEnt:W.ents.find(x=>x.tok&&'c'+x.tok.id===ev.tgt&&x.alive);
        for(const c of ev.craft){const ld=carKit(c),got={};for(const k in ld){const m=Math.min(ld[k],ev.force[k]||0);if(m>0)got[k]=inv.take(ev.force,k,m)}const e=makeNPC('raider',sd,c,factionTier(sd),got,'ev:'+ev.id);e.fac=sd;e.sortieEv=ev.id;e.x=g.x*.93+rnd(-80,80);e.y=g.y*.93+rnd(-40,40);e.z=g.z*.93+rnd(-80,80);if(TE&&TE.type==='ship')e.ai.tgt=TE;fxWarp(e,sideCol(sd));W.ents.push(e)}})}}
    else{if(ev.spawned)ev.spawned=0;   // the system closed: the craft's kits are back in ev.force; survivors are what's left in ev.craft
      const pw=ev.craft.reduce((a,c)=>a+crPow(c),0),k=pw/5,Rs=S.stations[ev.to],caps=frigatesIn(ev.to).filter(o=>hostile(sd,o.side));
      if(ev.tgt==='st'&&Rs&&hostileStationAt(ev.to,sd)){distressCall(ev.to,Rs.name,Rs.owner,sd);if(Rs.shield>0){const d=Math.min(Rs.shield,700*k);Rs.shield-=d;ev.dmg+=d}else{const d=rnd(320,420)*k;Rs.hull-=d;ev.dmg+=d;wkAbstractHit(ev.to,sd,.3)}
        if(Rs.hull<=0){if(Rs.kind==='depot'){if(Rs.owner!=='brood'&&sd!=='brood'){const g=garrison(Rs);if(capLoads(ev.to,sd)>=g){useLoads(ev.to,sd,g,Rs);captureDepot(ev.to,sd)}else Rs.hull=1}else razeStation(ev.to,sd)}else if(Rs.kind==='free')razeStation(ev.to,'brood');else Rs.hull=1}}
      else if(ev.tgt!=='st'){const o=caps.find(x=>'c'+x.id===ev.tgt);if(o){const d=pw*rnd(40,70);o.hull-=d;ev.dmg+=d;if(o.hull<=0)killFrigateToken(o,`by ${t?t.name+"'s":'a carrier'} strike`)}}
      // the defences answer: station guns, hostile capitals' turrets and the local patrols
      const pl=.008+(Rs&&hostileStationAt(ev.to,sd)?(Rs.kind==='core'?.03:Rs.kind==='hive'?.025:.012):0)+.02*caps.length;
      for(let i=ev.craft.length-1;i>=0;i--)if(Math.random()<pl){const c=ev.craft.splice(i,1)[0],ld=carKit(c),got={};for(const kk in ld){const m=Math.min(ld[kk],ev.force[kk]||0);if(m>0)got[kk]=inv.take(ev.force,kk,m)}toDebris(S.sectors[ev.to],got);ev.lost++}}
    const broken=ev.craft.length*2<=(ev.n0||1);
    if(S.T>=ev.until||!sortieTgtLive(ev)||!t||broken){if(w&&ev.spawned)inW(w,()=>{for(const e of W.ents.slice())if(e.sortieEv===ev.id&&e.alive){fxWarp(e,sideCol(e.side));despawn(e)}});ev.spawned=0;ev.stage='back';ev.until=S.T+SORTIE.back;
      sortieFeed(ev,!sortieTgtLive(ev)?`Strike on ${DEF[ev.to].name}: target down. The craft are heading back.`:broken?`Strike on ${DEF[ev.to].name}: half the craft are lost. The rest are breaking off.`:`Strike on ${DEF[ev.to].name} is over; the craft are heading back.`,broken?'warn':'info')}}}
function wingPower(t){let p=0;for(const c of t.wing||[])p+=isBmb(c)?1.6:c==='heavy'?1.2:1;return p}
// garrisons: assault loads needed to take a structure (never more than 3, so a full carrier or 3 ships in flight always suffice)
function garrison(R){if(!R||R.kind!=='depot')return 99;if(R.fwd)return 1;const d=devOf(R);return Math.min(3,1+((d.def||0)>=2?1:0)+((d.hangar||0)>=2?1:0))}
// assault loads a side can bring to a system: capitals in it, and carriers standing off next door with it as their target
// assault ships aren't spent: they land their marines and fly home. Some are shot down; the survivors are back aboard after ASSAULT.back s
const ASSAULT={depotLoss:.2,outLoss:.1,back:60};
function aAvail(t){if(t.aAway&&t.aAway.length){t.aAway=t.aAway.filter(x=>x>S.T);if(!t.aAway.length)delete t.aAway}return Math.max(0,(t.aload||0)-((t.aAway||[]).length))}
function aSend(t,sid,loss){if(Math.random()<loss){t.aload--;const got={};for(const k in ASSAULT_LD){const m=Math.min(ASSAULT_LD[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}toDebris(S.sectors[sid],got);return 0}(t.aAway=t.aAway||[]).push(S.T+ASSAULT.back);return 1}
function capNear(t,sid){if(t.sector===sid)return true;if(!isCar(t)||HOP[t.sector][sid]!==1)return false;if(t.dest===sid)return true;const ev=sortieOf(t);return!!ev&&ev.to===sid&&ev.stage==='strike'}
function capLoads(sid,side){const sd=sideNorm(side);let n=0;for(const t of S.frigates||[]){if(sideNorm(t.side)!==sd||!(aAvail(t)>0))continue;if(capNear(t,sid))n+=aAvail(t)}return n}
function useLoads(sid,side,n,R){const sd=sideNorm(side);for(const t of S.frigates||[]){if(n<=0)break;if(sideNorm(t.side)!==sd||!(aAvail(t)>0))continue;if(!capNear(t,sid))continue;let sent=0,back=0;while(n>0&&aAvail(t)>0){n--;sent++;back+=aSend(t,sid,ASSAULT.depotLoss)}
    if(friendSide(t.side))feed(`${t.name}: ${sent} assault ship${sent>1?'s':''} landed marines at ${R.name}${sent-back?`; ${sent-back} shot down`:''}${back?`. ${back} on ${back>1?'their':'its'} way back`:''}.`,sent-back?'warn':'good')}}
function underCapSiege(sid,owner){return(S.frigates||[]).some(t=>hostile(t.side,owner)&&capNear(t,sid))}
// an assault force for a depot siege: enough assault loads for its garrison, carried with the fighters
function siegeLoads(ev,srcs){const R=ev.st&&S.stations[ev.st];if(!R||R.kind!=='depot'||ev.att==='brood'||ev.att==='pirate'||R.owner==='brood')return;const g=garrison(R);ev.aload=0;for(let i=0;i<g;i++){if(!takeFrom(ASSAULT_LD,srcs))break;inv.addAll(ev.force,ASSAULT_LD);ev.aload++}}
function hostileStationAt(sid,side){const Rs=S.stations[sid];return!!(Rs&&(Rs.owner!=='neutral'||side==='brood')&&hostile(side,Rs.owner))}
function makeEscort(side,sector,load,owner){const t={id:S.nextId++,side,sector,dest:null,cls:'escort',hull:ESC_HULL,shield:1800,load,name:escName(side),hold:0,aload:0};if(owner)t.owner=owner;S.frigates.push(t);capRefill(t);if(WORLDS[sector])inW(WORLDS[sector],()=>spawnFrigate(t,true));return t}
const HULL_COST={interceptor:{},striker:{plate:10,wire:8,coil:3},heavy:{plate:20,wire:12,coil:6,lattice:1},bomber:{plate:18,wire:10,coil:8,lattice:2},
  skiff:{},prospector:{plate:10,wire:8,coil:2},dredger:{plate:22,wire:14,coil:6,lattice:1},courier:{},freighter:{plate:12,wire:6,coil:2},bulker:{plate:26,wire:12,coil:6,lattice:1},
  scout:{plate:6,wire:10,coil:4},scout2:{plate:8,wire:12,coil:6,lattice:1},constructor:{plate:24,wire:14,coil:6},gunboat:{plate:16,wire:10,coil:5,lattice:1},wraith:{}},HULL_FEE=250,START_HULLS=['interceptor','skiff','courier','scout'];
// starter hulls can be swapped for free at your faction's home station; anything else costs the yard fee
const hullFee=(P,k)=>START_HULLS.includes(k)&&P.docked==='station'&&P.sector===FAC_HOME(P.faction)?0:HULL_FEE;
// hulls beyond the starters are bought with credits (paid to the station's faction), one ship at a time: lose it and you relaunch in
// your role's starter hull and buy another; switch away at a shipyard and it's traded in for half its price.
// The price follows what the frame used to cost in parts. Mk I–V components still cost materials.
// set against income in a 2-hour galaxy (engaged play earns roughly 3-8k cr an hour; a rare-ore run can pay 2-5k in one trip):
// tier-2 hulls take about 20-30 minutes of ordinary play, tier-3 about 45-60, the Heavy Bomber a little more
const HULL_PRICE_SET={striker:2400,prospector:2100,freighter:2100,heavy:4400,bomber:4800,dredger:4600,bulker:4700,scout2:4000,gunboat:5500};
const HULL_PRICE=Object.create(null);function hullPrice(k){if(START_HULLS.includes(k)||k==='wraith')return 0;if(HULL_PRICE_SET[k])return HULL_PRICE_SET[k];if(HULL_PRICE[k]==null){const r=HULL_COST[k]||{};let v=0;for(const i in r)v+=baseValue(i)*r[i];HULL_PRICE[k]=Math.max(500,Math.round((v*1.5+HULL_FEE)/50)*50)}return HULL_PRICE[k]}
function hullsOwned(P){return P.cls?[P.cls]:[]}
const ROLE_START={combat:'interceptor',mining:'skiff',hauling:'courier',scouting:'scout'};
function starterFor(cls){if(S&&S.unb)return'raider';return START_HULLS.includes(cls)?cls:cls==='constructor'?'courier':ROLE_START[roleOf(cls)]||'interceptor'}
const TRADE_IN=.5;
// gunboats come only from orbital docks: a constructed capital shipyard (yours or your faction's) in the system you're docked in
function atDocks(P){const Y=(S.yards||{})[yk()]||(S.yards||{})[P.faction];return!!(Y&&Y.sector===P.sector&&P.docked==='station')}
const DOCKS_ONLY=[];   // the Heavy Bomber is sold at any core shipyard for credits
function droneTopUp(P,store,fac){const cap=(CLASSES[P.cls]&&CLASSES[P.cls].drones)||0;P.bay=P.bay||{};let need=cap-(P.bay.drone||0),got=0;if(need<0){inv.add(store||P.vault,'drone',-need);P.bay.drone=cap;return 0}if(need<=0)return 0;
  for(const h of[store,fac&&S.econ.stock[fac],fac&&S.econ.fleet[fac]]){if(!h||need<=0)continue;const n=inv.take(h,'drone',need);if(n){inv.add(P.bay,'drone',n);need-=n;got+=n}}return got}
// ---- ship bay: up to BAY_MAX stored ships. Upgrades belong to the ship, not the pilot: each stored ship keeps its fitted
// components (Mk I–V), Aurora tunings, freeport refits and drones, and can be upgraded while it sits in the bay.
const BAY_MAX=3;
function baseTiers(){const t={};for(const sl of SLOTS)t[sl.id]=1;return t}
function baseKit(){const o={};for(const sl of SLOTS)inv.addAll(o,sl.base);return o}
function shipRec(P){return{cls:P.cls,tiers:{...P.tiers},tune:JSON.parse(JSON.stringify(P.tune||{})),bay:{...(P.bay||{})},rack:P.rack|0,swarm:P.swarm||0,hullInv:{...(P.hullInv||{})},stored:S.T}}
function shipLoad(P,r){P.cls=r.cls;P.tiers={...baseTiers(),...r.tiers};P.tune=JSON.parse(JSON.stringify(r.tune||{}));P.bay={...(r.bay||{})};P.rack=r.rack|0;P.swarm=r.swarm||0;P.mslT=0;P.swT=0;P.hullInv={...(r.hullInv||{})}}
function shipBare(R){const t=R.tune||{};return SLOTS.every(sl=>(R.tiers[sl.id]||1)<=1&&!(t[sl.id]>0))&&!Object.keys(t.rf||{}).length&&!Object.keys(t.vr||{}).length}
// strip a ship back to Mk I: every part above Mk I and the Aurora tunings go into `into` (refits can't be removed and are lost)
function shipStrip(R,into){for(const sl of SLOTS){const t=R.tiers[sl.id]||1;if(t>1){const a=compInv(sl.id,t),b=compInv(sl.id,1);for(const k in a){const n=a[k]-(b[k]||0);if(n>0)inv.add(into,k,n)}R.tiers[sl.id]=1}
    const l=(R.tune||{})[sl.id]||0;if(l){inv.add(into,'tune',tuneItems(l));R.tune[sl.id]=0}}if(R.tune&&R.tune.rf)R.tune.rf={};if(R.tune&&R.tune.vr){inv.addAll(into,vrInv(R));R.tune.vr={}}}
// a fresh starter frame needs its Mk I components: the station's faction supplies them (with the free hull), your vault if it can't
function issueKit(store,fac){const k=baseKit(),srcs=[fac&&S.econ.stock[fac],fac&&S.econ.fleet[fac],store].filter(Boolean);if(!haveIn(k,srcs))return false;takeFrom(k,srcs);return true}
function shipsCount(P){return(P.ships||[]).length}
function hullOwned(P,k){return START_HULLS.includes(k)}
function stationName(owner,kind,sid){if(owner==='player')return`${DEF[sid].name} Depot`;if(owner==='neutral')return`${DEF[sid].name.split(' ')[0]} Freeport`;const F=FACTIONS[owner];if(kind==='core'||kind==='hive')return F.station;if(DEF[sid].home===owner)return F.depot;return owner==='brood'?`Bloom Node · ${DEF[sid].name}`:`${F.short} Depot · ${DEF[sid].name}`}
function makeStation(sid,owner,kind,pos,fort){const k=STN[kind];return S.stations[sid]={sid,owner,kind,name:stationName(owner,kind,sid),x:pos.x,y:pos.y,z:pos.z,sMax:k.sMax,shield:k.sMax,hMax:k.hMax,hull:k.hMax,fort:fort||{},stock:{},built:S.T}}
function stationSite(sid){const gs=GATES[sid];for(let k=0;k<40;k++){const d=rdir(.5),r=rnd(800,1400),p={x:Math.round(d.x*r),y:Math.round(d.y*r),z:Math.round(d.z*r)};if(gs.some(g=>d3(g,p)<900))continue;if(S.sectors[sid].ast.some(a=>d3(a,p)<astR(a)+200))continue;return p}return{x:900,y:0,z:0}}
function canBuildIn(sid,side){const d=DEF[sid];if(S.stations[sid]||d.kind==='hive')return false;if(side!=='brood'&&FREEPORTS.some(f=>f.sid===sid))return false;if(d.home&&d.home!==side)return false;const oid=OUT_BY_SECTOR[sid];if(oid&&side!=='brood'){const ow=S.outposts[oid].owner;if(ow&&ow!==side&&hostile(side,ow)&&!(side==='player'&&ow===S.player.faction))return false}return true}
function yardHome(f){return f==='brood'?'bl':FAC_HOME(f)}   // the Brood grow their Leviathans at the Bloom
function FAC_HOME(f){return SECTOR_DEFS.find(d=>d.home===f&&d.kind==='core').id}
function newGame(fac,cls,pname){
  S={v:2,nuV:1,T:0,nextId:1,sectors:{},outposts:{},econ:{stock:{},treasury:{},fleet:{}},events:[],contracts:[],gateDown:{},ai:{},timers:{tick:2,event:35,contract:12},tollAcc:0,
    player:{faction:fac,cls,hullInv:{},bay:{drone:CLASSES[cls].drones||0},tiers:{engine:1,power:1,shield:1,weapon:1,armor:1,drill:1,cargo:1,payload:1},cargo:{},vault:{plate:6,wire:6},rack:rackCapC(cls,1),magV:1,swarm:(CLASSES[cls]&&CLASSES[cls].swarm)||0,wpn:'kinetic',credits:1800,sector:FAC_HOME(fac),docked:'station',x:0,y:0,z:0,vx:0,vy:0,vz:0,q:[0,0,0,1],hull:0,shield:0,energy:0,fa:true,kills:0,tune:{}}};
  for(const d of SECTOR_DEFS)S.sectors[d.id]=genSector(d);
  S.seamV=2;   // home systems carry no xenocrystal: it has to be won from contested, deep and den space
  S.stations={};S.scouts=[];S.beacons={};beaconInit();S.frigates=[];S.yards={};for(const d of SECTOR_DEFS)if(d.home)makeStation(d.id,d.home,d.kind==='core'?'core':'depot',{x:0,y:0,z:0},d.kind==='core'?{}:{...DEPOT_COST});makeStation('bl','brood','hive',{x:0,y:0,z:0},{});
  for(const id in OUTPOST_DEFS){const D=OUTPOST_DEFS[id],L=id==='wrack'?3:1;const fort={fe:0,cu:0,ir:0,xc:0,au:0,nu:0};for(let l=1;l<=L;l++)invVec(fortRecipe(l),fort);
    const o={id,sector:D.sector,name:D.name,type:D.type,owner:id==='wrack'?'pirate':null,level:L,fort,stock:{},shield:0,hull:0,breached:0,cap:{side:null,p:0}};const os=oStats(o);o.shield=os.sMax;o.hull=os.hMax;S.outposts[id]=o}
  for(const f of FAC_IDS){S.econ.stock[f]={fe:260,cu:260,ir:90,xc:10,plate:70,wire:70,coil:24,missile:20,torpedo:8,drone:16};S.econ.fleet[f]={plate:30,wire:24,coil:8,missile:6,torpedo:4};S.econ.treasury[f]=250000;S.ai[f]={next:40+rnd(40)}}
  S.econ.stock.pirate={fe:60,cu:30,plate:40,wire:30,coil:8,lattice:2,missile:4,torpedo:2};S.econ.fleet.pirate={};S.econ.treasury.pirate=20000;S.ai.pirate={next:110};
  broodInit();neutralInit();S.drift={fe:0,cu:0,ir:0,xc:0,au:0,nu:0};for(const f of FAC_IDS)S.ai[f].build=rnd(70,160);
  {const lg=loadLegacy(),f=lg.last;if(f&&f!=='brood'&&S.econ.stock[f]){const st=S.econ.stock[f];for(const k in st)st[k]=Math.round(st[k]*1.4);if(FAC_IDS.includes(f))inv.addAll(st,yardCost(f));if(f===fac){S.player.credits+=4000;inv.addAll(S.player.vault,{plate:20,wire:20,coil:8,lattice:2})}S.legacy=f}if(lg.vb)S.vbPend=1}
  if(pname){S.player.name=pname;legendStart(S.player,legPack(pname))}
  const st=shipStats(fac,S.player.cls,S.player.tiers,S.player.tune);S.player.hull=st.hull;S.player.shield=st.sCap;S.player.energy=st.eCap;
  const l=ledger();S.ledger0={tot:l.tot,credits:l.credits};
}

function broodInit(){S.econ.stock.brood={fe:420,cu:300,ir:160,xc:40,plate:50,wire:40,coil:14,missile:10,torpedo:10,frame:2};S.econ.fleet.brood={plate:30,wire:20,coil:8,missile:6,torpedo:6};S.econ.treasury.brood=0;S.ai.brood={next:S.T+150,build:S.T+260}}
// older saves: add the new sectors, station records and the Brood, then shift the conservation baseline by exactly what was added

function mkCapMigrate(){const pl=[S.player,...Object.values(S.pilots||{})].filter((P,i,a)=>P&&a.indexOf(P)===i);let n=0;
  for(const P of pl){const to=P.vault||(P.vault={});for(const R of[P,...(P.ships||[])]){if(!R.tiers)continue;for(const sl of SLOTS){const t=R.tiers[sl.id]||1;if(t<=MK_TOP)continue;
    const a=compInv(sl.id,t),b=compInv(sl.id,MK_TOP);for(const k in a){const d=a[k]-(b[k]||0);if(d>0)inv.add(to,k,d)}R.tiers[sl.id]=MK_TOP;n++}}}
  if(n&&S.player)feed(`Mk IV and V are retired: ${n} system${n>1?'s were':' was'} set to Mk III and the extra parts went into your vault. Build a variant with them in Upgrades.`,'info')}
function migrate(st){S=st;mkCapMigrate();for(const ev of S.events||[])if(ev.type==='wingfly'&&ev.stage!=='done'){const f=sideNorm(ev.side);inv.addAll(S.econ.stock[f]||S.econ.stock.pirate,ev.force||{});ev.force={};ev.stage='done'}if(!S.capV&&S.frigates){S.capV=1;for(const t of S.frigates.slice()){if(isEsc(t)||isCar(t))continue;const h=t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].vault:t.side==='player'?S.player.vault:S.econ.stock[t.side];if(h)inv.addAll(h,t.load);else toDebris(S.sectors[t.sector],t.load);t.load={};S.frigates.splice(S.frigates.indexOf(t),1)}for(const ev of S.events||[])if(ev.type==='frigbuild'&&ev.stage==='building'){const h=S.econ.stock[ev.att]||S.player.vault;inv.addAll(h,ev.force);ev.force={};ev.stage='done'}}for(const P of[S.player,...Object.values(S.pilots||{})])if(P&&P.cls==='constructor')P.cls='courier';fpMigrate();beaconInit();if((S.seamV||0)<2&&S.sectors){S.seamV=2;seamClear()}for(const P of[S.player,...Object.values(S.pilots||{})])if(P&&P.tiers&&!P.tiers.payload)P.tiers.payload=1;magInit(S.player);for(const k in S.pilots||{})magInit(S.pilots[k]);S.frigates=S.frigates||[];for(const t of S.frigates)t.live=false;S.yards=S.yards||{brood:{sector:'bl'}};S.player.hullInv=S.player.hullInv||{};S.player.bay=S.player.bay||{};S.scouts=S.scouts||[];for(const t of S.scouts)t.live=false;for(const e of RAWS)if(S.ledger0.tot[e]===undefined)S.ledger0.tot[e]=0;for(const id in S.sectors){if(S.sectors[id].debris.au===undefined)S.sectors[id].debris.au=0}for(const id in S.outposts){if(S.outposts[id].fort.au===undefined)S.outposts[id].fort.au=0}S.player.tune=S.player.tune||{};for(const id in S.sectors){const sc=S.sectors[id];if(sc.debris.nu===undefined)sc.debris.nu=0}for(const id in S.outposts){const o=S.outposts[id];if(o.fort.nu===undefined)o.fort.nu=0}if(S.drift&&S.drift.nu===undefined)S.drift.nu=0;const L0=ledger();let ch=false;
  for(const d of SECTOR_DEFS)if(!S.sectors[d.id]){S.sectors[d.id]=genSector(d);ch=true}
  if(!S.stations){S.stations={};for(const d of SECTOR_DEFS)if(d.home)makeStation(d.id,d.home,d.kind==='core'?'core':'depot',{x:0,y:0,z:0},d.kind==='core'?{}:{...DEPOT_COST});ch=true}
  if(!S.stations.bl){makeStation('bl','brood','hive',{x:0,y:0,z:0},{});ch=true}
  if(!S.econ.stock.brood){broodInit();ch=true}
  if(!S.econ.stock.neutral){neutralInit();S.ledger0.credits+=S.econ.treasury.neutral||0;ch=true}if(!S.drift)S.drift={fe:0,cu:0,ir:0,xc:0,au:0,nu:0};
  for(const e of RAWS)if(S.ledger0.tot[e]===undefined)S.ledger0.tot[e]=0;
  for(const id in S.sectors){const sc=S.sectors[id];if(sc.debris.au===undefined)sc.debris.au=0}for(const id in S.outposts){const o=S.outposts[id];if(o.fort.au===undefined)o.fort.au=0}
  if(!S.richer){S.richer=1;for(const d of SECTOR_DEFS){if(d.kind==='hive')continue;const sc=S.sectors[d.id];for(let i=0;i<10;i++){const k=wpick(d.ores);sc.ast.push({id:S.nextId++,...newAstPos(sc),ore:{[k==='au'||k==='nu'?'ir':k]:ri(40,100)},seed:ri(1,1e9)})}}ch=true}
  for(const id of DEEP){const sc=S.sectors[id];if(!sc.ast.some(a=>a.ore.au)){for(let i=0;i<8;i++)sc.ast.push({id:S.nextId++,...newAstPos(sc),ore:{au:ri(40,100)},seed:ri(1,1e9)});ch=true}}
  for(const id of NU_SECT){const sc=S.sectors[id];if(!sc.ast.some(a=>a.ore.nu)){{let left=NU_FIELD[id]||0;while(left>0){const m=Math.min(left,ri(55,85));left-=m;sc.ast.push({id:S.nextId++,...newAstPos(sc),ore:{nu:m},seed:ri(1,1e9)})}}ch=true}}
  for(const f of FAC_IDS)if(S.ai[f].build===undefined)S.ai[f].build=S.T+rnd(60,150);
  if(ch){const L1=ledger();if(!S.ledger0.tot.au)S.ledger0.tot.au=0;for(const e of RAWS)S.ledger0.tot[e]+=L1.tot[e]-L0.tot[e];feed('New space charted: deep sectors, constructors, and something growing in The Bloom.','warn')}
  if(!S.nuV){S.nuV=1;S.ledger0.tot.nu=ledger().tot.nu;if(ch)feed('Survey: Vantium, a dense green-veined ore, has been charted in Kestrel Drift, The Shoal, Cinder Reach and Hollow Verge. Capital Keels now need it.','info')}}