import { AI_CONFIG } from "@/config/ai";

export type StreamMockOptions = {
  provider: string;
  model: string;
  messages: { role: string; content: string }[];
  signal?: AbortSignal;
  onToken: (token: string) => void;
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Permintaan dibatalkan.", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Permintaan dibatalkan.", "AbortError"));
        },
        { once: true },
      );
    }
  });
}

function chunkText(text: string): string[] {
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  let acc = "";

  for (const word of words) {
    acc += word;
    if (acc.length >= 8 || word.includes("\n")) {
      chunks.push(acc);
      acc = "";
    }
  }

  if (acc) chunks.push(acc);
  return chunks;
}

function buildReply(provider: string, model: string, prompt: string): string {
  const trimmed = prompt.trim();
  const providerName =
    AI_CONFIG.providers.find((p) => p.id === provider)?.name ?? provider;

  if (!trimmed) {
    return "Silakan kirim pertanyaan atau instruksi.";
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("ringkas") || lower.includes("summarize")) {
    return `Mock ${providerName} / ${model}: Ringkasan singkat — "${trimmed.slice(0, 120)}${trimmed.length > 120 ? "..." : ""}".\n\nIni adalah contoh respons simulasi, bukan hasil model nyata.`;
  }

  if (lower.includes("kode") || lower.includes("code")) {
    return `Mock ${providerName} / ${model}: Berikut contoh pseudocode untuk: "${trimmed}".\n\n1. Validasi input\n2. Proses sesuai kebutuhan\n3. Kembalikan hasil yang aman\n\nCatatan: contoh ini hanya simulasi, bukan kode produksi.`;
  }

  return `Mock ${providerName} / ${model}: Terima kasih atas pertanyaan "${trimmed}".\n\nIni adalah respons simulasi untuk demo UI streaming. Dalam implementasi nyata, jawaban akan datang dari provider yang dipilih. Untuk testing lain, coba minta "ringkas ..." atau "kode ...".`;
}

export async function streamMockReply(options: StreamMockOptions): Promise<void> {
  const { provider, model, messages, signal, onToken } = options;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const reply = buildReply(provider, model, lastUser?.content ?? "");
  const chunks = chunkText(reply);

  for (const chunk of chunks) {
    if (signal?.aborted) {
      throw new DOMException("Permintaan dibatalkan.", "AbortError");
    }
    onToken(chunk);
    await delay(AI_CONFIG.limits.chunkDelayMs, signal);
  }
}
