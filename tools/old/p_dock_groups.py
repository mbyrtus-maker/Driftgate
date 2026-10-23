# Fix: at faction stations the dock's first menu group read "Scrapheart". The Unbound haven group and the Construction group both
# list the 'works' tab, so any station with Station works showed the haven group too. The haven group now appears only at the haven,
# and there 'works' sits under it rather than under Construction.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a="const G=DOCK_GROUPS.map(([g,n,ks])=>[g,n,tabs.filter(t=>ks.includes(t[0]))]).filter(x=>x[2].length)"
assert s.count(a)==1
s=s.replace(a,"const G=DOCK_GROUPS.filter(([g])=>g!=='haven'||c.haven).map(([g,n,ks])=>[g,n,tabs.filter(t=>ks.includes(t[0])&&!(g==='build'&&c.haven&&t[0]==='works'))]).filter(x=>x[2].length)")
open(P,'w',encoding='utf-8').write(s);print('dock groups fixed')
