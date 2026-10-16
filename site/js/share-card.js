import {imageURL,dateRange} from './model.js';
export const sizes={story:[1080,1920],landscape:[1200,900]};
export function fitImage(iw,ih,w,h,cover=false){const s=(cover?Math.max:Math.min)(w/iw,h/ih);return [(w-iw*s)/2,(h-ih*s)/2,iw*s,ih*s];}
export function textLines(ctx,text,width,max=3){const lines=[];let line='';for(const ch of Array.from(String(text||''))){if(ctx.measureText(line+ch).width>width&&line){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);if(lines.length>max){lines.length=max;let last=lines[max-1];while(last&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[max-1]=last+'…';}return lines;}
export function exhibitionCard(item){return {title:item.title,artist:item.artists,meta:[dateRange(item),item.location].filter(Boolean).join(' · '),image:item.cover?.url,url:new URL('/exhibition/'+encodeURIComponent(item.id),location.origin).href};}
let stylesLoaded=false;
export async function openShareCard(data){
 if(!stylesLoaded){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/share-card.css';document.head.append(link);stylesLoaded=true;}
 const dialog=document.createElement('dialog');dialog.className='share-card-dialog';dialog.setAttribute('aria-label','공유 카드 만들기');dialog.innerHTML='<div class="share-card-head"><h2>Share this moment.</h2><button type="button" data-close aria-label="공유 카드 닫기">닫기 ×</button></div><div class="share-card-body"><div class="share-card-preview"><canvas aria-label="공유 카드 미리보기"></canvas></div><div class="share-card-controls"><h3>나만의 공유 카드</h3><label>디자인<select data-design><option value="A">A · 작품 전체형</option><option value="B">B · 이미지 몰입형</option></select></label><label>이미지 비율<select data-ratio><option value="story">스토리 · 9:16</option><option value="landscape">가로형 · 4:3</option></select></label><p data-note>A는 작품 전체를 보여줍니다. B는 배경을 채우며 이미지 일부가 잘릴 수 있습니다.</p><p role="status" aria-live="polite" data-status></p><button type="button" data-save disabled>PNG 이미지 저장</button><button type="button" data-native hidden>기기에서 공유</button><button type="button" data-link>링크 복사</button><small>저장한 이미지를 인스타그램 스토리 등에 직접 올려주세요. 링크는 별도로 붙여넣을 수 있습니다.</small></div></div>';
 document.body.append(dialog);dialog.showModal();const q=s=>dialog.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d');let blob=null,url='',version=0,closed=false;
 const clean=()=>{closed=true;version++;if(url)URL.revokeObjectURL(url);dialog.remove();};dialog.addEventListener('close',clean,{once:true});q('[data-close]').onclick=()=>dialog.close();
 const status=t=>q('[data-status]').textContent=t;
 q('[data-link]').onclick=async()=>{try{await navigator.clipboard.writeText(data.url||location.href);status('링크를 복사했습니다.');}catch{status('주소창의 링크를 복사해주세요.');}};
 q('[data-save]').onclick=()=>{if(!url)return;const a=document.createElement('a');a.href=url;a.download='UNFRAME-'+q('[data-design]').value+'-'+q('[data-ratio]').value+'.png';a.click();};
 q('[data-native]').onclick=async()=>{if(!blob)return;try{await navigator.share({files:[new File([blob],'UNFRAME.png',{type:'image/png'})]});}catch(error){if(error.name!=='AbortError')status('이미지를 저장한 뒤 공유해주세요.');}};
 async function render(){const token=++version;blob=null;q('[data-save]').disabled=true;q('[data-native]').hidden=true;status('이미지를 준비하고 있습니다…');try{
 await document.fonts.ready;const img=new Image();img.crossOrigin='anonymous';const src=imageURL(data.image);if(!src)throw Error('image');await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src;});if(closed||token!==version)return;
 const [w,h]=sizes[q('[data-ratio]').value],portrait=h>w,B=q('[data-design]').value==='B';canvas.width=w;canvas.height=h;ctx.fillStyle='#f6f4ee';ctx.fillRect(0,0,w,h);
 const draw=(x,y,bw,bh,cover)=>{const [dx,dy,dw,dh]=fitImage(img.naturalWidth,img.naturalHeight,bw,bh,cover);ctx.save();ctx.beginPath();ctx.rect(x,y,bw,bh);ctx.clip();ctx.drawImage(img,x+dx,y+dy,dw,dh);ctx.restore();};
 if(B){draw(0,0,w,h,true);const gradient=ctx.createLinearGradient(0,h*.28,0,h);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,.94)');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}else if(portrait)draw(65,210,w-130,h*.52,false);else draw(55,160,w*.52,h-235,false);
 ctx.fillStyle=B?'#fff':'#004aad';ctx.font='700 29px sans-serif';ctx.fillText('UNFRAME',65,portrait?115:85);ctx.font='15px sans-serif';ctx.fillText('ART WITHOUT A FRAME',65,portrait?145:112);
 const x=!B&&!portrait?w*.62:65,width=!B&&!portrait?w*.32:w-130;let y=B?h-(portrait?620:440):portrait?h*.72:280;
 ctx.fillStyle=B?'#fff':'#151515';ctx.font=`600 ${portrait?52:44}px sans-serif`;for(const line of textLines(ctx,data.title,width,portrait?2:3)){ctx.fillText(line,x,y);y+=portrait?64:56;}
 y+=22;ctx.font=`${portrait?30:24}px sans-serif`;for(const line of textLines(ctx,data.artist,width,2)){ctx.fillText(line,x,y);y+=portrait?42:34;}
 y+=30;ctx.font=`${portrait?24:19}px sans-serif`;for(const line of textLines(ctx,data.meta,width,2)){ctx.fillText(line,x,y);y+=portrait?35:28;}
 ctx.font='16px sans-serif';ctx.fillText(location.host,65,h-(portrait?125:50));
 const next=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!next)throw Error('export');if(closed||token!==version)return;if(url)URL.revokeObjectURL(url);blob=next;url=URL.createObjectURL(blob);q('[data-save]').disabled=false;const file=new File([blob],'UNFRAME.png',{type:'image/png'});q('[data-native]').hidden=!navigator.canShare?.({files:[file]});status(`${w} × ${h} px · 저장 준비 완료`);
 }catch{if(!closed&&token===version)status('이미지를 불러오지 못했습니다. 다른 디자인을 선택하거나 잠시 후 다시 시도해주세요.');}}
 q('[data-design]').onchange=render;q('[data-ratio]').onchange=render;await render();
}
