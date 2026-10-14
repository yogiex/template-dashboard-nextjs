"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { EmptyState } from "@/components/custom/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamRowActions } from "@/features/team/components/team-row-actions";
import { buildListUrl } from "@/lib/search-params";
import { cn } from "cn";
import type { TeamListResult, TeamQuery } from "@/features/team/types";

interface TeamTableProps {
  result: TeamListResult;
  query: TeamQuery;
}

const SORTABLE_FIELDS = ["name", "email", "createdAt"] as const;

export function TeamTable({ result, query }: TeamTableProps) {
  if (result.data.length === 0) {
    return (
      <EmptyState
        title="Tidak ada member"
        description="Coba ubah kata kunci atau filter Anda."
      />
    );
  }

  const buildSortUrl = (field: string) => {
    const currentSort = query.sort ?? "createdAt";
    const currentDir = query.dir ?? "desc";
    const nextDir = currentSort === field && currentDir === "desc" ? "asc" : "desc";
    return buildListUrl("/team", { ...query, sort: field, dir: nextDir, page: 1 });
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {SORTABLE_FIELDS.map((field) => {
              const isActive = query.sort === field;
              const Icon = isActive
                ? query.dir === "asc"
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown;
              return (
                <TableHead key={field}>
                  <Link
                    href={buildSortUrl(field)}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <span className="capitalize">{field}</span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </TableHead>
              );
            })}
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.createdAt.toLocaleDateString("id-ID")}</TableCell>
              <TableCell>
                <Badge variant="outline">{member.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    member.status === "active"
                      ? "secondary"
                      : member.status === "pending"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <TeamRowActions member={member} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
