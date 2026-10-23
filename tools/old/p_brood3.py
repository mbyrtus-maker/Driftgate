# Patch: the Brood, stage 3 (spread and ecology). Map countdowns for Seeders and rooting nodes, truce hatching on the map,
# node guts and the feast after the fire, feeding grounds, Grazer bellies, scout spotting pay, containment supply orders for
# haulers, and node bounties that reach multiplayer guests. Every ore move is a move: the closed economy stays exact.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

ECO_JS=r"""
// ---- Brood ecology (stage 3). What the swarms graze is split: half to the Brood's stores, a quarter into the gut of the
// nearest Bloom Node (spilled as rich rock when the node burns), a quarter piled as a feeding ground in the nearest
// Brood-held system (dense rock any pilot can mine under the truce). Zoned ores (Aurorite, Vantium) never leave for a
// feeding ground. Nothing is created: every unit comes out of a real field.
const GUT={share:.25,fg:.25,cap:240,fgCap:600,fgRock:160,feastRock:130};
function brNodes(){return Object.values(S.stations).filter(R=>R.owner==='brood'&&R.kind==='depot')}
function srnd(x){return Math.floor(x+Math.random())}
function fgMass(s){let m=0;for(const a of s.ast)if(a.fg)m+=oreTotal(a);return m}
function fgAnchor(s){if(!s.fg){const p=s.belts&&s.belts.length?newAstPos(s):{x:ri(-1400,1400),y:ri(-200,200),z:ri(-1400,1400)};s.fg={x:p.x,y:p.y,z:p.z}}return s.fg}
function fgSector(from){let b=null,bh=99;for(const d of SECTOR_DEFS){const id=d.id;if(!broodHeld(id)||WORLDS[id]||!S.sectors[id])continue;if(fgMass(S.sectors[id])>=GUT.fgCap)continue;const h=HOP[from][id]??99;if(h<bh){bh=h;b=id}}return b}
function fgAdd(s,k,m){if(m<=0)return;const A=fgAnchor(s);let a=s.ast.find(x=>x.fg&&x.ore[k]&&oreTotal(x)<GUT.fgRock)||s.ast.find(x=>x.fg&&oreTotal(x)<GUT.fgRock*.5);
  if(a){inv.add(a.ore,k,m);return}s.ast.push({id:S.nextId++,x:Math.round(A.x+rnd(-320,320)),y:Math.round(A.y+rnd(-90,90)),z:Math.round(A.z+rnd(-320,320)),ore:{[k]:m},seed:ri(1,1e9),fg:1})}
function brGut(st,from,got){let R=null,bh=99;for(const x of brNodes()){const h=HOP[from][x.sid]??99;if(h<bh){bh=h;R=x}}
  const fs=fgSector(from),fsec=fs?S.sectors[fs]:null;
  for(const k in got){let n=got[k];if(n<=0)continue;
    if(R&&invMass(R.gut||{})<GUT.cap){const g=Math.min(n,srnd(n*GUT.share));if(g>0){R.gut=R.gut||{};inv.add(R.gut,k,g);n-=g}}
    if(fsec&&k!=='au'&&k!=='nu'){const f=Math.min(n,srnd(got[k]*GUT.fg));if(f>0){fgAdd(fsec,k,f);n-=f}}
    if(n>0)inv.add(st,k,n)}}
// the feast after the fire: a burned node's gut spills as a few big, rich rocks where it stood
function brFeast(s,R){const g=R.gut||{},t=invMass(g);R.gut={};if(t<=0)return 0;const n=clamp(Math.ceil(t/GUT.feastRock),1,5),rocks=[];
  for(let i=0;i<n;i++){const o=rdir(.5),k=ri(160,420);rocks.push({id:S.nextId++,x:Math.round((R.x||0)+o.x*k),y:Math.round((R.y||0)+o.y*k*.4),z:Math.round((R.z||0)+o.z*k),ore:{},seed:ri(1,1e9),feast:1})}
  let i=0;for(const k in g){let left=g[k];while(left>0){const m=Math.min(left,Math.max(1,Math.ceil(g[k]/n)));inv.add(rocks[i%n].ore,k,m);left-=m;i++}}
  for(const a of rocks)if(oreTotal(a)>0)s.ast.push(a);return t}
// ---- scouts: hold a lock on a Seeder for 3 s inside 5 km, before it plants, for a 250 cr containment order (one per Seeder)
const SPOT={t:3,r:5000,pay:250};
function spotTarget(){const T=W.tgt;if(!T||T.kind!=='ship')return null;const e=T.ref;return e&&e.alive&&e.side==='brood'&&e.role==='builder'?e:null}
function spotTick(dt){const F=W.spotF||(W.spotF={id:null,t:0});const e=spotTarget(),p=W.player;
  if(!e||!p||!isScoutCls(S.player.cls)||S.player.docked||!FAC_IDS.includes(S.player.faction)||e.spotted||d3(e,p)>SPOT.r){F.t=0;return}
  if(F.id!==e.id){F.id=e.id;F.t=0}F.t+=dt;if(F.t<SPOT.t)return;F.t=0;if(NET.cl){netSend({t:'spot',id:e.id});e.spotted=1}else spotPay(e,pkey())}
function spotPay(e,k){if(!e||!e.alive||e.side!=='brood'||e.role!=='builder'||e.spotted)return;const P=isMe(k)?S.player:S.pilots&&S.pilots[k];if(!P||!FAC_IDS.includes(P.faction)||!isScoutCls(P.cls))return;
  e.spotted=1;const c=payKey(k,P.faction,SPOT.pay);keyFeed(k,`📡 Containment order: Seeder spotted before it planted. Every faction can see it now.${c?` +${fmt(c)} cr.`:''}`,'good');
  const ev=S.events.find(v=>v.type==='build'&&v.att==='brood'&&v.sector===W.sid&&v.stage!=='done');if(ev)ev.spotted=1}
function spotChip(){const e=spotTarget();if(!e||!isScoutCls(S.player.cls)||S.player.docked)return null;if(e.spotted)return['📡 Seeder spotted: containment paid','good'];const d=d3(e,W.player),F=W.spotF||{};
  if(d>SPOT.r)return[`📡 Close to ${SPOT.r/1000} km to spot the Seeder (${fmt(Math.round(d))} m)`,'warn'];return[`📡 Spotting Seeder ${Math.round(clamp((F.id===e.id?F.t:0)/SPOT.t,0,1)*100)}% · keep it targeted`,'warn']}
// ---- scouts find feeding grounds: flying a scout through Brood space marks its feeding ground on every pilot's map
function fgScout(){if(!W||W!==LW||!W.haze||!W.player||S.player.docked||!isScoutCls(S.player.cls))return;S.fgSeen=S.fgSeen||{};if(S.fgSeen[W.sid])return;S.fgSeen[W.sid]=1;
  const t=fgMass(S.sectors[W.sid]);if(t>0)feed(`📡 Scout report: a Brood feeding ground in ${DEF[W.sid].name}, about ${fmt(t)} t of piled ore. It's marked on the galaxy map.`,'good')}
// ---- containment supply: faction stations on the Bloom's border post orders for torpedoes, missiles and plate, paid at a
// front-line bonus (about 2.5x value) and delivered in person, like a blockade run
const CONT_PAY=[2.2,2.8],CONT_T=900;
function contFront(f,sid){const R=S.stations[sid];return!!R&&R.owner===f&&R.kind!=='hive'&&NEIGH[sid].some(n=>broodHeld(n))}
function contContracts(){for(const f of FAC_IDS){if(!S.econ.stock[f])continue;S.contracts=S.contracts.filter(c=>!(c.cont&&c.fac===f&&!contFront(f,c.st)));
    const L=S.contracts.filter(c=>c.cont&&c.fac===f);if(L.length>=1||Math.random()<.5)continue;
    const cand=Object.keys(S.stations).filter(sid=>contFront(f,sid)&&!S.contracts.some(c=>c.blk&&c.st===sid));if(!cand.length)continue;const sid=pick(cand),R=S.stations[sid];
    const item=wpickArr([['torpedo',1],['missile',2],['plate',3]].filter(([k])=>ITEMS[k])),js=jobSize(item,item==='torpedo'?ri(2,4):item==='missile'?ri(4,8):ri(10,20)),n=js.n,reward=Math.ceil(baseValue(item)*n*rnd(CONT_PAY[0],CONT_PAY[1])/10)*10;
    S.contracts.push({id:S.nextId++,fac:f,st:sid,blk:1,cont:1,why:'on the Bloom front: containment supply',foe:'brood',item,n,n0:n,reward,until:S.T+CONT_T*js.t});
    facFeed(f,`☣ Containment supply: ${R.name} in ${DEF[sid].name} holds the line against the Bloom and needs ${n} ${ITEMS[item].name}. ${fmt(reward)} cr for delivery in person (Economy → Orders).`,'info')}}
// ---- the galaxy map: truce hatching, Seeder countdowns, rooting nodes, feeding grounds
function brMapMarks(c,d,x,y,r,t){const bc=FACTIONS.brood.col;
  if(truceAt(d.id)){c.save();c.beginPath();c.arc(x,y,r-1,0,TAU);c.clip();c.strokeStyle=hexA(bc,.4);c.lineWidth=1.2;for(let k=-r*2;k<r*2;k+=6){c.beginPath();c.moveTo(x+k-r,y+r);c.lineTo(x+k+r,y-r);c.stroke()}c.restore()}
  const lines=[],ev=S.events.find(e=>e.type==='build'&&e.att==='brood'&&e.sector===d.id&&e.stage!=='done');
  if(ev){const pu=.5+.5*Math.sin(t*4);c.strokeStyle=hexA(bc,.5+.4*pu);c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.arc(x,y,r+9,0,TAU);c.stroke();c.setLineDash([]);
    lines.push(ev.stage==='inbound'?`SEEDER ${fmtT(Math.max(0,ev.eta-S.T))}`:'SEEDER PLANTING')}
  const Rs=S.stations[d.id];if(Rs&&Rs.owner==='brood'&&Rs.kind==='depot'&&Rs.built!=null&&S.T-Rs.built<CONTAIN.youngT)lines.push(`ROOTING ${fmtT(CONTAIN.youngT-(S.T-Rs.built))}`);
  const sc=S.sectors[d.id];if(sc&&(covered(d.id)||(S.fgSeen&&S.fgSeen[d.id]))){const m=fgMass(sc);if(m>=20)lines.push(`◆ FEED ${fmt(m)} t`)}
  if(!lines.length)return;c.font='700 9px "Saira Semi Condensed",sans-serif';c.textAlign='center';let yy=y-r-(ev?14:8)-(lines.length-1)*10;
  for(const L of lines){c.fillStyle='#070b16';c.fillText(L,x+1,yy+1);c.fillStyle=L[0]==='◆'?'#7ad9a7':bc;c.fillText(L,x,yy);yy+=10}}
"""
rep("function tunedK(e,kind){",ECO_JS+"function tunedK(e,kind){")

# the ledger counts every node's gut
rep("invVec(R.store||{},L.Stations);","invVec(R.store||{},L.Stations);invVec(R.gut||{},L.Stations);")
# grazing goes through the split
rep("for(let i=0;i<gz&&L.length;i++)inv.addAll(st,extract(S.sectors[pick(L)],6,false,{au:1,nu:(st.nu||0)>200,cu:(st.cu||0)>=300,fe:(st.fe||0)>=300,ir:(st.ir||0)>300,xc:(st.xc||0)>150}))}",
    "for(let i=0;i<gz&&L.length;i++){const gs=pick(L);brGut(st,gs,extract(S.sectors[gs],6,false,{au:1,nu:(st.nu||0)>200,cu:(st.cu||0)>=300,fe:(st.fe||0)>=300,ir:(st.ir||0)>300,xc:(st.xc||0)>150}))}}")
# a burned node: the feast, then the rest of the raze
rep("toDebris(s,R.fort);R.fort={};if(R.store){toDebris(s,R.store);R.store={}}wkRaze(sid);",
    "{const ft=R.owner==='brood'&&R.gut?brFeast(s,R):0;if(ft&&(covered(sid)||W&&W.sid===sid))feed(`The ${R.name}'s gut spills: ${fmt(ft)} t of ore in dense, rich rock where it stood.`,'good')}toDebris(s,R.fort);R.fort={};if(R.store){toDebris(s,R.store);R.store={}}wkRaze(sid);")
# Grazer bellies: Brood miners fly out with real ore aboard from the Brood's stores (it goes home again if they leave)
rep("const e=makeNPC(role,side,cls,tier,ld,'stock:'+side);",
    "const e=makeNPC(role,side,cls,tier,ld,'stock:'+side);if(role==='miner'&&side==='brood'){const st=S.econ.stock.brood||{};let left={skiff:14,prospector:24,dredger:36}[cls]||20;for(const k of['fe','cu','ir','xc','nu','au']){if(left<=0)break;const m=inv.take(st,k,Math.min(left,ri(4,12)));if(m){inv.add(e.cargo,k,m);left-=m}}}")
# blockade upkeep leaves containment orders alone; the order pass runs after it
rep("S.contracts=S.contracts.filter(c=>!(c.blk&&c.fac===f&&!blkWhy(f,c.st)));\n    const L=S.contracts.filter(c=>c.blk&&c.fac===f);",
    "S.contracts=S.contracts.filter(c=>!(c.blk&&!c.cont&&c.fac===f&&!blkWhy(f,c.st)));\n    const L=S.contracts.filter(c=>c.blk&&!c.cont&&c.fac===f);")
rep("fpContracts();blkContracts();","fpContracts();blkContracts();contContracts();")
rep("if(blks.length){h+=`<div class=\"h3\" style=\"margin-top:14px\">⚠ Blockade runs</div><p class=\"note\" style=\"margin:0 0 8px\">These ${esc(FACTIONS[P.faction].short)} stations are cut off or under siege.",
    "if(blks.length){h+=`<div class=\"h3\" style=\"margin-top:14px\">⚠ Blockade runs${blks.some(k=>k.cont)?' and containment supply':''}</div><p class=\"note\" style=\"margin:0 0 8px\">These ${esc(FACTIONS[P.faction].short)} stations are cut off, under siege${blks.some(k=>k.cont)?' or holding the line against the Bloom':''}.")
# node bounties for every pilot who hit the node in its last minute, guests included
rep("function damageStation(E,dmg,by,kind){if(by==='player'&&E&&E.fac==='brood'&&E.rec){E.rec.pHit=W.t}",
    "function damageStation(E,dmg,by,kind,src){if(E&&E.fac==='brood'&&E.rec){const k=src&&src.rp?src.rp:by==='player'?'me':null;if(k){(E.rec.pHits=E.rec.pHits||{})[k]=W.t;E.rec.pHit=W.t}}")
rep("if(R.owner==='brood'&&R.kind==='depot'&&R.pHit!=null&&W.t-R.pHit<60&&FAC_IDS.includes(S.player.faction)){const young=S.T-(R.built==null?-1e9:R.built)<CONTAIN.youngT,c=transfer(S.player.faction,'player',young?CONTAIN.young:CONTAIN.node);if(c)feed(`Containment order: Bloom Node burned${young?' before it rooted':''}. +${fmt(c)} cr.`,'good')}",
    "if(R.owner==='brood'&&R.kind==='depot'){const young=S.T-(R.built==null?-1e9:R.built)<CONTAIN.youngT;for(const k in R.pHits||{}){if(W.t-R.pHits[k]>=60)continue;const P=isMe(k)?S.player:S.pilots&&S.pilots[k];if(!P||!FAC_IDS.includes(P.faction))continue;const c=payKey(k,P.faction,young?CONTAIN.young:CONTAIN.node);if(c)keyFeed(k,`Containment order: Bloom Node burned${young?' before it rooted':''}. +${fmt(c)} cr.`,'good')}}")
rep("damageStation(R.hit.ref,dmg*1.1*(e.st.cautery&&R.hit.ref.fac==='brood'?1.4:1),e.side,'laser')","damageStation(R.hit.ref,dmg*1.1*(e.st.cautery&&R.hit.ref.fac==='brood'?1.4:1),e.side,'laser',e)")
rep("damageStation(m.tgt,m.dmg*(tp?TORP_STATION:1)*(m.incend&&m.tgt.fac==='brood'?1.5:1),m.side,m.kind)","damageStation(m.tgt,m.dmg*(tp?TORP_STATION:1)*(m.incend&&m.tgt.fac==='brood'?1.5:1),m.side,m.kind,m.src)")
rep("damageStation(SE,b.dmg,b.side,b.cap?'capital':'kinetic')","damageStation(SE,b.dmg,b.side,b.cap?'capital':'kinetic',b.src)",2)
# scouts: the spotting lock (every frame, like the capital ping), the HUD chip, the host side for guests, feeding ground reports
rep("if(!W.jump)pingTick(dt)}","if(!W.jump){pingTick(dt);spotTick(dt);fgScout()}}")
rep("{const pc=pingChip();if(pc)sc.push(pc)}","{const pc=pingChip();if(pc)sc.push(pc)}{const sp=spotChip();if(sp)sc.push(sp)}")
rep("    case 'msl':hMissile(pid,m);break;","    case 'msl':hMissile(pid,m);break;\n    case 'spot':{const e0=MP.rp[pid];if(e0)inW(worldOf(e0),()=>{const e=W.ents.find(x=>x.id===m.id);if(e&&d3(e,e0)<SPOT.r*1.2)spotPay(e,pid)});break}")
# the target panel shows a node's gut and how long it has left to root
rep("${T.turrets.length} turrets${T.offline?' · OFFLINE':''}</div>",
    "${T.turrets.length} turrets${T.offline?' · OFFLINE':''}</div>${T.rec&&T.rec.owner==='brood'&&T.rec.kind==='depot'?`<div class=\"ts\" style=\"color:#9be35a\">${T.rec.built!=null&&S.T-T.rec.built<CONTAIN.youngT?`Rooting: burn it in ${fmtT(CONTAIN.youngT-(S.T-T.rec.built))} for ${fmt(CONTAIN.young)} cr · `:''}Gut: ${fmt(invMass(T.rec.gut||{}))} t of ore</div>`:''}")
# map marks, drawn over each sector
rep("    const oid=OUT_BY_SECTOR[d.id];if(oid){const o=S.outposts[oid];c.fillStyle=col;","    brMapMarks(c,d,x,y,r,t);\n    const oid=OUT_BY_SECTOR[d.id];if(oid){const o=S.outposts[oid];c.fillStyle=col;")
open(P,'w',encoding='utf-8').write(s);print('brood stage 3 applied')
