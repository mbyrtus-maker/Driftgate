# Patch: blasting knocks off real rock chunks. Each fault-point section a charge cracks becomes its own chunk of rock (the ore that
# charge released), pushed off the rock along the fault point's normal at 6-10 m/s and slowing to a drift. Fly into a chunk to scoop
# it into the hold (holding F nearby still works); a wreck joint gives one chunk. Chunks keep everything the ore cloud did: they are
# s.clouds entries (ledger, AI Unbound and Brood Grazers, multiplayer, the training lessons), and one nobody takes breaks up after
# 90 s into the system's debris pool, so nothing is made or lost.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# a chunk: a cloud entry with a body (cr), a velocity and the chunk flag; r stays just outside the rock so every reach test still works
rep("function blCloud(s,at,ore,R0,extra,o){const t=oreTotal({ore});if(!t)return 0;s.clouds=s.clouds||[];s.clouds.push({id:S.nextId++,x:Math.round(at.x),y:Math.round(at.y),z:Math.round(at.z),ore,r:R0+30,r0:R0+30,until:S.T+Math.max(30,BL.cloudLife-10*extra),o});return t}",
    "function blCloud(s,at,ore,R0,extra,o,v){const t=oreTotal({ore});if(!t)return 0;s.clouds=s.clouds||[];const cr=chunkR(t);s.clouds.push({id:S.nextId++,chunk:1,cr,x:Math.round(at.x),y:Math.round(at.y),z:Math.round(at.z),vx:v?v.x:0,vy:v?v.y:0,vz:v?v.z:0,ore,r:cr+25,r0:cr+25,until:S.T+Math.max(30,BL.cloudLife-10*extra),o});return t}\n"
    "function chunkR(t){return Math.round((4+Math.sqrt(Math.max(1,t))*2.4)*10)/10}\n"
    "// share a released lot between sections by their release rates, to the unit\n"
    "function oreSplit(ore,w){const W=w.reduce((a,b)=>a+b,0)||1,out=w.map(()=>({}));for(const k in ore){const n=ore[k],sh=w.map(x=>n*x/W),fl=sh.map(Math.floor);let left=n-fl.reduce((a,b)=>a+b,0);const ord=sh.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]);for(const[,i]of ord){if(left<=0)break;fl[i]++;left--}fl.forEach((m,i)=>{if(m>0)out[i][k]=m})}return out}")
# the rock crack: one chunk per section, at that section's charges, pushed out along its normal
rep("      if(oreTotal(T)<=0)removeAst(s,T);else T.fpv=(T.fpv||0)+1;got+=blCloud(s,at,rel,R0,extra,o)}",
    "      if(oreTotal(T)<=0)removeAst(s,T);else T.fpv=(T.fpv||0)+1;\n"
    "      {const ks=Object.keys(secQ),parts=oreSplit(rel,ks.map(k=>secQ[k]));ks.forEach((pi,i)=>{const mine=cs.filter(c=>String(c.pi)===pi);let x=0,y=0,z=0;for(const c of mine){x+=c.x;y+=c.y;z+=c.z}x/=mine.length;y/=mine.length;z/=mine.length;\n"
    "        let nx=x-at.x,ny=y-at.y,nz=z-at.z;const nl=hyp(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;const t=oreTotal({ore:parts[i]}),cr=chunkR(t),sp=rnd(6,10);\n"
    "        got+=blCloud(s,{x:x+nx*(cr+4),y:y+ny*(cr+4),z:z+nz*(cr+4)},parts[i],R0,extra,o,{x:nx*sp+rnd(-1,1),y:ny*sp+rnd(-1,1),z:nz*sp+rnd(-1,1)})})}}")
rep("T.ore={};T.last=0;got+=blCloud(s,at,rel,R0,cs.length-1,o)}",
    "T.ore={};T.last=0;{const w=wreckOf(s,T);let nx=w?T.x-w.x:rnd(-1,1),ny=w?T.y-w.y:rnd(-1,1),nz=w?T.z-w.z:rnd(-1,1);const nl=hyp(nx,ny,nz)||1,sp=rnd(5,8);got+=blCloud(s,at,rel,R0,cs.length-1,o,{x:nx/nl*sp,y:ny/nl*sp,z:nz/nl*sp})}}")
rep("blSay(P,got?`Blast! ${got} t of ore in the cloud. Hold F by it to collect.`:'Blast! Nothing came loose.')}",
    "blSay(P,got?`Blast! ${got} t of ore knocked loose. Fly into the chunks to scoop them.`:'Blast! Nothing came loose.')}")
# chunks drift and slow (an old cloud keeps spreading as before)
rep("if(s.clouds&&s.clouds.length){for(const c of s.clouds){c.r=Math.min(c.r+4*dt,c.r0+160)}",
    "if(s.clouds&&s.clouds.length){const dmp=Math.pow(.86,dt);for(const c of s.clouds){if(c.chunk){c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vx*=dmp;c.vy*=dmp;c.vz*=dmp}else c.r=Math.min(c.r+4*dt,c.r0+160)}")
rep("if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);blSay(P,'Cloud collected.')}}",
    "if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);blSay(P,c.chunk?'Chunk scooped.':'Cloud collected.');if(!MUTE&&e===W.player)SFX.clunk&&SFX.clunk()}}\n"
    "// flying into a chunk scoops it: within its body plus the ship's\n"
    "function chunkAt(e,s){for(const c of s.clouds||[])if(c.chunk&&d3(c,e)<c.cr+e.st.radius+30)return c;return null}")
# the local pilot scoops by touch; holding F still vacuums a cloud or chunk in reach
rep("  const cl=hold?blCloudNear(p,sec):null;if(cl){p.mining=cl;if(!NET.cl)blCollect(p,P,cl,dt,sec);return}",
    "  {const ch=!NET.cl&&chunkAt(p,sec);if(ch){p.mining=ch;blCollect(p,P,ch,dt,sec)}}\n  const cl=hold?blCloudNear(p,sec):null;if(cl){p.mining=cl;if(!NET.cl)blCollect(p,P,cl,dt,sec);return}")
# crew guests on the host: same touch scoop
rep("    if(u&&u.m){const sec=S.sectors[W.sid],cl=(sec.clouds||[]).find(c=>c.id===u.m);if(cl&&d3(cl,e)<BL.collectR+cl.r){e.mining=cl;blCollect(e,P,cl,dt,sec)}}",
    "    if(u&&u.m){const sec=S.sectors[W.sid],cl=(sec.clouds||[]).find(c=>c.id===u.m);if(cl&&d3(cl,e)<BL.collectR+cl.r){e.mining=cl;blCollect(e,P,cl,dt,sec)}}\n"
    "    else if(blHull(P.cls)){const sc=S.sectors[W.sid],ch=chunkAt(e,sc);if(ch){e.mining=ch;blCollect(e,P,ch,dt,sc)}}")
# 3D: chunks are tumbling rocks in their ore's colour
rep("drawMesh(astMesh(sd%8,a.comet?'comet':mainOre(a)||'fe'),MM)}",
    "drawMesh(astMesh(sd%8,a.comet?'comet':mainOre(a)||'fe'),MM)}\n"
    "  for(const c of sec.clouds||[]){if(!c.chunk||!inView(c.x,c.y,c.z,c.cr))continue;qAxis(((c.id>>2)%5-2)/2,1,((c.id>>4)%3-1)/2,t*.6+c.id,_qs);qNorm(_qs);mModel(MM,c.x,c.y,c.z,_qs,c.cr,c.cr*.8,c.cr*.9);drawMesh(astMesh(c.id%8,mainOre(c)||'fe'),MM)}")
# HUD: a bracket and label on each chunk instead of the dashed cloud ring
rep("for(const cl of s.clouds||[]){const L=proj(cl.x,cl.y,cl.z);if(L.behind)continue;const rr=Math.max(10,projR(L.d,cl.r));c.strokeStyle='rgba(122,217,167,.7)';c.setLineDash([3,5]);c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();c.setLineDash([]);\n    c.fillStyle='#7ad9a7';c.fillText(`ORE CLOUD ${oreTotal(cl)} T · ${Math.max(0,Math.ceil(cl.until-S.T))} S`,L.x,L.y-rr-6)}",
    "for(const cl of s.clouds||[]){const L=proj(cl.x,cl.y,cl.z);if(L.behind)continue;const rr=Math.max(8,projR(L.d,cl.chunk?cl.cr+6:cl.r));c.strokeStyle='rgba(122,217,167,.85)';\n"
    "    if(cl.chunk){const k=Math.max(4,rr*.35);c.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.moveTo(L.x+sx*rr,L.y+sy*(rr-k));c.lineTo(L.x+sx*rr,L.y+sy*rr);c.lineTo(L.x+sx*(rr-k),L.y+sy*rr)}c.stroke()}\n"
    "    else{c.setLineDash([3,5]);c.beginPath();c.arc(L.x,L.y,rr,0,TAU);c.stroke();c.setLineDash([])}\n"
    "    c.fillStyle='#7ad9a7';c.fillText(`${cl.chunk?'ORE CHUNK':'ORE CLOUD'} ${oreTotal(cl)} T · ${Math.max(0,Math.ceil(cl.until-S.T))} S`,L.x,L.y-rr-6)}")
# words
rep("// and detonate (3) or cancel (4), then hold F by the ore cloud to collect it.","// and detonate (3) or cancel (4), then fly into the chunks that come loose to scoop them (or hold F by one).")
rep("back off 120 m and press 3. Hold F by the ore cloud to collect it.</div></div>`;","back off 120 m and press 3. Fly into the chunks that come off to scoop them.</div></div>`;")
rep("Fire a charge onto its joint (F), back off and press 3, then collect the cloud.</div>","Fire a charge onto its joint (F), back off and press 3, then scoop the chunk.</div>")
rep("Then hold <kbd>F</kbd> by the ore cloud and collect <b>3 ore</b>.","Then fly into the chunks that come off (or hold <kbd>F</kbd> by one) and scoop <b>3 ore</b>.")
rep("then collect <b>6 units</b> from the cloud.","then scoop <b>6 units</b> from the chunk.")
rep("feed('⚠ Unbound raiders are turning toward the ore cloud. They will scoop it, and you.','warn')","feed('⚠ Unbound raiders are turning toward your ore chunks. They will scoop them, and you.','warn')")
open(P,'w',encoding='utf-8').write(s);print('blast chunks applied')
