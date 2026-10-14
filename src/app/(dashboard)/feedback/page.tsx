import type { Metadata } from "next";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageShell } from "@/components/layout/page-shell";
import { FEEDBACK_PAGE_CONFIG } from "@/config/feedback-page";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";

export const metadata: Metadata = { title: "Umpan Balik" };

export default function FeedbackPage() {
  return (
    <PageShell
      title={FEEDBACK_PAGE_CONFIG.title}
      description={FEEDBACK_PAGE_CONFIG.description}
    >
      <div className="max-w-2xl space-y-6">
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>{FEEDBACK_PAGE_CONFIG.infoAlert}</AlertDescription>
        </Alert>
        <FeedbackForm />
      </div>
    </PageShell>
  );
}
