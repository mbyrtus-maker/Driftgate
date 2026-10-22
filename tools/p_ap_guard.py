# Fix: autopilot read the position of a target whose ref had gone (a station target with no station entity in the system)
# and threw every frame. It now drops a target with no ref and switches off.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
a="function autopilot(p,dt){const T=apTarget();if(!T){apOn=false;return false}W.tgt=T;const R=T.ref;"
assert s.count(a)==1
s=s.replace(a,"function autopilot(p,dt){const T=apTarget();if(!T||!T.ref){apOn=false;if(T&&!T.ref)W.tgt=null;return false}W.tgt=T;const R=T.ref;")
# and the docking path asked for the ports of a station that had gone mid-approach
a="function portName(E){return E.type==='station'"
assert s.count(a)==1
s=s.replace(a,"function portName(E){if(!E)return null;return E.type==='station'")
# and undocking from a station or outpost that had gone while docked threw on its position: launch from where the ship sits
a="else{const o=rdir(.8);p.x=E.x+o.x*(E.r+90);p.y=E.y+o.y*(E.r+90);p.z=E.z+o.z*(E.r+90);"
assert s.count(a)==1
s=s.replace(a,"else{const o=rdir(.8),B0=E||p,rr=(E&&E.r||0)+90;p.x=B0.x+o.x*rr;p.y=B0.y+o.y*rr;p.z=B0.z+o.z*rr;")
open(P,'w',encoding='utf-8').write(s);print('autopilot guard applied')
