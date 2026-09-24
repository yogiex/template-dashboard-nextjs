import type { Metadata } from "next";

import { termsDoc } from "@/config/public-pages";
import { LegalArticle } from "@/features/legal/components/legal-article";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalArticle doc={termsDoc} />;
}
