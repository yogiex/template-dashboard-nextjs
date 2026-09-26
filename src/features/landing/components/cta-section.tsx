import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/public-pages";

export function CtaSection() {
  const { title, description, primaryCta, secondaryCta } = landingConfig.cta;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-8 py-16 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-lime-400/20 blur-[100px]" />
            <div className="bg-noise absolute inset-0 opacity-[0.05]" />
          </div>

          <div className="relative">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
              {title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-emerald-100/80">
              {description}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="group h-11 bg-lime-400 text-emerald-950 hover:bg-lime-300"
                render={<Link href={primaryCta.href} />}
              >
                {primaryCta.label}
                <ArrowRight
                  aria-hidden
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-emerald-700/50 bg-transparent text-emerald-50 hover:bg-emerald-900/50 hover:text-emerald-50"
                render={<Link href={secondaryCta.href} />}
              >
                {secondaryCta.label}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
