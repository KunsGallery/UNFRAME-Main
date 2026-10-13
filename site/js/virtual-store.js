import {demo,firestoreClient,getExhibition} from './store.js';
import {validateGallery,validateArtwork} from './virtual-model.js';
import {DEMO_VIRTUAL} from './virtual-demo.js';
const key='unframe-virtual-galleries-demo-v2';
const read=()=>JSON.parse(localStorage.getItem(key)||'null')||structuredClone(DEMO_VIRTUAL);
function localSave(data){try{localStorage.setItem(key,JSON.stringify(data));}catch{throw new Error('샘플 저장 공간이 부족합니다. 이미지 크기를 줄여주세요.');}}
export async function getVirtualGallery(id,{admin=false}={}){
 if(demo){const data=read()[id];if(!data)return null;const exhibition=await getExhibition(id);return admin||(data.settings.published&&exhibition?.published)?structuredClone(data):null;}
 const f=await firestoreClient();let doc;
 try{doc=await f.db.getDoc(f.db.doc(f.d,'virtualGalleries',id));}catch(error){if(!admin&&error.code==='permission-denied')return null;throw error;}
 if(!doc.exists())return null;
 const works=await f.db.getDocs(f.db.collection(f.d,'virtualGalleries',id,'artworks'));
 return {settings:doc.data(),artworks:works.docs.map(work=>({...work.data(),id:work.id})).sort((a,b)=>a.order-b.order)};
}
export async function saveVirtualSettings(id,settings,artworks){
 validateGallery(settings,artworks);const data={...settings,updatedAt:new Date().toISOString()};
 if(demo){const all=read();all[id]={settings:data,artworks:all[id]?.artworks||[]};localSave(all);return;}
 const f=await firestoreClient();await f.db.setDoc(f.db.doc(f.d,'virtualGalleries',id),data);
}
export async function saveVirtualArtwork(id,artwork){
 validateArtwork(artwork);const {id:artId,...data}=artwork;data.updatedAt=new Date().toISOString();
 if(demo){const all=read();if(!all[id])throw new Error('공간 설정을 먼저 저장해주세요.');const works=all[id].artworks,index=works.findIndex(work=>work.id===artId);if(index<0)works.push({...data,id:artId});else works[index]={...data,id:artId};localSave(all);return;}
 data.image={url:'',path:artwork.image.path,alt:artwork.image.alt};
 const f=await firestoreClient();await f.db.setDoc(f.db.doc(f.d,'virtualGalleries',id,'artworks',artId),data);
}
export async function deleteVirtualArtwork(id,artId){
 if(demo){const all=read();all[id].artworks=all[id].artworks.filter(work=>work.id!==artId);localSave(all);return;}
 const f=await firestoreClient();await f.db.deleteDoc(f.db.doc(f.d,'virtualGalleries',id,'artworks',artId));
}
