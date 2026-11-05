// Contrato de design. O delegate implementa em src/domain/*.ts e apaga este arquivo.

export type Centavos = number & { readonly __brand: 'Centavos' }
export type MesRef = { ano: number; mes: number } // mes 1..12
export type DataISO = string // 'YYYY-MM-DD', parse na borda

export type Cartao = { id: string; nome: string; diaFechamento: number; diaVencimento: number }
export type Categoria = { id: string; nome: string; cor: string }

// Salário e assinaturas são 'mensal'. Compra parcelada é 'parcelada'. O resto é 'unica'.
export type Recorrencia =
  | { tipo: 'unica'; data: DataISO }
  | { tipo: 'mensal'; inicio: DataISO; fim: DataISO | null }
  | { tipo: 'parcelada'; dataCompra: DataISO; parcelas: number }

export type Lancamento = {
  id: string
  natureza: 'receita' | 'despesa'
  descricao: string
  valor: Centavos // 'parcelada' = valor total da compra; demais = valor de cada ocorrência
  categoriaId: string | null
  cartaoId: string | null // só despesa
  recorrencia: Recorrencia
}

// Uma ocorrência é o lançamento no mês em que o dinheiro sai ou entra.
export type Ocorrencia = {
  lancamentoId: string
  natureza: 'receita' | 'despesa'
  descricao: string // 'Notebook (3/10)' para parcelas
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
  porCartao: Map<string, Centavos> // total de cada fatura que vence no mês
  ocorrencias: Ocorrencia[]
}

// Regras do cartão:
// compra no dia d do mês M fecha em M se d < diaFechamento, senão em M+1.
// a fatura vence no mês do fechamento se diaVencimento > diaFechamento, senão no mês seguinte.
// a parcela i (0-based) cai na fatura base + i meses.
// Sem cartão: 'unica' no mês da data, 'parcelada' no mês da compra + i, 'mensal' em todo mês entre inicio e fim inclusive.
// Divisão de parcela em centavos: o resto vai na primeira parcela, e a soma bate com o total.
export declare function mesDoPagamento(data: DataISO, cartao: Cartao | null, deslocamento: number): MesRef
export declare function ocorrenciasDoMes(lancamentos: Lancamento[], cartoes: Cartao[], mes: MesRef): Ocorrencia[]
export declare function resumirMes(lancamentos: Lancamento[], cartoes: Cartao[], mes: MesRef): ResumoMes
// Parcelas futuras: soma das despesas 'parcelada' nos próximos n meses a partir de mes.
export declare function comprometidoFuturo(lancamentos: Lancamento[], cartoes: Cartao[], de: MesRef, n: number): { mes: MesRef; valor: Centavos }[]
