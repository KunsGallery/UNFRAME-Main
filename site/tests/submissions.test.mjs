import {test} from 'node:test';import assert from 'node:assert/strict';
import {EXPIRY_DAYS,newSubmissionId,expiryFrom,daysLeft,isExpired,artistCanEdit,canTransition,inviteURL,inviteMessage,validateInvite,diffArtworks,submissionImagePath,isSubmissionPath,OWNERSHIP_NOTICE} from '../js/submission-model.js';
const DAY=86400000;
test('submission ids are unguessable 22-character base62 values',()=>{
 const ids=new Set(Array.from({length:1000},newSubmissionId));
 assert.equal(ids.size,1000);
 for(const id of ids)assert.match(id,/^[A-Za-z0-9]{22}$/);
});
test('expiry is ten days after the last write and remaining days round up',()=>{
 const now=new Date('2026-10-21T00:00:00Z');
 assert.equal(EXPIRY_DAYS,10);
 assert.equal(expiryFrom(now).toISOString(),'2026-10-31T00:00:00.000Z');
 assert.equal(daysLeft(new Date(now.getTime()+10*DAY),now),10);
 assert.equal(daysLeft(new Date(now.getTime()+9.2*DAY),now),10);
 assert.equal(daysLeft(new Date(now.getTime()-DAY),now),0);
 assert.equal(isExpired(new Date(now.getTime()-1),now),true);
 assert.equal(isExpired(new Date(now.getTime()+1),now),false);
});
test('artists edit drafts and rejected uploads but only toggle a submitted request',()=>{
 assert.equal(artistCanEdit('draft'),true);assert.equal(artistCanEdit('rejected'),true);assert.equal(artistCanEdit('submitted'),false);assert.equal(artistCanEdit('invited'),false);
 assert.equal(canTransition('draft','submitted','artist'),true);
 assert.equal(canTransition('rejected','submitted','artist'),true);
 assert.equal(canTransition('submitted','draft','artist'),true);
 assert.equal(canTransition('invited','submitted','artist'),false);
 assert.equal(canTransition('submitted','rejected','artist'),false);
 assert.equal(canTransition('submitted','rejected','staff'),true);
});
test('invite message carries the link, names and the account-binding notice',()=>{
 const url=inviteURL('abcDEF1234567890abcdEF','https://unframe.kr');
 assert.equal(url,'https://unframe.kr/artist-studio/abcDEF1234567890abcdEF');
 const text=inviteMessage({artistName:'김하늘',exhibitionTitle:'Resonance',url,expiresAt:new Date('2026-10-31T00:00:00Z')});
 for(const part of ['김하늘','Resonance',url,OWNERSHIP_NOTICE,'10일'])assert.ok(text.includes(part),part);
 assert.match(OWNERSHIP_NOTICE,/처음 로그인한 Google 계정/);
});
test('invites require an artist name and normalise an optional email',()=>{
 assert.throws(()=>validateInvite({artistName:' ',invitedEmail:''}),/작가명/);
 assert.throws(()=>validateInvite({artistName:'작가',invitedEmail:'not-an-email'}),/이메일/);
 assert.deepEqual(validateInvite({artistName:' 작가 ',invitedEmail:' A@B.com '}),{artistName:'작가',invitedEmail:'a@b.com'});
 assert.deepEqual(validateInvite({artistName:'작가',invitedEmail:''}),{artistName:'작가',invitedEmail:''});
});
test('artwork diff classifies additions, changes and removals by id',()=>{
 const a={id:'a',title:'A',updatedAt:'1'},b={id:'b',title:'B',updatedAt:'1'},c={id:'c',title:'C'};
 assert.deepEqual(diffArtworks([a,b],[{...a,updatedAt:'2'},{...b,title:'B2'},c]),{added:['c'],changed:['b'],removed:[]});
 assert.deepEqual(diffArtworks([a,b],[a]),{added:[],changed:[],removed:['b']});
});
test('submission image paths stay inside their own submission',()=>{
 const path=submissionImagePath('sub1','art1','webp');
 assert.match(path,/^virtualSubmissions\/sub1\/art1\/[0-9a-f-]{36}\.webp$/);
 assert.equal(isSubmissionPath(path,'sub1'),true);
 assert.equal(isSubmissionPath(path,'sub2'),false);
 assert.equal(isSubmissionPath('virtualGalleries/sub1/art1/x.webp','sub1'),false);
});
import {createInvite,getInvite,claimInvite,getSubmission,saveSubmissionSettings,saveSubmissionArtwork,deleteSubmissionArtwork,setSubmissionStatus,listSubmissions,countPending,extendSubmission,rejectSubmission,approveSubmission,purgeExpiredSubmissions,myGalleries,createRevision,artistLogin,DEMO_ARTIST_EMAIL} from '../js/submission-store.js';
import {getVirtualGallery} from '../js/virtual-store.js';
import {emptyArtwork} from '../js/virtual-model.js';
const exhibition={id:'resonance',title:'Resonance: 빛과 소리의 공명'};
function memoryStorage(){const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};return values;}
const work=(id,extra={})=>({...emptyArtwork(),id,title:`작품 ${id}`,artist:'김하늘',year:'2026',medium:'캔버스에 유채',image:{url:'',path:`virtualSubmissions/SUB/${id}/12345678-1234-1234-1234-123456789012.webp`,alt:'정면 이미지'},...extra});
async function invitedDraft(){
 const invite=await createInvite(exhibition,{artistName:'김하늘',invitedEmail:''});
 await artistLogin();await claimInvite(invite.id);
 const fix=art=>({...art,image:{...art.image,path:art.image.path.replace('SUB',invite.id)}});
 return {id:invite.id,fix};
}
test('invited artist uploads, requests review and staff approval publishes a new artist gallery',async()=>{
 memoryStorage();
 const invite=await createInvite(exhibition,{artistName:'김하늘',invitedEmail:''});
 assert.equal(invite.status,'invited');assert.equal(invite.exhibitionTitle,exhibition.title);
 assert.equal((await getInvite(invite.id)).artistName,'김하늘');
 await artistLogin();const claimed=await claimInvite(invite.id);
 assert.equal(claimed.ownerEmail,DEMO_ARTIST_EMAIL);assert.equal(claimed.status,'draft');
 await saveSubmissionSettings(invite.id,{theme:'wood',wallColor:'#ffffff',lighting:'focused',ceiling:'plain',published:true});
 const art={...work('a1'),image:{url:'',path:`virtualSubmissions/${invite.id}/a1/12345678-1234-1234-1234-123456789012.webp`,alt:'정면'}};
 await saveSubmissionArtwork(invite.id,art);
 await setSubmissionStatus(invite.id,'submitted');
 assert.equal(await countPending(),1);
 await assert.rejects(saveSubmissionArtwork(invite.id,work('a2')),/심사/);
 const copied=[];
 const galleryId=await approveSubmission(invite.id,{publish:true,copy:async pairs=>{copied.push(...pairs);}});
 const gallery=await getVirtualGallery(galleryId,{admin:true});
 assert.equal(gallery.settings.published,true);assert.equal(gallery.settings.artistEmail,DEMO_ARTIST_EMAIL);
 assert.equal(gallery.settings.theme,'wood');assert.equal(gallery.settings.exhibitionId,'resonance');
 assert.equal(gallery.artworks.length,1);assert.equal(gallery.artworks[0].year,'2026');assert.equal(gallery.artworks[0].medium,'캔버스에 유채');
 assert.match(gallery.artworks[0].image.path,new RegExp(`^virtualGalleries/${galleryId}/a1/`));
 assert.deepEqual(copied,[{from:art.image.path,to:gallery.artworks[0].image.path}]);
 assert.equal(await getInvite(invite.id),null);assert.equal(await getSubmission(invite.id),null);
 assert.deepEqual((await myGalleries()).map(item=>item.id),[galleryId]);
 delete globalThis.localStorage;
});
test('submitted requests can be cancelled, rejected with a note and edited again',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));
 await setSubmissionStatus(id,'submitted');await setSubmissionStatus(id,'draft');
 await setSubmissionStatus(id,'submitted');
 await assert.rejects(rejectSubmission(id,' '),/사유/);
 await rejectSubmission(id,'이미지 해상도를 높여주세요.');
 const {submission}=await getSubmission(id);
 assert.equal(submission.status,'rejected');assert.equal(submission.reviewNote,'이미지 해상도를 높여주세요.');
 await saveSubmissionArtwork(id,fix(work('a2')));await deleteSubmissionArtwork(id,'a1');
 assert.deepEqual((await getSubmission(id)).artworks.map(art=>art.id),['a2']);
 delete globalThis.localStorage;
});
test('invited email locks the claim to that account',async()=>{
 memoryStorage();
 const invite=await createInvite(exhibition,{artistName:'작가',invitedEmail:'someone@example.com'});
 await artistLogin();await assert.rejects(claimInvite(invite.id),/다른 계정/);
 delete globalThis.localStorage;
});
test('expired uploads disappear for artists and are purged by staff',async()=>{
 const values=memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));
 const key='unframe-virtual-submissions-demo-v1',all=JSON.parse(values.get(key));
 all[id].submission.touchedAt=new Date(Date.now()-11*86400000).toISOString();values.set(key,JSON.stringify(all));
 assert.equal(await getInvite(id),null);assert.equal(await getSubmission(id),null);
 await assert.rejects(saveSubmissionArtwork(id,fix(work('a2'))),/기한/);
 assert.equal((await listSubmissions('resonance')).length,1);
 assert.equal(await purgeExpiredSubmissions(),1);
 assert.equal((await listSubmissions('resonance')).length,0);
 delete globalThis.localStorage;
});
test('extending a submission resets the ten-day clock',async()=>{
 const values=memoryStorage();const {id}=await invitedDraft();
 const key='unframe-virtual-submissions-demo-v1',all=JSON.parse(values.get(key));
 all[id].submission.touchedAt=new Date(Date.now()-9*86400000).toISOString();values.set(key,JSON.stringify(all));
 await extendSubmission(id);
 const [item]=await listSubmissions('resonance');
 assert.ok(item.expiresAt-Date.now()>9.9*86400000);
 delete globalThis.localStorage;
});
test('approve is idempotent after partial failure',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));await saveSubmissionArtwork(id,fix(work('a2',{wall:'left'})));
 await setSubmissionStatus(id,'submitted');
 await assert.rejects(approveSubmission(id,{publish:true,copy:async()=>{throw new Error('복사 실패');}}),/복사 실패/);
 assert.ok(await getSubmission(id));
 const galleryId=await approveSubmission(id,{publish:true,copy:async()=>{}});
 const gallery=await getVirtualGallery(galleryId,{admin:true});
 assert.equal(gallery.artworks.length,2);
 delete globalThis.localStorage;
});
test('revision approval removes dropped artworks and keeps existing images',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));await saveSubmissionArtwork(id,fix(work('a2',{wall:'left'})));
 await setSubmissionStatus(id,'submitted');
 const galleryId=await approveSubmission(id,{publish:true,copy:async()=>{}});
 const revision=await createRevision(galleryId);
 const draft=await getSubmission(revision);
 assert.equal(draft.submission.targetGalleryId,galleryId);assert.equal(draft.artworks.length,2);
 assert.match(draft.artworks[0].image.path,/^virtualGalleries\//);
 await deleteSubmissionArtwork(revision,'a2');
 await saveSubmissionArtwork(revision,{...draft.artworks[0],title:'고친 제목'});
 await setSubmissionStatus(revision,'submitted');
 const removed=[];
 assert.equal(await approveSubmission(revision,{publish:false,copy:async()=>{},remove:async path=>removed.push(path)}),galleryId);
 const gallery=await getVirtualGallery(galleryId,{admin:true});
 assert.deepEqual(gallery.artworks.map(art=>art.title),['고친 제목']);
 assert.equal(gallery.settings.published,true);
 assert.equal(removed.length,1);assert.match(removed[0],new RegExp(`^virtualGalleries/${galleryId}/a2/`));
 delete globalThis.localStorage;
});
import {inviteCardHTML,pendingNoticeHTML} from '../js/admin-submissions.js';
const card=(extra={})=>({id:'AbCdEfGhIjKlMnOpQrStUv',exhibitionTitle:'Resonance',artistName:'김하늘',invitedEmail:'',ownerEmail:'',status:'invited',reviewNote:'',touchedAt:new Date('2026-10-21T00:00:00Z'),expiresAt:new Date('2026-10-31T00:00:00Z'),...extra});
test('invite cards show status, remaining days and urgent styling at two days or less',()=>{
 const now=new Date('2026-10-21T00:00:00Z');
 const html=inviteCardHTML(card(),now);
 assert.match(html,/초대됨/);assert.match(html,/10일 남음/);assert.doesNotMatch(html,/is-urgent/);
 assert.match(html,/data-invite-copy-link="AbCdEfGhIjKlMnOpQrStUv"/);assert.match(html,/data-invite-copy-message/);
 assert.doesNotMatch(html,/mailto:/);
 assert.match(inviteCardHTML(card(),new Date('2026-10-29T00:00:00Z')),/is-urgent/);
 assert.match(inviteCardHTML(card({invitedEmail:'a@b.com'}),now),/mailto:a@b\.com\?subject=/);
 assert.match(inviteCardHTML(card({status:'submitted',ownerEmail:'a@b.com'}),now),/data-review="AbCdEfGhIjKlMnOpQrStUv"/);
});
test('invite card escapes artist text',()=>{
 const html=inviteCardHTML(card({artistName:'<img src=x onerror=alert(1)>'}),new Date('2026-10-21T00:00:00Z'));
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
});
test('pending notice summarises review requests',()=>{
 assert.equal(pendingNoticeHTML([]),'');
 const html=pendingNoticeHTML([card({status:'submitted'}),card({id:'ZZZZZZZZZZZZZZZZZZZZZZ',status:'submitted',artistName:'박작가'})]);
 assert.match(html,/심사 대기 2건/);assert.match(html,/data-review="ZZZZZZZZZZZZZZZZZZZZZZ"/);
});
import {studioState,studioError} from '../js/artist-studio-model.js';
test('studio state follows sign-in, ownership and review status',()=>{
 const base={id:'x',ownerEmail:'',status:'invited'};
 assert.equal(studioState({invite:base,user:null}),'landing');
 assert.equal(studioState({invite:null,user:null}),'signin');
 assert.equal(studioState({invite:null,user:{email:'a@b.com'}}),'unavailable');
 assert.equal(studioState({invite:base,user:{email:'a@b.com'}}),'landing');
 assert.equal(studioState({invite:{...base,ownerEmail:'a@b.com',status:'draft'},user:{email:'a@b.com'}}),'editor');
 assert.equal(studioState({invite:{...base,ownerEmail:'a@b.com',status:'rejected'},user:{email:'a@b.com'}}),'editor');
 assert.equal(studioState({invite:{...base,ownerEmail:'a@b.com',status:'submitted'},user:{email:'a@b.com'}}),'locked');
 assert.equal(studioState({invite:{...base,ownerEmail:'c@d.com',status:'draft'},user:{email:'a@b.com'}}),'unavailable');
});
test('rule rejections become an artist-facing explanation',()=>{
 assert.match(studioError({code:'permission-denied'}),/기한이 지났거나 권한이 없습니다/);
 assert.equal(studioError(new Error('작품 제목과 작가명을 입력해주세요.')),'작품 제목과 작가명을 입력해주세요.');
 assert.match(studioError({}),/저장하지 못했습니다/);
});
import {submissionPreview} from '../js/submission-store.js';
import {validateGallery} from '../js/virtual-model.js';
test('submission preview renders as a private gallery with the artist settings',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionSettings(id,{theme:'urethane',wallColor:'#eeeeee',lighting:'focused',ceiling:'plain'});
 await saveSubmissionArtwork(id,fix(work('a1')));
 const preview=await submissionPreview(id);
 assert.equal(preview.settings.published,false);assert.equal(preview.settings.theme,'urethane');
 assert.equal(preview.settings.exhibitionId,'resonance');assert.match(preview.settings.title,/김하늘/);
 const {exhibitionId,artistName,order,exhibitionTitle,...plain}=preview.settings;assert.doesNotThrow(()=>validateGallery(plain));
 assert.equal(preview.artworks.length,1);
 assert.equal(await submissionPreview('missingmissingmissing00'),null);
 delete globalThis.localStorage;
});
import {deleteSubmission} from '../js/submission-store.js';
test('deleting a submission removes its documents before its images',async()=>{
 const values=memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));
 const seen=[];const docGone=()=>!JSON.parse(values.get('unframe-virtual-submissions-demo-v1'))[id];
 await deleteSubmission(id,{remove:async path=>seen.push(['image',docGone()]),purge:async prefixId=>seen.push(['prefix',prefixId,docGone()])});
 assert.deepEqual(seen,[['image',true],['prefix',id,true]]);
 delete globalThis.localStorage;
});
test('replacing an artwork image removes the previous submission upload',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 const first=fix(work('a1'));await saveSubmissionArtwork(id,first);
 const removed=[];const second={...first,image:{...first.image,path:`virtualSubmissions/${id}/a1/aaaaaaaa-1234-1234-1234-123456789012.webp`}};
 await saveSubmissionArtwork(id,second,{remove:async path=>removed.push(path)});
 assert.deepEqual(removed,[first.image.path]);
 await saveSubmissionArtwork(id,{...second,title:'제목만 변경'},{remove:async path=>removed.push(path)});
 assert.equal(removed.length,1);
 delete globalThis.localStorage;
});
test('pending notice warns how many days remain',()=>{
 const html=pendingNoticeHTML([card({status:'submitted',expiresAt:new Date(Date.now()+1.5*86400000)})]);
 assert.match(html,/2일 남음/);assert.match(html,/is-urgent/);
});
import {pickSubmissionSettings} from '../js/submission-store.js';
test('artist intro travels from the upload to the approved gallery and into revisions',async()=>{
 assert.throws(()=>pickSubmissionSettings({artistNote:'가'.repeat(601)}),/600/);
 assert.equal(pickSubmissionSettings({artistNote:'  소개  '}).artistNote,'소개');
 assert.equal(Object.hasOwn(pickSubmissionSettings({}),'artistNote'),false);
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionSettings(id,{theme:'white',wallColor:'#2f3d35',lighting:'general',ceiling:'plain',artistNote:'빛과 소리를 그립니다.'});
 await saveSubmissionArtwork(id,fix(work('a1')));await setSubmissionStatus(id,'submitted');
 assert.equal((await submissionPreview(id)).settings.artistNote,'빛과 소리를 그립니다.');
 const galleryId=await approveSubmission(id,{publish:true,copy:async()=>{}});
 assert.equal((await getVirtualGallery(galleryId,{admin:true})).settings.artistNote,'빛과 소리를 그립니다.');
 const revision=await createRevision(galleryId);
 assert.equal((await getSubmission(revision)).submission.settings.artistNote,'빛과 소리를 그립니다.');
 delete globalThis.localStorage;
});
import {deleteGalleryCompletely} from '../js/submission-store.js';
import {galleryDeleteName,deleteNameMatches} from '../js/virtual-model.js';
test('deleting a gallery removes its artworks, stored images and pending revisions',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionArtwork(id,fix(work('a1')));await setSubmissionStatus(id,'submitted');
 const galleryId=await approveSubmission(id,{publish:true,copy:async()=>{}});
 const revision=await createRevision(galleryId);
 const purged=[];
 await deleteGalleryCompletely(galleryId,{purge:async target=>purged.push(target)});
 assert.equal(await getVirtualGallery(galleryId,{admin:true}),null);
 assert.equal(await getSubmission(revision,{staff:true}),null);
 assert.deepEqual(purged,[galleryId]);
 delete globalThis.localStorage;
});
test('gallery deletion asks for the artist or gallery name',()=>{
 assert.equal(galleryDeleteName({artistName:'김하늘',title:'김하늘 · 공간'}),'김하늘');
 assert.equal(galleryDeleteName({title:'Resonance 전체'}),'Resonance 전체');
 assert.equal(deleteNameMatches(' 김하늘 ','김하늘'),true);
 assert.equal(deleteNameMatches('김하','김하늘'),false);
 assert.equal(deleteNameMatches('','김하늘'),false);
});
test('staff pre-upload artworks the artist sees after claiming the link',async()=>{
 memoryStorage();
 const invite=await createInvite(exhibition,{artistName:'김하늘',invitedEmail:''});
 const art={...work('a1'),image:{url:'',path:`virtualSubmissions/${invite.id}/a1/12345678-1234-1234-1234-123456789012.webp`,alt:'정면'}};
 await saveSubmissionArtwork(invite.id,art,{asStaff:true});
 await saveSubmissionSettings(invite.id,{theme:'wood',wallColor:'#f6f4ee',lighting:'general',ceiling:'plain'},{asStaff:true});
 const staffView=await getSubmission(invite.id,{staff:true});
 assert.equal(staffView.submission.status,'invited');assert.deepEqual(staffView.artworks.map(item=>item.id),['a1']);
 await artistLogin();await claimInvite(invite.id);
 const mine=await getSubmission(invite.id);
 assert.deepEqual(mine.artworks.map(item=>item.title),['작품 a1']);assert.equal(mine.submission.settings.theme,'wood');
 await saveSubmissionArtwork(invite.id,{...mine.artworks[0],title:'작가가 고친 제목'});
 await deleteSubmissionArtwork(invite.id,'a1',{asStaff:true});
 assert.equal((await getSubmission(invite.id)).artworks.length,0);
 await saveSubmissionArtwork(invite.id,art,{asStaff:true});await setSubmissionStatus(invite.id,'submitted');
 await assert.rejects(saveSubmissionArtwork(invite.id,{...art,title:'심사 중 수정'},{asStaff:true}),/심사/);
 await assert.rejects(saveSubmissionSettings(invite.id,{theme:'black',wallColor:'#f6f4ee',lighting:'general',ceiling:'plain'},{asStaff:true}),/심사/);
 delete globalThis.localStorage;
});
test('invite cards offer staff pre-upload until review is requested',()=>{
 const now=new Date('2026-10-21T00:00:00Z');
 assert.match(inviteCardHTML(card(),now),/href="\/artist-studio\/AbCdEfGhIjKlMnOpQrStUv\?as=staff"[^>]*>작품 미리 올리기/);
 assert.doesNotMatch(inviteCardHTML(card({status:'submitted',ownerEmail:'a@b.com'}),now),/작품 미리 올리기/);
});
test('uploads carry a room size and validate artwork placement against it',async()=>{
 assert.equal(pickSubmissionSettings({}).roomSize,'medium');
 assert.throws(()=>pickSubmissionSettings({roomSize:'huge'}),/공간/);
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionSettings(id,{theme:'white',wallColor:'#f6f4ee',lighting:'general',ceiling:'plain',roomSize:'small'});
 // Three 450 × 150cm works fit the 10m wall of the large room but not the 6m wall of the small one.
 await saveSubmissionArtwork(id,fix(work('w1',{widthCm:450,heightCm:150})));await saveSubmissionArtwork(id,fix(work('w2',{widthCm:450,heightCm:150})));
 await assert.rejects(saveSubmissionArtwork(id,fix(work('w3',{widthCm:450,heightCm:150}))),/들어가지 않습니다/);
 await deleteSubmissionArtwork(id,'w1');await deleteSubmissionArtwork(id,'w2');
 await saveSubmissionArtwork(id,fix(work('a1',{shape:'circle',widthCm:60,heightCm:60,frame:'none',saleStatus:'sold',price:'1,200,000원'})));
 const {artworks}=await getSubmission(id);
 assert.deepEqual([artworks[0].shape,artworks[0].saleStatus,artworks[0].price],['circle','sold','1,200,000원']);
 assert.equal((await submissionPreview(id)).settings.roomSize,'small');
 delete globalThis.localStorage;
});
test('approving an object upload copies its GLB beside the images and validates its spot',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 await saveSubmissionSettings(id,{theme:'white',wallColor:'#f6f4ee',lighting:'general',ceiling:'plain',roomSize:'medium'});
 const object=fix(work('o1',{kind:'object',depthCm:50,spot:'corner-front-left',yaw:0,plinth:'low',copies:1}));
 object.model={path:`virtualSubmissions/${id}/o1/aaaaaaaa-1234-1234-1234-123456789012.glb`,name:'lamp.glb'};
 await saveSubmissionArtwork(id,object);
 const second={...fix(work('o2',{kind:'object',depthCm:50,spot:'corner-front-left',yaw:0,plinth:'low',copies:1})),model:{path:`virtualSubmissions/${id}/o2/bbbbbbbb-1234-1234-1234-123456789012.glb`,name:'b.glb'}};
 await assert.rejects(saveSubmissionArtwork(id,second),/같은 전시 자리/);
 await setSubmissionStatus(id,'submitted');
 const copied=[];const galleryId=await approveSubmission(id,{publish:true,copy:async pairs=>copied.push(...pairs)});
 const art=(await getVirtualGallery(galleryId,{admin:true})).artworks[0];
 assert.match(art.model.path,new RegExp(`^virtualGalleries/${galleryId}/o1/aaaaaaaa`));
 assert.ok(copied.some(pair=>pair.to===art.model.path&&pair.from===object.model.path));
 delete globalThis.localStorage;
});

test('objects do not use up front-wall slots, and a room-size change must fit the objects',async()=>{
 memoryStorage();const {id,fix}=await invitedDraft();
 for(let n=0;n<8;n++)await saveSubmissionArtwork(id,fix(work('w'+n,{wall:'front',order:n,widthCm:50,heightCm:50})));
 const object={...fix(work('o1',{kind:'object',wall:'front',depthCm:40,spot:'center',yaw:0,plinth:'none',copies:1,widthCm:40,heightCm:60})),model:{path:`virtualSubmissions/${id}/o1/aaaaaaaa-1234-1234-1234-123456789012.glb`,name:'a.glb'}};
 await saveSubmissionArtwork(id,object);
 await saveSubmissionArtwork(id,{...object,id:'o2',spot:'corner-back-left',model:{path:`virtualSubmissions/${id}/o2/aaaaaaaa-1234-1234-1234-123456789012.glb`,name:'b.glb'}});
 await assert.rejects(saveSubmissionSettings(id,{theme:'white',wallColor:'#f6f4ee',lighting:'general',ceiling:'plain',roomSize:'small'}),/전시 자리/);
 delete globalThis.localStorage;
});
