import { z } from "zod";

export type BlogPostStatus = z.infer<typeof blogPostStatusSchema>;
export const blogPostStatusSchema = z.enum(["draft", "published"]);

export const blogPostSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.string().min(1).max(140).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(140),
  excerpt: z.string().max(300),
  content: z.string().max(60000),
  tags: z.array(z.string().min(1).max(40)).max(10),
  status: blogPostStatusSchema,
  author: z.string().min(1).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type BlogPostList = z.infer<typeof blogPostListSchema>;
export const blogPostListSchema = z.array(blogPostSchema).max(500);

export const blogSettingsSchema = z.object({
  enabled: z.boolean(),
  postsPerPage: z.number().int().min(5).max(50),
});
export type BlogSettings = z.infer<typeof blogSettingsSchema>;

export const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  enabled: false,
  postsPerPage: 10,
};

export const createPostSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(140),
  excerpt: z.string().trim().max(300).default(""),
  content: z.string().trim().max(60000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  author: z.string().trim().min(1, "Penulis wajib diisi").max(80).default("Admin"),
});
export type CreatePostValues = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(140),
  excerpt: z.string().trim().max(300).default(""),
  content: z.string().trim().max(60000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  author: z.string().trim().min(1, "Penulis wajib diisi").max(80).default("Admin"),
});
export type UpdatePostValues = z.infer<typeof updatePostSchema>;

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

const BLOG_SETTINGS_KEY = "__blog_settings";
void BLOG_SETTINGS_KEY;

export type BlogCmsConfig = {
  title: string;
  description: string;
  tabTitle: string;
  enabledNotice: string;
  disabledNotice: string;
  infoAlert: string;
  enableLabel: string;
  disableLabel: string;
  createPostLabel: string;
  columns: { title: string; status: string; author: string; publishedAt: string; actions: string };
};

export type BlogPublicConfig = {
  indexTitle: string;
  indexDescription: string;
  detailBackLabel: string;
  disabledTitle: string;
  disabledDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  readMoreLabel: string;
};

export type BlogPostConfig = {
  createPostLabel: string;
  publishLabel: string;
  unpublishLabel: string;
  deleteLabel: string;
  editLabel: string;
  titlePlaceholder: string;
  excerptPlaceholder: string;
  contentPlaceholder: string;
  authorPlaceholder: string;
  tagsPlaceholder: string;
};