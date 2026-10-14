import { Sparkles } from "lucide-react";

export type AiProviderId = "openai" | "anthropic";

export type AiModel = {
  id: string;
  label: string;
};

export type AiProvider = {
  id: AiProviderId;
  name: string;
  keyLabel: string;
  keyPlaceholder: string;
  models: AiModel[];
};

export const AI_CONFIG = {
  title: "AI Assistant",
  description: "Workspace chat dengan AI. Mode demo — respons disimulasikan di browser, tidak ada panggilan API nyata.",
  infoAlert:
    "Mode demo: respons AI disimulasikan di browser. API key tidak dipakai dan tidak dikirim ke mana pun, tapi tetap perlakukan sebagai secret.",
  keyLabel: "API Key (opsional secara teknis, demo)",
  keyPlaceholder: "sk-...",
  rememberKeyLabel: "Simpan key di browser ini (localStorage)",
  rememberKeyWarning:
    "Menyimpan key meningkatkan risiko kebocoran (XSS). Hanya gunakan di perangkat pribadi.",
  providerLabel: "Provider",
  modelLabel: "Model",
  promptPlaceholder: "Tulis pertanyaan atau instruksi...",
  sendLabel: "Kirim",
  stopLabel: "Stop",
  clearLabel: "Bersihkan",
  forgetKeyLabel: "Lupa key",
  providers: [
    {
      id: "openai",
      name: "OpenAI",
      keyLabel: "OpenAI API Key",
      keyPlaceholder: "sk-...",
      models: [
        { id: "gpt-4o-mini", label: "gpt-4o-mini" },
        { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
        { id: "gpt-4.1", label: "gpt-4.1" },
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      keyLabel: "Anthropic API Key",
      keyPlaceholder: "sk-ant-...",
      models: [
        { id: "claude-3-5-haiku-latest", label: "claude-3-5-haiku-latest" },
        { id: "claude-3-5-sonnet-latest", label: "claude-3-5-sonnet-latest" },
      ],
    },
  ] as const satisfies readonly AiProvider[],
  defaultProvider: "openai" as AiProviderId,
  defaultModel: "gpt-4o-mini",
  limits: {
    promptMaxLength: 2000,
    historyMaxMessages: 20,
    chunkDelayMs: 28,
  },
  emptyStateTitle: "Mulai percakapan",
  emptyStateDescription: "Ketik prompt di bawah. Jawaban akan disimulasikan sebagai streaming token.",
} as const;

export const AI_PROVIDER_IDS = AI_CONFIG.providers.map((p) => p.id);

export const AI_PROVIDER_CONFIG = {
  openai: AI_CONFIG.providers[0],
  anthropic: AI_CONFIG.providers[1],
} as const satisfies Record<AiProviderId, AiProvider>;

export const AI_ICON = Sparkles;
