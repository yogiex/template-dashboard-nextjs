import { z } from "zod";

export const metricKindSchema = z.enum(["counter", "gauge", "histogram"]);

export const METRIC_WINDOWS = ["1m", "5m", "1h", "24h", "7d"] as const;

export const metricWindowSchema = z.enum(METRIC_WINDOWS);

/**
 * Provenance event. Hanya `demo` yang diisi hari ini, oleh generator data mock
 * di `lib/demo-seed.ts`; event yang berasal dari jalur nyata tidak mengisi field
 * ini sehingga tetap dibedakan dari data mock.
 */
export const metricSourceSchema = z.enum(["demo"]);

export const trackMetricInputSchema = z.object({
  name: z.string().min(1).max(100),
  kind: metricKindSchema.default("counter"),
  value: z.number().finite().default(1),
  unit: z.string().max(20).optional(),
  tags: z.record(z.string().max(50), z.string().max(200)).optional(),
  actorId: z.string().max(64).optional(),
  source: metricSourceSchema.optional(),
  timestamp: z.string().datetime().optional(),
});

export const metricQuerySchema = z.object({
  name: z.string().max(100).optional(),
  window: metricWindowSchema.default("1h"),
  actorId: z.string().max(64).optional(),
  bucketMs: z.number().int().min(1_000).max(24 * 60 * 60 * 1000).default(60_000),
});

export type MetricKind = z.infer<typeof metricKindSchema>;
export type MetricSource = z.infer<typeof metricSourceSchema>;
export type MetricWindow = z.infer<typeof metricWindowSchema>;
export type TrackMetricInput = z.input<typeof trackMetricInputSchema>;
export type TrackMetricValues = z.infer<typeof trackMetricInputSchema>;
export type MetricQuery = z.infer<typeof metricQuerySchema>;
