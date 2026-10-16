import type { Metadata } from "next";

import { BLOG_CMS_CONFIG } from "@/config/blog";
import { BlogSettingsClient } from "@/features/blog/components/blog-settings-client";

export const metadata: Metadata = {
  title: BLOG_CMS_CONFIG.title,
};

export default function BlogSettingsPage() {
  return <BlogSettingsClient />;
}
