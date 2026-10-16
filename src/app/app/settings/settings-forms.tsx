"use client";

import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormMessage, TextField } from "@/components/forms/field";
import { TimezoneSelect } from "@/components/forms/timezone-select";
import { useFormAction } from "@/components/forms/use-form-action";
import { SubmitButton } from "@/components/forms/submit-button";
import type { PreferencesView } from "@/server/db/learner-profile";
import { DAILY_MINUTE_OPTIONS, EXPLANATION_STYLES, GOALS, TEXT_SCALES } from "@/lib/validation/profile";
import { updatePreferencesAction, updateProfileAction } from "../actions";

export function ProfileForm({
  defaults,
}: {
  defaults: { displayName: string; nativeLanguage: string; timezone: string; goals: string[] };
}) {
  const { state, errors, pending, onSubmit } = useFormAction(updateProfileAction);
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      <TextField
        label="Name"
        name="displayName"
        defaultValue={defaults.displayName}
        required
        error={errors.displayName}
      />
      <TextField
        label="First language (optional)"
        name="nativeLanguage"
        defaultValue={defaults.nativeLanguage}
        error={errors.nativeLanguage}
      />
      <TimezoneSelect defaultValue={defaults.timezone} error={errors.timezone} />
      <ChoiceGroup
        legend="What you want English for"
        name="goals"
        type="checkbox"
        options={GOALS}
        defaultValue={defaults.goals}
        columns={2}
        error={errors.goals}
      />
      <SaveRow pending={pending} state={state} label="Save profile" />
    </form>
  );
}

export function PreferencesForm({ defaults }: { defaults: PreferencesView }) {
  const { state, errors, pending, onSubmit } = useFormAction(updatePreferencesAction);
  const minuteOptions = DAILY_MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m} minutes` }));
  if (!DAILY_MINUTE_OPTIONS.some((m) => m === defaults.dailyMinutes)) {
    minuteOptions.push({ value: String(defaults.dailyMinutes), label: `${defaults.dailyMinutes} minutes` });
  }
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      <ChoiceGroup
        legend="Daily study goal"
        name="dailyMinutes"
        type="radio"
        options={minuteOptions}
        defaultValue={String(defaults.dailyMinutes)}
        columns={2}
        error={errors.dailyMinutes}
      />
      <ChoiceGroup
        legend="Explanations"
        name="explanationStyle"
        type="radio"
        options={EXPLANATION_STYLES}
        defaultValue={defaults.explanationStyle}
        columns={2}
        error={errors.explanationStyle}
      />
      <ChoiceGroup
        legend="Text size"
        description="Makes all text in the learning app larger."
        name="textScale"
        type="radio"
        options={TEXT_SCALES}
        defaultValue={defaults.textScale}
        error={errors.textScale}
      />
      <fieldset className="space-y-3">
        <legend className="text-ink text-base font-semibold">Other options</legend>
        <Toggle
          name="translationSupport"
          label="Translation support"
          hint="Allow translations to help with difficult explanations. You can turn this off as you progress."
          defaultChecked={defaults.translationSupport}
        />
        <Toggle
          name="reducedMotion"
          label="Reduce motion"
          hint="Turns off animations and transitions in the learning app."
          defaultChecked={defaults.reducedMotion}
        />
      </fieldset>
      <SaveRow pending={pending} state={state} label="Save preferences" />
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="border-border has-[:focus-visible]:outline-primary flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-primary mt-1 size-4 shrink-0 focus-visible:outline-none"
      />
      <span>
        <span className="text-ink block text-sm font-medium">{label}</span>
        <span className="text-muted block text-sm">{hint}</span>
      </span>
    </label>
  );
}

function SaveRow({
  pending,
  state,
  label,
}: {
  pending: boolean;
  state: { status: string; message?: string };
  label: string;
}) {
  return (
    <div className="space-y-3">
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        {label}
      </SubmitButton>
    </div>
  );
}
