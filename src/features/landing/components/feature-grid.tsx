import {
  LayoutDashboard,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { landingConfig } from "@/config/public-pages";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "shield-check": ShieldCheck,
  zap: Zap,
};

type FeatureItem = (typeof landingConfig)["features"][number];

interface FeatureGridProps {
  features?: readonly FeatureItem[];
}

export function FeatureGrid({
  features = landingConfig.features,
}: FeatureGridProps) {
  return (
    <section id="features" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex items-end justify-between gap-8">
          <div>
            <span className="font-mono text-xs tracking-widest text-primary uppercase">
              Kapabilitas
            </span>
            <h2 className="mt-2 max-w-md text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Fitur yang tidak menghambat
            </h2>
          </div>
          <div className="bg-border hidden h-px flex-1 md:block" />
        </div>

        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = ICONS[feature.icon] ?? Zap;
            return (
              <li
                key={feature.title}
                className="group bg-background p-8 transition-colors hover:bg-muted/50"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
