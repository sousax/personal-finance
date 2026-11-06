import { describe, expect, it } from 'vitest'
import { centavos, contasDoMes, ocorrenciasDoMes, ritmoDoMes, visaoGeral } from './index'
import type { Cartao, Lancamento, Ocorrencia, Vinculo } from './index'

let n = 0
const oc = (natureza: Ocorrencia['natureza'], descricao: string, reais: number, dia = 1): Ocorrencia => ({
  lancamentoId: `l${n++}`, natureza, descricao, valor: centavos(Math.round(reais * 100)), categoriaId: null, cartaoId: null, mes: { ano: 2025, mes: 3 }, dia,
})
const grupos = (os: Ocorrencia[]) => visaoGeral(os).movimentos.map((m) => m.grupo)

describe('visaoGeral', () => {
  it('pix só casa como palavra, e lançamento sem prefixo bancário não vira entre contas', () => {
    expect(grupos([oc('despesa', 'Pixel Store', 10)])).toEqual(['shop'])
    expect(grupos([oc('receita', 'Reembolso', 50), oc('despesa', 'Reembolso', 50)])).toEqual(['inc', 'shop'])
  })

  it('caixinha: reservado é despesa, retirado é receita, líquido por nome', () => {
    const v = visaoGeral([
      oc('despesa', 'Dinheiro reservado Viagem', 500),
      oc('despesa', 'Dinheiro reservado viagem', 100),
      oc('receita', 'Dinheiro retirado Viagem', 150),
      oc('despesa', 'Dinheiro reservado Reserva', 200),
    ])
    expect(v.movimentos.every((m) => m.grupo === 'box')).toBe(true)
    expect(v.caixinhas.map((c) => [c.nome, c.guardado, c.retirado, c.liquido])).toEqual([['Viagem', 60000, 15000, 45000], ['Reserva', 20000, 0, 20000]])
    expect(v.liquidoCaixinhas).toBe(65000)
    expect(v.gastos).toBe(0)
  })

  it('transferência entre contas próprias aparece mas fica fora dos totais', () => {
    const v = visaoGeral([
      oc('receita', 'Salário Empresa Exemplo', 3000),
      oc('receita', 'Pix recebido | Maria Teste', 400),
      oc('despesa', 'Pix enviado | Maria Teste', 400),
    ])
    expect(v.movimentos.map((m) => m.grupo)).toEqual(['inc', 'own', 'own'])
    expect(v.movimentos[1]!.nome).toBe('Maria Teste')
    expect(v.salario).toBe(300000)
    expect(v.outrasEntradas).toBe(0)
    expect(v.gastos).toBe(0)
    expect(v.livre).toBe(300000)
  })

  it('cada ocorrência pareia uma única vez e nome vazio nunca pareia', () => {
    expect(grupos([
      oc('receita', 'Pix recebido | Maria Teste', 50),
      oc('despesa', 'Pix enviado | Maria Teste', 50),
      oc('despesa', 'Pix enviado | Maria Teste', 50),
    ])).toEqual(['own', 'own', 'ppl'])
    expect(grupos([oc('receita', 'Pix recebido', 50), oc('despesa', 'Pix enviado', 50)])).toEqual(['inc', 'ppl'])
  })

  it('receita sem par continua receita e pode ser o salário', () => {
    const v = visaoGeral([oc('receita', 'Pix recebido | Maria Teste', 4000), oc('receita', 'Reembolso', 100)])
    expect(v.movimentos.map((m) => m.grupo)).toEqual(['inc', 'inc'])
    expect(v.salario).toBe(400000)
    expect(v.outrasEntradas).toBe(10000)
  })

  it('despesas: empréstimo, pix para pessoa, pix para empresa e consumo', () => {
    const v = visaoGeral([
      oc('despesa', 'Parcela Empréstimo Banco Exemplo', 300),
      oc('despesa', 'Financiamento Veículo', 200),
      oc('despesa', 'Pix enviado | João Teste', 80),
      oc('despesa', 'Transferência enviada pelo Pix | Loja Exemplo LTDA', 120),
      oc('despesa', 'Pagamento com Pix | Mercado Exemplo S/A', 60),
      oc('despesa', 'Padaria Exemplo', 10),
    ])
    expect(v.movimentos.map((m) => m.grupo)).toEqual(['loan', 'loan', 'ppl', 'shop', 'shop', 'shop'])
    expect(v.movimentos[2]!.nome).toBe('João Teste')
    expect(v.movimentos[3]!.nome).toBe('Loja Exemplo Ltda')
    expect(v.movimentos[5]!.nome).toBe('Padaria Exemplo')
    expect(v.gastosPorGrupo).toEqual([{ grupo: 'loan', valor: 50000 }, { grupo: 'shop', valor: 19000 }, { grupo: 'ppl', valor: 8000 }])
    expect(v.gastos).toBe(77000)
  })

  it('livre pode ficar negativo', () => {
    const v = visaoGeral([oc('receita', 'Salário', 1000), oc('despesa', 'Padaria Exemplo', 1200), oc('despesa', 'Dinheiro reservado Reserva', 100)])
    expect(v.livre).toBe(-30000)
  })

  it('sem renda não há NaN nem Infinity', () => {
    const v = visaoGeral([oc('despesa', 'Padaria Exemplo', 12)])
    expect(v.salario).toBe(0)
    expect(v.livre).toBe(-1200)
    expect(Object.values(v).flat().every((x) => typeof x !== 'number' || Number.isFinite(x))).toBe(true)
    expect(visaoGeral([]).livre).toBe(0)
  })
})

const mes = { ano: 2025, mes: 3 }
const lanc = (id: string, recorrencia: Lancamento['recorrencia'], descricao = 'Aluguel Exemplo', cartaoId: string | null = null): Lancamento => ({
  id, natureza: 'despesa', descricao, valor: centavos(100000), categoriaId: null, cartaoId, recorrencia,
})
const contas = (lancamentos: Lancamento[], vinculos: Vinculo[] = []) => {
  const cartoes: Cartao[] = [{ id: 'c1', nome: 'Cartão Exemplo', diaFechamento: 5, diaVencimento: 12, pluggyContaId: null }]
  const ocorrencias = ocorrenciasDoMes(lancamentos, cartoes, mes)
  return contasDoMes({ mes, lancamentos, cartoes, ocorrencias, movimentos: visaoGeral(ocorrencias).movimentos, vinculos })
}
const mensal: Lancamento['recorrencia'] = { tipo: 'mensal', inicio: '2025-01-10', fim: null }

describe('visaoGeral diaSalario', () => {
  it('é o dia da maior entrada', () => {
    expect(visaoGeral([oc('receita', 'Salário Empresa Exemplo', 3000, 5), oc('receita', 'Reembolso', 50, 9)]).diaSalario).toBe(5)
    expect(visaoGeral([]).diaSalario).toBeNull()
  })
})

describe('ritmoDoMes', () => {
  const v = visaoGeral([
    oc('receita', 'Salário', 3100, 1),
    oc('despesa', 'Padaria Exemplo', 100, 2),
    oc('despesa', 'Parcela Empréstimo Exemplo', 200, 4),
    oc('despesa', 'Dinheiro reservado Viagem', 50, 4),
    oc('receita', 'Dinheiro retirado Viagem', 20, 5),
  ])

  it('acumula gastos e caixinhas líquidas até o dia limite', () => {
    const r = ritmoDoMes(v, 5, 31)
    expect(r.gastos).toEqual([0, 10000, 10000, 30000, 30000])
    expect(r.guardado).toEqual([0, 0, 0, 5000, 3000])
    expect(r.gastosAteLimite).toBe(30000)
    expect(r.idealAteLimite).toBe(50000)
    expect(r.diferenca).toBe(-20000)
  })

  it('limite 0 não gera pontos nem NaN', () => {
    expect(ritmoDoMes(v, 0, 31)).toMatchObject({ gastos: [], guardado: [], gastosAteLimite: 0, idealAteLimite: 0, diferenca: 0 })
  })
})

describe('contasDoMes', () => {
  const compra = lanc('k', { tipo: 'unica', data: '2025-03-01' }, 'Compra Exemplo', 'c1')

  it('fatura soma o cartão, vence no dia do cartão e nunca consta paga', () => {
    const r = contas([compra, lanc('k2', { tipo: 'unica', data: '2025-03-02' }, 'Outra Compra', 'c1')], [{ externoId: 'e', lancamentoId: 'k', ocorrencia: null }])
    expect(r).toMatchObject([{ nome: 'Fatura Cartão Exemplo', valor: 200000, dia: 12, grupo: 'fatura', paga: false, sub: 'vence dia 12' }])
  })

  it('mensal só consta paga com vínculo daquele mês', () => {
    const m = lanc('m', mensal)
    expect(contas([m])[0]).toMatchObject({ grupo: 'mensal', dia: 10, paga: false, sub: 'Consumo · dia 10' })
    expect(contas([m], [{ externoId: 'e', lancamentoId: 'm', ocorrencia: '2025-02' }])[0]!.paga).toBe(false)
    expect(contas([m], [{ externoId: 'e', lancamentoId: 'm', ocorrencia: '2025-03' }])[0]!.paga).toBe(true)
  })

  it('empréstimo sem cartão entra como loan e data passada sem vínculo não é pago', () => {
    expect(contas([lanc('e', { tipo: 'unica', data: '2025-03-02' }, 'Parcela Empréstimo Exemplo')])).toMatchObject([{ grupo: 'loan', paga: false, dia: 2 }])
  })

  it('sem contas devolve lista vazia', () => {
    expect(contas([lanc('u', { tipo: 'unica', data: '2025-03-02' }, 'Padaria Exemplo')])).toEqual([])
  })
})
