# Patch: sounds for everything built in the Brood, upgrade, blast-AI and Unbound rounds. All synthesised from the game's own
# primitives (thump, rumble, smp, hiss, mineCrackle, lowRumble), rate-limited where they can repeat, and only for the
# pilot at this screen (runAs for multiplayer guests already mutes the host).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

SFX_NEW=r"""
  // ---- Unbound, capitals, the Brood ecology (synthesised; rate-limited where they repeat)
  jamMode(on){if(on){thump(330,660,.12,.06,'triangle');setTimeout(()=>thump(660,990,.1,.05,'triangle'),90);rumble(2600,.18,.04,3,1200)}else{thump(660,330,.14,.05,'triangle');setTimeout(()=>thump(440,220,.12,.04,'triangle'),90)}},
  jammer(){const n=AU.ctx?AU.ctx.currentTime:0;if(n-(AU.jamT||-9)<.09)return;AU.jamT=n;thump(1800,420,.07,.03,'sawtooth');rumble(3200,.06,.03,4,900)},
  harpoon(){thump(240,90,.22,.11,'square');rumble(1400,.25,.07,2,300);smp('clk1',.18,1.4,0,.05)},
  tether(){smp('clk2',.3,1.25,0,.04);thump(392,370,.5,.06,'triangle');setTimeout(()=>thump(370,349,.45,.045,'triangle'),120);setTimeout(()=>thump(349,330,.4,.03,'triangle'),240)},
  hook(){const n=performance.now();if(n-(AU.hookT||0)<260)return;AU.hookT=n;rumble(700,.22,.05,1.6,380);smp(['clk1','clk2'],.12,.9,0,.08);thump(150,120,.08,.03,'square')},
  take(){[523,659,784].forEach((f,i)=>setTimeout(()=>thump(f,f*.995,.16,.06,'triangle'),i*110));smp('clk2',.2,.8,.32,.03)},
  xpdr(on){if(on){thump(880,1320,.18,.045,'sine');setTimeout(()=>thump(1320,1760,.14,.035,'sine'),130);hiss(.3,.015)}else{thump(880,440,.2,.045,'sine')}},
  coverBlown(){smp('err',.32,.9,0,0);[0,220,440].forEach((d,i)=>setTimeout(()=>thump(i%2?330:466,i%2?328:463,.18,.08,'square'),d))},
  lockdown(){for(let i=0;i<3;i++)setTimeout(()=>{thump(520,390,.42,.07,'sawtooth');thump(260,195,.42,.05,'square')},i*520);setTimeout(()=>SFX0.alarm(),1600)},
  jtorpLaunch(){SFX0.missile(1,true);rumble(2400,.5,.06,3,600)},
  jtorpHit(big){rumble(1800,.7,.2*(big?1.4:1),2,240);thump(70,30,.6,.18*(big?1.3:1));if(auOK()){const t=AU.ctx.currentTime;for(let i=0;i<14;i++)mineCrackle(t+.02+i*.035+Math.random()*.02,1.8)}},
  capDark(){thump(240,36,1.6,.16,'sawtooth');lowRumble(1.6,300,60,.09);setTimeout(()=>thump(110,40,.9,.12,'triangle'),500)},
  turretJam(){thump(1500,300,.16,.05,'sawtooth');setTimeout(()=>thump(300,90,.25,.05,'triangle'),120)},
  vault(){SFX0.crack();setTimeout(()=>{for(let i=0;i<6;i++)setTimeout(()=>smp(['clk1','clk2'],.14,1.6+Math.random()*.4,0,.08),i*70)},350)},
  deed(){[392,523,659,784].forEach((f,i)=>setTimeout(()=>thump(f,f*.995,i===3?.5:.16,.07,'triangle'),i*130));setTimeout(()=>rumble(500,.6,.05,1,200),520)},
  rankUp(){[262,330,392,523].forEach((f,i)=>setTimeout(()=>{thump(f,f*.995,.32,.07,'triangle');thump(f*2,f*1.99,.2,.025,'sine')},i*160))},
  heatUp(){if(!smp('warn',.28,.85,0,0))thump(146,144,.16,.075,'triangle');setTimeout(()=>thump(196,190,.14,.05,'triangle'),180)},
  fence(){smp('click',.25,.9,0,.03);setTimeout(()=>smp('click2',.25,1.1,0,.03),90);setTimeout(()=>thump(1568,1560,.25,.04,'sine'),200)},
  work(){for(let i=0;i<3;i++)setTimeout(()=>SFX0.dockClank(i),i*180);setTimeout(()=>{thump(523,520,.2,.05,'triangle');setTimeout(()=>thump(784,780,.3,.05,'triangle'),120)},620)},
  lair(){SFX0.clunk();setTimeout(()=>hiss(.6,.03),150);setTimeout(()=>thump(659,655,.2,.04,'sine'),500)},
  rigger(){[392,494,587].forEach((f,i)=>setTimeout(()=>thump(f,f,.18,.05,'triangle'),i*120))},
  spot(){thump(1175,1170,.08,.05,'sine');setTimeout(()=>thump(1568,1560,.12,.05,'sine'),90);setTimeout(()=>thump(2093,2088,.18,.04,'sine'),180)},
  feast(){SFX0.crack();setTimeout(()=>rumble(260,1.2,.18,.8,60),200)},
  spore(){const n=performance.now();if(n-(AU.sporeT||0)<500)return;AU.sporeT=n;thump(190,80,.18,.06,'sine');rumble(900,.14,.05,3,300)},
  truce(){thump(587,584,.35,.04,'sine');setTimeout(()=>thump(880,876,.5,.035,'sine'),220)},
  accord(){SFX0.alarm();setTimeout(()=>[294,370,440].forEach((f,i)=>setTimeout(()=>thump(f,f,.3,.06,'triangle'),i*170)),700)},
"""
rep("  uiErr(){const t=performance.now();if(t-(AU.errT||0)<450)return;AU.errT=t;smp('err',.22,1.1,0,0)},\n};",
    "  uiErr(){const t=performance.now();if(t-(AU.errT||0)<450)return;AU.errT=t;smp('err',.22,1.1,0,0)},"+SFX_NEW+"};")

# ---- calls (local pilot only: guests' events run under runAs on the host, which mutes them; guests hear their own toggles)
rep("function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;","function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;SFX.jamMode(p.jamMode);")
rep("e.jam=(e.jam||0)+b.dmg*","if(b.src&&b.src.isPlayer||e.isPlayer)SFX.jammer();e.jam=(e.jam||0)+b.dmg*")
rep("if(S.unb&&W.player.jamMode)for(let i=1;i<=n;i++){const mm=W.missiles[W.missiles.length-i];if(mm&&mm.src===W.player){mm.harp=1;mm.col='#b7c6ff'}}}",
    "if(S.unb&&W.player.jamMode){SFX.harpoon();for(let i=1;i<=n;i++){const mm=W.missiles[W.missiles.length-i];if(mm&&mm.src===W.player){mm.harp=1;mm.col='#b7c6ff'}}}}")
rep("T.teth={by:m.src,until:W.t+30};","T.teth={by:m.src,until:W.t+30};if(m.src===W.player||T.isPlayer)SFX.tether();")
rep("R.hookAcc-=m;inv.take(cg,k,1);inv.add(P.cargo,k,1);inv.add(P.stolen,k,1);R.take.moved+=m}","R.hookAcc-=m;inv.take(cg,k,1);inv.add(P.cargo,k,1);inv.add(P.stolen,k,1);R.take.moved+=m;SFX.hook()}")
rep("  feed(`☠ Take: ${fmt(tk.moved)} t","  SFX.take();feed(`☠ Take: ${fmt(tk.moved)} t")
rep("if(NET.cl)netSend({t:'xpdr',on:P.xpdr?1:0});","if(NET.cl)netSend({t:'xpdr',on:P.xpdr?1:0});SFX.xpdr(P.xpdr);")
rep("heatAdd(f,UNB_HEAT.blown,why||'cover blown');","heatAdd(f,UNB_HEAT.blown,why||'cover blown');SFX.coverBlown();")
rep("L=P.lock={sid:W.sid,f,t0:S.T,n:0},feed(","L=P.lock={sid:W.sid,f,t0:S.T,n:0},SFX.lockdown(),feed(")
rep("if(got)feed(`🚨 ${FACTIONS[f].short} response wing (${got}) launching","if(got){SFX.warn();}if(got)feed(`🚨 ${FACTIONS[f].short} response wing (${got}) launching")
rep("const m=W.missiles[W.missiles.length-1];if(m){m.jt=1;m.dmg=0;m.col='#b7c6ff'}unbShot();flash(`Jamming torpedo away","const m=W.missiles[W.missiles.length-1];if(m){m.jt=1;m.dmg=0;m.col='#b7c6ff'}SFX.jtorpLaunch();unbShot();flash(`Jamming torpedo away")
rep("function jtHit(m){const T=m.tgt;fxBoom(m,90,'#b7c6ff');","function jtHit(m){const T=m.tgt;fxBoom(m,90,'#b7c6ff');if(W.player&&d3(m,W.player)<4000)SFX.jtorpHit(!!(T&&T.role==='frigate'));")
rep("T.jamOff=W.t+(T.cls==='escort'?20:15);T.jamHard=T.jamOff+60;fxBoom(T,T.st.radius*.6,'#b7c6ff');","T.jamOff=W.t+(T.cls==='escort'?20:15);T.jamHard=T.jamOff+60;fxBoom(T,T.st.radius*.6,'#b7c6ff');if(W.player&&d3(T,W.player)<6000)SFX.capDark();")
rep("best.jamOff=W.t+15;best.jamHard=W.t+75;if(b.src===W.player){","best.jamOff=W.t+15;best.jamHard=W.t+75;if(b.src===W.player){SFX.turretJam();")
rep("heatAdd(f,6,'a vault heist');","heatAdd(f,6,'a vault heist');if(W.player&&d3(m,W.player)<5000)SFX.vault();")
rep("feed(`★ Deed: ${DEED_NAMES[k]}","SFX.deed();feed(`★ Deed: ${DEED_NAMES[k]}")
rep("if(r1>r0)feed(`☠ Infamy ${fmt(Math.round(P.inf))}","if(r1>r0){SFX.rankUp()}if(r1>r0)feed(`☠ Infamy ${fmt(Math.round(P.inf))}")
rep("  if(b1>b0)feed(`🔥 ${FACTIONS[f].short} heat","  if(b1>b0)SFX.heatUp();if(b1>b0)feed(`🔥 ${FACTIONS[f].short} heat")
rep("    if(n)feed(`⚠ A ${FACTIONS[f].short} hunter wing (${n}) has your scent.`,'bad')}}","    if(n){SFX.alarm();feed(`⚠ A ${FACTIONS[f].short} hunter wing (${n}) has your scent.`,'bad')}}}")
rep("dockErr=got?`✓ The Fence took ${fmt(t)} t for ${fmt(got)} cr.`","if(got)SFX.fence();dockErr=got?`✓ The Fence took ${fmt(t)} t for ${fmt(got)} cr.`")
rep("H.lv[k]=l+1;dockErr=`✓ ${UNB_WORKS[k].name} level","H.lv[k]=l+1;SFX.work();dockErr=`✓ ${UNB_WORKS[k].name} level")
rep("function lairDock(L){const P=S.player,p=W.player;","function lairDock(L){const P=S.player,p=W.player;SFX.lair();")
rep("ev.force={};feed(`☠ Your Lair in ${DEF[ev.sector].name} is ready","ev.force={};if(!MUTE)SFX.rigger();feed(`☠ Your Lair in ${DEF[ev.sector].name} is ready")
rep("if(F.t<SPOT.t)return;F.t=0;","if(F.t<SPOT.t)return;F.t=0;SFX.spot();")
rep("{const ft=R.owner==='brood'&&R.gut?brFeast(s,R):0;if(ft&&(covered(sid)||W&&W.sid===sid))feed(","{const ft=R.owner==='brood'&&R.gut?brFeast(s,R):0;if(ft&&W&&W.sid===sid)SFX.feast();if(ft&&(covered(sid)||W&&W.sid===sid))feed(")
rep("if(e.spores.length<cap)e.spores.push(W.t+4);","if(e.isPlayer)SFX.spore();if(e.spores.length<cap)e.spores.push(W.t+4);")
rep("W.wasBr=br;W.haze=br;W.truce=truceAt(W.sid)}","W.wasBr=br;W.haze=br;{const tr=truceAt(W.sid);if(tr&&!W.truce&&W===LW&&W.player)SFX.truce();W.truce=tr}}")
rep("if(nb>=ACCORD_ON&&!(C&&C.lead==='brood')){S.coal={lead:'brood',mem:[...FAC_IDS],since:S.T,accord:1};","if(nb>=ACCORD_ON&&!(C&&C.lead==='brood')){S.coal={lead:'brood',mem:[...FAC_IDS],since:S.T,accord:1};if(running&&!STRAT_SIM())SFX.accord();")
rep("function unbLegendOK(name){","function STRAT_SIM(){return typeof window!=='undefined'&&!!window._fs}\nfunction unbLegendOK(name){")
open(P,'w',encoding='utf-8').write(s);print('sounds applied')
