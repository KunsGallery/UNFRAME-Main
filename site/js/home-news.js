import {selectedNews} from './highlight-model.js';
import {resolveImage} from './store.js';
import {escapeHTML as e,imageURL,safeURL,dateRange} from './model.js';
import {t,localized,localHref} from './i18n.js';
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
 if(!selected.length){target.innerHTML=`<div class="home-news-message"><p>${failed?t('home.newsFailed'):t('home.newsPreparing')}</p><a href="${localHref('/project')}">${t('home.meetProjects')}</a></div>`;return;}
 if(!ready.length){target.innerHTML=`<p class="home-news-message">${t('home.newsImagesFailed')}</p>`;return;}
 target.innerHTML=`<div class="home-news-grid${ready.length===1?' is-single':''}">${ready.map((item,index)=>`<a class="home-news-item${index===0?' is-lead':''}" href="${e(localHref(safeURL(item.url)))}"><div class="home-news-image"><img src="${e(imageURL(item.cover?.url))}" alt="${e(item.cover?.alt||localized(item,'title'))}" loading="lazy"></div><div class="home-news-copy"><div class="home-news-meta"><span>${e(item.project)}</span><span>${item.startDate?e(dateRange(item)):item.kind==='news'?t('home.news'):t('home.event')}</span></div><h3>${e(localized(item,'title'))}</h3>${localized(item,'summary')?`<p>${e(localized(item,'summary'))}</p>`:''}<span class="home-news-action">${item.kind==='event'?t('home.viewEvent'):t('home.viewNews')} ↗</span></div></a>`).join('')}</div>`;
}
