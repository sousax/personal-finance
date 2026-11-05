import type { Cartao, Centavos, DataISO, Lancamento, MesRef, Ocorrencia, ResumoMes } from './tipos'
import { centavos, diasNoMes, indiceMes, mesDe, parseData, somarMeses } from './dinheiro'

export function mesDoPagamento(data: DataISO, cartao: Cartao | null, deslocamento: number): MesRef {
  const base = mesDe(data)
  if (!cartao) return somarMeses(base, deslocamento)
  const dia = parseData(data)!.dia
  const fechamento = somarMeses(base, dia < cartao.diaFechamento ? 0 : 1)
  const vencimento = somarMeses(fechamento, cartao.diaVencimento > cartao.diaFechamento ? 0 : 1)
  return somarMeses(vencimento, deslocamento)
}

export function dividirParcelas(total: Centavos, n: number): Centavos[] {
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => centavos(i === 0 ? base + resto : base))
}

const mesmoMes = (a: MesRef, b: MesRef) => a.ano === b.ano && a.mes === b.mes

export function ocorrenciasDoMes(lancamentos: Lancamento[], cartoes: Cartao[], mes: MesRef): Ocorrencia[] {
  const out: Ocorrencia[] = []
  for (const l of lancamentos) {
    const cartao = l.cartaoId ? (cartoes.find((c) => c.id === l.cartaoId) ?? null) : null
    const nova = (valor: Centavos, descricao = l.descricao): Ocorrencia => ({
      lancamentoId: l.id, natureza: l.natureza, descricao, valor,
      categoriaId: l.categoriaId, cartaoId: l.cartaoId, mes,
    })
    const r = l.recorrencia
    if (r.tipo === 'unica') {
      if (mesmoMes(mesDoPagamento(r.data, cartao, 0), mes)) out.push(nova(l.valor))
    } else if (r.tipo === 'parcelada') {
      const valores = dividirParcelas(l.valor, r.parcelas)
      valores.forEach((v, i) => {
        if (mesmoMes(mesDoPagamento(r.dataCompra, cartao, i), mes)) out.push(nova(v, `${l.descricao} (${i + 1}/${r.parcelas})`))
      })
    } else {
      const ini = parseData(r.inicio)!
      const limite = Math.min(indiceMes(mes), r.fim ? indiceMes(mesDe(r.fim)) : Infinity)
      for (let k = 0; indiceMes(ini) + k <= limite; k++) {
        const m = somarMeses(ini, k)
        const dia = Math.min(ini.dia, diasNoMes(m.ano, m.mes))
        const data = `${m.ano}-${String(m.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        if (mesmoMes(mesDoPagamento(data, cartao, 0), mes)) out.push(nova(l.valor))
      }
    }
  }
  return out
}

export function resumirMes(lancamentos: Lancamento[], cartoes: Cartao[], mes: MesRef): ResumoMes {
  const ocorrencias = ocorrenciasDoMes(lancamentos, cartoes, mes)
  let receitas = 0, despesas = 0
  const porCategoria = new Map<string | null, Centavos>()
  const porCartao = new Map<string, Centavos>()
  for (const o of ocorrencias) {
    if (o.natureza === 'receita') { receitas += o.valor; continue }
    despesas += o.valor
    porCategoria.set(o.categoriaId, centavos((porCategoria.get(o.categoriaId) ?? 0) + o.valor))
    if (o.cartaoId) porCartao.set(o.cartaoId, centavos((porCartao.get(o.cartaoId) ?? 0) + o.valor))
  }
  return { mes, receitas: centavos(receitas), despesas: centavos(despesas), saldo: centavos(receitas - despesas), porCategoria, porCartao, ocorrencias }
}

export function comprometidoFuturo(lancamentos: Lancamento[], cartoes: Cartao[], de: MesRef, n: number): { mes: MesRef; valor: Centavos }[] {
  const parceladas = lancamentos.filter((l) => l.natureza === 'despesa' && l.recorrencia.tipo === 'parcelada')
  return Array.from({ length: n }, (_, i) => {
    const mes = somarMeses(de, i)
    const valor = ocorrenciasDoMes(parceladas, cartoes, mes).reduce((s, o) => s + o.valor, 0)
    return { mes, valor: centavos(valor) }
  })
}
