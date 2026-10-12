const frames=[...document.querySelectorAll('.study-frame')],reduced=matchMedia('(prefers-reduced-motion: reduce)'),button=document.querySelector('#motion-toggle');let active=frames[0],paused=reduced.matches,raf=0,last=0;const pointer={x:.5,y:.5,inside:false};
const canvases=[...document.querySelectorAll('canvas')].map(canvas=>({canvas,ctx:canvas.getContext('2d'),w:0,h:0}));
function resize(){for(const item of canvases){const rect=item.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5);if(item.points&&item.w&&item.h)for(const point of item.points){point.x*=rect.width/item.w;point.y*=rect.height/item.h;}item.w=rect.width;item.h=rect.height;item.canvas.width=Math.round(rect.width*ratio);item.canvas.height=Math.round(rect.height*ratio);item.ctx?.setTransform(ratio,0,0,ratio,0,0);}render(performance.now());}
function wave(item,time){const {ctx,w,h}=item;if(!ctx)return;ctx.clearRect(0,0,w,h);const t=time/2200;for(let row=0;row<27;row++){const depth=(row+1)/27,scale=depth*depth;for(let col=0;col<45;col++){const x=w/2+(col-22)*w/25*scale;const height=Math.sin(col*.23+t-row*.3)*18+Math.cos(col*.12-t*.7)*12;const y=h*.47+scale*h*.59+height*(.3+scale);ctx.fillStyle=`rgba(215,236,255,${.12+scale*.65})`;ctx.beginPath();ctx.arc(x,y,.4+scale*1.7,0,Math.PI*2);ctx.fill();}}}
function particles(item,time){
 const {ctx,w,h}=item;if(!ctx)return;
 if(!item.points){const count=w<650?65:115;item.points=Array.from({length:count},(_,i)=>({x:((i*0.61803398875+.17)%1)*w,y:((i*0.41421356237+.23)%1)*h,speed:12+(i%13),phase:i*.73}));}
 const dt=paused||document.hidden?0:Math.min(Math.max((time-(item.particleTime||time))/1000,0),.05);item.particleTime=time;
 const points=item.points,range=Math.min(185,w*.27),mouse={x:pointer.x*w,y:pointer.y*h};ctx.clearRect(0,0,w,h);
 for(const point of points){point.y+=point.speed*dt;point.x+=Math.sin(time/9000+point.phase)*dt*5;if(point.y>h+3){point.y=-3;point.x=(point.x+w*.381966)%w;}point.x=(point.x+w)%w;}
 for(let i=0;i<points.length;i++){const point=points[i];
  for(let j=i+1;j<points.length;j++){const other=points[j],distance=Math.hypot(point.x-other.x,point.y-other.y);if(distance<range){ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(other.x,other.y);ctx.strokeStyle=`rgba(210,222,238,${(1-distance/range)*.22})`;ctx.lineWidth=.65;ctx.stroke();}}
  const distance=pointer.inside?Math.hypot(point.x-mouse.x,point.y-mouse.y):Infinity,near=distance<180;
  if(near){ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle=`rgba(108,168,255,${(1-distance/180)*.5})`;ctx.lineWidth=.8;ctx.stroke();}
  ctx.beginPath();ctx.arc(point.x,point.y,near?2.4:1.6,0,Math.PI*2);ctx.fillStyle=near?'#83b8ff':'rgba(232,241,255,.7)';ctx.fill();
 }
}
function render(time){const item=canvases.find(item=>active.contains(item.canvas));if(item)(active.id==='up'?wave:particles)(item,time);}
function tick(time){if(time-last>32){render(time);last=time;}raf=requestAnimationFrame(tick);}
function sync(){cancelAnimationFrame(raf);document.body.classList.toggle('motion-paused',paused||document.hidden);button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'움직임 켜기':'움직임 멈추기';render(performance.now());if(!paused&&!document.hidden&&canvases.some(item=>active.contains(item.canvas)))raf=requestAnimationFrame(tick);}
function select(frame){active=frame;frame.classList.add('is-active');frames.filter(f=>f!==frame).forEach(f=>f.classList.remove('is-active'));for(const name of ['--frame-ink','--frame-muted','--frame-rule'])document.body.style.setProperty(name,getComputedStyle(frame).getPropertyValue(name)||'#ffffff55');document.querySelectorAll('.study-header nav a').forEach(a=>{if(a.hash==='#'+frame.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});document.querySelector('#position-name').textContent=frame.querySelector('.project-name,h1').firstChild.textContent;document.querySelectorAll('#position-dots i').forEach((dot,i)=>dot.classList.toggle('selected',frames[i]===frame));sync();}
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>.5)select(entry.target);},{threshold:[.5,.65]});frames.forEach(frame=>observer.observe(frame));
button.onclick=()=>{paused=!paused;sync();};document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});addEventListener('pointermove',event=>{pointer.x=event.clientX/innerWidth;pointer.y=event.clientY/innerHeight;pointer.inside=true;},{passive:true});addEventListener('resize',resize);resize();select(active);addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();},{once:true});

addEventListener('pageshow',event=>{if(event.persisted){frames.forEach(frame=>observer.observe(frame));resize();const closest=frames.reduce((a,b)=>Math.abs(a.getBoundingClientRect().top)<Math.abs(b.getBoundingClientRect().top)?a:b);select(closest);}});

document.addEventListener('pointerleave',()=>{pointer.inside=false;});addEventListener('pointerup',event=>{if(event.pointerType==='touch')pointer.inside=false;});
