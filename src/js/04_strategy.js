//@src 04_strategy.js
// ============================================================ strategic sim
function strategicTick(){
  const T=S.T;
  for(const d of SECTOR_DEFS){
    const s=S.sectors[d.id],here=!!WORLDS[d.id];
    {const R=S.stations[d.id];if(R){const cn=R.owner!=='player'&&!here&&S.T>150&&FACTIONS[R.owner]&&capNeed(R.owner),n=here&&R.owner!=='player'?0:Math.round((here?2:R.kind==='core'?5:R.kind==='hive'?BAL.brHive:R.owner==='player'?3:4)*(cn?2.2:1)*(BAL.ext[R.owner]||1)*(R.owner==='player'||R.owner==='brood'?1:BAL.aiEff))+devOf(R).store;
      if(R.owner==='player'){if(invMass(R.stock)<400+300*devOf(R).store)inv.addAll(R.stock,extract(s,n))}else if(n>0&&isDepotF(R)){const ds=dStore(R);if(invMass(ds)<LOGI.depotCap+120*devOf(R).store){const got=extract(s,n,false,{});inv.addAll(ds,got);if(R.mk)for(const k in got)R.mk[k]=(R.mk[k]||0)+got[k]*.3}}else if(n>0){const st=storeOf(R)||{},sc=mkSc(R);const full=(st.fe||0)+(st.cu||0)>=((R.owner==='brood'?1000:500)+250*devOf(R).store)*sc,nuW=(st.nu||0)<120*sc&&d.ores&&d.ores.nu;if(!full||nuW){const got=extract(s,n,(st.xc||0)>=30*sc,{ir:(st.ir||0)>400*sc,xc:(st.xc||0)>300*sc,fe:full,cu:full});inv.addAll(st,got);if(R.mk)for(const k in got)R.mk[k]=(R.mk[k]||0)+got[k]*.3}}
      if(!here&&!underCapSiege(d.id,R.owner)){R.shield=R.sMax;R.hull=Math.min(R.hMax,R.hull+R.hMax*.05)}}}
    const oid=OUT_BY_SECTOR[d.id];
    if(oid){const o=S.outposts[oid];if(o.owner){
      if(o.type==='yard'){for(const e of RAWS){const m=Math.min(s.debris[e],2+o.level);s.debris[e]-=m;inv.add(o.stock,e,m)}}
      else if(!WORLDS[d.id])inv.addAll(o.stock,extract(s,2+o.level));
      if(FACTIONS[o.owner]){for(const k in o.stock){if(o.stock[k]>25)inv.add(S.econ.stock[o.owner],k,inv.take(o.stock,k,o.stock[k]-25))}}
      if(o.owner==='pirate'){for(const k in o.stock)inv.add(S.econ.stock.pirate,k,inv.take(o.stock,k,o.stock[k]))}
      if(!here){const os=oStats(o);if(o.breached&&T>o.breached+90)o.breached=0;if(!o.breached){o.shield=os.sMax;o.hull=Math.min(os.hMax,o.hull+os.hMax*.12)}}
    }}
    regrow(s);
    for(let i=s.crates.length-1;i>=0;i--){const c=s.crates[i];if(T>c.until){toDebris(s,c.inv);s.crates.splice(i,1)}}
    for(const w of(s.wrecks||[]).slice())if(T>=w.until)wreckGone(s,w);
    for(let i=s.ast.length-1;i>=0;i--){const a=s.ast[i];if(a.comet&&T>a.until){toDebris(s,a.ore);s.ast.splice(i,1);if(W&&W.tgt&&W.tgt.ref===a)W.tgt=null}}
  }
  diffuse();scoutsTick();beaconTick();bcnMissionsTick();cReqTick();mkTick();coalTick();threatTick();capitalTick();victoryTick();campTick();for(const ev of S.events)announce(ev);
  for(const f of FAC_IDS)factionIndustry(f);try{patTick()}catch(e){frameErr('patronage',e)}factionIndustry('brood');neutralIndustry();lifeTick();devTick();hgTick();logiTick();weTick();carTick();sortieTick();wkRepair();fpContracts();blkContracts();contContracts();
  pirateIndustry();
  const h=S.outposts.hollow;
  if(h.owner){let got=0;for(const f of FAC_IDS){if(f===h.owner)continue;got+=transfer(f,h.owner,22)}if(h.owner==='player'){S.tollAcc+=got;if(S.tollAcc>=300){feed(`Hollow Relay tolls: +${fmt(S.tollAcc)} cr`,'good');S.tollAcc=0}}}
  for(const f of[...FAC_IDS,'pirate','brood'])if(T>=S.ai[f].next){S.ai[f].next=T+(f==='pirate'?rnd(110,170):f==='brood'?rnd(95,150)*BAL.brOff:rnd(75,135));planOffensive(f)}
  for(const f of[...FAC_IDS,'brood'])if(T>=(S.ai[f].build||0)){S.ai[f].build=T+(f==='brood'?rnd(220,340)*BAL.brBuild:rnd(150,260));planBuild(f)}
}
// Xenocrystal seams: a small, limited vein in each faction's home system, so every faction (and its pilots) can make Lattice and Cores
// without holding a Forge. Mass stays conserved: the seam is refilled only by drawing xenocrystal from drifting debris or from distant fields.
const SEAM_CAP=90,SEAM_N=3;
// old saves: the home crystal seams go back to the outer drift (recycled into rock elsewhere), so nothing is lost
function seamClear(){for(const f of FAC_IDS){const s=S.sectors[FAC_HOME(f)];if(!s)continue;for(const a of s.ast.filter(x=>x.seam)){S.drift=S.drift||{};for(const k in a.ore)S.drift[k]=(S.drift[k]||0)+a.ore[k];a.ore={};removeAst(s,a)}}}
function facCar(f){return S.frigates.filter(x=>x.side===f&&isCar(x))}
function capNeed(f){if(!S.yards[f])return yardCost(f);if(facCar(f).length<1)return carCostF(f);return null}
// ---- AI imports at market prices: a faction short of ore buys at the cheapest freeport (its price after a small per-jump
// allowance), pays that freeport's buy price (Halcyon's Trade Charter takes 20% off on its charter ticks), moves the freeport's
// local supply level like any purchase, and the goods fly home on a supply convoy that can be raided or escorted.
// Goods already in flight count toward stock, so a faction doesn't re-order while its freight is on the way.
const IMP={hal:.8,floor:20000,hop:.04};
function impEnroute(f,k){let n=0;for(const t of S.traders||[])if(t.side===f&&t.kind==='haul'&&String(t.key).startsWith('imp:'+f+':'))n+=(t.load&&t.load[k])||0;return n}
function fpImport(f,k,n,toSid,keep,disc,floor,pfx){if(!(n>=1)||!S.stations[toSid])return 0;let best=null;
  for(const F of FREEPORTS){const R=S.stations[F.sid];if(!isFreeF(R))continue;const fs=dStore(R),av=(fs[k]||0)-(keep||0);if(av<1)continue;mkOf(R);
    const pr=Math.ceil(stPrice(R,k)*1.06*(disc||1)),sc=pr*(1+IMP.hop*(HOP[R.sid][toSid]||0));if(!best||sc<best.sc)best={R,fs,pr,av,sc}}
  if(!best)return 0;const fund=(S.econ.treasury[f]||0)-(floor||0),m=Math.min(Math.floor(n),best.av,Math.floor(fund/best.pr));if(m<1)return 0;
  const got=inv.take(best.fs,k,m);if(!got)return 0;transfer(f,'neutral',best.pr*got);best.R.mk[k]=(best.R.mk[k]||0)-got;
  haulSend(f,best.R.sid,toSid,{[k]:got},(pfx||'imp:'+f+':')+k+':'+S.nextId,pfx?'sponsored supplies':'imports');return got}
// ---- hull insurance (optional): 30 minutes of cover on the hull you fly, bought at a shipyard. A covered loss pays a voucher
// for 70% of the hull's price toward another of the same class (never cash), so dying can't beat the trade-in. The premium is
// 12% of the price (fair is about 7% at one loss every 5 hours, so cover is a credit sink on average), +50% for each bought hull
// lost in the last 3 hours, up to 3x. A hull bought with a voucher trades in on what was actually paid.
const INS={rate:.12,pay:.7,cover:1800,maxAhead:3600,win:10800,load:.5,max:3};
function insurable(cls){return!!cls&&!START_HULLS.includes(cls)&&cls!=='wraith'&&!(S&&S.unb)&&hullPrice(cls)>0}
function insQuote(P){if(!insurable(P.cls))return null;const n=(P.lossT||[]).filter(t=>S.T-t<INS.win).length,k=Math.min(INS.max,1+INS.load*n);return{n,k,prem:Math.ceil(hullPrice(P.cls)*INS.rate*k/10)*10}}
function insLive(P){return P.policy&&P.policy.cls===P.cls&&P.policy.until>S.T?P.policy:null}
function vchOf(P,k){return P.voucher&&P.voucher.cls===k?Math.min(hullPrice(k),P.voucher.amt):0}
function insLoss(P,lost){P.lossT=(P.lossT||[]).filter(t=>S.T-t<INS.win);P.lossT.push(S.T);P.hullPaid=undefined;
  if(P.policy&&P.policy.cls===lost&&P.policy.until>=S.T){const amt=Math.round(hullPrice(lost)*INS.pay);P.voucher={cls:lost,amt};
    feed(`🛡 Your ${FAC(P.faction).hulls[lost]} was insured: a ${fmt(amt)} cr voucher toward another one is waiting at any shipyard.`,'good')}
  P.policy=null}
function insBuy(c){const P=S.player,q=insQuote(P);if(!q){dockErr='Starter hulls need no insurance.';return}if(!c.wallet||!(FACTIONS[c.wallet]||c.wallet==='neutral')){dockErr='Insurance is sold at faction and freeport shipyards.';return}
  const L=insLive(P),from=L?L.until:S.T;if(from-S.T+INS.cover>INS.maxAhead){dockErr=`You can hold at most ${INS.maxAhead/60} minutes of cover.`;return}
  if(P.credits<q.prem){dockErr=`Cover costs ${fmt(q.prem)} cr.`;return}transfer('player',c.wallet,q.prem);P.policy={cls:P.cls,until:from+INS.cover};
  dockErr=`✓ Insured for ${Math.round((P.policy.until-S.T)/60)} minutes: ${fmt(q.prem)} cr to the ${sideName(c.wallet)} treasury.`}
function insHtml(c,P){if(S.unb||!c.wallet||!(FACTIONS[c.wallet]||c.wallet==='neutral'))return'';const q=insQuote(P),L=insLive(P),v=P.voucher,HN=k=>esc(FAC(P.faction).hulls[k]||k);
  let h=`<div class="h3" style="margin-top:22px">Hull insurance · optional</div><p class="note" style="margin-top:0">Pay for ${INS.cover/60} minutes of cover on the hull you're flying. If it's destroyed in that time, you get a voucher for ${Math.round(INS.pay*100)}% of its price toward another of the same class, at any shipyard. The premium is ${Math.round(INS.rate*100)}% of the hull's price, plus ${Math.round(INS.load*100)}% for each bought hull you lost in the last ${INS.win/3600} hours (up to ${INS.max}×). Cargo and fitted upgrades aren't covered: they drop into the wreck as usual.</p>`;
  if(v)h+=`<p class="note" style="color:var(--ok)">Voucher held: ${fmt(v.amt)} cr toward ${art(FAC(P.faction).hulls[v.cls]||v.cls).toLowerCase()} ${HN(v.cls)}. It comes off the price when you buy one below.</p>`;
  if(!q)h+=`<p class="note">Your ${HN(P.cls)} is a starter hull: nothing to insure.</p>`;
  else h+=`${L?`<p class="note" style="color:var(--ok)">Covered: ${Math.ceil((L.until-S.T)/60)} min left.</p>`:''}<div class="act"><button class="btn" type="button" data-act="insure" ${P.credits>=q.prem&&(L?L.until:S.T)-S.T+INS.cover<=INS.maxAhead?'':'disabled'}>${L?'Extend cover':'Insure'} on your ${HN(P.cls)} · ${INS.cover/60} min · ${fmt(q.prem)} cr</button></div>${q.n?`<p class="note">Premium ×${q.k}: ${q.n} hull${q.n>1?'s':''} lost in the last ${INS.win/3600} hours.</p>`:''}`;
  return h}
// ---- patronage: sponsor your faction's next station module or capital ship (Station → Patronage). Nothing is paid back:
// the faction buys what the project is missing (freeport imports at market price, shipped by convoy, or supplies from its own
// warehouse) and builds it as soon as the goods are in place. Price = market value of the project's goods × 1.5, × (1 + 0.35 per
// module the station already has) for station work (× 1.25 at a core station), × 1.25 for a carrier and × 1.1 for a shipyard.
// A sponsored capital is rushed into the slip as soon as its kit is complete and carries the patron's chosen name.
const PAT={mul:1.5,lvl:.35,core:1.25,cap:{yard:1.1,car:1.25,esc:1},we:200,under:1.5,budget:.9,fly:4};
const PAT_NAME={yard:'capital shipyard',car:'carrier',esc:'escort'};
function patList(f){S.pat=S.pat||{};return S.pat[f]=S.pat[f]||[]}
function patOn(f,kind){return!!(S.pat&&(S.pat[f]||[]).some(p=>p.kind===kind))}
function patVal(f,kit){const C=S.stations[FAC_HOME(f)],st=S.econ.stock[f]||{};let v=0;for(const k in kit)v+=(C&&C.owner===f?stPrice(C,k):price(st,k))*kit[k];return v}
function patKit(f,kind){return kind==='yard'?yardCost(f):kind==='car'?carCostF(f):escCost(f)}
function patOpts(f,R){const out=[],L=patList(f);
  if(R&&R.owner===f){const lv=devUsed(R)+devOf(R).life;for(const k of DEV_KEYS){const r=devNext(R,k);if(!r||L.some(p=>p.kind==='dev'&&p.sid===R.sid&&p.k===k))continue;
    out.push({id:`dev:${R.sid}:${k}`,kind:'dev',sid:R.sid,k,name:`${DEV_TXT[k][0]} level ${(devOf(R)[k]||0)+1}`,kit:r,price:Math.ceil(patVal(f,r)*PAT.mul*(1+PAT.lvl*lv)*(R.kind==='core'?PAT.core:1)/50)*50})}}
  const yb=S.events.some(e=>e.type==='yardbuild'&&e.att===f),fb=S.events.some(e=>e.type==='frigbuild'&&e.att===f),eb=S.events.filter(e=>e.type==='escbuild'&&e.att===f&&e.stage!=='done').length;
  const caps=[];if(!S.yards[f]&&!yb)caps.push('yard');if(S.yards[f]&&facCar(f).length<1&&!fb)caps.push('car');if(S.yards[f]&&facEsc(f).length+eb<(ESC_CAP[f]||0))caps.push('esc');
  for(const kind of caps){if(patOn(f,kind))continue;const kit=patKit(f,kind);out.push({id:kind,kind,name:PAT_NAME[kind][0].toUpperCase()+PAT_NAME[kind].slice(1),kit,price:Math.ceil(patVal(f,kit)*PAT.mul*PAT.cap[kind]/50)*50,cap:1})}
  return out}
function patUnder(f){let lo=null,ln=1e9;for(const g of FAC_IDS){const n=territory(g).size;if(n<ln){ln=n;lo=g}}return lo===f}
function patClean(s){return String(s||'').replace(/[^\p{L}\p{N} '\-.]/gu,'').replace(/\s+/g,' ').trim().slice(0,24)}
function patBuy(c,arg){const P=S.player,f=P.faction,[id,nm]=String(arg).split('|');if(S.unb||!FAC_IDS.includes(f)||c.owner!==f){dockErr='Patronage is open at your own faction\'s stations.';return}
  const o=patOpts(f,S.stations[P.sector]).find(x=>x.id===id);if(!o){dockErr='That project is no longer open for sponsorship.';return}if(P.credits<o.price){dockErr=`Sponsoring it costs ${fmt(o.price)} cr.`;return}
  const paid=transfer('player',f,o.price);if(paid<o.price){if(paid)transfer(f,'player',paid);dockErr='Not enough credits.';return}
  const ship=o.cap&&o.kind!=='yard'?patClean(nm):'';patList(f).push({id:S.nextId++,kind:o.kind,sid:o.sid||null,k:o.k||null,name:o.name,ship,by:pkey(),who:P.name||'a pilot',T:S.T,paid,spent:0});
  const und=patUnder(f);weAdd(f,paid/PAT.we*(und?PAT.under:1));
  facFeed(f,`★ ${esc(P.name||'A pilot')} has sponsored ${o.cap?`the next ${FACTIONS[f].short} ${PAT_NAME[o.kind]}${ship?` (to be named ${esc(ship)})`:''}`:`a ${o.name} at ${S.stations[o.sid].name}`}.`,'good');
  dockErr=`✓ Sponsored for ${fmt(paid)} cr. ${FACTIONS[f].short} is buying what it's missing${o.cap?' and will rush it into the slip':''}.${und?' Your faction holds the least territory: the sponsorship counts 1.5× toward its war effort.':''}`}
function patEnroute(p,k){let n=0;for(const t of S.traders||[])if(t.kind==='haul'&&String(t.key).startsWith('pat:'+p.id+':'))n+=(t.load&&t.load[k])||0;return n}
// at most one new shipment per project per tick, and a few in flight at once, so a sponsorship doesn't flood the lanes
function patFlying(p){let n=0;for(const t of S.traders||[])if(t.kind==='haul'&&String(t.key).startsWith('pat:'+p.id+':'))n++;return n}
function patSupply(f,p,kit,toSid,srcs){if(p.spent>=p.paid*PAT.budget||patFlying(p)>=PAT.fly)return;const home=FAC_HOME(f),st=S.econ.stock[f]||{},toHome=toSid===home||srcs.includes(st);
  for(const k in kit){const miss=kit[k]-countIn(k,srcs)-patEnroute(p,k);if(miss<=0)continue;
    if(!toHome){const spare=Math.min(miss,Math.max(0,(st[k]||0)-Math.ceil(((capNeed(f)||{})[k]||0)*.5)));if(spare>0){const got=inv.take(st,k,spare);if(got){haulSend(f,home,toSid,{[k]:got},`pat:${p.id}:${k}:${S.nextId}`,'sponsored supplies');return}}}
    if(fpImportPat(f,k,miss,toSid,p)>0)return;if(!ITEMS[k].recipe||RAWS.includes(k))continue;
    for(const i in ITEMS[k].recipe){const need=ITEMS[k].recipe[i]*miss-(st[i]||0)-patEnroute(p,i);if(need>0&&fpImportPat(f,i,need,home,p)>0)return}}}
function fpImportPat(f,k,n,toSid,p){const t0=S.econ.treasury[f]||0,lim=Math.max(0,p.paid*PAT.budget-p.spent),floor=Math.max(0,t0-lim);
  const got=fpImport(f,k,n,toSid,0,1,floor,'pat:'+p.id+':');p.spent+=t0-(S.econ.treasury[f]||0);return got}
function patTick(){if(NET.cl||!S.pat)return;for(const f of FAC_IDS){const L=S.pat[f];if(!L||!L.length)continue;const st=S.econ.stock[f]||{};
  for(let i=L.length-1;i>=0;i--){const p=L[i];
    if(p.kind==='dev'){const R=S.stations[p.sid];if(!R||R.owner!==f){L.splice(i,1);keyFeed(p.by,`Your sponsorship of the ${p.name} lapsed: the station is no longer ${FACTIONS[f].short}.`,'warn');continue}
      const r=devNext(R,p.k);if(!r){L.splice(i,1);keyFeed(p.by,`${R.name} can't take the ${DEV_TXT[p.k][0]} you sponsored any more; your credits stay with ${FACTIONS[f].short}.`,'warn');continue}
      const srcs=isDepotF(R)?[dStore(R)]:[st];if(haveIn(r,srcs)&&devBuild(R,p.k,srcs)){L.splice(i,1);const lvl=devOf(R)[p.k];facFeed(f,`★ ${R.name} has ${lvl>1?'upgraded its':'added a'} ${DEV_TXT[p.k][0]}${lvl>1?' to level '+lvl:''}, sponsored by ${esc(p.who)}.`,'good');continue}
      patSupply(f,p,r,R.sid,srcs);continue}
    const ok=p.kind==='yard'?!S.yards[f]:S.yards[f]&&(p.kind==='car'?facCar(f).length<1:facEsc(f).length<(ESC_CAP[f]||0));
    const building=S.events.some(e=>e.att===f&&e.stage!=='done'&&e.type===(p.kind==='yard'?'yardbuild':p.kind==='car'?'frigbuild':'escbuild'));
    if(!ok&&!building){L.splice(i,1);continue}if(!building)patSupply(f,p,patKit(f,p.kind),FAC_HOME(f),[st])}}}
function patLaunch(f,type,t){const kind=type==='yardbuild'?'yard':type==='frigbuild'?'car':type==='escbuild'?'esc':null,L=S.pat&&S.pat[f];if(!kind||!L)return;const i=L.findIndex(p=>p.kind===kind);if(i<0)return;const p=L.splice(i,1)[0];
  if(t&&p.ship)t.name=p.ship;keyFeed(p.by,`★ The ${FACTIONS[f].short} ${PAT_NAME[kind]}${t?' '+esc(t.name):''} you sponsored is ${kind==='yard'?'complete':'launched'}.`,'good')}
function patOK(c,P){return!S.unb&&FAC_IDS.includes(P.faction)&&c.kind==='station'&&c.owner===P.faction}
function patronHtml(c,P){const f=P.faction,R=S.stations[P.sector],opts=patOpts(f,R),L=patList(f);
  let h=`<p class="note" style="margin:0 0 12px">Sponsor ${FACTIONS[f].short}'s next station module or capital ship. Nothing is paid back: ${FACTIONS[f].short} spends your credits on the goods the project is missing, buying from freeports at market price or shipping from its warehouse, and builds it once everything is in place. Station work costs more the more developed the station is; a carrier costs more than a shipyard, and a shipyard more than an escort. You name a capital ship you sponsor, and every sponsorship counts toward the faction's war effort${patUnder(f)?' (1.5× now: your faction holds the least territory)':''}.</p>`;
  if(opts.some(o=>o.cap&&o.kind!=='yard'))h+=`<div class="mprow" style="padding:0;margin:0 0 12px"><input class="mpin" id="patName" maxlength="24" placeholder="Name for a capital ship you sponsor" value="${esc(P.patName||'')}"></div>`;
  if(!opts.length)h+=`<p class="note">Nothing here is open for sponsorship right now.</p>`;
  else{h+=`<div class="tblw"><table class="t"><thead><tr><th>Project</th><th>Goods</th><th class="r">Price</th><th></th></tr></thead><tbody>`;
    for(const o of opts)h+=`<tr><td>${esc(o.name)}${o.cap?'':`<br><span class="mass">${esc(R.name)}</span>`}</td><td><span style="display:flex;flex-wrap:wrap;gap:3px">${Object.keys(o.kit).map(k=>`<span class="req">${o.kit[k]} ${esc(ITEMS[k].name)}</span>`).join('')}</span></td><td class="r num">${fmt(o.price)} cr</td><td><button class="btn sm" type="button" data-act="patron" data-arg="${o.id}" ${P.credits>=o.price?'':'disabled'}>Sponsor</button></td></tr>`;
    h+=`</tbody></table></div>`}
  if(L.length){h+=`<div class="h3" style="margin-top:18px">Sponsored and under way</div>`;for(const p of L){const R2=p.sid&&S.stations[p.sid];h+=`<p class="note" style="margin:4px 0">${esc(p.name)}${R2?' at '+esc(R2.name):''}${p.ship?` · to be named ${esc(p.ship)}`:''} · sponsored by ${esc(p.who)} for ${fmt(p.paid)} cr</p>`}}
  return h}
// ---- hired wingmen (Jobs → Hire pilots): a 30-minute contract, paid up front to your faction's treasury, for an AI pilot who
// falls in on your wing whenever you're in space. Its ship is kitted from the faction's fleet and warehouse stock like any
// patrol and its kit goes back when it leaves, so nothing is created. If it's shot down its kit spills as salvage and a
// replacement arrives 4 minutes later; the contract clock keeps running. Bounties count only your own damage, as always.
const HIRE={cls:{interceptor:600,striker:1000,heavy:1600},T:1800,maxAhead:3600,re:240};
const HIRE_E={};   // runtime only: pilot key → {e, sid} of the wingman now flying
function hireOK(c,P){return!S.unb&&FAC_IDS.includes(P.faction)&&c.kind==='station'&&c.owner===P.faction}
function hireLive(P){return P.hire&&P.hire.fac===P.faction&&P.hire.until>S.T?P.hire:null}
function hireKit(f,cls){const srcs=[S.econ.fleet[f],S.econ.stock[f]].filter(Boolean);let t=factionTier(f),ld=loadout('patrol',t,cls);while(!haveIn(ld,srcs)&&t>1){t--;ld=loadout('patrol',t,cls)}return haveIn(ld,srcs)?{t,ld,srcs}:null}
function hireDrop(k){const H=HIRE_E[k];delete HIRE_E[k];if(!H||!H.e||!H.e.alive)return;const w=WORLDS[H.sid];if(!w||!w.ents.includes(H.e))return;inW(w,()=>{returnHome(H.e);despawn(H.e)})}
function hireBuy(c,arg){const P=S.player,f=P.faction,cls=String(arg),wage=HIRE.cls[cls];if(!hireOK(c,P)||!wage){dockErr='Pilots are hired at your own faction\'s stations.';return}
  const L=hireLive(P),same=L&&L.cls===cls,from=same?L.until:S.T;if(from-S.T+HIRE.T>HIRE.maxAhead){dockErr=`You can book at most ${HIRE.maxAhead/60} minutes ahead.`;return}
  if(!hireKit(f,cls)){dockErr=`${FACTIONS[f].short} can't kit ${art(FAC(f).hulls[cls]).toLowerCase()} ${FAC(f).hulls[cls]} right now: its warehouse is short.`;return}
  if(P.credits<wage){dockErr=`${art(FAC(f).hulls[cls])} ${FAC(f).hulls[cls]} pilot costs ${fmt(wage)} cr for ${HIRE.T/60} minutes.`;return}
  transfer('player',f,wage);if(L&&!same)hireDrop(pkey());P.hire={cls,fac:f,until:from+HIRE.T};P.hireT=0;
  dockErr=`✓ ${same?'Contract extended':'Hired'}: ${art(FAC(f).hulls[cls]).toLowerCase()} ${FAC(f).hulls[cls]} pilot flies your wing for ${Math.round((P.hire.until-S.T)/60)} minutes. ${fmt(wage)} cr to the ${FACTIONS[f].short} treasury.${L&&!same?' Your previous contract ended.':''}`}
function hireEnd(){const P=S.player;if(!P.hire)return;P.hire=null;hireDrop(pkey());dockErr='✓ Contract ended. Wages already paid are not refunded.'}
// every frame in an open world, for the pilot whose ship it is (the host also runs it for guests' ships in its worlds)
function hireTick(){const P=S.player,p=W&&W.player,k=pkey();if(!p||NET.cl)return;
  if(!P.hire){if(HIRE_E[k])hireDrop(k);return}
  if(!hireLive(P)){P.hire=null;hireDrop(k);feed('Your hired wingman\'s contract is up. Renew it under Jobs → Hire pilots.','info');return}
  if(P.docked){if(HIRE_E[k])hireDrop(k);return}if(p.alive===false||(!CTX&&W===LW&&W.dead))return;const H=HIRE_E[k];
  if(H&&H.e&&H.e.alive&&W.ents.includes(H.e)){if(H.e.order&&H.e.order.tgt!==p){H.e.order.tgt=p;H.e.order.pid=curPid()}return}
  if(H&&H.e&&!H.e.alive){delete HIRE_E[k];P.hireT=S.T+HIRE.re;feed(`Your wingman is down. ${FACTIONS[P.hire.fac].short} is sending another in ${HIRE.re/60} minutes.`,'warn');return}
  if(H)hireDrop(k);if((P.hireT||0)>S.T)return;
  const f=P.hire.fac,K=hireKit(f,P.hire.cls);if(!K){P.hireT=S.T+60;feed(`${FACTIONS[f].short} can't kit your wingman right now; it will try again in a minute.`,'warn');return}
  if(!takeFrom(K.ld,K.srcs)){P.hireT=S.T+60;return}const e=makeNPC('patrol',f,P.hire.cls,K.t,K.ld,'stock:'+f);const o=rdir();e.x=p.x+o.x*300;e.y=p.y+o.y*120;e.z=p.z+o.z*300;
  e.order={kind:'escort',tgt:p,until:W.t+1e6,slot:0,by:true,pid:curPid()};e.hire=1;W.ents.push(e);HIRE_E[k]={e,sid:W.sid};feed(`Your hired ${FAC(f).hulls[P.hire.cls]} falls in on your wing.`,'good')}
function hireWorld(){if(NET.cl||S.unb||!W)return;if(W===LW&&S.player)try{hireTick()}catch(e){frameErr('hire',e)}
  if(NET.host){for(const e of W.ents.slice())if(e.rp&&e.alive&&S.pilots&&S.pilots[e.rp]&&e.rp!==NET.me)try{runAs(e.rp,()=>hireTick())}catch(er){frameErr('hire',er)}
    // a guest who docked, died or left keeps no wingman loitering here (it stands down and its kit goes home)
    const me=pkey();for(const k of Object.keys(HIRE_E)){const H=HIRE_E[k];if(k===me||!H||H.sid!==W.sid)continue;const e=MP.rp[k];if(!(e&&e.alive&&W.ents.includes(e)))hireDrop(k)}}}
function hireHtml(c,P){const f=P.faction,L=hireLive(P),HN=k=>esc(FAC(f).hulls[k]);
  let h=`<p class="note" style="margin:0 0 12px">Hire a ${FACTIONS[f].short} pilot to fly escort on you for ${HIRE.T/60} minutes, paid up front to the treasury. Your wingman joins you whenever you're in space, in every system you fly to. If it's shot down, its kit is lost as salvage and a replacement arrives after ${HIRE.re/60} minutes; the contract keeps running. Your wingman's kills don't pay bounties: only your own damage does. Its ship comes from ${FACTIONS[f].short}'s own stock, so a short warehouse can't kit every class.</p>`;
  if(L)h+=`<p class="note" style="color:var(--ok)">Under contract: ${art(FAC(f).hulls[L.cls]).toLowerCase()} ${HN(L.cls)} pilot, ${Math.ceil((L.until-S.T)/60)} min left${(P.hireT||0)>S.T?` · replacement arriving in ${fmtT(P.hireT-S.T)}`:''}.</p>`;
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Wingman</th><th class="r">30 min</th><th class="r">Per hour</th><th></th></tr></thead><tbody>`;
  for(const cls in HIRE.cls){const w=HIRE.cls[cls],kit=!!hireKit(f,cls),same=L&&L.cls===cls,room=(same?L.until:S.T)-S.T+HIRE.T<=HIRE.maxAhead;
    h+=`<tr><td>${HN(cls)}<br><span class="mass">${esc(CLASSES[cls].name)}${kit?'':' · warehouse can\'t kit one now'}</span></td><td class="r num">${fmt(w)} cr</td><td class="r num">${fmt(w*2)} cr</td><td><button class="btn sm" type="button" data-act="hire" data-arg="${cls}" ${kit&&room&&P.credits>=w?'':'disabled'}>${same?'Extend':L?'Switch':'Hire'}</button></td></tr>`}
  h+=`</tbody></table></div>`;if(L)h+=`<div class="act" style="margin-top:10px"><button class="btn sm" type="button" data-act="hireend">End contract (no refund)</button></div>`;
  return h}
function factionIndustry(f){
  const st=S.econ.stock[f],fl=S.econ.fleet[f],war=S.ai[f]&&S.ai[f].war>S.T,need=S.T>150?capNeed(f):null;
  // the Brood grazes: its swarms strip rock from the systems it holds and the ones next door (ore out of real fields, nothing created)
  if(f==='brood'&&BAL.brGraze>0&&((st.fe||0)<300||(st.cu||0)<300)){const t=territory('brood'),z=new Set(t);for(const id of t)for(const n of NEIGH[id])if(!(DEF[n].home&&DEF[n].kind==='core'))z.add(n);
    const L=[...z].filter(id=>S.sectors[id]&&S.sectors[id].ast.length&&!WORLDS[id]);const gz=Math.floor(BAL.brGraze)+(Math.random()<BAL.brGraze%1?1:0);for(let i=0;i<gz&&L.length;i++){const gs=pick(L);brGut(st,gs,extract(S.sectors[gs],6,false,{au:1,nu:(st.nu||0)>200,cu:(st.cu||0)>=300,fe:(st.fe||0)>=300,ir:(st.ir||0)>300,xc:(st.xc||0)>150}))}}
  // imports: short of construction stock, a faction buys from the Freeport Compact with treasury credits (zero-sum: credits to the
  // Compact, goods out of its stores). Halcyon's Trade Charter buys twice the volume at a discount.
  // Trade Charter: Halcyon hires Freeport prospectors to work the rocks in its own systems when its ore runs short.
  // The ore comes out of those fields and the wages go to the Compact, so nothing is created.
  if(f==='halcyon'&&Math.random()<BAL.halProsp&&S.T>120&&(st.fe||0)+(st.cu||0)<300&&(S.econ.treasury[f]||0)>30000){const terr=[...territory(f)].filter(id=>S.sectors[id]&&S.sectors[id].ast.length);if(terr.length){const sc=S.sectors[pick(terr)],got=extract(sc,8,true,{ir:1,xc:1,au:1,nu:1});let cost=0;for(const k in got)cost+=Math.ceil(baseValue(k)*.9)*got[k];if(cost){transfer(f,'neutral',cost);inv.addAll(st,got)}}}
  {const FPS=fpStores(),hal=f==='halcyon'&&Math.random()<BAL.halImp;/* halImp: share of ticks the Trade Charter discount applies */if(FPS.length&&f!=='brood'&&S.T>120)for(const k of hal?['plate','wire','fe','cu','nu']:['fe','cu','nu']){const proc=k==='plate'||k==='wire',low=k==='nu'?(need?48:16):proc?30:60;if((st[k]||0)>=low)continue;const enr=impEnroute(f,k);if((st[k]||0)+enr>=low)continue;const keep=k==='nu'?4:proc?7:27,lot=k==='nu'?(hal?8:4):hal?16:8,want=Math.max(lot,Math.min(lot*4,low+lot-(st[k]||0)-enr));
    fpImport(f,k,want,FAC_HOME(f),keep,hal?IMP.hal:1,IMP.floor)}}
  craftDown(st,'plate',{fe:80},400);craftDown(st,'wire',{cu:80},400);craftAbstract(st,'coil',2,need?30:60);   // keep 80 ore each: below 60 the faction starts importing
  if(forgesOwned(f)>0||f==='brood'){craftAbstract(st,'lattice',1,16);if(S.T>200)craftAbstract(st,'core',1,4)}
  else{craftAbstract(st,'lattice',1,8);if(S.T>200)craftAbstract(st,'core',1,2)}
  if(S.T>150){craftAbstract(st,'keel',1,8)}craftAbstract(st,'frame',1,f==='brood'?5:6);
  // while saving for a shipyard or carrier, skip the luxuries that eat coil, wire and iridium
  if(f!=='brood')specStock(f,st,need);craftAbstract(st,'missile',2,need||war?8:40);craftAbstract(st,'torpedo',war?2:1,war?(need?14:36):need?4:14);if(f!=='brood'&&!need&&!war){craftAbstract(st,'drone',2,30);craftAbstract(st,'swarm',1,8);craftAbstract(st,'tune',1,10)}
  if(invValue(fl)<400+250*forgesOwned(f)){for(const[k,n,res]of[['plate',3,need?60:30],['wire',2,need?40:30],['coil',1,need?20:10],['lattice',1,need?12:2],['missile',1,6],['torpedo',1,4]])if((st[k]||0)>res)inv.add(fl,k,inv.take(st,k,n))}
}
function pirateIndustry(){const st=S.econ.stock.pirate;for(const id of['wr','ho']){const s=S.sectors[id];for(const e of RAWS){const m=Math.min(s.debris[e],3);s.debris[e]-=m;inv.add(st,e,m)}}craftAbstract(st,'plate',4,60);craftAbstract(st,'wire',4,60);craftAbstract(st,'coil',1,20);craftAbstract(st,'missile',1,10);craftAbstract(st,'torpedo',1,4)}
function territory(f){const t=new Set();for(const d of SECTOR_DEFS)if(d.home===f)t.add(d.id);for(const id in S.stations)if(S.stations[id].owner===f)t.add(id);for(const id in S.outposts)if(S.outposts[id].owner===f)t.add(S.outposts[id].sector);return t}
function evOwner(ev){return ev.st?(S.stations[ev.st]||{}).owner:ev.target?S.outposts[ev.target].owner:null}
function evName(ev){return ev.st?(S.stations[ev.st]?S.stations[ev.st].name:ev.stName):ev.target?S.outposts[ev.target].name:DEF[ev.sector].name}
// a side sees a sector if it has a station or depot there or next door, an outpost there (a relay also sees next door),
// or a scout there or next door. The player adds their own sector (and neighbours when flying a scout). Holding the Hollow Relay taps the whole gate network.
function covOf(side,sensorsOnly){const C=new Set(),add=(sid,nb)=>{C.add(sid);if(nb)for(const n of NEIGH[sid])C.add(n)};
  for(const id in S.stations)if(S.stations[id].owner===side)add(id,true);
  if(!sensorsOnly)for(const id in S.outposts){const o=S.outposts[id];if(o.owner===side)add(o.sector,o.type==='relay')}
  for(const sc of S.scouts||[])if(sc.side===side)add(sc.sector,true);for(const x of S.frigates||[])if(x.side===side)add(x.sector,true);for(const sid in S.beacons||{})if(S.beacons[sid].owner===side)C.add(sid);return C}
let covC=null,covK='';
function playerCov(){const k=Math.floor(S.T)+'|'+S.player.sector+'|'+S.player.cls+(refitsOf(S.player).scan?'s':'')+'|'+(S.scouts||[]).length+'|'+Object.keys(S.stations).length+'|'+(S.frigates||[]).map(x=>x.sector).join('')+'|'+(S.bcnV||0);if(covC&&covK===k)return covC;
  const C=covOf(S.player.faction);for(const x of covOf('player'))C.add(x);C.add(S.player.sector);if(CLASSES[S.player.cls].radar||refitsOf(S.player).scan)for(const n of NEIGH[S.player.sector])C.add(n);
  if(hasIntel())for(const d of SECTOR_DEFS)C.add(d.id);covC=C;covK=k;return C}
function covered(sid){return playerCov().has(sid)}
function evKnown(ev){return ev.att===S.player.faction||ev.seen||covered(ev.sector)}
function covSource(sid){const pf=S.player.faction;if(sid===S.player.sector&&W)return'Your sensors';if(S.beacons&&S.beacons[sid]&&S.beacons[sid].owner===pf)return`${FAC(pf).short} beacon`;
  for(const sc of S.scouts||[])if(sc.side===pf&&(sc.sector===sid||NEIGH[sc.sector].includes(sid)))return`${FAC(pf).short} scout`;
  for(const id in S.stations){const R=S.stations[id];if(friendSide(R.owner)&&(id===sid||NEIGH[id].includes(sid)))return`${R.name} sensors`}
  if(CLASSES[S.player.cls].radar&&NEIGH[S.player.sector].includes(sid))return'Your long-range radar';
  for(const id in S.outposts){const o=S.outposts[id];if(friendSide(o.owner)&&o.sector===sid)return o.name}
  return hasIntel()?'Hollow Relay intercept':'Sensors'}
function announce(ev){if((NET.cl?MP.seenEv.has(ev.id):ev.seen)||ev.stage==='done'||(ev.type!=='offensive'&&ev.type!=='build'))return;const pf=S.player.faction;if(ev.att!==pf&&!covered(ev.sector))return;if(NET.cl)MP.seenEv.add(ev.id);else ev.seen=true;
  const eta=Math.max(0,Math.round(ev.eta-S.T)),src=ev.att===pf?'':covSource(ev.sector)+': ',nm=DEF[ev.sector].name,when=ev.stage==='inbound'?`ETA ${eta}s.`:'Under way now.';
  if(ev.type==='build'){if(ev.att==='brood')feed(`⚠ ${src}a Brood Seeder is drifting toward ${nm} to grow a Bloom Node. ${when}`,'warn');
    else if(ev.att===pf)feed(`${FAC(pf).short} constructor convoy (${ev.n} escorts) heading to ${nm}${DEF[ev.sector].home===pf?' to rebuild its depot':' to build a depot'}. ${when} Press O to escort it.`,'info');
    else feed(`${src}${src?art(sideAdj(ev.att)).toLowerCase():art(sideAdj(ev.att))} ${sideAdj(ev.att)} constructor convoy is heading to ${nm}.`,'news');return}
  const owner=evOwner(ev),name=evName(ev),rel=friendSide(owner),yours=owner==='player'?'your ':'',f=ev.att,got=ev.n,vs=ev.st?' to raze it':'';
  if(f==='brood'){feed(`⚠ ${src}BROOD SWARM (${got}) moving on ${yours}${name} in ${nm}. ${when}${rel?' Press O to fly to its defence.':''}`,rel?'bad':'warn');return}
  const who=f==='pirate'?'an Unbound raid':`${art(FACTIONS[f].short).toLowerCase()} ${FACTIONS[f].short} strike group`,Who=who[0].toUpperCase()+who.slice(1);
  if(owner==='player')feed(`${src}${who} (${got} ships) is moving on your ${name}${vs}. ${when} Press O to fly to its defence.`,'bad');
  else if(f===pf)feed(`${Who} (${got} ships) is moving on ${name}${owner==='brood'?' to burn out the Brood':''}. ${when} Press O to join; they will hold at the gate for you.`,'info');
  else if(owner===pf)feed(`${src}${who} (${got} ships) is moving on ${name}${vs}. ${when} Press O to fly to its defence.`,'bad');
  else feed(`${src}${who} (${got} ships) is moving on ${name}${owner==='brood'?' to burn out the Brood':''}. ${when}`,'news')}
// ---- capital ships: shipyards build each faction's carrier and its escorts. Capitals don't hold systems: structures do.
// (Tokens live in S.frigates and fly as role 'frigate' entities: the names are kept for old saves.)
function frigatesIn(sid){return(S.frigates||[]).filter(t=>t.sector===sid)}
function frigHop(t){if(t.jumpTo)return t.jumpTo;if(!t.dest||t.dest===t.sector)return null;let best=null,bh=99;for(const n of NEIGH[t.sector]){const h=HOP[t.dest][n];if(h<bh){bh=h;best=n}}return best}
const JUMP_TIME=20,PWR=['eng','shd','lance','pd'];
function fctl(t){if(!t.ctl)t.ctl={throttle:1,movePt:null,lanceMode:'auto',pd:'torps',pickets:'escort',power:{eng:3,shd:3,lance:3,pd:3}};const C=t.ctl;
  // the battery target is a live entity: keep it out of saves and network copies, and mirror its id (tgtId) so other browsers can resolve it
  if(!Object.getOwnPropertyDescriptor(C,'_t')){const v=C.tgt;delete C.tgt;Object.defineProperty(C,'_t',{value:null,writable:true,enumerable:false});Object.defineProperty(C,'tgt',{get(){return this._t},set(x){this._t=x||null;this.tgtId=x?(x.type==='station'?'S':x.id):null},enumerable:false,configurable:true});if(v&&typeof v==='object'&&v.type)C.tgt=v}
  return C}
// capital ownership: a solo pilot's capitals use side 'player'; in multiplayer they fly the pilot's faction colours and carry owner = pilot id
function curPid(){return NET.on?((S.player&&S.player.pid)||NET.me||MP.pid):null}
function fGuest(t){return!!t&&!t.owner&&t.side!=='player'&&t.side===S.player.faction}
function fCrewOK(t){if(!NET.on||!t||!t.owner||t.owner===curPid())return false;const O=S.pilots&&S.pilots[t.owner];return!!O&&O.faction===S.player.faction}
function fBoard(t){return fMine(t)||fGuest(t)||fCrewOK(t)}
// crew stations on a capital ship: the commander can hand a guest one station; the commander loses it while it's assigned,
// the guest can use only that station, and it returns to the commander the moment the guest steps away from the console
const CREW_STN={helm:'nav',man:'nav',thrset:'nav',thr:'nav',move:'nav',stop:'nav',jump:'nav',course:'nav',abort:'nav',lmode:'wpn',tgt:'wpn',fire:'wpn',pd:'wpn',pk:'wpn',pm:'wpn',hl:'wpn',sor:'wpn',sorsz:'wpn',wsw:'wpn',scout:'nav',pw:'eng',preset:'eng'},CREW_NAME={nav:'Helm',wpn:'Weapons',eng:'Engineering'};
function crewStn(a){return CREW_STN[String(a).split(':')[0]]||null}
function crewCan(t,pid,a){const st=crewStn(a),C=t.crew||{};if(t.owner===pid||(!NET.on&&fMine(t)))return!(st&&C[st]&&C[st]!==pid);return!!st&&C[st]===pid}
function crewAboard(t){const out=[];for(const pid in S.pilots||{}){const P=S.pilots[pid];if(pid!==t.owner&&P.docked==='bridge'&&P.bridgeId===t.id)out.push(pid)}return out}
function crewOf(t,pid){const C=t.crew||{};return Object.keys(C).filter(k=>C[k]===pid)}
function fOwn(t){return!!t&&(t.side==='player'||!!t.owner)}
function fMine(t){return!!t&&(t.side==='player'||(!!t.owner&&t.owner===(curPid()||'me')))}
// taking command of one of your faction's frigates: it stays your faction's ship, but you give the orders until you hand it back
function fTake(t){if(!fGuest(t))return false;t.owner=curPid()||'me';t.cmd=1;t.crew={};t.dest=null;t.jumpTo=null;t.ctl=null;fctl(t);feed(`You have taken command of ${t.name}. Give it orders from its consoles or the galaxy map (M); hand it back to ${FAC(t.side).short} command from the Strategic console.`,'good');return true}
function fRelease(t){if(!t.cmd||!fMine(t))return false;delete t.owner;delete t.cmd;t.crew={};t.ctl=null;t.dest=null;t.jumpTo=null;feed(`${t.name} is back under ${FAC(t.side).short} command.`,'info');return true}
function yk(){return NET.on?'p:'+curPid():'player'}
function ykPid(k){return typeof k==='string'&&k.startsWith('p:')?k.slice(2):null}
function pmul(t,k){return fOwn(t)?fctl(t).power[k]/3:1}
const CAR_K={ostrova:.92};function carCostF(f){const k=CAR_K[f]||1;if(k===1)return withSeal(CARRIER_COST,f,CAP_SEAL.carrier);const o={};for(const x in CARRIER_COST)o[x]=Math.max(1,Math.round(CARRIER_COST[x]*k));if(sealed(f))o.seal=CAP_SEAL.carrier;return o}
function capitalTick(){const T=S.T;S.frigates=S.frigates||[];if(!S.capGateSaid&&T>=CAP_GATE-180){S.capGateSaid=1;feed(`Capital slips are cleared: from minute ${CAP_GATE/60} the factions can launch carriers and escorts.`,'news')}
  // AI shipyards: the carrier, then escorts beside it (or while the carrier kit is out of reach)
  for(const f of[...FAC_IDS,'brood']){const st=S.econ.stock[f],busyY=S.events.some(e=>e.type==='yardbuild'&&e.att===f),busyF=S.events.some(e=>e.type==='frigbuild'&&e.att===f);
    if(!S.yards[f]&&!busyY&&T>300&&haveIn(yardCost(f),[st])&&(patOn(f,'yard')||Math.random()<.4)){const force={};takeFrom(yardCost(f),[st]);inv.addAll(force,yardCost(f));S.events.push({id:S.nextId++,type:'yardbuild',att:f,sector:yardHome(f),force,until:T+YARD_TIME,stage:'building'});if(covered(yardHome(f))||f===S.player.faction)feed(`${FACTIONS[f].short} has begun building a capital shipyard at ${DEF[yardHome(f)].name}.`,'warn')}
    const war=S.ai[f]&&S.ai[f].war>T;{const busyE=S.events.some(e=>e.type==='escbuild'&&e.att===f);const both={...carCostF(f)},EC=escCost(f);for(const k in EC)both[k]=(both[k]||0)+EC[k];if(S.yards[f]&&!busyE&&capGateOK(f,ESCORT_TIME)&&facEsc(f).length<(ESC_CAP[f]||0)&&(f!=='brood'||T>BAL.brLevT)&&(facCar(f).length>=1||haveIn(both,[st])||!haveIn(carCostF(f),[st]))&&haveIn(EC,[st])&&(patOn(f,'esc')||Math.random()<(war?.8:.35))){
const force={};takeFrom(EC,[st]);inv.addAll(force,EC);S.events.push({id:S.nextId++,type:'escbuild',t0:S.T,yard:f,att:f,sector:S.yards[f].sector,force,until:T+ESCORT_TIME,stage:'building'})}}if(S.yards[f]&&!busyF&&capGateOK(f,FRIGATE_TIME*(war?.7:1)*(CAR_K[f]||1))&&(f!=='brood'||T>BAL.brLevT)&&facCar(f).length<1&&haveIn(carCostF(f),[st])&&(patOn(f,'car')||Math.random()<(war?1:.5))){const force={};takeFrom(carCostF(f),[st]);inv.addAll(force,carCostF(f));S.events.push({id:S.nextId++,type:'frigbuild',t0:S.T,yard:f,att:f,sector:S.yards[f].sector,force,until:T+FRIGATE_TIME*(war?.7:1)*(CAR_K[f]||1),stage:'building'});if(war&&friendSide(f))feed(`${FACTIONS[f].short} has rushed a carrier into the slip at ${DEF[S.yards[f].sector].name} to answer the enemy capital ships.`,'info')}}
  for(const ev of S.events){if(ev.type!=='yardbuild'&&ev.type!=='frigbuild'&&ev.type!=='escbuild')continue;if(ev.stage==='done'||T<ev.until)continue;ev.stage='done';const mkCap=ev.type==='escbuild'?makeEscort:makeCarrier,capW=ev.type==='escbuild'?'Escort':'Carrier';
    const evp=ykPid(ev.att);if(ev.type==='yardbuild'&&S.yards[ev.att]){inv.addAll(evp&&S.pilots&&S.pilots[evp]?S.pilots[evp].vault:S.econ.stock[ev.att]||S.econ.stock[S.player.faction],ev.force);ev.force={};continue}
    if(evp){if(ev.type==='yardbuild'){S.yards[ev.att]={sector:ev.sector,fort:ev.force};ev.force={};feedTo(evp,`Your capital shipyard at ${DEF[ev.sector].name} is complete. Commission a Carrier and Escorts from Ship → Shipyard there.`,'good')}
      else{const P=S.pilots&&S.pilots[evp];if(P){const t=mkCap(P.faction,ev.sector,ev.force,evp);feedTo(evp,`${capW} ${t.name} has launched from ${DEF[ev.sector].name}. Order it from the galaxy map (M).`,'good')}else{const h=S.econ.stock[S.player.faction];inv.addAll(h,ev.force)}ev.force={}}continue}
    if(ev.type==='yardbuild'){S.yards[ev.att]={sector:ev.sector,fort:ev.force};ev.force={};if(FAC_IDS.includes(ev.att))try{patLaunch(ev.att,'yardbuild',null)}catch(e){}feed(ev.att==='player'?`Your capital shipyard at ${DEF[ev.sector].name} is complete. Commission a Carrier and Escorts from Ship → Shipyard there.`:`${FACTIONS[ev.att].short} capital shipyard complete at ${DEF[ev.sector].name}.`,ev.att==='player'?'good':friendSide(ev.att)?'info':'warn')}
    else{const t=mkCap(ev.att,ev.sector,ev.force);ev.force={};if(FAC_IDS.includes(ev.att))try{patLaunch(ev.att,ev.type,t)}catch(e){}if(ev.att==='player')feed(`${capW} ${t.name} has launched from ${DEF[ev.sector].name}. Order it from the galaxy map (M).`,'good');else if(friendSide(ev.att)||covered(ev.sector))feed(`${ev.att==='brood'?`⚠ A Brood ${ev.type==='escbuild'?'Prowler':'Leviathan'} has been spawned`:FACTIONS[ev.att].short+' '+capW.toLowerCase()+' '+t.name+' has launched'} at ${DEF[ev.sector].name}.`,ev.att==='brood'?'bad':friendSide(ev.att)?'good':'warn')}}
  for(const t of S.frigates)if(t.live){const w=WORLDS[t.sector];if(!w||!w.ents.some(e=>e.alive&&e.tok===t))t.live=false}
  // movement and AI orders
  for(const t of S.frigates){if(!t.live&&t.sector===capBase(t))capRefill(t);
    if(!fOwn(t)&&isEsc(t)&&t.side!=='brood'&&t.sector!==capBase(t)&&(t.aload||0)<1&&capCanRefill(t))t.dest=capBase(t);
    else if(!fOwn(t)&&!(t.call&&t.call.until>S.T)&&(!t.dest||t.dest===t.sector)&&Math.random()<.35)t.dest=frigOrders(t);
    if(t.live)continue;if(isCar(t)&&t.dest&&t.dest!==t.sector&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side)){t.moveT=0;if(!fOwn(t)){const Rk=S.stations[t.dest].kind;if(Rk==='core'||Rk==='hive'){t.soT=t.soT||S.T;if(S.T-t.soT>600){t.dest=null;t.soT=0}}else t.soT=0}continue}const nx=frigHop(t);if(!nx){t.moveT=0;t.spin=null;continue}t.moveT=(t.moveT||0)+pmul(t,'eng');if(t.moveT<(isEsc(t)?1.2:2))continue;t.moveT=0;t.spin=null;t.jumpTo=null;t.sector=nx;t.hold=0;
    if(fOwn(t)&&t.sector===t.dest)feedTo(t.owner,`${t.name} has arrived in ${DEF[t.sector].name}.`,'info');if(WORLDS[nx])inW(WORLDS[nx],()=>spawnFrigate(t,true))}
  // abstract fighting away from the player
  for(const t of S.frigates.slice()){if(t.live||t.hull<=0)continue;const own=t.sector;let hit=0;
    for(const o of frigatesIn(own))if(o!==t&&!o.live&&hostile(t.side,o.side))hit+=isEsc(o)?rnd(150,260):isCar(o)?wingPower(o)*rnd(40,70):rnd(250,420);
    if(isCar(t)&&hit>0&&Math.random()<.08)wingLoseN(t,S.sectors[own]);
    // a carrier strikes its target from next door (or where it sits); escorts strike where they are
    const sid=isCar(t)&&t.dest&&HOP[t.sector][t.dest]===1&&hostileStationAt(t.dest,t.side)?t.dest:own;
    const Rs=S.stations[sid];if(Rs&&hostileStationAt(sid,t.side)){if(sid===own)hit+=Rs.kind==='core'?150:Rs.kind==='hive'?200:90;distressCall(sid,Rs.name,Rs.owner,t.side);
      if(!WORLDS[sid]){const k=isEsc(t)?.7:isCar(t)?wingPower(t)/5:1;if(isCar(t)&&Math.random()<.03)wingLoseN(t,S.sectors[sid]);
        if(Rs.shield>0)Rs.shield=Math.max(0,Rs.shield-700*k);else{Rs.hull-=rnd(320,420)*k;wkAbstractHit(sid,t.side,.3)}
        if(Rs.hull<=0){if(Rs.kind==='depot'){if(Rs.owner!=='brood'&&t.side!=='brood'){const g=garrison(Rs),n=capLoads(sid,t.side);if(n>=g){useLoads(sid,t.side,g,Rs);captureDepot(sid,t.side)}else if(n>0||fOwn(t))Rs.hull=1;else razeStation(sid,t.side)}else razeStation(sid,t.side)}else if(Rs.kind==='free')razeStation(sid,'brood');else Rs.hull=1}}}
    if(hit){t.fightT=S.T;t.hull-=hit;if(t.hull<=0)killFrigateToken(t,'in battle')}else t.hull=Math.min(capHullMax(t),t.hull+capHullMax(t)*.03)}
  // outposts: a capital carrying an assault load takes an unguarded hostile outpost after a minute
  for(const t of S.frigates){const own=t.side==='player'?'player':t.side;if(!(aAvail(t)>0)||frigatesIn(t.sector).some(o=>hostile(t.side,o.side))){t.hold=0;continue}
    const oid=OUT_BY_SECTOR[t.sector],o=oid&&S.outposts[oid];if(!o||!o.owner||!hostile(t.side,o.owner)||(own==='player'&&o.owner===S.player.faction)||outLockBars(t.sector,own)){t.hold=0;continue}t.hold=(t.hold||0)+1;
    if(t.hold>=6){aSend(t,t.sector,ASSAULT.outLoss);capture(o,own);t.hold=0}}}
function killFrigateToken(t,how){capPingPay(t);toDebris(S.sectors[t.sector],t.load);t.load={};if(t.store){toDebris(S.sectors[t.sector],t.store);t.store={}}if(t.fab){toDebris(S.sectors[t.sector],t.fab.kit);t.fab=null}S.frigates=S.frigates.filter(x=>x!==t);if(friendSide(t.side)||covered(t.sector))feed(`${t.side==='player'?'Your '+capName(t):t.owner&&S.pilots&&S.pilots[t.owner]?S.pilots[t.owner].name+'\'s '+capName(t):t.side==='brood'?'A Brood '+broodCap(t):sideName(t.side)+' '+capName(t)} ${t.side==='brood'?'':t.name+' '}was destroyed ${how} in ${DEF[t.sector].name}.`,friendSide(t.side)?'bad':'good')}
function frigOrders(t){let best=t.sector,bs=-1e9;const bro=t.side==='brood',bcc=bro?controlCounts():null,bmx=bro?Math.max(1,...FAC_IDS.map(k=>bcc[k]||0)):1;for(const d of SECTOR_DEFS){const h=HOP[d.id][t.sector];if(h>(bro?5:3))continue;let sc=-(bro?.55:.8)*h+rnd(0,1);const Rs=S.stations[d.id];
    if(bro){const ow=sideNorm(sectorOwner(d.id));if(FAC_IDS.includes(ow))sc+=2.5*(bcc[ow]||0)/bmx}   // Leviathans range further and go for the leading faction
    if(Rs&&hostile(t.side,Rs.owner)&&(Rs.kind==='depot'||Rs.kind==='free'&&t.side==='brood'))sc+=Rs.owner==='brood'?7:t.side==='brood'?5:3;else if(Rs&&Rs.owner!==t.side)sc-=4;
    if(frigatesIn(d.id).some(o=>hostile(t.side,o.side)))sc+=3;
    if(!Rs&&d.kind!=='hive'&&d.kind!=='den'&&d.kind!=='core'){sc+=2.5;const oid=OUT_BY_SECTOR[d.id];if(oid&&S.outposts[oid].owner!==t.side)sc+=2}
    if(territory(t.side).has(d.id)&&frigatesIn(d.id).some(o=>hostile(t.side,o.side)))sc+=4;
    if(frigatesIn(d.id).some(o=>o!==t&&o.side===t.side))sc-=3;
    {const C=S.coal;if(C&&t.side!=='brood'){const ow=sideNorm(sectorOwner(d.id));if(C.mem.includes(t.side)){if(ow===C.lead)sc+=5*BAL.coal;if(frigatesIn(d.id).some(o=>sideNorm(o.side)===C.lead))sc+=4}else if(t.side===C.lead){if(ow===t.side&&frigatesIn(d.id).some(o=>hostile(t.side,o.side)))sc+=4;if(ow!==t.side)sc-=2.5}}}
    if(sc>bs){bs=sc;best=d.id}}return best}
const WIN_TIME=1200;   // the 7-system hold: 20 minutes
function controlCounts(){const n={};for(const d of SECTOR_DEFS){let o=sectorOwner(d.id);if(o==='player')o=S.player.faction;if(o&&o!=='pirate'&&o!=='neutral')n[o]=(n[o]||0)+1}return n}
const VIC_NEED=7;   // hold 7 systems for 20 minutes (tested: the hold decides ~43% of galaxies instead of ~16%)
// ============================================================ the coalition: when one side nears galaxy control, the other factions call a truce and
// turn on it. The Brood never joins: it keeps playing for its own dominance, and if the Brood is the one winning, all three factions unite against it.
function sideNorm(sd){return sd==='player'?S.player.faction:sd}
function coalNames(m){const n=m.map(f=>FACTIONS[f].short);return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n[0]}
function coalTick(){const n=controlCounts();let lead=null,best=0;for(const k in n){if(k==='pirate')continue;if(n[k]>best){best=n[k];lead=k}}
  const C=S.coal,pf=S.player.faction,nb=n.brood||0;
  if(nb>=ACCORD_ON&&!(C&&C.lead==='brood')){S.ffa=null;S.coal={lead:'brood',mem:[...FAC_IDS],since:S.T,accord:1};if(running&&!STRAT_SIM())SFX.accord();feed(`⚠ The Containment Accord: the Brood holds ${nb} systems. Halcyon, Varkesh and Ostrova stop fighting each other everywhere and turn their fleets on the Bloom until it is pushed back below ${ACCORD_OFF}.`,'bad');return}
  // a faction passing the truce's leader while that leader still holds 7 breaks the truce: a free-for-all, and the leader's
  // clock keeps running until one of them gives way (the leader drops under 7, or nobody is ahead of it any more)
  if(S.ffa){const F=S.ffa;if((n[F.by]||0)>(n[F.hold]||0)&&(n[F.hold]||0)>=VIC_NEED)return;S.ffa=null;feed((n[F.hold]||0)>=VIC_NEED?`${sideName(F.hold)} is level again at ${n[F.hold]} systems: the truce against it re-forms.`:`${sideName(F.hold)} has dropped to ${n[F.hold]||0} systems: the free-for-all is over.`,'news')}
  if(C&&C.lead!=='brood'&&(n[C.lead]||0)>=VIC_NEED){let by=null;for(const k of FAC_IDS)if(k!==C.lead&&(n[k]||0)>(n[C.lead]||0)&&(!by||n[k]>n[by]))by=k;
    if(by){S.coal=null;S.ffa={by,hold:C.lead,T:S.T};feed(`⚔ ${sideName(by)} has passed ${sideName(C.lead)}, ${n[by]} systems to ${n[C.lead]}: the truce is broken and it's every faction for itself. ${sideName(C.lead)}'s clock keeps running.`,by===pf||C.lead===pf?'warn':'news');return}}
  if(C){const m=n[C.lead]||0;if(C.lead==='brood'?m<ACCORD_OFF:m<=VIC_NEED-2){S.coal=null;feed(`The truce against ${C.lead==='brood'?'the Brood':FACTIONS[C.lead].short} has collapsed: ${m} systems is no longer a threat. ${coalNames(C.mem)} go back to their own wars.`,'news')}
    else if(C.lead==='brood'||!(lead&&lead!==C.lead&&best>=VIC_NEED&&best>m&&m<VIC_NEED))return}   // the truce stays on its leader while that leader still holds 7
  if(S.victory&&S.victory.side!=='brood'&&(n[S.victory.side]||0)===best)lead=S.victory.side;   // a tie: the truce goes after the side on the clock
  if(!lead||best<VIC_NEED)return;const mem=FAC_IDS.filter(f=>f!==lead);if(!mem.length)return;S.coal={lead,mem,since:S.T};
  if(lead==='brood')feed(`⚠ The Brood holds ${best} systems. ${coalNames(mem)} have set aside their war to stop the Bloom: their fleets hold fire on each other and turn on the Brood.`,'bad');
  else feed(`${coalNames(mem)} have called a truce to stop ${FACTIONS[lead].name} (${best} of ${VIC_NEED} systems). Their fleets now hold fire on each other and go after ${FACTIONS[lead].short}.${lead===pf?' The galaxy is coming for you.':mem.includes(pf)?` ${FAC(pf).short} is in the truce: their ships won't fire on you and your guns won't touch theirs.`:''}`,lead===pf?'bad':'warn')}
// the deadline: if no one has held 7 systems for 20 minutes by two hours of game time, the faction holding the most systems wins.
// Ties go to most stations and depots, then most capital ships, then the richest stores.
// the Brood takes a galaxy only by holding 7 systems, never on the deadline count: it stays aggressive and spreads, and the
// factions decide the deadline between them
const TIE_T=7200,TIE_SIDES=()=>[...FAC_IDS];
function tieScore(sd){const n=controlCounts();return[n[sd]||0,Object.values(S.stations).filter(R=>sideNorm(R.owner)===sd&&R.kind!=='hive').length,(S.frigates||[]).filter(t=>sideNorm(t.side)===sd).length,Math.round(invValue(S.econ.stock[sd]||{}))]}
function tieWinner(){let best=null,bs=null;for(const sd of TIE_SIDES()){const sc=tieScore(sd);if(!bs){best=sd;bs=sc;continue}for(let i=0;i<sc.length;i++){if(sc[i]>bs[i]){best=sd;bs=sc;break}if(sc[i]<bs[i])break}}return best}
function tieLead(){const w=tieWinner();return w?[w,tieScore(w)[0]]:null}
function deadlineTick(){if(S.won||NET.cl)return false;S.dl=S.dl||{};const left=TIE_T-S.T;
  for(const[m,k]of[[1800,'30'],[600,'10']])if(left<=m&&!S.dl[k]){S.dl[k]=1;const L=tieLead();allFeed(`⏱ ${m/60} minutes to the two-hour deadline. If no one completes the 7-system hold, the side with the most systems wins: ${L?(L[0]==='brood'?'the Brood':sideName(L[0]))+' leads with '+L[1]:'no one leads'}.`,'warn')}
  if(left<=0){const w=tieWinner();if(w){galaxyWon(w,'tie');return true}}return false}
// the Brood is the galaxy's outside threat: every pilot hears it climb toward the 7 systems it needs (once per rise past 5,
// 6 and 7; falling back re-arms the warning)
function broodWatch(n){const b=n.brood||0,w=S.broodWarn||0;if(b<w){S.broodWarn=b;return}if(b<5||b<=w)return;S.broodWarn=b;if(STRAT_SIM())return;
  const msg=b>=VIC_NEED?`⚠ The Brood holds ${b} systems. If it keeps ${VIC_NEED} for ${Math.round(WIN_TIME/60)} minutes, the galaxy is lost.`:`⚠ The Brood has spread to ${b} systems: ${VIC_NEED-b} more and it starts the clock on the galaxy. Kill its Seeders and burn its nodes.`;
  allFeed(msg,'bad');if(running&&!NET.cl){flash(msg,true);try{SFX.accord()}catch(e){}}}
function victoryTick(){if(deadlineTick())return;const n=controlCounts(),need=VIC_NEED;broodWatch(n);const dtV=S.T-(S.vicLastT==null?S.T:S.vicLastT);S.vicLastT=S.T;
  // free-for-all: the leader's clock keeps running (it stays with the leader while it holds 7)
  if(S.ffa&&S.victory&&S.victory.side===S.ffa.hold){if(S.T-S.victory.since>=WIN_TIME)galaxyWon(S.ffa.hold);return}
 let lead=null;for(const k in n)if(n[k]>=need&&(!lead||n[k]>n[lead]))lead=k;
  // two sides over the line at once: the side already holding keeps its clock unless the other clearly has more
  if(lead&&S.victory&&S.victory.side!==lead&&(n[S.victory.side]||0)>=need&&(n[S.victory.side]||0)>=n[lead])lead=S.victory.side;
  // during a truce, a second faction reaching 7 gets no clock while the truce's leader still holds 7: it starts when that leader is down to 6
  {const C=S.coal;if(C&&C.lead!=='brood'&&(n[C.lead]||0)>=need){for(const k in n)if(k!==C.lead&&k!=='brood'&&k!=='pirate'&&n[k]>=need&&S.vicHeld!==k){S.vicHeld=k;feed(`${sideName(k)} now holds ${n[k]} systems, but the truce is still aimed at ${sideName(C.lead)}: ${sideName(k)}'s clock starts only once ${sideName(C.lead)} is down to ${need-1}.`,k===S.player.faction?'warn':'news')}if(lead&&lead!=='brood')lead=C.lead}else S.vicHeld=null}
  if(!lead){if(S.victory)feed(`${sideName(S.victory.side)} has lost its grip on the galaxy.`,'news');S.victory=null;return}
  if(!S.victory||S.victory.side!==lead){S.victory={side:lead,since:S.T};feed(`${lead==='brood'?'⚠ The Brood':sideName(lead)} now controls ${n[lead]} of ${SECTOR_DEFS.length} systems. Hold ${VIC_NEED} for ${Math.round(WIN_TIME/60)} minutes and the galaxy is ${lead===S.player.faction?'yours':'theirs'}.`,lead===S.player.faction?'good':'bad');return}
  if(S.T-S.victory.since>=WIN_TIME)galaxyWon(lead)}
function loadLegacy(){try{return JSON.parse(localStorage.getItem('driftgate.legacy')||'{}')||{}}catch(e){return{}}}
function galaxyWon(side,how){{const v=$('winV');if(v)v.hidden=true}if(!NET.cl)legAward(side);if(NET.host)for(const c of readyCl())send(c.L,{t:'won',side,how});const lg=loadLegacy();lg.wins=lg.wins||{};lg.wins[side]=(lg.wins[side]||0)+1;lg.last=side;try{localStorage.setItem('driftgate.legacy',JSON.stringify(lg));localStorage.removeItem(SAVE_KEY)}catch(e){}
  S.won=side;hideSheets();const mine=side===S.player.faction,n=controlCounts()[side]||0;
  $('winT').textContent=side==='brood'?'The Bloom spreads':mine?'Victory':`${FACTIONS[side].short} rules`;
  const held=how==='tie'?`held the most systems (${n} of ${SECTOR_DEFS.length}) when the two-hour deadline arrived`:`held ${n} of ${SECTOR_DEFS.length} systems for ${Math.round(WIN_TIME/60)} minutes`;
  $('winP').textContent=side==='brood'?`The Vael Brood ${held}. The galaxy is consumed. No pilot earns a Legend point. A new galaxy waits.`:`The ${FACTIONS[side].name} ${held} and unites the galaxy.${mine?' Your faction won, and you with it.':''} A new galaxy begins: ${FACTIONS[side].short} starts it with a finished capital shipyard and 40% richer stores${mine?', and you start with 4,000 extra credits and a crate of parts':''}.`;
  if(S.unb)$('winP').innerHTML=esc($('winP').textContent)+unbDebrief(side);$('winS').textContent=`Galaxies won · ${Object.keys(lg.wins).map(k=>`${sideName(k)} ${lg.wins[k]}`).join(' · ')}`;$('win').hidden=false}
function broodNear(sid){const t=territory('brood');return t.has(sid)||NEIGH[sid].some(n=>t.has(n))}
function planOffensive(f){if(FACTIONS[f]&&f!=='brood'&&campBusy(f)){S.ai[f].next=S.T+rnd(30,50);return}
  const terr=territory(f),busy=new Set(S.events.filter(e=>e.type==='offensive'&&e.stage!=='done'&&e.att===f).map(e=>e.st?'st:'+e.st:e.target)),c=[],pf=S.player.faction;
  const adjOf=sec=>terr.has(sec)||NEIGH[sec].some(n=>terr.has(n)),hopTo=sec=>{let m=9;for(const t of terr)m=Math.min(m,HOP[t][sec]);return m},bw=sec=>{const h=hopTo(sec);return h<=1?1.6:h===2?1.1:h===3?.7:.4};
  // the Brood hunts the strong: targets held by the faction with the most systems weigh up to 1.5x, the weakest down to 0.6x
  const bcc=f==='brood'?controlCounts():null,bmx=bcc?Math.max(1,...FAC_IDS.map(k=>bcc[k]||0)):1,bstr=ow=>!bcc||!FAC_IDS.includes(sideNorm(ow))?1:.6+.9*(bcc[sideNorm(ow)]||0)/bmx;
  for(const id in S.outposts){const o=S.outposts[id];if(o.owner===f||busy.has(id)||outLockBars(o.sector,f))continue;let w;
    if(f==='pirate'&&o.owner==='brood')continue;if(f==='pirate'){if(id!=='wrack'&&!o.owner&&!RAID.pirHold)continue;w=id==='wrack'?6:o.owner==='player'?2.2:1}
    else if(f==='brood'){if(o.owner==='pirate')continue;w=(o.owner?1.6*bstr(o.owner):2.2)*bw(o.sector)}
    else{w=!o.owner?3:o.owner==='player'?2:o.owner==='brood'?3.4:o.owner==='pirate'?(id==='wrack'?.8:2):1.4;w*=adjOf(o.sector)?1.6:.3}
    c.push([{out:id},w])}
  for(const sid in S.stations){const R=S.stations[sid];if(R.owner===f||(R.owner==='neutral'&&f!=='brood')||busy.has('st:'+sid)||R.kind==='hive'||!hostile(f,R.owner))continue;const adj=adjOf(sid);let w=0;
    if(f==='brood')w=R.kind==='core'?(adj?.5*bstr(R.owner):0):R.kind==='free'?1.8*bw(sid):2.6*bw(sid)*bstr(R.owner);
    else if(R.kind==='depot'){if(f==='pirate')w=R.owner==='player'?1.4:DEF[sid].home?0:.5;else w=(R.owner==='brood'?BAL.antiBrood:R.owner==='player'?1.2:DEF[sid].home?.15:.9)*(adj?1.4:.2)}
    if(w>0)c.push([{st:sid},w])}
  {const C=S.coal;if(C&&f!=='pirate'&&f!=='brood'){const own=x=>{const o=x[0].out?S.outposts[x[0].out]:null;return sideNorm(o?o.owner:S.stations[x[0].st].owner)};
    if(C.mem.includes(f)){for(const x of c){const ow=own(x);x[1]*=ow===C.lead?1+3.5*BAL.coal:C.mem.includes(ow)?0:1}}
    else if(f===C.lead){for(const x of c){const sec=x[0].st||S.outposts[x[0].out].sector;if(!adjOf(sec))x[1]*=.15}S.ai[f].next+=35}
    for(let i=c.length-1;i>=0;i--)if(c[i][1]<=0)c.splice(i,1)}}
  if(!c.length)return;if(FACTIONS[f]&&f!=='brood'){const see=covOf(f);for(const x of c){const sec=x[0].st||S.outposts[x[0].out].sector;if(see.has(sec))x[1]*=1.4}}
  const pk=wpickArr(c),isSt=!!pk.st,Rr=isSt?S.stations[pk.st]:null,o=isSt?null:S.outposts[pk.out];
  const lvl=isSt?(Rr.kind==='core'?4:2):o.level,sector=isSt?pk.st:o.sector,owner=isSt?Rr.owner:o.owner,name=isSt?Rr.name:o.name;
  const n=clamp(3+lvl+ri(0,1)+(f==='brood'?BAL.brN:0),4,f==='brood'?10:8),tier=f==='pirate'?pirateTier():factionTier(f),role=f==='pirate'?'pirate':'patrol';
  const force={};let got=0;const srcs=[S.econ.fleet[f],S.econ.stock[f]];
  const nb=isSt?Math.max(3,Math.floor(n/2)):owner?Math.max(1,Math.floor(n/3)):0,clsList=[];
  for(let i=0;i<n;i++){const want=i<nb?bmbPick(f,i,role,tier,srcs):pickFighter(role);let cl=want,ld=loadout(role,tier,cl);
    if(!haveIn(ld,srcs)){cl='striker';ld=loadout(role,tier,cl)}
    if(takeFrom(ld,srcs)){inv.addAll(force,ld);clsList.push(cl);got++}else break}
  if(got<4){inv.addAll(S.econ.stock[f],force);S.ai[f].next=S.T+rnd(25,45);return}
  const ev={id:S.nextId++,type:'offensive',att:f,target:isSt?null:pk.out,st:isSt?pk.st:undefined,stName:name,sector,eta:S.T+(f===pf?75:60),force,n:got,tier,cls:clsList,stage:'inbound'};if(isSt)siegeLoads(ev,srcs);
  S.events.push(ev);announce(ev);
}
function loseInv(src,frac,s){const lost={};for(const k in src){const m=Math.min(src[k],Math.floor(src[k]*frac+Math.random()));if(m>0){inv.take(src,k,m);lost[k]=m}}toDebris(s,lost)}
// ---- war effort: what human pilots do for their faction. Orders, supply-drive deliveries, campaign moves, beacon flips and
// enemy ships shot down earn the faction points; the points fade (about 20 minutes to lose two thirds) and, while they last,
// make the faction's fleets fight harder in the battles fought out of sight: outpost assaults, station sieges, hunter groups.
const WE={tau:1200,max:.8,scale:10,order:2,drive:.04,camp:4,beacon:2,bmission:3,kill:{fighter:1,heavy:1.5,builder:3,hauler:1,miner:.5,drone:.1,escort:6,frigate:12}};
function weFac(f){f=sideNorm(f);return FAC_IDS.includes(f)?f:null}
function weAdd(f,pts){f=weFac(f);if(!f||!(pts>0)||!S)return;S.we=S.we||{};S.we[f]=(S.we[f]||0)+pts}
function wePts(f){const g=weFac(f);return g&&S.we?(S.we[g]||0):0}
function weBonus(f){return WE.max*(1-Math.exp(-wePts(f)/WE.scale))}
function weMul(f){return 1+weBonus(f)}
function weTick(){if(!S.we)return;const k=Math.exp(-10/WE.tau);for(const f in S.we){S.we[f]*=k;if(S.we[f]<.01)delete S.we[f]}}
function weKill(e,sh=1){if(!hostile(S.player.faction,e.side))return;const K=WE.kill;let p=e.role==='frigate'?(e.cls==='escort'?K.escort:K.frigate):e.role==='builder'?K.builder:e.role==='hauler'||e.role==='trader'?K.hauler:e.role==='miner'?K.miner:e.role==='drone'||e.role==='picket'||e.role==='limpet'?K.drone:(e.cls==='heavy'||isBmb(e.cls)?K.heavy:K.fighter);if(e.side==='pirate')p*=.5;weAdd(S.player.faction,p*sh)}
// ---- kill credit. Every pilot who damaged a ship is paid their share of its bounty (and War effort) by damage dealt, so the
// kill shot isn't needed. AI damage counts in the total but pays no one; the kill shot only adds to the kill count.
// Bounties grow with the size of the ship.
const BOUNTY_MUL=8;   // the pay ladder: hauling, then mining, then combat, then beacon running
const PIRATE_MUL=1.2; // the Unbound prey on everyone: their ships (and captains) carry a fifth more bounty than a rival faction's
function bountyOf(e){if(e.role==='drone')return 40;if(e.role==='limpet')return 60;if(e.role==='frigate')return e.cls==='escort'?1400:2800;const c=CLASSES[e.cls],r=c&&CLASSES.striker?c.hull/CLASSES.striker.hull:1;
  return Math.max(40,Math.round(BOUNTY_MUL*(e.side==='pirate'?PIRATE_MUL:1)*(25+20*(e.tier||1))*Math.pow(Math.max(.3,r),.6)/5)*5)}
function dmgRec(e,src,at,d){if(!(d>0)||e.isPlayer)return;const k=at&&at.src&&at.src.rp?at.src.rp:src==='player'?'me':'_ai';(e.dmg=e.dmg||{})[k]=(e.dmg[k]||0)+d}
function killNoun(e){return e.role==='miner'?'miner':e.role==='hauler'?'hauler':e.role==='trader'?(e.tradeT&&e.tradeT.kind==='haul'?'supply freighter':'trader'):e.role==='builder'?'constructor':e.role==='drone'?'drone':e.role==='frigate'?(e.tok?capName(e.tok):'capital ship'):CLASSES[e.cls]?CLASSES[e.cls].name.toLowerCase():'fighter'}
function payKill(e,src,at){const D=e.dmg||{},kp=at&&at.src&&at.src.rp,killer=kp||(src==='player'?'me':null);let tot=0;for(const k in D)tot+=D[k];
  const sh={};for(const k in D)if(k!=='_ai'&&tot>0&&D[k]/tot>=.05)sh[k]=D[k]/tot;if(killer&&!(tot>0))sh[killer]=1;
  if(killer&&!sh[killer])runAs(isMe(killer)?null:killer,()=>{S.player.kills++});
  if(!NET.cl)sideKill(e,sh,killer);
  if(S.unb){const ks=new Set(Object.keys(sh));if(killer)ks.add(killer);for(const k of ks)runAs(isMe(k)?null:k,()=>unbKill(e));return}
  for(const k in sh)runAs(isMe(k)?null:k,()=>{const f=S.player.faction,x=sh[k],pct=Math.round(x*100);if(k===killer)S.player.kills++;if(!hostile(f,e.side))return;weKill(e,x);
    const nm=`${e.side==='pirate'?'Unbound':FACTIONS[e.side]?FACTIONS[e.side].short:'Brood'} ${killNoun(e)}`,part=x<.995?` Your damage: ${pct}%.`:'';
    if(e.role==='trader'&&e.tradeT&&e.tradeT.kind==='haul'){const got=transfer(f,'player',Math.round(raidBounty(e.tradeT)*x));weAdd(f,3*x);if(got)feed(`Convoy raid: +${fmt(got)} cr for cutting ${FACTIONS[e.side].short} supplies.${part}`,'good')}
    const b=transfer(f,'player',Math.max(1,Math.round(bountyOf(e)*x)));feed(`${nm} destroyed${k===killer?'':' (shared kill)'}.${b?` Bounty +${b} cr.`:''}${part}`,'good');if(e.side==='brood'&&e.role==='builder'){const c=transfer(f,'player',Math.round(CONTAIN.seeder*x));if(c)feed(`Containment order: Seeder killed before it planted. +${fmt(c)} cr.`,'good')}})}
// containment orders, open to every faction pilot: a Seeder killed, a Bloom Node burned (more for a node that has rooted)
const CONTAIN={seeder:600,young:900,node:1500,youngT:180};
// where to catch a convoy: the first system on its remaining route you can reach in time (it spends ~45 s crossing each
// system, so one jump of slack), else the point on its route nearest you
function cvIntercept(t,from){const P=(t.path||[]).slice(t.leg);if(!P.length)return t.to;for(let i=0;i<P.length;i++)if((HOP[from][P[i]]??99)<=i+1)return P[i];
  return P.slice().sort((a,b)=>(HOP[from][a]??99)-(HOP[from][b]??99)||(a===t.to)-(b===t.to))[0]}
function raidBounty(t){return Math.round((invValue(t.load||{})*.85+400)/10)*10}
function weHtml(f){const b=Math.round(weBonus(f)*100);return` War effort: <b>${b?'+'+b+'%':'none'}</b> in battles fought out of sight${b?'':''} (pilots earn it with Orders, supply drives, campaign moves, beacon flips and kills; it fades over about 20 minutes).`}
function resolveAbstract(ev){
  if(ev.st){resolveSiege(ev);return}
  const o=S.outposts[ev.target],s=S.sectors[o.sector];if(o.owner&&!hostile(ev.att,o.owner)){finishOffensive(ev);return}
  const att=invValue(ev.force)*clsF(ev.cls);let def=o.owner?300+o.level*260:120,dforce=null;
  if(FACTIONS[o.owner]){dforce={};const fl=S.econ.fleet[o.owner],warned=covOf(o.owner,true).has(o.sector);for(let i=0;i<(warned?3:2);i++){const ld=loadout('patrol',factionTier(o.owner));if(takeFrom(ld,[fl,S.econ.stock[o.owner]]))inv.addAll(dforce,ld)}def+=invValue(dforce)}
  const win=Math.random()<att*weMul(ev.att)/(att*weMul(ev.att)+def*1.1*(o.owner?weMul(o.owner):1));
  loseInv(ev.force,win?rnd(.15,.4):rnd(.45,.8),s);
  if(dforce){loseInv(dforce,win?rnd(.5,.9):rnd(.2,.45),s);inv.addAll(S.econ.fleet[o.owner],dforce)}
  const prev=o.owner;
  if(win)capture(o,ev.att);
  else{o.shield=oStats(o).sMax;if(prev==='player')feed(`Your ${o.name} held off the ${sideAdj(ev.att)} attack.`,'good');else if(covered(o.sector)||prev===S.player.faction)feed(`${o.name} repelled ${art(sideAdj(ev.att)).toLowerCase()} ${sideAdj(ev.att)} assault.`,'news')}
  finishOffensive(ev);
}
function resolveSiege(ev){const Rr=S.stations[ev.st],s=S.sectors[ev.sector];if(!Rr||!hostile(ev.att,Rr.owner)){finishOffensive(ev);return}
  const att=invValue(ev.force)*clsF(ev.cls);let def=(Rr.kind==='core'?2600:Rr.kind==='free'?2000:Rr.fwd?800:1300)*(1+.2*(devOf(Rr).def+devOf(Rr).armor)+.1*(devOf(Rr).hangar||0)),dforce=null;
  if(FACTIONS[Rr.owner]){dforce={};const fl=S.econ.fleet[Rr.owner],warned=covOf(Rr.owner,true).has(ev.sector);for(let i=0;i<(Rr.kind==='core'?3:2)+(warned?1:0);i++){const ld=loadout('patrol',factionTier(Rr.owner));if(takeFrom(ld,[fl,S.econ.stock[Rr.owner]]))inv.addAll(dforce,ld)}def+=invValue(dforce)}
  const hgN=(Rr.hg||[]).length;if(hgN)def+=Rr.hg.reduce((a,h)=>a+invValue(h.load),0)*.6;   // hangar fighters scramble to defend their depot
  const tor=ev.force.torpedo||0,win=Math.random()<att*weMul(ev.att)/(att*weMul(ev.att)+def*1.15*weMul(Rr.owner))*Math.min(1,tor/8),loud=friendSide(Rr.owner)||covered(ev.sector);
  if(hgN){const lf=win?rnd(.6,.95):rnd(.15,.4);Rr.hg=Rr.hg.filter(h=>{if(Math.random()<lf){toDebris(s,h.load);return false}return true})}
  loseInv(ev.force,win?rnd(.2,.45):rnd(.45,.8),s);
  if(dforce){loseInv(dforce,win?rnd(.5,.9):rnd(.2,.45),s);inv.addAll(S.econ.fleet[Rr.owner],dforce)}
  if(win){const g=garrison(Rr),need={};for(const k in ASSAULT_LD)need[k]=ASSAULT_LD[k]*g;if(Rr.kind==='depot'&&ev.att!=='brood'&&ev.att!=='pirate'&&Rr.owner!=='brood'&&haveIn(need,[ev.force])){for(let i=0;i<g;i++)if(Math.random()<ASSAULT.depotLoss){const got={};takeFrom(ASSAULT_LD,[ev.force]);inv.addAll(got,ASSAULT_LD);toDebris(s,got)}captureDepot(ev.st,ev.att)}else if(Rr.kind==='depot'&&ev.att!=='brood'&&Rr.owner!=='brood'&&capLoads(ev.st,ev.att)>=g){useLoads(ev.st,ev.att,g,Rr);captureDepot(ev.st,ev.att)}else if(Rr.kind==='depot'||Rr.kind==='free')razeStation(ev.st,ev.att);else{wkAbstractHit(ev.st,ev.att,.6);const st=S.econ.stock[Rr.owner]||{},got={};for(const k in st){const m=Math.floor(st[k]*.1);if(m>0)got[k]=inv.take(st,k,m)}inv.addAll(S.econ.stock[ev.att]||S.econ.stock.pirate,got);Rr.hull=Math.max(1,Rr.hull*.4);
      if(loud)feed(`${Rr.name} was battered by ${ev.att==='brood'?'the Brood':sideName(ev.att)}: ${invMass(got)} t of stores ${ev.att==='brood'?'devoured':'carried off'}.`,friendSide(Rr.owner)?'bad':'warn')}}
  else if(loud)feed(`${Rr.name} held off ${ev.att==='brood'?'a Brood swarm':art(sideAdj(ev.att)).toLowerCase()+' '+sideAdj(ev.att)+' assault'}.`,friendSide(Rr.owner)?'good':'news');
  finishOffensive(ev)}
function finishOffensive(ev){ev.stage='done';inv.addAll(S.econ.stock[ev.att],ev.force);ev.force={}}
// ============================================================ capital threats, hunter groups, distress responses
// A faction that sees hostile capital ships in its space goes on a war footing: it makes torpedoes, musters bombers into a
// hunter group over a few strategic ticks, then sends it after the frigate. Each failed hunt makes the next one bigger.
// The same machinery sends response wings to stations calling for help, and to pilots who call for help.
function capThreats(f){const terr=territory(f),out=[],C=S.coal;for(const t of S.frigates||[]){if(t.hull<=0||!hostile(f,t.side))continue;
    const lead=C&&C.mem.includes(f)&&sideNorm(t.side)===C.lead;const near=lead||terr.has(t.sector)||Object.keys(S.stations).some(sid=>S.stations[sid].owner===f&&HOP[sid][t.sector]<=1);if(!near)continue;
    out.push({t,w:t.side==='brood'?1.5:1,home:terr.has(t.sector)})}return out.sort((a,b)=>(b.home-a.home)||(b.w-a.w))}
function ownerFeed(t,msg,k){if(!fOwn(t))return;feedTo(t.owner||null,msg,k)}
function respSource(f,sid){let best=null,bh=99;for(const id in S.stations){const R=S.stations[id];if(R.owner!==f||R.kind==='hive')continue;const h=HOP[id][sid];if(h<bh){bh=h;best=id}}return best?{sid:best,h:bh}:null}
function huntActive(f,tokId){return S.events.some(e=>e.type==='response'&&e.kind==='hunt'&&e.att===f&&e.tok===tokId&&e.stage!=='done')}
function threatTick(){const T=S.T;for(const f of FAC_IDS){const A=S.ai[f];if(!A)continue;const th=capThreats(f),F=FACTIONS[f].short;
    A.threat=th.reduce((a,x)=>a+x.w,0)+(A.huntFail||0)*.5;if(S.coal&&S.coal.lead===f)A.war=Math.max(A.war||0,T+120);
    if(th.length){if(!(A.war>T)&&(friendSide(f)||th.some(x=>fOwn(x.t))))feed(`${F} command is on a war footing: hostile capital ships in ${F} space. Torpedo lines and bomber crews are being raised.`,friendSide(f)?'info':'warn');A.war=T+300}
    const hm=A.hm;
    if(hm){const t=(S.frigates||[]).find(x=>x.id===hm.tok&&x.hull>0),st0=S.econ.stock[f],need=capNeed(f),srcs=[S.econ.fleet[f]].concat(!need||((st0.plate||0)>40&&(st0.coil||0)>12)?[st0]:[]),tier=factionTier(f);
      if(!t||!th.some(x=>x.t===t)&&!(t&&respSource(f,t.sector)&&respSource(f,t.sector).h<=2)){inv.addAll(S.econ.stock[f],hm.force);A.hm=null;continue}
      const nb=hm.cls.filter(c=>isBmb(c)).length;
      for(let k=0;k<2&&hm.cls.length<hm.need;k++){const want=nb+k<Math.ceil(hm.need*.6)?bmbPick(f,nb+k,'patrol',tier,srcs):pickFighter('patrol'),ld=loadout('patrol',tier,want);if(takeFrom(ld,srcs)){inv.addAll(hm.force,ld);hm.cls.push(want)}else if(isBmb(want))break}
      const nb2=hm.cls.filter(c=>isBmb(c)).length;
      if(hm.cls.length>=hm.need||(T-hm.start>=150&&hm.cls.length>=4&&nb2>=2)||(T-hm.start>=240&&hm.cls.length>=3&&nb2>=2)){const src=respSource(f,t.sector);
        const ev={id:S.nextId++,type:'response',kind:'hunt',att:f,tok:t.id,tokName:t.name,sector:t.sector,eta:T+35+22*(src?src.h:2),force:hm.force,n:hm.cls.length,cls:hm.cls,tier,stage:'inbound',tries:0};S.events.push(ev);A.hm=null;
        ownerFeed(t,`⚠ ${F} hunter group launched: ${ev.n} ships (${nb2} bombers) inbound to ${DEF[t.sector].name} for ${t.name}, about ${Math.round(ev.eta-T)} s out.`,'bad');
        if(friendSide(f))feed(`${F} hunter group (${ev.n} ships, ${nb2} bombers) launched against the ${t.side==='brood'?'Brood '+broodCap(t):sideAdj(t.side)+' '+capName(t)+' '+t.name} in ${DEF[t.sector].name}.`,'good')}
      continue}
    if(th.length){const x=th.find(x=>!huntActive(f,x.t.id));if(x){A.hm={tok:x.t.id,start:T,force:{},cls:[],need:clamp(Math.round(4+2*A.threat),4,10)};
      ownerFeed(x.t,`Intel: ${F} is massing bombers to hunt ${x.t.name} in ${DEF[x.t.sector].name}.`,'warn')}}}}
// send a wing from the nearest station of faction f to sector sid. kind: 'distress' (a station under attack) or 'pilot' (a pilot asked for help)
function dispatchResponse(f,sid,kind,o){o=o||{};if(!FACTIONS[f])return null;const src=respSource(f,sid);if(!src||src.h>(kind==='pilot'?4:o.far?6:S.coal&&S.coal.lead===f?5:3))return null;
  if(S.events.some(e=>e.type==='response'&&e.att===f&&e.sector===sid&&e.kind===kind&&e.stage!=='done'&&(kind!=='pilot'||e.pid===o.pid)))return null;
  const capHere=frigatesIn(sid).some(t=>hostile(f,t.side)),n=kind==='pilot'?4:capHere?5:4,nb=capHere?2:0,tier=factionTier(f),srcs=[S.econ.fleet[f],S.econ.stock[f]],force={},cls=[];
  for(let i=0;i<n;i++){let cl=i<nb?bmbPick(f,i,'patrol',tier,srcs):pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(!haveIn(ld,srcs)){cl='striker';ld=loadout('patrol',tier,cl)}if(takeFrom(ld,srcs)){inv.addAll(force,ld);cls.push(cl)}else break}
  if(cls.length<2){inv.addAll(S.econ.stock[f],force);return null}
  const ev={id:S.nextId++,type:'response',kind,att:f,sector:sid,eta:S.T+25+22*src.h,force,n:cls.length,cls,tier,stage:'inbound',pid:o.pid||null,name:o.name||'',from:src.sid};S.events.push(ev);return ev}
function respSpawnGate(ev){const G=GATES[ev.sector];const src=ev.from||(respSource(ev.att,ev.sector)||{}).sid;let g=G[0],bh=99;if(src)for(const x of G){const h=HOP[src][x.to];if(h<bh){bh=h;g=x}}return g||pick(G)}
function pilotEnt(pid){if(!pid||pid===NET.me){const p=W.player;return W===LW&&p&&p.alive&&!S.player.docked&&!W.dead?p:null}const e=MP.rp[pid];return e&&e.alive&&W.ents.includes(e)?e:null}
function engageResponse(ev){ev.stage='engaged';ev.until=S.T+(ev.kind==='hunt'?300:170);const g=respSpawnGate(ev);let n=0;
  const grp={id:'g'+(RID++),side:ev.att,role:'strike',members:[],n0:0,fleeing:false};
  const F=ev.kind==='hunt'?W.ents.find(e=>e.alive&&e.tok&&e.tok.id===ev.tok):ev.kind==='distress'?W.ents.find(e=>e.alive&&e.role==='frigate'&&hostile(ev.att,e.side)):null,P=ev.kind==='pilot'?pilotEnt(ev.pid):null;
  for(let i=0;i<ev.n;i++){const cl=(ev.cls&&ev.cls[i])||'striker',ld=loadout('patrol',ev.tier,cl);if(!takeFrom(ld,[ev.force]))break;
    const e=makeNPC(ev.kind==='hunt'?'strike':'patrol',ev.att,cl,ev.tier,ld,`ev:${ev.id}:${ev.att}`);e.evId=ev.id;e.ai.hunter=ev.kind==='hunt';
    if(F){e.ai.hunt=F;e.ai.huntUntil=W.t+400}
    if(P){e.order={kind:'guard',tgt:P,until:W.t+150,slot:i,by:true,pid:ev.pid||NET.me||null}}
    const o=rdir();e.x=g.x*.92+o.x*rnd(40,200);e.y=g.y*.92+o.y*rnd(40,200);e.z=g.z*.92+o.z*rnd(40,200);faceInstant(e,-e.x,-e.y,-e.z);const sp=200/2500;e.vx=-g.x*sp;e.vy=-g.y*sp;e.vz=-g.z*sp;
    if(ev.kind!=='pilot'){e.grp=grp;e.slot=i;grp.members.push(e)}W.ents.push(e);n++;fxWarp(e,sideCol(ev.att))}
  grp.n0=grp.members.length;if(grp.n0)W.groups[grp.id]=grp;const Fs=FACTIONS[ev.att].short;
  if(ev.kind==='hunt'){const t=F&&F.tok;if(t)ownerFeed(t,`⚠ ${Fs} hunter group jumped in: ${n} ships going for ${t.name}. Point defence to torpedoes!`,'bad');if(friendSide(ev.att))feed(`${Fs} hunter group (${n} ships) has jumped in after ${t?t.name:'the frigate'}.`,'good')}
  else if(ev.kind==='pilot'){feedTo(ev.pid||null,`${Fs} response wing on station: ${n} fighters ${P?'are forming up on you':'are sweeping the system'}.`,'good')}
  else if(friendSide(ev.att))feed(`${Fs} response wing (${n} ships) jumped in to defend ${DEF[ev.sector].name}.`,'good')}
// no one watching: bombers trade torpedoes with point defence; fighters strip the shield first
function resolveCapHit(ev,t){const s=S.sectors[ev.sector],nb=ev.cls.filter(c=>isBmb(c)).length,nf=ev.cls.length-nb,torps=ev.force.torpedo||0,Fs=FACTIONS[ev.att].short;
  const scr=Math.min(2,frigatesIn(ev.sector).filter(o=>isEsc(o)&&!hostile(o.side,t.side)).length),cut=1-.35*scr;
  t.shield=Math.max(0,(t.shield||0)-nf*rnd(150,260)*cut);const landed=Math.round(torps*rnd(.4,.68)*cut*weMul(ev.att)/weMul(t.side)),used=Math.min(torps,landed+Math.round(torps*.25));
  if(used>0){inv.take(ev.force,'torpedo',used);toDebris(s,{torpedo:used})}
  const dmg=landed*rnd(isEsc(t)?700:260,isEsc(t)?900:380)*(t.shield>0?.5:1);t.hull-=dmg;loseInv(ev.force,Math.min(.9,rnd(.25,.55)+.2*scr),s);
  const A=S.ai[ev.att];if(t.hull<=0){killFrigateToken(t,`by ${art(Fs).toLowerCase()} ${Fs} hunter group`);if(A)A.huntFail=0;return true}
  if(A&&ev.kind==='hunt')A.huntFail=(A.huntFail||0)+1;ownerFeed(t,`${t.name} beat off ${art(Fs).toLowerCase()} ${Fs} hunter group (hull ${Math.max(0,Math.round(t.hull/capHullMax(t)*100))}%).`,'good');return false}
function responseTick(ev){const T=S.T;
  if(ev.stage==='inbound'&&T>=ev.eta){
    if(ev.kind==='hunt'){const t=(S.frigates||[]).find(x=>x.id===ev.tok&&x.hull>0);if(!t){finishOffensive(ev);return}
      if(t.sector!==ev.sector){const h=HOP[t.sector][ev.sector];if(h<=2&&ev.tries<2){ev.tries++;ev.sector=t.sector;ev.eta=T+25*h;ownerFeed(t,`The ${FACTIONS[ev.att].short} hunter group is following ${t.name} to ${DEF[t.sector].name}.`,'warn');return}finishOffensive(ev);return}}
    const lw=liveIn(ev.sector);if(lw){inW(lw,()=>engageResponse(ev));return}
    if(ev.kind==='hunt'){const t=(S.frigates||[]).find(x=>x.id===ev.tok);if(t)resolveCapHit(ev,t)}
    else if(ev.kind==='distress'){const t=frigatesIn(ev.sector).find(x=>!x.live&&hostile(ev.att,x.side));if(t)resolveCapHit(ev,t)}
    finishOffensive(ev);return}
  if(ev.stage==='engaged'){const w=WORLDS[ev.sector],alive=w?w.ents.filter(e=>e.npc&&e.evId===ev.id):[];
    if(!alive.length){finishOffensive(ev);if(ev.kind==='hunt'){const A=S.ai[ev.att],t=(S.frigates||[]).find(x=>x.id===ev.tok);if(t&&A)A.huntFail=(A.huntFail||0)+1;else if(A)A.huntFail=0}}
    else if(T>ev.until)for(const e of alive){e.role='leave';e.order=null}}}
// a pilot calls for help: friendly fighters nearby break off to cover them, and their faction sends a wing from the closest station
function pilotDistress(){if(!W||!W.player)return;if(S.unb){flash('Nobody answers an Unbound distress call.',true);return}const P=S.player,p=W.player;if(P.docked||(W===LW&&!CTX&&W.dead)){flash('You can only call for help in space.');return}
  if(S.T<(P.distT||0)){flash(`Distress beacon recharging (${Math.ceil(P.distT-S.T)} s).`);return}P.distT=S.T+90;
  const fac=P.faction,Fs=FACTIONS[fac].short;let near=0;
  {const cand=[];for(const e of W.ents){if(e.type!=='ship'||!e.alive||!e.npc||e.side!==fac||e.order)continue;if(!['patrol','escort','screen','strike','raider'].includes(e.role))continue;if(isBmb(e.cls)&&e.role==='strike')continue;const d=d3(e,p);if(d<4500)cand.push([e,d])}
    cand.sort((a,b)=>a[1]-b[1]);cand.slice(0,4).forEach(([e],i)=>{e.order={kind:'guard',tgt:p,until:W.t+ORDER_TIME,slot:i,by:true,pid:CTX||NET.me||null};e.ai.tgt=null;e.ai.t=0;near++})}
  const ev=dispatchResponse(fac,W.sid,'pilot',{pid:CTX||(NET.on?NET.me:null),name:P.name||'pilot'});
  const att=W.ents.filter(e=>e.npc&&e.alive&&e.ai&&e.ai.tgt===p).map(e=>e.side)[0];
  {S.distress=S.distress||[];const key=W.sid+':pilot:'+(CTX||'me');S.distress=S.distress.filter(d=>d.key!==key);S.distress.push({key,sid:W.sid,name:P.name||'A pilot',fac,by:att||null,T:S.T,T2:S.T,pilot:true});
    if(NET.host){for(const pid in S.pilots){if(pid===CTX||(!CTX&&pid===NET.me))continue;const R=S.pilots[pid];if(R.faction!==fac)continue;const h=HOP[W.sid][R.sector];netMsgOrFeed(pid,`📡 ${P.name||'A pilot'} is calling for help in ${DEF[W.sid].name}${att?' against '+sideName(att):''}. ${h?h+' jump'+(h>1?'s':'')+' away':'You are in that system'}. Press O to respond.`)}}}
  SFX.distress();
  feed(`📡 Distress beacon lit. ${near?`${near} nearby fighter${near>1?'s are':' is'} breaking off to cover you. `:''}${ev?`${Fs} command: a wing of ${ev.n} is launching from ${S.stations[ev.from].name}, about ${Math.round(ev.eta-S.T)} s out.`:`${Fs} command: no wing can reach you here${near?'':'. You are on your own'}.`}`,ev||near?'good':'warn')}
function netMsgOrFeed(pid,msg){if(pid===NET.me)feed(msg,'bad');else netMsg(pid,'distress',msg)}
function capture(o,side){if(NET.on&&side==='player')side=S.player.faction;
  const prev=o.owner,s=S.sectors[o.sector];
  if(prev&&o.level>1){const lost={};for(const e of RAWS){const m=Math.floor(o.fort[e]/o.level);o.fort[e]-=m;lost[e]=m}toDebris(s,lost);o.level--}
  if(prev&&prev!==side&&side!=='player'){const take={};for(const k in o.stock){const m=Math.floor(o.stock[k]/2);if(m)take[k]=inv.take(o.stock,k,m)}inv.addAll(S.econ.stock[side],take)}
  if(W&&S.player.docked===o.id&&side!=='player'&&side!==S.player.faction)undock();
  o.owner=side;if(NET.host)netKickDocked(o.sector,o.id,side);o.breached=0;const os=oStats(o);o.hull=os.hMax*.4;o.shield=0;o.cap={side:null,p:0};
  if(W&&W.outpostEnt&&W.outpostEnt.o===o)W.outpostEnt.lastHit=W.t;
  if(side==='player')feed(`You claimed ${o.name}. It is yours to fortify and defend.`,'good');
  else if(prev==='player')feed(`${o.name} has fallen to ${sideName(side)}. Half its store was seized.`,'bad');
  else if(covered(o.sector)||friendSide(side))feed(`${o.name} is now held by ${sideName(side)}.`,side===S.player.faction?'good':side==='brood'?'bad':'news');
}
