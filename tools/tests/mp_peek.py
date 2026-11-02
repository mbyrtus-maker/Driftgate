# usage: python3 tools/tests/mp_peek.py $PWD/index.html  (needs Playwright with Chromium)
# an Ostrova guest's drive peek (Nov 2026): the guest spools on the map button, jumps into the neighbouring system; the host
# moves the guest's ship there and drains it (shield 0, systems down); after 20 s the guest jumps back to where it left and the
# host agrees.
import asyncio,json,sys
from playwright.async_api import async_playwright
FILE=sys.argv[1]
LINK=r"""(to)=>{window.__mk=(peer,fn)=>({peer,open:true,dead:false,parts:{},n:'',r:{readyState:'open',send:s=>fn(s)},u:{readyState:'open',send:s=>fn(s)},pc:{close(){},connectionState:'connected'}});return 1}"""
async def boot(ctx,name,errs):
  pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(name+': '+str(e.stack)[:500]))
  pg.on('console',lambda m:errs.append(name+' console: '+m.text[:400]) if m.type=='error' and 'TUNNEL' not in m.text and 'fonts' not in m.text else None)
  await pg.goto('file://'+FILE+'?name='+name,timeout=400000);await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=400000)
  await pg.evaluate("c=>__dg.ev(c)",f"(()=>{{$('mpName').value='{name}';return 1}})()")
  return pg
async def ev(pg,code):
  return await pg.evaluate("c=>__dg.ev(c)",code)
TGT="""(()=>{const e0=MP.rp.clipid1;if(!e0)return 'no rp';const w=worldOf(e0);let out='';inW(w,()=>{qRot(e0.q,0,0,1,_f);const e=makeNPC('patrol','ostrova','heavy',1,{},'test');e.x=e0.x+_f.x*600;e.y=e0.y+_f.y*600;e.z=e0.z+_f.z*600;e.vx=e.vy=e.vz=0;e.ai.frozen=1;W.ents.push(e);window._T=e;out=Math.round(e.hull+e.shield)});
  if(!window._nt){window._nt=npcThink;npcThink=function(e,dt){if(e.ai&&e.ai.frozen){e.vx=e.vy=e.vz=0;return}return _nt.apply(this,arguments)}}return out})()"""
AIM="""(()=>{const p=W.player;const P=S.pilots;return 1})()"""
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
    await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='ostrova';mpLaunch('ostrova','interceptor');window.__HL=__mk('cli',s=>__toClient(s));return 1})()")
    await H.wait_for_timeout(1500)
    await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()")
    await C.wait_for_timeout(2500)
    await ev(C,"(()=>{selFac='ostrova';mpLaunch('ostrova','scout');return 1})()");await C.wait_for_function('__dg.ev("!!(S&&W&&W.player&&S.player&&S.player.faction===\\"ostrova\\")")',timeout=120000);await C.wait_for_timeout(2000)
    await ev(C,"(()=>{undock();return 1})()");await C.wait_for_timeout(4000)
    to=await ev(C,"NEIGH[S.player.sector][0]");frm=await ev(C,"S.player.sector")
    print('guest',await ev(C,"S.player.faction+' '+S.player.cls+' in '+S.player.sector+' docked '+S.player.docked"),'peek to',to)
    await ev(C,f"(()=>{{toggleMap();mapSel='{to}';renderMapSide();const b=$('bPeek');window._btn=b?(b.disabled?'disabled':'enabled'):'none';if(b)b.click();return 1}})()")
    print('button',await ev(C,"window._btn"))
    await C.wait_for_function('__dg.ev("!!S.player.peek")',timeout=180000);await C.wait_for_timeout(5000)
    print('host during peek:',await ev(H,f"(()=>{{const P=S.pilots.clipid1,e=MP.rp.clipid1;return JSON.stringify({{sector:P.sector,to:'{to}',rp:!!e,shield:e?Math.round(e.shield):null,drained:e?!!e.peek:null,boot:e&&e.boot?+(e.boot-worldOf(e).t).toFixed(1):null}})}})()"))
    await C.wait_for_function('__dg.ev("!S.player.peek")',timeout=240000);await C.wait_for_timeout(5000)
    print('back:',await ev(C,"S.player.sector+' cd '+Math.round(S.player.peekCd-S.T)"),'| host:',await ev(H,"(()=>{const e=MP.rp.clipid1;return S.pilots.clipid1.sector+' drained '+(e?!!e.peek:'-')})()"),'| from',frm)
    print('errors',[e for e in errs if 'TUNNEL' not in e][:8]);await b.close()
asyncio.run(main())
