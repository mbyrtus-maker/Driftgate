# Patch: Unbound stage 1, "jamming arrives" in faction galaxies. The AI Unbound fly their own three hulls (Raider, Corsair,
# Plunderer), jam ships whose shields are down instead of killing them, and hook cargo from the disabled ship. Faction pilots
# feel a jam in stages up to a full blackout. Pirate capitals get their own names. Plus four anti-jam specialist variants.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

HULLS_JS=r"""
// the Unbound fly three hulls of their own, built off the fighter frames (their models too). Big holds, no swarm pods.
{const B=(k,o)=>Object.assign({},CLASSES[k],{swarm:0,radar:false},o);
  CLASSES.raider=B('interceptor',{name:'Raider',hull:85,shield:.85,speed:1.25,turn:2.95,cargo:40,acc:(CLASSES.interceptor.acc||1)*.85,agile:(CLASSES.interceptor.agile||1)*.85,radar:true,jamK:1,desc:'Unbound light hull: the crew\'s eyes. Scout radar, 40 t hold.'});
  CLASSES.corsair=B('striker',{name:'Corsair',hull:120,shield:1,speed:1.1,turn:2.5,cargo:70,acc:(CLASSES.striker.acc||1)*.85,agile:(CLASSES.striker.agile||1)*.85,jamK:1.3,desc:'Unbound medium hull: the muscle, with the best jammers. 70 t hold.'});
  CLASSES.plunderer=B('heavy',{name:'Plunderer',hull:180,shield:1.25,speed:.86,turn:1.55,cargo:110,acc:(CLASSES.heavy.acc||1)*.8,agile:(CLASSES.heavy.agile||1)*.8,jamK:1,desc:'Unbound heavy hull: the cargo hold. 110 t.'})}
const UNB_CLS={interceptor:'raider',striker:'corsair',heavy:'plunderer',bomber:'corsair',gunboat:'plunderer'};
"""
rep("s:4,desc:'180 t hold, 4 guard drones, 4% market fee. A fortress that crawls.'},\n};\n","s:4,desc:'180 t hold, 4 guard drones, 4% market fee. A fortress that crawls.'},\n};\n"+HULLS_JS)
rep("hulls:{gunboat:'Raker',interceptor:'Dart',","hulls:{raider:'Raider',corsair:'Corsair',plunderer:'Plunderer',gunboat:'Raker',interceptor:'Dart',")
rep("function shipMesh(fac,cls){","function shipMesh(fac,cls){if(cls==='raider')cls='interceptor';else if(cls==='corsair')cls='striker';else if(cls==='plunderer')cls='heavy';")
rep("function makeNPC(role,side,cls,tier,load,home){","function makeNPC(role,side,cls,tier,load,home){if(side==='pirate'&&UNB_CLS[cls])cls=UNB_CLS[cls];")

JAM_JS=r"""
// ============================================================ jamming (the AI Unbound, in every galaxy): a jammer does nothing to a ship with shields up. On an
// unshielded ship it fills the Jam bar (the ship's full hull, at the rate guns would deal damage); stop jamming for 1.5 s and the bar
// drains 10% a second. A full bar disables the ship for a window, then it is hardened against jamming for 60 s. While it is dark,
// pirates within 150 m hook its hold, most valuable cargo first. Jammers never kill.
const JAM={drainD:1.5,drainR:.1,harden:60,hookR:150,hookRate:8};
function jamCap(e){return e.st.hull*(e.st.jamBarK||1)}
function jamFrac(e){return e&&e.jam>0?clamp(e.jam/jamCap(e),0,1):0}
function jamDark(e){return!!e&&(e.jamOff||0)>W.t}
function jamWin(e){const c=e.cls;return c==='freighter'||c==='bulker'?12:c==='courier'||c==='skiff'||c==='prospector'||c==='dredger'?10:5}
function jamHit(e,b){e.lastHit=W.t;e.lastHitBy=b.side;if(e.shield>0){fxSpark(b,'#8fc8ff',3);return}if(jamDark(e)||(e.jamHard||0)>W.t){fxSpark(b,'#b7c6ff',2);return}
  if(!(e.jam>0)){ // the bar appears: a Snap-back emitter answers once a minute, freighters call for help, a pilot is warned
    if(e.st.snapBack&&!((e.snapT||0)>W.t)){e.shield=e.st.sCap*.3;e.snapT=W.t+60;fxSpark(e,'#8fc8ff',8);if(e.isPlayer)flash('Snap-back emitter: shields back to 30%. The jam is broken.',true);return}
    if(e.isPlayer)flash('Jammer on your hull! Get your shields back up or break away.',true);else if(e.npc&&(e.role==='hauler'||e.role==='miner')&&FACTIONS[e.side])distressCall(W.sid,`a ${FACTIONS[e.side].short} ${CLASSES[e.cls].name}`,e.side,b.side)}
  e.jam=(e.jam||0)+b.dmg*((b.src&&b.src.st&&b.src.st.jamK)||1);e.jamT=W.t;fxSpark(b,'#b7c6ff',3);
  if(e.jam>=jamCap(e)){e.jam=0;e.jamOff=W.t+jamWin(e);e.jamHard=e.jamOff+JAM.harden;e.boosting=false;e.thrusting=false;fxSpark(e,'#b7c6ff',12);
    if(e.isPlayer){flash(`Jammed: every system offline for ${jamWin(e)} s. Pirates will hook your hold.`,true);SFX.shieldDown&&SFX.shieldDown()}}}
function jamDrain(e,dt){if(!(e.jam>0)||jamDark(e))return;const d=e.st.jamDelay||JAM.drainD,r=e.st.jamRate||JAM.drainR;if(W.t-(e.jamT||0)>d)e.jam=Math.max(0,e.jam-jamCap(e)*r*dt)}
// a pirate beside a disabled ship hooks its hold (a Sealed hold gives up half)
function jamTake(e,t,dt){const d=d3(e,t);if(d>JAM.hookR*.8){steer(e,t.x,t.y,t.z,dt,true,1);faceTo(e,t,dt);return}brake(e,dt);faceTo(e,t,dt);
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
"""
rep("function hostile(a,b){",JAM_JS+"function hostile(a,b){")

# guns: jammer rounds in jam mode, misfires while being jammed, nothing at all while dark
rep("function fire(e){\n  if(e.train)return;","function fire(e){\n  if(e.train)return;if(jamDark(e))return;if(e.isPlayer&&jamFrac(e)>=.25&&Math.random()<(jamFrac(e)>=.5?.33:.1))return;")
rep("ttl:SHOT_TTL*(e.st.shotTtl||1),","ttl:SHOT_TTL*(e.st.shotTtl||1),jam:!!e.jamMode,")
rep("function fireLaser(e){if(e.cool>0||","function fireLaser(e){if(jamDark(e))return;if(e.cool>0||")
rep("if(segHit(ox,oy,oz,b.x,b.y,b.z,e,e.st.radius*1.15+5)){damageShip(e,b.dmg,b.side,b,b.cap?'capital':'kinetic');",
    "if(segHit(ox,oy,oz,b.x,b.y,b.z,e,e.st.radius*1.15+5)){if(b.jam)jamHit(e,b);else damageShip(e,b.dmg,b.side,b,b.cap?'capital':'kinetic');")
# AI Unbound: jam an unshielded mark rather than kill it, then hook its hold while it is dark
rep("function fight(e,t,dt){\n  const ai=e.ai;if(ai.lt!==t){ai.lt=t;ai.lead=rnd(.6,1.25)}",
    "function fight(e,t,dt){\n  const ai=e.ai;if(ai.lt!==t){ai.lt=t;ai.lead=rnd(.6,1.25)}\n  if(e.side==='pirate'&&e.npc&&t.type==='ship'){if(jamDark(t)){e.jamMode=false;jamTake(e,t,dt);return}e.jamMode=t.role!=='frigate'&&!t.drone&&t.role!=='drone'&&t.shield<=t.st.sCap*.02&&!((t.jamHard||0)>W.t);if(e.jamMode)e.wpn='kinetic'}")
# a disabled ship drifts; the bar drains
rep("function npcThink(e,dt){\n  const ai=e.ai,s=S.sectors[W.sid];ai.t-=dt;e.life+=dt;e.mining=null;e.thrusting=false;",
    "function npcThink(e,dt){\n  const ai=e.ai,s=S.sectors[W.sid];ai.t-=dt;e.life+=dt;e.mining=null;e.thrusting=false;if(jamDark(e)){e.boosting=false;return}")
rep("if(e.spores&&e.spores.length&&e.side!=='brood')","jamDrain(e,dt);if(e.spores&&e.spores.length&&e.side!=='brood')")
rep("const p=W.player,P=S.player,st=p.st;pbuildTick(dt);if(P.docked||W.dead)return;","const p=W.player,P=S.player,st=p.st;pbuildTick(dt);if(P.docked||W.dead)return;if(jamDark(p)){p.boosting=false;p.thrusting=false;return}")
rep("boost=bHeld&&!p.stealth&&!p.bLock&&","boost=bHeld&&!p.stealth&&!p.bLock&&jamFrac(p)<.5&&")
rep("const thr=st.thrust*(boost?2.3*bm:1)*H.thr;","const thr=st.thrust*(boost?2.3*bm:1)*H.thr*jamThr(p);")
rep("  drawDocking(c);blDraw(c);","  drawDocking(c);jamFx(c);blDraw(c);")
rep("function drawRadar(){\n  const c=rctx,p=W.player,R=3600*SPACE,sc=150/R;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,340,300);",
    "function drawRadar(){\n  const c=rctx,p=W.player,R=3600*SPACE,sc=150/R;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,340,300);if(p&&jamDark(p))return;")

# pirate capitals: Corsair Sloops and Destroyers, named from their own rotation
rep("function capName(t){return isEsc(t)?'escort':isCar(t)?'carrier':'frigate'}","function capName(t){if(t&&t.side==='pirate')return isEsc(t)?'sloop':isCar(t)?'destroyer':'frigate';return isEsc(t)?'escort':isCar(t)?'carrier':'frigate'}\nconst SLOOP_NAMES=['Saucy Gull','Rum Runner','Widow\\'s Grin','Bilge Rat','Cutlass Kate','Black Penny','Scurvy Dog','Gallows Bird'],DEST_NAMES=['The Drowned Crown','Queen of Scrap','Mother of Knives','Old Grog','Salt Saint'];")
rep("function escName(side){S.escSeq=(S.escSeq||0)+1;","function escName(side){S.escSeq=(S.escSeq||0)+1;if(side==='pirate')return SLOOP_NAMES[(S.escSeq-1)%SLOOP_NAMES.length];")
rep("function carName(side){return side==='brood'?'Hive Ship':","function carName(side){if(side==='pirate')return pick(DEST_NAMES);return side==='brood'?'Hive Ship':")

# anti-jam specialist variants: plate and wire only
rep("  shredder:{slot:'weapon',","  faraday:{slot:'armor',name:'Faraday plating',spec:'jam',gain:'Jam bar 50% larger, so a take lasts longer',cost:'−10% hull',m:{hull:.9},f:{jamBarK:1.5},recipe:{plate:3,wire:3}},\n"
    "  fastboot:{slot:'power',name:'Fast-reboot reactor',spec:'jam',gain:'Jam bar drains after 0.75 s at 25% a second',cost:'−15% energy capacity',m:{eCap:.85},f:{jamDelay:.75,jamRate:.25},recipe:{plate:3,wire:3}},\n"
    "  snapback:{slot:'shield',name:'Snap-back emitter',spec:'jam',gain:'When a Jam bar first appears, shields jump back to 30% (once a minute)',cost:'−20% shield capacity',m:{sCap:.8},f:{snapBack:1},recipe:{plate:3,wire:3}},\n"
    "  sealed:{slot:'cargo',name:'Sealed hold',spec:'jam',gain:'A hooked hold gives up half its contents, not all',cost:'−15% hold',m:{cargo:.85},f:{sealed:1},recipe:{plate:3,wire:3}},\n"
    "  shredder:{slot:'weapon',")
open(P,'w',encoding='utf-8').write(s);print('unbound jamming patch applied')
