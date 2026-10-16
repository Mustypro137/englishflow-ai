"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleSavedWordAction } from "@/app/app/notebook/actions";
import { useHydrated } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function SaveWordButton({
  entryId,
  headword,
  initiallySaved,
}: {
  entryId: string;
  headword: string;
  initiallySaved: boolean;
}) {
  const hydrated = useHydrated();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={saved ? "secondary" : "primary"}
      aria-pressed={saved}
      aria-label={saved ? `Remove “${headword}” from my words` : `Save “${headword}” to my words`}
      disabled={!hydrated || pending}
      onClick={() =>
        startTransition(async () => {
          setSaved(await toggleSavedWordAction(entryId, !saved));
        })
      }
    >
      {saved ? <BookmarkCheck aria-hidden /> : <BookmarkPlus aria-hidden />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
