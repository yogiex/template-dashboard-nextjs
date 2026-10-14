"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AI_CONFIG, AI_PROVIDER_CONFIG } from "@/config/ai";
import type { AiProviderId } from "@/config/ai";
import { isModelForProvider, sendChatSchema, type AiMessage } from "@/features/ai/schema";
import { streamMockReply } from "@/features/ai/lib/ai-mock";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function createId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiChat() {
  const [provider, setProvider] = useState<AiProviderId>(AI_CONFIG.defaultProvider);
  const [model, setModel] = useState<string>(AI_CONFIG.defaultModel);
  const [apiKey, setApiKey] = useState(() => {
    try {
      if (typeof window === "undefined") return "";
      return window.localStorage.getItem(`ai.key.${AI_CONFIG.defaultProvider}`) ?? "";
    } catch {
      return "";
    }
  });
  const [rememberKey, setRememberKey] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const providerConfig = AI_PROVIDER_CONFIG[provider];

  function handleProviderChange(next: AiProviderId) {
    setProvider(next);
    const firstModel = AI_PROVIDER_CONFIG[next].models[0]?.id;
    setModel(firstModel ?? AI_CONFIG.defaultModel);
    try {
      const stored = window.localStorage.getItem(`ai.key.${next}`);
      setApiKey(stored ?? "");
    } catch {
      setApiKey("");
    }
  }

  useEffect(() => {
    if (!rememberKey) return;
    if (!apiKey) return;
    try {
      window.localStorage.setItem(`ai.key.${provider}`, apiKey);
    } catch {
      // Abaikan kegagalan storage; tidak menghalangi UI.
    }
  }, [apiKey, rememberKey, provider]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const forgetKey = useCallback(() => {
    setApiKey("");
    setRememberKey(false);
    try {
      window.localStorage.removeItem(`ai.key.${provider}`);
    } catch {
      // no-op
    }
  }, [provider]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    if (isStreaming) return;
    setMessages([]);
    setError(null);
  }, [isStreaming]);

  const handleSend = useCallback(async () => {
    if (isStreaming) return;
    setError(null);

    const trimmedPrompt = prompt.trim();
    const parsed = sendChatSchema.safeParse({
      provider,
      model,
      apiKey,
      prompt: trimmedPrompt,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Input tidak valid");
      return;
    }
    if (!isModelForProvider(provider, model)) {
      setError("Model tidak tersedia untuk provider ini.");
      return;
    }

    const now = new Date().toISOString();
    const userMessage: AiMessage = {
      id: createId(),
      role: "user",
      content: trimmedPrompt,
      createdAt: now,
    };
    const assistantId = createId();
    const assistantMessage: AiMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: now,
    };

    const historyLimit = AI_CONFIG.limits.historyMaxMessages;
    const baseHistory = [...messages, userMessage].slice(-historyLimit);

    setMessages((prev) => [...prev, userMessage, assistantMessage].slice(-historyLimit));
    setPrompt("");

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      await streamMockReply({
        provider,
        model,
        messages: baseHistory,
        signal: controller.signal,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m,
            ),
          );
        },
      });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === "AbortError") {
        setError("Streaming dihentikan.");
      } else {
        setError("Gagal menyimulasikan respons. Coba lagi.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, prompt, provider, model, apiKey, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant (Demo)</CardTitle>
          <CardDescription>{AI_CONFIG.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert>
            <AlertDescription>{AI_CONFIG.infoAlert}</AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">{AI_CONFIG.providerLabel}</Label>
              <Select value={provider} onValueChange={(v) => handleProviderChange(v as AiProviderId)}>
                <SelectTrigger id="ai-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_CONFIG.providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-model">{AI_CONFIG.modelLabel}</Label>
              <Select value={model} onValueChange={(v) => setModel(String(v))}>
                <SelectTrigger id="ai-model" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerConfig.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-key">{AI_CONFIG.keyLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerConfig.keyPlaceholder}
                autoComplete="off"
                className="h-10 flex-1"
              />
              <Button type="button" variant="outline" onClick={forgetKey} disabled={!apiKey}>
                {AI_CONFIG.forgetKeyLabel}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => setRememberKey(e.target.checked)}
                className="size-4 rounded border-input"
              />
              {AI_CONFIG.rememberKeyLabel}
            </label>
            <p className="text-xs text-muted-foreground">{AI_CONFIG.rememberKeyWarning}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Percakapan</CardTitle>
            <CardDescription>
              Respons berupa simulasi streaming. Enter untuk kirim, Shift+Enter untuk baris baru.
            </CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={isStreaming || messages.length === 0}>
            {AI_CONFIG.clearLabel}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            className="min-h-[240px] max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-sm font-medium">{AI_CONFIG.emptyStateTitle}</p>
                <p className="text-xs text-muted-foreground">{AI_CONFIG.emptyStateDescription}</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-border"
                    }
                  >
                    {m.content || (m.role === "assistant" && isStreaming ? "…" : "")}
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="space-y-3"
          >
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={AI_CONFIG.promptPlaceholder}
              maxLength={AI_CONFIG.limits.promptMaxLength}
              rows={3}
              className="min-h-[80px]"
              disabled={isStreaming}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {prompt.length}/{AI_CONFIG.limits.promptMaxLength}
              </p>
              <div className="flex gap-2">
                {isStreaming ? (
                  <Button type="button" variant="secondary" onClick={handleStop}>
                    {AI_CONFIG.stopLabel}
                  </Button>
                ) : null}
                <Button type="submit" disabled={isStreaming || prompt.trim().length === 0}>
                  {AI_CONFIG.sendLabel}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
