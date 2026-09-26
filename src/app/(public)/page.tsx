import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { CtaSection } from "@/features/landing/components/cta-section";
import { FaqAccordion } from "@/features/landing/components/faq-accordion";
import { FeatureGrid } from "@/features/landing/components/feature-grid";
import { HeroSection } from "@/features/landing/components/hero-section";
import { StepList } from "@/features/landing/components/step-list";

const title = `${siteConfig.name} — Dashboard modern untuk aplikasi Anda`;

export const metadata: Metadata = {
  title: "Beranda",
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: siteConfig.description,
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.description,
  },
};

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <StepList />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}
