'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Ошибка входа')
        return
      }
      router.push(json.redirectTo ?? '/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#2C2950' }}>Войти</h1>
      <p className="text-sm mb-8" style={{ color: '#7a748f' }}>Управление вашим заведением</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2950' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="owner@cafe.ru"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
          {errors.email && (
            <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2950' }}>
            Пароль
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
          {errors.password && (
            <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-xs" style={{ color: '#7a748f' }}>
            Забыли пароль?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#2C2950', color: '#FEFEF2' }}
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: '#7a748f' }}>
        Первый раз?{' '}
        <Link href="/auth/register" className="font-medium" style={{ color: '#7C3AED' }}>
          Зарегистрировать заведение
        </Link>
      </p>
    </>
  )
}
