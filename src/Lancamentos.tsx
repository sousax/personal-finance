import { useEffect, useRef, useState } from 'react'
import { centavos, formatarBRL, ocorrenciasDoMes, parseData, parseValor, valorParaTexto, visaoGeral } from './domain'
import type { Lancamento, MesRef, Movimento, Recorrencia } from './domain'
import { excluir, ligarCartao, salvarLancamento, sincronizar } from './data/api'
import type { Sincronia } from './data/api'
import type { Dados } from './data/api'
import { Erro, useAcao } from './ui'
import { Lapis, Lixeira, misturar, NavMes } from './Cadastros'

type Tipo = Recorrencia['tipo']
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`
const hoje = () => new Date().toLocaleDateString('sv-SE')
const ontem = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('sv-SE') }
// Desde o mês anterior: a fatura em aberto pode ter compras de antes do dia 1º
const inicioMesAnterior = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('sv-SE') }

type Form = {
  id?: string; natureza: 'receita' | 'despesa'; descricao: string; valor: string
  categoriaId: string; cartaoId: string; tipo: Tipo; data: string; fim: string; parcelas: string
}
const vazio = (natureza: Form['natureza'] = 'despesa'): Form => ({ natureza, descricao: '', valor: '', categoriaId: '', cartaoId: '', tipo: 'unica', data: hoje(), fim: '', parcelas: '1' })

function doLancamento(l: Lancamento): Form {
  const r = l.recorrencia
  return {
    id: l.id, natureza: l.natureza, descricao: l.descricao, valor: valorParaTexto(l.valor),
    categoriaId: l.categoriaId ?? '', cartaoId: l.cartaoId ?? '', tipo: r.tipo,
    data: r.tipo === 'unica' ? r.data : r.tipo === 'mensal' ? r.inicio : r.dataCompra,
    fim: r.tipo === 'mensal' ? (r.fim ?? '') : '', parcelas: r.tipo === 'parcelada' ? String(r.parcelas) : '1',
  }
}

function paraLancamento(f: Form): Omit<Lancamento, 'id'> & { id?: string } {
  const valor = parseValor(f.valor)
  if (!valor || valor <= 0) throw new Error('Valor inválido. Use o formato 1.234,56.')
  if (!parseData(f.data)) throw new Error('Data inválida.')
  let recorrencia: Recorrencia
  if (f.tipo === 'unica') recorrencia = { tipo: 'unica', data: f.data }
  else if (f.tipo === 'mensal') {
    if (f.fim && (!parseData(f.fim) || f.fim < f.data)) throw new Error('O fim deve ser uma data igual ou posterior ao início.')
    recorrencia = { tipo: 'mensal', inicio: f.data, fim: f.fim || null }
  } else {
    const n = Number(f.parcelas)
    if (!Number.isInteger(n) || n < 2 || n > 120) throw new Error('Parcelas deve ser um inteiro entre 2 e 120.')
    recorrencia = { tipo: 'parcelada', dataCompra: f.data, parcelas: n }
  }
  return {
    id: f.id, natureza: f.natureza, descricao: f.descricao.trim(), valor: centavos(valor),
    categoriaId: f.categoriaId || null, cartaoId: f.natureza === 'despesa' && f.cartaoId ? f.cartaoId : null, recorrencia,
  }
}

const AMBAR = '#E0A030'
const SEM_COR = '#B08A3E'
const ico = 'grid h-[34px] w-[34px] place-items-center rounded-full text-suave transition hover:bg-elevado hover:text-tinta'
const iso = (m: MesRef, dia: number) => `${m.ano}-${String(m.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
const ORIGEM: Record<Movimento['grupo'], string> = { own: 'Entre minhas contas', box: 'Caixinha', loan: 'Empréstimo', ppl: 'Pix para pessoas', shop: 'Pix / débito', inc: 'Receita' }

function rotuloDia(d: string) {
  if (d === hoje()) return 'Hoje'
  if (d === ontem()) return 'Ontem'
  const [a, m, dia] = d.split('-').map(Number)
  const t = new Date(a!, m! - 1, dia!).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '')
  return t[0]!.toUpperCase() + t.slice(1)
}

type Filtro = 'todos' | 'despesa' | 'receita' | 'semcat'

function FormLancamento({ dados, f, setF, recarregar, natureza }: { dados: Dados; f: Form; setF: (f: Form) => void; recarregar: () => Promise<void>; natureza?: Form['natureza'] }) {
  const { erro, ocupado, rodar } = useAcao(recarregar)
  const valorRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (natureza) valorRef.current?.focus() }, [natureza])
  const set = (p: Partial<Form>) => setF({ ...f, ...p })
  const despesa = f.natureza === 'despesa'
  const valor = parseValor(f.valor)
  const n = Math.max(2, Number(f.parcelas) || 2)
  const valido = !!valor && valor > 0 && f.descricao.trim().length > 0
  const cats = dados.categorias.filter((c) => (c.tipo ?? 'despesa') === f.natureza)
  const chip = (ativo: boolean) => `flex h-[38px] items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition ${ativo ? 'border-tinta bg-tinta text-superficie' : 'border-linha bg-superficie'}`
  const recorrencias = despesa ? [['unica', 'Única'], ['mensal', 'Todo mês'], ['parcelada', 'Parcelada']] as const : [['unica', 'Única'], ['mensal', 'Todo mês']] as const

  return (
    <form className="flex max-w-full flex-[1_1_340px] flex-col gap-[18px] rounded-3xl bg-superficie p-[22px] md:sticky md:top-5 md:max-w-[440px]" onSubmit={(e) => {
      e.preventDefault()
      if (!valido) return
      void rodar(async () => {
        await salvarLancamento(paraLancamento({ ...f, parcelas: f.tipo === 'parcelada' ? String(n) : f.parcelas }))
        setF({ ...vazio(f.natureza), data: f.data })
      })
    }}>
      <div className="flex items-center justify-between">
        <h2 className="font-titulo text-[19px] font-semibold !tracking-[-0.03em]">{f.id ? 'Editar lançamento' : 'Novo lançamento'}</h2>
        {f.id && <button type="button" onClick={() => setF(vazio())} className="rounded-full bg-elevado px-3 py-1.5 text-[13px] font-semibold">Cancelar</button>}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-elevado p-1">
        <button type="button" aria-pressed={despesa} onClick={() => set({ natureza: 'despesa', categoriaId: '' })} className={`h-[38px] rounded-full text-sm font-semibold ${despesa ? 'bg-tinta text-superficie' : 'text-suave'}`}>− Despesa</button>
        <button type="button" aria-pressed={!despesa} onClick={() => set({ natureza: 'receita', categoriaId: '', cartaoId: '', tipo: f.tipo === 'parcelada' ? 'unica' : f.tipo })} className={`h-[38px] rounded-full text-sm font-semibold ${!despesa ? 'bg-[#1F8F4E] text-white' : 'text-suave'}`}>+ Receita</button>
      </div>

      <label className="flex flex-col gap-1 border-b border-linha px-0.5 pb-2.5 pt-1.5">
        <span className="text-[13px] text-suave">{f.tipo === 'parcelada' ? 'Valor total' : 'Valor'}</span>
        <span className="flex items-baseline gap-2">
          <span className={`font-titulo text-[22px] font-semibold ${despesa ? '' : 'text-ok-texto'}`}>R$</span>
          <input ref={valorRef} inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => set({ valor: e.target.value })}
            className="w-full min-w-0 bg-transparent font-titulo text-[34px] font-semibold tabular-nums tracking-[-0.03em] text-tinta placeholder:text-suave/40 focus:outline-none" />
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Descrição</span>
        <input className="campo h-[46px] rounded-[14px] bg-leve" placeholder={despesa ? 'Ex: Mercado, Uber, Pix para…' : 'Ex: Salário, Pix recebido de…'} value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">{f.tipo === 'mensal' ? 'Começa em' : f.tipo === 'parcelada' ? 'Data da compra' : 'Data'}</span>
        <div className="flex items-center gap-2">
          {([[hoje(), 'Hoje'], [ontem(), 'Ontem']] as const).map(([d, rotulo]) => (
            <button key={rotulo} type="button" aria-pressed={f.data === d} onClick={() => set({ data: d })} className={`h-[46px] flex-none rounded-[14px] border px-3.5 text-sm font-semibold ${f.data === d ? 'border-tinta bg-tinta text-superficie' : 'border-linha bg-leve'}`}>{rotulo}</button>
          ))}
          <input className="campo h-[46px] min-w-0 flex-1 rounded-[14px] bg-leve" type="date" aria-label="Data" value={f.data} onChange={(e) => set({ data: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Categoria</span>
        <div className="flex flex-wrap gap-1.5">
          {cats.length === 0 && <span className="text-[13px] text-suave">Nenhuma categoria de {despesa ? 'despesa' : 'receita'}. Crie em Categorias.</span>}
          {cats.map((c) => {
            const ativo = f.categoriaId === c.id
            return (
              <button key={c.id} type="button" aria-pressed={ativo} onClick={() => set({ categoriaId: ativo ? '' : c.id })}
                className="flex h-[34px] items-center gap-[7px] rounded-full border px-3 text-[13px] font-semibold transition"
                style={ativo ? { background: misturar(c.cor, 14), color: c.cor, borderColor: c.cor } : { borderColor: 'rgb(var(--linha))' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />{c.nome}
              </button>
            )
          })}
        </div>
      </div>

      {despesa && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Pago com</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!f.cartaoId} onClick={() => set({ cartaoId: '' })} className={chip(!f.cartaoId)}><span className="h-3 w-[18px] rounded-[3px] bg-[#C9CDD1]" />Pix / débito</button>
            {dados.cartoes.map((c, i) => (
              <button key={c.id} type="button" aria-pressed={f.cartaoId === c.id} onClick={() => set({ cartaoId: c.id })} className={chip(f.cartaoId === c.id)}>
                <span className="h-3 w-[18px] rounded-[3px]" style={{ background: `linear-gradient(135deg,${i % 2 ? '#8E2440' : '#6A4BFF'},#191C1F)` }} />{c.nome}{c.final ? ` •${c.final}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Recorrência</span>
        <div className={`grid gap-1 rounded-[14px] bg-elevado p-1 ${despesa ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {recorrencias.map(([id, rotulo]) => (
            <button key={id} type="button" aria-pressed={f.tipo === id} onClick={() => set({ tipo: id, parcelas: id === 'parcelada' ? String(n) : '1' })}
              className={`h-[34px] rounded-[10px] text-[13px] font-semibold ${f.tipo === id ? 'bg-superficie text-tinta shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-suave'}`}>{rotulo}</button>
          ))}
        </div>
        {f.tipo === 'parcelada' && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-violeta/10 px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Menos parcelas" onClick={() => set({ parcelas: String(Math.max(2, n - 1)) })} className="h-8 w-8 rounded-full bg-superficie text-base font-semibold">−</button>
              <span className="min-w-11 text-center text-[15px] font-bold">{n}×</span>
              <button type="button" aria-label="Mais parcelas" onClick={() => set({ parcelas: String(Math.min(120, n + 1)) })} className="h-8 w-8 rounded-full bg-superficie text-base font-semibold">+</button>
            </div>
            <span className="text-right text-[13px] font-semibold text-violeta-forte">{valor ? `${n}× de ${formatarBRL(centavos(Math.floor(valor / n)))}` : 'Informe o valor total'}</span>
          </div>
        )}
        {f.tipo === 'mensal' && (
          <label className="flex items-center gap-2 text-[13px] text-suave">Termina em <input className="campo h-10 w-auto flex-1 rounded-xl bg-leve" type="date" value={f.fim} onChange={(e) => set({ fim: e.target.value })} /><span>opcional</span></label>
        )}
      </div>

      <Erro msg={erro} />
      {f.id && (
        <button type="button" disabled={ocupado} className="self-start text-[13px] font-semibold text-perigo-texto sm:hidden"
          onClick={() => { if (confirm('Excluir este lançamento e todas as ocorrências dele?')) void rodar(async () => { await excluir('lancamentos', f.id!); setF(vazio()) }) }}>Excluir lançamento</button>
      )}
      <button disabled={!valido || ocupado} className={`h-[52px] rounded-full text-base font-semibold transition active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#C9CDD1] disabled:text-white ${despesa ? 'bg-tinta text-superficie' : 'bg-[#1F8F4E] text-white'}`}>
        {ocupado ? 'Salvando...' : f.id ? 'Salvar alterações' : despesa ? 'Adicionar despesa' : 'Adicionar receita'}
      </button>
    </form>
  )
}

export function Lancamentos({ dados, recarregar, natureza, busca: buscaInicial = '', filtro: filtroInicial = 'todos' }: { dados: Dados; recarregar: () => Promise<void>; natureza?: Form['natureza']; busca?: string; filtro?: Filtro }) {
  const agora = new Date()
  const [mes, setMes] = useState<MesRef>({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 })
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial)
  const [busca, setBusca] = useState(buscaInicial)
  const [f, setF] = useState<Form>(() => vazio(natureza))
  const [escolhendo, setEscolhendo] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const acao = useAcao(recarregar)
  const sincronia = useAcao(recarregar)
  const [sync, setSync] = useState<Sincronia | null>(null)
  const [escolha, setEscolha] = useState<Record<string, string>>({})

  const ocorrencias = ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes)
  const movimentos = visaoGeral(ocorrencias).movimentos
  const categoria = (id: string | null) => dados.categorias.find((c) => c.id === id)
  const lancamento = (id: string) => dados.lancamentos.find((l) => l.id === id)
  const entradas = ocorrencias.reduce((s, o) => s + (o.natureza === 'receita' ? o.valor : 0), 0)
  const saidas = ocorrencias.reduce((s, o) => s + (o.natureza === 'despesa' ? o.valor : 0), 0)
  const semCategoria = ocorrencias.filter((o) => !o.categoriaId).length
  const termo = busca.trim().toLocaleLowerCase('pt-BR')

  const linhas = movimentos.map((m, i) => {
    const o = m.ocorrencia
    const l = lancamento(o.lancamentoId)
    const r = l?.recorrencia
    // Compra única no cartão aparece no dia da compra; o resto, no dia em que sai do caixa
    const data = l?.cartaoId && r?.tipo === 'unica' ? r.data : iso(o.mes, o.dia)
    const cartao = dados.cartoes.find((c) => c.id === o.cartaoId)
    const parcela = /\((\d+\/\d+)\)$/.exec(o.descricao)?.[1]
    const extra = [cartao && `${cartao.nome}${cartao.final ? ` •${cartao.final}` : ''}`, r?.tipo === 'mensal' && 'Todo mês', parcela && `Parcela ${parcela}`].filter(Boolean).join(' · ')
    return { chave: `${o.lancamentoId}-${i}`, o, l, data, cat: categoria(o.categoriaId), titulo: m.nome.replace(/\s*\(\d+\/\d+\)$/, ''), origem: cartao ? 'Compra no cartão' : ORIGEM[m.grupo], extra }
  }).filter((x) => {
    if (filtro === 'semcat' ? !!x.o.categoriaId : filtro !== 'todos' && x.o.natureza !== filtro) return false
    return !termo || `${x.titulo} ${x.o.descricao} ${x.origem} ${x.cat?.nome ?? 'sem categoria'} ${valorParaTexto(x.o.valor)}`.toLocaleLowerCase('pt-BR').includes(termo)
  }).sort((a, b) => b.data.localeCompare(a.data))

  const grupos = [...new Set(linhas.map((x) => x.data))].map((d) => {
    const doDia = linhas.filter((x) => x.data === d)
    const ent = doDia.reduce((s, x) => s + (x.o.natureza === 'receita' ? x.o.valor : 0), 0)
    const sai = doDia.reduce((s, x) => s + (x.o.natureza === 'despesa' ? x.o.valor : 0), 0)
    return { d, doDia, total: [ent && `+ ${formatarBRL(centavos(ent))}`, sai && `− ${formatarBRL(centavos(sai))}`].filter(Boolean).join('  ·  ') }
  })
  const filtros = [['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas'], ['semcat', `Sem categoria (${semCategoria})`]] as const

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="font-titulo text-[30px] font-semibold !tracking-[-0.035em]">Lançamentos</h1>
          <NavMes mes={mes} setMes={setMes} />
        </div>
        <button type="button" disabled={sincronia.ocupado} onClick={() => void sincronia.rodar(async () => { setSync(null); setSync(await sincronizar(dados, inicioMesAnterior())) })}
          className="flex h-[42px] items-center gap-2 rounded-full border border-linha bg-superficie px-4 text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={sincronia.ocupado ? 'animate-spin' : ''}><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5" /></svg>
          {sincronia.ocupado ? 'Sincronizando…' : sync ? 'Atualizado agora' : 'Sincronizar'}
        </button>
      </div>

      <Erro msg={sincronia.erro} />
      {sync && (sync.resumo.importadas + sync.resumo.vinculadas > 0 || sync.avisos.length > 0 || sync.semVinculo.length > 0) && (
        <div className="space-y-1 text-sm text-suave">
          <p>{plural(sync.resumo.importadas, 'importada')}, {plural(sync.resumo.vinculadas, 'vinculada')}, {plural(sync.resumo.ignoradas, 'ignorada')}</p>
          {sync.avisos.map((a) => <p key={a}>{a}</p>)}
          {sync.semVinculo.length > 0 && (
            <div className="cartao space-y-3 text-tinta">
              <p className="text-sm">O Pluggy não informou fechamento e vencimento destes cartões. Escolha a qual cartão cada um pertence e sincronize de novo para importar as compras.</p>
              {sync.semVinculo.map((conta) => (
                <form key={conta.id} className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
                  e.preventDefault()
                  const cartaoId = escolha[conta.id]
                  if (!cartaoId) return
                  void sincronia.rodar(async () => {
                    await ligarCartao(cartaoId, conta.id)
                    setSync({ ...sync, semVinculo: sync.semVinculo.filter((c) => c.id !== conta.id) })
                  })
                }}>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{conta.nome}</span>
                  <select className="campo w-auto" aria-label={`Cartão para ${conta.nome}`} value={escolha[conta.id] ?? ''} onChange={(e) => setEscolha({ ...escolha, [conta.id]: e.target.value })}>
                    <option value="">Escolha o cartão</option>
                    {dados.cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button className="btn-sec" disabled={!escolha[conta.id] || sincronia.ocupado}>Ligar</button>
                </form>
              ))}
              {dados.cartoes.length === 0 && <p className="text-sm text-suave">Cadastre os cartões em Cartões › Gerenciar cartões primeiro.</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-[1_1_140px] flex-col gap-1 rounded-[18px] bg-superficie px-[18px] py-4"><span className="text-[13px] text-suave">Entradas</span><span className="font-titulo text-2xl font-semibold tabular-nums text-ok-texto">{formatarBRL(centavos(entradas))}</span></div>
        <div className="flex flex-[1_1_140px] flex-col gap-1 rounded-[18px] bg-superficie px-[18px] py-4"><span className="text-[13px] text-suave">Saídas</span><span className="font-titulo text-2xl font-semibold tabular-nums">{formatarBRL(centavos(saidas))}</span></div>
        <div className="flex flex-[1_1_140px] flex-col gap-1 rounded-[18px] px-[18px] py-4 text-white" style={{ background: 'radial-gradient(130% 160% at 100% 0%,#4B37C8 0%,#3A1530 50%,#191C1F 85%)' }}><span className="text-[13px] text-white/70">Saldo do mês</span><span className="font-titulo text-2xl font-semibold tabular-nums">{entradas - saidas < 0 ? '− ' : ''}{formatarBRL(centavos(Math.abs(entradas - saidas)))}</span></div>
        {semCategoria > 0 && (
          <button onClick={() => setFiltro('semcat')} className="flex flex-[1_1_140px] items-center gap-3 rounded-[18px] border border-[#E0A030]/40 bg-[#E0A030]/10 px-[18px] py-4 text-left">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl font-bold text-white" style={{ background: AMBAR }}>{semCategoria}</span>
            <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold">Sem categoria</span><span className="text-xs text-suave">Toque para organizar</span></span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <FormLancamento dados={dados} f={f} setF={setF} recarregar={recarregar} natureza={natureza} />

        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative flex-[1_1_220px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-[15px] top-[15px] text-suave" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input type="search" aria-label="Buscar lançamento" placeholder="Buscar por nome, categoria ou valor" value={busca} onChange={(e) => setBusca(e.target.value)}
                className="h-[46px] w-full rounded-full border border-linha bg-superficie pl-10 pr-4 text-[15px] text-tinta placeholder:text-suave focus:border-violeta focus:shadow-[0_0_0_4px_rgba(106,75,255,.14)] focus:outline-none" />
            </label>
            <div className="flex gap-1 overflow-x-auto rounded-full border border-linha bg-superficie p-1">
              {filtros.map(([id, rotulo]) => (
                <button key={id} aria-pressed={filtro === id} onClick={() => setFiltro(id)} className={`h-9 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold ${filtro === id ? 'bg-tinta text-superficie' : 'text-suave'}`}>{rotulo}</button>
              ))}
            </div>
          </div>

          <Erro msg={acao.erro} />
          <div className="rounded-3xl bg-superficie px-[22px] pb-3.5 pt-2">
            {grupos.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 px-3 py-12 text-center"><span className="font-titulo text-lg font-semibold">Nada por aqui</span><span className="text-sm text-suave">{termo || filtro !== 'todos' ? 'Nenhum lançamento com esse filtro.' : 'Nenhum lançamento neste mês.'}</span></div>
            )}
            {grupos.map((g) => (
              <section key={g.d}>
                <div className="flex items-baseline justify-between border-b border-linha pb-2 pt-4">
                  <h3 className="text-[13px] font-bold">{rotuloDia(g.d)}</h3>
                  <span className="text-xs tabular-nums text-suave">{g.total}</span>
                </div>
                {g.doDia.map((x) => {
                  const receita = x.o.natureza === 'receita'
                  const cor = x.cat?.cor ?? SEM_COR
                  const repete = x.l && x.l.recorrencia.tipo !== 'unica'
                  return (
                    <div key={x.chave}>
                      <div className="-mx-2.5 flex items-center gap-3.5 rounded-[14px] px-2.5 py-3 hover:bg-leve" style={f.id && f.id === x.o.lancamentoId ? { background: 'rgb(var(--violeta) / .08)' } : undefined}>
                        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full text-sm font-bold"
                          style={x.cat ? { background: misturar(cor, 14), color: cor } : { border: `1.5px dashed ${AMBAR}`, color: SEM_COR }}>{x.cat?.emoji || x.titulo.trim()[0]?.toUpperCase()}</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <button className="truncate text-left text-[15px] font-semibold" title={x.o.descricao} onClick={() => { if (x.l) { setF(doLancamento(x.l)); window.scrollTo({ top: 0, behavior: 'smooth' }) } }}>{x.titulo}</button>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-suave">
                            <span>{x.origem}</span>
                            {x.cat ? (
                              <span className="flex items-center gap-[5px] rounded-full px-2 py-0.5 font-semibold" style={{ background: misturar(cor, 14), color: cor }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />{x.cat.nome}</span>
                            ) : (
                              <button onClick={() => { setEscolhendo(escolhendo === x.chave ? null : x.chave); setConfirmar(null) }} className="rounded-full border border-dashed px-[9px] py-[3px] font-semibold text-[#8A5A00] dark:text-[#F0C068]" style={{ borderColor: AMBAR, background: 'rgb(224 160 48 / .1)' }}>+ Categoria</button>
                            )}
                            {x.extra && <span>· {x.extra}</span>}
                          </span>
                        </div>
                        <span className={`whitespace-nowrap text-[15px] font-bold tabular-nums ${receita ? 'text-ok-texto' : ''}`}>{receita ? '+ ' : '− '}{formatarBRL(x.o.valor)}</span>
                        <div className="hidden gap-0.5 sm:flex">
                          <button className={ico} title="Editar" aria-label={`Editar ${x.titulo}`} onClick={() => { if (x.l) { setF(doLancamento(x.l)); window.scrollTo({ top: 0, behavior: 'smooth' }) } }}><Lapis /></button>
                          <button className={`${ico} hover:!bg-perigo/10 hover:!text-perigo`} title="Excluir" aria-label={`Excluir ${x.titulo}`} onClick={() => { setConfirmar(x.chave); setEscolhendo(null) }}><Lixeira /></button>
                        </div>
                      </div>
                      {escolhendo === x.chave && x.l && (
                        <div className="flex flex-wrap gap-1.5 pb-3 pl-14 pt-1">
                          {dados.categorias.filter((c) => (c.tipo ?? 'despesa') === x.o.natureza).map((c) => (
                            <button key={c.id} disabled={acao.ocupado} onClick={() => void acao.rodar(async () => { await salvarLancamento({ ...x.l!, categoriaId: c.id }); setEscolhendo(null) })}
                              className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold" style={{ background: misturar(c.cor, 14) }}>
                              <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />{c.nome}
                            </button>
                          ))}
                          {dados.categorias.every((c) => (c.tipo ?? 'despesa') !== x.o.natureza) && <span className="text-[13px] text-suave">Nenhuma categoria de {receita ? 'receita' : 'despesa'}. Crie em Categorias.</span>}
                        </div>
                      )}
                      {confirmar === x.chave && x.l && (
                        <div className="mb-2.5 ml-14 flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] bg-perigo/10 px-3 py-2.5">
                          <span className="text-[13px] font-semibold text-perigo-texto">{repete ? 'Excluir este lançamento e todas as ocorrências dele?' : 'Excluir este lançamento?'} Não dá para desfazer.</span>
                          <span className="flex gap-1.5">
                            <button className="h-8 rounded-full bg-superficie px-3 text-[13px] font-semibold" onClick={() => setConfirmar(null)}>Manter</button>
                            <button className="h-8 rounded-full bg-[#C2364A] px-3 text-[13px] font-semibold text-white" disabled={acao.ocupado} onClick={() => void acao.rodar(async () => { await excluir('lancamentos', x.l!.id); setConfirmar(null); if (f.id === x.l!.id) setF(vazio()) })}>Excluir</button>
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
