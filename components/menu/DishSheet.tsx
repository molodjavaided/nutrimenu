'use client'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { IngredientRef, MenuItem, SelectedModifiers, SelectedVariants } from '@/types'
import DishSheetContent from './DishSheetContent'

interface Props {
  item: MenuItem | null
  open: boolean
  onClose: () => void
  onAdd: (item: MenuItem, quantity: number, variants: SelectedVariants, modifiers: SelectedModifiers, label: string) => void
  venueIngredientRefs?: IngredientRef[]
}

const BG = '#1C1726'

export default function DishSheet({ item, open, onClose, onAdd, venueIngredientRefs = [] }: Props) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="dish-sheet max-w-full mx-auto p-0 overflow-hidden h-[90vh] sm:inset-auto! sm:top-[7.5vh]! sm:left-[calc(50%-220px)]! sm:w-[440px]! sm:max-w-[440px]! sm:h-[85vh]! sm:max-h-[680px]! sm:rounded-3xl! sm:[transform:none]!"
        style={{ background: BG, border: 'none', gap: 0 }}
      >
        {item && (
          <DishSheetContent
            item={item}
            onClose={onClose}
            onAdd={onAdd}
            venueIngredientRefs={venueIngredientRefs}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
