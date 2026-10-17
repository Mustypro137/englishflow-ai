"use client";

import { Sparkles } from "lucide-react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { generatePracticeAction } from "./actions";

export function GeneratedSet({ exercises }: { exercises: ClientExercise[] }) {
  return (
    <ol className="space-y-6">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <ExerciseCard
            exercise={ex}
            label={`AI-generated question ${i + 1} of ${exercises.length}`}
            allowHints
            context="generated"
          />
        </li>
      ))}
    </ol>
  );
}

export function GenerateButton({ concept, label }: { concept: string; label: string }) {
  const { state, pending, onSubmit } = useFormAction(generatePracticeAction);
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="concept" value={concept} />
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <SubmitButton pending={pending} pendingLabel="Writing and checking exercises…">
        <Sparkles aria-hidden /> {label}
      </SubmitButton>
    </form>
  );
}
