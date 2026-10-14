"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_CONFIG } from "@/config/support";
import {
  replySchema,
  type Ticket,
  type TicketStatus,
} from "@/features/support/schema";
import {
  replyToTicket,
  updateTicketStatus,
} from "@/features/support/service";

const S = SUPPORT_CONFIG;

export function TicketThread({
  ticket,
  onChanged,
}: {
  ticket: Ticket;
  onChanged: (next: Ticket) => void;
}) {
  const [body, setBody] = useState("");

  const submit = () => {
    const parsed = replySchema.safeParse({ body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Balasan invalid");
      return;
    }
    const next = replyToTicket(ticket.id, parsed.data.body);
    if (next) {
      onChanged(next);
      setBody("");
      toast.success(S.thread.replySuccess);
    } else {
      toast.error("Gagal mengirim balasan.");
    }
  };

  const changeStatus = (nextStatus: TicketStatus) => {
    const updated = updateTicketStatus(ticket.id, nextStatus);
    if (updated) onChanged(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{S.thread.title}</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{S.thread.assignLabel}</span>
          <select
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value as TicketStatus)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Ubah status tiket"
          >
            <option value="open">{S.status.open}</option>
            <option value="pending">{S.status.pending}</option>
            <option value="closed">{S.status.closed}</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        {ticket.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{S.thread.empty}</p>
        ) : (
          ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.authorRole === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                  m.authorRole === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-xs font-medium opacity-75">
                  {m.authorName}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[10px] opacity-60">
                  {new Date(m.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={S.thread.replyPlaceholder}
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={submit} size="sm">
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {S.thread.replyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}


