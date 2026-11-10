import type { Cartao, Centavos, DataISO, Lancamento, MesRef } from './tipos'
import type { Movimento } from './visaoGeral'
import { diasNoMes, indiceMes, parseData, somarMeses } from './dinheiro'
import { dividirParcelas, mesDoPagamento } from './projecao'

export type VariacaoCategoria = { categoriaId: string | null; atual: number; anterior: number; pct: number | null }

const GASTO = new Set<Movimento['grupo']>(['loan', 'ppl', 'shop'])

function porCategoria(movimentos: Movimento[], de: number, ate: number): Map<string | null, number> {
  const m = new Map<string | null, number>()
  for (const { grupo, ocorrencia: o } of movimentos) {
    if (!GASTO.has(grupo) || o.dia < de || o.dia > ate) continue
    m.set(o.categoriaId, (m.get(o.categoriaId) ?? 0) + o.valor)
  }
  return m
}

// Compara o mês até `ateDia` com o mesmo trecho do mês anterior, para não medir mês parcial contra mês cheio
export function variacaoPorCategoria(atual: Movimento[], anterior: Movimento[], de: number, ateDia: number): VariacaoCategoria[] {
  const a = porCategoria(atual, de, ateDia)
  const b = porCategoria(anterior, de, ateDia)
  return [...a].sort((x, y) => y[1] - x[1]).map(([categoriaId, v]) => {
    const antes = b.get(categoriaId) ?? 0
    return { categoriaId, atual: v, anterior: antes, pct: antes > 0 ? Math.round(((v - antes) / antes) * 100) : null }
  })
}

export type ParcelaTerminando = { lancamento: Lancamento; ultimoMes: MesRef; restantes: number; valorParcela: Centavos }

// Parceladas com parcela neste mês, da que termina antes; `restantes` não conta a parcela deste mês
export function parcelasTerminando(lancamentos: Lancamento[], cartoes: Cartao[], mes: MesRef): ParcelaTerminando[] {
  const agora = indiceMes(mes)
  const out: ParcelaTerminando[] = []
  for (const l of lancamentos) {
    const r = l.recorrencia
    if (l.natureza !== 'despesa' || r.tipo !== 'parcelada') continue
    const cartao = cartoes.find((c) => c.id === l.cartaoId) ?? null
    const primeiro = indiceMes(mesDoPagamento(r.dataCompra, cartao, 0))
    const ultimoMes = mesDoPagamento(r.dataCompra, cartao, r.parcelas - 1)
    if (primeiro > agora || indiceMes(ultimoMes) < agora) continue
    out.push({ lancamento: l, ultimoMes, restantes: indiceMes(ultimoMes) - agora, valorParcela: dividirParcelas(l.valor, r.parcelas)[r.parcelas - 1]! })
  }
  return out.sort((a, b) => indiceMes(a.ultimoMes) - indiceMes(b.ultimoMes))
}

const iso = (m: MesRef, dia: number): DataISO => `${m.ano}-${String(m.mes).padStart(2, '0')}-${String(Math.min(dia, diasNoMes(m.ano, m.mes))).padStart(2, '0')}`

// Data do lançamento em si (compra, não vencimento da fatura); mensal usa a última ocorrência até hoje
function dataMaisRecente(l: Lancamento, hoje: DataISO): DataISO | null {
  const r = l.recorrencia
  if (r.tipo === 'unica') return r.data <= hoje ? r.data : null
  if (r.tipo === 'parcelada') return r.dataCompra <= hoje ? r.dataCompra : null
  const ini = parseData(r.inicio)!
  const h = parseData(hoje)!
  let d = iso(h, ini.dia)
  if (d > hoje) d = iso(somarMeses(h, -1), ini.dia)
  // ponytail: mensal já encerrada some da lista mesmo que a última ocorrência seja recente
  if (d < r.inicio || (r.fim && d > r.fim)) return null
  return d
}

export function ultimosLancamentos(lancamentos: Lancamento[], hoje: DataISO, n: number): { lancamento: Lancamento; data: DataISO }[] {
  return lancamentos
    .map((lancamento) => ({ lancamento, data: dataMaisRecente(lancamento, hoje) }))
    .filter((x): x is { lancamento: Lancamento; data: DataISO } => x.data !== null)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, n)
}
