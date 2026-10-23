# Patch: a full hold takes several charges. Each charge now blows off at most one chunk of its fault-point section, sized by the
# hull's launcher (Light Miner 7 units, Medium 9, Heavy 14), so a perfect hold takes about 4-5, 5-6 and 6 charges, a near-point one
# about twice as many and an off-point one about four times. Magazines grow to 5, 6 and 7 charges (a Blast Rig Mk level still adds
# one). Replaces the reload-only fix in p_blast_pay.py, where one magazine filled the hold and placement barely mattered.
# usage: python3 p_blast_sections.py index.html [reloadLight reloadMedium reloadHeavy]
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
a,b,c=(sys.argv[2:5] if len(sys.argv)>4 else ('90','100','110'))
rep("const BL_HULL={skiff:{n:2,reload:110,coll:6,cd:1},prospector:{n:3,reload:115,coll:9,cd:.5},dredger:{n:4,reload:150,coll:12,cd:.34}};",
    f"const BL_HULL={{skiff:{{n:5,reload:{a},coll:6,cd:1,k:7}},prospector:{{n:6,reload:{b},coll:9,cd:.5,k:9}},dredger:{{n:7,reload:{c},coll:12,cd:.34,k:14}}}};")
rep("// and detonate (3) or cancel (4), then hold F by the ore cloud to collect it. Each charge releases one fault-point section of the\n// rock: 90% of it on point, 50% near, 25% off. Charges come from a magazine with a long reload, so placement, not time on the rock,\n// sets a miner's pay.",
    "// and detonate (3) or cancel (4), then hold F by the ore cloud to collect it. Each charge blows off one chunk of its fault-point\n// section (up to the launcher's size: 7, 9 or 14 units) and releases 90% of it on point, 50% near, 25% off, so a full hold takes\n// several charges and placement, not time on the rock, sets a miner's pay.")
# the crack: each section hit gives up at most one chunk (k units) rather than the whole section
rep("const nc=Object.keys(secQ).length,f=Object.values(secQ).reduce((a,b)=>a+b,0)/nc*Math.max(0,1-.1*extra),rel={};\n      for(const k of Object.keys(T.ore)){const cK=Math.min(T.ore[k],Math.round(T.ore[k]*nc/n)),",
    "const nc=Object.keys(secQ).length,f=Object.values(secQ).reduce((a,b)=>a+b,0)/nc*Math.max(0,1-.1*extra),rel={},hk=blHull(P.cls),tot0=oreTotal(T),fr=Math.min(nc/n,hk&&hk.k?hk.k*nc/Math.max(1,tot0):1);\n      for(const k of Object.keys(T.ore)){const cK=Math.min(T.ore[k],Math.round(T.ore[k]*fr)),")
rep("Charges on point release the most; your magazine reloads slowly, so placement sets your pay.",
    "Each charge blows off one chunk of the rock, so a full hold takes several charges. Charges on point release the most, so placement sets your pay.")
open(P,'w',encoding='utf-8').write(s);print('blast sections',a,b,c)
