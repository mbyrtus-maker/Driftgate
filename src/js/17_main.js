//@src 17_main.js
// ============================================================ main loop
let last=performance.now(),hudT=0,saveT=0,mapT=0;
function step(dt){if(S&&S.won)return;legFlownTick(dt);
  if(NET.cl){S.T+=dt;}else{
  S.T+=dt;
  S.timers.tick-=dt;if(S.timers.tick<=0){S.timers.tick=10;STRAT=true;try{strategicTick()}finally{STRAT=false}}
  S.timers.event-=dt;if(S.timers.event<=0){S.timers.event=rnd(45,80);scheduleEvent()}
  S.timers.contract-=dt;if(S.timers.contract<=0){S.timers.contract=rnd(40,70);scheduleContract()}}
  if(!NET.cl){STRAT=true;try{updateEvents()}finally{STRAT=false}}
  if(NET.cl)magTick(S.player,dt);else for(const P of allPilots())magTick(P,dt);
  for(const w of Object.values(WORLDS)){if(!WORLDS[w.sid])continue;W=w;MUTE=w!==LW;try{worldUpdate(dt)}finally{MUTE=false}}
  W=LW;
  if(NET.on)netTick(dt);
  hudT-=dt;if(hudT<=0&&W){hudT=.1;hudUpdate();netHud()}
  saveT+=dt;if(saveT>20){saveT=0;if(!NET.on)save()}
  if(!$('map').hidden){mapT-=dt;if(mapT<=0){mapT=.5;drawMap();if(!$('mapSide').matches(':hover'))renderMapSide()}}
  if(!$('dock').hidden&&W&&S.player.docked){W.dockR=(W.dockR||0)-dt;if(W.dockR<=0){W.dockR=2;if(!document.activeElement||!$('dock').contains(document.activeElement))renderDock()}}
}
function resize(){DPR=Math.min(2,devicePixelRatio||1);VW=glc.clientWidth;VH=glc.clientHeight;glc.width=Math.round(VW*DPR);glc.height=Math.round(VH*DPR);ovc.width=Math.round(VW*DPR);ovc.height=Math.round(VH*DPR);cam.fovBase=VW<VH?78:62;cam.fov=cam.fovBase}
addEventListener('resize',()=>{resize();if(!$('map').hidden)drawMap()});
// the frame loop never dies: a bug in one part of a frame is caught, logged once (window.__dgErr keeps the last few for
// bug reports) and the next frame still runs, so an error can't freeze the game
let hidT=0;const FRAME_ERR={seen:new Set(),n:0};
function frameErr(where,e){FRAME_ERR.n++;const k=where+':'+(e&&e.message);(window.__dgErr=window.__dgErr||[]).push({where,msg:String(e&&e.message||e),stack:String(e&&e.stack||'').split('\n').slice(0,4).join(' | '),T:S?Math.round(S.T):0});if(window.__dgErr.length>20)window.__dgErr.shift();
  if(!FRAME_ERR.seen.has(k)){FRAME_ERR.seen.add(k);console.error('Driftgate '+where+':',e);try{flash(`Something went wrong (${where}): ${String(e&&e.message||e).slice(0,80)}. The game kept running; F12 → Console has details.`,true)}catch(_){}}}
function frameRun(where,fn){try{fn()}catch(e){frameErr(where,e)}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;hidT=performance.now();
  frameRun('simulation',()=>{if(S&&running&&W){step(dt);if(S.training)trainTick()}});
  frameRun('camera',()=>{if(W&&!W.bridge&&!W.gunseat&&lookLocked())ejectReset();updateCamera(dt)});frameRun('3D view',draw3D);frameRun('HUD',drawOverlay);
  frameRun('bridge console',()=>{if(W&&W.bridge&&W.bridge.panel){drawStrat();fcT-=dt;if(fcT<=0){fcT=.4;renderConsole(false)}}});frameRun('audio',auFrame)}
addEventListener('beforeunload',save);
try{const wk=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'],{type:'text/javascript'})));wk.onmessage=()=>{if(MP.sig&&MP.sig.hb)MP.sig.hb();if(!document.hidden||!NET.on||!S||!running)return;const now=performance.now(),dt=Math.min(.1,(now-(hidT||now))/1000);hidT=now;if(dt>0)frameRun("simulation",()=>step(dt))}}catch(e){}
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
window.__dg={NET,MP,ev:c=>eval(c),get WORLDS(){return WORLDS},get LW(){return LW},runAs:(a,b)=>runAs(a,b),hostSave:()=>hostSave(),shipStats:(a,b,c)=>shipStats(a,b,c),launchMissile:(a,b,c,d)=>launchMissile(a,b,c,d),fctl:t=>fctl(t),consoleAct:a=>consoleAct(a),victoryTick:()=>victoryTick(),controlCounts:()=>controlCounts(),makeCarrier:(a,b,c)=>makeCarrier(a,b,c),CARRIER_COST,setHull:k=>{S.player.cls=k;refreshPlayerStats();if(W&&W.player){W.player.hull=W.player.st.hull;W.player.shield=W.player.st.sCap}},planBuild:f=>planBuild(f),covered:x=>covered(x),addStationEnt:r=>addStationEnt(r),razeStation:(a,b)=>razeStation(a,b),spawnHauler:(sd)=>spawnHauler(sd,false),ops:()=>friendlyOps(),joinOp:o=>joinOp(o),planOffensive:f=>planOffensive(f),get ap(){return apOn},set ap(v){apOn=v},routeNext:()=>routeNext(),au:AU,spawnWing:(r,sd,n)=>spawnWing(r,sd,n,false),get S(){return S},get W(){return W},ledger:()=>S&&ledger(),step:d=>step(d),enterSector,exitSector,cam,render:()=>{updateCamera(.016);draw3D();drawOverlay()}};

function boot(data){
  if(!G){$('glErr').hidden=false;return}
  try{initGL();genMeshes()}catch(e){$('glErr').hidden=false;$('glErr').textContent='WebGL failed to start: '+e.message;return}
  resize();buildSectorScene(null);auApply();
  try{const d=new Date(document.lastModified);if(/github\.io$/.test(location.hostname)&&!isNaN(d))$('ver').textContent='Game updated '+d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'. If you are missing something new, reload with Ctrl+Shift+R (Cmd+Shift+R on Mac).'}catch(e){}
  try{const bc=new BroadcastChannel('driftgate');MP.bc=bc;bc.onmessage=e=>{const m=e.data||{};if(m.t==='hello'&&running)bc.postMessage({t:'here',code:NET.on?MP.code:'',host:NET.host});if(m.t==='here'&&!running){const el=$('ver');if(el){el.style.opacity=1;el.style.color='var(--amber)';el.textContent=`Driftgate is already open in another tab of this browser${m.code?` (${m.host?'hosting':'in'} galaxy “${m.code}”)`:''}. Close that tab first, or use it instead: two tabs in one browser share the same pilot.`}}};bc.postMessage({t:'hello'})}catch(e){}
  mpConfig();{const q=new URLSearchParams(location.search);let n='',c='';try{n=localStorage.getItem('driftgate.mpname')||'';c=localStorage.getItem('driftgate.mpcode')||''}catch(e){}$('mpName').value=q.get('name')||n;$('mpCode').value=q.get('galaxy')||c;showInvite();if(q.get('galaxy')&&!q.get('auto'))mpStatus(`You've been invited to the galaxy <b>${esc(q.get('galaxy'))}</b>. Choose a callsign, faction and ship, then press <b>Launch</b> to join your friends.`);if((window.claude||!mpOK())&&!q.get('sig')){$('mpBox').hidden=false;$('mpBox').querySelector('.mprow').hidden=true;mpStatus(`Multiplayer runs from the shareable copy at <a href="${MP_HOME}" target="_blank" rel="noopener" style="color:var(--amber)">${MP_HOME.replace('https://','')}</a>${window.claude?' (this preview can\'t open peer-to-peer connections)':' (this browser can\'t open peer-to-peer connections)'}. Open it there, press Create a galaxy for friends, and send your friends the invite link.`)}if(q.get('auto')&&mpOK())setTimeout(mpJoin,50)}
  const saved=data&&data.save;
  if(saved&&saved.v===2)startWith(saved);else showStart();
  requestAnimationFrame(frame);
}
try{window.claude?.hot?.snapshot?.(()=>({save:S?serialize():null}))}catch(e){}
const hot=window.claude?.hot;
if(hot&&hot.ready)hot.ready(boot);else boot(hot?.data??{});
})();