# Hello Work — setup guide

The site files are ready, but login is intentionally not active until a Supabase project is connected.

## 1. Create the free database/auth project
1. Visit https://supabase.com/dashboard and create a project.
2. In **Project Settings → API** (or **Connect**), copy the Project URL and the **publishable key** (or legacy anon/public key).
3. Put those two public values in `config.js`. Do **not** use a service_role key or share a database password. The publishable/anon key is meant for the browser; security depends on the database policies below.

## 2. Create the profile table and security policies
Open the Supabase **SQL Editor**, create a query, paste the contents of `schema.sql`, and run it.

The table uses Row Level Security. Users can read/update their own profile, but cannot assign themselves the admin role through profile updates.

## 3. Make your own account the first admin
1. In Supabase **Authentication → Users**, create your account using the website's Create account tab, then confirm your email if required.
2. Find your account's UUID in Authentication → Users.
3. In the SQL Editor run the following, replacing the example UUID with your actual user UUID:
   `update public.profiles set role = 'admin' where id = 'PASTE-YOUR-USER-UUID-HERE';`
   Run this only from the trusted SQL Editor. Never add an admin password or service key to the website code.
4. Sign out and back in. The admin area will then appear.

## 4. Publish with GitHub Pages
1. Open the repository Settings → Pages.
2. Under Build and deployment, select **Deploy from a branch**, choose branch **main** and folder **/(root)**, then Save.
3. Wait for GitHub Pages to finish publishing. The likely URL is https://morty-berger.github.io/Hello-work-/ (repository names are case-sensitive in URLs). Check the Pages screen for the exact live URL.

## Notes
- GitHub Pages serves the static site for free. Supabase free tier provides authentication and a hosted database within its current limits.
- Do not commit database passwords, Supabase service_role keys, or other secrets.
- The admin view lists profile names and roles, not passwords or private authentication data.
- Email confirmation and password-reset redirects may need your published Pages URL added in Supabase Authentication → URL Configuration.
