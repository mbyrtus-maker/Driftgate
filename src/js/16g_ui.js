//@src 16g_ui.js
// ============================================================ the item icon system (from Driftgate Beyond, Nov 2026) and the
// minimal menu pass. Every item gets an icon by kind and a colour:
//   ore a hexagon in the ore's own colour; components a square in the colour of the ore they use most (raw units through the
//   whole recipe, a tie going to the dearer ore); weapon parts a dart in reds; utility parts a plus in cyans; missiles a rocket
//   and charges an octagon, in magentas. Fill is the colour at 20%, outline the colour, with a solid core.
const ICO_SHAPE={ore:'15,2 26,9 27,21 16,28 4,22 3,9',comp:'5,5 25,5 25,25 5,25',wpn:'15,2 24,26 15,20 6,26',util:'11,3 19,3 19,11 27,11 27,19 19,19 19,27 11,27 11,19 3,19 3,11 11,11',msl:'15,2 19,9 19,22 23,28 7,28 11,22 11,9',chg:'10,3 20,3 27,10 27,20 20,27 10,27 3,20 3,10'};
const ICO_CORE={ore:4,comp:3,wpn:2,util:3,msl:2,chg:5};
const ICO_PAY={missile:'#ff6fcf',torpedo:'#d65aa8',swarm:'#ff8fe0'};
const ICO_UTIL={drone:'#5fe3f0',beacon:'#3fc6d8',tune:'#8ff0ff'};
const ICO_RED=['#ff6b6b','#ff9aa8','#e2505f','#ff7f50','#d94a4a'];
const ICO_CYAN=['#6fd8e8','#4fc3d9','#9eeaf5','#38b2c9','#7fe0d8'];
function itemKind(k){const I=ITEMS[k];if(!I)return'comp';if(RAWS.includes(k))return'ore';if(ICO_PAY[k])return'msl';if(k==='charge')return'chg';
  if(I.variant){const V=VARIANTS[I.variant];return V&&V.slot==='weapon'?'wpn':'util'}if(ICO_UTIL[k])return'util';return'comp'}
const ICO_ORE={};
function itemOres(k,n,acc){const I=ITEMS[k];if(!I)return acc;if(RAWS.includes(k)){acc[k]=(acc[k]||0)+n;return acc}for(const i in I.recipe||{})itemOres(i,n*I.recipe[i],acc);return acc}
function itemCol(k){const I=ITEMS[k];if(!I)return'#8c91a5';const kd=itemKind(k);if(kd==='ore')return I.col;if(kd==='msl')return ICO_PAY[k];if(kd==='chg')return'#d65aa8';
  if(I.variant){const L=kd==='wpn'?ICO_RED:ICO_CYAN,ids=Object.keys(VARIANTS).filter(id=>(VARIANTS[id].slot==='weapon')===(kd==='wpn')),i=Math.max(0,ids.indexOf(I.variant));return L[i%L.length]}
  if(ICO_UTIL[k])return ICO_UTIL[k];
  if(!ICO_ORE[k]){const o=itemOres(k,1,{});let b=null,bn=-1;for(const r of RAWS){const n=o[r]||0;if(n>bn||(n===bn&&n>0&&b&&baseValue(r)>baseValue(b))){bn=n;b=r}}ICO_ORE[k]=b?ITEMS[b].col:I.col}return ICO_ORE[k]}
function itemIco(k,sz){sz=sz||14;const kd=itemKind(k),c=itemCol(k);return`<svg class="ico" width="${sz}" height="${sz}" viewBox="0 0 30 30" aria-hidden="true"><polygon points="${ICO_SHAPE[kd]}" fill="${c}33" stroke="${c}" stroke-width="2"></polygon><circle cx="15" cy="15" r="${ICO_CORE[kd]}" fill="${c}"></circle></svg>`}
// the old diamond swatch and the recipe chips now carry the icon
sw=function(k){return ITEMS[k]?itemIco(k,16):''};
chip=function(k,need,have){return`<span class="req ${have>=need?'ok':'no'}">${itemIco(k,12)}${need} ${esc(ITEMS[k].name)} <span style="opacity:.7">(${have})</span></span>`};
// ---- job kinds get icons too (the shapes of Beyond's job boards): haul a square, mine a hexagon, fight a dart, scout (intel)
// a diamond, the campaign move an octagon, each in its label's colour
const JOB_ICO={haul:['comp','#9ee6b8'],mine:['ore','#9ee6b8'],fight:['wpn','#ff9d7a'],scout:['intel','#a9c6ff'],camp:['chg','#f0b24a']};
ICO_SHAPE.intel='15,3 27,15 15,27 3,15';ICO_CORE.intel=3;
function jobIco(t){const J=JOB_ICO[t];if(!J)return'';const c=J[1];return`<svg class="ico" width="13" height="13" viewBox="0 0 30 30" aria-hidden="true"><polygon points="${ICO_SHAPE[J[0]]}" fill="${c}33" stroke="${c}" stroke-width="2.2"></polygon></svg>`}
{const o=jobsHtml;jobsHtml=function(){return o.apply(this,arguments).replace(/<span class="jty ty-([a-z]+)">/g,(m,t)=>m+jobIco(t))}}
// ---- long explanations at the top of a dock tab fold to their first sentence; "More" opens the rest (kept open per tab
// while you stay docked). Nothing is removed: the full text is one click away.
const DOCK_TIPS=new Set();
function dockFoldNote(){const B=$('dBody');if(!B)return;const n=B.firstElementChild;if(!n||!n.classList.contains('note')||n.tagName==='DETAILS')return;const txt=n.textContent||'';if(txt.length<170)return;
  const html=n.innerHTML,cut=html.indexOf('. ');if(cut<20||html.slice(0,cut).includes('<'))return;const key=dockTab||'';
  const d=document.createElement('details');d.className='note tip';d.open=DOCK_TIPS.has(key);d.innerHTML=`<summary>${html.slice(0,cut+1)} <span class="more">More</span></summary>${html.slice(cut+2)}`;
  d.addEventListener('toggle',()=>{if(d.open)DOCK_TIPS.add(key);else DOCK_TIPS.delete(key)});n.replaceWith(d)}
{const o=renderDock;renderDock=function(){const r=o.apply(this,arguments);try{dockFoldNote()}catch(e){}return r}}
