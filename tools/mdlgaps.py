# A tighter look than mdlcheck.py for parts that hang off their model (14 Nov 2026, after the Cairn's canopy: it floated
# 0.015 clear of the hull, under mdlcheck's 0.02 report line and over its 0.012 "touching" line, so nothing was reported).
# Lists every group of parts that is not within EPS of the rest of its model, with the gap (model half-size = 1), where it
# is and how big. Most of what it lists is small or meant (see the notes in BEYOND_DESIGN.md); it is for looking, not a gate.
# Usage: python3 tools/mdlgaps.py [model ...] [min=0.008] [json=OUT.json]      (no names: every model in the pack)
import sys,json,base64,gzip,os,numpy as np
R=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,R);import mdlcheck as M
EPS=.003
if __name__=='__main__':
    names=[a for a in sys.argv[1:] if '=' not in a];opt=dict(a.split('=',1) for a in sys.argv[1:] if '=' in a);mn=float(opt.get('min',.008))
    idx=json.load(open(R+'/models_idx.json'));blob=gzip.decompress(base64.b64decode(open(R+'/models_gz.b64').read()));out={}
    for k in names or list(idx):
        T,r,sh=M.pack_model(k,idx,blob);L=M.comps(T);I=sorted([x for x in M.islands(T,L,eps=EPS) if x['gap']>=mn],key=lambda x:-x['gap'])
        if I:
            out[k]=[{'gap':x['gap'],'at':x['at'],'size':x['size'],'parts':len(x['parts'])} for x in I]
            print(k,idx[k].get('k',''),' ; '.join('gap %.3f at %s size %.2f (%d part%s)'%(x['gap'],x['at'],x['size'],len(x['parts']),'s'[:len(x['parts'])>1]) for x in I[:8]),flush=True)
    if 'json' in opt:json.dump(out,open(opt['json'],'w'))
    print(len(out),'of',len(names or idx),'models have a part at least',mn,'clear of the rest')
