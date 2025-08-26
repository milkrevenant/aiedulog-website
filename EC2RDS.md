# 🚀 AWS EC2 + RDS PostgreSQL 마이그레이션 가이드

## 📅 생성일: 2025-08-26
## 👤 계정: stillalice_njgs (5167-2554-2518)
## 🌏 리전: 아시아 태평양 (서울) ap-northeast-2

---

## 🖥️ EC2 인스턴스 정보

### 인스턴스 상세
- **인스턴스 ID**: `i-02b0aedc6bf6c0bda`
- **AMI**: Ubuntu Server 22.04 LTS
- **인스턴스 유형**: t3.micro (프리티어)
- **VPC ID**: `vpc-0adcf98e775aaf9ee`
- **스토리지**: 30GB gp3 SSD
- **키 페어**: `aiedulog_instance.pem`

### 보안 그룹 설정
| 유형 | 프로토콜 | 포트 | 소스 | 설명 |
|------|----------|------|------|------|
| SSH | TCP | 22 | 내 IP | Admin SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |
| Custom TCP | TCP | 3000 | 내 IP | Node.js dev (임시) |

---

## 🗄️ RDS PostgreSQL 설정

### 데이터베이스 정보
- **엔진**: PostgreSQL 15.4
- **템플릿**: 프리티어
- **인스턴스 클래스**: db.t3.micro
- **식별자**: `aiedulog-database`
- **마스터 사용자**: `postgres`
- **초기 DB 이름**: `aiedulog`
- **스토리지**: 20GB gp2
- **백업**: 7일 자동 백업
- **암호화**: 활성화

### 연결 설정
- **EC2 연결**: i-02b0aedc6bf6c0bda
- **퍼블릭 액세스**: 아니요
- **포트**: 5432
- **VPC**: vpc-0adcf98e775aaf9ee (기본값)

---

## 🛠️ EC2 초기 설정 스크립트

```bash
#!/bin/bash
# SSH 접속
ssh -i ~/.ssh/aws/aiedulog_instance.pem ubuntu@[EC2-퍼블릭-IP]

# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Nginx 설치
sudo apt install -y nginx

# 4. PM2 설치
sudo npm install -g pm2

# 5. Git 설치
sudo apt install -y git

# 6. Redis 설치 (로컬 캐싱)
sudo apt install -y redis-server
sudo systemctl enable redis-server

# 7. PostgreSQL 클라이언트
sudo apt install -y postgresql-client
```

---

## 📦 앱 배포 스크립트

```bash
# 1. 프로젝트 클론
cd /home/ubuntu
git clone https://github.com/milkrevenant/aiedulog-website.git
cd aiedulog-website/aiedulog

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cat > .env.production << EOF
DATABASE_URL=postgresql://postgres:[PASSWORD]@[RDS-엔드포인트]:5432/aiedulog
NEXT_PUBLIC_SUPABASE_URL=https://[프로젝트].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[키]
REDIS_URL=redis://localhost:6379
NODE_ENV=production
EOF

# 4. 빌드
npm run build

# 5. PM2로 실행
pm2 start npm --name "aiedulog" -- start
pm2 save
pm2 startup
```

---

## ⚙️ Nginx 설정

```nginx
# /etc/nginx/sites-available/aiedulog
server {
    listen 80;
    server_name aiedulog.com www.aiedulog.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/static {
        proxy_cache STATIC;
        proxy_pass http://localhost:3000;
        add_header X-Cache-Status $upstream_cache_status;
    }
}

# 활성화
sudo ln -s /etc/nginx/sites-available/aiedulog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 데이터베이스 마이그레이션

```bash
# 1. Supabase에서 데이터 내보내기
pg_dump --host=db.xxxxx.supabase.co \
        --username=postgres \
        --dbname=postgres \
        --schema=public \
        --no-owner \
        --no-privileges \
        > backup.sql

# 2. RDS로 가져오기
psql --host=[RDS-엔드포인트] \
     --username=postgres \
     --dbname=aiedulog \
     < backup.sql
```

---

## 🔐 SSL 인증서 설정

```bash
# Let's Encrypt 무료 SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aiedulog.com -d www.aiedulog.com
```

---

## 🚀 Redis 캐싱 구현

```javascript
// lib/cache.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

export async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// 사용 예시
const stats = await getCached('stats:dashboard', fetchStats, 3600);
```

---

## 📊 RLS 성능 최적화

```sql
-- 필수 인덱스 생성
CREATE INDEX idx_posts_user_published ON posts(poster_id, is_published);
CREATE INDEX idx_profiles_role ON profiles(role) WHERE role != 'member';
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- 권한 캐시 테이블
CREATE MATERIALIZED VIEW user_permission_cache AS
SELECT 
  user_id,
  bool_or(role = 'admin') as is_admin,
  bool_or(role = 'moderator') as is_moderator,
  array_agg(DISTINCT role) as roles
FROM profiles
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_permission_cache(user_id);
```

---

## 💰 예상 월 비용

| 서비스 | 사양 | 프리티어 | 이후 비용 |
|--------|------|----------|-----------|
| EC2 | t3.micro | 750시간 무료 | $8.5/월 |
| RDS | db.t3.micro | 750시간 무료 | $15/월 |
| EBS | 30GB | 30GB 무료 | $3/월 |
| 데이터 전송 | 100GB | 15GB 무료 | $9/월 |
| **총합** | | **$0** | **약 $35.5/월** |

---

## 📝 체크리스트

### EC2 설정
- [x] EC2 인스턴스 생성 (t3.micro)
- [x] 보안 그룹 설정
- [x] 키 페어 생성 및 저장
- [ ] Elastic IP 할당
- [ ] EC2 소프트웨어 설치

### RDS 설정
- [ ] RDS PostgreSQL 생성
- [ ] EC2와 연결 설정
- [ ] 보안 그룹 자동 구성
- [ ] 엔드포인트 확인

### 애플리케이션 배포
- [ ] 코드 배포
- [ ] 환경변수 설정
- [ ] PM2 설정
- [ ] Nginx 리버스 프록시 설정

### 데이터 마이그레이션
- [ ] Supabase 백업
- [ ] RDS로 복원
- [ ] 연결 테스트

### 최종 설정
- [ ], 도메인 연결
- [ ] SSL 인증서 설치
- [ ] Redis 캐싱 구현
- [ ] 모니터링 설정

---

## 🔗 유용한 링크

- [AWS Console](https://ap-northeast-2.console.aws.amazon.com/)
- [EC2 대시보드](https://ap-northeast-2.console.aws.amazon.com/ec2/)
- [RDS 대시보드](https://ap-northeast-2.console.aws.amazon.com/rds/)
- [GitHub Repository](https://github.com/milkrevenant/aiedulog-website)

---

## 📞 문제 해결

### EC2 접속 안될 때
```bash
# 권한 확인
chmod 400 ~/.ssh/aws/aiedulog_instance.pem

# 보안 그룹 확인 (SSH 포트 22가 내 IP에 열려있는지)
```

### RDS 연결 안될 때
```bash
# EC2에서 RDS 연결 테스트
psql --host=[RDS-엔드포인트] --username=postgres --dbname=aiedulog

# 보안 그룹 확인 (5432 포트)
```

### PM2 앱 상태 확인
```bash
pm2 status
pm2 logs aiedulog
pm2 restart aiedulog
```

---

*마지막 업데이트: 2025-08-26*