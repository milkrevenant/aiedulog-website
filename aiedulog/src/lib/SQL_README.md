# SQL 파일 가이드

## 📌 최근 추가된 SQL 파일

### 2025-08-17 저녁
- **chat-system.sql** - 채팅 시스템 전체 설치 (테이블, 트리거, 함수, RLS)

## 채팅 시스템 SQL 파일

### chat-system.sql
- **용도**: 채팅 시스템 전체 초기 설치
- **사용 시점**: 채팅 기능을 처음 설치할 때
- **포함 내용**:
  - chat_rooms 테이블 (채팅방)
  - chat_participants 테이블 (참가자)
  - chat_messages 테이블 (메시지)
  - message_read_status 테이블 (읽음 상태)
  - create_or_get_direct_chat 함수 (DM 생성)
  - 자동 알림 트리거
  - RLS 정책
- **주의**: Supabase Storage에 'chat-files' 버킷 별도 생성 필요

## 알림 시스템 SQL 파일들

### 1. notifications-table.sql
- **용도**: 알림 시스템 전체 초기 설치
- **사용 시점**: 알림 시스템을 처음 설치할 때
- **주의**: 이미 일부가 설치된 경우 오류 발생 가능

### 2. notifications-check.sql  
- **용도**: 현재 설치 상태 확인
- **사용 시점**: 어떤 컴포넌트가 설치되었는지 확인할 때
- **체크 항목**:
  - 테이블 존재 여부
  - 인덱스 목록
  - RLS 정책
  - 트리거
  - 함수

### 3. notifications-fix.sql
- **용도**: 누락된 부분만 안전하게 추가
- **사용 시점**: 일부만 설치되었거나 업데이트가 필요할 때
- **특징**: IF NOT EXISTS 사용으로 중복 생성 방지

## 사용 순서

### 새로운 프로젝트의 경우:
1. `notifications-table.sql` 실행

### 기존 프로젝트 업데이트의 경우:
1. `notifications-check.sql` 실행하여 현재 상태 확인
2. `notifications-fix.sql` 실행하여 누락된 부분 추가

## 기타 SQL 파일들

### posts-table.sql
- 게시판 시스템 테이블 및 트리거

### roles-update.sql  
- 권한 시스템 업데이트

### add-image-columns.sql
- 이미지 업로드 관련 컬럼 추가

### add-nickname.sql
- 닉네임 컬럼 추가

### avatars-bucket-setup.sql
- 아바타 저장소 설정