# Hotfix: in Unbound mode the faction supply-contract timer ran scheduleContract() for a 'pirate' pilot, and FACTIONS.pirate is
# undefined, so every 40-70 s the simulation step threw (an error banner, and that frame's world update skipped). Unbound pilots
# get no faction supply contracts.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a="function scheduleContract(){\n  const f=S.player.faction;if(S.contracts.filter(c=>c.fac===f).length>=3)return;"
assert s.count(a)==1
s=s.replace(a,"function scheduleContract(){\n  const f=S.player.faction;if(S.unb||!FACTIONS[f])return;if(S.contracts.filter(c=>c.fac===f).length>=3)return;")
open(P,'w',encoding='utf-8').write(s);print('contract fix applied')
