import { useState } from 'react'
import { supabase } from './data/supabase'
import { Campo, Erro } from './ui'

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-4">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-bold text-slate-950">$</div>
        <h1 className="text-3xl font-bold">Controle<span className="text-emerald-400">.</span></h1>
        <p className="mt-1 text-slate-400">Suas finanças, em um só lugar.</p>
      </div>
      <form onSubmit={enviar} className="cartao space-y-3">
        <Campo rotulo="E-mail"><input className="campo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo rotulo="Senha"><input className="campo" type="password" required minLength={6} autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
        <Erro msg={erro} />
        {aviso && <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">{aviso}</p>}
        <button className="btn w-full" disabled={ocupado}>{ocupado ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <button className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setCadastro(!cadastro)}>
        {cadastro ? 'Já tenho conta' : 'Criar uma conta'}
      </button>
    </main>
  )
}
