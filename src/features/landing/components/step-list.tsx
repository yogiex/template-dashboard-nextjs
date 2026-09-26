import { landingConfig } from "@/config/public-pages";

type Step = (typeof landingConfig)["steps"][number];

interface StepListProps {
  steps?: readonly Step[];
}

export function StepList({ steps = landingConfig.steps }: StepListProps) {
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-md">
          <span className="font-mono text-xs tracking-widest text-primary uppercase">
            Alur kerja
          </span>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tiga langkah, langsung jalan
          </h2>
        </div>

        <ol className="relative grid gap-12 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden
            className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] bg-gradient-to-r from-primary via-primary/50 to-transparent md:block"
          />
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3">
              <span className="bg-background relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary font-mono text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
