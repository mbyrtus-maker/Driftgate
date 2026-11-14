# Gate jump sounds and lights (from Driftgate Beyond, 14 Nov 2026; a departing miner's drones leave with it): the charge starts so its blast lands on the jump; low beeps at 3, 2 and 1 seconds
# and the high beep at the jump; the arrival plays no second blast; a cancelled countdown fades the charge; a jump with
# no countdown plays from just before the blast; without the clips the old sounds play. The audio calls are recorded by
# stand-ins (a headless browser has no running sound), so this tests the timing logic, not the sound itself.
import asyncio,json,os
from playwright.async_api import async_playwright
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
PLACE="(()=>{const p=W.player,g=GATES[W.sid][0],l=Math.hypot(g.x,g.y,g.z),d={x:g.x/l,y:g.y/l,z:g.z/l};p.x=g.x-d.x*300;p.y=g.y-d.y*300;p.z=g.z-d.z*300;p.vx=p.vy=p.vz=0;faceInstant(p,d.x,d.y,d.z);W.gc=null;return 1})()"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1280,'height':800});errs=[];bad=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    def check(n,ok,d=''):
      print(('ok  ' if ok else 'FAIL'),n,str(d)[:400])
      if not ok:bad.append(n)
    await pg.goto(GAME+'?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()")
    await pg.wait_for_function('__dg.ev("!!(S&&W&&W.player)")',timeout=60000)
    ev=lambda c:pg.evaluate('(c)=>__dg.ev(c)',c)
    r=json.loads(await ev("JSON.stringify({m:['cdBeep','cdGo','hjump'].map(k=>SND.m?SND.m[k]:(JSON.parse(document.getElementById('sndpack').textContent).m[k])),lead:HJ.lead})"))
    check('the pack holds the two beeps (about half a second each) and the 9.6 s jump clip',r['m'][0] and .4<r['m'][0][0]<.65 and .4<r['m'][1][0]<.65 and 9<r['m'][2][0]<10,r)
    # stand-ins that record what would be played, with the countdown's clock at the time
    await ev("""(()=>{window._jl=[];const T=()=>W.gc?+W.gc.t.toFixed(2):(W.jump?'jump':'-');
      SND.b.cdBeep=SND.b.cdBeep||{};SND.b.cdGo=SND.b.cdGo||{};SND.b.hjump=SND.b.hjump||{};
      hjLive=()=>!!HJ.h;hjStart=(off,cd)=>{_jl.push(['start',+off.toFixed(2),!!cd,T()]);HJ.h={cd:!!cd,go:!cd};return true};hjStop=()=>{if(HJ.h){_jl.push(['stop',T()]);HJ.h=null}};
      smp=(n)=>{if(n==='cdBeep'||n==='cdGo')_jl.push([n,T()]);return true};
      if(S.player.docked)undock();return 1})()""")
    await pg.wait_for_function('__dg.ev("!S.player.docked&&!W.docking")',timeout=30000)
    await pg.wait_for_function('__dg.ev("W.ents.some(x=>x.type===\'ship\'&&x.alive&&!x.isPlayer&&!x.tok&&x.st)")',timeout=30000)
    # another ship through a gate: it is removed at once as before, and leaves a half-second picture that lunges through the ring
    r9=json.loads(await ev("(()=>{const g=GATES[W.sid][0],d=gateAxis(g);let e=W.ents.find(x=>x.type==='ship'&&x.alive&&!x.isPlayer&&!x.tok&&x.st);if(!e)return JSON.stringify({none:1});W.gouts=[];e.x=g.x-d.x*60;e.y=g.y-d.y*60;e.z=g.z-d.z*60;e.gj={g,t:GATE_HOLD};const n0=W.ents.length,nd=(e.drones||[]).filter(x=>x.alive&&W.ents.includes(x)).length,fx0=W.fx.length,done=npcGateJump(e,g,.05,1),o=W.gouts[0];if(!o)return JSON.stringify({done,ghost:0});const P=a=>{gateGhostAt(o,a);return[_u.x-g.x,_u.y-g.y,_u.z-g.z]},al=v=>+(v[0]*d.x+v[1]*d.y+v[2]*d.z).toFixed(0);return JSON.stringify({done,gone:!W.ents.includes(e)&&W.ents.length===n0-1-nd,ghost:W.gouts.length,flash:W.fx.length-fx0,a0:al(P(0)),ac:al(P(GOUT.tc)),a1:al(P(GOUT.tc+.2)),pulse0:gatePulse(g),pT:+(g.pT-W.t).toFixed(2)})})()"))
    if r9.get('none'):print('note no AI ship in this system to test a departure with')
    else:
      check('an AI ship jumping out is removed at once and leaves a picture that starts where it was, reaches the ring\'s centre and runs on through it',r9['done'] is True and r9['gone'] and r9['ghost']==1 and r9['a0']==-60 and r9['ac']==0 and r9['a1']>200 and r9['pulse0']==0 and abs(r9['pT']-.16)<.02,r9)
      await pg.wait_for_timeout(1500)
      r10=json.loads(await ev("JSON.stringify({left:(W.gouts||[]).length})"))
      check('the picture is gone within a second',r10['left']==0,r10)
    sid0=await ev("W.sid");await ev(PLACE)
    await pg.wait_for_function('__dg.ev("W.sid")!=="%s"'%sid0,timeout=40000)
    L=json.loads(await ev("JSON.stringify(_jl)"));st=[x for x in L if x[0]=='start'];bp=[x for x in L if x[0]=='cdBeep'];go=[x for x in L if x[0]=='cdGo']
    hold=await ev("GATE_HOLD")
    check('the charge starts once, from its beginning, about %.2f s before the jump'%r['lead'],len(st)==1 and st[0][2] is True and st[0][1]<.4 and isinstance(st[0][3],(int,float)) and abs((hold-st[0][3])-(r['lead']-st[0][1]))<.25,st)
    check('three low beeps, at 3, 2 and 1 seconds to go',len(bp)==3 and all(isinstance(x[1],(int,float)) for x in bp) and [round(hold-x[1]) for x in bp]==[3,2,1],bp)
    check('one high beep, as the ship jumps',len(go)==1 and L.index(go[0])>L.index(bp[-1]),go)
    check('the charge is not stopped, and the arrival plays no second blast',not [x for x in L if x[0]=='stop'] and len(st)==1 and await ev("!!(HJ.h&&HJ.h.go)"),L)
    # a cancelled countdown: line up at a gate in the new system, then turn away
    await ev("HJ.h=null;_jl.length=0;1");await pg.wait_for_function('__dg.ev("!W.jump&&!!W.player&&!W.player.inJump")',timeout=30000);await pg.wait_for_timeout(1500);await ev(PLACE)
    await pg.wait_for_function('__dg.ev("_jl.some(x=>x[0]===\'start\')")',timeout=20000)
    await ev("(()=>{const p=W.player,g=GATES[W.sid][0];faceInstant(p,-g.x,-g.y,-g.z);p.x+=g.x>0?-3000:3000;return 1})()")
    await pg.wait_for_function('__dg.ev("_jl.some(x=>x[0]===\'stop\')")',timeout=15000)
    L2=json.loads(await ev("JSON.stringify(_jl)"))
    check('turning away from the gate fades the charge out, with no high beep',[x[0] for x in L2 if x[0] in('stop','cdGo')]==['stop'] and await ev("!W.gc&&!W.jump&&!HJ.h"),L2)
    # a jump with no countdown plays from just before the blast and cannot be cancelled
    r3=json.loads(await ev("(()=>{_jl.length=0;HJ.h=null;SFX.jump();const a=JSON.stringify(_jl);auFrame();SFX.jump();return JSON.stringify({a:JSON.parse(a),after:_jl.length,go:!!(HJ.h&&HJ.h.go)})})()"))
    check('a jump with no countdown starts the clip just before the blast, once',len(r3['a'])==1 and r3['a'][0][0]=='start' and abs(r3['a'][0][1]-(r['lead']-.12))<.02 and r3['a'][0][2] is False and r3['after']==1 and r3['go'],r3)
    # the gate's power-up follows the charge: nothing before it starts, half way at half, full at the jump, and only at that gate
    r5=json.loads(await ev("(()=>{const G=GATES[W.sid],g=G[0],o=W.gc,j=W.jump;W.jump=null;W.gc={g,t:GATE_HOLD-HJ.lead-.2,last:0};const a=gateChK(g),a0=gateDiscA(g,1);W.gc.t=GATE_HOLD-HJ.lead/2;const b=gateChK(g);W.gc.t=GATE_HOLD;const c=gateChK(g),a1=gateDiscA(g,1),other=G[1]?gateChK(G[1]):0;W.gc=null;const none=gateChK(g);W.jump={to:g.to,t:.1,g};const jk=gateChK(g);W.jump=j;W.gc=o;return JSON.stringify({a,b:+b.toFixed(2),c,other,none,jk,a0:+a0.toFixed(2),a1:+a1.toFixed(2)})})()"))
    check('the gate powers up with the charge (0 before it, half at half, full at the jump) and only the gate being used',r5['a']==0 and r5['b']==.5 and r5['c']==1 and r5['other']==0 and r5['none']==0 and r5['jk']==1 and r5['a1']>r5['a0']+.1,r5)
    # the beams: all twelve the same length at every moment, moving as one, and complete only at the jump
    r7=json.loads(await ev("JSON.stringify({half:[...Array(12)].map((_,i)=>+gateBeam(i,.5)[1].toFixed(3)),full:[...Array(12)].map((_,i)=>gateBeam(i,1)[1]),late:[...Array(12)].map((_,i)=>gateBeam(i,.97)[1]),p:[0,.25,.5,.75,.98,1].map(k=>{W.gc={g:GATES[W.sid][0],t:GATE_HOLD-HJ.lead*(1-k),last:0};const v=+gateChP(GATES[W.sid][0]).toFixed(2);W.gc=null;return v})})"))
    check('all twelve beams are the same length at every moment, and complete only at full charge',len(set(r7['half']))==1 and 0<r7['half'][0]<1 and all(x==1 for x in r7['full']) and all(x<1 for x in r7['late']),r7)
    check('the power-up is one smooth curve from 0 to 1 that follows the sound\'s build (14%, 38%, 67% at the quarters) and is still short of full just before the jump',r7['p']==[0,.14,.38,.67,.97,1],r7['p'])
    # the jump: 2 s out and 2.2 s of arrival, and the ship lunges at once
    r6=json.loads(await ev("(()=>{const p=W.player,g=GATES[W.sid][0],l=Math.hypot(g.x,g.y,g.z),d={x:g.x/l,y:g.y/l,z:g.z/l},sv=[p.x,p.y,p.z,p.vx,p.vy,p.vz];p.x=g.x-d.x*100;p.y=g.y-d.y*100;p.z=g.z-d.z*100;p.vx=p.vy=p.vz=0;const J={to:g.to,t:.016,g};gateTransit(J,.016);const sp=Math.hypot(p.vx,p.vy,p.vz),toward=(p.vx*d.x+p.vy*d.y+p.vz*d.z)/sp;[p.x,p.y,p.z,p.vx,p.vy,p.vz]=sv;p.thrusting=p.boosting=false;document.getElementById('fade').style.opacity=0;return JSON.stringify({out:JUMP_OUT,inn:JIN.d,sp:Math.round(sp),toward:+toward.toFixed(2)})})()"))
    check('the jump runs 2 s out and 2.2 s on arrival, and the ship is at speed toward the ring in its first frame',r6['out']==2 and r6['inn']==2.2 and r6['sp']>=300 and r6['toward']>.95,r6)
    # the ship reaches the ring 0.145 s (plus half the sound's output delay) into the jump from wherever the field left it, and the gate's burst starts as it crosses
    r8=json.loads(await ev("(()=>{const p=W.player,g=GATES[W.sid][0],l=Math.hypot(g.x,g.y,g.z),d={x:g.x/l,y:g.y/l,z:g.z/l},sv=[p.x,p.y,p.z,p.vx,p.vy,p.vz],jw=W.jump,out=[];for(const D of[60,240]){p.x=g.x-d.x*D;p.y=g.y-d.y*D;p.z=g.z-d.z*D;const J={to:g.to,t:0,g};W.jump=J;let before=gateBurstT(g),n=0;while(J.tx===undefined&&n<200){J.t+=.01;gateTransit(J,.01);n++}out.push({D,before,x:+J.x.toFixed(3),tx:+J.tx.toFixed(2),burst:+gateBurstT(g).toFixed(2)})}W.jump=jw;[p.x,p.y,p.z,p.vx,p.vy,p.vz]=sv;p.thrusting=p.boosting=false;document.getElementById('fade').style.opacity=0;return JSON.stringify(out)})()"))
    check('from 60 m and from 240 m short the ship crosses the ring at the set moment of the jump (0.145 s plus half the output delay of the sound), and the burst starts at the crossing, not before',all(o['before']==-1 and .145<=o['x']<=.27 and abs(o['tx']-o['x'])<=.03 and o['burst']==0 for o in r8),r8)
    # without the clips, the old countdown sound plays
    r4=json.loads(await ev("(()=>{delete SND.b.cdBeep;delete SND.b.cdGo;delete SND.b.hjump;HJ.h=null;const c=SFX.count;let n=[];SFX.count=f=>n.push(!!f);gjCount(3);gjCount(1);SFX.count=c;return JSON.stringify(n)})()"))
    check('without the clips the old countdown beeps play',r4==[False,True],r4)
    check('no page errors',not errs,errs[:3])
    print('ALL OK' if not bad else 'FAILED: '+'; '.join(bad));await b.close()
asyncio.run(main())
