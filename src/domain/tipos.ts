export type Centavos = number & { readonly __brand: 'Centavos' }
export type MesRef = { ano: number; mes: number }
export type DataISO = string

export type Cartao = { id: string; nome: string; diaFechamento: number; diaVencimento: number }
export type Categoria = { id: string; nome: string; cor: string }

export type Recorrencia =
  | { tipo: 'unica'; data: DataISO }
  | { tipo: 'mensal'; inicio: DataISO; fim: DataISO | null }
  | { tipo: 'parcelada'; dataCompra: DataISO; parcelas: number }

export type Lancamento = {
  id: string
  natureza: 'receita' | 'despesa'
  descricao: string
  valor: Centavos
  categoriaId: string | null
  cartaoId: string | null
  recorrencia: Recorrencia
}

export type Ocorrencia = {
  lancamentoId: string
  natureza: 'receita' | 'despesa'
  descricao: string
  valor: Centavos
  categoriaId: string | null
  cartaoId: string | null
  mes: MesRef
}

export type ResumoMes = {
  mes: MesRef
  receitas: Centavos
  despesas: Centavos
  saldo: Centavos
  porCategoria: Map<string | null, Centavos>
  porCartao: Map<string, Centavos>
  ocorrencias: Ocorrencia[]
}
