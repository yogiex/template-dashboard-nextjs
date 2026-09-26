"use client";

import * as React from "react";
import { cn } from "cn";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Label untuk `role="group"`, diumumkan screen reader sebagai satu grup. */
  groupLabel: string;
  /** Id elemen yang menjelaskan kondisi (pesan error / helper). */
  describedById?: string;
  invalid?: boolean;
  className?: string;
}

const DIGIT_PATTERN = /\D/g;

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  groupLabel,
  describedById,
  invalid = false,
  className,
}: OtpInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(
    () =>
      value.replace(DIGIT_PATTERN, "").slice(0, length).split("").concat(
        Array.from({ length }, () => ""),
      ),
    [value, length],
  );
  const focusAt = React.useCallback((index: number) => {
    const element = inputsRef.current[index];

    if (element) {
      element.focus();
      element.select();
    }
  }, []);

  const commit = React.useCallback(
    (next: string[]) => {
      const nextValue = next.join("").slice(0, length);

      onChange(nextValue);

      if (onComplete && nextValue.length === length) {
        onComplete(nextValue);
      }
    },
    [length, onChange, onComplete],
  );

  const distribute = React.useCallback(
    (text: string, startIndex: number) => {
      const chars = text.split("").slice(0, length - startIndex);

      if (chars.length === 0) {
        return;
      }

      const next = [...digits];

      chars.forEach((char, offset) => {
        next[startIndex + offset] = char;
      });

      commit(next);
      focusAt(Math.min(startIndex + chars.length, length - 1));
    },
    [commit, digits, focusAt, length],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const raw = event.target.value.replace(DIGIT_PATTERN, "");

    if (raw.length === 0) {
      return;
    }

    if (raw.length > 1) {
      distribute(raw, index);
      return;
    }

    const next = [...digits];

    next[index] = raw;
    commit(next);

    if (index < length - 1) {
      focusAt(index + 1);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      const next = [...digits];

      if (next[index]) {
        next[index] = "";
        commit(next);
        return;
      }

      if (index > 0) {
        next[index - 1] = "";
        commit(next);
        focusAt(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").replace(DIGIT_PATTERN, "");

    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    distribute(text, 0);
  };

  return (
    <div
      role="group"
      aria-label={groupLabel}
      aria-describedby={describedById}
      className={cn("flex justify-center gap-2", className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(event, index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onFocus={(event) => event.target.select()}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          // Hanya kotak pertama yang diisi otomatis (SMS/MFA); sisanya off.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} dari ${length}`}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-semibold tabular-nums shadow-sm transition-colors",
            "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
