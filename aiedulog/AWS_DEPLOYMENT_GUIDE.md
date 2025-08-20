# AWS Amplify 배포 가이드

## 📋 배포 준비 완료
- ✅ amplify.yml 설정 파일 생성
- ✅ 환경변수 준비

## 🚀 AWS Console에서 설정하기

### 1. AWS Amplify Console 접속
1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) 접속
2. "New app" → "Host web app" 클릭

### 2. GitHub 연결
1. "GitHub" 선택
2. GitHub 계정 인증
3. Repository 선택: `milkrevenant/aiedulog-website`
4. Branch 선택: `main`

### 3. 빌드 설정
- amplify.yml 파일이 자동으로 감지됨
- 추가 설정 필요 없음

### 4. 환경변수 설정
"Advanced settings" 클릭 후 다음 환경변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://njnrezduzotxfombfanu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_kP6XGr6IqLbKOdsxD4lcCg_nXWQP3_P
SUPABASE_SECRET_KEY=sb_secret_romb0YigKWaNR12lxlELXA_5fzYKy-z
```

### 5. 배포
"Save and deploy" 클릭

## 🌐 커스텀 도메인 연결

배포 완료 후:
1. Amplify Console에서 앱 선택
2. "Domain management" → "Add domain"
3. 도메인 입력
4. DNS 설정 안내 따라하기

## 📝 주의사항
- 첫 배포는 10-15분 소요
- 이후 업데이트는 git push만 하면 자동 배포
- 환경변수 변경 시 재배포 필요

## 🔗 유용한 링크
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [Next.js on Amplify](https://docs.amplify.aws/guides/hosting/nextjs/)