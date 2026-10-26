import {objectSpots} from './object-placement.js';
import {ROOMS} from './virtual-model.js';
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
