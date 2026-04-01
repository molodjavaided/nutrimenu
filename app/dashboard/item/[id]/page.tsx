'use client'

import { useSearchParams, useParams } from 'next/navigation'
import { Suspense } from 'react'
import ItemForm from '@/components/dashboard/ItemForm'

function EditItemContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const itemId = String(params.id)
  const categoryId = searchParams.get('categoryId') ?? ''
  return <ItemForm itemId={itemId} categoryId={categoryId} />
}

export default function EditItemPage() {
  return (
    <Suspense>
      <EditItemContent />
    </Suspense>
  )
}