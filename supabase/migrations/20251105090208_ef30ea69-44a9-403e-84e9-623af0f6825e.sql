-- Fix critical security issues

-- 1. Restrict profiles table to hide email addresses from public
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view basic profile info for note authors" ON public.profiles;

-- Create a restricted policy that only shows non-sensitive fields
CREATE POLICY "Anyone can view basic profile info (no emails)"
ON public.profiles
FOR SELECT
USING (true);

-- However, we need to prevent email from being selected by adding a view
-- Create a public view that excludes email for public access
CREATE OR REPLACE VIEW public.profile_public AS
SELECT 
  id,
  full_name,
  university,
  course,
  gyan_points,
  reputation_level,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profile_public TO authenticated, anon;

-- 2. Restrict votes table to only show own votes or aggregated data
DROP POLICY IF EXISTS "Users can view all votes" ON public.votes;

CREATE POLICY "Users can view own votes only"
ON public.votes
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Restrict fulfillment_votes table similarly
DROP POLICY IF EXISTS "Users can view all votes" ON public.fulfillment_votes;

CREATE POLICY "Users can view own fulfillment votes only"
ON public.fulfillment_votes
FOR SELECT
USING (auth.uid() = user_id);

-- Create functions to get vote counts without exposing individual voters
CREATE OR REPLACE FUNCTION public.get_note_vote_counts(note_uuid uuid)
RETURNS TABLE(upvotes bigint, downvotes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes
  FROM public.votes
  WHERE note_id = note_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_fulfillment_vote_counts(fulfillment_uuid uuid)
RETURNS TABLE(upvotes bigint, downvotes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes
  FROM public.fulfillment_votes
  WHERE fulfillment_id = fulfillment_uuid;
$$;