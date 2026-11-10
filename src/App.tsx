import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './data/supabase'
import { carregar } from './data/api'
import type { Dados } from './data/api'
import { Login } from './Login'
import { Inicio } from './Inicio'
import type { Ir } from './Inicio'
import { MetasCaixinhas } from './Metas'
import { Site } from './Site'
import { Futuro } from './Futuro'
import { Lancamentos } from './Lancamentos'
import { Cartoes, Categorias } from './Cadastros'
import { Erro, Icone, Logo } from './ui'
import { centavos, formatarBRL, ocorrenciasDoMes, progressoMetas, visaoGeral } from './domain'
import type { MesRef } from './domain'

const abas = [
  { nome: 'Início', curto: 'Início', icone: 'inicio' },
  { nome: 'Lançamentos', curto: 'Lançar', icone: 'lancamentos' },
  { nome: 'Futuro', curto: 'Futuro', icone: 'futuro' },
  { nome: 'Cartões', curto: 'Cartões', icone: 'cartoes' },
  { nome: 'Categorias', curto: 'Categ.', icone: 'categorias' },
  { nome: 'Metas', curto: 'Metas', icone: 'meta' },
] as const
type Aba = (typeof abas)[number]['nome']
type Pedido = Parameters<Ir>[1]

function mesAtual(): MesRef {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function Metas({ dados, recarregar }: { dados: Dados; recarregar: () => Promise<void> }) {
  const mes = mesAtual()
  const v = visaoGeral(ocorrenciasDoMes(dados.lancamentos, dados.cartoes, mes))
  const fmt = (valor: number, sinal = '') => sinal + formatarBRL(centavos(Math.abs(valor)))
  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-semibold">Metas</h1>
      <MetasCaixinhas caixinhas={v.caixinhas} progresso={progressoMetas(dados.metas, dados.lancamentos, v.caixinhas, mes)} liquido={v.liquidoCaixinhas} fmt={fmt} recarregar={recarregar} />
    </div>
  )
}

function Logado({ email }: { email: string }) {
  const [aba, setAba] = useState<Aba>('Início')
  const [pedido, setPedido] = useState<{ n: number } & Pedido>({ n: 0 })
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try { setDados(await carregar()); setErro(null) } catch (e) { setErro((e as Error).message) }
  }, [])
  useEffect(() => { void recarregar() }, [recarregar])

  const abrir = (a: Aba) => { setAba(a); window.scrollTo({ top: 0 }) }
  // n troca a key de Lançamentos, para o formulário e a busca recomeçarem com o pedido
  const ir: Ir = (a, p) => { setPedido((x) => ({ n: x.n + 1, ...p })); abrir(a) }
  const sair = () => void supabase.auth.signOut()
  const agora = mesAtual()
  // Selo âmbar de Lançamentos: ocorrências do mês ainda sem categoria
  const semCategoria = dados ? ocorrenciasDoMes(dados.lancamentos, dados.cartoes, agora).filter((o) => !o.categoriaId).length : 0

  return (
    <div className="min-h-screen md:pl-[248px]">
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-linha bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-[248px] md:flex-col md:gap-[22px] md:overflow-visible md:border-0 md:bg-painel md:px-3.5 md:py-[22px]">
        <div className="hidden px-2.5 py-0.5 md:block"><Logo escuro tamanho={26} /></div>
        <div className="flex flex-1 md:flex-none md:flex-col md:gap-0.5">
          {abas.map((a) => (
            <button key={a.nome} onClick={() => abrir(a.nome)} aria-current={a.nome === aba ? 'page' : undefined}
              className={`flex min-w-[58px] flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium md:flex-none md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${a.nome === aba ? 'text-tinta md:bg-white/10 md:font-semibold md:text-white' : 'text-suave hover:text-tinta md:text-[#9AA1A8] md:hover:bg-white/[.06] md:hover:text-white'}`}>
              <Icone nome={a.icone} className="h-[22px] w-[22px] md:h-[18px] md:w-[18px]" />
              <span className="md:hidden">{a.curto}</span>
              <span className="hidden flex-1 text-left md:inline">{a.nome}</span>
              {a.nome === 'Lançamentos' && semCategoria > 0 && <span className="hidden rounded-full bg-[#E0A030] px-[7px] py-0.5 text-[10px] font-bold text-white md:inline">{semCategoria}</span>}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-2.5 border-t border-[#2E3236] px-2 pt-3 md:mt-auto md:flex">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#8E2440,#6A4BFF)] text-xs font-bold uppercase text-white">{email.slice(0, 2)}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-[#9AA1A8]" title={email}>{email}</span>
          <button className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#9AA1A8] hover:text-white" onClick={sair}>Sair</button>
        </div>
      </nav>
      <div className={`mx-auto pb-28 md:pb-12 ${aba === 'Início' ? 'max-w-[1272px]' : 'max-w-3xl'}`}>
        <header className="flex items-center justify-between bg-painel px-4 py-3 md:hidden">
          <Logo escuro tamanho={22} />
          <button className="text-sm text-[#9AA1A8]" onClick={sair}>Sair</button>
        </header>
        <main className="space-y-4 p-4 md:px-[clamp(16px,3vw,36px)] md:pt-6">
          <Erro msg={erro} />
          {dados && dados.rejeitadas.length > 0 && <Erro msg={`${dados.rejeitadas.length} registro(s) inválido(s) ignorado(s): ${dados.rejeitadas.join('; ')}`} />}
          {!dados ? (erro ? null : <p className="text-sm text-suave">Carregando...</p>) : (
            <>
              {aba === 'Início' && <Inicio dados={dados} ir={ir} />}
              {aba === 'Lançamentos' && <Lancamentos key={pedido.n} dados={dados} recarregar={recarregar} natureza={pedido.natureza} busca={pedido.busca} filtro={pedido.filtro} />}
              {aba === 'Futuro' && <Futuro dados={dados} mes={mesAtual()} />}
              {aba === 'Cartões' && <Cartoes dados={dados} recarregar={recarregar} />}
              {aba === 'Categorias' && <Categorias dados={dados} recarregar={recarregar} verSemCategoria={() => ir('Lançamentos', { filtro: 'semcat' })} />}
              {aba === 'Metas' && <Metas dados={dados} recarregar={recarregar} />}
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
  if (sessao) return <Logado key={sessao.user.id} email={sessao.user.email ?? ''} />
  return location.pathname === '/entrar' ? <Login /> : <Site />
}
