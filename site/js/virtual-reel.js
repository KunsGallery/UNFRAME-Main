import {entryView,playerBounds} from './virtual-links.js';
import {objectViewpoint} from './virtual-objects.js';
import {escapeHTML as e} from './model.js';

export const REEL_DURATION=30;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function reelShot(time,works){
 if(time<5)return {type:'intro',progress:time/5};
 if(time>=26)return {type:'end',progress:(time-26)/4};
 const length=21/works.length,index=Math.min(works.length-1,Math.floor((time-5)/length));
 return {type:'art',work:works[index],progress:((time-5)-index*length)/length};
}
export function reelView(shot,room,style){
 const entry=entryView(room),bounds=playerBounds(room);
 if(shot.type!=='art'){
  const x=entry.position[0]+(shot.type==='intro'?.8:-.3)*shot.progress;
  return {position:[x,1.75,entry.position[1]+.3],target:[x-Math.sin(entry.yaw)*5,1.8,entry.position[1]-Math.cos(entry.yaw)*5]};
 }
 const art=shot.work,object=art.kind==='object',target=object?objectViewpoint(art.placement).lookAt:art.position;
 let pos;
 if(object){const view=objectViewpoint(art.placement);pos=[view.position[0],1.75,view.position[1]];}
 else{
  // Portrait framing needs enough distance for a work's width as well as its height.
  const distance=clamp(Math.max(2.4,art.size[0]*2.25,art.size[1]*1.25),2.4,Math.min(room.w,room.d)-2);
  pos=[target[0]+(art.wall==='front'?distance:0),target[1],target[2]+(art.wall==='right'?distance:art.wall==='left'?-distance:0)];
 }
 pos[0]=clamp(pos[0],bounds.minX,bounds.maxX);pos[2]=clamp(pos[2],bounds.minZ,bounds.maxZ);
 const drift=(shot.progress-.5)*(style==='detail'?.18:.48);
 if(art.wall==='front')pos[2]=clamp(pos[2]+drift,bounds.minZ,bounds.maxZ);else pos[0]=clamp(pos[0]+drift,bounds.minX,bounds.maxX);
 return {position:pos,target};
}
function mimeType(){return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';}
function textLines(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const words=String(text||'').split(/\s+/).filter(Boolean);let line='',count=0;
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y+count*lineHeight);count++;line=word;if(count===maxLines)return;}else line=next;}
 if(line&&count<maxLines)ctx.fillText(line,x,y+count*lineHeight);
}
function overlay(canvas,shot,title,subtitle,dates){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=w/720;
 const gradient=ctx.createLinearGradient(0,h*.55,0,h);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=gradient;ctx.fillRect(0,h*.55,w,h*.45);
 ctx.fillStyle='#fff';ctx.textBaseline='top';ctx.font=`${Math.round(22*scale)}px sans-serif`;ctx.fillText('UNFRAME',w*.08,h*.77);
 ctx.font=`600 ${Math.round(43*scale)}px sans-serif`;
 textLines(ctx,shot.type==='art'?shot.work.title:title,w*.08,h*.81,w*.84,52*scale,2);
 ctx.font=`${Math.round(24*scale)}px sans-serif`;
 textLines(ctx,shot.type==='art'?shot.work.artist:shot.type==='end'?dates:subtitle,w*.08,h*.91,w*.84,30*scale,2);
}
export function openReelStudio({room,artworks,exhibition,settings}){
 const dialog=document.createElement('dialog');dialog.className='reel-dialog';dialog.setAttribute('aria-labelledby','reel-heading');
 const date=exhibition.startDate&&exhibition.endDate?`${exhibition.startDate.replaceAll('-','.')} — ${exhibition.endDate.replaceAll('-','.')}`:'';
 dialog.innerHTML=`<div class="reel-shell"><header class="reel-head"><div><span>UNFRAME / VIRTUAL GALLERY</span><h2 id="reel-heading">전시 릴스 만들기</h2><p>저장된 갤러리로 30초 영상을 만듭니다.</p></div><button type="button" data-close aria-label="릴스 제작 닫기">닫기 ×</button></header><div class="reel-body"><div class="reel-preview"><canvas width="360" height="640" aria-label="릴스 미리보기"></canvas><p data-preview-label>작품을 선택하고 미리보기를 시작하세요.</p></div><div class="reel-settings"><label>전시 제목<input data-title maxlength="100" value="${e(exhibition.title||settings.title||'')}"></label><label>소개 문구 <small>선택</small><input data-subtitle maxlength="100" value="${e(settings.artistName||'')}"></label><label>전시 기간 <small>선택</small><input data-dates maxlength="100" value="${e(date)}"></label><label>촬영 스타일<select data-style><option value="tour">공간 투어</option><option value="detail">작품 집중</option></select></label><fieldset><legend>영상에 담을 작품</legend><p>최대 3점 · 선택 순서대로 촬영합니다.</p><div data-works>${artworks.map((art,i)=>`<label class="reel-work"><input type="checkbox" value="${e(art.id)}" ${i<3?'checked':''}><span>${e(art.title||'제목 없음')}<small>${e(art.artist||'')}</small></span></label>`).join('')}</div><p data-order></p></fieldset><label>영상 크기<select data-size><option value="720">720 × 1280 · 권장</option><option value="1080">1080 × 1920 · 고화질</option></select></label><p class="reel-note">음악 없이 저장됩니다. 브라우저에 따라 MP4 또는 WebM으로 만들어집니다. 촬영 중에는 이 화면을 열어두세요.</p><div class="reel-actions"><button type="button" data-preview>미리보기</button><button type="button" data-record>영상 만들기</button><button type="button" data-cancel hidden>취소</button><a data-download hidden>영상 다운로드</a></div><progress data-progress max="30" value="0" aria-label="촬영 진행률"></progress><p class="reel-status" role="status" aria-live="polite" data-status></p><video data-video controls playsinline hidden></video></div></div></div>`;
 document.body.append(dialog);const $=q=>dialog.querySelector(q),canvas=$('canvas'),status=$('[data-status]'),progress=$('progress'),boxes=[...dialog.querySelectorAll('[data-works] input')];
 let selected=boxes.filter(x=>x.checked).map(x=>x.value),busy=false,abort=null,url='';
 const showOrder=()=>{$('[data-order]').textContent=selected.length?'촬영 순서: '+selected.map(id=>artworks.find(art=>art.id===id)?.title||'제목 없음').join(' → '):'선택한 작품이 없습니다.';};showOrder();
 boxes.forEach(box=>box.addEventListener('change',()=>{if(box.checked){if(selected.length>=3){box.checked=false;status.textContent='작품은 최대 3점까지 선택할 수 있습니다.';return;}selected.push(box.value);}else selected=selected.filter(id=>id!==box.value);showOrder();status.textContent=selected.length?`선택한 작품 ${selected.length}점`: '작품을 한 점 이상 선택해주세요.';}));
 const cleanup=()=>{if(abort)abort();if(url)URL.revokeObjectURL(url);dialog.remove();};
 $('[data-close]').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',cleanup);
 function setBusy(value){busy=value;dialog.querySelectorAll('input, select, [data-preview], [data-record], [data-close]').forEach(el=>el.disabled=value);$('[data-cancel]').hidden=!value;}
 async function run(record){
  if(busy)return;const info=room.reelInfo(),works=selected.map(id=>info.works.find(work=>work.id===id)).filter(Boolean);
  if(!works.length){status.textContent='작품을 한 점 이상 선택해주세요.';return;}
  const unavailable=works.filter(work=>info.assets[work.id]!=='ready');if(unavailable.length){status.textContent=`작품을 불러오지 못했거나 아직 로딩 중입니다: ${unavailable.map(work=>work.title).join(', ')}. 잠시 후 다시 시도하거나 작품을 확인해주세요.`;return;}
  if(record&&(!window.MediaRecorder||!canvas.captureStream)){status.textContent='이 브라우저는 영상 저장을 지원하지 않습니다. 다른 브라우저에서 시도해주세요.';return;}
  const mime=record?mimeType():'';if(record&&!mime){status.textContent='이 브라우저에서 지원하는 영상 형식을 찾지 못했습니다.';return;}
  const width=record?Number($('[data-size]').value):360;canvas.width=width;canvas.height=Math.round(width*16/9);
  const title=$('[data-title]').value,subtitle=$('[data-subtitle]').value,dates=$('[data-dates]').value,style=$('[data-style]').value;
  let recorder,stream,chunks=[],started=0,frame=0,cancelled=false;setBusy(true);progress.value=0;status.textContent=record?'영상 촬영 중입니다. 화면을 열어두세요.':'30초 미리보기 중입니다.';$('[data-preview-label]').textContent=record?'영상 촬영 중':'미리보기 재생 중';
  try{
   if(record){stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:width===1080?8000000:4500000});recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.start();}
   await new Promise((resolve,reject)=>{
    abort=()=>{cancelled=true;cancelAnimationFrame(frame);reject(new Error('취소했습니다.'));};
    const tick=now=>{try{if(document.hidden)throw new Error('화면이 숨겨져 촬영을 중단했습니다. 이 화면을 열어둔 채 다시 시도해주세요.');if(!started)started=now;const time=Math.min(REEL_DURATION,(now-started)/1000),shot=reelShot(time,works);room.renderReelFrame(canvas,reelView(shot,info.room,style));overlay(canvas,shot,title,subtitle,dates);progress.value=time;if(time>=REEL_DURATION)resolve();else frame=requestAnimationFrame(tick);}catch(error){reject(error);}};frame=requestAnimationFrame(tick);
   });
   if(record){const blob=await new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=()=>reject(new Error('영상 저장에 실패했습니다.'));recorder.stop();});if(!blob.size)throw new Error('영상이 비어 있습니다. 다시 시도해주세요.');if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);const video=$('[data-video]'),download=$('[data-download]');video.src=url;video.hidden=false;download.href=url;download.download=`unframe-reel.${mime.startsWith('video/mp4')?'mp4':'webm'}`;download.hidden=false;status.textContent='영상이 완성되었습니다. 재생해 확인한 뒤 다운로드하세요.';}else status.textContent='미리보기가 끝났습니다. 설정을 바꾸거나 영상을 만들어보세요.';
  }catch(error){if(recorder&&recorder.state!=='inactive')recorder.stop();status.textContent=error.message||'촬영을 완료하지 못했습니다.';}
  finally{abort=null;if(stream)stream.getTracks().forEach(track=>track.stop());setBusy(false);$('[data-preview-label]').textContent=cancelled?'촬영이 취소되었습니다.':'30초 · 9:16';}
 }
 $('[data-preview]').onclick=()=>run(false);$('[data-record]').onclick=()=>run(true);$('[data-cancel]').onclick=()=>abort?.();dialog.showModal();
 try{const info=room.reelInfo();room.renderReelFrame(canvas,reelView({type:'intro',progress:0},info.room,'tour'));overlay(canvas,{type:'intro'},$('[data-title]').value,$('[data-subtitle]').value,$('[data-dates]').value);}catch{}
}
