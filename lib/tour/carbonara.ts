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
}

// Ингредиенты карбонары в глобальном каталоге (foodDatabase, префикс fd-).
export const TOUR_REF = {
  pasta: 'fd-7_15', // Паста (тв. сорта)
  bacon: 'fd-4_10', // Бекон сырокопчёный (грудинка)
  yolk: 'fd-6_5',   // Яичный желток
} as const

const isPayload = (p: unknown): p is { refId?: string; parentRefId?: string; processing?: string; kind?: string; amount?: number } =>
  typeof p === 'object' && p !== null

export const CARBONARA_STEPS: TourStep[] = [
  {
    id: 'add-dish',
    page: '/dashboard/menu',
    target: '[data-tour="add-dish"]',
    title: 'Добавим первое блюдо',
    body: 'Соберём классическую карбонару — за пару кликов Plate сам посчитает КБЖУ. Нажмите «Добавить блюдо».',
    placement: 'bottom',
    // переход — по навигации на /dashboard/item/new
  },
  {
    id: 'mode-ttk',
    page: '/dashboard/item/new',
    target: '[data-tour="mode-ttk"]',
    title: 'Режим «По сложному проценту»',
    body: 'Соберём блюдо из ингредиентов с обработкой — система учтёт выход и впитывание. Название и категорию я уже подставил. Выберите этот режим.',
    placement: 'bottom',
    advanceOn: { event: 'mode-set', match: p => p === 'ttk' },
  },
  {
    id: 'open-picker-pasta',
    page: '/dashboard/item/new',
    target: '[data-tour="pick-ingredient"]',
    title: 'Состав блюда',
    body: 'Ингредиенты берём из справочника. Нажмите «Выбрать из справочника».',
    placement: 'top',
    advanceOn: { event: 'picker-opened' },
  },
  {
    id: 'search-pasta',
    page: '/dashboard/item/new',
    target: '[data-tour="picker-search"]',
    title: 'Найдите пасту',
    body: 'Введите «паста» в строку поиска, затем нажмите «Дальше».',
    placement: 'screen-bottom',
    showNext: true,
  },
  {
    id: 'pick-pasta',
    page: '/dashboard/item/new',
    target: `[data-tour="picker-result-${TOUR_REF.pasta}"]`,
    title: 'Выберите пасту',
    body: 'Нажмите на «Паста (тв. сорта)» в списке.',
    placement: 'screen-bottom',
    advanceOn: { event: 'ingredient-picked', match: p => p === TOUR_REF.pasta },
  },
  {
    id: 'pasta-processing',
    page: '/dashboard/item/new',
    target: `[data-tour="card-${TOUR_REF.pasta}"]`,
    title: 'Обработка: варка',
    body: 'Тапните чип «+ обработка» под пастой и выберите «Варка» — паста впитает воду, выход вырастет.',
    placement: 'top',
    advanceOn: { event: 'processing-set', match: p => isPayload(p) && p.refId === TOUR_REF.pasta && p.processing === 'boil' },
  },
  {
    id: 'pasta-amount',
    page: '/dashboard/item/new',
    target: `[data-tour="amount-${TOUR_REF.pasta}"]`,
    title: 'Сколько пасты',
    body: 'Укажите вес сырой пасты на стандартную порцию — например, 100 г.',
    placement: 'top',
    advanceOn: { event: 'amount-set', match: p => isPayload(p) && p.refId === TOUR_REF.pasta && (p.amount ?? 0) > 0 },
  },
  {
    id: 'pasta-water',
    page: '/dashboard/item/new',
    target: `[data-tour="card-${TOUR_REF.pasta}"]`,
    title: 'Добавьте воду',
    body: 'Появилась подсказка «+ вода» — тапните её. Паста впитывает воду при варке, Plate учтёт это в весе блюда. Оставьте ~150 г.',
    placement: 'top',
    advanceOn: { event: 'companion-added', match: p => isPayload(p) && p.parentRefId === TOUR_REF.pasta && p.kind === 'water' },
  },
  {
    id: 'open-picker-bacon',
    page: '/dashboard/item/new',
    target: '[data-tour="add-ingredient"]',
    title: 'Добавим грудинку',
    body: 'Снова откройте справочник кнопкой «Добавить ингредиент».',
    placement: 'top',
    advanceOn: { event: 'picker-opened' },
  },
  {
    id: 'search-bacon',
    page: '/dashboard/item/new',
    target: '[data-tour="picker-search"]',
    title: 'Найдите грудинку',
    body: 'Введите «бекон» в строку поиска, затем нажмите «Дальше».',
    placement: 'screen-bottom',
    showNext: true,
  },
  {
    id: 'pick-bacon',
    page: '/dashboard/item/new',
    target: `[data-tour="picker-result-${TOUR_REF.bacon}"]`,
    title: 'Выберите грудинку',
    body: 'Нажмите на «Бекон сырокопчёный» в списке.',
    placement: 'screen-bottom',
    advanceOn: { event: 'ingredient-picked', match: p => p === TOUR_REF.bacon },
  },
  {
    id: 'bacon-amount',
    page: '/dashboard/item/new',
    target: `[data-tour="amount-${TOUR_REF.bacon}"]`,
    title: 'Сколько грудинки',
    body: 'Для карбонары достаточно ~30 г на порцию.',
    placement: 'top',
    advanceOn: { event: 'amount-set', match: p => isPayload(p) && p.refId === TOUR_REF.bacon && (p.amount ?? 0) > 0 },
  },
  {
    id: 'open-picker-yolk',
    page: '/dashboard/item/new',
    target: '[data-tour="add-ingredient"]',
    title: 'Последний ингредиент — желток',
    body: 'Откройте справочник ещё раз.',
    placement: 'top',
    advanceOn: { event: 'picker-opened' },
  },
  {
    id: 'search-yolk',
    page: '/dashboard/item/new',
    target: '[data-tour="picker-search"]',
    title: 'Найдите желток',
    body: 'Введите «желток» в строку поиска, затем нажмите «Дальше».',
    placement: 'screen-bottom',
    showNext: true,
  },
  {
    id: 'pick-yolk',
    page: '/dashboard/item/new',
    target: `[data-tour="picker-result-${TOUR_REF.yolk}"]`,
    title: 'Выберите желток',
    body: 'Нажмите на «Яичный желток» в списке.',
    placement: 'screen-bottom',
    advanceOn: { event: 'ingredient-picked', match: p => p === TOUR_REF.yolk },
  },
  {
    id: 'yolk-amount',
    page: '/dashboard/item/new',
    target: `[data-tour="amount-${TOUR_REF.yolk}"]`,
    title: 'Сколько желтка',
    body: 'Два желтка — это ~36 г.',
    placement: 'top',
    advanceOn: { event: 'amount-set', match: p => isPayload(p) && p.refId === TOUR_REF.yolk && (p.amount ?? 0) > 0 },
  },
  {
    id: 'preview',
    page: '/dashboard/item/new',
    target: '[data-tour="preview"]',
    soft: true, // превью — модалка поверх формы; не блокируем, чтобы юзер мог её закрыть
    title: 'Взгляд гостя',
    body: 'Нажмите «Посмотреть как у гостя» — увидите карточку глазами гостя. Осмотрите и закройте превью, чтобы продолжить.',
    placement: 'top',
    advanceOn: { event: 'preview-closed' },
  },
  {
    id: 'save',
    page: '/dashboard/item/new',
    target: '[data-tour="save-dish"]',
    title: 'Сохраните блюдо',
    body: 'Всё готово. Нажмите «Добавить блюдо» — карбонара появится в меню.',
    placement: 'top',
    advanceOn: { event: 'item-saved' },
  },
  {
    id: 'done',
    page: '/dashboard/menu',
    target: null,
    title: 'Готово! 🎉',
    body: 'Карбонара в вашем меню. Так же добавляйте любые блюда — Plate посчитает КБЖУ, выход и фуд-кост за вас.',
    showNext: true,
  },
]
