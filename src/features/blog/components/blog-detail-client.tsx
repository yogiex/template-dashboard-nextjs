"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { BLOG_PUBLIC_CONFIG } from "@/config/blog";
import { findBySlug, loadSettings } from "@/features/blog/service";
import Link from "next/link";
import type { BlogPost } from "@/features/blog/schema";

export function BlogDetailClient({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(loadSettings().enabled);
    setPost(findBySlug(slug) ?? null);
    setMounted(true);
  }, [slug]);

  if (!mounted) return null;
  if (!enabled || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={BLOG_PUBLIC_CONFIG.emptyTitle}
          description={BLOG_PUBLIC_CONFIG.emptyDescription}
        />
        <div className="mt-4">
          <Link href="/blog">
            <Button variant="outline">{BLOG_PUBLIC_CONFIG.detailBackLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href="/blog">
        <Button variant="outline" size="sm">
          {BLOG_PUBLIC_CONFIG.detailBackLabel}
        </Button>
      </Link>
      <h1 className="text-2xl font-semibold">{post.title}</h1>
      <p className="text-sm text-muted-foreground">
        {post.author} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("id-ID") : ""}
      </p>
      {post.excerpt ? <p className="text-muted-foreground">{post.excerpt}</p> : null}
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>
    </article>
  );
}
