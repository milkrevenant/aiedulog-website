# 📍 Google Maps API 설정 가이드

## 🎯 주요 과제
Google Maps API 키를 발급받아 지도 기능을 활성화해야 합니다.

## 📋 설정 단계

### 1. Google Cloud Console 접속
- https://console.cloud.google.com/ 접속
- Google 계정으로 로그인

### 2. 프로젝트 생성
- 새 프로젝트 생성 또는 기존 프로젝트 선택
- 프로젝트명 예시: `aiedulog-website`

### 3. API 활성화
다음 API들을 활성화해야 합니다:
- **Maps JavaScript API** (필수)
- **Geocoding API** (주소 변환용)
- **Places API** (장소 검색용)

### 4. API 키 생성
- 사용자 인증 정보 > API 키 생성
- API 키 제한 설정 (보안):
  - HTTP 리퍼러 제한: `localhost:*` 및 실제 도메인
  - API 제한: 위에서 활성화한 API만 선택

### 5. 환경변수 설정
`.env.local` 파일에 추가:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=발급받은_API_키
```

## 💰 비용 정보
- **무료 한도**: 월 $200 크레딧 (약 28,000회 지도 로드)
- **예상 사용량**: 소규모 교육 커뮤니티는 무료 한도 내 충분
- **비용 알림**: Google Cloud Console에서 예산 알림 설정 권장

## ✅ 현재 구현 상태
- [x] Google Maps 패키지 설치 완료
- [x] MapPicker 컴포넌트 구현 완료
- [x] PostEditor에 연동 완료
- [ ] **API 키 발급 필요** ⚠️
- [ ] 프로덕션 도메인 설정 필요

## 📌 참고사항
- API 키 없이도 주소 직접 입력은 가능
- 지도 기능은 API 키가 있어야만 작동
- 개발 중에는 localhost에서 테스트 가능

## 🔗 관련 파일
- `/src/components/MapPicker.tsx` - 지도 선택 컴포넌트
- `/src/components/PostEditor.tsx` - 위치 입력 연동
- `/.env.local.example` - 환경변수 예시

---
*작성일: 2024-12-18*
*우선순위: 높음*