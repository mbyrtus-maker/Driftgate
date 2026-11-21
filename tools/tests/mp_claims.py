# usage: python3 tools/tests/mp_claims.py $PWD/index.html  (needs Playwright with Chromium)
# a guest's guns hit what the guest sees (Nov 2026, the lesson from Ace of the Airways' co-op): a hostile fighter weaves
# across the guest's nose; the guest aims at it as drawn and fires. The host takes the guest's hit claims and deals the
# damage once (its own copy of the guest's shots only spark on small ships). Then forged claims: a target out of reach,
# and a flood faster than the gun fires, are refused.
import asyncio,json,sys,os
from playwright.async_api import async_playwright
FILE=sys.argv[1]
LAT=float(os.environ.get('LAT','0'))   # one-way link delay in seconds, to see what latency does
LINK=r"""(to)=>{window.__mk=(peer,fn)=>({peer,open:true,dead:false,parts:{},n:'',r:{readyState:'open',send:s=>fn(s)},u:{readyState:'open',send:s=>fn(s)},pc:{close(){},connectionState:'connected'}});return 1}"""
async def boot(ctx,name,errs):
  pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(name+': '+str(e.stack)[:500]))
  await pg.goto('file://'+FILE+'?name='+name,timeout=400000);await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=400000)
  await pg.evaluate("c=>__dg.ev(c)",f"(()=>{{$('mpName').value='{name}';return 1}})()")
  return pg
async def ev(pg,code):
  return await pg.evaluate("c=>__dg.ev(c)",code)
# a hostile Ostrova heavy fighter 380 m ahead of the guest, weaving sideways at 140 m/s; never fires, never dies
TGT="""(()=>{const e0=MP.rp.clipid1;const w=worldOf(e0);let out='';inW(w,()=>{qRot(e0.q,0,0,1,_f);qRot(e0.q,1,0,0,_r);const e=makeNPC('patrol','ostrova','heavy',1,{},'test');e.x=e0.x+_f.x*380;e.y=e0.y+_f.y*380;e.z=e0.z+_f.z*380;e.vx=e.vy=e.vz=0;e.ai.frozen=1;e.c0={x:e.x,y:e.y,z:e.z,rx:_r.x,ry:_r.y,rz:_r.z};W.ents.push(e);window._T=e;out=e.id});
  if(!window._nt){window._nt=npcThink;npcThink=function(e,dt){if(e.ai&&e.ai.frozen){const c=e.c0,s=Math.sin(W.t*1.4)*100,v=Math.cos(W.t*1.4)*140;e.x=c.x+c.rx*s;e.y=c.y+c.ry*s;e.z=c.z+c.rz*s;e.vx=c.rx*v;e.vy=c.ry*v;e.vz=c.rz*v;e.hull=e.st.hull;e.shield=e.st.sCap;return}return _nt.apply(this,arguments)}}
  if(!window._ds){window._ds=damageShip;window._dmg=0;damageShip=function(t,d,s,at,k){if(t===window._T&&t.alive&&at&&at.src===MP.rp.clipid1)window._dmg+=d;return _ds.apply(this,arguments)}}return out})()"""
async def main():
  errs=[];res={}
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
    H=await boot(await b.new_context(viewport={'width':1100,'height':700}),'Hosty',errs);C=await boot(await b.new_context(viewport={'width':1100,'height':700}),'Clie',errs)
    async def toC(s):
      if LAT:await asyncio.sleep(LAT)
      try:await C.evaluate("d=>{if(window.MPHOST_READY)__dg.ev('linkRecv(MP.host,'+JSON.stringify(d)+')')}",s)
      except Exception as e:errs.append('relay->C '+str(e)[:200])
    async def toH(s):
      if LAT:await asyncio.sleep(LAT)
      try:await H.evaluate("d=>__dg.ev('linkRecv(window.__HL,'+JSON.stringify(d)+')')",s)
      except Exception as e:errs.append('relay->H '+str(e)[:200])
    await H.expose_function('__toClient',toC);await C.expose_function('__toHost',toH)
    await H.evaluate(LINK);await C.evaluate(LINK)
    await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='halcyon';mpLaunch('halcyon','interceptor');window.__HL=__mk('cli',s=>__toClient(s));return 1})()")
    await H.wait_for_timeout(1500)
    await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()")
    await C.wait_for_timeout(2500)
    await ev(C,"(()=>{selFac='halcyon';mpLaunch('halcyon','interceptor');return 1})()");await C.wait_for_timeout(4000)
    await ev(C,"(()=>{if(S.player.docked)undock();return 1})()");await C.wait_for_function("__dg.ev('!!(W.player&&!S.player.docked)')",timeout=60000);await C.wait_for_timeout(3000)
    print('target:',await ev(H,TGT))
    await C.wait_for_function("__dg.ev('!!(W.pup&&Object.values(W.pup).some(e=>e.cls===\"heavy\"&&e.side===\"ostrova\"))')",timeout=30000)
    for wpn in ['kinetic','laser']:
      await ev(H,"(()=>{window._dmg=0;MP.claimN={ok:0,noShip:0,noTarget:0,range:0,rate:0};return 1})()")
      # the guest holds still, aims at the weaving fighter as drawn (with lead for the cannon) and fires for 8 s
      await ev(C,"""(()=>{S.player.wpn='%s';window._aim=setInterval(()=>{const p=W.player;const T=Object.values(W.pup).find(e=>e.cls==='heavy'&&e.side==='ostrova');if(!T)return;let tx=T.x,ty=T.y,tz=T.z;
        if(S.player.wpn==='kinetic'){const t=d3(p,T)/(p.st.shotSpd||SHOT_SPD);tx+=T.vx*t;ty+=T.vy*t;tz+=T.vz*t}faceDir(p,tx-p.x,ty-p.y,tz-p.z,1);p.vx=p.vy=p.vz=0;p.energy=p.st.eCap;W.tgt={kind:'ship',ref:T}},16);window._gh=0;if(!window._ns){window._ns=netSend;netSend=function(o){if(o&&o.t==='gh')window._gh++;return _ns.apply(this,arguments)}}keys.Space=true;return 1})()"""%wpn)
      await C.wait_for_timeout(8000)
      await ev(C,"(()=>{keys.Space=false;clearInterval(_aim);return 1})()");await C.wait_for_timeout(1500)
      r=json.loads(await ev(H,"JSON.stringify({dmg:Math.round(_dmg),claims:MP.claimN,perShot:Math.round(MP.rp.clipid1.st.dmg*10)/10})"));r["guestHits"]=await ev(C,"window._gh||0")
      res[wpn]=r;print(wpn,r)
    # forged claims: a target far away, and a flood
    print('forged:',await ev(H,"""(()=>{MP.claimN={ok:0,noShip:0,noTarget:0,range:0,rate:0};const e0=MP.rp.clipid1;_T.c0.x=e0.x+9000;
      _T.x=_T.c0.x;hClaim('clipid1',{t:'gh',id:_T.id,k:'k'});_T.c0.x=e0.x+300;_T.x=e0.x+300;_T.y=e0.y;_T.z=e0.z;
      for(let i=0;i<80;i++)hClaim('clipid1',{t:'gh',id:_T.id,k:'k'});hClaim('clipid1',{t:'gh',id:'nope',k:'k'});return JSON.stringify(MP.claimN)})()"""))
    print('errors',[e for e in errs][:6]);await b.close()
asyncio.run(main())
