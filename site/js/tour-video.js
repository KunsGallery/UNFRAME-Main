import {entryView,playerBounds} from './virtual-links.js';
import {objectViewpoint} from './virtual-objects.js';
import {reelView} from './virtual-reel.js';
// The tour video: a landscape walk-through in the manner of a gallery introduction film.
// A tour is a list of scenes; each space becomes an "enter" scene, so a future multi-room hall
// only adds scenes. Staff-only tool, so the copy is Korean like the admin.
export const TOUR_MAX_WORKS=6;
const DURATION={logo:3,title:4,enter:5,statement:4,art:4,overview:4,outro:3,qr:5},TRANSITION=1.2;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,k)=>a.map((value,i)=>value+(b[i]-value)*k);
export const wallLabel=art=>art.kind==='object'?'바닥 오브제':{front:'정면 벽',left:'왼쪽 벽',right:'오른쪽 벽'}[art.wall]||'전시 벽';
export function tourScenes(works,{spaces=[{label:'전시장'}]}={}){
 const scenes=[{type:'logo'},{type:'title'}];
 for(const space of spaces)scenes.push({type:'enter',label:space.label});
 scenes.push({type:'statement'},...works.slice(0,TOUR_MAX_WORKS).map(work=>({type:'art',work,label:wallLabel(work)})),{type:'overview',label:'전시장 전경'},{type:'outro'},{type:'qr'});
 return scenes.map(scene=>({...scene,duration:DURATION[scene.type]}));
}
// Start/end times. With a beat ({bpm, phase} relative to the video start) every change after the
// opening moves to the nearest bar line, keeping each scene at least one bar long.
export function tourTimeline(scenes,beat=null){
 const bar=beat?240/beat.bpm:0,snap=t=>beat?beat.phase+Math.round((t-beat.phase)/bar)*bar:t;
 let target=0,start=0;const out=[];
 for(const scene of scenes){target+=scene.duration;let end=snap(target);if(beat)while(end<start+bar-1e-9)end+=bar;out.push({...scene,start,end});start=end;}
 return {scenes:out,total:start,transition:beat?Math.min(TRANSITION,bar/2):TRANSITION};
}
export function tourShot(time,line){
 const index=Math.max(0,line.scenes.findIndex(scene=>time<scene.end)),scene=time>=line.total?line.scenes.at(-1):line.scenes[index];
 return {scene,index:time>=line.total?line.scenes.length-1:index,progress:clamp((time-scene.start)/(scene.end-scene.start),0,1),start:scene.start,end:scene.end};
}
const forward=yaw=>[-Math.sin(yaw),0,-Math.cos(yaw)];
function inside(position,room){const b=playerBounds(room);return [clamp(position[0],b.minX,b.maxX),position[1],clamp(position[2],b.minZ,b.maxZ)];}
// The camera for one scene at its progress, or null for the black logo and QR cards.
function sceneView(shot,room,aspect){
 const {scene,progress:p}=shot,entry=entryView(room),f=forward(entry.yaw),eye=[entry.position[0],1.7,entry.position[1]];
 const ahead=(from,distance)=>[from[0]+f[0]*distance,1.65,from[2]+f[2]*distance];
 if(scene.type==='logo'||scene.type==='qr')return null;
 if(scene.type==='title'){const pos=[eye[0]+.3*p,1.7,eye[2]];return {position:pos,target:ahead(pos,6)};}
 if(scene.type==='enter'){const pos=inside(ahead(eye,3*ease(p)),room);pos[1]=1.7;return {position:pos,target:ahead(pos,6)};}
 if(scene.type==='statement'){const pos=inside(ahead(eye,3),room),a=(p-.5)*.6,yaw=entry.yaw+a;pos[1]=1.7;return {position:pos,target:[pos[0]-Math.sin(yaw)*6,1.6,pos[2]-Math.cos(yaw)*6]};}
 if(scene.type==='overview'){const pos=[0,1.75,0],a=Math.PI+p*1.6;return {position:pos,target:[Math.cos(a)*6,1.5,Math.sin(a)*6]};}
 if(scene.type==='outro'){const from=[0,1.75,0],pos=lerp(from,eye,ease(p));return {position:pos,target:ahead(pos,6)};}
 const art=scene.work;
 if(aspect<1)return reelView({type:'art',work:art,progress:p},room,'tour');
 const dolly=1.4-.4*ease(Math.min(1,p*1.3));
 if(art.kind==='object'){
  const view=objectViewpoint(art.placement),centre=view.lookAt,angle=(p-.5)*.5,dx=(view.position[0]-centre[0])*dolly,dz=(view.position[1]-centre[2])*dolly;
  return {position:inside([centre[0]+dx*Math.cos(angle)-dz*Math.sin(angle),1.55,centre[2]+dx*Math.sin(angle)+dz*Math.cos(angle)],room),target:centre};
 }
 // Landscape close-up: the work fills about 60% of the height or 70% of the width.
 const target=art.position,distance=Math.max(1.6,art.size[0]*.95,art.size[1]*1.8)*dolly,normal={front:[1,0],left:[0,1],right:[0,-1]}[art.wall]||[1,0];
 return {position:inside([target[0]+normal[0]*distance,target[1],target[2]+normal[1]*distance],room),target};
}
// Moves between 3D scenes ease over `transition` seconds instead of cutting.
export function tourCamera(time,line,room,aspect){
 const shot=tourShot(time,line),view=sceneView(shot,room,aspect),into=time-shot.start;
 if(!view||!shot.index||into>=line.transition)return {shot,view};
 const previous=line.scenes[shot.index-1],from=sceneView({scene:previous,progress:1},room,aspect);
 if(!from)return {shot,view};
 const k=ease(into/line.transition);return {shot,view:{position:lerp(from.position,view.position,k),target:lerp(from.target,view.target,k)}};
}
// Label chip (bottom left, as in the reference film) and QR placement for a w×h frame.
export function tourLayout(w,h){
 const portrait=h>w,unit=Math.min(w,h);
 return {portrait,unit,label:{x:w*.05,y:portrait?h*.62:h*.8,h:portrait?h*.06:h*.08},qr:portrait?{x:(w-unit*.55)/2,y:h*.2,size:unit*.55}:{x:w*.58,y:(h-unit*.5)/2,size:unit*.5}};
}
// ---- drawing (browser canvas) ----
const SERIF='"Noto Serif KR","EB Garamond",Georgia,serif',SANS='"Noto Sans KR",system-ui,sans-serif';
const fade=(shot,inTime=.5,outTime=.5)=>clamp(Math.min((shot.progress*(shot.end-shot.start))/inTime,((1-shot.progress)*(shot.end-shot.start))/outTime),0,1);
function chip(ctx,box,lines,s){
 ctx.font=`600 ${Math.round(22*s)}px ${SANS}`;const width=Math.max(...lines.map((line,i)=>{ctx.font=i?`400 ${Math.round(17*s)}px ${SANS}`:`600 ${Math.round(22*s)}px ${SANS}`;return ctx.measureText(line).width;}))+36*s,height=(18+lines.length*28)*s;
 ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.roundRect(box.x,box.y+box.h-height,width,height,8*s);ctx.fill();
 lines.forEach((line,i)=>{ctx.fillStyle=i?'#4a4a46':'#151413';ctx.font=i?`400 ${Math.round(17*s)}px ${SANS}`:`600 ${Math.round(22*s)}px ${SANS}`;ctx.fillText(line,box.x+18*s,box.y+box.h-height+(14+i*28)*s);});
}
function wordmark(ctx,w,h,s,alpha){
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`900 ${Math.round(96*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(-2*s)}px`;ctx.fillText('UNFRAME',w/2,h/2-14*s);
 ctx.font=`700 ${Math.round(16*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(6*s)}px`;ctx.fillText('ART WITHOUT A FRAME',w/2,h/2+48*s);ctx.restore();
}
// Draws the scene's text and cards over the frame. info: {title, artist, dates, statement, qr}.
export function tourOverlay(canvas,shot,info){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,box=tourLayout(w,h),s=box.unit/720,{scene,progress:p}=shot;
 ctx.textBaseline='top';ctx.textAlign='left';ctx.letterSpacing='0px';
 if(scene.type==='logo'){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);wordmark(ctx,w,h,s,fade(shot,.8,.6));return;}
 if(scene.type==='qr'){
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);const a=fade(shot,.6,.4);ctx.save();ctx.globalAlpha=a;
  const q=box.qr;if(info.qr){const n=info.qr.count,cell=q.size/(n+4);ctx.fillStyle='#fff';ctx.fillRect(q.x,q.y,q.size,q.size);ctx.fillStyle='#000';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(info.qr.dark(r,c))ctx.fillRect(Math.floor(q.x+(c+2)*cell),Math.floor(q.y+(r+2)*cell),Math.ceil(cell),Math.ceil(cell));}
  ctx.fillStyle='#fff';const tx=box.portrait?w*.08:w*.08,ty=box.portrait?q.y+q.size+40*s:h*.3,max=box.portrait?w*.84:q.x-w*.12;
  ctx.font=`500 ${Math.round(18*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(4*s)}px`;ctx.fillText('VIRTUAL GALLERY',tx,ty);ctx.letterSpacing='0px';
  ctx.font=`600 ${Math.round(44*s)}px ${SERIF}`;ctx.fillText(fit(ctx,info.title,max),tx,ty+36*s);
  ctx.font=`400 ${Math.round(22*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillText(fit(ctx,info.dates,max),tx,ty+100*s);
  ctx.fillStyle='#fff';ctx.font=`600 ${Math.round(24*s)}px ${SANS}`;ctx.fillText('QR로 버추얼 갤러리 바로가기',tx,ty+160*s);
  ctx.font=`500 ${Math.round(22*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillText('@unframe.kr',tx,ty+200*s);ctx.restore();return;
 }
 if(scene.type==='title'||scene.type==='statement'){ctx.fillStyle=`rgba(0,0,0,${.6*fade(shot,.4,.4)})`;ctx.fillRect(0,0,w,h);}
 if(scene.type==='title'){
  // Four words in turn, each sliding in from the right and fading.
  const words=['Introducing','Virtual Gallery',info.title,info.artist].filter(Boolean),slot=1/words.length,i=Math.min(words.length-1,Math.floor(p/slot)),local=(p-i*slot)/slot;
  const a=clamp(Math.min(local/.25,(1-local)/.2),0,1);ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=i<2?`500 ${Math.round(56*s)}px ${SANS}`:`600 ${Math.round(72*s)}px ${SERIF}`;ctx.fillText(fit(ctx,words[i],w*.86),w/2+(1-ease(Math.min(1,local/.35)))*60*s,h/2);ctx.restore();return;
 }
 if(scene.type==='statement'){
  // The statement crosses the frame in large type, two lines at different speeds.
  const text=(info.statement||info.title||'').replace(/\s+/g,' ').trim(),size=Math.round((box.portrait?.06:.14)*h);if(!text)return;
  const half=Math.ceil(text.length/2),first=text.slice(0,text.indexOf(' ',half)>0?text.indexOf(' ',half):half),second=text.slice(first.length).trim()||first;
  ctx.save();ctx.globalAlpha=fade(shot,.4,.4);ctx.fillStyle='#fff';ctx.font=`600 ${size}px ${SANS}`;
  const w1=ctx.measureText(first).width,w2=ctx.measureText(second).width;
  ctx.fillText(first,w*.9-(w1)*p*.8-w*.2*p,h*.5-size*1.15);ctx.fillText(second,w*.1-w2*.15+(w*.25)*p-w2*p*.2,h*.5+size*.05);ctx.restore();return;
 }
 if(scene.type==='outro'){ctx.fillStyle=`rgba(0,0,0,${ease(p)})`;ctx.fillRect(0,0,w,h);wordmark(ctx,w,h,s,clamp((p-.5)/.3,0,1));return;}
 // enter, art and overview carry a label chip.
 ctx.save();ctx.globalAlpha=fade(shot,.5,.4);
 if(scene.type==='art'){const art=scene.work;chip(ctx,box.label,[art.title||'',[scene.label,art.artist,art.year].filter(Boolean).join(' · ')],s);}
 else chip(ctx,box.label,[scene.label],s);
 ctx.restore();
}
function fit(ctx,text,max){let out=String(text||'');if(ctx.measureText(out).width<=max)return out;while(out&&ctx.measureText(out+'…').width>max)out=out.slice(0,-1);return out+'…';}
// QR code for the gallery address, from qrcode-generator (MIT), loaded only for tour videos.
let qrLibrary;
export async function qrFor(text){
 qrLibrary??=new Promise((resolve,reject)=>{if(window.qrcode)return resolve(window.qrcode);const tag=document.createElement('script');tag.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';tag.onload=()=>resolve(window.qrcode);tag.onerror=()=>reject(new Error('QR 코드를 만들지 못했습니다.'));document.head.append(tag);});
 const qrcode=await qrLibrary,code=qrcode(0,'M');code.addData(text);code.make();
 return {count:code.getModuleCount(),dark:(r,c)=>code.isDark(r,c)};
}
