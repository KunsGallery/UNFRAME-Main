// Viewing chrome for the virtual room: device-aware hints, a single menu, and controls that
// fade while the visitor is looking at the art and return on any movement.
export const inputHint=touch=>touch?'손가락으로 드래그해 둘러보고, 화살표 버튼으로 이동합니다.<br>작품을 누르면 가까이 감상할 수 있습니다.':'드래그로 둘러보기 · WASD 또는 화살표로 이동<br>작품을 누르면 가까이 감상할 수 있습니다.';
export function mountHud({idleMs=4000}={}){
 const body=document.body,touch=matchMedia('(pointer:coarse)').matches;
 const hint=document.querySelector('.keyboard-hint');if(hint)hint.innerHTML=inputHint(touch);
 const panel=document.querySelector('.top-right-panel'),menu=document.getElementById('btn-menu');
 const setOpen=open=>{panel.classList.toggle('menu-open',open);menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'닫기':'메뉴';};
 menu.addEventListener('click',()=>setOpen(!panel.classList.contains('menu-open')));
 panel.addEventListener('click',event=>{if(event.target.closest('.glass-btn')&&event.target!==menu)setOpen(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('menu-open'))setOpen(false);});
 let timer;
 const wake=()=>{body.classList.remove('hud-idle');clearTimeout(timer);timer=setTimeout(()=>{if(body.classList.contains('hud-entered')&&!panel.classList.contains('menu-open'))body.classList.add('hud-idle');},idleMs);};
 for(const type of ['pointermove','pointerdown','keydown','touchstart','wheel'])addEventListener(type,wake,{passive:true});
 document.getElementById('enter-gallery-btn').addEventListener('click',()=>{body.classList.add('hud-entered');wake();});
 document.getElementById('btn-help').addEventListener('click',()=>body.classList.remove('hud-entered'));
 return {wake,setOpen};
}
