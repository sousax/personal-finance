export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree', 'system-ui', 'sans-serif'], titulo: ['Poppins', 'Figtree', 'system-ui', 'sans-serif'] },
      colors: {
        fundo: '#F4F4F6', superficie: '#FFFFFF', elevado: '#F4F4F6', linha: '#E6E7EA',
        tinta: '#191C1F', suave: '#5F676E', grafite: '#2B2F33',
        vinho: '#8E2440', violeta: { DEFAULT: '#6A4BFF', forte: '#5B3FE6' },
        ok: { DEFAULT: '#00854D', texto: '#00602D', claro: '#BCE3C9' },
        perigo: { DEFAULT: '#D83A52', texto: '#900D2B', claro: '#FFC4C5' },
      },
      backgroundImage: {
        grad: 'linear-gradient(90deg,#8E2440 0%,#6A4BFF 100%)',
        brilho: 'radial-gradient(130% 150% at 100% 0%,#4B37C8 0%,#3A1530 48%,#191C1F 82%)',
      },
    },
  },
  plugins: [],
}
