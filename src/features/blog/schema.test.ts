import { describe, expect, it } from "vitest";

import { createPostSchema, blogSettingsSchema, slugify } from "@/features/blog/schema";

describe("blog schema", () => {
  it("validates a create input", () => {
    const r = createPostSchema.safeParse({
      title: "Hello",
      excerpt: "hi",
      content: "body",
      tags: ["a"],
      author: "Admin",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty title", () => {
    const r = createPostSchema.safeParse({ title: "", author: "A" });
    expect(r.success).toBe(false);
  });

  it("settings defaults range", () => {
    const r = blogSettingsSchema.safeParse({ enabled: true, postsPerPage: 10 });
    expect(r.success).toBe(true);
  });

  it("slugify", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
