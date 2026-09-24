import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-svh">{children}</div>;
}
