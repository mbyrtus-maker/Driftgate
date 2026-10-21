# Patch: ship upgrade choices (Mk I-III cap + general variants as fitted parts).
# Run once against index.html: python3 tools/p_upgrades.py index.html
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a)
    assert c==n,(c,n,a[:120])
    s=s.replace(a,b)

# ---------------------------------------------------------------- variants: data, parts, stats
VARIANTS_JS=r"""
// ============================================================ ship upgrade choices: from Mk II each system takes one variant, a real part built from
// materials (an item, so the ledger counts it), fitted per ship in tune.vr and free to swap at any dock with Upgrades. A variant buys a
// strength with a weakness. Fitted variants go down with the ship: half spill into the crate as salvage, the rest is lost as debris.
const VAR_RECIPE={plate:2,coil:2,lattice:1};
const VARIANTS={
  sprint:{slot:'engine',name:'Sprint drive',gain:'+25% top speed, afterburner lasts longer',cost:'−20% turn',m:{maxSpd:1.25,turn:.8},f:{boostK:.8}},
  vector:{slot:'engine',name:'Vector drive',gain:'+30% turn',cost:'−12% top speed',m:{turn:1.3,maxSpd:.88}},
  longburn:{slot:'engine',name:'Long-burn drive',gain:'Afterburner uses 40% less energy',cost:'−15% acceleration',m:{thrust:.85},f:{boostK:.6}},
  surge:{slot:'power',name:'Surge core',gain:'+50% energy capacity',cost:'Recharge pauses for half a second after firing or boosting',m:{eCap:1.5},f:{surge:.5}},
  steady:{slot:'power',name:'Steady core',gain:'+35% energy recharge',cost:'−25% energy capacity',m:{eRegen:1.35,eCap:.75}},
  bastion:{slot:'shield',name:'Bastion',gain:'+45% shield capacity',cost:'Recharge waits 4.5 s after a hit, not 2.5 s',m:{sCap:1.45},f:{shDelay:4.5}},
  flicker:{slot:'shield',name:'Flicker',gain:'Recharge starts after 1 s and runs twice as fast',cost:'−30% shield capacity',m:{sCap:.7},f:{shDelay:1,shRegK:2}},
  tunedk:{slot:'shield',name:'Tuned emitter (kinetic)',gain:'Shields take 30% less from kinetic fire',cost:'Shields take 20% more from lasers',f:{tuned:'kinetic'}},
  tunedl:{slot:'shield',name:'Tuned emitter (laser)',gain:'Shields take 30% less from lasers',cost:'Shields take 20% more from kinetic fire',f:{tuned:'laser'}},
  heavyc:{slot:'weapon',name:'Heavy cannons',gain:'+40% damage per shot',cost:'−30% fire rate, 15% slower shells',m:{dmg:1.4,rof:.7},f:{shotSpd:977.5}},
  rapid:{slot:'weapon',name:'Rapid fire',gain:'+45% fire rate',cost:'−25% damage, higher energy drain',m:{rof:1.45,dmg:.75}},
  longbar:{slot:'weapon',name:'Long barrel',gain:'+30% range',cost:'−10% fire rate',m:{rof:.9},f:{shotTtl:1.3}},
  ablative:{slot:'armor',name:'Ablative plating',gain:'+40% hull',cost:'−10% speed and acceleration',m:{hull:1.4,maxSpd:.9,thrust:.9}},
  lightframe:{slot:'armor',name:'Light frame',gain:'+10% turn and acceleration',cost:'−15% hull',m:{hull:.85,turn:1.1,thrust:1.1}},
  reactive:{slot:'armor',name:'Reactive plating',gain:'+12% damage reduction',cost:'−10% shields',m:{sCap:.9},a:{dr:.12}},
  bulk:{slot:'cargo',name:'Bulk hold',gain:'+50% hold',cost:'Always handles as at least half laden',m:{cargo:1.5},f:{ladenMin:.5}},
  stable:{slot:'cargo',name:'Stabilised hold',gain:'Half the laden handling penalty',cost:'−20% hold',m:{cargo:.8,ladenK:.5}},
  deepmag:{slot:'payload',name:'Deep magazine',gain:'+50% missiles in the rack',cost:'Always flies as at least a third laden',f:{rackK:1.5,ladenMin:1/3}},
  quickcyc:{slot:'payload',name:'Quick-cycle rack',gain:'Reloads twice as fast',cost:'−40% rack size',f:{reloadK:.5,rackK:.6}},
  smart:{slot:'payload',name:'Smart seekers',gain:'−40% lock time',cost:'−20% missile damage',f:{lockK:.6,mslK:.8}},
};
const VAR_BY_SLOT={};for(const id in VARIANTS){const V=VARIANTS[id];V.id=id;V.recipe=V.recipe||VAR_RECIPE;(VAR_BY_SLOT[V.slot]=VAR_BY_SLOT[V.slot]||[]).push(id);
  ITEMS['v_'+id]={name:V.name,recipe:V.recipe,col:'#9fe0c8',variant:id}}
"""
rep("epot Frame',recipe:{plate:10,wire:6,coil:3},col:'#c8d2e0'},\n};\n",
    "epot Frame',recipe:{plate:10,wire:6,coil:3},col:'#c8d2e0'},\n};\n"+VARIANTS_JS)
# variant parts show in vaults and holds after the existing goods
rep("const ITEM_ORDER=['fe','cu','ir','xc','au','nu','plate','wire','coil','lattice','core','beacon','missile','torpedo','swarm','drone','frame','keel','picket'];",
    "const ITEM_ORDER=['fe','cu','ir','xc','au','nu','plate','wire','coil','lattice','core','beacon','missile','torpedo','swarm','drone','frame','keel','picket'];for(const id in VARIANTS)ITEM_ORDER.push('v_'+id);")

APPLY_JS=r"""
function vrOf(U){return(U&&typeof U==='object'&&U.vr)||{}}
function applyVariants(B,U){const vr=vrOf(U);for(const sl in vr){const V=VARIANTS[vr[sl]];if(!V||V.slot!==sl)continue;
  for(const k in V.m||{})B[k]=(B[k]||(k==='ladenK'?1:0))*V.m[k];for(const k in V.a||{})B[k]=(B[k]||0)+V.a[k];for(const k in V.f||{})B[k]=V.f[k]}
  if(B.cargo)B.cargo=Math.round(B.cargo);return B}
// a pilot's fitted-variant factor for things computed from the pilot record rather than ship stats (rack size, reloads, lock time)
function vK(P,key){let k=1;const vr=vrOf(P&&P.tune);for(const sl in vr){const V=VARIANTS[vr[sl]];if(V&&V.f&&V.f[key]!=null)k*=V.f[key]}return k}
function pRack(P){return Math.round(rackCapC(P.cls,P.tiers.weapon)*vK(P,'rackK'))}
function vrInv(R){const o={};const vr=vrOf(R&&R.tune);for(const sl in vr)if(VARIANTS[vr[sl]])inv.add(o,'v_'+vr[sl],1);return o}
// shields tuned against one weapon type take less from it and more from the other
function tunedK(e,kind){const t=e.st&&e.st.tuned;if(!t||(kind!=='kinetic'&&kind!=='laser'))return 1;return kind===t?1/1.3:1.2}
// a destroyed ship's fitted variants: each one either spills into the crate whole, or breaks up into the system's debris
function vrLose(P,crate,s){const vr=vrOf(P.tune);for(const sl in vr){const id='v_'+vr[sl];if(!ITEMS[id])continue;if(Math.random()<.5)inv.add(crate,id,1);else toDebris(s,{[id]:1})}if(P.tune)P.tune.vr={}}
"""
rep("rackCapC(P.cls,P.tiers.weapon)","pRack(P)",8)
rep("return applyLegend(applyRefits(B,U),cls,U)}","return applyVariants(applyLegend(applyRefits(B,U),cls,U),U)}"+APPLY_JS)

# ---------------------------------------------------------------- behaviour hooks
rep("W.t-e.lastHit>2.5&&!e.landed&&!e.stealth","W.t-e.lastHit>(e.st.shDelay||2.5)&&!e.landed&&!e.stealth")
rep(":.09)*dt);",":.09*(e.st.shRegK||1))*dt);")
rep("e.energy=Math.min(e.st.eCap,e.energy+e.st.eRegen*dt*(e.boot&&W.t<e.boot?4:1))",
    "e.energy=Math.min(e.st.eCap,e.energy+e.st.eRegen*dt*(e.boot&&W.t<e.boot?4:1)*(e.st.surge&&W.t-(e.lastFire||-9)<e.st.surge?0:1))")
rep("e.cool=1/e.st.rof;e.energy-=e.st.shotCost;","e.cool=1/e.st.rof;e.energy-=e.st.shotCost;e.lastFire=W.t;")
rep("vx:e.vx+_f.x*SHOT_SPD,vy:e.vy+_f.y*SHOT_SPD,vz:e.vz+_f.z*SHOT_SPD,dmg:e.st.dmg,side:e.side,src:e,ttl:SHOT_TTL,",
    "vx:e.vx+_f.x*(e.st.shotSpd||SHOT_SPD),vy:e.vy+_f.y*(e.st.shotSpd||SHOT_SPD),vz:e.vz+_f.z*(e.st.shotSpd||SHOT_SPD),dmg:e.st.dmg,side:e.side,src:e,ttl:SHOT_TTL*(e.st.shotTtl||1),")
rep("e.cool=1/LASER_ROF;e.energy-=cost;","e.cool=1/LASER_ROF;e.energy-=cost;e.lastFire=W.t;")
rep("lp0=e.wpn==='laser'?t:leadPoint(e,t,SHOT_SPD)","lp0=e.wpn==='laser'?t:leadPoint(e,t,e.st.shotSpd||SHOT_SPD)")
rep("leadPoint(p,T,SHOT_SPD)","leadPoint(p,T,p.st.shotSpd||SHOT_SPD)",3)
rep("p.energy=Math.max(0,p.energy-30*dt*(CLASSES[P.cls].bcost||1))","p.energy=Math.max(0,p.energy-30*dt*(CLASSES[P.cls].bcost||1)*(st.boostK||1));p.lastFire=W.t")
rep("const L=ladenOf(e)*((e.st&&e.st.ladenK)||1);","const L=Math.max(ladenOf(e),(e.st&&e.st.ladenMin)||0)*((e.st&&e.st.ladenK)||1);")
rep("const sf=kind==='laser'?1.25:kind==='kinetic'?.85:1,","const sf=(kind==='laser'?1.25:kind==='kinetic'?.85:1)*tunedK(e,kind),")
rep("return Math.max(1,Math.round(Math.max(MAG_FLOOR[k],MAG_T[k]*(1-.15*(t-1))))-2*u)}",
    "return Math.max(1,Math.round(Math.max(MAG_FLOOR[k],MAG_T[k]*(1-.15*(t-1)))*vK(P,'reloadK'))-2*u)}")
rep("L.p+=dt/lockTime(P.tiers.weapon,CLASSES[P.cls].torp)","L.p+=dt/(lockTime(P.tiers.weapon,CLASSES[P.cls].torp)*vK(P,'lockK'))")
rep("dmg:tp?torpDmg(tier):missileDmg(tier)","dmg:tp?torpDmg(tier):missileDmg(tier)*((e.st&&e.st.mslK)||1)")

# ---------------------------------------------------------------- the ledger, stripping and losing ships
rep("invVec({tune:tuneItems((R.tune||{})[sl.id]||0)},Y)}}credits+=P.credits}","invVec({tune:tuneItems((R.tune||{})[sl.id]||0)},Y)}invVec(vrInv(R),Y)}credits+=P.credits}")
rep("if(R.tune&&R.tune.rf)R.tune.rf={}}","if(R.tune&&R.tune.rf)R.tune.rf={};if(R.tune&&R.tune.vr){inv.addAll(into,vrInv(R));R.tune.vr={}}}")
rep("&&!Object.keys(t.rf||{}).length}","&&!Object.keys(t.rf||{}).length&&!Object.keys(t.vr||{}).length}")
rep("if(!shipBare(P)){shipStrip(P,crate);","vrLose(P,crate,s);if(!shipBare(P)){shipStrip(P,crate);")

# ---------------------------------------------------------------- Mk I-III: Mk IV and V are retired
rep("let MK_LV=[0,0,.17,.29,.46,.72],MK_K=1;","let MK_LV=[0,0,.17,.29,.46,.72],MK_K=1;const MK_TOP=3;")
rep("if(t<5){const r=upgRecipe(arg,t+1)","if(t<MK_TOP){const r=upgRecipe(arg,t+1)")
rep("if(t+1>=4&&!c.forge)dockErr='Mk IV and V need a Forge.';else ","",2)
rep("if(t>=5)return;","if(t>=MK_TOP)return;")
rep("if(t<5){const r=upgRecipe(sl.id,t+1),fee=c.fee?Math.ceil(invValue(r)*.08):0,needF=t+1>=4&&!c.forge;",
    "if(t<MK_TOP){const r=upgRecipe(sl.id,t+1),fee=c.fee?Math.ceil(invValue(r)*.08):0,needF=false;")
rep("if(!isCur&&t<5){","if(!isCur&&t<MK_TOP){")
rep("needF=t+1>=4&&!c.forge,ok=","needF=false,ok=")
rep("[1,2,3,4,5].map(i=>`<i class=\"${i<=t?'on':''}\"></i>`)","[1,2,3].map(i=>`<i class=\"${i<=t?'on':''}\"></i>`)")
rep("Mk II–III fit at any friendly dock; Mk IV–V need a Forge. Upgrades belong to this ship",
    "Mk II and III fit at any friendly dock, and from Mk II each system takes one variant: a part that buys a strength with a weakness, free to swap here. Upgrades belong to this ship")
rep("${c.forge?'':'; Mk IV–V need a Forge'}","")
rep("forge:'Forge · Lattice, Cores, Mk IV–V fitting'","forge:'Forge · Lattice and Cores'")

# saves: Mk IV and V systems come back to Mk III, and the parts above Mk III go into the pilot's vault (the ledger doesn't move)
MIG_JS=r"""
function mkCapMigrate(){const pl=[S.player,...Object.values(S.pilots||{})].filter((P,i,a)=>P&&a.indexOf(P)===i);let n=0;
  for(const P of pl){const to=P.vault||(P.vault={});for(const R of[P,...(P.ships||[])]){if(!R.tiers)continue;for(const sl of SLOTS){const t=R.tiers[sl.id]||1;if(t<=MK_TOP)continue;
    const a=compInv(sl.id,t),b=compInv(sl.id,MK_TOP);for(const k in a){const d=a[k]-(b[k]||0);if(d>0)inv.add(to,k,d)}R.tiers[sl.id]=MK_TOP;n++}}}
  if(n&&S.player)feed(`Mk IV and V are retired: ${n} system${n>1?'s were':' was'} set to Mk III and the extra parts went into your vault. Build a variant with them in Upgrades.`,'info')}
"""
rep("function migrate(st){S=st;","function migrate(st){S=st;mkCapMigrate();")
rep("function migrate(st){S=st;mkCapMigrate();",MIG_JS+"function migrate(st){S=st;mkCapMigrate();")

# ---------------------------------------------------------------- dock: fit and remove variants
ACT_JS=r"""else if(act==='vfit'){const[sl,id]=String(arg).split(':'),V=VARIANTS[id];if(!V||V.slot!==sl||!SLOT[sl])return;if((P.tiers[sl]||1)<2){dockErr=`Variants open at Mk II. Upgrade the ${SLOT[sl].name} first.`;return}
    P.tune=P.tune||{};P.tune.vr=P.tune.vr||{};if(P.tune.vr[sl]===id)return;const item='v_'+id;
    if(countIn(item,srcs)>0)takeFrom({[item]:1},srcs);else if(haveIn(V.recipe,srcs))takeFrom(V.recipe,srcs);else{dockErr=`Missing parts for the ${V.name}.`;return}
    const old=P.tune.vr[sl];if(old)inv.add(c.storage,'v_'+old,1);P.tune.vr[sl]=id;refreshPlayerStats();dockErr=`✓ ${V.name} fitted to the ${SLOT[sl].name}.${old?` The ${VARIANTS[old].name} went to your ${c.storageName.toLowerCase()}.`:''}`;feed(`${SLOT[sl].name}: ${V.name} fitted.`,'good')}
  else if(act==='vrem'){const sl=String(arg),vr=(P.tune&&P.tune.vr)||{},old=vr[sl];if(!old)return;inv.add(c.storage,'v_'+old,1);delete vr[sl];refreshPlayerStats();dockErr=`✓ ${VARIANTS[old].name} removed to your ${c.storageName.toLowerCase()}.`}
  else if(act==='upg'){"""
rep("else if(act==='upg'){",ACT_JS)

ROW_OLD="h+=`<div class=\"slot\"><div><div class=\"sn\">${sl.name}</div><div class=\"ss\">${stat[sl.id]}</div></div>"
ROW_NEW="{const vl=VAR_BY_SLOT[sl.id]||[],vr=(P.tune&&P.tune.vr)||{},fv=vr[sl.id];if(vl.length)vrow=t<2?`<div class=\"note\" style=\"margin:4px 0 0\">Variants open at Mk II.</div>`:`<div class=\"act\" style=\"margin-top:4px;flex-wrap:wrap\">${vl.map(id=>{const V=VARIANTS[id],own=countIn('v_'+id,srcs),on=fv===id,can=own>0||haveIn(V.recipe,srcs);return on?`<button class=\"btn sm pri\" data-act=\"vrem\" data-arg=\"${sl.id}\" title=\"${esc(V.gain+' · '+V.cost)} · click to remove\">✓ ${esc(V.name)}</button>`:`<button class=\"btn sm\" data-act=\"vfit\" data-arg=\"${sl.id}:${id}\" ${can?'':'disabled'} title=\"${esc(V.gain+' · '+V.cost)} · ${own?own+' spare':esc(Object.keys(V.recipe).map(k=>V.recipe[k]+' '+ITEMS[k].name).join(', '))}\">${esc(V.name)}${own?' ·'+own:''}</button>`}).join('')}</div>`;else vrow=''}\n      "+ROW_OLD
rep(ROW_OLD,ROW_NEW)
# the variant buttons sit under the slot row; declare the holder each loop
rep("for(const sl of SLOTS){const t=P.tiers[sl.id];let rq='',btn='';","for(const sl of SLOTS){const t=P.tiers[sl.id];let rq='',btn='',vrow='';")
rep("<div class=\"rq\">${rq}</div><div>${btn}</div></div>`}","<div class=\"rq\">${rq}</div><div>${btn}</div>${vrow?`<div style=\"grid-column:1/-1\">${vrow}</div>`:''}</div>`}")

open(P,'w',encoding='utf-8').write(s);print('upgrades patch applied')
