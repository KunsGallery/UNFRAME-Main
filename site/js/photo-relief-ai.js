import {cutoutMask,resampleGray,normalizeDepth,maskCoverage,maskBounds,reliefGeometry} from './photo-relief.js';
import {encodeReliefGLB} from './photo-relief-export.js';
// Runs in the uploader's browser only. Models are Apache-2.0: ormbg (background) and
// Depth Anything V2 Small (depth). Never swap in Depth Anything Base+ (CC-BY-NC) or RMBG (Bria).
// jsDelivr's +esm build resolves the onnxruntime-web dependency the plain web bundle imports by name.
const LIBRARY='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm';
const MODELS={background:'onnx-community/ormbg-ONNX',depth:'onnx-community/depth-anything-v2-small'};
const WORK=1024,TEXTURE=2048,MAX_BYTES=10*1024*1024;
export class ReliefError extends Error{constructor(code,message){super(message);this.code=code;}}
let library,pipes={};
async function pipe(task,model,onProgress){
 try{library??=await import(LIBRARY);}catch{throw new ReliefError('download','AI 도구를 내려받지 못했습니다. 네트워크를 확인하거나 GLB 파일로 올려주세요.');}
 try{pipes[task]??=await library.pipeline(task,model,{device:'wasm',dtype:'q8',progress_callback:event=>{if(event.status==='progress'&&event.total)onProgress?.(event.loaded/event.total);}});}
 catch(error){delete pipes[task];throw new ReliefError('download','AI 모델을 내려받지 못했습니다. 와이파이에서 다시 시도하거나 GLB 파일로 올려주세요.');}
 return pipes[task];
}
function drawScaled(image,max){
 const scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
 canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
}
async function loadImage(url){
 // onload rather than decode(): decode() can stay pending while the page is not being painted.
 const image=new Image();image.crossOrigin='anonymous';
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});}catch{throw new ReliefError('image','작품 사진을 불러오지 못했습니다. 사진을 다시 올려주세요.');}
 return image;
}
// Stage 1: everything that needs the AI. The result is reused when only the strength changes.
// onStage(stage, fraction) reports prepare | background | depth.
export async function prepareRelief(imageUrl,{onStage=()=>{}}={}){
 const image=await loadImage(imageUrl),work=drawScaled(image,WORK),w=work.width,h=work.height;
 const pixels=work.getContext('2d').getImageData(0,0,w,h).data;
 try{
  let mask=cutoutMask(pixels);
  if(!mask){
   onStage('prepare',0);const remover=await pipe('background-removal',MODELS.background,fraction=>onStage('prepare',fraction*.6));
   onStage('background',0);const result=await remover(library.RawImage.fromCanvas(work)),cutout=Array.isArray(result)?result[0]:result;
   const rgba=cutout.width===w&&cutout.height===h?cutout.rgba().data:(await cutout.resize(w,h)).rgba().data;
   mask=new Uint8Array(w*h);for(let i=0;i<w*h;i++)mask[i]=rgba[i*4+3]>127?255:0;
  }
  const coverage=maskCoverage(mask);
  if(coverage<.05||coverage>.95)throw new ReliefError('coverage',coverage<.05?'작품을 찾지 못했습니다. 작품 전체가 잘 보이는 정면 사진으로 다시 시도해주세요.':'배경을 구분하지 못했습니다. 단색 배경에서 찍은 사진으로 다시 시도해주세요.');
  const estimator=await pipe('depth-estimation',MODELS.depth,fraction=>onStage('prepare',.6+fraction*.4));
  onStage('depth',0);const {depth:map}=await estimator(library.RawImage.fromCanvas(work));
  const gray=map.channels===1?map.data:map.grayscale().data;
  const depth=normalizeDepth(resampleGray(gray,map.width,map.height,w,h),mask,w,h);
  return {image,mask,depth,w,h,coverage};
 }catch(error){
  if(error instanceof ReliefError)throw error;
  throw new ReliefError('memory','이 기기에서 처리하지 못했습니다. PC에서 다시 시도하거나 GLB 파일로 올려주세요.');
 }
}
async function texture(image,bounds,w,size){
 const scale=image.naturalWidth/w,sx=bounds.x0*scale,sy=bounds.y0*scale,sw=(bounds.x1-bounds.x0)*scale,sh=(bounds.y1-bounds.y0)*scale;
 const fit=Math.min(1,size/Math.max(sw,sh)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*fit));canvas.height=Math.max(1,Math.round(sh*fit));
 canvas.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));return new Uint8Array(await blob.arrayBuffer());
}
// Stage 2: geometry and GLB. Fast, so the strength slider can rebuild it freely.
// maxDepth is the entered depth over the entered height; the viewer scales height to heightCm.
export async function buildRelief(prepared,{strength=.6,depthCm,heightCm,maxBytes=MAX_BYTES}){
 const {image,mask,depth,w,h}=prepared,maxDepth=Math.min(1.5,depthCm/heightCm),bounds=maskBounds(mask,w,h);
 for(const [cells,size] of [[200,TEXTURE],[120,1024],[80,768]]){
  const geometry=reliefGeometry({width:w,height:h,mask,depth,strength,maxDepth,cells});
  const bytes=encodeReliefGLB(geometry,await texture(image,bounds,w,size));
  if(bytes.length<=maxBytes)return {bytes,geometry};
 }
 throw new ReliefError('memory','입체 파일이 너무 큽니다. 더 작은 사진으로 다시 시도해주세요.');
}
