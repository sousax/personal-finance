import { describe, expect, it } from 'vitest'
import { centavos, visaoGeral } from './index'
import type { Ocorrencia } from './index'

let n = 0
const oc = (natureza: Ocorrencia['natureza'], descricao: string, reais: number): Ocorrencia => ({
  lancamentoId: `l${n++}`, natureza, descricao, valor: centavos(Math.round(reais * 100)), categoriaId: null, cartaoId: null, mes: { ano: 2025, mes: 3 },
})
const grupos = (os: Ocorrencia[]) => visaoGeral(os).movimentos.map((m) => m.grupo)

describe('visaoGeral', () => {
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
