-- posts 테이블 구조 확인
SELECT * FROM posts LIMIT 0;

-- 또는 컬럼 목록 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'posts'
ORDER BY 
    ordinal_position;