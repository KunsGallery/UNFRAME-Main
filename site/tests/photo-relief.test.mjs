import {test} from 'node:test';import assert from 'node:assert/strict';
import {maskCoverage,maskBounds,normalizeDepth,reliefGeometry} from '../js/photo-relief.js';
// A w×h mask with a filled rectangle; depth rises towards the centre column.
function scene(w=40,h=60,box=[10,10,30,50]){
 const mask=new Uint8Array(w*h),depth=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x>=box[0]&&x<box[2]&&y>=box[1]&&y<box[3])mask[i]=255;depth[i]=1-Math.abs(x-w/2)/(w/2);}
 return {w,h,mask,depth};
}
test('coverage and bounds come from the mask',()=>{
 const {w,h,mask}=scene();
 assert.equal(maskCoverage(mask),(20*40)/(40*60));
 assert.deepEqual(maskBounds(mask,w,h),{x0:10,y0:10,x1:30,y1:50});
 assert.equal(maskBounds(new Uint8Array(4),2,2),null);
});
test('depth is normalised to 0–1 inside the mask and 0 outside',()=>{
 const {w,h,mask,depth}=scene();const out=normalizeDepth(depth,mask,w,h,0);
 let min=1,max=0;for(let i=0;i<out.length;i++){if(mask[i]){min=Math.min(min,out[i]);max=Math.max(max,out[i]);}else assert.equal(out[i],0);}
 assert.ok(Math.abs(min)<1e-6&&Math.abs(max-1)<1e-6);
});
test('relief: height 1, front pushed to strength × maxDepth, closed shell',()=>{
 const {w,h,mask,depth}=scene();const d=normalizeDepth(depth,mask,w,h,0);
 const g=reliefGeometry({width:w,height:h,mask,depth:d,strength:.5,maxDepth:.4,cells:40});
 let minY=Infinity,maxY=-Infinity,maxZ=-Infinity,minZ=Infinity;
 for(let i=0;i<g.positions.length;i+=3){minY=Math.min(minY,g.positions[i+1]);maxY=Math.max(maxY,g.positions[i+1]);maxZ=Math.max(maxZ,g.positions[i+2]);minZ=Math.min(minZ,g.positions[i+2]);}
 assert.ok(Math.abs(minY)<1e-6&&Math.abs(maxY-1)<1e-6,`height ${minY}..${maxY}`);
 assert.ok(Math.abs(maxZ-.2)<.02,`front ${maxZ}`);assert.equal(minZ,0);
 // Every edge of a closed surface is shared by exactly two triangles.
 const edges=new Map(),all=[...g.front,...g.back];
 for(let t=0;t<all.length;t+=3)for(let k=0;k<3;k++){const a=all[t+k],b=all[t+(k+1)%3],key=a<b?a+'-'+b:b+'-'+a;edges.set(key,(edges.get(key)||0)+1);}
 assert.ok([...edges.values()].every(count=>count===2),'closed shell');
 assert.equal(g.uvs.length/2,g.positions.length/3);
});
test('cells outside the mask make no geometry and unused vertices are dropped',()=>{
 const {w,h,mask,depth}=scene(40,60,[0,0,20,60]);
 const g=reliefGeometry({width:w,height:h,mask,depth:normalizeDepth(depth,mask,w,h,0),strength:1,maxDepth:.3,cells:30});
 let minX=Infinity,maxX=-Infinity;for(let i=0;i<g.positions.length;i+=3){minX=Math.min(minX,g.positions[i]);maxX=Math.max(maxX,g.positions[i]);}
 // The kept half is 20×60 px, so its width is a third of its height.
 assert.ok(Math.abs((maxX-minX)-1/3)<.05,`width ${maxX-minX}`);
 assert.ok(Math.abs((maxX+minX)/2)<1e-6,'centred');
});
