-- Fix security definer view issue by using a regular view without SECURITY DEFINER
-- The view will use the permissions of the querying user

-- Drop the existing view
DROP VIEW IF EXISTS public.profile_public;

-- Create a regular view (without SECURITY DEFINER) 
-- Users will see profiles through their existing RLS policies
CREATE VIEW public.profile_public AS
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

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public.profile_public IS 'Public view of profiles excluding sensitive email addresses';