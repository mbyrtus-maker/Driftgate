# Patch: variant balance from the mirror-duel sweep (9 hulls x 40 configs, outliers rerun at 200 duels).
# Ablative won 70-76% on heavy hulls (its speed cost barely matters to a slow ship), so it now costs turn as well and gives +25% hull.
# Bastion won 68-71% on the Heavy Fighter: +25% capacity. Long barrel lost 29-47% everywhere: shells fly 15% faster and the fire-rate
# cost halves. Light frame lost 34-51%: -10% hull for +15% turn and acceleration. Snap-back cost 29-45% in ordinary fights: -12% shields.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

rep("bastion:{slot:'shield',name:'Bastion',gain:'+30% shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',m:{sCap:1.3},",
    "bastion:{slot:'shield',name:'Bastion',gain:'+25% shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',m:{sCap:1.25},")
rep("longbar:{slot:'weapon',name:'Long barrel',gain:'+30% range',cost:'−10% fire rate',m:{rof:.9},f:{shotTtl:1.3}},",
    "longbar:{slot:'weapon',name:'Long barrel',gain:'+30% range, shells fly 15% faster',cost:'−5% fire rate',m:{rof:.95},f:{shotTtl:1.3,shotSpd:1322.5}},")
rep("ablative:{slot:'armor',name:'Ablative plating',gain:'+40% hull',cost:'−10% speed and acceleration',m:{hull:1.4,maxSpd:.9,thrust:.9}},",
    "ablative:{slot:'armor',name:'Ablative plating',gain:'+25% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.25,maxSpd:.9,thrust:.9,turn:.9}},")
rep("lightframe:{slot:'armor',name:'Light frame',gain:'+10% turn and acceleration',cost:'−15% hull',m:{hull:.85,turn:1.1,thrust:1.1}},",
    "lightframe:{slot:'armor',name:'Light frame',gain:'+15% turn and acceleration',cost:'−10% hull',m:{hull:.9,turn:1.15,thrust:1.15}},")
rep("cost:'−20% shield capacity',m:{sCap:.8},f:{snapBack:1}","cost:'−12% shield capacity',m:{sCap:.88},f:{snapBack:1}")
open(P,'w',encoding='utf-8').write(s);print('variant balance applied')
# second pass: Ablative still won 64-71% on Bomber and Gunboat at +25%, so +20%. (Tuned emitters are left alone: the duels are fought
# with kinetic guns only, so they measure the kinetic emitter's gain and the laser emitter's cost and nothing else.)
s=open(P,encoding='utf-8').read()
rep("gain:'+25% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.25,","gain:'+20% hull',cost:'−10% speed, acceleration and turn',m:{hull:1.2,")
open(P,'w',encoding='utf-8').write(s);print('variant balance pass 2 applied')
