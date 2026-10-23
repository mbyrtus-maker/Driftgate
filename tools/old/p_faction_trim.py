# Patch: faction war. After the second balance pass, 240 simulated galaxies came out Varkesh 31.2%, Halcyon 28.3%, Ostrova 25.8%,
# Brood 14.6%. Varkesh comes down about 3 points through its station mining rate (BAL.ext 1.24 -> 1.20; 1.12 had cut it to 21%).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a="ext:{halcyon:.7,varkesh:1.24,ostrova:1.22}"
assert s.count(a)==1
s=s.replace(a,"ext:{halcyon:.7,varkesh:1.2,ostrova:1.22}")
open(P,'w',encoding='utf-8').write(s);print('faction trim applied')
