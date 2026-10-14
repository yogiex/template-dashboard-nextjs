import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { AI_CONFIG } from "@/config/ai";
import { AiChat } from "@/features/ai/components/ai-chat";

export const metadata: Metadata = { title: AI_CONFIG.title };

export default function AiPage() {
  return (
    <PageShell title={AI_CONFIG.title} description={AI_CONFIG.description}>
      <AiChat />
    </PageShell>
  );
}
