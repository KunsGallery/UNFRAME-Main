import {demo,getExhibition,resolveImage} from './store.js';
import {createInvite,listSubmissions,extendSubmission,rejectSubmission,deleteSubmission,approveSubmission,getSubmission} from './submission-store.js';
import {getVirtualGallery} from './virtual-store.js';
import {STATUS,daysLeft,inviteURL,inviteMessage,diffArtworks} from './submission-model.js';
import {WALLS,FRAMES} from './virtual-model.js';
import {escapeHTML as e,imageURL} from './model.js';
import {$,toast,confirmDelete} from './ui.js';
// Staff side of artist uploads: invitations, deadlines and the review queue.
const origin=()=>globalThis.location?.origin||'https://unframe.kr';
const subject=sub=>`[UNFRAME] ${sub.exhibitionTitle} 버추얼 갤러리 업로드 안내`;
const messageFor=sub=>inviteMessage({artistName:sub.artistName,exhibitionTitle:sub.exhibitionTitle,url:inviteURL(sub.id,origin()),expiresAt:sub.expiresAt});
export function inviteCardHTML(sub,now=new Date()){
 const left=daysLeft(sub.expiresAt,now),urgent=left<=2;
 const mail=sub.invitedEmail?`<a class="button secondary" href="mailto:${e(sub.invitedEmail)}?subject=${encodeURIComponent(subject(sub))}&body=${encodeURIComponent(messageFor(sub))}">메일로 보내기</a>`:'';
 const account=sub.ownerEmail?`연결 계정 ${e(sub.ownerEmail)}`:sub.invitedEmail?`${e(sub.invitedEmail)} 전용 · 아직 로그인 전`:'아직 로그인 전 · 처음 로그인한 계정에 연결';
 return `<article class="invite-card${urgent?' is-urgent':''}"><div><h3>${e(sub.artistName)} <span class="invite-status status-${e(sub.status)}">${e(STATUS[sub.status]||sub.status)}</span></h3><p>${account}${sub.targetGalleryId?' · 공개 갤러리 수정본':''}</p><p class="invite-deadline">${left?`${left}일 남음`:'기한 만료 · 다음 접속 시 정리됩니다'}</p>${sub.reviewNote&&sub.status==='rejected'?`<p class="invite-note">반려 사유: ${e(sub.reviewNote)}</p>`:''}</div><div class="actions">${sub.status==='submitted'?`<button class="button" data-review="${e(sub.id)}">심사하기</button>`:''}<button class="button secondary" data-invite-copy-link="${e(sub.id)}">링크 복사</button><button class="button secondary" data-invite-copy-message="${e(sub.id)}">안내문 복사</button>${mail}<button class="text-link" data-invite-extend="${e(sub.id)}">기한 연장</button><button class="text-link" data-invite-cancel="${e(sub.id)}">초대 취소</button></div></article>`;
}
export function pendingNoticeHTML(list){
 if(!list.length)return '';
 return `<div class="notice pending-notice"><strong>작가 업로드 심사 대기 ${list.length}건</strong><ul>${list.map(sub=>`<li${daysLeft(sub.expiresAt)<=2?' class="is-urgent"':''}>${e(sub.artistName)} · ${e(sub.exhibitionTitle)} · <span class="invite-deadline">${daysLeft(sub.expiresAt)}일 남음</span> <button class="text-link" data-review="${e(sub.id)}">심사하기</button></li>`).join('')}</ul></div>`;
}
// Clipboard access can be refused (permissions, embedded browsers); fall back to a selectable dialog.
async function copy(text,done){
 try{await navigator.clipboard.writeText(text);toast(done);return;}catch{}
 let dialog=$('#copy-dialog');
 if(!dialog){document.body.insertAdjacentHTML('beforeend','<dialog id="copy-dialog" class="copy-dialog" aria-labelledby="copy-dialog-title"><h2 id="copy-dialog-title">아래 내용을 복사해주세요</h2><textarea id="copy-dialog-text" rows="10" readonly></textarea><button class="button" id="copy-dialog-close">닫기</button></dialog>');dialog=$('#copy-dialog');$('#copy-dialog-close').onclick=()=>dialog.close();}
 $('#copy-dialog-text').value=text;dialog.showModal();$('#copy-dialog-text').select();
}
export async function adminSubmissions(exhibitionId,onBack){
 const exhibition=await getExhibition(exhibitionId);if(!exhibition)return toast('전시를 찾을 수 없습니다.');
 let list=[];try{list=await listSubmissions(exhibitionId);}catch(error){return toast(error.message||'초대 목록을 불러오지 못했습니다.');}
 const reload=()=>adminSubmissions(exhibitionId,onBack);
 $('#main').innerHTML=`<section class="admin-wrap virtual-admin submissions-admin"><div class="admin-title"><div><button class="text-link" id="submissions-back">← 갤러리 목록</button><h1>작가 업로드 초대</h1><p>${e(exhibition.title)} · 진행 중 ${list.length}건</p></div></div>${demo?'<div class="notice">샘플 체험 · 실제 Firebase나 R2에는 저장되지 않습니다.</div>':''}<p class="help">작가별 링크를 만들어 보내면 작가가 직접 작품을 올리고 심사를 요청합니다. 승인한 업로드만 공개 갤러리가 됩니다. 마지막 수정 후 10일 안에 승인하지 않으면 업로드는 자동으로 삭제됩니다.</p><form id="invite-form" class="editor-section invite-form"><h2>작가 초대하기</h2><div class="invite-fields"><label class="field"><span>작가명 <small class="field-badge">필수</small></span><input name="artistName" maxlength="300" required></label><label class="field"><span>작가 이메일 <small class="field-badge">선택</small></span><input name="invitedEmail" type="email" maxlength="320" placeholder="artist@gmail.com"></label></div><p class="help">이메일을 입력하면 그 Google 계정으로만 업로드할 수 있습니다. 비워두면 링크로 처음 로그인한 계정에 연결됩니다.</p><button class="button">초대 링크 만들기</button><p id="invite-status" role="status"></p></form><section class="editor-section"><h2>초대 목록</h2><div id="invite-list">${list.length?list.map(sub=>inviteCardHTML(sub)).join(''):'<p class="virtual-empty">아직 초대한 작가가 없습니다.</p>'}</div></section></section>`;
 $('#submissions-back').onclick=onBack;
 $('#invite-form').onsubmit=async event=>{
  event.preventDefault();const form=event.target,values=new FormData(form);
  for(const control of form.elements)control.disabled=true;$('#invite-status').textContent='초대 링크를 만드는 중…';
  let sub;try{sub=await createInvite(exhibition,{artistName:values.get('artistName'),invitedEmail:values.get('invitedEmail')});}
  catch(error){$('#invite-status').textContent=error.message;for(const control of form.elements)control.disabled=false;return;}
  await reload();await copy(messageFor(sub),`${sub.artistName} 작가 안내문을 복사했습니다. 카카오톡·문자에 붙여넣어 보내주세요.`);
 };
 const find=id=>list.find(sub=>sub.id===id);
 document.querySelectorAll('[data-invite-copy-link]').forEach(button=>button.onclick=()=>copy(inviteURL(button.dataset.inviteCopyLink,origin()),'초대 링크를 복사했습니다.'));
 document.querySelectorAll('[data-invite-copy-message]').forEach(button=>button.onclick=()=>copy(messageFor(find(button.dataset.inviteCopyMessage)),'안내문을 복사했습니다. 카카오톡·문자에 붙여넣어 보내주세요.'));
 document.querySelectorAll('[data-invite-extend]').forEach(button=>button.onclick=async()=>{try{await extendSubmission(button.dataset.inviteExtend);toast('기한을 오늘부터 10일로 연장했습니다.');await reload();}catch(error){toast(error.message||'기한을 연장하지 못했습니다.');}});
 document.querySelectorAll('[data-invite-cancel]').forEach(button=>button.onclick=async()=>{const sub=find(button.dataset.inviteCancel);if(!await confirmDelete('초대를 취소할까요?',`${sub.artistName} 작가의 링크와 업로드한 작품·이미지를 모두 삭제합니다. 복구할 수 없습니다.`))return;try{await deleteSubmission(sub.id);toast('초대를 취소했습니다.');await reload();}catch(error){toast(error.message||'초대를 취소하지 못했습니다.');}});
 bindReviewButtons(reload);
}
export function bindReviewButtons(onBack){document.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>reviewSubmission(button.dataset.review,onBack));}
const badge={added:'추가',changed:'변경',removed:'삭제'};
export async function reviewSubmission(id,onBack){
 let data,gallery;try{data=await getSubmission(id,{staff:true});if(data?.submission.targetGalleryId)gallery=await getVirtualGallery(data.submission.targetGalleryId,{admin:true});}catch(error){return toast(error.message||'업로드를 불러오지 못했습니다.');}
 if(!data)return toast('이미 처리되었거나 삭제된 업로드입니다.');
 const {submission:sub,artworks}=data,diff=gallery?diffArtworks(gallery.artworks,artworks):null;
 const mark=art=>diff?(diff.added.includes(art.id)?'added':diff.changed.includes(art.id)?'changed':''):'';
 const removed=diff?gallery.artworks.filter(art=>diff.removed.includes(art.id)):[];
 const row=(art,kind)=>`<article class="review-artwork${kind?' is-'+kind:''}"><img data-review-image="${e(art.id)}" src="${e(imageURL(art.image.url)||'/assets/zero.svg')}" alt="${e(art.image.alt||art.title)}"><div><strong>${e(art.title)}</strong>${kind?` <span class="invite-status">${badge[kind]}</span>`:''}<p>${e([art.year,art.medium].filter(Boolean).join(' · '))}</p><p>${e(art.heightCm)} × ${e(art.widthCm)} cm · ${e(WALLS[art.wall])} · ${e(FRAMES[art.frame])}</p></div></article>`;
 $('#main').innerHTML=`<section class="admin-wrap virtual-admin review-admin"><div class="admin-title"><div><button class="text-link" id="review-back">← 돌아가기</button><h1>업로드 심사</h1><p>${e(sub.artistName)} · ${e(sub.exhibitionTitle)} · ${e(sub.ownerEmail)}${sub.targetGalleryId?' · 공개 갤러리 수정본':' · 새 작가 갤러리'}</p></div><a class="button secondary" href="/virtual-gallery/submission/${encodeURIComponent(sub.id)}?preview=1" target="_blank" rel="noopener">3D 미리보기 ↗</a></div><p class="help">작품 ${artworks.length}점 · ${daysLeft(sub.expiresAt)}일 안에 처리하지 않으면 자동 삭제됩니다.</p><div class="review-grid">${artworks.map(art=>row(art,mark(art))).join('')}${removed.map(art=>row(art,'removed')).join('')}</div><section class="editor-section review-actions"><h2>심사 결과</h2><div class="actions"><button class="button" id="approve-publish">승인 후 공개</button><button class="button secondary" id="approve-only">${gallery?.settings.published?'승인 (공개 유지)':'승인만 (비공개)'}</button></div><label class="field"><span>반려 사유 <small class="field-badge">반려 시 필수</small></span><textarea id="reject-note" maxlength="1000" rows="3" placeholder="작가에게 보일 수정 요청 사항"></textarea></label><button class="button secondary" id="reject">반려하기</button><p id="review-status" role="status"></p></section></section>`;
 $('#review-back').onclick=onBack;
 const lock=value=>{for(const button of document.querySelectorAll('.review-actions button'))button.disabled=value;};
 const approve=publish=>async()=>{lock(true);$('#review-status').textContent='승인 중… 이미지를 옮기고 있습니다.';try{const galleryId=await approveSubmission(id,{publish});toast(publish?'승인하고 공개했습니다.':'승인했습니다.');$('#review-status').innerHTML=`완료 · <a href="/virtual-gallery/${encodeURIComponent(galleryId)}${publish?'':'?preview=1'}" target="_blank" rel="noopener">갤러리 보기 ↗</a>`;}catch(error){$('#review-status').textContent=`${error.message||'승인하지 못했습니다.'} 업로드는 그대로 남아 있으니 다시 시도해주세요.`;lock(false);}};
 $('#approve-publish').onclick=approve(true);$('#approve-only').onclick=approve(false);
 $('#reject').onclick=async()=>{lock(true);try{await rejectSubmission(id,$('#reject-note').value);toast('반려했습니다. 작가 화면에 사유가 표시됩니다.');onBack();}catch(error){$('#review-status').textContent=error.message;lock(false);}};
 await Promise.allSettled([...artworks,...removed].filter(art=>art.image.path&&!art.image.url).map(async art=>{const image=await resolveImage(art.image);document.querySelectorAll(`[data-review-image="${art.id}"]`).forEach(img=>{img.src=image.url;});}));
}
