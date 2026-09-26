import { describe, expect, it } from "vitest";

import {
  LIST_LIMITS,
  buildListUrl,
  listParamsSchema,
  parseListParams,
  parseListParamsSync,
} from "@/lib/search-params";

describe("listParamsSchema", () => {
  it("mengisi default saat input kosong", () => {
    expect(listParamsSchema.parse({})).toEqual({
      q: "",
      page: 1,
      pageSize: LIST_LIMITS.defaultPageSize,
    });
  });

  it("memangkas dan memotong query", () => {
    expect(listParamsSchema.parse({ q: "  admin  " }).q).toBe("admin");
  });

  it("kembali ke default saat query melebihi batas panjang", () => {
    const long = "a".repeat(LIST_LIMITS.maxQueryLength + 1);
    expect(listParamsSchema.parse({ q: long }).q).toBe("");
  });

  it("menerima query tepat pada batas panjang", () => {
    const max = "a".repeat(LIST_LIMITS.maxQueryLength);
    expect(listParamsSchema.parse({ q: max }).q).toBe(max);
  });

  it("menolak page di luar rentang dan kembali ke default", () => {
    expect(listParamsSchema.parse({ page: "0" }).page).toBe(1);
    expect(listParamsSchema.parse({ page: "-5" }).page).toBe(1);
    expect(listParamsSchema.parse({ page: "abc" }).page).toBe(1);
    expect(listParamsSchema.parse({ page: "1.5" }).page).toBe(1);
  });

  it("membatasi page ke LIST_LIMITS.maxPage", () => {
    expect(listParamsSchema.parse({ page: String(LIST_LIMITS.maxPage) }).page).toBe(
      LIST_LIMITS.maxPage,
    );
    expect(
      listParamsSchema.parse({ page: String(LIST_LIMITS.maxPage + 1) }).page,
    ).toBe(1);
  });

  it("membatasi pageSize ke LIST_LIMITS.maxPageSize", () => {
    expect(listParamsSchema.parse({ pageSize: "25" }).pageSize).toBe(25);
    expect(
      listParamsSchema.parse({ pageSize: String(LIST_LIMITS.maxPageSize) }).pageSize,
    ).toBe(LIST_LIMITS.maxPageSize);
    expect(
      listParamsSchema.parse({
        pageSize: String(LIST_LIMITS.maxPageSize + 1),
      }).pageSize,
    ).toBe(LIST_LIMITS.defaultPageSize);
  });
});

describe("parseListParams", () => {
  it("mengambil nilai pertama dari parameter berulang", async () => {
    const result = await parseListParams({ q: ["first", "second"] });

    expect(result.q).toBe("first");
  });

  it("menerima Promise searchParams ala Next.js", async () => {
    const result = await parseListParams(
      Promise.resolve({ page: "3", pageSize: "20", q: "audit" }),
    );

    expect(result).toEqual({ page: 3, pageSize: 20, q: "audit" });
  });

  it("mengembalikan default ketika Promise ditolak", async () => {
    const failing = Promise.reject(new Error("params gagal"));

    await expect(parseListParams(failing)).resolves.toEqual({
      q: "",
      page: 1,
      pageSize: LIST_LIMITS.defaultPageSize,
    });
  });
});

describe("parseListParamsSync", () => {
  it("mengembalikan default untuk object kosong", () => {
    expect(parseListParamsSync({})).toEqual({
      q: "",
      page: 1,
      pageSize: LIST_LIMITS.defaultPageSize,
    });
  });

  it("mengabaikan key tambahan yang tidak dikenal", () => {
    const result = parseListParamsSync({ page: "2", sort: "name" });

    expect(result).toEqual({ q: "", page: 2, pageSize: 10 });
  });
});

describe("buildListUrl", () => {
  it("mengembalikan basePath tanpa query saat tidak ada parameter", () => {
    expect(buildListUrl("/dashboard/users", {}, {})).toBe("/dashboard/users");
  });

  it("menggabungkan params dan overrides", () => {
    expect(
      buildListUrl("/dashboard/users", { q: "admin", page: 2 }, { page: 3 }),
    ).toBe("/dashboard/users?q=admin&page=3");
  });

  it("membuang nilai undefined dan string kosong", () => {
    expect(
      buildListUrl("/dashboard/users", { q: "", page: undefined, pageSize: 25 }),
    ).toBe("/dashboard/users?pageSize=25");
  });

  it("meng-encode nilai query", () => {
    expect(buildListUrl("/search", { q: "a b&c=d" })).toBe(
      "/search?q=a+b%26c%3Dd",
    );
  });
});
