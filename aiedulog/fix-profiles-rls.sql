-- profiles 테이블 RLS 정책 수정

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. 모든 사용자가 프로필을 볼 수 있음 (공개 프로필)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 2. 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. 자신의 프로필 삭제 가능
CREATE POLICY "Users can delete own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);