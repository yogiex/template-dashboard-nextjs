import { describe, expect, it } from "vitest";

import {
  formatTraceparent,
  generateSpanId,
  generateTraceContext,
  generateTraceId,
  isValidSpanId,
  isValidTraceFlags,
  isValidTraceId,
  parseTraceparent,
  resolveTraceContext,
} from "@/lib/trace-context";

const VALID_TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const VALID_SPAN_ID = "00f067aa0ba902b7";
const ZERO_TRACE_ID = "0".repeat(32);
const ZERO_SPAN_ID = "0".repeat(16);

describe("isValidTraceId", () => {
  it("menerima 32 hex lowercase", () => {
    expect(isValidTraceId(VALID_TRACE_ID)).toBe(true);
  });

  it("menolak panjang salah, hex salah, huruf besar, dan all-zero", () => {
    expect(isValidTraceId(VALID_TRACE_ID.slice(0, 31))).toBe(false);
    expect(isValidTraceId(`${VALID_TRACE_ID}0`)).toBe(false);
    expect(isValidTraceId("4bf92f3577b34da6a3ce929d0e0e473z")).toBe(false);
    expect(isValidTraceId(VALID_TRACE_ID.toUpperCase())).toBe(false);
    expect(isValidTraceId(ZERO_TRACE_ID)).toBe(false);
    expect(isValidTraceId("")).toBe(false);
  });
});

describe("isValidSpanId", () => {
  it("menerima 16 hex lowercase", () => {
    expect(isValidSpanId(VALID_SPAN_ID)).toBe(true);
  });

  it("menolak panjang salah dan all-zero", () => {
    expect(isValidSpanId(VALID_SPAN_ID.slice(0, 15))).toBe(false);
    expect(isValidSpanId(`${VALID_SPAN_ID}0`)).toBe(false);
    expect(isValidSpanId(ZERO_SPAN_ID)).toBe(false);
    expect(isValidSpanId(VALID_SPAN_ID.toUpperCase())).toBe(false);
  });
});

describe("isValidTraceFlags", () => {
  it("hanya menerima 00 dan 01", () => {
    expect(isValidTraceFlags("00")).toBe(true);
    expect(isValidTraceFlags("01")).toBe(true);
  });

  it("menolak nilai lain", () => {
    expect(isValidTraceFlags("02")).toBe(false);
    expect(isValidTraceFlags("ff")).toBe(false);
    expect(isValidTraceFlags("0")).toBe(false);
    expect(isValidTraceFlags("")).toBe(false);
  });
});

describe("generateTraceId / generateSpanId", () => {
  it("menghasilkan id valid dengan panjang yang benar", () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    expect(traceId).toHaveLength(32);
    expect(spanId).toHaveLength(16);
    expect(isValidTraceId(traceId)).toBe(true);
    expect(isValidSpanId(spanId)).toBe(true);
  });

  it("tidak menghasilkan nilai yang sama berulang", () => {
    const ids = new Set(
      Array.from({ length: 20 }, () => generateTraceId()),
    );

    expect(ids.size).toBe(20);
  });
});

describe("generateTraceContext", () => {
  it("menghasilkan konteks yang konsisten dengan format traceparent", () => {
    const context = generateTraceContext();

    expect(context.sampled).toBe(context.traceFlags === "01");
    expect(parseTraceparent(formatTraceparent(context))).toEqual(context);
  });
});

describe("parseTraceparent", () => {
  it("membaca header valid dengan flags 00", () => {
    expect(parseTraceparent(`00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-00`)).toEqual({
      traceId: VALID_TRACE_ID,
      spanId: VALID_SPAN_ID,
      traceFlags: "00",
      sampled: false,
    });
  });

  it("membaca header valid dengan flags 01 dan menandai sampled", () => {
    expect(parseTraceparent(`00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`)).toEqual({
      traceId: VALID_TRACE_ID,
      spanId: VALID_SPAN_ID,
      traceFlags: "01",
      sampled: true,
    });
  });

  it("mentolerasi spasi di sekeliling header", () => {
    expect(
      parseTraceparent(`  00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01  `),
    ).not.toBeNull();
  });

  it("mengembalikan null untuk header malformed", () => {
    const cases: Array<string | null> = [
      null,
      "",
      "   ",
      "bukan-header",
      // jumlah segmen != 4
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}`,
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01-extra`,
      // versi != 00
      `01-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`,
      `ff-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`,
      `0-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`,
      // traceId / spanId tidak valid
      `00-${ZERO_TRACE_ID}-${VALID_SPAN_ID}-01`,
      `00-${VALID_TRACE_ID.slice(0, 31)}-${VALID_SPAN_ID}-01`,
      `00-${VALID_TRACE_ID.toUpperCase()}-${VALID_SPAN_ID}-01`,
      `00-${VALID_TRACE_ID}-${ZERO_SPAN_ID}-01`,
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID.slice(0, 15)}-01`,
      // flags tidak dikenal
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-02`,
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-1`,
    ];

    for (const header of cases) {
      expect(parseTraceparent(header), header ?? "<null>").toBeNull();
    }
  });
});

describe("formatTraceparent", () => {
  it("round-trip tanpa kehilangan field", () => {
    const header = `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`;

    expect(parseTraceparent(formatTraceparent(parseTraceparent(header)!))).toEqual(
      parseTraceparent(header),
    );
  });

  it("menghasilkan header dengan panjang dan struktur yang benar", () => {
    const context = generateTraceContext();
    const header = formatTraceparent(context);

    expect(header.startsWith("00-")).toBe(true);
    expect(header.split("-")).toHaveLength(4);
    expect(header).toHaveLength(55);
  });
});

describe("resolveTraceContext", () => {
  it("meneruskan traceId upstream dan membuat spanId baru", () => {
    const header = `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-01`;
    const first = resolveTraceContext(header);
    const second = resolveTraceContext(header);

    expect(first.isNew).toBe(false);
    expect(first.context.traceId).toBe(VALID_TRACE_ID);
    expect(first.context.traceFlags).toBe("01");
    expect(first.context.sampled).toBe(true);
    expect(first.context.spanId).not.toBe(VALID_SPAN_ID);
    expect(second.context.spanId).not.toBe(first.context.spanId);
  });

  it("membuat trace baru untuk header null atau malformed", () => {
    for (const header of [null, "sampah", `00-${ZERO_TRACE_ID}-01`]) {
      const resolved = resolveTraceContext(header);

      expect(resolved.isNew).toBe(true);
      expect(isValidTraceId(resolved.context.traceId)).toBe(true);
      expect(isValidSpanId(resolved.context.spanId)).toBe(true);
    }
  });

  it("mempertahankan flags 00 dari upstream tanpa menandai sampled", () => {
    const resolved = resolveTraceContext(
      `00-${VALID_TRACE_ID}-${VALID_SPAN_ID}-00`,
    );

    expect(resolved.isNew).toBe(false);
    expect(resolved.context.sampled).toBe(false);
    expect(resolved.context.traceFlags).toBe("00");
  });

  it("hasilnya selalu bisa diformat ulang menjadi header valid", () => {
    const resolved = resolveTraceContext(null);

    expect(parseTraceparent(formatTraceparent(resolved.context))).toEqual(
      resolved.context,
    );
  });
});
