import Link from "next/link";

type LoginFooterLinksProps = {
  links: Array<{ href: string; label: string }>;
};

export function LoginFooterLinks({ links }: LoginFooterLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Footer"
      className="flex justify-center gap-4 text-xs text-muted-foreground"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="underline-offset-4 hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
