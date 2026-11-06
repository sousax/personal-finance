import { useState } from 'react'
import { centavos, parseData, parseValor, valorParaTexto } from './domain'
import type { Lancamento, Recorrencia, Resumo } from './domain'
import { excluir, salvarLancamento, sincronizar } from './data/api'
import type { Dados } from './data/api'
import { Campo, Dinheiro, Erro, useAcao } from './ui'

type Tipo = Recorrencia['tipo']
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`
const hoje = () => new Date().toLocaleDateString('sv-SE')

type Form = {
  id?: string; natureza: 'receita' | 'despesa'; descricao: string; valor: string
  categoriaId: string; cartaoId: string; tipo: Tipo; data: string; fim: string; parcelas: string
}
const vazio = (): Form => ({ natureza: 'despesa', descricao: '', valor: '', categoriaId: '', cartaoId: '', tipo: 'unica', data: hoje(), fim: '', parcelas: '2' })

function doLancamento(l: Lancamento): Form {
  const r = l.recorrencia
  return {
    id: l.id, natureza: l.natureza, descricao: l.descricao, valor: valorParaTexto(l.valor),
    categoriaId: l.categoriaId ?? '', cartaoId: l.cartaoId ?? '', tipo: r.tipo,
    data: r.tipo === 'unica' ? r.data : r.tipo === 'mensal' ? r.inicio : r.dataCompra,
    fim: r.tipo === 'mensal' ? (r.fim ?? '') : '', parcelas: r.tipo === 'parcelada' ? String(r.parcelas) : '2',
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

const resumoRec = (r: Recorrencia) =>
  r.tipo === 'unica' ? r.data.split('-').reverse().join('/')
    : r.tipo === 'mensal' ? `mensal desde ${r.inicio.split('-').reverse().join('/')}${r.fim ? ` até ${r.fim.split('-').reverse().join('/')}` : ''}`
      : `${r.parcelas}x, compra em ${r.dataCompra.split('-').reverse().join('/')}`

export function Lancamentos({ dados, recarregar }: { dados: Dados; recarregar: () => Promise<void> }) {
  const [f, setF] = useState<Form>(vazio)
  const { erro, ocupado, rodar: tentar } = useAcao(recarregar)
  const [sync, setSync] = useState<{ resumo: Resumo; avisos: string[] } | null>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[26px] font-semibold">{f.id ? 'Editar lançamento' : 'Novo lançamento'}</h1>
        <button type="button" className="btn-sec" disabled={ocupado} onClick={() => void tentar(async () => {
          setSync(null)
          setSync(await sincronizar(dados, `${hoje().slice(0, 8)}01`))
        })}>{ocupado ? 'Sincronizando...' : 'Sincronizar'}</button>
      </div>
      {sync && (
        <div className="space-y-1 text-sm text-suave">
          <p>{plural(sync.resumo.importadas, 'importada')}, {plural(sync.resumo.vinculadas, 'vinculada')}, {plural(sync.resumo.ignoradas, 'ignorada')}</p>
          {sync.avisos.map((a) => <p key={a}>{a}</p>)}
        </div>
      )}
      <form className="cartao space-y-3" onSubmit={(e) => {
        e.preventDefault()
        void tentar(async () => { await salvarLancamento(paraLancamento(f)); setF(vazio()) })
      }}>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Natureza">
            <select className="campo" value={f.natureza} onChange={(e) => setF((x) => ({ ...x, natureza: e.target.value as Form['natureza'], cartaoId: '' }))}>
              <option value="despesa">Despesa</option><option value="receita">Receita</option>
            </select>
          </Campo>
          <Campo rotulo="Recorrência">
            <select className="campo" value={f.tipo} onChange={(e) => set('tipo', e.target.value as Tipo)}>
              <option value="unica">Única</option><option value="mensal">Mensal (salário, assinatura)</option><option value="parcelada">Parcelada</option>
            </select>
          </Campo>
        </div>
        <Campo rotulo="Descrição"><input className="campo" required value={f.descricao} onChange={(e) => set('descricao', e.target.value)} /></Campo>
        <Campo rotulo={f.tipo === 'parcelada' ? 'Valor total da compra' : f.tipo === 'mensal' ? 'Valor mensal' : 'Valor'}>
          <input className="campo" required inputMode="decimal" placeholder="1.234,56" value={f.valor} onChange={(e) => set('valor', e.target.value)} />
        </Campo>
        <Campo rotulo={f.tipo === 'mensal' ? 'Início' : f.tipo === 'parcelada' ? 'Data da compra' : 'Data'}>
          <input className="campo" type="date" required value={f.data} onChange={(e) => set('data', e.target.value)} />
        </Campo>
        {f.tipo === 'mensal' && <Campo rotulo="Fim (opcional)"><input className="campo" type="date" value={f.fim} onChange={(e) => set('fim', e.target.value)} /></Campo>}
        {f.tipo === 'parcelada' && <Campo rotulo="Número de parcelas"><input className="campo" required inputMode="numeric" value={f.parcelas} onChange={(e) => set('parcelas', e.target.value)} /></Campo>}
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria">
            <select className="campo" value={f.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
              <option value="">Sem categoria</option>
              {dados.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          {f.natureza === 'despesa' && (
            <Campo rotulo="Cartão">
              <select className="campo" value={f.cartaoId} onChange={(e) => set('cartaoId', e.target.value)}>
                <option value="">Sem cartão</option>
                {dados.cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <Erro msg={erro} />
        <div className="flex gap-2">
          <button className="btn" disabled={ocupado}>{ocupado ? 'Salvando...' : f.id ? 'Salvar' : 'Adicionar'}</button>
          {f.id && <button type="button" className="btn-sec" disabled={ocupado} onClick={() => setF(vazio())}>Cancelar</button>}
        </div>
      </form>

      <ul className="cartao lista">
        {dados.lancamentos.length === 0 && <li className="py-2 text-sm text-suave">Nenhum lançamento.</li>}
        {dados.lancamentos.map((l) => (
          <li key={l.id} className="space-y-1 py-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{l.descricao}</span>
              <Dinheiro v={l.valor} className={l.natureza === 'receita' ? 'font-medium text-ok-texto' : 'font-medium'} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-suave">{resumoRec(l.recorrencia)}</span>
              <span className="flex gap-2">
                <button className="btn-sec" disabled={ocupado} onClick={() => { setF(doLancamento(l)); window.scrollTo({ top: 0 }) }}>Editar</button>
                <button className="btn-perigo" disabled={ocupado} onClick={() => { if (confirm(`Excluir ${l.descricao}?`)) void tentar(() => excluir('lancamentos', l.id)) }}>Excluir</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
