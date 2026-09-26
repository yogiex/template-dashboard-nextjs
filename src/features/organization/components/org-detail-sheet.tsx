"use client";

import { CalendarIcon, MailIcon, MapPinIcon, UsersIcon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ORGANIZATION_COPY, ORGANIZATION_FORMAT } from "@/config/organization";
import type { Employee, EmployeeDetail } from "@/features/organization/types";

export interface OrgDetailSheetProps {
  detail: EmployeeDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEmployee: (id: string) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat(ORGANIZATION_FORMAT.dateLocale, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function PersonRow({
  employee,
  hint,
}: {
  employee: Employee;
  hint: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={employee.name} src={employee.avatarUrl} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {employee.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {employee.role}
        </span>
      </div>
      {hint === null ? null : (
        <Badge variant="outline" className="shrink-0">
          {hint}
        </Badge>
      )}
    </div>
  );
}

export function OrgDetailSheet({
  detail,
  open,
  onOpenChange,
  onSelectEmployee,
}: OrgDetailSheetProps) {
  const copy = ORGANIZATION_COPY;
  const employee = detail?.employee ?? null;
  const managers = detail?.managers ?? [];
  const reports = detail?.reports ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{copy.detailTitle}</SheetTitle>
          <SheetDescription>
            {employee === null ? copy.detailSelectHint : employee.role}
          </SheetDescription>
        </SheetHeader>

        {employee === null || detail === null ? (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {copy.detailSelectHint}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="flex items-center gap-3">
              <Avatar name={employee.name} src={employee.avatarUrl} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-base font-medium text-foreground">
                  {employee.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {employee.role}
                </p>
                <Badge variant="secondary" className="w-fit">
                  {employee.department}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MailIcon aria-hidden="true" className="size-4" />
                {copy.detailEmailLabel}
              </dt>
              <dd className="min-w-0 truncate">
                <a
                  href={`mailto:${employee.email}`}
                  className="truncate text-foreground underline-offset-4 hover:underline"
                >
                  {employee.email}
                </a>
              </dd>

              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MapPinIcon aria-hidden="true" className="size-4" />
                {copy.detailLocationLabel}
              </dt>
              <dd className="min-w-0 truncate text-foreground">
                {employee.location}
              </dd>

              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon aria-hidden="true" className="size-4" />
                {copy.detailJoinedLabel}
              </dt>
              <dd className="min-w-0 truncate text-foreground">
                {ORGANIZATION_FORMAT.joinedTemplate.replace(
                  "{date}",
                  DATE_FORMAT.format(new Date(employee.joinedAt)),
                )}
              </dd>
            </dl>

            <Separator />

            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <UsersIcon aria-hidden="true" className="size-4" />
                {copy.detailManagerChainTitle}
              </h3>
              {managers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {copy.detailNoManagerLabel}
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {managers.map((manager, index) => (
                    <li key={manager.id}>
                      <PersonRow
                        employee={manager}
                        hint={
                          index === 0
                            ? copy.detailTopManagerLabel
                            : index === managers.length - 1
                              ? copy.detailManagerLabel
                              : null
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Separator />

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {copy.detailDirectReportsLabel}
              </h3>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {copy.detailNoReportsLabel}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-start px-2 py-1.5 text-left"
                        onClick={() => {
                          onSelectEmployee(report.id);
                        }}
                      >
                        <Avatar
                          name={report.name}
                          src={report.avatarUrl}
                          size="sm"
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {report.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {report.role}
                          </span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
