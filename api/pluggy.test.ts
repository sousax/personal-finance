import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './pluggy'

const env = {
  PLUGGY_CLIENT_ID: 'cid', PLUGGY_CLIENT_SECRET: 'segredo-super', PLUGGY_ITEM_IDS: 'item1', PLUGGY_USER_ID: 'dono',
  VITE_SUPABASE_URL: 'https://sb.test', VITE_SUPABASE_ANON_KEY: 'anon',
}
const pedido = (corpo: unknown = { desde: '2026-11-01' }, auth: string | null = 'Bearer tok') =>
  new Request('https://app.test/api/pluggy', { method: 'POST', headers: auth ? { authorization: auth } : {}, body: JSON.stringify(corpo) })
const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 })

function stub(usuario: string | null) {
  const chamadas: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init })
    if (url.endsWith('/auth/v1/user')) return usuario ? ok({ id: usuario }) : new Response('{}', { status: 401 })
    if (url.endsWith('/auth')) return ok({ apiKey: 'chave-api-secreta' })
    if (url.includes('/accounts')) return ok({ results: [
      { id: 'a1', type: 'CREDIT', name: 'Cartão', marketingName: 'Nubank', creditData: { balanceCloseDate: '2026-11-05T00:00:00.000Z', balanceDueDate: '2026-11-12T00:00:00.000Z' } },
      { id: 'a2', type: 'BANK', name: 'Conta corrente' },
    ] })
    if (url.includes('accountId=a1') && !url.includes('page=2')) return ok({ results: [{
      id: 't1', description: 'Loja', amount: 100, amountInAccountCurrency: 90, type: 'DEBIT', status: 'POSTED', date: '2026-11-03T00:00:00.000Z',
      category: 'Shopping', creditCardMetadata: { installmentNumber: 2, totalInstallments: 10, purchaseDate: '2026-10-03T00:00:00.000Z', totalAmount: 900 },
    }], next: '?accountId=a1&dateFrom=2026-11-01&page=2' })
    if (url.includes('accountId=a1')) return ok({ results: [{ id: 't2', description: 'Café', amount: 5, type: 'DEBIT', status: 'PENDING', date: '2026-11-04' }], next: null })
    return ok({ results: [{ id: 't3', description: 'Pix', amount: 50, type: 'CREDIT', status: 'POSTED', date: '2026-11-02', operationType: 'PIX' }], next: null })
  }))
  return chamadas
}

beforeEach(() => { for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('POST /api/pluggy', () => {
  it('401 sem token e quando o Supabase recusa', async () => {
    stub('dono')
    expect((await POST(pedido(undefined, null))).status).toBe(401)
    stub(null)
    expect((await POST(pedido())).status).toBe(401)
  })

  it('403 para outro usuário, sem chamar o Pluggy', async () => {
    const chamadas = stub('outro')
    expect((await POST(pedido())).status).toBe(403)
    expect(chamadas.some((c) => c.url.includes('pluggy.ai'))).toBe(false)
  })

  it('500 sem configuração, sem vazar valores', async () => {
    vi.stubEnv('PLUGGY_CLIENT_SECRET', '')
    stub('dono')
    const r = await POST(pedido())
    expect(r.status).toBe(500)
    expect(await r.text()).not.toContain('cid')
  })

  it('400 para data inválida', async () => {
    stub('dono')
    expect((await POST(pedido({ desde: '01/11/2026' }))).status).toBe(400)
  })

  it('segue next, mapeia os campos e não devolve segredos', async () => {
    const chamadas = stub('dono')
    const r = await POST(pedido())
    const texto = await r.text()
    const corpo = JSON.parse(texto)
    expect(r.status).toBe(200)
    expect(corpo.contas).toEqual([
      { id: 'a1', nome: 'Nubank', tipo: 'CREDIT', fechamento: '2026-11-05', vencimento: '2026-11-12' },
      { id: 'a2', nome: 'Conta corrente', tipo: 'BANK', fechamento: null, vencimento: null },
    ])
    expect(corpo.transacoes).toHaveLength(3)
    expect(corpo.transacoes[0]).toEqual({
      id: 't1', contaId: 'a1', descricao: 'Loja', valor: 90, tipo: 'DEBIT', status: 'POSTED', data: '2026-11-03', categoria: 'Shopping', operacao: null,
      parcela: 2, totalParcelas: 10, dataCompra: '2026-10-03', valorTotal: 900,
    })
    expect(corpo.transacoes[1]).toMatchObject({ id: 't2', status: 'PENDING', data: '2026-11-04', valor: 5 })
    expect(corpo.transacoes[2]).toMatchObject({ id: 't3', contaId: 'a2', tipo: 'CREDIT', operacao: 'PIX' })
    expect(chamadas.filter((c) => c.url.includes('/v2/transactions'))).toHaveLength(3)
    expect(chamadas.some((c) => c.url.includes('page=2'))).toBe(true)
    expect(texto).not.toContain('segredo-super')
    expect(texto).not.toContain('chave-api-secreta')
  })

  it('502 genérico quando o Pluggy falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/auth/v1/user') ? ok({ id: 'dono' }) : new Response('segredo-super', { status: 500 }))))
    const r = await POST(pedido())
    expect(r.status).toBe(502)
    expect(await r.text()).not.toContain('segredo-super')
  })
})
