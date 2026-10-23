# Q13: the contacts list shows short names, short status tags, km past 1 km; nothing cut off
import asyncio,json,os,tempfile
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1366,'height':768});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await ev("(()=>{undock();const p=W.player,foe=FAC_IDS.find(f=>hostile(S.player.faction,f));const e=makeNPC('patrol',foe,'heavy',1,{},'x');e.x=p.x+600;e.y=p.y;e.z=p.z;e.ai.tgt=p;W.ents.push(e);return 1})()")
    await pg.wait_for_timeout(2500)
    print(await ev("JSON.stringify([...document.querySelectorAll('#contacts .ct')].map(r=>{const s=r.querySelector('span');return r.innerText.replace(/\\n/g,' | ')+(s.scrollWidth>s.clientWidth+1?'  [CUT]':'')}))"))
    await pg.screenshot(path=D+'contacts.png',clip={'x':1080,'y':110,'width':286,'height':300})
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
