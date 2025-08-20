# 데이터베이스 설정 가이드

## 🚀 빠른 시작

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 API 키 복사

### 2. 데이터베이스 초기화
1. Supabase Dashboard > SQL Editor 열기
2. `src/lib/database_init.sql` 파일 내용 전체 복사
3. SQL Editor에 붙여넣고 실행

### 3. 환경 변수 설정
`.env.local` 파일 생성:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
```

### 4. Auth 설정
Supabase Dashboard > Authentication > Settings:
- Email Auth 활성화
- Email 템플릿 커스터마이징 (선택)
- 리디렉션 URL 설정: `http://localhost:3000/auth/callback`

### 5. 개발 서버 실행
```bash
npm install
npm run dev
```

## 📊 테이블 구조

### 핵심 테이블
- **profiles**: 사용자 프로필 정보
- **lectures**: 강의 정보
- **enrollments**: 수강 신청
- **posts**: 게시글
- **comments**: 댓글
- **notifications**: 알림

### RLS (Row Level Security)
모든 테이블에 적절한 보안 정책이 적용되어 있습니다.

## 🔧 트러블슈팅

### 로그인 문제
- Email 인증이 활성화되어 있는지 확인
- 환경 변수가 올바르게 설정되었는지 확인

### 프로필 생성 문제
- `handle_new_user` 트리거가 정상 작동하는지 확인
- auth.users와 profiles 테이블 연결 확인

## 📝 추가 설정 (선택)

### Storage 버킷
- avatars: 프로필 이미지
- lecture-thumbnails: 강의 썸네일
- lecture-materials: 강의 자료

### 보안 권장사항
1. Production 환경에서는 RLS 정책 재검토
2. API 키 노출 방지
3. Rate limiting 설정