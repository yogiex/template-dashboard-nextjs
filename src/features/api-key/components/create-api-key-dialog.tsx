"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { API_KEYS_CONFIG } from "@/config/api-keys";
import { type ScopeKey } from "@/features/api-key/schema";
import { createApiKey } from "@/features/api-key/service";

const C = API_KEYS_CONFIG;
const ALL_SCOPES = Object.keys(C.scopesCatalog) as ScopeKey[];

interface Props {
  onCreated: () => void;
}

export function CreateApiKeyDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ScopeKey[]>([]);
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  const toggle = (scope: ScopeKey) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const reset = () => {
    setName("");
    setScopes([]);
    setRevealed(null);
    setPending(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const submit = async () => {
    if (!name.trim() || scopes.length === 0) {
      toast.error("Lengkapi nama dan minimal satu scope.");
      return;
    }
    setPending(true);
    const created = await createApiKey(name.trim(), scopes);
    setPending(false);
    if (!created) {
      toast.error("Gagal membuat API key.");
      return;
    }
    setRevealed(created.raw);
    toast.success(C.createdLabel);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="h-10">{C.createLabel}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{C.createLabel}</DialogTitle>
          <DialogDescription>{C.securityWarning}</DialogDescription>
        </DialogHeader>

        {revealed ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>{C.createdLabel}</AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={revealed}
                className="h-10 font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(revealed).catch(() => {});
                  toast.success(C.copiedLabel);
                }}
              >
                {C.copyLabel}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{C.infoAlert}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">{C.nameLabel}</Label>
              <Input
                id="key-name"
                placeholder={C.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{C.scopesLabel}</p>
              <p className="text-xs text-muted-foreground">{C.scopesHelp}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={scopes.includes(scope)}
                      onCheckedChange={() => toggle(scope)}
                    />
                    <span>
                      <span className="font-mono text-xs">{scope}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {C.scopesCatalog[scope]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {C.createLabel}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
