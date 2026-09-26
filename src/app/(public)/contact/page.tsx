import type { Metadata } from "next";
import Link from "next/link";

import { contactConfig } from "@/config/public-pages";
import { ContactForm } from "@/features/contact/components/contact-form";

export const metadata: Metadata = {
  title: "Kontak",
  description: contactConfig.description,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Kontak — Dashboard",
    description: contactConfig.description,
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {contactConfig.title}
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            {contactConfig.description}
          </p>

          <div className="mt-8 space-y-4">
            <h2 className="text-xs font-semibold tracking-wider uppercase">
              Kanal lain
            </h2>
            <ul className="space-y-2 text-sm">
              {contactConfig.channels.map((channel) => (
                <li key={channel.href}>
                  <span className="text-muted-foreground">
                    {channel.label}:{" "}
                  </span>
                  <Link
                    href={channel.href}
                    className="underline underline-offset-4"
                  >
                    {channel.value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 space-y-4">
            <h2 className="text-xs font-semibold tracking-wider uppercase">
              Pertanyaan umum
            </h2>
            <div className="divide-y border-y">
              {contactConfig.faq.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:pt-12">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
