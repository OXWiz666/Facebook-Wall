# Facebook Wall Challenge - Implementation Plan

## Goal

Build a small, polished, 2008-inspired Facebook-style wall using React 19, Next.js App Router, TypeScript, Supabase, Tailwind CSS, and shadcn/ui, then deploy it to Vercel.

The first release is complete when visitors can submit a message, the message persists in Supabase, and the feed shows persisted messages newest first after refresh. Real-time updates and the 280-character limit are included in the core scope. Photo uploads are optional and should follow only after the text wall is working.

## Scope and decisions

- No login or account system. Use one fixed author label (for example, "Guest") or a clearly labeled optional display-name field.
- Message text is required and limited to 280 characters, enforced in both the UI and the database.
- New posts appear at the top of the feed.
- Subscribe to Supabase Realtime for inserts; also load the initial feed from the database so refreshes work.
- Keep the visual treatment nostalgic but usable: classic blue header, compact profile-style cards, pale blue-gray page background, and modern spacing, contrast, and mobile behavior.
- Do not build likes, comments, friend management, authentication, or moderation tools for the challenge MVP.
- Defer photo upload unless the text-only flow is complete and stable.

## Proposed structure

```text
app/
  layout.tsx
  page.tsx                 # Server-rendered initial feed and page shell
  globals.css
components/
  wall-composer.tsx        # Client component: input, counter, submit state
  wall-feed.tsx            # Client component: feed and realtime subscription
  wall-post-card.tsx       # Individual post presentation
lib/
  supabase/client.ts       # Browser-safe Supabase client
  supabase/server.ts       # Server-side client if needed for initial query
  validations.ts           # Shared message validation
types/
  post.ts
supabase/
  migrations/              # posts table, grants, RLS, realtime publication
```

Use a single `posts` table for the MVP. Keep Supabase calls behind small helpers or focused components so the UI does not depend on database details everywhere.

## Data model and access

`public.posts`

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Stable post identifier |
| `author_name` | `text not null default 'Guest'` | Fixed author label |
| `body` | `text not null` | Post content |
| `created_at` | `timestamptz not null default now()` | Ordering and display time |

Add a database constraint requiring `char_length(body)` from 1 through 280, plus an index on `created_at desc`. Enable Row Level Security. Grant only the public read and insert operations required by the app; add policies that allow visitors to read posts and insert valid posts. Do not grant public update or delete access. Never expose the Supabase `service_role` key in browser code. The public anon/publishable key is expected in the client, with database grants and RLS controlling its access.

Because there is no login, any visitor can post under the fixed author label. For the challenge, keep the capability narrow and validate at both client and database layers. If this becomes a public production service, add abuse controls and moderation before broad promotion.

## Implementation phases

### 1. Bootstrap the app

- Create a Next.js App Router project with TypeScript and Tailwind CSS.
- Add shadcn/ui components only where they improve the small interface; avoid unnecessary component setup.
- Add `@supabase/supabase-js` and configure environment variables for the Supabase project URL and public anon/publishable key.
- Create a responsive page shell and establish the visual direction.

### 2. Set up Supabase persistence

- Create the `posts` table and migration with constraints, grants, RLS policies, and the `created_at` index.
- Enable the `posts` table for Supabase Realtime.
- Add typed post shapes and a query that selects the needed fields ordered by `created_at` descending.
- Confirm the app can read the initial feed and insert a post through the public client.

### 3. Build the composer and feed

- Create a composer with a textarea, live character count, and disabled/working states.
- Trim input before submission; reject empty or over-limit content.
- On successful insert, clear the composer and show the new post immediately. Use the inserted row returned by Supabase to avoid waiting for another fetch.
- Render newest-first cards with a readable timestamp, fixed author label, and empty/loading/error states.
- Ensure the feed is usable on narrow screens and by keyboard.

### 4. Add live updates

- Subscribe to `INSERT` events for `public.posts` in a client component.
- Merge incoming rows into the displayed feed by `id`, keeping newest-first order and avoiding duplicates when the current visitor also receives the Realtime event for their insert.
- Remove the subscription on component unmount and show a sensible fallback if the channel disconnects; manual refresh and initial database loading must still work.
- Check Supabase table publication and SELECT policy configuration because Postgres Changes delivery is subject to the subscriber's read access.

### 5. Polish and deploy

- Add app title, metadata, responsive styling, and clear feedback for submit failures.
- Create a Supabase project and configure the matching Vercel environment variables for Preview and Production.
- Deploy the app to Vercel and validate the deployed URL using the acceptance checklist below.
- Keep credentials out of source control; commit an `.env.example` with variable names only.

### 6. Optional photo upload

Only after the text-based acceptance criteria work end to end:

- Add a `photo_url` column and a Supabase Storage bucket with upload and read policies appropriate for public wall images.
- Restrict file types and size in the UI, and avoid storing raw image bytes in the `posts` row.
- Add upload progress and failure handling. Recheck Vercel and Supabase limits before choosing maximum file size.

## Acceptance checklist

1. A visitor can type and submit a post using **Share**.
2. A valid post is stored in Supabase and appears at the top of the feed.
3. Refreshing the deployed page still shows the stored post.
4. A second browser session sees newly submitted posts without refreshing.
5. Empty and over-280-character posts cannot be submitted, and the database rejects invalid body lengths too.
6. The page has useful loading, empty, and error states and remains usable on desktop and mobile.
7. The Vercel deployment uses environment-specific Supabase configuration and contains no service-role secret.

## Main risks and mitigations

- **Realtime appears broken:** confirm `posts` is included in the `supabase_realtime` publication, the subscription uses the correct schema/table/event, and the subscriber can SELECT rows under RLS.
- **Duplicate new post:** insert the returned row immediately and deduplicate Realtime events by primary key.
- **Public endpoint abuse:** keep anonymous permissions limited to SELECT and INSERT, enforce the content constraint in Postgres, and add moderation/rate controls if expanding beyond the challenge.
- **Environment mismatch:** set the same variable names in local development and Vercel Preview/Production, each pointing to its intended Supabase project.

## Documentation references

- [Supabase: Use Supabase with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase: Using Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Supabase: Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

