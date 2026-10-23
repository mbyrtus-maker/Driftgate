# Brood threat on screen: warnings at 5/6/7, HUD chip, map meter
import asyncio
from playwright.async_api import async_playwright
import os,tempfile
# the game under test: index.html at the repo root, or a file named in DG_GAME; screenshots go to DG_OUT (default: temp dir)
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1400,'height':860});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.evaluate('localStorage.clear()');await pg.reload(wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await ev("(()=>{if(S.player.docked)undock();window._cc=controlCounts;window.NB=0;controlCounts=()=>({..._cc(),brood:NB});return 1})()")
    for nb in (4,5,5,6,4,5):
      r=await ev(f"(()=>{{NB={nb};const f0=FEED.length;victoryTick();hudUpdate();return JSON.stringify({{nb:NB,warn:S.broodWarn,newFeed:FEED.slice(f0).map(x=>x.t||x.msg||x.text||String(x)).join(' | ').slice(0,160),chip:[...document.querySelectorAll('#hChips .chip')].map(c=>c.textContent).filter(t=>/Brood/.test(t)).join(' ')}})}})()")
      print(r)
    await ev("(()=>{NB=6;victoryTick();hudUpdate();return 1})()");await pg.wait_for_timeout(300);await pg.screenshot(path=D+'brood_hud.png')
    await pg.keyboard.press('KeyM');await pg.wait_for_timeout(800)
    print('map',await ev("(()=>{const t=document.getElementById('map').innerText;const i=t.indexOf('Brood threat');return i<0?'NO METER':t.slice(i,i+150).replace(/\\n/g,' | ')})()"))
    await pg.screenshot(path=D+'brood_map.png')
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
