-- QUASI! · schema Supabase
-- Esegui l'intero file dal Supabase SQL Editor dopo ogni aggiornamento.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(nickname) between 2 and 20),
  constraint profiles_nickname_safe check (nickname !~ '[<>[:cntrl:]]')
);

create unique index if not exists profiles_nickname_lower_uidx
  on public.profiles (lower(nickname));

create table if not exists public.score_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'production' check (environment in ('local', 'production', 'legacy')),
  score smallint not null check (score between 0 and 100),
  mode text not null check (mode in ('solo', 'challenge')),
  duration_ms integer not null check (duration_ms between 1000 and 3600000),
  level_scores jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists score_submissions_user_created_idx
  on public.score_submissions (user_id, created_at desc);
create index if not exists score_submissions_score_created_idx
  on public.score_submissions (score desc, created_at asc);

create table if not exists public.player_bests (
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'production' check (environment in ('local', 'production', 'legacy')),
  nickname text not null,
  best_score smallint not null check (best_score between 0 and 100),
  games_played integer not null default 1 check (games_played > 0),
  total_score bigint not null default 0 check (total_score >= 0),
  achieved_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  primary key (user_id, environment)
);

create table if not exists public.level_score_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'production' check (environment in ('local', 'production', 'legacy')),
  level_id text not null,
  score smallint not null check (score between 0 and 100),
  mode text not null check (mode in ('solo', 'challenge', 'training')),
  duration_ms integer not null check (duration_ms between 50 and 900000),
  created_at timestamptz not null default now(),
  constraint level_submission_id_safe check (level_id ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

create index if not exists level_score_submissions_level_rank_idx
  on public.level_score_submissions (level_id, score desc, created_at asc);
create index if not exists level_score_submissions_user_created_idx
  on public.level_score_submissions (user_id, created_at desc);

create table if not exists public.level_bests (
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'production' check (environment in ('local', 'production', 'legacy')),
  level_id text not null,
  nickname text not null,
  best_score smallint not null check (best_score between 0 and 100),
  attempts integer not null default 1 check (attempts > 0),
  total_score bigint not null default 0 check (total_score >= 0),
  achieved_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  primary key (user_id, level_id, environment),
  constraint level_best_id_safe check (level_id ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

-- Migrazione dagli schemi precedenti: i dati già presenti provengono dal
-- collaudo locale precedente alla pubblicazione e restano isolati in "local".
alter table public.score_submissions
  add column if not exists environment text not null default 'local';
alter table public.player_bests
  add column if not exists environment text not null default 'local';
alter table public.level_score_submissions
  add column if not exists environment text not null default 'local';
alter table public.level_bests
  add column if not exists environment text not null default 'local';

alter table public.score_submissions alter column environment set default 'production';
alter table public.player_bests alter column environment set default 'production';
alter table public.level_score_submissions alter column environment set default 'production';
alter table public.level_bests alter column environment set default 'production';

alter table public.score_submissions drop constraint if exists score_submissions_environment_check;
alter table public.score_submissions add constraint score_submissions_environment_check
  check (environment in ('local', 'production', 'legacy'));
alter table public.player_bests drop constraint if exists player_bests_environment_check;
alter table public.player_bests add constraint player_bests_environment_check
  check (environment in ('local', 'production', 'legacy'));
alter table public.level_score_submissions drop constraint if exists level_score_submissions_environment_check;
alter table public.level_score_submissions add constraint level_score_submissions_environment_check
  check (environment in ('local', 'production', 'legacy'));
alter table public.level_bests drop constraint if exists level_bests_environment_check;
alter table public.level_bests add constraint level_bests_environment_check
  check (environment in ('local', 'production', 'legacy'));

alter table public.player_bests drop constraint if exists player_bests_pkey;
alter table public.player_bests add constraint player_bests_pkey primary key (user_id, environment);
alter table public.level_bests drop constraint if exists level_bests_pkey;
alter table public.level_bests add constraint level_bests_pkey primary key (user_id, level_id, environment);

create index if not exists level_bests_rank_idx
  on public.level_bests (level_id, best_score desc, achieved_at asc);
create index if not exists score_submissions_environment_rank_idx
  on public.score_submissions (environment, score desc, created_at asc);
create index if not exists level_score_submissions_environment_rank_idx
  on public.level_score_submissions (environment, level_id, score desc, created_at asc);
create index if not exists player_bests_environment_rank_idx
  on public.player_bests (environment, best_score desc, achieved_at asc);
create index if not exists level_bests_environment_rank_idx
  on public.level_bests (environment, level_id, best_score desc, achieved_at asc);

alter table public.profiles enable row level security;
alter table public.score_submissions enable row level security;
alter table public.player_bests enable row level security;
alter table public.level_score_submissions enable row level security;
alter table public.level_bests enable row level security;

drop policy if exists "players read own profile" on public.profiles;
create policy "players read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "players create own profile" on public.profiles;
create policy "players create own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "players update own profile" on public.profiles;
create policy "players update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "players read own submissions" on public.score_submissions;
create policy "players read own submissions"
  on public.score_submissions for select to authenticated
  using ((select auth.uid()) = user_id);

-- Nessuna tabella espone scritture dirette. La classifica globale passa dalla RPC
-- get_leaderboard, che restituisce soltanto i campi utili all'interfaccia.
drop policy if exists "world records are public" on public.player_bests;
drop policy if exists "players read own best" on public.player_bests;
create policy "players read own best"
  on public.player_bests for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "players read own level submissions" on public.level_score_submissions;
create policy "players read own level submissions"
  on public.level_score_submissions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "players read own level bests" on public.level_bests;
create policy "players read own level bests"
  on public.level_bests for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
revoke all on public.score_submissions from anon, authenticated;
revoke all on public.player_bests from anon, authenticated;
revoke all on public.level_score_submissions from anon, authenticated;
revoke all on public.level_bests from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.score_submissions to authenticated;
grant select on public.player_bests to authenticated;
grant select on public.level_score_submissions to authenticated;
grant select on public.level_bests to authenticated;

create or replace function public.sync_best_nickname()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.player_bests
  set nickname = new.nickname
  where user_id = new.id;
  update public.level_bests
  set nickname = new.nickname
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_best_nickname on public.profiles;
create trigger profiles_sync_best_nickname
after update of nickname on public.profiles
for each row execute function public.sync_best_nickname();

revoke all on function public.sync_best_nickname() from public, anon, authenticated;

drop function if exists public.submit_score(integer, text, integer, jsonb);
drop function if exists public.submit_score(integer, text, integer, jsonb, jsonb);
drop function if exists public.submit_score(integer, text, integer, jsonb, jsonb, text);
create function public.submit_score(
  p_score integer,
  p_mode text,
  p_duration_ms integer,
  p_level_scores jsonb,
  p_level_ids jsonb,
  p_environment text
)
returns table(best_score integer, games_played integer, world_position bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_average numeric;
  v_best integer;
  v_games integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_score not between 0 and 100 then raise exception 'invalid score'; end if;
  if p_mode not in ('solo', 'challenge') then raise exception 'invalid mode'; end if;
  if p_environment not in ('local', 'production') then raise exception 'invalid environment'; end if;
  if p_duration_ms not between 1000 and 3600000 then raise exception 'invalid duration'; end if;
  if jsonb_typeof(p_level_scores) <> 'array' or jsonb_array_length(p_level_scores) <> 10 then
    raise exception 'exactly ten level scores are required';
  end if;
  if jsonb_typeof(p_level_ids) <> 'array' or jsonb_array_length(p_level_ids) <> 10 then
    raise exception 'exactly ten level ids are required';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_level_scores) as item(value)
    where jsonb_typeof(value) <> 'number'
       or (value::text)::numeric not between 0 and 100
  ) then raise exception 'invalid level score'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_level_ids) as item(value)
    where jsonb_typeof(value) <> 'string'
       or (value #>> '{}') !~ '^[a-z0-9][a-z0-9-]{0,79}$'
  ) then raise exception 'invalid level id'; end if;
  if (
    select count(distinct value #>> '{}')
    from jsonb_array_elements(p_level_ids) as item(value)
  ) <> 10 then raise exception 'duplicate level id'; end if;

  select avg((value::text)::numeric)
  into v_average
  from jsonb_array_elements(p_level_scores) as item(value);
  if abs(round(v_average) - p_score) > 1 then raise exception 'score average mismatch'; end if;

  if exists (
    select 1 from public.score_submissions
    where user_id = v_user_id
      and environment = p_environment
      and created_at > now() - interval '5 seconds'
  ) then raise exception 'submit rate limit'; end if;

  select nickname into v_nickname from public.profiles where id = v_user_id;
  if v_nickname is null then raise exception 'profile required'; end if;

  insert into public.score_submissions(user_id, environment, score, mode, duration_ms, level_scores)
  values (v_user_id, p_environment, p_score, p_mode, p_duration_ms, p_level_scores);

  insert into public.player_bests(user_id, environment, nickname, best_score, games_played, total_score)
  values (v_user_id, p_environment, v_nickname, p_score, 1, p_score)
  on conflict (user_id, environment) do update set
    nickname = excluded.nickname,
    best_score = greatest(public.player_bests.best_score, excluded.best_score),
    games_played = public.player_bests.games_played + 1,
    total_score = public.player_bests.total_score + excluded.best_score,
    achieved_at = case
      when excluded.best_score > public.player_bests.best_score then now()
      else public.player_bests.achieved_at
    end,
    last_played_at = now();

  insert into public.level_score_submissions(user_id, environment, level_id, score, mode, duration_ms)
  select
    v_user_id,
    p_environment,
    level_item.value #>> '{}',
    (score_item.value::text)::integer,
    p_mode,
    greatest(50, least(900000, p_duration_ms / 10))
  from jsonb_array_elements(p_level_ids) with ordinality as level_item(value, ordinal)
  join jsonb_array_elements(p_level_scores) with ordinality as score_item(value, ordinal)
    using (ordinal);

  insert into public.level_bests(user_id, environment, level_id, nickname, best_score, attempts, total_score)
  select
    v_user_id,
    p_environment,
    level_item.value #>> '{}',
    v_nickname,
    (score_item.value::text)::integer,
    1,
    (score_item.value::text)::integer
  from jsonb_array_elements(p_level_ids) with ordinality as level_item(value, ordinal)
  join jsonb_array_elements(p_level_scores) with ordinality as score_item(value, ordinal)
    using (ordinal)
  on conflict (user_id, level_id, environment) do update set
    nickname = excluded.nickname,
    best_score = greatest(public.level_bests.best_score, excluded.best_score),
    attempts = public.level_bests.attempts + 1,
    total_score = public.level_bests.total_score + excluded.best_score,
    achieved_at = case
      when excluded.best_score > public.level_bests.best_score then now()
      else public.level_bests.achieved_at
    end,
    last_played_at = now();

  select pb.best_score, pb.games_played
  into v_best, v_games
  from public.player_bests pb
  where pb.user_id = v_user_id and pb.environment = p_environment;

  return query
  select v_best,
         v_games,
         1 + count(*)::bigint
  from public.player_bests pb
  where pb.environment = p_environment
    and (pb.best_score > v_best
     or (pb.best_score = v_best and pb.achieved_at < (
       select mine.achieved_at from public.player_bests mine
       where mine.user_id = v_user_id and mine.environment = p_environment
     )));
end;
$$;

drop function if exists public.submit_level_score(text, integer, integer);
drop function if exists public.submit_level_score(text, integer, integer, text);
create function public.submit_level_score(
  p_level_id text,
  p_score integer,
  p_duration_ms integer,
  p_environment text
)
returns table(best_score integer, attempts integer, world_position bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_best integer;
  v_attempts integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_level_id !~ '^[a-z0-9][a-z0-9-]{0,79}$' then raise exception 'invalid level id'; end if;
  if p_score not between 0 and 100 then raise exception 'invalid score'; end if;
  if p_duration_ms not between 50 and 900000 then raise exception 'invalid duration'; end if;
  if p_environment not in ('local', 'production') then raise exception 'invalid environment'; end if;

  if exists (
    select 1 from public.level_score_submissions
    where user_id = v_user_id
      and environment = p_environment
      and mode = 'training'
      and created_at > now() - interval '250 milliseconds'
  ) then raise exception 'submit rate limit'; end if;

  select nickname into v_nickname from public.profiles where id = v_user_id;
  if v_nickname is null then raise exception 'profile required'; end if;

  insert into public.level_score_submissions(user_id, environment, level_id, score, mode, duration_ms)
  values (v_user_id, p_environment, p_level_id, p_score, 'training', p_duration_ms);

  insert into public.level_bests(user_id, environment, level_id, nickname, best_score, attempts, total_score)
  values (v_user_id, p_environment, p_level_id, v_nickname, p_score, 1, p_score)
  on conflict (user_id, level_id, environment) do update set
    nickname = excluded.nickname,
    best_score = greatest(public.level_bests.best_score, excluded.best_score),
    attempts = public.level_bests.attempts + 1,
    total_score = public.level_bests.total_score + excluded.best_score,
    achieved_at = case
      when excluded.best_score > public.level_bests.best_score then now()
      else public.level_bests.achieved_at
    end,
    last_played_at = now();

  select lb.best_score, lb.attempts
  into v_best, v_attempts
  from public.level_bests lb
  where lb.user_id = v_user_id
    and lb.level_id = p_level_id
    and lb.environment = p_environment;

  return query
  select
    v_best,
    v_attempts,
    1 + count(*)::bigint
  from public.level_bests lb
  where lb.level_id = p_level_id
    and lb.environment = p_environment
    and (
      lb.best_score > v_best
      or (lb.best_score = v_best and lb.achieved_at < (
        select mine.achieved_at
        from public.level_bests mine
        where mine.user_id = v_user_id
          and mine.level_id = p_level_id
          and mine.environment = p_environment
      ))
    );
end;
$$;

drop function if exists public.get_leaderboard(text);
drop function if exists public.get_leaderboard(text, text);
create function public.get_leaderboard(p_period text, p_environment text)
returns table(
  rank_position bigint,
  nickname text,
  best_score integer,
  games_played bigint,
  average_score numeric,
  achieved_at timestamptz,
  is_current_player boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  with period_scores as (
    select s.*
    from public.score_submissions s
    where s.environment = p_environment
      and case p_period
        when 'today' then s.created_at >= date_trunc('day', now())
        when 'week' then s.created_at >= now() - interval '7 days'
        else true
      end
  ), aggregated as (
    select
      s.user_id,
      p.nickname,
      max(s.score)::integer as best_score,
      count(*)::bigint as games_played,
      round(avg(s.score), 1) as average_score,
      min(s.created_at) filter (where s.score = (
        select max(s2.score) from period_scores s2 where s2.user_id = s.user_id
      )) as achieved_at
    from period_scores s
    join public.profiles p on p.id = s.user_id
    group by s.user_id, p.nickname
  ), ranked as (
    select
      row_number() over (order by a.best_score desc, a.achieved_at asc) as rank_position,
      a.*
    from aggregated a
  )
  select
    r.rank_position,
    r.nickname,
    r.best_score,
    r.games_played,
    r.average_score,
    r.achieved_at,
    r.user_id = auth.uid() as is_current_player
  from ranked r
  where r.rank_position <= 100 or r.user_id = auth.uid()
  order by r.rank_position;
$$;

drop function if exists public.get_level_leaderboard(text);
drop function if exists public.get_level_leaderboard(text, text);
create function public.get_level_leaderboard(p_level_id text, p_environment text)
returns table(
  rank_position bigint,
  nickname text,
  best_score integer,
  attempts bigint,
  average_score numeric,
  achieved_at timestamptz,
  is_current_player boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  with ranked as (
    select
      row_number() over (order by lb.best_score desc, lb.achieved_at asc) as rank_position,
      lb.*
    from public.level_bests lb
    where lb.level_id = p_level_id
      and lb.environment = p_environment
  )
  select
    r.rank_position,
    r.nickname,
    r.best_score::integer,
    r.attempts::bigint,
    round(r.total_score::numeric / r.attempts, 1) as average_score,
    r.achieved_at,
    r.user_id = auth.uid() as is_current_player
  from ranked r
  where r.rank_position <= 100 or r.user_id = auth.uid()
  order by r.rank_position;
$$;

revoke all on function public.submit_score(integer, text, integer, jsonb, jsonb, text) from public, anon;
grant execute on function public.submit_score(integer, text, integer, jsonb, jsonb, text) to authenticated;
revoke all on function public.submit_level_score(text, integer, integer, text) from public, anon;
grant execute on function public.submit_level_score(text, integer, integer, text) to authenticated;
revoke all on function public.get_leaderboard(text, text) from public;
grant execute on function public.get_leaderboard(text, text) to authenticated;
revoke all on function public.get_level_leaderboard(text, text) from public;
grant execute on function public.get_level_leaderboard(text, text) to authenticated;

-- Canali privati QUASI!: l'identificativo della stanza è un token casuale ad alta entropia.
drop policy if exists "quasi realtime receive" on realtime.messages;
create policy "quasi realtime receive"
  on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) like 'quasi:%'
    and realtime.messages.extension in ('broadcast', 'presence')
  );

drop policy if exists "quasi realtime send" on realtime.messages;
create policy "quasi realtime send"
  on realtime.messages for insert to authenticated
  with check (
    (select realtime.topic()) like 'quasi:%'
    and realtime.messages.extension in ('broadcast', 'presence')
  );
