# ship goods from a vault elsewhere: quote, order, fee, freighter flies, goods land in this vault; a lost one tells the owner
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
    print(await ev("""(()=>{const P=S.player,f=P.faction;const R=Object.values(S.stations).find(R=>R.owner===f&&R.sid!==P.sector);P.vaults=P.vaults||{};P.vaults[R.sid]={ir:20,plate:10,xc:4};window._from=R.sid;
      dockTab='storage';renderDock();const q=shipQuote(P,R.sid);return JSON.stringify({from:R.name,q,btn:!!document.querySelector('[data-act=shipv]')})})()"""))
    await pg.screenshot(path=D+'ship_vault.png')
    print('order',await ev("""(()=>{const P=S.player,c0=P.credits,tr0=S.econ.treasury[P.faction];document.querySelector('[data-act=shipv]').click();const t=S.traders.find(t=>t.own);return JSON.stringify({paid:c0-P.credits,treasury:S.econ.treasury[P.faction]-tr0,left:P.vaults[_from]||null,t:t&&{path:t.path,load:t.load,why:t.why},msg:document.getElementById('dErr').textContent,onway:document.querySelector('#dBody').innerText.includes('Shipments on the way')})})()"""))
    print('dbg',await ev("(()=>{const t=S.traders.find(t=>t.own);dockTab='storage';renderDock();return JSON.stringify({k:t.own.k,me:pkey(),tab:dockTab,sw:shipsOnWay().slice(0,200),has:document.querySelector('#dBody').innerText.includes('Shipments on the way'),txt:document.querySelector('#dBody').innerText.slice(-300)})})()"))
    print('jobs escort',await ev("(()=>{dockTab='jobs';renderDock();return [...document.querySelectorAll('.jrow')].map(r=>r.innerText.replace(/\\n/g,' | ')).filter(s=>/goods/.test(s)).join(' || ')})()"))
    print('arrive',await ev("""(()=>{const P=S.player,fd=[];const of=feed;feed=(m,k)=>{fd.push(m)};const rd=raidsTick;raidsTick=()=>0;for(let i=0;i<40&&S.traders.some(t=>t.own);i++){for(const t of S.traders)if(t.own){t.next=S.T;const w=WORLDS[t.sector],e=w&&w.ents.find(x=>x.alive&&x.home===`trader:${t.id}:${t.side}`);if(e)e.ai.arrived=true}tradersTick()}raidsTick=rd;feed=of;return JSON.stringify({vault:P.vault,fd:fd.filter(m=>/shipment/.test(m))})})()"""))
    print('lost',await ev("""(()=>{const P=S.player;P.vaults[_from]={fe:30};document.querySelector('[data-act=tab][data-arg=storage]')||0;dockAction('shipv',_from);const t=S.traders.find(t=>t.own);const fd=[];const of=feed;feed=(m,k)=>{fd.push(m)};haulLost(t,t.path[1]||t.sector);S.traders=S.traders.filter(x=>x!==t);feed=of;return JSON.stringify(fd)})()"""))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
