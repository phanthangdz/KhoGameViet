-- Run once in Supabase SQL Editor. Safe to re-run (policies/triggers are replaced).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_url text,
  ipa_url text,
  version text,
  size text,
  developer text,
  ios_requirement text,
  update_status text not null default 'Cập nhật',
  category_id uuid references public.categories(id) on delete set null,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  downloads bigint not null default 0 check (downloads >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Upgrade the simpler games table from the initial setup without losing its rows.
alter table public.games add column if not exists description text not null default '';
alter table public.games add column if not exists cover_url text;
alter table public.games add column if not exists ipa_url text;
alter table public.games add column if not exists version text;
alter table public.games add column if not exists size text;
alter table public.games add column if not exists developer text;
alter table public.games add column if not exists ios_requirement text;
alter table public.games add column if not exists update_status text not null default 'Cập nhật';
alter table public.games add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.games add column if not exists is_published boolean not null default false;
alter table public.games add column if not exists is_featured boolean not null default false;
alter table public.games add column if not exists downloads bigint not null default 0;
alter table public.games add column if not exists created_at timestamptz not null default now();
alter table public.games add column if not exists updated_at timestamptz not null default now();

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  target_url text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  kind text not null default 'update' check (kind in ('maintenance','update','event')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  body text not null,
  rating smallint check (rating between 1 and 5),
  is_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists games_public_created_idx on public.games (is_published, created_at desc);
create index if not exists downloads_created_idx on public.downloads (created_at desc);
create index if not exists comments_game_idx on public.comments (game_id, created_at desc);

-- Role is stored in the database. Client-provided signup metadata never grants admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, username, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'username', ''), 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
-- Remove the earlier starter trigger name if it was created from setup instructions.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

-- Backfill users who were created before the profile trigger was installed.
insert into public.profiles (id, email, role)
select u.id, u.email, 'user' from auth.users u
on conflict (id) do update set email = excluded.email;

create or replace function public.set_game_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at before update on public.games
for each row execute procedure public.set_game_updated_at();

-- Database-triggered logs cannot be written or edited directly through the public API.
create or replace function public.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_id text;
begin
  if TG_OP = 'DELETE' then row_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'key');
  else row_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key'); end if;
  insert into public.admin_logs(actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), lower(TG_OP), TG_TABLE_NAME, row_id,
    case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  if TG_OP = 'DELETE' then return old; else return new; end if;
end;
$$;
drop trigger if exists games_audit on public.games;
create trigger games_audit after insert or update or delete on public.games
for each row execute procedure public.audit_admin_change();
drop trigger if exists categories_audit on public.categories;
create trigger categories_audit after insert or update or delete on public.categories
for each row execute procedure public.audit_admin_change();
drop trigger if exists profiles_role_audit on public.profiles;
create trigger profiles_role_audit after update of role on public.profiles
for each row when (old.role is distinct from new.role)
execute procedure public.audit_admin_change();
drop trigger if exists banners_audit on public.banners;
create trigger banners_audit after insert or update or delete on public.banners
for each row execute procedure public.audit_admin_change();
drop trigger if exists notifications_audit on public.notifications;
create trigger notifications_audit after insert or update or delete on public.notifications
for each row execute procedure public.audit_admin_change();
drop trigger if exists comments_audit on public.comments;
create trigger comments_audit after insert or update or delete on public.comments
for each row execute procedure public.audit_admin_change();
drop trigger if exists settings_audit on public.settings;
create trigger settings_audit after insert or update or delete on public.settings
for each row execute procedure public.audit_admin_change();

-- RLS enabled everywhere; explicit grants keep the browser API least-privileged.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.games enable row level security;
alter table public.downloads enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;
alter table public.comments enable row level security;
alter table public.settings enable row level security;
alter table public.admin_logs enable row level security;

grant select on public.profiles, public.categories, public.games, public.downloads,
  public.banners, public.notifications, public.comments, public.settings, public.admin_logs to anon, authenticated;
grant insert, update, delete on public.profiles, public.categories, public.games,
  public.banners, public.notifications, public.comments, public.settings to authenticated;
grant insert on public.comments to authenticated;
-- Download events must be inserted by a trusted Edge Function/backend, not by clients.
revoke insert, update, delete on public.downloads from anon, authenticated;

-- Re-running the script replaces only these named policies.
drop policy if exists "Read own profile or admin" on public.profiles;
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage" on public.profiles for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select to anon, authenticated using (true);
drop policy if exists "categories_admin_manage" on public.categories;
create policy "categories_admin_manage" on public.categories for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

-- Remove permissive policies from the earlier starter schema; policies OR together in Postgres.
drop policy if exists "Games are readable" on public.games;
drop policy if exists "Only admins manage games" on public.games;
drop policy if exists "games_public_read_published" on public.games;
create policy "games_public_read_published" on public.games for select to anon, authenticated
using (is_published or (select public.is_admin()));
drop policy if exists "games_admin_manage" on public.games;
create policy "games_admin_manage" on public.games for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "downloads_admin_read" on public.downloads;
create policy "downloads_admin_read" on public.downloads for select to authenticated
using ((select public.is_admin()));
drop policy if exists "banners_public_read_active" on public.banners;
create policy "banners_public_read_active" on public.banners for select to anon, authenticated
using (is_active or (select public.is_admin()));
drop policy if exists "banners_admin_manage" on public.banners;
create policy "banners_admin_manage" on public.banners for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "notifications_public_read_published" on public.notifications;
create policy "notifications_public_read_published" on public.notifications for select to anon, authenticated
using (is_published or (select public.is_admin()));
drop policy if exists "notifications_admin_manage" on public.notifications;
create policy "notifications_admin_manage" on public.notifications for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "comments_public_read_visible" on public.comments;
create policy "comments_public_read_visible" on public.comments for select to anon, authenticated
using (is_visible or (select public.is_admin()));
drop policy if exists "comments_user_insert" on public.comments;
create policy "comments_user_insert" on public.comments for insert to authenticated
with check (user_id = (select auth.uid()) and is_visible = false);
drop policy if exists "comments_admin_manage" on public.comments;
create policy "comments_admin_manage" on public.comments for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings_admin_manage" on public.settings;
create policy "settings_admin_manage" on public.settings for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin_logs_admin_read" on public.admin_logs;
create policy "admin_logs_admin_read" on public.admin_logs for select to authenticated
using ((select public.is_admin()));
revoke insert, update, delete on public.admin_logs from anon, authenticated;

-- Create a public image bucket. Keep private files and unlicensed game binaries elsewhere.
insert into storage.buckets (id, name, public)
values ('game-assets', 'game-assets', true)
on conflict (id) do update set public = true;
-- Public can view image assets; only database-authorized admins can upload/update/delete.
drop policy if exists "game_assets_public_read" on storage.objects;
create policy "game_assets_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'game-assets');
drop policy if exists "game_assets_admin_insert" on storage.objects;
create policy "game_assets_admin_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'game-assets' and (select public.is_admin()));
drop policy if exists "game_assets_admin_update" on storage.objects;
create policy "game_assets_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'game-assets' and (select public.is_admin()))
with check (bucket_id = 'game-assets' and (select public.is_admin()));
drop policy if exists "game_assets_admin_delete" on storage.objects;
create policy "game_assets_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'game-assets' and (select public.is_admin()));
