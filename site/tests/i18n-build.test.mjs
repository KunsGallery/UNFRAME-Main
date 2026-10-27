import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {PUBLIC_PAGES,I18N_READY,translateHTML,hangulLeft,redirectLines} from '../scripts/i18n-html.mjs';
const page=(body,head='')=>`<!doctype html><html lang="ko"><head><title data-i18n="lang.switch">언어</title>${head}</head><body>${body}</body></html>`;
test('translateHTML swaps marked copy, attributes, language and internal links',()=>{
 const html=translateHTML(page('<p data-i18n="lang.switch">언어</p><img src="/assets/a.png" alt="언어" data-i18n-attr="alt:lang.switch;title:lang.en"><a href="/exhibition">x</a><a href="https://x.com">y</a><a href="/assets/a.pdf">z</a><a href="/admin">w</a>'),'en',{path:'/exhibition'});
 assert.match(html,/<html lang="en">/);
 assert.match(html,/<p data-i18n="lang.switch">Language<\/p>/);
 assert.match(html,/<title data-i18n="lang.switch">Language<\/title>/);
 assert.match(html,/alt="Language"/);assert.match(html,/title="English"/);
 assert.match(html,/href="\/en\/exhibition"/);assert.match(html,/href="https:\/\/x.com"/);
 assert.match(html,/href="\/assets\/a.pdf"/);assert.match(html,/href="\/admin"/);
 assert.match(html,/src="\/assets\/a.png"/);
 for(const [code,href] of [['ko','/exhibition'],['en','/en/exhibition'],['x-default','/exhibition']])assert.ok(html.includes(`<link rel="alternate" hreflang="${code}" href="${href}">`),code);
});
test('Korean pages only gain hreflang links, and pages without a fixed path gain none',()=>{
 const source=page('<p data-i18n="lang.switch">언어</p>');
 const ko=translateHTML(source,'ko',{path:'/'});
 assert.match(ko,/<html lang="ko">/);assert.match(ko,/<p data-i18n="lang.switch">언어<\/p>/);
 assert.ok(ko.includes('<link rel="alternate" hreflang="en" href="/en/">'));
 assert.ok(!translateHTML(source,'en').includes('hreflang'));
});
test('hangulLeft ignores scripts, styles, comments and entered-content slots',()=>{
 assert.deepEqual(hangulLeft('<p>안녕</p><div data-i18n-content><div><span>내용</span></div>끝</div><script>"가"</script><style>/*나*/</style><!-- 다 --><p>ok</p>'),['안녕']);
 assert.deepEqual(hangulLeft('<img alt="사진"><meta name="description" content="설명"><input placeholder="검색" aria-label="찾기">'),['사진','설명','검색','찾기']);
});
test('every public page exists and every finished page has no Korean left in English',async()=>{
 assert.equal(PUBLIC_PAGES.length,9);
 for(const name of PUBLIC_PAGES)await access(new URL(`../${name}`,import.meta.url));
 for(const name of I18N_READY){
  assert.ok(PUBLIC_PAGES.includes(name),name);
  const html=await readFile(new URL(`../${name}`,import.meta.url),'utf8');
  assert.deepEqual(hangulLeft(translateHTML(html,'en')),[],name);
 }
});
test('English routes mirror the public Korean routes',()=>{
 const lines=redirectLines();
 for(const line of ['/exhibition/:id /detail.html 200','/en/exhibition/:id /en/detail.html 200','/en/virtual-gallery/:id /en/virtual-gallery.html 200','/en/about /en/about.html 200','/en /en/index.html 200','/en/exhibitions/:id /en/exhibition/:id 301'])assert.ok(lines.includes(line),line);
 assert.ok(!lines.some(line=>line.startsWith('/en/admin')||line.startsWith('/en/artist-studio')));
});
