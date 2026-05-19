'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, adminKeys, VenueStatus, PlanId, getSubscriptionState, daysUntil } from '@/lib/admin-api'
import { BonusGrants } from '@/components/admin/BonusGrants'
import { VenueFiles } from '@/components/admin/VenueFiles'
import { PlanSwitchModal } from '@/components/admin/PlanSwitchModal'

const STATUS_COLOR: Record<VenueStatus, string> = { PENDING: '#B45309', APPROVED: '#15803D', REJECTED: '#DC2626' }
const STATUS_BG: Record<VenueStatus, string> = {
  PENDING: 'rgba(180,83,9,0.1)',
  APPROVED: 'rgba(21,128,61,0.1)',
  REJECTED: 'rgba(220,38,38,0.1)',
}
const PLAN_LABEL: Record<PlanId, string> = { TEST: 'Тест', START: 'Старт', STANDARD: 'Стандарт', CUSTOM: 'Индивидуальный' }

const SUB_COLOR = { trial: '#7C3AED', awaiting_plan: '#DC2626', paid: '#15803D', grace: '#B45309', expired: '#9D99B8' } as const
const SUB_LABEL = { trial: 'Тест', awaiting_plan: 'Ждёт тариф', paid: 'Оплачено', grace: 'Grace', expired: 'Просрочено' } as const

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU')
}

export default function AdminVenueMenuPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: venue, isLoading } = useQuery({
    queryKey: adminKeys.venue(id),
    queryFn: () => adminApi.fetchVenue(id),
  })

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [planSwitchTarget, setPlanSwitchTarget] = useState<PlanId | null>(null)

  useEffect(() => {
    if (venue) {
      setExpanded(new Set(venue.categories.map(c => c.id)))
      setNote(venue.adminNote ?? '')
    }
  }, [venue])

  const statusMutation = useMutation({
    mutationFn: (status: VenueStatus) => adminApi.patchVenue(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.venue(id) })
      qc.invalidateQueries({ queryKey: adminKeys.venues })
    },
  })

  const noteMutation = useMutation({
    mutationFn: (adminNote: string) => adminApi.patchVenue(id, { adminNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.venue(id) })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => adminApi.verifyEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.venue(id) }),
  })

  const resetMutation = useMutation({
    mutationFn: () => adminApi.generateResetLink(id),
    onSuccess: data => setResetLink(data.link),
  })

  const planMutation = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updatePlan>[1]) => adminApi.updatePlan(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.venue(id) }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteVenue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.venues })
      router.push('/admin')
    },
  })

  async function copyLink() {
    if (!resetLink) return
    await navigator.clipboard.writeText(resetLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleCategory(catId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId); else next.add(catId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!venue) {
    return <p className="text-sm" style={{ color: '#7a748f' }}>Заведение не найдено</p>
  }

  const state = getSubscriptionState(venue.owner.plan, venue.owner.trialEndsAt, venue.owner.paidUntil)
  const trialDays = daysUntil(venue.owner.trialEndsAt)
  const paidDays = daysUntil(venue.owner.paidUntil)
  const location = [venue.city, venue.country].filter(Boolean).join(', ')
  const deleting = deleteMutation.isPending
  const canDelete = deleteConfirm.trim() === venue.name

  return (
    <div className="space-y-5">
      {planSwitchTarget && (
        <PlanSwitchModal
          newPlan={planSwitchTarget}
          pending={planMutation.isPending}
          onCancel={() => setPlanSwitchTarget(null)}
          onConfirm={(extendPaidDays) => {
            const body: Parameters<typeof adminApi.updatePlan>[1] = { plan: planSwitchTarget }
            if (extendPaidDays != null) body.extendPaidDays = extendPaidDays
            planMutation.mutate(body, { onSuccess: () => setPlanSwitchTarget(null) })
          }}
        />
      )}

      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && (setShowDelete(false), setDeleteConfirm(''))}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: '#FEFEF2' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1" style={{ color: '#2C2950' }}>Удалить заведение?</h3>
            <p className="text-sm mb-1" style={{ color: '#6B6490' }}>
              <span className="font-medium" style={{ color: '#2C2950' }}>{venue.name}</span>
            </p>
            <p className="text-xs mb-3" style={{ color: '#9D99B8' }}>
              Владелец {venue.owner.email} и все данные меню будут удалены безвозвратно.
            </p>
            <label className="text-xs block mb-1.5" style={{ color: '#6B6490' }}>
              Введите название заведения для подтверждения:
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={venue.name}
              className="w-full mb-5 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: '#EAE7F8', color: '#2C2950', border: '1px solid rgba(176,166,223,0.4)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#EAE7F8', color: '#6B6490' }}
              >Отмена</button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleting || !canDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: '#DC2626', color: '#fff' }}
              >{deleting ? '…' : 'Удалить'}</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: '#9D99B8' }}
      >
        <ArrowLeft size={15} />
        Все заведения
      </button>

      {/* Header */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#EAE7F8' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: '#2C2950' }}>{venue.name}</h1>
              <select
                value={venue.status}
                disabled={statusMutation.isPending}
                onChange={e => statusMutation.mutate(e.target.value as VenueStatus)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium outline-none cursor-pointer disabled:opacity-50"
                style={{ color: STATUS_COLOR[venue.status], background: STATUS_BG[venue.status], border: `1px solid ${STATUS_COLOR[venue.status]}30` }}
              >
                <option value="PENDING">На проверке</option>
                <option value="APPROVED">Одобрено</option>
                <option value="REJECTED">Отклонено</option>
              </select>
            </div>
            {location && <p className="text-sm mt-1" style={{ color: '#6B6490' }}>{location}</p>}
            {venue.address && <p className="text-xs mt-0.5" style={{ color: '#9D99B8' }}>{venue.address}</p>}
            <p className="text-xs mt-1.5" style={{ color: '#9D99B8' }}>
              Зарегистрирован {formatDate(venue.createdAt)} · владелец {venue.owner.email}
              {!venue.owner.emailVerified && (
                <button
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                  className="ml-2 px-1.5 py-0.5 rounded-md text-xs font-medium transition-all disabled:opacity-60"
                  style={{ background: 'rgba(21,128,61,0.12)', color: '#15803D' }}
                >{verifyMutation.isPending ? '…' : 'verify email'}</button>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <a
              href={`/menu/${venue.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
            >
              <Eye size={13} /> Открыть меню
            </a>
            <button
              onClick={() => setShowDelete(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
            >Удалить</button>
          </div>
        </div>
      </div>

      {/* Plan & subscription */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#EAE7F8' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>ТАРИФ И ПОДПИСКА</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${SUB_COLOR[state]}1a`, color: SUB_COLOR[state] }}>
            {SUB_LABEL[state]}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs mb-1" style={{ color: '#9D99B8' }}>Тариф</p>
            <select
              value={venue.owner.plan}
              disabled={planMutation.isPending}
              onChange={e => {
                const next = e.target.value as PlanId
                if (next === venue.owner.plan) return
                if (next === 'TEST') {
                  if (confirm('Вернуть на Тест? Платная подписка сбросится.')) {
                    planMutation.mutate({ plan: 'TEST', paidUntil: null })
                  }
                  return
                }
                setPlanSwitchTarget(next)
              }}
              className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none cursor-pointer disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.4)' }}
            >
              <option value="TEST">🧪 {PLAN_LABEL.TEST} (авто)</option>
              <option value="START">{PLAN_LABEL.START}</option>
              <option value="STANDARD">{PLAN_LABEL.STANDARD}</option>
              <option value="CUSTOM">{PLAN_LABEL.CUSTOM}</option>
            </select>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#9D99B8' }}>Триал до</p>
            <p className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.5)', color: '#6B6490' }}>
              {formatDate(venue.owner.trialEndsAt)}
              {trialDays != null && trialDays > 0 && <span className="ml-1.5 text-xs" style={{ color: '#B0A6DF' }}>({trialDays}д)</span>}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#9D99B8' }}>Оплачено до</p>
            <p className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.5)', color: '#2C2950' }}>
              {formatDate(venue.owner.paidUntil)}
              {paidDays != null && paidDays > 0 && <span className="ml-1.5 text-xs" style={{ color: '#B0A6DF' }}>({paidDays}д)</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: '#9D99B8' }}>Продлить триал</p>
          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => planMutation.mutate({ extendTrialDays: days })}
                disabled={planMutation.isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}
              >+{days}д</button>
            ))}
            {venue.owner.trialEndsAt && (
              <button
                onClick={() => {
                  if (confirm('Сбросить триал?')) planMutation.mutate({ trialEndsAt: null })
                }}
                disabled={planMutation.isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
              >Сбросить</button>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: '#9D99B8' }}>Продлить оплату</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '+1 мес', days: 30 },
              { label: '+3 мес', days: 90 },
              { label: '+6 мес', days: 180 },
              { label: '+1 год', days: 365 },
            ].map(({ label, days }) => (
              <button
                key={days}
                onClick={() => planMutation.mutate({ extendPaidDays: days })}
                disabled={planMutation.isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
              >{label}</button>
            ))}
            {venue.owner.paidUntil && (
              <button
                onClick={() => {
                  if (confirm('Сбросить дату оплаты?')) planMutation.mutate({ paidUntil: null })
                }}
                disabled={planMutation.isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
              >Сбросить</button>
            )}
          </div>
        </div>
      </div>

      {/* Bonus grants */}
      <BonusGrants
        venueId={id}
        plan={venue.owner.plan}
        bonusItems={venue.owner.bonusItems}
        bonusAiImports={venue.owner.bonusAiImports}
        bonusTtkExports={venue.owner.bonusTtkExports}
      />

      {/* Admin tools */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#EAE7F8' }}>
          <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>ЗАМЕТКА АДМИНИСТРАТОРА</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Внутренние заметки — видны только администраторам"
            rows={3}
            className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.7)', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.4)' }}
          />
          <button
            onClick={() => noteMutation.mutate(note)}
            disabled={noteMutation.isPending}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5"
            style={{ background: noteSaved ? 'rgba(21,128,61,0.12)' : 'rgba(139,92,246,0.12)', color: noteSaved ? '#15803D' : '#7C3AED' }}
          >
            {noteSaved ? <><Check size={12} /> Сохранено</> : noteMutation.isPending ? '…' : 'Сохранить заметку'}
          </button>
        </div>

        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#EAE7F8' }}>
          <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>СБРОС ПАРОЛЯ</p>
          <p className="text-xs" style={{ color: '#B0A6DF' }}>
            Генерирует ссылку для сброса пароля. Действительна 24 часа.
          </p>
          {resetLink ? (
            <div className="space-y-2">
              <div className="px-3 py-2 rounded-xl text-xs break-all select-all" style={{ background: 'rgba(255,255,255,0.7)', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.4)' }}>
                {resetLink}
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: copied ? 'rgba(21,128,61,0.12)' : 'rgba(139,92,246,0.12)', color: copied ? '#15803D' : '#7C3AED' }}
              >
                {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Скопировать ссылку</>}
              </button>
            </div>
          ) : (
            <button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
            >{resetMutation.isPending ? '…' : 'Сгенерировать ссылку'}</button>
          )}
        </div>
      </div>

      {/* Files */}
      <VenueFiles venueId={id} />

      {/* Menu */}
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: '#9D99B8' }}>МЕНЮ</p>
        {venue.categories.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#EAE7F8' }}>
            <p className="text-sm" style={{ color: '#9D99B8' }}>Меню пустое — владелец ещё не добавил категории</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {venue.categories.map(cat => (
              <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:opacity-80"
                  style={{ background: '#EAE7F8' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: '#2C2950' }}>{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(176,166,223,0.3)', color: '#9D99B8' }}>{cat.items.length}</span>
                  </div>
                  {expanded.has(cat.id) ? <ChevronDown size={15} style={{ color: '#9D99B8' }} /> : <ChevronRight size={15} style={{ color: '#9D99B8' }} />}
                </button>

                {expanded.has(cat.id) && (
                  <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
                    {cat.items.length === 0 ? (
                      <p className="px-5 py-3 text-xs" style={{ color: '#9D99B8' }}>Нет позиций</p>
                    ) : cat.items.map(item => (
                      <div
                        key={item.id}
                        className="px-5 py-3 flex items-start gap-4"
                        style={{ background: item.isAvailable ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: item.isAvailable ? 1 : 0.55 }}
                      >
                        {item.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'rgba(176,166,223,0.15)' }}>
                            <span className="text-lg">🍽</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" style={{ color: '#2C2950' }}>{item.name}</p>
                            {!item.isAvailable && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#9D99B8' }}>
                                <EyeOff size={10} /> скрыто
                              </span>
                            )}
                            {item.price != null && (
                              <span className="text-xs font-medium ml-auto" style={{ color: '#2C2950' }}>{item.price} ₽</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9D99B8' }}>{item.description}</p>
                          )}
                          {(item.calories > 0 || item.protein > 0) && (
                            <div className="flex gap-3 mt-1.5 flex-wrap">
                              {item.weight > 0 && (<span className="text-xs" style={{ color: '#B0A6DF' }}>{item.weight} {item.weightUnit}</span>)}
                              {item.calories > 0 && (<span className="text-xs" style={{ color: '#B0A6DF' }}>{Math.round(item.calories)} ккал</span>)}
                              {[['Б', item.protein], ['Ж', item.fat], ['У', item.carbs]].map(([label, val]) =>
                                Number(val) > 0 ? (
                                  <span key={String(label)} className="text-xs" style={{ color: '#B0A6DF' }}>{label}: {Number(val).toFixed(1)}г</span>
                                ) : null
                              )}
                            </div>
                          )}
                          <p className="text-xs mt-1" style={{ color: '#D8D4F0' }}>обновлено {formatDate(item.updatedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
