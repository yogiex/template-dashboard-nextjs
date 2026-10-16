import type { Metadata } from "next";

import { BLOG_PUBLIC_CONFIG } from "@/config/blog";
import { BlogPublicClient } from "@/features/blog/components/blog-public-client";

export const metadata: Metadata = {
  title: BLOG_PUBLIC_CONFIG.indexTitle,
  description: BLOG_PUBLIC_CONFIG.indexDescription,
};

export default function BlogIndexPage() {
  return <BlogPublicClient />;
}
