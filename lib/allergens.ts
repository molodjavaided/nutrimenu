export interface AllergenDef {
  id: string
  label: string
  emoji: string
}

export const ALLERGENS: AllergenDef[] = [
  { id: 'gluten',     label: 'Глютен',        emoji: '🌾' },
  { id: 'milk',       label: 'Молоко',         emoji: '🥛' },
  { id: 'eggs',       label: 'Яйца',           emoji: '🥚' },
  { id: 'fish',       label: 'Рыба',           emoji: '🐟' },
  { id: 'shellfish',  label: 'Моллюски',       emoji: '🦪' },
  { id: 'peanuts',    label: 'Арахис',         emoji: '🥜' },
  { id: 'nuts',       label: 'Орехи',          emoji: '🌰' },
  { id: 'soy',        label: 'Соя',            emoji: '🫘' },
  { id: 'sesame',     label: 'Кунжут',         emoji: '🌱' },
  { id: 'mustard',    label: 'Горчица',        emoji: '🌿' },
  { id: 'celery',     label: 'Сельдерей',      emoji: '🥬' },
  { id: 'sulphites',  label: 'Сульфиты',       emoji: '🍷' },
  { id: 'lupin',      label: 'Люпин',          emoji: '🌸' },
  { id: 'crustaceans',label: 'Ракообразные',   emoji: '🦐' },
]

export function getAllergenById(id: string): AllergenDef | undefined {
  return ALLERGENS.find(a => a.id === id)
}
