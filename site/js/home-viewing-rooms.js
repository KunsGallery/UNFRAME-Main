import {roomPreviews} from './home-content-model.js';
import {listVirtualGalleries} from './virtual-store.js';
import {sortExhibitions,escapeHTML as e,imageURL} from './model.js';
import {t,localized,localHref} from './i18n.js';
export async function loadHomeRooms(exhibitions){
 const results=await Promise.allSettled(sortExhibitions(exhibitions.filter(item=>item.published===true)).map(async exhibition=>({exhibition,galleries:await listVirtualGalleries(exhibition.id)})));
 const rooms=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value.galleries.map(gallery=>({gallery,exhibition:result.value.exhibition})));
 return {rooms:[...new Map(rooms.filter(room=>room.gallery.settings.published===true).map(room=>[room.gallery.id,room])).values()],failed:results.some(result=>result.status==='rejected')};
}
export function viewingRoomsView(rooms,cover){
 return `<div class="home-room-heading"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>${t('rooms.intro')}</p></div><div class="home-room-grid ${rooms.length===1?'is-single':rooms.length===2?'is-double':''}">${roomPreviews(rooms).map(({gallery,exhibition,preview})=>{const image=preview?.image||cover(exhibition.cover),url=localHref(`/virtual-gallery/${encodeURIComponent(gallery.id)}`),name=localized(gallery.settings,'title')||localized(exhibition,'title');return `<article class="home-room"><a href="${url}"><div class="home-room-image">${imageURL(image?.url)?`<img src="${e(imageURL(image.url))}" alt="${e(image.alt||name)}" loading="lazy">`:''}<span>${t('rooms.enter')}</span></div><h3>${e(name)}</h3></a><p>${e(localized(gallery.settings,'subtitle')||localized(exhibition,'summary'))}</p><a class="home-room-parent" href="${localHref(`/exhibition/${encodeURIComponent(exhibition.id)}`)}">${e(localized(exhibition,'title'))} ↗</a></article>`;}).join('')}</div>`;
}
export function renderViewingRooms(rooms,cover,{failed=false}={}){
 const section=document.querySelector('#viewing-room'),target=document.querySelector('#home-viewing-room');
 section.hidden=!rooms.length&&!failed;
 if(!rooms.length){target.innerHTML=failed?`<div class="home-room-heading"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>${t('rooms.failed')}</p><a href="${localHref('/virtual-gallery')}">${t('rooms.retry')}</a></div>`:'';return;}
 target.innerHTML=viewingRoomsView(rooms,cover);
}
