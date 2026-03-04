-- Migration: Add roles and new features tables

-- 1. Add role to users table
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
-- distinct type for better safety
CREATE TYPE user_role AS ENUM ('user', 'admin');
-- Add it to public.users (which mirrors auth.users ideally, but we'll stick to the existing public.users table if that's where app data lives)
-- NOTE: The existing codebase seems to use public.users. Let's add it there.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Leagues Tables
CREATE TABLE IF NOT EXISTS public.leagues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    prize_pool text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.league_participants (
    league_id uuid REFERENCES public.leagues(id),
    user_id uuid REFERENCES public.users(id),
    starting_balance numeric DEFAULT 100000, -- paper money
    current_pnl numeric DEFAULT 0,
    rank integer,
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (league_id, user_id)
);

-- 3. Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Market Sentiment
CREATE TABLE IF NOT EXISTS public.market_sentiment (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fear_greed_index integer,
    btc_dominance numeric,
    market_status text, -- "Extreme Fear", "Greed", etc.
    recorded_at timestamptz DEFAULT now()
);

-- 5. Policies (Simple examples - refine as needed)
-- Admin can do everything
CREATE POLICY "Admins can do everything" ON public.leagues
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Users can read active leagues
CREATE POLICY "Users can view active leagues" ON public.leagues
  FOR SELECT USING (is_active = true);

-- Users can join leagues
CREATE POLICY "Users can join leagues" ON public.league_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
