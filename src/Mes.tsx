import { resumirMes, somarMeses, mesParaTexto } from './domain'
import type { MesRef, Ocorrencia } from './domain'
import type { Dados } from './data/api'
import { Dinheiro } from './ui'

function Linhas({ itens }: { itens: Ocorrencia[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {itens.map((o, i) => (
        <li key={i} className="flex justify-between gap-2 py-1.5 text-sm">
          <span className="min-w-0 truncate">{o.descricao}</span>
          <Dinheiro v={o.valor} className={o.natureza === 'receita' ? 'text-green-700' : ''} />
        </li>
      ))}
    </ul>
  )
}

export function Mes({ dados, mes, setMes }: { dados: Dados; mes: MesRef; setMes: (m: MesRef) => void }) {
  const r = resumirMes(dados.lancamentos, dados.cartoes, mes)
  const nomeCat = (id: string | null) => dados.categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'
  const receitas = r.ocorrencias.filter((o) => o.natureza === 'receita')
  const despesas = r.ocorrencias.filter((o) => o.natureza === 'despesa')
  const semCartao = despesas.filter((o) => !o.cartaoId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-sec" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>&larr;</button>
        <h2 className="text-lg font-semibold capitalize">{mesParaTexto(mes)}</h2>
        <button className="btn-sec" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>&rarr;</button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="cartao p-3"><div className="text-xs text-slate-500">Receitas</div><Dinheiro v={r.receitas} className="text-sm font-semibold text-green-700" /></div>
        <div className="cartao p-3"><div className="text-xs text-slate-500">Despesas</div><Dinheiro v={r.despesas} className="text-sm font-semibold text-red-700" /></div>
        <div className="cartao p-3"><div className="text-xs text-slate-500">Saldo</div><Dinheiro v={r.saldo} className={`text-sm font-semibold ${r.saldo < 0 ? 'text-red-700' : ''}`} /></div>
      </div>

      {r.ocorrencias.length === 0 && <p className="text-center text-sm text-slate-500">Nada neste mês.</p>}

      {receitas.length > 0 && <section className="cartao"><h3 className="mb-1 font-medium">Receitas</h3><Linhas itens={receitas} /></section>}

      {[...r.porCartao].map(([id, total]) => {
        const c = dados.cartoes.find((x) => x.id === id)
        return (
          <section key={id} className="cartao">
            <h3 className="mb-1 flex justify-between font-medium">
              <span>Fatura {c?.nome} <span className="text-xs font-normal text-slate-500">vence dia {c?.diaVencimento}</span></span>
              <Dinheiro v={total} />
            </h3>
            <Linhas itens={despesas.filter((o) => o.cartaoId === id)} />
          </section>
        )
      })}

      {semCartao.length > 0 && <section className="cartao"><h3 className="mb-1 font-medium">Despesas sem cartão</h3><Linhas itens={semCartao} /></section>}

      {r.porCategoria.size > 0 && (
        <section className="cartao">
          <h3 className="mb-1 font-medium">Despesas por categoria</h3>
          <ul className="divide-y divide-slate-100">
            {[...r.porCategoria].sort((a, b) => b[1] - a[1]).map(([id, v]) => (
              <li key={id ?? 'none'} className="flex justify-between py-1.5 text-sm"><span>{nomeCat(id)}</span><Dinheiro v={v} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
