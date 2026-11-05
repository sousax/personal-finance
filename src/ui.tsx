import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatarBRL } from './domain'
import type { Centavos } from './domain'

export const Dinheiro = ({ v, className = '' }: { v: Centavos; className?: string }) => (
  <span className={`whitespace-nowrap text-right tabular-nums ${className}`}>{formatarBRL(v)}</span>
)

export const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-sm text-slate-400">{rotulo}</span>
    {children}
  </label>
)

export const Erro = ({ msg }: { msg: string | null }) =>
  msg ? <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{msg}</p> : null

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
  cima: 'M12 19V5m0 0-6 6m6-6 6 6',
  baixo: 'M12 5v14m0 0-6-6m6 6 6-6',
}

export const Icone = ({ nome, className = 'h-5 w-5' }: { nome: keyof typeof caminhos; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={caminhos[nome]} />
  </svg>
)
