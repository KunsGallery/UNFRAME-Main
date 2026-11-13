// Writes scene.json for build_gallery.py: the room, the laid-out artworks and camera views,
// computed with the site's own layout and tour camera so Blender matches the web gallery.
// Usage: node blender/export-scene.mjs [roomSize] > blender/scene.json
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DEMO_VIRTUAL} from '../site/js/virtual-demo.js';
import {layoutArtworks,ROOMS} from '../site/js/virtual-model.js';
import {tourScenes,tourTimeline,tourCamera} from '../site/js/tour-video.js';
const here=path.dirname(fileURLToPath(import.meta.url)),site=path.join(here,'../site');
const size=process.argv[2]||'medium',room=ROOMS[size],gallery=DEMO_VIRTUAL.resonance;
const works=layoutArtworks(gallery.artworks,size);
const line=tourTimeline(tourScenes(works)),at=type=>line.scenes.find(s=>s.type===type);
const enter=at('enter'),art=at('art');
const view=(name,time)=>({name,time,...tourCamera(time,line,room,16/9).view});
console.log(JSON.stringify({
 room:{w:room.w,d:room.d,h:4.2},wallColor:gallery.settings.wallColor||'#f6f4ee',
 artworks:works.map(a=>({id:a.id,title:a.title,wall:a.wall,size:a.size,position:a.position,image:path.join(site,(a.image?.url||a.image).replace(/^\//,''))})),
 cameras:[view('entrance',enter.start+.05),view('front-wall',enter.end-.05),view('close-up',art.end-.05)],
 fov:50
},null,1));
