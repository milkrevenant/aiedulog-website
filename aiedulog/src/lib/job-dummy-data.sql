-- Job 게시판 더미 데이터 생성
-- 먼저 테스트용 사용자 ID를 가져옵니다 (첫 번째 사용자 사용)
WITH first_user AS (
  SELECT id FROM auth.users LIMIT 1
)

-- Job 카테고리 게시글 삽입
INSERT INTO posts (
  title,
  content,
  category,
  sub_category,
  author_id,
  is_published,
  is_pinned,
  created_at,
  updated_at
) 
SELECT 
  title,
  content,
  'job' as category,
  sub_category,
  (SELECT id FROM first_user) as author_id,
  true as is_published,
  is_pinned,
  created_at,
  NOW() as updated_at
FROM (
  VALUES 
    -- 구인 게시글들
    (
      '[구인] AI 교육 플랫폼 풀스택 개발자 모집',
      E'안녕하세요, AI 교육 스타트업 에듀테크입니다.\n\n저희와 함께 미래 교육을 만들어갈 풀스택 개발자를 모집합니다.\n\n## 주요 업무\n- Next.js 기반 웹 애플리케이션 개발\n- AI API 연동 및 서비스 구현\n- 사용자 대시보드 및 학습 관리 시스템 개발\n\n## 자격 요건\n- React/Next.js 실무 경험 2년 이상\n- TypeScript, Node.js 활용 가능\n- RESTful API 설계 경험\n- Git 협업 경험\n\n## 우대 사항\n- AI/ML 관련 프로젝트 경험\n- 교육 플랫폼 개발 경험\n- AWS/GCP 등 클라우드 서비스 경험\n\n## 근무 조건\n- 정규직 (3개월 수습)\n- 연봉: 4,000만원 ~ 6,000만원 (경력별 협의)\n- 근무지: 강남역 5분 거리\n- 주 5일 근무, 유연근무제\n\n## 복리후생\n- 스톡옵션 제공\n- 교육비 지원\n- 최신 장비 지원\n- 간식 무제한\n\n지원방법: recruit@edutech.ai로 이력서 송부\n마감일: 2024년 12월 31일',
      'hiring',
      false,
      NOW() - INTERVAL '2 days'
    ),
    (
      '[구인] 초등학교 AI 교육 강사 모집 (주 2회)',
      E'서울시 교육청 지정 AI 교육 프로그램 강사를 모집합니다.\n\n## 모집 분야\n- 초등학교 방과후 AI 교육 강사\n- 주 2회 (화, 목) 오후 2시~4시\n\n## 담당 업무\n- 초등학생 대상 AI 기초 교육\n- 블록코딩을 활용한 AI 프로젝트 지도\n- 학생 평가 및 학부모 상담\n\n## 자격 요건\n- AI/SW 관련 전공자 또는 관련 자격증 보유자\n- 교육 경험 우대\n- 아동 교육에 관심과 열정이 있으신 분\n\n## 급여 및 혜택\n- 시급 5만원\n- 교통비 별도 지급\n- 교육 자료 제공\n- 정규직 전환 기회\n\n## 지원 방법\n- 이메일: ai-edu@seoul.kr\n- 제출 서류: 이력서, 자기소개서\n\n많은 지원 부탁드립니다!',
      'hiring',
      true,
      NOW() - INTERVAL '1 day'
    ),
    (
      '[구인] AI 교육 콘텐츠 기획자 채용',
      E'AI 교육의 미래를 함께 만들어갈 콘텐츠 기획자를 찾습니다.\n\n## 회사 소개\nAI EdTech는 K-12 학생들을 위한 AI 교육 플랫폼을 운영하는 에듀테크 스타트업입니다.\n\n## 주요 업무\n- AI 교육 커리큘럼 기획 및 개발\n- 교육 콘텐츠 제작 및 관리\n- 교사 연수 프로그램 기획\n- 교육 효과 분석 및 개선\n\n## 필수 자격\n- 교육 콘텐츠 기획 경력 3년 이상\n- AI/SW 교육에 대한 이해\n- 문서 작성 능력 우수\n\n## 우대 사항\n- 교원 자격증 보유자\n- 영어 가능자\n- AI 관련 자격증 보유자\n\n## 근무 조건\n- 정규직\n- 연봉: 4,500만원 ~ 5,500만원\n- 근무지: 판교 테크노밸리\n\n지원: hr@aiedtech.com',
      'hiring',
      false,
      NOW() - INTERVAL '5 days'
    ),
    
    -- 구직 게시글들
    (
      '[구직] AI 교육 경력 5년, 프리랜서 강사입니다',
      E'안녕하세요. AI 교육 전문 강사입니다.\n\n## 경력 사항\n- 現 프리랜서 AI 교육 강사 (2019~)\n- 前 네이버 커넥트재단 부스트코스 조교\n- 前 코드스테이츠 AI 부트캠프 멘토\n\n## 전문 분야\n- Python 기초부터 심화까지\n- 머신러닝/딥러닝 이론 및 실습\n- 컴퓨터 비전, 자연어 처리\n- 청소년 대상 AI 교육\n\n## 보유 자격\n- 정보처리기사\n- PCAP (Python 자격증)\n- Google TensorFlow Certificate\n\n## 가능한 업무\n- 기업 교육\n- 대학 특강\n- 청소년 캠프\n- 온라인 강의 제작\n\n## 희망 조건\n- 시급 8만원 이상\n- 서울/경기 지역\n- 장기 계약 우대\n\n연락처: ai.teacher@gmail.com\n포트폴리오: https://ai-teacher.notion.site',
      'seeking',
      false,
      NOW() - INTERVAL '3 days'
    ),
    (
      '[구직] 컴공 졸업예정자, AI 교육 분야 취업 희망',
      E'2024년 2월 졸업 예정인 컴퓨터공학과 학생입니다.\n\n## 학력\n- 서울대학교 컴퓨터공학부 4학년 (학점 4.2/4.5)\n\n## 프로젝트 경험\n- 초등학생 대상 AI 교육 앱 개발 (졸업 프로젝트)\n- 교육용 챗봇 서비스 구현\n- 온라인 코딩 교육 플랫폼 백엔드 개발\n\n## 기술 스택\n- Languages: Python, JavaScript, Java\n- Frontend: React, Next.js\n- Backend: Node.js, Django\n- AI/ML: TensorFlow, PyTorch, Scikit-learn\n- Database: PostgreSQL, MongoDB\n\n## 교육 경험\n- 대학교 프로그래밍 튜터 (2년)\n- 고등학생 코딩 캠프 멘토\n- 알고리즘 스터디 리더\n\n## 자격증\n- 정보처리기사 (2023.05)\n- SQLD (2023.09)\n\n## 희망 분야\n- AI 교육 플랫폼 개발\n- 에듀테크 스타트업\n- 교육 콘텐츠 개발\n\n연락처: newgrad2024@snu.ac.kr',
      'seeking',
      false,
      NOW() - INTERVAL '4 days'
    ),
    (
      '[구직] 10년차 수학교사, AI 융합교육 전문가로 전직 희망',
      E'안녕하세요. 중학교 수학교사로 10년간 근무하며 AI 교육을 접목해온 교사입니다.\n\n## 경력\n- 2014~현재: 서울시 중학교 수학교사\n- 2020~현재: 교육청 AI 융합교육 선도교사\n- 2022~현재: 교사 연수 강사\n\n## 주요 활동\n- AI를 활용한 수학 교육 커리큘럼 개발\n- 전국 교사 대상 AI 교육 연수 진행 (20회 이상)\n- AI 교육 관련 논문 2편 게재\n- 교육부 AI 교과서 검토위원\n\n## 보유 역량\n- 교육과정 설계 및 교재 개발\n- Python, R 프로그래밍\n- 데이터 분석 및 시각화\n- LMS 플랫폼 활용\n- 교사 연수 및 강의\n\n## 희망 직무\n- AI 교육 커리큘럼 개발\n- 교육 컨설팅\n- 에듀테크 기업 교육 전문가\n- 교사 연수 프로그램 운영\n\n## 희망 근무 조건\n- 정규직 또는 전문계약직\n- 유연근무 가능한 곳\n- 교육에 대한 철학이 있는 기업\n\n포트폴리오와 이력서는 요청시 제공하겠습니다.\n관심있는 기업의 연락 기다립니다.\n\nEmail: mathteacher.ai@gmail.com',
      'seeking',
      false,
      NOW() - INTERVAL '6 days'
    )
) AS t(title, content, sub_category, is_pinned, created_at);

-- 게시글 조회수 업데이트 (랜덤하게)
UPDATE posts 
SET view_count = floor(random() * 500 + 50)
WHERE category = 'job';

-- 일부 게시글에 좋아요 추가 (첫 번째 사용자가 좋아요)
WITH first_user AS (
  SELECT id FROM auth.users LIMIT 1
),
job_posts AS (
  SELECT id FROM posts WHERE category = 'job' LIMIT 3
)
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT 
  p.id,
  (SELECT id FROM first_user),
  NOW() - INTERVAL '1 day' * floor(random() * 5)
FROM job_posts p;

-- 댓글 몇 개 추가
WITH first_user AS (
  SELECT id FROM auth.users LIMIT 1
),
job_posts AS (
  SELECT id FROM posts WHERE category = 'job' ORDER BY created_at DESC LIMIT 2
)
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT 
  p.id,
  (SELECT id FROM first_user),
  CASE 
    WHEN row_number() OVER () = 1 THEN '좋은 기회네요! 지원해보겠습니다.'
    WHEN row_number() OVER () = 2 THEN '자세한 정보 감사합니다. 메일 드렸습니다.'
    ELSE '관심있습니다. 연락드려도 될까요?'
  END,
  NOW() - INTERVAL '1 hour' * row_number() OVER ()
FROM job_posts p;