import {escapeHTML as e} from './model.js';
import {HIGHLIGHT_PROJECTS} from './highlight-model.js';
export const CUSTOM_PROJECT='__custom__';
export function projectSelection(project=''){return HIGHLIGHT_PROJECTS.includes(project)?project:project?CUSTOM_PROJECT:'';}
export function readSelectedProject(values){const selected=String(values.get('project')||'');return (selected===CUSTOM_PROJECT?String(values.get('projectCustom')||''):selected).trim();}
export function needsJournalProject({published,kind,nowFeatured}){return published&&(kind==='news'||nowFeatured===true);}
export function projectFieldView(item){const selection=projectSelection(item.project);return `<label class="field"><span>프로젝트 분류 <span id="highlight-project-required"></span></span><select name="project" aria-describedby="highlight-project-help"><option value="">프로젝트를 선택해주세요</option>${HIGHLIGHT_PROJECTS.map(project=>`<option value="${e(project)}" ${selection===project?'selected':''}>${e(project)}</option>`).join('')}<option value="${CUSTOM_PROJECT}" ${selection===CUSTOM_PROJECT?'selected':''}>직접 입력 · 기존 이벤트용</option></select></label><label class="field" id="highlight-custom-project" ${selection===CUSTOM_PROJECT?'':'hidden'}><span>프로젝트명 직접 입력</span><input name="projectCustom" maxlength="100" value="${selection===CUSTOM_PROJECT?e(item.project):''}"></label><p class="help" id="highlight-project-help" aria-live="polite"></p>`;}
export function bindProjectField(form){
 const select=form.elements.project,custom=form.elements.projectCustom,wrapper=form.querySelector('#highlight-custom-project'),help=form.querySelector('#highlight-project-help'),label=form.querySelector('#highlight-project-required');
 return function sync(){
  const direct=select.value===CUSTOM_PROJECT,required=needsJournalProject({published:form.elements.published.checked,kind:form.elements.kind.value,nowFeatured:form.elements.nowFeatured.checked});
  wrapper.hidden=!direct;wrapper.style.display=direct?'':'none';custom.disabled=!direct;select.required=required;label.textContent=required?'(필수)':'(선택)';
  const valid=HIGHLIGHT_PROJECTS.includes(select.value);
  const message=required&&!valid?'공개 소식 또는 UNFRAME JOURNAL 노출에는 위 목록의 프로젝트 분류가 필요합니다. 행사명은 제목에 그대로 두고, 해당하는 프로젝트를 선택해주세요.':'';
  select.setCustomValidity(message);select.setAttribute('aria-invalid',message?'true':'false');
  help.textContent=message||(direct?'직접 입력한 이름은 기존 이벤트의 히어로 게시용으로 유지됩니다. JOURNAL에 노출하려면 등록된 프로젝트 분류를 선택해주세요.':'행사명은 제목에 입력하고, 여기서는 해당하는 프로젝트를 선택해주세요.');
 };
}
