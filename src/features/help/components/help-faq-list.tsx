import { Plus } from "lucide-react";

import type { HelpFaqItem } from "@/config/public-pages";

interface HelpFaqListProps {
  items: readonly HelpFaqItem[];
}

export function HelpFaqList({ items }: HelpFaqListProps) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Tidak ada hasil yang cocok dengan pencarian Anda.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-xl border">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45 group-open:text-primary motion-reduce:transition-none"
            />
          </summary>
          <p className="max-w-2xl px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
