-- Retrato do Pluggy a cada sincronização; null em cartão manual ou banco que não informa
alter table public.cartoes
  add column limite_centavos bigint check (limite_centavos >= 0),
  add column disponivel_centavos bigint,
  add column final text check (final ~ '^\d{4}$');
