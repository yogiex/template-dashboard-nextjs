"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamFormDialog } from "@/features/team/components/team-form-dialog";

export function CreateTeamButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Tambah Member
      </Button>
      <TeamFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
