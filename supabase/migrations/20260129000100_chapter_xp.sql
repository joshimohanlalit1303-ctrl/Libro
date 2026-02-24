-- 1. Add completed_chapters column to user_progress
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS completed_chapters integer[] DEFAULT '{}';

-- 2. Create function to finish chapter and award XP
CREATE OR REPLACE FUNCTION public.finish_chapter(
  p_book_id uuid,
  p_chapter_index int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_completed_chapters integer[];
  v_xp_amount int := 20; -- XP per chapter
  v_is_new boolean := false;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current progress
  SELECT completed_chapters INTO v_completed_chapters
  FROM user_progress
  WHERE user_id = v_user_id AND book_id = p_book_id;

  -- Create record if not exists (shouldn't happen if reader initializes correctly, but safe fallback)
  IF NOT FOUND THEN
    INSERT INTO user_progress (user_id, book_id, completed_chapters)
    VALUES (v_user_id, p_book_id, ARRAY[p_chapter_index])
    RETURNING completed_chapters INTO v_completed_chapters;
    
    v_is_new := true;
  ELSE
    -- Check if chapter already completed
    IF p_chapter_index = ANY(v_completed_chapters) THEN
      RETURN json_build_object('success', true, 'awarded', false, 'message', 'Already completed');
    END IF;

    -- Update array
    UPDATE user_progress
    SET completed_chapters = array_append(completed_chapters, p_chapter_index)
    WHERE user_id = v_user_id AND book_id = p_book_id;
    
    v_is_new := true;
  END IF;

  -- Award XP if new
  IF v_is_new THEN
    PERFORM award_xp(v_user_id, v_xp_amount);
    
    -- Sync achievements (just in case)
    PERFORM check_achievements(v_user_id);
    
    RETURN json_build_object('success', true, 'awarded', true, 'xp', v_xp_amount);
  END IF;

  RETURN json_build_object('success', false, 'error', 'Unknown state');
END;
$$;
