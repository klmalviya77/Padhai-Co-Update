-- Update default gyan_points for new users to 200
ALTER TABLE public.profiles 
ALTER COLUMN gyan_points SET DEFAULT 200;

-- Add column to track if profile completion bonus has been awarded
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_bonus_awarded BOOLEAN DEFAULT FALSE;

-- Update process_fulfillment_approval function to award fixed 50 GP to fulfiller
CREATE OR REPLACE FUNCTION public.process_fulfillment_approval(_fulfillment_id uuid, _approved boolean, _reviewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id UUID;
  v_uploader_id UUID;
  v_requester_id UUID;
BEGIN
  -- Get fulfillment data
  SELECT request_id, uploader_id INTO v_request_id, v_uploader_id
  FROM request_fulfillments WHERE id = _fulfillment_id;

  -- Get requester
  SELECT requester_id INTO v_requester_id
  FROM note_requests WHERE id = v_request_id;

  -- Verify reviewer is the requester
  IF _reviewer_id != v_requester_id THEN
    RAISE EXCEPTION 'Only the requester can approve or reject';
  END IF;

  IF _approved THEN
    -- Award fixed 50 points to uploader
    UPDATE profiles SET gyan_points = gyan_points + 50
    WHERE id = v_uploader_id;

    -- Mark request as fulfilled
    UPDATE note_requests
    SET status = 'fulfilled',
        fulfilled_at = NOW(),
        fulfilled_by = v_uploader_id
    WHERE id = v_request_id;

    -- Mark fulfillment as approved
    UPDATE request_fulfillments
    SET status = 'approved',
        reviewed_at = NOW()
    WHERE id = _fulfillment_id;
  ELSE
    -- Mark fulfillment as rejected (request stays open)
    UPDATE request_fulfillments
    SET status = 'rejected',
        reviewed_at = NOW()
    WHERE id = _fulfillment_id;
  END IF;
END;
$function$;