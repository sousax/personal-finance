import { createClient } from '@supabase/supabase-js'

// "Manter conectado" desmarcado guarda a sessão só nesta aba (sessionStorage)
const LEMBRAR = 'ownfin-lembrar'
const armazenamento = () => (localStorage.getItem(LEMBRAR) === '0' ? sessionStorage : localStorage)
export const lembrarSessao = (sim: boolean) => localStorage.setItem(LEMBRAR, sim ? '1' : '0')

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing',
  {
    auth: {
      storage: {
        getItem: (k) => armazenamento().getItem(k),
        setItem: (k, v) => armazenamento().setItem(k, v),
        removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) },
      },
    },
  },
)
