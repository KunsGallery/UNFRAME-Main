import {encodeGallery,decodeGallery} from './gallery-codec.js';
import {CONFIG} from '../config.js';
import {DEMO_EXHIBITIONS} from './demo.js';
import {validateExhibition,todaySeoul} from './model.js';
const key='unframe-exhibitions-demo-v1';
export const demo = CONFIG.mode === 'demo';
let api;
async function firebase() {
 if(api) return api;
 if(CONFIG.mode !== 'firebase' || !CONFIG.firebase.apiKey || !CONFIG.firebase.projectId || !CONFIG.firebase.authDomain) throw new Error('Firebase 설정이 아직 완료되지 않았습니다. 운영 설정을 확인해주세요.');
 const [app,auth,db]=await Promise.all(['app','auth','firestore'].map(name=>import(`https://www.gstatic.com/firebasejs/13.0.0/firebase-${name}.js`)));
 const instance=app.initializeApp(CONFIG.firebase);
 api={auth,db,a:auth.getAuth(instance),d:db.getFirestore(instance)}; return api;
}
const localRead=()=>JSON.parse(localStorage.getItem(key)||'null') || structuredClone(DEMO_EXHIBITIONS);
const normalize=doc=>{const data=doc.data();return {...data,gallery:decodeGallery(data.gallery),id:doc.id};};
export async function listExhibitions(admin=false) { if(demo) return localRead().filter(x=>admin||x.published); const f=await firebase(); const collection=f.db.collection(f.d,'exhibitions'); const request=admin?collection:f.db.query(collection,f.db.where('published','==',true)); return (await f.db.getDocs(request)).docs.map(normalize); }
export async function getExhibition(id) { if(demo) return localRead().find(x=>x.id===id)||null; const f=await firebase(); const doc=await f.db.getDoc(f.db.doc(f.d,'exhibitions',id)); return doc.exists()?normalize(doc):null; }
export async function session() { if(demo) return null; const f=await firebase(); await f.a.authStateReady(); return f.a.currentUser; }
export async function login() { if(demo) throw new Error('샘플 모드에서는 Google 로그인을 사용하지 않습니다.'); const f=await firebase(); return (await f.auth.signInWithPopup(f.a,new f.auth.GoogleAuthProvider())).user; }
export async function logout() { if(!demo){const f=await firebase(); await f.auth.signOut(f.a);} }
export async function isStaff(user) { if(demo) return false; if(!user?.emailVerified) return false; const f=await firebase(); const record=await f.db.getDoc(f.db.doc(f.d,'staffEmails',user.email)); return record.exists()&&record.data().active===true && record.data().email===user.email; }
export async function saveExhibition(item) { validateExhibition(item); const data={...item,updatedAt:new Date().toISOString()}; if(demo){const list=localRead(); const at=list.findIndex(x=>x.id===item.id); if(at<0)list.push(data);else list[at]=data; try{localStorage.setItem(key,JSON.stringify(list));}catch{throw new Error('샘플 저장 공간이 부족합니다. 이미지 수나 크기를 줄여주세요.');}return data;} const f=await firebase(); const existing=await f.db.getDocs(f.db.query(f.db.collection(f.d,'exhibitions'),f.db.where('slug','==',data.slug))); if(existing.docs.some(x=>x.id!==data.id)) throw new Error('이미 사용 중인 전시 주소입니다. 다른 주소를 입력해주세요.'); const {id,...record}=data; record.cover={...record.cover,url:record.cover.path?'':record.cover.url}; record.imagePaths=[record.cover,...record.gallery].map(im=>im.path).filter(Boolean); record.gallery=encodeGallery(record.gallery); await f.db.setDoc(f.db.doc(f.d,'exhibitions',id),record); return data; }
export async function deleteExhibition(id) { if(demo){localStorage.setItem(key,JSON.stringify(localRead().filter(x=>x.id!==id)));return;} const f=await firebase(); await f.db.deleteDoc(f.db.doc(f.d,'exhibitions',id)); }
export async function uploadImage(file,id,onProgress=()=>{},collection='exhibitions',artId='') {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
 if(file.size > 10*1024*1024) throw new Error('이미지는 10MB 이하로 올려주세요.');
 if(demo){if(file.size>2*1024*1024)throw new Error('샘플 모드에서는 2MB 이하 이미지를 사용해주세요.'); const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});return {url,path:'',alt:file.name};}
 if(!['exhibitions','homeHighlights','virtualGalleries','virtualSubmissions','products'].includes(collection))throw new Error('잘못된 이미지 분류입니다.');
 const nested=collection==='virtualGalleries'||collection==='virtualSubmissions';
 if(nested&&!/^[A-Za-z0-9_-]{1,100}$/.test(artId))throw new Error('잘못된 작품 주소입니다.');
 const path=`${collection}/${id}/${nested?artId+'/':''}${crypto.randomUUID()}.${file.type.split('/')[1]}`;
 const token=await mediaToken();
 await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',mediaURL(path));xhr.setRequestHeader('Authorization',`Bearer ${token}`);xhr.setRequestHeader('Content-Type',file.type);xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve();else{let message='이미지 업로드에 실패했습니다.';try{message=JSON.parse(xhr.responseText).error||message;}catch{}reject(new Error(message));}};xhr.onerror=()=>reject(new Error('이미지 서버에 연결하지 못했습니다.'));xhr.send(file);});
 return {url:'',path,alt:file.name};
}
// GLB models for 3D objects: header-checked in the browser, 30MB, same storage paths as images.
export async function uploadModel(file,id,onProgress=()=>{},collection='virtualGalleries',artId='') {
 if(!/\.glb$/i.test(file.name))throw new Error('GLB 파일(.glb)만 올릴 수 있습니다.');
 if(file.size>30*1024*1024)throw new Error('3D 모델은 30MB 이하로 올려주세요.');
 const {inspectGlb}=await import('./glb-check.js');const check=inspectGlb(await file.arrayBuffer());if(!check.ok)throw new Error(check.reason);
 if(demo){if(file.size>2*1024*1024)throw new Error('샘플 모드에서는 2MB 이하 GLB를 사용해주세요.');const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});return {url,path:'',name:file.name};}
 if(!['virtualGalleries','virtualSubmissions'].includes(collection)||!/^[A-Za-z0-9_-]{1,100}$/.test(artId))throw new Error('잘못된 작품 주소입니다.');
 const path=`${collection}/${id}/${artId}/${crypto.randomUUID()}.glb`,token=await mediaToken();
 await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',mediaURL(path));xhr.setRequestHeader('Authorization',`Bearer ${token}`);xhr.setRequestHeader('Content-Type','model/gltf-binary');xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve();else{let message='3D 모델 업로드에 실패했습니다.';try{message=JSON.parse(xhr.responseText).error||message;}catch{}reject(new Error(message));}};xhr.onerror=()=>reject(new Error('이미지 서버에 연결하지 못했습니다.'));xhr.send(file);});
 return {url:'',path,name:file.name.slice(0,200)};
}
function mediaURL(path){if(!CONFIG.mediaBaseUrl)throw new Error('R2 이미지 서버 설정이 필요합니다.');return CONFIG.mediaBaseUrl.replace(/\/$/,'')+'/media/'+path;}
async function mediaToken(){const user=await session();if(!user)throw new Error('Google 로그인이 필요합니다.');return user.getIdToken();}
export async function resolveImage(image) { if(!image?.path||demo) return image;const user=await session();const headers=user?{Authorization:`Bearer ${await user.getIdToken()}`}:{ };const response=await fetch(mediaURL(image.path),{headers});if(!response.ok)throw new Error('전시 이미지를 불러오지 못했습니다.');return {...image,url:URL.createObjectURL(await response.blob())}; }
export async function hydrateImages(items,includeGallery=true) { return Promise.all(items.map(async item=>({...item,cover:await resolveImage(item.cover),gallery:includeGallery?await Promise.all((item.gallery||[]).map(resolveImage)):(item.gallery||[])}))); }
export async function resetDemo() { if(demo)localStorage.removeItem(key); }
// Staff-only server-side copy used when an artist submission is approved.
export async function copyImages(items) { if(demo||!items.length)return; const response=await fetch(mediaURL('').replace(/\/media\/$/,'/copy'),{method:'POST',headers:{Authorization:`Bearer ${await mediaToken()}`,'Content-Type':'application/json'},body:JSON.stringify({items})});if(!response.ok){let message='승인 이미지를 복사하지 못했습니다.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);} }
// Staff-only: removes every stored object of a submission, including replaced or unsaved uploads.
export async function purgeSubmissionImages(id) { if(demo)return; const response=await fetch(mediaURL('').replace(/\/media\/$/,'/purge/')+encodeURIComponent(id),{method:'POST',headers:{Authorization:`Bearer ${await mediaToken()}`}});if(!response.ok)throw new Error('업로드 이미지를 정리하지 못했습니다.'); }
// Staff-only: removes every stored image of a deleted virtual gallery.
export async function purgeGalleryImages(id) { if(demo)return; const response=await fetch(mediaURL('').replace(/\/media\/$/,'/purge-gallery/')+encodeURIComponent(id),{method:'POST',headers:{Authorization:`Bearer ${await mediaToken()}`}});if(!response.ok)throw new Error('갤러리 이미지를 정리하지 못했습니다.'); }
export async function removeImage(path) { if(!path||demo)return; const response=await fetch(mediaURL(path),{method:'DELETE',headers:{Authorization:`Bearer ${await mediaToken()}`}});if(!response.ok)throw new Error('사진 파일을 삭제하지 못했습니다.'); }

// A shared live source for the homepage and exhibition list. Demo changes propagate between tabs.
export async function subscribeExhibitions(callback,onError=()=>{}) {
 if(demo){const emit=()=>{try{Promise.resolve(callback(localRead().filter(x=>x.published))).catch(onError);}catch(error){onError(error);}};emit();const listener=event=>{if(event.key===key||event.key===null)emit();};addEventListener('storage',listener);const timer=setInterval(emit,60000);return ()=>{removeEventListener('storage',listener);clearInterval(timer);};}
 const f=await firebase();const request=f.db.query(f.db.collection(f.d,'exhibitions'),f.db.where('published','==',true));let cached=[],day=todaySeoul();const emit=()=>Promise.resolve(callback(cached)).catch(onError);const unsubscribe=f.db.onSnapshot(request,snapshot=>{cached=snapshot.docs.map(normalize);emit();},onError);const timer=setInterval(()=>{const next=todaySeoul();if(day!==next){day=next;emit();}},60000);return ()=>{unsubscribe();clearInterval(timer);};
}

// Reuse the authenticated Firebase instance for staff-managed homepage highlights.
export async function firestoreClient(){return firebase();}
