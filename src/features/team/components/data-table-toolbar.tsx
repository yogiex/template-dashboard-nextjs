"use client";

import { useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TeamRole } from "@/features/team/schema";

interface DataTableToolbarProps {
  initialQuery?: string;
  initialRole?: string;
}

export function DataTableToolbar({ initialQuery, initialRole }: DataTableToolbarProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(initialQuery ?? "");
  const [role, setRole] = useState(initialRole ?? "all");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  const pushParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "" || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/team?${query}` : "/team", { scroll: false });
    });
  };

  const hasActiveFilters = inputValue !== "" || role !== "all";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Cari nama atau email..."
          className="pl-8"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(
              () => pushParams({ q: e.target.value.trim().slice(0, 100) }),
              300,
            );
          }}
          aria-label="Cari team member"
        />
      </div>
      <Select
        value={role}
        onValueChange={(val) => {
          setRole(val);
          pushParams({ role: val });
        }}
      >
        <SelectTrigger aria-label="Filter per role">
          <SelectValue placeholder="Semua peran" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua peran</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setInputValue("");
            setRole("all");
            router.replace("/team", { scroll: false });
          }}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
