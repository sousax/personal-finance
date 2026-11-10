-- Categoria passa a ter tipo, ícone e limite mensal (só faz sentido em despesa)
alter table public.categorias
  add column tipo text not null default 'despesa' check (tipo in ('despesa', 'receita')),
  add column emoji text check (char_length(emoji) <= 16),
  add column limite_centavos bigint check (limite_centavos > 0);
