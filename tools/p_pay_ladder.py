# Patch: the pay ladder, measured with live-game role bots (30 game minutes a run, 2 seeds, Mk I). Targets an hour: hauling 15.6k /
# 19.9k / 25.2k, Unbound between hauling and mining, mining 12k / 15.6k / 20k, combat about 5k-15k by skill, scouting 3.5k-7k.
# Scouting measured 13k-19k: a scout flipped 19-29 beacons in half an hour at about 330 cr a flip (bonus, mission, residual), so the
# flip bonus, beacon missions and residuals all drop to about 40%.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
rep("const BCN_MIS_N=3,BCN_MIS_PAY=240,BCN_MIS_T=900;","const BCN_MIS_N=3,BCN_MIS_PAY=80,BCN_MIS_T=900;")
rep("const BCN_R=250,BCN_T=10,BCN_FLIP=180,BCN_RES=12,","const BCN_R=250,BCN_T=10,BCN_FLIP=60,BCN_RES=4,")
rep("Flipping one pays you a one-off bonus of 180 cr from your faction's treasury, then 12 cr a minute while your side holds it,","Flipping one pays you a one-off bonus of 60 cr from your faction's treasury, then 4 cr a minute while your side holds it,")
rep("pays you a bonus plus 12 cr a minute for 10 minutes after you last flip or re-secure it.","pays you a bonus plus 4 cr a minute for 10 minutes after you last flip or re-secure it.")
# Hauling measured 5k-8k (target 15.6k-25.2k) and the Heavy Hauler earned least: pilot loads of more than a few dozen units moved
# the station's local price so far that the best trade was 4-35 units, whatever the hold. Fees drop to 3.5% / 2% / 1%, and a
# pilot's trades move the local price level less in the bigger haulers (freight contracts): 100%, 60%, 28% of a unit per unit.
rep("const HAUL_FEE={freighter:.055,bulker:.04};const mFee=cls=>HAUL_FEE[cls]!=null?HAUL_FEE[cls]:.06;",
    "const HAUL_FEE={courier:.035,freighter:.02,bulker:.01};const mFee=cls=>HAUL_FEE[cls]!=null?HAUL_FEE[cls]:.06;const HAUL_MK={freighter:.6,bulker:.28};const pMk=()=>HAUL_MK[S.player.cls]||1;")
rep("mkOf(R)[k]=(R.mk[k]||0)-got","mkOf(R)[k]=(R.mk[k]||0)-got*pMk()")
rep("mkOf(R)[k]=(R.mk[k]||0)+sold","mkOf(R)[k]=(R.mk[k]||0)+sold*pMk()")
rep("mkOf(R)[k.item]=(R.mk[k.item]||0)-got","mkOf(R)[k.item]=(R.mk[k.item]||0)-got*pMk()")
rep("R.mk[k]=m0+dir*n","R.mk[k]=m0+dir*n*pMk()")
rep("// itself, so the Heavy Hauler's edge is a thinner fee rather than more tonnage: trade runs come to about 15k an hour in a Light\n// Hauler, 20k in a Medium and 25k in a Heavy, Mk I.",
    "// itself; the bigger haulers pay a thinner fee and move the local price less per unit (HAUL_MK), so trade runs come to about\n// 15k an hour in a Light Hauler, 20k in a Medium and 25k in a Heavy, Mk I.")
# The Fence paid a share of an item's base value, which for ore is well under what any station pays (mining sells ore at 10-14 cr/t,
# the Fence paid 3-7), so an Unbound career made under 3k an hour. It now pays its share of the going market price: the average
# of the three faction markets.
rep("function unbFenceRate(){return[.7,.7,.8,.9][unbWork('den')]}",
    "function unbFenceRate(){return[.7,.7,.8,.9][unbWork('den')]}\nfunction fenceRef(k){let t=0,n=0;for(const f of FAC_IDS){const st=S.econ.stock[f];if(st){t+=price(st,k);n++}}return n?t/n:baseValue(k)}\nfunction fencePr(k){return Math.max(1,Math.floor(fenceRef(k)*unbFenceRate()))}")
rep("const pr=Math.max(1,Math.floor(baseValue(k)*unbFenceRate()));const can=","const pr=fencePr(k);const can=")
rep("st=(P.stolen||{})[k]||0,pr=Math.max(1,Math.floor(baseValue(k)*unbFenceRate()));","st=(P.stolen||{})[k]||0,pr=fencePr(k);")
# a docked pilot whose outpost has gone (destroyed or taken) no longer crashes the dock: the dock reads as a bare outpost
rep("  const o=S.outposts[P.docked],mine=o.owner==='player';","  const o=S.outposts[P.docked]||{name:'Lost outpost',owner:'neutral',type:'mine',stock:{}},mine=o.owner==='player';")
rep("sub:`${mine?'Your outpost':FACTIONS[o.owner].short+' outpost'} · ${TYPE_TEXT[o.type]}`","sub:`${mine?'Your outpost':(FACTIONS[o.owner]||{short:'Abandoned'}).short+' outpost'} · ${TYPE_TEXT[o.type]||''}`")
open(P,'w',encoding='utf-8').write(s);print('pay ladder applied')
