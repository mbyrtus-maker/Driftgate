# Fix: autopilot read the position of a target whose ref had gone (a station target with no station entity in the system)
# and threw every frame. It now drops a target with no ref and switches off.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a="function autopilot(p,dt){const T=apTarget();if(!T){apOn=false;return false}W.tgt=T;const R=T.ref;"
assert s.count(a)==1
s=s.replace(a,"function autopilot(p,dt){const T=apTarget();if(!T||!T.ref){apOn=false;if(T&&!T.ref)W.tgt=null;return false}W.tgt=T;const R=T.ref;")
open(P,'w',encoding='utf-8').write(s);print('autopilot guard applied')
