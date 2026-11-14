-- Orbit schema. Plain Postgres + pgvector so it runs in the local container and in Supabase unchanged.
create extension if not exists vector;

create table if not exists crew (
  id text primary key,
  name text not null,
  role text not null default ''
);

create table if not exists vitals (
  id bigserial primary key,
  crew_id text not null references crew(id),
  ts timestamptz not null default now(),
  metrics jsonb not null
);
create index if not exists vitals_crew_ts on vitals (crew_id, ts desc);

create table if not exists checkins (
  id bigserial primary key,
  crew_id text not null references crew(id),
  ts timestamptz not null default now(),
  data jsonb not null
);

create table if not exists stat_events (
  id bigserial primary key,
  crew_id text not null references crew(id),
  ts timestamptz not null default now(),
  event jsonb not null
);
create index if not exists stat_events_crew on stat_events (crew_id, ts desc);

create table if not exists protocols (
  id text primary key,
  crew_id text references crew(id),
  data jsonb not null,
  created_at timestamptz not null default now(),
  acked_at timestamptz
);

create table if not exists emergencies (
  id text primary key,
  ts timestamptz not null default now(),
  data jsonb not null,
  resolved boolean not null default false
);

-- Pairwise crew conversations (from ship comms system) for per-member anomaly detection.
create table if not exists comms (
  id bigserial primary key,
  crew_id text not null references crew(id),
  peer_id text not null references crew(id),
  ts timestamptz not null default now(),
  minutes real not null,
  channel text not null
);
create index if not exists comms_crew_ts on comms (crew_id, ts desc);
create index if not exists comms_peer_ts on comms (peer_id, ts desc);

-- RAG knowledge base (psychology / countermeasure docs). 384 = multilingual-e5-small.
create table if not exists kb_chunks (
  id bigserial primary key,
  source text not null,
  title text not null default '',
  content text not null,
  embedding vector(384) not null
);
create index if not exists kb_chunks_embedding on kb_chunks using hnsw (embedding vector_cosine_ops);

create or replace function match_kb(query vector(384), k int default 5)
returns table (id bigint, source text, title text, content text, similarity float)
language sql stable as $$
  select id, source, title, content, 1 - (embedding <=> query) as similarity
  from kb_chunks order by embedding <=> query limit k;
$$;

-- Clients never talk to the DB directly (only the hub, as owner), so lock tables for anon/auth roles in Supabase.
alter table crew enable row level security;
alter table vitals enable row level security;
alter table checkins enable row level security;
alter table stat_events enable row level security;
alter table protocols enable row level security;
alter table emergencies enable row level security;
alter table kb_chunks enable row level security;
alter table comms enable row level security;
