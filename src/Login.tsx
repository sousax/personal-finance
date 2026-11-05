import { useState } from 'react'
import { supabase } from './data/supabase'
import { Campo, Erro, Logo } from './ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cadastro, setCadastro] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true); setErro(null); setAviso(null)
    const { data, error } = cadastro
      ? await supabase.auth.signUp({ email, password: senha })
      : await supabase.auth.signInWithPassword({ email, password: senha })
    setOcupado(false)
    if (error) setErro(error.message)
    else if (cadastro && !data.session) setAviso('Conta criada. Confirme o e-mail para entrar.')
  }

  return (
    <div className="grid min-h-screen bg-superficie md:grid-cols-[1.1fr_1fr]">
      <aside className="hidden flex-col justify-between gap-10 p-12 text-white md:flex" style={{ background: 'radial-gradient(90% 70% at 100% 0%,#4B37C8 0%,rgba(75,55,200,0) 62%),radial-gradient(80% 60% at 0% 100%,#6B1A2B 0%,rgba(107,26,43,0) 62%),#0E1013' }}>
        <Logo escuro tamanho={30} />
        <div className="max-w-md space-y-3.5">
          <p className="font-titulo text-[44px] font-semibold leading-[1.08] tracking-[-0.035em]">Seu dinheiro, mês a mês. Sem surpresa na fatura.</p>
          <p className="text-white/70">Receitas, despesas, cartões e parcelas futuras num só lugar.</p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} OwnFin</p>
      </aside>
      <main className="flex flex-col justify-center gap-6 p-6">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="md:hidden"><Logo tamanho={32} /></div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold">{cadastro ? 'Criar conta' : 'Entrar'}</h1>
            <p className="text-sm text-suave">{cadastro ? 'Escolha um e-mail e uma senha.' : 'Use seu e-mail e senha cadastrados.'}</p>
          </div>
          <form onSubmit={enviar} className="space-y-4">
            <Campo rotulo="E-mail"><input className="campo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
            <Campo rotulo="Senha"><input className="campo" type="password" required minLength={6} autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
            <Erro msg={erro} />
            {aviso && <p className="rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm text-ok-texto">{aviso}</p>}
            <button className="btn w-full py-3" disabled={ocupado}>{ocupado ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}</button>
          </form>
          <p className="text-center text-sm text-suave">
            {cadastro ? 'Já tem conta? ' : 'Não tem conta? '}
            <button className="font-medium text-violeta-forte hover:text-tinta" onClick={() => setCadastro(!cadastro)}>{cadastro ? 'Entrar' : 'Criar conta'}</button>
          </p>
        </div>
      </main>
    </div>
  )
}
