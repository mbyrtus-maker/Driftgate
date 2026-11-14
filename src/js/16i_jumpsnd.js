//@src 16i_jumpsnd.js
// Gate jump sounds, from two clips the user supplied (14 Nov 2026): a countdown (three low beeps a second apart, then a
// high one) and a hyper-jump effect (a 4.8 s charge, the blast, a 4 s tail). In the pack they are cdBeep, cdGo and hjump
// (tools/snd_add.py). They play at their own pitch, not the pack's lowered one.
//   - On a gate's approach the charge starts so that its blast lands on the moment of the jump (HJ.lead s before it).
//   - The low beep sounds at 3, 2 and 1 seconds to go; the high beep sounds with the blast as the ship jumps.
//   - Leaving the approach, losing alignment or being jammed fades the charge out.
//   - A jump with no countdown (in formation with a capital, from a gunner's seat) plays from just before the blast.
//   - The arrival 1.3 s later no longer plays a second jump sound; the blast's tail carries through it.
// With the clips not loaded (sound off at start, an old browser) the old beeps and warp play as before.
const HJ={lead:4.85,vol:.3,beep:.13,go:.15,h:null};
function hjLive(){return!!(HJ.h&&AU.ctx&&AU.ctx.currentTime<HJ.h.end)}
function hjStop(fade){const h=HJ.h;if(!h)return;HJ.h=null;try{const t=AU.ctx.currentTime;h.g.gain.cancelScheduledValues(t);h.g.gain.setValueAtTime(h.g.gain.value,t);h.g.gain.linearRampToValueAtTime(0,t+fade);h.s.stop(t+fade+.03)}catch(e){}}
// start the jump clip `off` seconds in; cd marks a charge that a cancelled countdown may stop
function hjStart(off,cd){if(MUTE||!auOK()||!AU.on.sfx||!AU.sx)return false;const b=SND.b.hjump;if(!b)return false;hjStop(.05);
  const c=AU.ctx,s=c.createBufferSource(),g=c.createGain(),t=c.currentTime;off=clamp(off||0,0,b.duration-.2);s.buffer=b;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(HJ.vol,t+(off>.1?.04:.2));s.connect(g);g.connect(AU.sx);s.start(t,off);
  HJ.h={s,g,end:t+b.duration-off,cd:!!cd,go:!cd,t0:t,off0:off};try{voice(b.duration-off)}catch(e){}return true}
// rem = seconds until the jump, every frame of the countdown
// While the charge plays, the countdown follows the sound's own clock, so the beeps and the jump land where the clip puts
// them even when frames run slow (the game's clock can lag real time; the sound cannot). A gap of over a second (the game
// was paused) restarts the clip at the right place instead.
function gjCharge(rem){const h=HJ.h;if(h&&h.cd&&!h.go&&h.s&&W.gc&&hjLive()){const ar=HJ.lead-(AU.ctx.currentTime-h.t0+h.off0);
    if(Math.abs(ar-rem)>1)hjStop(.1);else{if(Math.abs(ar-rem)>.02)W.gc.t=unbGateHold()-ar;return}}
  if(rem<=HJ.lead&&rem>.4&&!hjLive())hjStart(HJ.lead-rem,true)}
// a whole second of the countdown has passed; n seconds remain
function gjCount(n){if(!SND.b.cdBeep){SFX.count(n===1);return}if(n<=3)smp('cdBeep',HJ.beep,1/PITCH,0,0)}
// the ship jumps
function gjGo(){if(SND.b.cdGo)smp('cdGo',HJ.go,1/PITCH,0,0);if(hjLive()){HJ.h.go=true;return}SFX.jump()}
// every other jump sound: the blast, unless the clip is already playing (the arrival after a gate jump)
{const o=SFX.jump;SFX.jump=function(){if(hjLive()){HJ.h.go=true;return}if(hjStart(HJ.lead-.12))return;return o.apply(this,arguments)}}
// a countdown that ends without a jump fades the charge out
{const o=auFrame;auFrame=function(){try{const h=HJ.h;if(h&&h.cd&&!h.go&&!(W&&W.gc))hjStop(.25)}catch(e){}return o.apply(this,arguments)}}
// ---- the gate powers up with the charge (14 Nov 2026; the user: "the build up needs a visual at the gate showing that
// powerup"). k runs from 0 as the charge starts to 1 at the jump, so the picture follows the sound:
//   - the twelve emitters light one after another round the ring, each throwing a beam toward the centre that reaches
//     further as the charge builds;
//   - a core of light grows at the ring's centre and pulses faster, sparks are drawn inward, the ring's film brightens;
//   - at the jump the core flashes and a ring of light is thrown outward.
// The beams (14 Nov 2026, after three rounds with the user): "never quite complete", then "they jump and skip and complete.
// Needs to be one smooth animation", and "they complete a little too early before the jump". So all twelve are drawn
// together as one even movement, every beam the same length at every moment, and they meet at the centre on the frame of
// the jump, not before. The pace is one smooth curve, the share of the time raised to 1.4, which is the shape of the
// charge sound's build: measured on the clip, 14% of its loudness has been heard at a quarter of the time, 38% at half and
// 68% at three quarters, and the curve gives 14, 38 and 67. It keeps moving right to the end, so nothing sits finished
// while the sound is still rising. (A version that followed the clip's loudness moment by moment lurched with each
// surge, and one that lit the emitters in turn finished most beams early; both are gone.)
function gateChP(g){const k=gateChK(g);return k<=0?0:k>=1?1:Math.pow(k,1.4)}
// every emitter at progress p: how lit it is, and how far its beam has reached toward the centre (0 to 1)
function gateBeam(i,p){return[clamp(p/.04,0,1),clamp(p,0,1)]}
function gateChK(g){if(!W)return 0;if(W.gc&&W.gc.g===g)return clamp(1-(unbGateHold()-W.gc.t)/HJ.lead,0,1);if(W.jump&&W.jump.g===g)return 1;return 0}
const GATE_C0=[.45,.7,1],GATE_C1=[0,0,0];
// How long after the jump starts the ship crosses the ring and the gate bursts. Set by ear with the user (14 Nov 2026):
// 0.12 s was "just a touch early", 0.17 s plus the sound's whole output delay was "just a touch late", so this is the
// middle of the two on any machine: JUMP_X (0.145 s) plus half the delay the browser reports between starting a sound and
// its leaving the speakers (a few hundredths of a second on built-in audio, more on wireless headphones; capped at 0.25 s).
function jumpX(){let l=0;try{const c=AU.ctx;if(c&&auOK())l=(c.outputLatency||0)+(c.baseLatency||0)}catch(e){}return JUMP_X+.5*clamp(l||0,0,.25)}
// seconds since the ship crossed the ring (the gate's burst starts there), or -1 before that
function gateBurstT(g){const J=W&&W.jump;return J&&J.g===g&&J.tx!==undefined?J.t-J.tx:-1}
function gateDiscC(g){const k=gateChP(g);if(k<=0)return GATE_C0;GATE_C1[0]=.45+.4*k;GATE_C1[1]=.7+.24*k;GATE_C1[2]=1;return GATE_C1}
function gateDiscA(g,t){const k=gateChP(g),a=.2+.06*Math.sin(t*3)+gatePulse(g);if(k<=0)return a;const bt=gateBurstT(g);return a+k*(.2+.06*Math.sin(t*(6+20*k)))+(bt>=0?.25*Math.max(0,1-bt/.5):0)}
function gateFx(t){gateGhostFx();const g=W.gc?W.gc.g:W.jump?W.jump.g:null;if(!g)return;const k=gateChP(g);if(k<=0)return;const jt=W.jump?W.jump.t:-1,fade=jt>=0?Math.max(0,1-Math.max(0,jt-(W.jump.x||JUMP_X))/.9):1,C=GATE_C0,WT=ONE3;
  qLook(-g.x,-g.y,-g.z,0,1,0,_qs);qMul(_qs,qAxis(0,0,1,t*.15,_qs2),_qs);
  // the heads stop a little short of the centre (93% of the way) at the end of the countdown and close the last of it while
  // the ship covers the last metres to the ring; they meet as it crosses, and the burst starts there (the user: "the burst
  // from the gate is just slightly before the actual jump")
  if(fade>0){const B=gateBeam(0,k),on=B[0],r=jt>=0?(W.jump.tx!==undefined?1:Math.min(1,.93+.07*jt/(W.jump.x||JUMP_X))):B[1]*.93,sh=.94+.06*Math.sin(t*9);
    for(let i=0;i<12;i++){const a=i/12*TAU;qRot(_qs,Math.cos(a)*86,Math.sin(a)*86,0,_u);const ox=_u.x,oy=_u.y,oz=_u.z,x=g.x+ox,y=g.y+oy,z=g.z+oz;
      sprite(x,y,z,(7+7*k)*on*sh,C,.8*on*fade);sprite(x,y,z,3.5*on,WT,.9*on*fade);
      // the beam, and a bright head where it has got to
      streak(x,y,z,x-ox*r,y-oy*r,z-oz*r,1.4+2.4*k,C,(.3+.45*k)*sh*fade);if(r<1)sprite(x-ox*r,y-oy*r,z-oz*r,4+2*k,WT,.8*on*fade)}
    // the core grows smoothly as the beams close on it
    const pu=1+.06*Math.sin(t*(8+14*k)),cm=.3+.7*r*r;sprite(g.x,g.y,g.z,(6+38*k*k)*pu*cm,WT,(.25+.5*k)*fade);sprite(g.x,g.y,g.z,(20+85*k*k)*pu*cm,C,(.1+.18*k)*fade);
    for(let i=0;i<18;i++){const u=(i*.618+t*(.35+.9*k))%1,a=i*2.399+t*1.3+u*3,rr=92*(1-u);qRot(_qs,Math.cos(a)*rr,Math.sin(a)*rr,0,_u);sprite(g.x+_u.x,g.y+_u.y,g.z+_u.z,2+3*k,C,.7*k*u*fade)}}
  const bt=gateBurstT(g);if(bt>=0){const f=Math.max(0,1-bt/.7);if(f>0){sprite(g.x,g.y,g.z,120+900*Math.min(1,bt/.25),WT,.85*f);
      for(let i=0;i<24;i++){const a=i/24*TAU,r=100+bt*700;qRot(_qs,Math.cos(a)*r,Math.sin(a)*r,0,_u);sprite(g.x+_u.x,g.y+_u.y,g.z+_u.z,14+30*f,C,.6*f)}}}}
// ---- other ships through a gate (14 Nov 2026; the user: "ai npcs jumping through a gate while pilot is in sector I dont'
// need to see all the beams and the flash but they should do something rather than blink out of existence").
// A ship that jumps out is still removed from the world at once, as before, so nothing in the game changes; what is left
// behind for half a second is a picture of it (W.gouts): the hull lunges to the ring's centre in GOUT.tc s and on through
// it, stretching along its line of flight, with a streak of its side's colour behind it; as it crosses, the ring gives a
// small flash and its film pulses. No beams and no burst: those stay the pilot's own.
// A ship arriving near a gate pulses that gate's film too (its own arrival flash is as before).
const GOUT={tc:.16,life:.62,acc:7000};
function gateDefOf(g,far){const L=W&&GATES[W.sid];if(!L||!g)return null;if(L.includes(g))return g;let b=null,bd=1e9;for(const q of L){const d=d3(q,g);if(d<bd){bd=d;b=q}}return bd<(far||400)?b:null}
// the film's extra brightness from a ship that has just crossed (g.pT is the moment, in the world's clock)
function gatePulse(g){if(!W||g.pT===undefined||g.pW!==W.sid)return 0;const a=W.t-g.pT;return a>=0&&a<.5?.3*(1-a/.5):0}
function gateOutFx(e,g){if(!W||!e||!g||e.isPlayer||!e.st)return false;const G=gateDefOf(g);if(!G)return false;const d=gateAxis(G),dist=d3(e,G);if(dist>700)return false;
  (W.gouts=W.gouts||[]).push({src:e,cls:e.cls,role:e.role,sc:e.st.radius*1.25,x:e.x,y:e.y,z:e.z,gx:G.x,gy:G.y,gz:G.z,dx:d.x,dy:d.y,dz:d.z,q:qLook(d.x,d.y,d.z,0,1,0,q0()),t0:W.t,c:hexRGB(sideCol(e.side)),v1:dist/GOUT.tc});
  G.pT=W.t+GOUT.tc;G.pW=W.sid;return true}
// where a departing ship's picture is, a seconds after it left (into _u), and how stretched it is (returned)
function gateGhostAt(o,a){if(a<GOUT.tc){const k=a/GOUT.tc;_u.x=o.x+(o.gx-o.x)*k;_u.y=o.y+(o.gy-o.y)*k;_u.z=o.z+(o.gz-o.z)*k;return k*.6}
  const b=a-GOUT.tc,s=o.v1*b+GOUT.acc*b*b;_u.x=o.gx+o.dx*s;_u.y=o.gy+o.dy*s;_u.z=o.gz+o.dz*s;return .6+Math.min(1,b/.15)*2.4}
function gateGhostMesh(){const L=W&&W.gouts;if(!L||!L.length)return;for(const o of L){const a=W.t-o.t0;if(a<0||a>GOUT.tc+.16)continue;const st=gateGhostAt(o,a),x=_u.x,y=_u.y,z=_u.z;if(!inView(x,y,z,o.sc*8))continue;
    let m=null;try{m=shipMesh(meshFac(o.src),o.role==='limpet'?'limpet':o.cls)}catch(e){}if(!m||!m.hull)continue;mModel(MM,x,y,z,o.q,o.sc,o.sc,o.sc*(1+st*1.6));drawMesh(m.hull,MM,ONE3,ZERO3);if(m.rim)drawMesh(m.rim,MM)}}
function gateGhostFx(){const L=W&&W.gouts;if(!L||!L.length)return;for(let i=L.length-1;i>=0;i--){const o=L[i],a=W.t-o.t0;if(a>GOUT.life||a<-1){L.splice(i,1);continue}
    const st=gateGhostAt(o,a),x=_u.x,y=_u.y,z=_u.z,f=Math.max(0,1-a/(GOUT.tc+.3)),len=o.sc*(3+st*14);
    if(f>0){streak(x,y,z,x-o.dx*len,y-o.dy*len,z-o.dz*len,o.sc*.5,o.c,.75*f);streak(x,y,z,x-o.dx*len*.5,y-o.dy*len*.5,z-o.dz*len*.5,o.sc*.22,ONE3,.8*f);sprite(x,y,z,o.sc*(2.4+st),o.c,.5*f)}
    // the ring's small flash as the ship crosses
    const b=a-GOUT.tc;if(b>=0){const k=Math.max(0,1-b/.4);sprite(o.gx,o.gy,o.gz,40+220*Math.min(1,b/.12),ONE3,.6*k);sprite(o.gx,o.gy,o.gz,150+250*Math.min(1,b/.2),GATE_C0,.3*k)}}}
// a ship arriving beside a gate (fxWarp at its new place) pulses that gate's film
{const o=fxWarp;fxWarp=function(p,col){try{if(W&&p){const G=gateDefOf(p,650);if(G&&!(G.pT>W.t-.1&&G.pW===W.sid)){G.pT=W.t;G.pW=W.sid}}}catch(e){}return o.apply(this,arguments)}}
