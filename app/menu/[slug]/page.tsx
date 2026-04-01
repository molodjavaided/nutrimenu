import MenuClientWrapper from '@/components/menu/MenuClientWrapper'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params
  return <MenuClientWrapper slug={slug} />
}