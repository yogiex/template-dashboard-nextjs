"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SeedDemoButtonProps {
  label: string;
}

export function SeedDemoButton({ label }: SeedDemoButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);

  const run = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);

    try {
      const result = { success: true, message: "Demo mode - backend not connected" };

      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("[seed-demo-button] seed failed", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9"
      disabled={isRunning}
      onClick={() => void run()}
    >
      {isRunning ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {isRunning ? "Mengisi..." : label}
    </Button>
  );
}
