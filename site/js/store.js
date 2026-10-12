import {CONFIG} from '../config.js';
import {DEMO_EXHIBITIONS} from './demo.js';
import {validateExhibition,todaySeoul} from './model.js';
const key='unframe-exhibitions-demo-v1';
export const demo = CONFIG.mode === 'demo';
let api;
async function firebase() {
 if(api) return api;
 if(CONFIG.mode !== 'firebase' || !CONFIG.firebase.apiKey || !CONFIG.firebase.projectId || !CONFIG.firebase.authDomain || !CONFIG.firebase.storageBucket) throw new Error('Firebase 설정이 아직 완료되지 않았습니다. 운영 설정을 확인해주세요.');
 const [app,auth,db,storage]=await Promise.all(['app','auth','firestore','storage'].map(name=>import(`https://www.gstatic.com/firebasejs/13.0.0/firebase-${name}.js`)));
 const instance=app.initializeApp(CONFIG.firebase);
 api={auth,db,storage,a:auth.getAuth(instance),d:db.getFirestore(instance),s:storage.getStorage(instance)}; return api;
}
const localRead=()=>JSON.parse(localStorage.getItem(key)||'null') || structuredClone(DEMO_EXHIBITIONS);
const normalize=doc=>({...doc.data(),id:doc.id});
export async function listExhibitions(admin=false) { if(demo) return localRead().filter(x=>admin||x.published); const f=await firebase(); const collection=f.db.collection(f.d,'exhibitions'); const request=admin?collection:f.db.query(collection,f.db.where('published','==',true)); return (await f.db.getDocs(request)).docs.map(normalize); }
export async function getExhibition(id) { if(demo) return localRead().find(x=>x.id===id)||null; const f=await firebase(); const doc=await f.db.getDoc(f.db.doc(f.d,'exhibitions',id)); return doc.exists()?normalize(doc):null; }
export async function session() { if(demo) return null; const f=await firebase(); await f.a.authStateReady(); return f.a.currentUser; }
export async function login() { if(demo) throw new Error('샘플 모드에서는 Google 로그인을 사용하지 않습니다.'); const f=await firebase(); return (await f.auth.signInWithPopup(f.a,new f.auth.GoogleAuthProvider())).user; }
export async function logout() { if(!demo){const f=await firebase(); await f.auth.signOut(f.a);} }
export async function isStaff(user) { if(demo) return false; if(!user?.emailVerified) return false; const f=await firebase(); const record=await f.db.getDoc(f.db.doc(f.d,'staff',user.uid)); return record.exists()&&record.data().active===true && record.data().email===user.email; }
export async function saveExhibition(item) { validateExhibition(item); const data={...item,updatedAt:new Date().toISOString()}; if(demo){const list=localRead(); const at=list.findIndex(x=>x.id===item.id); if(at<0)list.push(data);else list[at]=data; try{localStorage.setItem(key,JSON.stringify(list));}catch{throw new Error('샘플 저장 공간이 부족합니다. 이미지 수나 크기를 줄여주세요.');}return data;} const f=await firebase(); const existing=await f.db.getDocs(f.db.query(f.db.collection(f.d,'exhibitions'),f.db.where('slug','==',data.slug))); if(existing.docs.some(x=>x.id!==data.id)) throw new Error('이미 사용 중인 전시 주소입니다. 다른 주소를 입력해주세요.'); const {id,...record}=data; record.cover={...record.cover,url:record.cover.path?'':record.cover.url}; record.gallery=record.gallery.map(im=>({...im,url:im.path?'':im.url})); record.imagePaths=[record.cover,...record.gallery].map(im=>im.path).filter(Boolean); await f.db.setDoc(f.db.doc(f.d,'exhibitions',id),record); return data; }
export async function deleteExhibition(id) { if(demo){localStorage.setItem(key,JSON.stringify(localRead().filter(x=>x.id!==id)));return;} const f=await firebase(); await f.db.deleteDoc(f.db.doc(f.d,'exhibitions',id)); }
export async function uploadImage(file,id,onProgress=()=>{}) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
 if(file.size > 10*1024*1024) throw new Error('이미지는 10MB 이하로 올려주세요.');
 if(demo){if(file.size>2*1024*1024)throw new Error('샘플 모드에서는 2MB 이하 이미지를 사용해주세요.'); const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});return {url,path:'',alt:file.name};}
 const f=await firebase(); const path=`exhibitions/${id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`; const task=f.storage.uploadBytesResumable(f.storage.ref(f.s,path),file,{contentType:file.type}); await new Promise((resolve,reject)=>task.on('state_changed',s=>onProgress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,resolve));
 // Store the path, not a public download token. Private images remain subject to Storage rules.
 return {url:'',path,alt:file.name};
}
export async function resolveImage(image) { if(!image?.path||demo) return image; const f=await firebase(); const blob=await f.storage.getBlob(f.storage.ref(f.s,image.path)); return {...image,url:URL.createObjectURL(blob)}; }
export async function hydrateImages(items,includeGallery=true) { return Promise.all(items.map(async item=>({...item,cover:await resolveImage(item.cover),gallery:includeGallery?await Promise.all((item.gallery||[]).map(resolveImage)):(item.gallery||[])}))); }
export async function resetDemo() { if(demo)localStorage.removeItem(key); }
export async function removeImage(path) { if(!path||demo)return; const f=await firebase(); await f.storage.deleteObject(f.storage.ref(f.s,path)); }

// A shared live source for the homepage and exhibition list. Demo changes propagate between tabs.
export async function subscribeExhibitions(callback,onError=()=>{}) {
 if(demo){const emit=()=>{try{Promise.resolve(callback(localRead().filter(x=>x.published))).catch(onError);}catch(error){onError(error);}};emit();const listener=event=>{if(event.key===key||event.key===null)emit();};addEventListener('storage',listener);const timer=setInterval(emit,60000);return ()=>{removeEventListener('storage',listener);clearInterval(timer);};}
 const f=await firebase();const request=f.db.query(f.db.collection(f.d,'exhibitions'),f.db.where('published','==',true));let cached=[],day=todaySeoul();const emit=()=>Promise.resolve(callback(cached)).catch(onError);const unsubscribe=f.db.onSnapshot(request,snapshot=>{cached=snapshot.docs.map(normalize);emit();},onError);const timer=setInterval(()=>{const next=todaySeoul();if(day!==next){day=next;emit();}},60000);return ()=>{unsubscribe();clearInterval(timer);};
}
