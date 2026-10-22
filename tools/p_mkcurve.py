# Patch: a flatter Mk curve, the same on every hull. Target, same hull and pilot: Mk I beats Mk II 40% of the time and Mk III 35%.
# Longer fights turn a stat edge into a win more reliably, so heavy hulls get a smaller combat step per Mk than light ones
# (MK_HULL). Engines, holds, blast rigs and payload reloads keep their full steps.
# usage: python3 p_mkcurve.py index.html '{"lv2":.2,"lv3":.3,"hull":{"interceptor":1,...}}'
import sys,json
DEF={"lv2":0.178,"lv3":0.36,"tcmb":0.04,"hull":{"interceptor":0.90,"striker":0.76,"heavy":[0.80,0.58],"bomber":0.93,"gunboat":0.87,"wraith":0.52,"raider":0.72,"corsair":0.91,"plunderer":0.48}}
# measured at 500 duels a row (Mk II / Mk III / tuned Mk III against Mk I; targets 60 / 65 / 70): Light Fighter 58/68/72, Medium 59/66/70,
# Heavy Fighter 61/64/71, Bomber 59/64/73, Heavy Bomber 57/68/72, Wraith 61/64/69, Raider 62/61/68, Corsair 58/66/71, Plunderer 61/64/70
P=sys.argv[1];A=json.loads(sys.argv[2]) if len(sys.argv)>2 else DEF;s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
l2,l3=A['lv2'],A['lv3'];H=json.dumps(A['hull'],separators=(',',':')).replace('"','')
rep("// upgrade is an edge, not a wall. Same pilot skill, same hull: Mk I beats Mk II about 37% of the time, Mk III 32%, Mk IV 27%,\n// Mk V 22%. Engines, holds, mining lasers and payload reloads keep their full steps.\nlet MK_LV=[0,0,.45,.85,.85,.85],MK_K=1;",
    f"// upgrade is an edge, not a wall. Same pilot skill, same hull: Mk I beats Mk II about 40% of the time and Mk III about 35%, on\n// every hull: MK_HULL gives heavy hulls (longer fights) a smaller step. Engines, holds, blast rigs and payload reloads keep their full steps.\nlet MK_LV=[0,0,{l2},{l3},{l3},{l3}],MK_K=1;const MK_HULL={H};")
rep("c=s=>mkL(t(s))*(C.mkK||1);","c=s=>mkL(t(s))*mkH(cls,t(s));")
# a hull's step: one factor, or [Mk II, Mk III] when its Mk III step has to differ
rep("function shipStatsBase(fac,cls,T){","function mkH(cls,t){const v=MK_HULL[cls];if(v==null)return(CLASSES[cls]&&CLASSES[cls].mkK)||1;return Array.isArray(v)?v[t>=3?1:0]:v}\nfunction shipStatsBase(fac,cls,T){")
# Aurora tuning's combat step: a fully tuned Mk III should beat Mk I about 70% of the time
tc=A.get('tcmb',.03)
if tc!=.03:
    rep("const TUNE_CMB=.03;",f"const TUNE_CMB={tc};")
    rep("or +3% to shields, guns, armour and power (one Aurora Tuning each)",f"or +{round(tc*100)}% to shields, guns, armour and power (one Aurora Tuning each)")
rep("Aurora-tuned ${'✦'.repeat(l+1)} (+${Math.round(TUNE_STEP*100*(l+1))}%).","Aurora-tuned ${'✦'.repeat(l+1)} (+${Math.round((['power','shield','weapon','armor'].includes(arg)?TUNE_CMB:TUNE_STEP)*100*(l+1))}%).")
open(P,'w',encoding='utf-8').write(s);print('mk curve',l2,l3,H,'tune',tc)
