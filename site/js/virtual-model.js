export const THEMES={white:'화이트',black:'블랙 헤링본','herringbone-wood':'우드 헤링본',wood:'내추럴 우드',urethane:'새틴 우레탄'};
export const WALLS={front:'전면 벽',right:'우측 벽',left:'좌측 벽'};
export const FRAMES={canvas:'캔버스 (테두리 없음)',black:'블랙 액자',white:'화이트 액자',wood:'우드 액자',none:'프레임 없음 (종이)'};
export const LIGHTING={general:'전체 조명',focused:'작품 중심 조명'};
export const CEILINGS={plain:'일반 천장',luminous:'광천장'};
// Gallery wall paints offered in the editors. Saved galleries with another colour keep it.
export const WALL_COLORS={'#f6f4ee':'웜 화이트','#fafaf8':'퓨어 화이트','#e4e3df':'라이트 그레이','#cfc9bf':'웜 그레이','#3a3c3b':'차콜','#2f3d35':'딥 그린','#26324a':'딥 네이비'};
export const wallColorOptions=current=>Object.hasOwn(WALL_COLORS,current)||!/^#[0-9a-fA-F]{6}$/.test(current||'')?WALL_COLORS:{...WALL_COLORS,[current]:`기존 색상 (${current})`};
// Room presets in metres. 'large' is the original room; galleries without roomSize keep it.
import {placeObjects} from './object-placement.js';
import {validateEnglish,ARTWORK_ENGLISH} from './i18n.js';
export const ROOMS={small:{id:'small',label:'소 · 10 × 8m',w:10,d:8,wall:6},medium:{id:'medium',label:'중 · 13 × 11m',w:13,d:11,wall:8},large:{id:'large',label:'대 · 16 × 14m',w:16,d:14,wall:10}};
export const roomOf=settings=>ROOMS[settings?.roomSize]||ROOMS.large;
export const SHAPES={rect:'사각형',circle:'원형',free:'자유형 (투명 배경 PNG)'};
export const SALE_STATUS={available:'판매 가능',reserved:'예약 중',sold:'판매 완료',nfs:'비매품 (Not for Sale)'};
export const CANVAS_EDGES={natural:'자연색 캔버스',black:'검정 측면',image:'이미지 감싸기'};
export const defaultGallery=exhibition=>({title:exhibition.title,subtitle:exhibition.summary||'',published:false,roomSize:'medium',lighting:'general',ceiling:'luminous',theme:'white',wallColor:'#f6f4ee',brightness:1,speed:2.5,outdoor:true,showPrices:false});
// Deleting a gallery is confirmed by typing the name staff see in the gallery list.
export const galleryDeleteName=settings=>settings.artistName||settings.title;
export const deleteNameMatches=(input,expected)=>!!expected&&String(input||'').trim()===expected.trim();
export const galleryExhibitionId=(id,settings)=>settings.exhibitionId||id;
export const defaultArtistGallery=(exhibition,artistName,order=0)=>({...defaultGallery(exhibition),title:`${artistName} · ${exhibition.title}`.slice(0,200),subtitle:'',exhibitionId:exhibition.id,artistName,order});
export const sortVirtualGalleries=items=>[...items].sort((a,b)=>Number(!!a.settings.artistName)-Number(!!b.settings.artistName)||(a.settings.order||0)-(b.settings.order||0)||a.settings.title.localeCompare(b.settings.title));
export const emptyArtwork=()=>({id:crypto.randomUUID(),title:'',titleEn:'',artist:'',year:'',medium:'',widthCm:80,heightCm:100,price:'',description:'',wall:'front',frame:'canvas',canvasThickness:3.5,canvasEdge:'natural',shape:'rect',saleStatus:'available',order:0,image:{url:'',path:'',alt:''}});
const bounded=(value,max,min=0)=>typeof value==='string'&&value.length>=min&&value.length<=max;
const between=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
export function validateGallery(data,artworks=[]){
 if(['exhibitionId','artistName','order'].some(key=>Object.hasOwn(data,key))){
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(data.exhibitionId||'')||!bounded(data.artistName,300,1)||!data.artistName.trim()||!Number.isInteger(data.order)||!between(data.order,0,1000000))throw new Error('연결 전시, 작가명과 갤러리 노출 순서를 확인해주세요.');
 }
 if(!bounded(data.title,200,1)||!bounded(data.subtitle,1000))throw new Error('갤러리 제목은 200자, 소개는 1,000자 이내로 입력해주세요.');
 if(!Object.hasOwn(THEMES,data.theme)||!/^#[0-9a-fA-F]{6}$/.test(data.wallColor)||!between(data.brightness,.5,1.8)||!between(data.speed,1,5))throw new Error('공간 설정 값을 확인해주세요.');
 if(data.lighting!==undefined&&!Object.hasOwn(LIGHTING,data.lighting)||data.ceiling!==undefined&&!Object.hasOwn(CEILINGS,data.ceiling))throw new Error('조명과 천장 설정을 확인해주세요.');
 if(data.roomSize!==undefined&&!Object.hasOwn(ROOMS,data.roomSize))throw new Error('공간 크기 설정을 확인해주세요.');
 if(data.artistNote!==undefined&&!bounded(data.artistNote,600))throw new Error('작가 소개는 600자 이내로 입력해주세요.');
 validateEnglish(data,{titleEn:200,subtitleEn:1000,artistNoteEn:600});
 if(['published','outdoor','showPrices'].some(key=>typeof data[key]!=='boolean'))throw new Error('게시 및 공간 설정을 확인해주세요.');
 if(data.published&&!artworks.length)throw new Error('공개하려면 작품을 한 점 이상 등록해주세요.');
 if(data.published)layoutArtworks(artworks,data.roomSize);
 placeObjects(artworks,data.roomSize);
 return data;
}
export function validateArtwork(data){
 if(!bounded(data.title,200,1)||!bounded(data.artist,300,1))throw new Error('작품 제목과 작가명을 입력해주세요.');
 for(const [key,max] of Object.entries({titleEn:200,year:20,medium:500,price:100,description:5000}))if(!bounded(data[key],max))throw new Error('작품 정보의 글자 수를 확인해주세요.');
 if(!between(data.widthCm,10,500)||!between(data.heightCm,10,500))throw new Error('작품의 가로·세로 크기는 10~500cm로 입력해주세요.');
 if(!Object.hasOwn(WALLS,data.wall)||!Object.hasOwn(FRAMES,data.frame)||!Number.isInteger(data.order)||!between(data.order,0,1000000))throw new Error('작품 배치와 노출 순서를 확인해주세요.');
 if(data.canvasThickness!==undefined&&!between(data.canvasThickness,.5,10)||data.canvasEdge!==undefined&&!Object.hasOwn(CANVAS_EDGES,data.canvasEdge))throw new Error('캔버스 두께는 0.5~10cm, 측면 표현은 선택 항목으로 입력해주세요.');
 if(data.shape!==undefined&&!Object.hasOwn(SHAPES,data.shape))throw new Error('작품 형태를 선택해주세요.');
 if(data.saleStatus!==undefined&&!Object.hasOwn(SALE_STATUS,data.saleStatus))throw new Error('판매 상태를 선택해주세요.');
 if(data.shape==='circle'&&data.widthCm!==data.heightCm)throw new Error('원형 작품은 지름 하나로 입력해주세요.');
 if(data.shape==='circle'&&!['canvas','none'].includes(data.frame))throw new Error('원형 작품은 캔버스 또는 프레임 없음(종이)으로 선택해주세요.');
 if(data.shape==='free'&&data.frame!=='none')throw new Error('자유형 작품은 프레임 없이 투명 배경 이미지로 걸립니다. 형태를 프레임 없음으로 선택해주세요.');
 validateEnglish(data,ARTWORK_ENGLISH);
 if(data.kind!==undefined&&!['flat','object'].includes(data.kind))throw new Error('작품 종류를 선택해주세요.');
 if(data.kind==='object')validateObject(data);
 if(!data.image?.url&&!data.image?.path)throw new Error('작품 이미지를 업로드해주세요.');
 if(!bounded(data.image?.alt,1000))throw new Error('이미지 설명은 1,000자 이내로 입력해주세요.');
 return data;
}
export const PLINTHS={none:'좌대 없음',low:'낮은 좌대 (10cm)',high:'높은 좌대 (60cm)'};
function validateObject(data){
 if(!between(data.depthCm,10,500))throw new Error('오브제의 깊이는 10~500cm로 입력해주세요.');
 if(!bounded(data.spot,40,1))throw new Error('전시 자리를 선택해주세요.');
 if(!Number.isInteger(data.yaw)||!between(data.yaw,0,359))throw new Error('앞면 방향은 0~359도로 입력해주세요.');
 if(!Object.hasOwn(PLINTHS,data.plinth))throw new Error('좌대를 선택해주세요.');
 if(!Number.isInteger(data.copies)||!between(data.copies,1,5))throw new Error('연작 수량은 1~5점으로 입력해주세요.');
 if(!data.model?.path&&!data.model?.url)throw new Error('3D 모델(GLB) 파일을 업로드해주세요.');
}
export function artworkMount(frame,thickness=3.5){
 const framed=['black','white','wood'].includes(frame);
 return {framed,border:framed?.12:0,depth:framed?.08:frame==='canvas'?thickness/100:.004};
}
// Centimetres become metres without scaling. Reflow actual footprints and reject
// arrangements exceeding the usable wall area (10m wide, 3.6m high).
export function layoutArtworks(artworks,roomSize){
 const room=ROOMS[roomSize]||ROOMS.large,arranged=[];const wallWidth=room.wall,wallHeight=3.6,gap=.65,rowGap=.35;
 const frontX=-room.w/2+.05,sideZ=room.d/2-.05;
 for(const wall of Object.keys(WALLS)){
  const list=artworks.filter(art=>art.wall===wall&&art.kind!=='object').sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const rows=[];let row={items:[],width:0,height:0};
  for(const art of list){
   const mount=artworkMount(art.frame),width=art.widthCm/100,height=art.heightCm/100,outerWidth=width+mount.border,outerHeight=height+mount.border;
   if(outerWidth>wallWidth||outerHeight>wallHeight)throw new Error(`「${art.title}」의 실제 크기가 현재 공간의 벽 영역(가로 ${(wallWidth*100).toLocaleString('ko-KR')}cm · 세로 360cm)을 넘습니다. 작품 크기는 자동 축소하지 않습니다.`);
   if(row.items.length&&row.width+gap+outerWidth>wallWidth){rows.push(row);row={items:[],width:0,height:0};}
   row.width+=(row.items.length?gap:0)+outerWidth;row.height=Math.max(row.height,outerHeight);row.items.push({art,width,height,outerWidth});
  }
  if(row.items.length)rows.push(row);
  const totalHeight=rows.reduce((sum,item)=>sum+item.height,0)+Math.max(0,rows.length-1)*rowGap;
  if(totalHeight>wallHeight)throw new Error(`${WALLS[wall]}의 작품들이 실제 크기로는 현재 벽에 모두 들어가지 않습니다. 일부 작품을 다른 벽면으로 옮겨주세요. 자동 축소는 하지 않습니다.`);
  let top=rows.length===1?Math.min(3.9,Math.max(2+totalHeight/2,.3+totalHeight)):2.1+totalHeight/2;
  for(const packed of rows){
   let cursor=-packed.width/2;const y=top-packed.height/2;
   for(const {art,width,height,outerWidth} of packed.items){
    const t=cursor+outerWidth/2;
    arranged.push({...art,size:[width,height],position:wall==='front'?[frontX,y,t]:[t,y,wall==='right'?-sideZ:sideZ],rotation:[0,wall==='front'?Math.PI/2:wall==='left'?Math.PI:0,0]});cursor+=outerWidth+gap;
   }
   top-=packed.height+rowGap;
  }
 }
 return arranged;
}
// Gallery convention: a red dot marks a sold work, a blue dot a reserved one.
export function saleBadge(status){
 if(status==='sold')return {label:'판매 완료',color:'#c8202a',dot:true};
 if(status==='reserved')return {label:'예약 중',color:'#004aad',dot:true};
 if(status==='nfs')return {label:'Not for Sale',color:'#5a625f',dot:false};
 return null;
}

