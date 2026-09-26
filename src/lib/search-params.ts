import { z } from "zod"

export const LIST_LIMITS = {
  maxQueryLength: 100,
  maxPageSize: 50,
  defaultPageSize: 10,
  maxPage: 10_000,
} as const

export const listParamsSchema = z.object({
  q: z.string().trim().max(LIST_LIMITS.maxQueryLength).catch("").default(""),
  page: z.coerce.number().int().min(1).max(LIST_LIMITS.maxPage).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_LIMITS.maxPageSize)
    .catch(LIST_LIMITS.defaultPageSize)
    .default(LIST_LIMITS.defaultPageSize),
})

export type ListParams = z.infer<typeof listParamsSchema>
export type SearchParams = Record<string, string | string[] | undefined>

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function defaultListParams(): ListParams {
  return { q: "", page: 1, pageSize: LIST_LIMITS.defaultPageSize }
}

export async function parseListParams(
  searchParams: Promise<SearchParams> | SearchParams,
): Promise<ListParams> {
  try {
    const resolved = await searchParams
    const flat = Object.fromEntries(
      Object.entries(resolved).map(([key, value]) => [key, firstValue(value)]),
    )
    const result = listParamsSchema.safeParse(flat)
    return result.success ? result.data : defaultListParams()
  } catch {
    return defaultListParams()
  }
}

export function parseListParamsSync(searchParams: SearchParams): ListParams {
  const flat = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, firstValue(value)]),
  )
  const result = listParamsSchema.safeParse(flat)
  return result.success ? result.data : defaultListParams()
}

export function buildListUrl(
  basePath: string,
  params: Record<string, string | number | undefined>,
  overrides: Record<string, string | number | undefined> = {},
): string {
  const merged: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value !== undefined && value !== "") merged[key] = String(value)
  }
  const search = new URLSearchParams(merged).toString()
  return search ? `${basePath}?${search}` : basePath
}
