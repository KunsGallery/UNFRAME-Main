// Open call notice: while an open call is recruiting, a small card rises in the corner of every public
// page (a slim bar on phones) and the home announcement bar points to it. Closing the card hides that
// open call for this visitor until it ends; a new open call shows again.
import {subscribeHighlights} from './highlights.js';
import {activeOpenCalls,openCallDays} from './highlight-model.js';
import {resolveImage} from './store.js';
import {escapeHTML as e,imageURL,safeURL} from './model.js';
import {t,localized,localHref} from './i18n.js';
const DISMISSED='unframe-open-call-dismissed';
export const openCallLabel=days=>days<=0?t('openCall.lastDay'):days<=3?t('openCall.closingSoon',{days}):t('openCall.dday',{days});
const shortDate=date=>`${+date.slice(5,7)}.${+date.slice(8,10)}`;
const external=url=>/^https?:\/\//.test(url)&&!url.startsWith(location.origin);
function dismissed(id){try{return localStorage.getItem(DISMISSED)===id;}catch{return false;}}
function dismiss(id){try{localStorage.setItem(DISMISSED,id);}catch{}}
let shown='';
export function mountOpenCall(){
 if(/^\/(en\/)?admin/.test(location.pathname))return;
 subscribeHighlights(items=>show(activeOpenCalls(items)[0]),()=>{}).catch(()=>{});
}
function announce(call){
 const link=document.querySelector('#home-announcement-link');if(!link)return;
 link.dataset.openCall=call.id;link.textContent=t('openCall.announce',{title:localized(call,'title'),date:shortDate(call.endDate)});
 link.href=localHref(safeURL(call.url));if(external(link.href)){link.target='_blank';link.rel='noopener';}
}
async function show(call){
 if(!call||shown===call.id)return;shown=call.id;announce(call);
 if(dismissed(call.id)||document.querySelector('.open-call-card'))return;
 const cover=await resolveImage(call.cover).catch(()=>null),url=localHref(safeURL(call.url)),title=localized(call,'title'),summary=localized(call,'summary');
 if(!document.querySelector('link[data-open-call-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/open-call.css';css.dataset.openCallCss='';document.head.append(css);}
 const card=document.createElement('aside');card.className='open-call-card';card.setAttribute('aria-label',t('openCall.kicker'));
 const days=openCallDays(call),target=external(url)?' target="_blank" rel="noopener"':'';
 card.innerHTML=`${imageURL(cover?.url)?`<img src="${e(imageURL(cover.url))}" alt="" loading="lazy">`:''}<div class="open-call-copy"><p class="open-call-kicker"><span>${t('openCall.kicker')}</span><b${days<=3?' class="is-urgent"':''}>${e(openCallLabel(days))}</b></p><h2>${e(title)}</h2>${summary?`<p class="open-call-summary">${e(summary)}</p>`:''}<a class="open-call-apply" href="${e(url)}"${target}>${t('openCall.apply')} <span aria-hidden="true">${target?'↗':'→'}</span></a></div><button type="button" class="open-call-close" aria-label="${e(t('openCall.close'))}">×</button>`;
 card.querySelector('.open-call-close').onclick=()=>{dismiss(call.id);card.classList.remove('is-visible');setTimeout(()=>card.remove(),300);};
 document.body.append(card);
 setTimeout(()=>card.classList.add('is-visible'),1200);
}
