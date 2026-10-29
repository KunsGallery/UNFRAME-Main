# 링크 대표 이미지(갤러리 입구 장면)와 링크 미리보기 설계

작성일: 2026-10-29 · 상태: 방향 승인, 문서 검토 대기

## 목표

버추얼 갤러리 링크를 매거진 링크박스·카카오톡 등에 붙이면 **그 갤러리의 입구 카메라 장면**이 미리보기 이미지로 뜨게 한다. 전시 상세 링크는 전시 포스터가 뜬다.

## 구성

1. **대표 장면 만들기 (관리자·작가 미리보기)**
   - 미리보기 권한으로 갤러리를 열면 "링크 대표 이미지 만들기" 버튼을 보여준다.
   - 입구 시점(`entryView`)으로 카메라를 맞추고 렌더러 캔버스를 1200×630 JPEG로 잘라 이미지 서버에 올린다: `virtualGalleries/{g}/preview/{uuid}.jpeg`(제출함은 `virtualSubmissions/{s}/preview/…`).
   - 갤러리 설정에 `previewImage:{path}`를 저장한다. 다시 찍기 가능.
2. **링크 미리보기 (Netlify Edge Function)**
   - `/virtual-gallery/:id`, `/en/virtual-gallery/:id`, `/exhibition/:id`, `/en/exhibition/:id` 요청에 대해 Firestore REST로 공개 문서를 읽어 `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card=summary_large_image`를 `<head>`에 넣는다.
   - 이미지: 갤러리는 `previewImage`, 없으면 첫 작품 이미지, 전시는 포스터(`cover`). 이미지 주소는 media Worker 공개 GET(`/media/...`).
   - 비공개·없는 문서는 기본 태그(UNFRAME 공통 이미지)로 둔다. 실패해도 페이지는 그대로 응답한다. 짧게 캐시한다.
3. **공유 카드 연결:** 갤러리 공유 카드의 "대표 작품" 목록 맨 위에 "갤러리 입구 장면"(`previewImage`가 있을 때)을 추가한다.

## 데이터 · 보안

- 갤러리 설정(`virtualGalleries`, 제출함 공간 설정)에 선택 필드 `previewImage:{path}` — 경로 형식 검사.
- Worker: `…/preview/{uuid}.jpeg` 업로드(스태프·해당 작가)와 공개 GET(갤러리 공개 + `previewImage.path` 일치)을 허용한다.

## 범위 밖

자동 촬영(관람객 화면), 장면 편집 도구, 작품별 링크 미리보기.

## 검증

- 단위: 경로 형식, Edge Function의 태그 생성(공개/비공개/없음/영문).
- Worker 테스트: preview 업로드·공개 GET.
- 규칙 에뮬레이터: `previewImage` 허용·거부.
- 실제: 링크를 붙여 미리보기 확인(페이스북 공유 디버거, 카카오 미리보기 초기화).
- 배포 순서: 규칙 → Worker → 머지.
