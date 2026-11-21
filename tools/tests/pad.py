# usage: python3 tools/tests/pad.py [index.html]  (needs Playwright with Chromium)
# controller support (Nov 2026) with a fake pad: Cross launches, a stick resting off centre and a trigger axis parked at -1
# don't steer, the left stick steers and the right rolls, R2 fires, L2 thrusts, the mouse doesn't steer while the pad is in
# use, prompts name pad buttons, Circle closes the map, and a button can be moved to another action.
import asyncio,json,os,sys
from playwright.async_api import async_playwright
GAME='file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')
FAKE="""(()=>{const B=()=>Array.from({length:18},()=>({pressed:false,value:0}));window.__pad={id:'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:B()};
  window.__press=(i,on)=>{__pad.buttons[i]={pressed:!!on,value:on?1:0}};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad],configurable:true})})()"""
fails=[]
def check(name,ok,info=''):
  print(('ok  ' if ok else 'FAIL'),name,info)
  if not ok:fails.append(name)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1200,'height':760});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e.stack)[:400]))
    await pg.add_init_script(FAKE)
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=120000)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_function('__dg.ev("!!(S&&W&&W.player)")',timeout=60000)
    await pg.wait_for_timeout(800)
    # a worn stick resting off centre for the first seconds: no steering
    await pg.evaluate("__pad.axes=[0.13,-0.11,0,0]");await pg.wait_for_timeout(3600)
    r=json.loads(await ev("JSON.stringify({lx:PAD.lx,ly:PAD.ly,rest:PAD.rest.slice(0,2).map(v=>+v.toFixed(2))})"))
    check('a stick resting off centre reads as centred',r['lx']==0 and r['ly']==0,r)
    await ev("(()=>{if(!S.player.docked){S.player.docked='station';ghostSync()}return 1})()")
    await pg.evaluate("__press(0,1)");await pg.wait_for_timeout(250);await pg.evaluate("__press(0,0)");await pg.wait_for_timeout(1500)
    check('Cross launches',await ev("!S.player.docked"),await ev("String(S.player.docked)"))
    check('prompts name pad buttons',await ev("kb('act')")=='Cross',await ev("kb('act')"))
    # the mouse off to one side doesn't steer while the pad is in use
    r=await ev("(()=>{mouse.in=true;mouse.aim=true;mouse.free=false;mouse.x=VW*.95;mouse.y=VH/2;return JSON.stringify(steerInput())})()")
    check('the mouse does not steer while the pad is in use',json.loads(r)['yaw']==0,r)
    # left stick steers
    await pg.evaluate("__pad.axes=[0.13+0.8,-0.11,0,0]");await pg.wait_for_timeout(600)
    r=json.loads(await ev("JSON.stringify({si:steerInput(),wy:+(W.player.wy||0).toFixed(3)})"))
    check('the left stick steers',r['si']['yaw']<-.4 and abs(r['wy'])>.05,r)
    await pg.evaluate("__pad.axes=[0.13,-0.11,0.9,0]");await pg.wait_for_timeout(600)
    r=json.loads(await ev("JSON.stringify({roll:+padRoll().toFixed(2),wz:+(W.player.wz||0).toFixed(3)})"))
    check('the right stick rolls',r['roll']>.4 and abs(r['wz'])>.05,r)
    await pg.evaluate("__pad.axes=[0.13,-0.11,0,0]")
    # R2 fires, L2 thrusts
    await ev("(()=>{W.player.energy=W.player.st.eCap;window._n0=W.shots.filter(s=>s.src===W.player).length;window._v0=hyp(W.player.vx,W.player.vy,W.player.vz);return 1})()")
    await pg.evaluate("__press(7,1);__press(6,1)");await pg.wait_for_timeout(1200);await pg.evaluate("__press(7,0);__press(6,0)");await pg.wait_for_timeout(300)
    r=json.loads(await ev("JSON.stringify({shots:W.shots.filter(s=>s.src===W.player).length-_n0,fired:W.player.lastFire>0,v0:Math.round(_v0),v1:Math.round(hyp(W.player.vx,W.player.vy,W.player.vz)),space:!!keys.Space,w:!!keys.KeyW})"))
    check('R2 fires and L2 thrusts, and both let go',(r['shots']>0 or r['fired']) and r['v1']>r['v0'] and not r['space'] and not r['w'],r)
    # a non-standard pad with a trigger axis parked at -1: ignored
    await ev("(()=>{PAD.restId=null;return 1})()");await pg.evaluate("__pad.mapping='';__pad.id='Mac pad';__pad.axes=[0,0,-1,0]");await pg.wait_for_timeout(3600)
    r=json.loads(await ev("JSON.stringify({rx:PAD.rx,trig:PAD.trig.slice(0,4)})"))
    check('a trigger parked at -1 on a stick axis is ignored',r['rx']==0 and r['trig'][2]==True,r)
    await pg.evaluate("__pad.mapping='standard';__pad.axes=[0,0,0,0]")
    # Circle closes the map
    await ev("(()=>{toggleMap();return 1})()");await pg.wait_for_timeout(300)
    await pg.evaluate("__press(1,1)");await pg.wait_for_timeout(200);await pg.evaluate("__press(1,0)");await pg.wait_for_timeout(300)
    check('Circle closes the map',await ev("$('map').hidden"))
    # move Fire to Cross: Dock/launch takes R2
    await ev("(()=>{PAD.capturing='fire';PAD.capPrev=null;return 1})()");await pg.wait_for_timeout(200)
    await pg.evaluate("__press(0,1)");await pg.wait_for_timeout(200);await pg.evaluate("__press(0,0)");await pg.wait_for_timeout(200)
    r=json.loads(await ev("JSON.stringify({fire:padMap().fire,act:padMap().act,saved:JSON.parse(localStorage.getItem('driftgate.pad')||'{}')})"))
    check('a button moves to another action and swaps',r['fire']==0 and r['act']==7,r)
    await ev("(()=>{toggleSheet('help');return 1})()");await pg.wait_for_timeout(500)
    check('the manual lists the controller',await ev("!!$('padState')&&$('keyList').textContent.includes('Cannon or laser')"))
    await pg.evaluate("document.getElementById('padState').scrollIntoView()");await pg.wait_for_timeout(300);await pg.screenshot(path=os.environ.get('SHOT','/tmp/pad_help.png'))
    check('no page errors',not errs,errs[:3])
    await b.close()
  print('ALL OK' if not fails else 'FAILED: '+', '.join(fails))
asyncio.run(main())
