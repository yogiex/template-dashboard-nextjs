import { Plus } from "lucide-react";

import { landingConfig } from "@/config/public-pages";

type FaqItem = (typeof landingConfig)["faq"][number];

interface FaqAccordionProps {
  items?: readonly FaqItem[];
}

export function FaqAccordion({ items = landingConfig.faq }: FaqAccordionProps) {
  return (
    <section id="faq" className="border-b border-border py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 max-w-md">
          <span className="font-mono text-xs tracking-widest text-primary uppercase">
            FAQ
          </span>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Pertanyaan umum
          </h2>
        </div>

        <div className="divide-y border-t border-border">
          {items.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45 group-open:text-primary motion-reduce:transition-none"
                />
              </summary>
              <p className="max-w-2xl pr-8 pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
