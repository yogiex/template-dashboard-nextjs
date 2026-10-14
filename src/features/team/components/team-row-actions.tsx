"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeamFormDialog } from "@/features/team/components/team-form-dialog";
import type { TeamMember } from "@/features/team/types";

interface TeamRowActionsProps {
  member: TeamMember;
}

export function TeamRowActions({ member }: TeamRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    if (isPending) return;
    startTransition(async () => {
      const result = { success: true, message: "Demo mode - backend not connected" };
      if (result.success) {
        setDeleteOpen(false);
        toast.success(`Member "${member.name}" dihapus`);
      } else {
        toast.error(result.message ?? "Gagal menghapus");
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditOpen(true)}
        aria-label={`Edit ${member.name}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDeleteOpen(true)}
        aria-label={`Hapus ${member.name}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>

      <TeamFormDialog
        member={member}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus member?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${member.name}" akan dihapus dari tim. Tindakan ini tidak dapat dibatalkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
;<|end|><|start|>write to=assistant<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="path">
/home/mirage/Documents/code/nextjs/template-nextjs-dashboard/src/features/team/components/team-form-dialog.tsx