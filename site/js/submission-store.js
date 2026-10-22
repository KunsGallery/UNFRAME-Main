import {demo,firestoreClient,session,login,logout,getExhibition,removeImage,copyImages,purgeSubmissionImages,purgeGalleryImages} from './store.js';
import {getVirtualGallery,listVirtualGalleries,saveVirtualSettings,saveVirtualArtwork,deleteVirtualArtwork,deleteVirtualGallery} from './virtual-store.js';
import {validateArtwork,layoutArtworks,defaultArtistGallery,galleryExhibitionId,THEMES,LIGHTING,CEILINGS,ROOMS} from './virtual-model.js';
import {EXPIRY_DAYS,newSubmissionId,expiryFrom,isExpired,artistCanEdit,canTransition,validateInvite,isSubmissionPath} from './submission-model.js';
// Artist uploads stay in virtualSubmissions until staff approve them; rules and the media
// worker enforce ownership and expiry in production, this module mirrors them in demo mode.
export const DEMO_ARTIST_EMAIL='sample-artist@unframe.local';
const key='unframe-virtual-submissions-demo-v1',artistKey='unframe-demo-artist-session';
const read=()=>JSON.parse(localStorage.getItem(key)||'{}');
function write(all){try{localStorage.setItem(key,JSON.stringify(all));}catch{throw new Error('샘플 저장 공간이 부족합니다. 이미지 크기를 줄여주세요.');}}
const nowISO=()=>new Date().toISOString();
const toDate=value=>value?.toDate?value.toDate():new Date(value||Date.now());
const shape=(id,data)=>({...data,id,touchedAt:toDate(data.touchedAt),createdAt:toDate(data.createdAt),expiresAt:expiryFrom(toDate(data.touchedAt))});
const MAX_ARTWORKS=24,WALL_LIMIT=8;
const EXPIRED='업로드 기한이 지나 더 이상 수정할 수 없습니다. 언프레임에 문의해주세요.';
export function pickSubmissionSettings(settings={}){
 const data={theme:settings.theme||'white',wallColor:settings.wallColor||'#f6f4ee',lighting:settings.lighting||'general',ceiling:settings.ceiling||'luminous',roomSize:settings.roomSize||'medium'};
 if(!Object.hasOwn(THEMES,data.theme)||!/^#[0-9a-fA-F]{6}$/.test(data.wallColor)||!Object.hasOwn(LIGHTING,data.lighting)||!Object.hasOwn(CEILINGS,data.ceiling)||!Object.hasOwn(ROOMS,data.roomSize))throw new Error('공간 설정 값을 확인해주세요.');
 if(settings.artistNote!==undefined){const note=String(settings.artistNote).trim();if(note.length>600)throw new Error('작가 소개는 600자 이내로 입력해주세요.');data.artistNote=note;}
 return data;
}
const artworkData=artwork=>{const {id,...data}=artwork;return {...data,updatedAt:nowISO(),image:{url:demo?artwork.image.url:'',path:artwork.image.path,alt:artwork.image.alt}};};
function checkArtworkImage(submission,art){
 const path=art.image?.path||'';
 if(demo&&!path)return;
 if(!isSubmissionPath(path,submission.id)&&!(submission.targetGalleryId&&path.startsWith(`virtualGalleries/${submission.targetGalleryId}/${art.id}/`)))throw new Error('작품 이미지를 다시 업로드해주세요.');
}

// ---- artist session ----
export async function artistSession(){if(demo)return localStorage.getItem(artistKey)?{email:DEMO_ARTIST_EMAIL,demo:true}:null;const user=await session();return user?.emailVerified?user:null;}
export async function artistLogin(){if(demo){localStorage.setItem(artistKey,'1');return {email:DEMO_ARTIST_EMAIL,demo:true};}return login();}
export async function artistLogout(){if(demo){localStorage.removeItem(artistKey);return;}return logout();}
async function artistEmail(){const user=await artistSession();if(!user)throw new Error('Google 로그인이 필요합니다.');return user.email;}

// ---- reads ----
export async function getInvite(id){
 if(demo){const item=read()[id];return item&&!isExpired(expiryFrom(item.submission.touchedAt))?shape(id,item.submission):null;}
 const f=await firestoreClient();
 try{const doc=await f.db.getDoc(f.db.doc(f.d,'virtualSubmissions',id));return doc.exists()?shape(id,doc.data()):null;}catch(error){if(error.code==='permission-denied')return null;throw error;}
}
export async function getSubmission(id,{staff=false}={}){
 if(demo){const item=read()[id];if(!item||(!staff&&isExpired(expiryFrom(item.submission.touchedAt))))return null;return {submission:shape(id,item.submission),artworks:structuredClone(item.artworks).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))};}
 const f=await firestoreClient();
 try{
  const doc=await f.db.getDoc(f.db.doc(f.d,'virtualSubmissions',id));if(!doc.exists())return null;
  const works=await f.db.getDocs(f.db.collection(f.d,'virtualSubmissions',id,'artworks'));
  return {submission:shape(id,doc.data()),artworks:works.docs.map(work=>({...work.data(),id:work.id})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))};
 }catch(error){if(error.code==='permission-denied')return null;throw error;}
}
// Staff pre-fill an upload until review is requested; artists edit their own drafts.
async function editable(id,asStaff=false){
 if(asStaff){const data=await getSubmission(id,{staff:true});if(!data)throw new Error('업로드를 찾을 수 없습니다.');return {...data,canEdit:data.submission.status!=='submitted'};}
 const email=await artistEmail(),data=await getSubmission(id);
 if(!data){if(demo&&read()[id])throw new Error(EXPIRED);throw new Error('기한이 지났거나 권한이 없는 업로드입니다.');}
 if(data.submission.ownerEmail!==email)throw new Error('다른 계정에 연결된 초대입니다.');
 return {...data,email,canEdit:artistCanEdit(data.submission.status)};
}

// The 3D room renders a submission like a private gallery; access follows getSubmission.
export async function submissionPreview(id){
 const data=await getSubmission(id);if(!data)return null;const sub=data.submission;
 return {settings:{title:`${sub.artistName} · 업로드 미리보기`,subtitle:`${sub.exhibitionTitle} · 승인 전 미리보기`,published:false,brightness:1,speed:2.5,outdoor:true,showPrices:false,...sub.settings,exhibitionId:sub.exhibitionId,exhibitionTitle:sub.exhibitionTitle,artistName:sub.artistName},artworks:data.artworks};
}

// ---- artist writes ----
export async function claimInvite(id){
 const email=await artistEmail(),invite=await getInvite(id);
 if(!invite)throw new Error('기한이 지났거나 이미 다른 계정에 연결된 초대입니다.');
 if(invite.ownerEmail)return invite.ownerEmail===email?invite:Promise.reject(new Error('다른 계정에 연결된 초대입니다.'));
 if(invite.invitedEmail&&invite.invitedEmail!==email.toLowerCase())throw new Error(`이 초대는 다른 계정(${invite.invitedEmail})으로만 사용할 수 있습니다. 해당 Google 계정으로 다시 로그인해주세요.`);
 if(demo){const all=read();Object.assign(all[id].submission,{ownerEmail:email,status:'draft',touchedAt:nowISO()});write(all);return shape(id,all[id].submission);}
 const f=await firestoreClient();await f.db.updateDoc(f.db.doc(f.d,'virtualSubmissions',id),{ownerEmail:email,status:'draft',touchedAt:f.db.serverTimestamp()});
 return getInvite(id);
}
export async function saveSubmissionSettings(id,settings,{asStaff=false}={}){
 const {canEdit}=await editable(id,asStaff);if(!canEdit)throw new Error('심사 요청 중에는 수정할 수 없습니다. 요청을 취소한 뒤 수정해주세요.');
 const data=pickSubmissionSettings(settings);
 if(demo){const all=read();Object.assign(all[id].submission,{settings:data,touchedAt:nowISO()});write(all);return;}
 const f=await firestoreClient();await f.db.updateDoc(f.db.doc(f.d,'virtualSubmissions',id),{settings:data,touchedAt:f.db.serverTimestamp()});
}
export async function saveSubmissionArtwork(id,artwork,{remove=removeImage,asStaff=false}={}){
 const {submission,artworks,canEdit}=await editable(id,asStaff);
 if(!canEdit)throw new Error('심사 요청 중에는 수정할 수 없습니다. 요청을 취소한 뒤 수정해주세요.');
 validateArtwork(artwork);checkArtworkImage(submission,artwork);
 const others=artworks.filter(art=>art.id!==artwork.id);
 if(others.length>=MAX_ARTWORKS)throw new Error(`작품은 최대 ${MAX_ARTWORKS}점까지 등록할 수 있습니다.`);
 if(others.filter(art=>art.wall===artwork.wall).length>=WALL_LIMIT)throw new Error('한 벽면에는 최대 8점을 배치할 수 있습니다. 다른 벽면을 선택해주세요.');
 layoutArtworks([...others,artwork],submission.settings.roomSize);
 const data=artworkData(artwork);
 if(demo){const all=read(),list=all[id].artworks,index=list.findIndex(art=>art.id===artwork.id);if(index<0)list.push({...data,id:artwork.id});else list[index]={...data,id:artwork.id};all[id].submission.touchedAt=nowISO();write(all);await dropReplacedImage(id,artworks,artwork,remove);return;}
 // The rules require the parent touch in the same batch, so every save renews the ten-day clock.
 const f=await firestoreClient(),batch=f.db.writeBatch(f.d);
 batch.set(f.db.doc(f.d,'virtualSubmissions',id,'artworks',artwork.id),data);
 batch.update(f.db.doc(f.d,'virtualSubmissions',id),{touchedAt:f.db.serverTimestamp()});await batch.commit();
 await dropReplacedImage(id,artworks,artwork,remove);
}
// A replaced upload would otherwise count toward the per-submission cap until the end.
async function dropReplacedImage(id,artworks,artwork,remove){
 const previous=artworks.find(art=>art.id===artwork.id)?.image?.path;
 if(isSubmissionPath(previous,id)&&previous!==artwork.image?.path)await remove(previous).catch(()=>{});
}
export async function deleteSubmissionArtwork(id,artId,{asStaff=false}={}){
 const {artworks,canEdit}=await editable(id,asStaff);if(!canEdit)throw new Error('심사 요청 중에는 수정할 수 없습니다. 요청을 취소한 뒤 수정해주세요.');
 const art=artworks.find(item=>item.id===artId);if(!art)return;
 if(demo){const all=read();all[id].artworks=all[id].artworks.filter(item=>item.id!==artId);all[id].submission.touchedAt=nowISO();write(all);}
 else{const f=await firestoreClient(),batch=f.db.writeBatch(f.d);batch.delete(f.db.doc(f.d,'virtualSubmissions',id,'artworks',artId));batch.update(f.db.doc(f.d,'virtualSubmissions',id),{touchedAt:f.db.serverTimestamp()});await batch.commit();}
 if(isSubmissionPath(art.image?.path,id))await removeImage(art.image.path).catch(()=>{});
}
export async function setSubmissionStatus(id,status){
 const {submission,artworks}=await editable(id);
 if(!canTransition(submission.status,status,'artist'))throw new Error('지금은 이 요청을 처리할 수 없습니다.');
 if(status==='submitted'&&!artworks.length)throw new Error('심사를 요청하려면 작품을 한 점 이상 등록해주세요.');
 if(demo){const all=read();Object.assign(all[id].submission,{status,touchedAt:nowISO()});write(all);return;}
 const f=await firestoreClient();await f.db.updateDoc(f.db.doc(f.d,'virtualSubmissions',id),{status,touchedAt:f.db.serverTimestamp()});
}
export async function myGalleries(){
 const email=await artistEmail();
 if(demo){const all=JSON.parse(localStorage.getItem('unframe-virtual-galleries-demo-v2')||'{}');return Object.entries(all).filter(([,data])=>data.settings.artistEmail===email).map(([id,data])=>({id,settings:data.settings}));}
 const f=await firestoreClient();const docs=await f.db.getDocs(f.db.query(f.db.collection(f.d,'virtualGalleries'),f.db.where('artistEmail','==',email)));
 return docs.docs.map(doc=>({id:doc.id,settings:doc.data()}));
}
export async function createRevision(galleryId){
 const email=await artistEmail(),gallery=await getVirtualGallery(galleryId,{admin:true});
 if(!gallery||gallery.settings.artistEmail!==email)throw new Error('수정본을 만들 수 있는 갤러리가 아닙니다.');
 const id=newSubmissionId(),settings=pickSubmissionSettings(gallery.settings);
 const submission={exhibitionId:galleryExhibitionId(galleryId,gallery.settings),exhibitionTitle:gallery.settings.title.slice(0,200),artistName:gallery.settings.artistName||gallery.settings.title,invitedEmail:'',ownerEmail:email,targetGalleryId:galleryId,status:'draft',reviewNote:'',settings,approvedGalleryId:''};
 const works=gallery.artworks.map(art=>({...artworkData(art),id:art.id}));
 if(demo){const all=read();all[id]={submission:{...submission,createdAt:nowISO(),touchedAt:nowISO()},artworks:works};write(all);return id;}
 const f=await firestoreClient(),batch=f.db.writeBatch(f.d);
 batch.set(f.db.doc(f.d,'virtualSubmissions',id),{...submission,createdAt:f.db.serverTimestamp(),touchedAt:f.db.serverTimestamp()});
 for(const {id:artId,...data} of works)batch.set(f.db.doc(f.d,'virtualSubmissions',id,'artworks',artId),data);
 await batch.commit();return id;
}

// ---- staff ----
export async function createInvite(exhibition,{artistName,invitedEmail,targetGalleryId=''}){
 const values=validateInvite({artistName,invitedEmail}),id=newSubmissionId();
 const submission={exhibitionId:exhibition.id,exhibitionTitle:String(exhibition.title).slice(0,200),...values,ownerEmail:'',targetGalleryId,status:'invited',reviewNote:'',settings:pickSubmissionSettings(),approvedGalleryId:''};
 if(demo){const all=read();all[id]={submission:{...submission,createdAt:nowISO(),touchedAt:nowISO()},artworks:[]};write(all);return shape(id,all[id].submission);}
 const f=await firestoreClient();await f.db.setDoc(f.db.doc(f.d,'virtualSubmissions',id),{...submission,createdAt:f.db.serverTimestamp(),touchedAt:f.db.serverTimestamp()});
 return shape(id,{...submission,createdAt:new Date(),touchedAt:new Date()});
}
async function staffQuery(...filters){
 const f=await firestoreClient();const docs=await f.db.getDocs(f.db.query(f.db.collection(f.d,'virtualSubmissions'),...filters.map(([field,op,value])=>f.db.where(field,op,value))));
 return docs.docs.map(doc=>shape(doc.id,doc.data()));
}
const byNewest=list=>list.sort((a,b)=>b.touchedAt-a.touchedAt);
export async function listSubmissions(exhibitionId){
 if(demo)return byNewest(Object.entries(read()).filter(([,item])=>item.submission.exhibitionId===exhibitionId).map(([id,item])=>shape(id,item.submission)));
 return byNewest(await staffQuery(['exhibitionId','==',exhibitionId]));
}
export async function listPending(){
 if(demo)return byNewest(Object.entries(read()).filter(([,item])=>item.submission.status==='submitted'&&!isExpired(expiryFrom(item.submission.touchedAt))).map(([id,item])=>shape(id,item.submission)));
 return byNewest((await staffQuery(['status','==','submitted'])).filter(item=>!isExpired(item.expiresAt)));
}
export const countPending=async()=>(await listPending()).length;
async function staffUpdate(id,changes){
 if(demo){const all=read();if(!all[id])throw new Error('업로드를 찾을 수 없습니다.');Object.assign(all[id].submission,changes,{touchedAt:nowISO()});write(all);return;}
 const f=await firestoreClient();await f.db.updateDoc(f.db.doc(f.d,'virtualSubmissions',id),{...changes,touchedAt:f.db.serverTimestamp()});
}
export const extendSubmission=id=>staffUpdate(id,{});
export async function rejectSubmission(id,note){
 const reviewNote=String(note||'').trim();if(!reviewNote||reviewNote.length>1000)throw new Error('반려 사유를 1,000자 이내로 입력해주세요.');
 const data=await getSubmission(id,{staff:true});if(!data||!canTransition(data.submission.status,'rejected','staff'))throw new Error('심사 요청 상태에서만 반려할 수 있습니다.');
 await staffUpdate(id,{status:'rejected',reviewNote});
}
// Documents go first: if this fails nothing is lost, and an approval retry still finds its
// source images. Image cleanup afterwards is best effort; orphans are invisible.
export async function deleteSubmission(id,{remove=removeImage,purge=purgeSubmissionImages}={}){
 const data=await getSubmission(id,{staff:true});if(!data)return;
 if(demo){const all=read();delete all[id];write(all);}
 else{
  const f=await firestoreClient(),batch=f.db.writeBatch(f.d);
  for(const art of data.artworks)batch.delete(f.db.doc(f.d,'virtualSubmissions',id,'artworks',art.id));
  batch.delete(f.db.doc(f.d,'virtualSubmissions',id));await batch.commit();
 }
 for(const art of data.artworks)if(isSubmissionPath(art.image?.path,id))await remove(art.image.path).catch(()=>{});
 await purge(id).catch(error=>console.warn('업로드 이미지 일부를 정리하지 못했습니다.',id,error));
}
// Removes a gallery, any uploads still pointing at it, and every stored image under it.
// Returns false when the documents are gone but image cleanup needs a retry.
export async function deleteGalleryCompletely(galleryId,{purge=purgeGalleryImages}={}){
 const related=demo?Object.entries(read()).filter(([,item])=>[item.submission.targetGalleryId,item.submission.approvedGalleryId].includes(galleryId)).map(([id])=>id)
  :[...new Set([...(await staffQuery(['targetGalleryId','==',galleryId])),...(await staffQuery(['approvedGalleryId','==',galleryId]))].map(item=>item.id))];
 for(const id of related)await deleteSubmission(id);
 await deleteVirtualGallery(galleryId);
 try{await purge(galleryId);return true;}catch(error){console.warn('갤러리 이미지를 정리하지 못했습니다.',galleryId,error);return false;}
}
export async function purgeExpiredSubmissions(){
 const cutoff=new Date(Date.now()-EXPIRY_DAYS*86400000);
 const expired=demo?Object.entries(read()).filter(([,item])=>new Date(item.submission.touchedAt)<=cutoff).map(([id])=>id):(await staffQuery(['touchedAt','<=',cutoff])).map(item=>item.id);
 let count=0;for(const id of expired){try{await deleteSubmission(id);count++;}catch(error){console.warn('만료된 업로드를 정리하지 못했습니다.',id,error);}}
 return count;
}
// Steps are ordered so a retry after any failure converges: the gallery id is recorded
// first, copies keep their UUID file names, and the submission is deleted last.
export async function approveSubmission(id,{publish,copy=copyImages,remove=removeImage}){
 const data=await getSubmission(id,{staff:true});if(!data)throw new Error('업로드를 찾을 수 없습니다.');
 const {submission,artworks}=data;if(submission.status!=='submitted')throw new Error('심사 요청 상태에서만 승인할 수 있습니다.');
 if(!artworks.length)throw new Error('승인할 작품이 없습니다.');
 let galleryId=submission.targetGalleryId||submission.approvedGalleryId;
 if(!galleryId){galleryId=`artist-${crypto.randomUUID()}`;await staffUpdate(id,{approvedGalleryId:galleryId});}
 const existing=await getVirtualGallery(galleryId,{admin:true});
 const exhibition=await getExhibition(submission.exhibitionId);if(!exhibition)throw new Error('연결된 전시를 찾을 수 없습니다.');
 const order=existing?existing.settings.order:(await listVirtualGalleries(exhibition.id,{admin:true})).filter(item=>item.settings.artistName).length;
 const base=existing?.settings||defaultArtistGallery(exhibition,submission.artistName,order);
 const pairs=[],works=artworks.map(art=>{
  if(!isSubmissionPath(art.image?.path,id))return art;
  const to=art.image.path.replace(`virtualSubmissions/${id}/`,`virtualGalleries/${galleryId}/`);pairs.push({from:art.image.path,to});
  return {...art,image:{...art.image,path:to}};
 });
 if(pairs.length)await copy(pairs);
 const settings={...base,...submission.settings,artistEmail:submission.ownerEmail};
 const published=publish||!!existing?.settings.published;
 if(published)layoutArtworks(works,settings.roomSize);
 await saveVirtualSettings(galleryId,{...settings,published:!!existing?.settings.published&&published},existing?.artworks||[]);
 for(const art of works)await saveVirtualArtwork(galleryId,art);
 for(const old of existing?.artworks||[]){
  const kept=works.find(art=>art.id===old.id);
  if(!kept)await deleteVirtualArtwork(galleryId,old.id);
  if(old.image?.path&&old.image.path!==kept?.image.path)await remove(old.image.path).catch(()=>{});
 }
 await saveVirtualSettings(galleryId,{...settings,published},works);
 await deleteSubmission(id,{remove});
 return galleryId;
}
