-- Secure function to check if email exists without exposing user data
-- Returns TRUE if email exists in auth.users, FALSE otherwise.
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres) to access auth.users
SET search_path = public, auth -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = email_to_check
  );
END;
$$;

-- Grant execute permission to public (anon/authenticated)
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO service_role;
