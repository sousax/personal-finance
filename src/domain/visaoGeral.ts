import type { Centavos, Ocorrencia } from './tipos'
import { centavos } from './dinheiro'

export type Grupo = 'own' | 'box' | 'loan' | 'ppl' | 'shop' | 'inc'
export type GrupoGasto = 'loan' | 'ppl' | 'shop'

export type Movimento = { ocorrencia: Ocorrencia; grupo: Grupo; nome: string; caixinha: string | null }
export type Caixinha = { nome: string; guardado: Centavos; retirado: Centavos; liquido: number }

export type VisaoGeral = {
  movimentos: Movimento[]
  salario: Centavos
  outrasEntradas: Centavos
  gastos: Centavos
  gastosPorGrupo: { grupo: GrupoGasto; valor: Centavos }[]
  caixinhas: Caixinha[]
  liquidoCaixinhas: number
  livre: number
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const RESERVADO = /^\s*dinheiro\s+reservado\s+(.+?)\s*$/i
const RETIRADO = /^\s*dinheiro\s+retirado\s+(.+?)\s*$/i
const PREFIXO = /^\s*(pix recebido|pix enviado|transfer[eê]ncia recebida|transfer[eê]ncia enviada pelo pix|transfer[eê]ncia enviada|pagamento com pix)\s*/i
const EMPRESA = /\bltda\b|s\/a|s\.a|\ss a\b|eireli|\sme$/

function contraparte(descricao: string): { nome: string; prefixo: boolean } {
  const depois = descricao.includes('|') ? descricao.slice(descricao.indexOf('|') + 1) : descricao
  const prefixo = PREFIXO.test(descricao) || PREFIXO.test(depois)
  return { nome: depois.replace(PREFIXO, '').replace(/^[\d.\s]+/, '').trim(), prefixo }
}

function classificar(o: Ocorrencia): { grupo: Grupo; caixinha: string | null } {
  const caixinha = (o.natureza === 'despesa' ? RESERVADO : RETIRADO).exec(o.descricao)?.[1]
  if (caixinha) return { grupo: 'box', caixinha }
  if (o.natureza === 'receita') return { grupo: 'inc', caixinha: null }
  const d = semAcento(o.descricao)
  if (/emprestimo|financiamento/.test(d)) return { grupo: 'loan', caixinha: null }
  if (/pix|transferencia enviada/.test(d) && !EMPRESA.test(d)) return { grupo: 'ppl', caixinha: null }
  return { grupo: 'shop', caixinha: null }
}

export function visaoGeral(ocorrencias: Ocorrencia[]): VisaoGeral {
  const base = ocorrencias.map((o) => ({ o, ...classificar(o), ...contraparte(o.descricao) }))

  // Entrada e saída do mesmo valor e contraparte são transferência entre contas próprias
  const proprios = new Set<number>()
  base.forEach((r, i) => {
    if (r.o.natureza !== 'receita' || r.grupo === 'box' || proprios.has(i)) return
    const chave = semAcento(r.nome)
    if (!chave) return
    const j = base.findIndex((s, k) => s.o.natureza === 'despesa' && s.grupo !== 'box' && !proprios.has(k) && s.o.valor === r.o.valor && semAcento(s.nome) === chave)
    if (j >= 0) { proprios.add(i); proprios.add(j) }
  })

  const movimentos: Movimento[] = base.map((r, i) => {
    const grupo = proprios.has(i) ? 'own' : r.grupo
    const nome = r.caixinha ? titulo(r.caixinha) : r.prefixo && r.nome ? titulo(r.nome) : r.o.descricao
    return { ocorrencia: r.o, grupo, nome, caixinha: r.caixinha ? titulo(r.caixinha) : null }
  })

  const entradas = movimentos.filter((m) => m.grupo === 'inc').map((m) => m.ocorrencia.valor)
  const salario = Math.max(0, ...entradas)
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
    movimentos, salario: centavos(salario), outrasEntradas: centavos(outras), gastos: centavos(gastos), gastosPorGrupo,
    caixinhas, liquidoCaixinhas, livre: salario + outras - gastos - liquidoCaixinhas,
  }
}
