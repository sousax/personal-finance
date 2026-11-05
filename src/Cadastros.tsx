import { useState } from 'react'
import { excluir, salvarCartao, salvarCategoria } from './data/api'
import type { Dados } from './data/api'
import { Campo, Erro } from './ui'

type Props = { dados: Dados; recarregar: () => Promise<void> }

async function tentar(fn: () => Promise<unknown>, setErro: (e: string | null) => void, recarregar: () => Promise<void>) {
  setErro(null)
  try { await fn(); await recarregar() } catch (e) { setErro((e as Error).message) }
}

export function Cartoes({ dados, recarregar }: Props) {
  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [fecha, setFecha] = useState('')
  const [vence, setVence] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const limpar = () => { setId(undefined); setNome(''); setFecha(''); setVence('') }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cartões</h2>
      <form className="cartao space-y-3" onSubmit={(e) => {
        e.preventDefault()
        void tentar(async () => {
          const f = Number(fecha), v = Number(vence)
          if (![f, v].every((n) => Number.isInteger(n) && n >= 1 && n <= 31)) throw new Error('Dias devem ir de 1 a 31.')
          await salvarCartao({ id, nome: nome.trim(), diaFechamento: f, diaVencimento: v })
          limpar()
        }, setErro, recarregar)
      }}>
        <Campo rotulo="Nome"><input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia de fechamento"><input className="campo" required inputMode="numeric" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo rotulo="Dia de vencimento"><input className="campo" required inputMode="numeric" value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        </div>
        <Erro msg={erro} />
        <div className="flex gap-2"><button className="btn">{id ? 'Salvar' : 'Adicionar cartão'}</button>{id && <button type="button" className="btn-sec" onClick={limpar}>Cancelar</button>}</div>
      </form>
      <ul className="cartao divide-y divide-slate-100">
        {dados.cartoes.length === 0 && <li className="py-2 text-sm text-slate-500">Nenhum cartão.</li>}
        {dados.cartoes.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span>{c.nome} <span className="text-slate-500">fecha {c.diaFechamento}, vence {c.diaVencimento}</span></span>
            <span className="flex gap-2">
              <button className="btn-sec" onClick={() => { setId(c.id); setNome(c.nome); setFecha(String(c.diaFechamento)); setVence(String(c.diaVencimento)) }}>Editar</button>
              <button className="btn-sec" onClick={() => { if (confirm(`Excluir ${c.nome}?`)) void tentar(() => excluir('cartoes', c.id), setErro, recarregar) }}>Excluir</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Categorias({ dados, recarregar }: Props) {
  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#64748b')
  const [erro, setErro] = useState<string | null>(null)
  const limpar = () => { setId(undefined); setNome(''); setCor('#64748b') }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Categorias</h2>
      <form className="cartao space-y-3" onSubmit={(e) => {
        e.preventDefault()
        void tentar(async () => { await salvarCategoria({ id, nome: nome.trim(), cor }); limpar() }, setErro, recarregar)
      }}>
        <div className="flex gap-3">
          <div className="flex-1"><Campo rotulo="Nome"><input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></Campo></div>
          <Campo rotulo="Cor"><input type="color" className="h-[42px] w-14 rounded-lg border border-slate-300" value={cor} onChange={(e) => setCor(e.target.value)} /></Campo>
        </div>
        <Erro msg={erro} />
        <div className="flex gap-2"><button className="btn">{id ? 'Salvar' : 'Adicionar categoria'}</button>{id && <button type="button" className="btn-sec" onClick={limpar}>Cancelar</button>}</div>
      </form>
      <ul className="cartao divide-y divide-slate-100">
        {dados.categorias.length === 0 && <li className="py-2 text-sm text-slate-500">Nenhuma categoria.</li>}
        {dados.categorias.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{ background: c.cor }} />{c.nome}</span>
            <span className="flex gap-2">
              <button className="btn-sec" onClick={() => { setId(c.id); setNome(c.nome); setCor(c.cor) }}>Editar</button>
              <button className="btn-sec" onClick={() => { if (confirm(`Excluir ${c.nome}?`)) void tentar(() => excluir('categorias', c.id), setErro, recarregar) }}>Excluir</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
