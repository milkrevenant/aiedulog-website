# 🚀 Aiedulog 배포 가이드

## 📋 개요
이제 개발 중에는 Docker를 사용하여 로컬에서 테스트하고, 준비가 완료되면 수동으로 AWS Amplify에 배포할 수 있습니다.

## 🛠️ 설정 완료 사항

### 1. Docker 설정
- `Dockerfile`: Next.js 프로덕션 빌드용
- `docker-compose.yml`: 앱과 PostgreSQL 데이터베이스 포함
- `.dockerignore`: 불필요한 파일 제외

### 2. GitHub Actions
- `.github/workflows/manual-deploy.yml`: 수동 배포 워크플로우
- 자동 배포 비활성화 (커밋마다 배포되지 않음)

### 3. 배포 스크립트
- `deploy.sh`: 통합 배포 스크립트

## 🔧 사용 방법

### 로컬 Docker 테스트
```bash
# 배포 스크립트 실행
./deploy.sh

# 옵션 1 선택 (로컬 테스트)
# Docker 컨테이너가 자동으로 빌드되고 실행됨
# http://localhost:3000 에서 확인 가능
```

### 수동으로 Docker 실행
```bash
# Docker 빌드 및 실행
docker-compose build app
docker-compose up app

# 중지
docker-compose down
```

### 프로덕션 배포
```bash
# 1. 배포 스크립트 실행
./deploy.sh

# 2. 옵션 2 선택 (프로덕션 배포)
# 자동으로 테스트 및 빌드 진행

# 3. GitHub에 푸시

# 4. GitHub Actions에서 수동 배포
# - GitHub 레포지토리 → Actions 탭
# - "Manual Deploy to AWS Amplify" 워크플로우 선택
# - "Run workflow" 클릭
# - environment: production 선택
# - confirm 입력란에 "deploy" 입력
# - "Run workflow" 버튼 클릭
```

## 📝 환경 변수 설정

### 로컬 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
```

### GitHub Secrets
GitHub 레포지토리 Settings → Secrets and variables → Actions에 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AMPLIFY_APP_ID`

## 🎯 장점
1. **개발 중 사이트 안정성**: 커밋할 때마다 실제 사이트가 업데이트되지 않음
2. **로컬 테스트**: Docker로 프로덕션과 동일한 환경에서 테스트
3. **수동 배포 제어**: 준비가 완료됐을 때만 배포
4. **롤백 가능**: 문제 발생 시 이전 버전으로 쉽게 롤백

## 🔒 보안 주의사항
- `.env.local` 파일은 절대 커밋하지 마세요
- GitHub Secrets는 안전하게 관리하세요
- Docker 이미지를 public registry에 푸시하지 마세요