import {
  blogPostListSchema,
  blogPostSchema,
  blogSettingsSchema,
  createPostSchema,
  updatePostSchema,
  DEFAULT_BLOG_SETTINGS,
  type BlogPost,
} from "@/features/blog/schema";

export type { BlogPost };

import { slugify, ensureUniqueSlug } from "@/features/blog/lib/slug";
import { clientLogger } from "@/lib/logger-client";

export { slugify };

const POSTS_KEY = "blog.posts";
const SETTINGS_KEY = "blog.settings";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSettings() {
  if (!isBrowser()) return { ...DEFAULT_BLOG_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_BLOG_SETTINGS };
    const parsed = blogSettingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      clientLogger.info("blog.settings.invalid");
      return { ...DEFAULT_BLOG_SETTINGS };
    }
    return parsed.data;
  } catch (error) {
    clientLogger.info("blog.settings.load.failed", { err: error });
    return { ...DEFAULT_BLOG_SETTINGS };
  }
}

export function saveSettings(settings: (typeof DEFAULT_BLOG_SETTINGS) & {}) {
  if (!isBrowser()) return false;
  const parsed = blogSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    clientLogger.warn("blog.settings.save.invalid");
    return false;
  }
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed.data));
    return true;
  } catch (error) {
    clientLogger.warn("blog.settings.save.failed", { err: error });
    return false;
  }
}

function seedPosts() {
  const now = new Date().toISOString();
  return [
    {
      id: "bp_seed_welcome",
      slug: "selamat-datang-di-blog",
      title: "Selamat Datang di Blog",
      excerpt: "Template blog CMS siap digunakan.",
      content: "Ini adalah post contoh. Edit atau hapus post ini kapan saja.",
      tags: ["announce"],
      status: "published" as const,
      author: "Admin",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    {
      id: "bp_seed_draft",
      slug: "draft-catatan-internal",
      title: "Draft Catatan Internal",
      excerpt: "Contoh post dengan status draft.",
      content: "Rahasia: post ini belum dipublikasikan.",
      tags: ["internal"],
      status: "draft" as const,
      author: "Admin",
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    },
  ];
}

export function loadPosts() {
  if (!isBrowser()) return seedPosts();
  try {
    const raw = window.localStorage.getItem(POSTS_KEY);
    if (!raw) {
      const seeded = seedPosts();
      savePosts(seeded);
      return seeded;
    }
    const parsed = blogPostListSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      clientLogger.warn("blog.posts.invalid");
      const seeded = seedPosts();
      savePosts(seeded);
      return seeded;
    }
    return parsed.data;
  } catch (error) {
    clientLogger.error("blog.posts.load.failed", error);
    const seeded = seedPosts();
    savePosts(seeded);
    return seeded;
  }
}

export function savePosts(list: BlogPost[]): boolean {
  if (!isBrowser()) return false;
  const parsed = blogPostListSchema.safeParse(list);
  if (!parsed.success) return false;
  try {
    window.localStorage.setItem(POSTS_KEY, JSON.stringify(parsed.data));
    return true;
  } catch (error) {
    clientLogger.error("blog.posts.save.failed", error);
    return false;
  }
}

export function listPublished(): BlogPost[] {
  return loadPosts()
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
}

export function findBySlug(slug: string): BlogPost | undefined {
  return loadPosts().find((p) => p.slug === slug);
}

export function createPost(input: unknown): { post: BlogPost | null; ok: boolean } {
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return { post: null, ok: false };
  const now = new Date().toISOString();
  const posts = loadPosts();
  const used = new Set(posts.map((p) => p.slug));
  const slug = ensureUniqueSlug(slugify(parsed.data.title), used);
  const post = blogPostSchema.parse({
    id: `bp_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14)}`,
    slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    content: parsed.data.content,
    tags: parsed.data.tags,
    status: "draft",
    author: parsed.data.author,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  });
  savePosts([post, ...posts]);
  return { post, ok: true };
}

export function updatePost(id: string, input: unknown): BlogPost | null {
  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return null;
  const posts = loadPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = blogPostSchema.parse({
    ...posts[idx],
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    content: parsed.data.content,
    tags: parsed.data.tags,
    author: parsed.data.author,
    updatedAt: new Date().toISOString(),
  });
  const next = [...posts];
  next[idx] = updated;
  savePosts(next);
  return updated;
}

export function deletePost(id: string): boolean {
  if (!id) return false;
  const posts = loadPosts();
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length) return false;
  savePosts(next);
  return true;
}

export function togglePublish(id: string, published: boolean): boolean {
  const posts = loadPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  const next = [...posts];
  next[idx] = {
    ...next[idx],
    status: published ? "published" : "draft",
    publishedAt: published ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
  savePosts(next);
  return true;
}

export function resetPosts(): BlogPost[] {
  const seeded = seedPosts();
  savePosts(seeded);
  return seeded;
}
