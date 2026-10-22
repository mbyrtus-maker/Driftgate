//@src 09_input.js
// ============================================================ input
const keys={},mouse={x:0,y:0,l:false,r:false,aim:false,in:false},touch={on:false,ox:0,oy:0,dx:0,dy:0,id:null,fire:false,mine:false,boost:false,thrust:false};
let coarse=matchMedia('(pointer:coarse)').matches,touchLast=coarse;
// prompts and the steering ring follow the input you used last: keys or the mouse mean keyboard wording, a tap means touch
function touchUI(){return touchLast&&!touchOff}
function actKey(){return touchUI()?'Act':'E'}
addEventListener('pointermove',e=>{if(e.pointerType==='mouse')touchLast=false},{passive:true});
addEventListener('keydown',e=>{touchLast=false;if(e.code==='F11'){e.preventDefault();toggleFull();return}
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'))return;
  const c=e.code;if(running)auInit();
  if(c==='KeyD'&&e.ctrlKey&&e.altKey&&running){e.preventDefault();devToggle();devCredits();return}
  if(c==='Enter'&&running&&NET.on&&!S.player.docked){e.preventDefault();openChat();return}
  if(c==='KeyN'&&running&&!keys[c]){keys[c]=true;auToggle();return}
  if(c==='Backquote'&&running&&!keys[c]){keys[c]=true;toggleTouch();return}
  if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(c)&&running)e.preventDefault();
  if(keys[c])return;keys[c]=true;
  if(!running)return;
  if(c==='Escape'){if(!$('sndPop').hidden){sndPanel(false);return}if(commsOpen()){closeComms();return}if(W&&W.bridge&&W.bridge.panel){closeConsole();return}closeSheets();return}
  if(c==='KeyM'){toggleMap();return}
  if(c==='KeyH'||c==='Slash'){toggleSheet('help');return}
  if(!$('map').hidden||!$('help').hidden)return;
  if(W&&W.gunseat){if(c==='KeyE'){leaveSeat();return}if(c==='KeyC'){if(NET.cl)netSend({t:'gmsl'});else W.gunseat.msl=1;return}}
  if(W&&W.bridge&&W.bridge.panel){const i=['Digit1','Digit2','Digit3','Digit4','Digit5'].indexOf(c);if(i>=0){W.bridge.panel=FC_TABS[i][0];renderConsole(true);return}}
  if(W&&W.bridge&&!W.bridge.panel&&(c==='KeyT'||c==='KeyQ')){bridgeTarget(c==='KeyQ');return}
  if(c==='KeyE'){if(W&&W.bridge){if(W.bridge.panel){closeConsole();return}if(W.bridge.seat){standChair();return}const n=bridgeNear();if(n){if(n.id==='hatch')exitBridge();else if(n.id==='cmd'){const tk=W.bridge.f.tok;if(fGuest(tk)){openConsole('strat');flash('Take command first to use the command chair.',true)}else if(NET.on&&tk.owner&&!crewCan(tk,curPid(),'helm')){flash('The command chair goes with the Helm station.',true)}else sitChair()}else openConsole(n.id)}return}if(S.player.docked)undock();else if(W&&W.player&&W.player.landed)liftOff();else if(S.unb&&hookTarget()){if(NET.cl){const T=hookTarget();MP.hookOn=1;netSend({t:'hook',on:1,id:netTid(T)})}return}else if(S.unb&&lairNear()){lairDock(lairNear());return}else tryDock();return}
  if(c==='KeyP'&&!(W&&W.bridge&&W.bridge.panel)){planKey(e.shiftKey);return}
  if(S.player.docked)return;
  if(c==='KeyT')targetNearest('hostile');
  if(commsOpen()&&(c==='Digit1'||c==='Digit2'||c==='Digit3'||c==='Digit4')){commsPick(String(+c.slice(5)-1));return}
  if(c==='KeyI'){cycleFriendly();return}
  if(c==='KeyQ')cycleHostile();
  if(c==='KeyG')targetAhead();
  if(c==='KeyC')fireMissile();
  if(c==='Digit3'){if(blHull(S.player.cls))blKeyPress('det');else fireSwarm()}
  if(c==='Digit4'&&blHull(S.player.cls))blKeyPress('cancel');else if(c==='Digit4'&&S.unb)jamToggle();
  if(c==='KeyB')playerFlares();
  if(c==='Digit1')setWeapon('kinetic');
  if(c==='Digit2')setWeapon('laser');
  if(c==='KeyR')targetNearest('ast');
  if(c==='Tab')cycleTarget();
  if(c==='KeyV')toggleCam();
  if(c==='KeyJ'){toggleAutopilot();return}
  if(c==='KeyK'&&S.unb){xpdrToggle();return}
  if(c==='KeyK'&&S.player.cls==='wraith'){stealthOn();return}
  if(c==='KeyK'){flash('Constructors fly for faction command now: open comms (I) and choose 3 to call one in here.');return}
  if(c==='KeyU'&&!(W&&W.bridge)){if(NET.cl)netSend({t:'order',k:'help'});else pilotDistress();return}
  if(c==='KeyO'){const ops=friendlyOps();if(!ops.length){flash('No friendly operations right now. Strikes and threats appear in the Ops list and on the map.');return}joinOp(ops[0]);return}
  if(c==='KeyY'){assistTarget();return}
  if(c==='KeyL'){S.player.level=S.player.level===false;flash(S.player.level===false?'Auto-level off: full six-axis freedom.':'Auto-level on: the ship rolls back level with the sector plane.');return}
  if(c==='KeyX'){S.player.fa=!S.player.fa;feed(`Flight assist ${S.player.fa?'on':'off'}.`)}
});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE'&&NET.cl&&MP.hookOn){MP.hookOn=0;netSend({t:'hook',on:0})}});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=mouse.r=false});
const glc=$('gl');
glc.addEventListener('mousemove',e=>{if(lookLocked()&&!(W&&(W.bridge||W.gunseat))){freeLook();return}if(lookLocked()&&W){const k=.0024;if(W.bridge&&!W.bridge.panel){W.bridge.yaw-=e.movementX*k;W.bridge.pitch=clamp(W.bridge.pitch-e.movementY*k,-1.2,1.2);return}if(W.gunseat){W.gunseat.yaw=wrapA(W.gunseat.yaw-e.movementX*k);W.gunseat.pitch=clamp(W.gunseat.pitch-e.movementY*k,GT_MINP,GT_MAXP);return}}mouse.x=e.clientX;mouse.y=e.clientY;mouse.aim=true;mouse.in=true});
glc.addEventListener('mouseleave',()=>{mouse.in=false});
glc.addEventListener('mousedown',e=>{if(W&&((W.bridge&&!W.bridge.panel)||W.gunseat)&&!lookLocked()&&glc.requestPointerLock){try{glc.requestPointerLock()}catch(er){}if(W.bridge&&!W.bridge.seat)return}if(lookLocked()&&W&&(W.bridge||W.gunseat)){if(W.bridge&&!W.bridge.panel&&e.button===0){bridgeClickTarget();return}if(e.button===0)mouse.l=true;return}mouse.x=e.clientX;mouse.y=e.clientY;mouse.in=true;if(e.button===0){mouse.l=true;clickTarget()}if(e.button===2)mouse.r=true;if(e.button===1){e.preventDefault();fireMissile()}});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false});
glc.addEventListener('contextmenu',e=>e.preventDefault());
glc.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*Math.exp(e.deltaY*.0012),.6,3)},{passive:false});
glc.addEventListener('touchstart',e=>{coarse=true;touchLast=true;showTouch();for(const t of e.changedTouches){if(t.clientX<innerWidth*.6&&touch.id===null){touch.id=t.identifier;touch.on=true;touch.ox=t.clientX;touch.oy=t.clientY;touch.dx=touch.dy=0}}e.preventDefault()},{passive:false});
glc.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===touch.id){touch.dx=t.clientX-touch.ox;touch.dy=t.clientY-touch.oy}e.preventDefault()},{passive:false});
const tEnd=e=>{for(const t of e.changedTouches)if(t.identifier===touch.id){touch.id=null;touch.on=false;touch.dx=touch.dy=0}};
glc.addEventListener('touchend',tEnd);glc.addEventListener('touchcancel',tEnd);
$('fcon').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-fc]');if(b&&!b.disabled){e.preventDefault();consoleAct(b.dataset.fc);return}if(e.target.id==='stratc')stratClick(e)});
$('contacts').addEventListener('pointerdown',e=>{const ob=e.target.closest('[data-op]');if(ob&&W){e.preventDefault();joinOp(friendlyOps()[+ob.dataset.op]);return}const b=e.target.closest('[data-cid]');if(!b||!W)return;e.preventDefault();const id=b.dataset.cid,ent=id==='S'?W.stationEnt:id==='O'?W.outpostEnt:W.ents.find(x=>x.id===id);if(!ent)return;const kind=id==='S'?'station':id==='O'?'outpost':'ship';
  if(W.bridge){const fac=kind==='ship'?ent.side:kind==='station'||kind==='works'?ent.fac:ent.o.owner;if(!fac||!hostile('player',fac)||(kind==='outpost'&&ent.o.breached)){flash('The battery only fires on hostiles.',true);return}bridgeSetTgt(ent);return}
  W.tgt={kind,ref:ent}});
document.querySelectorAll('#touch button').forEach(b=>{const k=b.dataset.t;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('on');if(k==='act'){if(S.player.docked)undock();else tryDock()}else if(k==='tgt')cycleHostile();else if(k==='msl')fireMissile();else if(k==='flare')playerFlares();else if(k==='wpn')setWeapon(S.player.wpn==='laser'?'kinetic':'laser');else touch[k]=true});
  const up=()=>{b.classList.remove('on');if(!['act','tgt','msl','flare','wpn'].includes(k))touch[k]=false};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
// the touch buttons can be switched off with ` (remembered on this device)
let touchOff=false;try{touchOff=localStorage.getItem('dg_touchOff')==='1'}catch(e){}
function showTouch(){$('touch').hidden=!coarse||!running||touchOff}
function toggleTouch(){touchOff=!touchOff;try{localStorage.setItem('dg_touchOff',touchOff?'1':'0')}catch(e){}showTouch();flash(touchOff?'Touch buttons hidden. Press ` to show them again.':coarse?'Touch buttons shown. Press ` to hide them.':'Touch buttons on: they appear when you use a touch screen. Press ` to switch them off.')}

function targetables(){const out=[];if(!W)return out;for(const e of W.ents){if(e.type==='ship'&&!e.isPlayer&&e.alive){if(seenShip(e))out.push({kind:'ship',ref:e})}else if(e.type==='outpost')out.push({kind:'outpost',ref:e});else if(e.type==='station')out.push({kind:'station',ref:e});else if(e.type==='gate')out.push({kind:'gate',ref:e});else if(e.type==='works')out.push({kind:'works',ref:e})}
  const s=S.sectors[W.sid];for(const a of s.ast)out.push({kind:'ast',ref:a});for(const c of s.crates)out.push({kind:'crate',ref:c});for(const x of wptsIn(s))out.push({kind:'wpt',ref:x});if(W.stationEnt&&!out.some(t=>t.ref===W.stationEnt))out.push({kind:'station',ref:W.stationEnt});if(W.outpostEnt&&!out.some(t=>t.ref===W.outpostEnt))out.push({kind:'outpost',ref:W.outpostEnt});if(S.beacons&&S.beacons[W.sid])out.push({kind:'beacon',ref:S.beacons[W.sid]});return out}
function tRad(t){const r=t.ref;return t.kind==='ast'?astR(r):t.kind==='ship'?r.st.radius*1.3:t.kind==='crate'?14:t.kind==='wpt'?WPT_R:t.kind==='beacon'?40:t.kind==='station'?130:t.kind==='gate'?115:t.kind==='works'?WKU[r.k]*.9:100}
function validTgt(t){if(!t||!W)return false;const s=S.sectors[W.sid];if(t.kind==='ship')return t.ref.alive&&W.ents.includes(t.ref);if(t.kind==='ast')return s.ast.includes(t.ref);if(t.kind==='crate')return s.crates.includes(t.ref);if(t.kind==='wpt')return wptsIn(s).includes(t.ref);if(t.kind==='works')return!!(W.works&&W.works.includes(t.ref));return true}
function targetNearest(mode){const p=W.player;let best=null,bd=1e9;for(const t of targetables()){const r=t.ref;if(mode==='hostile'&&!(t.kind==='ship'&&hostile('player',r.side))&&!(t.kind==='outpost'&&r.o.owner&&hostile('player',r.o.owner)&&!r.o.breached)&&!(t.kind==='station'&&hostile('player',r.fac))&&!(t.kind==='works'&&hostile('player',r.fac)))continue;if(mode==='ast'&&t.kind!=='ast')continue;const d=d3(r,p);if(d<bd){bd=d;best=t}}if(best)W.tgt=best;else if(mode==='hostile')flash('No hostiles in range.')}
function detAll(){if(W._detT===Math.floor(W.t*4))return W._det;W._detT=Math.floor(W.t*4);const pf=S.player.faction;return W._det=!!(CLASSES[S.player.cls].radar||(W.stationEnt&&friendSide(W.stationEnt.fac))||(W.outpostEnt&&friendSide(W.outpostEnt.o.owner))||W.ents.some(e=>e.npc&&e.alive&&e.role==='scout'&&e.side===pf))}
function seenShip(e){if(S&&S.unb&&e&&e.masked&&W&&W.player&&unbWork('crow')>=2&&d3(e,W.player)<2000)return true;if(e.masked&&hostile('player',e.side)&&mHid(e,W.player))return false;if(hostile('player',e.side)&&blCov(e,W.player))return false;return!e.npc||friendSide(e.side)||detAll()||d3(e,W.player)<(S.sectors[W.sid].storm>S.T?1200:2800)*SPREAD*(W.haze?.75:1)}
function hostileList(){const p=W.player;return W.ents.filter(e=>e.type==='ship'&&e.alive&&!e.isPlayer&&hostile('player',e.side)&&seenShip(e)).sort((a,b)=>d3(a,p)-d3(b,p))}
function hostileTargets(){const p=W.player,l=hostileList().map(e=>({kind:'ship',ref:e}));const SE=W.stationEnt,OE=W.outpostEnt;if(SE&&hostile('player',SE.fac))l.push({kind:'station',ref:SE});if(OE&&OE.o.owner&&hostile('player',OE.o.owner)&&!OE.o.breached)l.push({kind:'outpost',ref:OE});for(const w of W.works||[])if(hostile('player',w.fac))l.push({kind:'works',ref:w});return l}
function cycleHostile(){if(!W||S.player.docked)return;const l=hostileTargets();if(!l.length){flash('No hostiles in this sector.');return}const i=l.findIndex(t=>W.tgt&&W.tgt.ref===t.ref);W.tgt=l[(i+1)%l.length]}
function targetAhead(){if(!W||S.player.docked)return;const p=W.player;qRot(p.q,0,0,1,_f);let best=null,bs=1e9;for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.isPlayer)continue;const dx=e.x-p.x,dy=e.y-p.y,dz=e.z-p.z,d=hyp(dx,dy,dz)||1,ang=Math.acos(clamp((_f.x*dx+_f.y*dy+_f.z*dz)/d,-1,1));if(ang>.6)continue;const sc=ang*3+d/4000-(hostile('player',e.side)?.3:0);if(sc<bs){bs=sc;best=e}}if(best)W.tgt={kind:'ship',ref:best};else flash('Nothing ahead. Turn toward a contact.')}
function shipLabel(e){if(e.pname)return e.pname+' · '+hullName(e.fac,e.cls);if(e.side==='player')return e.role==='frigate'&&e.tok?e.tok.name:'Your '+(e.role==='drone'?'guard drone':e.role==='picket'?'picket':'wingman');if(e.role==='frigate'&&e.tok)return`${e.side==='brood'?'Brood':FACTIONS[e.side].short} ${e.tok.name}`;return(e.side==='pirate'?'Unbound':FAC(e.fac).short)+' '+hullName(e.side,e.cls)}
function cycleTarget(){const p=W.player,all=targetables().filter(t=>t.kind!=='ast'),NAV=['gate','station','outpost','beacon','wpt'],nav=all.filter(t=>NAV.includes(t.kind)),list=all.filter(t=>!NAV.includes(t.kind)).sort((a,b)=>d3(a.ref,p)-d3(b.ref,p)).slice(0,12).concat(nav).sort((a,b)=>d3(a.ref,p)-d3(b.ref,p));   // the 12 nearest ships, works and salvage, and always the gates, station, beacon and wreck salvage points
  if(!list.length)return;const i=list.findIndex(t=>W.tgt&&t.ref===W.tgt.ref);W.tgt=list[(i+1)%list.length]}
// ---- friendly targeting (I) and comms orders: nearby friendly fighters guard or escort a friendly ship, you included, for two minutes
const ORDER_TIME=120;
function friendlyList(){const p=W.player,out=[p];for(const e of W.ents){if(e.type!=='ship'||!e.alive||e===p||e.isPlayer)continue;if(e.role==='drone'||e.role==='picket')continue;if(hostile('player',e.side))continue;if(e.pup&&e.side==='pirate')continue;if(d3(e,p)>6000)continue;out.push(e)}
  return[p,...out.slice(1).sort((a,b)=>d3(a,p)-d3(b,p)).slice(0,14)]}
function ftgtName(e){return!e?'':e===W.player?'You':shipLabel(e)}
function cycleFriendly(){if(!W||S.player.docked)return;const L=friendlyList();let i=L.indexOf(W.ftgt);W.ftgt=L[(i+1)%L.length];openComms()}
// ---- comms pages: Command first (call-ins for you), then each friendly ship nearby, with what that kind of ship can do
const CM_FIGHT=['patrol','escort','screen','strike','raider'];
// a crew pilot sees the host's ships without their convoy record: match it by system and side
function cmTrader(T){if(T.tradeT)return T.tradeT;if(!T.pup||T.role!=='trader')return null;return(S.traders||[]).find(t=>t.live&&t.sector===W.sid&&t.side===T.side&&t.kind==='haul')||null}
function cmRole(T){const t=cmTrader(T);if(T.role==='trader')return t&&t.kind==='haul'?`freighter → ${DEF[t.to]?DEF[t.to].name:'?'}`:'trader';if(T.role==='frigate')return T.tok?capName(T.tok):'capital ship';if(T.role==='builder')return'constructor';if(T.role==='miner')return'miner';if(T.role==='hauler')return'hauler';if(T.role==='scout')return'scout';return T.grp&&grpAlive(T.grp).length>1?'wing':'fighter'}
function cmOpts(T){const P=S.player,p=W.player,f=P.faction,O=[];
  if(T===p){O.push({k:'escort',l:'Escort me: a wing forms up on me'},{k:'guard',l:'Guard me here'},{k:'build',l:S.unb?'Build here':W.sid===FAC_HOME(f)?'Request a shipyard here':'Request a depot here'},{k:'help',l:'Distress: send help to me'});return O}
  const nm=ftgtName(T),t=cmTrader(T),cv=T.role==='trader'&&t&&t.kind==='haul'&&t.side===f,car=T.role==='frigate'&&T.tok&&isCar(T.tok)&&T.tok.side!=='brood',hit=W.t-(T.lastHit||-99)<4&&T.lastHitBy&&hostile('player',T.lastHitBy);
  if(hit)O.push({k:'assist',l:`Help: target the ship attacking ${nm}`});
  if(cv){const me=P.pid||'me',E=t.esc,n=cvLeft(t);O.push(E&&E.k===me?{k:'none',l:`Escorting: ${E.hops} of ${E.need} jumps · paid when it docks`,off:1}:E?{k:'none',l:`Already escorted by ${E.name||'another pilot'}`,off:1}:n<1?{k:'none',l:'Last leg: no escort contract',off:1}:{k:'cvesc',l:`Escort this convoy · ${n} jump${n>1?'s':''} · ${fmt(cvPay(t,Math.ceil(n*ESC_CV.need)))} cr`},{k:'guard',l:'Guard '+nm},{k:'bound',l:'Where are you bound?'})}
  else if(car){const n=carNeed(T.tok),ks=Object.keys(n),have=ks.some(k=>(P.cargo[k]||0)>0);O.push({k:'land',l:ks.length?`Resupply: needs ${ks.slice(0,2).map(k=>n[k]+' '+ITEMS[k].name).join(', ')}${have?' · you carry some':''}`:'Clear me to land on its deck'},{k:'launch',l:'Launch fighters on my target'},{k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm})}
  else if(T.role==='builder')O.push({k:'escort',l:'Escort it to the build site'},{k:'guard',l:'Guard it'});
  else if(CM_FIGHT.includes(T.role)&&T.role!=='pilot')O.push({k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm},{k:'form',l:'Form up on me'},{k:'attack',l:'Attack my target'});
  else{O.push({k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm});if(T.role==='trader'||T.role==='hauler')O.push({k:'bound',l:'Where are you bound?'})}
  return O.slice(0,4)}
function openComms(){const T=W&&W.ftgt;if(!T)return;const me=T===W.player,O=cmOpts(T);W.cmOpts=O;
  $('cmTo').textContent=me?`${S.unb?'The Unbound':FACTIONS[S.player.faction]?FACTIONS[S.player.faction].short+' command':'Command'}`:`${ftgtName(T)} · ${cmRole(T)} · ${fmt(d3(T,W.player))} m`;
  $('cmList').innerHTML=O.map((o,i)=>`<button type="button" class="cm-o" data-cm="${i}"${o.off?' disabled':''}><kbd>${i+1}</kbd><span>${esc(o.l)}</span></button>`).join('')+`<button type="button" class="cm-o" data-cm="close"><kbd>Esc</kbd><span>Close</span></button>`;
  $('cmN').textContent=me?'I: next page, the ships around you. Guard and escort last 2 minutes.':'I: next ship. Firing closes this menu.';$('comms').hidden=false;W.commsT=W.t}
function closeComms(){const el=$('comms');if(el)el.hidden=true;if(W&&W.ftgt&&W.ftgt!==W.player)W.ftgt=null}   // next I opens on the Command page
function commsOpen(){const el=$('comms');return el&&!el.hidden}
function commsPick(k){if(k==='close'){closeComms();return}const o=W&&W.cmOpts&&W.cmOpts[+k],T=W&&W.ftgt;if(!o||o.off)return;closeComms();if(T)cmDo(o.k,T)}
function cmDo(k,T){const P=S.player,me=T===W.player;
  if(k==='help'){if(NET.cl)netSend({t:'order',k:'help'});else pilotDistress();return}
  if(k==='build'){if(NET.cl)netSend({t:'order',k:'build'});else requestBuild();return}
  if(!me&&(!T.alive||!W.ents.includes(T)))return;
  if(k==='guard'||k==='escort'){if(NET.cl){netSend({t:'order',k,id:me?'me':T.id});return}issueOrder(k,T);return}
  if(k==='form'||k==='attack'||k==='launch'){const tg=W.tgt&&W.tgt.kind==='ship'&&W.tgt.ref;if(k!=='form'&&!(tg&&tg.alive&&hostile('player',tg.side))){flash('Target an enemy ship first (T, Q or G), then give the order.',true);return}
    if(NET.cl){netSend({t:'order',k,id:T.id,tg:tg&&tg.id});return}cmWing(k,T,tg);return}
  if(k==='assist'){const at=attackersOf(T).sort((a,b)=>d3(a,W.player)-d3(b,W.player))[0]||W.ents.find(e=>e.type==='ship'&&e.alive&&e.ai&&e.ai.tgt===T&&hostile('player',e.side));if(at){W.tgt={kind:'ship',ref:at};apOn=false;flash(`Targeted ${shipLabel(at)}: it is attacking ${ftgtName(T)}.`)}else flash('No attacker in range.');return}
  if(k==='cvesc'){const t=cmTrader(T);if(!t)return;if(NET.cl){netSend({t:'cvesc',id:t.id});flash('Signing on as escort…');return}cvTake(t);return}
  if(k==='bound'){const t=cmTrader(T);feed(t&&t.to&&DEF[t.to]?`${shipLabel(T)}: bound for ${DEF[t.to].name}${t.load?' with '+haulWhat(t):''}${t.esc?`, escorted by ${t.esc.name||'a pilot'}`:''}.`:`${shipLabel(T)}: working this system.`,'info');return}
  if(k==='land'){W.tgt={kind:'ship',ref:T};apOn=true;const has=Object.keys(carNeed(T.tok)).some(i=>(P.cargo[i]||0)>0);flash(`${T.tok.name}: cleared to land. Autopilot is bringing you in: press E at its deck${has?' and your cargo unloads into its store (paid at the front-line rate)':''}.`);return}}
// a ship's own wing (or a carrier's fighters) takes your order: form up on you, or attack your target
function cmWing(k,T,tg){const pl=W.player,mem=k==='launch'?(T.pickets||[]).filter(e=>e.alive&&W.ents.includes(e)):(T.grp?grpAlive(T.grp):[T]).filter(e=>e.alive&&e.npc&&CM_FIGHT.includes(e.role));
  if(!mem.length){feed(k==='launch'?`${T.tok?T.tok.name:shipLabel(T)}: no fighters out to send.`:`${shipLabel(T)}: no one free to take that order.`,'warn');return 0}
  const use=mem.slice(0,k==='launch'?6:4),opid=CTX||NET.me||null;use.forEach((e,i)=>{e.order=k==='form'?{kind:'escort',tgt:pl,until:W.t+ORDER_TIME,slot:i,by:true,pid:opid}:{kind:'attack',tgt:tg,until:W.t+90,slot:i,by:false,pid:opid};e.ai.tgt=k==='form'?null:tg;e.ai.t=0});
  feed(`${k==='launch'?(T.tok?T.tok.name:shipLabel(T))+': '+use.length+' fighters':shipLabel(use[0])+(use.length>1?` and ${use.length-1} more`:'')}: copy, ${k==='form'?'forming up on you':'attacking '+shipLabel(tg)}.`,'good');return use.length}
// sign on as a convoy's escort from the cockpit, the same contract as Missions → Convoy escort
function cvTake(t){const P=S.player;if(!t||t.side!==P.faction||t.esc||cvLeft(t)<1){feed('That convoy no longer needs an escort.','warn');return false}const k=P.pid||'me';for(const x of S.traders||[])if(x.esc&&x.esc.k===k)x.esc=null;const E=cvSign(t,k,P.name);
  feed(`✓ Escort contract: the convoy is bound for ${DEF[t.to].name}. Stay with it for ${E.need} jump${E.need>1?'s':''}; Command pays when it docks.`,'good');return true}
// who answers: the closest friendly combat ships of your faction (not frigates, drones or civilians), up to four, within 3.5 km of the ship to protect
function issueOrder(k,T){const fac=S.player.faction,me=T===W.player||T.rp===S.player||(T.isPlayer&&!T.rp),cand=[];
  for(const e of W.ents){if(e.type!=='ship'||!e.alive||!e.npc||e===T||e.side!==fac)continue;if(!['patrol','escort','screen','strike','raider'].includes(e.role))continue;if(isBmb(e.cls)&&e.role==='strike')continue;const d=d3(e,T);if(d<3500)cand.push([e,d])}
  cand.sort((a,b)=>a[1]-b[1]);const pick=cand.slice(0,4).map(c=>c[0]);
  if(!pick.length){feed(`No friendly fighters within range to ${k} ${me?'you':ftgtName(T)}.`,'warn');return 0}
  const opid=CTX||NET.me||null;pick.forEach((e,i)=>{e.order={kind:k,tgt:T,until:W.t+ORDER_TIME,slot:i,by:me,pid:opid};e.ai.tgt=null;e.ai.t=0});
  const lead=pick[0],who=pick.length>1?`${shipLabel(lead)} and ${pick.length-1} more`:shipLabel(lead);
  feed(`${who}: copy, ${k==='guard'?'guarding':'escorting'} ${me?'you':ftgtName(T)} for ${ORDER_TIME/60} minutes.`,'good');return pick.length}
// comms: ask your faction to build. In its home system that means a capital shipyard; anywhere else, a depot near you (a constructor convoy flies in)
function lackText(cost,src){const m=[];for(const k in cost){const h=(src&&src[k])||0;if(h<cost[k]){const n=cost[k]-h;m.push(`${n} ${ITEMS[k].name}${n>1&&!/s$/.test(ITEMS[k].name)?'s':''}`)}}return m.join(', ')}
function requestBuild(){if(!W||!W.player)return;if(S.unb){lairBuild();return}if(truceAt(W.sid)){feed('Command: nothing can be built in a truce zone. Burn the Bloom out of this system first.','warn');return}const f=S.player.faction,sid=W.sid,F=FACTIONS[f].short,st=S.econ.stock[f],p=W.player;
  if(sid===FAC_HOME(f)){
    if(S.yards[f]){feed(`${F} command: ${DEF[sid].name} already has a capital shipyard. Commission a carrier or escorts from Hangar → Shipyard at the station.`,'info');return}
    const yb=S.events.find(e=>e.type==='yardbuild'&&e.att===f);if(yb){feed(`${F} command: the shipyard is already under construction, about ${Math.max(1,Math.ceil((yb.until-S.T)/60))} min to go.`,'info');return}
    if(!haveIn(yardCost(f),[st])){feed(`${F} command: we can't build a shipyard yet. Our stores are short ${lackText(yardCost(f),st)}. Selling those at the station fills the stores.`,'warn');return}
    const force={};takeFrom(yardCost(f),[st]);inv.addAll(force,yardCost(f));S.events.push({id:S.nextId++,type:'yardbuild',att:f,sector:sid,force,until:S.T+YARD_TIME,stage:'building'});
    feed(`${F} command: copy. Capital shipyard construction has begun at ${DEF[sid].name}, ready in ${YARD_TIME/60} minutes. Any ${F} pilot can commission a carrier or escorts there.`,'good');return}
  if(S.stations[sid]){feed(`${F} command: this system already has a station.`,'warn');return}
  if(!canBuildIn(sid,f)){feed(`${F} command: we can't build here. ${DEF[sid].kind==='hive'?'Nothing takes root in the Bloom.':'Another power holds this system.'}`,'warn');return}
  const ex=S.events.find(e=>e.type==='build'&&e.sector===sid&&e.stage!=='done');if(ex){feed(`${ex.att===f?F+' command: a constructor is already on its way here.':'Another power is already building here.'}`,'info');return}
  S.cReq=S.cReq||{};const q=S.cReq[f];if(q&&q.sid===sid){feed(`${F} command: your constructor for ${DEF[sid].name} is already being readied.`,'info');return}if(q){feed(`${F} command: we're already readying a constructor for ${DEF[q.sid].name}. One build call at a time.`,'warn');return}
  // the area has to be mostly clear when you call: at most one hostile ship near you and no hostile capital ship in the system
  const near=W.ents.filter(e=>e.type==='ship'&&e.alive&&!e.isPlayer&&e.role!=='drone'&&hostile(f,e.side)&&d3(e,p)<3000).length,cap=W.ents.some(e=>e.type==='ship'&&e.alive&&(e.role==='frigate'||e.role==='escortcap')&&hostile(f,e.side));
  if(near>1||cap){feed(`${F} command: negative. The area isn't secure: ${cap?'a hostile capital ship is in the system':near+' hostiles within 3 km of you'}. Clear it and call again.`,'warn');return}
  let site={x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z)};if(GATES[sid].some(g=>d3(g,site)<900)||S.sectors[sid].ast.some(a=>d3(a,site)<astR(a)+200)||(W.outpostEnt&&d3(W.outpostEnt,site)<700)||hyp(site.x,site.y,site.z)>4000*SPREAD)site=stationSite(sid);
  S.cReq[f]={sid,site,T:S.T,by:pkey(),said:S.T};feed(`${F} command: copy. A constructor and escort will be sent to build a depot ${site.x===Math.round(p.x)&&site.z===Math.round(p.z)?'at your position':'nearby'} in ${DEF[sid].name}.`,'good');cReqTick()}
// a called-in constructor: assembled from faction stores as soon as they allow, then flown from the nearest friendly station,
// one jump at a time, always with at least two escorts. The site only had to be clear when the call was made.
const CR_ESC_MIN=2,CR_HOP=40;
function cReqTick(){if(NET.cl||!S.cReq)return;for(const f in S.cReq){const q=S.cReq[f],F=FACTIONS[f]?FACTIONS[f].short:f,nm=DEF[q.sid].name;
    if(S.stations[q.sid]||!canBuildIn(q.sid,f)||S.events.some(e=>e.type==='build'&&e.sector===q.sid&&e.stage!=='done')){delete S.cReq[f];facFeed(f,`${F} command: the depot call for ${nm} is cancelled, the system has changed hands.`,'warn');continue}
    if(S.T-q.T>1500){delete S.cReq[f];facFeed(f,`${F} command: we couldn't ready a constructor for ${nm} in time. Call again when our stores recover.`,'warn');continue}
    const st=S.econ.stock[f],fl=S.econ.fleet[f],srcs=[fl,st],tier=factionTier(f);
    const esc=[];{const tmp={},probe=[{...fl},{...st}];for(let i=0;i<3;i++){const cl=pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(takeFrom(ld,probe))esc.push([cl,ld])}}
    const ready=haveIn(DEPOT_COST,[st])&&haveIn(CONSTR_LD,srcs)&&esc.length>=(lvlOf(q.by)>=7?1:CR_ESC_MIN);
    if(!ready){if(S.T-q.said>120){q.said=S.T;const need={...DEPOT_COST};for(const k in CONSTR_LD)need[k]=(need[k]||0)+CONSTR_LD[k];facFeed(f,`${F} command: still readying your constructor for ${nm}${haveIn(DEPOT_COST,[st])&&haveIn(CONSTR_LD,srcs)?': waiting on escort fighters':': stores short '+(lackText(need,{...fl,...st})||'parts')}.`,'info')}continue}
    const force={};takeFrom(DEPOT_COST,[st]);inv.addAll(force,DEPOT_COST);takeFrom(CONSTR_LD,srcs);inv.addAll(force,CONSTR_LD);const cls=[];
    for(const[cl,ld]of esc)if(takeFrom(ld,srcs)){inv.addAll(force,ld);cls.push(cl)}
    if(cls.length<CR_ESC_MIN){inv.addAll(st,force);continue}
    const from=nearestOwnStation(f,q.sid),hops=from?HOP[from][q.sid]||0:2,eta=S.T+30+CR_HOP*hops;
    const ev={id:S.nextId++,type:'build',att:f,sector:q.sid,eta,stage:'inbound',force,n:cls.length,tier,cls,site:q.site,prog:0,from,hops,T0:S.T};S.events.push(ev);announce(ev);delete S.cReq[f];
    facFeed(f,`${F} command: constructor away from ${from?stN(from):'the rear'} with ${cls.length} escorts. ${hops} jump${hops===1?'':'s'} to ${nm}, ETA ${fmtT(eta-S.T)}. Track it under Missions or in comms.`,'good')}}
function feedTo(pid,msg,k){const o=CTX;CTX=pid||null;try{feed(msg,k)}finally{CTX=o}}
function threatTo(T,e,R){let best=null,bd=1e9;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||!hostile(e.side,o.side))continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;
    const dT=d3(o,T);if(dT>R)continue;const sc=dT*(o.ai&&o.ai.tgt===T?.4:1)*(isBmb(o.cls)?.6:1);if(sc<bd){bd=sc;best=o}}return best}
function orderThink(e,dt){const o=e.order,T=o.tgt,ai=e.ai;
  if(W.t>o.until||!T||!T.alive||!(T===W.player?!W.dead:W.ents.includes(T))||e.role==='flee'||e.role==='leave'){e.order=null;ai.tgt=null;ai.t=0;if(T&&T.alive&&W.t>o.until&&o.slot===0)feedTo(o.pid,`${shipLabel(e)}: ${o.kind} time is up, returning to normal duties.`,'info');return false}
  if(o.kind==='attack'){ai.tgt=T;fight(e,T,dt);return true}
  const R=o.kind==='guard'?1800:1000;
  if(ai.t<=0||!(ai.tgt&&ai.tgt.alive&&W.ents.includes(ai.tgt))||d3(ai.tgt,T)>R*1.4){ai.t=.5+rnd(.4);ai.tgt=threatTo(T,e,R)}
  if(ai.tgt){fight(e,ai.tgt,dt);return true}
  const n=o.slot,tv=hyp(T.vx,T.vy,T.vz),rr=T.st.radius*1.25;
  if(o.kind==='escort'){const sl=[[-90,15,-80],[90,15,-80],[0,55,-150],[0,-55,-150]][n%4],k=1+rr/60;qRot(T.q,sl[0]*k,sl[1]*k,sl[2]*k,_u);holdSlot(e,T,T.x+_u.x,T.y+_u.y,T.z+_u.z,dt,1.4);if(tv>15)faceDir(e,T.vx,T.vy,T.vz,dt);else{qRot(T.q,0,0,1,_f);faceDir(e,_f.x,_f.y,_f.z,dt)}}
  else{const a=n*Math.PI/2+W.t*.18,Rg=rr+330;holdSlot(e,T,T.x+Math.cos(a)*Rg,T.y+Math.sin(n*1.9+W.t*.1)*90,T.z+Math.sin(a)*Rg,dt,1.2);const v=hyp(e.vx-T.vx,e.vy-T.vy,e.vz-T.vz);if(v>12)faceDir(e,e.vx-T.vx,e.vy-T.vy,e.vz-T.vz,dt);else faceTo(e,T,dt)}
  return true}
function clickTarget(){if(!W||S.player.docked)return;let best=null,bd=1e9;for(const t of targetables()){const r=t.ref,P=proj(r.x,r.y,r.z);if(P.behind)continue;const pr=projR(P.d,tRad(t)),d=hyp(P.x-mouse.x,P.y-mouse.y);if(d<Math.max(16,pr+6)&&d<bd){bd=d;best=t}}if(best)W.tgt=best}
