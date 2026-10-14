import type { Metadata } from "next";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/layout/page-shell";
import { PROFILE_PAGE_CONFIG } from "@/config/profile-page";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata: Metadata = { title: "Profil" };

const MOCK_USER = {
  name: "Demo User",
  email: "demo@example.com",
  role: "Admin",
  memberSince: "2026-01-15",
} as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function ProfilePage() {
  const initials = getInitials(MOCK_USER.name);

  return (
    <PageShell
      title={PROFILE_PAGE_CONFIG.title}
      description={PROFILE_PAGE_CONFIG.description}
    >
      <div className="max-w-2xl space-y-6">
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>{PROFILE_PAGE_CONFIG.infoAlert}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>
              Detail akun demo untuk pengembangan UI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-lg font-semibold">{MOCK_USER.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {MOCK_USER.email}
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {PROFILE_PAGE_CONFIG.roleLabel}
                </dt>
                <dd className="mt-1 text-sm">{MOCK_USER.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {PROFILE_PAGE_CONFIG.memberSinceLabel}
                </dt>
                <dd className="mt-1 text-sm">
                  {formatDate(MOCK_USER.memberSince)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profil</CardTitle>
            <CardDescription>
              Perubahan hanya tersimpan di browser (localStorage).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                name: MOCK_USER.name,
                email: MOCK_USER.email,
                bio: "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
