"use client"

import { useEffect, useState, type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserSchema, type User } from "@/features/user/schema"

type UserActionResult = { success: boolean; message?: string; error?: { message: string }; fieldErrors?: Record<string, string[]> }

type UserFormValues = {
  name: string
  email: string
  role: "admin" | "editor" | "viewer"
  status: "active" | "pending" | "suspended"
}

type UserFormDialogProps = {
  user?: User
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
}

function valuesFor(user?: User): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "viewer",
    status: user?.status ?? "active",
  }
}

export function UserFormDialog({ user, open, onOpenChange, trigger }: UserFormDialogProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const form = useForm<UserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: valuesFor(user),
  })

  useEffect(() => {
    if (open) {
      form.reset(valuesFor(user))
      form.clearErrors()
    }
  }, [open, user, form])

  const submitting = form.formState.isSubmitting

  const handleOpenChange = (next: boolean) => {
    if (submitting) return
    setActionError(null)
    onOpenChange(next)
  }

  const onSubmit = async (_values: UserFormValues) => {
    if (form.formState.isSubmitting) return
    setActionError(null)
    form.clearErrors()
    const result: UserActionResult = { success: true, message: "Demo mode - backend not connected" }

    if (!result.success) {
      setActionError(result.error?.message ?? "Unknown error")
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages[0]) form.setError(field as keyof UserFormValues, { message: messages[0] })
        }
      }
      return
    }

    toast.success(user ? `User "${user.name}" diperbarui` : "User berhasil dibuat")
    onOpenChange(false)
    form.reset(valuesFor(user))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Tambah user"}</DialogTitle>
          <DialogDescription>{user ? "Perbarui data user di bawah ini." : "Isi data user untuk membuat akun baru."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {actionError ? <Alert variant="destructive" role="alert"><AlertDescription>{actionError}</AlertDescription></Alert> : null}
            <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nama</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Role</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">admin</SelectItem><SelectItem value="editor">editor</SelectItem><SelectItem value="viewer">viewer</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="pending">pending</SelectItem><SelectItem value="suspended">suspended</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button><Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
