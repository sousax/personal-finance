import { useState } from 'react'
import { Logo } from './ui'

const GR = 'linear-gradient(180deg,#6A4BFF,#8E2440)'
const BRILHO = 'radial-gradient(130% 150% at 100% 0%,#4B37C8 0%,#3A1530 48%,#191C1F 82%)'
const CARTAO = 'radial-gradient(120% 140% at 100% 0%,#4B37C8 0%,#3A1530 50%,#0E1013 100%)'

const barras = [22, 38, 14, 60, 30, 18, 72, 26, 44, 20, 34, 52, 16, 28, 40, 24, 64, 30, 18, 46]
const linhas = [
  { ini: 'S', desc: 'Salário', meta: '05 nov · Receita', v: '+ R$ 7.200,00', vc: '#1F8F4E', cor: '#1F8F4E', mut: '#E3F5EA' },
  { ini: 'M', desc: 'Mercado', meta: '14 nov · Cartão •4821', v: '− R$ 298,30', vc: '#191C1F', cor: '#6B1A2B', mut: '#F7E8EC' },
  { ini: 'C', desc: 'Notebook', meta: 'Parcela 3/10', v: '− R$ 450,00', vc: '#191C1F', cor: '#6E5A3C', mut: '#F5F0E8' },
]
const recursos = [
  { titulo: 'Visão do mês', texto: 'Receitas, despesas e saldo do mês, com um calendário que mostra os dias de mais gasto.', fundo: '#fff', arte: [['40%', '#191C1F'], ['70%', '#191C1F'], ['100%', GR]] },
  { titulo: 'Parcelas futuras', texto: 'Cada parcela no mês certo. Você sabe quanto falta e quando termina.', fundo: '#fff', arte: [['100%', GR], ['80%', GR], ['60%', GR], ['40%', '#E6E1FF'], ['20%', '#E6E1FF']] },
  { titulo: 'Cartões e faturas', texto: 'Fatura atual, uso do limite, fechamento e vencimento de cada cartão.', fundo: BRILHO, arte: [['30%', 'rgba(255,255,255,.9)'], ['30%', 'rgba(255,255,255,.9)'], ['30%', 'rgba(255,255,255,.35)'], ['30%', 'rgba(255,255,255,.35)']] },
  { titulo: 'Categorias', texto: 'Para onde vai o dinheiro, em barras simples, comparando com o mês anterior.', fundo: '#fff', arte: [['90%', '#6A4BFF'], ['55%', '#8E2440'], ['40%', '#A63D8F'], ['30%', '#3F51C7'], ['18%', '#A0865E']] },
]
const futuro = [['Dez', 22], ['Jan', 18], ['Fev', 14], ['Mar', 9], ['Abr', 6], ['Mai', 0]] as const
const passos = [
  { titulo: 'Crie sua conta', texto: 'Só e-mail e senha. Em seguida você cadastra seus cartões com fechamento e vencimento.', bg: '#191C1F' },
  { titulo: 'Lance o que entra e sai', texto: 'Salário, contas fixas e compras. Parcelado? Informe o número de parcelas e pronto.', bg: '#191C1F' },
  { titulo: 'Veja o que é seu', texto: 'O OwnFin mostra quanto sobra este mês e nos próximos, sempre em destaque.', bg: 'linear-gradient(135deg,#8E2440,#6A4BFF)' },
]
const duvidas = [
  ['O OwnFin acessa minha conta do banco?', 'Não. Você lança receitas, despesas e compras no cartão no próprio app. A gente não pede senha de banco e não movimenta dinheiro.'],
  ['Como funcionam as parcelas?', 'Ao lançar uma compra parcelada, cada parcela já aparece no mês certo. Você vê quanto falta e quando termina, sem precisar lembrar.'],
  ['Posso usar com mais de um cartão?', 'Sim. No plano Grátis você cadastra até 2 cartões, e no Pro não há limite. Cada cartão mostra a fatura, o fechamento e o vencimento.'],
  ['Meus dados ficam seguros?', 'A conexão é criptografada e seus dados não são vendidos nem compartilhados. Você pode exportar ou apagar tudo quando quiser.'],
  ['Posso cancelar o Pro a qualquer momento?', 'Pode. Você volta para o Grátis e continua com seu histórico.'],
]

// marca sem o nome; o gradiente #ofG é definido uma vez no topo da página
function Marca({ tamanho, barra = '#fff' }: { tamanho: number; barra?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 56 56" aria-hidden="true" className="h-auto max-w-full">
      <rect x="6" y="34" width="12" height="16" rx="6" fill={barra} />
      <rect x="22" y="22" width="12" height="28" rx="6" fill={barra} />
      <rect x="38" y="8" width="12" height="42" rx="6" fill="url(#ofG)" />
    </svg>
  )
}

const wrap = 'mx-auto box-border max-w-[1180px] px-[clamp(16px,4vw,40px)]'
const h = 'm-0 font-titulo font-semibold tracking-[-0.04em]'
const secao = 'py-[clamp(64px,9vw,112px)]'
const rotulo = 'text-sm font-semibold text-violeta-forte'
const h2 = `${h} text-balance text-[clamp(32px,4.2vw,52px)] leading-[1.04]`
const pill = 'rounded-full font-semibold transition active:scale-[.985]'

export function Site() {
  const [anual, setAnual] = useState(false)

  return (
    <div className="tema-claro bg-white text-tinta">
      <svg width="0" height="0" className="absolute" aria-hidden="true"><defs><linearGradient id="ofG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#B02A45" /><stop offset="1" stopColor="#8A70FF" /></linearGradient></defs></svg>

      <section className="overflow-hidden text-white" style={{ background: 'radial-gradient(55% 60% at 100% 0%,#4B37C8 0%,rgba(75,55,200,0) 70%),radial-gradient(50% 55% at 0% 100%,#6B1A2B 0%,rgba(107,26,43,0) 70%),#0E1013' }}>
        <header className={`${wrap} flex flex-wrap items-center justify-between gap-5 py-[22px]`}>
          <a href="/" aria-label="OwnFin"><Logo escuro tamanho={28} /></a>
          <nav className="flex flex-wrap gap-7 text-[15px] text-white/70">
            {[['recursos', 'Recursos'], ['como', 'Como funciona'], ['planos', 'Planos'], ['duvidas', 'Dúvidas']].map(([id, t]) => <a key={id} href={`#${id}`} className="hover:text-white">{t}</a>)}
          </nav>
          <div className="flex items-center gap-2 text-[15px]">
            <a href="/entrar" className={`${pill} px-4 py-2.5`}>Entrar</a>
            <a href="/entrar?cadastro" className={`${pill} bg-white px-[18px] py-2.5 text-tinta`}>Criar conta</a>
          </div>
        </header>

        <div className={`${wrap} flex flex-wrap items-center gap-14 pb-[clamp(64px,9vw,120px)] pt-[clamp(40px,7vw,88px)]`}>
          <div className="flex flex-[1_1_440px] flex-col gap-[22px]">
            <span className="flex items-center gap-2 self-start rounded-full border border-white/[.14] bg-white/[.08] py-[7px] pl-2 pr-3 text-[13px]">
              <span className="rounded-full bg-grad px-2 py-[3px] text-[11px] font-bold">Novo</span>Previsão dos próximos 6 meses
            </span>
            <h1 className={`${h} text-balance text-[clamp(44px,6.4vw,80px)] leading-[.98] !tracking-[-0.05em]`}>O que é seu, sempre no topo.</h1>
            <p className="m-0 max-w-[520px] text-pretty text-[clamp(16px,1.6vw,19px)] leading-normal text-white/70">O OwnFin junta receitas, despesas, cartões e parcelas num lugar só e mostra quanto sobra este mês e nos próximos. Sem planilha, sem susto na fatura.</p>
            <div className="flex flex-wrap gap-2.5 pt-1.5 text-base">
              <a href="/entrar?cadastro" className={`${pill} bg-white px-6 py-[15px] text-tinta`}>Criar conta grátis</a>
              <a href="#como" className={`${pill} border border-white/[.16] bg-white/[.08] px-6 py-[15px]`}>Ver como funciona</a>
            </div>
            <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-white/55"><span>✓ Grátis para começar</span><span>✓ Sem cartão de crédito</span><span>✓ Dados criptografados</span></div>
          </div>

          <div aria-hidden="true" className="relative flex min-h-[440px] flex-[1_1_460px] items-center justify-center">
            <div className="box-border flex w-[min(500px,100%)] flex-col gap-3.5 rounded-[22px] bg-white p-[18px] text-tinta shadow-[0_50px_100px_-30px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.08)]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col"><span className="text-[11px] text-[#8D969E]">Visão do mês</span><span className={`${h} text-lg`}>Novembro 2026</span></div>
                <span className="rounded-full bg-fundo px-2.5 py-[5px] text-[11px] font-semibold">Mês atual</span>
              </div>
              <div className="flex items-end justify-between gap-3 rounded-2xl px-[18px] py-4 text-white" style={{ background: BRILHO }}>
                <div className="flex flex-col gap-0.5"><span className="text-[11px] text-white/70">Sobra prevista</span><span className={`${h} text-[30px] tabular-nums`}>R$ 2.842,00</span><span className="text-[11px] text-white/70">34% da receita guardada</span></div>
                <Marca tamanho={40} barra="rgba(255,255,255,.35)" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold">Gastos por dia</span>
                <div className="flex h-[84px] items-end gap-1">
                  {barras.map((b, i) => <div key={i} className="flex-1 rounded-t-[3px] rounded-b-[1px]" style={{ height: `${b}%`, background: i < 10 ? GR : '#E6E1FF' }} />)}
                </div>
              </div>
              <div className="flex flex-col">
                {linhas.map((r) => (
                  <div key={r.desc} className="flex items-center gap-2.5 border-t border-[#F0F1F2] py-2 text-[13px]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: r.mut, color: r.cor }}>{r.ini}</span>
                    <span className="flex flex-1 flex-col"><span className="font-semibold">{r.desc}</span><span className="text-[11px] text-[#8D969E]">{r.meta}</span></span>
                    <span className="font-semibold tabular-nums" style={{ color: r.vc }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-1.5 -left-2.5 box-border flex h-36 w-[230px] -rotate-[7deg] flex-col justify-between rounded-2xl border border-white/[.14] p-4 shadow-[0_30px_60px_-20px_rgba(106,75,255,.6)] motion-safe:animate-[flutuar_6s_ease-in-out_infinite]" style={{ background: CARTAO }}>
              <div className="flex items-center justify-between"><Marca tamanho={22} /><span className="h-5 w-7 rounded bg-gradient-to-br from-[#e6e6e6] to-[#9a9a9a]" /></div>
              <div className="flex items-end justify-between"><span className="font-titulo text-sm font-semibold tracking-[-0.02em]">OwnFin</span><span className="text-[10px] tracking-[.08em] text-white/60">•••• 4821</span></div>
            </div>
            <div className="absolute -right-1.5 top-6 flex items-center gap-2.5 rounded-[14px] border border-white/[.18] bg-white/[.12] px-3.5 py-2.5 shadow-[0_20px_40px_-16px_rgba(0,0,0,.6)] backdrop-blur-[14px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] text-[13px]" style={{ background: 'linear-gradient(135deg,#8E2440,#6A4BFF)' }}>!</span>
              <span className="flex flex-col gap-px"><span className="text-[11px] text-white/70">Fatura do cartão</span><span className="text-[13px] font-semibold">fecha em 3 dias</span></span>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className={secao}>
        <div className={`${wrap} flex flex-col gap-11`}>
          <div className="flex max-w-[640px] flex-col gap-3.5">
            <span className={rotulo}>Recursos</span>
            <h2 className={h2}>Tudo do seu mês numa tela só.</h2>
            <p className="m-0 text-pretty text-[17px] leading-[1.55] text-suave">Você lança uma vez e o OwnFin organiza: o que já saiu, o que ainda vai sair e o que sobra.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
            {recursos.map((f) => (
              <div key={f.titulo} className="flex min-h-[260px] flex-col gap-3.5 rounded-[22px] bg-fundo p-[26px]">
                <div aria-hidden="true" className="flex h-24 items-end justify-center gap-1.5 rounded-2xl p-4" style={{ background: f.fundo }}>
                  {f.arte.map(([altura, bg], i) => <div key={i} className="max-w-[26px] flex-1 rounded-md" style={{ height: altura, background: bg }} />)}
                </div>
                <h3 className={`${h} text-[21px] !tracking-[-0.03em]`}>{f.titulo}</h3>
                <p className="m-0 text-pretty text-[15px] leading-normal text-suave">{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-[clamp(64px,9vw,112px)]">
        <div className={wrap}>
          <div className="flex flex-wrap items-center gap-12 rounded-[28px] bg-fundo p-[clamp(28px,5vw,64px)]">
            <div className="flex flex-[1_1_360px] flex-col gap-[18px]">
              <span className={rotulo}>Futuro</span>
              <h2 className={`${h} text-balance text-[clamp(30px,3.8vw,46px)] leading-[1.05]`}>Veja o mês que vem antes dele chegar.</h2>
              <p className="m-0 text-pretty text-[17px] leading-[1.55] text-suave">Contas fixas e parcelas já entram nos próximos meses. Você sabe hoje quanto vai estar comprometido em março.</p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 pt-1.5 text-[15px]">
                {[['#191C1F', 'Contas fixas, como aluguel e assinaturas'], [GR, 'Parcelas do cartão até a última'], ['#DDD8FF', 'O que fica livre para você']].map(([bg, t]) => (
                  <li key={t} className="flex items-center gap-3"><span className="h-3 w-3 rounded" style={{ background: bg }} />{t}</li>
                ))}
              </ul>
            </div>
            <div className="box-border flex flex-[1_1_420px] flex-col gap-4 rounded-[22px] bg-white p-6 shadow-[0_30px_60px_-36px_rgba(25,28,31,.4)]">
              <div className="flex items-baseline justify-between"><span className={`${h} text-[17px] !tracking-[-0.02em]`}>Comprometido por mês</span><span className="text-[13px] text-[#8D969E]">próximos 6 meses</span></div>
              <div className="grid grid-cols-6 gap-3">
                {futuro.map(([mes, parc]) => {
                  const livre = 58 - parc
                  return (
                    <div key={mes} className="flex flex-col gap-2">
                      <div className="flex h-[190px] flex-col justify-end overflow-hidden rounded-[10px] bg-fundo">
                        <div className="flex justify-center pt-1.5 text-[11px] font-bold text-[#4A33C2]" style={{ height: `${livre}%`, background: '#DDD8FF' }}>{livre}%</div>
                        <div style={{ height: `${parc}%`, background: GR }} />
                        <div className="bg-tinta" style={{ height: '42%' }} />
                      </div>
                      <span className="text-center text-[13px] font-semibold">{mes}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${secao} text-white`} style={{ background: 'radial-gradient(60% 80% at 100% 50%,#4B37C8 0%,rgba(75,55,200,0) 70%),#0E1013' }}>
        <div className={`${wrap} flex flex-wrap items-center gap-14`}>
          <div className="flex flex-[1_1_300px] justify-center"><Marca tamanho={260} barra="rgba(255,255,255,.9)" /></div>
          <div className="flex flex-[1_1_440px] flex-col gap-5">
            <h2 className={h2}>O topo é seu.</h2>
            <p className="m-0 max-w-[520px] text-pretty text-[17px] leading-[1.55] text-white/70">Nosso símbolo conta o que o app faz: três degraus que sobem até o que sobra no fim do mês. É esse número que a gente coloca sempre em destaque.</p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[['Degrau 1', 'O que entra'], ['Degrau 2', 'O que sai']].map(([d, t]) => (
                <div key={d} className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="text-xs text-white/55">{d}</div><div className="pt-1 text-base font-semibold">{t}</div></div>
              ))}
              <div className="rounded-2xl border border-white/[.18] p-4" style={{ background: 'linear-gradient(160deg,rgba(142,36,64,.55),rgba(106,75,255,.55))' }}><div className="text-xs text-white/75">Topo</div><div className="pt-1 text-base font-semibold">O que é seu</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="como" className={secao}>
        <div className={`${wrap} flex flex-col gap-11`}>
          <div className="flex max-w-[640px] flex-col gap-3.5">
            <span className={rotulo}>Como funciona</span>
            <h2 className={h2}>Três passos e seu mês está pronto.</h2>
          </div>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
            {passos.map((p, i) => (
              <li key={p.titulo} className="flex flex-col gap-3.5 rounded-[22px] border border-linha p-[26px]">
                <span className="flex h-11 w-11 items-center justify-center rounded-[14px] font-titulo text-lg font-semibold text-white" style={{ background: p.bg }}>{i + 1}</span>
                <h3 className={`${h} text-[21px] !tracking-[-0.03em]`}>{p.titulo}</h3>
                <p className="m-0 text-pretty text-[15px] leading-normal text-suave">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planos" className={`${secao} bg-fundo`}>
        <div className={`${wrap} flex flex-col items-center gap-9`}>
          <div className="flex max-w-[640px] flex-col items-center gap-3.5 text-center">
            <span className={rotulo}>Planos</span>
            <h2 className={h2}>Comece grátis. Mude quando quiser.</h2>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full border border-linha bg-white p-1">
            {[[false, 'Mensal'], [true, 'Anual · 2 meses grátis']].map(([v, t]) => (
              <button key={String(v)} onClick={() => setAnual(v as boolean)} aria-pressed={anual === v} className={`${pill} h-[38px] px-5 text-sm ${anual === v ? 'bg-tinta text-white' : 'text-suave'}`}>{t}</button>
            ))}
          </div>
          <div className="grid w-full max-w-[820px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            <div className="flex flex-col gap-5 rounded-3xl border border-linha bg-white p-[30px]">
              <div className="flex flex-col gap-1.5"><span className="text-[17px] font-semibold">Grátis</span><span className="text-sm text-suave">Para organizar o mês</span></div>
              <div className="flex items-baseline gap-1.5"><span className={`${h} text-[44px]`}>R$ 0</span><span className="text-sm text-suave">para sempre</span></div>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]"><li>✓ Visão do mês e calendário</li><li>✓ Até 2 cartões</li><li>✓ Categorias ilimitadas</li><li className="text-[#8D969E]">— Previsão de 6 meses</li></ul>
              <a href="/entrar?cadastro" className={`${pill} mt-auto border border-tinta p-3.5 text-center text-[15px]`}>Começar grátis</a>
            </div>
            <div className="flex flex-col gap-5 rounded-3xl p-[30px] text-white shadow-[0_40px_80px_-36px_rgba(106,75,255,.7)]" style={{ background: 'radial-gradient(130% 120% at 100% 0%,#4B37C8 0%,#3A1530 48%,#191C1F 82%)' }}>
              <div className="flex items-start justify-between gap-2.5"><div className="flex flex-col gap-1.5"><span className="text-[17px] font-semibold">OwnFin Pro</span><span className="text-sm text-white/70">Para enxergar o futuro</span></div><span className="rounded-full bg-white/[.14] px-2.5 py-[5px] text-xs font-bold">Mais escolhido</span></div>
              <div className="flex items-baseline gap-1.5"><span className={`${h} text-[44px]`}>{anual ? 'R$ 129' : 'R$ 12,90'}</span><span className="text-sm text-white/70">{anual ? 'por ano' : 'por mês'}</span></div>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]"><li>✓ Tudo do Grátis</li><li>✓ Cartões ilimitados</li><li>✓ Previsão de 6 meses</li><li>✓ Metas e alertas de fatura</li></ul>
              <a href="/entrar?cadastro" className={`${pill} mt-auto bg-white p-3.5 text-center text-[15px] text-tinta`}>Assinar o Pro</a>
            </div>
          </div>
        </div>
      </section>

      <section id="duvidas" className={secao}>
        <div className={`${wrap} flex flex-wrap gap-10`}>
          <div className="flex flex-[1_1_280px] flex-col gap-3.5">
            <span className={rotulo}>Dúvidas</span>
            <h2 className={`${h} text-[clamp(32px,4.2vw,46px)] leading-[1.05]`}>Perguntas frequentes</h2>
          </div>
          <div className="flex min-w-0 flex-[2_1_520px] flex-col">
            {duvidas.map(([p, r], i) => (
              <details key={p} name="duvidas" open={i === 0} className="group border-t border-linha">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-3 py-5 text-[17px] font-semibold hover:bg-[#F7F7F8] [&::-webkit-details-marker]:hidden">
                  {p}
                  <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-fundo text-lg font-normal group-open:bg-tinta group-open:text-white">
                    <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className="m-0 max-w-[620px] text-pretty px-3 pb-[22px] text-[15px] leading-relaxed text-suave">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-white" style={{ background: 'radial-gradient(55% 80% at 50% 0%,#4B37C8 0%,rgba(75,55,200,0) 70%),radial-gradient(40% 60% at 0% 100%,#6B1A2B 0%,rgba(107,26,43,0) 70%),#0E1013' }}>
        <div className={`${wrap} flex flex-col items-center gap-[22px] pb-[clamp(64px,8vw,96px)] pt-[clamp(72px,10vw,128px)] text-center`}>
          <Marca tamanho={64} />
          <h2 className={`${h} max-w-[760px] text-balance text-[clamp(36px,5vw,64px)] leading-none`}>Comece {new Date().toLocaleDateString('pt-BR', { month: 'long' })} sabendo quanto sobra.</h2>
          <p className="m-0 text-[17px] text-white/70">Leva menos de 2 minutos para criar sua conta.</p>
          <a href="/entrar?cadastro" className={`${pill} bg-white px-7 py-4 text-base text-tinta`}>Criar conta grátis</a>
        </div>
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pb-8 pt-[26px] text-sm text-white/55`}>
          <div className="flex items-center gap-2.5"><Logo escuro tamanho={22} /><span className="pl-2 text-[13px] text-white/45">© {new Date().getFullYear()}</span></div>
          <nav className="flex flex-wrap gap-[22px]"><a href="#recursos" className="hover:text-white">Recursos</a><a href="#planos" className="hover:text-white">Planos</a><a href="#duvidas" className="hover:text-white">Dúvidas</a></nav>
        </div>
      </footer>
    </div>
  )
}
