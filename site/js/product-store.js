import {demo,firestoreClient} from './store.js';
import {validateProduct} from './product-model.js';
const key='unframe-products-demo-v1';
const read=()=>JSON.parse(localStorage.getItem(key)||'[]');
export async function listProducts(){if(demo)return read();const f=await firestoreClient();return(await f.db.getDocs(f.db.collection(f.d,'products'))).docs.map(doc=>({...doc.data(),id:doc.id}));}
export async function getProduct(id){if(demo)return read().find(item=>item.id===id)||null;const f=await firestoreClient(),doc=await f.db.getDoc(f.db.doc(f.d,'products',id));return doc.exists()?{...doc.data(),id:doc.id}:null;}
export async function saveProduct(item){validateProduct(item);const {id,...data}=item;data.updatedAt=new Date().toISOString();if(demo){const all=read(),index=all.findIndex(x=>x.id===id);if(index<0)all.push({...data,id});else all[index]={...data,id};try{localStorage.setItem(key,JSON.stringify(all));}catch{throw new Error('샘플 저장 공간이 부족합니다. 사진 크기를 줄여주세요.');}return;}data.images=item.images.map(im=>({url:'',path:im.path,alt:im.alt}));const f=await firestoreClient();await f.db.setDoc(f.db.doc(f.d,'products',id),data);}
export async function deleteProduct(id){if(demo){localStorage.setItem(key,JSON.stringify(read().filter(x=>x.id!==id)));return;}const f=await firestoreClient();await f.db.deleteDoc(f.db.doc(f.d,'products',id));}
