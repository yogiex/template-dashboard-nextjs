import { describe, expect, it } from "vitest";

import { generateThemeVars, hexToOklch, oklchStr } from "@/lib/color";

describe("hexToOklch", () => {
  it("mengubah putih menjadi L=1 tanpa kroma", () => {
    const result = hexToOklch("#ffffff");

    expect(result).not.toBeNull();
    expect(result?.L).toBeCloseTo(1, 5);
    expect(result?.C).toBeCloseTo(0, 5);
    expect(Number.isFinite(result?.H)).toBe(true);
  });

  it("mengubah hitam menjadi L=0", () => {
    expect(hexToOklch("#000000")?.L).toBeCloseTo(0, 5);
  });

  it("menerima huruf besar dan tanpa tanda pagar", () => {
    const upper = hexToOklch("#FF0000");
    const bare = hexToOklch("ff0000");

    expect(upper?.L).toBeCloseTo(bare?.L ?? -1, 10);
    expect(upper?.C).toBeCloseTo(0.2577, 3);
    expect(upper?.H).toBeCloseTo(29.23, 1);
  });

  it("memotong spasi di sekitar input", () => {
    expect(hexToOklch("  #00ff00  ")?.H).toBeCloseTo(142.5, 1);
  });

  it("mengembalikan null untuk format hex yang tidak didukung", () => {
    expect(hexToOklch("#fff")).toBeNull();
    expect(hexToOklch("")).toBeNull();
    expect(hexToOklch("#gggggg")).toBeNull();
    expect(hexToOklch("#12345")).toBeNull();
    expect(hexToOklch("rgb(0,0,0)")).toBeNull();
  });
});

describe("oklchStr", () => {
  it("memformat dengan tiga desimal dan satu desimal untuk hue", () => {
    expect(oklchStr(0.5, 0.1, 30.44)).toBe("oklch(0.500 0.100 30.4)");
  });

  it("membungkus hue di luar 0-360", () => {
    expect(oklchStr(0.5, 0.1, 400)).toBe("oklch(0.500 0.100 40.0)");
    expect(oklchStr(0.5, 0.1, -10)).toBe("oklch(0.500 0.100 350.0)");
  });
});

describe("generateThemeVars", () => {
  it("menghasilkan seluruh token warna yang diharapkan", () => {
    const vars = generateThemeVars("#3b82f6");

    expect(vars).not.toBeNull();
    expect(Object.keys(vars ?? {}).sort()).toEqual([
      "--accent",
      "--chart-1",
      "--chart-2",
      "--chart-3",
      "--chart-4",
      "--chart-5",
      "--primary",
      "--primary-foreground",
      "--ring",
      "--secondary",
      "--sidebar-primary",
    ]);
  });

  it("membungkus primary dan ring dengan light-dark pada lightness berbeda", () => {
    const vars = generateThemeVars("#3b82f6");

    expect(vars?.["--primary"]).toBe(vars?.["--ring"]);
    expect(vars?.["--primary"]).toMatch(
      /^light-dark\(oklch\(0\.550 [\d.]+ [\d.]+\), oklch\(0\.780 [\d.]+ [\d.]+\)\)$/,
    );
  });

  it("membatasi kroma pada rentang MIN_CHROMA..MAX_CHROMA", () => {
    const gray = generateThemeVars("#808080");
    const vivid = generateThemeVars("#ff0000");

    const chromaOf = (vars: Record<string, string> | null) => {
      const match = vars?.["--primary"]?.match(/oklch\(0\.550 ([\d.]+)/);
      return Number(match?.[1]);
    };

    expect(chromaOf(gray)).toBeGreaterThanOrEqual(0.05);
    expect(chromaOf(gray)).toBeLessThanOrEqual(0.15);
    expect(chromaOf(vivid)).toBe(0.15);
  });

  it("mengembalikan null untuk hex tidak valid", () => {
    expect(generateThemeVars("nope")).toBeNull();
  });
});
