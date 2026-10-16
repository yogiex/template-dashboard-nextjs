"use client";

import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BLOG_CMS_CONFIG } from "@/config/blog";
import {
  createPost,
  deletePost,
  loadPosts,
  togglePublish,
  updatePost,
  type BlogPost,
} from "@/features/blog/service";
import { PostDialog } from "@/features/blog/components/post-dialog";

export function PostsTable() {
  const [posts, setPosts] = useState(() => loadPosts());

  const refresh = useCallback(() => setPosts(loadPosts()), []);

  function handleSubmitCreate(values: { title: string; excerpt: string; content: string; tags: string[]; author: string }) {
    const res = createPost(values);
    if (res.ok) refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Post</h2>
        <PostDialog
          trigger={<Button className="h-9">{BLOG_CMS_CONFIG.createPostLabel}</Button>}
          onSubmitted={handleSubmitCreate}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{BLOG_CMS_CONFIG.columns.title}</TableHead>
            <TableHead>{BLOG_CMS_CONFIG.columns.status}</TableHead>
            <TableHead>{BLOG_CMS_CONFIG.columns.author}</TableHead>
            <TableHead>{BLOG_CMS_CONFIG.columns.publishedAt}</TableHead>
            <TableHead>{BLOG_CMS_CONFIG.columns.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>{post.title}</TableCell>
              <TableCell>
                <Badge variant={post.status === "published" ? "default" : "secondary"}>
                  {post.status}
                </Badge>
              </TableCell>
              <TableCell>{post.author}</TableCell>
              <TableCell>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("id-ID") : "-"}</TableCell>
              <TableCell className="space-x-1">
                <PostDialog
                  post={post}
                  trigger={<Button variant="outline" size="sm">{BLOG_CMS_CONFIG.editLabel}</Button>}
                  onSubmitted={(values) => {
                    updatePost(post.id, values);
                    refresh();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    togglePublish(post.id, post.status !== "published");
                    refresh();
                  }}
                >
                  {post.status === "published" ? BLOG_CMS_CONFIG.unpublishLabel : BLOG_CMS_CONFIG.publishLabel}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deletePost(post.id);
                    refresh();
                  }}
                >
                  {BLOG_CMS_CONFIG.deleteLabel}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                Tidak ada post.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}