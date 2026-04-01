'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ItemForm from '@/components/dashboard/ItemForm'

function NewItemContent() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? ''
  return <ItemForm categoryId={categoryId} />
}

export default function NewItemPage() {
  return (
    <Suspense>
      <NewItemContent />
    </Suspense>
  )
}