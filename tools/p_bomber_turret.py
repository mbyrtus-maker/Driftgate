# Patch: the Bomber gets the Heavy Bomber's rear dorsal turret (AI-manned when empty, and a seat a wingmate can take).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:120]);s=s.replace(a,b)
rep("function gunboatsIn(){const out=W.ents.filter(e=>e.type==='ship'&&e.alive&&e.cls==='gunboat'&&!e.pup&&!(e.isPlayer&&(S.player.docked||W.dead)));if(W.player&&W.player.cls==='gunboat'&&",
    "const TUR_CLS=new Set(['gunboat','bomber']);function hasTur(c){return TUR_CLS.has(c)}\nfunction gunboatsIn(){const out=W.ents.filter(e=>e.type==='ship'&&e.alive&&hasTur(e.cls)&&!e.pup&&!(e.isPlayer&&(S.player.docked||W.dead)));if(W.player&&hasTur(W.player.cls)&&")
rep("const e=NET.cl?(W.pup||{})[G.id]:entInWorld(W,G.id);if(e&&e.cls==='gunboat'){G.ent=e;return e}","const e=NET.cl?(W.pup||{})[G.id]:entInWorld(W,G.id);if(e&&hasTur(e.cls)){G.ent=e;return e}")
rep("if(e.type!=='ship'||!e.alive||e.cls!=='gunboat'||e===p||e.isPlayer)continue;","if(e.type!=='ship'||!e.alive||!hasTur(e.cls)||e===p||e.isPlayer)continue;")
rep("if(e.cls==='gunboat'&&!(W.gunseat&&gsEnt()===e)){const T=e.tur","if(hasTur(e.cls)&&!(W.gunseat&&gsEnt()===e)){const T=e.tur")
rep("Q.docked==='station'&&Q.sector===P.sector&&Q.cls==='gunboat'&&Q.faction===P.faction","Q.docked==='station'&&Q.sector===P.sector&&hasTur(Q.cls)&&Q.faction===P.faction",2)
rep("if(!me||!e||e.cls!=='gunboat'||!e.alive","if(!me||!e||!hasTur(e.cls)||!e.alive")
rep("if(e&&e.alive&&e.cls==='gunboat'){turretOf(e).gunner=pid;","if(e&&e.alive&&hasTur(e.cls)){turretOf(e).gunner=pid;")
rep("const gbs=W.ents.filter(e=>e.type==='ship'&&e.alive&&e.cls==='gunboat');if(W===LW&&W.player&&W.player.cls==='gunboat'&&","const gbs=W.ents.filter(e=>e.type==='ship'&&e.alive&&hasTur(e.cls));if(W===LW&&W.player&&hasTur(W.player.cls)&&")
rep("P.cls==='gunboat'&&p.tur?`${FACTIONS[P.faction].hulls[P.cls]} · Heavy Bomber · gunner:","hasTur(P.cls)&&p.tur?`${FACTIONS[P.faction].hulls[P.cls]} · ${CLASSES[P.cls].name} · gunner:")
rep("hullName(gsEnt().fac,'gunboat')","hullName(gsEnt().fac,gsEnt().cls)")
rep("desc:'Torpedoes that crack stations and outposts, swarm launcher. Slow.'","seats:2,desc:'Torpedoes that crack stations and outposts, swarm launcher, and a rear dorsal turret (an AI gunner mans it, or a wingmate can climb in). Slow.'")
open(P,'w',encoding='utf-8').write(s);print('bomber turret patch applied')
