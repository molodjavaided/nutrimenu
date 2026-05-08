'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({ email: z.string().email('Введите корректный email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Сброс пароля</h1>

        {sent ? (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Если аккаунт с таким email существует, мы отправили письмо со ссылкой для сброса пароля.
            </p>
            <Link href="/auth/login" className="text-sm text-indigo-600 hover:underline">
              Вернуться к входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-gray-500 text-sm mb-4">
              Введите email — мы пришлём ссылку для сброса пароля.
            </p>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" style={{ fontSize: 16 }} {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
            </Button>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-gray-500 hover:underline">
                Вернуться к входу
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
