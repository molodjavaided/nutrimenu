'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { hashPassword } from '@/lib/auth'
import { saveCredentials } from '@/lib/credentialsStore'
import { getVenue, saveVenue } from '@/lib/store'

const schema = z.object({
  venueName: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Пароли не совпадают',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

function makeSlug(name: string): string {
  const id = Math.random().toString(36).slice(2, 7)
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20)
    .replace(/-+$/, '')
  return base ? `${base}-${id}` : `venue-${id}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const passwordHash = await hashPassword(data.password)
      saveCredentials({ email: data.email.toLowerCase(), passwordHash })

      const existing = getVenue()
      if (!existing) {
        saveVenue({
          id: crypto.randomUUID(),
          name: data.venueName,
          slug: makeSlug(data.venueName),
        })
      } else if (!existing.name) {
        saveVenue({ ...existing, name: data.venueName })
      }

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#2C2950' }}>Регистрация</h1>
      <p className="text-sm mb-8" style={{ color: '#7a748f' }}>Создайте аккаунт для вашего заведения</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2950' }}>
            Название заведения
          </label>
          <input
            {...register('venueName')}
            type="text"
            placeholder="Кафе «Утро»"
            autoComplete="organization"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
          {errors.venueName && (
            <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.venueName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2950' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="owner@cafe.ru"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
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
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
          {errors.password && (
            <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2950' }}>
            Повторите пароль
          </label>
          <input
            {...register('confirm')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
          {errors.confirm && (
            <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.confirm.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
          style={{ background: '#2C2950', color: '#FEFEF2' }}
        >
          {loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: '#7a748f' }}>
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="font-medium" style={{ color: '#7C3AED' }}>
          Войти
        </Link>
      </p>
    </>
  )
}
