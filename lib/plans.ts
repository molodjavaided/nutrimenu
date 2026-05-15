export type PlanId = 'START' | 'STANDARD' | 'CUSTOM'

export const PLANS = {
  START: {
    id: 'START' as PlanId,
    name: 'Старт',
    maxItems: 50,
    aiImportPerMonth: 5,
    ttkExportPerMonth: null as null | number, // null = blocked
  },
  STANDARD: {
    id: 'STANDARD' as PlanId,
    name: 'Стандарт',
    maxItems: 200,
    aiImportPerMonth: 15,
    ttkExportPerMonth: Infinity,
  },
  CUSTOM: {
    id: 'CUSTOM' as PlanId,
    name: 'Индивидуальная',
    maxItems: Infinity,
    aiImportPerMonth: Infinity,
    ttkExportPerMonth: Infinity,
  },
} as const

export const SERVICES = {
  MENU_DIGITIZATION: {
    id: 'MENU_DIGITIZATION',
    name: 'Оцифровка меню',
    price: 5000,
    currency: '₽',
    tagline: 'Мы оцифруем меню за вас',
    description: 'Пришлите файлы с меню — мы внесём всё в систему сами. Не нужно сидеть весь день и вбивать блюда вручную.',
  },
} as const

export const TRIAL_DAYS = 14
export const GRACE_DAYS = 30

export type UserState =
  | 'trial'    // в триале (14 дней с регистрации)
  | 'paid'     // активная оплата
  | 'grace'    // триал кончился, не оплатил, ещё 30 дней доступ к конструктору
  | 'expired'  // grace кончился, всё заблокировано

export interface UserStateInput {
  trialEndsAt: Date | null
  paidUntil: Date | null
}

export function getUserState(user: UserStateInput, now: Date = new Date()): UserState {
  const t = now.getTime()
  if (user.paidUntil && user.paidUntil.getTime() > t) return 'paid'
  if (user.trialEndsAt && user.trialEndsAt.getTime() > t) return 'trial'
  if (user.trialEndsAt) {
    const graceEnd = user.trialEndsAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000
    if (t < graceEnd) return 'grace'
  }
  return 'expired'
}

/** Returns true if the trial is still active (legacy helper, kept for callers) */
export function isTrialActive(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false
  return new Date() < trialEndsAt
}

/** Days remaining in trial (0 if expired or no trial) */
export function trialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0
  const ms = trialEndsAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export interface EffectiveLimits {
  state: UserState
  maxItems: number
  aiImportPerMonth: number
  ttkExportPerMonth: number | null
  canAddItems: boolean
  canImportAi: boolean
  menuPublic: boolean // показывать ли публичное меню гостям
}

export interface BonusInput {
  bonusItems?: number
  bonusAiImports?: number
  bonusTtkExports?: number
}

function addBonus(base: number, bonus = 0): number {
  if (!Number.isFinite(base)) return base // Infinity stays Infinity
  return base + bonus
}

/**
 * Effective limits for an owner based on their state + admin-granted bonuses.
 *
 * - trial: START features but AI=0 (AI только после оплаты)
 * - paid: лимиты по тарифу
 * - grace: конструктор работает, но новые блюда/AI/публичное меню заблокированы
 * - expired: всё заблокировано
 *
 * Bonuses add on top of the plan limit and persist across plan changes.
 */
export function getEffectiveLimits(
  user: UserStateInput & { plan: PlanId } & BonusInput,
  now: Date = new Date()
): EffectiveLimits {
  const state = getUserState(user, now)
  const planDef = PLANS[user.plan]
  const bItems = user.bonusItems ?? 0
  const bAi = user.bonusAiImports ?? 0
  const bTtk = user.bonusTtkExports ?? 0

  if (state === 'paid') {
    return {
      state,
      maxItems: addBonus(planDef.maxItems, bItems),
      aiImportPerMonth: addBonus(planDef.aiImportPerMonth, bAi),
      ttkExportPerMonth: planDef.ttkExportPerMonth == null ? (bTtk > 0 ? bTtk : null) : addBonus(planDef.ttkExportPerMonth, bTtk),
      canAddItems: true,
      canImportAi: true,
      menuPublic: true,
    }
  }
  if (state === 'trial') {
    return {
      state,
      maxItems: addBonus(PLANS.START.maxItems, bItems),
      aiImportPerMonth: bAi, // в триале AI = 0 по плану, бонус всё равно действует
      ttkExportPerMonth: bTtk > 0 ? bTtk : null,
      canAddItems: true,
      canImportAi: bAi > 0,
      menuPublic: true,
    }
  }
  if (state === 'grace') {
    return {
      state,
      maxItems: addBonus(PLANS.START.maxItems, bItems),
      aiImportPerMonth: 0,
      ttkExportPerMonth: null,
      canAddItems: true,
      canImportAi: false,
      menuPublic: false,
    }
  }
  // expired
  return {
    state,
    maxItems: 0,
    aiImportPerMonth: 0,
    ttkExportPerMonth: null,
    canAddItems: false,
    canImportAi: false,
    menuPublic: false,
  }
}
