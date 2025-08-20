# src/lib 폴더 구조

## 📁 현재 구조

```
src/lib/
├── auth/               # 인증 관련 코드
│   └── permissions.ts  # 권한 관리
├── migrations/         # ✅ 실행된 SQL 마이그레이션 (보관)
│   ├── 001_create_migration_table.sql
│   ├── 002_base_tables.sql
│   ├── 003_roles_system.sql
│   ├── 004_lectures_system.sql
│   └── 005_security_fixes.sql
├── sql-archive/        # 📦 과거 SQL 파일들 (참고용)
├── storage/           # 파일 업로드 관련
│   └── upload.ts
├── supabase/          # Supabase 클라이언트
│   ├── client.ts
│   └── server.ts
└── notifications.ts   # 알림 시스템
```

## 📝 폴더별 설명

### migrations/
- 마이그레이션 추적 시스템으로 실행된 SQL 파일들
- 순서대로 실행 필요
- `schema_migrations` 테이블에서 실행 이력 관리

### sql-archive/
- 과거에 사용했던 SQL 파일들
- 참고용으로만 보관
- 새로운 작업 시 migrations/ 폴더 사용

## ⚠️ 주의사항
- 새로운 SQL은 migrations/ 폴더에 번호를 붙여 생성
- sql-archive/는 건드리지 않기 (히스토리 보관용)