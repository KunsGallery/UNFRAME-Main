// Render budget per device class. Unknown capacity (Safari, Firefox) starts at medium; a slow
// first few seconds step down one level at runtime.
export const QUALITY={low:{pixelRatio:1,shadows:false,shadowSize:512,leaves:400},medium:{pixelRatio:1.25,shadows:true,shadowSize:1024,leaves:1200},high:{pixelRatio:1.5,shadows:true,shadowSize:2048,leaves:2600}};
export function pickQuality({memory,cores,width}){
 if((memory&&memory<=2)||(cores&&cores<=2))return 'low';
 if(memory>=8&&cores>=8&&width>=1024)return 'high';
 return 'medium';
}
export const downgrade=level=>level==='high'?'medium':'low';
export const deviceQuality=()=>pickQuality({memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,width:innerWidth});
