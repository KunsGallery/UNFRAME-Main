import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Scripts that render public pages. Their copy comes from js/i18n-dict.js, so string and
// template literals must not hold Korean. Comments may.
export const PUBLIC_MODULES=['ui.js','footer.js','language-switch.js','home.js','home-contact.js','home-content-model.js','home-exhibition-artworks.js','home-media.js','home-news.js','home-projects.js','home-slider.js','home-viewing-rooms.js','about.js','public.js','exhibition-view.js','exhibition-viewing-room.js','project-scroll.js','virtual-gallery.js','virtual-room.js','virtual-hud.js','virtual-intro.js','virtual-links.js','virtual-environment.js','virtual-objects.js','virtual-tour.js','virtual-input.js','virtual-embed.js','virtual-quality.js','share-card.js','share-card-layout.js','share-card-geometry.js','artwork-mix.js'];
function literalsWithHangul(source){
 const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`\\])\/\/.*$/gm,'$1');
 return [...code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match=>match[2]).filter(text=>/[가-힣]/.test(text));
}
test('public modules keep their copy in the dictionary',async()=>{
 for(const name of PUBLIC_MODULES){
  const source=await readFile(new URL(`../js/${name}`,import.meta.url),'utf8');
  assert.deepEqual(literalsWithHangul(source).filter(text=>!ALLOWED.has(text)),[],name);
 }
});
// Language names are written in their own language on purpose.
const ALLOWED=new Set(['한국어']);
