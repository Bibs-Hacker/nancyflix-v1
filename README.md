# NANCYFLIX 2.0 — live movie discovery

**Every story deserves a screen.**

A cinematic, responsive React + TypeScript movie-discovery app. This version removes the hard-coded demo catalogue and loads live movie metadata through a Supabase Edge Function that keeps the TMDB API key server-side.

## Included

- Animated cinematic splash and responsive layout.
- Live TMDB search, discover, trending, top-rated and upcoming views.
- 19 movie genres, paginated catalogue results, posters and backdrops.
- Title detail modal and links to available YouTube trailer/teaser references.
- Supabase email/password sign-up, sign-in, password reset and account sign-out.
- Cloud watchlist with row-level security policies.
- Theme selection, mobile navigation, accessible labels and reduced-motion CSS.
- PWA manifest and SVG icon.
- SQL migration and Supabase Edge Function source.

> **Rights and data note:** TMDB provides movie metadata and video references, not permission to stream full movies. Trailer links open YouTube. Full-length streaming requires authorized content and distribution rights. This app intentionally does not pretend to host films.

## Requirements

- Node.js 20+ recommended
- A TMDB API key
- A Supabase project (for the Edge Function and account/watchlist sync)

## 1. Install and run

```bash
npm install
cp .env.example .env
npm run dev
```

The app compiles locally, but live catalogue results require the Edge Function configuration below. The interface will show a setup message rather than inventing sample movies if it is not configured.

## 2. Configure Supabase

In the Supabase dashboard:

1. Open **Project Settings → API** and copy the Project URL and publishable/anon key.
2. Put those values in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Open **SQL Editor** and run `supabase/migrations/202610200001_nancyflix.sql`.
4. If using email/password auth, configure the desired email confirmation and redirect URLs in **Authentication → URL Configuration**.

The frontend key is a publishable/anon key and is intended for client use only when protected by correct RLS policies. Never place a Supabase service-role/secret key in frontend environment variables.

## 3. Configure the live TMDB catalogue

Create a TMDB API key in your TMDB account. Then from a terminal with the Supabase CLI installed and linked to your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set TMDB_API_KEY=YOUR_TMDB_API_KEY
supabase functions deploy tmdb
```

Do not commit the real key and do not put it in a `VITE_` variable. The Edge Function reads it from server-side Supabase secrets.

Set the function URL in `.env`:

```env
VITE_TMDB_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/tmdb
```

Then restart the dev server. For production, set the same three `VITE_` variables in your hosting provider's project settings and redeploy.

## 4. Build and deploy

```bash
npm run typecheck
npm run build
npm run preview
```

Deploy the repository to Vercel, Netlify, or another static host that supports Vite. Set the environment variables in that host's dashboard. Every time you change frontend environment variables, rebuild/redeploy.

For GitHub Pages, configure an appropriate Vite base path first; Vercel is usually simpler for this project.

## API routes handled by the included Edge Function

- `?action=discover&page=1&with_genres=28&sort_by=popularity.desc`
- `?action=search&page=1&query=...`
- `?action=trending&page=1&time_window=week`
- `?action=videos&id=123`

The function allows only known actions and forwards a restricted set of parameters. The frontend requests paginated results rather than trying to download the entire catalogue in one request.

## Important production notes

- Configure TMDB attribution according to its current branding and API terms: https://developer.themoviedb.org/docs/faq
- Supabase Row Level Security is enabled for `watchlist`; users can only read/write rows matching their authenticated user ID.
- Review Supabase Auth email confirmation, password policy, rate limits and allowed redirect URLs before public launch.
- CORS is open in the included Edge Function for ease of deployment. Restrict `Access-Control-Allow-Origin` to your deployed domains before a production launch if appropriate.
- This is a movie discovery product, not a licensed full-film streaming service.
