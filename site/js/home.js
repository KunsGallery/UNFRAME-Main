import './home-projects.js';
import './home-contact.js';
import {renderViewingRooms,loadHomeRooms} from './home-viewing-rooms.js';
import {getVirtualGallery} from './virtual-store.js';
import {currentExhibitionsView} from './home-exhibition-artworks.js';
import {heroExhibitions,createRoomSelection,exhibitionWorks,roomPreviews} from './home-content-model.js';
import {renderNews} from './home-news.js';
import {demo,subscribeExhibitions,resolveImage} from './store.js';
import {subscribeHighlights} from './highlights.js';
import {selectedHighlights} from './highlight-model.js';
import {dateRange,exhibitionState,sortExhibitions,todaySeoul} from './model.js';
import {chrome} from './ui.js';
import {t,localized,localHref} from './i18n.js';
import {CONFIG} from '../config.js';
import {publicHomeCover} from './home-media.js';
import {setHeroSlides,setHeroFailure} from './home-slider.js';
chrome(demo,true);
new ResizeObserver(()=>document.documentElement.style.setProperty('--home-nav-height',`${document.querySelector('#site-header').getBoundingClientRect().height}px`)).observe(document.querySelector('#site-header'));
const projects=document.querySelector('#projects');
new ResizeObserver(()=>document.documentElement.style.setProperty('--home-project-height',`${Math.ceil(projects.getBoundingClientRect().height)}px`)).observe(projects);

let galleryLinks={},generation=0,exhibitions=[],highlights=[],exhibitionsReady=false,highlightsReady=false,exhibitionsFailed=false,highlightsFailed=false;
const selectRooms=createRoomSelection();
let pageImages=[];
function clearPageImages(){for(const url of pageImages)URL.revokeObjectURL(url);pageImages=[];}
addEventListener('pagehide',()=>{generation++;clearPageImages();});
addEventListener('pageshow',event=>{if(event.persisted&&exhibitionsReady)renderCurrent(exhibitions);});
const cover=image=>demo?image:publicHomeCover(image,CONFIG.mediaBaseUrl);
async function updateHero(){
 if(!exhibitionsReady||!highlightsReady)return;
 const entries=[...heroExhibitions(exhibitions).map(item=>({key:`exhibition-${item.id}`,kind:exhibitionState(item)==='upcoming'?t('home.upcomingExhibition'):t('home.currentExhibition'),title:localized(item,'title'),artists:item.artists,location:localized(item,'location'),summary:localized(item,'summary'),date:dateRange(item),cover:item.cover,url:localHref(`/exhibition/${encodeURIComponent(item.id)}`),action:t('home.viewExhibition'),secondaryUrl:galleryLinks[item.id]})),...selectedHighlights(highlights).filter(item=>item.kind!=='virtual').map(item=>({key:`highlight-${item.id}`,kind:`${item.project?item.project+' · ':''}${item.startDate>todaySeoul()?t('home.upcomingEvent'):item.kind==='news'?t('home.projectNews'):t('home.projectEvent')}`,title:localized(item,'title'),summary:localized(item,'summary'),date:item.startDate?dateRange(item):'',cover:item.cover,url:localHref(item.url),action:item.kind==='news'?t('home.viewNews'):t('home.viewEvent')}))];
 if(!entries.length&&(exhibitionsFailed||highlightsFailed)){setHeroFailure();return;}
 setHeroSlides(entries.map(item=>({...item,image:cover(item.cover)?.url,alt:item.cover?.alt})));
}
async function renderCurrent(items){
 exhibitions=items;exhibitionsReady=true;exhibitionsFailed=false;updateHero();
 const version=++generation,target=document.querySelector('#home-exhibitions'),announcement=document.querySelector('#home-announcement-link');
 const current=sortExhibitions(items.filter(item=>exhibitionState(item)==='current'))[0];
 if(current){announcement.textContent=t('home.announceCurrent',{title:localized(current,'title'),date:dateRange(current)});announcement.href=localHref(`/exhibition/${encodeURIComponent(current.id)}`);}else{announcement.textContent=t('nav.announcement');announcement.href=localHref('/exhibition');}
 target.innerHTML=currentExhibitionsView(items,[],cover,{loading:true});
 const newImages=[],cache=new Map();
 const hydrate=image=>{const key=image?.path||image?.url;if(!key)return Promise.resolve(image);if(!cache.has(key))cache.set(key,resolveImage(image).then(im=>{if(im.url?.startsWith('blob:'))newImages.push(im.url);return im;}));return cache.get(key);};
 try{
  const {rooms,failed}=await loadHomeRooms(items);if(version!==generation)return;
  const chosen=selectRooms(rooms),needed=rooms.filter(room=>exhibitionState(room.exhibition)==='current'||chosen.some(choice=>choice.gallery.id===room.gallery.id));
  const results=await Promise.allSettled(needed.map(async room=>{const full=await getVirtualGallery(room.gallery.id,{artworkLimit:4});return full?.settings.published?{...room,gallery:{...room.gallery,settings:full.settings,artworks:full.artworks}}:null;}));
  const raw=results.filter(result=>result.status==='fulfilled'&&result.value).map(result=>result.value),wanted=new Set();
  for(const exhibition of items.filter(item=>exhibitionState(item)==='current'))for(const {artwork} of exhibitionWorks(exhibition.id,raw))wanted.add(artwork.image.path||artwork.image.url);
  for(const {preview} of roomPreviews(chosen.map(choice=>raw.find(room=>room.gallery.id===choice.gallery.id)).filter(Boolean)))if(preview)wanted.add(preview.image.path||preview.image.url);
  let mediaFailed=false;
  const loaded=await Promise.all(raw.map(async room=>{const artworkResults=await Promise.allSettled(room.gallery.artworks.filter(work=>wanted.has(work.image?.path||work.image?.url)).map(async work=>({...work,image:await hydrate(work.image)})));if(artworkResults.some(x=>x.status==='rejected'))mediaFailed=true;return {...room,gallery:{...room.gallery,artworks:artworkResults.filter(x=>x.status==='fulfilled').map(x=>x.value)}};}));
  if(version!==generation){for(const url of newImages)URL.revokeObjectURL(url);return;}
  const roomFailure=failed||mediaFailed||results.some(result=>result.status==='rejected');
  target.innerHTML=currentExhibitionsView(items,loaded,cover,{failed:roomFailure});
  renderViewingRooms(chosen.map(choice=>loaded.find(room=>room.gallery.id===choice.gallery.id)).filter(Boolean),cover,{failed:roomFailure});
  galleryLinks=Object.fromEntries(rooms.map(({exhibition})=>[exhibition.id,localHref(`/exhibition/${encodeURIComponent(exhibition.id)}`)+'#ex-online']));updateHero();
  clearPageImages();pageImages=newImages;
 }catch{if(version===generation){target.innerHTML=currentExhibitionsView(items,[],cover,{failed:true});renderViewingRooms([],cover,{failed:true});}for(const url of newImages)URL.revokeObjectURL(url);}
}
function exhibitionError(){generation++;document.querySelector('#viewing-room').hidden=false;clearPageImages();document.querySelector('#home-viewing-room').innerHTML=`<div class="viewing-copy"><h2 id="viewing-room-title">Online Viewing Rooms</h2><p>${t('home.roomsFailed')}</p><a href="${localHref('/virtual-gallery')}">${t('home.exploreGallery')}</a></div>`;exhibitions=[];exhibitionsReady=true;exhibitionsFailed=true;updateHero();document.querySelector('#home-exhibitions').innerHTML=`<div class="home-empty"><p>${t('home.exhibitionsFailed')}</p><a href="${localHref('/exhibition')}">${t('home.goExhibitions')}</a></div>`;}
function highlightsError(){highlights=[];highlightsReady=true;highlightsFailed=true;updateHero();renderNews([],true);}
subscribeExhibitions(renderCurrent,exhibitionError).catch(exhibitionError);
subscribeHighlights(items=>{highlights=items;highlightsReady=true;highlightsFailed=false;updateHero();renderNews(items);},highlightsError).catch(highlightsError);
