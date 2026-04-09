import { NutriBadge } from './NutriBadge'

interface Nutri {
  calories: number
  protein: number
  fat: number
  carbs: number
}

interface Props {
  nutri: Nutri
  className?: string
}

export function NutritionGrid({ nutri, className }: Props) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className ?? ''}`}>
      <NutriBadge label="" value={nutri.calories} unit=" ккал" variant="calorie" />
      <NutriBadge label="Б" value={nutri.protein} unit="г" />
      <NutriBadge label="Ж" value={nutri.fat} unit="г" />
      <NutriBadge label="У" value={nutri.carbs} unit="г" />
    </div>
  )
}
