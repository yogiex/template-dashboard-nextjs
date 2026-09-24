import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/public-pages";

export const metadata: Metadata = {
  title: "Beranda",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  const { hero, features } = landingConfig;

  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {hero.badge}
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          {hero.headline}
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{hero.description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href={hero.primaryCta.href} />}>
            {hero.primaryCta.label}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href={hero.secondaryCta.href} />}
          >
            {hero.secondaryCta.label}
          </Button>
        </div>
      </section>

      <section
        aria-label="Fitur utama"
        className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3"
      >
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border bg-card p-6 text-card-foreground"
          >
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
