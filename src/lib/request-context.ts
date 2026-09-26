import "server-only";

import { headers } from "next/headers";

import {
  hashIp,
  maskEmail,
  truncateUserAgent,
} from "@/lib/redact";

/**
 * Konteks request yang aman untuk metrik: tidak pernah menyimpan IP atau
 * user-agent mentah. `ipHash` dipakai sebagai "id device" oleh UEBA sehingga
 * anomali "IP baru" tetap bisa dideteksi tanpa menyimpan alamat asli.
 */
export type RequestContext = {
  ipHash: string | null;
  userAgent: string | null;
  path: string | null;
  actorEmail: string | null;
};

export async function getRequestContext(): Promise<RequestContext> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const firstIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = headerList.get("x-real-ip") ?? firstIp;
  const rawUserAgent = headerList.get("user-agent");

  return {
    ipHash: realIp ? hashIp(realIp) : null,
    userAgent: rawUserAgent ? truncateUserAgent(rawUserAgent) : null,
    path: headerList.get("x-pathname") ?? headerList.get("x-invoke-path"),
    actorEmail: null,
  };
}

/**
 * Versi yang tidak pernah melempar exception, untuk dipanggil di hot path yang
 * tidak boleh gagal (mis. pencatatan metrik).
 */
export async function getSafeRequestContext(): Promise<RequestContext> {
  try {
    return await getRequestContext();
  } catch {
    return { ipHash: null, userAgent: null, path: null, actorEmail: null };
  }
}

export function maskActorEmail(email: string | null): string | null {
  return email ? maskEmail(email) : null;
}
