// Synthetic preview only. Production Firebase never reads these fixtures.
export const DEMO_VIRTUAL={resonance:{settings:{title:'Resonance — 샘플 버추얼 전시',subtitle:'빛과 소리의 공간을 확인하는 샘플입니다. 실제 전시·작품 정보가 아닙니다.',published:true,theme:'white',wallColor:'#f6f4ee',brightness:1,speed:2.5,outdoor:true,showPrices:false},artworks:['up','mm','print'].map((name,index)=>({id:`sample-${index}`,title:`샘플 작품 ${index+1}`,titleEn:'',artist:'샘플 작가',year:'',medium:'화면 확인용 이미지',widthCm:110,heightCm:110,price:'',description:'버추얼 공간과 작품 정보 창을 확인하기 위한 샘플 이미지입니다. 관리자에서 실제 작품을 등록해주세요.',wall:['front','right','left'][index],frame:'black',order:index,image:{url:`/assets/projects/${name}.webp`,path:'',alt:`공간 확인용 샘플 이미지 ${index+1}`}}))}};

// Artist-gallery fixtures stay inside demo mode; no production records are seeded.
for(const [id,artistName,published,order] of [['artist-demo-one','샘플 작가 A',true,0],['artist-demo-two','샘플 작가 B',false,1]]){
 DEMO_VIRTUAL[id]={settings:{...DEMO_VIRTUAL.resonance.settings,exhibitionId:'resonance',artistName,order,published,title:`${artistName} · 샘플 개인 공간`,subtitle:'단체전의 작가별 공간을 확인하는 샘플입니다. 실제 전시가 아닙니다.'},artworks:DEMO_VIRTUAL.resonance.artworks.slice(0,2).map((art,index)=>({...art,id:`${id}-${index}`,artist:artistName,frame:'canvas',widthCm:80,heightCm:100,order:index}))};
}
