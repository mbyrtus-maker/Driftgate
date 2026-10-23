import asyncio,json
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
    await ev("(()=>{undock();inv.addAll(S.player.cargo,{ir:5});mkTick();return 1})()");await pg.keyboard.press('KeyM');await pg.wait_for_timeout(800)
    for sid in ['hp','hr','ke']:
      print(sid,await ev(f"(()=>{{mapSel='{sid}';drawMap();renderMapSide();const t=document.getElementById('mapSide').innerText;const i=t.indexOf(DEF['{sid}'].name.toUpperCase());return t.slice(i,i+420).replace(/\\n/g,' | ')}})()"))
    await pg.screenshot(path=D+'map_new.png')
    print('ore text left',await ev("/in fields|Drifting debris/.test(document.getElementById('mapSide').innerText)"))
    box=await pg.evaluate("(()=>{const r=document.getElementById('mapCv').getBoundingClientRect();return [r.right-40,r.bottom-19]})()")
    await pg.mouse.click(box[0],box[1]);await pg.wait_for_timeout(300);await pg.screenshot(path=D+'map_key.png')
    print('key open',await ev("mapKey"))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
