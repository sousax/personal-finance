// Faixa de alerta do limite de categoria: perto a partir de 80%, acima quando passa
export type StatusLimite = 'acima' | 'perto' | 'ok' | 'sem'

export function statusLimite(gasto: number, limite: number | null | undefined): StatusLimite {
  if (!limite || limite <= 0) return 'sem'
  if (gasto > limite) return 'acima'
  return gasto >= limite * 0.8 ? 'perto' : 'ok'
}

// Variação percentual inteira; null quando não há base de comparação
export const variacao = (atual: number, anterior: number): number | null =>
  anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null
