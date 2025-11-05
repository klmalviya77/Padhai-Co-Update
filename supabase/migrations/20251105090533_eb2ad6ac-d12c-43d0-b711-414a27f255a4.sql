-- Create referral system tables and functions

-- Add referral_code to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_month DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  points_awarded INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_user_id)
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update referrals"
ON public.referrals
FOR UPDATE
USING (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Function to assign referral code to existing users
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET referral_code = generate_referral_code()
  WHERE referral_code IS NULL;
END;
$$;

-- Assign codes to existing users
SELECT ensure_referral_code();

-- Trigger to assign referral code on profile creation
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION assign_referral_code();

-- Function to check monthly referral limit
CREATE OR REPLACE FUNCTION public.check_referral_limit(_referrer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO current_month_count
  FROM referrals
  WHERE referrer_id = _referrer_id
    AND referral_month = DATE_TRUNC('month', NOW())
    AND status = 'completed';
  
  RETURN current_month_count < 5;
END;
$$;

-- Function to process referral when referred user uploads first note
CREATE OR REPLACE FUNCTION public.process_referral_on_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Check if this is the user's first upload
  IF (SELECT COUNT(*) FROM notes WHERE uploader_id = NEW.uploader_id) = 1 THEN
    -- Check if user was referred
    SELECT * INTO referral_record
    FROM referrals
    WHERE referred_user_id = NEW.uploader_id
      AND status = 'pending';
    
    IF FOUND THEN
      -- Check if referrer hasn't exceeded monthly limit
      IF check_referral_limit(referral_record.referrer_id) THEN
        -- Award points to referrer
        UPDATE profiles
        SET gyan_points = gyan_points + 20
        WHERE id = referral_record.referrer_id;
        
        -- Mark referral as completed
        UPDATE referrals
        SET status = 'completed',
            points_awarded = 20,
            completed_at = NOW()
        WHERE id = referral_record.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to process referral on note upload
CREATE TRIGGER process_referral_trigger
AFTER INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION process_referral_on_upload();

-- Function to get referral stats
CREATE OR REPLACE FUNCTION public.get_referral_stats(_user_id UUID)
RETURNS TABLE(
  total_referrals BIGINT,
  monthly_referrals BIGINT,
  pending_referrals BIGINT,
  total_points_earned BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as total_referrals,
    COUNT(*) FILTER (WHERE status = 'completed' AND referral_month = DATE_TRUNC('month', NOW())) as monthly_referrals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
    COALESCE(SUM(points_awarded), 0) as total_points_earned
  FROM referrals
  WHERE referrer_id = _user_id;
END;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_month ON referrals(referral_month);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);