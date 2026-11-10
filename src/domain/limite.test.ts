import { describe, expect, it } from 'vitest'
import { statusLimite, variacao } from './index'

describe('statusLimite', () => {
  it('sem limite, ok, perto a partir de 80% e acima só quando passa', () => {
    expect([statusLimite(500, null), statusLimite(500, 0), statusLimite(799, 1000), statusLimite(800, 1000), statusLimite(1000, 1000), statusLimite(1001, 1000)])
      .toEqual(['sem', 'sem', 'ok', 'perto', 'perto', 'acima'])
  })
  it('variação sem base é null', () => {
    expect([variacao(110, 100), variacao(88, 100), variacao(50, 0)]).toEqual([10, -12, null])
  })
})
