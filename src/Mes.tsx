import { resumirMes, somarMeses, mesParaTexto } from './domain'
import type { MesRef, Ocorrencia } from './domain'
import type { Dados } from './data/api'
import { Dinheiro, Icone } from './ui'

function Linhas({ itens }: { itens: Ocorrencia[] }) {
  return (
    <ul className="lista">
      {itens.map((o, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 truncate">{o.descricao}</span>
          <Dinheiro v={o.valor} className={o.natureza === 'receita' ? 'text-emerald-400' : 'text-slate-200'} />
        </li>
      ))}
    </ul>
  )
}

const Titulo = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1 text-sm font-medium text-slate-400">{children}</h3>

export function Mes({ dados, mes, setMes }: { dados: Dados; mes: MesRef; setMes: (m: MesRef) => void }) {
  const r = resumirMes(dados.lancamentos, dados.cartoes, mes)
  const nomeCat = (id: string | null) => dados.categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'
  const receitas = r.ocorrencias.filter((o) => o.natureza === 'receita')
  const despesas = r.ocorrencias.filter((o) => o.natureza === 'despesa')
  const semCartao = despesas.filter((o) => !o.cartaoId)
  const negativo = r.saldo < 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-sec" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>&larr;</button>
        <h2 className="text-lg font-semibold first-letter:uppercase">{mesParaTexto(mes)}</h2>
        <button className="btn-sec" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>&rarr;</button>
      </div>

      <section className={`rounded-3xl border p-5 ${negativo ? 'border-rose-500/25 bg-gradient-to-br from-rose-500/20 via-superficie to-superficie' : 'border-emerald-400/25 bg-gradient-to-br from-emerald-400/20 via-superficie to-superficie'}`}>
        <div className="text-sm text-slate-400">Saldo do mês</div>
        <Dinheiro v={r.saldo} className={`mt-1 block text-right text-4xl font-bold tracking-tight ${negativo ? 'text-rose-300' : 'text-emerald-300'}`} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Icone nome="cima" className="h-4 w-4 text-emerald-400" />Receitas</div>
            <Dinheiro v={r.receitas} className="mt-1 block text-right text-lg font-semibold text-emerald-400" />
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Icone nome="baixo" className="h-4 w-4 text-rose-400" />Despesas</div>
            <Dinheiro v={r.despesas} className="mt-1 block text-right text-lg font-semibold text-rose-400" />
          </div>
        </div>
      </section>

      {r.ocorrencias.length === 0 && <p className="text-center text-sm text-slate-400">Nada neste mês.</p>}

      {receitas.length > 0 && <section className="cartao"><Titulo>Receitas</Titulo><Linhas itens={receitas} /></section>}

      {[...r.porCartao].map(([id, total]) => {
        const c = dados.cartoes.find((x) => x.id === id)
        return (
          <section key={id} className="cartao">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">Fatura {c?.nome}</div>
                <div className="text-xs text-slate-500">vence dia {c?.diaVencimento}</div>
              </div>
              <Dinheiro v={total} className="text-lg font-semibold" />
            </div>
            <Linhas itens={despesas.filter((o) => o.cartaoId === id)} />
          </section>
        )
      })}

      {semCartao.length > 0 && <section className="cartao"><Titulo>Despesas sem cartão</Titulo><Linhas itens={semCartao} /></section>}

      {r.porCategoria.size > 0 && (
        <section className="cartao">
          <Titulo>Despesas por categoria</Titulo>
          <ul className="lista">
            {[...r.porCategoria].sort((a, b) => b[1] - a[1]).map(([id, v]) => (
              <li key={id ?? 'none'} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{nomeCat(id)}</span><Dinheiro v={v} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
