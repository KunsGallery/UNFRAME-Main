const grid=document.querySelector('.home-project-grid');
if(grid){
 const cards=[...grid.querySelectorAll('.home-project-card')],reduce=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(hover: none)');
 const card=grid.querySelector('.hp-uau'),canvas=card.querySelector('canvas'),context=canvas.getContext('2d');
 let width=1,height=1,frame=0,last=0,target={x:.5,y:.5};
 const particles=Array.from({length:48},(_,i)=>{const angle=i*2.39996323,radius=Math.sqrt((i+.5)/48)*.48;return {ox:.5+Math.cos(angle)*radius,oy:.5+Math.sin(angle)*radius,x:0,y:0,size:1.2+i%3*.45};});
 const moving=()=>!reduce.matches&&!document.hidden&&card.classList.contains('is-visible')&&card.classList.contains('is-engaged');
 function draw(time=0){
  if(!context)return;const dt=last?Math.min((time-last)/1000,.05):0;last=time;context.clearRect(0,0,width,height);
  for(const particle of particles){const attraction=moving()?.68:0,tx=particle.ox*width*(1-attraction)+target.x*width*attraction+Math.sin(time*.0015+particle.ox*12)*attraction*2,ty=particle.oy*height*(1-attraction)+target.y*height*attraction+Math.cos(time*.0012+particle.oy*10)*attraction*2;const ease=dt?Math.min(1,dt*6):moving()?.08:1;particle.x+=(tx-particle.x)*ease;particle.y+=(ty-particle.y)*ease;}
  context.strokeStyle='rgba(0,74,173,.18)';context.lineWidth=.7;
  for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const a=particles[i],b=particles[j];if(Math.hypot(a.x-b.x,a.y-b.y)<34){context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();}}
  context.fillStyle='#004aad';for(const particle of particles){context.beginPath();context.arc(particle.x,particle.y,particle.size,0,Math.PI*2);context.fill();}
  if(moving())frame=requestAnimationFrame(draw);else frame=0;
 }
 function resize(){if(!context)return;cancelAnimationFrame(frame);frame=0;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=rect.width||240;height=rect.height||230;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);for(const particle of particles){particle.x=particle.ox*width;particle.y=particle.oy*height;}last=0;draw();}
 function sync(){grid.dataset.motion=document.hidden||reduce.matches?'paused':'ready';if(!moving()){cancelAnimationFrame(frame);frame=0;last=0;draw();}else if(!frame){last=0;frame=requestAnimationFrame(draw);}}
 for(const item of cards){
  const update=()=>{item.classList.toggle('is-engaged',item.matches(':hover')||item.contains(document.activeElement)||coarse.matches);sync();};
  item.addEventListener('pointerenter',update);item.addEventListener('pointerleave',()=>{if(item===card){target={x:.5,y:.5};}update();});item.addEventListener('focusin',update);item.addEventListener('focusout',()=>requestAnimationFrame(update));
 }
 card.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const rect=canvas.getBoundingClientRect();target={x:Math.max(.08,Math.min(.92,(event.clientX-rect.left)/rect.width)),y:Math.max(.08,Math.min(.92,(event.clientY-rect.top)/rect.height))};});
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('is-visible',entry.isIntersecting);entry.target.classList.toggle('is-engaged',entry.target.matches(':hover')||entry.target.contains(document.activeElement)||coarse.matches);}sync();},{threshold:.12});cards.forEach(item=>observer.observe(item));
 if(context){card.classList.add('hp-particle-ready');new ResizeObserver(resize).observe(canvas);resize();}
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);coarse.addEventListener('change',()=>{cards.forEach(item=>item.classList.toggle('is-engaged',item.matches(':hover')||item.contains(document.activeElement)||coarse.matches));sync();});
 window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));window.addEventListener('pageshow',()=>{frame=0;sync();});
 sync();
}
