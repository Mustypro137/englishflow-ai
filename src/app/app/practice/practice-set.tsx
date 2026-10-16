"use client";

import { useState } from "react";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { Alert } from "@/components/ui/alert";
import type { ClientExercise } from "@/lib/learning/client-exercise";

/** A mixed set of exercises. Only the first try at each one counts towards the score shown. */
export function PracticeSet({ exercises }: { exercises: ClientExercise[] }) {
  const [first, setFirst] = useState<Record<string, boolean>>({});
  const answered = Object.keys(first).length;
  const right = Object.values(first).filter(Boolean).length;
  const finished = answered === exercises.length;

  return (
    <div className="space-y-6">
      <p className="text-muted text-sm" aria-live="polite">
        {answered} of {exercises.length} answered{answered > 0 ? ` · ${right} right first time` : ""}
      </p>
      <ol className="space-y-6">
        {exercises.map((ex, i) => (
          <li key={ex.id}>
            <ExerciseCard
              exercise={ex}
              label={`Question ${i + 1} of ${exercises.length}`}
              allowHints={false}
              context="practice"
              onResult={(r) => setFirst((prev) => (ex.id in prev ? prev : { ...prev, [ex.id]: r.correct }))}
            />
          </li>
        ))}
      </ol>
      {finished ? (
        <Alert tone={right === exercises.length ? "success" : "info"} title="Set finished">
          You got {right} of {exercises.length} right first time.{" "}
          {right < exercises.length
            ? "The ones you missed are in your mistakes list and will come back in review."
            : "Those topics are holding up well."}
        </Alert>
      ) : null}
    </div>
  );
}
