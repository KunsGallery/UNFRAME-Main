# 공개 페이지 영문판 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 페이지를 `/en/` 주소의 영문판으로도 제공하고, 우상단 `KO / EN` 드롭다운으로 바꾸게 한다.

**Architecture:**
- 번역 사전(`js/i18n.js`)이 고정 문구의 유일한 출처다.
- 빌드가 표시된 HTML 문구를 바꿔 `dist/en/*.html`을 만든다. 스크립트 문구는 `t()`로 고른다.
- 직접 입력하는 내용은 `En` 접미 필드에 저장하고, 영문판에서 `localized()`로 고른다. 영문이 비어 있으면 한국어를 보여준다.

**Tech Stack:** 정적 ES 모듈, Node 빌드 스크립트, `node --test`, Firestore 규칙 에뮬레이터, Netlify 리다이렉트.

**Spec:** `docs/superpowers/specs/2026-10-27-english-version-design.md`

## Global Constraints

- **범위:**
  - 대상 페이지는 `index`, `exhibition`, `detail`, `project`, `project-scroll`, `project-lab`, `about`, `virtual-gallery`, `shop-preview` 9개다.
  - `admin`, `artist-studio`는 한국어 그대로 둔다.
- **주소:** 영문은 같은 주소 앞에 `/en`을 붙인다. 한국어 주소는 바꾸지 않는다.
- **자동 이동:** 기억된 언어로 옮기는 것은 언어 없는 메인(`/`)에서만 한다. 처음 방문에서 브라우저 언어만 보고 옮기지 않는다.
- **새 필드:** 문자열이고, 길이 제한은 같은 이름의 한국어 필드와 같다.
  - 전시: `titleEn`, `summaryEn`, `descriptionEn`, `locationEn`, `hoursEn`, `admissionEn`
  - 하이라이트: `titleEn`, `summaryEn`
  - 갤러리 설정: `titleEn`, `subtitleEn`, `artistNoteEn`
  - 갤러리 작품: `descriptionEn`, `mediumEn`
- **작가 제출함:** 제출함(`virtualSubmissions`) 규칙과 작가 업로드 화면에는 새 필드를 추가하지 않는다.
- **번역하지 않는 것:** 작가명, 주소, 가격(원화)은 입력한 그대로 보여준다.
- **날짜와 상태:** 날짜 형식은 두 언어가 같다. 영문 전시 상태는 `stateEnglish`를 쓴다.
- **데모 모드:** 데모와 Firebase 모드의 구분은 그대로 둔다.
- **반영 순서:** Firestore 규칙 → 사이트 머지. Worker는 바꾸지 않는다.
- **푸시 전:** `npm run check`, `npm test`, `npm run build`, 규칙 에뮬레이터를 통과해야 한다.

## Review Focus

1. **수정본 승인 후 영문 유지:** 관리자가 입력한 작품 영문(`descriptionEn`, `mediumEn`)과 갤러리 영문(`titleEn` 등)이 남아야 한다. 작품은 같은 `id`로 짝을 짓는다. → Task 2 테스트
2. **공백뿐인 영문 칸:** 공백만 있으면 비어 있는 것으로 보고 한국어를 보여준다. → Task 1 테스트
3. **공유받은 영문 주소:** `/en/exhibition/abc`, `/en/virtual-gallery/xyz#art-1`이 바로 열려야 하고, 언어를 바꿔도 경로·쿼리·해시가 유지되어야 한다. → Task 1, Task 3 테스트
4. **기억된 언어와 한국어 링크:** 영어를 기억한 방문자가 한국어 상세 링크를 열면 이동하지 않고 한국어로 보여준다(메인만 이동). → Task 1 테스트
5. **브라우저 저장소를 못 쓸 때:** 비공개 창처럼 `localStorage`에서 오류가 나도 언어 전환은 동작한다. 언어를 기억하지 못할 뿐이다. → Task 1 테스트

---

### Task 1: 번역 핵심 모듈

**Files:**
- Create: `site/js/i18n.js`
- Test: `site/tests/i18n.test.mjs`

**Interfaces:**
- Produces (모두 `js/i18n.js`에서 export):
  - `DICT: {[key:string]: {ko:string, en:string}}`
  - `lang(pathname = location.pathname) → 'ko'|'en'` — `/en`이거나 `/en/`으로 시작하면 `'en'`
  - `t(key, vars = {}, l = lang()) → string`
    - `{name}` 자리 치환
    - 사전에 없는 키는 오류를 던진다. 테스트에서 오타를 잡기 위해서다.
  - `localHref(path, l = lang()) → string`
    - `/`로 시작하는 내부 경로에만 `/en`을 붙인다.
    - `http(s):`, `mailto:`, `#…`, 이미 `/en`인 경로, `/admin`, `/artist-studio`는 그대로 둔다.
  - `switchURL(href, target) → string` — 같은 페이지의 다른 언어 주소. 경로, 쿼리, 해시를 유지한다.
  - `localized(item, field, l = lang()) → string` — 영문판이고 `item[field+'En']?.trim()`이 있으면 그 값, 아니면 `item[field] ?? ''`
  - `rememberLanguage(l)`, `preferredLanguage() → 'ko'|'en'|null` — `localStorage` 키 `unframe-lang`, try/catch로 감싼다
  - `homeRedirect(pathname, preferred) → string|null` — `/`이고 `preferred === 'en'`일 때만 `'/en/'`

- [ ] **Step 1: Write the failing test** — `tests/i18n.test.mjs`
  - `lang('/en/exhibition/a')==='en'`, `lang('/en')==='en'`, `lang('/english')==='ko'`, `lang('/exhibition')==='ko'`
  - `t('lang.switch',{},'en')`가 사전 값과 같다. `t('no.such.key')`는 throw한다.
  - `localHref('/exhibition/a','en')==='/en/exhibition/a'`
    - 다음은 그대로: `localHref('/en/x','en')`, `localHref('https://x.com','en')`, `localHref('#top','en')`, `localHref('/admin','en')`
    - 한국어: `localHref('/exhibition/a','ko')==='/exhibition/a'`
  - `switchURL('https://u.kr/virtual-gallery/x?v=1#art-2','en')==='https://u.kr/en/virtual-gallery/x?v=1#art-2'`, 반대 방향, `switchURL('https://u.kr/en/','ko')==='https://u.kr/'`
  - `localized({title:'가',titleEn:'  '},'title','en')==='가'`, `localized({title:'가',titleEn:'A'},'title','en')==='A'`, `localized({title:'가',titleEn:'A'},'title','ko')==='가'`
  - `homeRedirect('/','en')==='/en/'`, `homeRedirect('/exhibition/a','en')===null`, `homeRedirect('/',null)===null`
  - `globalThis.localStorage`가 throw하는 객체일 때 `rememberLanguage('en')`이 throw하지 않고 `preferredLanguage()===null`
  - 사전의 모든 항목에 빈 문자열이 아닌 `ko`와 `en`이 있다.
- [ ] **Step 2:** Run `node --test tests/i18n.test.mjs`. Expected: FAIL. 모듈이 없다.
- [ ] **Step 3:** `js/i18n.js`에 위 함수와 첫 키 `lang.switch`(`{ko:'언어', en:'Language'}`), `lang.ko`(`한국어`/`Korean`), `lang.en`(`English`/`English`)을 구현한다.
- [ ] **Step 4:** Run `node --test tests/i18n.test.mjs`. Expected: PASS.
- [ ] **Step 5:** Commit `Add i18n core module`.

### Task 2: 영문 필드 저장 (모델, 규칙, 승인 유지, 데모)

**Files:**
- Modify: `site/js/model.js` (`validateExhibition`), `site/js/highlight-model.js` (`validateHighlight`), `site/js/virtual-model.js` (`validateGallery`, `validateArtwork`), `site/js/submission-store.js` (`approveSubmission`)
- Modify: `site/firestore.rules`
  - exhibitions·highlights·virtualGalleries의 `hasOnly`
  - 갤러리 `artworks` 경로에만 작품 영문 필드 허용(제출함 `artworks`는 그대로)
- Modify: `site/js/demo.js`, `site/js/virtual-demo.js` — 샘플 한 건씩에 영문 필드
- Modify: `site/scripts/test-firestore-rules.mjs`
- Test: `site/tests/model.test.mjs`, `site/tests/highlights.test.mjs`, `site/tests/virtual-gallery.test.mjs`, `site/tests/submissions.test.mjs`

**Interfaces:**
- Produces: 위 문서들이 Global Constraints의 영문 필드를 저장할 수 있다. 검증 함수의 이름과 반환값은 바뀌지 않는다.

- [ ] **Step 1: Write the failing tests**
  - 각 검증 함수: 영문 필드가 있으면 통과한다. 한국어 필드 최대 길이 + 1자, 또는 숫자 값이면 거부한다.
  - `validateArtwork({...flat, descriptionEn:'x'.repeat(5001)})`는 throw한다.
  - `submissions.test.mjs` — **수정본 승인:**
    - 준비: 갤러리 작품 `w1`에 `descriptionEn:'Kept'`, `mediumEn:'Oil'`, 갤러리 설정에 `titleEn:'Room'`이 있다.
    - 수정본이 `w1`을 고쳐 승인하면 승인 후 `w1.descriptionEn==='Kept'`, `mediumEn==='Oil'`, `settings.titleEn==='Room'`이다.
    - 새 작품 `w9`에는 영문 필드가 없다.
  - 에뮬레이터:
    - 관리자가 영문 필드로 전시·하이라이트·갤러리·작품을 쓰면 허용, 길이 초과는 거부
    - 제출함 작품에 `descriptionEn`이 있으면 거부
- [ ] **Step 2:** Run `node --test tests/model.test.mjs tests/highlights.test.mjs tests/virtual-gallery.test.mjs tests/submissions.test.mjs`. Expected: 새 테스트만 FAIL.
- [ ] **Step 3:** 검증 함수에 길이 검사를 추가하고, 규칙의 `hasOnly`와 문자열·길이 검사를 추가한다.
  - `approveSubmission`은 기존 갤러리 작품을 `id`로 찾는다. 짝이 있으면 그 작품의 `descriptionEn`과 `mediumEn`을 새 작품에 옮긴다.
  - 갤러리 설정은 이미 `{...base,...submission.settings}`로 유지되니 테스트로만 고정한다.
- [ ] **Step 4:** 다음을 실행한다.
  - `npm test`. Expected: 전부 PASS.
  - 에뮬레이터 데이터 삭제 후 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8087 node scripts/test-firestore-rules.mjs`. Expected: `checks passed`.
- [ ] **Step 5:** Commit `Store optional English fields for public content`.

### Task 3: 영문 페이지 빌드와 주소

**Files:**
- Create: `site/scripts/i18n-html.mjs`
- Modify: `site/scripts/build.mjs`, `site/netlify.toml`
- Test: `site/tests/i18n-build.test.mjs`

**Interfaces:**
- Consumes: `DICT`, `localHref` (Task 1)
- Produces:
  - `PUBLIC_PAGES: string[]` — 9개 HTML 파일 이름. `scripts/i18n-html.mjs`에서 export한다.
  - `translateHTML(html, l) → string` — `l==='ko'`면 `hreflang`만 넣는다. `'en'`이면 아래를 바꾼다.
    - `<html lang="en">`
    - `data-i18n="key"` 요소의 내부 텍스트 → `en` 값
    - `data-i18n-attr="attr:key;attr2:key2"` → 해당 속성 값
    - `href`·`src`·`action`의 루트 경로(`/…`)를 `localHref(…,'en')`로 바꾼다. `/js/`, `/assets/`, `/config.js`는 제외한다.
    - `<head>`에 `<link rel="alternate" hreflang="ko|en|x-default">` 3개
  - `hangulLeft(html) → string[]`
    - 대상: `<script>`, `<style>`, 주석, `data-i18n-content` 요소 안쪽을 뺀 텍스트 노드와 `alt`·`title`·`placeholder`·`aria-label` 값
    - 반환값: 그중 한글이 남은 조각
  - 빌드 결과:
    - `dist/en/<page>.html`
    - `dist/_redirects`에 기존 규칙마다 `/en` 버전과 `/en /en/index.html 200`
    - `netlify.toml`에도 같은 `/en` 리다이렉트
  - `I18N_READY: string[]` — 번역을 끝낸 페이지 목록. Task 4~8이 페이지를 하나씩 추가한다. 테스트는 이 목록에만 `hangulLeft`를 검사한다.

- [ ] **Step 1: Write the failing test** — `tests/i18n-build.test.mjs`
  - 작은 HTML 조각으로 `translateHTML` 검사:
    - `<p data-i18n="lang.switch">언어</p>` → `Language`
    - `alt` 교체
    - `href="/exhibition"` → `/en/exhibition`, `href="/assets/a.png"`·`href="https://x"` 유지
    - `lang="en"`, `hreflang` 3개
  - `hangulLeft('<p>안녕</p><div data-i18n-content>내용</div><script>"가"</script>')`는 `['안녕']`
  - `PUBLIC_PAGES`의 모든 파일이 있고, `I18N_READY`의 각 페이지는 `hangulLeft(translateHTML(file,'en'))`가 빈 배열이다(처음엔 빈 목록이라 통과).
  - `_redirects` 생성 함수 `redirectLines()`가 `/en/exhibition/:id /en/detail.html 200`, `/en/virtual-gallery/* /en/virtual-gallery.html 200`처럼 영문 줄을 포함한다.
- [ ] **Step 2:** Run `node --test tests/i18n-build.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** 구현한다.
  - `build.mjs`의 `_redirects` 문자열을 `redirectLines()`로 옮긴다.
  - 영문 줄은 대상 앞에 `/en`을 붙인다(예: `/en/exhibition/:id /en/detail.html 200`).
  - `PUBLIC_PAGES`마다 `dist/en/`에 번역본을 쓴다.
  - 한국어 공개 페이지에도 `translateHTML(…,'ko')`를 적용해 `hreflang`을 넣는다.
- [ ] **Step 4:** Run `node --test tests/i18n-build.test.mjs && npm run build`. Expected: PASS, `dist/en/index.html` 생성.
- [ ] **Step 5:** Commit `Build English pages under /en`.

### Task 4: 언어 드롭다운과 공통 헤더·푸터

**Files:**
- Create: `site/js/language-switch.js`
- Modify: 9개 공개 HTML의 헤더(`#site-header`, `.study-header`, `.lab-header`, `.product-header`, `.top-header`), `site/js/ui.js`, `site/js/footer.js`, `index.html` `<head>`(메인 이동용 짧은 인라인 스크립트), 공통 CSS
- Test: `site/tests/i18n.test.mjs`(추가)

**Interfaces:**
- Consumes: `lang`, `switchURL`, `rememberLanguage`, `preferredLanguage`, `homeRedirect`, `t`
- Produces:
  - `mountLanguageSwitch(root = document)` — 모든 `[data-lang-switch]` 자리에 `<select aria-label=t('lang.switch')>`를 그린다. 바꾸면 `rememberLanguage`를 저장하고 `location.assign(switchURL(location.href, value))`로 이동한다.
  - 헤더와 푸터의 공통 문구 키(`nav.*`, `footer.*`)

- [ ] **Step 1: Write the failing test**
  - `languageOptions('en')`는 `[{value:'ko',label:'한국어',selected:false},{value:'en',label:'English',selected:true}]`다. 선택 목록 데이터를 만드는 순수 함수이고 `language-switch.js`에서 export한다.
  - `footerHTML`을 `footerHTML(l)` 함수로 바꾼다. `footerHTML('en')`에 한글이 없다.
- [ ] **Step 2:** Run `node --test tests/i18n.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** 구현한다.
  - 각 공개 헤더 우상단에 `<div data-lang-switch></div>`를 두고, 모바일 메뉴가 있는 페이지는 메뉴 안에도 하나 둔다.
  - 헤더와 푸터 문구에 키를 붙인다.
  - 공통 링크는 `ui.js`에서 `localHref`로 만든다.
  - `index.html` `<head>`의 인라인 스크립트는 `homeRedirect(location.pathname, localStorage 값)`과 같은 규칙(메인 `/`이고 저장 값이 `en`일 때만)으로 `location.replace('/en/')`를 하고, try/catch로 감싼다.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `Add language switch to public headers`.

### Task 5: 메인·소개 페이지

**Files:**
- Modify: `site/index.html`, `site/about.html`, `site/js/home*.js`, `site/js/about.js`, `site/js/highlights.js`, `site/js/i18n.js`(키), `scripts/i18n-html.mjs`(`I18N_READY`에 `index.html`, `about.html`)
- Test: `site/tests/i18n-build.test.mjs`, `site/tests/home-content.test.mjs`, `site/tests/i18n-scripts.test.mjs`(새로 만듦)

**Interfaces:**
- Consumes: `t`, `localized`, `localHref`, `I18N_READY`
- Produces: `tests/i18n-scripts.test.mjs`의 `PUBLIC_MODULES` 목록
  - 주석과 `i18n.js`를 빼고, 문자열·템플릿 리터럴에 한글이 있으면 실패하는 검사다.
  - Task 6~8이 목록에 파일을 추가한다.

- [ ] **Step 1: Write the failing test**
  - `I18N_READY`에 `index.html`과 `about.html`을 넣는다.
  - `PUBLIC_MODULES`에 `home.js`, `home-*.js`, `about.js`, `highlights.js`를 넣는다.
  - `home-content.test.mjs`: 영문판(`l='en'`) 렌더 함수가 전시 카드에 `titleEn`을, 비어 있으면 `title`을 쓴다. 렌더 함수가 언어 인자를 받도록 기존 시그니처 끝에 `l = lang()`을 추가한다.
- [ ] **Step 2:** Run `npm test`. Expected: 새 검사가 남은 한글 위치를 나열하며 FAIL.
- [ ] **Step 3:** HTML에 `data-i18n` 키를 붙이고, 입력 내용이 들어갈 자리는 `data-i18n-content`로 표시한다. 스크립트 문구는 `t()`로, 입력 내용은 `localized()`로, 내부 링크는 `localHref()`로 바꾼다. 영어 초안 키를 사전에 추가한다.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `Translate home and about pages`.

### Task 6: 전시 목록·상세

**Files:**
- Modify: `site/exhibition.html`, `site/detail.html`, `site/js/public.js`, `site/js/exhibition-view.js`, `site/js/exhibition-viewing-room.js`, `site/js/model.js`(상태 라벨만), `i18n.js`, `I18N_READY`, `PUBLIC_MODULES`
- Test: `site/tests/viewing-room.test.mjs`, `site/tests/exhibition-editor.test.mjs`(렌더 부분), `i18n-build`, `i18n-scripts`

- [ ] **Step 1: Write the failing test**
  - 페이지와 모듈을 두 목록에 추가한다.
  - 전시 상세 렌더(`l='en'`)에 `summaryEn`, `descriptionEn`, `locationEn`, `hoursEn`, `admissionEn`이 쓰인다. 비어 있으면 한국어가 쓰인다. 주소(`address`)와 작가명은 그대로다.
  - 영문 상태 라벨은 `stateEnglish` 값이다.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Task 5와 같은 방식으로 바꾼다. 날짜에 붙는 요일 같은 한국어 표기는 `t()`로 바꾼다. 공개 페이지에서 저장소 오류를 보여줄 때는 영문판에서 `t('error.load')`를 쓴다(공유 모듈의 한국어 오류 문구를 그대로 보이지 않는다).
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `Translate exhibition list and detail`.

### Task 7: 프로젝트 페이지

**Files:**
- Modify: `site/project.html`, `site/project-scroll.html`, `site/project-lab.html`, `site/js/project.js`, `site/js/project-scroll.js`, `site/js/project-lab.js`, `site/js/projects.js`, `i18n.js`, 두 목록
- Test: `i18n-build`, `i18n-scripts`, `site/tests/i18n.test.mjs`

**Interfaces:**
- Produces:
  - `PROJECTS`의 각 항목에 `en: {type, title, subtitle, action, summary, paragraphs}`를 추가한다.
  - `projectText(project, l = lang())`은 영문판이면 `{...project, ...project.en}`, 아니면 `project`를 돌려준다.

- [ ] **Step 1: Write the failing test**
  - 모든 `PROJECTS` 항목에 `en`이 있고, `en`의 각 값에 한글이 없으며, `paragraphs` 개수가 한국어와 같다.
  - `projects.js`는 데이터 파일이라 `PUBLIC_MODULES` 검사에서 뺀다. 이 테스트가 대신 검사한다.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** 영어 초안을 쓰고 페이지와 스크립트를 바꾼다.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `Translate project pages`.

### Task 8: 버추얼 갤러리·공유 카드·상품 미리보기

**Files:**
- Modify: `site/virtual-gallery.html`, `site/js/virtual-gallery.js`, `site/js/virtual-room.js`, `site/js/virtual-hud.js`, `site/js/virtual-intro.js`, `site/js/virtual-tour.js`, `site/js/share-card.js`, `site/js/share-card-layout.js`, `site/shop-preview.html`, `site/js/product-preview.js`, `site/js/*-product-view.js`, `site/js/product-detail-images.js`, `i18n.js`, 두 목록
- Test: `site/tests/virtual-gallery.test.mjs`, `site/tests/share-card.test.mjs`, `site/tests/mickey-product-view.test.mjs`, `site/tests/rental-product-view.test.mjs`, `i18n-build`, `i18n-scripts`

- [ ] **Step 1: Write the failing test**
  - 페이지와 모듈을 두 목록에 추가한다.
  - 작품 정보 창 값(`l='en'`): `titleEn`, `mediumEn`, `descriptionEn`이 쓰이고, 비어 있으면 한국어가 쓰인다.
  - 갤러리 제목과 소개, 작가 소개에 `titleEn`, `subtitleEn`, `artistNoteEn`이 쓰인다.
  - 오브제 크기 문구는 `W 60 × D 50 × H 120 cm`다. 평면 크기 라벨은 `Size (H × W)`다.
  - 공유 카드 레이아웃(`l='en'`)의 라벨에 한글이 없다.
  - 상품 미리보기의 고정 라벨이 영어다. 상품 이름과 설명은 아임웹에서 온 내용이라 그대로 둔다.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** 바꾼다. 3D 벽 캡션 텍스처도 같은 `localized` 값을 쓴다. 갤러리 내부 링크(`#art-`, 전시로 돌아가기)는 `localHref`로 만든다.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `Translate virtual gallery, share cards and product preview`.

### Task 9: 관리자 영문 입력 칸

**Files:**
- Modify: `site/js/admin.js`(전시 편집), `site/js/exhibition-editor-model.js`, `site/js/admin-highlights.js`, `site/js/admin-virtual.js`(갤러리 설정과 작품)
- Test: `site/tests/exhibition-editor.test.mjs`, `site/tests/highlights.test.mjs`, `site/tests/virtual-gallery.test.mjs`

**Interfaces:**
- Consumes: Task 2의 필드 이름
- Produces: 저장 데이터에 영문 필드가 들어간다.
  - 빈 칸은 `''`로 저장한다. 규칙상 길이 0을 허용한다.
  - 편집기가 기존 문서의 영문 값을 다시 채운다.

- [ ] **Step 1: Write the failing test**
  - 편집 모델이 영문 값을 폼 → 저장 데이터로 보내고, 저장 데이터 → 폼으로 되돌린다(왕복).
  - 영문 필드가 없는 기존 문서를 열면 빈 칸이다.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** 한국어 칸 아래 "영문 (선택)" 칸을 둔다. 긴 설명 칸은 `<details>`로 접어 둔다. 안내 문구는 한국어로 쓴다.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `Add English fields to admin editors`.

### Task 10: 마무리와 반영

- [ ] **Step 1:** `docs/`에 `영문판.md`를 쓴다. 내용: 문구 고치는 곳(`js/i18n.js`), 새 페이지를 추가할 때의 순서, 관리자 영문 칸 사용법.
- [ ] **Step 2:** 영어 문구 목록(키, 한국어, 영어)을 사용자 검토용으로 만들어 전달하고, 고친 내용을 반영한다.
- [ ] **Step 3:** `npm run check`, `npm test`, `npm run build`, 규칙 에뮬레이터를 실행한다. Expected: 모두 통과.
- [ ] **Step 4:** 브라우저(데모)에서 9개 페이지를 영문으로 열어 확인한다.
  - 드롭다운 전환과 기억, 메인 이동, 상세에서 언어 전환 후 해시 유지
  - 영문이 비어 있을 때 한국어 표시, 모바일 폭 메뉴
- [ ] **Step 5:** 전체 브랜치 리뷰를 받고 지적 사항을 고친다.
- [ ] **Step 6:** Firestore 규칙 배포 → 푸시·PR → 미리보기 확인 → 머지 → 실제 사이트에서 `/en/` 확인.
