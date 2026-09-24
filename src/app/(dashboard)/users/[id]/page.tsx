import { notFound } from "next/navigation"

type UserDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({
  params,
}: UserDetailPageProps) {
  const { id } = await params

  if (id === "0") {
    notFound()
  }

  return <div className="p-6">Detail user: {id}</div>
}
