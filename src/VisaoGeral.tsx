import { useState } from 'react'
import { centavos, diasNoMes, formatarBRL, mesParaTexto, ocorrenciasDoMes, somarMeses, visaoGeral } from './domain'
import type { Grupo, MesRef, Movimento } from './domain'
import type { Dados } from './data/api'
import { Icone } from './ui'

const GRUPOS: Record<Grupo, { label: string; cor: string; bg: string; fg: string }> = {
  own: { label: 'Entre minhas contas', cor: '#a1a1aa', bg: '#f4f4f5', fg: '#52525b' },
  box: { label: 'Caixinhas', cor: 'oklch(0.52 0.2 275)', bg: 'oklch(0.95 0.03 275)', fg: 'oklch(0.42 0.18 275)' },
  loan: { label: 'Empréstimos', cor: 'oklch(0.5 0.16 5)', bg: 'oklch(0.95 0.03 5)', fg: 'oklch(0.45 0.15 5)' },
  ppl: { label: 'Pix para pessoas', cor: 'oklch(0.75 0.14 70)', bg: 'oklch(0.96 0.04 75)', fg: 'oklch(0.5 0.11 60)' },
  shop: { label: 'Consumo', cor: 'oklch(0.65 0.11 180)', bg: 'oklch(0.95 0.03 180)', fg: 'oklch(0.45 0.09 180)' },
  inc: { label: 'Receita', cor: '#16a34a', bg: '#dcfce7', fg: '#15803d' },
}
const COR_CAIXINHAS = '#a5b4fc'
const COR_LIVRE = '#86efac'
const INDIGO = '#4f46e5'
const POR_PAGINA = 8

const pctBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const mesCurto = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')
const largura = (v: number, base: number) => (base > 0 ? Math.min(100, Math.max(0, (v / base) * 100)) : 0)
const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

type Formatar = (v: number, sinal?: string) => string

function Barra({ v, base, cor, trilho = 'bg-elevado', altura = 'h-1' }: { v: number; base: number; cor: string; trilho?: string; altura?: string }) {
  return <div className={`${altura} overflow-hidden rounded-full ${trilho}`}><div className="h-full rounded-full" style={{ width: `${largura(v, base)}%`, background: cor }} /></div>
}

function Movimentacoes({ movimentos, fmt }: { movimentos: Movimento[]; fmt: Formatar }) {
  const [filtro, setFiltro] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [aberto, setAberto] = useState(false)
  const lista = movimentos.filter((m) => filtro === 'todas' || m.ocorrencia.natureza === filtro)
  const visiveis = aberto ? lista : lista.slice(0, POR_PAGINA)
  const abas = [['todas', 'Todas'], ['receita', 'Entradas'], ['despesa', 'Saídas']] as const

  return (
    <section className="cartao rounded-[20px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Movimentações</h2>
        <div className="flex rounded-full bg-elevado p-1">
          {abas.map(([id, rotulo]) => (
            <button key={id} aria-pressed={filtro === id} onClick={() => { setFiltro(id); setAberto(false) }}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filtro === id ? 'bg-superficie text-tinta shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-suave'}`}>{rotulo}</button>
          ))}
        </div>
      </div>
      {lista.length === 0 && <p className="py-3 text-sm text-suave">Nada neste mês.</p>}
      <ul>
        {visiveis.map((m, i) => {
          const g = GRUPOS[m.grupo]
          const entrada = m.ocorrencia.natureza === 'receita'
          return (
            <li key={i} title={m.ocorrencia.descricao} className="grid grid-cols-[40px_1fr_auto] items-center gap-3.5 border-t border-linha py-3 first:border-t-0">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-[13px] font-semibold" style={{ background: g.bg, color: g.fg }}>{iniciais(m.nome)}</div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium">{m.nome}</div>
                <div className="text-[13px] text-suave">{g.label}</div>
              </div>
              <span className={`whitespace-nowrap text-[15px] font-semibold tabular-nums ${m.grupo === 'own' ? 'text-[#a1a1aa]' : entrada ? 'text-ok-texto' : 'text-tinta'}`}>
                {fmt(m.ocorrencia.valor, entrada ? '+ ' : '− ')}
              </span>
            </li>
          )
        })}
      </ul>
      {lista.length > POR_PAGINA && (
        <button className="btn-sec mt-2 w-full" onClick={() => setAberto(!aberto)}>{aberto ? 'Mostrar menos' : `Ver todas (${lista.length})`}</button>
      )}
    </section>
  )
}

export function VisaoGeral({ dados, mes, setMes }: { dados: Dados; mes: MesRef; setMes: (m: MesRef) => void }) {
  const [oculto, setOculto] = useState(false)
  const v = visaoGeral(ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes))
  const fmt: Formatar = (valor, sinal = '') => sinal + (oculto ? 'R$ ••••' : formatarBRL(centavos(Math.abs(valor))))
  const fmtLivre = (valor: number) => fmt(valor, valor < 0 ? '− ' : '')

  const base = v.salario + v.outrasEntradas
  const pct = v.salario > 0 ? `${pctBR.format(Math.max(0, (v.livre / v.salario) * 100))}%` : '—'
  const hoje = new Date()
  const mesAtual = hoje.getFullYear() === mes.ano && hoje.getMonth() + 1 === mes.mes
  const diasRestantes = diasNoMes(mes.ano, mes.mes) - hoje.getDate() + 1
  const porDia = Math.floor(Math.max(0, v.livre) / diasRestantes)

  const segmentos = [
    ...v.gastosPorGrupo.map((g) => ({ rotulo: GRUPOS[g.grupo].label, cor: GRUPOS[g.grupo].cor, valor: g.valor as number })),
    { rotulo: 'Caixinhas', cor: COR_CAIXINHAS, valor: Math.max(0, v.liquidoCaixinhas) },
    { rotulo: 'Livre', cor: COR_LIVRE, valor: Math.max(0, v.livre) },
  ]
  const tiles = [
    { rotulo: 'Salário', cor: '#bbf7d0', texto: fmt(v.salario) },
    { rotulo: 'Gastos do mês', cor: '#fecdd3', texto: fmt(v.gastos) },
    { rotulo: 'Guardado (líquido)', cor: '#c7d2fe', texto: fmt(v.liquidoCaixinhas, v.liquidoCaixinhas < 0 ? '− ' : '') },
  ]
  const linhas = [
    { rotulo: 'Salário', texto: fmt(v.salario), v: v.salario, cor: '#16a34a', negrito: true, classe: 'text-ok-texto' },
    ...v.gastosPorGrupo.map((g) => ({ rotulo: GRUPOS[g.grupo].label, texto: fmt(g.valor, '− '), v: g.valor as number, cor: GRUPOS[g.grupo].cor, negrito: false, classe: '' })),
    { rotulo: 'Guardado nas caixinhas (líquido)', texto: fmt(v.liquidoCaixinhas, v.liquidoCaixinhas >= 0 ? '− ' : '+ '), v: v.liquidoCaixinhas, cor: INDIGO, negrito: false, classe: '' },
    { rotulo: 'Outras entradas', texto: fmt(v.outrasEntradas, '+ '), v: v.outrasEntradas, cor: '#16a34a', negrito: false, classe: 'text-ok-texto' },
    { rotulo: 'Livre do salário', texto: fmtLivre(v.livre), v: v.livre, cor: '#18181b', negrito: true, classe: v.livre < 0 ? 'text-perigo-texto' : 'text-tinta' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-suave">Visão do mês</div>
          <h1 className="text-[26px] font-semibold first-letter:uppercase">{mesParaTexto(mes)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-10 items-center gap-2 rounded-full border border-linha bg-superficie px-4 text-[13px]" aria-pressed={oculto} onClick={() => setOculto(!oculto)}>
            <Icone nome="olho" className="h-4 w-4" />{oculto ? 'Mostrar' : 'Ocultar'}
          </button>
          <div className="flex h-10 items-center rounded-full border border-linha bg-superficie text-[13px]">
            <button className="h-full rounded-l-full px-3.5 hover:bg-elevado" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>&lsaquo;</button>
            <span className="min-w-12 text-center font-medium first-letter:uppercase">{mesCurto(mes)}</span>
            <button className="h-full rounded-r-full px-3.5 hover:bg-elevado" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>&rsaquo;</button>
          </div>
        </div>
      </div>

      <section className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-[#121214] p-5 text-white shadow-[0_20px_40px_-20px_rgba(24,24,27,.45)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 90% at 100% 0%, rgba(79,70,229,.85) 0%, rgba(79,70,229,0) 60%), radial-gradient(50% 80% at 55% 10%, rgba(127,29,72,.75) 0%, rgba(127,29,72,0) 70%), radial-gradient(40% 60% at 85% 100%, rgba(67,56,202,.35) 0%, rgba(67,56,202,0) 70%)' }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.22] mix-blend-overlay"
          style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm text-white/70">Livre do salário</div>
            {mesAtual && (
              <div className="rounded-full border border-white/[.14] bg-white/10 px-3 py-1.5 text-[13px] backdrop-blur">
                {fmt(porDia)}/dia por {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
              </div>
            )}
          </div>
          <div className={`mt-1 break-words font-titulo text-[32px] font-semibold tabular-nums tracking-[-0.03em] sm:text-5xl ${v.livre < 0 ? 'text-perigo-claro' : ''}`}>{fmtLivre(v.livre)}</div>
          <div className="mt-1 text-sm text-white/70">de {fmt(v.salario)} · {pct} ainda disponível</div>
        </div>

        <div className="relative">
          <div className="flex h-2.5 gap-[3px]">
            {segmentos.map((s) => <div key={s.rotulo} className="h-full rounded-full" style={{ width: `${largura(s.valor, base)}%`, background: s.cor }} />)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-white/80">
            {segmentos.map((s) => (
              <li key={s.rotulo} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />{s.rotulo}</li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3">
          {tiles.map((t) => (
            <div key={t.rotulo} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur-xl">
              <div className="text-[13px]" style={{ color: t.cor }}>{t.rotulo}</div>
              <div className="mt-1 font-titulo text-[22px] font-semibold tabular-nums">{t.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
        <section className="cartao rounded-[20px]">
          <h2 className="text-[17px] font-semibold">Do salário à sobra</h2>
          <ul className="mt-2">
            {linhas.map((l) => (
              <li key={l.rotulo} className={`border-t py-3 first:border-t-0 ${l.negrito ? 'border-linha' : 'border-fundo'}`}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className={l.negrito ? 'font-semibold' : ''}>{l.rotulo}</span>
                  <span className={`whitespace-nowrap tabular-nums ${l.negrito ? 'font-semibold' : 'font-medium'} ${l.classe}`} style={l.classe ? undefined : { color: l.cor }}>{l.texto}</span>
                </div>
                <Barra v={Math.abs(l.v)} base={v.salario} cor={l.cor} />
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao rounded-[20px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold">Caixinhas</h2>
            <span className="text-[13px] text-suave">Líquido no mês {fmt(v.liquidoCaixinhas, v.liquidoCaixinhas < 0 ? '− ' : '')}</span>
          </div>
          {v.caixinhas.length === 0 && <p className="mt-3 text-sm text-suave">Nenhuma caixinha neste mês.</p>}
          <div className="mt-3 space-y-3">
            {v.caixinhas.map((c) => (
              <div key={c.nome} className="rounded-2xl border border-[#f0f0f1] bg-[#fafafa] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-semibold">{c.nome}</span>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium tabular-nums ${c.liquido >= 0 ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-perigo/10 text-perigo-texto'}`}>{fmt(c.liquido, c.liquido >= 0 ? '+ ' : '− ')}</span>
                </div>
                <Barra v={c.retirado} base={c.guardado} cor={INDIGO} trilho="bg-[#e4e4e7]" altura="h-1.5" />
                <div className="mt-2 flex justify-between gap-3 text-[13px] text-suave">
                  <span>Guardado {fmt(c.guardado)}</span><span>Retirado {fmt(c.retirado)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Movimentacoes key={`${mes.ano}-${mes.mes}`} movimentos={v.movimentos} fmt={fmt} />
    </div>
  )
}
