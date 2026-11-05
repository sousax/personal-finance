import type { Cartao, Categoria, Lancamento } from '../domain'
import { supabase } from './supabase'
import { lerCartao, lerCategoria, lerLancamento, lerLista, paraLinha } from './linhas'
import type { LinhaCartao, LinhaCategoria, LinhaLancamento } from './linhas'

export type Dados = { cartoes: Cartao[]; categorias: Categoria[]; lancamentos: Lancamento[]; rejeitadas: string[] }

async function ok<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data as T
}

export async function carregar(): Promise<Dados> {
  const [c, k, l] = await Promise.all([
    ok<LinhaCartao[]>(supabase.from('cartoes').select('*').order('nome')),
    ok<LinhaCategoria[]>(supabase.from('categorias').select('*').order('nome')),
    ok<LinhaLancamento[]>(supabase.from('lancamentos').select('*').order('created_at')),
  ])
  const cartoes = lerLista(c, lerCartao)
  const lancamentos = lerLista(l, lerLancamento)
  return {
    cartoes: cartoes.ok,
    categorias: k.map(lerCategoria),
    lancamentos: lancamentos.ok,
    rejeitadas: [...cartoes.rejeitadas, ...lancamentos.rejeitadas],
  }
}

export const salvarCartao = (c: Omit<Cartao, 'id'> & { id?: string }) => {
  const linha = { nome: c.nome, dia_fechamento: c.diaFechamento, dia_vencimento: c.diaVencimento }
  return ok(supabase.from('cartoes').upsert(c.id ? { id: c.id, ...linha } : linha))
}

export const salvarCategoria = (c: Omit<Categoria, 'id'> & { id?: string }) =>
  ok(supabase.from('categorias').upsert(c.id ? { id: c.id, nome: c.nome, cor: c.cor } : { nome: c.nome, cor: c.cor }))

export const salvarLancamento = (l: Omit<Lancamento, 'id'> & { id?: string }) => {
  const linha = paraLinha(l)
  return ok(supabase.from('lancamentos').upsert(l.id ? { id: l.id, ...linha } : linha))
}

export const excluir = (tabela: 'cartoes' | 'categorias' | 'lancamentos', id: string) =>
  ok(supabase.from(tabela).delete().eq('id', id))
