create extension if not exists pgcrypto;

create table if not exists vocab_cards (
  id uuid primary key default gen_random_uuid(),
  pinyin text not null unique,
  english text not null,
  hanzi text,
  category text,
  notes text,
  example_pinyin text,
  example_english text,
  created_at timestamptz default now()
);

create table if not exists srs_state (
  card_id uuid primary key references vocab_cards(id) on delete cascade,
  interval integer not null default 1,
  ease_factor double precision not null default 2.5,
  due_date date not null default current_date,
  repetitions integer not null default 0,
  state text not null default 'new',
  again_count integer not null default 0,
  suspended boolean not null default false,
  last_reviewed timestamptz
);

create table if not exists app_settings (
  id text primary key,
  new_cards_per_day integer not null default 20,
  default_direction text not null default 'random',
  deepseek_model text not null default 'deepseek-chat',
  updated_at timestamptz default now()
);

create or replace function create_srs_state_for_vocab_card()
returns trigger
language plpgsql
as $$
begin
  insert into srs_state (card_id)
  values (new.id)
  on conflict (card_id) do nothing;

  return new;
end;
$$;

drop trigger if exists vocab_cards_create_srs_state on vocab_cards;

create trigger vocab_cards_create_srs_state
after insert on vocab_cards
for each row
execute function create_srs_state_for_vocab_card();

insert into app_settings (id)
values ('default')
on conflict (id) do nothing;
