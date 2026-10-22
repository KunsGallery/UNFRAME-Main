import {THEMES,LIGHTING,CEILINGS,ROOMS} from './virtual-model.js';
// The studio embeds the submission room beside its space settings. Unsaved choices reach the
// room as query overrides (lighting and ceiling need a rebuild) or as live look messages.
const valid={theme:value=>Object.hasOwn(THEMES,value),wallColor:value=>/^#[0-9a-fA-F]{6}$/.test(value||''),lighting:value=>Object.hasOwn(LIGHTING,value),ceiling:value=>Object.hasOwn(CEILINGS,value),roomSize:value=>Object.hasOwn(ROOMS,value)};
export function previewOverrides(search){
 const params=new URLSearchParams(search),settings={};
 for(const [key,check] of Object.entries(valid)){const value=params.get(key);if(value!==null&&check(value))settings[key]=value;}
 return {embed:params.get('embed')==='1',settings};
}
export function previewURL(id,settings){
 const params=new URLSearchParams({embed:'1'});
 for(const key of Object.keys(valid))if(valid[key](settings[key]))params.set(key,settings[key]);
 return `/virtual-gallery/submission/${encodeURIComponent(id)}?${params}`;
}
export function lookFromMessage(data){
 if(data?.type!=='unframe-look'||!valid.theme(data.theme)||!valid.wallColor(data.wallColor))return null;
 return {theme:data.theme,wallColor:data.wallColor};
}
