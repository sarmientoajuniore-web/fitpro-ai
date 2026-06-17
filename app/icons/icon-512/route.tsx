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
        <div style={{ display: 'flex', fontSize: 230, fontWeight: 900, lineHeight: 1, color: '#F5C518' }}>
          FP
        </div>
        <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 20, marginTop: 12 }}>
          JS
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
