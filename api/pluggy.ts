declare const process: { env: Record<string, string | undefined> }

// Sem imports: a Vercel não empacota imports relativos sem extensão em pacote "type": "module".
// Todo o planejamento fica no navegador. Aqui só entra o segredo.
const PLUGGY = 'https://api.pluggy.ai'
const json = (corpo: unknown, status = 200) => Response.json(corpo, { status })

type Obj = Record<string, unknown>
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const dia = (v: unknown): string | null => str(v)?.slice(0, 10) ?? null

async function pluggy(caminho: string, apiKey: string): Promise<Obj> {
  const r = await fetch(`${PLUGGY}${caminho}`, { headers: { 'X-API-KEY': apiKey } })
  if (!r.ok) throw new Error('pluggy')
  return (await r.json()) as Obj
}

export async function POST(req: Request): Promise<Response> {
  const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_ITEM_IDS, PLUGGY_USER_ID, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env
  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET || !PLUGGY_ITEM_IDS || !PLUGGY_USER_ID || !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    return json({ erro: 'Sincronização não configurada no servidor.' }, 500)
  }

  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  if (!token) return json({ erro: 'Não autenticado.' }, 401)
  let usuario: Obj | null = null
  try {
    const r = await fetch(`${VITE_SUPABASE_URL}/auth/v1/user`, { headers: { apikey: VITE_SUPABASE_ANON_KEY, authorization: `Bearer ${token}` } })
    if (r.status === 200) usuario = (await r.json()) as Obj
  } catch { /* cai no 401 */ }
  if (!usuario) return json({ erro: 'Não autenticado.' }, 401)
  if (usuario.id !== PLUGGY_USER_ID) return json({ erro: 'Sincronização disponível apenas para o titular.' }, 403)

  let desde: unknown
  try { desde = ((await req.json()) as Obj).desde } catch { /* inválido abaixo */ }
  if (typeof desde !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) return json({ erro: 'Data inicial inválida.' }, 400)

  try {
    const auth = await fetch(`${PLUGGY}/auth`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
    })
    const apiKey = auth.ok ? str(((await auth.json()) as Obj).apiKey) : null
    if (!apiKey) throw new Error('pluggy')

    const contas: Obj[] = []
    const transacoes: Obj[] = []
    for (const item of PLUGGY_ITEM_IDS.split(',').map((s) => s.trim()).filter(Boolean)) {
      const contasItem = ((await pluggy(`/accounts?itemId=${encodeURIComponent(item)}`, apiKey)).results ?? []) as Obj[]
      for (const c of contasItem) {
        const credito = (c.creditData ?? {}) as Obj
        contas.push({
          id: c.id, nome: str(c.marketingName) ?? str(c.name) ?? 'Conta', tipo: c.type === 'CREDIT' ? 'CREDIT' : 'BANK',
          fechamento: dia(credito.balanceCloseDate), vencimento: dia(credito.balanceDueDate),
        })
        let proxima: string | null = `?accountId=${encodeURIComponent(String(c.id))}&dateFrom=${desde}`
        while (proxima) {
          const pagina = await pluggy(`/v2/transactions${proxima}`, apiKey)
          for (const t of (pagina.results ?? []) as Obj[]) {
            const cartao = (t.creditCardMetadata ?? {}) as Obj
            transacoes.push({
              id: t.id, contaId: c.id, descricao: str(t.description) ?? '', valor: num(t.amountInAccountCurrency) ?? num(t.amount) ?? 0,
              tipo: t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT', status: t.status === 'PENDING' ? 'PENDING' : 'POSTED', data: dia(t.date) ?? '',
              categoria: str(t.category), operacao: str(t.operationType),
              parcela: num(cartao.installmentNumber), totalParcelas: num(cartao.totalInstallments),
              dataCompra: dia(cartao.purchaseDate), valorTotal: num(cartao.totalAmount),
            })
          }
          proxima = str(pagina.next)
        }
      }
    }
    return json({ contas, transacoes })
  } catch {
    return json({ erro: 'Falha ao consultar o Meu Pluggy. Tente novamente.' }, 502)
  }
}
