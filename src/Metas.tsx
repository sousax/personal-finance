import { useState } from 'react'
import { centavos, parseValor, titulo, valorParaTexto } from './domain'
import type { Caixinha, ProgressoMeta } from './domain'
import { excluir, salvarMeta } from './data/api'
import { Campo, Erro, useAcao } from './ui'

type Formatar = (v: number, sinal?: string) => string
type Props = { nome: string; caixinha: Caixinha | null; progresso: ProgressoMeta | null; fmt: Formatar; recarregar: () => Promise<void> }

const hoje = () => new Date().toLocaleDateString('sv-SE')
const sinal = (v: number) => (v >= 0 ? '+ ' : '− ')

function FormMeta({ nome, progresso, recarregar, fechar }: { nome: string; progresso: ProgressoMeta | null; recarregar: () => Promise<void>; fechar: () => void }) {
  const [meta, setMeta] = useState(progresso ? valorParaTexto(progresso.meta.meta) : '')
  const [saldo, setSaldo] = useState(valorParaTexto(centavos(progresso?.saldoAtual ?? 0)))
  const { erro, ocupado, rodar } = useAcao(recarregar)
  return (
    <form className="mt-3 space-y-3" onSubmit={(e) => {
      e.preventDefault()
      void rodar(async () => {
        const m = parseValor(meta), s = parseValor(saldo)
        if (!m || m <= 0) throw new Error('Meta inválida. Use o formato 1.234,56.')
        if (s === null) throw new Error('Saldo inválido. Use o formato 1.234,56.')
        // Saldo igual ao exibido não é uma nova leitura do usuário: mantém a data base original
        const igual = progresso !== null && s === progresso.saldoAtual
        await salvarMeta({
          id: progresso?.meta.id, nome,
          meta: m, saldo: igual ? progresso.meta.saldo : s, saldoEm: igual ? progresso.meta.saldoEm : hoje(),
        })
        fechar()
      })
    }}>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Meta"><input className="campo" required inputMode="decimal" placeholder="5.000,00" value={meta} onChange={(e) => setMeta(e.target.value)} /></Campo>
        <Campo rotulo="Saldo atual"><input className="campo" required inputMode="decimal" placeholder="0,00" value={saldo} onChange={(e) => setSaldo(e.target.value)} /></Campo>
      </div>
      <Erro msg={erro} />
      <div className="flex gap-2">
        <button className="btn" disabled={ocupado}>{ocupado ? 'Salvando...' : 'Salvar'}</button>
        <button type="button" className="btn-sec" disabled={ocupado} onClick={fechar}>Cancelar</button>
      </div>
    </form>
  )
}

export function CartaoCaixinha({ nome, caixinha, progresso, fmt, recarregar }: Props) {
  const [editando, setEditando] = useState(false)
  const exclusao = useAcao(recarregar)
  const form = editando && <FormMeta nome={nome} progresso={progresso} recarregar={recarregar} fechar={() => setEditando(false)} />

  if (!progresso) {
    const c = caixinha!
    return (
      <div className="rounded-2xl border border-linha bg-leve p-[18px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] font-semibold">{nome}</span>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium tabular-nums ${c.liquido >= 0 ? 'bg-ok/10 text-ok-texto' : 'bg-perigo/10 text-perigo-texto'}`}>{fmt(c.liquido, sinal(c.liquido))}</span>
        </div>
        <div className="flex justify-between gap-3 text-[13px] text-suave"><span>Guardado {fmt(c.guardado)}</span><span>Retirado {fmt(c.retirado)}</span></div>
        {form || <button className="btn-sec mt-3" onClick={() => setEditando(true)}>Definir meta</button>}
      </div>
    )
  }

  const p = progresso
  return (
    <div className="rounded-2xl border border-linha bg-leve p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{nome}</div>
          <div className="mt-0.5 text-[13px] text-suave">{fmt(p.saldoAtual)} de {fmt(p.meta.meta)}</div>
        </div>
        <span className="font-titulo text-[22px] font-semibold tabular-nums">{p.pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevado">
        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div><div className="text-suave">Falta</div><div className="font-semibold tabular-nums">{fmt(p.falta)}</div></div>
        <div><div className="text-suave">Neste mês</div><div className={`font-semibold tabular-nums ${p.liquidoMes >= 0 ? 'text-ok-texto' : 'text-perigo-texto'}`}>{fmt(p.liquidoMes, sinal(p.liquidoMes))}</div></div>
      </div>
      <div className="mt-3 border-t border-linha pt-3 text-[13px] text-suave">{p.previsao}</div>
      {form || (
        <div className="mt-3 flex gap-2">
          <button className="btn-sec" onClick={() => setEditando(true)}>Editar</button>
          <button className="btn-perigo" disabled={exclusao.ocupado} onClick={() => { if (confirm(`Excluir a meta de ${nome}?`)) void exclusao.rodar(() => excluir('metas_caixinhas', p.meta.id)) }}>Excluir</button>
        </div>
      )}
      <Erro msg={exclusao.erro} />
    </div>
  )
}

export function MetasCaixinhas({ caixinhas, progresso, liquido, fmt, recarregar }: { caixinhas: Caixinha[]; progresso: ProgressoMeta[]; liquido: number; fmt: Formatar; recarregar: () => Promise<void> }) {
  const nomes = [...new Set([...caixinhas.map((c) => c.nome), ...progresso.map((p) => titulo(p.meta.nome))])]
  return (
    <section className="cartao rounded-[20px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Metas das caixinhas</h2>
        <span className="text-[13px] text-suave">Neste mês {fmt(liquido, liquido < 0 ? '− ' : '')}</span>
      </div>
      {nomes.length === 0 && <p className="mt-3 text-sm text-suave">Nenhuma caixinha neste mês.</p>}
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-3">
        {nomes.map((nome) => (
          <CartaoCaixinha key={nome} nome={nome} caixinha={caixinhas.find((c) => c.nome === nome) ?? null}
            progresso={progresso.find((p) => titulo(p.meta.nome) === nome) ?? null} fmt={fmt} recarregar={recarregar} />
        ))}
      </div>
    </section>
  )
}
