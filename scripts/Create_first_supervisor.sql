-- Step 1: Create the auth user
SELECT * FROM auth.users WHERE email = 'your-admin@example.com';
-- (if they've already signed up, skip to Step 2)

-- Step 2: Promote them to supervisor
UPDATE public.user_profiles
SET role_id = (SELECT id FROM public.roles WHERE name = 'supervisor')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-admin@example.com');