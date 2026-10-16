"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleBookmarkAction } from "@/app/app/notebook/actions";
import { useHydrated } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function BookmarkButton({ lessonSlug, initial }: { lessonSlug: string; initial: boolean }) {
  const hydrated = useHydrated();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={on}
      disabled={!hydrated || pending}
      onClick={() => startTransition(async () => setOn(await toggleBookmarkAction(lessonSlug)))}
    >
      {on ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {on ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
