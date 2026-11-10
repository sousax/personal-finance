import { describe, expect, it } from 'vitest'
import { centavos, ocorrenciasDoMes, planejarCartoes, planejarImportacao, resumirMes } from './index'
import type { Cartao, ContaExterna, Lancamento, TransacaoExterna, Vinculo } from './index'

const banco: ContaExterna = { id: 'cb', nome: 'Conta', tipo: 'BANK', fechamento: null, vencimento: null }
const credito: ContaExterna = { id: 'cc', nome: 'Nu', tipo: 'CREDIT', fechamento: '2026-03-05', vencimento: '2026-03-12' }
const nu: Cartao = { id: 'k1', nome: 'Nu', diaFechamento: 5, diaVencimento: 12, pluggyContaId: 'cc' }

let seq = 0
const novoId = () => `n${++seq}`
let tx = 0
const t = (p: Partial<TransacaoExterna>): TransacaoExterna => ({
  id: `t${++tx}`, contaId: 'cc', descricao: 'Compra', valor: 10, tipo: 'DEBIT', status: 'POSTED', data: '2026-03-10',
  categoria: null, operacao: null, parcela: null, totalParcelas: null, dataCompra: null, valorTotal: null, ...p,
})
const unica = (p: Partial<Lancamento> = {}): Lancamento => ({
  id: 'l1', natureza: 'despesa', descricao: 'Café', valor: centavos(1000), categoriaId: null, cartaoId: 'k1',
  recorrencia: { tipo: 'unica', data: '2026-03-10' }, ...p,
})

function plano(transacoes: TransacaoExterna[], o: { lancamentos?: Lancamento[]; vinculos?: Vinculo[]; cartoes?: Cartao[] } = {}) {
  return planejarImportacao({
    transacoes, contas: [banco, credito], cartoes: o.cartoes ?? [nu], lancamentos: o.lancamentos ?? [], vinculos: o.vinculos ?? [], novoId,
  })
}

describe('planejarCartoes', () => {
  it('conta já ligada sem mudança fica como está, e liga cartão de mesmo nome sem diferenciar caixa', () => {
    expect(planejarCartoes([credito], [nu], novoId).cartoes).toEqual([])
    const manual = { ...nu, nome: 'NU', pluggyContaId: null }
    expect(planejarCartoes([credito], [manual], novoId).cartoes).toEqual([{ ...manual, pluggyContaId: 'cc', limite: null, disponivel: null, final: null }])
  })
  it('cria cartão com o dia de fechamento e vencimento e avisa quando faltam datas', () => {
    const r = planejarCartoes([credito, { ...credito, id: 'x', nome: 'Outro', vencimento: null }, banco], [], novoId)
    expect(r.cartoes).toMatchObject([{ nome: 'Nu', diaFechamento: 5, diaVencimento: 12, pluggyContaId: 'cc' }])
    expect(r.semVinculo).toEqual([{ id: 'x', nome: 'Outro' }])
  })
  it('religa por nome, sem acento e espaço, o cartão preso a uma conta que sumiu do Pluggy', () => {
    const preso = { ...nu, nome: '  Nú ', pluggyContaId: 'id-antigo' }
    expect(planejarCartoes([credito], [preso], novoId).cartoes).toMatchObject([{ id: 'k1', pluggyContaId: 'cc' }])
  })
  it('atualiza limite, disponível e final do cartão já ligado só quando mudam', () => {
    const comLimite = { ...credito, limite: 8000, disponivel: 5833.1, final: '4821' }
    const atualizado = { ...nu, limite: centavos(800000), disponivel: centavos(583310), final: '4821' }
    expect(planejarCartoes([comLimite], [nu], novoId).cartoes).toEqual([atualizado])
    expect(planejarCartoes([comLimite], [atualizado], novoId).cartoes).toEqual([])
  })
})

describe('planejarImportacao', () => {
  it('rodar de novo com o resultado aplicado não gera nada', () => {
    const txs = [
      t({ valor: 10 }), t({ valor: 10 }), t({ valor: 0 }), t({ contaId: 'cb', tipo: 'CREDIT', valor: 500, descricao: 'Salário' }),
      t({ parcela: 1, totalParcelas: 3, valor: 100, valorTotal: 300 }),
    ]
    const um = plano(txs)
    const dois = plano(txs, { lancamentos: um.lancamentos, vinculos: um.vinculos })
    expect(um.lancamentos.length).toBeGreaterThan(0)
    expect(dois.lancamentos).toEqual([])
    expect(dois.vinculos).toEqual([])
  })

  it('tira o sufixo de parcela da descrição, porque a projeção já numera', () => {
    const parcela = { parcela: 3, totalParcelas: 10 }
    expect(plano([t({ ...parcela, descricao: 'Loja 3/10' })]).lancamentos[0]?.descricao).toBe('Loja')
    expect(plano([t({ ...parcela, descricao: 'LOJA PARC 03/10' })]).lancamentos[0]?.descricao).toBe('LOJA')
    expect(plano([t({ ...parcela, descricao: '3/10' })]).lancamentos[0]?.descricao).toBe('3/10')
  })

  it('compra 10x chegando em 3 transações vira uma só parcelada', () => {
    const r = plano([
      t({ data: '2026-01-15', valor: 100, parcela: 1, totalParcelas: 10, dataCompra: '2026-01-15', valorTotal: 1000 }),
      t({ data: '2026-02-15', valor: 100, parcela: 2, totalParcelas: 10, dataCompra: '2026-01-15', valorTotal: 1000 }),
      t({ data: '2026-03-15', valor: 100, parcela: 3, totalParcelas: 10, dataCompra: '2026-01-15', valorTotal: 1000 }),
    ])
    expect(r.lancamentos).toHaveLength(1)
    expect(r.lancamentos[0]).toMatchObject({ valor: 100000, recorrencia: { tipo: 'parcelada', dataCompra: '2026-01-15', parcelas: 10 } })
    expect(r.vinculos.map((v) => v.ocorrencia)).toEqual(['p1', 'p2', 'p3'])
    expect(r.resumo).toMatchObject({ importadas: 1, vinculadas: 2 })
  })

  it('sem dataCompra nem valorTotal estima a compra e o total', () => {
    const r = plano([t({ data: '2026-03-31', valor: 50, parcela: 3, totalParcelas: 4 })])
    expect(r.lancamentos[0]).toMatchObject({ valor: 20000, recorrencia: { dataCompra: '2026-01-31' } })
  })

  it('parcela 4/10 em outra sincronização liga na parcelada, mesmo com o resto da primeira, e 10/10 fora da janela também', () => {
    const resto = plano([t({ data: '2026-01-15', valor: 33.34, parcela: 1, totalParcelas: 3, dataCompra: '2026-01-15', valorTotal: 100 })])
    const base = { lancamentos: resto.lancamentos, vinculos: resto.vinculos }
    const id = resto.lancamentos[0]!.id
    const dois = plano([t({ data: '2026-02-15', valor: 33.33, parcela: 2, totalParcelas: 3 })], base)
    expect(dois.lancamentos).toEqual([])
    expect(dois.vinculos).toMatchObject([{ lancamentoId: id, ocorrencia: 'p2' }])

    const dez = { id: 'p', natureza: 'despesa', descricao: 'TV', valor: centavos(100000), categoriaId: null, cartaoId: 'k1', recorrencia: { tipo: 'parcelada', dataCompra: '2025-01-10', parcelas: 10 } } as Lancamento
    const quatro = plano([t({ data: '2025-04-12', valor: 100, parcela: 4, totalParcelas: 10 })], { lancamentos: [dez] })
    expect(quatro.vinculos).toMatchObject([{ lancamentoId: 'p', ocorrencia: 'p4' }])
    const ultima = plano([t({ data: '2025-10-12', valor: 100, parcela: 10, totalParcelas: 10 })], { lancamentos: [dez] })
    expect(ultima.lancamentos).toEqual([])
    expect(ultima.vinculos).toMatchObject([{ lancamentoId: 'p', ocorrencia: 'p10' }])
  })

  it('duas compras iguais no mesmo mês geram duas linhas', () => {
    const r = plano([t({ valor: 10 }), t({ valor: 10 })])
    expect(r.lancamentos).toHaveLength(2)
  })

  it('lançamento manual do mesmo valor é ligado uma vez por mês', () => {
    const r = plano([t({ valor: 10 }), t({ valor: 10 })], { lancamentos: [unica()] })
    expect(r.vinculos[0]).toMatchObject({ lancamentoId: 'l1', ocorrencia: '2026-04' })
    expect(r.lancamentos).toHaveLength(1)
    expect(r.resumo).toMatchObject({ importadas: 1, vinculadas: 1 })
  })

  it('mensal manual é consumido uma vez em cada mês', () => {
    const mensal = unica({ cartaoId: null, recorrencia: { tipo: 'mensal', inicio: '2026-01-05', fim: null } })
    const r = plano([
      t({ contaId: 'cb', data: '2026-02-05', valor: 10 }), t({ contaId: 'cb', data: '2026-02-06', valor: 10 }),
      t({ contaId: 'cb', data: '2026-03-05', valor: 10 }),
    ], { lancamentos: [mensal] })
    expect(r.vinculos.map((v) => v.lancamentoId === 'l1')).toEqual([true, false, true])
    expect(r.lancamentos).toHaveLength(1)
  })

  it('importação excluída (vínculo sem lançamento) não volta', () => {
    const x = t({})
    const r = plano([x], { vinculos: [{ externoId: x.id, lancamentoId: null, ocorrencia: null }] })
    expect(r.lancamentos).toEqual([])
    expect(r.vinculos).toEqual([])
  })

  it('ignora valor zero, estorno de cartão e pagamento de fatura no banco, registrando o vínculo', () => {
    const r = plano([
      t({ valor: 0 }), t({ valor: -30 }),
      t({ contaId: 'cb', valor: 800, descricao: 'PAGAMENTO DE FATURA NUBANK' }),
      t({ contaId: 'cb', valor: 800, categoria: 'Credit card payment' }),
      t({ contaId: 'cb', valor: 800, operacao: 'PAGAMENTO_FATURA' }),
    ])
    expect(r.lancamentos).toEqual([])
    expect(r.resumo.ignoradas).toBe(5)
    expect(r.vinculos.every((v) => v.lancamentoId === null)).toBe(true)
  })

  it('PENDING no banco e cartão sem mapeamento não deixam vínculo', () => {
    const r = plano([t({ contaId: 'cb', status: 'PENDING' }), t({})], { cartoes: [] })
    expect(r.vinculos).toEqual([])
    expect(r.lancamentos).toEqual([])
  })

  it('banco: débito vira despesa, crédito vira receita; compra de cartão em aberto (PENDING) importa', () => {
    const r = plano([
      t({ contaId: 'cb', valor: -25.5, descricao: 'Mercado' }),
      t({ contaId: 'cb', tipo: 'CREDIT', valor: 1000, descricao: '  ' }),
      t({ status: 'PENDING', valor: 7 }),
    ])
    expect(r.lancamentos).toMatchObject([
      { natureza: 'despesa', valor: 2550, cartaoId: null },
      { natureza: 'receita', valor: 100000, descricao: 'Transação importada' },
      { natureza: 'despesa', valor: 700, cartaoId: 'k1' },
    ])
  })

  it('a fatura paga pelo banco não duplica o gasto do mês', () => {
    const r = plano([t({ valor: 200 }), t({ contaId: 'cb', data: '2026-04-12', valor: 200, descricao: 'Pagamento de fatura' })])
    const total = resumirMes(r.lancamentos, [nu], { ano: 2026, mes: 4 }).despesas
    expect(total).toBe(20000)
    expect(ocorrenciasDoMes(r.lancamentos, [nu], { ano: 2026, mes: 4 })).toHaveLength(1)
  })
})
