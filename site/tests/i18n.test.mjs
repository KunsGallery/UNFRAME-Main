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
