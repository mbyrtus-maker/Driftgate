# Patch: Unbound pay. A pirate bot (false colours, harpoons, jam mode, 30 game minutes, 2 seeds a hull) made 2-6 takes and watched
# 6-22 targets escape through a gate before their shields were down and they were jammed, netting 0-1.6k an hour against a target
# between mining and hauling. Two changes: a ship with a Jam bar or a harpoon tether on it can't use a gate (NPCs and pilots alike:
# the gate field won't charge), and the Fence pays a premium for stolen goods, 2.5x the going market price (more with the Den).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
STOLEN_K=2.5
rep("function jamDark(e){return!!e&&(e.jamOff||0)>W.t}",
    "function jamDark(e){return!!e&&(e.jamOff||0)>W.t}\n// a Jam bar or a harpoon tether keeps a ship out of the gate field\nfunction gateLocked(e){return!!e&&(e.jam>0||jamDark(e)||!!(e.teth&&e.teth.until>W.t))}")
rep("  const J=e.gj;J.t+=dt;const tx=g.x-d.x*60,","  const J=e.gj;if(gateLocked(e))J.t=0;else J.t+=dt;const tx=g.x-d.x*60,")
rep("  if(!W.gc||W.gc.g!==g){W.gc={g,t:0,last:6}}\n  const C=W.gc;C.t+=dt;",
    "  if(gateLocked(p)){if(W.gc){W.gc=null}if(W.t-(W.gateLockMsg||0)>3){W.gateLockMsg=W.t;flash('Jammed or tethered: the gate field won\\u2019t take you until the bar drains or the line breaks.',true)}return}\n  if(!W.gc||W.gc.g!==g){W.gc={g,t:0,last:6}}\n  const C=W.gc;C.t+=dt;")
# the Fence: stolen units first, at the premium; the rest at its usual share
rep("function fencePr(k){return Math.max(1,Math.floor(fenceRef(k)*unbFenceRate()))}",
    f"function fencePr(k){{return Math.max(1,Math.floor(fenceRef(k)*unbFenceRate()))}}\nconst STOLEN_K={STOLEN_K};function fencePrS(k){{return Math.max(1,Math.floor(fenceRef(k)*STOLEN_K*unbFenceRate()/.7))}}")
rep("const pr=fencePr(k);const can=Math.min(n,Math.floor((S.econ.treasury.pirate||0)/pr));if(can<=0)continue;\n    inv.take(P.cargo,k,can);inv.add(S.econ.stock.pirate,k,can);if(P.stolen[k]){P.stolen[k]=Math.max(0,P.stolen[k]-can);if(!P.stolen[k])delete P.stolen[k]}got+=transfer('pirate','player',pr*can);t+=can*mass(k)}",
    "const nS=Math.min(n,P.stolen[k]||0);for(const[m,pr]of[[nS,fencePrS(k)],[n-nS,fencePr(k)]]){if(!(m>0))continue;const can=Math.min(m,Math.floor((S.econ.treasury.pirate||0)/pr));if(can<=0)continue;\n    inv.take(P.cargo,k,can);inv.add(S.econ.stock.pirate,k,can);if(P.stolen[k]){P.stolen[k]=Math.max(0,P.stolen[k]-Math.min(can,nS));if(!P.stolen[k])delete P.stolen[k]}got+=transfer('pirate','player',pr*can);t+=can*mass(k)}}")
rep("st=(P.stolen||{})[k]||0,pr=fencePr(k);","st=(P.stolen||{})[k]||0,pr=st?fencePrS(k):fencePr(k);")
rep("The Fence's Den buys anything at ${Math.round(unbFenceRate()*100)}% of market value, no questions asked:",
    "The Fence's Den buys anything at ${Math.round(unbFenceRate()*100)}% of market value, and stolen goods (☠) at ${Math.round(STOLEN_K*unbFenceRate()/.7*100)}%, no questions asked:")
open(P,'w',encoding='utf-8').write(s);print('Unbound pay applied')
# second pass: at 2.5x a bot pilot made 4-10k an hour, still under the band, and each pilot drained the Unbound treasury by about
# 18k an hour. The premium goes to 4x, and the haven now sells its surplus loot on to the Freeports at 90% of their market price,
# every kind of goods and up to 20 of each a tick (it sold only raw ore, 8 at a time, at 80% of base value), keeping what the slip needs.
s=open(P,encoding='utf-8').read()
rep("const STOLEN_K=2.5;","const STOLEN_K=4;")
rep("function pirFence(want){const st=S.econ.stock.pirate,N=S.econ.stock.neutral;if(!st||!N)return;\n  for(const[k,keep]of[['xc',40],['ir',140],['fe',260],['nu',Math.max(30,(want.nu||0)+20)],['cu',Math.max(80,(want.cu||0)+40)]]){const n=Math.min(8,(st[k]||0)-keep);if(n<=0)continue;const pr=Math.floor(baseValue(k)*.8),pay=transfer('neutral','pirate',pr*n);const m=Math.floor(pay/pr);if(m>0){inv.take(st,k,m);inv.add(N,k,m)}}",
    "function pirFence(want){const st=S.econ.stock.pirate,N=S.econ.stock.neutral;if(!st||!N)return;const KEEP={xc:40,ir:140,fe:260,nu:Math.max(30,(want.nu||0)+20),cu:Math.max(80,(want.cu||0)+40),keel:99,frame:99,lattice:99,core:99};\n  for(const k of Object.keys(st)){if(MUNITIONS.has(k)||!ITEMS[k])continue;const keep=Math.max(KEEP[k]!=null?KEEP[k]:10,(want[k]||0)+5),n=Math.min(20,(st[k]||0)-keep);if(n<=0)continue;const pr=Math.max(1,Math.floor(price(N,k)*.9)),pay=transfer('neutral','pirate',pr*n);const m=Math.floor(pay/pr);if(m>0){inv.take(st,k,m);inv.add(N,k,m)}}")
open(P,'w',encoding='utf-8').write(s);print('Unbound pay pass 2 applied')
# at 4x, six runs (Raider, Corsair, Plunderer, 2 seeds): 12.8k, 9.7k, 11.2k, 14.0k and 38.8k an hour (one Raider run died with its
# hold every time and fenced nothing), about 17k on average, inside the band; the treasury ended above its start in all but one run.
