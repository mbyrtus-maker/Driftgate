# Patch: the galaxy map no longer shows the Conservation ledger table (a developer check, not player information). The ledger itself
# still runs and the balance tests still read it.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a=s.index("  const L=ledger(),tm=RAWS.reduce((a,e)=>a+L.tot[e],0),t0=RAWS.reduce((a,e)=>a+(S.ledger0.tot[e]||0),0);\n  h+=`<div><div class=\"h3\">Conservation ledger</div>")
end="(Δ ${L.credits-S.ledger0.credits})</b></div></div>`;\n"
b=s.index(end,a)+len(end)
assert s.count("Conservation ledger</div>")==1 and b-a<2000
s=s[:a]+s[b:]
open(P,'w',encoding='utf-8').write(s);print('map ledger removed')
