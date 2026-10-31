# usage: python3 tools/tests/mp_guest_jump.py $PWD/index.html  (needs Playwright with Chromium)
# a guest in a Light Miner (which flies with Ward Drones) jumps from Varkesh Hold to Iron Hush: the jump completes, the
# screen fades back in, host and guest agree on the system (Oct 2026: the guest's drones had no home and the jump threw)
import asyncio,json,sys
from playwright.async_api import async_playwright
FILE=sys.argv[1]
LINK=r"""(to)=>{window.__mk=(peer,fn)=>({peer,open:true,dead:false,parts:{},n:'',r:{readyState:'open',send:s=>fn(s)},u:{readyState:'open',send:s=>fn(s)},pc:{close(){},connectionState:'connected'}});return 1}"""
async def boot(ctx,name,errs):
  pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(name+': '+str(e.stack)[:500]))
  pg.on('console',lambda m:errs.append(name+' console: '+m.text[:400]) if m.type in ('error','warning') and 'TUNNEL' not in m.text and 'fonts' not in m.text else None)
  await pg.goto('file://'+FILE+'?name='+name,timeout=400000);await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=400000)
  await pg.evaluate("c=>__dg.ev(c)",f"(()=>{{$('mpName').value='{name}';legGrant('{name}','halcyon',true,'interceptor',null);return 1}})()")
  return pg
async def ev(pg,code):
  return await pg.evaluate("c=>__dg.ev(c)",code)
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
    H=await boot(await b.new_context(viewport={'width':1200,'height':800}),'Hosty',errs);C=await boot(await b.new_context(viewport={'width':1200,'height':800}),'Clie',errs)
    async def toC(s):
      try:await C.evaluate("d=>{if(window.MPHOST_READY)__dg.ev('linkRecv(MP.host,'+JSON.stringify(d)+')')}",s)
      except Exception as e:errs.append('relay->C '+str(e)[:200])
    async def toH(s):
      try:await H.evaluate("d=>__dg.ev('linkRecv(window.__HL,'+JSON.stringify(d)+')')",s)
      except Exception as e:errs.append('relay->H '+str(e)[:200])
    await H.expose_function('__toClient',toC);await C.expose_function('__toHost',toH)
    await H.evaluate(LINK);await C.evaluate(LINK)
    print('host:',await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='halcyon';mpLaunch('halcyon','interceptor');window.__HL=__mk('cli',s=>__toClient(s));return JSON.stringify({unb:!!S.unb,fac:S.player.faction,host:NET.host})})()"))
    await H.wait_for_timeout(1500)
    await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()")
    await C.wait_for_timeout(2500)
    await ev(C,"(()=>{selFac='varkesh';mpLaunch('varkesh','skiff');return 1})()");await C.wait_for_timeout(4000)
    print('guest joined:',await ev(C,"(()=>JSON.stringify({running,fac:S.player.faction,cls:S.player.cls,sector:S.player.sector,docked:S.player.docked}))()"))
    C.on('console',lambda m:print('C console:',m.text[:300]) if m.type in('error',) else None)
    print('guest:',await ev(C,"S.player.faction+' '+S.player.cls+' '+S.player.sector+' docked '+S.player.docked+' neigh '+NEIGH[S.player.sector]"))
    await ev(C,"(()=>{window.__fe=[];const of=frameErr;frameErr=function(w,e){__fe.push(w+': '+String(e&&e.stack||e).slice(0,500));return of.apply(this,arguments)};undock();return 1})()");await C.wait_for_timeout(3000)
    print('host og:',await ev(H,"JSON.stringify((S.og||[]).map(o=>o.a+'-'+o.b+' '+o.stage))+' gateDown '+JSON.stringify(S.gateDown||{})"))
    for step in range(2):
      r=await ev(C,"(()=>{const P=S.player;if(P.sector==='ih')return 'at ih';const nb=NEIGH[P.sector];const to=nb.includes('ih')?'ih':(HOP[P.sector]&&nb.sort((a,b)=>HOP[a]['ih']-HOP[b]['ih'])[0]);try{doJump(to)}catch(e){return 'THROW '+e.stack.slice(0,500)}return 'jumped to '+to+' fade '+$('fade').style.opacity})()")
      print('jump:',r);await C.wait_for_timeout(5000)
      print('  guest state:',await ev(C,"JSON.stringify({sid:W&&W.sid,sector:S.player.sector,fade:$('fade').style.opacity,running,fe:__fe.slice(0,4),ents:W&&W.ents.length})"))
      print('  host sees guest in:',await ev(H,"S.pilots.clipid1&&S.pilots.clipid1.sector"))
    print('errors',errs[:8]);await b.close()
asyncio.run(main())
