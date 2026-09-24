import type { LegalDoc } from "@/config/public-pages";

interface LegalArticleProps {
  doc: LegalDoc;
}

export function LegalArticle({ doc }: LegalArticleProps) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">
          Terakhir diperbarui: {doc.updatedAt}
        </p>
      </header>

      <p className="mt-8 text-muted-foreground">{doc.intro}</p>

      <div className="mt-10 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
