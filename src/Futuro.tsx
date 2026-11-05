import { centavos, comprometidoFuturo, mesParaTexto } from './domain'
import type { MesRef } from './domain'
import type { Dados } from './data/api'
import { Dinheiro } from './ui'

export function Futuro({ dados, mes }: { dados: Dados; mes: MesRef }) {
  const meses = comprometidoFuturo(dados.lancamentos, dados.cartoes, mes, 12)
  const total = meses.reduce((s, m) => s + m.valor, 0)
  const max = Math.max(1, ...meses.map((m) => m.valor))
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Parcelas comprometidas</h2>
      <section className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/15 to-superficie p-5">
        <div className="text-sm text-slate-400">Total nos próximos 12 meses</div>
        <Dinheiro v={centavos(total)} className="mt-1 block text-right text-3xl font-bold text-rose-300" />
        <p className="mt-1 text-xs text-slate-500">A partir de {mesParaTexto(mes)}.</p>
      </section>
      <ul className="cartao lista">
        {meses.map((m) => (
          <li key={`${m.mes.ano}-${m.mes.mes}`} className="py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="first-letter:uppercase">{mesParaTexto(m.mes)}</span>
              <Dinheiro v={m.valor} className={m.valor === 0 ? 'text-slate-600' : 'font-medium'} />
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-elevado">
              <div className="h-full rounded-full bg-rose-400/70" style={{ width: `${(m.valor / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
