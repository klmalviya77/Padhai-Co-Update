-- Create note requests table
CREATE TABLE public.note_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  category education_category NOT NULL,
  level TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  points_offered INTEGER NOT NULL CHECK (points_offered > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES profiles(id)
);

-- Create request fulfillments table
CREATE TABLE public.request_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES note_requests(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES profiles(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_validation' 
    CHECK (status IN ('pending_validation', 'validation_failed', 'awaiting_approval', 'approved', 'rejected', 'community_review')),
  validation_passed BOOLEAN DEFAULT FALSE,
  validation_errors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  auto_review_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0
);

-- Create fulfillment votes table
CREATE TABLE public.fulfillment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID NOT NULL REFERENCES request_fulfillments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fulfillment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.note_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_requests
CREATE POLICY "Anyone can view open requests" ON public.note_requests
  FOR SELECT USING (status = 'open' OR auth.uid() = requester_id);

CREATE POLICY "Users can create requests" ON public.note_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update own requests" ON public.note_requests
  FOR UPDATE USING (auth.uid() = requester_id);

-- RLS Policies for request_fulfillments
CREATE POLICY "Anyone can view approved fulfillments" ON public.request_fulfillments
  FOR SELECT USING (status = 'approved' OR auth.uid() = uploader_id OR auth.uid() IN (
    SELECT requester_id FROM note_requests WHERE id = request_id
  ));

CREATE POLICY "Users can create fulfillments" ON public.request_fulfillments
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "System can update fulfillments" ON public.request_fulfillments
  FOR UPDATE USING (true);

-- RLS Policies for fulfillment_votes
CREATE POLICY "Users can view all votes" ON public.fulfillment_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can create own votes" ON public.fulfillment_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON public.fulfillment_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.fulfillment_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to validate fulfillment
CREATE OR REPLACE FUNCTION public.validate_fulfillment(_fulfillment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file_size INTEGER;
  v_file_type TEXT;
  v_errors TEXT[] := '{}';
  v_request_subject TEXT;
  v_validation_passed BOOLEAN := TRUE;
BEGIN
  -- Get fulfillment and request data
  SELECT f.file_size, f.file_type, r.subject
  INTO v_file_size, v_file_type, v_request_subject
  FROM request_fulfillments f
  JOIN note_requests r ON f.request_id = r.id
  WHERE f.id = _fulfillment_id;

  -- Check file size (200KB to 10MB)
  IF v_file_size < 204800 THEN
    v_errors := array_append(v_errors, 'File too small (minimum 200KB)');
    v_validation_passed := FALSE;
  END IF;

  IF v_file_size > 10485760 THEN
    v_errors := array_append(v_errors, 'File too large (maximum 10MB)');
    v_validation_passed := FALSE;
  END IF;

  -- Check file format (PDF only for now)
  IF v_file_type != 'application/pdf' THEN
    v_errors := array_append(v_errors, 'Invalid file format (PDF required)');
    v_validation_passed := FALSE;
  END IF;

  -- Update fulfillment with validation results
  IF v_validation_passed THEN
    UPDATE request_fulfillments
    SET status = 'awaiting_approval',
        validation_passed = TRUE,
        validation_errors = NULL
    WHERE id = _fulfillment_id;
  ELSE
    UPDATE request_fulfillments
    SET status = 'validation_failed',
        validation_passed = FALSE,
        validation_errors = v_errors
    WHERE id = _fulfillment_id;
  END IF;
END;
$$;

-- Function to process approval/rejection
CREATE OR REPLACE FUNCTION public.process_fulfillment_approval(
  _fulfillment_id UUID,
  _approved BOOLEAN,
  _reviewer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_uploader_id UUID;
  v_points INTEGER;
  v_requester_id UUID;
BEGIN
  -- Get fulfillment data
  SELECT request_id, uploader_id INTO v_request_id, v_uploader_id
  FROM request_fulfillments WHERE id = _fulfillment_id;

  -- Get request data
  SELECT points_offered, requester_id INTO v_points, v_requester_id
  FROM note_requests WHERE id = v_request_id;

  -- Verify reviewer is the requester
  IF _reviewer_id != v_requester_id THEN
    RAISE EXCEPTION 'Only the requester can approve or reject';
  END IF;

  IF _approved THEN
    -- Award points to uploader
    UPDATE profiles SET gyan_points = gyan_points + v_points
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
$$;

-- Function to update vote counts
CREATE OR REPLACE FUNCTION public.update_fulfillment_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE request_fulfillments SET upvotes = upvotes + 1 WHERE id = NEW.fulfillment_id;
    ELSE
      UPDATE request_fulfillments SET downvotes = downvotes + 1 WHERE id = NEW.fulfillment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE request_fulfillments SET upvotes = upvotes - 1 WHERE id = OLD.fulfillment_id;
    ELSE
      UPDATE request_fulfillments SET downvotes = downvotes - 1 WHERE id = OLD.fulfillment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE request_fulfillments SET upvotes = upvotes - 1 WHERE id = OLD.fulfillment_id;
    ELSE
      UPDATE request_fulfillments SET downvotes = downvotes - 1 WHERE id = OLD.fulfillment_id;
    END IF;
    IF NEW.vote_type = 'upvote' THEN
      UPDATE request_fulfillments SET upvotes = upvotes + 1 WHERE id = NEW.fulfillment_id;
    ELSE
      UPDATE request_fulfillments SET downvotes = downvotes + 1 WHERE id = NEW.fulfillment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update vote counts
CREATE TRIGGER update_fulfillment_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fulfillment_votes
  FOR EACH ROW EXECUTE FUNCTION update_fulfillment_votes();

-- Function to check and process community validation
CREATE OR REPLACE FUNCTION public.check_community_validation(_fulfillment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_downvotes INTEGER;
  v_request_id UUID;
  v_points INTEGER;
  v_requester_id UUID;
  v_status TEXT;
  v_auto_review_at TIMESTAMPTZ;
BEGIN
  -- Get fulfillment data
  SELECT downvotes, request_id, status, auto_review_at
  INTO v_downvotes, v_request_id, v_status, v_auto_review_at
  FROM request_fulfillments WHERE id = _fulfillment_id;

  -- Check if 24 hours passed and status is awaiting_approval
  IF v_status = 'awaiting_approval' AND NOW() > v_auto_review_at THEN
    UPDATE request_fulfillments
    SET status = 'community_review'
    WHERE id = _fulfillment_id;
    v_status := 'community_review';
  END IF;

  -- If in community review and 3+ downvotes, reject and refund
  IF v_status = 'community_review' AND v_downvotes >= 3 THEN
    -- Get request data for refund
    SELECT points_offered, requester_id INTO v_points, v_requester_id
    FROM note_requests WHERE id = v_request_id;

    -- Refund points to requester
    UPDATE profiles SET gyan_points = gyan_points + v_points
    WHERE id = v_requester_id;

    -- Mark fulfillment as rejected
    UPDATE request_fulfillments
    SET status = 'rejected',
        reviewed_at = NOW()
    WHERE id = _fulfillment_id;
  END IF;
END;
$$;

-- Trigger to validate fulfillment on insert
CREATE OR REPLACE FUNCTION public.trigger_validate_fulfillment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM validate_fulfillment(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_fulfillment_trigger
  AFTER INSERT ON request_fulfillments
  FOR EACH ROW EXECUTE FUNCTION trigger_validate_fulfillment();