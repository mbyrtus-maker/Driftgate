//@src 07_audio.js
// ============================================================ audio: everything synthesized, low and soft; a global low-pass caps brightness
const AU={ctx:null,on:{sfx:true,music:false},voices:0};
try{const v=JSON.parse(localStorage.getItem('driftgate.audio2')||'null');if(v&&typeof v.sfx==='boolean')AU.on=v}catch(e){}
if(!(AU.on.mvol>=0))AU.on.mvol=35;if(!AU.on.mv2){if(AU.on.mvol===45)AU.on.mvol=35;AU.on.mv2=1}if(!(AU.on.svol>=0))AU.on.svol=100;   // music and effects volume, 0-100
function auSave(){try{localStorage.setItem('driftgate.audio2',JSON.stringify(AU.on))}catch(e){}}
function auOK(){return!!(AU.ctx&&AU.ctx.state==='running')}
function auInit(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume().catch(()=>{});return}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;let c;try{c=new AC()}catch(e){return}AU.ctx=c;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=4;{const lim2=c.createDynamicsCompressor();lim2.threshold.value=-2;lim2.knee.value=0;lim2.ratio.value=20;lim2.attack.value=.001;lim2.release.value=.12;comp.connect(lim2);lim2.connect(c.destination)}
  const tone=c.createBiquadFilter();tone.type='lowpass';tone.frequency.value=1350;tone.Q.value=.5;tone.connect(comp);
  AU.master=c.createGain();AU.master.gain.value=.8;AU.master.connect(tone);
  AU.sfx=c.createGain();AU.sfx.gain.value=AU.on.sfx?1:0;AU.sfx.connect(AU.master);
  {const air=c.createBiquadFilter();air.type='lowpass';air.frequency.value=4800;air.Q.value=.4;air.connect(comp);const lim=c.createDynamicsCompressor();lim.threshold.value=-6;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.15;lim.connect(air);AU.sx=c.createGain();AU.sx.gain.value=AU.on.sfx?.75:0;AU.sx.connect(lim);sndLoad()}
  AU.mus=c.createGain();AU.mus.gain.value=AU.on.music?.25*AU.on.mvol/45:0;AU.mus.connect(AU.master);
  const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){b=(b+.02*(Math.random()*2-1))/1.02;d[i]=b*3.5}AU.noise=nb; // brown noise: weighted to the lows
  // engine bed: detuned low saw + triangle through a resonant low-pass, plus filtered noise for thrust and boost
  // drive: a pure sub-sine reactor hum with a slow beating partner (no harmonics, so nothing reads as a motor),
  // plus a soft plasma wash of filtered noise that swells with thrust; pitch barely moves with speed
  const eg=c.createGain();eg.gain.value=0;eg.connect(AU.sfx);
  const o1=c.createOscillator();o1.type='sine';o1.frequency.value=41;const o2=c.createOscillator();o2.type='sine';o2.frequency.value=61.9;const o2g=c.createGain();o2g.gain.value=.35;
  const trem=c.createOscillator();trem.frequency.value=.23;const tg=c.createGain();tg.gain.value=.25;trem.connect(tg);const eg2=c.createGain();eg2.gain.value=.75;tg.connect(eg2.gain);
  o1.connect(eg2);o2.connect(o2g);o2g.connect(eg2);eg2.connect(eg);o1.start();o2.start();trem.start();
  const ns=c.createBufferSource();ns.buffer=nb;ns.loop=true;const nf=c.createBiquadFilter();nf.type='lowpass';nf.frequency.value=300;nf.Q.value=.3;const nf2=c.createBiquadFilter();nf2.type='highpass';nf2.frequency.value=90;
  const ng=c.createGain();ng.gain.value=0;ns.connect(nf2);nf2.connect(nf);nf.connect(ng);ng.connect(AU.sfx);ns.start();
  const sw=c.createOscillator();sw.frequency.value=.11;const swg=c.createGain();swg.gain.value=60;sw.connect(swg);swg.connect(nf.frequency);sw.start();
  AU.eng={g:eg,o1,o2,ng,nf};
  // laser hum: two close low saws, heavily filtered; swells while the trigger is held
  const lg=c.createGain();lg.gain.value=0;const lf=c.createBiquadFilter();lf.type='lowpass';lf.frequency.value=230;lf.Q.value=5;lf.connect(lg);lg.connect(AU.sfx);
  for(const f of[68,69.4]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lf);o.start()}AU.las={g:lg};
  // jump-drive whir: two low oscillators and a band of noise through a wobbling low-pass; pitch, brightness and wobble climb with the spin
  {const wg=c.createGain();wg.gain.value=0;wg.connect(AU.sfx);const wf=c.createBiquadFilter();wf.type='lowpass';wf.frequency.value=160;wf.Q.value=6;wf.connect(wg);
   const w1=c.createOscillator();w1.type='sawtooth';w1.frequency.value=30;const w2=c.createOscillator();w2.type='sine';w2.frequency.value=45;const w2g=c.createGain();w2g.gain.value=.8;w1.connect(wf);w2.connect(w2g);w2g.connect(wf);w1.start();w2.start();
   const wn=c.createBufferSource();wn.buffer=nb;wn.loop=true;const wnf=c.createBiquadFilter();wnf.type='bandpass';wnf.frequency.value=220;wnf.Q.value=2;const wng=c.createGain();wng.gain.value=.5;wn.connect(wnf);wnf.connect(wng);wng.connect(wf);wn.start();
   const lfo=c.createOscillator();lfo.frequency.value=3;const lg2=c.createGain();lg2.gain.value=60;lfo.connect(lg2);lg2.connect(wf.frequency);lfo.start();AU.whir={g:wg,f:wf,o1:w1,o2:w2,nf:wnf,lfo,lg:lg2}}
  // mining beam: a laser burning through rock. A deep steady beam hum, a gritty grinding bed from the rock face that shudders
  // irregularly, a low steady sizzle, and crackling bursts scheduled each frame while it cuts (mineCrackle)
  {const wn=c.createBuffer(1,c.sampleRate,c.sampleRate),wd=wn.getChannelData(0);for(let i=0;i<wd.length;i++)wd[i]=Math.random()*2-1;AU.white=wn}
  const mg=c.createGain();mg.gain.value=0;mg.connect(AU.sx||AU.sfx);
  const hum=c.createBiquadFilter();hum.type='lowpass';hum.frequency.value=380;hum.Q.value=.8;const hg=c.createGain();hg.gain.value=.42;hum.connect(hg);hg.connect(mg);
  const mos=[];for(const[f,ty,v]of[[61.7,'sawtooth',.5],[62.2,'sawtooth',.5],[123.5,'triangle',.22]]){const o=c.createOscillator();o.type=ty;o.frequency.value=f;const og=c.createGain();og.gain.value=v;o.connect(og);og.connect(hum);o.start();mos.push(o)}
  const wob=c.createOscillator();wob.frequency.value=.7;const wg=c.createGain();wg.gain.value=50;wob.connect(wg);wg.connect(hum.frequency);wob.start();
  const gn=c.createBufferSource();gn.buffer=nb;gn.loop=true;const gf=c.createBiquadFilter();gf.type='bandpass';gf.frequency.value=210;gf.Q.value=.8;const gg=c.createGain();gg.gain.value=1.0;gn.connect(gf);gf.connect(gg);gg.connect(mg);gn.start();
  for(const[r,dd]of[[5.3,.28],[8.9,.22]]){const l=c.createOscillator();l.frequency.value=r;const lg=c.createGain();lg.gain.value=dd;l.connect(lg);lg.connect(gg.gain);l.start()}
  const sz=c.createBufferSource();sz.buffer=AU.white;sz.loop=true;const szf=c.createBiquadFilter();szf.type='bandpass';szf.frequency.value=1700;szf.Q.value=.6;const szg=c.createGain();szg.gain.value=.07;sz.connect(szf);szf.connect(szg);szg.connect(mg);sz.start();
  AU.mine={g:mg,bp:hum,os:mos,wob};
  musicStart()}
// distant radio voices for the bridge: formant-filtered syllables between squelch clicks
function chatterRun(){if(!auOK()||!AU.on.sfx||!voice(3))return;const c=AU.ctx;let t=c.currentTime+.03;const n=5+Math.floor(Math.random()*9),base=(95+Math.random()*85)*PITCH,vol=.026+Math.random()*.014;
  const bus=c.createGain();bus.gain.value=1;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=220;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;hp.connect(lp);lp.connect(bus);bus.connect(AU.sfx);
  const sq=at=>{const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=AU.noise;f.type='bandpass';f.frequency.value=900;f.Q.value=1.5;src.connect(f);f.connect(g);g.connect(bus);g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol*1.4,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+.05);src.start(at,Math.random());src.stop(at+.07)};
  sq(t);t+=.06;
  for(let i=0;i<n;i++){const d=.06+Math.random()*.13,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain(),f0=base*(.9+Math.random()*.3);o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f0*(.85+Math.random()*.35),t+d);
    f.type='bandpass';f.frequency.value=(450+Math.random()*800)*PITCH;f.Q.value=3.5;o.connect(f);f.connect(g);g.connect(hp);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.015);g.gain.setValueAtTime(vol,t+d*.7);g.gain.linearRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.02);
    t+=d+(Math.random()<.2?.12+Math.random()*.22:.02+Math.random()*.05)}
  sq(t+.02)}
// bridge ambience: console beeps and crew radio, quiet and irregular
// console beeps and the computer room tone each play once every 2 to 4 minutes; the low crew chatter every 30 to 60 s
function bridgeAmb(dt,F){if(W.beepT===undefined)W.beepT=20+Math.random()*40;W.beepT-=dt;if(W.beepT<=0){SFX.cbeep();W.beepT=120+Math.random()*120}
  if(W.humT===undefined)W.humT=60+Math.random()*60;W.humT-=dt;if(W.humT<=0){if(AU.on.sfx)smp('bridgeHum',.07,1,0,.03);W.humT=120+Math.random()*120}
  W.ambT=(W.ambT===undefined?10:W.ambT)-dt;if(W.ambT<=0){SFX.chatter();W.ambT=30+Math.random()*30}}
// jump-drive countdown: a low drum that quickens and swells from spin-up to the jump
// the jump-drive whir is only for your own frigates: the one you're aboard, or one of yours close by (AI frigates spin up often and would drone on)
function drumTick(e,p,dt){if(MUTE)return;const aboard=W&&W.bridge&&W.bridge.f===e;if(!aboard&&!(e.tok&&fMine(e.tok)))return;const v=aboard?1:vAt(e);if(v<.15)return;if(!AU.whirIn||v>AU.whirIn.v)AU.whirIn={p,v}}
function vAt(p){if(!W||!p)return 1;const d=hyp(p.x-cam.x,p.y-cam.y,p.z-cam.z);return 1/(1+Math.pow(d/450,1.5))}
// the same falloff measured from the pilot's own ship (the camera when there is none): blast mining is heard by how far you are from it
function vPil(p){const q=W&&W.player&&W.player.alive?W.player:null;if(!q)return vAt(p);if(!p)return 1;const d=hyp(p.x-q.x,p.y-q.y,p.z-q.z);return 1/(1+Math.pow(d/450,1.5))}
// every sound sits about five semitones lower than its source: clips play slower, synth tones above ~100 Hz are scaled down
const PITCH=.75;function pl(f){return f>100?f*PITCH:f}
function voice(dur){if(AU.voices>26)return false;AU.voices++;setTimeout(()=>AU.voices--,dur*1000+60);return true}
function envG(g,t,a,peak,dec){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec)}
function thump(f0,f1,dur,vol,type){if(!auOK()||!AU.on.sfx||vol<.015||!voice(dur))return;const c=AU.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(pl(f0),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,pl(f1)),t+dur);o.connect(g);g.connect(AU.sfx);envG(g,t,.006,vol,dur);o.start(t);o.stop(t+dur+.08)}
function rumble(fc,dur,vol,q,to){if(!auOK()||!AU.on.sfx||vol<.015||!voice(dur))return;const c=AU.ctx,t=c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=AU.noise;f.type='lowpass';f.frequency.setValueAtTime(pl(fc),t);if(to)f.frequency.exponentialRampToValueAtTime(pl(to),t+dur);f.Q.value=q||.7;src.connect(f);f.connect(g);g.connect(AU.sfx);envG(g,t,.012,vol,dur);src.start(t,Math.random()*1.4);src.stop(t+dur+.12)}
// air-brake hiss: high-passed noise
function hiss(dur,vol){if(MUTE||!auOK()||!AU.on.sfx||!voice(dur))return;const c=AU.ctx,t=c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=AU.noise;src.loop=true;f.type='highpass';f.frequency.setValueAtTime(1500,t);f.frequency.linearRampToValueAtTime(900,t+dur);src.connect(f);f.connect(g);g.connect(AU.sfx);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.start(t,Math.random());src.stop(t+dur+.05)}
// hangar lift: a labouring hydraulic drone, a servo whine and a low mechanical rumble that all sink as the ship is lowered
// hangar lift: a smooth, deep motor drone (two slightly detuned saws under a low-pass), a low rumble and a slow servo, all sinking
function dockHyd(dur){dockHydStop();if(MUTE||!auOK()||!AU.on.sfx||dur<=.2)return;const c=AU.ctx,t=c.currentTime,N=[],G=[];
  const mk=(node,filt,vol)=>{const g=c.createGain();(filt||node).connect(g);if(filt)node.connect(filt);g.connect(AU.sfx);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.35);g.gain.setValueAtTime(vol,t+dur-.4);g.gain.linearRampToValueAtTime(.0001,t+dur);node.start(t);node.stop(t+dur+.1);N.push(node);G.push(g)};
  for(const f of[55,55.7]){const o=c.createOscillator(),lp=c.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*.86,t+dur);lp.type='lowpass';lp.frequency.setValueAtTime(260,t);lp.frequency.linearRampToValueAtTime(170,t+dur);lp.Q.value=.8;mk(o,lp,.065)}
  const n=c.createBufferSource(),nf=c.createBiquadFilter();n.buffer=AU.noise;n.loop=true;nf.type='lowpass';nf.frequency.setValueAtTime(320,t);nf.frequency.linearRampToValueAtTime(150,t+dur);mk(n,nf,.09);
  const w=c.createOscillator();w.type='sine';w.frequency.setValueAtTime(150,t);w.frequency.linearRampToValueAtTime(108,t+dur);mk(w,null,.045);
  AU.dockHyd={N,G}}
// deep structural sounds for the bay doors: a low rumble swept with the travel, and a resonant metal groan
function lowRumble(dur,f0,f1,vol){if(MUTE||!auOK()||!AU.on.sfx||!voice(dur))return;const c=AU.ctx,t=c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=AU.noise;src.loop=true;f.type='lowpass';f.Q.value=1.2;f.frequency.setValueAtTime(f0,t);f.frequency.linearRampToValueAtTime(f1,t+dur);src.connect(f);f.connect(g);g.connect(AU.sfx);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.15);g.gain.setValueAtTime(vol,t+dur*.7);g.gain.linearRampToValueAtTime(.0001,t+dur);src.start(t);src.stop(t+dur+.1)}
function metalGroan(dur,f0,f1,vol){if(MUTE||!auOK()||!AU.on.sfx||!voice(dur))return;const c=AU.ctx,t=c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=AU.noise;src.loop=true;f.type='bandpass';f.Q.value=5;f.frequency.setValueAtTime(f0,t);f.frequency.linearRampToValueAtTime(f1,t+dur);src.connect(f);f.connect(g);g.connect(AU.sx||AU.sfx);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.2);g.gain.setValueAtTime(vol,t+dur*.75);g.gain.linearRampToValueAtTime(.0001,t+dur);src.start(t);src.stop(t+dur+.1)}
// docking scan: two slow, low sonar pings under a soft band-limited sweep of the field across the hull
function scanPass(){if(MUTE||!auOK()||!AU.on.sfx||!voice(2))return;const c=AU.ctx,t=c.currentTime,bus=AU.sx||AU.sfx;
  for(const[d,f]of[[0,147],[.9,124]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(bus);g.gain.setValueAtTime(.0001,t+d);g.gain.linearRampToValueAtTime(.065,t+d+.03);g.gain.exponentialRampToValueAtTime(.0001,t+d+1.3);o.start(t+d);o.stop(t+d+1.4)}
  const n=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();n.buffer=AU.noise;n.loop=true;bp.type='bandpass';bp.Q.value=4;bp.frequency.setValueAtTime(200,t);bp.frequency.exponentialRampToValueAtTime(680,t+.9);bp.frequency.exponentialRampToValueAtTime(200,t+1.8);n.connect(bp);bp.connect(g);g.connect(bus);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.08,t+.3);g.gain.setValueAtTime(.08,t+1.5);g.gain.linearRampToValueAtTime(.0001,t+1.85);n.start(t);n.stop(t+1.9)}
// a calm, low two-note tone when the bay is sealed
function sealTone(){if(MUTE||!auOK()||!AU.on.sfx||!voice(1.6))return;const c=AU.ctx,t=c.currentTime;for(const[d,f]of[[0,196],[.28,294]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(AU.sx||AU.sfx);g.gain.setValueAtTime(.0001,t+d);g.gain.linearRampToValueAtTime(.022,t+d+.12);g.gain.exponentialRampToValueAtTime(.0001,t+d+1.2);o.start(t+d);o.stop(t+d+1.3)}}
function dockHydStop(){const H=AU.dockHyd;if(!H)return;AU.dockHyd=null;try{const t=AU.ctx.currentTime;for(const g of H.G){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(Math.max(.0001,g.gain.value),t);g.gain.linearRampToValueAtTime(.0001,t+.12)}for(const n of H.N)n.stop(t+.15)}catch(e){}}
// ============================================================ recorded sound effects
// Clips from Kenney's Sci-Fi Sounds, Interface Sounds and Digital SFX Set, and messersm's SpaceSFX1 (all CC0), packed into
// #sndpack. They are decoded once into buffers and played on their own bus (not through the synth's soft low-pass), with a
// little pitch jitter so repeats don't sound identical. Every sound keeps its synthesised recipe as the fallback.
const SND={b:{},m:null,loading:false,k:1};
// per-sound mix levels for the clips, set by ear-weighted loudness: explosions and jumps on top, guns and hits in the middle, console blips underneath
const SFXG={kinetic:0.324,laserNpc:0.519,turret:0.437,boom:0.359,missile:1.161,shield:0.631,hull:1.95,shieldDown:1.175,count:0.343,warn:1.38,distress:0.479,boost:0.966,jump:0.394,alarm:1.995,clunk:1.109,lance:0.525,pd:0.305,fjump:0.462,arrive:0.668,cbeep:0.724,mineOn:0.832,mineOff:1.38,ore:0.638,dockGrab:0.398,dockClamp:1.3,dockClank:1.035,dockSeal:0.385,dockAbort:1.135,crack:1.135,hatch:0.407,ui:1.514,uiErr:1.303};
function sndLoad(){if(SND.loading||!AU.ctx)return;SND.loading=true;const el=document.getElementById('sndpack');if(!el)return;let P;try{P=JSON.parse(el.textContent)}catch(e){return}SND.m=P.m;
  for(const k in P.d){const bin=atob(P.d[k]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    try{const pr=AU.ctx.decodeAudioData(u.buffer,b=>{SND.b[k]=b},()=>{});if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}}}
function sk(n){return Array.isArray(n)?n[Math.floor(Math.random()*n.length)]:n}
// play a clip: name (or list to pick from), volume, playback rate, delay in s, pitch jitter. False if it isn't loaded.
function smp(n,vol,rate,dl,jit){if(!auOK()||!AU.on.sfx||!AU.sx)return false;const b=SND.b[sk(n)];if(!b)return false;vol*=SND.k;if(vol<.004)return true;
  rate=(rate||1)*PITCH*(1+(jit===undefined?.06:jit)*(Math.random()*2-1));if(!voice(b.duration/rate+(dl||0)))return true;
  const c=AU.ctx,s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=vol;s.connect(g);g.connect(AU.sx);s.start(c.currentTime+(dl||0));return true}
// bridge room tone: no longer a loop (it played every 4 s); bridgeAmb plays it once every 2-4 minutes. This only fades out
// a loop left running by an older build.
function bridgeHum(t){if(AU.bh&&!AU.bh.off){AU.bh.g.gain.setTargetAtTime(0,t,.3);AU.bh.off=1;try{AU.bh.s.stop(t+2)}catch(e){}}}
const SFX0={
  kinetic(v){if(smp(['kin1','kin2','kin3'],.5*v,.85))thump(120,46,.1,.07*v);else{thump(135,46,.12,.15*v);rumble(380,.09,.1*v)}},
  laserNpc(v){if(!smp(['npc1','npc2','npc3'],.3*v,1))thump(72,66,.2,.06*v,'sawtooth')},
  turret(v){if(!smp(['tur1','tur2'],.42*v,1.05)){thump(110,42,.14,.11*v);rumble(300,.1,.08*v)}},
  // capital-gun impacts land many times a second; play at most about three small blasts a second so they don't merge into a drone
  boom(r,v){const k=clamp(r/110,.3,1.6),big=k>.75;if(r<=60){const n=AU.ctx?AU.ctx.currentTime:0;if(n-(AU.smB||-9)<.33)return;AU.smB=n}
    if(smp(big?'exB':k>.45?['ex2','ex3']:['ex1','exS1','exS2'],.7*v*Math.min(1.2,.6+k*.5)*(big?2.8:1),big?.9:1.1-k*.2)){if(big)smp(['sub1','sub2'],2.1*v*Math.min(1.3,k),1);thump(60,22,.4*k+.2,.17*v*k)}
    else{thump(68,22,.5*k+.25,.3*v*k);rumble(240,.45+.6*k,.4*v*Math.min(1.2,k),.7,55)}},
  missile(v,tp){if(smp(['msl1','msl2'],.5*v*(tp?1.5:1),tp?.7:1))thump(tp?48:66,tp?28:38,tp?1.1:.55,.1*v);else{rumble(tp?200:300,tp?1.5:.85,.24*v,1.1,tp?110:170);thump(tp?48:66,tp?28:38,tp?1.1:.55,.15*v)}},
  shield(){const n=AU.ctx?AU.ctx.currentTime:0;if(n-(AU.shdT||-9)<.12)return;AU.shdT=n;if(!smp(['shd1','shd2','shd3'],.42,1.3)){thump(150,78,.16,.12,'triangle');rumble(360,.12,.08,2)}},
  hull(){const n=AU.ctx?AU.ctx.currentTime:0;if(n-(AU.hulT||-9)<.15)return;AU.hulT=n;if(smp(['hul1','hul2','hul3'],.6,1))rumble(280,.18,.08);else{thump(92,36,.24,.22);rumble(280,.22,.16)}},
  shieldDown(){if(smp('shdDn',.55,.65))smp('lowDown',.4,1,.15,0);else{thump(110,108,.26,.13,'triangle');setTimeout(()=>thump(82,80,.38,.13,'triangle'),270)}},
  beep(f,v){thump(f,f*.99,.08,.05*(v||1),'sine')},
  count(fin){if(fin){if(!smp('go',.4,1,0,0)){thump(988,984,.34,.15,'triangle');setTimeout(()=>thump(1318,1312,.22,.09,'sine'),80)}}else if(!smp('tick',.42,1,0,0))thump(659,656,.16,.14,'triangle')},
  warn(){if(!smp('warn',.32,1,0,0))thump(146,144,.16,.075,'triangle')},
  distress(){if(smp('dist',.42,1,0,0))setTimeout(()=>chatterRun(),1150);else{[0,150,300,560,710,860].forEach((d,i)=>setTimeout(()=>thump(i%2?660:880,i%2?655:874,.11,.075,'triangle'),d));setTimeout(()=>chatterRun(),1050)}},
  boost(){if(smp('boost',.55,.9))thump(52,38,.6,.12);else{rumble(170,.9,.32,1,480);thump(52,38,.6,.17)}},
  jump(){if(smp('warp',.5,.75)){smp('phase1',.35,.8);thump(40,26,1.8,.16)}else{rumble(110,2,.34,1.2,640);thump(40,26,1.8,.2)}},
  alarm(){if(!smp('alarm',.42,1,0,0)){thump(98,96,.22,.12,'triangle');setTimeout(()=>thump(73,72,.3,.12,'triangle'),240)}},
  clunk(){if(!smp(['clk1','hul3'],.5,1.1)){thump(88,48,.22,.17,'triangle');rumble(230,.18,.12)}},
  lance(v){if(smp('lance',.6*v,.55)){smp('sub2',.6*v,1.1);thump(58,22,1.3,.2*v)}else{thump(58,22,1.3,.34*v);thump(116,40,.35,.14*v,'triangle');rumble(150,1.1,.34*v,.8,38)}},
  pd(v){if(SND.b.pd1&&auOK()){for(let i=0;i<3;i++)smp(['pd1','pd2'],.24*v,1.35,i*.07)}else for(let i=0;i<3;i++)setTimeout(()=>{thump(95,55,.08,.08*v,'square');thump(48,32,.11,.13*v);rumble(260,.07,.08*v,1.2)},i*70)},
  drum(v,p){const k=.55+.75*p;thump(64-14*p,30,.55+.3*p,(.17+.25*p)*v*k);rumble(170,.45+.35*p,(.13+.22*p)*v*k,.9,45)},
  fjump(v){if(smp('warp',.55*v,.5)){smp('sub1',.7*v,.9,.15);thump(95,22,1.5,.3*v)}else{rumble(1400,1.3,.42*v,1.2,90);thump(95,22,1.5,.44*v);setTimeout(()=>thump(40,18,1.4,.32*v),160)}},
  arrive(v){if(smp('phase3',.4*v,.7)){smp('sub2',.5*v,1.3);thump(70,30,.8,.15*v)}else{thump(320,60,.45,.2*v,'triangle');rumble(1000,.7,.24*v,1,140);thump(70,30,.8,.22*v)}},
  step(k){thump(92*(k||1),52,.09,.05,'sine');rumble(420,.06,.028,1.4)},
  cbeep(){if(!smp(['cb1','cb2','cb3','cb4','cb5','cb6'],.15,1,0,.12)){const f=[784,880,988,1175,1319][Math.floor(Math.random()*5)];thump(f,f,.07,.024,'sine');if(Math.random()<.45)setTimeout(()=>thump(f*1.26,f*1.26,.06,.02,'sine'),95)}},
  chatter(){chatterRun()},
  mineOn(){thump(78,44,.32,.14);rumble(520,.4,.12,.8,170);if(auOK()){const t=AU.ctx.currentTime;for(let i=0;i<9;i++)mineCrackle(t+.04+i*.03+Math.random()*.02,1.4)}},
  mineOff(){rumble(300,.35,.08,.7,80);if(!smp('clk1',.1,.55,.05,.04))thump(120,60,.12,.06)},
  ore(n){const now=performance.now();if(now-(AU.oreT||0)<240)return;AU.oreT=now;thump(98+(n%3)*7,46,.22,.42);rumble(260,.14,.18,.9);smp(['clk1','clk2'],.22,.52+.03*(n%3),0,.04)},
  dockGrab(){lowRumble(1.05,220,420,.08);metalGroan(1.05,140,190,.42);if(smp('clk2',.3,.75,.95,.02)){}else{thump(88,48,.22,.17,'triangle');rumble(230,.18,.12);thump(48,96,1.7,.09,'triangle');[250,420].forEach(d=>setTimeout(()=>thump(1046,1040,.09,.045,'sine'),d))}},
  dockClamp(){dockHyd(DOCK_T-2.45);lowRumble(.45,130,60,.07);if(smp('clk2',.32,.75)){}else{thump(70,28,.55,.28);rumble(320,.35,.2,.9,90);thump(180,120,.09,.08,'square');setTimeout(()=>hiss(.7,.07),120)}},
  dockClank(i){if(!smp('clk1',.26,.7+.05*(i%2),0,.03)){thump(250+20*(i%2),180,.06,.05,'square');thump(78,42,.16,.1);rumble(500,.06,.05,1.6)}},
  dockSeal(){lowRumble(.7,95,45,.1);if(smp('clk2',.42,.62)){setTimeout(()=>hiss(1.1,.035),140);setTimeout(()=>sealTone(),550)}else{thump(54,22,.85,.32);rumble(200,.75,.26,.8,55);setTimeout(()=>hiss(1.2,.09),160);setTimeout(()=>{thump(784,780,.1,.05,'sine');setTimeout(()=>thump(1046,1042,.16,.05,'sine'),110)},700)}},
  dockAbort(){if(!smp('err',.4,1,0,0)){thump(330,160,.25,.07,'triangle');setTimeout(()=>thump(220,110,.3,.07,'triangle'),180)}},
  crack(v){v=v==null?1:v;if(v<.02)return;if(smp('exB',.8*v,.8)){smp('sub1',.8*v,1);thump(150,40,.5,.15*v)}else{thump(150,40,.5,.24*v);rumble(900,.35,.22*v,1,180);setTimeout(()=>rumble(400,.6,.16*v,.8,90),90)}},
  hatch(){smp('doorO',.4,.9)},
  rcs(){smp(['rcs1','rcs2'],.22,.8,0,.08)},
  dockScan(){scanPass()},
  dockDoor(){lowRumble(.75,420,180,.07);metalGroan(.75,190,130,.36)},
  ui(){smp(['click','click2'],.2,1,0,.05)},
  uiErr(){const t=performance.now();if(t-(AU.errT||0)<450)return;AU.errT=t;smp('err',.22,1.1,0,0)},
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
};
const SFX={};for(const k in SFX0)SFX[k]=(...a)=>{if(MUTE)return;SND.k=SFXG[k]||1;try{return SFX0[k](...a)}finally{SND.k=1}};
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button,.btn,[data-act],[data-fc],[data-tab],[data-fac],[data-cls],[data-role]');if(b&&!b.disabled)SFX.ui()},true);
// one crackle of rock burning under the beam: a few milliseconds of band-passed white noise at a random pitch and level
function mineCrackle(t,k){const c=AU.ctx;if(!AU.white||MUTE||!AU.on.sfx)return;const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),d=.01+Math.random()*.045,v=(.022+Math.random()*.055)*(k||1);
  n.buffer=AU.white;f.type='bandpass';f.frequency.value=600+Math.random()*1500;f.Q.value=1.1;n.connect(f);f.connect(g);g.connect(AU.sx||AU.sfx);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.start(t,Math.random()*.8);n.stop(t+d+.02)}
function auFrame(){if(!auOK())return;const c=AU.ctx,t=c.currentTime,E=AU.eng,fdt=Math.min(.1,Math.max(0,t-(AU.lastFT||t)));AU.lastFT=t;bridgeHum(t);let g=0,ng=0,f=34,lg=0,ml=0;
  if(running&&W&&W.player&&!S.player.docked&&!W.dead&&AU.on.sfx){const p=W.player,sp=hyp(p.vx,p.vy,p.vz),k=clamp(sp/(p.st.maxSpd*1.9),0,1);
    const on=p.thrusting||p.boosting;g=on?.05+.02*k+(p.boosting?.03:0):0;ng=on?.05+(p.boosting?.09:0)+k*.012:0;f=41+k*3+(p.boosting?2:0);if(AU.lasW===W&&W.t>=AU.lasT&&W.t-AU.lasT<.14)lg=.1;   // stamped per system: each system's clock restarts at 0, so a stamp from the last one held the laser hum on after a jump
    if(p.mining){ml=.075+.012*Math.sin(t*2.3);const m=invMass(S.player.cargo);if(AU.mineM!=null&&m>AU.mineM+.5){AU.oreN=(AU.oreN||0)+1;SFX.ore(AU.oreN)}AU.mineM=m}}
  const mOn=ml>0;if(mOn!==!!AU.mineOn){AU.mineOn=mOn;if(mOn)SFX.mineOn();else{SFX.mineOff();AU.mineM=null}}if(!mOn)AU.mineM=null;
  AU.mine.g.gain.setTargetAtTime(ml,t,mOn?.06:.09);if(mOn){let k=0;while(k<3&&Math.random()<fdt*24){mineCrackle(t+Math.random()*.04);k++}}
  E.g.gain.setTargetAtTime(g,t,g>0?.1:.25);E.ng.gain.setTargetAtTime(ng,t,ng>0?.08:.22);E.o1.frequency.setTargetAtTime(f,t,.8);E.o2.frequency.setTargetAtTime(f*1.51,t,.8);E.nf.frequency.setTargetAtTime(240+ng*1800,t,.4);
  AU.las.g.gain.setTargetAtTime(lg,t,.05);
  if(AU.whir){const Wh=AU.whir,wi=running&&AU.on.sfx?AU.whirIn:null;AU.whirIn=null;if(wi){const p=Math.pow(clamp(wi.p,0,1),1.7),f=30+58*p;Wh.o1.frequency.setTargetAtTime(f,t,.3);Wh.o2.frequency.setTargetAtTime(f*1.502,t,.3);Wh.nf.frequency.setTargetAtTime(160+350*p,t,.35);Wh.f.frequency.setTargetAtTime(140+475*p,t,.35);Wh.lfo.frequency.setTargetAtTime(3+12*p,t,.35);Wh.lg.gain.setTargetAtTime(50+130*p,t,.35);Wh.g.gain.setTargetAtTime(Math.min(1.2,wi.v)*(.06+.1*p),t,.25)}else Wh.g.gain.setTargetAtTime(0,t,.12)}}
// generative ambient score: slow low pads over Am - F - C - G, a soft sub pulse, and the odd low bell
const CHORDS=[[55,110,130.81,164.81],[43.65,87.31,110,130.81],[65.41,98,130.81,164.81],[49,98,123.47,146.83],[55,110,130.81,164.81],[43.65,87.31,110,146.83],[41.2,82.41,123.47,146.83],[49,98,116.54,146.83]];
function musicStart(){const c=AU.ctx;AU.mf=c.createBiquadFilter();AU.mf.type='lowpass';AU.mf.frequency.value=480;AU.mf.Q.value=.6;AU.mf.connect(AU.mus);
  const lfo=c.createOscillator();lfo.frequency.value=.04;const lg=c.createGain();lg.gain.value=160;lfo.connect(lg);lg.connect(AU.mf.frequency);lfo.start();
  AU.mNext=c.currentTime+.4;AU.mIdx=0;setInterval(musicTick,500);setInterval(()=>musRecTick(.1),100)}
function musicTick(){if(!auOK())return;const c=AU.ctx;if(!AU.on.music||!musGen()){AU.mNext=c.currentTime+.4;return}while(AU.mNext<c.currentTime+1.5){playChord(CHORDS[AU.mIdx%CHORDS.length],AU.mNext,11);AU.mIdx++;AU.mNext+=9.5}}
// ---- recorded music: battle music while you're trading fire (see musHit); otherwise ambient, one track for each faction's space, one for freeports, one for Brood space and hives, one for open space, streamed from music/
// beside the game (never embedded, so the page stays light). A track loads only when it's first needed, loops, and
// crossfades over MUS_FADE s when you jump into space held by someone else. Volume comes from the Sound panel. If a track can't load (say the page was
// opened on its own, without its music folder), the generated score plays instead.
const MUS_END=6,MUS_GAP=3;   // a track fades out over its last MUS_END s, rests MUS_GAP s, then plays again from the top
const MUS_BHOLD=25,MUS_BFADE=1.5,MUS_BRESET=40;   // battle music: holds MUS_BHOLD s past the last exchange of fire, cuts in over MUS_BFADE s, starts from the top after MUS_BRESET s of quiet
const MUS_TRK={battle:'music/battle.mp3',open:'music/open.mp3',brood:'music/brood.mp3',freeport:'music/freeport.mp3',halcyon:'music/halcyon.mp3',ostrova:'music/ostrova.mp3',varkesh:'music/varkesh.mp3'},MUS_FADE=4;
const MZ={el:{},bad:{},bt:-1e9};
const musNow=()=>performance.now()/1000;
// a fight starts the battle track when your shots land on shields or your own shields take fire; any further hit either way keeps it going
function musHit(shieldUp){const t=musNow();if(shieldUp||t-MZ.bt<MUS_BHOLD)MZ.bt=t}
function musBattle(){if(!S||!W||!W.player||!W.player.alive||S.player.docked)return false;return musNow()-MZ.bt<MUS_BHOLD}
function musKey(){if(!W||!W.sid||!S)return'open';if(musBattle())return'battle';try{if(isFreeport(W.sid))return'freeport'}catch(e){}let o=null;try{o=sectorOwner(W.sid)}catch(e){}if(o==='player')o=S.player.faction;if(DEF[W.sid]&&DEF[W.sid].kind==='hive')o='brood';return o&&o!=='open'&&MUS_TRK[o]?o:'open'}
function musGen(){return!!MZ.bad[musKey()]}   // the generated score fills in only where the recorded track failed
function musEl(k){let a=MZ.el[k];if(a)return a;a=new Audio();a.loop=false;a.preload='auto';a.volume=0;a._v=0;a._gap=0;a.addEventListener('error',()=>{MZ.bad[k]=1});a.addEventListener('ended',()=>{a._v=0;a._gap=MUS_GAP});a.src=MUS_TRK[k];return MZ.el[k]=a}
function musRecTick(dt){if(NET.cl&&W&&W.player){const sh=W.player.shield;if(MZ.lsh>0&&sh<MZ.lsh-.5&&W.player.alive)musHit(true);MZ.lsh=sh}   // a client's own shield hits arrive from the host
  if(S&&S.player&&S.player.docked)MZ.bt=-1e9;const want=AU.on.music&&!document.hidden?musKey():null;if(want&&!MZ.bad[want])musEl(want);
  for(const k in MZ.el){const a=MZ.el[k];let tg=k===want&&!MZ.bad[k]?1:0;
    if(a._gap>0){a._gap-=dt;tg=0;if(a._gap<=0){a._gap=0;try{a.currentTime=0}catch(e){}}}
    else if(tg&&isFinite(a.duration)&&a.duration>MUS_END*3)tg=Math.min(1,Math.max(0,(a.duration-a.currentTime)/MUS_END));   // fade out into the track's end
    if(tg>0&&a.paused&&!a._pp){a._pp=1;if(k==='battle'&&a._stopT&&musNow()-a._stopT>MUS_BRESET){try{a.currentTime=0}catch(e){}}const pr=a.play();if(pr&&pr.then)pr.then(()=>{a._pp=0},()=>{a._pp=0;MZ.bad[k]=1});else a._pp=0}
    a._v+=Math.sign(tg-a._v)*Math.min(Math.abs(tg-a._v),dt/(want==='battle'?MUS_BFADE:MUS_FADE));try{a.volume=Math.max(0,Math.min(1,a._v*AU.on.mvol/100))}catch(e){}
    if(tg===0&&a._v<=0&&!a.paused&&!(k===want&&a._gap===0&&!MZ.bad[k]&&isFinite(a.duration)&&a.duration-a.currentTime<MUS_END)){a.pause();a._stopT=musNow()}}}
function playChord(ch,t,len){const c=AU.ctx;
  ch.forEach((f,i)=>{for(const det of[-5,5]){const o=c.createOscillator(),g=c.createGain(),pk=i===0?.12:.045;o.type=i===0?'triangle':'sawtooth';o.frequency.value=f;o.detune.value=det;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(pk,t+3.2);g.gain.setValueAtTime(pk,t+len-3.6);g.gain.linearRampToValueAtTime(.0001,t+len);o.connect(g);g.connect(AU.mf);o.start(t);o.stop(t+len+.1)}});
  for(let k=0;k<4;k++){const tb=t+.5+k*2.4,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=ch[0];g.gain.setValueAtTime(.0001,tb);g.gain.linearRampToValueAtTime(.09,tb+.06);g.gain.exponentialRampToValueAtTime(.0001,tb+1.8);o.connect(g);g.connect(AU.mus);o.start(tb);o.stop(tb+1.9)}
  if(Math.random()<.65){const tb=t+2+Math.random()*4.5,f=ch[1+Math.floor(Math.random()*3)]*2,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,tb);g.gain.linearRampToValueAtTime(.045,tb+.03);g.gain.exponentialRampToValueAtTime(.0001,tb+4.5);o.connect(g);g.connect(AU.mus);o.start(tb);o.stop(tb+4.6)}}
function auToggle(){if(AU.on.sfx&&!AU.on.music)AU.on.music=true;else if(AU.on.sfx){AU.on.sfx=false;AU.on.music=false}else{AU.on.sfx=true;AU.on.music=false}auSave();auApply();flash(AU.on.sfx?(AU.on.music?'Sound effects and music on':'Sound effects on, music off'):'Sound off');if(!$('sndPop').hidden)sndSync()}
function auApply(){const b=$('bSnd');if(b)b.innerHTML=(AU.on.sfx?(AU.on.music?'Music':'Sound'):'Muted')+' <kbd>N</kbd>';if(!AU.ctx)return;const t=AU.ctx.currentTime;const sv=AU.on.svol/100;AU.sfx.gain.setTargetAtTime(AU.on.sfx?sv:0,t,.1);if(AU.sx)AU.sx.gain.setTargetAtTime(AU.on.sfx?.75*sv:0,t,.1);AU.mus.gain.setTargetAtTime(AU.on.music?.25*AU.on.mvol/45:0,t,.3)}
