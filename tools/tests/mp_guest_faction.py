# usage: python3 tools/tests/mp_guest_faction.py index.html  (needs Playwright with Chromium)
# a faction guest over the loopback link: hired wingman (follows, stands down when docked, rejoins), hull insurance and a
# covered loss, patronage, and the charge reticle on the guest's own screen; the host's ledger stays exact
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
    await ev(C,"(()=>{selFac='halcyon';mpLaunch('halcyon','interceptor');return 1})()");await C.wait_for_timeout(4000)
    print('guest joined:',await ev(C,"(()=>JSON.stringify({running,fac:S.player.faction,cls:S.player.cls,sector:S.player.sector,docked:S.player.docked}))()"))
    # money and a bought hull for the guest, set on the host and synced down
    await ev(H,"(()=>{const P=S.pilots.clipid1;devLedger(()=>{transfer(P.faction,'player',0)});P.credits+=0;const n=30000;S.econ.treasury[P.faction]-=n;P.credits+=n;P.cls='striker';P.hullPaid=hullPrice('striker');for(const c of readyCl()){sendPR(c,true,true);send(c.L,syncMsg(c))}return 1})()")
    await C.wait_for_timeout(1200)
    async def act(a,arg):
      await ev(C,f"(()=>{{netSend({{t:'act',act:'{a}',arg:'{arg}'}});return 1}})()");await C.wait_for_timeout(1500)
      return await ev(C,"dockErr")
    print('hire:',await act('hire','interceptor'))
    print('guest sees contract:',await ev(C,"(()=>JSON.stringify({hire:S.player.hire&&S.player.hire.cls,live:!!hireLive(S.player)}))()"))
    print('insure:',await act('insure',''))
    print('guest sees policy:',await ev(C,"(()=>JSON.stringify({policy:S.player.policy&&S.player.policy.cls,live:!!insLive(S.player)}))()"))
    opt=await ev(H,"(()=>{const P=S.pilots.clipid1;return runAs('clipid1',()=>{const o=patOpts(P.faction,S.stations[FAC_HOME(P.faction)]);return o.length?String(o[0].id):''})})()")
    tr0=await ev(H,"S.econ.treasury.halcyon")
    print('patron:',await act('patron',f'{opt}|Clie Star') if opt else 'no project open')
    print('patronage on host:',await ev(H,f"(()=>JSON.stringify({{treasury:Math.round(S.econ.treasury.halcyon-{tr0}),list:(S.pat&&S.pat.halcyon||[]).map(p=>[p.kind,p.paid,p.top||p.name||null])}}))()"))
    # launch: the wingman falls in on the guest's ship on the host
    await ev(C,"(()=>{undock();const p=W.player;p.x+=1500;p.z+=1200;p.vx=p.vy=p.vz=0;return 1})()");await C.wait_for_timeout(3000)
    w1=await ev(H,"(()=>{const H=HIRE_E.clipid1,e=MP.rp.clipid1;return JSON.stringify({wing:!!(H&&H.e&&H.e.alive),follows:!!(H&&e&&H.e.order&&H.e.order.tgt===e),dist:H&&e?Math.round(d3(H.e,e)):null})})()")
    print('in space:',w1)
    await C.wait_for_timeout(6000)
    wid=await ev(H,"HIRE_E.clipid1&&HIRE_E.clipid1.e.id")
    print('guest sees wingman:',await ev(C,f"(()=>{{const x=W.ents.find(x=>x.id==='{wid}');return x?JSON.stringify({{cls:x.cls,side:x.side,alive:x.alive,d:Math.round(d3(x,W.player))}}):'not in guest world'}})()"))
    print('host wingman distance now:',await ev(H,"(()=>{const H=HIRE_E.clipid1,e=MP.rp.clipid1;return H&&e?Math.round(d3(H.e,e)):null})()"))
    # dock: the wingman stands down and its kit goes home
    await ev(C,"(()=>{const p=W.player,E=W.stationEnt;p.x=E.x+260;p.y=E.y;p.z=E.z;p.vx=p.vy=p.vz=0;return 1})()");await C.wait_for_timeout(1200)
    await ev(C,"(()=>{finishDock(W.stationEnt);return 1})()");await C.wait_for_timeout(2500)
    print('docked:',await ev(H,"(()=>JSON.stringify({docked:S.pilots.clipid1.docked,wing:!!HIRE_E.clipid1}))()"))
    # launch again: a wingman rejoins and follows the new ship
    await ev(C,"(()=>{undock();return 1})()");await C.wait_for_timeout(3000)
    print('relaunch:',await ev(H,"(()=>{const H=HIRE_E.clipid1,e=MP.rp.clipid1;return JSON.stringify({wing:!!(H&&H.e&&H.e.alive),follows:!!(H&&e&&H.e.order&&H.e.order.tgt===e)})})()"))
    # a covered loss: the guest's striker is destroyed
    print('loss:',await ev(H,"(()=>{const e=MP.rp.clipid1;if(!e)return 'no ship';inW(worldOf(e),()=>{e.hull=0;e.alive=false;rpDeath(e)});const P=S.pilots.clipid1;return JSON.stringify({cls:P.cls,voucher:P.voucher||null,wing:!!HIRE_E.clipid1})})()"))
    await C.wait_for_timeout(1500)
    print('wingman after loss:',await ev(H,"(()=>JSON.stringify({wing:!!HIRE_E.clipid1}))()"))
    print('guest after loss:',await ev(C,"(()=>JSON.stringify({cls:S.player.cls,voucher:S.player.voucher||null,feed:FEED.slice(-6).map(f=>f.msg).filter(m=>/insured|voucher|wingman/i.test(m))}))()"))
    # the charge reticle on the guest's own screen
    print('guest reticle:',await ev(C,"(()=>{const P=S.player,c0=P.cls;P.cls='skiff';const s=S.sectors[W.sid],a=s.ast[0];W.tgt={kind:'ast',ref:a};const p=W.player;let r;try{if(W.dead){W.dead=0;p.alive=true}p.x=a.x;p.y=a.y;p.z=a.z-(astR(a)+150);p.vx=p.vy=p.vz=0;qLook(0,0,1,0,1,0,p.q);const cv=document.getElementById('ov').getContext('2d');blDraw(cv);const pr=blPredict(p,P,a),F=blFly(p,P);r=JSON.stringify({hit:!!pr,inRange:pr&&pr.ok,flyEnd:!!F.end})}catch(x){r='THROW '+x.message}P.cls=c0;W.tgt=null;return r})()"))
    print('ledger:',await ev(H,"(()=>{const l=ledger();let bad=[];for(const e of RAWS)if(Math.abs(l.tot[e]-S.ledger0.tot[e])>1e-6)bad.push(e);return bad.length?'DRIFT '+bad:'exact'})()"))
    print('errors:',[e for e in errs if 'favicon' not in e][:6])
    await b.close()
asyncio.run(main())
