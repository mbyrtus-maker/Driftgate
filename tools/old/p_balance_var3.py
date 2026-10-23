# Patch: variant balance, third pass (after p_balance_var.py, p_blast_sections.py and p_mkcurve.py).
import sys
P=sys.argv[1]
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
# third pass, on the flatter Mk curve and a duel test with the game's real laser/kinetic mix (9 hulls, 120 duels a config).
# Too weak everywhere: Surge core 36-49% (recharge stopped dead while firing), Haze-tuned 38-46%, Cautery 35-48%, Incendiary 34-55%,
# Snap-back 39-47%, Jammer emitters 34-43%. Too strong on heavy hulls: Heavy cannons 49-65%, Ablative 52-68%, Bastion 43-64%.
s=open(P,encoding='utf-8').read()
rep("surge:{slot:'power',name:'Surge core',gain:'+50% energy capacity',cost:'Recharge pauses for half a second after firing or boosting',m:{eCap:1.5},f:{surge:.5}",
    "surge:{slot:'power',name:'Surge core',gain:'+50% energy capacity',cost:'Recharge runs at half speed for a second after firing or boosting',m:{eCap:1.5},f:{surge:1,surgeK:.5}")
rep("(e.st.surge&&W.t-(e.lastFire||-9)<e.st.surge?0:1)","(e.st.surge&&W.t-(e.lastFire||-9)<e.st.surge?(e.st.surgeK||0):1)")
rep("gain:'+25% shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',m:{sCap:1.25},","gain:'+20% shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',m:{sCap:1.2},")
rep("heavyc:{slot:'weapon',name:'Heavy cannons',gain:'+40% damage per shot',cost:'−30% fire rate, 15% slower shells',m:{dmg:1.4,rof:.7}",
    "heavyc:{slot:'weapon',name:'Heavy cannons',gain:'+35% damage per shot',cost:'−30% fire rate, 15% slower shells',m:{dmg:1.35,rof:.7}")
rep("gain:'+20% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.2,","gain:'+15% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.15,")
rep("cost:'−12% shield capacity',m:{sCap:.88},f:{snapBack:1}","cost:'−8% shield capacity',m:{sCap:.92},f:{snapBack:1}")
rep("cost:'Lasers −20% against other ships',f:{cautery:1}","cost:'Lasers −12% against other ships',f:{cautery:1}")
rep("R.hit.ref.role==='builder'?1.4:.8)","R.hit.ref.role==='builder'?1.4:.88)")
rep("cost:'Missiles −25% against other ships',f:{incend:1}","cost:'Missiles −15% against other ships',f:{incend:1}")
rep("(m.incend?(e.side==='brood'&&e.role==='builder'?1.5:.75):1)","(m.incend?(e.side==='brood'&&e.role==='builder'?1.5:.85):1)")
rep("cost:'−10% shields everywhere',m:{sCap:.9},f:{hazeImm:1}","cost:'−6% shields everywhere',m:{sCap:.94},f:{hazeImm:1}")
rep("cost:'−15% damage in normal fire',m:{dmg:.85},f:{jamK:1.45}","cost:'−10% damage in normal fire',m:{dmg:.9},f:{jamK:1.45}")
open(P,'w',encoding='utf-8').write(s);print('variant balance pass 3 applied')
# fourth pass: Ablative and Bastion still ran high on the heavy hulls (Heavy Bomber 61%, Plunderer Bastion 64-66%, the Ablative/
# Bastion/Steady build 64-71% on Heavy Fighter, Heavy Bomber and Plunderer). A percentage bonus is worth most on the biggest hulls,
# so both now add a flat amount: +35 hull and +35 shield capacity (about +20% on a Light Fighter, +10% on a Heavy Bomber).
s=open(P,encoding='utf-8').read()
rep("gain:'+15% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.15,maxSpd:.9,thrust:.9,turn:.9}}",
    "gain:'+35 hull',cost:'−10% speed, acceleration and turn',m:{maxSpd:.9,thrust:.9,turn:.9},a:{hull:35}}")
rep("gain:'+20% shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',m:{sCap:1.2},f:{shDelay:5}",
    "gain:'+35 shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',a:{sCap:35},f:{shDelay:5}")
open(P,'w',encoding='utf-8').write(s);print('variant balance pass 4 applied')
