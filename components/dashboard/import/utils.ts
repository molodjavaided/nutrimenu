export function pluralBlud(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'блюд'
  const r = n % 10
  if (r === 1) return 'блюдо'
  if (r >= 2 && r <= 4) return 'блюда'
  return 'блюд'
}

export function buildButtonLabel(dishCount: number, prepCount: number): string {
  const parts: string[] = []
  if (dishCount > 0) parts.push(`${dishCount} ${pluralBlud(dishCount)}`)
  if (prepCount > 0) parts.push(`${prepCount} заготовок`)
  return parts.length ? `Импортировать: ${parts.join(' + ')}` : 'Нечего импортировать'
}
