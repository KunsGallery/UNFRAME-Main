import {test} from 'node:test';import assert from 'node:assert/strict';
import {ENGLISH_FIELDS,englishFieldsHTML,readEnglish} from '../js/admin-english.js';
test('each editor offers the spec English fields',()=>{
 assert.deepEqual(ENGLISH_FIELDS.exhibition.map(field=>field.name),['titleEn','summaryEn','descriptionEn','locationEn','hoursEn']);
 assert.deepEqual(ENGLISH_FIELDS.highlight.map(field=>field.name),['titleEn','summaryEn']);
 assert.deepEqual(ENGLISH_FIELDS.gallery.map(field=>field.name),['titleEn','subtitleEn','artistNoteEn']);
 assert.deepEqual(ENGLISH_FIELDS.artwork.map(field=>field.name),['mediumEn','descriptionEn']);
});
test('English inputs round-trip through the form, trimmed',()=>{
 const html=englishFieldsHTML('exhibition',{titleEn:'Light <b>',descriptionEn:'Story'});
 assert.match(html,/name="titleEn"[^>]*value="Light &lt;b&gt;"/);assert.match(html,/<textarea name="descriptionEn"[^>]*>Story<\/textarea>/);
 assert.match(html,/maxlength="30000"/);assert.match(html,/<details class="english-fields" open>/);
 const form=new FormData();form.set('titleEn','  Light ');form.set('summaryEn','');form.set('descriptionEn','Story');
 assert.deepEqual(readEnglish('exhibition',form),{titleEn:'Light',summaryEn:'',descriptionEn:'Story',locationEn:'',hoursEn:''});
});
test('documents without English open with empty, collapsed fields',()=>{
 const html=englishFieldsHTML('highlight',{title:'소식'});
 assert.match(html,/<details class="english-fields">/);assert.match(html,/name="titleEn"[^>]*value=""/);
});
test('fields can be left out, such as the artist note on whole-exhibition galleries',()=>{
 const html=englishFieldsHTML('gallery',{},{omit:['artistNoteEn']});
 assert.doesNotMatch(html,/artistNoteEn/);
 const form=new FormData();form.set('titleEn','Room');
 assert.deepEqual(readEnglish('gallery',form,{omit:['artistNoteEn']}),{titleEn:'Room',subtitleEn:''});
});
