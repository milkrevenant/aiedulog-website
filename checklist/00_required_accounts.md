# AIedulog 개발에 필요한 외부 서비스 계정

## 🔴 필수 계정 (MVP 단계)

### 1. **Vercel 또는 AWS**
- **용도**: 웹사이트 호스팅
- **가입**: https://vercel.com 또는 https://aws.amazon.com
- **무료 티어**: Vercel은 개인 프로젝트 무료, AWS는 12개월 프리티어

### 2. **PostgreSQL 데이터베이스**
- **옵션 1**: Supabase (https://supabase.com) - 무료 500MB
- **옵션 2**: Neon (https://neon.tech) - 무료 3GB
- **옵션 3**: AWS RDS PostgreSQL (유료)
- **추천**: 개발 단계는 Supabase, 프로덕션은 AWS RDS

### 3. **Google OAuth**
- **용도**: 소셜 로그인
- **설정**: Google Cloud Console (https://console.cloud.google.com)
- **필요 정보**: CLIENT_ID, CLIENT_SECRET
- **비용**: 무료

## 🟡 선택 계정 (확장 기능)

### 4. **AWS S3**
- **용도**: 파일 업로드 저장소
- **대안**: Cloudinary (이미지 전용, 무료 25GB)
- **비용**: 사용량 기반 과금

### 5. **Google Calendar API**
- **용도**: 일정 관리 기능
- **설정**: Google Cloud Console에서 활성화
- **비용**: 무료 (할당량 제한 있음)

### 6. **Apple OAuth** (선택)
- **용도**: Apple 로그인
- **요구사항**: Apple Developer 계정 ($99/년)
- **우선순위**: 낮음

## 🟢 모니터링 & 분석 (나중에 추가)

### 7. **Sentry**
- **용도**: 에러 트래킹
- **무료 티어**: 월 5,000 이벤트
- **가입**: https://sentry.io

### 8. **Google Analytics**
- **용도**: 사용자 분석
- **비용**: 무료
- **설정**: https://analytics.google.com

## 📋 계정 생성 순서

1. **즉시 필요**:
   - Supabase 또는 Neon (데이터베이스)
   - Google Cloud Console (OAuth 설정)

2. **개발 중 필요**:
   - Vercel (배포 테스트용)
   - AWS S3 또는 Cloudinary (파일 업로드 구현 시)

3. **프로덕션 전**:
   - AWS (RDS, S3, CloudFront)
   - Sentry
   - Google Analytics

## 💡 팁
- 개발 초기에는 무료 티어로 충분
- AWS는 신용카드 필요하지만 프리티어 내에서는 과금 없음
- Vercel + Supabase 조합으로 완전 무료 MVP 가능