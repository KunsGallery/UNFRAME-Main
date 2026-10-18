import {escapeHTML as e,imageURL} from './model.js';
import {checkoutURL} from './product-model.js';
// A reservation guide: typography and source terms lead; no invented venue photography or facilities.
export function rentalProductView(item,images){
 const source=String(item.details||'').replace(/&bull;/g,'•').replace(/&copy;/g,'©');
 const total=source.match(/TOTAL RENTAL FEE\s+([\d,]+)\s+KRW/i)?.[1];
 const percent=source.match(/RESERVATION DEPOSIT\s*\((\d+%)\)/i)?.[1];
 const notices=source.split('안내 사항\n')[1]?.split('환불 및 일정 변경 규정')[0]?.trim();
 const rules=source.split('환불 및 일정 변경 규정\n')[1]?.split('Your Art, Our Space.')[0]?.trim();
 const refundPattern=/(전시 시작 \d+일 (?:전까지|이내) 취소)\s*(전액 환불|\d+% 환불|환불 불가)/g;
 const refunds=rules?[...rules.matchAll(refundPattern)]:[];
 const ruleNotes=rules?.replace(refundPattern,'').trim();
 const href=checkoutURL(item.checkoutUrl);
 const buy=href?`<a class="rental-buy" href="${e(href)}" target="_blank" rel="noopener noreferrer">구매하기<span aria-hidden="true">↗</span><span class="sr-only">새 창에서 열기</span></a>`:'<p>관리자에서 실제 예약금 결제 주소를 연결해주세요.</p>';
 return `<article class="rental-editorial">
 <!-- THESIS: A gallery reservation unfolds as an editorial invitation, then an exact payment guide. OWN-WORLD: UNFRAME cobalt, cream, oversized sans and hairline divisions. STORY: Understand the reservation, review costs and existing conditions, continue to Imweb. FIRST VIEWPORT: Large Your Art / Our Space beside the named deposit, with a direct guide anchor. FORM: Existing UNFRAME editorial extension. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->
 <section class="rental-hero"><div><h1>Your art.<br>Our space.</h1><p class="rental-hero-korean">당신의 전시가<br>시작되는 자리.</p><a class="rental-guide-link" href="#rental-guide">대관 예약 안내 살펴보기 ↓</a></div><div class="rental-hero-side"><p>UNFRAME<br>Artistic Space & Gallery</p><div><h2>${e(item.name)}</h2><p class="rental-deposit">${e(item.priceLabel||'금액 확인 필요')}</p>${percent?`<p>총 대관료의 ${e(percent)} · 예약금</p>`:''}<p class="rental-small">전시 일정 확정을 위한 결제입니다.<br>아래 비용과 예약 조건을 확인해주세요.</p></div></div></section>
 <section class="rental-introduction" id="rental-guide"><h2>작품을 준비하는 시간부터,<br>전시가 열리는 순간까지.</h2><div><p>작가님의 전시가 가장 좋은 순간으로 완성될 수 있도록 UNFRAME이 함께합니다.</p><p>예약금 결제를 통해 전시 일정을 확정하고, 전시 준비를 위한 안내를 받으세요. 운영·홍보·장비 지원 등 기본 제공 사항의 상세 내용은 기존 상품 안내에 따라 결제 후 전달됩니다.</p><a href="#rental-conditions">예약 전 확인사항으로 이동 ↗</a></div></section>
 <section class="rental-fees"><h2>예약의 시작,<br>비용부터 명확하게.</h2><div class="rental-fee-list">${total?`<div><h3>총 대관료</h3><p>${e(total)}<span>원</span></p></div>`:''}<div><h3>지금 결제하는 예약금${percent?` · ${e(percent)}`:''}</h3><p>${e(item.priceLabel||'금액 확인 필요')}</p></div><p class="rental-small">가져온 상품에 등록된 금액입니다. 대관 기간·개별 협의 내용과 최종 결제 금액은 아임웹에서 확인해주세요.</p></div></section>
 <section class="rental-process"><h2>예약 이후의 흐름.</h2><ol><li><h3>예약금 결제와 일정 확정</h3><p>예약금 결제가 완료되면 해당 전시 기간이 정식 예약됩니다.</p></li><li><h3>전시 준비 안내</h3><p>입력해 주신 연락처로 전시 준비와 기본 제공 사항에 대한 상세 안내를 전달합니다.</p></li><li><h3>잔금 납부와 전시 준비</h3><p>잔금 비율·납부 기한·결제 방법은 아래 기존 상품 안내에서 확인해주세요.</p></li></ol></section>
 <section class="rental-conditions" id="rental-conditions"><h2>예약 전,<br>꼭 확인해주세요.</h2><div>${notices?`<section><h3>결제와 전시 준비 안내</h3><p>${e(notices)}</p></section>`:''}${rules?`<section><h3>취소·환불 및 일정 변경</h3>${refunds.length?`<dl class="rental-refunds">${refunds.map(row=>`<div><dt>${e(row[1])}</dt><dd>${e(row[2])}</dd></div>`).join('')}</dl><p>${e(ruleNotes)}</p>`:`<p>${e(rules)}</p>`}</section>`:''}<p class="rental-small">아래 내용은 아임웹 상품에서 가져온 기존 안내입니다. 예약 전 최신 조건을 결제 페이지에서 다시 확인해주세요.</p><details><summary>가져온 상품 안내 원문 전체 보기</summary><p>${e(source)}</p></details></div></section>
 ${images.length?`<details class="rental-original"><summary>기존 상품 안내 이미지 보기</summary>${images.map(im=>`<img src="${e(imageURL(im.url))}" alt="${e(im.alt||'기존 대관 상품 안내')}" loading="lazy">`).join('')}</details>`:''}
 <section class="rental-closing"><h2>다음 전시의 시작을,<br>UNFRAME과 함께.</h2><p>예약할 전시 일정과 대관 조건을 확인하셨나요?</p>${buy}<p class="rental-small">옵션 선택과 실제 결제는 아임웹에서 진행합니다.<br>이 페이지에서는 결제가 이루어지지 않습니다.</p></section></article>`;
}
