"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { IntegrationCard } from "@/features/integration/components/integration-card";
import { IntegrationDetailSheet } from "@/features/integration/components/integration-detail-sheet";
import { INTEGRATIONS_CONFIG, type IntegrationCategory } from "@/config/integrations";
import { loadIntegrations, toggleIntegration, type Integration } from "@/features/integration/service";

const C = INTEGRATIONS_CONFIG;

export function IntegrationGrid() {
  const [items, setItems] = useState(() => loadIntegrations());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const [selected, setSelected] = useState<Integration | null>(null);
  const [open, setOpen] = useState(false);

  const categories = useMemo(
    () => ["all" as const, "communication", "commerce", "devtool", "analytics"] as const,
    [],
  );

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, query]);

  const toggle = (id: string) => {
    setItems(toggleIntegration(id));
  };

  const openDetail = (item: Integration) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={C.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? C.categories.all : C.categories[c]}
            </button>
          ))}
        </div>
        {(query || category !== "all") ? (
          <button
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="font-medium">{C.empty.title}</p>
          <p className="text-sm text-muted-foreground">{C.empty.description}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              onToggle={toggle}
              onOpen={openDetail}
            />
          ))}
        </div>
      )}

      <IntegrationDetailSheet
        item={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
