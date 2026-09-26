"use client";

import { useId } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  MaximizeIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORGANIZATION_COPY, ORGANIZATION_FORMAT } from "@/config/organization";

/** Nilai departemen yang berarti "tanpa filter". */
export const DEPARTMENT_ALL_VALUE = "all";

export interface OrgToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  departments: string[];
  onDepartmentChange: (value: string) => void;
  direction: "TB" | "LR";
  onDirectionChange: (value: "TB" | "LR") => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFitView: () => void;
  onResetLayout: () => void;
  stats: {
    totalEmployees: number;
    departmentCount: number;
    levelCount: number;
  };
}

const NUMBER_FORMAT = new Intl.NumberFormat(ORGANIZATION_FORMAT.numberLocale);

const DIRECTIONS = [
  { value: "TB", label: ORGANIZATION_COPY.directionVerticalLabel },
  { value: "LR", label: ORGANIZATION_COPY.directionHorizontalLabel },
] as const;

export function OrgToolbar({
  search,
  onSearchChange,
  department,
  departments,
  onDepartmentChange,
  direction,
  onDirectionChange,
  onExpandAll,
  onCollapseAll,
  onFitView,
  onResetLayout,
  stats,
}: OrgToolbarProps) {
  const searchId = useId();
  const departmentId = useId();
  const directionLabelId = useId();
  const copy = ORGANIZATION_COPY;

  const statsItems = [
    { label: copy.totalEmployeesLabel, value: stats.totalEmployees },
    { label: copy.departmentCountLabel, value: stats.departmentCount },
    { label: copy.levelCountLabel, value: stats.levelCount },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <section
          aria-label={copy.toolbarLabel}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.statsTitle}
            </p>
            <dl className="grid grid-cols-3 gap-2">
              {statsItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <dd className="text-lg font-semibold text-foreground tabular-nums">
                    {NUMBER_FORMAT.format(item.value)}
                  </dd>
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-2">
              <Label htmlFor={searchId}>{copy.searchLabel}</Label>
              <div className="relative">
                <Input
                  id={searchId}
                  type="search"
                  value={search}
                  placeholder={copy.searchPlaceholder}
                  onChange={(event) => {
                    onSearchChange(event.target.value);
                  }}
                  className={search.length > 0 ? "pr-8" : undefined}
                />
                {search.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={copy.searchClearLabel}
                    className="absolute top-0.5 right-0.5"
                    onClick={() => {
                      onSearchChange("");
                    }}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label id={departmentId}>{copy.departmentLabel}</Label>
              <Select
                value={department}
                onValueChange={(value) => {
                  onDepartmentChange(value ?? DEPARTMENT_ALL_VALUE);
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-labelledby={departmentId}
                  data-size="sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEPARTMENT_ALL_VALUE}>
                    {copy.departmentAllLabel}
                  </SelectItem>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              role="group"
              aria-labelledby={directionLabelId}
              className="flex flex-col gap-2"
            >
              <span id={directionLabelId} className="text-sm font-medium">
                {copy.directionLabel}
              </span>
              <div className="flex items-center gap-2">
                {DIRECTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={direction === option.value ? "default" : "outline"}
                    aria-pressed={direction === option.value}
                    aria-label={option.label}
                    onClick={() => {
                      onDirectionChange(option.value);
                    }}
                  >
                    {option.value === "TB" ? (
                      <ArrowDownIcon aria-hidden="true" />
                    ) : (
                      <ArrowRightIcon aria-hidden="true" />
                    )}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={copy.expandAllLabel}
              onClick={onExpandAll}
            >
              <ChevronsUpIcon aria-hidden="true" />
              {copy.expandAllLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={copy.collapseAllLabel}
              onClick={onCollapseAll}
            >
              <ChevronsDownIcon aria-hidden="true" />
              {copy.collapseAllLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={copy.fitViewLabel}
              onClick={onFitView}
            >
              <MaximizeIcon aria-hidden="true" />
              {copy.fitViewLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={copy.resetLayoutLabel}
              onClick={onResetLayout}
            >
              <RotateCcwIcon aria-hidden="true" />
              {copy.resetLayoutLabel}
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
