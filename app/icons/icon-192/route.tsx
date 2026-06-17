import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111111',
        }}
      >
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 900, lineHeight: 1, color: '#F5C518' }}>
          FP
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 8, marginTop: 6 }}>
          JS
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
