// Firestore rules validate bounded image records together, avoiding the
// 1,000-expression limit of thirty nested image maps. URLs remain transient.
const FIELD_SEPARATOR='\u001f';
const editorialText=value=>String(value||'').replace(/[\u001d-\u001f]/g,' ');
export function encodeGallery(images){
 return images.map(image=>[image.path||'',editorialText(image.alt),editorialText(image.caption)].join(FIELD_SEPARATOR));
}
export function decodeGallery(records=[]){
 return records.map(record=>{
  if(typeof record!=='string')return record; // Existing image maps remain readable.
  const [path,alt,caption,...extra]=record.split(FIELD_SEPARATOR);
  if(extra.length||alt===undefined||caption===undefined)throw new Error('전시 사진 정보의 형식이 올바르지 않습니다.');
  return {url:'',path,alt,caption};
 });
}
