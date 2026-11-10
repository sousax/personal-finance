import { useState } from 'react'
import { centavos, contasDoMes, formatarBRL, ocorrenciasDoMes, parcelasTerminando, progressoMetas, somarMeses, ultimosLancamentos, variacaoPorCategoria, visaoGeral } from './domain'
import type { Conta, MesRef, Ocorrencia } from './domain'
import type { Dados } from './data/api'
import { BotaoTema, Icone } from './ui'

export type Ir = (aba: 'Visão do mês' | 'Lançamentos' | 'Cartões' | 'Metas', pedido?: { natureza?: 'receita' | 'despesa'; busca?: string }) => void

const BRILHO = 'radial-gradient(120% 140% at 100% 0%,#4B37C8 0%,#3A1530 46%,#191C1F 80%)'
const GRAD = 'linear-gradient(90deg,#8E2440,#6A4BFF)'
const CARTOES = ['radial-gradient(130% 160% at 100% 0%,#6A4BFF 0%,#191C1F 72%)', 'radial-gradient(130% 160% at 100% 0%,#8E2440 0%,#191C1F 72%)']
const SEM_COR = '#A1A1AA'
const card = 'rounded-[22px] bg-superficie px-6 py-[22px]'
const h2 = 'font-titulo text-[17px] font-semibold !tracking-[-0.02em]'
const link = 'text-[13px] font-semibold text-violeta-forte hover:text-tinta'
const tinta = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`

const nomeMes = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
const mesCurto = (m: MesRef) => nomeMes(m).slice(0, 3)
const doisDigitos = (n: number) => String(n).padStart(2, '0')
const saudacao = (h: number) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')

function somaCartao(ocorrencias: Ocorrencia[], id: string) {
  return ocorrencias.reduce((s, o) => s + (o.natureza === 'despesa' && o.cartaoId === id ? o.valor : 0), 0)
}

export function Inicio({ dados, ir }: { dados: Dados; ir: Ir }) {
  const [oculto, setOculto] = useState(false)
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('mes')
  const [busca, setBusca] = useState('')
  const fmt = (v: number, sinal = '') => (oculto ? 'R$ ••••••' : sinal + formatarBRL(centavos(Math.abs(v))))

  const agora = new Date()
  const diaHoje = agora.getDate()
  const mes: MesRef = { ano: agora.getFullYear(), mes: agora.getMonth() + 1 }
  const anterior = somarMeses(mes, -1)
  const proximo = somarMeses(mes, 1)
  const doMes = (m: MesRef) => {
    const ocorrencias = ocorrenciasDoMes(dados.lancamentos, dados.cartoes, m)
    return { m, ocorrencias, v: visaoGeral(ocorrencias) }
  }
  const [atual, ant, prox] = [doMes(mes), doMes(anterior), doMes(proximo)]
  const v = atual.v

  const entradas = v.salario + v.outrasEntradas
  const saidas = Math.max(0, entradas - v.livre)
  const pctLivre = (x: typeof v) => { const e = x.salario + x.outrasEntradas; return e > 0 ? Math.round((x.livre / e) * 100) : null }
  const pct = pctLivre(v)
  const pctAnt = pctLivre(ant.v)
  const pp = pct !== null && pctAnt !== null ? pct - pctAnt : null

  const contas = (x: typeof atual) => contasDoMes({ mes: x.m, lancamentos: dados.lancamentos, cartoes: dados.cartoes, ocorrencias: x.ocorrencias, movimentos: x.v.movimentos, vinculos: dados.vinculos })
  const proximas: (Conta & { m: MesRef })[] = [
    ...contas(atual).filter((c) => !c.paga && c.dia >= diaHoje).map((c) => ({ ...c, m: mes })),
    ...contas(prox).filter((c) => !c.paga).map((c) => ({ ...c, m: proximo })),
  ].sort((a, b) => a.m.ano * 12 + a.m.mes - (b.m.ano * 12 + b.m.mes) || a.dia - b.dia).slice(0, 4)

  const categoria = (id: string | null) => dados.categorias.find((c) => c.id === id)
  const variacoes = variacaoPorCategoria(v.movimentos, ant.v.movimentos, 1, diaHoje)
  const cats = periodo === 'mes' ? variacoes : variacaoPorCategoria(v.movimentos, [], Math.max(1, diaHoje - 6), diaHoje)
  const totalCats = cats.reduce((s, c) => s + c.atual, 0)

  const progresso = progressoMetas(dados.metas, dados.lancamentos, v.caixinhas, mes)
  const meta = progresso.find((p) => p.pct < 100) ?? progresso[0]

  const hojeISO = `${mes.ano}-${doisDigitos(mes.mes)}-${doisDigitos(diaHoje)}`
  const recentes = ultimosLancamentos(dados.lancamentos, hojeISO, 6)

  const queda = variacoes.filter((c) => c.pct !== null && c.pct < 0).sort((a, b) => a.pct! - b.pct!)[0]
  const alta = variacoes.filter((c) => c.pct !== null && c.pct > 0).sort((a, b) => b.pct! - a.pct!)[0]
  const parcela = parcelasTerminando(dados.lancamentos, dados.cartoes, mes)[0]
  const nomeCat = (id: string | null) => categoria(id)?.nome ?? 'Sem categoria'
  const dicas = [
    queda && { icone: '↓', fundo: 'bg-ok/10', selo: 'bg-ok', titulo: `${nomeCat(queda.categoriaId)} ${-queda.pct!}% abaixo de ${nomeMes(anterior)}`, texto: `Você gastou ${fmt(queda.anterior - queda.atual)} a menos até agora.` },
    alta && { icone: '!', fundo: 'bg-violeta/10', selo: '', titulo: `${nomeCat(alta.categoriaId)} subiu ${alta.pct}%`, texto: `${fmt(alta.atual - alta.anterior)} a mais que no mesmo período de ${nomeMes(anterior)}.` },
    parcela && {
      icone: '✓', fundo: 'bg-elevado', selo: 'bg-painel',
      titulo: parcela.restantes === 0 ? `${parcela.lancamento.descricao} termina este mês` : `${parcela.lancamento.descricao} termina em ${nomeMes(parcela.ultimoMes)}`,
      texto: parcela.restantes === 0 ? 'Esta é a última parcela.' : `Faltam ${parcela.restantes} ${parcela.restantes === 1 ? 'parcela' : 'parcelas'} de ${fmt(parcela.valorParcela)}.`,
    },
  ].filter(Boolean) as { icone: string; fundo: string; selo: string; titulo: string; texto: string }[]

  const dataExtenso = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '')

  return (
    <div className="flex flex-col gap-[18px]">
      <svg width="0" height="0" className="absolute" aria-hidden="true"><defs><linearGradient id="ofRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8E2440" /><stop offset="1" stopColor="#6A4BFF" /></linearGradient></defs></svg>

      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-suave first-letter:uppercase">{dataExtenso}</span>
          <h1 className="font-titulo text-[30px] font-semibold !tracking-[-0.035em]">{saudacao(agora.getHours())} 👋</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <form role="search" className="relative w-full sm:w-[280px]" onSubmit={(e) => { e.preventDefault(); ir('Lançamentos', { busca: busca.trim() }) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-[15px] top-[13px] text-suave" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input aria-label="Buscar lançamento" placeholder="Buscar lançamento" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="h-[42px] w-full rounded-full border border-linha bg-superficie pl-10 pr-4 text-sm text-tinta placeholder:text-suave focus:border-violeta focus:shadow-[0_0_0_4px_rgba(106,75,255,.14)] focus:outline-none" />
          </form>
          <BotaoTema />
          <button onClick={() => ir('Lançamentos')} className="flex h-[42px] items-center gap-2 rounded-full bg-tinta px-[18px] text-sm font-semibold text-superficie transition active:scale-[.985]"><span className="text-lg leading-none">+</span>Novo lançamento</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-[18px]">
        <section className="relative flex flex-[2_1_520px] flex-col gap-[22px] overflow-hidden rounded-3xl px-7 py-[26px] text-white" style={{ background: BRILHO }}>
          <svg width="220" height="220" viewBox="0 0 56 56" aria-hidden="true" className="absolute -bottom-10 -right-[30px] opacity-[.12]"><rect x="6" y="34" width="12" height="16" rx="6" fill="#fff" /><rect x="22" y="22" width="12" height="28" rx="6" fill="#fff" /><rect x="38" y="8" width="12" height="42" rx="6" fill="#fff" /></svg>
          <div className="relative flex items-center justify-between gap-3">
            <h2 className="text-sm text-white/[.72]">Sobra prevista em {nomeMes(mes)}</h2>
            <button onClick={() => setOculto(!oculto)} aria-pressed={oculto} className="flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold">
              <Icone nome="olho" className="h-3.5 w-3.5" />{oculto ? 'Mostrar' : 'Ocultar'}
            </button>
          </div>
          <div className="relative flex flex-col gap-1.5">
            <span className={`font-titulo text-[clamp(40px,5vw,56px)] font-semibold leading-none tabular-nums tracking-[-0.045em] ${v.livre < 0 ? 'text-perigo-claro' : ''}`}>{fmt(v.livre, v.livre < 0 ? '− ' : '')}</span>
            {pct !== null && (
              <span className="text-sm text-white/[.72]">
                Você está guardando <b className="text-white">{pct}%</b> do que entra
                {pp !== null && ` · ${pp > 0 ? '+' : pp < 0 ? '−' : ''}${Math.abs(pp)} p.p. vs ${nomeMes(anterior)}`}
              </span>
            )}
          </div>
          <div className="relative flex max-w-[520px] flex-col gap-2">
            <div className="flex h-2.5 overflow-hidden rounded-[5px] bg-white/[.12]">
              <div className="bg-white/[.85]" style={{ width: `${entradas > 0 ? Math.min(100, (saidas / entradas) * 100) : 0}%` }} />
              <div style={{ width: `${entradas > 0 ? Math.max(0, (v.livre / entradas) * 100) : 0}%`, background: 'linear-gradient(90deg,#B02A45,#8A70FF)' }} />
            </div>
            <div className="flex justify-between text-[13px] tabular-nums text-white/[.72]"><span>Receitas <b className="text-white">{fmt(entradas)}</b></span><span>Despesas <b className="text-white">{fmt(saidas)}</b></span></div>
          </div>
          <div className="relative flex flex-wrap gap-2 text-[13px] font-semibold">
            <button onClick={() => ir('Lançamentos', { natureza: 'despesa' })} className="rounded-full bg-white px-3.5 py-[9px] text-[#191C1F]">− Despesa</button>
            <button onClick={() => ir('Lançamentos', { natureza: 'receita' })} className="rounded-full bg-white/[.12] px-3.5 py-[9px]">+ Receita</button>
            <button onClick={() => ir('Visão do mês')} className="rounded-full bg-white/[.12] px-3.5 py-[9px]">Ver o mês</button>
          </div>
        </section>

        <section className={`${card} flex flex-[1_1_300px] flex-col gap-1.5`}>
          <div className="mb-1.5 flex items-baseline justify-between"><h2 className={h2}>Próximas contas</h2>{proximas.length > 0 && <span className="text-[13px] tabular-nums text-suave">{fmt(proximas.reduce((s, c) => s + c.valor, 0))}</span>}</div>
          {proximas.length === 0 && <p className="text-sm text-suave">Nenhuma conta a vencer.</p>}
          {proximas.map((c) => (
            <div key={`${c.m.mes}-${c.id}`} className="flex items-center gap-3 border-t border-linha py-2.5">
              <span className={`flex h-11 w-11 flex-none flex-col items-center justify-center rounded-[14px] leading-[1.05] ${c.grupo === 'fatura' ? 'bg-violeta/10 text-violeta-forte' : 'bg-elevado'}`}>
                <span className="font-titulo text-base font-semibold">{doisDigitos(c.dia)}</span><span className="text-[10px] uppercase opacity-75">{mesCurto(c.m)}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-sm font-semibold">{c.nome}</span><span className="truncate text-xs text-suave">{c.sub}</span></span>
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{fmt(c.valor)}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="flex flex-wrap gap-[18px]">
        <section className={`${card} flex flex-[1.4_1_380px] flex-col gap-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={h2}>Para onde foi o dinheiro</h2>
            <div className="flex gap-1 rounded-full bg-elevado p-[3px]">
              {([['semana', 'Semana'], ['mes', 'Mês']] as const).map(([id, rotulo]) => (
                <button key={id} onClick={() => setPeriodo(id)} aria-pressed={periodo === id} className={`h-[30px] rounded-full px-3.5 text-[13px] font-semibold ${periodo === id ? 'bg-tinta text-superficie' : 'text-suave'}`}>{rotulo}</button>
              ))}
            </div>
          </div>
          {cats.length === 0 ? <p className="text-sm text-suave">Nenhum gasto {periodo === 'mes' ? 'neste mês' : 'nos últimos 7 dias'}.</p> : (
            <>
              <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[7px]">
                {cats.map((c) => <div key={c.categoriaId ?? '-'} style={{ width: `${(c.atual / totalCats) * 100}%`, background: categoria(c.categoriaId)?.cor ?? SEM_COR }} />)}
              </div>
              <ul className="flex flex-col gap-3">
                {cats.map((c) => (
                  <li key={c.categoriaId ?? '-'} className="grid grid-cols-[minmax(0,1fr)_auto_52px] items-center gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: categoria(c.categoriaId)?.cor ?? SEM_COR }} />
                      <span className="truncate">{nomeCat(c.categoriaId)}</span>
                      {periodo === 'mes' && <span className={`text-xs ${c.pct === null || c.pct === 0 ? 'text-suave' : c.pct > 0 ? 'text-perigo-texto' : 'text-ok-texto'}`}>{c.pct === null ? '—' : `${c.pct > 0 ? '+' : c.pct < 0 ? '−' : ''}${Math.abs(c.pct)}%`}</span>}
                    </span>
                    <span className="font-semibold tabular-nums">{fmt(c.atual)}</span>
                    <span className="text-right text-xs tabular-nums text-suave">{Math.round((c.atual / totalCats) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
          <div className="flex items-baseline justify-between"><h2 className={h2}>Cartões</h2><button onClick={() => ir('Cartões')} className={link}>Ver cartões</button></div>
          {dados.cartoes.length === 0 && <p className="text-sm text-suave">Nenhum cartão cadastrado.</p>}
          {dados.cartoes.map((c, i) => {
            const m = diaHoje <= c.diaVencimento ? atual : prox
            return (
              <div key={c.id} className="flex items-end justify-between gap-3 rounded-2xl px-4 py-3.5 text-white" style={{ background: CARTOES[i % CARTOES.length] }}>
                <span className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-xs opacity-70">{c.nome}</span><span className="font-titulo text-[22px] font-semibold tabular-nums">{fmt(somaCartao(m.ocorrencias, c.id))}</span></span>
                <span className="flex flex-col items-end gap-0.5 whitespace-nowrap text-[11px] opacity-70"><span>vence {doisDigitos(c.diaVencimento)} {mesCurto(m.m)}</span><span>fecha dia {c.diaFechamento}</span></span>
              </div>
            )
          })}
        </section>

        <section className={`${card} flex flex-[1_1_260px] flex-col items-center gap-3.5 text-center`}>
          <div className="flex items-baseline justify-between self-stretch"><h2 className={h2}>Meta</h2><button onClick={() => ir('Metas')} className={link}>Ver metas</button></div>
          {!meta ? (
            <p className="my-auto text-sm text-suave">Defina uma meta para uma caixinha e acompanhe aqui.</p>
          ) : (
            <>
              <div className="relative h-[156px] w-[156px]">
                <svg width="156" height="156" viewBox="0 0 156 156" aria-hidden="true">
                  <circle cx="78" cy="78" r="64" fill="none" strokeWidth="14" className="stroke-elevado" />
                  <circle cx="78" cy="78" r="64" fill="none" stroke="url(#ofRing)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(meta.pct / 100) * 402.1} 402.1`} transform="rotate(-90 78 78)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-titulo text-[32px] font-semibold !tracking-[-0.035em]">{meta.pct}%</span><span className="text-xs text-suave">concluído</span></div>
              </div>
              <div className="flex flex-col gap-1"><span className="text-[15px] font-semibold">{meta.meta.nome}</span><span className="text-[13px] tabular-nums text-suave">{fmt(meta.saldoAtual)} de {fmt(meta.meta.meta)}</span></div>
              <span className="text-xs text-suave">{meta.previsao}.</span>
            </>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-[18px]">
        <section className={`${card} flex flex-[2_1_520px] flex-col gap-1.5 pb-3`}>
          <div className="mb-1.5 flex items-baseline justify-between"><h2 className={h2}>Últimos lançamentos</h2><button onClick={() => ir('Lançamentos')} className={link}>Ver todos</button></div>
          {recentes.length === 0 && <p className="text-sm text-suave">Nenhum lançamento ainda.</p>}
          <ul>
            {recentes.map(({ lancamento: l, data }) => {
              const cat = categoria(l.categoriaId)
              const cor = l.natureza === 'receita' ? '#1F8F4E' : (cat?.cor ?? SEM_COR)
              const [, mm, dd] = data.split('-')
              const origem = dados.cartoes.find((c) => c.id === l.cartaoId)?.nome ?? 'Conta'
              const extra = l.recorrencia.tipo === 'mensal' ? ' · Recorrente' : l.recorrencia.tipo === 'parcelada' ? ` · ${l.recorrencia.parcelas}x` : ''
              return (
                <li key={l.id} className="-mx-2 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-leve sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,140px)_auto]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: tinta(cor, 14), color: cor }}>{l.descricao.trim()[0]?.toUpperCase()}</span>
                  <span className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-sm font-semibold">{l.descricao}</span><span className="truncate text-xs text-suave">{dd} {mesCurto({ ano: 0, mes: Number(mm) })} · {origem}{extra}</span></span>
                  <span className="hidden min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] text-suave sm:flex"><span className="h-2 w-2 flex-none rounded-sm" style={{ background: cor }} /><span className="truncate">{cat?.nome ?? 'Sem categoria'}</span></span>
                  <span className={`whitespace-nowrap text-right text-sm font-semibold tabular-nums ${l.natureza === 'receita' ? 'text-ok-texto' : ''}`}>{fmt(l.valor, l.natureza === 'receita' ? '+ ' : '− ')}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={`${card} flex flex-[1_1_300px] flex-col gap-3`}>
          <h2 className={h2}>Para ficar de olho</h2>
          {dicas.length === 0 && <p className="text-sm text-suave">Nada fora do normal por enquanto.</p>}
          {dicas.map((d) => (
            <div key={d.titulo} className={`flex gap-3 rounded-2xl p-3.5 ${d.fundo}`}>
              <span className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[11px] text-[15px] font-bold text-white ${d.selo}`} style={d.selo ? undefined : { background: GRAD }}>{d.icone}</span>
              <span className="flex flex-col gap-[3px]"><span className="text-sm font-semibold leading-[1.35]">{d.titulo}</span><span className="text-[13px] leading-[1.4] text-suave">{d.texto}</span></span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
