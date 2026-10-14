import {escapeHTML as e,imageURL,safeURL} from './model.js';
const root=document.querySelector('#hero');
const slides=document.querySelector('#hero-slides');
const controls=document.querySelector('.slider-controls');
const dots=document.querySelector('.slide-dots');
const position=document.querySelector('#slide-position');
const play=document.querySelector('#slide-play');
const loading=document.querySelector('#hero-loading');
function ready(){root.classList.remove('is-loading');root.setAttribute('aria-busy','false');loading.hidden=true;schedule();}
export function setHeroFailure(){stop();ready();controls.hidden=true;slides.innerHTML='<div class="hero-slide is-active hero-slide-unavailable"><div class="slide-copy"><h2>전시를 불러오지 못했습니다.</h2><p>잠시 후 다시 확인해주세요.</p><a class="slide-link" href="/">다시 불러오기 ↗</a></div></div>';}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let records=[],index=0,timer=0,paused=reduced.matches,hovered=false,focused=false,visible=true;
function stop(){clearInterval(timer);timer=0;}
function schedule(){stop();root.classList.toggle('slide-motion',records.length>1&&!reduced.matches);root.classList.toggle('slide-motion-paused',paused||hovered||focused||!visible||document.hidden);if(records.length>1&&!paused&&!hovered&&!focused&&visible&&!document.hidden&&!root.classList.contains('is-loading'))timer=setInterval(()=>show((index+1)%records.length),8000);}
function show(next){index=next;[...slides.children].forEach((slide,i)=>{const active=i===index;slide.classList.toggle('is-active',active);slide.setAttribute('aria-hidden',String(!active));slide.inert=!active;});[...dots.children].forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));position.textContent=`${index+1} / ${records.length}`;}
export function setHeroSlides(items){
 const next=items.filter(item=>imageURL(item.image)&&safeURL(item.url));if(JSON.stringify(next)===JSON.stringify(records)&&slides.querySelector('img'))return;const previous=records[index]?.key;records=next;
 if(!records.length){if(items.length){setHeroFailure();return;}ready();stop();controls.hidden=true;slides.innerHTML='<div class="hero-slide is-active hero-slide-empty"><div class="slide-copy"><p class="slide-kind">UNFRAME · GALLERY & PROJECTS</p><h2>Beyond<br>The Frame</h2><p class="slide-summary">감각이 머무는 곳, UNFRAME</p><a class="slide-link" href="/exhibition">전시 살펴보기 ↗</a></div></div>';return;}
 slides.innerHTML=records.map((item,i)=>`<article class="hero-slide" aria-roledescription="슬라이드" aria-label="${i+1} / ${records.length}"><img class="hero-slide-image" src="${e(imageURL(item.image))}" alt="${e(item.alt||item.title)}" ${i?'loading="lazy"':'fetchpriority="high"'}><div class="slide-copy"><p class="slide-kind">${e(item.kind)}</p><h2>${e(item.title)}</h2>${item.summary?`<p class="slide-summary">${e(item.summary)}</p>`:''}${item.date?`<p class="slide-date">${e(item.date)}</p>`:''}<a class="slide-link" href="${e(safeURL(item.url))}">${e(item.action||'자세히 보기')} ↗</a></div></article>`).join('');
 dots.innerHTML=records.map((item,i)=>`<button type="button" aria-label="${i+1}번 슬라이드: ${e(item.title)}" aria-pressed="false"></button>`).join('');
 [...dots.children].forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);schedule();}));
 [...slides.querySelectorAll('img')].forEach((image,i)=>{const key=records[i].key;image.addEventListener('load',()=>{if(image.closest('.hero-slide')?.classList.contains('is-active'))ready();},{once:true});if(image.complete&&image.naturalWidth>0)ready();image.addEventListener('error',()=>{const remaining=records.filter(item=>item.key!==key);if(remaining.length)setHeroSlides(remaining);else setHeroFailure();},{once:true});});
 controls.hidden=records.length<2;show(Math.max(0,records.findIndex(item=>item.key===previous)));schedule();
}
document.querySelector('#slide-previous').addEventListener('click',()=>{show((index-1+records.length)%records.length);schedule();});
document.querySelector('#slide-next').addEventListener('click',()=>{show((index+1)%records.length);schedule();});
function updatePause(){play.setAttribute('aria-pressed',String(paused));play.textContent=paused?'자동 넘김 켜기':'자동 넘김 멈추기';schedule();}
play.addEventListener('click',()=>{paused=!paused;updatePause();});
reduced.addEventListener('change',()=>{paused=reduced.matches;updatePause();});
root.addEventListener('mouseenter',()=>{hovered=true;schedule();});root.addEventListener('mouseleave',()=>{hovered=false;schedule();});
root.addEventListener('focusin',()=>{focused=true;schedule();});root.addEventListener('focusout',event=>{focused=root.contains(event.relatedTarget);schedule();});
root.addEventListener('keydown',event=>{if(records.length<2||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();show((index+(event.key==='ArrowRight'?1:-1)+records.length)%records.length);schedule();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(root);
document.addEventListener('visibilitychange',schedule);addEventListener('pagehide',stop);addEventListener('pageshow',schedule);updatePause();
