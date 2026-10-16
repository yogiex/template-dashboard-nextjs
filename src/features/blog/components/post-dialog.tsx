"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BLOG_CMS_CONFIG } from "@/config/blog";
import { type BlogPost, createPostSchema, updatePostSchema } from "@/features/blog/schema";

type Props = {
  post?: BlogPost;
  onSubmitted: (values: { title: string; excerpt: string; content: string; tags: string[]; author: string }) => void;
  trigger: React.ReactNode;
};

export function PostDialog({ post, onSubmitted, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(post);
  const form = useForm({
    resolver: zodResolver((isEdit ? updatePostSchema : createPostSchema) as never),
    defaultValues: {
      title: post?.title ?? "",
      excerpt: post?.excerpt ?? "",
      content: post?.content ?? "",
      tags: post?.tags ?? [],
      author: post?.author ?? "Admin",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: post?.title ?? "",
        excerpt: post?.excerpt ?? "",
        content: post?.content ?? "",
        tags: post?.tags ?? [],
        author: post?.author ?? "Admin",
      });
    }
  }, [open, post, form]);

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? BLOG_CMS_CONFIG.dialog.titleEdit : BLOG_CMS_CONFIG.dialog.titleCreate}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(async (values) => {
            onSubmitted(values as { title: string; excerpt: string; content: string; tags: string[]; author: string });
            setOpen(false);
          })}
        >
          <FormItem className="space-y-2">
            <FormLabel>{BLOG_CMS_CONFIG.form.titleLabel}</FormLabel>
            <Input
              {...form.register("title")}
              placeholder={BLOG_CMS_CONFIG.form.titlePlaceholder}
              className="h-10"
            />
          </FormItem>
          <FormItem className="space-y-2">
            <FormLabel>{BLOG_CMS_CONFIG.form.authorLabel}</FormLabel>
            <Input
              {...form.register("author")}
              placeholder={BLOG_CMS_CONFIG.form.authorPlaceholder}
              className="h-10"
            />
          </FormItem>
          <FormItem className="space-y-2">
            <FormLabel>{BLOG_CMS_CONFIG.form.excerptLabel}</FormLabel>
            <Textarea
              {...form.register("excerpt")}
              placeholder={BLOG_CMS_CONFIG.form.excerptPlaceholder}
            />
          </FormItem>
          <FormItem className="space-y-2">
            <FormLabel>{BLOG_CMS_CONFIG.form.contentLabel}</FormLabel>
            <Textarea
              {...form.register("content")}
              placeholder={BLOG_CMS_CONFIG.form.contentPlaceholder}
              className="min-h-[120px]"
            />
          </FormItem>
          <FormItem className="space-y-2">
            <FormLabel>{BLOG_CMS_CONFIG.form.tagsLabel}</FormLabel>
            <Input
              defaultValue={post?.tags?.join(", ") ?? ""}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                form.setValue("tags", tags);
              }}
              placeholder={BLOG_CMS_CONFIG.form.tagsPlaceholder}
              className="h-10"
            />
          </FormItem>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="h-10">
              {submitting ? BLOG_CMS_CONFIG.dialog.submittingLabel : BLOG_CMS_CONFIG.dialog.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}