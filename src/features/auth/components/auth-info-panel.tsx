import { getLoginIcon } from "@/features/auth/components/login-icon-map";
import type { AuthPageConfig } from "@/features/auth/schema";

type AuthInfoPanelProps = {
  config: AuthPageConfig;
};

export function AuthInfoPanel({ config }: AuthInfoPanelProps) {
  const { branding } = config;

  return (
    <div className="relative flex h-full min-h-svh w-full flex-col justify-between p-10 text-emerald-50 lg:p-14">
      <div>
        <span className="text-xl font-semibold tracking-tight">
          {branding.appName}
        </span>
      </div>

      <div className="my-auto max-w-xl space-y-8 py-16">
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-balance">
          {branding.tagline}
        </h2>
        <ul className="space-y-6">
          {branding.highlights.map((highlight) => {
            const Icon = getLoginIcon(highlight.icon);

            return (
              <li key={highlight.title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900/60 ring-1 ring-emerald-800/60">
                  <Icon className="size-5 text-emerald-300" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-medium text-emerald-50">
                    {highlight.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                    {highlight.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-sm text-emerald-100/60">{config.footer.copyright}</p>
    </div>
  );
}
