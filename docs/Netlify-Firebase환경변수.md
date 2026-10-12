# Netlify Firebase 환경변수

Netlify 프로젝트의 Project configuration → Environment variables에서 다음 값을 등록합니다. 설정값은 Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱 → 웹 앱의 SDK 설정 및 구성에서 확인합니다.

| Netlify key | Firebase 항목 |
|---|---|
| UNFRAME_DATA_MODE | firebase (운영 연결), demo (샘플) |
| FIREBASE_API_KEY | apiKey |
| FIREBASE_AUTH_DOMAIN | authDomain |
| FIREBASE_PROJECT_ID | projectId |
| FIREBASE_STORAGE_BUCKET | storageBucket |
| FIREBASE_MESSAGING_SENDER_ID | messagingSenderId |
| FIREBASE_APP_ID | appId |

값은 따옴표 없이 입력합니다. Builds 범위를 포함하고, 실제 운영 값은 Production 배포 컨텍스트에 적용합니다. Deploy Previews는 demo 또는 별도 테스트 프로젝트를 권장합니다. 변수 변경 후 새 배포를 실행해야 반영됩니다.

빌드 스크립트가 필요한 6개 Firebase 웹 앱 설정만 읽어 배포용 dist/config.js를 생성합니다. 전체 환경변수나 서비스 계정 키를 복사하지 않습니다. Firebase 웹 설정은 방문자 브라우저에서도 볼 수 있는 정상적인 공개 설정이며, 이것을 숨기는 것으로 데이터 보안이 보장되지는 않습니다. 실제 권한은 Firestore/Storage 보안 규칙과 staff 승인으로 제한합니다. 서비스 계정 JSON, private_key, Admin SDK 키는 이 변수들에 넣지 않습니다.

firebase 모드인데 필수 값이 빠져 있으면 빌드를 실패시켜 샘플 사이트로 잘못 배포되지 않게 합니다. 환경변수가 없으면 현재 로컬/배포 샘플 모드를 유지합니다. 로컬 개발 서버는 site/config.js를 사용합니다.

운영 모드로 전환하기 전에:
1. Firebase Authentication의 Google 로그인을 켭니다.
2. Authorized domains에 실제 Netlify 사이트 호스트와 사용할 공식 도메인을 추가합니다.
3. Firestore/Storage 규칙을 배포하고 승인할 계정을 staff 문서로 등록합니다.
4. Storage CORS origin에 실제 배포 사이트 주소를 추가합니다.
5. Netlify에 변수를 입력하고 재배포한 뒤 관리자 로그인/사진 업로드/게시/익명 열람을 확인합니다.

현재 Google 로그인과 Firebase 데이터 접근은 실제 프로젝트에서 검증되지 않았습니다. 환경변수 입력만으로 직원 승인과 보안 규칙 배포가 완료되지는 않습니다.
