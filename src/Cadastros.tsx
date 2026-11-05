import { useState } from 'react'
import { excluir, salvarCartao, salvarCategoria } from './data/api'
import type { Dados } from './data/api'
import { Campo, Erro, useAcao } from './ui'

type Props = { dados: Dados; recarregar: () => Promise<void> }

export function Cartoes({ dados, recarregar }: Props) {
  const [id, setId] = useState<string | undefined>()
  const [nome, setNome] = useState('')
  const [fecha, setFecha] = useState('')
  const [vence, setVence] = useState('')
  const { erro, ocupado, rodar } = useAcao(recarregar)
  const limpar = () => { setId(undefined); setNome(''); setFecha(''); setVence('') }

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-semibold">Cartões</h1>
      <form className="cartao space-y-3" onSubmit={(e) => {
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
      <ul className="cartao lista">
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
