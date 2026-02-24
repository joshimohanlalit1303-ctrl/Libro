-- Migration: XP and Leveling System Update

-- 1. Add rewarded_threshold to user_progress if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'rewarded_threshold') THEN
        ALTER TABLE user_progress ADD COLUMN rewarded_threshold INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create the Progress Update RPC
CREATE OR REPLACE FUNCTION update_reading_progress(
    p_book_id UUID,
    p_percentage INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_threshold INTEGER;
    v_new_rewarded_threshold INTEGER;
    v_xp_gain INTEGER := 0;
    v_leveled_up BOOLEAN := FALSE;
    v_message TEXT := NULL;
    v_current_level INTEGER;
    v_current_xp INTEGER;
BEGIN
    -- Get Current User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- Get current state (Upsert logic separate to ensure we have a row)
    SELECT rewarded_threshold INTO v_current_threshold
    FROM user_progress
    WHERE user_id = v_user_id AND book_id = p_book_id;

    -- If no record, we assume 0 (the UPSERT below handles the row creation)
    IF v_current_threshold IS NULL THEN
        v_current_threshold := 0;
    END IF;

    v_new_rewarded_threshold := v_current_threshold;

    -- Logic: 25% Threshold -> +25 XP
    IF v_current_threshold < 25 AND p_percentage >= 25 THEN
        v_xp_gain := v_xp_gain + 25;
        v_new_rewarded_threshold := 25;
        v_message := 'Good Start! +25 XP';
    END IF;

    -- Logic: 50% Threshold -> +50 XP
    IF v_current_threshold < 50 AND p_percentage >= 50 THEN
        v_xp_gain := v_xp_gain + 50;
        v_new_rewarded_threshold := 50;
        v_message := 'Halfway Mark! +50 XP';
    END IF;

    -- Logic: 100% Threshold -> Level Up
    IF v_current_threshold < 100 AND p_percentage >= 100 THEN
        v_leveled_up := TRUE;
        v_new_rewarded_threshold := 100;
        v_message := 'Congratulations! Book Completed. LEVEL UP!';
    END IF;

    -- Update user_progress
    INSERT INTO user_progress (user_id, book_id, progress_percentage, rewarded_threshold, last_read_at, is_completed)
    VALUES (v_user_id, p_book_id, p_percentage, v_new_rewarded_threshold, now(), (p_percentage >= 100))
    ON CONFLICT (user_id, book_id)
    DO UPDATE SET
        progress_percentage = EXCLUDED.progress_percentage,
        rewarded_threshold = GREATEST(user_progress.rewarded_threshold, EXCLUDED.rewarded_threshold),
        last_read_at = EXCLUDED.last_read_at,
        is_completed = (user_progress.is_completed OR EXCLUDED.is_completed);

    -- Award Rewards
    IF v_xp_gain > 0 OR v_leveled_up THEN
        UPDATE profiles
        SET 
            xp = xp + v_xp_gain,
            level = CASE WHEN v_leveled_up THEN level + 1 ELSE level END,
            books_read_count = CASE WHEN v_leveled_up THEN books_read_count + 1 ELSE books_read_count END
        WHERE id = v_user_id
        RETURNING xp, level INTO v_current_xp, v_current_level;
    ELSE
        SELECT xp, level INTO v_current_xp, v_current_level FROM profiles WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'awarded_xp', v_xp_gain,
        'leveled_up', v_leveled_up,
        'message', v_message,
        'new_level', v_current_level,
        'new_xp', v_current_xp
    );
END;
$$;
