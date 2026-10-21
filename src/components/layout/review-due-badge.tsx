import { cache } from "react";
import { getSessionUser } from "@/server/auth/session";
import { countDueReviews } from "@/server/db/reviews";

// The shell renders the badge in both the sidebar and the mobile bar: count once per request.
const dueCount = cache(async () => {
  const user = await getSessionUser();
  return user ? countDueReviews(user.id) : 0;
});

/** Number of reviews due now, shown on the Review link. Nothing when none are due. Reads the session. */
export async function ReviewDueBadge() {
  const n = await dueCount();
  if (n === 0) return null;
  return (
    <span className="bg-accent text-paper rounded-full px-2 py-px text-xs font-bold tabular-nums">
      {n}
      <span className="sr-only"> due</span>
    </span>
  );
}
