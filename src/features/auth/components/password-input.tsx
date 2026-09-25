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
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          aria-label={isVisible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
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
