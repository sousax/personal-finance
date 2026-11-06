import { describe, expect, it } from 'vitest'
import { lerCartao, lerLancamento, lerLista, lerMeta, linhasOuVazio, paraLinha } from './linhas'
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
    const r = lerLista([{ id: 'a', nome: 'n', dia_fechamento: 0, dia_vencimento: 5, pluggy_conta_id: null }, { id: 'b', nome: 'n', dia_fechamento: 5, dia_vencimento: 12, pluggy_conta_id: null }], lerCartao)
    expect(r.ok).toHaveLength(1)
    expect(r.rejeitadas).toHaveLength(1)
  })
})

describe('lerMeta', () => {
  const linha = { id: 'm', nome: 'Viagem', meta_centavos: '500000', saldo_centavos: 120000, saldo_em: '2025-03-10' }
  it('converte bigint em string para centavos', () => {
    expect(lerMeta(linha)).toEqual({ id: 'm', nome: 'Viagem', meta: 500000, saldo: 120000, saldoEm: '2025-03-10' })
  })
  it('rejeita meta <= 0, saldo negativo e data impossível', () => {
    expect(() => lerMeta({ ...linha, meta_centavos: 0 })).toThrow()
    expect(() => lerMeta({ ...linha, saldo_centavos: -1 })).toThrow()
    expect(() => lerMeta({ ...linha, saldo_em: '2025-02-30' })).toThrow()
  })
})

describe('linhasOuVazio', () => {
  it('trata tabela fora do cache do PostgREST como lista vazia', () => {
    expect(linhasOuVazio({ data: null, error: { message: 'Could not find the table', code: 'PGRST205' } })).toEqual([])
  })
  it('qualquer outro erro continua derrubando', () => {
    expect(() => linhasOuVazio({ data: null, error: { message: 'permission denied', code: '42501' } })).toThrow('permission denied')
    expect(() => linhasOuVazio({ data: null, error: { message: 'sem código' } })).toThrow('sem código')
  })
  it('devolve as linhas quando não há erro', () => {
    expect(linhasOuVazio({ data: [1, 2], error: null })).toEqual([1, 2])
  })
})
