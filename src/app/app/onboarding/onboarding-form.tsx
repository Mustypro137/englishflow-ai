"use client";

import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormMessage, TextField } from "@/components/forms/field";
import { TimezoneSelect } from "@/components/forms/timezone-select";
import { useFormAction } from "@/components/forms/use-form-action";
import { SubmitButton } from "@/components/forms/submit-button";
import { DAILY_MINUTE_OPTIONS, EXPLANATION_STYLES, GOALS, LEVEL_OPTIONS } from "@/lib/validation/profile";
import { completeOnboardingAction } from "../actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const { state, errors, pending, onSubmit } = useFormAction(completeOnboardingAction);

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="mt-8 space-y-8">
      <FormMessage>{state.status === "error" ? state.message : undefined}</FormMessage>

      <TextField
        label="What should we call you?"
        name="displayName"
        defaultValue={defaultName}
        autoComplete="nickname"
        required
        error={errors.displayName}
      />

      <ChoiceGroup
        legend="What do you want English for?"
        description="Choose any that apply. This helps decide which skills to suggest first."
        name="goals"
        type="checkbox"
        options={GOALS}
        columns={2}
        error={errors.goals}
      />

      <ChoiceGroup
        legend="How would you describe your English today?"
        description="This is only a starting point. A placement check will be available soon, and you can change this at any time."
        name="selfReportedLevel"
        type="radio"
        options={LEVEL_OPTIONS}
        defaultValue="unsure"
        error={errors.selfReportedLevel}
      />

      <TextField
        label="Your first language (optional)"
        name="nativeLanguage"
        hint="Used later to give clearer explanations of common mistakes."
        autoComplete="language"
        error={errors.nativeLanguage}
      />

      <ChoiceGroup
        legend="How much time do you want to study each day?"
        description="A small, regular amount works better than occasional long sessions."
        name="dailyMinutes"
        type="radio"
        options={DAILY_MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
        defaultValue="20"
        columns={2}
        error={errors.dailyMinutes}
      />

      <ChoiceGroup
        legend="How do you like explanations?"
        name="explanationStyle"
        type="radio"
        options={EXPLANATION_STYLES}
        defaultValue="concise"
        columns={2}
        error={errors.explanationStyle}
      />

      <TimezoneSelect error={errors.timezone} />

      <SubmitButton size="lg" pending={pending} pendingLabel="Saving…">
        Save and continue
      </SubmitButton>
    </form>
  );
}
