-- Run this in the Supabase SQL Editor for the project used by this app.
-- New projects may require explicitly exposing public.posts in Dashboard > Integrations > Data API.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null default 'Guest',
  avatar_url text,
  image_url text,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists avatar_url text;
alter table public.posts add column if not exists image_url text;
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check (
  (char_length(btrim(body)) between 1 and 280)
  or (char_length(btrim(body)) = 0 and image_url is not null)
);

create index if not exists posts_created_at_desc_idx
  on public.posts (created_at desc);

alter table public.posts enable row level security;

grant usage on schema public to anon;
grant select, insert on table public.posts to anon;

drop policy if exists "Anyone can read wall posts" on public.posts;
create policy "Anyone can read wall posts"
  on public.posts for select to anon
  using (true);

drop policy if exists "Anyone can share a wall post" on public.posts;
create policy "Anyone can share a wall post"
  on public.posts for insert to anon
  with check (
    author_name = 'Guest'
    and ((char_length(btrim(body)) between 1 and 280)
      or (char_length(btrim(body)) = 0 and image_url is not null))
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- Public avatars are readable by URL. Anonymous visitors may upload image files
-- only; file size and MIME type are limited at the bucket level.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-avatars', 'guest-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload guest avatars" on storage.objects;
create policy "Anyone can upload guest avatars"
  on storage.objects for insert to anon
  with check (bucket_id = 'guest-avatars');

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);
alter table public.post_likes enable row level security;
grant select, insert, delete on public.post_likes to anon;
drop policy if exists "Anyone can read likes" on public.post_likes;
create policy "Anyone can read likes" on public.post_likes for select to anon using (true);
drop policy if exists "Anyone can like posts" on public.post_likes;
create policy "Anyone can like posts" on public.post_likes for insert to anon with check (true);
drop policy if exists "Anyone can remove likes" on public.post_likes;
create policy "Anyone can remove likes" on public.post_likes for delete to anon using (true);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;
grant select, insert on public.post_comments to anon;
drop policy if exists "Anyone can read comments" on public.post_comments;
create policy "Anyone can read comments" on public.post_comments for select to anon using (true);
drop policy if exists "Anyone can add comments" on public.post_comments;
create policy "Anyone can add comments" on public.post_comments for insert to anon with check (char_length(btrim(body)) between 1 and 280);

