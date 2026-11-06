-- Meta de cada caixinha. saldo_centavos é o saldo informado pelo usuário em saldo_em;
-- o saldo atual soma a ele a movimentação da caixinha depois dessa data.
create table public.metas_caixinhas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  meta_centavos bigint not null check (meta_centavos > 0),
  saldo_centavos bigint not null default 0 check (saldo_centavos >= 0),
  saldo_em date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create index on public.metas_caixinhas (user_id);

alter table public.metas_caixinhas enable row level security;

create policy metas_caixinhas_own on public.metas_caixinhas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.metas_caixinhas to authenticated;
