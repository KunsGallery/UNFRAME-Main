import {chrome} from './ui.js';
chrome(false,true);
document.querySelector('.menu-links a[href="/about"]')?.setAttribute('aria-current','page');
const section=document.querySelector('#identity-section');
const button=document.querySelector('#identity-motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,timer=0,visible=false;
section.classList.add('motion-ready');
function cancel(){clearTimeout(timer);timer=0;}
function update(){cancel();section.classList.toggle('identity-open',paused);button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'움직임 켜기':'움직임 멈추기';if(visible&&!paused)timer=setTimeout(()=>section.classList.add('identity-open'),700);}
button.addEventListener('click',()=>{paused=!paused;update();});
reduced.addEventListener('change',()=>{paused=reduced.matches;update();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();},{threshold:.2}).observe(section);
new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting)),{threshold:.2}).observe(document.querySelector('.space-height'));
const spaceObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting)),{threshold:.2});
document.querySelectorAll('.space-sound,.space-depth').forEach(item=>spaceObserver.observe(item));
addEventListener('pagehide',cancel);addEventListener('pageshow',update);update();
