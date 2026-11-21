//@src 16j_pad.js
// ============================================================ controller support (Nov 2026)
// The user: "Also add controller support." Any pad the browser maps to the standard layout (DualSense, DualShock, Xbox) flies
// the ship alongside the mouse and keyboard. Built on what Ace of the Airways learned (pad.js there):
// - sticks read through a round deadzone measured from where each axis really rests (worn sticks rest off centre, and some
//   browsers on a Mac report a trigger at rest as -1 on what should be a stick axis: that read as full down);
// - an axis nobody has moved yet counts as centred, whatever it reads; an untouched stick is re-centred slowly;
// - while the pad is in use the mouse doesn't steer (a mouse left off-centre would keep turning the ship);
// - prompts name the pad's buttons while it is in use; every button can be moved (Pilot's Manual, H); rumble on hits.
// Buttons press the game's own keys (the key each action is bound to now), so every action works exactly as from the keyboard,
// in multiplayer too. Menus stay mouse and keyboard; Circle closes the map or the manual.
//   Left stick   steer (as the mouse)          Right stick  roll (left and right)
//   R2           fire                           L2           thrust
//   L1           afterburner (with thrust)      R1           missile
//   Cross (A)    dock, launch, land, board      Circle (B)   brake; closes the map or the manual
//   Square (X)   blast charge / scoop (hold)    Triangle (Y) nearest hostile
//   D-pad        up: ship at your nose, down: flares, left: cycle hostiles, right: cannon / laser
//   L3           flight assist                  R3           chase / cockpit camera
//   Options      galaxy map                     Create/View  autopilot          Touchpad  comms
const PADB={cross:0,circle:1,square:2,triangle:3,l1:4,r1:5,l2:6,r2:7,create:8,options:9,l3:10,r3:11,up:12,down:13,left:14,right:15,touch:17};
// [id, label, default button, hold or tap]. The id is the keyboard action it presses (KEY_ACTS), or one of the pad's own
// (boost: Shift; gun: the other gun)
const PAD_ACTS=[['fire','Fire the selected gun',PADB.r2,'hold'],['thrust','Thrust',PADB.l2,'hold'],['boost','Afterburner (with thrust)',PADB.l1,'hold'],
  ['brake','Brake (closes the map or the manual)',PADB.circle,'hold'],['msl','Missile, once locked',PADB.r1,'tap'],['act','Dock, launch, land on a rock, board',PADB.cross,'tap'],
  ['mine','Blast charge, or hold to scoop',PADB.square,'hold'],['tgtH','Nearest hostile',PADB.triangle,'tap'],['ahead','The ship at your nose',PADB.up,'tap'],
  ['flare','Flares',PADB.down,'tap'],['cycleH','Cycle hostiles',PADB.left,'tap'],['gun','Cannon or laser',PADB.right,'tap'],['fa','Flight assist on/off',PADB.l3,'tap'],
  ['cam','Chase or cockpit camera',PADB.r3,'tap'],['map','Galaxy map',PADB.options,'tap'],['autopilot','Autopilot',PADB.create,'tap'],['comms','Comms',PADB.touch,'tap'],
  ['track','Track the target (hold)',-1,'hold'],['swarm','Swarm pods',-1,'tap'],['det','Detonate charges',-1,'tap'],['ast','Nearest rock',-1,'tap'],['distress','Distress call',-1,'tap']];
const PAD_DEF=Object.fromEntries(PAD_ACTS.map(a=>[a[0],a[2]]));
const PAD_NAMES={ps:['Cross','Circle','Square','Triangle','L1','R1','L2','R2','Create','Options','L3','R3','D-pad up','D-pad down','D-pad left','D-pad right','PS','Touchpad'],
  xb:['A','B','X','Y','LB','RB','LT','RT','View','Menu','LS click','RS click','D-pad up','D-pad down','D-pad left','D-pad right','Guide','Share']};
let PADO={};try{PADO=JSON.parse(localStorage.getItem('driftgate.pad')||'{}')||{}}catch(e){PADO={}}
function padSave(){try{localStorage.setItem('driftgate.pad',JSON.stringify(PADO))}catch(e){}}
const PAD={index:-1,name:'',prev:[],active:false,lastUsed:-1e9,lx:0,ly:0,rx:0,ry:0,held:{},tapUp:[],capturing:null,capPrev:null,hull:null,rest:[],trig:[],calm:[],restId:null,t0:0};
function padMap(){return Object.assign({},PAD_DEF,PADO.map||{})}
function padDZ(){return clamp(PADO.dz||.2,.05,.45)}
function padStick(x,y){const d=Math.hypot(x,y),z=padDZ();if(d<z)return[0,0];const k=Math.min(1,(d-z)/(1-z))/d;return[x*k,y*k]}
// gentle near the middle, full at the edge
function padCurve(v){return Math.sign(v)*v*v*.55+v*.45}
function padBtnName(i){if(i==null||i<0)return'—';const L=/xbox|xinput|microsoft/i.test(PAD.name)?PAD_NAMES.xb:PAD_NAMES.ps;return L[i]||'Button '+i}
function padPick(){const list=navigator.getGamepads?navigator.getGamepads():[];if(PAD.index>=0&&list[PAD.index]&&list[PAD.index].connected)return list[PAD.index];
  for(const p of list)if(p&&p.connected&&p.mapping==='standard'){PAD.index=p.index;PAD.name=p.id;return p}
  for(const p of list)if(p&&p.connected){PAD.index=p.index;PAD.name=p.id;return p}PAD.index=-1;return null}
// both sticks: where each axis rests, then the round deadzone. For the first 3 s an axis that sits still is measured; after
// that an untouched stick is re-centred slowly. An axis parked at the end of its travel on a non-standard pad is a trigger.
function padSticks(p,T){const ax=p.axes||[],sw=!!PADO.swap,L=sw?[2,3]:[0,1],R=sw?[0,1]:[2,3];
  if(PAD.restId!==p.id){PAD.restId=p.id;PAD.rest=[];PAD.trig=[];PAD.calm=[];PAD.t0=T}
  const R0=PAD.rest,early=T-PAD.t0<3000;
  if(!PAD.calm.length&&ax.every(v=>!v)){PAD.t0=T;PAD.lx=PAD.ly=PAD.rx=PAD.ry=0;return}
  for(let i=0;i<ax.length;i++){const v=+ax[i]||0,c=PAD.calm[i]||(PAD.calm[i]={lo:v,hi:v,t:T,first:v});if(v<c.lo)c.lo=v;if(v>c.hi)c.hi=v;
    if(!c.moved&&Math.abs(v)>.45&&(p.mapping==='standard'||Math.abs(v)<.9))c.moved=true;
    if(c.hi-c.lo>(early?.03:.012)){c.lo=c.hi=v;c.t=T;if(Math.abs(v-(R0[i]??c.first))>.08)c.moved=true;continue}
    const still=T-c.t;
    if(early&&still>700){if(p.mapping!=='standard'&&Math.abs(v)>.9)PAD.trig[i]=true;else if(Math.abs(v)<.35){R0[i]=v;PAD.trig[i]=false}}
    else if(!early&&still>2000&&!PAD.trig[i]&&Math.abs(v-(R0[i]||0))<.3&&Math.abs(v)<.35)R0[i]=v}
  const a=i=>{if(PAD.trig[i]||!(PAD.calm[i]&&PAD.calm[i].moved))return 0;return clamp((+ax[i]||0)-(R0[i]||0),-1,1)};
  [PAD.lx,PAD.ly]=padStick(a(L[0]),a(L[1]));[PAD.rx,PAD.ry]=padStick(a(R[0]),a(R[1]))}
// the physical key an action is on now (so a remapped keyboard still works), and a key press as the game sees one
function padCode(id){if(id==='boost')return'ShiftLeft';if(id==='gun'){const k=S&&S.player&&S.player.wpn==='laser'?'kin':'las';return KEYB[k]||KEY_DEF[k]}return KEYB[id]||KEY_DEF[id]||''}
function padKey(type,code){if(!code)return;try{dispatchEvent(new KeyboardEvent(type,{code,key:'',bubbles:true}))}catch(e){}}
function padRelease(){for(const c in PAD.held)if(PAD.held[c])padKey('keyup',c);PAD.held={};for(const c of PAD.tapUp)padKey('keyup',c);PAD.tapUp=[]}
function padPoll(){const T=performance.now();
  for(const c of PAD.tapUp)padKey('keyup',c);PAD.tapUp=[];
  const p=padPick();if(!p){if(PAD.active)padRelease();PAD.active=false;PAD.lx=PAD.ly=PAD.rx=PAD.ry=0;return}
  const raw=i=>{const b=p.buttons[i];return !!b&&(b.pressed||b.value>.4)};
  padSticks(p,T);
  if(PAD.capturing){const now=p.buttons.map((b,i)=>raw(i));if(!PAD.capPrev){PAD.capPrev=now;return}const i=now.findIndex((d,j)=>d&&!PAD.capPrev[j]);PAD.capPrev=now;
    if(i>=0&&i!==16)padBind(PAD.capturing,i);PAD.prev=now;return}
  const used=PAD.lx||PAD.ly||PAD.rx||PAD.ry||p.buttons.some((b,i)=>b&&b.pressed&&i!==16);if(used)PAD.lastUsed=T;PAD.active=T-PAD.lastUsed<4000;
  const M=padMap(),typing=document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  const sheet=!$('map').hidden||!$('help').hidden;
  if(!running||typing){padRelease();PAD.prev=p.buttons.map((b,i)=>raw(i));return}
  for(const[id,,,kind]of PAD_ACTS){const b=M[id];if(b==null||b<0)continue;const on=raw(b),was=!!PAD.prev[b];
    // the map and the manual: Circle (brake) closes them, as Esc does
    if(id==='brake'&&sheet){if(on&&!was){padKey('keydown','Escape');PAD.tapUp.push('Escape')}continue}
    const code=padCode(id);if(!code)continue;
    if(kind==='hold'){if(on&&!PAD.held[code]){PAD.held[code]=1;padKey('keydown',code)}else if(!on&&PAD.held[code]&&!M_heldElsewhere(M,id,p,raw)){PAD.held[code]=0;padKey('keyup',code)}}
    else if(on&&!was){padKey('keydown',code);PAD.tapUp.push(code)}}
  PAD.prev=p.buttons.map((b,i)=>raw(i));
  padFeel()}
// two hold actions can share a key (none do by default); keep it held while either button is
function M_heldElsewhere(M,id,p,raw){const code=padCode(id);for(const[o,,,k]of PAD_ACTS)if(o!==id&&k==='hold'&&padCode(o)===code&&M[o]>=0&&raw(M[o]))return true;return false}
// rumble: a hit (harder for a bigger one), and a long one when the ship is lost; host and guest alike, read off the hull
function padFeel(){if(!PAD.active||PADO.rumble===false||!W||!W.player||!S||!S.player)return;const p=W.player,h=S.player.docked?null:p.hull+Math.max(0,p.shield||0);
  if(W.dead){if(!PAD.deadT){PAD.deadT=1;padRumble(1,600)}return}PAD.deadT=0;
  if(h!=null&&PAD.hull!=null&&h<PAD.hull-.5){const f=(PAD.hull-h)/Math.max(1,p.st.hull+(p.st.sCap||0));padRumble(f>.06?.9:.45,f>.06?260:110)}PAD.hull=h}
function padRumble(s,ms){const p=padPick(),a=p&&p.vibrationActuator;if(!a||!a.playEffect)return;try{a.playEffect('dual-rumble',{duration:ms,strongMagnitude:Math.min(1,s),weakMagnitude:Math.min(1,s*.7)}).catch(()=>{})}catch(e){}}
function padBind(id,b){const M=padMap();
  // a button does one job: whatever had it takes this action's old button
  if(b>=0)for(const[o]of PAD_ACTS)if(o!==id&&M[o]===b)M[o]=M[id];M[id]=b;
  const d={};for(const[o]of PAD_ACTS)if(M[o]!==PAD_DEF[o])d[o]=M[o];PADO.map=d;padSave();PAD.capturing=null;PAD.capPrev=null;keyListRender()}
(function padLoop(){requestAnimationFrame(padLoop);try{padPoll();padLive()}catch(e){}})();
addEventListener('gamepadconnected',e=>{PAD.index=e.gamepad.index;PAD.name=e.gamepad.id;if(running)flash(`Controller connected: ${padBtnName(padMap().act)} docks and launches, R2 fires. Pilot's Manual (H) has the full layout.`)});
addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===PAD.index){padRelease();PAD.index=-1;PAD.active=false;if(running)flash('Controller disconnected.',true)}});
// steering: the left stick, as the mouse; while the pad is in use the mouse doesn't steer
{const o=steerInput;steerInput=function(){if(!PAD.active)return o.apply(this,arguments);const s=PADO.sens||1;let yaw=-padCurve(PAD.lx)*s,pitch=padCurve(PAD.ly)*s*(PADO.invert?-1:1);
  if(keys.ArrowLeft)yaw+=1;if(keys.ArrowRight)yaw-=1;if(keys.ArrowUp)pitch-=1;if(keys.ArrowDown)pitch+=1;return{yaw:clamp(yaw,-1,1),pitch:clamp(pitch,-1,1)}}}
// roll: the right stick, in proportion (playerUpdate adds it to A and D)
function padRoll(){return PAD.active?padCurve(PAD.rx):0}
function padSteering(){return PAD.active&&!!(PAD.lx||PAD.ly||PAD.rx)}
// prompts name the pad's button while it is in use
{const o=kb;kb=function(id){if(PAD.active&&!touchUI()){const M=padMap();if(M[id]!=null&&M[id]>=0)return padBtnName(M[id])}return o.apply(this,arguments)}}
// ---- the Controller section of the Pilot's Manual
function padListHtml(){const M=padMap(),p=padPick();
  let h=`<div class="h3" style="margin-top:18px">Controller</div><p class="note" style="margin:0 0 6px" id="padState">${p?`Connected: ${esc(p.id.replace(/\(.*?\)/g,'').trim().slice(0,60))}${p.mapping==='standard'?'':' (non-standard layout)'}`:'No controller found. Plug one in or pair it, then press any button.'}</p>
    <p class="note" style="margin:0 0 6px;font-family:monospace;font-size:11px" id="padRaw"></p><div class="keys"><kbd>Left stick</kbd><span>Steer, as the mouse</span><kbd>Right stick</kbd><span>Roll</span>`;
  for(const[id,label]of PAD_ACTS){const cap=PAD.capturing===id;h+=`<kbd>${cap?'press a button…':esc(padBtnName(M[id]))}</kbd><span>${esc(label)} <button class="btn sm" type="button" data-padbind="${id}">${cap?'Cancel':'Change'}</button>${M[id]>=0&&PAD_DEF[id]<0?` <button class="btn sm" type="button" data-padbind="${id}" data-unbind="1">Clear</button>`:''}</span>`}
  h+=`</div><div class="padopts" style="display:grid;gap:6px;margin-top:8px">
    <label>Steering speed <input type="range" min=".4" max="2" step=".05" value="${PADO.sens||1}" data-padopt="sens"></label>
    <label>Stick deadzone (raise it if the ship turns with the sticks let go) <input type="range" min=".05" max=".45" step=".01" value="${padDZ()}" data-padopt="dz"></label>
    <label><input type="checkbox" ${PADO.invert?'checked':''} data-padopt="invert"> Invert pitch</label>
    <label><input type="checkbox" ${PADO.swap?'checked':''} data-padopt="swap"> Swap sticks (right steers, left rolls)</label>
    <label><input type="checkbox" ${PADO.rumble!==false?'checked':''} data-padopt="rumble"> Rumble</label></div>
    <p style="margin-top:8px"><button class="btn sm" type="button" data-padbind="__reset">Controller defaults</button></p>`;return h}
{const o=keyListHtml;keyListHtml=function(){return o.apply(this,arguments)+padListHtml()}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-padbind]');if(!b)return;const id=b.dataset.padbind;
  if(id==='__reset'){PADO={};padSave();PAD.capturing=null;PAD.rest=[];PAD.calm=[];PAD.restId=null;keyListRender();return}
  if(b.dataset.unbind){padBind(id,-1);return}PAD.capturing=PAD.capturing===id?null:id;PAD.capPrev=null;keyListRender()});
document.addEventListener('input',e=>{const el=e.target;if(!el.dataset||!el.dataset.padopt)return;const k=el.dataset.padopt;
  if(el.type==='checkbox')PADO[k]=k==='rumble'?el.checked:!!el.checked;else PADO[k]=+el.value;if(k==='swap'){PAD.rest=[];PAD.calm=[];PAD.restId=null}padSave()});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.padopt&&el.type==='checkbox'){PADO[el.dataset.padopt]=el.checked;padSave()}});
// live readout while the manual is open: if the ship turns with the sticks let go, this shows which axis
function padLive(){if($('help').hidden)return;const el=$('padRaw');if(!el)return;const p=padPick();if(!p){el.textContent='';return}
  const f=v=>(v>=0?' ':'')+(+v||0).toFixed(2);el.textContent=`Axes: ${(p.axes||[]).slice(0,6).map((v,i)=>`${i}:${f(v)}${PAD.trig[i]?' (trigger, ignored)':''}`).join('  ')} · after the deadzone: steer ${f(PAD.lx)} ${f(PAD.ly)} roll ${f(PAD.rx)}`}
