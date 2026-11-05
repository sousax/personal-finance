import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './data/supabase'
import { carregar } from './data/api'
import type { Dados } from './data/api'
import { Login } from './Login'
import { Mes } from './Mes'
import { Futuro } from './Futuro'
import { Lancamentos } from './Lancamentos'
import { Cartoes, Categorias } from './Cadastros'
import { Erro } from './ui'
import type { MesRef } from './domain'

const abas = ['Mês', 'Lançamentos', 'Futuro', 'Cartões', 'Categorias'] as const
type Aba = (typeof abas)[number]

function mesAtual(): MesRef {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function Logado() {
  const [aba, setAba] = useState<Aba>('Mês')
  const [mes, setMes] = useState(mesAtual)
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try { setDados(await carregar()); setErro(null) } catch (e) { setErro((e as Error).message) }
  }, [])
  useEffect(() => { void recarregar() }, [recarregar])

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 pt-2">
          <strong>Controle Financeiro</strong>
          <button className="text-sm text-slate-600 underline" onClick={() => void supabase.auth.signOut()}>Sair</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2">
          {abas.map((a) => (
            <button key={a} onClick={() => setAba(a)} aria-current={a === aba}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${a === aba ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>{a}</button>
          ))}
        </nav>
      </header>
      <main className="space-y-4 p-4">
        <Erro msg={erro} />
        {dados && dados.rejeitadas.length > 0 && <Erro msg={`${dados.rejeitadas.length} registro(s) inválido(s) ignorado(s): ${dados.rejeitadas.join('; ')}`} />}
        {!dados ? (erro ? null : <p className="text-sm text-slate-500">Carregando...</p>) : (
          <>
            {aba === 'Mês' && <Mes dados={dados} mes={mes} setMes={setMes} />}
            {aba === 'Lançamentos' && <Lancamentos dados={dados} recarregar={recarregar} />}
            {aba === 'Futuro' && <Futuro dados={dados} mes={mes} />}
            {aba === 'Cartões' && <Cartoes dados={dados} recarregar={recarregar} />}
            {aba === 'Categorias' && <Categorias dados={dados} recarregar={recarregar} />}
          </>
        )}
      </main>
    </div>
  )
}

export function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (sessao === undefined) return null
  return sessao ? <Logado key={sessao.user.id} /> : <Login />
}
