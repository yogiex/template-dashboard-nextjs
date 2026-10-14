"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_CONFIG } from "@/config/support";
import {
  createTicket,
  loadTickets,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/features/support/service";
import { createTicketSchema } from "@/features/support/schema";
import { TicketThread } from "@/features/support/components/ticket-thread";

const S = SUPPORT_CONFIG;
const PRIORITY_LABEL = S.priority;
const STATUS_LABEL = S.status;

export function SupportPageClient() {
  const [tickets, setTickets] = useState<Ticket[]>(() => loadTickets());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // create form
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!t.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const refresh = () => setTickets(loadTickets());

  const handleCreate = async () => {
    if (pending) return;
    const parsed = createTicketSchema.safeParse({
      subject,
      priority,
      message,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Input invalid");
      return;
    }
    setPending(true);
    const t = createTicket(parsed.data.subject, parsed.data.priority, parsed.data.message);
    setPending(false);
    if (!t) {
      toast.error("Gagal membuat tiket.");
      return;
    }
    toast.success(S.create.createdLabel);
    setCreateOpen(false);
    setSubject("");
    setPriority("normal");
    setMessage("");
    setSelectedId(t.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{S.infoAlert}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={S.filters.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger aria-label={S.filters.statusLabel}>
            <SelectValue placeholder={S.filters.statusLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{S.filters.allStatus}</SelectItem>
            <SelectItem value="open">{S.status.open}</SelectItem>
            <SelectItem value="pending">{S.status.pending}</SelectItem>
            <SelectItem value="closed">{S.status.closed}</SelectItem>
          </SelectContent>
        </Select>
        {(query || statusFilter !== "all") ? (
          <button
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        ) : null}
        <div className="sm:ml-auto">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button className="h-10">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {S.create.label}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{S.create.label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{S.create.subjectLabel}</label>
                  <Input
                    placeholder={S.create.subjectPlaceholder}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{S.create.priorityLabel}</label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as TicketPriority)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{S.priority.low}</SelectItem>
                      <SelectItem value="normal">{S.priority.normal}</SelectItem>
                      <SelectItem value="high">{S.priority.high}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{S.create.messageLabel}</label>
                  <Textarea
                    placeholder={S.create.messagePlaceholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleCreate} disabled={pending}>
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {S.create.submitLabel}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border p-6 text-center">
              <p className="font-medium">{S.empty.title}</p>
              <p className="text-sm text-muted-foreground">{S.empty.description}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === t.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{t.subject}</p>
                      <Badge
                        variant={
                          t.status === "open"
                            ? "secondary"
                            : t.status === "pending"
                              ? "outline"
                              : "default"
                        }
                      >
                        {STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.id}</span>
                      <span>•</span>
                      <span>{PRIORITY_LABEL[t.priority]}</span>
                      <span>•</span>
                      <span>
                        {new Date(t.updatedAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {selected ? (
            <TicketThread
              ticket={selected}
              onChanged={(next) => {
                setTickets((prev) => prev.map((t) => (t.id === next.id ? next : t)));
              }}
            />
          ) : (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Pilih tiket untuk melihat percakapan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
