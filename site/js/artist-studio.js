import {demo,uploadImage,resolveImage,session,isStaff} from './store.js';
import {artistSession,artistLogin,artistLogout,getInvite,getSubmission,claimInvite,saveSubmissionSettings,saveSubmissionArtwork,deleteSubmissionArtwork,setSubmissionStatus,myGalleries,createRevision} from './submission-store.js';
import {STATUS,OWNERSHIP_NOTICE,EXPIRY_DAYS,daysLeft,artistCanEdit} from './submission-model.js';
import {studioState,studioError} from './artist-studio-model.js';
import {previewURL} from './virtual-embed.js';
import {THEMES,WALLS,FRAMES,LIGHTING,CEILINGS,emptyArtwork,wallColorOptions} from './virtual-model.js';
import {escapeHTML as e,imageURL} from './model.js';
import {$,toast,confirmDelete} from './ui.js';
// Invited artists upload here; nothing becomes public until UNFRAME staff approve it.
const id=decodeURIComponent(location.pathname.match(/^\/artist-studio\/([A-Za-z0-9]{22})\/?$/)?.[1]||'');
let user,submission,artworks=[],selected=null,busy=false,dirty=false,staffMode=false,welcome=false;
// ?as=staff opens the same editor for UNFRAME staff to pre-fill an upload before sending the link.
const wantsStaff=new URLSearchParams(location.search).get('as')==='staff';
const load_=id=>getSubmission(id,{staff:staffMode});
const canEdit=()=>staffMode?submission.status!=='submitted':artistCanEdit(submission.status);
const dateText=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(value));
const badge=required=>`<small class="field-badge">${required?'필수':'선택'}</small>`;
const options=(map,value)=>Object.entries(map).map(([key,text])=>`<option value="${key}" ${key===value?'selected':''}>${e(text)}</option>`).join('');
const demoNote=()=>demo?'<div class="notice">샘플 체험 · 실제 Google 로그인과 저장은 수행하지 않습니다. 이 브라우저에만 저장됩니다.</div>':'';
addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
async function load(){
 if(wantsStaff){
  staffMode=demo||await isStaff(await session());
  if(!staffMode){$('#main').innerHTML='<section class="studio-card"><h1>관리자 계정이 필요합니다</h1><p class="studio-lead">관리자 화면에서 Google 계정으로 로그인한 뒤 다시 열어주세요.</p><a class="button" href="/admin">관리자 화면으로</a></section>';return;}
  const data=await load_(id);if(!data)return unavailable();({submission,artworks}=data);return editor();
 }
 user=await artistSession();
 const invite=await getInvite(id);
 const state=studioState({invite,user});
 if(state==='editor'||state==='locked'){const data=await getSubmission(id);if(!data)return unavailable();({submission,artworks}=data);return editor();}
 if(state==='landing')return landing(invite);
 if(state==='signin')return signin();
 return unavailable();
}
function landing(invite){
 $('#main').innerHTML=`<section class="studio-card">${demoNote()}<p class="studio-kicker">UNFRAME · 버추얼 갤러리</p><h1>${e(invite.artistName)} 작가님, 초대합니다</h1><p class="studio-lead">「${e(invite.exhibitionTitle)}」 버추얼 갤러리에 작품을 직접 올려주세요.</p><div class="studio-ownership" role="note"><strong>처음 로그인한 Google 계정에 권한이 연결됩니다</strong><p>${e(OWNERSHIP_NOTICE.split('. ').slice(1).join('. '))}</p>${invite.invitedEmail?`<p>이 초대는 <b>${e(invite.invitedEmail)}</b> 계정으로만 사용할 수 있습니다.</p>`:''}</div><ul class="studio-steps"><li>작품 이미지와 정보를 올리고 3D 공간을 미리 볼 수 있습니다.</li><li>심사 요청 후 언프레임이 승인하면 공개됩니다.</li><li>마지막 수정 후 ${EXPIRY_DAYS}일 안에 승인되지 않으면 업로드 내용이 자동으로 삭제됩니다.</li><li>현재 기한: ${e(dateText(invite.expiresAt))}</li></ul><button class="button studio-primary" id="start-upload">업로드하기</button><p class="studio-hint">${user?`${e(user.email)} 계정으로 시작합니다.`:'버튼을 누르면 Google 로그인 창이 열립니다.'}</p><p id="studio-status" role="status"></p></section>`;
 $('#start-upload').onclick=async()=>{
  $('#start-upload').disabled=true;$('#studio-status').textContent='';
  try{if(!user)user=await artistLogin();await claimInvite(id);welcome=true;await load();}
  catch(error){$('#studio-status').textContent=studioError(error);$('#start-upload').disabled=false;}
 };
}
function signin(){
 $('#main').innerHTML=`<section class="studio-card">${demoNote()}<h1>업로드를 계속하려면 로그인해주세요</h1><p class="studio-lead">이미 이 링크로 업로드를 시작했다면, 처음 사용한 Google 계정으로 로그인하면 이어서 작업할 수 있습니다.</p><button class="button studio-primary" id="studio-signin">Google로 로그인</button><p id="studio-status" role="status"></p></section>`;
 $('#studio-signin').onclick=async()=>{try{user=await artistLogin();await load();}catch(error){$('#studio-status').textContent=studioError(error);}};
}
async function unavailable(){
 let galleries=[];try{if(user)galleries=await myGalleries();}catch{}
 $('#main').innerHTML=`<section class="studio-card">${demoNote()}<h1>이 링크를 열 수 없습니다</h1><p class="studio-lead">기한(마지막 수정 후 ${EXPIRY_DAYS}일)이 지났거나, 이미 승인되어 처리되었거나, 다른 Google 계정에 연결된 초대입니다. 계속 진행이 필요하면 언프레임에 문의해주세요.</p>${user?`<p class="studio-hint">현재 로그인: ${e(user.email)} · <button class="text-link" id="studio-switch">다른 계정으로 로그인</button></p>`:''}${galleries.length?`<h2>내 버추얼 갤러리</h2><div class="studio-galleries">${galleries.map(item=>`<article><div><strong>${e(item.settings.title)}</strong><span>${item.settings.published?'공개 중':'비공개'}</span></div><div class="actions"><a class="button secondary" href="/virtual-gallery/${encodeURIComponent(item.id)}${item.settings.published?'':'?preview=1'}">갤러리 보기</a><button class="button" data-revision="${e(item.id)}">수정본 만들기</button></div></article>`).join('')}</div><p class="studio-hint">수정본을 승인받기 전까지 공개 갤러리는 그대로 유지됩니다.</p>`:''}</section>`;
 if($('#studio-switch'))$('#studio-switch').onclick=async()=>{await artistLogout();user=null;await load();};
 document.querySelectorAll('[data-revision]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const next=await createRevision(button.dataset.revision);location.href=`/artist-studio/${next}`;}catch(error){toast(studioError(error));button.disabled=false;}});
}
function editor(){
 const editable=canEdit(),left=daysLeft(submission.expiresAt);
 $('#main').innerHTML=`<section class="studio-editor">${demoNote()}<div class="studio-bar"><div><h1>${e(submission.artistName)} · ${e(submission.exhibitionTitle)}</h1><p>${staffMode?'관리자 사전 업로드 중':e(user.email)+' 계정으로 로그인됨'}${submission.targetGalleryId?' · 공개 갤러리 수정본':''}</p></div><div class="actions"><span class="studio-status status-${e(submission.status)}">${e(STATUS[submission.status])}</span><a class="button secondary" href="/virtual-gallery/submission/${encodeURIComponent(id)}" target="_blank" rel="noopener">3D 미리보기 ↗</a>${staffMode?'<a class="button secondary" href="/admin">관리자로 돌아가기</a>':editable?'<button class="button" id="request-review">심사 요청</button>':'<button class="button secondary" id="cancel-review">요청 취소</button>'}</div></div>${staffMode?'<div class="notice studio-staff-note"><strong>관리자 사전 업로드 모드</strong><br>여기서 올린 작품과 공간 설정은 작가가 링크를 열면 그대로 보이며, 작가가 고치거나 지울 수 있습니다. 작가가 심사를 요청하면 더는 수정할 수 없습니다.</div>':''}${welcome&&artworks.length?`<div class="notice studio-welcome" role="status">언프레임이 작품 ${artworks.length}점을 미리 등록해 두었습니다. 확인하고 필요하면 수정해주세요.</div>`:''}<p class="studio-deadline${left<=2?' is-urgent':''}">${left}일 남음 · 마지막 수정 후 ${EXPIRY_DAYS}일 안에 승인되지 않으면 자동 삭제됩니다. (기한 ${e(dateText(submission.expiresAt))})</p>${submission.status==='rejected'&&submission.reviewNote?`<div class="studio-rejected" role="alert"><strong>수정 요청</strong><p>${e(submission.reviewNote)}</p></div>`:''}${!editable?'<div class="notice">심사 요청 중입니다. 언프레임이 확인하면 결과를 알려드립니다. 수정하려면 요청을 취소해주세요.</div>':''}<div class="studio-layout"><aside><div class="studio-list-head"><h2>작품 ${artworks.length} / 24</h2>${editable?'<button class="button secondary" id="add-artwork">작품 추가</button>':''}</div><div id="studio-artworks"></div><form id="studio-settings" class="studio-settings"><h2>공간 · 작가 소개</h2><div class="studio-live"><iframe id="studio-live" title="공간 설정 3D 미리보기" src="${e(previewURL(id,submission.settings))}"></iframe><small>바닥과 벽 색은 바로 바뀌고, 조명·천장은 잠시 다시 불러옵니다. 저장 전 미리보기이며 드래그로 둘러볼 수 있습니다.</small></div><label class="field"><span>작가 소개 ${badge(false)}</span><textarea name="artistNote" rows="4" maxlength="600" placeholder="관람객에게 보여줄 짧은 소개 (600자 이내)" ${editable?'':'disabled'}>${e(submission.settings.artistNote||'')}</textarea></label><label class="field"><span>바닥</span><select name="theme" ${editable?'':'disabled'}>${options(THEMES,submission.settings.theme)}</select></label><label class="field"><span>벽 색상</span><select name="wallColor" ${editable?'':'disabled'}>${options(wallColorOptions(submission.settings.wallColor),submission.settings.wallColor)}</select></label><label class="field"><span>조명</span><select name="lighting" ${editable?'':'disabled'}>${options(LIGHTING,submission.settings.lighting)}</select></label><label class="field"><span>천장</span><select name="ceiling" ${editable?'':'disabled'}>${options(CEILINGS,submission.settings.ceiling)}</select></label>${editable?'<button class="button secondary">설정 저장</button>':''}</form></aside><div id="studio-form-wrap"></div></div></section>`;
 welcome=false;
 renderList();renderForm();
 bindLivePreview();
 if(editable){
  $('#add-artwork').onclick=()=>{if(dirty&&!confirm('저장하지 않은 작품 변경 내용을 버릴까요?'))return;if(artworks.length>=24)return toast('작품은 최대 24점까지 등록할 수 있습니다.');selected={...emptyArtwork(),artist:submission.artistName,order:artworks.length};dirty=false;renderList();renderForm();};
  $('#studio-settings').onsubmit=async event=>{event.preventDefault();const values=new FormData(event.target);await run(()=>saveSubmissionSettings(id,Object.fromEntries(values),{asStaff:staffMode}),'공간 설정을 저장했습니다.');};
  if($('#request-review'))$('#request-review').onclick=async()=>{if(dirty&&!confirm('저장하지 않은 작품 변경 내용이 있습니다. 저장하지 않고 심사를 요청할까요?'))return;await run(()=>setSubmissionStatus(id,'submitted'),'심사를 요청했습니다. 언프레임이 확인 후 공개합니다.');};
 }else if($('#cancel-review'))$('#cancel-review').onclick=()=>run(()=>setSubmissionStatus(id,'draft'),'심사 요청을 취소했습니다. 다시 수정할 수 있습니다.');
}
// Floor and wall colour update the framed room instantly; lighting and ceiling rebuild it.
function bindLivePreview(){
 const form=$('#studio-settings'),frame=$('#studio-live');
 form.addEventListener('change',event=>{
  const values=Object.fromEntries(new FormData(form));
  if(['lighting','ceiling'].includes(event.target.name))frame.src=previewURL(id,values);
  else if(['theme','wallColor'].includes(event.target.name))frame.contentWindow?.postMessage({type:'unframe-look',theme:values.theme,wallColor:values.wallColor},location.origin);
 });
}
async function run(action,done){
 if(busy)return;busy=true;
 try{await action();dirty=false;toast(done);const data=await load_(id);if(!data)return unavailable();({submission,artworks}=data);if(selected)selected=artworks.find(art=>art.id===selected.id)||null;editor();}
 catch(error){toast(studioError(error));}
 finally{busy=false;}
}
function renderList(){
 $('#studio-artworks').innerHTML=artworks.length?artworks.map(art=>`<button type="button" class="studio-art${selected?.id===art.id?' is-selected':''}" data-art="${e(art.id)}"><img data-art-image="${e(art.id)}" src="${e(imageURL(art.image.url)||'/assets/zero.svg')}" alt=""><span><strong>${e(art.title)}</strong><small>${e(WALLS[art.wall])} · ${e(art.heightCm)} × ${e(art.widthCm)} cm</small></span></button>`).join(''):'<p class="studio-empty">아직 작품이 없습니다. 작품 추가를 눌러 시작해주세요.</p>';
 document.querySelectorAll('[data-art]').forEach(button=>button.onclick=()=>{if(dirty&&!confirm('저장하지 않은 작품 변경 내용을 버릴까요?'))return;selected=structuredClone(artworks.find(art=>art.id===button.dataset.art));dirty=false;renderList();renderForm();});
 Promise.allSettled(artworks.filter(art=>art.image.path&&!art.image.url).map(async art=>{const image=await resolveImage(art.image);art.image=image;document.querySelectorAll(`[data-art-image="${art.id}"]`).forEach(img=>{img.src=image.url;});}));
}
function renderForm(){
 const wrap=$('#studio-form-wrap'),editable=canEdit();
 if(!selected){wrap.innerHTML=`<div class="studio-placeholder"><p>${artworks.length?'왼쪽에서 작품을 선택하거나 새 작품을 추가해주세요.':'작품 추가를 눌러 첫 작품을 올려주세요.'}</p></div>`;return;}
 const art=selected,exists=artworks.some(item=>item.id===art.id),field=(name,label,value,required,attrs='')=>`<label class="field"><span>${label} ${badge(required)}</span><input name="${name}" value="${e(value)}" ${required?'required':''} ${attrs} ${editable?'':'disabled'}></label>`;
 wrap.innerHTML=`<form id="studio-art-form" class="studio-art-form"><h2>${exists?'작품 수정':'작품 추가'}</h2><label class="upload-zone studio-drop">작품 이미지 ${badge(true)}<small>JPG·PNG·WebP · ${demo?'2':'10'}MB 이하 · 정면 촬영 이미지 권장</small><input id="studio-image" type="file" accept="image/jpeg,image/png,image/webp" ${editable?'':'disabled'}></label><p id="studio-image-status" role="status"></p><img id="studio-image-preview" data-art-image="${e(art.id)}" src="${e(imageURL(art.image.url)||'/assets/zero.svg')}" alt="작품 이미지 미리보기">${field('title','작품명',art.title,true,'maxlength="200"')}<div class="studio-row">${field('heightCm','세로 (cm)',art.heightCm,true,'type="number" min="10" max="500" step="any"')}${field('widthCm','가로 (cm)',art.widthCm,true,'type="number" min="10" max="500" step="any"')}</div><div class="studio-row"><label class="field"><span>벽면 ${badge(true)}</span><select name="wall" ${editable?'':'disabled'}>${options(WALLS,art.wall)}</select></label><label class="field"><span>형태 ${badge(true)}</span><select name="frame" ${editable?'':'disabled'}>${options(FRAMES,art.frame)}</select></label></div><div class="studio-row">${field('year','제작연도',art.year,false,'maxlength="20" placeholder="2026"')}${field('medium','재료',art.medium,false,'maxlength="500" placeholder="캔버스에 유채"')}</div><label class="field"><span>작품 설명 ${badge(false)}</span><textarea name="description" maxlength="5000" rows="4" ${editable?'':'disabled'}>${e(art.description)}</textarea></label>${field('imageAlt','이미지 설명',art.image.alt,false,'maxlength="1000" placeholder="화면 낭독용 짧은 설명"')}<p class="studio-hint">세로 × 가로는 실제 작품 크기입니다. 공간에서 자동으로 줄이지 않습니다.</p><p id="studio-art-status" role="status"></p>${editable?`<div class="actions">${exists?'<button type="button" class="button secondary danger-text" id="delete-artwork">삭제</button>':''}<button class="button">작품 저장</button></div>`:''}</form>`;
 const form=$('#studio-art-form');form.oninput=()=>{dirty=true;};
 if(!editable)return;
 $('#studio-image').onchange=async event=>{const file=event.target.files[0];if(!file)return;busy=true;try{const image=await uploadImage(file,id,percent=>$('#studio-image-status').textContent=`업로드 중 ${percent}%`,'virtualSubmissions',art.id);art.image=await resolveImage({...image,alt:form.elements.imageAlt.value||file.name});$('#studio-image-preview').src=art.image.url;dirty=true;$('#studio-image-status').textContent='업로드 완료 · 작품 저장을 눌러 반영해주세요.';}catch(error){$('#studio-image-status').textContent=studioError(error);}finally{busy=false;event.target.value='';}};
 form.onsubmit=async event=>{
  event.preventDefault();const values=new FormData(form),data={...art,artist:submission.artistName};
  for(const key of ['title','year','medium','description','wall','frame'])data[key]=String(values.get(key)||'').trim();
  for(const key of ['widthCm','heightCm'])data[key]=Number(values.get(key));
  data.image={...art.image,alt:String(values.get('imageAlt')||'').trim()};
  const {url,...stored}=data.image;const payload={...data,image:demo?data.image:{...stored,url:''}};
  $('#studio-art-status').textContent='저장 중…';
  await run(()=>saveSubmissionArtwork(id,payload,{asStaff:staffMode}),'작품을 저장했습니다.');selected=artworks.find(item=>item.id===art.id)||selected;
 };
 if($('#delete-artwork'))$('#delete-artwork').onclick=async()=>{if(!await confirmDelete('이 작품을 삭제할까요?',`「${art.title}」의 정보와 이미지를 삭제합니다.`))return;selected=null;await run(()=>deleteSubmissionArtwork(id,art.id,{asStaff:staffMode}),'작품을 삭제했습니다.');};
}
if(!id)$('#main').innerHTML='<section class="studio-card"><h1>업로드 링크를 확인해주세요</h1><p class="studio-lead">언프레임에서 받은 링크 전체를 그대로 열어주세요.</p></section>';
else load().catch(error=>{$('#main').innerHTML=`<section class="studio-card"><h1>업로드 화면을 열지 못했습니다</h1><p class="studio-lead">${e(studioError(error))}</p></section>`;});
