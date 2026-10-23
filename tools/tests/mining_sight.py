import asyncio
from playwright.async_api import async_playwright
import os,tempfile
# the game under test: index.html at the repo root, or a file named in DG_GAME; screenshots go to DG_OUT (default: temp dir)
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1366,'height':768});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await ev("""(()=>{undock();const P=S.player;P.cls='skiff';refreshPlayerStats();const p=W.player,a=S.sectors[W.sid].ast.slice().sort((x,y)=>d3(x,p)-d3(y,p))[0];const R=astR(a);p.x=a.x+R+180;p.y=a.y;p.z=a.z;p.vx=40;p.vy=0;p.vz=0;faceInstant(p,a.x-p.x,a.y-p.y,a.z-p.z);W.tgt={kind:'ast',ref:a};return 1})()""")
    await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'blaim_miner.png')
    await ev("(()=>{S.player.cls='interceptor';refreshPlayerStats();return 1})()");await pg.wait_for_timeout(800);await pg.screenshot(path=D+'blaim_fighter.png')
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
