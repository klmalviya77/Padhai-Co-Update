-- Create function to award profile completion bonus
CREATE OR REPLACE FUNCTION public.award_profile_bonus(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 30 GP bonus and mark as awarded
  UPDATE profiles 
  SET gyan_points = gyan_points + 30,
      profile_bonus_awarded = TRUE
  WHERE id = _user_id 
    AND profile_bonus_awarded = FALSE
    AND university IS NOT NULL 
    AND course IS NOT NULL;
END;
$function$;