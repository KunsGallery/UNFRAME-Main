import {lang,t,switchURL,rememberLanguage} from './i18n.js';
// Each option names its language in that language, so visitors find their own.
export const languageOptions=(l=lang())=>[{value:'ko',label:'한국어',selected:l==='ko'},{value:'en',label:'English',selected:l==='en'}];
// Pages whose address carries an id add their hreflang pair once the address is known.
function addAlternates(){
 if(document.querySelector('link[hreflang]'))return;
 for(const [code,target] of [['ko','ko'],['en','en'],['x-default','ko']]){const link=document.createElement('link');link.rel='alternate';link.hreflang=code;link.href=switchURL(location.href,target);document.head.append(link);}
}
export function mountLanguageSwitch(root=document){
 for(const slot of root.querySelectorAll('[data-lang-switch]')){
  if(slot.querySelector('select'))continue;
  const label=document.createElement('label'),select=document.createElement('select');
  label.className='lang-switch';select.setAttribute('aria-label',t('lang.switch'));
  for(const option of languageOptions()){const item=new Option(option.label,option.value,option.selected,option.selected);select.append(item);}
  select.addEventListener('change',()=>{rememberLanguage(select.value);location.assign(switchURL(location.href,select.value));});
  label.append(select);slot.append(label);
 }
 addAlternates();
}
