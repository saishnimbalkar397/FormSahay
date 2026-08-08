-- schema.sql - Supabase Database Schema for FormSahay

-- 1. Schemes Table
CREATE TABLE IF NOT EXISTS schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255) NOT NULL,
    title_mr VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    state VARCHAR(50) DEFAULT 'Maharashtra',
    category VARCHAR(100) NOT NULL,
    estimated_time VARCHAR(50) DEFAULT '3 Mins',
    pdf_template_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    label_en VARCHAR(255) NOT NULL,
    label_hi VARCHAR(255) NOT NULL,
    label_mr VARCHAR(255) NOT NULL,
    prompt_hi TEXT NOT NULL,
    prompt_mr TEXT NOT NULL,
    input_type VARCHAR(30) NOT NULL DEFAULT 'text', -- 'text', 'number', 'select', 'date'
    placeholder VARCHAR(255),
    options_json JSONB, -- Select choices in Marathi/Hindi
    validation_regex VARCHAR(255),
    pdf_page INT DEFAULT 1,
    pdf_x FLOAT NOT NULL,
    pdf_y FLOAT NOT NULL,
    font_size FLOAT DEFAULT 11.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scheme_id, step_order)
);

-- Enable RLS & Read Access
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on schemes" ON schemes FOR SELECT USING (true);
CREATE POLICY "Allow public read on questions" ON questions FOR SELECT USING (true);
