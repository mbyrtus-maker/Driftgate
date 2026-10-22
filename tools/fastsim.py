# Fast balance runner: loads the game once per worker page and plays strategic-only games back to back in-page.
# usage: python3 fastsim.py FILE GAMES [HOURS=2.2] [TUNE_JS_FILE] [WORKERS=2] [OUT.json]
import asyncio,json,sys,time,collections
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
FILE=sys.argv[1];GAMES=int(sys.argv[2]);H=float(sys.argv[3]) if len(sys.argv)>3 else 2.2
TUNE=open(sys.argv[4]).read() if len(sys.argv)>4 and sys.argv[4] not in('','-') else ''
WORKERS=int(sys.argv[5]) if len(sys.argv)>5 else 2;OUT=sys.argv[6] if len(sys.argv)>6 else None
SETUP=r"""(()=>{window._fs={won:null};galaxyWon=function(s,how){_fs.won=[Math.round(S.T/60),s,how||'hold'];S.won=s};
 window._fsGame=function(maxT,keep){if(!keep){FEED.length=0;newGame('halcyon',launchCls(),'Tester');S.player.name='Tester';startWith(S)}running=false;exitSector();W=null;_fs.won=null;const peak={};
  while(S.T<maxT&&!_fs.won){S.T+=10;strategicTick();updateEvents();if(S.T%600===0){const n=controlCounts();for(const k in n)peak[k]=Math.max(peak[k]||0,n[k])}}
  return JSON.stringify({won:_fs.won||[Math.round(S.T/60),'none','unfinished'],peak})};
 window._fsStart=function(keep){if(!keep){FEED.length=0;newGame('halcyon',launchCls(),'Tester');S.player.name='Tester';startWith(S)}running=false;exitSector();W=null;_fs.won=null;window._pk={};return 1};
 window._fsChunk=function(maxT,n){for(let i=0;i<n&&S.T<maxT&&!_fs.won;i++){S.T+=10;strategicTick();updateEvents()}const c=controlCounts();for(const k in c)_pk[k]=Math.max(_pk[k]||0,c[k]);return(_fs.won||S.T>=maxT)?JSON.stringify({won:_fs.won||[Math.round(S.T/60),'none','unfinished'],peak:_pk}):''};return 1})()"""
import os
RELOAD=os.environ.get('RELOAD')=='1'
async def boot(pg):
  await pg.goto('file://'+D+FILE+'?name=Tester',timeout=180000,wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
  await pg.evaluate("selFac='halcyon';document.getElementById('bLaunch').click()");await pg.wait_for_timeout(800)
  if TUNE:await pg.evaluate('c=>__dg.ev(c)',TUNE+';1')
  await pg.evaluate('c=>__dg.ev(c)',SETUP)
  if os.environ.get('CC')=='1':await pg.evaluate('c=>__dg.ev(c)',"(()=>{const st=strategicTick;strategicTick=function(){st.apply(this,arguments);controlCounts()};return 1})()")
async def worker(b,n,res,wid):
  pg=await b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
  await boot(pg)
  for i in range(n):
    if RELOAD and i:await boot(pg)
    keep=1 if (RELOAD and os.environ.get('KEEP')=='1') else 0;CH=int(os.environ.get('CHUNK','0'))
    try:
      if CH:
        await pg.evaluate('c=>__dg.ev(c)',f"_fsStart({keep})");out=''
        while not out:out=await asyncio.wait_for(pg.evaluate('c=>__dg.ev(c)',f"_fsChunk({int(H*3600)},{CH})"),timeout=120)
        r=json.loads(out)
      else:r=json.loads(await asyncio.wait_for(pg.evaluate('c=>__dg.ev(c)',f"_fsGame({int(H*3600)},{keep})"),timeout=300))
    except Exception as e:r={'won':[0,'none','error:'+str(e)[:60]]}
    r['errs']=errs[:2];res.append(r);print(wid,len(res),json.dumps(r['won']),flush=True)
async def main():
  t0=time.time();res=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    per=[GAMES//WORKERS+(1 if i<GAMES%WORKERS else 0) for i in range(WORKERS)]
    await asyncio.gather(*[worker(b,per[i],res,i) for i in range(WORKERS)])
    await b.close()
  c=collections.Counter(r['won'][1] for r in res);n=len(res);how=collections.Counter(r['won'][2] for r in res)
  print(f"{n} games in {time.time()-t0:.0f}s | "+' '.join(f"{k} {v} ({round(100*v/n)}%)" for k,v in c.most_common())+f" | {dict(how)}")
  if OUT:json.dump(res,open(OUT,'w'))
asyncio.run(main())
