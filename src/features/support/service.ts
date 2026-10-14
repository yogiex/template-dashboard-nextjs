import { clientLogger } from "@/lib/logger-client";
import { ticketListSchema, type Ticket, type TicketPriority, type TicketStatus, createTicketId, createMessageId } from "@/features/support/schema";
import { SUPPORT_CONFIG } from "@/config/support";

export type { Ticket, TicketPriority, TicketStatus };

const STORAGE_KEY = "support.tickets";

const AGENT_NAME = "Tim Support";

function baseTickets(): Ticket[] {
  const now = Date.now();
  return [
    {
      id: "tkt_seed_1",
      subject: "Tidak bisa masuk setelah ganti password",
      priority: "high",
      status: "open",
      createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      updatedAt: new Date(now - 1 * 60 * 60_000).toISOString(),
      messages: [
        {
          id: "msg_1",
          authorRole: "user",
          authorName: "Budi Santoso",
          body: "Saya tidak bisa login setelah mereset password. Muncul error 'invalid credentials'.",
          createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
        },
        {
          id: "msg_2",
          authorRole: "agent",
          authorName: AGENT_NAME,
          body: "Halo Budi, kami sedang mengecek. Apakah Anda menggunakan email yang sama dengan akun demo?",
          createdAt: new Date(now - 1 * 60 * 60_000).toISOString(),
        },
      ],
    },
    {
      id: "tkt_seed_2",
      subject: "Bagaimana menambah user baru?",
      priority: "normal",
      status: "closed",
      createdAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
      updatedAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
      messages: [
        {
          id: "msg_3",
          authorRole: "user",
          authorName: "Sari Wulandari",
          body: "Dimana menu menambah pengguna?",
          createdAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
        },
        {
          id: "msg_4",
          authorRole: "agent",
          authorName: AGENT_NAME,
          body: "Silakan buka halaman Users lalu tekan Tambah User. Semoga membantu.",
          createdAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
        },
      ],
    },
  ];
}

function parseList(input: unknown): Ticket[] | null {
  const r = ticketListSchema.safeParse(input);
  return r.success ? r.data : null;
}

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return baseTickets();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const base = baseTickets();
      saveTickets(base);
      return base;
    }
    const parsed = JSON.parse(raw);
    const validated = parseList(parsed);
    if (validated) return validated;
    clientLogger.warn("support.tickets.invalid");
    const base = baseTickets();
    saveTickets(base);
    return base;
  } catch (error) {
    clientLogger.error("support.tickets.load_failed", error);
    return baseTickets();
  }
}

export function saveTickets(tickets: Ticket[]): boolean {
  if (typeof window === "undefined") return false;
  const validated = parseList(tickets);
  if (!validated) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return true;
  } catch (error) {
    clientLogger.error("support.tickets.save_failed", error);
    return false;
  }
}

export function findTicket(id: string): Ticket | null {
  return loadTickets().find((t) => t.id === id) ?? null;
}

export function createTicket(
  subject: string,
  priority: Ticket["priority"],
  message: string,
): Ticket | null {
  const tickets = loadTickets();
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: createTicketId(),
    subject: subject.trim(),
    priority,
    status: "open",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: createMessageId(),
        authorRole: "user",
        authorName: "Anda",
        body: message.trim(),
        createdAt: now,
      },
    ],
  };
  tickets.unshift(ticket);
  if (!saveTickets(tickets)) return null;
  return ticket;
}

export function replyToTicket(id: string, body: string): Ticket | null {
  const tickets = loadTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const next = [...tickets];
  next[idx] = {
    ...next[idx],
    updatedAt: now,
    messages: [
      ...next[idx].messages,
      {
        id: createMessageId(),
        authorRole: "user",
        authorName: "Anda",
        body: body.trim(),
        createdAt: now,
      },
    ],
  };
  if (!saveTickets(next)) return null;
  return next[idx];
}

export function updateTicketStatus(id: string, status: Ticket["status"]): Ticket | null {
  const tickets = loadTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next = [...tickets];
  next[idx] = { ...next[idx], status, updatedAt: new Date().toISOString() };
  if (!saveTickets(next)) return null;
  return next[idx];
}
