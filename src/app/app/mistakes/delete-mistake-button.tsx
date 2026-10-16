"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteMistakeAction } from "@/app/app/notebook/actions";
import { useHydrated } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function DeleteMistakeButton({ id }: { id: string }) {
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted"
      disabled={!hydrated || pending}
      onClick={() => {
        if (confirm("Delete this mistake from your history?")) startTransition(() => deleteMistakeAction(id));
      }}
    >
      <Trash2 aria-hidden /> Delete
    </Button>
  );
}
