import test from 'node:test';
import assert from 'node:assert/strict';
import {isDetailImage,imageDescription,detailDescription,finishedProductView} from '../js/product-detail-images.js';
test('finished image role preserves accessible description and stays in existing image bounds',()=>{const image={alt:detailDescription('첫 번째 상세페이지',true)};assert.equal(isDetailImage(image),true);assert.equal(imageDescription(image),'첫 번째 상세페이지');assert.equal(detailDescription('가'.repeat(1100),true).length,1000);assert.equal(isDetailImage({alt:detailDescription(imageDescription(image),false)}),false);});
test('finished pages keep exact image sequence and omit old photos and text template',()=>{const images=[{url:'/original.jpg',alt:'원본'},{url:'/page1.png',alt:detailDescription('상세 1',true)},{url:'/page2.png',alt:detailDescription('상세 2',true)},{url:'/page3.png',alt:detailDescription('상세 3',true)}];const html=finishedProductView({name:'언프레임 펜',checkoutUrl:'https://unframe.imweb.me/shop/?idx=4',story:'상품 설명'},images,()=>'<a>실제 구매 버튼</a>');assert.equal((html.match(/<img /g)||[]).length,3);assert.ok(!html.includes('/original.jpg'));assert.ok(html.indexOf('/page1.png')<html.indexOf('/page2.png'));assert.ok(html.indexOf('/page2.png')<html.indexOf('/page3.png'));assert.ok(html.includes('실제 구매 버튼'));assert.ok(html.includes('상품 설명'));});
test('image purchase hotspot rejects unsafe URLs and source text remains escaped',()=>{const html=finishedProductView({name:'<script>',checkoutUrl:'javascript:alert(1)'},[{url:'/a.png',alt:detailDescription('<x>',true)}],()=>'<button disabled>연결 대기</button>');assert.ok(!html.includes('javascript:'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;x&gt;'));assert.ok(!html.includes('finished-purchase-image'));});

test('artist interlude stays between introduction and details; purchase remains on final page',()=>{const names=['introduction','artist','details','purchase'],images=names.map(name=>({url:'/'+name+'.png',alt:detailDescription(name,true)}));const html=finishedProductView({id:'imweb-2',name:'Snoopy and Woodstock in VW Bus',checkoutUrl:'https://unframe.imweb.me/shop/?idx=2'},images,()=>'<a>구매하기</a>');assert.equal((html.match(/<figure>/g)||[]).length,4);for(let i=1;i<names.length;i++)assert.ok(html.indexOf('/'+names[i-1]+'.png')<html.indexOf('/'+names[i]+'.png'));assert.equal((html.match(/class="finished-purchase-image"/g)||[]).length,1);assert.ok(html.indexOf('class="finished-purchase-image"')>html.indexOf('/purchase.png'));});

test('imported concept and commercial information are visible and escaped, with full source retained',()=>{
 const details='COA: Certificate of Authenticity from Death NYC\n\nThe Concept\n고흐의 밤하늘과 꽃 버스.\n\n두 아이콘의 여행.\nArt History\nMash-up\nArtist Profile\nDeath NYC\nAuthenticity\nLimited Edition\n100장 한정\n구매 전 확인사항\n[넘버링 안내]\n21/100 고정\n[배송 안내]\n평일 2-5일, 방문 수령 9일 이내\n배송안내\n반품 안내 <script>alert(1)</script>';
 const images=['intro','artist','purchase'].map(n=>({url:`/${n}.png`,alt:detailDescription(n,true)}));
 const html=finishedProductView({name:'Snoopy',details},images,()=>'<button>구매</button>');
 assert.ok(html.indexOf('/intro.png')<html.indexOf('product-source-concept'));
 assert.ok(html.indexOf('product-source-concept')<html.indexOf('/artist.png'));
 assert.ok(html.indexOf('product-source-information')<html.indexOf('/purchase.png'));
 const information=html.slice(html.indexOf('class="product-source-information"'));assert.ok(!information.slice(0,information.indexOf('</section>')).includes('Certificate of Authenticity'));assert.ok(html.includes('21/100 고정'));assert.ok(html.includes('방문 수령 9일 이내'));
 assert.ok(html.includes('기존 상품 상세정보 전체 보기'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('missing imported headings create no invented concept or commercial facts',()=>{
 const html=finishedProductView({name:'다른 상품',details:'일반 상품 설명'},[{url:'/a.png',alt:detailDescription('상세',true)}],()=>'<button>구매</button>');
 assert.ok(!html.includes('class="product-source-concept"'));assert.ok(!html.includes('class="product-source-information"'));assert.ok(html.includes('일반 상품 설명'));
});
