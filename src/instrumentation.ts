/**
 * Titik aktivasi runtime metrics.
 *
 * `register()` dipanggil sekali saat instance server Next.js dinyalakan, pada
 * Node.js maupun Edge runtime. Karena bundle server dan client dipisah, modul
 * yang hanya valid untuk Node.js (`node:perf_hooks`, `process.*`) tidak boleh
 * di-import statis: itu membuat modul ikut ter-bundle di sisi client dan bisa
 * gagal saat build. Karena itu `runtime-metrics` selalu dimuat lewat dynamic
 * `import()` di dalam percabangan runtime.
 *
 * Ini satu-satunya tempat runtime metrics diaktifkan; jangan panggil
 * `startRuntimeMetrics()` dari halaman, action, atau service.
 */
export async function register(): Promise<void> {
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
      return;
    }

    const { startRuntimeMetrics } = await import("@/lib/runtime-metrics");

    startRuntimeMetrics();
  } catch {
    // `register()` tidak boleh melempar: kalau gagal, aplikasi tetap harus
    // melayani request, hanya tanpa metrik runtime.
  }
}
