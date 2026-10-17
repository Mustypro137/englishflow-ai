import { getSessionUser } from "@/server/auth/session";
import { exportLearnerData } from "@/server/db/export";

/** Download everything stored about the signed-in learner as one JSON file. */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return Response.json({ error: { kind: "unauthorized", message: "Please sign in again." } }, { status: 401 });

  const now = new Date();
  const data = await exportLearnerData(user.id, now);
  const filename = `englishflow-export-${now.toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Personal data: never kept by the browser or any shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
