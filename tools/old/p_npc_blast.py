# Patch: AI miners blast too. Faction miners (and the Unbound's) no longer hold a mining laser on a rock: they stand off a fault
# point, fire two or three charges onto the rock, back off, detonate, and scoop the chunk that comes loose, then go again. Ore still
# comes off at the miner's drilling rate (it builds up while the cycle runs and leaves the rock with the chunk), so the economy is
# unchanged. Brood Grazers still graze. The shots, set charges, blast and chunk show for anyone in the system with the host.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

rep("      const d=d3(a,e),r=astR(a);\n      if(d>r+150){steer(e,a.x,a.y,a.z,dt,true);faceTo(e,a,dt)}",
    "      const d=d3(a,e),r=astR(a);\n      if(e.side!=='brood'&&blHull(e.cls)){npcBlast(e,a,dt,s);break}\n      if(d>r+150){steer(e,a.x,a.y,a.z,dt,true);faceTo(e,a,dt)}")
rep("// ============================================================ player\nfunction steerInput(){",
r"""// AI miners blast: stand off a fault point, set 2-3 charges, back off, detonate, scoop the chunk. The rock gives at the miner's
// drilling rate the whole time (the ore builds up and leaves with the chunk), so their output is what it was with the laser.
function npcBlast(e,a,dt,s){const ai=e.ai,r=astR(a);let B=ai.bl;if(!B||B.a!==a.id){B=ai.bl={a:a.id,st:'set',t:0,n:a.wpt?1:ri(2,3),fired:0,pts:[]}}B.t+=dt;
  if(B.st!=='set'||B.fired>0||d3(e,a)<r+400)e.mineAcc+=e.st.drill*dt*BAL.aiEff;
  if(B.st==='set'){const pts=blPts(a),left=pts.filter(p=>!B.pts.some(x=>d3(x,p)<1)),q=(left.length?left:pts).slice().sort((u,v)=>d3(u,e)-d3(v,e))[0],sx=q.x-a.x,sy=q.y-a.y,sz=q.z-a.z,sl=hyp(sx,sy,sz)||1,o={x:q.x+sx/sl*170,y:q.y+sy/sl*170,z:q.z+sz/sl*170};
    steer(e,o.x,o.y,o.z,dt,true,.7);if(d3(e,q)<320||B.t>7){brake(e,dt);if(faceTo(e,q,dt)<.15&&(B.cd||0)<=W.t){B.cd=W.t+.8;B.fired++;(W.npcBl=W.npcBl||[]).push({x:e.x,y:e.y,z:e.z,tx:q.x,ty:q.y,tz:q.z,t:0,T:Math.max(.2,d3(e,q)/BL.spd)});B.pts.push({x:q.x,y:q.y,z:q.z});if(B.fired>=B.n){B.st='clear';B.t=0}}}else faceTo(e,o,dt);return}
  if(B.st==='clear'){const dx=e.x-a.x,dy=e.y-a.y,dz=e.z-a.z,l=hyp(dx,dy,dz)||1;steer(e,a.x+dx/l*(r+330),a.y+dy/l*(r+330),a.z+dz/l*(r+330),dt,true,.8);faceTo(e,a,dt);if(l>r+280||B.t>6){B.st='det';B.t=0}return}
  if(B.st==='det'){const got={},room=e.st.cargo-invMass(e.cargo);let m=0;while(e.mineAcc>=1){const k=mainOre(a);if(!k||m+mass(k)>room)break;e.mineAcc-=1;a.ore[k]--;if(!a.ore[k])delete a.ore[k];got[k]=(got[k]||0)+1;m+=mass(k)}
    inv.addAll(e.cargo,got);const gone=oreTotal(a)<=0;for(const q of B.pts)fxBoom(q,Math.min(90,r*.9),'#ffd9a0');if(!MUTE&&W.player&&d3(e,W.player)<3000)SFX.crack();
    const t=oreTotal({ore:got});if(t>0){const q=B.pts[0]||a,nx=q.x-a.x,ny=q.y-a.y,nz=q.z-a.z,nl=hyp(nx,ny,nz)||1,sp=rnd(6,10);(W.npcCh=W.npcCh||[]).push({id:S.nextId++,e,k:mainOre({ore:got})||'fe',cr:chunkR(t),x:q.x+nx/nl*8,y:q.y+ny/nl*8,z:q.z+nz/nl*8,vx:nx/nl*sp,vy:ny/nl*sp,vz:nz/nl*sp,until:W.t+14})}
    if(gone){removeAst(s,a);ai.ast=null}B.st='scoop';B.t=0;return}
  if(B.st==='scoop'){const c=(W.npcCh||[]).find(x=>x.e===e);if(!c||B.t>14){if(c)W.npcCh=W.npcCh.filter(x=>x!==c);ai.bl=null;return}const d=steer(e,c.x,c.y,c.z,dt,true,.6);faceTo(e,c,dt);
    if(d<e.st.radius+c.cr+20){W.npcCh=W.npcCh.filter(x=>x!==c);ai.bl=null}}}
// the charges' flight, and chunks drifting to their miner
function npcBlWorld(dt){if(W.npcBl&&W.npcBl.length){for(const b of W.npcBl)b.t+=dt;W.npcBl=W.npcBl.filter(b=>{if(b.t<b.T)return true;if(!MUTE)fxSpark({x:b.tx,y:b.ty,z:b.tz},'#f0b24a',3);return false})}
  if(W.npcCh&&W.npcCh.length){const dmp=Math.pow(.86,dt);W.npcCh=W.npcCh.filter(c=>c.e.alive&&W.ents.includes(c.e)&&W.t<c.until);for(const c of W.npcCh){c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vx*=dmp;c.vy*=dmp;c.vz*=dmp}}}
// ============================================================ player
function steerInput(){""")
rep("function blWorld(dt){const s=S.sectors[W.sid];","function blWorld(dt){const s=S.sectors[W.sid];npcBlWorld(dt);")
# 3D: their chunks are rocks like yours
rep("  for(const c of sec.clouds||[]){if(!c.chunk||!inView(c.x,c.y,c.z,c.cr))continue;",
    "  for(const c of W.npcCh||[]){if(!inView(c.x,c.y,c.z,c.cr))continue;qAxis(((c.id>>2)%5-2)/2,1,((c.id>>4)%3-1)/2,t*.6+c.id,_qs);qNorm(_qs);mModel(MM,c.x,c.y,c.z,_qs,c.cr,c.cr*.8,c.cr*.9);drawMesh(astMesh(c.id%8,c.k),MM)}\n"
    "  for(const c of sec.clouds||[]){if(!c.chunk||!inView(c.x,c.y,c.z,c.cr))continue;")
# HUD: their shots in flight and the charges they have set, blinking amber
rep("if(commsOpen()&&(W.t-(W.commsT||0)>12||mouse.l||keys.Space))closeComms();",
    "if(commsOpen()&&(W.t-(W.commsT||0)>12||mouse.l||keys.Space))closeComms();\n"
    "  {const bl=Math.sin(W.t*9)>0;for(const b of W.npcBl||[]){const k=b.t/b.T,L=proj(b.x+(b.tx-b.x)*k,b.y+(b.ty-b.y)*k,b.z+(b.tz-b.z)*k);if(L.behind||L.d>4000)continue;c.fillStyle='#ffd27a';c.beginPath();c.arc(L.x,L.y,2.2,0,TAU);c.fill()}\n"
    "    if(bl)for(const m of W.ents){const B=m.ai&&m.ai.bl;if(!B||!(B.st==='set'||B.st==='clear'))continue;for(const q of B.pts){const L=proj(q.x,q.y,q.z);if(L.behind||L.d>4000)continue;c.fillStyle='#f0b24a';c.beginPath();c.arc(L.x,L.y,3,0,TAU);c.fill()}}}")
open(P,'w',encoding='utf-8').write(s);print('npc blast applied')
