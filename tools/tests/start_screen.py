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
    await pg.goto(GAME,wait_until='domcontentloaded');await pg.evaluate('localStorage.clear()');await pg.reload(wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000);await pg.wait_for_timeout(600)
    r=await pg.evaluate("JSON.stringify(['bLegend','bTrain','bLaunch'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,Math.round(r.x),Math.round(r.width)]}).concat([document.getElementById('bTrain').className]))");print(r)
    await pg.screenshot(path=D+'trbtn.png',clip={'x':600,'y':640,'width':760,'height':128})
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
