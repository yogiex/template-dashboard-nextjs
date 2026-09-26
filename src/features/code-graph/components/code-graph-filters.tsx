"use client"

import { useId } from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "cn"

import { codeGraphConfig } from "@/config/code-graph"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export type CodeGraphCategoryOption = {
  name: string
  count: number
}

export type CodeGraphFiltersProps = {
  categories: Array<CodeGraphCategoryOption>
  activeCategories: Set<string>
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
  search: string
  onSearchChange: (value: string) => void
  showViolationsOnly: boolean
  onToggleViolations: () => void
}

export function CodeGraphFilters({
  categories,
  activeCategories,
  onToggleCategory,
  onClearCategories,
  search,
  onSearchChange,
  showViolationsOnly,
  onToggleViolations,
}: CodeGraphFiltersProps) {
  const searchId = useId()
  const categoryGroupId = useId()
  const violationsId = useId()
  const violationsHintId = useId()

  const { filters } = codeGraphConfig
  const hasActiveCategories = activeCategories.size > 0

  return (
    <section className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="text-sm font-medium text-foreground">
          {filters.searchLabel}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={filters.searchPlaceholder}
            className="pl-8"
          />
        </div>
      </div>

      <Separator />

      <div
        role="group"
        aria-labelledby={categoryGroupId}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2">
          <p
            id={categoryGroupId}
            className="text-sm font-medium text-foreground"
          >
            {filters.categoryLabel}
          </p>
          {hasActiveCategories ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClearCategories}
            >
              <X data-icon="inline-start" aria-hidden="true" />
              {filters.clearAction}
            </Button>
          ) : null}
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">{filters.noMatches}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {categories.map((category) => {
              const isActive = activeCategories.has(category.name)

              return (
                <li key={category.name}>
                  <Button
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    aria-pressed={isActive}
                    onClick={() => onToggleCategory(category.name)}
                    className="h-8 w-full justify-between gap-2 px-2 font-normal aria-pressed:font-medium"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-transparent"
                        )}
                      >
                        {isActive ? <Check /> : null}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {category.count}
                    </span>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        <Button
          id={violationsId}
          type="button"
          variant="ghost"
          aria-pressed={showViolationsOnly}
          aria-describedby={violationsHintId}
          onClick={onToggleViolations}
          className="h-8 w-full justify-between gap-2 px-2 font-normal aria-pressed:bg-destructive/10 aria-pressed:font-medium aria-pressed:text-destructive"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                showViolationsOnly
                  ? "border-destructive bg-destructive text-white"
                  : "border-border bg-transparent"
              )}
            >
              {showViolationsOnly ? <Check /> : null}
            </span>
            <span className="truncate">{filters.violationsOnlyLabel}</span>
          </span>
        </Button>
        <p id={violationsHintId} className="text-xs text-muted-foreground">
          {filters.violationsOnlyHint}
        </p>
      </div>
    </section>
  )
}
