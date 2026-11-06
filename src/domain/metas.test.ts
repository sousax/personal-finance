import { describe, expect, it } from 'vitest'
import { centavos, progressoMetas, visaoGeral } from './index'
import type { Caixinha, DataISO, Lancamento, Meta } from './index'

let n = 0
const lanc = (natureza: Lancamento['natureza'], descricao: string, reais: number, data: DataISO): Lancamento => ({
  id: `l${n++}`, natureza, descricao, valor: centavos(reais * 100), categoriaId: null, cartaoId: null, recorrencia: { tipo: 'unica', data },
})
const reservar = (nome: string, reais: number, data: DataISO) => lanc('despesa', `Dinheiro reservado ${nome}`, reais, data)
const retirar = (nome: string, reais: number, data: DataISO) => lanc('receita', `Dinheiro retirado ${nome}`, reais, data)
const meta = (reais: number, saldo: number, extra: Partial<Meta> = {}): Meta => ({ id: 'm', nome: 'Viagem', meta: centavos(reais * 100), saldo: centavos(saldo * 100), saldoEm: '2025-03-10', ...extra })
const mes = { ano: 2025, mes: 3 }
const noMes = (ls: Lancamento[]): Caixinha[] => visaoGeral(ls.map((l) => ({
  lancamentoId: l.id, natureza: l.natureza, descricao: l.descricao, valor: l.valor, categoriaId: null, cartaoId: null, mes, dia: 15,
}))).caixinhas
const prog = (m: Meta, ls: Lancamento[], mesRef = mes) => progressoMetas([m], ls, noMes(ls), mesRef)[0]!

describe('progressoMetas', () => {
  it('conta a movimentação depois de saldoEm e ignora a do dia e a anterior', () => {
    const p = prog(meta(1000, 200), [reservar('Viagem', 300, '2025-03-11'), reservar('Viagem', 999, '2025-03-10'), reservar('Viagem', 999, '2025-02-01'), retirar('Viagem', 50, '2025-03-12')])
    expect(p.saldoAtual).toBe(45000)
    expect(p.falta).toBe(55000)
    expect(p.pct).toBe(45)
  })

  it('casa o nome sem diferenciar caixa', () => {
    const p = prog(meta(1000, 0, { nome: 'viagem' }), [reservar('VIAGEM', 100, '2025-03-11')])
    expect(p.saldoAtual).toBe(10000)
  })

  it('limita o percentual em 100 e zera a falta', () => {
    const p = prog(meta(100, 150), [])
    expect(p.pct).toBe(100)
    expect(p.falta).toBe(0)
    expect(p.previsao).toBe('Meta concluída')
  })

  it('arredonda o percentual', () => {
    expect(prog(meta(300, 100), []).pct).toBe(33)
  })

  it('prevê o mês de conclusão e vira o ano', () => {
    const ls = [reservar('Viagem', 400, '2025-03-15')]
    // falta 400 com 400 por mês: um mês
    expect(prog(meta(800, 0), ls).previsao).toBe('No ritmo deste mês, completa em abril de 2025')
    expect(prog(meta(2000, 0, { saldoEm: '2025-03-01' }), ls).previsao).toBe('No ritmo deste mês, completa em julho de 2025')
    expect(prog(meta(10000, 0, { saldoEm: '2025-03-01' }), ls).previsao).toBe('No ritmo deste mês, completa em março de 2027')
  })

  it('sem aporte líquido no mês não há previsão', () => {
    expect(prog(meta(1000, 100), []).previsao).toBe('Sem aporte líquido neste mês')
    const ls = [reservar('Viagem', 100, '2025-03-15'), retirar('Viagem', 100, '2025-03-16')]
    expect(prog(meta(1000, 100), ls).previsao).toBe('Sem aporte líquido neste mês')
  })

  it('saldo líquido negativo não passa de zero', () => {
    const p = prog(meta(1000, 100), [retirar('Viagem', 500, '2025-03-15')])
    expect(p.saldoAtual).toBe(0)
    expect(p.pct).toBe(0)
    expect(p.liquidoMes).toBe(-50000)
    expect(p.previsao).toBe('Sem aporte líquido neste mês')
  })
})
