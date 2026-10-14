"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "cn";

import { ACTIVITY_PAGE_CONFIG } from "@/config/activity-page";
import { ACTIVITY_CATEGORIES } from "@/features/activity/schema";

const ALL_VALUE = "all";

export function ActivityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeCategory = searchParams.get("category") ?? ALL_VALUE;

  const setCategory = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === ALL_VALUE) {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    startTransition(() => {
      router.replace(`/settings/activity?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <nav aria-label="Filter kategori aktivitas" className="flex gap-1 overflow-x-auto border-b">
      {[ALL_VALUE, ...ACTIVITY_CATEGORIES].map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setCategory(cat)}
          className={cn(
            "border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
            activeCategory === cat
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {cat === ALL_VALUE
            ? ACTIVITY_PAGE_CONFIG.filterAll
            : ACTIVITY_PAGE_CONFIG.options.category[cat as (typeof ACTIVITY_CATEGORIES)[number]]}
        </button>
      ))}
    </nav>
  );
}
