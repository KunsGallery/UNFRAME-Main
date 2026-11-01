# Photo Relief Objects and Dark Museum Lighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, chosen for this project) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn one front photo into a depth-relief GLB in the browser at upload time, allow it only at corner floor spots, and add a "다크 뮤지엄" lighting option.

**Architecture:** A pure geometry module builds the relief from a mask and a depth map; a thin AI module runs ormbg + Depth Anything V2 Small through transformers.js; the existing GLB upload, worker, rules and renderer carry the result. Lighting adds one enum value and a render branch.

**Tech Stack:** Static ES modules, Three.js r128 (vendored), transformers.js (pinned, jsDelivr), Firestore rules, node:test.

**Spec:** `docs/superpowers/specs/2026-10-29-photo-relief-objects-design.md`

## Global Constraints

- Models: `onnx-community/ormbg-ONNX` (int8/quantized) and `onnx-community/depth-anything-v2-small` (quantized). Never Depth Anything Base or larger (CC-BY-NC), never RMBG (Bria licence).
- `model.source` ∈ `glb` | `photo`; absent means `glb`. Photo objects: corner spots only.
- Relief: grid ≈200 cells on the long side, max thickness = entered `depthCm`, strength slider 0.3–1.0 (default 0.6), model height normalised to 1, front faces +Z, texture JPEG ≤2048px, GLB ≤10MB (rebuild smaller if over).
- Mask sanity: stop at preview if the object covers <5% or >95% of the photo.
- `lighting` ∈ `general` | `focused` | `museum`. Museum defaults on first pick: wall `#3a3c3b`, theme `black`, ceiling `plain`; luminous ceiling forced off; no real-time shadows.
- Studio and admin copy is Korean; viewer copy goes through `t()` and `js/i18n-dict.js`.
- Deploy order: Firestore rules → merge. Worker unchanged.

## Review Focus

1. A photo object saved before the spot list filtered (old center spot) must be rejected on save with a clear message, not silently moved.
2. Revision approval / submission copy must carry `model.source` intact (`submission-store.js`, `approveSubmission`).
3. Transparent PNG input skips background removal; JPEG with alpha-less white background still runs it.
4. Museum lighting with zero wall works and only objects must still light the objects.
5. Model download failure or WebGPU absence falls back (WASM) or shows the GLB-upload hint — never a stuck spinner.

---

### Task 1: Data rules for `model.source`, `museum`, corner-only

**Files:** Modify `site/js/virtual-model.js`, `site/js/object-placement.js`, `site/firestore.rules`, `site/scripts/test-firestore-rules.mjs`; Test `site/tests/virtual-gallery.test.mjs`, `site/tests/object-placement.test.mjs` (create if absent)

**Produces:** `LIGHTING.museum='다크 뮤지엄'`; `MUSEUM_DEFAULTS={wallColor:'#3a3c3b',theme:'black',ceiling:'plain'}`; `validateArtwork` accepts `model.source` in `['glb','photo']`; `placeObjects` throws `「{title}」은(는) 사진으로 만든 입체라 모서리 자리에만 놓을 수 있습니다.` for photo objects at center spots; `objectSpots(room,{photo})` filters to corners.

- [ ] Write failing tests: museum accepted / `dim` rejected; photo object at `center` throws the message above; photo object at a corner places; `objectSpots(room,{photo:true})` returns only `type==='corner'`.
- [ ] Run `npm test` → FAIL on the new tests.
- [ ] Implement in the two JS files.
- [ ] Rules: `validModel` allows optional `source in ['glb','photo']` (hasOnly adds `source`) for gallery and submission artworks; both `lighting in [...]` lists add `'museum'`. Add emulator cases (allow source photo, reject source `x`, allow lighting museum, reject `dim`).
- [ ] Run `npm test` and the emulator (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8087 node scripts/test-firestore-rules.mjs`) → PASS.
- [ ] Commit `Allow photo relief models and museum lighting in data and rules`.

### Task 2: Relief geometry (pure)

**Files:** Create `site/js/photo-relief.js`; Test `site/tests/photo-relief.test.mjs`

**Produces:** `normalizeDepth(depth:Float32Array, mask:Uint8Array) → Float32Array` (0–1 inside mask, light blur); `reliefGeometry({width,height,mask,depth,strength,maxDepth,cells=200}) → {positions:Float32Array, uvs:Float32Array, indices:Uint32Array}` with front, side walls along the mask outline, and a flat back; height normalised to 1, +Z front; `maskCoverage(mask) → 0..1`.

- [ ] Tests: cells outside the mask produce no front triangles; the highest vertex z equals `strength × maxDepth / heightInModelUnits`; every boundary edge has a side quad (closed shell: each edge used twice); coverage 0.03 and 0.97 are flagged by `maskCoverage`.
- [ ] Run → FAIL; implement; run → PASS; commit `Build photo relief geometry from mask and depth`.

### Task 3: GLB export

**Files:** Add `site/assets/vendor/three-r128-GLTFExporter.js` (+ `.SOURCE.txt`, from npm `three@0.128.0/examples/js/exporters/GLTFExporter.js`); Create `site/js/photo-relief-export.js`; Test `site/tests/photo-relief.test.mjs`

**Produces:** `exportReliefGLB(THREE, geometryArrays, textureCanvas, {maxBytes=10*1024*1024}) → Promise<Blob>`; rebuilds at `cells/2` and texture `1024` when over `maxBytes`.

- [ ] Ask the user before downloading the exporter file (same as the GLTFLoader precedent).
- [ ] Test: exported blob starts with `glTF`, version 2, no `extensionsRequired`; an oversize result triggers one smaller rebuild.
- [ ] Implement, run, commit `Export photo relief as GLB`.

### Task 4: AI pipeline

**Files:** Create `site/js/photo-relief-ai.js`

**Produces:** `makeRelief(file, {strength, maxDepthCm, onProgress}) → Promise<{blob, previewArrays, coverage}>`; stages `prepare|background|depth|build`; skips background when the PNG already has alpha; WebGPU then WASM; throws `ReliefError(code)` with codes `download|memory|coverage`.

- [ ] Pin `@huggingface/transformers` to an exact version ≥2 weeks old from jsDelivr; models per Global Constraints.
- [ ] Unit-test only the alpha-detection and coverage branching with stubbed pipelines.
- [ ] Commit `Run background removal and depth estimation in the browser`.

### Task 5: Studio and admin UI

**Files:** Modify `site/js/artist-studio.js`, `site/js/admin-virtual.js`, `site/assets/*` (studio/admin CSS); Test `site/tests/admin-english.test.mjs` area unaffected; browser check

**Consumes:** Task 1 `objectSpots(room,{photo})`, Task 4 `makeRelief`, existing `uploadModel`.

- [ ] Method choice "GLB 파일 올리기 / 사진으로 입체 만들기"; button "이 사진으로 입체 만들기" (disabled without a cover photo); stage progress; Three.js preview ±30° sway; 입체감 slider; 저장 → `uploadModel(blob)` then `model={path,name,source:'photo'}`; 다시 만들기; photo guide text; first-download notice (≈70MB, Wi-Fi).
- [ ] Switching to photo clears a center spot and shows only corner spots; cover photo change shows "새 사진으로 다시 만들 수 있습니다".
- [ ] Commit `Add photo-to-relief controls to studio and admin`.

### Task 6: Dark museum lighting

**Files:** Modify `site/js/virtual-room.js`, `site/js/virtual-environment.js`, `site/js/virtual-objects.js`, settings forms in `artist-studio.js` and `admin-virtual.js`, `site/js/i18n-dict.js` if a viewer label is added

- [ ] Settings: picking `museum` the first time fills `MUSEUM_DEFAULTS`; later edits stay.
- [ ] Render: ambient/hemisphere very low; luminous ceiling off; narrow warm (≈3000K, `0xffd9a8`) spot per wall work; per-object overhead spot + light-cone sprite + floor light-pool (radial gradient plane); no shadow maps.
- [ ] Test `environmentOptions` returns `museum` and forces `ceiling:'plain'`.
- [ ] Commit `Add dark museum lighting`.

### Task 7: Verify and ship

- [ ] Browser: user's 권광훈 photo (`/Users/jaewookim/.claude/uploads/de0728d1-925f-4bbb-8b50-65d553f9a152/9af4a5c8-image.jpg`) → relief → corner spot in a museum-lit room, front and ±45° views; phone width frame rate; GLB upload path still works.
- [ ] `npm run check`, `npm test`, emulator, `npm run build`.
- [ ] Deploy rules (`npx -y firebase-tools@13.29.1 deploy --only firestore:rules --project unframe-main --non-interactive` from `site/`), push, PR; merge only on the user's go-ahead.
