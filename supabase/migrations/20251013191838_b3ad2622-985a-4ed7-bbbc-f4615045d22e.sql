-- Remove default values for university and course in profiles table
ALTER TABLE public.profiles 
  ALTER COLUMN university DROP DEFAULT,
  ALTER COLUMN course DROP DEFAULT;