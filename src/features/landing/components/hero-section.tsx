import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/public-pages";

type HeroCopy = (typeof landingConfig)["hero"];

interface HeroSectionProps {
  copy?: HeroCopy;
}

const NODE_OFFSETS = [10, 35, 60, 85] as const;

export function HeroSection({ copy = landingConfig.hero }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 opacity-15" />
        <div className="bg-primary/20 absolute -top-1/2 left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-lime-400/10 blur-[100px]" />
        <div className="bg-noise absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1fr_auto] md:items-center md:py-32">
        <div className="flex flex-col items-start gap-6">
          <span className="animate-reveal inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {copy.eyebrow}
          </span>

          <h1 className="animate-reveal-delay-1 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {copy.headline}
            <br />
            <span className="bg-gradient-to-r from-primary to-lime-500 bg-clip-text text-transparent">
              {copy.headlineAccent}
            </span>
          </h1>

          <p className="animate-reveal-delay-2 max-w-lg text-balance text-lg text-muted-foreground">
            {copy.subheadline}
          </p>

          <div className="animate-reveal-delay-3 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group h-11"
              render={<Link href={copy.primaryCta.href} />}
            >
              {copy.primaryCta.label}
              <ArrowRight
                aria-hidden
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              render={<Link href={copy.secondaryCta.href} />}
            >
              {copy.secondaryCta.label}
            </Button>
          </div>

          <p className="animate-reveal-delay-4 text-xs text-muted-foreground">
            {copy.microcopy}
          </p>
        </div>

        <div aria-hidden className="animate-reveal-delay-3 hidden md:block">
          <div className="relative h-80 w-64">
            <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
            {NODE_OFFSETS.map((offset, index) => (
              <div
                key={offset}
                className="absolute left-0 flex items-center gap-3"
                style={{ top: `${offset}%` }}
              >
                <span className="h-2 w-2 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background" />
                <span className="h-px w-8 bg-border" />
                <span className="font-mono text-xs text-muted-foreground">
                  {`0${index + 1}`}
                </span>
              </div>
            ))}
            <div className="absolute -right-4 top-8 w-48 rotate-3 rounded-xl border border-border bg-card p-4 shadow-xl transition-transform hover:rotate-0 motion-reduce:transition-none">
              <div className="bg-primary/30 mb-3 h-2 w-16 rounded-full" />
              <div className="space-y-2">
                <div className="bg-muted h-1.5 w-full rounded-full" />
                <div className="bg-muted h-1.5 w-4/5 rounded-full" />
                <div className="bg-muted h-1.5 w-3/5 rounded-full" />
              </div>
              <div className="mt-4 flex gap-1">
                <div className="bg-primary/20 h-6 w-6 rounded-md" />
                <div className="h-6 w-6 rounded-md bg-lime-400/30" />
                <div className="bg-muted h-6 w-6 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
