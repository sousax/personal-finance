import { useState } from 'react'
import { supabase } from './data/supabase'
import { Campo, Erro, Logo } from './ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cadastro, setCadastro] = useState(() => new URLSearchParams(location.search).has('cadastro'))
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

  async function esqueci() {
    setErro(null); setAviso(null)
    if (!email) return setErro('Informe seu e-mail acima.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    if (error) setErro(error.message)
    else setAviso('Enviamos um link de acesso para o seu e-mail.')
  }

  return (
    <div className="grid min-h-screen bg-superficie md:grid-cols-[1.1fr_1fr]">
      <aside className="hidden flex-col justify-between gap-10 px-14 py-12 text-white md:flex" style={{ background: 'radial-gradient(90% 70% at 100% 0%,#4B37C8 0%,rgba(75,55,200,0) 62%),radial-gradient(80% 60% at 0% 100%,#6B1A2B 0%,rgba(107,26,43,0) 62%),#0E1013' }}>
        <a href="/" aria-label="OwnFin"><Logo escuro tamanho={30} /></a>
        <div className="max-w-[460px] space-y-8">
          <div className="space-y-3.5">
            <p className="text-pretty font-titulo text-[44px] font-semibold leading-[1.08] tracking-[-0.035em]">Seu dinheiro, mês a mês. Sem surpresa na fatura.</p>
            <p className="text-pretty leading-normal text-white/70">Receitas, despesas, cartões e parcelas futuras num só lugar.</p>
          </div>
          <div aria-hidden="true" className="flex h-[200px] w-[320px] -rotate-[4deg] flex-col justify-between rounded-[18px] border border-white/10 p-[22px] shadow-[0_30px_60px_-20px_rgba(106,75,255,.45)]" style={{ background: 'radial-gradient(120% 140% at 100% 0%,#4B37C8 0%,#3A1530 50%,#0E1013 100%)' }}>
            <div className="flex items-center justify-between">
              <svg width="26" height="26" viewBox="0 0 56 56">
                <defs><linearGradient id="ofCartao" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#B02A45" /><stop offset="1" stopColor="#8A70FF" /></linearGradient></defs>
                <rect x="6" y="34" width="12" height="16" rx="6" fill="#fff" />
                <rect x="22" y="22" width="12" height="28" rx="6" fill="#fff" />
                <rect x="38" y="8" width="12" height="42" rx="6" fill="url(#ofCartao)" />
              </svg>
              <span className="h-[25px] w-[34px] rounded-[5px] bg-gradient-to-br from-[#e2e2e2] to-[#9a9a9a]" />
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-white/60">Saldo do mês</span>
                <span className="font-titulo text-[22px] font-semibold tabular-nums tracking-[-0.02em]">R$ 4.389,51</span>
              </div>
              <span className="text-[11px] tracking-[.08em] text-white/60">•••• 4821</span>
            </div>
          </div>
        </div>
        <p className="text-[13px] text-white/50">© {new Date().getFullYear()} OwnFin</p>
      </aside>
      <main className="flex flex-col justify-center gap-6 p-6 md:p-12">
        <div className="mx-auto w-full max-w-[360px] space-y-6">
          <a href="/" aria-label="OwnFin" className="block md:hidden"><Logo tamanho={32} /></a>
          <div className="space-y-1.5">
            <h1 className="font-titulo text-[30px] font-semibold tracking-[-0.035em]">{cadastro ? 'Criar conta' : 'Entrar'}</h1>
            <p className="text-sm text-suave">{cadastro ? 'Escolha um e-mail e uma senha.' : 'Use seu e-mail e senha cadastrados.'}</p>
          </div>
          <form onSubmit={enviar} className="space-y-4">
            <Campo rotulo="E-mail"><input className="campo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
            {!cadastro && <button type="button" onClick={esqueci} className="float-right text-[13px] text-violeta-forte hover:text-tinta">Esqueci a senha</button>}
            <Campo rotulo="Senha"><input className="campo" type="password" required minLength={6} autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
            <Erro msg={erro} />
            {aviso && <p className="rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm text-ok-texto">{aviso}</p>}
            <button className="btn w-full py-3" disabled={ocupado}>{ocupado ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}</button>
          </form>
          <p className="text-center text-[13px] text-suave">
            {cadastro ? 'Já tem conta? ' : 'Não tem conta? '}
            <button className="font-medium text-violeta-forte hover:text-tinta" onClick={() => setCadastro(!cadastro)}>{cadastro ? 'Entrar' : 'Criar conta'}</button>
          </p>
        </div>
      </main>
    </div>
  )
}
