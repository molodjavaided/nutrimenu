export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#FEFEF2' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#2C2950' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5" stroke="#FEFEF2" strokeWidth="1.5" />
              <path d="M8 5v3l2 1.5" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: '#2C2950' }}>NutriMenu</span>
        </div>
        {children}
      </div>
    </div>
  )
}
