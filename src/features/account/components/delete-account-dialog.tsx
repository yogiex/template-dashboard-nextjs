"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { scheduleDeleteAccount } from "@/features/account/service";

const C = ACCOUNT_SETTINGS_CONFIG;

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const isConfirmed = confirmText === C.delete.confirmWord;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setPending(true);
    try {
      await scheduleDeleteAccount();
      toast.success(C.delete.scheduledLabel);
      onOpenChange(false);
      setConfirmText("");
    } catch (error) {
      void error;
      toast.error("Gagal menjadwalkan penghapusan akun.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{C.delete.confirmLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            {C.delete.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-confirm" className="text-sm font-medium">
            {C.delete.confirmPlaceholder}
          </label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={C.delete.confirmPlaceholder}
            className="h-10"
            autoComplete="off"
          />
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Modul backend penghapusan akun di lokasi produksi tidak disimulasikan.
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={() => setConfirmText("")}>
            {C.delete.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !isConfirmed}
            onClick={handleDelete}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {C.delete.buttonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} className="h-10">
        {C.delete.buttonLabel}
      </Button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
