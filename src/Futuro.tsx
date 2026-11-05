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
      <div>
        <div className="text-sm text-suave">Próximos 12 meses</div>
        <h1 className="text-[26px] font-semibold">Futuro</h1>
      </div>
      <section className="rounded-2xl bg-brilho p-6 text-white">
        <div className="text-sm text-white/70">Parcelas comprometidas nos próximos 12 meses</div>
        <Dinheiro v={centavos(total)} className="mt-1 block text-right font-titulo text-3xl font-semibold tracking-[-0.03em]" />
        <p className="mt-1 text-xs text-white/60">A partir de {mesParaTexto(mes)}.</p>
      </section>
      <ul className="cartao lista">
        {meses.map((m) => (
          <li key={`${m.mes.ano}-${m.mes.mes}`} className="py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="first-letter:uppercase">{mesParaTexto(m.mes)}</span>
              <Dinheiro v={m.valor} className={m.valor === 0 ? 'text-suave/60' : 'font-medium'} />
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevado">
              <div className="h-full rounded-full bg-grad" style={{ width: `${(m.valor / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
