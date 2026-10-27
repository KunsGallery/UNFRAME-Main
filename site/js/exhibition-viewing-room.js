import {openShareCard} from './share-card.js';
import {escapeHTML as e,imageURL} from './model.js';
import {mixByArtist} from './artwork-mix.js';
import {t,localized,localHref} from './i18n.js';
// Artwork text shown on English pages, falling back to Korean.
const localizedArtwork=art=>({...art,title:localized(art,'title'),medium:localized(art,'medium'),description:localized(art,'description')});
// Extend the existing exhibition: uncropped works lead, horizontal browsing stays local.
export function viewingRoomMarkup(item){
 if(item.viewingRoomEnabled!==true)return '';
 return `<section class="ex-viewing-room" id="ex-artists" aria-labelledby="ex-artists-title"><div class="ex-views-heading"><div><h2 id="ex-artists-title">${t('ex.artistsWorks')}</h2><p>${t('room.intro')}</p></div><button type="button" class="text-link" data-viewing-expand>${t('room.expand')}</button></div><div class="viewing-content" role="status">${t('room.loading')}</div></section>`;
}
export function mountViewingRoom(root,works,item){
 const section=root.querySelector('.ex-viewing-room');if(!section)return;
 const content=section.querySelector('.viewing-content');content.removeAttribute('role');
 if(!works.length){content.textContent=t('room.preparing');section.querySelector('[data-viewing-expand]').hidden=true;return;}
 const artists=[...new Set(works.map(work=>work.artist).filter(Boolean))];
 content.innerHTML=`<div class="viewing-toolbar"><label>${t('room.artist')} <select aria-label="${t('room.chooseArtist')}"><option value="">${t('room.allArtists')}</option>${artists.map(artist=>`<option>${e(artist)}</option>`).join('')}</select></label><div><button type="button" data-viewing-prev aria-label="${t('room.previous')}">←</button><button type="button" data-viewing-next aria-label="${t('room.next')}">→</button></div></div><div class="viewing-track" tabindex="0" aria-label="${t('room.track')}"></div><p class="viewing-count" aria-live="polite"></p><dialog class="viewing-detail" aria-label="${t('room.detail')}"><button type="button" class="viewing-close">${t('index.t23')}</button><div class="viewing-detail-content"></div></dialog>`;
 const track=content.querySelector('.viewing-track'),detail=content.querySelector('dialog');
 let visible=works;
 const render=()=>{track.innerHTML=visible.map((art,index)=>`<article class="viewing-work"><button type="button" data-work="${index}" aria-label="${e(t('room.workDetail',{title:art.title}))}"><img src="${e(imageURL(art.image?.url))}" alt="${e(art.image?.alt||art.title)}" loading="lazy"></button><div><p>${e(art.artist)}</p><h3>${e(art.title)}</h3><small>${e([art.year,art.medium,art.heightCm&&art.widthCm?`${art.heightCm} × ${art.widthCm} cm`:''].filter(Boolean).join(' · '))}</small></div></article>`).join('');track.scrollLeft=0;content.querySelector('.viewing-count').textContent=t('room.count',{count:visible.length});
 track.querySelectorAll('[data-work]').forEach(button=>button.onclick=()=>{const art=visible[Number(button.dataset.work)];detail.querySelector('.viewing-detail-content').innerHTML=`<img src="${e(imageURL(art.image?.url))}" alt="${e(art.image?.alt||art.title)}"><div><p>${e(art.artist)}</p><h3>${e(art.title)}</h3><p>${e([art.year,art.medium,art.heightCm&&art.widthCm?`${art.heightCm} × ${art.widthCm} cm`:''].filter(Boolean).join(' · '))}</p><p class="viewing-description">${e(art.description)}</p><a href="${localHref(`/virtual-gallery/${encodeURIComponent(art.galleryId)}`)}">${t('room.inGallery')}</a></div>`;if(item?.published&&root.querySelector('#share')){const share=document.createElement('button');share.type='button';share.textContent=t('room.shareCard');share.onclick=()=>openShareCard({title:art.title,artist:art.artist,meta:[item.title,art.year,art.medium].filter(Boolean).join(' · '),image:art.image?.url,url:location.origin+localHref('/exhibition/'+encodeURIComponent(item.id))});detail.querySelector('.viewing-detail-content > div').append(share);}detail.showModal();});};
 content.querySelector('select').onchange=event=>{visible=works.filter(work=>!event.target.value||work.artist===event.target.value);render();};
 const move=direction=>track.scrollBy({left:direction*track.clientWidth*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 content.querySelector('[data-viewing-prev]').onclick=()=>move(-1);content.querySelector('[data-viewing-next]').onclick=()=>move(1);
 detail.querySelector('.viewing-close').onclick=()=>detail.close();detail.onclick=event=>{if(event.target===detail)detail.close();};
 const expand=section.querySelector('[data-viewing-expand]');expand.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await section.requestFullscreen();}catch{section.classList.toggle('viewing-expanded');expand.textContent=section.classList.contains('viewing-expanded')?t('room.shrink'):t('room.expand');}};
 document.addEventListener('fullscreenchange',()=>{expand.textContent=document.fullscreenElement===section?t('room.shrink'):t('room.expand');});
 section.addEventListener('keydown',event=>{if(event.key==='Escape'&&section.classList.contains('viewing-expanded')){section.classList.remove('viewing-expanded');expand.textContent=t('room.expand');}});
 render();
}

export async function loadViewingRoom(root,item){
 if(item.viewingRoomEnabled!==true)return;
 try{
  const {listVirtualGalleries,getVirtualGallery}=await import('./virtual-store.js');
  const {resolveImage}=await import('./store.js');
  const galleries=item.virtualGalleries||await listVirtualGalleries(item.id);
  const results=await Promise.allSettled(galleries.map(async space=>{const data=await getVirtualGallery(space.id);if(!data)return [];return Promise.all(data.artworks.map(async art=>({...localizedArtwork(art),galleryId:space.id,image:await resolveImage(art.image)})));}));
  // Artists take turns in a random order so the first artist's room never fills the start of the slider.
  const works=mixByArtist(results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value));
  if(!works.length&&results.some(result=>result.status==='rejected'))throw new Error('artworks unavailable');
  mountViewingRoom(root,works,item);
 }catch{const content=root.querySelector('.viewing-content');if(content)content.textContent=t('room.failed');const expand=root.querySelector('[data-viewing-expand]');if(expand)expand.hidden=true;}
}
