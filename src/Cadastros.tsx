import { useState } from 'react'
import { excluir, salvarCartao, salvarCategoria } from './data/api'
import type { Dados } from './data/api'
import { Campo, Erro, useAcao } from './ui'
import { centavos, formatarBRL, mesDoPagamento, ocorrenciasDoMes, somarMeses } from './domain'
import type { Cartao, MesRef, Ocorrencia } from './domain'

type Props = { dados: Dados; recarregar: () => Promise<void> }

const TEMAS = [
  { fundo: 'radial-gradient(130% 160% at 100% 0%,#6A4BFF 0%,#191C1F 72%)', barra: '#6A4BFF' },
  { fundo: 'radial-gradient(130% 160% at 100% 0%,#8E2440 0%,#191C1F 72%)', barra: '#8E2440' },
]
const PARCELA = /\s*\((\d+\/\d+)\)$/

const mesCurto = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')

function Fatura({ cartao, itens, tema, cor, mes, aberta }: { cartao: Cartao; itens: Ocorrencia[]; tema: (typeof TEMAS)[number]; cor: (id: string | null) => string; mes: MesRef; aberta: boolean }) {
  const total = itens.reduce((s, o) => s + o.valor, 0)
  const { limite, disponivel } = cartao
  const uso = limite && disponivel != null ? Math.min(100, Math.max(0, Math.round(((limite - disponivel) / limite) * 100))) : null
  return (
    <section className="flex flex-col gap-4 rounded-[22px] border border-linha bg-superficie p-3 pb-5">
      <div className="flex flex-col gap-6 rounded-2xl p-[22px] text-white" style={{ background: tema.fundo }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate font-titulo text-lg font-semibold">{cartao.nome}</h2>
          {cartao.final && <span className="whitespace-nowrap text-[13px] tracking-[.12em] text-white/80">•••• {cartao.final}</span>}
        </div>
        <div className="flex flex-col gap-1"><span className="text-xs text-white/60">{aberta ? 'Fatura atual' : `Fatura de ${mesCurto(mes)}/${mes.ano}`}</span><span className="font-titulo text-[30px] font-semibold leading-none tabular-nums">{formatarBRL(centavos(total))}</span></div>
      </div>
      <div className="flex flex-col gap-3 px-2.5">
        <div className="flex justify-between text-[13px] text-suave"><span>Fecha dia {cartao.diaFechamento}</span><span>Vence {String(cartao.diaVencimento).padStart(2, '0')} {mesCurto(mes)}</span></div>
        {uso !== null && (
          <div className="flex flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-elevado"><div className="h-full rounded-full" style={{ width: `${uso}%`, background: tema.barra }} /></div>
            <div className="flex justify-between text-xs text-suave"><span>{uso}% do limite</span><span className="tabular-nums">{formatarBRL(disponivel!)} disponível</span></div>
          </div>
        )}
        <ul className="flex flex-col">
          {itens.length === 0 && <li className="border-t border-linha pt-3 text-sm text-suave">Nenhuma compra nesta fatura.</li>}
          {itens.map((o, i) => {
            const parcela = PARCELA.exec(o.descricao)?.[1]
            return (
              <li key={`${o.lancamentoId}-${i}`} className="flex items-center gap-2.5 border-t border-linha py-2.5 text-sm">
                <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: cor(o.categoriaId) }} />
                <span className="min-w-0 flex-1 truncate">{o.descricao.replace(PARCELA, '')}{parcela && <span className="ml-2 text-suave">{parcela}</span>}</span>
                <span className="whitespace-nowrap tabular-nums">{formatarBRL(o.valor)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

// Fatura em aberto = a que recebe uma compra feita hoje; as setas andam uma fatura por vez a partir dela
export function Cartoes({ dados, recarregar }: Props) {
  const [desvio, setDesvio] = useState(0)
  const hoje = new Date().toLocaleDateString('sv-SE')
  const faturaDe = (c: Cartao) => {
    const mes = somarMeses(mesDoPagamento(hoje, c, 0), desvio)
    const itens = ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes).filter((o) => o.natureza === 'despesa' && o.cartaoId === c.id).sort((a, b) => b.valor - a.valor)
    return { mes, itens }
  }
  const cor = (id: string | null) => dados.categorias.find((c) => c.id === id)?.cor ?? '#A1A1AA'

  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [fecha, setFecha] = useState('')
  const [vence, setVence] = useState('')
  const { erro, ocupado, rodar } = useAcao(recarregar)
  const limpar = () => { setId(undefined); setNome(''); setFecha(''); setVence('') }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-suave">{desvio === 0 ? 'Faturas em aberto' : desvio < 0 ? `${-desvio} ${desvio === -1 ? 'fatura' : 'faturas'} antes da atual` : `${desvio} ${desvio === 1 ? 'fatura' : 'faturas'} depois da atual`}</div>
          <h1 className="font-titulo text-[28px] font-semibold">Cartões</h1>
        </div>
        <div className="flex h-10 items-center rounded-full border border-linha bg-superficie text-[13px]">
          <button className="h-full rounded-l-full px-3.5 hover:bg-elevado" aria-label="Fatura anterior" onClick={() => setDesvio(desvio - 1)}>&lsaquo;</button>
          {desvio !== 0 && <button className="h-full px-2 font-medium hover:bg-elevado" onClick={() => setDesvio(0)}>Atual</button>}
          <button className="h-full rounded-r-full px-3.5 hover:bg-elevado" aria-label="Próxima fatura" onClick={() => setDesvio(desvio + 1)}>&rsaquo;</button>
        </div>
      </div>
      {dados.cartoes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] items-start gap-4">
          {dados.cartoes.map((c, i) => <Fatura key={c.id} cartao={c} tema={TEMAS[i % TEMAS.length]!} cor={cor} aberta={desvio === 0} {...faturaDe(c)} />)}
        </div>
      )}
      <details className="cartao" open={dados.cartoes.length === 0 || id !== undefined}>
        <summary className="cursor-pointer text-sm font-semibold">Gerenciar cartões</summary>
      <form className="mt-4 space-y-3" onSubmit={(e) => {
        e.preventDefault()
        void rodar(async () => {
          const f = Number(fecha), v = Number(vence)
          if (![f, v].every((n) => Number.isInteger(n) && n >= 1 && n <= 31)) throw new Error('Dias devem ir de 1 a 31.')
          await salvarCartao({ id, nome: nome.trim(), diaFechamento: f, diaVencimento: v })
          limpar()
        })
      }}>
        <Campo rotulo="Nome"><input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia de fechamento"><input className="campo" required inputMode="numeric" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo rotulo="Dia de vencimento"><input className="campo" required inputMode="numeric" value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        </div>
        <Erro msg={erro} />
        <div className="flex gap-2"><button className="btn" disabled={ocupado}>{ocupado ? 'Salvando...' : id ? 'Salvar' : 'Adicionar cartão'}</button>{id && <button type="button" className="btn-sec" disabled={ocupado} onClick={limpar}>Cancelar</button>}</div>
      </form>
      <ul className="lista mt-4">
        {dados.cartoes.length === 0 && <li className="py-2 text-sm text-suave">Nenhum cartão.</li>}
        {dados.cartoes.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span>{c.nome} <span className="text-suave">fecha {c.diaFechamento}, vence {c.diaVencimento}</span></span>
            <span className="flex gap-2">
              <button className="btn-sec" disabled={ocupado} onClick={() => { setId(c.id); setNome(c.nome); setFecha(String(c.diaFechamento)); setVence(String(c.diaVencimento)) }}>Editar</button>
              <button className="btn-perigo" disabled={ocupado} onClick={() => { if (confirm(`Excluir ${c.nome}?`)) void rodar(() => excluir('cartoes', c.id)) }}>Excluir</button>
            </span>
          </li>
        ))}
      </ul>
      </details>
    </div>
  )
}

export function Categorias({ dados, recarregar }: Props) {
  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#64748b')
  const { erro, ocupado, rodar } = useAcao(recarregar)
  const limpar = () => { setId(undefined); setNome(''); setCor('#64748b') }

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-semibold">Categorias</h1>
      <form className="cartao space-y-3" onSubmit={(e) => {
        e.preventDefault()
        void rodar(async () => { await salvarCategoria({ id, nome: nome.trim(), cor }); limpar() })
      }}>
        <div className="flex gap-3">
          <div className="flex-1"><Campo rotulo="Nome"><input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></Campo></div>
          <Campo rotulo="Cor"><input type="color" className="h-[42px] w-14 rounded-xl border border-linha" value={cor} onChange={(e) => setCor(e.target.value)} /></Campo>
        </div>
        <Erro msg={erro} />
        <div className="flex gap-2"><button className="btn" disabled={ocupado}>{ocupado ? 'Salvando...' : id ? 'Salvar' : 'Adicionar categoria'}</button>{id && <button type="button" className="btn-sec" disabled={ocupado} onClick={limpar}>Cancelar</button>}</div>
      </form>
      <ul className="cartao lista">
        {dados.categorias.length === 0 && <li className="py-2 text-sm text-suave">Nenhuma categoria.</li>}
        {dados.categorias.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{ background: c.cor }} />{c.nome}</span>
            <span className="flex gap-2">
              <button className="btn-sec" disabled={ocupado} onClick={() => { setId(c.id); setNome(c.nome); setCor(c.cor) }}>Editar</button>
              <button className="btn-perigo" disabled={ocupado} onClick={() => { if (confirm(`Excluir ${c.nome}?`)) void rodar(() => excluir('categorias', c.id)) }}>Excluir</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
