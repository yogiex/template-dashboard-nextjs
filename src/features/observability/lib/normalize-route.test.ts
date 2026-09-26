import { describe, expect, it } from "vitest";

import {
  normalizeMethod,
  normalizeRoute,
  OTHER_METHOD,
} from "@/features/observability/lib/normalize-route";

describe("normalizeRoute", () => {
  it("mengganti segmen angka dengan placeholder id", () => {
    expect(normalizeRoute("/users/123")).toBe("/users/:id");
    expect(normalizeRoute("/users/123/posts/7")).toBe("/users/:id/posts/:id");
  });

  it("mengganti UUID dengan placeholder khusus", () => {
    expect(normalizeRoute("/orders/3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(
      "/orders/:uuid",
    );
  });

  it("mengganti hash hex panjang dengan placeholder hash", () => {
    const hash = "a".repeat(40);

    expect(normalizeRoute(`/token/${hash}`)).toBe("/token/:hash");
  });

  it("menyamar email dan segmen ter-encode", () => {
    expect(normalizeRoute("/users/user@example.com")).toBe("/users/:segment");
    expect(normalizeRoute("/redirect/https%3A%2F%2Fexample.com")).toBe(
      "/redirect/:segment",
    );
  });

  it("membuang query string dan fragment", () => {
    expect(normalizeRoute("/users/123?tab=profile#atas")).toBe("/users/:id");
  });

  it("menghapus trailing slash dan slash ganda", () => {
    expect(normalizeRoute("/dashboard/")).toBe("/dashboard");
    expect(normalizeRoute("/dashboard///")).toBe("/dashboard");
    expect(normalizeRoute("//dashboard//")).toBe("/dashboard");
  });

  it("mengembalikan akar untuk input kosong maupun slash", () => {
    expect(normalizeRoute("")).toBe("/");
    expect(normalizeRoute("/")).toBe("/");
    expect(normalizeRoute("   ")).toBe("/");
  });

  it("idempoten untuk path yang sudah dinormalisasi", () => {
    const samples = [
      "/users/123",
      "/orders/3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      "/token/" + "a".repeat(40),
      "/Dashboard/Users/123/",
      "",
    ];

    for (const sample of samples) {
      const once = normalizeRoute(sample);

      expect(normalizeRoute(once)).toBe(once);
    }
  });

  it("memotong path yang terlalu panjang dan tetap idempoten", () => {
    const long = `/${"segment-panjang/".repeat(40)}`;
    const result = normalizeRoute(long);

    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith("/:segment")).toBe(true);
    expect(normalizeRoute(result)).toBe(result);
  });

  it("tidak pernah menghasilkan string kosong", () => {
    const samples = ["", "/", "//", "?", "#", "/users/123"];

    for (const sample of samples) {
      expect(normalizeRoute(sample).length).toBeGreaterThan(0);
    }
  });
});

describe("normalizeMethod", () => {
  it("mengubah method menjadi huruf besar dan mengizinkan hanya method standar", () => {
    expect(normalizeMethod("get")).toBe("GET");
    expect(normalizeMethod(" post ")).toBe("POST");
    expect(normalizeMethod("DELETE")).toBe("DELETE");
  });

  it("mengembalikan OTHER untuk method di luar whitelist", () => {
    expect(normalizeMethod("TRACE")).toBe(OTHER_METHOD);
    expect(normalizeMethod("connect")).toBe(OTHER_METHOD);
    expect(normalizeMethod("")).toBe(OTHER_METHOD);
  });

  it("idempoten untuk method yang sudah dinormalisasi", () => {
    expect(normalizeMethod(OTHER_METHOD)).toBe(OTHER_METHOD);
    expect(normalizeMethod("PATCH")).toBe("PATCH");
  });
});
