# 1v1 duel jobs: argv = jobs.json N out.json ; each job [clsA,mkA,tuneA,clsB,mkB,tuneB]
import asyncio,json,sys
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
JOBS=json.load(open(sys.argv[1]));N=int(sys.argv[2]);OUT=sys.argv[3]
SETUP=r"""(()=>{running=false;exitSector();
 const sid=SECTOR_DEFS.map(d=>d.id).find(id=>!S.stations[id]&&!(S.outposts&&S.outposts[id]));
 const kit=(cls,t)=>{const C=CLASSES[cls],o={},r=rackCapC(cls,t);if(C.torp)o.torpedo=r;else if(r>0)o.missile=r;if(C.swarm)o.swarm=C.swarm;return o};
 const mk=(side,cls,t,u)=>{const e=makeNPC('patrol',side,cls,t,kit(cls,t),null);e.aimT=1;e.flares=1;if(u){e.st=shipStats(side,cls,t,u);e.tuned=1}e.hull=e.st.hull;e.shield=e.st.sCap;e.energy=e.st.eCap;e.wpn='kinetic';return e};
 window.DUEL2=function(a,b,maxT){W=openWorld(sid);W.player=null;W.ents=W.ents.filter(e=>!e.npc&&e.type!=='ship');W.popT=1e9;
  const A=mk('varkesh',a[0],a[1],a[2]),B=mk('ostrova',b[0],b[1],b[2]);A.x=-700;B.x=700;A.y=B.y=0;A.z=B.z=9000;if(window.DMOD)DMOD(A,B);W.ents.push(A,B);const dt=1/30;let t=0;
  while(t<maxT&&A.alive&&B.alive&&A.hull>0&&B.hull>0){W.popT=1e9;W.ents=W.ents.filter(e=>e===A||e===B||!e.npc||e.side==='varkesh'||e.side==='ostrova');worldUpdate(dt);t+=dt}
  const fr=e=>(e.alive&&e.hull>0)?(Math.max(0,e.hull)/e.st.hull+Math.max(0,e.shield)/Math.max(1,e.st.sCap))/2:0;
  const r=[fr(A),fr(B)];delete WORLDS[sid];return r};
 return sid})()"""
async def main():
  async with async_playwright() as p:
    br=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await br.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+D+'driftgate.html?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=30000)
    await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await ev(SETUP);res=[]
    import os
    if os.environ.get('PRE'):print('pre',await ev(os.environ['PRE']))
    for j in JOBS:
      a,b=j[:3],j[3:];w=l=0
      for k in range(N):
        x,y=(a,b) if k%2==0 else (b,a)
        r=json.loads(await ev(f"JSON.stringify(DUEL2({json.dumps(x)},{json.dumps(y)},150))"))
        if k%2:r=r[::-1]
        if r[0]>r[1]:w+=1
        elif r[1]>r[0]:l+=1
      res.append({'job':j,'w':w,'l':l,'n':N});json.dump(res,open(OUT,'w'))
    print('done',OUT,'errors',errs[:3]);await br.close()
asyncio.run(main())
