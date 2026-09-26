"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import {
  AUDIT_CATEGORIES,
  AUDIT_RESULTS,
  AUDIT_SEVERITIES,
} from "@/features/audit/schema";

/** Nilai Select yang berarti "tanpa filter"; memilihnya menghapus key URL. */
const ALL_VALUE = "all";
const SEARCH_DEBOUNCE_MS = 300;

type FilterOption = {
  value: string;
  label: string;
};

export type AuditFiltersProps = {
  /** Nilai searchParams hasil parse di server; string kosong berarti tidak aktif. */
  initialCategory?: string;
  initialSeverity?: string;
  initialResult?: string;
  initialAction?: string;
  /**
   * `actorId` tidak punya kontrol di bar ini, tetap diteruskan supaya tombol
   * Reset muncul juga saat hanya filter tersebut yang aktif.
   */
  initialActorId?: string;
};

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <Select
      value={value === "" ? ALL_VALUE : value}
      onValueChange={(next: string | null) => {
        onChange(next);
      }}
    >
      <SelectTrigger className="w-full sm:w-44" aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Bar filter audit berbasis URL. Client leaf: satu-satunya state adalah nilai
 * input pencarian; sumber kebenaran filter tetap `searchParams`, jadi pilihan
 * bisa dibagikan lewat URL dan tombol back browser tetap bekerja.
 */
export function AuditFilters({
  initialCategory = "",
  initialSeverity = "",
  initialResult = "",
  initialAction = "",
  initialActorId = "",
}: AuditFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(initialAction);
  const [appliedAction, setAppliedAction] = useState(initialAction);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sinkronisasi dua arah tanpa `setState` di dalam effect: `searchParams`
  // berubah → input mengikuti (mis. setelah Reset atau navigasi browser).
  // Nilai yang sudah kita_request sendiri tidak ikut menimpa, jadi ketikan
  // pengguna tidak terpotong oleh navigasi yang baru saja dikirim.
  if (initialAction !== appliedAction) {
    setAppliedAction(initialAction);
    setInputValue(initialAction);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const { basePath, filterKeys, filters, options } = AUDIT_PAGE_CONFIG;

  const navigate = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    // Filter berubah berarti hasil halaman berubah; halaman lama tidak valid lagi.
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  };

  const applySearch = (raw: string) => {
    const next = raw.trim().slice(0, filters.searchMaxLength);

    setAppliedAction(next);

    if (next === appliedAction) {
      return;
    }

    navigate({ action: next });
  };

  const hasActiveFilter =
    initialCategory !== "" ||
    initialSeverity !== "" ||
    initialResult !== "" ||
    initialAction !== "" ||
    initialActorId !== "";

  const resetFilters = () => {
    if (timer.current) clearTimeout(timer.current);

    const params = new URLSearchParams(window.location.search);

    for (const key of filterKeys) {
      params.delete(key);
    }

    params.delete("page");

    // Nilai input TIDAK dikosongkan di sini: `searchParams` baru sampai setelah
    // respons server, dan 상태 lokal yang diubah duluan akan ditimpa render
    // berikutnya sebelum URL benar-benar berubah.
    startTransition(() => {
      router.replace(basePath, { scroll: false });
    });
  };

  return (
    <section
      aria-label={filters.label}
      aria-busy={isPending}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={inputValue}
          maxLength={filters.searchMaxLength}
          placeholder={filters.searchPlaceholder}
          aria-label={filters.searchLabel}
          className="pl-8"
          onChange={(event) => {
            const value = event.target.value;

            setInputValue(value);

            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              applySearch(value);
            }, SEARCH_DEBOUNCE_MS);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;

            event.preventDefault();

            if (timer.current) clearTimeout(timer.current);
            applySearch(event.currentTarget.value);
          }}
        />
      </div>
      <FilterSelect
        label={filters.categoryLabel}
        allLabel={filters.categoryAll}
        value={initialCategory}
        options={AUDIT_CATEGORIES.map((category) => ({
          value: category,
          label: options.category[category],
        }))}
        onChange={(value) => {
          navigate({ category: value === ALL_VALUE ? undefined : (value ?? undefined) });
        }}
      />
      <FilterSelect
        label={filters.severityLabel}
        allLabel={filters.severityAll}
        value={initialSeverity}
        options={AUDIT_SEVERITIES.map((severity) => ({
          value: severity,
          label: options.severity[severity],
        }))}
        onChange={(value) => {
          navigate({ severity: value === ALL_VALUE ? undefined : (value ?? undefined) });
        }}
      />
      <FilterSelect
        label={filters.resultLabel}
        allLabel={filters.resultAll}
        value={initialResult}
        options={AUDIT_RESULTS.map((result) => ({
          value: result,
          label: options.result[result],
        }))}
        onChange={(value) => {
          navigate({ result: value === ALL_VALUE ? undefined : (value ?? undefined) });
        }}
      />
      {hasActiveFilter ? (
        <Button
          type="button"
          variant="ghost"
          aria-label={filters.reset}
          onClick={resetFilters}
        >
          <RotateCcwIcon aria-hidden="true" />
          {filters.reset}
        </Button>
      ) : null}
      {isPending ? (
        <span role="status" className="text-xs text-muted-foreground">
          {filters.pending}
        </span>
      ) : null}
    </section>
  );
}
