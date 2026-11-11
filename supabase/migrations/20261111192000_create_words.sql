-- Sözlook: kullanıcının kaydettiği kelimeler (Chrome eklentisi <-> iOS eşitlemesi).
-- Her kullanıcı için bir kelime tek satırdır. Silme, eşitlemenin diğer cihaza
-- yayılabilmesi için deleted_at ile işaretlenir (tombstone).

create table public.words (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word        text not null check (char_length(word) between 1 and 100),
  translation text not null default '' check (char_length(translation) <= 200),
  context     text not null default '' check (char_length(context) <= 1000),
  url         text not null default '' check (char_length(url) <= 2048),
  title       text not null default '' check (char_length(title) <= 500),
  saved_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint words_user_word_key unique (user_id, word)
);

comment on table public.words is 'Sözlook kayıtlı kelimeler; deleted_at dolu ise silinmiş (eşitleme için tutulur).';

-- Eşitleme: "şu andan sonra değişenleri getir" sorgusu için.
create index words_user_updated_idx on public.words (user_id, updated_at);

-- updated_at her zaman sunucu saatidir; istemci saatine güvenilmez.
create function public.words_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger words_set_updated_at
before insert or update on public.words
for each row execute function public.words_set_updated_at();

-- Erişim: yalnızca giriş yapmış kullanıcı, yalnızca kendi satırları.
alter table public.words enable row level security;

revoke all on public.words from anon;
grant select, insert, update, delete on public.words to authenticated;

create policy "words_select_own" on public.words
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "words_insert_own" on public.words
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "words_update_own" on public.words
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "words_delete_own" on public.words
  for delete to authenticated
  using ((select auth.uid()) = user_id);
