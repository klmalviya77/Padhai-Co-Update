-- Create table to track daily uploads
CREATE TABLE IF NOT EXISTS public.daily_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, upload_date)
);

-- Enable RLS
ALTER TABLE public.daily_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own upload stats" ON public.daily_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload stats" ON public.daily_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload stats" ON public.daily_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Create table to track voting behavior for spam detection
CREATE TABLE IF NOT EXISTS public.vote_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vote_type TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.vote_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vote activity" ON public.vote_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vote activity" ON public.vote_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check for spam voting (more than 5 votes per minute)
CREATE OR REPLACE FUNCTION public.check_vote_spam(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO vote_count
  FROM public.vote_activity
  WHERE user_id = _user_id
    AND vote_timestamp > NOW() - INTERVAL '1 minute';
  
  RETURN vote_count >= 5;
END;
$$;

-- Function to increment daily upload count
CREATE OR REPLACE FUNCTION public.increment_upload_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update upload count for today
  INSERT INTO public.daily_uploads (user_id, upload_date, upload_count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, upload_date)
  DO UPDATE SET 
    upload_count = daily_uploads.upload_count + 1,
    updated_at = NOW()
  RETURNING upload_count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Function to get today's upload count
CREATE OR REPLACE FUNCTION public.get_upload_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT upload_count
  INTO current_count
  FROM public.daily_uploads
  WHERE user_id = _user_id
    AND upload_date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0);
END;
$$;