-- Drop existing tables and related objects if they exist
-- First drop dependent objects
DROP TABLE IF EXISTS lecture_registrations CASCADE;
DROP TABLE IF EXISTS lectures CASCADE;

-- Then drop functions (triggers are automatically dropped with tables)
DROP FUNCTION IF EXISTS update_lecture_participants() CASCADE;
DROP FUNCTION IF EXISTS generate_lecture_slug() CASCADE;

-- Lectures table for course management
CREATE TABLE lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500),
  description TEXT,
  instructor_name VARCHAR(255) NOT NULL,
  instructor_bio TEXT,
  instructor_image VARCHAR(500),
  
  -- Course details
  category VARCHAR(100) NOT NULL, -- 'ai', 'education', 'workshop', 'seminar', etc.
  level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  duration VARCHAR(100), -- e.g., '2 hours', '8 weeks'
  price DECIMAL(10, 2) DEFAULT 0,
  max_participants INTEGER DEFAULT 30,
  current_participants INTEGER DEFAULT 0,
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  schedule_details TEXT, -- e.g., "Every Tuesday and Thursday"
  
  -- Location
  location_type VARCHAR(50) DEFAULT 'offline', -- 'online', 'offline', 'hybrid'
  location_address TEXT,
  location_url VARCHAR(500), -- For online lectures (Zoom, etc.)
  
  -- Media
  thumbnail_image VARCHAR(500),
  banner_image VARCHAR(500),
  materials JSONB, -- Array of {name, url, type}
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'ongoing', 'completed', 'cancelled'
  registration_open BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  
  -- SEO
  slug VARCHAR(255) UNIQUE,
  meta_description TEXT,
  tags TEXT[]
);

-- Lecture registrations table
CREATE TABLE lecture_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Registration details
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'attended'
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  
  -- Payment info (if needed)
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_amount DECIMAL(10, 2),
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  
  -- Additional info
  notes TEXT,
  attendance_confirmed BOOLEAN DEFAULT false,
  certificate_issued BOOLEAN DEFAULT false,
  
  -- Unique constraint to prevent duplicate registrations
  UNIQUE(lecture_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_lectures_status ON lectures(status);
CREATE INDEX idx_lectures_start_date ON lectures(start_date);
CREATE INDEX idx_lectures_category ON lectures(category);
CREATE INDEX idx_lectures_featured ON lectures(featured);
CREATE INDEX idx_lecture_registrations_user ON lecture_registrations(user_id);
CREATE INDEX idx_lecture_registrations_lecture ON lecture_registrations(lecture_id);

-- RLS Policies
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_registrations ENABLE ROW LEVEL SECURITY;

-- Lectures policies
CREATE POLICY "Lectures are viewable by everyone" ON lectures
  FOR SELECT USING (status = 'published' OR auth.uid() = created_by);

CREATE POLICY "Lectures can be inserted by authenticated users" ON lectures
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Lectures can be updated by creator" ON lectures
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Lectures can be deleted by creator" ON lectures
  FOR DELETE USING (auth.uid() = created_by);

-- Lecture registrations policies  
CREATE POLICY "Users can view their own registrations" ON lecture_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register for lectures" ON lecture_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON lecture_registrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to auto-update participant count
CREATE OR REPLACE FUNCTION update_lecture_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE lectures 
    SET current_participants = current_participants + 1
    WHERE id = NEW.lecture_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE lectures 
      SET current_participants = current_participants + 1
      WHERE id = NEW.lecture_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE lectures 
      SET current_participants = current_participants - 1
      WHERE id = NEW.lecture_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE lectures 
    SET current_participants = current_participants - 1
    WHERE id = OLD.lecture_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lecture_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON lecture_registrations
FOR EACH ROW EXECUTE FUNCTION update_lecture_participants();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_lecture_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);
    NEW.slug = NEW.slug || '-' || substring(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_lecture_slug_trigger
BEFORE INSERT OR UPDATE ON lectures
FOR EACH ROW EXECUTE FUNCTION generate_lecture_slug();