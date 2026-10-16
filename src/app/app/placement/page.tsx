import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getPlacementQuestions } from "@/server/db/curriculum";
import { getLatestPlacement } from "@/server/db/learning-records";
import { PlacementFlow } from "./placement-flow";

export const metadata: Metadata = { title: "Placement check" };

export default async function PlacementPage() {
  const user = await requireUser();
  const [questions, latest] = await Promise.all([getPlacementQuestions(), getLatestPlacement(user.id)]);
  return (
    <Container width="narrow" className="py-10">
      <PlacementFlow
        questions={questions}
        previous={
          latest
            ? { level: latest.chosenLevel ?? latest.overallLevel, date: latest.completedAt.toISOString().slice(0, 10) }
            : null
        }
      />
    </Container>
  );
}
