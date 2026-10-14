import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { helpConfig, type HelpFaqItem } from "@/config/public-pages";
import { HelpSearchWrapper } from "@/features/help/components/help-search-wrapper";

export const metadata: Metadata = {
  title: "Bantuan",
  description: `Pusat bantuan dan pertanyaan umum untuk ${siteConfig.name}.`,
  alternates: { canonical: "/help" },
  openGraph: {
    title: `Bantuan — ${siteConfig.name}`,
    description: `Temukan jawaban atas pertanyaan yang paling sering diajukan.`,
    type: "website",
    url: `${siteConfig.url}/help`,
  },
};

export default function HelpPage() {
  const categories = helpConfig.categories.map((c) => ({
    id: c.id,
    title: c.title,
    faq: Array.from(c.faq),
  }));

  const allItems: HelpFaqItem[] = helpConfig.categories.flatMap((c) =>
    Array.from(c.faq),
  );

  const categoryMap: Record<string, HelpFaqItem[]> = {};
  for (const c of categories) {
    categoryMap[c.id] = c.faq;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <header className="space-y-2">
        <span className="font-mono text-xs tracking-widest text-primary uppercase">
          Bantuan
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {helpConfig.title}
        </h1>
        <p className="text-muted-foreground">{helpConfig.description}</p>
      </header>

      <HelpSearchWrapper allItems={allItems} categoryMap={categoryMap} />
    </div>
  );
}
