# usage: python3 tools/tests/mp_signature.py $PWD/index.html  (needs Playwright with Chromium)
# faction signature hulls flown by a guest (Nov 2026): a Varkesh guest converts a Heavy Miner to a Bombard through the dock
# (the host does the conversion), launches and holds fire: the host fires the shells and they land on a hostile target.
# Then the guest flies a Gannet and presses C: the host launches the barrage. Then a Vesper: hold fire, release, the host
# fires the railgun.
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
    await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='varkesh';mpLaunch('varkesh','interceptor');window.__HL=__mk('cli',s=>__toClient(s));return 1})()")
    await H.wait_for_timeout(1500)
    await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()")
    await C.wait_for_timeout(2500)
    await ev(C,"(()=>{selFac='varkesh';mpLaunch('varkesh','skiff');return 1})()");await C.wait_for_timeout(4000)
    # the guest docked at home in a Heavy Miner with credits
    print('setup:',await ev(H,"(()=>{const P=S.pilots.clipid1;P.cls='dredger';P.credits=20000;P.docked='station';P.sector=FAC_HOME('varkesh');return P.faction+' '+P.cls+' '+P.sector})()"))
    await H.wait_for_timeout(6000)
    print('guest sees:',await ev(C,"S.player.cls+' '+S.player.credits+' docked '+S.player.docked"))
    await ev(C,"(()=>{openDock();dockTab='ship';renderDock();return 1})()");await C.wait_for_timeout(500)
    print('card:',await ev(C,"(()=>{const b=document.querySelector('[data-act=sigconv]');return b?(b.disabled?'disabled':'enabled')+' '+b.innerText.split('\\n')[0]:'none'})()"))
    await ev(C,"(()=>{document.querySelector('[data-act=sigconv]').click();return 1})()");await C.wait_for_timeout(3000)
    print('converted (host):',await ev(H,"S.pilots.clipid1.cls+' credits '+S.pilots.clipid1.credits"),'| guest:',await ev(C,"S.player.cls+' · '+$('dErr').textContent"))
    await ev(C,"(()=>{undock();return 1})()");await C.wait_for_timeout(5000)
    print('target:',await ev(H,TGT))
    # the guest aims at the target and holds fire
    await ev(C,"(()=>{window._aim=setInterval(()=>{const p=W.player;const T=W.ents.find(e=>e.ai&&e.cls==='heavy'&&e.side==='ostrova');if(T)faceDir(p,T.x-p.x,T.y-p.y,T.z-p.z,1);p.vx=p.vy=p.vz=0},16);keys.Space=true;return 1})()")
    await H.wait_for_function("__dg.ev('!_T.alive||_T.hull+_T.shield<300')",timeout=120000)
    print('shells on host:',await ev(H,"(()=>{const e0=MP.rp.clipid1;const w=worldOf(e0);return JSON.stringify({cls:e0.cls,shells:w.shots.filter(s=>s.shell).length,target:_T.alive?Math.round(_T.hull+_T.shield):'dead'})})()"))
    await ev(H,TGT)
    await ev(C,"(()=>{keys.Space=false;return 1})()")
    # a Gannet: set on both ends (the hull itself is tested above), then C
    await ev(H,"(()=>{const P=S.pilots.clipid1;P.cls='gannet';P.gcell=12;const e=MP.rp.clipid1;if(e){e.cls='gannet';e.st=shipStats(P.faction,'gannet',P.tiers,P.tune)}return 1})()")
    await ev(C,"(()=>{S.player.cls='gannet';S.player.gcell=12;refreshPlayerStats();const T=W.ents.find(e=>e.ai&&e.cls==='heavy'&&e.side==='ostrova');if(T)W.tgt={kind:'ship',ref:T};W.mslCd=0;fireMissile();return 1})()")
    await C.wait_for_timeout(1500)
    print('barrage on host:',await ev(H,"(()=>{const e0=MP.rp.clipid1;const w=worldOf(e0);return JSON.stringify({minis:w.missiles.filter(m=>m.mini).length,cells:S.pilots.clipid1.gcell})})()"))
    await C.wait_for_timeout(6000)
    # a Vesper: hold fire until charged, release
    await ev(H,"(()=>{const P=S.pilots.clipid1;P.cls='vesper';const e=MP.rp.clipid1;if(e){e.cls='vesper';e.st=shipStats(P.faction,'vesper',P.tiers,P.tune);e.energy=e.st.eCap}window._h0=_T.alive?_T.hull+_T.shield:0;return 1})()")
    await ev(C,"(()=>{S.player.cls='vesper';refreshPlayerStats();keys.Space=true;return 1})()");await C.wait_for_timeout(9000)
    print('rail charge (host):',await ev(H,"(()=>{const e=MP.rp.clipid1;return JSON.stringify({railC:!!e.railC,k:railK(e).toFixed(2)})})()"))
    await ev(C,"(()=>{keys.Space=false;return 1})()");await C.wait_for_timeout(2500)
    print('rail hit (host):',await ev(H,"(()=>{return JSON.stringify({before:Math.round(_h0),now:_T.alive?Math.round(_T.hull+_T.shield):'dead'})})()"))
    print('errors',[e for e in errs if 'TUNNEL' not in e][:8]);await b.close()
asyncio.run(main())
