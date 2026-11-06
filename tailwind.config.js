// Cores por canal RGB em index.css, para o tema trocar e os modificadores de opacidade (bg-perigo/5) continuarem valendo
const tk = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree', 'system-ui', 'sans-serif'], titulo: ['Poppins', 'Figtree', 'system-ui', 'sans-serif'] },
      colors: {
        fundo: tk('fundo'), superficie: tk('superficie'), elevado: tk('elevado'), ativo: tk('ativo'), leve: tk('leve'), linha: tk('linha'),
        tinta: tk('tinta'), suave: tk('suave'), grafite: tk('grafite'), acento: tk('acento'),
        // Superfícies que ficam escuras nos dois temas (menu lateral, cabeçalho mobile)
        painel: { DEFAULT: '#191C1F', alto: '#2B2F33' },
        vinho: '#8E2440', violeta: { DEFAULT: tk('violeta'), forte: tk('violeta-forte') },
        ok: { DEFAULT: tk('ok'), texto: tk('ok-texto'), claro: '#BCE3C9' },
        perigo: { DEFAULT: tk('perigo'), texto: tk('perigo-texto'), claro: '#FFC4C5' },
      },
      backgroundImage: {
        grad: 'linear-gradient(90deg,#8E2440 0%,#6A4BFF 100%)',
        brilho: 'radial-gradient(130% 150% at 100% 0%,#4B37C8 0%,#3A1530 48%,#191C1F 82%)',
      },
    },
  },
  plugins: [],
}
