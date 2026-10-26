// Phone photos are often 12MP+ and several megabytes. Shrink them in the browser before upload
// (long edge 3000px, enough for close viewing in the room) so uploads are fast and stay under limits.
export const MAX_EDGE=3000,SHRINK_BYTES=8_000_000;
export function targetSize(width,height,max=MAX_EDGE){
 const scale=Math.min(1,max/Math.max(width,height));
 return [Math.round(width*scale),Math.round(height*scale)];
}
export const shouldShrink=(width,height,bytes)=>Math.max(width,height)>MAX_EDGE||bytes>SHRINK_BYTES;
export const outputType=type=>['image/png','image/webp'].includes(type)?type:'image/jpeg';
export async function prepareImage(file){
 if(!file.type.startsWith('image/')||typeof createImageBitmap!=='function')return file;
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{return file;}
 if(!shouldShrink(bitmap.width,bitmap.height,file.size)){bitmap.close?.();return file;}
 const [width,height]=targetSize(bitmap.width,bitmap.height),canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(bitmap,0,0,width,height);bitmap.close?.();
 const type=outputType(file.type),blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.9));
 if(!blob||blob.size>=file.size)return file;
 return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+type.split('/')[1].replace('jpeg','jpg'),{type});
}
