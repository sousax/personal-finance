import { useEffect, useRef, useState } from 'react'

const ACENTO = '#4f46e5'
const ALTURA = 200
const PAD = { e: 14, d: 14, t: 18, b: 26 }

export type Fase = 'passado' | 'atual' | 'futuro'

function useLargura() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function RitmoGrafico({ gastos, salario, dias, fase, mesCurto, fmt }: {
  gastos: number[]; salario: number; dias: number; fase: Fase; mesCurto: string; fmt: (v: number) => string
}) {
  const [ref, w] = useLargura()
  const total = gastos[gastos.length - 1] ?? 0
  const ymax = Math.max(salario, total, 1) * 1.12
  const x = (d: number) => PAD.e + ((d - 1) / Math.max(1, dias - 1)) * (w - PAD.e - PAD.d)
  const y = (v: number) => PAD.t + (1 - v / ymax) * (ALTURA - PAD.t - PAD.b)
  const base = y(0)
  const linha = gastos.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ultimo = gastos.length
  const virar = ultimo > 0 && x(ultimo) > w * 0.6
  const rotulo = fase === 'atual' ? `Hoje · ${fmt(total)}` : fmt(total)
  const marcas = [1, 8, 15, 22, dias]
  const balao = { left: x(ultimo) + (virar ? -12 : 12), top: y(total), transform: `translate(${virar ? '-100%' : '0'},-50%)` }

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={ALTURA} role="img" aria-label="Gastos acumulados por dia" className="block">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.e} x2={w - PAD.d} y1={PAD.t + f * (ALTURA - PAD.t - PAD.b)} y2={PAD.t + f * (ALTURA - PAD.t - PAD.b)} className="text-linha" stroke="currentColor" strokeWidth="1" />
        ))}
        <line x1={x(1)} y1={y(salario / dias)} x2={x(dias)} y2={y(salario)} stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="5 5" />
        {ultimo > 1 && <polygon points={`${x(1)},${base} ${linha} ${x(ultimo)},${base}`} fill={ACENTO} opacity=".1" />}
        {ultimo > 0 && <polyline points={linha} fill="none" stroke={ACENTO} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {ultimo > 0 && <circle cx={x(ultimo)} cy={y(total)} r="4.5" fill={ACENTO} stroke="#fff" strokeWidth="2" />}
        {marcas.map((d) => (
          <text key={d} x={x(d)} y={ALTURA - 6} textAnchor={d === 1 ? 'start' : d === dias ? 'end' : 'middle'} className="fill-suave text-[11px]">
            {d === 1 || d === dias ? `${d} ${mesCurto}` : d}
          </text>
        ))}
      </svg>
      {salario > 0 && <span className="absolute right-3.5 text-xs text-suave" style={{ top: y(salario), transform: 'translateY(-130%)' }}>Salário {fmt(salario)}</span>}
      {ultimo > 0 && <span className="absolute whitespace-nowrap rounded-lg bg-tinta px-2 py-0.5 text-xs font-semibold text-white" style={balao}>{rotulo}</span>}
    </div>
  )
}
