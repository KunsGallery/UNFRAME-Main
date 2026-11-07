import {exhibitionState,sortExhibitions} from './model.js';
import {onePerArtist} from './artwork-mix.js';
// Most recently ended published exhibitions, newest first: the home page shows these when nothing is on.
export function pastExhibitions(items,today,limit=3){return items.filter(item=>item.published===true&&exhibitionState(item,today)==='past').sort((a,b)=>String(b.endDate).localeCompare(String(a.endDate))||String(b.startDate).localeCompare(String(a.startDate))).slice(0,limit);}
// The exhibitions the home section shows: those on view, or else the latest one that ended.
export function homeExhibitions(items,today){const current=sortExhibitions(items.filter(item=>item.published===true&&exhibitionState(item,today)==='current'));return current.length?{items:current,past:false}:{items:pastExhibitions(items,today,1),past:true};}
export function heroExhibitions(items,today){const active=items.filter(item=>item.published===true&&exhibitionState(item,today)!=='past');return [...sortExhibitions(active.filter(item=>exhibitionState(item,today)==='current')),...sortExhibitions(active.filter(item=>exhibitionState(item,today)==='upcoming'))];}
// Stable within this page visit; a fresh visit assigns new random priorities.
export function createRoomSelection(random=Math.random){const priorities=new Map();return (rooms,limit=3)=>{const unique=[...new Map(rooms.filter(room=>room.gallery.settings.published===true&&room.exhibition.published===true).map(room=>[room.gallery.id,room])).values()];for(const room of unique)if(!priorities.has(room.gallery.id))priorities.set(room.gallery.id,random());return unique.sort((a,b)=>priorities.get(a.gallery.id)-priorities.get(b.gallery.id)).slice(0,limit);};}
// One work per artist, chosen at random; pass the same seeded random for repeated calls in one render.
export function exhibitionWorks(exhibitionId,rooms,limit=8,random=Math.random){const seen=new Set();const unique=rooms.filter(room=>room.exhibition.id===exhibitionId&&room.exhibition.published===true&&room.gallery.settings.published===true).flatMap(room=>(room.gallery.artworks||[]).map(artwork=>({artwork,galleryId:room.gallery.id}))).filter(({artwork})=>{const key=artwork.image?.path||artwork.image?.url;if(!key||seen.has(key))return false;seen.add(key);return true;});
 return onePerArtist(unique,random,limit);}

export function roomPreviews(rooms){const seen=new Set();return rooms.map(room=>{const works=(room.gallery.artworks||[]).filter(work=>work.image?.path||work.image?.url),key=work=>work.image.path||work.image.url;const preview=works.find(work=>!seen.has(key(work)))||works[0];if(preview)seen.add(key(preview));return {...room,preview};});}
