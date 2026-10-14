"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createTeamMemberSchema,
  type TeamFormValues,
  type TeamMember,
  type TeamActionResult,
} from "@/features/team/schema";

interface TeamFormDialogProps {
  member?: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement | null;
}

function valuesFor(member?: TeamMember | null): TeamFormValues {
  return {
    name: member?.name ?? "",
    email: member?.email ?? "",
    role: member?.role ?? "viewer",
    status: member?.status ?? "active",
  };
}

export function TeamFormDialog({
  member,
  open,
  onOpenChange,
  trigger,
}: TeamFormDialogProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: valuesFor(member),
  });

  const isSubmitting = form.formState.isSubmitting;
  const [actionError, setActionError] = useState<string | null>(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      if (open && !hasLoaded) {
        form.reset(valuesFor(member));
        form.clearErrors();
        setActionError(null);
        setHasLoaded(true);
      }
      if (!open) {
        setHasLoaded(false);
      }
    });
  }, [open, member, form, hasLoaded]);

  const onSubmit = async (_values: TeamFormValues) => {
    if (form.formState.isSubmitting) return;
    setActionError(null);
    form.clearErrors();

    const result: TeamActionResult = {
      success: true,
      message: "Demo mode - backend not connected",
    };

    if (!result.success) {
      setActionError(result.fieldErrors?.name?.[0] ?? null);
      return;
    }

    toast.success(
      member
        ? `Member "${member.name}" diperbarui (mock)`
        : "Member berhasil dibuat (mock)",
    );
    onOpenChange(false);
    form.reset(valuesFor(member));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger ?? undefined} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {member ? "Edit Member" : "Tambah Member"}
          </DialogTitle>
          <DialogDescription>
            {member
              ? "Perbarui informasi member tim."
              : "Tambahkan anggota tim baru."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            autoComplete="off"
            aria-busy={isSubmitting}
          >
            {actionError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nama lengkap"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="nama@perusahaan.com"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Peran</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
