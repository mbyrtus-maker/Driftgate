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
// The Unbound keep to space no faction calls home: they never raid, patrol or route a capital through a faction's core or
// frontier systems. Their haven is a station dug into a giant rock in The Wrack. Its slipway builds an escort around the
// 25-minute mark, a second by 45, and a carrier after an hour, if they can mine, salvage, plunder and fence the parts.
const PIR_E1=1500,PIR_E2=2700,PIR_C=3900,PIR_REBUILD=600,PIR_LURK=.65,LURK_TRIG=850,LURK_RADAR=1600;
STN.haven={sMax:3000,hMax:9000,tur:6,dmg:14,range:1450};LS_RATE.haven=.6;
const PIR_ESC_NAMES=['Saucy Gull','Rum Runner','Widow\'s Grin','Bilge Rat','Cutlass Kate','Black Penny','Scurvy Dog','Gallows Bird'],PIR_CAR_NAMES=['The Drowned Crown','Queen of Scrap','Mother of Knives','Old Grog','Salt Saint'];
const PIR_OK=new Set(SECTOR_DEFS.filter(d=>!d.home&&d.kind!=='hive').map(d=>d.id));
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
// no Unbound wings in faction space; elsewhere most of them go to ground on the rocks
{const o=spawnWing;spawnWing=function(role,side,size,initial){if(side==='pirate'&&W&&DEF[W.sid]&&DEF[W.sid].home)return null;const g=o.apply(this,arguments);
  if(g&&side==='pirate'&&role==='pirate'&&DEF[W.sid].kind!=='den'&&Math.random()<PIR_LURK)lurkPlan(g,initial);if(g)aceMaybeLead(g,role,side);return g}}
{const o=spawnNPC;spawnNPC=function(role,side){if(side==='pirate'&&W&&DEF[W.sid]&&DEF[W.sid].home)return null;return o.apply(this,arguments)}}
// pirate carriers fly no assault ships (the Unbound plunder depots, they don't hold them) and take no supply convoys:
// a carrier at the haven is restocked straight from Unbound stores, anywhere else what it asked for stays in the stores
{const o=haulSend;haulSend=function(f,fromSid,toSid,load,key,why,car){if(f==='pirate'){const t=car&&(S.frigates||[]).find(x=>x.id===car);if(t&&t.sector==='wr'){t.store=t.store||{};inv.addAll(t.store,load)}else inv.addAll(S.econ.stock.pirate,load);return null}return o.apply(this,arguments)}}
{const o=capCanRefill;capCanRefill=function(t){if(t&&t.side==='pirate')return false;return o.apply(this,arguments)}}
{const o=carOrder;carOrder=function(t,f){if(f==='pirate')return;return o.apply(this,arguments)}}
{const o=capRefill;capRefill=function(t){const r=o.apply(this,arguments);if(t&&t.side==='pirate'){while((t.aload||0)>0){const got={};for(const k in ASSAULT_LD){const m=Math.min(ASSAULT_LD[k],t.load[k]||0);if(m>0)got[k]=inv.take(t.load,k,m)}inv.addAll(S.econ.stock.pirate,got);t.aload--}}return r}}
{const o=carTick;carTick=function(){const r=o.apply(this,arguments);for(const t of S.frigates||[])if(t.side==='pirate'&&t.fab&&t.fab.assault){inv.addAll(t.store=t.store||{},t.fab.kit);t.fab=null}return r}}
{const o=frigHop;frigHop=function(t){if(t&&t.side==='pirate'&&!t.jumpTo&&t.dest&&t.dest!==t.sector&&HOPP[t.dest]){let best=null,bh=99;for(const n of NEIGH[t.sector]){if(!PIR_OK.has(n))continue;const h=HOPP[t.dest][n];if(h!==undefined&&h<bh){bh=h;best=n}}return best}return o.apply(this,arguments)}}
{const o=frigOrders;frigOrders=function(t){if(t&&t.side==='pirate')return pirOrders(t);return o.apply(this,arguments)}}
function pirOrders(t){const hp=t.hull/capHullMax(t);if(hp<.55||(isCar(t)&&(t.wing||[]).length<2&&t.sector!=='wr'))return'wr';let best='wr',bs=-1e9;const from=HOPP[t.sector]||HOPP.wr;
  for(const sid of PIR_OK){const h=from[sid];if(h===undefined||h>3)continue;let sc=-.8*h+rnd(0,1.2);const d=DEF[sid],Rs=S.stations[sid];
    if(Rs&&FAC_IDS.includes(Rs.owner)&&Rs.kind==='depot')sc+=isCar(t)?3.5:2.2;if(d.kind==='contested'||d.kind==='hub')sc+=1.2;else if(d.kind==='deep')sc+=.8;else if(d.kind==='void')sc+=.3;
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
    allFeed(`☠ The Unbound have launched the ${ev.cls} ${t.name} from Scrapheart Haven. It hunts in contested and open space; it won't enter faction home systems.`,'bad')}
  // plunder: a pirate capital sitting on a broken faction depot carries its stores off, a little each tick
  for(const t of caps){if(t.live)continue;const R=S.stations[t.sector];if(!R||!FAC_IDS.includes(R.owner)||!isDepotF(R)||R.hull>R.hMax*.06)continue;const ds=dStore(R),got={};let m=0;
    for(const k in ds){const n=Math.min(Math.ceil(ds[k]*.12),Math.max(0,40-m));if(n>0){got[k]=inv.take(ds,k,n);m+=got[k]*mass(k)}}if(m>0){inv.addAll(st,got);if((friendSide(R.owner)||covered(t.sector))&&S.T-(t.plT||-99)>90){t.plT=S.T;feed(`☠ The Unbound ${capName(t)} ${t.name} is stripping ${R.name}'s stores.`,friendSide(R.owner)?'bad':'news')}}}}
{const o=pirateIndustry;pirateIndustry=function(){const r=o.apply(this,arguments);try{pirTick()}catch(e){frameErr('unbound',e)}return r}}
// ---- hiding on the rocks
function lurkRocks(){const s=S.sectors[W.sid],R=S.stations[W.sid];return s.ast.filter(a=>!a.comet&&!a.ore.nu&&oreTotal(a)>20&&(!R||d3(a,R)>1600))}
function lurkPlan(g,initial){const R=lurkRocks();if(!R.length)return;const a0=pick(R),near=R.slice().sort((a,b)=>d3(a,a0)-d3(b,a0)).slice(0,4);g.lurk=1;
  g.members.forEach((m,i)=>{const a=near[i%near.length];if(initial)lurkLand(m,a);else m.ai.lurkGo={aid:a.id,T:W.t}})}
function lurkLand(e,a){let dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z,l=hyp(dx,dy,dz);if(l<1){const r=rdir(1);dx=r.x;dy=r.y;dz=r.z;l=1}e.lurk={aid:a.id,nx:dx/l,ny:dy/l,nz:dz/l,until:W.t+rnd(160,260),ck:0};delete e.ai.lurkGo;
  e.stealth=true;e.masked=true;e.maskR=MASK_NEAR;e.shield=0;e.vx=e.vy=e.vz=0;e.boosting=false;const r=astR(a)+e.st.radius;e.x=a.x+e.lurk.nx*r;e.y=a.y+e.lurk.ny*r;e.z=a.z+e.lurk.nz*r}
function lurkPrey(e){let best=null,bs=1e9;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||!hostile(e.side,o.side)||o.role==='frigate'||o.role==='drone'||o.role==='picket')continue;if(o.isPlayer&&(S.player.docked||W.dead))continue;if(mHid(o,e))continue;
  const d=d3(o,e),soft=o.isPlayer||o.rp||['hauler','miner','trader','builder','scout'].includes(o.role);if(d>(soft?LURK_TRIG:400))continue;const sc=d*(soft?.6:1);if(sc<bs){bs=sc;best=o}}return best}
function lurkSpring(g,prey,leave){const L=g&&g.members?g.members:[];let n=0;for(const m of L){if(!m.alive||!(m.lurk||m.ai.lurkGo))continue;const Lk=m.lurk;delete m.lurk;delete m.ai.lurkGo;m.stealth=false;m.masked=false;m.maskR=0;m.boot=W.t+2.5;if(Lk){m.vx=Lk.nx*30;m.vy=Lk.ny*30;m.vz=Lk.nz*30}n++;
  if(prey){m.ai.tgt=prey;m.ai.hunt=prey;m.ai.huntUntil=W.t+90}if(leave&&!prey)m.role='leave'}
  if(!n||!prey)return;const P=prey.isPlayer?S.player:prey.rp&&S.pilots?S.pilots[prey.rp]:null;if(P)xGS(P).amb++;
  if(prey.isPlayer&&W===LW){flash('⚠ Ambush! Unbound fighters are lifting off the rocks.',true);SFX.warn&&SFX.warn()}else if(prey.rp&&NET.host)netMsg(prey.rp,'flash','⚠ Ambush! Unbound fighters are lifting off the rocks.');
  else if(W===LW&&W.player&&d3(prey,W.player)<4500)feed(`⚠ ${n} Unbound fighters burst off the rocks to jump ${prey.role==='hauler'||prey.role==='trader'?'a freighter':prey.role==='miner'?'a miner':'a ship'} nearby.`,'warn')}
function lurkThink(e,dt){const s=S.sectors[W.sid];
  if(e.lurk){const a=s.ast.find(x=>x.id===e.lurk.aid);if(!a||!e.stealth){lurkSpring(e.grp||{members:[e]},e.lastHitBy?W.ents.find(o=>o.type==='ship'&&o.alive&&o.side===e.lastHitBy&&d3(o,e)<2500)||null:null);if(!a&&e.lurk)delete e.lurk;return false}
    const r=astR(a)+e.st.radius;e.x=a.x+e.lurk.nx*r;e.y=a.y+e.lurk.ny*r;e.z=a.z+e.lurk.nz*r;e.vx=e.vy=e.vz=0;e.thrusting=e.boosting=false;e.ai.tgt=null;
    if((e.lurk.ck-=dt)<=0){e.lurk.ck=.4;const prey=lurkPrey(e);if(prey){lurkSpring(e.grp||{members:[e]},prey);return false}if(W.t>e.lurk.until){lurkSpring(e.grp||{members:[e]},null,true);return false}}return true}
  if(e.ai.lurkGo){const G=e.ai.lurkGo,a=s.ast.find(x=>x.id===G.aid);if(!a||W.t-G.T>70){delete e.ai.lurkGo;return false}
    if(W.t-e.lastHit<3||lurkPrey(e)){lurkSpring(e.grp||{members:[e]},lurkPrey(e));return false}
    let dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z;const l=hyp(dx,dy,dz)||1,r=astR(a)+e.st.radius+14,tx=a.x+dx/l*r,ty=a.y+dy/l*r,tz=a.z+dz/l*r;steer(e,tx,ty,tz,dt,true,.9);
    if(hyp(e.x-tx,e.y-ty,e.z-tz)<70&&hyp(e.vx,e.vy,e.vz)<LAND_SPD)lurkLand(e,a);return true}
  return false}
{const o=npcThink;npcThink=function(e,dt){if(e.role==='pirate'&&(e.lurk||e.ai.lurkGo)&&!NET.cl){e.ai.t-=dt;e.life+=dt;e.mining=null;if(lurkThink(e,dt))return}return o.apply(this,arguments)}}
// a scout's long-range radar picks a landed ship out of the rock clutter at 1.6 km instead of 320 m
{const o=seenShip;seenShip=function(e){if(e&&e.masked&&e.lurk!==undefined&&W&&W.player&&CLASSES[S.player.cls]&&CLASSES[S.player.cls].radar&&d3(e,W.player)<LURK_RADAR)return true;if(e&&e.masked&&NET.cl&&e.side==='pirate'&&W&&W.player&&CLASSES[S.player.cls]&&CLASSES[S.player.cls].radar&&d3(e,W.player)<LURK_RADAR)return true;return o.apply(this,arguments)}}
// the haven: the Unbound station model sunk into the face of a giant asteroid
{const o=stationMesh;stationMesh=function(fac,kind){if(kind==='haven')return o.call(this,'pirate','station');return o.apply(this,arguments)}}
const _xq=q0(),_xq2=q0();
function xDraw3D(t){if(!W)return;const SE=W.stationEnt;
  if(SE&&SE.kind==='haven'){const R=SE.rec,d=(R&&R.rock&&R.rock.d)||{x:0,y:-1,z:0},k=230;if(inView(SE.x+d.x*k,SE.y+d.y*k,SE.z+d.z*k,k*1.3)){qAxis(.3,1,.2,.7,_xq);qNorm(_xq);mModel(MM,SE.x+d.x*k*1.05,SE.y+d.y*k*1.05,SE.z+d.z*k*1.05,_xq,k,k*.86,k*.94);drawMesh(astMesh(5,'xc'),MM)}}
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
