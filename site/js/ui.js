import {footerHTML} from './footer.js';
import {CONFIG} from '../config.js';
import {escapeHTML as e,safeURL} from './model.js';
export const $ = selector => document.querySelector(selector);
export function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500); }
export function chrome(demo,home=false) {
 const exhibitionLink=`<a href="/exhibition" ${location.pathname.startsWith('/exhibition')?'aria-current="page"':''}>EXHIBITION</a>`;
 const menus=CONFIG.menuLinks.map(x=>`<a href="${e(safeURL(x.url))}" ${location.pathname===x.url?'aria-current="page"':''}>${e(x.label)}</a>`);
 menus.splice(1,0,exhibitionLink);
 const logo=`<a class="${home?'logo':'wordmark'}" href="/" aria-label="UNFRAME 홈">UNFRAME<span>ART WITHOUT A FRAME</span></a>`;
 $('#site-header').innerHTML=`<${home?'nav':'div'} ${home?'id="custom-nav"':'class="site-nav"'}>${logo}<${home?'div class="menu-links"':'nav aria-label="주 메뉴"'}>${menus.join('')}</${home?'div':'nav'}></${home?'nav':'div'}>${demo?'<div class="demo-strip">샘플 미리보기 · 전시 정보는 실제 전시가 아닙니다. <a href="/admin">관리자 체험하기 ↗</a></div>':''}`;
 if(home){
  $('#site-header').innerHTML=`<div class="home-announcement"><a id="home-announcement-link" href="/exhibition">UNFRAME · 전시와 프로젝트의 새로운 소식</a><a href="#contact">방문 · 문의</a></div><nav id="custom-nav">${logo}<button id="home-menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="home-menu"><span></span><span></span><span></span></button><div id="home-menu" hidden><nav aria-label="주 메뉴">${menus.join('')}<a href="/virtual-gallery">VIEWING ROOMS</a><a href="#news">JOURNAL</a></nav></div></nav>${demo?'<div class="demo-strip">샘플 미리보기 · 실제 전시 정보가 아닙니다. <a href="/admin">관리자 체험하기 ↗</a></div>':''}`;
  const button=$('#home-menu-toggle'),menu=$('#home-menu');
  const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','메뉴 열기');};
  button.onclick=()=>{const open=menu.hidden;menu.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');};
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();button.focus();}});
 }
 $('#site-footer').innerHTML=footerHTML.replace('</footer>','<a class="admin-footer-link" href="/admin">관리자</a></footer>');
}
export function errorView(title,message) { $('#main').innerHTML=`<section class="error-view"><h1>${e(title)}</h1><p>${e(message)}</p><a class="button" href="/exhibition">전시 목록으로</a><button class="button secondary" onclick="location.reload()">다시 시도</button></section>`; }
export function confirmDelete(title,text) { const dialog=$('#confirm-dialog'); $('#confirm-title').textContent=title; $('#confirm-text').textContent=text; dialog.returnValue='cancel'; dialog.showModal(); return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true})); }
