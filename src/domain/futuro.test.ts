import { describe, expect, it } from 'vitest'
import { centavos, parcelasNaJanela } from './index'
import type { Lancamento } from './index'

const parcelada = (id: string, dataCompra: string, parcelas: number, reais: number, cartaoId: string | null = null): Lancamento => ({
  id, natureza: 'despesa', descricao: id, valor: centavos(reais * 100), categoriaId: null, cartaoId, recorrencia: { tipo: 'parcelada', dataCompra, parcelas },
})

describe('parcelasNaJanela', () => {
  it('posiciona cada parcela no mês, mede o fim fora da janela e soma o restante a partir da janela', () => {
    const r = parcelasNaJanela([
      parcelada('Notebook', '2026-04-20', 10, 1000),
      parcelada('Air fryer', '2026-12-05', 2, 170),
      parcelada('Quitada', '2026-01-10', 3, 30),
    ], [], { ano: 2026, mes: 11 }, 6)
    expect(r.map((c) => [c.lancamento.id, c.inicio, c.fim, c.parcelaNoMes, c.restante])).toEqual([
      ['Notebook', 0, 2, [8, 9, 10, null, null, null], 30000],
      ['Air fryer', 1, 2, [null, 1, 2, null, null, null], 17000],
    ])
    expect(r[0]!.valorNoMes).toEqual([10000, 10000, 10000, 0, 0, 0])
    const longa = parcelasNaJanela([parcelada('Moto', '2025-08-10', 48, 4800)], [], { ano: 2026, mes: 11 }, 6)[0]!
    expect([longa.fim > 5, longa.parcelaNoMes[0], longa.restante]).toEqual([true, 16, 330000])
  })

  it('cartão: parcela cai no vencimento da fatura', () => {
    const nu = { id: 'nu', nome: 'Nu', diaFechamento: 3, diaVencimento: 10, pluggyContaId: null }
    const [c] = parcelasNaJanela([parcelada('Fone', '2026-11-05', 3, 90, 'nu')], [nu], { ano: 2026, mes: 11 }, 6)
    expect([c!.inicio, c!.fim]).toEqual([1, 3])
  })
})
