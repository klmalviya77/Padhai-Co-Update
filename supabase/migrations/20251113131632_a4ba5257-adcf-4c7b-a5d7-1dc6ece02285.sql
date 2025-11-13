-- Make the notes storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'notes';

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view notes files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload notes files" ON storage.objects;

-- Create restrictive RLS policy - only authenticated users can view
CREATE POLICY "Authenticated users can view notes files" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'notes' AND 
  auth.uid() IS NOT NULL
);

-- Users can upload their own files
CREATE POLICY "Users can upload notes files" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notes' AND 
  auth.uid() IS NOT NULL
);