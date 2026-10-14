"use client";

import Link from "next/link";
import { cn } from "cn";
import {
  ShieldCheck,
  Database,
  Settings,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";

import type { Activity } from "@/features/activity/schema";

const CATEGORY_ICON: Record<Activity["category"], LucideIcon> = {
  auth: ShieldCheck,
  data: Database,
  config: Settings,
  security: AlertTriangle,
  system: Info,
};

const CATEGORY_CLASS: Record<Activity["category"], string> = {
  auth: "text-primary",
  data: "text-muted-foreground",
  config: "text-muted-foreground",
  security: "text-risk-medium",
  system: "text-muted-foreground",
};

function formatRelativeTime(date: Date, now: Date): string {
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return "baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = CATEGORY_ICON[activity.category];
  const now = new Date();

  const content = (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          CATEGORY_CLASS[activity.category],
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{activity.actor}</span>{" "}
          <span className="text-muted-foreground">{activity.action}</span>{" "}
          <span className="font-medium">{activity.target}</span>
        </p>
        <time
          dateTime={activity.createdAt.toISOString()}
          className="mt-0.5 block text-xs text-muted-foreground tabular-nums"
        >
          {formatRelativeTime(activity.createdAt, now)}
        </time>
      </div>
    </div>
  );

  if (activity.href) {
    return (
      <li className="border-b last:border-b-0">
        <Link
          href={activity.href}
          className="block transition-colors hover:bg-accent"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b last:border-b-0">
      <div className="block w-full text-left">{content}</div>
    </li>
  );
}
