-- Create training_materials table
create table if not exists public.training_materials (
  id uuid not null default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  type text check (type in ('canva', 'google_slides', 'pptx', 'pdf', 'video', 'link')),
  embed_code text,
  file_url text,
  thumbnail_url text,
  tags text[] default '{}',
  category text check (category in ('elementary', 'middle', 'high', 'etc')) default 'etc',
  training_date date not null,
  instructor text,
  created_at timestamp with time zone not null default now(),
  constraint training_materials_pkey primary key (id)
);

-- Enable RLS
alter table public.training_materials enable row level security;

-- Create policies
create policy "Enable read access for all users"
on public.training_materials
for select
using (true);

create policy "Enable insert for authenticated users only"
on public.training_materials
for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on public.training_materials
for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.training_materials
for delete
using (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO public.training_materials (title, subtitle, description, type, file_url, tags, category, training_date, instructor)
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
    ),
  (
    '2025년 하반기: CLI 활용 자동채점',
    'Command Line Interface 기반 평가 시스템',
    'CLI 도구를 활용하여 프로그래밍 과제를 자동으로 채점하고 피드백을 제공하는 시스템을 구축하는 방법을 배웁니다.',
    'link',
    'https://example.com/cli-grading',
    ARRAY['DevOps', 'Automation', 'Education'],
    'high',
    '2025-11-15',
    '김철수'
  ),
  (
    '에듀테크 연구회 활동 가이드',
    '신규 회원을 위한 온보딩 자료',
    '연구회의 비전, 미션, 그리고 연간 활동 계획에 대한 상세한 안내를 담고 있습니다.',
    'link',
    'https://example.com/guide',
    ARRAY['Onboarding', 'Guide'],
    'etc',
    '2025-03-01',
    '운영진'
  );
