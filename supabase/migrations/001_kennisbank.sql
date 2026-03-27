-- =====================================================
-- Boer Transitie Scanner — Kennisbank RAG
-- Voer dit uit in: Supabase dashboard → SQL Editor
-- =====================================================

-- 1. pgvector extensie aanzetten
create extension if not exists vector;

-- 2. Kennisbank chunks tabel
create table if not exists kennisbank_chunks (
  id            bigserial primary key,
  provincie     text not null,          -- 'Gelderland', 'Overijssel', etc.
  document      text not null,          -- 'omgevingsverordening_gelderland'
  sectie        text,                   -- sectiontitel uit de PDF
  tekst         text not null,          -- de chunk (~400-600 tokens)
  thema         text[],                 -- ['landgoed', 'vab', 'rood_voor_rood', 'nnn']
  pagina        int,                    -- paginanummer in bron-PDF
  embedding     vector(384),            -- multilingual-e5-small (384 dims)
  created_at    timestamptz default now()
);

-- 3. Index voor snelle similarity search (IVFFlat)
--    Pas lists aan naar ~sqrt(aantal_rows) zodra je >1000 chunks hebt
create index if not exists kennisbank_chunks_embedding_idx
  on kennisbank_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Index op provincie voor gefilterde zoekopdrachten
create index if not exists kennisbank_chunks_provincie_idx
  on kennisbank_chunks (provincie);

-- 4. Similarity search functie
--    Aanroepen vanuit de app of Edge Function
create or replace function zoek_kennisbank(
  query_embedding   vector(384),
  filter_provincie  text default null,
  filter_thema      text default null,
  max_resultaten    int  default 4,
  min_similarity    float default 0.3
)
returns table (
  id          bigint,
  provincie   text,
  sectie      text,
  tekst       text,
  thema       text[],
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.provincie,
    kc.sectie,
    kc.tekst,
    kc.thema,
    1 - (kc.embedding <=> query_embedding) as similarity
  from kennisbank_chunks kc
  where
    (filter_provincie is null or kc.provincie = filter_provincie)
    and (filter_thema is null or filter_thema = any(kc.thema))
    and 1 - (kc.embedding <=> query_embedding) > min_similarity
  order by kc.embedding <=> query_embedding
  limit max_resultaten;
end;
$$;

-- 5. RLS uitschakelen voor kennisbank (publiek leesbaar, alleen server schrijft)
alter table kennisbank_chunks enable row level security;

create policy "Publiek leesbaar"
  on kennisbank_chunks for select
  using (true);

-- Schrijven alleen via service role (vanuit indexeer-script)
-- Geen insert/update policy voor anon

-- =====================================================
-- Klaar. Voer daarna het Python indexeer-script uit.
-- =====================================================
