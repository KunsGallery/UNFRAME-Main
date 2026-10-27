import {CONFIG} from '../config.js';
import {resolveBuildConfig} from './build-config.mjs';
import {mkdir,rm,cp,writeFile,readFile} from 'node:fs/promises';
import {PUBLIC_PAGES,PAGE_PATHS,translateHTML,redirectLines} from './i18n-html.mjs';
import {resolve} from 'node:path';
const config=resolveBuildConfig(CONFIG,process.env);
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');await rm(dist,{recursive:true,force:true});await mkdir(dist);
for(const path of ['shop-preview.html','virtual-gallery.html','artist-studio.html','about.html','index.html','exhibition.html','detail.html','admin.html','project.html','project-lab.html','project-scroll.html','config.js','assets','js'])await cp(resolve(root,path),resolve(dist,path),{recursive:true});
await writeFile(resolve(dist,'config.js'),'// Generated Firebase web configuration (public client settings).\nexport const CONFIG = '+JSON.stringify(config,null,2)+';\n');
await writeFile(resolve(dist,'_redirects'),redirectLines().join('\n')+'\n');
// Korean pages gain hreflang links; English copies are written under /en.
await mkdir(resolve(dist,'en'));
// Netlify sets URL to the site's primary address; hreflang links must be absolute.
const origin=(process.env.URL||'https://unframe-main.netlify.app').replace(/\/$/,'');
for(const name of PUBLIC_PAGES){const html=await readFile(resolve(root,name),'utf8'),path=PAGE_PATHS[name];await writeFile(resolve(dist,name),translateHTML(html,'ko',{path,origin}));await writeFile(resolve(dist,'en',name),translateHTML(html,'en',{path,origin}));}
await writeFile(resolve(dist,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n/config.js\n  Cache-Control: no-store\n/admin*\n  X-Robots-Tag: noindex, nofollow\n/artist-studio*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n/shop-preview*\n  Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow, noarchive\n/project-lab*\n  X-Robots-Tag: noindex, nofollow\n/project-scroll*\n  X-Robots-Tag: noindex, nofollow\n');
console.log('Netlify deploy folder prepared: dist/');
