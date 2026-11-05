import { describe, expect, it } from 'vitest'
import { lerCartao, lerLancamento, lerLista, paraLinha } from './linhas'
import type { LinhaLancamento } from './linhas'

const base: LinhaLancamento = {
  id: '1', natureza: 'despesa', descricao: 'x', valor_centavos: '12345', categoria_id: null, cartao_id: null,
  recorrencia_tipo: 'unica', data: '2025-02-10', inicio: null, fim: null, parcelas: null,
}

describe('lerLancamento', () => {
  it('converte bigint em string para centavos', () => {
    expect(lerLancamento(base).valor).toBe(12345)
  })
  it('rejeita recorrência incoerente, valor <= 0, data impossível e cartão em receita', () => {
    expect(() => lerLancamento({ ...base, data: null })).toThrow()
    expect(() => lerLancamento({ ...base, valor_centavos: 0 })).toThrow()
    expect(() => lerLancamento({ ...base, data: '2025-02-30' })).toThrow()
    expect(() => lerLancamento({ ...base, natureza: 'receita', cartao_id: 'c' })).toThrow()
    expect(() => lerLancamento({ ...base, recorrencia_tipo: 'parcelada', parcelas: 1 })).toThrow()
  })
  it('ida e volta de parcelada', () => {
    const l = lerLancamento({ ...base, recorrencia_tipo: 'parcelada', parcelas: 10 })
    expect(paraLinha(l)).toMatchObject({ recorrencia_tipo: 'parcelada', data: '2025-02-10', parcelas: 10, inicio: null })
  })
})

describe('lerLista', () => {
  it('separa linhas rejeitadas', () => {
    const r = lerLista([{ id: 'a', nome: 'n', dia_fechamento: 0, dia_vencimento: 5 }, { id: 'b', nome: 'n', dia_fechamento: 5, dia_vencimento: 12 }], lerCartao)
    expect(r.ok).toHaveLength(1)
    expect(r.rejeitadas).toHaveLength(1)
  })
})
