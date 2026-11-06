alter table public.cartoes add column pluggy_conta_id text;
alter table public.cartoes add constraint cartoes_pluggy_conta_unica unique (user_id, pluggy_conta_id);

alter table public.lancamentos add constraint lancamentos_id_user_unico unique (id, user_id);

-- Cada transação externa é resolvida uma vez. Excluir o lançamento mantém a linha (lancamento_id vira null),
-- então importação excluída não volta.
create table public.transacoes_externas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  externo_id text not null,
  lancamento_id uuid,
  ocorrencia text,
  created_at timestamptz not null default now(),
  primary key (user_id, externo_id),
  foreign key (lancamento_id, user_id) references public.lancamentos (id, user_id) on delete set null (lancamento_id)
);

create index on public.transacoes_externas (user_id, lancamento_id);

alter table public.transacoes_externas enable row level security;
create policy transacoes_externas_own on public.transacoes_externas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.transacoes_externas to authenticated;

create function public.importar_transacoes(p_lancamentos jsonb, p_vinculos jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.lancamentos (id, user_id, natureza, descricao, valor_centavos, categoria_id, cartao_id,
                                  recorrencia_tipo, data, inicio, fim, parcelas)
  select id, auth.uid(), natureza, descricao, valor_centavos, categoria_id, cartao_id,
         recorrencia_tipo, data, inicio, fim, parcelas
  from jsonb_populate_recordset(null::public.lancamentos, p_lancamentos);

  insert into public.transacoes_externas (user_id, externo_id, lancamento_id, ocorrencia)
  select auth.uid(), externo_id, lancamento_id, ocorrencia
  from jsonb_to_recordset(p_vinculos) as v (externo_id text, lancamento_id uuid, ocorrencia text)
  on conflict do nothing;
$$;

revoke execute on function public.importar_transacoes(jsonb, jsonb) from public, anon;
grant execute on function public.importar_transacoes(jsonb, jsonb) to authenticated;
