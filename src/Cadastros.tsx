import { useRef, useState } from 'react'
import { excluir, salvarCartao, salvarCategoria } from './data/api'
import type { Dados } from './data/api'
import { Campo, Erro, useAcao } from './ui'
import { centavos, formatarBRL, mesDoPagamento, mesParaTexto, ocorrenciasDoMes, somarMeses } from './domain'
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

const PALETA = ['#8E2440', '#C2364A', '#A63D8F', '#7A3FA8', '#6A4BFF', '#3F51C7', '#3A3F44', '#A0865E']
const misturar = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`
const contagem = (n: number) => `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}`

type Uso = { despesa: number; receita: number; n: number }

function CartaoCategoria({ c, uso, max, receita, abrir }: { c: { nome: string; cor: string }; uso: Uso; max: number; receita: boolean; abrir: () => void }) {
  const valor = receita ? uso.receita : uso.despesa
  return (
    <button onClick={abrir} className="flex flex-col gap-3 rounded-2xl border border-linha bg-superficie px-[18px] py-4 text-left transition hover:border-suave/40">
      <span className="flex w-full items-center gap-2.5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold" style={{ background: misturar(c.cor, 14), color: c.cor }}>{c.nome.trim()[0]?.toUpperCase()}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-sm font-semibold">{c.nome}</span><span className="text-xs text-suave">{contagem(uso.n)}</span></span>
        <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${receita ? 'text-ok-texto' : ''}`}>{formatarBRL(centavos(valor))}</span>
      </span>
      {!receita && <span className="block h-1.5 w-full overflow-hidden rounded-[3px] bg-elevado"><span className="block h-full" style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%`, background: c.cor }} /></span>}
    </button>
  )
}

export function Categorias({ dados, recarregar }: Props) {
  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(PALETA[5]!)
  const dialogo = useRef<HTMLDialogElement>(null)
  const { erro, ocupado, rodar } = useAcao(recarregar)

  const agora = new Date()
  const mes: MesRef = { ano: agora.getFullYear(), mes: agora.getMonth() + 1 }
  const uso = new Map<string, Uso>()
  for (const o of ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes)) {
    if (!o.categoriaId) continue
    const u = uso.get(o.categoriaId) ?? { despesa: 0, receita: 0, n: 0 }
    u[o.natureza] += o.valor
    u.n++
    uso.set(o.categoriaId, u)
  }
  const vazio: Uso = { despesa: 0, receita: 0, n: 0 }
  const usoDe = (cid: string) => uso.get(cid) ?? vazio
  // Categoria não tem tipo: só receita no mês vai para Receitas, o resto (inclusive sem uso) para Despesas
  const ehReceita = (cid: string) => usoDe(cid).receita > 0 && usoDe(cid).despesa === 0
  const ordenar = (k: 'despesa' | 'receita') => (a: { id: string }, b: { id: string }) => usoDe(b.id)[k] - usoDe(a.id)[k]
  const despesas = dados.categorias.filter((c) => !ehReceita(c.id)).sort(ordenar('despesa'))
  const receitas = dados.categorias.filter((c) => ehReceita(c.id)).sort(ordenar('receita'))
  const max = Math.max(0, ...despesas.map((c) => usoDe(c.id).despesa))

  function abrir(c?: { id: string; nome: string; cor: string }) {
    setId(c?.id); setNome(c?.nome ?? ''); setCor(c?.cor ?? PALETA[5]!)
    dialogo.current?.showModal()
  }
  const fechar = () => dialogo.current?.close()
  const mesTexto = `${mesParaTexto(mes).split(' ')[0]!.slice(0, 3)} ${mes.ano}`

  const secao = (titulo: string, lista: typeof dados.categorias, receita: boolean) => lista.length > 0 && (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-suave">{titulo}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
        {lista.map((c) => <CartaoCategoria key={c.id} c={c} uso={usoDe(c.id)} max={max} receita={receita} abrir={() => abrir(c)} />)}
      </div>
    </section>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-[13px] text-suave">Valores de {mesTexto}</div>
          <h1 className="font-titulo text-[26px] font-semibold">Categorias</h1>
        </div>
        <button className="btn-sec" onClick={() => abrir()}>+ Nova categoria</button>
      </div>

      {dados.categorias.length === 0 && <p className="cartao text-sm text-suave">Nenhuma categoria. Crie a primeira para organizar seus gastos.</p>}
      {secao('Despesas', despesas, false)}
      {secao('Receitas', receitas, true)}

      <dialog ref={dialogo} className="w-[min(440px,calc(100%-32px))] rounded-[20px] border border-linha bg-superficie p-6 text-tinta backdrop:bg-black/50">
        <form className="flex flex-col gap-4" onSubmit={(e) => {
          e.preventDefault()
          void rodar(async () => { await salvarCategoria({ id, nome: nome.trim(), cor }); fechar() })
        }}>
          <h2 className="font-titulo text-lg font-semibold">{id ? 'Editar categoria' : 'Nova categoria'}</h2>
          <Campo rotulo="Nome"><input className="campo" required placeholder="Ex: Educação" value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-suave">Cor</legend>
            <div className="flex flex-wrap items-center gap-2">
              {PALETA.map((p) => (
                <button key={p} type="button" aria-label={`Cor ${p}`} aria-pressed={cor.toLowerCase() === p.toLowerCase()} onClick={() => setCor(p)}
                  className="h-7 w-7 rounded-full" style={{ background: p, boxShadow: cor.toLowerCase() === p.toLowerCase() ? '0 0 0 2px rgb(var(--superficie)), 0 0 0 4px rgb(var(--tinta))' : 'none' }} />
              ))}
              <input type="color" aria-label="Outra cor" value={cor} onChange={(e) => setCor(e.target.value)} className="h-7 w-9 cursor-pointer rounded-md border border-linha bg-transparent" />
            </div>
          </fieldset>
          <Erro msg={erro} />
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {id && <button type="button" className="btn-perigo mr-auto" disabled={ocupado} onClick={() => { if (confirm(`Excluir ${nome}?`)) void rodar(async () => { await excluir('categorias', id); fechar() }) }}>Excluir</button>}
            <button type="button" className="btn-sec" onClick={fechar}>Cancelar</button>
            <button className="btn" disabled={ocupado || !nome.trim()}>{ocupado ? 'Salvando...' : 'Salvar categoria'}</button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
