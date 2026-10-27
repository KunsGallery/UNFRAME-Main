import {footerHTML} from './footer.js';
import {CONFIG} from '../config.js';
import {escapeHTML as e,safeURL} from './model.js';
import {lang,t,localHref} from './i18n.js';
import {mountLanguageSwitch} from './language-switch.js';
export const $ = selector => document.querySelector(selector);
export function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500); }
export function chrome(demo,home=false) {
 const l=lang(),here=location.pathname.replace(/^\/en(?=\/|$)/,'')||'/',switcher='<div class="lang-switch-slot" data-lang-switch></div>';
 const exhibitionLink=`<a href="${localHref('/exhibition')}" ${here.startsWith('/exhibition')?'aria-current="page"':''}>EXHIBITION</a>`;
 const menus=CONFIG.menuLinks.map(x=>`<a href="${e(localHref(safeURL(x.url)))}" ${here===x.url?'aria-current="page"':''}>${e(x.label)}</a>`);
 menus.splice(1,0,exhibitionLink);
 const logo=`<a class="${home?'logo':'wordmark'}" href="${localHref('/')}" aria-label="${t('nav.home')}">UNFRAME<span>ART WITHOUT A FRAME</span></a>`;
 $('#site-header').innerHTML=`<${home?'nav':'div'} ${home?'id="custom-nav"':'class="site-nav"'}>${logo}<${home?'div class="menu-links"':`nav aria-label="${t('nav.main')}"`}>${menus.join('')}</${home?'div':'nav'}>${switcher}</${home?'nav':'div'}>${demo?`<div class="demo-strip">${t('nav.demo')} <a href="/admin">${t('nav.tryAdmin')}</a></div>`:''}`;
 if(home){
  $('#site-header').innerHTML=`<div class="home-announcement"><a id="home-announcement-link" href="${localHref('/exhibition')}">${t('nav.announcement')}</a><a href="#contact">${t('nav.visit')}</a></div><nav id="custom-nav">${logo}${switcher}<button id="home-menu-toggle" type="button" aria-label="${t('nav.menuOpen')}" aria-expanded="false" aria-controls="home-menu"><span></span><span></span><span></span></button><div id="home-menu" hidden><nav aria-label="${t('nav.main')}">${menus.join('')}<a href="${localHref('/virtual-gallery')}">VIEWING ROOMS</a><a href="#news">JOURNAL</a></nav></div></nav>${demo?`<div class="demo-strip">${t('nav.demoHome')} <a href="/admin">${t('nav.tryAdmin')}</a></div>`:''}`;
  const button=$('#home-menu-toggle'),menu=$('#home-menu');
  const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',t('nav.menuOpen'));};
  button.onclick=()=>{const open=menu.hidden;menu.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?t('nav.menuClose'):t('nav.menuOpen'));};
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();button.focus();}});
 }
 $('#site-footer').innerHTML=footerHTML(l).replace('</footer>',`<a class="admin-footer-link" href="/admin">${t('footer.admin')}</a></footer>`);
 mountLanguageSwitch();
}
export function errorView(title,message) { $('#main').innerHTML=`<section class="error-view"><h1>${e(title)}</h1><p>${e(message)}</p><a class="button" href="${localHref('/exhibition')}">${t('error.backToList')}</a><button class="button secondary" onclick="location.reload()">${t('error.retry')}</button></section>`; }
export function confirmDelete(title,text) { const dialog=$('#confirm-dialog'); $('#confirm-title').textContent=title; $('#confirm-text').textContent=text; dialog.returnValue='cancel'; dialog.showModal(); return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true})); }
