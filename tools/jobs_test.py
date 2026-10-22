# Jobs list: filters, sort, selection, deliver from the detail panel; beacon 12 t, scouts can't load one
import asyncio,json
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1400,'height':860});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+D+'driftgate.html?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    print(await ev("""(()=>{const P=S.player,f=P.faction;P.mined=P.mined||{};inv.addAll(P.cargo,{ir:8});
      S.contracts.push({id:S.nextId++,fac:f,item:'ir',n:12,reward:600,until:S.T+900});
      const sid=Object.keys(S.beacons).find(s=>S.beacons[s].owner!==f);S.bcnMis=S.bcnMis||{};S.bcnMis[f]=[{id:S.nextId++,sid,reward:120,until:S.T+900,vs:null}];
      for(let i=0;i<40;i++){try{econTick&&econTick()}catch(e){}}
      dockTab='jobs';renderDock();return JSON.stringify({rows:[...document.querySelectorAll('.jrow')].map(r=>r.innerText.replace(/\\n/g,' | ')).slice(0,8),bar:document.querySelector('.jbar').innerText.replace(/\\n/g,' ')})})()"""))
    await pg.wait_for_timeout(300);await pg.screenshot(path=D+'jobs_all.png')
    print('filter scout',await ev("(()=>{document.querySelector('[data-act=jfil][data-arg=scout]').click();return [...document.querySelectorAll('.jrow')].map(r=>r.className+': '+r.innerText.replace(/\\n/g,' | ')).join(' || ')})()"))
    print('filter mine',await ev("(()=>{document.querySelector('[data-act=jfil][data-arg=mine]').click();const r=document.querySelector('.jrow');if(r)r.click();return document.querySelector('.jdet').innerText.replace(/\\n/g,' | ').slice(0,300)})()"))
    await pg.screenshot(path=D+'jobs_mine.png')
    print('deliver',await ev("(()=>{const c0=S.player.credits;const b=document.querySelector('.jdet [data-act=deliver]');if(!b)return 'no button';b.click();return JSON.stringify({paid:S.player.credits-c0,ir:S.player.cargo.ir||0,msg:document.getElementById('dErr').textContent.slice(0,100)})})()"))
    print('sort dist',await ev("(()=>{document.querySelector('[data-act=jfil][data-arg=all]').click();document.querySelector('[data-act=jsort][data-arg=dist]').click();return [...document.querySelectorAll('.jrow .jw')].map(e=>e.textContent).join(',')})()"))
    print('beacon',await ev("""(()=>{const P=S.player;const m=mass('beacon');P.cls='scout';refreshPlayerStats();inv.add(P.vault,'beacon',1);dockAction('mv','beacon:out:1');const a=[P.cargo.beacon||0,dockErr];P.cls='interceptor';refreshPlayerStats();dockErr='';dockAction('mv','beacon:out:1');return JSON.stringify({mass:m,scout:a,fighter:[P.cargo.beacon||0,dockErr.slice(0,60)],hold:W.player.st.cargo})})()"""))
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
