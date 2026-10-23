# key bindings: manual list, rebind with swap, persistence, translation; keys-now strip; detonate on its own key
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
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.evaluate('localStorage.clear()');await pg.reload(wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await ev("(()=>{if(S.player.docked)undock();return 1})()");await pg.wait_for_timeout(500)
    await pg.keyboard.press('KeyH');await pg.wait_for_timeout(300)
    print('manual rows',await ev("document.querySelectorAll('#keyList kbd').length"),await ev("document.querySelector('#keyList').innerText.slice(0,120).replace(/\\n/g,' | ')"))
    await pg.click('[data-rebind="det"]');await pg.wait_for_timeout(100);await pg.keyboard.press('KeyX');await pg.wait_for_timeout(200)
    print('after rebind',await ev("JSON.stringify({KEYB,det:kb('det'),fa:kb('fa'),x:keyOf('KeyX'),five:keyOf('Digit5'),saved:localStorage.getItem('driftgate.keys')})"))
    await pg.reload(wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    print('after reload',await ev("JSON.stringify({det:kb('det'),fa:kb('fa')})"))
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    await ev("(()=>{if(S.player.docked)undock();return 1})()");await pg.wait_for_timeout(300)
    # miner on a rock, one charge set: strip shows charge / detonate; physical X detonates
    print('miner',await ev("""(()=>{S.player.cls='prospector';refreshPlayerStats();targetNearest('ast');const s=S.sectors[W.sid];s.charges=s.charges||[];
      hudUpdate();const a=document.getElementById('hKeysNow').innerText.replace(/\\n/g,' ');return a})()"""))
    print('det via X',await ev("(()=>{let hit=0;const o=blKeyPress;blKeyPress=k=>{hit=k};window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyX'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyX'}));blKeyPress=o;return hit})()"))
    print('3 on a miner',await ev("(()=>{let f='';const o=flash;flash=m=>{f=m};window.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit3'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit3'}));flash=o;return f})()"))
    print('fighter',await ev("""(()=>{S.player.cls='heavy';refreshPlayerStats();const e=W.ents.find(x=>x.type==='ship'&&x.npc&&x.alive);if(e){W.tgt={kind:'ship',ref:e}}hudUpdate();return (e?hostile('player',e.side):'none')+' : '+document.getElementById('hKeysNow').innerText.replace(/\\n/g,' ')})()"""))
    await pg.screenshot(path=D+'keys_strip.png')
    print('reset',await ev("(()=>{KEYB={};keySave();return kb('det')+' '+kb('fa')})()"))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
