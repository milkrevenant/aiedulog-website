# 🚀 AIEduLog 개발 가이드라인

## 📋 개발 시작 전 필수 설정

### VSCode Extensions 설치
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **TypeScript Hero**: 자동 import 정리
- **GitLens**: Git 히스토리 관리

### 프로젝트 설정 확인
```bash
# 의존성 설치
npm install

# 빌드 테스트
npm run build

# 개발 서버 시작
npm run dev
```

## ✅ 커밋 전 체크리스트

**매 커밋 전 반드시 확인:**

- [ ] **미사용 import 제거**
  - VSCode: `Cmd+Shift+P` → "Organize Imports"
  - 또는: `npm run lint:fix`

- [ ] **코드 포맷팅**
  - 파일 저장 시 자동 (VSCode 설정됨)
  - 수동: `npm run format`

- [ ] **타입 체크**
  ```bash
  npm run type-check
  ```

- [ ] **린트 검사**
  ```bash
  npm run lint
  ```

- [ ] **빌드 성공 확인**
  ```bash
  npm run build
  ```

## 🎯 코드 작성 규칙

### 1. Import 관리
```typescript
// ❌ 잘못된 예
import { Button, TextField, Box, Container, Stack, Grid, Paper } from '@mui/material'
// 사용하지 않는 컴포넌트까지 모두 import

// ✅ 올바른 예
import { Button, TextField } from '@mui/material'
// 실제 사용하는 것만 import
```

### 2. TypeScript 타입 정의
```typescript
// ❌ 피해야 할 패턴
const handleClick = (e: any) => { }
const data: any = fetchData()

// ✅ 권장 패턴
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { }
interface UserData {
  id: string
  name: string
}
const data: UserData = fetchData()

// ⚠️ 불가피한 경우
const complexData: any = externalLibrary() // TODO: 타입 정의 필요
```

### 3. React Hooks 의존성
```typescript
// ❌ 경고 발생
useEffect(() => {
  fetchData()
}, []) // fetchData가 의존성 배열에 없음

// ✅ 해결 방법 1: useCallback 사용
const fetchData = useCallback(async () => {
  // ...
}, [dependencies])

useEffect(() => {
  fetchData()
}, [fetchData])

// ✅ 해결 방법 2: 함수를 useEffect 내부로
useEffect(() => {
  const fetchData = async () => {
    // ...
  }
  fetchData()
}, [dependencies])
```

### 4. 컴포넌트 구조
```typescript
// 권장 순서
export default function ComponentName() {
  // 1. State 선언
  const [state, setState] = useState()
  
  // 2. Context/Redux hooks
  const context = useContext()
  
  // 3. Router hooks
  const router = useRouter()
  
  // 4. Effects
  useEffect(() => {}, [])
  
  // 5. Handler 함수
  const handleClick = () => {}
  
  // 6. Render
  return <div>...</div>
}
```

## 📝 파일별 점검 사항

### 새 파일 생성 시
1. 필요한 import만 추가
2. 컴포넌트 export 확인
3. 타입 정의 포함

### 기존 파일 수정 시
1. 수정 전 미사용 코드 제거
2. 수정 후 import 정리
3. console.log 제거

### 복사-붙여넣기 시
1. 불필요한 import 즉시 제거
2. 변수명/함수명 의미있게 변경
3. 주석 업데이트

## 🛠 유용한 명령어

```bash
# 린트 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format

# 타입 체크만
npm run type-check

# 전체 검사 (커밋 전)
npm run pre-commit

# 특정 파일만 린트
npx eslint src/app/main/page.tsx --fix
```

## ⚠️ 주의사항

### 절대 하지 말아야 할 것
- ❌ 전체 파일 일괄 자동 수정 (위험)
- ❌ 테스트 없이 대량 import 제거
- ❌ CSS/설정 파일 import 제거
- ❌ `'use client'` 지시문 제거

### 반드시 해야 할 것
- ✅ 수정 전 브랜치 생성
- ✅ 파일별 단계적 수정
- ✅ 수정 후 빌드 테스트
- ✅ 의미있는 커밋 메시지

## 📊 코드 품질 목표

### 단기 목표 (1주)
- ESLint 경고 50% 감소
- 모든 신규 파일 경고 0개
- TypeScript 에러 0개

### 중기 목표 (1개월)
- ESLint 경고 90% 감소
- any 타입 사용 최소화
- 코드 커버리지 도입

### 장기 목표 (3개월)
- 모든 파일 경고 0개
- TypeScript strict 모드
- 자동화된 CI/CD 파이프라인

## 🔍 문제 해결

### ESLint 경고가 많을 때
```bash
# 파일별로 하나씩 수정
npx eslint src/app/main/page.tsx --fix
npm run build # 테스트
```

### TypeScript 에러 발생 시
```bash
# 상세 에러 확인
npx tsc --noEmit
```

### 빌드 실패 시
```bash
# 클린 빌드
npm run clean
npm install
npm run build
```

## 📚 참고 자료

- [TypeScript 베스트 프랙티스](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Hooks 규칙](https://react.dev/reference/rules/rules-of-hooks)
- [ESLint 규칙](https://eslint.org/docs/latest/rules/)
- [Prettier 옵션](https://prettier.io/docs/en/options.html)

---

**마지막 업데이트**: 2025-08-20
**작성자**: Claude Code Assistant