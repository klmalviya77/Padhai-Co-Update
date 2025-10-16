-- Drop all triggers that use prevent_points_update function
DROP TRIGGER IF EXISTS prevent_points_direct_update ON profiles;
DROP TRIGGER IF EXISTS check_points_update ON profiles;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS prevent_points_update();

-- Create a new trigger function that allows updates from SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.prevent_points_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Allow updates if made through SECURITY DEFINER functions
  -- (session_user != current_user indicates SECURITY DEFINER context)
  IF NEW.gyan_points != OLD.gyan_points AND session_user = current_user THEN
    RAISE EXCEPTION 'Cannot update gyan_points directly. Use award_upload_points or deduct_download_points functions.';
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER prevent_points_direct_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_points_update();