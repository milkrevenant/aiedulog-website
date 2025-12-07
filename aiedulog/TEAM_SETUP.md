# Team Setup (Local Dev)

이 저장소를 처음 받는 팀원이 따라야 할 최소 설정 가이드입니다. 터미널·에디터(Claude Code, Cursor, Gemini 등) 모두 이 파일만 보면 됩니다.

## 1) 필수 도구
- Docker / Docker Compose
- Node.js 20+ (npm/pnpm/yarn 중 하나)
- psql 클라이언트

## 2) 로컬 환경 변수
- `aiedulog/.env.local`에 로컬 DB 접속 정보가 들어 있습니다. **이 파일은 Git에 올리지 않는 것이 원칙**이며, 값이 없으면 팀에서 공유받아 채우세요.
- 개발용 값(`DB_HOST=localhost`, `PORT=5433`)은 도커 설정과 맞춰야 합니다.

## 3) 로컬 DB (Docker)
작업 폴더: `/Users/stillclie_mac/Documents/ug/aideulog`

```bash
# 깨끗하게 시작 (볼륨 포함 초기화)
docker-compose down -v

# DB 기동 (포트 5433 → 컨테이너 5432)
docker-compose up -d postgres

# 상태 확인
docker-compose ps
```

기본 접속 정보(도커 compose에 정의된 값):
- Host: `localhost`
- Port: `5433`
- DB: `aiedulog_dev`
- User: `.env.local`의 `RDS_USERNAME`
- Password: `.env.local`의 `RDS_PASSWORD`

확장/스키마 확인 예시:
```bash
PGPASSWORD="$RDS_PASSWORD" psql -h localhost -p 5433 -U "$RDS_USERNAME" -d aiedulog_dev -c "select now();"
```

## 4) 마이그레이션
- 도커 첫 기동 시 `aiedulog/migrations`가 자동 실행됩니다.
- 볼륨을 지운 뒤 다시 올리면(위 `down -v`) 001~010 순서로 전체 스키마가 재적용됩니다.
- 수동으로 돌리고 싶다면(호스트에서):
```bash
cd /Users/stillclie_mac/Documents/ug/aideulog
for f in aiedulog/migrations/00*.sql; do
  PGPASSWORD="$RDS_PASSWORD" psql -h localhost -p 5433 -U "$RDS_USERNAME" -d aiedulog_dev -f "$f" || break
done
```

## 5) 앱 실행(Next.js)
```bash
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
# 브라우저: http://127.0.0.1:3001
```

## 6) 권한/비밀 관리 팁
- 로컬 비밀번호는 개발 편의용입니다. 운영/스테이징에서는 SSM Parameter Store나 Secrets Manager에 `SecureString`으로 보관하고 IAM Role에 `ssm:GetParameter`(+`kms:Decrypt`) 최소 권한만 부여하세요.
- `.env.local`은 커밋 금지. 팀원 온보딩 시 `.env.example`를 공유하거나 SSM에서 `aws ssm get-parameter ... --with-decryption`으로 내려받게 합니다.

## 7) 자주 쓰는 명령 모음
```bash
# 컨테이너 로그
docker-compose logs -f postgres

# DB 접속 (패스워드는 환경변수로)
PGPASSWORD="$RDS_PASSWORD" psql -h localhost -p 5433 -U "$RDS_USERNAME" -d aiedulog_dev

# dev 서버 종료 (백그라운드로 띄웠다면)
pkill -f "next dev --hostname 127.0.0.1 --port 3001"
```
