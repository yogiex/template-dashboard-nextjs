import { describe, expect, it } from "vitest";

import {
  applyCardinalityLimits,
  buildSeriesKey,
  CARDINALITY_LIMITS,
  OTHER_TAG_VALUE,
} from "@/features/observability/lib/cardinality";

/** Bangun kumpulan series key seperti yang dilakukan store. */
function recordSeries(
  metricName: string,
  series: ReadonlySet<string>,
  samples: Record<string, string>[],
): ReadonlySet<string> {
  const result = new Set(series);

  for (const tags of samples) {
    result.add(buildSeriesKey(metricName, tags));
  }

  return result;
}

describe("buildSeriesKey", () => {
  it("mengurutkan tag sehingga urutan key tidak memengaruhi series key", () => {
    expect(buildSeriesKey("m", { b: "2", a: "1" })).toBe(
      buildSeriesKey("m", { a: "1", b: "2" }),
    );
  });

  it("memisahkan nama metrik dari pasangan tag", () => {
    expect(buildSeriesKey("http.server.request.count", { "http.route": "/users" })).toBe(
      "http.server.request.count|http.route=/users",
    );
  });
});

describe("applyCardinalityLimits", () => {
  it("memotong key melebihi maxTagKeys dan melaporkannya sebagai overflow", () => {
    const tags: Record<string, string> = {};

    for (let index = 0; index < CARDINALITY_LIMITS.maxTagKeys + 3; index += 1) {
      tags[`key${index}`] = `nilai-${index}`;
    }

    const result = applyCardinalityLimits(tags, {
      metricName: "m",
      existingSeries: new Set<string>(),
    });

    expect(Object.keys(result.tags)).toHaveLength(CARDINALITY_LIMITS.maxTagKeys);
    expect(result.overflowKeys).toHaveLength(3);
    expect(result.overflowKeys).not.toContain("key0");
  });

  it("menukar nilai tag baru yang melewati batas perTag ke nilai cadangan", () => {
    const samples: Record<string, string>[] = [];

    for (let index = 1; index <= CARDINALITY_LIMITS.perTag; index += 1) {
      samples.push({ route: `/rute-${index}` });
    }

    const existing = recordSeries("m", new Set<string>(), samples);
    const popular = `/rute-1`;
    const fresh = "/rute-baru";

    const result = applyCardinalityLimits({ route: fresh }, {
      metricName: "m",
      existingSeries: existing,
    });

    expect(result.tags.route).toBe(OTHER_TAG_VALUE);
    expect(result.overflowKeys).toContain(`route=${fresh}`);

    // Nilai yang sudah pernah dipakai harus tetap utuh walau kuota habis.
    const known = applyCardinalityLimits({ route: popular }, {
      metricName: "m",
      existingSeries: existing,
    });

    expect(known.tags.route).toBe(popular);
    expect(known.overflowKeys).toEqual([]);
  });

  it("menghitung series per metrik secara terpisah", () => {
    const samples: Record<string, string>[] = [];

    for (let index = 1; index <= CARDINALITY_LIMITS.perTag; index += 1) {
      samples.push({ route: `/rute-${index}` });
    }

    const existing = recordSeries("metrik.lain", new Set<string>(), samples);
    const result = applyCardinalityLimits({ route: "/rute-kolom" }, {
      metricName: "m",
      existingSeries: existing,
    });

    expect(result.tags.route).toBe("/rute-kolom");
  });

  it("menyimpan nilai baru selama kuota perTag belum habis", () => {
    const result = applyCardinalityLimits(
      { route: "/a" },
      { metricName: "m", existingSeries: new Set<string>() },
    );

    expect(result.tags).toEqual({ route: "/a" });
    expect(result.overflowKeys).toEqual([]);
  });

  it("menyimpan series yang sudah ada walau batas totalSeries sudah penuh", () => {
    const samples: Record<string, string>[] = [];

    for (let index = 1; index <= CARDINALITY_LIMITS.totalSeries; index += 1) {
      samples.push({ route: `/rute-${index}` });
    }

    const existing = recordSeries("m", new Set<string>(), samples);
    const known = applyCardinalityLimits({ route: "/rute-1" }, {
      metricName: "m",
      existingSeries: existing,
    });

    expect(known.tags).toEqual({ route: "/rute-1" });
  });

  it("menyusun ulang seluruh nilai menjadi nilai cadangan saat totalSeries terlampaui", () => {
    const samples: Record<string, string>[] = [];

    for (let index = 1; index <= CARDINALITY_LIMITS.totalSeries; index += 1) {
      samples.push({ route: `/rute-${index}`, method: "GET" });
    }

    const existing = recordSeries("m", new Set<string>(), samples);
    const result = applyCardinalityLimits(
      { route: "/rute-kolom", method: "POST" },
      { metricName: "m", existingSeries: existing },
    );

    expect(result.tags).toEqual({
      route: OTHER_TAG_VALUE,
      method: OTHER_TAG_VALUE,
    });
    expect(result.overflowKeys).toEqual(
      expect.arrayContaining(["method=POST", "route=/rute-kolom"]),
    );
  });

  it("murni: panggilan berulang dengan input sama menghasilkan output identik", () => {
    const samples: Record<string, string>[] = [];

    for (let index = 1; index <= CARDINALITY_LIMITS.perTag; index += 1) {
      samples.push({ route: `/rute-${index}` });
    }

    const existing = recordSeries("m", new Set<string>(), samples);
    const tags = { route: "/rute-kolom", method: "POST" };
    const first = applyCardinalityLimits(tags, {
      metricName: "m",
      existingSeries: existing,
    });
    const second = applyCardinalityLimits(tags, {
      metricName: "m",
      existingSeries: existing,
    });

    expect(second).toEqual(first);
  });

  it("murni: input tidak dimutasi dan tag yang dikembalikan adalah objek baru", () => {
    const tags = { route: "/a", method: "GET" };
    const result = applyCardinalityLimits(tags, {
      metricName: "m",
      existingSeries: new Set<string>(),
    });

    expect(tags).toEqual({ route: "/a", method: "GET" });
    expect(result.tags).not.toBe(tags);
  });

  it("tidak melempar untuk input kosong maupun nilai yang tidak terdefinisi", () => {
    expect(
      applyCardinalityLimits({}, {
        metricName: "m",
        existingSeries: new Set<string>(),
      }),
    ).toEqual({ tags: {}, overflowKeys: [] });
  });
});
