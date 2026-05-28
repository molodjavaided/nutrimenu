import type { TourEventName } from './bus'

export interface TourStep {
  id: string
  page: string
  /** CSS-селектор цели или null (центрированная модалка). */
  target: string | null
  /** Двухфазный шаг: как только этот элемент появится в DOM — подсветка переедет на него. */
  revealTarget?: string
  title?: string
  body: string
  placement?: 'auto' | 'top' | 'bottom' | 'screen-bottom'
  /** Информационный шаг — переход по кнопке «Дальше». */
  showNext?: boolean
  /** Мягкий шаг — не блокировать клики (поверх модального пикера). */
  soft?: boolean
  /** Событие из tourBus, по которому шаг считается выполненным. */
  advanceOn?: { event: TourEventName; match?: (p: unknown) => boolean }
  /** Если задано, кнопка «Дальше» показывается всегда (showNext подразумевается),
   *  но активна только после события с матчем. Не автопереход — юзер сам жмёт «Дальше». */
  gateOn?: { event: TourEventName; match?: (p: unknown) => boolean }
}

export const TOUR_REF = {
  egg:  'fd-6_2',  // Яйцо куриное С1
  milk: 'fd-6_12', // Молоко 3.2%
} as const

const isPayload = (p: unknown): p is { refId?: string; parentRefId?: string; processing?: string; kind?: string; amount?: number } =>
  typeof p === 'object' && p !== null

export const CARBONARA_STEPS: TourStep[] = [
  // ── Шаг 1: добавить блюдо ──────────────────────────────────────────────────
  {
    id: 'add-dish',
    page: '/dashboard/menu',
    target: '[data-tour="add-dish"]',
    title: 'Добавим первое блюдо',
    body: 'Соберём классический омлет — Plate сам посчитает КБЖУ. Нажмите «Добавить блюдо».',
    placement: 'bottom',
  },

  // ── Шаг 2: раскрыть состав (Уровень 2) ─────────────────────────────────────
  {
    id: 'expand-composition',
    page: '/dashboard/item/new',
    target: '[data-tour="expand-composition"]',
    title: 'Считать КБЖУ из ингредиентов',
    body: 'Соберём блюдо из ингредиентов — Plate сам посчитает КБЖУ. Нажмите карточку «Считать КБЖУ из ингредиентов».',
    placement: 'top',
    advanceOn: { event: 'mode-set', match: p => p === 'composition' || p === 'ttk' },
  },

  // ── Шаг 3: открыть пикер для яйца ─────────────────────────────────────────
  {
    id: 'open-picker-egg',
    page: '/dashboard/item/new',
    target: '[data-tour="pick-ingredient"]',
    title: 'Добавим яйца',
    body: 'Нажмите «Выбрать из справочника».',
    placement: 'top',
    advanceOn: { event: 'picker-opened' },
  },

  // ── Шаг 4: поиск яйца ──────────────────────────────────────────────────────
  {
    id: 'search-egg',
    page: '/dashboard/item/new',
    target: '[data-tour="picker-search"]',
    title: 'Найдите яйцо',
    body: 'Введите «яйцо» в поиск, затем нажмите «Дальше».',
    placement: 'screen-bottom',
    showNext: true,
  },

  // ── Шаг 5: выбрать яйцо из результатов ────────────────────────────────────
  {
    id: 'pick-egg',
    page: '/dashboard/item/new',
    target: `[data-tour="picker-result-${TOUR_REF.egg}"]`,
    title: 'Выберите яйцо С1',
    body: 'Нажмите на «Яйцо куриное С1» в списке.',
    placement: 'screen-bottom',
    advanceOn: { event: 'ingredient-picked', match: p => p === TOUR_REF.egg },
  },

  // ── Шаг 6: вес яйца ────────────────────────────────────────────────────────
  {
    id: 'egg-amount',
    page: '/dashboard/item/new',
    target: `[data-tour="amount-${TOUR_REF.egg}"]`,
    title: 'Сколько яиц',
    body: 'Введите «2» — омлет на двух яйцах. Затем нажмите «Дальше».',
    placement: 'top',
    showNext: true,
    gateOn: { event: 'amount-set', match: p => isPayload(p) && p.refId === TOUR_REF.egg && p.amount === 2 },
  },

  // ── Шаг 6.5: раскрыть ТТК (Уровень 3) ──────────────────────────────────────
  {
    id: 'expand-ttk',
    page: '/dashboard/item/new',
    target: '[data-tour="expand-ttk"]',
    title: 'Учитывать обработку',
    body: 'Включим ТТК — Plate учтёт жарку и потерю веса. Нажмите карточку «Учитывать обработку».',
    placement: 'top',
    advanceOn: { event: 'mode-set', match: p => p === 'ttk' },
  },

  // ── Шаг 7: открыть обработку яйца ─────────────────────────────────────────
  {
    id: 'egg-processing-open',
    page: '/dashboard/item/new',
    target: `[data-tour="processing-${TOUR_REF.egg}"]`,
    title: 'Обработка: жарка',
    body: 'Нажмите «+ обработка» под яйцом.',
    placement: 'top',
    advanceOn: { event: 'processing-panel-opened', match: p => p === TOUR_REF.egg },
  },

  // ── Шаг 8: выбрать жарку ───────────────────────────────────────────────────
  {
    id: 'egg-processing-fry',
    page: '/dashboard/item/new',
    target: `[data-tour="fry-${TOUR_REF.egg}"]`,
    title: 'Выберите «Жарка»',
    body: 'Яйца жарятся — Plate учтёт потерю веса.',
    placement: 'top',
    advanceOn: { event: 'processing-set', match: p => isPayload(p) && p.refId === TOUR_REF.egg && p.processing === 'fry' },
  },

  // ── Шаг 9: открыть пикер для молока ───────────────────────────────────────
  {
    id: 'open-picker-milk',
    page: '/dashboard/item/new',
    target: '[data-tour="add-ingredient"]',
    title: 'Добавим молоко',
    body: 'Откройте справочник ещё раз.',
    placement: 'top',
    advanceOn: { event: 'picker-opened' },
  },

  // ── Шаг 10: поиск молока ───────────────────────────────────────────────────
  {
    id: 'search-milk',
    page: '/dashboard/item/new',
    target: '[data-tour="picker-search"]',
    title: 'Найдите молоко',
    body: 'Введите «молоко» в поиск, затем нажмите «Дальше».',
    placement: 'screen-bottom',
    showNext: true,
  },

  // ── Шаг 11: выбрать молоко ─────────────────────────────────────────────────
  {
    id: 'pick-milk',
    page: '/dashboard/item/new',
    target: `[data-tour="picker-result-${TOUR_REF.milk}"]`,
    title: 'Выберите молоко 3.2%',
    body: 'Нажмите на «Молоко 3.2%» в списке.',
    placement: 'screen-bottom',
    advanceOn: { event: 'ingredient-picked', match: p => p === TOUR_REF.milk },
  },

  // ── Шаг 12: вес молока ─────────────────────────────────────────────────────
  {
    id: 'milk-amount',
    page: '/dashboard/item/new',
    target: `[data-tour="amount-${TOUR_REF.milk}"]`,
    title: 'Сколько молока',
    body: 'Введите «30» — пара столовых ложек. Затем нажмите «Дальше».',
    placement: 'top',
    showNext: true,
    gateOn: { event: 'amount-set', match: p => isPayload(p) && p.refId === TOUR_REF.milk && p.amount === 30 },
  },

  // ── Шаг 13: сохранить ──────────────────────────────────────────────────────
  {
    id: 'save',
    page: '/dashboard/item/new',
    target: '[data-tour="save-dish"]',
    title: 'Сохраните блюдо',
    body: 'Готово! Нажмите «Добавить блюдо» — омлет появится в меню с готовыми КБЖУ.',
    placement: 'top',
    advanceOn: { event: 'item-saved' },
  },

  // ── Шаг 14: финал ──────────────────────────────────────────────────────────
  {
    id: 'done',
    page: '/dashboard/menu',
    target: null,
    title: 'Омлет в меню! 🎉',
    body: 'Так же добавляйте любые блюда. Поделитесь меню с гостями через QR-код — кнопка на этой странице.',
    showNext: true,
  },
]
