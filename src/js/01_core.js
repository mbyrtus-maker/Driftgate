//@src 01_core.js
(()=>{
'use strict';
// ============================================================ utils
const TAU=Math.PI*2;
const rnd=(a,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hyp=Math.hypot;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ROMAN=['','I','II','III','IV','V'];
const fmt=n=>Math.round(n).toLocaleString('en-US');
function sideAdj(sd){return sd==='pirate'?'Unbound':sideName(sd)}
function art(w){return/^[aeiou]/i.test(w)?'An':'A'}
function wpick(o){let t=0;for(const k in o)t+=o[k];let r=Math.random()*t;for(const k in o){r-=o[k];if(r<=0)return k}return Object.keys(o)[0]}
function wpickArr(a){let t=0;for(const x of a)t+=x[1];let r=Math.random()*t;for(const x of a){r-=x[1];if(r<=0)return x[0]}return a[0][0]}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const inv={
  add(o,k,n){if(n>0)o[k]=(o[k]||0)+n},
  take(o,k,n){const h=o[k]||0,t=Math.min(h,n);if(t>0){o[k]=h-t;if(!o[k])delete o[k]}return t},
  addAll(o,src){for(const k in src)inv.add(o,k,src[k])},
};
function haveIn(req,srcs){for(const k in req){let h=0;for(const s of srcs)h+=s[k]||0;if(h<req[k])return false}return true}
function takeFrom(req,srcs){if(!haveIn(req,srcs))return false;for(const k in req){let n=req[k];for(const s of srcs){if(n<=0)break;n-=inv.take(s,k,n)}}return true}
function countIn(k,srcs){let h=0;for(const s of srcs)h+=s[k]||0;return h}
function hexRGB(h){const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
function hexA(h,a){const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function mixC(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function scaleC(c,k){return[c[0]*k,c[1]*k,c[2]*k]}

// ============================================================ 3D math (quaternions: local +Z forward, +Y up)
const q0=()=>({x:0,y:0,z:0,w:1});
function qCopy(o,a){o.x=a.x;o.y=a.y;o.z=a.z;o.w=a.w;return o}
function qMul(a,b,o){const x=a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y=a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z=a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w=a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z;o.x=x;o.y=y;o.z=z;o.w=w;return o}
function qAxis(ax,ay,az,ang,o){const s=Math.sin(ang/2);o.x=ax*s;o.y=ay*s;o.z=az*s;o.w=Math.cos(ang/2);return o}
function qNorm(q){const l=Math.hypot(q.x,q.y,q.z,q.w)||1;q.x/=l;q.y/=l;q.z/=l;q.w/=l;return q}
function qRot(q,x,y,z,o){const ix=q.w*x+q.y*z-q.z*y,iy=q.w*y+q.z*x-q.x*z,iz=q.w*z+q.x*y-q.y*x,iw=-q.x*x-q.y*y-q.z*z;
  o.x=ix*q.w+iw*-q.x+iy*-q.z-iz*-q.y;o.y=iy*q.w+iw*-q.y+iz*-q.x-ix*-q.z;o.z=iz*q.w+iw*-q.z+ix*-q.y-iy*-q.x;return o}
function qFromBasis(X,Y,Z,o){const m11=X.x,m12=Y.x,m13=Z.x,m21=X.y,m22=Y.y,m23=Z.y,m31=X.z,m32=Y.z,m33=Z.z,tr=m11+m22+m33;let s;
  if(tr>0){s=.5/Math.sqrt(tr+1);o.w=.25/s;o.x=(m32-m23)*s;o.y=(m13-m31)*s;o.z=(m21-m12)*s}
  else if(m11>m22&&m11>m33){s=2*Math.sqrt(1+m11-m22-m33);o.w=(m32-m23)/s;o.x=.25*s;o.y=(m12+m21)/s;o.z=(m13+m31)/s}
  else if(m22>m33){s=2*Math.sqrt(1+m22-m11-m33);o.w=(m13-m31)/s;o.x=(m12+m21)/s;o.y=.25*s;o.z=(m23+m32)/s}
  else{s=2*Math.sqrt(1+m33-m11-m22);o.w=(m21-m12)/s;o.x=(m13+m31)/s;o.y=(m23+m32)/s;o.z=.25*s}return qNorm(o)}
const _bX={x:0,y:0,z:0},_bY={x:0,y:0,z:0},_bZ={x:0,y:0,z:0};
function qLook(fx,fy,fz,ux,uy,uz,o){let l=Math.hypot(fx,fy,fz)||1;_bZ.x=fx/l;_bZ.y=fy/l;_bZ.z=fz/l;
  let xx=uy*_bZ.z-uz*_bZ.y,xy=uz*_bZ.x-ux*_bZ.z,xz=ux*_bZ.y-uy*_bZ.x;l=Math.hypot(xx,xy,xz);
  if(l<1e-5){const ax=Math.abs(_bZ.y)<.9?[0,1,0]:[1,0,0];xx=ax[1]*_bZ.z-ax[2]*_bZ.y;xy=ax[2]*_bZ.x-ax[0]*_bZ.z;xz=ax[0]*_bZ.y-ax[1]*_bZ.x;l=Math.hypot(xx,xy,xz)}
  _bX.x=xx/l;_bX.y=xy/l;_bX.z=xz/l;_bY.x=_bZ.y*_bX.z-_bZ.z*_bX.y;_bY.y=_bZ.z*_bX.x-_bZ.x*_bX.z;_bY.z=_bZ.x*_bX.y-_bZ.y*_bX.x;return qFromBasis(_bX,_bY,_bZ,o)}
function qSlerp(a,b,t){if(t<=0)return a;if(t>=1)return qCopy(a,b);const x=a.x,y=a.y,z=a.z,w=a.w;let c=w*b.w+x*b.x+y*b.y+z*b.z,bx=b.x,by=b.y,bz=b.z,bw=b.w;
  if(c<0){c=-c;bx=-bx;by=-by;bz=-bz;bw=-bw}if(c>=1)return a;const sq=1-c*c;
  if(sq<=1e-9){const s=1-t;a.w=s*w+t*bw;a.x=s*x+t*bx;a.y=s*y+t*by;a.z=s*z+t*bz;return qNorm(a)}
  const sn=Math.sqrt(sq),ang=Math.atan2(sn,c),ra=Math.sin((1-t)*ang)/sn,rb=Math.sin(t*ang)/sn;a.w=w*ra+bw*rb;a.x=x*ra+bx*rb;a.y=y*ra+by*rb;a.z=z*ra+bz*rb;return a}
function qTowards(a,b,step){const d=Math.abs(a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w),ang=2*Math.acos(Math.min(1,d));if(ang<1e-6)return a;return qSlerp(a,b,Math.min(1,step/ang))}
function mModel(o,px,py,pz,q,sx,sy,sz){const x=q.x,y=q.y,z=q.z,w=q.w,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  o[0]=(1-(yy+zz))*sx;o[1]=(xy+wz)*sx;o[2]=(xz-wy)*sx;o[3]=0;o[4]=(xy-wz)*sy;o[5]=(1-(xx+zz))*sy;o[6]=(yz+wx)*sy;o[7]=0;
  o[8]=(xz+wy)*sz;o[9]=(yz-wx)*sz;o[10]=(1-(xx+yy))*sz;o[11]=0;o[12]=px;o[13]=py;o[14]=pz;o[15]=1;return o}
function mMul(o,a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+rr]*b[c*4+k];r[c*4+rr]=s}o.set(r);return o}
const d3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function rdir(flat){let x,y,z,l;do{x=rnd(-1,1);y=rnd(-1,1);z=rnd(-1,1);l=x*x+y*y+z*z}while(l>1||l<.02);y*=flat===undefined?1:flat;l=Math.hypot(x,y,z);return{x:x/l,y:y/l,z:z/l}}

// ============================================================ items & recipes
const RAWS=['fe','cu','ir','xc','au','nu'];
const ITEMS={
  fe:{name:'Ferrite',base:6,col:'#bba98d'},
  cu:{name:'Cuprite',base:7,col:'#e48a5a'},
  ir:{name:'Iridium',base:16,col:'#9cc4ec'},
  xc:{name:'Xenocrystal',base:40,col:'#c99cff'},
  au:{name:'Aurorite',base:70,col:'#6ff2cf'},
  nu:{name:'Vantium',base:30,col:'#c6f25a'},
  plate:{name:'Alloy Plate',recipe:{fe:3},col:'#d6ccb4'},
  wire:{name:'Conduit',recipe:{cu:3},col:'#f2a070'},
  coil:{name:'Flux Coil',recipe:{wire:2,ir:2},col:'#acd6ff'},
  lattice:{name:'Crystal Lattice',recipe:{plate:2,xc:2},forge:true,col:'#d9bbff'},
  core:{name:'Resonance Core',recipe:{lattice:1,coil:1,xc:2},forge:true,col:'#ffd27a'},
  beacon:{name:'Claim Beacon',recipe:{plate:2,wire:2},col:'#f0b24a'},
  missile:{name:'Seeker Missile',recipe:{wire:1,ir:1},col:'#ff8f6b'},
  torpedo:{name:'Siege Torpedo',recipe:{plate:1,coil:1,ir:2},col:'#ffcf5a'},
  drone:{name:'Guard Drone',recipe:{plate:1,wire:1,coil:1},col:'#9fe0c8'},
  swarm:{name:'Swarm Pod',recipe:{missile:4,coil:2,xc:2},col:'#ff6fae'},
  tune:{name:'Aurora Tuning',recipe:{au:2,coil:1},col:'#8ff7dc'},
  keel:{name:'Capital Keel',recipe:{plate:20,coil:6,ir:16,nu:8},col:'#b8c4d8'},
  picket:{name:'Picket Kit',recipe:{plate:3,wire:2,coil:1},col:'#e8d8a0'},
  frame:{name:'Depot Frame',recipe:{plate:10,wire:6,coil:3},col:'#c8d2e0'},
  // made only by the Freeport Compact, from goods traders sell it, and bought only at a freeport
  matrix:{name:'Calibration Matrix',recipe:{wire:2,coil:1,xc:1},fp:true,col:'#7fe3ff'},   // every Mk III upgrade
  seal:{name:'Compact Seal',recipe:{plate:4,coil:2,xc:2},fp:true,col:'#ffb36b'},          // every capital build: shipyard 2, carrier 3, escort 1
};
const FP_ONLY=new Set(['matrix','seal']);

// ============================================================ ship upgrade choices: from Mk II each system takes one variant, a real part built from
// materials (an item, so the ledger counts it), fitted per ship in tune.vr and free to swap at any dock with Upgrades. A variant buys a
// strength with a weakness. Fitted variants go down with the ship: half spill into the crate as salvage, the rest is lost as debris.
const VAR_RECIPE={plate:2,coil:2,lattice:1};
const UNB_VARS={scanbaf:{slot:'power',name:'Scan baffles',spec:'unb',gain:'Patrol scans 30% less likely to see through false colours',cost:'−10% energy capacity',m:{eCap:.9},f:{scanK:.7},recipe:{plate:3,wire:3}},
  jamemit:{slot:'weapon',name:'Jammer emitters',spec:'unb',gain:'Jammers fill the bar 45% faster',cost:'−10% damage in normal fire',m:{dmg:.9},f:{jamK:1.45},recipe:{plate:3,wire:3}},
  longharp:{slot:'payload',name:'Long harpoons',spec:'unb',gain:'Harpoon tethers stretch the hook to 600 m',cost:'−25% rack size',f:{tetherR:600,rackK:.75},recipe:{plate:3,wire:3}},
  tcutter:{slot:'payload',name:'Tether cutter',spec:'jam',gain:'Flares also break shock-harpoon tethers',cost:'−25% rack size',f:{tetherCut:1,rackK:.75},recipe:{plate:3,wire:3}}};
const VARIANTS={
  sprint:{slot:'engine',name:'Sprint drive',gain:'+25% top speed, afterburner lasts longer',cost:'−20% turn',m:{maxSpd:1.25,turn:.8},f:{boostK:.8}},
  vector:{slot:'engine',name:'Vector drive',gain:'+30% turn',cost:'−12% top speed',m:{turn:1.3,maxSpd:.88}},
  longburn:{slot:'engine',name:'Long-burn drive',gain:'Afterburner uses 40% less energy',cost:'−15% acceleration',m:{thrust:.85},f:{boostK:.6}},
  surge:{slot:'power',name:'Surge core',gain:'+50% energy capacity',cost:'Recharge runs at half speed for a second after firing or boosting',m:{eCap:1.5},f:{surge:1,surgeK:.5}},
  steady:{slot:'power',name:'Steady core',gain:'+35% energy recharge',cost:'−25% energy capacity',m:{eRegen:1.35,eCap:.75}},
  bastion:{slot:'shield',name:'Bastion',gain:'+35 shield capacity',cost:'Recharge waits 5 s after a hit, not 2.5 s',a:{sCap:35},f:{shDelay:5}},
  flicker:{slot:'shield',name:'Flicker',gain:'Recharge starts after 1.5 s and runs 60% faster',cost:'−30% shield capacity',m:{sCap:.7},f:{shDelay:1.5,shRegK:1.6}},
  tunedk:{slot:'shield',name:'Tuned emitter (kinetic)',gain:'Shields take 30% less from kinetic fire',cost:'Shields take 20% more from lasers',f:{tuned:'kinetic'}},
  tunedl:{slot:'shield',name:'Tuned emitter (laser)',gain:'Shields take 30% less from lasers',cost:'Shields take 20% more from kinetic fire',f:{tuned:'laser'}},
  heavyc:{slot:'weapon',name:'Heavy cannons',gain:'+35% damage per shot',cost:'−30% fire rate, 15% slower shells',m:{dmg:1.35,rof:.7},f:{shotSpd:977.5}},
  rapid:{slot:'weapon',name:'Rapid fire',gain:'+45% fire rate',cost:'−25% damage, higher energy drain',m:{rof:1.45,dmg:.75}},
  longbar:{slot:'weapon',name:'Long barrel',gain:'+30% range, shells fly 15% faster',cost:'−5% fire rate',m:{rof:.95},f:{shotTtl:1.3,shotSpd:1322.5}},
  ablative:{slot:'armor',name:'Ablative plating',gain:'+35 hull',cost:'−10% speed, acceleration and turn',m:{maxSpd:.9,thrust:.9,turn:.9},a:{hull:35}},
  lightframe:{slot:'armor',name:'Light frame',gain:'+15% turn and acceleration',cost:'−10% hull',m:{hull:.9,turn:1.15,thrust:1.15}},
  reactive:{slot:'armor',name:'Reactive plating',gain:'+12% damage reduction',cost:'−10% shields',m:{sCap:.9},a:{dr:.12}},
  bulk:{slot:'cargo',name:'Bulk hold',gain:'+50% hold',cost:'Always handles as at least half laden',m:{cargo:1.5},f:{ladenMin:.5}},
  stable:{slot:'cargo',name:'Stabilised hold',gain:'Half the laden handling penalty',cost:'−20% hold',m:{cargo:.8,ladenK:.5}},
  deepmag:{slot:'payload',name:'Deep magazine',gain:'+50% missiles in the rack',cost:'Always flies as at least a third laden',f:{rackK:1.5,ladenMin:1/3}},
  quickcyc:{slot:'payload',name:'Quick-cycle rack',gain:'Reloads twice as fast',cost:'−40% rack size',f:{reloadK:.5,rackK:.6}},
  smart:{slot:'payload',name:'Smart seekers',gain:'−40% lock time',cost:'−20% missile damage',f:{lockK:.6,mslK:.8}},
  faraday:{slot:'armor',name:'Faraday plating',spec:'jam',gain:'Jam bar 50% larger, so a take lasts longer',cost:'−10% hull',m:{hull:.9},f:{jamBarK:1.5},recipe:{plate:3,wire:3}},
  fastboot:{slot:'power',name:'Fast-reboot reactor',spec:'jam',gain:'Jam bar drains after 0.75 s at 25% a second',cost:'−15% energy capacity',m:{eCap:.85},f:{jamDelay:.75,jamRate:.25},recipe:{plate:3,wire:3}},
  snapback:{slot:'shield',name:'Snap-back emitter',spec:'jam',gain:'When a Jam bar first appears, shields jump back to 30% (once a minute)',cost:'−8% shield capacity',m:{sCap:.92},f:{snapBack:1},recipe:{plate:3,wire:3}},
  sealed:{slot:'cargo',name:'Sealed hold',spec:'jam',gain:'A hooked hold gives up half its contents, not all',cost:'−15% hold',m:{cargo:.85},f:{sealed:1},recipe:{plate:3,wire:3}},
  shredder:{slot:'weapon',name:'Shredder rounds',spec:'brood',gain:'Kinetic +35% to Brood hulls; a hit stops their regrowth for 10 s',cost:'Kinetic −15% against faction shields',f:{broodK:1.35,regenStop:10,facShK:.85},recipe:{plate:3,wire:3}},
  cautery:{slot:'weapon',name:'Cautery lance',spec:'brood',gain:'Lasers +40% to Bloom Nodes and Seeders',cost:'Lasers −12% against other ships',f:{cautery:1},recipe:{plate:3,wire:3}},
  incendiary:{slot:'payload',name:'Incendiary warheads',spec:'brood',gain:'Missiles +50% to Bloom Nodes and Seeders',cost:'Missiles −15% against other ships',f:{incend:1},recipe:{plate:3,wire:3}},
  sporeseal:{slot:'armor',name:'Spore-sealed plating',spec:'brood',gain:'Latching spores stack to 1, not 3',cost:'−8% hull',m:{hull:.92},f:{sporeCap:1},recipe:{plate:3,wire:3}},
  hazetune:{slot:'shield',name:'Haze-tuned emitter',spec:'brood',gain:'Ignores the Bloom haze recharge penalty',cost:'−6% shields everywhere',m:{sCap:.94},f:{hazeImm:1},recipe:{plate:3,wire:3}},
  scentbaf:{slot:'engine',name:'Scent baffles',spec:'brood',gain:'Blood scent ignores you above 25% hull',cost:'−8% top speed',m:{maxSpd:.92},f:{scentImm:1},recipe:{plate:3,wire:3}},
  ...UNB_VARS,
  shaped:{slot:'drill',name:'Shaped charges',gain:'On-point window 8 m instead of 5 m',cost:'An on-point charge releases at most 80%',f:{blWin:8,blRelCap:.8}},
  longlaunch:{slot:'drill',name:'Long launcher',gain:'Charges reach 450 m instead of 300 m',cost:'Charges fly 25% slower',f:{blRange:450,blSpdK:.75}},
  survey:{slot:'drill',name:'Survey rig',gain:'Scans last 60 s and mark every rock within 2 km',cost:'One charge fewer in the magazine',f:{blScan:60,blScanR:2000,blChg:-1}},
};
const VAR_BY_SLOT={};for(const id in VARIANTS){const V=VARIANTS[id];V.id=id;V.recipe=V.recipe||VAR_RECIPE;(VAR_BY_SLOT[V.slot]=VAR_BY_SLOT[V.slot]||[]).push(id);
  ITEMS['v_'+id]={name:V.name,recipe:V.recipe,col:'#9fe0c8',variant:id}}
const ITEM_ORDER=['fe','cu','ir','xc','au','nu','plate','wire','coil','lattice','core','matrix','seal','beacon','missile','torpedo','swarm','drone','frame','keel','picket'];for(const id in VARIANTS)ITEM_ORDER.push('v_'+id);
// missiles, torpedoes and swarm pods are magazines on a cooldown now: no one buys, sells or fabricates them on the market
const MUNITIONS=new Set(['missile','torpedo','swarm']);
const CRAFTABLE=['plate','wire','coil','lattice','core','beacon','missile','torpedo','swarm','tune','frame','keel'];
const COMP={},DEPTH={};
function comp(id){if(COMP[id])return COMP[id];const v={fe:0,cu:0,ir:0,xc:0,au:0,nu:0};if(RAWS.includes(id))v[id]=1;else{const r=ITEMS[id].recipe;for(const k in r){const c=comp(k);for(const e of RAWS)v[e]+=c[e]*r[k]}}return COMP[id]=v}
function depth(id){if(id in DEPTH)return DEPTH[id];if(RAWS.includes(id))return DEPTH[id]=0;let d=0;for(const k in ITEMS[id].recipe)d=Math.max(d,depth(k));return DEPTH[id]=d+1}
function mass(id){const c=comp(id);return c.fe+c.cu+c.ir+c.xc+c.au+c.nu}
function baseValue(id){const c=comp(id);let v=0;for(const e of RAWS)v+=c[e]*ITEMS[e].base;return Math.round(v*(1+.12*depth(id)))}
function invVec(o,out){out=out||{fe:0,cu:0,ir:0,xc:0,au:0,nu:0};for(const k in o){const c=comp(k);for(const e of RAWS)out[e]+=c[e]*o[k]}return out}
function invMass(o){let m=0;for(const k in o)m+=mass(k)*o[k];return m}
function invValue(o){let v=0;for(const k in o)v+=baseValue(k)*o[k];return v}
const SLOTS=[
  {id:'engine',name:'Drive',base:{plate:2,wire:2}},{id:'power',name:'Reactor',base:{plate:1,wire:2}},
  {id:'shield',name:'Shield Emitter',base:{plate:1,wire:2}},{id:'weapon',name:'Weapons',base:{plate:1,wire:2}},
  {id:'armor',name:'Armor',base:{plate:3}},{id:'drill',name:'Blast Rig',base:{plate:1,wire:1}},{id:'cargo',name:'Cargo Hold',base:{plate:2}},{id:'payload',name:'Payload Bay',base:{}},
];
const SLOT={};SLOTS.forEach(s=>SLOT[s.id]=s);
const UPG={2:{plate:2,wire:2},3:{plate:2,coil:2},4:{coil:2,lattice:2},5:{lattice:1,core:2}};
function upgRecipe(slot,t){const r={...UPG[t]};if(t===3)r.matrix=1;if((slot==='armor'||slot==='cargo')&&r.wire){r.plate+=r.wire;delete r.wire}if((slot==='weapon'||slot==='power')&&t===3){r.coil=3;r.plate=1}return r}
function compInv(slot,t){const o={...SLOT[slot].base};for(let k=2;k<=t;k++){const r=upgRecipe(slot,k);for(const i in r)o[i]=(o[i]||0)+r[i]}return o}
function fortRecipe(L){const r={plate:3*L,wire:2*L};if(L>=3)r.coil=2*(L-2);if(L>=5)r.lattice=2;return r}

// ============================================================ factions & ships
const FAC_IDS=['halcyon','varkesh','ostrova'];
const FACTIONS={
  halcyon:{name:'Halcyon Accord',short:'Halcyon',col:'#4fd8d0',fill:'#0b2527',trait:{shield:1.12,hull:.88},traitText:'Shields +12% · Hull −12%',blurb:'Chartered merchant houses. Their emitters run hot and their frames run light.',hulls:{gunboat:'Harrier',interceptor:'Swift',striker:'Kite',heavy:'Osprey',bomber:'Condor',prospector:'Plover',freighter:'Albatross',drone:'Aegis Drone',skiff:'Wren',frigate:'Sovereign',picket:'Sparrow',dredger:'Heron',courier:'Tern',bulker:'Pelican',constructor:'Architect',scout:'Lark',scout2:'Skylark',wraith:'Wraith'},station:'Lumen Exchange',depot:'Tessellate Depot',shot:'pulse'},
  varkesh:{name:'Varkesh Dominion',short:'Varkesh',col:'#ff7a3d',fill:'#2a130a',trait:{hull:1.12,energy:.88},traitText:'Hull +12% · Reactor −12%',blurb:'A garrison state. Thick plating, hungry guns, short tempers.',hulls:{gunboat:'Warhound',interceptor:'Fang',striker:'Talon',heavy:'Halberd',bomber:'Maul',prospector:'Gouge',freighter:'Bulwark',drone:'Ward Drone',skiff:'Pick',frigate:'Bastille',picket:'Spur',dredger:'Sledge',courier:'Runner',bulker:'Rampart',constructor:'Foundry',scout:'Jackal',scout2:'Wolfhound',wraith:'Wraith'},station:'Ardent Bastion',depot:'Marches Depot',shot:'slug'},
  ostrova:{name:'Ostrova Collective',short:'Ostrova',col:'#b893ff',fill:'#1b1430',trait:{energy:1.12,shield:.88},traitText:'Reactor +12% · Shields −12%',blurb:'Archivists and drive-mystics. Deep reactors, patient pilots.',hulls:{gunboat:'Sentinel',interceptor:'Mote',striker:'Wisp',heavy:'Vigil',bomber:'Obelisk',prospector:'Lumen',freighter:'Cairn',drone:'Halo Drone',skiff:'Glim',frigate:'Cathedral',picket:'Glint',dredger:'Delve',courier:'Drift',bulker:'Monolith',constructor:'Loom',scout:'Seer',scout2:'Oracle',wraith:'Wraith'},station:'Spire Archive',depot:'Veil Depot',shot:'lance'},
};
FACTIONS.brood={name:'The Vael Brood',short:'Brood',col:'#9be35a',fill:'#14200c',trait:{hull:1.5,shield:.6,energy:1.1},traitText:'Hull +50% and regrows · Shields −40%',blurb:'Something grown, not built. It eats ore, and it eats stations.',
  hulls:{mite:'Mite',interceptor:'Skitter',striker:'Thresher',heavy:'Carapace',bomber:'Sporemaw',prospector:'Grazer',freighter:'Gorger',drone:'Mite',skiff:'Nibbler',frigate:'Leviathan',escort:'Prowler',picket:'Spawnling',dredger:'Devourer',courier:'Crawler',bulker:'Bloater',constructor:'Seeder',scout:'Watcher',scout2:'Stalker'},station:'Bloom Heart',depot:'Bloom Node',shot:'spore',bio:true};
const PIRATE={name:'The Unbound',short:'Unbound',col:'#d8cd98',fill:'#221f15',shot:'scrap',hulls:{raider:'Raider',corsair:'Corsair',plunderer:'Plunderer',uskiff:'Skiff',gunboat:'Raker',interceptor:'Dart',striker:'Cutter',heavy:'Brute',bomber:'Wrecker',prospector:'Gouger',freighter:'Scow',drone:'Junk Drone',skiff:'Scrounger',frigate:'Destroyer',picket:'Gnat',dredger:'Grinder',courier:'Smuggler',bulker:'Hulk',constructor:'Rigger',scout:'Sneak',scout2:'Ghost'}};
const PLAYER_COL='#f0b24a';
const CLASSES={
  mite:{name:'Mite',hull:12,shield:0,speed:1.45,turn:4,weapon:.5,cargo:0,drill:0,radius:7,rack:0,boost:1.2,agile:1.6,acc:1.55,bcost:.6,desc:'Brood swarm fighter: grown from ore, fast, fragile, no shields.'},
  interceptor:{name:'Light Fighter',hull:86,shield:.85,speed:1.32,turn:3.45,weapon:1.05,cargo:14,drill:0,radius:12,rack:.75,boost:1.25,agile:1.45,acc:1.38,bcost:.7,desc:'Fastest and most agile: quickest acceleration, cheap afterburner, best at shaking missiles. Light armour.'},
  gunboat:{name:'Heavy Bomber',turK:2,turOwnE:1,swarm:2,torp:true,hull:210,shield:1,speed:.9,turn:1.75,weapon:1.3,cargo:30,drill:0,radius:20,rack:1,boost:.95,agile:.82,acc:.85,bcost:1.05,seats:2,desc:'Two seats. The pilot flies on twin forward cannons and a siege torpedo bay that cracks stations, outposts and their works; a gunner works the rear dorsal turret with its own cannons. An AI gunner mans the turret when no pilot is in it. Swarm launcher (2 pods). Tougher and slower than a fighter, quicker than a Bomber.'},
  striker:{name:'Medium Fighter',hull:120,shield:1.08,speed:1.17,turn:2.95,weapon:1.25,cargo:24,drill:0,radius:15,rack:1,boost:1.12,agile:1.18,acc:1.2,bcost:.85,desc:'All-rounder: quick off the mark and nimble enough to out-turn heavies and bombers.'},
  heavy:{name:'Heavy Fighter',mkK:.8,swarm:2,acc:.9,hull:130,shield:.95,speed:.92,turn:1.95,weapon:1.32,cargo:30,drill:0,radius:19,rack:1,boost:.92,agile:.8,desc:'Tough gun platform with a swarm launcher. Slower to turn than the lighter fighters.'},
  bomber:{name:'Bomber',swarm:2,acc:.78,hull:205,shield:1.2,speed:.8,turn:1.5,weapon:1.25,cargo:34,drill:0,radius:22,torp:true,boost:.85,agile:.7,seats:2,turK:1.6,turOwnE:1,desc:'Torpedoes that crack stations and outposts, swarm launcher, and a rear dorsal turret (an AI gunner mans it, or a wingmate can climb in). Slow.'},
  skiff:{name:'Light Miner',hull:90,shield:.85,speed:1.1,turn:2.5,weapon:.48,cargo:30,drill:1.1,radius:14,rack:0,boost:1.05,agile:1.05,acc:1.1,drones:2,lasers:1,desc:'1 charge launcher, 2 guard drones, small hold. Nimble enough to run.'},
  prospector:{lasers:2,drones:3,name:'Medium Miner',hull:125,shield:1,speed:1,turn:2.2,weapon:.57,cargo:50,drill:1.5,radius:17,rack:0,boost:1,agile:.9,desc:'2 charge launchers, 3 guard drones, mid hold.'},
  wraith:{name:'Wraith',hull:82,shield:.89,speed:1.3,turn:3.25,weapon:1.6,cargo:0,drill:0,radius:12,rack:0,swarm:2,boost:1.2,agile:1.4,acc:1.35,bcost:.75,radar:true,desc:'Legendary Ace hull. Quad cannons and lasers, two swarm pod batteries, no hold and no blast rig. K switches stealth: hidden beyond 600 m, but no shields, guns, missile locks or afterburner while hidden.'},
  escort:{name:'Escort',hull:1300,shield:7,speed:.62,turn:.62,weapon:.9,cargo:0,drill:0,radius:70,rack:0,boost:1,agile:.55,acc:.55,desc:'Light capital ship.'},
  carrier:{name:'Carrier',hull:2500,shield:14,speed:.36,turn:.26,weapon:0,cargo:0,drill:0,radius:120,rack:0,boost:1,agile:.25,acc:.3,desc:'Fleet carrier.'},
  frigate:{name:'Frigate',hull:3000,shield:14,speed:.42,turn:.32,weapon:1,cargo:0,drill:0,radius:110,rack:0,boost:1,agile:.3,acc:.35,desc:'Capital ship.'},
  picket:{name:'Picket',hull:32,shield:.55,speed:1.35,turn:3.6,weapon:.6,cargo:0,drill:0,radius:11,rack:.5,boost:1.2,agile:1.4,acc:1.4,desc:'Small escort fighter, 2 missiles.'},
  drone:{name:'Guard Drone',acc:1.4,hull:12,shield:.2,speed:1.3,turn:3.6,weapon:.12,cargo:0,drill:0,radius:9,rack:0,boost:1.1,agile:1.3,desc:'Escort drone.'},
  scout:{name:'Scout',acc:1.35,bcost:.8,hull:60,shield:.75,speed:1.78,turn:1.35,weapon:.5,cargo:10,drill:0,radius:11,rack:1,twin:true,boost:1.3,agile:.5,radar:true,desc:'The fastest hull in the galaxy, and one of the hardest to turn. Two missile launchers fire a pair on every shot. Long-range radar sees the whole sector and reports the next ones. Flips sector beacons (hold within 250 m). Plants one limpet on an enemy capital ship or station (hold F within 600 m for 2 s; rearms when docked).'},
  scout2:{name:'Advanced Scout',acc:1.3,bcost:.85,hull:78,shield:.9,speed:1.72,turn:1.25,weapon:.6,cargo:10,drill:0,radius:12,rack:.75,swarm:2,boost:1.3,agile:.46,radar:true,desc:'Nearly as fast as the Scout and even slower to turn. One missile launcher plus a swarm launcher (2 pods, fire with 3). Long-range radar. Flips sector beacons (hold within 250 m). Plants one limpet on an enemy capital ship or station (hold F within 600 m for 2 s; rearms when docked).'},
  constructor:{name:'Constructor',acc:.75,hull:240,shield:1.25,speed:.72,turn:1.25,weapon:.55,cargo:160,drill:0,radius:26,rack:.5,boost:.85,agile:.65,desc:'Carries Depot Frames for faction depots; call one in from comms (I, then 3 on the Command page).'},
  courier:{name:'Light Hauler',hull:120,shield:.95,speed:1.05,turn:2.1,weapon:.42,cargo:60,drill:0,radius:16,rack:0,boost:1.05,agile:.95,acc:1,drones:2,desc:'60 t hold, 2 guard drones, quick for a hauler.'},
  freighter:{drones:3,name:'Medium Hauler',acc:.8,hull:170,shield:1.1,speed:.95,turn:1.7,weapon:.45,cargo:100,drill:0,radius:21,rack:0,boost:.9,agile:.75,desc:'100 t hold, 3 guard drones, 5.5% market fee. The workhorse: nearly as quick as a Light Hauler.'},
  dredger:{name:'Heavy Miner',hull:190,shield:1.15,speed:.82,turn:1.6,weapon:.54,cargo:80,drill:2.2,radius:23,rack:0,boost:.9,agile:.75,acc:.82,drones:4,lasers:3,desc:'3 charge launchers, 4 guard drones, the deepest miner hold. Slow and armoured.'},
  bulker:{name:'Heavy Hauler',hull:260,shield:1.25,speed:.72,turn:1.2,weapon:.42,cargo:230,drill:0,radius:28,rack:0,boost:.85,agile:.6,acc:.7,drones:4,desc:'230 t hold, 4 guard drones, 4% market fee. A fortress that crawls.'},
};

// the Unbound fly three hulls of their own, built off the fighter frames (their models too). Big holds, no swarm pods.
{const B=(k,o)=>Object.assign({},CLASSES[k],{swarm:0,radar:false},o);
  CLASSES.raider=B('interceptor',{name:'Raider',hull:85,shield:.85,speed:1.25,turn:2.95,cargo:40,acc:(CLASSES.interceptor.acc||1)*.85,agile:(CLASSES.interceptor.agile||1)*.85,radar:true,jamK:1,desc:'Unbound light hull: the crew\'s eyes. Scout radar, 40 t hold.'});
  CLASSES.corsair=B('striker',{name:'Corsair',hull:120,shield:1,speed:1.1,turn:2.5,cargo:70,acc:(CLASSES.striker.acc||1)*.85,agile:(CLASSES.striker.agile||1)*.85,jamK:1.3,desc:'Unbound medium hull: the muscle, with the best jammers. 70 t hold.'});
  CLASSES.plunderer=B('heavy',{name:'Plunderer',hull:180,shield:1.25,speed:.86,turn:1.55,cargo:110,acc:(CLASSES.heavy.acc||1)*.8,agile:(CLASSES.heavy.agile||1)*.8,jamK:1,desc:'Unbound heavy hull: the cargo hold. 110 t.'});
  CLASSES.uskiff=B('scout',{name:'Skiff',hull:70,shield:.8,speed:1.62,cargo:35,radar:true,jamK:1.1,desc:'Unbound scout: fast, 35 t hold, jammers, scout radar. Flips beacons outside faction home space.'})}
const UNB_CLS={interceptor:'raider',striker:'corsair',heavy:'plunderer',bomber:'corsair',gunboat:'plunderer'};
const CLS_IDS=['interceptor','striker','heavy','bomber','skiff','prospector','dredger','courier','freighter','bulker','scout','scout2'],YARD_IDS=[...CLS_IDS,'gunboat'];   // constructors are AI-only: call one in through comms
const FIGHTERS=['interceptor','striker','heavy','bomber'];
function hullName(side,cls){if(side==='player')side=S.player.faction;return side==='pirate'?PIRATE.hulls[cls]:FACTIONS[side]?FACTIONS[side].hulls[cls]:cls}
const SHAPES={
  halcyon:{striker:[[1.25,0],[.25,.3],[-.55,.85],[-.35,.22],[-.75,0],[-.35,-.22],[-.55,-.85],[.25,-.3]],
    prospector:[[1.05,0],[.55,.42],[-.2,.52],[-.7,.95],[-.78,.3],[-.95,0],[-.78,-.3],[-.7,-.95],[-.2,-.52],[.55,-.42]],
    freighter:[[1.1,0],[.8,.38],[-.9,.5],[-1.05,.25],[-1.05,-.25],[-.9,-.5],[.8,-.38]]},
  varkesh:{striker:[[1.35,0],[-.1,.5],[-.75,.78],[-.55,.2],[-.85,0],[-.55,-.2],[-.75,-.78],[-.1,-.5]],
    prospector:[[1.1,.16],[1.1,-.16],[.2,-.62],[-.9,-.62],[-.7,0],[-.9,.62],[.2,.62]],
    freighter:[[1.0,.36],[1.05,0],[1.0,-.36],[-1.0,-.62],[-.85,0],[-1.0,.62]]},
  ostrova:{striker:[[1.15,0],[.45,.45],[-.35,.55],[-.85,.3],[-.85,-.3],[-.35,-.55],[.45,-.45]],
    prospector:[[.95,0],[.5,.75],[-.5,.75],[-.95,0],[-.5,-.75],[.5,-.75]],
    freighter:[[1.05,0],[.55,.55],[-.95,.55],[-1.05,0],[-.95,-.55],[.55,-.55]]},
  pirate:{striker:[[1.2,.1],[.3,.35],[-.2,.9],[-.5,.3],[-.9,.15],[-.7,-.25],[-.3,-.7],[.2,-.3]],
    prospector:[[1.0,.2],[.4,.6],[-.6,.7],[-.9,.1],[-.6,-.6],[.3,-.5]],
    freighter:[[1.0,.3],[.9,-.3],[-.8,-.6],[-1.0,.1],[-.7,.6]]},
};
// Aurorite tuning: once per component, +6% to engines, holds and blast rigs, but only TUNE_CMB to shields, guns, armour and power
const TUNE_CMB=0.04;
const TUNE_MAX=1,TUNE_STEP=.06,tuneItems=l=>l*(l+1)/2;
function shipStats(fac,cls,T,U){const B=shipStatsBase(fac,cls,T);if(!U)return B;const u=s=>typeof U==='number'?U:(U[s]||0),m=s=>1+TUNE_STEP*u(s);
  B.thrust*=m('engine');B.maxSpd*=m('engine');B.turn*=1+TUNE_STEP*.5*u('engine');const mc=s=>1+TUNE_CMB*u(s);B.eCap*=mc('power');B.eRegen*=mc('power');B.sCap*=mc('shield');B.dmg*=mc('weapon');B.hull*=mc('armor');B.drill*=m('drill');B.cargo=Math.round(B.cargo*m('cargo'));return applyVariants(applyLegend(applyRefits(B,U),cls,U),U)}
function vrOf(U){return(U&&typeof U==='object'&&U.vr)||{}}
function applyVariants(B,U){const vr=vrOf(U);for(const sl in vr){const V=VARIANTS[vr[sl]];if(!V||V.slot!==sl)continue;
  for(const k in V.m||{})B[k]=(B[k]||(k==='ladenK'?1:0))*V.m[k];for(const k in V.a||{})B[k]=(B[k]||0)+V.a[k];for(const k in V.f||{})B[k]=V.f[k]}
  if(B.cargo)B.cargo=Math.round(B.cargo);return B}
// a pilot's fitted-variant factor for things computed from the pilot record rather than ship stats (rack size, reloads, lock time)
function vF(P,key){const vr=vrOf(P&&P.tune);for(const sl in vr){const V=VARIANTS[vr[sl]];if(V&&V.f&&V.f[key]!=null)return V.f[key]}return null}
function vK(P,key){let k=1;const vr=vrOf(P&&P.tune);for(const sl in vr){const V=VARIANTS[vr[sl]];if(V&&V.f&&V.f[key]!=null)k*=V.f[key]}return k}
function pRack(P){return Math.round(rackCapC(P.cls,P.tiers.weapon)*vK(P,'rackK'))}
function vrInv(R){const o={};const vr=vrOf(R&&R.tune);for(const sl in vr)if(VARIANTS[vr[sl]])inv.add(o,'v_'+vr[sl],1);return o}
// shields tuned against one weapon type take less from it and more from the other

// Brood blood scent: its wings turn toward the most damaged ship (Scent baffles hide a ship above a quarter hull)
function bloodScent(o){if(!o.st||!o.st.hull)return 1;const f=clamp(o.hull/o.st.hull,0,1);if(o.st.scentImm&&f>.25)return 1;return .35+.65*f}
// anti-Brood rounds: kinetic slugs that bite Brood hulls harder and stop their regrowth, at a cost against faction shields
function atkSt(at){return at&&at.src&&at.src.st||null}
function vsShK(e,at,kind){const A=atkSt(at);return A&&A.broodK&&kind==='kinetic'&&e.side!=='brood'?A.facShK:1}
function vsHullK(e,at,kind){const A=atkSt(at);if(A&&A.broodK&&kind==='kinetic'&&e.side==='brood'){e.noRegen=W.t+A.regenStop;return A.broodK}return 1}

// ---- Brood ecology (stage 3). What the swarms graze is split: half to the Brood's stores, a quarter into the gut of the
// nearest Bloom Node (spilled as rich rock when the node burns), a quarter piled as a feeding ground in the nearest
// Brood-held system (dense rock any pilot can mine under the truce). Zoned ores (Aurorite, Vantium) never leave for a
// feeding ground. Nothing is created: every unit comes out of a real field.
const GUT={share:.25,fg:.25,cap:240,fgCap:600,fgRock:160,feastRock:130};
function brNodes(){return Object.values(S.stations).filter(R=>R.owner==='brood'&&R.kind==='depot')}
function srnd(x){return Math.floor(x+Math.random())}
function fgMass(s){let m=0;for(const a of s.ast)if(a.fg)m+=oreTotal(a);return m}
function fgAnchor(s){if(!s.fg){const p=s.belts&&s.belts.length?newAstPos(s):{x:ri(-1400,1400),y:ri(-200,200),z:ri(-1400,1400)};s.fg={x:p.x,y:p.y,z:p.z}}return s.fg}
function fgSector(from){let b=null,bh=99;for(const d of SECTOR_DEFS){const id=d.id;if(!broodHeld(id)||WORLDS[id]||!S.sectors[id])continue;if(fgMass(S.sectors[id])>=GUT.fgCap)continue;const h=HOP[from][id]??99;if(h<bh){bh=h;b=id}}return b}
function fgAdd(s,k,m){if(m<=0)return;const A=fgAnchor(s);let a=s.ast.find(x=>x.fg&&x.ore[k]&&oreTotal(x)<GUT.fgRock)||s.ast.find(x=>x.fg&&oreTotal(x)<GUT.fgRock*.5);
  if(a){inv.add(a.ore,k,m);return}s.ast.push({id:S.nextId++,x:Math.round(A.x+rnd(-320,320)),y:Math.round(A.y+rnd(-90,90)),z:Math.round(A.z+rnd(-320,320)),ore:{[k]:m},seed:ri(1,1e9),fg:1})}
function brGut(st,from,got){let R=null,bh=99;for(const x of brNodes()){const h=HOP[from][x.sid]??99;if(h<bh){bh=h;R=x}}
  const fs=fgSector(from),fsec=fs?S.sectors[fs]:null;
  for(const k in got){let n=got[k];if(n<=0)continue;
    if(R&&invMass(R.gut||{})<GUT.cap){const g=Math.min(n,srnd(n*GUT.share));if(g>0){R.gut=R.gut||{};inv.add(R.gut,k,g);n-=g}}
    if(fsec&&k!=='au'&&k!=='nu'){const f=Math.min(n,srnd(got[k]*GUT.fg));if(f>0){fgAdd(fsec,k,f);n-=f}}
    if(n>0)inv.add(st,k,n)}}
// the feast after the fire: a burned node's gut spills as a few big, rich rocks where it stood
function brFeast(s,R){const g=R.gut||{},t=invMass(g);R.gut={};if(t<=0)return 0;const n=clamp(Math.ceil(t/GUT.feastRock),1,5),rocks=[];
  for(let i=0;i<n;i++){const o=rdir(.5),k=ri(160,420);rocks.push({id:S.nextId++,x:Math.round((R.x||0)+o.x*k),y:Math.round((R.y||0)+o.y*k*.4),z:Math.round((R.z||0)+o.z*k),ore:{},seed:ri(1,1e9),feast:1})}
  let i=0;for(const k in g){let left=g[k];while(left>0){const m=Math.min(left,Math.max(1,Math.ceil(g[k]/n)));inv.add(rocks[i%n].ore,k,m);left-=m;i++}}
  for(const a of rocks)if(oreTotal(a)>0)s.ast.push(a);return t}
// ---- scouts: hold a lock on a Seeder for 3 s inside 5 km, before it plants, for a 250 cr containment order (one per Seeder)
const SPOT={t:3,r:5000,pay:250};
function spotTarget(){const T=W.tgt;if(!T||T.kind!=='ship')return null;const e=T.ref;return e&&e.alive&&e.side==='brood'&&e.role==='builder'?e:null}
function spotTick(dt){const F=W.spotF||(W.spotF={id:null,t:0});const e=spotTarget(),p=W.player;
  if(!e||!p||!isScoutCls(S.player.cls)||S.player.docked||!FAC_IDS.includes(S.player.faction)||e.spotted||d3(e,p)>SPOT.r){F.t=0;return}
  if(F.id!==e.id){F.id=e.id;F.t=0}F.t+=dt;if(F.t<SPOT.t)return;F.t=0;SFX.spot();if(NET.cl){netSend({t:'spot',id:e.id});e.spotted=1}else spotPay(e,pkey())}
function spotPay(e,k){if(!e||!e.alive||e.side!=='brood'||e.role!=='builder'||e.spotted)return;{const ev0=S.events.find(v=>v.type==='build'&&v.att==='brood'&&v.sector===W.sid&&v.stage!=='done');if(ev0&&ev0.spotted){e.spotted=1;return}}const P=isMe(k)?S.player:S.pilots&&S.pilots[k];if(!P||!FAC_IDS.includes(P.faction)||!isScoutCls(P.cls))return;
  e.spotted=1;const c=payKey(k,P.faction,SPOT.pay);keyFeed(k,`📡 Containment order: Seeder spotted before it planted. Every faction can see it now.${c?` +${fmt(c)} cr.`:''}`,'good');
  const ev=S.events.find(v=>v.type==='build'&&v.att==='brood'&&v.sector===W.sid&&v.stage!=='done');if(ev)ev.spotted=1}
function spotChip(){const e=spotTarget();if(!e||!isScoutCls(S.player.cls)||S.player.docked)return null;if(e.spotted)return['📡 Seeder spotted: containment paid','good'];const d=d3(e,W.player),F=W.spotF||{};
  if(d>SPOT.r)return[`📡 Close to ${SPOT.r/1000} km to spot the Seeder (${fmt(Math.round(d))} m)`,'warn'];return[`📡 Spotting Seeder ${Math.round(clamp((F.id===e.id?F.t:0)/SPOT.t,0,1)*100)}% · keep it targeted`,'warn']}
// ---- scouts find feeding grounds: flying a scout through Brood space marks its feeding ground on every pilot's map
function fgScout(){if(!W||W!==LW||!W.haze||!W.player||S.player.docked||!isScoutCls(S.player.cls))return;S.fgSeen=S.fgSeen||{};if(S.fgSeen[W.sid])return;S.fgSeen[W.sid]=1;if(NET.cl)netSend({t:'fg',sid:W.sid});   // a guest's find goes to the host, which shares it with every pilot
  const t=fgMass(S.sectors[W.sid]);if(t>0)feed(`📡 Scout report: a Brood feeding ground in ${DEF[W.sid].name}, about ${fmt(t)} t of piled ore. It's marked on the galaxy map.`,'good')}
// ---- containment supply: faction stations on the Bloom's border post orders for torpedoes, missiles and plate, paid at a
// front-line bonus (about 2.5x value) and delivered in person, like a blockade run
const CONT_PAY=[2.2,2.8],CONT_T=900;
function contFront(f,sid){const R=S.stations[sid];return!!R&&R.owner===f&&R.kind!=='hive'&&NEIGH[sid].some(n=>broodHeld(n))}
function contContracts(){for(const f of FAC_IDS){if(!S.econ.stock[f])continue;S.contracts=S.contracts.filter(c=>!(c.cont&&c.fac===f&&!contFront(f,c.st)));
    const L=S.contracts.filter(c=>c.cont&&c.fac===f);if(L.length>=1||Math.random()<.5)continue;
    const cand=Object.keys(S.stations).filter(sid=>contFront(f,sid)&&!S.contracts.some(c=>c.blk&&c.st===sid));if(!cand.length)continue;const sid=pick(cand),R=S.stations[sid];
    const item=wpickArr([['torpedo',1],['missile',2],['plate',3]].filter(([k])=>ITEMS[k])),js=jobSize(item,item==='torpedo'?ri(2,4):item==='missile'?ri(4,8):ri(10,20)),n=js.n,reward=Math.ceil(baseValue(item)*n*rnd(CONT_PAY[0],CONT_PAY[1])/10)*10;
    S.contracts.push({id:S.nextId++,fac:f,st:sid,blk:1,cont:1,why:'on the Bloom front: containment supply',foe:'brood',item,n,n0:n,reward,until:S.T+CONT_T*js.t});
    facFeed(f,`☣ Containment supply: ${R.name} in ${DEF[sid].name} holds the line against the Bloom and needs ${n} ${ITEMS[item].name}. ${fmt(reward)} cr for delivery in person (Jobs).`,'info')}}
// ---- the galaxy map: truce hatching, Seeder countdowns, rooting nodes, feeding grounds
function brMapMarks(c,d,x,y,r,t){const bc=FACTIONS.brood.col;if(S.unb){const mk=unbMarks().filter(o=>o.t.sector===d.id);if(mk.length){c.font='700 9px "Saira Semi Condensed",sans-serif';c.textAlign='center';c.fillStyle='#d8cd98';c.fillText(`☠ ${mk.length} MARK${mk.length>1?'S':''}`,x,y+r+14)}}
  if(truceAt(d.id)){c.save();c.beginPath();c.arc(x,y,r-1,0,TAU);c.clip();c.strokeStyle=hexA(bc,.4);c.lineWidth=1.2;for(let k=-r*2;k<r*2;k+=6){c.beginPath();c.moveTo(x+k-r,y+r);c.lineTo(x+k+r,y-r);c.stroke()}c.restore()}
  const lines=[],ev=S.events.find(e=>e.type==='build'&&e.att==='brood'&&e.sector===d.id&&e.stage!=='done');
  if(ev){const pu=.5+.5*Math.sin(t*4);c.strokeStyle=hexA(bc,.5+.4*pu);c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.arc(x,y,r+9,0,TAU);c.stroke();c.setLineDash([]);
    lines.push(ev.stage==='inbound'?`SEEDER ${fmtT(Math.max(0,ev.eta-S.T))}`:'SEEDER PLANTING')}
  const Rs=S.stations[d.id];if(Rs&&Rs.owner==='brood'&&Rs.kind==='depot'&&Rs.built!=null&&S.T-Rs.built<CONTAIN.youngT)lines.push(`ROOTING ${fmtT(CONTAIN.youngT-(S.T-Rs.built))}`);
  const sc=S.sectors[d.id];if(sc&&(covered(d.id)||(S.fgSeen&&S.fgSeen[d.id]))){const m=fgMass(sc);if(m>=20)lines.push(`◆ FEED ${fmt(m)} t`)}
  if(!lines.length)return;c.font='700 9px "Saira Semi Condensed",sans-serif';c.textAlign='center';let yy=y-r-(ev?14:8)-(lines.length-1)*10;
  for(const L of lines){c.fillStyle='#070b16';c.fillText(L,x+1,yy+1);c.fillStyle=L[0]==='◆'?'#7ad9a7':bc;c.fillText(L,x,yy);yy+=10}}

// ---- faction doctrines: the variants each faction's AI wings favour. Halcyon (strong shields) fits Bastion or Flicker;
// Varkesh (heavy hulls) Ablative or Reactive plating, or Heavy cannons; Ostrova (deep reactors) a Surge or Steady core, or
// Rapid fire. Combat wings only; the chance grows with the faction's tier. Stats only: nothing is built, nothing drops.
const WING_DOC={halcyon:{shield:['bastion','flicker']},varkesh:{armor:['ablative','reactive'],weapon:['heavyc']},ostrova:{power:['surge','steady'],weapon:['rapid']}},DOC_P=[0,.3,.5,.7];
function docFit(e,tuned){const D=WING_DOC[e.side];if(!D||!['patrol','raider','escort','strike','screen'].includes(e.role)||Math.random()>=(DOC_P[e.tier]||.3))return;
  const sl=pick(Object.keys(D)),id=pick(D[sl]);if(!VARIANTS[id])return;e.vr={[sl]:id};const U={vr:e.vr};if(tuned)for(const x of SLOTS)U[x.id]=1;
  const h=e.hull/e.st.hull,sh=e.st.sCap?e.shield/e.st.sCap:1;e.st=shipStats(e.side,e.cls,e.tier,U);e.hull=e.st.hull*h;e.shield=e.st.sCap*sh}
// ---- specialist stocking: a faction holding the line against the Bloom stocks anti-Brood parts; one whose convoys the
// Unbound have hit in the last half hour (or any faction after the first half hour) stocks anti-jam parts. Built from its
// own plate and wire, so nothing is created; they sell on its market like any other part.
const STOCK_SPEC={cap:2};
function specStock(f,st,need){if(need||(st.plate||0)<60||(st.wire||0)<40)return;
  const front=Object.keys(S.stations).some(sid=>contFront(f,sid)),raided=S.T>1800||((S.raidT||{})[f]||-1e9)>S.T-1800;
  for(const id in VARIANTS){const V=VARIANTS[id];if(!V.spec)continue;if(V.spec==='brood'?front:V.spec==='jam'?raided:false)craftAbstract(st,'v_'+id,1,STOCK_SPEC.cap)}}
// ---- AI Unbound, and Brood Grazers in or next to Bloom space, turn toward fresh ore clouds (within 5 km) and scoop them.
// What they take goes into their hold, and home with them if they leave, or into the wreck if they're shot down.
const CLOUD_AI={r:5000,rate:4};
function cloudSeek(e,dt){const s=S.sectors[W.sid],ai=e.ai;if(!s.clouds||!s.clouds.length){ai.cl=null;return false}
  if(e.side==='brood'&&!broodHeld(W.sid)&&!NEIGH[W.sid].some(n=>broodHeld(n)))return false;
  const room=(e.st.cargo||0)-invMass(e.cargo);if(room<1){if(ai.cl){ai.cl=null;e.role='leave'}return false}
  let c=ai.cl&&s.clouds.find(x=>x.id===ai.cl);if(!c||oreTotal(c)<=0){c=null;let bd=CLOUD_AI.r;for(const x of s.clouds){if(oreTotal(x)<=0||x.until-S.T<10)continue;const d=d3(x,e);if(d<bd){bd=d;c=x}}
    if(!c){ai.cl=null;return false}ai.cl=c.id;if(e.side==='pirate'&&W.player&&!S.player.docked&&d3(W.player,c)<1500&&!(c.warned)){c.warned=1;feed('⚠ Unbound raiders are turning toward your ore chunks. They will scoop them, and you.','warn')}}
  const d=steer(e,c.x,c.y,c.z,dt,true,1);faceTo(e,c,dt);e.thrusting=d>c.r*.6;
  if(d<c.r){e.mining=c;ai.sc=(ai.sc||0)+CLOUD_AI.rate*dt;while(ai.sc>=1){const k=mainOre(c);if(!k||mass(k)>(e.st.cargo||0)-invMass(e.cargo))break;ai.sc-=1;inv.take(c.ore,k,1);inv.add(e.cargo,k,1)}
    if(oreTotal(c)<=0){s.clouds=s.clouds.filter(x=>x!==c);ai.cl=null}}
  return true}

// ============================================================ Unbound mode (stage 2, solo): fly for the pirates
const UNB_HULLS=['raider','uskiff','corsair','plunderer'],UNB_PRICE={raider:0,uskiff:0,corsair:2600,plunderer:5000},UNB_START=['raider','uskiff'];
const UNB_RANKS=[['Nuisance',0],['Cutthroat',200],['Buccaneer',600],['Dread Captain',1500],['Pirate King',3000]];
const HEAT_BANDS=[['Cool',0],['Warm',25],['Hot',50],['Wanted',75]];
const UNB_HEAT={mercy:2,take:4,killCiv:8,killMil:3,blown:10,cool:1/60,coolQuiet:2/60};
const UNB_INF={perTon:.5,killCiv:10,ace:100};
const DEED_NAMES={heist:'Heist',captake:'Capital take',ace:'Ace-breaker',sweep:'Clean sweep',three:'Three for three',con:'The long con'};
let _unbF=null;function FAC(f){if(FACTIONS[f])return FACTIONS[f];if(f!=='pirate')return undefined;return _unbF||(_unbF={name:'The Unbound',short:'Unbound',col:PIRATE.col,fill:PIRATE.fill,hulls:PIRATE.hulls,trait:{},traitText:'Jammers, cargo hooks and false colours',blurb:'Pirates of The Wrack. You never race for the galaxy: you get rich and infamous off the three powers who do.',station:'Scrapheart Haven',shot:'scrap'})}
const UNB_RT={};function unbRT(){const k=curPid()||'me';return UNB_RT[k]||(UNB_RT[k]={})}
function unbCoverP(P,f){return!!(P&&P.xpdr&&!((P.xpdrOut||0)>S.T)&&(P.heat||{})[f]<25)}
function unbCrewGal(){return NET.on&&((NET.host&&S&&S.unb)||(NET.cl&&(MP.roster||[]).some(r=>r[2]==='pirate')))}
function unbFacGal(){return NET.on&&((NET.host&&S&&!S.unb&&!!S.player)||(NET.cl&&(MP.roster||[]).some(r=>FAC_IDS.includes(r[2]))))}
function STRAT_SIM(){return typeof window!=='undefined'&&!!window._fs}
function unbLegendOK(name){const r=legPeek(name);return!!r&&(r.pts||0)>=1}
function unbP(){const P=S.player;P.heat=P.heat||{};for(const f of FAC_IDS)P.heat[f]=P.heat[f]||0;P.inf=P.inf||0;P.deeds=P.deeds||[];P.stolen=P.stolen||{};return P}
function heatBand(h){let b=0;for(let i=0;i<HEAT_BANDS.length;i++)if(h>=HEAT_BANDS[i][1])b=i;return b}
function unbRank(inf){let r=0;for(let i=0;i<UNB_RANKS.length;i++)if((inf||0)>=UNB_RANKS[i][1])r=i;return r}
function unbHomeOf(sid){const d=DEF[sid];return d&&FAC_IDS.includes(d.home)?d.home:null}
function heatAdd(f,n,why){if(!S.unb||!FAC_IDS.includes(f)||!(n>0))return;const P=unbP(),h0=P.heat[f],k=unbHomeOf(W&&W.sid)===f?2:1;P.heat[f]=clamp(h0+n*k,0,100);const b0=heatBand(h0),b1=heatBand(P.heat[f]);
  if(b1>b0)SFX.heatUp();if(b1>b0)feed(`🔥 ${FACTIONS[f].short} heat ${Math.round(P.heat[f])} (${HEAT_BANDS[b1][0]})${why?': '+why:''}. ${['','Its patrols scan you on sight; false colours no longer fool it.','It sends hunter wings after you.','Freeports turn you away and its gates take 10 s to charge.'][b1]}`,'bad')}
function infAdd(n,why){if(!S.unb||!(n>0))return;const P=unbP(),r0=unbRank(P.inf),k=(unbHomeOf(W&&W.sid)?2:1)*(1+.05*havenOf().trophy.length);P.inf=Math.round((P.inf+n*k)*10)/10;const r1=unbRank(P.inf);if(r1>r0){SFX.rankUp()}if(r1>r0)feed(`☠ Infamy ${fmt(Math.round(P.inf))}: you are now a ${UNB_RANKS[r1][0]}.${P.deeds.length?' A Legend point waits at the end of the galaxy.':' Do a Deed to earn a Legend point.'}`,'good')}
function deedAdd(k){if(!S.unb)return;const P=unbP();if(P.deeds.some(d=>d.k===k))return;P.deeds.push({k,t:Math.round(S.T),sid:W?W.sid:P.sector});SFX.deed();feed(`★ Deed: ${DEED_NAMES[k]} (${DEF[W?W.sid:P.sector].name}, ${fmtT(S.T)}).${unbRank(P.inf)>0?' A Legend point waits at the end of the galaxy.':' Reach Cutthroat (200 Infamy) for the Legend point.'}`,'good')}
// ---- the false transponder: K toggles it. While Cool with a faction, its ships and stations see a neutral trader
function unbCover(f){const P=S.player;return!!(P.xpdr&&!((P.xpdrOut||0)>S.T)&&(P.heat||{})[f]<25)}
function unbFreeportOK(){const P=unbP();return FAC_IDS.every(f=>P.heat[f]<75)&&!!P.xpdr&&!((P.xpdrOut||0)>S.T)}
function xpdrToggle(){const P=unbP();if((P.xpdrOut||0)>S.T){flash(`Transponder burned out: ${fmtT(P.xpdrOut-S.T)} until it works again.`,true);return}P.xpdr=!P.xpdr;if(NET.cl)netSend({t:'xpdr',on:P.xpdr?1:0});SFX.xpdr(P.xpdr);
  flash(P.xpdr?`🎭 False colours on. ${FAC_IDS.filter(f=>unbCover(f)).map(f=>FACTIONS[f].short).join(', ')||'No faction'} sees a Freeport trader. Any shot blows your cover.`:'🎭 False colours off: you fly as the Unbound.')}
function coverBlow(f,why){const P=unbP();if(!unbCover(f))return;P.xpdrOut=S.T+(unbWork('forger')>=3?120:300);P.xpdr=false;P.conPass=false;heatAdd(f,UNB_HEAT.blown,why||'cover blown');SFX.coverBlown();feed(`🎭 Cover blown with ${FACTIONS[f].short}: transponder burned out for 5 minutes.`,'bad')}
function unbShot(){if(!S.unb||!S.player.xpdr)return;const p=W.player;for(const f of FAC_IDS)if(unbCover(f)&&W.ents.some(e=>e.side===f&&e.alive&&e.type==='ship'&&d3(e,p)<3500))coverBlow(f,'you opened fire under false colours')}
// patrol scans every 4 s: about 5%, +2% per 10 t of stolen goods, +10% at heat 15-24, three times as often near a core station
function unbScan(dt){const P=unbP(),p=W.player,R=unbRT();if(!P.xpdr||!p||S.player.docked)return;R.scanT=(R.scanT||0)-dt;if(R.scanT>0)return;R.scanT=4;const sm=invMass(P.stolen);
  for(const f of FAC_IDS){if(!unbCover(f))continue;const pats=W.ents.filter(e=>e.npc&&e.alive&&e.side===f&&['patrol','escort','raider','screen'].includes(e.role)&&d3(e,p)<1500);if(!pats.length)continue;
    const SE=W.stationEnt,near=SE&&SE.fac===f&&d3(SE,p)<3000?3:1,ch=(.05+.02*Math.floor(sm/10)+(P.heat[f]>=15?.1:0))*near*(unbWork('forger')>=1?.75:1)*(p.st.scanK||1);
    if(Math.random()<ch){coverBlow(f,'a patrol scan saw through your false colours');for(const e of pats)e.ai.tgt=p}else if(sm>0)P.conPass=true}}
// ---- jam mode (4): guns fire jammers, missiles become shock harpoons (35% of the bar, and a tether that stretches the hook to 400 m)
function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;SFX.jamMode(p.jamMode);if(NET.cl)netSend({t:'jam',on:p.jamMode?1:0});flash(p.jamMode?'Jam mode: guns fire jammers and missiles are shock harpoons. They never kill, and do nothing to a shielded ship.':'Jam mode off: guns and missiles kill again.')}
function harpHit(m){let T=m.tgt&&m.tgt.type==='ship'&&m.tgt.alive&&m.tgt.role!=='frigate'&&d3(m.tgt,m)<m.tgt.st.radius+60?m.tgt:null;if(!T){let bd=90;for(const e of W.ents)if(e.type==='ship'&&e.alive&&e.role!=='frigate'&&e!==m.src&&hostile(m.side,e.side)){const d=d3(e,m)-e.st.radius;if(d<bd){bd=d;T=e}}}if(!T)return;fxSpark(m,'#b7c6ff',8);if(T.shield>T.st.sCap*.05){if(m.src===W.player)flash('Harpoon bounced off the shields. Strip them first.');return}T.shield=0;
  jamHit(T,{side:m.side,dmg:jamCap(T)*.35,x:m.x,y:m.y,z:m.z,src:null});T.teth={by:m.src,until:W.t+30};if(m.src===W.player||T.isPlayer)SFX.tether();if(m.src===W.player)flash('Harpoon in: tethered for 30 s, hook reach 400 m.')}
// ---- the cargo hook: hold E beside a jammed ship (150 m, 400 m tethered); 8 t/s, most valuable cargo first
function hookReach(T){return T.teth&&T.teth.until>W.t&&T.teth.by===W.player?(W.player.st.tetherR||400):JAM.hookR}
function hookTargetOf(T){const p=W.player;if(!S.unb||!p||!T||T.type!=='ship')return null;return T.alive&&jamDark(T)&&d3(T,p)<hookReach(T)+T.st.radius*(T.role==='frigate'?8:1)?T:null}
function hookTarget(){return hookTargetOf(W.tgt&&W.tgt.kind==='ship'?W.tgt.ref:null)}
function hookSrc(T){if(T.role==='frigate'){const st=T.tok&&T.tok.store;return st&&Object.keys(st).some(k=>st[k]>0)?st:T.load||{}}return T.cargo||{}}
function unbHook(dt,hold,Tsel){const p=W.player,P=unbP(),R=unbRT(),T=hookTargetOf(Tsel);const tk=R.take;
  if(tk&&(!tk.T.alive||!jamDark(tk.T))){takeEnd()}
  if(!T||!hold)return;const cg=hookSrc(T);if(R.take&&R.take.T!==T)takeEnd();if(!R.take)R.take={T,moved:0,fac:T.side};const room=p.st.cargo-invMass(P.cargo);if(room<1){if(W.t-(R.hookMsg||0)>2){R.hookMsg=W.t;flash('Hold full. Let them go, or dump something.')}return}
  R.hookAcc=(R.hookAcc||0)+(unbWork('chop')>=3?12:unbWork('chop')>=1?10:JAM.hookRate)*dt;while(R.hookAcc>=1){const ks=Object.keys(cg).filter(k=>cg[k]>0&&mass(k)>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a));const k=ks[0];if(!k){R.hookAcc=0;break}const m=mass(k);
    if(invMass(P.cargo)+m>p.st.cargo){R.hookAcc=0;break}if(R.hookAcc<m)break;R.hookAcc-=m;inv.take(cg,k,1);inv.add(P.cargo,k,1);inv.add(P.stolen,k,1);R.take.moved+=m;SFX.hook()}
  if(W.t-(R.hookMsg||0)>1.5&&R.take.moved){R.hookMsg=W.t;flash(`Hooking ${fmt(R.take.moved)} t · ${Math.max(0,Math.ceil(T.jamOff-W.t))} s left in the window`)}}
// a take ends when the window closes (or the mark dies): heat, Infamy, Deeds
function takeEnd(){const R=unbRT(),tk=R.take;R.take=null;if(!tk||!tk.moved)return;const T=tk.T,P=unbP(),f=FAC_IDS.includes(tk.fac)?tk.fac:null;T.robbed=1;
  infAdd(tk.moved*UNB_INF.perTon);if(f)heatAdd(f,T.alive?UNB_HEAT.mercy:UNB_HEAT.take,T.alive?'a mercy take':'a take');if(T.role==='frigate'){infAdd(300);if(f)heatAdd(f,15,'a capital take');deedAdd('captake')}{const L=lockOf();if(L&&L.f===f)deedAdd('heist')}
  SFX.take();feed(`☠ Take: ${fmt(tk.moved)} t from a ${f?FACTIONS[f].short+' ':''}${CLASSES[T.cls]?CLASSES[T.cls].name:'ship'}${T.alive?'. You let them go.':'.'}`,'good');
  P.sortie=P.sortie||{};P.sortie[T.id]=1;if(Object.keys(P.sortie).length>=3)deedAdd('three');
  const g=T.tradeT&&T.tradeT.id||T.escortG&&T.escortG.id;if(g){S.cvTake=S.cvTake||{};const c=S.cvTake[g]=S.cvTake[g]||{n:0,kill:0};c.n++;const left=W.ents.filter(e=>e.alive&&e!==T&&((e.tradeT&&e.tradeT.id)===g||(e.escortG&&e.escortG.id)===g)&&(e.role==='hauler'||e.role==='trader')&&!e.robbed).length;if(c.n>=2&&!c.kill&&!left)deedAdd('sweep')}}
// kills by the Unbound pilot: heat and Infamy instead of bounties
function unbKill(e){const f=FAC_IDS.includes(e.side)?e.side:null,civ=['hauler','trader','miner'].includes(e.role),A=aceOfEnt(e);
  if(civ){infAdd(UNB_INF.killCiv);if(f)heatAdd(f,UNB_HEAT.killCiv*(e.robbed?5:1),e.robbed?'you killed a ship you had just robbed':'a freighter or miner destroyed')}
  else if(f&&e.role!=='frigate')heatAdd(f,UNB_HEAT.killMil,'');
  if(A){havenOf().trophy.push(aceLabel(A));infAdd(UNB_INF.ace);deedAdd('ace')}
  const g=e.tradeT&&e.tradeT.id||e.escortG&&e.escortG.id;if(g&&civ){S.cvTake=S.cvTake||{};(S.cvTake[g]=S.cvTake[g]||{n:0,kill:0}).kill++}}
// heat cools on its own: about 1 a minute, 2 in quiet systems (no faction ships, nobody's territory). Hot factions send hunters.
function unbTick(dt){if(!S.unb||!W||NET.cl)return;
  lairWorld(dt);for(const e of W.ents)if(e.role==='frigate')capJamDrain(e,dt);
  if(W===LW){riggerTick();if(S.player)unbPilotTick(dt,true,keys.KeyE,W.tgt&&W.tgt.kind==='ship'?W.tgt.ref:null);
    if(NET.host)for(const pid in S.pilots||{}){const R=S.pilots[pid];if(pid===NET.me||!R.docked)continue;runAs(pid,()=>unbPilotTick(dt,false,false,null))}}
  if(NET.host)for(const e of W.ents.slice())if(e.rp&&e.alive&&S.pilots[e.rp]&&e.rp!==NET.me){const h=(MP.hook||{})[e.rp];runAs(e.rp,()=>unbPilotTick(dt,false,!!(h&&h.on),h&&h.on?W.ents.find(x=>x.id===h.id)||null:null))}}
function unbPilotTick(dt,local,hold,Tsel){const P=unbP(),p=W.player;
  const quiet=!W.ents.some(e=>e.npc&&e.alive&&FAC_IDS.includes(e.side))&&!FAC_IDS.some(f=>territory(f).has(W.sid));
  const lk=lockOf(),atLair=P.docked==='lair';for(const f of FAC_IDS)if(P.heat[f]>0&&!(lk&&lk.f===f))P.heat[f]=Math.max(0,P.heat[f]-(quiet||atLair?UNB_HEAT.coolQuiet:UNB_HEAT.cool)*(unbWork('forger')>=2?1.5:1)*dt);jtTick(dt);
  if(P.docked||!p||(local&&W.dead))return;raidTick();captainTick();unbHook(dt,hold,Tsel);unbScan(dt);
  P.huntT=P.huntT||{};for(const f of FAC_IDS){if(P.heat[f]<50||(P.huntT[f]||0)>S.T)continue;const T=territory(f);if(!T.has(W.sid)&&!NEIGH[W.sid].some(n=>T.has(n)))continue;
    P.huntT[f]=S.T+rnd(120,200)-(P.heat[f]>=75?40:0);let n=0;for(let i=0;i<3;i++){const e=spawnNPC('patrol',f);if(!e)break;const o=rdir();e.x=p.x+o.x*2200;e.y=p.y+o.y*400;e.z=p.z+o.z*2200;e.ai.tgt=p;e.hunt=1;e.ai.hunt=p;e.ai.huntUntil=W.t+240;n++}
    if(n){SFX.alarm();feed(`⚠ A ${FACTIONS[f].short} hunter wing (${n}) has your scent.`,'bad')}}}
function unbGateHold(){if(!S.unb)return GATE_HOLD;const o=sideNorm(sectorOwner(W.sid));return FAC_IDS.includes(o)&&unbP().heat[o]>=75?10:GATE_HOLD}
// ---- haven dock tabs
function unbFenceRate(){return[.7,.7,.8,.9][unbWork('den')]}
function fenceRef(k){let t=0,n=0;for(const f of FAC_IDS){const st=S.econ.stock[f];if(st){t+=price(st,k);n++}}return n?t/n:baseValue(k)}
function fencePr(k){return Math.max(1,Math.floor(fenceRef(k)*unbFenceRate()))}
// stolen goods fence at STOLEN_K x market (scaled by the Den). Was 4 when haulers carried missiles and real drones; with them
// weakened a Raider takes a freighter about 3x as often, so the price came down to keep Unbound pay between hauling and mining
const STOLEN_K=1.6;function fencePrS(k){return Math.max(1,Math.floor(fenceRef(k)*STOLEN_K*unbFenceRate()/.7))}
function unbFenceHtml(c,P,srcs){let h=`<p class="note" style="margin:0 0 12px">The Fence's Den buys anything at ${Math.round(unbFenceRate()*100)}% of market value, and stolen goods (☠) at ${Math.round(STOLEN_K*unbFenceRate()/.7*100)}%, no questions asked: goods go into Unbound stores and the credits come out of the Unbound treasury. Stolen goods (☠) sell here; at a Freeport they only sell under false colours. ${unbWork('den')>=2?'The Den launders stolen goods for a tenth of their value.':'Laundering needs the Den at level 2 (Works tab).'}</p>`;
  const items=ITEM_ORDER.filter(k=>countIn(k,[P.cargo])>0&&!MUNITIONS.has(k));if(!items.length)return h+'<p class="note">Your hold is empty. Go and take something.</p>';
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Item</th><th class="r">In hold</th><th class="r">Fence pays</th><th></th></tr></thead><tbody>`;
  for(const k of items){const n=P.cargo[k]||0,st=(P.stolen||{})[k]||0,pr=st?fencePrS(k):fencePr(k);h+=`<tr><td class="iname">${esc(ITEMS[k].name)}${st?` <span class="dchip hi">☠ ${st} stolen</span>`:''}<span class="mass">${mass(k)} t</span></td><td class="r num">${n}</td><td class="r num">${fmt(pr)} cr</td><td><div class="act"><button class="btn sm" data-act="fence" data-arg="${k}:1">Fence 1</button><button class="btn sm" data-act="fence" data-arg="${k}:all">Fence all</button></div></td></tr>`}
  return h+`</tbody></table></div><div class="act" style="margin-top:8px"><button class="btn" data-act="fence" data-arg="*:all">Fence the whole hold</button></div>`+launderHtml(P)}
function unbFence(arg){const P=unbP(),[k0,n0]=String(arg).split(':'),keys=k0==='*'?Object.keys(P.cargo).filter(k=>!MUNITIONS.has(k)):[k0];let got=0,t=0;
  for(const k of keys){const n=n0==='all'?(P.cargo[k]||0):Math.min(+n0||1,P.cargo[k]||0);if(!(n>0))continue;const nS=Math.min(n,P.stolen[k]||0);for(const[m,pr]of[[nS,fencePrS(k)],[n-nS,fencePr(k)]]){if(!(m>0))continue;const can=Math.min(m,Math.floor((S.econ.treasury.pirate||0)/pr));if(can<=0)continue;
    inv.take(P.cargo,k,can);inv.add(S.econ.stock.pirate,k,can);{const F=S.econ.fenced=S.econ.fenced||{};F[k]=(F[k]||0)+can}if(m===nS&&P.stolen[k]){P.stolen[k]=Math.max(0,P.stolen[k]-can);if(!P.stolen[k])delete P.stolen[k]}got+=transfer('pirate','player',pr*can);t+=can*mass(k)}}
  if(got)SFX.fence();dockErr=got?`✓ The Fence took ${fmt(t)} t for ${fmt(got)} cr.`:'The Fence has nothing to pay you with right now.'}
function unbBlackHtml(c,P){let h=`<p class="note" style="margin:0 0 12px">Unbound hulls, paid in credits to the haven. A bought hull goes down with you: you relaunch in a Raider. Trading in a bought hull returns half its price. Mk upgrades cost materials as usual (Upgrades tab).</p><div class="tblw"><table class="t"><thead><tr><th>Hull</th><th class="r">Hull</th><th class="r">Shields</th><th class="r">Hold</th><th class="r">Price</th><th></th></tr></thead><tbody>`;
  for(const k of UNB_HULLS){const st=shipStats('pirate',k,1),on=P.cls===k,pr=Math.round(UNB_PRICE[k]*(unbWork('chop')>=2?.9:1));h+=`<tr><td class="iname" style="white-space:normal;max-width:420px"><b>${esc(PIRATE.hulls[k])}</b><div class="note" style="margin:2px 0 4px;white-space:normal">${esc(CLASSES[k].desc||'')}</div>${tagsHtml(k)}</td><td class="r num">${Math.round(st.hull)}</td><td class="r num">${Math.round(st.sCap)}</td><td class="r num">${st.cargo} t</td><td class="r num">${pr?fmt(pr)+' cr':'free'}</td><td>${on?'<b>Flying</b>':`<button class="btn sm" data-act="unbhull" data-arg="${k}" ${P.credits+(UNB_PRICE[P.cls]||0)*TRADE_IN>=pr?'':'disabled'}>${pr?'Buy':'Switch'}</button>`}</td></tr>`}
  return h+`</tbody></table></div><p class="note" style="margin-top:10px">Harpoons are your missiles fired in jam mode (4). In jam mode a Plunderer's missile key fires jamming torpedoes (${jtCap()} in the magazine, 40 s reload): the only way to take a capital ship dark, and the key to a faction vault during a lockdown.</p>`+unbVarBuyHtml(P)}
function unbHull(k){const P=unbP();if(!UNB_HULLS.includes(k)||P.cls===k)return;const hk=unbWork('chop')>=2?.9:1,back=Math.floor((UNB_PRICE[P.cls]||0)*hk*TRADE_IN),pr=Math.round(UNB_PRICE[k]*hk);if(P.credits+back<pr){dockErr=`You need ${fmt(pr)} cr.`;return}if(back>(S.econ.treasury.pirate||0)){dockErr='The haven can’t cover your trade-in right now.';return}
  {const room=shipStats('pirate',k,P.tiers,P.tune).cargo;if(invMass(P.cargo)>room){dockErr=`Stash some cargo first: the ${PIRATE.hulls[k]} holds ${room} t.`;return}}
  if(back)transfer('pirate','player',back);if(pr)transfer('player','pirate',pr);P.cls=k;P.rack=Math.min(P.rack||0,rackCapC(k,P.tiers.weapon));refreshPlayerStats();const p=W.player;if(p){p.hull=p.st.hull;p.shield=p.st.sCap}dockErr=`✓ You fly a ${PIRATE.hulls[k]} now.`}
function unbMarks(){const out=[],tk=unbWork('tankard'),near=new Set(['wr',...NEIGH.wr]);if(tk>=2)for(const n of NEIGH.wr)for(const m of NEIGH[n])near.add(m);if(unbWork('crow')>=1&&S.player.sector){near.add(S.player.sector);for(const n of NEIGH[S.player.sector])near.add(n)}
  for(const t of S.traders||[]){if(!near.has(t.sector)&&!(t.path||[]).some(x=>near.has(x)))continue;if(!FAC_IDS.includes(t.side))continue;if(tk<1&&t.kind!=='haul')continue;out.push({t,v:invValue(t.load||{})})}
  return out.sort((a,b)=>b.v-a.v)}
function unbMarksHtml(c,P){const L=unbMarks();let h=`<p class="note" style="margin:0 0 12px">Barroom rumours from the Rusty Tankard: faction freight moving through the systems next to The Wrack. Set a course, jam the freighter dark and hook its hold.</p>`;
  if(!L.length)return h+'<p class="note">No marks within a jump right now. Rumours change as convoys move.</p>';
  h+=`<div class="tblw"><table class="t"><thead><tr><th>Mark</th><th>Where</th><th class="r">Cargo value</th><th class="r">Escorts</th><th></th></tr></thead><tbody>`;
  for(const{t,v}of L.slice(0,8)){const nm=`${FACTIONS[t.side].short} ${t.kind==='haul'?'supply convoy':'trader'}`,es=t.esc||t.escorts||0;h+=`<tr><td><b style="color:${sideCol(t.side)}">${esc(nm)}</b></td><td>${esc(DEF[t.sector].name)}${t.to&&t.to!==t.sector?` → ${esc(DEF[t.to].name)}`:''}<br><span class="mass">heat with ${esc(FACTIONS[t.side].short)}: ${Math.round((P.heat||{})[t.side]||0)}</span></td><td class="r num">${unbWork('tankard')>=1?'~'+fmt(Math.round(v/100)*100)+' cr':'?'}</td><td class="r num">${unbWork('crow')>=3?(es||0):'?'}</td><td><div class="act"><button class="btn sm" data-act="vcourse" data-arg="${t.sector}">Set course</button>${unbWork('graving')>=2&&!DEF[t.sector].home?`<button class="btn sm" data-act="callcap" data-arg="sloop:${t.sector}">Call a sloop</button>`:''}${unbWork('graving')>=3&&!DEF[t.sector].home?`<button class="btn sm" data-act="callcap" data-arg="destroyer:${t.sector}">Call the destroyer</button>`:''}</div></td></tr>`}
  return h+`</tbody></table></div>`}
function unbWantedHtml(c,P){if(!P.heat)return'';const r=unbRank(P.inf),nx=UNB_RANKS[r+1];let h=`<div class="kv"><span>Rank</span><b>${UNB_RANKS[r][0]}</b><span>Infamy</span><b>${fmt(Math.round(P.inf))}${nx?` · ${fmt(nx[1]-Math.round(P.inf))} to ${nx[0]}`:''}</b><span>False colours</span><b>${(P.xpdrOut||0)>S.T?'burned out '+fmtT(P.xpdrOut-S.T):P.xpdr?'on':'off'} (K)</b><span>Legend point</span><b>${r>0&&P.deeds.length?'earned if you see the galaxy out':r>0?'needs a Deed':'needs Cutthroat (200 Infamy) and a Deed'}</b></div>`;
  h+=`<div class="h3" style="margin-top:12px">Heat</div><div class="tblw"><table class="t"><thead><tr><th>Faction</th><th class="r">Heat</th><th>Band</th><th>Response</th></tr></thead><tbody>`;
  for(const f of FAC_IDS){const v=Math.round(P.heat[f]),b=heatBand(v);h+=`<tr><td><b style="color:${sideCol(f)}">${esc(FACTIONS[f].short)}</b></td><td class="r num">${v}</td><td>${HEAT_BANDS[b][0]}</td><td>${['Ignores you; false colours work','Scans you on sight','Hunter wings','Freeports refuse you; gates 10 s'][b]}</td></tr>`}
  h+=`</tbody></table></div><p class="note">Heat cools about 1 a minute, 2 in quiet systems. A Freeport fixer sells it down for about 150 cr a point, once a visit.</p><div class="h3" style="margin-top:12px">Deeds</div>`;
  h+=P.deeds.length?P.deeds.map(d=>`<div class="note">★ <b>${DEED_NAMES[d.k]}</b> · ${esc(DEF[d.sid]?DEF[d.sid].name:'')} · ${fmtT(d.t)}</div>`).join(''):'<p class="note">None yet. Three for three (hook three ships in one sortie), Clean sweep (empty a convoy without a kill), Ace-breaker, The long con (pass a scan with stolen goods aboard, then sell at a Freeport). Heists and capital takes come with raids.</p>';
  return h}
function unbFixerHtml(c,P){if(!S.unb||c.owner!=='neutral')return'';let h=`<div class="h3" style="margin-top:14px">The fixer</div><p class="note" style="margin:0 0 8px">For about 150 cr a point, a Freeport fixer makes your record with one faction a little quieter. Once a visit.</p><div class="act">`;
  for(const f of FAC_IDS){const v=Math.round(P.heat[f]),n=Math.min(10,v),pr=n*150;h+=`<button class="btn sm" data-act="fixer" data-arg="${f}" ${n>0&&!P.fixUsed&&P.credits>=pr?'':'disabled'}>${esc(FACTIONS[f].short)} −${n} · ${fmt(pr)} cr</button>`}
  return h+`</div>`}
function unbFixer(f){const P=unbP();if(P.fixUsed||!FAC_IDS.includes(f))return;const n=Math.min(10,Math.round(P.heat[f]));if(!n)return;const got=transfer('player','neutral',n*150);if(got<n*150){if(got)transfer('neutral','player',got);dockErr='Not enough credits.';return}P.heat[f]=Math.max(0,P.heat[f]-n);P.fixUsed=1;dockErr=`✓ The fixer squared ${n} points of ${FACTIONS[f].short} heat.`}
// a Freeport sale of stolen goods after passing a scan under false colours: The long con
function unbSold(k,n){const P=unbP();if(!P.stolen[k])return;const m=Math.min(n,P.stolen[k]);P.stolen[k]-=m;if(!P.stolen[k])delete P.stolen[k];if(P.conPass)deedAdd('con')}
// the HUD: heat by faction, rank, and false colours
function unbHud(c){if(!S.unb||!W||!W.player)return;const P=unbP();c.save();c.font='600 11px "Saira Semi Condensed",sans-serif';c.textAlign='left';let y=VH-260;const x=18;
  c.fillStyle='rgba(216,205,152,.9)';c.fillText(`☠ ${UNB_RANKS[unbRank(P.inf)][0].toUpperCase()} · INFAMY ${fmt(Math.round(P.inf))}${W.player.jamMode?' · JAM MODE':''}${P.cls==='plunderer'?` · JAM TORPS ${P.jt==null?jtCap():P.jt}/${jtCap()}`:''}`,x,y);y+=15;{const L=lockOf();if(L){c.fillStyle='#ff5d4f';c.fillText(`🚨 LOCKDOWN ${fmtT(S.T-L.t0)} · ${FACTIONS[L.f].short.toUpperCase()}`,x,y);y+=15}}
  c.fillStyle=(P.xpdrOut||0)>S.T?'#ff8a7e':P.xpdr?'#7ad9a7':'rgba(236,228,207,.6)';c.fillText(`🎭 ${(P.xpdrOut||0)>S.T?'TRANSPONDER BURNED '+fmtT(P.xpdrOut-S.T):P.xpdr?'FALSE COLOURS: '+(FAC_IDS.filter(f=>unbCover(f)).map(f=>FACTIONS[f].short.toUpperCase()).join(' ')||'NONE COOL'):'FALSE COLOURS OFF (K)'}`,x,y);y+=15;
  for(const f of FAC_IDS){const v=P.heat[f],b=heatBand(v);c.fillStyle='rgba(236,228,207,.15)';c.fillRect(x,y-8,90,5);c.fillStyle=b>=3?'#ff5d4f':b>=2?'#ff9a4a':b>=1?'#f0b24a':sideCol(f);c.fillRect(x,y-8,90*v/100,5);c.fillStyle=sideCol(f);c.fillText(`${FACTIONS[f].short} ${Math.round(v)} ${HEAT_BANDS[b][0]}`,x+98,y-3);y+=13}
  const T=hookTarget();if(T){c.textAlign='center';c.font='700 14px "Saira Semi Condensed",sans-serif';c.fillStyle='#d8cd98';c.fillText(keys.KeyE?`HOOKING · ${Math.max(0,Math.ceil(T.jamOff-W.t))} S`:`HOLD ${kb('act').toUpperCase()} TO HOOK THE HOLD`,VW/2,VH/2+70)}
  c.restore()}
// the debrief block and the Legend point
function unbDebrief(side){if(!S.unb)return'';return allPilots().filter(Boolean).map(P=>unbDebriefOne(side,P)).join('')}
function unbDebriefOne(side,P){P.heat=P.heat||{};P.inf=P.inf||0;P.deeds=P.deeds||[];const r=unbRank(P.inf),ok=side!=='brood'&&r>0&&P.deeds.length>0;
  return`<div style="margin-top:12px;text-align:left"><b>☠ The Unbound: ${esc(P.name||'you')}</b>, ${UNB_RANKS[r][0]}, ${fmt(Math.round(P.inf))} Infamy.<br>${P.deeds.length?P.deeds.map(d=>`★ ${DEED_NAMES[d.k]} · ${esc(DEF[d.sid]?DEF[d.sid].name:'')} · ${fmtT(d.t)}`).join('<br>'):'No Deeds this galaxy.'}<br>${ok?'One Legend point for a pirate who went big.':side==='brood'?'The Bloom took the galaxy: no Legend point.':'No Legend point: it takes a rank above Nuisance and a Deed.'}</div>`}
function unbLegend(side){if(!S.unb||S.training)return;if(NET.host)for(const pid in S.pilots||{}){if(pid===NET.me)continue;const R=S.pilots[pid],ok=side!=='brood'&&unbRank(R.inf||0)>0&&(R.deeds||[]).length>0;const c=readyCl().find(x=>x.pid===pid);if(c)send(c.L,{t:'legend',side:'pirate',ok,cls:R.cls})}
  const P=unbP(),ok=side!=='brood'&&unbRank(P.inf)>0&&P.deeds.length>0;if(!ok)return;const d=legLoad(),r=legRec(P.name,d);if(!r)return;r.pts=Math.round(((r.pts||0)+1)*10)/10;r.wins.pirate=(r.wins.pirate||0)+1;r.last={side:'pirate',at:Date.now()};legSave(d);
  const el=$('winL');if(el){el.textContent=`★ Legend point earned as the Unbound: ${legFmt(r.pts)} total.`;el.hidden=false}}

// ============================================================ Unbound stage 3: the haven works
const UNB_WORKS={tankard:{name:'The Rusty Tankard',lv:['Rumours of all freight one jump from the haven, with cargo values','Rumours reach two jumps out','Recruit a captain to fly as your wingman']},
  den:{name:"Fence's Den",lv:['The Fence pays 70%','80%, and launders stolen goods','90%']},
  powder:{name:'Powder Magazine',lv:['Jammers fill 10% faster','Harpoon reload −25%','Jamming torpedoes: 3 per magazine']},
  chop:{name:'Chop Shop',lv:['Cargo hook 10 t/s','Black-market hulls −10%','Cargo hook 12 t/s']},
  crow:{name:"Crow's Nest",lv:['Marks include freight next to wherever you are','Spot masked and landed ships at 2 km','See escort strength on every mark']},
  forger:{name:"Forger's Shack",lv:['Scan catch chance −25%','Heat cools 50% faster','Transponder burns out for 2 min, not 5']},
  grog:{name:'Grog Still',lv:['AI Unbound wings of 4','Their wings hold their nerve longer','Wings of 5']},
  trophy:{name:'Trophy Wall',lv:['A named plate for every ace the crew downs: +5% Infamy each']},
  graving:{name:'Graving Dock',lv:['Unbound capitals build 20% faster','Call a sloop to a mark (5-minute cooldown)','Call the destroyer to a mark (10-minute cooldown)']}};
const WORK_COST=[null,{goods:{plate:6,wire:4,coil:1},cr:1500},{goods:{plate:12,wire:8,coil:3,lattice:1},cr:3500},{goods:{plate:20,wire:13,coil:5,lattice:2,core:1},cr:6000}];
function havenOf(){S.haven=S.haven||{lv:{},trophy:[]};return S.haven}
function unbWork(k){if(!S||!S.unb)return 0;return havenOf().lv[k]||0}
function workMax(k){return k==='trophy'?0:3}
function unbWorksHtml(c,P){const H=havenOf();let h=`<p class="note" style="margin:0 0 12px">Pour loot and shares into Scrapheart's nine works. Goods come from your hold and vault and go into Unbound stores; shares are credits paid to the haven. If a faction or the Brood batters the haven dark, a random work loses a level.</p><div class="tblw"><table class="t"><thead><tr><th>Work</th><th class="r">Level</th><th>Next</th><th>Cost</th><th></th></tr></thead><tbody>`;
  for(const k in UNB_WORKS){const Wk=UNB_WORKS[k],l=H.lv[k]||0;if(k==='trophy'){h+=`<tr><td><b>${Wk.name}</b></td><td class="r num">${H.trophy.length} plate${H.trophy.length===1?'':'s'}</td><td colspan="3">${H.trophy.length?esc(H.trophy.slice(-4).join(', ')):'Down a named ace to hang the first plate.'} · +${H.trophy.length*5}% Infamy</td></tr>`;continue}
    const C=WORK_COST[l+1],can=C&&haveIn(C.goods,[P.cargo,P.vault])&&P.credits>=C.cr;h+=`<tr><td><b>${Wk.name}</b>${l?`<br><span class="mass">${esc(Wk.lv[l-1])}</span>`:''}</td><td class="r num">${l}/3</td><td>${C?esc(Wk.lv[l]):'Complete'}</td><td>${C?Object.keys(C.goods).map(i=>chip(i,C.goods[i],countIn(i,[P.cargo,P.vault]))).join(' ')+` · ${fmt(C.cr)} cr`:''}</td><td>${C?`<button class="btn sm" data-act="work" data-arg="${k}" ${can?'':'disabled'}>Build</button>`:''}</td></tr>`}
  return h+`</tbody></table></div>`}
function unbBuildWork(k){const H=havenOf(),P=S.player,l=H.lv[k]||0,C=WORK_COST[l+1];if(!UNB_WORKS[k]||k==='trophy'||!C)return;if(!haveIn(C.goods,[P.cargo,P.vault])||P.credits<C.cr){dockErr='Missing goods or shares for that.';return}
  takeFrom(C.goods,[P.cargo,P.vault]);inv.addAll(S.econ.stock.pirate,C.goods);transfer('player','pirate',C.cr);H.lv[k]=l+1;SFX.work();dockErr=`✓ ${UNB_WORKS[k].name} level ${l+1}: ${UNB_WORKS[k].lv[l]}.`;feed(`☠ Scrapheart: ${UNB_WORKS[k].name} raised to level ${l+1}.`,'good')}
function havenBattered(){if(!S.unb)return;const H=havenOf(),L=Object.keys(H.lv).filter(k=>H.lv[k]>0);if(!L.length)return;const k=pick(L);H.lv[k]--;feed(`✕ Scrapheart Haven was battered dark: the ${UNB_WORKS[k].name} loses a level.`,'bad')}
function launderHtml(P){if(unbWork('den')<2)return'';const n=invMass(P.stolen||{});if(!n)return'';const fee=Math.ceil(Object.keys(P.stolen).reduce((v,k)=>v+baseValue(k)*P.stolen[k],0)*.1);return`<div class="act" style="margin-top:8px"><button class="btn" data-act="launder" data-arg="1" ${P.credits>=fee?'':'disabled'}>Launder ${fmt(n)} t of stolen goods · ${fmt(fee)} cr</button></div>`}
function unbLaunder(){const P=unbP(),fee=Math.ceil(Object.keys(P.stolen).reduce((v,k)=>v+baseValue(k)*P.stolen[k],0)*.1);if(!fee||transfer('player','pirate',fee)<fee)return;P.stolen={};dockErr='✓ Laundered: nothing in your hold reads as stolen now.'}
// the captain: Tankard level 3 recruits an Unbound wingman who flies escort on you
function captainTick(){const R=unbRT(),P=S.player;if(unbWork('tankard')<3||!W||P.docked||!W.player||(W===LW&&W.dead))return;if(R.capt&&R.capt.alive&&W.ents.includes(R.capt))return;if((P.captT||0)>S.T)return;
  const e=spawnNPC('patrol','pirate');if(!e)return;const p=W.player,o=rdir();e.x=p.x+o.x*300;e.y=p.y+o.y*120;e.z=p.z+o.z*300;e.order={kind:'escort',tgt:p,until:W.t+1e6,slot:0,by:true,pid:curPid()};e.capt=1;R.capt=e;P.captT=S.T+(R.capt0?240:0);R.capt0=1;feed('☠ Your captain falls in on your wing.','good')}
// ---- mirror variants (black market only) and the Tether cutter
function unbVarBuyHtml(P){const st=S.econ.stock.pirate;let h=`<div class="h3" style="margin-top:14px">Mirror parts</div><p class="note" style="margin:0 0 8px">Unbound specialists, built in the haven's own shops. They fit at any Mk (Upgrades tab).</p><div class="act" style="flex-wrap:wrap">`;
  for(const id of['scanbaf','jamemit','longharp']){const V=VARIANTS[id],pr=Math.ceil(baseValue('v_'+id)*1.3),have=countIn('v_'+id,[P.cargo,P.vault]);h+=`<button class="btn sm" data-act="unbvar" data-arg="${id}" ${P.credits>=pr&&(haveIn(V.recipe,[st])||(st['v_'+id]||0)>0)?'':'disabled'} title="${esc(V.gain+' · '+V.cost)}">${esc(V.name)} · ${fmt(pr)} cr${have?' · own '+have:''}</button>`}
  return h+`</div>`}
function unbBuyVar(id){const P=unbP(),V=VARIANTS[id];if(!V||V.spec!=='unb')return;const st=S.econ.stock.pirate,pr=Math.ceil(baseValue('v_'+id)*1.3);if(P.credits<pr){dockErr='Not enough credits.';return}
  if(!(st['v_'+id]>0)){if(!haveIn(V.recipe,[st])){dockErr='The shops are out of plate and conduit.';return}takeFrom(V.recipe,[st]);inv.add(st,'v_'+id,1)}inv.take(st,'v_'+id,1);inv.add(P.vault,'v_'+id,1);transfer('player','pirate',pr);dockErr=`✓ ${V.name} in your vault. Fit it in Upgrades.`}
// ---- jamming torpedoes (Plunderer, jam mode): 2 in the magazine (3 with the Powder Magazine), 40 s reload each
function jtCap(){return unbWork('powder')>=3?3:2}
function jtTick(dt){const P=S.player;if(!S.unb||P.cls!=='plunderer')return;if(P.jt==null)P.jt=jtCap();if(P.jt<jtCap()){P.jtT=(P.jtT||40)-dt;if(P.jtT<=0){P.jt++;P.jtT=40}}}
function fireJamTorp(){const P=S.player,L=W.lock,p=W.player;if(P.jt==null)P.jt=jtCap();if(P.jt<=0){flash(`Jamming torpedo reloading: ${Math.ceil(P.jtT||40)} s.`,true);return true}
  if(!L.locked||!L.ref){flash('Lock a target first: a capital ship, a ship, or a faction station to crack its vault.',true);return true}if(NET.cl){netSend({t:'msl',tg:netTid(L.ref),k:'jt'});flash('Jamming torpedo away.');return true}P.jt--;if(P.jt<jtCap()&&!(P.jtT>0))P.jtT=40;launchMissile(p,L.ref,P.tiers.weapon,'torpedo',0,true);const m=W.missiles[W.missiles.length-1];if(m){m.jt=1;m.dmg=0;m.col='#b7c6ff'}SFX.jtorpLaunch();unbShot();flash(`Jamming torpedo away (${P.jt} left).`);return true}
// a capital's jam bar: a third of an escort's per torpedo, a sixth of a carrier's; it drains slowly between hits
function capJamFill(e){return e.cls==='escort'?1/3:e.cls==='carrier'?1/6:1/4}
function jtHit(m){const T0=m.tgt,T=T0&&(T0.alive!==false)&&d3(T0,m)<(T0.type==='station'?240:((T0.st&&T0.st.radius)||40)+60)?T0:null;fxBoom(m,90,'#b7c6ff');if(W.player&&d3(m,W.player)<4000)SFX.jtorpHit(!!(T&&T.role==='frigate'));if(!T)return;
  if(m.src&&m.src.rp&&!CTX){runAs(m.src.rp,()=>jtHit2(m,T));return}jtHit2(m,T)}
function jtHit2(m,T){
  if(T.type==='station'){vaultHeist(T,m);return}
  if(T.type!=='ship'||!T.alive)return;if(T.role==='frigate'){if(T.shield>T.st.sCap*.05){if(m.src===W.player)flash('The torpedo splashed on its shields. Strip them first.');return}T.cjam=(T.cjam||0)+capJamFill(T);T.cjamT=W.t;
    if(T.cjam>=1){T.cjam=0;T.jamOff=W.t+(T.cls==='escort'?20:15);T.jamHard=T.jamOff+60;fxBoom(T,T.st.radius*.6,'#b7c6ff');if(W.player&&d3(T,W.player)<6000)SFX.capDark();if(m.src===W.player)flash(`${T.tok?T.tok.name:'The capital'} is jammed dark: turrets, launches and jump drive offline for ${Math.round(T.jamOff-W.t)} s. Hook its store (hold ${kb('act')}).`,true)}
    else if(m.src===W.player)flash(`Capital jam ${Math.round(T.cjam*100)}%.`);return}
  if((T.jamHard||0)>W.t||jamDark(T))return;T.jam=0;T.jamOff=W.t+jamWin(T);T.jamHard=T.jamOff+JAM.harden;T.boosting=false;fxSpark(T,'#b7c6ff',12);if(T.isPlayer)flash('Jamming torpedo: every system offline.',true)}
function capJamDrain(e,dt){if(e.cjam>0&&W.t-(e.cjamT||0)>5)e.cjam=Math.max(0,e.cjam-.02*dt)}
// jam-mode guns on a stripped capital shut its turrets down one at a time (15 s, then hardened for a minute)
function capJamShot(e,b){if(e.shield>e.st.sCap*.05){fxSpark(b,'#8fc8ff',3);return}const R=e.st.radius*1.1;let best=null,bd=1e9;for(const tu of e.turrets||[]){if((tu.jamHard||0)>W.t)continue;qRot(e.q,tu.p[0]*R,tu.p[1]*R,tu.p[2]*R,_u);const d=hyp(e.x+_u.x-b.x,e.y+_u.y-b.y,e.z+_u.z-b.z);if(d<bd){bd=d;best=tu}}
  fxSpark(b,'#b7c6ff',3);if(!best)return;best.jamAcc=(best.jamAcc||0)+b.dmg;if(best.jamAcc<120)return;best.jamAcc=0;best.jamOff=W.t+15;best.jamHard=W.t+75;if(b.src===W.player){SFX.turretJam();const f=FAC_IDS.includes(e.side)?e.side:null;if(f)heatAdd(f,2,'');flash('Turret jammed: offline 15 s.')}}
// ---- raids and lockdown in faction home space
function lockOf(){const P=S.player;return W&&P&&P.lock&&P.lock.sid===W.sid?P.lock:null}
function raidTick(){const f=unbHomeOf(W.sid),P=unbP(),p=W.player;if(!f){if(P.lock&&P.lock.sid!==W.sid)P.lock=null;return}
  let L=lockOf();if(!L&&(!unbCover(f)))L=P.lock={sid:W.sid,f,t0:S.T,n:0},SFX.lockdown(),feed(`🚨 Lockdown in ${DEF[W.sid].name}: ${FACTIONS[f].short} sounds the alarm. Response wings in 45 s. Heat with ${FACTIONS[f].short} won't cool while you're here.`,'bad');
  if(!L)return;const el=S.T-L.t0,sched=[45,135,225];
  while(L.n<sched.length&&el>=sched[L.n]||(L.n>=sched.length&&el>=sched[sched.length-1]+90*(L.n-sched.length+1))){const k=L.n++;
    if(k===2){const A=(S.aces||[]).find(x=>x.side===f&&!x.dead);if(A&&aceWing(A)){feed(`⚠ ${FACTIONS[f].short}'s ace ${aceLabel(A)} is leading the hunt.`,'bad');continue}}
    const n=k===1?5:3;let got=0;for(let i=0;i<n;i++){const e=spawnNPC('patrol',f,false,null);if(!e)break;if(k===1&&i===0&&e.cls!=='heavy'){}const SE=W.stationEnt,o=rdir();const b=SE&&SE.fac===f?SE:{x:0,y:0,z:0};e.x=b.x+o.x*400;e.y=b.y+o.y*200;e.z=b.z+o.z*400;e.ai.tgt=p;e.ai.hunt=p;e.ai.huntUntil=W.t+300;got++}
    if(got){SFX.warn();}if(got)feed(`🚨 ${FACTIONS[f].short} response wing (${got}) launching${k===1?', Heavy Fighter-led':''}.`,'bad')}}
// a jamming torpedo into a faction core station during a lockdown cracks its vault: stores spill as salvage
function vaultHeist(T,m){const f=T.fac;if(!FAC_IDS.includes(f)||!T.rec||T.rec.kind!=='core'){if(m.src===W.player)flash('Only a faction core station has a vault worth cracking.');return}
  if(!lockOf()){if(m.src===W.player)flash('The vault doors only open in the confusion of a lockdown.');return}
  const st=S.econ.stock[f],got={};let t=0;for(const k of Object.keys(st).filter(k=>!k.startsWith('v_')&&!MUNITIONS.has(k)).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a))){if(t>=45)break;const n=Math.min(Math.ceil(st[k]*.08),Math.floor((45-t)/Math.max(1,mass(k))));if(n>0){got[k]=inv.take(st,k,n);t+=got[k]*mass(k)}}
  if(!t)return;const s=S.sectors[W.sid];s.crates.push({id:S.nextId++,x:Math.round(m.x),y:Math.round(m.y),z:Math.round(m.z),inv:got,until:S.T+240,heist:1});fxBoom(m,140,'#ffcf5a');
  heatAdd(f,6,'a vault heist');if(W.player&&d3(m,W.player)<5000)SFX.vault();if(m.src===W.player){flash(`Vault cracked: ${fmt(t)} t of ${FACTIONS[f].short} stores spilled. Scoop them up.`,true);deedAdd('heist')}}
// ---- fleet call-ins from the Graving Dock
function unbCaps(){return(S.frigates||[]).filter(t=>t.side==='pirate'&&t.hull>0)}
function callCap(kind,sid){const lv=unbWork('graving'),need=kind==='sloop'?2:3;if(lv<need){dockErr=`Calling a ${kind} needs the Graving Dock at level ${need}.`;return}const H=havenOf();if((H.callT||0)>S.T){dockErr=`The fleet is busy: ${fmtT(H.callT-S.T)} until the next call.`;return}
  if(DEF[sid].home){dockErr='No Unbound capital enters faction home space, even when called.';return}const t=unbCaps().find(x=>kind==='sloop'?isEsc(x):isCar(x));if(!t){dockErr=`No ${kind==='sloop'?'Corsair Sloop':'Destroyer'} is afloat right now.`;return}
  t.dest=sid;t.jumpTo=null;t.call={by:pkey(),until:S.T+600,sid};H.callT=S.T+(kind==='sloop'?300:600);dockErr=`✓ ${t.name} is under way to ${DEF[sid].name}. It hammers the escorts while you jam the freighter.`;feed(`☠ ${t.name} answers your call: under way to ${DEF[sid].name}.`,'good')}
// ---- Lairs: a hidden asteroid base for one pilot (stash 200 t, repairs). A Rigger from Scrapheart builds it.
const LAIR={stash:200,hull:1500,cost:{frame:1,plate:20},kinds:['contested','hub','deep','void'],seeR:5000,findPay:250};
function lairHere(){return(S.lairs||[]).find(L=>L.sid===W.sid&&L.hull>0)}
function lairBuild(){const P=unbP(),d=DEF[W.sid];if(!d||!LAIR.kinds.includes(d.kind)||S.stations[W.sid]){flash('A Lair goes in contested, hub, deep or quiet space, in a system with no station.',true);return}
  if(lairHere()){flash('There is already a Lair in this system.',true);return}const st=S.econ.stock.pirate;if(!haveIn(LAIR.cost,[st])){flash('Scrapheart is short of a Depot Frame and 20 plate for the Rigger.',true);return}
  if(S.events.some(e=>e.type==='rigger'&&e.stage!=='done')){flash('A Rigger is already out.',true);return}takeFrom(LAIR.cost,[st]);const p=W.player,force={};inv.addAll(force,LAIR.cost);
  S.events.push({id:S.nextId++,type:'rigger',att:'pirate',sector:W.sid,force,at:{x:Math.round(p.x),y:Math.round(p.y),z:Math.round(p.z)},until:S.T+90,stage:'inbound',pid:curPid()||'me'});feed(`☠ A Rigger is on its way from Scrapheart with two Raiders to build your Lair here (90 s).`,'info')}
function riggerTick(){for(const ev of S.events){if(ev.type!=='rigger'||ev.stage==='done'||S.T<ev.until)continue;ev.stage='done';S.lairs=(S.lairs||[]).filter(L=>{if(L.pid!==ev.pid)return true;lairEvict(L);const s=S.sectors[L.sid];if(Object.keys(L.stash).length)s.crates.push({id:S.nextId++,x:L.x,y:L.y,z:L.z,inv:L.stash,until:S.T+600});toDebris(s,L.fort||{});return false});
    S.lairs.push({id:S.nextId++,pid:ev.pid,sid:ev.sector,x:ev.at.x+300,y:ev.at.y,z:ev.at.z+300,stash:{},fort:ev.force,hull:LAIR.hull,seen:{}});ev.force={};if(!MUTE&&isMe(ev.pid))SFX.rigger();keyFeed(ev.pid,`☠ Your Lair in ${DEF[ev.sector].name} is ready: stash and repairs. Dock with E. Factions can't see it until one of their scouts comes within 5 km.`,'good')}}
function lairWorld(dt){const L=lairHere();if(!L)return;const p=W.player;
  // only scouts find a Lair: AI scouts, and pilots flying a Scout or Advanced Scout (paid a finder's fee by their faction)
  for(const e of W.ents){if(e.type!=='ship'||!e.alive)continue;const k=e.isPlayer?pkey():e.rp||null,sd=e.isPlayer?S.player.faction:e.rp?(S.pilots[e.rp]||{}).faction:e.side;if(!FAC_IDS.includes(sd))continue;
    if((e.role==='scout'||(k&&isScoutCls(e.cls)))&&!L.seen[sd]&&d3(e,L)<LAIR.seeR){L.seen[sd]=1;keyFeed(L.pid,`⚠ A ${FACTIONS[sd].short} scout has found your Lair in ${DEF[W.sid].name}. Their ships will attack it on sight.`,'bad');
      facFeed(sd,`☠ Unbound Lair found in ${DEF[W.sid].name}.`,'info');if(k){const got=payKey(k,sd,LAIR.findPay);if(got)keyFeed(k,`☠ You found an Unbound Lair: +${fmt(got)} cr. Your side's ships will attack it on sight.`,'good')}}
    if(!e.npc||!FAC_IDS.includes(e.side))continue;
    if(L.seen[e.side]&&d3(e,L)<2500)L.hull-=6*dt}   // a Lair has no guns: hiding is its only defence
  if(L.hull<=0){const s=S.sectors[W.sid];s.crates.push({id:S.nextId++,x:L.x,y:L.y,z:L.z,inv:L.stash,until:S.T+600});toDebris(s,L.fort||{});L.stash={};L.fort={};S.lairs=S.lairs.filter(x=>x!==L);fxBoom(L,260,'#ffcf5a');keyFeed(L.pid||'me',`✕ Your Lair in ${DEF[W.sid].name} was destroyed. Its stash is drifting as salvage.`,'bad');lairEvict(L)}}
function lairDraw(){const L=W&&lairHere();if(!L||!inView(L.x,L.y,L.z,120))return;qAxis(.2,1,.1,.6,_xq);qNorm(_xq);mModel(MM,L.x,L.y,L.z,_xq,90,70,84);drawMesh(astMesh(3,'fe'),MM);sprite(L.x,L.y+70,L.z,18+4*Math.sin(W.t*3),[.85,.8,.55],.7)}
function lairNear(){const L=W&&lairHere(),p=W&&W.player;return L&&p&&d3(L,p)<260&&L.pid===(curPid()||'me')?L:null}
// docking at a Lair: the ship lines up on the rock's mouth and slides inside it (out of sight, as at any dock) before the
// dock opens; undocking puts it back out at the mouth. Other pilots see it fly in and vanish.
const LAIR_IN=1.8,LAIR_R=105;
function lairEnter(L){const p=W.player;if(!p||W.lairIn||W.docking||S.player.docked)return;apOn=false;W.lairIn={L,t:0,ox:p.x,oy:p.y,oz:p.z};flash('Slipping into your Lair…')}
function lairInUpdate(dt){const D=W.lairIn,p=W.player,L=D.L;if(W.dead||!p.alive||L.hull<=0||!(S.lairs||[]).includes(L)){W.lairIn=null;return}D.t+=dt;
  let dx=D.ox-L.x,dy=(D.oy-L.y)*.3,dz=D.oz-L.z;const l=hyp(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;const m=LAIR_R+p.st.radius*1.25+30,sm=k=>k*k*(3-2*k);
  const ax=L.x+dx*m,ay=L.y+dy*m,az=L.z+dz*m;let x,y,z;if(D.t<1){const k=sm(D.t);x=D.ox+(ax-D.ox)*k;y=D.oy+(ay-D.oy)*k;z=D.oz+(az-D.oz)*k}else{const k=sm(Math.min(1,(D.t-1)/(LAIR_IN-1)));x=ax+(L.x-ax)*k;y=ay+(L.y-ay)*k;z=az+(L.z-az)*k}
  p.x=x;p.y=y;p.z=z;p.vx=p.vy=p.vz=0;p.thrusting=D.t>1;p.boosting=false;p.mining=null;faceTo(p,{x:L.x,y:L.y,z:L.z},dt*2);
  if(D.t>=LAIR_IN){W.lairIn=null;lairDock(L)}}
function lairDock(L){const P=S.player,p=W.player;SFX.lair();if(p.stealth){p.stealth=false;p.masked=false;p.maskR=0}if(p.landed)p.landed=null;recallPlayerDrones();W.tgt=null;p.x=L.x;p.y=L.y;p.z=L.z;if(NET.cl){P.docked='lair';P.lairId=L.id;p.vx=p.vy=p.vz=0;netSend({t:'dock',d:'lair',id:L.id});openDock('storage');return}P.docked='lair';P.lairId=L.id;p.vx=p.vy=p.vz=0;p.hull=p.st.hull;p.shield=p.st.sCap;openDock('storage');feed('Docked at your Lair: repaired. The stash holds 200 t.','good')}
function tunedK(e,kind){const t=e.st&&e.st.tuned;if(!t||(kind!=='kinetic'&&kind!=='laser'))return 1;return kind===t?1/1.3:1.2}
// a destroyed ship's fitted variants: each one either spills into the crate whole, or breaks up into the system's debris
function vrLose(P,crate,s){const vr=vrOf(P.tune);for(const sl in vr){const id='v_'+vr[sl];if(!ITEMS[id])continue;if(Math.random()<.5)inv.add(crate,id,1);else toDebris(s,{[id]:1})}if(P.tune)P.tune.vr={}}

// combat Mk curve: how many old-style Mk steps each Mk is worth for hull, shields, armour, guns, energy and missiles, so an
// upgrade is an edge, not a wall. Same pilot skill, same hull: Mk I beats Mk II about 40% of the time and Mk III about 35%, on
// every hull: MK_HULL gives heavy hulls (longer fights) a smaller step. Engines, holds, blast rigs and payload reloads keep their full steps.
let MK_LV=[0,0,0.178,0.36,0.36,0.36],MK_K=1;const MK_HULL={interceptor:0.9,striker:0.76,heavy:[0.8,0.58],bomber:0.93,gunboat:0.87,wraith:0.52,raider:0.72,corsair:0.91,plunderer:0.48};const MK_TOP=3;/* Mk I-III only (IV and V retired); stronger steps so one Mk is worth more than any one variant */let SWARM_K=.35,MSL_K=1;/* swarm micro-missiles were deciding dogfights on their own: now harassment more than a kill */const mkL=t=>MK_LV[clamp(Math.round(t),1,5)]*MK_K;
function mkH(cls,t){const v=MK_HULL[cls];if(v==null)return(CLASSES[cls]&&CLASSES[cls].mkK)||1;return Array.isArray(v)?v[t>=3?1:0]:v}
function shipStatsBase(fac,cls,T){
  const t=s=>typeof T==='number'?T:T[s];
  const C=CLASSES[cls],F=(FACTIONS[fac]&&FACTIONS[fac].trait)||{},tr=k=>F[k]||1,c=s=>mkL(t(s))*mkH(cls,t(s));   // C.mkK evens out how much each hull gains per Mk
  return{thrust:225*SPEED_K*(C.acc||1)*(1+.16*(t('engine')-1)),maxSpd:285*SPEED_K*C.speed*(1+.11*(t('engine')-1)),turn:C.turn*(1+.06*(t('engine')-1)),
    eCap:110*(1+.25*c('power'))*tr('energy'),eRegen:22*(1+.22*c('power'))*tr('energy'),
    sCap:172*C.shield*(1+.32*c('shield'))*tr('shield'),hull:2*C.hull*(1+.22*c('armor'))*tr('hull'),dr:.05*c('armor'),
    dmg:8*C.weapon*(1+.26*c('weapon')),rof:5.5,shotCost:3.2*(1+.12*c('weapon')),
    drill:3.2*C.drill*(1+.3*(t('drill')-1)),cargo:Math.round(C.cargo*(1+.3*(t('cargo')-1))),reload:1-.15*((t('payload')||1)-1),radius:C.radius};
}
const SHOT_SPD=1150,SHOT_TTL=.9,SHOT_RANGE=SHOT_SPD*SHOT_TTL*.9;
const LASER_ROF=10,LASER_RANGE=820;
const MISSILE_SPD=780,MISSILE_RANGE=2400,LOCK_CONE=.24;
const TORP_SPD=440,TORP_RANGE=2700;
const missileDmg=t=>80*MSL_K*(1+.2*mkL(t)),torpDmg=t=>160*(1+.2*(t-1)),swarmDmg=t=>24*SWARM_K*(1+.2*mkL(t)),SWARM_N=8,BARE_MUL=1.8,TORP_STATION=5,
  SPEED_K=.75, // every ship and missile flies at three quarters of the original pace (missiles keep their range)
  MK={missile:{spd:780*SPEED_K,acc:520*SPEED_K,turn:3,ttl:8/SPEED_K,k:1},torpedo:{spd:440*SPEED_K,acc:220*SPEED_K,turn:1.25,ttl:13/SPEED_K,k:2.2},swarm:{spd:950*SPEED_K,acc:700*SPEED_K,turn:4.6,ttl:5/SPEED_K,k:.6}},lockTime=(t,torp)=>(torp?2.6:1.5)*(1-.07*(t-1));
const rackItem=cls=>CLASSES[cls].torp?'torpedo':'missile';
const rackCapC=(cls,t)=>CLASSES[cls].torp?2+t:Math.round((4+2*(t-1))*CLASSES[cls].rack);
// missiles, torpedoes and swarm pods are magazines now: a hull carries a set number of shots, and once the magazine
// is below full a reload countdown runs, then it refills completely. Nothing to build or load, and no matter is used.
const MAG_T={missile:20,torpedo:35,swarm:30};
// Payload Bay upgrades stop at a floor per weapon; only Aurora tuning (deep-space Aurorite) pushes below it
const MAG_FLOOR={missile:10,torpedo:20,swarm:15};
function reloadT(P,k){const t=(P.tiers&&P.tiers.payload)||1,u=(P.tune&&P.tune.payload)||0;return Math.max(1,Math.round(Math.max(MAG_FLOOR[k],MAG_T[k]*(1-.15*(t-1)))*vK(P,'reloadK'))-2*u)}
function swarmCap(P){return(CLASSES[P.cls]&&CLASSES[P.cls].swarm)||0}
function magInit(P){if(!P||P.magV)return;if(P.rack>0&&P.vault)inv.add(P.vault,rackItem(P.cls),P.rack);P.rack=pRack(P);P.swarm=swarmCap(P);P.mslT=0;P.swT=0;P.magV=1}
function magTick(P,dt){if(!P||!P.tiers)return;blTick(P,dt);if(!P.magV)magInit(P);const cap=pRack(P),sc=swarmCap(P);if(P.rack>cap)P.rack=cap;if(P.swarm>sc)P.swarm=sc;
  if(P.rack<cap){if(!(P.mslT>0))P.mslT=reloadT(P,CLASSES[P.cls].torp?'torpedo':'missile');P.mslT-=dt;if(P.mslT<=0){P.rack=cap;P.mslT=0;if(P===S.player&&!MUTE&&running)feed(`${CLASSES[P.cls].torp?'Torpedo bay':'Missile rack'} reloaded.`,'info')}}else P.mslT=0;
  if(sc&&(P.swarm||0)<sc){if(!(P.swT>0))P.swT=reloadT(P,'swarm');P.swT-=dt;if(P.swT<=0){P.swarm=sc;P.swT=0}}else P.swT=0}
