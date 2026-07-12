import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const k = 180 / 512
  const plate = (w: number, h: number) => (
    <div style={{ width: k * w, height: k * h, borderRadius: k * 5, background: '#fff' }} />
  )
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: k * 26,
          background: 'linear-gradient(135deg, #FF8A5B 0%, #FF6B57 55%, #E14E2C 100%)',
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
    ),
    { ...size }
  )
}
