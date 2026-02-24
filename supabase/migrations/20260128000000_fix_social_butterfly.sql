-- Ensure Social Butterfly badge exists with correct slug
INSERT INTO public.achievements (slug, name, description, xp_reward, icon_url)
VALUES 
    ('social-butterfly', 'Social Butterfly', 'Joined a reading room.', 20, 'Users')
ON CONFLICT (slug) DO UPDATE 
SET description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Re-run the fix logic just in case
SELECT check_achievements(auth.uid());
