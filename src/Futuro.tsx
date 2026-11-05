import { comprometidoFuturo, mesParaTexto } from './domain'
import type { MesRef } from './domain'
import type { Dados } from './data/api'
import { Dinheiro } from './ui'

export function Futuro({ dados, mes }: { dados: Dados; mes: MesRef }) {
  const meses = comprometidoFuturo(dados.lancamentos, dados.cartoes, mes, 12)
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Parcelas comprometidas</h2>
      <p className="text-sm text-slate-500">Próximos 12 meses a partir de {mesParaTexto(mes)}.</p>
      <ul className="cartao divide-y divide-slate-100">
        {meses.map((m) => (
          <li key={`${m.mes.ano}-${m.mes.mes}`} className="flex justify-between py-2 text-sm">
            <span className="first-letter:uppercase">{mesParaTexto(m.mes)}</span>
            <Dinheiro v={m.valor} className={m.valor === 0 ? 'text-slate-400' : 'font-medium'} />
          </li>
        ))}
      </ul>
    </div>
  )
}
