import type { DataISO, Lancamento } from './tipos'
import { chaveDescricao } from './visaoGeral'

const dataDe = (l: Lancamento): DataISO => {
  const r = l.recorrencia
  return r.tipo === 'unica' ? r.data : r.tipo === 'mensal' ? r.inicio : r.dataCompra
}

const mesmoNome = (natureza: Lancamento['natureza'], chave: string) => (l: Lancamento) =>
  l.natureza === natureza && chaveDescricao(l.descricao) === chave

// Categoria do lançamento mais recente com o mesmo nome e natureza; null se nenhum foi categorizado
export function categoriaAprendida(lancamentos: Lancamento[], natureza: Lancamento['natureza'], descricao: string): string | null {
  const chave = chaveDescricao(descricao)
  if (!chave) return null
  let melhor: Lancamento | null = null
  for (const l of lancamentos.filter(mesmoNome(natureza, chave))) {
    if (l.categoriaId && (!melhor || dataDe(l) > dataDe(melhor))) melhor = l
  }
  return melhor?.categoriaId ?? null
}

// Outros lançamentos ainda sem categoria com o mesmo nome e natureza de `base`
export function mesmoNomeSemCategoria(lancamentos: Lancamento[], base: Lancamento): Lancamento[] {
  const chave = chaveDescricao(base.descricao)
  if (!chave) return []
  return lancamentos.filter((l) => l.id !== base.id && !l.categoriaId && mesmoNome(base.natureza, chave)(l))
}
