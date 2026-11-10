import { describe, expect, it } from 'vitest'
import { categoriaAprendida, centavos, mesmoNomeSemCategoria, planejarImportacao } from './index'
import type { ContaExterna, Lancamento, TransacaoExterna } from './index'

const lanc = (id: string, descricao: string, data: string, categoriaId: string | null, natureza: Lancamento['natureza'] = 'despesa'): Lancamento => ({
  id, natureza, descricao, valor: centavos(1000), categoriaId, cartaoId: null, recorrencia: { tipo: 'unica', data },
})

describe('categoriaAprendida', () => {
  it('casa sem prefixo bancário, acento e caixa, e usa a categoria mais recente', () => {
    const ls = [lanc('a', 'Pix enviado | Mariana Côsta', '2026-09-01', 'pessoas'), lanc('b', 'pix enviado | MARIANA COSTA', '2026-10-01', 'familia'), lanc('c', 'Mariana Costa', '2026-11-01', null)]
    expect(categoriaAprendida(ls, 'despesa', 'Transferência enviada pelo Pix mariana costa')).toBe('familia')
    expect(categoriaAprendida(ls, 'receita', 'Pix recebido | Mariana Costa')).toBeNull()
    expect(categoriaAprendida(ls, 'despesa', 'Uber')).toBeNull()
  })

  it('aplica aos outros sem categoria com o mesmo nome', () => {
    const ls = [lanc('a', 'Uber *Trip', '2026-11-01', 'transporte'), lanc('b', 'UBER *TRIP', '2026-11-02', null), lanc('c', 'Uber *Trip', '2026-11-03', 'outra'), lanc('d', 'Uber Eats', '2026-11-03', null)]
    expect(mesmoNomeSemCategoria(ls, ls[0]!).map((l) => l.id)).toEqual(['b'])
  })

  it('a importação já cria o lançamento com a categoria aprendida', () => {
    const conta: ContaExterna = { id: 'cb', nome: 'Conta', tipo: 'BANK', fechamento: null, vencimento: null }
    const t: TransacaoExterna = { id: 't1', contaId: 'cb', descricao: 'UBER *TRIP', valor: 23.9, tipo: 'DEBIT', status: 'POSTED', data: '2026-11-10', categoria: null, operacao: null, parcela: null, totalParcelas: null, dataCompra: null, valorTotal: null }
    const plano = planejarImportacao({ transacoes: [t], contas: [conta], cartoes: [], lancamentos: [lanc('a', 'Uber *Trip', '2026-11-01', 'transporte')], vinculos: [], novoId: () => 'n1' })
    expect(plano.lancamentos[0]!.categoriaId).toBe('transporte')
  })
})
