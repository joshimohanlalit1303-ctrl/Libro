-- Create a view for the leaderboard
-- This view aggregates the number of completed books for each user from the user_progress table

CREATE OR REPLACE VIEW leaderboard AS
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
    books_read_count DESC;

-- Grant access to the view (adjust roles as needed, assuming 'authenticated' and 'anon' for now)
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;
