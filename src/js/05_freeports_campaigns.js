//@src 05_freeports_campaigns.js
// ============================================================ freeports (neutral stations)
// Three Freeport Compact stations sit out in the void between the factions. Anyone may dock; no one may attack, take or raze
// them, and their systems count for no one (the void is outside the 7-of-15 victory count anyway). They trade on their own
// market, post well-paid supply requests (the run crosses unscouted space), and each sells two refits found nowhere else.
const NEUTRAL={col:'#e8c878',name:'Freeport Compact',short:'Freeport'};
// freeports sit at least two jumps from every faction capital (Mirrorwater, Coldwater Drift, Ember Wake)
const FREEPORTS=[{sid:'mw',refits:['hold','scan']},{sid:'cw',refits:['drive','cap']},{sid:'ew',refits:['plate','aegis']}];
const REFITS={
  hold:{name:"Smuggler's Hold",desc:'+40% cargo hold on every hull you fly',cr:3500,need:{plate:12,coil:4}},
  scan:{name:'Echo Scanner',desc:'long-range scan: the systems next door show on your map and contacts',cr:3000,need:{wire:10,coil:4,xc:4}},
  drive:{name:'Ghost Drive',desc:'+12% top speed and thrust',cr:5000,need:{coil:8,xc:6}},
  cap:{name:'Capacitor Bank',desc:'+30% energy, +25% recharge',cr:4000,need:{coil:10,ir:12}},
  plate:{name:'Hardlight Plating',desc:'+20% hull, +4% damage reduction',cr:4500,need:{plate:20,lattice:2}},
  aegis:{name:'Aegis Lattice',desc:'+25% shields',cr:5000,need:{lattice:3,xc:8}}};
// older saves: a freeport left in a system that's no longer on the list moves, whole (works, stores, hull, damage), to the free slot
function fpMigrate(){if(!S.stations)return;const free=FREEPORTS.map(f=>f.sid).filter(id=>!S.stations[id]||S.stations[id].owner!=='neutral');
  for(const id of Object.keys(S.stations)){const R=S.stations[id];if(R.owner!=='neutral'||FREEPORTS.some(f=>f.sid===id))continue;const to=free.shift();if(!to||S.stations[to])continue;
    delete S.stations[id];R.sid=to;R.name=stationName('neutral',R.kind,to);S.stations[to]=R;
    for(const P of[S.player,...Object.values(S.pilots||{})])if(P&&P.sector===id&&P.docked==='station'){P.sector=to;P.x=P.y=P.z=0}
    if(S.fpDown&&S.fpDown[id]){S.fpDown[to]=S.fpDown[id];delete S.fpDown[id]}}
  if(S.fpDown)for(const id of Object.keys(S.fpDown))if(!FREEPORTS.some(f=>f.sid===id)){const to=FREEPORTS.find(f=>!S.stations[f.sid]&&!S.fpDown[f.sid]);if(to)S.fpDown[to.sid]=S.fpDown[id];delete S.fpDown[id]}}
function isFreeport(sid){return!!(S.stations[sid]&&S.stations[sid].owner==='neutral')}
function fpOf(sid){return FREEPORTS.find(f=>f.sid===sid)}
function refitsOf(P){return(P.tune&&P.tune.rf)||{}}
function applyRefits(B,U){const R=U&&typeof U==='object'&&U.rf;if(!R)return B;if(R.hold)B.cargo=Math.round(B.cargo*1.4);if(R.drive){B.maxSpd*=1.12;B.thrust*=1.12}if(R.cap){B.eCap*=1.3;B.eRegen*=1.25}if(R.plate){B.hull*=1.2;B.dr=(B.dr||0)+.04}if(R.aegis)B.sCap*=1.25;return B}
// the Compact: one treasury, three freeports each with its own store (S.econ.stock.neutral stays as an empty pool)
const FP_SEED={fe:300,cu:300,ir:120,xc:30,nu:60,plate:60,wire:60,coil:20,lattice:4,missile:12};
function neutralInit(){S.econ.stock.neutral={};S.econ.fleet.neutral={};S.econ.treasury.neutral=150000;S.ai.neutral={dev:S.T+rnd(120,240)};S.fpStock=1;
  for(const F of FREEPORTS){if(S.stations[F.sid])continue;const R=makeStation(F.sid,'neutral','free',{x:0,y:0,z:0},{});R.dev={life:0,def:0,store:0,prod:0,armor:0};applyDev(R)}
  if(!fpSplit(FP_SEED))inv.addAll(S.econ.stock.neutral,FP_SEED)}
// older saves: the shared Compact pool moves onto the freeports' shelves
function fpStockMigrate(){if(S.fpStock)return;const N=S.econ.stock.neutral;if(!N)return;S.fpStock=1;const o={...N};if(fpSplit(o))for(const k of Object.keys(N))delete N[k]}
// ---- station works: modules any station can build, paid in goods that stay in the structure (and fall as debris if it's razed)
const DEV={
  life:[{plate:12,wire:12,coil:4},{plate:20,wire:20,coil:8,lattice:1}],
  store:[{plate:20,wire:10},{plate:30,wire:16,coil:4},{plate:45,wire:24,coil:8}],
  prod:[{plate:25,wire:15,coil:8,lattice:2},{plate:40,wire:20,coil:14,lattice:4,frame:1}],
  def:[{plate:15,coil:6,missile:8},{plate:24,coil:10,missile:12},{plate:34,coil:14,missile:16,torpedo:2}],
  armor:[{plate:30,coil:4},{plate:45,coil:8,lattice:1},{plate:60,coil:12,lattice:3}],
  hangar:[{plate:22,wire:12,coil:4},{plate:32,wire:18,coil:8,lattice:1},{plate:44,wire:24,coil:12,lattice:2},{plate:60,wire:30,coil:16,lattice:4,frame:1}]};
const DEV_TXT={life:['Life support','houses the crew for more modules (2 more per level) and burns supplies every cycle'],store:['Storage facility','larger stores: more ore on hand, faster restocking'],
  prod:['Production module','level 1: fabricate Lattice and Cores here · level 2: build hulls here'],def:['Defence platform','two more turret mounts per level, harder hitting · level 2+: a missile battery'],armor:['Hull & shield works','+25% station hull and shields per level'],
  hangar:['Fighter hangar','depots only: builds fighters from station stores and launches them when the depot is attacked · 2 bays and +10% depot hull and shields per level · L1 Light Fighters · L2 Medium · L3 Heavy Fighters and Bombers · L4 Heavy Bombers']};
const DEV_KEYS=['life','store','prod','def','armor','hangar'];
function devOf(R){return R.dev||(R.dev={life:0,store:0,prod:0,def:0,armor:0,hangar:0})}   // nothing is pre-built: every module is earned with materials
function devUsed(R){const d=devOf(R);return d.store+d.prod+d.def+d.armor+(d.hangar||0)}
function devCap(R){return R.fwd?2:2+2*devOf(R).life}
function devNext(R,k){const d=devOf(R),L=d[k]||0,T=DEV[k];if(L>=T.length)return null;if(k==='prod'&&R.kind==='core')return null;if(k==='hangar'&&(R.kind!=='depot'||R.fwd))return null;if(k!=='life'&&devUsed(R)>=devCap(R))return null;return T[L]}
function applyDev(R){const d=devOf(R),b=(R.fwd?STN.fdepot:STN[R.kind])||STN.depot,f=1+.25*d.armor+.1*(d.hangar||0),sR=R.sMax?R.shield/R.sMax:1,hR=R.hMax?R.hull/R.hMax:1;R.sMax=Math.round(b.sMax*f);R.hMax=Math.round(b.hMax*f);R.shield=R.sMax*sR;R.hull=R.hMax*hR;
  if(W&&W.stationEnt&&W.stationEnt.rec===R)devEnt(W.stationEnt)}
function devBuild(R,k,srcs){const r=devNext(R,k);if(!r||!takeFrom(r,srcs))return false;inv.addAll(R.fort,r);devOf(R)[k]++;if(R.wk&&R.wk[k]!==undefined)R.wk[k]+=WK_HP[k];applyDev(R);return true}
function starving(R){return R.starve&&S.T-R.starve<60}
// the station entity picks up its modules: shield cap, extra turret mounts on the defence platforms
function devEnt(SE){const R=SE.rec;if(!R)return;const d=devOf(R);SE.sMax=R.sMax;SE.shield=Math.min(SE.shield,SE.sMax);SE.turrets=SE.turrets.filter(t=>!t.mod);
  if(SE.fac!=='brood'&&SE.kind!=='hive'&&d.def){const L=wkLayout(SE.kind,'def',d.def),c=L.parts[0],u=WKU.def,n=d.def*2;for(let i=0;i<n;i++){const a=i/n*TAU+.4;SE.turrets.push({p:[c[0]+Math.cos(a)*u*.74,c[1]-u*.18,c[2]+Math.sin(a)*u*.74],aim:{x:0,y:-1,z:0},cool:rnd(.6),mod:true})}return}
  const P=devSites(SE.kind);for(let i=0;i<d.def;i++){const s=P.def[i%P.def.length];for(const o of[-1,1])SE.turrets.push({p:[s[0]+o*s[3],s[1]+s[4],s[2]-o*s[5]],aim:{x:0,y:0,z:1},cool:rnd(.6),mod:true})}}
// module sites in station-local space, between the docking arms and below their plane so approaches stay clear
function devSites(kind){const mk=kind==='depot'?'depot':'station',M=MDL.ready&&MDL.i[mk],s=M?M.s:120,P=mdlPorts&&MDL.ready?mdlPorts(mk):null;
  const ang=P&&P.length?P.map(v=>Math.atan2(v[2],v[0])).sort((a,b)=>a-b):[0,Math.PI/2,Math.PI,-Math.PI/2].sort((a,b)=>a-b),mid=[];
  for(let i=0;i<ang.length;i++){const a=ang[i],b=i+1<ang.length?ang[i+1]:ang[0]+TAU;mid.push((a+b)/2)}
  while(mid.length<4)mid.push(mid[mid.length-1]+Math.PI);
  const at=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  return{s,store:at(mid[0],s*.72,-s*.38),prod:at(mid[1],s*.72,-s*.38),life:at(mid[2%mid.length],s*.66,-s*.42),armor:at(mid[3%mid.length],s*.6,-s*.36),
    def:mid.map(a=>{const p=at(a+.35,s*1.05,-s*.08);return[p[0],p[1],p[2],-Math.sin(a+.35)*s*.07,s*.09,-Math.cos(a+.35)*s*.07]})}}
// ---- station works in space. Every module a station builds, and every capital shipyard, stands beside the station as its
// own structure: habitat, storage vaults, production works and shield works ring the station between its docking arms, the
// defence platform hangs beneath it carrying the extra turrets, and a shipyard's slipway lies further out (with the hull in
// its slip while a frigate is building). Only torpedoes and capital guns hurt them. Destroyed, a module loses every level
// it had and its materials fall as debris; a shipyard takes any hull in its slip with it. Left alone, crews patch damage.
const WK_KEYS=['life','store','prod','def','armor','hangar'];
const WK_HP={life:1600,store:1300,prod:1500,def:1400,armor:1300,hangar:1500,yard:5200,yardb:1800};
const WK_MDL={hangar:'hangar',life:'wk_life',store:'wk_store',prod:'wk_prod',def:'wk_def',armor:'wk_armor',yard:'wk_yard',yardb:'wk_yard'};
const WKU={hangar:58,life:64,store:55,prod:72,def:62,armor:60,yard:207,yardb:207};
const WK_SLIP=[0,-5,41.8];   // where the slip's centre sits in the shipyard model (metres, model space)      // unit half-size in metres (matches the model pack)
const WK_NAME={hangar:'Fighter hangar',life:'Habitat & life support',store:'Storage vaults',prod:'Production works',def:'Defence platform',armor:'Shield & hull works',yard:'Orbital shipyard',yardb:'Shipyard under construction'};
function wkFac(key){if(FACTIONS[key])return key;const pid=ykPid(key),P=pid&&S.pilots&&S.pilots[pid];return P?P.faction:S.player.faction}
function wkOk(R){return R&&R.kind!=='hive'&&R.owner!=='brood'}
// what stands in a system: one descriptor per built module, shipyard and shipyard under construction
function wkDescs(sid){const out=[],R=S.stations[sid];if(!wkOk(R))return out;const d=devOf(R);
  for(const k of WK_KEYS)if((d[k]||0)>0)out.push({id:'W:'+k,k,lvl:d[k],fac:R.owner,sid});
  let slot=0;for(const key in S.yards||{}){const Y=S.yards[key];if(Y.sector!==sid||key==='brood')continue;out.push({id:'W:y:'+key,k:'yard',lvl:1,fac:wkFac(key),key,slot:slot++,sid})}
  for(const ev of S.events)if(ev.type==='yardbuild'&&ev.stage==='building'&&ev.sector===sid&&ev.att!=='brood')out.push({id:'W:b:'+ev.id,k:'yardb',lvl:1,fac:wkFac(ev.att),key:ev.att,evId:ev.id,slot:slot++,sid});
  for(const w of out)w.name=WK_NAME[w.k];return out}
function wkRec(w){return S.stations[w.sid]}
function wkEv(w){return w.evId?S.events.find(e=>e.id===w.evId):null}
function wkProg(w){const ev=wkEv(w);return ev?clamp(1-(ev.until-S.T)/YARD_TIME,0,1):1}
function wkMax(w){return w.k==='yardb'?Math.round(WK_HP.yardb*(.3+.7*wkProg(w))):w.k==='yard'?WK_HP.yard:WK_HP[w.k]*Math.max(1,w.lvl)}
function wkHp(w){const m=wkMax(w);let v;if(w.k==='yard'){const Y=S.yards[w.key];v=Y&&Y.hp}else if(w.k==='yardb'){const ev=wkEv(w);v=ev&&ev.hp}else{const R=wkRec(w);v=R&&R.wk&&R.wk[w.k]}return v===undefined?m:Math.min(m,v)}
function wkSet(w,v){if(w.k==='yard'){const Y=S.yards[w.key];if(Y){Y.hp=v;Y.hit=S.T}}else if(w.k==='yardb'){const ev=wkEv(w);if(ev)ev.hp=v}else{const R=wkRec(w);if(R){(R.wk=R.wk||{})[w.k]=v;R.wkHit=S.T}}}
// layout in station-local space (rotated with the station's tilt): modules between the docking arms, below the arm plane
function wkAngles(kind){const mk=kind==='depot'?'depot':'station',P=MDL.ready?mdlPorts(mk):null;
  const ang=P&&P.length?P.map(v=>Math.atan2(v[2],v[0])).sort((a,b)=>a-b):[0,Math.PI/2,Math.PI,-Math.PI/2].sort((a,b)=>a-b),mid=[];
  for(let i=0;i<ang.length;i++){const a=ang[i],b=i+1<ang.length?ang[i+1]:ang[0]+TAU;mid.push((a+b)/2)}while(mid.length<4)mid.push(mid[mid.length-1]+Math.PI);return mid}
function wkLayout(kind,k,lvl,slot){const mk=kind==='depot'?'depot':'station',M=MDL.ready&&MDL.i[mk],s=M?M.s:(kind==='depot'?105:150),u=WKU[k];
  if(k==='def'){const y=-(s*(M?Math.max(.6,M.top):1)+u*1.5*SPREAD);return{yaw:0,parts:[[0,y,0]]}}
  const mid=wkAngles(kind),yard=k==='yard'||k==='yardb';
  if(k==='hangar'){const a=mid[1]+3.25,parts=[];for(let i=0;i<lvl;i++){const r=(s*4.3+i*u*2.05)*SPREAD;parts.push([Math.cos(a)*r,-s*.12,Math.sin(a)*r])}return{yaw:-a,parts}}
  const a=yard?mid[1]+.4+(slot||0)*1.9:mid[{store:0,prod:1,life:2,armor:3}[k]],r=(yard?s*5.6:s*3.1+(lvl>1?u*.4:0))*SPREAD,y=yard?s*.15:-s*.3;
  const cx=Math.cos(a)*r,cz=Math.sin(a)*r,tx=-Math.sin(a),tz=Math.cos(a),n=yard?1:lvl,sp=u*2.3,parts=[];
  for(let i=0;i<n;i++){const o=(i-(n-1)/2)*sp;parts.push([cx+tx*o,y+(i%2?u*.35:0),cz+tz*o])}
  return{yaw:-a,parts}}
// the live structures in this world (both host and clients run this every frame from the shared state)
function worksSync(){const SE=W.stationEnt;W.works=W.works||[];const want=SE&&SE.rec?wkDescs(W.sid):[];
  for(const w of W.works.slice())if(!want.some(d=>d.id===w.id)){W.works.splice(W.works.indexOf(w),1);const i=W.ents.indexOf(w);if(i>=0)W.ents.splice(i,1);if(W.tgt&&W.tgt.ref===w)W.tgt=null;
    if(NET.cl&&w.lowHp)for(const c of w.col.slice(0,3))fxBoom(c,c.r*1.4,sideCol(w.fac))}
  for(const d of want){let w=W.works.find(x=>x.id===d.id);if(!w){w={type:'works',lastHit:-99,...d};W.works.push(w);W.ents.push(w)}
    Object.assign(w,d);const sig=w.lvl+'|'+(w.slot||0)+'|'+MDL.ready+'|'+SE.x+','+SE.y+','+SE.z;if(w.sig===sig)continue;w.sig=sig;
    const L=wkLayout(SE.kind,w.k,w.lvl,w.slot),q=SE.q||q0();w.q=qNorm(qMul(q,qAxis(0,1,0,L.yaw,q0()),q0()));
    w.parts=L.parts.map(p=>{qRot(q,p[0],p[1],p[2],_u);return{x:SE.x+_u.x,y:SE.y+_u.y,z:SE.z+_u.z}});
    const mi=w.parts[Math.floor(w.parts.length/2)];w.x=mi.x;w.y=mi.y;w.z=mi.z;const u=WKU[w.k];
    if(w.k==='yard'||w.k==='yardb'){w.col=[];for(let i=0;i<6;i++){const zz=(-.78+i*.33)*u;qRot(w.q,0,0,zz,_u);w.col.push({x:w.x+_u.x,y:w.y+_u.y,z:w.z+_u.z,r:u*.3})}w.r=u}
    else{w.col=w.parts.map(p=>({x:p.x,y:p.y,z:p.z,r:u*.78}));w.r=u*(1+(w.parts.length-1)*1.15)}}
  for(const w of W.works)w.lowHp=wkHp(w)<wkMax(w)*.3}
function worksIn(w2){return(w2||W).works||[]}
// damage: torpedoes and capital guns only
// fighter guns and missiles chip capital armour (frigate hulls, stations, works): a tenth of gun damage, a quarter of missile damage
const CAP_CHIP={gun:.1,missile:.25};function capChip(k){return k==='missile'||k==='swarm'?CAP_CHIP.missile:CAP_CHIP.gun}
function damageWorks(w,dmg,by,kind){if(NET.cl)return;const side=by==='player'?S.player.faction:by;if(w.fac==='neutral'&&side!=='brood')return;if(!side||!hostile(side,w.fac))return;
  if(kind!=='torpedo'&&kind!=='capital'){dmg*=capChip(kind);if(by==='player'&&W.t-(W.immT||-99)>8){W.immT=W.t;flash('Station works are armoured: guns and missiles only chip them. Torpedoes do the real damage.',true)}}
  w.lastHit=W.t;const R=wkRec(w);if(R)distressCall(W.sid,R.name,R.owner,side);const hp=wkHp(w)-dmg;wkSet(w,Math.max(0,hp));if(Math.random()<.5)fxSpark(w.col[0],'#ffcf8a',4);
  if(hp<=0)wkDestroy(w,side)}
function wkCost(k,L){const o={};for(let i=0;i<L;i++)inv.addAll(o,DEV[k][i]);return o}
function wkDestroy(w,by){const sid=w.sid,s=S.sectors[sid],nm=DEF[sid].name,mine=friendSide(w.fac),ours=by&&friendSide(by);let what=w.name;
  if(w.k==='yard'){const Y=S.yards[w.key];if(!Y)return;toDebris(s,Y.fort);delete S.yards[w.key];
    for(const ev of S.events)if((ev.type==='frigbuild'||ev.type==='escbuild')&&ev.stage==='building'&&(ev.yard||ev.att)===w.key){toDebris(s,ev.force);ev.force={};ev.stage='done';what='orbital shipyard and the capital ship in its slip'}}
  else if(w.k==='yardb'){const ev=wkEv(w);if(!ev)return;toDebris(s,ev.force);ev.force={};ev.stage='done'}
  else{const R=wkRec(w);if(!R)return;const d=devOf(R),L=d[w.k]||0,c=wkCost(w.k,L),got={};for(const i in c){const n=Math.min(c[i],R.fort[i]||0);if(n>0)got[i]=inv.take(R.fort,i,n)}toDebris(s,got);
    d[w.k]=0;if(R.wk)delete R.wk[w.k];applyDev(R);if(w.k==='life')R.starve=S.T;if(w.k==='hangar'&&R.hg&&R.hg.length){for(const h of R.hg)toDebris(s,h.load);what+=` and ${R.hg.length} fighter${R.hg.length>1?'s':''} in its bays`;R.hg=[]}}
  const who=by?sideName(by):'attackers',owner=w.fac==='player'?'Your':FACTIONS[w.fac]?FACTIONS[w.fac].short:'The';
  if(mine||ours||covered(sid))feed(mine?`⚠ ${owner} ${what} in ${nm} ${what.includes(' and ')?'were':'was'} destroyed by ${who}.${w.k==='life'?' Its production and missile battery are offline for a minute, and it has crew room for fewer modules until the habitat is rebuilt.':''}`:`${owner} ${what} in ${nm} destroyed${ours?' by our forces':''}.`,mine?'bad':ours?'good':'news');
  if(WORLDS[sid])inW(WORLDS[sid],()=>{const e=(W.works||[]).find(x=>x.id===w.id)||w;for(const c of(e.col||[]).slice(0,4)){fxBoom(c,c.r*1.6,sideCol(w.fac));fxBoom(c,c.r,'#ffe2b0')}})}
// a fleet battle in a system nobody is watching knocks out a structure now and then
function wkAbstractHit(sid,by,chance){if(WORLDS[sid]||Math.random()>chance)return;const L=wkDescs(sid).filter(w=>hostile(by==='player'?S.player.faction:by,w.fac));if(!L.length)return;
  const w=L[Math.floor(Math.random()*L.length)],hp=wkHp(w)-rnd(700,1300);wkSet(w,Math.max(0,hp));if(hp<=0)wkDestroy(w,by)}
// razing a station takes everything around it down too
function wkRaze(sid){const s=S.sectors[sid];{const R=S.stations[sid];if(R&&R.hg){for(const h of R.hg)toDebris(s,h.load);R.hg=[]}}for(const key in S.yards||{}){const Y=S.yards[key];if(Y.sector!==sid)continue;toDebris(s,Y.fort);delete S.yards[key]}
  for(const ev of S.events)if((ev.type==='frigbuild'||ev.type==='yardbuild')&&ev.stage==='building'&&ev.sector===sid){toDebris(s,ev.force);ev.force={};ev.stage='done'}}
// crews patch structures left alone for a minute and a half
function wkRepair(){for(const id in S.stations){const R=S.stations[id];if(!R.wk||S.T-(R.wkHit||-1e9)<90)continue;const d=devOf(R);
    for(const k in R.wk){const m=WK_HP[k]*Math.max(1,d[k]||0);R.wk[k]+=m*.05;if(R.wk[k]>=m||!(d[k]>0))delete R.wk[k]}}
  for(const key in S.yards||{}){const Y=S.yards[key];if(Y.hp===undefined||S.T-(Y.hit||-1e9)<90)continue;Y.hp+=WK_HP.yard*.04;if(Y.hp>=WK_HP.yard)delete Y.hp}}
// AI: a frigate's lance and a siege bomber's torpedoes go to the structures part of the time
function wkHostile(side){return worksIn().filter(w=>hostile(side,w.fac))}
function wkPickFor(e,hasStation,chance){const ai=e.ai||(e.ai={});if(ai.wkT&&W.works.includes(ai.wkT)&&W.t<ai.wkUntil)return ai.wkT;ai.wkT=null;ai.wkUntil=W.t+rnd(25,40);
  const L=wkHostile(e.side).filter(w=>d3(w,e)<4200);if(!L.length||(hasStation&&Math.random()>chance))return null;
  L.sort((a,b)=>(b.k==='yard'||b.k==='yardb'?2:b.k==='def'?1:0)-(a.k==='yard'||a.k==='yardb'?2:a.k==='def'?1:0)||d3(a,e)-d3(b,e));return ai.wkT=Math.random()<.6?L[0]:L[Math.floor(Math.random()*L.length)]}
// physical presence: ships bounce off, shots and torpedoes stop on them
function wkCollide(e,R){for(const w of worksIn())for(const c of w.col){const dx=e.x-c.x,dy=e.y-c.y,dz=e.z-c.z,d=hyp(dx,dy,dz),rr=c.r*.8;if(d<rr+R&&d>0){e.x=c.x+dx/d*(rr+R);e.y=c.y+dy/d*(rr+R);e.z=c.z+dz/d*(rr+R);const vn=(e.vx*dx+e.vy*dy+e.vz*dz)/d;if(vn<0){e.vx-=1.3*vn*dx/d;e.vy-=1.3*vn*dy/d;e.vz-=1.3*vn*dz/d}}}}
function wkSegHit(w,ax,ay,az,bx,by,bz,pad){for(const c of w.col)if(segHit(ax,ay,az,bx,by,bz,c,c.r+(pad||0)))return c;return null}
function wkShot(b,ox,oy,oz){for(const w of worksIn()){if(!hostile(b.side,w.fac))continue;const c=wkSegHit(w,ox,oy,oz,b.x,b.y,b.z,0);if(!c)continue;
    damageWorks(w,b.dmg,b.side,b.cap?'capital':'kinetic');fxSpark(b,'#ffd9a0',2);if(b.cap)fxBoom(b,50,'#ffd9a0');return true}return false}
function wkBlast(m,tp,BR){for(const w of worksIn()){if(!hostile(m.side,w.fac))continue;if(w.col.some(c=>d3(c,m)<BR+c.r))damageWorks(w,m.dmg*(tp?TORP_STATION:1),m.side,m.kind)}}
// drawing
function wkMesh(name,fac){const key='wk'+name+fac;return MESH[key]||(MESH[key]=mdlMesh(name,fac,MDL.i[name].s))}
function drawWorks(t){if(!MDL.ready)return;for(const w of worksIn()){const nm=WK_MDL[w.k],hg=w.k==='hangar';if((!hg&&!mdlHas(nm))||!w.parts)continue;const fac=w.fac,m=hg?hgMesh(fac):wkMesh(nm,fac),fr=wkHp(w)/wkMax(w),hurt=W.t-w.lastHit<.12,u=WKU[w.k];
    const tint=fr<.5?[.62+fr*.5,.56+fr*.5,.54+fr*.5]:ONE3,em=hurt?[.35,.25,.15]:ZERO3;
    for(const p of w.parts){if(!inView(p.x,p.y,p.z,u*1.8))continue;mModel(MM,p.x,p.y,p.z,w.q,1,1,1);
      if(w.k==='yardb'){const pr=wkProg(w);drawMesh({buf:m.buf,n:Math.max(3,Math.floor(m.n*(.12+.88*pr)/3)*3),mode:m.mode},MM,[.82,.82,.85],em);if(W===LW&&Math.random()<.25){qRot(w.q,rnd(-.5,.5)*u,rnd(-.3,.3)*u,(-.8+1.4*pr)*u,_u);fxSpark({x:p.x+_u.x,y:p.y+_u.y,z:p.z+_u.z},'#ffe9b8',2)}}
      else drawMesh(m,MM,tint,em);
      if(fr<.5&&W===LW&&Math.random()<(.5-fr)*.5)fxSpark({x:p.x+rnd(-.5,.5)*u,y:p.y+rnd(-.4,.4)*u,z:p.z+rnd(-.5,.5)*u},fr<.25?'#ff8a4a':'#ffcf8a',2)}
    if(w.k==='yard'&&inView(w.x,w.y,w.z,u*1.5)){const fb=wkSlipBuild(w);if(fb){const H=sortedHull(fac),n=wkSlipN(H,fb);wkSlipModel(w);if(n>0)drawMeshRange(H,MM,[.9,.9,.92],ZERO3,1,0,n)}}}}
// the frigate in a slip is drawn from a copy of its hull sorted stern to bow, so it visibly grows along the slip
function sortedHull(fac){const key='fsort'+fac;if(MESH[key])return MESH[key];const m=shipMesh(fac,'frigate').hull,d=m.data,n=d.length/30,idx=[...Array(n).keys()],zc=i=>d[i*30+2]+d[i*30+12]+d[i*30+22];
  idx.sort((a,b)=>zc(a)-zc(b));const out=new Float32Array(d.length);idx.forEach((t,k)=>out.set(d.subarray(t*30,t*30+30),k*30));const buf=G.createBuffer();G.bindBuffer(G.ARRAY_BUFFER,buf);G.bufferData(G.ARRAY_BUFFER,out,G.STATIC_DRAW);curMesh=null;return MESH[key]={buf,n:n*3,mode:G.TRIANGLES,data:out}}
function drawMeshRange(m,model,tint,em,alpha,first,count){G.uniformMatrix4fv(PM.u.uM,false,model);G.uniform3fv(PM.u.uTint,tint||ONE3);G.uniform3fv(PM.u.uEm,em||ZERO3);G.uniform1f(PM.u.uA,alpha===undefined?1:alpha);if(curMesh!==m){G.bindBuffer(G.ARRAY_BUFFER,m.buf);attribs([3,3,4],10);curMesh=m}if(count>0)G.drawArrays(m.mode,first,count)}
function wkSlipBuild(w){return S.events.find(e=>(e.type==='frigbuild'||e.type==='escbuild')&&e.stage==='building'&&(e.yard||e.att)===w.key&&e.sector===w.sid)}
function wkSlipProg(fb){const d=fb.t0!==undefined?fb.until-fb.t0:FRIGATE_TIME;return clamp(1-(fb.until-S.T)/Math.max(1,d),.03,1)}
function wkSlipN(H,fb){return Math.floor(H.n/3*wkSlipProg(fb))*3}
const WK_FSC=w=>{const fb=w&&wkSlipBuild(w);return(fb&&fb.type==='escbuild'?CLASSES.escort.radius:CLASSES.frigate.radius)*1.25*.8};
function wkSlipPt(w,lx,ly,lz,o){qRot(w.q,WK_SLIP[0]+lx,WK_SLIP[1]+ly,WK_SLIP[2]+lz,_u);o.x=w.x+_u.x;o.y=w.y+_u.y;o.z=w.z+_u.z;return o}
function wkSlipModel(w){const sc=WK_FSC(w),p=wkSlipPt(w,0,0,0,{});mModel(MM,p.x,p.y,p.z,w.q,sc,sc,sc)}
// glow pass: blueprint ghost of what is still to be built, the weld line at the build front, and the running lights
function drawWorksFx(t){if(!MDL.ready)return;for(const w of worksIn()){if(!w.parts||!inView(w.x,w.y,w.z,WKU[w.k]*1.5))continue;const fac=w.fac,col=rgb(sideCol(fac));
    if(w.k==='yardb'){const m=wkMesh('wk_yard',fac),pr=wkProg(w),n0=Math.max(3,Math.floor(m.n*(.12+.88*pr)/3)*3);mModel(MM,w.x,w.y,w.z,w.q,1,1,1);drawMeshRange(m,MM,mixC(col,[.4,.7,1],.5),ZERO3,.07+.03*Math.sin(t*3),n0,m.n-n0)}
    if(w.k!=='yard')continue;const fb=wkSlipBuild(w);if(!fb)continue;const H=sortedHull(fac),n=wkSlipN(H,fb),sc=WK_FSC(w);wkSlipModel(w);
    drawMeshRange(H,MM,[.3,.6,1],ZERO3,.09+.04*Math.sin(t*2.4),n,H.n-n);
    const k=Math.min(H.n/3-1,n/3),zf=(H.data[k*30+2]+H.data[k*30+12]+H.data[k*30+22])/3*sc,p={};
    for(let i=0;i<10;i++){const a=i/10*TAU+t*.7;wkSlipPt(w,Math.cos(a)*sc*.26,Math.sin(a)*sc*.3,zf,p);sprite(p.x,p.y,p.z,(5+Math.random()*7),[1,.88,.6],.5+Math.random()*.5)}
    wkSlipPt(w,0,0,zf,p);sprite(p.x,p.y,p.z,sc*.55,[1,.75,.45],.12+.05*Math.sin(t*20))}}
// ---- fighter hangar (depots): builds fighters from the station's stores into its bays and scrambles them when the depot is
// attacked. Each level adds 2 bays and a heavier class: L1 Light Fighters (the free tier), L2 Medium, L3 Heavy Fighters and
// Bombers, L4 Heavy Bombers. A fighter in a bay is its kit of goods held by the station, so the economy stays exact: launched,
// the kit flies as the ship; shot down, it falls as debris; back in its bay, it is stored again.
const HGR_CLS=[['interceptor'],['striker'],['heavy','heavy','bomber'],['gunboat']];
const HGR_NAME={interceptor:'Light Fighter',striker:'Medium Fighter',heavy:'Heavy Fighter',bomber:'Bomber',gunboat:'Heavy Bomber'};
function hgLvl(R){return R&&R.kind==='depot'?(devOf(R).hangar||0):0}
function hgCap(R){return 2*hgLvl(R)}
function hgSrcs(R){return[storeOf(R)].filter(Boolean)}
function hgPick(L){const top=HGR_CLS[L-1];if(L===1||Math.random()<.55)return pick(top);return pick(HGR_CLS[Math.floor(Math.random()*(L-1))])}
function hgTick(){for(const id in S.stations){const R=S.stations[id],L=hgLvl(R);if(!L||!wkOk(R)||R.owner==='neutral')continue;R.hg=R.hg||[];
    const out=WORLDS[id]?WORLDS[id].ents.filter(e=>e.hgSid===id&&e.alive).length:0;if(R.hg.length+out>=hgCap(R)||starving(R))continue;if(R.hgT===undefined)R.hgT=S.T+rnd(30,60);if(S.T<R.hgT)continue;R.hgT=S.T+rnd(60,100);
    const f=R.owner==='player'?S.player.faction:R.owner,cls=hgPick(L),tier=factionTier(f),ld=loadout('patrol',tier,cls),srcs=hgSrcs(R);
    const capR=R.owner==='player'||isDepotF(R)?{}:(capNeed(R.owner)||{});if(!Object.keys(ld).every(i=>srcs.reduce((a,x)=>a+(x[i]||0),0)>=ld[i]*(isDepotF(R)?1:1.5)+(capR[i]||0)*.5)){if(isDepotF(R)){const w={};for(const i in ld)w[i]=ld[i]*2;depotAsk(R,w)}continue}
    if(takeFrom(ld,srcs))R.hg.push({cls,tier,load:ld})}}
// the hangar works standing in this system (the outermost hall launches)
function hgWorks(){return(W.works||[]).find(w=>w.k==='hangar'&&w.parts&&w.parts.length)}
function hgLive(dt){if(NET.cl)return;const SE=W.stationEnt,R=SE&&SE.rec;if(!R||R.kind!=='depot')return;const out=W.ents.filter(e=>e.hgSid===W.sid&&e.alive);if(!(R.hg&&R.hg.length)&&!out.length)return;
  const side=SE.fac;let th=0;for(const e of W.ents)if(e.type==='ship'&&e.alive&&e.role!=='drone'&&hostile(side,e.side)&&!(e.isPlayer&&(S.player.docked||W.dead))&&!mHid(e,SE)&&d3(e,SE)<3400)th++;
  if(W.t-(SE.lastHit||-99)<5)th=Math.max(th,1);
  const w=hgWorks();
  if(th){W.hgCalm=0;if(w&&R.hg&&R.hg.length&&!starving(R)&&W.t>(W.hgNext||0)&&out.length<th*2+1){W.hgNext=W.t+2.2;const h=R.hg.shift(),e=makeNPC('patrol',side,h.cls,h.tier,h.load,'hg:'+W.sid);e.hgSid=W.sid;
      const p=w.parts[w.parts.length-1];qRot(w.q,1,0,0,_f);const u=WKU.hangar;e.x=p.x+_f.x*u*1.4;e.y=p.y+_f.y*u*1.4;e.z=p.z+_f.z*u*1.4;e.vx=_f.x*90;e.vy=_f.y*90;e.vz=_f.z*90;for(let k=0;k<12;k++)faceDir(e,_f.x,_f.y,_f.z,.5);
      W.ents.push(e);fxSpark(e,sideCol(side),4);if(friendSide(side)&&W.t-(W.hgMsg||-99)>30){W.hgMsg=W.t;feed(`${SE.name} is scrambling its hangar fighters.`,'good')}}}
  else{W.hgCalm=(W.hgCalm||0)+dt;if(W.hgCalm>20)for(const e of out)if(e.role!=='hgret'&&!(e.ai.tgt&&e.ai.tgt.alive)){e.role='hgret';e.ai.tgt=null}}}
// a returning fighter flies back to the hangar and lands; a fight on the way sends it back out
function hgReturn(e,dt){const w=hgWorks(),SE=W.stationEnt;if(!w||!SE||SE.rec&&SE.rec.kind!=='depot'){e.role='leave';return}
  const t=findHostile(e,1800);if(t){e.role='patrol';e.ai.tgt=t;return}
  const p=w.parts[w.parts.length-1];qRot(w.q,1,0,0,_f);const u=WKU.hangar,tx=p.x+_f.x*u*.9,ty=p.y+_f.y*u*.9,tz=p.z+_f.z*u*.9,d=steer(e,tx,ty,tz,dt,true,.8);faceDir(e,tx-e.x,ty-e.y,tz-e.z,dt);e.thrusting=d>60;
  if(d<70){fxSpark(e,sideCol(e.side),2);despawn(e)}}
// back in its bay (or, if the bays are gone or full, into the owner's stores)
function hgDock(e){const sid=e.home.slice(3),R=S.stations[sid],own=R&&sideNorm(R.owner)===sideNorm(e.side);
  const h=own&&R.owner==='player'?R.stock:S.econ.stock[e.side==='player'?S.player.faction:e.side];if(!h)return false;
  if(own&&(R.hg||[]).length<hgCap(R)){(R.hg=R.hg||[]).push({cls:e.cls,tier:e.tier,load:e.load})}else inv.addAll(h,e.load);inv.addAll(h,e.cargo);e.load={};e.cargo={};return true}
function hgHtml(R){const L=hgLvl(R);if(!L)return'';const c={};for(const h of R.hg||[])c[h.cls]=(c[h.cls]||0)+1;const list=Object.keys(c).map(k=>`${c[k]} ${HGR_NAME[k]||k}${c[k]>1?'s':''}`).join(', ');
  return`<p class="note" style="margin:10px 0 0"><b>Fighter hangar</b> · ${(R.hg||[]).length} of ${hgCap(R)} bays filled${list?': '+list:''}. It builds a fighter every minute or two from ${R.owner==='player'?'the depot store':'its faction\'s stores'} and launches them when the depot is attacked. When the fighting stops, they fly back and land.</p>`}
// the hangar hall: a long armoured shed, its bay mouth facing outward with a lit launch deck beyond
function hgMesh(fac){const key='hgr'+fac;if(MESH[key])return MESH[key];const g=new GB(),pal=mdlPal(fac),C=pal.c,L=C[0],M=C[1],D=C[2],A=C[3],F=C[5],u=WKU.hangar;
  g.set(0,0,0).box(u*1.7,u*.55,u*1.25,M);g.set(0,u*.31,0).box(u*1.6,u*.08,u*1.02,L);
  for(let i=-2;i<=2;i++)g.set(i*u*.36,0,0).box(u*.07,u*.63,u*1.32,D);
  g.set(u*.86,0,0).box(u*.04,u*.38,u*.92,[.03,.035,.045]);
  g.set(u*.88,u*.21,0).box(u*.05,u*.04,u*.98,A,.6);g.set(u*.88,-u*.21,0).box(u*.05,u*.04,u*.98,A,.6);
  for(const z of[-1,1])g.set(u*.88,0,z*u*.48).box(u*.05,u*.46,u*.04,A,.6);
  g.set(u*1.3,-u*.24,0).box(u*.9,u*.04,u*.74,D);
  for(let i=0;i<5;i++)for(const z of[-1,1])g.set(u*(.95+i*.17),-u*.21,z*u*.31).box(u*.05,u*.02,u*.05,F,.9);
  g.set(-u*.5,u*.45,u*.3).cyl(u*.025,u*.02,u*.22,6,D);g.set(-u*.5,u*.57,u*.3).sphere(u*.04,4,8,A,.5);
  g.set(-u*.95,0,0).box(u*.25,u*.3,u*.5,D);
  return MESH[key]=g.upload()}
// ---- AI works: every faction, and the Compact, adds a module now and then where it helps most, from stores it can spare
function devPick(f,R){const d=devOf(R),front=NEIGH[R.sid].some(n=>{const o=sideNorm(sectorOwner(n));return o&&o!==f&&o!=='neutral'&&hostile(f,o)});const W2=[];
  if(devUsed(R)>=devCap(R)-0)W2.push(['life',4]);W2.push(['store',R.kind==='core'?2.5:1],['def',front?3:1],['armor',front?2.5:.8]);if(R.kind!=='core')W2.push(['prod',R.owner==='neutral'?2:1.2]);if(R.kind==='depot')W2.push(['hangar',front?2.6:1.1]);
  return W2.filter(([k])=>devNext(R,k))}
function devTick(){const T=S.T;for(const f of[...FAC_IDS,'neutral']){const A=S.ai[f];if(!A)continue;if(A.dev===undefined)A.dev=T+rnd(60,200);if(T<A.dev)continue;A.dev=T+(f==='neutral'?rnd(150,240):rnd(80,120)*BAL.devGap);
    const st=S.econ.stock[f];if(!st)continue;const capR=f==='neutral'?{}:(capNeed(f)||{});   // keep back half of the next shipyard or frigate
    if(f!=='neutral'){const fw=Object.values(S.stations).find(R=>R.owner===f&&R.fwd);if(fw&&Math.random()<.4){if((dStore(fw).frame||0)>=1){takeFrom({frame:1},[dStore(fw)]);inv.add(fw.fort,'frame',1);fw.fwd=0;applyDev(fw);if(friendSide(f)||covered(fw.sid))feed(`${fw.name} has been expanded into a full depot.`,friendSide(f)?'info':'news');continue}else if((st.frame||0)>=1&&depotAsk(fw,{frame:1}))continue}}
    const opts=[];for(const id in S.stations){const R=S.stations[id];if(R.owner!==f)continue;for(const[k,w]of devPick(f,R))opts.push([[R,k],w])}if(!opts.length)continue;
    const[R,k]=wpickArr(opts),r=devNext(R,k);if(isDepotF(R)){if(!haveIn(r,[dStore(R)])){depotAsk(R,r);continue}}else{const spare=Object.keys(r).every(i=>(st[i]||0)>=r[i]*(f==='neutral'?(i==='plate'||i==='wire'?1.6:1.25):1.1)+(capR[i]||0)*.5);if(!spare)continue}
    if(devBuild(R,k,[isDepotF(R)?dStore(R):st])){const lvl=devOf(R)[k];if(friendSide(f)||covered(R.sid)||f==='neutral')feed(`${R.name} has ${lvl>1?'upgraded its':'added a'} ${DEV_TXT[k][0]}${lvl>1?' to level '+lvl:''}.`,friendSide(f)?'info':'news')}}}
// ---- life support: every station burns supplies each cycle (more crew, more modules, more burn). What it burns is recycled
// into the outer drift, and the drift seeds fresh asteroids into depleted systems, so the economy still balances exactly.
const LS_RATE={core:.8,free:.7,depot:.5,hive:.6};
function lifeTick(){S.drift=S.drift||{fe:0,cu:0,ir:0,xc:0,au:0,nu:0};const D=S.drift;
  for(const id in S.stations){const R=S.stations[id],d=devOf(R),need=(R.kind==='hive'?1:Math.max(1,d.life))*(LS_RATE[R.kind]||1)*(1+.12*devUsed(R));R.ls=(R.ls||0)+need;
    const src=storeOf(R);if(!src)continue;let short=false;
    while(R.ls>=1){const cyc=(R.lsN=(R.lsN||0)+1)%4,k=cyc===3?'ir':cyc%2?'cu':'fe',k2=k==='fe'?'cu':'fe';const got=inv.take(src,k,1)?k:inv.take(src,k2,1)?k2:null;if(!got){short=true;break}D[got]++;R.ls--}
    if(short){if(!R.starve||S.T-R.starve>120){if(R.owner==='player'||(R.owner===S.player.faction&&Math.random()<.2))feed(`${R.name} is short of ore for life support: its production and missile battery are offline until it's restocked.`,'warn')}R.starve=S.T;R.ls=Math.min(R.ls,3)}else R.starve=0}
  driftSeed()}
function fieldMass(s){let m=0;for(const a of s.ast)if(!a.comet)m+=oreTotal(a);return m}
function driftSeed(){const D=S.drift;let tot=0;for(const e of RAWS)tot+=D[e];if(tot<50)return;
  for(let n=0;n<2&&tot>=50;n++){const c=[];for(const d of SECTOR_DEFS){if(d.kind==='hive')continue;const s=S.sectors[d.id];if(s.base0===undefined)s.base0=fieldMass(s);if(s.ast.length>=70)continue;const f=s.base0?fieldMass(s)/s.base0:1;c.push([d,Math.max(.05,1.1-f)])}
    if(!c.length)return;const d=wpickArr(c),s=S.sectors[d.id],ores=Object.keys(d.ores).filter(e=>e!=='au'||d.kind==='deep');let k=wpick(Object.fromEntries(ores.map(e=>[e,d.ores[e]])));if(D[k]<30)k=RAWS.reduce((b,e)=>D[e]>D[b]?e:b,'fe');if(!oreHere(k,d.id))return;
    const m=Math.min(D[k],ri(40,90));if(m<20)return;D[k]-=m;tot-=m;s.ast.push({id:S.nextId++,...newAstPos(s),ore:{[k]:m},seed:ri(1,1e9),fresh:S.T});
    if(covered(d.id)&&S.T-(S.driftSaid||-999)>240){S.driftSaid=S.T;feed(`Survey: fresh drift rock has settled into ${d.name} (${m} t of ${ITEMS[k].name}).`,'info')}}}
// ---- freeport requests: lucrative supply contracts, delivered only at that freeport
function allFeed(msg,kind){if(NET.cl)return;feed(msg,kind);if(NET.host)for(const pid in S.pilots||{})if(pid!==NET.me)feedTo(pid,msg,kind)}
function fpContracts(){for(const F of FREEPORTS){const R=S.stations[F.sid];if(!isFreeF(R))continue;const st=dStore(R);
    if(S.contracts.filter(c=>c.st===F.sid).length>=2||Math.random()<.5)continue;
    const want={plate:[14,3],wire:[14,3],coil:[6,2],ir:[28,2],xc:[10,1.6],lattice:[2,1],fe:[50,1.2],cu:[50,1.2]},c=[];for(const k in want)if((st[k]||0)<want[k][0]&&!S.contracts.some(x=>x.st===F.sid&&x.item===k))c.push([k,want[k][1]]);if(!c.length)continue;
    const item=wpickArr(c),js=jobSize(item,item==='fe'||item==='cu'||item==='ir'?ri(24,48):item==='plate'||item==='wire'?ri(10,20):item==='lattice'?ri(2,4):ri(5,10)),n=js.n,reward=Math.ceil(baseValue(item)*n*rnd(2.6,3.4)/10)*10;
    S.contracts.push({id:S.nextId++,fac:'neutral',st:F.sid,item,n,n0:n,reward,until:S.T+rnd(600,900)*js.t});
    allFeed(`📦 Freeport request · ${R.name} (${DEF[F.sid].name}, out in the void): ${n} ${ITEMS[item].name} for ${fmt(reward)} cr. Deliver there in person.`,'info')}}
// ---- blockade runs. A faction station that's under siege (a hostile offensive on it, or a hostile capital ship in its
// system) or cut off behind the lines (no friendly system next door) posts a blockade run: deliver the goods there in person
// for about 4x their value. Anything you own counts, including goods bought elsewhere. Carrying blockade cargo into hostile
// space near the station draws an interdiction wing that hunts you. A delivery also patches the station's hull a little.
const BLK_N=2,BLK_PAY=[3.6,4.6],BLK_T=900;
function blkWhy(f,sid){const R=S.stations[sid];if(!R||R.owner!==f)return null;if(S.events.some(e=>e.type==='offensive'&&e.st===sid&&hostile(e.att,f)))return'under siege';
  if(frigatesIn(sid).some(t=>hostile(f,t.side)))return'blockaded by a hostile capital ship';const T=territory(f);if(!NEIGH[sid].some(n=>T.has(n)))return'cut off behind the lines';return null}
function blkFoe(f,sid){const ev=S.events.find(e=>e.type==='offensive'&&e.st===sid&&hostile(e.att,f));if(ev)return ev.att;const c=frigatesIn(sid).find(t=>hostile(f,t.side));if(c)return c.side;
  for(const n of NEIGH[sid]){let o=sectorOwner(n);if(o==='player')o=S.player.faction;if(o&&o!==f&&(FAC_IDS.includes(o)||o==='brood'))return o}return FAC_IDS.find(x=>hostile(f,x))}
function blkContracts(){for(const f of FAC_IDS){const st=S.econ.stock[f];if(!st)continue;S.contracts=S.contracts.filter(c=>!(c.blk&&!c.cont&&c.fac===f&&!blkWhy(f,c.st)));
    const L=S.contracts.filter(c=>c.blk&&!c.cont&&c.fac===f);if(L.length>=BLK_N||Math.random()<.4)continue;
    const cand=Object.keys(S.stations).filter(sid=>!L.some(c=>c.st===sid)&&blkWhy(f,sid));if(!cand.length)continue;const sid=pick(cand),why=blkWhy(f,sid),R=S.stations[sid];
    const item=wpickArr([['plate',3],['coil',2],['wire',2],['missile',1.2],['ir',1]].filter(([k])=>ITEMS[k])),js=jobSize(item,item==='ir'?ri(20,40):item==='missile'?ri(4,8):item==='coil'?ri(5,10):ri(10,20)),n=js.n,reward=Math.ceil(baseValue(item)*n*rnd(BLK_PAY[0],BLK_PAY[1])/10)*10;
    S.contracts.push({id:S.nextId++,fac:f,st:sid,blk:1,why,foe:blkFoe(f,sid),item,n,n0:n,reward,until:S.T+BLK_T*js.t});
    facFeed(f,`⚠ Blockade run: ${R.name} in ${DEF[sid].name} is ${why} and needs ${n} ${ITEMS[item].name}. ${fmt(reward)} cr for delivery in person (Jobs). Expect enemy patrols on the way in.`,'warn')}}
// every frame, in every open system: any pilot (host or guest) carrying blockade cargo through hostile space near the station
// draws an interdiction wing that hunts them (at most every 3 minutes per pilot per system)
function blkHunt(){if(NET.cl||!W)return;const L=[];if(W===LW&&W.player&&W.player.alive&&!S.player.docked)L.push([S.player,W.player,null]);for(const e of W.ents)if(e.rp&&e.alive&&S.pilots&&S.pilots[e.rp])L.push([S.pilots[e.rp],e,e.rp]);
  for(const[P,p,pid]of L)blkHuntOne(P,p,pid)}
function blkHuntOne(P,p,pid){const f=P.faction,T=territory(f);if(T.has(W.sid))return;const hk=W.sid;P.blkT=P.blkT||{};if(P.blkT[hk]&&S.T-P.blkT[hk]<180)return;
  const k=S.contracts.find(c=>c.blk&&c.fac===f&&(c.st===W.sid||NEIGH[c.st].includes(W.sid))&&((P.cargo||{})[c.item]||0)>=Math.min(c.n,5));if(!k)return;
  P.blkT[hk]=S.T;const foe=k.foe&&hostile(f,k.foe)?k.foe:blkFoe(f,k.st);if(!foe)return;let n=0;
  for(let i=0;i<(k.st===W.sid?3:2);i++){const e=spawnNPC('patrol',foe);if(!e)break;const o=rdir();e.x=p.x+o.x*1800;e.y=p.y+o.y*400;e.z=p.z+o.z*1800;e.ai.tgt=p;e.hunt=1;n++}
  if(n)keyFeed(pid||pkey(),`⚠ Blockade: a ${foe==='brood'?'Brood':FACTIONS[foe].short} interdiction wing (${n}) is hunting your cargo for ${S.stations[k.st].name}.`,'bad')}
const FP_REBUILD={plate:40,wire:30,coil:10};
function fpRebuild(){const D=S.fpDown||{},st=fpStores();if(!st.length)return;for(const sid in D){if(S.stations[sid]){delete D[sid];continue}if(S.T-D[sid]<1200||!haveIn(FP_REBUILD,st)||frigatesIn(sid).some(t=>t.side==='brood'))continue;
    takeFrom(FP_REBUILD,st);const R=makeStation(sid,'neutral','free',{x:0,y:0,z:0},{...FP_REBUILD});R.dev={life:0,def:0,store:0,prod:0,armor:0};applyDev(R);R.hull=R.hMax*.5;delete D[sid];
    if(WORLDS[sid])inW(WORLDS[sid],()=>{if(!W.stationEnt)addStationEnt(R)});allFeed(`The Freeport Compact has rebuilt ${R.name} in ${DEF[sid].name}. It's open for trade again.`,'good')}}
function neutralIndustry(){fpRebuild();for(const st of fpStores()){craftDown(st,'plate',{fe:50},140);craftDown(st,'wire',{cu:50},140);craftAbstract(st,'coil',1,7);craftAbstract(st,'missile',1,6);craftAbstract(st,'matrix',1,FP_MAKE.matrix);craftAbstract(st,'seal',1,FP_MAKE.seal)}}
const FP_MAKE={matrix:6,seal:4};   // how many of each a freeport's works keep on its own shelf
// station missile battery (defence level 2+): one missile at a time at the nearest hostile, drawn from the owner's stores
function stMissiles(SE,dt){const R=SE.rec;if(!R||SE.offline)return;const d=devOf(R);if(d.def<2||starving(R))return;SE.mcd=(SE.mcd||rnd(2,5))-dt;if(SE.mcd>0)return;SE.mcd=Math.max(3.5,8-d.def*1.5);
  let t=null,bd=1600;for(const e of W.ents){if(e.type!=='ship'||!e.alive||e.role==='limpet'||((e.isPlayer&&(S.player.docked||W.dead)||mHid(e,SE))))continue;if(!stHostile(SE,e))continue;const dd=d3(e,SE);if(dd<bd){bd=dd;t=e}}if(!t||NET.cl)return;
  const src=storeOf(R);if(!src||!inv.take(src,'missile',1))return;
  const sh={x:SE.x,y:SE.y+40,z:SE.z,vx:0,vy:0,vz:0,q:qLook(t.x-SE.x,t.y-SE.y-40,t.z-SE.z,0,1,0,q0()),st:{radius:70},side:SE.fac==='neutral'?'neutral':SE.fac};launchMissile(sh,t,3,'missile')}

// ---- landing on an asteroid: hug a rock and vanish from enemy sensors. While landed everything but your own radar is powered
// down (no engines, guns, missiles, shields or recharge) and nothing more than MASK_NEAR away can see, target or lock you;
// missiles already chasing you lose the lock. Lifting off reboots the ship: guns and launchers stay cold for BOOT_T seconds
// while energy surges back, and shields start recharging from empty once the boot is done.
const LAND_SPD=70,LAND_REACH=120,BOOT_T=4,MASK_NEAR=320;
function mHid(o,from){return!!o&&((!!o.masked&&(!from||d3(o,from)>(o.maskR||MASK_NEAR)))||blCov(o,from))}
// the rock's real shape: the same pose and mesh the renderer draws (astMesh), so a landed ship sits on the surface and turns
// with the rock instead of hovering on its bounding sphere
function astPose(a,t,o){const sd=a.seed||a.id;qAxis(((sd>>3)%7-3)/4,((sd>>6)%5-2)/2.5,1,(sd%628)/100+t*(((sd>>9)%7)-3)*.03,o);return qNorm(o)}
function astScaleY(a){const sd=a.seed||a.id;return .85+(sd%13)/40}
const AST_SHAPE={};
function astShape(v){if(AST_SHAPE[v])return AST_SHAPE[v];const R=mulberry(v*977+13),t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const l=hyp(...p);return p.map(c=>c/l)});
  const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const mid=new Map(),M=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(mid.has(k))return mid.get(k);const p=V[a].map((c,i)=>(c+V[b][i])/2),l=hyp(...p);V.push(p.map(c=>c/l));mid.set(k,V.length-1);return V.length-1};
  const F2=[];for(const[a,b,c]of F){const ab=M(a,b),bc=M(b,c),ca=M(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}
  V=V.map(p=>{const s=.72+R()*.42;return[p[0]*s,p[1]*s*.85,p[2]*s]});return AST_SHAPE[v]={V,F:F2}}
// where a ray from the rock's centre along d (rock frame, unit) leaves its surface: the point and the outward face normal, rock frame
function astSurf(a,d){const sh=astShape((a.seed||a.id)%8),R=astR(a),sy=astScaleY(a),P=sh.V.map(v=>[v[0]*R,v[1]*R*sy,v[2]*R]);let best=null;
  for(const[i,j,k]of sh.F){const A=P[i],B=P[j],C=P[k],e1=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],e2=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],
      pv=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]],det=e1[0]*pv[0]+e1[1]*pv[1]+e1[2]*pv[2];if(Math.abs(det)<1e-9)continue;
    const iv=1/det,tv=[-A[0],-A[1],-A[2]],u=(tv[0]*pv[0]+tv[1]*pv[1]+tv[2]*pv[2])*iv;if(u<-1e-6||u>1+1e-6)continue;
    const qv=[tv[1]*e1[2]-tv[2]*e1[1],tv[2]*e1[0]-tv[0]*e1[2],tv[0]*e1[1]-tv[1]*e1[0]],w=(d[0]*qv[0]+d[1]*qv[1]+d[2]*qv[2])*iv;if(w<-1e-6||u+w>1+1e-6)continue;
    const r=(e2[0]*qv[0]+e2[1]*qv[1]+e2[2]*qv[2])*iv;if(r<=0||(best&&r>=best.r))continue;
    let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const nl=hyp(n[0],n[1],n[2])||1;n=n.map(c=>c/nl);if(n[0]*d[0]+n[1]*d[1]+n[2]*d[2]<0)n=n.map(c=>-c);best={r,n}}
  if(!best)return{p:[d[0]*R,d[1]*R,d[2]*R],n:d};return{p:[d[0]*best.r,d[1]*best.r,d[2]*best.r],n:best.n}}
// how far a ship's hull reaches below its centre (from its model), so it rests on its belly
const BELLY={};
function shipBelly(e){const k=(e.fac||e.side)+':'+e.cls;if(BELLY[k]!=null)return BELLY[k]*e.st.radius*1.25;let lo=.3;
  try{const m=shipMesh(e.side==='pirate'?'pirate':e.fac,e.cls),d=m&&m.hull&&m.hull.data;if(d&&d.length){let mn=0;for(let i=1;i<d.length;i+=10)if(d[i]<mn)mn=d[i];if(mn<0)lo=-mn}}catch(err){}
  BELLY[k]=lo;return lo*e.st.radius*1.25}
const _lq=q0(),_lq2=q0(),_lq3=q0();
// put a ship down on a rock: L holds the touchdown direction and the ship's attitude in the rock's frame
function astLandInit(e,a){const qa=astPose(a,W.t,_lq),ci={x:-qa.x,y:-qa.y,z:-qa.z,w:qa.w},v=qRot(ci,e.x-a.x,e.y-a.y,e.z-a.z,{x:0,y:0,z:0}),l=hyp(v.x,v.y,v.z)||1,d=[v.x/l,v.y/l,v.z/l],h=astSurf(a,d);
  // in the rock frame: stand the ship on the face, nose kept as close to where it pointed as the slope allows
  const n=h.n,f0=qRot(ci,...(()=>{qRot(e.q,0,0,1,_f);return[_f.x,_f.y,_f.z]})(),{x:0,y:0,z:0});let fd=f0.x*n[0]+f0.y*n[1]+f0.z*n[2],Z={x:f0.x-n[0]*fd,y:f0.y-n[1]*fd,z:f0.z-n[2]*fd},zl=hyp(Z.x,Z.y,Z.z);
  if(zl<.05){Z=Math.abs(n[1])<.9?{x:-n[2],y:0,z:n[0]}:{x:1,y:0,z:0};zl=hyp(Z.x,Z.y,Z.z)}Z.x/=zl;Z.y/=zl;Z.z/=zl;const Y={x:n[0],y:n[1],z:n[2]},X={x:Y.y*Z.z-Y.z*Z.y,y:Y.z*Z.x-Y.x*Z.z,z:Y.x*Z.y-Y.y*Z.x};
  return{d,qr:qFromBasis(X,Y,Z,q0()),yaw:0,pit:0}}
// every frame while landed: follow the rock's spin, sit on the surface, and look around within a small arc
function astLandPlace(e,a,L){const qa=astPose(a,W.t,_lq),h=astSurf(a,L.d),bl=shipBelly(e)+1.5;qRot(qa,h.p[0],h.p[1],h.p[2],_bv1);const px=_bv1.x,py=_bv1.y,pz=_bv1.z;qRot(qa,h.n[0],h.n[1],h.n[2],_bv1);
  L.nx=_bv1.x;L.ny=_bv1.y;L.nz=_bv1.z;e.x=a.x+px+L.nx*bl;e.y=a.y+py+L.ny*bl;e.z=a.z+pz+L.nz*bl;
  qMul(qa,L.qr,_lq2);qMul(_lq2,qAxis(0,1,0,L.yaw||0,_lq3),_lq2);qMul(_lq2,qAxis(1,0,0,L.pit||0,_lq3),e.q);qNorm(e.q)}
function landCandidate(){const p=W&&W.player;if(!p||S.player.docked||W.dead||p.landed||W.docking||W.bridge)return null;let b=null,bd=1e9;
  for(const a of S.sectors[W.sid].ast){if(a.comet)continue;const d=d3(a,p)-astR(a)-p.st.radius;if(d<LAND_REACH&&d<bd){bd=d;b=a}}return b?{a:b,d:Math.max(0,bd)}:null}
function landOn(a){const p=W.player;if(hyp(p.vx,p.vy,p.vz)>LAND_SPD){flash(`Too fast to land. Slow below ${LAND_SPD} m/s.`,true);return false}
  const dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,l=hyp(dx,dy,dz)||1;p.landed={aid:a.id,nx:dx/l,ny:dy/l,nz:dz/l,t:W.t,...astLandInit(p,a)};astLandPlace(p,a,p.landed);p.vx=p.vy=p.vz=0;p.wx=p.wy=p.wz=0;apOn=false;p.mining=null;p.thrusting=p.boosting=false;
  p.masked=true;p.shield=0;p.boot=0;unTargetPlayer(p);for(const m of W.missiles)if(m.tgt===p)m.tgt=null;if(W.lock){W.lock.p=0;W.lock.locked=false}
  if(NET.cl)netSend({t:'land',on:1});SFX.clunk();flash(`Landed. Systems down: you are off enemy sensors beyond ${MASK_NEAR} m. Radar stays live. E to lift off.`);return true}
function liftOff(){const p=W&&W.player;if(!p||!p.landed)return;const L=p.landed;p.landed=null;p.masked=false;p.boot=W.t+BOOT_T;p.vx=L.nx*30;p.vy=L.ny*30;p.vz=L.nz*30;
  if(NET.cl)netSend({t:'land',on:0});SFX.boost();flash(`Lifting off. Systems rebooting: weapons in ${BOOT_T} s, shields charge from empty after that.`)}
// ---- the Wraith's stealth mode (K): hidden beyond 600 m; no shields, guns, missile locks or afterburner while hidden.
// Normal thrusters still work. Leaving stealth (K again, or being hit) reboots like lifting off an asteroid.
const STEALTH_R=600;
function stealthOn(){const p=W&&W.player,P=S.player;if(!p||P.cls!=='wraith'||P.docked||W.dead||p.landed||W.bridge)return;if(p.stealth){stealthOff(false);return}
  p.stealth=true;p.masked=true;p.maskR=STEALTH_R;p.shield=0;p.boosting=false;apOn=false;p.mining=null;unTargetPlayer(p);for(const m of W.missiles)if(m.tgt===p&&d3(m,p)>STEALTH_R)m.tgt=null;if(W.lock){W.lock.p=0;W.lock.locked=false}
  if(NET.cl)netSend({t:'stealth',on:1});SFX.clunk();flash(`Stealth: hidden beyond ${STEALTH_R} m. Shields, guns, locks and afterburner are down. K to power up.`)}
function stealthOff(hit){const p=W&&W.player;if(!p||!p.stealth)return;p.stealth=false;p.masked=false;p.maskR=0;p.boot=W.t+BOOT_T;if(NET.cl)netSend({t:'stealth',on:0});SFX.boost();
  flash(hit?`Hit! Stealth broken. Systems rebooting: weapons in ${BOOT_T} s, shields charge from empty after that.`:`Powering up. Weapons in ${BOOT_T} s, shields charge from empty after that.`,!!hit)}
function landedTick(dt){const p=W.player,L=p.landed,a=S.sectors[W.sid].ast.find(x=>x.id===L.aid);if(!a){liftOff();flash('The rock broke up under you.',true);return}
  p.vx=p.vy=p.vz=0;p.shield=0;p.thrusting=p.boosting=false;p.mining=null;
  // look around while sat on the rock: the stick turns the ship on its belly, and tips the nose a little up or down
  if(!L.qr)Object.assign(L,astLandInit(p,a));const si=steerInput();if(Math.abs(si.yaw)>.02)L.yaw+=si.yaw*p.st.turn*.5*dt;if(Math.abs(si.pitch)>.02)L.pit=clamp(L.pit+si.pitch*p.st.turn*.5*dt,-.3,.45);
  astLandPlace(p,a,L)}
function stHostile(SE,e){return hostile(SE.fac,e.side)}
// ---- dock tabs: station works (build modules at your depots, see any station's), freeport refits
function worksHtml(c,P,srcs,R){const d=devOf(R),mine=R.owner==='player';let h=`<p class="note" style="margin:0 0 12px">${esc(R.name)} · modules ${devUsed(R)} of ${devCap(R)} (life support houses the crew for more). Every module stands beside the station as its own structure: torpedoes and capital guns can destroy it, and a destroyed module loses all its levels (its materials fall as debris). Crews repair damage when the fighting stops. Life support burns ${(((R.kind==='hive'?1:Math.max(1,d.life))*(LS_RATE[R.kind]||1)*(1+.12*devUsed(R)))*6).toFixed(0)} t of ore a minute${starving(R)?' · <b style="color:var(--danger)">short of ore: production and missiles offline</b>':''}.${mine?' Builds draw from the depot store first, then your vault.':''}</p>`;
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Module</th><th class="r">Level</th><th>Next level</th><th></th></tr></thead><tbody>`;
  for(const k of DEV_KEYS){const L=d[k]||0,max=DEV[k].length,r=devNext(R,k),why=k==='prod'&&R.kind==='core'?'built in':k==='hangar'&&R.kind!=='depot'?'depots only':L>=max?'max':!r?'needs more life support':'';
    const hpS=L&&R.wk&&R.wk[k]!==undefined?Math.round(R.wk[k]/(WK_HP[k]*L)*100):null;
    h+=`<tr><td><b>${DEV_TXT[k][0]}</b>${hpS!==null?` <span class="req ${hpS<50?'no':'ok'}">structure ${hpS}%</span>`:''}<br><span class="mass" style="margin:0">${DEV_TXT[k][1]}</span></td><td class="r num">${L}/${k==='prod'&&R.kind==='core'?'—':max}</td><td>${r?Object.keys(r).map(i=>chip(i,r[i],countIn(i,srcs))).join(' '):`<span class="mass" style="margin:0">${why}</span>`}</td><td>${mine&&r?`<div class="act"><button class="btn sm" data-act="dev" data-arg="${k}" ${haveIn(r,srcs)?'':'disabled'}>Build</button></div>`:''}</td></tr>`}
  return h+`</tbody></table></div>`+hgHtml(R)+capProgHtml(R)}
// a faction's capital programme, shown at its home station: the carrier is assembled from the faction warehouse
function capProgHtml(R){const f=R.owner;if(!FACTIONS[f]||f==='brood'||FAC_HOME(f)!==R.sid)return'';const st=S.econ.stock[f]||{},Y=S.yards[f],yb=S.events.find(e=>e.type==='yardbuild'&&e.att===f&&e.stage==='building'),fb=S.events.find(e=>e.type==='frigbuild'&&e.att===f&&e.stage==='building'),n=S.frigates.filter(x=>x.side===f&&isCar(x)).length;
  let h=`<div class="h3" style="margin-top:18px">${esc(FACTIONS[f].short)} capital programme</div><p class="note" style="margin:0 0 8px">The carrier is assembled here from the ${esc(FACTIONS[f].short)} warehouse, which ore convoys from every depot feed; a build starts only once the full kit is in stock, and the kit is taken at the start. ${n} of 1 carrier in service.</p>`;
  if(!Y)h+=`<p class="note">${yb?`Capital shipyard under construction: ${Math.round(wkProg({evId:yb.id})*100)}%.`:'No capital shipyard yet. It needs: '+(C=>Object.keys(C).map(i=>chip(i,C[i],st[i]||0)))(yardCost(f)).join(' ')}</p>`;
  else if(fb)h+=`<p class="note">Carrier in the slip: ${Math.round(wkSlipProg(fb)*100)}% (kit already drawn from stock).</p>`;
  else if(n>=cap)h+=`<p class="note">Fleet at strength; no carrier building.</p>`;
  else h+=`<p class="note" style="margin:0">Next carrier needs: ${(C=>Object.keys(C).map(i=>chip(i,C[i],st[i]||0)))(carCostF(f)).join(' ')}</p>`;
  return h}

// Jobs: the faction's supply drives (mining and hauling) and the delivery contracts posted at this dock
function jobLine(k){const t=Math.round(k.n*mass(k.item)),hold=(W&&W.player&&W.player.st&&W.player.st.cargo)||(CLASSES[S.player.cls]||{}).cargo||60,n0=k.n0||k.n;return`<span class="mass">${fmt(t)} t${n0>k.n?` · ${n0-k.n} of ${n0} already delivered`:''}${t>hold?` · more than your ${hold} t hold: deliver in parts`:''}</span>`}
function contractsHtml(c,P,srcs){let h='';
    const fp=c.owner==='neutral',list=S.contracts.filter(k=>fp?k.st===P.sector&&!k.blk:k.fac===P.faction&&(!k.st||(k.blk&&k.st===P.sector))),reqs=S.contracts.filter(k=>k.st&&k.st!==P.sector&&!k.blk),blks=S.contracts.filter(k=>k.blk&&k.fac===P.faction&&k.st!==P.sector);
    h+=`<p class="note" style="margin:0 0 12px">${fp?'The Freeport Compact pays a premium for goods brought here in person, across unscouted space.':`${FAC(P.faction).name} pays from its treasury for deliveries to any of its docks.`} Delivered goods join the buyer's stores. Only goods you mined, salvaged or made count: market purchases can't fill a contract. You can deliver part of a job (at least a quarter, or 10 units): you're paid for what you bring and the rest stays posted, so big jobs can be filled over several trips or by several pilots.</p>`;
    if(!list.length)h+=`<div class="empty">No open contracts. New ones are posted every minute or so.</div>`;
    else{h+=`<div class="tblw"><table class="t"><thead><tr><th>Deliver</th><th class="r">Reward</th><th class="r">Time left</th><th></th></tr></thead><tbody>`;
      for(const k of list){const have=k.st?fpDeliverable(P,k,srcs):deliverable(P,k.item,srcs),bo=k.st?fpBoughtAt(P,k.st,k.item):boughtOf(P,k.item);h+=`<tr><td>${chip(k.item,k.n,have)}${jobLine(k)}${k.car?`<span class="mass">for the carrier ${esc(k.carName||'')} to build fighters</span>`:''}${k.blk?`<span class="mass" style="color:var(--amber)">⚠ blockade run: this station is ${esc(k.why||'cut off')}</span>`:''}${bo?`<span class="mass">${bo} bought ${k.st?'here':'on a market'} don't count</span>`:''}</td><td class="r num">${fmt(k.reward)} cr</td><td class="r num">${Math.max(0,Math.round((k.until-S.T)/60))} min</td><td><div class="act"><button class="btn sm" data-act="deliver" data-arg="${k.id}" ${have>=jobMin(k)?'':'disabled'}>${have>=k.n?'Deliver':have>=jobMin(k)?'Deliver '+Math.min(have,k.n):'Deliver'}</button></div></td></tr>`}h+=`</tbody></table></div>`}
    if(blks.length){h+=`<div class="h3" style="margin-top:14px">⚠ Blockade runs${blks.some(k=>k.cont)?' and containment supply':''}</div><p class="note" style="margin:0 0 8px">These ${esc(FAC(P.faction).short)} stations are cut off, under siege${blks.some(k=>k.cont)?' or holding the line against the Bloom':''}. Bring the goods in person: anything you own counts, even goods bought on a market. Carrying them through hostile space nearby draws enemy interceptors.</p><div class="tblw"><table class="t"><thead><tr><th>Wanted</th><th>Where</th><th class="r">Reward</th><th class="r">Time left</th></tr></thead><tbody>`;
      for(const k of blks){const R2=S.stations[k.st],j=HOP[k.st][P.sector]||0;h+=`<tr><td>${chip(k.item,k.n,countIn(k.item,[P.cargo,P.vault]))}${jobLine(k)}</td><td>${esc(R2?R2.name:DEF[k.st].name)}<br><span class="mass" style="margin:0">${esc(DEF[k.st].name)} · ${j} jump${j===1?'':'s'} · ${esc(k.why||'')}</span></td><td class="r num">${fmt(k.reward)} cr</td><td class="r num">${Math.max(0,Math.round((k.until-S.T)/60))} min</td></tr>`}h+=`</tbody></table></div>`}
    if(reqs.length){h+=`<div class="h3" style="margin-top:14px">Freeport requests elsewhere</div><div class="tblw"><table class="t"><thead><tr><th>Wanted</th><th>Where</th><th class="r">Reward</th><th class="r">Time left</th><th></th></tr></thead><tbody>`;
      for(const k of reqs){const R=S.stations[k.st],b=fpBuyable(c,P,k);h+=`<tr><td>${chip(k.item,k.n,fpDeliverable(P,k,[P.cargo,P.vault]))}${jobLine(k)}${b?`<span class="mass">here: ${b.stock} in stock · ${fmt(b.pr)} cr each</span>`:''}</td><td>${esc(R?R.name:DEF[k.st].name)}<br><span class="mass" style="margin:0">${esc(DEF[k.st].name)} · ${HOP[k.st][P.sector]} jump${HOP[k.st][P.sector]===1?'':'s'}${covered(k.st)?'':' · unscouted'}</span></td><td class="r num">${fmt(k.reward)} cr</td><td class="r num">${Math.max(0,Math.round((k.until-S.T)/60))} min</td><td><div class="act">${b&&b.need>0?`<button class="btn sm" data-act="hbuy" data-arg="${k.id}" ${b.n>0?'':'disabled'} title="${b.n<b.need?'Limited by stock, hold space or credits':''}">Buy ${b.n||b.need} to hold · ${fmt(Math.round((b.n||b.need)*b.pr))} cr</button>`:''}<button class="btn sm" data-act="croute" data-arg="${k.st}">Set course</button></div></td></tr>`}h+=`</tbody></table></div><p class="note">Freeport requests are hauling runs: goods you buy at a faction market count, so buy here, carry them across the void and deliver in person. Goods bought at the freeport itself don't count there.</p>`}
return h}
function ordersHtml(c,P,srcs){const C=myCamp(),m=C&&C.mv,econ=m&&(m.kind==='mine'||m.kind==='haul');let h='';
  if(c.wallet&&c.wallet===P.faction&&S.plans&&S.plans[P.faction]){h+=`<div class="h3">Supply drive</div>`;h+=econ?campDockHtml(c,P,srcs):`<p class="note" style="margin:0 0 12px">No supply drive is open for ${esc(FAC(P.faction).short)} right now${m?`: command's current move is "${esc(m.title)}" (see Missions)`:''}. Mining and hauling drives appear here when command calls for them.</p>`}
  if(c.contracts){h+=`<div class="h3" style="margin-top:14px">Delivery contracts</div>`;h+=contractsHtml(c,P,srcs)}
  h+=resupHtml(P)+convoyHtml(c,P);return h}
function convoyHtml(c,P){if(!isHaulCls(P.cls)||c.owner!==P.faction)return'';const C=P.convoy;let h=`<div class="h3" style="margin-top:14px">Convoy</div>`;
  if(C)return h+`<p class="note" style="margin:0 0 8px">Running to <b>${esc(DEF[C.dest].name)}</b> · ${C.live?'escorts in flight':C.ships.length+' escorts ready to launch with you'} · ${C.jumps} jump${C.jumps===1?'':'s'} so far · ${fmtT(Math.max(0,C.until-S.T))} left. Dock at a friendly station there to finish.</p><div class="act"><button class="btn sm" data-act="convoyoff">Call it off</button></div>`;
  const ok=P.route&&P.route!==P.sector;return h+`<p class="note" style="margin:0 0 8px">Call a ${esc(FAC(P.faction).short)} escort wing for your run: two fighters (three if the route leaves friendly space) form up on you, jump with you, and go home when you dock at a friendly station in the destination. Other pilots who fly escort are paid ${CVY_PAY} cr for each jump into or out of hostile or unclaimed space. ${ok?`Course: <b>${esc(DEF[P.route].name)}</b>.`:'Set a course on the map first.'}</p><div class="act"><button class="btn sm" data-act="convoy" ${ok&&invMass(P.cargo)>=10?'':'disabled'}>Call a convoy</button></div>`}
function resupHtml(P){const L=(S.frigates||[]).filter(t=>isCar(t)&&t.side!=='brood'&&(t.side===P.faction||(t.side==='player'&&P===S.player))&&Object.keys(carNeed(t)).length);if(!L.length)return'';
  let h=`<div class="h3" style="margin-top:14px">Front-line resupply</div><p class="note" style="margin:0 0 8px">Fly these materials out and land on the carrier's flight deck: they unload straight into its store, so it can build fighters at once. Paid at the market rate from the treasury, times a front-line bonus (up to ×${RESUP_MAX}) when the carrier is outside friendly space, near hostiles or under fire: at home it only covers what the goods cost.</p>`;
  for(const t of L){const n=carNeed(t),fm=frontMul(t),j=HOP[P.sector][t.sector]||0,have=Object.keys(n).filter(k=>(P.cargo[k]||0)>0);h+=`<div class="opr"><div><b>${esc(t.name)}</b> · ${esc(DEF[t.sector].name)} (${j?j+' jump'+(j>1?'s':''):'here'})${fm>1.01?` · <b style="color:var(--amber)">front-line ×${fm.toFixed(1)}</b>`:''}<br><span>needs ${Object.keys(n).map(k=>`${n[k]} ${esc(ITEMS[k].name)}`).join(', ')}${have.length?` · <b style="color:var(--ok)">you're carrying ${have.map(k=>esc(ITEMS[k].name)).join(', ')}</b>`:''}</span></div></div>`}return h}
// Missions: the faction's combat and strategic work — the campaign strike, operations you can join, and beacons to flip
const BCN_MIS_N=3,BCN_MIS_PAY=80,BCN_MIS_T=900;
function bcnMissionsTick(){if(NET.cl||!S.beacons)return;S.bcnMis=S.bcnMis||{};
  for(const f of FAC_IDS){const L=(S.bcnMis[f]||[]).filter(m=>S.T<m.until&&S.beacons[m.sid]&&S.beacons[m.sid].owner!==f);
    if(L.length<BCN_MIS_N&&Math.random()<.5){const terr=territory(f),mv=S.plans&&S.plans[f]&&S.plans[f].mv,c=[];
      for(const sid in S.beacons){const B=S.beacons[sid];if(B.owner===f||L.some(m=>m.sid===sid))continue;if(!(terr.has(sid)||NEIGH[sid].some(n=>terr.has(n))))continue;
        let w=B.owner&&hostile(f,B.owner)?3:1.5;if(terr.has(sid))w*=1.6;if(mv&&(mv.sector===sid||mv.obj===sid))w*=3;c.push([sid,w])}
      if(c.length){const sid=wpickArr(c),B=S.beacons[sid];L.push({id:S.nextId++,sid,reward:Math.round(BCN_MIS_PAY*(B.owner?1.4:1)/10)*10,until:S.T+BCN_MIS_T,vs:B.owner||null});
        if(f===S.player.faction&&isScoutCls(S.player.cls))feed(`◆ ${FACTIONS[f].short} command: flip the beacon in ${DEF[sid].name} for a ${fmt(L[L.length-1].reward)} cr bounty (Jobs tab).`,'info')}}
    S.bcnMis[f]=L}}
function bcnMissionPay(sid,side,by){const L=S.bcnMis&&S.bcnMis[side];if(!L)return;const i=L.findIndex(m=>m.sid===sid);if(i<0)return;const m=L[i];L.splice(i,1);
  if(by){const got=payKey(by,side,Math.round(m.reward*(lvlOf(by)>=1?1.2:1)));keyFeed(by,`◆ Beacon mission complete: ${DEF[sid].name} flipped for ${FACTIONS[side].short}. Bounty +${fmt(got)} cr.`,'good');legBonus(by,side,'a beacon mission');weAdd(side,WE.bmission)}}
function missionsHtml(c,P,srcs){const f=P.faction,C=myCamp(),m=C&&C.mv,strike=m&&(m.kind==='take'||m.kind==='build');let h='';
  h+=`<div class="h3">Campaign</div>`;h+=strike?campDockHtml(c,P,srcs):`<p class="note" style="margin:0 0 12px">${esc(FACTIONS[f].name)} holds ${controlCounts()[f]||0} of ${VIC_NEED} systems needed. ${m?`Command's current move is a supply drive ("${esc(m.title)}", under Jobs); the next strike will be posted here.`:'Command is choosing its next move.'}</p>`;
  {const L=(C?sideOf(C):[]).filter(o=>o.stage==='active'),k=pkey();h+=`<div class="h3" style="margin-top:16px">Faction orders</div>`;
    h+=L.length?L.map(o=>`<div class="opr ${o.lane==='cmb'?'defend':'assist'}"><div><b>${esc(o.title)}</b><br><span>${esc(sideStat(o))} · ${fmtT(Math.max(0,o.until-S.T))} left · ${fmt(o.pay)} cr · suits ${esc(SIDE[o.kind].suit)}${o.acc.includes(k)?' · signed on':''}</span><br><span>${esc(sideHow(o))}</span></div><button class="btn" data-act="sideon" data-arg="${o.id}">${o.acc.includes(k)?'Set course':'Sign on'}</button></div>`).join('')
      :`<div class="empty">No other orders right now. With each campaign target command posts recon or beacon work and an interdiction, sabotage or screening order, and it answers attacks, capital ships and Brood pressure as they come.</div>`}
  const ops=friendlyOps();h+=`<div class="h3" style="margin-top:16px">Operations</div>`;
  h+=ops.length?ops.map((o,i)=>o.kind==='local'?'':`<div class="opr ${o.kind}"><div><b>${esc(o.label)}</b><br><span>${o.kind==='assist'?'Join the push':'Defend'} · ${o.hops?o.hops+' jump'+(o.hops>1?'s':''):'this system'}${o.eta?' · lands in '+o.eta+' s':o.ev.stage==='engaged'?' · fighting now':''}</span></div><button class="btn" data-act="opjoin" data-arg="${i}">${o.hops?'Set course':'Here'}</button></div>`).join(''):`<div class="empty">No strikes, convoys or attacks your side knows about right now.</div>`;
  {const cv=(S.traders||[]).filter(t=>t.kind==='haul'&&hostile(f,t.side)&&t.side!=='pirate'&&(HOP[P.sector][t.sector]||0)<=3&&(covered(t.sector)||(HOP[P.sector][t.sector]||0)<=1));h+=`<div class="h3" style="margin-top:16px">Convoy raids</div><p class="note" style="margin:0 0 8px">Enemy supply convoys moving within reach. Destroy the freighter to cut their logistics: Command pays the bounty, and half the hold spills as salvage.</p>`;
    h+=cv.length?`<div class="tblw"><table class="t"><thead><tr><th>Convoy</th><th>Now in</th><th>Bound for</th><th class="r">Bounty</th><th></th></tr></thead><tbody>${cv.map(t=>`<tr><td><b style="color:${sideCol(t.side)}">${esc(FACTIONS[t.side]?FACTIONS[t.side].short:'Brood')}</b> ${esc(t.why||'supplies')}<br><span class="mass" style="margin:0">${esc(haulWhat(t))}</span></td><td>${esc(DEF[t.sector].name)}${t.sector===P.sector?' (here)':''}</td><td>${esc(DEF[t.to].name)}</td><td class="r num">${fmt(raidBounty(t))} cr</td><td class="r">${t.sector===P.sector?'<span class="mass" style="margin:0">Here: launch</span>':`<button class="btn sm" data-act="cvint" data-arg="${t.id}">Intercept</button>`}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No enemy convoys spotted within reach.</div>`}
  {const me=P.pid||'me',cv=(S.traders||[]).filter(t=>t.kind==='haul'&&t.side===f&&cvLeft(t)>=1&&(HOP[P.sector][t.sector]||0)<=3);
    h+=`<div class="h3" style="margin-top:16px">Convoy escort</div><p class="note" style="margin:0 0 8px">Our supply convoys under way. Sign on and fly with one: each jump it makes with you in the system it leaves or enters counts. With you there it is far harder to catch out of sight, but raiders may try an ambush. Command pays when it docks, if you were with it for at least ${Math.round(ESC_CV.need*100)}% of the jumps left when you signed on.</p>`;
    h+=cv.length?`<div class="tblw"><table class="t"><thead><tr><th>Convoy</th><th>Now in</th><th>Bound for</th><th class="r">Jumps</th><th class="r">Pay</th><th></th></tr></thead><tbody>${cv.map(t=>{const E=t.esc,mine=E&&E.k===me;return`<tr><td>${esc(t.why||'supplies')}<br><span class="mass" style="margin:0">${esc(haulWhat(t))}</span></td><td>${esc(DEF[t.sector].name)}${t.sector===P.sector?' (here)':''}</td><td>${esc(DEF[t.to].name)}</td><td class="r num">${mine?`${E.hops}/${E.need}`:cvLeft(t)}</td><td class="r num">${fmt(cvPay(t,mine?Math.max(E.hops,E.need):Math.ceil(cvLeft(t)*ESC_CV.need)))} cr</td><td class="r">${mine?'<span class="mass" style="margin:0">Escorting</span>':E?`<span class="mass" style="margin:0">${esc(E.name||'Escorted')}</span>`:`<button class="btn" data-act="cvesc" data-arg="${t.id}">Escort</button>`}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">No friendly convoys under way within 3 jumps.</div>`}
  const L=(S.bcnMis&&S.bcnMis[f]||[]).filter(x=>S.T<x.until);h+=`<div class="h3" style="margin-top:16px">Beacon missions</div><p class="note" style="margin:0 0 8px">Command pays a bounty on top of the usual ${BCN_FLIP} cr flip bonus and ${BCN_RES} cr/min residual (for 10 minutes after your last flip or re-secure) for flipping these beacons. Fly a Scout or Advanced Scout and hold within ${BCN_R} m for ${BCN_T} s.${isScoutCls(P.cls)?'':' <b>You are not flying a scout.</b>'}</p>`;
  if(!L.length)h+=`<div class="empty">No beacon missions posted. Command posts new ones every few minutes.</div>`;
  else{h+=`<div class="tblw"><table class="t"><thead><tr><th>Beacon</th><th>Held by</th><th class="r">Jumps</th><th class="r">Bounty</th><th class="r">Time left</th><th></th></tr></thead><tbody>`;
    for(const x of L){const B=S.beacons[x.sid],j=HOP[P.sector][x.sid]||0;h+=`<tr><td><b>${esc(DEF[x.sid].name)}</b></td><td>${B&&B.owner?`<span style="color:${sideCol(B.owner)}">${esc(FACTIONS[B.owner].short)}</span>`:'unclaimed'}</td><td class="r num">${j||'here'}</td><td class="r num" style="color:var(--ok)">+${fmt(x.reward)} cr</td><td class="r num">${Math.max(0,Math.round((x.until-S.T)/60))} min</td><td><div class="act"><button class="btn sm" data-act="croute" data-arg="${x.sid}" ${x.sid===P.sector?'disabled':''}>Set course</button></div></td></tr>`}
    h+=`</tbody></table></div>`}
  return h}
function refitHtml(c,P,srcs){const F=fpOf(P.sector),rf=refitsOf(P);if(!F)return'';let h=`<p class="note" style="margin:0 0 12px">Freeport refits are fitted to the ship you're flying and stay with it (in the Hangar too). Credits only. Each freeport sells its own; none are sold anywhere else.</p><div class="tblw"><table class="t"><thead><tr><th>Refit</th><th>Cost</th><th></th></tr></thead><tbody>`;
  for(const k of F.refits){const R=REFITS[k],have=!!rf[k];h+=`<tr><td><b>${esc(R.name)}</b><br><span class="mass" style="margin:0">${esc(R.desc)}</span></td><td>${have?'<span class="mass" style="margin:0">fitted</span>':`<span class="req ${P.credits>=R.cr?'ok':'no'}">${fmt(R.cr)} cr</span>`}</td><td>${have?'':`<div class="act"><button class="btn sm" data-act="refit" data-arg="${k}" ${P.credits>=R.cr?'':'disabled'}>Fit</button></div>`}</td></tr>`}
  h+=`</tbody></table></div><p class="note">Other freeports: ${FREEPORTS.filter(x=>x.sid!==P.sector).map(x=>`${esc(S.stations[x.sid]?S.stations[x.sid].name:DEF[x.sid].name)} (${DEF[x.sid].name}) · ${x.refits.map(k=>REFITS[k].name).join(', ')}`).join(' — ')}.</p>`;return h}
function fpAct(act,arg,c,P,srcs){
  if(act==='dev'){const R=S.stations[P.sector];if(!R||R.owner!=='player'||!DEV[arg])return;if(devBuild(R,arg,[R.stock,P.vault,P.cargo]))dockErr=`✓ ${DEV_TXT[arg][0]} built (level ${devOf(R)[arg]}).`;else dockErr='Not enough materials, or no crew room: build more life support.';return true}
  if(act==='refit'){const F=fpOf(P.sector),R=REFITS[arg];if(!F||!R||!F.refits.includes(arg))return true;const rf=P.tune=P.tune||{};rf.rf=rf.rf||{};if(rf.rf[arg])return true;
    if(P.credits<R.cr){dockErr='Not enough credits.';return true}transfer('player','neutral',R.cr);rf.rf[arg]=1;if(!CTX)refreshPlayerStats();dockErr=`✓ ${R.name} fitted.`;return true}
  if(act==='croute'){if(DEF[arg]){P.route=arg;dockErr=`Course set to ${DEF[arg].name}. Launch and press J to fly it.`}return true}
  return false}

// ============================================================ faction campaigns
// Every faction runs a campaign toward holding VIC_NEED systems, one move at a time. For each system it means to gain it first
// prepares (mines a resource, or hauls supplies from home to the frontline station), then strikes (takes an outpost, besieges
// a depot) or expands (builds a depot). A prep that succeeds makes the strike bigger and better armed. Pilots of that faction
// see the next move on the HUD, press P to sign on, and help: deliver ore or consignments at the faction's docks (Jobs),
// or fly with the strike. Each move that succeeds pays the pilots who helped from the treasury; when the campaign reaches its
// goal and the faction wins the galaxy, every pilot who served it earns a victory bonus. The Brood and the Unbound have no campaign: they play for themselves.
const DOCTRINE={
  halcyon:{name:'Trade Charter',why:'buy the frontier with depots and relays',prep:['haul','haul','mine'],haul:'plate',mine:'cu',w:{build:1.7,relay:3,forge:1,yard:1.2,neutral:2.6,depot:.8,hub:2.2,deep:1,contested:1}},
  varkesh:{name:'Iron Advance',why:'push the line forward one siege at a time',prep:['haul','mine','haul'],haul:'wire',mine:'ir',w:{build:.7,relay:1,forge:2.2,yard:1.4,neutral:1.4,depot:2.2,hub:1.2,deep:1.3,contested:2.1}},
  ostrova:{name:'Lattice Ascendancy',why:'seize the crystal: forges and the deep fields',prep:['mine','mine','haul'],haul:'coil',mine:'xc',w:{build:1,relay:1,forge:4.8,yard:1,neutral:1.7,depot:1.3,hub:1,deep:3.5,contested:1}}};
const CAMP_PAY={take:900,build:700,mine:450,haul:550},CAMP_GOAL=3000,CAMP_HAUL_N={plate:16,wire:14,coil:6},CAMP_MINE_N={xc:24,ir:36,cu:48,fe:48};
function stN(sid){return S.stations[sid]?S.stations[sid].name:DEF[sid]?DEF[sid].name+' depot':'the depot'}
function pkey(){return NET.on?curPid():'me'}
function isMe(k){return k==='me'||(NET.on&&k===NET.me)}
function pSect(k){if(isMe(k))return S.player.sector;const P=S.pilots&&S.pilots[k];return P?P.sector:null}
function keyFeed(k,msg,kind){if(isMe(k))feed(msg,kind);else feedTo(k,msg,kind)}
function facFeed(f,msg,kind){if(NET.cl)return;if(S.player.faction===f)feed(msg,kind);if(NET.host)for(const pid in S.pilots||{})if(pid!==NET.me&&S.pilots[pid].faction===f)feedTo(pid,msg,kind)}
function payKey(k,f,n){return isMe(k)||!NET.on?transfer(f,'player',n):runAs(k,()=>transfer(f,'player',n))}
function campOf(f){S.plans=S.plans||{};return S.plans[f]||(S.plans[f]={f,mv:null,next:null,crew:{},paid:{},wins:0,fails:0,goal:null,gap:S.T+rnd(20,60),side:[],purge:{}})}
function myCamp(){return S.plans&&S.plans[S.player.faction]||null}
function nearestOwnStation(f,sid){let b=null,bh=99;for(const id in S.stations){const R=S.stations[id];if(R.owner!==f||R.kind==='hive')continue;const h=HOP[id][sid];if(h<bh){bh=h;b=id}}return b}
// systems one jump from the faction's territory that it could gain, weighted by its doctrine
function campTargets(f){const terr=territory(f),D=DOCTRINE[f],C=S.coal,out=[];
  for(const d of SECTOR_DEFS){if(d.kind==='void'||terr.has(d.id)||!NEIGH[d.id].some(n=>terr.has(n)))continue;
    const R=S.stations[d.id],oid=OUT_BY_SECTOR[d.id],o=oid?S.outposts[oid]:null,ow=sideNorm(sectorOwner(d.id));
    if(R&&(R.kind==='core'||R.kind==='hive'))continue;if(R&&!hostile(f,R.owner))continue;if(ow&&ow!==f&&ow!=='pirate'&&!hostile(f,ow))continue;
    let s;
    if(R)s={kind:'take',st:d.id,w:D.w.depot*(R.owner==='brood'?1.5:1)};
    else if(o&&sideNorm(o.owner)!==f&&!(d.home&&d.home!==f)&&(!o.owner||hostile(f,sideNorm(o.owner))||o.owner==='pirate'))s={kind:'take',out:oid,w:(o.owner?1.2:D.w.neutral)*(D.w[o.type]||1)};
    else if(canBuildIn(d.id,f)&&!S.events.some(e=>e.type==='build'&&e.sector===d.id))s={kind:'build',w:D.w.build};
    else continue;
    if(d.ores&&d.ores.nu&&(S.econ.stock[f].nu||0)<64)s.w*=1.8;
    if(d.kind==='deep')s.w*=D.w.deep;if(d.kind==='contested')s.w*=D.w.contested;if(d.kind==='hub')s.w*=D.w.hub;if(ow==='brood')s.w*=1.5;
    if(C&&C.mem.includes(f)&&ow===C.lead)s.w*=1+3*BAL.coal;
    if(frigatesIn(d.id).some(t=>sideNorm(t.side)===f))s.w*=1.5;if(frigatesIn(d.id).some(t=>hostile(f,t.side)))s.w*=.5;{const Pp=S.plans&&S.plans[f];if(Pp&&Pp.purge&&Pp.purge[d.id]>S.T)s.w*=3}
    out.push({...s,sid:d.id})}
  return out}
function campTitle(m){const nm=DEF[m.sector]?DEF[m.sector].name:'?';
  if(m.kind==='take')return m.st?`Besiege ${S.stations[m.st]?S.stations[m.st].name:m.stName||'the depot'} in ${nm}`:`Take ${S.outposts[m.out].name} in ${nm}`;
  if(m.kind==='build')return`Build a depot in ${nm}`;
  if(m.kind==='mine')return`Mine ${m.need} ${ITEMS[m.item].name} for the push on ${DEF[m.obj].name}`;
  return`Haul ${m.need} ${ITEMS[m.item].name}: ${stN(m.from)} → ${stN(m.to)}`}
function mkMove(f,o){const m={id:S.nextId++,f,stage:'brief',T0:S.T,brief:S.T+(o.kind==='take'||o.kind==='build'?45:30),prog:0,acc:[],help:{},cons:{},tries:0,...o};if(m.st)m.stName=S.stations[m.st].name;m.title=campTitle(m);return m}
function campPrep(f,pk,P){const D=DOCTRINE[f];let kind=P&&P.lastPrep==='haul'?'mine':P&&P.lastPrep==='mine'?'haul':pick(D.prep);const front=nearestOwnStation(f,pk.sid),home=FAC_HOME(f),from=S.stations[home]&&S.stations[home].owner===f?home:null;
  if(kind==='haul'&&(!from||!front||front===from))kind='mine';
  if(kind==='haul'){const item=f==='halcyon'&&pk.kind==='build'?'plate':D.haul;return mkMove(f,{kind:'haul',item,need:CAMP_HAUL_N[item]||10,from,to:front,sector:front,obj:pk.sid,dur:420})}
  return mkMove(f,{kind:'mine',item:D.mine,need:CAMP_MINE_N[D.mine]||36,sector:home,obj:pk.sid,dur:360})}
function campStrike(f,pk){return mkMove(f,{kind:pk.kind,sector:pk.sid,st:pk.st||null,out:pk.out||null,obj:pk.sid})}
function campValid(f,pk){if(!pk)return false;return campTargets(f).some(t=>t.sid===pk.sid&&t.kind===pk.kind&&(t.st||null)===(pk.st||null)&&(t.out||null)===(pk.out||null))}
function campDone(m){if(m.kind==='take')return m.st?!S.stations[m.st]||sideNorm(S.stations[m.st].owner)===m.f:sideNorm(S.outposts[m.out].owner)===m.f;if(m.kind==='build'){const R=S.stations[m.sector];return!!R&&sideNorm(R.owner)===m.f}return m.prog>=m.need}
function campNew(f,P){let m=null;
  if(P.next&&campValid(f,P.next)){m=campStrike(f,P.next);m.boost=P.boost||0}
  else{campResBack(f,P);const tg=campTargets(f);if(!tg.length)return null;const pk=wpickArr(tg.map(t=>[t,t.w]));P.next=pk;P.boost=0;m=campPrep(f,pk,P);P.lastPrep=m.kind;sideChain(f,P,pk,m)}
  if(m.kind==='take'||m.kind==='build')P.next=null;
  const n=controlCounts()[f]||0,D=DOCTRINE[f];
  facFeed(f,`📋 ${FACTIONS[f].short} command · ${D.name} (${n}/${VIC_NEED} systems). Next move: ${m.title}. ${m.kind==='mine'||m.kind==='haul'?'Supply drive opens':'Strike group forms'} in ${Math.round(m.brief-S.T)} s. Press P to sign on.`,'info');
  {const ch=sideOf(P).filter(o=>o.chain&&o.stage==='active'&&o.T0===S.T);if(ch.length)facFeed(f,`Alongside it: ${ch.map(o=>o.title).join('; ')}. Each one done sends the strike in with 2 more ships. Shift+P picks an order.`,'info')}
  if(!NET.on&&S.player.faction!==f&&covered(m.sector)){m.intel=1;feed(`Intel (${covSource(m.sector)}): ${FACTIONS[f].short} is preparing to ${m.title.charAt(0).toLowerCase()+m.title.slice(1)}.`,'news')}
  return m}
// launch the strike: a strike group against the outpost or depot, or a constructor convoy, built from the faction's own stores
function campOffensive(f,m,mn){const isSt=!!m.st,Rr=isSt?S.stations[m.st]:null,o=isSt?null:S.outposts[m.out];if(isSt?!Rr||!hostile(f,Rr.owner):o.owner===f)return'gone';
  const lvl=isSt?2:o.level,owner=isSt?Rr.owner:o.owner,bonus=Math.min(6,2*(m.boost||0)),n=clamp(4+lvl+ri(0,1)+bonus,4,11),tier=factionTier(f),force={},srcs=[campOf(f).res||(campOf(f).res={}),S.econ.fleet[f],S.econ.stock[f]],cls=[];let got=0;
  const nb=isSt?Math.max(3,Math.floor(n/2)):owner?Math.max(1,Math.floor(n/3)):0;
  for(let i=0;i<n;i++){let cl=i<nb?bmbPick(f,i,'patrol',tier,srcs):pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(!haveIn(ld,srcs)){cl='striker';ld=loadout('patrol',tier,cl)}if(takeFrom(ld,srcs)){inv.addAll(force,ld);cls.push(cl);got++}else break}
  if(got<(mn||4)){inv.addAll(campOf(f).res,force);return null}
  if(isSt&&m.boost){const t=inv.take(S.econ.stock[f],'torpedo',6);if(t)inv.add(force,'torpedo',t)}
  const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:m.out,st:isSt?m.st:undefined,stName:isSt?Rr.name:o.name,sector:m.sector,eta:S.T+70,force,n:got,tier,cls,stage:'inbound',camp:m.id};if(isSt)siegeLoads(ev,srcs);
  S.events.push(ev);announce(ev);return ev}
function campBuild(f,m,mn){const sid=m.sector;if(!canBuildIn(sid,f))return'gone';if(S.events.some(e=>e.type==='build'&&e.sector===sid))return null;
  const st=S.econ.stock[f],R=campOf(f).res||(campOf(f).res={}),srcs=[R,S.econ.fleet[f],st];if(!haveIn(FWD_COST,[R,st])||!haveIn(CONSTR_LD,srcs))return null;
  const force={};takeFrom(FWD_COST,[R,st]);inv.addAll(force,FWD_COST);takeFrom(CONSTR_LD,srcs);inv.addAll(force,CONSTR_LD);
  const tier=factionTier(f),cls=[];for(let i=0;i<3+Math.min(3,m.boost||0);i++){const cl=pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(takeFrom(ld,srcs)){inv.addAll(force,ld);cls.push(cl)}}
  if(cls.length<CR_ESC_MIN){inv.addAll(R,force);return null}   // never without an escort
  const ev={id:S.nextId++,type:'build',att:f,sector:sid,eta:S.T+80,stage:'inbound',force,n:cls.length,tier,cls,site:stationSite(sid),prog:0,camp:m.id};S.events.push(ev);announce(ev);return ev}
// the faction holds its other attacks and constructor convoys while its campaign strike forms and flies (CAMP_SAVE would also
// hold them for the end of the supply drive before it: 0 measured best in the faction war)
let CAMP_SAVE=0,CAMP_MN=3,CAMP_RES_K=.35;
function campBusy(f){const P=S.plans&&S.plans[f],m=P&&P.mv;if(!m)return false;if(m.kind==='take'||m.kind==='build')return m.stage==='active'||m.stage==='brief';return m.stage==='active'&&!!P.next&&S.T>m.until-CAMP_SAVE}
// run every strategic tick (10 s) on the host
function campTick(){if(NET.cl||S.T<100)return;S.plans=S.plans||{};
  for(const f of FAC_IDS){const P=campOf(f);let m=P.mv;campRes(f,P);
    if(!m){if(S.T<P.gap)continue;m=P.mv=campNew(f,P);if(!m){P.gap=S.T+60;continue}}
    if(m.stage==='brief'){if(S.T<m.brief)continue;
      if(m.kind==='mine'||m.kind==='haul'){m.stage='active';m.until=S.T+m.dur;m.ai=rnd(.7,1.3);facFeed(f,`${FACTIONS[f].short} supply drive open: ${m.title}. ${Math.round(m.dur/60)} minutes. Deliver at ${m.kind==='haul'?stN(m.to):'any '+FACTIONS[f].short+' station'} (Jobs).${m.kind==='mine'&&oreField(m.item,m.sector,f)?` Good ${ITEMS[m.item].name} rocks in ${DEF[oreField(m.item,m.sector,f)].name}.`:''} Press P to sign on.`,'info');continue}
      if(campDone(m)){campEnd(f,P,true);continue}
      m.boost=Math.max(m.boost||0,P.boost||0);const mn=Math.max(2,CAMP_MN-m.acc.length),ev=m.kind==='take'?campOffensive(f,m,mn):campBuild(f,m,mn);   // each pilot signed on stands in for a ship
      if(ev==='gone'){campEnd(f,P,campDone(m),'the target changed hands');continue}
      if(!ev){if(++m.tries>8){campEnd(f,P,false,'the stores could not field it');continue}m.brief=S.T+30;continue}
      m.stage='active';m.evId=ev.id;m.until=S.T+600;
      if(m.acc.length){let far=0;for(const k of m.acc){const s=pSect(k);if(s)far=Math.max(far,HOP[m.sector][s])}ev.hold=S.T+Math.min(220,40*far+60)}
      facFeed(f,`${FACTIONS[f].short} ${m.kind==='take'?`strike group (${ev.n} ships${m.boost?', reinforced':''})`:'constructor convoy'} is under way: ${m.title}. ${m.acc.length?'It will hold at the gate for the pilots who signed on.':'Press P to sign on and join it.'}`,'info');continue}
    // active
    if(m.kind==='haul'&&[m.from,m.to].some(id=>!S.stations[id]||S.stations[id].owner!==f)){campEnd(f,P,false,'one of the stations changed hands');continue}
    if(m.kind==='mine'||m.kind==='haul'){m.prog=Math.min(m.need,m.prog+m.need/(m.dur/10)*m.ai*rnd(.6,1.4));
      if(m.prog>=m.need){campEnd(f,P,true);continue}if(S.T>=m.until){campEnd(f,P,false,'the drive fell short');continue}continue}
    const ev=S.events.find(e=>e.id===m.evId);
    if(ev){for(const k of m.acc)if(pSect(k)===m.sector&&(ev.stage==='engaged'||ev.stage==='building'||ev.eta-S.T<25))m.help[k]=(m.help[k]||0)+10;
      if(S.T<m.until)continue}
    campEnd(f,P,campDone(m),ev?'it ran out of time':m.kind==='take'?'the assault was broken':'the convoy was lost')}
  for(const f of FAC_IDS)sideTick(f,campOf(f));
  campGoal()}
function campEnd(f,P,ok,why){const m=P.mv;P.mv=null;if(m.kind==='take'||m.kind==='build')campResBack(f,P);P.gap=S.T+rnd(20,40);if(ok)P.wins++;else P.fails++;
  if(m.kind==='mine'||m.kind==='haul')P.boost=(P.boost||0)+(ok?1:0);
  const keys=Object.keys(m.help).filter(k=>m.help[k]>0),tot=keys.reduce((a,k)=>a+m.help[k],0);
  facFeed(f,ok?`✓ ${FACTIONS[f].short} command: "${m.title}" succeeded.${m.kind==='mine'||m.kind==='haul'?` The strike on ${DEF[m.obj].name} will go in reinforced.`:''}`:`✗ ${FACTIONS[f].short} command: "${m.title}" failed${why?': '+why:''}.${m.kind==='mine'||m.kind==='haul'?' The strike goes ahead without the extra supplies.':''}`,ok?'good':'warn');
  for(const k in m.cons||{}){const c=m.cons[k];if(c>0){const add=R=>{R.bought=R.bought||{};R.bought[m.item]=(R.bought[m.item]||0)+c};if(isMe(k)||!NET.on)add(S.player);else if(S.pilots&&S.pilots[k])add(S.pilots[k])}}
  for(const k of keys){P.crew[k]=(P.crew[k]||0)+1;if(!ok)continue;const n=Math.round(CAMP_PAY[m.kind]*Math.max(.4,m.help[k]/tot)*(lvlOf(k)>=7?1.15:1)),got=payKey(k,f,n);
    keyFeed(k,`★ Campaign bonus for your part in "${m.title}": +${fmt(got)} cr from the ${FACTIONS[f].short} treasury.`,'good');if(isMe(k))SFX.count(true);legBonus(k,f,'a campaign move');weAdd(f,WE.camp)}}
// the goal: hold VIC_NEED systems. Every pilot who served the campaign (helped at least one move) is paid once.
function campGoal(){const n=controlCounts();for(const f of FAC_IDS){const P=campOf(f),have=n[f]||0;
    if(have<VIC_NEED){if(P.goal&&have<=VIC_NEED-2)P.goal=null;continue}if(P.goal)continue;P.goal=S.T;
    facFeed(f,`★★ ${FACTIONS[f].name} holds ${have} systems: the ${DOCTRINE[f].name} has reached its goal. Hold them ${Math.round(WIN_TIME/60)} minutes to win the galaxy${Object.keys(P.crew).length?'; every pilot who served the campaign earns a victory bonus when it does':''}.`,'good')}}
// the victory bonus: when a faction wins the galaxy, every pilot who served its campaign earns it. This galaxy ends there,
// so it waits in the legacy record and is paid into the pilot's starting vault in their next galaxy.
const VIC_BONUS={cr:CAMP_GOAL,items:{lattice:2,core:1}};
function vicServed(k,side){return FAC_IDS.includes(side)&&!!(S.plans&&S.plans[side]&&S.plans[side].crew[k]>0)}
function vicLine(side){return`★★ Victory bonus for serving the ${DOCTRINE[side].name}: ${fmt(VIC_BONUS.cr)} cr, ${VIC_BONUS.items.lattice} Crystal Lattice and ${VIC_BONUS.items.core} Resonance Core. They're waiting in your vault in the next galaxy.`}
function vicBank(side){try{const lg=loadLegacy();lg.vb={cr:(lg.vb&&lg.vb.cr||0)+VIC_BONUS.cr,items:{...VIC_BONUS.items},side};localStorage.setItem('driftgate.legacy',JSON.stringify(lg))}catch(e){}const el=$('winV');if(el){el.textContent=vicLine(side);el.hidden=false}}
// ---- the pilot's side: sign on (P), set a course, deliver at the docks
// ---- strategy orders: beside its supply drive, command posts an intel and a combat order for the same target, and answers threats
// as they come (a counter-attack when its ground is hit, a hunt for an enemy capital ship nearby, a Brood purge). Each order succeeds
// on what pilots do and, without them, more slowly on the faction's own ships. A prep order done sends the strike in with 2 more ships.
const SIDE={recon:{lane:'intel',pay:320,need:30,suit:'Scout'},beacon:{lane:'intel',pay:300,suit:'Scout'},interdict:{lane:'cmb',pay:520,need:2,suit:'Fighter'},sabotage:{lane:'cmb',pay:560,need:30,suit:'Bomber'},
  screen:{lane:'cmb',pay:420,need:90,suit:'Fighter'},counter:{lane:'cmb',pay:700,suit:'Any combat ship'},hunt:{lane:'cmb',pay:1200,suit:'Bomber wing'},purge:{lane:'cmb',pay:520,need:5,suit:'Fighter'}};
const SIDE_W={halcyon:{recon:1,beacon:2,interdict:1,sabotage:.5,screen:2},varkesh:{recon:2,beacon:1,interdict:2,sabotage:2,screen:1},ostrova:{recon:2,beacon:1.5,interdict:1.5,sabotage:1,screen:1}};
const SIDE_MAX=4;let SIDE_AI=1;
function sideOf(P){return P.side||(P.side=[])}
function sideTgt(o){return o.st?S.stations[o.st]:o.out?S.outposts[o.out]:null}
function sideTgtName(o){const T=sideTgt(o);return T?T.name:o.tgtName||DEF[o.sector].name}
function sideHp(T){if(!T)return 1;if(T.hMax)return clamp(T.hull/T.hMax,0,1);if(T.level!=null)return clamp(T.hull/oStats(T).hMax,0,1);return 1}
function sideTitle(o){const sn=DEF[o.sector]?DEF[o.sector].name:'?';
  switch(o.kind){case'recon':return o.st||o.out?`Recon: scout ${sideTgtName(o)} in ${sn}`:`Recon: survey the build site in ${sn}`;
    case'beacon':return`Beacon push: hold ${o.need===1?'the beacon':'both beacons'} at ${o.sids.map(x=>DEF[x].name).join(' and ')}`;
    case'interdict':return`Interdiction: destroy ${o.need} ${FACTIONS[o.vs].short} supply freighters`;
    case'sabotage':return`Sabotage: knock ${o.need}% off ${sideTgtName(o)}'s hull`;
    case'screen':return`Screen the gate: hold ${sn} for the strike on ${DEF[o.obj].name}`;
    case'counter':return`Counter-attack: break the ${sideAdj(o.att)} strike on ${o.tgtName}`;
    case'hunt':return`Capital hunt: destroy the ${sideAdj(o.vs)} ${o.capN} ${o.tokName}`;
    case'purge':return`Brood purge: destroy ${o.need} Brood ships in ${sn}`}return o.kind}
function sideHow(o){const sn=DEF[o.sector]?DEF[o.sector].name:'?',F=FACTIONS[o.f].short;
  switch(o.kind){case'recon':return o.st||o.out?`Fly to ${sn} and hold within 2 km of ${sideTgtName(o)}: 30 s on station between you all does it.`:`Fly to ${sn} and hold in the system: 30 s on station between you all does it.`;
    case'beacon':return`Flip and hold the beacons at ${o.sids.map(x=>DEF[x].name).join(' and ')} (a Scout, within ${BCN_R} m for ${BCN_T} s). Done when ${F} holds ${o.need===1?'it':'both'}.`;
    case'interdict':return`Destroy ${o.need} ${FACTIONS[o.vs].short} supply freighters, anywhere (Jobs → Convoy raids lists them). Each pays its raid bounty too.`;
    case'sabotage':return`Fly to ${sn} and knock ${o.need}% off ${sideTgtName(o)}'s hull. Bombers and torpedoes do it fastest.`;
    case'screen':return`Fly to ${sn} and hold there: 90 s of pilot time in the system does it.`;
    case'counter':return`Fly to ${sn} and fight when the ${sideAdj(o.att)} strike lands. Done if ${o.tgtName} holds.`;
    case'hunt':return`Find the ${o.capN} ${o.tokName} (now in ${sn}) and help destroy it. Time in its system counts as your part.`;
    case'purge':return`Fly to ${sn} and destroy ${o.need} Brood ships there. Done, it opens the system to the campaign.`}return''}
function sideStat(o){const p=Math.floor(o.prog||0);
  switch(o.kind){case'recon':return`${Math.min(o.need,p)}/${o.need} s on station`;case'beacon':return`${p}/${o.need} beacon${o.need>1?'s':''} held`;case'interdict':return`${Math.min(o.need,p)}/${o.need} freighters`;
    case'sabotage':return`${Math.min(o.need,p)}/${o.need}% hull`;case'screen':return`${Math.min(o.need,p)}/${o.need} s held`;case'purge':return`${Math.min(o.need,p)}/${o.need} Brood`;
    case'counter':{const ev=S.events.find(e=>e.id===o.evId);return ev?(ev.stage==='inbound'?`lands in ${Math.max(0,Math.round(ev.eta-S.T))} s`:'fighting now'):'resolving'}
    case'hunt':return`in ${DEF[o.sector].name}`}return''}
function sideNew(f,P,kind,o,quiet){const D=SIDE[kind],x={id:S.nextId++,f,kind,lane:D.lane,stage:'active',T0:S.T,prog:0,need:D.need||1,acc:[],help:{},pay:D.pay,ai:rnd(.6,1.3),...o};x.title=sideTitle(x);sideOf(P).push(x);
  if(!quiet)facFeed(f,`📋 ${FACTIONS[f].short} command: ${x.title}. ${fmt(x.pay)} cr to the pilots who do it. Shift+P picks it, P signs on.`,'info');return x}
// a new campaign target: an intel order and a combat order beside the supply drive, closing when it does
function sideChain(f,P,pk,m){const L=sideOf(P);for(const o of L)if(o.chain&&o.stage==='active'){o.stage='lost';o.end=S.T}
  const until=m.brief+(m.dur||360),W0=SIDE_W[f]||{},T=pk.st?S.stations[pk.st]:pk.out?S.outposts[pk.out]:null,ow=T&&T.owner?sideNorm(T.owner):null,base={chain:1,obj:pk.sid,st:pk.st||null,out:pk.out||null,tgtName:T?T.name:null,until};
  const bs=[pk.sid,...NEIGH[pk.sid]].filter(x=>S.beacons&&S.beacons[x]&&DEF[x].kind!=='void').slice(0,2),ic=[['recon',W0.recon||1]];if(bs.length&&bs.some(x=>S.beacons[x].owner!==f))ic.push(['beacon',W0.beacon||1]);
  if(wpickArr(ic)==='beacon')sideNew(f,P,'beacon',{...base,sector:pk.sid,sids:bs,need:bs.length},1);else sideNew(f,P,'recon',{...base,sector:pk.sid},1);
  const terr=territory(f),home=FAC_HOME(f),gate=NEIGH[pk.sid].filter(n=>terr.has(n)).sort((a,b)=>HOP[a][home]-HOP[b][home])[0]||pk.sid,cc=[['screen',W0.screen||1]];
  if(ow&&FAC_IDS.includes(ow)&&hostile(f,ow))cc.push(['interdict',W0.interdict||1]);if(T&&ow&&hostile(f,ow)&&pk.kind==='take')cc.push(['sabotage',W0.sabotage||1]);
  const ck=wpickArr(cc);if(ck==='screen')sideNew(f,P,'screen',{...base,sector:gate},1);else if(ck==='interdict')sideNew(f,P,'interdict',{...base,sector:pk.sid,vs:ow},1);else sideNew(f,P,'sabotage',{...base,sector:pk.sid,hp0:sideHp(T)},1)}
// pilots of a side in flight: [key, sector, ship] (the ship only where its system is live)
function sidePilots(f){const out=[];if(!NET.cl&&!S.unb&&S.player.faction===f&&!S.player.docked&&W&&W.player&&W.player.alive&&W.sid===S.player.sector)out.push([pkey(),S.player.sector,W.player]);
  if(NET.host)for(const pid in S.pilots||{}){const R=S.pilots[pid];if(pid===NET.me||R.faction!==f||R.docked)continue;const e=MP.rp&&MP.rp[pid];out.push([pid,R.sector,e&&e.alive?e:null])}return out}
function sideHelp(o,k,n){if(!o.acc.includes(k))o.acc.push(k);o.help[k]=(o.help[k]||0)+n}
function sideAccept(k,o){if(o.acc.includes(k))return false;o.acc.push(k);o.help[k]=o.help[k]||0;keyFeed(k,`Signed on: ${o.title}. ${sideHow(o)}`,'good');return true}
function sideTick(f,P){const L=sideOf(P),T=S.T,pl=sidePilots(f);
  const act=()=>L.filter(o=>o.stage==='active');
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='counter')){const ev=S.events.find(e=>e.type==='offensive'&&e.stage==='inbound'&&e.att!==f&&hostile(f,e.att)&&sideNorm(evOwner(e))===f&&e.eta-T>15);
    if(ev)sideNew(f,P,'counter',{sector:ev.sector,evId:ev.id,att:ev.att,st:ev.st||null,out:ev.target||null,tgtName:evName(ev),until:ev.eta+420})}
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='hunt')&&Math.random()<.35){const th=capThreats(f)[0];if(th&&!L.some(o=>o.kind==='hunt'&&o.tok===th.t.id))sideNew(f,P,'hunt',{sector:th.t.sector,tok:th.t.id,tokName:th.t.name,vs:th.t.side,capN:th.t.side==='brood'?broodCap(th.t):capName(th.t),until:T+720})}
  if(act().length<SIDE_MAX&&!act().some(o=>o.kind==='purge')&&Math.random()<.06){const terr=territory(f),c=[];for(const d of SECTOR_DEFS){if(terr.has(d.id)||!NEIGH[d.id].some(n=>terr.has(n)))continue;if(sideNorm(sectorOwner(d.id))==='brood')c.push(d.id)}if(c.length)sideNew(f,P,'purge',{sector:pick(c),until:T+600})}
  for(const o of L){if(o.stage!=='active')continue;const dur=Math.max(60,o.until-o.T0),abs=()=>{o.abs=(o.abs||0)+o.need/(dur/10)*o.ai*rnd(.6,1.4)*SIDE_AI},here=pl.filter(x=>x[1]===o.sector);
    if(o.kind==='recon'){abs();const w=WORLDS[o.sector],E=w&&(o.st?w.stationEnt:o.out?w.outpostEnt:null);for(const[k,,e]of here)if(e&&(!E||d3(e,E)<2000)){o.real=(o.real||0)+10;sideHelp(o,k,10)}o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='screen'){abs();for(const[k,,e]of here)if(e){o.real=(o.real||0)+10;sideHelp(o,k,10)}o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='interdict'||o.kind==='purge'){abs();o.prog=(o.abs||0)+(o.real||0)}
    else if(o.kind==='sabotage'){abs();const Tg=sideTgt(o);if(!Tg||sideNorm(Tg.owner)===f){sideEnd(f,P,o,false,'the target changed hands');continue}
      if(WORLDS[o.sector]){const d=Math.round(((o.hp0||1)-sideHp(Tg))*100);if(d>(o.dmg||0)){const g=d-(o.dmg||0);o.dmg=d;for(const[k,,e]of here)if(e)sideHelp(o,k,g)}}o.prog=Math.max(o.abs||0,o.dmg||0)}
    else if(o.kind==='beacon'){if(Math.random()<.05*o.ai*SIDE_AI){const nx=o.sids.find(x=>S.beacons[x]&&S.beacons[x].owner!==f);if(nx&&!WORLDS[nx])beaconFlip(nx,f,null)}o.prog=o.sids.filter(x=>S.beacons[x]&&S.beacons[x].owner===f).length}
    else if(o.kind==='counter'){const ev=S.events.find(e=>e.id===o.evId);if(ev&&T>=ev.eta-20)for(const[k,,e]of here)if(e)sideHelp(o,k,10);
      if(!ev||ev.stage==='done'){const ow=o.st?(S.stations[o.st]||{}).owner:o.out?S.outposts[o.out].owner:null;sideEnd(f,P,o,sideNorm(ow)===f,'the target fell');continue}}
    else if(o.kind==='hunt'){const t=(S.frigates||[]).find(x=>x.id===o.tok);if(!t||t.hull<=0){sideEnd(f,P,o,true);continue}o.sector=t.sector;for(const[k,,e]of pl.filter(x=>x[1]===t.sector))if(e)sideHelp(o,k,10)}
    if(o.kind!=='counter'&&o.kind!=='hunt'&&o.prog>=o.need){sideEnd(f,P,o,true);continue}
    if(T>=o.until)sideEnd(f,P,o,false,o.kind==='hunt'?'it got away':o.kind==='counter'?'it ran out of time':'time ran out')}
  P.side=L.filter(o=>o.stage==='active'||T-(o.end||0)<60)}
function sideEnd(f,P,o,ok,why){o.stage=ok?'won':'lost';o.end=S.T;
  const forTgt=o.chain&&((P.next&&P.next.sid===o.obj)||(P.mv&&P.mv.obj===o.obj&&(P.mv.stage==='brief'||P.mv.kind==='mine'||P.mv.kind==='haul')));
  if(ok&&forTgt)P.boost=(P.boost||0)+1;if(ok&&o.kind==='purge'){P.purge=P.purge||{};P.purge[o.sector]=S.T+900}
  facFeed(f,ok?`✓ ${FACTIONS[f].short} command: "${o.title}" done.${forTgt?` The strike on ${DEF[o.obj].name} goes in with 2 more ships.`:o.kind==='purge'?` ${DEF[o.sector].name} is open for the campaign.`:''}`:`✗ ${FACTIONS[f].short} command: "${o.title}" failed${why?': '+why:''}.`,ok?'good':'warn');
  if(!ok)return;const keys=Object.keys(o.help).filter(k=>o.help[k]>0),tot=keys.reduce((a,k)=>a+o.help[k],0);
  for(const k of keys){P.crew[k]=(P.crew[k]||0)+1;const n=Math.round(o.pay*Math.max(.4,o.help[k]/tot)),got=payKey(k,f,n);keyFeed(k,`★ Order bonus for "${o.title}": +${fmt(got)} cr from the ${FACTIONS[f].short} treasury.`,'good');if(isMe(k))SFX.count(true);weAdd(f,WE.camp*.5)}}
// kills that count: supply freighters for an interdiction, Brood ships for a purge, a share of a hunted capital ship
function sideKill(e,sh,killer){const ks=Object.keys(sh);if(!ks.length&&killer)ks.push(killer);
  for(const k of ks){const f=isMe(k)?S.player.faction:S.pilots&&S.pilots[k]&&S.pilots[k].faction;if(!FACTIONS[f]||!S.plans||!S.plans[f])continue;const x=sh[k]||1;
    for(const o of sideOf(S.plans[f])){if(o.stage!=='active')continue;
      if(o.kind==='interdict'&&e.role==='trader'&&e.tradeT&&e.tradeT.kind==='haul'&&sideNorm(e.side)===o.vs){o.real=(o.real||0)+x;sideHelp(o,k,10*x)}
      else if(o.kind==='purge'&&e.side==='brood'&&e.role!=='drone'&&W&&W.sid===o.sector){o.real=(o.real||0)+x;sideHelp(o,k,10*x)}
      else if(o.kind==='hunt'&&e.role==='frigate'&&e.tok&&e.tok.id===o.tok)sideHelp(o,k,40*x)}}}
function sideBcn(sid,side,by){if(!by||!S.plans||!S.plans[side])return;for(const o of sideOf(S.plans[side]))if(o.stage==='active'&&o.kind==='beacon'&&o.sids.includes(sid))sideHelp(o,by,10)}
// signing on from the orders card or the Jobs tab
function sideTake(o){const k=pkey();if(!o.acc.includes(k)){if(NET.cl){netSend({t:'plan',id:o.id});o.acc.push(k);feed(`Signed on: ${o.title}. ${sideHow(o)}`,'good')}else sideAccept(k,o);SFX.count(true)}sideCourse(o)}
function sideCourse(o){const P=S.player;let to=o.sector;
  if(o.kind==='interdict'){const t=(S.traders||[]).filter(t=>t.kind==='haul'&&sideNorm(t.side)===o.vs).sort((a,b)=>HOP[P.sector][a.sector]-HOP[P.sector][b.sector])[0];if(t)to=t.sector}
  if(!to)return;if(to===P.sector){flash(o.kind==='interdict'?'An enemy supply freighter is in this system: find it (T or Q).':'You are in the system for this order.');return}
  P.route=to;if(W&&!P.docked){apOn=true;const g=routeNext();if(g)W.tgt={kind:'gate',ref:g};flash(`Course set to ${DEF[to].name}. Autopilot on: steer to take back control.`)}else flash(`Course set to ${DEF[to].name}. Undock and press J to fly it.`)}
function campRes(f,P){P.res=P.res||{};const pk=P.next,m=P.mv;if(!pk||!m||!(m.kind==='mine'||m.kind==='haul'))return;const st=S.econ.stock[f],ld=loadout('patrol',factionTier(f),'striker'),want={};
  for(const k in ld)want[k]=ld[k]*(pk.kind==='build'?2:4);if(pk.kind==='build'){for(const k in FWD_COST)want[k]=(want[k]||0)+FWD_COST[k];for(const k in CONSTR_LD)want[k]=(want[k]||0)+CONSTR_LD[k]}
  for(const k in want){const need=want[k]-(P.res[k]||0);if(need<=0)continue;const n=Math.min(need,Math.floor((st[k]||0)*CAMP_RES_K));if(n>0)inv.add(P.res,k,inv.take(st,k,n))}}
function campResBack(f,P){if(P.res&&Object.keys(P.res).length){inv.addAll(S.econ.stock[f],P.res);P.res={}}}
function campAccept(k,m){if(m.acc.includes(k))return false;m.acc.push(k);m.help[k]=m.help[k]||0;
  const ev=m.evId&&S.events.find(e=>e.id===m.evId);if(ev&&ev.stage==='inbound'){const s=pSect(k);ev.hold=Math.max(ev.hold||0,S.T+Math.min(220,40*(s?HOP[m.sector][s]:2)+60))}
  keyFeed(k,`Signed on: ${m.title}. ${campHow(m)}`,'good');return true}
function oreField(item,from,f){let best=null,bs=1e9;for(const d of SECTOR_DEFS){if(d.kind==='hive'||d.kind==='void')continue;const sc=S.sectors[d.id];if(!sc)continue;let n=0;for(const a of sc.ast)n+=a.ore[item]||0;if(n<30)continue;
    const ow=sideNorm(sectorOwner(d.id)),h=(HOP[d.id][from]||0)+(ow&&f&&ow!==f&&hostile(f,ow)?2.5:0)-Math.min(.9,n/600);if(h<bs){bs=h;best=d.id}}return best}
function fieldHint(m,from){const id=oreField(m.item,from,m.f);if(!id)return'';const h=HOP[id][from]||0;return` Nearest ${ITEMS[m.item].name} field: ${DEF[id].name}${h?` (${h} jump${h>1?'s':''})`:' (this system)'}.`}
function campHow(m){const F=FACTIONS[m.f].short;
  if(m.kind==='mine')return`Mine ${ITEMS[m.item].name} and deliver it at any ${F} station (Jobs). Paid ${fmt(Math.round(baseValue(m.item)*1.3))} cr a unit, plus a bonus if the drive succeeds.${fieldHint(m,S.player.sector)}`;
  if(m.kind==='haul')return`Load a consignment at ${stN(m.from)} (Jobs; you leave a deposit), fly it to ${stN(m.to)} and deliver it. Deposit back plus a fee, and a bonus if the drive succeeds.`;
  return`Fly to ${DEF[m.sector].name} and fight alongside them: time in the system while it plays out counts as your part.`}
function campCourse(m){const P=S.player;let to=m.sector;
  if(m.kind==='haul')to=(P.cargo[m.item]||0)>0?m.to:m.from;
  else if(m.kind==='mine')to=(P.cargo[m.item]||0)>=5?nearestOwnStation(m.f,P.sector)||m.sector:(oreField(m.item,P.sector,m.f)||P.sector);
  if(!to)return;if(to===P.sector){flash(m.kind==='mine'?((P.cargo[m.item]||0)>=5?`Dock here to deliver your ${ITEMS[m.item].name} (Jobs).`:`${ITEMS[m.item].name} is in the rocks here: target a rock (Tab) and hold F to mine, then dock at a ${FACTIONS[m.f].short} station.`):m.kind==='haul'?'You are there: dock and open Jobs.':'You are in the target system. Hold near the action.');return}
  P.route=to;if(W&&!P.docked){apOn=true;const g=routeNext();if(g)W.tgt={kind:'gate',ref:g};flash(`Course set to ${DEF[to].name}. Autopilot on: steer to take back control.`)}else flash(`Course set to ${DEF[to].name}. Undock and press J to fly it.`)}
// every order your faction has going: the campaign move first, then its strikes, convoys and calls to defend (not trouble right here)
let ordPick=null;
function ordKey(o){return o.t==='side'?'s'+o.o.id:o.t==='camp'?'c'+o.m.id:o.op.ev&&o.op.ev.id!=null?'e'+o.op.ev.id:o.op.kind+':'+(o.op.ev&&o.op.ev.type)+':'+o.op.sector}
function orderList(){if(S.unb||!S.player.faction||!FACTIONS[S.player.faction])return[];const C=myCamp(),m=C&&C.mv,out=[],sd=C?sideOf(C).filter(o=>o.stage==='active'):[];if(m)out.push({t:'camp',m,label:m.title});
  for(const o of sd)out.push({t:'side',o,label:o.title});
  for(const op of friendlyOps()){if(op.kind==='local')continue;if(m&&m.evId&&op.ev&&op.ev.id===m.evId)continue;if(op.ev&&sd.some(o=>o.evId===op.ev.id))continue;out.push({t:'op',op,label:op.label})}
  for(const o of out)o.key=ordKey(o);return out.slice(0,7)}
function ordSel(L){const i=L.findIndex(o=>o.key===ordPick);return i<0?0:i}
function planKey(next){if(S.training)S.training.pk=1;if(S.unb){flash('The Unbound take no campaign orders. Check the Marks tab at the haven.',true);return}const L=orderList();if(!L.length){flash('No orders right now. Your faction posts its next campaign move shortly.',true);return}
  let i=ordSel(L);if(next){if(L.length<2){flash('That is your only order right now.');ordPick=L[0].key;return}i=(i+1)%L.length;ordPick=L[i].key;flash(`Order ${i+1} of ${L.length}: ${L[i].label}. Press P to take it.`);if(!MUTE)SFX.ui&&SFX.ui();return}
  ordPick=L[i].key;if(L[i].t==='op'){joinOp(L[i].op);return}if(L[i].t==='side'){sideTake(L[i].o);return}const m=L[i].m;
  const k=pkey();if(!m.acc.includes(k)){if(NET.cl){netSend({t:'plan',id:m.id});m.acc.push(k);feed(`Signed on: ${m.title}. ${campHow(m)}`,'good')}else campAccept(k,m);SFX.count(true)}
  campCourse(m)}
// Jobs tab: the campaign at a glance, plus deliveries for supply drives
function campDockHtml(c,P,srcs){const C=myCamp(),f=P.faction,m=C&&C.mv,n=controlCounts()[f]||0,D=DOCTRINE[f],k=pkey(),sid=P.sector;
  let h=`<p class="note" style="margin:0 0 12px">${FACTIONS[f].name} campaign: <b>${D.name}</b>, to ${D.why}. ${n} of ${VIC_NEED} systems held${C&&C.goal?' (goal reached: now hold them)':''}. Moves won ${C?C.wins:0}, lost ${C?C.fails:0}.${weHtml(f)}</p>`;
  if(!m)return h+`<div class="empty">Command is choosing its next move.</div>`;
  const signed=m.acc.includes(k),left=m.stage==='active'&&m.until?Math.max(0,Math.round(m.until-S.T)):Math.max(0,Math.round(m.brief-S.T));
  h+=`<div class="opr assist" style="display:block"><b>${esc(m.title)}</b><br><span>${m.stage==='brief'?`Opens in ${left} s`:m.kind==='mine'||m.kind==='haul'?`${Math.floor(m.prog)} / ${m.need} delivered · ${fmtT(left)} left`:'Strike under way'} · ${signed?'you are signed on':'press P to sign on'}${m.help[k]?` · your part so far: ${Math.round(m.help[k])}${m.kind==='take'||m.kind==='build'?' s':''}`:''}</span></div>`;
  if(m.stage!=='active'||(m.kind!=='mine'&&m.kind!=='haul'))return h+`<p class="note">${esc(campHow(m))}</p>`;
  const it=m.item,nm=ITEMS[it].name,rest=Math.max(0,Math.ceil(m.need-m.prog));
  if(m.kind==='mine'){const have=deliverable(P,it,srcs),bo=boughtOf(P,it),nn=Math.min(have,rest);h+=`<div class="act" style="margin-top:8px"><button class="btn" type="button" data-act="cmine" ${nn>0?'':'disabled'}>Deliver ${nn} ${esc(nm)} · +${fmt(Math.round(baseValue(it)*1.3*nn))} cr</button></div><p class="note">You have ${have} ${esc(nm)} you mined or salvaged in your hold and vault${bo?` (${bo} bought on a market don't count)`:''}.${esc(fieldHint(m,P.sector))}</p>`}
  else{const p=W.player,free=Math.max(0,p.st.cargo-invMass(P.cargo)),stock=S.econ.stock[f][it]||0;
    if(sid===m.from){const nn=Math.min(rest,Math.floor(free/mass(it)),stock),dep=baseValue(it)*nn;h+=`<div class="act" style="margin-top:8px"><button class="btn" type="button" data-act="cload" ${nn>0&&P.credits>=dep?'':'disabled'}>Load ${nn} ${esc(nm)} · deposit ${fmt(dep)} cr</button></div><p class="note">${nn?`Fills ${nn*mass(it)} t of your hold. Deliver at ${esc(stN(m.to))} for the deposit back plus a ${fmt(Math.round(baseValue(it)*.35))} cr fee a unit.`:free<mass(it)?'Your hold is full.':'Nothing left to load.'}</p>`}
    else if(sid===m.to){const cn0=m.cons[k]||0,have=Math.min(P.cargo[it]||0,cn0+deliverable(P,it,[P.cargo],cn0)),nn=Math.min(have,rest);h+=`<div class="act" style="margin-top:8px"><button class="btn" type="button" data-act="chaul" ${nn>0?'':'disabled'}>Deliver ${nn} ${esc(nm)} from your hold</button></div><p class="note">${have?'':'Bring the consignment in your hold (not your vault). Goods bought on a market don\'t count.'}</p>`}
    else h+=`<p class="note">Load at ${esc(stN(m.from))} (${esc(DEF[m.from].name)}), deliver at ${esc(stN(m.to))} (${esc(DEF[m.to].name)}).</p>`}
  return h}
function campAct(act,c,P,srcs){const C=myCamp(),m=C&&C.mv,f=P.faction,k=pkey();if(!m||m.stage!=='active'){dockErr='That drive is closed.';return}
  const it=m.item,rest=Math.max(0,Math.ceil(m.need-m.prog)),add=n=>{m.prog+=n;m.help[k]=(m.help[k]||0)+n;if(!m.acc.includes(k))m.acc.push(k)};
  if(act==='cmine'&&m.kind==='mine'){const n=Math.min(deliverable(P,it,srcs),rest);if(n<=0&&boughtOf(P,it)){dockErr='Ore bought on a market can\'t go to the drive: mine it yourself.';return}if(n<=0)return;takeFrom({[it]:n},srcs);inv.add(S.econ.stock[f],it,n);const got=transfer(f,'player',Math.round(baseValue(it)*1.3*n));add(n);weAdd(f,n*WE.drive);dockErr=`✓ Delivered ${n} ${ITEMS[it].name}: +${fmt(got)} cr. Drive ${Math.floor(m.prog)}/${m.need}.`}
  else if(act==='cload'&&m.kind==='haul'&&P.sector===m.from){const p=W.player,n=Math.min(rest,Math.floor(Math.max(0,p.st.cargo-invMass(P.cargo))/mass(it)),S.econ.stock[f][it]||0),dep=baseValue(it)*n;if(n<=0||P.credits<dep)return;
    transfer('player',f,dep);inv.add(P.cargo,it,inv.take(S.econ.stock[f],it,n));m.cons[k]=(m.cons[k]||0)+n;if(!m.acc.includes(k))m.acc.push(k);dockErr=`✓ Loaded ${n} ${ITEMS[it].name} (deposit ${fmt(dep)} cr). Fly them to ${stN(m.to)}.`}
  else if(act==='chaul'&&m.kind==='haul'&&P.sector===m.to){const cn0=m.cons[k]||0,n=Math.min(P.cargo[it]||0,rest,cn0+deliverable(P,it,[P.cargo],cn0));if(n<=0&&(P.cargo[it]||0)>0){dockErr='Goods bought on a market can\'t go to the drive. Load a consignment, or bring goods you made.';return}if(n<=0)return;inv.take(P.cargo,it,n);inv.add(S.econ.stock[f],it,n);
    const cn=Math.min(n,m.cons[k]||0);m.cons[k]=(m.cons[k]||0)-cn;const pay=Math.round(baseValue(it)*(cn*1.35+(n-cn)*1.15)*((P.lvl||0)>=2?1.1:1)),got=transfer(f,'player',pay);add(n);weAdd(f,n*WE.drive);dockErr=`✓ Delivered ${n} ${ITEMS[it].name}: +${fmt(got)} cr${cn?' (deposit back plus fee)':''}. Drive ${Math.floor(m.prog)}/${m.need}.`}
  if(m.prog>=m.need&&!NET.cl&&!CTX){const P2=campOf(f);if(P2.mv===m)campEnd(f,P2,true)}}
// HUD card under the system name
// HUD cooldowns: missile/torpedo magazine, swarm pods, flares and the distress beacon, each as a bar that fills to ready
function cdItem(lbl,val,p,left){const r=p>=1;return`<span class="cd${r?' rdy':''}">${lbl}${val!=null?` <u>${val}</u>`:''}<i><b style="width:${Math.round(clamp(p,0,1)*100)}%"></b></i><u>${r?'ready':Math.ceil(left)+'s'}</u></span>`}
function cdsHtml(){const P=S.player,p=W.player,torp=CLASSES[P.cls].torp,cap=pRack(P),out=[];
  {const T=reloadT(P,torp?'torpedo':'missile'),l=P.rack<cap?(P.mslT||T):0;out.push(cdItem(torp?'Torps':'Missiles',`${P.rack}/${cap}`,P.rack>=cap?1:1-l/T,l))}
  const sc=swarmCap(P);if(sc){const T=reloadT(P,'swarm'),l=(P.swarm||0)<sc?(P.swT||T):0;out.push(cdItem('Swarm',`${P.swarm||0}/${sc}`,(P.swarm||0)>=sc?1:1-l/T,l))}
  {const l=W.flareCd||0;out.push(cdItem('Flares',null,1-l/5,l))}
  {const l=Math.max(0,(P.distT||0)-S.T);out.push(cdItem('Distress',null,1-l/90,l))}
  return out.join('')}
let cmSig={s:''};try{if(localStorage.getItem('dg_comms_min')==='1')setTimeout(()=>{const c=$('hComms');if(c){c.classList.add('min');$('cmTog').textContent='show';$('cmHead').setAttribute('aria-expanded','false')}},0)}catch(e){}
function commsUpdate(){const P=S.player,dl=Math.max(0,(P.distT||0)-S.T),fc=W.flareCd||0,nEv=innerHeight>=940?8:innerHeight>=820?6:5,last=FEED.slice(-nEv);
  $('hCds').innerHTML=cdsHtml();
  const ops=friendlyOps().filter(o=>o.kind==='local'||S.unb).slice(0,3),osig=ops.map(o=>o.label+opWhen(o)).join('~');
  if(osig!==cmSig.o){cmSig.o=osig;$('cOpsT').hidden=!ops.length;$('cOps').innerHTML=ops.map((o,i)=>`<button type="button" class="ct op ${o.kind}" data-op="${i}"><i></i><span>${esc(o.label)}</span><em>${esc(opWhen(o))}</em></button>`).join('')}
  const sig=nEv+'|'+FEED.length+'|'+(last.length?last[last.length-1].rt:0)+'|'+Math.ceil(dl)+'|'+Math.ceil(fc)+'|'+Math.floor(S.T/15);if(sig===cmSig.s)return;cmSig.s=sig;
  const ago=t=>{const d=Math.max(0,S.T-t);return d<60?Math.round(d)+'s':Math.round(d/60)+'m'};
  $('cEv').innerHTML=last.length?last.slice().reverse().map(f=>`<div class="${f.kind}" title="${esc(f.msg)}"><span>${esc(f.msg)}</span><em>${ago(f.t)}</em></div>`).join(''):'<div class="news"><span>Quiet on all channels.</span></div>';
  const K=(k,l,w)=>`<div${w?' class="wait"':''}><kbd>${k}</kbd>${l}</div>`;
  $('cKeys').innerHTML=K('U',dl>0?`Distress ${Math.ceil(dl)}s`:'Distress',dl>0)+K('I','Comms menu')+K('Y','Assist friendly')+K('O','Join operation')+K('P','Take order')+K('⇧P','Next order')+K('B',fc>0?`Flares ${Math.ceil(fc)}s`:'Flares',fc>0)
    +`<div class="sub"><kbd>I</kbd> opens Command (escort me, guard me, build, distress), then steps through the ships around you; <kbd>1</kbd>–<kbd>4</kbd> pick</div>`}
function campHud(){const el=$('hOrd');if(!el)return;if(S.unb){el.hidden=true;return}const C=myCamp(),m=C&&C.mv,f=S.player.faction,L=orderList(),si=ordSel(L),pick=L[si],multi=L.length>1;el.hidden=false;
  const n=controlCounts()[f]||0,k=pkey(),cs=C&&(m||C.goal);let h=`<div class="ot" style="border-color:${sideCol(f)}"><span>${esc(FACTIONS[f].short)} ${cs?'· '+esc(DOCTRINE[f].name):'orders'}</span><b>${n}/${VIC_NEED} systems</b></div>`;
  if(!m)h+=C&&C.goal?`<div class="om">Goal reached. Hold the line.</div>`:`<div class="om" style="color:var(--dim)">No campaign move right now. Command posts the next one shortly.</div>`;
  else{const on=!multi||(pick&&pick.t==='camp'),signed=m.acc.includes(k),left=m.stage==='active'&&m.until?Math.max(0,Math.round(m.until-S.T)):Math.max(0,Math.round(m.brief-S.T)),ev=m.evId&&S.events.find(e=>e.id===m.evId);
    const st=m.stage==='brief'?`Opens in ${left} s`:m.kind==='mine'||m.kind==='haul'?`${Math.floor(m.prog)}/${m.need} · ${fmtT(left)}`:ev?(ev.stage==='engaged'?'Fighting now':ev.stage==='building'?`Building ${Math.round((ev.prog||0)*100)}%`:ev.hold&&S.T>=ev.eta?'Holding at the gate':`Inbound · ${Math.max(0,Math.round(ev.eta-S.T))} s`):'Under way';
    h+=`<div class="oi${multi&&on?' sel':''}" data-ord="${L[0]?L[0].key:''}"><div class="om"><i class="otg ${m.kind==='mine'||m.kind==='haul'?'log':'cmb'}">${m.kind==='mine'||m.kind==='haul'?'Supply':'Strike'}</i>${esc(m.title)}</div>`;
    if((m.kind==='mine'||m.kind==='haul')&&m.stage==='active')h+=`<div class="obar"><i style="width:${clamp(m.prog/m.need*100,0,100)}%;background:${sideCol(f)}"></i></div>`;
    h+=`<div class="os"><span>${st}</span><span class="${signed?'ok':'go'}">${signed?(on?'✓ Signed on · P course':'✓ Signed on'):on?'P · sign on':''}</span></div></div>`}
  for(const o of L){if(o.t!=='side')continue;const on=o===pick,x=o.o,sg=x.acc.includes(k);h+=`<div class="oi sd${on?' sel':''}" data-ord="${o.key}"><div class="om"><i class="otg ${x.lane}">${x.lane==='intel'?'Intel':'Combat'}</i>${esc(x.title)}</div><div class="os"><span>${esc(sideStat(x))} · ${fmtT(Math.max(0,x.until-S.T))} · ${fmt(x.pay)} cr · ${esc(SIDE[x.kind].suit)}</span><span class="${sg?'ok':'go'}">${sg?(on?'✓ P course':'✓'):on?'P · sign on':''}</span></div></div>`}
  for(const o of L){if(o.t!=='op')continue;const on=o===pick;h+=`<div class="oi op ${o.op.kind}${on?' sel':''}" data-ord="${o.key}"><div class="om">${esc(o.label)}</div><div class="os"><span>${esc(opWhen(o.op))}</span><span class="go">${on?(o.op.kind==='assist'?'P · join':'P · defend'):''}</span></div></div>`}
  if(multi)h+=`<div class="onx"><kbd>⇧P</kbd> next order · ${si+1} of ${L.length}</div>`;
  if(el._h!==h){el._h=h;el.innerHTML=h}}
// map: the next move of your faction, and of rivals where your sensors (or the Hollow Relay) can see it
function campKnown(m){return!!m&&(m.f===S.player.faction||covered(m.sector)||hasIntel())}
function campMapHtml(){if(!S.plans)return'';let h='';for(const f of FAC_IDS){const C=S.plans[f];if(!C)continue;const m=C.mv,n=controlCounts()[f]||0;
    h+=`<span style="color:${sideCol(f)}">${esc(FACTIONS[f].short)} · ${esc(DOCTRINE[f].name)}</span><b>${n}/${VIC_NEED}${m?(campKnown(m)?' · '+esc(m.title):' · plans unknown'):C.goal?' · holding':''}</b>`}
  return h?`<div><div class="h3">Faction campaigns</div><div class="kv">${h}</div><p class="note" style="margin-top:6px">Your faction's next move is on your HUD: press P to sign on. Rival moves show when your sensors cover the target.</p></div>`:''}
function campMapDraw(c,w,h,t){if(!S.plans)return;for(const f of FAC_IDS){const C=S.plans[f],m=C&&C.mv;if(!campKnown(m))continue;const sids=m.kind==='haul'?[m.from,m.to]:[m.kind==='mine'?m.obj:m.sector];
    for(const sid of sids){if(!DEF[sid])continue;const[x,y]=mapXY(DEF[sid],w,h),r=24+(f===S.player.faction?Math.sin(t*3)*2:0);c.strokeStyle=hexA(sideCol(f),f===S.player.faction?.9:.5);c.lineWidth=f===S.player.faction?2.5:1.5;c.setLineDash([2,6]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
      c.font='700 10px "Saira Semi Condensed",sans-serif';c.textAlign='center';c.fillStyle=sideCol(f);c.fillText((f===S.player.faction?'NEXT · ':FACTIONS[f].short.toUpperCase()+' · ')+(m.kind==='haul'?(sid===m.from?'LOAD':'DELIVER'):m.kind==='mine'?'MINE FOR':m.kind==='build'?'BUILD':'TAKE'),x,y-r-5)}
    if(m.kind==='haul'&&DEF[m.from]&&DEF[m.to]){const[x1,y1]=mapXY(DEF[m.from],w,h),[x2,y2]=mapXY(DEF[m.to],w,h);c.strokeStyle=hexA(sideCol(f),.45);c.setLineDash([5,5]);c.lineWidth=1.5;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([])}}}
