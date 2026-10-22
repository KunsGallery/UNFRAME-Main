import {roomPreviews} from './home-content-model.js';
import {listVirtualGalleries} from './virtual-store.js';
import {sortExhibitions,escapeHTML as e,imageURL} from './model.js';
export async function loadHomeRooms(exhibitions){
 const results=await Promise.allSettled(sortExhibitions(exhibitions.filter(item=>item.published===true)).map(async exhibition=>({exhibition,galleries:await listVirtualGalleries(exhibition.id)})));
 const rooms=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value.galleries.map(gallery=>({gallery,exhibition:result.value.exhibition})));
 return {rooms:[...new Map(rooms.filter(room=>room.gallery.settings.published===true).map(room=>[room.gallery.id,room])).values()],failed:results.some(result=>result.status==='rejected')};
}
export function viewingRoomsView(rooms,cover){
 return `<div class="home-room-heading"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>지금 열려 있는 온라인 전시 공간을 만나보세요.</p></div><div class="home-room-grid ${rooms.length===1?'is-single':rooms.length===2?'is-double':''}">${roomPreviews(rooms).map(({gallery,exhibition,preview})=>{const image=preview?.image||cover(exhibition.cover),url=`/virtual-gallery/${encodeURIComponent(gallery.id)}`;return `<article class="home-room"><a href="${url}"><div class="home-room-image">${imageURL(image?.url)?`<img src="${e(imageURL(image.url))}" alt="${e(image.alt||gallery.settings.title||exhibition.title)}" loading="lazy">`:''}<span>온라인 갤러리 입장 ↗</span></div><h3>${e(gallery.settings.title||exhibition.title)}</h3></a><p>${e(gallery.settings.subtitle||exhibition.summary)}</p><a class="home-room-parent" href="/exhibition/${encodeURIComponent(exhibition.id)}">${e(exhibition.title)} ↗</a></article>`;}).join('')}</div>`;
}
export function renderViewingRooms(rooms,cover,{failed=false}={}){
 const section=document.querySelector('#viewing-room'),target=document.querySelector('#home-viewing-room');
 section.hidden=!rooms.length&&!failed;
 if(!rooms.length){target.innerHTML=failed?'<div class="home-room-heading"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>온라인 전시 정보를 불러오지 못했습니다.</p><a href="/virtual-gallery">온라인 갤러리에서 다시 확인하기 ↗</a></div>':'';return;}
 target.innerHTML=viewingRoomsView(rooms,cover);
}
