import {escapeHTML as e} from './model.js';
// Optional English copies edited beside the Korean fields. Staff screens stay in Korean.
export const ENGLISH_FIELDS={
 exhibition:[{name:'titleEn',label:'영문 제목',max:200},{name:'summaryEn',label:'영문 짧은 소개',max:600,rows:3},{name:'descriptionEn',label:'영문 전시 소개',max:30000,rows:8},{name:'locationEn',label:'영문 전시 장소',max:1000},{name:'hoursEn',label:'영문 관람 시간·휴관 안내',max:1000}],
 highlight:[{name:'titleEn',label:'영문 제목',max:200},{name:'summaryEn',label:'영문 짧은 소개',max:600,rows:3}],
 gallery:[{name:'titleEn',label:'영문 갤러리 제목',max:200},{name:'subtitleEn',label:'영문 갤러리 소개',max:1000,rows:3},{name:'artistNoteEn',label:'영문 작가 소개',max:600,rows:3}],
 artwork:[{name:'mediumEn',label:'영문 재료',max:500},{name:'descriptionEn',label:'영문 작품 설명',max:5000,rows:4}],
};
const fieldsFor=(kind,omit=[])=>ENGLISH_FIELDS[kind].filter(field=>!omit.includes(field.name));
export function englishFieldsHTML(kind,item,{omit=[]}={}){
 const fields=fieldsFor(kind,omit),filled=fields.some(field=>item?.[field.name]?.trim?.());
 const inputs=fields.map(({name,label,max,rows})=>`<label class="field"><span>${label} <small class="field-badge">선택</small></span>${rows?`<textarea name="${name}" rows="${rows}" maxlength="${max}">${e(item?.[name]||'')}</textarea>`:`<input name="${name}" maxlength="${max}" value="${e(item?.[name]||'')}">`}</label>`).join('');
 return `<details class="english-fields"${filled?' open':''}><summary>영문 (선택) · 영문 페이지(/en)에 표시됩니다. 비워두면 한국어가 보입니다.</summary>${inputs}</details>`;
}
export const readEnglish=(kind,form,{omit=[]}={})=>Object.fromEntries(fieldsFor(kind,omit).map(({name})=>[name,String(form.get(name)||'').trim()]));
