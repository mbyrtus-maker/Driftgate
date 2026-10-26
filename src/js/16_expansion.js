//@src 16_expansion.js
// ============================================================ expansion: galaxy debrief, named aces, quiet-space anomalies, the Unbound haven
// Everything here hooks the systems above by wrapping their functions, so the core sim stays as it was. All state lives in S
// (S.hist, S.aces, S.anoms, S.pir) and so saves with the galaxy and reaches every pilot through the host's normal sync.
// Nothing is created: anomaly salvage comes out of the outer drift, ace ships are ordinary wings drawn from faction stores,
// and the Unbound build their capitals from what they mine, salvage, plunder and fence.

// ---- shared helpers
function xGS(P){P=P||S.player;return P.gs||(P.gs={ak:0,ore:0,ord:0,bf:0,sc:0,cr:0,dt:0,amb:0})}
function xPilotOfKey(k){if(!k||isMe(k))return S.player;return S.pilots&&S.pilots[k]||null}
function xKeyOf(P){if(!P||P===S.player)return pkey();for(const k in S.pilots||{})if(S.pilots[k]===P)return k;return pkey()}
const X_SIDES=['halcyon','varkesh','ostrova','brood','pirate'];
function xSideName(s){return s==='brood'?'The Brood':s==='pirate'?'The Unbound':sideName(s)}

// ============================================================ 1. the debrief: a record of the galaxy for the end screen
const HIST_EVERY=60,OWN_C={halcyon:'h',varkesh:'v',ostrova:'o',brood:'b',pirate:'p',neutral:'n',player:'y'},C_OWN={h:'halcyon',v:'varkesh',o:'ostrova',b:'brood',p:'pirate',n:'neutral',y:'player'};
function histOf(){return S.hist||(S.hist={snaps:[],notes:[],last:{}})}
function histNote(text,w,sid,side){if(!S||NET.cl)return;const H=histOf();H.notes.push({t:Math.round(S.T),text,w:w||1,sid:sid||null,side:side||null});if(H.notes.length>260)H.notes.splice(0,H.notes.length-260)}
function histSnap(){const H=histOf();H.snaps.push({t:Math.round(S.T),o:SECTOR_DEFS.map(d=>OWN_C[sectorOwner(d.id)]||'.').join('')});if(H.snaps.length>400)H.snaps.splice(1,1)}
function histCounts(o){const n={};for(const ch of o){let s=C_OWN[ch];if(!s||s==='neutral'||s==='pirate')continue;if(s==='player')s=S.player.faction;n[s]=(n[s]||0)+1}return n}
function histTick(){if(NET.cl||!S)return;const H=histOf(),L=H.last;
  if(!H.snaps.length||S.T-H.snaps[H.snaps.length-1].t>=HIST_EVERY)histSnap();
  // the race: who leads, who starts the hold, who loses it, when the others gang up
  const n=controlCounts();let lead=null,lv=0;for(const k in n)if(n[k]>lv){lv=n[k];lead=k}
  if(lead&&lead!==L.lead&&lv>=4&&!(L.lead&&(n[L.lead]||0)===lv)){histNote(`${xSideName(lead)} took the lead with ${lv} systems.`,2,null,lead);L.lead=lead}
  const vs=S.victory&&S.victory.side||null;if(vs&&vs!==L.vic&&S.T-S.victory.since>=30){if(L.vic)histNote(`${xSideName(L.vic)} lost its grip on the galaxy.`,4,null,L.vic);H.notes.push({t:Math.round(S.victory.since),text:`${xSideName(vs)} began the ${VIC_NEED}-system hold.`,w:5,sid:null,side:vs});L.vic=vs}else if(!vs&&L.vic){histNote(`${xSideName(L.vic)} lost its grip on the galaxy.`,4,null,L.vic);L.vic=null}
  const cl=S.coal&&S.coal.lead||null;if(cl!==L.coalP){L.coalP=cl;L.coalT=S.T}if(cl&&cl!==L.coal&&S.T-L.coalT>=30){histNote(`The other powers called a truce against ${cl==='brood'?'the Brood':xSideName(cl)}.`,4,null,cl);L.coal=cl}else if(!cl&&L.coal&&S.T-L.coalT>=30)L.coal=null
  for(const f in S.yards||{}){if(f==='pirate'||f==='brood'||(L.yd||{})[f])continue;(L.yd=L.yd||{})[f]=1;if(FAC_IDS.includes(f))histNote(`${xSideName(f)} completed a capital shipyard.`,2,S.yards[f].sector,f)}}
// hooks that write the big moments into the record
{const o=captureDepot;captureDepot=function(sid,side){const R=S.stations[sid],prev=R&&R.owner;const r=o.apply(this,arguments);const R2=S.stations[sid];if(R2&&prev&&R2.owner!==prev)histNote(`${xSideName(R2.owner)} captured the depot in ${DEF[sid].name} from ${xSideName(prev)}.`,3,sid,R2.owner);return r}}
{const o=razeStation;razeStation=function(sid,by){const R=S.stations[sid],nm=R&&R.name,own=R&&R.owner,k=R&&R.kind;const r=o.apply(this,arguments);if(R&&!S.stations[sid])histNote(`${nm} was destroyed${by?' by '+(by==='brood'?'the Brood':xSideName(by)):''}.`,k==='free'?4:own==='brood'?1.5:3,sid,by||null);return r}}
{const o=capture;capture=function(oo,side){const prev=oo&&oo.owner;const r=o.apply(this,arguments);if(oo&&oo.owner!==prev)histNote(`${oo.owner==='player'?'You':xSideName(oo.owner)} took ${oo.name}${prev?' from '+xSideName(prev):''}.`,oo.type==='forge'||oo.type==='relay'?2:1.5,oo.sector,oo.owner);return r}}
function xCapWho(t){return t.side==='player'?'Your':t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].name+'\'s':t.side==='brood'?'The Brood':xSideName(t.side)}
{const o=killFrigateToken;killFrigateToken=function(t,how){if(t)histNote(`${xCapWho(t)} ${t.side==='brood'?broodCap(t):capName(t)} ${t.side==='brood'?'':t.name+' '}was destroyed in ${DEF[t.sector].name}.`,isCar(t)?5:3,t.sector,t.side);if(t&&t.side==='pirate')pirLost(t);return o.apply(this,arguments)}}
{const o=killShip;killShip=function(e,src,at){if(e&&e.role==='frigate'&&e.tok&&e.alive){const t=e.tok;histNote(`${xCapWho(t)} ${t.side==='brood'?broodCap(t):capName(t)} ${t.side==='brood'?'':t.name+' '}was destroyed in ${DEF[W.sid].name}.`,isCar(t)?5:3,W.sid,t.side);if(t.side==='pirate')pirLost(t)}
  if(e&&e.aceId&&e.alive)aceKilled(e,src,at);return o.apply(this,arguments)}}
{const o=makeCarrier;makeCarrier=function(side,sector){const t=o.apply(this,arguments);if(t&&!S.training)histNote(`${t.owner?(S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].name:'A pilot'):xSideName(side)} launched the carrier ${t.name}.`,side==='pirate'?3:2,sector,side);return t}}
{const o=makeEscort;makeEscort=function(side,sector){const t=o.apply(this,arguments);if(t&&!S.training&&side==='pirate')histNote(`The Unbound launched the escort ${t.name}.`,2,sector,side);return t}}
// pilot stats: credits earned, orders, beacons, deaths, ore (counted from the hold while the laser runs)
{const o=transfer;transfer=function(from,to,n){const got=o.apply(this,arguments);if(got>0&&S&&S.player){if(to==='player'&&from!=='player')xGS().cr+=got}return got}}
{const o=legBonus;legBonus=function(k,f,what,fr){if(what==='an Order'){const P=xPilotOfKey(k);if(P)xGS(P).ord+=(fr==null?1:Math.min(1,fr))}return o.apply(this,arguments)}}
{const o=beaconFlip;beaconFlip=function(sid,side,by){if(by){const P=xPilotOfKey(by);if(P)xGS(P).bf++}return o.apply(this,arguments)}}
{const o=playerDeath;playerDeath=function(p0){xGS().dt++;const p=p0||(W&&W.player);if(p&&p.lastAce&&W&&W.t-p.lastAce.t<6)aceScored(p.lastAce.id,pkey());return o.apply(this,arguments)}}
function xOreTick(){if(NET.cl||!W)return;const L=[];if(W===LW&&W.player)L.push([W.player,S.player]);for(const e of W.ents)if(e.rp&&S.pilots&&S.pilots[e.rp])L.push([e,S.pilots[e.rp]]);
  for(const[e,P]of L){let m=0;for(const k of RAWS)m+=P.cargo[k]||0;if(e.mining&&P._ore!=null&&m>P._ore)xGS(P).ore+=m-P._ore;P._ore=m}}

// ---- the debrief screen
function dbTurning(){const H=histOf(),win=S.won,sc=n=>n.w+(win&&n.side===win?.6:0),last=new Map();for(const n of H.notes)if(n.w>=3&&!n.won)last.set(n.text,n);const L=[...last.values()].sort((a,b)=>sc(b)-sc(a)||b.t-a.t),out=[];
  const T1=Math.max(1,S.T),ok=n=>!out.some(o=>Math.abs(o.t-n.t)<150);for(let k=0;k<3;k++){const n=L.find(x=>x.t>=T1*k/3&&x.t<T1*(k+1)/3&&ok(x)&&sc(x)>=3.5);if(n)out.push(n)}
  for(const n of L){if(out.length>=3)break;if(!out.includes(n)&&ok(n))out.push(n)}return out.sort((a,b)=>a.t-b.t)}
function dbAwards(L){const cats=[['kills','Top gun','most kills',P=>P.kills||0,1],['ak','Ace slayer','enemy aces downed',P=>xGS(P).ak,1],['ore','Prospector','tonnes mined',P=>Math.round(xGS(P).ore),40],['ord','Quartermaster','orders delivered',P=>Math.round(xGS(P).ord*10)/10,1],['scout','Pathfinder','beacons flipped and signals scanned',P=>xGS(P).bf+xGS(P).sc,2],['cr','Paymaster','credits earned',P=>xGS(P).cr,1500]];
  const aw=new Map(L.map(P=>[P,[]]));for(const[k,nm,why,f,min]of cats){let best=null,bv=0;for(const P of L){const v=f(P);if(v>bv){bv=v;best=P}}if(best&&bv>=min)aw.get(best).push({nm,why,v:bv,k})}
  if(L.length>1){let best=null,bv=1e9;for(const P of L){const d=xGS(P).dt;if(d<bv){bv=d;best=P}}if(best&&bv<=1)aw.get(best).push({nm:'Survivor',why:bv?'one loss all galaxy':'never shot down',v:bv})}return aw}
function dbHtml(side,how){const H=histOf(),tp=dbTurning(),pf=S.player.faction,L=allPilots().filter(P=>P&&P.name!==undefined||P===S.player),aw=dbAwards(L);
  const dur=fmtT(S.T),won=side===pf;
  let h=`<div class="dbf"><div class="dbh"><span>Galaxy debrief</span><em>${dur} of play · ${H.snaps.length} snapshots · ${H.notes.length} events</em></div>`;
  h+=`<div class="dbgrid"><div class="dbmapw"><canvas id="dbMap" aria-label="Territory map at the selected time"></canvas><div class="dbsl"><button class="btn sm" id="dbPlay" type="button">Play</button><input id="dbSl" type="range" min="0" max="${Math.max(0,H.snaps.length-1)}" value="${Math.max(0,H.snaps.length-1)}" aria-label="Scrub the galaxy timeline"><b id="dbT">${dur}</b></div></div>`;
  h+=`<div class="dbside"><div class="dbst">Systems held</div><canvas id="dbChart" aria-label="Systems held by each power over time"></canvas><div class="dbleg">${['halcyon','varkesh','ostrova','brood'].map(f=>`<span><i style="background:${sideCol(f)}"></i>${f==='brood'?'Brood':FACTIONS[f].short}</span>`).join('')}</div>`;
  h+=`<div class="dbst" style="margin-top:12px">Turning points</div>${tp.length?tp.map((n,i)=>`<button class="dbtp" type="button" data-t="${n.t}"><b>${i+1}</b><span>${esc(n.text)}</span><em>${fmtT(n.t)}</em></button>`).join(''):'<div class="dbnone">A quiet galaxy: no big swings were recorded.</div>'}</div></div>`;
  h+=`<div class="dbst" style="margin-top:14px">Pilots</div><div class="dbtw"><table class="dbt"><thead><tr><th>Pilot</th><th class="r">Kills</th><th class="r">Aces</th><th class="r">Ore t</th><th class="r">Orders</th><th class="r">Beacons · scans</th><th class="r">Credits earned</th><th class="r">Losses</th></tr></thead><tbody>`;
  for(const P of L){const g=xGS(P);h+=`<tr><td><b style="color:${sideCol(P.faction)}">${esc(P.name||'You')}</b>${P===S.player?' <span class="dbyou">you</span>':''}<div class="dbaw">${(aw.get(P)||[]).map(a=>`<span title="${esc(a.why)}">★ ${esc(a.nm)}</span>`).join('')}</div></td><td class="r">${fmt(P.kills||0)}</td><td class="r">${g.ak}</td><td class="r">${fmt(g.ore)}</td><td class="r">${Math.round(g.ord*10)/10}</td><td class="r">${g.bf} · ${g.sc}</td><td class="r">${fmt(g.cr)}</td><td class="r">${g.dt}</td></tr>`}
  h+=`</tbody></table></div>`;
  const ev=H.notes.slice().sort((a,b)=>b.t-a.t);h+=`<details class="dbev"><summary>Every recorded event (${ev.length})</summary>${ev.map(n=>`<button class="dbe" type="button" data-t="${n.t}"><em>${fmtT(n.t)}</em><span${n.side?` style="border-color:${sideCol(n.side)}"`:''}>${esc(n.text)}</span></button>`).join('')}</details></div>`;
  return h}
let dbIdx=0,dbPlayT=null;
function dbAt(t){const H=histOf();let b=0;for(let i=0;i<H.snaps.length;i++)if(H.snaps[i].t<=t)b=i;return b}
function dbCanvas(cv){const r=cv.getBoundingClientRect(),w=Math.max(10,r.width),h=Math.max(10,r.height);cv.width=w*DPR;cv.height=h*DPR;const c=cv.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);return[c,w,h]}
function dbDrawMap(){const cv=$('dbMap');if(!cv)return;const H=histOf(),sn=H.snaps[dbIdx];const[c,w,h]=dbCanvas(cv);c.fillStyle='#05080f';c.fillRect(0,0,w,h);if(!sn)return;
  const XY=d=>{const pad=22,sz=Math.min(w,h)-pad*2,ox=(w-sz)/2,oy=(h-sz)/2;return[ox+d.x*sz,oy+d.y*sz]};
  c.strokeStyle='rgba(54,67,95,.7)';c.lineWidth=1;for(const[a,b]of LINKS){const A=XY(DEF[a]),B=XY(DEF[b]);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}
  SECTOR_DEFS.forEach((d,i)=>{const[x,y]=XY(d),ch=sn.o[i],ow=C_OWN[ch],col=ow?(ow==='player'?PLAYER_COL:sideCol(ow)):'#2a3248',r=d.kind==='void'?5:d.kind==='core'?9:7;
    c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=ow?col:'#0c1222';c.fill();c.lineWidth=1.4;c.strokeStyle=ow?'rgba(5,7,13,.9)':col;c.stroke();
    if(d.kind!=='void'){c.fillStyle='rgba(236,228,207,.72)';c.font='500 9.5px "Saira Semi Condensed",sans-serif';c.textAlign='center';c.fillText(d.name,x,y+r+11)}});
  // what happened around this moment
  const t0=sn.t,near=H.notes.filter(n=>n.sid&&n.t>t0-HIST_EVERY&&n.t<=t0+1);for(const n of near){const d=DEF[n.sid];if(!d)continue;const[x,y]=XY(d);c.strokeStyle='#f0b24a';c.lineWidth=2;c.beginPath();c.arc(x,y,13,0,TAU);c.stroke()}
  const tl=$('dbT');if(tl)tl.textContent=fmtT(t0);dbDrawChart()}
function dbDrawChart(){const cv=$('dbChart');if(!cv)return;const H=histOf();const[c,w,h]=dbCanvas(cv);c.clearRect(0,0,w,h);const N=H.snaps.length;if(N<2)return;
  const T1=H.snaps[N-1].t||1,mx=Math.max(VIC_NEED+1,...H.snaps.map(s=>Math.max(0,...Object.values(histCounts(s.o))))),X=t=>8+(w-16)*t/T1,Y=v=>h-14-(h-22)*v/mx;
  c.strokeStyle='rgba(240,178,74,.35)';c.setLineDash([3,4]);c.beginPath();c.moveTo(8,Y(VIC_NEED));c.lineTo(w-8,Y(VIC_NEED));c.stroke();c.setLineDash([]);
  c.fillStyle='rgba(140,145,165,.9)';c.font='10px "JetBrains Mono",monospace';c.textAlign='left';c.fillText(`${VIC_NEED} to win`,10,Y(VIC_NEED)-4);
  for(const f of['halcyon','varkesh','ostrova','brood']){c.strokeStyle=sideCol(f);c.lineWidth=2;c.beginPath();H.snaps.forEach((s,i)=>{const v=histCounts(s.o)[f]||0,x=X(s.t),y=Y(v);if(i)c.lineTo(x,y);else c.moveTo(x,y)});c.stroke()}
  for(const n of dbTurning()){c.fillStyle='#f0b24a';c.beginPath();c.arc(X(n.t),h-7,3.5,0,TAU);c.fill()}
  const ct=H.snaps[dbIdx]?H.snaps[dbIdx].t:0;c.strokeStyle='rgba(236,228,207,.8)';c.lineWidth=1;c.beginPath();c.moveTo(X(ct),4);c.lineTo(X(ct),h-12);c.stroke()}
function dbSet(i){const H=histOf();dbIdx=clamp(i|0,0,Math.max(0,H.snaps.length-1));const sl=$('dbSl');if(sl&&+sl.value!==dbIdx)sl.value=dbIdx;dbDrawMap()}
function renderDebrief(side,how){const box=$('dbBox');if(!box||!S)return;try{if(!histOf().snaps.length||S.T-histOf().snaps[histOf().snaps.length-1].t>5)histSnap();box.innerHTML=dbHtml(side,how);dbIdx=histOf().snaps.length-1;
  const sl=$('dbSl');if(sl)sl.addEventListener('input',()=>{if(dbPlayT){clearInterval(dbPlayT);dbPlayT=null;$('dbPlay').textContent='Play'}dbSet(+sl.value)});
  const pb=$('dbPlay');if(pb)pb.addEventListener('click',()=>{if(dbPlayT){clearInterval(dbPlayT);dbPlayT=null;pb.textContent='Play';return}if(dbIdx>=histOf().snaps.length-1)dbSet(0);pb.textContent='Pause';dbPlayT=setInterval(()=>{if(dbIdx>=histOf().snaps.length-1){clearInterval(dbPlayT);dbPlayT=null;pb.textContent='Play';return}dbSet(dbIdx+1)},140)});
  box.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>dbSet(dbAt(+b.dataset.t))));
  requestAnimationFrame(()=>dbSet(dbIdx))}catch(e){box.innerHTML='';frameErr('debrief',e)}}
addEventListener('resize',()=>{if($('win')&&!$('win').hidden&&$('dbMap'))dbDrawMap()});
{const o=galaxyWon;galaxyWon=function(side,how){if(S&&!NET.cl&&!S.won)histNote(`${xSideName(side)} won the galaxy.`,6,null,side),histOf().notes[histOf().notes.length-1].won=1;const r=o.apply(this,arguments);renderDebrief(side,how);return r}}
{const o=$('bNext');if(o)o.addEventListener('click',()=>{if(dbPlayT){clearInterval(dbPlayT);dbPlayT=null}},true)}

// ============================================================ 2. named aces: veteran pilots with a memory
// Each power fields three named aces (the Unbound two captains). Kill enough of a side's ships and its aces take an interest:
// once one has your name it comes through a gate with its wing to hunt you. Aces fly tuned ships, shoot straighter, carry
// a big bounty, and remember: who killed whom carries over between galaxies on this device.
// an ace's price starts above a carrier's (the biggest bounty in the game) and grows 600 with every pilot it kills, to ACE_CAP
const ACE_BOUNTY=3500,ACE_CAP=8400;const aceBase=side=>Math.round(ACE_BOUNTY*(side==='pirate'?PIRATE_MUL:1));
const ACE_KEY='driftgate.aces.v1',ACE_HEAT=10,ACE_BACK=900,ACE_HUNT=300,ACE_MIN_T=480;
const ACE_NAMES={halcyon:[['Seren Vale','Lantern'],['Imre Castell','Gilt'],['Odile Marchetti','Ledger'],['Aurel Faine','Tithe'],['Cassia Lund','Halo'],['Pell Ostrander','Mint']],
  varkesh:[['Kallo Vire','Ironjaw'],['Teodor Raskin','Anvil'],['Mirela Dusk','Hound'],['Brannoc Teague','Rampart'],['Ysa Korbel','Spike'],['Gorran Ultz','Siegebell']],
  ostrova:[['Ysolde Ahn','Psalm'],['Brother Quill','Censer'],['Nadia Orlov','Vesper'],['Ilya Merrow','Rosary'],['Sister Tamsin','Lumen'],['Oren Valk','Hymn']],
  pirate:[['Red Mag Tolliver','Red Mag'],['Old Sorrel','Sorrel'],['Jink Harrow','Jink'],['Cutter Bess','Bess'],['Saint Gutter','Saint']]};
const ACE_CLS={halcyon:['striker','interceptor'],varkesh:['heavy','striker'],ostrova:['striker','heavy'],pirate:['striker','heavy']};
const ACE_TAUNT=['That one is mine. Tell your command.','Fly better next time, pilot.','I keep a list. You are on it twice now.','Scrap. Somebody sweep that up.','You hesitated.'];
const ACE_LAST=['Not like this—','Tell my wing… keep the list—','Good shot. Damn it.','I will be back for you.'];
function aceMem(){try{return JSON.parse(localStorage.getItem(ACE_KEY)||'{}')||{}}catch(e){return{}}}
function aceMemSave(){if(!S||!S.aces||NET.cl)return;try{const m={};for(const A of S.aces)(m[A.side]=m[A.side]||[]).push({n:A.name,nk:A.nick,k:A.vk||0,d:A.vd||0,r:A.ret?1:0});localStorage.setItem(ACE_KEY,JSON.stringify(m))}catch(e){}}
function aceNew(side,used){const pool=ACE_NAMES[side].filter(x=>!used.has(x[0]));const nm=pool.length?pick(pool):pick(ACE_NAMES[side]);used.add(nm[0]);
  return{id:'A'+(S.nextId++),side,name:nm[0],nick:nm[1],cls:pick(ACE_CLS[side]),alive:true,back:0,k:0,d:0,vk:0,vd:0,heat:{},out:null,bounty:aceBase(side)}}
function aceInit(){if(!S||S.aces||NET.cl)return;const m=aceMem(),used=new Set();S.aces=[];
  for(const side of['halcyon','varkesh','ostrova','pirate']){const want=side==='pirate'?2:3,keep=(m[side]||[]).filter(x=>!x.r).slice(0,want);
    for(const r of keep){const A=aceNew(side,used);if(ACE_NAMES[side].some(x=>x[0]===r.n)){used.delete(A.name);A.name=r.n;A.nick=r.nk;used.add(r.n)}A.vk=r.k||0;A.vd=r.d||0;A.bounty+=600*A.vk;S.aces.push(A)}
    while(S.aces.filter(a=>a.side===side).length<want)S.aces.push(aceNew(side,used))}}
function aceLabel(A){return`${A.name.includes(A.nick)?A.name:`${A.name.split(' ')[0]} “${A.nick}” ${A.name.split(' ').slice(1).join(' ')}`}`}
function aceById(id){return(S.aces||[]).find(a=>a.id===id)||null}
function aceWho(A){return A.side==='pirate'?'Unbound captain':`${FACTIONS[A.side].short} ace`}
function aceEnts(){const L=[];for(const sid in WORLDS)for(const e of WORLDS[sid].ents)if(e.aceId&&e.alive)L.push([e,WORLDS[sid]]);return L}
// a veteran: the wing lead gets tuned systems, more armour and a steadier aim (tier drives NPC aim error)
function aceBoost(e,A){const st=shipStats(e.side==='pirate'?null:e.side,e.cls,3,1);st.hull*=2.2;st.sCap*=1.6;st.dmg*=1.3;st.turn*=1.12;st.maxSpd*=1.06;st.thrust*=1.1;
  e.st=st;e.hull=st.hull;e.shield=st.sCap;e.energy=st.eCap;e.tier=4;e.tuned=1;e.aceId=A.id;e.pname=`★ ${aceLabel(A)}`;A.cls=e.cls}
function aceWing(A){const side=A.side,role=side==='pirate'?'pirate':'raider',srcs=[S.econ.fleet[side],S.econ.stock[side]].filter(Boolean),tier=side==='pirate'?pirateTier():factionTier(side);
  const gs=GATES[W.sid].filter(x=>!S.gateDown[gateKey(W.sid,x.to)]),gate=gs.length?pick(gs):pick(GATES[W.sid]),g={id:'g'+(RID++),side,role,members:[],n0:0,fleeing:false};
  for(let i=0;i<3;i++){const cls=i?pickFighter(role):A.cls;let kit=carKit(cls);if(!takeFrom(kit,srcs)){const v=invVec(kit),raw={};for(const k of RAWS)if(v[k]>0)raw[k]=Math.ceil(v[k]);kit=raw;if(!takeFrom(kit,srcs)){if(!i)return null;break}}if(haveIn({missile:2},srcs)){takeFrom({missile:2},srcs);kit.missile=2}
    const e=makeNPC(role,side,cls,tier,kit,'stock:'+side),o=rdir();e.x=gate.x*.93+o.x*70;e.y=gate.y*.93+o.y*70;e.z=gate.z*.93+o.z*70;faceInstant(e,-e.x,-e.y,-e.z);fxWarp(e,sideCol(side));e.grp=g;e.slot=i;g.members.push(e);W.ents.push(e)}
  g.n0=g.members.length;W.groups[g.id]=g;return g}
// the target panel line for an ace (clients only have the name from the snapshot, so match on that too)
function aceOfEnt(T){if(!T||!S.aces)return null;if(T.aceId)return aceById(T.aceId);if(T.pname&&String(T.pname).startsWith('★'))return S.aces.find(A=>T.pname==='★ '+aceLabel(A))||null;return null}
function aceTgtLine(T){const A=aceOfEnt(T);if(!A)return'';return`<div class="ts" style="color:var(--amber)">★ ${esc(aceWho(A))} · bounty ${fmt(A.bounty)} cr${A.vk||A.vd?` · you: ${A.vd} down, ${A.vk} lost`:''}</div>`}
function aceAvail(side){return(S.aces||[]).filter(A=>A.side===side&&A.alive&&!A.out&&!A.ret)}
// sometimes an ace simply leads an ordinary wing, so you meet them before they hunt you
let xNoAce=false;
function aceMaybeLead(g,role,side){if(xNoAce||!S.aces||NET.cl||S.T<300||!['raider','patrol','pirate','strike'].includes(role))return;if(Math.random()>.07)return;const L=aceAvail(side);if(!L.length)return;
  const A=pick(L),e=g.members[0];if(!e)return;aceBoost(e,A);A.out={sid:W.sid,live:1,casual:1,T:S.T};aceMet(A)}
function aceMet(A){if(W!==LW||!hostile(S.player.faction,A.side))return;const rec=A.vk||A.vd?` Your record: ${A.vd} down, ${A.vk} lost to them.`:'';feed(`★ ${aceWho(A)} ${aceLabel(A)} is flying in ${DEF[W.sid].name}. Bounty ${fmt(A.bounty)} cr.${rec}`,'warn')}
function aceHeat(e,k,x){if(!S.aces||!k||k==='_ai')return;const L=S.aces.filter(A=>A.side===e.side&&!A.ret);if(!L.length)return;
  const w=e.role==='frigate'?6:e.grp&&e.grp.members.some(m=>m.aceId)?4:e.role==='miner'||e.role==='hauler'||e.role==='trader'?.6:1;for(const A of L)A.heat[k]=(A.heat[k]||0)+w*x}
// bounty shares for an ace go to everyone who hurt it, like any kill; the record goes to whoever did the most
function aceKilled(e,src,at){const A=aceById(e.aceId);if(!A)return;const D=e.dmg||{},kp=at&&at.src&&at.src.rp,killer=kp||(src==='player'?'me':null);let tot=0;for(const k in D)tot+=D[k];
  const sh={};for(const k in D)if(k!=='_ai'&&tot>0&&D[k]/tot>=.05)sh[k]=D[k]/tot;if(killer&&!(tot>0))sh[killer]=1;let top=null,tv=0;for(const k in sh)if(sh[k]>tv){tv=sh[k];top=k}
  for(const k in sh)runAs(isMe(k)?null:k,()=>{const f=S.player.faction;if(!hostile(f,A.side))return;const got=transfer(f,'player',Math.round(A.bounty*sh[k]));if(k===top)xGS().ak++;
    feed(`★ Ace down: ${aceLabel(A)} (${aceWho(A)}). ${got?`Bounty +${fmt(got)} cr${sh[k]<.995?` for ${Math.round(sh[k]*100)}% of the damage`:''}.`:''} “${pick(ACE_LAST)}”`,'good')});
  const byP=top?xPilotOfKey(top):null;if(top&&isMe(top))A.vd++;
  histNote(`${aceWho(A)} ${aceLabel(A)} was shot down${byP?' by '+(byP.name||'you'):''} in ${DEF[W.sid].name}.`,byP?3:1.5,W.sid,A.side);
  aceDown(A)}
function aceDown(A){A.d++;A.alive=false;A.out=null;A.heat={};A.back=S.T+ACE_BACK;if(A.d>=2){A.ret=1;const used=new Set(S.aces.map(a=>a.name)),N=aceNew(A.side,used);N.back=S.T+ACE_BACK;N.alive=false;S.aces.push(N);
  if(friendSide(A.side)||hostile(S.player.faction,A.side))feed(`★ ${aceLabel(A)} has flown their last sortie. ${xSideName(A.side)} names ${aceLabel(N)} to replace them.`,'news')}aceMemSave()}
function aceScored(id,k){const A=aceById(id);if(!A)return;A.k++;A.bounty=Math.min(ACE_CAP,A.bounty+600);if(isMe(k))A.vk++;const P=xPilotOfKey(k);
  keyFeed(k,`★ ${aceLabel(A)}: “${pick(ACE_TAUNT)}” Their bounty rises to ${fmt(A.bounty)} cr.`,'bad');histNote(`${aceWho(A)} ${aceLabel(A)} shot down ${P&&P.name?P.name:'a pilot'}.`,2,P&&P.sector,A.side);aceMemSave()}
{const o=damageShip;damageShip=function(e,dmg,srcSide,at,kind){if(e&&(e.isPlayer||e.rp)&&at&&at.src&&at.src.aceId&&W)e.lastAce={id:at.src.aceId,t:W.t};return o.apply(this,arguments)}}
{const o=payKill;payKill=function(e,src,at){try{const D=e.dmg||{},kp=at&&at.src&&at.src.rp,killer=kp||(src==='player'?'me':null);let tot=0;for(const k in D)tot+=D[k];const seen=new Set();
  for(const k in D)if(k!=='_ai'&&tot>0&&D[k]/tot>=.05){const P=xPilotOfKey(k);if(P&&hostile(P.faction,e.side)){aceHeat(e,k,D[k]/tot);seen.add(k)}}if(killer&&!seen.size){const P=xPilotOfKey(killer);if(P&&hostile(P.faction,e.side))aceHeat(e,killer,1)}}catch(err){}
  return o.apply(this,arguments)}}
function pilotEntIn(w,k){if(isMe(k))return w===LW&&!NET.cl?w.player:null;return w.ents.find(e=>e.rp===k&&e.alive)||null}
function aceTick(){if(NET.cl||!S||S.training)return;aceInit();
  for(const A of S.aces){if(A.ret)continue;for(const k in A.heat){A.heat[k]*=.97;if(A.heat[k]<.2)delete A.heat[k]}
    if(!A.alive){if(S.T>=A.back){A.alive=true;A.out=null;if(hostile(S.player.faction,A.side)&&A.d>0)feed(`★ ${aceLabel(A)} is flying again for ${xSideName(A.side)}.`,'news')}continue}
    if(A.out&&A.out.live){if(!aceEnts().some(([e])=>e.aceId===A.id)){A.out=null;for(const k in A.heat)A.heat[k]*=.5}continue}
    if(A.out&&!A.out.live){const o=A.out,P=xPilotOfKey(o.k);if(!P||S.T>o.give){A.out=null;continue}if(P.sector!==o.sid){o.sid=P.sector;o.at=Math.max(o.at,S.T+20)}
      if(S.T<o.at)continue;const w=WORLDS[o.sid];if(!w||P.docked||aceBarred(A,o.sid)){o.at=S.T+15;continue}
      let g=null;inW(w,()=>{xNoAce=true;try{g=aceWing(A);if(g){const e=g.members[0];aceBoost(e,A);const T=pilotEntIn(w,o.k);for(const m of g.members){if(T){m.ai.hunt=T;m.ai.huntUntil=W.t+ACE_HUNT;m.ai.tgt=T}if(m.lurk||m.ai.lurkGo){delete m.lurk;delete m.ai.lurkGo;m.stealth=false;m.masked=false;m.maskR=0}}}}finally{xNoAce=false}});
      if(g){o.live=1;keyFeed(o.k,`★ ${aceWho(A)} ${aceLabel(A)} has jumped into ${DEF[o.sid].name} with ${g.members.length-1} wingmen. They're here for you.`,'bad');if(isMe(o.k))flash(`★ ${aceLabel(A)} is hunting you`,true)}else o.at=S.T+20;continue}
    if(S.T<ACE_MIN_T)continue;let best=null,bv=ACE_HEAT;for(const k in A.heat)if(A.heat[k]>=bv){const P=xPilotOfKey(k);if(P&&hostile(P.faction,A.side)){bv=A.heat[k];best=k}}
    if(best&&!S.aces.some(o=>o!==A&&o.out&&o.out.k===best)){const P=xPilotOfKey(best);if(!P||aceBarred(A,P.sector))continue;A.out={k:best,sid:P.sector,at:S.T+rnd(30,70),give:S.T+600};
      keyFeed(best,`★ Word on the band: ${aceWho(A)} ${aceLabel(A)} has your name. Expect company.`,'warn')}}}
// aces don't follow you into your own core system (its guns are too much); Unbound captains keep out of faction space altogether
function aceBarred(A,sid){const d=DEF[sid];if(!d)return true;if(A.side==='pirate'&&d.home)return true;if(d.home&&d.kind==='core'&&d.home!==A.side)return true;return false}
function aceWantedHtml(P){if(!S.aces)return'';const L=S.aces.filter(A=>!A.ret&&hostile(P.faction,A.side));if(!L.length)return'';
  return`<div class="h3" style="margin-top:16px">Wanted: enemy aces</div><p class="note" style="margin:0 0 8px">Named veterans with a price on them. Kill enough of a side's ships and one of its aces comes looking for you. Bounties are paid to everyone who damaged the ace, like any kill.</p><table class="dbt"><tbody>${L.map(A=>{const hunt=A.out&&A.out.k===pkey(),st=!A.alive?`down · back in ${fmtT(Math.max(0,A.back-S.T))}`:hunt?'<b style="color:var(--danger)">hunting you</b>':A.out&&A.out.live?'flying':'on station';const heat=Math.round(Math.min(100,(A.heat[pkey()]||0)/ACE_HEAT*100));
    return`<tr><td><b style="color:${sideCol(A.side)}">★ ${esc(aceLabel(A))}</b><br><span class="mass">${esc(aceWho(A))} · ${esc(hullName(A.side,A.cls))}${A.vk||A.vd?` · you: ${A.vd} down, ${A.vk} lost`:''}</span></td><td>${st}${heat>0&&A.alive&&!hunt?`<br><span class="mass">their interest in you: ${heat}%</span>`:''}</td><td class="r num">${fmt(A.bounty)} cr</td></tr>`}).join('')}</tbody></table>`}
{const o=missionsHtml;missionsHtml=function(c,P,srcs){let h=o.apply(this,arguments);try{h+=aceWantedHtml(P)}catch(e){}return h}}

// ============================================================ 4. anomalies in quiet space
// The nine quiet systems hold faint signals only a scout's long-range radar picks up. Hold within range to scan one:
// a derelict cache, a fragment of the Bloom logs, a drifting Aurorite shard, or (rarely) a lost capital hulk for miners.
// Every gram of what they hold comes out of the outer drift and drifting debris, the recycling pools the ledger already keeps.
const ANOM_R=320,ANOM_T=8,ANOM_LIFE=1500,ANOM_MAX=2,ANOM_FEE=120,HULK_LIFE=900;
const ANOM_KIND={cache:4,log:3,shard:1.8,hulk:1.2};
const LORE=['Gatewright’s log: the rings were never ours. We found them already humming, already cold, already counting.',
  'Archive fragment, Ostrova: the first Bloom spore was catalogued as ‘inert mineral, faintly warm’. The cataloguer died that winter.',
  'Varkesh field order 12: no ore leaves the line. If the rock is not mined, it is not ours. If it is not ours, it is theirs.',
  'Halcyon charter, clause 1: every credit owed is a credit lent. The ledger balances or the house falls.',
  'Unsigned: the Brood doesn’t eat stations. It eats what the stations were made of, and remembers the shape.',
  'Freeport memo: neutral is not a flag. Neutral is a price, and the price keeps going up.',
  'Recovered audio: “…gate seventeen is singing again. If you hear it, don’t align. Do not align.”',
  'Survey drone 4 last report: Vantium does not form. It arrives. Something is putting it there.',
  'Unbound graffiti on a hull plate: NOTHING IS CREATED. EVERYTHING IS TAKEN.',
  'Ostrova psalm, fourth verse: the dark between the gates is not empty, it is listening for the drift to settle.',
  'Med-bay note: the pilots who hug the rocks too long start to hear the ore. Rotate them out.',
  'Final entry, carrier Meridian: we jumped blind. The gate took us somewhere it thought we should be.'];
const LORE_KEY='driftgate.lore.v1';
function anomSects(){return SECTOR_DEFS.filter(d=>d.kind==='void').map(d=>d.id)}
function anomsIn(sid){return(S.anoms&&S.anoms[sid])||[]}
function anomPos(sid){const gs=GATES[sid];for(let k=0;k<30;k++){const p=randPos(700*SPACE,2600*SPACE);if(gs.some(g=>d3(g,p)<1200))continue;if(S.stations[sid]&&d3(S.stations[sid],p)<1500)continue;return p}return randPos(900*SPACE,2200*SPACE)}
function anomSpawn(sid){S.anoms=S.anoms||{};const L=S.anoms[sid]=S.anoms[sid]||[];if(L.length>=ANOM_MAX)return;const w={...ANOM_KIND};
  if(Object.values(S.anoms).some(a=>a.some(x=>x.kind==='hulk'))||driftMass()<220)delete w.hulk;const p=anomPos(sid);L.push({id:S.nextId++,kind:wpick(w),x:p.x,y:p.y,z:p.z,v:ri(0,7),born:S.T,until:S.T+ANOM_LIFE})}
function driftMass(){const D=S.drift||{};let m=0;for(const k of RAWS)m+=D[k]||0;for(const id in S.sectors){const d=S.sectors[id].debris;for(const k of RAWS)m+=d[k]||0}return m}
function anomTick(){if(NET.cl||!S||S.training)return;S.anoms=S.anoms||{};if(!S.anomInit){S.anomInit=1;for(const sid of anomSects())if(Math.random()<.7)anomSpawn(sid)}
  for(const sid of anomSects()){const L=S.anoms[sid]=(S.anoms[sid]||[]).filter(a=>S.T<a.until);if(L.length<ANOM_MAX&&Math.random()<(L.length?.006:.014))anomSpawn(sid)}}
function scoutSees(P){return!!P&&!P.docked&&(isScoutCls(P.cls)||P.cls==='wraith')}
function anomVisible(A){return!!(W&&W.player&&scoutSees(S.player)&&anomsIn(W.sid).includes(A))}
// take raw mass, up to n tonnes, out of the recycling pools the ledger already keeps: the outer drift first, then drifting
// debris (the signal's own system, the other quiet systems, then everywhere else)
function driftTake(n,only,sid){const ks=only||RAWS,got={};S.drift=S.drift||{fe:0,cu:0,ir:0,xc:0,au:0,nu:0};
  const pools=[S.drift,...(sid&&S.sectors[sid]?[S.sectors[sid].debris]:[]),...SECTOR_DEFS.filter(d=>d.kind==='void'&&d.id!==sid).map(d=>S.sectors[d.id].debris),...SECTOR_DEFS.filter(d=>d.kind!=='void'&&d.id!==sid).map(d=>S.sectors[d.id].debris)];let left=Math.round(n);
  for(const P of pools){if(left<=0)break;let tot=0;for(const k of ks)tot+=P[k]||0;if(tot<=0)continue;const want=Math.min(left,tot);for(const k of ks){const m=Math.min(P[k]||0,Math.round(want*(P[k]||0)/tot),left);if(m>0){P[k]-=m;got[k]=(got[k]||0)+m;left-=m}}}return got}
function partsFrom(o){let g=0;while(g++<400){if(haveIn(ITEMS.coil.recipe,[o])&&Math.random()<.35){takeFrom(ITEMS.coil.recipe,[o]);inv.add(o,'coil',1);continue}if((o.fe||0)>=3&&Math.random()<.6){takeFrom({fe:3},[o]);inv.add(o,'plate',1);continue}if((o.cu||0)>=3){takeFrom({cu:3},[o]);inv.add(o,'wire',1);continue}if((o.fe||0)>=3){takeFrom({fe:3},[o]);inv.add(o,'plate',1);continue}break}return o}
function anomOpen(sid,A,k,ent){const L=anomsIn(sid),i=L.indexOf(A);if(i<0)return;L.splice(i,1);const P=xPilotOfKey(k),f=P?P.faction:S.player.faction,nm=DEF[sid].name,s=S.sectors[sid];if(P)xGS(P).sc++;
  const fee=payKey(k,f,ANOM_FEE);let kind=A.kind,msg='';
  if(kind==='hulk'&&driftMass()<150)kind='cache';if(kind==='cache'&&driftMass()<20)kind='log';
  if(kind==='shard'){let o=driftTake(ri(30,70),['au'],sid);let m=o.au||0;if(m<15){for(const id of DEEP){const d=S.sectors[id].debris;const t=Math.min(d.au||0,70-m);if(t>0){d.au-=t;m+=t}if(m>=50)break}o={au:m}}
    if(m<10){if(m>0)S.drift.au=(S.drift.au||0)+m;o=driftTake(ri(30,60),['ir'],sid)}if(oreTotal({ore:o})<12){for(const q in o)S.drift[q]=(S.drift[q]||0)+o[q];kind='log'}else{const p=A;s.ast.push({id:S.nextId++,x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z),ore:o,seed:ri(1,1e9)});
    msg=`◇ Scan complete: ${o.au?'an Aurorite shard swept out of deep space':'an iridium-rich shard'} drifting in ${nm}, ${oreTotal({ore:o})} t. Any miner can cut it.`;kind='done'}}
  if(kind==='cache'){const o=partsFrom(driftTake(rnd(40,90),['fe','cu','ir'],sid));const x=driftTake(ri(2,6),['xc'],sid);inv.addAll(o,x);s.crates.push({id:S.nextId++,x:Math.round(A.x),y:Math.round(A.y),z:Math.round(A.z),inv:o,until:S.T+600,derelict:1});
    msg=`◇ Scan complete: a derelict cache in ${nm}. ${Object.keys(o).map(q=>`${o[q]} ${ITEMS[q].name}`).join(', ')}. Fly into it to scoop it.`}
  else if(kind==='log'){const n=ri(0,LORE.length-1);let got=0;if(isMe(k)){try{const m=JSON.parse(localStorage.getItem(LORE_KEY)||'[]');if(!m.includes(n)){m.push(n);localStorage.setItem(LORE_KEY,JSON.stringify(m))}got=m.length}catch(e){}}
    const pay=payKey(k,f,300);for(const t of S.frigates||[])if((t.side==='brood'||t.side==='pirate')&&hostile(f,t.side))capTrack(t,f);
    msg=`◇ Decoded fragment${got?` (${got} of ${LORE.length} in your archive)`:''}: “${LORE[n]}” The Archive pays ${fmt(pay)} cr, and the relay pattern in it gives away where every Brood and Unbound capital ship is for 5 minutes.`}
  else if(kind==='hulk'){const o=driftTake(rnd(170,260),null,sid);wreckMix(o);const big=Math.random()<.45,R=(big?120:70)*1.25,q=qNorm({x:rnd(-1,1),y:rnd(-1,1),z:rnd(-1,1),w:rnd(-1,1)}),pts=wreckPts(o,false),seen={},mf=pick(FAC_IDS);
    for(const p of pts){const Lo=WPT_OFF[p.k],n=seen[p.k]=(seen[p.k]||0)+1,off=Array.isArray(Lo[0])?Lo[n-1]||Lo[0]:Lo;qRot(q,off[0]*R,off[1]*R,off[2]*R,_bv1);Object.assign(p,{id:S.nextId++,wpt:1,x:Math.round(A.x+_bv1.x),y:Math.round(A.y+_bv1.y),z:Math.round(A.z+_bv1.z),heat:0,last:oreTotal(p),h0:oreTotal(p)})}
    const name=`lost ${big?'carrier':'escort'} “${pick(['Meridian','Long Vigil','Quiet Psalm','Ninth Ledger','Ember Saint','Grey Tithe'])}”`;
    const w={id:S.nextId++,cls:big?'carrier':'escort',mf,side:mf,name,x:Math.round(A.x),y:Math.round(A.y),z:Math.round(A.z),q,R,born:S.T,until:S.T+HULK_LIFE,pts};const bh=broodHops(sid);if(bh<=3)w.broodAt=S.T+[60,90,140,200][bh];w.broodN=2;(s.wrecks=s.wrecks||[]).push(w);
    const t=Math.round(vecMass(o));msg=`◇ Scan complete: the ${name} has been drifting in ${nm} since the last war. About ${fmt(t)} t of salvage, a third of it intact parts. Miners have ${HULK_LIFE/60} minutes to cut it.`;
    facFeed(f,`📡 Survey: ${P&&P.name?P.name:'a scout'} found the ${name} in ${nm}. About ${fmt(t)} t of salvage for any miner who gets there in the next ${HULK_LIFE/60} minutes.`,'info');histNote(`${P&&P.name?P.name:'A scout'} found the ${name} in ${nm}.`,2,sid,f)}
  keyFeed(k,msg+(fee?` Survey fee +${fmt(fee)} cr.`:''),'good');if(isMe(k)){SFX.count&&SFX.count(true);flash('Scan complete')}}
// scanning: every pilot in a scout, every frame, on the host (or single player)
function anomWorld(dt){if(NET.cl||!W||DEF[W.sid].kind!=='void')return;const L=anomsIn(W.sid);const ents=[];if(W===LW&&W.player&&W.player.alive)ents.push([W.player,S.player,pkey()]);for(const e of W.ents)if(e.rp&&e.alive&&S.pilots&&S.pilots[e.rp])ents.push([e,S.pilots[e.rp],e.rp]);
  for(const[e,P,k]of ents){if(!scoutSees(P)||!L.length){e.anS=null;continue}let A=null,bd=ANOM_R;for(const a of L){const d=d3(a,e);if(d<bd){bd=d;A=a}}
    if(!A){if(e.anS){e.anS.t=Math.max(0,e.anS.t-dt*2);if(!e.anS.t)e.anS=null}continue}if(!e.anS||e.anS.id!==A.id)e.anS={id:A.id,t:0};e.anS.t+=dt;
    if(e.anS.t>=ANOM_T){e.anS=null;anomOpen(W.sid,A,k,e)}}}
// a client shows its own scan progress (cosmetic: the host decides when it completes)
function anomLocal(dt){if(!NET.cl||!W||!W.player)return;const p=W.player,L=anomsIn(W.sid);let A=null,bd=ANOM_R;if(scoutSees(S.player))for(const a of L){const d=d3(a,p);if(d<bd){bd=d;A=a}}if(!A){p.anS=null;return}if(!p.anS||p.anS.id!==A.id)p.anS={id:A.id,t:0};p.anS.t=Math.min(ANOM_T,p.anS.t+dt)}
function anomPanel(T,dist){const p=W.player,sc=p&&p.anS&&p.anS.id===T.id?p.anS.t/ANOM_T:0;return`<div class="tp"><div class="tn" style="color:#6ff2cf">Unknown signal</div><div class="ts">A faint, irregular return out in quiet space. Could be anything the last war left behind.</div><div class="row">Range<b>${fmt(dist)} m</b></div>${sc>0?`<div class="row">Scan<b>${Math.round(sc*100)}%</b></div>`:''}<div class="ts">Hold within ${ANOM_R} m for ${ANOM_T} s to scan it (+${ANOM_FEE} cr survey fee).</div></div>`}
{const o=targetables;targetables=function(){const out=o.apply(this,arguments);if(W&&S&&scoutSees(S.player))for(const A of anomsIn(W.sid))out.push({kind:'anom',ref:A});return out}}
{const o=validTgt;validTgt=function(t){if(t&&t.kind==='anom')return anomVisible(t.ref);return o.apply(this,arguments)}}
{const o=tRad;tRad=function(t){if(t&&t.kind==='anom')return 30;return o.apply(this,arguments)}}
{const o=enterSector;enterSector=function(sid){const r=o.apply(this,arguments);try{const n=anomsIn(sid).length;if(n&&scoutSees(S.player))setTimeout(()=>{if(W&&W.sid===sid)feed(`◇ Long-range radar: ${n} unknown signal${n>1?'s':''} in ${DEF[sid].name}. Tab to target, then hold within ${ANOM_R} m to scan.`,'info')},1800)}catch(e){}return r}}

// ============================================================ the Unbound: an asteroid haven, a fleet that grows, ambushes from the rocks
// Unbound wings keep to space no faction calls home. Their capitals go further: they hunt the convoy lanes and the depots on
// the edges of faction space, frontier systems included (never a faction's core), and launch raids from wherever they are,
// pulling back to the haven to refit when their stores run dry or they are badly hurt. Their haven is an asteroid base in The Wrack: the rock itself, hollowed out. Its slipway builds an escort around the
// 25-minute mark, a second by 45, and a carrier after an hour, if they can mine, salvage, plunder and fence the parts.
const PIR_E1=1500,PIR_E2=2700,PIR_C=3900,PIR_REBUILD=600,PIR_LURK=.65,LURK_TRIG=850,LURK_RADAR=1600;
STN.haven={sMax:3000,hMax:9000,tur:6,dmg:14,range:1450};LS_RATE.haven=.6;
const PIR_ESC_NAMES=['Saucy Gull','Rum Runner','Widow\'s Grin','Bilge Rat','Cutlass Kate','Black Penny','Scurvy Dog','Gallows Bird'],PIR_CAR_NAMES=['The Drowned Crown','Queen of Scrap','Mother of Knives','Old Grog','Salt Saint'];
const PIR_OK=new Set(SECTOR_DEFS.filter(d=>d.kind!=='core'&&d.kind!=='hive').map(d=>d.id));
const HOPP={};for(const a of PIR_OK){const d={[a]:0},q=[a];while(q.length){const x=q.shift();for(const n of NEIGH[x])if(PIR_OK.has(n)&&d[n]===undefined){d[n]=d[x]+1;q.push(n)}}HOPP[a]=d}
function pirSetup(){if(!S||NET.cl)return;S.yards=S.yards||{};if(!S.yards.pirate)S.yards.pirate={sector:'wr'};S.pir=S.pir||{lostT:-1e9,built:{escort:0,carrier:0}};
  if(!S.stations.wr){const p=stationSite('wr'),k=STN.haven;S.stations.wr={sid:'wr',owner:'pirate',kind:'haven',name:'Scrapheart Haven',x:p.x,y:p.y,z:p.z,sMax:k.sMax,shield:k.sMax,hMax:k.hMax,hull:k.hMax,fort:{},stock:{},built:S.T,rock:{d:rdir(1)}}}}
{const o=FAC_HOME;FAC_HOME=function(f){if(f==='pirate')return'wr';return o.apply(this,arguments)}}
{const o=newGame;newGame=function(){const r=o.apply(this,arguments);try{pirSetup();aceInit()}catch(e){frameErr('expansion setup',e)}return r}}
{const o=migrate;migrate=function(){const r=o.apply(this,arguments);try{pirSetup()}catch(e){}try{tuneCapMigrate()}catch(e){}return r}}
function tuneCapMigrate(){if(!S)return;let n=0;const L=[S.player,...Object.values(S.pilots||{})].filter((P,i,a)=>P&&a.indexOf(P)===i);for(const P of L){for(const R of[P,...(P.ships||[])]){const T=R.tune;if(!T||typeof T!=='object')continue;for(const sl of SLOTS){const l=T[sl.id]||0;if(l>TUNE_MAX){inv.add(P.vault=P.vault||{},'tune',tuneItems(l)-tuneItems(TUNE_MAX));T[sl.id]=TUNE_MAX;n++}}}}
  if(n&&S.player)feed(`Aurora tuning is now once per component: ${n} component${n>1?'s keep':' keeps'} one level and the spare Aurora Tuning went into your vault.`,'info')}
{const o=escName;escName=function(side){if(side==='pirate'){S.escSeq=(S.escSeq||0)+1;return PIR_ESC_NAMES[S.escSeq%PIR_ESC_NAMES.length]}return o.apply(this,arguments)}}
{const o=carName;carName=function(side){if(side==='pirate')return pick(PIR_CAR_NAMES);return o.apply(this,arguments)}}
{const o=shipLabel;shipLabel=function(e){if(e&&e.role==='frigate'&&e.tok&&e.side==='pirate'&&!e.pname)return`Unbound ${e.tok.name}`;return o.apply(this,arguments)}}
// no Unbound wings in faction space (unless an Unbound capital is there with its wing); elsewhere most go to ground on the rocks
function pirBarred(){return W&&DEF[W.sid]&&DEF[W.sid].home&&!frigatesIn(W.sid).some(t=>t.side==='pirate')}
{const o=spawnWing;spawnWing=function(role,side,size,initial){if(side==='pirate'&&pirBarred())return null;const g=o.apply(this,arguments);
  if(g&&side==='pirate'&&role==='pirate'&&DEF[W.sid].kind!=='den'&&Math.random()<PIR_LURK)lurkPlan(g,initial);if(g)aceMaybeLead(g,role,side);return g}}
{const o=spawnNPC;spawnNPC=function(role,side){if(side==='pirate'&&pirBarred())return null;return o.apply(this,arguments)}}
// pirate carriers fly no assault ships (the Unbound plunder depots, they don't hold them) and take no supply convoys:
// a carrier at the haven is restocked straight from Unbound stores, anywhere else what it asked for stays in the stores
{const o=haulSend;haulSend=function(f,fromSid,toSid,load,key,why,car){if(f==='pirate'){const t=car&&(S.frigates||[]).find(x=>x.id===car);if(t&&t.sector==='wr'){t.store=t.store||{};inv.addAll(t.store,load)}else inv.addAll(S.econ.stock.pirate,load);return null}return o.apply(this,arguments)}}
{const o=capCanRefill;capCanRefill=function(t){if(t&&t.side==='pirate')return false;return o.apply(this,arguments)}}
{const o=carOrder;carOrder=function(t,f){if(f==='pirate')return;return o.apply(this,arguments)}}
{const o=capRefill;capRefill=function(t){const r=o.apply(this,arguments);if(t&&t.side==='pirate'){while((t.aload||0)>0){const got={};for(const k in ASSAULT_LD){const m=Math.min(ASSAULT_LD[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}inv.addAll(S.econ.stock.pirate,got);t.aload--}}return r}}
{const o=carTick;carTick=function(){const r=o.apply(this,arguments);for(const t of S.frigates||[])if(t.side==='pirate'&&t.fab&&t.fab.assault){inv.addAll(t.store=t.store||{},t.fab.kit);t.fab=null}return r}}
{const o=frigHop;frigHop=function(t){if(t&&t.side==='pirate'&&!t.jumpTo&&t.dest&&t.dest!==t.sector&&HOPP[t.dest]){let best=null,bh=99;for(const n of NEIGH[t.sector]){if(!PIR_OK.has(n))continue;const h=HOPP[t.dest][n];if(h!==undefined&&h<bh){bh=h;best=n}}return best}return o.apply(this,arguments)}}
{const o=frigOrders;frigOrders=function(t){if(t&&t.side==='pirate')return pirOrders(t);return o.apply(this,arguments)}}
const PIR_KIT={plate:9,wire:6};   // a capital refits at the haven when its stores can't fit one more raid
function pirOrders(t){const hp=t.hull/capHullMax(t);if(hp<.55||(isCar(t)&&(t.wing||[]).length<2&&t.sector!=='wr'))return'wr';if(t.sector!=='wr'&&!haveIn(PIR_KIT,[t.store||{}])&&haveIn(PIR_KIT,[S.econ.stock.pirate||{}]))return'wr';let best='wr',bs=-1e9;const from=HOPP[t.sector]||HOPP.wr;
  const lanes=(S.traders||[]).filter(x=>x.kind==='haul'&&FAC_IDS.includes(x.side)&&x.side!=='brood').map(x=>x.path.slice(x.leg));
  for(const sid of PIR_OK){const h=from[sid];if(h===undefined||h>3)continue;let sc=-.8*h+rnd(0,1.2);const d=DEF[sid],Rs=S.stations[sid];
    if(Rs&&FAC_IDS.includes(Rs.owner)&&Rs.kind==='depot')sc+=(isCar(t)?3.5:2.2)+(edgeDepot(Rs)?.8:0);if(d.home)sc-=.6;
    {let n=0;for(const L of lanes)if(L.some(c=>c===sid||NEIGH[sid].includes(c)))n++;sc+=Math.min(2.4,.6*n)}if(d.kind==='contested'||d.kind==='hub')sc+=1.2;else if(d.kind==='deep')sc+=.8;else if(d.kind==='void')sc+=.3;
    const caps=frigatesIn(sid).filter(o=>o!==t);if(caps.some(o=>o.side==='pirate'))sc-=2.5;if(caps.some(o=>hostile('pirate',o.side)&&isCar(o)))sc-=isCar(t)?1:2.5;else if(caps.some(o=>hostile('pirate',o.side)))sc+=isCar(t)?1:.4;
    if(sid==='wr')sc+=(1-hp)*4;if(sc>bs){bs=sc;best=sid}}return best}
function pirLost(t){if(!S.pir)return;S.pir.lostT=S.T}
function pirCaps(){return(S.frigates||[]).filter(t=>t.side==='pirate')}
function pirCost(k){return k==='carrier'?CARRIER_COST:ESCORT_COST}
// fencing: the Unbound sell surplus loot to the Freeport Compact and buy what they can't mine (credits and goods both move,
// nothing is created). The Wrack has no copper and no Vantium, so those come through the fence.
function pirFence(want){const st=S.econ.stock.pirate,fpA=fpNear('wr'),N=fpA&&dStore(fpA);if(!st||!N)return;
  for(const[k,keep]of[['xc',40],['ir',140],['fe',260],['nu',Math.max(30,(want.nu||0)+20)],['cu',Math.max(80,(want.cu||0)+40)]]){const n=Math.min(8,(st[k]||0)-keep);if(n<=0)continue;const pr=Math.floor(baseValue(k)*.8),pay=transfer('neutral','pirate',pr*n);const m=Math.floor(pay/pr);if(m>0){inv.take(st,k,m);inv.add(N,k,m)}}
  {const F=S.econ.fenced||{};for(const k of Object.keys(F)){if(MUNITIONS.has(k)||!ITEMS[k]){delete F[k];continue}const n=Math.min(20,F[k],(st[k]||0)-((want[k]||0)+5));if(n<=0)continue;const pr=Math.max(1,Math.floor(price(N,k,MK_SC.free)*.9)),pay=transfer('neutral','pirate',pr*n);const m=Math.floor(pay/pr);if(m>0){inv.take(st,k,m);inv.add(N,k,m);F[k]-=m;if(F[k]<=0)delete F[k]}}}
  for(const k of['cu','nu','wire']){const need=(want[k]||0)-(st[k]||0);if(need<=0)continue;const n=Math.min(k==='nu'?3:k==='wire'?6:10,need,(N[k]||0)-(k==='nu'?4:k==='wire'?7:8));if(n<=0)continue;const pr=Math.ceil(baseValue(k)*(k==='wire'?1.4:1.5)),cost=pr*n;if((S.econ.treasury.pirate||0)<cost+1500)continue;inv.take(N,k,n);inv.add(st,k,n);transfer('pirate','neutral',cost)}}
function pirTick(){if(NET.cl||!S||S.training)return;pirSetup();const st=S.econ.stock.pirate,T=S.T,H=S.stations.wr,caps=pirCaps(),bld=S.events.filter(e=>e.type==='pirbuild'&&e.stage!=='done');
  const nE=caps.filter(isEsc).length+bld.filter(e=>e.cls==='escort').length,nC=caps.filter(isCar).length+bld.filter(e=>e.cls==='carrier').length;
  const wantE=(T>=PIR_E1?1:0)+(T>=PIR_E2?1:0),wantC=T>=PIR_C?1:0,next=nC<wantC?'carrier':nE<wantE?'escort':null,pre=!next&&T>=PIR_C-600&&nC<1?'carrier':null;
  // the salvage works: keels, lattice and cores for the slip (no Forge needed for rough Unbound work)
  craftAbstract(st,'lattice',1,next?8:3);craftAbstract(st,'core',1,next?3:1);if(next||pre){const nx=next||pre,kc=nx==='carrier'?6:1;craftAbstract(st,'keel',1,kc);if(nx==='carrier')craftAbstract(st,'frame',1,4)}
  const want={};if(next||pre){const need={},r=pirCost(next||pre);for(const k in r)need[k]=(need[k]||0)+r[k];const raw=invVec(need);for(const k of RAWS)want[k]=Math.ceil(raw[k]*.6)+20;want.wire=(need.wire||0)+12}want.cu=Math.max(want.cu||0,40);want.wire=Math.max(want.wire||0,24);pirFence(want);
  {const sk={fe:1,cu:1,ir:1,xc:1,au:1,nu:1};let any=false;for(const k of['nu','cu'])if((want[k]||0)>(st[k]||0)){sk[k]=0;any=true}const s=S.sectors.ho;if(any&&s&&!S.stations.ho&&!WORLDS.ho)inv.addAll(st,extract(s,3,true,sk))}
  if(next&&!bld.length&&T-S.pir.lostT>=PIR_REBUILD&&H&&H.hull>H.hMax*.2&&haveIn(pirCost(next),[st])){const force={};takeFrom(pirCost(next),[st]);inv.addAll(force,pirCost(next));
    S.events.push({id:S.nextId++,type:'pirbuild',cls:next,att:'pirate',sector:'wr',force,until:T+(next==='carrier'?FRIGATE_TIME:ESCORT_TIME)*(unbWork('graving')>=1?.8:1),stage:'building'});
    allFeed(`☠ Unbound salvage crews are welding ${next==='carrier'?'a carrier':'an escort'} together in the slip at Scrapheart Haven, The Wrack.`,'warn')}
  for(const ev of S.events){if(ev.type!=='pirbuild'||ev.stage==='done'||T<ev.until)continue;ev.stage='done';const t=(ev.cls==='carrier'?makeCarrier:makeEscort)('pirate','wr',ev.force);ev.force={};
    allFeed(`☠ The Unbound have launched the ${ev.cls} ${t.name} from Scrapheart Haven. It hunts the convoy lanes and the depots on the edges of faction space, frontier systems included.`,'bad')}
  // refit: a capital at the haven loads raid kits (two raids' worth) from Unbound stores
  for(const t of caps){if(t.live||t.sector!=='wr')continue;const sto=t.store=t.store||{};for(const[k,n]of[['plate',26],['wire',16],['coil',3],['missile',3]]){const m=Math.min(n-(sto[k]||0),Math.max(0,(st[k]||0)-(k==='wire'?12:k==='plate'?12:0)));if(m>0)inv.add(sto,k,inv.take(st,k,m))}}
  // plunder: a pirate capital sitting on a broken faction depot carries its stores off, a little each tick
  for(const t of caps){if(t.live)continue;const R=S.stations[t.sector];if(!R||!FAC_IDS.includes(R.owner)||!isDepotF(R)||R.hull>R.hMax*.06)continue;const ds=dStore(R),got={};let m=0;
    for(const k in ds){const n=Math.min(Math.ceil(ds[k]*.12),Math.max(0,40-m));if(n>0){got[k]=inv.take(ds,k,n);m+=got[k]*mass(k)}}if(m>0){inv.addAll(st,got);if((friendSide(R.owner)||covered(t.sector))&&S.T-(t.plT||-99)>90){t.plT=S.T;feed(`☠ The Unbound ${capName(t)} ${t.name} is stripping ${R.name}'s stores.`,friendSide(R.owner)?'bad':'news')}}}}
{const o=pirateIndustry;pirateIndustry=function(){const r=o.apply(this,arguments);try{pirTick()}catch(e){frameErr('unbound',e)}return r}}
// ---- hiding on the rocks
function lurkRocks(){const s=S.sectors[W.sid],R=S.stations[W.sid];return s.ast.filter(a=>!a.comet&&!a.ore.nu&&oreTotal(a)>20&&(!R||d3(a,R)>1600))}
function lurkPlan(g,initial){const R=lurkRocks();if(!R.length)return;const a0=pick(R),near=R.slice().sort((a,b)=>d3(a,a0)-d3(b,a0)).slice(0,4);g.lurk=1;
  g.members.forEach((m,i)=>{const a=near[i%near.length];if(initial)lurkLand(m,a);else m.ai.lurkGo={aid:a.id,T:W.t}})}
function lurkLand(e,a){let dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z,l=hyp(dx,dy,dz);if(l<1){const r=rdir(1);dx=r.x;dy=r.y;dz=r.z;l=1}e.lurk={aid:a.id,nx:dx/l,ny:dy/l,nz:dz/l,until:W.t+rnd(160,260),ck:0};delete e.ai.lurkGo;
  e.stealth=true;e.masked=true;e.maskR=MASK_NEAR;e.shield=0;e.vx=e.vy=e.vz=0;e.boosting=false;Object.assign(e.lurk,astLandInit(e,a));astLandPlace(e,a,e.lurk)}
function lurkPrey(e){let best=null,bs=1e9;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||!hostile(e.side,o.side)||o.role==='frigate'||o.role==='drone'||o.role==='picket')continue;if(o.isPlayer&&(S.player.docked||W.dead))continue;if(mHid(o,e))continue;
  const d=d3(o,e),soft=o.isPlayer||o.rp||['hauler','miner','trader','builder','scout'].includes(o.role);if(d>(soft?LURK_TRIG:400))continue;const sc=d*(soft?.6:1);if(sc<bs){bs=sc;best=o}}return best}
function lurkSpring(g,prey,leave){const L=g&&g.members?g.members:[];let n=0;for(const m of L){if(!m.alive||!(m.lurk||m.ai.lurkGo))continue;const Lk=m.lurk;delete m.lurk;delete m.ai.lurkGo;m.stealth=false;m.masked=false;m.maskR=0;m.boot=W.t+2.5;if(Lk){m.vx=Lk.nx*30;m.vy=Lk.ny*30;m.vz=Lk.nz*30}n++;
  if(prey){m.ai.tgt=prey;m.ai.hunt=prey;m.ai.huntUntil=W.t+90}if(leave&&!prey)m.role='leave'}
  if(!n||!prey)return;const P=prey.isPlayer?S.player:prey.rp&&S.pilots?S.pilots[prey.rp]:null;if(P)xGS(P).amb++;
  if(prey.isPlayer&&W===LW){flash('⚠ Ambush! Unbound fighters are lifting off the rocks.',true);SFX.warn&&SFX.warn()}else if(prey.rp&&NET.host)netMsg(prey.rp,'flash','⚠ Ambush! Unbound fighters are lifting off the rocks.');
  else if(W===LW&&W.player&&d3(prey,W.player)<4500)feed(`⚠ ${n} Unbound fighters burst off the rocks to jump ${prey.role==='hauler'||prey.role==='trader'?'a freighter':prey.role==='miner'?'a miner':'a ship'} nearby.`,'warn')}
function lurkThink(e,dt){const s=S.sectors[W.sid];
  if(e.lurk){const a=s.ast.find(x=>x.id===e.lurk.aid);if(!a||!e.stealth){lurkSpring(e.grp||{members:[e]},e.lastHitBy?W.ents.find(o=>o.type==='ship'&&o.alive&&o.side===e.lastHitBy&&d3(o,e)<2500)||null:null);if(!a&&e.lurk)delete e.lurk;return false}
    if(!e.lurk.qr)Object.assign(e.lurk,astLandInit(e,a));astLandPlace(e,a,e.lurk);e.vx=e.vy=e.vz=0;e.thrusting=e.boosting=false;e.ai.tgt=null;
    if((e.lurk.ck-=dt)<=0){e.lurk.ck=.4;const prey=lurkPrey(e);if(prey){lurkSpring(e.grp||{members:[e]},prey);return false}if(W.t>e.lurk.until){lurkSpring(e.grp||{members:[e]},null,true);return false}}return true}
  if(e.ai.lurkGo){const G=e.ai.lurkGo,a=s.ast.find(x=>x.id===G.aid);if(!a||W.t-G.T>70){delete e.ai.lurkGo;return false}
    if(W.t-e.lastHit<3||lurkPrey(e)){lurkSpring(e.grp||{members:[e]},lurkPrey(e));return false}
    let dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z;const l=hyp(dx,dy,dz)||1,r=astR(a)+e.st.radius+14,tx=a.x+dx/l*r,ty=a.y+dy/l*r,tz=a.z+dz/l*r;steer(e,tx,ty,tz,dt,true,.9);
    if(hyp(e.x-tx,e.y-ty,e.z-tz)<70&&hyp(e.vx,e.vy,e.vz)<LAND_SPD)lurkLand(e,a);return true}
  return false}
{const o=npcThink;npcThink=function(e,dt){if(e.role==='pirate'&&(e.lurk||e.ai.lurkGo)&&!NET.cl){e.ai.t-=dt;e.life+=dt;e.mining=null;if(lurkThink(e,dt))return}return o.apply(this,arguments)}}
// a scout's long-range radar picks a landed ship out of the rock clutter at 1.6 km instead of 320 m
{const o=seenShip;seenShip=function(e){if(e&&e.masked&&e.lurk!==undefined&&W&&W.player&&CLASSES[S.player.cls]&&CLASSES[S.player.cls].radar&&d3(e,W.player)<LURK_RADAR)return true;if(e&&e.masked&&NET.cl&&e.side==='pirate'&&W&&W.player&&CLASSES[S.player.cls]&&CLASSES[S.player.cls].radar&&d3(e,W.player)<LURK_RADAR)return true;return o.apply(this,arguments)}}
// the haven: an asteroid base. The rock itself is the station: three hangar mouths cut into its waist (the docking ports),
// lit window rows, scrap plating bolted over the stone, domes and masts on top, and its turrets set into the surface
const HAVEN_R=118,HAVEN_BAYS=[.35,.35+TAU/3,.35+2*TAU/3],HV_N=[[.31,.74,.6],[-.82,.23,.52],[.47,-.66,.58],[-.2,-.4,-.9],[.9,.1,-.42],[-.5,.85,-.1]];
function havenNoise(x,y,z){let n=0;for(let i=0;i<HV_N.length;i++){const v=HV_N[i];n+=Math.sin((x*v[0]+y*v[1]+z*v[2])*(2.1+i*.9)+i*1.7)/(1+i*.45)}return n/2.6}
function havenR(x,y,z){const l=hyp(x,y,z)||1;return HAVEN_R*(1+.24*havenNoise(x/l,y/l,z/l)+.1*Math.max(0,x/l*.6-z/l*.8))}
function havenSurf(x,y,z){const l=hyp(x,y,z)||1,r=havenR(x,y,z);return[x/l*r,y/l*r*.84,z/l*r]}
PORTS.haven=HAVEN_BAYS.map(a=>{const p=havenSurf(Math.cos(a),0,Math.sin(a));return[p[0]*1.08,0,p[2]*1.08]});
function havenMesh(){if(MESH.haven)return MESH.haven;const R=mulberry(4242),fc=hexRGB(sideCol('pirate')),rock=[.34,.31,.29],dk=[.17,.16,.15],metal=[.4,.39,.37],rust=[.42,.27,.18],warm=[1,.62,.3],g=new GB();
  // the rock: a twice-split icosahedron pushed out by the noise field
  const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const l=hyp(...p);return p.map(c=>c/l)});
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let it=0;it<3;it++){const mid=new Map(),M=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(mid.has(k))return mid.get(k);const p=V[a].map((c,i)=>(c+V[b][i])/2),l=hyp(...p);V.push(p.map(c=>c/l));mid.set(k,V.length-1);return V.length-1};
    const F2=[];for(const[a,b,c]of F){const ab=M(a,b),bc=M(b,c),ca=M(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}F=F2}
  const P=V.map(p=>havenSurf(p[0],p[1],p[2]));
  for(const[a,b,c]of F){const sh=.78+R()*.38,n=havenNoise(...V[a]);g.tri(P[a],P[b],P[c],scaleC(n>.35?mixC(rock,dk,.4):rock,sh),0,[0,0,0])}
  const at=(dx,dy,dz,out)=>{const s=havenSurf(dx,dy,dz),l=hyp(dx,dy,dz)||1,k=(hyp(...s)+out)/hyp(...s);return[s[0]*k,s[1]*k,s[2]*k]};
  const face=(dx,dy,dz)=>qLook(dx,dy*.84,dz,Math.abs(dy)>.9?1:0,Math.abs(dy)>.9?0:1,0,q0());
  // hangar mouths: a dark frame sunk into the waist, a glowing bay inside, guide lights either side
  for(const a of HAVEN_BAYS){const dx=Math.cos(a),dz=Math.sin(a),q=face(dx,0,dz),c=at(dx,0,dz,-4);
    g.set(c[0],c[1],c[2],q).box(70,40,34,dk,0,true);const c2=at(dx,0,dz,13);g.set(c2[0],c2[1],c2[2],q).box(56,26,2,warm,.95);
    for(const sx of[-1,1])for(let k=0;k<4;k++){const ox=-dz*sx*34,oz=dx*sx*34,cl=at(dx,0,dz,14);g.set(cl[0]+ox,cl[1]-12+k*8,cl[2]+oz,q).box(4,3,3,fc,1)}
    const lip=at(dx,0,dz,10);g.set(lip[0],lip[1]+22,lip[2],q).box(80,5,22,metal,0)}
  // window rows and scrap plating over the stone
  for(let i=0;i<46;i++){let d=rdirS(R,.7);if(HAVEN_BAYS.some(a=>Math.cos(a)*d.x+Math.sin(a)*d.z>.9&&Math.abs(d.y)<.3))continue;const c=at(d.x,d.y,d.z,1.5),q=face(d.x,d.y,d.z);g.set(c[0],c[1],c[2],q).box(9,3,3,R()<.15?fc:warm,.9);if(R()<.5){g.set(c[0],c[1]-6,c[2],q).box(9,3,3,warm,.85)}}
  for(let i=0;i<16;i++){const d=rdirS(R,1),c=at(d.x,d.y,d.z,0),q=face(d.x,d.y,d.z);g.set(c[0],c[1],c[2],q).box(22+R()*20,14+R()*16,4,R()<.5?metal:rust,0,true)}
  // domes, masts and a dish on top
  for(let i=0;i<3;i++){const d={x:Math.cos(i*2.3)*.45,y:1,z:Math.sin(i*2.3)*.45},c=at(d.x,d.y,d.z,-6);g.set(c[0],c[1],c[2]).sphere(13+i*4,5,10,[.45,.62,.7],.3)}
  for(let i=0;i<4;i++){const d={x:Math.cos(i*1.7+1)*.3,y:1,z:Math.sin(i*1.7+1)*.3},c=at(d.x,d.y,d.z,20);g.set(c[0],c[1],c[2]).cyl(1.4,1,44,5,metal);g.set(c[0],c[1]+23,c[2]).sphere(2.6,3,5,fc,1)}
  const e=new GB();e.seg([0,0,0],[0,0,0],[0,0,0]);return MESH.haven={core:g.upload(),spin:e.upload(true)}}
function rdirS(R,ymax){for(;;){const x=R()*2-1,y=(R()*2-1)*ymax,z=R()*2-1,l=hyp(x,y,z);if(l>.2&&l<=1)return{x:x/l,y:y/l,z:z/l}}}
{const o=stationMesh;stationMesh=function(fac,kind){if(kind==='haven')return havenMesh();return o.apply(this,arguments)}}
{const o=portName;portName=function(E){if(E&&E.type==='station'&&E.kind==='haven')return'haven';return o.apply(this,arguments)}}
// turrets set into the rock: top, bottom and four round the shoulders between the bays
{const o=addStationEnt;addStationEnt=function(R){const e=o.apply(this,arguments);if(R&&R.kind==='haven'){const D=[[0,1,0],[0,-1,0],...[0,1,2,3].map(i=>{const a=HAVEN_BAYS[0]+TAU/6+i*TAU/4;return[Math.cos(a),.42*(i%2?-1:1),Math.sin(a)]})];
  e.turrets.forEach((t,i)=>{const d=D[i%D.length],s=havenSurf(d[0],d[1],d[2]),l=hyp(...s),k=(l+6)/l;t.p=[s[0]*k,s[1]*k,s[2]*k]});e.r=HAVEN_R}return e}}
const _xq=q0(),_xq2=q0();
function xDraw3D(t){if(!W)return;const SE=W.stationEnt;
  if(DEF[W.sid].kind==='void'&&scoutSees(S.player)){for(const A of anomsIn(W.sid)){if(!inView(A.x,A.y,A.z,60))continue;const pu=.5+.5*Math.sin(t*3+A.id);qAxis(0,1,0,t*.6+A.id,_xq2);mModel(MM,A.x,A.y,A.z,_xq2,14,14,14);drawMesh(astMesh(A.v||0,'au'),MM,ONE3,[.15+.35*pu,.7*pu+.2,.6*pu+.2])}}}
{const o=drawWorks;drawWorks=function(t){const r=o.apply(this,arguments);try{xDraw3D(t)}catch(e){}try{if(S&&S.unb)lairDraw()}catch(e){}return r}}
function xOverlay(){if(!W||!W.player||!S||S.player.docked||W.dead||W.bridge||W.gunseat||!scoutSees(S.player)||DEF[W.sid].kind!=='void')return;const c=octx,p=W.player;
  const tg=W.tgt&&W.tgt.kind==='anom'?W.tgt.ref:null;let nr=null,nd=1e9;for(const A of anomsIn(W.sid)){const d=d3(A,p);if(d<nd){nd=d;nr=A}}const lab=tg||nr;
  for(const A of anomsIn(W.sid)){const P=proj(A.x,A.y,A.z);if(P.behind||P.x<0||P.y<0||P.x>VW||P.y>VH)continue;const d=d3(A,p),sc=p.anS&&p.anS.id===A.id?p.anS.t/ANOM_T:0,r=12;
    c.strokeStyle='#6ff2cf';c.lineWidth=1.6;c.beginPath();c.moveTo(P.x,P.y-r);c.lineTo(P.x+r,P.y);c.lineTo(P.x,P.y+r);c.lineTo(P.x-r,P.y);c.closePath();c.stroke();
    if(sc>0){c.strokeStyle='#f0b24a';c.lineWidth=3;c.beginPath();c.arc(P.x,P.y,r+7,-Math.PI/2,-Math.PI/2+TAU*sc);c.stroke()}
    if(A!==lab&&!sc)continue;c.fillStyle='#6ff2cf';c.font='600 11px "Saira Semi Condensed",sans-serif';c.textAlign='center';c.fillText(sc>0?`SCANNING ${Math.round(sc*100)}%`:`UNKNOWN SIGNAL · ${d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m'}`,P.x,P.y+r+16)}}
{const o=drawOverlay;drawOverlay=function(){const r=o.apply(this,arguments);try{xOverlay()}catch(e){}return r}}
// ---- the per-tick and per-frame hooks
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{histTick();aceTick();anomTick()}catch(e){frameErr('expansion tick',e)}return r}}
{const o=worldUpdate;worldUpdate=function(dt){const r=o.apply(this,arguments);try{if(W&&S){xOreTick();anomWorld(dt);if(W===LW)anomLocal(dt)}}catch(e){frameErr('expansion world',e)}return r}}
// ============================================================ raids: convoys and edge depots are hit by real raider groups
// Nothing is lost to dice. A raiding side (a hostile faction from one of its stations, the Brood, the Unbound haven, or an
// Unbound capital out hunting) fits out a 3-ship group, paying the kit from its own stores up front, picks a system on a
// convoy's route it can reach first and flies there jump by jump. It waits by the gate the convoy will come through. Out of
// sight the two forces are settled by strength; in an open system the raiders are real ships that jump in through the gate
// they came by and go for the freighter. Survivors carry their loot home (the rest of the cargo spills as salvage and debris).
// The Unbound also hit depots on the edges of faction space; with a capital out they raid deep into faction frontiers.
const RAID={hop:35,reach:2,reachHaven:3,reachCap:2,slack:30,wait:240,cool:150,rate:{fac:.009,brood:.005,pirate:.01,cap:.03},esc:.02,max:{fac:2,brood:1,pirate:3},
  win:{freighter:.72,bulker:.62},depWin:.6,stnCut:.55,capCut:.35,carry:60,carryDep:60,lose:.35,outMode:'loot',depMode:'loot',disrupt:900,keep:{wire:12},keepFor:['missile','drone','swarm','tune','torpedo'],liveDep:90};
const PIR_OK0=new Set(SECTOR_DEFS.filter(d=>!d.home&&d.kind!=='hive').map(d=>d.id));
// the three powers keep a reserve of conduit in the warehouse that munitions and extras won't eat into, so raiders and patrols can be fitted
{const o=craftAbstract;craftAbstract=function(st,item){if(!RAID.keepFor.includes(item)||!S||!S.econ||!FAC_IDS.some(f=>f!=='brood'&&S.econ.stock[f]===st))return o.apply(this,arguments);const kp={};for(const k in RAID.keep){kp[k]=Math.min(st[k]||0,RAID.keep[k]);st[k]=(st[k]||0)-kp[k]}
  try{return o.apply(this,arguments)}finally{for(const k in kp)st[k]=(st[k]||0)+kp[k]}}}
function raidOf(id){return(S.raids||[]).find(r=>r.id===id)}
function raidWho(side){return side==='pirate'?'Unbound':side==='brood'?'Brood':FACTIONS[side].short}
// three raiders the stores can fit: the same picks and fallbacks as a live wing
function raidShips(side,srcs){const pir=side==='pirate',t0=pir?pirateTier():factionTier(side),lr=pir?'pirate':'patrol',need={},ships=[];
  const can=ld=>{const n={...need};for(const k in ld)n[k]=(n[k]||0)+ld[k];return haveIn(n,srcs)};
  for(let i=0;i<3;i++){let cls=pickFighter(pir?'pirate':'raider'),tier=t0,ld=loadout(lr,tier,cls);if(!can(ld)){cls='interceptor';ld=loadout(lr,tier,cls)}while(!can(ld)&&tier>1){tier--;ld=loadout(lr,tier,cls)}if(!can(ld))return null;
    for(const k in ld)need[k]=(need[k]||0)+ld[k];ships.push({cls,tier,ld})}return{ships,need}}
// where a side can launch from: [{sid, srcs, cap, reach, deep}]
function raidSources(side){const L=[];if(side==='pirate'){const H=S.stations.wr;if(H&&H.owner==='pirate'&&H.hull>H.hMax*.2)L.push({sid:'wr',srcs:[S.econ.stock.pirate],cap:null,reach:RAID.reachHaven,deep:false});
    for(const t of pirCaps())if(!t.jumpTo)L.push({sid:t.sector,srcs:[t.store=t.store||{}],cap:t.id,reach:RAID.reachCap,deep:true});return L}
  const srcs=[S.econ.fleet[side],S.econ.stock[side]].filter(Boolean);for(const id in S.stations){const R=S.stations[id];if(R.owner===side&&R.kind!=='haven')L.push({sid:id,srcs,cap:null,reach:RAID.reach,deep:true})}return L}
// the first system on a convoy's route a raid from sid can reach before the convoy does
function raidIntercept(src,t){const left=t.path.length-1-t.leg,eta0=Math.max(0,t.next-S.T),core=homeOf(t.side);
  for(let i=t.live?1:0;i<=left;i++){const c=t.path[t.leg+i];if(c===core||DEF[c].kind==='hive')continue;if(!src.deep&&!PIR_OK0.has(c))continue;if(src.cap&&!PIR_OK.has(c))continue;const h=HOP[src.sid][c];if(h>src.reach)continue;
    const eta=i?eta0+(i-1)*TRADER_HOP:0;if(h*RAID.hop>eta+RAID.slack)continue;if(i===0&&h>0)continue;return{c,i,h}}return null}
function raidTaken(t){return(S.raids||[]).some(r=>r.tgt===t.id)}
function edgeDepot(R){if(!isDepotF(R))return false;const T=territory(R.owner);return NEIGH[R.sid].some(n=>!T.has(n))}
// choose a target for a side (or for a raid already out, re-tasking from where it is)
function raidPick(side,srcL,ships){let best=null;
  for(const t of S.traders||[]){if(t.kind!=='haul'||!hostile(side,t.side)||raidTaken(t))continue;const v=invValue(t.load||{});if(v<40)continue;
    for(const src of srcL){const I=raidIntercept(src,t);if(!I)continue;const sc=v/(1+I.h)*(t.esc?1.3:1);if(!best||sc>best.sc)best={sc,src,tgt:t.id,c:I.c,dep:null}}}
  if(side==='pirate')for(const id in S.stations){const R=S.stations[id];if(!edgeDepot(R)||(S.raids||[]).some(r=>r.dep===id))continue;const ds=dStore(R),v=Math.min(invValue(ds),2500)*.35;if(v<60)continue;
    for(const src of srcL){if(!src.deep&&!PIR_OK0.has(id))continue;if(src.cap&&!PIR_OK.has(id))continue;const h=HOP[src.sid][id];if(h>src.reach)continue;const sc=v/(1+h);if(!best||sc>best.sc)best={sc,src,tgt:null,c:id,dep:id}}}
  return best}
function raidSend(side,pk,kit){const src=pk.src,r={id:S.nextId++,side,src:src.sid,cap:src.cap,tgt:pk.tgt,dep:pk.dep,dest:pk.c,sector:src.sid,path:trPath(src.sid,pk.c),leg:0,next:S.T+RAID.hop,state:'out',ships:kit.ships,kit:{...kit.need},loot:{},back:[],T0:S.T};
  takeFrom(kit.need,src.srcs);S.raids.push(r);
  const t=r.tgt&&(S.traders||[]).find(x=>x.id===r.tgt);if(t&&t.esc)keyFeed(t.esc.k,`⚠ ${raidWho(side)} raiders are moving to intercept the convoy you're escorting. Expect them in ${DEF[r.dest].name}.`,'warn');
  if(r.dep&&friendSide(S.stations[r.dep].owner))feed(`⚠ An ${raidWho(side)} raiding party has been seen heading for ${S.stations[r.dep].name}.`,'warn');
  if(WORLDS[r.sector])inW(WORLDS[r.sector],()=>raidSpawn(r,false));else if(r.path.length===1)raidArrive(r);return r}
function raidDispatch(){S.raids=S.raids||[];for(const side of[...FAC_IDS,'brood','pirate']){const kind=side==='pirate'?'pirate':side==='brood'?'brood':'fac',mine=S.raids.filter(r=>r.side===side);if(mine.length>=RAID.max[kind])continue;
    if(S.T<300)continue;const srcL=raidSources(side).filter(s=>!mine.some(r=>r.src===s.sid&&S.T-r.T0<RAID.cool));if(!srcL.length)continue;
    // escorted convoys draw raiders more often; an Unbound capital on the hunt launches far more often than the haven
    let p=RAID.rate[kind];if(side==='pirate'&&srcL.some(s=>s.cap))p=RAID.rate.cap;if((S.traders||[]).some(t=>t.esc&&hostile(side,t.side)&&!raidTaken(t)&&srcL.some(s=>raidIntercept(s,t))))p+=RAID.esc;if(Math.random()>=p)continue;
    const pk=raidPick(side,srcL);if(!pk)continue;const kit=raidShips(side,pk.src.srcs);if(!kit)continue;raidSend(side,pk,kit)}}
// off-screen fight: the raiders' odds fall where the target's own station guns or a capital cover it
function raidOdds(r,sid,base,owner){let p=base*(1+.06*(r.ships.reduce((a,s)=>a+s.tier,0)/r.ships.length-1))*Math.min(1,r.ships.length/3);const R=S.stations[sid];if(R&&R.owner===owner)p*=RAID.stnCut;if(frigatesIn(sid).some(o=>sideNorm(o.side)===owner))p*=RAID.capCut;return clamp(p,.05,.95)}
function raidGrab(from,room,frac){const got={};for(const k of Object.keys(from).filter(k=>from[k]>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a))){const n=Math.min(Math.floor(from[k]*frac),Math.floor(room/mass(k)));if(n>0){got[k]=inv.take(from,k,n);room-=n*mass(k)}if(room<1)break}return got}
function raidAttrition(r,sid){if(Math.random()<RAID.lose&&r.ships.length>1){const sh=r.ships.pop(),ld={};for(const k in sh.ld){const m=Math.min(sh.ld[k],r.kit[k]||0);if(m>0)ld[k]=inv.take(r.kit,k,m)}toDebris(S.sectors[sid],ld)}}
function raidWipe(r,sid,msg){toDebris(S.sectors[sid],r.kit);toDebris(S.sectors[sid],r.loot);r.kit={};r.loot={};S.raids.splice(S.raids.indexOf(r),1);if(msg)feed(msg,'good')}
function raidFight(r){const sid=r.sector;
  if(r.dep){const R=S.stations[r.dep];if(!R||!isDepotF(R))return false;const win=Math.random()<raidOdds(r,sid,RAID.depWin,'')*(frigatesIn(sid).some(o=>sideNorm(o.side)===R.owner)?RAID.capCut:1);
    if(!win){raidWipe(r,sid,friendSide(R.owner)?`✔ ${R.name}'s guns broke up an ${raidWho(r.side)} raiding party.`:null);return false}
    inv.addAll(r.loot,raidGrab(dStore(R),RAID.carryDep,.4));R.hull=Math.max(1,R.hull-R.hMax*.04);raidAttrition(r,sid);
    if(friendSide(R.owner))feed(`⚠ ${raidWho(r.side)} raiders hit ${R.name} and got away with part of its stores.`,'bad');else if(covered(sid))feed(`${raidWho(r.side)} raiders hit ${R.name} in ${DEF[sid].name}.`,'news');raidHome(r);return true}
  const t=(S.traders||[]).find(x=>x.id===r.tgt);if(!t)return false;const win=Math.random()<raidOdds(r,sid,RAID.win[t.cls]||.65,t.side);
  if(!win){raidWipe(r,sid,friendSide(t.side)?`✔ A ${FACTIONS[t.side].short} supply convoy fought off ${raidWho(r.side)} raiders in ${DEF[sid].name}.`:null);return false}
  inv.addAll(r.loot,raidGrab(t.load,RAID.carry,.5));haulLost(t,sid,r.side);raidAttrition(r,sid);raidHome(r);return true}
// a convoy jumps into a system: a raid waiting (or passing) there for it springs
// (an escort a jump behind gets a moment to follow it in, so the fight happens in the open)
function raidMeet(t,prev){if(WORLDS[t.sector])return false;if(t.esc&&pSect(t.esc.k)===prev){t.escWait=S.T+25;return false}const r=(S.raids||[]).find(x=>x.tgt===t.id&&!x.live&&x.sector===t.sector&&x.state!=='home');if(!r)return false;return raidFight(r)}
function raidHome(r){r.state='home';r.tgt=null;r.dep=null;const C=r.cap&&(S.frigates||[]).find(x=>x.id===r.cap);let to=C?C.sector:r.src;const R=S.stations[to];if(!C&&!(R&&R.owner===r.side))to=homeOf(r.side);r.dest=to;r.path=trPath(r.sector,to);r.leg=0;r.next=Math.max(r.next,S.T+RAID.hop*.5)}
function raidStillOn(r){if(r.dep){const R=S.stations[r.dep];return!!(R&&isDepotF(R)&&hostile(r.side,R.owner))}const t=(S.traders||[]).find(x=>x.id===r.tgt);if(!t)return false;const i=t.path.indexOf(r.dest,t.leg);return i>=t.leg}
function raidCatch(r){const t=r.tgt&&(S.traders||[]).find(x=>x.id===r.tgt);if(t&&t.sector===r.sector&&!t.live&&!WORLDS[r.sector]&&!(t.escWait>S.T)){if(raidFight(r))S.traders.splice(S.traders.indexOf(t),1);return true}return false}
function raidArrive(r){if(r.state==='home'){raidUnload(r);return}if(r.dep&&!WORLDS[r.sector]){raidFight(r);return}r.state='wait';r.until=S.T+RAID.wait;raidCatch(r)}
function raidUnload(r){const C=r.cap&&(S.frigates||[]).find(x=>x.id===r.cap&&x.sector===r.sector);let into=r.side==='pirate'?(C?(C.store=C.store||{}):S.econ.stock.pirate):S.econ.stock[r.side]||S.econ.stock.pirate;inv.addAll(into,r.kit);
  let lootTo=S.econ.stock[r.side]||S.econ.stock.pirate;if(r.side!=='pirate'){const R=S.stations[r.sector];if(R&&R.owner===r.side)lootTo=storeOf(R)||lootTo}
  if(r.side==='pirate'){const F=S.econ.fenced=S.econ.fenced||{};for(const k in r.loot)if(!RAWS.includes(k)&&!['plate','wire','coil','missile','torpedo','drone'].includes(k))F[k]=(F[k]||0)+r.loot[k]}
  inv.addAll(lootTo,r.loot);r.kit={};r.loot={};S.raids.splice(S.raids.indexOf(r),1)}
function raidsTick(){if(NET.cl||!S||S.training)return;S.raids=S.raids||[];raidDispatch();
  for(const r of S.raids.slice()){if(!S.raids.includes(r))continue;if(r.live){raidLiveCheck(r);continue}
    if(r.state==='wait'){if(raidCatch(r))continue;if(!raidStillOn(r)||S.T>r.until){const pk=r.dep?null:raidPick(r.side,[{sid:r.sector,srcs:[],cap:r.cap,reach:r.side==='pirate'&&!r.cap?RAID.reachHaven:RAID.reach,deep:r.side!=='pirate'||!!r.cap}]);
        if(pk&&!WORLDS[r.sector]){r.tgt=pk.tgt;r.dep=pk.dep;r.dest=pk.c;r.path=trPath(r.sector,pk.c);r.leg=0;r.state='out';r.next=S.T+RAID.hop;if(r.path.length===1)raidArrive(r)}else raidHome(r)}continue}
    if(r.state==='out'&&!raidStillOn(r)){raidHome(r)}
    if(S.T<r.next)continue;if(r.leg>=r.path.length-1){raidArrive(r);continue}
    r.leg++;r.sector=r.path[r.leg];r.next=S.T+RAID.hop;if(WORLDS[r.sector]){inW(WORLDS[r.sector],()=>raidSpawn(r,true));continue}
    if(r.leg>=r.path.length-1){raidArrive(r);continue}
    if(r.state==='out')raidCatch(r)}}
// ---- live raiders: real ships from the raid's kit, homed to the raid so whatever survives flies on with it
function raidSpawn(r,arrive){if(r.live||!W)return;const side=r.side,prev=arrive?r.path[r.leg-1]:null,gin=prev&&(GATES[W.sid]||[]).find(g=>g.to===prev),g={id:'g'+(RID++),side,role:'raider',members:[],n0:0,fleeing:false,raid:r.id};
  // already in the system when it opens: waiting by the convoy's entry gate, or just in through the gate it came by
  let base=gin?{x:gin.x*.93,y:gin.y*.93,z:gin.z*.93}:null;if(!base){let G=r.live?null:raidGoal(r);if(G&&G.hunt){const t=(S.traders||[]).find(x=>x.id===r.tgt),i=t?t.path.indexOf(W.sid,t.leg):-1,eg=i>0&&W.ents.find(x=>x.type==='gate'&&x.to===t.path[i-1]);if(eg)G={hold:eg,R:420}}const gb=r.leg>0&&(GATES[W.sid]||[]).find(g=>g.to===r.path[r.leg-1]);
    if(G&&G.hold){const P=G.hold,l=hyp(P.x,P.y,P.z)||1;base={x:P.x-P.x/l*G.R,y:P.y-P.y/l*G.R,z:P.z-P.z/l*G.R}}else if(gb)base={x:gb.x*.9,y:gb.y*.9,z:gb.z*.9};else base=randPos(900*SPACE,2000*SPACE)}let lead=null;
  r.ships.forEach((sh,i)=>{const ld={};for(const k in sh.ld){const m=Math.min(sh.ld[k],r.kit[k]||0);if(m>0)ld[k]=inv.take(r.kit,k,m)}const e=makeNPC('raider',side,sh.cls,sh.tier,ld,`raid:${r.id}:${side}`);e.rsh=sh;e.raidR=r.id;
    const o=rdir(1);e.x=base.x+(lead?o.x*70:0);e.y=base.y+(lead?o.y*70:0);e.z=base.z+(lead?o.z*70:0);if(lead)qCopy(e.q,lead.q);else faceInstant(e,-e.x,-e.y,-e.z);e.grp=g;e.slot=i;g.members.push(e);docFit(e,0);W.ents.push(e);if(e.load.drone)deployDrones(e);if(arrive&&gin)fxWarp(e,sideCol(side));if(!lead)lead=e});
  if(!g.members.length)return;g.n0=g.members.length;W.groups[g.id]=g;r.live=true;r.back=[];r.liveT=S.T;
  const t=r.tgt&&(S.traders||[]).find(x=>x.id===r.tgt);if(t&&t.esc&&pSect(t.esc.k)===W.sid)keyFeed(t.esc.k,`⚠ ${raidWho(side)} raiders ${arrive&&gin?'jumping in through the '+DEF[prev].name+' gate':'in the system'}: ${g.members.length} ships, going for your convoy.`,'bad');
  else if(W===LW&&r.dep&&friendSide((S.stations[r.dep]||{}).owner))feed(`⚠ ${raidWho(side)} raiders have jumped in to hit ${S.stations[r.dep].name}.`,'bad')}
{const o=returnHome;returnHome=function(e){if(typeof e.home==='string'&&e.home.startsWith('raid:')&&e.rsh&&e.role!=='drone'){const r=raidOf(+e.home.split(':')[1]);if(r)r.back.push(e.rsh)}return o.apply(this,arguments)}}
// per frame in an open system: hold by the convoy's entry gate, go for the freighter when it shows, then leave by the right gate
function raidGoal(r){const gt=to=>W.ents.find(x=>x.type==='gate'&&x.to===to);
  if(r.state==='home'&&r.dest===W.sid)return{dock:1};   // home: the raiders put in and unload
  if(r.state==='home'||(r.state==='out'&&r.dest!==W.sid))return{gate:gt(r.path[r.leg+1])||null};
  if(r.dep){const SE=W.stationEnt;return SE?{hold:SE,R:900}:{gate:null}}
  const t=(S.traders||[]).find(x=>x.id===r.tgt);if(!t)return{gate:null};const T=W.ents.find(x=>x.alive&&x.home===`trader:${t.id}:${t.side}`);if(T)return{hunt:T};
  const i=t.path.indexOf(W.sid,t.leg);const g=i>0&&gt(t.path[i-1]);return g?{hold:g,R:420}:{gate:null}}
function raidLiveFrame(){for(const id in W.groups){const g=W.groups[id];if(!g.raid)continue;const r=raidOf(g.raid),al=grpAlive(g);if(!r||!r.live){for(const m of al)m.role='leave';continue}if(g.fleeing)continue;
    if(r.dep&&r.state!=='home'&&r.dest===W.sid&&W.stationEnt&&S.T-r.liveT>RAID.liveDep&&al.length>=2){const R=S.stations[r.dep];if(R&&isDepotF(R)){inv.addAll(r.loot,raidGrab(dStore(R),RAID.carryDep,.4));if(friendSide(R.owner))feed(`⚠ ${raidWho(r.side)} raiders looted ${R.name} and are pulling out.`,'bad')}raidHome(r)}
    const G=raidGoal(r);
    if(G.dock){for(const m of al){fxWarp(m,sideCol(m.side));despawn(m)}continue}
    if(G.hunt){for(const m of al){m.ai.hunt=G.hunt;m.ai.huntUntil=W.t+30;if(!m.ai.tgt)m.ai.tgt=G.hunt}continue}
    if(G.gate===null&&!G.hold){if(r.state!=='home')raidHome(r);continue}
    const L=grpLead(g);if(!L)continue;
    if(G.gate){if(L.ai.tgt&&L.ai.tgt.alive&&d3(L.ai.tgt,L)<1500)continue;for(const m of al){m.ai.wp={x:G.gate.x,y:G.gate.y,z:G.gate.z};m.ai.tgt=null}
      if(d3(L,G.gate)<330){for(const m of al)if(!gateLocked(m)){fxWarp(m,sideCol(m.side));despawn(m)}}continue}
    const P=G.hold,dx=-P.x,dy=-P.y,dz=-P.z,l=hyp(dx,dy,dz)||1,spot={x:P.x+dx/l*G.R,y:P.y+dy/l*G.R,z:P.z+dz/l*G.R};if(!L.ai.wp||d3(L.ai.wp,spot)>260)L.ai.wp={x:spot.x+rnd(-120,120),y:spot.y+rnd(-60,60),z:spot.z+rnd(-120,120)}}}
// strategic side of a live raid: when its ships are gone from the system, the survivors (if any) go back to the map
function raidLiveCheck(r){const w=WORLDS[r.sector];const al=w?w.ents.filter(e=>e.alive&&e.raidR===r.id&&e.role!=='drone'):[];if(al.length)return;
  r.live=false;r.ships=r.back.slice();r.back=[];if(!r.ships.length){raidWipe(r,r.sector,null);return}if(r.ships.length<2&&r.state!=='home')raidHome(r);
  if(r.state==='home'){if(r.leg>=r.path.length-1){raidUnload(r);return}r.leg++;r.sector=r.path[r.leg];r.next=S.T+RAID.hop;if(WORLDS[r.sector])inW(WORLDS[r.sector],()=>raidSpawn(r,true));return}
  if(r.state==='out'&&r.dest!==r.sector){r.leg++;r.sector=r.path[r.leg];r.next=S.T+RAID.hop;if(WORLDS[r.sector])inW(WORLDS[r.sector],()=>raidSpawn(r,true));else if(r.leg>=r.path.length-1)raidArrive(r);return}
  if(r.state!=='home'&&r.dest===r.sector&&raidStillOn(r)){r.state='wait';r.until=S.T+RAID.wait;raidCatch(r);return}   // the system closed while they waited: keep waiting out of sight
  raidHome(r)}
{const o=groupsUpdate;groupsUpdate=function(){const x=o.apply(this,arguments);try{if(!NET.cl&&S&&S.raids&&S.raids.length)raidLiveFrame()}catch(e){frameErr('raid frame',e)}return x}}
{const o=openWorld;openWorld=function(sid){const w=o.apply(this,arguments);if(!NET.cl&&S&&S.raids)inW(w,()=>{for(const r of S.raids.slice()){if(r.sector!==sid)continue;if(r.live){r.live=false;if(!r.back.length){raidWipe(r,sid,null);continue}r.ships=r.back;r.back=[]}raidSpawn(r,false)}});return w}}
{const o=migrate;migrate=function(){const r=o.apply(this,arguments);try{S.raids=S.raids||[];for(const x of S.raids){if(x.live){x.live=false;if(x.back&&x.back.length)x.ships=x.back}x.back=[]}}catch(e){}return r}}
// ---- the Unbound raid, they don't hold: a forge, relay or depot they break is looted and left with its owner (the Wrack
// Salvage Yard, their own home, is the one outpost they take and keep)
function pirLootTo(got){const st=S.econ.stock.pirate,F=S.econ.fenced=S.econ.fenced||{};inv.addAll(st,got);for(const k in got)if(!RAWS.includes(k)&&!['plate','wire','coil','missile','torpedo','drone'].includes(k))F[k]=(F[k]||0)+got[k]}
function pirRaidOutpost(o){const got=raidGrab(o.stock,120,.5);pirLootTo(got);o.raidT=S.T;if(RAID.outMode==='lvl'&&o.level>1){const lost={};for(const e of RAWS){const m=Math.floor(o.fort[e]/o.level);o.fort[e]-=m;lost[e]=m}toDebris(S.sectors[o.sector],lost);o.level--}if(RAID.outMode==='free'){pirLootTo(o.stock);o.stock={};o.owner=null}const os=oStats(o);o.hull=Math.max(1,Math.min(o.hull||os.hMax,os.hMax*.4));o.shield=0;o.breached=0;o.cap={side:null,p:0};
  if(W&&W.outpostEnt&&W.outpostEnt.o===o)W.outpostEnt.lastHit=W.t;
  if(friendSide(o.owner))feed(`⚠ Unbound raiders broke ${o.name}'s defences and carried off ${invMass(got)} t of its stores. It is still ours.`,'bad');else if(covered(o.sector))feed(`Unbound raiders looted ${o.name} (${invMass(got)} t) and moved on.`,'news')}
function pirRaidDepot(sid){const R=S.stations[sid];if(!R)return;R.raidT=S.T;const got=raidGrab(dStore(R),120,.35);pirLootTo(got);R.hull=Math.max(1,R.hMax*.25);R.shield=0;
  if(friendSide(R.owner))feed(`⚠ Unbound raiders broke into ${R.name} and carried off ${invMass(got)} t of its stores. It is still ours.`,'bad');else if(covered(sid))feed(`Unbound raiders looted ${R.name} (${invMass(got)} t).`,'news')}
{const o=capture;capture=function(op,side){if(side==='pirate'&&op&&op.id!=='wrack'&&!RAID.pirHold){if(op.owner)pirRaidOutpost(op);return}return o.apply(this,arguments)}}
{const o=captureDepot;captureDepot=function(sid,side){if(side==='pirate'&&!RAID.pirHold){pirRaidDepot(sid);return}return o.apply(this,arguments)}}
{const o=razeStation;razeStation=function(sid,by){const R=S.stations[sid];if(by==='pirate'&&R&&R.kind==='depot'&&RAID.depMode!=='raze'&&!RAID.pirHold){pirRaidDepot(sid);return}return o.apply(this,arguments)}}
// old saves: outposts the Unbound took before this rule go back to being unclaimed (their stores go to the haven)
{const o=migrate;migrate=function(){const r=o.apply(this,arguments);try{for(const id in S.outposts){const op=S.outposts[id];if(id==='wrack'||op.owner!=='pirate')continue;pirLootTo(op.stock);op.stock={};op.owner=null;op.cap={side:null,p:0}}}catch(e){}return r}}
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{icptTick()}catch(e){frameErr('interdiction',e)}return r}}
// a system the Unbound have just sacked doesn't count toward its owner's hold for a while (RAID.disrupt seconds)
function pirDisrupted(sid){const oid=OUT_BY_SECTOR[sid],o=oid&&S.outposts[oid],R=S.stations[sid],T=S.T-RAID.disrupt;return!!((o&&o.raidT>T&&o.owner&&sectorOwner(sid)===o.owner)||(R&&R.raidT>T&&sectorOwner(sid)===R.owner))}
{const o=controlCounts;controlCounts=function(){const n=o.apply(this,arguments);if(RAID.disrupt>0)for(const d of SECTOR_DEFS){if(!pirDisrupted(d.id))continue;let w=sectorOwner(d.id);if(w==='player')w=S.player.faction;if(n[w])n[w]--}return n}}
// ============================================================ Unbound jobs on the wire, taken in flight (P, Shift+P to cycle)
// The haven posts work to captains out flying: an intercept on a named faction freighter (rob it or kill it; the course
// follows it to a system you can reach first), or a mining disruption (break up a faction's miners in one of its systems).
// Up to two offers at a time; pay comes out of the Unbound treasury, with Infamy on top.
const UJOB={offers:2,life:240,icpt:{cr:300,val:.08,inf:30,T:420},mine:{cr:350,inf:25,need:2,T:420,hops:3},chance:.25};
function ujobs(){return S.ujobs||(S.ujobs=[])}
// haven jobs stay out of faction space: no home systems and no system with a faction depot or station (their guns)
function ujobOk(sid){const R=S.stations[sid];return!DEF[sid].home&&DEF[sid].kind!=='hive'&&!(R&&FAC_IDS.includes(R.owner))}
function icptFor(t,P,ok){const left=t.path.length-1-t.leg,eta0=Math.max(0,t.next-S.T);for(let i=0;i<=left;i++){const c=t.path[t.leg+i];if(ok&&!ok(c))continue;const j=HOP[P.sector][c],tp=j*ICPT_HOP,leave=i===0?eta0:eta0+i*TRADER_HOP;if(tp<=leave-10)return{c,j}}return null}
// faction miners out in open space: the systems where a faction holds the outpost (forge) but no depot
function ujobMinePick(P){const L=[];for(const f of FAC_IDS){if(f==='brood')continue;for(const id in S.outposts){const o=S.outposts[id],sid=o.sector;if(o.owner!==f||DEF[sid].kind!=='contested'||!ujobOk(sid)||!S.sectors[sid].ast.length)continue;const h=HOP[P.sector][sid];if(h>UJOB.mine.hops||ujobs().some(j=>j.sid===sid&&j.kind==='mine'))continue;L.push({f,sid,h})}}return L.length?pick(L):null}
// every pilot has their own board: each job carries its pilot's key (k), offers are drawn from where that pilot is,
// and the host pays the pilot who did the work. Guests ask the host to take a job; steering happens on each pilot's own machine.
function ujMine(j){return(j.k||'me')===pkey()||(!NET.on&&!j.k)}
function ujPilotOn(P){return!NET.on||!P.pid||isMe(P.pid)||Object.values(MP.cl||{}).some(c=>c.pid===P.pid&&c.ready)}
function ujobOffer(){const P=S.player,k=pkey(),J=ujobs();if(J.filter(j=>!j.on&&j.k===k).length>=UJOB.offers)return;
  if(Math.random()<.55){let best=null;for(const f of FAC_IDS){if(f==='brood')continue;for(const t of S.traders||[]){if(t.kind!=='haul'||t.side!==f||J.some(j=>j.tgt===t.id&&j.k===k))continue;const I=icptFor(t,P,ujobOk);if(!I)continue;const v=invValue(t.load||{});if(v<60)continue;const sc=v/(1+I.j);if(!best||sc>best.sc)best={sc,t,I,v}}}
    if(best){const t=best.t,pay=Math.round((UJOB.icpt.cr+best.v*UJOB.icpt.val)/10)*10;J.push({id:S.nextId++,k,kind:'icpt',f:t.side,tgt:t.id,at:best.I.c,v:best.v,pay,inf:UJOB.icpt.inf,until:S.T+UJOB.life,title:`Intercept: ${FACTIONS[t.side].short} supply convoy (${haulWhat(t)})`});return}}
  const m=ujobMinePick(P);if(m)J.push({id:S.nextId++,k,kind:'mine',f:m.f,sid:m.sid,need:UJOB.mine.need,n:0,pay:UJOB.mine.cr,inf:UJOB.mine.inf,until:S.T+UJOB.life,title:`Disrupt ${FACTIONS[m.f].short} mining in ${DEF[m.sid].name}`})}
// (called in the job owner's context: runAs on the host, so the pay and Infamy reach the right pilot)
function ujobEnd(j,ok,why){const J=ujobs();if(J.includes(j))J.splice(J.indexOf(j),1);if(!j.on)return;
  if(!ok){feed(`✗ Job failed: ${j.title}${why?' ('+why+')':''}.`,'warn');return}const got=transfer('pirate','player',j.pay);infAdd(j.inf,'a haven job');if(!CTX||isMe(CTX))SFX.count&&SFX.count(true);feed(`☠ Job done: ${j.title}. The haven pays +${fmt(got)} cr${got<j.pay?' (all the treasury had)':''}, and your Infamy grows.`,'good')}
function ujobCourse(j){const P=S.player;let to=j.kind==='mine'?j.sid:j.at;if(!to)return;ujAt[j.id]=to;if(to===P.sector){flash(j.kind==='mine'?`You're in ${DEF[to].name}: find the ${FACTIONS[j.f].short} miners (Q cycles hostiles).`:`The ${FACTIONS[j.f].short} convoy comes through here: wait by the gate it uses.`);return}
  P.route=to;if(W&&!P.docked){apOn=true;const g=routeNext();if(g)W.tgt={kind:'gate',ref:g};flash(`Course set to ${DEF[to].name}. Autopilot on: steer to take back control.`)}else flash(`Course set to ${DEF[to].name}. Undock and press J to fly it.`)}
// host: every pilot's jobs, each in that pilot's context (their sector, their feed, their wallet)
function ujobTick(){if(!S||!S.unb||NET.cl||S.training)return;const J=ujobs();for(const j of J)if(!j.k)j.k=pkey();
  for(const P of allPilots()){if(!P)continue;runAs(P.pid&&!isMe(P.pid)?P.pid:null,()=>{ujobTickFor();if(ujPilotOn(P)&&Math.random()<UJOB.chance)ujobOffer()})}
  const ks=new Set(allPilots().map(P=>P&&P.pid&&!isMe(P.pid)?P.pid:pkey()));for(const j of J.slice())if(!ks.has(j.k))J.splice(J.indexOf(j),1)}
function ujobTickFor(){const P=S.player,k=pkey(),J=ujobs();
  for(const j of J.slice()){if(j.k!==k)continue;if(!j.on){if(S.T>j.until||(j.kind==='icpt'&&!(S.traders||[]).some(t=>t.id===j.tgt)))J.splice(J.indexOf(j),1);continue}
    if(j.kind==='icpt'){const t=(S.traders||[]).find(x=>x.id===j.tgt);if(!t){ujobEnd(j,false,'the convoy docked or was lost to someone else');continue}if(S.T>j.until){ujobEnd(j,false,'time ran out');continue}
      if(t.sector===P.sector)continue;
      const i=t.path.indexOf(j.at,t.leg),late=i<t.leg||HOP[P.sector][j.at]*ICPT_HOP>Math.max(0,t.next-S.T)+(i-t.leg)*TRADER_HOP+5;if(!late)continue;const I=icptFor(t,P,ujobOk);if(!I){ujobEnd(j,false,'it got past you');continue}
      if(I.c!==j.at){j.at=I.c;feed(`Job: the convoy moved on. New intercept in ${DEF[I.c].name}.`,'info')}}
    else if(S.T>j.until)ujobEnd(j,false,'time ran out')}}
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{ujobTick()}catch(e){frameErr('unbound jobs',e)}return r}}
// each machine steers its own pilot: follow a moved intercept, and target the convoy when it's in your system
const ujAt={},ujMarked={};
function ujobSteer(){if(!S||!S.unb||!S.player)return;const P=S.player;
  for(const j of ujobs()){if(!j.on||!ujMine(j)||j.kind!=='icpt')continue;const t=(S.traders||[]).find(x=>x.id===j.tgt);
    if(t&&t.sector===P.sector&&W&&!ujMarked[j.id]){const e=W.ents.find(x=>x.alive&&x.tradeT&&x.tradeT.id===t.id);if(e&&(!W.tgt||W.tgt.kind==='gate')){ujMarked[j.id]=1;W.tgt={kind:'ship',ref:e};flash(`The ${FACTIONS[j.f].short} convoy is here: targeted.`)}}
    const was=ujAt[j.id];if(was&&was!==j.at){ujAt[j.id]=j.at;if(P.route===was&&j.at!==P.sector){P.route=j.at;if(W&&!P.docked&&apOn){const g=routeNext();if(g)W.tgt={kind:'gate',ref:g}}}}}}
// what counts: robbing or killing the named freighter; robbing or killing faction miners in the job's system
// (runs in the context of the pilot who did it, so a guest's take or kill counts for the guest's own jobs)
function ujobHit(T,how){if(!S.unb||!T)return;const k=pkey();for(const j of ujobs().slice()){if(!j.on||j.k!==k)continue;
  if(j.kind==='icpt'&&T.tradeT&&T.tradeT.id===j.tgt){ujobEnd(j,true);continue}
  if(j.kind==='mine'&&T.role==='miner'&&T.side===j.f&&S.player.sector===j.sid&&!T.ujob){T.ujob=1;j.n++;if(j.n>=j.need)ujobEnd(j,true);else flash(`Mining disrupted: ${j.n} of ${j.need} miners.`)}}}
{const o=takeEnd;takeEnd=function(){const tk=unbRT().take;const r=o.apply(this,arguments);try{if(tk&&tk.moved>=3&&!NET.cl)ujobHit(tk.T,'take')}catch(e){}return r}}
{const o=unbKill;unbKill=function(e){const r=o.apply(this,arguments);try{if(!NET.cl)ujobHit(e,'kill')}catch(x){}return r}}
// host: a guest takes a job from their board
function ujobTake(id){const k=pkey(),J=ujobs(),j=J.find(x=>x.id===+id&&x.k===k);if(!j||j.on)return;if(J.filter(x=>x.on&&x.k===k).length>=2){flash('You already have two jobs on. Finish one first.',true);return}
  j.on=1;j.until=S.T+(j.kind==='mine'?UJOB.mine.T:UJOB.icpt.T);feed(`☠ Job taken: ${j.title}. ${j.kind==='mine'?`Rob or kill ${j.need} ${FACTIONS[j.f].short} miners in ${DEF[j.sid].name}.`:'Rob it or kill it.'} Pays ${fmt(j.pay)} cr and Infamy.`,'good')}
// the HUD card and the P key
let ujPick=null;
function ujList(){return ujobs().filter(ujMine).sort((a,b)=>(b.on?1:0)-(a.on?1:0))}
function ujStat(j){if(j.kind==='mine')return`${j.n}/${j.need} miners · ${DEF[j.sid].name}`;const t=(S.traders||[]).find(x=>x.id===j.tgt);return t?`now ${DEF[t.sector].name} → ${DEF[t.to].name} · meet it in ${DEF[j.at].name}`:'gone'}
function ujobKey(next){const L=ujList();if(!L.length){flash('No haven jobs right now. They come over the wire every few minutes.',true);return}let i=Math.max(0,L.findIndex(j=>j.id===ujPick));
  if(next){if(L.length<2){flash('That is the only job right now.');ujPick=L[0].id;return}i=(i+1)%L.length;ujPick=L[i].id;flash(`Job ${i+1} of ${L.length}: ${L[i].title}. Press P to take it.`);return}
  const j=L[i];ujPick=j.id;if(!j.on){if(L.filter(x=>x.on).length>=2){flash('You already have two jobs on. Finish one first.',true);return}
    if(NET.cl){netSend({t:'ujob',id:j.id});j.on=1;j.until=S.T+(j.kind==='mine'?UJOB.mine.T:UJOB.icpt.T);feed(`☠ Job taken: ${j.title}. ${j.kind==='mine'?`Rob or kill ${j.need} ${FACTIONS[j.f].short} miners in ${DEF[j.sid].name}.`:'Rob it or kill it.'} Pays ${fmt(j.pay)} cr and Infamy.`,'good')}else ujobTake(j.id);SFX.count&&SFX.count(true)}ujobCourse(j)}
function ujobHud(el){try{ujobSteer()}catch(e){}const L=ujList(),si=Math.max(0,L.findIndex(j=>j.id===ujPick));let h=`<div class="ot" style="border-color:${sideCol('pirate')}"><span>Haven jobs</span><b>${L.filter(j=>j.on).length} on</b></div>`;
  if(!L.length)h+=`<div class="om" style="color:var(--dim)">Nothing on the wire. Jobs come in every few minutes.</div>`;
  L.forEach((j,i)=>{const on=i===si;h+=`<div class="oi sd${on?' sel':''}"><div class="om"><i class="otg cmb">${j.kind==='mine'?'Disrupt':'Intercept'}</i>${esc(j.title)}</div><div class="os"><span>${esc(ujStat(j))} · ${fmtT(Math.max(0,j.until-S.T))} · ${fmt(j.pay)} cr</span><span class="${j.on?'ok':'go'}">${j.on?(on?'✓ P course':'✓'):on?'P · take':''}</span></div></div>`});
  if(L.length>1)h+=`<div class="onx"><kbd>⇧P</kbd> next job · ${si+1} of ${L.length}</div>`;el.hidden=false;if(el._h!==h){el._h=h;el.innerHTML=h}}
// ============================================================ upgrade stock at each faction's home station
// A pilot's Mk II and Mk III parts (Alloy Plate, Conduit, Flux Coil) shouldn't vanish because the faction spent its
// warehouse on keels and torpedoes. Each faction's main station keeps a separate upgrade stock no other project can touch,
// refilled by a slow recharge counter (no hauling, no mining). At that station, parts missing from your hold and vault for
// an upgrade are bought from it at base price. Its parts enter the economy when fitted; the ledger baseline counts them in.
const UPGS={cap:{plate:24,wire:16,coil:8},every:{plate:30,wire:40,coil:75}};
function ustockOf(R){if(R.ustock)return R.ustock;R.ustock={...UPGS.cap};if(S.ledger0){const v=invVec(R.ustock);for(const e of RAWS)S.ledger0.tot[e]=(S.ledger0.tot[e]||0)+v[e]}return R.ustock}   // a new stock starts full (and is counted into the ledger)
function upgStockOf(c,P){const R=mR(c);if(!R||R.kind!=='core'||!FAC_IDS.includes(R.owner)||R.owner!==P.faction||S.unb)return null;return ustockOf(R)}
function upgStockTick(){for(const id in S.stations){const R=S.stations[id];if(R.kind!=='core'||!FAC_IDS.includes(R.owner))continue;const u=ustockOf(R),made={};
    R.uacc=R.uacc||{};for(const k in UPGS.cap){if((u[k]||0)>=UPGS.cap[k]){R.uacc[k]=0;continue}R.uacc[k]=(R.uacc[k]||0)+10;while(R.uacc[k]>=UPGS.every[k]&&(u[k]||0)<UPGS.cap[k]){R.uacc[k]-=UPGS.every[k];u[k]=(u[k]||0)+1;made[k]=(made[k]||0)+1}}
    if(Object.keys(made).length&&S.ledger0){const v=invVec(made);for(const e of RAWS)S.ledger0.tot[e]=(S.ledger0.tot[e]||0)+v[e]}}}
// what an upgrade still needs after the hold and vault, and what the stock charges for it
function upgFromStock(r,srcs,u){const need={};let cost=0;for(const k in r){const lack=r[k]-countIn(k,srcs);if(lack>0){need[k]=lack;cost+=Math.ceil(baseValue(k))*lack}}const ok=!!u&&Object.keys(need).every(k=>(u[k]||0)>=need[k]);return{need,cost,ok:ok||!Object.keys(need).length}}
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{if(!NET.cl)upgStockTick()}catch(e){frameErr('upgrade stock',e)}return r}}
// ============================================================ supply runs for a pilot's carrier (comms, Command page)
// A pilot with a carrier of their own in the system can ask their faction for a supply run: a freighter leaves the
// nearest friendly station or depot that has the goods, follows the capital (it is a convoy like any other: raidable,
// escortable) and, on arrival, the plate patches the hull (CSUP.hullPer a plate; the plating stays aboard and spills if the
// carrier is lost, so the ledger stays exact) and the kits refill empty fighter bays and assault bays. The pilot pays the faction for the goods at base price when the run is sent.
const CSUP={hullPer:100,maxPlate:40};
function csupCap(){if(!S||!W)return null;const me=S.frigates||[];return me.find(t=>fMine(t)&&isCar(t)&&t.hull>0&&t.side!=='brood'&&(t.sector===W.sid||(W.bridge&&W.bridge.f&&W.bridge.f.tok===t)))||null}
function csupEnt(t){const w=WORLDS[t.sector];return w&&w.ents.find(e=>e.alive&&e.tok===t)}
function csupHull(t){const e=t.live&&csupEnt(t);return e?e.hull:t.hull}
function csupNeed(t){const need={},miss=capHullMax(t)-csupHull(t);if(miss>CSUP.hullPer*.5)need.plate=Math.min(CSUP.maxPlate,Math.ceil(miss/CSUP.hullPer));const bays={};
  if(isCar(t)){const free=CAR_WING-carHave(t);for(let i=0;i<free;i++){const c=i%2?'interceptor':'striker';inv.addAll(need,carKit(c));bays[c]=(bays[c]||0)+1}}
  const aCap=isCar(t)?CAR_ASSAULT:0,aFree=Math.max(0,aCap-(t.aload||0));for(let i=0;i<aFree;i++)inv.addAll(need,ASSAULT_LD);return{need,bays,aFree,miss:Math.max(0,Math.round(miss))}}
function csupRequest(){const t=csupCap();if(!t){flash('You have no carrier of your own in this system.',true);return}if(NET.cl){flash('Supply runs are requested by the galaxy host for now.',true);return}
  if(haulBusy('csup:'+t.id)){flash(`A supply run for ${t.name} is already on its way.`,true);return}
  const P=S.player,f=P.faction,{need,bays,aFree,miss}=csupNeed(t);if(!Object.keys(need).length){flash(`${t.name} needs nothing: hull, bays and assault ships are full.`);return}
  const cands=[...Object.values(S.stations).filter(R=>R.owner===f&&isDepotF(R)).map(R=>({R,srcs:[dStore(R)]})),{R:S.stations[FAC_HOME(f)],srcs:[S.econ.stock[f],S.econ.fleet[f]].filter(Boolean)}].filter(c=>c.R)
    .sort((a,b)=>(HOP[a.R.sid][t.sector]||0)-(HOP[b.R.sid][t.sector]||0));
  const src=cands.find(c=>Object.keys(need).every(k=>c.srcs.reduce((a,x)=>a+(x[k]||0),0)>=need[k]))||cands.find(c=>Object.keys(need).some(k=>c.srcs.reduce((a,x)=>a+(x[k]||0),0)>0));
  if(!src){flash(`No ${FACTIONS[f].short} station has the plate and coil for ${t.name} right now.`,true);return}
  const sent={};for(const k in need){const n=Math.min(need[k],src.srcs.reduce((a,x)=>a+(x[k]||0),0));if(n>0)sent[k]=n}
  let cost=0;for(const k in sent)cost+=Math.ceil(baseValue(k))*sent[k];if(P.credits<cost){flash(`A supply run for ${t.name} costs ${fmt(cost)} cr for the goods.`,true);return}
  takeFrom(sent,src.srcs);transfer('player',f,cost);const h=haulSend(f,src.R.sid,t.sector,sent,'csup:'+t.id,'capital supplies',t.id);if(!h){inv.addAll(src.srcs[0],sent);transfer(f,'player',cost);flash('No route for a supply run.',true);return}
  const what=Object.keys(sent).map(k=>`${sent[k]} ${ITEMS[k].name}`).join(', '),j=HOP[src.R.sid][t.sector]||0;
  feed(`📦 Supply run for ${t.name}: ${what} from ${src.R.name} (${j} jump${j===1?'':'s'}), ${fmt(cost)} cr. It patches ${miss?Math.min(miss,(sent.plate||0)*CSUP.hullPer)+' hull':'no hull'}${isCar(t)&&Object.keys(bays).length?' and refills empty bays':''}${aFree?' and assault bays':''} on arrival. You can escort it from Jobs.`,'good');SFX.count&&SFX.count(true)}
// the freighter has reached the capital: patch the hull, then fill bays from the kits it brought
function csupApply(t){const st=t.store=t.store||{},e=t.live&&csupEnt(t),H=capHullMax(t);let rep=0,b=0,a=0;
  while((st.plate||0)>0&&(e?e.hull:t.hull)<H-CSUP.hullPer*.5){inv.add(e?e.load:t.load,'plate',inv.take(st,'plate',1));const add=Math.min(CSUP.hullPer,H-(e?e.hull:t.hull));if(e)e.hull+=add;t.hull=Math.min(H,t.hull+add);rep+=add}
  if(isCar(t))while(carHave(t)<CAR_WING){const c=haveIn(carKit('striker'),[st])?'striker':haveIn(carKit('interceptor'),[st])?'interceptor':null;if(!c)break;const kit=carKit(c);takeFrom(kit,[st]);if(e){(e.bay=e.bay||[]).push(c);inv.addAll(e.load,kit)}else{(t.wing=t.wing||[]).push(c);inv.addAll(t.load,kit)}b++}
  const aCap=isCar(t)?CAR_ASSAULT:0;while((t.aload||0)<aCap&&haveIn(ASSAULT_LD,[st])){takeFrom(ASSAULT_LD,[st]);inv.addAll(e?e.load:t.load,ASSAULT_LD);t.aload=(t.aload||0)+1;a++}
  if(rep||b||a)keyFeed(t.owner||'me',`📦 Supply run delivered to ${t.name}: ${rep?Math.round(rep)+' hull patched':''}${rep&&(b||a)?', ':''}${b?b+' fighter'+(b>1?'s':'')+' in the bays':''}${b&&a?', ':''}${a?a+' assault ship'+(a>1?'s':'')+' loaded':''}.`,'good')}
{const o=haulArrive;haulArrive=function(h){const isC=h&&typeof h.key==='string'&&h.key.startsWith('csup:');const C=isC&&(S.frigates||[]).find(x=>x.id===h.car);const r=o.apply(this,arguments);try{if(C&&C.hull>0)csupApply(C)}catch(e){frameErr('supply run',e)}return r}}

// ============================================================ where the capitals are (Oct 2026)
// Friendly capitals stand out on the galaxy map (chevrons with a pale rim, yours in amber, a red pulse in a fight, every
// friendly course drawn), the map panel lists the faction's fleet with what each ship is doing, comms can fly you to the
// nearest one, and every enemy capital you have seen leaves a fading "last seen" mark for CAP_SIGHT_T seconds.
const CAP_SIGHT_T=900;
function capFriendly(t){return!!t&&(fMine(t)||(t.side===S.player.faction&&t.side!=='brood'))}
function capBaseSafe(t){return t.side==='pirate'?'wr':t.side==='brood'?'bl':capBase(t)}
function capJumps(sid){const j=HOP[S.player.sector]&&HOP[S.player.sector][sid];return j?`${j} jump${j>1?'s':''}`:'here'}
function capKind(t){return t.side==='brood'?broodCap(t):capName(t)}
function capStatus(t){const R=S.stations[t.sector];
  if(frigatesIn(t.sector).some(o=>o!==t&&hostile(t.side,o.side)))return{tx:'in battle',bad:1};
  if(hostileStationAt(t.sector,t.side))return{tx:'besieging '+R.name,bad:1};
  if(isCar(t)&&t.dest&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side))return{tx:'striking '+S.stations[t.dest].name,bad:1};
  if(S.T-(t.fightT||-1e9)<30)return{tx:'under attack',bad:1};
  if(t.dest&&t.dest!==t.sector)return{tx:'under way to '+DEF[t.dest].name};
  if(t.sector===capBaseSafe(t)&&(t.hull<capHullMax(t)*.98||(isEsc(t)&&(t.aload||0)<1)))return{tx:'refitting'};
  return{tx:'holding'}}
function capFightNow(t){return!!capStatus(t).bad}
// sightings: per pilot, kept on the pilot record (a guest's own copy stays on their machine)
let capSightT=-99;
function capSightTick(){const P=S.player;if(!P)return;const M=P.capSeen=P.capSeen||{},pf=P.faction,live=new Set();
  for(const t of S.frigates||[]){if(capFriendly(t))continue;live.add(String(t.id));const vis=covered(t.sector)||capTracked(t,pf);
    if(vis)M[t.id]={sid:t.sector,T:S.T,side:t.side,kind:capKind(t),name:t.name,vis:1};else if(M[t.id])M[t.id].vis=0}
  for(const id in M)if(!live.has(id)||S.T-M[id].T>CAP_SIGHT_T)delete M[id]}
function capSightList(){const M=(S.player&&S.player.capSeen)||{};return Object.values(M).sort((a,b)=>(b.vis-a.vis)||(HOP[S.player.sector][a.sid]-HOP[S.player.sector][b.sid]))}
{const o=campHud;campHud=function(){try{if(S&&S.player&&(S.T-capSightT>=2||S.T<capSightT)){capSightT=S.T;capSightTick()}}catch(e){}return o.apply(this,arguments)}}
{const o=drawMap;drawMap=function(){try{if(S&&S.player)capSightTick()}catch(e){}return o.apply(this,arguments)}}
// galaxy map: the markers under each system
function capMapMarks(c,d,x,y,r,fs){const now=performance.now(),cy=y+r+30;let fx=x-r-6;
  const fr=fs.filter(capFriendly).sort((a,b)=>(fMine(b)?1:0)-(fMine(a)?1:0)),en=fs.filter(t=>!capFriendly(t));
  for(const t of fr.slice(0,3)){const col=fMine(t)?PLAYER_COL:sideCol(t.side);c.fillStyle=col;c.strokeStyle='#ece4cf';c.lineWidth=1.3;c.beginPath();c.moveTo(fx,cy-8);c.lineTo(fx+7,cy+5);c.lineTo(fx,cy+1);c.lineTo(fx-7,cy+5);c.closePath();c.fill();c.stroke();
    if(capFightNow(t)){c.strokeStyle=hexA('#ff5d4f',.5+.4*Math.sin(now/180));c.lineWidth=2;c.beginPath();c.arc(fx,cy-1,11,0,TAU);c.stroke()}fx-=17}
  if(fr.length>3){c.fillStyle='#ece4cf';c.font='700 10px "Saira Semi Condensed",sans-serif';c.textAlign='right';c.fillText('×'+fr.length,fx+7,cy+4);fx-=22}
  for(const t of en){c.fillStyle=sideCol(t.side);c.strokeStyle='#070b16';c.lineWidth=1.5;c.beginPath();c.moveTo(fx,cy-6);c.lineTo(fx+6,cy);c.lineTo(fx,cy+6);c.lineTo(fx-6,cy);c.closePath();c.fill();c.stroke();
    if(capPinged(t,S.player.faction)){c.strokeStyle=hexA('#ffcf5a',.55+.35*Math.sin(now/250));c.lineWidth=1.4;c.beginPath();c.arc(fx,cy,10,0,TAU);c.stroke()}fx-=13}
  let sx=x+r+8;for(const g of capSightList()){if(g.vis||g.sid!==d.id)continue;const a=Math.max(.3,1-(S.T-g.T)/CAP_SIGHT_T*.7),col=sideCol(g.side);c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=1.5;c.setLineDash([2,2]);c.beginPath();c.moveTo(sx,cy-6);c.lineTo(sx+6,cy);c.lineTo(sx,cy+6);c.lineTo(sx-6,cy);c.closePath();c.stroke();c.setLineDash([]);
    c.fillStyle=col;c.font='600 9px "Saira Semi Condensed",sans-serif';c.textAlign='left';c.fillText(Math.max(1,Math.round((S.T-g.T)/60))+'m',sx+8,cy+3);c.globalAlpha=1;sx+=30}}
function capMapLines(c,d,x,y,w,h){for(const t of S.frigates||[]){if(t.sector!==d.id||!t.dest||t.dest===t.sector||!capFriendly(t))continue;const[x2,y2]=mapXY(DEF[t.dest],w,h),mine=fMine(t);
    c.strokeStyle=mine?'rgba(240,178,74,.85)':hexA(sideCol(t.side),.4);c.lineWidth=mine?2:1.2;c.setLineDash(mine?[]:[3,5]);c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();c.setLineDash([])}}
// galaxy map panel: the faction's fleet and the enemy capitals you know of
function fleetHtml(){const pf=S.player.faction,L=(S.frigates||[]).filter(t=>capFriendly(t)&&!fMine(t)).sort((a,b)=>HOP[S.player.sector][a.sector]-HOP[S.player.sector][b.sector]);
  let h=`<div id="fleetBox"><div class="h3">${S.unb?'Unbound capitals':esc(FAC(pf).short)+' capital fleet'} · ${L.length}</div>`;
  if(!L.length)h+=`<p class="note" style="margin:0">No ${S.unb?'Unbound':esc(FAC(pf).short)} carriers or escorts are out right now.</p>`;
  for(const t of L.slice(0,10)){const st=capStatus(t),hp=Math.round(t.hull/capHullMax(t)*100);h+=`<div class="opr ${st.bad?'defend':'assist'}" data-fsel="${t.sector}" style="cursor:pointer"><div><b>${esc(t.name)}</b> · ${esc(capKind(t))}<br><span>${esc(DEF[t.sector].name)} · ${esc(capJumps(t.sector))} · ${st.bad?`<b style="color:var(--danger)">${esc(st.tx)}</b>`:esc(st.tx)} · hull ${hp}%</span></div>${t.sector!==S.player.sector?`<button class="btn sm" type="button" data-fcourse="${t.sector}">Course</button>`:''}</div>`}
  const SG=capSightList();if(SG.length){h+=`<div class="h3" style="margin-top:12px">Enemy capitals · last seen</div>`;for(const g of SG.slice(0,10))h+=`<div class="opr" data-fsel="${g.sid}" style="cursor:pointer"><div><b style="color:${sideCol(g.side)}">${esc(g.name)}</b> · ${esc((g.side==='brood'?'Brood':sideName(g.side))+' '+g.kind)}<br><span>${esc(DEF[g.sid].name)} · ${esc(capJumps(g.sid))} · ${g.vis?'in sight now':'seen '+fmtT(S.T-g.T)+' ago'}</span></div></div>`}
  return h+'</div>'}
{const o=renderMapSide;renderMapSide=function(){const r=o.apply(this,arguments);try{const el=$('mapSide');if(!el||!S||!S.player)return r;const own=[...el.querySelectorAll('.h3')].find(e=>e.textContent==='Your capital fleet');
    if(own)own.parentElement.insertAdjacentHTML('afterend',fleetHtml());else el.insertAdjacentHTML('afterbegin',fleetHtml());
    for(const b of el.querySelectorAll('#fleetBox [data-fsel]'))b.onclick=()=>{mapSel=b.dataset.fsel;drawMap();renderMapSide()};
    for(const b of el.querySelectorAll('#fleetBox [data-fcourse]'))b.onclick=e=>{e.stopPropagation();const sid=b.dataset.fcourse;S.player.route=sid;feed(`Course set for ${DEF[sid].name}. Press J in flight to engage autopilot.`,'info');drawMap();renderMapSide()}}catch(e){frameErr('fleet panel',e)}return r}}
// comms, Command page: fly to the nearest friendly capital
function capNearest(){let best=null,bh=1e9;for(const t of S.frigates||[]){if(!capFriendly(t))continue;const h=HOP[S.player.sector][t.sector];if(h<bh){bh=h;best=t}}return best}
{const o=cmOpts;cmOpts=function(T){const O=o.apply(this,arguments);try{if(W&&T===W.player){const t=capNearest();if(t)O.push({k:'tocap',l:`Fly to the nearest capital: ${t.name} (${capJumps(t.sector)})`})}}catch(e){}return O}}
{const o=cmDo;cmDo=function(k,T){if(k!=='tocap')return o.apply(this,arguments);const t=capNearest();if(!t||!W){flash('No friendly capital ship is out.',true);return}
  if(t.sector!==W.sid){S.player.route=t.sector;const g=routeNext();if(g){W.tgt={kind:'gate',ref:g};apOn=true}flash(`Course set to ${DEF[t.sector].name}, where ${t.name} is. Autopilot on: steer to take back control.`);return}
  const e=W.ents.find(x=>x.alive&&x.tok===t);if(e){W.tgt={kind:'ship',ref:e};apOn=true;flash(`Autopilot to ${t.name}. Steer to take back control.`)}else flash(`${t.name} is in this system but not in sight yet.`)}}

// ============================================================ AI carriers fly two wings (Oct 2026)
// In a live system an AI carrier keeps Alpha on the carrier as its screen and sends Bravo hunting (enemy craft, bombers
// first). When its target is next door (a hostile station or capital where it's headed, or a hostile depot beside it while
// it holds) and nothing threatens it here, Bravo goes through the gate on a strike, the same sortie a pilot's carrier flies:
// capture with assault ships aboard, destroy without. Off-screen carriers keep their stand-off strike (wingPower).
const AICAR={cool:150,threat:5000,minCraft:3};
function aiCarSortie(){if(NET.cl||!S||S.training)return;for(const t of S.frigates||[]){if(!isCar(t)||fOwn(t)||!t.live||t.hull<=0)continue;const w=WORLDS[t.sector];if(!w||S.T<(t.sorT||0)||sortiesOf(t).some(v=>v.wg==='B'))continue;
    const sd=sideNorm(t.side),near=NEIGH[t.sector];let to=null,tgt=null;
    if(t.dest&&near.includes(t.dest)){if(hostileStationAt(t.dest,sd)){to=t.dest;tgt='st'}else{const o=frigatesIn(t.dest).find(x=>hostile(sd,x.side));if(o){to=t.dest;tgt='c'+o.id}}}
    if(!to&&(!t.dest||t.dest===t.sector)){let bh=2;for(const n of near){const R=S.stations[n];if(R&&R.kind==='depot'&&hostileStationAt(n,sd)){const h=R.hull/(R.hMax||1);if(h<bh){bh=h;to=n;tgt='st'}}}}
    if(!to)continue;
    inW(w,()=>{const E=W.ents.find(x=>x.tok===t&&x.alive);if(!E)return;if(W.ents.some(o=>o.type==='ship'&&o.alive&&o.role!=='frigate'&&hostile(sd,o.side)&&d3(o,E)<AICAR.threat))return;
      if((E.pickets||[]).filter(p=>p.alive&&p.wg==='B'&&W.ents.includes(p)).length+(E.bay||[]).length<AICAR.minCraft)return;
      const n=sortieStart(t,E,to,tgt,'B');if(!n)return;const ev=sortiesOf(t).find(v=>v.wg==='B');if(ev&&tgt==='st')ev.mode=sd!=='brood'&&aAvail(t)>0?'cap':'raze';t.sorT=S.T+AICAR.cool})}}
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{aiCarSortie()}catch(e){frameErr('carrier wings',e)}return r}}

// a guest docked in a Lair that is destroyed or replaced goes back into space (on the host), so nothing is moved into a stash that's gone
function lairEvict(L){if(!NET.host||!L||!L.pid||isMe(L.pid))return;const P=S.pilots&&S.pilots[L.pid];if(!P||P.docked!=='lair'||P.lairId!==L.id)return;P.docked=null;P.lairId=null;
  const c=readyCl().find(x=>x.pid===L.pid);try{spawnRP(L.pid)}catch(e){}if(c){send(c.L,{t:'kick'});sendPR(c,false,true)}netRoster()}
{const o=spawnRP;spawnRP=function(pid){const e=o.apply(this,arguments);const P=S.pilots&&S.pilots[pid];if(e&&P&&P.jamMode&&S.unb)e.jamMode=true;return e}}   // a guest's jam mode survives docking and respawning

// a live siege lands the assault loads its strike group carries (ev.force), as it does off-screen
function siegeAssault(sid,side,g,use){const need={};for(const k in ASSAULT_LD)need[k]=ASSAULT_LD[k]*g;const ev=(S.events||[]).find(v=>v.type==='offensive'&&v.st===sid&&sideNorm(v.att)===side&&v.stage!=='done'&&haveIn(need,[v.force||{}]));if(!ev)return false;
  if(use){const s=S.sectors[sid];for(let i=0;i<g;i++)if(Math.random()<ASSAULT.depotLoss){const got={};takeFrom(ASSAULT_LD,[ev.force]);inv.addAll(got,ASSAULT_LD);toDebris(s,got)}}return true}

// hostility with a guest's ship in an Unbound galaxy: a guest pilot is Unbound like the host (side 'pirate' on the host), so the
// host's player rules apply to them, with their own false colours (unbCoverP), not the host's
function hostE(a,e){if(e&&e.rp&&S.unb){if(a==='player'||a==='pirate'||a==='neutral')return false;if(a==='brood')return true;if(FAC_IDS.includes(a))return!unbCoverP(S.pilots&&S.pilots[e.rp],a);}return hostile(a,e&&e.side)}
// an attack (missile, laser) from a source on a target: guest targets as above; a guest's weapons hit the Brood as the host's do
function hostAt(side,src,e){if(e&&e.rp&&S.unb)return hostE(side,e);if(src&&src.rp&&S.unb&&e&&e.side==='brood')return true;return hostile(side,e&&e.side)}

// ============================================================ a carrier calls for a scout (Oct 2026)
// From the Strategic console a carrier's commander can call one of the faction's scouts to a system within 3 jumps: the scout
// flies straight there (a jump each tick) and keeps watch for 10 minutes, seeing the system and its neighbours (and flipping its
// beacon if it can), then goes back to its rounds. If no scout is free, command readies one (a faction keeps a second scout
// while a call is waiting). The Unbound and the Brood have no scouts to call.
const SCALL={reach:3,watch:600};
function scoutFor(t){const f=sideNorm(t.side);return(S.scouts||[]).filter(x=>x.side===f&&!x.ord).sort((a,b)=>HOP[a.sector][t.sector]-HOP[b.sector][t.sector])[0]||null}
function scoutAssign(t){const R=t.scoutReq;if(!R||R.sc)return;const sc=scoutFor(t);if(!sc)return;R.sc=sc.id;sc.ord={to:R.sid,car:t.id,until:null};
  const j=HOP[sc.sector][R.sid];scoutSay(t,j?`A ${FAC(sc.side).short} scout is on its way to ${DEF[R.sid].name} for ${t.name} (${j} jump${j>1?'s':''}).`:`A ${FAC(sc.side).short} scout is already in ${DEF[R.sid].name}: it keeps watch there for ${t.name}.`)}
function scoutSay(t,msg){if(t.owner)keyFeed(t.owner,msg,'info');else if(friendSide(t.side))feed(msg,'info')}
function scoutOrdStep(sc){const o=sc.ord,t=(S.frigates||[]).find(x=>x.id===o.car);
  if(sc.sector!==o.to){const p=trPath(sc.sector,o.to);const nx=p&&p[1];if(!nx){scoutDone(sc,t,'it found no way there');return}sc.sector=nx;if(WORLDS[nx])inW(WORLDS[nx],()=>spawnScout(sc,true));if(nx===o.to){o.until=S.T+SCALL.watch;if(t)scoutSay(t,`📡 The scout is over ${DEF[o.to].name}: ${t.name} can see it and its neighbours for ${Math.round(SCALL.watch/60)} minutes.`)}return}
  if(o.until==null)o.until=S.T+SCALL.watch;if(S.T>o.until)scoutDone(sc,t,null)}
function scoutDone(sc,t,why){if(t&&t.scoutReq&&t.scoutReq.sc===sc.id){scoutSay(t,why?`The scout couldn't reach ${DEF[sc.ord.to].name}: ${why}.`:`The scout's watch over ${DEF[sc.ord.to].name} is over.`);t.scoutReq=null}sc.ord=null}
{const o=strategicTick;strategicTick=function(){const r=o.apply(this,arguments);try{if(!NET.cl)for(const t of S.frigates||[])if(t.scoutReq&&!t.scoutReq.sc)scoutAssign(t);
  for(const sc of S.scouts||[])if(sc.ord&&!(S.frigates||[]).some(x=>x.id===sc.ord.car))sc.ord=null;
  for(const t of S.frigates||[])if(t.scoutReq&&t.scoutReq.sc&&!(S.scouts||[]).some(x=>x.id===t.scoutReq.sc)){scoutSay(t,'Contact lost with the scout you called.');t.scoutReq=null}}catch(e){frameErr('scout calls',e)}return r}}
// the console command: scout:<system> (call), scout:- (cancel)
{const o=fconApply;fconApply=function(t,a,ent){const s=String(a);if(!s.startsWith('scout:'))return o.apply(this,arguments);if(!isCar(t))return;const sid=s.slice(6),f=sideNorm(t.side);
  if(!FAC_IDS.includes(f)){flash('The Unbound keep no scouts to call.',true);return}
  if(sid==='-'){const R=t.scoutReq;if(R){const sc=(S.scouts||[]).find(x=>x.id===R.sc);if(sc)sc.ord=null;t.scoutReq=null;flash('Scout call cancelled.')}return}
  if(!DEF[sid]||HOP[t.sector][sid]>SCALL.reach){flash('Too far: a scout can be called to a system within 3 jumps of the carrier.',true);return}
  {const R=t.scoutReq;if(R&&R.sc){const sc=(S.scouts||[]).find(x=>x.id===R.sc);if(sc)sc.ord=null}}t.scoutReq={sid,T:S.T,sc:null};scoutAssign(t);if(!t.scoutReq.sc)scoutSay(t,`No ${FAC(f).short} scout is free: command is readying one for ${t.name}.`)}}
function scoutCallHtml(t){const f=sideNorm(t.side);if(!FAC_IDS.includes(f))return'';const R=t.scoutReq,sc=R&&R.sc&&(S.scouts||[]).find(x=>x.id===R.sc);
  let st='No scout called.';if(R&&!sc)st=`Waiting for a scout to ${esc(DEF[R.sid].name)}: command is readying one.`;else if(sc){const o=sc.ord;st=sc.sector!==o.to?`Scout on its way to ${esc(DEF[o.to].name)} · now in ${esc(DEF[sc.sector].name)} (${HOP[sc.sector][o.to]} jump${HOP[sc.sector][o.to]>1?'s':''})`:`Scout watching ${esc(DEF[o.to].name)} · ${fmtT(Math.max(0,(o.until||S.T)-S.T))} left`}
  const L=SECTOR_DEFS.filter(d=>{const h=HOP[t.sector][d.id];return h>=1&&h<=SCALL.reach}).sort((a,b)=>HOP[t.sector][a.id]-HOP[t.sector][b.id]||(covered(a.id)?1:0)-(covered(b.id)?1:0));
  return`<div class="h3" style="margin-top:14px">Call for a scout</div><p class="note" style="margin-top:0">${st}</p><p class="note" style="margin-top:0">A faction scout flies to the system you pick (up to ${SCALL.reach} jumps) and keeps watch for ${Math.round(SCALL.watch/60)} minutes: you see it and its neighbours, enemy capitals included.</p><div class="fbtns">${L.map(d=>`<button class="btn sm" data-fc="scout:${d.id}" aria-pressed="${!!(R&&R.sid===d.id)}">${esc(d.name)} · ${HOP[t.sector][d.id]}${covered(d.id)?'':' · unseen'}</button>`).join('')}${R?'<button class="btn sm bad" data-fc="scout:-">Cancel</button>':''}</div>`}
{const o=renderConsole;renderConsole=function(full){const r=o.apply(this,arguments);try{const B=W&&W.bridge;if(B&&B.panel==='strat'&&B.f&&B.f.tok&&isCar(B.f.tok)){const el=$('stratSide');if(el&&!el.querySelector('[data-fc^="scout:"]'))el.insertAdjacentHTML('beforeend',scoutCallHtml(B.f.tok))}}catch(e){}return r}}
