export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function ensureUniqueSlug(desired: string, used: Set<string>): string {
  if (!desired) return ensureUniqueSlug("post", used);
  let candidate = desired;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${desired}-${n}`;
    n += 1;
  }
  return candidate;
}