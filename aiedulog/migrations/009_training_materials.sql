-- 009_training_materials.sql
-- 연수 자료 테이블

CREATE TABLE IF NOT EXISTS training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  type TEXT CHECK (type IN ('canva', 'google_slides', 'pptx', 'pdf', 'video', 'link')),
  embed_code TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT CHECK (category IN ('elementary', 'middle', 'high', 'etc')) DEFAULT 'etc',
  training_date DATE NOT NULL,
  instructor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_training_materials_category ON training_materials(category);
CREATE INDEX IF NOT EXISTS idx_training_materials_training_date ON training_materials(training_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_materials_type ON training_materials(type);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_training_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_training_materials_updated_at ON training_materials;
CREATE TRIGGER trigger_training_materials_updated_at
    BEFORE UPDATE ON training_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_training_materials_updated_at();

-- 초기 데이터
INSERT INTO training_materials (title, subtitle, description, type, file_url, tags, category, training_date, instructor)
VALUES
    (
        '금천중학교 연수자료 (2025-08)',
        '곽수창 선생님의 금천중학교 연수 자료',
        '2025년 8월 금천중학교에서 진행된 연수 자료입니다. 에듀테크 도구 활용 실습과 사례 공유를 중심으로 구성되어 있습니다.',
        'canva',
        'https://www.canva.com/design/DAGy6ovsOEo/GD8BXvAEFuApT4T3W6BpOQ/view',
        ARRAY['EdTech', 'Practice', 'Training'],
        'middle',
        '2025-08-20',
        '곽수창'
    ),
    (
        '교장단 연수자료 (2025-11)',
        '곽수창 선생님의 교장단 연수 자료',
        '2025년 11월 교장단 연수에서 발표된 자료입니다. AI 디지털 교과서와 에듀테크 활용 방안에 대한 내용을 담고 있습니다.',
        'canva',
        'https://www.canva.com/design/DAG5AOyhXxw/FlVCpe-DeHUO008Yh6e3xw/view',
        ARRAY['Leadership', 'Future Education', 'Training'],
        'etc',
        '2025-11-28',
        '곽수창'
    ),
    (
        '미래터 연수자료 (2025-10)',
        '곽수창 선생님의 미래터 연수 자료',
        '미래 교육 환경 구축과 AI 활용 수업에 대한 심도 있는 연수 자료입니다.',
        'canva',
        'https://www.canva.com/design/DAGzU4rYR1M/YvsDdAICHDkPY0tm_RXLAQ/view',
        ARRAY['AI', 'Future Education', 'Training'],
        'etc',
        '2025-10-20',
        '곽수창'
    )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE training_materials IS '연수 자료';
COMMENT ON COLUMN training_materials.type IS '자료 유형: canva, google_slides, pptx, pdf, video, link';
COMMENT ON COLUMN training_materials.category IS '대상: elementary, middle, high, etc';
