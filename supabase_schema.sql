-- ====================================================================
-- BookMind AI / Smart Book Inventory App - Supabase Database Schema
-- ====================================================================
-- Run this SQL in your Supabase Dashboard -> SQL Editor -> New Query
-- ====================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the 'books' table for your main library inventory
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_url TEXT,
    shelf TEXT DEFAULT 'General',
    status TEXT DEFAULT 'Not Read',
    added_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create the 'wishlist' table for books you want to acquire
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_url TEXT,
    target_price NUMERIC(10, 2),
    current_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create the 'profiles' table for reading goals and user preferences
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT DEFAULT 'Book Lover',
    reading_goal INTEGER DEFAULT 24,
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Insert a default profile if none exists
INSERT INTO public.profiles (display_name, reading_goal, theme)
SELECT 'Manish', 30, 'dark'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles);

-- 6. Enable Row Level Security (RLS) and allow public/anon access for the demo app
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to books" ON public.books
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to wishlist" ON public.wishlist
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to profiles" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);
