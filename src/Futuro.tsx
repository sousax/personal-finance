import { useState } from 'react'
import { centavos, formatarBRL, parcelasNaJanela, somarMeses } from './domain'
import type { MesRef } from './domain'
import type { Dados } from './data/api'
import { CORES } from './Cadastros'

const brl = (v: number) => formatarBRL(centavos(Math.round(v)))
const curto = (v: number) => (v >= 100000 ? `R$ ${(v / 100000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mil` : `R$ ${Math.round(v / 100)}`)
const abr = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')
const rotulo = (m: MesRef) => `${abr(m)}/${String(m.ano).slice(2)}`
const extenso = (m: MesRef) => {
  const t = new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return t[0]!.toUpperCase() + t.slice(1)
}
const card = 'rounded-3xl bg-superficie px-6 py-[22px]'
const h2 = 'font-titulo text-[17px] font-semibold !tracking-[-0.02em]'

export function Futuro({ dados, mes }: { dados: Dados; mes: MesRef }) {
  const [n, setN] = useState(12)
  const [sel, setSel] = useState(1)
  const s = Math.min(sel, n - 1)
  const mesDe = (k: number) => somarMeses(mes, k)

  const compras = parcelasNaJanela(dados.lancamentos, dados.cartoes, mes, n).map((c, i) => ({
    ...c,
    cor: dados.categorias.find((x) => x.id === c.lancamento.categoriaId)?.cor ?? CORES[(i * 5) % CORES.length]![1],
    pagamento: (() => { const k = dados.cartoes.find((x) => x.id === c.lancamento.cartaoId); return k ? `${k.nome}${k.final ? ` •${k.final}` : ''}` : 'Pix / débito' })(),
    valor: c.valorNoMes.find((v) => v > 0) ?? 0,
  }))
  const porMes = Array.from({ length: n }, (_, k) => compras.reduce((t, c) => t + c.valorNoMes[k]!, 0))
  const total = porMes.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...porMes)
  const media = total / n
  const pico = porMes.indexOf(Math.max(...porMes))
  const fimJanela = rotulo(mesDe(n - 1))
  // Quanto da parcela de hoje some até o fim da janela: o que não passa dela
  const libera = porMes[0]! - compras.filter((c) => c.fim > n - 1).reduce((t, c) => t + c.valorNoMes[0]!, 0)

  const doMes = compras.filter((c) => c.parcelaNoMes[s] !== null).sort((a, b) => b.valorNoMes[s]! - a.valorNoMes[s]!)
  const delta = s > 0 ? porMes[s]! - porMes[s - 1]! : 0
  const alivios = Array.from({ length: n }, (_, k) => k + 1).flatMap((k) => {
    const acabam = compras.filter((c) => c.fim === k - 1)
    if (!acabam.length) return []
    return [{ k, mes: k < n ? `A partir de ${rotulo(mesDe(k))}` : `Depois de ${rotulo(mesDe(k - 1))}`, valor: acabam.reduce((t, c) => t + c.valorNoMes[k - 1]!, 0), texto: acabam.map((c) => `${c.lancamento.descricao} termina em ${rotulo(mesDe(k - 1))}`).join(' · ') }]
  })
  const colunas = { gridTemplateColumns: `minmax(170px,1.4fr) repeat(${n}, minmax(0,1fr)) 72px` }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-suave">Parcelas já assumidas, mês a mês</span>
          <h1 className="font-titulo text-[30px] font-semibold !tracking-[-0.035em]">Futuro</h1>
        </div>
        <div className="flex gap-1 rounded-full border border-linha bg-superficie p-1">
          {[6, 12].map((v) => (
            <button key={v} aria-pressed={n === v} onClick={() => setN(v)} className={`h-9 rounded-full px-4 text-[13px] font-semibold ${n === v ? 'bg-tinta text-superficie' : 'text-suave'}`}>{v} meses</button>
          ))}
        </div>
      </div>

      <section className="relative flex flex-wrap items-end justify-between gap-7 overflow-hidden rounded-3xl px-7 py-[26px] text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%,#4B37C8 0%,#3A1530 46%,#191C1F 80%)' }}>
        <svg width="220" height="220" viewBox="0 0 56 56" aria-hidden="true" className="absolute -right-[30px] -top-10 opacity-10"><rect x="6" y="34" width="12" height="16" rx="6" fill="#fff" /><rect x="22" y="22" width="12" height="28" rx="6" fill="#fff" /><rect x="38" y="8" width="12" height="42" rx="6" fill="#fff" /></svg>
        <div className="relative flex flex-col gap-2">
          <span className="text-sm text-white/[.72]">Comprometido em parcelas nos próximos {n} meses</span>
          <span className="font-titulo text-[clamp(40px,5vw,56px)] font-semibold leading-none tabular-nums tracking-[-0.045em]">{brl(total)}</span>
          <span className="text-sm text-white/[.72]">{compras.length} {compras.length === 1 ? 'compra parcelada' : 'compras parceladas'} · de {rotulo(mes)} a {fimJanela}</span>
        </div>
        {total > 0 && (
          <div className="relative flex flex-wrap gap-2.5">
            <div className="flex min-w-[150px] flex-col gap-0.5 rounded-2xl border border-white/[.12] bg-white/[.08] px-3.5 py-3"><span className="text-xs text-white/65">Média por mês</span><span className="text-lg font-bold tabular-nums">{brl(media)}</span></div>
            <div className="flex min-w-[150px] flex-col gap-0.5 rounded-2xl border border-white/[.12] bg-white/[.08] px-3.5 py-3"><span className="text-xs text-white/65">Mês mais pesado</span><span className="text-lg font-bold tabular-nums">{brl(porMes[pico]!)}</span><span className="text-[11px] text-white/60">{extenso(mesDe(pico))}</span></div>
            <div className="flex min-w-[150px] flex-col gap-0.5 rounded-2xl border border-white/[.18] px-3.5 py-3" style={{ background: 'linear-gradient(160deg,rgba(142,36,64,.6),rgba(106,75,255,.6))' }}><span className="text-xs text-white/80">Libera até {fimJanela}</span><span className="text-lg font-bold tabular-nums">{brl(libera)}/mês</span></div>
          </div>
        )}
      </section>

      {compras.length === 0 ? (
        <p className={`${card} text-sm text-suave`}>Nenhuma compra parcelada nos próximos {n} meses.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-[18px]">
            <section className={`${card} flex min-w-0 flex-[1.6_1_520px] flex-col gap-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2.5"><h2 className={h2}>Parcelas por mês</h2><span className="text-xs text-suave">Clique num mês para ver o que compõe</span></div>
              <div className="relative h-60 pt-7">
                <div className="pointer-events-none absolute inset-x-0 z-[1] border-t-[1.5px] border-dashed border-suave/40" style={{ bottom: `calc(${(media / max) * 100}% * (212 / 240))` }}>
                  <span className="absolute -top-[22px] right-0 rounded-md bg-superficie px-1.5 py-0.5 text-[11px] font-semibold text-suave">média {curto(media)}</span>
                </div>
                <div className="flex h-full items-end gap-[clamp(4px,1vw,10px)]">
                  {porMes.map((v, k) => (
                    <button key={k} onClick={() => setSel(k)} title={`${extenso(mesDe(k))}: ${brl(v)}`} aria-pressed={k === s} aria-label={`${extenso(mesDe(k))}: ${brl(v)}`}
                      className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      {k === s && <span className="absolute -top-[26px] z-[2] whitespace-nowrap rounded-full bg-tinta px-2 py-[3px] text-[11px] font-bold text-superficie">{brl(v)}</span>}
                      <span className="w-full rounded-[8px_8px_4px_4px] transition-opacity" style={{ height: `${(v / max) * 100}%`, background: 'linear-gradient(180deg,#6A4BFF,#8E2440)', opacity: k === s ? 1 : 0.38, boxShadow: k === s ? '0 0 0 3px rgb(var(--superficie)), 0 0 0 5px rgb(var(--tinta))' : 'none' }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-[clamp(4px,1vw,10px)]">
                {porMes.map((_, k) => { const m = mesDe(k); return (
                  <span key={k} className={`flex min-w-0 flex-1 flex-col text-center text-xs leading-tight ${k === s ? 'font-bold text-tinta' : 'text-suave'}`}><span>{abr(m)}</span><span className="text-[10px] text-suave">{m.mes === 1 || k === 0 ? m.ano : ''}</span></span>
                ) })}
              </div>
            </section>

            <section className={`${card} flex flex-[1_1_320px] flex-col gap-1.5`}>
              <div className="mb-2 flex flex-col gap-0.5">
                <span className="text-[13px] text-suave">{extenso(mesDe(s))}</span>
                <span className="font-titulo text-[28px] font-semibold tabular-nums !tracking-[-0.035em]">{brl(porMes[s]!)}</span>
                <span className={`text-xs font-semibold ${s === 0 || delta === 0 ? 'text-suave' : delta > 0 ? 'text-perigo-texto' : 'text-ok-texto'}`}>
                  {s === 0 ? 'Mês atual' : delta === 0 ? `Igual a ${rotulo(mesDe(s - 1))}` : `${delta > 0 ? '↑ +' : '↓ −'}${brl(Math.abs(delta))} vs ${rotulo(mesDe(s - 1))}`}
                </span>
              </div>
              {doMes.length === 0 && <p className="border-t border-linha pt-3 text-sm text-suave">Nenhuma parcela neste mês.</p>}
              {doMes.map((c) => {
                const p = c.parcelaNoMes[s]!
                return (
                  <div key={c.lancamento.id} className="flex items-center gap-3 border-t border-linha py-2.5">
                    <span className="w-1.5 self-stretch rounded-[3px]" style={{ background: c.cor }} />
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{c.lancamento.descricao}</span>
                        {p === c.total && <span className="rounded-full bg-ok/10 px-[7px] py-0.5 text-[10px] font-bold text-ok-texto">ÚLTIMA</span>}
                        {s > 0 && c.inicio === s && p === 1 && <span className="rounded-full bg-violeta/10 px-[7px] py-0.5 text-[10px] font-bold text-violeta-forte">NOVA</span>}
                      </span>
                      <span className="text-xs text-suave">{p}/{c.total} · {c.pagamento}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{brl(c.valorNoMes[s]!)}</span>
                  </div>
                )
              })}
            </section>
          </div>

          {alivios.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className={h2}>Alívios no caminho</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
                {alivios.map((a) => (
                  <div key={a.k} className="flex flex-col gap-1.5 rounded-[20px] bg-superficie px-[18px] py-4">
                    <span className="text-xs font-bold uppercase tracking-[.04em] text-violeta-forte">{a.mes}</span>
                    <span className="font-titulo text-[22px] font-semibold tabular-nums text-ok-texto">− {brl(a.valor)}/mês</span>
                    <span className="text-[13px] leading-snug text-suave">{a.texto}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={`${card} flex flex-col gap-3 overflow-x-auto`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2.5"><h2 className={h2}>Quando cada compra termina</h2><span className="text-xs text-suave">Ordenado pelo fim</span></div>
            <div className="flex min-w-[720px] flex-col">
              <div className="grid items-end gap-x-1 border-b border-linha px-2 pb-2 text-[11px] text-suave" style={colunas}>
                <span>Compra</span>
                {porMes.map((_, k) => <span key={k} className={`text-center ${k === s ? 'font-bold text-tinta' : ''}`}>{abr(mesDe(k))}</span>)}
                <span className="text-right">Termina</span>
              </div>
              {compras.map((c) => {
                const passa = c.fim > n - 1
                const fim = mesDe(c.fim)
                return (
                  <div key={c.lancamento.id} className="grid items-center gap-x-1 rounded-xl px-2 py-2.5 hover:bg-leve" style={colunas}>
                    <span className="col-start-1 row-start-1 flex min-w-0 flex-col gap-0.5"><span className="truncate text-sm font-semibold">{c.lancamento.descricao}</span><span className="text-xs text-suave">{c.pagamento} · {brl(c.restante)} restantes</span></span>
                    <span className="row-start-1 flex h-[26px] items-center overflow-hidden whitespace-nowrap px-2.5 text-[11px] font-bold text-white"
                      style={{ gridColumn: `${c.inicio + 2} / ${Math.min(c.fim, n - 1) + 3}`, borderRadius: passa ? '8px 2px 2px 8px' : 8, background: passa ? `linear-gradient(90deg, ${c.cor}, color-mix(in oklab, ${c.cor} 40%, #fff))` : c.cor }}>{brl(c.valor)}</span>
                    <span className={`row-start-1 text-right text-xs font-semibold ${passa ? 'text-suave' : 'text-ok-texto'}`} style={{ gridColumn: n + 2 }}>{rotulo(fim)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
