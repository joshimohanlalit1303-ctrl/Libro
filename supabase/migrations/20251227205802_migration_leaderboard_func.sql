-- Create a function to get the leaderboard
-- This function runs with SECURITY DEFINER to bypass RLS on user_progress

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    books_read_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.id AS user_id,
        p.username,
        p.avatar_url,
        COUNT(up.id) AS books_read_count
    FROM 
        profiles p
    LEFT JOIN 
        user_progress up ON p.id = up.user_id AND up.is_completed = true
    GROUP BY 
        p.id, p.username, p.avatar_url
    ORDER BY 
        books_read_count DESC
    LIMIT 50;
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard() TO anon;
