export const PRODUCT_FIELDS={name:200,summary:600,story:5000,details:5000,packaging:5000,priceLabel:100,checkoutUrl:2000,colors:1000,specs:5000};
export function checkoutURL(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}}
export const newProduct=(id=crypto.randomUUID())=>({id,...Object.fromEntries(Object.keys(PRODUCT_FIELDS).map(key=>[key,''])),images:[],order:0});
export const penProduct=()=>({...newProduct('unframe-pen'),name:'언프레임 펜',summary:'전시의 기억을, 오늘의 한 줄로.',story:'매일 쓰는 물건에, 좋아하는 공간의 이름을.\n전시장에서 떠올린 생각도, 오늘 잊고 싶지 않은 문장도. 가까운 곳에 두고 꺼내 쓰는 작은 기록의 도구입니다.',details:'작은 디테일에도, 언프레임.\n블루 로고와 파스텔 컬러 바디, 투명한 클릭 버튼과 컬러 클립을 사진으로 살펴보세요.',packaging:'색을 고르는 즐거움은, 포장부터.\n컬러 라벨과 UNFRAME 로고가 있는 개별 패키지입니다. 판매 단위와 최종 구성품은 아임웹 상품 페이지에서 확인해주세요.',colors:'블루 · 크림 · 민트 · 핑크 · 라일락',specs:'본체 색상: 블루 / 크림 / 민트 / 핑크 / 라일락\n심 굵기: 확인 후 안내\n잉크 색상: 확인 후 안내\n크기·소재: 확인 후 안내\n판매 단위·구성: 확인 후 안내'});
export function validateProduct(item){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(item.id||''))throw new Error('상품 주소를 확인해주세요.');
 for(const [key,max] of Object.entries(PRODUCT_FIELDS))if(typeof item[key]!=='string'||item[key].length>max)throw new Error('입력 길이를 확인해주세요.');
 if(!item.name.trim())throw new Error('상품명을 입력해주세요.');
 if(item.checkoutUrl&&!checkoutURL(item.checkoutUrl))throw new Error('구매 주소는 https://로 시작하는 전체 주소를 입력해주세요.');
 if(!Number.isInteger(item.order)||item.order<0||item.order>1000000)throw new Error('순서는 0~1,000,000 사이 정수로 입력해주세요.');
 if(!Array.isArray(item.images)||item.images.length>12)throw new Error('상품 사진은 최대 12장입니다.');
 for(const im of item.images)if(typeof im.alt!=='string'||im.alt.length>1000||(!im.url&&!im.path))throw new Error('사진과 설명을 확인해주세요.');
 return item;
}
