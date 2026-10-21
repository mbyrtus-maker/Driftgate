# Patch: Aurorite tuning is once per component (one level, +6%), not twice. Saves with a second level keep one and get the
# extra Aurora Tuning items back in the vault (the ledger already counts tuning inside a component, so nothing moves).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
rep("const TUNE_MAX=2,TUNE_STEP=.06,","const TUNE_MAX=1,TUNE_STEP=.06,")
rep("// Aurorite tuning: +6% a level to engines, holds and lasers, but only TUNE_CMB to shields, guns, armour and power, so two\n// levels are worth about a Mk in a fight",
    "// Aurorite tuning: once per component, +6% to engines, holds and blast rigs, but only TUNE_CMB to shields, guns, armour and power")
rep("each tuning level takes 2 s off every reload (up to 4 s).","Aurora tuning takes 2 s off every reload.")
rep("each Aurora tuning level takes 2 s more off","Aurora tuning takes 2 s more off")
rep("{const o=migrate;migrate=function(){const r=o.apply(this,arguments);try{pirSetup()}catch(e){}return r}}",
    "{const o=migrate;migrate=function(){const r=o.apply(this,arguments);try{pirSetup()}catch(e){}try{tuneCapMigrate()}catch(e){}return r}}\n"
    "function tuneCapMigrate(){if(!S)return;let n=0;const L=[S.player,...Object.values(S.pilots||{})].filter((P,i,a)=>P&&a.indexOf(P)===i);for(const P of L){for(const R of[P,...(P.ships||[])]){const T=R.tune;if(!T||typeof T!=='object')continue;for(const sl of SLOTS){const l=T[sl.id]||0;if(l>TUNE_MAX){inv.add(P.vault=P.vault||{},'tune',tuneItems(l)-tuneItems(TUNE_MAX));T[sl.id]=TUNE_MAX;n++}}}}\n"
    "  if(n&&S.player)feed(`Aurora tuning is now once per component: ${n} component${n>1?'s keep':' keeps'} one level and the spare Aurora Tuning went into your vault.`,'info')}")
rep('attune any component in the Shipyard: each level adds +6% to engines, holds and mining lasers, or +3% to shields, guns, armour and power (two levels max, 1 then 2 tunings). Fully tuned, a ship wins about 60% of fights against the same ship untuned.','attune each component once in the Upgrades tab: +6% to engines, holds and blast rigs, or +3% to shields, guns, armour and power (one Aurora Tuning each). Fully tuned, a ship wins about TUNEWIN% of fights against the same ship untuned.')
open(P,'w',encoding='utf-8').write(s);print('tuning cap applied')
