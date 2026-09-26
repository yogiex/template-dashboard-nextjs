"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  strengthMeterId?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      id,
      "aria-describedby": ariaDescribedBy,
      strengthMeterId,
      ...props
    },
    ref
  ) {
    const [isVisible, setIsVisible] = useState(false);
    const describedBy = [ariaDescribedBy, strengthMeterId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          id={id}
          aria-describedby={describedBy || undefined}
          type={isVisible ? "text" : "password"}
          className={cn("pr-11", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isVisible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute top-1/2 right-1 size-8 -translate-y-1/2 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  }
);
