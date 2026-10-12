import {mkdir,rm,cp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');await rm(dist,{recursive:true,force:true});await mkdir(dist);
for(const path of ['index.html','exhibition.html','detail.html','admin.html','config.js','assets','js'])await cp(resolve(root,path),resolve(dist,path),{recursive:true});
await writeFile(resolve(dist,'_redirects'),'/admin /admin.html 200\n/exhibition /exhibition.html 200\n/exhibition/ /exhibition.html 200\n/exhibition/:id /detail.html 200\n/exhibitions/:id /exhibition/:id 301\n');
await writeFile(resolve(dist,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n/config.js\n  Cache-Control: no-store\n/admin*\n  X-Robots-Tag: noindex, nofollow\n');
console.log('Netlify deploy folder prepared: dist/');
