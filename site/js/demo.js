// Fictional exhibition records adapted from the supplied layout. Never imported into Firebase automatically.
const entry = (id,title,startDate,endDate,location,summary,asset,artists,order) => ({id,slug:id,title,startDate,endDate,location,summary,description:summary+'\n\n이 페이지는 전시 상세 화면을 확인하기 위한 샘플입니다. 실제 전시 소개와 참여 작가, 관람 안내는 관리자에서 직접 등록해주세요.',artists,hours:'관람 시간 샘플 · 실제 안내로 교체해주세요.',admission:'',address:'실제 전시장 주소를 입력해주세요.',mapUrl:'',bookingUrl:'',cover:{url:'/assets/'+asset+'.svg',alt:title+' 샘플 그래픽',path:''},gallery:[{url:'/assets/'+asset+'.svg',alt:'샘플 그래픽 전체 보기',caption:'레이아웃 확인용 샘플 그래픽 · 실제 작품이 아닙니다.',path:''}],published:true,order,updatedAt:new Date().toISOString()});
export const DEMO_EXHIBITIONS = [
{...entry('resonance','Resonance: 빛과 소리의 공명','2026-10-01','2026-11-15','UNFRAME · 샘플 공간','빛의 파장과 소리의 진동이 만들어내는 새로운 공간. 경계에서 만나는 감각의 순간을 탐색합니다.','resonance','샘플 참여 작가',0),titleEn:'Resonance: Light and Sound',summaryEn:'A space made of light waves and sound vibrations. Explore the moment where the senses meet at the edge.',locationEn:'UNFRAME · Sample space'},
entry('analog-dreams','Analog Dreams','2026-11-20','2026-12-30','UNFRAME · 샘플 공간','디지털 시대에 다시 돌아보는 아날로그의 따뜻함과 불완전함의 미학.','analog','샘플 참여 작가',1),
entry('deconstruction','Deconstruction: 해체된 일상','2026-07-01','2026-09-15','Gallery A · 샘플','일상적인 오브제를 해체하고 재조합하여 사물의 본질을 탐구하는 현대 조각전.','deconstruction','샘플 참여 작가',2),
entry('urban-jungle','Urban Jungle: 도시의 틈','2025-09-01','2025-11-20','Gallery B · 샘플','도시의 틈에서 발견한 색과 형태. 익숙한 풍경을 새로운 시선으로 바라봅니다.','urban','샘플 참여 작가',3),
entry('binary-emotions','Binary Emotions','2025-04-01','2025-06-30','Main Hall · 샘플','감정과 데이터 사이, 서로 다른 언어들이 만나는 지점을 탐색합니다.','binary','샘플 참여 작가',4),
entry('zero-point','Zero Point','2024-11-01','2024-12-31','UNFRAME Archive · 샘플','창작의 0점에서 시작되는 무한한 가능성을 이야기합니다.','zero','샘플 참여 작가',5)
];
