"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/custom/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/features/notification/hooks/use-notifications";
import { NOTIFICATION_PAGE_CONFIG } from "@/config/notification-page";
import type { Notification } from "@/features/notification/schema";

const TYPE_ICON: Record<Notification["type"], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const TYPE_COLOR: Record<Notification["type"], string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-risk-medium",
  error: "text-destructive",
};

function formatRelative(date: Date, now: Date): string {
  const m = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export function NotificationInbox() {
  const { notifications, unreadCount, isLoaded, markAsRead, markAllAsRead } =
    useNotifications();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Notification["type"]>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    let list = notifications;
    if (filter !== "all") list = list.filter((n) => n.type === filter);
    if (readFilter === "unread") list = list.filter((n) => !n.isRead);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [notifications, filter, readFilter, query]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Cari notifikasi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter tipe"
        >
          <option value="all">{NOTIFICATION_PAGE_CONFIG.allLabel}</option>
          <option value="info">{NOTIFICATION_PAGE_CONFIG.filterLabels.info}</option>
          <option value="success">
            {NOTIFICATION_PAGE_CONFIG.filterLabels.success}
          </option>
          <option value="warning">
            {NOTIFICATION_PAGE_CONFIG.filterLabels.warning}
          </option>
          <option value="error">{NOTIFICATION_PAGE_CONFIG.filterLabels.error}</option>
        </select>
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter status baca"
        >
          <option value="all">{NOTIFICATION_PAGE_CONFIG.allLabel}</option>
          <option value="unread">{NOTIFICATION_PAGE_CONFIG.unreadLabel}</option>
        </select>
        <div className="sm:ml-auto">
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            {NOTIFICATION_PAGE_CONFIG.markAllRead}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {unreadCount} {NOTIFICATION_PAGE_CONFIG.unreadLabel.toLowerCase()}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title={NOTIFICATION_PAGE_CONFIG.emptyTitle}
          description={NOTIFICATION_PAGE_CONFIG.emptyDescription}
          icon={Info}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Info;
            const meta = TYPE_COLOR[n.type] ?? "text-muted-foreground";
            return (
              <Alert
                key={n.id}
                className={
                  !n.isRead ? "border-primary/30 bg-primary/5" : undefined
                }
              >
                <Icon className={`h-4 w-4 ${meta}`} aria-hidden="true" />
                <AlertTitle className="flex items-center gap-2">
                  {n.title}
                  {!n.isRead ? (
                    <Badge variant="outline" className="ml-1">
                      {NOTIFICATION_PAGE_CONFIG.newLabel}
                    </Badge>
                  ) : null}
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-1">
                  <span>{n.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(n.createdAt, now)}
                  </span>
                  <div className="flex gap-2 pt-2">
                    {!n.isRead ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(n.id)}
                      >
                        {NOTIFICATION_PAGE_CONFIG.markAsReadLabel}
                      </Button>
                    ) : null}
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {NOTIFICATION_PAGE_CONFIG.viewLinkLabel}
                      </Link>
                    ) : null}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}
    </div>
  );
}
