import type { Centavos, DataISO, Lancamento, MesRef } from './tipos'
import type { Caixinha } from './visaoGeral'
import { caixinhaDe, titulo } from './visaoGeral'
import { mesParaTexto, somarMeses } from './dinheiro'

export type Meta = { id: string; nome: string; meta: Centavos; saldo: Centavos; saldoEm: DataISO }

export type ProgressoMeta = {
  meta: Meta
  saldoAtual: number
  pct: number
  falta: number
  liquidoMes: number
  previsao: string
}

// Saldo informado em saldoEm mais o líquido das caixinhas lançadas depois dessa data.
function saldoAtual(m: Meta, lancamentos: Lancamento[]): number {
  const nome = titulo(m.nome)
  let liquido = 0
  for (const l of lancamentos) {
    if (l.recorrencia.tipo !== 'unica' || l.recorrencia.data <= m.saldoEm || caixinhaDe(l.natureza, l.descricao) !== nome) continue
    liquido += l.natureza === 'despesa' ? l.valor : -l.valor
  }
  return Math.max(0, m.saldo + liquido)
}

function previsao(falta: number, liquidoMes: number, mes: MesRef): string {
  if (falta === 0) return 'Meta concluída'
  if (liquidoMes <= 0) return 'Sem aporte líquido neste mês'
  return `No ritmo deste mês, completa em ${mesParaTexto(somarMeses(mes, Math.ceil(falta / liquidoMes)))}`
}

export function progressoMetas(metas: Meta[], lancamentos: Lancamento[], caixinhasDoMes: Caixinha[], mes: MesRef): ProgressoMeta[] {
  return metas.map((meta) => {
    const atual = saldoAtual(meta, lancamentos)
    const falta = Math.max(0, meta.meta - atual)
    const liquidoMes = caixinhasDoMes.find((c) => c.nome === titulo(meta.nome))?.liquido ?? 0
    return { meta, saldoAtual: atual, pct: Math.min(100, Math.round((atual / meta.meta) * 100)), falta, liquidoMes, previsao: previsao(falta, liquidoMes, mes) }
  })
}
