import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { formatarBRL } from './domain'
import type { Centavos } from './domain'

export const Dinheiro = ({ v, className = '' }: { v: Centavos; className?: string }) => (
  <span className={`whitespace-nowrap text-right tabular-nums ${className}`}>{formatarBRL(v)}</span>
)

export const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-suave">{rotulo}</span>
    {children}
  </label>
)

export const Erro = ({ msg }: { msg: string | null }) =>
  msg ? <p role="alert" className="rounded-xl border border-perigo/30 bg-perigo/5 p-3 text-sm text-perigo-texto">{msg}</p> : null

// Marca OwnFin: degraus monocromáticos, só o do topo com degradê vinho → violeta
export function Logo({ escuro = false, tamanho = 26 }: { escuro?: boolean; tamanho?: number }) {
  const id = useId()
  const barra = escuro ? '#fff' : '#191C1F'
  const [de, ate] = escuro ? ['#B02A45', '#8A70FF'] : ['#6B1A2B', '#6A4BFF']
  return (
    <span className={`flex items-center gap-2.5 font-titulo font-semibold tracking-[-0.035em] ${escuro ? 'text-white' : 'text-tinta'}`} style={{ fontSize: tamanho * 0.75 }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 56 56" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={de} /><stop offset="1" stopColor={ate} /></linearGradient></defs>
        <rect x="6" y="34" width="12" height="16" rx="6" fill={barra} />
        <rect x="22" y="22" width="12" height="28" rx="6" fill={barra} />
        <rect x="38" y="8" width="12" height="42" rx="6" fill={`url(#${id})`} />
      </svg>
      OwnFin
    </span>
  )
}

export function mensagemErro(e: unknown): string {
  const m = (e as Error).message ?? String(e)
  // api.ts descarta o code do Postgres; 23503 (violação de FK) só chega aqui como texto
  if (/23503|foreign key constraint/i.test(m)) {
    return 'Não é possível excluir: existem lançamentos vinculados. Exclua ou altere esses lançamentos antes.'
  }
  return m
}

export function useAcao(recarregar: () => Promise<void>) {
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  async function rodar(fn: () => Promise<unknown>) {
    setErro(null); setOcupado(true)
    try { await fn(); await recarregar() } catch (e) { setErro(mensagemErro(e)) } finally { setOcupado(false) }
  }
  return { erro, ocupado, rodar }
}

const caminhos = {
  mes: 'M3 10h18M7 3v4m10-4v4M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  lancamentos: 'M4 6h16M4 12h16M4 18h10',
  futuro: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  cartoes: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18M7 15h3',
  categorias: 'M20 12.5 12.5 20a2 2 0 0 1-2.8 0L3 13.3V4h9.3l7.7 7.7a1 1 0 0 1 0 .8ZM7.5 8.5h.01',
  visao: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  cima: 'M12 19V5m0 0-6 6m6-6 6 6',
  baixo: 'M12 5v14m0 0-6-6m6 6 6-6',
}

export const Icone = ({ nome, className = 'h-5 w-5' }: { nome: keyof typeof caminhos; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={caminhos[nome]} />
  </svg>
)
