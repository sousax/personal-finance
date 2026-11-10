import type { Cartao, Centavos, Lancamento, MesRef } from './tipos'
import { centavos, indiceMes } from './dinheiro'
import { dividirParcelas, mesDoPagamento } from './projecao'

// Meses são índices relativos à janela: 0 = mês `de`. `fim` pode passar do fim da janela.
export type CompraParcelada = {
  lancamento: Lancamento
  inicio: number
  fim: number
  total: number
  parcelaNoMes: (number | null)[]
  valorNoMes: number[]
  restante: Centavos
}

export function parcelasNaJanela(lancamentos: Lancamento[], cartoes: Cartao[], de: MesRef, n: number): CompraParcelada[] {
  const base = indiceMes(de)
  const out: CompraParcelada[] = []
  for (const l of lancamentos) {
    const r = l.recorrencia
    if (l.natureza !== 'despesa' || r.tipo !== 'parcelada') continue
    const cartao = cartoes.find((c) => c.id === l.cartaoId) ?? null
    const valores = dividirParcelas(l.valor, r.parcelas)
    const parcelaNoMes: (number | null)[] = Array(n).fill(null)
    const valorNoMes: number[] = Array(n).fill(0)
    let primeira: number | null = null
    valores.forEach((v, i) => {
      const k = indiceMes(mesDoPagamento(r.dataCompra, cartao, i)) - base
      if (k < 0 || k >= n) return
      parcelaNoMes[k] = i + 1
      valorNoMes[k]! += v
      primeira ??= i
    })
    if (primeira === null) continue
    out.push({
      lancamento: l,
      inicio: parcelaNoMes.findIndex((p) => p !== null),
      fim: indiceMes(mesDoPagamento(r.dataCompra, cartao, r.parcelas - 1)) - base,
      total: r.parcelas,
      parcelaNoMes,
      valorNoMes,
      restante: centavos(valores.slice(primeira).reduce((s, v) => s + v, 0)),
    })
  }
  return out.sort((a, b) => a.fim - b.fim)
}
