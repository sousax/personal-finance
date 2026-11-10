import type { Cartao, DataISO, Lancamento, MesRef } from './tipos'
import { centavos, diasNoMes, indiceMes, mesDe, parseData, somarMeses } from './dinheiro'
import { mesDoPagamento, ocorrenciasDoMes } from './projecao'
import { categoriaAprendida } from './categorizacao'

export type ContaExterna = {
  id: string; nome: string; tipo: 'BANK' | 'CREDIT'
  fechamento: DataISO | null; vencimento: DataISO | null
  limite?: number | null; disponivel?: number | null; final?: string | null
}

export type TransacaoExterna = {
  id: string; contaId: string; descricao: string; valor: number
  tipo: 'DEBIT' | 'CREDIT'; status: 'PENDING' | 'POSTED'; data: DataISO
  categoria: string | null; operacao: string | null
  parcela: number | null; totalParcelas: number | null
  dataCompra: DataISO | null; valorTotal: number | null
}

export type Vinculo = { externoId: string; lancamentoId: string | null; ocorrencia: string | null }

export type Resumo = { importadas: number; vinculadas: number; ignoradas: number }

const emCentavos = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? centavos(Math.round(n * 100)) : null)
const retratoDe = (c: ContaExterna) => ({ limite: emCentavos(c.limite), disponivel: emCentavos(c.disponivel), final: c.final ?? null })
const mudou = (c: Cartao, r: ReturnType<typeof retratoDe>) => (c.limite ?? null) !== r.limite || (c.disponivel ?? null) !== r.disponivel || (c.final ?? null) !== r.final

const chaveNome = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()

// Liga contas de crédito a cartões, cria os que faltam e atualiza limite, disponível e final dos já ligados.
// Reconectar o banco no Pluggy troca o id da conta, então cartão preso a id que sumiu volta a poder ser ligado.
export function planejarCartoes(contas: ContaExterna[], cartoes: Cartao[], novoId: () => string): { cartoes: Cartao[]; avisos: string[]; semVinculo: { id: string; nome: string }[] } {
  const saida: Cartao[] = []
  const avisos: string[] = []
  const semVinculo: { id: string; nome: string }[] = []
  const atuais = [...cartoes]
  const idsAtuais = new Set(contas.filter((c) => c.tipo === 'CREDIT').map((c) => c.id))
  const livre = (c: Cartao) => c.pluggyContaId === null || !idsAtuais.has(c.pluggyContaId)
  for (const conta of contas) {
    if (conta.tipo !== 'CREDIT') continue
    const retrato = retratoDe(conta)
    const ligado = atuais.find((c) => c.pluggyContaId === conta.id)
    if (ligado) {
      if (mudou(ligado, retrato)) saida.push({ ...ligado, ...retrato })
      continue
    }
    const mesmoNome = atuais.find((c) => livre(c) && chaveNome(c.nome) === chaveNome(conta.nome))
    if (mesmoNome) {
      const ligado = { ...mesmoNome, ...retrato, pluggyContaId: conta.id }
      atuais[atuais.indexOf(mesmoNome)] = ligado
      saida.push(ligado)
      continue
    }
    const fechamento = conta.fechamento && parseData(conta.fechamento)
    const vencimento = conta.vencimento && parseData(conta.vencimento)
    if (!fechamento || !vencimento) {
      semVinculo.push({ id: conta.id, nome: conta.nome })
      continue
    }
    const novo: Cartao = { id: novoId(), nome: conta.nome, diaFechamento: fechamento.dia, diaVencimento: vencimento.dia, pluggyContaId: conta.id, ...retrato }
    atuais.push(novo)
    saida.push(novo)
  }
  return { cartoes: saida, avisos, semVinculo }
}

export type EntradaImportacao = {
  transacoes: TransacaoExterna[]
  contas: ContaExterna[]
  cartoes: Cartao[]
  lancamentos: Lancamento[]
  vinculos: Vinculo[]
  novoId: () => string
}

const PAGAMENTO_FATURA = /(pag(amento|to)|pgto).*fatura|fatura.*pag(amento|to)/i
const SUFIXO_PARCELA = /\s*(parc(ela)?\.?\s*)?\d{1,3}\s*(\/|de)\s*\d{1,3}\s*$/i
const chaveMes = (m: MesRef) => `${m.ano}-${String(m.mes).padStart(2, '0')}`
const aoCentavo = (n: number) => centavos(Math.round(Math.abs(n) * 100))

function deslocarData(data: DataISO, meses: number): DataISO {
  const { dia } = parseData(data)!
  const m = somarMeses(mesDe(data), meses)
  return `${chaveMes(m)}-${String(Math.min(dia, diasNoMes(m.ano, m.mes))).padStart(2, '0')}`
}

// `categoria` exige plano Pro e pode vir nula, por isso a descrição também conta.
const pagamentoDeFatura = (t: TransacaoExterna) =>
  t.categoria === 'Credit card payment' || t.operacao === 'PAGAMENTO_FATURA' || PAGAMENTO_FATURA.test(t.descricao)

export function planejarImportacao(e: EntradaImportacao): { lancamentos: Lancamento[]; vinculos: Vinculo[]; resumo: Resumo; avisos: string[] } {
  const resolvidas = new Set(e.vinculos.map((v) => v.externoId))
  const consumidas = new Set(e.vinculos.filter((v) => v.lancamentoId && v.ocorrencia).map((v) => `${v.lancamentoId}|${v.ocorrencia}`))
  const parceladas = e.lancamentos.filter((l) => l.recorrencia.tipo === 'parcelada')
  const novosLanc: Lancamento[] = []
  const novosVinc: Vinculo[] = []
  const resumo: Resumo = { importadas: 0, vinculadas: 0, ignoradas: 0 }
  const avisos: string[] = []

  const ordem = e.transacoes.map((t, i) => ({ t, i })).sort((a, b) => a.t.data.localeCompare(b.t.data) || a.i - b.i)

  for (const { t } of ordem) {
    if (resolvidas.has(t.id)) continue
    const conta = e.contas.find((c) => c.id === t.contaId)
    if (!conta) continue
    const cartao = conta.tipo === 'CREDIT' ? (e.cartoes.find((c) => c.pluggyContaId === conta.id) ?? null) : null
    if (conta.tipo === 'CREDIT' && !cartao) continue
    if (conta.tipo === 'BANK' && t.status === 'PENDING') continue
    if (!parseData(t.data)) { avisos.push(`Transação ${t.id} com data inválida, ignorada.`); continue }

    const resolver = (lancamentoId: string | null, ocorrencia: string | null) => {
      resolvidas.add(t.id)
      novosVinc.push({ externoId: t.id, lancamentoId, ocorrencia })
      if (lancamentoId && ocorrencia) consumidas.add(`${lancamentoId}|${ocorrencia}`)
    }
    const valor = aoCentavo(t.valor)
    if (valor === 0 || (cartao && t.valor < 0) || (!cartao && pagamentoDeFatura(t))) {
      resolver(null, null); resumo.ignoradas++; continue
    }

    const natureza = cartao || t.tipo === 'DEBIT' ? 'despesa' : 'receita'
    const cartaoId = cartao?.id ?? null
    const descricao = t.descricao.trim() || 'Transação importada'
    const n = t.totalParcelas

    if (natureza === 'despesa' && n !== null && n >= 2 && n <= 120 && t.parcela !== null && t.parcela >= 1 && t.parcela <= n) {
      const oc = `p${t.parcela}`
      const compra = t.dataCompra && parseData(t.dataCompra) ? t.dataCompra : deslocarData(t.data, -(t.parcela - 1))
      const achada = parceladas.find((l) =>
        l.recorrencia.tipo === 'parcelada' && l.cartaoId === cartaoId && l.recorrencia.parcelas === n &&
        Math.abs(Math.floor(l.valor / n) - valor) <= n &&
        Math.abs(indiceMes(mesDe(l.recorrencia.dataCompra)) - indiceMes(mesDe(compra))) <= 1 &&
        !consumidas.has(`${l.id}|${oc}`))
      if (achada) { resolver(achada.id, oc); resumo.vinculadas++; continue }
      const nova: Lancamento = {
        id: e.novoId(), natureza, descricao: descricao.replace(SUFIXO_PARCELA, '') || descricao, valor: t.valorTotal ? aoCentavo(t.valorTotal) : centavos(valor * n),
        categoriaId: categoriaAprendida([...e.lancamentos, ...novosLanc], natureza, descricao), cartaoId, recorrencia: { tipo: 'parcelada', dataCompra: compra, parcelas: n },
      }
      parceladas.push(nova); novosLanc.push(nova); resumo.importadas++
      resolver(nova.id, oc)
      continue
    }

    const mes = mesDoPagamento(t.data, cartao, 0)
    const oc = chaveMes(mes)
    const igual = ocorrenciasDoMes(e.lancamentos, e.cartoes, mes).find((o) =>
      o.natureza === natureza && o.cartaoId === cartaoId && o.valor === valor && !consumidas.has(`${o.lancamentoId}|${oc}`))
    if (igual) { resolver(igual.lancamentoId, oc); resumo.vinculadas++; continue }
    const nova: Lancamento = {
      id: e.novoId(), natureza, descricao, valor,
      categoriaId: categoriaAprendida([...e.lancamentos, ...novosLanc], natureza, descricao), cartaoId, recorrencia: { tipo: 'unica', data: t.data },
    }
    novosLanc.push(nova); resumo.importadas++
    resolver(nova.id, oc)
  }
  return { lancamentos: novosLanc, vinculos: novosVinc, resumo, avisos }
}
