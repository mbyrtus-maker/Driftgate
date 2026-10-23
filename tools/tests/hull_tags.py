# N5: shipyard tags from each hull's stats (Unbound hulls their own), and the fix button on jobs and the beacon row
import asyncio,json,os,tempfile
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1400,'height':860});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    print(await ev("JSON.stringify(['interceptor','striker','heavy','bomber','gunboat','scout','scout2','skiff','prospector','dredger','courier','freighter','bulker','constructor','wraith','raider','corsair','plunderer'].map(k=>k+': '+hullTags(k).join(' · ')),null,1)"))
    print('cards',await ev("(()=>{dockTab='ship';renderDock();return [...document.querySelectorAll('#dBody .cls')].slice(0,4).map(b=>b.querySelector('b').textContent+' | '+(b.querySelector('.htags')||{}).textContent).join(' || ')})()"))
    await pg.screenshot(path=D+'hull_tags.png')
    print('job fix',await ev("""(()=>{const P=S.player,f=P.faction;const sid=Object.keys(S.beacons).find(s=>S.beacons[s].owner!==f);S.bcnMis=S.bcnMis||{};S.bcnMis[f]=[{id:S.nextId++,sid,reward:120,until:S.T+900}];dockTab='jobs';jobFilter='scout';renderDock();document.querySelector('.jrow').click();const f2=document.querySelector('.jdet .btn.pri');const t=f2&&f2.textContent;f2.click();return JSON.stringify({btn:t,cls:P.cls,msg:document.getElementById('dErr').textContent.slice(0,80)})})()"""))
    print('beacon row fix',await ev("""(()=>{const P=S.player;inv.add(P.vault,'beacon',1);dockTab='market';renderDock();const b=[...document.querySelectorAll('#dBody button')].find(x=>/Switch to|Store this ship|Fly your/.test(x.textContent));return b?b.textContent:'none'})()"""))
    print('store then switch',await ev("""(()=>{const P=S.player;P.tiers.weapon=2;refreshPlayerStats();dockTab='market';renderDock();const b=[...document.querySelectorAll('#dBody button')].find(x=>/Store this ship/.test(x.textContent));if(!b)return 'no store button: '+([...document.querySelectorAll('#dBody button')].map(x=>x.textContent).filter(t=>/Swift|Lark/.test(t)).join());const t=b.textContent;b.click();return JSON.stringify({t,cls:P.cls,bay:(P.ships||[]).map(r=>r.cls+' w'+r.tiers.weapon),msg:document.getElementById('dErr').textContent.slice(0,140)})})()"""))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
