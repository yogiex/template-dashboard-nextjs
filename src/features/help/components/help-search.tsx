"use client";

import { useState, useMemo } from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { helpConfig, type HelpCategory } from "@/config/public-pages";

interface HelpSearchProps {
  onFilter: (query: string, category: string) => void;
}

export function HelpSearch({ onFilter }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () =>
      [
        { id: "all", title: "Semua" },
        ...helpConfig.categories.map((c) => ({ id: c.id, title: c.title })),
      ] as const,
    [],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onFilter(value, category);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    onFilter(query, value);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={helpConfig.searchPlaceholder}
          className="pl-8"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          aria-label="Cari bantuan"
        />
      </div>
      <nav aria-label="Kategori bantuan" className="flex gap-1 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryChange(cat.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              category === cat.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.title}
          </button>
        ))}
      </nav>
    </div>
  );
}

export type { HelpCategory };
