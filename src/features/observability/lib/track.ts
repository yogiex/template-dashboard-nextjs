import "server-only";

import { pushEvent } from "@/features/observability/lib/store";
import { trackMetricInputSchema } from "@/features/observability/schema";
import { recordAnomaliesForActor } from "@/features/ueba/service";
import type { MetricEvent } from "@/features/observability/types";
import { redactTags } from "@/lib/redact";

/**
 * `trackMetric()` aman dipanggil di hot path: tidak pernah melempar exception
 * dan tidak pernah di-await. Kegagalan tracking tidak boleh menggagalkan
 * request bisnis.
 *
 * Ketergantungan ke `ueba` ada di sini karena event store adalah sumber data
 * tunggal untuk baseline anomali. Saat backend siap, event ini mengalir ke
 * collector (OpenTelemetry/Prometheus) dan UEBA membaca dari stream yang sama,
 * bukan dari fungsi ini.
 */

const EVALUATION_COOLDOWN_MS = 2_000;
const EVALUATION_KEY = Symbol.for("template.metrics.evaluation");

type EvaluationState = { lastEvaluatedAt: number };

function shouldEvaluate(actorId: string): boolean {
  const globalState = globalThis as typeof globalThis & {
    [EVALUATION_KEY]?: Map<string, EvaluationState>;
  };
  const state = globalState[EVALUATION_KEY] ?? new Map<string, EvaluationState>();

  globalState[EVALUATION_KEY] = state;

  const now = Date.now();
  const previous = state.get(actorId);

  if (previous && now - previous.lastEvaluatedAt < EVALUATION_COOLDOWN_MS) {
    return false;
  }

  state.set(actorId, { lastEvaluatedAt: now });

  return true;
}

export function trackMetric(input: unknown): void {
  try {
    const parsed = trackMetricInputSchema.safeParse(input);

    if (!parsed.success) {
      return;
    }

    const data = parsed.data;
    const event: MetricEvent = {
      id: crypto.randomUUID(),
      timestamp: data.timestamp ?? new Date().toISOString(),
      name: data.name,
      kind: data.kind,
      value: data.value,
      tags: redactTags(data.tags),
      ...(data.actorId ? { actorId: data.actorId } : {}),
      ...(data.source ? { source: data.source } : {}),
    };

    pushEvent(event);

    if (data.actorId && shouldEvaluate(data.actorId)) {
      recordAnomaliesForActor(data.actorId);
    }
  } catch {
    // Tracking tidak boleh mengubah hasil request.
  }
}

/**
 * Ukur durasi `fn` dan catat sebagai histogram (ms).
 *
 * ```ts
 * const users = await withMetric("app.server_action.latency", () => listUsers());
 * ```
 */
export async function withMetric<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();

    trackMetric({
      name,
      kind: "histogram",
      value: Math.round(performance.now() - start),
      tags: { ...tags, status: "success" },
    });

    return result;
  } catch (error) {
    trackMetric({
      name,
      kind: "histogram",
      value: Math.round(performance.now() - start),
      tags: { ...tags, status: "error" },
    });

    throw error;
  }
}
