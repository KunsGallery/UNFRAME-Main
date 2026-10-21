// Touch and pointer look controls for the virtual room. A drag rotates the view; a drag
// never counts as a click on an artwork.
export function bindTouchLook(canvas,app){
 let touching=null,pressPoint=null,moved=false;
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',event=>{moved=false;pressPoint={x:event.clientX,y:event.clientY};if(event.pointerType==='touch'){touching={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);}});
 canvas.addEventListener('pointermove',event=>{
  if(pressPoint&&event.buttons&&Math.abs(event.clientX-pressPoint.x)+Math.abs(event.clientY-pressPoint.y)>4)moved=true;
  if(!touching||app.isInspectMode)return;
  const dx=event.clientX-touching.x,dy=event.clientY-touching.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
  app.player.yaw-=dx*.0035;app.player.pitch=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,app.player.pitch-dy*.0035));
  app.camera.rotation.set(app.player.pitch,app.player.yaw,0,'YXZ');touching={x:event.clientX,y:event.clientY};
 });
 canvas.addEventListener('pointerup',()=>{touching=null;});canvas.addEventListener('pointercancel',()=>{touching=null;});
 canvas.addEventListener('click',event=>{if(moved){event.preventDefault();event.stopImmediatePropagation();}},true);
}
