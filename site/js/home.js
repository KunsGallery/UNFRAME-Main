import './home-projects.js';
import {renderNews} from './home-news.js';
import {demo,subscribeExhibitions,hydrateImages,resolveImage} from './store.js';
import {subscribeHighlights} from './highlights.js';
import {selectedHighlights} from './highlight-model.js';
import {escapeHTML as e,imageURL,dateRange,exhibitionState,sortExhibitions,todaySeoul} from './model.js';
import {chrome} from './ui.js';
import {setHeroSlides} from './home-slider.js';
chrome(demo,true);
new ResizeObserver(()=>document.documentElement.style.setProperty('--home-nav-height',`${document.querySelector('#custom-nav').getBoundingClientRect().height}px`)).observe(document.querySelector('#custom-nav'));

let generation=0,heroGeneration=0,heroURLs=[],exhibitions=[],highlights=[];
async function updateHero(){
 const version=++heroGeneration;
 const entries=[...sortExhibitions(exhibitions.filter(item=>exhibitionState(item)==='current')).map(item=>({key:`exhibition-${item.id}`,kind:'현재 전시',title:item.title,summary:item.summary,date:dateRange(item),cover:item.cover,url:`/exhibition/${encodeURIComponent(item.id)}`,action:'전시 보기'})),...selectedHighlights(highlights).map(item=>({key:`highlight-${item.id}`,kind:item.kind==='virtual'?'Featured · 버추얼 갤러리':`${item.project?item.project+' · ':''}${item.startDate>todaySeoul()?'예정 이벤트':item.kind==='news'?'프로젝트 소식':'프로젝트 이벤트'}`,title:item.title,summary:item.summary,date:item.startDate?dateRange(item):'',cover:item.cover,url:item.url,action:item.kind==='virtual'?'버추얼 갤러리 보기':item.kind==='news'?'소식 보기':'이벤트 보기'}))];
 const results=await Promise.allSettled(entries.map(async item=>{const image=await resolveImage(item.cover);return {...item,image:image?.url,alt:image?.alt};}));
 const ready=results.filter(result=>result.status==='fulfilled').map(result=>result.value);const urls=ready.map(item=>item.image).filter(url=>url?.startsWith('blob:'));
 if(version!==heroGeneration){urls.forEach(url=>URL.revokeObjectURL(url));return;}
 setHeroSlides(ready);heroURLs.forEach(url=>URL.revokeObjectURL(url));heroURLs=urls;
}
async function renderCurrent(items){
 exhibitions=items;updateHero();const version=++generation;const target=document.querySelector('#home-exhibitions');const featured=sortExhibitions(items.filter(x=>exhibitionState(x)==='current'))[0];
 if(!featured){target.innerHTML='<div class="home-empty"><p>지금은 다음 전시를 준비하고 있습니다.</p><a href="/exhibition">예정 전시와 아카이브 살펴보기 ↗</a></div>';return;}
 try{const [item]=await hydrateImages([featured],false);if(version!==generation)return;target.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center"><a class="md:col-span-7 aspect-[16/10] home-exhibition-image overflow-hidden" href="/exhibition/${encodeURIComponent(item.id)}"><img src="${e(imageURL(item.cover.url))}" alt="${e(item.cover.alt||item.title)}"></a><div class="md:col-span-5"><p class="home-live-date">${e(dateRange(item))}</p><h3 class="home-live-title">${e(item.title)}</h3><p class="home-live-copy">${e(item.summary)}</p><p style="font-size:12px;color:#555;margin-bottom:24px">${e(item.location)}</p><div class="home-live-actions"><a href="/exhibition/${encodeURIComponent(item.id)}">전시 상세 정보 ↗</a><a href="/exhibition">전체 전시 보기</a></div></div></div>${items.filter(x=>exhibitionState(x)==='current').length>1?'<p class="home-update-status">더 많은 현재 전시는 전체 전시 페이지에서 확인할 수 있습니다.</p>':''}`;}catch{target.innerHTML='<div class="home-empty"><p>전시 사진을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p><a href="/exhibition">전시 목록으로 이동</a></div>';}
}
subscribeExhibitions(renderCurrent,()=>{exhibitions=[];updateHero();document.querySelector('#home-exhibitions').innerHTML='<div class="home-empty"><p>전시 정보를 불러오지 못했습니다. 연결 상태를 확인해주세요.</p><a href="/exhibition">전시 페이지로 이동</a></div>';}).catch(()=>{document.querySelector('#home-exhibitions').innerHTML='<p>전시 연결 설정이 아직 완료되지 않았습니다.</p>';});
subscribeHighlights(items=>{highlights=items;updateHero();renderNews(items);},()=>{highlights=[];updateHero();renderNews([],true);}).catch(()=>{highlights=[];updateHero();renderNews([],true);});
