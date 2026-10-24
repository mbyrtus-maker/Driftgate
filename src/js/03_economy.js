//@src 03_economy.js
// ============================================================ economy primitives
function toDebris(s,o){const v=invVec(o);for(const e of RAWS)s.debris[e]+=v[e]}
// skip: ores the buyer is already swimming in (left in the rocks so iron and copper keep flowing)
function extract(s,n,noSeam,skip){const got={};let g=0;while(n>0&&s.ast.length&&g++<30){const a=pick(s.ast);if(a.comet||(noSeam&&a.seam))continue;const k=mainOre(a);if(!k){removeAst(s,a);continue}if(skip&&skip[k]&&g<24)continue;const m=Math.min(n,a.ore[k],ri(1,4));a.ore[k]-=m;if(a.ore[k]<=0)delete a.ore[k];n-=m;inv.add(got,k,m);if(oreTotal(a)<=0)removeAst(s,a)}return got}
function removeAst(s,a){const i=s.ast.indexOf(a);if(i>=0)s.ast.splice(i,1);if(W&&W.tgt&&W.tgt.ref===a)W.tgt=null}
// zoned ores only re-form in their own fields: Aurorite in deep space, Vantium where it was first found
function oreHere(e,id){const d=DEF[id];return e==='xc'&&d.home?false:e==='au'?d.kind==='deep':e==='nu'?!!(d.ores&&d.ores.nu):true}
const NU_SECT=SECTOR_DEFS.filter(d=>d.ores&&d.ores.nu).map(d=>d.id);function toNu(id){let b=null,bd=99;for(const n of NEIGH[id]){const h=Math.min(...NU_SECT.map(x=>HOP[x][n]));if(h<bd){bd=h;b=n}}return b}
function regrow(s){
  for(const e of RAWS){if(!oreHere(e,s.id))continue;const m=Math.min(s.debris[e],Math.max(1,Math.ceil(s.debris[e]*.06)));if(m<=0)continue;s.debris[e]-=m;
    const c=s.ast.filter(a=>!a.comet&&a.ore[e]&&oreTotal(a)<150);
    if(c.length&&(Math.random()<.7||s.ast.length>60))pick(c).ore[e]+=m;
    else if(s.ast.length>60){const a=pick(s.ast.filter(a=>!a.comet))||s.ast[0];inv.add(a.ore,e,m)}
    else s.ast.push({id:S.nextId++,...newAstPos(s),ore:{[e]:m},seed:ri(1,1e9)})}
}
const DEEP=SECTOR_DEFS.filter(d=>d.kind==='deep').map(d=>d.id);function toDeep(id){let b=null,bd=99;for(const n of NEIGH[id]){const h=Math.min(...DEEP.map(x=>HOP[x][n]));if(h<bd){bd=h;b=n}}return b}
function diffuse(){const mv=[];for(const id in S.sectors){const s=S.sectors[id];for(const e of RAWS){if(e==='au'||e==='nu'){if(!oreHere(e,id)&&s.debris[e]>0)mv.push([id,e==='au'?toDeep(id):toNu(id),e,Math.max(1,Math.floor(s.debris[e]*.3))]);continue}const m=Math.floor(s.debris[e]*.04);if(m>0)mv.push([id,pick(NEIGH[id]),e,m])}}for(const[a,b,e,m]of mv){S.sectors[a].debris[e]-=m;S.sectors[b].debris[e]+=m}}
// fabricate down to a reserve: keeps converting while every raw input stays above what's held back (iron and copper only
// make plate and conduit, so stations turn nearly all of them into parts; iridium is kept for missiles, torpedoes and keels)
function craftDown(st,item,keep,max){const r=ITEMS[item].recipe;let n=0;while(n<max&&Object.keys(r).every(k=>(st[k]||0)-r[k]>=(keep[k]||0))){takeFrom(r,[st]);inv.add(st,item,1);n++}return n}
function craftAbstract(st,item,max,cap){let n=0;const r=ITEMS[item].recipe;while(n<max&&(st[item]||0)<cap&&haveIn(r,[st])){takeFrom(r,[st]);inv.add(st,item,1);n++}}
function forgesOwned(f){let n=0;for(const id in S.outposts){const o=S.outposts[id];if(o.type==='forge'&&o.owner===f)n++}return n}
function factionTier(f){return 1+Math.min(2,forgesOwned(f))}
function pirateTier(){return S.outposts.wrack.owner==='pirate'?2:1}
function loadout(role,t,cls){
  if(role==='miner')return{plate:cls==='dredger'?4:2,wire:2,drone:(CLASSES[cls]||{}).drones||2};if(role==='hauler')return{plate:cls==='bulker'?6:4,wire:1,drone:(CLASSES[cls]||{}).drones||2};
  const o=role==='pirate'?(t>=2?{plate:3,wire:2,coil:1,missile:1}:{plate:2,wire:2}):(t>=3?{plate:3,wire:2,coil:2,lattice:1,missile:2}:t===2?{plate:3,wire:2,coil:2,missile:1}:{plate:3,wire:2});
  if(cls==='interceptor'){o.plate=Math.max(1,o.plate-1);if(o.missile)o.missile=1}
  else if(cls==='heavy'){o.plate+=2;o.coil=(o.coil||0)+1;if(o.missile)o.missile+=1}
  else if(cls==='bomber'){o.plate+=2;o.coil=(o.coil||0)+1;delete o.missile;o.torpedo=3}
  else if(cls==='gunboat'){o.plate+=4;o.coil=(o.coil||0)+2;o.lattice=(o.lattice||0)+1;o.missile=1;o.torpedo=3}
  return o}
function isBmb(c){return c==='bomber'||c==='gunboat'}
// veteran factions (40 min in, with a capital shipyard or two crystal forges) field the advanced hulls: Heavy Bombers in strike groups, Advanced Scouts
function facVet(f){return FAC_IDS.includes(f)&&S.T>=2400&&(!!S.yards[f]||factionTier(f)>=3)}
function bmbPick(f,i,role,tier,srcs){return facVet(f)&&i%2===0&&haveIn(loadout(role,tier,'gunboat'),srcs)?'gunboat':'bomber'}
function pickFighter(role){return wpick(role==='raider'?{interceptor:2,striker:1.4,heavy:.4}:role==='pirate'?{interceptor:1.4,striker:2,heavy:.7}:{interceptor:1,striker:2,heavy:1.1})}
function wallet(side){return side==='player'?{get:()=>S.player.credits,add:n=>{S.player.credits+=n}}:{get:()=>S.econ.treasury[side]||0,add:n=>{S.econ.treasury[side]=(S.econ.treasury[side]||0)+n}}}
function transfer(from,to,n){n=Math.floor(n);if(n<=0)return 0;const a=wallet(from),b=wallet(to);n=Math.min(n,a.get());if(n<=0)return 0;a.add(-n);b.add(n);return n}
function hasIntel(){const h=S.outposts.hollow.owner;return h==='player'||h===S.player.faction}
function holderIn(st,path){const p=path.split(':');if(p[0]==='stock')return st.econ.stock[p[1]];if(p[0]==='out')return st.outposts[p[1]].stock;if(p[0]==='frig'){const t=(st.frigates||[]).find(x=>String(x.id)===p[1]);return t?t.load:(st.econ.stock[p[2]]||st.player.vault)}if(p[0]==='pbay'){const R=p[1]&&st.pilots&&st.pilots[p[1]]||st.player;return R.bay=R.bay||{}}if(p[0]==='scout'){const t=(st.scouts||[]).find(x=>String(x.id)===p[1]);return t?t.load:st.econ.stock[p[2]]}if(p[0]==='trader'){const t=(st.traders||[]).find(x=>String(x.id)===p[1]);return t?t.load:st.econ.stock[p[2]]}if(p[0]==='raid'){const r=(st.raids||[]).find(x=>String(x.id)===p[1]);return r?r.kit:(st.econ.stock[p[2]]||st.econ.stock.pirate)}if(p[0]==='ev'){const ev=st.events.find(v=>String(v.id)===p[1]);return ev&&ev.force?ev.force:st.econ.stock[p[2]]}return st.econ.stock.pirate}
const holder=path=>holderIn(S,path);
function stockTarget(id){return RAWS.includes(id)?300:id==='plate'||id==='wire'?90:id==='coil'?40:id==='seal'?6:16}
// a small store (sc<1) is priced against its own smaller target, but with market depth (MK_SC.depth): a unit moves its price
// about as much as a unit moves the warehouse's, so local demand (R.mk) shapes prices as much as the stock on the shelf does
function price(stock,id,sc){sc=sc||1;const s=stock[id]||0,t0=stockTarget(id),t=t0*sc,D=10+(1-sc)*t0*MK_SC.depth;return Math.max(1,baseValue(id)*clamp(Math.pow((t+D)/(s+D),.45),.5,2.8))}
const buyPrice=(st,id)=>Math.ceil(price(st,id)*1.06),sellPrice=(st,id)=>Math.max(1,Math.floor(price(st,id)*.94));
// ---- local markets and trade. Every market sells from its own shelves: a faction's core station from the faction warehouse,
// each depot from its own store, each freeport from its own store. Credits are shared: a faction's treasury pays and is paid at
// all its stations, the Compact's at all three freeports. A small store's price swings faster (mkSc: its stock targets are a
// fraction of the warehouse's). On top of the stock, every station keeps a local supply level per good (R.mk: + means
// oversupplied, cheap; - means short, dear). Each station produces some goods and consumes
// others, so its level drifts back toward a natural surplus or shortage after trading. AI merchants work the widest gaps.
const TRADE_ITEMS=['fe','cu','ir','xc','au','nu','plate','wire','coil','lattice','drone','seal'];
function locT(id){return Math.max(6,stockTarget(id)/4)}
function mkStations(){const out=[];for(const id in S.stations){const R=S.stations[id];if(R.kind==='hive'||!(FAC_IDS.includes(R.owner)||R.owner==='neutral'))continue;out.push(R)}return out}
function mkStock(R){return(R&&storeOf(R))||{}}
function isFreeF(R){return!!R&&R.kind==='free'&&R.owner==='neutral'}
const MK_SC={depot:.25,free:1/3,depth:1};function mkSc(R){return isDepotF(R)?MK_SC.depot:isFreeF(R)?MK_SC.free:1}
// the freeports' own stores, and the nearest live freeport to a system (optionally one whose store passes a test)
function fpStores(){return FREEPORTS.map(F=>S.stations[F.sid]).filter(isFreeF).map(dStore)}
function fpNear(sid,ok){let A=null,bd=1e9;for(const F of FREEPORTS){const R=S.stations[F.sid];if(!isFreeF(R)||(ok&&!ok(dStore(R))))continue;const d=HOP[R.sid][sid]||0;if(d<bd){bd=d;A=R}}return A}
// a goods pile split as evenly as it goes across the live freeports (setup, and moving old saves off the shared Compact pool)
function fpSplit(o){const L=fpStores();if(!L.length)return false;for(const k in o){const n=o[k]||0;if(n<=0)continue;const q=Math.floor(n/L.length);let r=n-q*L.length;for(const st of L){const m=q+(r>0?1:0);if(r>0)r--;if(m>0)inv.add(st,k,m)}}return true}
// how far a station's local level settles from neutral (eq, in units of locT) and how fast it drifts back each tick (rate)
const MK_DEM={eq:1,rate:.07};
// what a station makes (+) and uses up (-)
function mkProfile(R){const p={},d=DEF[R.sid],ores=Object.keys(d.ores||{});
  if(R.kind==='core'){for(const k of['plate','wire','coil','missile'])p[k]=1;for(const k of['fe','cu','ir','xc','au','nu'])p[k]=-1;p.lattice=-.5}
  else if(R.kind==='free'){for(const k of['lattice','coil','missile','torpedo','drone','plate'])p[k]=-1;for(const k of ores)p[k]=.6;p.swarm=-.6}
  else{for(const k of ores)p[k]=1;for(const k of['plate','wire','missile','drone'])p[k]=-1;p.coil=-.5;if(d.kind==='deep')p.au=1}
  return p}
function mkOf(R){if(!R.mk){R.mk={};const p=mkProfile(R);for(const k of TRADE_ITEMS)R.mk[k]=Math.round(((p[k]||0)*MK_DEM.eq+(Math.random()-.5)*.3)*locT(k)*10)/10}return R.mk}
function locF(R,id){if(!R||!R.mk)return 1;const L=R.mk[id]||0;return clamp(Math.exp(-L/(locT(id)*2)),.55,1.9)}
// Aurorite is war material: faction stations pay a premium for it over any freeport, so merchants carry it to the
// factions instead of shuttling it between freeports (and a pilot sells it to a faction for more)
const AU_FAC=1.35;const mkK=(R,id)=>id==='au'&&R&&R.owner!=='neutral'?AU_FAC:1;
function stPrice(R,id){return price(R?mkStock(R):{},id,mkSc(R))*locF(R,id)*mkK(R,id)}
// market prices at the dock you're in (outposts have no local level)
function mR(c){return c&&c.kind==='station'?S.stations[S.player.sector]:null}
// market fee on a pilot's trades: 6%, less in the bigger haulers (a freight licence). A big hold soon moves the price against
// itself; the bigger haulers pay a thinner fee and move the local price less per unit (HAUL_MK), so trade runs come to about
// 15k an hour in a Light Hauler, 20k in a Medium and 25k in a Heavy, Mk I.
const HAUL_FEE={courier:.035,freighter:.02,bulker:.01};const mFee=cls=>HAUL_FEE[cls]!=null?HAUL_FEE[cls]:.06;const HAUL_MK={freighter:.6,bulker:.26};const pMk=()=>HAUL_MK[S.player.cls]||1;
function mBuy(c,id){const R=mR(c);return Math.ceil(price(c.market,id,mkSc(R))*locF(R,id)*mkK(R,id)*(1+mFee(S.player.cls)))}
function mSell(c,id){const R=mR(c);return Math.max(1,Math.floor(price(c.market,id,mkSc(R))*locF(R,id)*mkK(R,id)*(1-mFee(S.player.cls))))}
// how many units a market takes (dir +1, a sale) or gives (dir -1, a purchase) at the quoted price: as many as it can absorb before
// its price would move past the buy/sell spread, so a big dump sells in lots and buying it straight back never pays
function lotCap(c,k,dir,maxN){if(maxN<=1)return maxN;const R=mR(c);if(R)mkOf(R);const st=c.market,sc=mkSc(R),s0=st[k],m0=R?R.mk[k]||0:0,p0=price(st,k,sc)*locF(R,k);
  const at=n=>{st[k]=(s0||0)+dir*n;if(R)R.mk[k]=m0+dir*n*pMk();const p=price(st,k,sc)*locF(R,k);if(s0===undefined)delete st[k];else st[k]=s0;if(R)R.mk[k]=m0;return p};
  const ok=n=>dir>0?at(n)>=p0*.89:at(n)<=p0*1.12;let lo=1,hi=maxN;if(ok(hi))return hi;while(hi-lo>1){const m=(lo+hi)>>1;if(ok(m))lo=m;else hi=m}return lo}
function demandOf(R,id){const f=locF(R,id);return f>=1.22?'high':f<=.82?'low':''}
// every strategic tick: stations drift back toward their own surplus or shortage, and AI merchants buy low and sell high
function mkTick(){if(NET.cl)return;const L=mkStations();if(L.length<2)return;
  for(const R of L){const m=mkOf(R),p=mkProfile(R);for(const k of TRADE_ITEMS){const t=locT(k),eq=(p[k]||0)*MK_DEM.eq*t;m[k]+=(eq-m[k])*MK_DEM.rate+(Math.random()-.5)*t*.05}}
  tradersTick();
  for(const P of allPilots())intelTick(P)}
// price intel: live where you are, where your faction holds the beacon, where a friendly scout is (and next door when you fly a scout)
function intelSectors(P){const s=new Set([P.sector]);for(const id in S.beacons||{})if(S.beacons[id].owner===P.faction)s.add(id);
  for(const t of S.scouts||[])if(t.side===P.faction)s.add(t.sector);
  for(const t of S.traders||[])if(t.side===P.faction)s.add(t.sector);   // your faction's freighters and traders read the markets they pass
  for(const Q of allPilots())if(Q!==P&&Q.faction===P.faction&&isScoutCls(Q.cls))s.add(Q.sector);if(isScoutCls(P.cls)||P.cls==='wraith')for(const n of NEIGH[P.sector]||[])s.add(n);
  if(S.outposts.hollow&&(S.outposts.hollow.owner===P.faction))for(const d of SECTOR_DEFS)s.add(d.id);return s}
function intelTick(P){const first=!P.pintel;P.pintel=P.pintel||{};const live=intelSectors(P);if(first)for(const R of mkStations())if(R.owner===P.faction)live.add(R.sid);for(const R of mkStations()){if(!live.has(R.sid))continue;if(hostile(P.faction,R.owner)&&R.owner!=='neutral')continue;mkOf(R);
  const st=mkStock(R),b={},sl={},n={};for(const k of TRADE_ITEMS){const pr=stPrice(R,k);b[k]=Math.ceil(pr*(1+mFee(P.cls)));sl[k]=Math.max(1,Math.floor(pr*(1-mFee(P.cls))));n[k]=st[k]||0}P.pintel[R.sid]={T:first&&R.sid!==P.sector?S.T-600:S.T,b,s:sl,n}}}
function intelAge(e){if(!e)return'no data';const a=S.T-e.T;return a<15?'live':a<90?Math.round(a)+' s ago':Math.round(a/60)+' min ago'}
// ---- AI traders: real trade runs. A faction merchant buys a load where a good is cheap, flies it jump by jump to where it's
// dear, and only changes that market when it arrives. On the way it's a real freighter in any system someone is in, so it can
// be escorted, raced or shot down (its cargo spills as salvage and the price gap stays open). Merchants trade at their own
// faction's stations and at the freeports; money moves between treasuries, goods between stocks, so it all stays zero-sum.
const TRADER_MAX=3,TRADER_HOP=45;
// merchants trade between a faction's stations and the freeports only: between its own stations the faction's supply convoys
// move ore home and parts out (own:0; a number would let merchants take own-station gaps that wide). They need a wide gap
// (spread): left to work every narrow one, merchants sold the warehouses thin, the factions fell behind on capitals and the
// Brood won twice as often; the narrower gaps are the pilots' trade.
const TR_AI={own:0,spread:3};
function trPath(a,b){const out=[a];let cur=a;for(let k=0;k<20&&cur!==b;k++){let nx=null,bh=1e9;for(const n of NEIGH[cur]){const h=HOP[b][n];if(h<bh){bh=h;nx=n}}if(!nx)break;out.push(nx);cur=nx}return out}
// ---- logistics. A faction's core station is its warehouse (the faction stockpile). Each of its depots keeps a store of its
// own: what the depot mines goes there, its life support, works, hangar and (with a production module) its fabricators work
// from it. Goods move by freight convoy: surplus ore goes from depots to the core, components go out to depots that are
// building and to carriers in the field. Convoys are real freighters with real holds: they can be intercepted on the way
// (off-screen too), and a destroyed freighter spills half its hold as salvage where it died (the rest is wrecked into debris).
const LOGI={depotCap:260,shipRaw:120,haulMax:80,risk:{cap:.10,station:.06,brood:.05,out:.03}};
function isDepotF(R){return!!R&&R.kind==='depot'&&FAC_IDS.includes(R.owner)}
function dStore(R){return R.store||(R.store={})}
function storeOf(R){return isDepotF(R)||isFreeF(R)?dStore(R):R.owner==='player'?R.stock:S.econ.stock[R.owner]}
function haulBusy(key){return(S.traders||[]).some(t=>t.kind==='haul'&&t.key===key)}
function rawMass(o){let m=0;for(const k of RAWS)m+=o[k]||0;return m}
function haulSend(f,fromSid,toSid,load,key,why,car){const path=trPath(fromSid,toSid),mainK=Object.keys(load).sort((a,b)=>load[b]-load[a])[0];if(!mainK)return null;
  const t={id:S.nextId++,side:f,kind:'haul',key,why,car,item:mainK,n:load[mainK],from:fromSid,to:toSid,path,leg:0,sector:fromSid,next:S.T+TRADER_HOP*.5,load,cls:invMass(load)>60?'bulker':'freighter',T0:S.T};
  (S.traders=S.traders||[]).push(t);if(WORLDS[t.sector])inW(WORLDS[t.sector],()=>spawnTrader(t,false));return t}
// what a convoy is carrying, for feeds and the raid board
function haulWhat(t){const ks=Object.keys(t.load||{}).filter(k=>t.load[k]>0);return ks.slice(0,3).map(k=>`${t.load[k]} ${ITEMS[k].name}`).join(', ')+(ks.length>3?'…':'')}
// ---- convoy escort contract. A pilot signs on to a friendly convoy from the Jobs tab. Each jump the convoy makes with
// its escort in the system it leaves or the one it enters counts. Raiders sent to intercept an escorted convoy fight it out in
// the open (the escort's system is live). If the escort was there for enough of the trip when the convoy docks, the faction pays.
const ESC_CV={need:.6,base:60,hop:45,val:.04,we:2};
function cvLeft(t){return Math.max(0,t.path.length-1-t.leg)}
function cvPay(t,hops){return Math.round((ESC_CV.base+ESC_CV.hop*hops+invValue(t.load||{})*ESC_CV.val)/10)*10}
function cvSign(t,k,name){const n=cvLeft(t);t.esc={k,name,hops:0,need:Math.max(1,Math.ceil(n*ESC_CV.need))};return t.esc}
function cvStep(t,prev){const E=t.esc;if(!E)return;const ps=pSect(E.k);if(ps===prev||ps===t.sector)E.hops++}
function cvEnd(t,ok,sid){const E=t.esc;if(!E)return;t.esc=null;const f=t.side;
  if(!ok){keyFeed(E.k,`✖ Escort failed: the ${FACTIONS[f].short} convoy you were escorting was destroyed in ${DEF[sid].name}.`,'bad');return}
  if(E.hops<E.need){keyFeed(E.k,`The convoy reached ${DEF[t.to].name}, but you were with it for only ${E.hops} of the ${E.need} jumps the contract needs. No pay.`,'warn');return}
  const got=payKey(E.k,f,cvPay(t,E.hops));weAdd(f,ESC_CV.we+.5*E.hops);keyFeed(E.k,`✔ Escort complete: the convoy docked at ${DEF[t.to].name}. Command pays +${fmt(got)} cr.`,'good');legBonus(E.k,f,'a convoy escort')}
function haulLost(t,sid,by){cvEnd(t,false,sid);shipLostFeed(t,sid);const s=S.sectors[sid],inv2={},rest={};for(const k in t.load){const m=Math.floor(t.load[k]*.5+Math.random()*.6);if(m>0)inv2[k]=m;if(t.load[k]-m>0)rest[k]=t.load[k]-m}t.load={};toDebris(s,rest);if(Object.keys(inv2).length){const o=rdir(.4);s.crates.push({id:S.nextId++,x:Math.round(o.x*1600),y:Math.round(o.y*300),z:Math.round(o.z*1600),inv:inv2,until:S.T+900})}
  if(friendSide(t.side))feed(`⚠ A ${FACTIONS[t.side].short} supply convoy was destroyed in ${DEF[sid].name}. Half its cargo is drifting there as salvage.`,'bad');else if(covered(sid))feed(`A ${FACTIONS[t.side].short} supply convoy was destroyed in ${DEF[sid].name}; some salvage is drifting there.`,'news')}
// the per-tick logistics: depot industry, surplus ore home, and life support from the depot's own store
function logiTick(){for(const id in S.stations){const R=S.stations[id];if(!isDepotF(R))continue;const f=R.owner,ds=dStore(R);
    if((devOf(R).prod||0)>=1&&!starving(R)){craftDown(ds,'plate',{fe:20},10*(devOf(R).prod||1));craftDown(ds,'wire',{cu:20},10*(devOf(R).prod||1));craftAbstract(ds,'coil',1,12)}
    if(rawMass(ds)>LOGI.shipRaw&&!haulBusy('out:'+id)&&FAC_HOME(f)!==id){const load={};let room=LOGI.haulMax*BAL.aiEff;for(const k of['nu','au','xc','ir','cu','fe']){if(room<=0)break;const keep=k==='fe'||k==='cu'?40:0,n=Math.min(Math.max(0,(ds[k]||0)-keep),Math.floor(room/mass(k)));if(n>0){load[k]=inv.take(ds,k,n);room-=n*mass(k)}}
      if(Object.keys(load).length)haulSend(f,id,FAC_HOME(f),load,'out:'+id,'ore')}}}
// a depot that needs materials asks the warehouse; it ships what it can spare (keeping half the next capital kit back)
function depotAsk(R,need){const f=R.owner,key='in:'+R.sid;if(haulBusy(key))return false;const st=S.econ.stock[f];if(!st)return false;const capR=capNeed(f)||{},load={};
  for(const k in need){const lack=need[k]-(dStore(R)[k]||0);if(lack<=0)continue;const n=Math.min(lack,Math.max(0,(st[k]||0)-Math.ceil((capR[k]||0)*.5)));if(n>0)load[k]=inv.take(st,k,n)}
  if(!Object.keys(load).length)return false;haulSend(f,FAC_HOME(f),R.sid,load,key,'supplies');return true}
function trCanUse(f,R){return R&&R.kind!=='hive'&&(R.owner===f||R.owner==='neutral')}
// ---- Compact Seals: a power that needs Seals for its next capital step (shipyard, carrier, escorts) buys them at the nearest
// freeport with stock, from its treasury, and a merchant carries them home like any other cargo (it can be raided on the way)
function sealNeed(f){let n=0;if(!S.yards[f]&&!S.events.some(e=>e.type==='yardbuild'&&e.att===f))n+=CAP_SEAL.yard;if(facCar(f).length<1&&!S.events.some(e=>e.type==='frigbuild'&&e.att===f))n+=CAP_SEAL.carrier;if(facEsc(f).length<(ESC_CAP[f]||0))n+=CAP_SEAL.escort;return n}
function sealRun(f){const st=S.econ.stock[f];if(!sealed(f)||!st)return;
  const enroute=S.traders.filter(t=>t.side===f&&t.item==='seal').reduce((a,t)=>a+(t.n||0),0),short=sealNeed(f)-(st.seal||0)-enroute;if(short<=0)return;
  const home=S.stations[FAC_HOME(f)];if(!home||!trCanUse(f,home))return;
  const A=fpNear(home.sid,s=>s.seal>0);if(!A)return;const fp=dStore(A);
  const pr=Math.ceil(stPrice(A,'seal')*1.06),n=Math.min(short,fp.seal,Math.floor((S.econ.treasury[f]||0)/pr));if(n<1)return;
  const got=inv.take(fp,'seal',n);if(!got)return;transfer(f,'neutral',pr*got);mkOf(A).seal=(A.mk.seal||0)-got;
  const t={id:S.nextId++,side:f,item:'seal',n:got,from:A.sid,to:home.sid,path:trPath(A.sid,home.sid),leg:0,sector:A.sid,next:S.T+TRADER_HOP*.6,load:{seal:got},cls:'freighter',T0:S.T};S.traders.push(t);
  if(WORLDS[t.sector])inW(WORLDS[t.sector],()=>spawnTrader(t,false))}
function tradersTick(){if(NET.cl)return;S.traders=S.traders||[];for(const f of FAC_IDS)if(Math.random()<.25)sealRun(f);
  // dispatch: each faction looks for its best open gap and sends a merchant if it has a free one
  for(const f of FAC_IDS){if(S.traders.filter(t=>t.side===f&&t.kind!=='haul').length>=TRADER_MAX||Math.random()<.5)continue;const L=mkStations().filter(R=>trCanUse(f,R));if(L.length<2)continue;
    let best=null;for(const k of TRADE_ITEMS){const m=mass(k);for(const A of L){if(FP_ONLY.has(k)&&A.owner!=='neutral')continue;const sa=mkStock(A)[k]||0;if(sa<4)continue;const pa=stPrice(A,k);for(const B of L){if(A===B)continue;const pb=stPrice(B,k);const own=A.owner===f&&B.owner===f;if(own&&!TR_AI.own)continue;if(pb<pa*(own?TR_AI.own:TR_AI.spread))continue;
      if(S.traders.some(t=>t.item===k&&t.to===B.sid))continue;if(k==='au'&&A.owner==='neutral'&&B.owner==='neutral')continue;const n=Math.min(Math.floor(sa*.5),Math.floor(90*BAL.aiEff/m),Math.ceil(locT(k)*.9));if(n<3)continue;const gain=(pb-pa)*n/(1+(HOP[A.sid][B.sid]||0));if(!best||gain>best.gain)best={k,A,B,n,pa,gain}}}}
    if(!best)continue;const{k,A,B,n}=best,cost=Math.ceil(best.pa*1.06)*n,fund=S.econ.treasury[f]||0;if(A.owner==='neutral'&&fund<cost)continue;
    const src=mkStock(A);const got=inv.take(src,k,n);if(!got)continue;if(A.owner==='neutral')transfer(f,'neutral',Math.ceil(best.pa*1.06)*got);mkOf(A)[k]-=got;
    const path=trPath(A.sid,B.sid);const t={id:S.nextId++,side:f,item:k,n:got,from:A.sid,to:B.sid,path,leg:0,sector:A.sid,next:S.T+TRADER_HOP*.6,load:{[k]:got},cls:got*mass(k)>60?'bulker':'freighter',T0:S.T};S.traders.push(t);
    if(WORLDS[t.sector])inW(WORLDS[t.sector],()=>spawnTrader(t,false))}
  // travel: one jump per leg; while a trader is flying in an open system it finishes its leg there first
  for(let i=S.traders.length-1;i>=0;i--){const t=S.traders[i];
    if(t.live){const w=WORLDS[t.sector],e=w&&w.ents.find(x=>x.alive&&x.home===`trader:${t.id}:${t.side}`);if(!e){t.live=false}else if(!e.ai.arrived||inW(w,()=>gateLocked(e))){t.next=Math.max(t.next,S.T+10);continue}else{inW(w,()=>{returnHome(e);despawn(e)});t.live=false}}
    if(S.T<t.next)continue;
    if(t.kind==='haul'&&t.car){const C=S.frigates.find(x=>x.id===t.car);if(C&&C.sector!==t.to){t.to=C.sector;t.path=trPath(t.sector,t.to);t.leg=0}}
    if(t.leg>=t.path.length-1){traderArrive(t);S.traders.splice(i,1);continue}
    const prev=t.sector;t.leg++;t.sector=t.path[t.leg];t.next=S.T+TRADER_HOP;
    if(t.kind==='haul'){cvStep(t,prev);if(raidMeet(t,prev)){S.traders.splice(i,1);continue}}
    if(WORLDS[t.sector])inW(WORLDS[t.sector],()=>spawnTrader(t,true))}
  try{raidsTick()}catch(e){frameErr('raids',e)}}
function traderArrive(t){if(t.kind==='haul'){haulArrive(t);return}const B=S.stations[t.to],k=t.item,n=t.load[k]||0;
  if(!n){return}
  if(!trCanUse(t.side,B)){inv.addAll(S.econ.stock[t.side],t.load);t.load={};return}   // market gone or turned: the goods go home
  const pr=Math.max(1,Math.floor(stPrice(B,k)*.94));inv.add(mkStock(B),k,n);if(B.owner==='neutral')transfer('neutral',t.side,pr*n);mkOf(B)[k]+=n;t.load={};
  if(t.side===S.player.faction&&covered(t.to))feed(`${FACTIONS[t.side].short} trader delivered ${n} ${ITEMS[k].name} to ${B.name}.`,'news')}
// ---- shipping your own goods: from a dock with your vault, pay your faction to send a freighter for the goods in one of your
// vaults elsewhere. It flies like any supply convoy (raidable, escortable from Jobs; a lost one spills half as salvage) and
// unloads into the vault where you ordered it. The fee goes to the faction treasury.
const SHIP_T=120,SHIP_BASE=60,SHIP_PER=2;   // tonnes per shipment, flat cr, cr per tonne per jump
const shipFee=(m,j)=>Math.round(SHIP_BASE+SHIP_PER*m*Math.max(1,j));
function shipPick(inv0){const out={};let m=0;for(const k of Object.keys(inv0).filter(k=>inv0[k]>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a))){const n=Math.min(inv0[k],Math.floor((SHIP_T-m)/mass(k)));if(n>0){out[k]=n;m+=n*mass(k)}}return out}
function shipQuote(P,k){const to=vaultKey(P),src=P.vaults&&P.vaults[k],sid=vaultSid(k);if(!to||!src||!sid||k===to||!FAC_IDS.includes(P.faction)||S.unb)return null;if(!vaultOpen(k,P))return{why:vaultWhy(k,P)};
  const load=shipPick(src),m=invMass(load);if(!m)return null;const j=HOP[sid][P.sector]||0;return{load,m,j,fee:shipFee(m,j),all:m>=invMass(src)}}
function shipOrder(P,k){const q=shipQuote(P,k);if(!q||q.why)return q&&q.why?`Can't ship from there: ${q.why}.`:'Nothing to ship.';if(P.credits<q.fee)return`Shipping costs ${fmt(q.fee)} cr.`;
  const src=P.vaults[k];for(const i in q.load)inv.take(src,i,q.load[i]);if(!invMass(src))delete P.vaults[k];transfer('player',P.faction,q.fee);
  const t=haulSend(P.faction,vaultSid(k),P.sector,q.load,'ship:'+S.nextId,`${P.name||'a pilot'}'s goods`,null);if(!t){inv.addAll(src,q.load);return'No route.'}t.own={k:pkey(),to:vaultKey(P),from:k};
  return`✓ A ${FACTIONS[P.faction].short} freighter is bringing ${fmt(q.m)} t from ${vaultName(k)} (${q.j} jump${q.j===1?'':'s'}) for ${fmt(q.fee)} cr.${q.all?'':' That was a full load: order again for the rest.'} It can be raided on the way; pilots can escort it from Jobs.`}
function shipArrive(t){const o=t.own,P=isMe(o.k)?S.player:S.pilots&&S.pilots[o.k];if(!P){inv.addAll(S.econ.stock[t.side]||S.econ.stock.pirate,t.load);t.load={};return}
  const what=haulWhat(t);if(P.vaultAt===o.to)inv.addAll(P.vault,t.load);else{P.vaults=P.vaults||{};inv.addAll(P.vaults[o.to]=P.vaults[o.to]||{},t.load)}t.load={};
  keyFeed(o.k,`📦 Your shipment reached your vault at ${vaultName(o.to)}: ${what}.`,'good')}
function shipLostFeed(t,sid){if(t.own)keyFeed(t.own.k,`⚠ The freighter carrying your goods from ${vaultName(t.own.from)} was destroyed in ${DEF[sid].name}. Half the cargo is drifting there as salvage.`,'bad')}
function haulArrive(t){const f=t.side;let into=null;cvEnd(t,true);if(t.own){shipArrive(t);return}
  if(t.car){const C=S.frigates.find(x=>x.id===t.car);if(C){C.store=C.store||{};into=C.store}}
  else{const B=S.stations[t.to];if(B&&B.owner===f)into=storeOf(B)}
  if(!into)into=S.econ.stock[f]||S.econ.stock.pirate;inv.addAll(into,t.load);t.load={}}
// the freighter itself: flies from the gate it came in by to the gate it leaves by (or the station at either end)
function spawnTrader(t,arrive){const e=makeNPC('trader',t.side,t.cls,1,t.load,`trader:${t.id}:${t.side}`);t.load={};t.live=true;const gs=GATES[t.sector]||[];
  const prev=t.path[t.leg-1],nxt=t.path[t.leg+1],gin=gs.find(g=>g.to===prev),gout=gs.find(g=>g.to===nxt),SE=W.stationEnt;
  const fresh=arrive||(t.leg>0&&S.T-(t.next-TRADER_HOP)<30);   // just jumped in when the system opened: still by its entry gate
  const start=fresh&&gin?{x:gin.x*.93,y:gin.y*.93,z:gin.z*.93}:t.leg===0&&SE?{x:SE.x+150,y:SE.y+40,z:SE.z}:randPos(700*SPACE,1800*SPACE);
  e.x=start.x;e.y=start.y;e.z=start.z;const dest=gout?W.ents.find(x=>x.type==='gate'&&x.to===nxt):(t.leg>=t.path.length-1?(t.car?(W.ents.find(x=>x.tok&&x.tok.id===t.car&&x.alive)||SE):SE):null);e.ai.dest=dest||{x:0,y:0,z:0};
  if(arrive&&gin)fxWarp(e,sideCol(t.side));faceInstant(e,e.ai.dest.x-e.x,e.ai.dest.y-e.y,e.ai.dest.z-e.z);e.tradeT=t;W.ents.push(e);return e}
function traderThink(e,dt){const D=e.ai.dest,hit=W.t-e.lastHit<5;e.boosting=hit;if(e.ai.arrived){brake(e,dt);return}
  const d=steer(e,D.x,D.y,D.z,dt,true,hit?1.15:.8);faceTo(e,D,dt);e.thrusting=true;if(d<(D.type==='gate'?260:220)&&!(D.type==='gate'&&gateLocked(e))){e.ai.arrived=true;if(D.type==='gate')fxWarp(e,sideCol(e.side))}}
function traderLost(e){const id=e.home.split(':')[1],t=(S.traders||[]).find(x=>String(x.id)===id);if(!t)return;S.traders=S.traders.filter(x=>x!==t);
  if(t.kind==='haul'){cvEnd(t,false,W.sid);shipLostFeed(t,W.sid);if(friendSide(e.side))feed(`⚠ A ${FACTIONS[e.side].short} supply convoy was destroyed in ${DEF[W.sid].name}. Half its cargo is drifting there as salvage.`,'bad');else if(W===LW)feed(`${FACTIONS[e.side].short} supply convoy destroyed: half its hold is drifting free.`,'good');return}
  if(friendSide(e.side))feed(`${FACTIONS[e.side].short} trader carrying ${ITEMS[t.item].name} was destroyed in ${DEF[W.sid].name}.`,'bad');else if(W===LW)feed(`${FACTIONS[e.side].short} trader destroyed: its ${ITEMS[t.item].name} is drifting free.`,'good')}
function tradersEnRoute(P){return(S.traders||[]).filter(t=>t.side===P.faction||covered(t.sector))}
// the trade screen: best runs between stations you have prices for, and the demand board for every friendly market
function tradeHtml(c,P){intelTick(P);const I=P.pintel||{},p=W.player,cap=p.st.cargo,free=Math.max(0,cap-invMass(P.cargo)),mk=mkStations().filter(R=>R.owner===P.faction||R.owner==='neutral');
  const known=mk.filter(R=>I[R.sid]);let h=`<p class="note" style="margin:0 0 12px">Prices are live where you are docked, where ${esc(FAC(P.faction).short)} holds the sector beacon and where a friendly scout is (and the next systems over when you fly a scout). Elsewhere you see the last reading and its age. Every sale goes at the price you see, up to the lot the market can absorb at that price; the market moves after it. Faction traders fly the same gaps for real: they only move a price when they dock.</p>`;
  const runs=[];for(const k of TRADE_ITEMS){const m=mass(k);for(const A of known)for(const B of known){if(A===B)continue;const a=I[A.sid],b=I[B.sid];if(!(a.n[k]>0))continue;const per=b.s[k]-a.b[k];if(per<=0)continue;
      const units=Math.min(a.n[k],Math.floor(cap/m)),tot=per*units,j=HOP[A.sid][B.sid]||0,j0=HOP[P.sector][A.sid]||0;runs.push({k,A,B,per,units,tot,j,j0,score:tot/(1+j+j0*.5),age:Math.max(S.T-a.T,S.T-b.T)})}}
  runs.sort((x,y)=>y.score-x.score);const seen=new Set(),top=[];for(const r of runs){const key=r.k+r.A.sid;if(seen.has(key))continue;seen.add(key);top.push(r);if(top.length>=8)break}
  h+=`<div class="h3">Best runs for your ${cap} t hold</div>`;
  if(top.length){h+=`<div class="tblw"><table class="t"><thead><tr><th>Cargo</th><th>Buy at</th><th class="r">Buy</th><th>Sell at</th><th class="r">Sell</th><th class="r">Per unit</th><th class="r">Full hold</th><th class="r">Jumps</th><th class="r">Data</th><th></th></tr></thead><tbody>`;
    for(const r of top)h+=`<tr><td class="iname">${sw(r.k)}${esc(ITEMS[r.k].name)}</td><td><span style="color:${sideCol(r.A.owner)}">${esc(r.A.name)}</span><br><span class="mass" style="margin:0">${esc(DEF[r.A.sid].name)} · ${r.j0?r.j0+' jump'+(r.j0>1?'s':'')+' away':'here'}</span></td><td class="r num">${fmt(I[r.A.sid].b[r.k])}</td><td><span style="color:${sideCol(r.B.owner)}">${esc(r.B.name)}</span><br><span class="mass" style="margin:0">${esc(DEF[r.B.sid].name)}</span></td><td class="r num">${fmt(I[r.B.sid].s[r.k])}</td><td class="r num" style="color:var(--ok)">+${fmt(r.per)}</td><td class="r num" style="color:var(--ok)">+${fmt(r.tot)}<br><span class="mass" style="margin:0">${r.units} × ${mass(r.k)} t</span></td><td class="r num">${r.j}</td><td class="r"><span class="mass" style="margin:0">${r.age<15?'live':Math.round(r.age/60)>0?Math.round(r.age/60)+' min':Math.round(r.age)+' s'}</span></td><td><div class="act"><button class="btn sm" data-act="croute" data-arg="${(P.cargo[r.k]||0)>0?r.B.sid:r.A.sid}" ${((P.cargo[r.k]||0)>0?r.B.sid:r.A.sid)===P.sector?'disabled':''}>${(P.cargo[r.k]||0)>0?(r.B.sid===P.sector?'Sell here':'Course to sell'):(r.A.sid===P.sector?'Buy here':'Course to buy')}</button></div></td></tr>`;
    h+=`</tbody></table></div><p class="note">Hold free now: ${free} t. Full-hold profit assumes an empty ${cap} t hold and the stock on hand at the buying station.</p>`}
  else h+=`<div class="empty">No profitable run between the markets you have prices for. Flip beacons or send scouts out to see more of the galaxy's prices.</div>`;
  {const tr=tradersEnRoute(P).filter(t=>t.load&&Object.keys(t.load).length||t.live).slice(0,10);h+=`<div class="h3" style="margin-top:18px">Traders on the lanes</div>`;
    h+=tr.length?`<div class="tblw"><table class="t"><thead><tr><th>Trader</th><th>Cargo</th><th>From</th><th>To</th><th>Now in</th><th class="r">Arrives</th></tr></thead><tbody>`+tr.map(t=>{const left=(t.path.length-1-t.leg)*TRADER_HOP+Math.max(0,t.next-S.T);return`<tr><td style="color:${sideCol(t.side)}">${esc(FACTIONS[t.side].short)} ${t.cls==='bulker'?'bulker':'freighter'}</td><td class="iname">${sw(t.item)}${t.n} ${esc(ITEMS[t.item].name)}</td><td>${esc(S.stations[t.from]?S.stations[t.from].name:DEF[t.from].name)}</td><td>${esc(S.stations[t.to]?S.stations[t.to].name:DEF[t.to].name)}</td><td>${esc(DEF[t.sector].name)}${t.sector===P.sector?' · <b>here</b>':''}</td><td class="r num">${fmtT(left)}</td></tr>`}).join('')+`</tbody></table></div><p class="note">A trader changes its destination's price only when it docks. Beat it there, escort your own, or stop a rival's: its cargo spills as salvage and the gap stays open.</p>`:'<div class="empty">No traders you know of are on the lanes right now.</div>'}
  h+=`<div class="h3" style="margin-top:18px">Demand board</div><div class="dboard">`;
  for(const R of mk.sort((a,b)=>(HOP[P.sector][a.sid]||0)-(HOP[P.sector][b.sid]||0))){const e=I[R.sid],j=HOP[P.sector][R.sid]||0;let hi=[],lo=[];
    if(e)for(const k of TRADE_ITEMS){const base=baseValue(k),r=e.s[k]/(base*.94);if(r>=1.22)hi.push([k,r]);else if(r<=.8&&e.n[k]>0)lo.push([k,r])}
    hi.sort((a,b)=>b[1]-a[1]);lo.sort((a,b)=>a[1]-b[1]);
    h+=`<div class="dcard"><div class="dch"><b style="color:${sideCol(R.owner)}">${esc(R.name)}</b><span>${esc(DEF[R.sid].name)} · ${j?j+' jump'+(j>1?'s':''):'here'} · ${intelAge(e)}</span></div>`+
      (e?`<div class="dcr"><em>Wants</em>${hi.length?hi.slice(0,5).map(([k,r])=>`<span class="dchip hi">${esc(ITEMS[k].name)} ${fmt(e.s[k])} <i>+${Math.round((r-1)*100)}%</i></span>`).join(''):'<span class="mass" style="margin:0">nothing pressing</span>'}</div>
        <div class="dcr"><em>Cheap</em>${lo.length?lo.slice(0,5).map(([k,r])=>`<span class="dchip lo">${esc(ITEMS[k].name)} ${fmt(e.b[k])} <i>−${Math.round((1-r)*100)}%</i></span>`).join(''):'<span class="mass" style="margin:0">no bargains</span>'}</div>`
      :`<div class="dcr"><span class="mass" style="margin:0">No prices yet: flip its beacon, send a scout, or visit.</span></div>`)+`</div>`}
  return h+`</div>`}
