# Firebase 연결 현황

- 프로젝트: unframe-main (기존 프로젝트)
- 웹 앱: 1:1003147136936:web:ae4a2bd6ec1ca8ade7179d (기존 앱)
- Firestore: (default), Standard, asia-northeast3 (서울), 실시간 업데이트 사용 가능
- Firebase MCP 및 CLI: 연결됨. Google CLI 계정 인증 확인.
- Firestore 규칙: 실제 배포 성공 및 서버에서 새 규칙을 조회해 확인.
- Google 로그인: Google 제공자 사용 설정됨. 공개 Firebase 설정 API로 unframe-main.netlify.app 승인 도메인 포함 확인.
- 관리자 승인: staffEmails에 gallerykuns@gmail.com, sylove887@gmail.com 등록. Google 확인 이메일과 활성 승인 문서가 일치해야 관리 가능.
- Firestore 규칙: 이메일 승인 목록 반영 후 문법 검증 및 실제 배포 성공.
- 이미지: Firebase Storage 대신 R2 unframe-media 버킷 사용. Workers 서버 https://unframe-media.gallerykuns.workers.dev 배포 완료.

Firebase SDK 공개 설정은 Netlify FIREBASE_* 환경변수를 사용합니다. 서비스 계정 키는 저장소에 넣지 않습니다. FIREBASE_STORAGE_BUCKET은 더 이상 필수 설정이 아닙니다.

보안 규칙은 프로토타입입니다. 실제 승인/미승인 계정과 공개/임시 저장 전시 및 사진 검증을 마친 후 공개 운영해야 합니다. 기존 규칙은 references/firebase-firestore-before-setup.rules에 보존했습니다.

자세한 이미지 서버 구성은 R2이미지연결.md를 참고합니다.
