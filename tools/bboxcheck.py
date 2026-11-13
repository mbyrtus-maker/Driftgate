# Compares two box dumps from `DG_BBOX=out.json python3 build_models.py` (11 Nov 2026): a model whose box moved or changed
# size would draw at a different size or off its centre in the game (the pack normalises every model to its box), and its
# engine, turret and docking points would move with it. Usage: python3 tools/bboxcheck.py BEFORE.json AFTER.json [tolerance]
import sys,json
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]));tol=float(sys.argv[3]) if len(sys.argv)>3 else 1e-4;bad=0
for k in b:
    if k not in a:print('new model',k);continue
    d=max(abs(x-y) for i in (0,1) for x,y in zip(a[k][i],b[k][i]))
    if d>tol:bad+=1;print('%-16s box moved by %.4f  before %s %s  after %s %s'%(k,d,a[k][0],a[k][1],b[k][0],b[k][1]))
    elif a[k][2]!=b[k][2]:print('%-16s same box, triangles %d -> %d'%(k,a[k][2],b[k][2]))
for k in a:
    if k not in b:print('model gone',k)
print(bad,'boxes changed')
