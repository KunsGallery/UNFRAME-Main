import {entryView,playerBounds} from './virtual-links.js';
import {objectViewpoint} from './virtual-objects.js';
// The tour video: a landscape walk-through in the manner of a gallery introduction film.
// A tour is a list of scenes; each space becomes an "enter" scene, so a future multi-room hall
// only adds scenes. Staff-only tool, so the copy is Korean like the admin.
export const TOUR_MAX_WORKS=6;
const DURATION={logo:3,title:4,enter:5,wall:3,art:4,overview:4,outro:3,qr:5},TRANSITION=1.2,FOV=50;
// Close-up camera moves, used in turn so neighbouring works are filmed differently.
export const SHOTS=['push','dollyZoom','truck','orbit','rise'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,k)=>a.map((value,i)=>value+(b[i]-value)*k);
export const wallLabel=art=>art.kind==='object'?'바닥 오브제':{front:'정면 벽',left:'왼쪽 벽',right:'오른쪽 벽'}[art.wall]||'전시 벽';
const wallKey=art=>art.kind==='object'?'floor':art.wall||'front';
// Works are grouped by wall (in the order their walls first appear, selection order within a
// wall); each wall opens with a wide shot of the whole wall.
export function tourScenes(works,{spaces=[{label:'전시장'}]}={}){
 const chosen=works.slice(0,TOUR_MAX_WORKS),groups=[];
 for(const work of chosen){const key=wallKey(work);let group=groups.find(g=>g.key===key);if(!group)groups.push(group={key,works:[]});group.works.push(work);}
 const scenes=[{type:'logo'},{type:'title'}];
 for(const space of spaces)scenes.push({type:'enter',label:space.label});
 let number=0;
 for(const group of groups){
  scenes.push({type:'wall',label:wallLabel(group.works[0]),works:group.works});
  for(const work of group.works){scenes.push({type:'art',work,label:wallLabel(work),shot:SHOTS[number%SHOTS.length],number:number+1,count:chosen.length});number++;}
 }
 scenes.push({type:'overview',label:'전시장 전경'},{type:'outro'},{type:'qr'});
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
 return {scene,index:time>=line.total?line.scenes.length-1:index,progress:clamp((time-scene.start)/(scene.end-scene.start),0,1),start:scene.start,end:scene.end,time:clamp(time,0,line.total),total:line.total};
}
const forward=yaw=>[-Math.sin(yaw),0,-Math.cos(yaw)];
function inside(position,room){const b=playerBounds(room);return [clamp(position[0],b.minX,b.maxX),position[1],clamp(position[2],b.minZ,b.maxZ)];}
const NORMAL={front:[1,0],left:[0,-1],right:[0,1]},TAN=Math.tan(FOV*Math.PI/360);
// Where a work is filmed from: its centre, the horizontal direction out of it, and the distance
// at which the work dominates the frame: about 80% of its height or 86% of its width.
function framing(art,aspect){
 const fill=(height,width,min)=>Math.max(min,height/(.8*2*TAN),width/(.86*2*TAN*aspect));
 if(art.kind==='object'){
  const view=objectViewpoint(art.placement),centre=view.lookAt,dx=view.position[0]-centre[0],dz=view.position[1]-centre[2],d=Math.hypot(dx,dz)||1,a=art.placement.art||{};
  return {centre,normal:[dx/d,dz/d],distance:fill((a.heightCm||100)/100,Math.max(art.placement.span||0,(a.widthCm||100)/100),1.2)};
 }
 return {centre:art.position,normal:NORMAL[art.wall]||NORMAL.front,distance:fill(art.size[1],art.size[0],.9)};
}
// The close-up moves. Each settles square on the work, centred, and holds for the last 15%.
function artView(scene,p,room,aspect){
 const {centre:c,normal:n,distance:d}=framing(scene.work,aspect),e=ease(Math.min(1,p/.85)),side=[-n[1],n[0]];
 // `offset` is along `side`, which is screen-left when facing the work.
 const at=(dist,offset=0,height=c[1],angle=0)=>{const ca=Math.cos(angle),sa=Math.sin(angle),nx=n[0]*ca-n[1]*sa,nz=n[0]*sa+n[1]*ca;return inside([c[0]+nx*dist+side[0]*offset,height,c[2]+nz*dist+side[1]*offset],room);};
 if(scene.shot==='dollyZoom'){
  // The camera backs away while the lens narrows, so the work keeps its size and the room stretches behind it.
  const position=at(d*(.7+.8*e)),real=Math.hypot(position[0]-c[0],position[2]-c[2])||d;
  return {position,target:c,fov:2*Math.atan(TAN*d/real)*180/Math.PI};
 }
 if(scene.shot==='truck'){const offset=(1-e)*d*.7;return {position:at(d*1.05,offset),target:[c[0]+side[0]*offset*.6,c[1],c[2]+side[1]*offset*.6],fov:FOV};}
 if(scene.shot==='orbit')return {position:at(d*(1.15-.15*e),0,c[1],(1-e)*.7),target:c,fov:FOV};
 if(scene.shot==='rise')return {position:at(d*(1.1-.1*e),0,Math.max(.6,c[1]-1.1)+(c[1]-Math.max(.6,c[1]-1.1))*e),target:c,fov:FOV};
 return {position:at(d*(1.55-.55*e)),target:c,fov:FOV};
}
// A wall's wide shot from the far side of the room, drifting left to right; floor objects get a slow arc.
function wallView(scene,p,room){
 const works=scene.works,e=ease(p);
 if(works[0].kind==='object'){
  const points=works.map(art=>objectViewpoint(art.placement).lookAt),c=[0,1,2].map(i=>points.reduce((sum,point)=>sum+point[i],0)/points.length);
  const a=Math.atan2(-c[2],-c[0])+(p-.5)*.9;return {position:inside([c[0]+Math.cos(a)*3.5,2.2,c[2]+Math.sin(a)*3.5],room),target:c,fov:FOV};
 }
 const n=NORMAL[works[0].wall]||NORMAL.front,side=[-n[1],n[0]],c=[0,1,2].map(i=>works.reduce((sum,art)=>sum+art.position[i],0)/works.length),far=Math.abs(n[0])?room.w:room.d,offset=(.5-e)*1.6;
 return {position:inside([c[0]+n[0]*far+side[0]*offset,1.65,c[2]+n[1]*far+side[1]*offset],room),target:[c[0]+side[0]*offset*.4,c[1],c[2]+side[1]*offset*.4],fov:FOV};
}
// The camera for one scene at its progress, or null for the black logo and QR cards.
// The entrance: from the corner where the back glass wall meets the left wall, looking diagonally
// across the room with the outdoors on the right, then walking in while turning to face the front wall.
function entranceView(p,room){
 const b=playerBounds(room),start=[b.maxX,1.7,b.maxZ],end=[b.maxX-3.2,1.65,b.maxZ*.25],k=ease(p),turn=ease(clamp((p-.2)/.8,0,1));
 // Headings turn clockwise (decreasing angle) from nearly along the glass to straight at the front wall.
 const position=lerp(start,end,k),from=Math.atan2(-1,-.35),to=-Math.PI,a=from+(to-from)*turn;
 return {position,target:[position[0]+Math.cos(a)*6,1.6,position[2]+Math.sin(a)*6]};
}
function sceneView(shot,room,aspect){
 const {scene,progress:p}=shot,entry=entryView(room),f=forward(entry.yaw),eye=[entry.position[0],1.7,entry.position[1]];
 const ahead=(from,distance)=>[from[0]+f[0]*distance,1.65,from[2]+f[2]*distance];
 if(scene.type==='logo'||scene.type==='qr')return null;
 if(scene.type==='title'){const view=entranceView(0,room);return {position:[view.position[0],view.position[1],view.position[2]-.3*(1-p)],target:view.target};}
 if(scene.type==='enter')return entranceView(p,room);
 if(scene.type==='wall')return wallView(scene,p,room);
 // A crane shot: rising from the middle of the room while turning to look around it.
 if(scene.type==='overview'){const e=ease(p),a=Math.PI+p*1.4,pos=[0,1.3+1.6*e,0];return {position:pos,target:[Math.cos(a)*6,1.3,Math.sin(a)*6]};}
 if(scene.type==='outro'){const from=[0,1.75,0],pos=lerp(from,eye,ease(p));return {position:pos,target:ahead(pos,6)};}
 return artView(scene,p,room,aspect);
}
// Moves between 3D scenes ease over `transition` seconds instead of cutting. Every view carries its lens (fov).
export function tourCamera(time,line,room,aspect){
 const shot=tourShot(time,line),raw=sceneView(shot,room,aspect),view=raw&&{fov:FOV,...raw},into=time-shot.start;
 if(!view||!shot.index||into>=line.transition)return {shot,view};
 const previous=line.scenes[shot.index-1],from=sceneView({scene:previous,progress:1},room,aspect);
 if(!from)return {shot,view};
 const k=ease(into/line.transition);return {shot,view:{position:lerp(from.position,view.position,k),target:lerp(from.target,view.target,k),fov:(from.fov??FOV)+(view.fov-(from.fov??FOV))*k}};
}
// Top bar, lower-third caption block and QR placement for a w×h frame.
export function tourLayout(w,h){
 const portrait=h>w,unit=Math.min(w,h);
 return {portrait,unit,top:{x:w*.05,y:portrait?h*.045:h*.06,w:w*.9},
  label:portrait?{x:w*.07,y:h*.64,w:w*.86,h:h*.14}:{x:w*.05,y:h*.72,w:w*.9,h:h*.17},
  qr:portrait?{x:(w-unit*.55)/2,y:h*.2,size:unit*.55}:{x:w*.58,y:(h-unit*.5)/2,size:unit*.5}};
}
// ---- drawing (browser canvas) ----
const SERIF='"Noto Serif KR","EB Garamond",Georgia,serif',SANS='"Noto Sans KR",system-ui,sans-serif';
const fade=(shot,inTime=.5,outTime=.5)=>clamp(Math.min((shot.progress*(shot.end-shot.start))/inTime,((1-shot.progress)*(shot.end-shot.start))/outTime),0,1);
const pad=n=>String(n).padStart(2,'0');
function wordmark(ctx,w,h,s,alpha){
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`900 ${Math.round(96*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(-2*s)}px`;ctx.fillText('UNFRAME',w/2,h/2-14*s);
 ctx.font=`700 ${Math.round(16*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(6*s)}px`;ctx.fillText('ART WITHOUT A FRAME',w/2,h/2+48*s);ctx.restore();
}
// Shades the top and bottom, then the brand and exhibition title above and a progress line below.
function chrome(ctx,w,h,box,s,shot,info,alpha){
 if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;
 let g=ctx.createLinearGradient(0,0,0,h*.22);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h*.22);
 g=ctx.createLinearGradient(0,h*.55,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.7)');ctx.fillStyle=g;ctx.fillRect(0,h*.55,w,h*.45);
 const t=box.top;ctx.fillStyle='rgba(255,255,255,.92)';ctx.textBaseline='top';
 ctx.font=`700 ${Math.round(15*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(4*s)}px`;
 if(box.portrait){ctx.textAlign='center';ctx.fillText('UNFRAME · VIRTUAL GALLERY',w/2,t.y);ctx.letterSpacing='0px';ctx.font=`500 ${Math.round(22*s)}px ${SERIF}`;ctx.fillText(fit(ctx,info.title,t.w),w/2,t.y+28*s);}
 else{ctx.textAlign='left';ctx.fillText('UNFRAME · VIRTUAL GALLERY',t.x,t.y);ctx.letterSpacing='0px';ctx.textAlign='right';ctx.font=`500 ${Math.round(20*s)}px ${SERIF}`;ctx.fillText(fit(ctx,info.title,t.w*.5),t.x+t.w,t.y-3*s);}
 const y=h-(box.portrait?h*.05:h*.045);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(t.x,y,t.w,Math.max(1,2*s));
 ctx.fillStyle='#fff';ctx.fillRect(t.x,y,t.w*clamp(shot.time/shot.total,0,1),Math.max(1,2*s));ctx.restore();
}
// The caption block: an accent line draws in, then a small kicker, a large serif title rising out of
// a mask and a detail line; an optional "02 / 06" counter sits on the right.
function lowerThird(ctx,box,s,shot,{kicker,title,sub,counter}){
 const into=shot.progress*(shot.end-shot.start),left=(1-shot.progress)*(shot.end-shot.start),out=clamp(left/.35,0,1);
 const step=(from,length)=>ease(clamp((into-from)/length,0,1)),b=box.label,size=Math.round((box.portrait?44:54)*s);
 ctx.save();ctx.globalAlpha=out;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';
 ctx.fillRect(b.x,b.y,56*s*step(.25,.5),3*s);
 ctx.globalAlpha=out*step(.4,.4);ctx.font=`700 ${Math.round(15*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(4*s)}px`;ctx.fillText(kicker,b.x+(1-step(.4,.4))*-20*s,b.y+16*s);ctx.letterSpacing='0px';
 const rise=step(.5,.6),titleY=b.y+44*s;ctx.globalAlpha=out;ctx.save();ctx.beginPath();ctx.rect(b.x-4*s,titleY-4*s,b.w,size*1.3);ctx.clip();
 ctx.font=`600 ${size}px ${SERIF}`;ctx.fillText(fit(ctx,title,b.w*(counter&&!box.portrait?.78:1)),b.x,titleY+(1-rise)*size*1.3);ctx.restore();
 if(sub){ctx.globalAlpha=out*step(.8,.5);ctx.font=`400 ${Math.round(21*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillText(fit(ctx,sub,b.w*.8),b.x,titleY+size*1.25);}
 if(counter){
  // Beside the title in landscape; in portrait it moves up to the kicker line so the title keeps the width.
  const y=box.portrait?b.y+4*s:titleY+size*.35;ctx.globalAlpha=out*step(.5,.6);ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,.6)';ctx.font=`500 ${Math.round(22*s)}px ${SANS}`;const total=` / ${pad(counter[1])}`;ctx.fillText(total,b.x+b.w,y+10*s);
  const totalWidth=ctx.measureText(total).width;ctx.fillStyle='#fff';ctx.font=`700 ${Math.round(34*s)}px ${SANS}`;ctx.fillText(pad(counter[0]),b.x+b.w-totalWidth,y);
 }
 ctx.restore();
}
// One kinetic word: breaks onto two lines at the middle space when too wide, then shrinks to fit.
function wordLines(ctx,word,face,base,max){
 ctx.font=`600 ${base}px ${face}`;let lines=[word];
 if(ctx.measureText(word).width>max&&word.includes(' ')){const spaces=[...word.matchAll(/ /g)].map(m=>m.index),cut=spaces.reduce((a,b)=>Math.abs(b-word.length/2)<Math.abs(a-word.length/2)?b:a);lines=[word.slice(0,cut),word.slice(cut+1)];}
 const wide=Math.max(...lines.map(line=>ctx.measureText(line).width)),size=wide>max?Math.max(Math.round(base*.43),Math.floor(base*max/wide)):base;
 return {lines:lines.map(line=>{ctx.font=`600 ${size}px ${face}`;return fit(ctx,line,max);}),size};
}
// The four title words each enter differently: letters rising, a wipe, tracking in, and a blur-focus.
function kinetic(ctx,w,h,s,effect,word,face,base,local){
 const {lines,size}=wordLines(ctx,word,face,base,w*.86),inn=ease(clamp(local/.4,0,1)),out=clamp((1-local)/.18,0,1),cx=w/2;
 ctx.save();ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.font=`600 ${size}px ${face}`;
 lines.forEach((line,k)=>{
  const y=h/2+(k-(lines.length-1)/2)*size*1.2,width=ctx.measureText(line).width;
  if(effect===0){let x=cx-width/2;ctx.textAlign='left';[...line].forEach((ch,j)=>{const e=ease(clamp((local-j*.03)/.3,0,1));ctx.globalAlpha=e*out;ctx.fillText(ch,x,y+(1-e)*size*.5);x+=ctx.measureText(ch).width;});return;}
  ctx.textAlign='center';
  if(effect===1){
   const edge=cx-width/2-10*s+(width+20*s)*inn;ctx.globalAlpha=out;ctx.save();ctx.beginPath();ctx.rect(0,y-size,edge,size*2);ctx.clip();ctx.fillText(line,cx,y);ctx.restore();
   if(inn<1){ctx.globalAlpha=out*(1-inn);ctx.fillRect(edge,y-size*.6,4*s,size*1.2);}return;
  }
  if(effect===2){ctx.globalAlpha=inn*out;ctx.letterSpacing=`${(1-inn)*size*.4}px`;ctx.fillText(line,cx,y);ctx.letterSpacing='0px';return;}
  ctx.globalAlpha=inn*out;ctx.filter=`blur(${((1-inn)*10*s).toFixed(1)}px)`;ctx.save();ctx.translate(cx,y);const k2=1.3-.3*inn;ctx.scale(k2,k2);ctx.fillText(line,0,0);ctx.restore();ctx.filter='none';
 });
 ctx.restore();
}
// Draws the scene's text and cards over the frame. info: {title, artist, dates, qr}.
export function tourOverlay(canvas,shot,info){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,box=tourLayout(w,h),s=box.unit/720,{scene,progress:p}=shot;
 ctx.textBaseline='top';ctx.textAlign='left';ctx.letterSpacing='0px';
 if(scene.type==='logo'){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);wordmark(ctx,w,h,s,fade(shot,.8,.6));return;}
 if(scene.type==='qr'){
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);const a=fade(shot,.6,.4);ctx.save();ctx.globalAlpha=a;
  const q=box.qr;if(info.qr){const n=info.qr.count,cell=q.size/(n+4);ctx.fillStyle='#fff';ctx.fillRect(q.x,q.y,q.size,q.size);ctx.fillStyle='#000';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(info.qr.dark(r,c))ctx.fillRect(Math.floor(q.x+(c+2)*cell),Math.floor(q.y+(r+2)*cell),Math.ceil(cell),Math.ceil(cell));}
  ctx.fillStyle='#fff';const tx=w*.08,ty=box.portrait?q.y+q.size+40*s:h*.3,max=box.portrait?w*.84:q.x-w*.12;
  ctx.font=`500 ${Math.round(18*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(4*s)}px`;ctx.fillText('VIRTUAL GALLERY',tx,ty);ctx.letterSpacing='0px';
  ctx.font=`600 ${Math.round(44*s)}px ${SERIF}`;ctx.fillText(fit(ctx,info.title,max),tx,ty+36*s);
  ctx.font=`400 ${Math.round(22*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillText(fit(ctx,info.dates,max),tx,ty+100*s);
  ctx.fillStyle='#fff';ctx.font=`600 ${Math.round(24*s)}px ${SANS}`;ctx.fillText('QR로 버추얼 갤러리 바로가기',tx,ty+160*s);
  ctx.font=`500 ${Math.round(22*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillText('@unframe.kr',tx,ty+200*s);ctx.restore();return;
 }
 if(scene.type==='title'){ctx.fillStyle=`rgba(0,0,0,${.6*fade(shot,.4,.4)})`;ctx.fillRect(0,0,w,h);}
 if(scene.type==='title'){
  const words=['Introducing','Virtual Gallery',info.title,info.artist].filter(Boolean),slot=1/words.length,i=Math.min(words.length-1,Math.floor(p/slot));
  kinetic(ctx,w,h,s,i,String(words[i]),i<2?SANS:SERIF,Math.round((i<2?92:100)*s),(p-i*slot)/slot);return;
 }
 if(scene.type==='outro'){chrome(ctx,w,h,box,s,shot,info,1-ease(Math.min(1,p*2)));ctx.fillStyle=`rgba(0,0,0,${ease(p)})`;ctx.fillRect(0,0,w,h);wordmark(ctx,w,h,s,clamp((p-.5)/.3,0,1));return;}
 chrome(ctx,w,h,box,s,shot,info,1);
 if(scene.type==='art'){const art=scene.work;lowerThird(ctx,box,s,shot,{kicker:`WORK ${pad(scene.number||1)}`,title:art.title||'제목 없음',sub:[art.artist,art.year,scene.label].filter(Boolean).join(' · '),counter:[scene.number||1,scene.count||1]});return;}
 if(scene.type==='wall'){lowerThird(ctx,box,s,shot,{kicker:'WALL',title:scene.label,sub:`작품 ${scene.works.length}점`});return;}
 if(scene.type==='overview'){lowerThird(ctx,box,s,shot,{kicker:'OVERVIEW',title:scene.label,sub:info.dates||info.title});return;}
 lowerThird(ctx,box,s,shot,{kicker:'ENTER',title:scene.label,sub:info.title});
}
function fit(ctx,text,max){let out=String(text||'');if(ctx.measureText(out).width<=max)return out;while(out&&ctx.measureText(out+'…').width>max)out=out.slice(0,-1);return out+'…';}
// QR code for the gallery address, from qrcode-generator (MIT), loaded only for tour videos.
let qrLibrary;
export async function qrFor(text){
 qrLibrary??=new Promise((resolve,reject)=>{if(window.qrcode)return resolve(window.qrcode);const tag=document.createElement('script');tag.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';tag.onload=()=>resolve(window.qrcode);tag.onerror=()=>reject(new Error('QR 코드를 만들지 못했습니다.'));document.head.append(tag);});
 const qrcode=await qrLibrary,code=qrcode(0,'M');code.addData(text);code.make();
 return {count:code.getModuleCount(),dark:(r,c)=>code.isDark(r,c)};
}
