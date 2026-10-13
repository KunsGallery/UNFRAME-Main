import {exhibitionView,bindExhibitionImages} from './exhibition-view.js';
import {listExhibitions,getExhibition,hydrateImages,demo,subscribeExhibitions} from './store.js';
import {escapeHTML as e,imageURL,safeURL,dateRange,exhibitionState,stateLabels,stateEnglish,filterExhibitions,sortExhibitions} from './model.js';
import {$,chrome,errorView,toast} from './ui.js';
let renderVersion=0;
let all=[],state=new URLSearchParams(location.search).get('state')==='past'?'past':'all',year='all',query='',visible=6;
const image=(item,cls='')=>`<img class="${cls}" src="${e(imageURL(item.cover?.url)||'/assets/zero.svg')}" alt="${e(item.cover?.alt||item.title)}" loading="lazy">`;
const link=item=>`/exhibition/${encodeURIComponent(item.id)}`;
const card=item=>`<a class="exhibition-card" href="${link(item)}"><div class="card-image">${image(item)}<span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-meta"><span>${e(stateLabels[exhibitionState(item)])}</span><span>${e(dateRange(item))}</span></div><h3>${e(item.title)}</h3><p class="card-location">${e(item.location)}</p></a>`;
async function index(items) {
 const version=++renderVersion;const next=await hydrateImages(items || await listExhibitions(),false);if(version!==renderVersion)return;all=next;
 const current=sortExhibitions(all.filter(x=>exhibitionState(x)==='current'));
 const feature=current[0];
 $('#main').innerHTML=`<section class="page-intro wrap"><h1>Exhibitions<span class="title-period">.</span></h1><div class="intro-bottom"><p>언프레임이 큐레이션한 동시대 예술의 흐름.<br>경계를 넘나드는 다양한 전시를 만나보세요.</p><a class="text-link" href="#exhibition-list">모든 전시 살펴보기 ↓</a></div></section>${feature?`<section class="featured wrap" aria-labelledby="current-heading"><div class="section-heading"><h2 id="current-heading"><span class="status-dot"></span>NOW SHOWING</h2><span>${current.length}개의 현재 전시</span></div><a class="featured-link" href="${link(feature)}"><div class="featured-image">${image(feature)}<span class="image-tag">${demo?'SAMPLE VISUAL':'ON VIEW'}</span></div><div class="featured-info"><div><p class="date">${e(dateRange(feature))}</p><h2>${e(feature.title)}</h2><p>${e(feature.summary)}</p></div><div class="featured-side"><p>${e(feature.location)}</p><span class="text-link">전시 자세히 보기 ↗</span></div></div></a>${current.length>1?`<div class="grid additional">${current.slice(1).map(card).join('')}</div>`:''}</section>`:`<section class="wrap no-current"><h2>지금은 다음 전시를 준비하고 있습니다.</h2><p>예정 전시와 지난 전시 기록을 아래에서 만나보세요.</p></section>`}<section id="exhibition-list" class="listing wrap"><div class="section-heading"><h2>EXPLORE EXHIBITIONS</h2><span id="result-count" aria-live="polite"></span></div><div class="filter-bar"><div class="tabs" role="group" aria-label="전시 상태"><button data-state="all" aria-pressed="true">전체</button><button data-state="current" aria-pressed="false">현재</button><button data-state="upcoming" aria-pressed="false">예정</button><button data-state="past" aria-pressed="false">아카이브</button></div><div class="filter-tools"><label class="sr-only" for="year">연도</label><select id="year"><option value="all">모든 연도</option>${[...new Set(all.map(x=>x.startDate.slice(0,4)))].sort().reverse().map(y=>`<option value="${e(y)}">${e(y)}</option>`).join('')}</select><label class="search"><span class="sr-only">전시·작가 검색</span><input id="search" type="search" placeholder="전시·작가 검색"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></label></div></div><div id="results" class="grid"></div><div class="load-more"><button id="more" class="button secondary">전시 더 보기</button></div></section>`;
 document.querySelectorAll('[data-state]').forEach(button=>button.addEventListener('click',()=>{state=button.dataset.state;visible=6;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderResults();}));
 $('#year').addEventListener('change',event=>{year=event.target.value;visible=6;renderResults();});
 $('#search').addEventListener('input',event=>{query=event.target.value;visible=6;renderResults();});
 $('#more').addEventListener('click',()=>{visible+=6;renderResults();});$('#year').value=year;$('#search').value=query;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));renderResults();
}
function renderResults(){const filtered=filterExhibitions(all,{state,year,query});$('#result-count').textContent=`${filtered.length}개의 전시`;$('#results').innerHTML=filtered.length?filtered.slice(0,visible).map(card).join(''):'<div class="empty"><h3>찾으시는 전시가 없습니다.</h3><p>검색어나 필터를 바꿔보세요.</p><button id="clear-filters" class="button secondary">전체 전시 보기</button></div>';$('#more').hidden=visible>=filtered.length;if($('#clear-filters'))$('#clear-filters').onclick=()=>{state='all';year='all';query='';$('#year').value='all';$('#search').value='';document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state==='all')));renderResults();};}
async function detail(id) {
 const raw=await getExhibition(id);if(!raw||!raw.published){errorView('전시를 찾을 수 없습니다.','주소를 확인하거나 전시 목록으로 돌아가주세요.');return;}
 const [item]=await hydrateImages([raw]);document.title=`${item.title} — UNFRAME`;
 document.querySelector('meta[name="description"]').content=item.summary;
 $('#main').innerHTML=exhibitionView(item);
 $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('전시 링크를 복사했습니다.');}catch{toast('주소창의 링크를 복사해주세요.');}};
 bindExhibitionImages($('#main'),item,$('#lightbox'));
}
chrome(demo);
const match=location.pathname.match(/^\/exhibition\/([^/]+)\/?$/);const id=match?decodeURIComponent(match[1]):new URLSearchParams(location.search).get('id');
try{if(id)await detail(id);else await subscribeExhibitions(index,()=>errorView('전시를 불러오지 못했습니다.','연결 상태를 확인하고 다시 시도해주세요.'));}catch(error){console.error(error);errorView('전시를 불러오지 못했습니다.','잠시 후 다시 시도해주세요. 연결 설정이 완료되지 않았거나 열람 권한에 문제가 있을 수 있습니다.');}
