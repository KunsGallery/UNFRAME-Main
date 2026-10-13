import {demo,subscribeExhibitions,hydrateImages} from './store.js';
import {escapeHTML as e,imageURL,dateRange,exhibitionState,sortExhibitions,stateLabels} from './model.js';
import {chrome} from './ui.js';
chrome(demo,true);
const target=document.querySelector('#home-exhibitions');
const artwork=document.querySelector('#hero-artwork');
const caption=document.querySelector('#hero-caption');
let generation=0,retainedURLs=[];
function resetHero(message='감각이 머무는 곳, UNFRAME'){
 artwork.innerHTML='<div class="gallery-placeholder"><span>UNFRAME</span><p>Gallery & Projects</p></div>';
 caption.innerHTML=`<p>${e(message)}</p><a href="/exhibition">전시와 아카이브 보기 ↗</a>`;
}
function releaseImages(){retainedURLs.forEach(url=>URL.revokeObjectURL(url));retainedURLs=[];}
async function renderCurrent(items){
 const version=++generation;
 const ordered=sortExhibitions(items);
 const current=ordered.filter(item=>exhibitionState(item)==='current');
 const upcoming=ordered.filter(item=>exhibitionState(item)==='upcoming').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const past=ordered.filter(item=>exhibitionState(item)==='past').sort((a,b)=>b.endDate.localeCompare(a.endDate));
 const featured=current[0]||upcoming[0]||past[0];
 if(!featured){releaseImages();resetHero('지금은 다음 전시를 준비하고 있습니다.');target.innerHTML='<div class="home-empty"><p>지금은 다음 전시를 준비하고 있습니다.</p><a class="text-link" href="/exhibition">전시와 아카이브 살펴보기 ↗</a></div>';return;}
 try{
  const [item]=await hydrateImages([featured],false);
  const src=imageURL(item.cover?.url);
  if(version!==generation){if(src.startsWith('blob:'))URL.revokeObjectURL(src);return;}
  releaseImages();if(src.startsWith('blob:'))retainedURLs.push(src);
  const href=`/exhibition/${encodeURIComponent(item.id)}`;
  const state=stateLabels[exhibitionState(item)];
  const image=src?`<img src="${e(src)}" alt="${e(item.cover?.alt||item.title)}" fetchpriority="high">`:'';
  if(image)artwork.innerHTML=`<a href="${href}" aria-label="${e(item.title)} 전시 보기">${image}</a>`;else resetHero();
  caption.innerHTML=`<p>${e(state)} · ${e(item.title)}</p><p>${e(item.artists||'')} ${item.artists?'· ':''}${e(dateRange(item))}</p><a href="${href}">전시 상세 보기 ↗</a>`;
  target.innerHTML=`<div class="exhibition-story"><a class="exhibition-picture" href="${href}">${src?`<img src="${e(src)}" alt="${e(item.cover?.alt||item.title)}" loading="lazy">`:'<div class="gallery-placeholder"><span>UNFRAME</span></div>'}</a><div><p class="home-live-date">${e(state)} · ${e(dateRange(item))}</p><h3 class="home-live-title">${e(item.title)}</h3><p class="home-live-copy">${e(item.summary)}</p><p class="home-live-location">${e(item.artists||'')}${item.artists?' · ':''}${e(item.location)}</p><a class="text-link" href="${href}">전시 상세 정보 <span aria-hidden="true">↗</span></a></div></div>${current.length>1?'<p class="home-update-status">더 많은 현재 전시는 전체 전시 페이지에서 확인할 수 있습니다.</p>':''}`;
  artwork.querySelector('img')?.addEventListener('error',()=>{if(version===generation)resetHero('전시 이미지를 준비하고 있습니다.');},{once:true});
  target.querySelector('img')?.addEventListener('error',()=>{if(version!==generation)return;target.querySelector('.exhibition-picture').innerHTML='<div class="gallery-placeholder"><span>UNFRAME</span><p>전시 이미지를 준비하고 있습니다.</p></div>';},{once:true});
 }catch{if(version!==generation)return;resetHero('전시 이미지를 불러오지 못했습니다.');target.innerHTML='<div class="home-empty"><p>전시 사진을 불러오지 못했습니다.</p><a class="text-link" href="/exhibition">전시 목록으로 이동 ↗</a></div>';}
}
function dataError(){generation++;releaseImages();resetHero('전시 정보를 불러오지 못했습니다.');target.innerHTML='<div class="home-empty"><p>전시 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p><a class="text-link" href="/exhibition">전시 페이지로 이동 ↗</a></div>';}
subscribeExhibitions(renderCurrent,dataError).catch(dataError);
// Open frames move around the artwork; pointer depth never distorts the work itself.
const stage=document.querySelector('#hero-stage');
const canvas=document.querySelector('#frame-canvas');
const context=canvas.getContext('2d');
const toggle=document.querySelector('#motion-toggle');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,visible=true,width=0,height=0,raf=0,elapsed=0,previous=0,lastDraw=0,px=0,py=0;
function draw(){
 if(!context)return;
 context.clearRect(0,0,width,height);
 const t=elapsed/1000;
 for(let layer=0;layer<3;layer++){
  const angle=Math.sin(t*.22+layer*.7)*.23+(layer-1)*.13;
  const stretch=.78+Math.cos(t*.27+layer)*.09;
  const w=width*(.89+layer*.025),h=height*(.88+layer*.025);
  context.save();context.translate(width/2+px*(layer+1)*7,height/2+py*(layer+1)*6);context.rotate(angle);
  context.strokeStyle=`rgba(0,74,173,${.45-layer*.1})`;context.lineWidth=1;
  context.beginPath();context.moveTo(-w/2,-h/2);context.lineTo(w/2*stretch,-h/2+layer*12);context.lineTo(w/2,h/2);context.lineTo(-w/2*stretch,h/2-layer*12);context.lineTo(-w/2,-h/2);context.stroke();context.restore();
 }
}
function resize(){const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context?.setTransform(dpr,0,0,dpr,0,0);draw();}
function tick(time){raf=0;if(paused||!visible||document.hidden)return;elapsed+=previous?Math.min(time-previous,80):0;previous=time;if(time-lastDraw>=33){draw();lastDraw=time;}raf=requestAnimationFrame(tick);}
function start(){previous=0;if(!raf&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
function applyMotion(){document.body.classList.toggle('motion-paused',paused);toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'움직임 켜기':'움직임 멈추기';if(paused){stop();px=py=0;stage.style.setProperty('--art-x','0px');stage.style.setProperty('--art-y','0px');draw();}else start();}
toggle.addEventListener('click',()=>{paused=!paused;applyMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;applyMotion();});
stage.addEventListener('pointermove',event=>{if(paused||event.pointerType==='touch')return;const bounds=stage.getBoundingClientRect();px=(event.clientX-bounds.left)/bounds.width-.5;py=(event.clientY-bounds.top)/bounds.height-.5;stage.style.setProperty('--art-x',`${px*12}px`);stage.style.setProperty('--art-y',`${py*10}px`);});
stage.addEventListener('pointerleave',()=>{px=py=0;stage.style.setProperty('--art-x','0px');stage.style.setProperty('--art-y','0px');});
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop();}).observe(stage);
new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting)),{threshold:.25}).observe(document.querySelector('#about'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
addEventListener('pagehide',stop);addEventListener('pageshow',start);
resize();applyMotion();
