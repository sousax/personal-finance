import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { lembrarSessao, supabase } from './data/supabase'
import { Logo } from './ui'

const CARTAO = 'radial-gradient(120% 140% at 100% 0%,#4B37C8 0%,#3A1530 50%,#0E1013 100%)'
const campo = 'h-[50px] w-full rounded-[14px] border border-[#E2E4E6] bg-[#F7F7F8] px-4 text-[15px] text-tinta transition placeholder:text-[#8D969E] focus:border-violeta focus:bg-white focus:shadow-[0_0_0_4px_rgba(106,75,255,.14)] focus:outline-none'
const fantasma = 'h-12 rounded-full border border-[#E2E4E6] bg-white text-sm font-semibold transition hover:bg-fundo active:scale-[.985]'

const mensagens: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Já existe uma conta com esse e-mail.',
}

function Marca({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 56 56" aria-hidden="true">
      <rect x="6" y="34" width="12" height="16" rx="6" fill="#fff" />
      <rect x="22" y="22" width="12" height="28" rx="6" fill="#fff" />
      <rect x="38" y="8" width="12" height="42" rx="6" fill="url(#ofLogin)" />
    </svg>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [cadastro, setCadastro] = useState(() => new URLSearchParams(location.search).has('cadastro'))
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function falhou(e: { message: string }) {
    setErro(mensagens[e.message] ?? e.message)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null); setAviso(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Digite um e-mail válido, como voce@email.com.')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    setOcupado(true)
    lembrarSessao(lembrar)
    const { data, error } = cadastro
      ? await supabase.auth.signUp({ email: email.trim(), password: senha })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setOcupado(false)
    if (error) falhou(error)
    else if (cadastro && !data.session) setAviso('Conta criada. Confirme o e-mail para entrar.')
  }

  async function esqueci(e: React.MouseEvent) {
    e.preventDefault()
    setErro(null); setAviso(null)
    if (!email) return setErro('Informe seu e-mail acima.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin })
    if (error) falhou(error)
    else setAviso('Enviamos um link de acesso para o seu e-mail.')
  }

  async function social(provider: Provider) {
    setErro(null)
    lembrarSessao(lembrar)
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin } })
    if (error) falhou(error)
  }

  function alternar() {
    setCadastro(!cadastro); setErro(null); setAviso(null)
  }

  return (
    <div className="tema-claro flex min-h-screen bg-white text-tinta">
      <svg width="0" height="0" className="absolute" aria-hidden="true"><defs><linearGradient id="ofLogin" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#B02A45" /><stop offset="1" stopColor="#8A70FF" /></linearGradient></defs></svg>

      <aside className="relative hidden flex-[1_1_560px] flex-col justify-between gap-10 overflow-hidden px-[clamp(24px,5vw,64px)] py-10 text-white lg:flex" style={{ background: 'radial-gradient(70% 60% at 100% 0%,#4B37C8 0%,rgba(75,55,200,0) 70%),radial-gradient(70% 60% at 0% 100%,#6B1A2B 0%,rgba(107,26,43,0) 70%),#0E1013' }}>
        <a href="/" aria-label="OwnFin" className="self-start"><Logo escuro tamanho={30} /></a>

        <div className="flex flex-wrap items-center gap-12">
          <div className="flex max-w-[440px] flex-[1_1_300px] flex-col gap-4">
            <p className="text-balance font-titulo text-[clamp(34px,4.2vw,52px)] font-semibold leading-[1.04] tracking-[-0.04em]">Seu dinheiro, mês a mês. Sem surpresa na fatura.</p>
            <p className="text-pretty leading-normal text-white/[.66]">Receitas, despesas, cartões e parcelas futuras num só lugar, com o que é seu sempre no topo.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Parcelas futuras', 'Faturas por cartão', 'Gastos por categoria'].map((t) => (
                <span key={t} className="rounded-full border border-white/[.12] bg-white/[.08] px-3 py-[7px] text-[13px]">{t}</span>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="relative h-[300px] w-[330px] flex-none">
            <div className="absolute right-0 top-2.5 h-44 w-[280px] rotate-[5deg] rounded-[18px] border border-white/[.08] opacity-[.85] motion-safe:animate-[cartao-b_7s_ease-in-out_infinite]" style={{ background: 'radial-gradient(120% 140% at 100% 0%,#8E2440 0%,#3A1218 55%,#0E1013 100%)' }} />
            <div className="absolute left-0 top-[70px] flex h-[190px] w-[300px] -rotate-[6deg] flex-col justify-between rounded-[18px] border border-white/[.12] p-[22px] shadow-[0_40px_80px_-24px_rgba(106,75,255,.55)] motion-safe:animate-[cartao-a_6s_ease-in-out_infinite]" style={{ background: CARTAO }}>
              <div className="flex items-center justify-between"><Marca tamanho={26} /><span className="h-[25px] w-[34px] rounded-[5px] bg-gradient-to-br from-[#e6e6e6] to-[#9a9a9a]" /></div>
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-0.5"><span className="text-[11px] text-white/60">Saldo do mês</span><span className="font-titulo text-[22px] font-semibold tabular-nums tracking-[-0.02em]">R$ 4.389,51</span></div>
                <span className="text-[11px] tracking-[.08em] text-white/60">•••• 4821</span>
              </div>
            </div>
            <div className="absolute -right-1.5 bottom-0 flex items-center gap-2.5 rounded-2xl border border-white/[.16] bg-white/10 px-3.5 py-3 shadow-[0_20px_40px_-16px_rgba(0,0,0,.6)] backdrop-blur-[14px]">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm" style={{ background: 'linear-gradient(135deg,#8E2440,#6A4BFF)' }}>↑</span>
              <div className="flex flex-col gap-px"><span className="text-[11px] text-white/65">Guardado em novembro</span><span className="text-[15px] font-semibold tabular-nums">51% da receita</span></div>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-white/50">© {new Date().getFullYear()} OwnFin</p>
      </aside>

      <main className="flex flex-[1_1_440px] flex-col px-[clamp(20px,4vw,48px)] py-7">
        <div className="flex items-center justify-between gap-2.5 text-sm text-suave lg:justify-end">
          <a href="/" aria-label="OwnFin" className="lg:hidden"><Logo tamanho={26} /></a>
          <span className="flex items-center gap-2.5">
            <span className="hidden sm:inline">{cadastro ? 'Já tem conta?' : 'Não tem conta?'}</span>
            <button onClick={alternar} className="rounded-full border border-[#E2E4E6] px-3.5 py-2 font-semibold text-tinta transition hover:bg-fundo">{cadastro ? 'Entrar' : 'Criar conta'}</button>
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="flex w-full max-w-[384px] flex-col gap-[26px]">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-titulo text-[32px] font-semibold leading-[1.1] !tracking-[-0.04em]">{cadastro ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
              <p className="text-[15px] text-suave">{cadastro ? 'Leva menos de 2 minutos.' : 'Entre para ver seu mês.'}</p>
            </div>

            <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">E-mail</span>
                <input className={campo} type="email" placeholder="voce@email.com" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErro(null) }} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex items-center justify-between text-[13px] font-semibold">
                  Senha
                  {!cadastro && <button type="button" onClick={esqueci} className="font-medium text-violeta-forte hover:text-tinta">Esqueci a senha</button>}
                </span>
                <span className="relative block">
                  <input className={`${campo} pr-[84px]`} type={mostrar ? 'text' : 'password'} placeholder="Mínimo de 6 caracteres" autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={(e) => { setSenha(e.target.value); setErro(null) }} />
                  <button type="button" onClick={() => setMostrar(!mostrar)} aria-pressed={mostrar} className="absolute right-1.5 top-[7px] h-9 rounded-full px-3 text-[13px] font-semibold text-suave">{mostrar ? 'Ocultar' : 'Mostrar'}</button>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 self-start text-sm">
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="h-5 w-5 rounded-md accent-tinta" />
                Manter conectado neste aparelho
              </label>

              {erro && <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-[#FBE9EB] px-3.5 py-3 text-sm leading-snug text-[#8E2433]"><span className="font-bold">!</span>{erro}</p>}
              {aviso && <p role="status" className="rounded-xl bg-[#E3F5EA] px-3.5 py-3 text-sm leading-snug text-ok-texto">{aviso}</p>}

              <button disabled={ocupado} className="mt-1 h-[52px] rounded-full bg-tinta bg-[length:200%_100%] text-base font-semibold text-white transition active:scale-[.985] disabled:cursor-wait disabled:animate-[barra_1.2s_linear_infinite] disabled:bg-[linear-gradient(90deg,#8E2440,#6A4BFF,#8E2440)]">
                {ocupado ? (cadastro ? 'Criando conta…' : 'Entrando…') : cadastro ? 'Criar conta' : 'Entrar'}
              </button>
            </form>

            <div className="flex items-center gap-3 text-[13px] text-[#8D969E]"><span className="h-px flex-1 bg-linha" />ou<span className="h-px flex-1 bg-linha" /></div>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => void social('google')} className={fantasma}>Google</button>
              <button onClick={() => void social('apple')} className={fantasma}>Apple</button>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-[#8D969E]">
              <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="6" width="10" height="7.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              Conexão protegida com criptografia
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
