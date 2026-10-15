import {escapeHTML as e,imageURL} from './model.js';
// Extend the existing exhibition: uncropped works lead, horizontal browsing stays local.
export function viewingRoomMarkup(item){
 if(item.viewingRoomEnabled!==true)return '';
 return `<section class="ex-viewing-room" id="ex-artists" aria-labelledby="ex-artists-title"><div class="ex-views-heading"><div><h2 id="ex-artists-title">참여 작가 · 대표작</h2><p>작품을 넘겨보고, 마음에 닿는 작품을 선택해보세요.</p></div><button type="button" class="text-link" data-viewing-expand>크게 감상하기 ↗</button></div><div class="viewing-content" role="status">작품을 불러오고 있습니다.</div></section>`;
}
export function mountViewingRoom(root,works){
 const section=root.querySelector('.ex-viewing-room');if(!section)return;
 const content=section.querySelector('.viewing-content');content.removeAttribute('role');
 if(!works.length){content.textContent='공개된 참여 작가의 작품을 준비하고 있습니다.';section.querySelector('[data-viewing-expand]').hidden=true;return;}
 const artists=[...new Set(works.map(work=>work.artist).filter(Boolean))];
 content.innerHTML=`<div class="viewing-toolbar"><label>참여 작가 <select aria-label="참여 작가 선택"><option value="">모든 작가</option>${artists.map(artist=>`<option>${e(artist)}</option>`).join('')}</select></label><div><button type="button" data-viewing-prev aria-label="이전 작품">←</button><button type="button" data-viewing-next aria-label="다음 작품">→</button></div></div><div class="viewing-track" tabindex="0" aria-label="참여 작가 작품 · 좌우로 넘겨보기"></div><p class="viewing-count" aria-live="polite"></p><dialog class="viewing-detail" aria-label="작품 상세"><button type="button" class="viewing-close">닫기</button><div class="viewing-detail-content"></div></dialog>`;
 const track=content.querySelector('.viewing-track'),detail=content.querySelector('dialog');
 let visible=works;
 const render=()=>{track.innerHTML=visible.map((art,index)=>`<article class="viewing-work"><button type="button" data-work="${index}" aria-label="${e(art.title)} 상세 보기"><img src="${e(imageURL(art.image?.url))}" alt="${e(art.image?.alt||art.title)}" loading="lazy"></button><div><p>${e(art.artist)}</p><h3>${e(art.title)}</h3><small>${e([art.year,art.medium,art.heightCm&&art.widthCm?`${art.heightCm} × ${art.widthCm} cm`:''].filter(Boolean).join(' · '))}</small></div></article>`).join('');track.scrollLeft=0;content.querySelector('.viewing-count').textContent=`${visible.length}점의 작품`;
 track.querySelectorAll('[data-work]').forEach(button=>button.onclick=()=>{const art=visible[Number(button.dataset.work)];detail.querySelector('.viewing-detail-content').innerHTML=`<img src="${e(imageURL(art.image?.url))}" alt="${e(art.image?.alt||art.title)}"><div><p>${e(art.artist)}</p><h3>${e(art.title)}</h3><p>${e([art.year,art.medium,art.heightCm&&art.widthCm?`${art.heightCm} × ${art.widthCm} cm`:''].filter(Boolean).join(' · '))}</p><p class="viewing-description">${e(art.description)}</p><a href="/virtual-gallery/${encodeURIComponent(art.galleryId)}">작가의 갤러리에서 감상하기 ↗</a></div>`;detail.showModal();});};
 content.querySelector('select').onchange=event=>{visible=works.filter(work=>!event.target.value||work.artist===event.target.value);render();};
 const move=direction=>track.scrollBy({left:direction*track.clientWidth*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 content.querySelector('[data-viewing-prev]').onclick=()=>move(-1);content.querySelector('[data-viewing-next]').onclick=()=>move(1);
 detail.querySelector('.viewing-close').onclick=()=>detail.close();detail.onclick=event=>{if(event.target===detail)detail.close();};
 const expand=section.querySelector('[data-viewing-expand]');expand.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await section.requestFullscreen();}catch{section.classList.toggle('viewing-expanded');expand.textContent=section.classList.contains('viewing-expanded')?'기본 크기로 보기':'크게 감상하기 ↗';}};
 document.addEventListener('fullscreenchange',()=>{expand.textContent=document.fullscreenElement===section?'기본 크기로 보기':'크게 감상하기 ↗';});
 section.addEventListener('keydown',event=>{if(event.key==='Escape'&&section.classList.contains('viewing-expanded')){section.classList.remove('viewing-expanded');expand.textContent='크게 감상하기 ↗';}});
 render();
}

export async function loadViewingRoom(root,item){
 if(item.viewingRoomEnabled!==true)return;
 try{
  const {listVirtualGalleries,getVirtualGallery}=await import('./virtual-store.js');
  const {resolveImage}=await import('./store.js');
  const galleries=item.virtualGalleries||await listVirtualGalleries(item.id);
  const results=await Promise.allSettled(galleries.map(async space=>{const data=await getVirtualGallery(space.id);if(!data)return [];return Promise.all(data.artworks.map(async art=>({...art,galleryId:space.id,image:await resolveImage(art.image)})));}));
  const works=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value);
  if(!works.length&&results.some(result=>result.status==='rejected'))throw new Error('작품을 불러오지 못했습니다.');
  mountViewingRoom(root,works);
 }catch{const content=root.querySelector('.viewing-content');if(content)content.textContent='작품을 불러오지 못했습니다. 잠시 후 새로고침해주세요.';const expand=root.querySelector('[data-viewing-expand]');if(expand)expand.hidden=true;}
}
