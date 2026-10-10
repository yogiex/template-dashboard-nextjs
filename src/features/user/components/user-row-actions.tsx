"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { UserFormDialog } from "@/features/user/components/user-form-dialog"
import type { User } from "@/features/user/types"

export function UserRowActions({ user }: { user: User }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const remove = () => {
    if (isPending) return
    startTransition(async () => {
      const result = { success: true, message: "Demo mode - backend not connected" }
      if (result.success) {
        setDeleteOpen(false)
        toast.success(`User "${user.name}" dihapus`)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <UserFormDialog
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={<Button variant="ghost" size="icon" aria-label={`Edit ${user.name}`} disabled={isPending}><Pencil aria-hidden="true" /></Button>}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Hapus ${user.name}`} disabled={isPending} />}><Trash2 aria-hidden="true" /></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus user?</AlertDialogTitle><AlertDialogDescription>User “{user.name}” akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={isPending} onClick={(event) => { event.preventDefault(); remove() }}>{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
