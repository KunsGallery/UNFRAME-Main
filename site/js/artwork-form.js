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
