import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Activity } from "@/features/dashboard/schema"

interface ActivityTableProps {
  activities: Activity[]
}

function formatRelativeTime(date: Date, now: Date): string {
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (diffMinutes < 1) return "baru saja"
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

export function ActivityTable({ activities }: ActivityTableProps) {
  if (activities.length === 0) return null

  const now = new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas Terbaru</CardTitle>
        <CardDescription>Tindakan terakhir di workspace Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Pengguna</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead className="w-32 text-right">Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Badge variant="secondary">{activity.userName}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {activity.action}{" "}
                  <span className="font-medium text-foreground">{activity.target}</span>
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                  <time dateTime={activity.createdAt.toISOString()}>
                    {formatRelativeTime(activity.createdAt, now)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
