import type { Metadata } from "next";

import { privacyDoc } from "@/config/public-pages";
import { LegalArticle } from "@/features/legal/components/legal-article";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalArticle doc={privacyDoc} />;
}
