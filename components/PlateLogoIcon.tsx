export default function PlateLogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rim */}
      <circle cx="14" cy="14" r="12.5" stroke="#FEFEF2" strokeWidth="1.2" fill="none" />
      {/* КБЖУ arc segments on r=9, circumference≈56.55 */}
      <g transform="rotate(-90 14 14)">
        {/* Ккал – yellow */}
        <circle cx="14" cy="14" r="9" stroke="#F2D965" strokeWidth="3"
          fill="none" strokeDasharray="20.5 36.05" strokeDashoffset="0" strokeLinecap="butt" />
        {/* Белки – white */}
        <circle cx="14" cy="14" r="9" stroke="#FEFEF2" strokeWidth="3"
          fill="none" strokeDasharray="12 44.55" strokeDashoffset="-21.5" strokeLinecap="butt" />
        {/* Жиры – soft lavender */}
        <circle cx="14" cy="14" r="9" stroke="#B0A6DF" strokeWidth="3"
          fill="none" strokeDasharray="10 46.55" strokeDashoffset="-34.5" strokeLinecap="butt" />
        {/* Углеводы – lavender */}
        <circle cx="14" cy="14" r="9" stroke="#8B5CF6" strokeWidth="3"
          fill="none" strokeDasharray="7.5 49.05" strokeDashoffset="-45.5" strokeLinecap="butt" />
      </g>
      {/* Center dot */}
      <circle cx="14" cy="14" r="2.2" fill="#FEFEF2" />
    </svg>
  )
}
