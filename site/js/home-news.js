import {selectedNews} from './highlight-model.js';
import {resolveImage} from './store.js';
import {escapeHTML as e,imageURL,safeURL,dateRange} from './model.js';
let generation=0,ownedURLs=[];
export async function renderNews(items,failed=false){
 const target=document.querySelector('#home-news');if(!target)return;
 const version=++generation;
 const selected=selectedNews(items).slice(0,3);
 const results=await Promise.allSettled(selected.map(async item=>({...item,cover:await resolveImage(item.cover)})));
 const ready=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
 const urls=ready.map(x=>x.cover?.url).filter(x=>x?.startsWith('blob:'));
 if(version!==generation){urls.forEach(url=>URL.revokeObjectURL(url));return;}
 ownedURLs.forEach(url=>URL.revokeObjectURL(url));ownedURLs=urls;
 if(!selected.length){target.innerHTML=`<div class="home-news-message"><p>${failed?'소식을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.':'다음 프로젝트 소식을 준비하고 있습니다.'}</p><a href="/project">네 가지 프로젝트 만나보기 ↗</a></div>`;return;}
 if(!ready.length){target.innerHTML='<p class="home-news-message">소식 이미지를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>';return;}
 target.innerHTML=`<div class="home-news-grid${ready.length===1?' is-single':''}">${ready.map((item,index)=>`<a class="home-news-item${index===0?' is-lead':''}" href="${e(safeURL(item.url))}"><div class="home-news-image"><img src="${e(imageURL(item.cover?.url))}" alt="${e(item.cover?.alt||item.title)}" loading="lazy"></div><div class="home-news-copy"><div class="home-news-meta"><span>${e(item.project)}</span><span>${item.startDate?e(dateRange(item)):item.kind==='news'?'소식':'이벤트'}</span></div><h3>${e(item.title)}</h3>${item.summary?`<p>${e(item.summary)}</p>`:''}<span class="home-news-action">${item.kind==='event'?'이벤트 보기':'소식 보기'} ↗</span></div></a>`).join('')}</div>`;
}
