import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Layers,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { aboutConfig } from "@/config/public-pages";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Tentang",
  description: `Kenali misi, nilai, dan prinsip kerja di balik ${siteConfig.name}.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `Tentang — ${siteConfig.name}`,
    description: `Kenali misi, nilai, dan prinsip kerja di balik ${siteConfig.name}.`,
    type: "website",
    url: `${siteConfig.url}/about`,
  },
};

const VALUE_ICONS: Record<string, LucideIcon> = {
  security: Lock,
  performance: Sparkles,
  maintainability: Layers,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <header className="max-w-2xl space-y-6">
        <span className="font-mono text-xs tracking-widest text-primary uppercase">
          Tentang kami
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {aboutConfig.title}
        </h1>
        <p className="text-balance text-lg text-muted-foreground">
          {aboutConfig.description}
        </p>
      </header>

      <section className="mt-20 max-w-3xl space-y-4">
        <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
          <Compass className="size-6 text-primary" aria-hidden />
          Misi kami
        </h2>
        {aboutConfig.intro.map((paragraph) => (
          <p key={paragraph} className="text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="mt-20" aria-labelledby="about-values-title">
        <h2
          id="about-values-title"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Nilai kami
        </h2>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {aboutConfig.values.map((value, index) => {
            const Icon =
              VALUE_ICONS[aboutConfig.valueIcons[index] ?? ""] ?? Compass;

            return (
              <li key={value.title} className="bg-background p-8">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {value.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-20 max-w-3xl space-y-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Prinsip kerja
        </h2>
        <ul className="space-y-3 text-muted-foreground">
          {aboutConfig.principles.map((principle) => (
            <li key={principle.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 size-1 shrink-0 rounded-full bg-primary"
              />
              <span>
                <strong className="text-foreground">{principle.title}.</strong>{" "}
                {principle.description}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 rounded-2xl border border-border bg-muted/30 p-8 sm:p-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Ada pertanyaan?
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Kami senang mendengar feedback, ide fitur, atau sekadar menyapa.
            </p>
          </div>
          <Button
            size="lg"
            className="group h-11 shrink-0"
            render={<Link href={aboutConfig.cta.href} />}
          >
            {aboutConfig.cta.label}
            <ArrowRight
              aria-hidden
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Button>
        </div>
      </section>
    </div>
  );
}
