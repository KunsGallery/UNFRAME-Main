import {entryView,playerBounds} from './virtual-links.js';
import {objectViewpoint} from './virtual-objects.js';
import {escapeHTML as e} from './model.js';
import {DEFAULT_TIMELINE} from './reel-music.js';

// A 30 second 9:16 promotional reel recorded from the saved gallery. Staff-only, so the copy is
// Korean like the admin. Shots: 0–5s intro, 5–26s the chosen works in order, 26–30s end card.
export const REEL_DURATION=30,REEL_TRANSITION=1.4;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,k)=>a.map((value,i)=>value+(b[i]-value)*k);
// `timeline` sets where the intro ends, where each work ends and where the end card starts;
// the default splits 5–26s evenly. A music beat timeline (reel-music.js) snaps them to bars.
export function reelShot(time,works,timeline=DEFAULT_TIMELINE){
 const {introEnd,endStart}=timeline;
 if(time<introEnd)return {type:'intro',progress:time/introEnd,start:0,end:introEnd};
 if(time>=endStart)return {type:'end',progress:(time-endStart)/(REEL_DURATION-endStart),start:endStart,end:REEL_DURATION};
 const ends=timeline.artEnds||works.map((_,i)=>introEnd+(endStart-introEnd)*(i+1)/works.length);
 let index=ends.findIndex(end=>time<end);if(index<0)index=works.length-1;
 const start=index?ends[index-1]:introEnd,end=ends[index];
 return {type:'art',work:works[index],index,progress:(time-start)/(end-start),start,end};
}
export function reelView(shot,room,style){
 const entry=entryView(room),bounds=playerBounds(room);
 if(shot.type!=='art'){
  const x=entry.position[0]+(shot.type==='intro'?.8:-.3)*shot.progress;
  return {position:[x,1.75,entry.position[1]+.3],target:[x-Math.sin(entry.yaw)*5,1.8,entry.position[1]-Math.cos(entry.yaw)*5]};
 }
 const art=shot.work,swing=(shot.progress-.5)*(style==='detail'?.18:.48);
 if(art.kind==='object'){
  // Floor works turn slowly in front of the camera (about ±15°) so their depth reads.
  const view=objectViewpoint(art.placement),centre=view.lookAt,angle=swing*.55,dx=view.position[0]-centre[0],dz=view.position[1]-centre[2];
  const pos=[centre[0]+dx*Math.cos(angle)-dz*Math.sin(angle),1.6,centre[2]+dx*Math.sin(angle)+dz*Math.cos(angle)];
  pos[0]=clamp(pos[0],bounds.minX,bounds.maxX);pos[2]=clamp(pos[2],bounds.minZ,bounds.maxZ);
  return {position:pos,target:aimBelow(centre,Math.hypot(pos[0]-centre[0],pos[2]-centre[2]))};
 }
 const centre=art.position;
 // Portrait framing: the work fits about 40% of the frame height and 75% of its width,
 // leaving the lower part for the caption.
 const distance=clamp(Math.max(2.4,art.size[0]*2.6,art.size[1]*2.7),2.4,Math.min(room.w,room.d)-2),target=aimBelow(centre,distance);
 const pos=[centre[0]+(art.wall==='front'?distance:0),centre[1],centre[2]+(art.wall==='right'?distance:art.wall==='left'?-distance:0)];
 pos[0]=clamp(pos[0],bounds.minX,bounds.maxX);pos[2]=clamp(pos[2],bounds.minZ,bounds.maxZ);
 if(art.wall==='front')pos[2]=clamp(pos[2]+swing,bounds.minZ,bounds.maxZ);else pos[0]=clamp(pos[0]+swing,bounds.minX,bounds.maxX);
 return {position:pos,target};
}
// Aiming a little below the work lifts it into the upper part of a portrait frame, above the
// caption: 0.21 × distance centres the work about 27% from the top with the 50° lens.
const aimBelow=(centre,distance)=>[centre[0],centre[1]-distance*.21,centre[2]];
// The camera walks from where the last shot ended instead of cutting to the next work.
export function reelCamera(time,works,room,style,timeline=DEFAULT_TIMELINE){
 const shot=reelShot(time,works,timeline),view=reelView(shot,room,style),into=time-shot.start,transition=timeline.transition??REEL_TRANSITION;
 if(shot.type==='intro'||into>=transition)return {shot,view};
 const previous=reelShot(Math.max(0,shot.start-1e-6),works,timeline),from=reelView({...previous,progress:1},room,style),k=ease(into/transition);
 return {shot,view:{position:lerp(from.position,view.position,k),target:lerp(from.target,view.target,k)}};
}
// Instagram covers the bottom ~20% (caption, account, audio) and the right edge (buttons), so
// all text sits between 14% and 72% of the height and inside the left 85% of the width.
export function textLayout(w,h){return {left:w*.07,maxWidth:w*.74,top:h*.47,bottom:h*.72};}
export const textAlpha=(time,start,end)=>clamp(Math.min((time-start-.15)/.5,(end-time)/.4),0,1);
export const formatInfo=mime=>({ext:mime.startsWith('video/mp4')?'mp4':'webm',instagram:mime.startsWith('video/mp4')});
function mimeType(){return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';}
const SERIF='"Noto Serif KR","EB Garamond",Georgia,serif',SANS='"Noto Sans KR",system-ui,sans-serif';
function textLines(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const words=String(text||'').split(/\s+/).filter(Boolean);let line='',count=0;
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y+count*lineHeight);count++;line=word;if(count===maxLines)return count;}else line=next;}
 if(line&&count<maxLines){ctx.fillText(line,x,y+count*lineHeight);count++;}
 return count;
}
export function overlay(canvas,shot,time,total,{title,subtitle,dates}){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=w/720,box=textLayout(w,h);
 const shade=ctx.createLinearGradient(0,h*.36,0,h*.84);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(.45,'rgba(0,0,0,.5)');shade.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=shade;ctx.fillRect(0,h*.36,w,h*.48);
 ctx.save();ctx.globalAlpha=textAlpha(time,shot.start,shot.end);ctx.fillStyle='#fff';ctx.textBaseline='top';
 let y=box.top;
 ctx.font=`500 ${Math.round(17*s)}px ${SANS}`;ctx.letterSpacing=`${Math.round(3*s)}px`;
 ctx.fillText(shot.type==='art'?`UNFRAME · ${shot.index+1} / ${total}`:'UNFRAME · VIRTUAL GALLERY',box.left,y);ctx.letterSpacing='0px';y+=38*s;
 ctx.font=`600 ${Math.round(44*s)}px ${SERIF}`;
 y+=textLines(ctx,shot.type==='art'?shot.work.title:title,box.left,y,box.maxWidth,54*s,2)*54*s+10*s;
 ctx.font=`400 ${Math.round(23*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.88)';
 const detail=shot.type==='art'?shot.work.artist:shot.type==='end'?dates:subtitle;
 y+=textLines(ctx,detail,box.left,y,box.maxWidth,32*s,2)*32*s;
 if(shot.type==='end'){y+=22*s;ctx.font=`500 ${Math.round(22*s)}px ${SANS}`;ctx.fillStyle='#fff';ctx.fillText('@unframe.kr',box.left,y);y+=32*s;ctx.font=`400 ${Math.round(19*s)}px ${SANS}`;ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText('버추얼 갤러리는 프로필 링크에서',box.left,y);}
 ctx.restore();
}
export function openReelStudio({room,artworks,exhibition,settings}){
 if(!document.querySelector('link[data-reel-fonts]')){const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500&family=Noto+Serif+KR:wght@600&display=swap';link.dataset.reelFonts='';document.head.append(link);}
 const dialog=document.createElement('dialog');dialog.className='reel-dialog';dialog.setAttribute('aria-labelledby','reel-heading');
 const date=exhibition.startDate&&exhibition.endDate?`${exhibition.startDate.replaceAll('-','.')} — ${exhibition.endDate.replaceAll('-','.')}`:'';
 const supported=window.MediaRecorder?mimeType():'',format=supported?formatInfo(supported):null;
 const formatNote=!supported?'이 브라우저는 영상 저장을 지원하지 않습니다. 최신 크롬이나 사파리에서 만들어주세요.':format.instagram?'MP4로 저장되어 인스타그램에 바로 올릴 수 있습니다.':'이 브라우저는 WebM으로만 저장합니다. 인스타그램에 올리려면 최신 크롬이나 사파리에서 만들거나 MP4로 변환해주세요.';
 dialog.innerHTML=`<div class="reel-shell"><header class="reel-head"><div><span>UNFRAME / VIRTUAL GALLERY</span><h2 id="reel-heading">전시 릴스 만들기</h2><p>저장된 갤러리로 30초 영상을 만듭니다.</p></div><button type="button" data-close aria-label="릴스 제작 닫기">닫기 ×</button></header><div class="reel-body"><div class="reel-preview"><canvas width="360" height="640" aria-label="릴스 미리보기"></canvas><p data-preview-label>작품을 선택하고 미리보기를 시작하세요.</p></div><div class="reel-settings"><label>전시 제목<input data-title maxlength="100" value="${e(exhibition.title||settings.title||'')}"></label><label>소개 문구 <small>선택</small><input data-subtitle maxlength="100" value="${e(settings.artistName||'')}"></label><label>전시 기간 <small>선택</small><input data-dates maxlength="100" value="${e(date)}"></label><label>촬영 스타일<select data-style><option value="tour">공간 투어</option><option value="detail">작품 집중</option></select></label><fieldset><legend>영상에 담을 작품</legend><p>최대 3점 · 선택 순서대로 촬영합니다.</p><div data-works>${artworks.map((art,i)=>`<label class="reel-work"><input type="checkbox" value="${e(art.id)}" ${i<3?'checked':''}><span>${e(art.title||'제목 없음')}<small>${e(art.artist||'')}</small></span></label>`).join('')}</div><p data-order></p></fieldset><label>영상 크기<select data-size><option value="720">720 × 1280 · 권장</option><option value="1080">1080 × 1920 · 고화질</option></select></label><p class="reel-note">${formatNote} 음악은 넣지 않습니다(인스타그램에서 추가하세요). 촬영 중에는 이 화면을 열어두세요. 다크 뮤지엄 조명 갤러리에서 찍으면 더 고급스럽게 나옵니다.</p><div class="reel-actions"><button type="button" data-preview>미리보기</button><button type="button" data-record ${supported?'':'disabled'}>영상 만들기</button><button type="button" data-cancel hidden>취소</button><a data-download hidden>영상 다운로드</a></div><progress data-progress max="30" value="0" aria-label="촬영 진행률"></progress><p class="reel-status" role="status" aria-live="polite" data-status></p><video data-video controls playsinline hidden></video></div></div></div>`;
 document.body.append(dialog);const $=q=>dialog.querySelector(q),canvas=$('canvas'),status=$('[data-status]'),progress=$('progress'),boxes=[...dialog.querySelectorAll('[data-works] input')];
 let selected=boxes.filter(x=>x.checked).map(x=>x.value),busy=false,abort=null,url='';
 const showOrder=()=>{$('[data-order]').textContent=selected.length?'촬영 순서: '+selected.map(id=>artworks.find(art=>art.id===id)?.title||'제목 없음').join(' → '):'선택한 작품이 없습니다.';};showOrder();
 boxes.forEach(box=>box.addEventListener('change',()=>{if(box.checked){if(selected.length>=3){box.checked=false;status.textContent='작품은 최대 3점까지 선택할 수 있습니다.';return;}selected.push(box.value);}else selected=selected.filter(id=>id!==box.value);showOrder();status.textContent=selected.length?`선택한 작품 ${selected.length}점`: '작품을 한 점 이상 선택해주세요.';}));
 // Runs once, from the close button directly or from the dialog's close event (Esc).
 let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;if(abort)abort();room.endReel?.();if(url)URL.revokeObjectURL(url);dialog.remove();};
 $('[data-close]').onclick=()=>{if(busy)return;dialog.close();cleanup();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',cleanup);
 function setBusy(value){busy=value;dialog.querySelectorAll('input, select, [data-preview], [data-record], [data-close]').forEach(el=>el.disabled=value||(el.matches('[data-record]')&&!supported));$('[data-cancel]').hidden=!value;}
 const fields=()=>({title:$('[data-title]').value,subtitle:$('[data-subtitle]').value,dates:$('[data-dates]').value});
 async function run(record){
  if(busy)return;const info=room.reelInfo(),works=selected.map(id=>info.works.find(work=>work.id===id)).filter(Boolean);
  if(!works.length){status.textContent='작품을 한 점 이상 선택해주세요.';return;}
  const unavailable=works.filter(work=>info.assets[work.id]!=='ready');if(unavailable.length){status.textContent=`작품을 불러오지 못했거나 아직 로딩 중입니다: ${unavailable.map(work=>work.title).join(', ')}. 잠시 후 다시 시도하거나 작품을 확인해주세요.`;return;}
  if(record&&(!supported||!canvas.captureStream)){status.textContent='이 브라우저는 영상 저장을 지원하지 않습니다. 최신 크롬이나 사파리에서 시도해주세요.';return;}
  const width=record?Number($('[data-size]').value):360;canvas.width=width;canvas.height=Math.round(width*16/9);
  const text=fields(),style=$('[data-style]').value;
  let recorder,stream,chunks=[],started=0,frame=0,cancelled=false;setBusy(true);progress.value=0;$('[data-preview-label]').textContent=record?'영상 촬영 중':'미리보기 재생 중';
  status.textContent='글꼴을 준비하고 있습니다…';
  await Promise.all([document.fonts.load(`600 44px ${SERIF}`),document.fonts.load(`400 23px ${SANS}`),document.fonts.load(`500 17px ${SANS}`)]).catch(()=>{});
  status.textContent=record?'영상 촬영 중입니다. 화면을 열어두세요.':'30초 미리보기 중입니다.';
  try{
   room.beginReel(canvas.width,canvas.height);
   if(record){stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:width===1080?8000000:4500000});recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.start();}
   await new Promise((resolve,reject)=>{
    abort=()=>{cancelled=true;cancelAnimationFrame(frame);reject(new Error('취소했습니다.'));};
    const tick=now=>{try{if(document.hidden)throw new Error('화면이 숨겨져 촬영을 중단했습니다. 이 화면을 열어둔 채 다시 시도해주세요.');if(!started)started=now;const time=Math.min(REEL_DURATION,(now-started)/1000),{shot,view}=reelCamera(time,works,info.room,style);room.renderReelFrame(canvas,view);overlay(canvas,shot,time,works.length,text);progress.value=time;if(time>=REEL_DURATION)resolve();else frame=requestAnimationFrame(tick);}catch(error){reject(error);}};frame=requestAnimationFrame(tick);
   });
   if(record){
    const blob=await new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:supported}));recorder.onerror=()=>reject(new Error('영상 저장에 실패했습니다.'));recorder.stop();});
    if(!blob.size)throw new Error('영상이 비어 있습니다. 다시 시도해주세요.');
    if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);const video=$('[data-video]'),download=$('[data-download]'),name=(text.title||'reel').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,60);
    video.src=url;video.hidden=false;download.href=url;download.download=`UNFRAME_${name}.${format.ext}`;download.textContent=format.instagram?'영상 다운로드 (MP4)':'영상 다운로드 (WebM · 인스타그램용은 MP4 변환 필요)';download.hidden=false;
    status.textContent=format.instagram?'영상이 완성되었습니다. 재생해 확인한 뒤 다운로드하세요.':'영상이 완성되었습니다. 이 브라우저는 WebM으로 저장하므로 인스타그램에 올리기 전에 MP4로 변환해주세요.';
   }else status.textContent='미리보기가 끝났습니다. 설정을 바꾸거나 영상을 만들어보세요.';
  }catch(error){if(recorder&&recorder.state!=='inactive')recorder.stop();status.textContent=error.message||'촬영을 완료하지 못했습니다.';}
  finally{abort=null;room.endReel();if(stream)stream.getTracks().forEach(track=>track.stop());setBusy(false);$('[data-preview-label]').textContent=cancelled?'촬영이 취소되었습니다.':'30초 · 9:16';}
 }
 $('[data-preview]').onclick=()=>run(false);$('[data-record]').onclick=()=>run(true);$('[data-cancel]').onclick=()=>abort?.();dialog.showModal();
 try{const info=room.reelInfo(),shot=reelShot(2,[]);room.renderReelFrame(canvas,reelView(shot,info.room,'tour'));overlay(canvas,shot,2,0,fields());}catch{}
}
