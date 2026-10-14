import { z } from "zod";

export const ticketPrioritySchema = z.enum(["low", "normal", "high"]);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketStatusSchema = z.enum(["open", "pending", "closed"]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketMessageSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  authorRole: z.enum(["user", "agent"]),
  authorName: z.string().min(1).max(60),
  body: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
});

export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export const ticketSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  subject: z.string().min(1).max(120),
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(ticketMessageSchema).max(200),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const ticketListSchema = z.array(ticketSchema).max(200);

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Judul wajib diisi")
    .max(120, "Judul maksimal 120 karakter"),
  priority: ticketPrioritySchema,
  message: z
    .string()
    .trim()
    .min(1, "Pesan wajib diisi")
    .max(2000, "Pesan maksimal 2000 karakter"),
});

export type CreateTicketValues = z.infer<typeof createTicketSchema>;

export const replySchema = z.object({
  body: z.string().trim().min(1, "Balasan wajib diisi").max(2000, "Balasan maksimal 2000 karakter"),
});

export type ReplyValues = z.infer<typeof replySchema>;

export function createTicketId(): string {
  try {
    return `tkt_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  } catch {
    return `tkt_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function createMessageId(): string {
  try {
    return `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  } catch {
    return `msg_${Math.random().toString(36).slice(2, 12)}`;
  }
}
