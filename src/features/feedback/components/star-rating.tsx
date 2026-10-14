"use client";

import { Star } from "lucide-react";
import { cn } from "cn";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}

export function StarRating({ value, onChange, max = 5, disabled }: StarRatingProps) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} dari ${max}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn(
            "h-8 w-8 rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            star <= value
              ? "border-amber-400 bg-amber-50 text-amber-500"
              : "border-border bg-transparent text-muted-foreground hover:text-foreground",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Star
            className="mx-auto h-5 w-5"
            fill={star <= value ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
