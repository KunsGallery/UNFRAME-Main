import {objectSpots} from './object-placement.js';
import {ROOMS,storedModel} from './virtual-model.js';
export {storedModel};
// Shared artwork-form rules for the admin editor and the artist studio.
// Round works use one diameter and a canvas edge or paper; free-form works hang without a mount.
export function normalizeShape(data){
 if(data.shape==='circle')return {...data,heightCm:data.widthCm,frame:data.frame==='none'?'none':'canvas'};
 if(data.shape==='free')return {...data,frame:'none'};
 return data;
}
export function bindShapeControls(form){
 const sync=()=>{
  const shape=form.elements.shape.value,height=form.elements.heightCm.closest('.field'),width=form.elements.widthCm.closest('.field');
  height.hidden=shape==='circle';form.elements.heightCm.required=shape!=='circle';
  width.querySelector('span').firstChild.textContent=shape==='circle'?'지름 (cm) ':'가로 (cm) ';
  if(shape==='free')form.elements.frame.value='none';
  if(shape==='circle'&&!['canvas','none'].includes(form.elements.frame.value))form.elements.frame.value='canvas';
  for(const option of form.elements.frame.options)option.disabled=shape==='free'?option.value!=='none':shape==='circle'?!['canvas','none'].includes(option.value):false;
  form.elements.frame.dispatchEvent(new Event('change'));
 };
 form.elements.shape.addEventListener('change',sync);sync();
}
// Objects stand on floor spots, so wall-only fields keep harmless defaults; flat works drop object fields.
const OBJECT_FIELDS=['depthCm','spot','yaw','plinth','copies','model'];
export function normalizeKind(data){
 if(data.kind!=='object'){const out={...data,kind:'flat'};for(const key of OBJECT_FIELDS)delete out[key];return out;}
 return {...data,wall:'front',frame:'none',shape:'rect',depthCm:Number(data.depthCm),copies:Math.round(Number(data.copies)),yaw:Math.round(Number(data.yaw))%360};
}
export const spotOptions=roomSize=>Object.fromEntries(objectSpots(ROOMS[roomSize]||ROOMS.large).map(spot=>[spot.id,`${spot.label}${spot.type==='center'?' · 360° 감상':''}`]));
// Shows object or flat fields; the size labels read 높이 for objects.
export function bindKindControls(form){
 const sync=()=>{
  const object=form.elements.kind.value==='object';
  for(const block of form.querySelectorAll('[data-kind]')){const show=block.dataset.kind===(object?'object':'flat');block.hidden=!show;for(const control of block.querySelectorAll('input,select,textarea'))control.disabled=!show||form.dataset.locked==='true';}
  const heightLabel=form.elements.heightCm.closest('.field').querySelector('span').firstChild;heightLabel.textContent=object?'높이 (cm) ':'세로 (cm) ';
  if(object){const width=form.elements.widthCm.closest('.field');width.hidden=false;width.querySelector('span').firstChild.textContent='가로 (cm) ';form.elements.heightCm.closest('.field').hidden=false;form.elements.heightCm.required=true;}
  else form.elements.shape?.dispatchEvent(new Event('change'));
 };
 form.elements.kind.addEventListener('change',sync);sync();
}
// Photo reliefs (model.source 'photo') only stand in corner spots: centre options are disabled,
// and a chosen centre spot moves to the first corner. Returns true when it had to move.
export function syncPhotoSpots(select,photo){
 for(const option of select.options)option.disabled=photo&&!option.value.startsWith('corner-');
 if(photo&&select.selectedOptions[0]?.disabled){select.value=[...select.options].find(option=>!option.disabled)?.value||'';return true;}
 return false;
}
export const reliefControlHTML=(prefix,off='')=>`<div class="relief-control"><button type="button" class="button secondary" id="${prefix}-relief" ${off}>사진으로 입체 만들기</button><small>작품 사진 한 장으로 앞면이 입체인 오브제를 만듭니다. 처음 한 번 약 70MB를 내려받습니다(와이파이 권장). 모서리 자리 전용입니다.</small></div>`;
// Opens the relief dialog for the form's photo, height and depth, then uploads the GLB with
// `upload(file)` and returns the model marked as a photo relief (or null when closed).
export async function makePhotoRelief(form,art,upload,{maxBytes}={}){
 const {openReliefMaker}=await import('./photo-relief-maker.js');
 const result=await openReliefMaker({imageUrl:art.image?.url,heightCm:Number(form.elements.heightCm.value),depthCm:Number(form.elements.depthCm.value),maxBytes});
 if(!result)return null;
 const model=await upload(new File([result.bytes],'photo-relief.glb',{type:'model/gltf-binary'}));
 return {...model,name:'사진으로 만든 입체',source:'photo'};
}
