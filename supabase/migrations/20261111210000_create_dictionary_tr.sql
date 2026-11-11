-- Wiktionary'den alınan İngilizce → Türkçe karşılıklar (CC BY-SA 4.0).
-- Kelimeye özgü değil, tüm kullanıcılar için ortak önbellek. Yalnızca
-- wiktionary-tr Edge Function'ı (service role) yazar; giriş yapmış kullanıcılar okur.

create table public.dictionary_tr (
  word       text primary key check (char_length(word) between 1 and 100),
  lemma      text check (lemma is null or char_length(lemma) <= 100),
  senses     jsonb not null default '[]'::jsonb check (jsonb_typeof(senses) = 'array'),
  page_url   text not null default '',
  fetched_at timestamptz not null default now()
);

comment on table public.dictionary_tr is 'Wiktionary (CC BY-SA 4.0) Türkçe karşılık önbelleği; senses = [{pos, gloss, translations[]}].';

alter table public.dictionary_tr enable row level security;

revoke all on public.dictionary_tr from anon, authenticated;
grant select on public.dictionary_tr to authenticated;

create policy "dictionary_tr_read" on public.dictionary_tr
  for select to authenticated
  using (true);
