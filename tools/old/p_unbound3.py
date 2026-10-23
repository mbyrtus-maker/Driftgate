# Patch: Unbound mode, stage 3. The nine haven works, the Unbound mirror variants and the Tether cutter (with AI Unbound
# firing shock harpoons), jamming torpedoes for the Plunderer, capital takes (jam the turrets, torpedo the capital dark, hook
# its store), raids and lockdown in faction home space with vault heists, fleet call-ins from the Graving Dock, and Lairs.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

JS=r"""
// ============================================================ Unbound stage 3: the haven works
const UNB_WORKS={tankard:{name:'The Rusty Tankard',lv:['Rumours of all freight one jump from the haven, with cargo values','Rumours reach two jumps out','Recruit a captain to fly as your wingman']},
  den:{name:"Fence's Den",lv:['The Fence pays 70%','80%, and launders stolen goods','90%']},
  powder:{name:'Powder Magazine',lv:['Jammers fill 10% faster','Harpoon reload −25%','Jamming torpedoes: 3 per magazine']},
  chop:{name:'Chop Shop',lv:['Cargo hook 10 t/s','Black-market hulls −10%','Cargo hook 12 t/s']},
  crow:{name:"Crow's Nest",lv:['Marks include freight next to wherever you are','Spot masked and landed ships at 2 km','See escort strength on every mark']},
  forger:{name:"Forger's Shack",lv:['Scan catch chance −25%','Heat cools 50% faster','Transponder burns out for 2 min, not 5']},
  grog:{name:'Grog Still',lv:['AI Unbound wings of 4','Their wings hold their nerve longer','Wings of 5']},
  trophy:{name:'Trophy Wall',lv:['A named plate for every ace the crew downs: +5% Infamy each']},
  graving:{name:'Graving Dock',lv:['Unbound capitals build 20% faster','Call a sloop to a mark (5-minute cooldown)','Call the destroyer to a mark (10-minute cooldown)']}};
const WORK_COST=[null,{goods:{plate:6,wire:4,coil:1},cr:1500},{goods:{plate:12,wire:8,coil:3,lattice:1},cr:3500},{goods:{plate:20,wire:13,coil:5,lattice:2,core:1},cr:6000}];
function havenOf(){S.haven=S.haven||{lv:{},trophy:[]};return S.haven}
function unbWork(k){if(!S||!S.unb)return 0;return havenOf().lv[k]||0}
function workMax(k){return k==='trophy'?0:3}
function unbWorksHtml(c,P){const H=havenOf();let h=`<p class="note" style="margin:0 0 12px">Pour loot and shares into Scrapheart's nine works. Goods come from your hold and vault and go into Unbound stores; shares are credits paid to the haven. If a faction or the Brood batters the haven dark, a random work loses a level.</p><div class="tblw"><table class="t"><thead><tr><th>Work</th><th class="r">Level</th><th>Next</th><th>Cost</th><th></th></tr></thead><tbody>`;
  for(const k in UNB_WORKS){const Wk=UNB_WORKS[k],l=H.lv[k]||0;if(k==='trophy'){h+=`<tr><td><b>${Wk.name}</b></td><td class="r num">${H.trophy.length} plate${H.trophy.length===1?'':'s'}</td><td colspan="3">${H.trophy.length?esc(H.trophy.slice(-4).join(', ')):'Down a named ace to hang the first plate.'} · +${H.trophy.length*5}% Infamy</td></tr>`;continue}
    const C=WORK_COST[l+1],can=C&&haveIn(C.goods,[P.cargo,P.vault])&&P.credits>=C.cr;h+=`<tr><td><b>${Wk.name}</b>${l?`<br><span class="mass">${esc(Wk.lv[l-1])}</span>`:''}</td><td class="r num">${l}/3</td><td>${C?esc(Wk.lv[l]):'Complete'}</td><td>${C?Object.keys(C.goods).map(i=>chip(i,C.goods[i],countIn(i,[P.cargo,P.vault]))).join(' ')+` · ${fmt(C.cr)} cr`:''}</td><td>${C?`<button class="btn sm" data-act="work" data-arg="${k}" ${can?'':'disabled'}>Build</button>`:''}</td></tr>`}
  return h+`</tbody></table></div>`}
function unbBuildWork(k){const H=havenOf(),P=S.player,l=H.lv[k]||0,C=WORK_COST[l+1];if(!UNB_WORKS[k]||k==='trophy'||!C)return;if(!haveIn(C.goods,[P.cargo,P.vault])||P.credits<C.cr){dockErr='Missing goods or shares for that.';return}
  takeFrom(C.goods,[P.cargo,P.vault]);inv.addAll(S.econ.stock.pirate,C.goods);transfer('player','pirate',C.cr);H.lv[k]=l+1;dockErr=`✓ ${UNB_WORKS[k].name} level ${l+1}: ${UNB_WORKS[k].lv[l]}.`;feed(`☠ Scrapheart: ${UNB_WORKS[k].name} raised to level ${l+1}.`,'good')}
function havenBattered(){if(!S.unb)return;const H=havenOf(),L=Object.keys(H.lv).filter(k=>H.lv[k]>0);if(!L.length)return;const k=pick(L);H.lv[k]--;feed(`✕ Scrapheart Haven was battered dark: the ${UNB_WORKS[k].name} loses a level.`,'bad')}
function launderHtml(P){if(unbWork('den')<2)return'';const n=invMass(P.stolen||{});if(!n)return'';const fee=Math.ceil(Object.keys(P.stolen).reduce((v,k)=>v+baseValue(k)*P.stolen[k],0)*.1);return`<div class="act" style="margin-top:8px"><button class="btn" data-act="launder" data-arg="1" ${P.credits>=fee?'':'disabled'}>Launder ${fmt(n)} t of stolen goods · ${fmt(fee)} cr</button></div>`}
function unbLaunder(){const P=unbP(),fee=Math.ceil(Object.keys(P.stolen).reduce((v,k)=>v+baseValue(k)*P.stolen[k],0)*.1);if(!fee||transfer('player','pirate',fee)<fee)return;P.stolen={};dockErr='✓ Laundered: nothing in your hold reads as stolen now.'}
// the captain: Tankard level 3 recruits an Unbound wingman who flies escort on you
function captainTick(){if(unbWork('tankard')<3||!W||W!==LW||S.player.docked||W.dead||!W.player)return;if(W.capt&&W.capt.alive&&W.ents.includes(W.capt))return;if((S.captT||0)>S.T)return;
  const e=spawnNPC('patrol','pirate');if(!e)return;const p=W.player,o=rdir();e.x=p.x+o.x*300;e.y=p.y+o.y*120;e.z=p.z+o.z*300;e.order={kind:'escort',tgt:p,until:W.t+1e6,slot:0,by:true,pid:null};e.capt=1;W.capt=e;S.captT=S.T+(W.capt0?240:0);W.capt0=1;feed('☠ Your captain falls in on your wing.','good')}
// ---- mirror variants (black market only) and the Tether cutter
function unbVarBuyHtml(P){const st=S.econ.stock.pirate;let h=`<div class="h3" style="margin-top:14px">Mirror parts</div><p class="note" style="margin:0 0 8px">Unbound specialists, built in the haven's own shops. They fit at any Mk (Upgrades tab).</p><div class="act" style="flex-wrap:wrap">`;
  for(const id of['scanbaf','jamemit','longharp']){const V=VARIANTS[id],pr=Math.ceil(baseValue('v_'+id)*1.3),have=countIn('v_'+id,[P.cargo,P.vault]);h+=`<button class="btn sm" data-act="unbvar" data-arg="${id}" ${P.credits>=pr&&(haveIn(V.recipe,[st])||(st['v_'+id]||0)>0)?'':'disabled'} title="${esc(V.gain+' · '+V.cost)}">${esc(V.name)} · ${fmt(pr)} cr${have?' · own '+have:''}</button>`}
  return h+`</div>`}
function unbBuyVar(id){const P=unbP(),V=VARIANTS[id];if(!V||V.spec!=='unb')return;const st=S.econ.stock.pirate,pr=Math.ceil(baseValue('v_'+id)*1.3);if(P.credits<pr){dockErr='Not enough credits.';return}
  if(!(st['v_'+id]>0)){if(!haveIn(V.recipe,[st])){dockErr='The shops are out of plate and conduit.';return}takeFrom(V.recipe,[st]);inv.add(st,'v_'+id,1)}inv.take(st,'v_'+id,1);inv.add(P.vault,'v_'+id,1);transfer('player','pirate',pr);dockErr=`✓ ${V.name} in your vault. Fit it in Upgrades.`}
// ---- jamming torpedoes (Plunderer, jam mode): 2 in the magazine (3 with the Powder Magazine), 40 s reload each
function jtCap(){return unbWork('powder')>=3?3:2}
function jtTick(dt){const P=S.player;if(!S.unb||P.cls!=='plunderer')return;if(P.jt==null)P.jt=jtCap();if(P.jt<jtCap()){P.jtT=(P.jtT||40)-dt;if(P.jtT<=0){P.jt++;P.jtT=40}}}
function fireJamTorp(){const P=S.player,L=W.lock,p=W.player;if(P.jt==null)P.jt=jtCap();if(P.jt<=0){flash(`Jamming torpedo reloading: ${Math.ceil(P.jtT||40)} s.`,true);return true}
  if(!L.locked||!L.ref){flash('Lock a target first: a capital ship, a ship, or a faction station to crack its vault.',true);return true}P.jt--;if(P.jt<jtCap()&&!(P.jtT>0))P.jtT=40;launchMissile(p,L.ref,P.tiers.weapon,'torpedo',0,true);const m=W.missiles[W.missiles.length-1];if(m){m.jt=1;m.dmg=0;m.col='#b7c6ff'}unbShot();flash(`Jamming torpedo away (${P.jt} left).`);return true}
// a capital's jam bar: a third of an escort's per torpedo, a sixth of a carrier's; it drains slowly between hits
function capJamFill(e){return e.cls==='escort'?1/3:e.cls==='carrier'?1/6:1/4}
function jtHit(m){const T=m.tgt;fxBoom(m,90,'#b7c6ff');if(!T)return;
  if(T.type==='station'){vaultHeist(T,m);return}
  if(T.type!=='ship'||!T.alive)return;if(T.role==='frigate'){if(T.shield>T.st.sCap*.05){if(m.src===W.player)flash('The torpedo splashed on its shields. Strip them first.');return}T.cjam=(T.cjam||0)+capJamFill(T);T.cjamT=W.t;
    if(T.cjam>=1){T.cjam=0;T.jamOff=W.t+(T.cls==='escort'?20:15);T.jamHard=T.jamOff+60;fxBoom(T,T.st.radius*.6,'#b7c6ff');if(m.src===W.player)flash(`${T.tok?T.tok.name:'The capital'} is jammed dark: turrets, launches and jump drive offline for ${Math.round(T.jamOff-W.t)} s. Hook its store (E).`,true)}
    else if(m.src===W.player)flash(`Capital jam ${Math.round(T.cjam*100)}%.`);return}
  if((T.jamHard||0)>W.t||jamDark(T))return;T.jam=0;T.jamOff=W.t+jamWin(T);T.jamHard=T.jamOff+JAM.harden;T.boosting=false;fxSpark(T,'#b7c6ff',12);if(T.isPlayer)flash('Jamming torpedo: every system offline.',true)}
function capJamDrain(e,dt){if(e.cjam>0&&W.t-(e.cjamT||0)>5)e.cjam=Math.max(0,e.cjam-.02*dt)}
// jam-mode guns on a stripped capital shut its turrets down one at a time (15 s, then hardened for a minute)
function capJamShot(e,b){if(e.shield>e.st.sCap*.05){fxSpark(b,'#8fc8ff',3);return}const R=e.st.radius*1.1;let best=null,bd=1e9;for(const tu of e.turrets||[]){if((tu.jamHard||0)>W.t)continue;qRot(e.q,tu.p[0]*R,tu.p[1]*R,tu.p[2]*R,_u);const d=hyp(e.x+_u.x-b.x,e.y+_u.y-b.y,e.z+_u.z-b.z);if(d<bd){bd=d;best=tu}}
  fxSpark(b,'#b7c6ff',3);if(!best)return;best.jamAcc=(best.jamAcc||0)+b.dmg;if(best.jamAcc<120)return;best.jamAcc=0;best.jamOff=W.t+15;best.jamHard=W.t+75;if(b.src===W.player){const f=FAC_IDS.includes(e.side)?e.side:null;if(f)heatAdd(f,2,'');flash('Turret jammed: offline 15 s.')}}
// ---- raids and lockdown in faction home space
function lockOf(){return W&&S.lock&&S.lock.sid===W.sid?S.lock:null}
function raidTick(){const f=unbHomeOf(W.sid),P=unbP(),p=W.player;if(!f){if(S.lock&&S.lock.sid!==W.sid)S.lock=null;return}
  let L=lockOf();if(!L&&(!unbCover(f)))L=S.lock={sid:W.sid,f,t0:S.T,n:0},feed(`🚨 Lockdown in ${DEF[W.sid].name}: ${FACTIONS[f].short} sounds the alarm. Response wings in 45 s. Heat with ${FACTIONS[f].short} won't cool while you're here.`,'bad');
  if(!L)return;const el=S.T-L.t0,sched=[45,135,225];
  while(L.n<sched.length&&el>=sched[L.n]||(L.n>=sched.length&&el>=sched[sched.length-1]+90*(L.n-sched.length+1))){const k=L.n++;
    if(k===2){const A=(S.aces||[]).find(x=>x.side===f&&!x.dead);if(A&&aceWing(A)){feed(`⚠ ${FACTIONS[f].short}'s ace ${aceLabel(A)} is leading the hunt.`,'bad');continue}}
    const n=k===1?5:3;let got=0;for(let i=0;i<n;i++){const e=spawnNPC('patrol',f,false,null);if(!e)break;if(k===1&&i===0&&e.cls!=='heavy'){}const SE=W.stationEnt,o=rdir();const b=SE&&SE.fac===f?SE:{x:0,y:0,z:0};e.x=b.x+o.x*400;e.y=b.y+o.y*200;e.z=b.z+o.z*400;e.ai.tgt=p;e.ai.hunt=p;e.ai.huntUntil=W.t+300;got++}
    if(got)feed(`🚨 ${FACTIONS[f].short} response wing (${got}) launching${k===1?', Heavy Fighter-led':''}.`,'bad')}}
// a jamming torpedo into a faction core station during a lockdown cracks its vault: stores spill as salvage
function vaultHeist(T,m){const f=T.fac;if(!FAC_IDS.includes(f)||!T.rec||T.rec.kind!=='core'){if(m.src===W.player)flash('Only a faction core station has a vault worth cracking.');return}
  if(!lockOf()){if(m.src===W.player)flash('The vault doors only open in the confusion of a lockdown.');return}
  const st=S.econ.stock[f],got={};let t=0;for(const k of Object.keys(st).filter(k=>!k.startsWith('v_')&&!MUNITIONS.has(k)).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a))){if(t>=45)break;const n=Math.min(Math.ceil(st[k]*.08),Math.floor((45-t)/Math.max(1,mass(k))));if(n>0){got[k]=inv.take(st,k,n);t+=got[k]*mass(k)}}
  if(!t)return;const s=S.sectors[W.sid];s.crates.push({id:S.nextId++,x:Math.round(m.x),y:Math.round(m.y),z:Math.round(m.z),inv:got,until:S.T+240,heist:1});fxBoom(m,140,'#ffcf5a');
  heatAdd(f,6,'a vault heist');if(m.src===W.player){flash(`Vault cracked: ${fmt(t)} t of ${FACTIONS[f].short} stores spilled. Scoop them up.`,true);deedAdd('heist')}}
// ---- fleet call-ins from the Graving Dock
function unbCaps(){return(S.frigates||[]).filter(t=>t.side==='pirate'&&t.hull>0)}
function callCap(kind,sid){const lv=unbWork('graving'),need=kind==='sloop'?2:3;if(lv<need){dockErr=`Calling a ${kind} needs the Graving Dock at level ${need}.`;return}const H=havenOf();if((H.callT||0)>S.T){dockErr=`The fleet is busy: ${fmtT(H.callT-S.T)} until the next call.`;return}
  if(DEF[sid].home){dockErr='No Unbound capital enters faction home space, even when called.';return}const t=unbCaps().find(x=>kind==='sloop'?isEsc(x):isCar(x));if(!t){dockErr=`No ${kind==='sloop'?'Corsair Sloop':'Destroyer'} is afloat right now.`;return}
  t.dest=sid;t.jumpTo=null;t.call={by:'me',until:S.T+600,sid};H.callT=S.T+(kind==='sloop'?300:600);dockErr=`✓ ${t.name} is under way to ${DEF[sid].name}. It hammers the escorts while you jam the freighter.`;feed(`☠ ${t.name} answers your call: under way to ${DEF[sid].name}.`,'good')}
// ---- Lairs: a hidden asteroid base for one pilot (stash 200 t, repairs). A Rigger from Scrapheart builds it.
const LAIR={stash:200,hull:1500,cost:{frame:1,plate:20},kinds:['contested','hub','deep','void'],seeR:2000};
function lairHere(){return(S.lairs||[]).find(L=>L.sid===W.sid&&L.hull>0)}
function lairBuild(){const P=unbP(),d=DEF[W.sid];if(!d||!LAIR.kinds.includes(d.kind)||S.stations[W.sid]){flash('A Lair goes in contested, hub, deep or quiet space, in a system with no station.',true);return}
  if(lairHere()){flash('There is already a Lair in this system.',true);return}const st=S.econ.stock.pirate;if(!haveIn(LAIR.cost,[st])){flash('Scrapheart is short of a Depot Frame and 20 plate for the Rigger.',true);return}
  if(S.events.some(e=>e.type==='rigger'&&e.stage!=='done')){flash('A Rigger is already out.',true);return}takeFrom(LAIR.cost,[st]);const p=W.player,force={};inv.addAll(force,LAIR.cost);
  S.events.push({id:S.nextId++,type:'rigger',att:'pirate',sector:W.sid,force,at:{x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z)},until:S.T+90,stage:'inbound',pid:'me'});feed(`☠ A Rigger is on its way from Scrapheart with two Raiders to build your Lair here (90 s).`,'info')}
function riggerTick(){for(const ev of S.events){if(ev.type!=='rigger'||ev.stage==='done'||S.T<ev.until)continue;ev.stage='done';S.lairs=(S.lairs||[]).filter(L=>{if(L.pid!==ev.pid)return true;const s=S.sectors[L.sid];if(Object.keys(L.stash).length)s.crates.push({id:S.nextId++,x:L.x,y:L.y,z:L.z,inv:L.stash,until:S.T+600});toDebris(s,L.fort||{});return false});
    S.lairs.push({id:S.nextId++,pid:ev.pid,sid:ev.sector,x:ev.at.x+300,y:ev.at.y,z:ev.at.z+300,stash:{},fort:ev.force,hull:LAIR.hull,seen:{}});ev.force={};feed(`☠ Your Lair in ${DEF[ev.sector].name} is ready: stash and repairs. Dock with E. Factions can't see it until one of their patrols comes within 2 km.`,'good')}}
function lairWorld(dt){const L=lairHere();if(!L)return;const p=W.player;
  for(const e of W.ents){if(e.type!=='ship'||!e.alive||!e.npc||!FAC_IDS.includes(e.side))continue;if(d3(e,L)<LAIR.seeR&&!L.seen[e.side]){L.seen[e.side]=1;feed(`⚠ A ${FACTIONS[e.side].short} patrol has found your Lair in ${DEF[W.sid].name}.`,'bad')}
    if(L.seen[e.side]&&d3(e,L)<2500){L.hull-=6*dt;if((L.tc=(L.tc||0)-dt)<=0){L.tc=.8;turretShot({x:L.x,y:L.y+30,z:L.z},e,1300,8,'pirate',12,'pd')}}}
  if(L.hull<=0){const s=S.sectors[W.sid];s.crates.push({id:S.nextId++,x:L.x,y:L.y,z:L.z,inv:L.stash,until:S.T+600});toDebris(s,L.fort||{});L.stash={};L.fort={};S.lairs=S.lairs.filter(x=>x!==L);fxBoom(L,260,'#ffcf5a');feed(`✕ Your Lair in ${DEF[W.sid].name} was destroyed. Its stash is drifting as salvage.`,'bad')}}
function lairDraw(){const L=W&&lairHere();if(!L||!inView(L.x,L.y,L.z,120))return;qAxis(.2,1,.1,.6,_xq);qNorm(_xq);mModel(MM,L.x,L.y,L.z,_xq,90,70,84);drawMesh(astMesh(3,'fe'),MM);sprite(L.x,L.y+70,L.z,18+4*Math.sin(W.t*3),[.85,.8,.55],.7)}
function lairNear(){const L=W&&lairHere(),p=W&&W.player;return L&&p&&d3(L,p)<260&&L.pid==='me'?L:null}
function lairDock(L){const P=S.player,p=W.player;P.docked='lair';P.lairId=L.id;p.vx=p.vy=p.vz=0;p.hull=p.st.hull;p.shield=p.st.sCap;dockTab='storage';openDock();feed('Docked at your Lair: repaired. The stash holds 200 t.','good')}
"""
rep("function tunedK(e,kind){",JS+"function tunedK(e,kind){")
# the variants table gains the mirror set and the Tether cutter
rep("  shaped:{slot:'drill',","  ...UNB_VARS,\n  shaped:{slot:'drill',")
rep("const VARIANTS={","const UNB_VARS={scanbaf:{slot:'power',name:'Scan baffles',spec:'unb',gain:'Patrol scans 30% less likely to see through false colours',cost:'−10% energy capacity',m:{eCap:.9},f:{scanK:.7},recipe:{plate:3,wire:3}},\n  jamemit:{slot:'weapon',name:'Jammer emitters',spec:'unb',gain:'Jammers fill the bar 45% faster',cost:'−15% damage in normal fire',m:{dmg:.85},f:{jamK:1.45},recipe:{plate:3,wire:3}},\n  longharp:{slot:'payload',name:'Long harpoons',spec:'unb',gain:'Harpoon tethers stretch the hook to 600 m',cost:'−25% rack size',f:{tetherR:600,rackK:.75},recipe:{plate:3,wire:3}},\n  tcutter:{slot:'payload',name:'Tether cutter',spec:'jam',gain:'Flares also break shock-harpoon tethers',cost:'−25% rack size',f:{tetherCut:1,rackK:.75},recipe:{plate:3,wire:3}}};\nconst VARIANTS={")
# Unbound specialists: only the Unbound see or fit them; building one from parts happens at the black market
rep("{const vl0=VAR_BY_SLOT[sl.id]||[],vl=t<2?vl0.filter(id=>VARIANTS[id].spec):vl0,","{const vl0=(VAR_BY_SLOT[sl.id]||[]).filter(id=>VARIANTS[id].spec!=='unb'||(S.unb&&countIn('v_'+id,srcs)+((P.tune&&P.tune.vr&&P.tune.vr[sl.id]===id)?1:0)>0)),vl=t<2?vl0.filter(id=>VARIANTS[id].spec):vl0,")
rep("if(!V.spec&&(P.tiers[sl]||1)<2){","if(V.spec==='unb'&&!S.unb)return;if(V.spec==='unb'&&!countIn('v_'+id,srcs)){dockErr='Unbound parts come from the haven black market.';return}if(!V.spec&&(P.tiers[sl]||1)<2){")
# the haven dock: Works tab, black-market parts, laundering, calling the fleet from Marks
rep("const DOCK_GROUPS=[['haven','Scrapheart',['fence','black','marks','wanted']],","const DOCK_GROUPS=[['haven','Scrapheart',['fence','black','marks','wanted','works']],")
rep("if(c.haven)tabs.push(['fence','Fence'],['black','Black market'],['marks','Marks'],['wanted','Wanted']);","if(c.haven)tabs.push(['fence','Fence'],['black','Black market'],['marks','Marks'],['wanted','Wanted'],['works','Works']);")
rep("else if(dockTab==='wanted')h+=unbWantedHtml(c,P);","else if(dockTab==='wanted')h+=unbWantedHtml(c,P);else if(dockTab==='works')h+=unbWorksHtml(c,P);")
rep("return h+`</tbody></table></div><div class=\"act\" style=\"margin-top:8px\"><button class=\"btn\" data-act=\"fence\" data-arg=\"*:all\">Fence the whole hold</button></div>`}",
    "return h+`</tbody></table></div><div class=\"act\" style=\"margin-top:8px\"><button class=\"btn\" data-act=\"fence\" data-arg=\"*:all\">Fence the whole hold</button></div>`+launderHtml(P)}")
rep("Laundering needs the Den at level 2 (coming with the haven works).","${unbWork('den')>=2?'The Den launders stolen goods for a tenth of their value.':'Laundering needs the Den at level 2 (Works tab).'}")
rep("function unbFenceRate(){return .7}","function unbFenceRate(){return[.7,.7,.8,.9][unbWork('den')]}")
rep("return h+`</tbody></table></div><p class=\"note\" style=\"margin-top:10px\">Harpoons are your missiles fired in jam mode (4). Jamming torpedoes for the Plunderer come with the Powder Magazine.</p>`}",
    "return h+`</tbody></table></div><p class=\"note\" style=\"margin-top:10px\">Harpoons are your missiles fired in jam mode (4). In jam mode a Plunderer's missile key fires jamming torpedoes (${jtCap()} in the magazine, 40 s reload): the only way to take a capital ship dark, and the key to a faction vault during a lockdown.</p>`+unbVarBuyHtml(P)}")
rep("const back=Math.floor((UNB_PRICE[P.cls]||0)*TRADE_IN),pr=UNB_PRICE[k];","const hk=unbWork('chop')>=2?.9:1,back=Math.floor((UNB_PRICE[P.cls]||0)*hk*TRADE_IN),pr=Math.round(UNB_PRICE[k]*hk);")
rep("for(const k of UNB_HULLS){const st=shipStats('pirate',k,1),on=P.cls===k,pr=UNB_PRICE[k];","for(const k of UNB_HULLS){const st=shipStats('pirate',k,1),on=P.cls===k,pr=Math.round(UNB_PRICE[k]*(unbWork('chop')>=2?.9:1));")
rep("function unbMarks(){const out=[],near=new Set(['wr',...NEIGH.wr]);for(const t of S.traders||[]){if(!near.has(t.sector)&&!(t.path||[]).some(x=>near.has(x)))continue;if(!FAC_IDS.includes(t.side))continue;out.push({t,v:invValue(t.load||{})})}",
    "function unbMarks(){const out=[],tk=unbWork('tankard'),near=new Set(['wr',...NEIGH.wr]);if(tk>=2)for(const n of NEIGH.wr)for(const m of NEIGH[n])near.add(m);if(unbWork('crow')>=1&&S.player.sector){near.add(S.player.sector);for(const n of NEIGH[S.player.sector])near.add(n)}\n  for(const t of S.traders||[]){if(!near.has(t.sector)&&!(t.path||[]).some(x=>near.has(x)))continue;if(!FAC_IDS.includes(t.side))continue;if(tk<1&&t.kind!=='haul')continue;out.push({t,v:invValue(t.load||{})})}")
rep("<td class=\"r num\">~${fmt(Math.round(v/100)*100)} cr</td><td class=\"r num\">${es||'?'}</td><td><button class=\"btn sm\" data-act=\"vcourse\" data-arg=\"${t.sector}\">Set course</button></td></tr>`}",
    "<td class=\"r num\">${unbWork('tankard')>=1?'~'+fmt(Math.round(v/100)*100)+' cr':'?'}</td><td class=\"r num\">${unbWork('crow')>=3?(es||0):'?'}</td><td><div class=\"act\"><button class=\"btn sm\" data-act=\"vcourse\" data-arg=\"${t.sector}\">Set course</button>${unbWork('graving')>=2&&!DEF[t.sector].home?`<button class=\"btn sm\" data-act=\"callcap\" data-arg=\"sloop:${t.sector}\">Call a sloop</button>`:''}${unbWork('graving')>=3&&!DEF[t.sector].home?`<button class=\"btn sm\" data-act=\"callcap\" data-arg=\"destroyer:${t.sector}\">Call the destroyer</button>`:''}</div></td></tr>`}")
rep("if(act==='fence'){unbFence(arg);return}","if(act==='fence'){unbFence(arg);return}if(act==='work'){unbBuildWork(arg);return}if(act==='launder'){unbLaunder();return}if(act==='unbvar'){unbBuyVar(arg);return}if(act==='callcap'){const[k,sid]=String(arg).split(':');callCap(k,sid);return}")
# called capitals hold their course; a called sloop lost puts heat on the caller
rep("else if(!fOwn(t)&&(!t.dest||t.dest===t.sector)&&Math.random()<.35)t.dest=frigOrders(t);","else if(!fOwn(t)&&!(t.call&&t.call.until>S.T)&&(!t.dest||t.dest===t.sector)&&Math.random()<.35)t.dest=frigOrders(t);")
rep("  if(e.role==='frigate'&&e.tok){capPingPay(e.tok);","  if(e.role==='frigate'&&e.tok){if(S.unb&&e.tok.call&&e.tok.call.until>S.T){const f=sideNorm(src);if(FAC_IDS.includes(f))heatAdd(f,10,`your called ${capName(e.tok)} ${e.tok.name} was lost`)}capPingPay(e.tok);")
# Graving Dock 1: Unbound capitals build 20% faster
rep("until:T+(next==='carrier'?FRIGATE_TIME:ESCORT_TIME),stage:'building'});","until:T+(next==='carrier'?FRIGATE_TIME:ESCORT_TIME)*(unbWork('graving')>=1?.8:1),stage:'building'});")
# Grog Still: bigger, braver Unbound wings
rep("  if(d.kind!=='hive'&&broodNear(W.sid))want.push(['raider','brood',1,d.kind==='void'?.08:.22,3]);\n  return want}",
    "  if(d.kind!=='hive'&&broodNear(W.sid))want.push(['raider','brood',1,d.kind==='void'?.08:.22,3]);\n  {const g=unbWork('grog');if(g)for(const w of want)if(w[1]==='pirate'&&w.length>4)w[4]+=g>=3?2:1}\n  return want}")
rep("if(!g.fleeing&&g.n0>=3&&al.length<=2&&g.members.some(m=>m.killed)){","if(!g.fleeing&&g.n0>=3&&al.length<=(g.side==='pirate'&&unbWork('grog')>=2?1:2)&&g.members.some(m=>m.killed)){")
# Powder Magazine, Chop Shop, Forger's Shack, Crow's Nest, Trophy Wall
rep("e.jam=(e.jam||0)+b.dmg*((b.src&&b.src.st&&b.src.st.jamK)||1);","e.jam=(e.jam||0)+b.dmg*((b.src&&b.src.st&&b.src.st.jamK)||1)*(b.src&&b.src.isPlayer&&unbWork('powder')>=1?1.1:1);")
rep("W.hookAcc=(W.hookAcc||0)+JAM.hookRate*dt;","W.hookAcc=(W.hookAcc||0)+(unbWork('chop')>=3?12:unbWork('chop')>=1?10:JAM.hookRate)*dt;")
rep("const SE=W.stationEnt,near=SE&&SE.fac===f&&d3(SE,p)<3000?3:1,ch=(.05+.02*Math.floor(sm/10)+(P.heat[f]>=15?.1:0))*near;",
    "const SE=W.stationEnt,near=SE&&SE.fac===f&&d3(SE,p)<3000?3:1,ch=(.05+.02*Math.floor(sm/10)+(P.heat[f]>=15?.1:0))*near*(unbWork('forger')>=1?.75:1)*(p.st.scanK||1);")
rep("for(const f of FAC_IDS)if(P.heat[f]>0)P.heat[f]=Math.max(0,P.heat[f]-(quiet?UNB_HEAT.coolQuiet:UNB_HEAT.cool)*dt);",
    "const lk=lockOf(),atLair=S.player.docked==='lair';for(const f of FAC_IDS)if(P.heat[f]>0&&!(lk&&lk.f===f))P.heat[f]=Math.max(0,P.heat[f]-(quiet||atLair?UNB_HEAT.coolQuiet:UNB_HEAT.cool)*(unbWork('forger')>=2?1.5:1)*dt);jtTick(dt);if(!NET.cl){riggerTick()}")
rep("P.xpdrOut=S.T+300;P.xpdr=false;","P.xpdrOut=S.T+(unbWork('forger')>=3?120:300);P.xpdr=false;")
rep("function infAdd(n,why){if(!S.unb||!(n>0))return;const P=unbP(),r0=unbRank(P.inf),k=unbHomeOf(W&&W.sid)?2:1;","function infAdd(n,why){if(!S.unb||!(n>0))return;const P=unbP(),r0=unbRank(P.inf),k=(unbHomeOf(W&&W.sid)?2:1)*(1+.05*havenOf().trophy.length);")
rep("  if(A){infAdd(UNB_INF.ace);deedAdd('ace')}","  if(A){havenOf().trophy.push(aceLabel(A));infAdd(UNB_INF.ace);deedAdd('ace')}")
rep("function seenShip(e){","function seenShip(e){if(S&&S.unb&&e&&e.masked&&W&&W.player&&unbWork('crow')>=2&&d3(e,W.player)<2000)return true;")
# raids, the captain, jam torps and lairs every frame; capital takes in the hook; heists and capital-take Deeds on the take
rep("  if(S.player.docked||!p||W.dead)return;unbHook(dt);unbScan(dt);","  if(!S.player.docked&&p&&!W.dead){raidTick();captainTick()}lairWorld(dt);for(const e of W.ents)if(e.role==='frigate')capJamDrain(e,dt);\n  if(S.player.docked||!p||W.dead)return;unbHook(dt);unbScan(dt);")
rep("function hookTarget(){const p=W.player;if(!S.unb||!p||!W.tgt||W.tgt.kind!=='ship')return null;const T=W.tgt.ref;return T&&T.alive&&jamDark(T)&&d3(T,p)<hookReach(T)+T.st.radius?T:null}",
    "function hookTarget(){const p=W.player;if(!S.unb||!p||!W.tgt||W.tgt.kind!=='ship')return null;const T=W.tgt.ref;return T&&T.alive&&jamDark(T)&&d3(T,p)<hookReach(T)+T.st.radius*(T.role==='frigate'?8:1)?T:null}\nfunction hookSrc(T){if(T.role==='frigate'){const st=T.tok&&T.tok.store;return st&&Object.keys(st).some(k=>st[k]>0)?st:T.load||{}}return T.cargo||{}}")
rep("function hookReach(T){return T.teth&&T.teth.until>W.t&&T.teth.by===W.player?400:JAM.hookR}","function hookReach(T){return T.teth&&T.teth.until>W.t&&T.teth.by===W.player?(W.player.st.tetherR||400):JAM.hookR}")
rep("if(!T||!keys.KeyE)return;const cg=T.cargo||{};","if(!T||!keys.KeyE)return;const cg=hookSrc(T);")
rep("  infAdd(tk.moved*UNB_INF.perTon);if(f)heatAdd(f,T.alive?UNB_HEAT.mercy:UNB_HEAT.take,T.alive?'a mercy take':'a take');",
    "  infAdd(tk.moved*UNB_INF.perTon);if(f)heatAdd(f,T.alive?UNB_HEAT.mercy:UNB_HEAT.take,T.alive?'a mercy take':'a take');if(T.role==='frigate'){infAdd(300);if(f)heatAdd(f,15,'a capital take');deedAdd('captake')}{const L=lockOf();if(L&&L.f===f)deedAdd('heist')}")
# capitals: jam-mode guns hit turrets, a dark capital does nothing, dark turrets don't fire
rep("if(b.jam)jamHit(e,b);else","if(b.jam){if(e.role==='frigate')capJamShot(e,b);else jamHit(e,b)}else")
rep("function frigateThink(e,dt){const t=e.tok;if(!t||!S.frigates.includes(t)){e.role='leave';return}t.hull=e.hull;t.shield=e.shield;","function frigateThink(e,dt){const t=e.tok;if(!t||!S.frigates.includes(t)){e.role='leave';return}t.hull=e.hull;t.shield=e.shield;if(jamDark(e)){e.charging=0;e.thrusting=false;return}")
rep("for(const tu of e.turrets){tu.cool-=dt*pm;if(tu.cool>0)continue;","for(const tu of e.turrets){if((tu.jamOff||0)>W.t)continue;tu.cool-=dt*pm;if(tu.cool>0)continue;")
# jamming torpedoes: the missile key in jam mode on a Plunderer; their hit
rep("function fireMissile(){if(!W||!running||S.player.docked||W.dead||W.docking)return;","function fireMissile(){if(!W||!running||S.player.docked||W.dead||W.docking)return;if(S.unb&&W.player&&W.player.jamMode&&S.player.cls==='plunderer'&&!NET.cl){if(fireJamTorp())return}")
rep("function detonate(m,i){if(m.harp){W.missiles.splice(i,1);harpHit(m);return}","function detonate(m,i){if(m.harp){W.missiles.splice(i,1);harpHit(m);return}if(m.jt){W.missiles.splice(i,1);jtHit(m);return}")
# AI Unbound fire shock harpoons in jam mode; the Tether cutter answers with flares; a tethered ship is hooked from 400 m
rep("function playerFlares(){if(!W||!running||S.player.docked||W.dead)return;const p=W.player;if(W.flareCd>0){flash(`Flares recharging (${Math.ceil(W.flareCd)} s).`);return}if(p.energy<30){flash('Not enough energy for flares.');return}p.energy-=30;W.flareCd=5;deployFlares(p);",
    "function playerFlares(){if(!W||!running||S.player.docked||W.dead)return;const p=W.player;if(W.flareCd>0){flash(`Flares recharging (${Math.ceil(W.flareCd)} s).`);return}if(p.energy<30){flash('Not enough energy for flares.');return}p.energy-=30;W.flareCd=5;deployFlares(p);if(p.teth&&p.st.tetherCut){p.teth=null;feed('Tether cutter: the harpoon line is cut.','good')}")
rep("function jamTake(e,t,dt){const d=d3(e,t);if(d>JAM.hookR*.8)","function jamTake(e,t,dt){const d=d3(e,t);if(d>(t.teth&&t.teth.until>W.t&&t.teth.by===e?400:JAM.hookR)*.8)")
# the haven battered dark loses a work level
rep("if(R.hull<=0){if(R.kind!=='depot'){R.hull=1;if(W.t+40>E.offline){E.offline=W.t+40;","if(R.hull<=0){if(R.kind!=='depot'){R.hull=1;if(W.t+40>E.offline){if(R.sid==='wr'&&S.unb)havenBattered();E.offline=W.t+40;")
# Lairs: comms 3 calls a Rigger; E docks at your Lair; drawn in 3D; a dock context of their own
rep("function requestBuild(){if(!W||!W.player)return;if(S.unb){flash('No faction builds for the Unbound. Lairs come with the haven works.',true);return}","function requestBuild(){if(!W||!W.player)return;if(S.unb){lairBuild();return}")
rep("else if(S.unb&&hookTarget()){return}else tryDock();return}","else if(S.unb&&hookTarget()){return}else if(S.unb&&lairNear()){lairDock(lairNear());return}else tryDock();return}")
rep("{const o=drawWorks;drawWorks=function(t){const r=o.apply(this,arguments);try{xDraw3D(t)}catch(e){}return r}}","{const o=drawWorks;drawWorks=function(t){const r=o.apply(this,arguments);try{xDraw3D(t)}catch(e){}try{if(S&&S.unb)lairDraw()}catch(e){}return r}}")
rep("function dockCtx(){\n  const P=S.player,d=DEF[P.sector];vaultSync(P);\n","function dockCtx(){\n  const P=S.player,d=DEF[P.sector];vaultSync(P);\n  if(P.docked==='lair'){const L=(S.lairs||[]).find(x=>x.id===P.lairId)||{stash:{}};return{kind:'lair',name:'Your Lair',sub:`Unbound Lair · ${d.name} · stash ${invMass(L.stash)}/${LAIR.stash} t`,owner:'pirate',market:null,wallet:null,fee:false,forge:false,fab:false,storage:L.stash,storageName:'Lair stash',hulls:false,contracts:false,fortify:false,works:false,lair:true}}\n")
rep("function undock(){const P=S.player;if(!P.docked)return;","function undock(){const P=S.player;if(!P.docked)return;if(P.docked==='lair'){P.docked=null;$('dock').hidden=true;const p=W.player;p.alive=true;p.vx=60;cam.snap=true;save();return}")
# the lair stash holds 200 t
rep("if(c.storage===P.vault)tabs.push(['bay',","if(c.lair){}else if(c.storage===P.vault)tabs.push(['bay',")
# HUD: jamming torpedoes and capital jam on the target panel
rep("${S.unb&&(T.jam>0||jamDark(T))?","${S.unb&&T.role==='frigate'?`<div class=\"ts\" style=\"color:#b7c6ff\">${jamDark(T)?`JAMMED DARK · ${Math.max(0,Math.ceil(T.jamOff-W.t))} s · hold E to hook its store`:`Capital jam ${Math.round((T.cjam||0)*100)}% · turrets jammed ${(T.turrets||[]).filter(x=>(x.jamOff||0)>W.t).length}/${(T.turrets||[]).length}`}</div>`:''}${S.unb&&T.role!=='frigate'&&(T.jam>0||jamDark(T))?")
rep("c.fillStyle='rgba(216,205,152,.9)';c.fillText(`☠ ${UNB_RANKS[unbRank(P.inf)][0].toUpperCase()} · INFAMY ${fmt(Math.round(P.inf))}${W.player.jamMode?' · JAM MODE':''}`,x,y);y+=15;",
    "c.fillStyle='rgba(216,205,152,.9)';c.fillText(`☠ ${UNB_RANKS[unbRank(P.inf)][0].toUpperCase()} · INFAMY ${fmt(Math.round(P.inf))}${W.player.jamMode?' · JAM MODE':''}${P.cls==='plunderer'?` · JAM TORPS ${P.jt==null?jtCap():P.jt}/${jtCap()}`:''}`,x,y);y+=15;{const L=lockOf();if(L){c.fillStyle='#ff5d4f';c.fillText(`🚨 LOCKDOWN ${fmtT(S.T-L.t0)} · ${FACTIONS[L.f].short.toUpperCase()}`,x,y);y+=15}}")
rep("  for(const k in(S.yards||{}))invVec(S.yards[k].fort||{},L.Stations);","  for(const k in(S.yards||{}))invVec(S.yards[k].fort||{},L.Stations);for(const Lr of S.lairs||[]){invVec(Lr.stash,L.Stations);invVec(Lr.fort||{},L.Stations)}")
rep("inv.take(e.load,'missile',1);launchMissile(e,t,e.tier);ai.lock=0;","inv.take(e.load,'missile',1);launchMissile(e,t,e.tier);if(e.side==='pirate'&&e.jamMode){const mm=W.missiles[W.missiles.length-1];if(mm&&mm.src===e){mm.harp=1;mm.col='#b7c6ff'}}ai.lock=0;")
open(P,'w',encoding='utf-8').write(s);print('unbound stage 3 applied')
