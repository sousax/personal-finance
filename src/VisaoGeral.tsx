import { useState } from 'react'
import { centavos, contasDoMes, diasNoMes, formatarBRL, indiceMes, mesParaTexto, ocorrenciasDoMes, progressoMetas, resumirMes, ritmoDoMes, ROTULO_GRUPO, somarMeses, visaoGeral } from './domain'
import type { Conta, Grupo, MesRef, Movimento } from './domain'
import type { Dados } from './data/api'
import { BotaoTema, Icone } from './ui'
import { MetasCaixinhas } from './Metas'
import { RitmoGrafico } from './RitmoGrafico'
import type { Fase } from './RitmoGrafico'

const GRUPOS: Record<Grupo, { icone: Parameters<typeof Icone>[0]['nome']; cor: string; bg: string }> = {
  own: { icone: 'troca', cor: '#a1a1aa', bg: 'rgba(161,161,170,.18)' },
  box: { icone: 'caixa', cor: 'oklch(0.6 0.19 275)', bg: 'oklch(0.6 0.19 275 / .15)' },
  loan: { icone: 'banco', cor: 'oklch(0.6 0.17 5)', bg: 'oklch(0.6 0.17 5 / .15)' },
  ppl: { icone: 'pessoa', cor: 'oklch(0.72 0.14 70)', bg: 'oklch(0.75 0.14 70 / .18)' },
  shop: { icone: 'sacola', cor: 'oklch(0.62 0.11 180)', bg: 'oklch(0.65 0.11 180 / .16)' },
  inc: { icone: 'entrada', cor: '#16a34a', bg: 'rgba(22,163,74,.14)' },
}
const CONTA = { icone: 'conta', cor: 'oklch(0.62 0.13 240)', bg: 'oklch(0.62 0.13 240 / .15)' } as const
const aparenciaConta = (c: Conta) => c.grupo === 'loan' ? GRUPOS.loan : c.grupo === 'fatura' ? { ...CONTA, icone: 'cartoes' as const } : CONTA
const COR_CAIXINHAS = '#a5b4fc'
const COR_LIVRE = '#86efac'
const ACENTO = 'rgb(var(--acento))'
const POR_PAGINA = 8

const pctBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const mesCurto = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')
const largura = (v: number, base: number) => (base > 0 ? Math.min(100, Math.max(0, (v / base) * 100)) : 0)
const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

type Formatar = (v: number, sinal?: string) => string

function statusConta(c: Conta, fase: Fase, diaHoje: number): { texto: string; classe: string } {
  if (c.paga) return { texto: 'Pago', classe: 'bg-ok/10 text-ok-texto' }
  if (fase === 'futuro') return { texto: `Dia ${c.dia}`, classe: 'bg-elevado text-suave' }
  if (fase === 'passado' || c.dia < diaHoje) return { texto: `Venceu dia ${c.dia}`, classe: 'bg-elevado text-suave' }
  const faltam = c.dia - diaHoje
  return { texto: faltam === 0 ? 'Hoje' : `Em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`, classe: 'bg-elevado text-tinta' }
}

function Barra({ v, base, cor, trilho = 'bg-elevado', altura = 'h-1' }: { v: number; base: number; cor: string; trilho?: string; altura?: string }) {
  return <div className={`${altura} overflow-hidden rounded-full ${trilho}`}><div className="h-full rounded-full" style={{ width: `${largura(v, base)}%`, background: cor }} /></div>
}

function Sparkline({ pontos, cor }: { pontos: number[]; cor: string }) {
  const min = Math.min(0, ...pontos)
  const faixa = Math.max(...pontos, 0) - min
  const y = (v: number) => (faixa > 0 ? 26 - ((v - min) / faixa) * 24 : 26)
  const xs = (i: number) => (pontos.length > 1 ? (i / (pontos.length - 1)) * 100 : 0)
  const d = pontos.length > 1 ? pontos.map((v, i) => `${xs(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : '0,26 100,26'
  return <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 block h-6 w-full overflow-visible" aria-hidden="true"><polyline points={d} fill="none" stroke={cor} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>
}

function VazioPagina({ mes }: { mes: MesRef }) {
  return (
    <div className="rounded-[20px] border border-dashed border-linha px-6 py-14 text-center">
      <div className="text-[17px] font-semibold">Sem movimentações</div>
      <p className="mt-1 text-sm text-suave">Nenhum lançamento para {mesParaTexto(mes)}.</p>
    </div>
  )
}

function Movimentacoes({ movimentos, fmt, mes, rotuloCartao }: { movimentos: Movimento[]; fmt: Formatar; mes: MesRef; rotuloCartao: (id: string) => string | null }) {
  const [filtro, setFiltro] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [aberto, setAberto] = useState(false)
  const lista = movimentos.filter((m) => filtro === 'todas' || m.ocorrencia.natureza === filtro).sort((a, b) => b.ocorrencia.dia - a.ocorrencia.dia)
  const visiveis = aberto ? lista : lista.slice(0, POR_PAGINA)
  const abas = [['todas', 'Todas'], ['receita', 'Entradas'], ['despesa', 'Saídas']] as const

  return (
    <section className="cartao rounded-[20px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Movimentações</h2>
        <div className="flex rounded-full bg-elevado p-1">
          {abas.map(([id, rotulo]) => (
            <button key={id} aria-pressed={filtro === id} onClick={() => { setFiltro(id); setAberto(false) }}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filtro === id ? 'bg-ativo text-tinta shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-suave'}`}>{rotulo}</button>
          ))}
        </div>
      </div>
      {lista.length === 0 && <p className="py-3 text-sm text-suave">Nada neste mês.</p>}
      <ul>
        {visiveis.map((m, i) => {
          const g = GRUPOS[m.grupo]
          const o = m.ocorrencia
          const entrada = o.natureza === 'receita'
          const comNome = m.grupo === 'ppl' || (m.grupo === 'inc' && m.nome !== o.descricao)
          const origem = (o.cartaoId && rotuloCartao(o.cartaoId)) || ROTULO_GRUPO[m.grupo]
          return (
            <li key={i} title={o.descricao} className="grid grid-cols-[40px_1fr_auto] items-center gap-3.5 border-t border-linha py-3 first:border-t-0">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-[13px] font-semibold" style={{ background: g.bg, color: g.cor }}>
                {comNome ? iniciais(m.nome) : <Icone nome={g.icone} className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium">{m.nome}</div>
                <div className="truncate text-[13px] text-suave">{origem} · {o.dia} {mesCurto(mes)}</div>
              </div>
              <span className={`whitespace-nowrap text-[15px] font-semibold tabular-nums ${m.grupo === 'own' ? 'text-suave' : entrada ? 'text-ok-texto' : 'text-tinta'}`}>
                {fmt(o.valor, entrada ? '+ ' : '− ')}
              </span>
            </li>
          )
        })}
      </ul>
      {lista.length > POR_PAGINA && (
        <button className="btn-sec mx-auto mt-2 block" onClick={() => setAberto(!aberto)}>{aberto ? 'Mostrar menos' : `Ver todas (${lista.length})`}</button>
      )}
    </section>
  )
}

function ContasDoMes({ contas, fase, diaHoje, fmt, livre }: { contas: Conta[]; fase: Fase; diaHoje: number; fmt: Formatar; livre: string }) {
  const ordem = [...contas].sort((a, b) => Number(a.paga) - Number(b.paga) || a.dia - b.dia)
  const pagas = contas.filter((c) => c.paga)
  const soma = (cs: Conta[]) => cs.reduce((s, c) => s + c.valor, 0)
  return (
    <section className="cartao rounded-[20px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Contas do mês</h2>
        {contas.length > 0 && <span className="text-[13px] text-suave">{pagas.length} de {contas.length} pagas</span>}
      </div>
      {contas.length === 0 ? <p className="mt-3 text-sm text-suave">Nenhuma conta neste mês.</p> : (
        <>
          <div className="mt-3"><Barra v={soma(pagas)} base={soma(contas)} cor="#16a34a" altura="h-1.5" /></div>
          <ul className="mt-1">
            {ordem.map((c) => {
              const st = statusConta(c, fase, diaHoje)
              const a = aparenciaConta(c)
              return (
                <li key={c.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-linha py-2.5 first:border-t-0">
                  <div className="grid h-9 w-9 place-items-center rounded-[11px]" style={{ background: a.bg, color: a.cor }}><Icone nome={a.icone} className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.nome}</div>
                    <div className="truncate text-xs text-suave">{c.sub}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{fmt(c.valor)}</span>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.classe}`}>{st.texto}</span>
                  </div>
                </li>
              )
            })}
          </ul>
          {/* v.livre já desconta todas as contas do mês (gastos as inclui), então não se subtrai de novo as pendentes */}
          {fase !== 'passado' && pagas.length < contas.length && (
            <div className="mt-2 flex items-baseline justify-between gap-3 rounded-[14px] border border-linha bg-leve px-3.5 py-3 text-[13px]">
              <span className="text-suave">Livre depois das contas a vencer</span>
              <span className="whitespace-nowrap font-semibold tabular-nums">{livre}</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function VisaoGeral({ dados, mes, setMes, recarregar }: { dados: Dados; mes: MesRef; setMes: (m: MesRef) => void; recarregar: () => Promise<void> }) {
  const [oculto, setOculto] = useState(false)
  const [sentido, setSentido] = useState<'R' | 'L'>('R')
  const ocorrencias = ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes)
  const v = visaoGeral(ocorrencias)
  const fmt: Formatar = (valor, sinal = '') => sinal + (oculto ? 'R$ ••••' : formatarBRL(centavos(Math.abs(valor))))
  const fmtLivre = (valor: number) => fmt(valor, valor < 0 ? '− ' : '')
  const navegar = (n: number) => { setSentido(n > 0 ? 'R' : 'L'); setMes(somarMeses(mes, n)) }

  const hoje = new Date()
  const diasMes = diasNoMes(mes.ano, mes.mes)
  const cmp = indiceMes(mes) - indiceMes({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 })
  const fase: Fase = cmp === 0 ? 'atual' : cmp < 0 ? 'passado' : 'futuro'
  const mesAtual = fase === 'atual'
  const diaHoje = hoje.getDate()
  const ritmo = ritmoDoMes(v, fase === 'atual' ? diaHoje : fase === 'passado' ? diasMes : 0, diasMes)
  const diasRestantes = diasMes - diaHoje + 1
  const porDia = Math.floor(Math.max(0, v.livre) / diasRestantes)
  const contas = contasDoMes({ mes, lancamentos: dados.lancamentos, cartoes: dados.cartoes, ocorrencias, movimentos: v.movimentos, vinculos: dados.vinculos })
  const progresso = progressoMetas(dados.metas, dados.lancamentos, v.caixinhas, mes)
  const resumo = resumirMes(dados.lancamentos, dados.cartoes, mes)
  const categorias = [...resumo.porCategoria].sort((a, b) => b[1] - a[1]).map(([id, valor]) => {
    const c = dados.categorias.find((x) => x.id === id)
    return { id: id ?? 'none', nome: c?.nome ?? 'Sem categoria', cor: c?.cor ?? '#a1a1aa', valor: valor as number }
  })
  const totalCategorias = categorias.reduce((s, c) => s + c.valor, 0)

  const base = v.salario + v.outrasEntradas
  const pct = v.salario > 0 ? `${pctBR.format(Math.max(0, (v.livre / v.salario) * 100))}%` : '—'
  const segmentos = [
    ...v.gastosPorGrupo.map((g) => ({ rotulo: ROTULO_GRUPO[g.grupo], cor: GRUPOS[g.grupo].cor, valor: g.valor as number })),
    { rotulo: 'Caixinhas', cor: COR_CAIXINHAS, valor: Math.max(0, v.liquidoCaixinhas) },
    { rotulo: 'Livre', cor: COR_LIVRE, valor: Math.max(0, v.livre) },
  ]
  const tiles = [
    { rotulo: 'Salário', cor: '#bbf7d0', texto: fmt(v.salario), sub: `${v.diaSalario === null ? '' : `Recebido em ${v.diaSalario} ${mesCurto(mes)} · `}${fmt(v.outrasEntradas, '+ ')} extras`, serie: null, traco: '' },
    { rotulo: 'Gastos do mês', cor: '#fecdd3', texto: fmt(v.gastos), sub: null, serie: ritmo.gastos, traco: '#fda4af' },
    { rotulo: 'Guardado (líquido)', cor: '#c7d2fe', texto: fmt(v.liquidoCaixinhas, v.liquidoCaixinhas < 0 ? '− ' : ''), sub: null, serie: ritmo.guardado, traco: '#a5b4fc' },
  ]
  const linhas = [
    { rotulo: 'Salário', texto: fmt(v.salario), v: v.salario, cor: '#16a34a', negrito: true, classe: 'text-ok-texto' },
    ...v.gastosPorGrupo.map((g) => ({ rotulo: ROTULO_GRUPO[g.grupo], texto: fmt(g.valor, '− '), v: g.valor as number, cor: GRUPOS[g.grupo].cor, negrito: false, classe: 'text-tinta' })),
    { rotulo: 'Guardado nas caixinhas (líquido)', texto: fmt(v.liquidoCaixinhas, v.liquidoCaixinhas >= 0 ? '− ' : '+ '), v: v.liquidoCaixinhas, cor: ACENTO, negrito: false, classe: 'text-tinta' },
    { rotulo: 'Outras entradas', texto: fmt(v.outrasEntradas, '+ '), v: v.outrasEntradas, cor: '#16a34a', negrito: false, classe: 'text-ok-texto' },
    { rotulo: 'Livre do salário', texto: fmtLivre(v.livre), v: v.livre, cor: 'rgb(var(--tinta))', negrito: true, classe: v.livre < 0 ? 'text-perigo-texto' : 'text-tinta' },
  ]

  const dif = ritmo.diferenca
  const quando = fase === 'passado' ? 'no mês' : 'até hoje'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-suave">Visão do mês</div>
          <h1 className="text-[28px] font-semibold first-letter:uppercase">{mesParaTexto(mes)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <BotaoTema />
          <button className="flex h-10 items-center gap-2 rounded-full border border-linha bg-superficie px-4 text-[13px]" aria-pressed={oculto} onClick={() => setOculto(!oculto)}>
            <Icone nome="olho" className="h-4 w-4" />{oculto ? 'Mostrar' : 'Ocultar'}
          </button>
          <div className="flex h-10 items-center rounded-full border border-linha bg-superficie text-[13px]">
            <button className="h-full rounded-l-full px-3.5 hover:bg-elevado" aria-label="Mês anterior" onClick={() => navegar(-1)}>&lsaquo;</button>
            <span className="min-w-12 text-center font-medium first-letter:uppercase">{mesCurto(mes)}</span>
            <button className="h-full rounded-r-full px-3.5 hover:bg-elevado" aria-label="Próximo mês" onClick={() => navegar(1)}>&rsaquo;</button>
          </div>
        </div>
      </div>

      {ocorrencias.length === 0 ? <VazioPagina mes={mes} /> : (
        <div key={`${mes.ano}-${mes.mes}`} className={`space-y-5 ${sentido === 'R' ? 'mes-inR' : 'mes-inL'}`}>
          <section className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/[.06] bg-[#121214] p-6 text-white shadow-[0_20px_40px_-20px_rgba(24,24,27,.45)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(60% 90% at 100% 0%, rgba(79,70,229,.85) 0%, rgba(79,70,229,0) 60%), radial-gradient(50% 80% at 55% 10%, rgba(127,29,72,.75) 0%, rgba(127,29,72,0) 70%), radial-gradient(40% 60% at 85% 100%, rgba(67,56,202,.35) 0%, rgba(67,56,202,0) 70%)' }} />

            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm text-white/70">Livre do salário</div>
                {mesAtual && (
                  <div className="rounded-full border border-white/[.14] bg-white/10 px-3 py-1.5 text-[13px]">
                    {fmt(porDia)}/dia por {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                  </div>
                )}
              </div>
              <div className={`mt-1 break-words font-titulo text-[clamp(36px,9vw,48px)] font-semibold leading-tight tabular-nums tracking-[-0.03em] ${v.livre < 0 ? 'text-perigo-claro' : ''}`}>{fmtLivre(v.livre)}</div>
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

            <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-3">
              {tiles.map((t) => (
                <div key={t.rotulo} className="rounded-2xl border border-white/10 bg-white/[.07] p-4">
                  <div className="text-[13px] text-white/75">{t.rotulo}</div>
                  <div className="mt-2 whitespace-nowrap font-titulo text-[22px] font-semibold tabular-nums" style={{ color: t.cor }}>{t.texto}</div>
                  {t.serie && <Sparkline pontos={t.serie} cor={t.traco} />}
                  {t.sub && <div className="mt-2 text-[12px] text-white/60">{t.sub}</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="cartao rounded-[20px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold">Gastos dia a dia</h2>
                <p className="mt-0.5 text-[13px] text-suave">
                  {fase === 'futuro' ? `ritmo ideal para o mês seria ${fmt(v.salario)}` : `${fmt(ritmo.gastosAteLimite)} ${quando} · ritmo ideal seria ${fmt(ritmo.idealAteLimite)}`}
                </p>
              </div>
              {fase !== 'futuro' && (
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium ${dif > 0 ? 'bg-perigo/10 text-perigo-texto' : 'bg-ok/10 text-ok-texto'}`}>
                  {dif > 0 ? `${fmt(dif)} acima do ritmo` : dif < 0 ? `${fmt(-dif)} abaixo do ritmo` : 'No ritmo'}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-suave">
              <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: ACENTO }} />Gasto acumulado</span>
              <span className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-[#a1a1aa]" />Ritmo ideal (salário ÷ {diasMes} dias)</span>
            </div>
            <div className="mt-3">
              <RitmoGrafico gastos={ritmo.gastos} salario={v.salario} dias={diasMes} fase={fase} mesCurto={mesCurto(mes)} fmt={(n) => fmt(n)} />
            </div>
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-5">
            <ContasDoMes contas={contas} fase={fase} diaHoje={diaHoje} fmt={fmt} livre={fmtLivre(v.livre)} />

            <section className="cartao rounded-[20px]">
              <h2 className="text-[17px] font-semibold">Do salário à sobra</h2>
              <ul className="mt-2">
                {linhas.map((l) => (
                  <li key={l.rotulo} className={`border-t py-3 first:border-t-0 ${l.negrito ? 'border-linha' : 'border-fundo'}`}>
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                      <span className={l.negrito ? 'font-semibold' : ''}>{l.rotulo}</span>
                      <span className={`whitespace-nowrap tabular-nums ${l.negrito ? 'font-semibold' : 'font-medium'} ${l.classe}`}>{l.texto}</span>
                    </div>
                    <Barra v={Math.abs(l.v)} base={v.salario} cor={l.cor} />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <MetasCaixinhas caixinhas={v.caixinhas} progresso={progresso} liquido={v.liquidoCaixinhas} fmt={fmt} recarregar={recarregar} />

          {categorias.length > 0 && (
            <section className="cartao rounded-[20px]">
              <h2 className="text-[17px] font-semibold">Despesas por categoria</h2>
              <ul className="mt-2">
                {categorias.map((c) => (
                  <li key={c.id} className="border-t border-fundo py-3 first:border-t-0">
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{c.nome}</span>
                      <span className="whitespace-nowrap font-medium tabular-nums">{fmt(c.valor)}</span>
                    </div>
                    <Barra v={c.valor} base={totalCategorias} cor={c.cor} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Movimentacoes movimentos={v.movimentos} fmt={fmt} mes={mes} rotuloCartao={(id) => { const c = dados.cartoes.find((x) => x.id === id); return c ? `Fatura ${c.nome}` : null }} />
        </div>
      )}
    </div>
  )
}
