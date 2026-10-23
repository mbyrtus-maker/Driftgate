# the new dock menu: five tabs, keys 1-5, overview cards, sell hold, beacon purchase, every view renders without errors
import asyncio,json
from playwright.async_api import async_playwright
import os,tempfile
# the game under test: index.html at the repo root, or a file named in DG_GAME; screenshots go to DG_OUT (default: temp dir)
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1400,'height':860});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    # a miner home with ore, a damaged hull and parts for an upgrade
    print(await ev("""(()=>{const P=S.player;undock();P.cls='skiff';refreshPlayerStats();inv.addAll(P.cargo,{fe:10,cu:8,ir:5});W.player.hull=W.player.st.hull*.8;inv.addAll(P.vault,{plate:4,wire:4});
      const E=W.stationEnt;W.player.x=E.x;W.player.y=E.y-200;W.player.z=E.z;finishDock(E);return JSON.stringify({tab:dockTab,tabs:document.querySelector('#dTabs').innerText.replace(/\\n/g,' | ')})})()"""))
    await pg.wait_for_timeout(400);await pg.screenshot(path=D+'dock_home.png')
    print('home',await ev("document.querySelector('#dBody').innerText.slice(0,600).replace(/\\n/g,' | ')"))
    for i in range(1,6):
      await pg.keyboard.press(f'Digit{i}');await pg.wait_for_timeout(300)
      print('key',i,await ev("JSON.stringify([dockTab,document.querySelector('#dTabs .stabs')?document.querySelector('#dTabs .stabs').innerText.replace(/\\n/g,' | '):''])"))
      await pg.screenshot(path=D+f'dock_k{i}.png')
    for t in ['market','trade','storage','jobs','upg','bay','ship','fab','works']:
      r=await ev(f"(()=>{{dockTab='{t}';renderDock();return dockTab+' '+document.querySelector('#dBody').innerText.length}})()");print('view',r)
    await ev("dockTab='market';renderDock()");await pg.screenshot(path=D+'dock_market.png')
    print('buy beacon',await ev("(()=>{const c0=S.player.credits;document.querySelector('[data-act=buybeacon]').click();return JSON.stringify({paid:c0-S.player.credits,vault:S.player.vault.beacon,msg:document.getElementById('dErr').textContent.slice(0,120)})})()"))
    print('sell hold',await ev("(()=>{dockTab='home';renderDock();const c0=S.player.credits;const b=document.querySelector('[data-act=sellhold]');if(!b)return 'no button';b.click();return JSON.stringify({got:S.player.credits-c0,cargo:S.player.cargo,vault:S.player.vault,msg:document.getElementById('dErr').textContent})})()"))
    print('after',await ev("document.querySelector('#dTabs').innerText.replace(/\\n/g,' | ')"))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
