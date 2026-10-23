# render every dock tab at every station/outpost for each faction and Unbound, early and late game; report exceptions
import asyncio,json,sys
from playwright.async_api import async_playwright
JS=r"""((fac,late)=>{const out=[];const errs=[];
 FEED.length=0;newGame(fac==='pirate'?'halcyon':fac,launchCls(),'Tester');if(fac==='pirate'){S.unb=1;unbP();S.player.cls='raider';S.player.faction='pirate'}startWith(S);
 running=false;
 if(late){exitSector();W=null;while(S.T<late*60){S.T+=10;try{strategicTick();updateEvents()}catch(e){errs.push('strat:'+e.message)}}enterSector(S.player.sector)}
 const f=S.player.faction;if(late&&FAC_IDS.includes(f)&&!S.yards[f])S.yards[f]={fort:{}};
 S.player.credits=50000;
 const tabs=DOCK_TOP.flatMap(t=>t[2]).concat(['missions','orders']);
 const ACT=new Set();const go=(sid,dk,acts)=>{try{if(W)exitSector();S.player.sector=sid;enterSector(sid);S.player.docked=dk;$('dock').hidden=true;openDock();for(const t of tabs){dockTab=t;try{renderDock()}catch(e){errs.push(`${sid}/${dk}/${t}: ${e.message} | ${String(e.stack).split('\n')[1]}`)}}
   // every button visible on each tab gets clicked once (actions), then re-render
   if(acts)for(const t of tabs){dockTab=t;try{renderDock()}catch(e){continue}const seen=new Set();for(let k=0;k<15;k++){const bs=[...document.querySelectorAll('#dock [data-act]')].filter(b=>!b.disabled&&!['launch','quit','savequit','dev','bsell','bfly','hull','convoy','callcap'].includes(b.dataset.act)&&!seen.has(b.dataset.act+'|'+(b.dataset.arg||'')));if(!bs.length)break;const b=bs[0];seen.add(b.dataset.act+'|'+(b.dataset.arg||''));window.__ce=null;b.click();if(window.__ce){errs.push(`ACT ${sid}/${dk}/${t}/${b.dataset.act}(${b.dataset.arg||''}): ${window.__ce}`)}if(!S.player.docked||$('dock').hidden){S.player.docked=dk;openDock()}dockTab=t;try{renderDock()}catch(e){errs.push(`RE ${sid}/${t} after ${b.dataset.act}: ${e.message}`)}}}
   }catch(e){errs.push(`go ${sid}/${dk}: ${e.message} | ${String(e.stack).split('\n')[1]}`)}};
 const kinds={};for(const sid in S.stations){const R=S.stations[sid],key=R.owner+R.kind;const first=!kinds[key];kinds[key]=1;go(sid,'station',first)}
 {let n=0;for(const id in S.outposts){const o=S.outposts[id];if(o.sector)go(o.sector,id,n++<2)}}
 if(fac==='pirate'){const sid=S.player.sector;S.lairs=S.lairs||[];S.lairs.push({id:S.nextId++,pid:'me',sid,x:0,y:0,z:0,stash:{fe:5},fort:{},hull:LAIR.hull,seen:{}});S.player.lairId=S.lairs[S.lairs.length-1].id;go(sid,'lair',true)}
 return JSON.stringify({fac,late,n:errs.length,errs:[...new Set(errs)].slice(0,40),fe:(window.__dgErr||[]).map(x=>x.where+':'+x.msg).slice(0,10)})})"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for fac in ['halcyon','varkesh','ostrova','pirate']:
      for late in ([0,90] if fac=='halcyon' else [0]):
        pg=await b.new_page();perr=[];pg.on('pageerror',lambda e:perr.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
        await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..','index.html'))+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
        await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(800)
        try:r=await asyncio.wait_for(pg.evaluate('c=>__dg.ev(c)',f"({JS})('{fac}',{late})"),600);print(r,flush=True)
        except Exception as e:print(fac,late,'FAILED',str(e)[:300],flush=True)
        if perr:print('  pageerrors',perr[:5])
        await pg.close()
    await b.close()
asyncio.run(main())
