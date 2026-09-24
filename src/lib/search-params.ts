import { z } from "zod";

export const LIST_LIMITS = {
  maxQueryLength: 100,
  maxPageSize: 50,
  defaultPageSize: 10,
  maxPage: 10_000,
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeQuery(value: unknown): unknown {
  if (typeof value !== "string") {
    return undefined;
  }

  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .trim()
    .slice(0, LIST_LIMITS.maxQueryLength);
}

const pageSchema = z.preprocess(
  firstValue,
  z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_LIMITS.maxPage)
    .catch(1)
    .default(1),
);

const pageSizeSchema = z.preprocess(
  firstValue,
  z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_LIMITS.maxPageSize)
    .catch(LIST_LIMITS.defaultPageSize)
    .default(LIST_LIMITS.defaultPageSize),
);

const querySchema = z.preprocess(
  sanitizeQuery,
  z.string().max(LIST_LIMITS.maxQueryLength).catch("").default(""),
);

export const listParamsSchema = z.object({
  q: querySchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
});

export type ListParams = z.infer<typeof listParamsSchema>;

function defaultListParams(): ListParams {
  return {
    q: "",
    page: 1,
    pageSize: LIST_LIMITS.defaultPageSize,
  };
}

export async function parseListParams(
  searchParams: Promise<SearchParams> | SearchParams,
): Promise<ListParams> {
  try {
    const resolved = await searchParams;
    const raw =
      typeof resolved === "object" && resolved !== null ? resolved : {};

    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[key] = firstValue(value);
    }

    const result = listParamsSchema.safeParse(normalized);
    return result.success ? result.data : defaultListParams();
  } catch {
    return defaultListParams();
  }
}

export function listOffset(params: Pick<ListParams, "page" | "pageSize">): number {
  return (params.page - 1) * params.pageSize;
}
