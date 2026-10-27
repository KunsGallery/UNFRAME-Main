import {test} from 'node:test';import assert from 'node:assert/strict';
import {DICT,lang,t,localHref,switchURL,localized,rememberLanguage,preferredLanguage,homeRedirect} from '../js/i18n.js';
test('language comes from the /en path prefix',()=>{
 assert.equal(lang('/en/exhibition/a'),'en');assert.equal(lang('/en'),'en');assert.equal(lang('/en/'),'en');
 assert.equal(lang('/english'),'ko');assert.equal(lang('/exhibition'),'ko');
});
test('t looks up the dictionary and rejects unknown keys',()=>{
 assert.equal(t('lang.switch',{},'en'),DICT['lang.switch'].en);
 assert.equal(t('lang.switch',{},'ko'),DICT['lang.switch'].ko);
 assert.throws(()=>t('no.such.key',{},'en'));
});
test('localHref prefixes only internal public paths',()=>{
 assert.equal(localHref('/exhibition/a','en'),'/en/exhibition/a');
 assert.equal(localHref('/','en'),'/en/');
 for(const path of ['/en/x','https://x.com','#top','/admin','/artist-studio?i=1','mailto:a@b.c','/assets/a.png','/js/a.js'])assert.equal(localHref(path,'en'),path);
 assert.equal(localHref('/exhibition/a','ko'),'/exhibition/a');
});
test('switchURL keeps path, query and hash',()=>{
 assert.equal(switchURL('https://u.kr/virtual-gallery/x?v=1#art-2','en'),'https://u.kr/en/virtual-gallery/x?v=1#art-2');
 assert.equal(switchURL('https://u.kr/en/virtual-gallery/x?v=1#art-2','ko'),'https://u.kr/virtual-gallery/x?v=1#art-2');
 assert.equal(switchURL('https://u.kr/en/','ko'),'https://u.kr/');
 assert.equal(switchURL('https://u.kr/en','ko'),'https://u.kr/');
 assert.equal(switchURL('https://u.kr/','en'),'https://u.kr/en/');
 assert.equal(switchURL('https://u.kr/en/about','en'),'https://u.kr/en/about');
});
test('localized falls back to Korean when English is blank',()=>{
 assert.equal(localized({title:'가',titleEn:'  '},'title','en'),'가');
 assert.equal(localized({title:'가',titleEn:'A'},'title','en'),'A');
 assert.equal(localized({title:'가',titleEn:'A'},'title','ko'),'가');
 assert.equal(localized({},'title','en'),'');
});
test('home redirect only applies to the root',()=>{
 assert.equal(homeRedirect('/','en'),'/en/');assert.equal(homeRedirect('/exhibition/a','en'),null);
 assert.equal(homeRedirect('/',null),null);assert.equal(homeRedirect('/','ko'),null);
});
test('language memory survives a storage that throws',()=>{
 const saved=globalThis.localStorage;
 globalThis.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 assert.doesNotThrow(()=>rememberLanguage('en'));assert.equal(preferredLanguage(),null);
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 rememberLanguage('en');assert.equal(preferredLanguage(),'en');
 if(saved===undefined)delete globalThis.localStorage;else globalThis.localStorage=saved;
});
test('every dictionary entry has Korean and English',()=>{
 for(const [key,value] of Object.entries(DICT)){assert.ok(value.ko?.trim(),key);assert.ok(value.en?.trim(),key);assert.ok(!/[가-힣]/.test(value.en),`${key} English has Hangul`);}
});

test('language switch options mark the current language with endonyms',async()=>{
 const {languageOptions}=await import('../js/language-switch.js');
 assert.deepEqual(languageOptions('en'),[{value:'ko',label:'한국어',selected:false},{value:'en',label:'English',selected:true}]);
 assert.deepEqual(languageOptions('ko').map(option=>option.selected),[true,false]);
});
test('the footer has an English version with no Korean left',async()=>{
 const {footerHTML}=await import('../js/footer.js');
 assert.ok(!/[가-힣]/.test(footerHTML('en')));
 assert.match(footerHTML('ko'),/장소 및 운영안내/);
});
test('same-origin absolute links stay on the English site',()=>{
 const saved=globalThis.location;globalThis.location={pathname:'/en/',href:'https://u.kr/en/',origin:'https://u.kr'};
 try{
  assert.equal(localHref('https://u.kr/exhibition/x#ex-online','en'),'/en/exhibition/x#ex-online');
  assert.equal(localHref('https://other.kr/exhibition/x','en'),'https://other.kr/exhibition/x');
  assert.equal(localHref('https://u.kr/admin','en'),'https://u.kr/admin');
 }finally{if(saved===undefined)delete globalThis.location;else globalThis.location=saved;}
});
test('runtime hreflang targets drop query and hash',async()=>{
 const {alternateHref}=await import('../js/language-switch.js');
 assert.equal(alternateHref('https://u.kr/virtual-gallery/x?preview=1#art-2','en'),'https://u.kr/en/virtual-gallery/x');
 assert.equal(alternateHref('https://u.kr/en/exhibition/x?y=1','ko'),'https://u.kr/exhibition/x');
});
