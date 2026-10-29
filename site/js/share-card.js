import {imageURL,dateRange} from './model.js';
import {fitImage} from './share-card-geometry.js';
import {DESIGNS,cardLayout} from './share-card-layout.js';
import {t,localHref} from './i18n.js';
export {fitImage};
export const sizes={story:[1080,1920],landscape:[1200,900]};
export function textLines(ctx,text,width,max=3){const lines=[];let line='';for(const ch of Array.from(String(text||''))){if(ctx.measureText(line+ch).width>width&&line){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);if(lines.length>max){lines.length=max;let last=lines[max-1];while(last&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[max-1]=last+'…';}return lines;}
export function exhibitionCard(item){return {title:item.title,artist:item.artists,meta:[dateRange(item),item.location].filter(Boolean).join(' · '),image:item.cover?.url,url:new URL(localHref('/exhibition/'+encodeURIComponent(item.id)),location.origin).href};}
const SERIF='"Noto Serif KR","EB Garamond",Georgia,serif',SANS='"Noto Sans KR",system-ui,sans-serif',BLUE='#004aad',INK='#161a18';
function lines(ctx,font,text,width,max){ctx.font=font;return textLines(ctx,text,width,max);}
export const HANDLE='@unframe.kr';
// Bottom line of every card: the Instagram handle on the left and, for artworks, the
// exhibition on the right as a bold title plus lighter dates. The title gives way ("…")
// before it can reach the handle; the dates drop first when even a short title won't fit.
export function footerLine(ctx,{w,y,margin,size,color,strong},exhibition){
 ctx.textAlign='left';ctx.fillStyle=color;ctx.font=`500 ${size}px ${SANS}`;ctx.fillText(HANDLE,margin,y);
 const title=exhibition?.title||'';if(!title)return;
 const room=w-margin*2-ctx.measureText(HANDLE).width-size*2.5,gap=size*.7;
 ctx.font=`400 ${size}px ${SANS}`;let dates=exhibition.dates||'',datesWidth=dates?ctx.measureText(dates).width+gap:0;
 ctx.font=`600 ${size}px ${SANS}`;if(dates&&ctx.measureText(title).width+datesWidth>room&&ctx.measureText(title.slice(0,6)+'…').width+datesWidth>room){dates='';datesWidth=0;}
 const [shown='']=textLines(ctx,title,room-datesWidth,1);
 ctx.textAlign='right';let x=w-margin;
 if(dates){ctx.font=`400 ${size}px ${SANS}`;ctx.fillStyle=color;ctx.fillText(dates,x,y);x-=datesWidth;}
 ctx.font=`600 ${size}px ${SANS}`;ctx.fillStyle=strong;ctx.fillText(shown,x,y);ctx.textAlign='left';
}
function wordmark(ctx,x,y,color,size=26){ctx.fillStyle=color;ctx.font=`600 ${size}px ${SANS}`;ctx.letterSpacing=`${size*.18}px`;ctx.fillText('UNFRAME',x,y);ctx.letterSpacing='0px';}
// Draws one of the three designs. Geometry lives in share-card-layout.js; this only paints.
export function drawCard(ctx,design,w,h,img,data){
 const layout=cardLayout(design,w,h,img.naturalWidth,img.naturalHeight),{art,image,text,portrait}=layout,scale=portrait?1:.82;
 const paint=(box,cover)=>{ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.w,box.h);ctx.clip();ctx.drawImage(img,image.x,image.y,image.w,image.h);ctx.restore();};
 if(design==='label'){
  ctx.fillStyle='#f3efe6';ctx.fillRect(0,0,w,h);
  wordmark(ctx,portrait?86:60,portrait?120:84,BLUE);
  ctx.save();ctx.shadowColor='rgba(40,32,20,.18)';ctx.shadowBlur=40*scale;ctx.shadowOffsetY=18*scale;ctx.fillStyle='#fff';ctx.fillRect(art.x,art.y,art.w,art.h);ctx.restore();
  ctx.strokeStyle='#e3dccd';ctx.lineWidth=2;ctx.strokeRect(art.x,art.y,art.w,art.h);paint(image);
  ctx.fillStyle='#fff';ctx.fillRect(text.x,text.y,text.w,text.h);ctx.strokeStyle='#e2dccf';ctx.strokeRect(text.x,text.y,text.w,text.h);
  const pad=portrait?44:30,width=text.w-pad*2;let y=text.y+pad+(portrait?44:34);ctx.fillStyle=INK;
  for(const line of lines(ctx,`600 ${portrait?50:38}px ${SERIF}`,data.title,width,2)){ctx.fillText(line,text.x+pad,y);y+=portrait?62:48;}
  y+=portrait?14:8;ctx.fillStyle='#4a4f4c';for(const line of lines(ctx,`400 ${portrait?28:22}px ${SANS}`,data.artist,width,1)){ctx.fillText(line,text.x+pad,y);y+=portrait?40:32;}
  ctx.fillStyle='#8a8d8a';for(const line of lines(ctx,`400 ${portrait?22:18}px ${SANS}`,data.meta,width,2)){ctx.fillText(line,text.x+pad,y);y+=portrait?32:26;}
  footerLine(ctx,{w,y:h-(portrait?84:44),margin:portrait?86:60,size:portrait?22:16,color:'#8a8d8a',strong:INK},data.exhibition);
  return;
 }
 if(design==='wall'){
  ctx.fillStyle='#e8e4dc';ctx.fillRect(0,0,w,h);
  const light=ctx.createRadialGradient(art.x+art.w/2,art.y+art.h*.35,10,art.x+art.w/2,art.y+art.h*.45,Math.max(art.w,art.h)*1.05);
  light.addColorStop(0,'rgba(255,250,236,.95)');light.addColorStop(1,'rgba(232,228,220,0)');ctx.fillStyle=light;ctx.fillRect(0,0,w,layout.floor);
  const floor=ctx.createLinearGradient(0,layout.floor,0,h);floor.addColorStop(0,'#d3cec3');floor.addColorStop(1,'#bfb9ad');ctx.fillStyle=floor;ctx.fillRect(0,layout.floor,w,h-layout.floor);
  ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(0,layout.floor,w,3);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=36*scale;ctx.shadowOffsetX=14*scale;ctx.shadowOffsetY=22*scale;ctx.fillStyle='#222';ctx.fillRect(art.x,art.y,art.w,art.h);ctx.restore();paint(art);
  wordmark(ctx,portrait?90:60,portrait?120:84,BLUE,24);
  let y=text.y+(portrait?50:40);ctx.fillStyle=INK;
  for(const line of lines(ctx,`600 ${portrait?56:40}px ${SERIF}`,data.title,text.w,2)){ctx.fillText(line,text.x,y);y+=portrait?68:50;}
  ctx.fillStyle='#3f4442';for(const line of lines(ctx,`400 ${portrait?28:21}px ${SANS}`,[data.artist,data.meta].filter(Boolean).join(' · '),text.w,2)){ctx.fillText(line,text.x,y+6);y+=portrait?40:30;}
  footerLine(ctx,{w,y:h-(portrait?70:40),margin:portrait?90:60,size:portrait?22:16,color:'#5a5e5b',strong:INK},data.exhibition);
  return;
 }
 ctx.fillStyle=BLUE;ctx.fillRect(0,0,w,h);
 wordmark(ctx,portrait?80:60,portrait?110:96,'#fff');
 ctx.fillStyle='rgba(255,255,255,.72)';ctx.font=`400 ${portrait?22:17}px ${SANS}`;ctx.textAlign='right';ctx.fillText('ART WITHOUT A FRAME',portrait?w-80:text.x+text.w,portrait?110:96);ctx.textAlign='left';
 let y=text.y+(portrait?110:80);ctx.fillStyle='#fff';
 for(const line of lines(ctx,`600 ${portrait?104:62}px ${SERIF}`,data.title,text.w,portrait?3:4)){ctx.fillText(line,text.x,y);y+=portrait?122:76;}
 if(!portrait){y+=20;ctx.font=`500 22px ${SANS}`;for(const line of lines(ctx,`500 22px ${SANS}`,data.artist,text.w,1)){ctx.fillText(line,text.x,y);y+=32;}ctx.fillStyle='rgba(255,255,255,.75)';for(const line of lines(ctx,`400 17px ${SANS}`,data.meta,text.w,2)){ctx.fillText(line,text.x,y);y+=26;}}
 paint(art);
 if(portrait){const fy=art.y+art.h+90;ctx.fillStyle='#fff';for(const line of lines(ctx,`500 34px ${SANS}`,data.artist,w-160,1))ctx.fillText(line,80,fy);ctx.fillStyle='rgba(255,255,255,.75)';let my=fy+48;for(const line of lines(ctx,`400 24px ${SANS}`,data.meta,w-160,2)){ctx.fillText(line,80,my);my+=34;}}
 footerLine(ctx,{w,y:h-(portrait?70:28),margin:portrait?80:60,size:portrait?22:15,color:'rgba(255,255,255,.72)',strong:'#fff'},data.exhibition);
}
let stylesLoaded=false;
export async function openShareCard(data){
 if(!stylesLoaded){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/share-card.css';document.head.append(link);stylesLoaded=true;}
 const dialog=document.createElement('dialog');dialog.className='share-card-dialog';dialog.setAttribute('aria-label',t('detail.makeCard'));dialog.innerHTML=`<div class="share-card-head"><h2>Share this moment.</h2><button type="button" data-close aria-label="${t('card.close')}">${t('card.closeButton')}</button></div><div class="share-card-body"><div class="share-card-preview"><canvas aria-label="${t('card.preview')}"></canvas></div><div class="share-card-controls"><h3>${t('card.title')}</h3><label>${t('card.design')}<select data-design>${Object.entries(DESIGNS).map(([key,label],index)=>`<option value="${key}">${index+1} · ${label}</option>`).join('')}</select></label><label>${t('card.ratio')}<select data-ratio><option value="story">${t('card.story')}</option><option value="landscape">${t('card.landscape')}</option></select></label><p data-note>${t('card.note')}</p><p role="status" aria-live="polite" data-status></p><button type="button" data-save disabled>${t('card.save')}</button><button type="button" data-native hidden>${t('card.share')}</button><button type="button" data-link>${t('ex.copyLink')}</button><small>${t('card.hint')}</small></div></div>`;
 document.body.append(dialog);dialog.showModal();const q=s=>dialog.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d');let blob=null,url='',version=0,closed=false;
 const clean=()=>{closed=true;version++;if(url)URL.revokeObjectURL(url);dialog.remove();};dialog.addEventListener('close',clean,{once:true});q('[data-close]').onclick=()=>dialog.close();
 const status=t=>q('[data-status]').textContent=t;
 q('[data-link]').onclick=async()=>{try{await navigator.clipboard.writeText(data.url||location.href);status(t('card.linkCopied'));}catch{status(t('detail.copyManually'));}};
 q('[data-save]').onclick=()=>{if(!url)return;const a=document.createElement('a');a.href=url;a.download='UNFRAME-'+q('[data-design]').value+'-'+q('[data-ratio]').value+'.png';a.click();};
 q('[data-native]').onclick=async()=>{if(!blob)return;try{await navigator.share({files:[new File([blob],'UNFRAME.png',{type:'image/png'})]});}catch(error){if(error.name!=='AbortError')status(t('card.saveFirst'));}};
 async function render(){const token=++version;blob=null;q('[data-save]').disabled=true;q('[data-native]').hidden=true;status(t('card.preparing'));try{
 await Promise.all([document.fonts.load('600 60px "Noto Serif KR"'),document.fonts.load('400 30px "Noto Sans KR"'),document.fonts.load('500 30px "Noto Sans KR"')]).catch(()=>{});await document.fonts.ready;const img=new Image();img.crossOrigin='anonymous';const src=imageURL(data.image);if(!src)throw Error('image');await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src;});if(closed||token!==version)return;
 const [w,h]=sizes[q('[data-ratio]').value];canvas.width=w;canvas.height=h;
 drawCard(ctx,q('[data-design]').value,w,h,img,data);
 const next=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!next)throw Error('export');if(closed||token!==version)return;if(url)URL.revokeObjectURL(url);blob=next;url=URL.createObjectURL(blob);q('[data-save]').disabled=false;const file=new File([blob],'UNFRAME.png',{type:'image/png'});q('[data-native]').hidden=!navigator.canShare?.({files:[file]});status(t('card.ready',{w,h}));
 }catch{if(!closed&&token===version)status(t('card.failed'));}}
 q('[data-design]').onchange=render;q('[data-ratio]').onchange=render;await render();
}
