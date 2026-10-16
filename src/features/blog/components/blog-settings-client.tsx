"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BLOG_CMS_CONFIG } from "@/config/blog";
import { loadPosts, loadSettings, saveSettings } from "@/features/blog/service";

export function BlogSettingsClient() {
  const router = useRouter();
  const [settings, setSettings] = useState(() => loadSettings());
  const posts = loadPosts();

  const published = posts.filter((p) => p.status === "published").length;
  const draft = posts.length - published;

  function toggle() {
    const next = { ...settings, enabled: !settings.enabled };
    setSettings(next);
    saveSettings(next);
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{BLOG_CMS_CONFIG.title}</h1>
        <p className="text-sm text-muted-foreground">{BLOG_CMS_CONFIG.description}</p>
      </div>
      <Alert>
        <AlertDescription>{BLOG_CMS_CONFIG.infoAlert}</AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>
            {settings.enabled ? BLOG_CMS_CONFIG.enabledNotice : BLOG_CMS_CONFIG.disabledNotice}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {BLOG_CMS_CONFIG.summary.published}: {published} · {BLOG_CMS_CONFIG.summary.draft}: {draft}
          </p>
          <Button
            className="h-10"
            onClick={toggle}
            variant={settings.enabled ? "outline" : "default"}
          >
            {settings.enabled ? BLOG_CMS_CONFIG.disableLabel : BLOG_CMS_CONFIG.enableLabel}
          </Button>
        </CardContent>
      </Card>
      {settings.enabled ? <PostsTableSection /> : null}
    </div>
  );
}

// lazy import avoids SSR issues
import { PostsTable } from "@/features/blog/components/posts-table";

function PostsTableSection() {
  return <PostsTable />;
}