import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #EDE9FE 0%, #FEFEF2 50%, #E8F4F0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative blob top-right */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(196,181,253,0.35)',
          }}
        />
        {/* Decorative blob bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 320,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(139,92,246,0.18)',
          }}
        />

        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: '#2C2950',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="68" height="68" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12.5" stroke="#FEFEF2" strokeWidth="1.2" />
              <circle cx="14" cy="14" r="9" stroke="#F2D965" strokeWidth="3" fill="none"
                strokeDasharray="20.5 36.05" transform="rotate(-90 14 14)" />
              <circle cx="14" cy="14" r="9" stroke="#FEFEF2" strokeWidth="3" fill="none"
                strokeDasharray="12 44.55" strokeDashoffset="-21.5" transform="rotate(-90 14 14)" />
              <circle cx="14" cy="14" r="9" stroke="#B0A6DF" strokeWidth="3" fill="none"
                strokeDasharray="10 46.55" strokeDashoffset="-34.5" transform="rotate(-90 14 14)" />
              <circle cx="14" cy="14" r="9" stroke="#8B5CF6" strokeWidth="3" fill="none"
                strokeDasharray="7.5 49.05" strokeDashoffset="-45.5" transform="rotate(-90 14 14)" />
              <circle cx="14" cy="14" r="2.2" fill="#FEFEF2" />
            </svg>
          </div>

          {/* Brand + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: '#2C2950', letterSpacing: '-2px' }}>
              Plate
            </div>
            <div style={{ fontSize: 28, color: '#6B6490', maxWidth: 700, textAlign: 'center', lineHeight: 1.4 }}>
              Умное цифровое меню с КБЖУ и аллергенами
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 16 }}>
            {['КБЖУ', 'Аллергены', 'QR-код', 'Мгновенные обновления'].map(tag => (
              <div
                key={tag}
                style={{
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: '#7C3AED',
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
