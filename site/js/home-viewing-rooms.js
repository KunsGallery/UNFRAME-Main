import {listVirtualGalleries} from './virtual-store.js';
import {sortExhibitions,escapeHTML as e,imageURL} from './model.js';
let generation=0;
export async function renderViewingRooms(exhibitions,cover){
 const version=++generation,target=document.querySelector('#home-viewing-room');
 const results=await Promise.allSettled(sortExhibitions(exhibitions).map(async exhibition=>({exhibition,galleries:await listVirtualGalleries(exhibition.id)})));
 if(version!==generation)return;
 const allRooms=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value.galleries.map(gallery=>({gallery,exhibition:result.value.exhibition})));
 const rooms=allRooms.slice(0,3);
 const links=Object.fromEntries(allRooms.map(({gallery,exhibition})=>[exhibition.id,gallery.settings.artistName?`/exhibition/${encodeURIComponent(exhibition.id)}#ex-online`:`/virtual-gallery/${encodeURIComponent(gallery.id)}`]));
 const first=rooms[0];
 if(!first){target.innerHTML=`<div class="viewing-copy"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>${results.some(result=>result.status==='rejected')?'온라인 전시를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.':'공개될 온라인 전시를 준비하고 있습니다.'}</p><a href="/virtual-gallery">버추얼갤러리 살펴보기 ↗</a></div>`;return links;}
 const {gallery,exhibition}=first,image=cover(exhibition.cover);
 target.innerHTML=`<div class="viewing-copy"><h2 id="viewing-room-title">${e(gallery.settings.title||exhibition.title)}</h2><p class="viewing-artist">${e(gallery.settings.artistName||exhibition.artists)}</p><p>${e(gallery.settings.subtitle||exhibition.summary)}</p><div class="viewing-actions"><a href="/virtual-gallery/${encodeURIComponent(gallery.id)}">갤러리 입장</a><a href="/exhibition/${encodeURIComponent(exhibition.id)}#ex-online">전시 · 참여 작가 갤러리 ↗</a></div></div><a class="viewing-image" href="/virtual-gallery/${encodeURIComponent(gallery.id)}"><img src="${e(imageURL(image?.url))}" alt="${e(exhibition.cover?.alt||exhibition.title)}" loading="lazy"><span>작품을 온라인 공간에서 만나보세요 ↗</span></a>${rooms.length>1?`<div class="viewing-more">${rooms.slice(1).map(({gallery})=>`<a href="/virtual-gallery/${encodeURIComponent(gallery.id)}">${e(gallery.settings.artistName||gallery.settings.title)} ↗</a>`).join('')}</div>`:''}`;
 return links;
}
