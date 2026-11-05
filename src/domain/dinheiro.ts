import type { Centavos, DataISO, MesRef } from './tipos'

export function centavos(n: number): Centavos {
  if (!Number.isSafeInteger(n)) throw new Error(`centavos inválido: ${n}`)
  return n as Centavos
}

export function parseValor(texto: string): Centavos | null {
  const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(texto.trim())
  if (!m) return null
  const inteiro = Number(m[1]!.replace(/\./g, ''))
  const frac = Number((m[2] ?? '').padEnd(2, '0'))
  const total = inteiro * 100 + frac
  return Number.isSafeInteger(total) ? (total as Centavos) : null
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarBRL = (c: Centavos): string => brl.format(c / 100)

export function valorParaTexto(c: Centavos): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseData(d: DataISO): { ano: number; mes: number; dia: number } | null {
  const m = ISO.exec(d)
  if (!m) return null
  const ano = Number(m[1]), mes = Number(m[2]), dia = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null
  return { ano, mes, dia }
}

export const diasNoMes = (ano: number, mes: number): number => new Date(Date.UTC(ano, mes, 0)).getUTCDate()

export const somarMeses = (m: MesRef, n: number): MesRef => {
  const idx = m.ano * 12 + (m.mes - 1) + n
  return { ano: Math.floor(idx / 12), mes: (idx % 12) + 1 }
}

export const indiceMes = (m: MesRef): number => m.ano * 12 + m.mes - 1

export const mesDe = (d: DataISO): MesRef => {
  const p = parseData(d)
  if (!p) throw new Error(`data inválida: ${d}`)
  return { ano: p.ano, mes: p.mes }
}

export const mesParaTexto = (m: MesRef): string =>
  new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
