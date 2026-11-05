import { describe, expect, it } from 'vitest'
import { centavos, comprometidoFuturo, dividirParcelas, mesDoPagamento, ocorrenciasDoMes, parseValor, resumirMes } from './index'
import type { Cartao, Lancamento } from './index'

const cartao: Cartao = { id: 'c1', nome: 'Nu', diaFechamento: 5, diaVencimento: 12 }
const l = (p: Partial<Lancamento> & Pick<Lancamento, 'recorrencia'>): Lancamento => ({
  id: 'x', natureza: 'despesa', descricao: 'Item', valor: centavos(10000), categoriaId: null, cartaoId: null, ...p,
})

describe('mesDoPagamento', () => {
  it('compra antes do fechamento vence no mês do fechamento', () => {
    expect(mesDoPagamento('2025-03-04', cartao, 0)).toEqual({ ano: 2025, mes: 3 })
  })
  it('compra no dia do fechamento ou depois vai para a fatura seguinte', () => {
    expect(mesDoPagamento('2025-03-05', cartao, 0)).toEqual({ ano: 2025, mes: 4 })
    expect(mesDoPagamento('2025-03-20', cartao, 0)).toEqual({ ano: 2025, mes: 4 })
  })
  it('vencimento <= fechamento rola para o mês seguinte', () => {
    const c = { ...cartao, diaFechamento: 20, diaVencimento: 5 }
    expect(mesDoPagamento('2025-03-10', c, 0)).toEqual({ ano: 2025, mes: 4 })
    expect(mesDoPagamento('2025-03-25', c, 0)).toEqual({ ano: 2025, mes: 5 })
  })
  it('dezembro vira janeiro', () => {
    expect(mesDoPagamento('2025-12-20', cartao, 0)).toEqual({ ano: 2026, mes: 1 })
    expect(mesDoPagamento('2025-12-04', cartao, 1)).toEqual({ ano: 2026, mes: 1 })
  })
  it('sem cartão usa o mês da data mais o deslocamento', () => {
    expect(mesDoPagamento('2025-11-30', null, 2)).toEqual({ ano: 2026, mes: 1 })
  })
})

describe('dividirParcelas', () => {
  it('100,00 em 3 = 33,34 + 33,33 + 33,33', () => {
    const p = dividirParcelas(centavos(10000), 3)
    expect(p).toEqual([3334, 3333, 3333])
    expect(p.reduce((a, b) => a + b, 0)).toBe(10000)
  })
})

describe('ocorrenciasDoMes', () => {
  const compra = l({ descricao: 'Notebook', valor: centavos(10000), cartaoId: 'c1', recorrencia: { tipo: 'parcelada', dataCompra: '2025-03-10', parcelas: 3 } })
  it('parcelada começa na fatura e numera as parcelas', () => {
    expect(ocorrenciasDoMes([compra], [cartao], { ano: 2025, mes: 4 }).map((o) => [o.descricao, o.valor])).toEqual([['Notebook (1/3)', 3334]])
    expect(ocorrenciasDoMes([compra], [cartao], { ano: 2025, mes: 6 }).map((o) => o.descricao)).toEqual(['Notebook (3/3)'])
    expect(ocorrenciasDoMes([compra], [cartao], { ano: 2025, mes: 7 })).toEqual([])
    expect(ocorrenciasDoMes([compra], [cartao], { ano: 2025, mes: 3 })).toEqual([])
  })
  it('mensal sem fim repete a partir do início', () => {
    const s = l({ recorrencia: { tipo: 'mensal', inicio: '2025-02-10', fim: null } })
    expect(ocorrenciasDoMes([s], [], { ano: 2025, mes: 1 })).toHaveLength(0)
    expect(ocorrenciasDoMes([s], [], { ano: 2025, mes: 2 })).toHaveLength(1)
    expect(ocorrenciasDoMes([s], [], { ano: 2030, mes: 9 })).toHaveLength(1)
  })
  it('mensal com fim para depois do mês do fim (inclusive)', () => {
    const s = l({ recorrencia: { tipo: 'mensal', inicio: '2025-02-10', fim: '2025-04-01' } })
    expect(ocorrenciasDoMes([s], [], { ano: 2025, mes: 4 })).toHaveLength(1)
    expect(ocorrenciasDoMes([s], [], { ano: 2025, mes: 5 })).toHaveLength(0)
  })
  it('mensal no cartão cai na fatura de cada mês', () => {
    const s = l({ cartaoId: 'c1', recorrencia: { tipo: 'mensal', inicio: '2025-03-01', fim: null } })
    expect(ocorrenciasDoMes([s], [cartao], { ano: 2025, mes: 3 })).toHaveLength(1)
    expect(ocorrenciasDoMes([s], [cartao], { ano: 2025, mes: 2 })).toHaveLength(0)
  })
  it('unica cai só no mês da data', () => {
    const u = l({ recorrencia: { tipo: 'unica', data: '2025-05-20' } })
    expect(ocorrenciasDoMes([u], [], { ano: 2025, mes: 5 })).toHaveLength(1)
    expect(ocorrenciasDoMes([u], [], { ano: 2025, mes: 6 })).toHaveLength(0)
  })
})

describe('resumirMes', () => {
  it('soma receitas, despesas, saldo e agrupa por categoria e cartão', () => {
    const ls = [
      l({ id: 'a', natureza: 'receita', valor: centavos(500000), recorrencia: { tipo: 'mensal', inicio: '2025-01-05', fim: null } }),
      l({ id: 'b', valor: centavos(3990), categoriaId: 'k1', cartaoId: 'c1', recorrencia: { tipo: 'mensal', inicio: '2025-01-01', fim: null } }),
      l({ id: 'c', valor: centavos(12000), categoriaId: 'k1', recorrencia: { tipo: 'unica', data: '2025-03-15' } }),
    ]
    const r = resumirMes(ls, [cartao], { ano: 2025, mes: 3 })
    expect(r.receitas).toBe(500000)
    expect(r.despesas).toBe(15990)
    expect(r.saldo).toBe(484010)
    expect(r.porCategoria.get('k1')).toBe(15990)
    expect(r.porCartao.get('c1')).toBe(3990)
  })
})

describe('comprometidoFuturo', () => {
  it('soma só parcelas nos próximos n meses', () => {
    const ls = [
      l({ valor: centavos(10000), recorrencia: { tipo: 'parcelada', dataCompra: '2025-01-10', parcelas: 3 } }),
      l({ id: 'm', recorrencia: { tipo: 'mensal', inicio: '2025-01-01', fim: null } }),
    ]
    const r = comprometidoFuturo(ls, [], { ano: 2025, mes: 2 }, 3)
    expect(r.map((x) => x.valor)).toEqual([3333, 3333, 0])
    expect(r[0]!.mes).toEqual({ ano: 2025, mes: 2 })
  })
})

describe('parseValor', () => {
  it('lê formato brasileiro', () => {
    expect(parseValor('1.234,56')).toBe(123456)
    expect(parseValor('39,9')).toBe(3990)
    expect(parseValor('5000')).toBe(500000)
    expect(parseValor('abc')).toBeNull()
    expect(parseValor('1.23,4')).toBeNull()
  })
})
