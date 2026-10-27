import {openShareCard,exhibitionCard} from './share-card.js';
import {loadViewingRoom} from './exhibition-viewing-room.js';
import {listVirtualGalleries,getVirtualGallery} from './virtual-store.js';
import {exhibitionView,bindExhibitionImages,localizedExhibition} from './exhibition-view.js';
import {lang,t,localHref} from './i18n.js';
import {listExhibitions,getExhibition,hydrateImages,demo,subscribeExhibitions,resolveImage} from './store.js';
import {escapeHTML as e,imageURL,safeURL,dateRange,exhibitionState,stateLabels,stateEnglish,filterExhibitions,sortExhibitions} from './model.js';
import {$,chrome,errorView,toast} from './ui.js';
let renderVersion=0;
let all=[],state=new URLSearchParams(location.search).get('state')==='past'?'past':'all',year='all',query='',visible=6;
const image=(item,cls='')=>`<img class="${cls}" src="${e(imageURL(item.cover?.url)||'/assets/zero.svg')}" alt="${e(item.cover?.alt||item.title)}" loading="lazy">`;
const link=item=>localHref(`/exhibition/${encodeURIComponent(item.id)}`),states=lang()==='en'?stateEnglish:stateLabels;
const card=item=>`<a class="exhibition-card" href="${link(item)}"><div class="card-image">${image(item)}<span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-meta"><span>${e(states[exhibitionState(item)])}</span><span>${e(dateRange(item))}</span></div><h3>${e(item.title)}</h3><p class="card-location">${e(item.location)}</p></a>`;
async function index(items) {
 const version=++renderVersion;const next=await hydrateImages(items || await listExhibitions(),false);if(version!==renderVersion)return;all=next.map(localizedExhibition);
 const current=sortExhibitions(all.filter(x=>exhibitionState(x)==='current'));
 const feature=current[0];
 $('#main').innerHTML=`<section class="page-intro wrap"><h1>Exhibitions<span class="title-period">.</span></h1><div class="intro-bottom"><p>${t('list.intro')}</p><a class="text-link" href="#exhibition-list">${t('list.browseAll')}</a></div></section>${feature?`<section class="featured wrap" aria-labelledby="current-heading"><div class="section-heading"><h2 id="current-heading"><span class="status-dot"></span>NOW SHOWING</h2><span>${t('list.currentCount',{count:current.length})}</span></div><a class="featured-link" href="${link(feature)}"><div class="featured-image">${image(feature)}<span class="image-tag">${demo?'SAMPLE VISUAL':'ON VIEW'}</span></div><div class="featured-info"><div><p class="date">${e(dateRange(feature))}</p><h2>${e(feature.title)}</h2><p>${e(feature.summary)}</p></div><div class="featured-side"><p>${e(feature.location)}</p><span class="text-link">${t('home.exhibitionDetail')}</span></div></div></a>${current.length>1?`<div class="grid additional">${current.slice(1).map(card).join('')}</div>`:''}</section>`:`<section class="wrap no-current"><h2>${t('home.preparingNext')}</h2><p>${t('list.preparingIntro')}</p></section>`}<section id="exhibition-list" class="listing wrap"><div class="section-heading"><h2>EXPLORE EXHIBITIONS</h2><span id="result-count" aria-live="polite"></span></div><div class="filter-bar"><div class="tabs" role="group" aria-label="${t('list.state')}"><button data-state="all" aria-pressed="true">${t('list.all')}</button><button data-state="current" aria-pressed="false">${t('list.current')}</button><button data-state="upcoming" aria-pressed="false">${t('list.upcoming')}</button><button data-state="past" aria-pressed="false">${t('list.archive')}</button></div><div class="filter-tools"><label class="sr-only" for="year">${t('list.year')}</label><select id="year"><option value="all">${t('list.allYears')}</option>${[...new Set(all.map(x=>x.startDate.slice(0,4)))].sort().reverse().map(y=>`<option value="${e(y)}">${e(y)}</option>`).join('')}</select><label class="search"><span class="sr-only">${t('list.search')}</span><input id="search" type="search" placeholder="${t('list.search')}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></label></div></div><div id="results" class="grid"></div><div class="load-more"><button id="more" class="button secondary">${t('list.more')}</button></div></section>`;
 document.querySelectorAll('[data-state]').forEach(button=>button.addEventListener('click',()=>{state=button.dataset.state;visible=6;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderResults();}));
 $('#year').addEventListener('change',event=>{year=event.target.value;visible=6;renderResults();});
 $('#search').addEventListener('input',event=>{query=event.target.value;visible=6;renderResults();});
 $('#more').addEventListener('click',()=>{visible+=6;renderResults();});$('#year').value=year;$('#search').value=query;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));renderResults();
}
function renderResults(){const filtered=filterExhibitions(all,{state,year,query});$('#result-count').textContent=t('list.resultCount',{count:filtered.length});$('#results').innerHTML=filtered.length?filtered.slice(0,visible).map(card).join(''):`<div class="empty"><h3>${t('list.noResults')}</h3><p>${t('list.changeFilters')}</p><button id="clear-filters" class="button secondary">${t('list.showAll')}</button></div>`;$('#more').hidden=visible>=filtered.length;if($('#clear-filters'))$('#clear-filters').onclick=()=>{state='all';year='all';query='';$('#year').value='all';$('#search').value='';document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state==='all')));renderResults();};}
async function detail(id) {
 const raw=await getExhibition(id);if(!raw||!raw.published){errorView(t('detail.notFound'),t('detail.notFoundHint'));return;}
 const [hydrated]=await hydrateImages([raw]),item=localizedExhibition(hydrated);document.title=`${item.title} — UNFRAME`;
 document.querySelector('meta[name="description"]').content=item.summary;
 try{item.virtualGalleries=await listVirtualGalleries(item.id);}catch{item.virtualGalleries=[];item.virtualGalleryError=true;}
 // Each artist card shows its first work and the number of works; a failed lookup leaves a plain card.
 await Promise.allSettled(item.virtualGalleries.map(async space=>{const data=await getVirtualGallery(space.id);if(!data)return;space.count=data.artworks.length;const first=data.artworks[0];if(first)space.cover=await resolveImage(first.image);}));
 $('#main').innerHTML=exhibitionView(item);
 $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast(t('detail.linkCopied'));}catch{toast(t('detail.copyManually'));}};
 const cardButton=document.createElement('button');cardButton.type='button';cardButton.textContent=t('detail.makeCard');cardButton.onclick=()=>openShareCard(exhibitionCard(item));$('#share').after(cardButton);
 bindExhibitionImages($('#main'),item,$('#lightbox'));
 loadViewingRoom($('#main'),item);

}
chrome(demo);
const match=location.pathname.match(/^(?:\/en)?\/exhibition\/([^/]+)\/?$/);const id=match?decodeURIComponent(match[1]):new URLSearchParams(location.search).get('id');
try{if(id)await detail(id);else await subscribeExhibitions(index,()=>errorView(t('detail.loadFailed'),t('detail.checkConnection')));}catch(error){console.error(error);errorView(t('detail.loadFailed'),t('detail.loadFailedHint'));}
