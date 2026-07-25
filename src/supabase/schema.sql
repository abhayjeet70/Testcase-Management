-- Supabase Schema for Testcase Management
-- Run this script in your Supabase SQL Editor to create the necessary tables.

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.tc_projects (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    description TEXT,
    id_prefix TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    favorite BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    version TEXT,
    developer TEXT,
    vercel_link TEXT,
    zip_file_name TEXT,
    zip_file_data TEXT
);

-- 2. Modules Table
CREATE TABLE IF NOT EXISTS public.tc_modules (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    module_code TEXT,
    icon TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- 3. Documents Table
CREATE TABLE IF NOT EXISTS public.tc_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    module_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    module_code TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    favorite BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMPTZ
);

-- 4. Test Cases Table
CREATE TABLE IF NOT EXISTS public.tc_test_cases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES public.tc_documents(id) ON DELETE CASCADE,
    test_case_no TEXT,
    name TEXT NOT NULL,
    test_objective TEXT,
    test_steps TEXT,
    issues TEXT,
    status TEXT,
    display_order INTEGER DEFAULT 0,
    tag_ids JSONB DEFAULT '[]'::jsonb,
    screenshots JSONB DEFAULT '[]'::jsonb,
    custom_values JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- 5. Custom Columns Table
CREATE TABLE IF NOT EXISTS public.tc_custom_columns (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb
);

-- 6. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.tc_activity_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    test_case_id TEXT,
    test_case_no TEXT,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);

-- 7. Bugs Table
CREATE TABLE IF NOT EXISTS public.tc_bugs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.tc_projects(id) ON DELETE CASCADE,
    document_id TEXT,
    test_case_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    severity TEXT,
    status TEXT,
    assignee_id TEXT,
    reporter_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Set up Row Level Security (RLS) to allow authenticated users to read/write
-- For an internal team tool, we can allow all authenticated users full access
ALTER TABLE public.tc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_bugs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated full access to projects" ON public.tc_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to modules" ON public.tc_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to documents" ON public.tc_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to test cases" ON public.tc_test_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to custom columns" ON public.tc_custom_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to activity logs" ON public.tc_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to bugs" ON public.tc_bugs FOR ALL TO authenticated USING (true) WITH CHECK (true);
