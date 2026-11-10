import { describe, expect, it } from 'vitest'
import { centavos, parcelasTerminando, ultimosLancamentos, variacaoPorCategoria, visaoGeral } from './index'
import type { Lancamento, Ocorrencia, Recorrencia } from './index'

const oc = (descricao: string, reais: number, dia: number, categoriaId: string | null): Ocorrencia => ({
  lancamentoId: descricao, natureza: 'despesa', descricao, valor: centavos(reais * 100), categoriaId, cartaoId: null, mes: { ano: 2026, mes: 11 }, dia,
})
const lanc = (id: string, recorrencia: Recorrencia, reais = 100): Lancamento => ({
  id, natureza: 'despesa', descricao: id, valor: centavos(reais * 100), categoriaId: null, cartaoId: null, recorrencia,
})

describe('variacaoPorCategoria', () => {
  it('compara só o mesmo trecho do mês anterior e ignora caixinhas', () => {
    const atual = visaoGeral([oc('Mercado', 88, 5, 'merc'), oc('Dinheiro reservado Viagem', 500, 6, null)]).movimentos
    const anterior = visaoGeral([oc('Mercado', 100, 3, 'merc'), oc('Mercado', 400, 25, 'merc')]).movimentos
    expect(variacaoPorCategoria(atual, anterior, 1, 10)).toEqual([{ categoriaId: 'merc', atual: 8800, anterior: 10000, pct: -12 }])
  })
})

describe('parcelasTerminando', () => {
  it('só parcelas ativas no mês, da que termina antes, sem contar a deste mês', () => {
    const ls = [
      lanc('Notebook', { tipo: 'parcelada', dataCompra: '2026-09-20', parcelas: 10 }, 4500),
      lanc('Geladeira', { tipo: 'parcelada', dataCompra: '2026-10-20', parcelas: 6 }, 1680),
      lanc('Futura', { tipo: 'parcelada', dataCompra: '2026-12-01', parcelas: 3 }),
    ]
    const r = parcelasTerminando(ls, [], { ano: 2026, mes: 11 })
    expect(r.map((p) => [p.lancamento.id, p.ultimoMes, p.restantes, p.valorParcela])).toEqual([
      ['Geladeira', { ano: 2027, mes: 3 }, 4, 28000],
      ['Notebook', { ano: 2027, mes: 6 }, 7, 45000],
    ])
  })
})

describe('ultimosLancamentos', () => {
  it('usa a data do lançamento, com a mensal na última ocorrência até hoje', () => {
    const ls = [
      lanc('Antigo', { tipo: 'unica', data: '2026-10-01' }),
      lanc('Amanha', { tipo: 'unica', data: '2026-11-11' }),
      lanc('Academia', { tipo: 'mensal', inicio: '2026-01-18', fim: null }),
      lanc('Internet', { tipo: 'mensal', inicio: '2026-01-05', fim: null }),
      lanc('Encerrada', { tipo: 'mensal', inicio: '2026-01-05', fim: '2026-06-30' }),
    ]
    expect(ultimosLancamentos(ls, '2026-11-10', 3).map((x) => [x.lancamento.id, x.data])).toEqual([
      ['Internet', '2026-11-05'], ['Academia', '2026-10-18'], ['Antigo', '2026-10-01'],
    ])
  })
})
