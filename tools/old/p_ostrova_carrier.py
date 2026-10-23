# Patch: Ostrova expanded furthest of the three powers (peak 6.7 systems) but faded by the two-hour deadline (3.1 systems, the fewest
# capital ships alive), winning 39% of hold victories but only 21% of deadline ties. Its carriers now spend 8% less time in the slip
# and need one wire and one coil fewer (CAR_K .92). At .8 (a fifth off) Ostrova won 35.8% of 240 galaxies, too strong; at .92 the
# 240 came out Ostrova 28.7%, Halcyon 28.7%, Varkesh 28.3%, Brood 14.2%.
# usage: python3 p_ostrova_carrier.py index.html [k=0.92]
import sys
P=sys.argv[1];K=sys.argv[2] if len(sys.argv)>2 else '.92';s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
rep("function capitalTick(){const T=S.T;S.frigates=S.frigates||[];",
    f"const CAR_K={{ostrova:{K}}};function carCostF(f){{const k=CAR_K[f]||1;if(k===1)return CARRIER_COST;const o={{}};for(const x in CARRIER_COST)o[x]=Math.max(1,Math.round(CARRIER_COST[x]*k));return o}}\nfunction capitalTick(){{const T=S.T;S.frigates=S.frigates||[];")
i=s.index("const war=S.ai[f]&&S.ai[f].war>T;{const busyE=");j=s.index("\n  for(const ev of S.events){if(ev.type!=='yardbuild'",i)
seg=s[i:j];n=seg.count("CARRIER_COST");assert n==5,n
seg=seg.replace("CARRIER_COST","carCostF(f)").replace("until:T+FRIGATE_TIME*(war?.7:1)","until:T+FRIGATE_TIME*(war?.7:1)*(CAR_K[f]||1)")
assert "*(CAR_K[f]||1)" in seg
s=s[:i]+seg+s[j:]
open(P,'w',encoding='utf-8').write(s);print('Ostrova carriers',K)
