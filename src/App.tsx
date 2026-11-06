import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './data/supabase'
import { carregar } from './data/api'
import type { Dados } from './data/api'
import { Login } from './Login'
import { VisaoGeral } from './VisaoGeral'
import { Futuro } from './Futuro'
import { Lancamentos } from './Lancamentos'
import { Cartoes, Categorias } from './Cadastros'
import { Erro, Icone, Logo } from './ui'
import type { MesRef } from './domain'

const abas = [
  { nome: 'Visão Geral', icone: 'visao' },
  { nome: 'Lançamentos', icone: 'lancamentos' },
  { nome: 'Futuro', icone: 'futuro' },
  { nome: 'Cartões', icone: 'cartoes' },
  { nome: 'Categorias', icone: 'categorias' },
] as const
type Aba = (typeof abas)[number]['nome']

function mesAtual(): MesRef {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function Logado() {
  const [aba, setAba] = useState<Aba>('Visão Geral')
  const [mes, setMes] = useState(mesAtual)
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try { setDados(await carregar()); setErro(null) } catch (e) { setErro((e as Error).message) }
  }, [])
  useEffect(() => { void recarregar() }, [recarregar])

  return (
    <div className="min-h-screen md:pl-60">
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-linha bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-60 md:flex-col md:gap-1 md:border-0 md:bg-painel md:px-4 md:py-6">
        <div className="hidden px-2 pb-6 md:block"><Logo escuro /></div>
        {abas.map((a) => (
          <button key={a.nome} onClick={() => setAba(a.nome)} aria-current={a.nome === aba ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium md:flex-none md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${a.nome === aba ? 'text-tinta md:bg-painel-alto md:text-white' : 'text-suave hover:text-tinta md:text-[#9AA1A8] md:hover:text-white'}`}>
            <Icone nome={a.icone} className="h-[22px] w-[22px] md:h-5 md:w-5" />{a.nome}
          </button>
        ))}
        <button className="hidden border-t border-[#2E3236] px-3 pt-4 text-left text-sm text-[#9AA1A8] hover:text-white md:mt-auto md:block" onClick={() => void supabase.auth.signOut()}>Sair</button>
      </nav>
      <div className="mx-auto max-w-3xl pb-28 md:pb-10">
        <header className="flex items-center justify-between bg-painel px-4 py-3 md:hidden">
          <Logo escuro tamanho={22} />
          <button className="text-sm text-[#9AA1A8]" onClick={() => void supabase.auth.signOut()}>Sair</button>
        </header>
        <main className="space-y-4 p-4 md:px-8 md:pt-8">
          <Erro msg={erro} />
          {dados && dados.rejeitadas.length > 0 && <Erro msg={`${dados.rejeitadas.length} registro(s) inválido(s) ignorado(s): ${dados.rejeitadas.join('; ')}`} />}
          {!dados ? (erro ? null : <p className="text-sm text-suave">Carregando...</p>) : (
            <>
              {aba === 'Visão Geral' && <VisaoGeral dados={dados} mes={mes} setMes={setMes} recarregar={recarregar} />}
              {aba === 'Lançamentos' && <Lancamentos dados={dados} recarregar={recarregar} />}
              {aba === 'Futuro' && <Futuro dados={dados} mes={mes} />}
              {aba === 'Cartões' && <Cartoes dados={dados} recarregar={recarregar} />}
              {aba === 'Categorias' && <Categorias dados={dados} recarregar={recarregar} />}
            </>
          )}
        </main>
      </div>
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
