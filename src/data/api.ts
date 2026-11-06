import { planejarCartoes, planejarImportacao } from '../domain'
import type { Cartao, Categoria, ContaExterna, Lancamento, Resumo, TransacaoExterna, Vinculo } from '../domain'
import { supabase } from './supabase'
import { lerCartao, lerCategoria, lerLancamento, lerLista, paraLinha } from './linhas'
import type { LinhaCartao, LinhaCategoria, LinhaLancamento } from './linhas'

export type Dados = { cartoes: Cartao[]; categorias: Categoria[]; lancamentos: Lancamento[]; vinculos: Vinculo[]; rejeitadas: string[] }

async function ok<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data as T
}

export async function carregar(): Promise<Dados> {
  const [c, k, l, v] = await Promise.all([
    ok<LinhaCartao[]>(supabase.from('cartoes').select('*').order('nome')),
    ok<LinhaCategoria[]>(supabase.from('categorias').select('*').order('nome')),
    ok<LinhaLancamento[]>(supabase.from('lancamentos').select('*').order('created_at')),
    ok<{ externo_id: string; lancamento_id: string | null; ocorrencia: string | null }[]>(supabase.from('transacoes_externas').select('externo_id, lancamento_id, ocorrencia')),
  ])
  const cartoes = lerLista(c, lerCartao)
  const lancamentos = lerLista(l, lerLancamento)
  return {
    cartoes: cartoes.ok,
    categorias: k.map(lerCategoria),
    lancamentos: lancamentos.ok,
    vinculos: v.map((x) => ({ externoId: x.externo_id, lancamentoId: x.lancamento_id, ocorrencia: x.ocorrencia })),
    rejeitadas: [...cartoes.rejeitadas, ...lancamentos.rejeitadas],
  }
}

export const salvarCartao = (c: Omit<Cartao, 'id' | 'pluggyContaId'> & { id?: string }) => {
  const linha: Record<string, unknown> = { nome: c.nome, dia_fechamento: c.diaFechamento, dia_vencimento: c.diaVencimento }
  if (c.id) linha.id = c.id
  return ok(supabase.from('cartoes').upsert(linha))
}

export const salvarCategoria = (c: Omit<Categoria, 'id'> & { id?: string }) =>
  ok(supabase.from('categorias').upsert({ ...(c.id ? { id: c.id } : {}), nome: c.nome, cor: c.cor }))

export const salvarLancamento = (l: Omit<Lancamento, 'id'> & { id?: string }) => {
  const linha: Record<string, unknown> = paraLinha(l)
  if (l.id) linha.id = l.id
  return ok(supabase.from('lancamentos').upsert(linha))
}

export const excluir = (tabela: 'cartoes' | 'categorias' | 'lancamentos', id: string) =>
  ok(supabase.from(tabela).delete().eq('id', id))

export async function sincronizar(dados: Dados, desde: string): Promise<{ resumo: Resumo; avisos: string[] }> {
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre novamente.')
  const r = await fetch('/api/pluggy', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ desde }),
  })
  const corpo = (await r.json().catch(() => null)) as { erro?: string; contas?: ContaExterna[]; transacoes?: TransacaoExterna[] } | null
  if (!r.ok || !corpo?.contas || !corpo.transacoes) throw new Error(corpo?.erro ?? `Falha na sincronização (${r.status}).`)

  const novoId = () => crypto.randomUUID()
  const novosCartoes = planejarCartoes(corpo.contas, dados.cartoes, novoId)
  if (novosCartoes.cartoes.length) {
    await ok(supabase.from('cartoes').upsert(novosCartoes.cartoes.map((c) => ({
      id: c.id, nome: c.nome, dia_fechamento: c.diaFechamento, dia_vencimento: c.diaVencimento, pluggy_conta_id: c.pluggyContaId,
    }))))
  }
  const cartoes = [...dados.cartoes.filter((c) => !novosCartoes.cartoes.some((n) => n.id === c.id)), ...novosCartoes.cartoes]
  const plano = planejarImportacao({ transacoes: corpo.transacoes, contas: corpo.contas, cartoes, lancamentos: dados.lancamentos, vinculos: dados.vinculos, novoId })
  if (plano.lancamentos.length || plano.vinculos.length) {
    await ok(supabase.rpc('importar_transacoes', {
      p_lancamentos: plano.lancamentos.map((l) => ({ id: l.id, ...paraLinha(l) })),
      p_vinculos: plano.vinculos.map((v) => ({ externo_id: v.externoId, lancamento_id: v.lancamentoId, ocorrencia: v.ocorrencia })),
    }))
  }
  return { resumo: plano.resumo, avisos: [...novosCartoes.avisos, ...plano.avisos] }
}
