-- Run this script in your Supabase SQL Editor to create the profiles table for Team Management.

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and update profiles
DROP POLICY IF EXISTS "Allow authenticated full access to profiles" ON public.profiles;
CREATE POLICY "Allow authenticated full access to profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add new columns to tc_projects
ALTER TABLE public.tc_projects 
ADD COLUMN IF NOT EXISTS version TEXT,
ADD COLUMN IF NOT EXISTS developer TEXT,
ADD COLUMN IF NOT EXISTS vercel_link TEXT,
ADD COLUMN IF NOT EXISTS zip_file_name TEXT,
ADD COLUMN IF NOT EXISTS zip_file_data TEXT,
ADD COLUMN IF NOT EXISTS tester_id TEXT,
ADD COLUMN IF NOT EXISTS tester_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intern_id TEXT,
ADD COLUMN IF NOT EXISTS intern_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS developer_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Add new columns to tc_documents
ALTER TABLE public.tc_documents
ADD COLUMN IF NOT EXISTS project_link TEXT,
ADD COLUMN IF NOT EXISTS developer_assigned TEXT,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Add new columns to tc_activity_logs
ALTER TABLE public.tc_activity_logs
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT;
