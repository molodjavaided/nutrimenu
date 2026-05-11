import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#2C2950',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          {/* Outer rim */}
          <circle cx="14" cy="14" r="12.5" stroke="#FEFEF2" strokeWidth="1.2" />
          {/* Ккал arc – yellow */}
          <circle
            cx="14" cy="14" r="9"
            stroke="#F2D965" strokeWidth="3" fill="none"
            strokeDasharray="20.5 36.05"
            transform="rotate(-90 14 14)"
          />
          {/* Белки arc – white */}
          <circle
            cx="14" cy="14" r="9"
            stroke="#FEFEF2" strokeWidth="3" fill="none"
            strokeDasharray="12 44.55" strokeDashoffset="-21.5"
            transform="rotate(-90 14 14)"
          />
          {/* Жиры arc – soft lavender */}
          <circle
            cx="14" cy="14" r="9"
            stroke="#B0A6DF" strokeWidth="3" fill="none"
            strokeDasharray="10 46.55" strokeDashoffset="-34.5"
            transform="rotate(-90 14 14)"
          />
          {/* Углеводы arc – lavender */}
          <circle
            cx="14" cy="14" r="9"
            stroke="#8B5CF6" strokeWidth="3" fill="none"
            strokeDasharray="7.5 49.05" strokeDashoffset="-45.5"
            transform="rotate(-90 14 14)"
          />
          {/* Center dot */}
          <circle cx="14" cy="14" r="2.2" fill="#FEFEF2" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
