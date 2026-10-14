"use client";

import { useState, useCallback } from "react";

import { HelpSearch } from "@/features/help/components/help-search";
import { HelpFaqList } from "@/features/help/components/help-faq-list";
import type { HelpFaqItem } from "@/config/public-pages";

interface HelpSearchWrapperProps {
  allItems: readonly HelpFaqItem[];
  categoryMap: Record<string, HelpFaqItem[]>;
}

export function HelpSearchWrapper({ allItems, categoryMap }: HelpSearchWrapperProps) {
  const [filteredItems, setFilteredItems] = useState<HelpFaqItem[]>([...allItems]);

  const handleFilter = useCallback(
    (query: string, category: string) => {
      let result = allItems as HelpFaqItem[];

      if (category !== "all") {
        const catItems = categoryMap[category];
        if (catItems) result = catItems;
      }

      if (query.trim()) {
        const q = query.toLowerCase();
        result = result.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q),
        );
      }

      setFilteredItems(result);
    },
    [allItems, categoryMap],
  );

  return (
    <div className="space-y-6">
      <HelpSearch onFilter={handleFilter} />
      <HelpFaqList items={filteredItems} />
    </div>
  );
}
