import { centavos, parseData } from '../domain'
import type { Cartao, Categoria, DataISO, Lancamento, Meta, Recorrencia } from '../domain'

export type LinhaCartao = {
  id: string; nome: string; dia_fechamento: number; dia_vencimento: number; pluggy_conta_id: string | null
  limite_centavos?: number | string | null; disponivel_centavos?: number | string | null; final?: string | null
}
export type LinhaCategoria = { id: string; nome: string; cor: string }
export type LinhaLancamento = {
  id: string
  natureza: string
  descricao: string
  valor_centavos: number | string
  categoria_id: string | null
  cartao_id: string | null
  recorrencia_tipo: string
  data: string | null
  inicio: string | null
  fim: string | null
  parcelas: number | null
}

export type LinhaMeta = { id: string; nome: string; meta_centavos: number | string; saldo_centavos: number | string; saldo_em: string }

const dia = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 31
const dataOk = (d: string | null): d is DataISO => d !== null && parseData(d) !== null

// bigint chega como texto do PostgREST
const centavosOuNull = (v: number | string | null | undefined) => (v === null || v === undefined || !Number.isSafeInteger(Number(v)) ? null : centavos(Number(v)))

export function lerCartao(r: LinhaCartao): Cartao {
  if (!dia(r.dia_fechamento) || !dia(r.dia_vencimento)) throw new Error(`cartão inválido: ${r.id}`)
  return {
    id: r.id, nome: r.nome, diaFechamento: r.dia_fechamento, diaVencimento: r.dia_vencimento, pluggyContaId: r.pluggy_conta_id,
    limite: centavosOuNull(r.limite_centavos), disponivel: centavosOuNull(r.disponivel_centavos), final: r.final ?? null,
  }
}

export function lerMeta(r: LinhaMeta): Meta {
  const meta = Number(r.meta_centavos), saldo = Number(r.saldo_centavos)
  if (!Number.isSafeInteger(meta) || meta <= 0) throw new Error(`meta inválida: ${r.id}`)
  if (!Number.isSafeInteger(saldo) || saldo < 0) throw new Error(`saldo de meta inválido: ${r.id}`)
  if (!dataOk(r.saldo_em)) throw new Error(`data de meta inválida: ${r.id}`)
  return { id: r.id, nome: r.nome, meta: centavos(meta), saldo: centavos(saldo), saldoEm: r.saldo_em }
}

// O código de tabela ausente (PGRST205) é tolerado para o app subir antes da migração 0003; qualquer outro erro derruba.
export function linhasOuVazio<T>(r: { data: T[] | null; error: { message: string; code?: string } | null }): T[] {
  if (r.error) {
    if (r.error.code === 'PGRST205') return []
    throw new Error(r.error.message)
  }
  return r.data ?? []
}

export const lerCategoria = (r: LinhaCategoria): Categoria => ({ id: r.id, nome: r.nome, cor: r.cor })

function lerRecorrencia(r: LinhaLancamento): Recorrencia {
  switch (r.recorrencia_tipo) {
    case 'unica':
      if (dataOk(r.data)) return { tipo: 'unica', data: r.data }
      break
    case 'mensal':
      if (dataOk(r.inicio) && (r.fim === null || dataOk(r.fim))) return { tipo: 'mensal', inicio: r.inicio, fim: r.fim }
      break
    case 'parcelada':
      if (dataOk(r.data) && Number.isInteger(r.parcelas) && r.parcelas! >= 2) return { tipo: 'parcelada', dataCompra: r.data, parcelas: r.parcelas! }
      break
  }
  throw new Error(`recorrência inválida: ${r.id}`)
}

export function lerLancamento(r: LinhaLancamento): Lancamento {
  if (r.natureza !== 'receita' && r.natureza !== 'despesa') throw new Error(`natureza inválida: ${r.id}`)
  const valor = Number(r.valor_centavos)
  if (!Number.isSafeInteger(valor) || valor <= 0) throw new Error(`valor inválido: ${r.id}`)
  if (r.cartao_id && r.natureza !== 'despesa') throw new Error(`cartão em receita: ${r.id}`)
  return {
    id: r.id, natureza: r.natureza, descricao: r.descricao, valor: centavos(valor),
    categoriaId: r.categoria_id, cartaoId: r.cartao_id, recorrencia: lerRecorrencia(r),
  }
}

export function paraLinha(l: Omit<Lancamento, 'id'>): Omit<LinhaLancamento, 'id'> {
  const r = l.recorrencia
  return {
    natureza: l.natureza, descricao: l.descricao, valor_centavos: l.valor,
    categoria_id: l.categoriaId, cartao_id: l.cartaoId, recorrencia_tipo: r.tipo,
    data: r.tipo === 'unica' ? r.data : r.tipo === 'parcelada' ? r.dataCompra : null,
    inicio: r.tipo === 'mensal' ? r.inicio : null,
    fim: r.tipo === 'mensal' ? r.fim : null,
    parcelas: r.tipo === 'parcelada' ? r.parcelas : null,
  }
}

// Linha inválida não derruba a tela inteira: vai para `rejeitadas` e a UI avisa.
export function lerLista<L, T>(linhas: L[], ler: (l: L) => T): { ok: T[]; rejeitadas: string[] } {
  const ok: T[] = [], rejeitadas: string[] = []
  for (const l of linhas) {
    try { ok.push(ler(l)) } catch (e) { rejeitadas.push((e as Error).message) }
  }
  return { ok, rejeitadas }
}
