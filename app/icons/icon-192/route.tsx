import { ImageResponse } from 'next/og'

export const runtime = 'edge'

function Icono({ size }: { size: number }) {
  const k = size / 512
  const plate = (w: number, h: number) => (
    <div style={{ width: k * w, height: k * h, borderRadius: k * 5, background: '#fff' }} />
  )
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: k * 26,
        background: 'linear-gradient(135deg, #EF3B46 0%, #E11D2A 55%, #B3121D 100%)',
      }}
    >
      <div style={{ display: 'flex', fontSize: k * 210, fontWeight: 800, lineHeight: 1, color: '#fff', letterSpacing: -k * 8 }}>
        FP
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: k * 4 }}>
        {plate(24, 64)}
        {plate(12, 40)}
        <div style={{ width: k * 96, height: k * 16, background: '#fff' }} />
        {plate(12, 40)}
        {plate(24, 64)}
      </div>
    </div>
  )
}

export function GET() {
  return new ImageResponse(<Icono size={192} />, { width: 192, height: 192 })
}
