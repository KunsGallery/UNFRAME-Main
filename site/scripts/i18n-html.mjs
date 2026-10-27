import {DICT} from '../js/i18n-dict.js';
import {localHref} from '../js/i18n.js';
// Public pages get an English copy under /en. Marked copy is swapped from the dictionary at build
// time so English visitors never see Korean flash before scripts run.
// shop-preview, project-scroll and project-lab are staff-only or draft pages (noindex) and stay Korean.
export const PUBLIC_PAGES=['index.html','exhibition.html','detail.html','project.html','about.html','virtual-gallery.html'];
// Pages whose fixed copy is fully marked; tests require their English build to be Hangul-free.
export const I18N_READY=['index.html','about.html','exhibition.html','detail.html','project.html','virtual-gallery.html'];
// Pages with one fixed address get build-time hreflang links; the others add them at runtime.
export const PAGE_PATHS={'index.html':'/','exhibition.html':'/exhibition','project.html':'/project','about.html':'/about'};
const english=key=>{const entry=DICT[key];if(!entry)throw new Error(`Missing translation key: ${key}`);return entry.en;};
const escapeAttr=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;');
export const alternateLinks=path=>[['ko',path],['en',localHref(path,'en')],['x-default',path]].map(([code,href])=>`<link rel="alternate" hreflang="${code}" href="${href}">`).join('');
export function translateHTML(html,l,{path}={}){
 let out=html;
 if(l==='en'){
  out=out.replace(/<html lang="ko">/,'<html lang="en">');
  // Marked elements hold text only, so their content ends at the first matching close tag.
  out=out.replace(/<([a-zA-Z][\w-]*)(\s[^>]*?)?\sdata-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g,(match,tag,before='',key,after)=>`<${tag}${before} data-i18n="${key}"${after}>${english(key)}</${tag}>`);
  out=out.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g,tag=>{
   const pairs=tag.match(/data-i18n-attr="([^"]+)"/)[1].split(';').map(pair=>pair.split(':'));
   for(const [attr,key] of pairs){const value=escapeAttr(english(key));tag=new RegExp(`\\s${attr}="[^"]*"`).test(tag)?tag.replace(new RegExp(`(\\s${attr}=)"[^"]*"`),`$1"${value}"`):tag.replace(/\s*\/?>$/,end=>` ${attr}="${value}"${end}`);}
   return tag;
  });
  out=out.replace(/(\s(?:href|src|action)=)"(\/[^"]*)"/g,(match,attr,url)=>`${attr}"${localHref(url,'en')}"`);
 }
 if(path)out=out.replace('</head>',alternateLinks(path)+'</head>');
 return out;
}
// Removes every element carrying `attribute`, counting nested tags of the same name.
function dropElements(html,attribute){
 const open=new RegExp(`<([a-zA-Z][\\w-]*)\\b[^>]*\\s${attribute}(?:[\\s=>/])`);
 for(let match=open.exec(html);match;match=open.exec(html)){
  const tag=match[1],tags=new RegExp(`<(/?)${tag}\\b[^>]*>`,'g');tags.lastIndex=match.index;
  let depth=0,end=html.length;
  for(let found=tags.exec(html);found;found=tags.exec(html)){if(found[1])depth--;else if(!found[0].endsWith('/>'))depth++;if(depth===0){end=found.index+found[0].length;break;}}
  html=html.slice(0,match.index)+html.slice(end);
 }
 return html;
}
export function hangulLeft(html){
 const visible=dropElements(html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<style\b[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,''),'data-i18n-content');
 const left=[];
 for(const [,value] of visible.matchAll(/\s(?:alt|title|placeholder|aria-label|content)="([^"]*)"/g))if(/[가-힣]/.test(value))left.push(value.trim());
 for(const text of visible.replace(/<[^>]*>/g,'\n').split('\n'))if(/[가-힣]/.test(text))left.push(text.trim());
 return left;
}
// Korean routes; each public one gains an /en mirror pointing at the English file.
const ROUTES=[['/shop-preview/:id','/shop-preview.html'],['/virtual-gallery','/virtual-gallery.html'],['/virtual-gallery/','/virtual-gallery.html'],['/virtual-gallery/:id','/virtual-gallery.html'],['/virtual-gallery/submission/:id','/virtual-gallery.html'],['/artist-studio/:id','/artist-studio.html'],['/about','/about.html'],['/about/','/about.html'],['/project-scroll','/project-scroll.html'],['/project-scroll/','/project-scroll.html'],['/project-lab','/project-lab.html'],['/project-lab/','/project-lab.html'],['/project','/project.html'],['/project/','/project.html'],['/admin','/admin.html'],['/exhibition','/exhibition.html'],['/exhibition/','/exhibition.html'],['/exhibition/:id','/detail.html'],['/exhibitions/:id','/exhibition/:id','301']];
export function redirectLines(){
 const lines=ROUTES.map(([from,to,status='200'])=>`${from} ${to} ${status}`);
 for(const [from,to,status='200'] of ROUTES){
  const file=to.replace(/^\//,'');
  if(status==='200'&&!PUBLIC_PAGES.includes(file))continue;
  lines.push(`/en${from} /en${to} ${status}`);
 }
 lines.push('/en /en/index.html 200','/en/ /en/index.html 200');
 return lines;
}
