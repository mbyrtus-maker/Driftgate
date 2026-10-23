# Patch: Unbound mode, stage 2 (solo). A pilot with a Legend point can fly for the pirates: start card, Scrapheart Haven
# dock (Fence, Black market, Marks, Wanted), jam mode on 4 with shock harpoons, the cargo hook (hold E by a jammed ship),
# heat with every faction (bands, cooling, hunter wings, Freeport refusal, slow gates), the false transponder (K) with
# patrol scans, Infamy, ranks and Deeds, the Freeport fixer, and an Unbound block on the debrief with its Legend point.
import sys,re
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# ---------------------------------------------------------------- identity: the player's "faction" is 'pirate'
for pat in ["FACTIONS[S.player.faction]","FACTIONS[pf]","FACTIONS[P.faction]","FACTIONS[selFac]","FACTIONS[e.fac]"]:
    s=s.replace(pat,"FAC("+pat[9:-1]+")")
# the Missions tab stays a faction-only thing
rep("if(FAC(P.faction))tabs.push(['missions','Missions']);","if(FACTIONS[P.faction])tabs.push(['missions','Missions']);")
rep("function isFacSide(x){return x==='player'||FAC_IDS.includes(x)}","function isFacSide(x){return x==='player'?!(S&&S.unb):FAC_IDS.includes(x)}")
rep("function hostile(a,b){if(!a||!b||a===b)return false;",
    "function hostile(a,b){if(!a||!b||a===b)return false;if(S&&S.unb&&(a==='player'||b==='player')){const o=a==='player'?b:a;if(o==='pirate'||o==='neutral')return false;if(o==='brood')return true;if(FAC_IDS.includes(o))return!unbCover(o)}")
rep("function canDock(E){if(E.type==='station')return E.fac===S.player.faction||E.fac==='player'||E.fac==='neutral';",
    "function canDock(E){if(S.unb){if(E.type==='station')return E.fac==='pirate'||(E.fac==='neutral'&&unbFreeportOK());return!!E.o&&!E.o.breached&&E.o.owner==='pirate'}if(E.type==='station')return E.fac===S.player.faction||E.fac==='player'||E.fac==='neutral';")
rep("function starterFor(cls){","function starterFor(cls){if(S&&S.unb)return'raider';")
rep("if(!START_HULLS.includes(P.cls)&&CLASSES[P.cls]){const lost=P.cls,","if(!START_HULLS.includes(P.cls)&&!(S.unb&&P.cls==='raider')&&CLASSES[P.cls]){const lost=P.cls,")

JS=r"""
// ============================================================ Unbound mode (stage 2, solo): fly for the pirates
const UNB_HULLS=['raider','corsair','plunderer'],UNB_PRICE={raider:0,corsair:2600,plunderer:5000};
const UNB_RANKS=[['Nuisance',0],['Cutthroat',200],['Buccaneer',600],['Dread Captain',1500],['Pirate King',3000]];
const HEAT_BANDS=[['Cool',0],['Warm',25],['Hot',50],['Wanted',75]];
const UNB_HEAT={mercy:2,take:4,killCiv:8,killMil:3,blown:10,cool:1/60,coolQuiet:2/60};
const UNB_INF={perTon:.5,killCiv:10,ace:100};
const DEED_NAMES={heist:'Heist',captake:'Capital take',ace:'Ace-breaker',sweep:'Clean sweep',three:'Three for three',con:'The long con'};
let _unbF=null;function FAC(f){if(FACTIONS[f])return FACTIONS[f];if(f!=='pirate')return undefined;return _unbF||(_unbF={name:'The Unbound',short:'Unbound',col:PIRATE.col,fill:PIRATE.fill,hulls:PIRATE.hulls,trait:{},traitText:'Jammers, cargo hooks and false colours',blurb:'Pirates of The Wrack. You never race for the galaxy: you get rich and infamous off the three powers who do.',station:'Scrapheart Haven',shot:'scrap'})}
function unbLegendOK(name){const r=legPeek(name);return!!r&&(r.pts||0)>=1}
function unbP(){const P=S.player;P.heat=P.heat||{};for(const f of FAC_IDS)P.heat[f]=P.heat[f]||0;P.inf=P.inf||0;P.deeds=P.deeds||[];P.stolen=P.stolen||{};return P}
function heatBand(h){let b=0;for(let i=0;i<HEAT_BANDS.length;i++)if(h>=HEAT_BANDS[i][1])b=i;return b}
function unbRank(inf){let r=0;for(let i=0;i<UNB_RANKS.length;i++)if((inf||0)>=UNB_RANKS[i][1])r=i;return r}
function unbHomeOf(sid){const d=DEF[sid];return d&&FAC_IDS.includes(d.home)?d.home:null}
function heatAdd(f,n,why){if(!S.unb||!FAC_IDS.includes(f)||!(n>0))return;const P=unbP(),h0=P.heat[f],k=unbHomeOf(W&&W.sid)===f?2:1;P.heat[f]=clamp(h0+n*k,0,100);const b0=heatBand(h0),b1=heatBand(P.heat[f]);
  if(b1>b0)feed(`🔥 ${FACTIONS[f].short} heat ${Math.round(P.heat[f])} (${HEAT_BANDS[b1][0]})${why?': '+why:''}. ${['','Its patrols scan you on sight; false colours no longer fool it.','It sends hunter wings after you.','Freeports turn you away and its gates take 10 s to charge.'][b1]}`,'bad')}
function infAdd(n,why){if(!S.unb||!(n>0))return;const P=unbP(),r0=unbRank(P.inf),k=unbHomeOf(W&&W.sid)?2:1;P.inf=Math.round((P.inf+n*k)*10)/10;const r1=unbRank(P.inf);if(r1>r0)feed(`☠ Infamy ${fmt(Math.round(P.inf))}: you are now a ${UNB_RANKS[r1][0]}.${P.deeds.length?' A Legend point waits at the end of the galaxy.':' Do a Deed to earn a Legend point.'}`,'good')}
function deedAdd(k){if(!S.unb)return;const P=unbP();if(P.deeds.some(d=>d.k===k))return;P.deeds.push({k,t:Math.round(S.T),sid:W?W.sid:P.sector});feed(`★ Deed: ${DEED_NAMES[k]} (${DEF[W?W.sid:P.sector].name}, ${fmtT(S.T)}).${unbRank(P.inf)>0?' A Legend point waits at the end of the galaxy.':' Reach Cutthroat (200 Infamy) for the Legend point.'}`,'good')}
// ---- the false transponder: K toggles it. While Cool with a faction, its ships and stations see a neutral trader
function unbCover(f){const P=S.player;return!!(P.xpdr&&!((P.xpdrOut||0)>S.T)&&(P.heat||{})[f]<25)}
function unbFreeportOK(){const P=unbP();return FAC_IDS.every(f=>P.heat[f]<75)&&!!P.xpdr&&!((P.xpdrOut||0)>S.T)}
function xpdrToggle(){const P=unbP();if((P.xpdrOut||0)>S.T){flash(`Transponder burned out: ${fmtT(P.xpdrOut-S.T)} until it works again.`,true);return}P.xpdr=!P.xpdr;
  flash(P.xpdr?`🎭 False colours on. ${FAC_IDS.filter(f=>unbCover(f)).map(f=>FACTIONS[f].short).join(', ')||'No faction'} sees a Freeport trader. Any shot blows your cover.`:'🎭 False colours off: you fly as the Unbound.')}
function coverBlow(f,why){const P=unbP();if(!unbCover(f))return;P.xpdrOut=S.T+300;P.xpdr=false;P.conPass=false;heatAdd(f,UNB_HEAT.blown,why||'cover blown');feed(`🎭 Cover blown with ${FACTIONS[f].short}: transponder burned out for 5 minutes.`,'bad')}
function unbShot(){if(!S.unb||!S.player.xpdr)return;const p=W.player;for(const f of FAC_IDS)if(unbCover(f)&&W.ents.some(e=>e.side===f&&e.alive&&e.type==='ship'&&d3(e,p)<3500))coverBlow(f,'you opened fire under false colours')}
// patrol scans every 4 s: about 5%, +2% per 10 t of stolen goods, +10% at heat 15-24, three times as often near a core station
function unbScan(dt){const P=unbP(),p=W.player;if(!P.xpdr||!p||S.player.docked)return;W.scanT=(W.scanT||0)-dt;if(W.scanT>0)return;W.scanT=4;const sm=invMass(P.stolen);
  for(const f of FAC_IDS){if(!unbCover(f))continue;const pats=W.ents.filter(e=>e.npc&&e.alive&&e.side===f&&['patrol','escort','raider','screen'].includes(e.role)&&d3(e,p)<1500);if(!pats.length)continue;
    const SE=W.stationEnt,near=SE&&SE.fac===f&&d3(SE,p)<3000?3:1,ch=(.05+.02*Math.floor(sm/10)+(P.heat[f]>=15?.1:0))*near;
    if(Math.random()<ch){coverBlow(f,'a patrol scan saw through your false colours');for(const e of pats)e.ai.tgt=p}else if(sm>0)P.conPass=true}}
// ---- jam mode (4): guns fire jammers, missiles become shock harpoons (35% of the bar, and a tether that stretches the hook to 400 m)
function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;flash(p.jamMode?'Jam mode: guns fire jammers and missiles are shock harpoons. They never kill, and do nothing to a shielded ship.':'Jam mode off: guns and missiles kill again.')}
function harpHit(m){let T=m.tgt&&m.tgt.type==='ship'&&m.tgt.alive&&d3(m.tgt,m)<m.tgt.st.radius+60?m.tgt:null;if(!T){let bd=90;for(const e of W.ents)if(e.type==='ship'&&e.alive&&e!==m.src&&hostile(m.side,e.side)){const d=d3(e,m)-e.st.radius;if(d<bd){bd=d;T=e}}}if(!T)return;fxSpark(m,'#b7c6ff',8);if(T.shield>T.st.sCap*.05){if(m.src===W.player)flash('Harpoon bounced off the shields. Strip them first.');return}T.shield=0;
  jamHit(T,{side:m.side,dmg:jamCap(T)*.35,x:m.x,y:m.y,z:m.z,src:null});T.teth={by:m.src,until:W.t+30};if(m.src===W.player)flash('Harpoon in: tethered for 30 s, hook reach 400 m.')}
// ---- the cargo hook: hold E beside a jammed ship (150 m, 400 m tethered); 8 t/s, most valuable cargo first
function hookReach(T){return T.teth&&T.teth.until>W.t&&T.teth.by===W.player?400:JAM.hookR}
function hookTarget(){const p=W.player;if(!S.unb||!p||!W.tgt||W.tgt.kind!=='ship')return null;const T=W.tgt.ref;return T&&T.alive&&jamDark(T)&&d3(T,p)<hookReach(T)+T.st.radius?T:null}
function unbHook(dt){const p=W.player,P=unbP(),T=hookTarget();const tk=W.take;
  if(tk&&(!tk.T.alive||!jamDark(tk.T)||tk.T!==T||!keys.KeyE)){if(!tk.T.alive||!jamDark(tk.T))takeEnd();}
  if(!T||!keys.KeyE)return;const cg=T.cargo||{};if(!W.take||W.take.T!==T)W.take={T,moved:0,fac:T.side};const room=p.st.cargo-invMass(P.cargo);if(room<1){if(W.t-(W.hookMsg||0)>2){W.hookMsg=W.t;flash('Hold full. Let them go, or dump something.')}return}
  W.hookAcc=(W.hookAcc||0)+JAM.hookRate*dt;while(W.hookAcc>=1){const ks=Object.keys(cg).filter(k=>cg[k]>0&&mass(k)>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a));const k=ks[0];if(!k){W.hookAcc=0;break}const m=mass(k);
    if(invMass(P.cargo)+m>p.st.cargo){W.hookAcc=0;break}if(W.hookAcc<m)break;W.hookAcc-=m;inv.take(cg,k,1);inv.add(P.cargo,k,1);inv.add(P.stolen,k,1);W.take.moved+=m}
  if(W.t-(W.hookMsg||0)>1.5&&W.take.moved){W.hookMsg=W.t;flash(`Hooking ${fmt(W.take.moved)} t · ${Math.max(0,Math.ceil(T.jamOff-W.t))} s left in the window`)}}
// a take ends when the window closes (or the mark dies): heat, Infamy, Deeds
function takeEnd(){const tk=W.take;W.take=null;if(!tk||!tk.moved)return;const T=tk.T,P=unbP(),f=FAC_IDS.includes(tk.fac)?tk.fac:null;T.robbed=1;
  infAdd(tk.moved*UNB_INF.perTon);if(f)heatAdd(f,T.alive?UNB_HEAT.mercy:UNB_HEAT.take,T.alive?'a mercy take':'a take');
  feed(`☠ Take: ${fmt(tk.moved)} t from a ${f?FACTIONS[f].short+' ':''}${CLASSES[T.cls]?CLASSES[T.cls].name:'ship'}${T.alive?'. You let them go.':'.'}`,'good');
  S.sortie=S.sortie||{};S.sortie[T.id]=1;if(Object.keys(S.sortie).length>=3)deedAdd('three');
  const g=T.tradeT&&T.tradeT.id||T.escortG&&T.escortG.id;if(g){S.cvTake=S.cvTake||{};const c=S.cvTake[g]=S.cvTake[g]||{n:0,kill:0};c.n++;const left=W.ents.filter(e=>e.alive&&e!==T&&((e.tradeT&&e.tradeT.id)===g||(e.escortG&&e.escortG.id)===g)&&(e.role==='hauler'||e.role==='trader')&&!e.robbed).length;if(c.n>=2&&!c.kill&&!left)deedAdd('sweep')}}
// kills by the Unbound pilot: heat and Infamy instead of bounties
function unbKill(e){const f=FAC_IDS.includes(e.side)?e.side:null,civ=['hauler','trader','miner'].includes(e.role),A=aceOfEnt(e);
  if(civ){infAdd(UNB_INF.killCiv);if(f)heatAdd(f,UNB_HEAT.killCiv*(e.robbed?5:1),e.robbed?'you killed a ship you had just robbed':'a freighter or miner destroyed')}
  else if(f&&e.role!=='frigate')heatAdd(f,UNB_HEAT.killMil,'');
  if(A){infAdd(UNB_INF.ace);deedAdd('ace')}
  const g=e.tradeT&&e.tradeT.id||e.escortG&&e.escortG.id;if(g&&civ){S.cvTake=S.cvTake||{};(S.cvTake[g]=S.cvTake[g]||{n:0,kill:0}).kill++}}
// heat cools on its own: about 1 a minute, 2 in quiet systems (no faction ships, nobody's territory). Hot factions send hunters.
function unbTick(dt){if(!S.unb||!W||W!==LW)return;const P=unbP(),p=W.player;
  const quiet=!W.ents.some(e=>e.npc&&e.alive&&FAC_IDS.includes(e.side))&&!FAC_IDS.some(f=>territory(f).has(W.sid));
  for(const f of FAC_IDS)if(P.heat[f]>0)P.heat[f]=Math.max(0,P.heat[f]-(quiet?UNB_HEAT.coolQuiet:UNB_HEAT.cool)*dt);
  if(S.player.docked||!p||W.dead)return;unbHook(dt);unbScan(dt);
  P.huntT=P.huntT||{};for(const f of FAC_IDS){if(P.heat[f]<50||(P.huntT[f]||0)>S.T)continue;const T=territory(f);if(!T.has(W.sid)&&!NEIGH[W.sid].some(n=>T.has(n)))continue;
    P.huntT[f]=S.T+rnd(120,200)-(P.heat[f]>=75?40:0);let n=0;for(let i=0;i<3;i++){const e=spawnNPC('patrol',f);if(!e)break;const o=rdir();e.x=p.x+o.x*2200;e.y=p.y+o.y*400;e.z=p.z+o.z*2200;e.ai.tgt=p;e.hunt=1;e.ai.hunt=p;e.ai.huntUntil=W.t+240;n++}
    if(n)feed(`⚠ A ${FACTIONS[f].short} hunter wing (${n}) has your scent.`,'bad')}}
function unbGateHold(){if(!S.unb)return GATE_HOLD;const o=sideNorm(sectorOwner(W.sid));return FAC_IDS.includes(o)&&unbP().heat[o]>=75?10:GATE_HOLD}
// ---- haven dock tabs
function unbFenceRate(){return .7}
function unbFenceHtml(c,P,srcs){let h=`<p class="note" style="margin:0 0 12px">The Fence's Den buys anything at ${Math.round(unbFenceRate()*100)}% of market value, no questions asked: goods go into Unbound stores and the credits come out of the Unbound treasury. Stolen goods (☠) sell here; at a Freeport they only sell under false colours. Laundering needs the Den at level 2 (coming with the haven works).</p>`;
  const items=ITEM_ORDER.filter(k=>countIn(k,[P.cargo])>0&&!MUNITIONS.has(k));if(!items.length)return h+'<p class="note">Your hold is empty. Go and take something.</p>';
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Item</th><th class="r">In hold</th><th class="r">Fence pays</th><th></th></tr></thead><tbody>`;
  for(const k of items){const n=P.cargo[k]||0,st=(P.stolen||{})[k]||0,pr=Math.max(1,Math.floor(baseValue(k)*unbFenceRate()));h+=`<tr><td class="iname">${esc(ITEMS[k].name)}${st?` <span class="dchip hi">☠ ${st} stolen</span>`:''}<span class="mass">${mass(k)} t</span></td><td class="r num">${n}</td><td class="r num">${fmt(pr)} cr</td><td><div class="act"><button class="btn sm" data-act="fence" data-arg="${k}:1">Fence 1</button><button class="btn sm" data-act="fence" data-arg="${k}:all">Fence all</button></div></td></tr>`}
  return h+`</tbody></table></div><div class="act" style="margin-top:8px"><button class="btn" data-act="fence" data-arg="*:all">Fence the whole hold</button></div>`}
function unbFence(arg){const P=unbP(),[k0,n0]=String(arg).split(':'),keys=k0==='*'?Object.keys(P.cargo).filter(k=>!MUNITIONS.has(k)):[k0];let got=0,t=0;
  for(const k of keys){const n=n0==='all'?(P.cargo[k]||0):Math.min(+n0||1,P.cargo[k]||0);if(!(n>0))continue;const pr=Math.max(1,Math.floor(baseValue(k)*unbFenceRate()));const can=Math.min(n,Math.floor((S.econ.treasury.pirate||0)/pr));if(can<=0)continue;
    inv.take(P.cargo,k,can);inv.add(S.econ.stock.pirate,k,can);if(P.stolen[k]){P.stolen[k]=Math.max(0,P.stolen[k]-can);if(!P.stolen[k])delete P.stolen[k]}got+=transfer('pirate','player',pr*can);t+=can*mass(k)}
  dockErr=got?`✓ The Fence took ${fmt(t)} t for ${fmt(got)} cr.`:'The Fence has nothing to pay you with right now.'}
function unbBlackHtml(c,P){let h=`<p class="note" style="margin:0 0 12px">Unbound hulls, paid in credits to the haven. A bought hull goes down with you: you relaunch in a Raider. Trading in a bought hull returns half its price. Mk upgrades cost materials as usual (Upgrades tab).</p><div class="tblw"><table class="t"><thead><tr><th>Hull</th><th class="r">Hull</th><th class="r">Shields</th><th class="r">Hold</th><th class="r">Price</th><th></th></tr></thead><tbody>`;
  for(const k of UNB_HULLS){const st=shipStats('pirate',k,1),on=P.cls===k,pr=UNB_PRICE[k];h+=`<tr><td class="iname"><b>${esc(PIRATE.hulls[k])}</b> <span class="mass">${esc(CLASSES[k].desc||'')}</span></td><td class="r num">${Math.round(st.hull)}</td><td class="r num">${Math.round(st.sCap)}</td><td class="r num">${st.cargo} t</td><td class="r num">${pr?fmt(pr)+' cr':'free'}</td><td>${on?'<b>Flying</b>':`<button class="btn sm" data-act="unbhull" data-arg="${k}" ${P.credits+(UNB_PRICE[P.cls]||0)*TRADE_IN>=pr?'':'disabled'}>${pr?'Buy':'Switch'}</button>`}</td></tr>`}
  return h+`</tbody></table></div><p class="note" style="margin-top:10px">Harpoons are your missiles fired in jam mode (4). Jamming torpedoes for the Plunderer come with the Powder Magazine.</p>`}
function unbHull(k){const P=unbP();if(!UNB_HULLS.includes(k)||P.cls===k)return;const back=Math.floor((UNB_PRICE[P.cls]||0)*TRADE_IN),pr=UNB_PRICE[k];if(P.credits+back<pr){dockErr=`You need ${fmt(pr)} cr.`;return}
  if(back)transfer('pirate','player',back);if(pr)transfer('player','pirate',pr);P.cls=k;P.rack=Math.min(P.rack||0,rackCapC(k,P.tiers.weapon));refreshPlayerStats();const p=W.player;if(p){p.hull=p.st.hull;p.shield=p.st.sCap}dockErr=`✓ You fly a ${PIRATE.hulls[k]} now.`}
function unbMarks(){const out=[],near=new Set(['wr',...NEIGH.wr]);for(const t of S.traders||[]){if(!near.has(t.sector)&&!(t.path||[]).some(x=>near.has(x)))continue;if(!FAC_IDS.includes(t.side))continue;out.push({t,v:invValue(t.load||{})})}
  return out.sort((a,b)=>b.v-a.v)}
function unbMarksHtml(c,P){const L=unbMarks();let h=`<p class="note" style="margin:0 0 12px">Barroom rumours from the Rusty Tankard: faction freight moving through the systems next to The Wrack. Set a course, jam the freighter dark and hook its hold.</p>`;
  if(!L.length)return h+'<p class="note">No marks within a jump right now. Rumours change as convoys move.</p>';
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Mark</th><th>Where</th><th class="r">Cargo value</th><th class="r">Escorts</th><th></th></tr></thead><tbody>`;
  for(const{t,v}of L.slice(0,8)){const nm=`${FACTIONS[t.side].short} ${t.kind==='haul'?'supply convoy':'trader'}`,es=t.esc||t.escorts||0;h+=`<tr><td><b style="color:${sideCol(t.side)}">${esc(nm)}</b></td><td>${esc(DEF[t.sector].name)}${t.to&&t.to!==t.sector?` → ${esc(DEF[t.to].name)}`:''}<br><span class="mass">heat with ${esc(FACTIONS[t.side].short)}: ${Math.round(P.heat[t.side])}</span></td><td class="r num">~${fmt(Math.round(v/100)*100)} cr</td><td class="r num">${es||'?'}</td><td><button class="btn sm" data-act="vcourse" data-arg="${t.sector}">Set course</button></td></tr>`}
  return h+`</tbody></table></div>`}
function unbWantedHtml(c,P){const r=unbRank(P.inf),nx=UNB_RANKS[r+1];let h=`<div class="kv"><span>Rank</span><b>${UNB_RANKS[r][0]}</b><span>Infamy</span><b>${fmt(Math.round(P.inf))}${nx?` · ${fmt(nx[1]-Math.round(P.inf))} to ${nx[0]}`:''}</b><span>False colours</span><b>${(P.xpdrOut||0)>S.T?'burned out '+fmtT(P.xpdrOut-S.T):P.xpdr?'on':'off'} (K)</b><span>Legend point</span><b>${r>0&&P.deeds.length?'earned if you see the galaxy out':r>0?'needs a Deed':'needs Cutthroat (200 Infamy) and a Deed'}</b></div>`;
  h+=`<div class="h3" style="margin-top:12px">Heat</div><div class="tblw"><table class="t"><thead><tr><th>Faction</th><th class="r">Heat</th><th>Band</th><th>Response</th></tr></thead><tbody>`;
  for(const f of FAC_IDS){const v=Math.round(P.heat[f]),b=heatBand(v);h+=`<tr><td><b style="color:${sideCol(f)}">${esc(FACTIONS[f].short)}</b></td><td class="r num">${v}</td><td>${HEAT_BANDS[b][0]}</td><td>${['Ignores you; false colours work','Scans you on sight','Hunter wings','Freeports refuse you; gates 10 s'][b]}</td></tr>`}
  h+=`</tbody></table></div><p class="note">Heat cools about 1 a minute, 2 in quiet systems. A Freeport fixer sells it down for about 150 cr a point, once a visit.</p><div class="h3" style="margin-top:12px">Deeds</div>`;
  h+=P.deeds.length?P.deeds.map(d=>`<div class="note">★ <b>${DEED_NAMES[d.k]}</b> · ${esc(DEF[d.sid]?DEF[d.sid].name:'')} · ${fmtT(d.t)}</div>`).join(''):'<p class="note">None yet. Three for three (hook three ships in one sortie), Clean sweep (empty a convoy without a kill), Ace-breaker, The long con (pass a scan with stolen goods aboard, then sell at a Freeport). Heists and capital takes come with raids.</p>';
  return h}
function unbFixerHtml(c,P){if(!S.unb||c.owner!=='neutral')return'';let h=`<div class="h3" style="margin-top:14px">The fixer</div><p class="note" style="margin:0 0 8px">For about 150 cr a point, a Freeport fixer makes your record with one faction a little quieter. Once a visit.</p><div class="act">`;
  for(const f of FAC_IDS){const v=Math.round(P.heat[f]),n=Math.min(10,v),pr=n*150;h+=`<button class="btn sm" data-act="fixer" data-arg="${f}" ${n>0&&!P.fixUsed&&P.credits>=pr?'':'disabled'}>${esc(FACTIONS[f].short)} −${n} · ${fmt(pr)} cr</button>`}
  return h+`</div>`}
function unbFixer(f){const P=unbP();if(P.fixUsed||!FAC_IDS.includes(f))return;const n=Math.min(10,Math.round(P.heat[f]));if(!n)return;const got=transfer('player','neutral',n*150);if(got<n*150){if(got)transfer('neutral','player',got);dockErr='Not enough credits.';return}P.heat[f]=Math.max(0,P.heat[f]-n);P.fixUsed=1;dockErr=`✓ The fixer squared ${n} points of ${FACTIONS[f].short} heat.`}
// a Freeport sale of stolen goods after passing a scan under false colours: The long con
function unbSold(k,n){const P=unbP();if(!P.stolen[k])return;const m=Math.min(n,P.stolen[k]);P.stolen[k]-=m;if(!P.stolen[k])delete P.stolen[k];if(P.conPass)deedAdd('con')}
// the HUD: heat by faction, rank, and false colours
function unbHud(c){if(!S.unb||!W||!W.player)return;const P=unbP();c.save();c.font='600 11px "Saira Semi Condensed",sans-serif';c.textAlign='left';let y=VH-260;const x=18;
  c.fillStyle='rgba(216,205,152,.9)';c.fillText(`☠ ${UNB_RANKS[unbRank(P.inf)][0].toUpperCase()} · INFAMY ${fmt(Math.round(P.inf))}${W.player.jamMode?' · JAM MODE':''}`,x,y);y+=15;
  c.fillStyle=(P.xpdrOut||0)>S.T?'#ff8a7e':P.xpdr?'#7ad9a7':'rgba(236,228,207,.6)';c.fillText(`🎭 ${(P.xpdrOut||0)>S.T?'TRANSPONDER BURNED '+fmtT(P.xpdrOut-S.T):P.xpdr?'FALSE COLOURS: '+(FAC_IDS.filter(f=>unbCover(f)).map(f=>FACTIONS[f].short.toUpperCase()).join(' ')||'NONE COOL'):'FALSE COLOURS OFF (K)'}`,x,y);y+=15;
  for(const f of FAC_IDS){const v=P.heat[f],b=heatBand(v);c.fillStyle='rgba(236,228,207,.15)';c.fillRect(x,y-8,90,5);c.fillStyle=b>=3?'#ff5d4f':b>=2?'#ff9a4a':b>=1?'#f0b24a':sideCol(f);c.fillRect(x,y-8,90*v/100,5);c.fillStyle=sideCol(f);c.fillText(`${FACTIONS[f].short} ${Math.round(v)} ${HEAT_BANDS[b][0]}`,x+98,y-3);y+=13}
  const T=hookTarget();if(T){c.textAlign='center';c.font='700 14px "Saira Semi Condensed",sans-serif';c.fillStyle='#d8cd98';c.fillText(keys.KeyE?`HOOKING · ${Math.max(0,Math.ceil(T.jamOff-W.t))} S`:'HOLD E TO HOOK THE HOLD',VW/2,VH/2+70)}
  c.restore()}
// the debrief block and the Legend point
function unbDebrief(side){if(!S.unb)return'';const P=unbP(),r=unbRank(P.inf),ok=side!=='brood'&&r>0&&P.deeds.length>0;
  return`<div style="margin-top:12px;text-align:left"><b>☠ The Unbound: ${esc(P.name||'you')}</b>, ${UNB_RANKS[r][0]}, ${fmt(Math.round(P.inf))} Infamy.<br>${P.deeds.length?P.deeds.map(d=>`★ ${DEED_NAMES[d.k]} · ${esc(DEF[d.sid]?DEF[d.sid].name:'')} · ${fmtT(d.t)}`).join('<br>'):'No Deeds this galaxy.'}<br>${ok?'One Legend point for a pirate who went big.':side==='brood'?'The Bloom took the galaxy: no Legend point.':'No Legend point: it takes a rank above Nuisance and a Deed.'}</div>`}
function unbLegend(side){if(!S.unb||S.training)return;const P=unbP(),ok=side!=='brood'&&unbRank(P.inf)>0&&P.deeds.length>0;if(!ok)return;const d=legLoad(),r=legRec(P.name,d);if(!r)return;r.pts=Math.round(((r.pts||0)+1)*10)/10;r.wins.pirate=(r.wins.pirate||0)+1;r.last={side:'pirate',at:Date.now()};legSave(d);
  const el=$('winL');if(el){el.textContent=`★ Legend point earned as the Unbound: ${legFmt(r.pts)} total.`;el.hidden=false}}
"""
rep("function tunedK(e,kind){",JS+"function tunedK(e,kind){")

# ---------------------------------------------------------------- start screen: the fourth card
rep("$('facs').innerHTML=FAC_IDS.map(f=>{const F=FACTIONS[f];return`<button class=\"fac\" type=\"button\" data-fac=\"${f}\" aria-pressed=\"${f===selFac}\" style=\"--fc:${F.col}\"><canvas data-prev=\"${f}\"></canvas><div class=\"fn\">${F.name}</div><div class=\"fb\">${F.blurb}</div><div class=\"ft\">${F.traitText}</div><div class=\"fb\">Home: ${F.station}</div></button>`}).join('');",
    "{const ul=unbLegendOK(cleanCall($('mpName').value))&&!NET.on,U=FAC('pirate');if(selFac==='pirate'&&!ul)selFac='halcyon';$('facs').innerHTML=FAC_IDS.map(f=>{const F=FACTIONS[f];return`<button class=\"fac\" type=\"button\" data-fac=\"${f}\" aria-pressed=\"${f===selFac}\" style=\"--fc:${F.col}\"><canvas data-prev=\"${f}\"></canvas><div class=\"fn\">${F.name}</div><div class=\"fb\">${F.blurb}</div><div class=\"ft\">${F.traitText}</div><div class=\"fb\">Home: ${F.station}</div></button>`}).join('')+`<button class=\"fac\" type=\"button\" data-fac=\"pirate\" aria-pressed=\"${selFac==='pirate'}\" style=\"--fc:${U.col}${ul?'':';opacity:.55'}\"><canvas data-prev=\"pirate\"></canvas><div class=\"fn\">${ul?'':'🔒 '}${U.name}</div><div class=\"fb\">${U.blurb}</div><div class=\"ft\">${ul?U.traitText:NET.on?'Unbound crew galaxies come with the next stage. Solo only for now.':'Earn a Legend point flying for a faction to unlock the Unbound.'}</div><div class=\"fb\">Home: ${U.station}</div></button>`}")
rep("$('facs').addEventListener('click',e=>{const b=e.target.closest('[data-fac]');if(!b)return;selFac=b.dataset.fac;showStart()});",
    "$('facs').addEventListener('click',e=>{const b=e.target.closest('[data-fac]');if(!b)return;if(b.dataset.fac==='pirate'&&(!unbLegendOK(cleanCall($('mpName').value))||NET.on)){$('ssum').innerHTML=`<b style=\"color:var(--amber)\">${NET.on?'Unbound crew galaxies come with the next stage: fly the Unbound solo for now.':'The Unbound unlock once this callsign has earned a Legend point flying for a faction.'}</b>`;return}selFac=b.dataset.fac;if(selFac==='pirate')selCls='raider';else if(UNB_HULLS.includes(selCls))selCls='interceptor';showStart()});")
rep("function launchCls(){return ","function launchCls(){if(selFac==='pirate')return'raider';return ")
rep("$('clsrow').innerHTML=CLS_IDS.map(",
    "if(selFac==='pirate'){$('roles').innerHTML='<div class=\"note\" style=\"padding:8px\">Pirates don\\'t work: no mining, hauling or scouting hulls. You start in a Raider; the Corsair and Plunderer are sold at the haven\\'s black market.</div>'}\n  $('clsrow').innerHTML=(selFac==='pirate'?UNB_HULLS:CLS_IDS).map(")
rep("${ROLES[selRole].ships.includes(k)?'':'hidden'}><b>${FAC(selFac).hulls[k]}</b><em>${CLASSES[k].name}</em><span style=\"font-size:11px;color:var(--faint)\">${START_HULLS.includes(k)?'starting hull':'🔒 '+fmt(hullPrice(k))+' cr'}</span></button>`",
    "${selFac==='pirate'||ROLES[selRole].ships.includes(k)?'':'hidden'}><b>${FAC(selFac).hulls[k]}</b><em>${CLASSES[k].name}</em><span style=\"font-size:11px;color:var(--faint)\">${selFac==='pirate'?(k==='raider'?'starting hull':'🔒 '+fmt(UNB_PRICE[k])+' cr at the haven'):START_HULLS.includes(k)?'starting hull':'🔒 '+fmt(hullPrice(k))+' cr'}</span></button>`")
rep("newGame(selFac,launchCls(),cs);S.player.name=cs;startWith(S);",
    "newGame(selFac,launchCls(),cs);S.player.name=cs;if(selFac==='pirate'){S.unb=1;unbP();S.player.cls='raider'}startWith(S);")
# ---------------------------------------------------------------- the haven dock
rep("function dockCtx(){\n  const P=S.player,d=DEF[P.sector];vaultSync(P);\n  if(P.docked==='station'){const R=S.stations[P.sector],f=R.owner;",
    "function dockCtx(){\n  const P=S.player,d=DEF[P.sector];vaultSync(P);\n  if(P.docked==='station'){const R=S.stations[P.sector],f=R.owner;if(f==='pirate')return{kind:'station',name:R.name,sub:`The Unbound · pirate haven · ${d.name}`,owner:'pirate',market:null,wallet:'pirate',fee:false,forge:false,fab:false,storage:P.vault,storageName:'Vault',hulls:false,contracts:false,fortify:false,works:false,haven:true};")
rep("const DOCK_GROUPS=[","const DOCK_GROUPS=[['haven','Scrapheart',['fence','black','marks','wanted']],")
rep("  const tabs=[];if(c.market)tabs.push(['market','Market']);",
    "  const tabs=[];if(c.haven)tabs.push(['fence','Fence'],['black','Black market'],['marks','Marks'],['wanted','Wanted']);if(c.market)tabs.push(['market','Market']);")
rep("tabs.push(['trade','Trade']);if(c.contracts||","if(!c.haven)tabs.push(['trade','Trade']);if(!S.unb&&c.contracts||")
rep("tabs.push(['ship','Shipyard'],['storage',c.storageName]);","if(!c.haven&&!S.unb)tabs.push(['ship','Shipyard']);tabs.push(['storage',c.storageName]);")
rep("  let h='';\n  if(dockTab==='market'){",
    "  let h='';\n  if(dockTab==='fence')h+=unbFenceHtml(c,P,srcs);else if(dockTab==='black')h+=unbBlackHtml(c,P);else if(dockTab==='marks')h+=unbMarksHtml(c,P);else if(dockTab==='wanted')h+=unbWantedHtml(c,P);\n  if(dockTab==='market'){if(S.unb)h+=unbFixerHtml(c,P);")
rep("function dockAction(act,arg){const c=dockCtx(),P=S.player,p=W.player,srcs=[P.cargo,c.storage];",
    "function dockAction(act,arg){const c=dockCtx(),P=S.player,p=W.player,srcs=[P.cargo,c.storage];if(act==='fence'){unbFence(arg);return}if(act==='unbhull'){unbHull(arg);return}if(act==='fixer'){unbFixer(arg);return}")
# a Freeport sale of stolen goods
rep("  if(act==='buy'&&MUNITIONS.has(arg.split(':')[0]))return;","  if(act==='sell'&&S.unb&&c.owner==='neutral'){const k=String(arg).split(':')[0];if((P.stolen||{})[k]&&!(P.xpdr&&!((P.xpdrOut||0)>S.T))){dockErr='Stolen goods sell at a Freeport only under false colours (K).';return}}\n  if(act==='buy'&&MUNITIONS.has(arg.split(':')[0]))return;")
rep("if(sold)dockErr=`✓ Sold ${sold} ${ITEMS[k].name} for ${fmt(earn)} cr.","if(sold&&S.unb&&c.owner==='neutral')unbSold(k,sold);if(sold)dockErr=`✓ Sold ${sold} ${ITEMS[k].name} for ${fmt(earn)} cr.")
# reset per-visit and per-sortie state on docking
rep("function openDock(){dockErr='';","function openDock(){dockErr='';if(S&&S.unb){S.sortie={};S.player.fixUsed=0}")
# ---------------------------------------------------------------- flight: keys, hook, harpoons, cover, gates, kills, HUD
rep("  if(c==='Digit4'&&blHull(S.player.cls))blKeyPress('cancel');","  if(c==='Digit4'&&blHull(S.player.cls))blKeyPress('cancel');else if(c==='Digit4'&&S.unb)jamToggle();")
rep("  if(c==='KeyK'&&S.player.cls==='wraith'){stealthOn();return}","  if(c==='KeyK'&&S.unb){xpdrToggle();return}\n  if(c==='KeyK'&&S.player.cls==='wraith'){stealthOn();return}")
rep("f(S.player.docked)undock();else if(W&&W.player&&W.player.landed)liftOff();else tryDock();return}",
    "f(S.player.docked)undock();else if(W&&W.player&&W.player.landed)liftOff();else if(S.unb&&hookTarget()){return}else tryDock();return}")
rep("function detonate(m,i){","function detonate(m,i){if(m.harp){W.missiles.splice(i,1);harpHit(m);return}")
rep("else for(let i=0;i<n;i++)launchMissile(W.player,L.ref,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0)}",
    "else{for(let i=0;i<n;i++)launchMissile(W.player,L.ref,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0);if(S.unb&&W.player.jamMode)for(let i=1;i<=n;i++){const mm=W.missiles[W.missiles.length-i];if(mm&&mm.src===W.player){mm.harp=1;mm.col='#b7c6ff'}}}unbShot()}")
s=s.replace("if(P.wpn==='laser')fireLaser(p);else fire(p)","if(P.wpn==='laser'&&!p.jamMode)fireLaser(p);else fire(p)")
# any shot fired blows cover; the shot itself is the jammer in jam mode
rep("function fire(e){","function fire(e){if(e.isPlayer&&S.unb&&e.cool<=0)unbShot();")
# gates in a faction's space take 10 s while you're Wanted by it
import re as _re
_i=s.index("function gateCountdown(p){");_j=s.index("\nfunction",_i+10);seg=s[_i:_j];assert "GATE_HOLD" in seg;s=s[:_i]+seg.replace("GATE_HOLD","unbGateHold()")+s[_j:]
# kills pay heat and Infamy, never bounties; the Legend point and the debrief
rep("  for(const k in sh)runAs(isMe(k)?null:k,()=>{const f=S.player.faction,x=sh[k],pct=Math.round(x*100);","  if(S.unb&&(sh.me||sh[NET.me]||killer==='me')){unbKill(e);return}\n  for(const k in sh)runAs(isMe(k)?null:k,()=>{const f=S.player.faction,x=sh[k],pct=Math.round(x*100);")
rep("function legAward(side){if(!S||S.training||NET.cl)return;","function legAward(side){if(!S||S.training||NET.cl)return;if(S.unb){unbLegend(side);return}")
rep("$('winS').textContent=`Galaxies won","if(S.unb)$('winP').innerHTML=esc($('winP').textContent)+unbDebrief(side);$('winS').textContent=`Galaxies won")
# the world tick and the HUD
rep("W.t+=dt;W.fdt=dt;worksSync();","W.t+=dt;W.fdt=dt;worksSync();if(S.unb)unbTick(dt);")
rep("drawDocking(c);jamFx(c);blDraw(c);","drawDocking(c);jamFx(c);blDraw(c);unbHud(c);")
# Unbound missiles hit shields 25% harder
rep("const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind)*vsShK(e,at,kind),","const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind)*vsShK(e,at,kind)*(S.unb&&at&&at.ttl!==undefined&&at.src===W.player&&!at.harp?1.25:1),")
# faction-only actions answer the Unbound with a line
rep("function requestBuild(){if(!W||!W.player)return;","function requestBuild(){if(!W||!W.player)return;if(S.unb){flash('No faction builds for the Unbound. Lairs come with the haven works.',true);return}")
rep("function pilotDistress(){if(!W||!W.player)return;","function pilotDistress(){if(!W||!W.player)return;if(S.unb){flash('Nobody answers an Unbound distress call.',true);return}")
rep("function planKey(){","function planKey(){if(S.unb){flash('The Unbound take no campaign orders. Check the Marks tab at the haven.',true);return}")
rep("if(e.isPlayer){if((S.player.cargo.beacon||0)>0&&o.owner!=='player'","if(e.isPlayer){if(!S.unb&&(S.player.cargo.beacon||0)>0&&o.owner!=='player'")
# the target panel shows the Jam bar while you jam it
rep("${T.vr?`<div class=\"ts\" style=\"color:#9fe0c8\">Fitted:","${S.unb&&(T.jam>0||jamDark(T))?`<div class=\"ts\" style=\"color:#b7c6ff\">${jamDark(T)?`JAMMED DARK · ${Math.max(0,Math.ceil(T.jamOff-W.t))} s · hold E within ${hookReach(T)} m to hook`:`Jam bar ${Math.round(jamFrac(T)*100)}%`}${T.teth&&T.teth.until>W.t?' · tethered':''}</div>`:''}${T.vr?`<div class=\"ts\" style=\"color:#9fe0c8\">Fitted:")
rep("function campHud(){const el=$('hOrd');if(!el)return;","function campHud(){const el=$('hOrd');if(!el)return;if(S.unb){el.hidden=true;return}")
rep("Welcome aboard, ${cs}, pilot of the ${FAC(selFac).name}.","Welcome aboard, ${cs}, ${selFac==='pirate'?'captain of the Unbound':'pilot of the '+FAC(selFac).name}.")
rep("function brMapMarks(c,d,x,y,r,t){const bc=FACTIONS.brood.col;","function brMapMarks(c,d,x,y,r,t){const bc=FACTIONS.brood.col;if(S.unb){const mk=unbMarks().filter(o=>o.t.sector===d.id);if(mk.length){c.font='700 9px \"Saira Semi Condensed\",sans-serif';c.textAlign='center';c.fillStyle='#d8cd98';c.fillText(`☠ ${mk.length} MARK${mk.length>1?'S':''}`,x,y+r+14)}}")
open(P,'w',encoding='utf-8').write(s);print('stage A written')
