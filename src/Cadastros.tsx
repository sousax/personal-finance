import { useRef, useState } from 'react'
import { excluir, salvarCartao, salvarCategoria } from './data/api'
import type { Dados } from './data/api'
import { Campo, Erro, useAcao } from './ui'
import { centavos, formatarBRL, mesDoPagamento, ocorrenciasDoMes, parseValor, somarMeses, statusLimite, valorParaTexto, variacao } from './domain'
import type { Cartao, Categoria, MesRef, Ocorrencia } from './domain'

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

export const CORES = [
  ['Vinho', '#8E2440'], ['Framboesa', '#C2364A'], ['Magenta', '#A63D8F'], ['Ameixa', '#7A3FA8'], ['Violeta', '#6A4BFF'], ['Anil', '#3F51C7'],
  ['Azul', '#2F6FD6'], ['Petróleo', '#2E7D6B'], ['Verde', '#1F8F4E'], ['Areia', '#A0865E'], ['Laranja', '#D9752B'], ['Grafite', '#3A3F44'],
] as const
const EMOJIS = ['🏠', '🛒', '🚗', '🍔', '💊', '📺', '🛍️', '🎉', '✈️', '📚', '🐶', '💳', '🐷', '💼', '💰', '🎁']
export const misturar = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`
const contagem = (n: number) => `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}`
const nomeMes = (m: MesRef) => new Date(Date.UTC(m.ano, m.mes - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
const brl = (v: number) => formatarBRL(centavos(Math.round(v)))
const ico = 'grid h-[34px] w-[34px] place-items-center rounded-full text-suave transition hover:bg-elevado hover:text-tinta'

export function NavMes({ mes, setMes }: { mes: MesRef; setMes: (m: MesRef) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-linha bg-superficie p-[3px]">
      <button className={`${ico} !h-[30px] !w-[30px]`} aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>‹</button>
      <span className="px-2 text-sm font-semibold first-letter:uppercase">{nomeMes(mes)} {mes.ano}</span>
      <button className={`${ico} !h-[30px] !w-[30px]`} aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>›</button>
    </div>
  )
}

export const Lapis = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
export const Lixeira = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>

type Tipo = 'despesa' | 'receita'
type FormCat = { id?: string; tipo: Tipo; nome: string; cor: string; emoji: string; limite: string }
const formVazio = (tipo: Tipo): FormCat => ({ tipo, nome: '', cor: '#6A4BFF', emoji: '🛒', limite: '' })

export function Categorias({ dados, recarregar, verSemCategoria }: Props & { verSemCategoria: () => void }) {
  const agora = new Date()
  const [mes, setMes] = useState<MesRef>({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 })
  const [aba, setAba] = useState<Tipo>('despesa')
  const [f, setF] = useState<FormCat>(formVazio('despesa'))
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const { erro, ocupado, rodar } = useAcao(recarregar)
  const set = (p: Partial<FormCat>) => setF((x) => ({ ...x, ...p }))

  const somar = (m: MesRef) => {
    const r = new Map<string, { valor: number; n: number }>()
    let semCategoria = 0
    for (const o of ocorrenciasDoMes(dados.lancamentos, dados.cartoes, m)) {
      if (!o.categoriaId) { semCategoria++; continue }
      const tipo = dados.categorias.find((c) => c.id === o.categoriaId)?.tipo ?? 'despesa'
      if (o.natureza !== tipo) continue
      const u = r.get(o.categoriaId) ?? { valor: 0, n: 0 }
      u.valor += o.valor; u.n++
      r.set(o.categoriaId, u)
    }
    return { r, semCategoria }
  }
  const atual = somar(mes)
  const anterior = somar(somarMeses(mes, -1)).r
  const uso = (id: string) => atual.r.get(id) ?? { valor: 0, n: 0 }
  const lista = dados.categorias.filter((c) => (c.tipo ?? 'despesa') === aba).sort((a, b) => uso(b.id).valor - uso(a.id).valor)
  const total = lista.reduce((s, c) => s + uso(c.id).valor, 0)
  const maior = Math.max(1, ...lista.map((c) => uso(c.id).valor))
  const acima = lista.filter((c) => statusLimite(uso(c.id).valor, c.limite) === 'acima').length
  const receita = aba === 'receita'

  const limite = parseValor(f.limite)
  const duplicada = dados.categorias.some((c) => c.id !== f.id && c.nome.trim().toLowerCase() === f.nome.trim().toLowerCase())
  const valido = f.nome.trim().length > 0 && !duplicada && (!f.limite.trim() || (limite !== null && limite > 0))
  const despesaForm = f.tipo === 'despesa'
  const prevMeta = duplicada ? 'Já existe uma categoria com esse nome' : despesaForm ? (limite ? `Limite de ${formatarBRL(limite)} por mês` : 'Despesa · sem limite') : 'Receita'

  function editar(c: Categoria) {
    setConfirmar(null)
    setF({ id: c.id, tipo: c.tipo ?? 'despesa', nome: c.nome, cor: c.cor, emoji: c.emoji ?? '', limite: c.limite ? valorParaTexto(c.limite) : '' })
    nomeRef.current?.focus()
  }
  const nova = () => { setConfirmar(null); setF(formVazio(aba)); nomeRef.current?.focus() }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="font-titulo text-[30px] font-semibold !tracking-[-0.035em]">Categorias</h1>
          <NavMes mes={mes} setMes={setMes} />
        </div>
        <div className="flex gap-1 rounded-full border border-linha bg-superficie p-1">
          {([['despesa', 'Despesas'], ['receita', 'Receitas']] as const).map(([id, rotulo]) => (
            <button key={id} aria-pressed={aba === id} onClick={() => { setAba(id); setConfirmar(null); if (!f.id) setF(formVazio(id)) }}
              className={`h-9 rounded-full px-4 text-[13px] font-semibold ${aba === id ? 'bg-tinta text-superficie' : 'text-suave'}`}>{rotulo}</button>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-3xl bg-superficie px-6 py-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-suave">{receita ? 'Recebido' : 'Gasto'} em {nomeMes(mes)}</span>
            <span className={`font-titulo text-[34px] font-semibold tabular-nums !tracking-[-0.035em] ${receita ? 'text-ok-texto' : ''}`}>{brl(total)}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-full bg-elevado px-3 py-[7px]"><b>{lista.length}</b> {lista.length === 1 ? 'categoria' : 'categorias'}</span>
            {acima > 0 && <span className="rounded-full bg-perigo/10 px-3 py-[7px] text-perigo-texto"><b>{acima}</b> acima do limite</span>}
            {atual.semCategoria > 0 && <button onClick={verSemCategoria} className="rounded-full border border-dashed border-[#E0A030] bg-[#E0A030]/10 px-3 py-[7px] text-[#8A5A00] dark:text-[#F0C068]"><b>{atual.semCategoria}</b> {atual.semCategoria === 1 ? 'lançamento' : 'lançamentos'} sem categoria →</button>}
          </div>
        </div>
        {total > 0 && (
          <>
            <div className="flex h-4 gap-0.5 overflow-hidden rounded-lg">
              {lista.filter((c) => uso(c.id).valor > 0).map((c) => <div key={c.id} title={`${c.nome}: ${brl(uso(c.id).valor)}`} style={{ width: `${(uso(c.id).valor / total) * 100}%`, background: c.cor }} />)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-suave">
              {lista.filter((c) => uso(c.id).valor > 0).map((c) => <span key={c.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />{c.nome} {Math.round((uso(c.id).valor / total) * 100)}%</span>)}
            </div>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-[18px]">
        <form className="flex max-w-full flex-[1_1_320px] flex-col gap-[18px] rounded-3xl bg-superficie p-[22px] md:sticky md:top-5 md:max-w-[400px]" onSubmit={(e) => {
          e.preventDefault()
          if (!valido) return
          void rodar(async () => {
            await salvarCategoria({ id: f.id, nome: f.nome.trim(), cor: f.cor, tipo: f.tipo, emoji: f.emoji || null, limite: despesaForm ? limite : null })
            setAba(f.tipo); setF(formVazio(f.tipo))
          })
        }}>
          <div className="flex items-center justify-between">
            <h2 className="font-titulo text-[19px] font-semibold !tracking-[-0.03em]">{f.id ? 'Editar categoria' : 'Nova categoria'}</h2>
            {f.id && <button type="button" onClick={() => setF(formVazio(aba))} className="rounded-full bg-elevado px-3 py-1.5 text-[13px] font-semibold">Cancelar</button>}
          </div>

          <div className="flex items-center gap-3 rounded-[18px] bg-leve p-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[15px] text-[22px]" style={{ background: misturar(f.cor, 14), color: f.cor }}>{f.emoji || f.nome.trim()[0]?.toUpperCase()}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[15px] font-semibold">{f.nome.trim() || 'Nome da categoria'}</span><span className={`text-xs ${duplicada ? 'text-perigo-texto' : 'text-suave'}`}>{prevMeta}</span></span>
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold sm:flex" style={{ background: misturar(f.cor, 14), color: f.cor }}><span className="h-[7px] w-[7px] rounded-full" style={{ background: f.cor }} />{f.nome.trim() || 'Categoria'}</span>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-full bg-elevado p-1">
            <button type="button" aria-pressed={despesaForm} onClick={() => set({ tipo: 'despesa' })} className={`h-9 rounded-full text-[13px] font-semibold ${despesaForm ? 'bg-tinta text-superficie' : 'text-suave'}`}>Despesa</button>
            <button type="button" aria-pressed={!despesaForm} onClick={() => set({ tipo: 'receita', limite: '' })} className={`h-9 rounded-full text-[13px] font-semibold ${!despesaForm ? 'bg-[#1F8F4E] text-white' : 'text-suave'}`}>Receita</button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Nome</span>
            <input ref={nomeRef} className="campo h-[46px] rounded-[14px] bg-leve" maxLength={24} placeholder="Ex: Mercado, Pets, Educação" value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Cor</legend>
            <div className="grid grid-cols-6 gap-2">
              {CORES.map(([nome, hex]) => (
                <button key={hex} type="button" title={nome} aria-label={nome} aria-pressed={f.cor === hex} onClick={() => set({ cor: hex })}
                  className="aspect-square rounded-xl text-sm font-bold text-white transition active:scale-95" style={{ background: hex, boxShadow: f.cor === hex ? `0 0 0 2px rgb(var(--superficie)), 0 0 0 4px ${hex}` : 'none' }}>{f.cor === hex ? '✓' : ''}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Ícone</legend>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" aria-label={`Ícone ${e}`} aria-pressed={f.emoji === e} onClick={() => set({ emoji: f.emoji === e ? '' : e })}
                  className="aspect-square rounded-[10px] text-lg transition hover:bg-elevado" style={f.emoji === e ? { background: misturar(f.cor, 16), boxShadow: `inset 0 0 0 1.5px ${f.cor}` } : undefined}>{e}</button>
              ))}
            </div>
          </fieldset>

          {despesaForm && (
            <label className="flex flex-col gap-2">
              <span className="flex justify-between text-[13px] font-semibold">Limite por mês <span className="font-medium text-suave">opcional</span></span>
              <span className="relative block">
                <span className="absolute left-3.5 top-[13px] text-[15px] font-semibold text-suave">R$</span>
                <input className="campo h-[46px] rounded-[14px] bg-leve pl-11" inputMode="decimal" placeholder="0,00" value={f.limite} onChange={(e) => set({ limite: e.target.value })} />
              </span>
              <span className="text-xs text-suave">Fica amarelo a partir de 80% do limite e vermelho quando passa.</span>
            </label>
          )}

          <Erro msg={erro} />
          <button disabled={!valido || ocupado} className="h-[52px] rounded-full bg-tinta text-base font-semibold text-superficie transition active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#C9CDD1] disabled:text-white">
            {ocupado ? 'Salvando...' : f.id ? 'Salvar alterações' : 'Criar categoria'}
          </button>
        </form>

        <div className="grid min-w-0 flex-[999_1_460px] grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3.5">
          {lista.map((c) => {
            const u = uso(c.id)
            const st = statusLimite(u.valor, c.limite)
            const dif = variacao(u.valor, anterior.get(c.id)?.valor ?? 0)
            const bom = dif !== null && (receita ? dif > 0 : dif < 0)
            const mesAnt = nomeMes(somarMeses(mes, -1)).slice(0, 3)
            const barra = st === 'acima' ? '#C2364A' : st === 'perto' ? '#E0A030' : c.cor
            const largura = c.limite ? Math.min(100, (u.valor / c.limite) * 100) : (u.valor / maior) * 100
            return (
              <article key={c.id} className="flex flex-col gap-3.5 rounded-[22px] bg-superficie p-[18px] transition hover:shadow-[0_16px_32px_-20px_rgba(25,28,31,.35)]" style={f.id === c.id ? { boxShadow: `0 0 0 2px ${c.cor}` } : undefined}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] text-xl font-semibold" style={{ background: misturar(c.cor, 14), color: c.cor }}>{c.emoji || c.nome.trim()[0]?.toUpperCase()}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[15px] font-semibold">{c.nome}</span><span className="text-xs text-suave">{contagem(u.n)}</span></span>
                  <button className={ico} title="Editar" aria-label={`Editar ${c.nome}`} onClick={() => editar(c)}><Lapis /></button>
                  <button className={`${ico} hover:!bg-perigo/10 hover:!text-perigo`} title="Excluir" aria-label={`Excluir ${c.nome}`} onClick={() => setConfirmar(c.id)}><Lixeira /></button>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`font-titulo text-2xl font-semibold tabular-nums !tracking-[-0.035em] ${receita ? 'text-ok-texto' : ''}`}>{brl(u.valor)}</span>
                  <span className="text-xs tabular-nums text-suave">{c.limite && !receita ? `de ${brl(c.limite)}` : `${total > 0 ? Math.round((u.valor / total) * 100) : 0}% do mês`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-elevado"><div className="h-full rounded" style={{ width: `${largura}%`, background: barra }} /></div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={st === 'acima' ? 'font-bold text-perigo-texto' : st === 'perto' ? 'font-bold text-[#8A5A00] dark:text-[#F0C068]' : 'text-suave'}>
                    {receita ? 'Receita' : st === 'acima' ? `Passou ${brl(u.valor - c.limite!)} do limite` : st === 'sem' ? 'Sem limite definido' : `Sobram ${brl(c.limite! - u.valor)}`}
                  </span>
                  <span className={`font-semibold ${dif === null || dif === 0 ? 'text-suave' : bom ? 'text-ok-texto' : 'text-perigo-texto'}`}>
                    {dif === null ? `— vs ${mesAnt}` : dif === 0 ? `igual a ${mesAnt}` : `${dif > 0 ? '↑' : '↓'} ${Math.abs(dif)}% vs ${mesAnt}`}
                  </span>
                </div>
                {confirmar === c.id && (
                  <div className="flex flex-col gap-2.5 rounded-[14px] bg-perigo/10 p-3">
                    <span className="text-[13px] font-semibold leading-snug text-perigo-texto">Excluir "{c.nome}"?{u.n > 0 && ` Os lançamentos dela ficam sem categoria.`}</span>
                    <span className="flex justify-end gap-1.5">
                      <button className="h-8 rounded-full bg-superficie px-3 text-[13px] font-semibold" onClick={() => setConfirmar(null)}>Manter</button>
                      <button className="h-8 rounded-full bg-[#C2364A] px-3 text-[13px] font-semibold text-white" disabled={ocupado} onClick={() => void rodar(async () => { await excluir('categorias', c.id); setConfirmar(null); if (f.id === c.id) setF(formVazio(aba)) })}>Excluir</button>
                    </span>
                  </div>
                )}
              </article>
            )
          })}
          <button onClick={nova} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-suave/40 text-sm font-semibold text-suave transition hover:border-suave/70">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-superficie text-[22px] text-tinta">+</span>
            Nova categoria
          </button>
        </div>
      </div>
    </div>
  )
}
