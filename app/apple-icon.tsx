import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
        <div style={{ display: 'flex', fontSize: 82, fontWeight: 900, lineHeight: 1, color: '#F5C518' }}>
          FP
        </div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 7, marginTop: 6 }}>
          JS
        </div>
      </div>
    ),
    { ...size }
  )
}
