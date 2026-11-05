create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  cor text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  natureza text not null check (natureza in ('receita', 'despesa')),
  descricao text not null check (length(trim(descricao)) > 0),
  valor_centavos bigint not null check (valor_centavos > 0),
  categoria_id uuid,
  cartao_id uuid,
  recorrencia_tipo text not null check (recorrencia_tipo in ('unica', 'mensal', 'parcelada')),
  data date,
  inicio date,
  fim date,
  parcelas int,
  created_at timestamptz not null default now(),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete set null (categoria_id),
  foreign key (cartao_id, user_id) references public.cartoes (id, user_id) on delete restrict,
  check (cartao_id is null or natureza = 'despesa'),
  check (
    (recorrencia_tipo = 'unica' and data is not null and inicio is null and fim is null and parcelas is null)
    or (recorrencia_tipo = 'mensal' and inicio is not null and data is null and parcelas is null and (fim is null or fim >= inicio))
    or (recorrencia_tipo = 'parcelada' and data is not null and parcelas between 2 and 120 and inicio is null and fim is null)
  )
);

create index on public.lancamentos (user_id);
create index on public.cartoes (user_id);
create index on public.categorias (user_id);

alter table public.cartoes enable row level security;
alter table public.categorias enable row level security;
alter table public.lancamentos enable row level security;

create policy cartoes_own on public.cartoes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categorias_own on public.categorias for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lancamentos_own on public.lancamentos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
