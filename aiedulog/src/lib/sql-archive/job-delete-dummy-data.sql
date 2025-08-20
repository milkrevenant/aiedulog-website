-- Job 카테고리의 모든 더미 데이터 삭제
-- 주의: 이 쿼리는 Job 카테고리의 모든 게시글을 삭제합니다!

-- 먼저 관련 데이터 삭제 (외래키 제약)
DELETE FROM comments 
WHERE post_id IN (
  SELECT id FROM posts WHERE category = 'job'
);

DELETE FROM post_likes 
WHERE post_id IN (
  SELECT id FROM posts WHERE category = 'job'
);

DELETE FROM bookmarks 
WHERE post_id IN (
  SELECT id FROM posts WHERE category = 'job'
);

-- Job 카테고리 게시글 삭제
DELETE FROM posts 
WHERE category = 'job';

-- 삭제 결과 확인
SELECT 
  'Deleted Job posts' as action,
  COUNT(*) as remaining_count 
FROM posts 
WHERE category = 'job';