# 🔄 AWS 계정간 무중단 마이그레이션 계획서

## 📋 개요
**목표**: A계정 Amplify + Supabase → B계정 EC2 + RDS + Cognito  
**전략**: 무중단 블루-그린 배포 및 점진적 트래픽 전환  
**예상 기간**: 2-3주 (준비 2주 + 전환 1주)

---

## 🎯 마이그레이션 로드맵

### Phase 1: 준비 단계 (1-2주)
```
Week 1-2: Infrastructure Setup
├── B계정 인프라 구축
├── 데이터 마이그레이션 테스트
├── 도메인 전환 준비
└── 모니터링 시스템 구축
```

### Phase 2: 병렬 운영 (1주)
```
Week 3: Blue-Green Deployment
├── 트래픽 점진적 전환 (10% → 50% → 100%)
├── 실시간 모니터링
├── 성능 비교 분석
└── 롤백 준비 상태 유지
```

### Phase 3: 완전 전환 (1-2일)
```
Final Migration: DNS Cutover
├── Route 53 최종 전환
├── A계정 리소스 정리
├── 모니터링 안정화
└── 문서 업데이트
```

---

## 🏗️ Phase 1: 인프라 준비

### 1.1 B계정 리소스 생성

#### **VPC 및 네트워킹**
```bash
# VPC 생성 (ap-northeast-2)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=aiedulog-vpc}]'

# 서브넷 생성
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24 --availability-zone ap-northeast-2a
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.2.0/24 --availability-zone ap-northeast-2c
```

#### **RDS PostgreSQL**
```bash
# DB 서브넷 그룹 생성
aws rds create-db-subnet-group \
  --db-subnet-group-name aiedulog-subnet-group \
  --db-subnet-group-description "AiEduLog Database Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier aiedulog-production \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name aiedulog \
  --master-username postgres \
  --master-user-password "SecurePassword123!" \
  --db-subnet-group-name aiedulog-subnet-group \
  --vpc-security-group-ids sg-xxxxx \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted \
  --deletion-protection
```

#### **Cognito User Pool**
```bash
# User Pool 생성
aws cognito-idp create-user-pool \
  --pool-name aiedulog-users \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --username-configuration '{
    "CaseSensitive": false
  }' \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "인증 코드: {####}",
    "EmailSubject": "AiEduLog 계정 인증"
  }'

# App Client 생성  
aws cognito-idp create-user-pool-client \
  --user-pool-id ap-northeast-2_xxxxxxxxx \
  --client-name aiedulog-web-client \
  --generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

#### **EC2 + ALB + Auto Scaling**
```bash
# Launch Template 생성
aws ec2 create-launch-template \
  --launch-template-name aiedulog-template \
  --version-description "AiEduLog Production Template" \
  --launch-template-data '{
    "ImageId": "ami-0c76973fbe0ee100c",
    "InstanceType": "t3.medium", 
    "SecurityGroupIds": ["sg-xxxxx"],
    "UserData": "base64-encoded-startup-script"
  }'

# Application Load Balancer
aws elbv2 create-load-balancer \
  --name aiedulog-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application
```

### 1.2 데이터 마이그레이션 준비

#### **Supabase 데이터 백업**
```bash
# 스키마 + 데이터 백업
pg_dump "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  > supabase_full_backup.sql

# 스키마만 백업 (구조 확인용)
pg_dump "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  --schema-only --no-owner --no-privileges \
  > supabase_schema.sql
```

#### **RDS 데이터 복원**
```bash
# 테스트 복원 (개발 환경)
psql -h aiedulog-dev.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres -d aiedulog < supabase_full_backup.sql

# 프로덕션 복원 (최종 전환 시)
psql -h aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres -d aiedulog < supabase_full_backup.sql
```

### 1.3 코드 환경변수 설정

#### **환경변수 매핑**
```bash
# 기존 A계정 (Amplify)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 신규 B계정 (EC2)
APP_DATABASE_URL=postgresql://postgres:SecurePassword123!@aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com:5432/aiedulog
COGNITO_REGION=ap-northeast-2
COGNITO_USER_POOL_ID=ap-northeast-2_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXTAUTH_URL=https://aiedulog.com
NEXTAUTH_SECRET=randomSecretKey123456789
NODE_ENV=production
```

#### **AWS Systems Manager Parameter Store**
```bash
# 환경변수를 안전하게 저장
aws ssm put-parameter --name "/aiedulog/db/url" --value "postgresql://..." --type "SecureString"
aws ssm put-parameter --name "/aiedulog/cognito/client-id" --value "xxxxxxxxx" --type "SecureString"
aws ssm put-parameter --name "/aiedulog/nextauth/secret" --value "randomkey" --type "SecureString"
```

---

## 🔄 Phase 2: 병렬 운영 및 점진적 전환

### 2.1 Route 53 가중치 라우팅 설정

#### **현재 도메인 구조**
```
aiedulog.com → A계정 Amplify (100% 트래픽)
```

#### **전환 과정**
```
Step 1: aiedulog.com → A계정 90% + B계정 10%
Step 2: aiedulog.com → A계정 50% + B계정 50%  
Step 3: aiedulog.com → A계정 0% + B계정 100%
```

#### **Route 53 설정 명령어**
```bash
# A계정 레코드 (기존 - 가중치 90)
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A",
      "SetIdentifier": "amplify-old",
      "Weight": 90,
      "AliasTarget": {
        "DNSName": "d12345abcdef.amplifyapp.com",
        "EvaluateTargetHealth": false,
        "HostedZoneId": "Z2FDTNDATAQYW2"
      }
    }
  }]
}'

# B계정 레코드 (신규 - 가중치 10)  
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT", 
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A",
      "SetIdentifier": "ec2-new",
      "Weight": 10,
      "AliasTarget": {
        "DNSName": "aiedulog-alb-xxxxx.ap-northeast-2.elb.amazonaws.com",
        "EvaluateTargetHealth": true,
        "HostedZoneId": "ZWKZPGTI48KDX"
      }
    }
  }]
}'
```

### 2.2 실시간 모니터링 설정

#### **CloudWatch 대시보드**
```bash
# 메트릭 비교 대시보드 생성
aws cloudwatch put-dashboard --dashboard-name "Migration-Comparison" --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "aiedulog-alb"],
          ["AWS/Amplify", "Requests", "App", "amplify-app-id"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "ap-northeast-2",
        "title": "Traffic Distribution"
      }
    }
  ]
}'
```

#### **알람 설정**
```bash
# 에러율 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-High-Error-Rate" \
  --alarm-description "EC2 환경에서 에러율이 5% 초과 시 알림" \
  --metric-name "HTTPCode_Target_5XX_Count" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 50 \
  --comparison-operator "GreaterThanThreshold"
```

---

## 🚀 Phase 3: 최종 전환

### 3.1 최종 DNS 전환

#### **완전 전환 명령어**
```bash
# A계정 레코드 제거
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "DELETE",
    "ResourceRecordSet": {
      "Name": "aiedulog.com", 
      "Type": "A",
      "SetIdentifier": "amplify-old",
      "Weight": 0,
      "AliasTarget": {
        "DNSName": "d12345abcdef.amplifyapp.com",
        "EvaluateTargetHealth": false,
        "HostedZoneId": "Z2FDTNDATAQYW2"
      }
    }
  }]
}'

# B계정을 기본 레코드로 설정 (가중치 제거)
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A", 
      "AliasTarget": {
        "DNSName": "aiedulog-alb-xxxxx.ap-northeast-2.elb.amazonaws.com",
        "EvaluateTargetHealth": true,
        "HostedZoneId": "ZWKZPGTI48KDX"
      }
    }
  }]
}'
```

### 3.2 사용자 인증 마이그레이션

#### **사용자 데이터 전환**
```sql
-- Supabase auth.users → Cognito 매핑 테이블
CREATE TABLE user_migration_mapping (
    supabase_user_id UUID PRIMARY KEY,
    cognito_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    migrated_at TIMESTAMP DEFAULT NOW(),
    migration_status VARCHAR(50) DEFAULT 'pending'
);

-- 기존 사용자에게 재가입 알림 발송
INSERT INTO notifications (user_id, type, title, message)
SELECT id, 'system', '시스템 업그레이드 안내', 
       '보안 강화를 위해 다시 로그인해 주세요.' 
FROM auth.users WHERE email IS NOT NULL;
```

---

## ⚠️ 리스크 관리 및 롤백 계획

### 🔙 롤백 시나리오

#### **즉시 롤백 (Route 53)**
```bash
# 긴급 시 A계정으로 모든 트래픽 복귀
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A",
      "SetIdentifier": "amplify-emergency",
      "Weight": 100,
      "AliasTarget": {
        "DNSName": "d12345abcdef.amplifyapp.com",
        "EvaluateTargetHealth": false, 
        "HostedZoneId": "Z2FDTNDATAQYW2"
      }
    }
  }]
}'
```

#### **데이터 동기화 롤백**
```bash
# RDS → Supabase 역방향 동기화
pg_dump -h aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres aiedulog > emergency_rds_backup.sql

psql "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  < emergency_rds_backup.sql
```

### 🚨 장애 대응

#### **모니터링 체크리스트**
- [ ] HTTP 응답 시간 < 2초
- [ ] 에러율 < 1%
- [ ] 데이터베이스 연결 정상
- [ ] Cognito 로그인 성공률 > 95%
- [ ] SSL 인증서 정상
- [ ] CDN 캐시 히트율 > 80%

#### **장애 발생 시 대응 절차**
1. **즉시 대응** (0-5분)
   - Route 53으로 트래픽 롤백
   - 사용자 공지사항 게시
   
2. **원인 분석** (5-30분)
   - CloudWatch 로그 확인
   - RDS 연결 상태 점검
   - Cognito 서비스 상태 확인
   
3. **복구 작업** (30분-2시간)
   - 문제 해결 후 점진적 재전환
   - 모니터링 강화

---

## 📊 성능 최적화

### 🎯 목표 성능 지표
- **응답 시간**: < 1.5초 (현재 Amplify 수준 유지)
- **가용성**: 99.9% 이상
- **에러율**: < 0.5%
- **동시 사용자**: 1,000명 처리 가능

### 🛠️ 최적화 방안

#### **CDN 설정 (CloudFront)**
```bash
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "aiedulog-cdn-'.$(date +%s)'",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "ALB-Origin",
        "DomainName": "aiedulog-alb-xxxxx.ap-northeast-2.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "ALB-Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  "Enabled": true
}'
```

#### **Auto Scaling 설정**
```bash
# Auto Scaling Group 생성
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name aiedulog-asg \
  --launch-template "LaunchTemplateName=aiedulog-template,Version=1" \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:ap-northeast-2:account:targetgroup/aiedulog-tg/xxxxx \
  --health-check-type ELB \
  --health-check-grace-period 300
```

---

## 💰 비용 분석

### 현재 비용 (A계정)
- **Amplify Hosting**: ~$15/월
- **Supabase Pro**: ~$25/월
- **Route 53**: ~$1/월
- **총합**: ~$41/월

### 예상 비용 (B계정)
- **EC2 (t3.medium × 2)**: ~$60/월  
- **RDS (db.t3.micro)**: ~$15/월
- **ALB**: ~$20/월
- **Cognito**: ~$0-5/월 (사용량에 따라)
- **CloudFront**: ~$5/월
- **Route 53**: ~$1/월
- **총합**: ~$106/월

**비용 증가**: +$65/월 (+158%)

### 💡 비용 최적화 방안
1. **Spot Instances 활용**: EC2 비용 50% 절약
2. **Reserved Instances**: 1년 약정 시 30% 할인  
3. **RDS 최적화**: db.t3.micro → db.t4g.micro (ARM 기반)
4. **CloudFront 캐싱**: ALB 부하 감소로 인스턴스 수 최적화

---

## 📅 실행 일정

### Week 1-2: Infrastructure Setup
- [ ] **Day 1-2**: B계정 VPC, Subnet, Security Groups 생성
- [ ] **Day 3-4**: RDS PostgreSQL 인스턴스 생성 및 설정
- [ ] **Day 5-6**: Cognito User Pool 설정
- [ ] **Day 7-8**: EC2 Launch Template 및 Auto Scaling 구성
- [ ] **Day 9-10**: ALB 및 Target Group 설정
- [ ] **Day 11-12**: CloudFront CDN 구성
- [ ] **Day 13-14**: 데이터 마이그레이션 테스트

### Week 3: Migration Execution  
- [ ] **Day 15**: 최종 데이터 백업 및 RDS 복원
- [ ] **Day 16**: Route 53 가중치 라우팅 10% 트래픽 전환
- [ ] **Day 17**: 모니터링 및 성능 검증
- [ ] **Day 18**: 50% 트래픽 전환
- [ ] **Day 19**: 모니터링 및 안정성 확인
- [ ] **Day 20**: 100% 트래픽 전환
- [ ] **Day 21**: 최종 검증 및 A계정 리소스 정리

---

## 🔧 운영 가이드

### 일일 점검 사항
```bash
#!/bin/bash
# 일일 헬스체크 스크립트

echo "=== AiEduLog Health Check $(date) ==="

# 웹사이트 응답 확인
curl -s -o /dev/null -w "Website Response: %{http_code} (Time: %{time_total}s)\n" https://aiedulog.com

# RDS 연결 확인  
pg_isready -h aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com -p 5432 -U postgres

# EC2 인스턴스 상태 확인
aws ec2 describe-instances --filters "Name=tag:Name,Values=aiedulog-*" \
  --query 'Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]' \
  --output table

# ALB Target Health 확인
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-2:account:targetgroup/aiedulog-tg/xxxxx
```

### 주간 백업 스크립트
```bash
#!/bin/bash
# 주간 RDS 백업

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BUCKET_NAME="aiedulog-backups"

# RDS 스냅샷 생성
aws rds create-db-snapshot \
  --db-instance-identifier aiedulog-production \
  --db-snapshot-identifier "aiedulog-weekly-backup-${BACKUP_DATE}"

# 데이터 덤프 및 S3 업로드
pg_dump -h aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres aiedulog | gzip > "backup_${BACKUP_DATE}.sql.gz"

aws s3 cp "backup_${BACKUP_DATE}.sql.gz" "s3://${BUCKET_NAME}/weekly/"

# 30일 이상 오래된 백업 삭제
aws s3 ls "s3://${BUCKET_NAME}/weekly/" | awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'" {print $4}' | xargs -I {} aws s3 rm "s3://${BUCKET_NAME}/weekly/{}"
```

---

## 📞 긴급 연락처 및 문서

### 🚨 긴급 상황 대응
- **개발자**: [연락처]
- **AWS 지원**: AWS Support (Business Plan)
- **도메인 관리**: Route 53 Console
- **모니터링**: CloudWatch Alarms

### 📚 참고 문서
- [AWS EC2 사용자 가이드](https://docs.aws.amazon.com/ec2/)
- [RDS PostgreSQL 설정 가이드](https://docs.aws.amazon.com/rds/latest/userguide/)  
- [Cognito 개발자 가이드](https://docs.aws.amazon.com/cognito/)
- [Route 53 DNS 라우팅](https://docs.aws.amazon.com/route53/)

---

## ✅ 체크리스트

### 마이그레이션 준비
- [ ] B계정 AWS 계정 활성화 및 결제 정보 등록
- [ ] IAM 사용자 및 역할 생성
- [ ] VPC 및 네트워크 인프라 구축  
- [ ] RDS PostgreSQL 인스턴스 생성
- [ ] Cognito User Pool 설정
- [ ] EC2 및 Auto Scaling 구성
- [ ] 모니터링 및 알람 설정

### 데이터 마이그레이션
- [ ] Supabase 전체 데이터 백업
- [ ] RDS 테스트 환경에서 복원 테스트
- [ ] 사용자 데이터 검증 스크립트 작성
- [ ] 프로덕션 데이터 최종 마이그레이션

### DNS 및 도메인
- [ ] Route 53 호스팅 영역 확인
- [ ] 가중치 라우팅 레코드 생성
- [ ] SSL 인증서 발급 (ACM)
- [ ] CDN 설정 및 캐시 정책 구성

### 코드 배포
- [ ] 환경변수 Parameter Store 등록
- [ ] Docker 이미지 빌드 및 ECR 푸시
- [ ] EC2 인스턴스에 애플리케이션 배포
- [ ] 헬스체크 엔드포인트 확인

### 테스트 및 검증
- [ ] 기능 테스트 (로그인, 게시글 작성 등)
- [ ] 성능 테스트 (부하 테스트)
- [ ] 보안 테스트 (인증/권한)
- [ ] 모니터링 대시보드 확인

### 최종 전환
- [ ] 사용자 공지사항 게시
- [ ] DNS 트래픽 점진적 전환
- [ ] 실시간 모니터링 및 대응
- [ ] A계정 리소스 정리
- [ ] 문서 업데이트 및 인수인계

---

**📝 작성일**: $(date +%Y-%m-%d)  
**👤 작성자**: Claude Code Assistant  
**🔄 버전**: v1.0  
**📧 문의**: 개발팀 내부 문서