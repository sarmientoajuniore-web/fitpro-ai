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
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 900, lineHeight: 1, color: '#22C55E' }}>
          FP
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
