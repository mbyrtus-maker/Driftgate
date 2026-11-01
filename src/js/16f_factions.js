//@src 16f_factions.js
// ============================================================ faction identities (built Nov 2026; design in DESIGN_NOTES
// "Faction identities"). Each faction owns one career: a job bonus for the riskiest work in it (players), a survival perk
// (players and AI), and a signature combat hull converted from its career hull at the faction's own shipyard (players only).
//   Halcyon · hauling: +20% on Freeport hauling jobs; convoys to or from a Freeport get a charter escort; AI convoys on Freeport
//     routes are harder to raid off-screen. Signature: the Gannet (converted Medium Hauler), a 12-cell light-missile barrage.
//   Varkesh · mining: +20% on Aurorite mining jobs; Ward Drones on Varkesh mining hulls have +40% hull and +25% damage (AI too).
//     Signature: the Bombard (converted Heavy Miner), a slow shell cannon whose shells also crack rock.
//   Ostrova · scouting: +40% on all scouting pay; Seer, Oracle and Vesper shields hold 40% more and recharge 40% slower (AI too,
//     and AI scouts are lost less often off-screen). Signature: the Vesper (converted Advanced Scout), a charged railgun.
const FPK={fpJob:.2,auJob:.2,scoutPay:.4,wardHull:1.4,wardDmg:1.25,shCap:1.4,shReg:.6,scoutRisk:.75,fpRaid:.75};
const SIG={gannet:{base:'freighter',f:'halcyon',price:4000},bombard:{base:'dredger',f:'varkesh',price:6000},vesper:{base:'scout2',f:'ostrova',price:5000}};
const SIG_OF={halcyon:'gannet',varkesh:'bombard',ostrova:'vesper'};
const GAN={cells:12,recharge:2.5,k:.25,range:2400,cone:.6,maxT:6};
const SHELL={spd:450,cd:2,k:10,ttl:6,eK:3,chip:.12,chipMax:14,yield:.6};
const RAIL={charge:2,range:4000,dmg:340,e:45,minE:12,cd:.6,unseen:1.25,subK:1.5};
CLASSES.gannet=Object.assign({},CLASSES.freighter,{name:'Gannet',cargo:50,shield:1.3,barrage:GAN.cells,desc:'Halcyon signature hull, converted from the Medium Hauler. Hauler frame and good shields, half the hold (50 t of freight). The other half is a launch-cell bank: C fires a barrage of up to 12 light missiles, spread across every hostile ship ahead of you within 2.4 km. A cell recharges every 2.5 s; fire a partial salvo any time. Weak missiles: heavy armour shrugs them off. 3 guard drones.'});
CLASSES.bombard=Object.assign({},CLASSES.dredger,{name:'Bombard',cargo:45,hull:215,shellGun:1,desc:'Varkesh signature hull, converted from the Heavy Miner. Miner armour and drones, part of the hold (45 t) and a three-charge blast rig. Its guns are a slow shell cannon: one shell every 2 s at 450 m/s, about ten cannon bolts per hit, so lead your shots. Shells crack rock too: mine by artillery, from range and under fire (less ore per rock). Slow; agile fighters dodge the shells.'});
CLASSES.vesper=Object.assign({},CLASSES.scout2,{name:'Vesper',rack:0,swarm:0,twin:false,rail:1,desc:'Ostrova signature hull, converted from the Advanced Scout. Nearly a scout\'s speed, the scout radar, beacon flipping and limpets; no missiles. Its gun is a railgun: hold fire about 2 s to charge, release to fire a near-instant slug out to 4 km. A full charge kills a Light Fighter outright, a Heavy Fighter in two. Hits harder on a target that isn\'t fighting you, cracks capital-ship weak points, and is helpless up close.'});
for(const f of FAC_IDS)Object.assign(FACTIONS[f].hulls,{gannet:'Gannet',bombard:'Bombard',vesper:'Vesper'});
Object.assign(HULL_PRICE_SET,{gannet:SIG.gannet.price,bombard:SIG.bombard.price,vesper:SIG.vesper.price});
BL_HULL.bombard={n:3,reload:110,coll:12,cd:.5,k:3};
CK_CLS.gannet=Object.assign({},CK_CLS.freighter,{panels:['vitals','speed','barrage','drones']});
CK_CLS.bombard=Object.assign({},CK_CLS.dredger,{panels:['drones','vitals','speed','shell','drill'],ops:'ARTILLERY'});
CK_CLS.vesper=Object.assign({},CK_CLS.scout,{panels:['intel','vitals','scope','rail','scan']});
SHOT_STY.shell=[34,9];
function isSigCls(c){return!!SIG[c]}
function sigName(f){const k=SIG_OF[f];return k?FAC(f).hulls[k]:''}
{const o=isScoutCls;isScoutCls=function(c){return c==='vesper'||o(c)}}
{const o=isHaulCls;isHaulCls=function(c){return c==='gannet'||o(c)}}
{const o=capChip;capChip=function(k){return k==='rail'?.5:o(k)}}

// ---- Ostrova scout shields: deeper, slower to come back (players and AI alike, wherever stats are built)
{const o=shipStatsBase;shipStatsBase=function(fac,cls){const B=o.apply(this,arguments);if(fac==='ostrova'&&(cls==='scout'||cls==='scout2'||cls==='vesper')){B.sCap*=FPK.shCap;B.shRegK=(B.shRegK||1)*FPK.shReg}return B}}

// ---- Varkesh Ward Drones: a drone launched by a Varkesh mining hull (player, guest or AI) is tougher and hits harder
function wardMom(d){const m=d.mom;if(!m)return null;const f=m.isPlayer?S.player.faction:m.rp?(S.pilots&&S.pilots[m.rp]||{}).faction:m.fac||m.side;return{f,cls:m.isPlayer?S.player.cls:m.cls}}
function wardTick(){if(NET.cl||!W)return;for(const d of W.ents){if(d.role!=='drone'||!d.alive||d._wd||!d.mom||!d.st)continue;d._wd=1;const M=wardMom(d);if(!M||M.f!=='varkesh'||!(blHull(M.cls)))continue;
  d.st=Object.assign({},d.st,{hull:d.st.hull*FPK.wardHull,dmg:d.st.dmg*FPK.wardDmg});d.hull*=FPK.wardHull;d.ward=1}}

// ---- Halcyon off-screen: AI convoys running to or from a Freeport count the Compact's escorts in a raid on them
function isFPsid(sid){const R=S.stations[sid];return!!R&&R.owner==='neutral'}
function fpRoute(t){return!!t&&(isFPsid(t.from)||isFPsid(t.to)||String(t.key||'').startsWith('imp:'))}
let RF_T=null;
{const o=raidFight;raidFight=function(r){RF_T=r&&r.tgt?(S.traders||[]).find(x=>x.id===r.tgt)||null:null;try{return o.apply(this,arguments)}finally{RF_T=null}}}
{const o=raidOdds;raidOdds=function(r,sid,base,owner){const p=o.apply(this,arguments);if(RF_T&&RF_T.side==='halcyon'&&owner==='halcyon'&&fpRoute(RF_T))return clamp(p*FPK.fpRaid,.05,.95);return p}}

// ---- Halcyon pilots: a convoy to or from a Freeport gets one more escort (the Compact's charter), and can be called at a Freeport
function fpConvoyOK(P){return P.faction==='halcyon'&&(isFPsid(P.sector)||(P.route&&isFPsid(P.route)))}
{const o=convoyCall;convoyCall=function(){const P=S.player,r=o.apply(this,arguments);const C=P.convoy;if(!C||C.charter||!String(r).startsWith('✓')||!fpConvoyOK(P))return r;C.charter=1;
  const f=P.faction,tier=factionTier(f),srcs=[S.econ.fleet[f],S.econ.stock[f]].filter(Boolean);let cl=pickFighter('patrol'),ld=loadout('patrol',tier,cl);if(!haveIn(ld,srcs)){cl='interceptor';ld=loadout('patrol',tier,cl)}
  if(!takeFrom(ld,srcs))return r;C.ships.push({cls:cl,tier,load:{...ld}});return r.replace(/✓ Convoy called: \d+/,`✓ Convoy called: ${C.ships.length}`)+' Freeport charter: one extra escort on this run.'}}
{const o=convoyHtml;convoyHtml=function(c,P){if(P&&P.faction==='halcyon'&&c&&c.owner==='neutral'&&isHaulCls(P.cls))return o.call(this,Object.assign({},c,{owner:P.faction}),P)+'<p class="note" style="margin-top:4px">Halcyon charter: convoys to or from a Freeport fly with one extra escort.</p>';return o.apply(this,arguments)}}

// ---- job bonuses, paid by the pilot's own faction treasury on top of the job's pay
// Halcyon +20% on Freeport hauling jobs (contracts posted at a Freeport and Freeport requests); Varkesh +20% on Aurorite
// mining jobs (Aurorite contracts and Aurorite supply drives); Ostrova +40% on scouting pay (beacon flips, residuals and
// missions, recon orders, Seeder spotting, limpet pings, lair finds, anomaly scans)
function jobBonusK(P,k){if(!P||!k)return 0;if(P.faction==='halcyon'&&k.fac==='neutral')return FPK.fpJob;if(P.faction==='varkesh'&&k.item==='au')return FPK.auJob;return 0}
function jobBonusTag(f){return f==='halcyon'?'Halcyon charter':f==='varkesh'?'Dominion Aurorite':'Archive scouting'}
{const o=dockAction;dockAction=function(act,arg){const P=S.player;let k0=0,f=P&&P.faction;
  if(act==='deliver'){const k=S.contracts.find(x=>String(x.id)===String(arg));k0=jobBonusK(P,k)}
  else if(act==='cmine'){const C=myCamp(),m=C&&C.mv;if(m&&m.item==='au'&&f==='varkesh')k0=FPK.auJob}
  if(act==='sigconv'){sigConvert(dockCtx(),P);return}
  const c0=P?P.credits:0,r=o.apply(this,arguments);if(k0>0&&P&&P.credits>c0){const b=transfer(f,'player',Math.round((P.credits-c0)*k0));if(b){const t=` ${jobBonusTag(f)} bonus +${fmt(b)} cr.`;if(typeof dockErr==='string'&&dockErr.startsWith('✓'))dockErr+=t;feed(`${jobBonusTag(f)} bonus: +${fmt(b)} cr from the ${FACTIONS[f].short} treasury.`,'good')}}return r}}
let FB_SCOUT=0;
function fbScoutWrap(fn,test){return function(){const on=test?test.apply(this,arguments):true;if(on)FB_SCOUT++;try{return fn.apply(this,arguments)}finally{if(on)FB_SCOUT--}}}
{const o=payKey;payKey=function(k,f,n){if(FB_SCOUT>0&&f==='ostrova'&&n>0){const P=xPilotOfKey(k);if(P&&P.faction==='ostrova'){const b=Math.round(n*FPK.scoutPay);const got=o.call(this,k,f,n+b);if(got>n&&b>=20)keyFeed(k,`◆ Archive scouting bonus: +${fmt(got-n)} cr of that.`,'good');return got}}return o.apply(this,arguments)}}
spotPay=fbScoutWrap(spotPay);beaconFlip=fbScoutWrap(beaconFlip);beaconTick=fbScoutWrap(beaconTick);capPingPay=fbScoutWrap(capPingPay);lairWorld=fbScoutWrap(lairWorld);anomOpen=fbScoutWrap(anomOpen);
sideEnd=fbScoutWrap(sideEnd,function(f,P,o){return!!(o&&SIDE[o.kind]&&SIDE[o.kind].lane==='intel')});
{const o=jobsList;jobsList=function(c,P){const L=o.apply(this,arguments);if(!P||!FAC_IDS.includes(P.faction))return L;const f=P.faction;
  for(const j of L){let k=0;const id=String(j.id);
    if(id.startsWith('k:')||id.startsWith('r:')){const K=S.contracts.find(x=>String(x.id)===id.slice(2));k=jobBonusK(P,K)}
    else if(id==='camp'&&f==='varkesh'){const C=myCamp(),m=C&&C.mv;if(m&&m.kind==='mine'&&m.item==='au')k=FPK.auJob}
    else if(f==='ostrova'&&j.ty==='scout')k=FPK.scoutPay;
    if(k>0){j.pay=`${j.pay} +${Math.round(k*100)}%`;j.sub=`${j.sub} · ${jobBonusTag(f)} +${Math.round(k*100)}%`;if(j.payN&&j.payN<1e8)j.payN=Math.round(j.payN*(1+k))}}
  return L}}

// ---- signature hulls at the faction's own shipyard (its home core station), converted from the career hull you fly
function sigFee(k){return Math.max(0,SIG[k].price-hullPrice(SIG[k].base))}
function sigYardHtml(c,P){if(S.unb||!c||!c.hulls||!FAC_IDS.includes(P.faction))return'';const k=SIG_OF[P.faction],B=SIG[k].base,F=FAC(P.faction),home=P.sector===FAC_HOME(P.faction),fee=Math.max(0,sigFee(k)-(P.sigVch&&P.sigVch.k===k?P.sigVch.amt:0));
  const cur=P.cls===k,can=home&&P.cls===B&&P.credits>=fee,why=cur?'<span class="req ok">current</span>':!home?`<span class="req no">converted only at ${esc(S.stations[FAC_HOME(P.faction)]?S.stations[FAC_HOME(P.faction)].name:DEF[FAC_HOME(P.faction)].name)}</span>`:P.cls!==B?`<span class="req no">fly your ${esc(F.hulls[B])} (${esc(CLASSES[B].name)}) in to convert it</span>`:`<span class="req ${P.credits>=fee?'ok':'no'}">convert · ${fmt(fee)} cr</span>`;
  return`<div class="h3" style="margin-top:18px">Signature hull · ${esc(F.short)} only</div><div class="note" style="margin-bottom:8px">Your faction's own combat conversion of its ${esc(CLASSES[B].name)}, built only at its home shipyard. You pay the conversion; your components, tunings and drones carry over. Switching away later trades it in for half its full value (${fmt(SIG[k].price)} cr).</div><div class="ships" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))"><button class="cls" type="button" data-act="sigconv" data-arg="${k}" aria-pressed="${cur}" ${can&&!cur?'':'disabled'}><b>${esc(F.hulls[k])}</b><em>${esc(CLASSES[k].name)} · from the ${esc(F.hulls[B])}</em><span>${esc(CLASSES[k].desc)}</span>${tagsHtml(k)}<span style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${why}</span></button></div>`}
// an insured signature hull lost: the voucher goes toward a new career hull, and what's left toward the conversion
{const o=insLoss;insLoss=function(P,lost){o.apply(this,arguments);const v=P.voucher;if(!v||!SIG[v.cls])return;const B=SIG[v.cls].base,a=Math.min(v.amt,hullPrice(B));P.sigVch={k:v.cls,amt:v.amt-a};P.voucher={cls:B,amt:a};
  feed(`🛡 The voucher splits: ${fmt(a)} cr toward a new ${FAC(P.faction).hulls[B]}, ${fmt(v.amt-a)} cr toward converting it again.`,'good')}}
function sigConvert(c,P){const k=SIG_OF[P.faction];if(!k||!c||!c.hulls)return;const B=SIG[k].base,F=FAC(P.faction),fee=sigFee(k);
  if(P.sector!==FAC_HOME(P.faction)){dockErr=`The ${F.hulls[k]} is built only at your faction's home shipyard.`;return}
  if(P.cls!==B){dockErr=`Fly your ${F.hulls[B]} in to convert it to a ${F.hulls[k]}.`;return}
  const sv=P.sigVch&&P.sigVch.k===k?Math.min(fee,P.sigVch.amt):0;if(P.credits<fee-sv){dockErr=`The conversion costs ${fmt(fee-sv)} cr.`;return}
  const room=shipStats(P.faction,k,P.tiers,P.tune).cargo;if(invMass(P.cargo)>room){dockErr=`Store some cargo first: the ${F.hulls[k]} holds ${room} t.`;return}
  if(fee-sv>0)transfer('player',c.wallet||P.faction,fee-sv);if(sv)P.sigVch=null;P.hullPaid=(P.hullPaid==null?hullPrice(B):P.hullPaid)+fee;P.cls=k;P.rack=rackCapC(k,P.tiers.weapon);P.mslT=0;P.swarm=CLASSES[k].swarm||0;P.swT=0;
  {const nc=CLASSES[k].drones||0;P.bay=P.bay||{};if((P.bay.drone||0)>nc){inv.add(c.storage,'drone',P.bay.drone-nc);P.bay.drone=nc}}
  if(k==='gannet')P.gcell=GAN.cells;hullsOwned(P);if(W&&W.player&&(S.player===P)){refreshPlayerStats();W.player.hull=W.player.st.hull}
  dockErr=`✓ Converted for ${fmt(fee-sv)} cr${sv?` (insurance paid ${fmt(sv)})`:''}. You now fly the ${F.hulls[k]}.`;feed(`🛠 ${F.short} yard: your ${F.hulls[B]} is now a ${F.hulls[k]}.`,'good')}

// ---- Gannet: light-missile barrage on C, spread across every hostile ship ahead
function ganTargets(e,first){const out=[];if(first&&first.type==='ship'&&first.alive)out.push(first);qRot(e.q,0,0,1,_f);const L=[];
  for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e||out.includes(o)||o.role==='limpet')continue;if(o.isPlayer&&(S.player.docked||W.dead))continue;if(!hostile(e.side,o.side)||mHid(o,e))continue;
    const dx=o.x-e.x,dy=o.y-e.y,dz=o.z-e.z,d=hyp(dx,dy,dz)||1;if(d>GAN.range)continue;if(Math.acos(clamp((_f.x*dx+_f.y*dy+_f.z*dz)/d,-1,1))>GAN.cone)continue;L.push([d,o])}
  L.sort((a,b)=>a[0]-b[0]);for(const[,o]of L){if(out.length>=GAN.maxT)break;out.push(o)}return out}
function ganSalvo(e,P,T){const n=Math.floor(P.gcell||0);if(n<1||!T.length)return 0;P.gcell-=n;for(let i=0;i<n;i++){const tg=T[i%T.length];launchMissile(e,tg,P.tiers.weapon,'missile',((i%4)-1.5)/1.5,true);const m=W.missiles[W.missiles.length-1];if(m&&m.src===e){m.dmg*=GAN.k;m.mini=1;m.checked=true;m.col='#9fe8ff';m.vx+=rnd(-35,35);m.vy+=rnd(-35,35);m.vz+=rnd(-35,35)}}return n}
function ganFire(){if(!W||!running||S.player.docked||W.dead||W.docking)return;const P=S.player,p=W.player;if(!p||jamDark(p)){flash('Jammed: launch cells dark.',true);return}if(p.landed||p.stealth||(p.boot&&W.t<p.boot))return;
  if(P.gcell==null)P.gcell=GAN.cells;if(P.gcell<1){flash(`Launch cells recharging: next in ${Math.ceil((1-(P.gcell%1))*GAN.recharge)} s.`,true);return}
  const first=W.tgt&&W.tgt.kind==='ship'&&validTgt(W.tgt)&&hostile('player',W.tgt.ref.side)?W.tgt.ref:null,T=ganTargets(p,first);if(!T.length){flash('No hostile ships ahead within 2.4 km.',true);return}
  if((W.mslCd||0)>0)return;W.mslCd=.6;const n=Math.floor(P.gcell);
  if(NET.cl){netSend({t:'msl',k:'g',tg:netTid(T[0])});P.gcell-=n;SFX.missile(1,false)}else ganSalvo(p,P,T);flash(`Barrage: ${n} missile${n>1?'s':''} across ${T.length} target${T.length>1?'s':''}.`)}
{const o=fireMissile;fireMissile=function(){if(S&&S.player&&S.player.cls==='gannet')return ganFire();if(S&&S.player&&S.player.cls==='vesper'){flash('The Vesper carries no missiles: hold fire to charge the railgun.',true);return}return o.apply(this,arguments)}}
{const o=hMissile;hMissile=function(pid,m){if(m&&m.k==='g'){const e=MP.rp[pid],P=S.pilots[pid];if(!e||!P||P.cls!=='gannet')return;inW(worldOf(e),()=>{const T0=resolveTgt(String(m.tg));runAs(pid,()=>ganSalvo(e,P,ganTargets(e,T0&&T0!==e?T0:null)))});return}return o.apply(this,arguments)}}
{const o=magTick;magTick=function(P,dt){o.apply(this,arguments);if(!P)return;if(P.cls==='gannet'){if(P.gcell==null)P.gcell=GAN.cells;if(P.docked&&P.docked!=='bridge'&&P.docked!=='turret')P.gcell=GAN.cells;else P.gcell=Math.min(GAN.cells,P.gcell+dt/GAN.recharge)}}}

// ---- Bombard: the shell cannon (any key that fires guns fires it); a shell that hits rock knocks a chunk of ore loose
function shellFire(e){if(e.train||jamDark(e)||e.landed||e.stealth||(e.boot&&W.t<e.boot))return;if(e.cool>0)return;const cost=e.st.shotCost*SHELL.eK;
  if(e.energy<cost){if(e.isPlayer&&W.t-(W.lowEMsg||0)>2.5){flash('The shell cannon needs energy. Let the reactor recharge.');W.lowEMsg=W.t}return}
  e.cool=SHELL.cd;e.energy-=cost;e.lastFire=W.t;qRot(e.q,0,0,1,_f);const r=e.st.radius,sx=e.x+_f.x*r*1.2,sy=e.y+_f.y*r*1.2,sz=e.z+_f.z*r*1.2;
  W.shots.push({x:sx,y:sy,z:sz,vx:e.vx+_f.x*SHELL.spd,vy:e.vy+_f.y*SHELL.spd,vz:e.vz+_f.z*SHELL.spd,dmg:e.st.dmg*SHELL.k,side:e.side,src:e,ttl:SHELL.ttl,col:e.isPlayer?FAC(S.player.faction).col:sideCol(e.side),sty:'shell',cap:true,shell:1});
  fxSpark({x:sx,y:sy,z:sz},'#ffd9a0',8);e.vx-=_f.x*6;e.vy-=_f.y*6;e.vz-=_f.z*6;if(e.isPlayer){W.shake=Math.max(W.shake||0,.3);SFX.lance(.75)}else{const v=vAt(e);if(v>.05)SFX.lance(Math.min(1,v))}}
function shellPilotKey(b){const e=b.src;if(!e)return null;if(e.isPlayer)return blKey(S.player);if(e.rp&&S.pilots&&S.pilots[e.rp])return blKey(S.pilots[e.rp]);return null}
function shellChip(s,a,b){const tot=oreTotal(a);if(tot<=0)return;const cut=Math.min(tot,Math.max(1,Math.min(SHELL.chipMax,Math.round(tot*SHELL.chip)))),rel={};let left=cut;
  for(const k of Object.keys(a.ore).sort((x,y)=>a.ore[y]-a.ore[x])){if(left<=0)break;const m=Math.min(a.ore[k],Math.max(1,Math.round(cut*a.ore[k]/tot)),left);a.ore[k]-=m;left-=m;if(a.ore[k]<=0)delete a.ore[k];const y=Math.floor(m*SHELL.yield);if(y>0)rel[k]=y;if(m-y>0)toDebris(s,{[k]:m-y})}
  const R0=astR(a);let nx=b.x-a.x,ny=b.y-a.y,nz=b.z-a.z;const nl=hyp(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;const got=oreTotal({ore:rel}),cr=chunkR(Math.max(1,got));
  if(got>0)blCloud(s,{x:a.x+nx*(R0+cr+4),y:a.y+ny*(R0+cr+4),z:a.z+nz*(R0+cr+4)},rel,R0,0,shellPilotKey(b),{x:nx*7,y:ny*7,z:nz*7});
  if(oreTotal(a)<=0)removeAst(s,a);else a.fpv=(a.fpv||0)+1;if(!MUTE){fxBoom(b,R0*.8,'#ffd9a0');SFX.crack&&SFX.crack(vPil(b))}}
{const o=shotsUpdate;shotsUpdate=function(dt){if(!NET.cl&&W&&W.shots.length){const s=S.sectors[W.sid];for(let i=W.shots.length-1;i>=0;i--){const b=W.shots[i];if(!b.shell)continue;const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt,nz=b.z+b.vz*dt;
      for(const a of s.ast){if(a.wpt)continue;const R=astR(a);if(segHit(b.x,b.y,b.z,nx,ny,nz,a,R)){b.x=nx;b.y=ny;b.z=nz;shellChip(s,a,b);W.shots.splice(i,1);break}}}}
  return o.apply(this,arguments)}}

// ---- Vesper: hold fire to charge, release to fire; a hitscan slug along the nose
function railHold(e){if(e.train||jamDark(e)||e.landed||e.stealth||(e.boot&&W.t<e.boot))return;if((e.railCd||0)>W.t)return;
  if(!e.railC){if(e.energy<RAIL.minE){if(e.isPlayer&&W.t-(W.lowEMsg||0)>2.5){flash('The railgun needs energy to charge.');W.lowEMsg=W.t}return}e.railC=W.t;if(e.isPlayer)SFX.beep(260,.5)}e.railLast=W.t;e.lastFire=W.t}
function railK(e){return e.railC?clamp((W.t-e.railC)/RAIL.charge,0,1):0}
function railShot(e){const k=Math.max(.15,railK(e));e.railC=0;e.railCd=W.t+RAIL.cd;const cost=Math.min(e.energy,RAIL.e*k);const ek=cost/(RAIL.e*k)||0;e.energy-=cost;
  const R=laserRay(e,RAIL.range),C=CLASSES[e.cls]||CLASSES.vesper,base=RAIL.dmg*(e.st.dmg/(8*(C.weapon||1)))*k*Math.max(.3,ek);
  if(R.hit){const T=R.hit.ref;if(R.hit.kind==='ship'){const unseen=T.ai&&T.ai.tgt!==e?RAIL.unseen:1;if(e._lsub&&e._lsub.E===T){const L=e._lsub;e._lsub=null;subDamage(T,L.s,base*RAIL.subK,e.side,e)}else damageShip(T,base*unseen,e.side,{x:R.x,y:R.y,z:R.z,src:e,vx:0,vy:0,vz:0},'rail')}
    else if(R.hit.kind==='station'){if(e._lsub&&e._lsub.E===T){const L=e._lsub;e._lsub=null;subDamage(T,L.s,base*RAIL.subK,e.side,e)}else damageStation(T,base,e.side,'rail',e)}
    else if(R.hit.kind==='outpost')damageOutpost(T,base*.6);else if(R.hit.kind==='torp'){T.hp-=base;if(T.hp<=0)killTorp(T,e.side)}
    if(!MUTE)fxBoom(R,18+22*k,'#c9b6ff')}
  e._lsub=null;W.beams.push({src:e,x:R.x,y:R.y,z:R.z,ttl:.18+.2*k,col:e.isPlayer?FAC(S.player.faction).col:sideCol(e.side),rail:1});
  qRot(e.q,0,0,1,_f);e.vx-=_f.x*14*k;e.vy-=_f.y*14*k;e.vz-=_f.z*14*k;if(e.isPlayer){W.shake=Math.max(W.shake||0,.2+.3*k);SFX.lance(.6+.4*k)}else{const v=vAt(e);if(v>.05)SFX.lance(Math.min(1,v))}}
function railTick(){if(!W)return;for(const e of W.ents){if(!e.railC||e.type!=='ship')continue;if(!e.alive||e.cls!=='vesper'){e.railC=0;continue}if(W.t-(e.railLast||0)>Math.max(.12,(W.fdt||0)*2.5)){if(NET.cl&&!e.isPlayer){e.railC=0;continue}if(NET.cl&&e.isPlayer){const k=railK(e);e.railC=0;e.railCd=W.t+RAIL.cd;const R=laserRay(e,RAIL.range);e._lsub=null;W.beams.push({src:e,x:R.x,y:R.y,z:R.z,ttl:.18+.2*k,col:FAC(S.player.faction).col,rail:1});W.shake=Math.max(W.shake||0,.2+.3*k);SFX.lance(.6+.4*k);continue}railShot(e)}}}
{const o=fire;fire=function(e){const c=e&&e.cls;if(c==='bombard'&&(e.isPlayer||e.rp))return shellFire(e);if(c==='vesper'&&(e.isPlayer||e.rp)){if(NET.cl&&e.isPlayer){railHold(e);return}return railHold(e)}return o.apply(this,arguments)}}
{const o=fireLaser;fireLaser=function(e){const c=e&&e.cls;if((c==='bombard'||c==='vesper')&&(e.isPlayer||e.rp))return fire(e);return o.apply(this,arguments)}}
{const o=setWeapon;setWeapon=function(w){const c=S&&S.player&&S.player.cls;if(c==='bombard'||c==='vesper'){flash(c==='bombard'?'The Bombard fires only its shell cannon.':'The Vesper fires only its railgun.');return}return o.apply(this,arguments)}}

// ---- the world tick for the above
{const o=worldUpdate;worldUpdate=function(dt){const r=o.apply(this,arguments);try{wardTick();railTick()}catch(x){frameErr('factions',x)}return r}}

// ---- cockpit panels for the three hulls (called from drawCockpit's panel chain)
function sigPanel(kd,H){const{lab,bar,pip,x,sw,ty,sy,shh,P,p,fc}=H;
  if(kd==='barrage'){const n=Math.floor(P.gcell==null?GAN.cells:P.gcell);lab('LAUNCH CELLS',x+9,ty+shh*.28);for(let i=0;i<GAN.cells;i++)pip(x+12+i*((sw-24)/(GAN.cells-1)),sy+shh*.55,i<n,'#9fe8ff',3);
    lab(n+'/'+GAN.cells,x+9,sy+shh*.8,n?'#9fe8ff':null);lab('ENERGY '+Math.round(p.energy),x+sw-9,sy+shh*.8,'rgba(236,228,207,.75)','right')}
  else if(kd==='shell'){const rd=Math.max(0,p.cool||0);lab('SHELL CANNON',x+9,ty+shh*.28);lab(rd>0?'LOADING':'READY',x+sw-9,ty+shh*.28,rd>0?'#f0b24a':'#7ad9a7','right');bar(x+9,sy+shh*.5,sw-18,1-rd/SHELL.cd,rd>0?'#f0b24a':'#7ad9a7');
    lab('ENERGY',x+9,sy+shh*.74);bar(x+9,sy+shh*.84,sw-18,p.energy/p.st.eCap,p.energy<p.st.eCap*.2?'#ff5d4f':fc)}
  else if(kd==='rail'){const k=railK(p),cd=(p.railCd||0)>W.t;lab('RAILGUN',x+9,ty+shh*.28);lab(cd?'CYCLING':k>=1?'FULL CHARGE':k>0?Math.round(k*100)+'%':'HOLD FIRE',x+sw-9,ty+shh*.28,k>=1?'#c9b6ff':cd?'#f0b24a':'rgba(236,228,207,.75)','right');
    bar(x+9,sy+shh*.5,sw-18,k,k>=1?'#c9b6ff':'#8e7ad9');lab('ENERGY',x+9,sy+shh*.74);bar(x+9,sy+shh*.84,sw-18,p.energy/p.st.eCap,p.energy<RAIL.e?'#ff5d4f':fc)}}
// the charge ring at the crosshair (Vesper) and the barrage target brackets (Gannet)
function sigHud(c){const P=S.player,p=W&&W.player;if(!p||P.docked||W.dead)return;const cx=VW/2,cy=VH/2;
  if(P.cls==='vesper'&&p.railC){const k=railK(p);c.strokeStyle=k>=1?'#c9b6ff':'rgba(201,182,255,.7)';c.lineWidth=k>=1?3:2;c.beginPath();c.arc(cx,cy,26,-Math.PI/2,-Math.PI/2+TAU*k);c.stroke()}
  if(P.cls==='gannet'&&(P.gcell||0)>=1){const T=ganTargets(p,null);c.strokeStyle='rgba(159,232,255,.75)';c.lineWidth=1.5;for(const o of T){const L=proj(o.x,o.y,o.z);if(L.behind)continue;const r=Math.max(9,projR(L.d,o.st.radius*1.25))+5;c.beginPath();c.moveTo(L.x-r,L.y-r+5);c.lineTo(L.x-r,L.y-r);c.lineTo(L.x-r+5,L.y-r);c.moveTo(L.x+r,L.y+r-5);c.lineTo(L.x+r,L.y+r);c.lineTo(L.x+r-5,L.y+r);c.stroke()}}}

// ---- meshes: the Gannet is hand-built like the Heavy Bomber; the Bombard and Vesper come from the model pack
function buildGannet(fk,g,L,eng,fc){const H=mixC([.78,.8,.84],fc,.12),M=mixC([.55,.58,.64],fc,.1),D=[.2,.22,.26],G=[.55,.85,1],S2=f=>{f(1);f(-1)};
  g.set().loft([[-1,.26,.15],[-.82,.34,.19],[-.3,.38,.21,.01],[.35,.33,.18,.01],[.78,.18,.1],[1.06,.03,.025]],12,H,0,2.6,{colFn:(k,i,p)=>p[1]<-.05?M:H});
  g.set(0,.17,0).loft([[-.86,.19,.11],[-.4,.23,.13],[.25,.2,.11],[.5,.05,.04]],10,M,0,2.2);
  g.set(0,.3,-.2).box(.03,.012,1.1,fc,1);S2(s=>g.set(.2*s,.25,-.3).box(.02,.01,.85,fc,.8));
  S2(s=>{g.set(.43*s,-.02,0).loft([[-.55,.075,.07],[-.4,.09,.085],[.45,.09,.085],[.62,.03,.03]],8,M,0,2.4);
    for(let r=0;r<2;r++)for(let k=0;k<3;k++)g.set(.43*s+(r?.035:-.035)*s,.07,-.18+k*.18).box(.05,.012,.11,fc,.9);
    g.set(.5*s,-.06,-.72,qAxis(0,0,1,-.35*s,{x:0,y:0,z:0,w:1})).box(.42,.02,.36,H);g.set(.69*s,-.13,-.78).box(.03,.03,.3,fc,.9);
    nacelle(g,.24*s,-.01,-1.18,-.84,.11,D,fc,eng)});
  nacelle(g,0,.12,-1.08,-.82,.09,D,fc,eng);canopy(g,.42,.82,.12,.16,.09,G)}
{const o=shipMesh;shipMesh=function(fac,cls){if(cls==='gannet'){if(fac==='brood')cls='freighter';else{const k=fac+'gannet';if(MESH[k])return MESH[k];const g=new GB(),L=new GB(),eng=[];buildGannet(fac,g,L,eng,hexRGB(sideCol(fac==='player'?S.player.faction:fac)));L.seg([0,0,0],[0,0,0],[0,0,0]);return MESH[k]={hull:g.upload(),rim:L.upload(true),eng}}}
  if(cls==='bombard'&&(fac==='brood'||!mdlHas('bombard')))cls='dredger';if(cls==='vesper'&&(fac==='brood'||!mdlHas('vesper')))cls='scout2';return o.call(this,fac,cls)}}
// ---- the flight HUD's weapon readouts: launch cells for the Gannet, the shell cannon and the railgun
function sigCd(P,p){if(P.cls==='gannet'){const n=Math.floor(P.gcell==null?GAN.cells:P.gcell),l=n>=GAN.cells?0:(1-((P.gcell||0)%1))*GAN.recharge;return cdItem('Cells',`${n}/${GAN.cells}`,n>=GAN.cells?1:(P.gcell%1),l)}
  if(P.cls==='bombard'){const l=Math.max(0,p.cool||0);return cdItem('Shell',null,1-l/SHELL.cd,l)}
  if(P.cls==='vesper'){const k=railK(p),l=Math.max(0,(p.railCd||0)-W.t);return cdItem(k>0?`Rail ${Math.round(k*100)}%`:'Rail',null,l>0?1-l/RAIL.cd:1,l)}return''}
{const o=cdsHtml;cdsHtml=function(){const P=S.player,p=W&&W.player,h=o.apply(this,arguments);if(!P||!p||!isSigCls(P.cls))return h;return sigCd(P,p)+h.replace(/<span class="cd[^"]*">(Missiles|Torps)[\s\S]*?<\/u><\/span>/,'')}}
{const o=hudUpdate;hudUpdate=function(){const r=o.apply(this,arguments);const P=S&&S.player,p=W&&W.player;if(!P||!p||!isSigCls(P.cls))return r;const dr=CLASSES[P.cls].drones?` · drones ${(p.drones||[]).filter(d=>d.alive).length}/${CLASSES[P.cls].drones}`:'';
  if(P.cls==='gannet'){$('hMslL').textContent='Cells';$('hMsl').textContent=`${Math.floor(P.gcell==null?GAN.cells:P.gcell)}/${GAN.cells}${dr}`}
  else if(P.cls==='bombard'){$('hMslL').textContent='Charges';$('hMsl').textContent=`${P.blN||0}/${blCap(P)}${dr}`;$('hWpn').textContent='SHELL';$('hWpn').style.color='var(--amber)'}
  else if(P.cls==='vesper'){$('hMslL').textContent='Rail';$('hMsl').textContent=p.railC?Math.round(railK(p)*100)+'%':'ready';$('hWpn').textContent='RAILGUN';$('hWpn').style.color='#c9b6ff'}return r}}

// ---- Ostrova drive peek (Seer and Oracle): pick a neighbouring system on the map and spool the drive for 8 s (damage, a
// jam bar or a tether breaks the spool). The scout jumps straight in, gate-free, at least 3 km from any gate or station, with
// an arrival flash. It arrives drained: no guns, missiles or afterburner, shields at zero and not recharging, engines at a
// crawl. After 20 s it jumps back to exactly where it left. Information only: no beacon flips or limpets from inside a peek.
// It can't be used to travel (the gates are out of reach at a crawl, and docking is refused) or to escape (damage breaks the spool).
const PEEK={spool:8,drain:20,cd:180,minR:3000,crawl:60};
function peekCan(P){return!S.unb&&P.faction==='ostrova'&&(P.cls==='scout'||P.cls==='scout2')}
function peekWhyNot(to){const P=S.player,p=W&&W.player;if(!peekCan(P))return'Only Ostrova Seers and Oracles carry a peek drive.';if(!p||P.docked||W.dead)return'Launch first.';if(P.peek)return'Already peeking.';
  if(!NEIGH[W.sid]||!NEIGH[W.sid].includes(to))return'A drive peek reaches neighbouring systems only.';if((P.peekCd||0)>S.T)return`The peek drive is cooling down: ${Math.ceil(P.peekCd-S.T)} s.`;
  if(p.landed||p.stealth||W.docking||W.jump)return'Not now.';if(gateLocked(p))return'Jammed or tethered: the drive won\'t spool.';return''}
function peekStart(to){const why=peekWhyNot(to);if(why){flash(why,true);return false}const p=W.player;W.peekSp={to,t:0,hit:p.lastHit,fx:0};flash(`Peek drive spooling for ${DEF[to].name}: ${PEEK.spool} s. Taking damage breaks the spool.`);SFX.beep(180,.8);return true}
function peekSpot(sid){const L=[...(GATES[sid]||[]).map(g=>({x:g.x,y:g.y,z:g.z}))];const R=S.stations[sid];if(R)L.push({x:R.x||0,y:R.y||0,z:R.z||0});const o=OUT_BY_SECTOR[sid]&&S.outposts[OUT_BY_SECTOR[sid]];if(o&&o.x!=null)L.push({x:o.x,y:o.y||0,z:o.z});
  let best=null,bd=-1;for(let i=0;i<40;i++){const a=rnd(TAU),r=rnd(3200,5200),c={x:Math.cos(a)*r,y:rnd(-400,400),z:Math.sin(a)*r};let d=1e9;for(const q of L)d=Math.min(d,hyp(c.x-q.x,c.y-q.y,c.z-q.z));if(d>=PEEK.minR)return c;if(d>bd){bd=d;best=c}}return best}
function peekJump(to){const P=S.player,p=W.player,from=W.sid;P.peek={from,to,x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz,q:[p.q.x,p.q.y,p.q.z,p.q.w]};apOn=false;fxWarp(p,FAC(P.faction).col);
  exitSector();P.sector=to;const c=peekSpot(to);P.x=c.x;P.y=c.y;P.z=c.z;P.vx=P.vy=P.vz=0;const q=qLook(-c.x,0,-c.z,0,1,0,q0());P.q=[q.x,q.y,q.z,q.w];
  enterSector(to);const e=W.player;e.peek=1;e.boot=W.t+PEEK.drain;e.shield=0;P.peek.until=W.t+PEEK.drain;fxWarp(e,FAC(P.faction).col);W.fx.push({x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,life:1.2,max:1.2,c:hexRGB(FAC(P.faction).col),sz:420,flash:true});
  if(NET.cl)netSend({t:'jump',to,x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,q:[e.q.x,e.q.y,e.q.z,e.q.w]});setTimeout(()=>{$('fade').style.opacity=0},120);
  feed(`👁 Drive peek: you're in ${DEF[to].name}, drained for ${PEEK.drain} s. You jump back on your own.`,'info')}
function peekBack(){const P=S.player,k=P.peek;if(!k)return;P.peek=null;P.peekCd=S.T+PEEK.cd;const alive=W&&W.player&&!W.dead;if(!alive)return;
  exitSector();P.sector=k.from;P.x=k.x;P.y=k.y;P.z=k.z;P.vx=k.vx;P.vy=k.vy;P.vz=k.vz;P.q=k.q;enterSector(k.from);const e=W.player;e.boot=W.t+1.5;fxWarp(e,FAC(P.faction).col);
  if(NET.cl)netSend({t:'jump',to:k.from,x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,q:[e.q.x,e.q.y,e.q.z,e.q.w]});setTimeout(()=>{$('fade').style.opacity=0},120);
  feed(`👁 Back in ${DEF[k.from].name}. The peek drive needs ${Math.round(PEEK.cd/60)} minutes to cool.`,'info')}
function peekTick(dt){const P=S.player,p=W&&W.player;if(!p||!S||CTX)return;
  if(P.peek){if(W.dead){P.peek=null;P.peekCd=S.T+PEEK.cd;return}if(!p.peek||W.sid!==P.peek.to){peekBack();return}
    p.boot=Math.max(p.boot||0,W.t+.2);p.shield=0;p.boosting=false;const v=hyp(p.vx,p.vy,p.vz);if(v>PEEK.crawl){const k=PEEK.crawl/v;p.vx*=k;p.vy*=k;p.vz*=k}
    if(W.t>=P.peek.until)peekBack();return}
  const sp=W.peekSp;if(!sp)return;if(P.docked||W.dead||!peekCan(P)){W.peekSp=null;return}
  if(p.lastHit>sp.hit){W.peekSp=null;flash('Peek spool broken: you took damage.',true);return}if(gateLocked(p)){W.peekSp=null;flash('Peek spool broken: jammed or tethered.',true);return}
  sp.t+=dt;sp.fx-=dt;if(sp.fx<=0){sp.fx=.12;const c=FAC(P.faction).col;fxSpark({x:p.x+rnd(-1,1)*p.st.radius*2,y:p.y+rnd(-1,1)*p.st.radius*2,z:p.z+rnd(-1,1)*p.st.radius*2},c,2)}
  if(Math.floor(sp.t)!==Math.floor(sp.t-dt)&&sp.t<PEEK.spool)flash(`Peek drive: ${Math.ceil(PEEK.spool-sp.t)} s to ${DEF[sp.to].name}`);
  if(sp.t>=PEEK.spool){W.peekSp=null;peekJump(sp.to)}}
{const o=playerUpdate;playerUpdate=function(dt){const r=o.apply(this,arguments);try{peekTick(dt)}catch(x){frameErr('peek',x)}return r}}
{const o=tryDock;tryDock=function(){if(S&&S.player&&S.player.peek){flash('Drained after the peek: you can\'t dock until you jump back.',true);return false}return o.apply(this,arguments)}}
{const o=bcnFlipper;bcnFlipper=function(e){if(e&&(e.peek||(e.isPlayer&&S.player.peek)))return null;return o.apply(this,arguments)}}
{const o=limpetHold;limpetHold=function(hold,dt){if(S.player.peek){if(hold&&W.t-(W.pkMsg||0)>3){W.pkMsg=W.t;flash('No limpets from inside a peek.')}return}return o.apply(this,arguments)}}
// guests: the update a client sends while drained carries pk, and the host drains the guest's ship there too
{const o=netSend;netSend=function(m,fast){if(m&&m.t==='u'&&S&&S.player&&S.player.peek)m.pk=1;return o.apply(this,arguments)}}
function peekHostTick(){if(!NET.host||!W||typeof MP==='undefined'||!MP.inp)return;const now=performance.now();for(const e of W.ents){if(!e.rp||!e.alive)continue;const u=MP.inp[e.rp];if(u&&u.pk&&now-u.at<1500){e.boot=Math.max(e.boot||0,W.t+.5);e.shield=0;e.peek=1}else if(e.peek)e.peek=0}}
{const o=worldUpdate;worldUpdate=function(dt){const r=o.apply(this,arguments);try{peekHostTick()}catch(x){frameErr('peek host',x)}return r}}
{const o=renderMapSide;renderMapSide=function(){const r=o.apply(this,arguments);try{const P=S&&S.player;if(P&&peekCan(P)&&typeof mapSel!=='undefined'&&mapSel&&mapSel!==P.sector&&NEIGH[P.sector]&&NEIGH[P.sector].includes(mapSel)){const el=$('mapSide'),why=peekWhyNot(mapSel),d=document.createElement('div');
  d.style.margin='0 0 10px';d.innerHTML=`<button class="btn" id="bPeek" type="button" ${why?'disabled':''} title="${esc(why||'Spool 8 s, jump in, 20 s drained, jump back')}">👁 Drive peek into ${esc(DEF[mapSel].name)}</button>${why?`<div class="note" style="margin-top:4px">${esc(why)}</div>`:'<div class="note" style="margin-top:4px">Spools 8 s, jumps in 3 km from anything, drained for 20 s, then jumps back.</div>'}`;el.prepend(d);
  const b=$('bPeek');if(b)b.onclick=()=>{if(peekStart(mapSel)){$('map').hidden=true}}}}catch(x){}return r}}
// ---- the start screen names each faction's career
{const C={halcyon:'Hauling: +20% on Freeport jobs · the Gannet',varkesh:'Mining: +20% on Aurorite jobs · the Bombard',ostrova:'Scouting: +40% scout pay · peek · the Vesper'};for(const f in C)FACTIONS[f].traitText+=`<br>${C[f]}`}
