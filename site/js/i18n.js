import {DICT} from './i18n-dict.js';
export {DICT};
// The English site lives under /en; everything else is Korean.
const here=()=>globalThis.location?.pathname||'/';
export const lang=(pathname=here())=>/^\/en(\/|$)/.test(pathname)?'en':'ko';
export function t(key,vars={},l=lang()){
 const entry=DICT[key];if(!entry)throw new Error(`Missing translation key: ${key}`);
 return entry[l].replace(/\{(\w+)\}/g,(match,name)=>name in vars?String(vars[name]):match);
}
// Staff and artist screens stay Korean, and static files have no English copy.
const UNLOCALIZED=/^\/(en(\/|$)|admin|artist-studio|assets\/|js\/|config\.js)/;
export function localHref(path,l=lang()){
 // Same-origin absolute links (pasted into admin fields) behave like site paths.
 const origin=globalThis.location?.origin;
 if(l==='en'&&origin&&typeof path==='string'&&path.startsWith(origin+'/')){const local=path.slice(origin.length);return UNLOCALIZED.test(local)?path:localHref(local,l);}
 if(l!=='en'||typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')||UNLOCALIZED.test(path))return path;
 return '/en'+path;
}
export function switchURL(href,target){
 const url=new URL(href);
 const bare=url.pathname.replace(/^\/en(?=\/|$)/,'')||'/';
 url.pathname=target==='en'?(bare==='/'?'/en/':'/en'+bare):bare;
 return url.toString();
}
export function localized(item,field,l=lang()){
 const english=item?.[field+'En'];
 if(l==='en'&&typeof english==='string'&&english.trim())return english;
 return item?.[field]??'';
}
// English copies of entered content are optional strings bounded like their Korean field.
export function validateEnglish(item,limits){
 for(const [field,max] of Object.entries(limits)){const value=item[field];if(value!==undefined&&(typeof value!=='string'||value.length>max))throw new Error(`영문 입력 내용을 확인해주세요. (${field}: ${max.toLocaleString('ko-KR')}자 이하)`);}
}
export const ARTWORK_ENGLISH={descriptionEn:5000,mediumEn:500};
const MEMORY='unframe-lang';
export function rememberLanguage(l){try{globalThis.localStorage?.setItem(MEMORY,l);}catch{}}
export function preferredLanguage(){try{const value=globalThis.localStorage?.getItem(MEMORY);return value==='en'||value==='ko'?value:null;}catch{return null;}}
export const homeRedirect=(pathname,preferred)=>pathname==='/'&&preferred==='en'?'/en/':null;
