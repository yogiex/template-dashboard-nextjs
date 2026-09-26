"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UserFormDialog } from "@/features/user/components/user-form-dialog"

export function CreateUserButton() {
  const [open, setOpen] = useState(false)

  return (
    <UserFormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button size="sm"><Plus aria-hidden="true" />Tambah user</Button>}
    />
  )
}
