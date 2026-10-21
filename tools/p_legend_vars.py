# Patch: Legend perks 5 and 6 start a system at Mk II with a free variant of the pilot's choice fitted.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:120]);s=s.replace(a,b)
rep("'Head start: one system of your choice starts every galaxy at Mk II.'","'Head start: one system of your choice starts every galaxy at Mk II, with a variant of your choice fitted free.'")
rep("'Second head start: a second system starts at Mk II.'","'Second head start: a second system starts at Mk II, with a second free variant.'")
rep("return{lvl,mk2:r.mk2||[],keep:","return{lvl,mk2:r.mk2||[],fv:r.fv||[],keep:")
rep("if(lvl>=5)P.tiers[picks[0]]=Math.max(2,P.tiers[picks[0]]||1);if(lvl>=6)P.tiers[picks[1]]=Math.max(2,P.tiers[picks[1]]||1);",
    "if(lvl>=5)P.tiers[picks[0]]=Math.max(2,P.tiers[picks[0]]||1);if(lvl>=6)P.tiers[picks[1]]=Math.max(2,P.tiers[picks[1]]||1);"
    "for(let i=0;i<2;i++){const id=(pk.fv||[])[i],V=id&&VARIANTS[id];if(lvl>=5+i&&V&&V.slot===picks[i]){P.tune=P.tune||{};P.tune.vr=P.tune.vr||{};P.tune.vr[V.slot]=id}}")
rep("if(lvl>=5){const so=SLOTS.map(s=>[s.id,s.name]);st+=`<label>Mk II system ${sel('mk0',so,(R.mk2||[])[0]||'shield')}</label>`;if(lvl>=6)st+=`<label>Second Mk II system ${sel('mk1',so,(R.mk2||[])[1]||'weapon')}</label>`}",
    "if(lvl>=5){const so=SLOTS.map(s=>[s.id,s.name]),vo=i=>{const sl=(R.mk2||[])[i]||(i?'weapon':'shield');return[['','No variant'],...(VAR_BY_SLOT[sl]||[]).map(id=>[id,VARIANTS[id].name])]};"
    "st+=`<label>Mk II system ${sel('mk0',so,(R.mk2||[])[0]||'shield')}</label><label>Free variant ${sel('fv0',vo(0),(R.fv||[])[0]||'')}</label>`;"
    "if(lvl>=6)st+=`<label>Second Mk II system ${sel('mk1',so,(R.mk2||[])[1]||'weapon')}</label><label>Second free variant ${sel('fv1',vo(1),(R.fv||[])[1]||'')}</label>`}")
rep("else if(k==='mk0'||k==='mk1'){r.mk2=r.mk2||[];r.mk2[k==='mk0'?0:1]=v}",
    "else if(k==='mk0'||k==='mk1'){const i=k==='mk0'?0:1;r.mk2=r.mk2||[];r.mk2[i]=v;r.fv=r.fv||[];const V=VARIANTS[r.fv[i]];if(V&&V.slot!==v)r.fv[i]=''}"
    "else if(k==='fv0'||k==='fv1'){r.fv=r.fv||[];r.fv[k==='fv0'?0:1]=VARIANTS[v]?v:''}")
open(P,'w',encoding='utf-8').write(s);print('legend perk patch applied')
