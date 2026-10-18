import {checkoutURL} from './product-model.js';
import {escapeHTML as e,imageURL} from './model.js';
// Encodes the image's display role within the existing bounded image descriptor.
const prefix='[DETAIL] ';
export const isDetailImage=image=>typeof image?.alt==='string'&&image.alt.startsWith(prefix);
export const imageDescription=image=>isDetailImage(image)?image.alt.slice(prefix.length):image?.alt||'';
export const detailDescription=(text,enabled)=>enabled?prefix+String(text||'').slice(0,1000-prefix.length):String(text||'').slice(0,1000);
// Reuse imported source text without rendering untrusted source HTML.
function excerpt(text,start,end){const marker='\n'+start+'\n',index=text.indexOf(marker);const from=text.startsWith(start+'\n')?start.length+1:index<0?-1:index+marker.length;if(from<0)return '';const body=text.slice(from);const to=body.indexOf(end);return to<0?'':body.slice(0,to).trim();}
function paragraphs(text){return text.split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${e(p)}</p>`).join('');}
export function sourceEditorial(item){
 const source=String(item.details||'');
 const concept=excerpt(source,'The Concept','Artist Profile').replace(/\s*["“]?\s*Art History[\s\S]*$/,'').trim();
 const authenticity=excerpt(source,'Authenticity','\n배송안내\n');
 return {
 concept:concept?`<section class="product-source-concept" aria-label="작품 콘셉트"><h2>${item.id==='imweb-2'?'익숙한 아이콘들이 만난,<br>낯선 밤의 여행.':'작품에 담긴 이야기.'}</h2><div>${paragraphs(concept)}</div></section>`:'',
 information:authenticity?`<section class="product-source-information"><h2>작품을 소장하기 전에.</h2><p class="product-source-note">기존 아임웹 상품에 등록된 작품 구성과 구매 안내입니다. 최신 판매 조건은 구매 페이지에서 확인해 주세요.</p><div class="product-source-facts">${authenticity.split(/(?=구매 전 확인사항)/).map(part=>`<div>${paragraphs(part.trim())}</div>`).join('')}</div></section>`:'',
 original:source?`<details class="product-source-original"><summary>기존 상품 상세정보 전체 보기</summary><div>${paragraphs(source)}</div></details>`:''
 };
}
export function finishedProductView(item,images,buy){
 const detail=images.filter(isDetailImage),href=checkoutURL(item.checkoutUrl);if(!detail.length)return '';
 const source=sourceEditorial(item);
 return `<article class="finished-product"><h1 class="sr-only">${e(item.name)} 상세페이지</h1><section class="sr-only" aria-label="상품 설명"><p>${e([item.summary,item.story,item.packaging,item.specs].filter(Boolean).join('\n'))}</p></section><div class="finished-product-images">${detail.map((im,index)=>`${index===detail.length-1?source.information:''}<figure><img src="${e(imageURL(im.url))}" alt="${e(imageDescription(im)||`${item.name} 상세 안내 ${index+1}`)}" ${index?'loading="lazy"':'fetchpriority="high"'}>${index===detail.length-1&&href&&item.id!=='imweb-3'?`<a class="finished-purchase-image" href="${e(href)}" target="_blank" rel="noopener noreferrer" aria-label="${e(item.name)} 아임웹에서 구매하기"><span class="sr-only">이미지 속 구매 안내 · 실제 아임웹 상품 페이지로 이동</span></a>`:''}</figure>${index===0?source.concept:''}`).join('')}${source.original}</div><section class="finished-product-purchase"><h2>${e(item.name)}</h2>${item.priceLabel?`<p>${e(item.priceLabel)}</p>`:''}${buy()}<p>${item.id==='imweb-3'?'일정·조건 확인 후 예약금 결제는 아임웹에서 진행합니다.':'옵션·수량 선택과 결제는 아임웹에서 진행합니다.'}</p></section></article>`;
}
