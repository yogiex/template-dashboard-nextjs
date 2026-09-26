function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const value = Number.parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function srgbToLinear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function cbrt(value: number): number {
  return Math.cbrt(Math.max(0, value))
}

export function hexToOklch(hex: string): { L: number; C: number; H: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const [r, g, b] = rgb.map(srgbToLinear)
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(a * a + bb * bb)
  const H = (Math.atan2(bb, a) * 180) / Math.PI + (Math.atan2(bb, a) < 0 ? 360 : 0)
  return { L, C, H }
}

const MAX_CHROMA = 0.15
const MIN_CHROMA = 0.05

function wrapHue(value: number): number {
  return ((value % 360) + 360) % 360
}

export function oklchStr(L: number, C: number, H: number): string {
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${wrapHue(H).toFixed(1)})`
}

export function generateThemeVars(hex: string): Record<string, string> | null {
  const parsed = hexToOklch(hex)
  if (!parsed) return null
  const C = Math.min(Math.max(parsed.C, MIN_CHROMA), MAX_CHROMA)
  const H = parsed.H
  return {
    "--primary": `light-dark(${oklchStr(0.55, C, H)}, ${oklchStr(0.78, C, H)})`,
    "--primary-foreground": `light-dark(oklch(0.985 0 0), oklch(0.145 0 0))`,
    "--ring": `light-dark(${oklchStr(0.55, C, H)}, ${oklchStr(0.78, C, H)})`,
    "--sidebar-primary": `light-dark(${oklchStr(0.55, C, H)}, ${oklchStr(0.78, C, H)})`,
    "--secondary": `light-dark(${oklchStr(0.93, C * 0.25, H)}, ${oklchStr(0.28, C * 0.4, H)})`,
    "--accent": `light-dark(${oklchStr(0.94, C * 0.35, H)}, ${oklchStr(0.3, C * 0.6, H)})`,
    "--chart-1": `light-dark(${oklchStr(0.62, C, H)}, ${oklchStr(0.72, C, H)})`,
    "--chart-2": `light-dark(${oklchStr(0.65, C * 0.85, H + 72)}, ${oklchStr(0.75, C * 0.85, H + 72)})`,
    "--chart-3": `light-dark(${oklchStr(0.68, C * 0.7, H + 144)}, ${oklchStr(0.78, C * 0.7, H + 144)})`,
    "--chart-4": `light-dark(${oklchStr(0.66, C * 0.9, H + 216)}, ${oklchStr(0.76, C * 0.9, H + 216)})`,
    "--chart-5": `light-dark(${oklchStr(0.7, C * 0.75, H + 288)}, ${oklchStr(0.8, C * 0.75, H + 288)})`,
  }
}
