# Patch: crew pilots see the AI miners blast too. The host's snapshot of each system now carries, for every miner mid-cycle, the
# charges it has set (and its stage), and every chunk on its way to a miner. Each crew pilot's game draws them as the host's does:
# a shot flies out for each new charge, the charges blink until the blast, the blast goes off when the chunk appears, and the chunk
# drifts to the miner. Miners that aren't blasting add nothing to the snapshot.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# host: add the miners' charges (nb) and chunks (nc) to the snapshot
rep("wk:(W.works||[]).map(w=>[w.id,Math.round(wkHp(w))]),de:W.decoys.map(d=>[r1(d.x),r1(d.y),r1(d.z),Math.round(d.life*10)/10])};",
    "wk:(W.works||[]).map(w=>[w.id,Math.round(wkHp(w))]),de:W.decoys.map(d=>[r1(d.x),r1(d.y),r1(d.z),Math.round(d.life*10)/10]),\n"
    "        nb:W.ents.filter(e=>e.npc&&e.alive&&e.ai&&e.ai.bl&&e.ai.bl.pts&&e.ai.bl.pts.length).map(e=>[e.id,e.ai.bl.st,e.ai.bl.pts.map(q=>[r1(q.x),r1(q.y),r1(q.z)])]),\n"
    "        nc:(W.npcCh||[]).filter(c=>c.e&&c.e.alive).map(c=>[c.id,c.e.id,c.k,c.cr,r1(c.x),r1(c.y),r1(c.z),Math.round(c.vx),Math.round(c.vy),Math.round(c.vz)])};")
# crew pilot: rebuild them from each snapshot
rep("  relinkFrigs();\n  {const own='p_'+MP.pid;for(const g of m.gt||[]){",
    "  relinkFrigs();\n  npcBlSnap(w,m);\n  {const own='p_'+MP.pid;for(const g of m.gt||[]){")
rep("// between snapshots: glide every remote ship along its velocity and ease it onto the host's position\nfunction clientWorld(dt){const w=W,p=w.player;",
r"""// the AI miners' blast cycle as the host sends it: a shot for each new charge, the blast when a chunk appears, the chunk drifting in
function npcBlSnap(w,m){const seen=new Set();
  for(const[id,st,pts]of m.nb||[]){const e=w.pup[id];if(!e)continue;seen.add(id);const B=e.ai.bl||(e.ai.bl={st,pts:[]}),Q=pts.map(p=>({x:p[0],y:p[1],z:p[2]}));
    if(st==='set'||st==='clear')for(const q of Q.slice(B.pts.length))(w.npcBl=w.npcBl||[]).push({x:e.x,y:e.y,z:e.z,tx:q.x,ty:q.y,tz:q.z,t:0,T:Math.max(.2,d3(e,q)/BL.spd)});
    B.st=st;B.pts=Q}
  for(const id in w.pup){const e=w.pup[id];if(e.ai&&e.ai.bl&&!seen.has(id))e.ai.bl=null}
  const old=new Map((w.npcCh||[]).map(c=>[c.id,c])),out=[];
  for(const r of m.nc||[]){const e=w.pup[r[1]];if(!e)continue;let c=old.get(r[0]);
    if(!c){c={id:r[0],e,k:r[2],cr:r[3],x:r[4],y:r[5],z:r[6],until:1e12};const B=e.ai.bl;
      inW(w,()=>{for(const q of(B&&B.pts.length?B.pts:[c]))fxBoom(q,40,'#ffd9a0');if(!MUTE&&w.player&&d3(e,w.player)<3000)SFX.crack()})}
    else{const k=.5;c.x+=(r[4]-c.x)*k;c.y+=(r[5]-c.y)*k;c.z+=(r[6]-c.z)*k}
    c.e=e;c.vx=r[7];c.vy=r[8];c.vz=r[9];out.push(c)}
  w.npcCh=out}
// between snapshots: glide every remote ship along its velocity and ease it onto the host's position
function clientWorld(dt){const w=W,p=w.player;npcBlWorld(dt);""")
open(P,'w',encoding='utf-8').write(s);print('npc blast net applied')
