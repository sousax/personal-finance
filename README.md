# Controle Financeiro

Receitas, assinaturas, compras parceladas e gastos avulsos, com saldo por mês e parcelas futuras. React + Vite + Supabase.

## Rodar local

1. Crie um projeto em https://supabase.com (plano gratuito).
2. No painel, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/0001_init.sql` e execute.
3. Em **Project Settings > API**, copie a URL e a chave `anon`.
4. `cp .env.example .env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. `npm install && npm run dev`, depois abra http://localhost:5173.

Se o projeto exigir confirmação de e-mail, desative em **Authentication > Providers > Email** ou confirme pelo link recebido.

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Na Vercel, **Add New > Project** e importe o repositório (preset Vite é detectado).
3. Em **Environment Variables**, defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Não há rotas, então nenhum rewrite é necessário.

## Testes

`npm test`. As regras de cartão e de projeção ficam em `src/domain` (TypeScript puro).

## Sincronização bancária (Meu Pluggy)

O botão **Sincronizar** em Lançamentos traz as transações do mês corrente do Meu Pluggy. Rodar de novo não duplica: cada transação externa fica registrada em `transacoes_externas`, mesmo depois de o lançamento ser excluído.

1. Aplique `supabase/migrations/0002_pluggy.sql` (SQL Editor, como na migração 0001).
2. Na Vercel, defina `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS` (separados por vírgula) e `PLUGGY_USER_ID` (o id do seu usuário no Supabase). Só esse usuário pode sincronizar. O segredo fica só em `api/pluggy.ts`, nunca no navegador.
3. `npm run dev` não serve `/api`. Use `vercel dev` ou a produção.

O Meu Pluggy atualiza a cada 24 horas e não dá para forçar. O consentimento expira após um ano e precisa ser renovado no Meu Pluggy.
