import {prepareRelief,buildRelief,ReliefError} from './photo-relief-ai.js';
// The "사진으로 입체 만들기" dialog shared by the artist studio and the admin editor.
// It previews the relief with the same GLTFLoader the gallery uses, so what shows here is
// what visitors see. Resolves with {bytes} on 저장, or null when closed.
const STAGES=[['prepare','AI 준비 (처음 한 번 약 70MB · 와이파이 권장)'],['background','배경 지우기'],['depth','깊이 추정'],['build','입체 만들기']];
let threeReady;
function loadThree(){
 const script=src=>new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(new Error('3D 미리보기를 불러오지 못했습니다.'));document.head.append(tag);});
 threeReady??=(window.THREE?Promise.resolve():script('/assets/vendor/three-r128.min.js')).then(()=>window.THREE.GLTFLoader?null:script('/assets/vendor/three-r128-GLTFLoader.js'));
 return threeReady;
}
function preview(canvas){
 const THREE=window.THREE,renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputEncoding=THREE.sRGBEncoding;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,50);
 scene.add(new THREE.HemisphereLight(0xffffff,0x444444,.9));const key=new THREE.DirectionalLight(0xffffff,.8);key.position.set(.6,1.2,1.6);scene.add(key);
 let model=null,frame=0;const start=performance.now();
 const size=()=>{const w=canvas.clientWidth||320,h=canvas.clientHeight||320;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const loop=()=>{frame=requestAnimationFrame(loop);if(model)model.rotation.y=Math.sin((performance.now()-start)/1600)*Math.PI/6;renderer.render(scene,camera);};
 size();loop();
 return {
  show(bytes){return new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',gltf=>{
   if(model)scene.remove(model);model=gltf.scene;const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),height=box.max.y-box.min.y;
   model.position.set(-center.x,-center.y,-center.z);const pivot=new THREE.Group();pivot.add(model);scene.add(pivot);model=pivot;
   camera.position.set(0,height*.05,height*2.6);camera.lookAt(0,0,0);resolve();},reject));},
  stop(){cancelAnimationFrame(frame);renderer.dispose();}
 };
}
export async function openReliefMaker({imageUrl,heightCm,depthCm,maxBytes}){
 if(!imageUrl)throw new Error('먼저 작품 사진을 올려주세요.');
 if(!(heightCm>0)||!(depthCm>0))throw new Error('높이와 깊이(cm)를 먼저 입력해주세요.');
 if(!document.querySelector('link[data-relief-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/photo-relief.css';link.dataset.reliefCss='';document.head.append(link);}
 const dialog=document.createElement('dialog');dialog.className='relief-dialog';dialog.setAttribute('aria-labelledby','relief-title');
 dialog.innerHTML=`<div class="relief-head"><h2 id="relief-title">사진으로 입체 만들기</h2><button type="button" data-close>닫기</button></div>
 <p class="relief-guide">정면에서 찍은 사진 · 단색 배경 · 작품 전체가 화면 안에 · 강한 그림자 없이. 앞면만 입체로 만들어 <b>모서리 자리</b>에 세웁니다.</p>
 <div class="relief-body"><div class="relief-preview"><canvas aria-label="입체 미리보기"></canvas><p data-placeholder>미리보기가 여기에 나타납니다.</p></div>
 <div class="relief-side"><ol class="relief-stages">${STAGES.map(([key,label])=>`<li data-stage="${key}">${label}<span></span></li>`).join('')}</ol>
 <label class="relief-strength">입체감 <output data-out>0.6</output><input type="range" min="0.3" max="1" step="0.05" value="0.6" data-strength disabled></label>
 <p role="status" aria-live="polite" data-status></p>
 <div class="relief-actions"><button type="button" data-save disabled>저장</button><button type="button" data-retry hidden>다시 만들기</button></div></div></div>`;
 document.body.append(dialog);dialog.showModal();
 const q=selector=>dialog.querySelector(selector),status=text=>{q('[data-status]').textContent=text;};
 let closed=false,prepared=null,built=null,view=null,building=0;
 const mark=(stage,state,fraction)=>{for(const [index,[key]] of STAGES.entries()){const item=q(`[data-stage="${key}"]`),current=STAGES.findIndex(([k])=>k===stage);item.className=index<current||state==='done'&&index===current?'is-done':index===current?'is-active':'';item.querySelector('span').textContent=key===stage&&state==='active'&&fraction!=null?` ${Math.round(fraction*100)}%`:'';}};
 const rebuild=async()=>{
  const token=++building,strength=Number(q('[data-strength]').value);q('[data-save]').disabled=true;mark('build','active');
  built=await buildRelief(prepared,{strength,depthCm,heightCm,maxBytes});if(closed||token!==building)return;
  await view.show(built.bytes);mark('build','done');q('[data-save]').disabled=false;status(`입체 파일 ${(built.bytes.length/1048576).toFixed(1)}MB · 저장을 누르면 작품에 연결됩니다.`);
 };
 const run=async()=>{
  q('[data-retry]').hidden=true;q('[data-strength]').disabled=true;q('[data-save]').disabled=true;status('');
  try{
   await loadThree();if(closed)return;view??=preview(q('canvas'));
   prepared=await prepareRelief(imageUrl,{onStage:(stage,fraction)=>{if(!closed)mark(stage,'active',fraction);}});if(closed)return;
   q('[data-placeholder]').hidden=true;q('[data-strength]').disabled=false;await rebuild();
  }catch(error){if(closed)return;status(error instanceof ReliefError?error.message:error.message||'입체를 만들지 못했습니다.');q('[data-retry]').hidden=false;}
 };
 return new Promise(resolve=>{
  const finish=value=>{if(closed)return;closed=true;view?.stop();dialog.close();dialog.remove();resolve(value);};
  q('[data-close]').onclick=()=>finish(null);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
  q('[data-strength]').oninput=event=>{q('[data-out]').textContent=Number(event.target.value).toFixed(2);};
  q('[data-strength]').onchange=()=>{if(prepared)rebuild().catch(error=>status(error.message));};
  q('[data-retry]').onclick=run;q('[data-save]').onclick=()=>{if(built)finish({bytes:built.bytes});};
  run();
 });
}
