# The Wall

A small, 2008-inspired social wall built for the Facebook Wall challenge. Visitors can share a message up to 280 characters, browse newest-first posts, and see new posts arrive live.

## Stack

- Next.js App Router and React 19
- TypeScript
- Tailwind CSS 4 and shadcn/ui-style button/textarea primitives
- Supabase Postgres and Realtime
- Vercel deployment

## Run locally

1. Install Node.js 20.9 or newer.
2. Install dependencies with `npm install`.
3. Create a Supabase project.
4. In the Supabase SQL Editor, run [`supabase/setup.sql`](./supabase/setup.sql). Re-run it after pulling changes to provision guest avatars, post photos, likes, and comments.
5. In Supabase Dashboard, open Integrations > Data API and expose `public.posts` if it is not already exposed. Confirm the `posts` table is included in the `supabase_realtime` publication.
6. Copy `.env.example` to `.env.local` and enter the Supabase project URL and publishable key. Do not use a service-role or secret key in this app.
7. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The SQL enables RLS, allows anonymous visitors to read and create posts, comments, and likes, and provisions a public `guest-avatars` Storage bucket with a 2 MB image limit. Guest avatars are remembered in the current browser. This challenge intentionally has no sign-in, so posts use the fixed name "Guest". Anonymous write access can be abused if the wall is opened to broad public traffic; add moderation and abuse controls before using it as a production community service.

## Deploy to Vercel

Import this repository into Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under the project's environment variables for Preview and Production.
