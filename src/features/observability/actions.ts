"use server";

import { logger } from "@/lib/logger";
import { trackMetricInputSchema } from "@/features/observability/schema";
import { pushEvent, resetStore } from "@/features/observability/lib/store";
import { redactTags } from "@/lib/redact";
import { recordAnomaliesForActor } from "@/features/ueba/service";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { AppError, getErrorMessage, type ErrorCode } from "@/lib/error";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireRole, requireSession } from "@/lib/rbac";

export type SeedActionState =
  | { success: true; data: { events: number } }
  | { success: false; error: { code: ErrorCode; message: string } };

/**
 * Seed data demo supaya halaman observability/UEBA tidak kosong saat pertama
 * dibuka. Hanya boleh jalan di luar production: aktivitas hasil seed adalah
 * data rekaan, bukan metrik asli.
 *
 * Dua guard dengan tujuan berbeda, keduanya wajib dan tidak saling menggantikan:
 *
 * - **Authz** (`requireRole(..., "admin")`): `resetStore()` menghapus seluruh
 *   event store, jadi ini operasi destruktif terhadap data milik semua aktor,
 *   bukan data milik pemanggil. Role minimum mengikuti konvensi repo untuk mutasi
 *   yang merusak data bersama — disposal log dan create/update/delete user juga
 *   `admin` — bukan `editor`, yang memang tidak punya `settings.view` di matriks
 *   permission.
 * - **Environment**: di production fitur ini harus mati, karena hasil seed bukan
 *   metrik asli dan akan menyesatkan siapa pun yang membacanya.
 *
 * Urutannya authz lebih dulu: pemeriksaan `NODE_ENV` di depan akan membocorkan
 * ke pem anonim bahwa fitur seed tersedia di environment ini.
 */
export async function seedDemoMetricsAction(): Promise<SeedActionState> {
  try {
    const session = await requireSession();

    requireRole(session, "admin");
    enforceRateLimit(session.id, "observability-seed-demo");

    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seed data demo hanya tersedia di luar production.",
        },
      };
    }


    resetStore();

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const actors = ["usr_demo", "usr_analyst", "usr_support"] as const;
    const events: Array<{ input: unknown }> = [];

    for (let dayAgo = 6; dayAgo >= 0; dayAgo -= 1) {
      for (const actorId of actors) {
        const weekday = new Date(now - dayAgo * dayMs).getDay();
        const officeHours = weekday === 0 || weekday === 6 ? 2 : 6;
        const count = Math.max(1, officeHours - (dayAgo % 3));

        for (let index = 0; index < count; index += 1) {
          // Congkak aktivitas di jam kerja, sisanya tersebar.
          const hour = 8 + Math.floor((index * 2) / count);
          const timestamp = new Date(
            now - dayAgo * dayMs - (24 - hour) * 60 * 60 * 1000,
          ).toISOString();

          events.push({
            input: {
              name: METRIC_NAMES.LOGIN_ATTEMPT,
              timestamp,
              actorId,
              tags: { ip: `demo-ip-${actorId}-a`, userAgent: "demo-browser/1.0" },
            },
          });

          if (index % 3 === 0) {
            events.push({
              input: {
                name: METRIC_NAMES.LOGIN_SUCCESS,
                timestamp,
                actorId,
                tags: { ip: `demo-ip-${actorId}-a` },
              },
            });
          }
        }
      }
    }

    // Aktivitas larut malam dari satu aktor supaya baseline jam tidak
    // wajar ikut terpicu.
    events.push({
      input: {
        name: METRIC_NAMES.LOGIN_ATTEMPT,
        timestamp: new Date(
          now - dayMs - 3 * 60 * 60 * 1000,
        ).toISOString(),
        actorId: "usr_analyst",
        tags: { ip: "demo-ip-usr_analyst-b", userAgent: "demo-browser/2.0" },
      },
    });

    // Burst login gagal untuk mendemonstrasikan deteksi anomali.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      events.push({
        input: {
          name: METRIC_NAMES.LOGIN_FAILURE,
          timestamp: new Date(
            now - (30 - attempt) * 60 * 1000,
          ).toISOString(),
          actorId: "usr_support",
          tags: { ip: "demo-ip-usr_support-z" },
        },
      });
    }

    let written = 0;

    for (const { input } of events) {
      const parsed = trackMetricInputSchema.safeParse(input);

      if (!parsed.success) {
        continue;
      }

      pushEvent({
        id: crypto.randomUUID(),
        timestamp: parsed.data.timestamp ?? new Date().toISOString(),
        name: parsed.data.name,
        kind: parsed.data.kind,
        value: parsed.data.value,
        tags: redactTags(parsed.data.tags),
        ...(parsed.data.actorId ? { actorId: parsed.data.actorId } : {}),
      });
      written += 1;
    }

    for (const actorId of ["usr_analyst", "usr_support"]) {
      recordAnomaliesForActor(actorId, now);
    }

    logger.info("observability.demo_seeded", { events: written });

    return { success: true, data: { events: written } };
  } catch (error) {
    if (error instanceof AppError) {
      // Guard dan rate limit sudah menolak lebih dulu; jangan log ini sebagai
      // kegagalan tak terduga dan jangan bocorkan detailnya ke client.
      return {
        success: false,
        error: { code: error.code, message: getErrorMessage(error.code) },
      };
    }

    logger.error("observability.seed_failed", error);

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Gagal mengisi data demo. Coba lagi.",
      },
    };
  }
}
