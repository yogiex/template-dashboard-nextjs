"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/custom/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BLOG_PUBLIC_CONFIG } from "@/config/blog";
import {
  findBySlug,
  listPublished,
  loadSettings,
  type BlogPost,
} from "@/features/blog/service";
import Link from "next/link";

function Content() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("post") ?? "";

  const [enabled, setEnabled] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(loadSettings().enabled);
    setPosts(listPublished());
    setPost(slug ? findBySlug(slug) ?? null : null);
    setMounted(true);
  }, [slug]);

  if (!mounted) return null;

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={BLOG_PUBLIC_CONFIG.disabledTitle}
          description={BLOG_PUBLIC_CONFIG.disabledDescription}
        />
      </div>
    );
  }

  if (slug) {
    if (!post) {
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

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={BLOG_PUBLIC_CONFIG.emptyTitle}
          description={BLOG_PUBLIC_CONFIG.emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{BLOG_PUBLIC_CONFIG.indexTitle}</h1>
      <p className="text-muted-foreground">{BLOG_PUBLIC_CONFIG.indexDescription}</p>
      {posts.map((postEntry) => (
        <Card key={postEntry.id}>
          <CardHeader>
            <CardTitle>{postEntry.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{postEntry.excerpt}</p>
            <Link href={`/blog?post=${postEntry.slug}`}>
              <Button variant="outline" size="sm">
                {BLOG_PUBLIC_CONFIG.readMoreLabel}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BlogPublicClient() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}