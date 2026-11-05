import type { ReactNode } from 'react'
import { formatarBRL } from './domain'
import type { Centavos } from './domain'

export const Dinheiro = ({ v, className = '' }: { v: Centavos; className?: string }) => (
  <span className={`tabular-nums ${className}`}>{formatarBRL(v)}</span>
)

export const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-sm text-slate-600">{rotulo}</span>
    {children}
  </label>
)

export const Erro = ({ msg }: { msg: string | null }) =>
  msg ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</p> : null
