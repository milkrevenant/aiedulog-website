# EC2에서 RDS 마이그레이션 실행 가이드

## 🎯 왜 EC2에서 실행해야 하나요?

**문제**: RDS가 VPC 내부에만 있어서 로컬 Mac에서 직접 접근 불가
**해결**: EC2 인스턴스는 RDS와 같은 VPC 안에 있어서 접근 가능!

---

## 📋 준비된 정보

- **EC2 IP**: `3.39.239.83`
- **EC2 인스턴스 ID**: `i-0552c33a0ade674ff`
- **EC2 키 파일**: `/Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem`
- **RDS 엔드포인트**: `aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com`
- **RDS 사용자**: `app_user`
- **RDS 비밀번호**: `u26QF5]8Q7!oO>h?aU<RqQ|YNabP`

---

## 🚀 단계별 실행 방법

### Step 1: EC2에 SSH 접속

```bash
# 키 파일 권한 설정 (한 번만 필요)
chmod 400 /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem

# EC2 접속
ssh -i /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem ec2-user@3.39.239.83
```

---

### Step 2: EC2에 필요한 도구 설치 (EC2 내부에서 실행)

```bash
# PostgreSQL 클라이언트 설치
sudo yum install -y postgresql15

# 연결 테스트
psql -h aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com \
     -U app_user \
     -d postgres \
     -c "SELECT version();"
# 비밀번호 입력: u26QF5]8Q7!oO>h?aU<RqQ|YNabP
```

---

### Step 3: 마이그레이션 파일 EC2로 전송 (로컬 Mac에서 실행)

```bash
# migrations 폴더 전체를 EC2로 전송
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog

scp -i /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem \
    -r migrations/ \
    ec2-user@3.39.239.83:~/

# .env.migration 파일도 전송
scp -i /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem \
    .env.migration \
    ec2-user@3.39.239.83:~/migrations/
```

---

### Step 4: EC2에서 마이그레이션 실행 (EC2 내부에서 실행)

```bash
# EC2 접속 상태에서
cd ~/migrations

# aiedulog 데이터베이스 생성
PGPASSWORD='u26QF5]8Q7!oO>h?aU<RqQ|YNabP' \
psql -h aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com \
     -U app_user \
     -d postgres \
     -c "CREATE DATABASE aiedulog;"

# 마이그레이션 실행 (하나씩)
export RDS_HOST=aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com
export RDS_USERNAME=app_user
export RDS_DATABASE=aiedulog
export PGPASSWORD='u26QF5]8Q7!oO>h?aU<RqQ|YNabP'

psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 001_jwt_extraction_function.sql
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 002_core_tables.sql
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 003_permission_cache.sql
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 004_enable_rls.sql
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 005_unified_rls_policies.sql
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f 006_rls_performance_indexes.sql
```

---

### Step 5: 검증 (EC2 내부에서 실행)

```bash
# 테이블 확인
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "\dt"

# RLS 정책 확인
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename;"
```

---

## 🔥 한 번에 실행하는 방법 (쉬운 버전)

로컬 Mac에서 이 명령어를 복사해서 실행하세요:

```bash
# 1. 마이그레이션 파일 전송
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog && \
scp -i /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem \
    -r migrations/ \
    ec2-user@3.39.239.83:~/

# 2. EC2 접속
ssh -i /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem ec2-user@3.39.239.83
```

EC2 안에서 이것만 실행하세요:

```bash
# PostgreSQL 클라이언트 설치 (이미 설치되어 있을 수 있음)
sudo yum install -y postgresql15

# 환경변수 설정
export RDS_HOST=aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com
export RDS_USERNAME=app_user
export RDS_DATABASE=aiedulog
export PGPASSWORD='u26QF5]8Q7!oO>h?aU<RqQ|YNabP'

# aiedulog 데이터베이스 생성
psql -h $RDS_HOST -U $RDS_USERNAME -d postgres -c "CREATE DATABASE aiedulog;" || echo "Database already exists"

# 마이그레이션 실행
cd ~/migrations
for file in 00*.sql; do
  echo "Running $file..."
  psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f $file
  if [ $? -eq 0 ]; then
    echo "✓ $file completed"
  else
    echo "✗ $file failed"
    exit 1
  fi
done

echo "✓ All migrations completed!"
```

---

## ❓ 문제 해결

### "Permission denied" 에러
```bash
chmod 400 /Users/stillclie_mac/Documents/ug/aiedulog-ec2-instance-stillalice.pem
```

### "Connection timeout" 에러
- EC2와 RDS가 같은 VPC에 있는지 확인
- RDS 보안 그룹에서 EC2 보안 그룹 허용 확인

### "Database already exists" 에러
- 괜찮습니다! 다음 단계로 진행하세요

---

## 📝 완료 후 확인사항

EC2에서 이 명령어로 확인:

```bash
psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE << EOF
-- 테이블 개수
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';

-- RLS 정책 개수
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname='public';

-- 함수 확인
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%user%';
EOF
```

예상 결과:
- 테이블: 12개
- RLS 정책: 23개
- 함수: get_current_user_id, is_user_admin, is_user_moderator 등

---

**완료되면 다음 단계**: Phase 3 데이터 마이그레이션
