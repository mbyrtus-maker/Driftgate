# live-world soak: a bot pilot fights, jumps, docks, mines, fires missiles and opens the map for N sim minutes per scenario;
# frame errors (window.__dgErr) and page errors are reported
import asyncio,json,sys
from playwright.async_api import async_playwright
MIN=float(sys.argv[1]) if len(sys.argv)>1 else 20
JS=r"""((fac,cls,mins)=>{const errs=[];const E=(w,e)=>errs.push(w+': '+(e&&e.message)+' | '+String(e&&e.stack||'').split('\n').slice(1,3).join(' / '));
 FEED.length=0;newGame(fac==='pirate'?'halcyon':fac,cls,'Tester');if(fac==='pirate'){S.unb=1;unbP();S.player.faction='pirate';S.player.cls=cls}startWith(S);
 running=true;try{undock()}catch(e){E('undock',e)}
 const dt=1/30;let mode='fight',mT=0,acts={};const P=S.player;const T0=S.T;
 const nb=()=>NEIGH[P.sector]||[];
 while(S.T-T0<mins*60){
  try{step(dt)}catch(e){E('step',e)}
  if(S.won){acts.won=(acts.won||0)+1;S.won=null}
  const p=W&&W.player;
  if(W&&W.dead){try{respawn();if(P.docked)undock()}catch(e){E('respawn',e)}acts.dead=(acts.dead||0)+1;continue}
  if(!p)continue;
  if((mT-=dt)<=0){mT=12+Math.random()*12;mode=['fight','fight','jump','dock','missile','mine','map','land','idle'][Math.floor(Math.random()*9)];acts[mode]=(acts[mode]||0)+1;
   for(const k of ['Space','KeyW','ShiftLeft'])keys[k]=false;
   try{
    if(P.docked){if(P.docked==='lair'||P.docked){undock()}}
    if(mode==='jump'){const n=nb();if(n.length&&!S.player.docked)doJump(n[Math.floor(Math.random()*n.length)])}
    else if(mode==='dock'){const SE=W.stationEnt;if(SE){p.x=SE.x+300;p.y=SE.y;p.z=SE.z+300;p.vx=p.vy=p.vz=0;tryDock()}}
    else if(mode==='missile'){targetNearest('hostile');fireMissile();fireSwarm();playerFlares()}
    else if(mode==='map'){toggleMap();drawMap();renderMapSide();toggleMap()}
    else if(mode==='land'){const a=S.sectors[W.sid].ast.find(x=>!x.comet);if(a){p.x=a.x+astR(a)+p.st.radius+20;p.y=a.y;p.z=a.z;p.vx=p.vy=p.vz=0;landOn(a)}}
   }catch(e){E('act '+mode,e)}}
  try{
   if(W.docking||P.docked){if(P.docked&&Math.random()<.01){openDock();renderDock();undock()}continue}
   if(p.landed){if(Math.random()<.003)liftOff();continue}
   if(mode==='fight'){if(!W.tgt||Math.random()<.01)targetNearest('hostile');const t=W.tgt&&W.tgt.ref;if(t&&t.x!==undefined){faceInstant(p,t.x-p.x,t.y-p.y,t.z-p.z);keys.KeyW=d3(p,t)>500;keys.Space=d3(p,t)<1500}}
   else if(mode==='mine'){if(blHull(P.cls)){const a=S.sectors[W.sid].ast.filter(x=>!x.comet).sort((x,y)=>d3(x,p)-d3(y,p))[0];if(a){W.tgt={kind:'ast',ref:a};if(d3(a,p)>250){p.x=a.x+200;p.y=a.y;p.z=a.z}faceInstant(p,a.x-p.x,a.y-p.y,a.z-p.z);if(Math.random()<.02)blFire(p,P);if(Math.random()<.004){p.x+=400;blDetonate(P,p)}}}else mode='fight'}
  }catch(e){E('bot '+mode,e)}
  if(Math.random()<.004){try{draw3D();drawOverlay()}catch(e){E('draw',e)}}
 }
 for(const k of ['Space','KeyW','ShiftLeft'])keys[k]=false;
 return JSON.stringify({fac,cls,T:Math.round((S.T-T0)/60),acts,errs:[...new Set(errs)].slice(0,30),fe:[...new Set((window.__dgErr||[]).map(x=>x.where+': '+x.msg+' | '+x.stack.split(' | ').slice(1,3).join(' / ')))]})})"""
SC=[('halcyon','interceptor'),('varkesh','skiff'),('ostrova','courier'),('halcyon','scout'),('varkesh','bomber'),('pirate','raider'),('ostrova','heavy'),('halcyon','dredger')]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for fac,cls in SC:
      pg=await b.new_page(viewport={'width':1000,'height':640});perr=[];pg.on('pageerror',lambda e:perr.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
      await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..','index.html'))+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
      await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(800)
      try:r=await asyncio.wait_for(pg.evaluate('c=>__dg.ev(c)',f"({JS})('{fac}','{cls}',{MIN})"),1500);print(r,flush=True)
      except Exception as e:print(fac,cls,'FAILED',str(e)[:300],flush=True)
      if perr:print('  pageerrors',list(dict.fromkeys(perr))[:6],flush=True)
      await pg.close()
    await b.close()
asyncio.run(main())
