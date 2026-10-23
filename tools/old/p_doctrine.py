# Patch: ship upgrade choices stage 4 and the blast mining AI. Faction AI doctrines (each faction's wings favour certain
# variants, shown on the target panel so they can be read and countered), specialist stocking (factions on the Bloom border
# stock anti-Brood parts, factions whose convoys the Unbound have hit stock anti-jam parts), specialists fit from Mk I as the
# design says, and AI Unbound and Brood Grazers turning toward fresh ore clouds and scooping them.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

JS=r"""
// ---- faction doctrines: the variants each faction's AI wings favour. Halcyon (strong shields) fits Bastion or Flicker;
// Varkesh (heavy hulls) Ablative or Reactive plating, or Heavy cannons; Ostrova (deep reactors) a Surge or Steady core, or
// Rapid fire. Combat wings only; the chance grows with the faction's tier. Stats only: nothing is built, nothing drops.
const WING_DOC={halcyon:{shield:['bastion','flicker']},varkesh:{armor:['ablative','reactive'],weapon:['heavyc']},ostrova:{power:['surge','steady'],weapon:['rapid']}},DOC_P=[0,.3,.5,.7];
function docFit(e,tuned){const D=WING_DOC[e.side];if(!D||!['patrol','raider','escort','strike','screen'].includes(e.role)||Math.random()>=(DOC_P[e.tier]||.3))return;
  const sl=pick(Object.keys(D)),id=pick(D[sl]);if(!VARIANTS[id])return;e.vr={[sl]:id};const U={vr:e.vr};if(tuned)for(const x of SLOTS)U[x.id]=1;
  const h=e.hull/e.st.hull,sh=e.st.sCap?e.shield/e.st.sCap:1;e.st=shipStats(e.side,e.cls,e.tier,U);e.hull=e.st.hull*h;e.shield=e.st.sCap*sh}
// ---- specialist stocking: a faction holding the line against the Bloom stocks anti-Brood parts; one whose convoys the
// Unbound have hit in the last half hour (or any faction after the first half hour) stocks anti-jam parts. Built from its
// own plate and wire, so nothing is created; they sell on its market like any other part.
const STOCK_SPEC={cap:2};
function specStock(f,st,need){if(need||(st.plate||0)<60||(st.wire||0)<40)return;
  const front=Object.keys(S.stations).some(sid=>contFront(f,sid)),raided=S.T>1800||((S.raidT||{})[f]||-1e9)>S.T-1800;
  for(const id in VARIANTS){const V=VARIANTS[id];if(!V.spec)continue;if(V.spec==='brood'?front:V.spec==='jam'?raided:false)craftAbstract(st,'v_'+id,1,STOCK_SPEC.cap)}}
// ---- AI Unbound, and Brood Grazers in or next to Bloom space, turn toward fresh ore clouds (within 5 km) and scoop them.
// What they take goes into their hold, and home with them if they leave, or into the wreck if they're shot down.
const CLOUD_AI={r:5000,rate:4};
function cloudSeek(e,dt){const s=S.sectors[W.sid],ai=e.ai;if(!s.clouds||!s.clouds.length){ai.cl=null;return false}
  if(e.side==='brood'&&!broodHeld(W.sid)&&!NEIGH[W.sid].some(n=>broodHeld(n)))return false;
  const room=(e.st.cargo||0)-invMass(e.cargo);if(room<1){if(ai.cl){ai.cl=null;e.role='leave'}return false}
  let c=ai.cl&&s.clouds.find(x=>x.id===ai.cl);if(!c||oreTotal(c)<=0){c=null;let bd=CLOUD_AI.r;for(const x of s.clouds){if(oreTotal(x)<=0||x.until-S.T<10)continue;const d=d3(x,e);if(d<bd){bd=d;c=x}}
    if(!c){ai.cl=null;return false}ai.cl=c.id;if(e.side==='pirate'&&W.player&&!S.player.docked&&d3(W.player,c)<1500&&!(c.warned)){c.warned=1;feed('⚠ Unbound raiders are turning toward the ore cloud. They will scoop it, and you.','warn')}}
  const d=steer(e,c.x,c.y,c.z,dt,true,1);faceTo(e,c,dt);e.thrusting=d>c.r*.6;
  if(d<c.r){e.mining=c;ai.sc=(ai.sc||0)+CLOUD_AI.rate*dt;while(ai.sc>=1){const k=mainOre(c);if(!k||mass(k)>(e.st.cargo||0)-invMass(e.cargo))break;ai.sc-=1;inv.take(c.ore,k,1);inv.add(e.cargo,k,1)}
    if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);ai.cl=null}}
  return true}
"""
rep("function tunedK(e,kind){",JS+"function tunedK(e,kind){")
# doctrines on spawn (after Aurora tuning is applied)
rep("if(tuned){e.tuned=1;e.st=shipStats(side==='pirate'?null:side,cls,tier,1);e.hull=e.st.hull;e.shield=e.st.sCap}",
    "if(tuned){e.tuned=1;e.st=shipStats(side==='pirate'?null:side,cls,tier,1);e.hull=e.st.hull;e.shield=e.st.sCap}docFit(e,tuned);")
# the target panel: a doctrine variant, or a Grazer's belly
rep("${T.tuned?' · <span style=\"color:#6ff2cf\">Aurora-tuned ✦</span>':''}</div>",
    "${T.tuned?' · <span style=\"color:#6ff2cf\">Aurora-tuned ✦</span>':''}</div>${T.vr?`<div class=\"ts\" style=\"color:#9fe0c8\">Fitted: ${Object.values(T.vr).map(id=>esc(VARIANTS[id].name)+' ('+esc(VARIANTS[id].cost)+')').join(', ')}</div>`:''}${T.side==='brood'&&T.role==='miner'&&invMass(T.cargo||{})>0?`<div class=\"ts\" style=\"color:#9be35a\">Belly: ${fmt(invMass(T.cargo))} t of ore. It spills when the Grazer dies.</div>`:''}")
# stocking, in each faction's industry tick
rep("craftAbstract(st,'missile',2,need||war?8:40);","if(f!=='brood')specStock(f,st,need);craftAbstract(st,'missile',2,need||war?8:40);")
# Unbound raids on a faction's convoys and haulers are remembered
rep("if(e.role==='trader'&&e.home.startsWith('trader:'))traderLost(e);",
    "if((e.role==='trader'||e.role==='hauler')&&src==='pirate'&&FAC_IDS.includes(e.side)){S.raidT=S.raidT||{};S.raidT[e.side]=S.T}if(e.role==='trader'&&e.home.startsWith('trader:'))traderLost(e);")
# specialists need no Mk level
rep("if((P.tiers[sl]||1)<2){dockErr=`Variants open at Mk II. Upgrade the ${SLOT[sl].name} first.`;return}",
    "if(!V.spec&&(P.tiers[sl]||1)<2){dockErr=`General variants open at Mk II. Upgrade the ${SLOT[sl].name} first (specialists fit at any Mk).`;return}")
rep("{const vl=VAR_BY_SLOT[sl.id]||[],vr=(P.tune&&P.tune.vr)||{},fv=vr[sl.id];if(vl.length)vrow=t<2?`<div class=\"note\" style=\"margin:4px 0 0\">Variants open at Mk II.</div>`:`<div class=\"act\" style=\"margin-top:4px;flex-wrap:wrap\">${vl.map(",
    "{const vl0=VAR_BY_SLOT[sl.id]||[],vl=t<2?vl0.filter(id=>VARIANTS[id].spec):vl0,vr=(P.tune&&P.tune.vr)||{},fv=vr[sl.id];if(vl0.length)vrow=t<2&&!vl.length?`<div class=\"note\" style=\"margin:4px 0 0\">Variants open at Mk II.</div>`:`<div class=\"act\" style=\"margin-top:4px;flex-wrap:wrap\">${t<2?'<span class=\"note\" style=\"margin:0 6px 0 0\">General variants open at Mk II; specialists fit now:</span>':''}${vl.map(")
# cloud seeking: Unbound pirates and Brood Grazers with nothing to shoot
rep("  if(combat&&ai.tgt){fight(e,ai.tgt,dt);return}\n  const OE=W.outpostEnt,SE=W.stationEnt;",
    "  if(combat&&ai.tgt){fight(e,ai.tgt,dt);return}\n  if((e.role==='pirate'||(e.role==='miner'&&e.side==='brood'))&&!ai.tgt&&cloudSeek(e,dt))return;\n  const OE=W.outpostEnt,SE=W.stationEnt;")
open(P,'w',encoding='utf-8').write(s);print('doctrine, stocking and cloud AI applied')
