import type { Cartao, Centavos, Lancamento, MesRef, Ocorrencia } from './tipos'
import type { Vinculo } from './importacao'
import { centavos } from './dinheiro'

export type Grupo = 'own' | 'box' | 'loan' | 'ppl' | 'shop' | 'inc'
export type GrupoGasto = 'loan' | 'ppl' | 'shop'

export const ROTULO_GRUPO: Record<Grupo, string> = {
  own: 'Entre minhas contas', box: 'Caixinhas', loan: 'Empréstimos', ppl: 'Pix para pessoas', shop: 'Consumo', inc: 'Receita',
}

export type Movimento = { ocorrencia: Ocorrencia; grupo: Grupo; nome: string; caixinha: string | null }
export type Caixinha = { nome: string; guardado: Centavos; retirado: Centavos; liquido: number }

export type VisaoGeral = {
  movimentos: Movimento[]
  salario: Centavos
  diaSalario: number | null
  outrasEntradas: Centavos
  gastos: Centavos
  gastosPorGrupo: { grupo: GrupoGasto; valor: Centavos }[]
  caixinhas: Caixinha[]
  liquidoCaixinhas: number
  livre: number
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const RESERVADO = /^\s*dinheiro\s+reservado\s+(.+?)\s*$/i
const RETIRADO = /^\s*dinheiro\s+retirado\s+(.+?)\s*$/i
const PREFIXO = /^\s*(pix recebido|pix enviado|transfer[eê]ncia recebida|transfer[eê]ncia enviada pelo pix|transfer[eê]ncia enviada|pagamento com pix)\s*/i
const EMPRESA = /\bltda\b|s\/a|s\.a|\ss a\b|eireli|\sme$/

function contraparte(descricao: string): { nome: string; prefixo: boolean } {
  const depois = descricao.includes('|') ? descricao.slice(descricao.indexOf('|') + 1) : descricao
  const prefixo = PREFIXO.test(descricao) || PREFIXO.test(depois)
  return { nome: depois.replace(PREFIXO, '').replace(/^[\d.\s]+/, '').trim(), prefixo }
}

// Mesmo nome para aprender categoria: sem prefixo bancário, sufixo de parcela, acento, caixa e espaços extras
export const chaveDescricao = (descricao: string) =>
  semAcento(contraparte(descricao).nome.replace(/\s*\(\d+\/\d+\)$/, '')).replace(/\s+/g, ' ').trim()

// Reservar é despesa, retirar é receita. O nome sai em título para casar com as metas.
export function caixinhaDe(natureza: Ocorrencia['natureza'], descricao: string): string | null {
  const nome = (natureza === 'despesa' ? RESERVADO : RETIRADO).exec(descricao)?.[1]
  return nome ? titulo(nome) : null
}

function classificar(o: Ocorrencia): { grupo: Grupo; caixinha: string | null } {
  const caixinha = caixinhaDe(o.natureza, o.descricao)
  if (caixinha) return { grupo: 'box', caixinha }
  if (o.natureza === 'receita') return { grupo: 'inc', caixinha: null }
  const d = semAcento(o.descricao)
  if (/emprestimo|financiamento/.test(d)) return { grupo: 'loan', caixinha: null }
  if (/\bpix\b|transferencia enviada/.test(d) && !EMPRESA.test(d)) return { grupo: 'ppl', caixinha: null }
  return { grupo: 'shop', caixinha: null }
}

export function visaoGeral(ocorrencias: Ocorrencia[]): VisaoGeral {
  const base = ocorrencias.map((o) => ({ o, ...classificar(o), ...contraparte(o.descricao) }))

  // Entrada e saída do mesmo valor e contraparte são transferência entre contas próprias
  const proprios = new Set<number>()
  base.forEach((r, i) => {
    if (r.o.natureza !== 'receita' || r.grupo === 'box' || !r.prefixo || proprios.has(i)) return
    const chave = semAcento(r.nome)
    if (!chave) return
    const j = base.findIndex((s, k) => s.o.natureza === 'despesa' && s.grupo !== 'box' && s.prefixo && !proprios.has(k) && s.o.valor === r.o.valor && semAcento(s.nome) === chave)
    if (j >= 0) { proprios.add(i); proprios.add(j) }
  })

  const movimentos: Movimento[] = base.map((r, i) => {
    const grupo = proprios.has(i) ? 'own' : r.grupo
    const nome = r.caixinha ?? (r.prefixo && r.nome ? titulo(r.nome) : r.o.descricao)
    return { ocorrencia: r.o, grupo, nome, caixinha: r.caixinha }
  })

  const entradas = movimentos.filter((m) => m.grupo === 'inc').map((m) => m.ocorrencia.valor)
  const salario = Math.max(0, ...entradas)
  const diaSalario = salario > 0 ? movimentos.find((m) => m.grupo === 'inc' && m.ocorrencia.valor === salario)!.ocorrencia.dia : null
  const outras = entradas.reduce((s, v) => s + v, 0) - salario

  const porGrupo = new Map<GrupoGasto, number>()
  const porCaixinha = new Map<string, { guardado: number; retirado: number }>()
  for (const m of movimentos) {
    const v = m.ocorrencia.valor
    if (m.grupo === 'loan' || m.grupo === 'ppl' || m.grupo === 'shop') porGrupo.set(m.grupo, (porGrupo.get(m.grupo) ?? 0) + v)
    if (m.grupo === 'box' && m.caixinha) {
      const c = porCaixinha.get(m.caixinha) ?? { guardado: 0, retirado: 0 }
      c[m.ocorrencia.natureza === 'despesa' ? 'guardado' : 'retirado'] += v
      porCaixinha.set(m.caixinha, c)
    }
  }
  const gastosPorGrupo = [...porGrupo].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([grupo, v]) => ({ grupo, valor: centavos(v) }))
  const gastos = gastosPorGrupo.reduce((s, g) => s + g.valor, 0)
  const caixinhas = [...porCaixinha].map(([nome, c]) => ({ nome, guardado: centavos(c.guardado), retirado: centavos(c.retirado), liquido: c.guardado - c.retirado }))
  const liquidoCaixinhas = caixinhas.reduce((s, c) => s + c.liquido, 0)

  return {
    movimentos, salario: centavos(salario), diaSalario, outrasEntradas: centavos(outras), gastos: centavos(gastos), gastosPorGrupo,
    caixinhas, liquidoCaixinhas, livre: salario + outras - gastos - liquidoCaixinhas,
  }
}

const GASTO = new Set<Grupo>(['loan', 'ppl', 'shop'])
const acumulado = (n: number, porDia: Map<number, number>) => {
  let soma = 0
  return Array.from({ length: n }, (_, i) => (soma += porDia.get(i + 1) ?? 0))
}

export function ritmoDoMes(v: VisaoGeral, diaLimite: number, diasNoMes: number) {
  const gastoDia = new Map<number, number>()
  const guardadoDia = new Map<number, number>()
  for (const m of v.movimentos) {
    const { dia, valor, natureza } = m.ocorrencia
    if (GASTO.has(m.grupo)) gastoDia.set(dia, (gastoDia.get(dia) ?? 0) + valor)
    if (m.grupo === 'box') guardadoDia.set(dia, (guardadoDia.get(dia) ?? 0) + (natureza === 'despesa' ? valor : -valor))
  }
  const gastos = acumulado(diaLimite, gastoDia)
  const gastosAteLimite = gastos[diaLimite - 1] ?? 0
  const idealAteLimite = Math.round((v.salario / diasNoMes) * diaLimite)
  return { gastos, guardado: acumulado(diaLimite, guardadoDia), gastosAteLimite, idealAteLimite, diferenca: gastosAteLimite - idealAteLimite }
}

export type Conta = { id: string; nome: string; sub: string; valor: Centavos; dia: number; grupo: 'fatura' | 'loan' | 'mensal'; paga: boolean }

// Pago só com evidência de transação bancária vinculada. A data nunca decide. Fatura nunca consta paga:
// o importador ignora o pagamento da fatura no banco.
export function contasDoMes(e: { mes: MesRef; lancamentos: Lancamento[]; cartoes: Cartao[]; ocorrencias: Ocorrencia[]; movimentos: Movimento[]; vinculos: Vinculo[] }): Conta[] {
  const chaveMes = `${e.mes.ano}-${String(e.mes.mes).padStart(2, '0')}`
  const contas: Conta[] = []

  const porCartao = new Map<string, { valor: number; dia: number }>()
  for (const o of e.ocorrencias) {
    if (o.natureza !== 'despesa' || !o.cartaoId) continue
    const c = porCartao.get(o.cartaoId) ?? { valor: 0, dia: o.dia }
    c.valor += o.valor
    porCartao.set(o.cartaoId, c)
  }
  for (const [id, c] of porCartao) {
    const nome = e.cartoes.find((x) => x.id === id)?.nome ?? 'cartão'
    contas.push({ id: `fatura-${id}`, nome: `Fatura ${nome}`, sub: `vence dia ${c.dia}`, valor: centavos(c.valor), dia: c.dia, grupo: 'fatura', paga: false })
  }

  e.movimentos.forEach((m, i) => {
    const o = m.ocorrencia
    if (o.natureza !== 'despesa' || o.cartaoId || m.grupo === 'box' || m.grupo === 'own') return
    const recorrencia = e.lancamentos.find((l) => l.id === o.lancamentoId)?.recorrencia.tipo
    if (m.grupo !== 'loan' && recorrencia !== 'mensal') return
    const parcela = /\((\d+)\/\d+\)$/.exec(o.descricao)?.[1]
    const chave = recorrencia === 'mensal' ? chaveMes : recorrencia === 'parcelada' && parcela ? `p${parcela}` : null
    const paga = e.vinculos.some((v) => v.lancamentoId === o.lancamentoId && (chave === null || v.ocorrencia === chave))
    contas.push({ id: `${o.lancamentoId}-${i}`, nome: m.nome, sub: `${ROTULO_GRUPO[m.grupo]} · dia ${o.dia}`, valor: o.valor, dia: o.dia, grupo: m.grupo === 'loan' ? 'loan' : 'mensal', paga })
  })
  return contas
}
