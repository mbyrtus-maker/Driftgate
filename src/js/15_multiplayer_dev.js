//@src 15_multiplayer_dev.js
// ============================================================ multiplayer
// Up to four pilots share one galaxy. Whoever opens it first hosts: their browser runs the whole simulation and the others
// connect to it directly (WebRTC data channels; a public PeerJS matchmaking server only introduces the browsers).
// The host streams each pilot's system 15 times a second; each pilot flies their own ship locally and sends its pose and
// trigger state 20 times a second. Trades, docking, jumps and missile launches are requests the host carries out.
// Every pilot's browser keeps the latest galaxy checkpoint, so anyone can host the next session, and if the host leaves
// mid-session the next browser takes over from the last checkpoint. With nobody online the galaxy simply waits.
const MP_HOME='https://mbyrtus-maker.github.io/Driftgate/';
const MPV=1,MP={st:'off',code:'',name:'',pid:'',hostId:'',myId:'',sig:null,sigCfg:null,ice:null,links:{},host:null,cl:{},inp:{},rp:{},
  seenEv:new Set(),snT:0,syT:0,prT:0,ckT:0,uT:0,since:0,ckpt:null,hostPid:null,roster:[],mid:0,pend:[],needPilot:false,elect:0,ckMeta:null};
const rid=n=>{let s='';const a='abcdefghijkmnpqrstuvwxyz23456789';for(let i=0;i<n;i++)s+=a[Math.floor(Math.random()*a.length)];return s};
const cleanCall=n=>String(n||'').replace(/[^A-Za-z0-9 _.\-']/g,'').replace(/\s+/g,' ').trim().slice(0,16);
const GAL_A=['amber','silver','crimson','quiet','iron','violet','solar','frozen','hollow','swift','golden','ember','azure','dusky','stellar','rusty'],GAL_B=['falcon','comet','drift','harbor','lantern','nova','kestrel','reef','vessel','orbit','beacon','spire','tide','forge','nebula','wren'];
const genCode=()=>`${pick(GAL_A)}-${pick(GAL_B)}-${ri(10,99)}`;
const inviteURL=c=>location.origin+location.pathname+'?galaxy='+encodeURIComponent(c);
function copyText(t){try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t);return true}}catch(e){}try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e){return false}}
function showInvite(){const c=($('mpCode').value||'').trim();const box=$('mpInv');if(!box)return;if(!mpSlug(c)){box.hidden=true;return}box.hidden=false;$('mpLink').textContent=inviteURL(c)}
const mpSlug=c=>String(c||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);
function mpConfig(){const q=new URLSearchParams(location.search);let c={host:'0.peerjs.com',port:443,path:'/',key:'peerjs',secure:true};
  const sg=q.get('sig');if(sg){try{const u=new URL(sg);c={host:u.hostname,port:+u.port||(u.protocol==='wss:'?443:80),path:u.pathname.endsWith('/')?u.pathname:u.pathname+'/',key:q.get('key')||'peerjs',secure:u.protocol==='wss:'}}catch(e){}}
  MP.sigCfg=c;MP.mqURLs=(q.get('mqtt')||'wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt').split(',').filter(Boolean);MP.ice=q.get('ice')==='none'?[]:[{urls:'stun:stun.l.google.com:19302'},{urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}];
  try{MP.pid=localStorage.getItem('driftgate.pid')||'';if(!MP.pid){MP.pid=rid(12);localStorage.setItem('driftgate.pid',MP.pid)}}catch(e){MP.pid=MP.pid||rid(12)}
  if(q.get('pid'))MP.pid=q.get('pid')}
const mpOK=()=>typeof RTCPeerConnection!=='undefined'&&typeof WebSocket!=='undefined';
const ckKey=()=>'driftgate.mp.'+mpSlug(MP.code);
function mpStatus(t,bad){const el=$('mpStat');if(el){el.innerHTML=t;el.style.color=bad?'var(--danger)':''}}

// ---- backup relay: a tiny MQTT 3.1.1 client over WebSocket. Each browser listens on a topic named after its id;
// connection offers/answers/candidates are published to the other side's topic as well as sent through PeerJS.
function mqttOpen(url){let ws;try{ws=new WebSocket(url,'mqtt')}catch(e){return null}ws.binaryType='arraybuffer';
  const enc=new TextEncoder(),dec=new TextDecoder(),str=x=>{const b=enc.encode(x);return[b.length>>8,b.length&255,...b]},
    rl=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o},pkt=(h,body)=>new Uint8Array([h,...rl(body.length),...body]);
  const api={url,ok:false,q:[],subs:new Set(),pid:1,
    send(b){if(ws.readyState===1&&api.ok)ws.send(b);else if(api.q.length<200)api.q.push(b)},
    sub(t){if(api.subs.has(t))return;api.subs.add(t);api.pid=(api.pid%60000)+1;api.send(pkt(0x82,[api.pid>>8,api.pid&255,...str(t),0]))},
    pub(t,x){api.send(pkt(0x30,[...str(t),...enc.encode(x)]))},
    close(){clearInterval(api.pi);api.dead=true;try{ws.close()}catch(e){}}};
  ws.onopen=()=>{ws.send(pkt(0x10,[...str('MQTT'),4,2,0,60,...str('dg'+rid(14))]))};
  ws.onmessage=e=>{const d=new Uint8Array(e.data);let i=0;while(i<d.length){const t=d[i]>>4,qos=(d[i]>>1)&3;let m=1,len=0,j=i+1,b;do{b=d[j++];len+=(b&127)*m;m*=128}while(b&128&&j<d.length);const body=d.subarray(j,j+len);
    if(t===2){api.ok=true;for(const x of api.q)ws.send(x);api.q=[];clearInterval(api.pi);api.pi=setInterval(()=>{if(ws.readyState===1)ws.send(new Uint8Array([0xC0,0]))},25000)}
    else if(t===3){const tl=(body[0]<<8)|body[1],topic=dec.decode(body.subarray(2,2+tl));let msg;try{msg=JSON.parse(dec.decode(body.subarray(2+tl+(qos?2:0))))}catch(er){msg=null}if(msg&&msg.dst===MP.myId&&topic==='driftgate1/'+MP.myId)sigMsg(msg)}
    i=j+len}};
  ws.onclose=()=>{api.ok=false;clearInterval(api.pi);if(!api.dead&&NET.on)setTimeout(()=>{if(NET.on&&MP.mq&&MP.mq.includes(api)){const n=mqttOpen(url);if(n){for(const t of api.subs)n.sub(t);MP.mq[MP.mq.indexOf(api)]=n}}},5000)};
  return api}
function mqStart(){if(MP.mq&&MP.mq.length)return;MP.mq=MP.mqURLs.map(mqttOpen).filter(Boolean)}
function mqInbox(){for(const q of MP.mq||[])q.sub('driftgate1/'+MP.myId)}
function sigSend(o){if(MP.sig)MP.sig.send(o);const m=JSON.stringify({...o,src:MP.myId});for(const q of MP.mq||[])q.pub('driftgate1/'+o.dst,m)}
// ---- matchmaking socket (speaks the PeerJS server protocol: it only relays offers, answers and candidates)
function sigOpen(id){return new Promise(res=>{let done=false;const c=MP.sigCfg;let ws;
  try{ws=new WebSocket(`${c.secure?'wss':'ws'}://${c.host}:${c.port}${c.path}peerjs?key=${encodeURIComponent(c.key)}&id=${encodeURIComponent(id)}&token=${rid(10)}&version=1.5.4`)}catch(e){res({err:'Could not reach the matchmaking server.'});return}
  const hb=setInterval(()=>{if(ws.readyState===1)ws.send('{"type":"HEARTBEAT"}')},5000);
  const fin=r=>{if(!done){done=true;res(r)}};
  const api={ok:true,id,lastHB:0,hb:()=>{if(ws.readyState===1&&performance.now()-api.lastHB>4500){api.lastHB=performance.now();ws.send('{"type":"HEARTBEAT"}')}},send:o=>{if(ws.readyState===1)ws.send(JSON.stringify(o))},close:()=>{clearInterval(hb);ws.onclose=null;try{ws.close()}catch(e){}}};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(m.type==='OPEN')fin(api);
    else if(m.type==='ID-TAKEN'){clearInterval(hb);fin({taken:true});try{ws.close()}catch(e){}}
    else if(m.type==='ERROR'||m.type==='INVALID-KEY'){clearInterval(hb);fin({err:(m.payload&&m.payload.msg)||'Matchmaking error.'})}
    else if(done&&MP.sig===api)sigMsg(m)};
  ws.onerror=()=>{fin({err:'Could not reach the matchmaking server.'})};
  ws.onclose=()=>{clearInterval(hb);fin({err:'The matchmaking server closed the connection.'});if(MP.sig===api){MP.sig=null;sigLost()}};
  setTimeout(()=>{if(!done){fin({err:'The matchmaking server did not answer.'});try{ws.close()}catch(e){}}},12000)})}
// the host keeps its matchmaking line open so new pilots can find it
function sigLost(){if(!NET.host)return;setTimeout(async()=>{if(!NET.host||MP.sig)return;const r=await sigOpen(MP.hostId);if(r.ok&&NET.host){MP.sig=r}else sigLost()},4000)}
async function sigMsg(m){const src=m.src;
  try{
  if(m.type==='OFFER'){if(!NET.host)return;if(performance.now()-(MP.offT||0)>4000){MP.offT=performance.now();feed('A pilot is connecting…','info')}let L=MP.links[src];if(L&&L.n&&L.n===m.payload.n)return;if(L)linkClose(L,true);L=mkLink(src,false);L.n=m.payload.n;await L.pc.setRemoteDescription(m.payload.sdp);const a=await L.pc.createAnswer();await L.pc.setLocalDescription(a);sigSend({type:'ANSWER',dst:src,payload:{sdp:L.pc.localDescription,n:L.n}});flushCands(L)}
  else if(m.type==='ANSWER'){const L=MP.links[src];if(L&&!L.pc.remoteDescription&&(!m.payload.n||m.payload.n===L.n)){await L.pc.setRemoteDescription(m.payload.sdp);flushCands(L);if(NET.cl){MP.stage='The host answered. Linking your browsers…';if(!running)mpStatus(MP.stage)}}}
  else if(m.type==='CANDIDATE'){const L=MP.links[src];if(!L||(m.payload.n&&L.n&&m.payload.n!==L.n))return;if(L.pc.remoteDescription)L.pc.addIceCandidate(m.payload.c).catch(()=>{});else(L.cq=L.cq||[]).push(m.payload.c)}
  else if(m.type==='EXPIRE'){if(NET.cl&&src===MP.hostId&&!(MP.host&&MP.host.open)){if(!running)mpStatus('The host did not answer (they may have just left). Retrying…',true);hostGone()}}
  }catch(e){console.warn('signal',e)}}
function flushCands(L){for(const c of L.cq||[])L.pc.addIceCandidate(c).catch(()=>{});L.cq=[]}

// ---- browser-to-browser link: 'r' is reliable and ordered (requests, saves), 'u' is fire-and-forget (snapshots, flight input)
function mkLink(peer,init){const pc=new RTCPeerConnection({iceServers:MP.ice}),L={peer,pc,r:null,u:null,open:false,parts:{},dead:false,n:init?rid(8):''};
  pc.onicecandidate=e=>{if(e.candidate)sigSend({type:'CANDIDATE',dst:peer,payload:{c:e.candidate.toJSON?e.candidate.toJSON():e.candidate,n:L.n}})};
  pc.onconnectionstatechange=()=>{const s=pc.connectionState;if(NET.cl&&L===MP.host&&!running){MP.stage=s==='connecting'?'Linking your browsers (finding a network path)…':s==='connected'?'Linked. Loading the galaxy…':s==='failed'?'Your browsers could not find a network path to each other.':MP.stage;mpStatus(MP.stage,s==='failed')}if(s==='failed'||s==='closed')linkDown(L);else if(s==='disconnected'){clearTimeout(L.dT);L.dT=setTimeout(()=>{if(pc.connectionState!=='connected')linkDown(L)},5000)}};
  const wire=ch=>{ch.onopen=()=>{if(!L.open&&L.r&&L.r.readyState==='open'&&L.u&&L.u.readyState==='open'){L.open=true;linkUp(L)}};ch.onmessage=e=>linkRecv(L,e.data);ch.onclose=()=>linkDown(L)};
  if(init){L.r=pc.createDataChannel('r',{ordered:true});L.u=pc.createDataChannel('u',{ordered:false,maxRetransmits:0});wire(L.r);wire(L.u);
    pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>{sigSend({type:'OFFER',dst:peer,payload:{sdp:pc.localDescription,v:MPV,n:L.n}})}).catch(e=>console.warn(e))}
  else pc.ondatachannel=e=>{if(e.channel.label==='r')L.r=e.channel;else L.u=e.channel;wire(e.channel)};
  MP.links[peer]=L;return L}
function linkClose(L,quiet){L.dead=true;if(quiet)L.quiet=true;try{L.pc.close()}catch(e){}if(MP.links[L.peer]===L)delete MP.links[L.peer]}
function send(L,o,fast){if(!L||!L.open||L.dead)return;const s=JSON.stringify(o);
  try{if(fast&&L.u.readyState==='open'&&s.length<15000){L.u.send(s);return}
    if(L.r.readyState!=='open')return;if(s.length<15000){L.r.send(s);return}
    const id=rid(6),n=Math.ceil(s.length/15000);for(let i=0;i<n;i++)L.r.send(`~${id}|${i}|${n}|`+s.slice(i*15000,(i+1)*15000))}catch(e){}}
function linkRecv(L,d){if(typeof d!=='string')return;
  if(d[0]==='~'){const a=d.indexOf('|'),b=d.indexOf('|',a+1),c=d.indexOf('|',b+1),id=d.slice(1,a),i=+d.slice(a+1,b),n=+d.slice(b+1,c);const P=L.parts[id]=L.parts[id]||[];P[i]=d.slice(c+1);
    if(P.filter(x=>x!==undefined).length<n)return;delete L.parts[id];d=P.join('')}
  let m;try{m=JSON.parse(d)}catch(e){return}
  try{if(NET.host)hostRecv(L,m);else clientRecv(m)}catch(e){console.error('net',m.t,e)}}
function linkUp(L){if(NET.cl&&L===MP.host){MP.st='joined';send(L,{t:'hello',pid:MP.pid,name:MP.name,v:MPV,ck:MP.ckMeta});mpStatus('Connected. Loading the galaxy…')}}
function linkDown(L){if(L.downDone)return;L.downDone=true;const quiet=L.quiet;linkClose(L);if(quiet)return;
  if(NET.host){const c=MP.cl[L.peer];delete MP.cl[L.peer];if(c&&c.ready)pilotLeft(c)}
  else if(NET.cl&&L===MP.host){MP.host=null;hostGone()}}

// ---- joining: try to claim the galaxy's host name; if someone has it, connect to them
async function mpJoin(){if(!mpOK()){mpStatus('This browser cannot do peer-to-peer connections.',true);return}
  MP.name=cleanCall($('mpName').value);$('mpName').value=MP.name;MP.code=($('mpCode').value||'').trim().slice(0,24);
  if(MP.name.length<2){mpStatus('Choose a callsign first (step 1, at least 2 letters).',true);$('mpName').focus();return}if(!mpSlug(MP.code)){mpStatus('Enter a galaxy code (letters and numbers).',true);return}
  try{localStorage.setItem('driftgate.mpname',MP.name);localStorage.setItem('driftgate.mpcode',MP.code)}catch(e){}
  MP.hostId='driftgate1-'+mpSlug(MP.code)+'-host';mqStart();$('bMp').disabled=true;mpStatus('Contacting the matchmaking server…');
  try{const t=localStorage.getItem(ckKey());if(t){const ck=JSON.parse(t);MP.ckpt=ck;MP.ckMeta={gid:ck.gid,T:ck.T}}}catch(e){}
  await mpElect(true)}
async function mpElect(first){if(MP.sig){MP.sig.close();MP.sig=null}
  const r=await sigOpen(MP.hostId);
  if(r.ok){MP.sig=r;MP.myId=MP.hostId;mqInbox();hostBegin(first);return}
  if(r.taken){const me='driftgate1-'+mpSlug(MP.code)+'-'+MP.pid.slice(0,8)+'-'+rid(4);const r2=await sigOpen(me);
    if(!r2.ok){mpFail(r2.err||'Could not register with the matchmaking server.');return}
    MP.sig=r2;MP.myId=me;mqInbox();NET.on=true;NET.cl=true;NET.host=false;NET.me=MP.pid;MP.st='connecting';holdLock();

    MP.stage='Found the host. Opening a direct connection…';if(first||!running)mpStatus(MP.stage);
    clientDial(0);return}
  mpFail(r.err)}
// dial the host; if it hasn't answered in 9 s ask once more, and give up on this attempt after ~22 s
function clientDial(n){MP.host=mkLink(MP.hostId,true);const L=MP.host;clearTimeout(MP.cT);
  MP.cT=setTimeout(()=>{if(!NET.cl||MP.host!==L||L.open)return;const noAns=!L.pc.remoteDescription;
    if(noAns&&n<1){linkClose(L,true);MP.stage='The host has not answered yet. Asking again…';if(!running)mpStatus(MP.stage);clientDial(n+1);return}
    if(!noAns&&n<2&&L.pc.connectionState==='connecting'){MP.cT=setTimeout(()=>{if(MP.host===L&&!L.open){linkClose(L,true);MP.host=null;hostGone()}},10000);return}
    const st=MP.stage;linkClose(L,true);MP.host=null;
    if(!running)mpStatus(noAns?`The host's game isn't answering. On the host's computer, make sure the Driftgate tab is open in front (not minimised or in a background tab) and that Driftgate is open in only one tab. Retrying…`:`Couldn't connect to the host. It stopped at: <i>${esc(st)}</i> Retrying… If this keeps happening, one of your networks is blocking direct browser connections.`,true);
    hostGone()},n?13000:9000)}
function mpFail(msg){mpStatus(esc(msg)+(/github\.io$|^localhost$|^127\./.test(location.hostname)?' Check your connection and try again.':` Multiplayer runs from <a href="${MP_HOME}" target="_blank" rel="noopener" style="color:var(--amber)">${MP_HOME.replace('https://','')}</a>.`),true);$('bMp').disabled=false;NET.on=false;NET.cl=false;NET.host=false;MP.st='off'}

// ---- hosting
function holdLock(){try{if(MP.lockHeld||!navigator.locks)return;MP.lockHeld=true;navigator.locks.request('driftgate-tab-'+rid(8),()=>new Promise(r=>{MP.lockRel=r}))}catch(e){}}
function hostBegin(first){holdLock();NET.on=true;NET.host=true;NET.cl=false;NET.me=MP.pid;MP.since=performance.now();MP.st='host';MP.hostPid=MP.pid;
  if(first){
    if(MP.ckpt&&MP.ckpt.S){mpAdoptState(MP.ckpt.S)}
    if(S&&S.player){mpRun();feed(`You are hosting “${MP.code}”. Friends who enter the same galaxy code join you.`,'info')}
    else if(MP.autoLaunch){const a=MP.autoLaunch;MP.autoLaunch=null;mpLaunch(a.fac,a.cls)}
    else{mpStatus(S?'You are hosting this galaxy. Choose your faction and ship, then Launch.':'You are hosting a brand-new galaxy. Choose your faction and ship, then Launch.');$('bContinue').hidden=true}}
  netRoster()}
// load a galaxy checkpoint and point S.player at this browser's pilot (null if it has none yet)
function mpAdoptState(st){st.pilots=st.pilots||{};const mine=st.pilots[MP.pid];st.player=mine||Object.values(st.pilots)[0]||st.player;
  WORLDS={};LW=null;W=null;migrate(st);S.player=mine||null;if(S.player){S.player.pid=MP.pid}}
function mpRun(){const P=S.player;P.name=MP.name||P.name;P.pid=MP.pid;if(P.docked==='bridge')P.docked='station';if(P.docked==='turret')P.docked=null;
  WORLDS={};LW=null;W=null;FEED.length=0;startWith(S);S.player=S.pilots[MP.pid];netRoster();
  if(NET.host){hostSave();for(const c of Object.values(MP.cl))if(c.hello&&!c.ready)hJoin(c)}}
function mpLaunch(fac,cls){
  if(NET.host){if(S&&S.pilots){newPilot(MP.pid,MP.name,fac,cls,legPack(MP.name))}else{newGame(fac,cls,MP.name);if(fac==='pirate'){S.unb=1;unbP();S.player.cls='raider'}S.gid=rid(10);S.pilots={};S.pilots[MP.pid]=S.player;S.player.pid=MP.pid;S.player.name=MP.name}
    S.player=S.pilots[MP.pid];mpRun();feed(`You are hosting “${MP.code}”. Friends who enter the same galaxy code join you.`,'info');flash(`Hosting “${MP.code}”. Friends join by typing the same galaxy code.`);feed('Launch with E. Steer with the mouse, thrust with W. In a mining ship, R targets a rock, F fires a charge onto a fault point and '+kb('det')+' detonates; fly into the chunks to scoop them.','info')}
  else if(NET.cl&&MP.host){send(MP.host,{t:'newpilot',fac,cls,leg:legPack(MP.name)});mpStatus('Joining…')}}
function newPilot(pid,name,fac,cls,leg){const L0=ledger();
  const P={pid,name,faction:fac,cls,hullInv:{},bay:{drone:CLASSES[cls].drones||0},tiers:{engine:1,power:1,shield:1,weapon:1,armor:1,drill:1,cargo:1,payload:1},cargo:{},vault:{plate:6,wire:6},rack:rackCapC(cls,1),magV:1,swarm:(CLASSES[cls]&&CLASSES[cls].swarm)||0,wpn:'kinetic',credits:1800,sector:FAC_HOME(fac),docked:'station',x:0,y:0,z:0,vx:0,vy:0,vz:0,q:[0,0,0,1],hull:0,shield:0,energy:0,fa:true,kills:0,tune:{}};
  legendStart(P,leg);const st=shipStats(fac,P.cls,P.tiers,P.tune);P.hull=st.hull;P.shield=st.sCap;P.energy=st.eCap;S.pilots[pid]=P;
  const L1=ledger();for(const e of RAWS)S.ledger0.tot[e]+=L1.tot[e]-L0.tot[e];S.ledger0.credits+=L1.credits-L0.credits;return P}
function hostSave(){if(!NET.host||!S||!S.player)return null;const c=serialize();delete c.player;const ck={gid:S.gid,T:S.T,at:Date.now(),code:MP.code,S:c};
  MP.ckpt=ck;MP.ckMeta={gid:ck.gid,T:ck.T};try{localStorage.setItem(ckKey(),JSON.stringify(ck))}catch(e){}return ck}
function netPilotsIn(sid){if(!NET.host)return 0;let n=0;for(const c of Object.values(MP.cl))if(c.ready&&S.pilots[c.pid]&&S.pilots[c.pid].sector===sid)n++;return n}
function readyCl(){return Object.values(MP.cl).filter(c=>c.ready&&c.L.open)}
function hostRecv(L,m){let c=MP.cl[L.peer];
  if(m.t==='hello'){c=MP.cl[L.peer]={L,pid:String(m.pid||'').slice(0,24),name:String(m.name||'Pilot').slice(0,16),known:new Set(),ready:false,hello:true,ck:m.ck,lastPR:''};
    if(m.v!==MPV){send(L,{t:'msg',k:'flash',a:['This galaxy is running a different version of Driftgate. Reload the page.',true]});return}
    for(const o of Object.values(MP.cl))if(o!==c&&o.pid===c.pid&&o.ready){linkClose(o.L,true);delete MP.cl[o.L.peer];pilotLeft(o)}
    if(S&&S.pilots&&Object.entries(S.pilots).some(([id,P])=>id!==c.pid&&String(P.name||'').toLowerCase()===c.name.toLowerCase())||(c.pid!==NET.me&&String(MP.name).toLowerCase()===c.name.toLowerCase())){send(L,{t:'msg',k:'taken',a:[c.name]});setTimeout(()=>{linkClose(L,true);delete MP.cl[L.peer]},300);return}
    if(m.ck&&S&&m.ck.T>S.T+20&&performance.now()-MP.since<120000&&!readyCl().length){c.adopt=true;send(L,{t:'ckreq'});return}
    if(running&&S.player)hJoin(c);else send(L,{t:'msg',k:'stat',a:['The host is choosing their ship. You will join as soon as they launch.']});return}
  if(!c)return;
  if(m.t==='ckup'){if(c.adopt&&m.ck&&m.ck.S){c.adopt=false;mpAdoptGalaxy(m.ck)}else if(running)hJoin(c);return}
  if(m.t==='newpilot'){if(!running||!S.player)return;if(!S.pilots[c.pid]){const lg=m.leg&&typeof m.leg==='object'?m.leg:null;if(S.unb){if(m.fac!=='pirate'||!lg||!((lg.pts||0)>=1)){send(L,{t:'msg',k:'flash',a:[m.fac!=='pirate'?'This is an Unbound crew galaxy: everyone here flies for the pirates.':'Joining an Unbound crew takes a Legend point of your own, earned flying for a faction.',true]});return}const NP=newPilot(c.pid,c.name,'pirate','raider',lg);runAs(c.pid,()=>unbP())}else if(FAC_IDS.includes(m.fac)&&START_HULLS.includes(m.cls))newPilot(c.pid,c.name,m.fac,m.cls,lg);else{send(L,{t:'msg',k:'flash',a:['This galaxy flies for the factions. Unbound crews need a galaxy of their own.',true]});return}}hJoin(c);return}
  if(!c.ready)return;const pid=c.pid,P=S.pilots[pid];if(!P)return;
  switch(m.t){
    case 'u':{if(P.docked)break;MP.inp[pid]={...m,at:performance.now()};P.x=m.x;P.y=m.y;P.z=m.z;P.vx=m.vx;P.vy=m.vy;P.vz=m.vz;P.q=m.q;P.fa=!!m.fa;P.wpn=m.w==='l'?'laser':'kinetic';P.route=m.rt||null;break}
    case 'msl':hMissile(pid,m);break;
    case 'jam':{const e=MP.rp[pid];if(e)e.jamMode=!!m.on;break}
    case 'xpdr':{if(S.unb)runAs(pid,()=>{const R=unbP();if((R.xpdrOut||0)>S.T)return;R.xpdr=!!m.on});break}
    case 'hook':{MP.hook=MP.hook||{};MP.hook[pid]={on:!!m.on,id:m.id};break}
    case 'spot':{const e0=MP.rp[pid];if(e0)inW(worldOf(e0),()=>{const e=W.ents.find(x=>x.id===m.id);if(e&&d3(e,e0)<SPOT.r*1.2)spotPay(e,pid)});break}
    case 'blast':{const e=MP.rp[pid];if(e)inW(worldOf(e),()=>{if(m.k==='fire')blFire(e,P);else if(m.k==='det')blDetReq(P,e);else if(m.k==='cancel')blCancel(P)});break}
    case 'flare':{const e=MP.rp[pid];if(e)inW(worldOf(e),()=>deployFlares(e));break}
    case 'jump':hJump(pid,m);break;
    case 'dock':hDock(c,m);break;
    case 'undock':hUndock(pid,m);break;
    case 'bridge':hBridge(c,m);break;
    case 'stealth':{const e=MP.rp[c.pid];if(e){e.stealth=!!m.on;e.masked=!!m.on;e.maskR=m.on?STEALTH_R:0;if(m.on){unTargetPlayer(e);for(const x of W.missiles||[])if(x.tgt===e&&d3(x,e)>STEALTH_R)x.tgt=null}else e.boot=(WORLDS[e.sector||S.pilots[c.pid].sector]||{t:0}).t+BOOT_T}break}
    case 'land':{const e=MP.rp[c.pid];if(e){e.masked=!!m.on;e.landed=m.on?{}:null;if(m.on){unTargetPlayer(e);for(const x of W.missiles||[])if(x.tgt===e)x.tgt=null}else e.boot=(WORLDS[e.sector||S.pilots[c.pid].sector]||{t:0}).t+BOOT_T}break}
    case 'gseat':hSeat(c,m);break;
    case 'g':{if(P.docked!=='turret')break;MP.ginp=MP.ginp||{};const o=MP.ginp[pid]||{};MP.ginp[pid]={yaw:+m.yaw||0,pitch:+m.pitch||0,f:m.f?1:0,at:performance.now(),msl:o.msl||0};break}
    case 'gmsl':{if(P.docked==='turret'&&MP.ginp&&MP.ginp[pid])MP.ginp[pid].msl=1;break}
    case 'order':{if(m.k==='build'){runAs(pid,()=>requestBuild());break}if(m.k==='help'){runAs(pid,()=>pilotDistress());break}const e=MP.rp[pid],w=e?worldOf(e):WORLDS[P.sector],k=m.k==='guard'?'guard':'escort';if(!w)break;runAs(pid,()=>{const T=m.id==='me'?W.player:entInWorld(w,String(m.id||''));if(!T||hostile(S.player.faction,T.side==='player'?S.player.faction:T.side))return;if(m.k==='form'||m.k==='attack'||m.k==='launch'){const tg=m.tg!=null?entInWorld(w,String(m.tg)):null;if(m.k==='form'||(tg&&tg.alive))cmWing(m.k,T,tg)}else issueOrder(k,T)});break}
    case 'cvesc':{const t=(S.traders||[]).find(x=>x.id===m.id&&x.kind==='haul');if(t)runAs(pid,()=>cvTake(t));break}
    case 'fcon':{const t=(S.frigates||[]).find(x=>x.id===m.id);if(!t)break;if(m.a==='take'){if(!t.owner&&t.side===S.pilots[pid].faction)runAs(pid,()=>fTake(t));sendFtok(c);break}const a0=String(m.a||'');if(!(a0.startsWith('crewoff')||(t.owner===pid)||crewCan(t,pid,a0)))break;const ent=m.e?entInWorld(WORLDS[t.sector],String(m.e)):null;runAs(pid,()=>fconApply(t,String(m.a||'').slice(0,40),ent));sendFtok(c);break}
    case 'fdest':{const t=(S.frigates||[]).find(x=>x.id===m.id);if(t&&t.owner===pid&&DEF[m.dest]){t.dest=String(m.dest);t.jumpTo=null}sendFtok(c);break}
    case 'convoy':{const P=S.pilots&&S.pilots[pid];if(!P)break;if(m.dest&&DEF[m.dest])P.route=String(m.dest);netMsg(pid,'flash',runAs(pid,()=>convoyCall()));break}
    case 'convoyoff':{if(S.pilots&&S.pilots[pid]&&S.pilots[pid].convoy)runAs(pid,()=>convoyEnd(false,'you called it off'));break}
    case 'resup':{const t=(S.frigates||[]).find(x=>x.id===m.id),P=S.pilots&&S.pilots[pid];if(t&&P)runAs(pid,()=>carResupply(t,P,pid));break}
    case 'limpet':{const P=S.pilots&&S.pilots[pid],w=P&&WORLDS[P.sector];if(!P||!w||!isScoutCls(P.cls)||P.limpetUsed)break;P.limpetUsed=true;inW(w,()=>{const E=m.k==='cap'?W.ents.find(e=>e.role==='frigate'&&e.alive&&e.tok&&e.tok.id===m.id):m.k==='station'?W.stationEnt:m.k==='outpost'?W.outpostEnt:null;if(E)limpetPlant(E,P.faction,pid,m.at)});break}
    case 'dev':{if(m.k==='efrig'||m.k==='levi'||m.k==='eesc'){netMsg(pid,'flash',runAs(pid,()=>devEnemyFrig(String(m.side||''),m.k==='levi',m.k==='eesc')));break}
      if(m.k==='squad'){const sd=String(m.side||'');if(!(FACTIONS[sd]||sd==='pirate'||sd==='brood'))break;netMsg(pid,'flash',runAs(pid,()=>devSquad(sd,+m.n,Array.isArray(m.types)?m.types.map(String).slice(0,6):[])));break}
      if(m.k==='gbwing'){netMsg(pid,'flash',runAs(pid,()=>devGunboat()));break}if(m.k==='hull'){const r=runAs(pid,()=>devHull(String(m.cls||'')));if(MP.rp[pid]&&!P.docked){spawnRP(pid)}sendPR(c,true,true);send(L,syncMsg(c));netMsg(pid,'flash',r);if(P.docked)send(L,{t:'actr',err:''});break}if(m.k==='frig'||m.k==='fesc'){netMsg(pid,'flash',devFrigFor(pid,m.k==='fesc'));sendFtok(c);break}if(m.k==='cr'){devLedger(()=>{P.credits+=10000});sendPR(c,false,true);netMsg(pid,'flash','Developer: +10,000 credits.');break}if(m.k==='res'){runAs(pid,()=>devRes(P));sendPR(c,false,true);send(L,syncMsg(c));if(P.docked)send(L,{t:'actr',err:''});netMsg(pid,'flash','Developer: added 10 of every resource to your vault.')}break}
    case 'act':{if(!(P.docked==='station'||P.docked==='lair'||(S.outposts&&S.outposts[P.docked])))break;const err=runAs(pid,()=>{dockErr='';dockAction(m.act,String(m.arg||''));return dockErr});send(L,{t:'actr',err});sendPR(c,false,true);send(L,syncMsg(c));break}
    case 'build':{const e=MP.rp[pid];if(e)runAs(pid,()=>{const had=W.pbuild;startPlayerBuild();if(W.pbuild&&W.pbuild!==had)W.pbuild.pid=pid});break}
    case 'plan':{const C=S.plans&&S.plans[P.faction],mv=C&&C.mv;if(mv&&mv.id===+m.id)campAccept(pid,mv);else{const o=C&&sideOf(C).find(x=>x.id===+m.id&&x.stage==='active');if(o)sideAccept(pid,o)}break}
    case 'hold':{const ev=S.events.find(v=>v.id===m.id);if(ev)ev.hold=Math.max(ev.hold||0,Math.min(+m.hold||0,S.T+240));break}
    case 'chat':{const t=String(m.m||'').slice(0,160);if(t)netChat(P.name,t,pid);break}
    case 'bye':{if(!P.docked)poseFrom(P,m);delete MP.cl[L.peer];pilotLeft(c);setTimeout(()=>linkClose(L,true),200);break}
  }}
function hJoin(c){const P=S.pilots[c.pid];c.hello=true;
  if(!P){send(c.L,{t:'needpilot',r:MP.roster});return}
  P.name=c.name||P.name;P.pid=c.pid;c.ready=true;c.known=new Set();
  if(P.docked==='bridge')P.docked='station';if(P.docked==='turret'){hSeatClear(c.pid);P.docked=null}
  if(P.docked==='station'&&!S.stations[P.sector])P.docked=null;
  if(!WORLDS[P.sector])openWorld(P.sector);
  if(!P.docked)spawnRP(c.pid);
  send(c.L,{t:'welcome',S:mpState(),you:c.pid,host:NET.me,code:MP.code});c.lastPR=JSON.stringify(P);
  {const where=(sid)=>`${DEF[P.sector].name}, ${HOP[sid][P.sector]===0?'right here':HOP[sid][P.sector]+' jump'+(HOP[sid][P.sector]>1?'s':'')+' away'}`;
   feed(`${P.name} joined (${FAC(P.faction).short}) at ${where(S.player.sector)}.${HOP[S.player.sector][P.sector]?' Map (M) can set a course to them.':''}`,'good');
   for(const o of readyCl())if(o!==c){const OP=S.pilots[o.pid];if(OP)send(o.L,{t:'msg',k:'feed',a:[`${P.name} joined (${FAC(P.faction).short}) at ${where(OP.sector)}.`,'good']})}}
  netRoster()}
function pilotLeft(c){const P=S.pilots[c.pid];delete MP.inp[c.pid];for(const t of S.frigates||[])if(t.cmd&&t.owner===c.pid){delete t.owner;delete t.cmd;t.ctl=null;t.dest=null;t.jumpTo=null}if(!P)return;const was=MP.rp[c.pid];c.ready=false;
  if(was)despawnRP(c.pid);else{const w=WORLDS[P.sector];if(w&&w!==LW&&!worldBusy(w))closeWorld(w)}
  feed(`${P.name} left the galaxy.`,'info');netRoster()}
// a friend's newer save wins when this session has only just started (they played while we were away)
function mpAdoptGalaxy(ck){const keep=S&&S.player?{faction:S.player.faction,cls:S.player.cls}:null;
  for(const c of Object.values(MP.cl))c.ready=false;MP.rp={};MP.inp={};
  mpAdoptState(ck.S);if(!S.player&&keep){newPilot(MP.pid,MP.name,keep.faction,START_HULLS.includes(keep.cls)?keep.cls:'interceptor');S.player=S.pilots[MP.pid]}
  S.gid=ck.gid||S.gid;
  if(S.player){mpRun();feed('Loaded a newer save of this galaxy from a friend.','info')}
  else{running=false;$('hud').hidden=true;showStart();mpStatus('Loaded the galaxy from a friend. Choose your faction and ship, then Launch.')}}
function mpState(){const c=serialize();return c}
function syncMsg(c){const P=S.pilots[c.pid],o={};for(const k in S){if(k==='player')continue;if(k==='sectors'){o.sectors={};for(const sid in S.sectors){const s=S.sectors[sid];o.sectors[sid]=sid===P.sector?s:{...s,ast:undefined}}}else o[k]=S[k]}return{t:'sync',s:o}}
function sendPR(c,force,now){const P=S.pilots[c.pid];if(!P)return;const s=JSON.stringify(P);if(!now&&!force&&s===c.lastPR)return;c.lastPR=s;send(c.L,{t:'pr',r:P,fz:force?1:0})}
// ---- multiplayer frigates (host side)
function sendFtok(c){const P=S.pilots[c.pid],own=(S.frigates||[]).filter(t=>t.owner===c.pid||(P&&P.docked==='bridge'&&P.bridgeId===t.id));if(own.length||c.hadF){send(c.L,{t:'ftok',f:own});c.hadF=own.length>0}}
function entInWorld(w,id){if(!w||!id)return null;if(id==='S')return w.stationEnt;if(typeof id==='string'&&id.startsWith('W:'))return(w.works||[]).find(x=>x.id===id)||null;if(id==='O')return w.outpostEnt;const e=w.ents.find(x=>x.id===id&&x.alive);if(e)return e;
  if(typeof id==='string'&&id.startsWith('p_')){const pid=id.slice(2);if(pid===NET.me)return w===LW?LW.player:null;return MP.rp[pid]||null}return null}
function frigEnt(t){const w=WORLDS[t.sector];return w?w.ents.find(e=>e.alive&&e.tok===t):null}
function hBridge(c,m){const pid=c.pid,P=S.pilots[pid],e=MP.rp[pid],t=(S.frigates||[]).find(x=>x.id===m.id);
  const F=t&&(t.owner===pid||(!t.owner&&t.side===P.faction)||(t.owner&&S.pilots[t.owner]&&S.pilots[t.owner].faction===P.faction))&&t.sector===P.sector?frigEnt(t):null;if(!e||!F||d3(e,F)>F.st.radius*1.25+700){send(c.L,{t:'nobridge'});return}
  despawnRP(pid,true);P.docked='bridge';P.bridgeId=t.id;P.bslot=(+m.slot|0)&3;P.vx=P.vy=P.vz=0;delete MP.inp[pid];netRoster()}
function hBridgeTick(){for(const t of S.frigates||[])if(t.crew)for(const k in t.crew){const P=S.pilots[t.crew[k]];if(!P||P.docked!=='bridge'||P.bridgeId!==t.id)delete t.crew[k]}
  for(const pid in S.pilots||{}){const P=S.pilots[pid];if(P.docked!=='bridge'||pid===NET.me)continue;const c=Object.values(MP.cl).find(x=>x.pid===pid&&x.ready);if(!c)continue;
    const t=(S.frigates||[]).find(x=>x.id===P.bridgeId);
    if(!t){P.docked=null;delete P.bridgeId;if(!WORLDS[P.sector])openWorld(P.sector);spawnRP(pid);send(c.L,{t:'nobridge',gone:1});netRoster();continue}
    if(t.sector!==P.sector){P.sector=t.sector;if(!WORLDS[P.sector])openWorld(P.sector);c.known=new Set();c.fullT=0;send(c.L,{t:'fjump',to:t.sector,id:t.id});sendFtok(c);send(c.L,syncMsg(c));netRoster();continue}
    const F=frigEnt(t);if(F){P.x=F.x;P.y=F.y-F.st.radius*.5;P.z=F.z;P.vx=F.vx;P.vy=F.vy;P.vz=F.vz}}}
// ---- gunboat turrets with a remote gunner (host side)
function seatPilotOf(id){if(id==='p_'+NET.me)return{sector:S.player.sector,docked:S.player.docked,name:S.player.name||MP.name};if(typeof id==='string'&&id.startsWith('p_'))return S.pilots[id.slice(2)]||null;return null}
function hSeat(c,m){const pid=c.pid,P=S.pilots[pid],me=MP.rp[pid],w=me?worldOf(me):null,e=w?entInWorld(w,String(m.id||'')):null;
  const side=e?(e.side==='player'?S.player.faction:e.side):null;
  const signed=e&&P.crewFor&&P.crewFor===(e.rp||(e.isPlayer?NET.me:null));if(signed)delete P.crewFor;
  if(!me||!e||!hasTur(e.cls)||!e.alive||hostile(P.faction,side)||(!signed&&d3(e,me)>e.st.radius*1.25+500)){send(c.L,{t:'gseatno'});return}
  const T=turretOf(e);if(T.gunner&&T.gunner!==pid){send(c.L,{t:'gseatno',busy:1});return}
  T.gunner=pid;despawnRP(pid,true);P.docked='turret';P.seatId=e.isPlayer?'p_'+NET.me:e.id;P.vx=P.vy=P.vz=0;delete MP.inp[pid];MP.ginp=MP.ginp||{};MP.ginp[pid]={yaw:T.yaw,pitch:T.pitch,f:0,at:performance.now()};
  send(c.L,{t:'gseatok'});runAs(pid,()=>feed(`You're on the turret of ${e.pname?e.pname+"'s":e.isPlayer?(S.pilots[NET.me]||{}).name+"'s":'a'} gunboat.`,'good'));netRoster()}
function crewLaunch(aPid){if(!NET.host)return;const A=aPid===NET.me?S.player:S.pilots[aPid];if(!A)return;for(const pid in S.pilots||{}){const P=S.pilots[pid];if(P.crewFor!==aPid||P.docked!=='station'||P.sector!==A.sector)continue;const c=Object.values(MP.cl).find(x=>x.pid===pid&&x.ready);if(c)send(c.L,{t:'gseatgo',id:'p_'+aPid})}}
function hSeatClear(pid){const P=S.pilots[pid];if(!P)return;const w=WORLDS[P.sector],e=w&&entInWorld(w,P.seatId||'');if(e&&e.tur&&e.tur.gunner===pid)e.tur.gunner=null;delete P.seatId;if(MP.ginp)delete MP.ginp[pid]}
function hSeatTick(){const now=performance.now();for(const pid in S.pilots||{}){const P=S.pilots[pid];if(P.docked!=='turret'||pid===NET.me)continue;const c=Object.values(MP.cl).find(x=>x.pid===pid&&x.ready);if(!c)continue;
    const id=P.seatId||'',w=WORLDS[P.sector],e=w?entInWorld(w,id):null;
    if(e&&e.alive&&hasTur(e.cls)){turretOf(e).gunner=pid;P.x=e.x;P.y=e.y-e.st.radius*.6;P.z=e.z;P.vx=e.vx;P.vy=e.vy;P.vz=e.vz;P.missAt=0;continue}
    const pl=seatPilotOf(id);if(pl&&!pl.docked&&pl.sector&&pl.sector!==P.sector){P.sector=pl.sector;if(!WORLDS[P.sector])openWorld(P.sector);c.known=new Set();c.fullT=0;send(c.L,{t:'gjump',to:P.sector,id});send(c.L,syncMsg(c));netRoster();continue}
    if(!P.missAt){P.missAt=now;continue}if(now-P.missAt<3000&&!(pl&&pl.docked))continue;
    P.docked=null;delete P.seatId;P.missAt=0;if(MP.ginp)delete MP.ginp[pid];if(!WORLDS[P.sector])openWorld(P.sector);spawnRP(pid);send(c.L,{t:'gseatno',out:1});netRoster()}}
function devFrigFor(pid,esc){return runAs(pid,()=>devFrig(true,esc))}
function netRoster(){const r=[];if(NET.host&&S&&S.player)r.push([NET.me,S.player.name||MP.name,S.player.faction,S.player.sector,S.player.docked?1:0,1]);
  if(NET.host)for(const c of readyCl()){const P=S.pilots[c.pid];if(P)r.push([c.pid,P.name,P.faction,P.sector,P.docked?1:0,0])}
  MP.roster=r;for(const c of readyCl())send(c.L,{t:'roster',r})}
function netChat(name,t,from){const m={t:'chat',n:name,m:t};feed(`${name}: ${t}`,'chat');for(const c of readyCl())send(c.L,m)}
function netMsg(pid,k,...a){const c=Object.values(MP.cl).find(x=>x.pid===pid&&x.ready);if(c)send(c.L,{t:'msg',k,a})}
function worldOf(e){for(const w of Object.values(WORLDS))if(w.ents.includes(e))return w;return null}

// remote pilots fly as real ships inside the host's simulation
function spawnRP(pid){const P=S.pilots[pid];if(!P)return null;setTimeout(()=>crewLaunch(pid),400);if(MP.rp[pid])despawnRP(pid,true);const w=WORLDS[P.sector]||openWorld(P.sector);
  const st=shipStats(P.faction,P.cls,P.tiers,P.tune),q=q0();if(P.q){q.x=P.q[0];q.y=P.q[1];q.z=P.q[2];q.w=P.q[3];qNorm(q)}
  const e={type:'ship',rp:pid,pname:pilotLabel(P),trail:P.trail||null,id:'p_'+pid,side:P.faction,fac:P.faction,cls:P.cls,tier:Math.max(...Object.values(P.tiers)),st,x:P.x||0,y:P.y||0,z:P.z||0,vx:P.vx||0,vy:P.vy||0,vz:P.vz||0,q,
    hull:clamp(P.hull||st.hull,1,st.hull),shield:clamp(P.shield||0,0,st.sCap),energy:st.eCap,cool:0,lastHit:-99,mineAcc:0,alive:true,wpn:P.wpn||'kinetic',tuned:Object.values(P.tune||{}).some(v=>v>0),drones:[],role:'pilot'};
  w.ents.push(e);MP.rp[pid]=e;inW(w,()=>{const n=(P.bay&&P.bay.drone)||0;for(let i=0;i<n;i++){inv.take(P.bay,'drone',1);const d=makeNPC('drone',P.faction,'drone',1,{drone:1},'pbay:'+pid);d.st=shipStats(P.faction,'drone',P.tiers.weapon);d.hull=d.st.hull;d.shield=d.st.sCap;d.wpn='kinetic';d.mom=e;d.ai.orb=i/Math.max(1,n)*TAU;
    const o=rdir();d.x=e.x+o.x*50;d.y=e.y+o.y*50;d.z=e.z+o.z*50;qCopy(d.q,e.q);d.vx=e.vx;d.vy=e.vy;d.vz=e.vz;e.drones.push(d);W.ents.push(d)}});if(P.convoy)runAs(pid,()=>convoyLaunch());return e}
function despawnRP(pid,keepWorld){const e=MP.rp[pid];if(!e)return;{const P0=S.pilots[pid];if(P0&&P0.convoy&&P0.convoy.live)runAs(pid,()=>convoyPack())}delete MP.rp[pid];const P=S.pilots[pid],w=worldOf(e);
  if(w)inW(w,()=>{for(const d of e.drones||[])if(d.alive&&W.ents.includes(d))despawn(d);const i=W.ents.indexOf(e);if(i>=0)W.ents.splice(i,1);if(W.tgt&&W.tgt.ref===e)W.tgt=null;if(W.pbuild&&W.pbuild.pid===pid)W.pbuild=null});
  e.alive=false;if(P){P.hull=e.hull;P.shield=e.shield}
  if(w&&!keepWorld&&w!==LW&&!worldBusy(w))closeWorld(w)}
// run player code (trades, tolls, bounties, deaths) as a remote pilot: S.player and the world's player ship are swapped in
function runAs(pid,fn){if(!pid||pid===NET.me||!S.pilots||!S.pilots[pid])return fn();
  const R=S.pilots[pid],oP=S.player,oC=CTX,oW=W,oM=MUTE,w=WORLDS[R.sector]||W;let ent=MP.rp[pid];
  if(!ent){const st=shipStats(R.faction,R.cls,R.tiers,R.tune);ent={ghost:true,type:'ship',st,cls:R.cls,fac:R.faction,side:R.faction,hull:clamp(R.hull,1,st.hull),shield:R.shield||0,energy:st.eCap,x:R.x||0,y:R.y||0,z:R.z||0,vx:0,vy:0,vz:0,q:q0(),drones:[],alive:true}}
  W=w;const oWP=w?w.player:null;if(w)w.player=ent;S.player=R;CTX=pid;MUTE=true;
  try{return fn()}finally{if(w)w.player=oWP;if(ent.ghost){R.hull=ent.hull;R.shield=ent.shield}S.player=oP;CTX=oC;W=oW;MUTE=oM}}
function rpDeath(e){const pid=e.rp,P=S.pilots[pid];
  runAs(pid,()=>{playerDeath(e)});
  despawnRP(pid,true);const old=WORLDS[P.sector];
  const st=shipStats(P.faction,P.cls,P.tiers,P.tune);P.hull=st.hull;P.shield=st.sCap;P.energy=st.eCap;P.sector=FAC_HOME(P.faction);P.x=P.y=P.z=0;P.vx=P.vy=P.vz=0;P.docked='station';droneTopUp(P,P.vault,P.faction);delete MP.inp[pid];
  if(old&&old!==LW&&!worldBusy(old))closeWorld(old);if(!WORLDS[P.sector])openWorld(P.sector);
  const c=Object.values(MP.cl).find(x=>x.pid===pid&&x.ready);if(c){sendPR(c,true,true);send(c.L,{t:'dead'})}netRoster()}
function resolveTgt(id){if(id==='S')return W.stationEnt;if(id==='O')return W.outpostEnt;if(NET.host&&id==='p_'+NET.me)return W.player;return W.ents.find(x=>x.id===id&&x.alive)||null}
function hMissile(pid,m){const e=MP.rp[pid],P=S.pilots[pid];if(!e)return;inW(worldOf(e),()=>{const T=resolveTgt(String(m.tg));if(!T||T===e)return;if(m.k==='jt'){runAs(pid,()=>{if(P.jt==null)P.jt=jtCap();if(P.jt<=0||P.cls!=='plunderer')return;P.jt--;if(!(P.jtT>0))P.jtT=40;launchMissile(e,T,P.tiers.weapon,'torpedo',0,true);const mm=W.missiles[W.missiles.length-1];if(mm){mm.jt=1;mm.dmg=0;mm.col='#b7c6ff'}unbShot()});return}const n0=W.missiles.length;
  if(m.k==='s'){if((P.swarm||0)>0&&CLASSES[P.cls].swarm&&T.type==='ship'){P.swarm--;launchSwarm(e,T,P.tiers.weapon)}}
  else if(P.rack>0){const n=CLASSES[P.cls].twin?Math.min(2,P.rack,m.n|0||1):1;P.rack-=n;for(let i=0;i<n;i++)launchMissile(e,T,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0);if(S.unb){if(e.jamMode)for(let i=n0;i<W.missiles.length;i++){const mm=W.missiles[i];if(mm.src===e){mm.harp=1;mm.col='#b7c6ff'}}runAs(pid,()=>unbShot())}}})}
function poseFrom(P,m){for(const k of['x','y','z','vx','vy','vz'])if(typeof m[k]==='number'&&isFinite(m[k]))P[k]=m[k];if(Array.isArray(m.q)&&m.q.length===4)P.q=m.q}
function hJump(pid,m){const P=S.pilots[pid],from=P.sector,to=String(m.to);if(!GATES[from]||!GATES[from].some(g=>g.to===to))return;if(P.convoy&&MP.rp[pid])runAs(pid,()=>convoyJump());
  runAs(pid,()=>{const h=S.outposts.hollow;if((from==='ho'||to==='ho')&&h.owner&&h.owner!=='player'&&h.owner!==S.player.faction){const n=transfer('player',h.owner,40);if(n)feed(`Paid ${n} cr gate toll to ${sideName(h.owner)} at Hollow Relay.`,'news')}});
  P.sector=to;despawnRP(pid);poseFrom(P,m);delete MP.inp[pid];if(!WORLDS[to])openWorld(to);if(!P.docked)spawnRP(pid);netRoster()}
function hDock(c,m){const pid=c.pid,P=S.pilots[pid],e=MP.rp[pid];if(!e)return;const w=worldOf(e);let ok=false;
  inW(w,()=>{if(m.d==='lair'){const L=(S.lairs||[]).find(x=>x.id===+m.id&&x.pid===pid&&x.sid===P.sector&&x.hull>0);ok=!!L&&d3(L,e)<320;if(ok)P.lairId=L.id}else if(m.d==='station'){const SE=W.stationEnt;ok=!!SE&&(SE.fac===P.faction||(S.unb&&SE.fac==='neutral'&&runAs(pid,()=>unbFreeportOK())))&&d3(SE,e)<520}else{const OE=W.outpostEnt;ok=!!OE&&OE.o.id===m.d&&!OE.o.breached&&OE.o.owner===P.faction&&d3(OE,e)<520}});
  if(!ok){send(c.L,{t:'nodock'});return}
  despawnRP(pid,true);P.docked=m.d;P.vx=P.vy=P.vz=0;P.limpetUsed=false;delete MP.inp[pid];if(S.unb){P.sortie={};P.fixUsed=0;if(m.d==='lair'){const st=shipStats(P.faction,P.cls,P.tiers,P.tune);P.hull=st.hull;P.shield=st.sCap}}if(MP.hook)delete MP.hook[pid];if(P.convoy&&P.sector===P.convoy.dest)runAs(pid,()=>convoyEnd(true));netRoster()}
function hUndock(pid,m){const P=S.pilots[pid];if(!P.docked)return;if(P.docked==='turret')hSeatClear(pid);P.docked=null;delete P.bridgeId;poseFrom(P,m);if(!WORLDS[P.sector])openWorld(P.sector);spawnRP(pid);netRoster()}
// a station or outpost a pilot was docked at is gone or lost: put them back in space
function netKickDocked(sid,kind,keep){if(!NET.host)return;for(const c of readyCl()){const P=S.pilots[c.pid];if(!P||P.sector!==sid||!P.docked)continue;if(keep&&P.faction===keep)continue;if(kind==='station'?P.docked!=='station':P.docked!==kind)continue;
  P.docked=null;const o=rdir(.8);P.x=o.x*260;P.y=o.y*260;P.z=o.z*260;P.vx=o.x*120;P.vy=o.y*120;P.vz=o.z*120;spawnRP(c.pid);sendPR(c,true,true);send(c.L,{t:'kick'})}}
function netSyncPilots(){for(const pid in MP.rp){const e=MP.rp[pid],P=S.pilots[pid];if(P){P.hull=e.hull;P.shield=e.shield}}}
// per system, every tick: move remote ships to where their pilots say they are, fire their guns, run their mining lasers
function netWorld(dt){const now=performance.now();
  for(const e of W.ents){if(!e.rp||!e.alive)continue;const u=MP.inp[e.rp],P=S.pilots[e.rp];if(!P)continue;
    if(u){const age=Math.min(.25,(now-u.at)/1000);e.x=u.x+u.vx*age;e.y=u.y+u.vy*age;e.z=u.z+u.vz*age;e.vx=u.vx;e.vy=u.vy;e.vz=u.vz;e.q.x=u.q[0];e.q.y=u.q[1];e.q.z=u.q[2];e.q.w=u.q[3];qNorm(e.q);e.boosting=!!u.b;e.thrusting=!!u.th;e.wpn=u.w==='l'?'laser':'kinetic';e.inJump=!!u.j;
      if(u.f&&now-u.at<600){if(S.unb&&e.cool<=0)runAs(e.rp,()=>unbShot());if(u.w==='l'&&!e.jamMode)fireLaser(e);else fire(e)}}
    e.mining=null;
    if(u&&u.m){const sec=S.sectors[W.sid],cl=(sec.clouds||[]).find(c=>c.id===u.m);if(cl&&d3(cl,e)<BL.collectR+cl.r){e.mining=cl;blCollect(e,P,cl,dt,sec)}}
    else if(blHull(P.cls)){const sc=S.sectors[W.sid],ch=chunkAt(e,sc);if(ch){e.mining=ch;blCollect(e,P,ch,dt,sc)}}
    const sec=S.sectors[W.sid];for(let i=sec.crates.length-1;i>=0;i--){const cr=sec.crates[i];if(d3(cr,e)<e.st.radius+40){let room=e.st.cargo-invMass(P.cargo),took=0;
      for(const k of Object.keys(cr.inv)){const ms=mass(k);while(cr.inv[k]&&room>=ms){inv.take(cr.inv,k,1);inv.add(P.cargo,k,1);room-=ms;took+=ms}}
      if(took)netMsg(e.rp,'feed',`Recovered ${took} t of salvage.`,'good');if(!Object.keys(cr.inv).length){sec.crates.splice(i,1);if(W.tgt&&W.tgt.ref===cr)W.tgt=null}}}
    if(W.pbuild&&W.pbuild.pid===e.rp)runAs(e.rp,()=>pbuildTick(dt))}}
// ---- host -> pilots: snapshots, pilot records, galaxy sync, checkpoints
const r1=v=>Math.round(v*10)/10,qi=v=>Math.round(v*1000);
function shipRow(e,full){const id=e.isPlayer?'p_'+NET.me:e.id,fl=(e.thrusting?1:0)|(e.boosting?2:0)|(e.tuned?4:0)|(W.t-(e.shHitT===undefined?-9:e.shHitT)<.1?8:0)|(W.t-e.lastHit<.1?16:0)|(e.gj||(e.isPlayer&&W.gc)?32:0)|(e.order?(e.order.kind==='guard'?64:128):0)|(e.stealth?256:0)|(jamDark(e)?512:0),
  b=[r1(e.x),r1(e.y),r1(e.z),qi(e.q.x),qi(e.q.y),qi(e.q.z),qi(e.q.w),Math.round(e.vx),Math.round(e.vy),Math.round(e.vz),Math.round(clamp(e.hull/e.st.hull,0,1)*1000),Math.round(clamp(e.shield/(e.st.sCap||1),0,1)*1000),fl,e.mining&&e.mining.id||0];
  if(!full)return[id,...b];const side=e.side==='player'?S.player.faction:e.side,fac=e.fac==='player'?S.player.faction:e.fac;
  return[id,side,fac,e.cls,e.isPlayer?'pilot':e.role,e.tier||1,e.wpn||'kinetic',e.isPlayer?(pilotLabel(S.player)||MP.name):e.pname||(e.tok&&e.tok.name)||'',...b,e.mom?(e.mom.isPlayer?'p_'+NET.me:e.mom.id):0,e.tok?e.tok.id:0,(e.isPlayer?S.player.trail:e.trail)||0]}
function netTick(dt){if(NET.cl){clientTick(dt);return}if(!NET.host||!running||!S||!S.player)return;
  MP.snT-=dt;if(MP.snT<=0){MP.snT=1/15;const cls=readyCl(),by={};for(const c of cls){const P=S.pilots[c.pid];(by[P.sector]=by[P.sector]||[]).push(c)}
    for(const sid in by){const w=WORLDS[sid];if(!w)continue;inW(w,()=>{const ships=W.ents.filter(e=>e.type==='ship'&&e.alive&&!(e.isPlayer&&(S.player.docked||W.dead))),ev=W.netEv||[];W.netEv=[];
      for(const b of W.shots)if(!b._n){b._n=1;ev.push(['s',r1(b.x),r1(b.y),r1(b.z),Math.round(b.vx),Math.round(b.vy),Math.round(b.vz),Math.round(b.ttl*100),b.sty||'',b.col,b.side==='player'?S.player.faction:b.side,b.src?(b.src.isPlayer?'p_'+NET.me:b.src.id):0,b.tur?1:0,b.snd||0])}
      for(const b of W.beams)if(!b._n){b._n=1;ev.push(['b',b.src.isPlayer?'p_'+NET.me:b.src.id,r1(b.x),r1(b.y),r1(b.z),b.col])}
      for(const m of W.missiles)if(!m.nid)m.nid=++MP.mid;
      const ms=W.missiles.map(m=>[m.nid,m.kind,m.side==='player'?S.player.faction:m.side,r1(m.x),r1(m.y),r1(m.z),Math.round(m.vx),Math.round(m.vy),Math.round(m.vz),m.tgt?(m.tgt.decoy?'D':m.tgt.type==='works'?m.tgt.id:m.tgt.type==='station'?'S':m.tgt.type==='outpost'?'O':m.tgt.isPlayer?'p_'+NET.me:m.tgt.id||0):0,m.col]);
      const SE=W.stationEnt,OE=W.outpostEnt,o=OE&&OE.o,B=W.scaffold||(W.pbuild?{x:W.pbuild.x,y:W.pbuild.y,z:W.pbuild.z,owner:S.player.faction,prog:W.pbuild.prog}:null);
      const gbs=W.ents.filter(e=>e.type==='ship'&&e.alive&&hasTur(e.cls));if(W===LW&&W.player&&hasTur(W.player.cls)&&!S.player.docked&&!gbs.includes(W.player))gbs.push(W.player);
      const gt=gbs.map(e=>{const T=turretOf(e);return[e.isPlayer?'p_'+NET.me:e.id,Math.round(T.yaw*100),Math.round(T.pitch*100),T.gunner==='local'?(S.player.name||MP.name):T.gunner?((S.pilots[T.gunner]||{}).name||'pilot'):'AI']});
      const base={t:'sn',sid,T:Math.round(S.T*10)/10,m:ms,ev,gt,st:SE?[Math.round(SE.shield),SE.offline?1:0,SE.turrets.map(t=>[Math.round(t.aim.x*100),Math.round(t.aim.y*100),Math.round(t.aim.z*100)])]:0,
        op:o?[Math.round(o.shield),Math.round(o.hull),Math.round(o.cap.p*100)/100,o.cap.side||0,o.breached?1:0,o.owner||0,Math.round(OE.aim.x*100),Math.round(OE.aim.y*100),Math.round(OE.aim.z*100)]:0,sc:B?[r1(B.x),r1(B.y),r1(B.z),B.owner,Math.round(B.prog*100)/100]:0,wk:(W.works||[]).map(w=>[w.id,Math.round(wkHp(w))]),de:W.decoys.map(d=>[r1(d.x),r1(d.y),r1(d.z),Math.round(d.life*10)/10]),
        nb:W.ents.filter(e=>e.npc&&e.alive&&e.ai&&e.ai.bl&&e.ai.bl.pts&&e.ai.bl.pts.length).map(e=>[e.id,e.ai.bl.st,e.ai.bl.pts.map(q=>[r1(q.x),r1(q.y),r1(q.z)])]),
        nc:(W.npcCh||[]).filter(c=>c.e&&c.e.alive).map(c=>[c.id,c.e.id,c.k,c.cr,r1(c.x),r1(c.y),r1(c.z),Math.round(c.vx),Math.round(c.vy),Math.round(c.vz)])};
      for(const c of by[sid]){const me='p_'+c.pid,e=MP.rp[c.pid],P=S.pilots[c.pid];const rows=[];for(const s of ships){const id=s.isPlayer?'p_'+NET.me:s.id;if(id===me)continue;const full=!c.known.has(id)||(c.fullT||0)<=0;rows.push(shipRow(s,full));c.known.add(id)}
        if((c.fullT=(c.fullT||0)-1)<0)c.fullT=30;
        send(c.L,{...base,e:rows,ps:e?[Math.round(e.hull*10)/10,Math.round(e.shield*10)/10]:[P.hull,P.shield]},true)}})}}
  MP.prT-=dt;if(MP.prT<=0){MP.prT=.5;for(const c of readyCl())sendPR(c)}
  MP.ftT=(MP.ftT||0)-dt;if(MP.ftT<=0){MP.ftT=1;for(const c of readyCl())sendFtok(c)}
  hBridgeTick();hSeatTick();
  MP.syT-=dt;if(MP.syT<=0){MP.syT=5;for(const c of readyCl())send(c.L,syncMsg(c))}
  MP.ckT-=dt;if(MP.ckT<=0){MP.ckT=15;const ck=hostSave();if(ck)for(const c of readyCl())send(c.L,{t:'ckpt',ck})}
  MP.roT=(MP.roT||0)-dt;if(MP.roT<=0){MP.roT=3;netRoster()}}

// ---- pilot side
function netSend(o,fast){if(NET.cl&&MP.host)send(MP.host,o,fast)}
function netTid(T){if(!T)return 0;if(T.type==='works')return T.id;if(T.type==='station')return'S';if(T.type==='outpost')return'O';return T.id}
function clientTick(dt){if(!running||!S||!S.player||!W)return;
  if(MP.seatGo){const G=MP.seatGo;if(performance.now()-G.t>12000){MP.seatGo=null;flash('Lost the Heavy Bomber you signed on to.',true)}else if(S.player.docked==='station'){undock()}else if(W.player&&!S.player.docked){const e=(LW.pup&&LW.pup[G.id])||W.ents.find(x=>x.id===G.id);if(e){const p=W.player;p.x=e.x;p.y=e.y+e.st.radius;p.z=e.z;p.vx=e.vx;p.vy=e.vy;p.vz=e.vz;MP.seatGo=null;enterSeat(e)}}}MP.uT-=dt;if(MP.uT>0)return;MP.uT=1/20;if(S.player.docked==='turret'&&W.gunseat){const G=W.gunseat;netSend({t:'g',yaw:+G.yaw.toFixed(3),pitch:+G.pitch.toFixed(3),f:(keys.Space||mouse.l||touch.fire)?1:0},true);return}const P=S.player,p=W.player;if(!p||P.docked||W.dead)return;
  const firing=!!(keys.Space||mouse.l||touch.fire);
  netSend({t:'u',x:r1(p.x),y:r1(p.y),z:r1(p.z),vx:Math.round(p.vx),vy:Math.round(p.vy),vz:Math.round(p.vz),q:[+p.q.x.toFixed(4),+p.q.y.toFixed(4),+p.q.z.toFixed(4),+p.q.w.toFixed(4)],f:firing?1:0,w:P.wpn==='laser'?'l':'k',m:p.mining?p.mining.id:0,b:p.boosting?1:0,th:p.thrusting?1:0,fa:P.fa?1:0,rt:P.route||0,j:W.jump?1:0},true)}
function clientRecv(m){
  switch(m.t){
    case 'welcome':mpClientStart(m);break;
    case 'needpilot':MP.roster=m.r||MP.roster;if(MP.autoLaunch){const a=MP.autoLaunch;MP.autoLaunch=null;send(MP.host,{t:'newpilot',fac:a.fac,cls:a.cls,leg:legPack(MP.name)});mpStatus('Joining…');break}
      if(MP.roster.length&&MP.roster[0])selFac=MP.roster[0][2];MP.needPilot=true;running=false;$('hud').hidden=true;$('start').hidden=false;showStart();$('bContinue').hidden=true;mpStatus(`Connected to <b>${esc(MP.code)}</b>. ${MP.roster.length?'Already flying here: '+MP.roster.map(r=>`<b style="color:${sideCol(r[2])}">${esc(r[1])}</b> (${esc(FAC(r[2]).short)}, ${esc(DEF[r[3]].name)})`).join(', ')+'. Pick the same faction to start in their home system. ':''}Choose your ship, then Launch to join.`);break;
    case 'sn':applySnap(m);break;
    case 'pr':applyPR(m);break;
    case 'sync':applySync(m.s);relinkFrigs();{const E=W&&W.stationEnt,R=W&&S.stations[W.sid];if(E&&R){E.rec=R;if(E.fac!==R.owner){E.fac=R.owner;E.name=R.name}}}break;
    case 'ftok':{const mine=new Map((m.f||[]).map(t=>[t.id,t]));S.frigates=(S.frigates||[]).filter(t=>t.owner!==MP.pid&&!mine.has(t.id)).concat(m.f||[]);relinkFrigs();if(W&&W.bridge&&W.bridge.panel)renderConsole(false);break}
    case 'fjump':{if(S.player.docked!=='bridge')break;SFX.fjump(1);frigWarpStart();const B=W&&W.bridge,keep=B?{x:B.x,z:B.z,yaw:B.yaw,pitch:B.pitch,seat:B.seat,fy:B.fy}:{x:-5,z:-6,yaw:.25,pitch:0};closeConsole();if(W)W.bridge=null;exitSector();S.player.sector=m.to;enterSector(m.to);S.player.docked='bridge';MP.fjB={id:m.id,keep,at:performance.now()};SFX.jump();feed(`Jumped to ${DEF[m.to].name}.`,'info');break}
    case 'gseatok':break;
    case 'gseatgo':{MP.seatGo={id:String(m.id),t:performance.now()};break}
    case 'gseatno':{if(W&&W.gunseat)leaveSeat(true);else if(S.player.docked==='turret')S.player.docked=null;flash(m.busy?'That turret is already manned.':m.out?'Your heavy bomber is gone. Your fighter is adrift.':'Could not board that turret. Pull alongside a friendly heavy bomber.',true);break}
    case 'gjump':{if(S.player.docked!=='turret')break;const G=W&&W.gunseat,keep=G?{id:G.id,yaw:G.yaw,pitch:G.pitch,msl:0}:{id:m.id,yaw:Math.PI,pitch:.1,msl:0};exitSector();S.player.sector=m.to;enterSector(m.to);S.player.docked='turret';W.gunseat={...keep,ent:null,lost:performance.now()};SFX.jump();feed(`Jumped to ${DEF[m.to].name} with the heavy bomber.`,'info');break}
    case 'bcn':{if(S.beacons&&m.sid&&m.b){S.beacons[m.sid]=m.b;S.bcnV=m.v||((S.bcnV||0)+1);if(W&&W.tgt&&W.tgt.kind==='beacon'&&W.sid===m.sid)W.tgt.ref=m.b;if(W&&W.bcnF&&W.sid===m.sid){W.bcnF.t=0;W.bcnF.side=null}}break}
    case 'nobridge':{if(W&&W.bridge)exitBridge();else if(S.player.docked==='bridge'){S.player.docked=null;ejectReset()}else if(m.gone)break;flash(m.gone?'The ship is gone. Your fighter is adrift.':'You can only board your own capital ship, close up.',true);break}
    case 'ckpt':MP.ckpt=m.ck;MP.ckMeta={gid:m.ck.gid,T:m.ck.T};try{localStorage.setItem(ckKey(),JSON.stringify(m.ck))}catch(e){}break;
    case 'msg':if(m.k==='taken'){mpShutdown();running=false;$('hud').hidden=true;$('start').hidden=false;showStart();mpStatus(`The callsign <b>${esc(m.a[0])}</b> is already taken in this galaxy. Pick another one and join again.`,true);$('mpName').focus();break}if(m.k==='feed')feed(...m.a);else if(m.k==='distress'){feed(m.a[0],'bad');SFX.distress()}else if(m.k==='flash')flash(...m.a);else if(m.k==='stat')mpStatus(m.a[0]);break;
    case 'actr':dockErr=m.err||'';if(!$('dock').hidden&&S.player.docked)renderDock();break;
    case 'dead':if(W){W.dead=W.t;$('deathMsg').hidden=false;W.tgt=null;if(W.player)W.player.alive=false}break;
    case 'roster':MP.roster=m.r;break;
    case 'hostquit':if(MP.host){linkClose(MP.host,true);MP.host=null}hostGone();break;
    case 'ckreq':send(MP.host,{t:'ckup',ck:MP.ckpt});break;
    case 'nodock':case 'kick':if(S.player.docked){S.player.docked=null;$('dock').hidden=true}if(m.t==='nodock')flash('Docking refused by the station.',true);break;
    case 'chat':feed(`${m.n}: ${m.m}`,'chat');break;
    case 'won':if(S){S.won=m.side;galaxyWon(m.side,m.how)}break;
    case 'legend':legGrant(MP.name||S.player.name,m.side,!!m.ok,m.cls,m.lost||null);if(m.vb)vicBank(m.side);break;
    case 'reset':running=false;if(W)exitSector();WORLDS={};LW=null;W=null;S=null;$('hud').hidden=true;$('dock').hidden=true;$('win').hidden=true;buildSectorScene(null);showStart();mpStatus('The host started a new galaxy. Choose your faction and ship, then Launch.');break;
  }}
function mpClientStart(m){const first=!running;if(W)exitSector();WORLDS={};LW=null;W=null;
  S=m.S;S.pilots=S.pilots||{};S.player=S.pilots[MP.pid];NET.me=MP.pid;MP.hostPid=m.host;MP.st='joined';MP.needPilot=false;
  MP.ckpt={gid:S.gid,T:S.T,at:Date.now(),code:MP.code,S:m.S};
  if(!S.player){mpStatus('The host has no record of you.',true);return}
  if(S.player.docked==='bridge')S.player.docked='station';
  if(first)FEED.length=0;running=true;$('start').hidden=true;$('hud').hidden=false;showTouch();enterSector(S.player.sector);
  if(S.player.docked){const E=S.player.docked==='station'?W.stationEnt:W.outpostEnt;if(!E)S.player.docked=null;else openDock()}
  hudUpdate();const hn=(MP.roster.find(r=>r[5])||[])[1];feed(first?`Joined “${MP.code}”${hn?` hosted by ${hn}`:''}.`:'Reconnected to the galaxy.','good');flash(first?`Joined ${hn?hn+'\u2019s':'the'} galaxy “${MP.code}”.`:'Reconnected.');
  for(const r of MP.roster)if(r[0]!==MP.pid){const h=HOP[S.player.sector][r[3]];feed(`${r[1]} (${FAC(r[2]).short}) is ${h===0?'in this system':`at ${DEF[r[3]].name}, ${h} jump${h>1?'s':''} away`}${r[4]?', docked':''}.${h?' Map (M) can set a course to them.':''}`,'info')}}
const OWN=['x','y','z','vx','vy','vz','q','fa','wpn','route','sector','docked'];
function applyPR(m){const P=S&&S.player,R=m.r;if(!P||!R)return;const keep={};if(!m.fz)for(const k of OWN)keep[k]=P[k];
  for(const k of Object.keys(P))if(!(k in R))delete P[k];Object.assign(P,R,keep);if(W&&W.player&&W.player.alive)refreshPlayerStats()}
function applySync(L){if(!S)return;const P=S.player;
  for(const k in L){if(k==='sectors'){for(const sid in L.sectors){const ns=L.sectors[sid],os=S.sectors[sid];if(!ns.ast)ns.ast=os?os.ast:[];S.sectors[sid]=ns}}else if(k==='pilots'){const np=L.pilots;if(P){applyPR({r:np[MP.pid]||P,fz:0});np[MP.pid]=P}S.pilots=np}else S[k]=L[k]}
  S.player=P;covC=null;if(running&&S.player)for(const ev of S.events)announce(ev);const w=LW;if(!w)return;
  const R=S.stations[w.sid];if(R&&(!w.stationEnt||w.stationEnt.rec.id!==R.id&&w.stationEnt.rec!==R)){if(w.stationEnt){const i=w.ents.indexOf(w.stationEnt);if(i>=0)w.ents.splice(i,1);w.stationEnt=null}inW(w,()=>addStationEnt(R))}
  else if(R&&w.stationEnt){const E=w.stationEnt;E.rec=R;E.fac=R.owner;E.name=R.name;E.sMax=R.sMax;const dl=devOf(R).def;if(E._def!==dl){E._def=dl;inW(w,()=>devEnt(E))}}
  else if(!R&&w.stationEnt){const i=w.ents.indexOf(w.stationEnt);if(i>=0)w.ents.splice(i,1);w.stationEnt=null}
  if(w.outpostEnt)w.outpostEnt.o=S.outposts[w.outpostEnt.o.id];
  if(w.tgt&&w.tgt.kind==='beacon'){w.tgt.ref=S.beacons&&S.beacons[w.sid];if(!w.tgt.ref)w.tgt=null}
  if(w.tgt&&w.tgt.kind==='wpt'){w.tgt.ref=wptsIn(S.sectors[w.sid]).find(a=>a.id===w.tgt.ref.id)||null;if(!w.tgt.ref)w.tgt=null}
  if(w.tgt&&(w.tgt.kind==='ast'||w.tgt.kind==='crate')){const arr=w.tgt.kind==='ast'?S.sectors[w.sid].ast:S.sectors[w.sid].crates;w.tgt.ref=arr.find(a=>a.id===w.tgt.ref.id)||null;if(!w.tgt.ref)w.tgt=null}
  if(w.player&&w.player.mining)w.player.mining=mineFind(S.sectors[w.sid],w.player.mining.id);
  for(const id in w.pup||{}){const e=w.pup[id];if(e.mining)e.mining=S.sectors[w.sid].ast.find(a=>a.id===e.mining.id)||null}}
function mkPup(r){const[id,side,fac,cls,role,tier,wpn,name]=r;const st=shipStats(fac==='pirate'?null:fac,cls,tier||1);
  const e={type:'ship',pup:true,id,side,fac,cls,role,tier:tier||1,wpn,st,x:r[8],y:r[9],z:r[10],vx:0,vy:0,vz:0,q:q0(),hull:st.hull,shield:st.sCap,energy:st.eCap,alive:true,lastHit:-99,ai:{},load:{},cargo:{},drones:[]};
  if(role==='pilot'){e.pname=name;e.rp=id.slice(2);e.trail=r[24]||null}if(role==='frigate'){e.tokId=r[23];e.tok=(S.frigates||[]).find(x=>x.id===r[23])||{name,side,id:r[23]};e.pickets=[]}e.q.x=r[11]/1000;e.q.y=r[12]/1000;e.q.z=r[13]/1000;e.q.w=r[14]/1000;qNorm(e.q);e.momId=r[22];return e}
function relinkFrigs(){const w=LW;if(!w||!w.pup)return;for(const id in w.pup){const e=w.pup[id];if(e.role!=='frigate'||e.tokId==null)continue;const t=(S.frigates||[]).find(x=>x.id===e.tokId);if(!t)continue;e.tok=t;
    if(t.ctl){const C=fctl(t);if(C.tgtId&&!C.tgt){const T=C.tgtId==='S'?w.stationEnt:C.tgtId==='p_'+MP.pid?w.player:w.pup[C.tgtId];if(T)C._t=T}}}
  if(MP.fjB){const e=Object.values(w.pup).find(x=>x.role==='frigate'&&x.tokId===MP.fjB.id);if(e){W.bridge={f:e,...MP.fjB.keep,panel:null};cam.snap=true;const st=MP.fjB.keep.seat;MP.fjB=null;if(st)openConsole('strat')}else if(performance.now()-MP.fjB.at>8000){MP.fjB=null;if(S.player.docked==='bridge'){S.player.docked=null;ejectReset();const p=W.player;netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,q:[p.q.x,p.q.y,p.q.z,p.q.w]});flash('Lost contact with the capital ship. Your fighter is adrift.',true)}}}}
function applySnap(m){const w=LW;if(!w||m.sid!==w.sid||!running)return;w.pup=w.pup||{};const seen=new Set(),now=w.t,ast=S.sectors[w.sid].ast;
  for(const r of m.e){const id=r[0];let e=w.pup[id];const full=r.length>16;
    if(full&&(!e||e.cls!==r[3]||e.side!==r[1])){const fresh=!e;if(e){const i=w.ents.indexOf(e);if(i>=0)w.ents.splice(i,1)}e=mkPup(r);w.pup[id]=e;w.ents.push(e);if(fresh&&e.role==='frigate'&&w.t>3&&!(MP.fjB&&MP.fjB.id===e.tokId)){const ow=W;W=w;try{frigArriveFx(e)}finally{W=ow}}}
    if(!e)continue;seen.add(id);const o=full?8:1;
    e.tx=r[o];e.ty=r[o+1];e.tz=r[o+2];e.tq=e.tq||q0();e.tq.x=r[o+3]/1000;e.tq.y=r[o+4]/1000;e.tq.z=r[o+5]/1000;e.tq.w=r[o+6]/1000;e.vx=r[o+7];e.vy=r[o+8];e.vz=r[o+9];e.snapAt=now;
    if(e.fresh===undefined){e.x=e.tx;e.y=e.ty;e.z=e.tz;qCopy(e.q,e.tq);qNorm(e.q);e.fresh=0}
    e.hull=r[o+10]/1000*e.st.hull;const sh=r[o+11]/1000*e.st.sCap;if(e.shield>1&&sh<=0){e.shBreakT=now}else if(e.shield<=0&&sh>e.st.sCap*.2)e.shUpT=now;e.shield=sh;
    const fl=r[o+12];e.jamOff=fl&512?now+1:0;e.stealth=!!(fl&256);e.masked=e.stealth||!!e.landed;e.maskR=e.stealth?STEALTH_R:0;e.thrusting=!!(fl&1);e.boosting=!!(fl&2);e.tuned=!!(fl&4);if(fl&8){e.shHitT=now;e.shHitA=.5}if(fl&16)e.lastHit=now;e.gjc=!!(fl&32);e.ord=fl&64?'guarding':fl&128?'escorting':null;
    const mi=r[o+13];e.mining=mi?ast.find(a=>a.id===mi)||null:null}
  relinkFrigs();
  npcBlSnap(w,m);
  {const own='p_'+MP.pid;for(const g of m.gt||[]){const e=g[0]===own?w.player:w.pup[g[0]];if(!e)continue;e.tur=e.tur||{yaw:Math.PI,pitch:.1};if(!(W.gunseat&&W.gunseat.id===g[0])){e.tur.yaw=g[1]/100;e.tur.pitch=g[2]/100}e.tur.gname=g[3]}}
  for(const id in w.pup)if(!seen.has(id)){const e=w.pup[id];e.alive=false;const i=w.ents.indexOf(e);if(i>=0)w.ents.splice(i,1);delete w.pup[id];if(w.tgt&&w.tgt.ref===e)w.tgt=null}
  for(const id in w.pup){const e=w.pup[id];if(e.momId){const M=e.momId==='p_'+MP.pid?w.player:w.pup[e.momId];e.mom=M||null;if(M&&e.role==='drone'){M.drones=M.drones||[];if(!M.drones.includes(e))M.drones.push(e)}}}
  const me='p_'+MP.pid,rt=id=>id==='S'?w.stationEnt:id==='O'?w.outpostEnt:id===me?w.player:id==='D'?null:w.pup[id]||null;
  w.mm=w.mm||{};const nm={},list=[];for(const r of m.m){let x=w.mm[r[0]];if(!x)x={kind:r[1],smoke:0,inv:{},ttl:9,checked:true,dmg:0,hp:0};Object.assign(x,{side:r[2],x:r[3],y:r[4],z:r[5],vx:r[6],vy:r[7],vz:r[8],tgt:rt(r[9]),col:r[10]});nm[r[0]]=x;list.push(x)}w.mm=nm;w.missiles=list;
  w.decoys=(m.de||[]).map(d=>({decoy:true,x:d[0],y:d[1],z:d[2],vx:0,vy:0,vz:0,life:d[3]}));
  if(m.st&&w.stationEnt){const E=w.stationEnt;if(E.shield>0&&m.st[0]<E.shield)E.lastHit=now;E.shield=m.st[0];E.offline=m.st[1]?now+999:0;(m.st[2]||[]).forEach((a,i)=>{if(E.turrets[i])E.turrets[i].aim={x:a[0]/100,y:a[1]/100,z:a[2]/100}})}
  if(m.wk)for(const[id,hp]of m.wk){const x=(w.works||[]).find(y=>y.id===id);if(!x)continue;if(hp<wkHp(x)-1)x.lastHit=now;const o=W;W=w;try{wkSet(x,hp)}finally{W=o}}
  if(m.op&&w.outpostEnt){const OE=w.outpostEnt,o=OE.o;if(m.op[0]<o.shield)OE.lastHit=now;o.shield=m.op[0];o.hull=m.op[1];o.cap.p=m.op[2];o.cap.side=m.op[3]||null;o.breached=m.op[4]?(o.breached||S.T):0;o.owner=m.op[5]||null;OE.aim={x:m.op[6]/100,y:m.op[7]/100,z:m.op[8]/100}}
  w.scaffold=m.sc?{x:m.sc[0],y:m.sc[1],z:m.sc[2],owner:m.sc[3],prog:m.sc[4]}:null;
  for(const v of m.ev){
    if(v[0]==='s'){if(v[11]===me&&!v[12])continue;const src=v[11]?w.pup[v[11]]||null:null;w.shots.push({x:v[1],y:v[2],z:v[3],vx:v[4],vy:v[5],vz:v[6],ttl:v[7]/100,sty:v[8]||undefined,col:v[9],side:v[10],src,dmg:0});
      if(v[13]==='pd'){if(w.t-(w.pdT||0)>1.1){w.pdT=w.t;const vv=vAt({x:v[1],y:v[2],z:v[3]});if(vv>.04)SFX.pd(Math.min(1,vv*1.4))}}
      else if(v[8]==='capital'){const vv=vAt({x:v[1],y:v[2],z:v[3]});if(vv>.04)SFX.lance(Math.min(1,vv*1.3))}
      else if(src&&w.t-(src.sndT||0)>.3){src.sndT=w.t;if(v[8]==='turret')SFX.turret(vAt(src)*.8);else SFX.kinetic(vAt(src)*.7)}}
    else if(v[0]==='b'){if(v[1]===me)continue;const src=w.pup[v[1]];if(src){w.beams.push({src,x:v[2],y:v[3],z:v[4],ttl:.11,col:v[5]});if(w.t-(src.sndT||0)>.45){src.sndT=w.t;SFX.laserNpc(vAt(src))}}}
    else if(v[0]==='x')fxBoom({x:v[1],y:v[2],z:v[3]},v[4],v[5]);
    else if(v[0]==='w')fxWarp({x:v[1],y:v[2],z:v[3]},v[4]);
    else if(v[0]==='m'){const src=w.pup[v[1]];if(src)SFX.missile(vAt(src)*.8,v[2])}}
  const p=w.player;if(p&&p.alive&&!S.player.docked&&!w.dead&&m.ps){const h=m.ps[0],sh=m.ps[1];
    if(h<p.hull-.5){w.hurt=.25;w.shake=Math.max(w.shake||0,.45);SFX.hull();p.lastHit=now}
    if(sh<p.shield-.5){p.lastHit=now;if(sh>0){w.shHit=.35;SFX.shield();p.shHitT=now;p.shHitA=.6}}
    if(p.shield>0&&sh<=0){p.shBreakT=now;p.shDown=true;flash('Shields down! Hold Shift to boost away.',true);SFX.shieldDown()}
    p.hull=h;p.shield=sh}}
// the AI miners' blast cycle as the host sends it: a shot for each new charge, the blast when a chunk appears, the chunk drifting in
function npcBlSnap(w,m){const seen=new Set();
  for(const[id,st,pts]of m.nb||[]){const e=w.pup[id];if(!e)continue;seen.add(id);const B=e.ai.bl||(e.ai.bl={st,pts:[]}),Q=pts.map(p=>({x:p[0],y:p[1],z:p[2]}));
    if(st==='set'||st==='clear')for(const q of Q.slice(B.pts.length))(w.npcBl=w.npcBl||[]).push({x:e.x,y:e.y,z:e.z,tx:q.x,ty:q.y,tz:q.z,t:0,T:Math.max(.2,d3(e,q)/BL.spd)});
    B.st=st;B.pts=Q}
  for(const id in w.pup){const e=w.pup[id];if(e.ai&&e.ai.bl&&!seen.has(id))e.ai.bl=null}
  const old=new Map((w.npcCh||[]).map(c=>[c.id,c])),out=[];
  for(const r of m.nc||[]){const e=w.pup[r[1]];if(!e)continue;let c=old.get(r[0]);
    if(!c){c={id:r[0],e,k:r[2],cr:r[3],x:r[4],y:r[5],z:r[6],until:1e12};const B=e.ai.bl;
      inW(w,()=>{for(const q of(B&&B.pts.length?B.pts:[c]))fxBoom(q,40,'#ffd9a0');if(!MUTE&&w.player&&d3(e,w.player)<3000)SFX.crack(vPil(e))})}
    else{const k=.5;c.x+=(r[4]-c.x)*k;c.y+=(r[5]-c.y)*k;c.z+=(r[6]-c.z)*k}
    c.e=e;c.vx=r[7];c.vy=r[8];c.vz=r[9];out.push(c)}
  w.npcCh=out}
// between snapshots: glide every remote ship along its velocity and ease it onto the host's position
function clientWorld(dt){const w=W,p=w.player;npcBlWorld(dt);
  if(p&&p.alive&&!S.player.docked&&!w.dead&&!w.docking)physics(p,dt);
  for(const id in w.pup||{}){const e=w.pup[id];const age=w.t-(e.snapAt||w.t),tx=e.tx+e.vx*age,ty=e.ty+e.vy*age,tz=e.tz+e.vz*age,k=Math.min(1,9*dt);
    e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;e.x+=(tx-e.x)*k;e.y+=(ty-e.y)*k;e.z+=(tz-e.z)*k;if(e.tq)qSlerp(e.q,e.tq,Math.min(1,12*dt))}
  shotsUpdate(dt);
  w.flareCd=Math.max(0,w.flareCd-dt);w.mslCd=Math.max(0,w.mslCd-dt);
  for(let i=w.beams.length-1;i>=0;i--){w.beams[i].ttl-=dt;if(w.beams[i].ttl<=0)w.beams.splice(i,1)}
  for(let i=w.decoys.length-1;i>=0;i--){const d=w.decoys[i];d.life-=dt;if(d.life<=0)w.decoys.splice(i,1)}
  for(const m of w.missiles){const ox=m.x,oy=m.y,oz=m.z;m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;const tp=m.kind==='torpedo';m.smoke-=dt;if(m.smoke<=0){m.smoke=tp?.025:.035;w.fx.push({x:ox,y:oy,z:oz,vx:rnd(-8,8),vy:rnd(-8,8),vz:rnd(-8,8),life:tp?1.6:.9,max:tp?1.6:.9,c:tp?[.5,.42,.3]:[.4,.4,.44],sz:rnd(4,7)*(tp?1.8:1)})}}
  for(let i=w.fx.length-1;i>=0;i--){const f=w.fx[i];f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.vx*=.985;f.vy*=.985;f.vz*=.985;if(f.life<=0)w.fx.splice(i,1)}
  if(w.tgt&&!validTgt(w.tgt))w.tgt=null;
  if(w.hurt)w.hurt=Math.max(0,w.hurt-dt);if(w.shHit)w.shHit=Math.max(0,w.shHit-dt);if(w.shake)w.shake=Math.max(0,w.shake-dt*1.6)}
function clientRespawn(){$('deathMsg').hidden=true;if(W)exitSector();enterSector(S.player.sector);if(S.player.docked)openDock()}
// the host vanished: race to take over from the last checkpoint; whoever wins hosts, the rest reconnect to them
async function hostGone(){if(MP.elect)return;MP.elect=1;const banner=$('netBanner');if(banner){banner.hidden=false;banner.textContent='The host left. Reconnecting…'}
  if(MP.host){linkClose(MP.host,true);MP.host=null}
  for(let tries=0;tries<20&&NET.on;tries++){await new Promise(r=>setTimeout(r,300+Math.random()*1200+tries*400));
    if(MP.sig){MP.sig.close();MP.sig=null}const r=await sigOpen(MP.hostId);
    if(r.ok){MP.sig=r;MP.myId=MP.hostId;mqInbox();takeOver();break}
    if(r.taken){const me='driftgate1-'+mpSlug(MP.code)+'-'+MP.pid.slice(0,8)+'-'+rid(4);const r2=await sigOpen(me);if(!r2.ok)continue;MP.sig=r2;MP.myId=me;mqInbox();
      const L=MP.host=mkLink(MP.hostId,true);const ok=await new Promise(res=>{const t0=performance.now(),iv=setInterval(()=>{if(L.open){clearInterval(iv);res(true)}else if(L.dead||performance.now()-t0>12000){clearInterval(iv);res(false)}},200)});
      if(ok)break;linkClose(L,true);MP.host=null}}
  MP.elect=0;if(banner)banner.hidden=true}
function takeOver(){const ck=MP.ckpt;if(!ck||!ck.S){mpFail('No saved copy of the galaxy to continue from.');return}
  const mine={};if(S&&S.player){const o=W;W=LW;syncPlayer();W=o;for(const k of OWN)mine[k]=S.player[k]}
  if(W)exitSector();WORLDS={};LW=null;W=null;NET.cl=false;NET.host=true;MP.since=performance.now();MP.st='host';MP.hostPid=MP.pid;MP.cl={};MP.rp={};MP.inp={};
  mpAdoptState(JSON.parse(JSON.stringify(ck.S)));if(!S.player){mpFail('Your pilot is missing from the saved galaxy.');return}Object.assign(S.player,mine);
  if(S.player.docked==='station'&&!S.stations[S.player.sector])S.player.docked=null;
  const l=ledger();S.ledger0={tot:l.tot,credits:l.credits};
  mpRun();feed(`The host left. You are now hosting “${MP.code}”.`,'warn')}

function netHud(){const el=$('netChip');if(!el)return;{const ib=$('bInvite');if(ib)ib.hidden=!NET.on;const di=$('dInvite');if(di)di.hidden=!NET.on}if(!NET.on||!S||!S.player){el.hidden=true;return}el.hidden=false;
  el.innerHTML=`<b>●</b> ${NET.host?'Hosting':'Online'} · ${esc(MP.code)}<br>`+MP.roster.map(r=>`<span style="color:${sideCol(r[2])}">${esc(r[1])}</span>${r[0]===MP.pid?' <small>(you)</small>':r[3]===S.player.sector?' <small>here</small>':` <small>${esc(DEF[r[3]].name)} · ${HOP[S.player.sector][r[3]]}j</small>`}`).join(' · ')+(MP.roster.length<2?'<br><small>No one else yet: friends join with the same galaxy code.</small>':'')}
function openChat(){const el=$('chatIn');el.hidden=false;el.value='';el.focus()}
$('chatIn').addEventListener('keydown',e=>{const el=$('chatIn');if(e.key==='Enter'){const t=el.value.trim();el.hidden=true;el.blur();if(t){if(NET.host)netChat(S.player.name||MP.name,t,NET.me);else netSend({t:'chat',m:t})}e.preventDefault()}else if(e.key==='Escape'){el.hidden=true;el.blur()}e.stopPropagation()});
$('bMp').addEventListener('click',()=>{auInit();mpJoin()});
$('mpCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('bMp').click()});$('mpCode').addEventListener('input',()=>{showInvite();if(!running&&!$('start').hidden)shipCard()});
$('bNewGal').addEventListener('click',()=>{const c=genCode();$('mpCode').value=c;showInvite();shipCard();mpStatus(`Your galaxy code is <b>${esc(c)}</b>. Copy the invite link and send it to your friends, then press <b>Launch</b>. They appear in your galaxy as soon as they open the link and launch.`);if(!cleanCall($('mpName').value))$('mpName').focus()});
$('bCopy').addEventListener('click',()=>{const ok=copyText($('mpLink').textContent);$('bCopy').textContent=ok?'Copied!':'Select and copy';setTimeout(()=>{$('bCopy').textContent='Copy link'},1800)});
$('bInvite').addEventListener('click',()=>{if(!NET.on)return;const u=inviteURL(MP.code),ok=copyText(u);flash(ok?`Invite link copied: ${u}`:`Invite link: ${u}`);feed(`Invite friends with this link: ${u} (galaxy code ${MP.code})`,'info')});
function mpNewGalaxy(){const f=S.player.faction,cls=START_HULLS.find(k=>roleOf(k)===roleOf(S.player.cls))||'interceptor';$('win').hidden=true;
  if(W)exitSector();WORLDS={};LW=null;W=null;MP.rp={};MP.inp={};newGame(f,cls,MP.name);S.gid=rid(10);S.pilots={};S.pilots[MP.pid]=S.player;S.player.pid=MP.pid;S.player.name=MP.name;
  for(const c of readyCl()){c.ready=false;send(c.L,{t:'reset'})}mpRun()}
{const fB=fxBoom,fW=fxWarp;
  fxBoom=function(p,r,col){if(NET.host&&W)(W.netEv=W.netEv||[]).push(['x',r1(p.x),r1(p.y),r1(p.z),r,col]);return fB(p,r,col)};
  fxWarp=function(p,col){if(NET.host&&W)(W.netEv=W.netEv||[]).push(['w',r1(p.x),r1(p.y),r1(p.z),col]);return fW(p,col)}}
addEventListener('beforeunload',()=>{if(NET.host){const ck=hostSave();if(ck)for(const c of readyCl())send(c.L,{t:'ckpt',ck})}});
// save everything and drop back to the title screen; in a shared galaxy the others carry on (another pilot takes over hosting)
// ============================================================ developer tools (Ctrl+Alt+D)
// Both actions create matter out of nothing, so they move the zero-sum baseline by exactly what they add: the economy audit stays balanced.
function devShips(){const sel=$('devShip');if(!sel||!S)return;const f=S.player.faction,cur=S.player.cls;sel.innerHTML=Object.keys(HULL_COST).filter(k=>CLASSES[k]).sort((a,b)=>CLASSES[a].name.localeCompare(CLASSES[b].name)).map(k=>`<option value="${k}"${k===cur?' selected':''}>${esc(CLASSES[k].name)} · ${esc((FACTIONS[f].hulls||{})[k]||k)}${k===cur?' (current)':''}</option>`).join('')}
const DEV_TYPES=[['interceptor','Light Fighter'],['striker','Medium Fighter'],['heavy','Heavy Fighter'],['bomber','Bomber'],['gunboat','Heavy Bomber'],['scout','Scout']];
function devEnemyUI(){const sel=$('devSide');if(!sel||!S)return;const pf=S.player.faction,cur=sel.value;sel.innerHTML=[...FAC_IDS.filter(f=>f!==pf).map(f=>[f,FACTIONS[f].name]),['pirate','The Unbound (pirates)'],['brood','The Brood']].map(([k,n])=>`<option value="${k}"${k===cur?' selected':''}>${esc(n)}</option>`).join('');
  const T=$('devTypes');if(T&&!T.children.length)T.innerHTML=DEV_TYPES.map(([k,n],i)=>`<label><input type="checkbox" value="${k}"${i<2?' checked':''}>${esc(n)}</label>`).join('')}
function devEnemyFrig(side,levi,esc){if(!W||!W.player)return 'Not in a system.';if(levi)side='brood';if(side==='pirate')return `The Unbound have no ${esc?'escorts':'carriers'}. Pick a faction or the Brood.`;if(!FACTIONS[side]&&side!=='brood')return 'Pick an enemy side.';
  const p=W.player;let t;devLedger(()=>{t=(esc?makeEscort:makeCarrier)(side,W.sid,{})});const e=W.ents.find(x=>x.alive&&x.tok===t);
  if(e){qRot(p.q,0,0,1,_f);const d=2600;e.x=p.x+_f.x*d;e.y=p.y+_f.y*d+120;e.z=p.z+_f.z*d;e.vx=e.vy=e.vz=0;faceInstant(e,p.x-e.x,p.y-e.y,p.z-e.z);for(const k of e.pickets||[]){const o=rdir();k.x=e.x+o.x*170;k.y=e.y+o.y*170;k.z=e.z+o.z*170}fxWarp(e,sideCol(side));frigArriveFx(e)}
  return side==='brood'?`A Brood ${esc?'escort, '+t.name+',':broodCap(t)} has surfaced 2.6 km ahead.`:`${FACTIONS[side].short} ${capName(t)} ${t.name} jumped in 2.6 km ahead.`}
function devSquad(side,n,types){if(!W||!W.player)return 'Not in a system.';n=clamp(Math.round(+n||4),1,20);types=(types||[]).filter(k=>CLASSES[k]);if(!types.length)types=['interceptor'];
  const p=W.player,fac=side==='pirate'?null:side,tier=side==='pirate'?pirateTier():factionTier(side),g={id:'g'+(RID++),side,role:'raider',members:[],n0:0,fleeing:false};qRot(p.q,0,0,1,_f);qRot(p.q,1,0,0,_r);
  devLedger(()=>{for(let i=0;i<n;i++){const cls=side==='brood'&&types[i%types.length]==='gunboat'?'heavy':types[i%types.length],ld=loadout('patrol',tier,cls),e=makeNPC(side==='pirate'?'pirate':'raider',side,cls,tier,ld,'stock:'+side);
    const row=Math.floor(i/5),col=i%5-2,d=1100+row*160;e.x=p.x+_f.x*d+_r.x*col*120;e.y=p.y+_f.y*d+(row%2?60:-30);e.z=p.z+_f.z*d+_r.z*col*120;faceInstant(e,p.x-e.x,p.y-e.y,p.z-e.z);
    e.grp=g;e.slot=i;g.members.push(e);if(hostile(side,'player')){e.ai.tgt=W.player;e.ai.hunt=W.player;e.ai.huntUntil=W.t+90}W.ents.push(e);fxWarp(e,sideCol(side))}});
  g.n0=g.members.length;W.groups[g.id]=g;const nm=side==='pirate'?'Unbound':side==='brood'?'Brood':FACTIONS[side].short;
  feed(`⚠ ${nm} squadron of ${n} (${[...new Set(types)].map(k=>CLASSES[k].name).join(', ')}) jumped in 1.1 km ahead and is coming for you.`,'bad');SFX.alarm();return `Spawned ${n} ${nm} ships.`}
function devToggle(){const d=$('dev');d.hidden=!d.hidden;if(!d.hidden){devShips();devEnemyUI()}if(!d.hidden)$('devMsg').textContent=NET.cl?'Requests go to the host.':'Ctrl+Alt+D toggles this panel.'}
// developer: +10,000 credits (the conservation baseline moves with it)
function devCredits(){if(NET.cl){netSend({t:'dev',k:'cr'});return}devLedger(()=>{S.player.credits+=10000});feed('Developer: +10,000 credits.','good')}
function devLedger(fn){const L0=ledger(),r=fn(),L1=ledger();for(const e of RAWS)S.ledger0.tot[e]=(S.ledger0.tot[e]||0)+L1.tot[e]-L0.tot[e];S.ledger0.credits+=L1.credits-L0.credits;return r}
function devRes(P){P=P||S.player;devLedger(()=>{for(const k of ITEM_ORDER)inv.add(P.vault,k,10)});return `Added 10 of each of ${ITEM_ORDER.length} resources to the vault.`}
// switch to any hull as though you had built it: its parts come with it (so a later trade-in is honest), the old hull's parts go to the vault
function devHull(cls){if(!CLASSES[cls]||!(cls in HULL_COST))return 'Unknown hull.';const P=S.player;if(P.cls===cls)return 'You already fly that ship.';
  devLedger(()=>{inv.addAll(P.vault,P.hullInv||{});P.hullInv={...HULL_COST[cls]};
    const nc=CLASSES[cls].drones||0;P.bay=P.bay||{};if((P.bay.drone||0)>nc){inv.add(P.vault,'drone',P.bay.drone-nc);P.bay.drone=nc}
    P.rack=rackCapC(cls,P.tiers.weapon);P.mslT=0;P.swarm=CLASSES[cls].swarm||0;P.swT=0;
    P.cls=cls;const room=shipStats(P.faction,cls,P.tiers,P.tune).cargo;let g=0;while(invMass(P.cargo)>room&&g++<999){const k=Object.keys(P.cargo).sort((a,b)=>mass(b)-mass(a))[0];if(!k)break;inv.take(P.cargo,k,1);inv.add(P.vault,k,1)}});
  if(W&&W.player){refreshPlayerStats();W.player.hull=W.player.st.hull;W.player.shield=W.player.st.sCap}
  return `You now fly a ${(FAC(P.faction).hulls||{})[cls]||CLASSES[cls].name} (${CLASSES[cls].name}).`}
// an AI-flown friendly heavy bomber that tags along so you can climb into its turret (E when alongside)
function devGunboat(){if(!W||!W.player)return 'Not in a system.';const p=W.player,f=S.player.faction;let e;
  devLedger(()=>{e=makeNPC('patrol',f,'gunboat',Math.max(1,factionTier(f)),{missile:4},'stock:'+f);W.ents.push(e)});qRot(p.q,0,0,1,_f);qRot(p.q,1,0,0,_r);e.x=p.x+_f.x*220-_r.x*120;e.y=p.y+20;e.z=p.z+_f.z*220-_r.z*120;e.vx=p.vx;e.vy=p.vy;e.vz=p.vz;qCopy(e.q,p.q);fxWarp(e,sideCol(f));
  e.order={kind:'escort',tgt:p,until:W.t+600,slot:0,by:true,pid:curPid()};feed(`${shipLabel(e)} has joined you. Pull alongside and press E to take its turret.`,'good');return `Spawned ${shipLabel(e)}.`}
function devFrig(asHost,esc){if(NET.cl&&!asHost){netSend({t:'dev',k:esc?'fesc':'frig'});return `Asked the host for ${esc?'an escort':'a carrier'}…`}if(!W||!W.player)return 'Not in a system.';
  const mk=esc?makeEscort:makeCarrier,t=devLedger(()=>NET.on?mk(S.player.faction,W.sid,{},curPid(),true):mk('player',W.sid,{},undefined,true)),e=W.ents.find(x=>x.alive&&x.tok===t);
  if(e){const p=W.player;qRot(p.q,0,0,1,_f);qRot(p.q,1,0,0,_r);const d=420+e.st.radius;e.x=p.x+_f.x*d+_r.x*160;e.y=p.y+_f.y*d+_r.y*160+60;e.z=p.z+_f.z*d+_r.z*160;e.vx=e.vy=e.vz=0;qCopy(e.q,p.q);
    for(const k of e.pickets||[]){const o=rdir();k.x=e.x+o.x*170;k.y=e.y+o.y*170;k.z=e.z+o.z*170}fxWarp(e,sideCol('player'))}
  feed(`${capName(t)==='carrier'?'Carrier':'Escort'} ${t.name} has joined you in ${DEF[W.sid].name}. Order it from the galaxy map (M).`,'good');return `Spawned ${capName(t)} ${t.name}.`}
function devDo(k){if(!running||!S)return;let msg='';
  if(k==='close'){$('dev').hidden=true;return}
  if(k==='cr'){devCredits();msg=NET.cl?'Asked the host for credits…':'+10,000 credits.'}
  else if(k==='res'){if(NET.cl){netSend({t:'dev',k:'res'});msg='Asked the host for resources…'}else{msg=devRes()}}
  else if(k==='frig')msg=devFrig();
  else if(k==='fesc')msg=devFrig(false,true);
  else if(k==='gunboat'){if(NET.cl){netSend({t:'dev',k:'hull',cls:'gunboat'});msg='Asked the host for a heavy bomber…'}else msg=devHull('gunboat')}
  else if(k==='wraith'){if(NET.cl){netSend({t:'dev',k:'hull',cls:'wraith'});msg='Asked the host for the Wraith…'}else{msg=devHull('wraith');if(NET.host&&W.player)W.player.cls=S.player.cls}msg+=' Press K for stealth.';devShips()}
  else if(k==='scout'){if(NET.cl){netSend({t:'dev',k:'hull',cls:'scout'});msg='Asked the host for a scout…'}else{msg=devHull('scout');if(NET.host&&W.player)W.player.cls=S.player.cls}msg+=' Press V for the cockpit.';devShips()}
  else if(k==='efrig'||k==='levi'||k==='eesc'){const sd=$('devSide').value;if(NET.cl){netSend({t:'dev',k,side:sd});msg='Asked the host…'}else msg=devEnemyFrig(sd,k==='levi',k==='eesc')}
  else if(k==='squad'){const sd=$('devSide').value,n=+$('devN').value,ty=[...document.querySelectorAll('#devTypes input:checked')].map(x=>x.value);if(!ty.length){$('devMsg').textContent='Tick at least one ship type.';return}if(NET.cl){netSend({t:'dev',k:'squad',side:sd,n,types:ty});msg='Asked the host…'}else msg=devSquad(sd,n,ty)}
  else if(k==='gbwing'){if(NET.cl){netSend({t:'dev',k:'gbwing'});msg='Asked the host for a heavy bomber…'}else msg=devGunboat()}
  else if(k==='hull'){const cls=$('devShip').value;if(NET.cl){netSend({t:'dev',k:'hull',cls});msg='Asked the host for the ship…'}else{msg=devHull(cls);if(NET.host&&W.player)W.player.cls=S.player.cls}devShips()}
  $('devMsg').textContent=msg;SFX.clunk();if(S.player.docked&&typeof renderDock==='function')renderDock();save()}
$('comms').addEventListener('click',e=>{const b=e.target.closest('[data-cm]');if(b)commsPick(b.dataset.cm)});
$('dev').addEventListener('click',e=>{const b=e.target.closest('[data-dev]');if(b)devDo(b.dataset.dev)});
function quitGame(){if(!S||!running)return;const wasNet=NET.on,code=MP.code;
  if(NET.host){const ck=hostSave();for(const c of readyCl()){if(ck)send(c.L,{t:'ckpt',ck});send(c.L,{t:'hostquit'})}}
  else if(NET.cl){const p=W&&W.player;netSend({t:'bye',...(p&&!S.player.docked?{x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,q:[p.q.x,p.q.y,p.q.z,p.q.w]}:{})})}
  else save();
  setTimeout(()=>{try{closeSheets()}catch(e){}mpShutdown();if(W)exitSector();WORLDS={};LW=null;W=null;S=null;running=false;apOn=false;$('hud').hidden=true;$('dock').hidden=true;$('deathMsg').hidden=true;$('start').hidden=false;buildSectorScene(null);showStart();
    mpStatus(wasNet?`Saved and left “${esc(code)}”. Join again any time to pick up where you left off.`:'To play together, one of you presses <b>Create a galaxy for friends</b> and sends the invite link (or the code) to the others. Everyone who uses the same code shares one galaxy, up to four pilots. Leave it empty to play solo.');
    if(!wasNet)$('ssum').innerHTML='<b>Saved.</b> Press <b>Continue saved pilot</b> to fly again.'},wasNet?250:30)}
function mpShutdown(){if(MP.sig){MP.sig.close();MP.sig=null}for(const q of MP.mq||[])q.close();MP.mq=[];for(const L of Object.values(MP.links))linkClose(L,true);MP.links={};MP.host=null;MP.cl={};MP.rp={};MP.inp={};MP.elect=0;MP.st='off';MP.roster=[];NET.on=false;NET.host=false;NET.cl=false;const b=$('bMp');if(b)b.disabled=false;const n=$('mpName');if(n){n.readOnly=false;n.title=''}}