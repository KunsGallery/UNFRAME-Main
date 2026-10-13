export const VENUES=[{value:'unframe',label:'언프레임 - (UNFRAME)'},{value:'kuns',label:"쿤스갤러리 - (Kün's Gallery)"}];
export function venueChoice(location){if(!location)return 'unframe';if(['UNFRAME','언프레임',VENUES[0].label].includes(location))return 'unframe';if(["Kün's Gallery",'쿤스갤러리',VENUES[1].label].includes(location))return 'kuns';return 'custom';}
export function venueName(choice,custom=''){return choice==='custom'?custom.trim():VENUES.find(venue=>venue.value===choice)?.label||'';}
