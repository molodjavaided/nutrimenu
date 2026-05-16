'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onDetect: (code: string) => void
  onClose: () => void
}

export default function BarcodeScannerOverlay({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectedRef = useRef(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Открываем камеру…')
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (manualMode) return
    let cancelled = false
    detectedRef.current = false

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        if (!('BarcodeDetector' in window)) {
          setError('Браузер не поддерживает сканер. Введите штрих-код вручную.')
          return
        }

        // @ts-expect-error BarcodeDetector is experimental
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })
        setStatus('Наведите камеру на штрих-код')

        const tick = async () => {
          if (cancelled || detectedRef.current) return
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              detectedRef.current = true
              const code = codes[0].rawValue as string
              stop()
              onDetect(code)
              return
            }
          } catch { /* ignore frame errors */ }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch {
        setError('Не удалось получить доступ к камере')
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [manualMode, onDetect, stop])

  function submitManual() {
    const code = manualCode.trim()
    if (!code) return
    onDetect(code)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(20,18,40,0.92)' }}
    >
      <div className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 'min(440px, 92vw)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.15)' }}>
          <p className="text-base font-medium" style={{ color: '#fff' }}>Сканер штрих-кода</p>
          <button onClick={() => { stop(); onClose() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >✕</button>
        </div>

        <div className="flex gap-1 p-1 m-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {(['camera', 'manual'] as const).map(tab => (
            <button key={tab}
              onClick={() => setManualMode(tab === 'manual')}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium"
              style={{
                background: (tab === 'manual') === manualMode ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.04)',
                color: '#fff',
              }}
            >
              {tab === 'camera' ? '📷 Камера' : '⌨️ Вручную'}
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 flex flex-col items-center">
          {!manualMode ? (
            error ? (
              <p className="text-sm text-center px-4 py-6" style={{ color: '#FCA5A5' }}>{error}</p>
            ) : (
              <>
                <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3', background: '#000' }}>
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-3/4 h-1/3 rounded-xl"
                      style={{ border: '2px solid rgba(139,92,246,0.7)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                  </div>
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {status}
                </p>
              </>
            )
          ) : (
            <div className="w-full flex flex-col gap-3 py-3">
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitManual()}
                placeholder="EAN-13, например 4630146040576"
                className="h-11 px-3 rounded-xl text-sm outline-none font-mono"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.2)' }}
              />
              <button onClick={submitManual}
                disabled={!manualCode.trim()}
                className="h-11 rounded-xl text-sm font-medium"
                style={{
                  background: manualCode.trim() ? '#8B5CF6' : 'rgba(139,92,246,0.3)',
                  color: '#fff',
                  opacity: manualCode.trim() ? 1 : 0.6,
                }}
              >
                Найти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
